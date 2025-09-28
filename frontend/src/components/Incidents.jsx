import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Modal,
  Form,
  Input,
  Select,
  Table,
  Typography,
  Space,
  Tag,
  message,
  Popconfirm,
  Empty,
  Spin,
  Row,
  Col,
  DatePicker,
  Tooltip
} from 'antd'
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import IncidentDetail from './IncidentDetail'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input
const { RangePicker } = DatePicker

const Incidents = ({ navigateToRoute, showIncidentDetail, selectedIncidentId }) => {
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(false)
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingIncident, setEditingIncident] = useState(null)
  const [form] = Form.useForm()
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [dateRange, setDateRange] = useState(null)

  // Show incident detail view if selectedIncidentId is provided
  if (showIncidentDetail && selectedIncidentId) {
    return (
      <IncidentDetail
        incidentId={selectedIncidentId}
        navigateToRoute={navigateToRoute}
        onIncidentUpdate={(updatedIncident) => {
          // Update the incident in the list
          setIncidents(prev => prev.map(incident =>
            incident.id === updatedIncident.id ? updatedIncident : incident
          ))
        }}
      />
    )
  }

  // Mock data for demonstration
  const mockIncidents = [
    {
      id: 'INC-001',
      title: 'SQL Injection Vulnerability in Login API',
      description: 'Critical security vulnerability discovered in the authentication endpoint allowing potential data breach.',
      severity: 'Critical',
      status: 'Open',
      category: 'Security',
      assignedTo: 'John Smith',
      createdDate: '2024-01-15',
      updatedDate: '2024-01-15'
    },
    {
      id: 'INC-002',
      title: 'Unauthorized Access to Admin Panel',
      description: 'Multiple failed login attempts detected from suspicious IP addresses.',
      severity: 'High',
      status: 'In Progress',
      category: 'Security',
      assignedTo: 'Sarah Johnson',
      createdDate: '2024-01-14',
      updatedDate: '2024-01-15'
    },
    {
      id: 'INC-003',
      title: 'Data Encryption Key Rotation Failure',
      description: 'Automated key rotation process failed, requiring manual intervention.',
      severity: 'Medium',
      status: 'Open',
      category: 'Infrastructure',
      assignedTo: 'Mike Davis',
      createdDate: '2024-01-13',
      updatedDate: '2024-01-14'
    },
    {
      id: 'INC-004',
      title: 'Compliance Audit Finding - Missing Logs',
      description: 'Security audit identified missing audit logs for user access events.',
      severity: 'Medium',
      status: 'Closed',
      category: 'Compliance',
      assignedTo: 'Lisa Chen',
      createdDate: '2024-01-10',
      updatedDate: '2024-01-12'
    },
    {
      id: 'INC-005',
      title: 'Suspicious Network Traffic Detected',
      description: 'Anomalous network patterns detected in production environment.',
      severity: 'Low',
      status: 'In Progress',
      category: 'Monitoring',
      assignedTo: 'Tom Wilson',
      createdDate: '2024-01-12',
      updatedDate: '2024-01-13'
    }
  ]

  useEffect(() => {
    loadIncidents()
  }, [])

  const loadIncidents = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setIncidents(mockIncidents)
    } catch (error) {
      message.error('Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  const handleAddIncident = () => {
    setEditingIncident(null)
    form.resetFields()
    setIsModalVisible(true)
  }

  const handleEditIncident = (incident) => {
    if (navigateToRoute) {
      navigateToRoute('incident-detail', null, incident.id)
    }
  }

  const handleViewDetails = (incident) => {
    if (navigateToRoute) {
      navigateToRoute('incident-detail', null, incident.id)
    }
  }

  const handleMarkAsClosed = async (incidentId) => {
    try {
      setIncidents(prev => prev.map(incident => 
        incident.id === incidentId 
          ? { ...incident, status: 'Closed', updatedDate: new Date().toISOString().split('T')[0] }
          : incident
      ))
      message.success('Incident marked as closed')
    } catch (error) {
      message.error('Failed to update incident status')
    }
  }

  const handleSubmit = async (values) => {
    try {
      if (editingIncident) {
        // Update existing incident
        setIncidents(prev => prev.map(incident => 
          incident.id === editingIncident.id 
            ? { ...incident, ...values, updatedDate: new Date().toISOString().split('T')[0] }
            : incident
        ))
        message.success('Incident updated successfully')
      } else {
        // Add new incident
        const newIncident = {
          id: `INC-${String(incidents.length + 1).padStart(3, '0')}`,
          ...values,
          status: 'Open',
          createdDate: new Date().toISOString().split('T')[0],
          updatedDate: new Date().toISOString().split('T')[0]
        }
        setIncidents(prev => [newIncident, ...prev])
        message.success('Incident created successfully')
      }
      setIsModalVisible(false)
      form.resetFields()
    } catch (error) {
      message.error('Failed to save incident')
    }
  }

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'red'
      case 'High': return 'orange'
      case 'Medium': return 'yellow'
      case 'Low': return 'green'
      default: return 'default'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'red'
      case 'In Progress': return 'blue'
      case 'Closed': return 'green'
      default: return 'default'
    }
  }

  // Filter incidents based on search and filters
  const filteredIncidents = incidents.filter(incident => {
    const matchesSearch = incident.title.toLowerCase().includes(searchText.toLowerCase()) ||
                         incident.description.toLowerCase().includes(searchText.toLowerCase()) ||
                         incident.id.toLowerCase().includes(searchText.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || incident.status === statusFilter
    const matchesSeverity = severityFilter === 'all' || incident.severity === severityFilter
    
    let matchesDate = true
    if (dateRange && dateRange.length === 2) {
      const incidentDate = new Date(incident.createdDate)
      matchesDate = incidentDate >= dateRange[0].toDate() && incidentDate <= dateRange[1].toDate()
    }
    
    return matchesSearch && matchesStatus && matchesSeverity && matchesDate
  })

  const columns = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 100,
      sorter: (a, b) => a.id.localeCompare(b.id)
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      sorter: (a, b) => a.title.localeCompare(b.title)
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => (
        <Tag color={getSeverityColor(severity)}>{severity}</Tag>
      ),
      sorter: (a, b) => {
        const severityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
        return severityOrder[a.severity] - severityOrder[b.severity]
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      ),
      filters: [
        { text: 'Open', value: 'Open' },
        { text: 'In Progress', value: 'In Progress' },
        { text: 'Closed', value: 'Closed' }
      ],
      onFilter: (value, record) => record.status === value
    },
    {
      title: 'Created Date',
      dataIndex: 'createdDate',
      key: 'createdDate',
      width: 120,
      sorter: (a, b) => new Date(a.createdDate) - new Date(b.createdDate)
    },
    {
      title: 'Assigned To',
      dataIndex: 'assignedTo',
      key: 'assignedTo',
      width: 140,
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewDetails(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditIncident(record)}
            />
          </Tooltip>
          {record.status !== 'Closed' && (
            <Tooltip title="Mark as Closed">
              <Popconfirm
                title="Mark this incident as closed?"
                onConfirm={() => handleMarkAsClosed(record.id)}
                okText="Yes"
                cancelText="No"
              >
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  style={{ color: '#52c41a' }}
                />
              </Popconfirm>
            </Tooltip>
          )}
        </Space>
      )
    }
  ]

  return (
    <div>
      <Card>
        <div style={{ marginBottom: 16 }}>
          <Row justify="space-between" align="middle">
            <Col>
              <Title level={3} style={{ margin: 0 }}>
                <ExclamationCircleOutlined style={{ marginRight: 8, color: '#ff4d4f' }} />
                Security Incidents
              </Title>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleAddIncident}
                >
                  Add Incident
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={loadIncidents}
                  loading={loading}
                >
                  Refresh
                </Button>
              </Space>
            </Col>
          </Row>
        </div>

        {/* Filters */}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={8} md={6}>
            <Input
              placeholder="Search incidents..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Select
              placeholder="Status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Status</Option>
              <Option value="Open">Open</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Closed">Closed</Option>
            </Select>
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Select
              placeholder="Severity"
              value={severityFilter}
              onChange={setSeverityFilter}
              style={{ width: '100%' }}
            >
              <Option value="all">All Severity</Option>
              <Option value="Critical">Critical</Option>
              <Option value="High">High</Option>
              <Option value="Medium">Medium</Option>
              <Option value="Low">Low</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              placeholder={['Start Date', 'End Date']}
              value={dateRange}
              onChange={setDateRange}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredIncidents}
          rowKey="id"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} incidents`
          }}
          locale={{
            emptyText: (
              <Empty
                description="No incidents found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              />
            )
          }}
        />
      </Card>

      {/* Add/Edit Incident Modal */}
      <Modal
        title={editingIncident ? 'Edit Incident' : 'Add New Incident'}
        open={isModalVisible}
        onCancel={() => setIsModalVisible(false)}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter incident title' }]}
          >
            <Input placeholder="Enter incident title" />
          </Form.Item>

          <Form.Item
            name="description"
            label="Description"
            rules={[{ required: true, message: 'Please enter incident description' }]}
          >
            <TextArea
              rows={4}
              placeholder="Describe the incident in detail"
            />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="severity"
                label="Severity"
                rules={[{ required: true, message: 'Please select severity' }]}
              >
                <Select placeholder="Select severity">
                  <Option value="Critical">Critical</Option>
                  <Option value="High">High</Option>
                  <Option value="Medium">Medium</Option>
                  <Option value="Low">Low</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="category"
                label="Category"
                rules={[{ required: true, message: 'Please select category' }]}
              >
                <Select placeholder="Select category">
                  <Option value="Security">Security</Option>
                  <Option value="Infrastructure">Infrastructure</Option>
                  <Option value="Compliance">Compliance</Option>
                  <Option value="Monitoring">Monitoring</Option>
                  <Option value="Other">Other</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="assignedTo"
            label="Assigned To"
            rules={[{ required: true, message: 'Please enter assigned user' }]}
          >
            <Input placeholder="Enter assigned user name" />
          </Form.Item>

          <Form.Item style={{ marginBottom: 0, textAlign: 'right' }}>
            <Space>
              <Button onClick={() => setIsModalVisible(false)}>
                Cancel
              </Button>
              <Button type="primary" htmlType="submit">
                {editingIncident ? 'Update' : 'Create'} Incident
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default Incidents
