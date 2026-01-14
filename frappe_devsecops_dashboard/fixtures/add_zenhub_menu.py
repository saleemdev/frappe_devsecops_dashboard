"""
Add ZenHub Dashboard menu item to Projects sidebar.
This fixture runs during app migration to add the menu item.
"""
import frappe


def add_zenhub_dashboard_menu():
	"""Add ZenHub Dashboard as a shortcut in Projects workspace"""
	try:
		# Check if Projects workspace exists
		if not frappe.db.exists('Workspace', 'Projects'):
			print("Projects workspace not found, skipping ZenHub Dashboard menu addition")
			return

		# Get the Projects workspace
		workspace = frappe.get_doc('Workspace', 'Projects')

		# Check if ZenHub Dashboard shortcut already exists
		existing_items = [item.label for item in workspace.shortcuts]
		if 'ZenHub Dashboard' in existing_items:
			print("ZenHub Dashboard shortcut already exists")
			return

		# Add ZenHub Dashboard to shortcuts
		workspace.append('shortcuts', {
			'type': 'URL',
			'url': '/app/devsecops-ui#/zenhub-dashboard',
			'label': 'ZenHub Dashboard',
			'icon': 'bar-chart',
			'color': '#1890ff'
		})

		# Save the workspace
		workspace.save(ignore_permissions=True)
		print("ZenHub Dashboard shortcut added successfully")

	except Exception as e:
		frappe.log_error(f"Failed to add ZenHub Dashboard menu: {str(e)}", "ZenHub Menu Addition Error")
		print(f"Error adding ZenHub Dashboard menu: {str(e)}")


if __name__ == '__main__':
	add_zenhub_dashboard_menu()
