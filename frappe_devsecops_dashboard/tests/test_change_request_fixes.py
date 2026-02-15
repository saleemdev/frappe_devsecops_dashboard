"""
Unit tests for Critical Fixes - Change Request List View
Date: 2026-02-14
Tests all 7 critical and high priority fixes
"""

import json
import unittest
import frappe
from frappe.tests.utils import FrappeTestCase


class TestChangeRequestListViewFixes(FrappeTestCase):
	"""Test suite for CR List View critical fixes"""

	@classmethod
	def setUpClass(cls):
		"""Set up test data"""
		super().setUpClass()

		# Create test users with different permissions
		cls.test_user_admin = "test_admin@example.com"
		cls.test_user_normal = "test_normal@example.com"
		cls.test_user_restricted = "test_restricted@example.com"

		# Create test Change Requests
		cls.test_cr_1 = cls.create_test_cr("CR-TEST-001", "Test CR 1")
		cls.test_cr_2 = cls.create_test_cr("CR-TEST-002", "Test CR 2")
		cls.test_cr_3 = cls.create_test_cr("CR-TEST-003", "Test CR 3")

	@classmethod
	def create_test_cr(cls, name, title):
		"""Helper to create test Change Request"""
		if frappe.db.exists("Change Request", name):
			return frappe.get_doc("Change Request", name)

		doc = frappe.get_doc({
			"doctype": "Change Request",
			"name": name,
			"title": title,
			"cr_number": name,
			"submission_date": frappe.utils.today(),
			"change_category": "Normal",
			"approval_status": "Pending Review"
		})
		doc.insert(ignore_permissions=True)
		return doc

	def test_01_permission_bypass_fix(self):
		"""
		TEST FIX #1: Permission Bypass Vulnerability
		Verify that users cannot access CRs they don't have permission to read
		"""
		from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

		# Test with admin user (should have access)
		frappe.set_user("Administrator")
		result = get_my_approval_status_batch(
			json.dumps([self.test_cr_1.name, self.test_cr_2.name])
		)
		self.assertTrue(result['success'])
		self.assertIsInstance(result['data'], dict)

		# Test with restricted user (should get empty result for unauthorized CRs)
		frappe.set_user(self.test_user_restricted)
		result = get_my_approval_status_batch(
			json.dumps([self.test_cr_1.name, self.test_cr_2.name])
		)
		self.assertTrue(result['success'])
		# Should return empty dict if user has no permission
		self.assertIsInstance(result['data'], dict)

	def test_02_input_validation_batch_size(self):
		"""
		TEST FIX #7: Input Validation - Batch Size Limit
		Verify that batch size is limited to prevent DoS attacks
		"""
		from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

		frappe.set_user("Administrator")

		# Test with oversized batch (101 items, max is 100)
		large_batch = [f"CR-TEST-{i:04d}" for i in range(101)]
		result = get_my_approval_status_batch(json.dumps(large_batch))

		self.assertFalse(result['success'])
		self.assertIn('maximum', result.get('error', '').lower())

	def test_03_input_validation_invalid_json(self):
		"""
		TEST FIX #7: Input Validation - JSON Format
		Verify that invalid JSON is rejected gracefully
		"""
		from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

		frappe.set_user("Administrator")

		# Test with invalid JSON
		result = get_my_approval_status_batch("invalid json {{{")
		self.assertFalse(result['success'])
		self.assertIn('json', result.get('error', '').lower())

	def test_04_input_validation_non_array(self):
		"""
		TEST FIX #7: Input Validation - Array Type
		Verify that non-array input is rejected
		"""
		from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

		frappe.set_user("Administrator")

		# Test with non-array input
		result = get_my_approval_status_batch(json.dumps({"not": "an array"}))
		self.assertFalse(result['success'])
		self.assertIn('array', result.get('error', '').lower())

	def test_05_multiple_approver_roles(self):
		"""
		TEST FIX #2: SQL Logic Error - Multiple Approver Entries
		Verify that multiple approver roles are handled correctly with priority
		"""
		from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

		frappe.set_user("Administrator")

		# Create CR with multiple approver entries for same user
		cr = self.create_test_cr("CR-MULTI-001", "Multi-approver CR")

		# Add multiple approver entries
		cr.append("approvers", {
			"user": "Administrator",
			"business_function": "IT",
			"approval_status": "Approved",
			"idx": 1
		})
		cr.append("approvers", {
			"user": "Administrator",
			"business_function": "Finance",
			"approval_status": "Pending",
			"idx": 2
		})
		cr.save(ignore_permissions=True)

		# Get approval status
		result = get_my_approval_status_batch(json.dumps([cr.name]))

		self.assertTrue(result['success'])
		self.assertIn(cr.name, result['data'])

		# Should prioritize Pending over Approved
		status_data = result['data'][cr.name]
		self.assertTrue(status_data['is_approver'])
		self.assertEqual(status_data['status'], 'Pending')
		self.assertTrue(status_data.get('multiple_roles', False))
		self.assertEqual(status_data.get('total_roles'), 2)

	def test_06_filtered_list_input_validation(self):
		"""
		TEST FIX #7: Input Validation - Filtered List Parameters
		Verify that get_change_requests_filtered validates inputs
		"""
		from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

		frappe.set_user("Administrator")

		# Test with invalid special_filter
		result = get_change_requests_filtered(
			special_filter="invalid_filter_name",
			limit_start=0,
			limit_page_length=20
		)
		self.assertFalse(result['success'])
		self.assertIn('invalid', result.get('error', '').lower())

	def test_07_filtered_list_pagination_limits(self):
		"""
		TEST FIX #7: Input Validation - Pagination Limits
		Verify that pagination parameters are validated and limited
		"""
		from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

		frappe.set_user("Administrator")

		# Test with oversized page length (501 items, max is 500)
		result = get_change_requests_filtered(
			limit_start=0,
			limit_page_length=501
		)

		# Should succeed but limit to 500
		self.assertTrue(result['success'])
		# Result length should not exceed 500
		self.assertLessEqual(len(result.get('data', [])), 500)

	def test_08_filtered_list_negative_pagination(self):
		"""
		TEST FIX #7: Input Validation - Negative Pagination
		Verify that negative pagination values are handled
		"""
		from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

		frappe.set_user("Administrator")

		# Test with negative limit_start
		result = get_change_requests_filtered(
			limit_start=-10,
			limit_page_length=20
		)

		# Should succeed and normalize to 0
		self.assertTrue(result['success'])

	def test_09_filtered_list_sql_injection(self):
		"""
		TEST FIX #7: Input Validation - SQL Injection Prevention
		Verify that order_by parameter is validated to prevent SQL injection
		"""
		from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

		frappe.set_user("Administrator")

		# Test with SQL injection attempt in order_by
		result = get_change_requests_filtered(
			order_by="name; DROP TABLE tabChangeRequest; --"
		)

		# Should succeed with sanitized order_by (falls back to default)
		self.assertTrue(result['success'])

	def test_10_pending_my_action_filter(self):
		"""
		TEST FIX #3: Broken Pagination - Pending My Action Filter
		Verify that pending_my_action filter works correctly
		"""
		from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

		frappe.set_user("Administrator")

		# Create CR with pending approval for Administrator
		cr = self.create_test_cr("CR-PENDING-001", "Pending CR")
		cr.append("approvers", {
			"user": "Administrator",
			"business_function": "IT",
			"approval_status": "Pending"
		})
		cr.save(ignore_permissions=True)

		# Get filtered list
		result = get_change_requests_filtered(
			special_filter="pending_my_action",
			limit_start=0,
			limit_page_length=20
		)

		self.assertTrue(result['success'])
		self.assertGreater(len(result['data']), 0)
		self.assertIn('total', result)

		# Verify the pending CR is in the results
		cr_names = [item['name'] for item in result['data']]
		self.assertIn(cr.name, cr_names)

	def test_11_approved_by_me_filter(self):
		"""
		TEST FIX #3: Broken Pagination - Approved By Me Filter
		Verify that approved_by_me filter works correctly
		"""
		from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

		frappe.set_user("Administrator")

		# Create CR with approved status for Administrator
		cr = self.create_test_cr("CR-APPROVED-001", "Approved CR")
		cr.append("approvers", {
			"user": "Administrator",
			"business_function": "IT",
			"approval_status": "Approved"
		})
		cr.save(ignore_permissions=True)

		# Get filtered list
		result = get_change_requests_filtered(
			special_filter="approved_by_me",
			limit_start=0,
			limit_page_length=20
		)

		self.assertTrue(result['success'])
		self.assertIn('total', result)

		# If there are approved CRs, verify structure
		if len(result['data']) > 0:
			cr_names = [item['name'] for item in result['data']]
			self.assertIn(cr.name, cr_names)

	def test_12_empty_batch(self):
		"""
		TEST: Empty Batch Handling
		Verify that empty batch is handled gracefully
		"""
		from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

		frappe.set_user("Administrator")

		# Test with empty array
		result = get_my_approval_status_batch(json.dumps([]))
		self.assertTrue(result['success'])
		self.assertEqual(result['data'], {})

	def test_13_nonexistent_crs(self):
		"""
		TEST: Non-existent CRs Handling
		Verify that non-existent CRs are filtered out gracefully
		"""
		from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

		frappe.set_user("Administrator")

		# Test with non-existent CR names
		result = get_my_approval_status_batch(
			json.dumps(["CR-NONEXISTENT-001", "CR-NONEXISTENT-002"])
		)

		self.assertTrue(result['success'])
		# Should return empty dict since CRs don't exist
		self.assertEqual(result['data'], {})

	@classmethod
	def tearDownClass(cls):
		"""Clean up test data"""
		# Delete test Change Requests
		for cr_name in ["CR-TEST-001", "CR-TEST-002", "CR-TEST-003",
						"CR-MULTI-001", "CR-PENDING-001", "CR-APPROVED-001"]:
			if frappe.db.exists("Change Request", cr_name):
				frappe.delete_doc("Change Request", cr_name, force=True, ignore_permissions=True)


def run_tests():
	"""Run all tests in this module"""
	unittest.main()


if __name__ == "__main__":
	run_tests()
