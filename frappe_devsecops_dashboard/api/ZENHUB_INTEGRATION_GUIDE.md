# Zenhub GraphQL API Integration Guide

## Overview

This guide explains how to use the Zenhub GraphQL API integration to fetch sprint information from Zenhub workspaces into the Frappe DevSecOps Dashboard.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Configuration](#configuration)
3. [API Endpoint](#api-endpoint)
4. [Response Format](#response-format)
5. [Error Handling](#error-handling)
6. [Testing](#testing)
7. [Troubleshooting](#troubleshooting)
8. [Performance Optimization](#performance-optimization)

---

## Prerequisites

### 1. Zenhub Account & API Token

You need:
- A Zenhub account with access to workspaces
- A Zenhub API token (Personal Access Token)

**How to get a Zenhub API token**:
1. Log in to Zenhub (https://app.zenhub.com)
2. Go to Settings → API Tokens
3. Click "Generate New Token"
4. Copy the token (you won't be able to see it again)

### 2. Frappe Doctypes

Ensure these doctypes exist:

#### **Zenhub Settings** (Singleton)
- Field: `zenhub_token` (Password field type)

#### **Project** (Standard Frappe doctype)
- Custom Field: `custom_zenhub_workspace_id` (Data field type)

---

## Configuration

### Step 1: Configure Zenhub Settings

1. Navigate to: **Desk → Zenhub Settings**
2. Enter your Zenhub API token in the `zenhub_token` field
3. Save the document

**Important**: The token is stored securely as a Password field and is cached for 1 hour to improve performance.

### Step 2: Configure Project with Workspace ID

1. Open a Project document
2. Find the `custom_zenhub_workspace_id` field
3. Enter the Zenhub workspace ID

**How to find your Zenhub workspace ID**:
- Option 1: Check the URL when viewing a workspace in Zenhub: `https://app.zenhub.com/workspaces/{workspace_id}/...`
- Option 2: Use the Zenhub GraphQL API explorer to query your workspaces

---

## API Endpoint

### Endpoint URL
```
GET/POST /api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data
```

### Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `project_id` | string | Yes | - | The Frappe Project doctype name/ID |
| `sprint_states` | string | No | "ACTIVE,CLOSED" | Comma-separated sprint states to filter |

### Sprint States

Valid sprint states:
- `ACTIVE` - Currently active sprints
- `CLOSED` - Completed sprints
- `FUTURE` - Planned future sprints

**Examples**:
- `sprint_states=ACTIVE` - Only active sprints
- `sprint_states=ACTIVE,CLOSED` - Active and closed sprints
- `sprint_states=ACTIVE,FUTURE` - Active and future sprints

### Example Requests

#### Using cURL
```bash
# Fetch active and closed sprints
curl -X GET "https://your-site.com/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data?project_id=PROJ-001" \
  -H "Authorization: token YOUR_FRAPPE_API_KEY:YOUR_FRAPPE_API_SECRET"

# Fetch only active sprints
curl -X GET "https://your-site.com/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data?project_id=PROJ-001&sprint_states=ACTIVE" \
  -H "Authorization: token YOUR_FRAPPE_API_KEY:YOUR_FRAPPE_API_SECRET"
```

#### Using JavaScript (Frontend)
```javascript
import api from '../services/api'

// Fetch sprint data
const response = await fetch(
  '/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data',
  {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json'
    },
    params: {
      project_id: 'PROJ-001',
      sprint_states: 'ACTIVE,CLOSED'
    }
  }
)

const data = await response.json()
console.log(data.message)
```

#### Using Python (Backend)
```python
import frappe
from frappe_devsecops_dashboard.api.zenhub import get_sprint_data

# Fetch sprint data
result = get_sprint_data(project_id="PROJ-001", sprint_states="ACTIVE")
print(result)
```

---

## Response Format

### Success Response

```json
{
  "success": true,
  "workspace_id": "workspace_123abc",
  "workspace_name": "My DevOps Workspace",
  "sprints": [
    {
      "sprint_id": "sprint_456def",
      "sprint_name": "Sprint 15 - Q4 2025",
      "state": "active",
      "start_date": "2025-09-01",
      "end_date": "2025-09-14",
      "total_story_points": 50,
      "completed_story_points": 30,
      "remaining_story_points": 20,
      "utilization_percentage": 60.0,
      "team_members": [
        {
          "id": "user_789ghi",
          "name": "John Doe",
          "username": "johndoe"
        },
        {
          "id": "user_012jkl",
          "name": "Jane Smith",
          "username": "janesmith"
        }
      ],
      "issues": {
        "total": 15,
        "completed": 8,
        "in_progress": 5,
        "blocked": 2
      },
      "blockers": [
        {
          "issue_id": "issue_345mno",
          "title": "API integration blocked by infrastructure setup",
          "blocked_by": ["issue_678pqr"]
        },
        {
          "issue_id": "issue_901stu",
          "title": "Frontend deployment waiting for backend",
          "blocked_by": ["issue_234vwx"]
        }
      ]
    }
  ]
}
```

### Field Descriptions

#### Sprint Fields

| Field | Type | Description |
|-------|------|-------------|
| `sprint_id` | string | Unique Zenhub sprint identifier |
| `sprint_name` | string | Human-readable sprint name |
| `state` | string | Sprint state: "active", "closed", or "future" |
| `start_date` | string | Sprint start date (ISO 8601 format) |
| `end_date` | string | Sprint end date (ISO 8601 format) |
| `total_story_points` | integer | Total story points in the sprint |
| `completed_story_points` | integer | Story points completed |
| `remaining_story_points` | integer | Story points remaining |
| `utilization_percentage` | float | Team utilization (0-100%) |

#### Team Members

| Field | Type | Description |
|-------|------|-------------|
| `id` | string | Zenhub user ID |
| `name` | string | User's full name |
| `username` | string | Zenhub username |

#### Issues

| Field | Type | Description |
|-------|------|-------------|
| `total` | integer | Total number of issues in sprint |
| `completed` | integer | Number of completed issues |
| `in_progress` | integer | Number of in-progress issues |
| `blocked` | integer | Number of blocked issues |

#### Blockers

| Field | Type | Description |
|-------|------|-------------|
| `issue_id` | string | ID of the blocked issue |
| `title` | string | Title of the blocked issue |
| `blocked_by` | array | List of issue IDs blocking this issue |

---

## Error Handling

### Error Response Format

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "error_type": "validation_error|authentication_error|api_error"
}
```

### Error Types

#### 1. Validation Errors (`validation_error`)

**Missing project_id**:
```json
{
  "success": false,
  "error": "project_id parameter is required",
  "error_type": "validation_error"
}
```

**Project not found**:
```json
{
  "success": false,
  "error": "Project 'PROJ-001' not found",
  "error_type": "validation_error"
}
```

**Missing workspace ID**:
```json
{
  "success": false,
  "error": "Zenhub workspace ID not configured for project 'PROJ-001'. Please set the 'custom_zenhub_workspace_id' field.",
  "error_type": "validation_error"
}
```

**Missing Zenhub token**:
```json
{
  "success": false,
  "error": "Zenhub API token not configured. Please set the token in Zenhub Settings.",
  "error_type": "validation_error"
}
```

#### 2. Authentication Errors (`authentication_error`)

**Invalid token**:
```json
{
  "success": false,
  "error": "Zenhub API authentication failed. Please check your API token.",
  "error_type": "authentication_error"
}
```

#### 3. API Errors (`api_error`)

**Rate limit exceeded**:
```json
{
  "success": false,
  "error": "Zenhub API rate limit exceeded. Please try again later.",
  "error_type": "api_error"
}
```

**Network timeout**:
```json
{
  "success": false,
  "error": "Zenhub API request timed out. Please try again.",
  "error_type": "api_error"
}
```

**Connection error**:
```json
{
  "success": false,
  "error": "Failed to connect to Zenhub API. Please check your network connection.",
  "error_type": "api_error"
}
```

---

## Testing

### Manual Testing Steps

#### 1. Setup Test Data

```python
# In Frappe console (bench console)
import frappe

# Create or update Zenhub Settings
zenhub_settings = frappe.get_single("Zenhub Settings")
zenhub_settings.zenhub_token = "your_zenhub_api_token_here"
zenhub_settings.save()

# Update a Project with workspace ID
project = frappe.get_doc("Project", "PROJ-001")
project.custom_zenhub_workspace_id = "your_workspace_id_here"
project.save()
```

#### 2. Test the API Endpoint

**Option A: Using Frappe Console**
```python
from frappe_devsecops_dashboard.api.zenhub import get_sprint_data

result = get_sprint_data(project_id="PROJ-001")
print(json.dumps(result, indent=2))
```

**Option B: Using cURL**
```bash
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data?project_id=PROJ-001"
```

**Option C: Using Postman**
1. Create a new GET request
2. URL: `http://localhost:8000/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data`
3. Add query parameter: `project_id` = `PROJ-001`
4. Send request

#### 3. Verify Response

Check that the response includes:
- ✅ `success: true`
- ✅ `workspace_id` matches your configured ID
- ✅ `sprints` array contains sprint data
- ✅ Each sprint has all required fields
- ✅ Metrics are calculated correctly

---

## Troubleshooting

### Issue: "Zenhub Settings not found"

**Cause**: Zenhub Settings doctype doesn't exist or hasn't been created.

**Solution**:
1. Check if the doctype exists: `bench list-doctypes | grep "Zenhub Settings"`
2. If missing, create the doctype with a `zenhub_token` Password field
3. Create a new Zenhub Settings document

### Issue: "Project not found"

**Cause**: The project_id doesn't exist in the database.

**Solution**:
1. Verify the project exists: `frappe.db.exists("Project", "PROJ-001")`
2. Check for typos in the project ID
3. Ensure you have permission to access the project

### Issue: "Authentication failed"

**Cause**: Invalid or expired Zenhub API token.

**Solution**:
1. Generate a new token from Zenhub
2. Update Zenhub Settings with the new token
3. Clear the cache: `frappe.cache().delete_value("zenhub_api_token")`

### Issue: "Rate limit exceeded"

**Cause**: Too many API requests to Zenhub.

**Solution**:
1. Wait for the rate limit to reset (usually 1 hour)
2. Implement request throttling in your frontend
3. Consider caching sprint data locally

### Issue: "GraphQL errors"

**Cause**: Invalid workspace ID or malformed query.

**Solution**:
1. Verify the workspace ID is correct
2. Check Zenhub API documentation for schema changes
3. Review error logs: `bench logs`

---

## Performance Optimization

### 1. Token Caching

The Zenhub token is automatically cached for 1 hour to reduce database queries.

**Clear cache manually**:
```python
frappe.cache().delete_value("zenhub_api_token")
```

### 2. Query Optimization

The GraphQL query is optimized to:
- Fetch only the first 10 sprints (pagination)
- Request only required fields
- Filter by sprint states to reduce data transfer

### 3. Response Caching (Recommended)

Consider caching sprint data in your frontend:

```javascript
// Cache sprint data for 5 minutes
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const cachedData = localStorage.getItem(`sprint_data_${projectId}`)
if (cachedData) {
  const { data, timestamp } = JSON.parse(cachedData)
  if (Date.now() - timestamp < CACHE_TTL) {
    return data
  }
}

// Fetch fresh data
const freshData = await fetchSprintData(projectId)
localStorage.setItem(`sprint_data_${projectId}`, JSON.stringify({
  data: freshData,
  timestamp: Date.now()
}))
```

### 4. Rate Limiting Awareness

Zenhub API has rate limits:
- **5,000 requests per hour** per token
- Monitor your usage to avoid hitting limits
- Implement exponential backoff for retries

---

## Advanced Usage

### Custom Sprint States

Fetch only specific sprint states:

```python
# Only active sprints
result = get_sprint_data(project_id="PROJ-001", sprint_states="ACTIVE")

# Active and future sprints
result = get_sprint_data(project_id="PROJ-001", sprint_states="ACTIVE,FUTURE")
```

### Batch Processing

Fetch sprint data for multiple projects:

```python
import frappe
from frappe_devsecops_dashboard.api.zenhub import get_sprint_data

projects = frappe.get_all("Project", filters={"custom_zenhub_workspace_id": ["!=", ""]})

results = {}
for project in projects:
    results[project.name] = get_sprint_data(project_id=project.name)

print(results)
```

---

## Security Considerations

1. **Token Security**: The Zenhub token is stored as a Password field and never exposed in API responses
2. **Access Control**: Ensure proper Frappe permissions are set on the API endpoint
3. **HTTPS**: Always use HTTPS in production to encrypt API communications
4. **Token Rotation**: Regularly rotate your Zenhub API tokens

---

## Support

For issues or questions:
1. Check the [Troubleshooting](#troubleshooting) section
2. Review Frappe error logs: `bench logs`
3. Consult Zenhub API documentation: https://developers.zenhub.com/graphql-api-docs

---

**Last Updated**: 2025-09-30  
**Version**: 1.0.0

