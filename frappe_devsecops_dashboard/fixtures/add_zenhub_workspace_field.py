"""
Add ZenHub Workspace ID custom field to Project DocType.
This fixture runs during app migration to ensure the field exists.
"""
import frappe


def add_zenhub_workspace_field():
	"""Create custom_zenhub_workspace_id field on Project DocType if it doesn't exist"""
	try:
		project_doctype = frappe.get_doc('DocType', 'Project')

		# Check if field already exists
		existing_fields = [f.fieldname for f in project_doctype.fields]
		if 'custom_zenhub_workspace_id' in existing_fields:
			print("ZenHub Workspace ID field already exists on Project")
			return

		# Find the best location to insert the field (after zenhub_project_id if it exists)
		insert_position = None
		for idx, field in enumerate(project_doctype.fields):
			if field.fieldname == 'zenhub_project_id':
				insert_position = idx + 1
				break

		# If no zenhub_project_id, add after standard_billing_rate or other project fields
		if insert_position is None:
			for idx, field in enumerate(project_doctype.fields):
				if field.fieldname in ['standard_billing_rate', 'project_type', 'project_name']:
					insert_position = idx + 1
					break

		# If still no position found, append to end of regular fields (before table fields)
		if insert_position is None:
			# Count regular fields (not table/section/column fields)
			for idx, field in enumerate(project_doctype.fields):
				if field.fieldtype not in ['Table', 'Section Break', 'Column Break', 'Tab Break']:
					insert_position = idx + 1

		if insert_position is None:
			insert_position = len(project_doctype.fields)

		# Create the custom field
		new_field = {
			'fieldname': 'custom_zenhub_workspace_id',
			'fieldtype': 'Data',
			'label': 'ZenHub Workspace ID',
			'description': 'The ZenHub workspace ID for this project. Get this from your ZenHub workspace settings.',
			'insert_after': 'project_name',
			'in_list_view': 0,
			'hidden': 0,
			'read_only': 0,
			'permlevel': 0
		}

		# Insert the field
		project_doctype.insert_before(insert_position, new_field)
		project_doctype.save()
		frappe.db.commit()

		print("ZenHub Workspace ID field added successfully to Project")

	except Exception as e:
		frappe.log_error(
			f"Failed to add ZenHub Workspace ID field: {str(e)}",
			"ZenHub Field Addition Error"
		)
		print(f"Error adding ZenHub Workspace ID field: {str(e)}")


if __name__ == '__main__':
	add_zenhub_workspace_field()
