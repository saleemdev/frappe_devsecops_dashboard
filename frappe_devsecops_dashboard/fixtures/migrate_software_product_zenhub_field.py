"""
Migration Script: Move custom_zenhub_workspace_id to zenhub_workspace_id

This script migrates data from custom_zenhub_workspace_id to zenhub_workspace_id
and then removes the custom field.

Run with: bench --site <site> migrate
"""

import frappe


def migrate_software_product_zenhub_field():
    """Migrate custom_zenhub_workspace_id to zenhub_workspace_id for Software Product"""
    try:
        # Step 1: Migrate data from custom_zenhub_workspace_id to zenhub_workspace_id
        # Check if custom field exists first
        custom_field_exists = frappe.db.exists("Custom Field", "Software Product-custom_zenhub_workspace_id")
        
        if not custom_field_exists:
            print("ℹ️  Custom field 'custom_zenhub_workspace_id' does not exist - skipping data migration")
            products = []
        else:
            # Try to get products with custom field (may fail if field doesn't exist in DB)
            try:
                products = frappe.get_all(
                    "Software Product",
                    filters={"custom_zenhub_workspace_id": ["!=", ""]},
                    fields=["name", "custom_zenhub_workspace_id", "zenhub_workspace_id"]
                )
            except Exception as query_error:
                # Field might not exist in database schema yet
                frappe.logger().warning(f"Could not query custom_zenhub_workspace_id: {str(query_error)}")
                products = []
        
        migrated_count = 0
        for product in products:
            # Only migrate if zenhub_workspace_id is empty
            if not product.get("zenhub_workspace_id") and product.get("custom_zenhub_workspace_id"):
                frappe.db.set_value(
                    "Software Product",
                    product.name,
                    "zenhub_workspace_id",
                    product.custom_zenhub_workspace_id,
                    update_modified=False
                )
                migrated_count += 1
                frappe.logger().info(
                    f"Migrated workspace ID for Software Product {product.name}: {product.custom_zenhub_workspace_id}"
                )
        
        frappe.db.commit()
        
        if migrated_count > 0:
            print(f"✅ Migrated {migrated_count} Software Product(s) from custom_zenhub_workspace_id to zenhub_workspace_id")
        else:
            print("ℹ️  No Software Products needed migration")
        
        # Step 2: Delete the custom field
        if frappe.db.exists("Custom Field", "Software Product-custom_zenhub_workspace_id"):
            custom_field = frappe.get_doc("Custom Field", "Software Product-custom_zenhub_workspace_id")
            custom_field.delete(ignore_permissions=True)
            frappe.db.commit()
            print("✅ Deleted custom_zenhub_workspace_id field from Software Product")
        else:
            print("ℹ️  Custom field 'custom_zenhub_workspace_id' not found (may have been already removed)")
        
        # Step 3: Remove from field_order via property setter (if exists)
        # field_order is stored as a property setter, not directly on DocType
        property_setter_name = "Software Product-main-field_order"
        if frappe.db.exists("Property Setter", property_setter_name):
            try:
                import json
                prop_setter = frappe.get_doc("Property Setter", property_setter_name)
                if prop_setter.value:
                    field_order = json.loads(prop_setter.value)
                    if "custom_zenhub_workspace_id" in field_order:
                        field_order.remove("custom_zenhub_workspace_id")
                        prop_setter.value = json.dumps(field_order)
                        prop_setter.save(ignore_permissions=True)
                        frappe.db.commit()
                        print("✅ Removed custom_zenhub_workspace_id from Software Product field_order")
            except Exception as e:
                frappe.logger().warning(f"Could not update field_order property setter: {str(e)}")
        
        # Also check the DocType JSON file directly (for app-level changes)
        # The JSON file is already updated, so this is just for cleanup
        
        return {
            "success": True,
            "migrated_count": migrated_count
        }
        
    except Exception as e:
        frappe.log_error(
            title="Software Product Zenhub Field Migration Error",
            message=f"Failed to migrate custom_zenhub_workspace_id: {str(e)}"
        )
        print(f"❌ Error during migration: {str(e)}")
        raise

