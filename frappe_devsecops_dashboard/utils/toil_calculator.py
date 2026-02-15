"""
TOIL (Time Off in Lieu) Calculator Utilities

Provides shared calculation functions for TOIL accrual and balance management.
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate

# Import helper function from parent toil module
# Note: api.toil is now a package, so we import from the parent toil.py directly
import sys
import os

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


def calculate_toil_hours(timesheet_doc):
    """
    Calculate total TOIL hours from non-billable time log entries.

    TOIL calculation: sum(time_log.hours where !is_billable)

    Args:
        timesheet_doc: Timesheet document object

    Returns:
        float: Total TOIL hours (rounded to 2 decimal places)
    """
    toil_hours = 0.0

    for time_log in timesheet_doc.time_logs:
        # Only count non-billable hours
        if not time_log.is_billable:
            toil_hours += flt(time_log.hours, 2)

    return flt(toil_hours, 2)


def calculate_toil_days(toil_hours):
    """
    Convert TOIL hours to days (8-hour workday).

    Args:
        toil_hours: Total TOIL hours

    Returns:
        float: TOIL days (rounded to 3 decimal places)
    """
    if toil_hours <= 0:
        return 0.0

    # 8-hour workday standard
    return flt(toil_hours / 8, 3)


def validate_supervisor_permission(timesheet_doc):
    """
    Validate that the current user has permission to submit the timesheet.

    CRITICAL SECURITY: Validates with NULL checks for:
    - Employee must have supervisor (reports_to)
    - Supervisor must have user account (user_id)

    Args:
        timesheet_doc: Timesheet document object

    Returns:
        tuple: (bool, str) - (is_valid, error_message)
    """
    current_user = frappe.session.user

    # System Manager bypass
    if "System Manager" in frappe.get_roles(current_user):
        return True, None

    # Get employee record
    if not timesheet_doc.employee:
        return False, _("Timesheet must have an employee assigned.")

    try:
        employee = frappe.get_doc("Employee", timesheet_doc.employee)
    except frappe.DoesNotExistError:
        return False, _("Employee {0} does not exist.").format(timesheet_doc.employee)

    # CRITICAL NULL CHECK: Employee must have supervisor
    if not employee.reports_to:
        return False, _(
            "Employee {0} has no supervisor assigned. Cannot submit timesheet."
        ).format(employee.name)

    # CRITICAL NULL CHECK: Supervisor must have user account
    supervisor_user = frappe.db.get_value("Employee", employee.reports_to, "user_id")
    if not supervisor_user:
        return False, _(
            "Supervisor {0} has no user account. Cannot submit timesheet."
        ).format(employee.reports_to)

    # Validate current user is supervisor
    if current_user != supervisor_user:
        return False, _(
            "Only the immediate supervisor can approve this timesheet. "
            "Expected: {0}, Current: {1}"
        ).format(supervisor_user, current_user)

    return True, None


def check_toil_consumption(allocation_name):
    """
    Check if any TOIL from an allocation has been consumed.

    Args:
        allocation_name: Name of the Leave Allocation document

    Returns:
        tuple: (bool, float, float) - (has_consumed, allocated, consumed)
    """
    if not allocation_name:
        return False, 0.0, 0.0

    # Get allocation details
    allocated = frappe.db.get_value(
        "Leave Allocation",
        allocation_name,
        "new_leaves_allocated"
    )

    if not allocated:
        return False, 0.0, 0.0

    allocated = flt(allocated, 3)
    balance = get_allocation_balance(allocation_name)
    consumed = allocated - balance

    return consumed > 0, allocated, consumed


def lock_employee_for_update(employee_name):
    """
    Lock employee record to prevent concurrent TOIL operations.

    Uses SELECT FOR UPDATE to ensure transaction safety.

    Args:
        employee_name: Name of the Employee document

    Returns:
        bool: True if lock acquired successfully
    """
    try:
        frappe.db.sql("""
            SELECT name FROM `tabEmployee`
            WHERE name = %s
            FOR UPDATE
        """, employee_name)
        return True
    except Exception as e:
        frappe.log_error(
            title="TOIL Employee Lock Failed",
            message=f"Failed to lock employee {employee_name}: {str(e)}"
        )
        return False
