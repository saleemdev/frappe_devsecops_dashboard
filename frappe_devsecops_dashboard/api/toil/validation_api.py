"""
TOIL System - Validation API
Validates supervisor configuration and employee setup before TOIL operations
"""

import frappe
from frappe import _
from typing import Dict, Any, List


def get_current_employee() -> str:
    """
    Get the employee record for the current user

    Returns:
        Employee ID or None
    """
    current_user = frappe.session.user
    return frappe.db.get_value(
        "Employee",
        {"user_id": current_user},
        "name"
    )


@frappe.whitelist()
def validate_employee_setup(employee: str = None) -> Dict[str, Any]:
    """
    Check if employee is properly configured for TOIL system

    This is the FIRST API call that should be made before any TOIL operation.
    It validates the critical supervisor configuration required for approval workflows.

    Args:
        employee: Employee ID (optional, defaults to current user)

    Returns:
        {
            "success": true/false,
            "valid": true/false,
            "employee": "EMP-001",
            "employee_name": "John Doe",
            "supervisor": "EMP-SUPER-001",
            "supervisor_name": "Jane Manager",
            "supervisor_user": "jane@company.com",
            "issues": []  # List of configuration problems
        }

    Issues checked:
    - Employee record exists
    - Employee.reports_to is not NULL
    - Supervisor has user_id assigned
    - Supervisor user account is active
    """
    try:
        # Default to current employee
        if not employee:
            employee = get_current_employee()
            if not employee:
                return {
                    "success": True,
                    "valid": False,
                    "issues": [
                        _("Your login account isn't linked to an employee profile yet. Please ask HR to complete this setup.")
                    ]
                }

        # Get employee details
        employee_data = frappe.db.get_value(
            "Employee",
            employee,
            ["name", "employee_name", "reports_to", "status"],
            as_dict=True
        )

        if not employee_data:
            return {
                "success": True,
                "valid": False,
                "issues": [
                    _("We couldn't find your employee profile. Please check with HR that your account is set up correctly.")
                ]
            }

        issues = []

        # Check if employee is active
        if employee_data.status != "Active":
            issues.append(
                _("Your employee profile is currently marked as {0}. Only active employees can use TOIL.").format(employee_data.status)
            )

        # CRITICAL CHECK: Supervisor must be assigned
        if not employee_data.reports_to:
            issues.append(
                _("You don't have a reporting manager assigned yet. HR can add this for you.")
            )
            return {
                "success": True,
                "valid": False,
                "employee": employee_data.name,
                "employee_name": employee_data.employee_name,
                "supervisor": None,
                "supervisor_name": None,
                "supervisor_user": None,
                "issues": issues
            }

        # Get supervisor details
        supervisor_data = frappe.db.get_value(
            "Employee",
            employee_data.reports_to,
            ["name", "employee_name", "user_id", "status"],
            as_dict=True
        )

        if not supervisor_data:
            issues.append(
                _("Your assigned manager ({0}) could not be found. Please ask HR to update this.").format(employee_data.reports_to)
            )
            return {
                "success": True,
                "valid": False,
                "employee": employee_data.name,
                "employee_name": employee_data.employee_name,
                "supervisor": employee_data.reports_to,
                "supervisor_name": None,
                "supervisor_user": None,
                "issues": issues
            }

        # CRITICAL CHECK: Supervisor must have user account
        if not supervisor_data.user_id:
            issues.append(
                _("Your manager ({0}) doesn't have a login account yet. HR needs to set one up so they can approve your requests.").format(
                    supervisor_data.employee_name
                )
            )

        # Check if supervisor is active
        if supervisor_data.status != "Active":
            issues.append(
                _("Your manager ({0}) is currently {1}. An active manager is needed to approve overtime requests.").format(
                    supervisor_data.employee_name,
                    supervisor_data.status.lower()
                )
            )

        # Check if supervisor user account is enabled
        if supervisor_data.user_id:
            user_enabled = frappe.db.get_value(
                "User",
                supervisor_data.user_id,
                "enabled"
            )
            if not user_enabled:
                issues.append(
                    _("Your manager's account is currently disabled. Please contact IT support to have it re-enabled.")
                )

        # Determine if setup is valid
        valid = len(issues) == 0

        return {
            "success": True,
            "valid": valid,
            "employee": employee_data.name,
            "employee_name": employee_data.employee_name,
            "supervisor": supervisor_data.name,
            "supervisor_name": supervisor_data.employee_name,
            "supervisor_user": supervisor_data.user_id,
            "issues": issues
        }

    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(
            title="TOIL Validation API Error",
            message=f"Error validating employee setup: {str(e)}"
        )
        return {
            "success": False,
            "error": {
                "code": "VALIDATION_ERROR",
                "message": _("An error occurred while validating employee setup: {0}").format(str(e)),
                "field": None
            }
        }


@frappe.whitelist()
def get_user_role() -> Dict[str, Any]:
    """
    Get the current user's TOIL role.

    Roles:
    - hr: System Manager / HR Manager
    - supervisor: employee has active subordinates
    - employee: default
    """
    try:
        current_user = frappe.session.user
        roles = frappe.get_roles(current_user)

        if "System Manager" in roles or "HR Manager" in roles:
            return {"success": True, "role": "hr"}

        employee = get_current_employee()
        if not employee:
            return {
                "success": False,
                "error": {
                    "code": "NO_EMPLOYEE_RECORD",
                    "message": _("No employee record found for current user"),
                    "field": None
                }
            }

        subordinates_count = frappe.db.count(
            "Employee",
            {"reports_to": employee, "status": "Active"}
        )

        if subordinates_count > 0:
            return {
                "success": True,
                "role": "supervisor",
                "employee": employee,
                "subordinates_count": subordinates_count
            }

        return {"success": True, "role": "employee", "employee": employee}
    except Exception as e:
        frappe.response["http_status_code"] = 500
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching user role: {0}").format(str(e)),
                "field": None
            }
        }


def validate_employee_access(employee: str) -> bool:
    """
    Validate that the current user can access the specified employee's data

    Security rules:
    1. System Manager can access all
    2. Users can access their own data
    3. Supervisors can access subordinate data

    Args:
        employee: Employee ID to validate access for

    Returns:
        bool: True if access is allowed

    Raises:
        frappe.PermissionError: If access is denied
    """
    if not employee:
        frappe.throw(_("Employee ID is required"), frappe.ValidationError)

    current_user = frappe.session.user

    # System Manager can access all
    if "System Manager" in frappe.get_roles(current_user):
        return True

    # Get current user's employee record
    current_employee = get_current_employee()

    if not current_employee:
        frappe.throw(
            _("No employee record found for current user"),
            frappe.PermissionError
        )

    # Can access own data
    if employee == current_employee:
        return True

    # Can access subordinate data (if supervisor)
    supervisor_of_employee = frappe.db.get_value(
        "Employee",
        employee,
        "reports_to"
    )

    if supervisor_of_employee == current_employee:
        return True

    # Access denied
    frappe.throw(
        _("Permission denied to access this employee's data"),
        frappe.PermissionError
    )


def can_approve_timesheet(timesheet_doc) -> bool:
    """
    Check if current user can approve the timesheet

    Approval rules:
    1. System Manager can approve all
    2. Immediate supervisor can approve
    3. Employee cannot approve their own timesheet

    Args:
        timesheet_doc: Timesheet document

    Returns:
        bool: True if user can approve
    """
    current_user = frappe.session.user

    # System Manager bypass
    if "System Manager" in frappe.get_roles(current_user):
        return True

    # Get timesheet employee's supervisor
    employee = frappe.get_cached_doc("Employee", timesheet_doc.employee)

    if not employee.reports_to:
        return False

    # Get supervisor's user ID
    supervisor_user = frappe.db.get_value(
        "Employee",
        employee.reports_to,
        "user_id"
    )

    # Current user must be the supervisor
    return current_user == supervisor_user


def can_approve_leave(leave_application_doc) -> bool:
    """
    Check if current user can approve the leave application

    Approval rules:
    1. System Manager can approve all
    2. Leave Approver can approve
    3. Immediate supervisor can approve

    Args:
        leave_application_doc: Leave Application document

    Returns:
        bool: True if user can approve
    """
    current_user = frappe.session.user

    # System Manager bypass
    if "System Manager" in frappe.get_roles(current_user):
        return True

    # Check if user is a leave approver for this employee
    if leave_application_doc.leave_approver == current_user:
        return True

    # Check if user is the immediate supervisor
    employee = frappe.get_cached_doc("Employee", leave_application_doc.employee)

    if not employee.reports_to:
        return False

    supervisor_user = frappe.db.get_value(
        "Employee",
        employee.reports_to,
        "user_id"
    )

    return current_user == supervisor_user


def get_subordinates(supervisor: str = None) -> List[Dict[str, Any]]:
    """
    Get list of subordinates for a supervisor

    Args:
        supervisor: Supervisor employee ID (defaults to current user)

    Returns:
        List of subordinate employee records
    """
    if not supervisor:
        supervisor = get_current_employee()
        if not supervisor:
            return []

    subordinates = frappe.db.sql("""
        SELECT
            name,
            employee_name,
            department,
            designation,
            status
        FROM `tabEmployee`
        WHERE reports_to = %(supervisor)s
        AND status = 'Active'
        ORDER BY employee_name
    """, {"supervisor": supervisor}, as_dict=True)

    return subordinates


@frappe.whitelist()
def get_my_team() -> Dict[str, Any]:
    """
    Get list of team members (subordinates) for the current user.
    
    Returns all employees where reports_to equals the current user's employee record.

    Returns:
        {
            "success": true,
            "data": [
                {
                    "name": "EMP-001",
                    "employee_name": "John Doe",
                    "department": "Engineering",
                    "designation": "Software Engineer",
                    "status": "Active"
                },
                ...
            ],
            "total": 5
        }
    """
    try:
        current_employee = get_current_employee()
        if not current_employee:
            return {
                "success": False,
                "error": {
                    "code": "NO_EMPLOYEE_RECORD",
                    "message": _("No employee record found for current user"),
                    "field": None
                }
            }

        subordinates = get_subordinates(current_employee)
        
        return {
            "success": True,
            "data": subordinates,
            "total": len(subordinates)
        }
    except Exception as e:
        frappe.log_error(f"Error fetching team members: {str(e)}", "TOIL API")
        return {
            "success": False,
            "error": {
                "code": "FETCH_ERROR",
                "message": _("An error occurred while fetching team members: {0}").format(str(e)),
                "field": None
            }
        }
