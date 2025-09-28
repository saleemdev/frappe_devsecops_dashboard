# API Integration Guide

This guide outlines how to integrate the DevSecOps Dashboard components with API endpoints for dynamic data fetching.

## Overview

The dashboard has been restructured to eliminate redundancy and prepare for API integration:

1. **Removed redundant workflow section** from project cards
2. **Standardized on sidebar Delivery Lifecycle** as single source of truth
3. **Created reusable DeliveryLifecycle component** for API integration
4. **Maintained responsive design** throughout all changes

## Component Structure

### 1. Dashboard Component (`Dashboard.jsx`)

**Current State:**
- Uses mock data from `mockData` object
- Three main sections: Metrics Cards, Projects, Sidebar (Team Utilization + Delivery Lifecycle)
- Simplified project cards show only progress and current phase

**API Integration Points:**
```javascript
// Replace mockData with API calls
const [dashboardData, setDashboardData] = useState(null)
const [loading, setLoading] = useState(true)

useEffect(() => {
  fetchDashboardData()
}, [])

const fetchDashboardData = async () => {
  try {
    const response = await fetch('/api/method/frappe_avaza.api.get_dashboard_data')
    const data = await response.json()
    setDashboardData(data.message)
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
  } finally {
    setLoading(false)
  }
}
```

### 2. DeliveryLifecycle Component (`DeliveryLifecycle.jsx`)

**Features:**
- **Flexible data format**: Accepts both string arrays and object arrays
- **Status-aware styling**: Different colors for pending, active, completed steps
- **Loading state support**: Built-in loading indicator
- **Responsive design**: Maintains mobile-first approach
- **API-ready structure**: Designed for dynamic data integration

**Data Formats Supported:**

```javascript
// Current format (string array)
const steps = [
  'Business Development',
  'Product Design Documentation',
  'Secure Architecture'
]

// API-ready format (object array)
const steps = [
  {
    id: 1,
    name: 'Business Development',
    description: 'Initial business requirements gathering',
    status: 'completed',
    order: 1
  },
  {
    id: 2,
    name: 'Product Design Documentation', 
    description: 'Detailed product design and specifications',
    status: 'active',
    order: 2
  },
  {
    id: 3,
    name: 'Secure Architecture',
    description: 'Security architecture design and review',
    status: 'pending',
    order: 3
  }
]
```

## Recommended API Endpoints

### 1. Dashboard Data Endpoint

**Endpoint:** `/api/method/frappe_avaza.api.get_dashboard_data`

**Expected Response:**
```json
{
  "message": {
    "metrics": {
      "activeProjects": 6,
      "totalTasks": 187,
      "teamCapacity": 89
    },
    "projects": [
      {
        "id": 1,
        "name": "ePrescription System",
        "client": "Ministry of Health",
        "status": "ACTIVE",
        "progress": 72,
        "currentPhase": "TEST"
      }
    ],
    "teamUtilization": {
      "average": 89,
      "members": 10,
      "overCapacity": 2,
      "individuals": [
        {
          "name": "Grace Wanjiku",
          "utilization": 92
        }
      ]
    },
    "deliveryLifecycle": [
      {
        "id": 1,
        "name": "Business Development",
        "description": "Initial business requirements gathering",
        "status": "completed",
        "order": 1
      }
    ]
  }
}
```

### 2. Project-Specific Lifecycle Endpoint

**Endpoint:** `/api/method/frappe_avaza.api.get_project_lifecycle`

**Parameters:** `project_id`

**Expected Response:**
```json
{
  "message": {
    "projectId": 1,
    "projectName": "ePrescription System",
    "lifecycle": [
      {
        "id": 1,
        "name": "Business Development",
        "description": "Requirements gathering and stakeholder alignment",
        "status": "completed",
        "order": 1,
        "startDate": "2024-01-15",
        "endDate": "2024-02-01",
        "assignee": "Grace Wanjiku"
      }
    ]
  }
}
```

## Implementation Steps

### Phase 1: Basic API Integration

1. **Replace mock data with API calls**
2. **Add loading states to all components**
3. **Implement error handling**
4. **Add data refresh functionality**

```javascript
// Example implementation
const Dashboard = () => {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchData = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/method/frappe_avaza.api.get_dashboard_data')
      if (!response.ok) throw new Error('Failed to fetch data')
      const result = await response.json()
      setData(result.message)
      setError(null)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <LoadingState />
  if (error) return <ErrorState error={error} onRetry={fetchData} />
  if (!data) return <EmptyState />

  return (
    <div>
      {/* Render dashboard with data */}
      <DeliveryLifecycle 
        steps={data.deliveryLifecycle}
        loading={loading}
      />
    </div>
  )
}
```

### Phase 2: Enhanced Features

1. **Real-time updates** via WebSocket or polling
2. **Caching** for improved performance
3. **Optimistic updates** for better UX
4. **Pagination** for large datasets

### Phase 3: Advanced Integration

1. **Project-specific lifecycle views**
2. **Interactive lifecycle management**
3. **Progress tracking and updates**
4. **Historical data and analytics**

## Error Handling

### Component-Level Error Boundaries

```javascript
// ErrorBoundary component for graceful error handling
const DashboardErrorBoundary = ({ children }) => {
  return (
    <ErrorBoundary
      fallback={<ErrorFallback />}
      onError={(error, errorInfo) => {
        console.error('Dashboard error:', error, errorInfo)
        // Send to error reporting service
      }}
    >
      {children}
    </ErrorBoundary>
  )
}
```

### API Error Handling

```javascript
const handleApiError = (error) => {
  if (error.status === 401) {
    // Redirect to login
    window.location.href = '/login'
  } else if (error.status === 403) {
    // Show permission denied message
    showErrorMessage('You do not have permission to access this data')
  } else {
    // Show generic error message
    showErrorMessage('Failed to load data. Please try again.')
  }
}
```

## Performance Considerations

### 1. Data Fetching Optimization

- **Debounced refresh** to prevent excessive API calls
- **Selective updates** for specific components
- **Background refresh** without blocking UI

### 2. Component Optimization

- **Memoization** for expensive calculations
- **Virtual scrolling** for large lists
- **Lazy loading** for non-critical components

### 3. Caching Strategy

- **Browser cache** for static data
- **Memory cache** for frequently accessed data
- **Cache invalidation** for real-time updates

## Testing Strategy

### 1. Unit Tests

- Test components with mock data
- Test API integration functions
- Test error handling scenarios

### 2. Integration Tests

- Test complete data flow
- Test error recovery
- Test loading states

### 3. E2E Tests

- Test user workflows
- Test responsive behavior
- Test authentication integration

This guide provides a comprehensive roadmap for transitioning from mock data to a fully API-integrated dashboard while maintaining the current functionality and responsive design.
