#!/usr/bin/env python3
"""
Test script for Product KPI API endpoints
Run this from frappe-bench directory with:
bench --site desk.kns.co.ke execute frappe_devsecops_dashboard.test_product_kpi.test_all
"""

import frappe
from frappe_devsecops_dashboard.api.product_kpi import get_product_kpi_data, get_software_products_for_filter


def test_all():
    """Run all Product KPI API tests"""

    print("=" * 80)
    print("PRODUCT KPI API TESTS")
    print("=" * 80)

    # Test 1: Get software products for filter
    print("\n[TEST 1] Get Software Products for Filter")
    print("-" * 80)
    try:
        result = get_software_products_for_filter()
        print(f"✓ Success: {result.get('success')}")
        if result.get('success'):
            products = result.get('data', [])
            print(f"✓ Found {len(products)} products with projects")
            if products:
                print(f"✓ Example product: {products[0]}")
        else:
            print(f"✗ Error: {result.get('error')}")
    except Exception as e:
        print(f"✗ Exception: {str(e)}")
        import traceback
        traceback.print_exc()

    # Test 2: Get all product KPI data
    print("\n[TEST 2] Get All Product KPI Data")
    print("-" * 80)
    try:
        result = get_product_kpi_data()
        print(f"✓ Success: {result.get('success')}")
        if result.get('success'):
            data = result.get('data', {})
            projects = data.get('projects', [])
            metrics = data.get('metrics', {})
            charts = data.get('charts', {})

            print(f"✓ Found {len(projects)} projects")
            print(f"✓ Metrics: {metrics}")
            print(f"✓ Chart types: {list(charts.keys())}")

            if projects:
                project = projects[0]
                print(f"\n  Example Project: {project.get('name')}")
                print(f"    - Name: {project.get('project_name')}")
                print(f"    - Status: {project.get('status')}")
                print(f"    - Project Manager: {project.get('project_manager')}")
                print(f"    - Software Product: {project.get('software_product')}")
                print(f"    - Team Size: {project.get('team_size')}")
                print(f"    - Risks: {project.get('risk_count')}")
                print(f"    - Change Requests: {project.get('change_request_count')}")
                print(f"    - Incidents: {project.get('incident_count')}")
                print(f"    - Task Types: {project.get('task_types')}")

                if project.get('team_members'):
                    print(f"\n  Team Members ({len(project.get('team_members'))}):")
                    for member in project.get('team_members', [])[:3]:  # Show first 3
                        print(f"    - {member.get('full_name', member.get('user'))}")
                        print(f"      Email: {member.get('email')}")
                        print(f"      Business Function: {member.get('custom_business_function')}")
        else:
            print(f"✗ Error: {result.get('error')}")
    except Exception as e:
        print(f"✗ Exception: {str(e)}")
        import traceback
        traceback.print_exc()

    # Test 3: Get filtered product KPI data
    print("\n[TEST 3] Get Filtered Product KPI Data")
    print("-" * 80)
    try:
        # First get a product name
        products_result = get_software_products_for_filter()
        if products_result.get('success') and products_result.get('data'):
            product_name = products_result['data'][0]['name']
            print(f"Filtering by product: {product_name}")

            result = get_product_kpi_data(product_name=product_name)
            print(f"✓ Success: {result.get('success')}")
            if result.get('success'):
                data = result.get('data', {})
                projects = data.get('projects', [])
                print(f"✓ Found {len(projects)} projects for this product")

                # Verify all projects belong to the selected product
                for project in projects:
                    if project.get('software_product') != product_name:
                        print(f"✗ ERROR: Project {project.get('name')} has wrong product: {project.get('software_product')}")
                    else:
                        print(f"✓ Project {project.get('name')} correctly filtered")
            else:
                print(f"✗ Error: {result.get('error')}")
        else:
            print("No products available for filtering test")
    except Exception as e:
        print(f"✗ Exception: {str(e)}")
        import traceback
        traceback.print_exc()

    print("\n" + "=" * 80)
    print("TESTS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    test_all()
