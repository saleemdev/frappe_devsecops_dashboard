"""
Change Request API endpoints
Whitelisted methods for CRUD operations on Change Request DocType
"""

import frappe
from frappe import _
from typing import Dict, List, Any, Optional


@frappe.whitelist()
def get_change_requests(
    fields: Optional[str] = None,
    filters: Optional[str] = None,
    limit_start: int = 0,
    limit_page_length: int = 20,
    order_by: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get list of Change Requests with filtering and pagination

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
        import json

        # Parse fields
        if fields:
            field_list = json.loads(fields) if isinstance(fields, str) else fields
        else:
            field_list = [
                'name', 'title', 'cr_number', 'prepared_for', 'submission_date',
                'system_affected', 'originator_name', 'originator_organization',
                'originators_manager', 'change_category', 'downtime_expected',
                'detailed_description', 'release_notes', 'implementation_date',
                'implementation_time', 'testing_plan', 'rollback_plan',
                'approval_status', 'workflow_state', 'project'
            ]

        # Always include 'name' so we can set cr_number = name for display purposes
        if 'name' not in field_list:
            field_list.append('name')


        # Parse filters
        filter_list = []
        if filters:
            filter_list = json.loads(filters) if isinstance(filters, str) else filters

        # Get records with permission check
        records = frappe.get_list(
            'Change Request',
            fields=field_list,


            filters=filter_list,
            limit_start=int(limit_start),
            limit_page_length=int(limit_page_length),
            order_by=order_by or 'modified desc'
        )

        # Get total count with same filters
        total = frappe.db.count('Change Request', filters=filter_list)

        # Ensure the frontend receives the document identifier in cr_number
        # regardless of the DocType's cr_number field value
        for r in records:
            try:
                r['cr_number'] = r.get('name') or r.get('cr_number')
            except Exception:
                # Be defensive if r is not a dict-like
                pass

        return {
            'success': True,
            'data': records,
            'total': total
        }

    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to read Change Requests'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error fetching Change Requests: {str(e)}", "Change Request API")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def get_change_request(name: str) -> Dict[str, Any]:
    """
    Get a single Change Request by name

    Args:
        name: The Change Request ID (e.g., CR-25-00001)

    Returns:
        Dict with Change Request data
    """
    try:
        doc = frappe.get_doc('Change Request', name)

        # Check read permission
        if not doc.has_permission('read'):
            frappe.throw(_('You do not have permission to read this Change Request'), frappe.PermissionError)

        return {
            'success': True,
            'data': doc.as_dict()
        }

    except frappe.DoesNotExistError:
        frappe.throw(_('Change Request {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to read this Change Request'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error fetching Change Request {name}: {str(e)}", "Change Request API")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def create_change_request(data: str) -> Dict[str, Any]:
    """
    Create a new Change Request

    Args:
        data: JSON string of Change Request fields

    Returns:
        Dict with created Change Request data
    """
    try:
        import json

        # Parse data
        doc_data = json.loads(data) if isinstance(data, str) else data

        # Create new document
        doc = frappe.get_doc({
            'doctype': 'Change Request',
            **doc_data
        })

        # Check create permission
        doc.insert()

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('Change Request {0} created successfully').format(doc.name)
        }

    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to create Change Requests'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error creating Change Request: {str(e)}", "Change Request API")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def update_change_request(name: str, data: str) -> Dict[str, Any]:
    """
    Update an existing Change Request

    Args:
        name: The Change Request ID (e.g., CR-25-00001)
        data: JSON string of fields to update

    Returns:
        Dict with updated Change Request data
    """
    try:
        import json

        print(f"\n=== UPDATE_CHANGE_REQUEST CALLED ===")
        print(f"name parameter: {name}")
        print(f"data parameter type: {type(data)}")
        print(f"data parameter (first 200 chars): {str(data)[:200]}")

        # Parse data
        update_data = json.loads(data) if isinstance(data, str) else data
        print(f"Parsed update_data keys: {list(update_data.keys())}")
        print(f"Parsed update_data: {update_data}")

        # Get existing document
        doc = frappe.get_doc('Change Request', name)
        print(f"Document loaded: {doc.name}")

        # Check write permission
        if not doc.has_permission('write'):
            frappe.throw(_('You do not have permission to update this Change Request'), frappe.PermissionError)

        # Update fields
        print(f"Updating {len(update_data)} fields...")
        for key, value in update_data.items():
            if key not in ['name', 'doctype', 'creation', 'modified', 'owner', 'modified_by']:
                old_value = doc.get(key)
                doc.set(key, value)
                print(f"  {key}: {old_value} -> {value}")
            else:
                print(f"  {key}: SKIPPED (system field)")

        # Save document
        print(f"Saving document...")
        doc.save()
        print(f"Document saved successfully")

        return {
            'success': True,
            'data': doc.as_dict(),
            'message': _('Change Request {0} updated successfully').format(doc.name)
        }

    except frappe.DoesNotExistError:
        print(f"ERROR: Change Request {name} not found")
        frappe.throw(_('Change Request {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError as pe:
        print(f"ERROR: Permission denied for {name}: {str(pe)}")
        frappe.throw(_('You do not have permission to update this Change Request'), frappe.PermissionError)
    except Exception as e:
        print(f"ERROR: Exception updating Change Request {name}: {str(e)}")
        frappe.log_error(f"Error updating Change Request {name}: {str(e)}", "Change Request API")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def delete_change_request(name: str) -> Dict[str, Any]:
    """
    Delete a Change Request

    Args:
        name: The Change Request ID (e.g., CR-25-00001)

    Returns:
        Dict with success status
    """
    try:
        # Get document
        doc = frappe.get_doc('Change Request', name)

        # Check delete permission
        if not doc.has_permission('delete'):
            frappe.throw(_('You do not have permission to delete this Change Request'), frappe.PermissionError)

        # Delete document
        doc.delete()

        return {
            'success': True,
            'message': _('Change Request {0} deleted successfully').format(name)
        }

    except frappe.DoesNotExistError:
        frappe.throw(_('Change Request {0} not found').format(name), frappe.DoesNotExistError)
    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to delete this Change Request'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error deleting Change Request {name}: {str(e)}", "Change Request API")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def get_projects() -> Dict[str, Any]:
    """
    Get list of Projects for the Project link field
    Uses frappe.get_list() which respects user permissions

    Returns:
        Dict with list of projects the user has permission to read
    """
    try:
        # frappe.get_list() automatically filters based on user permissions
        # Only returns projects the current user has read access to
        projects = frappe.get_list(
            'Project',
            fields=['name', 'project_name'],
            order_by='project_name asc'
        )

        return {
            'success': True,
            'data': projects
        }

    except frappe.PermissionError:
        frappe.throw(_('You do not have permission to read Projects'), frappe.PermissionError)
    except Exception as e:
        frappe.log_error(f"Error fetching Projects: {str(e)}", "Change Request API")
        return {
            'success': False,
            'error': str(e)
        }

