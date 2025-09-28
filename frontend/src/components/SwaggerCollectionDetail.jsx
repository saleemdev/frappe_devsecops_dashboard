import React, { useEffect, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Tag,
  Button,
  Space,
  Descriptions,
  Table,
  Tabs,
  Badge,
  Tooltip,
  message,
  Spin,
  Alert,
  Divider,
  List,
  Avatar
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  DownloadOutlined,
  LinkOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined,
  WarningOutlined,
  FileTextOutlined,
  ExperimentOutlined,
  TagsOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useSwaggerCollectionsStore, useNavigationStore } from '../stores/index.js'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

const SwaggerCollectionDetail = ({ swaggerId }) => {
  const {
    selectedSwaggerCollection,
    loading,
    error,
    fetchSwaggerCollection,
    exportSwaggerCollection,
    clearError,
    clearSelectedSwaggerCollection
  } = useSwaggerCollectionsStore()

  const { navigateToRoute } = useNavigationStore()

  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (swaggerId) {
      fetchSwaggerCollection(swaggerId)
    }

    return () => {
      clearSelectedSwaggerCollection()
    }
  }, [swaggerId, fetchSwaggerCollection, clearSelectedSwaggerCollection])

  useEffect(() => {
    if (error) {
      message.error(error)
      clearError()
    }
  }, [error, clearError])

  const handleBack = () => {
    navigateToRoute('swagger-collections')
  }

  const handleEdit = () => {
    message.info('Edit functionality will be implemented')
  }

  const handleExport = async (format = 'json') => {
    try {
      const result = await exportSwaggerCollection(swaggerId, format)
      
      // Create download link
      const blob = new Blob([result.content], { type: 'application/json' })
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = result.filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      message.success('Swagger collection exported successfully')
    } catch (error) {
      message.error('Failed to export swagger collection')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Active':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'Development':
        return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
      case 'Deprecated':
        return <CloseCircleOutlined style={{ color: '#f5222d' }} />
      default:
        return <WarningOutlined style={{ color: '#d9d9d9' }} />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'green'
      case 'Development': return 'orange'
      case 'Deprecated': return 'red'
      default: return 'default'
    }
  }

  const getTestStatusColor = (testStatus) => {
    switch (testStatus) {
      case 'Passed': return 'green'
      case 'Failed': return 'red'
      case 'Warning': return 'orange'
      default: return 'default'
    }
  }

  const getMethodColor = (method) => {
    switch (method.toUpperCase()) {
      case 'GET': return 'blue'
      case 'POST': return 'green'
      case 'PUT': return 'orange'
      case 'PATCH': return 'purple'
      case 'DELETE': return 'red'
      default: return 'default'
    }
  }

  const endpointsColumns = [
    {
      title: 'Method',
      dataIndex: 'method',
      key: 'method',
      width: 80,
      render: (method) => (
        <Tag color={getMethodColor(method)} style={{ fontWeight: 'bold' }}>
          {method.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Path',
      dataIndex: 'path',
      key: 'path',
      render: (path) => (
        <Text code style={{ fontSize: '13px' }}>
          {path}
        </Text>
      )
    },
    {
      title: 'Summary',
      dataIndex: 'summary',
      key: 'summary'
    },
    {
      title: 'Tags',
      dataIndex: 'tags',
      key: 'tags',
      render: (tags) => (
        <Space wrap>
          {tags?.map(tag => (
            <Tag key={tag} size="small">{tag}</Tag>
          ))}
        </Space>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!selectedSwaggerCollection) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Swagger Collection Not Found"
          description="The requested swagger collection could not be found."
          type="warning"
          showIcon
        />
      </div>
    )
  }

  const collection = selectedSwaggerCollection

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
              >
                Back to Swagger Collections
              </Button>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('json')}
              >
                Export JSON
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={() => handleExport('yaml')}
              >
                Export YAML
              </Button>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={handleEdit}
              >
                Edit
              </Button>
            </Space>
          </Col>
        </Row>
      </div>

      {/* Title and Status */}
      <div style={{ marginBottom: 24 }}>
        <Row align="middle" gutter={16}>
          <Col>
            <Title level={2} style={{ margin: 0 }}>
              <ApiOutlined /> {collection.name}
            </Title>
          </Col>
          <Col>
            <Space>
              {getStatusIcon(collection.status)}
              <Tag color={getStatusColor(collection.status)} style={{ fontSize: '14px' }}>
                {collection.status}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Tag color="purple" style={{ fontSize: '14px' }}>
              v{collection.version}
            </Tag>
          </Col>
        </Row>
        <Paragraph style={{ marginTop: 8, marginBottom: 0, fontSize: '16px' }}>
          {collection.description}
        </Paragraph>
      </div>

      {/* Content Tabs */}
      <Tabs activeKey={activeTab} onChange={setActiveTab}>
        <TabPane tab="Overview" key="overview">
          <Row gutter={24}>
            <Col xs={24} lg={16}>
              <Card title="Collection Information" style={{ marginBottom: 24 }}>
                <Descriptions column={1} bordered>
                  <Descriptions.Item label="Project">
                    <Tag color="blue">{collection.project}</Tag>
                  </Descriptions.Item>
                  <Descriptions.Item label="Base URL">
                    <Text code>{collection.baseUrl}</Text>
                    <Button
                      type="link"
                      icon={<LinkOutlined />}
                      size="small"
                      onClick={() => window.open(collection.baseUrl, '_blank')}
                    />
                  </Descriptions.Item>
                  <Descriptions.Item label="Author">
                    <Space>
                      <UserOutlined />
                      {collection.author}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Created">
                    <Space>
                      <CalendarOutlined />
                      {collection.createdDate}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Last Updated">
                    <Space>
                      <CalendarOutlined />
                      {collection.updatedDate}
                    </Space>
                  </Descriptions.Item>
                  <Descriptions.Item label="Documentation">
                    <Button
                      type="link"
                      icon={<FileTextOutlined />}
                      onClick={() => window.open(collection.documentation, '_blank')}
                    >
                      View Documentation
                    </Button>
                  </Descriptions.Item>
                  <Descriptions.Item label="Testing URL">
                    <Button
                      type="link"
                      icon={<ExperimentOutlined />}
                      onClick={() => window.open(collection.testingUrl, '_blank')}
                    >
                      Open Swagger UI
                    </Button>
                  </Descriptions.Item>
                </Descriptions>
              </Card>

              <Card title="Tags" style={{ marginBottom: 24 }}>
                <Space wrap>
                  {collection.tags?.map(tag => (
                    <Tag key={tag} icon={<TagsOutlined />} color="blue">
                      {tag}
                    </Tag>
                  ))}
                </Space>
              </Card>
            </Col>

            <Col xs={24} lg={8}>
              <Card title="Test Status" style={{ marginBottom: 24 }}>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Last Test Result:</Text>
                    <div style={{ marginTop: 8 }}>
                      <Tag color={getTestStatusColor(collection.testStatus)} size="large">
                        {collection.testStatus}
                      </Tag>
                    </div>
                  </div>
                  <div>
                    <Text strong>Last Tested:</Text>
                    <div style={{ marginTop: 4 }}>
                      <Text type="secondary">{collection.lastTested}</Text>
                    </div>
                  </div>
                </Space>
              </Card>

              <Card title="Statistics">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>Total Endpoints:</Text>
                    <Badge count={collection.endpoints?.length || 0} showZero color="#1890ff" />
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>GET:</Text>
                    <Badge 
                      count={collection.endpoints?.filter(e => e.method === 'GET').length || 0} 
                      showZero 
                      color="blue" 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>POST:</Text>
                    <Badge 
                      count={collection.endpoints?.filter(e => e.method === 'POST').length || 0} 
                      showZero 
                      color="green" 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>PUT:</Text>
                    <Badge 
                      count={collection.endpoints?.filter(e => e.method === 'PUT').length || 0} 
                      showZero 
                      color="orange" 
                    />
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <Text>DELETE:</Text>
                    <Badge 
                      count={collection.endpoints?.filter(e => e.method === 'DELETE').length || 0} 
                      showZero 
                      color="red" 
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>

        <TabPane tab={`Endpoints (${collection.endpoints?.length || 0})`} key="endpoints">
          <Card>
            <Table
              columns={endpointsColumns}
              dataSource={collection.endpoints || []}
              rowKey={(record, index) => `${record.method}-${record.path}-${index}`}
              pagination={{ pageSize: 20 }}
              scroll={{ x: 800 }}
            />
          </Card>
        </TabPane>
      </Tabs>
    </div>
  )
}

export default SwaggerCollectionDetail
