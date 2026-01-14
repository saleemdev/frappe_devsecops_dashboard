import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Descriptions,
  message,
  Spin,
  Empty,
  Tooltip,
  Divider,
  theme,
  Statistic,
  Avatar
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  RocketOutlined,
  UserOutlined,
  CalendarOutlined,
  TeamOutlined,
  AppstoreOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  AlertOutlined,
  ProjectOutlined,
  GlobalOutlined,
  DashboardOutlined,
  BarChartOutlined,
  SyncOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text, Paragraph } = Typography

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

const SoftwareProductDetail = ({ productId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(true)
  const [product, setProduct] = useState(null)
  const [productMetrics, setProductMetrics] = useState(null)
  const [loadingMetrics, setLoadingMetrics] = useState(false)
  const [loadError, setLoadError] = useState(null)

  // Fetch product on mount or when productId changes
  useEffect(() => {
    const loadProductData = async () => {
      if (!productId) {
        console.warn('[SoftwareProductDetail] No productId provided')
        setLoadError('Product ID is required')
        setLoading(false)
        return
      }

      try {
        console.log('[SoftwareProductDetail] Loading product:', productId)
        setLoading(true)
        setLoadError(null)

        // Fetch product details
        const endpoint = `/api/method/frappe_devsecops_dashboard.api.software_product.get_product_detail?name=${encodeURIComponent(productId)}`
        const response = await apiCall(endpoint)

        if (response.message && response.message.success) {
          setProduct(response.message.data)
          console.log('[SoftwareProductDetail] Loaded product data:', response.message.data)
        } else {
          throw new Error('Failed to load product details')
        }

        // Fetch product KPI metrics (gracefully handle if endpoint doesn't exist)
        setLoadingMetrics(true)
        try {
          const kpiEndpoint = `/api/method/frappe_devsecops_dashboard.api.product_kpi.get_product_kpi_data?product_name=${encodeURIComponent(productId)}`
          const kpiResponse = await apiCall(kpiEndpoint)
          if (kpiResponse.message && kpiResponse.message.success) {
            setProductMetrics(kpiResponse.message.data)
          }
        } catch (kpiError) {
          console.warn('Product metrics endpoint not available or error occurred:', kpiError.message)
          // Don't show error for metrics, metrics are optional
          setProductMetrics(null)
        } finally {
          setLoadingMetrics(false)
        }
      } catch (error) {
        console.error('[SoftwareProductDetail] Error loading product:', error)
        const errorMsg = error?.message || 'Failed to load product details'
        setLoadError(errorMsg)
        message.error(errorMsg)
      } finally {
        setLoading(false)
      }
    }

    loadProductData()
  }, [productId])

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

  // Get icon for product details field
  const getDetailFieldIcon = (fieldName) => {
    const iconMap = {
      'name': <RocketOutlined />,
      'product_name': <AppstoreOutlined />,
      'description': <FileTextOutlined />,
      'product_manager': <UserOutlined />,
      'status': <CheckCircleOutlined />,
      'release_status': <RocketOutlined />,
      'version': <AppstoreOutlined />,
      'start_date': <CalendarOutlined />,
      'completion_date': <CalendarOutlined />,
      'production_url': <GlobalOutlined />,
      'uat_url': <GlobalOutlined />,
      'zenhub_workspace_id': <DashboardOutlined />
    }
    return iconMap[fieldName] || <AppstoreOutlined />
  }

  // Handle edit navigation
  const handleEditProduct = () => {
    console.log('[SoftwareProductDetail] Edit button clicked for product:', productId)
    if (productId) {
      navigateToRoute('software-product-edit', null, null, productId)
    } else {
      message.error('Cannot edit: Product ID is missing')
    }
  }

  // Handle back navigation
  const handleBackToProducts = () => {
    console.log('[SoftwareProductDetail] Back to products button clicked')
    navigateToRoute('software-product')
  }

  // Fetch workspace summary
  const fetchWorkspaceSummary = async () => {
    const workspaceId = product?.zenhub_workspace_id
    if (!workspaceId) {
      message.warning('Please configure Zenhub Workspace ID first')
      return
    }

    setLoadingMetrics(true)
    try {
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary?workspace_id=${encodeURIComponent(workspaceId)}`
      )

      if (response.success) {
        message.success('Workspace summary loaded successfully')
        // You could show this in a modal or update the UI
      } else {
        throw new Error(response.error || 'Failed to fetch workspace summary')
      }
    } catch (error) {
      console.error('Error fetching workspace summary:', error)
      message.error(error.message || 'Failed to fetch workspace summary')
    } finally {
      setLoadingMetrics(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading product details...</div>
      </div>
    )
  }

  if (!loading && !product) {
    const errorDescription = loadError || 'Product not found'
    const isNotFoundError = loadError?.includes('not found') || loadError?.includes('404')

    return (
      <Card style={{ marginTop: '24px' }}>
        <Empty
          description={isNotFoundError ? 'Product Not Found' : 'Unable to Load Product'}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Space direction="vertical" style={{ marginTop: '16px' }}>
            <Text type="secondary">{errorDescription}</Text>
            <Button type="primary" onClick={handleBackToProducts}>
              Back to Software Products
            </Button>
          </Space>
        </Empty>
      </Card>
    )
  }

  if (!product) {
    return null // Should not reach here due to earlier check, but safety fallback
  }

  return (
    <div>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col xs={24} sm={16}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToProducts}
                type="default"
                size="large"
              >
                Back to Software Products List
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <RocketOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                {product.product_name}
              </Title>
              <Space wrap size="small">
                <Tag
                  icon={<CheckCircleOutlined />}
                  color={getStatusColor(product.status)}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  <strong>Status:</strong> {product.status}
                </Tag>
                <Tag
                  icon={<RocketOutlined />}
                  color={getReleaseStatusColor(product.release_status)}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  <strong>Release Status:</strong> {product.release_status}
                </Tag>
                {product.version && (
                  <Tag icon={<AppstoreOutlined />} style={{ fontSize: '14px', padding: '6px 12px' }}>
                    <strong>Version:</strong> {product.version}
                  </Tag>
                )}
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={10} style={{ marginTop: '16px' }}>
            <Space wrap>
              {product.zenhub_workspace_id && (
                <>
                  <Button
                    icon={<DashboardOutlined />}
                    onClick={fetchWorkspaceSummary}
                    loading={loadingMetrics}
                  >
                    Workspace Summary
                  </Button>
                  <Button
                    icon={<BarChartOutlined />}
                    onClick={() => navigateToRoute('product-sprint-summary', null, null, productId)}
                  >
                    Sprint Summary
                  </Button>
                </>
              )}
              <Button
                icon={<EditOutlined />}
                type="primary"
                onClick={handleEditProduct}
              >
                Edit Product
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Product Manager - Prominent Display */}
      {product.product_manager && (
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
                  {product.product_manager}
                </div>
                <div style={{ fontSize: '12px', color: '#999', marginTop: '4px' }}>
                  Overall product strategy & delivery
                </div>
              </div>
            </div>
          </Space>
        </Card>
      )}

      {/* Product Metrics */}
      {loadingMetrics ? (
        <Card style={{ marginBottom: '24px', textAlign: 'center', padding: '24px' }}>
          <Spin size="large" tip="Loading metrics..." />
        </Card>
      ) : productMetrics?.metrics ? (
        <Card
          title={
            <Space>
              <BarChartOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
              <span>Product Metrics</span>
            </Space>
          }
          style={{ marginBottom: '24px' }}
        >
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
        </Card>
      ) : null}

      {/* Product Details */}
      <Card
        title={
          <Space>
            <AppstoreOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>Product Details</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('name')}
              <span>Product ID</span>
            </Space>
          }>
            <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
              {product.name}
            </code>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('product_name')}
              <span>Product Name</span>
            </Space>
          }>
            <Text strong>{product.product_name}</Text>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('status')}
              <span>Status</span>
            </Space>
          }>
            <Tag color={getStatusColor(product.status)}>
              {product.status}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('release_status')}
              <span>Release Status</span>
            </Space>
          }>
            <Tag color={getReleaseStatusColor(product.release_status)}>
              {product.release_status}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('version')}
              <span>Version</span>
            </Space>
          }>
            <Text>{product.version || '-'}</Text>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('product_manager')}
              <span>Product Manager</span>
            </Space>
          }>
            <Space size={8}>
              <UserOutlined style={{ color: getHeaderIconColor(token) }} />
              <Text>{product.product_manager || '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('start_date')}
              <span>Start Date</span>
            </Space>
          }>
            <Space size={8}>
              <CalendarOutlined style={{ color: '#faad14' }} />
              <Text type="secondary">{product.start_date ? dayjs(product.start_date).format('YYYY-MM-DD') : '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('completion_date')}
              <span>Expected Completion</span>
            </Space>
          }>
            <Space size={8}>
              <CalendarOutlined style={{ color: '#faad14' }} />
              <Text type="secondary">{product.completion_date ? dayjs(product.completion_date).format('YYYY-MM-DD') : '-'}</Text>
            </Space>
          </Descriptions.Item>

          {product.production_url && (
            <Descriptions.Item label={
              <Space size={8}>
                {getDetailFieldIcon('production_url')}
                <span>Production URL</span>
              </Space>
            }>
              <a href={product.production_url} target="_blank" rel="noopener noreferrer">
                {product.production_url}
              </a>
            </Descriptions.Item>
          )}

          {product.uat_url && (
            <Descriptions.Item label={
              <Space size={8}>
                {getDetailFieldIcon('uat_url')}
                <span>UAT URL</span>
              </Space>
            }>
              <a href={product.uat_url} target="_blank" rel="noopener noreferrer">
                {product.uat_url}
              </a>
            </Descriptions.Item>
          )}

          {product.zenhub_workspace_id && (
            <Descriptions.Item label={
              <Space size={8}>
                {getDetailFieldIcon('zenhub_workspace_id')}
                <span>Zenhub Workspace ID</span>
              </Space>
            }>
              <Text code>{product.zenhub_workspace_id}</Text>
            </Descriptions.Item>
          )}

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('description')}
              <span>Description</span>
            </Space>
          } span={2}>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '12px',
              borderRadius: '4px',
              borderLeft: '3px solid #1890ff'
            }}>
              <Paragraph style={{ margin: 0 }}>
                {product.description ? (
                  <div dangerouslySetInnerHTML={{ __html: product.description }} />
                ) : (
                  <Text type="secondary">No description provided</Text>
                )}
              </Paragraph>
            </div>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Team Members */}
      <Card
        title={
          <Space>
            <TeamOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>Team Members</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        {product.team_members && product.team_members.length > 0 ? (
          <Row gutter={[16, 16]}>
            {product.team_members.map((member, index) => (
              <Col xs={24} sm={12} md={8} key={index}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Space>
                    <Avatar
                      src={member.member_user_image}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: getHeaderIconColor(token) }}
                    />
                    <div>
                      <div style={{ fontWeight: 500 }}>
                        {member.member_full_name || member.member || '-'}
                      </div>
                      {member.member_email && (
                        <div style={{ fontSize: '12px', color: '#999' }}>
                          {member.member_email}
                        </div>
                      )}
                      {member.role && (
                        <div style={{ marginTop: '4px' }}>
                          <Tag>{member.role}</Tag>
                        </div>
                      )}
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        ) : (
          <Empty description="No team members assigned" image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </Card>
    </div>
  )
}

export default SoftwareProductDetail

