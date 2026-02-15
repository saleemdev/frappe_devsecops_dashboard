"""
TOIL System - Leave Application API
Handles TOIL leave application CRUD operations and approval workflow
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate, cstr, add_days
from typing import Dict, Any

from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE
from frappe_devsecops_dashboard.api.toil.validation_api import (
    validate_employee_access,
    can_approve_leave,
    get_current_employee
)


@frappe.whitelist()
def get_my_leave_applications(status: str = None, limit: int = 20, offset: int = 0) -> Dict[str, Any]:
    """
    Get current user's leave applications (TOIL leave type only)

    Args:
        status: Filter by status ('Draft', 'Open', 'Approved', 'Rejected', 'Cancelled')
        limit: Number of records to return (default: 20)
        offset: Pagination offset (default: 0)

    Returns:
        {
            "success": true,
            "data": [
                {
                    "name": "LA-0001",
                    "employee": "EMP-001",
                    "employee_name": "John Doe",
                    "leave_type": "Time Off in Lieu",
                    "from_date": "2024-02-15",
                    "to_date": "2024-02-16",
                    "total_leave_days": 2.0,
                    "status": "Approved",
                    "leave_approver": "jane@company.com",
                    "posting_date": "2024-02-10",
                    "docstatus": 1
                }
            ],
            "total": 5
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
        filters = {
            "employee": employee,
            "leave_type": TOIL_LEAVE_TYPE
        }

        if status:
            if status == "Draft":
                filters["docstatus"] = 0
            elif status == "Open":
                filters["status"] = "Open"
                filters["docstatus"] = 1
            elif status == "Approved":
                filters["status"] = "Approved"
                filters["docstatus"] = 1
            elif status == "Rejected":
                filters["status"] = "Rejected"
            elif status == "Cancelled":
                filters["docstatus"] = 2

        # Get leave applications
        leave_applications = frappe.get_list(
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
                "modified"
            ],
            filters=filters,
            order_by="posting_date desc, modified desc",
            limit_start=int(offset),
            limit_page_length=int(limit)
        )

        # Get total count
        total = frappe.db.count("Leave Application", filters=filters)

        return {
            "success": True,
            "data": leave_applications,
            "total": total,
            "message": _("Fetched {0} leave applications").format(len(leave_applications))
        }

    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error fetching my leave applications: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching leave applications: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def create_leave_application(data: str) -> Dict[str, Any]:
    """
    Create a TOIL leave application with balance validation

    Args:
        data: JSON string containing leave application data:
        {
            "from_date": "2024-02-15",
            "to_date": "2024-02-16",
            "description": "Taking TOIL for overtime worked",
            "half_day": 0,
            "half_day_date": null
        }

    Returns:
        {
            "success": true,
            "data": {
                "name": "LA-0001",
                "employee": "EMP-001",
                "total_leave_days": 2.0,
                "leave_balance": 3.5,
                "leave_approver": "jane@company.com",
                "status": "Open"
            },
            "message": "Leave application created successfully"
        }
    """
    try:
        # Parse data
        import json
        data_dict = json.loads(data) if isinstance(data, str) else data

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

        # Validate required fields
        if not data_dict.get("from_date"):
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("From date is required"),
                    "field": "from_date"
                }
            }

        if not data_dict.get("to_date"):
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("To date is required"),
                    "field": "to_date"
                }
            }

        # Validate supervisor configuration
        from frappe_devsecops_dashboard.api.toil.validation_api import validate_employee_setup
        setup_result = validate_employee_setup(employee)

        if not setup_result.get("valid"):
            return {
                "success": False,
                "error": {
                    "code": "SUPERVISOR_NOT_CONFIGURED",
                    "message": _("Cannot create leave application: {0}").format(
                        "; ".join(setup_result.get("issues", []))
                    ),
                    "field": "reports_to"
                }
            }

        # Get current TOIL balance
        from frappe_devsecops_dashboard.api.toil.balance_api import get_toil_balance_for_leave
        balance_result = get_toil_balance_for_leave(employee)

        if not balance_result.get("success"):
            return balance_result

        available_balance = balance_result["data"]["available"]

        # Create leave application document
        doc = frappe.new_doc("Leave Application")
        doc.employee = employee
        doc.leave_type = TOIL_LEAVE_TYPE
        doc.from_date = data_dict["from_date"]
        doc.to_date = data_dict["to_date"]
        doc.description = data_dict.get("description", "")
        doc.half_day = data_dict.get("half_day", 0)

        if doc.half_day:
            doc.half_day_date = data_dict.get("half_day_date", data_dict["from_date"])

        # Get leave approver (supervisor's user_id)
        doc.leave_approver = setup_result.get("supervisor_user")

        # Save draft (this will calculate total_leave_days via hooks)
        doc.insert()

        # Check if balance is sufficient
        if flt(doc.total_leave_days) > flt(available_balance):
            # Rollback - delete the draft
            frappe.delete_doc("Leave Application", doc.name, force=True)

            return {
                "success": False,
                "error": {
                    "code": "INSUFFICIENT_BALANCE",
                    "message": _("Insufficient TOIL balance. Required: {0} days, Available: {1} days").format(
                        flt(doc.total_leave_days, 3),
                        flt(available_balance, 3)
                    ),
                    "field": "total_leave_days"
                }
            }

        return {
            "success": True,
            "data": {
                "name": doc.name,
                "employee": doc.employee,
                "employee_name": doc.employee_name,
                "leave_type": doc.leave_type,
                "from_date": cstr(doc.from_date),
                "to_date": cstr(doc.to_date),
                "total_leave_days": flt(doc.total_leave_days, 3),
                "leave_balance": flt(available_balance, 3),
                "leave_approver": doc.leave_approver,
                "status": doc.status,
                "docstatus": doc.docstatus
            },
            "message": _("Leave application created successfully")
        }

    except frappe.ValidationError as e:
        frappe.response['http_status_code'] = 400
        return {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": str(e),
                "field": None
            }
        }
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error creating leave application: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "CREATE_ERROR",
                "message": _("An error occurred while creating leave application: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def submit_leave_for_approval(leave_application_name: str) -> Dict[str, Any]:
    """
    Submit leave application for supervisor approval

    This triggers the approval workflow:
    1. Validates balance is still sufficient
    2. Submits the leave application (docstatus = 1)
    3. Sends notification to leave approver
    4. Creates Leave Ledger Entry (negative balance)

    Args:
        leave_application_name: Leave Application document name

    Returns:
        {
            "success": true,
            "data": {
                "name": "LA-0001",
                "status": "Open",
                "leave_approver": "jane@company.com",
                "remaining_balance": 1.5
            },
            "message": "Leave application submitted for approval"
        }
    """
    try:
        if not leave_application_name:
            return {
                "success": False,
                "error": {
                    "code": "VALIDATION_ERROR",
                    "message": _("Leave application name is required"),
                    "field": "leave_application_name"
                }
            }

        # Get leave application document
        doc = frappe.get_doc("Leave Application", leave_application_name)

        # Validate access
        validate_employee_access(doc.employee)

        # Check if already submitted
        if doc.docstatus == 1:
            return {
                "success": False,
                "error": {
                    "code": "ALREADY_SUBMITTED",
                    "message": _("Leave application is already submitted"),
                    "field": None
                }
            }

        # Validate supervisor configuration
        from frappe_devsecops_dashboard.api.toil.validation_api import validate_employee_setup
        setup_result = validate_employee_setup(doc.employee)

        if not setup_result.get("valid"):
            return {
                "success": False,
                "error": {
                    "code": "SUPERVISOR_NOT_CONFIGURED",
                    "message": _("Cannot submit leave application: {0}").format(
                        "; ".join(setup_result.get("issues", []))
                    ),
                    "field": "reports_to"
                }
            }

        # Re-check balance before submission
        from frappe_devsecops_dashboard.api.toil.balance_api import get_toil_balance_for_leave
        balance_result = get_toil_balance_for_leave(doc.employee)

        if not balance_result.get("success"):
            return balance_result

        available_balance = balance_result["data"]["available"]

        if flt(doc.total_leave_days) > flt(available_balance):
            return {
                "success": False,
                "error": {
                    "code": "INSUFFICIENT_BALANCE",
                    "message": _("Insufficient TOIL balance. Required: {0} days, Available: {1} days").format(
                        flt(doc.total_leave_days, 3),
                        flt(available_balance, 3)
                    ),
                    "field": "total_leave_days"
                }
            }

        # Submit leave application (triggers on_submit hook → creates ledger entry)
        doc.submit()

        # Calculate remaining balance
        remaining_balance = flt(available_balance) - flt(doc.total_leave_days)

        # Clear cache
        import frappe_devsecops_dashboard.api.toil as toil_parent
        if hasattr(toil_parent, 'clear_toil_cache'):
            toil_parent.clear_toil_cache(doc.employee)

        return {
            "success": True,
            "data": {
                "name": doc.name,
                "employee": doc.employee,
                "status": doc.status,
                "leave_approver": doc.leave_approver,
                "total_leave_days": flt(doc.total_leave_days, 3),
                "remaining_balance": flt(remaining_balance, 3)
            },
            "message": _("Leave application submitted successfully. Leave approver has been notified.")
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        return {
            "success": False,
            "error": {
                "code": "PERMISSION_DENIED",
                "message": _("Permission denied to submit this leave application"),
                "field": None
            }
        }
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        return {
            "success": False,
            "error": {
                "code": "NOT_FOUND",
                "message": _("Leave application not found"),
                "field": None
            }
        }
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Leave API Error",
            message=f"Error submitting leave application: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "SUBMIT_ERROR",
                "message": _("An error occurred while submitting leave application: {0}").format(str(e)),
                "field": None
            }
        }
