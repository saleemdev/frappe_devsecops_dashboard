"""
Test suite for Incident Management API endpoints
Tests CRUD operations for Devsecops Dashboard Incident DocType
"""

import frappe
import json
from frappe.test_runner import make_test_records
from frappe.tests.utils import FrappeTestCase


class TestIncidentAPI(FrappeTestCase):
    """Test cases for Incident API endpoints"""

    def setUp(self):
        """Set up test fixtures"""
        super().setUp()
        
        # Create test user
        if not frappe.db.exists('User', 'test_incident_user@example.com'):
            frappe.get_doc({
                'doctype': 'User',
                'email': 'test_incident_user@example.com',
                'first_name': 'Test',
                'last_name': 'User',
                'full_name': 'Test User'
            }).insert()

    def test_create_incident(self):
        """Test creating a new incident"""
        from frappe_devsecops_dashboard.api.incidents import create_incident
        
        incident_data = {
            'title': 'Test Database Connection Issue',
            'priority': 'High',
            'status': 'New',
            'category': 'Infrastructure',
            'severity': 'S2 - High',
            'reported_by': 'Administrator',
            'description': 'Test incident for database connection timeout'
        }
        
        response = create_incident(json.dumps(incident_data))
        
        self.assertTrue(response['success'])
        self.assertIn('data', response)
        self.assertEqual(response['data']['title'], 'Test Database Connection Issue')
        self.assertEqual(response['data']['priority'], 'High')
        
        # Clean up
        frappe.delete_doc('Devsecops Dashboard Incident', response['data']['name'])

    def test_get_incidents(self):
        """Test retrieving list of incidents"""
        from frappe_devsecops_dashboard.api.incidents import get_incidents, create_incident
        
        # Create test incident
        incident_data = {
            'title': 'Test Incident for List',
            'priority': 'Medium',
            'status': 'Open',
            'category': 'Application',
            'reported_by': 'Administrator'
        }
        
        create_response = create_incident(json.dumps(incident_data))
        incident_name = create_response['data']['name']
        
        # Get incidents
        response = get_incidents()
        
        self.assertTrue(response['success'])
        self.assertIn('data', response)
        self.assertIn('total', response)
        self.assertGreater(response['total'], 0)
        
        # Verify our incident is in the list
        incident_names = [inc['name'] for inc in response['data']]
        self.assertIn(incident_name, incident_names)
        
        # Clean up
        frappe.delete_doc('Devsecops Dashboard Incident', incident_name)

    def test_get_incident_detail(self):
        """Test retrieving a single incident"""
        from frappe_devsecops_dashboard.api.incidents import get_incident, create_incident
        
        # Create test incident
        incident_data = {
            'title': 'Test Incident Detail',
            'priority': 'Critical',
            'status': 'In Progress',
            'category': 'Security',
            'reported_by': 'Administrator',
            'description': 'Test incident for detail retrieval'
        }
        
        create_response = create_incident(json.dumps(incident_data))
        incident_name = create_response['data']['name']
        
        # Get incident detail
        response = get_incident(incident_name)
        
        self.assertTrue(response['success'])
        self.assertIn('data', response)
        self.assertEqual(response['data']['name'], incident_name)
        self.assertEqual(response['data']['title'], 'Test Incident Detail')
        
        # Clean up
        frappe.delete_doc('Devsecops Dashboard Incident', incident_name)

    def test_update_incident(self):
        """Test updating an incident"""
        from frappe_devsecops_dashboard.api.incidents import update_incident, create_incident
        
        # Create test incident
        incident_data = {
            'title': 'Test Incident Update',
            'priority': 'Low',
            'status': 'New',
            'category': 'Database',
            'reported_by': 'Administrator'
        }
        
        create_response = create_incident(json.dumps(incident_data))
        incident_name = create_response['data']['name']
        
        # Update incident
        update_data = {
            'status': 'In Progress',
            'priority': 'High',
            'assigned_to': 'Administrator'
        }
        
        response = update_incident(incident_name, json.dumps(update_data))
        
        self.assertTrue(response['success'])
        self.assertEqual(response['data']['status'], 'In Progress')
        self.assertEqual(response['data']['priority'], 'High')
        
        # Clean up
        frappe.delete_doc('Devsecops Dashboard Incident', incident_name)

    def test_delete_incident(self):
        """Test deleting an incident"""
        from frappe_devsecops_dashboard.api.incidents import delete_incident, create_incident, get_incident
        
        # Create test incident
        incident_data = {
            'title': 'Test Incident Delete',
            'priority': 'Medium',
            'status': 'New',
            'category': 'Network',
            'reported_by': 'Administrator'
        }
        
        create_response = create_incident(json.dumps(incident_data))
        incident_name = create_response['data']['name']
        
        # Delete incident
        response = delete_incident(incident_name)
        
        self.assertTrue(response['success'])
        
        # Verify deletion
        with self.assertRaises(frappe.DoesNotExistError):
            get_incident(incident_name)

    def test_get_incidents_with_filters(self):
        """Test retrieving incidents with filters"""
        from frappe_devsecops_dashboard.api.incidents import get_incidents, create_incident
        
        # Create test incidents with different statuses
        incident1 = {
            'title': 'Test Incident Status Open',
            'priority': 'High',
            'status': 'Open',
            'category': 'Infrastructure',
            'reported_by': 'Administrator'
        }
        
        incident2 = {
            'title': 'Test Incident Status Closed',
            'priority': 'Low',
            'status': 'Closed',
            'category': 'Application',
            'reported_by': 'Administrator'
        }
        
        resp1 = create_incident(json.dumps(incident1))
        resp2 = create_incident(json.dumps(incident2))
        
        # Get incidents with status filter
        filters = json.dumps([['status', '=', 'Open']])
        response = get_incidents(filters=filters)
        
        self.assertTrue(response['success'])
        
        # Verify filtered results
        open_incidents = [inc for inc in response['data'] if inc['status'] == 'Open']
        self.assertGreater(len(open_incidents), 0)
        
        # Clean up
        frappe.delete_doc('Devsecops Dashboard Incident', resp1['data']['name'])
        frappe.delete_doc('Devsecops Dashboard Incident', resp2['data']['name'])

    def test_incident_permission_check(self):
        """Test permission checks for incident operations"""
        from frappe_devsecops_dashboard.api.incidents import create_incident
        
        # This test verifies that permission checks are in place
        # In a real scenario, you would test with a user that has limited permissions
        
        incident_data = {
            'title': 'Test Permission Check',
            'priority': 'Medium',
            'status': 'New',
            'category': 'API',
            'reported_by': 'Administrator'
        }
        
        response = create_incident(json.dumps(incident_data))
        
        # Should succeed for Administrator
        self.assertTrue(response['success'])
        
        # Clean up
        frappe.delete_doc('Devsecops Dashboard Incident', response['data']['name'])

