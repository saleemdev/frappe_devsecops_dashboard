"""
Introspect ZenhubEpic and ZenhubEpicInput types
"""

import frappe
import requests


def introspect_epic_types():
    """Get exact fields for ZenhubEpic and ZenhubEpicInput"""

    from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

    token = get_zenhub_token()
    url = "https://api.zenhub.com/public/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    print("\n" + "=" * 80)
    print("ZENHUB EPIC TYPE INTROSPECTION")
    print("=" * 80)

    # Query ZenhubEpic fields
    print(f"\nZenhubEpic Fields:")
    print("-" * 40)

    query = """
    query {
      __type(name: "ZenhubEpic") {
        fields {
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
        print(f"Error: {data['errors']}")
    else:
        fields = data.get('data', {}).get('__type', {}).get('fields', [])
        for field in fields:
            type_info = field.get('type', {})
            type_name = type_info.get('name') or (type_info.get('ofType', {}).get('name') if type_info.get('ofType') else '?')
            print(f"  - {field.get('name')}: {type_name}")

    # Query ZenhubEpicInput fields
    print(f"\nZenhubEpicInput Fields:")
    print("-" * 40)

    query2 = """
    query {
      __type(name: "ZenhubEpicInput") {
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

    payload = {"query": query2}
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    data = response.json()

    if "errors" in data:
        print(f"Error: {data['errors']}")
    else:
        fields = data.get('data', {}).get('__type', {}).get('inputFields', [])
        for field in fields:
            type_info = field.get('type', {})
            type_name = type_info.get('name') or (type_info.get('ofType', {}).get('name') if type_info.get('ofType') else '?')
            print(f"  - {field.get('name')}: {type_name}")

    # Query CreateZenhubEpicInput for full context
    print(f"\nCreateZenhubEpicInput Fields:")
    print("-" * 40)

    query3 = """
    query {
      __type(name: "CreateZenhubEpicInput") {
        inputFields {
          name
          description
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

    payload = {"query": query3}
    response = requests.post(url, headers=headers, json=payload, timeout=10)
    data = response.json()

    if "errors" in data:
        print(f"Error: {data['errors']}")
    else:
        fields = data.get('data', {}).get('__type', {}).get('inputFields', [])
        for field in fields:
            type_info = field.get('type', {})
            type_name = type_info.get('name') or (type_info.get('ofType', {}).get('name') if type_info.get('ofType') else '?')
            desc = field.get('description', '')
            print(f"  - {field.get('name')}: {type_name}")
            if desc:
                print(f"    {desc[:80]}")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    introspect_epic_types()
