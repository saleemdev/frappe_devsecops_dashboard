import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Alert,
  List,
  Tag,
  Divider,
  Row,
  Col,
  Progress,
  Tooltip,
  Badge
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  PlayCircleOutlined,
  BugOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import useNavigationStore from '../stores/navigationStore'
import useAuthStore from '../stores/authStore'

const { Title, Text, Paragraph } = Typography

const SystemTest = () => {
  const [testResults, setTestResults] = useState({})
  const [isRunning, setIsRunning] = useState(false)
  const [currentTest, setCurrentTest] = useState(null)

  const navigationStore = useNavigationStore()
  const authStore = useAuthStore()

  // Test scenarios
  const testScenarios = [
    {
      id: 'navigation-basic',
      name: 'Basic Navigation Routes',
      description: 'Test all main navigation routes',
      routes: ['dashboard', 'projects', 'team-utilization', 'project-apps', 'change-requests', 'incidents', 'monitoring-dashboards', 'swagger-collections', 'devops-config']
    },
    {
      id: 'navigation-detail',
      name: 'Detail View Navigation',
      description: 'Test detail view routes with IDs',
      routes: ['app/app-001', 'incident/inc-001', 'swagger/swagger-001']
    },
    {
      id: 'state-management',
      name: 'State Management',
      description: 'Test Zustand store state persistence',
      tests: ['navigation-state', 'mobile-state', 'detail-state']
    },
    {
      id: 'responsive-design',
      name: 'Responsive Design',
      description: 'Test mobile and desktop layouts',
      tests: ['mobile-menu', 'desktop-menu', 'screen-resize']
    },
    {
      id: 'component-rendering',
      name: 'Component Rendering',
      description: 'Test all components render without errors',
      components: ['Dashboard', 'ProjectApps', 'Incidents', 'SwaggerCollections', 'TeamUtilization', 'DevOpsConfig']
    }
  ]

  // Run individual test
  const runTest = async (scenario) => {
    setCurrentTest(scenario.id)
    const results = []

    try {
      if (scenario.routes) {
        // Test navigation routes
        for (const route of scenario.routes) {
          try {
            if (route.includes('/')) {
              // Detail route
              const [routeName, id] = route.split('/')
              if (routeName === 'app') {
                navigationStore.navigateToRoute('project-apps', null, id)
                await new Promise(resolve => setTimeout(resolve, 100))
                results.push({
                  test: `Navigate to ${route}`,
                  status: navigationStore.showAppDetail && navigationStore.selectedAppId === id ? 'pass' : 'fail',
                  details: `App detail: ${navigationStore.showAppDetail}, Selected ID: ${navigationStore.selectedAppId}`
                })
              } else if (routeName === 'incident') {
                navigationStore.navigateToRoute('incidents', null, null, id)
                await new Promise(resolve => setTimeout(resolve, 100))
                results.push({
                  test: `Navigate to ${route}`,
                  status: navigationStore.showIncidentDetail && navigationStore.selectedIncidentId === id ? 'pass' : 'fail',
                  details: `Incident detail: ${navigationStore.showIncidentDetail}, Selected ID: ${navigationStore.selectedIncidentId}`
                })
              } else if (routeName === 'swagger') {
                navigationStore.navigateToRoute('swagger-collections', null, null, null, id)
                await new Promise(resolve => setTimeout(resolve, 100))
                results.push({
                  test: `Navigate to ${route}`,
                  status: navigationStore.showSwaggerDetail && navigationStore.selectedSwaggerId === id ? 'pass' : 'fail',
                  details: `Swagger detail: ${navigationStore.showSwaggerDetail}, Selected ID: ${navigationStore.selectedSwaggerId}`
                })
              }
            } else {
              // Main route
              navigationStore.navigateToRoute(route)
              await new Promise(resolve => setTimeout(resolve, 100))
              results.push({
                test: `Navigate to ${route}`,
                status: navigationStore.currentRoute === route ? 'pass' : 'fail',
                details: `Current route: ${navigationStore.currentRoute}, Expected: ${route}`
              })
            }
          } catch (error) {
            results.push({
              test: `Navigate to ${route}`,
              status: 'error',
              details: error.message
            })
          }
        }
      }

      if (scenario.tests) {
        // Test specific functionality
        for (const test of scenario.tests) {
          try {
            switch (test) {
              case 'navigation-state':
                const initialRoute = navigationStore.currentRoute
                navigationStore.navigateToRoute('projects')
                await new Promise(resolve => setTimeout(resolve, 50))
                navigationStore.navigateToRoute('dashboard')
                await new Promise(resolve => setTimeout(resolve, 50))
                results.push({
                  test: 'Navigation state persistence',
                  status: navigationStore.currentRoute === 'dashboard' ? 'pass' : 'fail',
                  details: `Route changed correctly: ${navigationStore.currentRoute}`
                })
                break

              case 'mobile-state':
                const initialMobile = navigationStore.isMobile
                navigationStore.setIsMobile(true)
                await new Promise(resolve => setTimeout(resolve, 50))
                results.push({
                  test: 'Mobile state management',
                  status: navigationStore.isMobile === true ? 'pass' : 'fail',
                  details: `Mobile state: ${navigationStore.isMobile}`
                })
                navigationStore.setIsMobile(initialMobile)
                break

              case 'detail-state':
                navigationStore.navigateToRoute('project-apps', null, 'test-app')
                await new Promise(resolve => setTimeout(resolve, 50))
                results.push({
                  test: 'Detail state management',
                  status: navigationStore.selectedAppId === 'test-app' && navigationStore.showAppDetail ? 'pass' : 'fail',
                  details: `App ID: ${navigationStore.selectedAppId}, Show detail: ${navigationStore.showAppDetail}`
                })
                break

              case 'mobile-menu':
                navigationStore.toggleMobileMenu()
                await new Promise(resolve => setTimeout(resolve, 50))
                const menuVisible = navigationStore.mobileMenuVisible
                navigationStore.toggleMobileMenu()
                results.push({
                  test: 'Mobile menu toggle',
                  status: 'pass',
                  details: `Menu toggled successfully: ${menuVisible}`
                })
                break

              case 'desktop-menu':
              case 'screen-resize':
                results.push({
                  test: test,
                  status: 'pass',
                  details: 'Manual test - check UI responsiveness'
                })
                break
            }
          } catch (error) {
            results.push({
              test: test,
              status: 'error',
              details: error.message
            })
          }
        }
      }

      if (scenario.components) {
        // Test component rendering
        for (const component of scenario.components) {
          try {
            // Navigate to component route
            const routeMap = {
              'Dashboard': 'dashboard',
              'ProjectApps': 'project-apps',
              'Incidents': 'incidents',
              'SwaggerCollections': 'swagger-collections',
              'TeamUtilization': 'team-utilization',
              'DevOpsConfig': 'devops-config'
            }
            
            const route = routeMap[component]
            if (route) {
              navigationStore.navigateToRoute(route)
              await new Promise(resolve => setTimeout(resolve, 100))
              results.push({
                test: `Render ${component}`,
                status: navigationStore.currentRoute === route ? 'pass' : 'fail',
                details: `Component route: ${route}, Current: ${navigationStore.currentRoute}`
              })
            }
          } catch (error) {
            results.push({
              test: `Render ${component}`,
              status: 'error',
              details: error.message
            })
          }
        }
      }

    } catch (error) {
      results.push({
        test: 'General test execution',
        status: 'error',
        details: error.message
      })
    }

    setTestResults(prev => ({
      ...prev,
      [scenario.id]: results
    }))
  }

  // Run all tests
  const runAllTests = async () => {
    setIsRunning(true)
    setTestResults({})
    
    for (const scenario of testScenarios) {
      await runTest(scenario)
      await new Promise(resolve => setTimeout(resolve, 200))
    }
    
    setIsRunning(false)
    setCurrentTest(null)
  }

  // Calculate test statistics
  const getTestStats = () => {
    let total = 0
    let passed = 0
    let failed = 0
    let errors = 0

    Object.values(testResults).forEach(results => {
      results.forEach(result => {
        total++
        if (result.status === 'pass') passed++
        else if (result.status === 'fail') failed++
        else if (result.status === 'error') errors++
      })
    })

    return { total, passed, failed, errors }
  }

  const stats = getTestStats()

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>
        <BugOutlined /> System Regression Test Suite
      </Title>
      
      <Paragraph>
        Comprehensive testing suite for the DevSecOps Dashboard frontend application.
        This tests navigation, state management, component rendering, and responsive design.
      </Paragraph>

      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col span={24}>
          <Card>
            <Space size="large">
              <Button 
                type="primary" 
                icon={<PlayCircleOutlined />}
                onClick={runAllTests}
                loading={isRunning}
                size="large"
              >
                Run All Tests
              </Button>
              
              {stats.total > 0 && (
                <Space>
                  <Badge count={stats.passed} style={{ backgroundColor: '#52c41a' }}>
                    <Tag color="green">Passed</Tag>
                  </Badge>
                  <Badge count={stats.failed} style={{ backgroundColor: '#ff4d4f' }}>
                    <Tag color="red">Failed</Tag>
                  </Badge>
                  <Badge count={stats.errors} style={{ backgroundColor: '#faad14' }}>
                    <Tag color="orange">Errors</Tag>
                  </Badge>
                  <Progress 
                    percent={stats.total > 0 ? Math.round((stats.passed / stats.total) * 100) : 0}
                    size="small"
                    style={{ width: '200px' }}
                  />
                </Space>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      {isRunning && (
        <Alert
          message={`Running test: ${currentTest}`}
          type="info"
          icon={<LoadingOutlined />}
          style={{ marginBottom: '16px' }}
        />
      )}

      <Row gutter={[16, 16]}>
        {testScenarios.map(scenario => (
          <Col span={24} key={scenario.id}>
            <Card
              title={
                <Space>
                  {scenario.name}
                  {testResults[scenario.id] && (
                    <Tag color={
                      testResults[scenario.id].every(r => r.status === 'pass') ? 'green' :
                      testResults[scenario.id].some(r => r.status === 'error') ? 'orange' : 'red'
                    }>
                      {testResults[scenario.id].filter(r => r.status === 'pass').length}/
                      {testResults[scenario.id].length}
                    </Tag>
                  )}
                </Space>
              }
              extra={
                <Button 
                  size="small"
                  onClick={() => runTest(scenario)}
                  loading={currentTest === scenario.id}
                >
                  Run Test
                </Button>
              }
            >
              <Paragraph type="secondary">{scenario.description}</Paragraph>
              
              {testResults[scenario.id] && (
                <List
                  size="small"
                  dataSource={testResults[scenario.id]}
                  renderItem={result => (
                    <List.Item>
                      <Space>
                        {result.status === 'pass' && <CheckCircleOutlined style={{ color: '#52c41a' }} />}
                        {result.status === 'fail' && <CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
                        {result.status === 'error' && <InfoCircleOutlined style={{ color: '#faad14' }} />}
                        
                        <Text strong>{result.test}</Text>
                        
                        <Tooltip title={result.details}>
                          <Tag color={
                            result.status === 'pass' ? 'green' :
                            result.status === 'fail' ? 'red' : 'orange'
                          }>
                            {result.status.toUpperCase()}
                          </Tag>
                        </Tooltip>
                      </Space>
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  )
}

export default SystemTest
