"""
Phase 2 Investigation - Understanding ProjectConnection and Roadmaps
"""

import frappe
import requests


def investigate_phase2():
    """Second phase of investigation"""

    print("\n" + "=" * 80)
    print("ZENHUB PROJECT CREATION - PHASE 2 INVESTIGATION")
    print("=" * 80)

    from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

    workspace_id = "69689c5e178ca200239ed6cb"
    token = get_zenhub_token()
    url = "https://api.zenhub.com/public/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 1: Query ProjectConnection properly
    print(f"\n[1/6] QUERYING WORKSPACE PROJECTS (using ProjectConnection)")
    print("=" * 80)

    try:
        query = """
        query GetWorkspace($id: ID!) {
          workspace(id: $id) {
            id
            name
            projects {
              edges {
                node {
                  id
                  name
                  key
                }
              }
            }
          }
        }
        """

        payload = {"query": query, "variables": {"id": workspace_id}}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors'][0].get('message', 'Unknown')}")
        else:
            workspace = data.get('data', {}).get('workspace')
            if workspace:
                print(f"✅ Workspace: {workspace.get('name')}")
                projects = workspace.get('projects', {}).get('edges', [])
                print(f"   Projects found: {len(projects)}")
                for edge in projects:
                    project = edge.get('node', {})
                    print(f"   - {project.get('name')} (key: {project.get('key')}, id: {project.get('id')})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 2: Check for roadmaps
    print(f"\n[2/6] QUERYING WORKSPACE ROADMAPS")
    print("=" * 80)

    try:
        query = """
        query GetWorkspace($id: ID!) {
          workspace(id: $id) {
            id
            name
            roadmaps {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
        """

        payload = {"query": query, "variables": {"id": workspace_id}}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors'][0].get('message', 'Unknown')}")
        else:
            workspace = data.get('data', {}).get('workspace')
            if workspace:
                roadmaps = workspace.get('roadmaps', {}).get('edges', [])
                print(f"✅ Roadmaps found: {len(roadmaps)}")
                for edge in roadmaps:
                    roadmap = edge.get('node', {})
                    print(f"   - {roadmap.get('name')} (id: {roadmap.get('id')})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 3: Test createProjectOnRoadmap
    print(f"\n[3/6] TESTING createProjectOnRoadmap MUTATION")
    print("=" * 80)

    try:
        # First, get a roadmap ID if it exists
        query = """
        query GetRoadmaps($id: ID!) {
          workspace(id: $id) {
            roadmaps {
              edges {
                node {
                  id
                  name
                }
              }
            }
          }
        }
        """

        payload = {"query": query, "variables": {"id": workspace_id}}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        roadmaps = data.get('data', {}).get('workspace', {}).get('roadmaps', {}).get('edges', [])

        if roadmaps:
            roadmap_id = roadmaps[0].get('node', {}).get('id')
            print(f"   Using roadmap: {roadmap_id}")

            # Now try createProjectOnRoadmap
            mutation = """
            mutation CreateProject($input: CreateProjectOnRoadmapInput!) {
              createProjectOnRoadmap(input: $input) {
                project {
                  id
                  name
                  key
                }
              }
            }
            """

            variables = {
                "input": {
                    "name": "TestInvestigation",
                    "key": "TINV",
                    "roadmapId": roadmap_id
                }
            }

            payload = {"query": mutation, "variables": variables}
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json()

            if "errors" in data:
                print(f"   ❌ Error: {data['errors'][0].get('message', 'Unknown')}")
            else:
                result = data.get('data', {}).get('createProjectOnRoadmap', {})
                if result.get('project'):
                    print(f"   ✅ SUCCESS! Project created on roadmap")
                    print(f"      {result}")
                else:
                    print(f"   ⚠️  No error but unexpected response: {result}")

        else:
            print(f"   ⚠️  No roadmaps found in workspace - cannot test createProjectOnRoadmap")

    except Exception as e:
        print(f"   ❌ Error: {str(e)}")

    # Step 4: Check if projects are associated with repositories
    print(f"\n[4/6] CHECKING PROJECT-REPOSITORY RELATIONSHIP")
    print("=" * 80)

    try:
        query = """
        query GetWorkspace($id: ID!) {
          workspace(id: $id) {
            repositories {
              id
              name
              projects {
                edges {
                  node {
                    id
                    name
                    key
                  }
                }
              }
            }
          }
        }
        """

        payload = {"query": query, "variables": {"id": workspace_id}}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors'][0].get('message', 'Unknown')[:100]}")
        else:
            repos = data.get('data', {}).get('workspace', {}).get('repositories', [])
            print(f"✅ Repositories found: {len(repos)}")
            for repo in repos:
                projects = repo.get('projects', {}).get('edges', [])
                print(f"   Repository: {repo.get('name')}")
                print(f"   - Projects: {len(projects)}")
                for edge in projects:
                    project = edge.get('node', {})
                    print(f"     * {project.get('name')} (key: {project.get('key')})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 5: Look for epics and issues to understand project structure
    print(f"\n[5/6] QUERYING WORKSPACE ISSUES/EPICS")
    print("=" * 80)

    try:
        query = """
        query GetWorkspace($id: ID!) {
          workspace(id: $id) {
            issues(first: 5) {
              edges {
                node {
                  id
                  title
                  project {
                    id
                    name
                    key
                  }
                }
              }
            }
          }
        }
        """

        payload = {"query": query, "variables": {"id": workspace_id}}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors'][0].get('message', 'Unknown')[:100]}")
        else:
            issues = data.get('data', {}).get('workspace', {}).get('issues', {}).get('edges', [])
            print(f"✅ Issues found: {len(issues)}")
            for edge in issues:
                issue = edge.get('node', {})
                project = issue.get('project', {})
                print(f"   Issue: {issue.get('title')}")
                print(f"   - Project: {project.get('name')} (key: {project.get('key')})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 6: List ALL mutations to find anything related to creating
    print(f"\n[6/6] SEARCHING ALL MUTATIONS FOR 'CREATE' PATTERNS")
    print("=" * 80)

    try:
        query = """
        query {
          __schema {
            mutationType {
              fields {
                name
                description
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        mutations = data.get('data', {}).get('__schema', {}).get('mutationType', {}).get('fields', [])
        create_mutations = [m for m in mutations if 'create' in m.get('name', '').lower()]

        print(f"✅ Found {len(create_mutations)} mutations with 'create' in name:")
        for m in create_mutations:
            print(f"   - {m.get('name')}")
            if m.get('description'):
                print(f"     {m.get('description')[:80]}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print("\n" + "=" * 80)
    print("PHASE 2 INVESTIGATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    investigate_phase2()
