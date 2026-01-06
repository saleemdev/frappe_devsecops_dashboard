# Copyright (c) 2026, Defendicon and Contributors
# See license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import nowdate, add_days


class TestProjectTaskIntegration(FrappeTestCase):
	"""Test Task creation and updates via ProjectDetail component"""

	def setUp(self):
		"""Set up test data"""
		self.test_user = frappe.session.user
		
		# Create test project
		if not frappe.db.exists("Project", "Test DevSecOps Project"):
			self.project = frappe.get_doc({
				"doctype": "Project",
				"project_name": "Test DevSecOps Project",
				"status": "Open",
				"priority": "Medium"
			})
			self.project.insert(ignore_permissions=True)
		else:
			self.project = frappe.get_doc("Project", "Test DevSecOps Project")

	def tearDown(self):
		"""Clean up test data"""
		frappe.db.rollback()

	def test_task_creation_with_all_fields(self):
		"""Test creating a task with all fields from EnhancedTaskDialog"""
		task = frappe.get_doc({
			"doctype": "Task",
			"subject": "Test Task - All Fields",
			"project": self.project.name,
			"priority": "High",
			"status": "Open",
			"task_type": "Bug",
			"exp_start_date": nowdate(),
			"exp_end_date": add_days(nowdate(), 7),
			"description": "Test task description",
			"progress": 0,
			"is_milestone": 0
		})
		task.insert(ignore_permissions=True)

		# Verify all fields
		self.assertEqual(task.subject, "Test Task - All Fields")
		self.assertEqual(task.project, self.project.name)
		self.assertEqual(task.priority, "High")
		self.assertEqual(task.status, "Open")
		self.assertEqual(task.task_type, "Bug")
		self.assertIsNotNone(task.exp_start_date)
		self.assertIsNotNone(task.exp_end_date)
		self.assertEqual(task.description, "Test task description")
		self.assertEqual(task.progress, 0)
		self.assertEqual(task.is_milestone, 0)

	def test_task_update_fields(self):
		"""Test updating task fields"""
		task = frappe.get_doc({
			"doctype": "Task",
			"subject": "Test Update Task",
			"project": self.project.name,
			"priority": "Low",
			"status": "Open"
		})
		task.insert(ignore_permissions=True)

		# Update fields
		task.priority = "Urgent"
		task.status = "Working"
		task.progress = 50
		task.description = "Updated description"
		task.save(ignore_permissions=True)

		# Verify updates
		updated_task = frappe.get_doc("Task", task.name)
		self.assertEqual(updated_task.priority, "Urgent")
		self.assertEqual(updated_task.status, "Working")
		self.assertEqual(updated_task.progress, 50)
		self.assertEqual(updated_task.description, "Updated description")

	def test_task_date_fields_string_format(self):
		"""Test that task dates can be set as strings (YYYY-MM-DD)"""
		task = frappe.get_doc({
			"doctype": "Task",
			"subject": "Test Date Format Task",
			"project": self.project.name,
			"exp_start_date": "2026-01-10",
			"exp_end_date": "2026-01-20"
		})
		task.insert(ignore_permissions=True)

		# Verify dates are stored correctly
		self.assertEqual(str(task.exp_start_date), "2026-01-10")
		self.assertEqual(str(task.exp_end_date), "2026-01-20")

	def test_task_priority_options(self):
		"""Test all valid priority options"""
		priorities = ["Low", "Medium", "High", "Urgent"]

		for priority in priorities:
			task = frappe.get_doc({
				"doctype": "Task",
				"subject": f"Test Priority - {priority}",
				"project": self.project.name,
				"priority": priority
			})
			task.insert(ignore_permissions=True)
			self.assertEqual(task.priority, priority)

	def test_task_status_options(self):
		"""Test all valid status options"""
		statuses = ["Open", "Working", "Pending Review", "Overdue", "Completed", "Cancelled"]

		for status in statuses:
			task = frappe.get_doc({
				"doctype": "Task",
				"subject": f"Test Status - {status}",
				"project": self.project.name,
				"status": status
			})
			task.insert(ignore_permissions=True)
			self.assertEqual(task.status, status)

	def test_task_milestone_flag(self):
		"""Test is_milestone field"""
		# Regular task
		task1 = frappe.get_doc({
			"doctype": "Task",
			"subject": "Regular Task",
			"project": self.project.name,
			"is_milestone": 0
		})
		task1.insert(ignore_permissions=True)
		self.assertEqual(task1.is_milestone, 0)

		# Milestone task
		task2 = frappe.get_doc({
			"doctype": "Task",
			"subject": "Milestone Task",
			"project": self.project.name,
			"is_milestone": 1
		})
		task2.insert(ignore_permissions=True)
		self.assertEqual(task2.is_milestone, 1)

	def test_task_progress_field(self):
		"""Test progress field (0-100)"""
		task = frappe.get_doc({
			"doctype": "Task",
			"subject": "Test Progress Task",
			"project": self.project.name,
			"progress": 25
		})
		task.insert(ignore_permissions=True)
		self.assertEqual(task.progress, 25)

		# Update progress
		task.progress = 75
		task.save(ignore_permissions=True)
		self.assertEqual(task.progress, 75)

	def test_task_description_field(self):
		"""Test description field (HTML content)"""
		html_description = "<p>This is a <strong>test</strong> description with HTML</p>"
		task = frappe.get_doc({
			"doctype": "Task",
			"subject": "Test Description Task",
			"project": self.project.name,
			"description": html_description
		})
		task.insert(ignore_permissions=True)
		self.assertEqual(task.description, html_description)
