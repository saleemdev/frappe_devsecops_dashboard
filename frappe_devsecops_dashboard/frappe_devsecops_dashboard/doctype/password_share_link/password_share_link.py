# Copyright (c) 2025, Frappe and contributors
# For license information, please see license.txt

import frappe
import uuid
import random
from frappe.model.document import Document


class PasswordShareLink(Document):
	"""
	Password Share Link DocType for secure one-time password sharing.
	Generates unique tokens and one-time codes for secure access.
	"""

	def before_insert(self):
		"""Generate share_token and one_time_code before insert"""
		# Generate unique share token (UUID)
		self.share_token = str(uuid.uuid4())
		
		# Generate 6-digit one-time code
		self.one_time_code = str(random.randint(100000, 999999))
		
		# Set created_by_user and created_at
		self.created_by_user = frappe.session.user
		self.created_at = frappe.utils.now()

	def before_save(self):
		"""Validate before saving"""
		# Ensure password_vault_entry exists
		if not frappe.db.exists("Password Vault Entry", self.password_vault_entry):
			frappe.throw(f"Password Vault Entry {self.password_vault_entry} does not exist")
		
		# Ensure expiry_datetime is in the future
		from datetime import datetime
		if self.expiry_datetime:
			expiry = datetime.fromisoformat(str(self.expiry_datetime))
			now = datetime.fromisoformat(str(frappe.utils.now()))
			if expiry <= now:
				frappe.throw("Expiry DateTime must be in the future")

