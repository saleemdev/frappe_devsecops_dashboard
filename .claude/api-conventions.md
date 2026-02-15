# API Conventions - DevSecOps Dashboard

## API URL Structure

### Base URL

```
http://localhost:8000/api/method/frappe_devsecops_dashboard.api.{module}.{function}
```

### URL Pattern

```
/api/method/{app_name}.api.{module_name}.{function_name}
```

**Examples:**
- `/api/method/frappe_devsecops_dashboard.api.dashboard.get_dashboard_data`
- `/api/method/frappe_devsecops_dashboard.api.incidents.get_incidents`
- `/api/method/frappe_devsecops_dashboard.api.change_request.create_change_request`

## Standard Response Format

### Success Response

```json
{
  "success": true,
  "data": [...],
  "total": 100,
  "message": "Operation completed successfully"
}
```

### Error Response

```json
{
  "success": false,
  "error": "Error message",
  "error_type": "validation_error|permission_error|not_found|server_error",
  "details": {
    "field": "error detail"
  }
}
```

### List Response with Pagination

```json
{
  "success": true,
  "data": [
    {
      "id": "item-001",
      "name": "Item Name",
      "status": "Active"
    }
  ],
  "total": 150,
  "page": 1,
  "page_size": 10,
  "message": "Items retrieved successfully"
}
```

## HTTP Status Codes

| Status Code | Meaning | When to Use |
|-------------|---------|-------------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (creation) |
| 204 | No Content | Successful DELETE |
| 400 | Bad Request | Validation errors, malformed request |
| 403 | Forbidden | Permission denied |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Unexpected server errors |

## Authentication

### Session-Based Authentication

All API requests require a valid Frappe session:

1. User logs in through Frappe login page
2. Session cookie is set automatically
3. All subsequent API calls include session cookie
4. CSRF token required for non-GET requests

### CSRF Token

```javascript
// Frontend automatically includes CSRF token
const client = axios.create({
  withCredentials: true,
  headers: {
    'X-Frappe-CSRF-Token': window.csrf_token
  }
})
```

### Authorization Header (Alternative)

```bash
# Using API key/secret
curl -X GET http://localhost:8000/api/method/... \
  -H "Authorization: token api_key:api_secret"
```

## Available API Endpoints

### Dashboard APIs

#### Get Dashboard Data
```http
GET /api/method/frappe_devsecops_dashboard.api.dashboard.get_dashboard_data
```

**Parameters:**
- `project_id` (optional): Filter by project

**Response:**
```json
{
  "success": true,
  "data": {
    "total_projects": 15,
    "active_incidents": 5,
    "pending_change_requests": 3,
    "metrics": {
      "uptime": "99.9%",
      "deployment_frequency": "2.5/day"
    }
  }
}
```

#### Get Project Details
```http
GET /api/method/frappe_devsecops_dashboard.api.dashboard.get_project_details
```

**Parameters:**
- `project_id` (required): Project ID

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "Project Name",
    "status": "Active",
    "tasks": [],
    "team_members": []
  }
}
```

### Incident APIs

#### Get Incidents
```http
GET /api/method/frappe_devsecops_dashboard.api.incidents.get_incidents
```

**Parameters:**
- `filters` (optional): JSON string of filters
  - `status`: Active, Resolved, Closed
  - `priority`: High, Medium, Low
  - `severity`: Critical, Major, Minor
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 10)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "INC-001",
      "title": "Database Connection Timeout",
      "status": "Active",
      "priority": "High",
      "severity": "Critical",
      "assigned_to": "user@example.com",
      "created": "2024-02-14 10:30:00"
    }
  ],
  "total": 50,
  "page": 1,
  "page_size": 10
}
```

#### Create Incident
```http
POST /api/method/frappe_devsecops_dashboard.api.incidents.create_incident
```

**Request Body:**
```json
{
  "title": "New Incident",
  "description": "Incident description",
  "priority": "High",
  "severity": "Major",
  "affected_systems": ["System A", "System B"],
  "assigned_to": "user@example.com"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "INC-002",
    "title": "New Incident",
    ...
  },
  "message": "Incident created successfully"
}
```

#### Update Incident
```http
PUT /api/method/frappe_devsecops_dashboard.api.incidents.update_incident
```

**Request Body:**
```json
{
  "name": "INC-001",
  "status": "Resolved",
  "resolution": "Fixed database connection pool settings"
}
```

#### Delete Incident
```http
DELETE /api/method/frappe_devsecops_dashboard.api.incidents.delete_incident
```

**Parameters:**
- `name` (required): Incident ID

### Change Request APIs

#### Get Change Requests
```http
GET /api/method/frappe_devsecops_dashboard.api.change_request.get_change_requests
```

**Parameters:**
- `filters` (optional): JSON filters
  - `status`: Draft, Submitted, Approved, Rejected
  - `approval_status`: Pending, Approved, Rejected
- `page`, `page_size`: Pagination

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "CR-001",
      "cr_number": "CR-2024-001",
      "title": "Update Production Database Schema",
      "status": "Submitted",
      "approval_status": "Pending",
      "approvers": [
        {
          "user": "approver@example.com",
          "approval_status": "Pending"
        }
      ]
    }
  ],
  "total": 25
}
```

#### Create Change Request
```http
POST /api/method/frappe_devsecops_dashboard.api.change_request.create_change_request
```

**Request Body:**
```json
{
  "title": "Change Title",
  "description": "Change description",
  "change_type": "Standard|Emergency|Normal",
  "priority": "High|Medium|Low",
  "implementation_date": "2024-03-01",
  "approvers": [
    {"user": "approver1@example.com", "role": "Technical Approver"},
    {"user": "approver2@example.com", "role": "Business Approver"}
  ]
}
```

#### Update Change Request
```http
PUT /api/method/frappe_devsecops_dashboard.api.change_request.update_change_request
```

#### Approve/Reject Change Request
```http
POST /api/method/frappe_devsecops_dashboard.api.change_request.approve_change_request
POST /api/method/frappe_devsecops_dashboard.api.change_request.reject_change_request
```

**Request Body:**
```json
{
  "name": "CR-001",
  "comments": "Approved after review"
}
```

### Password Vault APIs

#### Get Vault Entries
```http
GET /api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entries
```

**Parameters:**
- `filters` (optional): Category, project

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "PWD-001",
      "title": "Production Database Password",
      "username": "db_admin",
      "category": "Database",
      "project": "Project A",
      "is_active": 1
    }
  ]
}
```

**Note:** Password field is never returned in list APIs for security

#### Get Single Password Entry
```http
GET /api/method/frappe_devsecops_dashboard.api.password_vault.get_password
```

**Parameters:**
- `name` (required): Password entry ID

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "PWD-001",
    "title": "Production Database Password",
    "username": "db_admin",
    "password": "decrypted_password",  // Only returned for single entry
    "url": "https://db.example.com",
    "notes": "Additional notes"
  }
}
```

#### Create Password Entry
```http
POST /api/method/frappe_devsecops_dashboard.api.password_vault.create_vault_entry
```

**Request Body:**
```json
{
  "title": "Service Password",
  "username": "admin",
  "password": "secure_password",
  "category": "API Keys",
  "project": "Project B",
  "url": "https://service.example.com",
  "notes": "Service API credentials"
}
```

#### Share Password
```http
POST /api/method/frappe_devsecops_dashboard.api.password_vault.share_password
```

**Request Body:**
```json
{
  "password_entry": "PWD-001",
  "recipient_email": "user@example.com",
  "expires_in_hours": 24,
  "message": "Sharing password for service access"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "share_link": "https://app.example.com/password-share/abc123xyz",
    "expires_at": "2024-02-15 10:30:00",
    "access_token": "abc123xyz"
  },
  "message": "Password share link created"
}
```

### ZenHub APIs

#### Get Workspace Summary
```http
GET /api/method/frappe_devsecops_dashboard.api.zenhub.get_workspace_summary
```

**Parameters:**
- `workspace_id` (required): ZenHub workspace ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "workspace-123",
    "name": "DSO-Project A",
    "projects": [],
    "epics": [],
    "sprints": []
  }
}
```

#### Get Sprint Data
```http
GET /api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data
```

**Parameters:**
- `sprint_id` (required): Sprint ID

#### Get Stakeholder Sprint Report
```http
GET /api/method/frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report
```

**Parameters:**
- `workspace_id` (required)
- `sprint_id` (optional)

### API Routes Management

#### Get API Routes
```http
GET /api/method/frappe_devsecops_dashboard.api.api_routes.get_api_routes
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "ROUTE-001",
      "route_name": "User Service",
      "uri_path": "/api/v1/users",
      "software_product": "Product A",
      "api_version": "v1",
      "api_keys": [
        {
          "key_name": "Production Key",
          "is_active": 1
        }
      ]
    }
  ]
}
```

#### Create API Route
```http
POST /api/method/frappe_devsecops_dashboard.api.api_routes.create_api_route
```

**Request Body:**
```json
{
  "route_name": "New Route",
  "uri_path": "/api/v1/resource",
  "software_product": "Product Name",
  "api_version": "v1",
  "methods": ["GET", "POST"],
  "api_keys": [
    {
      "key_name": "Test Key",
      "api_key": "generated_key_here"
    }
  ]
}
```

#### Sync Route to APISIX
```http
POST /api/method/frappe_devsecops_dashboard.api.api_routes.sync_route_to_apisix
```

**Parameters:**
- `route_name` (required): Route ID

### Product KPI APIs

#### Get Product KPIs
```http
GET /api/method/frappe_devsecops_dashboard.api.product_kpi.get_product_kpis
```

**Parameters:**
- `product_id` (required)
- `date_range` (optional): "7days", "30days", "90days"

**Response:**
```json
{
  "success": true,
  "data": {
    "deployment_frequency": 2.5,
    "lead_time": 4.2,
    "mttr": 1.5,
    "change_failure_rate": 0.05
  }
}
```

### Wiki APIs

#### Get Wiki Pages
```http
GET /api/method/frappe_devsecops_dashboard.api.wiki.get_wiki_pages
```

#### Create Wiki Page
```http
POST /api/method/frappe_devsecops_dashboard.api.wiki.create_wiki_page
```

**Request Body:**
```json
{
  "title": "Page Title",
  "content": "Markdown content here",
  "space": "Space Name",
  "tags": ["tag1", "tag2"]
}
```

## Filtering and Pagination

### Filter Format

Filters can be passed as JSON string or object:

**Simple Filters:**
```json
{
  "status": "Active",
  "priority": "High"
}
```

**Advanced Filters:**
```json
{
  "status": ["in", ["Active", "Pending"]],
  "created": [">", "2024-01-01"],
  "name": ["like", "%search%"]
}
```

**Filter Operators:**
- `=` - Equals (default)
- `!=` - Not equals
- `>` - Greater than
- `>=` - Greater than or equal
- `<` - Less than
- `<=` - Less than or equal
- `like` - Pattern match (use % as wildcard)
- `not like` - Negative pattern match
- `in` - In list
- `not in` - Not in list
- `is` - Is null/not null
- `between` - Between two values

### Pagination Parameters

```
page=1              # Page number (1-indexed)
page_size=10        # Items per page
```

**Response includes:**
```json
{
  "data": [...],
  "total": 150,
  "page": 1,
  "page_size": 10
}
```

## Error Handling

### Validation Errors (400)

```json
{
  "success": false,
  "error": "Validation failed",
  "error_type": "validation_error",
  "details": {
    "title": "Title is required",
    "priority": "Priority must be High, Medium, or Low"
  }
}
```

### Permission Errors (403)

```json
{
  "success": false,
  "error": "You do not have permission to access this resource",
  "error_type": "permission_error"
}
```

### Not Found Errors (404)

```json
{
  "success": false,
  "error": "Resource not found",
  "error_type": "not_found"
}
```

### Server Errors (500)

```json
{
  "success": false,
  "error": "An unexpected error occurred",
  "error_type": "server_error"
}
```

## Rate Limiting

Currently no rate limiting is enforced in development.

For production:
- Consider implementing rate limiting per user/IP
- Standard limits: 100 requests per minute per user

## API Testing Examples

### Using cURL

```bash
# GET request
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.incidents.get_incidents?page=1&page_size=10" \
  -H "X-Frappe-CSRF-Token: your_csrf_token" \
  --cookie "sid=your_session_id"

# POST request
curl -X POST "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.incidents.create_incident" \
  -H "Content-Type: application/json" \
  -H "X-Frappe-CSRF-Token: your_csrf_token" \
  --cookie "sid=your_session_id" \
  -d '{
    "title": "Test Incident",
    "priority": "High",
    "severity": "Major"
  }'
```

### Using JavaScript (Axios)

```javascript
import axios from 'axios'

const client = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  headers: {
    'X-Frappe-CSRF-Token': window.csrf_token
  }
})

// GET
const response = await client.get('/api/method/frappe_devsecops_dashboard.api.incidents.get_incidents', {
  params: { page: 1, page_size: 10 }
})

// POST
const response = await client.post('/api/method/frappe_devsecops_dashboard.api.incidents.create_incident', {
  title: 'Test Incident',
  priority: 'High',
  severity: 'Major'
})
```

### Using Python (requests)

```python
import requests

session = requests.Session()

# Login first
session.post('http://localhost:8000/api/method/login', json={
    'usr': 'user@example.com',
    'pwd': 'password'
})

# Get CSRF token
csrf_token = session.cookies.get('csrf_token')

# Make API call
response = session.get(
    'http://localhost:8000/api/method/frappe_devsecops_dashboard.api.incidents.get_incidents',
    headers={'X-Frappe-CSRF-Token': csrf_token},
    params={'page': 1, 'page_size': 10}
)

print(response.json())
```

## Best Practices

1. **Always check response status:**
   ```javascript
   if (response.data.success) {
     // Handle success
   } else {
     // Handle error
   }
   ```

2. **Handle errors gracefully:**
   ```javascript
   try {
     const response = await api.call()
   } catch (error) {
     if (error.response?.status === 403) {
       // Permission denied
     } else if (error.response?.status === 400) {
       // Validation error
     }
   }
   ```

3. **Use pagination for large datasets:**
   - Always specify page and page_size
   - Default page_size is 10, maximum is typically 100

4. **Cache responses when appropriate:**
   - Cache GET requests that don't change frequently
   - Invalidate cache on updates

5. **Include CSRF token:**
   - All non-GET requests require CSRF token
   - Token is available at `window.csrf_token` in browser

## Related Documentation

- [Architecture Overview](architecture.md)
- [Frontend Patterns](frontend-patterns.md)
- [Backend Patterns](backend-patterns.md)
- [Development Guide](development.md)
- [Quick Reference](quick-reference.md)
