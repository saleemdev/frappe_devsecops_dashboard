"""
Add ZenHub fields to Project DocType
- Project: custom_zenhub_workspace_id and custom_zenhub_project_id

Note: Software Product uses the built-in zenhub_workspace_id field (not custom_zenhub_workspace_id)
"""

import frappe


def add_zenhub_fields_to_product():
    """This function is kept for backward compatibility but no longer adds fields to Software Product"""
    # Software Product now uses the built-in zenhub_workspace_id field
    # No custom field needed
    print('ℹ️  Software Product uses built-in zenhub_workspace_id field (no custom field needed)')
    return


def add_zenhub_project_field_to_project():
    """Add ZenHub project_id field to Project DocType"""
    try:
        # Check if Project doctype exists
        if not frappe.db.exists('DocType', 'Project'):
            print('Project DocType not found, skipping...')
            return

        project_doctype = frappe.get_doc('DocType', 'Project')

        # Check if field already exists
        existing_fields = [f.fieldname for f in project_doctype.fields]
        if 'custom_zenhub_project_id' in existing_fields:
            print('ZenHub Project ID field already exists on Project')
            return

        # Find insertion point (after custom_zenhub_workspace_id if it exists)
        insert_after = 'custom_zenhub_workspace_id'
        if insert_after not in existing_fields:
            insert_after = 'name'

        # Add the field
        project_doctype.append('fields', {
            'fieldname': 'custom_zenhub_project_id',
            'fieldtype': 'Data',
            'label': 'ZenHub Project ID',
            'description': 'ZenHub project ID in the workspace',
            'insert_after': insert_after,
            'read_only': 0,
            'permlevel': 0
        })

        project_doctype.save()
        frappe.db.commit()
        print('✓ Added ZenHub Project ID field to Project')

    except Exception as e:
        frappe.log_error(f'Failed to add ZenHub Project ID field: {str(e)}', 'ZenHub Field Setup Error')
        print(f'Error: {str(e)}')


if __name__ == '__main__':
    add_zenhub_fields_to_product()
    add_zenhub_project_field_to_project()
