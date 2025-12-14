"""
Change Request Approval Reminder System
Sends reminder emails to approvers who haven't responded within 4 hours
"""

import frappe
from frappe import _
from frappe.utils import get_url, now_datetime, add_to_date, get_datetime
from typing import Dict, List, Any


def send_approval_reminders():
    """
    Scheduled job to send reminder emails to approvers who haven't responded
    Runs every 4 hours and checks for pending approvals older than 4 hours

    This function is called by the scheduler defined in hooks.py
    """
    try:
        frappe.logger().info("[CR Reminder] Starting approval reminder job")

        # Get all Change Requests with pending approvals
        # Only get those that are not in final states
        change_requests = frappe.get_all(
            'Change Request',
            filters={
                'approval_status': ['in', ['Pending Review', 'Rework']],
                'docstatus': ['<', 2]  # Not cancelled
            },
            fields=['name', 'title', 'creation', 'modified']
        )

        frappe.logger().info(
            f"[CR Reminder] Found {len(change_requests)} Change Requests with pending approvals"
        )

        total_reminders_sent = 0

        for cr in change_requests:
            try:
                # Get the full document
                doc = frappe.get_doc('Change Request', cr.name)

                # Check each approver
                for approver in doc.change_approvers:
                    # Only send reminder if:
                    # 1. Approval is pending
                    # 2. Notification was sent (so they know about it)
                    # 3. No reminder sent yet OR last reminder was > 24 hours ago
                    # 4. It's been at least 4 hours since notification

                    if approver.approval_status != 'Pending':
                        continue  # Already approved/rejected

                    if not approver.get('notification_sent'):
                        continue  # Haven't sent initial notification yet

                    # Check if it's been 4+ hours since document creation/modification
                    time_threshold = add_to_date(now_datetime(), hours=-4)
                    doc_time = get_datetime(doc.modified)

                    if doc_time > time_threshold:
                        continue  # Not yet 4 hours old

                    # Check if reminder already sent recently
                    if approver.get('last_reminder_sent'):
                        last_reminder = get_datetime(approver.last_reminder_sent)
                        reminder_threshold = add_to_date(now_datetime(), hours=-24)

                        if last_reminder > reminder_threshold:
                            frappe.logger().info(
                                f"[CR Reminder] Skipping {approver.user} for {doc.name} - "
                                f"reminder sent recently"
                            )
                            continue  # Sent reminder within last 24 hours

                    # Send the reminder
                    try:
                        send_reminder_email(doc, approver)

                        # Update last reminder timestamp
                        approver.last_reminder_sent = now_datetime()
                        total_reminders_sent += 1

                        frappe.logger().info(
                            f"[CR Reminder] ✓ Sent reminder to {approver.user} for {doc.name}"
                        )
                    except Exception as e:
                        frappe.logger().error(
                            f"[CR Reminder] ✗ Failed to send reminder to {approver.user} "
                            f"for {doc.name}: {str(e)}"
                        )
                        frappe.log_error(
                            f"Failed to send reminder to {approver.user} for {doc.name}: {str(e)}",
                            "Change Request Reminder"
                        )

                # Save document if reminders were sent
                if any(approver.get('last_reminder_sent') for approver in doc.change_approvers):
                    doc.flags.ignore_permissions = True
                    doc.save()
                    frappe.db.commit()

            except Exception as e:
                frappe.logger().error(
                    f"[CR Reminder] Error processing {cr.name}: {str(e)}"
                )
                frappe.log_error(
                    f"Error processing reminders for {cr.name}: {str(e)}",
                    "Change Request Reminder"
                )
                continue

        frappe.logger().info(
            f"[CR Reminder] ═══ JOB COMPLETED ═══\n"
            f"  Total reminders sent: {total_reminders_sent}"
        )

    except Exception as e:
        frappe.logger().error(f"[CR Reminder] ✗✗✗ CRITICAL ERROR: {str(e)}")
        frappe.log_error(str(e), "Change Request Reminder Job")


def send_reminder_email(change_request_doc, approver):
    """
    Send a professional reminder email to an approver

    Args:
        change_request_doc: The Change Request document
        approver: The approver child table row
    """
    try:
        # Get user details
        user_doc = frappe.get_doc('User', approver.user)
        user_email = user_doc.email
        user_full_name = user_doc.full_name or approver.user

        if not user_email:
            frappe.logger().warning(
                f"[CR Reminder] No email for user {approver.user}"
            )
            return

        # Get the Change Request URL
        cr_url = get_url(
            f"/app/frappe-devsecops-dashboard/change-requests/{change_request_doc.name}"
        )

        # Prepare email
        subject = f"⏰ Reminder: Pending Approval - {change_request_doc.title or change_request_doc.name}"

        email_body = get_reminder_email_template(
            change_request_doc=change_request_doc,
            approver=approver,
            user_full_name=user_full_name,
            cr_url=cr_url
        )

        # Send email
        frappe.sendmail(
            recipients=[user_email],
            subject=subject,
            message=email_body,
            delayed=False,
            reference_doctype='Change Request',
            reference_name=change_request_doc.name,
            unsubscribe_message=_(
                "You are receiving this reminder because you have a pending approval"
            )
        )

        frappe.logger().info(
            f"[CR Reminder] ✓ Reminder email sent to {user_email}"
        )

    except Exception as e:
        frappe.logger().error(
            f"[CR Reminder] ✗ Failed to send reminder email: {str(e)}"
        )
        raise


def get_reminder_email_template(
    change_request_doc,
    approver,
    user_full_name: str,
    cr_url: str
) -> str:
    """
    Generate professional reminder email template with subtle icons

    Args:
        change_request_doc: The Change Request document
        approver: The approver child table row
        user_full_name: Full name of the approver
        cr_url: URL to the Change Request

    Returns:
        HTML email content
    """
    # Prepare data
    cr_number = change_request_doc.name
    cr_title = change_request_doc.title or 'Untitled Change Request'
    system_affected = change_request_doc.system_affected or 'Not specified'
    business_function = approver.business_function or 'Not specified'

    # Calculate time pending
    from frappe.utils import time_diff_in_hours, get_datetime
    hours_pending = int(time_diff_in_hours(now_datetime(), get_datetime(change_request_doc.modified)))

    # Build HTML email
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Approval Reminder</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <!-- Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
                <td style="padding: 40px 20px;">
                    <!-- Email Card -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

                        <!-- Header with Clock Icon -->
                        <tr>
                            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #faad14 0%, #fa8c16 100%); border-radius: 8px 8px 0 0; text-align: center;">
                                <!-- Clock Icon -->
                                <div style="display: inline-block; width: 64px; height: 64px; background-color: rgba(255, 255, 255, 0.2); border-radius: 50%; margin-bottom: 16px; padding: 16px;">
                                    <div style="font-size: 32px; line-height: 32px;">⏰</div>
                                </div>
                                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff; line-height: 1.3;">
                                    Approval Reminder
                                </h1>
                                <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
                                    Your approval is still pending
                                </p>
                            </td>
                        </tr>

                        <!-- Greeting -->
                        <tr>
                            <td style="padding: 24px 32px 0 32px;">
                                <p style="margin: 0; font-size: 16px; color: #262626; line-height: 1.6;">
                                    Hello <strong>{user_full_name}</strong>,
                                </p>
                                <p style="margin: 12px 0 0 0; font-size: 14px; color: #595959; line-height: 1.6;">
                                    This is a friendly reminder that you have a pending approval request that requires your attention.
                                </p>
                            </td>
                        </tr>

                        <!-- Time Pending Alert -->
                        <tr>
                            <td style="padding: 16px 32px;">
                                <div style="background-color: #fff7e6; border-left: 4px solid #faad14; padding: 12px 16px; border-radius: 4px;">
                                    <div style="display: flex; align-items: center; gap: 8px;">
                                        <span style="font-size: 16px;">⏳</span>
                                        <span style="font-size: 13px; color: #d46b08; font-weight: 500;">
                                            Pending for <strong>{hours_pending} hours</strong>
                                        </span>
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <!-- Change Request Details -->
                        <tr>
                            <td style="padding: 8px 32px 24px 32px;">
                                <!-- CR Number Badge -->
                                <div style="display: inline-block; background-color: #e6f7ff; padding: 6px 12px; border-radius: 4px; margin-bottom: 16px;">
                                    <span style="font-size: 13px; font-weight: 600; color: #0050b3;">
                                        📋 {cr_number}
                                    </span>
                                </div>

                                <!-- Title -->
                                <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #262626; line-height: 1.4;">
                                    {cr_title}
                                </h2>

                                <!-- Details Table -->
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin: 0; border-collapse: collapse;">
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <span style="font-size: 14px;">🎯</span>
                                                <div style="flex: 1;">
                                                    <span style="font-size: 12px; color: #8c8c8c; display: block; margin-bottom: 4px;">System Affected</span>
                                                    <span style="font-size: 14px; color: #262626; font-weight: 500;">{system_affected}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                                            <div style="display: flex; align-items: center; gap: 8px;">
                                                <span style="font-size: 14px;">👤</span>
                                                <div style="flex: 1;">
                                                    <span style="font-size: 12px; color: #8c8c8c; display: block; margin-bottom: 4px;">Your Role</span>
                                                    <span style="font-size: 14px; color: #262626; font-weight: 500;">{business_function}</span>
                                                </div>
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Quick Actions -->
                        <tr>
                            <td style="padding: 0 32px 32px 32px;">
                                <div style="background-color: #f5f5f5; padding: 20px; border-radius: 8px; text-align: center;">
                                    <p style="margin: 0 0 16px 0; font-size: 13px; color: #595959;">
                                        ⚡ Quick Actions Available
                                    </p>

                                    <!-- Primary Action Button -->
                                    <a href="{cr_url}" style="display: inline-block; padding: 14px 32px; background-color: #faad14; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(250, 173, 20, 0.3); margin-bottom: 12px;">
                                        ✓ Review & Take Action
                                    </a>

                                    <div style="margin-top: 12px;">
                                        <p style="margin: 0; font-size: 11px; color: #8c8c8c;">
                                            Or copy this link: <a href="{cr_url}" style="color: #faad14; text-decoration: none; word-break: break-all;">{cr_url}</a>
                                        </p>
                                    </div>
                                </div>
                            </td>
                        </tr>

                        <!-- Why This Matters -->
                        <tr>
                            <td style="padding: 0 32px 24px 32px;">
                                <div style="border-left: 3px solid #1890ff; padding-left: 16px;">
                                    <p style="margin: 0; font-size: 12px; color: #8c8c8c; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 8px;">
                                        💡 Why This Matters
                                    </p>
                                    <p style="margin: 0; font-size: 13px; color: #595959; line-height: 1.6;">
                                        Your approval is required to proceed with this change. Delayed approvals may impact project timelines and deliverables.
                                    </p>
                                </div>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 8px 8px; border-top: 1px solid #f0f0f0;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center;">
                                            <p style="margin: 0; font-size: 12px; color: #8c8c8c; line-height: 1.6;">
                                                🤖 This is an automated reminder from the DevSecOps Dashboard.<br>
                                                You're receiving this because your approval is pending for more than 4 hours.<br>
                                                Please do not reply to this email.
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>
                    </table>

                    <!-- Additional Info -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 16px auto 0 auto;">
                        <tr>
                            <td style="text-align: center; padding: 0 20px;">
                                <p style="margin: 0; font-size: 11px; color: #999999; line-height: 1.5;">
                                    💬 Need help? Contact your project administrator.<br>
                                    📧 To stop receiving reminders, please approve or reject the request.
                                </p>
                            </td>
                        </tr>
                    </table>
                </td>
            </tr>
        </table>
    </body>
    </html>
    """

    return html
