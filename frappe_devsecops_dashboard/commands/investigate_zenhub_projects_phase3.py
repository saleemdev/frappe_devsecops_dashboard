"""
Phase 3 Investigation - Understanding Roadmaps and Project Creation
"""

import frappe
import requests
import json


def investigate_phase3():
    """Third phase - dig into roadmaps and project creation"""

    print("\n" + "=" * 80)
    print("ZENHUB PROJECT CREATION - PHASE 3 INVESTIGATION")
    print("Hypothesis: Projects must be created on Roadmaps")
    print("=" * 80)

    from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

    workspace_id = "69689c5e178ca200239ed6cb"
    token = get_zenhub_token()
    url = "https://api.zenhub.com/public/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 1: Get all available fields on Workspace
    print(f"\n[1/4] INTROSPECTING WORKSPACE TYPE")
    print("=" * 80)

    try:
        query = """
        query {
          __type(name: "Workspace") {
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors']}")
        else:
            fields = data.get('data', {}).get('__type', {}).get('fields', [])
            field_names = sorted([f.get('name') for f in fields])

            print(f"✅ Workspace type has {len(field_names)} fields:")
            print(f"   {', '.join(field_names[:15])}")

            # Look for anything related to projects
            project_fields = [f for f in field_names if 'project' in f.lower() or 'roadmap' in f.lower()]
            print(f"\n   Project/Roadmap related fields:")
            for field in project_fields:
                print(f"   - {field}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 2: Get all available fields on Project
    print(f"\n[2/4] INTROSPECTING PROJECT TYPE")
    print("=" * 80)

    try:
        query = """
        query {
          __type(name: "Project") {
            fields {
              name
              type {
                name
                kind
              }
            }
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors']}")
        else:
            fields = data.get('data', {}).get('__type', {}).get('fields', [])
            field_names = sorted([f.get('name') for f in fields])

            print(f"✅ Project type has {len(field_names)} fields:")
            print(f"   {', '.join(field_names)}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 3: Check if createPipeline could be used instead
    print(f"\n[3/4] INVESTIGATING createPipeline MUTATION")
    print("=" * 80)

    try:
        query = """
        query {
          __type(name: "CreatePipelineInput") {
            inputFields {
              name
              type {
                name
                kind
                ofType {
                  name
                  kind
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
            print(f"❌ Error: {data['errors']}")
        else:
            input_type = data.get('data', {}).get('__type')
            if input_type:
                fields = input_type.get('inputFields', [])
                print(f"✅ CreatePipelineInput has {len(fields)} fields:")
                for field in fields:
                    print(f"   - {field.get('name')}")
            else:
                print(f"⚠️  CreatePipelineInput not found")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 4: Query actual workspace details differently
    print(f"\n[4/4] QUERYING WORKSPACE WITH DIFFERENT APPROACH")
    print("=" * 80)

    try:
        # Try simpler query
        query = """
        query {
          workspace(id: "69689c5e178ca200239ed6cb") {
            id
            name
          }
        }
        """

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        if "errors" in data:
            print(f"❌ Error: {data['errors']}")
        else:
            workspace = data.get('data', {}).get('workspace')
            print(f"✅ Workspace found: {workspace.get('name')}")

            # Now let's iterate over available fields
            print(f"\n   Testing field queries individually:")

            test_fields = ['projects', 'pipelines', 'roadmaps', 'epics', 'releases', 'issues']

            for field in test_fields:
                query = f"""
                query {{
                  workspace(id: "69689c5e178ca200239ed6cb") {{
                    {field} {{
                      __typename
                    }}
                  }}
                }}
                """

                payload = {"query": query}
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                data = response.json()

                if "errors" not in data and data.get('data', {}).get('workspace', {}).get(field):
                    print(f"   ✅ {field} - EXISTS")
                else:
                    print(f"   ❌ {field} - does not exist")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print("\n" + "=" * 80)
    print("PHASE 3 INVESTIGATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    investigate_phase3()
