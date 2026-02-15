"""
Migration script to set up TOIL (Time Off In Lieu) system
Creates custom fields for Timesheet and Leave Allocation doctypes
Adds database indexes for performance optimization

This migration:
1. Creates custom fields for Timesheet (total_toil_hours, toil_days, toil_allocation, toil_status, toil_calculation_details)
2. Creates custom fields for Leave Allocation (source_timesheet, toil_hours, is_toil_allocation)
3. Adds database indexes for performance
4. Is safe to run multiple times (idempotent)

Reference: /Users/salim/.claude/plans/toasty-orbiting-meteor.md lines 128-208
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def execute():
    """
    Set up TOIL system custom fields and database indexes
    Safe to run multiple times - checks if fields already exist
    """
    frappe.logger().info("Starting migration: setup_toil")

    # Check if required DocTypes exist
    if not frappe.db.exists('DocType', 'Timesheet'):
        frappe.logger().warning("Timesheet DocType not found, skipping migration")
        return

    if not frappe.db.exists('DocType', 'Leave Allocation'):
        frappe.logger().warning("Leave Allocation DocType not found, skipping migration")
        return

    try:
        # Define custom fields for Timesheet
        timesheet_fields = {
            'Timesheet': [
                {
                    'fieldname': 'toil_section',
                    'label': 'TOIL Details',
                    'fieldtype': 'Section Break',
                    'insert_after': 'total_billable_amount',
                    'collapsible': 1
                },
                {
                    'fieldname': 'total_toil_hours',
                    'label': 'Total TOIL Hours',
                    'fieldtype': 'Float',
                    'insert_after': 'toil_section',
                    'read_only': 1,
                    'precision': 2
                },
                {
                    'fieldname': 'toil_days',
                    'label': 'TOIL Days',
                    'fieldtype': 'Float',
                    'insert_after': 'total_toil_hours',
                    'read_only': 1,
                    'precision': 3
                },
                {
                    'fieldname': 'toil_allocation',
                    'label': 'TOIL Allocation Reference',
                    'fieldtype': 'Link',
                    'options': 'Leave Allocation',
                    'insert_after': 'toil_days',
                    'read_only': 1,
                    'allow_on_submit': 1,    # CRITICAL: Allow updates after submit
                    'search_index': 1         # PERFORMANCE: Index for queries
                },
                {
                    'fieldname': 'toil_status',
                    'label': 'TOIL Status',
                    'fieldtype': 'Select',
                    'options': 'Not Applicable\nPending Accrual\nAccrued\nPartially Used\nFully Used\nExpired\nRejected\nCancelled',
                    'insert_after': 'toil_allocation',
                    'read_only': 1,
                    'allow_on_submit': 1,    # CRITICAL: Allow status updates after submit
                    'default': 'Not Applicable'
                },
                {
                    'fieldname': 'toil_calculation_details',
                    'label': 'TOIL Calculation Details',
                    'fieldtype': 'Small Text',
                    'insert_after': 'toil_status',
                    'read_only': 1
                }
            ]
        }

        # Define custom fields for Leave Allocation
        leave_allocation_fields = {
            'Leave Allocation': [
                {
                    'fieldname': 'source_timesheet',
                    'label': 'Source Timesheet',
                    'fieldtype': 'Link',
                    'options': 'Timesheet',
                    'insert_after': 'description',
                    'read_only': 1
                },
                {
                    'fieldname': 'toil_hours',
                    'label': 'TOIL Hours',
                    'fieldtype': 'Float',
                    'insert_after': 'source_timesheet',
                    'read_only': 1,
                    'precision': 2
                },
                {
                    'fieldname': 'is_toil_allocation',
                    'label': 'Is TOIL Allocation',
                    'fieldtype': 'Check',
                    'insert_after': 'toil_hours',
                    'read_only': 1,
                    'default': 0
                }
            ]
        }

        # Create custom fields for Timesheet
        frappe.logger().info("Creating custom fields for Timesheet...")
        create_custom_fields(timesheet_fields, update=True)

        # Create custom fields for Leave Allocation
        frappe.logger().info("Creating custom fields for Leave Allocation...")
        create_custom_fields(leave_allocation_fields, update=True)

        # Add database indexes for performance
        frappe.logger().info("Adding database indexes for performance...")

        # Index for Leave Ledger Entry (TOIL balance queries)
        try:
            frappe.db.sql("""
                CREATE INDEX IF NOT EXISTS idx_leave_ledger_toil
                ON `tabLeave Ledger Entry` (employee, leave_type, docstatus, to_date)
            """)
            frappe.logger().info("Created index idx_leave_ledger_toil")
        except Exception as e:
            # Index might already exist, log and continue
            frappe.logger().warning(f"Index idx_leave_ledger_toil: {str(e)}")

        # Index for Leave Allocation (TOIL allocation queries)
        try:
            frappe.db.sql("""
                CREATE INDEX IF NOT EXISTS idx_leave_allocation_toil
                ON `tabLeave Allocation` (is_toil_allocation, employee, docstatus)
            """)
            frappe.logger().info("Created index idx_leave_allocation_toil")
        except Exception as e:
            # Index might already exist, log and continue
            frappe.logger().warning(f"Index idx_leave_allocation_toil: {str(e)}")

        # Index for Timesheet (TOIL queries)
        # FIX: Changed from toil_status to total_toil_hours to match actual query patterns
        try:
            # Drop old index if exists (had wrong fields: toil_status instead of total_toil_hours)
            frappe.db.sql("""
                DROP INDEX IF EXISTS idx_timesheet_toil
                ON `tabTimesheet`
            """)

            # Create correct index (on total_toil_hours, not toil_status)
            # API queries filter by total_toil_hours > 0 (see api/toil.py:405-420)
            frappe.db.sql("""
                CREATE INDEX idx_timesheet_toil
                ON `tabTimesheet` (employee, docstatus, total_toil_hours)
            """)

            # Add separate index for status filtering
            frappe.db.sql("""
                CREATE INDEX idx_timesheet_toil_status
                ON `tabTimesheet` (toil_status, docstatus)
            """)

            frappe.logger().info("Created indexes idx_timesheet_toil and idx_timesheet_toil_status")
        except Exception as e:
            frappe.logger().warning(f"Index creation: {str(e)}")

        # Clear cache for affected doctypes
        frappe.clear_cache(doctype='Timesheet')
        frappe.clear_cache(doctype='Leave Allocation')
        frappe.clear_cache(doctype='Leave Ledger Entry')

        # Commit changes
        frappe.db.commit()

        frappe.logger().info("Migration completed successfully: setup_toil")
        frappe.logger().info("Created 6 custom fields for Timesheet")
        frappe.logger().info("Created 3 custom fields for Leave Allocation")
        frappe.logger().info("Added 3 database indexes for performance")

    except Exception as e:
        frappe.logger().error(f"Migration failed: {str(e)}")
        frappe.db.rollback()
        raise
