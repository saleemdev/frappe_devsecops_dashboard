"""
TOIL (Time Off In Lieu) API endpoints
Whitelisted methods for TOIL management operations
Includes security validation, caching, and error handling
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate, add_months, add_days, cstr
from typing import Dict, Any, Optional, List
import json
from functools import wraps
from datetime import datetime, timedelta

# Import TOIL constants (centralized configuration)
from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE, TOILStatus

# ============================================================================
# IMPORT PHASE 2-4 APIs (for Frappe routing)
# ============================================================================
from frappe_devsecops_dashboard.api.toil.validation_api import validate_employee_setup
from frappe_devsecops_dashboard.api.toil.timesheet_api import (
    get_my_timesheets,
    get_timesheets_to_approve,
    create_timesheet,
    submit_timesheet_for_approval
)
from frappe_devsecops_dashboard.api.toil.leave_api import (
    get_my_leave_applications,
    create_leave_application,
    submit_leave_for_approval
)
from frappe_devsecops_dashboard.api.toil.balance_api import (
    get_toil_balance_for_leave,
    get_balance_summary
)


# ============================================================================
# CACHING UTILITIES
# ============================================================================

def get_cache_key(prefix: str, *args) -> str:
    """Generate a cache key from prefix and arguments"""
    key_parts = [prefix] + [cstr(arg) for arg in args if arg]
    return "-".join(key_parts)


def cache_response(ttl: int = 60):
    """
    Decorator for caching API responses
    Args:
        ttl: Time to live in seconds
    """
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            # Generate cache key from function name and arguments
            cache_key = get_cache_key(
                f"toil-{func.__name__}",
                *args,
                *[f"{k}={v}" for k, v in sorted(kwargs.items())]
            )

            # Try to get from cache
            cached = frappe.cache().get_value(cache_key)
            if cached is not None:
                return cached

            # Execute function
            result = func(*args, **kwargs)

            # Cache result
            frappe.cache().set_value(cache_key, result, expires_in_sec=ttl)
            return result

        return wrapper
    return decorator


def clear_toil_cache(employee: str = None):
    """Clear TOIL-related caches for an employee"""
    if employee:
        # Clear specific employee caches
        patterns = [
            f"toil-get_toil_balance-{employee}",
            f"toil-get_toil_summary-{employee}",
            f"toil-get_toil_report-{employee}",
        ]
        for pattern in patterns:
            frappe.cache().delete_value(pattern)
    else:
        # Clear all TOIL caches
        frappe.cache().delete_keys("toil-*")


# ============================================================================
# SECURITY VALIDATION
# ============================================================================

def validate_employee_access(employee: str) -> bool:
    """
    Validate that the current user can access the specified employee's data

    Security rules:
    1. System Manager can access all
    2. Users can access their own data
    3. Supervisors can access subordinate data

    Args:
        employee: Employee ID to validate access for

    Returns:
        bool: True if access is allowed

    Raises:
        frappe.PermissionError: If access is denied
    """
    if not employee:
        frappe.throw(_("Employee ID is required"), frappe.ValidationError)

    current_user = frappe.session.user

    # System Manager can access all
    if "System Manager" in frappe.get_roles(current_user):
        return True

    # Get current user's employee record
    current_employee = frappe.db.get_value(
        "Employee",
        {"user_id": current_user},
        "name"
    )

    if not current_employee:
        frappe.throw(
            _("No employee record found for current user"),
            frappe.PermissionError
        )

    # Can access own data
    if employee == current_employee:
        return True

    # Can access subordinate data (if supervisor)
    supervisor_of_employee = frappe.db.get_value(
        "Employee",
        employee,
        "reports_to"
    )

    if supervisor_of_employee == current_employee:
        return True

    # Access denied
    frappe.throw(
        _("Permission denied to access this employee's data"),
        frappe.PermissionError
    )


def get_current_employee() -> Optional[str]:
    """Get the employee record for the current user"""
    current_user = frappe.session.user
    employee = frappe.db.get_value(
        "Employee",
        {"user_id": current_user},
        "name"
    )
    return employee


def can_approve_timesheet(timesheet_doc) -> bool:
    """
    Check if current user can approve the timesheet

    Approval rules:
    1. System Manager can approve all
    2. Immediate supervisor can approve
    3. Employee cannot approve their own timesheet

    Args:
        timesheet_doc: Timesheet document

    Returns:
        bool: True if user can approve
    """
    current_user = frappe.session.user

    # System Manager bypass
    if "System Manager" in frappe.get_roles(current_user):
        return True

    # Get timesheet employee's supervisor
    employee = frappe.get_cached_doc("Employee", timesheet_doc.employee)

    if not employee.reports_to:
        return False

    # Get supervisor's user ID
    supervisor_user = frappe.db.get_value(
        "Employee",
        employee.reports_to,
        "user_id"
    )

    # Current user must be the supervisor
    return current_user == supervisor_user


# ============================================================================
# API METHOD 1: GET USER ROLE
# ============================================================================

@frappe.whitelist()
def get_user_role() -> Dict[str, Any]:
    """
    Get the current user's role in the TOIL system

    Returns:
        Dict with role ('employee' | 'supervisor' | 'hr')
    """
    try:
        current_user = frappe.session.user

        # Check if System Manager or HR Manager
        roles = frappe.get_roles(current_user)
        if "System Manager" in roles or "HR Manager" in roles:
            return {
                "success": True,
                "role": "hr"
            }

        # Get employee record
        employee = get_current_employee()
        if not employee:
            frappe.throw(
                _("No employee record found for current user"),
                frappe.PermissionError
            )

        # Check if supervisor (has subordinates)
        subordinates_count = frappe.db.count(
            "Employee",
            {"reports_to": employee}
        )

        if subordinates_count > 0:
            return {
                "success": True,
                "role": "supervisor",
                "employee": employee,
                "subordinates_count": subordinates_count
            }

        return {
            "success": True,
            "role": "employee",
            "employee": employee
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error getting user role: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while fetching user role: {0}").format(str(e)))


# ============================================================================
# API METHOD 2: GET TOIL BALANCE
# ============================================================================

@frappe.whitelist()
@cache_response(ttl=60)  # Cache for 60 seconds
def get_toil_balance(employee: str = None) -> Dict[str, Any]:
    """
    Get current TOIL balance for an employee

    Args:
        employee: Employee ID (optional, defaults to current user)

    Returns:
        Dict with balance information
    """
    try:
        # Default to current employee
        if not employee:
            employee = get_current_employee()
            if not employee:
                frappe.throw(
                    _("No employee record found for current user"),
                    frappe.PermissionError
                )

        # Validate access
        validate_employee_access(employee)

        # Get TOIL Leave Type
        toil_leave_type = TOIL_LEAVE_TYPE

        # Calculate balance from Leave Ledger Entry
        # Balance = SUM(leaves) where positive = accrued, negative = consumed
        balance_data = frappe.db.sql("""
            SELECT
                SUM(leaves) as balance
            FROM `tabLeave Ledger Entry`
            WHERE employee = %(employee)s
            AND leave_type = %(leave_type)s
            AND docstatus = 1
            AND (is_expired IS NULL OR is_expired = 0)
        """, {
            "employee": employee,
            "leave_type": toil_leave_type
        }, as_dict=True)

        balance = flt(balance_data[0].balance if balance_data else 0, 3)

        # Get employee name
        employee_name = frappe.db.get_value("Employee", employee, "employee_name")

        return {
            "success": True,
            "employee": employee,
            "employee_name": employee_name,
            "balance": balance,
            "leave_type": toil_leave_type,
            "unit": "days"
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching TOIL balance: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while fetching TOIL balance: {0}").format(str(e)))


# ============================================================================
# API METHOD 3: GET TOIL SUMMARY
# ============================================================================

@frappe.whitelist()
@cache_response(ttl=300)  # Cache for 5 minutes
def get_toil_summary(employee: str = None) -> Dict[str, Any]:
    """
    Get detailed TOIL summary including accrued, consumed, and expiring balances

    Args:
        employee: Employee ID (optional, defaults to current user)

    Returns:
        Dict with detailed summary
    """
    try:
        # Default to current employee
        if not employee:
            employee = get_current_employee()
            if not employee:
                frappe.throw(
                    _("No employee record found for current user"),
                    frappe.PermissionError
                )

        # Validate access
        validate_employee_access(employee)

        toil_leave_type = TOIL_LEAVE_TYPE

        # Get total accrued (from Leave Allocations)
        total_accrued = frappe.db.sql("""
            SELECT
                COALESCE(SUM(lle.leaves), 0) as total
            FROM `tabLeave Ledger Entry` lle
            INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
            WHERE lle.employee = %(employee)s
            AND lle.leave_type = %(leave_type)s
            AND lle.transaction_type = 'Leave Allocation'
            AND lle.docstatus = 1
            AND la.is_toil_allocation = 1
        """, {
            "employee": employee,
            "leave_type": toil_leave_type
        }, as_dict=True)[0].total

        # Get total consumed (from Leave Applications)
        total_consumed = frappe.db.sql("""
            SELECT
                COALESCE(ABS(SUM(leaves)), 0) as total
            FROM `tabLeave Ledger Entry`
            WHERE employee = %(employee)s
            AND leave_type = %(leave_type)s
            AND transaction_type = 'Leave Application'
            AND docstatus = 1
        """, {
            "employee": employee,
            "leave_type": toil_leave_type
        }, as_dict=True)[0].total

        # Current balance
        current_balance = flt(total_accrued - total_consumed, 3)

        # Get expiring balance (within 30 days)
        thirty_days_out = add_days(getdate(), 30)
        expiring_balance = frappe.db.sql("""
            SELECT
                COALESCE(SUM(lle.leaves), 0) as total
            FROM `tabLeave Ledger Entry` lle
            INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
            WHERE lle.employee = %(employee)s
            AND lle.leave_type = %(leave_type)s
            AND lle.transaction_type = 'Leave Allocation'
            AND lle.docstatus = 1
            AND la.is_toil_allocation = 1
            AND la.to_date <= %(expiry_date)s
            AND la.to_date >= %(today)s
            AND (lle.is_expired IS NULL OR lle.is_expired = 0)
        """, {
            "employee": employee,
            "leave_type": toil_leave_type,
            "expiry_date": thirty_days_out,
            "today": getdate()
        }, as_dict=True)[0].total

        # Get recent timesheets with TOIL
        recent_timesheets = frappe.db.sql("""
            SELECT
                ts.name,
                ts.start_date,
                ts.end_date,
                ts.total_toil_hours,
                ts.toil_days,
                ts.toil_status,
                ts.docstatus
            FROM `tabTimesheet` ts
            WHERE ts.employee = %(employee)s
            AND ts.total_toil_hours > 0
            ORDER BY ts.modified DESC
            LIMIT 5
        """, {
            "employee": employee
        }, as_dict=True)

        # Get employee name
        employee_name = frappe.db.get_value("Employee", employee, "employee_name")

        return {
            "success": True,
            "employee": employee,
            "employee_name": employee_name,
            "balance": current_balance,
            "total_accrued": flt(total_accrued, 3),
            "total_consumed": flt(total_consumed, 3),
            "expiring_soon": flt(expiring_balance, 3),
            "expiring_in_days": 30,
            "recent_timesheets": recent_timesheets,
            "leave_type": toil_leave_type
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching TOIL summary: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while fetching TOIL summary: {0}").format(str(e)))


# ============================================================================
# API METHOD 4: GET SUPERVISOR TIMESHEETS
# ============================================================================

@frappe.whitelist()
def get_supervisor_timesheets(
    status: str = None,
    from_date: str = None,
    to_date: str = None,
    limit_start: int = 0,
    limit_page_length: int = 20
) -> Dict[str, Any]:
    """
    Get timesheets for the supervisor's team members

    Args:
        status: Filter by status (Draft, Submitted, etc.)
        from_date: Start date filter
        to_date: End date filter
        limit_start: Pagination offset
        limit_page_length: Records per page

    Returns:
        Dict with timesheets list and total count
    """
    try:
        # Get current employee
        supervisor = get_current_employee()
        if not supervisor:
            frappe.throw(
                _("No employee record found for current user"),
                frappe.PermissionError
            )

        # Get subordinates
        subordinates = frappe.db.sql("""
            SELECT name, employee_name
            FROM `tabEmployee`
            WHERE reports_to = %(supervisor)s
            AND status = 'Active'
        """, {"supervisor": supervisor}, as_dict=True)

        if not subordinates:
            return {
                "success": True,
                "data": [],
                "total": 0,
                "message": "No subordinates found"
            }

        subordinate_ids = [s.name for s in subordinates]

        # Build filters
        filters = {
            "employee": ["in", subordinate_ids],
            "total_toil_hours": [">", 0]
        }

        if status:
            if status == "Draft":
                filters["docstatus"] = 0
            elif status == "Pending":
                filters["docstatus"] = 0
            elif status == "Submitted":
                filters["docstatus"] = 1
            elif status == "Cancelled":
                filters["docstatus"] = 2

        if from_date:
            filters["start_date"] = [">=", from_date]

        if to_date:
            filters["end_date"] = ["<=", to_date]

        # Get timesheets
        timesheets = frappe.get_list(
            "Timesheet",
            fields=[
                "name",
                "employee",
                "employee_name",
                "start_date",
                "end_date",
                "total_toil_hours",
                "toil_days",
                "toil_status",
                "toil_allocation",
                "docstatus",
                "modified",
                "modified_by"
            ],
            filters=filters,
            order_by="modified desc",
            limit_start=int(limit_start),
            limit_page_length=int(limit_page_length)
        )

        # Get total count
        total = frappe.db.count("Timesheet", filters=filters)

        return {
            "success": True,
            "data": timesheets,
            "total": total,
            "subordinates": subordinates
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching supervisor timesheets: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while fetching timesheets: {0}").format(str(e)))


# ============================================================================
# API METHOD 5: CALCULATE TOIL PREVIEW
# ============================================================================

@frappe.whitelist()
def calculate_toil_preview(timesheet_name: str) -> Dict[str, Any]:
    """
    Calculate TOIL for a timesheet before submission

    Args:
        timesheet_name: Timesheet ID

    Returns:
        Dict with TOIL calculation preview
    """
    try:
        if not timesheet_name:
            frappe.throw(_("Timesheet name is required"), frappe.ValidationError)

        # Get timesheet
        doc = frappe.get_doc("Timesheet", timesheet_name)

        # Validate access
        validate_employee_access(doc.employee)

        # Calculate non-billable hours
        total_toil_hours = 0.0
        breakdown = []

        for time_log in doc.time_logs:
            if not time_log.is_billable:
                hours = flt(time_log.hours, 2)
                total_toil_hours += hours

                breakdown.append({
                    "activity_type": time_log.activity_type,
                    "project": time_log.project,
                    "from_time": time_log.from_time,
                    "to_time": time_log.to_time,
                    "hours": hours,
                    "description": time_log.description
                })

        # Calculate TOIL days (8 hours = 1 day)
        toil_days = flt(total_toil_hours / 8.0, 3)

        return {
            "success": True,
            "timesheet": timesheet_name,
            "employee": doc.employee,
            "employee_name": doc.employee_name,
            "total_toil_hours": flt(total_toil_hours, 2),
            "toil_days": toil_days,
            "breakdown": breakdown,
            "can_submit": total_toil_hours > 0
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_("Timesheet not found"), frappe.DoesNotExistError)
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error calculating TOIL preview: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while calculating TOIL: {0}").format(str(e)))


# ============================================================================
# API METHOD 6: APPROVE TIMESHEET
# ============================================================================

@frappe.whitelist()
def approve_timesheet(timesheet_name: str, comment: str = None) -> Dict[str, Any]:
    """
    Approve a timesheet (supervisor only)

    Args:
        timesheet_name: Timesheet ID
        comment: Optional approval comment

    Returns:
        Dict with approval result
    """
    try:
        if not timesheet_name:
            frappe.throw(_("Timesheet name is required"), frappe.ValidationError)

        # Get timesheet
        doc = frappe.get_doc("Timesheet", timesheet_name)

        # Check if already submitted
        if doc.docstatus == 1:
            frappe.throw(_("Timesheet is already submitted"), frappe.ValidationError)

        # Check approval permission
        if not can_approve_timesheet(doc):
            frappe.throw(
                _("Only the supervisor can approve this timesheet"),
                frappe.PermissionError
            )

        # Submit timesheet (triggers on_submit hook which creates TOIL allocation)
        doc.submit()

        # Add comment if provided
        if comment:
            doc.add_comment("Comment", text=f"Approved: {comment}")

        # Clear caches
        clear_toil_cache(doc.employee)

        return {
            "success": True,
            "message": _("Timesheet approved successfully"),
            "timesheet": timesheet_name,
            "toil_allocation": doc.toil_allocation,
            "toil_days": doc.toil_days
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_("Timesheet not found"), frappe.DoesNotExistError)
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error approving timesheet: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while approving timesheet: {0}").format(str(e)))


# ============================================================================
# API METHOD 7: REJECT TIMESHEET
# ============================================================================

@frappe.whitelist()
def reject_timesheet(timesheet_name: str, reason: str) -> Dict[str, Any]:
    """
    Reject a timesheet (supervisor only)

    Args:
        timesheet_name: Timesheet ID
        reason: Rejection reason (required)

    Returns:
        Dict with rejection result
    """
    try:
        if not timesheet_name:
            frappe.throw(_("Timesheet name is required"), frappe.ValidationError)

        if not reason:
            frappe.throw(_("Rejection reason is required"), frappe.ValidationError)

        # Get timesheet
        doc = frappe.get_doc("Timesheet", timesheet_name)

        # Check if already submitted
        if doc.docstatus == 1:
            frappe.throw(_("Cannot reject a submitted timesheet"), frappe.ValidationError)

        # Check approval permission
        if not can_approve_timesheet(doc):
            frappe.throw(
                _("Only the supervisor can reject this timesheet"),
                frappe.PermissionError
            )

        # Add rejection comment
        doc.add_comment("Comment", text=f"Rejected: {reason}")

        # Update status field if available
        if hasattr(doc, 'toil_status'):
            doc.db_set('toil_status', 'Rejected')

        # Clear caches
        clear_toil_cache(doc.employee)

        return {
            "success": True,
            "message": _("Timesheet rejected"),
            "timesheet": timesheet_name,
            "reason": reason
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_("Timesheet not found"), frappe.DoesNotExistError)
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error rejecting timesheet: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while rejecting timesheet: {0}").format(str(e)))


# ============================================================================
# API METHOD 8: GET TOIL BREAKDOWN
# ============================================================================

@frappe.whitelist()
def get_toil_breakdown(timesheet_name: str) -> Dict[str, Any]:
    """
    Get detailed day-by-day TOIL breakdown for a timesheet

    Args:
        timesheet_name: Timesheet ID

    Returns:
        Dict with detailed breakdown
    """
    try:
        if not timesheet_name:
            frappe.throw(_("Timesheet name is required"), frappe.ValidationError)

        # Get timesheet
        doc = frappe.get_doc("Timesheet", timesheet_name)

        # Validate access
        validate_employee_access(doc.employee)

        # Group time logs by date
        daily_breakdown = {}

        for time_log in doc.time_logs:
            if not time_log.is_billable:
                # Get date from from_time
                log_date = time_log.from_time.date() if hasattr(time_log.from_time, 'date') else time_log.from_time
                date_key = cstr(log_date)

                if date_key not in daily_breakdown:
                    daily_breakdown[date_key] = {
                        "date": date_key,
                        "total_hours": 0.0,
                        "activities": []
                    }

                hours = flt(time_log.hours, 2)
                daily_breakdown[date_key]["total_hours"] += hours
                daily_breakdown[date_key]["activities"].append({
                    "activity_type": time_log.activity_type,
                    "project": time_log.project,
                    "from_time": cstr(time_log.from_time),
                    "to_time": cstr(time_log.to_time),
                    "hours": hours,
                    "description": time_log.description
                })

        # Convert to sorted list
        breakdown_list = sorted(
            daily_breakdown.values(),
            key=lambda x: x["date"]
        )

        # Calculate totals
        total_hours = sum(day["total_hours"] for day in breakdown_list)
        total_days = flt(total_hours / 8.0, 3)

        return {
            "success": True,
            "timesheet": timesheet_name,
            "employee": doc.employee,
            "employee_name": doc.employee_name,
            "start_date": cstr(doc.start_date),
            "end_date": cstr(doc.end_date),
            "total_toil_hours": flt(total_hours, 2),
            "toil_days": total_days,
            "daily_breakdown": breakdown_list,
            "toil_status": doc.toil_status if hasattr(doc, 'toil_status') else None
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_("Timesheet not found"), frappe.DoesNotExistError)
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching TOIL breakdown: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while fetching breakdown: {0}").format(str(e)))


# ============================================================================
# API METHOD 9: GET TOIL REPORT
# ============================================================================

@frappe.whitelist()
def get_toil_report(
    employee: str,
    from_date: str,
    to_date: str
) -> Dict[str, Any]:
    """
    Generate TOIL report for an employee over a date range

    Args:
        employee: Employee ID
        from_date: Report start date (YYYY-MM-DD)
        to_date: Report end date (YYYY-MM-DD)

    Returns:
        Dict with report data
    """
    try:
        if not employee or not from_date or not to_date:
            frappe.throw(
                _("Employee, from_date, and to_date are required"),
                frappe.ValidationError
            )

        # Validate access
        validate_employee_access(employee)

        # Convert dates
        from_date_obj = getdate(from_date)
        to_date_obj = getdate(to_date)

        toil_leave_type = TOIL_LEAVE_TYPE

        # Get all TOIL transactions in date range
        transactions = frappe.db.sql("""
            SELECT
                lle.transaction_type,
                lle.transaction_name,
                lle.leaves,
                lle.from_date,
                lle.to_date,
                lle.creation,
                CASE
                    WHEN lle.transaction_type = 'Leave Allocation' THEN la.source_timesheet
                    ELSE NULL
                END as source_timesheet
            FROM `tabLeave Ledger Entry` lle
            LEFT JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
                AND lle.transaction_type = 'Leave Allocation'
            WHERE lle.employee = %(employee)s
            AND lle.leave_type = %(leave_type)s
            AND lle.docstatus = 1
            AND (
                (lle.from_date BETWEEN %(from_date)s AND %(to_date)s)
                OR (lle.to_date BETWEEN %(from_date)s AND %(to_date)s)
            )
            ORDER BY lle.from_date DESC, lle.creation DESC
        """, {
            "employee": employee,
            "leave_type": toil_leave_type,
            "from_date": from_date_obj,
            "to_date": to_date_obj
        }, as_dict=True)

        # Calculate summary
        total_accrued = sum(
            flt(t.leaves, 3) for t in transactions
            if t.transaction_type == "Leave Allocation" and t.leaves > 0
        )

        total_consumed = sum(
            abs(flt(t.leaves, 3)) for t in transactions
            if t.transaction_type == "Leave Application" and t.leaves < 0
        )

        # Get employee info
        employee_info = frappe.db.get_value(
            "Employee",
            employee,
            ["employee_name", "department", "designation"],
            as_dict=True
        )

        return {
            "success": True,
            "employee": employee,
            "employee_name": employee_info.employee_name,
            "department": employee_info.department,
            "designation": employee_info.designation,
            "from_date": cstr(from_date_obj),
            "to_date": cstr(to_date_obj),
            "summary": {
                "total_accrued": flt(total_accrued, 3),
                "total_consumed": flt(total_consumed, 3),
                "net_change": flt(total_accrued - total_consumed, 3)
            },
            "transactions": [
                {
                    "transaction_type": t.transaction_type,
                    "transaction_name": t.transaction_name,
                    "leaves": flt(t.leaves, 3),
                    "from_date": cstr(t.from_date),
                    "to_date": cstr(t.to_date),
                    "creation": cstr(t.creation),
                    "source_timesheet": t.source_timesheet
                }
                for t in transactions
            ]
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error generating TOIL report: {str(e)}", "TOIL API")
        frappe.throw(_("An error occurred while generating report: {0}").format(str(e)))


# ============================================================================
# DATABASE INDEXES (Run via migration patch)
# ============================================================================

def create_toil_indexes():
    """
    Create database indexes for TOIL queries
    Should be called from a migration patch
    """
    try:
        # Index for Leave Ledger Entry TOIL queries
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_leave_ledger_toil
            ON `tabLeave Ledger Entry` (employee, leave_type, docstatus, to_date)
        """)

        # Index for Leave Allocation TOIL queries
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_leave_allocation_toil
            ON `tabLeave Allocation` (is_toil_allocation, employee, docstatus)
        """)

        # Index for Timesheet TOIL queries
        frappe.db.sql("""
            CREATE INDEX IF NOT EXISTS idx_timesheet_toil
            ON `tabTimesheet` (employee, total_toil_hours, docstatus)
        """)

        frappe.logger().info("TOIL database indexes created successfully")

    except Exception as e:
        frappe.log_error(f"Error creating TOIL indexes: {str(e)}", "TOIL API")
        # Don't throw - indexes are optimization, not critical


# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_available_toil_allocations(employee: str) -> List[Dict]:
    """
    Get available TOIL allocations for an employee in FIFO order

    Args:
        employee: Employee ID

    Returns:
        List of available allocations
    """
    allocations = frappe.db.sql("""
        SELECT
            la.name,
            la.from_date,
            la.to_date,
            la.new_leaves_allocated,
            la.source_timesheet,
            COALESCE(SUM(lle.leaves), 0) as balance
        FROM `tabLeave Allocation` la
        LEFT JOIN `tabLeave Ledger Entry` lle ON lle.transaction_name = la.name
        WHERE la.employee = %(employee)s
        AND la.is_toil_allocation = 1
        AND la.docstatus = 1
        AND la.to_date >= %(today)s
        GROUP BY la.name
        HAVING balance > 0
        ORDER BY la.from_date ASC
    """, {
        "employee": employee,
        "today": getdate()
    }, as_dict=True)

    return allocations


def get_allocation_balance(allocation_name: str) -> float:
    """
    Get remaining balance for a specific allocation

    Args:
        allocation_name: Leave Allocation ID

    Returns:
        Remaining balance
    """
    balance = frappe.db.sql("""
        SELECT COALESCE(SUM(leaves), 0) as balance
        FROM `tabLeave Ledger Entry`
        WHERE transaction_name = %(allocation)s
        AND docstatus = 1
    """, {"allocation": allocation_name}, as_dict=True)[0].balance

    return flt(balance, 3)


@frappe.whitelist()
def get_timesheet(name: str) -> Dict[str, Any]:
    """
    Get single timesheet by ID with TOIL data.

    Args:
        name: Timesheet document name

    Returns:
        Dict with success flag and timesheet data

    Raises:
        ValidationError: If name is missing
        PermissionError: If user lacks access
        DoesNotExistError: If timesheet not found
    """
    try:
        if not name:
            frappe.throw(_("Timesheet name is required"), frappe.ValidationError)

        # Fetch and validate permissions
        doc = frappe.get_doc("Timesheet", name)
        validate_employee_access(doc.employee)

        # Return timesheet with TOIL data
        return {
            "success": True,
            "data": {
                "name": doc.name,
                "employee": doc.employee,
                "employee_name": doc.employee_name,
                "from_date": cstr(doc.start_date),
                "to_date": cstr(doc.end_date),
                "total_hours": flt(doc.total_hours, 2),
                "total_toil_hours": flt(doc.total_toil_hours, 2) if hasattr(doc, 'total_toil_hours') else 0.0,
                "toil_days": flt(doc.toil_days, 3) if hasattr(doc, 'toil_days') else 0.0,
                "toil_status": doc.toil_status if hasattr(doc, 'toil_status') else "Not Applicable",
                "toil_allocation": doc.toil_allocation if hasattr(doc, 'toil_allocation') else None,
                "toil_calculation_details": doc.toil_calculation_details if hasattr(doc, 'toil_calculation_details') else None,
                "docstatus": doc.docstatus,
                "owner": doc.owner,
                "modified": cstr(doc.modified)
            }
        }
    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        raise
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_("Timesheet not found"))
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching timesheet {name}: {str(e)}", "TOIL API Error")
        frappe.throw(_("An error occurred while fetching timesheet"))
