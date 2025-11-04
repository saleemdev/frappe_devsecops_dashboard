"""
Password Vault API
Provides CRUD operations for secure password storage and one-time shareable links
"""

import frappe
import json
import uuid
import random
from frappe import _
from frappe.utils import cint, now
from datetime import datetime, timedelta


def _get_doctype_name():
	"""
	Determine which DocType to use (DevSecOps Password or Password Vault Entry)
	Prefers DevSecOps Password if it exists
	"""
	if frappe.db.exists("DocType", "DevSecOps Password"):
		return "DevSecOps Password"
	return "Password Vault Entry"


@frappe.whitelist()
def get_vault_entries(search_query="", category="", page=1, page_length=20):
	"""
	Get all password entries for current user with pagination and filtering

	Args:
		search_query: Search by title, username, or tags
		category: Filter by category
		page: Page number (1-based)
		page_length: Number of entries per page

	Returns:
		dict: Success response with list of password entries
	"""
	try:
		doctype_name = _get_doctype_name()

		filters = [
			[doctype_name, "created_by_user", "=", frappe.session.user],
			[doctype_name, "is_active", "=", 1]
		]

		if category:
			filters.append([doctype_name, "category", "=", category])

		# Build search filter
		if search_query:
			search_filters = [
				[doctype_name, "title", "like", f"%{search_query}%"],
				"or",
				[doctype_name, "username", "like", f"%{search_query}%"],
				"or",
				[doctype_name, "tags", "like", f"%{search_query}%"]
			]
			filters.append(search_filters)

		# Calculate offset
		offset = (cint(page) - 1) * cint(page_length)

		entries = frappe.get_list(
			doctype_name,
			filters=filters,
			fields=[
				"name",
				"title",
				"username",
				"category",
				"url",
				"tags",
				"project",
				"is_active",
				"creation",
				"modified"
			],
			order_by="modified desc",
			limit_page_length=cint(page_length),
			offset=offset
		)

		# Get total count
		total_count = frappe.db.count(doctype_name, filters=filters)

		return {
			"success": True,
			"data": entries or [],
			"total": total_count,
			"page": cint(page),
			"page_length": cint(page_length)
		}

	except frappe.PermissionError:
		frappe.log_error("Permission denied for vault entries", "Password Vault")
		return {
			"success": False,
			"error": "You don't have permission to access vault entries"
		}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - get_vault_entries")
		return {
			"success": False,
			"error": str(e)
		}


@frappe.whitelist()
def get_vault_entry(name):
	"""
	Get single password entry details (decrypt password only for authorized users)

	Args:
		name: Password entry name

	Returns:
		dict: Success response with password entry details
	"""
	try:
		doctype_name = _get_doctype_name()
		entry = frappe.get_doc(doctype_name, name)

		# Check if user is the creator or System Manager
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to access this password entry")

		return {
			"success": True,
			"data": {
				"name": entry.name,
				"title": entry.title,
				"username": entry.username,
				"password": entry.password,  # Frappe handles decryption automatically
				"url": entry.url,
				"port": getattr(entry, "port", None),
				"notes": entry.notes,
				"category": entry.category,
				"tags": entry.tags,
				"project": getattr(entry, "project", None),
				"expiry_date": getattr(entry, "expiry_date", None),
				"is_active": entry.is_active,
				"created_by_user": entry.created_by_user,
				"created_at": entry.created_at
			}
		}

	except frappe.DoesNotExistError:
		return {
			"success": False,
			"error": f"Password entry {name} not found"
		}
	except frappe.PermissionError as e:
		frappe.log_error(str(e), "Password Vault - get_vault_entry")
		return {
			"success": False,
			"error": str(e)
		}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - get_vault_entry")
		return {
			"success": False,
			"error": str(e)
		}


@frappe.whitelist()
def create_vault_entry(data):
	"""
	Create new password entry (encrypt password before saving)

	Args:
		data: Dictionary with password entry fields

	Returns:
		dict: Success response with created entry
	"""
	try:
		# Parse data if it's a JSON string
		if isinstance(data, str):
			data = json.loads(data)

		# Validate required fields
		if not data.get("title"):
			return {"success": False, "error": "Title is required"}
		if not data.get("password"):
			return {"success": False, "error": "Password is required"}

		# Create new document
		doctype_name = _get_doctype_name()
		entry = frappe.new_doc(doctype_name)
		entry.title = data.get("title")
		entry.username = data.get("username", "")
		entry.password = data.get("password")
		entry.url = data.get("url", "")
		entry.notes = data.get("notes", "")
		entry.category = data.get("category", "Login")
		entry.tags = data.get("tags", "")
		entry.project = data.get("project", "")
		entry.is_active = cint(data.get("is_active", 1))

		# Add optional fields for DevSecOps Password
		if doctype_name == "DevSecOps Password":
			if data.get("port"):
				entry.port = cint(data.get("port"))
			if data.get("expiry_date"):
				entry.expiry_date = data.get("expiry_date")

		entry.insert(ignore_permissions=False)
		frappe.db.commit()

		return {
			"success": True,
			"data": {
				"name": entry.name,
				"title": entry.title,
				"message": "Password entry created successfully"
			}
		}

	except frappe.ValidationError as e:
		return {"success": False, "error": str(e)}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - create_vault_entry")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def update_vault_entry(name, data):
	"""
	Update existing password entry

	Args:
		name: Password entry name
		data: Dictionary with fields to update

	Returns:
		dict: Success response with updated entry
	"""
	try:
		# Parse data if it's a JSON string
		if isinstance(data, str):
			data = json.loads(data)

		doctype_name = _get_doctype_name()
		entry = frappe.get_doc(doctype_name, name)

		# Check if user is the creator or System Manager
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to update this password entry")

		# Update fields
		if "title" in data:
			entry.title = data["title"]
		if "username" in data:
			entry.username = data["username"]
		if "password" in data:
			entry.password = data["password"]
		if "url" in data:
			entry.url = data["url"]
		if "notes" in data:
			entry.notes = data["notes"]
		if "category" in data:
			entry.category = data["category"]
		if "tags" in data:
			entry.tags = data["tags"]
		if "project" in data:
			entry.project = data["project"]
		if "is_active" in data:
			entry.is_active = cint(data["is_active"])

		# Update optional fields for DevSecOps Password
		if doctype_name == "DevSecOps Password":
			if "port" in data:
				entry.port = cint(data["port"]) if data["port"] else None
			if "expiry_date" in data:
				entry.expiry_date = data["expiry_date"]

		entry.save(ignore_permissions=False)
		frappe.db.commit()

		return {
			"success": True,
			"data": {"name": entry.name, "message": "Password entry updated successfully"}
		}

	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - update_vault_entry")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def delete_vault_entry(name):
	"""
	Delete password entry (also delete associated share links)

	Args:
		name: Password entry name

	Returns:
		dict: Success response
	"""
	try:
		doctype_name = _get_doctype_name()
		entry = frappe.get_doc(doctype_name, name)

		# Check if user is the creator or System Manager
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to delete this password entry")

		frappe.delete_doc(doctype_name, name, ignore_permissions=False)
		frappe.db.commit()

		return {"success": True, "message": "Password entry deleted successfully"}

	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - delete_vault_entry")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def copy_vault_entry(name):
	"""
	Copy/duplicate a password entry with "(Copy)" appended to title

	Args:
		name: Password entry name to copy

	Returns:
		dict: Success response with new entry details
	"""
	try:
		doctype_name = _get_doctype_name()
		original_entry = frappe.get_doc(doctype_name, name)

		# Check if user is the creator or System Manager
		if original_entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to copy this password entry")

		# Create new document by copying
		new_entry = frappe.new_doc(doctype_name)
		new_entry.title = f"{original_entry.title} (Copy)"
		new_entry.username = original_entry.username
		new_entry.password = original_entry.password
		new_entry.url = original_entry.url
		new_entry.notes = original_entry.notes
		new_entry.category = original_entry.category
		new_entry.tags = original_entry.tags
		new_entry.project = original_entry.project
		new_entry.is_active = original_entry.is_active

		# Copy optional fields for DevSecOps Password
		if doctype_name == "DevSecOps Password":
			new_entry.port = getattr(original_entry, "port", None)
			new_entry.expiry_date = getattr(original_entry, "expiry_date", None)

		new_entry.insert(ignore_permissions=False)
		frappe.db.commit()

		return {
			"success": True,
			"data": {
				"name": new_entry.name,
				"title": new_entry.title,
				"message": "Password entry copied successfully"
			}
		}

	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - copy_vault_entry")
		return {"success": False, "error": str(e)}

