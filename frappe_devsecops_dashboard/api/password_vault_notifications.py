"""
Password Vault Email Notification System
Sends share notifications with proper tracking and error handling
"""

import frappe
from frappe import _
from frappe.utils import get_url
from typing import Dict, List, Any


def send_share_notifications(password_entry_name: str, emails: List[str], description: str = "") -> Dict[str, Any]:
	"""
	Send email notifications to users who received share access

	Args:
		password_entry_name: The Password Vault Entry ID
		emails: List of email addresses to notify
		description: Optional description from the sharer

	Returns:
		Dict with success status and counts
	"""
	try:
		frappe.logger().info(f"[PV Notification] Starting share notifications for {password_entry_name}")

		# Determine doctype (prefer DevSecOps Password if exists)
		from frappe_devsecops_dashboard.api.password_vault import _get_doctype_name
		doctype_name = _get_doctype_name()

		# Get the password entry document
		doc = frappe.get_doc(doctype_name, password_entry_name)
		frappe.logger().info(f"[PV Notification] Loaded document: {password_entry_name}")

		sent_count = 0
		failed_count = 0
		failed_emails = []

		# Get sharer info
		sharer_name = doc.created_by_user
		try:
			if frappe.db.exists("User", doc.created_by_user):
				sharer = frappe.get_doc("User", doc.created_by_user)
				sharer_name = sharer.full_name or doc.created_by_user
		except Exception:
			# If we can't get sharer info, just use the email
			pass

		for email in emails:
			try:
				frappe.logger().info(f"[PV Notification] Sending to {email}")

				# Get recipient name
				recipient_name = email
				if frappe.db.exists("User", email):
					user_doc = frappe.get_doc("User", email)
					recipient_name = user_doc.full_name or email

				# Send email
				send_share_email(
					password_entry_doc=doc,
					recipient_email=email,
					recipient_name=recipient_name,
					sharer_name=sharer_name,
					description=description
				)

				sent_count += 1
				frappe.logger().info(f"[PV Notification] ✓ Sent to {email}")

			except Exception as e:
				error_msg = f"Failed to send email to {email}: {str(e)}"
				frappe.logger().error(f"[PV Notification] ✗ {error_msg}")
				frappe.log_error(error_msg, "Password Vault Share Notification")
				failed_count += 1
				failed_emails.append(email)

		result = {
			'success': True,
			'sent_count': sent_count,
			'failed_count': failed_count,
			'failed_emails': failed_emails
		}

		frappe.logger().info(
			f"[PV Notification] ═══ COMPLETED ═══\n"
			f"  ✓ Emails sent: {sent_count}\n"
			f"  ✗ Emails failed: {failed_count}"
		)

		return result

	except Exception as e:
		error_msg = f"Error in send_share_notifications: {str(e)}"
		frappe.logger().error(f"[PV Notification] CRITICAL ERROR: {error_msg}")
		frappe.log_error(error_msg, "Password Vault Share Notification")
		return {
			'success': False,
			'error': str(e),
			'sent_count': 0,
			'failed_count': 0
		}


def send_share_email(
	password_entry_doc,
	recipient_email: str,
	recipient_name: str,
	sharer_name: str,
	description: str
) -> None:
	"""
	Send share notification email

	Args:
		password_entry_doc: The Password Vault Entry document
		recipient_email: Email address of recipient
		recipient_name: Name of recipient
		sharer_name: Name of person sharing
		description: Optional description
	"""
	frappe.logger().info(f"[PV Email] Preparing email for {recipient_email}")

	# Determine doctype for URL
	from frappe_devsecops_dashboard.api.password_vault import _get_doctype_name
	doctype_name = _get_doctype_name()

	# Get the password vault URL
	vault_url = get_url("/devsecops-ui#password-vault")

	# Email subject
	subject = f"Password Shared: {password_entry_doc.title}"

	# Email body
	email_body = get_share_email_template(
		entry_title=password_entry_doc.title,
		entry_category=password_entry_doc.category or "Other",
		entry_username=password_entry_doc.username or "N/A",
		entry_url=password_entry_doc.url or "N/A",
		recipient_name=recipient_name,
		sharer_name=sharer_name,
		description=description,
		vault_url=vault_url
	)

	# Send email
	frappe.logger().info(f"[PV Email] Calling frappe.sendmail...")
	try:
		frappe.sendmail(
			recipients=[recipient_email],
			subject=subject,
			message=email_body,
			delayed=False,
			reference_doctype=doctype_name,
			reference_name=password_entry_doc.name,
			unsubscribe_message=_("You are receiving this because credentials were shared with you")
		)
		frappe.logger().info(f"[PV Email] ✓ Email sent successfully to {recipient_email}")
	except Exception as email_error:
		frappe.logger().error(f"[PV Email] ✗ Failed to send to {recipient_email}: {str(email_error)}")
		raise


def get_share_email_template(
	entry_title: str,
	entry_category: str,
	entry_username: str,
	entry_url: str,
	recipient_name: str,
	sharer_name: str,
	description: str,
	vault_url: str
) -> str:
	"""
	Generate HTML email template for share notification

	Returns:
		HTML email content
	"""
	from html import escape

	# Escape all user-provided content to prevent HTML injection
	entry_title = escape(entry_title)
	entry_category = escape(entry_category)
	entry_username = escape(entry_username)
	entry_url = escape(entry_url)
	recipient_name = escape(recipient_name)
	sharer_name = escape(sharer_name)
	description = escape(description) if description else ""

	description_html = ""
	if description:
		description_html = f"""
		<div style="margin: 20px 0; padding: 15px; background-color: #f8f9fa; border-left: 4px solid #0066cc; border-radius: 4px;">
			<p style="margin: 0; color: #495057; font-size: 14px;"><strong>Note from {sharer_name}:</strong></p>
			<p style="margin: 8px 0 0 0; color: #495057; font-size: 14px;">{description}</p>
		</div>
		"""

	return f"""
	<!DOCTYPE html>
	<html>
	<head>
		<meta charset="UTF-8">
		<meta name="viewport" content="width=device-width, initial-scale=1.0">
	</head>
	<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f5f5f5;">
		<table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f5f5f5; padding: 40px 20px;">
			<tr>
				<td align="center">
					<table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
						<!-- Header -->
						<tr>
							<td style="padding: 40px 40px 30px 40px; background: linear-gradient(135deg, #0066cc 0%, #004c99 100%); border-radius: 8px 8px 0 0;">
								<h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
									🔐 Password Shared With You
								</h1>
							</td>
						</tr>

						<!-- Content -->
						<tr>
							<td style="padding: 40px;">
								<p style="margin: 0 0 20px 0; color: #212529; font-size: 16px;">
									Hi {recipient_name},
								</p>

								<p style="margin: 0 0 30px 0; color: #495057; font-size: 15px; line-height: 1.6;">
									<strong>{sharer_name}</strong> has shared password credentials with you.
								</p>

								{description_html}

								<!-- Password Details -->
								<div style="margin: 30px 0; padding: 20px; background-color: #f8f9fa; border-radius: 6px; border: 1px solid #dee2e6;">
									<h2 style="margin: 0 0 15px 0; color: #212529; font-size: 18px; font-weight: 600;">
										Password Entry Details
									</h2>

									<table width="100%" cellpadding="8" cellspacing="0">
										<tr>
											<td style="color: #6c757d; font-size: 14px; padding: 8px 0;">
												<strong>Title:</strong>
											</td>
											<td style="color: #212529; font-size: 14px; padding: 8px 0;">
												{entry_title}
											</td>
										</tr>
										<tr>
											<td style="color: #6c757d; font-size: 14px; padding: 8px 0;">
												<strong>Category:</strong>
											</td>
											<td style="color: #212529; font-size: 14px; padding: 8px 0;">
												{entry_category}
											</td>
										</tr>
										<tr>
											<td style="color: #6c757d; font-size: 14px; padding: 8px 0;">
												<strong>Username:</strong>
											</td>
											<td style="color: #212529; font-size: 14px; padding: 8px 0;">
												{entry_username}
											</td>
										</tr>
										<tr>
											<td style="color: #6c757d; font-size: 14px; padding: 8px 0;">
												<strong>URL:</strong>
											</td>
											<td style="color: #212529; font-size: 14px; padding: 8px 0;">
												{entry_url}
											</td>
										</tr>
									</table>
								</div>

								<!-- Action Button -->
								<div style="margin: 30px 0; text-align: center;">
									<a href="{vault_url}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #0066cc 0%, #004c99 100%); color: #ffffff; text-decoration: none; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(0, 102, 204, 0.3);">
										View in Password Vault
									</a>
								</div>

								<!-- Security Notice -->
								<div style="margin: 30px 0 0 0; padding: 15px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 4px;">
									<p style="margin: 0; color: #856404; font-size: 13px;">
										<strong>⚠️ Security Notice:</strong> This password has been securely shared with you.
										Please keep it confidential and do not share it with unauthorized parties.
									</p>
								</div>
							</td>
						</tr>

						<!-- Footer -->
						<tr>
							<td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 8px 8px; border-top: 1px solid #dee2e6;">
								<p style="margin: 0; color: #6c757d; font-size: 13px; text-align: center;">
									This is an automated notification from the Password Vault.
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
