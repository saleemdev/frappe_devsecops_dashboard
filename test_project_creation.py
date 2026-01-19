import json
import frappe

# Ensure we're in the right context
frappe.init("desk.kns.co.ke")
frappe.connect()

from frappe_devsecops_dashboard.api.zenhub_workspace_setup import (
    get_zenhub_token,
    create_zenhub_project_for_frappe_project
)

print("\n" + "="*80)
print("Testing ZenHub Project Creation")
print("="*80)

try:
    # Get token
    token = get_zenhub_token()
    print(f"✅ ZenHub token retrieved successfully")

    # Test workspace ID (from user request)
    workspace_id = "6968e615178ca200239ed6cc"

    # Test project - use a simple name
    test_project = "Test Project"

    print(f"\n[1/3] Creating test project in workspace:")
    print(f"      Workspace ID: {workspace_id}")
    print(f"      Project name: {test_project}")

    # First, let's just test the API call directly
    print(f"\n[2/3] Calling ZenHub GraphQL API...")

    from frappe_devsecops_dashboard.api.zenhub_workspace_setup import create_project_graphql

    result = create_project_graphql(
        token=token,
        workspace_id=workspace_id,
        project_name=test_project,
        project_key="TEST"
    )

    print(f"\n[3/3] Result:")
    print(json.dumps(result, indent=2))

    if result.get("success"):
        print(f"\n✅ SUCCESS! Project created")
        print(f"   Project ID: {result.get('project_id')}")
        print(f"   Project Name: {result.get('name')}")
        print(f"   Project Key: {result.get('key')}")
    else:
        print(f"\n❌ FAILED! Error: {result.get('error')}")

except Exception as e:
    print(f"\n❌ Exception occurred: {str(e)}")
    import traceback
    traceback.print_exc()

finally:
    frappe.close()
