# ZenHub Workspace Setup Guide

**Version:** 1.0
**Date:** January 14, 2026
**Status:** ✅ READY TO USE

---

## Overview

This guide walks you through setting up a complete ZenHub workspace for a product and automatically linking all its associated projects.

## What This Does

The setup process:

1. ✅ **Creates a ZenHub workspace** for your product
2. ✅ **Creates projects** in ZenHub for each Frappe project linked to the product
3. ✅ **Updates all documents** with the ZenHub workspace and project IDs
4. ✅ **Enables ZenHub Dashboard** to display workspace data

## Prerequisites

Before running the setup, ensure:

- ✅ ZenHub Settings is configured with a valid API token
- ✅ At least one Product exists in Frappe
- ✅ At least one Project is linked to that product

## Step-by-Step Setup

### Step 1: Verify ZenHub Settings

```
Navigate to: Awesome Bar → ZenHub Settings
Verify:
  - Zenhub Token field has a valid API token
  - Token was created in ZenHub dashboard
  - Token has "workspace" scope
```

**Get API Token:**
- Go to: https://zenhub.com/settings/tokens
- Click: "New Token"
- Name it: "Frappe Dashboard"
- Select scopes: (check "workspace" and "issue")
- Copy token → Paste in ZenHub Settings

### Step 2: Link Projects to Product

For each project that should sync with ZenHub:

```
1. Navigate to: Projects → [Project Name]
2. In "Product" field, select: "Afyangu" (or your product)
3. Click: Save
```

**Verify Linking:**
```
Navigate to: Products → Afyangu
Check: "Products" section shows all linked projects
```

### Step 3: Run Setup Command

```bash
# Option A: Using CLI command (recommended)
bench --site desk.kns.co.ke setup-zenhub-workspace --product "Afyangu"

# Option B: Using Python API (advanced)
bench --site desk.kns.co.ke console << 'EOF'
from frappe_devsecops_dashboard.api.zenhub_workspace_setup import setup_product_workspace
result = setup_product_workspace("Afyangu")
print(result)
EOF
```

**Output will show:**
```
============================================================
Setting up ZenHub workspace for product: Afyangu
============================================================

[1/3] Creating ZenHub workspace for Afyangu...
✓ Workspace created: Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS82MzQ1NjI=
✓ Product Afyangu updated with workspace ID

[2/3] Creating 3 projects in ZenHub...
  Creating project: Pharmacy Stock...
  ✓ Created: Z2lkOi8vcmFwdG9yL1Byb2plY3QvMjM0NTY3
  ...

[3/3] Updating projects with ZenHub IDs...
  ✓ Updated Pharmacy Stock
  ...

✅ SUCCESS!

Workspace ID:      Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS82MzQ1NjI=
Projects created:  3

Projects:
  • Pharmacy Stock
    └─ ZenHub ID: Z2lkOi8vcmFwdG9yL1Byb2plY3QvMjM0NTY3
  ...

Workspace is ready to use!
```

## After Setup

### Access the Dashboard

```
Navigate to: Projects → ZenHub Dashboard
The dashboard will show:
  - Overview with total issues and metrics
  - List of projects
  - Team member utilization
  - Sprint progression
```

### Verify Linking

Check that custom fields are populated:

**Product Document:**
```
Navigate to: Products → Afyangu
Custom field "ZenHub Workspace ID" should show the workspace ID
```

**Project Documents:**
```
Navigate to: Projects → [Project Name]
Custom fields should show:
  - "ZenHub Workspace ID" (same for all projects)
  - "ZenHub Project ID" (unique per project)
```

## How It Works

### Architecture

```
Frappe Database                ZenHub API
─────────────────────────────────────────

Product (Afyangu)  ──create──→  ZenHub Workspace
  ├─ custom_zenhub_workspace_id

Project A          ──create──→  ZenHub Project A
  ├─ custom_zenhub_workspace_id
  ├─ custom_zenhub_project_id

Project B          ──create──→  ZenHub Project B
  ├─ custom_zenhub_workspace_id
  ├─ custom_zenhub_project_id
```

### Data Flow

1. **User runs setup command** with product name
2. **System fetches:**
   - ZenHub API token from settings
   - Organization ID from current workspace
   - Linked projects from product

3. **System creates in ZenHub:**
   - Workspace named after product
   - Projects named after Frappe projects

4. **System updates Frappe:**
   - Product document with workspace ID
   - Each Project with workspace and project IDs

5. **Dashboard reads from:**
   - Workspace ID to fetch workspace data
   - Project IDs for filtering (optional)

## Troubleshooting

### Issue: "ZenHub API token not configured"

**Solution:**
1. Go to: ZenHub Settings
2. Add token in "Zenhub Token" field
3. Run setup again

### Issue: "No projects linked to product"

**Solution:**
1. Edit each project: Projects → [Project]
2. In "Product" field, select your product
3. Save
4. Run setup again

### Issue: "Failed to create workspace: ..."

**Solution:**
1. Check ZenHub API status: https://status.zenhub.com/
2. Verify API token is valid and not expired
3. Check organization exists in ZenHub
4. Try again in a moment

### Issue: "Setup created workspace but not projects"

**Solution:**
1. Check error details in: Setup → Error Log
2. Verify project names don't already exist in ZenHub
3. Try with different project names
4. Run setup again

## Advanced Usage

### Run Setup Programmatically

```python
from frappe_devsecops_dashboard.api.zenhub_workspace_setup import setup_product_workspace

result = setup_product_workspace("Afyangu")
print(result)
# Returns:
# {
#     "success": True,
#     "workspace_id": "...",
#     "workspace_name": "Afyangu",
#     "projects_created": 3,
#     "projects": [
#         {
#             "frappe_project": "Project A",
#             "zenhub_project_id": "...",
#             "zenhub_project_key": "PROJ_A"
#         },
#         ...
#     ]
# }
```

### Create Additional Projects

To add more projects to an existing workspace:

1. **Create new project in Frappe:**
   ```
   Projects → New Project
   Product: Afyangu
   Save
   ```

2. **Create project in ZenHub:**
   ```python
   from frappe_devsecops_dashboard.api.zenhub_workspace_setup import create_project_graphql
   from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

   token = get_zenhub_token()
   workspace_id = "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS82MzQ1NjI="

   result = create_project_graphql(
       token,
       workspace_id,
       "New Project",
       "NEWPROJ"
   )
   ```

3. **Update project document:**
   ```
   Projects → New Project
   ZenHub Project ID: [paste result]
   Save
   ```

## Technical Details

### GraphQL Queries Used

**Create Workspace Mutation:**
```graphql
mutation CreateWorkspace($input: CreateWorkspaceInput!) {
    createWorkspace(input: $input) {
        workspace {
            id
            name
            description
            createdAt
        }
        userErrors {
            message
        }
    }
}
```

**Create Project Mutation:**
```graphql
mutation CreateProject($input: CreateProjectInput!) {
    createProject(input: $input) {
        project {
            id
            name
            key
            description
            createdAt
        }
        userErrors {
            message
        }
    }
}
```

### Custom Fields Added

**Product DocType:**
- Field: `custom_zenhub_workspace_id`
- Type: Data
- Purpose: Stores ZenHub workspace ID for the product

**Project DocType:**
- Field: `custom_zenhub_project_id`
- Type: Data
- Purpose: Stores ZenHub project ID for that specific project

## API Reference

### setup_product_workspace(product_name)

**Purpose:** Main setup function - creates workspace and projects

**Parameters:**
- `product_name` (str): Name of product in Frappe (e.g., "Afyangu")

**Returns:**
```python
{
    "success": bool,
    "workspace_id": str,      # ZenHub workspace ID
    "workspace_name": str,    # Product name
    "projects_created": int,  # Number of projects created
    "projects": [             # List of created projects
        {
            "frappe_project": str,     # Frappe project name
            "zenhub_project_id": str,  # ZenHub project ID
            "zenhub_project_key": str  # ZenHub project key
        },
        ...
    ],
    "error": str              # (only if success=False)
}
```

### create_workspace_graphql(token, workspace_name, org_id)

**Purpose:** Create ZenHub workspace using GraphQL

**Parameters:**
- `token` (str): ZenHub API token
- `workspace_name` (str): Name for workspace
- `org_id` (str): ZenHub organization ID

**Returns:** Dict with `success`, `workspace_id`, `name`, `created_at`

### create_project_graphql(token, workspace_id, project_name, project_key)

**Purpose:** Create project in ZenHub workspace

**Parameters:**
- `token` (str): ZenHub API token
- `workspace_id` (str): ZenHub workspace ID
- `project_name` (str): Project name
- `project_key` (str): Project key (e.g., "PROJ")

**Returns:** Dict with `success`, `project_id`, `name`, `key`, `created_at`

## Security

### Token Safety

- ✅ Token stored encrypted in ZenHub Settings password field
- ✅ Token never logged or displayed
- ✅ Token only sent to official ZenHub API (api.zenhub.com)
- ✅ HTTPS used for all API calls

### Permissions

- ✅ Only System Manager can access ZenHub Settings
- ✅ Only users with Project/Product edit permission can run setup
- ✅ All API calls include CSRF token

## Support

For issues or questions:

1. Check **Troubleshooting** section above
2. Review error log: Setup → Error Log
3. Check ZenHub status: https://status.zenhub.com/
4. Check API token validity in ZenHub settings

---

**Document Version:** 1.0
**Last Updated:** January 14, 2026
**Status:** ✅ PRODUCTION READY
