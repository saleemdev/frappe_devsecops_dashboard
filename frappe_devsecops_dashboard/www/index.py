import frappe


def get_context(context):
	"""
	Provide context for the DevSecOps Dashboard landing page.
	"""
	# Disable caching to show fresh auth state
	context.no_cache = 1
	context.show_sidebar = False

	# Page metadata
	context.title = "DevSecOps Dashboard - Enterprise DevSecOps Platform"
	context.description = "Comprehensive project management and security monitoring for DevSecOps initiatives"

	# Check authentication status
	context.is_logged_in = frappe.session.user != "Guest"

	# If logged in, provide user info
	if context.is_logged_in:
		try:
			user_doc = frappe.get_doc("User", frappe.session.user)
			context.user = {
				"name": frappe.session.user or "",
				"full_name": user_doc.full_name or frappe.session.user or "",
				"image": frappe.session.user_image or ""
			}
		except Exception:
			context.user = {
				"name": frappe.session.user or "",
				"full_name": frappe.session.user or "",
				"image": ""
			}

	return context

