"""
Timesheet Overrides for TOIL (Time Off in Lieu) Management

This module implements 6 critical hooks for TOIL accrual and allocation:
1. validate_timesheet - Calculate TOIL hours for preview
2. before_submit_timesheet - Validate supervisor with NULL checks
3. before_cancel_timesheet - Prevent cancellation if TOIL consumed
4. create_toil_allocation - Create Leave Allocation with compensating transaction
5. cancel_toil_allocation - Reverse TOIL allocation
6. recalculate_toil - Recalculate on time log changes

CRITICAL SECURITY FEATURES:
- NULL checks for employee.reports_to and supervisor.user_id
- Compensating transactions with rollback on failure
- Transaction locking (FOR UPDATE) to prevent race conditions
- NO ignore_permissions=True usage
- Cancellation protection for consumed TOIL
"""

import frappe
from frappe import _
from frappe.utils import flt, getdate, add_months

# Import TOIL constants (centralized configuration)
from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE, TOILStatus
from frappe_devsecops_dashboard.utils.toil_calculator import (
    calculate_toil_hours,
    calculate_toil_days,
    validate_supervisor_permission,
    get_allocation_balance,
    check_toil_consumption,
    lock_employee_for_update
)


def validate_timesheet(doc, method):
    """
    Hook 1: Calculate TOIL hours for preview before save.

    This hook runs on validate and calculates the TOIL hours from
    non-billable time log entries. It updates the timesheet fields
    for display purposes but does not create allocations yet.

    Args:
        doc: Timesheet document
        method: Event method name
    """
    # Calculate TOIL hours from non-billable time logs
    toil_hours = calculate_toil_hours(doc)

    # Convert to days (8-hour workday)
    toil_days = calculate_toil_days(toil_hours)

    # Update timesheet fields for preview
    doc.total_toil_hours = toil_hours
    doc.toil_days = toil_days

    # Set status if TOIL hours exist
    if toil_hours > 0 and doc.docstatus == 0:
        doc.toil_status = "Pending Accrual"


def before_submit_timesheet(doc, method):
    """
    Hook 2: Validate supervisor permission with NULL checks.

    CRITICAL SECURITY: This hook ensures that:
    1. Employee has a supervisor assigned (reports_to is not NULL)
    2. Supervisor has a user account (user_id is not NULL)
    3. Current user is the supervisor (or System Manager)

    This prevents submission by unauthorized users and catches
    data integrity issues before they cause errors.

    Args:
        doc: Timesheet document
        method: Event method name

    Raises:
        frappe.ValidationError: If validation fails
    """
    # Validate supervisor permission with NULL checks
    is_valid, error_message = validate_supervisor_permission(doc)

    if not is_valid:
        frappe.throw(error_message, frappe.ValidationError)

    # Log successful validation for audit trail
    frappe.logger().info(
        f"Timesheet {doc.name} validated for submission by {frappe.session.user}"
    )


def before_cancel_timesheet(doc, method):
    """
    Hook 3: Prevent cancellation if TOIL has been consumed.

    NEW HOOK: This critical hook prevents data inconsistency by
    checking if any TOIL days from the allocation have been used
    in Leave Applications. If TOIL has been consumed, the timesheet
    cannot be cancelled until those leave applications are cancelled first.

    Args:
        doc: Timesheet document
        method: Event method name

    Raises:
        frappe.ValidationError: If TOIL has been consumed
    """
    # Check if timesheet has TOIL allocation
    if not doc.toil_allocation:
        return

    # Check if allocation exists and has been consumed
    has_consumed, allocated, consumed = check_toil_consumption(doc.toil_allocation)

    if has_consumed:
        frappe.throw(
            _(
                "Cannot cancel timesheet. {0} days of TOIL (out of {1} days allocated) "
                "have already been consumed in approved leave applications. "
                "Please cancel the leave applications first before cancelling this timesheet."
            ).format(flt(consumed, 3), flt(allocated, 3)),
            frappe.ValidationError
        )

    # Log cancellation attempt for audit trail
    frappe.logger().info(
        f"Timesheet {doc.name} cancellation validated - no TOIL consumed"
    )


def enqueue_toil_allocation(doc, method):
    """
    Hook 4 (async wrapper): enqueue TOIL allocation creation after submit.

    This keeps Timesheet submit responsive while allocation is processed by
    a background worker.
    """
    if flt(doc.total_toil_hours) <= 0:
        return

    if doc.toil_allocation:
        return

    # Keep a predictable status while allocation processing is queued/running.
    doc.db_set('toil_status', TOILStatus.PENDING_ACCRUAL, update_modified=False)

    frappe.enqueue(
        "frappe_devsecops_dashboard.overrides.timesheet.create_toil_allocation_job",
        queue="default",
        timeout=300,
        enqueue_after_commit=True,
        timesheet_name=doc.name
    )

    frappe.logger().info(
        f"Queued TOIL allocation job for timesheet {doc.name}"
    )


def create_toil_allocation_job(timesheet_name: str):
    """
    Background job entrypoint for TOIL allocation generation.
    """
    doc = frappe.get_doc("Timesheet", timesheet_name)
    create_toil_allocation(doc, "on_submit")


def create_toil_allocation(doc, method):
    """
    Hook 4: Create Leave Allocation with compensating transaction.

    CRITICAL FIX: This hook creates a Leave Allocation for accrued TOIL
    with proper error handling and rollback. If allocation creation fails,
    the timesheet is rolled back to Draft status to prevent inconsistent state.

    Key features:
    - Transaction locking (FOR UPDATE) on Employee
    - Compensating transaction on failure
    - 6-month allocation validity
    - NO ignore_permissions=True
    - Detailed error logging

    Args:
        doc: Timesheet document (submitted)
        method: Event method name

    Raises:
        frappe.ValidationError: If allocation creation fails (after rollback)
    """
    # Skip if no TOIL hours
    if flt(doc.total_toil_hours) <= 0:
        return

    # Skip if allocation already exists
    if doc.toil_allocation:
        frappe.logger().info(
            f"Timesheet {doc.name} already has allocation {doc.toil_allocation}"
        )
        return

    try:
        # CRITICAL: Lock employee record to prevent concurrent operations
        if not lock_employee_for_update(doc.employee):
            frappe.throw(
                _("Failed to lock employee record. Please try again."),
                frappe.ValidationError
            )

        # Create Leave Allocation document
        allocation = frappe.get_doc({
            "doctype": "Leave Allocation",
            "employee": doc.employee,
            "leave_type": TOIL_LEAVE_TYPE,
            "from_date": getdate(),
            "to_date": add_months(getdate(), 6),  # 6-month validity
            "new_leaves_allocated": flt(doc.toil_days, 3),
            "description": f"TOIL from Timesheet {doc.name}",
            "source_timesheet": doc.name,
            "toil_hours": flt(doc.total_toil_hours, 2),
            "is_toil_allocation": 1
        })

        # Insert without ignore_permissions (respects user permissions)
        allocation.insert()
        allocation.submit()

        # Update timesheet with allocation reference
        doc.db_set('toil_allocation', allocation.name, update_modified=False)
        doc.db_set('toil_status', 'Accrued', update_modified=False)

        # Log success for audit trail
        frappe.logger().info(
            f"Created TOIL allocation {allocation.name} for timesheet {doc.name}: "
            f"{doc.toil_days} days ({doc.total_toil_hours} hours)"
        )

        # Avoid UI popups inside hooks/jobs; log for auditability instead.
        frappe.logger().info(
            f"TOIL Allocation created: {doc.toil_days} days ({doc.total_toil_hours} hours) for {doc.name}"
        )

    except Exception as e:
        # CRITICAL: Compensating transaction - rollback timesheet to Draft
        frappe.logger().error(
            f"Failed to create TOIL allocation for timesheet {doc.name}: {str(e)}"
        )

        try:
            # Rollback the entire transaction
            frappe.db.rollback()

            # Reset timesheet to Draft status
            frappe.db.sql("""
                UPDATE `tabTimesheet`
                SET docstatus = 0,
                    toil_status = 'Pending Accrual',
                    toil_allocation = NULL
                WHERE name = %s
            """, doc.name)

            frappe.db.commit()

            # Throw user-friendly error
            frappe.throw(
                _(
                    "Failed to create TOIL allocation: {0}. "
                    "Timesheet has been reverted to Draft status. "
                    f"Please verify the Leave Type '{TOIL_LEAVE_TYPE}' exists and try again."
                ).format(str(e)),
                frappe.ValidationError
            )

        except Exception as rollback_error:
            frappe.log_error(
                title="TOIL Allocation Rollback Failed",
                message=f"Timesheet: {doc.name}\nOriginal Error: {str(e)}\n"
                        f"Rollback Error: {str(rollback_error)}"
            )
            frappe.throw(
                _("Critical error during TOIL allocation. Please contact system administrator."),
                frappe.ValidationError
            )


def cancel_toil_allocation(doc, method):
    """
    Hook 5: Reverse TOIL allocation when timesheet is cancelled.

    This hook cancels the associated Leave Allocation when a timesheet
    is cancelled. It should only be called after before_cancel_timesheet
    has verified that no TOIL has been consumed.

    Args:
        doc: Timesheet document (being cancelled)
        method: Event method name
    """
    # Skip if no allocation exists
    if not doc.toil_allocation:
        return

    try:
        # Get the allocation document
        allocation = frappe.get_doc("Leave Allocation", doc.toil_allocation)

        # Verify allocation is submitted before cancelling
        if allocation.docstatus == 1:
            allocation.cancel()

            # Update timesheet status
            doc.db_set('toil_status', 'Cancelled', update_modified=False)

            # Log cancellation for audit trail
            frappe.logger().info(
                f"Cancelled TOIL allocation {allocation.name} for timesheet {doc.name}"
            )

            # Show success message
            frappe.msgprint(
                _("TOIL Allocation {0} has been cancelled").format(allocation.name),
                title=_("TOIL Cancelled"),
                indicator="orange"
            )

    except frappe.DoesNotExistError:
        # Allocation already deleted - just update timesheet
        doc.db_set('toil_status', 'Cancelled', update_modified=False)
        frappe.logger().warning(
            f"TOIL allocation {doc.toil_allocation} not found for timesheet {doc.name}"
        )

    except Exception as e:
        frappe.log_error(
            title="TOIL Allocation Cancellation Failed",
            message=f"Timesheet: {doc.name}\nAllocation: {doc.toil_allocation}\nError: {str(e)}"
        )
        # Don't block timesheet cancellation if allocation cancellation fails
        frappe.msgprint(
            _("Warning: Failed to cancel TOIL allocation: {0}").format(str(e)),
            title=_("TOIL Cancellation Warning"),
            indicator="orange"
        )


def recalculate_toil(doc, method):
    """
    Hook 6: Recalculate TOIL hours when time logs are modified.

    This hook is called when the timesheet is saved (before validate)
    to ensure TOIL calculations are always up-to-date when time logs
    are added, modified, or removed.

    Note: This runs on both draft and submitted timesheets, but only
    recalculates for draft timesheets (submitted ones are locked).

    Args:
        doc: Timesheet document
        method: Event method name
    """
    # Only recalculate for draft timesheets
    if doc.docstatus != 0:
        return

    # Recalculate TOIL hours
    toil_hours = calculate_toil_hours(doc)
    toil_days = calculate_toil_days(toil_hours)

    # Update fields if changed
    if doc.total_toil_hours != toil_hours or doc.toil_days != toil_days:
        doc.total_toil_hours = toil_hours
        doc.toil_days = toil_days

        # Log recalculation for debugging
        frappe.logger().debug(
            f"Recalculated TOIL for timesheet {doc.name}: "
            f"{toil_hours} hours = {toil_days} days"
        )


# Helper function to check if TOIL fields exist on Timesheet
def validate_toil_fields(doc):
    """
    Validate that required TOIL custom fields exist on Timesheet.

    This is called during initialization to ensure the custom fields
    have been added to the Timesheet DocType.

    Returns:
        bool: True if all fields exist, False otherwise
    """
    required_fields = [
        'total_toil_hours',
        'toil_days',
        'toil_status',
        'toil_allocation'
    ]

    meta = frappe.get_meta("Timesheet")
    existing_fields = {field.fieldname for field in meta.fields}

    missing_fields = [f for f in required_fields if f not in existing_fields]

    if missing_fields:
        frappe.log_error(
            title="TOIL Fields Missing",
            message=f"Timesheet DocType is missing TOIL fields: {', '.join(missing_fields)}"
        )
        return False

    return True
