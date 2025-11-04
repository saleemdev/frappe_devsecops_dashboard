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

