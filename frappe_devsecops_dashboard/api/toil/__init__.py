"""
TOIL System - Modular API Layer

This package provides a clean, modular API structure for TOIL operations.
All endpoints follow standardized response formats for React frontend consumption.

Module Structure:
- validation_api.py: Supervisor & configuration validation
- timesheet_api.py: Timesheet CRUD + approval
- leave_api.py: Leave application CRUD + approval
- balance_api.py: TOIL balance queries

Response Format:
Success: {"success": true, "data": {...}, "message": "..."}
Error: {"success": false, "error": {"code": "...", "message": "...", "field": "..."}}
"""
import frappe

# Import all whitelisted endpoints for easy access
from frappe_devsecops_dashboard.api.toil.validation_api import (
    validate_employee_setup,
    validate_employee_access,
    can_approve_timesheet,
    can_approve_leave,
    get_subordinates,
    get_current_employee,
    get_user_role
)

from frappe_devsecops_dashboard.api.toil.timesheet_api import (
    get_my_timesheets,
    get_timesheets_to_approve,
    create_timesheet,
    submit_timesheet_for_approval,
    get_timesheet,
    set_timesheet_approval,
    calculate_toil_preview,
    get_toil_breakdown
)

from frappe_devsecops_dashboard.api.toil.leave_api import (
    get_my_leave_applications,
    create_leave_application,
    submit_leave_for_approval
)

from frappe_devsecops_dashboard.api.toil.balance_api import (
    get_toil_balance_for_leave,
    get_balance_summary,
    get_toil_balance,
    get_toil_summary,
    get_leave_ledger
)


def clear_toil_cache(employee: str = None):
    """Clear TOIL cache keys."""
    cache = frappe.cache()
    if employee:
        for key in (
            f"toil-get_toil_balance-{employee}",
            f"toil-get_toil_summary-{employee}",
            f"toil-get_toil_report-{employee}",
        ):
            cache.delete_value(key)
    cache.delete_keys("toil-*")

__all__ = [
    # Validation APIs
    'validate_employee_setup',
    'validate_employee_access',
    'can_approve_timesheet',
    'can_approve_leave',
    'get_subordinates',
    'get_current_employee',
    'get_user_role',

    # Timesheet APIs
    'get_my_timesheets',
    'get_timesheets_to_approve',
    'create_timesheet',
    'submit_timesheet_for_approval',
    'get_timesheet',
    'set_timesheet_approval',
    'calculate_toil_preview',
    'get_toil_breakdown',

    # Leave APIs
    'get_my_leave_applications',
    'create_leave_application',
    'submit_leave_for_approval',

    # Balance APIs
    'get_toil_balance_for_leave',
    'get_balance_summary',
    'get_toil_balance',
    'get_toil_summary',
    'get_leave_ledger',

    # Utilities
    'clear_toil_cache'
]
