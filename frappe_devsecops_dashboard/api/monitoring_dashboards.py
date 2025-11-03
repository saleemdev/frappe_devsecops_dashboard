"""
Monitoring Dashboards API
Provides CRUD operations for managing monitoring dashboard URLs
"""

import frappe
from frappe import _
from frappe.utils import cint


@frappe.whitelist()
def get_dashboard_urls():
    """
    Get all monitoring dashboard URLs
    
    Returns:
        dict: Success response with list of dashboard URLs
    """
    try:
        # Use frappe.get_list for permission checking
        dashboards = frappe.get_list(
            "DevSecops Dashboard URL",
            fields=[
                "name",
                "dashboard_name",
                "dashboard_url",
                "dashboard_type",
                "category",
                "is_active",
                "access_level",
                "project",
                "sort_order",
                "creation",
                "modified"
            ],
            order_by="sort_order asc, creation desc",
            limit_page_length=500
        )
        
        return {
            "success": True,
            "data": dashboards or []
        }
    
    except frappe.PermissionError:
        frappe.log_error("Permission denied for dashboard URLs", "Monitoring Dashboards")
        return {
            "success": False,
            "error": "You don't have permission to access dashboard URLs"
        }
    except Exception as e:
        frappe.log_error(f"Error fetching dashboard URLs: {str(e)}", "Monitoring Dashboards")
        return {
            "success": False,
            "error": "An error occurred while fetching dashboard URLs"
        }


@frappe.whitelist()
def get_dashboard_url(name):
    """
    Get a single monitoring dashboard URL by name
    
    Args:
        name (str): Name of the dashboard URL record
    
    Returns:
        dict: Success response with dashboard URL details
    """
    try:
        if not name:
            return {
                "success": False,
                "error": "Dashboard URL name is required"
            }
        
        dashboard = frappe.get_doc("DevSecops Dashboard URL", name)
        
        return {
            "success": True,
            "data": {
                "name": dashboard.name,
                "dashboard_name": dashboard.dashboard_name,
                "dashboard_url": dashboard.dashboard_url,
                "dashboard_type": dashboard.dashboard_type,
                "category": dashboard.category,
                "is_active": dashboard.is_active,
                "description": dashboard.description or "",
                "access_level": dashboard.access_level,
                "project": dashboard.project,
                "sort_order": dashboard.sort_order,
                "creation": dashboard.creation,
                "modified": dashboard.modified
            }
        }
    
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Dashboard URL '{name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for dashboard URL {name}", "Monitoring Dashboards")
        return {
            "success": False,
            "error": "You don't have permission to access this dashboard URL"
        }
    except Exception as e:
        frappe.log_error(f"Error fetching dashboard URL {name}: {str(e)}", "Monitoring Dashboards")
        return {
            "success": False,
            "error": "An error occurred while fetching the dashboard URL"
        }


@frappe.whitelist()
def create_dashboard_url(data):
    """
    Create a new monitoring dashboard URL

    Args:
        data (dict or str): Dashboard URL data (can be JSON string or dict)

    Returns:
        dict: Success response with created record
    """
    try:
        # Parse data if it's a JSON string
        import json
        if isinstance(data, str):
            data = json.loads(data)

        # Validate required fields
        if not data.get("dashboard_name"):
            return {"success": False, "error": "Dashboard Name is required"}
        if not data.get("dashboard_url"):
            return {"success": False, "error": "Dashboard URL is required"}
        
        # Create new document
        dashboard = frappe.get_doc({
            "doctype": "DevSecops Dashboard URL",
            "dashboard_name": data.get("dashboard_name"),
            "dashboard_url": data.get("dashboard_url"),
            "dashboard_type": data.get("dashboard_type", "Custom"),
            "category": data.get("category", "Other"),
            "is_active": cint(data.get("is_active", 1)),
            "description": data.get("description", ""),
            "access_level": data.get("access_level", "Internal"),
            "project": data.get("project"),
            "sort_order": cint(data.get("sort_order", 0))
        })
        
        dashboard.insert(ignore_permissions=False)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Dashboard URL created successfully",
            "data": {
                "name": dashboard.name,
                "dashboard_name": dashboard.dashboard_name
            }
        }
    
    except frappe.DuplicateEntryError:
        return {
            "success": False,
            "error": "A dashboard URL with this name already exists"
        }
    except frappe.PermissionError:
        return {
            "success": False,
            "error": "You don't have permission to create dashboard URLs"
        }
    except Exception as e:
        frappe.log_error(f"Error creating dashboard URL: {str(e)}", "Monitoring Dashboards")
        return {
            "success": False,
            "error": f"Error creating dashboard URL: {str(e)}"
        }


@frappe.whitelist()
def update_dashboard_url(name, data):
    """
    Update an existing monitoring dashboard URL

    Args:
        name (str): Name of the dashboard URL record
        data (dict or str): Updated dashboard URL data (can be JSON string or dict)

    Returns:
        dict: Success response with updated record
    """
    try:
        # Parse data if it's a JSON string
        import json
        if isinstance(data, str):
            data = json.loads(data)

        if not name:
            return {"success": False, "error": "Dashboard URL name is required"}

        dashboard = frappe.get_doc("DevSecops Dashboard URL", name)
        
        # Update fields
        if "dashboard_name" in data:
            dashboard.dashboard_name = data.get("dashboard_name")
        if "dashboard_url" in data:
            dashboard.dashboard_url = data.get("dashboard_url")
        if "dashboard_type" in data:
            dashboard.dashboard_type = data.get("dashboard_type")
        if "category" in data:
            dashboard.category = data.get("category")
        if "is_active" in data:
            dashboard.is_active = cint(data.get("is_active"))
        if "description" in data:
            dashboard.description = data.get("description")
        if "access_level" in data:
            dashboard.access_level = data.get("access_level")
        if "project" in data:
            dashboard.project = data.get("project")
        if "sort_order" in data:
            dashboard.sort_order = cint(data.get("sort_order"))
        
        dashboard.save(ignore_permissions=False)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Dashboard URL updated successfully",
            "data": {"name": dashboard.name}
        }
    
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Dashboard URL '{name}' does not exist"
        }
    except frappe.PermissionError:
        return {
            "success": False,
            "error": "You don't have permission to update dashboard URLs"
        }
    except Exception as e:
        frappe.log_error(f"Error updating dashboard URL {name}: {str(e)}", "Monitoring Dashboards")
        return {
            "success": False,
            "error": f"Error updating dashboard URL: {str(e)}"
        }


@frappe.whitelist()
def delete_dashboard_url(name):
    """
    Delete a monitoring dashboard URL
    
    Args:
        name (str): Name of the dashboard URL record
    
    Returns:
        dict: Success response
    """
    try:
        if not name:
            return {"success": False, "error": "Dashboard URL name is required"}
        
        frappe.delete_doc("DevSecops Dashboard URL", name, ignore_permissions=False)
        frappe.db.commit()
        
        return {
            "success": True,
            "message": "Dashboard URL deleted successfully"
        }
    
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Dashboard URL '{name}' does not exist"
        }
    except frappe.PermissionError:
        return {
            "success": False,
            "error": "You don't have permission to delete dashboard URLs"
        }
    except Exception as e:
        frappe.log_error(f"Error deleting dashboard URL {name}: {str(e)}", "Monitoring Dashboards")
        return {
            "success": False,
            "error": f"Error deleting dashboard URL: {str(e)}"
        }

