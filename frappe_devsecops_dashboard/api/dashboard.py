"""
DevSecOps Dashboard API
Integrates with ERPNext Project and Task Type doctypes to provide dashboard data
"""

import frappe
from frappe import _
from frappe.utils import flt, cint, getdate, today
from frappe.desk.form.assign_to import add as assign_to_user
from typing import Dict, List, Any


@frappe.whitelist(allow_guest=True)
def get_dashboard_data():
    """
    Get comprehensive dashboard data using ERPNext Project and Task Type integration
    Uses Frappe ORM with permission-aware queries to ensure proper access control

    Returns:
        dict: Dashboard data with projects, metrics, and lifecycle phases
    """
    try:
        # Get projects with associated tasks and task types
        projects = get_projects_with_tasks()

        # Calculate dashboard metrics
        metrics = calculate_dashboard_metrics(projects)

        # Get DevSecOps lifecycle phases from Task Types
        lifecycle_phases = get_devsecops_lifecycle_phases()

        return {
            "success": True,
            "projects": projects,
            "metrics": metrics,
            "lifecycle_phases": lifecycle_phases,
            "timestamp": frappe.utils.now()
        }

    except frappe.PermissionError:
        frappe.log_error("Permission denied for dashboard data", "DevSecOps Dashboard")
        return {
            "success": False,
            "projects": [],
            "metrics": {
                "total_projects": 0,
                "active_projects": 0,
                "total_tasks": 0,
                "completed_tasks": 0,
                "average_completion": 0,
                "completion_rate": 0
            },
            "lifecycle_phases": [],
            "error": "You don't have permission to access dashboard data",
            "timestamp": frappe.utils.now()
        }
    except Exception as e:
        frappe.log_error(f"Dashboard API Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "projects": [],
            "metrics": {
                "total_projects": 0,
                "active_projects": 0,
                "total_tasks": 0,
                "completed_tasks": 0,
                "average_completion": 0,
                "completion_rate": 0
            },
            "lifecycle_phases": [],
            "error": "An error occurred while loading dashboard data",
            "timestamp": frappe.utils.now()
        }


def get_projects_with_tasks():
    """
    Get all projects with their associated tasks and progress data
    Uses frappe.get_list() which respects user permissions

    Returns:
        list: List of projects with task data and lifecycle progress (only those user has access to)
    """
    try:
        # Use frappe.get_list() to get projects with permission checking
        # frappe.get_list() automatically filters based on user permissions
        # Only returns projects the current user has read access to
        projects_data = frappe.get_list(
            "Project",
            fields=[
                "name",
                "project_name",
                "status",
                "percent_complete",
                "customer",
                "project_type",
                "priority",
                "expected_start_date",
                "expected_end_date",
                "actual_start_date",
                "actual_end_date",
                "cost_center",
                "department",
                "modified"
            ],
            filters={
                "status": ["!=", "Cancelled"]
            },
            order_by="modified desc",
            limit_page_length=None  # Get all projects user has access to
        )

        # Enhance each project with task and lifecycle data
        enhanced_projects = []
        for project in projects_data:
            try:
                enhanced_project = enhance_project_with_task_data(project)
                enhanced_projects.append(enhanced_project)
            except frappe.PermissionError:
                # Skip projects user doesn't have access to
                continue
            except Exception as e:
                # Log error but continue with other projects
                frappe.log_error(f"Error enhancing project {project.get('name')}: {str(e)}", "DevSecOps Dashboard")
                continue

        return enhanced_projects

    except frappe.PermissionError:
        # User doesn't have permission to access projects
        frappe.log_error("User doesn't have permission to access projects", "DevSecOps Dashboard")
        return []
    except Exception as e:
        frappe.log_error(f"Error fetching projects: {str(e)}", "DevSecOps Dashboard")
        return []


def enhance_project_with_task_data(project):
    """
    Enhance project data with task information and lifecycle phases

    Args:
        project (dict): Basic project data

    Returns:
        dict: Enhanced project with task and lifecycle data
    """
    project_name = project.get('name')

    # Get project manager from users child table
    try:
        project_doc = frappe.get_doc("Project", project_name)
        project_manager_name = None

        # Loop through project users to find Project Manager
        if project_doc.users:
            for user_record in project_doc.users:
                # Check custom_business_function field
                business_func = user_record.get("custom_business_function")

                if business_func == "Project Manager":
                    project_manager_name = user_record.get("full_name") or user_record.user
                    break

        project['project_manager'] = project_manager_name
    except Exception as e:
        frappe.log_error(f"Error fetching project manager for {project_name}: {str(e)}", "Project Manager Fetch Error")
        project['project_manager'] = None

    # Get tasks for this project - only show tasks user is assigned to
    try:
        # Get current user
        current_user = frappe.session.user

        # Check if user is Administrator or Project Manager
        user_roles = frappe.get_roles(current_user)
        is_admin_or_pm = (
            current_user == "Administrator" or
            "Administrator" in user_roles or
            "Project Manager" in user_roles
        )

        # Determine task filters based on user role
        if is_admin_or_pm:
            # Administrators and Project Managers see ALL tasks in the project
            tasks = frappe.get_list(
                "Task",
                fields=[
                    "name",
                    "subject",
                    "status",
                    "type",
                    "progress",
                    "priority",
                    "exp_start_date",
                    "exp_end_date",
                    "act_start_date",
                    "act_end_date",
                    "completed_on",
                    "is_milestone",
                    "owner",
                    "description",
                    "idx"
                ],
                filters={
                    "project": project_name
                },
                order_by="type, idx",
                limit_page_length=None
            )
        else:
            # Regular users see only tasks assigned to them via ToDo
            # Get task names where user is assigned via ToDo
            # Note: Show all tasks regardless of ToDo status (including completed)
            assigned_task_names = frappe.get_all(
                'ToDo',
                filters={
                    'reference_type': 'Task',
                    'allocated_to': current_user
                },
                fields=['reference_name'],
                pluck='reference_name'
            )

            # If user has no assigned tasks, use empty list for filters
            if not assigned_task_names:
                tasks = []
            else:
                # Fetch only assigned tasks for this project
                tasks = frappe.get_list(
                    "Task",
                    fields=[
                        "name",
                        "subject",
                        "status",
                        "type",
                        "progress",
                        "priority",
                        "exp_start_date",
                        "exp_end_date",
                        "act_start_date",
                        "act_end_date",
                        "completed_on",
                        "is_milestone",
                        "owner",
                        "description",
                        "idx"
                    ],
                    filters={
                        "project": project_name,
                        "name": ['in', assigned_task_names]
                    },
                    order_by="type, idx",
                    limit_page_length=None
                )

        # Enhance tasks with task type information and assignments using ORM
        enhanced_tasks = []
        for task in tasks:
            try:
                # Get task type description if type exists
                if task.get('type'):
                    task_type_doc = frappe.get_doc("Task Type", task.get('type'))
                    task['task_type_description'] = task_type_doc.get('description', '')
                else:
                    task['task_type_description'] = ''

                # Get task assignments from ToDo doctype
                from frappe_devsecops_dashboard.api.task import get_task_assignments
                task_assignments = get_task_assignments(task.get('name'))
                task['assigned_users'] = task_assignments

                # For backward compatibility, create a comma-separated string of assigned names
                if task_assignments:
                    task['assigned_to'] = ', '.join([a['full_name'] for a in task_assignments])
                else:
                    task['assigned_to'] = ''

                enhanced_tasks.append(task)
            except frappe.DoesNotExistError:
                # Task type doesn't exist, continue without description
                task['task_type_description'] = ''
                task['assigned_users'] = []
                task['assigned_to'] = ''
                enhanced_tasks.append(task)
            except frappe.PermissionError:
                # User doesn't have access to this task type, skip description
                task['task_type_description'] = ''
                task['assigned_users'] = []
                task['assigned_to'] = ''
                enhanced_tasks.append(task)

        tasks = enhanced_tasks

    except frappe.PermissionError:
        # User doesn't have permission to access tasks for this project
        frappe.log_error(f"Permission denied for tasks in project {project_name}", "DevSecOps Dashboard")
        tasks = []
    except Exception as e:
        frappe.log_error(f"Error fetching tasks for project {project_name}: {str(e)}", "DevSecOps Dashboard")
        tasks = []

    # Calculate lifecycle phases based on Task Types with null safety
    lifecycle_phases = calculate_project_lifecycle_phases(tasks) if tasks else []

    # Calculate overall project metrics with null safety
    total_tasks = len(tasks) if tasks else 0
    completed_tasks = len([t for t in tasks if t and t.get('status') == 'Completed']) if tasks else 0

    # Determine current phase with null safety
    current_phase = determine_current_phase(lifecycle_phases) if lifecycle_phases else 'Planning'

    # Calculate actual progress (override project percent_complete if we have task data)
    actual_progress = calculate_actual_progress(tasks) if tasks else (project.get('percent_complete') or 0)

    # Calculate completion rate with null safety
    completion_rate = flt((completed_tasks / total_tasks * 100), 2) if total_tasks and total_tasks > 0 else 0

    return {
        "id": project.get('name') or 'Unknown',
        "name": project.get('project_name') or project.get('name') or 'Unknown',
        "project_status": project.get('status') or 'Unknown',
        "client": project.get('customer') or 'N/A',
        "project_type": project.get('project_type') or 'N/A',
        "priority": project.get('priority') or 'Medium',
        "progress": flt(actual_progress or 0, 2),
        "current_phase": current_phase or 'Planning',
        "task_count": total_tasks or 0,
        "completed_tasks": completed_tasks or 0,
        "completion_rate": completion_rate or 0,
        "delivery_phases": lifecycle_phases or [],
        "expected_start_date": project.get('expected_start_date'),
        "expected_end_date": project.get('expected_end_date'),
        "actual_start_date": project.get('actual_start_date'),
        "actual_end_date": project.get('actual_end_date'),
        "cost_center": project.get('cost_center'),
        "department": project.get('department'),
        "zenhub_id": project.get('zenhub_id'),
        "custom_software_product": project.get('custom_software_product'),
        "custom_default_raci_template": project.get('custom_default_raci_template'),
        "custom_zenhub_workspace_id": project.get('custom_zenhub_workspace_id'),
        "notes": project.get('notes'),
        "project_manager": project.get('project_manager'),  # Include project manager
        "tasks": tasks or []
    }


def calculate_project_lifecycle_phases(tasks):
    """
    Calculate lifecycle phases based on Task Types and their progress with null safety
    Ordered by Task Type custom_priority field (ascending)

    Args:
        tasks (list): List of tasks for a project

    Returns:
        list: Lifecycle phases with progress data (empty list if no tasks)
    """
    try:
        # Null safety: ensure tasks is a list
        if not tasks:
            return []

        # Group tasks by Task Type with null safety
        task_types = {}
        for task in tasks:
            if not task:
                continue
            task_type = task.get('type') or 'Unassigned'
            if task_type not in task_types:
                task_types[task_type] = []
            task_types[task_type].append(task)

        # Fetch Task Type priorities from database
        task_type_priorities = {}
        try:
            task_type_list = frappe.get_all(
                'Task Type',
                fields=['name', 'custom_priority'],
                filters={'name': ['in', list(task_types.keys())]}
            )
            task_type_priorities = {
                tt['name']: tt.get('custom_priority') or 999
                for tt in task_type_list
            }
        except Exception as e:
            frappe.log_error(f"Error fetching Task Type priorities: {str(e)}", "DevSecOps Dashboard")

        # Sort task types by custom_priority (ascending), then by name
        sorted_task_types = sorted(
            task_types.keys(),
            key=lambda tt: (task_type_priorities.get(tt, 999), tt)
        )

        # Process task types in priority order
        phases = []
        for i, task_type_name in enumerate(sorted_task_types):
            task_type_tasks = task_types.get(task_type_name, [])
            if not task_type_tasks:
                continue

            # Calculate phase progress with null safety
            total_tasks = len(task_type_tasks) if task_type_tasks else 0
            completed_tasks = len([
                t for t in task_type_tasks
                if t and t.get('status') == 'Completed'
            ]) if task_type_tasks else 0
            in_progress_tasks = len([
                t for t in task_type_tasks
                if t and t.get('status') in ['Open', 'Working']
            ]) if task_type_tasks else 0

            # Determine phase status with null safety
            if total_tasks == 0:
                phase_status = 'pending'
                phase_progress = 0
            elif completed_tasks == total_tasks:
                phase_status = 'complete'
                phase_progress = 100
            elif completed_tasks > 0 or in_progress_tasks > 0:
                phase_status = 'in_progress'
                phase_progress = flt((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0
            else:
                phase_status = 'pending'
                phase_progress = 0

            phases.append({
                "section_id": f"PHASE-{i+1:03d}",
                "section_name": task_type_name or 'Unknown',
                "section_status": phase_status,
                "section_progress": phase_progress or 0,
                "section_order": i + 1,
                "task_count": total_tasks or 0,
                "completed_tasks": completed_tasks or 0,
                "in_progress_tasks": in_progress_tasks or 0,
                # Legacy fields for backward compatibility
                "name": task_type_name or 'Unknown',
                "status": phase_status,
                "progress": phase_progress or 0
            })

        return phases

    except Exception as e:
        frappe.log_error(f"Error calculating lifecycle phases: {str(e)}", "DevSecOps Dashboard")
        return []





def determine_current_phase(lifecycle_phases):
    """
    Determine the current active phase based on lifecycle progress with null safety

    Args:
        lifecycle_phases (list): List of lifecycle phases

    Returns:
        str: Name of current phase (defaults to 'Planning' if no phases)
    """
    try:
        # Null safety: ensure lifecycle_phases is a list
        if not lifecycle_phases:
            return 'Planning'

        # Find in-progress phase
        for phase in lifecycle_phases:
            if phase and phase.get('section_status') == 'in_progress':
                return phase.get('section_name') or 'Unknown'

        # If no phase is in progress, return the first incomplete phase
        for phase in lifecycle_phases:
            if phase and phase.get('section_status') != 'complete':
                return phase.get('section_name') or 'Unknown'

        # If all phases are complete, return the last phase
        if lifecycle_phases and lifecycle_phases[-1]:
            return lifecycle_phases[-1].get('section_name') or 'Planning'

        return 'Planning'

    except Exception as e:
        frappe.log_error(f"Error determining current phase: {str(e)}", "DevSecOps Dashboard")
        return 'Planning'


def calculate_actual_progress(tasks):
    """
    Calculate actual project progress based on task completion with null safety

    Args:
        tasks (list): List of project tasks

    Returns:
        float: Progress percentage (0-100)
    """
    try:
        # Null safety: ensure tasks is a list
        if not tasks:
            return 0

        # Filter out None values
        valid_tasks = [t for t in tasks if t]
        if not valid_tasks:
            return 0

        total_tasks = len(valid_tasks)
        if total_tasks == 0:
            return 0

        # Count completed tasks with null safety
        completed_tasks = len([
            t for t in valid_tasks
            if t and t.get('status') == 'Completed'
        ])

        # Calculate progress with null safety
        progress = flt((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0

        # Ensure progress is between 0 and 100
        return max(0, min(100, progress))
    except Exception as e:
        frappe.log_error(f"Error calculating progress: {str(e)}", "DevSecOps Dashboard")
        return 0


def calculate_dashboard_metrics(projects):
    """
    Calculate overall dashboard metrics with null safety
    Team capacity calculation removed - will be handled by separate endpoint

    Args:
        projects (list): List of projects

    Returns:
        dict: Dashboard metrics with sensible defaults
    """
    try:
        # Null safety: ensure projects is a list
        if not projects:
            projects = []

        total_projects = len(projects) if projects else 0
        active_projects = len([p for p in projects if p and p.get('project_status') == 'Open']) if projects else 0

        # Calculate total tasks across all projects with null safety
        total_tasks = sum(p.get('task_count', 0) or 0 for p in projects if p) if projects else 0
        completed_tasks = sum(p.get('completed_tasks', 0) or 0 for p in projects if p) if projects else 0

        # Calculate average completion rate with null safety
        completion_rates = [
            p.get('completion_rate', 0) or 0
            for p in projects
            if p and (p.get('task_count', 0) or 0) > 0
        ]
        average_completion = flt(sum(completion_rates) / len(completion_rates), 2) if completion_rates else 0

        # Calculate completion rate with null safety
        completion_rate = flt((completed_tasks / total_tasks * 100), 2) if total_tasks and total_tasks > 0 else 0

        return {
            "total_projects": total_projects or 0,
            "active_projects": active_projects or 0,
            "total_tasks": total_tasks or 0,
            "completed_tasks": completed_tasks or 0,
            "average_completion": average_completion or 0,
            "completion_rate": completion_rate or 0
        }
    except Exception as e:
        frappe.log_error(f"Error calculating dashboard metrics: {str(e)}", "DevSecOps Dashboard")
        # Return sensible defaults on error
        return {
            "total_projects": 0,
            "active_projects": 0,
            "total_tasks": 0,
            "completed_tasks": 0,
            "average_completion": 0,
            "completion_rate": 0
        }


def get_devsecops_lifecycle_phases():
    """
    Get the standard DevSecOps lifecycle phases from Task Types
    Uses frappe.get_list() which respects user permissions
    Ordered by custom_priority field (ascending)

    Returns:
        list: Standard lifecycle phases (only those user has access to)
    """
    try:
        # Use frappe.get_list() to get Task Types with permission checking
        # frappe.get_list() automatically filters based on user permissions
        # Only returns Task Types the current user has read access to
        # Order by custom_priority (ascending) to maintain DevSecOps timeline order
        task_types = frappe.get_list(
            "Task Type",
            fields=["name", "description", "custom_priority"],
            order_by="custom_priority asc, name asc",
            limit_page_length=None
        )

        return [
            {
                "name": tt.get('name'),
                "description": tt.get('description') or f"{tt.get('name')} phase of the DevSecOps lifecycle",
                "priority": tt.get('custom_priority') or 999
            }
            for tt in task_types
        ]

    except frappe.PermissionError:
        # User doesn't have permission to access Task Types
        frappe.log_error("Permission denied for Task Types", "DevSecOps Dashboard")
        return []
    except Exception as e:
        frappe.log_error(f"Error fetching Task Types: {str(e)}", "DevSecOps Dashboard")
        return []


@frappe.whitelist(allow_guest=True)
def get_project_details(project_name):
    """
    Get detailed information for a specific project
    Uses Frappe ORM with permission checking

    Args:
        project_name (str): Name of the project

    Returns:
        dict: Detailed project information
    """
    try:
        # Use frappe.get_doc with permission checking
        project = frappe.get_doc("Project", project_name)

        # Get custom fields safely
        software_product = getattr(project, 'custom_software_product', None)
        raci_template = getattr(project, 'custom_default_raci_template', None)
        zenhub_id = getattr(project, 'custom_zenhub_workspace_id', '')

        # Get enhanced project data
        project_data = {
            "name": project.name,
            "project_name": project.project_name,
            "status": project.status,
            "customer": project.customer,
            "project_type": project.project_type,
            "priority": project.priority,
            "percent_complete": project.percent_complete,
            "expected_start_date": project.expected_start_date,
            "expected_end_date": project.expected_end_date,
            "actual_start_date": project.actual_start_date,
            "actual_end_date": project.actual_end_date,
            "cost_center": project.cost_center,
            "department": project.department,
            "zenhub_id": zenhub_id,
            "notes": project.notes or "",  # Include notes field for project description
            "custom_software_product": software_product,
            "custom_default_raci_template": raci_template,
            "custom_zenhub_workspace_id": zenhub_id
        }

        enhanced_project = enhance_project_with_task_data(project_data)

        return {
            "success": True,
            "project": enhanced_project
        }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project"
        }
    except Exception as e:
        frappe.log_error(f"Project Details API Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching project details"
        }


# ============================================================================
# ATTACHMENTS API ENDPOINTS
# ============================================================================

@frappe.whitelist()
def get_project_files(project_name):
    """
    Get all files attached to a project
    Uses Frappe's File DocType with permission checking

    Args:
        project_name (str): Name of the project

    Returns:
        dict: List of files with metadata
    """
    try:
        # Check read permission on project
        project = frappe.get_doc("Project", project_name)
        if not project.has_permission('read'):
            frappe.throw(_('Permission denied'), frappe.PermissionError)

        # Get files attached to this project
        files = frappe.get_list(
            "File",
            filters={
                "attached_to_doctype": "Project",
                "attached_to_name": project_name
            },
            fields=[
                "name",
                "file_name",
                "file_url",
                "file_size",
                "creation",
                "owner",
                "modified_by"
            ],
            order_by="creation desc"
        )

        # Enhance file data with user information
        for file in files:
            try:
                owner_doc = frappe.get_doc("User", file.get("owner"))
                file["owner_name"] = owner_doc.full_name or file.get("owner")
            except:
                file["owner_name"] = file.get("owner")

        return {
            "success": True,
            "files": files
        }

    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Get Project Files Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching files"
        }


@frappe.whitelist()
def delete_project_file(file_name):
    """
    Delete a file attachment from a project
    Checks write permission on the project

    Args:
        file_name (str): Name of the file to delete

    Returns:
        dict: Success or error response
    """
    try:
        # Get the file document
        file_doc = frappe.get_doc("File", file_name)

        # Check if file is attached to a project
        if file_doc.attached_to_doctype != "Project":
            frappe.throw(_('File is not attached to a project'), frappe.ValidationError)

        # Check write permission on the project
        project = frappe.get_doc("Project", file_doc.attached_to_name)
        if not project.has_permission('write'):
            frappe.throw(_('Permission denied'), frappe.PermissionError)

        # Delete the file
        frappe.delete_doc("File", file_name)
        frappe.db.commit()

        return {
            "success": True,
            "message": "File deleted successfully"
        }

    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for deleting file {file_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to delete this file"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"File '{file_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Delete Project File Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while deleting the file"
        }


@frappe.whitelist()
def upload_project_file():
    """
    Upload a file and attach it to a project
    Uses Frappe's File doctype for proper file management
    Checks write permission on the project

    Form Data:
        file: The file to upload
        doctype: 'Project'
        docname: Name of the project

    Returns:
        dict: File document data or error response
    """
    try:
        # Get form data
        files = frappe.request.files
        form = frappe.form_dict

        if 'file' not in files:
            frappe.throw(_('No file provided'), frappe.ValidationError)

        uploaded_file = files['file']
        doctype = form.get('doctype')
        docname = form.get('docname')

        if not doctype or not docname:
            frappe.throw(_('Doctype and docname are required'), frappe.ValidationError)

        if doctype != 'Project':
            frappe.throw(_('Only Project files are supported'), frappe.ValidationError)

        # Check write permission on the project
        project = frappe.get_doc("Project", docname)
        if not project.has_permission('write'):
            frappe.throw(_('Permission denied'), frappe.PermissionError)

        # Save the file using Frappe's save_file method
        file_doc = frappe.get_doc({
            "doctype": "File",
            "attached_to_doctype": doctype,
            "attached_to_name": docname,
            "file_name": uploaded_file.filename,
            "is_private": 0,  # Make files public by default
            "content": uploaded_file.stream.read()
        })
        file_doc.save(ignore_permissions=True)
        frappe.db.commit()

        return {
            "success": True,
            "file": {
                "name": file_doc.name,
                "file_name": file_doc.file_name,
                "file_url": file_doc.file_url,
                "file_size": file_doc.file_size,
                "is_private": file_doc.is_private,
                "creation": file_doc.creation
            }
        }

    except frappe.PermissionError:
        frappe.response['http_status_code'] = 403
        frappe.log_error(f"Permission denied for uploading file to {form.get('docname')}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to upload files to this project"
        }
    except frappe.ValidationError as ve:
        frappe.response['http_status_code'] = 400
        return {
            "success": False,
            "error": str(ve)
        }
    except frappe.DoesNotExistError:
        frappe.response['http_status_code'] = 404
        return {
            "success": False,
            "error": f"Project '{form.get('docname')}' does not exist"
        }
    except Exception as e:
        frappe.response['http_status_code'] = 500
        frappe.log_error(f"Upload Project File Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": f"An error occurred while uploading the file: {str(e)}"
        }


# ============================================================================
# COMMENTS API ENDPOINTS
# ============================================================================

@frappe.whitelist()
def get_project_comments(project_name):
    """
    Get all comments for a project
    Uses Frappe's Comment DocType with permission checking

    Args:
        project_name (str): Name of the project

    Returns:
        dict: List of comments with user information
    """
    try:
        # Check read permission on project
        project = frappe.get_doc("Project", project_name)
        if not project.has_permission('read'):
            frappe.throw(_('Permission denied'), frappe.PermissionError)

        # Get comments for this project
        comments = frappe.get_list(
            "Comment",
            filters={
                "reference_doctype": "Project",
                "reference_name": project_name
            },
            fields=[
                "name",
                "content",
                "owner",
                "creation",
                "modified",
                "comment_type"
            ],
            order_by="creation desc"
        )

        # Enhance comment data with user information
        for comment in comments:
            try:
                owner_doc = frappe.get_doc("User", comment.get("owner"))
                comment["owner_name"] = owner_doc.full_name or comment.get("owner")
                comment["owner_email"] = owner_doc.email
                comment["user_image"] = owner_doc.user_image
            except:
                comment["owner_name"] = comment.get("owner")
                comment["owner_email"] = ""
                comment["user_image"] = None

        return {
            "success": True,
            "comments": comments
        }

    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Get Project Comments Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching comments"
        }


@frappe.whitelist()
def add_project_comment(project_name, content):
    """
    Add a comment to a project
    Checks write permission on the project

    Args:
        project_name (str): Name of the project
        content (str): Comment content

    Returns:
        dict: Created comment data
    """
    try:
        # Check write permission on project
        project = frappe.get_doc("Project", project_name)
        if not project.has_permission('write'):
            frappe.throw(_('Permission denied'), frappe.PermissionError)

        # Validate content
        if not content or not content.strip():
            frappe.throw(_('Comment content cannot be empty'), frappe.ValidationError)

        # Create comment using Frappe's Comment DocType
        comment = frappe.new_doc("Comment")
        comment.reference_doctype = "Project"
        comment.reference_name = project_name
        comment.content = content
        comment.comment_type = "Comment"
        comment.insert(ignore_permissions=False)

        # Get user information
        user_doc = frappe.get_doc("User", frappe.session.user)

        return {
            "success": True,
            "comment": {
                "name": comment.name,
                "content": comment.content,
                "owner": comment.owner,
                "owner_name": user_doc.full_name or comment.owner,
                "owner_email": user_doc.email,
                "user_image": user_doc.user_image,
                "creation": comment.creation,
                "modified": comment.modified
            }
        }

    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to comment on this project"
        }
    except frappe.ValidationError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Add Project Comment Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while adding the comment"
        }


@frappe.whitelist()
def update_project_comment(comment_name, content):
    """
    Update an existing comment
    Only the comment owner can update their own comments

    Args:
        comment_name (str): Name of the comment
        content (str): New comment content

    Returns:
        dict: Updated comment data
    """
    try:
        # Get the comment
        comment = frappe.get_doc("Comment", comment_name)

        # Check if user is the comment owner
        if comment.owner != frappe.session.user:
            frappe.throw(_('You can only edit your own comments'), frappe.PermissionError)

        # Validate content
        if not content or not content.strip():
            frappe.throw(_('Comment content cannot be empty'), frappe.ValidationError)

        # Update comment
        comment.content = content
        comment.save(ignore_permissions=False)

        return {
            "success": True,
            "comment": {
                "name": comment.name,
                "content": comment.content,
                "owner": comment.owner,
                "creation": comment.creation,
                "modified": comment.modified
            }
        }

    except frappe.PermissionError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except frappe.ValidationError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Comment '{comment_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Update Project Comment Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while updating the comment"
        }


@frappe.whitelist()
def delete_project_comment(comment_name):
    """
    Delete a comment from a project
    Only the comment owner or project owner can delete comments

    Args:
        comment_name (str): Name of the comment

    Returns:
        dict: Success or error response
    """
    try:
        # Get the comment
        comment = frappe.get_doc("Comment", comment_name)

        # Check if user is the comment owner
        if comment.owner != frappe.session.user:
            # Check if user has write permission on the project
            project = frappe.get_doc("Project", comment.reference_name)
            if not project.has_permission('write'):
                frappe.throw(_('You can only delete your own comments'), frappe.PermissionError)

        # Delete the comment
        frappe.delete_doc("Comment", comment_name)
        frappe.db.commit()

        return {
            "success": True,
            "message": "Comment deleted successfully"
        }

    except frappe.PermissionError as e:
        return {
            "success": False,
            "error": str(e)
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Comment '{comment_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Delete Project Comment Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while deleting the comment"
        }


# ============================================================================
# USER SEARCH API ENDPOINT (for @ mentions)
# ============================================================================

@frappe.whitelist()
def search_users(query):
    """
    Search for users by name or email for @ mention functionality
    Only returns users that the current user can see

    Args:
        query (str): Search query (name or email)

    Returns:
        dict: List of matching users
    """
    try:
        if not query or len(query.strip()) < 2:
            return {
                "success": True,
                "users": []
            }

        query = query.strip()

        # Search users by full_name or email
        users = frappe.get_list(
            "User",
            filters=[
                ["full_name", "like", f"%{query}%"],
                ["enabled", "=", 1]
            ],
            fields=[
                "name",
                "full_name",
                "email",
                "user_image"
            ],
            limit_page_length=10
        )

        # If no results by full_name, try email
        if not users:
            users = frappe.get_list(
                "User",
                filters=[
                    ["email", "like", f"%{query}%"],
                    ["enabled", "=", 1]
                ],
                fields=[
                    "name",
                    "full_name",
                    "email",
                    "user_image"
                ],
                limit_page_length=10
            )

        return {
            "success": True,
            "users": users
        }

    except Exception as e:
        frappe.log_error(f"Search Users Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": True,
            "users": []
        }


# ============================================================================
# PROJECT DETAIL PAGE ENDPOINTS
# ============================================================================

@frappe.whitelist()
def get_project_users(project_name):
    """
    Get project users including project manager and team members
    Fetches from the project_users child table

    Args:
        project_name (str): Name of the project

    Returns:
        dict: Project manager and team members
    """
    try:
        frappe.logger().info(f"[get_project_users] Fetching users for project {project_name}")

        # Get the project document
        project = frappe.get_doc("Project", project_name)

        project_manager = None
        team_members = []

        # Process project users
        if project.users:
            frappe.logger().info(f"[get_project_users] Found {len(project.users)} users in project")

            for user_record in project.users:
                user_data = {
                    "name": user_record.user,
                    "full_name": user_record.full_name,
                    "email": user_record.email,
                    "image": user_record.image,
                    "business_function": user_record.get("custom_business_function", ""),
                    "custom_is_change_approver": int(user_record.get("custom_is_change_approver") or 0),
                    "view_attachments": int(user_record.get("view_attachments") or 0)
                }

                frappe.logger().info(f"[get_project_users] User: {user_record.user}, full_name={user_record.full_name}, email={user_record.email}, image={user_record.image}, business_function={user_record.get('custom_business_function', '')}")

                # Check if this is the project manager
                if user_record.get("custom_business_function") == "Project Manager":
                    frappe.logger().info(f"[get_project_users] Found project manager: {user_record.user}")
                    project_manager = user_data
                else:
                    team_members.append(user_data)
        else:
            frappe.logger().info(f"[get_project_users] No users found in project")

        frappe.logger().info(f"[get_project_users] Returning: project_manager={project_manager}, team_members count={len(team_members)}")

        return {
            "success": True,
            "project_manager": project_manager,
            "team_members": team_members
        }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project"
        }
    except Exception as e:
        frappe.log_error(f"Get Project Users Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching project users"
        }


@frappe.whitelist()
def get_project_recent_activity(project_name, limit=10):
    """
    Get recent activity (comments) for a project and its tasks
    Fetches comments from both Project and related Task doctypes

    Args:
        project_name (str): Name of the project
        limit (int): Maximum number of comments to return (default: 10)

    Returns:
        dict: List of recent comments/activity
    """
    try:
        limit = cint(limit)

        # Get comments for the project itself
        project_comments = frappe.get_list(
            "Comment",
            filters={
                "reference_doctype": "Project",
                "reference_name": project_name,
                "docstatus": 0
            },
            fields=[
                "name",
                "content",
                "owner",
                "owner_name",
                "creation",
                "reference_doctype",
                "reference_name"
            ],
            order_by="creation desc",
            limit_page_length=limit
        )

        # Get task names for this project
        tasks = frappe.get_list(
            "Task",
            filters={"project": project_name},
            fields=["name"],
            limit_page_length=None
        )
        task_names = [task.get("name") for task in tasks]

        # Get comments for related tasks
        task_comments = []
        if task_names:
            task_comments = frappe.get_list(
                "Comment",
                filters={
                    "reference_doctype": "Task",
                    "reference_name": ["in", task_names],
                    "docstatus": 0
                },
                fields=[
                    "name",
                    "content",
                    "owner",
                    "owner_name",
                    "creation",
                    "reference_doctype",
                    "reference_name"
                ],
                order_by="creation desc",
                limit_page_length=limit
            )

        # Combine and sort by creation time
        all_comments = project_comments + task_comments
        all_comments.sort(key=lambda x: x.get("creation", ""), reverse=True)

        # Limit to requested number
        recent_activity = all_comments[:limit]

        return {
            "success": True,
            "recent_activity": recent_activity
        }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project"
        }
    except Exception as e:
        frappe.log_error(f"Get Project Recent Activity Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching recent activity"
        }


@frappe.whitelist()
def get_software_product_team_members(product_name):
    """
    Get team members from a Software Product

    Args:
        product_name (str): Name of the Software Product

    Returns:
        dict: List of team members with their roles
    """
    try:
        # Get the Software Product document
        product = frappe.get_doc("Software Product", product_name)

        # Extract team members with user details
        team_members = []
        for member in product.team_members:
            # Get user details
            user_doc = frappe.get_doc("User", member.member)

            team_members.append({
                "user": member.member,
                "email": user_doc.email,
                "full_name": user_doc.full_name,
                "user_image": user_doc.user_image,
                "role": member.role,  # This maps to business_function in project
                "business_function": member.role  # Direct mapping
            })

        return {
            "success": True,
            "team_members": team_members,
            "product_name": product_name
        }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Software Product '{product_name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for Software Product {product_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this Software Product"
        }
    except Exception as e:
        frappe.log_error(f"Get Software Product Team Members Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching team members"
        }


@frappe.whitelist()
def get_project_milestones(project_name):
    """
    Get milestones (tasks marked as milestones) for a project

    Args:
        project_name (str): Name of the project

    Returns:
        dict: List of milestones
    """
    try:
        # Get milestone tasks for this project
        milestones = frappe.get_list(
            "Task",
            filters={
                "project": project_name,
                "is_milestone": 1
            },
            fields=[
                "name",
                "subject",
                "status",
                "progress",
                "priority",
                "exp_start_date",
                "exp_end_date",
                "act_start_date",
                "act_end_date",
                "completed_on"
            ],
            order_by="exp_end_date asc, creation desc",
            limit_page_length=None
        )

        return {
            "success": True,
            "milestones": milestones
        }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project"
        }
    except Exception as e:
        frappe.log_error(f"Get Project Milestones Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching milestones"
        }


@frappe.whitelist()
def get_task_types():
    """
    Get all available Task Types

    Returns:
        dict: Success status and list of task types
    """
    try:
        task_types = frappe.get_list(
            "Task Type",
            fields=["name", "description"],
            order_by="name asc"
        )

        return {
            "success": True,
            "task_types": task_types
        }
    except Exception as e:
        frappe.log_error(f"Get Task Types Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching task types"
        }


@frappe.whitelist()
def create_project_task(project_name, task_data):
    """
    Create a new task for a project

    Args:
        project_name (str): Name of the project
        task_data (dict): Task data including subject, description, priority, etc.

    Returns:
        dict: Success status and created task details
    """
    try:
        # Parse task_data if it's a string (from JSON)
        if isinstance(task_data, str):
            import json
            task_data = json.loads(task_data)

        # Validate project exists and user has access
        project = frappe.get_doc("Project", project_name)

        # Validate required fields
        if not task_data.get("subject"):
            return {
                "success": False,
                "error": "Task subject is required"
            }

        # Create new task document
        task = frappe.get_doc({
            "doctype": "Task",
            "subject": task_data.get("subject"),
            "project": project_name,
            "description": task_data.get("description", ""),
            "priority": task_data.get("priority", "Medium"),
            "status": task_data.get("status", "Open"),
            "type": task_data.get("task_type"),
            "exp_start_date": task_data.get("exp_start_date"),
            "exp_end_date": task_data.get("exp_end_date"),
            "is_milestone": task_data.get("is_milestone", 0)
        })

        # Save the task
        task.insert(ignore_permissions=False)

        # Assign to user if provided
        if task_data.get("assigned_to"):
            try:
                assign_to_user({
                    "doctype": "Task",
                    "name": task.name,
                    "assign_to": task_data.get("assigned_to"),
                    "notify": 1
                })
            except Exception as e:
                frappe.log_error(f"Failed to assign task: {str(e)}", "DevSecOps Dashboard")
                # Continue even if assignment fails

        return {
            "success": True,
            "message": "Task created successfully",
            "task": {
                "name": task.name,
                "subject": task.subject,
                "status": task.status,
                "priority": task.priority,
                "exp_end_date": task.exp_end_date
            }
        }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to create tasks in this project"
        }
    except frappe.ValidationError as e:
        return {
            "success": False,
            "error": f"Validation error: {str(e)}"
        }
    except Exception as e:
        frappe.log_error(f"Create Project Task Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while creating the task"
        }


@frappe.whitelist()
def update_task(task_name, data):
    """
    Update an existing task

    Args:
        task_name (str): Name of the task to update
        data (str): JSON string with fields to update

    Returns:
        dict: Success status and updated task details
    """
    try:
        # Parse data if it's a string (from JSON)
        if isinstance(data, str):
            import json
            data = json.loads(data)

        # Get the task document
        task = frappe.get_doc("Task", task_name)

        # Check write permission
        if not task.has_permission("write"):
            frappe.log_error(f"Permission denied for task {task_name}", "DevSecOps Dashboard")
            return {
                "success": False,
                "error": "You don't have permission to update this task"
            }

        # Update allowed fields
        allowed_fields = [
            "subject",
            "status",
            "priority",
            "description",
            "exp_start_date",
            "exp_end_date",
            "progress",
            "type",
            "is_milestone"
        ]

        for field in allowed_fields:
            if field in data:
                setattr(task, field, data[field])

        # Save the task
        task.save(ignore_permissions=False)

        return {
            "success": True,
            "message": "Task updated successfully",
            "data": {
                "name": task.name,
                "subject": task.subject,
                "status": task.status,
                "priority": task.priority,
                "exp_end_date": task.exp_end_date,
                "progress": task.progress,
                "description": task.description
            }
        }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Task '{task_name}' does not exist"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for task {task_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to update this task"
        }
    except frappe.ValidationError as e:
        return {
            "success": False,
            "error": f"Validation error: {str(e)}"
        }
    except Exception as e:
        frappe.log_error(f"Update Task Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while updating the task"
        }


@frappe.whitelist(allow_guest=True)
def get_frontend_assets():
    """
    Get frontend asset hashes from Vite manifest.json
    Returns the correct script and CSS file names for dynamic loading

    Returns:
        dict: Asset file names with hashes
    """
    try:
        import json
        import os

        # Path to manifest.json generated by Vite
        manifest_path = os.path.join(
            os.path.dirname(__file__),
            '..',
            'public',
            'frontend',
            '.vite',
            'manifest.json'
        )

        # Fallback: check if manifest exists in the root of public/frontend
        if not os.path.exists(manifest_path):
            manifest_path = os.path.join(
                os.path.dirname(__file__),
                '..',
                'public',
                'frontend',
                'manifest.json'
            )

        # If manifest doesn't exist, return empty (will use fallback in HTML)
        if not os.path.exists(manifest_path):
            return {
                "success": False,
                "message": "Manifest not found - using fallback",
                "js_file": None,
                "css_file": None
            }

        with open(manifest_path, 'r') as f:
            manifest = json.load(f)

        # Extract entry point (Vite uses index.html or src/main.jsx)
        js_file = None
        css_file = None

        # Try different entry point names
        entry_names = ['index.html', 'src/main.jsx', 'main.jsx']

        for entry_name in entry_names:
            if entry_name in manifest:
                entry = manifest[entry_name]
                if 'file' in entry:
                    js_file = entry['file']
                    # Strip 'assets/' prefix since BASE_PATH already includes it
                    if js_file.startswith('assets/'):
                        js_file = js_file[7:]  # Remove 'assets/' prefix
                if 'css' in entry and len(entry['css']) > 0:
                    css_file = entry['css'][0]
                    # Strip 'assets/' prefix since BASE_PATH already includes it
                    if css_file.startswith('assets/'):
                        css_file = css_file[7:]  # Remove 'assets/' prefix
                break

        return {
            "success": True,
            "js_file": js_file,
            "css_file": css_file,
            "base_path": "/assets/frappe_devsecops_dashboard/frontend/assets/"
        }

    except Exception as e:
        frappe.log_error(f"Error reading frontend manifest: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": str(e),
            "js_file": None,
            "css_file": None
        }


@frappe.whitelist()
def update_project(project_name, project_data):
    """Update project details"""
    try:
        import json

        # Parse project data
        if isinstance(project_data, str):
            project_data = json.loads(project_data)

        # Get project document
        project = frappe.get_doc("Project", project_name)

        # Update fields
        if "project_name" in project_data:
            project.project_name = project_data["project_name"]
        if "status" in project_data:
            project.status = project_data["status"]
        if "priority" in project_data:
            project.priority = project_data["priority"]
        if "expected_start_date" in project_data:
            project.expected_start_date = project_data["expected_start_date"]
        if "expected_end_date" in project_data:
            project.expected_end_date = project_data["expected_end_date"]
        if "notes" in project_data:
            project.notes = project_data["notes"]
        if "custom_software_product" in project_data:
            # Update Software Product - Frappe will auto-fetch custom_default_raci_template via fetch_from
            project.custom_software_product = project_data["custom_software_product"]
        if "custom_zenhub_workspace_id" in project_data:
            project.custom_zenhub_workspace_id = project_data["custom_zenhub_workspace_id"]

        # Save project
        project.save()

        return {
            "success": True,
            "message": "Project updated successfully"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to edit this project"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Update Project Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while updating the project"
        }


@frappe.whitelist()
def add_project_user(project_name, user_id):
    """Add a user to a project with all required fields populated"""
    try:
        frappe.logger().info(f"[add_project_user] Adding user {user_id} to project {project_name}")

        # Get project document
        project = frappe.get_doc("Project", project_name)

        # Check if user already exists in project
        existing_user = next((u for u in project.users if u.user == user_id), None)
        if existing_user:
            frappe.logger().warning(f"[add_project_user] User {user_id} already exists in project {project_name}")
            return {
                "success": False,
                "error": "User is already assigned to this project"
            }

        # Get user document to fetch user details
        user_doc = frappe.get_doc("User", user_id)
        frappe.logger().info(f"[add_project_user] User details: email={user_doc.email}, full_name={user_doc.full_name}, image={user_doc.user_image}")

        # Add user to project with all fields populated
        # Note: Frappe will auto-populate email, image, full_name via fetch_from
        # But we explicitly set them here for robustness
        project.append("users", {
            "user": user_id,
            "email": user_doc.email,
            "full_name": user_doc.full_name,
            "image": user_doc.user_image,
            "welcome_email_sent": 1  # Set to True by default
        })

        # Optional: set additional fields if provided in payload
        try:
            user_fields_raw = frappe.form_dict.get("user_fields")
            if user_fields_raw:
                # Accept both JSON string and dict payloads
                if isinstance(user_fields_raw, str):
                    import json
                    user_fields = json.loads(user_fields_raw)
                else:
                    user_fields = user_fields_raw

                # Map common alias to custom field if needed
                if "business_function" in user_fields and "custom_business_function" not in user_fields:
                    user_fields["custom_business_function"] = user_fields["business_function"]

                # Apply allowed fields to the new child row only if they exist on the doctype
                new_row = project.users[-1]
                for field, value in (user_fields or {}).items():
                    try:
                        df = new_row.meta.get_field(field) if hasattr(new_row, "meta") else None
                        if df:
                            # Coerce Check values to 0/1
                            if df.fieldtype == "Check":
                                value = 1 if (value in (1, True, "1", "true", "True", "on")) else 0
                            new_row.set(field, value)
                    except Exception:
                        # Ignore invalid fields silently
                        pass
        except Exception as e:
            frappe.logger().warning(f"[add_project_user] Ignored user_fields due to parse/set error: {e}")

        # Save project
        project.save()
        frappe.logger().info(f"[add_project_user] User {user_id} added successfully to project {project_name}")

        return {
            "success": True,
            "message": "User added to project successfully"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to modify this project"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Add Project User Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while adding the user"
        }


@frappe.whitelist()
def remove_project_user(project_name, user_id):
    """Remove a user from a project"""
    try:
        # Get project document
        project = frappe.get_doc("Project", project_name)

        # Find and remove user
        user_found = False
        for i, user in enumerate(project.users):
            if user.user == user_id:
                del project.users[i]
                user_found = True
                break

        if not user_found:
            return {
                "success": False,
                "error": "User is not assigned to this project"
            }

        # Save project
        project.save()

        return {
            "success": True,
            "message": "User removed from project successfully"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to modify this project"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Remove Project User Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while removing the user"
        }


@frappe.whitelist()
def update_project_manager(project_name, user_id):
    """Update the project manager for a project with all required fields populated"""
    try:
        frappe.logger().info(f"[update_project_manager] Updating project manager for {project_name} to {user_id}")

        # Get project document
        project = frappe.get_doc("Project", project_name)

        # Check if user is already assigned to the project
        user_exists = False
        for user_record in project.users:
            if user_record.user == user_id:
                user_exists = True
                break

        # If user is not in the project, add them first
        if not user_exists:
            frappe.logger().info(f"[update_project_manager] User {user_id} not in project, adding them first")

            # Get user document to fetch user details
            user_doc = frappe.get_doc("User", user_id)
            frappe.logger().info(f"[update_project_manager] User details: email={user_doc.email}, full_name={user_doc.full_name}, image={user_doc.user_image}")

            # Add user with all fields populated
            project.append("users", {
                "user": user_id,
                "email": user_doc.email,
                "full_name": user_doc.full_name,
                "image": user_doc.user_image,
                "welcome_email_sent": 1  # ALWAYS set to True when adding new Project Manager
            })

        # Clear previous project manager designation
        for user_record in project.users:
            if user_record.get("custom_business_function") == "Project Manager":
                frappe.logger().info(f"[update_project_manager] Clearing Project Manager designation from {user_record.user}")
                user_record.custom_business_function = ""

        # Set the new project manager


        for user_record in project.users:
            if user_record.user == user_id:
                frappe.logger().info(f"[update_project_manager] Setting {user_id} as Project Manager")
                user_record.custom_business_function = "Project Manager"
                break

        # Save project
        project.save()
        frappe.logger().info(f"[update_project_manager] Project manager updated successfully for {project_name}")

        return {
            "success": True,
            "message": "Project manager updated successfully"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to modify this project"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Update Project Manager Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while updating the project manager"
        }


@frappe.whitelist()
def get_project_metrics(project_name):
    """Get project task metrics"""
    try:
        # Debug logging
        frappe.logger().info(f"[get_project_metrics] Fetching metrics for project: {project_name}")

        # Verify project exists
        try:
            project = frappe.get_doc("Project", project_name)
            frappe.logger().info(f"[get_project_metrics] Found project: {project.name}")
        except frappe.DoesNotExistError:
            frappe.logger().warning(f"[get_project_metrics] Project not found: {project_name}")
            return {
                "success": False,
                "error": f"Project '{project_name}' does not exist"
            }

        # Get all tasks for the project
        all_tasks = frappe.get_list(
            "Task",
            filters={"project": project_name},
            fields=["name", "status"]
        )

        frappe.logger().info(f"[get_project_metrics] Found {len(all_tasks)} tasks for project {project_name}")
        if all_tasks:
            frappe.logger().info(f"[get_project_metrics] Task statuses: {[t.get('status') for t in all_tasks]}")

        # Calculate metrics
        total_tasks = len(all_tasks)
        completed_tasks = len([t for t in all_tasks if t.status == "Completed"])
        in_progress_tasks = len([t for t in all_tasks if t.status in ["Working", "Open"]])

        # Calculate completion rate
        completion_rate = 0
        if total_tasks > 0:
            completion_rate = round((completed_tasks / total_tasks) * 100, 2)

        frappe.logger().info(f"[get_project_metrics] Metrics: total={total_tasks}, completed={completed_tasks}, in_progress={in_progress_tasks}, rate={completion_rate}%")

        return {
            "success": True,
            "metrics": {
                "total_tasks": total_tasks,
                "completed_tasks": completed_tasks,
                "in_progress_tasks": in_progress_tasks,
                "completion_rate": completion_rate
            }
        }
    except Exception as e:
        frappe.logger().error(f"[get_project_metrics] Error: {str(e)}")
        frappe.log_error(f"Get Project Metrics Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching project metrics"
        }


@frappe.whitelist()
def update_task_status(task_name, status):
    """
    Update task status

    Args:
        task_name (str): Name of the task
        status (str): New status (e.g., 'Completed', 'Open', 'Working')

    """


    try:
        # Get task document
        task = frappe.get_doc("Task", task_name)

        # Update status
        task.status = status

        # If marking as completed, set completed_on date
        if status == "Completed":
            task.completed_on = frappe.utils.today()

        # Save task
        task.save()

        return {
            "success": True,
            "message": f"Task status updated to {status}",
            "task": {
                "name": task.name,
                "status": task.status,
                "completed_on": task.completed_on
            }
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for task {task_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to update this task"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Task '{task_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Update Task Status Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while updating task status"
        }


@frappe.whitelist()
def get_project_tasks(project_name):
    """
    Get all tasks for a project

    Task visibility:
    - Administrators and Project Managers see all tasks in the project
    - Other users only see tasks they are assigned to

    Args:
        project_name (str): Name of the project

    Returns:
        dict: List of tasks
    """
    try:
        # Get current user
        current_user = frappe.session.user

        # Check if user is Administrator or Project Manager
        user_roles = frappe.get_roles(current_user)
        is_admin_or_pm = (
            current_user == "Administrator" or
            "Administrator" in user_roles or
            "Project Manager" in user_roles
        )

        # Determine task filters based on user role
        if is_admin_or_pm:
            # Administrators and Project Managers see ALL tasks in the project
            task_filters = {
                "project": project_name
            }
            filtered_by_assignment = False
        else:
            # Regular users see only tasks assigned to them via ToDo
            # Get task names where user is assigned via ToDo
            # Note: Show all tasks regardless of ToDo status (including completed)
            assigned_task_names = frappe.get_all(
                'ToDo',
                filters={
                    'reference_type': 'Task',
                    'allocated_to': current_user
                },
                fields=['reference_name'],
                pluck='reference_name'
            )

            # If user has no assigned tasks, return empty list
            if not assigned_task_names:
                return {
                    "success": True,
                    "tasks": [],
                    "filtered_by_assignment": True
                }

            # Build task filters - only show assigned tasks for this project
            task_filters = {
                "project": project_name,
                "name": ['in', assigned_task_names]
            }
            filtered_by_assignment = True

        # Get all tasks for the project (filtered by assignment if not admin/pm)
        tasks = frappe.get_list(
            "Task",
            filters=task_filters,
            fields=[
                "name",
                "subject",
                "status",
                "priority",
                "exp_start_date",
                "exp_end_date",
                "progress",
                "owner",
                "description",
                "is_milestone"
            ],
            order_by="creation desc",
            limit_page_length=None
        )

        # Enrich tasks with assignment information
        from frappe_devsecops_dashboard.api.task import get_task_assignments
        for task in tasks:
            task_assignments = get_task_assignments(task.get('name'))
            task['assigned_users'] = task_assignments
            # For backward compatibility, create a comma-separated string of assigned names
            if task_assignments:
                task['assigned_to'] = ', '.join([a['full_name'] for a in task_assignments])
            else:
                task['assigned_to'] = ''

        return {
            "success": True,
            "tasks": tasks or [],
            "filtered_by_assignment": filtered_by_assignment
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project's tasks",
            "tasks": []
        }
    except Exception as e:
        frappe.log_error(f"Get Project Tasks Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching project tasks",
            "tasks": []
        }

@frappe.whitelist()
def update_project_user(project_name, user_id, user_fields=None):
    """Update fields for an existing user in a project"""
    try:
        frappe.logger().info(f"[update_project_user] Updating user {user_id} in project {project_name}")
        project = frappe.get_doc("Project", project_name)

        # Find the target child row
        target = next((u for u in project.users if u.user == user_id), None)
        if not target:
            return {
                "success": False,
                "error": "User is not assigned to this project"
            }

        # Parse user_fields from argument or form_dict
        if isinstance(user_fields, str):
            import json
            user_fields = json.loads(user_fields)
        elif user_fields is None:
            raw = frappe.form_dict.get("user_fields")
            if raw:
                if isinstance(raw, str):
                    import json
                    user_fields = json.loads(raw)
                else:
                    user_fields = raw
            else:
                user_fields = {}

        # Map common alias to custom field if needed
        if "business_function" in user_fields and "custom_business_function" not in user_fields:
            user_fields["custom_business_function"] = user_fields["business_function"]

        # Apply only fields that exist on child doctype
        for field, value in (user_fields or {}).items():
            try:
                df = target.meta.get_field(field) if hasattr(target, "meta") else None
                if df:
                    if df.fieldtype == "Check":
                        value = 1 if (value in (1, True, "1", "true", "True", "on")) else 0
                    target.set(field, value)
            except Exception:
                # Ignore invalid fields silently
                pass

        project.save()
        frappe.logger().info(f"[update_project_user] Updated user {user_id} in project {project_name}")
        return {
            "success": True,
            "message": "Project user updated successfully"
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to modify this project"
        }
    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Project '{project_name}' does not exist"
        }
    except Exception as e:
        frappe.log_error(f"Update Project User Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while updating the user"
        }



@frappe.whitelist()
def get_dashboard_metrics(metric_type="all", **filters):
    """
    Unified metrics API endpoint for all dashboard types
    Accepts metric_type parameter to specify which metrics to retrieve

    Args:
        metric_type (str): Type of metrics to retrieve ('change_requests', 'incidents', 'projects', 'all')
        **filters: Additional filters for the metrics query

    Returns:
        dict: Metrics data in consistent JSON format with null safety
    """
    try:
        result = {
            "success": True,
            "metrics": {},
            "data": [],
            "timestamp": frappe.utils.now()
        }

        # Get Change Requests metrics
        if metric_type in ["change_requests", "all"]:
            result["metrics"]["change_requests"] = get_change_requests_metrics(filters)
            if metric_type == "change_requests":
                result["data"] = get_change_requests_data(filters)

        # Get Incidents metrics
        if metric_type in ["incidents", "all"]:
            result["metrics"]["incidents"] = get_incidents_metrics(filters)
            if metric_type == "incidents":
                result["data"] = get_incidents_data(filters)

        # Get Projects metrics
        if metric_type in ["projects", "all"]:
            result["metrics"]["projects"] = get_projects_metrics(filters)
            if metric_type == "projects":
                result["data"] = get_projects_data_for_metrics(filters)

        return result

    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for metrics: {metric_type}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access these metrics",
            "metrics": {},
            "data": [],
            "timestamp": frappe.utils.now()
        }
    except Exception as e:
        frappe.log_error(f"Get Dashboard Metrics Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching metrics",
            "metrics": {},
            "data": [],
            "timestamp": frappe.utils.now()
        }


def get_change_requests_metrics(filters=None):
    """
    Calculate Change Requests metrics with null safety

    Args:
        filters (dict): Filter parameters

    Returns:
        dict: Change Requests metrics
    """
    try:
        filters = filters or {}

        # Build query filters
        query_filters = {}
        if filters.get("status"):
            query_filters["approval_status"] = filters["status"]

        # Get all change requests
        change_requests = frappe.get_list(
            "Change Request",
            filters=query_filters,
            fields=["name", "approval_status"],
            limit_page_length=None
        ) or []

        # Calculate metrics with null safety
        metrics = {
            "total": len(change_requests) if change_requests else 0,
            "pending": len([cr for cr in change_requests if cr.get("approval_status") == "Pending"]) if change_requests else 0,
            "approved": len([cr for cr in change_requests if cr.get("approval_status") == "Approved"]) if change_requests else 0,
            "rejected": len([cr for cr in change_requests if cr.get("approval_status") == "Rejected"]) if change_requests else 0,
            "in_progress": len([cr for cr in change_requests if cr.get("approval_status") == "In Progress"]) if change_requests else 0,
            "completed": len([cr for cr in change_requests if cr.get("approval_status") == "Completed"]) if change_requests else 0,
            "avg_approval_time": 24  # Default value
        }

        return metrics

    except Exception as e:
        frappe.log_error(f"Error calculating CR metrics: {str(e)}", "DevSecOps Dashboard")
        return {
            "total": 0,
            "pending": 0,
            "approved": 0,
            "rejected": 0,
            "in_progress": 0,
            "completed": 0,
            "avg_approval_time": 0
        }


def get_change_requests_data(filters=None):
    """
    Get Change Requests data with null safety

    Args:
        filters (dict): Filter parameters

    Returns:
        list: Change Requests data
    """
    try:
        filters = filters or {}

        # Build query filters
        query_filters = {}
        if filters.get("status"):
            query_filters["approval_status"] = filters["status"]

        # Get change requests
        change_requests = frappe.get_list(
            "Change Request",
            filters=query_filters,
            fields=[
                "name",
                "title",
                "cr_number",
                "approval_status",
                "prepared_for",
                "submission_date",
                "modified"
            ],
            order_by="modified desc",
            limit_page_length=100
        ) or []

        return change_requests

    except Exception as e:
        frappe.log_error(f"Error fetching CR data: {str(e)}", "DevSecOps Dashboard")
        return []


def get_incidents_metrics(filters=None):
    """
    Calculate Incidents metrics with null safety

    Args:
        filters (dict): Filter parameters

    Returns:
        dict: Incidents metrics
    """
    try:
        filters = filters or {}

        # Build query filters
        query_filters = {}
        if filters.get("status"):
            query_filters["status"] = filters["status"]
        if filters.get("severity"):
            query_filters["severity"] = filters["severity"]

        # Get all incidents
        incidents = frappe.get_list(
            "Incident",
            filters=query_filters,
            fields=["name", "status", "severity"],
            limit_page_length=None
        ) or []

        # Calculate metrics with null safety
        metrics = {
            "total": len(incidents) if incidents else 0,
            "open": len([inc for inc in incidents if inc.get("status") == "Open"]) if incidents else 0,
            "in_progress": len([inc for inc in incidents if inc.get("status") == "In Progress"]) if incidents else 0,
            "resolved": len([inc for inc in incidents if inc.get("status") == "Resolved"]) if incidents else 0,
            "critical": len([inc for inc in incidents if inc.get("severity") == "Critical"]) if incidents else 0,
            "high": len([inc for inc in incidents if inc.get("severity") == "High"]) if incidents else 0,
            "medium": len([inc for inc in incidents if inc.get("severity") == "Medium"]) if incidents else 0,
            "low": len([inc for inc in incidents if inc.get("severity") == "Low"]) if incidents else 0,
            "avg_resolution_time": 48  # Default value
        }

        return metrics

    except Exception as e:
        frappe.log_error(f"Error calculating incidents metrics: {str(e)}", "DevSecOps Dashboard")
        return {
            "total": 0,
            "open": 0,
            "in_progress": 0,
            "resolved": 0,
            "critical": 0,
            "high": 0,
            "medium": 0,
            "low": 0,
            "avg_resolution_time": 0
        }


def get_incidents_data(filters=None):
    """
    Get Incidents data with null safety

    Args:
        filters (dict): Filter parameters

    Returns:
        list: Incidents data
    """
    try:
        filters = filters or {}

        # Build query filters
        query_filters = {}
        if filters.get("status"):
            query_filters["status"] = filters["status"]
        if filters.get("severity"):
            query_filters["severity"] = filters["severity"]

        # Get incidents
        incidents = frappe.get_list(
            "Incident",
            filters=query_filters,
            fields=[
                "name",
                "title",
                "incident_id",
                "status",
                "severity",
                "category",
                "creation",
                "modified"
            ],
            order_by="modified desc",
            limit_page_length=100
        ) or []

        return incidents

    except Exception as e:
        frappe.log_error(f"Error fetching incidents data: {str(e)}", "DevSecOps Dashboard")
        return []


def get_projects_metrics(filters=None):
    """
    Calculate Projects metrics with null safety

    Args:
        filters (dict): Filter parameters

    Returns:
        dict: Projects metrics
    """
    try:
        filters = filters or {}

        # Get all projects
        projects = frappe.get_list(
            "Project",
            filters={"status": ["!=", "Cancelled"]},
            fields=["name", "status"],
            limit_page_length=None
        ) or []

        # Calculate metrics with null safety
        metrics = {
            "total": len(projects) if projects else 0,
            "active": len([p for p in projects if p.get("status") == "Open"]) if projects else 0,
            "completed": len([p for p in projects if p.get("status") == "Completed"]) if projects else 0,
            "on_hold": len([p for p in projects if p.get("status") == "On Hold"]) if projects else 0
        }

        return metrics

    except Exception as e:
        frappe.log_error(f"Error calculating projects metrics: {str(e)}", "DevSecOps Dashboard")
        return {
            "total": 0,
            "active": 0,
            "completed": 0,
            "on_hold": 0
        }


def get_projects_data_for_metrics(filters=None):
    """
    Get Projects data with null safety

    Args:
        filters (dict): Filter parameters

    Returns:
        list: Projects data
    """
    try:
        filters = filters or {}

        # Get projects
        projects = frappe.get_list(
            "Project",
            filters={"status": ["!=", "Cancelled"]},
            fields=[
                "name",
                "project_name",
                "status",
                "customer",
                "modified"
            ],
            order_by="modified desc",
            limit_page_length=100
        ) or []

        return projects

    except Exception as e:
        frappe.log_error(f"Error fetching projects data: {str(e)}", "DevSecOps Dashboard")
        return []


@frappe.whitelist()
def create_project(project_name, project_type, expected_start_date, expected_end_date,
                   team_members=None, notes=None, priority=None, department=None, project_template=None, custom_software_product=None):
    """
    Create a new project with team members and optional template.

    Args:
        project_name (str): Name of the project (required, must be unique)
        project_type (str): Type of project (required)
        expected_start_date (str): Expected start date in YYYY-MM-DD format (required)
        expected_end_date (str): Expected end date in YYYY-MM-DD format (required)
        team_members (list): List of team member objects with 'user' field (optional)
        notes (str): Project notes/description (optional)
        priority (str): Project priority - Low, Medium, High (optional, defaults to Medium)
        department (str): Department link (optional)
        project_template (str): Project Template name to use for auto-populating tasks (optional)
        custom_software_product (str): Link to Software Product (optional, will auto-fetch RACI Template)

    Returns:
        dict: JSON response with success status and project details or error information

    Example:
        POST /api/method/frappe_devsecops_dashboard.api.dashboard.create_project
        {
            "project_name": "New Project",
            "project_type": "Internal",
            "expected_start_date": "2024-01-01",
            "expected_end_date": "2024-12-31",
            "team_members": [{"user": "user1@example.com"}, {"user": "user2@example.com"}],
            "notes": "Project description",
            "priority": "High",
            "project_template": "Template Name"
        }
    """
    try:
        # Validate required fields
        if not project_name or not project_name.strip():
            return {
                "success": False,
                "error": "Project name is required",
                "error_type": "validation_error"
            }

        if not project_type or not project_type.strip():
            return {
                "success": False,
                "error": "Project type is required",
                "error_type": "validation_error"
            }

        if not expected_start_date:
            return {
                "success": False,
                "error": "Expected start date is required",
                "error_type": "validation_error"
            }

        if not expected_end_date:
            return {
                "success": False,
                "error": "Expected end date is required",
                "error_type": "validation_error"
            }

        # Validate date range
        try:
            start_date = getdate(expected_start_date)
            end_date = getdate(expected_end_date)

            if end_date < start_date:
                return {
                    "success": False,
                    "error": "Expected end date must be after expected start date",
                    "error_type": "validation_error"
                }
        except Exception as e:
            return {
                "success": False,
                "error": f"Invalid date format: {str(e)}",
                "error_type": "validation_error"
            }

        # Check if project name already exists
        existing_project = frappe.db.exists("Project", project_name)
        if existing_project:
            return {
                "success": False,
                "error": f"Project '{project_name}' already exists",
                "error_type": "validation_error"
            }

        # Check permission to create projects
        if not frappe.has_permission("Project", ptype="create"):
            return {
                "success": False,
                "error": "You don't have permission to create projects",
                "error_type": "permission_error"
            }

        # Create new project document
        project = frappe.new_doc("Project")
        project.project_name = project_name.strip()
        project.project_type = project_type
        project.expected_start_date = start_date
        project.expected_end_date = end_date
        project.status = "Open"
        project.is_active = "Yes"

        # Set optional fields
        if priority:
            project.priority = priority
        else:
            project.priority = "Medium"

        if department:
            project.department = department

        if notes:
            project.notes = notes

        # Set Software Product if provided (will auto-fetch RACI Template via fetch_from)
        if custom_software_product:
            project.custom_software_product = custom_software_product

        # Set project template if provided
        if project_template:
            # Validate template exists
            if frappe.db.exists("Project Template", project_template):
                project.project_template = project_template
            else:
                frappe.log_error(
                    f"Project Template '{project_template}' does not exist",
                    "Create Project - Invalid Template"
                )

        # Add team members if provided
        if team_members and isinstance(team_members, list):
            for member in team_members:
                if isinstance(member, dict) and member.get("user"):
                    user_id = member.get("user")

                    # Validate user exists
                    if not frappe.db.exists("User", user_id):
                        frappe.log_error(
                            f"User '{user_id}' does not exist",
                            "Create Project - Invalid User"
                        )
                        continue

                    # Get user details
                    try:
                        user_doc = frappe.get_doc("User", user_id)
                        user_row = {
                            "user": user_id,
                            "email": user_doc.email,
                            "full_name": user_doc.full_name,
                            "image": user_doc.user_image,
                            "welcome_email_sent": 1  # Set to True by default
                        }

                        # Add custom_business_function if provided in member data
                        if member.get("custom_business_function"):
                            user_row["custom_business_function"] = member.get("custom_business_function")

                        project.append("users", user_row)
                    except Exception as e:
                        frappe.log_error(
                            f"Error adding user {user_id}: {str(e)}",
                            "Create Project - Add User Error"
                        )
                        continue

        # Save the project
        project.insert(ignore_permissions=False)
        frappe.db.commit()

        frappe.logger().info(f"Project '{project_name}' created successfully")

        return {
            "success": True,
            "message": "Project created successfully",
            "project_id": project.name,
            "project_name": project.project_name,
            "project": {
                "name": project.name,
                "project_name": project.project_name,
                "project_type": project.project_type,
                "status": project.status,
                "expected_start_date": str(project.expected_start_date),
                "expected_end_date": str(project.expected_end_date),
                "priority": project.priority,
                "team_members_count": len(project.users)
            }
        }

    except frappe.PermissionError as e:
        frappe.log_error(f"Permission denied: {str(e)}", "Create Project - Permission Error")
        return {
            "success": False,
            "error": "You don't have permission to create projects",
            "error_type": "permission_error"
        }
    except frappe.ValidationError as e:
        frappe.log_error(f"Validation error: {str(e)}", "Create Project - Validation Error")
        return {
            "success": False,
            "error": str(e),
            "error_type": "validation_error"
        }
    except Exception as e:
        frappe.log_error(f"Unexpected error creating project: {str(e)}", "Create Project - Error")
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }


@frappe.whitelist(allow_guest=True)
def get_dashboard_metrics():
    """
    Get optimized dashboard metrics with efficient database queries
    Uses frappe.db.count() and aggregation for performance

    Returns:
        dict: Dashboard metrics with project, task, incident, and change request counts
    """
    try:
        # Count projects by status using optimized queries
        total_projects = len(frappe.get_list("Project", fields=["name"]))
        active_projects = len(frappe.get_list("Project", filters=[["status", "=", "Open"]], fields=["name"]))
        completed_projects = len(frappe.get_list("Project", filters=[["status", "=", "Completed"]], fields=["name"]))

        # Count tasks by status - only for tasks assigned to current user
        current_user = frappe.session.user
        # Note: Include all ToDo items regardless of status to show completed tasks
        assigned_task_names = frappe.get_all(
            'ToDo',
            filters={
                'reference_type': 'Task',
                'allocated_to': current_user
            },
            fields=['reference_name'],
            pluck='reference_name'
        )

        if not assigned_task_names:
            total_tasks = 0
            completed_tasks = 0
            in_progress_tasks = 0
            overdue_tasks = 0
        else:
            total_tasks = len(frappe.get_list("Task", filters=[["name", "in", assigned_task_names]], fields=["name"]))
            completed_tasks = len(frappe.get_list("Task", filters=[["name", "in", assigned_task_names], ["status", "=", "Completed"]], fields=["name"]))
            in_progress_tasks = len(frappe.get_list("Task", filters=[["name", "in", assigned_task_names], ["status", "in", ["Open", "Working"]]], fields=["name"]))
            overdue_tasks = len(frappe.get_list("Task", filters=[["name", "in", assigned_task_names], ["status", "=", "Overdue"]], fields=["name"]))

        # Count incidents by status using optimized queries
        total_incidents = len(frappe.get_list("Devsecops Dashboard Incident", fields=["name"]))
        open_incidents = len(frappe.get_list("Devsecops Dashboard Incident", filters=[["status", "in", ["Open", "Acknowledged", "In Progress"]]], fields=["name"]))
        critical_incidents = len(frappe.get_list("Devsecops Dashboard Incident", filters=[["severity", "=", "S1 - Critical"]], fields=["name"]))

        # Count change requests by approval status using optimized queries
        total_change_requests = len(frappe.get_list("Change Request", fields=["name"]))
        pending_approvals = len(frappe.get_list("Change Request", filters=[["approval_status", "=", "Pending"]], fields=["name"]))
        approved_requests = len(frappe.get_list("Change Request", filters=[["approval_status", "=", "Approved"]], fields=["name"]))

        # Calculate completion rates
        task_completion_rate = flt((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0
        project_completion_rate = flt((completed_projects / total_projects * 100), 2) if total_projects > 0 else 0

        return {
            "success": True,
            "metrics": {
                "projects": {
                    "total": total_projects or 0,
                    "active": active_projects or 0,
                    "completed": completed_projects or 0,
                    "completion_rate": project_completion_rate or 0
                },
                "tasks": {
                    "total": total_tasks or 0,
                    "completed": completed_tasks or 0,
                    "in_progress": in_progress_tasks or 0,
                    "overdue": overdue_tasks or 0,
                    "completion_rate": task_completion_rate or 0
                },
                "incidents": {
                    "total": total_incidents or 0,
                    "open": open_incidents or 0,
                    "critical": critical_incidents or 0
                },
                "change_requests": {
                    "total": total_change_requests or 0,
                    "pending_approvals": pending_approvals or 0,
                    "approved": approved_requests or 0
                }
            },
            "timestamp": frappe.utils.now()
        }

    except frappe.PermissionError:
        frappe.log_error("Permission denied for dashboard metrics", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access dashboard metrics",
            "metrics": {
                "projects": {"total": 0, "active": 0, "completed": 0, "completion_rate": 0},
                "tasks": {"total": 0, "completed": 0, "in_progress": 0, "overdue": 0, "completion_rate": 0},
                "incidents": {"total": 0, "open": 0, "critical": 0},
                "change_requests": {"total": 0, "pending_approvals": 0, "approved": 0}
            }
        }
    except Exception as e:
        import traceback
        error_msg = f"Error fetching dashboard metrics: {str(e)}\n{traceback.format_exc()}"
        frappe.log_error(error_msg, "DevSecOps Dashboard")
        return {
            "success": False,
            "error": str(e),
            "metrics": {
                "projects": {"total": 0, "active": 0, "completed": 0, "completion_rate": 0},
                "tasks": {"total": 0, "completed": 0, "in_progress": 0, "overdue": 0, "completion_rate": 0},
                "incidents": {"total": 0, "open": 0, "critical": 0},
                "change_requests": {"total": 0, "pending_approvals": 0, "approved": 0}
            }
        }
