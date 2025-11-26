"""
RACI Template API endpoints
Whitelisted methods for CRUD operations on RACI Template DocType
"""

import frappe
from frappe import _
from typing import Dict, Any, Optional
import json


@frappe.whitelist()
def get_raci_templates(
    fields: Optional[str] = None,
    filters: Optional[str] = None,
    limit_start: int = 0,
    limit_page_length: int = 20,
    order_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get list of RACI Templates with filtering and pagination

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
        frappe.logger().info(f"[get_raci_templates] Called with filters={filters}")

        # Parse fields
        if fields:
            try:
                field_list = json.loads(fields) if isinstance(fields, str) else fields
            except json.JSONDecodeError as je:
                frappe.response['http_status_code'] = 400
                frappe.log_error(f"Invalid JSON in fields: {str(je)}", "RACI Template API")
                frappe.throw(_('Invalid JSON format in fields'), frappe.ValidationError)
        else:
            field_list = [
                'name', 'template_name', 'description', 'project_template', 'modified'
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
                frappe.log_error(f"Invalid JSON in filters: {str(je)}", "RACI Template API")
                frappe.throw(_('Invalid JSON format in filters'), frappe.ValidationError)

        # Get records with permission check
        records = frappe.get_list(
            'RACI Template',
            fields=field_list,
            filters=filter_list,
            limit_start=int(limit_start),
            limit_page_length=int(limit_page_length),
            order_by=order_by or 'modified desc'
        )

        # Get total count with same filters
        total = frappe.db.count('RACI Template', filters=filter_list or [])

        frappe.logger().info(f"[get_raci_templates] Found {len(records)} records, total={total}")

        return {
            'success': True,
            'data': records,
            'total': total
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        frappe.log_error("Permission denied reading RACI templates", "RACI Template API")
        frappe.throw(_('You do not have permission to read RACI Templates'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching RACI Templates: {str(e)}", "RACI Template API")
        frappe.throw(_('An error occurred while fetching RACI Templates: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def get_raci_template_detail(name: str) -> Dict[str, Any]:
    """
    Get a single RACI Template by name

    Args:
        name: The RACI Template name

    Returns:
        Dict with RACI Template data
    """
    try:
        if not name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Template ID is required'), frappe.ValidationError)

        doc = frappe.get_doc('RACI Template', name)

        # Check read permission
        if not doc.has_permission('read'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to read this RACI Template'), frappe.PermissionError)

        # Convert to dict
        data = doc.as_dict()

        # No need to enrich - RACI roles now store Business Function values directly

        return {
            'success': True,
            'data': data
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('RACI Template {0} not found').format(name), frappe.DoesNotExistError)
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
        frappe.log_error(f"Error fetching RACI Template {name}: {str(e)}", "RACI Template API")
        frappe.throw(_('An error occurred while fetching the RACI Template: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def create_raci_template(**kwargs) -> Dict[str, Any]:
    """
    Create a new RACI Template

    Args:
        **kwargs: RACI Template fields

    Returns:
        Dict with created RACI Template data
    """
    try:
        # Handle JSON body from fetch requests
        if not kwargs:
            request_data = frappe.request.json or {}
            kwargs = request_data

        if not kwargs or 'template_name' not in kwargs:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Template name is required'), frappe.ValidationError)

        # Extract assignments data
        assignments_data = kwargs.pop('raci_assignments', []) or []

        # Create new document
        doc = frappe.get_doc({
            'doctype': 'RACI Template',
            **kwargs
        })

        # Add assignments
        for assignment in assignments_data:
            if isinstance(assignment, dict):
                doc.append('raci_assignments', {
                    'business_function': assignment.get('business_function'),
                    'task_name': assignment.get('task_name'),
                    'task_link': assignment.get('task_link'),
                    'task_type': assignment.get('task_type'),
                    'task_type_priority': assignment.get('task_type_priority'),
                    'responsible': assignment.get('responsible'),
                    'accountable': assignment.get('accountable'),
                    'consulted': assignment.get('consulted'),
                    'informed': assignment.get('informed')
                })

        # Check create permission and insert
        doc.insert()

        frappe.response['http_status_code'] = 201
        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('RACI Template {0} created successfully').format(doc.name)
        }

    except frappe.DuplicateEntryError as de:
        frappe.response['http_status_code'] = 409
        template_name = kwargs.get('template_name', 'Unknown')
        # Truncate error message to avoid CharacterLengthExceededError
        error_msg = f"Duplicate template: {template_name[:50]}"
        frappe.log_error(error_msg, "RACI Template API")
        frappe.throw(
            _('RACI Template <strong>{0}</strong> already exists').format(template_name),
            frappe.DuplicateEntryError
        )
    except frappe.PermissionError as pe:
        frappe.response['http_status_code'] = 403
        # Truncate error message
        error_msg = f"Permission denied: {str(pe)[:100]}"
        frappe.log_error(error_msg, "RACI Template API")
        frappe.throw(_('You do not have permission to create RACI Templates'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        # Truncate error message to avoid CharacterLengthExceededError (max 140 chars)
        error_str = str(e)
        if len(error_str) > 100:
            error_str = error_str[:97] + "..."
        error_msg = f"Error creating RACI Template: {error_str}"
        frappe.log_error(error_msg, "RACI Template API")
        
        # Provide user-friendly error message
        user_msg = _('An error occurred while creating the RACI Template')
        if 'Duplicate' in str(e) or 'duplicate' in str(e).lower():
            template_name = kwargs.get('template_name', '')
            if template_name:
                frappe.throw(
                    _('RACI Template <strong>{0}</strong> already exists').format(template_name),
                    frappe.DuplicateEntryError
                )
        frappe.throw(user_msg, frappe.ValidationError)


@frappe.whitelist()
def update_raci_template(name: str = None, **kwargs) -> Dict[str, Any]:
    """
    Update an existing RACI Template

    Args:
        name: The RACI Template name
        **kwargs: Fields to update

    Returns:
        Dict with updated RACI Template data
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
            frappe.throw(_('Template ID is required'), frappe.ValidationError)

        # Log the incoming request for debugging
        frappe.logger().info(f"[update_raci_template] Received update request for template: {name}")
        frappe.logger().info(f"[update_raci_template] Request keys: {list(kwargs.keys())}")

        # Remove 'name' from kwargs if present
        kwargs.pop('name', None)

        # Get existing document
        doc = frappe.get_doc('RACI Template', name)

        # Check write permission
        if not doc.has_permission('write'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to update this RACI Template'), frappe.PermissionError)

        # Extract assignments data
        # Check if raci_assignments key exists in kwargs before popping
        has_assignments_key = 'raci_assignments' in kwargs
        assignments_data = kwargs.pop('raci_assignments', [])

        # Explicitly handle None to convert to empty list
        if assignments_data is None:
            assignments_data = []

        # Log the assignments data for debugging
        frappe.logger().info(f"[update_raci_template] Updating template {name}, has_assignments_key={has_assignments_key}, assignments_count={len(assignments_data)}")

        # Update fields
        for key, value in kwargs.items():
            if key not in ['doctype', 'creation', 'modified', 'owner', 'modified_by', 'raci_assignments']:
                doc.set(key, value)

        # Update assignments - only if raci_assignments was explicitly provided in the request
        # This allows updating other fields without affecting assignments
        if has_assignments_key:
            doc.raci_assignments = []
            for assignment in assignments_data:
                if isinstance(assignment, dict):
                    doc.append('raci_assignments', {
                        'business_function': assignment.get('business_function'),
                        'task_name': assignment.get('task_name'),
                        'task_link': assignment.get('task_link'),
                        'task_type': assignment.get('task_type'),
                        'task_type_priority': assignment.get('task_type_priority'),
                        'responsible': assignment.get('responsible'),
                        'accountable': assignment.get('accountable'),
                        'consulted': assignment.get('consulted'),
                        'informed': assignment.get('informed')
                    })

        # Save document
        doc.save()

        frappe.logger().info(f"[update_raci_template] Successfully updated template {name}, final assignments count: {len(doc.raci_assignments)}")

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('RACI Template {0} updated successfully').format(doc.name)
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('RACI Template {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 403
        # Truncate error message
        error_msg = f"Permission denied: {str(pe)[:100]}"
        frappe.log_error(error_msg, "RACI Template API")
        raise
    except frappe.ValidationError as ve:
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        frappe.response['http_status_code'] = 500
        # Truncate error message to avoid CharacterLengthExceededError (max 140 chars)
        error_str = str(e)
        if len(error_str) > 100:
            error_str = error_str[:97] + "..."
        error_msg = f"Error updating RACI Template {name}: {error_str}"
        frappe.log_error(error_msg, "RACI Template API")
        
        # Provide user-friendly error message
        user_msg = _('An error occurred while updating the RACI Template')
        frappe.throw(user_msg, frappe.ValidationError)


@frappe.whitelist()
def delete_raci_template(name: str) -> Dict[str, Any]:
    """
    Delete a RACI Template

    Args:
        name: The RACI Template name

    Returns:
        Dict with success status
    """
    try:
        if not name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Template ID is required'), frappe.ValidationError)

        # Get document
        doc = frappe.get_doc('RACI Template', name)

        # Check delete permission
        if not doc.has_permission('delete'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to delete this RACI Template'), frappe.PermissionError)

        # Delete document
        doc.delete()

        frappe.response['http_status_code'] = 204
        return {
            'success': True,
            'message': _('RACI Template {0} deleted successfully').format(name)
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('RACI Template {0} not found').format(name), frappe.DoesNotExistError)
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
        # Truncate error message to avoid CharacterLengthExceededError (max 140 chars)
        error_str = str(e)
        if len(error_str) > 100:
            error_str = error_str[:97] + "..."
        error_msg = f"Error deleting RACI Template {name}: {error_str}"
        frappe.log_error(error_msg, "RACI Template API")
        
        # Provide user-friendly error message
        user_msg = _('An error occurred while deleting the RACI Template')
        frappe.throw(user_msg, frappe.ValidationError)


@frappe.whitelist()
def get_project_template_tasks(project_template: str) -> Dict[str, Any]:
    """
    Get tasks from a Project Template grouped by task type and ordered by custom_priority

    Args:
        project_template: Project Template name

    Returns:
        Dict with tasks list grouped by task type
    """
    try:
        if not project_template:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Project Template is required'), frappe.ValidationError)

        doc = frappe.get_doc('Project Template', project_template)

        # Collect tasks with their task types
        tasks_with_types = []
        if doc.tasks:
            for task_row in doc.tasks:
                if task_row.task:
                    try:
                        task_doc = frappe.get_doc('Task', task_row.task)
                        task_type = task_doc.type or 'Uncategorized'

                        # Get task type priority
                        task_type_priority = 999  # Default priority for uncategorized
                        if task_type and task_type != 'Uncategorized':
                            try:
                                task_type_doc = frappe.get_doc('Task Type', task_type)
                                task_type_priority = task_type_doc.custom_priority or 999
                            except Exception:
                                task_type_priority = 999

                        tasks_with_types.append({
                            'task_link': task_row.task,
                            'task_name': task_doc.subject or task_row.task,
                            'task_type': task_type,
                            'task_type_priority': task_type_priority
                        })
                    except frappe.DoesNotExistError:
                        tasks_with_types.append({
                            'task_link': task_row.task,
                            'task_name': task_row.subject or task_row.task,
                            'task_type': 'Uncategorized',
                            'task_type_priority': 999
                        })

        # Sort tasks by task_type_priority, then by task_name
        tasks_with_types.sort(key=lambda x: (x['task_type_priority'], x['task_name']))

        return {
            'success': True,
            'data': tasks_with_types
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Project Template {0} not found').format(project_template), frappe.DoesNotExistError)
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching tasks: {str(e)}", "RACI Template API")
        frappe.throw(_('An error occurred while fetching tasks: {0}').format(str(e)), frappe.ValidationError)
