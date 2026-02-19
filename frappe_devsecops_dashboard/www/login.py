import frappe
from frappe import _
from frappe.apps import get_default_path
from frappe.utils.html_utils import get_icon_html
from frappe.utils.oauth import get_oauth2_authorize_url, get_oauth_keys
from frappe.utils.password import get_decrypted_password
from markupsafe import escape as escape_html
from urllib.parse import urlparse


def get_context(context):
	"""
	Provide context for the DevSecOps Dashboard custom login page.
	Handles all Frappe login use cases including MFA/OTP and social/OAuth login.
	"""
	context.no_cache = 1
	context.show_sidebar = False
	context.no_header = True

	context.title = "Sign In - DevSecOps Dashboard"
	context.description = "Sign in to DevSecOps Dashboard"

	if frappe.session.user != "Guest":
		redirect_to = get_redirect_url()
		if redirect_to:
			frappe.local.flags.redirect_location = redirect_to
			raise frappe.Redirect

	context.redirect_to = get_redirect_url()

	context.disable_user_pass_login = frappe.get_system_settings("disable_user_pass_login")
	context.allow_login_using_mobile_number = frappe.get_system_settings("allow_login_using_mobile_number")
	context.allow_login_using_user_name = frappe.get_system_settings("allow_login_using_user_name")
	context.login_with_email_link = frappe.get_system_settings("login_with_email_link")

	login_labels = []
	if not context.disable_user_pass_login:
		login_labels.append(_("Email"))
	if context.allow_login_using_mobile_number:
		login_labels.append(_("Mobile"))
	if context.allow_login_using_user_name:
		login_labels.append(_("Username"))

	context.login_label = f" {_('or')} ".join(login_labels) if login_labels else _("Email")

	# Social / OAuth login providers (mirrors frappe/www/login.py logic)
	context.provider_logins = []
	context.social_login = False

	redirect_to = context.redirect_to or "/devsecops-ui"

	providers = frappe.get_all(
		"Social Login Key",
		filters={"enable_social_login": 1},
		fields=["name", "client_id", "base_url", "provider_name", "icon"],
		order_by="name",
	)

	for provider in providers:
		client_secret = get_decrypted_password(
			"Social Login Key", provider.name, "client_secret", raise_exception=False
		)
		if not client_secret:
			continue

		icon = _get_provider_icon(provider)

		if provider.client_id and provider.base_url and get_oauth_keys(provider.name):
			context.provider_logins.append(
				{
					"name": provider.name,
					"provider_name": provider.provider_name,
					"auth_url": get_oauth2_authorize_url(provider.name, redirect_to),
					"icon": icon,
				}
			)
			context.social_login = True

	return context


def get_redirect_url():
	"""Get and sanitize redirect URL from query parameters."""
	redirect_to = frappe.form_dict.get("redirect-to")

	if not redirect_to:
		if frappe.session.user != "Guest" and frappe.session.data.user_type == "System User":
			return get_default_path() or "/devsecops-ui"
		return "/devsecops-ui"

	return sanitize_redirect(redirect_to)


def sanitize_redirect(redirect_url):
	"""Sanitize redirect URL to prevent open redirects."""
	if not redirect_url:
		return None

	parsed_redirect = urlparse(redirect_url)
	parsed_request = urlparse(frappe.local.request.url)

	if parsed_redirect.netloc and parsed_redirect.netloc != parsed_request.netloc:
		return parsed_redirect.path or "/devsecops-ui"

	if parsed_redirect.scheme and parsed_redirect.scheme != parsed_request.scheme:
		return parsed_redirect.path or "/devsecops-ui"

	if not parsed_redirect.netloc:
		return redirect_url

	return redirect_url


# Inline SVGs for providers whose default icon is a FontAwesome class
_PROVIDER_SVG_ICONS = {
	"office_365": (
		'<svg width="18" height="18" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">'
		'<rect x="1" y="1" width="9" height="9" rx="1.2" fill="#f25022"/>'
		'<rect x="11" y="1" width="9" height="9" rx="1.2" fill="#7fba00"/>'
		'<rect x="1" y="11" width="9" height="9" rx="1.2" fill="#00a4ef"/>'
		'<rect x="11" y="11" width="9" height="9" rx="1.2" fill="#ffb900"/>'
		'</svg>'
	),
	"github": (
		'<svg width="18" height="18" viewBox="0 0 24 24" fill="#24292f">'
		'<path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57'
		' 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695'
		'-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99'
		'.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225'
		'-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405'
		'c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0'
		' 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0'
		' .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>'
		'</svg>'
	),
	"google": (
		'<svg width="18" height="18" viewBox="0 0 48 48">'
		'<path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0'
		' 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>'
		'<path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26'
		' 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>'
		'<path fill="#FBBC05" d="M10.53 28.59a14.5 14.5 0 010-9.18l-7.98-6.19a24.1 24.1 0 000 21.56l7.98-6.19z"/>'
		'<path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16'
		' 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>'
		'</svg>'
	),
}


def _get_provider_icon(provider):
	"""
	Build icon HTML for a social login provider using Frappe's get_icon_html().
	Replaces FontAwesome icons with inline SVGs since we don't load FontAwesome.
	"""
	# If no icon configured, use our SVG fallback
	if not provider.icon:
		return _PROVIDER_SVG_ICONS.get(provider.name.lower())

	# Use Frappe's get_icon_html() for all providers (matches Frappe core behavior)
	icon_html = get_icon_html(provider.icon, small=True)

	# If get_icon_html returned a FontAwesome <i> tag, replace with our SVG fallback
	# (since we don't load FontAwesome in our custom login page)
	if icon_html.startswith('<i class='):
		# Check if we have an SVG fallback for this provider
		svg_fallback = _PROVIDER_SVG_ICONS.get(provider.name.lower())
		if svg_fallback:
			return svg_fallback
		# If no fallback, return empty string (button will still work without icon)
		return ""

	# For image URLs, get_icon_html returns <img> tag - return as is
	return icon_html
