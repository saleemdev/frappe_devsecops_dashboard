import frappe
from frappe import _

def get_website_user_home_page(user):
    """
    Custom function to determine the home page for users after login.
    This will redirect users to the all-trails route after login.
    """
    return "/all-trails/"

def get_login_redirect():
    """
    Custom login redirect for the all_trails app.
    Ensures users are redirected to the all-trails route after login.
    """
    # This function is called during the login process
    return "/all-trails/"

def on_session_creation(login_manager):
    """
    Hook that runs after successful login.
    Redirects user to the all-trails route after login.
    """
    # Set the redirect URL in the session
    frappe.local.response["redirect_to"] = "/all-trails/"