"""
Comprehensive Unit Tests for TOIL (Time Off In Lieu) System

This test suite covers:
1. TOIL calculation (8 hours = 1 day)
2. API methods (get_toil_balance, calculate_toil_preview, etc.)
3. Supervisor validation and permissions
4. Expiry logic (6-month rolling window)
5. Leave allocation creation and management
6. Transaction safety and rollback scenarios

Run tests with:
    bench --site [site-name] run-tests --app frappe_devsecops_dashboard --module test_toil_system
"""

import unittest
import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import flt, getdate, add_months, add_days, nowdate
from datetime import datetime, timedelta

# Import TOIL modules
from frappe_devsecops_dashboard.utils.toil_calculator import (
    calculate_toil_hours,
    calculate_toil_days,
    validate_supervisor_permission,
    get_allocation_balance,
    check_toil_consumption
)
from frappe_devsecops_dashboard.api.toil import (
    get_toil_balance,
    get_toil_summary,
    calculate_toil_preview,
    get_supervisor_timesheets,
    approve_timesheet,
    get_user_role,
    clear_toil_cache
)
from frappe_devsecops_dashboard.tasks.toil_expiry import (
    expire_toil_allocations,
    send_expiry_reminders,
    get_employee_toil_balance
)


class TestTOILSystem(FrappeTestCase):
    """Test suite for TOIL system functionality"""

    @classmethod
    def setUpClass(cls):
        """Set up test data once for all tests"""
        super().setUpClass()

        # Clear any existing test data
        cls.cleanup_test_data()

        # Create Leave Type for TOIL
        cls.ensure_leave_type()

        # Create test users
        cls.create_test_users()

        # Create test employees with supervisor relationship
        cls.create_test_employees()

        # Create test projects and activities
        cls.create_test_projects()

    @classmethod
    def tearDownClass(cls):
        """Clean up test data"""
        cls.cleanup_test_data()
        super().tearDownClass()

    def setUp(self):
        """Set up before each test"""
        frappe.set_user("Administrator")
        clear_toil_cache()

    def tearDown(self):
        """Clean up after each test"""
        frappe.set_user("Administrator")
        clear_toil_cache()

    # ============================================================================
    # TEST DATA SETUP
    # ============================================================================

    @classmethod
    def cleanup_test_data(cls):
        """Remove all test data"""
        try:
            # Delete test timesheets
            frappe.db.delete("Timesheet", {"employee": ["like", "TEST-EMP-%"]})

            # Delete test leave applications
            frappe.db.delete("Leave Application", {"employee": ["like", "TEST-EMP-%"]})

            # Delete test leave allocations
            frappe.db.delete("Leave Allocation", {"employee": ["like", "TEST-EMP-%"]})

            # Delete test employees
            frappe.db.delete("Employee", {"name": ["like", "TEST-EMP-%"]})

            # Delete test users
            for email in ["test.employee@toil.test", "test.supervisor@toil.test"]:
                if frappe.db.exists("User", email):
                    frappe.delete_doc("User", email, force=True)

            frappe.db.commit()
        except Exception as e:
            frappe.logger().warning(f"Cleanup warning: {str(e)}")

    @classmethod
    def ensure_leave_type(cls):
        """Ensure Time Off in Lieu leave type exists"""
        if not frappe.db.exists("Leave Type", "Time Off in Lieu"):
            leave_type = frappe.get_doc({
                "doctype": "Leave Type",
                "leave_type_name": "Time Off in Lieu",
                "is_carry_forward": 0,
                "is_optional_leave": 0,
                "allow_negative": 0,
                "include_holiday": 0,
                "is_compensatory": 0,
                "max_continuous_days_allowed": 30,
                "applicable_after": 0
            })
            leave_type.insert(ignore_permissions=True)
            frappe.db.commit()

    @classmethod
    def create_test_users(cls):
        """Create test users for employee and supervisor"""
        users = [
            {
                "email": "test.employee@toil.test",
                "first_name": "Test",
                "last_name": "Employee",
                "role": "Employee"
            },
            {
                "email": "test.supervisor@toil.test",
                "first_name": "Test",
                "last_name": "Supervisor",
                "role": "HR Manager"
            }
        ]

        for user_data in users:
            if not frappe.db.exists("User", user_data["email"]):
                user = frappe.get_doc({
                    "doctype": "User",
                    "email": user_data["email"],
                    "first_name": user_data["first_name"],
                    "last_name": user_data["last_name"],
                    "send_welcome_email": 0,
                    "roles": [{"role": user_data["role"]}]
                })
                user.insert(ignore_permissions=True)

        frappe.db.commit()

    @classmethod
    def create_test_employees(cls):
        """Create test employees with supervisor relationship"""
        # Create supervisor employee
        if not frappe.db.exists("Employee", "TEST-EMP-SUPERVISOR"):
            supervisor = frappe.get_doc({
                "doctype": "Employee",
                "employee": "TEST-EMP-SUPERVISOR",
                "first_name": "Test",
                "last_name": "Supervisor",
                "employee_name": "Test Supervisor",
                "user_id": "test.supervisor@toil.test",
                "status": "Active",
                "date_of_joining": getdate(),
                "company": frappe.defaults.get_defaults().get("company") or "Test Company"
            })
            supervisor.insert(ignore_permissions=True)

        # Create employee under supervisor
        if not frappe.db.exists("Employee", "TEST-EMP-001"):
            employee = frappe.get_doc({
                "doctype": "Employee",
                "employee": "TEST-EMP-001",
                "first_name": "Test",
                "last_name": "Employee",
                "employee_name": "Test Employee",
                "user_id": "test.employee@toil.test",
                "reports_to": "TEST-EMP-SUPERVISOR",
                "status": "Active",
                "date_of_joining": getdate(),
                "company": frappe.defaults.get_defaults().get("company") or "Test Company"
            })
            employee.insert(ignore_permissions=True)

        frappe.db.commit()

    @classmethod
    def create_test_projects(cls):
        """Create test projects and activities for timesheets"""
        # Ensure Activity Type exists
        if not frappe.db.exists("Activity Type", "Testing"):
            activity = frappe.get_doc({
                "doctype": "Activity Type",
                "activity_type": "Testing"
            })
            activity.insert(ignore_permissions=True)

        frappe.db.commit()

    # ============================================================================
    # TEST 1: TOIL CALCULATION (8 HOURS = 1 DAY)
    # ============================================================================

    def test_toil_hours_calculation_basic(self):
        """Test basic TOIL hours calculation from non-billable time logs"""
        # Create timesheet with mixed billable/non-billable hours
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TEST-EMP-001",
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })

        # Add time logs
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=4),
            "hours": 4,
            "is_billable": 0  # Non-billable
        })

        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now() + timedelta(hours=4),
            "to_time": datetime.now() + timedelta(hours=6),
            "hours": 2,
            "is_billable": 1  # Billable - should be excluded
        })

        # Calculate TOIL
        toil_hours = calculate_toil_hours(timesheet)

        self.assertEqual(flt(toil_hours, 2), 4.0, "Should only count non-billable hours")

    def test_toil_days_conversion(self):
        """Test conversion of TOIL hours to days (8 hours = 1 day)"""
        test_cases = [
            (8.0, 1.0),      # 8 hours = 1 day
            (16.0, 2.0),     # 16 hours = 2 days
            (4.0, 0.5),      # 4 hours = 0.5 days
            (10.0, 1.25),    # 10 hours = 1.25 days
            (0.0, 0.0),      # 0 hours = 0 days
            (-5.0, 0.0),     # Negative hours = 0 days
        ]

        for hours, expected_days in test_cases:
            days = calculate_toil_days(hours)
            self.assertEqual(
                flt(days, 3),
                expected_days,
                f"{hours} hours should equal {expected_days} days"
            )

    def test_timesheet_toil_calculation_on_validate(self):
        """Test that timesheet validates and calculates TOIL correctly"""
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TEST-EMP-001",
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })

        # Add 12 hours of non-billable work
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=12),
            "hours": 12,
            "is_billable": 0
        })

        timesheet.insert(ignore_permissions=True)

        # Check calculated values
        self.assertEqual(flt(timesheet.total_toil_hours, 2), 12.0)
        self.assertEqual(flt(timesheet.toil_days, 3), 1.5)
        self.assertEqual(timesheet.toil_status, "Pending Accrual")

        # Clean up
        frappe.delete_doc("Timesheet", timesheet.name, force=True)

    # ============================================================================
    # TEST 2: SUPERVISOR VALIDATION
    # ============================================================================

    def test_supervisor_validation_success(self):
        """Test successful supervisor validation"""
        # Create timesheet
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TEST-EMP-001",
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=8),
            "hours": 8,
            "is_billable": 0
        })
        timesheet.insert(ignore_permissions=True)

        # Set user to supervisor
        frappe.set_user("test.supervisor@toil.test")

        # Validate permission
        is_valid, error_message = validate_supervisor_permission(timesheet)

        self.assertTrue(is_valid, "Supervisor should be able to approve")
        self.assertIsNone(error_message)

        # Clean up
        frappe.set_user("Administrator")
        frappe.delete_doc("Timesheet", timesheet.name, force=True)

    def test_supervisor_validation_unauthorized_user(self):
        """Test supervisor validation fails for unauthorized user"""
        # Create timesheet
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TEST-EMP-001",
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=8),
            "hours": 8,
            "is_billable": 0
        })
        timesheet.insert(ignore_permissions=True)

        # Set user to employee (not supervisor)
        frappe.set_user("test.employee@toil.test")

        # Validate permission
        is_valid, error_message = validate_supervisor_permission(timesheet)

        self.assertFalse(is_valid, "Employee should not be able to approve own timesheet")
        self.assertIsNotNone(error_message)

        # Clean up
        frappe.set_user("Administrator")
        frappe.delete_doc("Timesheet", timesheet.name, force=True)

    def test_supervisor_validation_missing_supervisor(self):
        """Test supervisor validation fails when employee has no supervisor"""
        # Create employee without supervisor
        if not frappe.db.exists("Employee", "TEST-EMP-NO-SUP"):
            emp = frappe.get_doc({
                "doctype": "Employee",
                "employee": "TEST-EMP-NO-SUP",
                "first_name": "No",
                "last_name": "Supervisor",
                "employee_name": "No Supervisor",
                "status": "Active",
                "date_of_joining": getdate(),
                "company": frappe.defaults.get_defaults().get("company") or "Test Company"
            })
            emp.insert(ignore_permissions=True)

        # Create timesheet
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TEST-EMP-NO-SUP",
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=8),
            "hours": 8,
            "is_billable": 0
        })
        timesheet.insert(ignore_permissions=True)

        # Validate permission
        is_valid, error_message = validate_supervisor_permission(timesheet)

        self.assertFalse(is_valid, "Should fail when employee has no supervisor")
        self.assertIn("no supervisor", error_message.lower())

        # Clean up
        frappe.delete_doc("Timesheet", timesheet.name, force=True)
        frappe.delete_doc("Employee", "TEST-EMP-NO-SUP", force=True)

    # ============================================================================
    # TEST 3: API METHODS
    # ============================================================================

    def test_api_get_toil_balance(self):
        """Test get_toil_balance API method"""
        frappe.set_user("test.supervisor@toil.test")

        # Create and submit timesheet to generate TOIL
        timesheet = self._create_and_submit_timesheet("TEST-EMP-001", 8)

        # Get balance
        result = get_toil_balance("TEST-EMP-001")

        self.assertTrue(result.get("success"))
        self.assertEqual(result.get("employee"), "TEST-EMP-001")
        self.assertGreaterEqual(flt(result.get("balance"), 3), 1.0)

        # Clean up
        self._cleanup_timesheet(timesheet)

    def test_api_calculate_toil_preview(self):
        """Test calculate_toil_preview API method"""
        frappe.set_user("test.employee@toil.test")

        # Create draft timesheet
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TEST-EMP-001",
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=10),
            "hours": 10,
            "is_billable": 0
        })
        timesheet.insert(ignore_permissions=True)

        # Get preview
        result = calculate_toil_preview(timesheet.name)

        self.assertTrue(result.get("success"))
        self.assertEqual(flt(result.get("total_toil_hours"), 2), 10.0)
        self.assertEqual(flt(result.get("toil_days"), 3), 1.25)
        self.assertTrue(result.get("can_submit"))
        self.assertEqual(len(result.get("breakdown")), 1)

        # Clean up
        frappe.set_user("Administrator")
        frappe.delete_doc("Timesheet", timesheet.name, force=True)

    def test_api_get_user_role(self):
        """Test get_user_role API method"""
        # Test employee role
        frappe.set_user("test.employee@toil.test")
        result = get_user_role()
        self.assertTrue(result.get("success"))
        self.assertEqual(result.get("role"), "employee")

        # Test supervisor role
        frappe.set_user("test.supervisor@toil.test")
        result = get_user_role()
        self.assertTrue(result.get("success"))
        self.assertEqual(result.get("role"), "supervisor")
        self.assertGreater(result.get("subordinates_count", 0), 0)

    def test_api_get_supervisor_timesheets(self):
        """Test get_supervisor_timesheets API method"""
        frappe.set_user("test.supervisor@toil.test")

        # Create draft timesheet for subordinate
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TEST-EMP-001",
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=8),
            "hours": 8,
            "is_billable": 0
        })
        timesheet.insert(ignore_permissions=True)

        # Get timesheets
        result = get_supervisor_timesheets()

        self.assertTrue(result.get("success"))
        self.assertIsInstance(result.get("data"), list)
        self.assertGreater(result.get("total", 0), 0)

        # Clean up
        frappe.set_user("Administrator")
        frappe.delete_doc("Timesheet", timesheet.name, force=True)

    # ============================================================================
    # TEST 4: EXPIRY LOGIC
    # ============================================================================

    def test_expiry_6_month_window(self):
        """Test that TOIL expires after 6 months"""
        # Create allocation with old date
        old_date = add_months(getdate(), -7)  # 7 months ago

        allocation = frappe.get_doc({
            "doctype": "Leave Allocation",
            "employee": "TEST-EMP-001",
            "leave_type": "Time Off in Lieu",
            "from_date": old_date,
            "to_date": add_months(old_date, 6),
            "new_leaves_allocated": 1.0,
            "is_toil_allocation": 1
        })
        allocation.insert(ignore_permissions=True)
        allocation.submit()

        # Run expiry task
        expired_count = expire_toil_allocations()

        # Check that allocation was marked as expired
        ledger_entries = frappe.get_all(
            "Leave Ledger Entry",
            filters={
                "transaction_name": allocation.name,
                "is_expired": 1
            }
        )

        self.assertGreater(len(ledger_entries), 0, "Allocation should be marked as expired")

        # Clean up
        frappe.delete_doc("Leave Allocation", allocation.name, force=True)

    def test_expiry_reminders(self):
        """Test expiry reminder system"""
        # Create allocation expiring in 15 days
        from_date = getdate()
        to_date = add_days(getdate(), 15)

        allocation = frappe.get_doc({
            "doctype": "Leave Allocation",
            "employee": "TEST-EMP-001",
            "leave_type": "Time Off in Lieu",
            "from_date": from_date,
            "to_date": to_date,
            "new_leaves_allocated": 2.0,
            "is_toil_allocation": 1
        })
        allocation.insert(ignore_permissions=True)
        allocation.submit()

        # Test helper function
        balance = get_employee_toil_balance("TEST-EMP-001")
        self.assertGreaterEqual(balance, 2.0)

        # Clean up
        frappe.delete_doc("Leave Allocation", allocation.name, force=True)

    # ============================================================================
    # TEST 5: LEAVE ALLOCATION MANAGEMENT
    # ============================================================================

    def test_allocation_creation_on_submit(self):
        """Test that Leave Allocation is created when timesheet is submitted"""
        frappe.set_user("test.supervisor@toil.test")

        timesheet = self._create_and_submit_timesheet("TEST-EMP-001", 8)

        # Verify allocation was created
        self.assertIsNotNone(timesheet.toil_allocation)
        self.assertTrue(frappe.db.exists("Leave Allocation", timesheet.toil_allocation))

        allocation = frappe.get_doc("Leave Allocation", timesheet.toil_allocation)
        self.assertEqual(allocation.employee, "TEST-EMP-001")
        self.assertEqual(flt(allocation.new_leaves_allocated, 3), 1.0)
        self.assertEqual(allocation.is_toil_allocation, 1)

        # Clean up
        self._cleanup_timesheet(timesheet)

    def test_allocation_creation_rounds_up_fractional_toil_days(self):
        """Test that fractional TOIL days are rounded up for allocation."""
        frappe.set_user("test.supervisor@toil.test")

        # 6 hours => 0.75 TOIL day, but allocation should be ceiling(0.75) = 1
        timesheet = self._create_and_submit_timesheet("TEST-EMP-001", 6)

        self.assertIsNotNone(timesheet.toil_allocation)
        self.assertTrue(frappe.db.exists("Leave Allocation", timesheet.toil_allocation))

        allocation = frappe.get_doc("Leave Allocation", timesheet.toil_allocation)
        self.assertEqual(flt(timesheet.toil_days, 3), 0.75)
        self.assertEqual(flt(allocation.new_leaves_allocated, 3), 1.0)

        # Clean up
        self._cleanup_timesheet(timesheet)

    def test_allocation_reused_for_multiple_timesheets_same_period(self):
        """Test that additional timesheets top up active allocation instead of overlapping."""
        frappe.set_user("test.supervisor@toil.test")

        first = self._create_and_submit_timesheet("TEST-EMP-001", 8)   # 1 day
        second = self._create_and_submit_timesheet("TEST-EMP-001", 6)  # 0.75 -> 1 day

        self.assertIsNotNone(first.toil_allocation)
        self.assertEqual(second.toil_allocation, first.toil_allocation)

        allocation = frappe.get_doc("Leave Allocation", first.toil_allocation)
        self.assertEqual(flt(allocation.new_leaves_allocated, 3), 2.0)

        # Clean up in reverse submit order
        self._cleanup_timesheet(second)
        self._cleanup_timesheet(first)

    def test_cancelling_one_timesheet_reduces_shared_allocation(self):
        """Test that cancellation reverses only the cancelled timesheet accrual."""
        frappe.set_user("test.supervisor@toil.test")

        first = self._create_and_submit_timesheet("TEST-EMP-001", 8)   # 1 day
        second = self._create_and_submit_timesheet("TEST-EMP-001", 8)  # 1 day
        shared_allocation = first.toil_allocation

        self.assertEqual(second.toil_allocation, shared_allocation)
        allocation = frappe.get_doc("Leave Allocation", shared_allocation)
        self.assertEqual(flt(allocation.new_leaves_allocated, 3), 2.0)

        # Cancel one timesheet and verify allocation remains with reduced amount.
        frappe.set_user("Administrator")
        second.reload()
        second.cancel()
        second.reload()

        allocation.reload()
        self.assertEqual(allocation.docstatus, 1)
        self.assertEqual(flt(allocation.new_leaves_allocated, 3), 1.0)

        # Clean up
        self._cleanup_timesheet(second)
        self._cleanup_timesheet(first)

    def test_allocation_cancellation_protection(self):
        """Test that timesheet cannot be cancelled if TOIL is consumed"""
        frappe.set_user("test.supervisor@toil.test")

        # Create and submit timesheet
        timesheet = self._create_and_submit_timesheet("TEST-EMP-001", 8)

        # Create leave application consuming TOIL
        leave_app = frappe.get_doc({
            "doctype": "Leave Application",
            "employee": "TEST-EMP-001",
            "leave_type": "Time Off in Lieu",
            "from_date": getdate(),
            "to_date": getdate(),
            "total_leave_days": 0.5,
            "leave_allocation": timesheet.toil_allocation
        })
        leave_app.insert(ignore_permissions=True)
        leave_app.submit()

        # Check consumption
        has_consumed, allocated, consumed = check_toil_consumption(timesheet.toil_allocation)
        self.assertTrue(has_consumed, "TOIL should be marked as consumed")
        self.assertGreater(consumed, 0)

        # Try to cancel timesheet - should fail
        frappe.set_user("Administrator")
        timesheet.reload()

        with self.assertRaises(frappe.ValidationError):
            timesheet.cancel()

        # Clean up
        leave_app.cancel()
        frappe.delete_doc("Leave Application", leave_app.name, force=True)
        self._cleanup_timesheet(timesheet)

    def test_allocation_balance_calculation(self):
        """Test allocation balance calculation"""
        frappe.set_user("test.supervisor@toil.test")

        # Create and submit timesheet
        timesheet = self._create_and_submit_timesheet("TEST-EMP-001", 16)  # 2 days

        # Get initial balance
        balance = get_allocation_balance(timesheet.toil_allocation)
        self.assertEqual(flt(balance, 3), 2.0)

        # Consume some TOIL
        leave_app = frappe.get_doc({
            "doctype": "Leave Application",
            "employee": "TEST-EMP-001",
            "leave_type": "Time Off in Lieu",
            "from_date": getdate(),
            "to_date": getdate(),
            "total_leave_days": 0.5,
            "leave_allocation": timesheet.toil_allocation
        })
        leave_app.insert(ignore_permissions=True)
        leave_app.submit()

        # Get new balance
        new_balance = get_allocation_balance(timesheet.toil_allocation)
        self.assertEqual(flt(new_balance, 3), 1.5)

        # Clean up
        frappe.set_user("Administrator")
        leave_app.cancel()
        frappe.delete_doc("Leave Application", leave_app.name, force=True)
        self._cleanup_timesheet(timesheet)

    # ============================================================================
    # HELPER METHODS
    # ============================================================================

    def _create_and_submit_timesheet(self, employee, hours):
        """Helper to create and submit a timesheet with TOIL hours"""
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": employee,
            "company": frappe.defaults.get_defaults().get("company") or "Test Company"
        })
        timesheet.append("time_logs", {
            "activity_type": "Testing",
            "from_time": datetime.now(),
            "to_time": datetime.now() + timedelta(hours=hours),
            "hours": hours,
            "is_billable": 0
        })
        timesheet.insert(ignore_permissions=True)
        timesheet.submit()

        return timesheet

    def _cleanup_timesheet(self, timesheet):
        """Helper to clean up timesheet and related allocations"""
        frappe.set_user("Administrator")

        try:
            # Cancel and delete allocation if exists
            if timesheet.toil_allocation:
                if frappe.db.exists("Leave Allocation", timesheet.toil_allocation):
                    allocation = frappe.get_doc("Leave Allocation", timesheet.toil_allocation)
                    if allocation.docstatus == 1:
                        allocation.cancel()
                    frappe.delete_doc("Leave Allocation", allocation.name, force=True)

            # Cancel and delete timesheet
            timesheet.reload()
            if timesheet.docstatus == 1:
                timesheet.cancel()
            frappe.delete_doc("Timesheet", timesheet.name, force=True)

        except Exception as e:
            frappe.logger().warning(f"Cleanup error: {str(e)}")


# ============================================================================
# RUN TESTS
# ============================================================================

def run_tests():
    """Run all TOIL system tests"""
    suite = unittest.TestLoader().loadTestsFromTestCase(TestTOILSystem)
    unittest.TextTestRunner(verbosity=2).run(suite)


if __name__ == "__main__":
    run_tests()
