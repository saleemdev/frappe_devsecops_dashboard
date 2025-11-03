import { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Space,
  Typography,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Switch
} from 'antd'
import { useResponsive } from '../hooks/useResponsive'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  BarChartOutlined,
  SearchOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

// API call helper function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()

    // Handle Frappe API response format
    if (data.message) {
      return data.message
    }

    return data
  } catch (error) {
    throw error
  }
}

const MonitoringDashboards = () => {
  const [dashboards, setDashboards] = useState([])
  const [filteredDashboards, setFilteredDashboards] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [editingDashboard, setEditingDashboard] = useState(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  const [form] = Form.useForm()

  // Responsive hook
  const { isMobile } = useResponsive()

  // Dashboard categories and types
  const categories = ['Infrastructure', 'Application', 'Security', 'Performance', 'Other']
  const dashboardTypes = ['Grafana', 'Kibana', 'Prometheus', 'Custom']
  const accessLevels = ['Public', 'Internal', 'Restricted']

  // Load dashboards on component mount
  useEffect(() => {
    loadDashboards()
  }, [])

  // Filter dashboards based on search and filters
  useEffect(() => {
    let filtered = dashboards

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(dashboard =>
        dashboard.dashboard_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.category?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(dashboard => dashboard.category === categoryFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active'
      filtered = filtered.filter(dashboard => dashboard.is_active === isActive)
    }

    setFilteredDashboards(filtered)
  }, [dashboards, searchQuery, categoryFilter, statusFilter])

  const loadDashboards = async () => {
    setLoading(true)
    try {
      const response = await apiCall('/api/method/frappe_devsecops_dashboard.api.monitoring_dashboards.get_dashboard_urls')

      if (response?.success) {
        setDashboards(response.data || [])
      } else {
        message.error('Failed to load monitoring dashboards')
      }
    } catch (error) {
      console.error('Error loading dashboards:', error)
      message.error('Failed to load monitoring dashboards')
    } finally {
      setLoading(false)
    }
  }

  const handleAddDashboard = () => {
    setEditingDashboard(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEditDashboard = async (dashboard) => {
    try {
      console.log('[MonitoringDashboards] Edit clicked for dashboard:', dashboard)
      console.log('[MonitoringDashboards] Document name (ID):', dashboard.name)

      // Fetch complete dashboard details from backend
      const response = await apiCall(`/api/method/frappe_devsecops_dashboard.api.monitoring_dashboards.get_dashboard_url?name=${encodeURIComponent(dashboard.name)}`)

      console.log('[MonitoringDashboards] Fetched dashboard details:', response)

      if (response?.success && response?.data) {
        const dashboardData = response.data
        console.log('[MonitoringDashboards] Setting form values with fetched data:', dashboardData)

        setEditingDashboard(dashboardData)
        form.setFieldsValue({
          dashboard_name: dashboardData.dashboard_name,
          dashboard_url: dashboardData.dashboard_url,
          dashboard_type: dashboardData.dashboard_type,
          category: dashboardData.category,
          description: dashboardData.description,
          is_active: dashboardData.is_active,
          access_level: dashboardData.access_level,
          project: dashboardData.project,
          sort_order: dashboardData.sort_order
        })
        setModalVisible(true)
      } else {
        message.error(response?.error || 'Failed to fetch dashboard details')
      }
    } catch (error) {
      console.error('[MonitoringDashboards] Error fetching dashboard details:', error)
      message.error('Failed to fetch dashboard details')
    }
  }

  const handleDeleteDashboard = async (dashboardRecord) => {
    try {
      console.log('[MonitoringDashboards] Delete clicked for dashboard:', dashboardRecord)
      console.log('[MonitoringDashboards] Document name (ID) to delete:', dashboardRecord.name)

      const response = await apiCall(`/api/method/frappe_devsecops_dashboard.api.monitoring_dashboards.delete_dashboard_url?name=${encodeURIComponent(dashboardRecord.name)}`, {
        method: 'POST'
      })

      console.log('[MonitoringDashboards] Delete response:', response)

      if (response?.success) {
        setDashboards(prev => prev.filter(d => d.name !== dashboardRecord.name))
        message.success('Dashboard deleted successfully')
      } else {
        message.error(response?.error || 'Failed to delete dashboard')
      }
    } catch (error) {
      console.error('[MonitoringDashboards] Error deleting dashboard:', error)
      message.error('Failed to delete dashboard')
    }
  }

  const handleViewDashboard = (dashboard) => {
    window.open(dashboard.dashboard_url, '_blank', 'noopener,noreferrer')
  }

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields()
      console.log('[MonitoringDashboards] Form values:', values)

      if (editingDashboard) {
        // Update existing dashboard
        console.log('[MonitoringDashboards] Updating dashboard:', editingDashboard.name)
        const response = await apiCall('/api/method/frappe_devsecops_dashboard.api.monitoring_dashboards.update_dashboard_url', {
          method: 'POST',
          body: JSON.stringify({
            name: editingDashboard.name,
            data: values
          })
        })

        console.log('[MonitoringDashboards] Update response:', response)
        if (response?.success) {
          await loadDashboards()
          message.success('Dashboard updated successfully')
          setModalVisible(false)
          form.resetFields()
        } else {
          message.error(response?.error || 'Failed to update dashboard')
        }
      } else {
        // Create new dashboard
        console.log('[MonitoringDashboards] Creating new dashboard')
        const response = await apiCall('/api/method/frappe_devsecops_dashboard.api.monitoring_dashboards.create_dashboard_url', {
          method: 'POST',
          body: JSON.stringify({ data: values })
        })

        console.log('[MonitoringDashboards] Create response:', response)
        if (response?.success) {
          await loadDashboards()
          message.success('Dashboard created successfully')
          setModalVisible(false)
          form.resetFields()
        } else {
          message.error(response?.error || 'Failed to create dashboard')
        }
      }
    } catch (error) {
      console.error('[MonitoringDashboards] Error submitting form:', error)
      message.error('Please fill in all required fields')
    }
  }

  const columns = [
    {
      title: 'Dashboard Name',
      dataIndex: 'dashboard_name',
      key: 'dashboard_name',
      sorter: (a, b) => (a.dashboard_name || '').localeCompare(b.dashboard_name || ''),
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '14px' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description && record.description.length > 60
              ? `${record.description.substring(0, 60)}...`
              : record.description || 'No description'
            }
          </Text>
        </Space>
      )
    },
    {
      title: 'Type',
      dataIndex: 'dashboard_type',
      key: 'dashboard_type',
      width: 100,
      sorter: (a, b) => (a.dashboard_type || '').localeCompare(b.dashboard_type || ''),
      render: (type) => <Tag color="blue">{type || 'Custom'}</Tag>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      sorter: (a, b) => (a.category || '').localeCompare(b.category || ''),
      render: (category) => {
        const colors = {
          Infrastructure: 'blue',
          Application: 'green',
          Security: 'red',
          Performance: 'orange',
          Other: 'gray'
        }
        return <Tag color={colors[category] || 'default'}>{category || 'Other'}</Tag>
      }
    },
    {
      title: 'Status',
      dataIndex: 'is_active',
      key: 'is_active',
      width: 100,
      sorter: (a, b) => a.is_active - b.is_active,
      render: (isActive) => (
        <Tag
          icon={isActive ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={isActive ? 'success' : 'error'}
        >
          {isActive ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Open Dashboard">
            <Button
              type="text"
              size="small"
              icon={<LinkOutlined />}
              onClick={() => handleViewDashboard(record)}
            />
          </Tooltip>
          <Tooltip title="Edit Dashboard">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditDashboard(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Dashboard"
            description={`Are you sure you want to delete "${record.dashboard_name}"?`}
            onConfirm={() => handleDeleteDashboard(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete Dashboard">
              <Button
                type="text"
                size="small"
                icon={<DeleteOutlined />}
                danger
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '20px' }}>
      <Card>
        <div style={{ marginBottom: '20px' }}>
          <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
            <BarChartOutlined style={{ marginRight: '8px', color: '#1890ff' }} />
            Monitoring Dashboards
          </Title>
          <Text type="secondary">
            Manage and access your monitoring dashboards for infrastructure, applications, and security
          </Text>
        </div>

        {/* Filters and Search */}
        <Row gutter={[16, 16]} style={{ marginBottom: '20px' }}>
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Search dashboards..."
              allowClear
              prefix={<SearchOutlined />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Categories</Option>
              {categories.map(cat => (
                <Option key={cat} value={cat}>{cat}</Option>
              ))}
            </Select>
          </Col>
          <Col xs={12} sm={6} md={4}>
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Status</Option>
              <Option value="active">Active</Option>
              <Option value="inactive">Inactive</Option>
            </Select>
          </Col>
          <Col xs={24} sm={12} md={8} style={{ textAlign: 'right' }}>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddDashboard}
            >
              Add Dashboard
            </Button>
          </Col>
        </Row>

        {/* Dashboards Table */}
        <Table
          columns={columns}
          dataSource={filteredDashboards}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: isMobile ? 5 : 10,
            showSizeChanger: !isMobile,
            showQuickJumper: !isMobile,
            showTotal: !isMobile ? (total, range) =>
              `${range[0]}-${range[1]} of ${total} dashboards` : undefined,
            simple: isMobile
          }}
          scroll={{ x: isMobile ? 600 : 800 }}
          size={isMobile ? 'small' : 'middle'}
        />

        {/* Add/Edit Dashboard Modal */}
        <Modal
          title={editingDashboard ? 'Edit Dashboard' : 'Add New Dashboard'}
          open={modalVisible}
          onOk={handleModalSubmit}
          onCancel={() => {
            setModalVisible(false)
            form.resetFields()
          }}
          width={600}
          okText={editingDashboard ? 'Update' : 'Add'}
        >
          <Form
            form={form}
            layout="vertical"
            initialValues={{ is_active: true, dashboard_type: 'Custom', category: 'Other', access_level: 'Internal', sort_order: 0 }}
          >
            {editingDashboard && (
              <Form.Item label="Document ID" style={{ marginBottom: '16px' }}>
                <div style={{
                  padding: '8px 12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  border: '1px solid #d9d9d9',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: '#666'
                }}>
                  {editingDashboard.name}
                </div>
              </Form.Item>
            )}

            <Form.Item
              name="dashboard_name"
              label="Dashboard Name"
              rules={[{ required: true, message: 'Please enter dashboard name' }]}
            >
              <Input placeholder="Enter dashboard name" />
            </Form.Item>

            <Form.Item
              name="dashboard_url"
              label="Dashboard URL"
              rules={[
                { required: true, message: 'Please enter dashboard URL' }
              ]}
            >
              <Input
                prefix={<LinkOutlined />}
                placeholder="https://example.com/dashboard"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="dashboard_type"
                  label="Dashboard Type"
                >
                  <Select placeholder="Select type">
                    {dashboardTypes.map(type => (
                      <Option key={type} value={type}>{type}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="category"
                  label="Category"
                >
                  <Select placeholder="Select category">
                    {categories.map(cat => (
                      <Option key={cat} value={cat}>{cat}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Description"
            >
              <TextArea
                rows={3}
                placeholder="Describe what this dashboard monitors"
              />
            </Form.Item>

            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="access_level"
                  label="Access Level"
                >
                  <Select placeholder="Select access level">
                    {accessLevels.map(level => (
                      <Option key={level} value={level}>{level}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="is_active"
                  label="Active"
                  valuePropName="checked"
                >
                  <Switch />
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="sort_order"
              label="Sort Order"
            >
              <Input type="number" placeholder="0" />
            </Form.Item>
          </Form>
        </Modal>
      </Card>
    </div>
  )
}

export default MonitoringDashboards
