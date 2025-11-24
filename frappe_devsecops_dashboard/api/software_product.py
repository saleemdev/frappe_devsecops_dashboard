"""
Software Product API endpoints
Whitelisted methods for CRUD operations on Software Product DocType
"""

import frappe
from frappe import _
from typing import Dict, Any, Optional
import json


@frappe.whitelist()
def get_products(
    fields: Optional[str] = None,
    filters: Optional[str] = None,
    limit_start: int = 0,
    limit_page_length: int = 20,
    order_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get list of Software Products with filtering and pagination

    Args:
        fields: JSON string of field names to return
        filters: JSON string of filters in Frappe format
        limit_start: Starting index for pagination
        limit_page_length: Number of records per page
        order_by: Sort order (e.g., "modified desc")

    Returns:
        Dict with 'data' (list of records) and 'total' (count)
    """
    try:
        frappe.logger().info(f"[get_products] Called with fields={fields}, filters={filters}, limit_start={limit_start}, limit_page_length={limit_page_length}")

        # Parse fields
        if fields:
            try:
                field_list = json.loads(fields) if isinstance(fields, str) else fields
            except json.JSONDecodeError as je:
                frappe.response['http_status_code'] = 400
                frappe.log_error(f"Invalid JSON in fields: {str(je)}", "Software Product API")
                frappe.throw(_('Invalid JSON format in fields'), frappe.ValidationError)
        else:
            field_list = [
                'name', 'product_name', 'description', 'owner', 'status',
                'release_status', 'version', 'start_date', 'completion_date', 'modified'
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
                frappe.log_error(f"Invalid JSON in filters: {str(je)}", "Software Product API")
                frappe.throw(_('Invalid JSON format in filters'), frappe.ValidationError)

        frappe.logger().info(f"[get_products] Parsed fields={field_list}, filters={filter_list}")

        # Get records with permission check
        records = frappe.get_list(
            'Software Product',
            fields=field_list,
            filters=filter_list,
            limit_start=int(limit_start),
            limit_page_length=int(limit_page_length),
            order_by=order_by or 'modified desc'
        )

        # Get total count with same filters
        total = frappe.db.count('Software Product', filters=filter_list or [])

        frappe.logger().info(f"[get_products] Found {len(records)} records, total={total}")

        return {
            'success': True,
            'data': records,
            'total': total
        }

    except frappe.PermissionError:
        # 403 Forbidden - User lacks permissions
        frappe.response['http_status_code'] = 403
        frappe.log_error("Permission denied reading software products", "Software Product API")
        frappe.throw(_('You do not have permission to read Software Products'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        # 400 Bad Request - Validation error
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching Software Products: {str(e)}", "Software Product API")
        frappe.throw(_('An error occurred while fetching Software Products: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def get_product_detail(name: str) -> Dict[str, Any]:
    """
    Get a single Software Product by name

    Args:
        name: The Software Product name

    Returns:
        Dict with Software Product data
    """
    try:
        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Product ID is required'), frappe.ValidationError)

        doc = frappe.get_doc('Software Product', name)

        # Check read permission
        if not doc.has_permission('read'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to read this Software Product'), frappe.PermissionError)

        # Convert to dict
        data = doc.as_dict()

        # Enrich owner with full name
        if data.get('owner'):
            owner_email = data['owner']
            try:
                user_doc = frappe.get_doc('User', owner_email)
                full_name = user_doc.get('full_name') or user_doc.get('first_name') or ''
                if not full_name and user_doc.get('last_name'):
                    full_name = user_doc.get('last_name')
                data['owner_full_name'] = full_name if full_name else owner_email
            except frappe.DoesNotExistError:
                data['owner_full_name'] = owner_email
            except Exception:
                data['owner_full_name'] = owner_email
        else:
            data['owner_full_name'] = None

        # Enrich team members with user full names
        if data.get('team_members'):
            for team_member in data['team_members']:
                if team_member.get('member'):
                    try:
                        user_doc = frappe.get_doc('User', team_member['member'])
                        team_member['member_full_name'] = user_doc.full_name or team_member['member']
                    except Exception:
                        team_member['member_full_name'] = team_member['member']

        return {
            'success': True,
            'data': data
        }

    except frappe.DoesNotExistError:
        # 404 Not Found - Product doesn't exist
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Software Product {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        # 403 Forbidden - User lacks permissions
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 403
        raise
    except frappe.ValidationError as ve:
        # 400 Bad Request - Validation error (re-raise)
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching Software Product {name}: {str(e)}", "Software Product API")
        frappe.throw(_('An error occurred while fetching the Software Product: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def create_product(**kwargs) -> Dict[str, Any]:
    """
    Create a new Software Product

    Args:
        **kwargs: Software Product fields

    Returns:
        Dict with created Software Product data
    """
    try:
        # Handle JSON body from fetch requests
        if not kwargs:
            request_data = frappe.request.json or {}
            kwargs = request_data

        if not kwargs or 'product_name' not in kwargs:
            # 400 Bad Request - Missing required data
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Product name is required'), frappe.ValidationError)

        # Extract team data (handle both 'team' and 'team_members')
        team_data = kwargs.pop('team_members', None) or kwargs.pop('team', []) or []

        # Create new document
        doc = frappe.get_doc({
            'doctype': 'Software Product',
            **kwargs
        })

        # Add team members
        for team_member in team_data:
            if isinstance(team_member, dict):
                doc.append('team_members', {
                    'member': team_member.get('member'),
                    'role': team_member.get('role'),
                    'raci': team_member.get('raci')
                })

        # Check create permission and insert
        doc.insert()

        # Return 201 Created status via response
        frappe.response['http_status_code'] = 201
        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('Software Product {0} created successfully').format(doc.name)
        }

    except frappe.PermissionError as pe:
        # 403 Forbidden - User lacks permissions
        frappe.response['http_status_code'] = 403
        frappe.log_error(f"Permission denied creating product: {str(pe)}", "Software Product API")
        frappe.throw(_('You do not have permission to create Software Products'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        # 400 Bad Request - Validation error
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error creating Software Product: {str(e)}", "Software Product API")
        frappe.throw(
            _('An error occurred while creating the Software Product: {0}').format(str(e)),
            frappe.ValidationError
        )


@frappe.whitelist()
def update_product(name: str = None, **kwargs) -> Dict[str, Any]:
    """
    Update an existing Software Product

    Args:
        name: The Software Product name
        **kwargs: Fields to update

    Returns:
        Dict with updated Software Product data
    """
    try:
        # Handle JSON body from fetch requests
        if not kwargs:
            request_data = frappe.request.json or {}
            kwargs = request_data

        if not name:
            # Get name from kwargs if not provided as parameter
            name = kwargs.get('name')

        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Product ID is required'), frappe.ValidationError)

        # Remove 'name' from kwargs if present to avoid issues
        kwargs.pop('name', None)

        # Get existing document
        doc = frappe.get_doc('Software Product', name)

        # Check write permission
        if not doc.has_permission('write'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to update this Software Product'), frappe.PermissionError)

        # Extract team data (handle both 'team' and 'team_members')
        team_data = kwargs.pop('team_members', None) or kwargs.pop('team', []) or []

        # Update fields
        for key, value in kwargs.items():
            if key not in ['name', 'doctype', 'creation', 'modified', 'owner', 'modified_by', 'team_members']:
                doc.set(key, value)

        # Update team members - clear and re-add
        if team_data:
            doc.team_members = []
            for team_member in team_data:
                if isinstance(team_member, dict):
                    doc.append('team_members', {
                        'member': team_member.get('member'),
                        'role': team_member.get('role'),
                        'raci': team_member.get('raci')
                    })

        # Save document
        doc.save()

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('Software Product {0} updated successfully').format(doc.name)
        }

    except frappe.DoesNotExistError:
        # 404 Not Found - Product doesn't exist
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Software Product {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        # 403 Forbidden - User lacks permissions
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 403
        raise
    except frappe.ValidationError as ve:
        # 400 Bad Request - Validation error (re-raise)
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error updating Software Product {name}: {str(e)}", "Software Product API")
        frappe.throw(_('An error occurred while updating the Software Product: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def delete_product(name: str) -> Dict[str, Any]:
    """
    Delete a Software Product

    Args:
        name: The Software Product name

    Returns:
        Dict with success status
    """
    try:
        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Product ID is required'), frappe.ValidationError)

        # Get document
        doc = frappe.get_doc('Software Product', name)

        # Check delete permission
        if not doc.has_permission('delete'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to delete this Software Product'), frappe.PermissionError)

        # Delete document
        doc.delete()

        # Return 204 No Content status
        frappe.response['http_status_code'] = 204
        return {
            'success': True,
            'message': _('Software Product {0} deleted successfully').format(name)
        }

    except frappe.DoesNotExistError:
        # 404 Not Found - Product doesn't exist
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Software Product {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        # 403 Forbidden - User lacks permissions
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 403
        raise
    except frappe.ValidationError as ve:
        # 400 Bad Request - Validation error (re-raise)
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error deleting Software Product {name}: {str(e)}", "Software Product API")
        frappe.throw(_('An error occurred while deleting the Software Product: {0}').format(str(e)), frappe.ValidationError)
