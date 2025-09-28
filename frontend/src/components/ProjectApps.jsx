import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Row,
  Col,
  Typography,
  Space,
  Tag,
  Avatar,
  Tooltip,
  message,
  Popconfirm,
  Empty,
  Spin
} from 'antd'
import {
  PlusOutlined,
  AppstoreOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  DeploymentUnitOutlined,
  ReloadOutlined,
  CloudServerOutlined
} from '@ant-design/icons'
import ProjectAppDetail from './ProjectAppDetail'

const { Title, Text, Paragraph } = Typography
const { Meta } = Card

const ProjectApps = ({ navigateToRoute, showAppDetail, selectedAppId }) => {
  const [apps, setApps] = useState([])
  const [loading, setLoading] = useState(false)

  // Show app detail view if selectedAppId is provided
  console.log('ProjectApps render - showAppDetail:', showAppDetail, 'selectedAppId:', selectedAppId)
  if (showAppDetail && selectedAppId) {
    console.log('Rendering ProjectAppDetail for appId:', selectedAppId)
    return <ProjectAppDetail appId={selectedAppId} navigateToRoute={navigateToRoute} />
  }

  // Mock data for demonstration
  const mockApps = [
    {
      id: 'app-001',
      name: 'ePrescription API',
      project: 'ePrescription',
      repositoryUrl: 'https://github.com/company/eprescription-api',
      deploymentStatus: 'deployed',
      environment: 'production',
      technology: 'Node.js',
      description: 'Main API service for ePrescription system',
      lastDeployment: '2025-01-20',
      version: 'v2.1.3'
    },
    {
      id: 'app-002',
      name: 'Patient Portal',
      project: 'Patient Management',
      repositoryUrl: 'https://github.com/company/patient-portal',
      deploymentStatus: 'pending',
      environment: 'staging',
      technology: 'React',
      description: 'Patient-facing web portal for appointment booking',
      lastDeployment: '2025-01-18',
      version: 'v1.5.2'
    },
    {
      id: 'app-003',
      name: 'Mobile Health App',
      project: 'Mobile Health App',
      repositoryUrl: 'https://github.com/company/mobile-health',
      deploymentStatus: 'failed',
      environment: 'development',
      technology: 'React Native',
      description: 'Mobile application for health monitoring',
      lastDeployment: '2025-01-15',
      version: 'v0.9.1'
    },
    {
      id: 'app-004',
      name: 'Analytics Dashboard',
      project: 'ePrescription',
      repositoryUrl: 'https://github.com/company/analytics-dashboard',
      deploymentStatus: 'deployed',
      environment: 'production',
      technology: 'Vue.js',
      description: 'Real-time analytics and reporting dashboard',
      lastDeployment: '2025-01-22',
      version: 'v3.0.1'
    }
  ]

  useEffect(() => {
    loadApps()
  }, [])

  const loadApps = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setApps(mockApps)
    } catch (error) {
      message.error('Failed to load project apps')
    } finally {
      setLoading(false)
    }
  }

  const handleAddApp = () => {
    // TODO: Navigate to add app form or implement inline add functionality
    message.info('Add app functionality will be implemented in the detail view')
  }



  const handleDeleteApp = async (id) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setApps(prev => prev.filter(app => app.id !== id))
      message.success('App deleted successfully')
    } catch (error) {
      message.error('Failed to delete app')
    }
  }



  const getStatusColor = (status) => {
    const colors = {
      deployed: 'green',
      pending: 'orange',
      failed: 'red',
      'in-progress': 'blue'
    }
    return colors[status] || 'default'
  }

  const getStatusIcon = (status) => {
    const icons = {
      deployed: <CloudServerOutlined />,
      pending: <DeploymentUnitOutlined />,
      failed: <DeploymentUnitOutlined />,
      'in-progress': <DeploymentUnitOutlined />
    }
    return icons[status] || <DeploymentUnitOutlined />
  }

  const getTechnologyIcon = (tech) => {
    const icons = {
      'Node.js': '🟢',
      'React': '⚛️',
      'Vue.js': '💚',
      'React Native': '📱',
      'Python': '🐍',
      'Java': '☕',
      'PHP': '🐘'
    }
    return icons[tech] || '💻'
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              Project Applications
            </Title>
            <Text type="secondary">
              Manage applications associated with your projects
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadApps}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddApp}
                size="large"
              >
                Add App
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {loading && apps.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : apps.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description="No applications found"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAddApp}>
              Add Your First App
            </Button>
          </Empty>
        </Card>
      ) : (
        <Row gutter={[16, 16]}>
          {apps.map(app => (
            <Col xs={24} sm={12} lg={8} xl={6} key={app.id}>
              <Card
                hoverable
                onClick={() => {
                  console.log('Card clicked, navigateToRoute:', navigateToRoute, 'appId:', app.id)
                  console.log('Current showAppDetail:', showAppDetail, 'selectedAppId:', selectedAppId)
                  if (navigateToRoute) {
                    navigateToRoute('app-detail', null, app.id)
                  } else {
                    console.error('navigateToRoute function is not available')
                  }
                }}
                style={{ cursor: 'pointer' }}
                actions={[
                  <Tooltip title="Edit App">
                    <EditOutlined onClick={(e) => {
                      e.stopPropagation();
                      console.log('Edit button clicked, navigating to app detail:', app.id);
                      if (navigateToRoute) {
                        navigateToRoute('app-detail', null, app.id);
                      }
                    }} />
                  </Tooltip>,
                  <Tooltip title="View Repository">
                    <LinkOutlined
                      onClick={(e) => { e.stopPropagation(); window.open(app.repositoryUrl, '_blank'); }}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title="Are you sure you want to delete this app?"
                    onConfirm={() => handleDeleteApp(app.id)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <Tooltip title="Delete App">
                      <DeleteOutlined
                        style={{ color: '#ff4d4f' }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </Tooltip>
                  </Popconfirm>
                ]}
              >
                <Meta
                  avatar={
                    <Avatar 
                      size={48} 
                      icon={<AppstoreOutlined />}
                      style={{ backgroundColor: '#1890ff' }}
                    />
                  }
                  title={
                    <div>
                      <Text strong>{app.name}</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Tag color={getStatusColor(app.deploymentStatus)}>
                          {getStatusIcon(app.deploymentStatus)}
                          {app.deploymentStatus.toUpperCase()}
                        </Tag>
                      </div>
                    </div>
                  }
                  description={
                    <div>
                      <Paragraph 
                        ellipsis={{ rows: 2 }} 
                        style={{ marginBottom: '8px', minHeight: '40px' }}
                      >
                        {app.description}
                      </Paragraph>
                      
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Project: 
                          </Text>
                          <Text style={{ fontSize: '12px', marginLeft: '4px' }}>
                            {app.project}
                          </Text>
                        </div>
                        
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Technology: 
                          </Text>
                          <Text style={{ fontSize: '12px', marginLeft: '4px' }}>
                            {getTechnologyIcon(app.technology)} {app.technology}
                          </Text>
                        </div>
                        
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Environment: 
                          </Text>
                          <Tag 
                            size="small" 
                            color={app.environment === 'production' ? 'red' : 
                                   app.environment === 'staging' ? 'orange' : 'blue'}
                          >
                            {app.environment}
                          </Tag>
                        </div>
                        
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Version: 
                          </Text>
                          <Text style={{ fontSize: '12px', marginLeft: '4px' }}>
                            {app.version}
                          </Text>
                        </div>
                        
                        <div>
                          <Text type="secondary" style={{ fontSize: '12px' }}>
                            Last Deployment: 
                          </Text>
                          <Text style={{ fontSize: '12px', marginLeft: '4px' }}>
                            {app.lastDeployment}
                          </Text>
                        </div>
                      </Space>
                    </div>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      )}
    </div>
  )
}

export default ProjectApps
