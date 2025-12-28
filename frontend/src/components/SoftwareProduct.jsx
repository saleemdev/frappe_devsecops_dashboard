import { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  Tag,
  Typography,
  Row,
  Col,
  Drawer,
  message,
  Tooltip,
  Empty,
  Spin,
  Popconfirm,
  theme,
  Statistic,
  Progress
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  DeleteOutlined,
  UserOutlined,
  AppstoreOutlined,
  RocketOutlined,
  ProjectOutlined,
  WarningOutlined,
  AlertOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import useAuthStore from '../stores/authStore'
import useNavigationStore from '../stores/navigationStore'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography
const { Option } = Select

// Simple API call helper function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token || '',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[apiCall] Error:', error)
    throw error
  }
}

const SoftwareProduct = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const { hasWritePermission } = useAuthStore()
  const { setCurrentRoute, selectedSoftwareProductId, showSoftwareProductForm } = useNavigationStore()
  const [canEditProduct, setCanEditProduct] = useState(true)
  const [checkingPermissions, setCheckingPermissions] = useState(true)
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [isViewDrawerVisible, setIsViewDrawerVisible] = useState(false)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  // Check write permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        setCheckingPermissions(true)
        const hasWrite = await hasWritePermission('Software Product')
        setCanEditProduct(hasWrite)
      } catch (error) {
        console.error('Error checking permissions:', error)
        setCanEditProduct(false)
      } finally {
        setCheckingPermissions(false)
      }
    }

    checkPermissions()
  }, [hasWritePermission])

  // Load products on mount and when filters/search change
  useEffect(() => {
    loadProducts()
  }, [statusFilter, page, pageSize, searchText])

  const loadProducts = async () => {
    setLoading(true)
    try {
      // Build filters for Frappe API
      const filters = []

      // Add status filter
      if (statusFilter !== 'all') {
        filters.push(['Software Product', 'status', '=', statusFilter])
      }

      // Add search filters for product_name
      if (searchText && searchText.trim()) {
        filters.push(['Software Product', 'product_name', 'like', `%${searchText}%`])
      }

      const queryParams = new URLSearchParams({
        fields: JSON.stringify(['name', 'product_name', 'description', 'product_manager', 'status', 'release_status', 'version', 'start_date', 'completion_date', 'production_url', 'uat_url']),
        filters: filters.length > 0 ? JSON.stringify(filters) : '[]',
        limit_start: (page - 1) * pageSize,
        limit_page_length: pageSize,
        order_by: 'modified desc'
      }).toString()

      const endpoint = `/api/method/frappe_devsecops_dashboard.api.software_product.get_products?${queryParams}`

      console.log('[SoftwareProduct] Loading from:', endpoint)

      const response = await apiCall(endpoint)

      console.log('[SoftwareProduct] API Response:', response)

      if (response && response.message !== undefined) {
        // Frappe wraps successful responses in a 'message' key
        const result = response.message || response
        if (result.success) {
          const data = Array.isArray(result.data) ? result.data : []
          console.log('[SoftwareProduct] Products loaded:', data)
          setProducts(data)
          setTotal(result.total || 0)
          if (data.length === 0 && !searchText && statusFilter === 'all') {
            message.info('No software products found. Create your first product!')
          }
        } else {
          throw new Error(result.error || 'API returned unsuccessful')
        }
      } else {
        throw new Error('Invalid API response format')
      }
    } catch (error) {
      console.error('[SoftwareProduct] Error loading products:', error)
      message.error('Unable to load software products: ' + error.message)
      setProducts([])
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    navigateToRoute('software-product-new')
  }

  const handleEdit = (record) => {
    if (record?.name) {
      navigateToRoute('software-product-edit', null, null, record.name)
    } else {
      message.error('Invalid Software Product record')
    }
  }

  const handleView = async (record) => {
    try {
      setViewingRecord(record)
      setIsViewDrawerVisible(true)
      setLoadingMetrics(true)

      // Fetch full details
      const endpoint = `/api/method/frappe_devsecops_dashboard.api.software_product.get_product_detail?name=${encodeURIComponent(record.name)}`
      const response = await apiCall(endpoint)

      if (response.message && response.message.success) {
        setViewingRecord(response.message.data)
      } else {
        message.error('Failed to load product details')
      }

      // Fetch product KPI metrics
      try {
        const kpiEndpoint = `/api/method/frappe_devsecops_dashboard.api.product_kpi.get_product_kpi_data?product_name=${encodeURIComponent(record.name)}`
        const kpiResponse = await apiCall(kpiEndpoint)
        if (kpiResponse.message && kpiResponse.message.success) {
          setProductMetrics(kpiResponse.message.data)
        }
      } catch (kpiError) {
        console.error('Error fetching product metrics:', kpiError)
        // Don't show error for metrics, just log it
      }
    } catch (error) {
      console.error('Error fetching Software Product details:', error)
      message.error('Failed to load product details')
    } finally {
      setLoadingMetrics(false)
    }
  }

  const handleDelete = async (record) => {
    try {
      const response = await apiCall('/api/method/frappe_devsecops_dashboard.api.software_product.delete_product', {
        method: 'POST',
        body: JSON.stringify({ name: record.name }),
        headers: {
          'Content-Type': 'application/json'
        }
      })

      if (response.message && response.message.success) {
        message.success('Software Product deleted')
        loadProducts()
      } else {
        message.error('Failed to delete Software Product')
      }
    } catch (error) {
      message.error('Failed to delete Software Product')
      console.error('Error deleting product:', error)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      'Active': 'green',
      'Draft': 'orange',
      'Inactive': 'red',
      'Archived': 'gray'
    }
    return colors[status] || 'default'
  }

  const getReleaseStatusColor = (status) => {
    const colors = {
      'Planning': 'default',
      'Beta': 'orange',
      'Released': 'green',
      'Deprecated': 'red'
    }
    return colors[status] || 'default'
  }

  const columns = [
    {
      title: 'Product Name',
      dataIndex: 'product_name',
      key: 'product_name',
      render: (text, record) => (
        <Space>
          <AppstoreOutlined style={{ color: '#1890ff' }} />
          <a onClick={() => handleView(record)} style={{ fontWeight: 500 }}>
            {text}
          </a>
        </Space>
      ),
      width: '25%'
    },
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version',
      width: '10%'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status}
        </Tag>
      ),
      width: '10%'
    },
    {
      title: 'Release Status',
      dataIndex: 'release_status',
      key: 'release_status',
      render: (status) => (
        <Tag color={getReleaseStatusColor(status)}>
          {status}
        </Tag>
      ),
      width: '12%'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
              disabled={!canEditProduct}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Product"
            description="Are you sure you want to delete this Software Product?"
            onConfirm={() => handleDelete(record)}
            okText="Yes"
            cancelText="No"
            disabled={!canEditProduct}
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                size="small"
                icon={<DeleteOutlined />}
                disabled={!canEditProduct}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
      width: '13%'
    }
  ]

  if (checkingPermissions) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <RocketOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Software Products
              </Title>
              <Text type="secondary">Manage your software products, versions, and team assignments</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={() => loadProducts()}
                loading={loading}
              >
                Refresh
              </Button>
              {canEditProduct && (
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                  size="large"
                >
                  Create Product
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by name or project..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              style={{ width: '100%' }}
              placeholder="Filter by Status"
              value={statusFilter}
              onChange={(value) => {
                setStatusFilter(value)
                setPage(1)
              }}
            >
              <Option value="all">All Status</Option>
              <Option value="Active">Active</Option>
              <Option value="Draft">Draft</Option>
              <Option value="Inactive">Inactive</Option>
              <Option value="Archived">Archived</Option>
            </Select>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        {products.length === 0 && !loading ? (
          <Empty
            description="No Software Products found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ margin: '24px 0' }}
          >
            {canEditProduct && (
              <Button type="primary" onClick={handleCreate}>
                Create First Product
              </Button>
            )}
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={products.map((p, i) => ({ ...p, key: p.name }))}
            loading={loading}
            pagination={{
              pageSize,
              current: page,
              total,
              onChange: (newPage) => setPage(newPage),
              onShowSizeChange: (_, newSize) => {
                setPageSize(newSize)
                setPage(1)
              },
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} products`
            }}
            rowKey="name"
            scroll={{ x: 1000 }}
          />
        )}
      </Card>

      {/* View Details Drawer */}
      <Drawer
        title={
          <Space>
            <AppstoreOutlined />
            {viewingRecord?.product_name}
          </Space>
        }
        placement="right"
        onClose={() => setIsViewDrawerVisible(false)}
        open={isViewDrawerVisible}
        width={600}
        extra={
          canEditProduct && viewingRecord && (
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => {
                  setIsViewDrawerVisible(false)
                  handleEdit(viewingRecord)
                }}
              >
                Edit
              </Button>
            </Space>
          )
        }
      >
        {viewingRecord && (
          <div>
            {/* Product Manager - Prominent Display */}
            {viewingRecord.product_manager && (
              <Card
                style={{
                  marginBottom: '24px',
                  borderRadius: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f2ff 100%)',
                  border: '1px solid #d6e4ff'
                }}
              >
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0050b3' }}>
                      Product Manager
                    </Text>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', padding: '12px', background: '#fff', borderRadius: '8px' }}>
                    <div style={{ width: '48px', height: '48px', background: '#e6f2ff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <UserOutlined style={{ fontSize: '24px', color: '#0050b3' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 500, fontSize: '16px', color: '#000' }}>
                        {viewingRecord.product_manager}
                      </div>
                      <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                        Overall product strategy & delivery
                      </div>
                    </div>
                  </div>
                </Space>
              </Card>
            )}

            {/* Product Metrics - Management Dashboard */}
            {loadingMetrics ? (
              <div style={{ textAlign: 'center', padding: '24px' }}>
                <Spin size="large" tip="Loading metrics..." />
              </div>
            ) : productMetrics?.metrics ? (
              <div style={{ marginBottom: '24px' }}>
                <Title level={5}>Product Metrics</Title>
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card size="small" style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' }}>
                      <Statistic
                        title="Active Projects"
                        value={productMetrics.metrics.active_projects || 0}
                        suffix={`/ ${productMetrics.metrics.total_projects || 0}`}
                        valueStyle={{ fontSize: 20, fontWeight: 600 }}
                        prefix={<ProjectOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card size="small" style={{ background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' }}>
                      <Statistic
                        title="Critical Risks"
                        value={productMetrics.metrics.critical_risks || 0}
                        suffix={`/ ${productMetrics.metrics.active_risks || 0} active`}
                        valueStyle={{ 
                          fontSize: 20, 
                          fontWeight: 600,
                          color: (productMetrics.metrics.critical_risks || 0) > 5 ? '#ff4d4f' : (productMetrics.metrics.critical_risks || 0) > 2 ? '#fa8c16' : '#52c41a'
                        }}
                        prefix={<WarningOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card size="small" style={{ background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)' }}>
                      <Statistic
                        title="Open Incidents"
                        value={productMetrics.metrics.open_incidents || 0}
                        suffix={`/ ${productMetrics.metrics.total_incidents || 0}`}
                        valueStyle={{ 
                          fontSize: 20, 
                          fontWeight: 600,
                          color: (productMetrics.metrics.open_incidents || 0) > 10 ? '#ff4d4f' : (productMetrics.metrics.open_incidents || 0) > 5 ? '#fa8c16' : '#52c41a'
                        }}
                        prefix={<AlertOutlined />}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card size="small" style={{ background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' }}>
                      <Statistic
                        title="On-Time Delivery"
                        value={productMetrics.metrics.on_time_delivery_rate || 0}
                        suffix="%"
                        valueStyle={{ 
                          fontSize: 20, 
                          fontWeight: 600,
                          color: (productMetrics.metrics.on_time_delivery_rate || 0) >= 80 ? '#52c41a' : (productMetrics.metrics.on_time_delivery_rate || 0) >= 60 ? '#faad14' : '#ff4d4f'
                        }}
                        prefix={<CheckCircleOutlined />}
                      />
                    </Card>
                  </Col>
                </Row>
              </div>
            ) : null}

            {/* Product Information */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>Product Information</Title>
              <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Text type="secondary">Product Name</Text>
                    <br />
                    <Text strong style={{ fontSize: '16px' }}>{viewingRecord.product_name}</Text>
                  </Col>
                  <Col span={24}>
                    <Text type="secondary">Description</Text>
                    <br />
                    <Text>{viewingRecord.description || '-'}</Text>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary">Status</Text>
                    <br />
                    <Tag color={getStatusColor(viewingRecord.status)}>
                      {viewingRecord.status}
                    </Tag>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Text type="secondary">Release Status</Text>
                    <br />
                    <Tag color={getReleaseStatusColor(viewingRecord.release_status)}>
                      {viewingRecord.release_status}
                    </Tag>
                  </Col>
                </Row>
              </Card>
            </div>

            {/* Version */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>Version</Title>
              <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <Tag>{viewingRecord.version || '-'}</Tag>
              </Card>
            </div>

            {/* Environment URLs */}
            {(viewingRecord.production_url || viewingRecord.uat_url) && (
              <div style={{ marginBottom: '24px' }}>
                <Title level={5}>Environment URLs</Title>
                <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                  <Row gutter={[16, 16]}>
                    {viewingRecord.production_url && (
                      <Col span={24}>
                        <Text type="secondary">Production URL</Text>
                        <br />
                        <a href={viewingRecord.production_url} target="_blank" rel="noopener noreferrer">
                          {viewingRecord.production_url}
                        </a>
                      </Col>
                    )}
                    {viewingRecord.uat_url && (
                      <Col span={24}>
                        <Text type="secondary">UAT URL</Text>
                        <br />
                        <a href={viewingRecord.uat_url} target="_blank" rel="noopener noreferrer">
                          {viewingRecord.uat_url}
                        </a>
                      </Col>
                    )}
                  </Row>
                </Card>
              </div>
            )}

            {/* Team Members */}
            <div>
              <Title level={5}>Team Members</Title>
              {viewingRecord.team_members && viewingRecord.team_members.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {viewingRecord.team_members.map((member, index) => (
                    <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', background: '#fafafa', borderRadius: '6px' }}>
                      <UserOutlined style={{ color: '#1890ff', fontSize: '18px' }} />
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 500 }}>{member.member || '-'}</div>
                        {member.role && (
                          <div style={{ fontSize: '12px', color: '#999' }}>
                            <Tag style={{ marginTop: '4px' }}>{member.role}</Tag>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </Space>
              ) : (
                <Empty description="No team members assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default SoftwareProduct
