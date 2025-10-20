"""
Direct Zenhub GraphQL API test
"""

import frappe
from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token, ZENHUB_GRAPHQL_ENDPOINT
import requests


@frappe.whitelist()
def test_zenhub_api():
    """Test Zenhub GraphQL API directly to see actual response"""

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
    print(f"Testing Zenhub API")
    print(f"{'='*80}")
    print(f"Project: {project.name} - {project.project_name}")
    print(f"Workspace ID: {workspace_id}")

    # Get token
    token = get_zenhub_token()
    print(f"Token: {token[:25]}...")

    # Test Query 1: Simple workspace info
    query1 = """
    query TestWorkspace($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
      }
    }
    """

    print(f"\n{'='*80}")
    print("Test 1: Basic workspace info")
    print(f"{'='*80}")

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload1 = {
        "query": query1,
        "variables": {"workspaceId": workspace_id}
    }

    try:
        response1 = requests.post(ZENHUB_GRAPHQL_ENDPOINT, headers=headers, json=payload1, timeout=30)
        print(f"Status: {response1.status_code}")
        data1 = response1.json()
        print(f"Response: {frappe.as_json(data1, indent=2)}")

        if "errors" in data1:
            print(f"\n❌ GraphQL Errors: {data1['errors']}")
            return {"error": "GraphQL errors in workspace query", "details": data1['errors']}

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": str(e)}

    # Test Query 2: Workspace with issues count
    query2 = """
    query TestWorkspaceIssues($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        issues(first: 5) {
          totalCount
          nodes {
            id
            title
          }
        }
      }
    }
    """

    print(f"\n{'='*80}")
    print("Test 2: Workspace with issues (first 5)")
    print(f"{'='*80}")

    payload2 = {
        "query": query2,
        "variables": {"workspaceId": workspace_id}
    }

    try:
        response2 = requests.post(ZENHUB_GRAPHQL_ENDPOINT, headers=headers, json=payload2, timeout=30)
        print(f"Status: {response2.status_code}")
        data2 = response2.json()
        print(f"Response: {frappe.as_json(data2, indent=2)}")

        if "errors" in data2:
            print(f"\n❌ GraphQL Errors: {data2['errors']}")
            return {"error": "GraphQL errors in issues query", "details": data2['errors']}

        workspace = data2.get("data", {}).get("workspace", {})
        issues_data = workspace.get("issues", {})
        total_count = issues_data.get("totalCount", 0)
        nodes = issues_data.get("nodes", [])

        print(f"\n✅ Total issues in workspace: {total_count}")
        print(f"✅ Issues returned: {len(nodes)}")

        if nodes:
            print(f"\nSample issue:")
            print(f"  ID: {nodes[0].get('id')}")
            print(f"  Title: {nodes[0].get('title')}")

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": str(e)}

    # Test Query 3: Full query with all fields
    query3 = """
    query TestFullIssueFields($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        issues(first: 3) {
          totalCount
          nodes {
            id
            title
            state
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
    }
    """

    print(f"\n{'='*80}")
    print("Test 3: Full query with assignees, epic, etc (first 3)")
    print(f"{'='*80}")

    payload3 = {
        "query": query3,
        "variables": {"workspaceId": workspace_id}
    }

    try:
        response3 = requests.post(ZENHUB_GRAPHQL_ENDPOINT, headers=headers, json=payload3, timeout=30)
        print(f"Status: {response3.status_code}")
        data3 = response3.json()
        print(f"Response: {frappe.as_json(data3, indent=2)}")

        if "errors" in data3:
            print(f"\n❌ GraphQL Errors: {data3['errors']}")
            # Try to extract error messages
            for error in data3['errors']:
                print(f"  - {error.get('message', 'Unknown error')}")
                if 'path' in error:
                    print(f"    Path: {error['path']}")
            return {"error": "GraphQL errors in full query", "details": data3['errors']}

        workspace = data3.get("data", {}).get("workspace", {})
        issues_data = workspace.get("issues", {})
        nodes = issues_data.get("nodes", [])

        if nodes:
            print(f"\n✅ Successfully fetched {len(nodes)} issues with full fields")
            for i, issue in enumerate(nodes):
                print(f"\nIssue {i+1}:")
                print(f"  Title: {issue.get('title')}")
                print(f"  State: {issue.get('state')}")
                print(f"  Story Points: {issue.get('estimate', {}).get('value', 0)}")
                assignees = issue.get('assignees', {}).get('nodes', [])
                print(f"  Assignees: {len(assignees)}")
                if assignees:
                    for a in assignees:
                        print(f"    - {a.get('login')} ({a.get('name')})")
                epic = issue.get('epic', {})
                if epic:
                    epic_issue = epic.get('issue', {})
                    print(f"  Epic: {epic_issue.get('title')}")
        else:
            print(f"\n⚠️  Query succeeded but returned 0 issues")

        return {
            "success": True,
            "workspace_id": workspace_id,
            "total_issues": total_count if 'total_count' in locals() else 0,
            "sample_issues": nodes
        }

    except Exception as e:
        print(f"❌ Error: {e}")
        return {"error": str(e)}

    print(f"\n{'='*80}")
    print("Test Complete")
    print(f"{'='*80}\n")
