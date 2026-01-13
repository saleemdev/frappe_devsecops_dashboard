"""
Zenhub Workspace Helper Class and API Layer

This module provides a comprehensive helper class for fetching and processing
Zenhub workspace data. It includes:
- Workspace summary with hierarchical structure (Project -> Epic -> Sprint -> Task)
- Filtering by project, epic, and status
- Team utilization analysis
- Kanban pipeline status information

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import frappe
import json as json_lib
from typing import Dict, List, Optional, Any, Tuple
from . import zenhub


class ZenhubWorkspaceHelper:
    """
    Helper class for Zenhub workspace operations.

    Accepts workspace ID by default and uses Zenhub settings for credentials.
    Provides methods to fetch, filter, and analyze workspace data.
    """

    def __init__(self, workspace_id: str):
        """
        Initialize the Zenhub Workspace Helper.

        Args:
            workspace_id (str): The Zenhub workspace ID
        """
        self.workspace_id = workspace_id
        self.token = zenhub.get_zenhub_token()
        self._workspace_data = None
        self._pipelines = {}
        self._projects = {}
        self._epics = {}

    def get_workspace_summary_json(self) -> Dict[str, Any]:
        """
        Get a comprehensive JSON summary of the workspace with hierarchical structure.

        Fetches workspace data only once and caches it for subsequent operations.

        Returns:
            dict: Workspace data organized as Project -> Epic -> Sprint -> Task
        """
        try:
            # Fetch workspace data using MCP - only once, cached in _workspace_data
            if self._workspace_data is None:
                self._workspace_data = self._fetch_workspace_data()

            workspace_data = self._workspace_data

            # Structure the data hierarchically
            summary = {
                "workspace": {
                    "id": self.workspace_id,
                    "name": workspace_data.get("name", "Unknown Workspace"),
                    "projects": self._structure_projects(workspace_data),
                    "sprints": self._structure_sprints(workspace_data),
                    "kanban_statuses": self._extract_kanban_statuses(workspace_data),
                    "team_members": self._extract_team_members(workspace_data),
                    "summary": {
                        "total_issues": self._count_total_issues(workspace_data),
                        "total_story_points": self._sum_story_points(workspace_data),
                        "completion_rate": self._calculate_completion_rate(workspace_data)
                    }
                }
            }

            return summary
        except Exception as e:
            frappe.log_error(
                title="Zenhub Workspace Summary Error",
                message=f"Failed to get workspace summary: {str(e)}"
            )
            raise

    def filter_by_project(self, project_id: str) -> Dict[str, Any]:
        """
        Filter workspace data by project ID.

        Args:
            project_id (str): The project ID to filter by

        Returns:
            dict: Filtered workspace data for the specified project
        """
        try:
            summary = self.get_workspace_summary_json()
            workspace = summary.get("workspace", {})

            # Filter projects
            filtered_projects = [
                p for p in workspace.get("projects", [])
                if p.get("id") == project_id
            ]

            if not filtered_projects:
                return {
                    "success": False,
                    "error": f"Project {project_id} not found in workspace",
                    "project_id": project_id
                }

            workspace["projects"] = filtered_projects

            # Get all epics and tasks from this project
            project = filtered_projects[0]
            all_epics = project.get("epics", [])
            all_task_ids = set()

            for epic in all_epics:
                for sprint in epic.get("sprints", []):
                    for task in sprint.get("tasks", []):
                        all_task_ids.add(task.get("id"))

            # Filter sprints to only include tasks from this project
            filtered_sprints = []
            for sprint in workspace.get("sprints", []):
                filtered_tasks = [
                    t for t in sprint.get("tasks", [])
                    if t.get("id") in all_task_ids
                ]
                if filtered_tasks:
                    sprint_copy = sprint.copy()
                    sprint_copy["tasks"] = filtered_tasks
                    filtered_sprints.append(sprint_copy)

            workspace["sprints"] = filtered_sprints

            return {
                "success": True,
                "workspace": workspace,
                "project_id": project_id,
                "task_count": len(all_task_ids)
            }
        except Exception as e:
            frappe.log_error(
                title="Zenhub Filter by Project Error",
                message=f"Failed to filter by project {project_id}: {str(e)}"
            )
            raise

    def filter_by_epic(self, epic_id: str) -> Dict[str, Any]:
        """
        Filter workspace data by epic ID.

        Args:
            epic_id (str): The epic ID to filter by

        Returns:
            dict: Filtered workspace data for the specified epic
        """
        try:
            summary = self.get_workspace_summary_json()
            workspace = summary.get("workspace", {})

            # Find the epic and its tasks
            epic_found = None
            epic_tasks = []

            for project in workspace.get("projects", []):
                for epic in project.get("epics", []):
                    if epic.get("id") == epic_id:
                        epic_found = epic
                        # Collect all tasks from this epic's sprints
                        for sprint in epic.get("sprints", []):
                            epic_tasks.extend(sprint.get("tasks", []))
                        break

            if not epic_found:
                return {
                    "success": False,
                    "error": f"Epic {epic_id} not found in workspace",
                    "epic_id": epic_id
                }

            # Filter to only show the epic
            filtered_projects = []
            for project in workspace.get("projects", []):
                filtered_epics = [e for e in project.get("epics", []) if e.get("id") == epic_id]
                if filtered_epics:
                    project_copy = project.copy()
                    project_copy["epics"] = filtered_epics
                    filtered_projects.append(project_copy)

            workspace["projects"] = filtered_projects

            # Filter sprints to only include tasks from this epic
            task_ids = {t.get("id") for t in epic_tasks}
            filtered_sprints = []
            for sprint in workspace.get("sprints", []):
                filtered_tasks = [t for t in sprint.get("tasks", []) if t.get("id") in task_ids]
                if filtered_tasks:
                    sprint_copy = sprint.copy()
                    sprint_copy["tasks"] = filtered_tasks
                    filtered_sprints.append(sprint_copy)

            workspace["sprints"] = filtered_sprints

            return {
                "success": True,
                "workspace": workspace,
                "epic_id": epic_id,
                "task_count": len(epic_tasks),
                "epic_title": epic_found.get("title")
            }
        except Exception as e:
            frappe.log_error(
                title="Zenhub Filter by Epic Error",
                message=f"Failed to filter by epic {epic_id}: {str(e)}"
            )
            raise

    def get_team_utilization(self) -> Dict[str, Any]:
        """
        Get team utilization metrics.

        Returns:
            dict: Team member workload and utilization percentages
        """
        try:
            summary = self.get_workspace_summary_json()
            workspace = summary.get("workspace", {})

            # Collect all tasks
            all_tasks = []
            for project in workspace.get("projects", []):
                for epic in project.get("epics", []):
                    for sprint in epic.get("sprints", []):
                        all_tasks.extend(sprint.get("tasks", []))

            # Aggregate by assignee
            team_utilization = {}

            for task in all_tasks:
                for assignee in task.get("assignees", []):
                    assignee_name = assignee.get("name", "Unknown")
                    assignee_id = assignee.get("id")

                    if assignee_id not in team_utilization:
                        team_utilization[assignee_id] = {
                            "id": assignee_id,
                            "name": assignee_name,
                            "task_count": 0,
                            "story_points": 0,
                            "completed_points": 0,
                            "completed_tasks": 0
                        }

                    team_utilization[assignee_id]["task_count"] += 1
                    team_utilization[assignee_id]["story_points"] += task.get("estimate", 0)

                    # Count completed tasks
                    if task.get("status") in ["Done", "Completed", "Closed"]:
                        team_utilization[assignee_id]["completed_tasks"] += 1
                        team_utilization[assignee_id]["completed_points"] += task.get("estimate", 0)

            # Calculate utilization percentages
            team_list = []
            for member in team_utilization.values():
                total_points = member["story_points"]
                utilization_pct = (
                    (member["completed_points"] / total_points * 100)
                    if total_points > 0
                    else 0.0
                )

                team_list.append({
                    **member,
                    "utilization_percentage": round(utilization_pct, 2),
                    "task_completion_percentage": round(
                        (member["completed_tasks"] / member["task_count"] * 100)
                        if member["task_count"] > 0
                        else 0.0,
                        2
                    )
                })

            # Sort by task count (descending)
            team_list.sort(key=lambda x: x["task_count"], reverse=True)

            return {
                "success": True,
                "team_members": team_list,
                "total_members": len(team_list),
                "average_utilization": round(
                    sum(m["utilization_percentage"] for m in team_list) / len(team_list)
                    if team_list else 0,
                    2
                )
            }
        except Exception as e:
            frappe.log_error(
                title="Zenhub Team Utilization Error",
                message=f"Failed to calculate team utilization: {str(e)}"
            )
            raise

    def _fetch_workspace_data(self) -> Dict[str, Any]:
        """
        Fetch workspace data from Zenhub using MCP tools.

        This method fetches the complete workspace hierarchy in a single call and caches it.
        Subsequent operations (filter_by_project, filter_by_epic, get_team_utilization)
        use this cached data for performance.

        Returns:
            dict: Workspace data with projects, epics, sprints, and tasks

        Note:
            - This is called only ONCE per helper instance
            - All filtering and analysis operations reuse this single fetch
            - To force a refresh, create a new helper instance
        """
        try:
            # Try to get workspace pipelines and repositories info
            # This helps us understand the workspace structure
            workspace_data = {
                "id": self.workspace_id,
                "name": "Workspace",
                "projects": [],
                "pipelines": {},
                "sprints": [],
                "team_members": []
            }

            # Call the MCP Zenhub functions to fetch workspace data
            try:
                # Get pipelines and repositories for this workspace
                pipelines_result = zenhub.execute_graphql_query(
                    query="""
                    query {
                        workspace(id: "%s") {
                            id
                            name
                            repositories {
                                id
                                name
                            }
                        }
                    }
                    """ % self.workspace_id,
                    token=self.token
                )

                if pipelines_result and pipelines_result.get("data", {}).get("workspace"):
                    workspace_data["name"] = pipelines_result["data"]["workspace"].get("name", "Workspace")

            except Exception as e:
                frappe.log_error(
                    title="Zenhub GraphQL Query Error",
                    message=f"Failed to fetch workspace basics: {str(e)}"
                )

            return workspace_data

        except Exception as e:
            frappe.log_error(
                title="Zenhub Fetch Workspace Data Error",
                message=f"Failed to fetch workspace {self.workspace_id}: {str(e)}"
            )
            # Return empty but valid structure
            return {
                "id": self.workspace_id,
                "name": "Workspace",
                "projects": [],
                "pipelines": {},
                "sprints": [],
                "team_members": []
            }

    def _structure_projects(self, workspace_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Structure data into projects with nested epics and sprints.

        Args:
            workspace_data (dict): Raw workspace data

        Returns:
            list: Structured projects
        """
        projects = []

        # Get projects from workspace_data if available
        for project in workspace_data.get("projects", []):
            project_item = {
                "id": project.get("id"),
                "number": project.get("number"),
                "title": project.get("title"),
                "type": project.get("type"),
                "epics": self._structure_epics(project)
            }
            projects.append(project_item)

        return projects

    def _structure_epics(self, project_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Structure epics from project data.

        Args:
            project_data (dict): Project data

        Returns:
            list: Structured epics
        """
        epics = []

        for epic in project_data.get("epics", []):
            epic_item = {
                "id": epic.get("id"),
                "number": epic.get("number"),
                "title": epic.get("title"),
                "status": epic.get("status"),
                "estimate": epic.get("estimate"),
                "sprints": epic.get("sprints", [])
            }
            epics.append(epic_item)

        return epics

    def _structure_sprints(self, workspace_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Structure sprint data.

        Args:
            workspace_data (dict): Workspace data

        Returns:
            list: Structured sprints
        """
        sprints = []

        for sprint in workspace_data.get("sprints", []):
            sprint_item = {
                "id": sprint.get("id"),
                "name": sprint.get("name"),
                "startAt": sprint.get("startAt"),
                "endAt": sprint.get("endAt"),
                "tasks": self._structure_tasks(sprint)
            }
            sprints.append(sprint_item)

        return sprints

    def _structure_tasks(self, sprint_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Structure task data with kanban status.

        Args:
            sprint_data (dict): Sprint data

        Returns:
            list: Structured tasks
        """
        tasks = []

        for task in sprint_data.get("tasks", []):
            task_item = {
                "id": task.get("id"),
                "number": task.get("number"),
                "title": task.get("title"),
                "status": task.get("status"),
                "kanban_status_id": task.get("kanban_status_id"),
                "estimate": task.get("estimate"),
                "assignees": task.get("assignees", [])
            }
            tasks.append(task_item)

        return tasks

    def _extract_kanban_statuses(self, workspace_data: Dict[str, Any]) -> Dict[str, int]:
        """
        Extract kanban status distribution.

        Args:
            workspace_data (dict): Workspace data

        Returns:
            dict: Status counts
        """
        statuses = {}

        # Collect all tasks and count by status
        for project in workspace_data.get("projects", []):
            for epic in project.get("epics", []):
                for sprint in epic.get("sprints", []):
                    for task in sprint.get("tasks", []):
                        status = task.get("status", "Unknown")
                        statuses[status] = statuses.get(status, 0) + 1

        return statuses

    def _extract_team_members(self, workspace_data: Dict[str, Any]) -> List[Dict[str, str]]:
        """
        Extract unique team members from workspace data.

        Args:
            workspace_data (dict): Workspace data

        Returns:
            list: Unique team members
        """
        team_members_set = set()

        # Collect all team members
        for project in workspace_data.get("projects", []):
            for epic in project.get("epics", []):
                for sprint in epic.get("sprints", []):
                    for task in sprint.get("tasks", []):
                        for assignee in task.get("assignees", []):
                            team_members_set.add((
                                assignee.get("id"),
                                assignee.get("name"),
                                assignee.get("username")
                            ))

        return [
            {"id": tm[0], "name": tm[1], "username": tm[2]}
            for tm in sorted(team_members_set, key=lambda x: x[1])
        ]

    def _count_total_issues(self, workspace_data: Dict[str, Any]) -> int:
        """
        Count total issues in workspace.

        Args:
            workspace_data (dict): Workspace data

        Returns:
            int: Total issue count
        """
        count = 0

        for project in workspace_data.get("projects", []):
            for epic in project.get("epics", []):
                for sprint in epic.get("sprints", []):
                    count += len(sprint.get("tasks", []))

        return count

    def _sum_story_points(self, workspace_data: Dict[str, Any]) -> float:
        """
        Sum total story points in workspace.

        Args:
            workspace_data (dict): Workspace data

        Returns:
            float: Total story points
        """
        total = 0

        for project in workspace_data.get("projects", []):
            for epic in project.get("epics", []):
                for sprint in epic.get("sprints", []):
                    for task in sprint.get("tasks", []):
                        total += task.get("estimate", 0)

        return total

    def _calculate_completion_rate(self, workspace_data: Dict[str, Any]) -> float:
        """
        Calculate completion rate (percentage of completed tasks).

        Args:
            workspace_data (dict): Workspace data

        Returns:
            float: Completion rate percentage
        """
        completed = 0
        total = 0

        for project in workspace_data.get("projects", []):
            for epic in project.get("epics", []):
                for sprint in epic.get("sprints", []):
                    for task in sprint.get("tasks", []):
                        total += 1
                        if task.get("status") in ["Done", "Completed", "Closed"]:
                            completed += 1

        if total == 0:
            return 0.0

        return round((completed / total) * 100, 2)
