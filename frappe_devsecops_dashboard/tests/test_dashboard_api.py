"""
Unit tests for DevSecOps Dashboard API with ERPNext integration
"""

import unittest
import frappe
from frappe.tests.utils import FrappeTestCase
from frappe_devsecops_dashboard.api.dashboard import (
    get_dashboard_data,
    get_projects_with_tasks,
    enhance_project_with_task_data,
    calculate_project_lifecycle_phases,
    get_task_type_order,
    determine_current_phase,
    calculate_actual_progress,
    calculate_dashboard_metrics,
    get_devsecops_lifecycle_phases,
    get_project_details
)


class TestDashboardAPI(FrappeTestCase):
    """Test cases for DevSecOps Dashboard API endpoints"""

    def setUp(self):
        """Set up test data"""
        # Create test Customer first
        self.create_test_customer()

        # Create test Task Types if they don't exist
        self.create_test_task_types()

        # Create test Project if it doesn't exist
        self.create_test_project()

        # Create test Tasks
        self.create_test_tasks()

    def create_test_customer(self):
        """Create a test customer"""
        if not frappe.db.exists("Customer", "Test Customer"):
            customer = frappe.get_doc({
                "doctype": "Customer",
                "customer_name": "Test Customer",
                "customer_type": "Company",
                "customer_group": "All Customer Groups",
                "territory": "All Territories"
            })
            customer.insert(ignore_permissions=True)

    def create_test_task_types(self):
        """Create test Task Types for DevSecOps lifecycle"""
        task_types = [
            {"name": "Planning", "description": "Project planning phase"},
            {"name": "Development", "description": "Development phase"},
            {"name": "Security Review", "description": "Security review phase"},
            {"name": "Testing", "description": "Testing phase"},
            {"name": "Deployment", "description": "Deployment phase"}
        ]
        
        for task_type_data in task_types:
            if not frappe.db.exists("Task Type", task_type_data["name"]):
                task_type = frappe.get_doc({
                    "doctype": "Task Type",
                    "name": task_type_data["name"],
                    "description": task_type_data["description"]
                })
                task_type.insert(ignore_permissions=True)

    def create_test_project(self):
        """Create a test project"""
        if not frappe.db.exists("Project", "TEST-DEVSECOPS-001"):
            project = frappe.get_doc({
                "doctype": "Project",
                "name": "TEST-DEVSECOPS-001",
                "project_name": "Test DevSecOps Project",
                "status": "Open",
                "customer": "Test Customer",
                "project_type": "Internal",
                "priority": "High",
                "percent_complete": 45,
                "expected_start_date": "2024-01-01",
                "expected_end_date": "2024-12-31"
            })
            project.insert(ignore_permissions=True)

    def create_test_tasks(self):
        """Create test tasks for the project"""
        tasks_data = [
            {"subject": "Project Planning", "task_type": "Planning", "status": "Completed"},
            {"subject": "Requirements Analysis", "task_type": "Planning", "status": "Completed"},
            {"subject": "Feature Development", "task_type": "Development", "status": "Open"},
            {"subject": "Code Review", "task_type": "Development", "status": "Working"},
            {"subject": "Security Assessment", "task_type": "Security Review", "status": "Open"},
            {"subject": "Unit Testing", "task_type": "Testing", "status": "Open"},
            {"subject": "Integration Testing", "task_type": "Testing", "status": "Open"}
        ]
        
        for i, task_data in enumerate(tasks_data):
            task_name = f"TEST-TASK-{i+1:03d}"
            if not frappe.db.exists("Task", task_name):
                task = frappe.get_doc({
                    "doctype": "Task",
                    "name": task_name,
                    "subject": task_data["subject"],
                    "project": "TEST-DEVSECOPS-001",
                    "task_type": task_data["task_type"],
                    "status": task_data["status"],
                    "priority": "Medium"
                })
                task.insert(ignore_permissions=True)

    def test_get_dashboard_data_success(self):
        """Test successful dashboard data retrieval"""
        response = get_dashboard_data()
        
        self.assertIsInstance(response, dict)
        self.assertIn('success', response)
        self.assertIn('projects', response)
        self.assertIn('metrics', response)
        self.assertIn('lifecycle_phases', response)
        self.assertTrue(response['success'])
        self.assertIsInstance(response['projects'], list)
        self.assertIsInstance(response['metrics'], dict)
        self.assertIsInstance(response['lifecycle_phases'], list)

    def test_get_projects_with_tasks(self):
        """Test projects with tasks retrieval"""
        projects = get_projects_with_tasks()
        
        self.assertIsInstance(projects, list)
        
        # Find our test project
        test_project = None
        for project in projects:
            if project.get('id') == 'TEST-DEVSECOPS-001':
                test_project = project
                break
        
        if test_project:
            # Verify project structure
            self.assertIn('name', test_project)
            self.assertIn('project_status', test_project)
            self.assertIn('client', test_project)
            self.assertIn('task_count', test_project)
            self.assertIn('delivery_phases', test_project)
            self.assertIsInstance(test_project['delivery_phases'], list)

    def test_enhance_project_with_task_data(self):
        """Test project enhancement with task data"""
        basic_project = {
            'name': 'TEST-DEVSECOPS-001',
            'project_name': 'Test DevSecOps Project',
            'status': 'Open',
            'customer': 'Test Customer',
            'percent_complete': 45
        }
        
        enhanced_project = enhance_project_with_task_data(basic_project)
        
        # Verify enhanced fields
        self.assertIn('delivery_phases', enhanced_project)
        self.assertIn('task_count', enhanced_project)
        self.assertIn('completed_tasks', enhanced_project)
        self.assertIn('completion_rate', enhanced_project)
        self.assertIn('current_phase', enhanced_project)
        self.assertIsInstance(enhanced_project['delivery_phases'], list)

    def test_calculate_project_lifecycle_phases(self):
        """Test lifecycle phases calculation"""
        # Mock tasks data
        tasks = [
            {'task_type': 'Planning', 'status': 'Completed'},
            {'task_type': 'Planning', 'status': 'Completed'},
            {'task_type': 'Development', 'status': 'Open'},
            {'task_type': 'Development', 'status': 'Working'},
            {'task_type': 'Testing', 'status': 'Open'}
        ]
        
        phases = calculate_project_lifecycle_phases(tasks)
        
        self.assertIsInstance(phases, list)
        self.assertGreater(len(phases), 0)
        
        # Check phase structure
        for phase in phases:
            self.assertIn('section_name', phase)
            self.assertIn('section_status', phase)
            self.assertIn('section_progress', phase)
            self.assertIn('task_count', phase)
            self.assertIn('completed_tasks', phase)

    def test_get_task_type_order(self):
        """Test task type ordering"""
        task_types = get_task_type_order()
        
        self.assertIsInstance(task_types, list)
        self.assertGreater(len(task_types), 0)
        
        # Verify our test task types are included
        self.assertIn('Planning', task_types)
        self.assertIn('Development', task_types)
        self.assertIn('Testing', task_types)

    def test_determine_current_phase(self):
        """Test current phase determination"""
        phases = [
            {'section_name': 'Planning', 'section_status': 'complete'},
            {'section_name': 'Development', 'section_status': 'in_progress'},
            {'section_name': 'Testing', 'section_status': 'pending'}
        ]
        
        current_phase = determine_current_phase(phases)
        self.assertEqual(current_phase, 'Development')

    def test_calculate_actual_progress(self):
        """Test actual progress calculation"""
        tasks = [
            {'status': 'Completed'},
            {'status': 'Completed'},
            {'status': 'Open'},
            {'status': 'Working'}
        ]
        
        progress = calculate_actual_progress(tasks)
        self.assertEqual(progress, 50.0)  # 2 out of 4 completed

    def test_calculate_dashboard_metrics(self):
        """Test dashboard metrics calculation"""
        projects = [
            {'project_status': 'Open', 'task_count': 10, 'completed_tasks': 5, 'completion_rate': 50},
            {'project_status': 'Open', 'task_count': 8, 'completed_tasks': 6, 'completion_rate': 75},
            {'project_status': 'Completed', 'task_count': 12, 'completed_tasks': 12, 'completion_rate': 100}
        ]
        
        metrics = calculate_dashboard_metrics(projects)
        
        self.assertIn('total_projects', metrics)
        self.assertIn('active_projects', metrics)
        self.assertIn('total_tasks', metrics)
        self.assertIn('completed_tasks', metrics)
        self.assertIn('average_completion', metrics)
        
        self.assertEqual(metrics['total_projects'], 3)
        self.assertEqual(metrics['active_projects'], 2)
        self.assertEqual(metrics['total_tasks'], 30)
        self.assertEqual(metrics['completed_tasks'], 23)

    def test_get_devsecops_lifecycle_phases(self):
        """Test DevSecOps lifecycle phases retrieval"""
        phases = get_devsecops_lifecycle_phases()
        
        self.assertIsInstance(phases, list)
        self.assertGreater(len(phases), 0)
        
        # Check phase structure
        for phase in phases:
            self.assertIn('name', phase)
            self.assertIn('description', phase)

    def test_get_project_details(self):
        """Test project details retrieval"""
        response = get_project_details('TEST-DEVSECOPS-001')
        
        self.assertIsInstance(response, dict)
        self.assertIn('success', response)
        
        if response['success']:
            self.assertIn('project', response)
            project = response['project']
            self.assertIn('name', project)
            self.assertIn('delivery_phases', project)
            self.assertIn('task_count', project)

    def test_api_error_handling(self):
        """Test API error handling for non-existent project"""
        response = get_project_details('NON-EXISTENT-PROJECT')
        
        self.assertIsInstance(response, dict)
        self.assertIn('success', response)
        
        # Should handle gracefully (either success=False or empty data)
        if not response['success']:
            self.assertIn('error', response)

    def tearDown(self):
        """Clean up test data"""
        # Clean up test tasks
        frappe.db.delete("Task", {"project": "TEST-DEVSECOPS-001"})

        # Clean up test project
        if frappe.db.exists("Project", "TEST-DEVSECOPS-001"):
            frappe.delete_doc("Project", "TEST-DEVSECOPS-001", ignore_permissions=True)

        # Clean up test customer
        if frappe.db.exists("Customer", "Test Customer"):
            frappe.delete_doc("Customer", "Test Customer", ignore_permissions=True)

        # Note: We don't delete Task Types as they might be used by other tests
        frappe.db.commit()


if __name__ == '__main__':
    unittest.main()
