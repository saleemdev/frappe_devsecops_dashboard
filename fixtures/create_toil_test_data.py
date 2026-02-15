#!/usr/bin/env python3
"""
TOIL Test Data Creation Script

This script creates comprehensive test data for the TOIL (Time Off In Lieu) system including:
- Test employees with supervisor relationships
- Test timesheets with TOIL hours
- Supervisor relationships and hierarchies
- Sample leave applications using TOIL

Usage:
    # From Frappe bench directory
    bench --site [site-name] execute frappe_devsecops_dashboard.fixtures.create_toil_test_data.create_all_test_data

    # Or run individual functions:
    bench --site [site-name] console
    >>> from frappe_devsecops_dashboard.fixtures.create_toil_test_data import *
    >>> create_all_test_data()

Notes:
    - Run this on a test/development site only
    - Data is prefixed with "TOIL-TEST-" for easy cleanup
    - Existing test data will be cleaned up before creation
"""

import frappe
from frappe import _
from frappe.utils import (
    getdate, add_months, add_days, now_datetime,
    add_to_date, get_first_day, get_last_day
)
from datetime import datetime, timedelta
import random


# ============================================================================
# CONFIGURATION
# ============================================================================

TEST_DATA_CONFIG = {
    "company": None,  # Will use default company
    "department": "Operations",  # Default department
    "designation_supervisor": "Team Lead",
    "designation_employee": "Software Developer",
    "default_activity_type": "Development",
}

# Test employee data
TEST_EMPLOYEES = [
    {
        "id": "TOIL-TEST-SUP-001",
        "first_name": "Sarah",
        "last_name": "Supervisor",
        "email": "sarah.supervisor@toiltest.com",
        "role": "supervisor",
        "reports_to": None  # Top level
    },
    {
        "id": "TOIL-TEST-EMP-001",
        "first_name": "John",
        "last_name": "Developer",
        "email": "john.developer@toiltest.com",
        "role": "employee",
        "reports_to": "TOIL-TEST-SUP-001"
    },
    {
        "id": "TOIL-TEST-EMP-002",
        "first_name": "Jane",
        "last_name": "Engineer",
        "email": "jane.engineer@toiltest.com",
        "role": "employee",
        "reports_to": "TOIL-TEST-SUP-001"
    },
    {
        "id": "TOIL-TEST-EMP-003",
        "first_name": "Mike",
        "last_name": "Analyst",
        "email": "mike.analyst@toiltest.com",
        "role": "employee",
        "reports_to": "TOIL-TEST-SUP-001"
    },
]

# Test timesheet scenarios
TIMESHEET_SCENARIOS = [
    {
        "name": "Standard 8-hour day",
        "employee": "TOIL-TEST-EMP-001",
        "hours": 8,
        "billable": False,
        "date_offset_days": -5,  # 5 days ago
        "status": "submitted"
    },
    {
        "name": "Long day (12 hours)",
        "employee": "TOIL-TEST-EMP-001",
        "hours": 12,
        "billable": False,
        "date_offset_days": -10,
        "status": "submitted"
    },
    {
        "name": "Mixed billable/non-billable",
        "employee": "TOIL-TEST-EMP-002",
        "hours": 6,  # Non-billable only
        "billable": False,
        "date_offset_days": -3,
        "status": "submitted",
        "extra_entries": [
            {"hours": 4, "billable": True}  # This won't count
        ]
    },
    {
        "name": "Pending approval",
        "employee": "TOIL-TEST-EMP-002",
        "hours": 10,
        "billable": False,
        "date_offset_days": -1,
        "status": "draft"
    },
    {
        "name": "Full week (40 hours)",
        "employee": "TOIL-TEST-EMP-003",
        "hours": 40,
        "billable": False,
        "date_offset_days": -7,
        "status": "submitted"
    },
    {
        "name": "Old TOIL (expiring soon)",
        "employee": "TOIL-TEST-EMP-001",
        "hours": 8,
        "billable": False,
        "date_offset_days": -160,  # ~5 months ago
        "status": "submitted"
    },
    {
        "name": "Very old TOIL (expired)",
        "employee": "TOIL-TEST-EMP-003",
        "hours": 16,
        "billable": False,
        "date_offset_days": -200,  # ~6.5 months ago
        "status": "submitted"
    },
]

# Test leave application scenarios
LEAVE_SCENARIOS = [
    {
        "name": "Single day TOIL leave",
        "employee": "TOIL-TEST-EMP-001",
        "days": 1,
        "date_offset_days": 5,  # 5 days from now
        "status": "submitted"
    },
    {
        "name": "Half day TOIL leave",
        "employee": "TOIL-TEST-EMP-002",
        "days": 0.5,
        "date_offset_days": 3,
        "status": "draft"
    },
]


# ============================================================================
# CLEANUP FUNCTIONS
# ============================================================================

def cleanup_test_data():
    """Remove all test data created by this script"""
    print("\n" + "="*80)
    print("CLEANING UP EXISTING TEST DATA")
    print("="*80)

    try:
        # Delete in reverse dependency order
        cleanup_items = [
            ("Leave Application", {"employee": ["like", "TOIL-TEST-%"]}),
            ("Leave Allocation", {"employee": ["like", "TOIL-TEST-%"]}),
            ("Leave Ledger Entry", {"employee": ["like", "TOIL-TEST-%"]}),
            ("Timesheet", {"employee": ["like", "TOIL-TEST-%"]}),
            ("Employee", {"name": ["like", "TOIL-TEST-%"]}),
            ("User", {"email": ["like", "%@toiltest.com"]}),
        ]

        for doctype, filters in cleanup_items:
            count = frappe.db.count(doctype, filters)
            if count > 0:
                print(f"Deleting {count} {doctype} records...")
                frappe.db.delete(doctype, filters)

        frappe.db.commit()
        print("✅ Cleanup completed successfully\n")

    except Exception as e:
        print(f"⚠️ Cleanup warning: {str(e)}\n")
        frappe.db.rollback()


# ============================================================================
# SETUP FUNCTIONS
# ============================================================================

def ensure_prerequisites():
    """Ensure all required master data exists"""
    print("\n" + "="*80)
    print("ENSURING PREREQUISITES")
    print("="*80)

    # Get or use default company
    company = TEST_DATA_CONFIG["company"] or frappe.defaults.get_defaults().get("company")
    if not company:
        # Create a test company if none exists
        if not frappe.db.exists("Company", "Test Company"):
            print("Creating Test Company...")
            company_doc = frappe.get_doc({
                "doctype": "Company",
                "company_name": "Test Company",
                "abbr": "TC",
                "default_currency": "USD",
                "country": "United States"
            })
            company_doc.insert(ignore_permissions=True)
            company = "Test Company"
        else:
            company = "Test Company"

    TEST_DATA_CONFIG["company"] = company
    print(f"✅ Company: {company}")

    # Ensure Leave Type exists
    if not frappe.db.exists("Leave Type", "Time Off in Lieu"):
        print("Creating 'Time Off in Lieu' Leave Type...")
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
        print("✅ Leave Type created")
    else:
        print("✅ Leave Type exists")

    # Ensure Activity Type exists
    activity_type = TEST_DATA_CONFIG["default_activity_type"]
    if not frappe.db.exists("Activity Type", activity_type):
        print(f"Creating Activity Type: {activity_type}...")
        activity = frappe.get_doc({
            "doctype": "Activity Type",
            "activity_type": activity_type
        })
        activity.insert(ignore_permissions=True)
        print(f"✅ Activity Type '{activity_type}' created")
    else:
        print(f"✅ Activity Type '{activity_type}' exists")

    # Ensure Department exists
    department = TEST_DATA_CONFIG["department"]
    if not frappe.db.exists("Department", department):
        print(f"Creating Department: {department}...")
        dept = frappe.get_doc({
            "doctype": "Department",
            "department_name": department,
            "company": company
        })
        dept.insert(ignore_permissions=True)
        print(f"✅ Department '{department}' created")
    else:
        print(f"✅ Department '{department}' exists")

    frappe.db.commit()
    print("\n")


# ============================================================================
# USER CREATION
# ============================================================================

def create_test_users():
    """Create test users for employees and supervisors"""
    print("\n" + "="*80)
    print("CREATING TEST USERS")
    print("="*80)

    created_count = 0

    for emp_data in TEST_EMPLOYEES:
        email = emp_data["email"]

        if frappe.db.exists("User", email):
            print(f"⏭️  User already exists: {email}")
            continue

        print(f"Creating user: {email}...")

        user = frappe.get_doc({
            "doctype": "User",
            "email": email,
            "first_name": emp_data["first_name"],
            "last_name": emp_data["last_name"],
            "send_welcome_email": 0,
            "enabled": 1,
            "user_type": "System User"
        })

        # Add roles based on employee role
        if emp_data["role"] == "supervisor":
            user.append("roles", {"role": "HR Manager"})
            user.append("roles", {"role": "Employee"})
        else:
            user.append("roles", {"role": "Employee"})

        user.insert(ignore_permissions=True)
        created_count += 1
        print(f"✅ Created user: {email}")

    frappe.db.commit()
    print(f"\n✅ Created {created_count} users\n")


# ============================================================================
# EMPLOYEE CREATION
# ============================================================================

def create_test_employees():
    """Create test employees with supervisor relationships"""
    print("\n" + "="*80)
    print("CREATING TEST EMPLOYEES")
    print("="*80)

    company = TEST_DATA_CONFIG["company"]
    created_count = 0

    # Create in order (supervisors first)
    for emp_data in sorted(TEST_EMPLOYEES, key=lambda x: 0 if x["role"] == "supervisor" else 1):
        emp_id = emp_data["id"]

        if frappe.db.exists("Employee", emp_id):
            print(f"⏭️  Employee already exists: {emp_id}")
            continue

        print(f"Creating employee: {emp_id}...")

        employee = frappe.get_doc({
            "doctype": "Employee",
            "employee": emp_id,
            "first_name": emp_data["first_name"],
            "last_name": emp_data["last_name"],
            "employee_name": f"{emp_data['first_name']} {emp_data['last_name']}",
            "user_id": emp_data["email"],
            "status": "Active",
            "date_of_joining": add_days(getdate(), -365),  # Joined 1 year ago
            "company": company,
            "department": TEST_DATA_CONFIG["department"],
            "designation": (TEST_DATA_CONFIG["designation_supervisor"]
                           if emp_data["role"] == "supervisor"
                           else TEST_DATA_CONFIG["designation_employee"])
        })

        # Set supervisor relationship (if applicable)
        if emp_data["reports_to"]:
            employee.reports_to = emp_data["reports_to"]

        employee.insert(ignore_permissions=True)
        created_count += 1
        print(f"✅ Created employee: {emp_id}")

    frappe.db.commit()
    print(f"\n✅ Created {created_count} employees\n")


# ============================================================================
# TIMESHEET CREATION
# ============================================================================

def create_test_timesheets():
    """Create test timesheets with TOIL hours"""
    print("\n" + "="*80)
    print("CREATING TEST TIMESHEETS")
    print("="*80)

    company = TEST_DATA_CONFIG["company"]
    activity_type = TEST_DATA_CONFIG["default_activity_type"]
    created_count = 0

    for scenario in TIMESHEET_SCENARIOS:
        print(f"\nCreating timesheet: {scenario['name']}...")

        # Calculate date
        work_date = add_days(getdate(), scenario["date_offset_days"])
        from_time = datetime.combine(work_date, datetime.min.time()) + timedelta(hours=9)  # 9 AM start
        to_time = from_time + timedelta(hours=scenario["hours"])

        # Create timesheet
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": scenario["employee"],
            "company": company,
            "start_date": work_date,
            "end_date": work_date
        })

        # Add main time log
        timesheet.append("time_logs", {
            "activity_type": activity_type,
            "from_time": from_time,
            "to_time": to_time,
            "hours": scenario["hours"],
            "billable": 1 if scenario["billable"] else 0,
            "description": f"Test TOIL work - {scenario['name']}"
        })

        # Add extra entries if specified
        if "extra_entries" in scenario:
            for entry in scenario["extra_entries"]:
                extra_from = to_time
                extra_to = extra_from + timedelta(hours=entry["hours"])
                timesheet.append("time_logs", {
                    "activity_type": activity_type,
                    "from_time": extra_from,
                    "to_time": extra_to,
                    "hours": entry["hours"],
                    "billable": 1 if entry["billable"] else 0,
                    "description": "Extra billable work"
                })

        # Insert timesheet
        timesheet.insert(ignore_permissions=True)

        # Submit if required
        if scenario["status"] == "submitted":
            # Get supervisor for this employee
            supervisor = frappe.db.get_value("Employee", scenario["employee"], "reports_to")
            if supervisor:
                supervisor_user = frappe.db.get_value("Employee", supervisor, "user_id")
                if supervisor_user:
                    frappe.set_user(supervisor_user)
                    timesheet.submit()
                    frappe.set_user("Administrator")
                    print(f"  ✅ Submitted as {supervisor_user}")
            else:
                # Submit as admin for testing
                timesheet.submit()
                print(f"  ✅ Submitted as Administrator")

        created_count += 1
        print(f"✅ Created timesheet: {timesheet.name}")
        print(f"   - Employee: {scenario['employee']}")
        print(f"   - TOIL Hours: {scenario['hours']}")
        print(f"   - TOIL Days: {scenario['hours'] / 8}")
        print(f"   - Status: {scenario['status']}")
        if timesheet.toil_allocation:
            print(f"   - Allocation: {timesheet.toil_allocation}")

    frappe.db.commit()
    print(f"\n✅ Created {created_count} timesheets\n")


# ============================================================================
# LEAVE APPLICATION CREATION
# ============================================================================

def create_test_leave_applications():
    """Create test leave applications using TOIL balance"""
    print("\n" + "="*80)
    print("CREATING TEST LEAVE APPLICATIONS")
    print("="*80)

    created_count = 0

    for scenario in LEAVE_SCENARIOS:
        employee = scenario["employee"]

        # Check if employee has TOIL balance
        balance_data = frappe.db.sql("""
            SELECT SUM(leaves) as balance
            FROM `tabLeave Ledger Entry`
            WHERE employee = %s
            AND leave_type = 'Time Off in Lieu'
            AND docstatus = 1
            AND (is_expired IS NULL OR is_expired = 0)
        """, employee, as_dict=True)

        balance = balance_data[0].balance if balance_data and balance_data[0].balance else 0

        if balance < scenario["days"]:
            print(f"⚠️  Skipping '{scenario['name']}' - Insufficient balance")
            print(f"   Required: {scenario['days']}, Available: {balance}")
            continue

        print(f"\nCreating leave application: {scenario['name']}...")

        # Calculate leave dates
        from_date = add_days(getdate(), scenario["date_offset_days"])
        to_date = from_date if scenario["days"] <= 1 else add_days(from_date, int(scenario["days"]) - 1)

        # Get an available allocation
        allocation = frappe.db.sql("""
            SELECT la.name
            FROM `tabLeave Allocation` la
            INNER JOIN `tabLeave Ledger Entry` lle ON lle.transaction_name = la.name
            WHERE la.employee = %s
            AND la.leave_type = 'Time Off in Lieu'
            AND la.is_toil_allocation = 1
            AND la.docstatus = 1
            AND la.to_date >= %s
            GROUP BY la.name
            HAVING SUM(lle.leaves) >= %s
            ORDER BY la.from_date ASC
            LIMIT 1
        """, (employee, getdate(), scenario["days"]), as_dict=True)

        if not allocation:
            print(f"⚠️  No suitable allocation found for {scenario['name']}")
            continue

        # Create leave application
        leave_app = frappe.get_doc({
            "doctype": "Leave Application",
            "employee": employee,
            "leave_type": "Time Off in Lieu",
            "from_date": from_date,
            "to_date": to_date,
            "total_leave_days": scenario["days"],
            "leave_allocation": allocation[0].name,
            "description": f"Test TOIL leave - {scenario['name']}"
        })

        leave_app.insert(ignore_permissions=True)

        # Submit if required
        if scenario["status"] == "submitted":
            leave_app.submit()
            print(f"  ✅ Submitted")

        created_count += 1
        print(f"✅ Created leave application: {leave_app.name}")
        print(f"   - Employee: {employee}")
        print(f"   - Days: {scenario['days']}")
        print(f"   - From: {from_date} To: {to_date}")
        print(f"   - Status: {scenario['status']}")

    frappe.db.commit()
    print(f"\n✅ Created {created_count} leave applications\n")


# ============================================================================
# REPORTING FUNCTIONS
# ============================================================================

def generate_test_data_report():
    """Generate a summary report of created test data"""
    print("\n" + "="*80)
    print("TEST DATA SUMMARY REPORT")
    print("="*80)

    # Users
    users = frappe.get_all("User",
        filters={"email": ["like", "%@toiltest.com"]},
        fields=["email", "first_name", "last_name"])
    print(f"\n👤 Users Created: {len(users)}")
    for user in users:
        print(f"   - {user.email} ({user.first_name} {user.last_name})")

    # Employees
    employees = frappe.get_all("Employee",
        filters={"name": ["like", "TOIL-TEST-%"]},
        fields=["name", "employee_name", "reports_to"])
    print(f"\n👥 Employees Created: {len(employees)}")
    for emp in employees:
        supervisor = emp.reports_to or "None"
        print(f"   - {emp.name}: {emp.employee_name} → Reports to: {supervisor}")

    # Timesheets
    timesheets = frappe.get_all("Timesheet",
        filters={"employee": ["like", "TOIL-TEST-%"]},
        fields=["name", "employee", "total_toil_hours", "toil_days", "toil_status", "docstatus"])
    print(f"\n📋 Timesheets Created: {len(timesheets)}")
    for ts in timesheets:
        status = ["Draft", "Submitted", "Cancelled"][ts.docstatus]
        print(f"   - {ts.name}: {ts.total_toil_hours}h = {ts.toil_days}d ({status})")

    # Leave Allocations
    allocations = frappe.get_all("Leave Allocation",
        filters={
            "employee": ["like", "TOIL-TEST-%"],
            "is_toil_allocation": 1
        },
        fields=["name", "employee", "new_leaves_allocated", "from_date", "to_date"])
    print(f"\n📅 TOIL Allocations Created: {len(allocations)}")
    for alloc in allocations:
        print(f"   - {alloc.name}: {alloc.new_leaves_allocated} days ({alloc.from_date} to {alloc.to_date})")

    # Leave Applications
    leave_apps = frappe.get_all("Leave Application",
        filters={"employee": ["like", "TOIL-TEST-%"]},
        fields=["name", "employee", "total_leave_days", "from_date", "to_date", "docstatus"])
    print(f"\n🏖️  Leave Applications Created: {len(leave_apps)}")
    for app in leave_apps:
        status = ["Draft", "Submitted", "Cancelled"][app.docstatus]
        print(f"   - {app.name}: {app.total_leave_days} days ({status})")

    # TOIL Balance Summary
    print(f"\n💰 TOIL Balance Summary:")
    for emp in employees:
        balance_data = frappe.db.sql("""
            SELECT
                COALESCE(SUM(leaves), 0) as balance
            FROM `tabLeave Ledger Entry`
            WHERE employee = %s
            AND leave_type = 'Time Off in Lieu'
            AND docstatus = 1
            AND (is_expired IS NULL OR is_expired = 0)
        """, emp.name, as_dict=True)

        balance = balance_data[0].balance if balance_data else 0
        print(f"   - {emp.employee_name}: {balance} days")

    print("\n" + "="*80)
    print("END OF REPORT")
    print("="*80 + "\n")


# ============================================================================
# MAIN EXECUTION FUNCTIONS
# ============================================================================

def create_all_test_data():
    """
    Main function to create all test data

    This is the primary entry point for creating complete test data
    """
    print("\n" + "="*80)
    print("TOIL SYSTEM - TEST DATA CREATION")
    print("="*80)
    print(f"Started at: {now_datetime()}")
    print("="*80)

    try:
        # Set user to Administrator
        frappe.set_user("Administrator")

        # Step 1: Cleanup
        cleanup_test_data()

        # Step 2: Prerequisites
        ensure_prerequisites()

        # Step 3: Create users
        create_test_users()

        # Step 4: Create employees
        create_test_employees()

        # Step 5: Create timesheets
        create_test_timesheets()

        # Step 6: Create leave applications
        create_test_leave_applications()

        # Step 7: Generate report
        generate_test_data_report()

        print("\n" + "="*80)
        print("✅ TEST DATA CREATION COMPLETED SUCCESSFULLY")
        print("="*80)
        print(f"Completed at: {now_datetime()}")
        print("\nYou can now:")
        print("1. Login as employees or supervisors using @toiltest.com emails")
        print("2. View TOIL balances and timesheets")
        print("3. Test approval workflows")
        print("4. Run automated tests")
        print("\nTo cleanup test data later, run:")
        print("  cleanup_test_data()")
        print("="*80 + "\n")

    except Exception as e:
        print("\n" + "="*80)
        print("❌ ERROR DURING TEST DATA CREATION")
        print("="*80)
        print(f"Error: {str(e)}")
        frappe.log_error(
            title="TOIL Test Data Creation Failed",
            message=f"Error: {str(e)}"
        )
        frappe.db.rollback()
        raise

    finally:
        frappe.set_user("Administrator")


def create_minimal_test_data():
    """
    Create minimal test data for quick testing

    Useful for rapid iteration during development
    """
    print("\n" + "="*80)
    print("CREATING MINIMAL TEST DATA")
    print("="*80)

    frappe.set_user("Administrator")

    try:
        cleanup_test_data()
        ensure_prerequisites()

        # Create only 1 supervisor and 1 employee
        minimal_employees = TEST_EMPLOYEES[:2]

        for emp_data in minimal_employees:
            # Create user
            if not frappe.db.exists("User", emp_data["email"]):
                user = frappe.get_doc({
                    "doctype": "User",
                    "email": emp_data["email"],
                    "first_name": emp_data["first_name"],
                    "last_name": emp_data["last_name"],
                    "send_welcome_email": 0,
                    "roles": [{"role": "Employee"}]
                })
                user.insert(ignore_permissions=True)

            # Create employee
            if not frappe.db.exists("Employee", emp_data["id"]):
                employee = frappe.get_doc({
                    "doctype": "Employee",
                    "employee": emp_data["id"],
                    "first_name": emp_data["first_name"],
                    "last_name": emp_data["last_name"],
                    "employee_name": f"{emp_data['first_name']} {emp_data['last_name']}",
                    "user_id": emp_data["email"],
                    "reports_to": emp_data["reports_to"],
                    "status": "Active",
                    "date_of_joining": getdate(),
                    "company": TEST_DATA_CONFIG["company"]
                })
                employee.insert(ignore_permissions=True)

        # Create 1 simple timesheet
        scenario = TIMESHEET_SCENARIOS[0]
        timesheet = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": "TOIL-TEST-EMP-001",
            "company": TEST_DATA_CONFIG["company"]
        })
        timesheet.append("time_logs", {
            "activity_type": TEST_DATA_CONFIG["default_activity_type"],
            "from_time": now_datetime(),
            "to_time": add_to_date(now_datetime(), hours=8),
            "hours": 8,
            "billable": 0
        })
        timesheet.insert(ignore_permissions=True)

        frappe.db.commit()

        print("✅ Minimal test data created")
        print(f"   - 2 users/employees")
        print(f"   - 1 timesheet")

    except Exception as e:
        print(f"❌ Error: {str(e)}")
        frappe.db.rollback()
        raise

    finally:
        frappe.set_user("Administrator")


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def list_test_data():
    """List all test data in the system"""
    print("\n" + "="*80)
    print("LISTING TEST DATA")
    print("="*80)

    doctypes = [
        "User",
        "Employee",
        "Timesheet",
        "Leave Allocation",
        "Leave Application"
    ]

    for doctype in doctypes:
        if doctype == "User":
            filters = {"email": ["like", "%@toiltest.com"]}
        else:
            filters = {"name": ["like", "TOIL-TEST-%"]} if doctype == "Employee" else {"employee": ["like", "TOIL-TEST-%"]}

        count = frappe.db.count(doctype, filters)
        print(f"{doctype}: {count} records")


if __name__ == "__main__":
    # This allows the script to be run directly
    create_all_test_data()
