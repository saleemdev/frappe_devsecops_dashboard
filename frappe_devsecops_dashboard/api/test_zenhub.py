"""
Unit Tests for Zenhub GraphQL API Integration

This module contains comprehensive unit tests for the Zenhub API integration,
including token retrieval, GraphQL queries, data transformation, and error handling.

Run tests with: bench run-tests --app frappe_devsecops_dashboard --module api.test_zenhub
"""

import frappe
import unittest
from unittest.mock import patch, MagicMock
import json
from frappe_devsecops_dashboard.api.zenhub import (
    get_zenhub_token,
    execute_graphql_query,
    calculate_sprint_metrics,
    transform_sprint_data,
    get_sprint_data
)


class TestZenhubIntegration(unittest.TestCase):
    """Test suite for Zenhub API integration"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Clear cache before each test
        frappe.cache().delete_value("zenhub_api_token")
        
        # Create test Zenhub Settings
        if not frappe.db.exists("Zenhub Settings", "Zenhub Settings"):
            zenhub_settings = frappe.get_doc({
                "doctype": "Zenhub Settings",
                "zenhub_token": "test_token_123"
            })
            zenhub_settings.insert(ignore_permissions=True)
        
        # Create test Project
        if not frappe.db.exists("Project", "TEST-PROJ-001"):
            project = frappe.get_doc({
                "doctype": "Project",
                "project_name": "Test Project",
                "name": "TEST-PROJ-001",
                "custom_zenhub_workspace_id": "workspace_test_123"
            })
            project.insert(ignore_permissions=True)
        
        frappe.db.commit()
    
    def tearDown(self):
        """Clean up after tests"""
        # Clear cache
        frappe.cache().delete_value("zenhub_api_token")
        
        # Delete test data
        if frappe.db.exists("Project", "TEST-PROJ-001"):
            frappe.delete_doc("Project", "TEST-PROJ-001", force=True)
        
        frappe.db.commit()
    
    def test_get_zenhub_token_success(self):
        """Test successful token retrieval"""
        token = get_zenhub_token()
        self.assertEqual(token, "test_token_123")
    
    def test_get_zenhub_token_caching(self):
        """Test that token is cached properly"""
        # First call - should fetch from database
        token1 = get_zenhub_token()
        
        # Second call - should fetch from cache
        token2 = get_zenhub_token()
        
        self.assertEqual(token1, token2)
        
        # Verify cache exists
        cached_token = frappe.cache().get_value("zenhub_api_token")
        self.assertEqual(cached_token, "test_token_123")
    
    def test_get_zenhub_token_missing(self):
        """Test error when token is not configured"""
        # Update settings to have no token
        zenhub_settings = frappe.get_single("Zenhub Settings")
        zenhub_settings.zenhub_token = ""
        zenhub_settings.save()
        frappe.db.commit()
        
        # Clear cache
        frappe.cache().delete_value("zenhub_api_token")
        
        with self.assertRaises(frappe.ValidationError):
            get_zenhub_token()
    
    @patch('frappe_devsecops_dashboard.api.zenhub.requests.post')
    def test_execute_graphql_query_success(self, mock_post):
        """Test successful GraphQL query execution"""
        # Mock successful response
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "data": {
                "workspace": {
                    "id": "workspace_123",
                    "name": "Test Workspace"
                }
            }
        }
        mock_post.return_value = mock_response
        
        query = "query { workspace(id: $workspaceId) { id name } }"
        variables = {"workspaceId": "workspace_123"}
        
        result = execute_graphql_query(query, variables)
        
        self.assertIn("workspace", result)
        self.assertEqual(result["workspace"]["id"], "workspace_123")
    
    @patch('frappe_devsecops_dashboard.api.zenhub.requests.post')
    def test_execute_graphql_query_authentication_error(self, mock_post):
        """Test GraphQL query with authentication error"""
        # Mock 401 response
        mock_response = MagicMock()
        mock_response.status_code = 401
        mock_post.return_value = mock_response
        
        query = "query { workspace(id: $workspaceId) { id } }"
        variables = {"workspaceId": "workspace_123"}
        
        with self.assertRaises(frappe.AuthenticationError):
            execute_graphql_query(query, variables)
    
    @patch('frappe_devsecops_dashboard.api.zenhub.requests.post')
    def test_execute_graphql_query_rate_limit(self, mock_post):
        """Test GraphQL query with rate limit error"""
        # Mock 429 response
        mock_response = MagicMock()
        mock_response.status_code = 429
        mock_post.return_value = mock_response
        
        query = "query { workspace(id: $workspaceId) { id } }"
        variables = {"workspaceId": "workspace_123"}
        
        with self.assertRaises(frappe.RateLimitExceededError):
            execute_graphql_query(query, variables)
    
    @patch('frappe_devsecops_dashboard.api.zenhub.requests.post')
    def test_execute_graphql_query_graphql_errors(self, mock_post):
        """Test GraphQL query with GraphQL errors in response"""
        # Mock response with GraphQL errors
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "errors": [
                {"message": "Workspace not found"}
            ]
        }
        mock_post.return_value = mock_response
        
        query = "query { workspace(id: $workspaceId) { id } }"
        variables = {"workspaceId": "invalid_workspace"}
        
        with self.assertRaises(frappe.ValidationError):
            execute_graphql_query(query, variables)
    
    def test_calculate_sprint_metrics(self):
        """Test sprint metrics calculation"""
        sprint_data = {
            "issues": {
                "nodes": [
                    {
                        "id": "issue_1",
                        "title": "Task 1",
                        "state": "closed",
                        "estimate": {"value": 5},
                        "assignees": {
                            "nodes": [
                                {"id": "user_1", "name": "John Doe", "username": "johndoe"}
                            ]
                        },
                        "blockedBy": {"nodes": []}
                    },
                    {
                        "id": "issue_2",
                        "title": "Task 2",
                        "state": "in_progress",
                        "estimate": {"value": 3},
                        "assignees": {
                            "nodes": [
                                {"id": "user_2", "name": "Jane Smith", "username": "janesmith"}
                            ]
                        },
                        "blockedBy": {"nodes": [{"id": "issue_1", "title": "Task 1"}]}
                    },
                    {
                        "id": "issue_3",
                        "title": "Task 3",
                        "state": "open",
                        "estimate": {"value": 2},
                        "assignees": {"nodes": []},
                        "blockedBy": {"nodes": []}
                    }
                ]
            }
        }
        
        metrics = calculate_sprint_metrics(sprint_data)
        
        # Verify calculations
        self.assertEqual(metrics["total_story_points"], 10)
        self.assertEqual(metrics["completed_story_points"], 5)
        self.assertEqual(metrics["remaining_story_points"], 5)
        self.assertEqual(metrics["utilization_percentage"], 50.0)
        
        # Verify issue counts
        self.assertEqual(metrics["issues"]["total"], 3)
        self.assertEqual(metrics["issues"]["completed"], 1)
        self.assertEqual(metrics["issues"]["in_progress"], 1)
        self.assertEqual(metrics["issues"]["blocked"], 1)
        
        # Verify team members
        self.assertEqual(len(metrics["team_members"]), 2)
        
        # Verify blockers
        self.assertEqual(len(metrics["blockers"]), 1)
        self.assertEqual(metrics["blockers"][0]["issue_id"], "issue_2")
    
    def test_transform_sprint_data(self):
        """Test sprint data transformation"""
        raw_sprint = {
            "id": "sprint_123",
            "name": "Sprint 1",
            "state": "ACTIVE",
            "startDate": "2025-09-01",
            "endDate": "2025-09-14",
            "issues": {
                "nodes": [
                    {
                        "id": "issue_1",
                        "title": "Task 1",
                        "state": "completed",
                        "estimate": {"value": 5},
                        "assignees": {"nodes": []},
                        "blockedBy": {"nodes": []}
                    }
                ]
            }
        }
        
        transformed = transform_sprint_data(raw_sprint)
        
        self.assertEqual(transformed["sprint_id"], "sprint_123")
        self.assertEqual(transformed["sprint_name"], "Sprint 1")
        self.assertEqual(transformed["state"], "active")
        self.assertEqual(transformed["start_date"], "2025-09-01")
        self.assertEqual(transformed["end_date"], "2025-09-14")
        self.assertIn("total_story_points", transformed)
        self.assertIn("utilization_percentage", transformed)
    
    @patch('frappe_devsecops_dashboard.api.zenhub.execute_graphql_query')
    def test_get_sprint_data_success(self, mock_execute):
        """Test successful sprint data retrieval"""
        # Mock GraphQL response
        mock_execute.return_value = {
            "workspace": {
                "id": "workspace_test_123",
                "name": "Test Workspace",
                "sprints": {
                    "nodes": [
                        {
                            "id": "sprint_1",
                            "name": "Sprint 1",
                            "state": "ACTIVE",
                            "startDate": "2025-09-01",
                            "endDate": "2025-09-14",
                            "issues": {"nodes": []}
                        }
                    ]
                }
            }
        }
        
        result = get_sprint_data(project_id="TEST-PROJ-001")
        
        self.assertTrue(result["success"])
        self.assertEqual(result["workspace_id"], "workspace_test_123")
        self.assertEqual(len(result["sprints"]), 1)
        self.assertEqual(result["sprints"][0]["sprint_name"], "Sprint 1")
    
    def test_get_sprint_data_missing_project_id(self):
        """Test error when project_id is missing"""
        result = get_sprint_data(project_id="")
        
        self.assertFalse(result["success"])
        self.assertEqual(result["error_type"], "validation_error")
        self.assertIn("required", result["error"])
    
    def test_get_sprint_data_project_not_found(self):
        """Test error when project doesn't exist"""
        result = get_sprint_data(project_id="NONEXISTENT-PROJECT")
        
        self.assertFalse(result["success"])
        self.assertEqual(result["error_type"], "validation_error")
        self.assertIn("not found", result["error"])
    
    def test_get_sprint_data_missing_workspace_id(self):
        """Test error when workspace ID is not configured"""
        # Create project without workspace ID
        if frappe.db.exists("Project", "TEST-PROJ-002"):
            frappe.delete_doc("Project", "TEST-PROJ-002", force=True)
        
        project = frappe.get_doc({
            "doctype": "Project",
            "project_name": "Test Project 2",
            "name": "TEST-PROJ-002",
            "custom_zenhub_workspace_id": ""
        })
        project.insert(ignore_permissions=True)
        frappe.db.commit()
        
        result = get_sprint_data(project_id="TEST-PROJ-002")
        
        self.assertFalse(result["success"])
        self.assertEqual(result["error_type"], "validation_error")
        self.assertIn("workspace ID not configured", result["error"])
        
        # Cleanup
        frappe.delete_doc("Project", "TEST-PROJ-002", force=True)
        frappe.db.commit()
    
    def test_calculate_sprint_metrics_no_issues(self):
        """Test metrics calculation with no issues"""
        sprint_data = {"issues": {"nodes": []}}
        
        metrics = calculate_sprint_metrics(sprint_data)
        
        self.assertEqual(metrics["total_story_points"], 0)
        self.assertEqual(metrics["completed_story_points"], 0)
        self.assertEqual(metrics["utilization_percentage"], 0.0)
        self.assertEqual(metrics["issues"]["total"], 0)
    
    def test_calculate_sprint_metrics_no_estimates(self):
        """Test metrics calculation with issues but no estimates"""
        sprint_data = {
            "issues": {
                "nodes": [
                    {
                        "id": "issue_1",
                        "title": "Task 1",
                        "state": "open",
                        "estimate": None,
                        "assignees": {"nodes": []},
                        "blockedBy": {"nodes": []}
                    }
                ]
            }
        }
        
        metrics = calculate_sprint_metrics(sprint_data)
        
        self.assertEqual(metrics["total_story_points"], 0)
        self.assertEqual(metrics["issues"]["total"], 1)


def run_tests():
    """Helper function to run all tests"""
    suite = unittest.TestLoader().loadTestsFromTestCase(TestZenhubIntegration)
    unittest.TextTestRunner(verbosity=2).run(suite)


if __name__ == "__main__":
    run_tests()

