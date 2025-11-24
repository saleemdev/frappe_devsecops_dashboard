import { useState, useEffect } from 'react'
import {
  Form,
  Input,
  Button,
  Select,
  Row,
  Col,
  Card,
  Space,
  message,
  Divider,
  Spin,
  Typography,
  Checkbox,
  InputNumber,
  Table,
  Modal,
  theme,
  Tag
} from 'antd'
import {
  SaveOutlined,
  ArrowLeftOutlined,
  ApiOutlined,
  PlusOutlined,
  DeleteOutlined,
  SyncOutlined
} from '@ant-design/icons'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography
const { TextArea } = Input

const APIRouteForm = ({ mode = 'create', routeId = null, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [route, setRoute] = useState(null)
  const [softwareProducts, setSoftwareProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [apiKeys, setApiKeys] = useState([])
  const [showKeyModal, setShowKeyModal] = useState(false)
  const [keyForm] = Form.useForm()
  const [editingKey, setEditingKey] = useState(null)

  useEffect(() => {
    loadSoftwareProducts()
    if (mode === 'edit' && routeId) {
      console.log('[APIRouteForm] Edit mode - loading route:', routeId)
      loadRoute()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, routeId])

  const loadSoftwareProducts = async () => {
    setProductsLoading(true)
    try {
      const response = await fetch(
        '/api/method/frappe_devsecops_dashboard.api.api_routes.get_software_products',
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
      const result = data.message || data

      if (result.success) {
        setSoftwareProducts(result.data || [])
      }
    } catch (error) {
      console.error('[APIRouteForm] Error loading products:', error)
      message.error('Failed to load software products')
    } finally {
      setProductsLoading(false)
    }
  }

  const loadRoute = async () => {
    setLoading(true)
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.api_routes.get_api_route_detail?name=${encodeURIComponent(routeId)}`,
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
      const result = data.message || data

      if (!response.ok || data.exc_type) {
        message.error('Failed to load route details')
        return
      }

      if (result.success) {
        const routeData = result.data
        setRoute(routeData)
        setApiKeys(routeData.api_keys || [])

        // Set form values
        form.setFieldsValue({
          software_product: routeData.software_product,
          route_name: routeData.route_name,
          api_version: routeData.api_version,
          uri_path: routeData.uri_path,
          http_methods: routeData.http_methods?.split(',') || [],
          status: routeData.status,
          priority: routeData.priority,
          enable_websocket: routeData.enable_websocket,
          upstream_url: routeData.upstream_url,
          upstream_type: routeData.upstream_type,
          upstream_timeout: routeData.upstream_timeout,
          upstream_retries: routeData.upstream_retries,
          enable_auth: routeData.enable_auth,
          auth_type: routeData.auth_type,
          api_key_header: routeData.api_key_header,
          enable_rate_limit: routeData.enable_rate_limit,
          rate_limit_count: routeData.rate_limit_count,
          rate_limit_time_window: routeData.rate_limit_time_window,
          rate_limit_burst: routeData.rate_limit_burst,
          enable_cors: routeData.enable_cors,
          cors_origins: routeData.cors_origins,
          enable_ip_restriction: routeData.enable_ip_restriction,
          allowed_ips: routeData.allowed_ips,
          description: routeData.description,
          tags: routeData.tags
        })

        // Find and set selected product
        const product = softwareProducts.find(p => p.name === routeData.software_product)
        if (product) {
          setSelectedProduct(product)
        }
      }
    } catch (error) {
      console.error('[APIRouteForm] Error loading route:', error)
      message.error('Failed to load route')
    } finally {
      setLoading(false)
    }
  }

  const handleProductChange = (productName) => {
    const product = softwareProducts.find(p => p.name === productName)
    setSelectedProduct(product)

    if (product && product.api_namespace) {
      const version = form.getFieldValue('api_version') || 'v1'
      const generatedUri = `/${version}/${product.api_namespace}/*`
      form.setFieldsValue({ uri_path: generatedUri })
      message.info(`URI path generated: ${generatedUri}`, 3)
    } else if (product && !product.api_namespace) {
      message.warning('Selected product does not have an API namespace configured')
    }
  }

  const handleVersionChange = (e) => {
    if (selectedProduct && selectedProduct.api_namespace) {
      const version = e.target.value || 'v1'
      const generatedUri = `/${version}/${selectedProduct.api_namespace}/*`
      form.setFieldsValue({ uri_path: generatedUri })
    }
  }

  const handleAddKey = () => {
    setEditingKey(null)
    keyForm.resetFields()
    setShowKeyModal(true)
  }

  const handleEditKey = (key, index) => {
    setEditingKey(index)
    keyForm.setFieldsValue(key)
    setShowKeyModal(true)
  }

  const handleDeleteKey = (index) => {
    const newKeys = apiKeys.filter((_, i) => i !== index)
    setApiKeys(newKeys)
    message.success('API key removed')
  }

  const handleSaveKey = () => {
    keyForm.validateFields().then(values => {
      if (editingKey !== null) {
        // Edit existing
        const newKeys = [...apiKeys]
        newKeys[editingKey] = values
        setApiKeys(newKeys)
        message.success('API key updated')
      } else {
        // Add new
        setApiKeys([...apiKeys, values])
        message.success('API key added')
      }
      setShowKeyModal(false)
    })
  }

  const handleSubmit = async (values) => {
    console.log('[APIRouteForm] Submitting with values:', values)

    setSubmitting(true)
    try {
      // Transform HTTP methods array to comma-separated string
      const httpMethods = Array.isArray(values.http_methods)
        ? values.http_methods.join(',')
        : values.http_methods

      const formData = {
        ...values,
        http_methods: httpMethods,
        api_keys: apiKeys
      }

      const endpoint = mode === 'create'
        ? '/api/method/frappe_devsecops_dashboard.api.api_routes.create_api_route'
        : '/api/method/frappe_devsecops_dashboard.api.api_routes.update_api_route'

      const payload = mode === 'create' ? formData : { name: routeId, ...formData }

      console.log('[APIRouteForm] Payload:', payload)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await response.json()
      console.log('[APIRouteForm] API Response:', data)

      if (!response.ok || data.exc_type || data.exception) {
        console.error('[APIRouteForm] Error:', data)
        message.error('Failed to save API Route')
        return
      }

      const result = data.message || data

      if (result.success || result.data) {
        message.success(
          mode === 'create'
            ? 'API Route created successfully!'
            : 'API Route updated successfully!'
        )

        setTimeout(() => {
          navigateToRoute('api-provisioning')
        }, 500)
      } else {
        message.error(result.error || 'Failed to save API Route')
      }
    } catch (error) {
      console.error('[APIRouteForm] Error saving route:', error)
      message.error(error.message || 'Failed to save API Route')
    } finally {
      setSubmitting(false)
    }
  }

  const keyColumns = [
    {
      title: 'Key Name',
      dataIndex: 'key_name',
      key: 'key_name'
    },
    {
      title: 'Active',
      dataIndex: 'is_active',
      key: 'is_active',
      render: (active) => <Tag color={active ? 'success' : 'default'}>{active ? 'Yes' : 'No'}</Tag>
    },
    {
      title: 'Expires On',
      dataIndex: 'expires_on',
      key: 'expires_on',
      render: (date) => date || '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record, index) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditKey(record, index)}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteKey(index)}
          />
        </Space>
      )
    }
  ]

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }} />
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('api-provisioning')}
                style={{ paddingLeft: 0 }}
              >
                Back to API Provisioning
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ApiOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                {mode === 'create' ? 'Create API Route' : `Edit: ${route?.route_name || 'Route'}`}
              </Title>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          initialValues={{
            api_version: 'v1',
            status: 'Draft',
            upstream_type: 'roundrobin',
            upstream_timeout: 60,
            upstream_retries: 1,
            priority: 0,
            enable_websocket: false,
            enable_auth: true,
            auth_type: 'key-auth',
            api_key_header: 'X-API-KEY',
            enable_rate_limit: false,
            rate_limit_count: 100,
            rate_limit_time_window: 60,
            rate_limit_burst: 0,
            enable_cors: false,
            enable_ip_restriction: false,
            http_methods: ['GET', 'POST']
          }}
        >
          {/* Basic Information */}
          <Title level={4}>Basic Information</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Software Product"
                name="software_product"
                rules={[{ required: true, message: 'Please select software product' }]}
              >
                <Select
                  placeholder="Select Software Product"
                  loading={productsLoading}
                  onChange={handleProductChange}
                  showSearch
                  optionFilterProp="children"
                >
                  {softwareProducts.map(p => (
                    <Select.Option key={p.name} value={p.name}>
                      {p.product_name} {p.api_namespace && <Text type="secondary">({p.api_namespace})</Text>}
                    </Select.Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Route Name"
                name="route_name"
                rules={[{ required: true, message: 'Please enter route name' }]}
              >
                <Input placeholder="e.g., User Service API" />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="API Version"
                name="api_version"
                rules={[{ required: true, message: 'Please enter API version' }]}
              >
                <Input placeholder="v1" onChange={handleVersionChange} />
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Status"
                name="status"
                rules={[{ required: true }]}
              >
                <Select>
                  <Select.Option value="Draft">Draft</Select.Option>
                  <Select.Option value="Active">Active</Select.Option>
                  <Select.Option value="Inactive">Inactive</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="Priority"
                name="priority"
                tooltip="Higher priority routes match first"
              >
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="URI Path"
                name="uri_path"
                rules={[{ required: true, message: 'Please enter URI path' }]}
                extra="Auto-generated from product namespace and version"
              >
                <Input placeholder="e.g., /v1/user-service/*" disabled />
              </Form.Item>
            </Col>

            <Col xs={24} md={16}>
              <Form.Item
                label="HTTP Methods"
                name="http_methods"
                rules={[{ required: true, message: 'Please select at least one method' }]}
              >
                <Checkbox.Group>
                  <Row>
                    <Col span={6}><Checkbox value="GET">GET</Checkbox></Col>
                    <Col span={6}><Checkbox value="POST">POST</Checkbox></Col>
                    <Col span={6}><Checkbox value="PUT">PUT</Checkbox></Col>
                    <Col span={6}><Checkbox value="PATCH">PATCH</Checkbox></Col>
                    <Col span={6}><Checkbox value="DELETE">DELETE</Checkbox></Col>
                    <Col span={6}><Checkbox value="OPTIONS">OPTIONS</Checkbox></Col>
                    <Col span={6}><Checkbox value="HEAD">HEAD</Checkbox></Col>
                  </Row>
                </Checkbox.Group>
              </Form.Item>
            </Col>

            <Col xs={24} md={8}>
              <Form.Item
                label="WebSocket Support"
                name="enable_websocket"
                valuePropName="checked"
              >
                <Checkbox>Enable WebSocket</Checkbox>
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* Upstream Configuration */}
          <Title level={4}>Upstream Configuration</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Form.Item
                label="Upstream URL"
                name="upstream_url"
                rules={[
                  { required: true, message: 'Please enter upstream URL' },
                  { type: 'url', message: 'Please enter a valid URL' }
                ]}
              >
                <Input placeholder="http://service:8080" />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Load Balancing Type"
                name="upstream_type"
              >
                <Select>
                  <Select.Option value="roundrobin">Round Robin</Select.Option>
                  <Select.Option value="chash">Consistent Hash</Select.Option>
                  <Select.Option value="ewma">EWMA</Select.Option>
                  <Select.Option value="least_conn">Least Connections</Select.Option>
                </Select>
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Timeout (seconds)"
                name="upstream_timeout"
              >
                <InputNumber min={1} style={{ width: '100%' }} />
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                label="Retries"
                name="upstream_retries"
              >
                <InputNumber min={0} max={10} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* Authentication */}
          <Title level={4}>Authentication</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Form.Item
                name="enable_auth"
                valuePropName="checked"
              >
                <Checkbox>Enable Authentication</Checkbox>
              </Form.Item>
            </Col>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.enable_auth !== curr.enable_auth}>
              {({ getFieldValue }) =>
                getFieldValue('enable_auth') ? (
                  <>
                    <Col xs={24} md={12}>
                      <Form.Item
                        label="Authentication Type"
                        name="auth_type"
                      >
                        <Select>
                          <Select.Option value="key-auth">API Key</Select.Option>
                          <Select.Option value="basic-auth">Basic Auth</Select.Option>
                          <Select.Option value="jwt-auth">JWT</Select.Option>
                          <Select.Option value="oauth2">OAuth2</Select.Option>
                        </Select>
                      </Form.Item>
                    </Col>

                    <Form.Item noStyle shouldUpdate={(prev, curr) => prev.auth_type !== curr.auth_type}>
                      {({ getFieldValue: getField }) =>
                        getField('auth_type') === 'key-auth' ? (
                          <>
                            <Col xs={24} md={12}>
                              <Form.Item
                                label="API Key Header Name"
                                name="api_key_header"
                              >
                                <Input placeholder="X-API-KEY" />
                              </Form.Item>
                            </Col>

                            <Col xs={24}>
                              <div style={{ marginBottom: '16px' }}>
                                <Space>
                                  <Text strong>API Keys</Text>
                                  <Button
                                    type="primary"
                                    size="small"
                                    icon={<PlusOutlined />}
                                    onClick={handleAddKey}
                                  >
                                    Add Key
                                  </Button>
                                </Space>
                              </div>
                              <Table
                                columns={keyColumns}
                                dataSource={apiKeys}
                                rowKey={(record, index) => index}
                                pagination={false}
                                size="small"
                                locale={{ emptyText: 'No API keys configured' }}
                              />
                            </Col>
                          </>
                        ) : null
                      }
                    </Form.Item>
                  </>
                ) : null
              }
            </Form.Item>
          </Row>

          <Divider />

          {/* Rate Limiting */}
          <Title level={4}>Rate Limiting</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Form.Item
                name="enable_rate_limit"
                valuePropName="checked"
              >
                <Checkbox>Enable Rate Limiting</Checkbox>
              </Form.Item>
            </Col>

            <Form.Item noStyle shouldUpdate={(prev, curr) => prev.enable_rate_limit !== curr.enable_rate_limit}>
              {({ getFieldValue }) =>
                getFieldValue('enable_rate_limit') ? (
                  <>
                    <Col xs={24} md={8}>
                      <Form.Item
                        label="Request Count"
                        name="rate_limit_count"
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        label="Time Window (seconds)"
                        name="rate_limit_time_window"
                      >
                        <InputNumber min={1} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>

                    <Col xs={24} md={8}>
                      <Form.Item
                        label="Burst Size"
                        name="rate_limit_burst"
                        tooltip="Additional burst capacity"
                      >
                        <InputNumber min={0} style={{ width: '100%' }} />
                      </Form.Item>
                    </Col>
                  </>
                ) : null
              }
            </Form.Item>
          </Row>

          <Divider />

          {/* Plugins & Security */}
          <Title level={4}>Plugins & Security</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Form.Item
                name="enable_cors"
                valuePropName="checked"
              >
                <Checkbox>Enable CORS</Checkbox>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.enable_cors !== curr.enable_cors}>
                {({ getFieldValue }) =>
                  getFieldValue('enable_cors') ? (
                    <Form.Item
                      label="Allowed Origins"
                      name="cors_origins"
                      extra="Comma-separated list (e.g., https://example.com,https://app.example.com)"
                    >
                      <TextArea rows={3} placeholder="https://example.com,https://app.example.com" />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Col>

            <Col xs={24} md={12}>
              <Form.Item
                name="enable_ip_restriction"
                valuePropName="checked"
              >
                <Checkbox>Enable IP Restriction</Checkbox>
              </Form.Item>

              <Form.Item noStyle shouldUpdate={(prev, curr) => prev.enable_ip_restriction !== curr.enable_ip_restriction}>
                {({ getFieldValue }) =>
                  getFieldValue('enable_ip_restriction') ? (
                    <Form.Item
                      label="Allowed IPs"
                      name="allowed_ips"
                      extra="Comma-separated IPs/ranges (e.g., 192.168.1.0/24,10.0.0.1)"
                    >
                      <TextArea rows={3} placeholder="192.168.1.0/24,10.0.0.1" />
                    </Form.Item>
                  ) : null
                }
              </Form.Item>
            </Col>
          </Row>

          <Divider />

          {/* Metadata */}
          <Title level={4}>Metadata</Title>
          <Row gutter={[24, 24]}>
            <Col xs={24}>
              <Form.Item
                label="Description"
                name="description"
              >
                <TextArea rows={4} placeholder="Describe the purpose of this API route" />
              </Form.Item>
            </Col>

            <Col xs={24}>
              <Form.Item
                label="Tags"
                name="tags"
                extra="Comma-separated tags for categorization"
              >
                <Input placeholder="production,public,v1" />
              </Form.Item>
            </Col>
          </Row>

          {/* Form Actions */}
          <Row justify="center" gutter={[16, 16]} style={{ marginTop: '24px' }}>
            <Col xs={24} sm={8}>
              <Button
                block
                onClick={() => navigateToRoute('api-provisioning')}
              >
                Cancel
              </Button>
            </Col>
            <Col xs={24} sm={8}>
              <Button
                block
                type="primary"
                htmlType="submit"
                loading={submitting}
                icon={<SaveOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                {mode === 'create' ? 'Create Route' : 'Update Route'}
              </Button>
            </Col>
            {mode === 'edit' && (
              <Col xs={24} sm={8}>
                <Button
                  block
                  icon={<SyncOutlined />}
                  onClick={() => {
                    // Force sync logic would go here
                    message.info('Force sync will be triggered on save')
                  }}
                >
                  Force Sync to APISIX
                </Button>
              </Col>
            )}
          </Row>
        </Form>
      </Card>

      {/* API Key Modal */}
      <Modal
        title={editingKey !== null ? 'Edit API Key' : 'Add API Key'}
        open={showKeyModal}
        onOk={handleSaveKey}
        onCancel={() => setShowKeyModal(false)}
        width={500}
      >
        <Form
          form={keyForm}
          layout="vertical"
          initialValues={{ is_active: true }}
        >
          <Form.Item
            label="Key Name"
            name="key_name"
            rules={[{ required: true, message: 'Please enter key name' }]}
          >
            <Input placeholder="e.g., Production Key" />
          </Form.Item>

          <Form.Item
            label="API Key"
            name="api_key"
            rules={[{ required: true, message: 'Please enter API key' }]}
          >
            <Input.Password placeholder="your-secret-api-key" />
          </Form.Item>

          <Form.Item
            name="is_active"
            valuePropName="checked"
          >
            <Checkbox>Active</Checkbox>
          </Form.Item>

          <Form.Item
            label="Expires On"
            name="expires_on"
          >
            <Input type="date" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default APIRouteForm
