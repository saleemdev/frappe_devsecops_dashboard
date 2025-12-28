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
def get_vault_entries(search_query="", category="", page=1, page_length=20, include_shared=True):
	"""
	Get all password entries for current user with pagination and filtering
	Includes both owned and shared passwords

	Args:
		search_query: Search by title, username, or tags
		category: Filter by category
		page: Page number (1-based)
		page_length: Number of entries per page
		include_shared: Whether to include passwords shared with the user

	Returns:
		dict: Success response with list of password entries
	"""
	try:
		doctype_name = _get_doctype_name()
		user = frappe.session.user

		# Get owned entries
		filters = [
			[doctype_name, "created_by_user", "=", user],
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

		# Get owned entries
		owned_entries = frappe.get_list(
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
				"modified",
				"created_by_user"
			],
			order_by="modified desc"
		)

		# Mark as owned
		for entry in owned_entries:
			entry["is_shared"] = False
			entry["is_owner"] = True

		# Get shared entries if requested
		shared_entries = []
		if include_shared:
			# Get documents shared with this user via DocShare
			shared_docs = frappe.get_all(
				"DocShare",
				filters={
					"user": user,
					"share_doctype": doctype_name,
					"read": 1
				},
				fields=["share_name"]
			)

			shared_names = [doc.share_name for doc in shared_docs]

			if shared_names:
				# Get shared entries (exclude own entries)
				shared_filters = [
					[doctype_name, "name", "in", shared_names],
					[doctype_name, "is_active", "=", 1],
					[doctype_name, "created_by_user", "!=", user]  # Exclude own entries
				]

				if category:
					shared_filters.append([doctype_name, "category", "=", category])

				if search_query:
					shared_search = [
						[doctype_name, "title", "like", f"%{search_query}%"],
						"or",
						[doctype_name, "username", "like", f"%{search_query}%"],
						"or",
						[doctype_name, "tags", "like", f"%{search_query}%"]
					]
					shared_filters.append(shared_search)

				shared_entries = frappe.get_list(
					doctype_name,
					filters=shared_filters,
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
						"modified",
						"created_by_user"
					],
					order_by="modified desc"
				)

				# Mark as shared and get owner info
				for entry in shared_entries:
					entry["is_shared"] = True
					entry["is_owner"] = False
					# Get owner full name
					try:
						owner_doc = frappe.get_doc("User", entry["created_by_user"])
						entry["owner_name"] = owner_doc.full_name or entry["created_by_user"]
					except:
						entry["owner_name"] = entry["created_by_user"]

		# Combine and sort
		all_entries = owned_entries + shared_entries
		all_entries.sort(key=lambda x: x.get("modified", ""), reverse=True)

		# Paginate
		offset = (cint(page) - 1) * cint(page_length)
		paginated_entries = all_entries[offset:offset + cint(page_length)]

		# Get total count
		total_count = len(all_entries)

		return {
			"success": True,
			"data": paginated_entries or [],
			"total": total_count,
			"page": cint(page),
			"page_length": cint(page_length),
			"owned_count": len(owned_entries),
			"shared_count": len(shared_entries)
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
		user = frappe.session.user

		# Check if user is the creator, has DocShare access, or is System Manager
		is_owner = entry.created_by_user == user
		is_system_manager = frappe.has_role("System Manager")
		
		# Check if document is shared with user
		has_share_access = False
		if not is_owner and not is_system_manager:
			share = frappe.db.get_value(
				"DocShare",
				{
					"user": user,
					"share_doctype": doctype_name,
					"share_name": name,
					"read": 1
				}
			)
			has_share_access = bool(share)
		
		if not (is_owner or is_system_manager or has_share_access):
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


@frappe.whitelist()
def share_password_entry(name, assign_to_users=None, description=""):
	"""
	Share password entry with users using Frappe ToDo/document assignment
	
	Args:
		name: Password entry name
		assign_to_users: List of user emails/usernames to share with
		description: Optional description for the assignment
	
	Returns:
		dict: Success response
	"""
	try:
		doctype_name = _get_doctype_name()
		entry = frappe.get_doc(doctype_name, name)
		
		# Check if user is the owner or System Manager
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to share this password entry")
		
		# Parse assign_to_users if it's a JSON string
		if isinstance(assign_to_users, str):
			assign_to_users = json.loads(assign_to_users)
		
		if not assign_to_users or not isinstance(assign_to_users, list):
			return {"success": False, "error": "assign_to_users must be a list of user emails"}
		
		shared_users = []
		failed_users = []
		
		# Use Frappe's assign_to functionality
		from frappe.desk.form import assign_to
		
		for user_email in assign_to_users:
			try:
				# Verify user exists
				if not frappe.db.exists("User", user_email):
					failed_users.append(user_email)
					continue
				
				# Create assignment using Frappe's assign_to.add
				assign_to.add({
					"assign_to": [user_email],
					"doctype": doctype_name,
					"name": name,
					"description": description or f"Shared password: {entry.title}",
					"priority": "Medium"
				})
				
				shared_users.append(user_email)
				
			except Exception as e:
				frappe.log_error(f"Error sharing with {user_email}: {str(e)}", "Password Vault")
				failed_users.append(user_email)
		
		result = {
			"success": True,
			"shared_with": shared_users,
			"message": f"Password shared with {len(shared_users)} user(s)"
		}
		
		if failed_users:
			result["failed"] = failed_users
			result["message"] += f", {len(failed_users)} failed"
		
		return result
		
	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - share_password_entry")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def unshare_password_entry(name, user_email):
	"""
	Unshare password entry from a user (remove DocShare)
	
	Args:
		name: Password entry name
		user_email: User email to unshare from
	
	Returns:
		dict: Success response
	"""
	try:
		doctype_name = _get_doctype_name()
		entry = frappe.get_doc(doctype_name, name)
		
		# Check if user is the owner or System Manager
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to unshare this password entry")
		
		# Remove DocShare
		from frappe.share import remove
		remove(doctype_name, name, user_email)
		
		# Also close any related ToDos
		todos = frappe.get_all(
			"ToDo",
			filters={
				"reference_type": doctype_name,
				"reference_name": name,
				"allocated_to": user_email,
				"status": "Open"
			}
		)
		
		for todo in todos:
			todo_doc = frappe.get_doc("ToDo", todo.name)
			todo_doc.status = "Closed"
			todo_doc.save(ignore_permissions=True)
		
		return {
			"success": True,
			"message": f"Password unshared from {user_email}"
		}
		
	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - unshare_password_entry")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_shared_users(name):
	"""
	Get list of users this password entry is shared with
	
	Args:
		name: Password entry name
	
	Returns:
		dict: Success response with list of shared users
	"""
	try:
		doctype_name = _get_doctype_name()
		entry = frappe.get_doc(doctype_name, name)
		
		# Check if user is the owner or System Manager
		if entry.created_by_user != frappe.session.user and not frappe.has_role("System Manager"):
			frappe.throw("You don't have permission to view shared users for this password entry")
		
		# Get DocShare records
		shares = frappe.get_all(
			"DocShare",
			filters={
				"share_doctype": doctype_name,
				"share_name": name,
				"read": 1
			},
			fields=["user", "read", "write", "share"]
		)
		
		# Enrich with user details
		shared_users = []
		for share in shares:
			try:
				user_doc = frappe.get_doc("User", share.user)
				shared_users.append({
					"email": share.user,
					"full_name": user_doc.full_name or share.user,
					"read": share.read,
					"write": share.write,
					"share": share.share
				})
			except:
				shared_users.append({
					"email": share.user,
					"full_name": share.user,
					"read": share.read,
					"write": share.write,
					"share": share.share
				})
		
		return {
			"success": True,
			"data": shared_users
		}
		
	except frappe.DoesNotExistError:
		return {"success": False, "error": f"Password entry {name} not found"}
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - get_shared_users")
		return {"success": False, "error": str(e)}


@frappe.whitelist()
def get_users_for_sharing(search_query=""):
	"""
	Get list of users for sharing passwords
	
	Args:
		search_query: Search query to filter users
	
	Returns:
		dict: Success response with list of users
	"""
	try:
		filters = {
			"enabled": 1,
			"user_type": "System User"
		}
		
		fields = ["name", "full_name", "email"]
		
		users = frappe.get_all(
			"User",
			filters=filters,
			fields=fields,
			limit=100
		)
		
		# Filter by search query if provided
		if search_query:
			search_lower = search_query.lower()
			users = [
				u for u in users
				if search_lower in (u.full_name or "").lower() or
				   search_lower in (u.email or "").lower() or
				   search_lower in (u.name or "").lower()
			]
		
		# Format for Select component
		options = [
			{
				"label": f"{u.full_name or u.name} ({u.email or u.name})",
				"value": u.name
			}
			for u in users
		]
		
		return {
			"success": True,
			"data": options
		}
		
	except Exception as e:
		frappe.log_error(str(e), "Password Vault - get_users_for_sharing")
		return {"success": False, "error": str(e)}

