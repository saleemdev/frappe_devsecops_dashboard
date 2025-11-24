import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Space,
  Card,
  Row,
  Col,
  Input,
  Drawer,
  Empty,
  message,
  Popconfirm,
  Typography,
  Tag,
  Badge,
  Tooltip,
  Spin,
  theme
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  SyncOutlined,
  ArrowLeftOutlined,
  ApiOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const APIProvisioning = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(false)
  const [deletingId, setDeletingId] = useState(null)
  const [syncingId, setSyncingId] = useState(null)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  useEffect(() => {
    loadRoutes()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pagination.current, pagination.pageSize, searchText])

  const loadRoutes = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit_start: (pagination.current - 1) * pagination.pageSize,
        limit_page_length: pagination.pageSize
      })

      // Add search filter
      const filters = searchText && searchText.trim()
        ? JSON.stringify([['API Route', 'route_name', 'like', `%${searchText.trim()}%`]])
        : JSON.stringify([])
      params.append('filters', filters)

      const endpoint = `/api/method/frappe_devsecops_dashboard.api.api_routes.get_api_routes?${params}`

      console.log('[APIProvisioning] Loading from:', endpoint)

      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      console.log('[APIProvisioning] API Response:', data)

      // Check for Frappe error structure
      if (data.exc_type || data.exception) {
        console.error('[APIProvisioning] Frappe error:', data)
        const errorMsg = data.message?.message || data.message || 'Failed to load API Routes'
        message.error(errorMsg)
        setRoutes([])
        setPagination(prev => ({ ...prev, total: 0 }))
        return
      }

      // Handle Frappe API response structure
      const result = data.message !== undefined ? data.message : data

      if (result && result.success) {
        const routesData = Array.isArray(result.data) ? result.data : []
        console.log('[APIProvisioning] Routes loaded:', routesData.length, 'routes')
        setRoutes(routesData)
        setPagination(prev => ({ ...prev, total: result.total || 0 }))

        if (routesData.length === 0 && !searchText) {
          message.info('No API routes found. Create your first route!')
        }
      } else {
        console.error('[APIProvisioning] API returned unsuccessful:', result)
        const errorMsg = result?.error || result?.message || 'Failed to load API Routes'
        message.error(errorMsg)
        setRoutes([])
        setPagination(prev => ({ ...prev, total: 0 }))
      }
    } catch (error) {
      console.error('[APIProvisioning] Error loading routes:', error)
      message.error(error.message || 'Failed to load API Routes')
      setRoutes([])
      setPagination(prev => ({ ...prev, total: 0 }))
    } finally {
      setLoading(false)
    }
  }

  const loadRouteDetail = async (name) => {
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.api_routes.get_api_route_detail?name=${encodeURIComponent(name)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      const data = await response.json()
      console.log('[APIProvisioning] Detail API Response:', data)

      if (!response.ok || data.exc_type || data.exception) {
        console.error('[APIProvisioning] Detail error:', data)
        message.error('Failed to load route details')
        return
      }

      const result = data.message || data

      if (result.success) {
        setViewingRecord(result.data)
        setDrawerOpen(true)
      } else {
        message.error(result.error || 'Failed to load route details')
      }
    } catch (error) {
      console.error('[APIProvisioning] Error loading detail:', error)
      message.error(error.message || 'Failed to load route details')
    }
  }

  const handleDelete = async (name) => {
    setDeletingId(name)
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.api_routes.delete_api_route?name=${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      const data = await response.json()
      console.log('[APIProvisioning] Delete API Response:', data)

      if (!response.ok || data.exc_type || data.exception) {
        console.error('[APIProvisioning] Delete error:', data)
        message.error('Failed to delete API Route')
        return
      }

      const result = data.message || data

      if (result.success !== false) {
        message.success('API Route deleted successfully')
        loadRoutes()
      } else {
        message.error(result.error || 'Failed to delete API Route')
      }
    } catch (error) {
      console.error('[APIProvisioning] Error deleting route:', error)
      message.error(error.message || 'Failed to delete API Route')
    } finally {
      setDeletingId(null)
    }
  }

  const handleForceSync = async (name) => {
    setSyncingId(name)
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.api_routes.sync_route_to_apisix?name=${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      const data = await response.json()
      console.log('[APIProvisioning] Sync API Response:', data)

      if (!response.ok || data.exc_type || data.exception) {
        console.error('[APIProvisioning] Sync error:', data)
        message.error('Failed to sync route to APISIX')
        return
      }

      const result = data.message || data

      if (result.success) {
        message.success('Route synced to APISIX successfully')
        loadRoutes()
      } else {
        message.error(result.error || 'Failed to sync route')
      }
    } catch (error) {
      console.error('[APIProvisioning] Error syncing route:', error)
      message.error(error.message || 'Failed to sync route to APISIX')
    } finally {
      setSyncingId(null)
    }
  }

  const getStatusTag = (status) => {
    const statusColors = {
      'Draft': 'default',
      'Active': 'success',
      'Inactive': 'warning',
      'Error': 'error'
    }
    return <Tag color={statusColors[status] || 'default'}>{status}</Tag>
  }

  const getSyncStatusBadge = (syncStatus) => {
    const statusConfig = {
      'Not Synced': { color: 'default', icon: <WarningOutlined /> },
      'Syncing': { color: 'processing', icon: <LoadingOutlined /> },
      'Synced': { color: 'success', icon: <CheckCircleOutlined /> },
      'Failed': { color: 'error', icon: <CloseCircleOutlined /> }
    }

    const config = statusConfig[syncStatus] || statusConfig['Not Synced']
    return (
      <Badge
        status={config.color}
        text={
          <Space size={4}>
            {config.icon}
            <span>{syncStatus}</span>
          </Space>
        }
      />
    )
  }

  const columns = [
    {
      title: 'Route Name',
      dataIndex: 'route_name',
      key: 'route_name',
      width: '20%',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Software Product',
      dataIndex: 'software_product',
      key: 'software_product',
      width: '18%',
      render: (text) => <Text type="secondary">{text || '-'}</Text>
    },
    {
      title: 'API Version',
      dataIndex: 'api_version',
      key: 'api_version',
      width: '10%',
      render: (text) => <Tag>{text}</Tag>
    },
    {
      title: 'URI Path',
      dataIndex: 'uri_path',
      key: 'uri_path',
      width: '22%',
      render: (text) => <Text code style={{ fontSize: '12px' }}>{text}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: '10%',
      render: (status) => getStatusTag(status)
    },
    {
      title: 'Sync Status',
      dataIndex: 'sync_status',
      key: 'sync_status',
      width: '12%',
      render: (syncStatus) => getSyncStatusBadge(syncStatus)
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '8%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => loadRouteDetail(record.name)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigateToRoute('api-provisioning-edit', null, record.name)}
            />
          </Tooltip>
          <Tooltip title="Force Sync">
            <Button
              type="text"
              size="small"
              icon={<SyncOutlined />}
              loading={syncingId === record.name}
              disabled={syncingId !== null}
              onClick={() => handleForceSync(record.name)}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete API Route"
              description="Are you sure? This will also delete the route from APISIX."
              onConfirm={() => handleDelete(record.name)}
              okText="Yes, Delete"
              cancelText="Cancel"
              okButtonProps={{ danger: true, loading: deletingId === record.name }}
            >
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                loading={deletingId === record.name}
                disabled={deletingId !== null}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{
        marginBottom: 24,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('dashboard')}
                style={{ paddingLeft: 0 }}
              >
                Back to Dashboard
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ApiOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                API Provisioning
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigateToRoute('api-provisioning-create')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                height: '40px'
              }}
            >
              New API Route
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Search */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={20}>
            <Input
              placeholder="Search API Routes by name..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setPagination(prev => ({ ...prev, current: 1 }))
              }}
              onPressEnter={loadRoutes}
              style={{ borderRadius: '6px' }}
            />
          </Col>
          <Col xs={24} sm={4}>
            <Button
              icon={<SearchOutlined />}
              block
              onClick={loadRoutes}
            >
              Search
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={routes}
          loading={loading}
          rowKey="name"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} routes`,
            onChange: (page, pageSize) => {
              setPagination(prev => ({ ...prev, current: page, pageSize }))
            }
          }}
          scroll={{ x: 1200 }}
          locale={{
            emptyText: <Empty description="No API Routes found" />
          }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title="API Route Details"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={600}
      >
        {viewingRecord && (
          <div>
            {/* Route Information */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>Route Information</Title>
              <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Text type="secondary">Route Name</Text>
                    <br />
                    <Text strong style={{ fontSize: '16px' }}>{viewingRecord.route_name}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Software Product</Text>
                    <br />
                    <Text>{viewingRecord.software_product || '-'}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">API Version</Text>
                    <br />
                    <Tag>{viewingRecord.api_version}</Tag>
                  </Col>
                  <Col span={24}>
                    <Text type="secondary">URI Path</Text>
                    <br />
                    <Text code>{viewingRecord.uri_path}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Status</Text>
                    <br />
                    {getStatusTag(viewingRecord.status)}
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Sync Status</Text>
                    <br />
                    {getSyncStatusBadge(viewingRecord.sync_status)}
                  </Col>
                  {viewingRecord.apisix_route_id && (
                    <Col span={24}>
                      <Text type="secondary">APISIX Route ID</Text>
                      <br />
                      <Text code>{viewingRecord.apisix_route_id}</Text>
                    </Col>
                  )}
                </Row>
              </Card>
            </div>

            {/* Upstream Configuration */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>Upstream Configuration</Title>
              <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Text type="secondary">Upstream URL</Text>
                    <br />
                    <Text code>{viewingRecord.upstream_url}</Text>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Load Balancing</Text>
                    <br />
                    <Tag color="blue">{viewingRecord.upstream_type}</Tag>
                  </Col>
                  <Col span={12}>
                    <Text type="secondary">Timeout</Text>
                    <br />
                    <Text>{viewingRecord.upstream_timeout}s</Text>
                  </Col>
                </Row>
              </Card>
            </div>

            {/* Authentication */}
            {viewingRecord.enable_auth && (
              <div style={{ marginBottom: '24px' }}>
                <Title level={5}>Authentication</Title>
                <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                  <Text type="secondary">Type: </Text>
                  <Tag color="purple">{viewingRecord.auth_type}</Tag>
                  {viewingRecord.api_keys && viewingRecord.api_keys.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      <Text type="secondary">API Keys: {viewingRecord.api_keys.length} configured</Text>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* Rate Limiting */}
            {viewingRecord.enable_rate_limit && (
              <div style={{ marginBottom: '24px' }}>
                <Title level={5}>Rate Limiting</Title>
                <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                  <Text>{viewingRecord.rate_limit_count} requests per {viewingRecord.rate_limit_time_window}s</Text>
                </Card>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default APIProvisioning
