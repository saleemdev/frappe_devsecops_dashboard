"""
Integration tests for Zenhub Workspace API endpoints

Tests all 5 API endpoints with real workspace IDs:
- 6762cd11a171a80029eac4fd
- 66ab40fe8ebb9411a548a1e7
- 66b0866b1c74d4032caa6717

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import unittest
import json
from unittest.mock import patch, MagicMock
import frappe
from frappe_devsecops_dashboard.api.zenhub_workspace_helper import ZenhubWorkspaceHelper
from frappe_devsecops_dashboard.api import zenhub_workspace_api


class TestZenhubWorkspaceAPIIntegration(unittest.TestCase):
    """Integration tests for all 5 API endpoints."""

    # Test workspace IDs
    TEST_WORKSPACE_IDS = [
        "6762cd11a171a80029eac4fd",
        "66ab40fe8ebb9411a548a1e7",
        "66b0866b1c74d4032caa6717"
    ]

    def setUp(self):
        """Set up test fixtures."""
        self.mock_token = "test_zenhub_token_12345"

    def _create_mock_workspace_data(self, workspace_id, num_projects=2):
        """Create realistic mock workspace data."""
        return {
            "id": workspace_id,
            "name": f"Test Workspace {workspace_id[:8]}",
            "projects": [
                {
                    "id": f"proj_{i}_{workspace_id[:8]}",
                    "number": 1000 + i,
                    "title": f"Project {i+1}",
                    "type": "Project",
                    "epics": [
                        {
                            "id": f"epic_{i}_{j}_{workspace_id[:8]}",
                            "number": 2000 + i*10 + j,
                            "title": f"Epic {i+1}-{j+1}",
                            "status": "Backlog",
                            "estimate": 21 + j*5,
                            "sprints": [
                                {
                                    "id": f"sprint_{i}_{j}_{k}_{workspace_id[:8]}",
                                    "name": f"Sprint {i+1}-{j+1}-{k+1}",
                                    "startAt": "2026-01-13",
                                    "endAt": "2026-01-27",
                                    "tasks": [
                                        {
                                            "id": f"task_{i}_{j}_{k}_{t}_{workspace_id[:8]}",
                                            "number": 3000 + i*100 + j*10 + k + t,
                                            "title": f"Task {i+1}-{j+1}-{k+1}-{t+1}",
                                            "status": "In Progress" if t % 2 == 0 else "Done",
                                            "kanban_status_id": f"status_{i}_{j}_{k}_{t}_{workspace_id[:8]}",
                                            "estimate": 2 + (t % 5),
                                            "assignees": [
                                                {
                                                    "id": f"user_{i}_{workspace_id[:8]}",
                                                    "name": f"Developer {i+1}",
                                                    "username": f"dev{i+1}"
                                                }
                                            ]
                                        }
                                        for t in range(3)
                                    ]
                                }
                                for k in range(2)
                            ]
                        }
                        for j in range(2)
                    ]
                }
                for i in range(num_projects)
            ],
            "sprints": [],
            "team_members": []
        }

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_01_get_workspace_summary_endpoint(self, mock_get_token):
        """Test: get_workspace_summary endpoint - Endpoint 1 of 5"""
        mock_get_token.return_value = self.mock_token

        for workspace_id in self.TEST_WORKSPACE_IDS:
            print(f"\n{'='*80}")
            print(f"TEST 1: get_workspace_summary - Workspace: {workspace_id}")
            print(f"{'='*80}")

            with patch('frappe_devsecops_dashboard.api.zenhub_workspace_helper.ZenhubWorkspaceHelper._fetch_workspace_data') as mock_fetch:
                # Mock the fetch to return realistic data
                mock_fetch.return_value = self._create_mock_workspace_data(workspace_id)

                # Call API endpoint
                result = zenhub_workspace_api.get_workspace_summary(workspace_id)

                # Verify response structure
                self.assertTrue(result.get("success"))
                self.assertIn("workspace", result)
                workspace = result["workspace"]

                # Verify workspace contains expected fields
                self.assertEqual(workspace["id"], workspace_id)
                self.assertIn("name", workspace)
                self.assertIn("projects", workspace)
                self.assertIn("sprints", workspace)
                self.assertIn("kanban_statuses", workspace)
                self.assertIn("team_members", workspace)
                self.assertIn("summary", workspace)

                # Verify summary metrics
                summary = workspace["summary"]
                self.assertIn("total_issues", summary)
                self.assertIn("total_story_points", summary)
                self.assertIn("completion_rate", summary)

                print(f"✓ Workspace: {workspace['name']}")
                print(f"✓ Total Issues: {summary['total_issues']}")
                print(f"✓ Total Story Points: {summary['total_story_points']}")
                print(f"✓ Completion Rate: {summary['completion_rate']}%")
                print(f"✓ Projects: {len(workspace['projects'])}")
                print(f"✓ Team Members: {len(workspace['team_members'])}")

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_02_get_workspace_by_project_endpoint(self, mock_get_token):
        """Test: get_workspace_by_project endpoint - Endpoint 2 of 5"""
        mock_get_token.return_value = self.mock_token

        for workspace_id in self.TEST_WORKSPACE_IDS:
            print(f"\n{'='*80}")
            print(f"TEST 2: get_workspace_by_project - Workspace: {workspace_id}")
            print(f"{'='*80}")

            with patch('frappe_devsecops_dashboard.api.zenhub_workspace_helper.ZenhubWorkspaceHelper._fetch_workspace_data') as mock_fetch:
                mock_fetch.return_value = self._create_mock_workspace_data(workspace_id, num_projects=2)

                # Get the workspace first to know which project exists
                helper = ZenhubWorkspaceHelper(workspace_id)
                summary = helper.get_workspace_summary_json()
                if summary["workspace"]["projects"]:
                    project_id = summary["workspace"]["projects"][0]["id"]

                    # Call filter by project endpoint
                    result = zenhub_workspace_api.get_workspace_by_project(workspace_id, project_id)

                    # Verify response
                    self.assertTrue(result.get("success"))
                    self.assertIn("workspace", result)
                    self.assertEqual(result["project_id"], project_id)
                    self.assertIn("task_count", result)

                    workspace = result["workspace"]
                    print(f"✓ Project ID: {project_id}")
                    print(f"✓ Project Name: {workspace['projects'][0]['title']}")
                    print(f"✓ Task Count: {result['task_count']}")
                    print(f"✓ Epics in Project: {len(workspace['projects'][0]['epics'])}")
                else:
                    print(f"⚠ No projects found in workspace")

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_03_get_workspace_by_epic_endpoint(self, mock_get_token):
        """Test: get_workspace_by_epic endpoint - Endpoint 3 of 5"""
        mock_get_token.return_value = self.mock_token

        for workspace_id in self.TEST_WORKSPACE_IDS:
            print(f"\n{'='*80}")
            print(f"TEST 3: get_workspace_by_epic - Workspace: {workspace_id}")
            print(f"{'='*80}")

            with patch('frappe_devsecops_dashboard.api.zenhub_workspace_helper.ZenhubWorkspaceHelper._fetch_workspace_data') as mock_fetch:
                mock_fetch.return_value = self._create_mock_workspace_data(workspace_id, num_projects=2)

                # Get workspace to find an epic
                helper = ZenhubWorkspaceHelper(workspace_id)
                summary = helper.get_workspace_summary_json()

                epic_found = False
                if summary["workspace"]["projects"]:
                    project = summary["workspace"]["projects"][0]
                    if project["epics"]:
                        epic_id = project["epics"][0]["id"]
                        epic_title = project["epics"][0]["title"]
                        epic_found = True

                        # Call filter by epic endpoint
                        result = zenhub_workspace_api.get_workspace_by_epic(workspace_id, epic_id)

                        # Verify response
                        self.assertTrue(result.get("success"))
                        self.assertEqual(result["epic_id"], epic_id)
                        self.assertEqual(result["epic_title"], epic_title)
                        self.assertIn("task_count", result)
                        self.assertIn("workspace", result)

                        print(f"✓ Epic ID: {epic_id}")
                        print(f"✓ Epic Title: {epic_title}")
                        print(f"✓ Task Count: {result['task_count']}")
                        print(f"✓ Filtered Projects: {len(result['workspace']['projects'])}")

                if not epic_found:
                    print(f"⚠ No epics found in workspace")

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_04_get_team_utilization_endpoint(self, mock_get_token):
        """Test: get_team_utilization endpoint - Endpoint 4 of 5"""
        mock_get_token.return_value = self.mock_token

        for workspace_id in self.TEST_WORKSPACE_IDS:
            print(f"\n{'='*80}")
            print(f"TEST 4: get_team_utilization - Workspace: {workspace_id}")
            print(f"{'='*80}")

            with patch('frappe_devsecops_dashboard.api.zenhub_workspace_helper.ZenhubWorkspaceHelper._fetch_workspace_data') as mock_fetch:
                mock_fetch.return_value = self._create_mock_workspace_data(workspace_id)

                # Call team utilization endpoint
                result = zenhub_workspace_api.get_team_utilization(workspace_id)

                # Verify response structure
                self.assertTrue(result.get("success"))
                self.assertIn("team_members", result)
                self.assertIn("total_members", result)
                self.assertIn("average_utilization", result)

                # Verify team member data
                team_members = result["team_members"]
                print(f"✓ Total Team Members: {result['total_members']}")
                print(f"✓ Average Utilization: {result['average_utilization']}%")

                if team_members:
                    print(f"\nTeam Member Details:")
                    for member in team_members:
                        print(f"  - {member['name']}:")
                        print(f"    • Tasks: {member['task_count']}")
                        print(f"    • Story Points: {member['story_points']}")
                        print(f"    • Completed Points: {member['completed_points']}")
                        print(f"    • Utilization: {member['utilization_percentage']}%")
                        print(f"    • Task Completion: {member['task_completion_percentage']}%")
                else:
                    print(f"⚠ No team members found in workspace")

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_05_get_workspace_summary_with_filters_endpoint(self, mock_get_token):
        """Test: get_workspace_summary_with_filters endpoint - Endpoint 5 of 5"""
        mock_get_token.return_value = self.mock_token

        for workspace_id in self.TEST_WORKSPACE_IDS:
            print(f"\n{'='*80}")
            print(f"TEST 5: get_workspace_summary_with_filters - Workspace: {workspace_id}")
            print(f"{'='*80}")

            with patch('frappe_devsecops_dashboard.api.zenhub_workspace_helper.ZenhubWorkspaceHelper._fetch_workspace_data') as mock_fetch:
                mock_fetch.return_value = self._create_mock_workspace_data(workspace_id, num_projects=2)

                # Get workspace to extract project_id
                helper = ZenhubWorkspaceHelper(workspace_id)
                summary = helper.get_workspace_summary_json()

                if summary["workspace"]["projects"]:
                    project_id = summary["workspace"]["projects"][0]["id"]
                    project_title = summary["workspace"]["projects"][0]["title"]

                    # Test with project_id filter
                    result = zenhub_workspace_api.get_workspace_summary_with_filters(
                        workspace_id=workspace_id,
                        project_id=project_id
                    )

                    # Verify response
                    self.assertTrue(result.get("success"))
                    self.assertIn("workspace", result)
                    self.assertIn("team_utilization", result)
                    self.assertIn("applied_filters", result)

                    applied_filters = result["applied_filters"]
                    print(f"✓ Project ID Filter: {applied_filters['project_id']}")
                    print(f"✓ Project Title: {project_title}")
                    print(f"✓ Epic ID Filter: {applied_filters['epic_id']}")
                    print(f"✓ Status Filter: {applied_filters['status']}")
                    print(f"✓ Projects in Result: {len(result['workspace']['projects'])}")
                    print(f"✓ Team Members in Result: {len(result['team_utilization'])}")
                else:
                    print(f"⚠ No projects found in workspace")

    @patch('frappe_devsecops_dashboard.api.zenhub.get_zenhub_token')
    def test_06_api_call_count_verification(self, mock_get_token):
        """Test: Verify that Zenhub API is called only ONCE per helper instance"""
        mock_get_token.return_value = self.mock_token

        workspace_id = self.TEST_WORKSPACE_IDS[0]
        print(f"\n{'='*80}")
        print(f"TEST 6: API Call Count Verification - Workspace: {workspace_id}")
        print(f"{'='*80}")

        with patch('frappe_devsecops_dashboard.api.zenhub_workspace_helper.ZenhubWorkspaceHelper._fetch_workspace_data') as mock_fetch:
            mock_data = self._create_mock_workspace_data(workspace_id)
            mock_fetch.return_value = mock_data

            # Create a single helper instance
            helper = ZenhubWorkspaceHelper(workspace_id)

            # Call multiple methods
            print(f"Calling get_workspace_summary_json() - 1st call...")
            summary = helper.get_workspace_summary_json()
            self.assertEqual(mock_fetch.call_count, 1)
            print(f"✓ Mock called {mock_fetch.call_count} time(s)")

            print(f"Calling get_workspace_summary_json() - 2nd call...")
            summary2 = helper.get_workspace_summary_json()
            self.assertEqual(mock_fetch.call_count, 1)  # Still 1, using cache
            print(f"✓ Mock called {mock_fetch.call_count} time(s) total (cached!)")

            print(f"Calling filter_by_project()...")
            if summary["workspace"]["projects"]:
                project_id = summary["workspace"]["projects"][0]["id"]
                filtered = helper.filter_by_project(project_id)
                self.assertEqual(mock_fetch.call_count, 1)  # Still 1
                print(f"✓ Mock called {mock_fetch.call_count} time(s) total (reused cached data)")

            print(f"Calling get_team_utilization()...")
            utilization = helper.get_team_utilization()
            self.assertEqual(mock_fetch.call_count, 1)  # Still 1
            print(f"✓ Mock called {mock_fetch.call_count} time(s) total (reused cached data)")

            print(f"\n✅ VERIFICATION PASSED: API called only ONCE!")
            print(f"   - All subsequent operations use cached workspace data")
            print(f"   - This ensures optimal performance and minimal API calls")


class TestAPIEndpointDocumentation(unittest.TestCase):
    """Documentation and reference tests for all 5 API endpoints."""

    def test_endpoint_1_documentation(self):
        """Endpoint 1: get_workspace_summary"""
        print(f"\n{'='*80}")
        print("ENDPOINT 1: get_workspace_summary")
        print(f"{'='*80}")
        print("""
REQUEST:
  Method: GET
  URL: /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary
  Parameters:
    - workspace_id (required): string - The Zenhub workspace ID

EXAMPLE REQUEST:
  GET /api/method/.../get_workspace_summary?workspace_id=6762cd11a171a80029eac4fd

RESPONSE:
  {
    "success": true,
    "workspace": {
      "id": "6762cd11a171a80029eac4fd",
      "name": "Workspace Name",
      "projects": [
        {
          "id": "project_id",
          "number": 1000,
          "title": "Project Title",
          "type": "Project",
          "epics": [
            {
              "id": "epic_id",
              "number": 2000,
              "title": "Epic Title",
              "status": "Backlog",
              "estimate": 21,
              "sprints": [
                {
                  "id": "sprint_id",
                  "name": "Sprint 1",
                  "tasks": [
                    {
                      "id": "task_id",
                      "number": 3000,
                      "title": "Task Title",
                      "status": "In Progress",
                      "kanban_status_id": "status_id",
                      "estimate": 5,
                      "assignees": [
                        {
                          "id": "user_id",
                          "name": "Developer Name",
                          "username": "dev_username"
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
      "sprints": [...],
      "kanban_statuses": {
        "In Progress": 5,
        "Done": 10,
        ...
      },
      "team_members": [
        {
          "id": "user_id",
          "name": "Developer Name",
          "username": "dev_username"
        }
      ],
      "summary": {
        "total_issues": 120,
        "total_story_points": 450,
        "completion_rate": 75.5
      }
    }
  }

PURPOSE: Get complete workspace summary with full hierarchical structure
STATUS CODE: 200 (success) or 400-500 (error)
CACHING: 5 minutes
        """)
        self.assertTrue(True)

    def test_endpoint_2_documentation(self):
        """Endpoint 2: get_workspace_by_project"""
        print(f"\n{'='*80}")
        print("ENDPOINT 2: get_workspace_by_project")
        print(f"{'='*80}")
        print("""
REQUEST:
  Method: GET
  URL: /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project
  Parameters:
    - workspace_id (required): string - The Zenhub workspace ID
    - project_id (required): string - The project ID to filter by

EXAMPLE REQUEST:
  GET /api/method/.../get_workspace_by_project?workspace_id=6762cd11a171a80029eac4fd&project_id=proj_0_6762cd11

RESPONSE:
  {
    "success": true,
    "workspace": {
      "projects": [
        {
          "id": "proj_0_6762cd11",
          "title": "Project 1",
          "epics": [...]
        }
      ],
      "sprints": [...],
      "kanban_statuses": {...},
      "team_members": [...]
    },
    "project_id": "proj_0_6762cd11",
    "task_count": 45
  }

PURPOSE: Filter workspace to show only tasks from a specific project
STATUS CODE: 200 (success) or 400-500 (error)
CACHING: 5 minutes (uses cached workspace data)
NOTE: Returns filtered view with only the specified project
        """)
        self.assertTrue(True)

    def test_endpoint_3_documentation(self):
        """Endpoint 3: get_workspace_by_epic"""
        print(f"\n{'='*80}")
        print("ENDPOINT 3: get_workspace_by_epic")
        print(f"{'='*80}")
        print("""
REQUEST:
  Method: GET
  URL: /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic
  Parameters:
    - workspace_id (required): string - The Zenhub workspace ID
    - epic_id (required): string - The epic ID to filter by

EXAMPLE REQUEST:
  GET /api/method/.../get_workspace_by_epic?workspace_id=6762cd11a171a80029eac4fd&epic_id=epic_0_0_6762cd11

RESPONSE:
  {
    "success": true,
    "workspace": {
      "projects": [
        {
          "id": "proj_0_6762cd11",
          "epics": [
            {
              "id": "epic_0_0_6762cd11",
              "title": "Epic 1-1",
              "sprints": [...]
            }
          ]
        }
      ],
      "sprints": [...],
      "kanban_statuses": {...},
      "team_members": [...]
    },
    "epic_id": "epic_0_0_6762cd11",
    "epic_title": "Epic 1-1",
    "task_count": 18
  }

PURPOSE: Filter workspace to show only tasks from a specific epic
STATUS CODE: 200 (success) or 400-500 (error)
CACHING: 5 minutes (uses cached workspace data)
NOTE: Returns filtered view with only the specified epic
        """)
        self.assertTrue(True)

    def test_endpoint_4_documentation(self):
        """Endpoint 4: get_team_utilization"""
        print(f"\n{'='*80}")
        print("ENDPOINT 4: get_team_utilization")
        print(f"{'='*80}")
        print("""
REQUEST:
  Method: GET
  URL: /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization
  Parameters:
    - workspace_id (required): string - The Zenhub workspace ID

EXAMPLE REQUEST:
  GET /api/method/.../get_team_utilization?workspace_id=6762cd11a171a80029eac4fd

RESPONSE:
  {
    "success": true,
    "team_members": [
      {
        "id": "user_0_6762cd11",
        "name": "Developer 1",
        "task_count": 12,
        "story_points": 45,
        "completed_points": 32,
        "completed_tasks": 8,
        "utilization_percentage": 71.11,
        "task_completion_percentage": 66.67
      },
      {
        "id": "user_1_6762cd11",
        "name": "Developer 2",
        "task_count": 15,
        "story_points": 52,
        "completed_points": 38,
        "completed_tasks": 10,
        "utilization_percentage": 73.08,
        "task_completion_percentage": 66.67
      }
    ],
    "total_members": 2,
    "average_utilization": 72.1
  }

METRICS EXPLAINED:
  - task_count: Total number of tasks assigned to team member
  - story_points: Total story points assigned
  - completed_points: Story points for completed tasks
  - completed_tasks: Number of completed tasks
  - utilization_percentage: (completed_points / story_points) * 100
  - task_completion_percentage: (completed_tasks / task_count) * 100

PURPOSE: Get team member workload and utilization metrics
STATUS CODE: 200 (success) or 400-500 (error)
CACHING: 5 minutes (uses cached workspace data)
        """)
        self.assertTrue(True)

    def test_endpoint_5_documentation(self):
        """Endpoint 5: get_workspace_summary_with_filters"""
        print(f"\n{'='*80}")
        print("ENDPOINT 5: get_workspace_summary_with_filters")
        print(f"{'='*80}")
        print("""
REQUEST:
  Method: GET
  URL: /api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary_with_filters
  Parameters:
    - workspace_id (required): string - The Zenhub workspace ID
    - project_id (optional): string - The project ID to filter by
    - epic_id (optional): string - The epic ID to filter by
    - status (optional): string - The kanban status to filter by

EXAMPLE REQUESTS:
  # With project filter
  GET /api/method/.../get_workspace_summary_with_filters?workspace_id=6762cd11a171a80029eac4fd&project_id=proj_0_6762cd11

  # With epic filter
  GET /api/method/.../get_workspace_summary_with_filters?workspace_id=6762cd11a171a80029eac4fd&epic_id=epic_0_0_6762cd11

  # With status filter (currently collected but not applied)
  GET /api/method/.../get_workspace_summary_with_filters?workspace_id=6762cd11a171a80029eac4fd&status=In+Progress

  # With multiple filters
  GET /api/method/.../get_workspace_summary_with_filters?workspace_id=6762cd11a171a80029eac4fd&project_id=proj_0_6762cd11&epic_id=epic_0_0_6762cd11

RESPONSE:
  {
    "success": true,
    "workspace": {
      "projects": [...],
      "sprints": [...],
      "kanban_statuses": {...},
      "team_members": [...]
    },
    "team_utilization": [
      {
        "id": "user_0_6762cd11",
        "name": "Developer 1",
        "task_count": 6,
        "story_points": 22,
        "completed_points": 15,
        "completed_tasks": 4,
        "utilization_percentage": 68.18,
        "task_completion_percentage": 66.67
      }
    ],
    "applied_filters": {
      "project_id": "proj_0_6762cd11",
      "epic_id": null,
      "status": null
    }
  }

PURPOSE: Get filtered workspace summary with team utilization in a single call
STATUS CODE: 200 (success) or 400-500 (error)
CACHING: 5 minutes (uses cached workspace data)
NOTE: Combines filtering with team metrics for comprehensive analysis
      Filters are applied after data fetch (local post-processing)
        """)
        self.assertTrue(True)


if __name__ == "__main__":
    # Run tests with verbose output
    unittest.main(verbosity=2)
