# Zenhub Workspace API Documentation

This document describes the Zenhub Workspace Helper class and API layer for the Frappe DevSecOps Dashboard.

## Overview

The Zenhub Workspace API provides a comprehensive interface for querying and analyzing Zenhub workspace data. It includes:

- **ZenhubWorkspaceHelper**: A Python helper class for workspace operations
- **zenhub_workspace_api**: REST API endpoints for accessing workspace data
- Full hierarchical structure support (Project → Epic → Sprint → Task)
- Team utilization metrics and analysis
- Kanban status tracking with status IDs
- Filtering by project, epic, and other criteria

## Features

### 1. Workspace Summary with Hierarchy
Get a complete JSON summary of your workspace organized hierarchically:
```
Workspace
├── Projects
│   ├── Epics
│   │   ├── Sprints
│   │   │   └── Tasks (with kanban_status_id, assignees, story points)
├── Sprints (flat view)
├── Kanban Statuses (distribution)
└── Team Members
```

### 2. Filtering Capabilities
- Filter by Project ID
- Filter by Epic ID
- Filter by Kanban Status
- Combined filters in a single request

### 3. Team Utilization Analysis
Get detailed team metrics:
- Task count per team member
- Story points assigned
- Completed story points
- Utilization percentage
- Task completion percentage

### 4. Kanban Status Tracking
Every task includes:
- `kanban_status_id`: The unique ID of the kanban pipeline status
- Actual status label (e.g., "In Progress", "Review/QA UAT", "Done")

## Installation

The helper class and API are included in the frappe_devsecops_dashboard app. No additional installation is required.

### Files
- **Helper Class**: `frappe_devsecops_dashboard/api/zenhub_workspace_helper.py`
- **API Endpoints**: `frappe_devsecops_dashboard/api/zenhub_workspace_api.py`
- **Tests**: `frappe_devsecops_dashboard/tests/test_zenhub_workspace_helper.py`

## Authentication

The API uses Zenhub credentials configured in **Zenhub Settings** DocType:
- Token is automatically retrieved and cached
- No need to pass authentication in API calls
- Uses Frappe's permission system

## API Endpoints

### 1. Get Workspace Summary

**Endpoint**: `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary`

**Method**: GET

**Parameters**:
- `workspace_id` (required): Zenhub workspace ID

**Example Request**:
```bash
curl "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="
```

**Response**:
```json
{
  "success": true,
  "workspace": {
    "id": "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=",
    "name": "tiberbu.com",
    "projects": [
      {
        "id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA==",
        "number": 4840,
        "title": "Healthpro Pharma",
        "type": "Project",
        "epics": [
          {
            "id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMDU4Ng==",
            "number": 4839,
            "title": "Eprescription",
            "status": "Icebox",
            "estimate": null,
            "sprints": [
              {
                "id": "Z2lkOi8vcmFwdG9yL1NwcmludC80MDA4Njk5",
                "name": "Sprint: Jan 5 - Jan 16, 2026",
                "tasks": [
                  {
                    "id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4NTI2NjAwNQ==",
                    "number": 5738,
                    "title": "Form updates",
                    "status": "Sprint Backlog",
                    "kanban_status_id": "Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM1MDAxODA=",
                    "estimate": 2,
                    "assignees": [
                      {
                        "id": "Z2lkOi8vcmFwdG9yL1plbmh1YlVzZXIvMTk2OTk5NQ==",
                        "name": "Irad",
                        "username": "irad"
                      }
                    ]
                  }
                ]
              }
            ]
          }
        ]
      }
    ],
    "sprints": [...],
    "kanban_statuses": {
      "Sprint Backlog": 8,
      "In Progress": 0,
      "Review/QA UAT": 59,
      "Done/Ready to Deploy Prod": 3
    },
    "team_members": [
      {
        "id": "Z2lkOi8vcmFwdG9yL1plbmh1YlVzZXIvMTk2OTk5NQ==",
        "name": "Irad",
        "username": "irad"
      }
    ],
    "summary": {
      "total_issues": 120,
      "total_story_points": 450,
      "completion_rate": 75.5
    }
  }
}
```

---

### 2. Filter by Project

**Endpoint**: `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project`

**Method**: GET

**Parameters**:
- `workspace_id` (required): Zenhub workspace ID
- `project_id` (required): Project ID to filter by

**Example Request**:
```bash
curl "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=&project_id=Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA=="
```

**Response**:
```json
{
  "success": true,
  "workspace": {
    "projects": [
      {
        "id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA==",
        "title": "Healthpro Pharma",
        "epics": [...]
      }
    ],
    "sprints": [...],
    "kanban_statuses": {...},
    "team_members": [...]
  },
  "project_id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA==",
  "task_count": 45
}
```

---

### 3. Filter by Epic

**Endpoint**: `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic`

**Method**: GET

**Parameters**:
- `workspace_id` (required): Zenhub workspace ID
- `epic_id` (required): Epic ID to filter by

**Example Request**:
```bash
curl "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=&epic_id=Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMDU4Ng=="
```

**Response**:
```json
{
  "success": true,
  "workspace": {...},
  "epic_id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMDU4Ng==",
  "epic_title": "Eprescription",
  "task_count": 32
}
```

---

### 4. Get Team Utilization

**Endpoint**: `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization`

**Method**: GET

**Parameters**:
- `workspace_id` (required): Zenhub workspace ID

**Example Request**:
```bash
curl "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="
```

**Response**:
```json
{
  "success": true,
  "team_members": [
    {
      "id": "Z2lkOi8vcmFwdG9yL1plbmh1YlVzZXIvMTk2OTk5NQ==",
      "name": "Irad",
      "task_count": 12,
      "story_points": 45,
      "completed_points": 32,
      "completed_tasks": 8,
      "utilization_percentage": 71.11,
      "task_completion_percentage": 66.67
    },
    {
      "id": "Z2lkOi8vcmFwdG9yL1plbmh1YlVzZXIvMTk5ODY1Mg==",
      "name": "Koech",
      "task_count": 15,
      "story_points": 52,
      "completed_points": 38,
      "completed_tasks": 10,
      "utilization_percentage": 73.08,
      "task_completion_percentage": 66.67
    }
  ],
  "total_members": 2,
  "average_utilization": 72.1
}
```

---

### 5. Get Workspace Summary with Filters

**Endpoint**: `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary_with_filters`

**Method**: GET

**Parameters**:
- `workspace_id` (required): Zenhub workspace ID
- `project_id` (optional): Project ID to filter by
- `epic_id` (optional): Epic ID to filter by
- `status` (optional): Kanban status to filter by

**Example Request**:
```bash
curl "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary_with_filters?workspace_id=Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=&project_id=Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA=="
```

**Response**:
```json
{
  "success": true,
  "workspace": {...},
  "team_utilization": [...],
  "applied_filters": {
    "project_id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA==",
    "epic_id": null,
    "status": null
  }
}
```

---

## Usage Examples

### Python Usage

```python
from frappe_devsecops_dashboard.api.zenhub_workspace_helper import ZenhubWorkspaceHelper

# Initialize with workspace ID
workspace_id = "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="
helper = ZenhubWorkspaceHelper(workspace_id)

# Get full workspace summary
summary = helper.get_workspace_summary_json()
print(f"Total issues: {summary['workspace']['summary']['total_issues']}")

# Filter by project
project_data = helper.filter_by_project("Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMTUxOA==")
print(f"Project task count: {project_data['task_count']}")

# Filter by epic
epic_data = helper.filter_by_epic("Z2lkOi8vcmFwdG9yL0lzc3VlLzM4MjMwMDU4Ng==")
print(f"Epic: {epic_data['epic_title']}")

# Get team utilization
utilization = helper.get_team_utilization()
for member in utilization['team_members']:
    print(f"{member['name']}: {member['utilization_percentage']}%")
```

### JavaScript/Frontend Usage

```javascript
// Get workspace summary
fetch('/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary?workspace_id=...')
  .then(r => r.json())
  .then(data => {
    console.log(`Workspace: ${data.workspace.name}`);
    console.log(`Total issues: ${data.workspace.summary.total_issues}`);
  });

// Get team utilization
fetch('/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization?workspace_id=...')
  .then(r => r.json())
  .then(data => {
    data.team_members.forEach(member => {
      console.log(`${member.name}: ${member.utilization_percentage}%`);
    });
  });
```

---

## Kanban Status IDs

Each task includes a `kanban_status_id` which is the unique identifier for its pipeline status in Zenhub.

Common Kanban statuses:
- **Sprint Backlog**: `Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM1MDAxODA=`
- **In Progress**: `Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM1MDAxODE=`
- **Review/QA UAT**: `Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM1MDAxODI=`
- **Done/Ready to Deploy**: `Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM1MDAxODM=`

You can use these IDs to:
- Filter tasks by status programmatically
- Map status changes
- Create status-based workflows
- Generate status-specific reports

---

## Data Structure

### Task Object
```json
{
  "id": "Z2lkOi8vcmFwdG9yL0lzc3VlLzM4NTI2NjAwNQ==",
  "number": 5738,
  "title": "Form updates",
  "status": "Sprint Backlog",
  "kanban_status_id": "Z2lkOi8vcmFwdG9yL1BpcGVsaW5lLzM1MDAxODA=",
  "estimate": 2,
  "assignees": [
    {
      "id": "Z2lkOi8vcmFwdG9yL1plbmh1YlVzZXIvMTk2OTk5NQ==",
      "name": "Irad",
      "username": "irad"
    }
  ]
}
```

### Team Member Utilization Object
```json
{
  "id": "Z2lkOi8vcmFwdG9yL1plbmh1YlVzZXIvMTk2OTk5NQ==",
  "name": "Irad",
  "task_count": 12,
  "story_points": 45,
  "completed_points": 32,
  "completed_tasks": 8,
  "utilization_percentage": 71.11,
  "task_completion_percentage": 66.67
}
```

---

## Error Handling

All endpoints return a standard error response:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "error_type": "validation_error|authentication_error|api_error|not_found_error"
}
```

### Common Error Types
- `validation_error`: Missing or invalid parameters
- `authentication_error`: Failed Zenhub authentication
- `api_error`: Unexpected API error
- `not_found_error`: Resource not found

---

## Caching

The helper class uses Frappe's caching system for performance:
- Token caching: 1 hour
- Team member data caching: 24 hours
- Workspace summary caching: 5 minutes

Cache can be bypassed by passing `force_refresh=true` in API calls.

---

## Testing

Run the test suite:

```bash
bench run-tests frappe_devsecops_dashboard.tests.test_zenhub_workspace_helper
```

---

## Performance Considerations

- **Large workspaces**: The first call to get workspace summary may take longer as it queries all data
- **Team utilization**: Calculated from full workspace data, use after getting summary
- **Filtering**: Applied locally after fetching complete workspace data (no server-side filtering in MCP)
- **Caching**: Leverage Frappe's cache for repeated calls to same workspace

---

## Troubleshooting

### "Zenhub token not configured"
- Ensure Zenhub Settings DocType is configured
- Verify the Zenhub API token is set

### "Workspace not found"
- Verify the workspace_id is correct
- Check that the token has access to this workspace

### No team members showing up
- Ensure tasks have assignees
- Check that Zenhub user data is properly synced

---

## License

MIT License - See LICENSE file in root directory
