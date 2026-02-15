# Copyright (c) 2025, Salim and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class DevSecOpsPassword(Document):
	"""
	DevSecOps Password DocType
	Secure password storage with project linking and audit trail
	"""

	def before_insert(self):
		"""Set created_by_user and created_at before insert"""
		self.created_by_user = frappe.session.user
		self.created_at = frappe.utils.now()
		self.last_modified_by = frappe.session.user
		self.last_modified_at = frappe.utils.now()

	def before_save(self):
		"""Update last_modified fields before save"""
		self.last_modified_by = frappe.session.user
		self.last_modified_at = frappe.utils.now()

	def on_trash(self):
		"""Delete associated share links when password entry is deleted"""
		share_links = frappe.get_list(
			"Password Share Link",
			filters={"password_vault_entry": self.name},
			pluck="name"
		)
		for link in share_links:
			frappe.delete_doc("Password Share Link", link, force=True)

	def _send_share_notifications(self, emails, description=""):
		"""
		Send email notifications to users who received share access
		This method is called by background worker via frappe.enqueue_doc

		Args:
			emails: List of email addresses to notify
			description: Optional description from the sharer
		"""
		try:
			from frappe_devsecops_dashboard.api.password_vault_notifications import send_share_notifications

			frappe.logger().info(f"[Password Vault] Sending share notifications for {self.name}")
			result = send_share_notifications(
				password_entry_name=self.name,
				emails=emails,
				description=description
			)

			if result.get('success'):
				frappe.logger().info(
					f"[Password Vault] Share notifications completed: "
					f"{result.get('sent_count')} sent, {result.get('failed_count')} failed"
				)
			else:
				frappe.logger().error(
					f"[Password Vault] Share notifications failed: {result.get('error')}"
				)
		except Exception as e:
			frappe.logger().error(f"[Password Vault] Error in _send_share_notifications: {str(e)}")
			frappe.log_error(
				f"Failed to send share notifications for {self.name}: {str(e)}",
				"Password Vault Share Notification"
			)

