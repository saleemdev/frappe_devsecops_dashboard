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
  Divider,
  Badge,
  Avatar,
  Tooltip,
  theme
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  SearchOutlined,
  FilterOutlined,
  ArrowLeftOutlined,
  TeamOutlined,
  RiseOutlined
} from '@ant-design/icons'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const RACITemplate = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(false)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [pagination, setPagination] = useState({
    current: 1,
    pageSize: 20,
    total: 0
  })

  useEffect(() => {
    loadTemplates()
  }, [pagination.current, pagination.pageSize])

  const loadTemplates = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        limit_start: (pagination.current - 1) * pagination.pageSize,
        limit_page_length: pagination.pageSize
      })

      if (searchText) {
        const filters = JSON.stringify([['RACI Template', 'template_name', 'like', `%${searchText}%`]])
        params.append('filters', filters)
      }

      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.raci_template.get_raci_templates?${params}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const result = data.message || data

      if (result.success) {
        setTemplates(result.data || [])
        setPagination({ ...pagination, total: result.total || 0 })
      } else {
        message.error('Failed to load RACI Templates')
      }
    } catch (error) {
      console.error('Error loading templates:', error)
      message.error('Failed to load RACI Templates')
    } finally {
      setLoading(false)
    }
  }

  const loadTemplateDetail = async (name) => {
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.raci_template.get_raci_template_detail?name=${encodeURIComponent(name)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const result = data.message || data

      if (result.success) {
        setViewingRecord(result.data)
        setDrawerOpen(true)
      } else {
        message.error('Failed to load template details')
      }
    } catch (error) {
      console.error('Error loading detail:', error)
      message.error('Failed to load template details')
    }
  }

  const handleDelete = async (name) => {
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.raci_template.delete_raci_template?name=${encodeURIComponent(name)}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      message.success('RACI Template deleted successfully')
      loadTemplates()
    } catch (error) {
      console.error('Error deleting:', error)
      message.error('Failed to delete RACI Template')
    }
  }

  const getRACIBadge = (role, value) => {
    if (!value) return null

    const roleColors = {
      'Responsible': '#1890ff',
      'Accountable': '#722ed1',
      'Consulted': '#13c2c2',
      'Informed': '#faad14'
    }

    return (
      <Tooltip title={role}>
        <span
          style={{
            display: 'inline-block',
            width: '24px',
            height: '24px',
            background: roleColors[role],
            color: '#fff',
            borderRadius: '50%',
            textAlign: 'center',
            lineHeight: '24px',
            fontSize: '12px',
            fontWeight: 'bold',
            marginRight: '4px'
          }}
        >
          {role.charAt(0)}
        </span>
      </Tooltip>
    )
  }

  const columns = [
    {
      title: 'Template Name',
      dataIndex: 'template_name',
      key: 'template_name',
      width: '35%',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Project Template',
      dataIndex: 'project_template',
      key: 'project_template',
      width: '30%',
      render: (text) => <Text type="secondary">{text || '-'}</Text>
    },
    {
      title: 'Tasks',
      dataIndex: 'name',
      key: 'tasks_count',
      width: '15%',
      render: (_, record) => {
        const count = record.raci_assignments ? record.raci_assignments.length : 0
        return <Badge count={count} showZero color="#1890ff" />
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '20%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View">
            <Button
              type="text"
              size="small"
              icon={<EyeOutlined />}
              onClick={() => loadTemplateDetail(record.name)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => navigateToRoute('raci-template-edit', { id: record.name })}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <Popconfirm
              title="Delete RACI Template"
              description="Are you sure you want to delete this template?"
              onConfirm={() => handleDelete(record.name)}
              okText="Yes"
              cancelText="No"
            >
              <Button type="text" danger size="small" icon={<DeleteOutlined />} />
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
                onClick={() => navigateToRoute('software-product')}
                style={{ paddingLeft: 0 }}
              >
                Back to Products
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <RiseOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                RACI Templates
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={() => navigateToRoute('raci-template-create')}
              style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                border: 'none',
                height: '40px'
              }}
            >
              New RACI Template
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Search and Filter */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={16}>
            <Input
              placeholder="Search RACI Templates..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => {
                setSearchText(e.target.value)
                setPagination({ ...pagination, current: 1 })
              }}
              onPressEnter={loadTemplates}
              style={{ borderRadius: '6px' }}
            />
          </Col>
          <Col xs={24} sm={8}>
            <Button
              icon={<FilterOutlined />}
              block
              onClick={loadTemplates}
            >
              Apply Filters
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={templates}
          loading={loading}
          rowKey="name"
          pagination={{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} templates`,
            onChange: (page, pageSize) => {
              setPagination({ ...pagination, current: page, pageSize })
            }
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: <Empty description="No RACI Templates found" />
          }}
        />
      </Card>

      {/* Detail Drawer */}
      <Drawer
        title="RACI Template Details"
        placement="right"
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
        width={600}
        bodyStyle={{ paddingBottom: '80px' }}
      >
        {viewingRecord && (
          <div>
            {/* Template Info */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5}>Template Information</Title>
              <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                <Row gutter={[16, 16]}>
                  <Col span={24}>
                    <Text type="secondary">Template Name</Text>
                    <br />
                    <Text strong style={{ fontSize: '16px' }}>{viewingRecord.template_name}</Text>
                  </Col>
                  <Col span={24}>
                    <Text type="secondary">Project Template</Text>
                    <br />
                    <Text>{viewingRecord.project_template || '-'}</Text>
                  </Col>
                  {viewingRecord.description && (
                    <Col span={24}>
                      <Text type="secondary">Description</Text>
                      <br />
                      <div dangerouslySetInnerHTML={{ __html: viewingRecord.description }} />
                    </Col>
                  )}
                </Row>
              </Card>
            </div>

{/* RACI Assignments */}
            <div>
              <Title level={5}>RACI Matrix</Title>
              {viewingRecord.raci_assignments && viewingRecord.raci_assignments.length > 0 ? (
                (() => {
                  // Group assignments by task_type
                  const groupedAssignments = {}
                  viewingRecord.raci_assignments.forEach(assignment => {
                    const taskType = assignment.task_type || 'Uncategorized'
                    const priority = assignment.task_type_priority || 999
                    if (!groupedAssignments[taskType]) {
                      groupedAssignments[taskType] = {
                        priority: priority,
                        tasks: []
                      }
                    }
                    groupedAssignments[taskType].tasks.push(assignment)
                  })

                  // Sort groups by priority (ascending)
                  const sortedGroups = Object.entries(groupedAssignments).sort((a, b) => {
                    return a[1].priority - b[1].priority
                  })

                  return (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      {sortedGroups.map(([taskType, groupData]) => (
                        <div key={taskType}>
                          <Divider orientation="left" style={{ fontWeight: 'bold', fontSize: '14px', marginTop: '8px', marginBottom: '12px' }}>
                            {taskType}
                          </Divider>
                          <Space direction="vertical" style={{ width: '100%' }}>
                            {groupData.tasks.map((assignment, index) => (
                              <Card
                                key={index}
                                size="small"
                                style={{
                                  background: '#f9f9f9',
                                  border: '1px solid #e8e8e8',
                                  borderLeft: '4px solid #1890ff'
                                }}
                              >
                                <div style={{ marginBottom: '12px' }}>
                                  <Text strong>{assignment.task_name}</Text>
                                </div>
                                <Row gutter={[16, 8]}>
                                  {assignment.responsible && (
                                    <Col xs={24} sm={12}>
                                      <div>
                                        {getRACIBadge('Responsible', assignment.responsible)}
                                        <Text type="secondary" style={{ fontSize: '12px' }}>Responsible (R)</Text>
                                        <br />
                                        <Text>{assignment.responsible}</Text>
                                      </div>
                                    </Col>
                                  )}
                                  {assignment.accountable && (
                                    <Col xs={24} sm={12}>
                                      <div>
                                        {getRACIBadge('Accountable', assignment.accountable)}
                                        <Text type="secondary" style={{ fontSize: '12px' }}>Accountable (A)</Text>
                                        <br />
                                        <Text>{assignment.accountable}</Text>
                                      </div>
                                    </Col>
                                  )}
                                  {assignment.consulted && (
                                    <Col xs={24} sm={12}>
                                      <div>
                                        {getRACIBadge('Consulted', assignment.consulted)}
                                        <Text type="secondary" style={{ fontSize: '12px' }}>Consulted (C)</Text>
                                        <br />
                                        <Text>{assignment.consulted}</Text>
                                      </div>
                                    </Col>
                                  )}
                                  {assignment.informed && (
                                    <Col xs={24} sm={12}>
                                      <div>
                                        {getRACIBadge('Informed', assignment.informed)}
                                        <Text type="secondary" style={{ fontSize: '12px' }}>Informed (I)</Text>
                                        <br />
                                        <Text>{assignment.informed}</Text>
                                      </div>
                                    </Col>
                                  )}
                                </Row>
                              </Card>
                            ))}
                          </Space>
                        </div>
                      ))}
                    </Space>
                  )
                })()
              ) : (
                <Empty description="No RACI assignments" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default RACITemplate
