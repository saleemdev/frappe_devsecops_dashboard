# Copyright (c) 2025, Salim and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class ChangeRequest(Document):
	def after_insert(self):
		"""
		Automatically sync approvers from the default Change Management Team
		when a new Change Request is created
		"""
		self._sync_approvers_from_project()

		# Enqueue email notifications AFTER commit to avoid blocking the save
		# Using frappe.enqueue_doc ensures it runs after the current transaction commits
		if self.change_approvers:
			frappe.enqueue_doc(
				self.doctype,
				self.name,
				'_send_approval_notifications',
				queue='default',
				timeout=300,
				now=False,  # Run in background, not immediately
				enqueue_after_commit=True  # This ensures emails are sent AFTER the database commit
			)

	def on_update(self):
		"""
		Called whenever the document is updated
		Check if new approvers were added and send notifications
		"""
		# Check if we're in the context of syncing approvers
		if hasattr(self, '_approvers_just_synced') and self._approvers_just_synced:
			# Enqueue email notifications for newly added approvers
			frappe.enqueue_doc(
				self.doctype,
				self.name,
				'_send_approval_notifications',
				queue='default',
				timeout=300,
				now=False,  # Run in background, not immediately
				enqueue_after_commit=True
			)
			# Clear the flag
			self._approvers_just_synced = False

	def _send_approval_notifications(self):
		"""
		Wrapper method to trigger email notifications
		This method is called by the background worker
		"""
		try:
			from frappe_devsecops_dashboard.api.change_request_notifications import send_approval_notifications

			frappe.logger().info(f"[CR DocType] Triggering email notifications for {self.name}")
			result = send_approval_notifications(self.name)

			if result.get('success'):
				frappe.logger().info(
					f"[CR DocType] Email notifications completed for {self.name}: "
					f"{result.get('sent_count')} sent, {result.get('failed_count')} failed"
				)
			else:
				frappe.logger().error(
					f"[CR DocType] Email notifications failed for {self.name}: {result.get('error')}"
				)
		except Exception as e:
			frappe.logger().error(f"[CR DocType] Error in _send_approval_notifications: {str(e)}")
			frappe.log_error(
				f"Failed to send approval notifications for {self.name}: {str(e)}",
				"Change Request Notification"
			)

	def _sync_approvers_from_project(self):
		"""
		Fetch users from the default Change Management Team
		and add them as Change Request Approvers
		"""
		try:
			# Get the default Change Management Team
			default_team = frappe.db.get_value(
				'Change Management Team',
				{'is_default': 1, 'status': 'Active'},
				'name'
			)

			if not default_team:
				frappe.logger().warning(
					f"[CR] No active default Change Management Team found for {self.name}. "
					"Skipping auto-sync of approvers. Please configure a default team."
				)
				return

			# Get the Change Management Team document
			team = frappe.get_doc('Change Management Team', default_team)

			# Get existing approver users to avoid duplicates
			existing_approver_users = {approver.user for approver in self.change_approvers}

			# Fetch team members
			team_members = team.get('members', [])

			# Map team roles to business functions
			role_to_business_function = {
				'Lead': 'Change Leadership',
				'Reviewer': 'Quality Assurance',
				'Member': 'General'
			}

			approvers_added = 0
			for member in team_members:
				user = member.user
				if user and user not in existing_approver_users:
					# Add to change_approvers table with role-based business function
					business_function = role_to_business_function.get(member.role, 'General')
					self.append('change_approvers', {
						'user': user,
						'business_function': business_function,
						'approval_status': 'Pending'
					})
					approvers_added += 1

			# Save if approvers were added
			if approvers_added > 0:
				# Set flag to indicate approvers were just synced
				self._approvers_just_synced = True
				self.save()
				frappe.msgprint(
					_('Added {0} approver(s) from default Change Management Team: {1}').format(
						approvers_added, team.team_name
					),
					title=_('Approvers Synced'),
					indicator='green'
				)

		except Exception as e:
			frappe.log_error(
				f"Error syncing approvers for Change Request {self.name}: {str(e)}",
				"Change Request Approver Sync"
			)
