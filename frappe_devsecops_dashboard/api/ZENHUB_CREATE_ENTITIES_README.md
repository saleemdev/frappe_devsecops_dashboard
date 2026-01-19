# Zenhub Entity Creation Script

This script creates Epics in Zenhub and documents the created entity IDs in a markdown file.

## Important Notes

⚠️ **Workspaces and Projects must be created in Zenhub UI first!**

Zenhub's GraphQL API does not support creating workspaces or projects programmatically. These must be created through the Zenhub web interface. This script focuses on creating **Epics** (GitHub issues with epic type) in existing workspaces and projects.

## Prerequisites

1. **Zenhub API Token**: Configured in `Zenhub Settings` doctype
2. **Existing Workspace**: Created in Zenhub UI
3. **Existing Project**: Created in Zenhub UI (within the workspace)
4. **GitHub Repository**: Connected to the workspace (required for creating epics/issues)

## Getting Your Workspace ID

### Method 1: From Zenhub URL
1. Open Zenhub: https://app.zenhub.com
2. Navigate to your workspace
3. Look at the URL: `https://app.zenhub.com/workspaces/{workspace_id}/...`
4. Copy the `workspace_id` part

### Method 2: From Frappe Project
If you have a Project in Frappe with `custom_zenhub_workspace_id` set:
```python
import frappe
project = frappe.get_doc("Project", "YOUR-PROJECT-NAME")
workspace_id = project.custom_zenhub_workspace_id
print(f"Workspace ID: {workspace_id}")
```

### Method 3: Using GraphQL Query
```python
from frappe_devsecops_dashboard.api.zenhub import execute_graphql_query

query = """
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
"""

result = execute_graphql_query(query, {})
workspaces = result["viewer"]["searchWorkspaces"]["nodes"]
for ws in workspaces:
    print(f"{ws['name']}: {ws['id']}")
```

## Getting Your Project ID

### Method 1: From Zenhub UI
1. Open your workspace in Zenhub
2. Navigate to Projects
3. Open the project
4. The project ID is in the URL or can be found via API

### Method 2: Using GraphQL Query
```python
from frappe_devsecops_dashboard.api.zenhub import execute_graphql_query

workspace_id = "YOUR_WORKSPACE_ID"

query = """
query GetProjects($workspaceId: ID!) {
  workspace(id: $workspaceId) {
    projects(first: 100) {
      nodes {
        id
        name
      }
    }
  }
}
"""

result = execute_graphql_query(query, {"workspaceId": workspace_id})
projects = result["workspace"]["projects"]["nodes"]
for p in projects:
    print(f"{p['name']}: {p['id']}")
```

## Usage

### Option 1: Using the Runner Script (Recommended)

1. Edit `run_zenhub_create.py`:
   ```python
   WORKSPACE_ID = "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="
   PROJECT_ID = "Z2lkOi8vcmFwdG9yL1Byb2plY3QvMTIzNDU2"  # OR use PROJECT_NAME
   EPIC_TITLES = [
       "Epic 1 Title",
       "Epic 2 Title",
       "Epic 3 Title"
   ]
   ```

2. Run from Frappe console:
   ```bash
   bench --site <site> console
   ```
   ```python
   exec(open('apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/api/run_zenhub_create.py').read())
   ```

### Option 2: Using the API Function Directly

```python
from frappe_devsecops_dashboard.api.zenhub_create_entities import create_zenhub_entities

result = create_zenhub_entities(
    workspace_id="Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=",
    project_id="Z2lkOi8vcmFwdG9yL1Byb2plY3QvMTIzNDU2",  # OR project_name="Project Name"
    epic_titles=[
        "User Authentication & Authorization",
        "Dashboard & Reporting Features",
        "API Integration & Management"
    ]
)

if result["success"]:
    print(f"✅ Created {len(result['results']['epics'])} epics")
    print(f"📄 Results saved to: {result['output_file']}")
else:
    print(f"❌ Error: {result['error']}")
```

### Option 3: Via API Endpoint

```bash
curl -X POST "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub_create_entities.create_zenhub_entities" \
  -H "Content-Type: application/json" \
  -d '{
    "workspace_id": "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=",
    "project_id": "Z2lkOi8vcmFwdG9yL1Byb2plY3QvMTIzNDU2",
    "epic_titles": ["Epic 1", "Epic 2", "Epic 3"]
  }'
```

## Output

The script creates a markdown file at:
```
apps/frappe_devsecops_dashboard/zenhub_created_entities.md
```

The markdown file contains:
- Workspace information and ID
- Project information and ID
- All created epics with their IDs, numbers, and repository information
- Usage instructions for integrating with Frappe

## Example Output

```markdown
# Zenhub Created Entities

**Created on:** 2025-01-14 10:30:00

## Workspace

- **Name:** DevSecOps Dashboard Workspace
- **ID:** `Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=`
- **Description:** Workspace for managing DevSecOps Dashboard development

## Project

- **Name:** Main Development Project
- **ID:** `Z2lkOi8vcmFwdG9yL1Byb2plY3QvMTIzNDU2`
- **Description:** Primary project for tracking all development work

## Epics

### Epic 1

- **Title:** User Authentication & Authorization
- **ID:** `Z2lkOi8vcmFwdG9yL0lzc3VlLzEyMzQ1Njc4`
- **Number:** 123
- **State:** OPEN
- **Repository:** my-repo (`Z2lkOi8vcmFwdG9yL1JlcG9zaXRvcnkvMTIzNDU2`)
- **Created At:** 2025-01-14T10:30:00Z

...
```

## Troubleshooting

### Error: "Workspace ID is required"
- Make sure you've created a workspace in Zenhub UI first
- Verify the workspace_id is correct

### Error: "No repositories found in workspace"
- Add at least one GitHub repository to your Zenhub workspace
- Epics are created as GitHub issues, so a repository is required

### Error: "Project not found"
- Verify the project exists in the workspace
- Check that you're using the correct project_id or project_name
- Project names are case-sensitive

### Error: "Zenhub API authentication failed"
- Check that your Zenhub API token is configured in `Zenhub Settings`
- Verify the token is valid and not expired
- Clear the token cache: `frappe.cache().delete_value("zenhub_api_token")`

### Error: "GraphQL errors"
- Check the Zenhub API documentation for supported mutations
- Some operations may require specific permissions
- Verify your Zenhub account has the necessary access

## Integration with Frappe Projects

After creating epics, you can link them to Frappe Projects:

```python
import frappe

# Update project with workspace ID
project = frappe.get_doc("Project", "YOUR-PROJECT-NAME")
project.custom_zenhub_workspace_id = "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="
project.custom_zenhub_project_id = "Z2lkOi8vcmFwdG9yL1Byb2plY3QvMTIzNDU2"
project.save()
frappe.db.commit()
```

## Files

- `zenhub_create_entities.py` - Main script with creation functions
- `run_zenhub_create.py` - Quick runner script (edit and run)
- `zenhub_created_entities.md` - Output file with created entity IDs

## Support

For issues or questions:
1. Check Zenhub API documentation: https://developers.zenhub.com
2. Review error logs in Frappe: `Desk → Error Log`
3. Verify Zenhub Settings configuration

---

**Last Updated:** 2025-01-14  
**Version:** 1.0.0

