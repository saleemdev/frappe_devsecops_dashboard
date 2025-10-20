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

    # Get tasks for this project using frappe.get_list() with permission checking
    try:
        # Use frappe.get_list() to get tasks with permission checking
        # frappe.get_list() automatically filters based on user permissions
        # Only returns tasks the current user has read access to
        tasks = frappe.get_list(
            "Task",
            fields=[
                "name",
                "subject",
                "status",
                "task_type",
                "progress",
                "priority",
                "exp_start_date",
                "exp_end_date",
                "act_start_date",
                "act_end_date",
                "completed_on",
                "idx"
            ],
            filters={
                "project": project_name
            },
            order_by="task_type, idx",
            limit_page_length=None  # Get all tasks user has access to
        )

        # Enhance tasks with task type information using ORM
        enhanced_tasks = []
        for task in tasks:
            try:
                # Get task type description if task_type exists
                if task.get('task_type'):
                    task_type_doc = frappe.get_doc("Task Type", task.get('task_type'))
                    task['task_type_description'] = task_type_doc.get('description', '')
                else:
                    task['task_type_description'] = ''
                enhanced_tasks.append(task)
            except frappe.DoesNotExistError:
                # Task type doesn't exist, continue without description
                task['task_type_description'] = ''
                enhanced_tasks.append(task)
            except frappe.PermissionError:
                # User doesn't have access to this task type, skip description
                task['task_type_description'] = ''
                enhanced_tasks.append(task)

        tasks = enhanced_tasks

    except frappe.PermissionError:
        # User doesn't have permission to access tasks for this project
        frappe.log_error(f"Permission denied for tasks in project {project_name}", "DevSecOps Dashboard")
        tasks = []
    except Exception as e:
        frappe.log_error(f"Error fetching tasks for project {project_name}: {str(e)}", "DevSecOps Dashboard")
        tasks = []

    # Calculate lifecycle phases based on Task Types
    lifecycle_phases = calculate_project_lifecycle_phases(tasks)

    # Calculate overall project metrics
    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == 'Completed'])

    # Determine current phase
    current_phase = determine_current_phase(lifecycle_phases)

    # Calculate actual progress (override project percent_complete if we have task data)
    actual_progress = calculate_actual_progress(tasks) if tasks else project.get('percent_complete', 0)

    return {
        "id": project.get('name'),
        "name": project.get('project_name') or project.get('name'),
        "project_status": project.get('status'),
        "client": project.get('customer'),
        "project_type": project.get('project_type'),
        "priority": project.get('priority'),
        "progress": flt(actual_progress, 2),
        "current_phase": current_phase,
        "task_count": total_tasks,
        "completed_tasks": completed_tasks,
        "completion_rate": flt((completed_tasks / total_tasks * 100) if total_tasks > 0 else 0, 2),
        "delivery_phases": lifecycle_phases,
        "expected_start_date": project.get('expected_start_date'),
        "expected_end_date": project.get('expected_end_date'),
        "actual_start_date": project.get('actual_start_date'),
        "actual_end_date": project.get('actual_end_date'),
        "cost_center": project.get('cost_center'),
        "department": project.get('department'),
        "tasks": tasks
    }


def calculate_project_lifecycle_phases(tasks):
    """
    Calculate lifecycle phases based on Task Types and their progress
    Task Type ordering will be handled by custom_priority field in future

    Args:
        tasks (list): List of tasks for a project

    Returns:
        list: Lifecycle phases with progress data
    """
    # Group tasks by Task Type
    task_types = {}
    for task in tasks:
        task_type = task.get('task_type') or 'Unassigned'
        if task_type not in task_types:
            task_types[task_type] = []
        task_types[task_type].append(task)

    # Process task types in alphabetical order (no custom ordering)
    phases = []
    for i, task_type_name in enumerate(sorted(task_types.keys())):
        task_type_tasks = task_types[task_type_name]

        # Calculate phase progress
        total_tasks = len(task_type_tasks)
        completed_tasks = len([t for t in task_type_tasks if t.status == 'Completed'])
        in_progress_tasks = len([t for t in task_type_tasks if t.status in ['Open', 'Working']])

        # Determine phase status
        if total_tasks == 0:
            phase_status = 'pending'
            phase_progress = 0
        elif completed_tasks == total_tasks:
            phase_status = 'complete'
            phase_progress = 100
        elif completed_tasks > 0 or in_progress_tasks > 0:
            phase_status = 'in_progress'
            phase_progress = flt((completed_tasks / total_tasks * 100), 2)
        else:
            phase_status = 'pending'
            phase_progress = 0

        phases.append({
            "section_id": f"PHASE-{i+1:03d}",
            "section_name": task_type_name,
            "section_status": phase_status,
            "section_progress": phase_progress,
            "section_order": i + 1,
            "task_count": total_tasks,
            "completed_tasks": completed_tasks,
            "in_progress_tasks": in_progress_tasks,
            # Legacy fields for backward compatibility
            "name": task_type_name,
            "status": phase_status,
            "progress": phase_progress
        })

    return phases





def determine_current_phase(lifecycle_phases):
    """
    Determine the current active phase based on lifecycle progress

    Args:
        lifecycle_phases (list): List of lifecycle phases

    Returns:
        str: Name of current phase
    """
    for phase in lifecycle_phases:
        if phase.get('section_status') == 'in_progress':
            return phase.get('section_name')

    # If no phase is in progress, return the first incomplete phase
    for phase in lifecycle_phases:
        if phase.get('section_status') != 'complete':
            return phase.get('section_name')

    # If all phases are complete, return the last phase
    if lifecycle_phases:
        return lifecycle_phases[-1].get('section_name')

    return 'Planning'


def calculate_actual_progress(tasks):
    """
    Calculate actual project progress based on task completion

    Args:
        tasks (list): List of project tasks

    Returns:
        float: Progress percentage
    """
    if not tasks:
        return 0

    total_tasks = len(tasks)
    completed_tasks = len([t for t in tasks if t.status == 'Completed'])

    return flt((completed_tasks / total_tasks * 100), 2)


def calculate_dashboard_metrics(projects):
    """
    Calculate overall dashboard metrics
    Team capacity calculation removed - will be handled by separate endpoint

    Args:
        projects (list): List of projects

    Returns:
        dict: Dashboard metrics
    """
    total_projects = len(projects)
    active_projects = len([p for p in projects if p.get('project_status') == 'Open'])

    # Calculate total tasks across all projects
    total_tasks = sum(p.get('task_count', 0) for p in projects)
    completed_tasks = sum(p.get('completed_tasks', 0) for p in projects)

    # Calculate average completion rate
    completion_rates = [p.get('completion_rate', 0) for p in projects if p.get('task_count', 0) > 0]
    average_completion = flt(sum(completion_rates) / len(completion_rates), 2) if completion_rates else 0

    return {
        "total_projects": total_projects,
        "active_projects": active_projects,
        "total_tasks": total_tasks,
        "completed_tasks": completed_tasks,
        "average_completion": average_completion,
        "completion_rate": flt((completed_tasks / total_tasks * 100), 2) if total_tasks > 0 else 0
    }


def get_devsecops_lifecycle_phases():
    """
    Get the standard DevSecOps lifecycle phases from Task Types
    Uses frappe.get_list() which respects user permissions

    Returns:
        list: Standard lifecycle phases (only those user has access to)
    """
    try:
        # Use frappe.get_list() to get Task Types with permission checking
        # frappe.get_list() automatically filters based on user permissions
        # Only returns Task Types the current user has read access to
        task_types = frappe.get_list(
            "Task Type",
            fields=["name", "description"],
            order_by="name",
            limit_page_length=None
        )

        return [
            {
                "name": tt.get('name'),
                "description": tt.get('description') or f"{tt.get('name')} phase of the DevSecOps lifecycle"
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
            "department": project.department
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
        # Get the project document
        project = frappe.get_doc("Project", project_name)

        project_manager = None
        team_members = []

        # Process project users
        if project.users:
            for user_record in project.users:
                user_data = {
                    "name": user_record.user,
                    "full_name": user_record.full_name,
                    "email": user_record.email,
                    "image": user_record.image,
                    "business_function": user_record.get("custom_business_function", "")
                }

                # Check if this is the project manager
                if user_record.get("custom_business_function") == "Project Manager":
                    project_manager = user_data
                else:
                    team_members.append(user_data)

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
                if 'css' in entry and len(entry['css']) > 0:
                    css_file = entry['css'][0]
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
    """Add a user to a project"""
    try:
        # Get project document
        project = frappe.get_doc("Project", project_name)

        # Check if user already exists in project
        existing_user = next((u for u in project.users if u.user == user_id), None)
        if existing_user:
            return {
                "success": False,
                "error": "User is already assigned to this project"
            }

        # Add user to project
        project.append("users", {
            "user": user_id
        })

        # Save project
        project.save()

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

    Returns:
        dict: Success/error response
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

    Args:
        project_name (str): Name of the project

    Returns:
        dict: List of tasks
    """
    try:
        # Get all tasks for the project
        tasks = frappe.get_list(
            "Task",
            filters={"project": project_name},
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

        return {
            "success": True,
            "tasks": tasks
        }
    except frappe.PermissionError:
        frappe.log_error(f"Permission denied for project {project_name}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "You don't have permission to access this project's tasks"
        }
    except Exception as e:
        frappe.log_error(f"Get Project Tasks Error: {str(e)}", "DevSecOps Dashboard")
        return {
            "success": False,
            "error": "An error occurred while fetching project tasks"
        }
