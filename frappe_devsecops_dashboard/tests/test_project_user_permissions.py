"""
Unit Tests for Project User Permissions Hook

Tests the automatic creation and deletion of User Permissions
when users are added to or removed from a Project.
"""

import frappe
import unittest
from frappe.test_runner import make_test_records
from frappe_devsecops_dashboard.doc_hooks.project_user_permissions import (
	handle_project_user_permissions,
	create_user_permission,
	remove_user_permission
)


class TestProjectUserPermissions(unittest.TestCase):
	"""Test cases for Project User Permissions hook"""
	
	@classmethod
	def setUpClass(cls):
		"""Set up test fixtures"""
		# Create test users if they don't exist
		cls.test_users = []
		for i in range(3):
			user_email = f"test_user_{i}@example.com"
			if not frappe.db.exists("User", user_email):
				user = frappe.new_doc("User")
				user.email = user_email
				user.first_name = f"Test User {i}"
				user.insert(ignore_permissions=True)
			cls.test_users.append(user_email)
	
	def setUp(self):
		"""Set up before each test"""
		# Create a test project
		self.project = frappe.new_doc("Project")
		self.project.project_name = f"Test Project {frappe.utils.now()}"
		self.project.status = "Open"
		self.project.insert(ignore_permissions=True)
	
	def tearDown(self):
		"""Clean up after each test"""
		# Delete test project and related User Permissions
		if frappe.db.exists("Project", self.project.name):
			# Delete User Permissions first
			perms = frappe.get_all(
				"User Permission",
				filters={"allow": "Project", "for_value": self.project.name}
			)
			for perm in perms:
				frappe.delete_doc("User Permission", perm.name, ignore_permissions=True)
			
			# Delete project
			frappe.delete_doc("Project", self.project.name, ignore_permissions=True)
	
	def test_create_user_permission_on_add_user(self):
		"""Test that User Permission is created when a user is added to project"""
		# Add a user to the project
		self.project.append("users", {"user": self.test_users[0]})
		self.project.save(ignore_permissions=True)
		
		# Check that User Permission was created
		perm_exists = frappe.db.exists(
			"User Permission",
			{
				"user": self.test_users[0],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		
		self.assertTrue(perm_exists, "User Permission should be created when user is added")
	
	def test_create_multiple_user_permissions(self):
		"""Test that multiple User Permissions are created for multiple users"""
		# Add multiple users to the project
		for user in self.test_users[:2]:
			self.project.append("users", {"user": user})
		self.project.save(ignore_permissions=True)
		
		# Check that User Permissions were created for all users
		for user in self.test_users[:2]:
			perm_exists = frappe.db.exists(
				"User Permission",
				{
					"user": user,
					"allow": "Project",
					"for_value": self.project.name
				}
			)
			self.assertTrue(
				perm_exists,
				f"User Permission should be created for user {user}"
			)
	
	def test_no_duplicate_user_permissions(self):
		"""Test that duplicate User Permissions are not created"""
		# Add a user to the project
		self.project.append("users", {"user": self.test_users[0]})
		self.project.save(ignore_permissions=True)
		
		# Save the project again without changes
		self.project.save(ignore_permissions=True)
		
		# Check that only one User Permission exists
		perms = frappe.get_all(
			"User Permission",
			filters={
				"user": self.test_users[0],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		
		self.assertEqual(
			len(perms), 1,
			"Only one User Permission should exist for the user-project combination"
		)
	
	def test_remove_user_permission_on_remove_user(self):
		"""Test that User Permission is removed when a user is removed from project"""
		# Add a user to the project
		self.project.append("users", {"user": self.test_users[0]})
		self.project.save(ignore_permissions=True)
		
		# Verify User Permission was created
		perm_exists = frappe.db.exists(
			"User Permission",
			{
				"user": self.test_users[0],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		self.assertTrue(perm_exists, "User Permission should be created")
		
		# Remove the user from the project
		self.project.users = []
		self.project.save(ignore_permissions=True)
		
		# Check that User Permission was removed
		perm_exists = frappe.db.exists(
			"User Permission",
			{
				"user": self.test_users[0],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		
		self.assertFalse(perm_exists, "User Permission should be removed when user is removed")
	
	def test_selective_user_removal(self):
		"""Test that only removed users' permissions are deleted"""
		# Add multiple users to the project
		for user in self.test_users[:2]:
			self.project.append("users", {"user": user})
		self.project.save(ignore_permissions=True)
		
		# Remove only the first user
		self.project.users = [row for row in self.project.users if row.user != self.test_users[0]]
		self.project.save(ignore_permissions=True)
		
		# Check that first user's permission was removed
		perm_exists = frappe.db.exists(
			"User Permission",
			{
				"user": self.test_users[0],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		self.assertFalse(perm_exists, "First user's permission should be removed")
		
		# Check that second user's permission still exists
		perm_exists = frappe.db.exists(
			"User Permission",
			{
				"user": self.test_users[1],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		self.assertTrue(perm_exists, "Second user's permission should still exist")
	
	def test_create_user_permission_function(self):
		"""Test the create_user_permission function directly"""
		result = create_user_permission(self.test_users[0], self.project.name)
		
		self.assertIsNotNone(result, "Function should return created permission")
		
		# Verify permission exists
		perm_exists = frappe.db.exists(
			"User Permission",
			{
				"user": self.test_users[0],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		self.assertTrue(perm_exists, "User Permission should be created")
	
	def test_remove_user_permission_function(self):
		"""Test the remove_user_permission function directly"""
		# First create a permission
		create_user_permission(self.test_users[0], self.project.name)
		
		# Then remove it
		result = remove_user_permission(self.test_users[0], self.project.name)
		
		self.assertTrue(result, "Function should return True when permission is removed")
		
		# Verify permission is gone
		perm_exists = frappe.db.exists(
			"User Permission",
			{
				"user": self.test_users[0],
				"allow": "Project",
				"for_value": self.project.name
			}
		)
		self.assertFalse(perm_exists, "User Permission should be removed")


def suite():
	"""Create test suite"""
	return unittest.TestLoader().loadTestsFromTestCase(TestProjectUserPermissions)


if __name__ == "__main__":
	unittest.main()

