"""
Investigate ZenHub project creation methods
"""

import frappe
import requests


def investigate_project_creation():
    """Main investigation function"""

    print("\n" + "=" * 80)
    print("ZENHUB PROJECT CREATION INVESTIGATION")
    print("=" * 80)

    from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

    workspace_id = "69689c5e178ca200239ed6cb"  # Afyangu Web
    project_name = "PROJ-0001"

    # Step 1: Query workspace structure
    print(f"\n[1/5] QUERYING WORKSPACE STRUCTURE")
    print(f"      Workspace ID: {workspace_id}")
    print("=" * 80)

    try:
        token = get_zenhub_token()
        url = "https://api.zenhub.com/public/graphql"
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        query = """
        query GetWorkspace($id: ID!) {
          workspace(id: $id) {
            id
            name
            projects {
              id
              name
              key
            }
            repositories {
              id
              name
              githubId
            }
          }
        }
        """

        payload = {
            "query": query,
            "variables": {"id": workspace_id}
        }

        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ GraphQL Error: {data['errors']}")
        else:
            workspace = data.get('data', {}).get('workspace')
            if workspace:
                print(f"✅ Workspace found: {workspace.get('name')}")
                projects = workspace.get('projects', [])
                print(f"\n   Existing Projects ({len(projects)}):")
                for project in projects:
                    print(f"   - {project.get('name')} (key: {project.get('key')}, id: {project.get('id')})")

                repos = workspace.get('repositories', [])
                print(f"\n   Linked Repositories ({len(repos)}):")
                for repo in repos:
                    print(f"   - {repo.get('name')} (GitHub ID: {repo.get('githubId')})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 2: Check PROJ-0001 in Frappe
    print(f"\n[2/5] CHECKING FRAPPE PROJECT: {project_name}")
    print("=" * 80)

    try:
        project = frappe.get_doc("Project", project_name)
        print(f"✅ Project found: {project.project_name}")
        print(f"   Status: {project.status}")
        print(f"   Software Product: {project.get('custom_software_product')}")
        print(f"   Workspace ID: {project.get('custom_zenhub_workspace_id')}")
        print(f"   ZenHub Project ID: {project.get('custom_zenhub_project_id')}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 3: Introspect mutations
    print(f"\n[3/5] INTROSPECTING ZENHUB MUTATIONS")
    print("=" * 80)

    try:
        query = """
        query {
          __schema {
            mutationType {
              fields {
                name
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Introspection Error: {data['errors']}")
        else:
            mutations = data.get('data', {}).get('__schema', {}).get('mutationType', {}).get('fields', [])
            mutation_names = sorted([m.get('name') for m in mutations])

            print(f"✅ Found {len(mutation_names)} mutations:")

            # Filter for project-related
            project_mutations = [m for m in mutation_names if 'project' in m.lower()]
            print(f"\n   Project-Related Mutations ({len(project_mutations)}):")
            for m in project_mutations:
                print(f"   - {m}")

            if not project_mutations:
                print("   (None found)")

            # Look for repo-related mutations
            repo_mutations = [m for m in mutation_names if 'repo' in m.lower()]
            print(f"\n   Repository-Related Mutations ({len(repo_mutations)}):")
            for m in repo_mutations:
                print(f"   - {m}")

            # Show all mutations for reference
            print(f"\n   All Available Mutations (first 30):")
            for m in mutation_names[:30]:
                print(f"   - {m}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 4: Test mutation attempts
    print(f"\n[4/5] TESTING POTENTIAL MUTATIONS")
    print("=" * 80)

    mutations_to_test = [
        "createProject",
        "addProject",
        "createRepositoryProject",
        "createProjectInWorkspace",
    ]

    for mutation_name in mutations_to_test:
        print(f"\n   Testing: {mutation_name}")
        try:
            query = f"""
            mutation {{
              {mutation_name}(input: {{name: "TestProject", workspaceId: "{workspace_id}"}}) {{
                project {{
                  id
                  name
                }}
              }}
            }}
            """

            payload = {"query": query}
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json()

            if "errors" in data:
                error_msg = str(data['errors'])
                # Check what kind of error
                if "doesn't exist on type 'Mutation'" in error_msg:
                    print(f"   ❌ Mutation doesn't exist")
                elif "isn't a defined input type" in error_msg:
                    print(f"   ❌ Input type not defined")
                else:
                    print(f"   ❌ Error: {error_msg[:100]}")
            else:
                result = data.get('data', {})
                if result.get(mutation_name):
                    print(f"   ✅ SUCCESS!")
                else:
                    print(f"   ⚠️  No error but no result")

        except Exception as e:
            print(f"   ❌ Exception: {str(e)[:80]}")

    # Step 5: Query workspace with more fields
    print(f"\n[5/5] QUERYING WORKSPACE WITH EXTENDED FIELDS")
    print("=" * 80)

    try:
        # Try to get more details about a project
        query = """
        query GetWorkspace($id: ID!) {
          workspace(id: $id) {
            id
            name
            projects {
              id
              name
              key
              description
              repositories {
                id
                name
                githubId
              }
            }
          }
        }
        """

        payload = {
            "query": query,
            "variables": {"id": workspace_id}
        }

        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors']}")
        else:
            workspace = data.get('data', {}).get('workspace')
            if workspace and workspace.get('projects'):
                print(f"✅ Projects with extended details:")
                for project in workspace.get('projects', [])[:3]:
                    print(f"\n   Project: {project.get('name')}")
                    print(f"   - Key: {project.get('key')}")
                    print(f"   - ID: {project.get('id')}")
                    print(f"   - Linked Repositories: {len(project.get('repositories', []))}")
                    for repo in project.get('repositories', []):
                        print(f"     * {repo.get('name')} (GitHub: {repo.get('githubId')})")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print("\n" + "=" * 80)
    print("INVESTIGATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    investigate_project_creation()
