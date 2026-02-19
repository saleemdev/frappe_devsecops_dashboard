"""
TOIL System - Timesheet API
Handles timesheet CRUD operations and approval workflow.
"""

from __future__ import annotations

from typing import Any, Dict, List

import frappe
from frappe import _
from frappe.utils import cstr, flt

from frappe_devsecops_dashboard.api.toil.api_utils import (
    DEFAULT_LIMIT,
    MAX_LIMIT,
    clamp_int,
    fail,
    normalize_toil_status,
    ok,
    parse_json_payload,
    serialize_timesheet,
)
from frappe_devsecops_dashboard.api.toil.validation_api import (
    can_approve_timesheet,
    get_current_employee,
    get_subordinates,
    validate_employee_access,
)
from frappe_devsecops_dashboard.constants import TOILStatus


TIMESHEET_FIELDS: List[str] = [
    "name",
    "employee",
    "employee_name",
    "start_date",
    "end_date",
    "total_hours",
    "total_toil_hours",
    "toil_days",
    "toil_status",
    "toil_allocation",
    "docstatus",
    "owner",
    "creation",
    "modified",
]


def _apply_status_filter(filters: Dict[str, Any], status: str | None) -> Dict[str, Any]:
    """Translate legacy/new status filters into DB filters."""
    if not status:
        return filters

    requested = cstr(status).strip()
    lower = requested.lower()

    legacy_docstatus = {
        "draft": 0,
        "submitted": 1,
        "cancelled": 2,
    }

    if lower in legacy_docstatus:
        filters["docstatus"] = legacy_docstatus[lower]
        return filters

    valid_lower = {s.lower(): s for s in TOILStatus.all()}
    if lower in valid_lower:
        filters["toil_status"] = valid_lower[lower]

    return filters


def _serialize_timesheet_rows(rows: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    return [serialize_timesheet(row) for row in rows]


@frappe.whitelist(methods=["GET"])
def get_my_timesheets(status: str = None, limit: int = DEFAULT_LIMIT, offset: int = 0) -> Dict[str, Any]:
    """Get current user's timesheets with normalized TOIL status."""
    employee = get_current_employee()
    if not employee:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    page_limit = clamp_int(limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
    page_offset = clamp_int(offset, 0, 0)

    filters: Dict[str, Any] = {"employee": employee}
    filters = _apply_status_filter(filters, status)

    try:
        rows = frappe.get_list(
            "Timesheet",
            fields=TIMESHEET_FIELDS,
            filters=filters,
            order_by="modified desc",
            limit_start=page_offset,
            limit_page_length=page_limit,
        )
        total = frappe.db.count("Timesheet", filters=filters)

        payload = _serialize_timesheet_rows(rows)
        return ok(
            data=payload,
            total=total,
            message=_("Fetched {0} timesheets").format(len(payload)),
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error fetching my timesheets: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("An error occurred while fetching timesheets: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["GET"])
def get_timesheets_to_approve(limit: int = DEFAULT_LIMIT, offset: int = 0) -> Dict[str, Any]:
    """
    Get subordinate timesheets requiring supervisor review.

    Team Requests are defined as draft timesheets with TOIL hours and
    TOIL status `Pending Accrual` (including blank status rows normalized to pending).
    """
    supervisor = get_current_employee()
    if not supervisor:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    subordinates = get_subordinates(supervisor)
    if not subordinates:
        return ok(
            data=[],
            total=0,
            subordinates_count=0,
            message=_("No subordinates found"),
        )

    page_limit = clamp_int(limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
    page_offset = clamp_int(offset, 0, 0)
    subordinate_ids = [row.name for row in subordinates]

    filters: Dict[str, Any] = {
        "employee": ["in", subordinate_ids],
        "total_toil_hours": [">", 0],
        "docstatus": 0,
    }

    try:
        rows = frappe.get_list(
            "Timesheet",
            fields=TIMESHEET_FIELDS,
            filters=filters,
            order_by="creation desc",
            limit_start=page_offset,
            limit_page_length=page_limit,
        )

        serialized = _serialize_timesheet_rows(rows)
        pending_rows = [
            row for row in serialized if row.get("toil_status") == TOILStatus.PENDING_ACCRUAL
        ]

        pending_total = frappe.db.sql(
            """
            SELECT COUNT(*) AS total
            FROM `tabTimesheet`
            WHERE employee IN %(employees)s
              AND total_toil_hours > 0
              AND docstatus = 0
              AND (IFNULL(toil_status, '') = '' OR toil_status = %(pending)s)
            """,
            {
                "employees": tuple(subordinate_ids),
                "pending": TOILStatus.PENDING_ACCRUAL,
            },
            as_dict=True,
        )[0]["total"]

        return ok(
            data=pending_rows,
            total=pending_total,
            pending_total=pending_total,
            subordinates_count=len(subordinates),
            message=_("Fetched {0} team request timesheets").format(len(pending_rows)),
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error fetching timesheets to approve: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("An error occurred while fetching timesheets: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["POST"])
def create_timesheet(data: Any = None) -> Dict[str, Any]:
    """Create a draft timesheet."""
    payload = parse_json_payload(data)

    employee = get_current_employee()
    if not employee:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    start_date = payload.get("start_date")
    if not start_date:
        return fail(
            "VALIDATION_ERROR",
            _("Start date is required"),
            field="start_date",
            http_status=422,
        )

    time_logs = payload.get("time_logs") or []
    if not isinstance(time_logs, list) or len(time_logs) == 0:
        return fail(
            "VALIDATION_ERROR",
            _("At least one time log entry is required"),
            field="time_logs",
            http_status=422,
        )

    try:
        doc = frappe.new_doc("Timesheet")
        doc.employee = employee
        doc.start_date = start_date
        doc.end_date = payload.get("end_date", start_date)

        for log in time_logs:
            from_time = log.get("from_time")
            to_time = log.get("to_time")
            if not from_time or not to_time:
                return fail(
                    "VALIDATION_ERROR",
                    _("Each time log must include from_time and to_time"),
                    field="time_logs",
                    http_status=422,
                )

            doc.append(
                "time_logs",
                {
                    "activity_type": log.get("activity_type") or "Execution",
                    "from_time": from_time,
                    "to_time": to_time,
                    "is_billable": clamp_int(log.get("is_billable"), 0, 0, 1),
                    "description": cstr(log.get("description") or ""),
                },
            )

        doc.insert()
        doc.reload()

        return ok(
            data=serialize_timesheet(doc),
            message=_("Timesheet created"),
        )
    except frappe.ValidationError as exc:
        return fail("VALIDATION_ERROR", str(exc), http_status=422)
    except frappe.PermissionError:
        return fail(
            "PERMISSION_DENIED",
            _("Permission denied to create timesheet"),
            http_status=403,
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error creating timesheet: {str(exc)}",
        )
        return fail(
            "CREATE_ERROR",
            _("An error occurred while creating timesheet: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["POST"])
def submit_timesheet_for_approval(timesheet_name: str, comment: str = None) -> Dict[str, Any]:
    """
    Employee action: mark a draft timesheet as ready for supervisor review.

    This does NOT approve/submit the document -- it validates the timesheet,
    sets toil_status to Pending Accrual, and optionally adds a comment.
    The supervisor then uses set_timesheet_approval to approve or reject.
    """
    if not timesheet_name:
        return fail(
            "VALIDATION_ERROR",
            _("Timesheet name is required"),
            field="timesheet_name",
            http_status=422,
        )

    try:
        doc = frappe.get_doc("Timesheet", timesheet_name)
        validate_employee_access(doc.employee)

        if doc.docstatus == 1:
            return ok(
                data=serialize_timesheet(doc),
                message=_("Timesheet already submitted"),
            )

        if doc.docstatus == 2:
            return fail(
                "CONFLICT",
                _("Cancelled timesheets cannot be submitted for approval"),
                http_status=409,
            )

        if flt(doc.total_toil_hours or 0) <= 0:
            return fail(
                "VALIDATION_ERROR",
                _("Timesheet has no TOIL hours to submit for approval"),
                field="total_toil_hours",
                http_status=422,
            )

        current_status = normalize_toil_status(doc)
        if current_status == TOILStatus.PENDING_ACCRUAL:
            return ok(
                data=serialize_timesheet(doc),
                message=_("Timesheet is already pending approval"),
            )

        doc.db_set("toil_status", TOILStatus.PENDING_ACCRUAL, update_modified=True)

        if cstr(comment).strip():
            doc.add_comment("Comment", cstr(comment).strip())

        doc.reload()
        from frappe_devsecops_dashboard.api.toil import clear_toil_cache
        clear_toil_cache(doc.employee)

        return ok(
            data=serialize_timesheet(doc),
            message=_("Timesheet submitted for supervisor approval."),
        )
    except frappe.PermissionError:
        return fail("PERMISSION_DENIED", _("Permission denied"), http_status=403)
    except frappe.DoesNotExistError:
        return fail("NOT_FOUND", _("Timesheet not found"), http_status=404)
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error submitting timesheet for approval: {str(exc)}",
        )
        return fail(
            "SUBMIT_ERROR",
            _("An error occurred: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["GET"])
def get_timesheet(name: str) -> Dict[str, Any]:
    """Get a single timesheet with child time logs."""
    if not name:
        return fail(
            "VALIDATION_ERROR",
            _("Timesheet name is required"),
            field="name",
            http_status=422,
        )

    try:
        doc = frappe.get_doc("Timesheet", name)
        validate_employee_access(doc.employee)

        payload = serialize_timesheet(doc)
        payload["time_logs"] = doc.get("time_logs", [])

        return ok(data=payload, message=_("Timesheet fetched successfully"))
    except frappe.PermissionError:
        return fail(
            "PERMISSION_DENIED",
            _("Permission denied to view this timesheet"),
            http_status=403,
        )
    except frappe.DoesNotExistError:
        return fail("NOT_FOUND", _("Timesheet not found"), http_status=404)
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error fetching timesheet: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("An error occurred while fetching timesheet: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["POST", "PUT"])
def set_timesheet_approval(timesheet_name: str, status: str, reason: str = None) -> Dict[str, Any]:
    """
    Approve or reject a timesheet (supervisor only).

    - `approved`: submits the draft timesheet.
    - `rejected`: keeps draft and marks `toil_status = Rejected`.
    """
    if not timesheet_name:
        return fail(
            "VALIDATION_ERROR",
            _("Timesheet name is required"),
            field="timesheet_name",
            http_status=422,
        )

    action = cstr(status).strip().lower()
    if action not in ("approved", "rejected"):
        return fail(
            "VALIDATION_ERROR",
            _("Status must be 'approved' or 'rejected'"),
            field="status",
            http_status=422,
        )

    if action == "rejected" and len(cstr(reason).strip()) < 10:
        return fail(
            "VALIDATION_ERROR",
            _("Rejection reason must be at least 10 characters"),
            field="reason",
            http_status=422,
        )

    try:
        doc = frappe.get_doc("Timesheet", timesheet_name)

        if not can_approve_timesheet(doc):
            frappe.throw(
                _("You are not authorized to approve or reject this timesheet"),
                frappe.PermissionError,
            )

        current_status = normalize_toil_status(doc)

        if action == "approved":
            # Idempotent approval response.
            if doc.docstatus == 1:
                return ok(
                    data=serialize_timesheet(doc),
                    message=_("Timesheet already submitted"),
                )

            if cstr(reason).strip():
                doc.add_comment("Comment", cstr(reason).strip())

            doc.submit()
            doc.reload()
            from frappe_devsecops_dashboard.api.toil import clear_toil_cache
            clear_toil_cache(doc.employee)

            return ok(
                data=serialize_timesheet(doc),
                message=_("Timesheet submitted. TOIL accrual is processing."),
            )

        # Reject flow
        if doc.docstatus == 1:
            return fail(
                "CONFLICT",
                _("Submitted timesheets cannot be rejected"),
                http_status=409,
            )

        # Idempotent rejection response.
        if current_status == TOILStatus.REJECTED:
            return ok(data=serialize_timesheet(doc), message=_("Timesheet already rejected"))

        doc.db_set("toil_status", TOILStatus.REJECTED, update_modified=True)
        doc.add_comment("Comment", _("Rejected: {0}").format(cstr(reason).strip()))
        doc.reload()
        from frappe_devsecops_dashboard.api.toil import clear_toil_cache
        clear_toil_cache(doc.employee)

        return ok(data=serialize_timesheet(doc), message=_("Timesheet rejected"))

    except frappe.ValidationError as exc:
        return fail("VALIDATION_ERROR", str(exc), http_status=422)
    except frappe.PermissionError:
        return fail("PERMISSION_DENIED", _("Permission denied"), http_status=403)
    except frappe.DoesNotExistError:
        return fail("NOT_FOUND", _("Timesheet not found"), http_status=404)
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error in set_timesheet_approval: {str(exc)}",
        )
        return fail(
            "APPROVAL_ERROR",
            _("An error occurred: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["GET"])
def calculate_toil_preview(timesheet_name: str) -> Dict[str, Any]:
    """Preview TOIL hours/days for a given timesheet."""
    if not timesheet_name:
        return fail(
            "VALIDATION_ERROR",
            _("Timesheet name is required"),
            field="timesheet_name",
            http_status=422,
        )

    try:
        doc = frappe.get_doc("Timesheet", timesheet_name)
        validate_employee_access(doc.employee)

        total_hours = 0.0
        breakdown = []
        for row in doc.time_logs:
            hours = flt(row.hours)
            if not row.is_billable:
                total_hours += hours
                breakdown.append(
                    {
                        "date": cstr(row.from_time)[:10] if row.from_time else None,
                        "hours": flt(hours, 3),
                        "description": row.description or row.activity_type,
                    }
                )

        return ok(
            data={
                "timesheet": doc.name,
                "total_toil_hours": flt(total_hours, 3),
                "toil_days": flt(total_hours / 8.0, 3),
                "breakdown": breakdown,
            }
        )
    except frappe.PermissionError:
        return fail("PERMISSION_DENIED", _("Permission denied"), http_status=403)
    except frappe.DoesNotExistError:
        return fail("NOT_FOUND", _("Timesheet not found"), http_status=404)
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error in calculate_toil_preview: {str(exc)}",
        )
        return fail(
            "PREVIEW_ERROR",
            _("Failed to calculate TOIL preview: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["GET"])
def get_toil_breakdown(timesheet_name: str) -> Dict[str, Any]:
    """Detailed TOIL breakdown from timesheet lines."""
    preview = calculate_toil_preview(timesheet_name)
    if not preview.get("success"):
        return preview

    try:
        doc = frappe.get_doc("Timesheet", timesheet_name)
        validate_employee_access(doc.employee)

        rows = []
        for row in doc.time_logs:
            rows.append(
                {
                    "date": cstr(row.from_time)[:10] if row.from_time else None,
                    "hours": flt(row.hours, 3),
                    "is_billable": bool(row.is_billable),
                    "activity": row.activity_type,
                    "project": row.project,
                }
            )

        return ok(
            data={
                "timesheet": timesheet_name,
                "breakdown": rows,
                "total_toil_hours": preview["data"]["total_toil_hours"],
                "toil_days": preview["data"]["toil_days"],
            }
        )
    except frappe.PermissionError:
        return fail("PERMISSION_DENIED", _("Permission denied"), http_status=403)
    except frappe.DoesNotExistError:
        return fail("NOT_FOUND", _("Timesheet not found"), http_status=404)
    except Exception as exc:
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error in get_toil_breakdown: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("Failed to fetch TOIL breakdown: {0}").format(str(exc)),
            http_status=500,
        )
