#!/usr/bin/env python3
"""
Test Data Generator for Change Request List View QA
====================================================

This script creates comprehensive test data for testing the Change Request
list view implementation, including:
- Test users with various roles and permissions
- Change Requests with different statuses and categories
- Multiple approver scenarios
- Edge cases and boundary conditions

Usage:
    # From Frappe bench directory
    bench execute frappe_devsecops_dashboard.test_data_generator.generate_all_test_data

    # Or run specific generators
    bench execute frappe_devsecops_dashboard.test_data_generator.create_test_users
    bench execute frappe_devsecops_dashboard.test_data_generator.create_test_change_requests

Author: QA Team
Date: February 14, 2026
"""

import frappe
from frappe.utils import today, add_days, now_datetime, add_to_date
import random


# ==============================================================================
# TEST USER CREATION
# ==============================================================================

def create_test_users():
    """
    Creates test users for different permission scenarios.

    Users created:
    - approver1@test.com - System Manager (can approve)
    - approver2@test.com - System Manager (can approve)
    - approver3@test.com - System Manager (can approve)
    - viewer@test.com - Limited permissions (read-only)
    - unauthorized@test.com - Guest (no permissions)
    """
    print("\n" + "=" * 60)
    print("CREATING TEST USERS")
    print("=" * 60)

    users = [
        {
            'email': 'approver1@test.com',
            'first_name': 'Test',
            'last_name': 'Approver One',
            'role': 'System Manager',
            'business_function': 'Security'
        },
        {
            'email': 'approver2@test.com',
            'first_name': 'Test',
            'last_name': 'Approver Two',
            'role': 'System Manager',
            'business_function': 'Operations'
        },
        {
            'email': 'approver3@test.com',
            'first_name': 'Test',
            'last_name': 'Approver Three',
            'role': 'System Manager',
            'business_function': 'Management'
        },
        {
            'email': 'viewer@test.com',
            'first_name': 'Test',
            'last_name': 'Viewer',
            'role': 'Guest',
            'business_function': None
        },
        {
            'email': 'unauthorized@test.com',
            'first_name': 'Test',
            'last_name': 'Unauthorized',
            'role': 'Guest',
            'business_function': None
        }
    ]

    created_count = 0
    skipped_count = 0

    for user_data in users:
        email = user_data['email']

        if frappe.db.exists('User', email):
            print(f"⏭️  Skipped: {email} (already exists)")
            skipped_count += 1
            continue

        try:
            user = frappe.get_doc({
                'doctype': 'User',
                'email': email,
                'first_name': user_data['first_name'],
                'last_name': user_data['last_name'],
                'enabled': 1,
                'send_welcome_email': 0,
                'user_type': 'System User'
            })
            user.insert(ignore_permissions=True)
            user.add_roles(user_data['role'])

            print(f"✅ Created: {email} (Role: {user_data['role']})")
            created_count += 1

        except Exception as e:
            print(f"❌ Error creating {email}: {str(e)}")

    frappe.db.commit()

    print(f"\nSummary: {created_count} created, {skipped_count} skipped")
    print("=" * 60 + "\n")

    return users


# ==============================================================================
# EMPLOYEE CREATION (Required for Change Request originator)
# ==============================================================================

def create_test_employee():
    """
    Creates a test employee for use as CR originator.
    """
    if frappe.db.exists('Employee', {'employee_name': 'Test Employee'}):
        return frappe.get_doc('Employee', {'employee_name': 'Test Employee'})

    try:
        employee = frappe.get_doc({
            'doctype': 'Employee',
            'employee_name': 'Test Employee',
            'first_name': 'Test',
            'last_name': 'Employee',
            'status': 'Active',
            'date_of_joining': today(),
            'company': frappe.defaults.get_user_default('Company') or 'Test Company'
        })
        employee.insert(ignore_permissions=True)
        frappe.db.commit()
        print(f"✅ Created employee: {employee.name}")
        return employee
    except Exception as e:
        print(f"⚠️  Could not create employee: {str(e)}")
        # Try to find any existing employee
        employees = frappe.get_all('Employee', limit=1)
        if employees:
            return frappe.get_doc('Employee', employees[0].name)
        return None


# ==============================================================================
# CHANGE REQUEST CREATION
# ==============================================================================

def create_test_change_requests(count=50):
    """
    Creates test Change Requests with various scenarios.

    Args:
        count (int): Number of Change Requests to create

    Scenarios covered:
    - Different approval statuses (Pending, Approved, Rejected)
    - Different change categories (Major, Minor, Standard, Emergency)
    - Multiple approvers per CR
    - User with multiple approval roles
    - Empty approver lists
    - Old and new submissions
    """
    print("\n" + "=" * 60)
    print(f"CREATING {count} TEST CHANGE REQUESTS")
    print("=" * 60)

    # Ensure employee exists
    employee = create_test_employee()
    if not employee:
        print("❌ Cannot create Change Requests without an employee")
        return []

    approvers = ['approver1@test.com', 'approver2@test.com', 'approver3@test.com']
    categories = ['Major Change', 'Minor Change', 'Standard Change', 'Emergency Change']
    statuses = ['Pending', 'Approved', 'Rejected']
    approval_statuses = [
        'Pending Review',
        'Approved for Implementation',
        'Rework',
        'Not Accepted',
        'Withdrawn',
        'Deferred'
    ]
    business_functions = ['Security', 'Operations', 'Management', 'Finance', 'Legal']

    created_crs = []

    for i in range(count):
        try:
            # Vary submission dates (last 60 days)
            submission_date = add_days(today(), -random.randint(0, 60))

            cr = frappe.get_doc({
                'doctype': 'Change Request',
                'title': f'Test Change Request {i+1:04d}',
                'submission_date': submission_date,
                'system_affected': 'Test System',
                'originator_name': employee.name,
                'change_category': categories[i % len(categories)],
                'detailed_description': f'<p>This is a test Change Request for QA testing purposes.</p>'
                                       f'<p>CR Number: {i+1}</p>'
                                       f'<p>Category: {categories[i % len(categories)]}</p>',
                'approval_status': random.choice(approval_statuses),
                'downtime_expected': random.choice([0, 1]),
                'release_notes': f'<p>Test release notes for CR {i+1}</p>',
                'testing_plan': f'<p>Test plan for CR {i+1}</p>',
                'rollback_plan': f'<p>Rollback plan for CR {i+1}</p>',
                'implementation_date': add_days(today(), random.randint(1, 30))
            })

            cr.insert(ignore_permissions=True)

            # Add approvers based on scenario
            if i % 10 == 0:
                # Scenario 1: No approvers (edge case)
                print(f"  📝 {cr.name}: No approvers (edge case)")

            elif i % 10 == 1:
                # Scenario 2: Single approver - Pending
                cr.append('change_approvers', {
                    'user': approvers[0],
                    'business_function': business_functions[0],
                    'approval_status': 'Pending'
                })
                print(f"  📝 {cr.name}: Single approver (Pending)")

            elif i % 10 == 2:
                # Scenario 3: Single approver - Approved
                cr.append('change_approvers', {
                    'user': approvers[0],
                    'business_function': business_functions[0],
                    'approval_status': 'Approved',
                    'approval_datetime': now_datetime()
                })
                print(f"  📝 {cr.name}: Single approver (Approved)")

            elif i % 10 == 3:
                # Scenario 4: Single approver - Rejected
                cr.append('change_approvers', {
                    'user': approvers[0],
                    'business_function': business_functions[0],
                    'approval_status': 'Rejected',
                    'approval_datetime': now_datetime()
                })
                print(f"  📝 {cr.name}: Single approver (Rejected)")

            elif i % 10 == 4:
                # Scenario 5: Multiple approvers - Mixed statuses
                cr.append('change_approvers', {
                    'user': approvers[0],
                    'business_function': business_functions[0],
                    'approval_status': 'Approved',
                    'approval_datetime': now_datetime()
                })
                cr.append('change_approvers', {
                    'user': approvers[1],
                    'business_function': business_functions[1],
                    'approval_status': 'Pending'
                })
                cr.append('change_approvers', {
                    'user': approvers[2],
                    'business_function': business_functions[2],
                    'approval_status': 'Pending'
                })
                print(f"  📝 {cr.name}: Multiple approvers (1 Approved, 2 Pending)")

            elif i % 10 == 5:
                # Scenario 6: Same user, multiple roles (BUG-007 test case)
                cr.append('change_approvers', {
                    'user': approvers[0],
                    'business_function': business_functions[0],
                    'approval_status': 'Approved',
                    'approval_datetime': now_datetime()
                })
                cr.append('change_approvers', {
                    'user': approvers[0],  # Same user!
                    'business_function': business_functions[1],
                    'approval_status': 'Pending'
                })
                print(f"  📝 {cr.name}: Same user, multiple roles (Approved + Pending)")

            elif i % 10 == 6:
                # Scenario 7: All approvers approved
                for approver in approvers:
                    cr.append('change_approvers', {
                        'user': approver,
                        'business_function': random.choice(business_functions),
                        'approval_status': 'Approved',
                        'approval_datetime': now_datetime()
                    })
                print(f"  📝 {cr.name}: All approvers approved")

            elif i % 10 == 7:
                # Scenario 8: All approvers pending
                for approver in approvers:
                    cr.append('change_approvers', {
                        'user': approver,
                        'business_function': random.choice(business_functions),
                        'approval_status': 'Pending'
                    })
                print(f"  📝 {cr.name}: All approvers pending")

            elif i % 10 == 8:
                # Scenario 9: Multiple approvers with one rejected
                cr.append('change_approvers', {
                    'user': approvers[0],
                    'business_function': business_functions[0],
                    'approval_status': 'Approved',
                    'approval_datetime': now_datetime()
                })
                cr.append('change_approvers', {
                    'user': approvers[1],
                    'business_function': business_functions[1],
                    'approval_status': 'Rejected',
                    'approval_datetime': now_datetime()
                })
                print(f"  📝 {cr.name}: Mixed approvals (1 Approved, 1 Rejected)")

            else:
                # Scenario 10: Random configuration
                num_approvers = random.randint(1, 3)
                for j in range(num_approvers):
                    cr.append('change_approvers', {
                        'user': random.choice(approvers),
                        'business_function': random.choice(business_functions),
                        'approval_status': random.choice(statuses),
                        'approval_datetime': now_datetime() if random.choice([True, False]) else None
                    })
                print(f"  📝 {cr.name}: Random configuration ({num_approvers} approvers)")

            cr.save(ignore_permissions=True)
            created_crs.append(cr.name)

            # Periodic commit to avoid long transactions
            if (i + 1) % 10 == 0:
                frappe.db.commit()
                print(f"\n  ✅ Committed {i+1}/{count} Change Requests\n")

        except Exception as e:
            print(f"  ❌ Error creating CR {i+1}: {str(e)}")
            frappe.db.rollback()

    frappe.db.commit()

    print(f"\n✅ Created {len(created_crs)} Change Requests")
    print("=" * 60 + "\n")

    return created_crs


# ==============================================================================
# EDGE CASE DATA CREATION
# ==============================================================================

def create_edge_case_data():
    """
    Creates specific edge case scenarios for comprehensive testing.
    """
    print("\n" + "=" * 60)
    print("CREATING EDGE CASE DATA")
    print("=" * 60)

    employee = create_test_employee()
    if not employee:
        print("❌ Cannot create edge cases without an employee")
        return

    edge_cases = []

    try:
        # Edge Case 1: CR with very long title
        cr1 = frappe.get_doc({
            'doctype': 'Change Request',
            'title': 'A' * 140,  # Maximum length test
            'submission_date': today(),
            'system_affected': 'Test System',
            'originator_name': employee.name,
            'change_category': 'Standard Change',
            'detailed_description': '<p>Test</p>',
            'approval_status': 'Pending Review'
        })
        cr1.insert(ignore_permissions=True)
        cr1.append('change_approvers', {
            'user': 'approver1@test.com',
            'business_function': 'Security',
            'approval_status': 'Pending'
        })
        cr1.save(ignore_permissions=True)
        edge_cases.append(cr1.name)
        print(f"✅ Created: Very long title test ({cr1.name})")

        # Edge Case 2: CR with special characters in title
        cr2 = frappe.get_doc({
            'doctype': 'Change Request',
            'title': "Test CR with special chars: <>&\"'",
            'submission_date': today(),
            'system_affected': 'Test System',
            'originator_name': employee.name,
            'change_category': 'Emergency Change',
            'detailed_description': '<p>Test</p>',
            'approval_status': 'Pending Review'
        })
        cr2.insert(ignore_permissions=True)
        cr2.append('change_approvers', {
            'user': 'approver1@test.com',
            'business_function': 'Security',
            'approval_status': 'Approved',
            'approval_datetime': now_datetime()
        })
        cr2.save(ignore_permissions=True)
        edge_cases.append(cr2.name)
        print(f"✅ Created: Special characters test ({cr2.name})")

        # Edge Case 3: Very old submission date
        cr3 = frappe.get_doc({
            'doctype': 'Change Request',
            'title': 'Very Old Change Request',
            'submission_date': add_days(today(), -365),  # 1 year ago
            'system_affected': 'Test System',
            'originator_name': employee.name,
            'change_category': 'Major Change',
            'detailed_description': '<p>Old CR</p>',
            'approval_status': 'Deferred'
        })
        cr3.insert(ignore_permissions=True)
        cr3.append('change_approvers', {
            'user': 'approver2@test.com',
            'business_function': 'Operations',
            'approval_status': 'Pending'
        })
        cr3.save(ignore_permissions=True)
        edge_cases.append(cr3.name)
        print(f"✅ Created: Very old submission ({cr3.name})")

        # Edge Case 4: Future implementation date (far future)
        cr4 = frappe.get_doc({
            'doctype': 'Change Request',
            'title': 'Future Implementation Test',
            'submission_date': today(),
            'system_affected': 'Test System',
            'originator_name': employee.name,
            'change_category': 'Minor Change',
            'detailed_description': '<p>Future</p>',
            'approval_status': 'Approved for Implementation',
            'implementation_date': add_days(today(), 180)  # 6 months future
        })
        cr4.insert(ignore_permissions=True)
        cr4.append('change_approvers', {
            'user': 'approver3@test.com',
            'business_function': 'Management',
            'approval_status': 'Approved',
            'approval_datetime': now_datetime()
        })
        cr4.save(ignore_permissions=True)
        edge_cases.append(cr4.name)
        print(f"✅ Created: Future implementation ({cr4.name})")

        # Edge Case 5: CR with 5 approvers (stress test)
        cr5 = frappe.get_doc({
            'doctype': 'Change Request',
            'title': 'Multiple Approvers Stress Test',
            'submission_date': today(),
            'system_affected': 'Test System',
            'originator_name': employee.name,
            'change_category': 'Major Change',
            'detailed_description': '<p>Many approvers</p>',
            'approval_status': 'Pending Review'
        })
        cr5.insert(ignore_permissions=True)

        approvers = ['approver1@test.com', 'approver2@test.com', 'approver3@test.com']
        business_functions = ['Security', 'Operations', 'Management', 'Finance', 'Legal']
        statuses = ['Pending', 'Approved', 'Rejected']

        for i in range(5):
            cr5.append('change_approvers', {
                'user': approvers[i % len(approvers)],
                'business_function': business_functions[i],
                'approval_status': statuses[i % len(statuses)],
                'approval_datetime': now_datetime() if i % 2 == 0 else None
            })

        cr5.save(ignore_permissions=True)
        edge_cases.append(cr5.name)
        print(f"✅ Created: Multiple approvers stress test ({cr5.name})")

        frappe.db.commit()

        print(f"\n✅ Created {len(edge_cases)} edge case Change Requests")
        print("=" * 60 + "\n")

        return edge_cases

    except Exception as e:
        print(f"❌ Error creating edge cases: {str(e)}")
        frappe.db.rollback()
        return []


# ==============================================================================
# PAGINATION TEST DATA
# ==============================================================================

def create_pagination_test_data():
    """
    Creates specific data for pagination testing (BUG-001).
    Creates exactly 25 CRs with approver1 as pending approver.
    """
    print("\n" + "=" * 60)
    print("CREATING PAGINATION TEST DATA")
    print("=" * 60)

    employee = create_test_employee()
    if not employee:
        print("❌ Cannot create pagination test data without an employee")
        return []

    created_crs = []

    try:
        for i in range(25):
            cr = frappe.get_doc({
                'doctype': 'Change Request',
                'title': f'Pagination Test CR {i+1:02d}',
                'submission_date': add_days(today(), -i),  # Spread over 25 days
                'system_affected': 'Test System',
                'originator_name': employee.name,
                'change_category': 'Standard Change',
                'detailed_description': f'<p>Pagination test CR {i+1}</p>',
                'approval_status': 'Pending Review'
            })
            cr.insert(ignore_permissions=True)

            # All have approver1 as pending
            cr.append('change_approvers', {
                'user': 'approver1@test.com',
                'business_function': 'Security',
                'approval_status': 'Pending'
            })

            cr.save(ignore_permissions=True)
            created_crs.append(cr.name)

            if (i + 1) % 5 == 0:
                print(f"  ✅ Created {i+1}/25 pagination test CRs")

        frappe.db.commit()

        print(f"\n✅ Created {len(created_crs)} pagination test CRs")
        print("   👉 Test with approver1@test.com")
        print("   👉 Filter 'Pending My Action' should show 25 CRs across 2 pages")
        print("=" * 60 + "\n")

        return created_crs

    except Exception as e:
        print(f"❌ Error creating pagination test data: {str(e)}")
        frappe.db.rollback()
        return []


# ==============================================================================
# CLEANUP FUNCTIONS
# ==============================================================================

def cleanup_test_data():
    """
    Removes all test data created by this script.
    WARNING: This will delete all Change Requests starting with 'Test' and all test users!
    """
    print("\n" + "=" * 60)
    print("⚠️  CLEANUP: REMOVING ALL TEST DATA")
    print("=" * 60)

    # Confirm before proceeding
    print("\nThis will delete:")
    print("  - All Change Requests with titles starting with 'Test'")
    print("  - All test users (@test.com email addresses)")
    print("  - Test employee records")

    # In a script environment, we'll proceed automatically
    # In interactive mode, you'd want to add a confirmation prompt

    try:
        # Delete test Change Requests
        test_crs = frappe.get_all(
            'Change Request',
            filters=[['title', 'like', 'Test%']],
            pluck='name'
        )

        deleted_cr_count = 0
        for cr_name in test_crs:
            frappe.delete_doc('Change Request', cr_name, force=1)
            deleted_cr_count += 1

        print(f"✅ Deleted {deleted_cr_count} test Change Requests")

        # Delete test users
        test_users = frappe.get_all(
            'User',
            filters=[['email', 'like', '%@test.com']],
            pluck='name'
        )

        deleted_user_count = 0
        for user_email in test_users:
            if user_email not in ['Administrator', 'Guest']:
                frappe.delete_doc('User', user_email, force=1)
                deleted_user_count += 1

        print(f"✅ Deleted {deleted_user_count} test users")

        # Delete test employee
        test_employees = frappe.get_all(
            'Employee',
            filters=[['employee_name', 'like', 'Test%']],
            pluck='name'
        )

        deleted_employee_count = 0
        for emp_name in test_employees:
            frappe.delete_doc('Employee', emp_name, force=1)
            deleted_employee_count += 1

        print(f"✅ Deleted {deleted_employee_count} test employees")

        frappe.db.commit()

        print("\n✅ Cleanup complete!")
        print("=" * 60 + "\n")

    except Exception as e:
        print(f"❌ Error during cleanup: {str(e)}")
        frappe.db.rollback()


# ==============================================================================
# MAIN EXECUTION FUNCTION
# ==============================================================================

def generate_all_test_data(cr_count=50, include_edge_cases=True, include_pagination_test=True):
    """
    Generates all test data needed for comprehensive QA testing.

    Args:
        cr_count (int): Number of standard Change Requests to create
        include_edge_cases (bool): Whether to create edge case scenarios
        include_pagination_test (bool): Whether to create pagination test data

    Returns:
        dict: Summary of created test data
    """
    print("\n" + "=" * 80)
    print("🧪 CHANGE REQUEST LIST VIEW - TEST DATA GENERATOR")
    print("=" * 80)
    print(f"Date: {now_datetime()}")
    print(f"User: {frappe.session.user}")
    print("=" * 80)

    summary = {
        'users': [],
        'change_requests': [],
        'edge_cases': [],
        'pagination_test': [],
        'errors': []
    }

    try:
        # Step 1: Create test users
        summary['users'] = create_test_users()

        # Step 2: Create standard Change Requests
        summary['change_requests'] = create_test_change_requests(count=cr_count)

        # Step 3: Create edge case data
        if include_edge_cases:
            summary['edge_cases'] = create_edge_case_data()

        # Step 4: Create pagination test data
        if include_pagination_test:
            summary['pagination_test'] = create_pagination_test_data()

        # Final summary
        print("\n" + "=" * 80)
        print("📊 TEST DATA GENERATION COMPLETE")
        print("=" * 80)
        print(f"✅ Users created: {len([u for u in summary['users'] if isinstance(u, dict)])}")
        print(f"✅ Change Requests: {len(summary['change_requests'])}")
        print(f"✅ Edge cases: {len(summary['edge_cases'])}")
        print(f"✅ Pagination test CRs: {len(summary['pagination_test'])}")
        print(f"❌ Errors: {len(summary['errors'])}")

        print("\n📋 NEXT STEPS:")
        print("1. Log in as 'approver1@test.com' (password: set manually)")
        print("2. Navigate to /app/change-request")
        print("3. Test filter buttons: 'Pending My Action', 'Approved By Me'")
        print("4. Verify pagination with 25+ records")
        print("5. Check memory usage after multiple navigations")
        print("6. Review QA_TEST_PLAN_CHANGE_REQUEST_LISTVIEW.md for full test cases")

        print("\n🧹 TO CLEANUP:")
        print("   bench execute frappe_devsecops_dashboard.test_data_generator.cleanup_test_data")

        print("\n" + "=" * 80 + "\n")

        return summary

    except Exception as e:
        print(f"\n❌ FATAL ERROR: {str(e)}")
        summary['errors'].append(str(e))
        frappe.db.rollback()
        return summary


# ==============================================================================
# CONVENIENCE FUNCTIONS
# ==============================================================================

def quick_setup():
    """
    Quick setup for immediate testing (5 users + 30 CRs).
    """
    return generate_all_test_data(
        cr_count=30,
        include_edge_cases=True,
        include_pagination_test=True
    )


def full_setup():
    """
    Full setup for comprehensive testing (5 users + 100 CRs).
    """
    return generate_all_test_data(
        cr_count=100,
        include_edge_cases=True,
        include_pagination_test=True
    )


def minimal_setup():
    """
    Minimal setup for quick smoke testing (3 users + 10 CRs).
    """
    create_test_users()
    return create_test_change_requests(count=10)


# ==============================================================================
# MAIN ENTRY POINT
# ==============================================================================

if __name__ == '__main__':
    print(__doc__)
    print("\nThis script is meant to be executed via 'bench execute'")
    print("Example: bench execute frappe_devsecops_dashboard.test_data_generator.generate_all_test_data")
