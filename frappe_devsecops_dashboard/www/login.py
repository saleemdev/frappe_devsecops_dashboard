import frappe
from frappe import _
from frappe.apps import get_default_path
from urllib.parse import urlparse


def get_context(context):
	"""
	Provide context for the DevSecOps Dashboard custom login page.
	Handles all Frappe login use cases including MFA/OTP.
	"""
	# Disable caching for fresh auth check
	context.no_cache = 1
	context.show_sidebar = False
	context.no_header = True

	# Page metadata
	context.title = "Sign In - DevSecOps Dashboard"
	context.description = "Sign in to DevSecOps Dashboard"

	# If already logged in, redirect to app
	if frappe.session.user != "Guest":
		redirect_to = get_redirect_url()
		if redirect_to:
			frappe.local.flags.redirect_location = redirect_to
			raise frappe.Redirect

	# Get redirect destination from query parameter
	context.redirect_to = get_redirect_url()

	# Get login settings
	context.disable_user_pass_login = frappe.get_system_settings("disable_user_pass_login")
	context.allow_login_using_mobile_number = frappe.get_system_settings("allow_login_using_mobile_number")
	context.allow_login_using_user_name = frappe.get_system_settings("allow_login_using_user_name")
	context.login_with_email_link = frappe.get_system_settings("login_with_email_link")

	# Build login label
	login_labels = []
	if not context.disable_user_pass_login:
		login_labels.append(_("Email"))
	if context.allow_login_using_mobile_number:
		login_labels.append(_("Mobile"))
	if context.allow_login_using_user_name:
		login_labels.append(_("Username"))
	
	context.login_label = f" {_('or')} ".join(login_labels) if login_labels else _("Email")

	return context


def get_redirect_url():
	"""Get and sanitize redirect URL from query parameters."""
	redirect_to = frappe.form_dict.get("redirect-to")
	
	if not redirect_to:
		# Default redirect for system users
		if frappe.session.user != "Guest" and frappe.session.data.user_type == "System User":
			return get_default_path() or "/devsecops-ui"
		return "/devsecops-ui"
	
	# Sanitize redirect URL
	return sanitize_redirect(redirect_to)


def sanitize_redirect(redirect_url):
	"""
	Sanitize redirect URL to prevent open redirects.
	Only allow redirects to same domain or relative paths.
	"""
	if not redirect_url:
		return None
	
	parsed_redirect = urlparse(redirect_url)
	parsed_request = urlparse(frappe.local.request.url)
	
	# If redirect has a different netloc, only allow the path
	if parsed_redirect.netloc and parsed_redirect.netloc != parsed_request.netloc:
		return parsed_redirect.path or "/devsecops-ui"
	
	# Ensure same scheme
	if parsed_redirect.scheme and parsed_redirect.scheme != parsed_request.scheme:
		return parsed_redirect.path or "/devsecops-ui"
	
	# If it's a relative path, return as is
	if not parsed_redirect.netloc:
		return redirect_url
	
	# Return the full URL if same domain
	return redirect_url

