import React, { useState, useEffect } from 'react'
import {
  Card,
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Switch,
  Space,
  Typography,
  message,
  Popconfirm,
  Tag,
  Tooltip,
  Row,
  Col,
  Alert,
  Spin
} from 'antd'
import { useResponsive } from '../hooks/useResponsive'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  BarChartOutlined,
  LinkOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select
const { Search } = Input

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
  const { isMobile, isTablet, isSmallScreen } = useResponsive()

  // Mock data for demonstration
  const mockDashboards = [
    {
      id: 'dash-001',
      name: 'Infrastructure Monitoring',
      description: 'Real-time monitoring of server resources, network performance, and system health',
      url: 'https://grafana.example.com/d/infrastructure',
      category: 'Infrastructure',
      status: true,
      lastUpdated: '2024-01-15 14:30:00',
      createdBy: 'Admin User'
    },
    {
      id: 'dash-002',
      name: 'Application Performance',
      description: 'Application response times, error rates, and user experience metrics',
      url: 'https://newrelic.example.com/dashboard/app-performance',
      category: 'Application',
      status: true,
      lastUpdated: '2024-01-14 09:15:00',
      createdBy: 'DevOps Team'
    },
    {
      id: 'dash-003',
      name: 'Security Monitoring',
      description: 'Security events, threat detection, and compliance monitoring',
      url: 'https://splunk.example.com/security-dashboard',
      category: 'Security',
      status: false,
      lastUpdated: '2024-01-10 16:45:00',
      createdBy: 'Security Team'
    },
    {
      id: 'dash-004',
      name: 'Database Performance',
      description: 'Database query performance, connection pools, and storage metrics',
      url: 'https://datadog.example.com/dashboard/database',
      category: 'Performance',
      status: true,
      lastUpdated: '2024-01-12 11:20:00',
      createdBy: 'DBA Team'
    }
  ]

  // Dashboard categories
  const categories = [
    { value: 'Infrastructure', label: 'Infrastructure' },
    { value: 'Application', label: 'Application' },
    { value: 'Security', label: 'Security' },
    { value: 'Performance', label: 'Performance' },
    { value: 'Business', label: 'Business' },
    { value: 'Custom', label: 'Custom' }
  ]

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
        dashboard.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        dashboard.category.toLowerCase().includes(searchQuery.toLowerCase())
      )
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      filtered = filtered.filter(dashboard => dashboard.category === categoryFilter)
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      const isActive = statusFilter === 'active'
      filtered = filtered.filter(dashboard => dashboard.status === isActive)
    }

    setFilteredDashboards(filtered)
  }, [dashboards, searchQuery, categoryFilter, statusFilter])

  const loadDashboards = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setDashboards(mockDashboards)
    } catch (error) {
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

  const handleEditDashboard = (dashboard) => {
    setEditingDashboard(dashboard)
    form.setFieldsValue({
      name: dashboard.name,
      description: dashboard.description,
      url: dashboard.url,
      category: dashboard.category,
      status: dashboard.status
    })
    setModalVisible(true)
  }

  const handleDeleteDashboard = async (dashboardId) => {
    try {
      setDashboards(prev => prev.filter(d => d.id !== dashboardId))
      message.success('Dashboard deleted successfully')
    } catch (error) {
      message.error('Failed to delete dashboard')
    }
  }

  const handleViewDashboard = (dashboard) => {
    window.open(dashboard.url, '_blank', 'noopener,noreferrer')
  }

  const handleModalSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (editingDashboard) {
        // Update existing dashboard
        setDashboards(prev => prev.map(d => 
          d.id === editingDashboard.id 
            ? { ...d, ...values, lastUpdated: new Date().toLocaleString() }
            : d
        ))
        message.success('Dashboard updated successfully')
      } else {
        // Add new dashboard
        const newDashboard = {
          id: `dash-${Date.now()}`,
          ...values,
          lastUpdated: new Date().toLocaleString(),
          createdBy: 'Current User'
        }
        setDashboards(prev => [...prev, newDashboard])
        message.success('Dashboard added successfully')
      }
      
      setModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Please fill in all required fields')
    }
  }

  const columns = [
    {
      title: 'Dashboard Name',
      dataIndex: 'name',
      key: 'name',
      sorter: (a, b) => a.name.localeCompare(b.name),
      render: (text, record) => (
        <Space direction="vertical" size={0}>
          <Text strong style={{ fontSize: '14px' }}>{text}</Text>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description.length > 60 
              ? `${record.description.substring(0, 60)}...` 
              : record.description
            }
          </Text>
        </Space>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      sorter: (a, b) => a.category.localeCompare(b.category),
      render: (category) => {
        const colors = {
          Infrastructure: 'blue',
          Application: 'green',
          Security: 'red',
          Performance: 'orange',
          Business: 'purple',
          Custom: 'gray'
        }
        return <Tag color={colors[category] || 'default'}>{category}</Tag>
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      sorter: (a, b) => a.status - b.status,
      render: (status) => (
        <Tag 
          icon={status ? <CheckCircleOutlined /> : <CloseCircleOutlined />}
          color={status ? 'success' : 'error'}
        >
          {status ? 'Active' : 'Inactive'}
        </Tag>
      )
    },
    {
      title: 'Last Updated',
      dataIndex: 'lastUpdated',
      key: 'lastUpdated',
      width: 150,
      sorter: (a, b) => new Date(a.lastUpdated) - new Date(b.lastUpdated),
      render: (date) => (
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {new Date(date).toLocaleDateString()}
        </Text>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Dashboard">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
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
            description="Are you sure you want to delete this dashboard?"
            onConfirm={() => handleDeleteDashboard(record.id)}
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
            <Search
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
                <Option key={cat.value} value={cat.value}>{cat.label}</Option>
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
            initialValues={{ status: true }}
          >
            <Form.Item
              name="name"
              label="Dashboard Name"
              rules={[{ required: true, message: 'Please enter dashboard name' }]}
            >
              <Input placeholder="Enter dashboard name" />
            </Form.Item>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter description' }]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Describe what this dashboard monitors"
              />
            </Form.Item>

            <Form.Item
              name="url"
              label="Dashboard URL"
              rules={[
                { required: true, message: 'Please enter dashboard URL' },
                { type: 'url', message: 'Please enter a valid URL' }
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
                  name="category"
                  label="Category"
                  rules={[{ required: true, message: 'Please select category' }]}
                >
                  <Select placeholder="Select category">
                    {categories.map(cat => (
                      <Option key={cat.value} value={cat.value}>{cat.label}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="status"
                  label="Status"
                  valuePropName="checked"
                >
                  <Switch
                    checkedChildren="Active"
                    unCheckedChildren="Inactive"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Modal>
      </Card>
    </div>
  )
}

export default MonitoringDashboards
