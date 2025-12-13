"""
Project RACI Synchronization API
Syncs task assignments based on RACI Template and team member business functions
"""

import frappe
from frappe import _
from typing import Dict, Any, List
from frappe.desk.form.assign_to import add as add_assignment, clear as clear_assignments


@frappe.whitelist()
def sync_project_task_assignments(project_name: str, force_reassign: bool = False) -> Dict[str, Any]:
    """
    Synchronize task assignments for a project based on RACI template mappings

    Logic:
    1. Get project's RACI template
    2. Get project team members with their business functions
    3. For each task in the project, find RACI assignments matching the task
    4. Assign team members based on their business function matching the RACI responsible role

    Args:
        project_name: The Project name/ID
        force_reassign: If True, clear existing assignments before syncing (default: False)

    Returns:
        Dict with success status, assignment summary, and detailed logs
    """
    try:
        # Validate project exists
        if not frappe.db.exists('Project', project_name):
            frappe.response['http_status_code'] = 404
            return {
                'success': False,
                'error': f'Project {project_name} not found'
            }

        # Get project document
        project = frappe.get_doc('Project', project_name)

        # Check if user has permission
        if not project.has_permission('write'):
            frappe.response['http_status_code'] = 403
            return {
                'success': False,
                'error': 'You do not have permission to modify this project'
            }

        # Get RACI template
        raci_template_name = project.get('custom_default_raci_template')
        if not raci_template_name:
            return {
                'success': False,
                'error': 'Project does not have a RACI template assigned',
                'hint': 'Set custom_default_raci_template field on the project'
            }

        # Validate RACI template exists
        if not frappe.db.exists('RACI Template', raci_template_name):
            return {
                'success': False,
                'error': f'RACI Template {raci_template_name} not found'
            }

        raci_template = frappe.get_doc('RACI Template', raci_template_name)

        # Get RACI assignments (task -> RACI roles mappings)
        raci_assignments = raci_template.get('raci_assignments', [])
        if not raci_assignments:
            return {
                'success': False,
                'error': 'RACI Template has no assignments defined',
                'hint': 'Add task assignments to the RACI template'
            }

        # Build mapping: task_name -> RACI roles (responsible, accountable, etc.)
        task_to_raci = {}
        for assignment in raci_assignments:
            task_name = assignment.get('task_name')
            if task_name:
                task_to_raci[task_name] = {
                    'responsible': assignment.get('responsible'),
                    'accountable': assignment.get('accountable'),
                    'consulted': assignment.get('consulted'),
                    'informed': assignment.get('informed'),
                    'task_type': assignment.get('task_type')
                }

        frappe.logger().info(f"RACI task mappings: {task_to_raci}")

        # Get project team members with their designations
        team_members = project.get('users', [])
        if not team_members:
            return {
                'success': False,
                'error': 'Project has no team members',
                'hint': 'Add team members to the project'
            }

        # Build mapping: designation -> list of user emails
        designation_to_users = {}
        for member in team_members:
            user_email = member.get('user')
            designation = member.get('custom_business_function')  # This is actually a Designation link

            if user_email and designation:
                if designation not in designation_to_users:
                    designation_to_users[designation] = []
                designation_to_users[designation].append(user_email)

        frappe.logger().info(f"Team member mappings: {designation_to_users}")

        # Get all tasks for this project
        tasks = frappe.get_all(
            'Task',
            filters={'project': project_name},
            fields=['name', 'subject', 'status']
        )

        if not tasks:
            return {
                'success': False,
                'error': 'Project has no tasks',
                'hint': 'Create tasks for the project first'
            }

        # Sync assignments
        assignment_log = []
        tasks_assigned = 0
        tasks_skipped = 0
        tasks_no_match = 0
        assignments_created = 0
        assignments_cleared = 0

        for task in tasks:
            task_name = task['name']
            task_subject = task['subject']

            # Find matching RACI assignment by task subject
            raci_roles = task_to_raci.get(task_subject)

            if not raci_roles:
                # No RACI assignment found for this task
                tasks_no_match += 1
                assignment_log.append({
                    'task': task_name,
                    'subject': task_subject,
                    'status': 'no_match',
                    'reason': 'No RACI assignment found for this task name'
                })
                continue

            # Collect all users who should be assigned based on RACI roles
            users_to_assign = set()
            raci_details = []

            # Check Responsible (R) - who does the work
            if raci_roles['responsible']:
                responsible_users = designation_to_users.get(raci_roles['responsible'], [])
                users_to_assign.update(responsible_users)
                if responsible_users:
                    raci_details.append(f"Responsible: {raci_roles['responsible']}")

            # Check Accountable (A) - who makes decisions
            if raci_roles['accountable']:
                accountable_users = designation_to_users.get(raci_roles['accountable'], [])
                users_to_assign.update(accountable_users)
                if accountable_users:
                    raci_details.append(f"Accountable: {raci_roles['accountable']}")

            # Optionally assign Consulted (C) and Informed (I) if they exist
            # You can enable these if you want those roles to also receive assignments
            # if raci_roles['consulted']:
            #     consulted_users = designation_to_users.get(raci_roles['consulted'], [])
            #     users_to_assign.update(consulted_users)

            # if raci_roles['informed']:
            #     informed_users = designation_to_users.get(raci_roles['informed'], [])
            #     users_to_assign.update(informed_users)

            assigned_users = list(users_to_assign)

            # Process assignment
            if assigned_users:
                try:
                    # Clear existing assignments if force_reassign is True
                    if force_reassign:
                        try:
                            clear_assignments('Task', task_name)
                            assignments_cleared += 1
                        except Exception as clear_err:
                            frappe.logger().warning(f"Could not clear assignments for {task_name}: {str(clear_err)}")

                    # Add new assignments
                    for user_email in assigned_users:
                        try:
                            raci_description = ', '.join(raci_details) if raci_details else 'RACI-based'
                            add_assignment({
                                'doctype': 'Task',
                                'name': task_name,
                                'assign_to': [user_email],
                                'description': f'Auto-assigned based on RACI template: {raci_description}'
                            })
                            assignments_created += 1

                            assignment_log.append({
                                'task': task_name,
                                'subject': task_subject,
                                'raci_roles': raci_details,
                                'assigned_to': user_email,
                                'status': 'assigned'
                            })
                        except frappe.DuplicateEntryError:
                            # User already assigned, skip
                            assignment_log.append({
                                'task': task_name,
                                'subject': task_subject,
                                'raci_roles': raci_details,
                                'assigned_to': user_email,
                                'status': 'already_assigned'
                            })
                            tasks_skipped += 1

                    tasks_assigned += 1

                except Exception as assign_err:
                    assignment_log.append({
                        'task': task_name,
                        'subject': task_subject,
                        'raci_roles': raci_details,
                        'error': str(assign_err),
                        'status': 'error'
                    })
                    frappe.logger().error(f"Error assigning task {task_name}: {str(assign_err)}")
            else:
                # RACI roles defined but no matching team members
                tasks_no_match += 1
                assignment_log.append({
                    'task': task_name,
                    'subject': task_subject,
                    'status': 'no_match',
                    'reason': f'RACI roles defined ({", ".join(raci_details)}) but no team members with those designations'
                })

        # Commit changes
        frappe.db.commit()

        # Return summary
        return {
            'success': True,
            'message': 'Task assignment synchronization completed',
            'summary': {
                'total_tasks': len(tasks),
                'tasks_assigned': tasks_assigned,
                'tasks_skipped': tasks_skipped,
                'tasks_no_match': tasks_no_match,
                'assignments_created': assignments_created,
                'assignments_cleared': assignments_cleared if force_reassign else 0
            },
            'details': assignment_log,
            'project': project_name,
            'raci_template': raci_template_name
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        return {
            'success': False,
            'error': 'Permission denied'
        }
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Error in sync_project_task_assignments for {project_name}: {str(e)}", "Project Sync API")
        return {
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }


@frappe.whitelist()
def preview_sync_assignments(project_name: str) -> Dict[str, Any]:
    """
    Preview what assignments would be made without actually creating them
    Useful for testing and validation

    Args:
        project_name: The Project name/ID

    Returns:
        Dict with preview of assignments that would be made
    """
    try:
        # Validate project exists
        if not frappe.db.exists('Project', project_name):
            return {
                'success': False,
                'error': f'Project {project_name} not found'
            }

        project = frappe.get_doc('Project', project_name)

        # Get RACI template
        raci_template_name = project.get('custom_default_raci_template')
        if not raci_template_name:
            return {
                'success': False,
                'error': 'Project does not have a RACI template assigned'
            }

        raci_template = frappe.get_doc('RACI Template', raci_template_name)
        raci_assignments = raci_template.get('raci_assignments', [])

        # Build task -> RACI roles mapping
        task_to_raci = {}
        for assignment in raci_assignments:
            task_name = assignment.get('task_name')
            if task_name:
                task_to_raci[task_name] = {
                    'responsible': assignment.get('responsible'),
                    'accountable': assignment.get('accountable'),
                    'consulted': assignment.get('consulted'),
                    'informed': assignment.get('informed')
                }

        # Build designation -> users mapping
        designation_to_users = {}
        for member in project.get('users', []):
            user_email = member.get('user')
            designation = member.get('custom_business_function')
            if user_email and designation:
                if designation not in designation_to_users:
                    designation_to_users[designation] = []
                designation_to_users[designation].append(user_email)

        # Get tasks
        tasks = frappe.get_all(
            'Task',
            filters={'project': project_name},
            fields=['name', 'subject']
        )

        # Build preview
        preview = []
        for task in tasks:
            task_subject = task['subject']
            raci_roles = task_to_raci.get(task_subject)

            if raci_roles:
                users_to_assign = set()
                raci_details = {}

                # Check Responsible
                if raci_roles['responsible']:
                    users = designation_to_users.get(raci_roles['responsible'], [])
                    users_to_assign.update(users)
                    raci_details['responsible'] = raci_roles['responsible']

                # Check Accountable
                if raci_roles['accountable']:
                    users = designation_to_users.get(raci_roles['accountable'], [])
                    users_to_assign.update(users)
                    raci_details['accountable'] = raci_roles['accountable']

                preview.append({
                    'task': task['name'],
                    'subject': task_subject,
                    'raci_roles': raci_details,
                    'would_assign_to': list(users_to_assign),
                    'user_count': len(users_to_assign)
                })

        return {
            'success': True,
            'preview': preview,
            'summary': {
                'total_tasks': len(tasks),
                'tasks_with_matches': len(preview),
                'tasks_without_matches': len(tasks) - len(preview)
            },
            'raci_template': raci_template_name,
            'team_designations': list(designation_to_users.keys())
        }

    except Exception as e:
        frappe.log_error(f"Error in preview_sync_assignments for {project_name}: {str(e)}", "Project Sync API")
        return {
            'success': False,
            'error': f'An error occurred: {str(e)}'
        }
