"""
TOIL System - Timesheet API
Handles timesheet CRUD operations and approval workflow
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate, cstr
from typing import Dict, Any, List
from frappe_devsecops_dashboard.constants import TOILStatus

from frappe_devsecops_dashboard.api.toil.validation_api import (
    validate_employee_access,
    can_approve_timesheet,
    get_current_employee,
    get_subordinates
)

def _validate_toil_status_or_throw(toil_status: str):
    """Ensure toil_status always matches configured enum options."""
    if not toil_status:
        return
    if toil_status not in TOILStatus.all():
        frappe.throw(
            _("Invalid TOIL Status '{0}'. Allowed values: {1}").format(
                toil_status,
                ", ".join(TOILStatus.all())
            ),
            frappe.ValidationError
        )


@frappe.whitelist()
def get_my_timesheets(status: str = None, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    """
    Get current user's timesheets with TOIL information

    Args:
        status: Filter by status ('Draft', 'Submitted', 'Cancelled')
        limit: Number of records to return (default: 20)
        offset: Pagination offset (default: 0)

    Returns:
        {
            "success": true,
            "data": [
                {
                    "name": "TS-0001",
                    "employee": "EMP-001",
                    "employee_name": "John Doe",
                    "start_date": "2024-02-01",
                    "end_date": "2024-02-07",
                    "total_hours": 40.0,
                    "total_toil_hours": 8.0,
                    "toil_days": 1.0,
                    "toil_status": "Accrued",
                    "toil_allocation": "LA-001",
                    "docstatus": 1,
                    "modified": "2024-02-08 10:30:00"
                }
            ],
            "total": 10
        }
    """
    try:
        # Get current employee
        employee = get_current_employee()
        if not employee:
            return {
                "success": False,
                "error": {
                    "code": "NO_EMPLOYEE_RECORD",
                    "message": _("No employee record found for current user"),
                    "field": None
                }
            }

        # Build filters
        filters = {"employee": employee}

        if status:
            if status == "Draft":
                filters["docstatus"] = 0
            elif status == "Submitted":
                filters["docstatus"] = 1
            elif status == "Cancelled":
                filters["docstatus"] = 2

        # Get timesheets - Include TOIL custom fields
        timesheets = frappe.get_list(
            "Timesheet",
            fields=[
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
                "modified"
            ],
            filters=filters,
            order_by="modified desc",
            limit_start=int(offset),
            limit_page_length=int(limit)
        )

        # Get total count
        total = frappe.db.count("Timesheet", filters=filters)

        return {
            "success": True,
            "data": timesheets,
            "total": total,
            "message": _("Fetched {0} timesheets").format(len(timesheets))
        }

    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error fetching my timesheets: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching timesheets: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def get_timesheets_to_approve(limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    """
    Get subordinate timesheets for Team Requests (supervisor only).

    Returns timesheets from all subordinates with TOIL hours > 0, including
    already submitted ones, ordered by creation timestamp.

    Args:
        limit: Number of records to return (default: 20)
        offset: Pagination offset (default: 0)

    Returns:
        {
            "success": true,
            "data": [
                {
                    "name": "TS-0001",
                    "employee": "EMP-002",
                    "employee_name": "Jane Smith",
                    "start_date": "2024-02-01",
                    "end_date": "2024-02-07",
                    "total_toil_hours": 10.0,
                    "toil_days": 1.25,
                    "toil_status": "Pending Accrual",
                    "docstatus": 0,
                    "modified": "2024-02-08 10:30:00"
                }
            ],
            "total": 5,
            "subordinates_count": 8
        }
    """
    try:
        # Get current employee
        supervisor = get_current_employee()
        if not supervisor:
            return {
                "success": False,
                "error": {
                    "code": "NO_EMPLOYEE_RECORD",
                    "message": _("No employee record found for current user"),
                    "field": None
                }
            }

        # Get subordinates
        subordinates = get_subordinates(supervisor)

        if not subordinates:
            return {
                "success": True,
                "data": [],
                "total": 0,
                "subordinates_count": 0,
                "message": _("No subordinates found")
            }

        subordinate_ids = [s.name for s in subordinates]

        # Build filters for team requests list
        filters = {
            "employee": ["in", subordinate_ids],
            "total_toil_hours": [">", 0]
        }

        # Get timesheets
        timesheets = frappe.get_list(
            "Timesheet",
            fields=[
                "name",
                "employee",
                "employee_name",
                "start_date",
                "end_date",
                "total_hours",
                "total_toil_hours",
                "toil_days",
                "toil_status",
                "docstatus",
                "creation",
                "modified"
            ],
            filters=filters,
            order_by="creation desc",
            limit_start=int(offset),
            limit_page_length=int(limit)
        )

        # Get total count
        total = frappe.db.count("Timesheet", filters=filters)
        pending_total = len([ts for ts in timesheets if ts.get("docstatus") != 1])

        return {
            "success": True,
            "data": timesheets,
            "total": total,
            "pending_total": pending_total,
            "subordinates_count": len(subordinates),
            "message": _("Fetched {0} team request timesheets").format(len(timesheets))
        }

    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error fetching timesheets to approve: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching timesheets: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def create_timesheet(data):
    """Create a draft timesheet"""
    try:
        import json
        data = json.loads(data) if isinstance(data, str) else data

        employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
        if not employee:
            return {"success": False, "message": f"No employee for user {frappe.session.user}"}

        doc = frappe.new_doc("Timesheet")
        doc.employee = employee
        doc.start_date = data["start_date"]
        doc.end_date = data.get("end_date", data["start_date"])

        for log in data["time_logs"]:
            doc.append("time_logs", {
                "activity_type": log.get("activity_type", "Execution"),
                "from_time": log["from_time"],
                "to_time": log["to_time"],
                "is_billable": log.get("is_billable", 0),
                "description": log.get("description", "")
            })

        doc.insert()
        frappe.db.commit()

        return {
            "success": True,
            "data": {"name": doc.name},
            "message": "Timesheet created"
        }

    except Exception as e:
        frappe.log_error(str(e))
        frappe.db.rollback()
        return {"success": False, "message": str(e)}


@frappe.whitelist()
def submit_timesheet_for_approval(timesheet_name: str) -> Dict[str, Any]:
    """
    Submit timesheet for supervisor approval

    This triggers the approval workflow:
    1. Validates supervisor configuration
    2. Submits the timesheet (docstatus = 1)
    3. on_submit hook creates TOIL Leave Allocation
    4. Sends notification to supervisor

    Args:
        timesheet_name: Timesheet document name

    Returns:
        {
            "success": true,
            "data": {
                "name": "TS-0001",
                "toil_allocation": "LA-001",
                "toil_days": 1.0,
                "supervisor": "jane@company.com"
            },
            "message": "Timesheet submitted for approval"
        }
    """
    try:
        if not timesheet_name:
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("Timesheet name is required"),
                    "field": "timesheet_name"
                }
            }

        # Get timesheet document
        doc = frappe.get_doc("Timesheet", timesheet_name)

        # Validate access
        validate_employee_access(doc.employee)

        # Check if already submitted
        if doc.docstatus == 1:
            return {
                "success": False,
                "error": {
                    "code": "ALREADY_SUBMITTED",
                    "message": _("Timesheet is already submitted"),
                    "field": None
                }
            }

        # Submit timesheet
        doc.submit()
        _validate_toil_status_or_throw(getattr(doc, "toil_status", None))

        return {
            "success": True,
            "data": {
                "name": doc.name,
                "employee": doc.employee
            },
            "message": _("Timesheet submitted successfully")
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        return {
            "success": False,
            "error": {
                "code": "PERMISSION_DENIED",
                "message": _("Permission denied to submit this timesheet"),
                "field": None
            }
        }
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        return {
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": _("Timesheet not found"),
                "field": None
            }
        }
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error submitting timesheet: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "SUBMIT_ERROR",
                "message": _("An error occurred while submitting timesheet: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def get_timesheet(name: str) -> Dict[str, Any]:
    """Get a single timesheet with child time logs."""
    try:
        if not name:
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("Timesheet name is required"),
                    "field": "name"
                }
            }

        doc = frappe.get_doc("Timesheet", name)
        validate_employee_access(doc.employee)

        return {
            "success": True,
            "data": doc.as_dict(),
            "message": _("Timesheet fetched successfully")
        }
    except frappe.PermissionError:
        frappe.response["http_status_code"] = 403
        return {
            "success": False,
            "error": {
                "code": "PERMISSION_DENIED",
                "message": _("Permission denied to view this timesheet"),
                "field": None
            }
        }
    except frappe.DoesNotExistError:
        frappe.response["http_status_code"] = 404
        return {
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": _("Timesheet not found"),
                "field": None
            }
        }
    except Exception as e:
        frappe.response["http_status_code"] = 500
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error fetching timesheet: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching timesheet: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def set_timesheet_approval(timesheet_name: str, status: str, reason: str = None) -> Dict[str, Any]:
    """
    Single endpoint to approve or reject a timesheet (supervisor only).
    Use PUT semantics: update the timesheet's approval status.

    Args:
        timesheet_name: Timesheet document name
        status: "approved" or "rejected"
        reason: Optional comment for approve; required for reject (min 10 chars)

    Returns:
        success, data, message
    """
    try:
        if not timesheet_name:
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("Timesheet name is required"),
                    "field": "timesheet_name"
                }
            }

        action = (status or "").strip().lower()
        if action not in ("approved", "rejected"):
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("Status must be 'approved' or 'rejected'"),
                    "field": "status"
                }
            }

        doc = frappe.get_doc("Timesheet", timesheet_name)
        if not can_approve_timesheet(doc):
            frappe.throw(_("You are not authorized to approve or reject this timesheet"), frappe.PermissionError)

        if doc.docstatus == 1:
            return {
                "success": False,
                "error": {
                    "code": "ALREADY_SUBMITTED",
                    "message": _("Timesheet is already submitted"),
                    "field": None
                }
            }

        if action == "approved":
            if reason:
                doc.add_comment("Comment", reason)
            doc.submit()
            _validate_toil_status_or_throw(getattr(doc, "toil_status", None))
            return {
                "success": True,
                "data": {
                    "name": doc.name,
                    "docstatus": 1,
                    "toil_status": getattr(doc, "toil_status", None),
                    "toil_allocation": getattr(doc, "toil_allocation", None)
                },
                "message": _("Timesheet submitted. TOIL accrual is processing.")
            }

        # rejected
        if not reason or len(str(reason).strip()) < 10:
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("Rejection reason must be at least 10 characters"),
                    "field": "reason"
                }
            }
        doc.db_set("toil_status", "Rejected", update_modified=True)
        doc.add_comment("Comment", _("Rejected: {0}").format(reason))
        frappe.db.commit()
        _validate_toil_status_or_throw("Rejected")

        return {
            "success": True,
            "data": {
                "name": doc.name,
                "docstatus": 0,
                "toil_status": "Rejected"
            },
            "message": _("Timesheet rejected")
        }

    except frappe.ValidationError as e:
        frappe.response["http_status_code"] = 422
        return {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e),
                "field": None
            }
        }
    except frappe.PermissionError:
        frappe.response["http_status_code"] = 403
        return {
            "success": False,
            "error": {
                "code": "PERMISSION_DENIED",
                "message": _("Permission denied"),
                "field": None
            }
        }
    except frappe.DoesNotExistError:
        frappe.response["http_status_code"] = 404
        return {
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": _("Timesheet not found"),
                "field": None
            }
        }
    except Exception as e:
        frappe.response["http_status_code"] = 500
        frappe.log_error(
            title="TOIL Timesheet API Error",
            message=f"Error in set_timesheet_approval: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "APPROVAL_ERROR",
                "message": _("An error occurred: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def calculate_toil_preview(timesheet_name: str) -> Dict[str, Any]:
    """Preview TOIL hours/days for a given timesheet."""
    try:
        doc = frappe.get_doc("Timesheet", timesheet_name)
        validate_employee_access(doc.employee)

        total_hours = 0.0
        breakdown = []
        for row in doc.time_logs:
            hours = flt(row.hours)
            if not row.is_billable:
                total_hours += hours
                breakdown.append({
                    "date": cstr(row.from_time)[:10] if row.from_time else None,
                    "hours": hours,
                    "description": row.description or row.activity_type
                })

        return {
            "success": True,
            "data": {
                "timesheet": doc.name,
                "total_toil_hours": flt(total_hours, 3),
                "toil_days": flt(total_hours / 8.0, 3),
                "breakdown": breakdown
            }
        }
    except Exception as e:
        frappe.response["http_status_code"] = 500
        return {
            "success": False,
            "error": {
                "code": "PREVIEW_ERROR",
                "message": _("Failed to calculate TOIL preview: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def get_toil_breakdown(timesheet_name: str) -> Dict[str, Any]:
    """Detailed TOIL breakdown from timesheet lines."""
    preview = calculate_toil_preview(timesheet_name)
    if not preview.get("success"):
        return preview

    doc = frappe.get_doc("Timesheet", timesheet_name)
    rows = []
    for row in doc.time_logs:
        rows.append({
            "date": cstr(row.from_time)[:10] if row.from_time else None,
            "hours": flt(row.hours, 3),
            "is_billable": bool(row.is_billable),
            "activity": row.activity_type,
            "project": row.project
        })

    return {
        "success": True,
        "data": {
            "timesheet": timesheet_name,
            "breakdown": rows,
            "total_toil_hours": preview["data"]["total_toil_hours"],
            "toil_days": preview["data"]["toil_days"]
        }
    }
