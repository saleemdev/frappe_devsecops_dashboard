import React, { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Descriptions,
  Timeline,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Spin,
  Empty
} from 'antd'
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  SaveOutlined,
  CloseOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select

const IncidentDetail = ({ incidentId, navigateToRoute, onIncidentUpdate }) => {
  const [incidentData, setIncidentData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [form] = Form.useForm()

  // Mock data for demonstration
  const mockIncidentData = {
    'INC-001': {
      id: 'INC-001',
      title: 'Database Connection Timeout',
      description: 'Multiple users reporting slow response times and connection timeouts when accessing the patient database.',
      severity: 'High',
      status: 'In Progress',
      priority: 'High',
      assignedTo: 'John Smith',
      reportedBy: 'Sarah Johnson',
      reportedDate: '2024-01-20',
      updatedDate: '2024-01-21',
      category: 'Infrastructure',
      affectedSystems: ['Patient Database', 'ePrescription API'],
      timeline: [
        {
          date: '2024-01-20 09:15',
          action: 'Incident reported',
          user: 'Sarah Johnson',
          description: 'Initial report of database connection issues'
        },
        {
          date: '2024-01-20 09:30',
          action: 'Incident assigned',
          user: 'System',
          description: 'Assigned to John Smith for investigation'
        },
        {
          date: '2024-01-20 10:45',
          action: 'Investigation started',
          user: 'John Smith',
          description: 'Began analysis of database connection logs'
        },
        {
          date: '2024-01-21 08:30',
          action: 'Root cause identified',
          user: 'John Smith',
          description: 'Found connection pool exhaustion due to increased load'
        }
      ]
    },
    'INC-002': {
      id: 'INC-002',
      title: 'Authentication Service Outage',
      description: 'Complete outage of the authentication service affecting all user logins.',
      severity: 'Critical',
      status: 'Closed',
      priority: 'Critical',
      assignedTo: 'Mike Chen',
      reportedBy: 'Alex Rodriguez',
      reportedDate: '2024-01-19',
      updatedDate: '2024-01-19',
      category: 'Security',
      affectedSystems: ['Authentication Service', 'Patient Portal', 'Mobile App'],
      timeline: [
        {
          date: '2024-01-19 14:20',
          action: 'Incident reported',
          user: 'Alex Rodriguez',
          description: 'Authentication service completely down'
        },
        {
          date: '2024-01-19 14:25',
          action: 'Incident escalated',
          user: 'System',
          description: 'Auto-escalated due to critical severity'
        },
        {
          date: '2024-01-19 15:45',
          action: 'Service restored',
          user: 'Mike Chen',
          description: 'Restarted authentication service cluster'
        },
        {
          date: '2024-01-19 16:00',
          action: 'Incident closed',
          user: 'Mike Chen',
          description: 'Service fully operational, monitoring continues'
        }
      ]
    }
  }

  useEffect(() => {
    const loadIncidentData = async () => {
      setLoading(true)
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000))
        const data = mockIncidentData[incidentId]
        if (data) {
          setIncidentData(data)
          form.setFieldsValue({
            ...data,
            reportedDate: data.reportedDate ? dayjs(data.reportedDate) : null
          })
        } else {
          setIncidentData(null)
        }
      } catch (error) {
        console.error('Failed to load incident data:', error)
        setIncidentData(null)
      } finally {
        setLoading(false)
      }
    }

    loadIncidentData()
  }, [incidentId, form])

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
      case 'Resolved': return 'green'
      case 'Closed': return 'default'
      default: return 'default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Open': return <ExclamationCircleOutlined />
      case 'In Progress': return <ClockCircleOutlined />
      case 'Resolved':
      case 'Closed': return <CheckCircleOutlined />
      default: return <ExclamationCircleOutlined />
    }
  }

  const handleSave = async (values) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500))
      
      const updatedIncident = {
        ...incidentData,
        ...values,
        reportedDate: values.reportedDate ? values.reportedDate.format('YYYY-MM-DD') : incidentData.reportedDate,
        updatedDate: new Date().toISOString().split('T')[0]
      }
      
      setIncidentData(updatedIncident)
      setEditing(false)
      message.success('Incident updated successfully')
      
      // Notify parent component of the update
      if (onIncidentUpdate) {
        onIncidentUpdate(updatedIncident)
      }
    } catch (error) {
      message.error('Failed to update incident')
    }
  }

  const handleCancel = () => {
    form.setFieldsValue({
      ...incidentData,
      reportedDate: incidentData.reportedDate ? dayjs(incidentData.reportedDate) : null
    })
    setEditing(false)
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading incident details...</div>
      </div>
    )
  }

  if (!incidentData) {
    return (
      <Card>
        <Empty
          description="Incident not found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigateToRoute('incidents')}>
            Back to Incidents
          </Button>
        </Empty>
      </Card>
    )
  }

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('incidents')}
              >
                Back to Incidents
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                {incidentData.title}
              </Title>
              <Tag color={getSeverityColor(incidentData.severity)}>{incidentData.severity}</Tag>
              <Tag color={getStatusColor(incidentData.status)} icon={getStatusIcon(incidentData.status)}>
                {incidentData.status}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              {editing ? (
                <>
                  <Button icon={<SaveOutlined />} type="primary" onClick={() => form.submit()}>
                    Save Changes
                  </Button>
                  <Button icon={<CloseOutlined />} onClick={handleCancel}>
                    Cancel
                  </Button>
                </>
              ) : (
                <Button icon={<EditOutlined />} type="primary" onClick={() => setEditing(true)}>
                  Edit Incident
                </Button>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {editing ? (
        /* Edit Form */
        <Card title="Edit Incident Details">
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSave}
          >
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item
                  name="title"
                  label="Title"
                  rules={[{ required: true, message: 'Please enter incident title' }]}
                >
                  <Input placeholder="Enter incident title" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="severity"
                  label="Severity"
                  rules={[{ required: true, message: 'Please select severity' }]}
                >
                  <Select placeholder="Select severity">
                    <Option value="Low">Low</Option>
                    <Option value="Medium">Medium</Option>
                    <Option value="High">High</Option>
                    <Option value="Critical">Critical</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>

            <Form.Item
              name="description"
              label="Description"
              rules={[{ required: true, message: 'Please enter incident description' }]}
            >
              <TextArea rows={4} placeholder="Describe the incident in detail" />
            </Form.Item>

            <Row gutter={16}>
              <Col span={8}>
                <Form.Item
                  name="status"
                  label="Status"
                  rules={[{ required: true, message: 'Please select status' }]}
                >
                  <Select placeholder="Select status">
                    <Option value="Open">Open</Option>
                    <Option value="In Progress">In Progress</Option>
                    <Option value="Resolved">Resolved</Option>
                    <Option value="Closed">Closed</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="priority"
                  label="Priority"
                  rules={[{ required: true, message: 'Please select priority' }]}
                >
                  <Select placeholder="Select priority">
                    <Option value="Low">Low</Option>
                    <Option value="Medium">Medium</Option>
                    <Option value="High">High</Option>
                    <Option value="Critical">Critical</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item
                  name="assignedTo"
                  label="Assigned To"
                  rules={[{ required: true, message: 'Please enter assigned user' }]}
                >
                  <Input placeholder="Enter assigned user name" />
                </Form.Item>
              </Col>
            </Row>
          </Form>
        </Card>
      ) : (
        /* View Mode */
        <>
          {/* Incident Details */}
          <Card title="Incident Details" style={{ marginBottom: 16 }}>
            <Descriptions bordered column={2}>
              <Descriptions.Item label="Incident ID">{incidentData.id}</Descriptions.Item>
              <Descriptions.Item label="Category">{incidentData.category}</Descriptions.Item>
              <Descriptions.Item label="Priority">{incidentData.priority}</Descriptions.Item>
              <Descriptions.Item label="Assigned To">{incidentData.assignedTo}</Descriptions.Item>
              <Descriptions.Item label="Reported By">{incidentData.reportedBy}</Descriptions.Item>
              <Descriptions.Item label="Reported Date">{incidentData.reportedDate}</Descriptions.Item>
              <Descriptions.Item label="Last Updated">{incidentData.updatedDate}</Descriptions.Item>
              <Descriptions.Item label="Affected Systems">
                {incidentData.affectedSystems?.join(', ')}
              </Descriptions.Item>
              <Descriptions.Item label="Description" span={2}>
                <Paragraph>{incidentData.description}</Paragraph>
              </Descriptions.Item>
            </Descriptions>
          </Card>

          {/* Timeline */}
          <Card title="Incident Timeline">
            <Timeline
              items={incidentData.timeline?.map(item => ({
                children: (
                  <div>
                    <Text strong>{item.action}</Text>
                    <br />
                    <Text type="secondary">{item.date} - {item.user}</Text>
                    <br />
                    <Text>{item.description}</Text>
                  </div>
                )
              }))}
            />
          </Card>
        </>
      )}
    </div>
  )
}

export default IncidentDetail
