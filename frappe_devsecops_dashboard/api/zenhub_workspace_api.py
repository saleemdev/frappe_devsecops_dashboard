"""
Zenhub Workspace API Layer

This module provides REST API endpoints for accessing Zenhub workspace data
using the ZenhubWorkspaceHelper class. It includes:

- GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary
  Returns hierarchical workspace summary (Project -> Epic -> Sprint -> Task)

- GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project
  Filter workspace data by project ID

- GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic
  Filter workspace data by epic ID

- GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization
  Get team member utilization metrics

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import frappe
from typing import Dict, Any, Optional
from .zenhub_workspace_helper import ZenhubWorkspaceHelper


@frappe.whitelist()
def get_workspace_summary(workspace_id: str) -> Dict[str, Any]:
    """
    Get comprehensive JSON summary of a Zenhub workspace.

    Returns hierarchical structure:
    - Workspace
      - Projects
        - Epics
          - Sprints
            - Tasks (with kanban status IDs and assignees)

    Args:
        workspace_id (str): The Zenhub workspace ID

    Returns:
        dict: JSON summary with workspace hierarchy and team information

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=

    Response:
        {
            "success": true,
            "workspace": {
                "id": "...",
                "name": "tiberbu.com",
                "projects": [...],
                "sprints": [...],
                "kanban_statuses": {...},
                "team_members": [...],
                "summary": {
                    "total_issues": 120,
                    "total_story_points": 450,
                    "completion_rate": 75.5
                }
            }
        }
    """
    try:
        # Validate workspace_id
        if not workspace_id:
            return {
                "success": False,
                "error": "workspace_id parameter is required",
                "error_type": "validation_error"
            }

        # Initialize helper and fetch summary
        helper = ZenhubWorkspaceHelper(workspace_id)
        summary = helper.get_workspace_summary_json()

        return {
            "success": True,
            **summary
        }

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Workspace Summary Error",
            message=f"Failed to get workspace summary for {workspace_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }


@frappe.whitelist()
def get_workspace_by_project(workspace_id: str, project_id: str) -> Dict[str, Any]:
    """
    Get workspace data filtered by project.

    Args:
        workspace_id (str): The Zenhub workspace ID
        project_id (str): The project ID to filter by

    Returns:
        dict: Filtered workspace data containing only the specified project

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=&project_id=Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA==

    Response:
        {
            "success": true,
            "workspace": {...},
            "project_id": "...",
            "task_count": 45
        }
    """
    try:
        # Validate parameters
        if not workspace_id or not project_id:
            return {
                "success": False,
                "error": "workspace_id and project_id parameters are required",
                "error_type": "validation_error"
            }

        # Initialize helper and filter by project
        helper = ZenhubWorkspaceHelper(workspace_id)
        result = helper.filter_by_project(project_id)

        return result

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Filter by Project Error",
            message=f"Failed to filter workspace {workspace_id} by project {project_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }


@frappe.whitelist()
def get_workspace_by_epic(workspace_id: str, epic_id: str) -> Dict[str, Any]:
    """
    Get workspace data filtered by epic.

    Args:
        workspace_id (str): The Zenhub workspace ID
        epic_id (str): The epic ID to filter by

    Returns:
        dict: Filtered workspace data containing only the specified epic

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=&epic_id=Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMDU4Ng==

    Response:
        {
            "success": true,
            "workspace": {...},
            "epic_id": "...",
            "epic_title": "Eprescription",
            "task_count": 32
        }
    """
    try:
        # Validate parameters
        if not workspace_id or not epic_id:
            return {
                "success": False,
                "error": "workspace_id and epic_id parameters are required",
                "error_type": "validation_error"
            }

        # Initialize helper and filter by epic
        helper = ZenhubWorkspaceHelper(workspace_id)
        result = helper.filter_by_epic(epic_id)

        return result

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Filter by Epic Error",
            message=f"Failed to filter workspace {workspace_id} by epic {epic_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }


@frappe.whitelist()
def get_team_utilization(workspace_id: str) -> Dict[str, Any]:
    """
    Get team member utilization metrics for a workspace.

    Shows each team member's workload, task count, and completion percentage.

    Args:
        workspace_id (str): The Zenhub workspace ID

    Returns:
        dict: Team utilization data with per-member metrics

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=

    Response:
        {
            "success": true,
            "team_members": [
                {
                    "id": "...",
                    "name": "John Doe",
                    "task_count": 12,
                    "story_points": 45,
                    "completed_points": 32,
                    "completed_tasks": 8,
                    "utilization_percentage": 71.11,
                    "task_completion_percentage": 66.67
                }
            ],
            "total_members": 5,
            "average_utilization": 65.5
        }
    """
    try:
        # Validate workspace_id
        if not workspace_id:
            return {
                "success": False,
                "error": "workspace_id parameter is required",
                "error_type": "validation_error"
            }

        # Initialize helper and get team utilization
        helper = ZenhubWorkspaceHelper(workspace_id)
        utilization = helper.get_team_utilization()

        return utilization

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Team Utilization Error",
            message=f"Failed to get team utilization for workspace {workspace_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }


@frappe.whitelist()
def get_workspace_summary_with_filters(
    workspace_id: str,
    project_id: Optional[str] = None,
    epic_id: Optional[str] = None,
    status: Optional[str] = None
) -> Dict[str, Any]:
    """
    Get workspace summary with optional filters.

    Combines filtering with team utilization in a single call.

    Args:
        workspace_id (str): The Zenhub workspace ID
        project_id (str, optional): Filter by project ID
        epic_id (str, optional): Filter by epic ID
        status (str, optional): Filter by kanban status (e.g., "In Progress", "Done")

    Returns:
        dict: Filtered workspace summary with team utilization

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary_with_filters?workspace_id=...&project_id=...&epic_id=...

    Response:
        {
            "success": true,
            "workspace": {...},
            "team_utilization": {...},
            "applied_filters": {
                "project_id": "...",
                "epic_id": "...",
                "status": null
            }
        }
    """
    try:
        # Validate workspace_id
        if not workspace_id:
            return {
                "success": False,
                "error": "workspace_id parameter is required",
                "error_type": "validation_error"
            }

        # Initialize helper
        helper = ZenhubWorkspaceHelper(workspace_id)

        # Start with full summary
        if project_id:
            filtered_data = helper.filter_by_project(project_id)
            if not filtered_data.get("success"):
                return filtered_data
            workspace = filtered_data.get("workspace", {})
        elif epic_id:
            filtered_data = helper.filter_by_epic(epic_id)
            if not filtered_data.get("success"):
                return filtered_data
            workspace = filtered_data.get("workspace", {})
        else:
            summary = helper.get_workspace_summary_json()
            workspace = summary.get("workspace", {})

        # Get team utilization for this filtered view
        utilization = helper.get_team_utilization()

        return {
            "success": True,
            "workspace": workspace,
            "team_utilization": utilization.get("team_members", []),
            "applied_filters": {
                "project_id": project_id,
                "epic_id": epic_id,
                "status": status
            }
        }

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Workspace Filter Error",
            message=f"Failed to get filtered workspace summary for {workspace_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }
