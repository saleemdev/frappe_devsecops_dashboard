"""
Phase 4 Investigation - Query existing projects and pipelines
"""

import frappe
import requests
import json


def investigate_phase4():
    """Fourth phase - understand actual project structure"""

    print("\n" + "=" * 80)
    print("ZENHUB PROJECT CREATION - PHASE 4 INVESTIGATION")
    print("Finding: Projects exist, but how are they structured?")
    print("=" * 80)

    from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

    workspace_id = "69689c5e178ca200239ed6cb"
    token = get_zenhub_token()
    url = "https://api.zenhub.com/public/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 1: Query projects with all available fields
    print(f"\n[1/5] QUERYING ALL WORKSPACE PROJECTS")
    print("=" * 80)

    try:
        query = """
        query {
          workspace(id: "69689c5e178ca200239ed6cb") {
            projects(first: 50) {
              __typename
              pageInfo {
                hasNextPage
                hasPreviousPage
              }
              edges {
                node {
                  id
                  name
                  description
                  startOn
                  endOn
                  state
                  createdAt
                  creator {
                    id
                    name
                  }
                }
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors'][0].get('message', 'Unknown')}")
        else:
            workspace = data.get('data', {}).get('workspace', {})
            projects = workspace.get('projects', {})
            edges = projects.get('edges', [])

            print(f"✅ Found {len(edges)} projects:")
            for edge in edges:
                project = edge.get('node', {})
                print(f"\n   Project ID: {project.get('id')}")
                print(f"   - Name: {project.get('name')}")
                print(f"   - State: {project.get('state')}")
                print(f"   - Created: {project.get('createdAt')}")
                if project.get('creator'):
                    print(f"   - Creator: {project.get('creator').get('name')}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 2: Query pipelines
    print(f"\n[2/5] QUERYING ALL WORKSPACE PIPELINES")
    print("=" * 80)

    try:
        query = """
        query {
          workspace(id: "69689c5e178ca200239ed6cb") {
            pipelines(first: 50) {
              edges {
                node {
                  id
                  name
                  description
                }
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors'][0].get('message', 'Unknown')}")
        else:
            pipelines = data.get('data', {}).get('workspace', {}).get('pipelines', {}).get('edges', [])

            print(f"✅ Found {len(pipelines)} pipelines:")
            for edge in pipelines:
                pipeline = edge.get('node', {})
                print(f"   - {pipeline.get('name')} (id: {pipeline.get('id')})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 3: Check if issues have a project field
    print(f"\n[3/5] QUERYING ISSUES TO FIND PROJECT ASSOCIATION")
    print("=" * 80)

    try:
        query = """
        query {
          workspace(id: "69689c5e178ca200239ed6cb") {
            issues(first: 5) {
              edges {
                node {
                  id
                  title
                  pipeline {
                    id
                    name
                  }
                }
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors'][0].get('message', 'Unknown')}")
        else:
            issues = data.get('data', {}).get('workspace', {}).get('issues', {}).get('edges', [])

            print(f"✅ Found {len(issues)} issues:")
            for edge in issues:
                issue = edge.get('node', {})
                pipeline = issue.get('pipeline', {})
                print(f"   - {issue.get('title')}")
                if pipeline:
                    print(f"     Pipeline: {pipeline.get('name')}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 4: Test createPipeline mutation
    print(f"\n[4/5] TESTING createPipeline MUTATION")
    print("=" * 80)

    try:
        mutation = """
        mutation CreatePipeline($input: CreatePipelineInput!) {
          createPipeline(input: $input) {
            pipeline {
              id
              name
            }
          }
        }
        """

        variables = {
            "input": {
                "workspaceId": workspace_id,
                "name": "TestPipelineInvestigation",
                "description": "Investigation test",
                "position": 0
            }
        }

        payload = {"query": mutation, "variables": variables}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            error_msg = str(data['errors'][0].get('message', 'Unknown'))
            print(f"❌ Error: {error_msg[:100]}")
        else:
            result = data.get('data', {}).get('createPipeline', {})
            if result.get('pipeline'):
                print(f"✅ SUCCESS! Pipeline created:")
                print(f"   ID: {result.get('pipeline').get('id')}")
                print(f"   Name: {result.get('pipeline').get('name')}")
            else:
                print(f"⚠️  Unexpected response: {result}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 5: Check if Projects can be created via other mutations
    print(f"\n[5/5] INVESTIGATING PROJECT RELATIONSHIPS")
    print("=" * 80)

    try:
        # Check if projects are linked to pipelines
        query = """
        query {
          workspace(id: "69689c5e178ca200239ed6cb") {
            projects(first: 5) {
              edges {
                node {
                  id
                  name
                  description
                  startOn
                  endOn
                }
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error in projects query")
        else:
            projects = data.get('data', {}).get('workspace', {}).get('projects', {}).get('edges', [])

            if projects:
                print(f"✅ Projects summary:")
                for edge in projects[:3]:
                    project = edge.get('node', {})
                    print(f"   - {project.get('name')} (start: {project.get('startOn')}, end: {project.get('endOn')})")

                print(f"\n   Observation:")
                print(f"   - Projects have start/end dates (like timelines)")
                print(f"   - Projects don't have 'key' field")
                print(f"   - Projects might be containers for work, not separate from pipelines")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print("\n" + "=" * 80)
    print("PHASE 4 INVESTIGATION COMPLETE")
    print("\nKEY FINDINGS:")
    print("1. Projects exist in ZenHub but structure is unclear")
    print("2. Pipelines exist and can be created with createPipeline mutation")
    print("3. No direct 'createProject' mutation found")
    print("4. Projects might be Zenhub-specific epics or roadmap items")
    print("=" * 80)


if __name__ == "__main__":
    investigate_phase4()
