"""
API Routes API endpoints
Whitelisted methods for CRUD operations on API Route DocType
"""

import frappe
from frappe import _
from typing import Dict, Any, Optional
import json


@frappe.whitelist()
def get_api_routes(
    fields: Optional[str] = None,
    filters: Optional[str] = None,
    limit_start: int = 0,
    limit_page_length: int = 20,
    order_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get list of API Routes with filtering and pagination

    Args:
        fields: JSON string of field names to return
        filters: JSON string of filters in Frappe format
        limit_start: Starting index for pagination
        limit_page_length: Number of records per page
        order_by: Sort order

    Returns:
        Dict with 'data' (list of records) and 'total' (count)
    """
    try:
        frappe.logger().info(f"[get_api_routes] Called with filters={filters}")

        # Parse fields
        if fields:
            try:
                field_list = json.loads(fields) if isinstance(fields, str) else fields
            except json.JSONDecodeError as je:
                frappe.response['http_status_code'] = 400
                frappe.log_error(f"Invalid JSON in fields: {str(je)}", "API Routes API")
                frappe.throw(_('Invalid JSON format in fields'), frappe.ValidationError)
        else:
            field_list = [
                'name', 'route_name', 'software_product', 'api_version',
                'status', 'sync_status', 'uri_path', 'modified'
            ]

        # Always include 'name' for identification
        if 'name' not in field_list:
            field_list.append('name')

        # Parse filters
        filter_list = []
        if filters:
            try:
                filter_list = json.loads(filters) if isinstance(filters, str) else filters
            except json.JSONDecodeError as je:
                frappe.response['http_status_code'] = 400
                frappe.log_error(f"Invalid JSON in filters: {str(je)}", "API Routes API")
                frappe.throw(_('Invalid JSON format in filters'), frappe.ValidationError)

        # Get records with permission check
        records = frappe.get_list(
            'API Route',
            fields=field_list,
            filters=filter_list,
            limit_start=int(limit_start),
            limit_page_length=int(limit_page_length),
            order_by=order_by or 'modified desc'
        )

        # Get total count with same filters
        total = frappe.db.count('API Route', filters=filter_list or [])

        frappe.logger().info(f"[get_api_routes] Found {len(records)} records, total={total}")

        return {
            'success': True,
            'data': records,
            'total': total
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        frappe.log_error("Permission denied reading API routes", "API Routes API")
        frappe.throw(_('You do not have permission to read API Routes'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching API Routes: {str(e)}", "API Routes API")
        frappe.throw(_('An error occurred while fetching API Routes: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def get_api_route_detail(name: str) -> Dict[str, Any]:
    """
    Get a single API Route by name

    Args:
        name: The API Route name

    Returns:
        Dict with API Route data
    """
    try:
        if not name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Route ID is required'), frappe.ValidationError)

        doc = frappe.get_doc('API Route', name)

        # Check read permission
        if not doc.has_permission('read'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to read this API Route'), frappe.PermissionError)

        # Convert to dict
        data = doc.as_dict()

        return {
            'success': True,
            'data': data
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('API Route {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 403
        raise
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching API Route {name}: {str(e)}", "API Routes API")
        frappe.throw(_('An error occurred while fetching the API Route: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def create_api_route(**kwargs) -> Dict[str, Any]:
    """
    Create a new API Route

    Args:
        **kwargs: API Route fields

    Returns:
        Dict with created API Route data
    """
    try:
        # Handle JSON body from fetch requests
        if not kwargs:
            request_data = frappe.request.json or {}
            kwargs = request_data

        if not kwargs or 'route_name' not in kwargs:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Route name is required'), frappe.ValidationError)

        # Extract API keys data
        api_keys_data = kwargs.pop('api_keys', []) or []

        # Create new document
        doc = frappe.get_doc({
            'doctype': 'API Route',
            **kwargs
        })

        # Add API keys
        for key_entry in api_keys_data:
            if isinstance(key_entry, dict):
                doc.append('api_keys', {
                    'key_name': key_entry.get('key_name'),
                    'api_key': key_entry.get('api_key'),
                    'is_active': key_entry.get('is_active', 1),
                    'expires_on': key_entry.get('expires_on')
                })

        # Check create permission and insert
        doc.insert()

        frappe.response['http_status_code'] = 201
        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('API Route {0} created successfully').format(doc.route_name)
        }

    except frappe.PermissionError as pe:
        frappe.response['http_status_code'] = 403
        frappe.log_error(f"Permission denied creating route: {str(pe)}", "API Routes API")
        frappe.throw(_('You do not have permission to create API Routes'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        error_str = str(e)
        if len(error_str) > 100:
            error_str = error_str[:97] + "..."
        frappe.log_error(f"Error creating API Route: {error_str}", "API Routes API")
        frappe.throw(
            _('An error occurred while creating the API Route: {0}').format(error_str),
            frappe.ValidationError
        )


@frappe.whitelist()
def update_api_route(name: str = None, **kwargs) -> Dict[str, Any]:
    """
    Update an existing API Route

    Args:
        name: The API Route name
        **kwargs: Fields to update

    Returns:
        Dict with updated API Route data
    """
    try:
        # Handle JSON body from fetch requests
        if not kwargs:
            request_data = frappe.request.json or {}
            kwargs = request_data

        if not name:
            name = kwargs.get('name')

        if not name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Route ID is required'), frappe.ValidationError)

        # Remove 'name' from kwargs if present
        kwargs.pop('name', None)

        # Get existing document
        doc = frappe.get_doc('API Route', name)

        # Check write permission
        if not doc.has_permission('write'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to update this API Route'), frappe.PermissionError)

        # Extract API keys data
        api_keys_data = kwargs.pop('api_keys', None)

        # Update fields
        for key, value in kwargs.items():
            if key not in ['doctype', 'creation', 'modified', 'owner', 'modified_by', 'api_keys']:
                doc.set(key, value)

        # Update API keys - clear and re-add
        if api_keys_data is not None:
            doc.api_keys = []
            for key_entry in api_keys_data:
                if isinstance(key_entry, dict):
                    doc.append('api_keys', {
                        'key_name': key_entry.get('key_name'),
                        'api_key': key_entry.get('api_key'),
                        'is_active': key_entry.get('is_active', 1),
                        'expires_on': key_entry.get('expires_on')
                    })

        # Save document
        doc.save()

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('API Route {0} updated successfully').format(doc.route_name)
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('API Route {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 403
        raise
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        error_str = str(e)
        if len(error_str) > 100:
            error_str = error_str[:97] + "..."
        frappe.log_error(f"Error updating API Route {name}: {error_str}", "API Routes API")
        frappe.throw(_('An error occurred while updating the API Route: {0}').format(error_str), frappe.ValidationError)


@frappe.whitelist()
def delete_api_route(name: str) -> Dict[str, Any]:
    """
    Delete an API Route

    Args:
        name: The API Route name

    Returns:
        Dict with success status
    """
    try:
        if not name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Route ID is required'), frappe.ValidationError)

        # Get document
        doc = frappe.get_doc('API Route', name)

        # Check delete permission
        if not doc.has_permission('delete'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to delete this API Route'), frappe.PermissionError)

        # Delete document (will trigger on_trash hook to delete from APISIX)
        doc.delete()

        frappe.response['http_status_code'] = 204
        return {
            'success': True,
            'message': _('API Route {0} deleted successfully').format(name)
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('API Route {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 403
        raise
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        error_str = str(e)
        if len(error_str) > 100:
            error_str = error_str[:97] + "..."
        frappe.log_error(f"Error deleting API Route {name}: {error_str}", "API Routes API")
        frappe.throw(_('An error occurred while deleting the API Route: {0}').format(error_str), frappe.ValidationError)


@frappe.whitelist()
def sync_route_to_apisix(name: str) -> Dict[str, Any]:
    """
    Force sync API Route to APISIX

    Args:
        name: The API Route name

    Returns:
        Dict with sync status
    """
    try:
        if not name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Route ID is required'), frappe.ValidationError)

        doc = frappe.get_doc('API Route', name)

        # Check write permission
        if not doc.has_permission('write'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to sync this API Route'), frappe.PermissionError)

        # Force sync
        result = doc.force_sync()

        return {
            'success': True,
            'data': result,
            'message': _('API Route synced successfully')
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('API Route {0} not found').format(name), frappe.DoesNotExistError)
    except Exception as e:
        frappe.response['http_status_code'] = 500
        error_str = str(e)
        if len(error_str) > 100:
            error_str = error_str[:97] + "..."
        frappe.log_error(f"Error syncing API Route {name}: {error_str}", "API Routes API")
        frappe.throw(_('An error occurred while syncing the API Route: {0}').format(error_str), frappe.ValidationError)


@frappe.whitelist()
def get_software_products() -> Dict[str, Any]:
    """
    Get list of Software Products with API namespaces

    Returns:
        Dict with software products list
    """
    try:
        products = frappe.get_list(
            'Software Product',
            fields=['name', 'product_name', 'api_namespace', 'status'],
            filters={'status': 'Active'},
            order_by='product_name asc'
        )

        return {
            'success': True,
            'data': products
        }

    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching software products: {str(e)}", "API Routes API")
        frappe.throw(_('An error occurred while fetching software products: {0}').format(str(e)), frappe.ValidationError)
