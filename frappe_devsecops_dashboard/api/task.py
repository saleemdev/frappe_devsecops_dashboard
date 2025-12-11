"""
Task API endpoints
Whitelisted methods for Task operations including comments
"""

import frappe
from frappe import _
from typing import Dict, Any


@frappe.whitelist()
def add_task_comment(task_name: str, content: str) -> Dict[str, Any]:
    """
    Add a comment to a Task document

    Args:
        task_name: The Task name/ID
        content: The comment content (can be HTML from rich text editor)

    Returns:
        Dict with success status and comment data
    """
    try:
        if not task_name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Task ID is required'), frappe.ValidationError)

        if not content or not content.strip():
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Comment content is required'), frappe.ValidationError)

        # Get the task document
        doc = frappe.get_doc('Task', task_name)

        # Check read permission (user must be able to see the task to comment)
        if not doc.has_permission('read'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to access this Task'), frappe.PermissionError)

        # Get current user info
        user = frappe.session.user
        user_fullname = frappe.db.get_value('User', user, 'full_name') or user

        # Add comment using Frappe's built-in method
        comment = doc.add_comment(
            comment_type='Comment',
            text=content
        )

        # Return the created comment data
        return {
            'success': True,
            'message': _('Comment added successfully'),
            'data': {
                'name': comment.name,
                'comment_type': comment.comment_type,
                'content': comment.content,
                'comment_email': comment.comment_email,
                'comment_by': comment.comment_by,
                'creation': comment.creation
            }
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Task {0} not found').format(task_name), frappe.DoesNotExistError)
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
        frappe.log_error(f"Error adding comment to Task {task_name}: {str(e)}", "Task API")
        frappe.throw(_('An error occurred while adding the comment: {0}').format(str(e)), frappe.ValidationError)


@frappe.whitelist()
def get_task_comments(task_name: str, start: int = 0, limit: int = 100) -> Dict[str, Any]:
    """
    Get comments for a Task document

    Args:
        task_name: The Task name/ID
        start: Starting index for pagination
        limit: Number of comments to return

    Returns:
        Dict with comments list
    """
    try:
        if not task_name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Task ID is required'), frappe.ValidationError)

        # Get the task document
        doc = frappe.get_doc('Task', task_name)

        # Check read permission
        if not doc.has_permission('read'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to access this Task'), frappe.PermissionError)

        # Get total count first
        total_count = frappe.db.count(
            'Comment',
            filters={
                'reference_doctype': 'Task',
                'reference_name': task_name,
                'comment_type': 'Comment'
            }
        )

        # Get comments using Frappe's communication system
        comments = frappe.get_all(
            'Comment',
            filters={
                'reference_doctype': 'Task',
                'reference_name': task_name,
                'comment_type': 'Comment'
            },
            fields=[
                'name', 'content', 'comment_email', 'comment_by',
                'creation', 'modified', 'owner'
            ],
            order_by='creation desc',
            start=start,
            limit=limit
        )

        return {
            'success': True,
            'data': comments,
            'total': total_count
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Task {0} not found').format(task_name), frappe.DoesNotExistError)
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
        frappe.log_error(f"Error fetching comments for Task {task_name}: {str(e)}", "Task API")
        frappe.throw(_('An error occurred while fetching comments: {0}').format(str(e)), frappe.ValidationError)
