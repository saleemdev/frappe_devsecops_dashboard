"""
DevSecOps Dashboard API
Integrates with ERPNext Project and Task Type doctypes to provide dashboard data
"""

import frappe
from frappe import _
from frappe.utils import flt, cint, getdate, today
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
    Uses Frappe ORM with permission-aware queries

    Returns:
        list: List of projects with task data and lifecycle progress
    """
    try:
        # Use Frappe ORM to get projects with permission checking
        projects_data = frappe.get_all(
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
    
    # Get tasks for this project using Frappe ORM with permission checking
    try:
        tasks = frappe.get_all(
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
    Uses Frappe ORM with permission checking

    Returns:
        list: Standard lifecycle phases
    """
    try:
        task_types = frappe.get_all(
            "Task Type",
            fields=["name", "description"],
            order_by="name",
            limit_page_length=None
        )

        return [
            {
                "name": tt.name,
                "description": tt.description or f"{tt.name} phase of the DevSecOps lifecycle"
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
