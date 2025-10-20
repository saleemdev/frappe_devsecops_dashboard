#!/usr/bin/env python3
"""
Test Zenhub API connectivity
"""

import frappe
import requests
from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token


def test_connection():
    """Test basic connectivity to Zenhub API"""
    frappe.init(site='desk.kns.co.ke')
    frappe.connect()

    print("="*80)
    print("Zenhub API Connection Test")
    print("="*80)

    # Get token
    try:
        token = get_zenhub_token()
        print(f"✅ Token retrieved: {token[:25]}...")
    except Exception as e:
        print(f"❌ Failed to get token: {e}")
        return

    # Test API connection
    url = "https://api.zenhub.com/public/graphql"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    # Minimal viewer query
    query = """{
  viewer {
    id
    name
  }
}"""

    payload = {"query": query}

    print(f"\nTesting POST to {url}...")

    try:
        response = requests.post(url, headers=headers, json=payload, timeout=10)
        print(f"✅ Status Code: {response.status_code}")

        if response.status_code == 200:
            data = response.json()
            if "errors" in data:
                print(f"❌ GraphQL Errors: {data['errors']}")
            elif "data" in data:
                print(f"✅ Success! Viewer: {data['data']}")
            else:
                print(f"⚠️  Unexpected response: {data}")
        else:
            print(f"❌ Error response: {response.text[:500]}")

    except requests.exceptions.ConnectionError as e:
        print(f"❌ Connection Error: {e}")
        print("\n💡 Possible causes:")
        print("   - Firewall blocking outbound HTTPS")
        print("   - Network proxy required")
        print("   - DNS resolution issues")
    except requests.exceptions.Timeout as e:
        print(f"❌ Timeout Error: {e}")
    except Exception as e:
        print(f"❌ Unexpected Error: {type(e).__name__}: {e}")

    print("="*80)


if __name__ == "__main__":
    test_connection()
