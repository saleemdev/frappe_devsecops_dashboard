#!/usr/bin/env python3
"""
Regression test script for existing API endpoints
Run this from frappe-bench directory with:
bench --site desk.kns.co.ke execute frappe_devsecops_dashboard.test_regression.test_all
"""

import frappe


def test_all():
    """Run all regression tests"""

    print("=" * 80)
    print("REGRESSION TESTS - Verify No Breaking Changes")
    print("=" * 80)

    # Test 1: Dashboard API
    print("\n[TEST 1] Dashboard API")
    print("-" * 80)
    try:
        from frappe_devsecops_dashboard.api.dashboard import get_dashboard_metrics
        result = get_dashboard_metrics()
        print(f"✓ Dashboard API Success: {result.get('success', False)}")
    except Exception as e:
        print(f"✗ Dashboard API Exception: {str(e)}")

    # Test 2: Change Requests API
    print("\n[TEST 2] Change Requests API")
    print("-" * 80)
    try:
        change_requests = frappe.get_all(
            'Change Request',
            fields=['name', 'title', 'approval_status'],
            limit=1
        )
        print(f"✓ Change Requests API Success: Found {len(change_requests)} records")
    except Exception as e:
        print(f"✗ Change Requests API Exception: {str(e)}")

    # Test 3: Projects API
    print("\n[TEST 3] Projects API")
    print("-" * 80)
    try:
        projects = frappe.get_all(
            'Project',
            fields=['name', 'project_name', 'status'],
            limit=1
        )
        print(f"✓ Projects API Success: Found {len(projects)} records")
    except Exception as e:
        print(f"✗ Projects API Exception: {str(e)}")

    # Test 4: Incidents API
    print("\n[TEST 4] Incidents API")
    print("-" * 80)
    try:
        incidents = frappe.get_all(
            'Devsecops Dashboard Incident',
            fields=['name', 'title', 'status'],
            limit=1
        )
        print(f"✓ Incidents API Success: Found {len(incidents)} records")
    except Exception as e:
        print(f"✗ Incidents API Exception: {str(e)}")

    # Test 5: Risk Register API
    print("\n[TEST 5] Risk Register API")
    print("-" * 80)
    try:
        risk_registers = frappe.get_all(
            'Risk Register',
            fields=['name', 'project', 'risk_register_status'],
            limit=1
        )
        print(f"✓ Risk Register API Success: Found {len(risk_registers)} records")
    except Exception as e:
        print(f"✗ Risk Register API Exception: {str(e)}")

    # Test 6: Product KPI API (New Feature)
    print("\n[TEST 6] Product KPI API (New Feature)")
    print("-" * 80)
    try:
        from frappe_devsecops_dashboard.api.product_kpi import get_product_kpi_data, get_software_products_for_filter

        products_result = get_software_products_for_filter()
        print(f"✓ Get Software Products Success: {products_result.get('success')}")

        kpi_result = get_product_kpi_data()
        print(f"✓ Get Product KPI Data Success: {kpi_result.get('success')}")
        if kpi_result.get('success'):
            print(f"  - Projects: {len(kpi_result['data']['projects'])}")
            print(f"  - Metrics: {kpi_result['data']['metrics']}")
    except Exception as e:
        print(f"✗ Product KPI API Exception: {str(e)}")

    print("\n" + "=" * 80)
    print("REGRESSION TESTS COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    test_all()
