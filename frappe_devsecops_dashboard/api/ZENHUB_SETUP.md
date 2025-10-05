# Zenhub Integration - Quick Setup Guide

This guide will help you quickly set up the Zenhub integration for your Frappe DevSecOps Dashboard.

---

## Step 1: Create Required Doctypes

### 1.1 Create "Zenhub Settings" Doctype

Run this in Frappe console (`bench console`):

```python
import frappe

# Create Zenhub Settings doctype
if not frappe.db.exists("DocType", "Zenhub Settings"):
    doc = frappe.get_doc({
        "doctype": "DocType",
        "name": "Zenhub Settings",
        "module": "Frappe Devsecops Dashboard",
        "issingle": 1,  # Singleton doctype
        "fields": [
            {
                "fieldname": "zenhub_token",
                "label": "Zenhub API Token",
                "fieldtype": "Password",
                "reqd": 1,
                "description": "Enter your Zenhub Personal Access Token"
            }
        ],
        "permissions": [
            {
                "role": "System Manager",
                "read": 1,
                "write": 1,
                "create": 1
            }
        ]
    })
    doc.insert(ignore_permissions=True)
    frappe.db.commit()
    print("✅ Zenhub Settings doctype created successfully")
else:
    print("ℹ️  Zenhub Settings doctype already exists")
```

### 1.2 Add Custom Field to Project Doctype

```python
import frappe

# Add custom field to Project doctype
if not frappe.db.exists("Custom Field", "Project-custom_zenhub_workspace_id"):
    custom_field = frappe.get_doc({
        "doctype": "Custom Field",
        "dt": "Project",
        "fieldname": "custom_zenhub_workspace_id",
        "label": "Zenhub Workspace ID",
        "fieldtype": "Data",
        "insert_after": "project_name",
        "description": "Enter the Zenhub workspace ID for this project"
    })
    custom_field.insert(ignore_permissions=True)
    frappe.db.commit()
    print("✅ Custom field 'custom_zenhub_workspace_id' added to Project doctype")
else:
    print("ℹ️  Custom field already exists")
```

---

## Step 2: Configure Zenhub Settings

### 2.1 Get Your Zenhub API Token

1. Log in to Zenhub: https://app.zenhub.com
2. Click on your profile icon → **Settings**
3. Navigate to **API Tokens**
4. Click **Generate New Token**
5. Give it a name (e.g., "Frappe DevSecOps Dashboard")
6. Copy the token (you won't see it again!)

### 2.2 Save Token in Frappe

**Option A: Using Frappe UI**
1. Go to **Desk → Zenhub Settings**
2. Paste your token in the "Zenhub API Token" field
3. Click **Save**

**Option B: Using Frappe Console**
```python
import frappe

zenhub_settings = frappe.get_single("Zenhub Settings")
zenhub_settings.zenhub_token = "your_zenhub_token_here"
zenhub_settings.save()
frappe.db.commit()

print("✅ Zenhub token saved successfully")
```

---

## Step 3: Configure Projects

### 3.1 Find Your Zenhub Workspace ID

**Method 1: From Zenhub URL**
1. Open Zenhub in your browser
2. Navigate to your workspace
3. Look at the URL: `https://app.zenhub.com/workspaces/{workspace_id}/...`
4. Copy the `workspace_id` part

**Method 2: Using GraphQL API Explorer**
1. Go to: https://api.zenhub.com/public/graphql
2. Use this query:
```graphql
query {
  viewer {
    searchWorkspaces(query: "") {
      nodes {
        id
        name
      }
    }
  }
}
```
3. Copy the `id` of your desired workspace

### 3.2 Update Project with Workspace ID

**Option A: Using Frappe UI**
1. Open your Project document
2. Find the "Zenhub Workspace ID" field
3. Paste the workspace ID
4. Click **Save**

**Option B: Using Frappe Console**
```python
import frappe

project = frappe.get_doc("Project", "YOUR-PROJECT-ID")
project.custom_zenhub_workspace_id = "your_workspace_id_here"
project.save()
frappe.db.commit()

print(f"✅ Workspace ID configured for project {project.name}")
```

**Option C: Bulk Update Multiple Projects**
```python
import frappe

# Update multiple projects with the same workspace ID
workspace_id = "your_workspace_id_here"
project_ids = ["PROJ-001", "PROJ-002", "PROJ-003"]

for project_id in project_ids:
    if frappe.db.exists("Project", project_id):
        project = frappe.get_doc("Project", project_id)
        project.custom_zenhub_workspace_id = workspace_id
        project.save()
        print(f"✅ Updated {project_id}")

frappe.db.commit()
print("✅ All projects updated")
```

---

## Step 4: Test the Integration

### 4.1 Test API Endpoint

**Using Frappe Console:**
```python
from frappe_devsecops_dashboard.api.zenhub import get_sprint_data
import json

result = get_sprint_data(project_id="YOUR-PROJECT-ID")
print(json.dumps(result, indent=2))
```

**Using cURL:**
```bash
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data?project_id=YOUR-PROJECT-ID"
```

### 4.2 Verify Response

A successful response should look like:
```json
{
  "success": true,
  "workspace_id": "workspace_123abc",
  "workspace_name": "My Workspace",
  "sprints": [
    {
      "sprint_id": "sprint_456def",
      "sprint_name": "Sprint 15",
      "state": "active",
      "start_date": "2025-09-01",
      "end_date": "2025-09-14",
      "total_story_points": 50,
      "completed_story_points": 30,
      "remaining_story_points": 20,
      "utilization_percentage": 60.0,
      "team_members": [...],
      "issues": {...},
      "blockers": [...]
    }
  ]
}
```

---

## Step 5: Run Unit Tests (Optional)

```bash
# Run all Zenhub integration tests
bench run-tests --app frappe_devsecops_dashboard --module api.test_zenhub

# Run specific test
bench run-tests --app frappe_devsecops_dashboard --module api.test_zenhub --test test_get_sprint_data_success
```

---

## Troubleshooting

### Issue: "Zenhub Settings not found"

**Solution:**
```python
# Recreate Zenhub Settings
import frappe

if frappe.db.exists("DocType", "Zenhub Settings"):
    # Create the singleton document
    if not frappe.db.exists("Zenhub Settings", "Zenhub Settings"):
        doc = frappe.get_doc({
            "doctype": "Zenhub Settings",
            "zenhub_token": "your_token_here"
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()
```

### Issue: "Custom field not showing in Project"

**Solution:**
```python
# Clear cache and reload
import frappe

frappe.clear_cache()
frappe.db.commit()

# Verify field exists
if frappe.db.exists("Custom Field", "Project-custom_zenhub_workspace_id"):
    print("✅ Field exists")
else:
    print("❌ Field missing - recreate it")
```

### Issue: "Authentication failed"

**Possible causes:**
1. Invalid or expired token
2. Token not saved correctly
3. Cache issue

**Solution:**
```python
import frappe

# Clear token cache
frappe.cache().delete_value("zenhub_api_token")

# Verify token is saved
zenhub_settings = frappe.get_single("Zenhub Settings")
print(f"Token exists: {bool(zenhub_settings.zenhub_token)}")

# Update token
zenhub_settings.zenhub_token = "new_token_here"
zenhub_settings.save()
frappe.db.commit()
```

---

## Complete Setup Script

Run this complete script to set up everything at once:

```python
import frappe

def setup_zenhub_integration():
    """Complete setup script for Zenhub integration"""
    
    print("🚀 Starting Zenhub integration setup...\n")
    
    # Step 1: Create Zenhub Settings doctype
    print("Step 1: Creating Zenhub Settings doctype...")
    if not frappe.db.exists("DocType", "Zenhub Settings"):
        doc = frappe.get_doc({
            "doctype": "DocType",
            "name": "Zenhub Settings",
            "module": "Frappe Devsecops Dashboard",
            "issingle": 1,
            "fields": [
                {
                    "fieldname": "zenhub_token",
                    "label": "Zenhub API Token",
                    "fieldtype": "Password",
                    "reqd": 1,
                    "description": "Enter your Zenhub Personal Access Token"
                }
            ],
            "permissions": [
                {
                    "role": "System Manager",
                    "read": 1,
                    "write": 1,
                    "create": 1
                }
            ]
        })
        doc.insert(ignore_permissions=True)
        print("✅ Zenhub Settings doctype created")
    else:
        print("ℹ️  Zenhub Settings doctype already exists")
    
    # Step 2: Add custom field to Project
    print("\nStep 2: Adding custom field to Project doctype...")
    if not frappe.db.exists("Custom Field", "Project-custom_zenhub_workspace_id"):
        custom_field = frappe.get_doc({
            "doctype": "Custom Field",
            "dt": "Project",
            "fieldname": "custom_zenhub_workspace_id",
            "label": "Zenhub Workspace ID",
            "fieldtype": "Data",
            "insert_after": "project_name",
            "description": "Enter the Zenhub workspace ID for this project"
        })
        custom_field.insert(ignore_permissions=True)
        print("✅ Custom field added to Project doctype")
    else:
        print("ℹ️  Custom field already exists")
    
    # Step 3: Create Zenhub Settings document
    print("\nStep 3: Creating Zenhub Settings document...")
    if not frappe.db.exists("Zenhub Settings", "Zenhub Settings"):
        settings = frappe.get_doc({
            "doctype": "Zenhub Settings",
            "zenhub_token": ""  # User needs to fill this
        })
        settings.insert(ignore_permissions=True)
        print("✅ Zenhub Settings document created")
    else:
        print("ℹ️  Zenhub Settings document already exists")
    
    frappe.db.commit()
    
    print("\n✅ Setup complete!")
    print("\n📝 Next steps:")
    print("1. Go to Desk → Zenhub Settings")
    print("2. Enter your Zenhub API token")
    print("3. Open a Project and set the Zenhub Workspace ID")
    print("4. Test the integration using the API endpoint")
    
    return True

# Run the setup
setup_zenhub_integration()
```

---

## Quick Reference

### API Endpoint
```
GET /api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data
```

### Parameters
- `project_id` (required): Project name/ID
- `sprint_states` (optional): Comma-separated states (default: "ACTIVE,CLOSED")

### Example Call
```bash
curl "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data?project_id=PROJ-001&sprint_states=ACTIVE"
```

### Clear Cache
```python
frappe.cache().delete_value("zenhub_api_token")
```

---

## Support

For detailed documentation, see:
- `ZENHUB_INTEGRATION_GUIDE.md` - Complete integration guide
- `zenhub.py` - Source code with inline documentation
- `test_zenhub.py` - Unit tests and examples

---

**Last Updated**: 2025-09-30  
**Version**: 1.0.0

