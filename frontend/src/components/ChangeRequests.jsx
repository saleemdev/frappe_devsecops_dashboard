import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Input,
  Select,
  Space,
  Card,
  Modal,
  Form,
  DatePicker,
  Tag,
  Typography,
  Row,
  Col,
  Drawer,
  message,
  Popconfirm,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { TextArea } = Input
const { Option } = Select

const ChangeRequests = () => {
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isViewDrawerVisible, setIsViewDrawerVisible] = useState(false)
  const [editingRecord, setEditingRecord] = useState(null)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [form] = Form.useForm()

  // Mock data for demonstration
  const mockData = [
    {
      id: 'CR-001',
      title: 'Update Authentication System',
      description: 'Implement OAuth 2.0 authentication to replace current basic auth',
      project: 'ePrescription',
      requestedBy: 'John Doe',
      status: 'pending',
      priority: 'high',
      requestDate: '2025-01-15',
      targetDate: '2025-02-15',
      category: 'security',
      impact: 'high'
    },
    {
      id: 'CR-002',
      title: 'Database Performance Optimization',
      description: 'Optimize database queries and add proper indexing',
      project: 'Patient Management',
      requestedBy: 'Jane Smith',
      status: 'approved',
      priority: 'medium',
      requestDate: '2025-01-10',
      targetDate: '2025-01-30',
      category: 'performance',
      impact: 'medium'
    },
    {
      id: 'CR-003',
      title: 'Mobile App UI Enhancement',
      description: 'Improve mobile app user interface for better accessibility',
      project: 'Mobile Health App',
      requestedBy: 'Mike Johnson',
      status: 'in-progress',
      priority: 'low',
      requestDate: '2025-01-05',
      targetDate: '2025-02-28',
      category: 'ui/ux',
      impact: 'low'
    }
  ]

  useEffect(() => {
    loadChangeRequests()
  }, [])

  const loadChangeRequests = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setChangeRequests(mockData)
    } catch (error) {
      message.error('Failed to load change requests')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    setEditingRecord(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEdit = (record) => {
    setEditingRecord(record)
    form.setFieldsValue({
      ...record,
      requestDate: record.requestDate ? new Date(record.requestDate) : null,
      targetDate: record.targetDate ? new Date(record.targetDate) : null
    })
    setIsModalVisible(true)
  }

  const handleView = (record) => {
    setViewingRecord(record)
    setIsViewDrawerVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      setChangeRequests(prev => prev.filter(item => item.id !== id))
      message.success('Change request deleted successfully')
    } catch (error) {
      message.error('Failed to delete change request')
    }
  }

  const handleSubmit = async (values) => {
    try {
      setLoading(true)
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      if (editingRecord) {
        // Update existing record
        setChangeRequests(prev => 
          prev.map(item => 
            item.id === editingRecord.id 
              ? { ...item, ...values }
              : item
          )
        )
        message.success('Change request updated successfully')
      } else {
        // Create new record
        const newRecord = {
          id: `CR-${String(changeRequests.length + 1).padStart(3, '0')}`,
          ...values,
          requestDate: new Date().toISOString().split('T')[0]
        }
        setChangeRequests(prev => [newRecord, ...prev])
        message.success('Change request created successfully')
      }
      
      setIsModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Failed to save change request')
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    const colors = {
      pending: 'orange',
      approved: 'green',
      'in-progress': 'blue',
      completed: 'purple',
      rejected: 'red'
    }
    return colors[status] || 'default'
  }

  const getPriorityColor = (priority) => {
    const colors = {
      high: 'red',
      medium: 'orange',
      low: 'green'
    }
    return colors[priority] || 'default'
  }

  const filteredData = changeRequests.filter(item => {
    const matchesSearch = item.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.project.toLowerCase().includes(searchText.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    const matchesPriority = priorityFilter === 'all' || item.priority === priorityFilter
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      fixed: 'left'
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 250,
      ellipsis: true
    },
    {
      title: 'Project',
      dataIndex: 'project',
      key: 'project',
      width: 150
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>
          {status.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      width: 100,
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>
          {priority.toUpperCase()}
        </Tag>
      )
    },
    {
      title: 'Requested By',
      dataIndex: 'requestedBy',
      key: 'requestedBy',
      width: 150
    },
    {
      title: 'Request Date',
      dataIndex: 'requestDate',
      key: 'requestDate',
      width: 120
    },
    {
      title: 'Target Date',
      dataIndex: 'targetDate',
      key: 'targetDate',
      width: 120
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 150,
      fixed: 'right',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Are you sure you want to delete this change request?"
            onConfirm={() => handleDelete(record.id)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <Card>
        <div style={{ marginBottom: '24px' }}>
          <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                Change Requests
              </Title>
              <Text type="secondary">
                Manage and track project change requests
              </Text>
            </Col>
            <Col>
              <Space>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadChangeRequests}
                  loading={loading}
                >
                  Refresh
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreate}
                >
                  New Change Request
                </Button>
              </Space>
            </Col>
          </Row>

          {/* Filters */}
          <Row gutter={16} style={{ marginBottom: '16px' }}>
            <Col xs={24} sm={12} md={8} lg={6}>
              <Input
                placeholder="Search change requests..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <Select
                placeholder="Status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
              >
                <Option value="all">All Status</Option>
                <Option value="pending">Pending</Option>
                <Option value="approved">Approved</Option>
                <Option value="in-progress">In Progress</Option>
                <Option value="completed">Completed</Option>
                <Option value="rejected">Rejected</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3}>
              <Select
                placeholder="Priority"
                value={priorityFilter}
                onChange={setPriorityFilter}
                style={{ width: '100%' }}
              >
                <Option value="all">All Priority</Option>
                <Option value="high">High</Option>
                <Option value="medium">Medium</Option>
                <Option value="low">Low</Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="id"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => 
              `${range[0]}-${range[1]} of ${total} items`
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingRecord ? 'Edit Change Request' : 'Create Change Request'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={800}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="title"
                label="Title"
                rules={[{ required: true, message: 'Please enter title' }]}
              >
                <Input placeholder="Enter change request title" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="project"
                label="Project"
                rules={[{ required: true, message: 'Please select project' }]}
              >
                <Select placeholder="Select project">
                  <Option value="ePrescription">ePrescription</Option>
                  <Option value="Patient Management">Patient Management</Option>
                  <Option value="Mobile Health App">Mobile Health App</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter description' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the change request in detail"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name="priority"
                label="Priority"
                rules={[{ required: true, message: 'Please select priority' }]}
              >
                <Select placeholder="Select priority">
                  <Option value="high">High</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="low">Low</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  <Option value="security">Security</Option>
                  <Option value="performance">Performance</Option>
                  <Option value="ui/ux">UI/UX</Option>
                  <Option value="feature">Feature</Option>
                  <Option value="bug-fix">Bug Fix</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name="impact"
                label="Impact"
                rules={[{ required: true, message: 'Please select impact' }]}
              >
                <Select placeholder="Select impact">
                  <Option value="high">High</Option>
                  <Option value="medium">Medium</Option>
                  <Option value="low">Low</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="requestedBy"
                label="Requested By"
                rules={[{ required: true, message: 'Please enter requester name' }]}
              >
                <Input placeholder="Enter requester name" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="targetDate"
                label="Target Date"
                rules={[{ required: true, message: 'Please select target date' }]}
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                {editingRecord ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* View Details Drawer */}
      <Drawer
        title="Change Request Details"
        placement="right"
        onClose={() => setIsViewDrawerVisible(false)}
        open={isViewDrawerVisible}
        width={600}
      >
        {viewingRecord && (
          <div>
            <Title level={4}>{viewingRecord.title}</Title>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong>ID: </Text>
                <Text>{viewingRecord.id}</Text>
              </div>
              <div>
                <Text strong>Project: </Text>
                <Text>{viewingRecord.project}</Text>
              </div>
              <div>
                <Text strong>Status: </Text>
                <Tag color={getStatusColor(viewingRecord.status)}>
                  {viewingRecord.status.toUpperCase()}
                </Tag>
              </div>
              <div>
                <Text strong>Priority: </Text>
                <Tag color={getPriorityColor(viewingRecord.priority)}>
                  {viewingRecord.priority.toUpperCase()}
                </Tag>
              </div>
              <div>
                <Text strong>Description: </Text>
                <div style={{ marginTop: '8px' }}>
                  <Text>{viewingRecord.description}</Text>
                </div>
              </div>
              <div>
                <Text strong>Requested By: </Text>
                <Text>{viewingRecord.requestedBy}</Text>
              </div>
              <div>
                <Text strong>Request Date: </Text>
                <Text>{viewingRecord.requestDate}</Text>
              </div>
              <div>
                <Text strong>Target Date: </Text>
                <Text>{viewingRecord.targetDate}</Text>
              </div>
              <div>
                <Text strong>Category: </Text>
                <Text>{viewingRecord.category}</Text>
              </div>
              <div>
                <Text strong>Impact: </Text>
                <Text>{viewingRecord.impact}</Text>
              </div>
            </Space>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default ChangeRequests
