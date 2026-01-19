# Copyright (c) 2024, Frappe and contributors
# License: MIT

import frappe
from frappe.model.document import Document
import json
from typing import Dict, Any


class SoftwareProduct(Document):
	"""
	Software Product DocType with ZenHub workspace integration
	"""

	def before_insert(self):
		"""Hook called before document is inserted"""
		self.validate_product_name()

	def after_insert(self):
		"""Hook called after document is inserted - Setup ZenHub workspace asynchronously"""
		self.setup_zenhub_workspace_async()

	def before_update(self):
		"""Hook called before document is updated"""
		self.validate_product_name()

	def after_update(self):
		"""Hook called after document is updated"""
		# Check if workspace ID was changed and log it
		if self.has_value_changed("zenhub_workspace_id"):
			frappe.logger().info(
				f"[SoftwareProduct] Workspace ID updated for {self.name}: {self.zenhub_workspace_id}"
			)

	def before_delete(self):
		"""Hook called before document is deleted"""
		if self.zenhub_workspace_id:
			frappe.logger().warning(
				f"[SoftwareProduct] Deleting Software Product {self.name} with ZenHub workspace {self.zenhub_workspace_id}"
			)

	def validate_product_name(self):
		"""Validate that product_name is not empty"""
		if not self.get("product_name"):
			frappe.throw(
				frappe.ValidationError(
					"Product Name is required"
				)
			)

	def setup_zenhub_workspace_async(self):
		"""
		Setup ZenHub workspace asynchronously using Frappe background job
		This prevents blocking the UI while ZenHub API calls are made
		"""
		try:
			# Queue the task for asynchronous execution
			frappe.enqueue(
				"frappe_devsecops_dashboard.api.zenhub_workspace_setup.setup_product_workspace",
				queue="default",
				timeout=300,  # 5 minutes timeout
				job_name=f"zenhub_setup_{self.name}",
				product_name=self.name
			)

			frappe.logger().info(
				f"[SoftwareProduct] Queued ZenHub workspace setup for {self.name}"
			)
		except Exception as e:
			# Log the error but don't block document creation
			frappe.logger().error(
				f"[SoftwareProduct] Failed to queue ZenHub workspace setup for {self.name}: {str(e)}"
			)
			frappe.log_error(
				f"Failed to queue ZenHub workspace setup: {str(e)}",
				"SoftwareProduct ZenHub Setup Error"
			)

	def has_value_changed(self, field_name: str) -> bool:
		"""Check if a field value has changed from its original value"""
		if not self.get_doc_before_save():
			return False

		old_value = self.get_doc_before_save().get(field_name)
		new_value = self.get(field_name)
		return old_value != new_value
