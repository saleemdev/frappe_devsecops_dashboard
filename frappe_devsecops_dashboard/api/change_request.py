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

        # Convert to dict
        data = doc.as_dict()

        # Enrich approvers with full names from User DocType
        if data.get('change_approvers'):
            for approver in data['change_approvers']:
                if approver.get('user'):
                    try:
                        user_doc = frappe.get_doc('User', approver['user'])
                        approver['user_full_name'] = user_doc.full_name or approver['user']
                    except Exception:
                        # If user not found, use the user ID
                        approver['user_full_name'] = approver['user']

        return {
            'success': True,
            'data': data
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


@frappe.whitelist()
def sync_approvers_from_project(change_request_name: str) -> Dict[str, Any]:
    """
    Manually sync approvers from the linked Project's team members
    Can be called from the Edit Change Request form to refresh/sync approvers

    Args:
        change_request_name: The Change Request ID (e.g., CR-25-00001)

    Returns:
        Dict with success status and count of approvers added
    """
    try:
        # Get the Change Request document
        doc = frappe.get_doc('Change Request', change_request_name)

        # Check write permission
        if not doc.has_permission('write'):
            frappe.throw(_('You do not have permission to update this Change Request'), frappe.PermissionError)

        if not doc.project:
            frappe.throw(_('Change Request must have a linked Project to sync approvers'), frappe.ValidationError)

        # Get the project document
        project = frappe.get_doc('Project', doc.project)

        # Get existing approver users to avoid duplicates
        existing_approver_users = {approver.user for approver in doc.change_approvers}

        # Fetch project users who are marked as change approvers
        project_users = project.get('users', [])

        approvers_added = 0
        for project_user in project_users:
            # Check if user is marked as change approver and not already in the list
            if project_user.get('custom_is_change_approver') and project_user.user not in existing_approver_users:
                # Add to change_approvers table
                doc.append('change_approvers', {
                    'user': project_user.user,
                    'business_function': project_user.get('custom_business_function', ''),
                    'approval_status': 'Pending'
                })
                approvers_added += 1

        # Save if approvers were added
        if approvers_added > 0:
            doc.save()

        return {
            'success': True,
            'message': _('Synced {0} approver(s) from Project team members').format(approvers_added),
            'data': {
                'approvers_added': approvers_added,
                'total_approvers': len(doc.change_approvers)
            }
        }

    except frappe.ValidationError as e:
        return {
            'success': False,
            'error': str(e)
        }
    except frappe.PermissionError as e:
        frappe.throw(str(e), frappe.PermissionError)
    except frappe.DoesNotExistError:
        frappe.throw(_('Change Request {0} not found').format(change_request_name), frappe.DoesNotExistError)
    except Exception as e:
        frappe.log_error(f"Error syncing approvers for {change_request_name}: {str(e)}", "Change Request Approver Sync API")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def update_change_request_approval(
    change_request_name: str,
    approver_index,
    approval_status: str,
    remarks: str
) -> Dict[str, Any]:
    """
    Update approval status for a specific approver in the Change Request Approver child table
    Also updates the Change Request's approval_status based on all approvers' decisions

    Args:
        change_request_name: The Change Request ID (e.g., CR-25-00001)
        approver_index: Index of the approver in the change_approvers table (0-based)
        approval_status: Status to set ('Approved' or 'Rejected')
        remarks: Comments/reason for the approval decision

    Returns:
        Dict with success status and updated approver data
    """
    try:
        import json
        from datetime import datetime

        # Convert approver_index to integer
        try:
            approver_index = int(approver_index)
        except (ValueError, TypeError):
            frappe.throw(_('Invalid approver index format'), frappe.ValidationError)

        # Validate inputs
        if approval_status not in ['Approved', 'Rejected']:
            frappe.throw(_('Approval status must be either "Approved" or "Rejected"'), frappe.ValidationError)

        if not remarks or not remarks.strip():
            frappe.throw(_('Remarks/Comments are mandatory for approval decisions'), frappe.ValidationError)

        # Get the Change Request document
        doc = frappe.get_doc('Change Request', change_request_name)

        # Check write permission
        if not doc.has_permission('write'):
            frappe.throw(_('You do not have permission to update this Change Request'), frappe.PermissionError)

        # Validate approver index
        if approver_index < 0 or approver_index >= len(doc.change_approvers):
            frappe.throw(_('Invalid approver index: {0}. Valid range: 0-{1}').format(approver_index, len(doc.change_approvers) - 1), frappe.ValidationError)

        # Get the approver row
        approver = doc.change_approvers[approver_index]

        # Verify current user is the approver
        current_user = frappe.session.user
        if approver.user != current_user:
            frappe.throw(_('You can only approve/reject your own approval requests'), frappe.PermissionError)

        # Update the approver record
        approver.approval_status = approval_status
        approver.remarks = remarks

        # Check if all approvers have responded
        all_approved = True
        any_rejected = False
        all_responded = True

        for app in doc.change_approvers:
            if app.approval_status == 'Pending':
                all_responded = False
                break
            if app.approval_status == 'Rejected':
                any_rejected = True
            elif app.approval_status != 'Approved':
                all_approved = False

        # Update Change Request approval_status based on approvers' decisions
        if any_rejected:
            doc.approval_status = 'Not Accepted'
        elif all_approved and all_responded:
            doc.approval_status = 'Approved for Implementation'

        # Save the document
        doc.save()

        return {
            'success': True,
            'message': _('Approval updated successfully'),
            'data': {
                'user': approver.user,
                'approval_status': approver.approval_status,
                'remarks': approver.remarks,
                'change_request_status': doc.approval_status,
                'modified': doc.modified
            }
        }

    except frappe.ValidationError as e:
        return {
            'success': False,
            'error': str(e)
        }
    except frappe.PermissionError as e:
        frappe.throw(str(e), frappe.PermissionError)
    except frappe.DoesNotExistError:
        frappe.throw(_('Change Request {0} not found').format(change_request_name), frappe.DoesNotExistError)
    except Exception as e:
        frappe.log_error(f"Error updating approval for {change_request_name}: {str(e)}", "Change Request Approval API")
        return {
            'success': False,
            'error': str(e)
        }


@frappe.whitelist()
def search_employees(query: str = '') -> Dict[str, Any]:
    """
    Search for employees by name or ID

    Args:
        query: Search query string (partial name or employee ID)

    Returns:
        Dict with list of matching employees including manager info
    """
    try:
        # Ensure query is a string
        query = str(query).strip() if query else ''

        # Build SQL query for employee search
        sql = "SELECT name, employee_name, reports_to FROM `tabEmployee` WHERE status = 'Active'"
        params = []

        if query and len(query) > 0:
            sql += " AND (name LIKE %s OR employee_name LIKE %s)"
            params = [f'%{query}%', f'%{query}%']

        sql += " ORDER BY employee_name ASC LIMIT 20"

        # Execute query
        employees = frappe.db.sql(sql, params, as_dict=True)

        # Fetch manager full names for each employee
        for emp in employees:
            if emp.get('reports_to'):
                try:
                    # Query to get manager's employee_name
                    manager_result = frappe.db.sql(
                        "SELECT employee_name FROM `tabEmployee` WHERE name = %s",
                        emp['reports_to'],
                        as_dict=True
                    )
                    if manager_result:
                        emp['reports_to_full_name'] = manager_result[0]['employee_name']
                    else:
                        emp['reports_to_full_name'] = emp['reports_to']
                except Exception:
                    emp['reports_to_full_name'] = emp['reports_to']
            else:
                emp['reports_to_full_name'] = None

        return {
            'success': True,
            'data': employees
        }

    except Exception as e:
        return {
            'success': False,
            'error': str(e),
            'data': []
        }


@frappe.whitelist()
def get_doctype_permissions(doctype: str) -> Dict[str, Any]:
    """
    Get user permissions for a specific DocType

    Args:
        doctype: The DocType name (e.g., 'Change Request', 'Project')

    Returns:
        Dict with permission flags (read, write, create, delete, etc.)
    """
    try:
        # Check DocType-level permissions using frappe.has_permission
        permissions = {
            'read': frappe.has_permission(doctype, 'read'),
            'write': frappe.has_permission(doctype, 'write'),
            'create': frappe.has_permission(doctype, 'create'),
            'delete': frappe.has_permission(doctype, 'delete'),
            'submit': frappe.has_permission(doctype, 'submit'),
            'amend': frappe.has_permission(doctype, 'amend'),
            'cancel': frappe.has_permission(doctype, 'cancel'),
            'print': frappe.has_permission(doctype, 'print'),
            'email': frappe.has_permission(doctype, 'email'),
            'report': frappe.has_permission(doctype, 'report'),
            'export': frappe.has_permission(doctype, 'export'),
            'import': frappe.has_permission(doctype, 'import'),
            'share': frappe.has_permission(doctype, 'share')
        }

        return {
            'success': True,
            'permissions': permissions
        }

    except Exception as e:
        frappe.log_error(f"Error fetching permissions for {doctype}: {str(e)}", "Permissions API")
        return {
            'success': False,
            'error': str(e),
            'permissions': {
                'read': False,
                'write': False,
                'create': False,
                'delete': False,
                'submit': False,
                'amend': False,
                'cancel': False,
                'print': False,
                'email': False,
                'report': False,
                'export': False,
                'import': False,
                'share': False
            }
        }


@frappe.whitelist()
def submit_devops_resolution(change_request_name: str, resolution_status: str, version: str, notes: str) -> Dict[str, Any]:
	"""
	Submit DevOps Resolution for a Change Request
	Updates workflow_state and adds a comment with resolution details

	Args:
		change_request_name: Name of the Change Request document
		resolution_status: The workflow state to set (valid values: Awaiting Approval, Started Deployment, Declined, Implemented, Deployment Completed, Deployed, Deployment Failed)
		version: Version number/identifier for the resolution
		notes: Resolution notes to add as a comment

	Returns:
		Dict with success status and message
	"""
	try:
		# Valid workflow state options
		VALID_WORKFLOW_STATES = [
			'Awaiting Approval',
			'Started Deployment',
			'Declined',
			'Implemented',
			'Deployment Completed',
			'Deployed',
			'Deployment Failed'
		]

		# Log the request
		frappe.logger().info(f"[DevOps Resolution] Submitting resolution for CR: {change_request_name}, Status: {resolution_status}, Version: {version}")

		# Validate inputs
		if not change_request_name or not resolution_status or not version or not notes:
			error_msg = 'All fields (resolution_status, version, notes) are required'
			frappe.logger().warning(f"[DevOps Resolution] Validation failed: {error_msg}")
			return {
				'success': False,
				'error': error_msg
			}

		# Validate resolution_status is a valid workflow state
		if resolution_status not in VALID_WORKFLOW_STATES:
			error_msg = f'Invalid resolution status: {resolution_status}. Valid options are: {", ".join(VALID_WORKFLOW_STATES)}'
			frappe.logger().warning(f"[DevOps Resolution] Invalid status: {error_msg}")
			return {
				'success': False,
				'error': error_msg
			}

		# Get the Change Request document
		try:
			cr_doc = frappe.get_doc('Change Request', change_request_name)
		except frappe.DoesNotExistError:
			error_msg = f'Change Request {change_request_name} not found'
			frappe.logger().error(f"[DevOps Resolution] {error_msg}")
			return {
				'success': False,
				'error': error_msg
			}

		# Check if user has permission to write
		if not frappe.has_permission('Change Request', 'write', cr_doc):
			error_msg = 'You do not have permission to update this Change Request'
			frappe.logger().warning(f"[DevOps Resolution] Permission denied for user {frappe.session.user}: {error_msg}")
			frappe.throw(_(error_msg), frappe.PermissionError)

		# Update workflow_state
		frappe.logger().info(f"[DevOps Resolution] Updating workflow_state from '{cr_doc.workflow_state}' to '{resolution_status}'")
		cr_doc.workflow_state = resolution_status
		cr_doc.save(ignore_permissions=False)
		frappe.logger().info(f"[DevOps Resolution] Successfully updated workflow_state for {change_request_name}")

		# Add comment with resolution details
		comment_text = f"DevOps Resolution - Version: {version}\n\n{notes}"
		frappe.logger().info(f"[DevOps Resolution] Adding comment to {change_request_name}")

		comment_doc = frappe.get_doc({
			'doctype': 'Comment',
			'comment_type': 'Comment',
			'reference_doctype': 'Change Request',
			'reference_name': change_request_name,
			'content': comment_text
		})
		comment_doc.insert(ignore_permissions=True)
		frappe.logger().info(f"[DevOps Resolution] Successfully added comment to {change_request_name}")

		frappe.db.commit()
		frappe.logger().info(f"[DevOps Resolution] Successfully submitted resolution for {change_request_name}")

		return {
			'success': True,
			'message': 'DevOps resolution submitted successfully'
		}

	except frappe.PermissionError as e:
		error_msg = f"Permission denied for DevOps resolution: {str(e)}"
		frappe.logger().error(f"[DevOps Resolution] {error_msg}")
		return {
			'success': False,
			'error': 'You do not have permission to perform this action'
		}
	except Exception as e:
		error_msg = f"Error submitting DevOps resolution: {str(e)}"
		frappe.logger().error(f"[DevOps Resolution] {error_msg}")
		frappe.log_error(error_msg, "DevOps Resolution API")
		return {
			'success': False,
			'error': str(e)
		}



@frappe.whitelist()
def get_change_request_activity(change_request_name: str, limit: int = 10) -> Dict[str, Any]:
	"""
	Get comments for a Change Request
	Fetches Comment entries where reference_doctype = "Change Request" and reference_name = <change_request_name>

	Args:
		change_request_name: Name of the Change Request document
		limit: Maximum number of comment entries to return (default: 10)

	Returns:
		Dict with success status and comment entries
	"""
	try:
		from frappe.utils import cint

		limit = cint(limit)

		# Check read permission on Change Request
		if not frappe.has_permission("Change Request", ptype="read", doc=change_request_name):
			frappe.logger().warning(f"[Change Request Comments] Permission denied for {change_request_name}")
			return {
				'success': False,
				'error': 'You do not have permission to access this Change Request'
			}

		# Fetch Comment entries for this Change Request
		comments = frappe.get_list(
			"Comment",
			filters={
				"reference_doctype": "Change Request",
				"reference_name": change_request_name,
				"comment_type": "Comment"  # Only fetch user comments, not system comments
			},
			fields=[
				"name",
				"subject",
				"content",
				"comment_by",
				"comment_email",
				"creation",
				"modified",
				"reference_doctype",
				"reference_name"
			],
			order_by="creation desc",
			limit_page_length=limit
		)

		# Enhance comment data with user information
		for comment in comments:
			try:
				# Try to get full name from User DocType using comment_email
				user_email = comment.get("comment_email")
				if user_email:
					user_doc = frappe.get_doc("User", user_email)
					comment["owner_name"] = user_doc.full_name or user_email
				else:
					comment["owner_name"] = comment.get("comment_by") or "Unknown"
			except:
				comment["owner_name"] = comment.get("comment_by") or comment.get("comment_email") or "Unknown"

		frappe.logger().info(f"[Change Request Comments] Retrieved {len(comments)} comments for {change_request_name}")

		return {
			'success': True,
			'activity_logs': comments
		}

	except frappe.DoesNotExistError:
		error_msg = f"Change Request '{change_request_name}' does not exist"
		frappe.logger().warning(f"[Change Request Comments] {error_msg}")
		return {
			'success': False,
			'error': error_msg
		}
	except frappe.PermissionError as e:
		error_msg = f"Permission denied for Change Request {change_request_name}: {str(e)}"
		frappe.logger().warning(f"[Change Request Comments] {error_msg}")
		return {
			'success': False,
			'error': 'You do not have permission to access this Change Request'
		}
	except Exception as e:
		error_msg = f"Error fetching Change Request comments: {str(e)}"
		frappe.logger().error(f"[Change Request Comments] {error_msg}")
		frappe.log_error(error_msg, "Change Request Comments API")
		return {
			'success': False,
			'error': 'An error occurred while fetching comments'
		}
