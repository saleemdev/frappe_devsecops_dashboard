"""
Incident Management API endpoints
Whitelisted methods for CRUD operations on Devsecops Dashboard Incident DocType
Follows the same pattern as Change Request API
"""

import frappe
from frappe import _
from typing import Dict, Any, Optional
import json


@frappe.whitelist()
def get_incidents(
    fields: Optional[str] = None,
    filters: Optional[str] = None,
    limit_start: int = 0,
    limit_page_length: int = 20,
    order_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get list of Incidents with filtering and pagination

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
        # Parse fields
        if fields:
            try:
                field_list = json.loads(fields) if isinstance(fields, str) else fields
            except json.JSONDecodeError as je:
                frappe.response['http_status_code'] = 400
                frappe.log_error(f"Invalid JSON in fields: {str(je)}", "Incident API")
                frappe.throw(_('Invalid JSON format in fields'), frappe.ValidationError)
        else:
            field_list = [
                'name', 'title', 'priority', 'status', 'category', 'severity',
                'assigned_to', 'assigned_to_name', 'reported_by', 'reported_by_name',
                'reported_date', 'resolution_date', 'description', 'affected_systems', 'impact_description',
                'resolution_notes', 'root_cause', 'sla_status', 'sla_due_date', 'project', 'project_name',
                'source', 'finding_id', 'region', 'resource', 'publicly_accessible', 'action_taken', 'threat_intel'
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
                frappe.log_error(f"Invalid JSON in filters: {str(je)}", "Incident API")
                frappe.throw(_('Invalid JSON format in filters'), frappe.ValidationError)

        # Get records with permission check
        records = frappe.get_list(
            'Devsecops Dashboard Incident',
            fields=field_list,
            filters=filter_list,
            limit_start=int(limit_start),
            limit_page_length=int(limit_page_length),
            order_by=order_by or 'modified desc'
        )

        # Get total count with same filters
        total = frappe.db.count('Devsecops Dashboard Incident', filters=filter_list or [])

        return {
            'success': True,
            'data': records,
            'total': total
        }

    except frappe.PermissionError:
        # 403 Forbidden - User lacks permissions
        frappe.response['http_status_code'] = 403
        frappe.log_error("Permission denied reading incidents", "Incident API")
        frappe.throw(_('You do not have permission to read Incidents'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        # 400 Bad Request - Validation error
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error fetching Incidents: {str(e)}", "Incident API")
        frappe.throw(_('An error occurred while fetching Incidents: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def get_incident(name: str) -> Dict[str, Any]:
    """
    Get a single Incident by name

    Args:
        name: The Incident ID (e.g., INC-00001)

    Returns:
        Dict with Incident data
    """
    try:
        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Incident ID is required'), frappe.ValidationError)

        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check read permission
        if not doc.has_permission('read'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to read this Incident'), frappe.PermissionError)

        # Convert to dict
        data = doc.as_dict()

        # Enrich assigned_to with full name
        if data.get('assigned_to'):
            assigned_email = data['assigned_to']
            try:
                user_doc = frappe.get_doc('User', assigned_email)
                full_name = user_doc.get('full_name') or user_doc.get('first_name') or ''
                if not full_name and user_doc.get('last_name'):
                    full_name = user_doc.get('last_name')
                data['assigned_to_full_name'] = full_name if full_name else assigned_email
            except frappe.DoesNotExistError:
                data['assigned_to_full_name'] = assigned_email
            except Exception:
                data['assigned_to_full_name'] = assigned_email
        else:
            data['assigned_to_full_name'] = None

        # Enrich reported_by with full name
        if data.get('reported_by'):
            reported_email = data['reported_by']
            try:
                user_doc = frappe.get_doc('User', reported_email)
                full_name = user_doc.get('full_name') or user_doc.get('first_name') or ''
                if not full_name and user_doc.get('last_name'):
                    full_name = user_doc.get('last_name')
                data['reported_by_full_name'] = full_name if full_name else reported_email
            except frappe.DoesNotExistError:
                data['reported_by_full_name'] = reported_email
            except Exception:
                data['reported_by_full_name'] = reported_email
        else:
            data['reported_by_full_name'] = None

        # Enrich timeline with user full names
        if data.get('incident_timeline'):
            for timeline_item in data['incident_timeline']:
                if timeline_item.get('user'):
                    try:
                        user_doc = frappe.get_doc('User', timeline_item['user'])
                        timeline_item['user_full_name'] = user_doc.full_name or timeline_item['user']
                    except Exception:
                        timeline_item['user_full_name'] = timeline_item['user']

        return {
            'success': True,
            'data': data
        }

    except frappe.DoesNotExistError:
        # 404 Not Found - Incident doesn't exist
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Incident {0} not found').format(name), frappe.DoesNotExistError)
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
        frappe.log_error(f"Error fetching Incident {name}: {str(e)}", "Incident API")
        frappe.throw(_('An error occurred while fetching the Incident: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def create_incident(data: str) -> Dict[str, Any]:
    """
    Create a new Incident

    Args:
        data: JSON string of Incident fields

    Returns:
        Dict with created Incident data
    """
    try:
        if not data:
            # 400 Bad Request - Missing required data
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Incident data is required'), frappe.ValidationError)

        # Parse data
        try:
            doc_data = json.loads(data) if isinstance(data, str) else data
        except json.JSONDecodeError as je:
            # 400 Bad Request - Invalid JSON
            frappe.response['http_status_code'] = 400
            frappe.log_error(f"Invalid JSON in create_incident: {str(je)}", "Incident API")
            frappe.throw(_('Invalid JSON format in request data'), frappe.ValidationError)

        # Create new document
        doc = frappe.get_doc({
            'doctype': 'Devsecops Dashboard Incident',
            **doc_data
        })

        # Check create permission and insert
        doc.insert()

        # Return 201 Created status via response
        frappe.response['http_status_code'] = 201
        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('Incident {0} created successfully').format(doc.name)
        }

    except frappe.PermissionError as pe:
        # 403 Forbidden - User lacks permissions
        frappe.response['http_status_code'] = 403
        frappe.log_error(f"Permission denied creating incident: {str(pe)}", "Incident API")
        frappe.throw(_('You do not have permission to create Incidents'), frappe.PermissionError)
    except frappe.ValidationError as ve:
        # 400 Bad Request - Validation error
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 400
        raise
    except json.JSONDecodeError as je:
        # 400 Bad Request - Invalid JSON (fallback)
        frappe.response['http_status_code'] = 400
        frappe.log_error(f"Invalid JSON in create_incident: {str(je)}", "Incident API")
        frappe.throw(_('Invalid JSON format in request data'), frappe.ValidationError)
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error creating Incident: {str(e)}", "Incident API")
        frappe.throw(
            _('An error occurred while creating the Incident: {0}').format(str(e)),
            frappe.ValidationError
        )


@frappe.whitelist()
def update_incident(name: str, data: str) -> Dict[str, Any]:
    """
    Update an existing Incident

    Args:
        name: The Incident ID (e.g., INC-00001)
        data: JSON string of fields to update

    Returns:
        Dict with updated Incident data
    """
    try:
        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Incident ID is required'), frappe.ValidationError)

        if not data:
            # 400 Bad Request - Missing required data
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Update data is required'), frappe.ValidationError)

        # Parse data
        try:
            update_data = json.loads(data) if isinstance(data, str) else data
        except json.JSONDecodeError as je:
            frappe.response['http_status_code'] = 400
            frappe.log_error(f"Invalid JSON in update_incident: {str(je)}", "Incident API")
            frappe.throw(_('Invalid JSON format in request data'), frappe.ValidationError)

        # Get existing document
        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check write permission
        if not doc.has_permission('write'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to update this Incident'), frappe.PermissionError)

        # Update fields
        for key, value in update_data.items():
            if key not in ['name', 'doctype', 'creation', 'modified', 'owner', 'modified_by']:
                doc.set(key, value)

        # Save document
        doc.save()

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('Incident {0} updated successfully').format(doc.name)
        }

    except frappe.DoesNotExistError:
        # 404 Not Found - Incident doesn't exist
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Incident {0} not found').format(name), frappe.DoesNotExistError)
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
    except json.JSONDecodeError as je:
        # 400 Bad Request - Invalid JSON (fallback)
        frappe.response['http_status_code'] = 400
        frappe.log_error(f"Invalid JSON in update_incident: {str(je)}", "Incident API")
        frappe.throw(_('Invalid JSON format in request data'), frappe.ValidationError)
    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error updating Incident {name}: {str(e)}", "Incident API")
        frappe.throw(_('An error occurred while updating the Incident: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def delete_incident(name: str) -> Dict[str, Any]:
    """
    Delete an Incident

    Args:
        name: The Incident ID (e.g., INC-00001)

    Returns:
        Dict with success status
    """
    try:
        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Incident ID is required'), frappe.ValidationError)

        # Get document
        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check delete permission
        if not doc.has_permission('delete'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to delete this Incident'), frappe.PermissionError)

        # Delete document
        doc.delete()

        # Return 204 No Content status
        frappe.response['http_status_code'] = 204
        return {
            'success': True,
            'message': _('Incident {0} deleted successfully').format(name)
        }

    except frappe.DoesNotExistError:
        # 404 Not Found - Incident doesn't exist
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Incident {0} not found').format(name), frappe.DoesNotExistError)
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
        frappe.log_error(f"Error deleting Incident {name}: {str(e)}", "Incident API")
        frappe.throw(_('An error occurred while deleting the Incident: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def search_users(query: str = '') -> Dict[str, Any]:
    """
    Search for users by email or full name

    Args:
        query: Search query string (partial name or email)

    Returns:
        Dict with list of matching users including full name
    """
    try:
        # Ensure query is a string
        query = str(query).strip() if query else ''

        # Build SQL query for user search
        sql = "SELECT name, full_name FROM `tabUser` WHERE enabled = 1"
        params = []

        if query and len(query) > 0:
            sql += " AND (name LIKE %s OR full_name LIKE %s)"
            params = [f'%{query}%', f'%{query}%']

        sql += " ORDER BY full_name ASC LIMIT 20"

        # Execute query
        users = frappe.db.sql(sql, params, as_dict=True)

        return {
            'success': True,
            'data': users
        }

    except Exception as e:
        # 500 Internal Server Error - Unexpected error
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error searching users: {str(e)}", "Incident API")
        frappe.throw(_('An error occurred while searching for users: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def add_timeline_entry(name: str, event_type: str, event_timestamp: str, description: str, event_source: str = None) -> Dict[str, Any]:
    """
    Add a timeline entry to an incident

    Args:
        name: The Incident ID
        event_type: Type of event
        event_timestamp: When the event occurred (YYYY-MM-DD HH:mm:ss)
        description: Event description
        event_source: Optional source of the event

    Returns:
        Dict with success status and updated incident data
    """
    try:
        # Validate required parameters
        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Incident ID is required'), frappe.ValidationError)

        if not event_type:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Event type is required'), frappe.ValidationError)

        if not event_timestamp:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Event timestamp is required'), frappe.ValidationError)

        if not description:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Event description is required'), frappe.ValidationError)

        # Get the incident document
        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check write permission
        if not doc.has_permission('write'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to update this Incident'), frappe.PermissionError)

        # Validate event type
        valid_event_types = [
            'Incident Reported', 'Automated', 'Manual', 'Status Change', 'Assignment',
            'Comment', 'Investigation', 'Resolution', 'Communication', 'Escalation', 'SLA Update'
        ]

        if event_type not in valid_event_types:
            # 400 Bad Request - Invalid event type
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Invalid event type: {0}').format(event_type), frappe.ValidationError)

        # Add new timeline entry
        doc.append('incident_timeline', {
            'event_type': event_type,
            'event_timestamp': event_timestamp,
            'description': description,
            'event_source': event_source,
            'user': frappe.session.user
        })

        # Save the document
        doc.save()

        # Return 201 Created status
        frappe.response['http_status_code'] = 201
        return {
            'success': True,
            'message': _('Timeline entry added successfully'),
            'data': doc.as_dict()
        }

    except frappe.DoesNotExistError:
        # 404 Not Found - Incident doesn't exist
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Incident {0} not found').format(name), frappe.DoesNotExistError)
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
        frappe.log_error(f"Error adding timeline entry to Incident {name}: {str(e)}", "Incident API")
        frappe.throw(_('An error occurred while adding the timeline entry: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def remove_timeline_entry(name: str, entry_index) -> Dict[str, Any]:
    """
    Remove a timeline entry from an incident

    Args:
        name: The Incident ID
        entry_index: Index of the timeline entry to remove (0-based)

    Returns:
        Dict with success status and updated incident data
    """
    try:
        # Validate required parameters
        if not name:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Incident ID is required'), frappe.ValidationError)

        if entry_index is None:
            # 400 Bad Request - Missing required parameter
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Entry index is required'), frappe.ValidationError)

        # Convert entry_index to int
        try:
            entry_index = int(entry_index)
        except (ValueError, TypeError):
            # 400 Bad Request - Invalid entry index format
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Entry index must be a valid integer'), frappe.ValidationError)

        # Get the incident document
        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check write permission
        if not doc.has_permission('write'):
            # 403 Forbidden - User lacks permissions
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to update this Incident'), frappe.PermissionError)

        # Check if timeline exists and entry index is valid
        if not doc.incident_timeline or entry_index >= len(doc.incident_timeline) or entry_index < 0:
            # 404 Not Found - Timeline entry doesn't exist
            frappe.response['http_status_code'] = 404
            frappe.throw(_('Timeline entry not found'), frappe.DoesNotExistError)

        # Get the entry to check if it's "Incident Reported"
        entry = doc.incident_timeline[entry_index]
        if entry.event_type == 'Incident Reported':
            # 400 Bad Request - Cannot delete system entry
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Cannot delete "Incident Reported" timeline entry'), frappe.ValidationError)

        # Remove the timeline entry by index
        del doc.incident_timeline[entry_index]

        # Save the document
        doc.save()

        return {
            'success': True,
            'message': _('Timeline entry removed successfully'),
            'data': doc.as_dict()
        }

    except frappe.DoesNotExistError as dne:
        # 404 Not Found - Incident or entry doesn't exist
        if frappe.response.get('http_status_code') is None:
            frappe.response['http_status_code'] = 404
        raise
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
        frappe.log_error(f"Error removing timeline entry from Incident {name}: {str(e)}", "Incident API")
        frappe.throw(_('An error occurred while removing the timeline entry: {0}').format(str(e)), frappe.ValidationError)

