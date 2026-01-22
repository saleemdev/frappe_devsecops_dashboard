import frappe
import re
from frappe import _

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        frappe.throw(_("Invalid email format"), frappe.ValidationError)

def validate_phone_number(phone):
    """Validate phone number format (Kenyan numbers)"""
    # Allow various Kenyan number formats
    pattern = r'^(?:\+254|0)?[1-9]\d{8}$'
    if not re.match(pattern, phone.replace(" ", "").replace("-", "")):
        frappe.throw(_("Invalid phone number format"), frappe.ValidationError)

def sanitize_input(text, max_length=1000):
    """Sanitize input text"""
    if not isinstance(text, str):
        return text
    
    # Remove potentially dangerous characters
    sanitized = text.strip()
    
    # Limit length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    # Escape HTML characters
    sanitized = sanitized.replace('<', '&lt;').replace('>', '&gt;')
    
    return sanitized

def validate_rating(rating):
    """Validate rating is between 1 and 5"""
    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            frappe.throw(_("Rating must be between 1 and 5"), frappe.ValidationError)
        return rating
    except ValueError:
        frappe.throw(_("Invalid rating value"), frappe.ValidationError)