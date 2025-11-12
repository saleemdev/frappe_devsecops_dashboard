"""
Incident Management API endpoints
Whitelisted methods for CRUD operations on Devsecops Dashboard Incident DocType
Follows the same pattern as Change Request API
"""

import frappe
from frappe import _
from typing import Dict, List, Any, Optional
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
            field_list = json.loads(fields) if isinstance(fields, str) else fields
        else:
            field_list = [
                'name', 'title', 'priority', 'status', 'category', 'severity',
                'assigned_to', 'assigned_to_name', 'reported_by', 'reported_by_name',
                'reported_date', 'description', 'affected_systems', 'impact_description',
                'resolution_notes', 'root_cause', 'sla_status', 'sla_due_date'
            ]

        # Always include 'name' for identification
        if 'name' not in field_list:
            field_list.append('name')

        # Parse filters
        filter_list = []
        if filters:
            filter_list = json.loads(filters) if isinstance(filters, str) else filters

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
        frappe.throw(_('You do not have permission to read Incidents'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error fetching Incidents: {str(e)}", "Incident API")
        return {
            'success': False,
            'error': str(e)
        }


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
        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check read permission
        if not doc.has_permission('read'):
            frappe.throw(_('You do not have permission to read this Incident'), frappe.PermissionError)

        # Convert to dict
        data = doc.as_dict()

        # Enrich assigned_to with full name
        if data.get('assigned_to'):
            try:
                user_doc = frappe.get_doc('User', data['assigned_to'])
                data['assigned_to_full_name'] = user_doc.full_name or data['assigned_to']
            except Exception:
                data['assigned_to_full_name'] = data['assigned_to']

        # Enrich reported_by with full name
        if data.get('reported_by'):
            try:
                user_doc = frappe.get_doc('User', data['reported_by'])
                data['reported_by_full_name'] = user_doc.full_name or data['reported_by']
            except Exception:
                data['reported_by_full_name'] = data['reported_by']

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
        frappe.throw(_('Incident {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to read this Incident'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error fetching Incident {name}: {str(e)}", "Incident API")
        return {
            'success': False,
            'error': str(e)
        }


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
        # Parse data
        doc_data = json.loads(data) if isinstance(data, str) else data

        # Create new document
        doc = frappe.get_doc({
            'doctype': 'Devsecops Dashboard Incident',
            **doc_data
        })

        # Check create permission
        doc.insert()

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('Incident {0} created successfully').format(doc.name)
        }

    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to create Incidents'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error creating Incident: {str(e)}", "Incident API")
        return {
            'success': False,
            'error': str(e)
        }


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
        # Parse data
        update_data = json.loads(data) if isinstance(data, str) else data

        # Get existing document
        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check write permission
        if not doc.has_permission('write'):
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
        frappe.throw(_('Incident {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to update this Incident'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error updating Incident {name}: {str(e)}", "Incident API")
        return {
            'success': False,
            'error': str(e)
        }


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
        # Get document
        doc = frappe.get_doc('Devsecops Dashboard Incident', name)

        # Check delete permission
        if not doc.has_permission('delete'):
            frappe.throw(_('You do not have permission to delete this Incident'), frappe.PermissionError)

        # Delete document
        doc.delete()

        return {
            'success': True,
            'message': _('Incident {0} deleted successfully').format(name)
        }

    except frappe.DoesNotExistError:
        frappe.throw(_('Incident {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to delete this Incident'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error deleting Incident {name}: {str(e)}", "Incident API")
        return {
            'success': False,
            'error': str(e)
        }


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
        return {
            'success': False,
            'error': str(e),
            'data': []
        }

