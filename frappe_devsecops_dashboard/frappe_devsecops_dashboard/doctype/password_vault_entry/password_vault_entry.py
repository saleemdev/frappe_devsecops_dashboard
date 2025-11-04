# Copyright (c) 2025, Frappe and contributors
# For license information, please see license.txt

import frappe
from frappe.model.document import Document


class PasswordVaultEntry(Document):
	"""
	Password Vault Entry DocType for secure password storage.
	Passwords are encrypted at rest using Frappe's encryption utilities.
	"""

	def before_insert(self):
		"""Set created_by_user and created_at before insert"""
		self.created_by_user = frappe.session.user
		self.created_at = frappe.utils.now()

	def before_save(self):
		"""Validate before saving"""
		# Ensure password is not empty
		if not self.password:
			frappe.throw("Password is required")

	def on_trash(self):
		"""Delete associated share links when password entry is deleted"""
		# Delete all share links for this password entry
		share_links = frappe.get_list(
			"Password Share Link",
			filters={"password_vault_entry": self.name},
			pluck="name"
		)
		for link in share_links:
			frappe.delete_doc("Password Share Link", link, force=True)

