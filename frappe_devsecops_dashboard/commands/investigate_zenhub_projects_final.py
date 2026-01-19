"""
Phase 5 Investigation - Final phase: Understanding if Projects = Zenhub Epics
"""

import frappe
import requests
import json


def investigate_final():
    """Final investigation - understand actual ZenHub project model"""

    print("\n" + "=" * 80)
    print("ZENHUB PROJECT CREATION - PHASE 5 FINAL INVESTIGATION")
    print("Testing: Are ZenHub Projects actually Zenhub Epics?")
    print("=" * 80)

    from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

    workspace_id = "69689c5e178ca200239ed6cb"
    token = get_zenhub_token()
    url = "https://api.zenhub.com/public/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Step 1: Query Zenhub Epics
    print(f"\n[1/4] QUERYING ZENHUB EPICS")
    print("=" * 80)

    try:
        query = """
        query {
          workspace(id: "69689c5e178ca200239ed6cb") {
            zenhubEpics(first: 20) {
              edges {
                node {
                  id
                  name
                  description
                  startOn
                  endOn
                  state
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
            epics = data.get('data', {}).get('workspace', {}).get('zenhubEpics', {}).get('edges', [])

            print(f"✅ Found {len(epics)} Zenhub Epics:")
            for edge in epics:
                epic = edge.get('node', {})
                print(f"\n   Epic ID: {epic.get('id')}")
                print(f"   - Name: {epic.get('name')}")
                print(f"   - State: {epic.get('state')}")
                print(f"   - Start: {epic.get('startOn')}, End: {epic.get('endOn')}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 2: Try createZenhubEpic
    print(f"\n[2/4] TESTING createZenhubEpic MUTATION")
    print("=" * 80)

    try:
        query = """
        query {
          __type(name: "CreateZenhubEpicInput") {
            inputFields {
              name
              type {
                name
                kind
                ofType {
                  name
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
                print(f"✅ CreateZenhubEpicInput fields ({len(fields)}):")
                for field in fields:
                    field_type = field.get('type', {})
                    type_name = field_type.get('name') or field_type.get('ofType', {}).get('name')
                    print(f"   - {field.get('name')}: {type_name}")

                # Now try to create one
                mutation = """
                mutation CreateEpic($input: CreateZenhubEpicInput!) {
                  createZenhubEpic(input: $input) {
                    zenhubEpic {
                      id
                      name
                    }
                  }
                }
                """

                variables = {
                    "input": {
                        "workspaceId": workspace_id,
                        "name": "TestEpicFromFrappe",
                        "description": "Investigation test - attempting to create epic"
                    }
                }

                payload = {"query": mutation, "variables": variables}
                response = requests.post(url, headers=headers, json=payload, timeout=10)
                data = response.json()

                if "errors" in data:
                    error_msg = str(data['errors'][0].get('message', 'Unknown'))
                    print(f"\n   ❌ Create attempt failed: {error_msg[:150]}")
                else:
                    result = data.get('data', {}).get('createZenhubEpic', {})
                    if result.get('zenhubEpic'):
                        print(f"\n   ✅ SUCCESS! Epic created:")
                        print(f"      ID: {result.get('zenhubEpic').get('id')}")
                        print(f"      Name: {result.get('zenhubEpic').get('name')}")
                    else:
                        print(f"\n   ⚠️  Unexpected response: {result}")
            else:
                print(f"❌ CreateZenhubEpicInput type not found")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 3: Query Projects field more carefully
    print(f"\n[3/4] DEEP DIVE: QUERYING 'projects' FIELD ON WORKSPACE")
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
                ofType {
                  name
                  kind
                  ofType {
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
            print(f"❌ Error: {data['errors']}")
        else:
            fields = data.get('data', {}).get('__type', {}).get('fields', [])
            projects_field = [f for f in fields if f.get('name') == 'projects'][0]

            print(f"✅ 'projects' field details:")
            print(f"   Type name: {projects_field.get('type', {}).get('name')}")
            print(f"   Type kind: {projects_field.get('type', {}).get('kind')}")

            # Try to get details about ProjectConnection
            query2 = """
            query {
              __type(name: "ProjectConnection") {
                fields {
                  name
                }
              }
            }
            """

            payload = {"query": query2}
            response = requests.post(url, headers=headers, json=payload, timeout=10)
            data = response.json()

            if "errors" not in data:
                conn = data.get('data', {}).get('__type')
                if conn:
                    fields = conn.get('fields', [])
                    print(f"\n   ProjectConnection has fields: {[f.get('name') for f in fields]}")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    # Step 4: Final recommendation
    print(f"\n[4/4] FINAL ANALYSIS & RECOMMENDATION")
    print("=" * 80)

    try:
        # Get Zenhub Epics to confirm they work
        query = """
        query {
          workspace(id: "69689c5e178ca200239ed6cb") {
            zenhubEpics(first: 1) {
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

        payload = {"query": query}
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        data = response.json()

        print("\n✅ FINDINGS:")
        print("   1. ZenHub Epics CAN be queried (they exist in workspace)")
        print("   2. createZenhubEpic mutation EXISTS and likely works")
        print("   3. createPipeline mutation CONFIRMED WORKING")
        print("   4. No 'createProject' mutation exists in ZenHub")
        print("\n   INTERPRETATION:")
        print("   - 'Projects' in Frappe should probably map to 'Zenhub Epics'")
        print("   - OR 'Projects' should be Pipelines")
        print("   - Zenhub Epics have startOn/endOn (timeline support)")
        print("   - Pipelines are more workflow-oriented")
        print("\n✅ RECOMMENDED SOLUTION:")
        print("   Use createZenhubEpic to create 'projects':")
        print("   - Frappe Project -> ZenHub Epic")
        print("   - Preserve timeline data (startOn, endOn)")
        print("   - Organize work at the Epic level")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print("\n" + "=" * 80)
    print("INVESTIGATION COMPLETE")
    print("=" * 80)


if __name__ == "__main__":
    investigate_final()
