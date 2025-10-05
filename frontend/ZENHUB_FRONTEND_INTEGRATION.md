# Zenhub Frontend Integration Guide

This guide shows how to integrate the Zenhub API into the frontend Dashboard component to display sprint information.

---

## Option 1: Add to Existing API Service

### Step 1: Create Zenhub Service Module

**File**: `apps/frappe_devsecops_dashboard/frontend/src/services/api/zenhub.js`

```javascript
/**
 * Zenhub API Service
 * 
 * Provides methods to fetch sprint data from Zenhub via the backend API.
 */

import { apiClient } from './config.js'

/**
 * Fetch sprint data for a project from Zenhub
 * 
 * @param {string} projectId - The Frappe Project ID
 * @param {string} sprintStates - Comma-separated sprint states (default: "ACTIVE,CLOSED")
 * @returns {Promise<Object>} Sprint data response
 */
export const getSprintData = async (projectId, sprintStates = 'ACTIVE,CLOSED') => {
  try {
    const response = await apiClient.get(
      '/frappe_devsecops_dashboard.api.zenhub.get_sprint_data',
      {
        params: {
          project_id: projectId,
          sprint_states: sprintStates
        }
      }
    )
    
    // Frappe wraps response in 'message' field
    return response.data.message || response.data
  } catch (error) {
    console.error('[ZenhubService] Error fetching sprint data:', error)
    throw error
  }
}

/**
 * Fetch active sprints only
 * 
 * @param {string} projectId - The Frappe Project ID
 * @returns {Promise<Object>} Active sprint data
 */
export const getActiveSprints = async (projectId) => {
  return getSprintData(projectId, 'ACTIVE')
}

/**
 * Fetch closed sprints only
 * 
 * @param {string} projectId - The Frappe Project ID
 * @returns {Promise<Object>} Closed sprint data
 */
export const getClosedSprints = async (projectId) => {
  return getSprintData(projectId, 'CLOSED')
}

export default {
  getSprintData,
  getActiveSprints,
  getClosedSprints
}
```

---

### Step 2: Add to Main API Service

**File**: `apps/frappe_devsecops_dashboard/frontend/src/services/api/index.js`

Add the Zenhub service to the main API exports:

```javascript
// Existing imports...
import * as zenhub from './zenhub.js'

// Existing services...
class ZenhubService {
  async getSprintData(projectId, sprintStates = 'ACTIVE,CLOSED') {
    return zenhub.getSprintData(projectId, sprintStates)
  }
  
  async getActiveSprints(projectId) {
    return zenhub.getActiveSprints(projectId)
  }
  
  async getClosedSprints(projectId) {
    return zenhub.getClosedSprints(projectId)
  }
}

// Export API object
const api = {
  // ... existing services
  zenhub: new ZenhubService()
}

export default api
```

---

## Option 2: Add Sprint Display to Dashboard Component

### Step 1: Add Sprint State to Dashboard

**File**: `apps/frappe_devsecops_dashboard/frontend/src/components/Dashboard.jsx`

Add state for sprint data:

```javascript
import { useState, useEffect } from 'react'
import api from '../services/api'

function Dashboard() {
  // Existing state...
  const [sprintData, setSprintData] = useState({})
  const [sprintLoading, setSprintLoading] = useState({})
  
  // Load sprint data for a project
  const loadSprintData = async (projectId) => {
    if (sprintData[projectId]) {
      return // Already loaded
    }
    
    setSprintLoading(prev => ({ ...prev, [projectId]: true }))
    
    try {
      const result = await api.zenhub.getActiveSprints(projectId)
      
      if (result.success) {
        setSprintData(prev => ({
          ...prev,
          [projectId]: result.sprints
        }))
      }
    } catch (error) {
      console.error('Failed to load sprint data:', error)
    } finally {
      setSprintLoading(prev => ({ ...prev, [projectId]: false }))
    }
  }
  
  // Rest of component...
}
```

---

### Step 2: Create Sprint Display Component

**File**: `apps/frappe_devsecops_dashboard/frontend/src/components/SprintCard.jsx`

```javascript
import React from 'react'
import { Card, Progress, Tag, Tooltip, Space, Typography } from 'antd'
import {
  ClockCircleOutlined,
  CheckCircleOutlined,
  TeamOutlined,
  WarningOutlined
} from '@ant-design/icons'

const { Text, Title } = Typography

function SprintCard({ sprint }) {
  const {
    sprint_name,
    state,
    start_date,
    end_date,
    total_story_points,
    completed_story_points,
    utilization_percentage,
    team_members,
    issues,
    blockers
  } = sprint
  
  // Determine status color
  const getStatusColor = () => {
    if (state === 'active') return 'processing'
    if (state === 'closed') return 'success'
    return 'default'
  }
  
  return (
    <Card
      size="small"
      title={
        <Space>
          <ClockCircleOutlined />
          <Text strong>{sprint_name}</Text>
          <Tag color={getStatusColor()}>{state.toUpperCase()}</Tag>
        </Space>
      }
      style={{ marginBottom: 16 }}
    >
      {/* Sprint Dates */}
      <div style={{ marginBottom: 12 }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {start_date} → {end_date}
        </Text>
      </div>
      
      {/* Progress Bar */}
      <div style={{ marginBottom: 12 }}>
        <Text strong style={{ fontSize: 12 }}>
          Story Points: {completed_story_points} / {total_story_points}
        </Text>
        <Progress
          percent={utilization_percentage}
          size="small"
          status={utilization_percentage === 100 ? 'success' : 'active'}
        />
      </div>
      
      {/* Metrics Row */}
      <Space size="large" style={{ width: '100%', justifyContent: 'space-between' }}>
        {/* Team Members */}
        <Tooltip title={team_members.map(m => m.name).join(', ')}>
          <Space size="small">
            <TeamOutlined />
            <Text style={{ fontSize: 12 }}>{team_members.length} members</Text>
          </Space>
        </Tooltip>
        
        {/* Completed Issues */}
        <Space size="small">
          <CheckCircleOutlined style={{ color: '#52c41a' }} />
          <Text style={{ fontSize: 12 }}>
            {issues.completed}/{issues.total} issues
          </Text>
        </Space>
        
        {/* Blockers */}
        {blockers.length > 0 && (
          <Tooltip title={blockers.map(b => b.title).join(', ')}>
            <Space size="small">
              <WarningOutlined style={{ color: '#ff4d4f' }} />
              <Text style={{ fontSize: 12, color: '#ff4d4f' }}>
                {blockers.length} blocked
              </Text>
            </Space>
          </Tooltip>
        )}
      </Space>
    </Card>
  )
}

export default SprintCard
```

---

### Step 3: Add Sprint Section to Project Card

**File**: `apps/frappe_devsecops_dashboard/frontend/src/components/Dashboard.jsx`

Add sprint display to the project card:

```javascript
import SprintCard from './SprintCard'

// Inside the project card rendering...
<Card key={project.id} className="project-card">
  <Collapse
    items={[
      {
        key: 'details',
        label: (
          <div>
            {/* Existing project header... */}
          </div>
        ),
        children: (
          <div>
            {/* Existing Task Type Steps... */}
            
            {/* Add Sprint Section */}
            <div style={{ marginTop: 24 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                <ClockCircleOutlined style={{ color: token.colorPrimary }} />
                <Text strong style={{ fontSize: '14px' }}>Zenhub Sprints</Text>
              </div>
              
              {sprintLoading[project.id] ? (
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <Spin size="small" />
                  <div style={{ marginTop: 8, fontSize: 11, color: token.colorTextTertiary }}>
                    Loading sprint data...
                  </div>
                </div>
              ) : sprintData[project.id] && sprintData[project.id].length > 0 ? (
                sprintData[project.id].map(sprint => (
                  <SprintCard key={sprint.sprint_id} sprint={sprint} />
                ))
              ) : (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  No active sprints found
                </Text>
              )}
            </div>
          </div>
        )
      }
    ]}
    onChange={() => {
      toggleProjectCollapse(project.id)
      // Load sprint data when expanded
      if (!projectCollapsed[project.id]) {
        loadSprintData(project.id)
      }
    }}
  />
</Card>
```

---

## Option 3: Create Dedicated Sprint Dashboard

### Create Sprint Dashboard Component

**File**: `apps/frappe_devsecops_dashboard/frontend/src/components/SprintDashboard.jsx`

```javascript
import React, { useState, useEffect } from 'react'
import { Card, Row, Col, Select, Spin, Empty, message } from 'antd'
import api from '../services/api'
import SprintCard from './SprintCard'

const { Option } = Select

function SprintDashboard({ projectId }) {
  const [sprints, setSprints] = useState([])
  const [loading, setLoading] = useState(false)
  const [sprintStates, setSprintStates] = useState(['ACTIVE', 'CLOSED'])
  
  useEffect(() => {
    if (projectId) {
      loadSprints()
    }
  }, [projectId, sprintStates])
  
  const loadSprints = async () => {
    setLoading(true)
    
    try {
      const result = await api.zenhub.getSprintData(
        projectId,
        sprintStates.join(',')
      )
      
      if (result.success) {
        setSprints(result.sprints)
      } else {
        message.error(result.error || 'Failed to load sprint data')
      }
    } catch (error) {
      message.error('Failed to load sprint data')
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div>
      <Card
        title="Sprint Dashboard"
        extra={
          <Select
            mode="multiple"
            value={sprintStates}
            onChange={setSprintStates}
            style={{ width: 200 }}
            placeholder="Select sprint states"
          >
            <Option value="ACTIVE">Active</Option>
            <Option value="CLOSED">Closed</Option>
            <Option value="FUTURE">Future</Option>
          </Select>
        }
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : sprints.length > 0 ? (
          <Row gutter={[16, 16]}>
            {sprints.map(sprint => (
              <Col key={sprint.sprint_id} xs={24} sm={24} md={12} lg={8}>
                <SprintCard sprint={sprint} />
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No sprints found" />
        )}
      </Card>
    </div>
  )
}

export default SprintDashboard
```

---

## Option 4: Add Sprint Metrics to Project Summary

### Add Sprint Metrics Display

```javascript
// In Dashboard.jsx, add sprint metrics to project summary

const renderProjectSummary = (project) => {
  const sprints = sprintData[project.id] || []
  const activeSprint = sprints.find(s => s.state === 'active')
  
  return (
    <div>
      {/* Existing project summary... */}
      
      {/* Add Sprint Metrics */}
      {activeSprint && (
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <Text strong style={{ fontSize: 12 }}>Current Sprint: {activeSprint.sprint_name}</Text>
          <div style={{ marginTop: 8 }}>
            <Progress
              percent={activeSprint.utilization_percentage}
              size="small"
              format={percent => `${percent}% complete`}
            />
          </div>
          <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 11 }}>
              {activeSprint.completed_story_points}/{activeSprint.total_story_points} points
            </Text>
            <Text style={{ fontSize: 11 }}>
              {activeSprint.issues.completed}/{activeSprint.issues.total} issues
            </Text>
          </div>
        </div>
      )}
    </div>
  )
}
```

---

## Error Handling

### Handle API Errors Gracefully

```javascript
const loadSprintData = async (projectId) => {
  try {
    const result = await api.zenhub.getActiveSprints(projectId)
    
    if (result.success) {
      setSprintData(prev => ({ ...prev, [projectId]: result.sprints }))
    } else {
      // Handle different error types
      if (result.error_type === 'validation_error') {
        // Workspace not configured - show setup message
        message.info('Zenhub workspace not configured for this project')
      } else if (result.error_type === 'authentication_error') {
        // Token issue - show admin message
        message.error('Zenhub authentication failed. Please check settings.')
      } else {
        // Generic error
        message.error('Failed to load sprint data')
      }
    }
  } catch (error) {
    console.error('Sprint data error:', error)
    message.error('An unexpected error occurred')
  }
}
```

---

## Caching Strategy

### Implement Frontend Caching

```javascript
const SPRINT_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const loadSprintData = async (projectId) => {
  // Check cache first
  const cacheKey = `sprint_data_${projectId}`
  const cached = localStorage.getItem(cacheKey)
  
  if (cached) {
    const { data, timestamp } = JSON.parse(cached)
    if (Date.now() - timestamp < SPRINT_CACHE_TTL) {
      setSprintData(prev => ({ ...prev, [projectId]: data }))
      return
    }
  }
  
  // Fetch fresh data
  setSprintLoading(prev => ({ ...prev, [projectId]: true }))
  
  try {
    const result = await api.zenhub.getActiveSprints(projectId)
    
    if (result.success) {
      // Update state
      setSprintData(prev => ({ ...prev, [projectId]: result.sprints }))
      
      // Cache the data
      localStorage.setItem(cacheKey, JSON.stringify({
        data: result.sprints,
        timestamp: Date.now()
      }))
    }
  } finally {
    setSprintLoading(prev => ({ ...prev, [projectId]: false }))
  }
}
```

---

## Testing

### Test the Integration

```javascript
// In browser console
import api from './services/api'

// Test API call
const result = await api.zenhub.getActiveSprints('PROJ-001')
console.log(result)

// Expected output:
// {
//   success: true,
//   workspace_id: "workspace_123",
//   sprints: [...]
// }
```

---

## Summary

✅ **Created Zenhub service module**  
✅ **Added sprint display components**  
✅ **Integrated with Dashboard**  
✅ **Implemented error handling**  
✅ **Added caching strategy**  

Choose the integration option that best fits your needs:
- **Option 1**: Basic API service integration
- **Option 2**: Add to existing project cards
- **Option 3**: Dedicated sprint dashboard
- **Option 4**: Sprint metrics in project summary

---

**Last Updated**: 2025-09-30

