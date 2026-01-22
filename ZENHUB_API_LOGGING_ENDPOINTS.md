# Zenhub API Logging - Frontend Integration Points

## Overview

All Zenhub GraphQL API interactions are now logged to the **Zenhub GraphQL API Log** doctype for monitoring, debugging, and auditing purposes.

## Backend API Endpoints with Logging

### 1. Workspace Operations

#### Get Workspace Summary
**Button:** "View Workspace Summary" in Software Product form
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary`
**Operation:** `getWorkspaceSummary`
**Reference DocType:** Zenhub Workspace
**Logged:** ✅ Yes (via decorator)

**Frontend Location:**
- File: `frontend/src/components/SoftwareProductForm.jsx`
- Function: `handleViewWorkspaceSummary()`
- Line: ~386

#### Get Workspace by Project
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project`
**Operation:** `getWorkspaceByProject`
**Logged:** ✅ Yes (via decorator)

#### Get Workspace by Epic
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic`
**Operation:** `getWorkspaceByEpic`
**Logged:** ✅ Yes (via decorator)

#### Get Team Utilization
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization`
**Operation:** `getTeamUtilization`
**Logged:** ✅ Yes (via decorator)

### 2. Sprint & Issue Operations

#### Get Sprint Data
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data`
**Operation:** `getSprintData`
**Reference DocType:** Project
**Logged:** ⏳ Pending

#### Get Workspace Issues
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.zenhub.get_workspace_issues`
**Operation:** `getWorkspaceIssues`
**Reference DocType:** Project
**Logged:** ⏳ Pending

#### Get Stakeholder Sprint Report
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report`
**Operation:** `getStakeholderSprintReport`
**Reference DocType:** Project
**Logged:** ⏳ Pending

### 3. Software Product Operations

#### Create Workspace (Mutation)
**Hook:** Software Product `before_save`
**Operation:** `createWorkspace`
**Reference DocType:** Software Product
**Logged:** ⏳ Pending (needs update in `software_product_zenhub.py`)

**Location:**
- File: `doc_hooks/software_product_zenhub.py`
- Function: `create_zenhub_workspace()`

### 4. Project Operations

#### Create Project Issue (Mutation)
**Hook:** Project `before_save`
**Operation:** `createProjectIssue`
**Reference DocType:** Project
**Logged:** ⏳ Pending (needs update in `project_extension.py`)

**Location:**
- File: `doctype/project_extension/project_extension.py`
- Function: `create_zenhub_project_issue()`

### 5. Task Operations

#### Create Epic Issue (Mutation)
**Hook:** Task `before_save`
**Operation:** `createEpicIssue`
**Reference DocType:** Task
**Logged:** ✅ Yes (integrated with logging wrapper)

**Location:**
- File: `doctype/task_extension/task_extension.py`
- Function: `create_zenhub_epic_issue()`

#### Generate Epic ID (Manual Button)
**Button:** "Generate Zenhub Epic ID" in Task form
**Endpoint:** `/api/method/frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.task_extension.task_extension.generate_zenhub_epic_id`
**Operation:** `createEpicIssue`
**Reference DocType:** Task
**Logged:** ✅ Yes (uses `create_zenhub_epic_issue()` which has logging)

## Frontend Button Locations

### Software Product Form Buttons

**File:** `frontend/src/components/SoftwareProductForm.jsx`

1. **View Workspace Summary** (line ~383)
   - Function: `handleViewWorkspaceSummary()`
   - API: `get_workspace_summary()`
   - Logged: ✅ Yes

### Project Form Buttons

1. **Generate Zenhub Project ID**
   - Triggers: `create_zenhub_project_issue()`
   - Logged: ⏳ Pending

### Task Form Buttons

1. **Generate Zenhub Epic ID**
   - API: `generate_zenhub_epic_id()`
   - Logged: ✅ Yes

## Implementation Status

### ✅ Completed
1. Zenhub GraphQL API Log DocType created
2. Logging wrapper module (`zenhub_graphql_logger.py`)
3. API decorator (`zenhub_api_decorator.py`) for easy integration
4. Task Epic creation logged
5. Workspace Summary logged

### ⏳ Pending Updates

To complete full logging coverage, update these files:

1. **`doc_hooks/software_product_zenhub.py`**
   - Update `create_zenhub_workspace()` to use `execute_graphql_query_with_logging`

2. **`doctype/project_extension/project_extension.py`**
   - Update `create_zenhub_project_issue()` to use logging wrapper

3. **`api/zenhub.py`**
   - Add decorators to:
     - `get_sprint_data()`
     - `get_workspace_issues()`
     - `get_stakeholder_sprint_report()`
     - `get_project_summary()`
     - `get_task_summary()`

## How to Add Logging to New Endpoints

### Method 1: Using the Decorator (Recommended for Query Operations)

```python
from frappe_devsecops_dashboard.api.zenhub_api_decorator import log_zenhub_api_call

@frappe.whitelist()
@log_zenhub_api_call(
    operation_name="getSprintData",
    reference_doctype="Project",
    get_reference_docname=lambda kwargs: kwargs.get("project_id")
)
def get_sprint_data(project_id: str):
    # Your function code
    pass
```

### Method 2: Using the Wrapper (For Mutations/Complex Operations)

```python
from frappe_devsecops_dashboard.api.zenhub_graphql_logger import execute_graphql_query_with_logging

data, success = execute_graphql_query_with_logging(
    query=mutation,
    variables=variables,
    reference_doctype="Software Product",
    reference_docname=product_name,
    operation_name="createWorkspace",
    operation_type="Mutation"
)
```

### Method 3: Enhanced `execute_graphql_query` (For Existing Code)

```python
from frappe_devsecops_dashboard.api.zenhub import execute_graphql_query

# Old way (no logging)
response = execute_graphql_query(query, variables)

# New way (with logging)
response = execute_graphql_query(
    query,
    variables,
    log_to_db=True,
    reference_doctype="Project",
    reference_docname=project_id,
    operation_name="getProjectData"
)
```

## Viewing Logs

**URL:** `https://desk.kns.co.ke/app/zenhub-graphql-api-log`

### Filters Available
- Reference DocType (Software Product, Project, Task, etc.)
- Status (Success, Failed, Error, Timeout)
- Operation Type (Query, Mutation)
- GraphQL Operation Name
- HTTP Status Code
- Date Range

### Quick Filters
- Last 24 Hours
- Failed Operations
- Successful Operations

## Benefits

1. **Debugging** - See exact request/response for failed operations
2. **Monitoring** - Track API performance and success rates
3. **Auditing** - Know which user triggered which operation
4. **Troubleshooting** - Full error messages and tracebacks
5. **Performance Analysis** - Response time tracking

## Date Created

2026-01-22

## Next Steps

1. Update remaining API endpoints with logging
2. Create a dashboard for API call statistics
3. Set up alerts for repeated failures
4. Document rate limiting patterns

## Related Documentation

- [ZENHUB_API_LOGGING.md](./ZENHUB_API_LOGGING.md) - Full logging system documentation
- [API_ENDPOINTS_DOCUMENTATION.md](./API_ENDPOINTS_DOCUMENTATION.md) - Complete API reference
