"""
Shared helpers for TOIL API modules.
"""

from __future__ import annotations

import json
from typing import Any, Dict

import frappe
from frappe.utils import cstr, flt

from frappe_devsecops_dashboard.constants import TOILStatus


DEFAULT_LIMIT = 20
MAX_LIMIT = 100


def ok(data: Any = None, message: str | None = None, **extra) -> Dict[str, Any]:
    """Standard success envelope."""
    payload: Dict[str, Any] = {"success": True}
    if data is not None:
        payload["data"] = data
    if message:
        payload["message"] = message
    payload.update(extra)
    return payload


def fail(
    code: str,
    message: str,
    field: str | None = None,
    http_status: int = 400,
    **details,
) -> Dict[str, Any]:
    """Standard error envelope with HTTP status."""
    frappe.response["http_status_code"] = http_status
    error: Dict[str, Any] = {"code": code, "message": message, "field": field}
    if details:
        error.update(details)
    return {"success": False, "error": error, "message": message}


def parse_json_payload(payload: Any) -> Dict[str, Any]:
    """Parse payload from Frappe method args."""
    if payload is None:
        return {}
    if isinstance(payload, dict):
        return payload
    if isinstance(payload, str):
        try:
            parsed = json.loads(payload)
            return parsed if isinstance(parsed, dict) else {}
        except json.JSONDecodeError:
            return {}
    return {}


def clamp_int(value: Any, default: int, minimum: int = 0, maximum: int | None = None) -> int:
    """Best-effort integer parsing with bounds."""
    try:
        parsed = int(value)
    except (TypeError, ValueError):
        parsed = default

    if parsed < minimum:
        parsed = minimum
    if maximum is not None and parsed > maximum:
        parsed = maximum
    return parsed


def normalize_toil_status(record: Dict[str, Any] | Any) -> str:
    """
    Normalize TOIL status from record fields.

    This keeps TOIL status as the single state source for UI/API contracts.
    """
    status = cstr(_get(record, "toil_status")).strip()
    if status in TOILStatus.all():
        return status

    docstatus = clamp_int(_get(record, "docstatus"), 0, 0)
    total_toil_hours = flt(_get(record, "total_toil_hours") or 0)

    if docstatus == 2:
        return TOILStatus.CANCELLED
    if total_toil_hours <= 0:
        return TOILStatus.NOT_APPLICABLE
    if docstatus == 1:
        return TOILStatus.ACCRUED
    return TOILStatus.PENDING_ACCRUAL


def serialize_timesheet(record: Dict[str, Any] | Any) -> Dict[str, Any]:
    """Return a contract-friendly timesheet payload."""
    item = dict(record) if isinstance(record, dict) else dict(record.as_dict())

    start_date = item.get("start_date") or item.get("from_date")
    end_date = item.get("end_date") or item.get("to_date")

    item["start_date"] = cstr(start_date) if start_date else None
    item["end_date"] = cstr(end_date) if end_date else None
    # Backward compatibility for UI code still expecting from/to date.
    item["from_date"] = item["start_date"]
    item["to_date"] = item["end_date"]

    item["total_hours"] = flt(item.get("total_hours") or 0, 2)
    item["total_toil_hours"] = flt(item.get("total_toil_hours") or 0, 2)
    item["toil_days"] = flt(item.get("toil_days") or 0, 3)
    item["docstatus"] = clamp_int(item.get("docstatus"), 0, 0)

    toil_status = normalize_toil_status(item)
    item["toil_status"] = toil_status
    item["status"] = toil_status
    item["is_reviewable"] = (
        item["docstatus"] == 0
        and toil_status == TOILStatus.PENDING_ACCRUAL
        and item["total_toil_hours"] > 0
    )
    return item


def _get(record: Dict[str, Any] | Any, key: str) -> Any:
    if isinstance(record, dict):
        return record.get(key)
    if hasattr(record, "get"):
        try:
            return record.get(key)
        except Exception:
            return getattr(record, key, None)
    return getattr(record, key, None)

