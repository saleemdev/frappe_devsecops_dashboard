"""
Project User Permissions Hook

This module handles automatic creation and deletion of User Permissions
when users are added to or removed from a Project's team members.

When a user is added to a project's users table, a User Permission document
is automatically created to grant them access to that specific project.
When a user is removed, the corresponding User Permission is deleted.
"""

import frappe
from frappe import _
from frappe.utils import cint


def handle_project_user_permissions(doc, method=None):
	"""
	Hook for Project after_save event.
	
	Automatically creates/updates User Permissions when users are added to a project.
	Also removes User Permissions when users are removed from a project.
	
	Args:
		doc: The Project document
		method: The hook method name (after_save)
	"""
	try:
		# Get the current users in the project
		current_users = set()
		if doc.users:
			for user_row in doc.users:
				if user_row.user:
					current_users.add(user_row.user)
		
		# Get the previous users from the database (if this is an update)
		previous_users = set()
		if not doc.is_new():
			previous_doc = frappe.get_doc("Project", doc.name)
			if previous_doc.users:
				for user_row in previous_doc.users:
					if user_row.user:
						previous_users.add(user_row.user)
		
		# Find newly added users
		new_users = current_users - previous_users
		
		# Find removed users
		removed_users = previous_users - current_users
		
		# Create User Permissions for newly added users
		for user in new_users:
			create_user_permission(user, doc.name)
		
		# Remove User Permissions for removed users
		for user in removed_users:
			remove_user_permission(user, doc.name)
		
		# Log the operation
		if new_users or removed_users:
			frappe.logger().info(
				f"[Project User Permissions] Project: {doc.name}, "
				f"Added users: {new_users}, Removed users: {removed_users}"
			)
	
	except Exception as e:
		# Log the error but don't prevent the project from being saved
		error_msg = f"Error handling Project User Permissions for {doc.name}: {str(e)}"
		frappe.logger().error(f"[Project User Permissions] {error_msg}")
		frappe.log_error(error_msg, "Project User Permissions Hook")


def create_user_permission(user, project_name):
	"""
	Create a User Permission for a user to access a specific project.
	
	Args:
		user: The user ID/email
		project_name: The project name
	
	Returns:
		The created User Permission document or None if it already exists
	"""
	try:
		# Check if User Permission already exists
		existing_perm = frappe.db.exists(
			"User Permission",
			{
				"user": user,
				"allow": "Project",
				"for_value": project_name
			}
		)
		
		if existing_perm:
			frappe.logger().info(
				f"[Project User Permissions] User Permission already exists for "
				f"user: {user}, project: {project_name}"
			)
			return None
		
		# Create new User Permission
		user_perm = frappe.new_doc("User Permission")
		user_perm.user = user
		user_perm.allow = "Project"
		user_perm.for_value = project_name
		user_perm.apply_to_all_doctypes = 1  # Apply to all doctypes
		user_perm.is_default = 0
		user_perm.hide_descendants = 0
		
		user_perm.insert(ignore_permissions=True)
		
		frappe.logger().info(
			f"[Project User Permissions] Created User Permission for "
			f"user: {user}, project: {project_name}"
		)
		
		return user_perm
	
	except frappe.DuplicateEntryError:
		# Handle race condition where permission was created by another process
		frappe.logger().warning(
			f"[Project User Permissions] Duplicate User Permission for "
			f"user: {user}, project: {project_name}"
		)
		return None
	
	except Exception as e:
		error_msg = (
			f"Failed to create User Permission for user: {user}, "
			f"project: {project_name}. Error: {str(e)}"
		)
		frappe.logger().error(f"[Project User Permissions] {error_msg}")
		frappe.log_error(error_msg, "Project User Permissions - Create")
		# Don't raise - let the project save succeed even if permission creation fails
		return None


def remove_user_permission(user, project_name):
	"""
	Remove a User Permission for a user to access a specific project.
	
	Args:
		user: The user ID/email
		project_name: The project name
	
	Returns:
		True if permission was removed, False otherwise
	"""
	try:
		# Find the User Permission to delete
		perm_name = frappe.db.exists(
			"User Permission",
			{
				"user": user,
				"allow": "Project",
				"for_value": project_name
			}
		)
		
		if not perm_name:
			frappe.logger().info(
				f"[Project User Permissions] No User Permission found to remove for "
				f"user: {user}, project: {project_name}"
			)
			return False
		
		# Delete the User Permission
		frappe.delete_doc("User Permission", perm_name, ignore_permissions=True)
		
		frappe.logger().info(
			f"[Project User Permissions] Removed User Permission for "
			f"user: {user}, project: {project_name}"
		)
		
		return True
	
	except frappe.DoesNotExistError:
		frappe.logger().warning(
			f"[Project User Permissions] User Permission not found for "
			f"user: {user}, project: {project_name}"
		)
		return False
	
	except Exception as e:
		error_msg = (
			f"Failed to remove User Permission for user: {user}, "
			f"project: {project_name}. Error: {str(e)}"
		)
		frappe.logger().error(f"[Project User Permissions] {error_msg}")
		frappe.log_error(error_msg, "Project User Permissions - Remove")
		# Don't raise - let the project save succeed even if permission removal fails
		return False

