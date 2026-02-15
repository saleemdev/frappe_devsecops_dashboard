"""
TOIL System - Balance API
Handles TOIL balance queries with expiry warnings
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate, add_days, cstr
from typing import Dict, Any, List

from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE
from frappe_devsecops_dashboard.api.toil.validation_api import (
    validate_employee_access,
    get_current_employee
)


@frappe.whitelist()
def get_toil_balance_for_leave(employee: str = None) -> Dict[str, Any]:
    """
    Get available TOIL balance with expiry warnings for leave application

    This endpoint provides comprehensive balance information needed for leave applications:
    - Current available balance
    - Expiring soon warnings (within 30 days)
    - Allocation breakdown (FIFO order)
    - Usage recommendations

    Args:
        employee: Employee ID (optional, defaults to current user)

    Returns:
        {
            "success": true,
            "data": {
                "employee": "EMP-001",
                "employee_name": "John Doe",
                "available_balance": 5.5,
                "total_accrued": 10.0,
                "total_consumed": 4.5,
                "expiring_soon": 2.0,
                "expiring_in_days": 30,
                "expiry_warning": "You have 2.0 days expiring in the next 30 days",
                "allocations": [
                    {
                        "name": "LA-001",
                        "balance": 2.0,
                        "allocated": 3.0,
                        "from_date": "2024-01-01",
                        "to_date": "2024-07-01",
                        "days_until_expiry": 20,
                        "source_timesheet": "TS-001"
                    }
                ]
            },
            "message": "Balance fetched successfully"
        }
    """
    try:
        # Default to current employee
        if not employee:
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

        # Validate access
        validate_employee_access(employee)

        toil_leave_type = TOIL_LEAVE_TYPE
        today = getdate()
        thirty_days_out = add_days(today, 30)

        # Get total accrued (from Leave Allocations)
        total_accrued = frappe.db.sql("""
            SELECT COALESCE(SUM(leaves), 0) as total
            FROM `tabLeave Ledger Entry`
            WHERE employee = %(employee)s
            AND leave_type = %(leave_type)s
            AND transaction_type = 'Leave Allocation'
            AND docstatus = 1
        """, {
            "employee": employee,
            "leave_type": toil_leave_type
        }, as_dict=True)[0].total

        # Get total consumed (from Leave Applications)
        total_consumed = frappe.db.sql("""
            SELECT COALESCE(ABS(SUM(leaves)), 0) as total
            FROM `tabLeave Ledger Entry`
            WHERE employee = %(employee)s
            AND leave_type = %(leave_type)s
            AND transaction_type = 'Leave Application'
            AND docstatus = 1
        """, {
            "employee": employee,
            "leave_type": toil_leave_type
        }, as_dict=True)[0].total

        # Calculate current available balance
        available_balance = flt(total_accrued - total_consumed, 3)

        # Get employee name
        employee_name = frappe.db.get_value("Employee", employee, "employee_name")

        return {
            "success": True,
            "data": {
                "employee": employee,
                "employee_name": employee_name,
                "available": available_balance,
                "total": flt(total_accrued, 3),
                "used": flt(total_consumed, 3)
            },
            "message": _("Balance fetched successfully")
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        return {
            "success": False,
            "error": {
                "code": "PERMISSION_DENIED",
                "message": _("Permission denied to access this employee's balance"),
                "field": None
            }
        }
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Balance API Error",
            message=f"Error fetching TOIL balance: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching balance: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def get_balance_summary(employee: str = None) -> Dict[str, Any]:
    """
    Get simplified balance summary (for dashboard widgets)

    Args:
        employee: Employee ID (optional, defaults to current user)

    Returns:
        {
            "success": true,
            "data": {
                "available": 5.5,
                "expiring_soon": 2.0,
                "pending_accrual": 1.0
            }
        }
    """
    try:
        # Default to current employee
        if not employee:
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

        # Validate access
        validate_employee_access(employee)

        # Get detailed balance
        balance_result = get_toil_balance_for_leave(employee)

        if not balance_result.get("success"):
            return balance_result

        balance_data = balance_result["data"]

        # Get pending accrual (timesheets submitted but not yet approved)
        pending_accrual = frappe.db.sql("""
            SELECT
                COALESCE(SUM(toil_days), 0) as total
            FROM `tabTimesheet`
            WHERE employee = %(employee)s
            AND docstatus = 0
            AND total_toil_hours > 0
        """, {"employee": employee}, as_dict=True)[0].total

        return {
            "success": True,
            "data": {
                "available": balance_data["available"],
                "expiring_soon": 0,  # Field not currently calculated
                "pending_accrual": flt(pending_accrual, 3),
                "total_accrued": balance_data["total"],
                "total_consumed": balance_data["used"]
            },
            "message": _("Balance summary fetched successfully")
        }

    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Balance API Error",
            message=f"Error fetching balance summary: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching balance summary: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def get_toil_balance(employee: str = None) -> Dict[str, Any]:
    """Legacy-compatible wrapper returning concise TOIL balance."""
    result = get_toil_balance_for_leave(employee)
    if not result.get("success"):
        return result

    data = result.get("data", {})
    return {
        "success": True,
        "employee": data.get("employee"),
        "employee_name": data.get("employee_name"),
        "balance": data.get("available", 0),
        "total_accrued": data.get("total", 0),
        "total_consumed": data.get("used", 0),
        "expiring_soon": [],
        "leave_type": TOIL_LEAVE_TYPE,
        "unit": "days"
    }


@frappe.whitelist()
def get_toil_summary(employee: str = None) -> Dict[str, Any]:
    """Legacy-compatible wrapper returning summary metrics."""
    balance = get_toil_balance_for_leave(employee)
    if not balance.get("success"):
        return balance

    summary = get_balance_summary(employee)
    if not summary.get("success"):
        return summary

    b = balance.get("data", {})
    s = summary.get("data", {})

    return {
        "success": True,
        "employee": b.get("employee"),
        "current_balance": b.get("available", 0),
        "total_accrued": s.get("total_accrued", 0),
        "total_consumed": s.get("total_consumed", 0),
        "expiring_soon": s.get("expiring_soon", 0),
        "pending_accrual": s.get("pending_accrual", 0)
    }


@frappe.whitelist()
def get_leave_ledger(employee: str = None) -> Dict[str, Any]:
    """Return TOIL leave ledger rows for current/target employee."""
    try:
        if not employee:
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

        validate_employee_access(employee)

        rows = frappe.get_list(
            "Leave Ledger Entry",
            fields=[
                "name",
                "employee",
                "leave_type",
                "from_date",
                "to_date",
                "transaction_type",
                "transaction_name",
                "leaves",
                "is_expired",
                "creation"
            ],
            filters={
                "employee": employee,
                "leave_type": TOIL_LEAVE_TYPE,
                "docstatus": 1
            },
            order_by="creation desc",
            limit_page_length=500
        )

        return {
            "success": True,
            "data": rows,
            "total": len(rows)
        }
    except frappe.PermissionError:
        frappe.response["http_status_code"] = 403
        return {
            "success": False,
            "error": {
                "code": "PERMISSION_DENIED",
                "message": _("Permission denied to access this employee's ledger"),
                "field": None
            }
        }
    except Exception as e:
        frappe.response["http_status_code"] = 500
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching leave ledger: {0}").format(str(e)),
                "field": None
            }
        }
