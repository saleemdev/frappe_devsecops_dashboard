"""
Project Activity API endpoints
Gets recent comments/activity from Project, Change Request, and Incident doctypes
"""

import frappe
from frappe import _
from typing import Dict, Any, List


@frappe.whitelist()
def get_project_recent_activity(project_name: str, limit: int = 20) -> Dict[str, Any]:
    """
    Get recent activity (comments) for a project from related doctypes

    Args:
        project_name: The Project name
        limit: Number of activities to return (default 20)

    Returns:
        Dict with activity list and metadata
    """
    try:
        if not project_name:
            frappe.response['http_status_code'] = 400
            frappe.throw(_('Project name is required'), frappe.ValidationError)

        # Verify project exists and check permissions
        project_doc = frappe.get_doc('Project', project_name)
        if not project_doc.has_permission('read'):
            frappe.response['http_status_code'] = 403
            frappe.throw(_('You do not have permission to access this Project'), frappe.PermissionError)

        activities = []

        # 1. Get comments from Project doctype
        project_comments = frappe.get_all(
            'Comment',
            filters={
                'reference_doctype': 'Project',
                'reference_name': project_name,
                'comment_type': 'Comment'
            },
            fields=[
                'name', 'content', 'comment_email', 'comment_by',
                'creation', 'modified', 'owner', 'reference_doctype', 'reference_name'
            ],
            order_by='creation desc'
        )

        for comment in project_comments:
            activities.append({
                **comment,
                'activity_type': 'comment',
                'doctype_label': 'Project',
                'document_title': project_doc.project_name or project_name
            })

        # 2. Get Change Requests linked to this project
        change_requests = frappe.get_all(
            'Change Request',
            filters={'project': project_name},
            fields=['name', 'title'],
            limit=100  # Get up to 100 CRs
        )

        # Get comments from those Change Requests
        for cr in change_requests:
            cr_comments = frappe.get_all(
                'Comment',
                filters={
                    'reference_doctype': 'Change Request',
                    'reference_name': cr.name,
                    'comment_type': 'Comment'
                },
                fields=[
                    'name', 'content', 'comment_email', 'comment_by',
                    'creation', 'modified', 'owner', 'reference_doctype', 'reference_name'
                ],
                order_by='creation desc'
            )

            for comment in cr_comments:
                activities.append({
                    **comment,
                    'activity_type': 'comment',
                    'doctype_label': 'Change Request',
                    'document_title': cr.title or cr.name
                })

        # 3. Get Incidents linked to this project
        incidents = frappe.get_all(
            'Devsecops Dashboard Incident',
            filters={'project': project_name},
            fields=['name', 'title'],
            limit=100  # Get up to 100 incidents
        )

        # Get comments from those Incidents
        for incident in incidents:
            incident_comments = frappe.get_all(
                'Comment',
                filters={
                    'reference_doctype': 'Devsecops Dashboard Incident',
                    'reference_name': incident.name,
                    'comment_type': 'Comment'
                },
                fields=[
                    'name', 'content', 'comment_email', 'comment_by',
                    'creation', 'modified', 'owner', 'reference_doctype', 'reference_name'
                ],
                order_by='creation desc'
            )

            for comment in incident_comments:
                activities.append({
                    **comment,
                    'activity_type': 'comment',
                    'doctype_label': 'Incident',
                    'document_title': incident.title or incident.name
                })

        # Sort all activities by creation date (most recent first)
        activities.sort(key=lambda x: x['creation'], reverse=True)

        # Limit the results
        limited_activities = activities[:int(limit)]

        return {
            'success': True,
            'data': limited_activities,
            'total': len(limited_activities),
            'total_available': len(activities)
        }

    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        frappe.throw(_('Project {0} not found').format(project_name), frappe.DoesNotExistError)
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
        frappe.log_error(f"Error fetching project activity for {project_name}: {str(e)}", "Project Activity API")
        frappe.throw(_('An error occurred while fetching project activity: {0}').format(str(e)), frappe.ValidationError)
