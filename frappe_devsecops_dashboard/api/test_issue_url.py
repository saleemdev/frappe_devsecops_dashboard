"""
Test why htmlUrl is empty for issue #4240
"""

import frappe
from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token, ZENHUB_GRAPHQL_ENDPOINT
import requests


@frappe.whitelist()
def test_issue_url():
    """Test htmlUrl field for issues"""

    # Get workspace ID from first project
    projects = frappe.get_all("Project",
        fields=["name", "project_name", "custom_zenhub_workspace_id"],
        filters={"custom_zenhub_workspace_id": ["!=", ""]},
        limit=1
    )

    if not projects:
        return {"error": "No projects with Zenhub workspace ID found"}

    project = projects[0]
    workspace_id = project.custom_zenhub_workspace_id

    print(f"\n{'='*80}")
    print(f"Testing htmlUrl field for issues")
    print(f"{'='*80}")

    # Get token
    token = get_zenhub_token()

    # Query first 3 issues with htmlUrl
    query = """
    query TestHtmlUrl($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        issues(first: 3) {
          nodes {
            id
            number
            title
            htmlUrl
            repository {
              name
            }
          }
        }
      }
    }
    """

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "query": query,
        "variables": {"workspaceId": workspace_id}
    }

    try:
        response = requests.post(ZENHUB_GRAPHQL_ENDPOINT, headers=headers, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        data = response.json()

        if "errors" in data:
            print(f"❌ GraphQL Errors: {data['errors']}")
            return {"error": data['errors']}

        issues = data.get("data", {}).get("workspace", {}).get("issues", {}).get("nodes", [])

        print(f"\n✅ Found {len(issues)} issues:")
        for issue in issues:
            print(f"\n  Issue #{issue.get('number')}:")
            print(f"    Title: {issue.get('title')}")
            print(f"    htmlUrl: '{issue.get('htmlUrl')}'")
            print(f"    Repository: {issue.get('repository', {}).get('name')}")

        return {"success": True, "issues": issues}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": str(e)}

    print(f"\n{'='*80}\n")
