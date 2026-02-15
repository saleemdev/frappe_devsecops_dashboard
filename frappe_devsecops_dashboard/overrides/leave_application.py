"""
TOIL System - Leave Application Overrides

This module contains hooks for Leave Application to handle TOIL-specific operations:
1. validate_toil_balance - TOIL-specific validations and expiry warnings
2. track_toil_consumption - FIFO consumption tracking for audit trail
3. restore_toil_balance - Cleanup on cancellation

Reference: Plan lines 386-388 and Implementation Plan document
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate, add_days

# Import canonical implementations from api.toil (consolidated from duplicates)
from frappe_devsecops_dashboard.api.toil import get_allocation_balance, get_available_toil_allocations
# Import TOIL constants (centralized configuration)
from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE


def validate_toil_balance(doc, method):
    """
    TOIL-specific validations for Leave Application
    - Check expiring balances
    - Warn if TOIL will expire soon

    Trigger: Before Leave Application validation
    Impact: Can warn or block submission
    """
    # Only process TOIL leave applications
    if doc.leave_type != TOIL_LEAVE_TYPE:
        return

    # Get TOIL balance details for the employee
    balance_info = get_toil_balance_details(doc.employee)

    # Warn about expiring TOIL (within 30 days)
    if balance_info.get("expiring_soon", 0) > 0:
        expiring_days = balance_info.get("expiring_soon")
        expiry_date = balance_info.get("earliest_expiry_date")

        frappe.msgprint(
            _("Note: {0} days of TOIL are expiring on {1} (within 30 days). Consider using them first.").format(
                expiring_days, expiry_date
            ),
            alert=True,
            indicator="orange"
        )

    # Additional validation: Check if trying to use more than available (ERPNext handles this too)
    available_balance = balance_info.get("balance", 0)
    if flt(doc.total_leave_days) > flt(available_balance):
        frappe.throw(
            _("Insufficient TOIL balance. Available: {0} days, Requested: {1} days").format(
                available_balance, doc.total_leave_days
            )
        )


def track_toil_consumption(doc, method):
    """
    Track TOIL consumption for audit trail
    Links leave application to source timesheets using FIFO

    Trigger: After Leave Application is submitted
    Purpose: Audit logging, future reporting
    """
    # Only process TOIL leave applications
    if doc.leave_type != TOIL_LEAVE_TYPE:
        return

    # Get TOIL allocations in FIFO order (oldest first)
    allocations = get_available_toil_allocations(doc.employee)

    days_remaining = flt(doc.total_leave_days)
    consumption_log = []

    # Consume allocations in FIFO order
    for alloc in allocations:
        if days_remaining <= 0:
            break

        # Get current balance for this allocation
        available = get_allocation_balance(alloc.name)

        if available > 0:
            # Consume from this allocation
            consumed_from_this = min(days_remaining, available)

            consumption_log.append({
                "timesheet": alloc.source_timesheet,
                "allocation": alloc.name,
                "allocation_date": alloc.from_date,
                "days_consumed": consumed_from_this,
                "days_available_before": available
            })

            days_remaining -= consumed_from_this

    # Log consumption for audit trail
    if consumption_log:
        frappe.logger().info(
            f"Leave Application {doc.name} consumed TOIL in FIFO order: {consumption_log}"
        )

        # Store consumption log in custom field if available
        # Note: This requires a custom field 'toil_consumption_log' in Leave Application
        if hasattr(doc, 'toil_consumption_log'):
            import json
            doc.db_set('toil_consumption_log', json.dumps(consumption_log), update_modified=False)


def restore_toil_balance(doc, method):
    """
    Restore TOIL balance when Leave Application is cancelled

    Trigger: When Leave Application is cancelled
    Impact: Leave Ledger Entry is automatically cancelled by ERPNext

    Note: ERPNext automatically cancels the Leave Ledger Entry and restores balance.
    This hook is for additional cleanup and user notifications.
    """
    # Only process TOIL leave applications
    if doc.leave_type != TOIL_LEAVE_TYPE:
        return

    # ERPNext automatically cancels the Leave Ledger Entry
    # Balance is restored automatically

    # Notify user about balance restoration
    frappe.msgprint(
        _("TOIL balance of {0} days has been restored").format(doc.total_leave_days),
        alert=True,
        indicator="blue"
    )

    # Log cancellation
    frappe.logger().info(
        f"Leave Application {doc.name} cancelled. TOIL balance of {doc.total_leave_days} days restored for employee {doc.employee}"
    )


# ============================================================================
# Helper Functions
# ============================================================================

def get_toil_balance_details(employee):
    """
    Get detailed TOIL balance information including expiring allocations

    Args:
        employee (str): Employee ID

    Returns:
        dict: Balance details including expiring soon allocations
    """
    from frappe.utils import add_days, getdate

    thirty_days_out = add_days(getdate(), 30)
    today = getdate()

    # Get total TOIL balance
    total_balance = frappe.db.sql("""
        SELECT SUM(lle.leaves) as balance
        FROM `tabLeave Ledger Entry` lle
        INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
        WHERE lle.employee = %s
        AND lle.leave_type = %s
        AND lle.docstatus = 1
        AND lle.is_expired = 0
        AND la.is_toil_allocation = 1
    """, (employee, TOIL_LEAVE_TYPE), as_dict=1)

    balance = flt(total_balance[0].balance) if total_balance else 0

    # Get allocations expiring within 30 days
    expiring = frappe.db.sql("""
        SELECT
            la.name,
            la.from_date,
            la.to_date,
            SUM(lle.leaves) as expiring_balance
        FROM `tabLeave Ledger Entry` lle
        INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
        WHERE lle.employee = %s
        AND lle.leave_type = %s
        AND lle.docstatus = 1
        AND lle.is_expired = 0
        AND la.is_toil_allocation = 1
        AND la.to_date <= %s
        AND la.to_date >= %s
        GROUP BY la.name, la.from_date, la.to_date
        HAVING expiring_balance > 0
        ORDER BY la.to_date ASC
    """, (employee, TOIL_LEAVE_TYPE, thirty_days_out, today), as_dict=1)

    expiring_soon = sum([flt(e.expiring_balance) for e in expiring])
    earliest_expiry = expiring[0].to_date if expiring else None

    return {
        "balance": balance,
        "expiring_soon": expiring_soon,
        "earliest_expiry_date": earliest_expiry,
        "expiring_allocations": expiring
    }


