# Copyright (c) 2025, Salim and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document
from frappe import _

class ChangeRequest(Document):
	def after_insert(self):
		"""
		Automatically sync approvers from the linked Project's team members
		when a new Change Request is created
		"""
		if self.project:
			self._sync_approvers_from_project()

	def _sync_approvers_from_project(self):
		"""
		Fetch users from the linked Project's "Project User" child table
		and add them as Change Request Approvers if they are marked as change approvers
		"""
		try:
			# Get the project document
			project = frappe.get_doc('Project', self.project)

			# Get existing approver users to avoid duplicates
			existing_approver_users = {approver.user for approver in self.change_approvers}

			# Fetch project users who are marked as change approvers
			project_users = project.get('users', [])

			approvers_added = 0
			for project_user in project_users:
				# Check if user is marked as change approver and not already in the list
				if project_user.get('custom_is_change_approver') and project_user.user not in existing_approver_users:
					# Add to change_approvers table
					self.append('change_approvers', {
						'user': project_user.user,
						'business_function': project_user.get('custom_business_function', ''),
						'approval_status': 'Pending'
					})
					approvers_added += 1

			# Save if approvers were added
			if approvers_added > 0:
				self.save()
				frappe.msgprint(
					_('Added {0} approver(s) from Project team members').format(approvers_added),
					title=_('Approvers Synced'),
					indicator='green'
				)

		except Exception as e:
			frappe.log_error(
				f"Error syncing approvers for Change Request {self.name}: {str(e)}",
				"Change Request Approver Sync"
			)
