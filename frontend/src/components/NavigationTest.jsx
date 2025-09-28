/**
 * Navigation Test Component
 * Comprehensive testing component for all navigation routes and state management
 */

import React from 'react'
import { Card, Button, Space, Typography, Divider, Alert } from 'antd'
import useNavigationStore from '../stores/navigationStore.js'

const { Title, Text } = Typography

function NavigationTest() {
  const navigationState = useNavigationStore()
  
  if (!navigationState) {
    return <Alert message="Navigation store not initialized" type="error" />
  }

  const {
    currentRoute,
    selectedProjectId,
    showProjectDetail,
    selectedAppId,
    showAppDetail,
    selectedIncidentId,
    showIncidentDetail,
    selectedSwaggerId,
    showSwaggerDetail,
    isMobile,
    mobileMenuVisible,
    navigateToRoute
  } = navigationState

  const testRoutes = [
    { key: 'dashboard', label: 'Dashboard' },
    { key: 'projects', label: 'Projects' },
    { key: 'team-utilization', label: 'Team Utilization' },
    { key: 'project-apps', label: 'Project Apps' },
    { key: 'change-requests', label: 'Change Requests' },
    { key: 'incidents', label: 'Incidents' },
    { key: 'monitoring-dashboards', label: 'Monitoring Dashboards' },
    { key: 'swagger-collections', label: 'Swagger Collections' },
    { key: 'devops-config', label: 'DevOps Config' }
  ]

  const testDetailRoutes = () => {
    // Test app detail
    window.location.hash = 'app/test-app-1'
    
    // Test incident detail
    setTimeout(() => {
      window.location.hash = 'incident/test-incident-1'
    }, 1000)
    
    // Test swagger detail
    setTimeout(() => {
      window.location.hash = 'swagger/test-swagger-1'
    }, 2000)
    
    // Return to dashboard
    setTimeout(() => {
      window.location.hash = ''
    }, 3000)
  }

  return (
    <Card title="Navigation Test Component" style={{ margin: '20px' }}>
      <Space direction="vertical" style={{ width: '100%' }}>
        <Title level={4}>Current Navigation State</Title>
        <Text><strong>Current Route:</strong> {currentRoute}</Text>
        <Text><strong>Selected Project ID:</strong> {selectedProjectId || 'None'}</Text>
        <Text><strong>Show Project Detail:</strong> {showProjectDetail ? 'Yes' : 'No'}</Text>
        <Text><strong>Selected App ID:</strong> {selectedAppId || 'None'}</Text>
        <Text><strong>Show App Detail:</strong> {showAppDetail ? 'Yes' : 'No'}</Text>
        <Text><strong>Selected Incident ID:</strong> {selectedIncidentId || 'None'}</Text>
        <Text><strong>Show Incident Detail:</strong> {showIncidentDetail ? 'Yes' : 'No'}</Text>
        <Text><strong>Selected Swagger ID:</strong> {selectedSwaggerId || 'None'}</Text>
        <Text><strong>Show Swagger Detail:</strong> {showSwaggerDetail ? 'Yes' : 'No'}</Text>
        <Text><strong>Is Mobile:</strong> {isMobile ? 'Yes' : 'No'}</Text>
        <Text><strong>Mobile Menu Visible:</strong> {mobileMenuVisible ? 'Yes' : 'No'}</Text>
        
        <Divider />
        
        <Title level={4}>Test Main Routes</Title>
        <Space wrap>
          {testRoutes.map(route => (
            <Button
              key={route.key}
              type={currentRoute === route.key ? 'primary' : 'default'}
              onClick={() => navigateToRoute(route.key)}
            >
              {route.label}
            </Button>
          ))}
        </Space>
        
        <Divider />
        
        <Title level={4}>Test Detail Routes</Title>
        <Button onClick={testDetailRoutes}>
          Test Detail Routes (Auto-cycle)
        </Button>
        
        <Divider />
        
        <Title level={4}>Manual Hash Tests</Title>
        <Space wrap>
          <Button onClick={() => window.location.hash = 'app/test-app-1'}>
            Test App Detail
          </Button>
          <Button onClick={() => window.location.hash = 'incident/test-incident-1'}>
            Test Incident Detail
          </Button>
          <Button onClick={() => window.location.hash = 'swagger/test-swagger-1'}>
            Test Swagger Detail
          </Button>
          <Button onClick={() => window.location.hash = ''}>
            Reset to Dashboard
          </Button>
        </Space>
      </Space>
    </Card>
  )
}

export default NavigationTest
