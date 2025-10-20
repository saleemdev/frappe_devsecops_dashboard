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
  Popconfirm,
  Tooltip,
  Tabs
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  ReloadOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography
const { Option } = Select
const { TabPane } = Tabs

const ChangeRequests = () => {
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [isViewDrawerVisible, setIsViewDrawerVisible] = useState(false)
  const [viewingRecord, setViewingRecord] = useState(null)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [total, setTotal] = useState(0)

  // Build whitelisted API call parameters
  const buildApiParams = () => {
    const fields = [
      'name','title','cr_number','prepared_for','submission_date','system_affected','originator_name',
      'originator_organization','originators_manager','change_category','downtime_expected',
      'detailed_description','release_notes','implementation_date','implementation_time','testing_plan',
      'rollback_plan','approval_status','workflow_state','project'
    ]

    // Server-side filters for status/category
    const filters = []
    if (statusFilter !== 'all') {
      filters.push(['Change Request','approval_status','=','' + statusFilter])
    }
    if (categoryFilter !== 'all') {
      filters.push(['Change Request','change_category','=','' + categoryFilter])
    }

    // Pagination
    const start = (page - 1) * pageSize

    return {
      fields: JSON.stringify(fields),
      filters: filters.length ? JSON.stringify(filters) : undefined,
      limit_start: start,
      limit_page_length: pageSize,
      order_by: 'modified desc'
    }
  }

  useEffect(() => {
    loadChangeRequests()
  // re-fetch when filters/pagination/search change, and on mount
  }, [statusFilter, categoryFilter, page, pageSize, searchText])

  const loadChangeRequests = async () => {
    setLoading(true)
    try {
      const params = buildApiParams()
      const urlParams = new URLSearchParams()
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined) urlParams.set(key, value)
      })

      const res = await fetch(`/api/method/frappe_devsecops_dashboard.api.change_request.get_change_requests?${urlParams.toString()}`, {
        credentials: 'include'
      })
      if (!res.ok) {
        if (res.status === 401 || res.status === 403) message.error('Unauthorized to read Change Requests')
        else message.error('Failed to load change requests')

        return
      }

      const response = await res.json()
      const data = response.message || response

      if (!data.success) {
        message.error(data.error || 'Failed to load change requests')

        return
      }

      const list = Array.isArray(data.data) ? data.data : []

      // Client-side search across key fields
      const st = searchText.trim().toLowerCase()
      const filtered = st
        ? list.filter(item =>
            (item.title || '').toLowerCase().includes(st) ||
            (item.system_affected || '').toLowerCase().includes(st) ||
            (item.cr_number || '').toLowerCase().includes(st) ||
            (item.name || '').toLowerCase().includes(st)
          )
        : list

      setChangeRequests(filtered)
      // Frappe list API doesn’t include total; approximate with filtered length
      setTotal(filtered.length)
    } catch (error) {
      message.error('Unable to connect to server')

    } finally {
      setLoading(false)
    }
  }


  const handleCreate = () => {
    window.location.hash = 'change-requests/new'
  }

  const handleEdit = (record) => {
    if (record?.name) {
      window.location.hash = `change-requests/edit/${record.name}`
    } else {
      message.error('Invalid Change Request record')
    }
  }

  const handleView = (record) => {
    setViewingRecord(record)
    setIsViewDrawerVisible(true)
  }

  const handleDelete = async (id) => {
    try {
      // Frappe expects form data, not JSON body
      const formData = new URLSearchParams()
      formData.append('name', id)

      const res = await fetch('/api/method/frappe_devsecops_dashboard.api.change_request.delete_change_request', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: formData.toString()
      })

      if (!res.ok) {
        if (res.status === 401 || res.status === 403) message.error('Permission denied')
        else if (res.status === 404) message.error('Change Request not found')
        else message.error('Failed to delete change request')

        return
      }

      const response = await res.json()
      const data = response.message || response

      if (!data.success) {
        message.error(data.error || 'Failed to delete change request')

        return
      }

      setChangeRequests(prev => prev.filter(item => item.name !== id))
      message.success(data.message || 'Change request deleted')
    } catch (error) {
      message.error('Unable to connect to server')

    }
  }


  const getApprovalStatusColor = (status) => {
    const colors = {
      'Pending Review': 'orange',
      'Approved for Implementation': 'green',
      'Rework': 'blue',
      'Not Accepted': 'red',
      'Withdrawn': 'gray',
      'Deferred': 'purple'
    }
    return colors[status] || 'default'
  }

  const getWorkflowStateColor = (state) => {
    const colors = {
      'Draft': 'default',
      'Pending Approval': 'orange',
      'Approved': 'green',
      'Rejected': 'red',
      'Implemented': 'blue',
      'Closed': 'purple'
    }
    return colors[state] || 'default'
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Major Change': 'red',
      'Minor Change': 'orange',
      'Standard Change': 'blue',
      'Emergency Change': 'magenta'
    }
    return colors[category] || 'default'
  }

  const filteredData = changeRequests.filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.system_affected?.toLowerCase().includes(searchText.toLowerCase()) ||
                         item.cr_number?.toLowerCase().includes(searchText.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.approval_status === statusFilter
    const matchesCategory = categoryFilter === 'all' || item.change_category === categoryFilter

    return matchesSearch && matchesStatus && matchesCategory
  })

  const columns = [
    {
      title: 'CR Number',
      dataIndex: 'cr_number',
      key: 'cr_number',
      width: 130,
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
      title: 'System Affected',
      dataIndex: 'system_affected',
      key: 'system_affected',
      width: 180,
      ellipsis: true
    },
    {
      title: 'Category',
      dataIndex: 'change_category',
      key: 'change_category',
      width: 150,
      render: (category) => (
        <Tag color={getCategoryColor(category)}>
          {category}
        </Tag>
      )
    },
    {
      title: 'Approval Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      width: 180,
      render: (status) => (
        <Tag color={getApprovalStatusColor(status)}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Workflow State',
      dataIndex: 'workflow_state',
      key: 'workflow_state',
      width: 140,
      render: (state) => (
        <Tag color={getWorkflowStateColor(state)}>
          {state}
        </Tag>
      )
    },
    {
      title: 'Submission Date',
      dataIndex: 'submission_date',
      key: 'submission_date',
      width: 130
    },
    {
      title: 'Implementation Date',
      dataIndex: 'implementation_date',
      key: 'implementation_date',
      width: 150
    },
    {
      title: 'Downtime',
      dataIndex: 'downtime_expected',
      key: 'downtime_expected',
      width: 100,
      render: (downtime) => (
        <Tag color={downtime ? 'red' : 'green'}>
          {downtime ? 'Yes' : 'No'}
        </Tag>
      )
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
            onConfirm={() => handleDelete(record.name)}
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
                placeholder="Search by title, CR number, or system..."
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                allowClear
              />
            </Col>
            <Col xs={12} sm={6} md={5} lg={4}>
              <Select
                placeholder="Approval Status"
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
              >
                <Option value="all">All Status</Option>
                <Option value="Pending Review">Pending Review</Option>
                <Option value="Rework">Rework</Option>
                <Option value="Not Accepted">Not Accepted</Option>
                <Option value="Withdrawn">Withdrawn</Option>
                <Option value="Deferred">Deferred</Option>
                <Option value="Approved for Implementation">Approved for Implementation</Option>
              </Select>
            </Col>
            <Col xs={12} sm={6} md={5} lg={4}>
              <Select
                placeholder="Category"
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: '100%' }}
              >
                <Option value="all">All Categories</Option>
                <Option value="Major Change">Major Change</Option>
                <Option value="Minor Change">Minor Change</Option>
                <Option value="Standard Change">Standard Change</Option>
                <Option value="Emergency Change">Emergency Change</Option>
              </Select>
            </Col>
          </Row>
        </div>

        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="name"
          loading={loading}
          scroll={{ x: 1200 }}
          pagination={{
            current: page,
            pageSize,
            total,
            showSizeChanger: true,
            showQuickJumper: true,
            onChange: (p, ps) => { setPage(p); setPageSize(ps) },
            showTotal: (t, range) => `${range[0]}-${range[1]} of ${t} items`
          }}
        />
      </Card>


      {/* View Details Drawer */}
      <Drawer
        title="Change Request Details"
        placement="right"
        onClose={() => setIsViewDrawerVisible(false)}
        open={isViewDrawerVisible}
        width={700}
      >
        {viewingRecord && (
          <div>
            <Title level={4}>{viewingRecord.title}</Title>

            <Tabs defaultActiveKey="1">
              <TabPane tab="Basic Info" key="1">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>CR Number: </Text>
                    <Text>{viewingRecord.cr_number}</Text>
                  </div>
                  <div>
                    <Text strong>Prepared For: </Text>
                    <Text>{viewingRecord.prepared_for || 'N/A'}</Text>
                  </div>
                  <div>
                    <Text strong>Submission Date: </Text>
                    <Text>{viewingRecord.submission_date}</Text>
                  </div>
                  <div>
                    <Text strong>Project: </Text>
                    <Text>{viewingRecord.project || 'N/A'}</Text>
                  </div>
                  <div>
                    <Text strong>System Affected: </Text>
                    <Text>{viewingRecord.system_affected}</Text>
                  </div>
                  <div>
                    <Text strong>Originator Name: </Text>
                    <Text>{viewingRecord.originator_name}</Text>
                  </div>
                  <div>
                    <Text strong>Originator Organization: </Text>
                    <Text>{viewingRecord.originator_organization || 'N/A'}</Text>
                  </div>
                  <div>
                    <Text strong>Originator's Manager: </Text>
                    <Text>{viewingRecord.originators_manager || 'N/A'}</Text>
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="Change Details" key="2">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Category: </Text>
                    <Tag color={getCategoryColor(viewingRecord.change_category)}>
                      {viewingRecord.change_category}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Downtime Expected: </Text>
                    <Tag color={viewingRecord.downtime_expected ? 'red' : 'green'}>
                      {viewingRecord.downtime_expected ? 'Yes' : 'No'}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Detailed Description: </Text>
                    <div
                      style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.detailed_description || 'N/A' }}
                    />
                  </div>
                  <div>
                    <Text strong>Release Notes: </Text>
                    <div
                      style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.release_notes || 'N/A' }}
                    />
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="Implementation" key="3">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Implementation Date: </Text>
                    <Text>{viewingRecord.implementation_date || 'Not set'}</Text>
                  </div>
                  <div>
                    <Text strong>Implementation Time: </Text>
                    <Text>{viewingRecord.implementation_time || 'Not set'}</Text>
                  </div>
                  <div>
                    <Text strong>Testing Plan: </Text>
                    <div
                      style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.testing_plan || 'N/A' }}
                    />
                  </div>
                  <div>
                    <Text strong>Rollback Plan: </Text>
                    <div
                      style={{ marginTop: '8px', padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.rollback_plan || 'N/A' }}
                    />
                  </div>
                </Space>
              </TabPane>

              <TabPane tab="Approval" key="4">
                <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                  <div>
                    <Text strong>Approval Status: </Text>
                    <Tag color={getApprovalStatusColor(viewingRecord.approval_status)}>
                      {viewingRecord.approval_status}
                    </Tag>
                  </div>
                  <div>
                    <Text strong>Workflow State: </Text>
                    <Tag color={getWorkflowStateColor(viewingRecord.workflow_state)}>
                      {viewingRecord.workflow_state || 'Not set'}
                    </Tag>
                  </div>
                </Space>
              </TabPane>
            </Tabs>
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default ChangeRequests
