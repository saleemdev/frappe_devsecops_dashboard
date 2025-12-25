"""
Change Request Email Notification System
Sends approval request emails to approvers with proper tracking and error handling
"""

import frappe
from frappe import _
from frappe.utils import get_url
from typing import Dict, List, Any


def send_approval_notifications(change_request_name: str) -> Dict[str, Any]:
    """
    Send email notifications to approvers who haven't received one yet
    This function is called via frappe.enqueue to run asynchronously

    Args:
        change_request_name: The Change Request ID (e.g., CR-25-00001)

    Returns:
        Dict with success status and counts
    """
    try:
        frappe.logger().info(f"[CR Notification] Starting send_approval_notifications for {change_request_name}")

        # Get the Change Request document
        doc = frappe.get_doc('Change Request', change_request_name)
        frappe.logger().info(
            f"[CR Notification] Loaded CR document: {change_request_name}, "
            f"Total approvers: {len(doc.change_approvers)}"
        )

        sent_count = 0
        failed_count = 0
        failed_users = []

        # Get approvers who haven't received notification
        for idx, approver in enumerate(doc.change_approvers):
            frappe.logger().info(
                f"[CR Notification] Processing approver {idx + 1}/{len(doc.change_approvers)}: "
                f"user={approver.user}, notification_sent={approver.get('notification_sent')}"
            )
            # Skip if notification already sent
            if approver.get('notification_sent'):
                frappe.logger().info(
                    f"[CR Notification] Skipping {approver.user} - notification already sent"
                )
                continue

            # Skip if no user email
            if not approver.user:
                error_msg = f"No user specified for approver in {change_request_name}"
                frappe.logger().error(f"[CR Notification] {error_msg}")
                frappe.log_error(error_msg, "Change Request Notification")
                failed_count += 1
                continue

            try:
                frappe.logger().info(f"[CR Notification] Fetching user details for {approver.user}")

                # Get user details
                user_doc = frappe.get_doc('User', approver.user)
                user_email = user_doc.email
                user_full_name = user_doc.full_name or approver.user

                frappe.logger().info(
                    f"[CR Notification] User details - Email: {user_email}, Name: {user_full_name}"
                )

                if not user_email:
                    error_msg = f"No email found for user {approver.user} in {change_request_name}"
                    frappe.logger().error(f"[CR Notification] {error_msg}")
                    frappe.log_error(error_msg, "Change Request Notification")
                    failed_count += 1
                    failed_users.append(approver.user)
                    continue

                frappe.logger().info(
                    f"[CR Notification] Sending email to {user_email} for CR {change_request_name}"
                )

                # Send the email
                send_approval_request_email(
                    change_request_doc=doc,
                    approver=approver,
                    user_email=user_email,
                    user_full_name=user_full_name
                )

                # Mark notification as sent (update the specific child table row)
                approver.notification_sent = 1
                sent_count += 1

                frappe.logger().info(
                    f"[CR Notification] ✓ Successfully sent email to {user_email} for {change_request_name}"
                )

            except Exception as e:
                error_msg = f"Failed to send email to {approver.user} for {change_request_name}: {str(e)}"
                frappe.logger().error(f"[CR Notification] ✗ {error_msg}")
                frappe.log_error(error_msg, "Change Request Notification")
                failed_count += 1
                failed_users.append(approver.user)
                continue

        # Save the document to persist notification_sent flags
        # Use flags.ignore_permissions to avoid permission issues in background job
        if sent_count > 0:
            frappe.logger().info(
                f"[CR Notification] Saving document with {sent_count} updated notification flags"
            )
            try:
                doc.flags.ignore_permissions = True
                doc.save()
                frappe.db.commit()
                frappe.logger().info(
                    f"[CR Notification] ✓ Document saved and committed successfully"
                )
            except Exception as save_error:
                frappe.logger().error(
                    f"[CR Notification] ✗ Failed to save document: {str(save_error)}"
                )
                frappe.log_error(
                    f"Failed to save notification flags for {change_request_name}: {str(save_error)}",
                    "Change Request Notification"
                )
                # Don't fail the entire job, emails were sent

        result = {
            'success': True,
            'sent_count': sent_count,
            'failed_count': failed_count,
            'failed_users': failed_users
        }

        frappe.logger().info(
            f"[CR Notification] ═══ COMPLETED for {change_request_name} ═══\n"
            f"  ✓ Emails sent: {sent_count}\n"
            f"  ✗ Emails failed: {failed_count}\n"
            f"  Failed users: {', '.join(failed_users) if failed_users else 'None'}"
        )

        return result

    except Exception as e:
        error_msg = f"Error in send_approval_notifications for {change_request_name}: {str(e)}"
        frappe.logger().error(f"[CR Notification] ✗✗✗ CRITICAL ERROR: {error_msg}")
        frappe.log_error(error_msg, "Change Request Notification")
        import traceback
        frappe.logger().error(f"[CR Notification] Stack trace:\n{traceback.format_exc()}")
        return {
            'success': False,
            'error': str(e),
            'sent_count': 0,
            'failed_count': 0
        }


def send_approval_request_email(
    change_request_doc,
    approver,
    user_email: str,
    user_full_name: str
) -> None:
    """
    Send a beautifully formatted approval request email to an approver

    Args:
        change_request_doc: The Change Request document
        approver: The approver child table row
        user_email: Email address of the approver
        user_full_name: Full name of the approver
    """
    frappe.logger().info(
        f"[CR Email] Preparing email for CR {change_request_doc.name} to {user_email}"
    )

    # Get the Change Request URL - Updated to use frontend detail view
    cr_url = get_url(f"/devsecops-ui#change-requests/detail/{change_request_doc.name}")
    frappe.logger().info(f"[CR Email] CR URL: {cr_url}")

    # Prepare email data
    subject = f"Approval Request: {change_request_doc.title or change_request_doc.name}"
    frappe.logger().info(f"[CR Email] Email subject: {subject}")

    # Create email body with simple flat design following Gestalt principles
    frappe.logger().info(f"[CR Email] Generating email template...")
    email_body = get_approval_email_template(
        change_request_doc=change_request_doc,
        approver=approver,
        user_full_name=user_full_name,
        cr_url=cr_url
    )
    frappe.logger().info(f"[CR Email] Email template generated, length: {len(email_body)} chars")

    # Send email using Frappe's email queue
    frappe.logger().info(f"[CR Email] Calling frappe.sendmail...")
    try:
        frappe.sendmail(
            recipients=[user_email],
            subject=subject,
            message=email_body,
            delayed=False,  # Send immediately
            reference_doctype='Change Request',
            reference_name=change_request_doc.name,
            unsubscribe_message=_("You are receiving this because you are an approver for this Change Request")
        )
        frappe.logger().info(
            f"[CR Email] ✓ frappe.sendmail completed successfully for {user_email}"
        )
    except Exception as email_error:
        frappe.logger().error(
            f"[CR Email] ✗ frappe.sendmail failed for {user_email}: {str(email_error)}"
        )
        raise  # Re-raise to be caught by caller


def get_approval_email_template(
    change_request_doc,
    approver,
    user_full_name: str,
    cr_url: str
) -> str:
    """
    Generate HTML email template using Gestalt principles with flat design

    Gestalt Principles Applied:
    - Proximity: Related information grouped together
    - Similarity: Consistent styling for similar elements
    - Closure: Clear visual boundaries with containers
    - Figure/Ground: Clear separation between content and background
    - Common Fate: Action buttons visually connected to their purpose

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
    originator_name = change_request_doc.originator_name or 'Not specified'
    business_function = approver.business_function or 'Not specified'
    description = change_request_doc.detailed_description or 'No description provided'

    # Truncate description if too long
    if len(description) > 300:
        description = description[:300] + '...'

    # Format implementation date
    implementation_date = 'Not scheduled'
    if change_request_doc.implementation_date:
        implementation_date = frappe.utils.formatdate(
            change_request_doc.implementation_date,
            "MMM dd, yyyy"
        )

    # Build HTML email with flat design
    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Change Request Approval</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
        <!-- Container -->
        <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="background-color: #f5f5f5;">
            <tr>
                <td style="padding: 40px 20px;">
                    <!-- Email Card -->
                    <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);">

                        <!-- Header -->
                        <tr>
                            <td style="padding: 32px 32px 24px 32px; background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); border-radius: 8px 8px 0 0;">
                                <h1 style="margin: 0; font-size: 24px; font-weight: 600; color: #ffffff; line-height: 1.3;">
                                    Approval Request
                                </h1>
                                <p style="margin: 8px 0 0 0; font-size: 14px; color: rgba(255, 255, 255, 0.9);">
                                    Your approval is required for a Change Request
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
                                    A Change Request has been submitted and requires your approval as <strong>{business_function}</strong>.
                                </p>
                            </td>
                        </tr>

                        <!-- Change Request Details -->
                        <tr>
                            <td style="padding: 24px 32px;">
                                <!-- CR Number Badge -->
                                <div style="display: inline-block; background-color: #e6f7ff; padding: 6px 12px; border-radius: 4px; margin-bottom: 16px;">
                                    <span style="font-size: 13px; font-weight: 600; color: #0050b3;">
                                        {cr_number}
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
                                            <span style="font-size: 13px; color: #8c8c8c; display: block; margin-bottom: 4px;">System Affected</span>
                                            <span style="font-size: 14px; color: #262626; font-weight: 500;">{system_affected}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                                            <span style="font-size: 13px; color: #8c8c8c; display: block; margin-bottom: 4px;">Originator</span>
                                            <span style="font-size: 14px; color: #262626; font-weight: 500;">{originator_name}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0; border-bottom: 1px solid #f0f0f0;">
                                            <span style="font-size: 13px; color: #8c8c8c; display: block; margin-bottom: 4px;">Implementation Date</span>
                                            <span style="font-size: 14px; color: #262626; font-weight: 500;">{implementation_date}</span>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 12px 0;">
                                            <span style="font-size: 13px; color: #8c8c8c; display: block; margin-bottom: 4px;">Description</span>
                                            <div style="font-size: 14px; color: #595959; line-height: 1.6;">
                                                {description}
                                            </div>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Action Button -->
                        <tr>
                            <td style="padding: 0 32px 32px 32px;">
                                <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%">
                                    <tr>
                                        <td style="text-align: center; padding: 24px 0 0 0;">
                                            <a href="{cr_url}" style="display: inline-block; padding: 14px 32px; background-color: #1890ff; color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(24, 144, 255, 0.3); transition: background-color 0.2s;">
                                                Review & Approve Change Request
                                            </a>
                                        </td>
                                    </tr>
                                    <tr>
                                        <td style="text-align: center; padding: 12px 0 0 0;">
                                            <p style="margin: 0; font-size: 12px; color: #8c8c8c;">
                                                Or copy this link: <a href="{cr_url}" style="color: #1890ff; text-decoration: none;">{cr_url}</a>
                                            </p>
                                        </td>
                                    </tr>
                                </table>
                            </td>
                        </tr>

                        <!-- Footer -->
                        <tr>
                            <td style="padding: 24px 32px; background-color: #fafafa; border-radius: 0 0 8px 8px; border-top: 1px solid #f0f0f0;">
                                <p style="margin: 0; font-size: 12px; color: #8c8c8c; line-height: 1.6; text-align: center;">
                                    This is an automated notification from the DevSecOps Dashboard.<br>
                                    Please do not reply to this email.
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
