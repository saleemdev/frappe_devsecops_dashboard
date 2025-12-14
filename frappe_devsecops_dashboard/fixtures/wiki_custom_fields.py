"""
Add custom fields to Wiki doctypes for DevSecOps Dashboard integration
Run this via: bench execute frappe_devsecops_dashboard.fixtures.wiki_custom_fields.add_wiki_custom_fields
"""

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields


def add_wiki_custom_fields():
	"""Add custom fields needed for Wiki integration"""

	custom_fields = {
		"Wiki Page": [
			{
				"fieldname": "wiki_space",
				"label": "Wiki Space",
				"fieldtype": "Link",
				"options": "Wiki Space",
				"insert_after": "allow_guest",
				"description": "Wiki Space this page belongs to"
			}
		],
		"Wiki Space": [
			{
				"fieldname": "description",
				"label": "Description",
				"fieldtype": "Text",
				"insert_after": "space_name",
				"description": "Brief description of this wiki space"
			}
		]
	}

	print("Creating custom fields for Wiki integration...")
	create_custom_fields(custom_fields, update=True)
	frappe.db.commit()
	print("✓ Custom fields created successfully!")
	print("  - Wiki Page: wiki_space (Link to Wiki Space)")
	print("  - Wiki Space: description (Text field)")
