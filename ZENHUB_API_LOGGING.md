# Zenhub GraphQL API Logging System

## Overview

A comprehensive logging system for all Zenhub GraphQL API interactions across Software Product, Project, and Task doctypes.

## Features

### 1. Zenhub GraphQL API Log DocType

**Location:** `frappe_devsecops_dashboard/doctype/zenhub_graphql_api_log/`

**Key Fields:**
- `reference_doctype` - Dynamic Link to Software Product, Project, or Task
- `reference_docname` - Name of the document being operated on
- `operation_type` - Query, Mutation, or Subscription
- `graphql_operation` - Name of the operation (e.g., "createWorkspace", "createIssue")
- `status` - Success, Failed, Partial Success, Timeout, or Error
- `http_status_code` - HTTP response code
- `response_time_ms` - API response time in milliseconds
- `request_payload` - Full GraphQL query with variables (JSON)
- `response_data` - API response (JSON)
- `error_message` - Error message if failed
- `error_traceback` - Python traceback for debugging

### 2. List View Features

**File:** `zenhub_graphql_api_log_list.js`

- **Color-coded status indicators:**
  - Green: Success
  - Red: Failed/Error
  - Orange: Partial Success
  - Yellow: Timeout

- **Quick filters:**
  - Last 24 Hours
  - Failed Operations
  - Successful Operations

- **Formatted columns:**
  - HTTP status codes with color coding
  - Response time with performance indicators (<500ms green, <1000ms orange, >1000ms red)
  - GraphQL operation names in code blocks

### 3. Form View Features

**File:** `zenhub_graphql_api_log.js`

- View related document button (navigates to Software Product/Project/Task)
- Status indicators with colors
- HTTP status code with colored indicator
- Retry button for failed operations (placeholder for future implementation)

### 4. Logging Wrapper Module

**File:** `api/zenhub_graphql_logger.py`

**Functions:**

```python
execute_graphql_query_with_logging(
    query,
    variables,
    reference_doctype,
    reference_docname,
    operation_name,
    operation_type="Mutation",
    token=None
)
```
- Executes GraphQL query with automatic logging
- Returns: `(response_data, success_bool)`

```python
log_async_operation_start(
    reference_doctype,
    reference_docname,
    operation_name,
    operation_type="Mutation"
)
```
- Creates log entry for async operations
- Returns: Log document name for later updates

```python
update_async_operation_log(
    log_name,
    status,
    response_data=None,
    error_message=None,
    http_status_code=None
)
```
- Updates existing log entry when async operation completes

## Integration Points

### Task Extension

**File:** `doctype/task_extension/task_extension.py`

The Task before_save hook now uses the logging wrapper:

```python
# Instead of direct requests.post()
data, success = execute_graphql_query_with_logging(
    query=mutation,
    variables=variables,
    reference_doctype="Task",
    reference_docname=task_id,
    operation_name="createEpicIssue",
    operation_type="Mutation",
    token=token
)
```

### Software Product Hook

**File:** `doc_hooks/software_product_zenhub.py`

Should be updated to use:
```python
from frappe_devsecops_dashboard.api.zenhub_graphql_logger import execute_graphql_query_with_logging

# Replace execute_graphql_query() calls with execute_graphql_query_with_logging()
```

### Project Extension

**File:** `doctype/project_extension/project_extension.py`

Should be updated similarly for Project Issue creation logging.

## Usage Examples

### Example 1: Logging a Mutation

```python
from frappe_devsecops_dashboard.api.zenhub_graphql_logger import execute_graphql_query_with_logging

mutation = """
mutation CreateWorkspace($name: String!) {
  createWorkspace(input: {name: $name}) {
    workspace {
      id
      name
    }
  }
}
"""

variables = {"name": "DSO-MyProduct"}

response, success = execute_graphql_query_with_logging(
    query=mutation,
    variables=variables,
    reference_doctype="Software Product",
    reference_docname="PRD-001",
    operation_name="createWorkspace",
    operation_type="Mutation"
)

if success:
    workspace_id = response["data"]["createWorkspace"]["workspace"]["id"]
```

### Example 2: Logging Async Operations

```python
from frappe_devsecops_dashboard.api.zenhub_graphql_logger import (
    log_async_operation_start,
    update_async_operation_log
)

# Start async operation
log_name = log_async_operation_start(
    reference_doctype="Project",
    reference_docname="PRJ-001",
    operation_name="createProjectIssue"
)

# ... perform async work ...

# Update when complete
update_async_operation_log(
    log_name=log_name,
    status="Success",
    response_data={"issue_id": "Z2lkOi8v..."},
    http_status_code=200
)
```

## Benefits

1. **Complete Audit Trail** - Every Zenhub API call is logged with full request/response
2. **Easy Debugging** - Quickly identify failed API calls and see exact errors
3. **Performance Monitoring** - Track API response times
4. **Troubleshooting** - View exact payloads sent to Zenhub API
5. **User Context** - Know which document triggered which API call
6. **Async Operation Tracking** - Log background jobs that create Epics/Projects

## Permissions

- **System Manager:** Full access (create, read, write, delete, export)
- **All:** Read-only access (view, export, print)

## Naming

Auto-generated format: `ZHLOG-####`

Examples:
- `ZHLOG-0001`
- `ZHLOG-0042`
- `ZHLOG-1337`

## Filtering & Search

The doctype is fully searchable and filterable by:
- Reference DocType (Software Product, Project, Task)
- Reference Document name
- Operation Type (Query, Mutation, Subscription)
- Status (Success, Failed, Error, Timeout)
- GraphQL Operation name
- HTTP Status Code
- Date range

## Future Enhancements

1. **Retry Functionality** - Implement retry button for failed operations
2. **Dashboard** - Create a dashboard showing API call statistics
3. **Alerts** - Send notifications for repeated failures
4. **Rate Limiting** - Track and alert on API rate limits
5. **Performance Reports** - Generate reports on API performance trends

## Files Created

```
frappe_devsecops_dashboard/
├── frappe_devsecops_dashboard/
│   └── doctype/
│       └── zenhub_graphql_api_log/
│           ├── __init__.py
│           ├── zenhub_graphql_api_log.json
│           ├── zenhub_graphql_api_log.py
│           ├── zenhub_graphql_api_log.js
│           └── zenhub_graphql_api_log_list.js
└── api/
    └── zenhub_graphql_logger.py
```

## Date Created

2026-01-22

## Author

Frappe DevSecOps Dashboard Team
