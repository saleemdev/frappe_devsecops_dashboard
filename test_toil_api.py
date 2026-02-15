"""
TOIL API Test Script
Run with: bench execute frappe_devsecops_dashboard.test_toil_api.test_all_endpoints
"""

import frappe
from frappe import _


def test_all_endpoints():
    """Test all TOIL API endpoints are accessible and properly whitelisted"""

    print("\n" + "="*70)
    print("TOIL API ENDPOINTS TEST")
    print("="*70 + "\n")

    endpoints = [
        # Validation API
        ("validation_api", "validate_employee_setup"),

        # Timesheet API
        ("timesheet_api", "get_my_timesheets"),
        ("timesheet_api", "get_timesheets_to_approve"),
        ("timesheet_api", "create_timesheet"),
        ("timesheet_api", "submit_timesheet_for_approval"),

        # Leave API
        ("leave_api", "get_my_leave_applications"),
        ("leave_api", "create_leave_application"),
        ("leave_api", "submit_leave_for_approval"),

        # Balance API
        ("balance_api", "get_toil_balance_for_leave"),
        ("balance_api", "get_balance_summary"),
    ]

    results = {"success": 0, "failed": 0}

    for module_name, endpoint_name in endpoints:
        try:
            # Import the module
            module = __import__(
                f"frappe_devsecops_dashboard.api.toil.{module_name}",
                fromlist=[endpoint_name]
            )

            # Check if endpoint exists
            if hasattr(module, endpoint_name):
                func = getattr(module, endpoint_name)

                # Check if it's whitelisted
                is_whitelisted = getattr(func, "__wrapped__", None) or hasattr(func, "whitelisted")

                status = "✓" if is_whitelisted else "⚠"
                results["success"] += 1

                print(f"{status} {module_name}.{endpoint_name}")

                if not is_whitelisted:
                    print(f"  WARNING: Endpoint may not be @frappe.whitelist() decorated")
            else:
                print(f"✗ {module_name}.{endpoint_name} - NOT FOUND")
                results["failed"] += 1

        except Exception as e:
            print(f"✗ {module_name}.{endpoint_name} - ERROR: {str(e)}")
            results["failed"] += 1

    print("\n" + "-"*70)
    print(f"Results: {results['success']} success, {results['failed']} failed")
    print("-"*70 + "\n")

    # Test response format
    print("Testing Response Format...")
    print("-"*70)

    try:
        from frappe_devsecops_dashboard.api.toil.validation_api import validate_employee_setup

        # This should return a standardized response
        result = validate_employee_setup()

        # Check response structure
        if isinstance(result, dict):
            has_success = "success" in result
            has_data_or_error = "data" in result or "error" in result

            if has_success and has_data_or_error:
                print("✓ Response format is standardized")
                print(f"  Structure: {list(result.keys())}")
            else:
                print("⚠ Response format may not follow standard")
                print(f"  Structure: {list(result.keys())}")
        else:
            print(f"✗ Response is not a dictionary: {type(result)}")

    except Exception as e:
        print(f"✗ Could not test response format: {str(e)}")

    print("-"*70 + "\n")

    return results


def test_validation_api():
    """Test validation API endpoint"""
    print("\n" + "="*70)
    print("TESTING VALIDATION API")
    print("="*70 + "\n")

    try:
        from frappe_devsecops_dashboard.api.toil.validation_api import validate_employee_setup

        print("Calling validate_employee_setup()...")
        result = validate_employee_setup()

        print(f"Success: {result.get('success')}")
        print(f"Valid: {result.get('valid')}")

        if result.get("valid"):
            print(f"Employee: {result.get('employee')}")
            print(f"Employee Name: {result.get('employee_name')}")
            print(f"Supervisor: {result.get('supervisor')}")
            print(f"Supervisor Name: {result.get('supervisor_name')}")
        else:
            print(f"Issues: {result.get('issues')}")

        return result

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


def test_balance_api():
    """Test balance API endpoint"""
    print("\n" + "="*70)
    print("TESTING BALANCE API")
    print("="*70 + "\n")

    try:
        from frappe_devsecops_dashboard.api.toil.balance_api import get_toil_balance_for_leave

        print("Calling get_toil_balance_for_leave()...")
        result = get_toil_balance_for_leave()

        if result.get("success"):
            data = result.get("data", {})
            print(f"Employee: {data.get('employee_name')}")
            print(f"Available Balance: {data.get('available_balance')} days")
            print(f"Total Accrued: {data.get('total_accrued')} days")
            print(f"Total Consumed: {data.get('total_consumed')} days")
            print(f"Expiring Soon: {data.get('expiring_soon')} days")

            if data.get('expiry_warning'):
                print(f"⚠ Warning: {data.get('expiry_warning')}")
        else:
            print(f"Error: {result.get('error', {}).get('message')}")

        return result

    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()
        return None


if __name__ == "__main__":
    # Run all tests
    test_all_endpoints()
    test_validation_api()
    test_balance_api()
