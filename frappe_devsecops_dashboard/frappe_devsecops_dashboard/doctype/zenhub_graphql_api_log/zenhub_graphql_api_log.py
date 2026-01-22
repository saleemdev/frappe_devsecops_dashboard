# Copyright (c) 2026, Salim and contributors
# License: MIT

import frappe
from frappe.model.document import Document
import json
import traceback
from datetime import datetime
from typing import Dict, Any, Optional


class ZenhubGraphQLAPILog(Document):
	"""Log for Zenhub GraphQL API interactions"""

	def before_insert(self):
		"""Set metadata before insert"""
		if not self.created_by:
			self.created_by = frappe.session.user

		if not self.creation_timestamp:
			self.creation_timestamp = frappe.utils.now()

	def validate(self):
		"""Validate the log entry"""
		# Ensure JSON fields are valid JSON strings
		if self.request_payload and isinstance(self.request_payload, dict):
			self.request_payload = json.dumps(self.request_payload, indent=2)

		if self.response_data and isinstance(self.response_data, dict):
			self.response_data = json.dumps(self.response_data, indent=2)


def create_zenhub_api_log(
	reference_doctype: str,
	reference_docname: str,
	operation_type: str,
	graphql_operation: str,
	status: str,
	request_payload: Optional[Dict[str, Any]] = None,
	response_data: Optional[Dict[str, Any]] = None,
	http_status_code: Optional[int] = None,
	response_time_ms: Optional[int] = None,
	error_message: Optional[str] = None,
	error_traceback: Optional[str] = None,
	api_endpoint: Optional[str] = None,
	request_method: str = "POST"
) -> str:
	"""
	Create a Zenhub GraphQL API Log entry

	Args:
		reference_doctype: DocType being operated on (Software Product, Project, Task)
		reference_docname: Name of the document
		operation_type: Query, Mutation, or Subscription
		graphql_operation: Name of the GraphQL operation (e.g., "createWorkspace", "createIssue")
		status: Success, Failed, Partial Success, Timeout, or Error
		request_payload: The GraphQL query/mutation and variables
		response_data: The API response
		http_status_code: HTTP status code
		response_time_ms: Response time in milliseconds
		error_message: Error message if failed
		error_traceback: Full traceback if error occurred
		api_endpoint: API endpoint URL
		request_method: HTTP method (default POST)

	Returns:
		Name of the created log document
	"""
	try:
		# Format payloads as JSON strings
		request_json = json.dumps(request_payload, indent=2) if request_payload else None
		response_json = json.dumps(response_data, indent=2) if response_data else None

		# Create the log document - IMPORTANT: reference_doctype must be set first for Dynamic Link validation
		log_doc = frappe.get_doc({
			"doctype": "Zenhub GraphQL API Log",
			"reference_doctype": reference_doctype,  # MUST be set first
			"operation_type": operation_type,
			"graphql_operation": graphql_operation,
			"status": status,
			"api_endpoint": api_endpoint or "https://api.zenhub.com/public/graphql",
			"request_method": request_method,
			"created_by": frappe.session.user,
			"creation_timestamp": frappe.utils.now()
		})

		# Set reference_docname AFTER the doc is created and reference_doctype is set
		log_doc.reference_docname = reference_docname

		# Set optional fields
		if request_json:
			log_doc.request_payload = request_json
		if response_json:
			log_doc.response_data = response_json
		if http_status_code:
			log_doc.http_status_code = http_status_code
		if response_time_ms:
			log_doc.response_time_ms = response_time_ms
		if error_message:
			log_doc.error_message = error_message
		if error_traceback:
			log_doc.error_traceback = error_traceback

		# Insert without triggering additional hooks
		log_doc.insert(ignore_permissions=True)
		frappe.db.commit()

		return log_doc.name

	except Exception as e:
		# If logging fails, log to error log but don't block the main operation
		frappe.log_error(
			title="Zenhub API Log Creation Failed",
			message=f"Failed to create API log: {str(e)}\n{traceback.format_exc()}"
		)
		return None


def log_zenhub_success(
	reference_doctype: str,
	reference_docname: str,
	operation_type: str,
	graphql_operation: str,
	request_payload: Dict[str, Any],
	response_data: Dict[str, Any],
	http_status_code: int = 200,
	response_time_ms: Optional[int] = None
) -> str:
	"""
	Helper function to log successful Zenhub API calls

	Returns:
		Name of the created log document
	"""
	return create_zenhub_api_log(
		reference_doctype=reference_doctype,
		reference_docname=reference_docname,
		operation_type=operation_type,
		graphql_operation=graphql_operation,
		status="Success",
		request_payload=request_payload,
		response_data=response_data,
		http_status_code=http_status_code,
		response_time_ms=response_time_ms
	)


def log_zenhub_error(
	reference_doctype: str,
	reference_docname: str,
	operation_type: str,
	graphql_operation: str,
	request_payload: Dict[str, Any],
	error_message: str,
	http_status_code: Optional[int] = None,
	response_data: Optional[Dict[str, Any]] = None,
	error_traceback: Optional[str] = None
) -> str:
	"""
	Helper function to log failed Zenhub API calls

	Returns:
		Name of the created log document
	"""
	return create_zenhub_api_log(
		reference_doctype=reference_doctype,
		reference_docname=reference_docname,
		operation_type=operation_type,
		graphql_operation=graphql_operation,
		status="Failed" if http_status_code and http_status_code >= 500 else "Error",
		request_payload=request_payload,
		response_data=response_data,
		http_status_code=http_status_code,
		error_message=error_message,
		error_traceback=error_traceback or traceback.format_exc()
	)
