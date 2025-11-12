#!/usr/bin/env python3
"""
Test script for Incident Creation API
Tests the create_incident endpoint with various scenarios
"""

import json
import sys
import os

# Add the app to the path
sys.path.insert(0, os.path.dirname(__file__))

import frappe
from frappe_devsecops_dashboard.api.incident import create_incident, get_incident

def test_incident_creation():
    """Test creating an incident"""
    print("\n" + "="*60)
    print("Testing Incident Creation API")
    print("="*60)
    
    # Test data
    incident_data = {
        "title": "Test Incident - Form Styling",
        "description": "Testing the new incident form with improved styling and layout",
        "severity": "S2 - High",
        "priority": "High",
        "status": "New",
        "category": "Application",
        "assigned_to": "Administrator",
        "reported_by": "Administrator",
        "affected_systems": "Dashboard UI, Frontend",
        "impact_description": "Form styling improvements for better UX"
    }
    
    print("\n1. Creating incident with data:")
    print(json.dumps(incident_data, indent=2))
    
    try:
        result = create_incident(json.dumps(incident_data))
        print("\n✓ Incident created successfully!")
        print(f"Response: {json.dumps(result, indent=2, default=str)}")
        
        if result.get('success') and result.get('data'):
            incident_id = result['data'].get('name')
            print(f"\n2. Retrieving created incident: {incident_id}")
            
            retrieved = get_incident(incident_id)
            print(f"✓ Incident retrieved successfully!")
            print(f"Title: {retrieved.get('data', {}).get('title')}")
            print(f"Status: {retrieved.get('data', {}).get('status')}")
            print(f"Severity: {retrieved.get('data', {}).get('severity')}")
            
            return True
    except Exception as e:
        print(f"\n✗ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    # Initialize Frappe
    frappe.init(user='Administrator')
    frappe.connect()
    
    try:
        success = test_incident_creation()
        sys.exit(0 if success else 1)
    finally:
        frappe.close()

