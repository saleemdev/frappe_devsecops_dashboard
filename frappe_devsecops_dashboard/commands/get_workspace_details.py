"""
Get workspace organization and repository details
"""

import frappe
import requests


def get_workspace_details():
    """Get org and repo IDs needed for epic creation"""

    from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

    token = get_zenhub_token()
    url = "https://api.zenhub.com/public/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("\n" + "=" * 80)
    print("WORKSPACE ORGANIZATION AND REPOSITORY DETAILS")
    print("=" * 80)

    query = """
    query {
      workspace(id: "69689c5e178ca200239ed6cb") {
        id
        name
        zenhubOrganization {
          id
          name
        }
        repositories {
          id
          name
        }
      }
    }
    """

    payload = {"query": query}
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    data = response.json()

    if "errors" in data:
        print(f"Error: {data['errors']}")
    else:
        workspace = data.get('data', {}).get('workspace', {})
        print(f"\nWorkspace: {workspace.get('name')}")
        print(f"Workspace ID: {workspace.get('id')}")

        org = workspace.get('zenhubOrganization', {})
        if org:
            print(f"\nZenHub Organization:")
            print(f"  ID: {org.get('id')}")
            print(f"  Name: {org.get('name')}")

        repos = workspace.get('repositories', [])
        print(f"\nRepositories ({len(repos)}):")
        for repo in repos:
            print(f"\n  {repo.get('name')}")
            print(f"    ZenHub ID: {repo.get('id')}")

        # Now test creating an epic with these IDs
        if org and repos:
            org_id = org.get('id')
            repo_id = repos[0].get('id')  # Use first repo

            print(f"\n" + "=" * 80)
            print("TESTING EPIC CREATION WITH OBTAINED IDs")
            print("=" * 80)

            mutation = """
            mutation CreateEpic($input: CreateZenhubEpicInput!) {
              createZenhubEpic(input: $input) {
                zenhubEpic {
                  id
                  title
                  body
                }
              }
            }
            """

            variables = {
                "input": {
                    "zenhubOrganizationId": org_id,
                    "zenhubRepositoryId": repo_id,
                    "zenhubEpic": {
                        "title": "TestEpicFromInvestigation",
                        "body": "Created during ZenHub API investigation"
                    }
                }
            }

            payload = {"query": mutation, "variables": variables}
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json()

            if "errors" in data:
                error_msg = str(data['errors'][0].get('message', 'Unknown'))
                print(f"❌ Creation failed: {error_msg}")
            else:
                result = data.get('data', {}).get('createZenhubEpic', {})
                epic = result.get('zenhubEpic', {})
                if epic:
                    print(f"✅ SUCCESS! Epic created:")
                    print(f"   ID: {epic.get('id')}")
                    print(f"   Title: {epic.get('title')}")
                    print(f"\n🎉 EPIC CREATION WORKS!")
                    print(f"\nKey findings for implementation:")
                    print(f"  1. Organization ID needed: {org_id}")
                    print(f"  2. Repository ID needed: {repo_id}")
                    print(f"  3. Use createZenhubEpic mutation")
                    print(f"  4. Pass title and body in zenhubEpic input")
                else:
                    print(f"⚠️  Unexpected response: {result}")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    get_workspace_details()
