# Incident Management API Implementation

## Overview

Comprehensive CRUD (Create, Read, Update, Delete) API endpoints have been implemented for the Incident Management module in the DevSecOps Dashboard. The implementation follows the established patterns from the Change Request module and provides both backend and frontend integration.

## Backend API Endpoints

### File Location
`apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/api/incident.py`

### Available Endpoints

#### 1. Get Incidents (List)
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.incident.get_incidents`

**Method:** GET/POST

**Parameters:**
- `fields` (optional): JSON string of field names to return
- `filters` (optional): JSON string of filters in Frappe format
- `limit_start` (optional): Starting index for pagination (default: 0)
- `limit_page_length` (optional): Number of records per page (default: 20)
- `order_by` (optional): Sort order (default: "modified desc")

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "INC-00001",
      "title": "Database Connection Timeout",
      "priority": "High",
      "status": "In Progress",
      "category": "Infrastructure",
      "severity": "S2 - High",
      "assigned_to": "john.smith@example.com",
      "reported_by": "sarah.johnson@example.com",
      "reported_date": "2024-01-20 09:15:00"
    }
  ],
  "total": 15
}
```

#### 2. Get Incident (Detail)
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.incident.get_incident`

**Method:** GET/POST

**Parameters:**
- `name` (required): The Incident ID (e.g., INC-00001)

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "INC-00001",
    "title": "Database Connection Timeout",
    "description": "Multiple users reporting slow response times...",
    "priority": "High",
    "status": "In Progress",
    "category": "Infrastructure",
    "severity": "S2 - High",
    "assigned_to": "john.smith@example.com",
    "assigned_to_name": "John Smith",
    "reported_by": "sarah.johnson@example.com",
    "reported_by_name": "Sarah Johnson",
    "reported_date": "2024-01-20 09:15:00",
    "affected_systems": "Patient Database, ePrescription API",
    "impact_description": "Users unable to access patient records",
    "resolution_notes": "Increased connection pool size",
    "root_cause": "Connection pool exhaustion",
    "sla_status": "Within SLA",
    "sla_due_date": "2024-01-21 09:15:00",
    "incident_timeline": [
      {
        "event_timestamp": "2024-01-20 09:15:00",
        "event_type": "Manual",
        "description": "Incident reported",
        "user": "sarah.johnson@example.com"
      }
    ]
  }
}
```

#### 3. Create Incident
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.incident.create_incident`

**Method:** POST

**Parameters:**
- `data` (required): JSON string of Incident fields

**Example Request:**
```json
{
  "data": "{\"title\": \"API Timeout Issue\", \"priority\": \"High\", \"status\": \"New\", \"category\": \"API\", \"reported_by\": \"Administrator\"}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "INC-00002",
    "title": "API Timeout Issue",
    "priority": "High",
    "status": "New",
    "category": "API",
    "reported_by": "Administrator"
  },
  "message": "Incident INC-00002 created successfully"
}
```

#### 4. Update Incident
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.incident.update_incident`

**Method:** POST

**Parameters:**
- `name` (required): The Incident ID
- `data` (required): JSON string of fields to update

**Example Request:**
```json
{
  "name": "INC-00001",
  "data": "{\"status\": \"Resolved\", \"assigned_to\": \"john.smith@example.com\"}"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "name": "INC-00001",
    "status": "Resolved",
    "assigned_to": "john.smith@example.com"
  },
  "message": "Incident INC-00001 updated successfully"
}
```

#### 5. Delete Incident
**Endpoint:** `/api/method/frappe_devsecops_dashboard.api.incident.delete_incident`

**Method:** POST

**Parameters:**
- `name` (required): The Incident ID

**Response:**
```json
{
  "success": true,
  "message": "Incident INC-00001 deleted successfully"
}
```

## Frontend Service Integration

### File Location
`apps/frappe_devsecops_dashboard/frontend/src/services/api/incidents.js`

### Service Methods

```javascript
// Get all incidents with optional filters
await incidentsService.getIncidents(filters)

// Get single incident by ID
await incidentsService.getIncident(id)

// Create new incident
await incidentsService.createIncident(incidentData)

// Update existing incident
await incidentsService.updateIncident(id, incidentData)

// Delete incident
await incidentsService.deleteIncident(id)

// Close incident
await incidentsService.closeIncident(id, closeData)

// Add timeline entry
await incidentsService.addTimelineEntry(id, timelineEntry)
```

## API Configuration

### File Location
`apps/frappe_devsecops_dashboard/frontend/src/services/api/config.js`

### Endpoint Configuration
```javascript
incidents: {
  list: '/api/method/frappe_devsecops_dashboard.api.incident.get_incidents',
  detail: '/api/method/frappe_devsecops_dashboard.api.incident.get_incident',
  create: '/api/method/frappe_devsecops_dashboard.api.incident.create_incident',
  update: '/api/method/frappe_devsecops_dashboard.api.incident.update_incident',
  delete: '/api/method/frappe_devsecops_dashboard.api.incident.delete_incident'
}
```

## Testing

### Test File Location
`apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tests/test_incident_api.py`

### Test Coverage
- ✓ Create incident
- ✓ Get incidents (list)
- ✓ Get incident (detail)
- ✓ Update incident
- ✓ Delete incident
- ✓ Get incidents with filters
- ✓ Permission checks

### Running Tests
```bash
cd /home/erpuser/frappe-bench
bench --site desk.kns.co.ke run-tests --module frappe_devsecops_dashboard.tests.test_incident_api
```

**Test Results:** All 7 tests passed ✓

## Error Handling

All endpoints include comprehensive error handling:

- **PermissionError**: Returned when user lacks required permissions
- **DoesNotExistError**: Returned when incident not found
- **ValidationError**: Returned for invalid data
- **Exception**: Generic error handling with logging

## Security Features

1. **Permission Checks**: All operations verify user permissions
2. **RBAC Integration**: Respects Frappe's role-based access control
3. **Input Validation**: All inputs are validated before processing
4. **Error Logging**: All errors are logged for audit trails
5. **CSRF Protection**: Integrated with Frappe's CSRF token system

## Integration Points

### With Change Requests
- Incidents can be linked to Change Requests
- Related incidents field for tracking dependencies

### With Projects
- Incidents can be associated with projects
- Project-level incident tracking and reporting

### With Monitoring
- Incidents can be triggered from monitoring systems
- Integration with alert systems via API

## Performance Considerations

- **Pagination**: Supports limit_start and limit_page_length for large datasets
- **Caching**: Frontend service includes cache management
- **Filtering**: Efficient database filtering using Frappe's filter syntax
- **Indexing**: Incident DocType includes indexes on frequently queried fields

## Future Enhancements

1. Bulk operations (create/update multiple incidents)
2. Advanced filtering and search capabilities
3. Incident analytics and reporting
4. Automated incident creation from monitoring systems
5. Incident escalation workflows
6. SLA tracking and notifications

## Deployment Status

✓ Backend API implemented and tested
✓ Frontend service integrated
✓ API configuration updated
✓ Tests passing (7/7)
✓ Cache cleared
✓ Ready for production use

