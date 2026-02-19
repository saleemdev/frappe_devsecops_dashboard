"""
TOIL System - Balance API
Handles TOIL balance and ledger queries.
"""

from __future__ import annotations

from typing import Any, Dict, List

import frappe
from frappe import _
from frappe.utils import add_days, cstr, flt, getdate

from frappe_devsecops_dashboard.api.toil.api_utils import fail, ok
from frappe_devsecops_dashboard.api.toil.query_service import (
    get_available_toil_allocations,
    get_leave_ledger_report,
)
from frappe_devsecops_dashboard.api.toil.validation_api import get_current_employee, validate_employee_access
from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE


def _resolve_employee(employee: str | None) -> str | None:
    if employee:
        return employee
    return get_current_employee()


def _serialize_balance(
    employee: str,
    employee_name: str,
    accrued: float,
    consumed: float,
    allocations: List[Dict[str, Any]],
    available: float | None = None,
) -> Dict[str, Any]:
    available_value = flt(available if available is not None else (accrued - consumed), 3)
    expiring_soon_allocations = [row for row in allocations if (row.get("days_until_expiry") is not None and row["days_until_expiry"] <= 30)]
    expiring_soon_days = flt(sum(flt(row.get("balance") or 0, 3) for row in expiring_soon_allocations), 3)

    return {
        "employee": employee,
        "employee_name": employee_name,
        "available": available_value,
        "total": flt(accrued, 3),
        "used": flt(consumed, 3),
        "expiring_soon": expiring_soon_days,
        "expiring_window_days": 30,
        "allocations": allocations,
    }


@frappe.whitelist(methods=["GET"])
def get_toil_balance_for_leave(employee: str = None) -> Dict[str, Any]:
    """Get TOIL balance using Leave Ledger Entry as source of truth."""
    target_employee = _resolve_employee(employee)
    if not target_employee:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    try:
        validate_employee_access(target_employee)
        to_dt = getdate()
        # Balance should include all active ledger rows, not only recent history.
        from_dt = add_days(to_dt, -3650)
        ledger = get_leave_ledger_report(
            employee=target_employee,
            from_date=from_dt,
            to_date=to_dt,
            leave_type=TOIL_LEAVE_TYPE,
        )

        rows = ledger.get("rows", [])
        accrued = flt(sum(max(flt(row.get("leaves") or 0, 3), 0) for row in rows), 3)
        consumed = flt(abs(sum(min(flt(row.get("leaves") or 0, 3), 0) for row in rows)), 3)
        available = flt(ledger.get("total_balance") or 0, 3)

        employee_name = frappe.db.get_value("Employee", target_employee, "employee_name")
        allocations = get_available_toil_allocations(target_employee)

        payload = _serialize_balance(
            employee=target_employee,
            employee_name=employee_name,
            accrued=accrued,
            consumed=consumed,
            allocations=allocations,
            available=available,
        )
        payload["source"] = "Leave Ledger Entry"
        payload["ledger_from_date"] = cstr(ledger.get("from_date"))
        payload["ledger_to_date"] = cstr(ledger.get("to_date"))
        payload["ledger_row_count"] = len(rows)

        return ok(data=payload, message=_("Balance fetched successfully"))
    except frappe.PermissionError:
        return fail(
            "PERMISSION_DENIED",
            _("Permission denied to access this employee's balance"),
            http_status=403,
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Balance API Error",
            message=f"Error fetching TOIL balance: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("An error occurred while fetching balance: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["GET"])
def get_balance_summary(employee: str = None) -> Dict[str, Any]:
    """Get summary balance metrics for widgets."""
    target_employee = _resolve_employee(employee)
    if not target_employee:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    try:
        validate_employee_access(target_employee)

        balance_result = get_toil_balance_for_leave(target_employee)
        if not balance_result.get("success"):
            return balance_result

        balance_data = balance_result.get("data", {})

        pending_accrual = frappe.db.sql(
            """
            SELECT COALESCE(SUM(toil_days), 0) AS total
            FROM `tabTimesheet`
            WHERE employee = %(employee)s
              AND total_toil_hours > 0
              AND docstatus = 0
              AND (IFNULL(toil_status, '') = '' OR toil_status = 'Pending Accrual')
            """,
            {"employee": target_employee},
            as_dict=True,
        )[0]["total"]

        return ok(
            data={
                "available": flt(balance_data.get("available") or 0, 3),
                "expiring_soon": flt(balance_data.get("expiring_soon") or 0, 3),
                "pending_accrual": flt(pending_accrual or 0, 3),
                "total_accrued": flt(balance_data.get("total") or 0, 3),
                "total_consumed": flt(balance_data.get("used") or 0, 3),
            },
            message=_("Balance summary fetched successfully"),
        )
    except frappe.PermissionError:
        return fail(
            "PERMISSION_DENIED",
            _("Permission denied to access this employee's balance"),
            http_status=403,
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Balance API Error",
            message=f"Error fetching balance summary: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("An error occurred while fetching balance summary: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["GET"])
def get_toil_balance(employee: str = None) -> Dict[str, Any]:
    """Legacy-compatible concise TOIL balance wrapper."""
    result = get_toil_balance_for_leave(employee)
    if not result.get("success"):
        return result

    data = result.get("data", {})
    allocations = data.get("allocations", []) if isinstance(data, dict) else []
    expiring_allocations = [
        row for row in allocations if (row.get("days_until_expiry") is not None and row["days_until_expiry"] <= 30)
    ]
    return ok(
        data={
            "employee": data.get("employee"),
            "employee_name": data.get("employee_name"),
            "balance": data.get("available", 0),
            "total_accrued": data.get("total", 0),
            "total_consumed": data.get("used", 0),
            "expiring_soon": expiring_allocations,
            "expiring_soon_days": data.get("expiring_soon", 0),
            "allocations": allocations,
            "leave_type": TOIL_LEAVE_TYPE,
            "unit": "days",
        }
    )


@frappe.whitelist(methods=["GET"])
def get_toil_summary(employee: str = None) -> Dict[str, Any]:
    """Legacy-compatible summary wrapper."""
    balance = get_toil_balance_for_leave(employee)
    if not balance.get("success"):
        return balance

    summary = get_balance_summary(employee)
    if not summary.get("success"):
        return summary

    b = balance.get("data", {})
    s = summary.get("data", {})

    return ok(
        data={
            "employee": b.get("employee"),
            "current_balance": b.get("available", 0),
            "total_accrued": s.get("total_accrued", 0),
            "total_consumed": s.get("total_consumed", 0),
            "expiring_soon": s.get("expiring_soon", 0),
            "pending_accrual": s.get("pending_accrual", 0),
        }
    )


@frappe.whitelist(methods=["GET"])
def get_leave_ledger(employee: str = None, from_date: str = None, to_date: str = None) -> Dict[str, Any]:
    """Return Leave Ledger report rows for TOIL history."""
    target_employee = _resolve_employee(employee)
    if not target_employee:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    try:
        validate_employee_access(target_employee)
        to_dt = getdate(to_date or getdate())
        from_dt = getdate(from_date or add_days(to_dt, -120))
        ledger = get_leave_ledger_report(
            employee=target_employee,
            from_date=from_dt,
            to_date=to_dt,
            leave_type=TOIL_LEAVE_TYPE,
        )
        rows = ledger.get("rows", [])

        for row in rows:
            row["leaves"] = flt(row.get("leaves") or 0, 3)
            if row.get("to_date"):
                row["days_until_expiry"] = (getdate(row["to_date"]) - getdate()).days
            else:
                row["days_until_expiry"] = None
            row["entry_date"] = row.get("date")

        return ok(
            data=rows,
            total=len(rows),
            balance=flt(ledger.get("total_balance") or 0, 3),
            from_date=cstr(ledger.get("from_date")),
            to_date=cstr(ledger.get("to_date")),
            leave_type=TOIL_LEAVE_TYPE,
            source="Leave Ledger Entry",
        )
    except frappe.PermissionError:
        return fail(
            "PERMISSION_DENIED",
            _("Permission denied to access this employee's ledger"),
            http_status=403,
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Balance API Error",
            message=f"Error fetching leave ledger: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("An error occurred while fetching leave ledger: {0}").format(str(exc)),
            http_status=500,
        )
