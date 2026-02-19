"""
TOIL System - Leave Application API
Handles TOIL leave application CRUD operations and approval workflow.
"""

from __future__ import annotations

from typing import Any, Dict

import frappe
from frappe import _
from frappe.utils import cstr, flt

from frappe_devsecops_dashboard.api.toil.api_utils import (
    DEFAULT_LIMIT,
    MAX_LIMIT,
    clamp_int,
    fail,
    ok,
    parse_json_payload,
)
from frappe_devsecops_dashboard.api.toil.validation_api import (
    get_current_employee,
    validate_employee_access,
    validate_employee_setup,
)
from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE


def _serialize_leave_application(record: Dict[str, Any] | Any) -> Dict[str, Any]:
    item = dict(record) if isinstance(record, dict) else dict(record.as_dict())
    item["from_date"] = cstr(item.get("from_date")) if item.get("from_date") else None
    item["to_date"] = cstr(item.get("to_date")) if item.get("to_date") else None
    item["total_leave_days"] = flt(item.get("total_leave_days") or 0, 3)
    item["docstatus"] = clamp_int(item.get("docstatus"), 0, 0)
    return item


@frappe.whitelist(methods=["GET"])
def get_my_leave_applications(
    status: str = None,
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> Dict[str, Any]:
    """Get current user's TOIL leave applications."""
    employee = get_current_employee()
    if not employee:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    page_limit = clamp_int(limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
    page_offset = clamp_int(offset, 0, 0)

    filters: Dict[str, Any] = {"employee": employee, "leave_type": TOIL_LEAVE_TYPE}

    requested = cstr(status).strip().lower()
    if requested:
        if requested == "draft":
            filters["docstatus"] = 0
        elif requested == "cancelled":
            filters["docstatus"] = 2
        elif requested == "open":
            filters["status"] = "Open"
            filters["docstatus"] = 1
        elif requested == "approved":
            filters["status"] = "Approved"
            filters["docstatus"] = 1
        elif requested == "rejected":
            filters["status"] = "Rejected"

    try:
        rows = frappe.get_list(
            "Leave Application",
            fields=[
                "name",
                "employee",
                "employee_name",
                "leave_type",
                "from_date",
                "to_date",
                "total_leave_days",
                "status",
                "leave_approver",
                "posting_date",
                "docstatus",
                "creation",
                "modified",
            ],
            filters=filters,
            order_by="posting_date desc, modified desc",
            limit_start=page_offset,
            limit_page_length=page_limit,
        )

        payload = [_serialize_leave_application(row) for row in rows]
        total = frappe.db.count("Leave Application", filters=filters)

        return ok(
            data=payload,
            total=total,
            message=_("Fetched {0} leave applications").format(len(payload)),
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error fetching leave applications: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("An error occurred while fetching leave applications: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["POST"])
def create_leave_application(data: Any = None) -> Dict[str, Any]:
    """Create a draft TOIL leave application with balance validation."""
    payload = parse_json_payload(data)

    employee = get_current_employee()
    if not employee:
        return fail(
            "NO_EMPLOYEE_RECORD",
            _("No employee record found for current user"),
            http_status=400,
        )

    from_date = payload.get("from_date")
    to_date = payload.get("to_date")

    if not from_date:
        return fail(
            "VALIDATION_ERROR",
            _("From date is required"),
            field="from_date",
            http_status=422,
        )
    if not to_date:
        return fail(
            "VALIDATION_ERROR",
            _("To date is required"),
            field="to_date",
            http_status=422,
        )

    setup_result = validate_employee_setup(employee)
    if not setup_result.get("success"):
        return setup_result
    if not setup_result.get("valid"):
        return fail(
            "SUPERVISOR_NOT_CONFIGURED",
            _("Cannot create leave application: {0}").format(
                "; ".join(setup_result.get("issues", []))
            ),
            field="reports_to",
            http_status=422,
        )

    from frappe_devsecops_dashboard.api.toil.balance_api import get_toil_balance_for_leave

    balance_result = get_toil_balance_for_leave(employee)
    if not balance_result.get("success"):
        return balance_result

    available_balance = flt(balance_result.get("data", {}).get("available") or 0, 3)

    try:
        doc = frappe.new_doc("Leave Application")
        doc.employee = employee
        doc.leave_type = TOIL_LEAVE_TYPE
        doc.from_date = from_date
        doc.to_date = to_date
        doc.description = payload.get("description") or ""
        doc.half_day = clamp_int(payload.get("half_day"), 0, 0)

        if doc.half_day:
            doc.half_day_date = payload.get("half_day_date") or from_date

        doc.leave_approver = setup_result.get("supervisor_user")
        doc.insert()

        requested_days = flt(doc.total_leave_days or 0, 3)
        if requested_days > available_balance:
            frappe.delete_doc("Leave Application", doc.name, force=True)
            return fail(
                "INSUFFICIENT_BALANCE",
                _("Insufficient TOIL balance. Required: {0} days, Available: {1} days").format(
                    requested_days,
                    available_balance,
                ),
                field="total_leave_days",
                http_status=422,
            )

        payload_doc = _serialize_leave_application(doc)
        payload_doc["leave_balance"] = available_balance

        return ok(
            data=payload_doc,
            message=_("Leave application created successfully"),
        )
    except frappe.ValidationError as exc:
        return fail("VALIDATION_ERROR", str(exc), http_status=422)
    except frappe.PermissionError:
        return fail(
            "PERMISSION_DENIED",
            _("Permission denied to create leave application"),
            http_status=403,
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error creating leave application: {str(exc)}",
        )
        return fail(
            "CREATE_ERROR",
            _("An error occurred while creating leave application: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["GET"])
def get_leave_applications_to_approve(
    limit: int = DEFAULT_LIMIT,
    offset: int = 0,
) -> Dict[str, Any]:
    """Get TOIL leave applications pending the current user's approval."""
    current_user = frappe.session.user

    page_limit = clamp_int(limit, DEFAULT_LIMIT, 1, MAX_LIMIT)
    page_offset = clamp_int(offset, 0, 0)

    try:
        rows = frappe.get_list(
            "Leave Application",
            fields=[
                "name",
                "employee",
                "employee_name",
                "leave_type",
                "from_date",
                "to_date",
                "total_leave_days",
                "status",
                "leave_approver",
                "posting_date",
                "description",
                "docstatus",
                "creation",
                "modified",
            ],
            filters={
                "leave_type": TOIL_LEAVE_TYPE,
                "leave_approver": current_user,
                "status": "Open",
                "docstatus": 1,
            },
            order_by="posting_date desc, creation desc",
            limit_start=page_offset,
            limit_page_length=page_limit,
        )

        payload = [_serialize_leave_application(row) for row in rows]
        total = frappe.db.count(
            "Leave Application",
            filters={
                "leave_type": TOIL_LEAVE_TYPE,
                "leave_approver": current_user,
                "status": "Open",
                "docstatus": 1,
            },
        )

        return ok(
            data=payload,
            total=total,
            message=_("Fetched {0} leave applications pending approval").format(len(payload)),
        )
    except Exception as exc:
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error fetching supervisor leave applications: {str(exc)}",
        )
        return fail(
            "FETCH_ERROR",
            _("Failed to fetch leave applications for approval: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["POST"])
def set_leave_approval(
    leave_application_name: str = None,
    status: str = None,
    comment: str = None,
) -> Dict[str, Any]:
    """Approve or reject a TOIL leave application."""
    if not leave_application_name:
        return fail("VALIDATION_ERROR", _("Leave application name is required"), http_status=422)

    requested = cstr(status).strip().lower()
    if requested not in ("approved", "rejected"):
        return fail("VALIDATION_ERROR", _("Status must be 'approved' or 'rejected'"), http_status=422)

    try:
        doc = frappe.get_doc("Leave Application", leave_application_name)

        if doc.leave_type != TOIL_LEAVE_TYPE:
            return fail("VALIDATION_ERROR", _("This leave application is not a TOIL leave"), http_status=422)

        current_user = frappe.session.user
        if doc.leave_approver != current_user and "HR Manager" not in frappe.get_roles(current_user):
            return fail("PERMISSION_DENIED", _("You are not the approver for this leave application"), http_status=403)

        if doc.docstatus != 1 or doc.status != "Open":
            return fail(
                "CONFLICT",
                _("Leave application is not in a reviewable state (status: {0}, docstatus: {1})").format(
                    doc.status, doc.docstatus
                ),
                http_status=409,
            )

        if requested == "approved":
            doc.status = "Approved"
            doc.save()
            if cstr(comment).strip():
                doc.add_comment("Comment", cstr(comment).strip())
        else:
            if not cstr(comment).strip():
                return fail("VALIDATION_ERROR", _("Rejection reason is required"), http_status=422)
            doc.status = "Rejected"
            doc.save()
            doc.add_comment("Comment", f"Rejected: {cstr(comment).strip()}")

        doc.reload()
        from frappe_devsecops_dashboard.api.toil import clear_toil_cache
        clear_toil_cache(doc.employee)

        return ok(
            data=_serialize_leave_application(doc),
            message=_("Leave application {0}").format(requested),
        )
    except frappe.DoesNotExistError:
        return fail("NOT_FOUND", _("Leave application not found"), http_status=404)
    except frappe.PermissionError:
        return fail("PERMISSION_DENIED", _("Permission denied"), http_status=403)
    except Exception as exc:
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error setting leave approval: {str(exc)}",
        )
        return fail(
            "APPROVAL_ERROR",
            _("Failed to update leave application: {0}").format(str(exc)),
            http_status=500,
        )


@frappe.whitelist(methods=["POST"])
def submit_leave_for_approval(leave_application_name: str) -> Dict[str, Any]:
    """Submit leave application for approval."""
    if not leave_application_name:
        return fail(
            "VALIDATION_ERROR",
            _("Leave application name is required"),
            field="leave_application_name",
            http_status=422,
        )

    try:
        doc = frappe.get_doc("Leave Application", leave_application_name)
        validate_employee_access(doc.employee)

        # Idempotent submit response.
        if doc.docstatus == 1:
            return ok(
                data=_serialize_leave_application(doc),
                message=_("Leave application already submitted"),
            )

        setup_result = validate_employee_setup(doc.employee)
        if not setup_result.get("success"):
            return setup_result
        if not setup_result.get("valid"):
            return fail(
                "SUPERVISOR_NOT_CONFIGURED",
                _("Cannot submit leave application: {0}").format(
                    "; ".join(setup_result.get("issues", []))
                ),
                field="reports_to",
                http_status=422,
            )

        from frappe_devsecops_dashboard.api.toil.balance_api import get_toil_balance_for_leave

        balance_result = get_toil_balance_for_leave(doc.employee)
        if not balance_result.get("success"):
            return balance_result

        available_balance = flt(balance_result.get("data", {}).get("available") or 0, 3)
        requested_days = flt(doc.total_leave_days or 0, 3)
        if requested_days > available_balance:
            return fail(
                "INSUFFICIENT_BALANCE",
                _("Insufficient TOIL balance. Required: {0} days, Available: {1} days").format(
                    requested_days,
                    available_balance,
                ),
                field="total_leave_days",
                http_status=422,
            )

        doc.submit()
        doc.reload()

        from frappe_devsecops_dashboard.api.toil import clear_toil_cache

        clear_toil_cache(doc.employee)

        payload_doc = _serialize_leave_application(doc)
        payload_doc["remaining_balance"] = flt(available_balance - requested_days, 3)

        return ok(
            data=payload_doc,
            message=_("Leave application submitted successfully. Leave approver has been notified."),
        )
    except frappe.PermissionError:
        return fail(
            "PERMISSION_DENIED",
            _("Permission denied to submit this leave application"),
            http_status=403,
        )
    except frappe.DoesNotExistError:
        return fail("NOT_FOUND", _("Leave application not found"), http_status=404)
    except Exception as exc:
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error submitting leave application: {str(exc)}",
        )
        return fail(
            "SUBMIT_ERROR",
            _("An error occurred while submitting leave application: {0}").format(str(exc)),
            http_status=500,
        )
