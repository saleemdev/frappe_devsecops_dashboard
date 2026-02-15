"""
TOIL System - Scheduled Tasks for Expiry Management

This module contains scheduled tasks for managing TOIL expiry:
1. expire_toil_allocations - Mark expired TOIL (rolling 6-month, not fiscal year)
2. send_expiry_reminders - Email employees about expiring TOIL (< 30 days)

CRITICAL: Uses custom rolling 6-month expiry logic, NOT ERPNext's fiscal year logic

Reference: Plan lines 492-545
Scheduled in hooks.py:
  - expire_toil_allocations: Daily
  - send_expiry_reminders: Weekly
"""

import frappe
from frappe import _
from frappe.utils import getdate, add_months, add_days, formatdate, get_url


def expire_toil_allocations():
    """
    Mark TOIL allocations as expired after 6 months from allocation date

    CRITICAL FIX: Custom expiry logic using rolling 6-month window
    NOT based on ERPNext fiscal year

    Runs: Daily (scheduled in hooks.py)

    Returns:
        int: Number of allocations expired
    """
    try:
        # Calculate expiry date: 6 months ago from today
        six_months_ago = add_months(getdate(), -6)

        # Mark Leave Ledger Entries as expired for TOIL allocations older than 6 months
        expired_count = frappe.db.sql("""
            UPDATE `tabLeave Ledger Entry` lle
            INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
            SET lle.is_expired = 1
            WHERE la.is_toil_allocation = 1
            AND la.from_date <= %s
            AND la.docstatus = 1
            AND lle.is_expired = 0
            AND lle.docstatus = 1
        """, six_months_ago)

        # Commit the changes
        frappe.db.commit()

        # Log the operation
        if expired_count:
            frappe.logger().info(
                f"TOIL Expiry Task: Expired {expired_count} TOIL allocation(s) older than {formatdate(six_months_ago)}"
            )
        else:
            frappe.logger().debug(
                f"TOIL Expiry Task: No TOIL allocations to expire (cutoff date: {formatdate(six_months_ago)})"
            )

        return expired_count

    except Exception as e:
        frappe.log_error(
            title="TOIL Expiry Task Failed",
            message=f"Error expiring TOIL allocations: {str(e)}"
        )
        frappe.logger().error(f"TOIL Expiry Task Error: {str(e)}")
        return 0


def send_expiry_reminders():
    """
    Email employees with TOIL expiring within 30 days

    Includes:
    - Amount of TOIL expiring
    - Expiry date
    - Current total balance
    - Link to request TOIL leave

    Runs: Weekly (scheduled in hooks.py)

    Returns:
        int: Number of reminder emails sent
    """
    try:
        thirty_days_out = add_days(getdate(), 30)
        today = getdate()

        # Get employees with TOIL expiring within 30 days
        expiring = frappe.db.sql("""
            SELECT
                la.employee,
                la.employee_name,
                SUM(lle.leaves) as expiring_balance,
                MIN(la.to_date) as earliest_expiry_date,
                COUNT(DISTINCT la.name) as allocation_count
            FROM `tabLeave Ledger Entry` lle
            INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
            WHERE la.is_toil_allocation = 1
            AND la.to_date <= %s
            AND la.to_date >= %s
            AND la.docstatus = 1
            AND lle.is_expired = 0
            AND lle.docstatus = 1
            GROUP BY la.employee, la.employee_name
            HAVING expiring_balance > 0
            ORDER BY earliest_expiry_date ASC
        """, (thirty_days_out, today), as_dict=1)

        email_count = 0

        # Send email to each employee with expiring TOIL
        for record in expiring:
            try:
                # Get employee's email
                employee_email = frappe.db.get_value("Employee", record.employee, "user_id")

                if not employee_email:
                    frappe.logger().warning(
                        f"TOIL Expiry Reminder: No email found for employee {record.employee}"
                    )
                    continue

                # Get detailed expiring allocations for this employee
                allocations_detail = frappe.db.sql("""
                    SELECT
                        la.name,
                        la.from_date,
                        la.to_date,
                        la.source_timesheet,
                        SUM(lle.leaves) as balance
                    FROM `tabLeave Ledger Entry` lle
                    INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
                    WHERE la.employee = %s
                    AND la.is_toil_allocation = 1
                    AND la.to_date <= %s
                    AND la.to_date >= %s
                    AND la.docstatus = 1
                    AND lle.is_expired = 0
                    AND lle.docstatus = 1
                    GROUP BY la.name, la.from_date, la.to_date, la.source_timesheet
                    HAVING balance > 0
                    ORDER BY la.to_date ASC
                """, (record.employee, thirty_days_out, today), as_dict=1)

                # Get total current balance
                total_balance = get_employee_toil_balance(record.employee)

                # Send email
                send_expiry_email(
                    employee=record.employee,
                    employee_name=record.employee_name,
                    employee_email=employee_email,
                    expiring_balance=record.expiring_balance,
                    earliest_expiry_date=record.earliest_expiry_date,
                    allocation_count=record.allocation_count,
                    total_balance=total_balance,
                    allocations_detail=allocations_detail
                )

                email_count += 1

            except Exception as e:
                frappe.log_error(
                    title=f"TOIL Expiry Reminder Failed: {record.employee}",
                    message=f"Error sending reminder to {record.employee}: {str(e)}"
                )
                frappe.logger().error(
                    f"Failed to send TOIL expiry reminder to {record.employee}: {str(e)}"
                )

        # Log summary
        if email_count > 0:
            frappe.logger().info(
                f"TOIL Expiry Reminders: Sent {email_count} reminder email(s)"
            )
        else:
            frappe.logger().debug(
                "TOIL Expiry Reminders: No employees with expiring TOIL"
            )

        return email_count

    except Exception as e:
        frappe.log_error(
            title="TOIL Expiry Reminder Task Failed",
            message=f"Error sending TOIL expiry reminders: {str(e)}"
        )
        frappe.logger().error(f"TOIL Expiry Reminder Task Error: {str(e)}")
        return 0


# ============================================================================
# Helper Functions
# ============================================================================

def send_expiry_email(employee, employee_name, employee_email, expiring_balance,
                     earliest_expiry_date, allocation_count, total_balance, allocations_detail):
    """
    Send TOIL expiry reminder email to employee

    Args:
        employee (str): Employee ID
        employee_name (str): Employee name
        employee_email (str): Employee email address
        expiring_balance (float): Days of TOIL expiring
        earliest_expiry_date (date): Earliest expiry date
        allocation_count (int): Number of allocations expiring
        total_balance (float): Total current TOIL balance
        allocations_detail (list): Detailed allocation information
    """
    # Calculate days until expiry
    days_until_expiry = (getdate(earliest_expiry_date) - getdate()).days

    # Build allocation details HTML
    allocations_html = ""
    for alloc in allocations_detail:
        allocations_html += f"""
        <tr>
            <td style="padding: 8px; border: 1px solid #ddd;">{formatdate(alloc.to_date)}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{alloc.balance:.2f} days</td>
            <td style="padding: 8px; border: 1px solid #ddd;">{alloc.source_timesheet or 'N/A'}</td>
        </tr>
        """

    # Email subject
    subject = _("TOIL Expiry Reminder: {0} days expiring soon").format(expiring_balance)

    # Email message
    message = f"""
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #FF6B35;">TOIL Expiry Reminder</h2>

        <p>Dear {employee_name},</p>

        <p>This is a reminder that some of your Time Off in Lieu (TOIL) balance is expiring soon.</p>

        <div style="background-color: #FFF3CD; border-left: 4px solid #FF6B35; padding: 15px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #856404;">Summary</h3>
            <ul style="list-style: none; padding: 0;">
                <li><strong>Expiring Balance:</strong> {expiring_balance:.2f} days</li>
                <li><strong>Earliest Expiry:</strong> {formatdate(earliest_expiry_date)} ({days_until_expiry} days from now)</li>
                <li><strong>Current Total Balance:</strong> {total_balance:.2f} days</li>
                <li><strong>Allocations Expiring:</strong> {allocation_count}</li>
            </ul>
        </div>

        <h3>Expiring Allocations</h3>
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
            <thead>
                <tr style="background-color: #f8f9fa;">
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Expiry Date</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Balance</th>
                    <th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Source Timesheet</th>
                </tr>
            </thead>
            <tbody>
                {allocations_html}
            </tbody>
        </table>

        <p><strong>Action Required:</strong> Please submit a leave application to use your expiring TOIL before {formatdate(earliest_expiry_date)}.</p>

        <p style="margin-top: 30px;">
            <a href="{get_url()}/app/leave-application/new"
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 4px; display: inline-block;">
                Request TOIL Leave
            </a>
        </p>

        <p style="margin-top: 30px; color: #6c757d; font-size: 12px;">
            <em>Note: TOIL expires 6 months after the allocation date. Expired TOIL cannot be recovered.</em>
        </p>

        <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">

        <p style="color: #6c757d; font-size: 11px;">
            This is an automated reminder from the TOIL Management System.
            If you have questions, please contact your supervisor or HR department.
        </p>
    </div>
    """

    # Send email
    frappe.sendmail(
        recipients=[employee_email],
        subject=subject,
        message=message,
        delayed=False,
        reference_doctype="Employee",
        reference_name=employee
    )

    frappe.logger().info(
        f"TOIL expiry reminder sent to {employee_name} ({employee_email}): "
        f"{expiring_balance:.2f} days expiring on {formatdate(earliest_expiry_date)}"
    )


def get_employee_toil_balance(employee):
    """
    Get total current TOIL balance for an employee

    Args:
        employee (str): Employee ID

    Returns:
        float: Total TOIL balance in days
    """
    balance = frappe.db.sql("""
        SELECT SUM(lle.leaves) as balance
        FROM `tabLeave Ledger Entry` lle
        INNER JOIN `tabLeave Allocation` la ON lle.transaction_name = la.name
        WHERE lle.employee = %s
        AND lle.leave_type = 'Time Off in Lieu'
        AND lle.docstatus = 1
        AND lle.is_expired = 0
        AND la.is_toil_allocation = 1
    """, employee, as_dict=1)

    return frappe.utils.flt(balance[0].balance) if balance else 0
