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
  message,
  Tooltip,
  Empty,
  Spin,
  Popconfirm,
  theme
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

  const handleView = (record) => {
    if (record?.name) {
      navigateToRoute('software-product-detail', null, null, record.name)
    } else {
      message.error('Invalid Software Product record')
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
              placeholder="Search by product name..."
              prefix={<SearchOutlined style={{ color: token.colorPrimary }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              style={{
                borderColor: searchText ? token.colorPrimary : undefined
              }}
            />
            {searchText && (
              <Text type="secondary" style={{ fontSize: '12px', marginTop: '4px', display: 'block' }}>
                Searching: "{searchText}"
              </Text>
            )}
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

    </div>
  )
}

export default SoftwareProduct
