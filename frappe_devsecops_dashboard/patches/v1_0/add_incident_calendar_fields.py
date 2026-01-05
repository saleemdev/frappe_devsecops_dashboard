"""
Migration script to add calendar view fields to Devsecops Dashboard Incident
Adds: resolution_date, source, finding_id, region, resource, publicly_accessible, action_taken, threat_intel

This migration:
1. Validates that the DocType exists
2. Verifies all new fields exist in the DocType schema
3. Clears cache to ensure fresh load
4. Is safe to run multiple times (idempotent)
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def execute():
    """
    Add new fields to Devsecops Dashboard Incident DocType
    Safe to run multiple times - checks if fields already exist
    """
    frappe.logger().info("Starting migration: add_incident_calendar_fields")

    # Check if DocType exists
    if not frappe.db.exists('DocType', 'Devsecops Dashboard Incident'):
        frappe.logger().warning("Devsecops Dashboard Incident DocType not found, skipping migration")
        return

    try:
        # Reload DocType to get fresh schema
        frappe.reload_doc('frappe_devsecops_dashboard', 'doctype', 'devsecops_dashboard_incident')

        # Verify new fields exist
        doctype_meta = frappe.get_meta('Devsecops Dashboard Incident')
        new_fields = [
            'resolution_date',
            'source',
            'finding_id',
            'region',
            'resource',
            'publicly_accessible',
            'action_taken',
            'threat_intel'
        ]

        existing_fields = [f.fieldname for f in doctype_meta.fields]
        missing_fields = [f for f in new_fields if f not in existing_fields]

        if missing_fields:
            frappe.logger().warning(f"Fields not found in DocType: {missing_fields}")
            frappe.logger().info("Please add fields via Customize Form or update JSON file")
        else:
            frappe.logger().info(f"All {len(new_fields)} calendar view fields exist in DocType")

        # Clear cache
        frappe.clear_cache(doctype='Devsecops Dashboard Incident')

        frappe.db.commit()
        frappe.logger().info("Migration completed: add_incident_calendar_fields")

    except Exception as e:
        frappe.logger().error(f"Migration failed: {str(e)}")
        frappe.db.rollback()
        raise
