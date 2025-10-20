"""
Test specific Zenhub issue to understand why it shows no information
"""

import frappe
from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token, ZENHUB_GRAPHQL_ENDPOINT
import requests


@frappe.whitelist()
def test_specific_issue(issue_number):
    """Test a specific Zenhub issue by number"""

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
    print(f"Testing Zenhub Issue #{issue_number}")
    print(f"{'='*80}")
    print(f"Workspace ID: {workspace_id}")

    # Get token
    token = get_zenhub_token()

    # Query to search for issue by number
    query = """
    query SearchIssue($workspaceId: ID!, $issueNumber: Int!) {
      workspace(id: $workspaceId) {
        id
        name
        issueByInfo(repositoryGhId: 0, issueNumber: $issueNumber) {
          id
          title
          state
          htmlUrl
          estimate { value }
          assignees {
            nodes {
              id
              login
              name
            }
          }
          epic {
            issue {
              id
              title
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
        "variables": {
            "workspaceId": workspace_id,
            "issueNumber": int(issue_number)
        }
    }

    try:
        response = requests.post(ZENHUB_GRAPHQL_ENDPOINT, headers=headers, json=payload, timeout=30)
        print(f"Status: {response.status_code}")
        data = response.json()
        print(f"Response: {frappe.as_json(data, indent=2)}")

        if "errors" in data:
            print(f"\n❌ GraphQL Errors: {data['errors']}")

            # Try alternative: search through all issues
            print(f"\n{'='*80}")
            print("Trying alternative: Search all issues")
            print(f"{'='*80}")

            alt_query = """
            query GetAllIssues($workspaceId: ID!) {
              workspace(id: $workspaceId) {
                id
                name
                issues(first: 100) {
                  nodes {
                    id
                    title
                    htmlUrl
                    state
                    estimate { value }
                  }
                }
              }
            }
            """

            alt_payload = {
                "query": alt_query,
                "variables": {"workspaceId": workspace_id}
            }

            alt_response = requests.post(ZENHUB_GRAPHQL_ENDPOINT, headers=headers, json=alt_payload, timeout=30)
            alt_data = alt_response.json()

            # Search for issue with number in URL
            issues = alt_data.get("data", {}).get("workspace", {}).get("issues", {}).get("nodes", [])

            print(f"\nSearching {len(issues)} issues for #{issue_number}...")

            for issue in issues:
                url = issue.get("htmlUrl", "")
                if f"/{issue_number}" in url or url.endswith(f"/{issue_number}"):
                    print(f"\n✅ Found issue:")
                    print(f"  ID: {issue.get('id')}")
                    print(f"  Title: {issue.get('title')}")
                    print(f"  URL: {url}")
                    print(f"  State: {issue.get('state')}")
                    print(f"  Story Points: {issue.get('estimate', {}).get('value', 0)}")
                    return {"success": True, "issue": issue}

            print(f"\n❌ Issue #{issue_number} not found in workspace")
            return {"error": f"Issue #{issue_number} not found"}

        return {"success": True, "data": data}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": str(e)}

    print(f"\n{'='*80}\n")
