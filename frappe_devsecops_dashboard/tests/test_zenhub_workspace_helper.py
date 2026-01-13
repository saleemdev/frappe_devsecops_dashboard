"""
Unit tests for Zenhub Workspace Helper and API

Tests the ZenhubWorkspaceHelper class and API endpoints for:
- Workspace summary generation
- Project filtering
- Epic filtering
- Team utilization calculation

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import unittest
from unittest.mock import patch, MagicMock
import frappe
from frappe.test_runner import make_test_objects

# Import the helper class
try:
    from frappe_devsecops_dashboard.api.zenhub_workspace_helper import ZenhubWorkspaceHelper
    from frappe_devsecops_dashboard.api import zenhub_workspace_api
except ImportError:
    # In case imports fail, we'll skip the tests
    skip_tests = True
else:
    skip_tests = False


class TestZenhubWorkspaceHelper(unittest.TestCase):
    """Test cases for ZenhubWorkspaceHelper class."""

    def setUp(self):
        """Set up test fixtures."""
        self.workspace_id = "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="
        self.mock_token = "test_token_123"

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_helper_initialization(self, mock_get_token):
        """Test helper class initialization."""
        mock_get_token.return_value = self.mock_token

        helper = ZenhubWorkspaceHelper(self.workspace_id)

        self.assertEqual(helper.workspace_id, self.workspace_id)
        self.assertEqual(helper.token, self.mock_token)
        mock_get_token.assert_called_once()

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_team_utilization_calculation(self, mock_get_token):
        """Test team utilization calculation."""
        mock_get_token.return_value = self.mock_token

        helper = ZenhubWorkspaceHelper(self.workspace_id)

        # Mock the fetch workspace data
        mock_workspace_data = {
            "id": self.workspace_id,
            "name": "Test Workspace",
            "projects": [
                {
                    "id": "proj1",
                    "title": "Project 1",
                    "epics": [
                        {
                            "id": "epic1",
                            "title": "Epic 1",
                            "sprints": [
                                {
                                    "id": "sprint1",
                                    "name": "Sprint 1",
                                    "tasks": [
                                        {
                                            "id": "task1",
                                            "title": "Task 1",
                                            "estimate": 5,
                                            "status": "Done",
                                            "assignees": [
                                                {
                                                    "id": "user1",
                                                    "name": "John Doe",
                                                    "username": "johndoe"
                                                }
                                            ]
                                        },
                                        {
                                            "id": "task2",
                                            "title": "Task 2",
                                            "estimate": 3,
                                            "status": "In Progress",
                                            "assignees": [
                                                {
                                                    "id": "user1",
                                                    "name": "John Doe",
                                                    "username": "johndoe"
                                                }
                                            ]
                                        }
                                    ]
                                }
                            ]
                        }
                    ]
                }
            ],
            "sprints": []
        }

        # Call team utilization with mocked fetch
        with patch.object(helper, '_fetch_workspace_data', return_value=mock_workspace_data):
            result = helper.get_team_utilization()

        # Assertions
        self.assertTrue(result.get("success"))
        self.assertEqual(len(result.get("team_members", [])), 1)

        member = result["team_members"][0]
        self.assertEqual(member["name"], "John Doe")
        self.assertEqual(member["task_count"], 2)
        self.assertEqual(member["story_points"], 8)
        self.assertEqual(member["completed_points"], 5)
        self.assertEqual(member["completed_tasks"], 1)

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_filter_by_project(self, mock_get_token):
        """Test filtering workspace by project."""
        mock_get_token.return_value = self.mock_token

        helper = ZenhubWorkspaceHelper(self.workspace_id)

        # Mock the get_workspace_summary_json method
        mock_summary = {
            "workspace": {
                "id": self.workspace_id,
                "name": "Test Workspace",
                "projects": [
                    {
                        "id": "proj1",
                        "title": "Project 1",
                        "epics": []
                    },
                    {
                        "id": "proj2",
                        "title": "Project 2",
                        "epics": []
                    }
                ],
                "sprints": [],
                "kanban_statuses": {},
                "team_members": []
            }
        }

        with patch.object(helper, 'get_workspace_summary_json', return_value=mock_summary):
            result = helper.filter_by_project("proj1")

            self.assertTrue(result.get("success"))
            projects = result["workspace"].get("projects", [])
            self.assertEqual(len(projects), 1)
            self.assertEqual(projects[0]["id"], "proj1")

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_filter_by_epic(self, mock_get_token):
        """Test filtering workspace by epic."""
        mock_get_token.return_value = self.mock_token

        helper = ZenhubWorkspaceHelper(self.workspace_id)

        # Mock the get_workspace_summary_json method
        mock_summary = {
            "workspace": {
                "id": self.workspace_id,
                "name": "Test Workspace",
                "projects": [
                    {
                        "id": "proj1",
                        "title": "Project 1",
                        "epics": [
                            {"id": "epic1", "title": "Epic 1"},
                            {"id": "epic2", "title": "Epic 2"}
                        ]
                    }
                ],
                "sprints": [],
                "kanban_statuses": {},
                "team_members": []
            }
        }

        with patch.object(helper, 'get_workspace_summary_json', return_value=mock_summary):
            result = helper.filter_by_epic("epic1")

            self.assertTrue(result.get("success"))
            self.assertEqual(result["epic_id"], "epic1")


class TestZenhubWorkspaceAPI(unittest.TestCase):
    """Test cases for Zenhub Workspace API endpoints."""

    def setUp(self):
        """Set up test fixtures."""
        self.workspace_id = "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="

    @patch('frappe_devsecops_dashboard.api.zenhub_workspace_api.ZenhubWorkspaceHelper')
    def test_get_workspace_summary_api(self, mock_helper_class):
        """Test get_workspace_summary API endpoint."""
        # Mock the helper instance
        mock_helper = MagicMock()
        mock_helper_class.return_value = mock_helper

        mock_summary = {
            "workspace": {
                "id": self.workspace_id,
                "name": "Test Workspace",
                "projects": [],
                "sprints": [],
                "kanban_statuses": {},
                "team_members": [],
                "summary": {
                    "total_issues": 100,
                    "total_story_points": 300,
                    "completion_rate": 65.5
                }
            }
        }
        mock_helper.get_workspace_summary_json.return_value = mock_summary

        # Call the API
        result = zenhub_workspace_api.get_workspace_summary(self.workspace_id)

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["workspace"]["name"], "Test Workspace")
        mock_helper_class.assert_called_once_with(self.workspace_id)

    def test_get_workspace_summary_api_missing_workspace_id(self):
        """Test get_workspace_summary API with missing workspace_id."""
        result = zenhub_workspace_api.get_workspace_summary("")

        self.assertFalse(result["success"])
        self.assertEqual(result["error_type"], "validation_error")

    @patch('frappe_devsecops_dashboard.api.zenhub_workspace_api.ZenhubWorkspaceHelper')
    def test_get_workspace_by_project_api(self, mock_helper_class):
        """Test get_workspace_by_project API endpoint."""
        # Mock the helper instance
        mock_helper = MagicMock()
        mock_helper_class.return_value = mock_helper

        mock_result = {
            "success": True,
            "workspace": {"id": self.workspace_id},
            "project_id": "proj1",
            "task_count": 45
        }
        mock_helper.filter_by_project.return_value = mock_result

        # Call the API
        result = zenhub_workspace_api.get_workspace_by_project(self.workspace_id, "proj1")

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["project_id"], "proj1")
        self.assertEqual(result["task_count"], 45)

    def test_get_workspace_by_project_api_missing_params(self):
        """Test get_workspace_by_project API with missing parameters."""
        result = zenhub_workspace_api.get_workspace_by_project("", "proj1")

        self.assertFalse(result["success"])
        self.assertEqual(result["error_type"], "validation_error")

    @patch('frappe_devsecops_dashboard.api.zenhub_workspace_api.ZenhubWorkspaceHelper')
    def test_get_team_utilization_api(self, mock_helper_class):
        """Test get_team_utilization API endpoint."""
        # Mock the helper instance
        mock_helper = MagicMock()
        mock_helper_class.return_value = mock_helper

        mock_utilization = {
            "success": True,
            "team_members": [
                {
                    "id": "user1",
                    "name": "John Doe",
                    "task_count": 12,
                    "story_points": 45,
                    "completed_points": 32,
                    "completed_tasks": 8,
                    "utilization_percentage": 71.11,
                    "task_completion_percentage": 66.67
                }
            ],
            "total_members": 1,
            "average_utilization": 71.11
        }
        mock_helper.get_team_utilization.return_value = mock_utilization

        # Call the API
        result = zenhub_workspace_api.get_team_utilization(self.workspace_id)

        # Assertions
        self.assertTrue(result["success"])
        self.assertEqual(result["total_members"], 1)
        self.assertEqual(len(result["team_members"]), 1)
        self.assertEqual(result["team_members"][0]["name"], "John Doe")


if __name__ == "__main__":
    if not skip_tests:
        unittest.main()
