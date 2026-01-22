import frappe
from functools import wraps

def require_authentication(f):
    """Decorator to require authentication for API endpoints"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if frappe.session.user == "Guest":
            frappe.throw("Authentication required", frappe.AuthenticationError)
        return f(*args, **kwargs)
    return wrapper

def require_roles(*roles):
    """Decorator to require specific roles for API endpoints"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if frappe.session.user == "Guest":
                frappe.throw("Authentication required", frappe.AuthenticationError)
            
            user_roles = frappe.get_roles()
            if not any(role in user_roles for role in roles):
                frappe.throw("Insufficient permissions", frappe.PermissionError)
            
            return f(*args, **kwargs)
        return wrapper
    return decorator