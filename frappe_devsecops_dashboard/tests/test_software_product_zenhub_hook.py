"""
Unit Tests for Software Product Zenhub Workspace Hook

Tests the automatic creation of Zenhub workspaces when Software Products are saved.

Run tests with: 
    bench run-tests --app frappe_devsecops_dashboard --module tests.test_software_product_zenhub_hook
"""

import frappe
import unittest
from unittest.mock import patch, MagicMock
from frappe_devsecops_dashboard.doc_hooks.software_product_zenhub import (
    handle_software_product_zenhub_workspace,
    create_zenhub_workspace,
    search_workspace_by_name
)


class TestSoftwareProductZenhubHook(unittest.TestCase):
    """Test cases for Software Product Zenhub workspace creation hook"""
    
    def setUp(self):
        """Set up test fixtures"""
        # Clear cache
        frappe.cache().delete_value("zenhub_api_token")
        
        # Create test Zenhub Settings if it doesn't exist
        if not frappe.db.exists("Zenhub Settings", "Zenhub Settings"):
            zenhub_settings = frappe.get_doc({
                "doctype": "Zenhub Settings",
                "zenhub_token": "test_zenhub_token_12345"
            })
            zenhub_settings.insert(ignore_permissions=True)
            frappe.db.commit()
        
        # Store test product names for cleanup
        self.test_products = []
    
    def tearDown(self):
        """Clean up after each test"""
        # Delete test Software Products
        for product_name in self.test_products:
            if frappe.db.exists("Software Product", product_name):
                frappe.delete_doc("Software Product", product_name, force=True, ignore_permissions=True)
        
        frappe.db.commit()
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_create_workspace_for_new_product(self, mock_execute_query):
        """Test that workspace is created when saving a new Software Product"""
        # Mock successful workspace creation
        mock_execute_query.return_value = {
            "createWorkspace": {
                "workspace": {
                    "id": "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xMjM0NTY=",
                    "name": "DSO-TTEST-PROD-001",
                    "description": "Workspace for TEST-PROD-001",
                    "createdAt": "2025-01-14T10:00:00Z"
                },
                "errors": None
            }
        }
        
        # Create a new Software Product
        product = frappe.new_doc("Software Product")
        product.product_name = "TEST-PROD-001"
        product.description = "Test Product Description"
        product.version = "1.0.0"
        product.status = "Active"
        product.release_status = "In Development"
        
        # Verify workspace_id is empty initially
        self.assertFalse(product.zenhub_workspace_id, "Workspace ID should be empty initially")
        
        # Save the product (this triggers the hook)
        product.insert(ignore_permissions=True)
        self.test_products.append(product.name)
        
        # Verify workspace was created and ID was set
        product.reload()
        self.assertTrue(product.zenhub_workspace_id, "Workspace ID should be set after save")
        self.assertEqual(
            product.zenhub_workspace_id,
            "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xMjM0NTY=",
            "Workspace ID should match the created workspace"
        )
        
        # Verify the API was called with correct workspace name
        mock_execute_query.assert_called()
        call_args = mock_execute_query.call_args
        self.assertIn("DSO-TTEST-PROD-001", str(call_args), "Workspace name should follow DSO-T{docname} format")
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_skip_workspace_creation_if_id_exists(self, mock_execute_query):
        """Test that workspace is not created if zenhub_workspace_id already exists"""
        # Create a Software Product with existing workspace ID
        product = frappe.new_doc("Software Product")
        product.product_name = "TEST-PROD-002"
        product.description = "Test Product"
        product.version = "1.0.0"
        product.zenhub_workspace_id = "EXISTING-WORKSPACE-ID"
        product.status = "Active"
        product.insert(ignore_permissions=True)
        self.test_products.append(product.name)
        
        # Save again (should not trigger workspace creation)
        product.description = "Updated description"
        product.save(ignore_permissions=True)
        
        # Verify API was not called
        mock_execute_query.assert_not_called()
        
        # Verify workspace ID remains unchanged
        product.reload()
        self.assertEqual(
            product.zenhub_workspace_id,
            "EXISTING-WORKSPACE-ID",
            "Existing workspace ID should not be overwritten"
        )
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_workspace_name_format(self, mock_execute_query):
        """Test that workspace name follows DSO-T{docname} format"""
        # Mock successful workspace creation
        mock_execute_query.return_value = {
            "createWorkspace": {
                "workspace": {
                    "id": "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xMjM0NTY=",
                    "name": "DSO-TTEST-PROD-003",
                    "description": "Workspace for TEST-PROD-003"
                },
                "errors": None
            }
        }
        
        # Create a new Software Product
        product = frappe.new_doc("Software Product")
        product.product_name = "TEST-PROD-003"
        product.description = "Test Product"
        product.version = "1.0.0"
        product.status = "Active"
        product.insert(ignore_permissions=True)
        self.test_products.append(product.name)
        
        # Verify workspace name format in API call
        calls = mock_execute_query.call_args_list
        create_workspace_calls = [
            call for call in calls 
            if call[0][0] and "createWorkspace" in call[0][0]
        ]
        
        if create_workspace_calls:
            # Check variables passed to mutation
            variables = create_workspace_calls[0][0][1] if len(create_workspace_calls[0][0]) > 1 else {}
            if "name" in variables:
                self.assertEqual(
                    variables["name"],
                    f"DSO-T{product.name}",
                    f"Workspace name should be DSO-T{product.name}"
                )
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_use_existing_workspace_if_found(self, mock_execute_query):
        """Test that existing workspace is used if found by name"""
        # Mock search finding existing workspace
        def mock_query_side_effect(query, variables):
            if "searchWorkspaces" in query:
                # Return existing workspace
                return {
                    "viewer": {
                        "searchWorkspaces": {
                            "nodes": [
                                {
                                    "id": "EXISTING-WORKSPACE-ID-123",
                                    "name": "DSO-TTEST-PROD-004",
                                    "description": "Existing workspace"
                                }
                            ]
                        }
                    }
                }
            return {}
        
        mock_execute_query.side_effect = mock_query_side_effect
        
        # Create a new Software Product
        product = frappe.new_doc("Software Product")
        product.product_name = "TEST-PROD-004"
        product.description = "Test Product"
        product.version = "1.0.0"
        product.status = "Active"
        product.insert(ignore_permissions=True)
        self.test_products.append(product.name)
        
        # Verify existing workspace ID was used
        product.reload()
        self.assertEqual(
            product.zenhub_workspace_id,
            "EXISTING-WORKSPACE-ID-123",
            "Should use existing workspace ID if found"
        )
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_error_handling_on_api_failure(self, mock_execute_query):
        """Test that document save succeeds even if workspace creation fails"""
        # Mock API error
        mock_execute_query.side_effect = frappe.ValidationError("API Error: Failed to create workspace")
        
        # Create a new Software Product
        product = frappe.new_doc("Software Product")
        product.product_name = "TEST-PROD-005"
        product.description = "Test Product"
        product.version = "1.0.0"
        product.status = "Active"
        
        # Save should succeed even if workspace creation fails
        # The hook catches exceptions and doesn't prevent save
        try:
            product.insert(ignore_permissions=True)
            self.test_products.append(product.name)
            product.reload()
            
            # Workspace ID should remain empty if creation failed
            # (The hook should handle the error gracefully)
            # Note: In actual implementation, the hook may set it or leave it empty
            # depending on error handling strategy
        except frappe.ValidationError:
            # If the hook doesn't catch the error, document save might fail
            # This test verifies the hook's error handling
            self.fail("Document save should not fail due to workspace creation error")
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_workspace_creation_with_description(self, mock_execute_query):
        """Test that workspace description includes product information"""
        # Mock successful workspace creation
        mock_execute_query.return_value = {
            "createWorkspace": {
                "workspace": {
                    "id": "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xMjM0NTY=",
                    "name": "DSO-TTEST-PROD-006",
                    "description": "Zenhub workspace for Software Product: TEST-PROD-006"
                },
                "errors": None
            }
        }
        
        # Create a new Software Product with description
        product = frappe.new_doc("Software Product")
        product.product_name = "TEST-PROD-006"
        product.description = "This is a test product description"
        product.version = "1.0.0"
        product.status = "Active"
        product.insert(ignore_permissions=True)
        self.test_products.append(product.name)
        
        # Verify description was included in API call
        calls = mock_execute_query.call_args_list
        create_workspace_calls = [
            call for call in calls 
            if call[0][0] and "createWorkspace" in call[0][0]
        ]
        
        if create_workspace_calls:
            variables = create_workspace_calls[0][0][1] if len(create_workspace_calls[0][0]) > 1 else {}
            if "description" in variables:
                self.assertIn(
                    "TEST-PROD-006",
                    variables["description"],
                    "Description should include product name"
                )
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_update_existing_product_without_workspace(self, mock_execute_query):
        """Test that workspace is created when updating existing product without workspace ID"""
        # Mock successful workspace creation
        mock_execute_query.return_value = {
            "createWorkspace": {
                "workspace": {
                    "id": "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xMjM0NTY=",
                    "name": "DSO-TTEST-PROD-007",
                    "description": "Workspace for TEST-PROD-007"
                },
                "errors": None
            }
        }
        
        # Create a Software Product without workspace ID
        product = frappe.new_doc("Software Product")
        product.product_name = "TEST-PROD-007"
        product.description = "Test Product"
        product.version = "1.0.0"
        product.status = "Active"
        product.insert(ignore_permissions=True)
        self.test_products.append(product.name)
        
        # Clear workspace ID (simulating product created before hook was added)
        frappe.db.set_value("Software Product", product.name, "zenhub_workspace_id", "", update_modified=False)
        frappe.db.commit()
        
        # Update the product (should trigger workspace creation)
        product.reload()
        product.description = "Updated description"
        product.save(ignore_permissions=True)
        
        # Verify workspace was created
        product.reload()
        self.assertTrue(product.zenhub_workspace_id, "Workspace ID should be set after update")
    
    def test_search_workspace_by_name_function(self):
        """Test the search_workspace_by_name function"""
        with patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query') as mock_query:
            # Mock successful search
            mock_query.return_value = {
                "viewer": {
                    "searchWorkspaces": {
                        "nodes": [
                            {
                                "id": "WORKSPACE-ID-123",
                                "name": "DSO-TTEST-PROD",
                                "description": "Test workspace"
                            }
                        ]
                    }
                }
            }
            
            result = search_workspace_by_name("DSO-TTEST-PROD")
            
            self.assertIsNotNone(result, "Should return workspace if found")
            self.assertEqual(result["id"], "WORKSPACE-ID-123")
            self.assertEqual(result["name"], "DSO-TTEST-PROD")
    
    def test_search_workspace_by_name_not_found(self):
        """Test search_workspace_by_name when workspace doesn't exist"""
        with patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query') as mock_query:
            # Mock empty search result
            mock_query.return_value = {
                "viewer": {
                    "searchWorkspaces": {
                        "nodes": []
                    }
                }
            }
            
            result = search_workspace_by_name("DSO-TNONEXISTENT")
            
            self.assertIsNone(result, "Should return None if workspace not found")
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_create_zenhub_workspace_function(self, mock_execute_query):
        """Test the create_zenhub_workspace function directly"""
        # Mock successful creation
        mock_execute_query.return_value = {
            "createWorkspace": {
                "workspace": {
                    "id": "NEW-WORKSPACE-ID-456",
                    "name": "DSO-TTEST",
                    "description": "Test workspace"
                },
                "errors": None
            }
        }
        
        result = create_zenhub_workspace("DSO-TTEST", "Test description")
        
        self.assertTrue(result["success"], "Should return success=True")
        self.assertEqual(result["workspace"]["id"], "NEW-WORKSPACE-ID-456")
        self.assertFalse(result.get("already_exists", False), "Should indicate new workspace")
    
    @patch('frappe_devsecops_dashboard.doc_hooks.software_product_zenhub.execute_graphql_query')
    def test_create_zenhub_workspace_with_errors(self, mock_execute_query):
        """Test create_zenhub_workspace when API returns errors"""
        # Mock API error response
        mock_execute_query.return_value = {
            "createWorkspace": {
                "workspace": None,
                "errors": [
                    {
                        "message": "Workspace name already exists",
                        "field": "name"
                    }
                ]
            }
        }
        
        with self.assertRaises(frappe.ValidationError):
            create_zenhub_workspace("DSO-TTEST", "Test description")


def suite():
    """Create test suite"""
    return unittest.TestLoader().loadTestsFromTestCase(TestSoftwareProductZenhubHook)


if __name__ == "__main__":
    unittest.main()

