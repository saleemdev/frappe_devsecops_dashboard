import frappe
from frappe import _

def get_context(context):
    """
    Custom login page that redirects to all-trails route.
    """
    # If user is already logged in, redirect to all-trails
    if frappe.session.user != "Guest":
        frappe.local.flags.redirect_location = "/all-trails/"
        raise frappe.Redirect
    
    # Otherwise, show the login page
    context.no_cache = 1
    context.show_sidebar = True