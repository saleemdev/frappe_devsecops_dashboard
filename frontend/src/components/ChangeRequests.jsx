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
  Tooltip,
  Collapse,
  Divider,
  Timeline
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  EyeOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  LockOutlined,
  FilePdfOutlined
} from '@ant-design/icons'
import useAuthStore from '../stores/authStore'

const { Title, Text } = Typography
const { Option } = Select

const ChangeRequests = () => {
  const { hasWritePermission } = useAuthStore()
  const [canEditChangeRequest, setCanEditChangeRequest] = useState(true)
  const [checkingPermissions, setCheckingPermissions] = useState(true)
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
      'originator_full_name','originator_organization','originators_manager','originator_manager_full_name',
      'change_category','downtime_expected',
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

  // Check write permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        console.log('[RBAC DEBUG] ChangeRequests: Starting permission check for Change Request')
        setCheckingPermissions(true)
        const hasWrite = await hasWritePermission('Change Request')
        console.log('[RBAC DEBUG] ChangeRequests: Permission check result:', hasWrite)
        console.log('[RBAC DEBUG] ChangeRequests: Setting canEditChangeRequest to:', hasWrite)
        setCanEditChangeRequest(hasWrite)
      } catch (error) {
        console.error('[RBAC DEBUG] ChangeRequests: Error checking permissions:', error)
        setCanEditChangeRequest(false)
      } finally {
        setCheckingPermissions(false)
      }
    }

    checkPermissions()
  }, [hasWritePermission])

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

  const handleView = async (record) => {
    try {
      // Fetch the full record with approvers data
      const res = await fetch(`/api/method/frappe_devsecops_dashboard.api.change_request.get_change_request?name=${record.name}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        message.error('Failed to load Change Request details')
        return
      }

      const response = await res.json()
      const fullRecord = response.message?.data || record

      setViewingRecord(fullRecord)
      setIsViewDrawerVisible(true)
    } catch (error) {
      console.error('Error fetching Change Request:', error)
      // Fallback to the record from the list
      setViewingRecord(record)
      setIsViewDrawerVisible(true)
    }
  }

  const handlePrintPDF = (record) => {
    try {
      // Use Frappe's built-in PDF download endpoint
      const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Change Request&name=${encodeURIComponent(record.name)}&format=Standard&no_letterhead=0`

      // Open in new tab/window for download
      window.open(pdfUrl, '_blank')
      message.success('PDF download started')
    } catch (error) {
      console.error('Error generating PDF:', error)
      message.error('Failed to generate PDF')
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

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return ''
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      })
    } catch (error) {
      return timestamp
    }
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
          <Tooltip title={canEditChangeRequest ? "Edit" : "You don't have permission to edit Change Requests"}>
            <Button
              type="text"
              icon={canEditChangeRequest ? <EditOutlined /> : <LockOutlined />}
              onClick={() => handleEdit(record)}
              disabled={!canEditChangeRequest}
              style={{
                color: !canEditChangeRequest ? '#d9d9d9' : undefined,
                cursor: !canEditChangeRequest ? 'not-allowed' : 'pointer'
              }}
            />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button
              type="text"
              icon={<FilePdfOutlined />}
              onClick={() => handlePrintPDF(record)}
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>
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
        width={1000}
      >
        {viewingRecord && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Title and Status */}
            <div>
              <Title level={3} style={{ margin: '0 0 12px 0' }}>{viewingRecord.title}</Title>
              <Row gutter={16}>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>CR Number</Text>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                      {viewingRecord.cr_number}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Approval Status</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Tag color={getApprovalStatusColor(viewingRecord.approval_status)}>
                        {viewingRecord.approval_status}
                      </Tag>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            <Divider style={{ margin: '0' }} />

            {/* Originator and Manager Information */}
            <div style={{
              padding: '16px',
              background: '#fafafa',
              borderRadius: '6px',
              border: '1px solid #f0f0f0'
            }}>
              <Title level={5} style={{ margin: '0 0 16px 0', color: '#1890ff' }}>
                Originator Information
              </Title>
              <Row gutter={[16, 16]}>
                <Col span={24}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Originator</Text>
                    <div style={{ fontSize: '18px', fontWeight: '700', marginTop: '4px', color: '#000' }}>
                      {viewingRecord.originator_full_name || viewingRecord.originator_name}
                    </div>
                    <Text type="secondary" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                      ID: {viewingRecord.originator_name}
                    </Text>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Organization</Text>
                    <div style={{ fontSize: '14px', marginTop: '4px' }}>
                      {viewingRecord.originator_organization || 'N/A'}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Manager</Text>
                    <div style={{ fontSize: '16px', fontWeight: '600', marginTop: '4px', color: '#000' }}>
                      {viewingRecord.originator_manager_full_name || viewingRecord.originators_manager || 'N/A'}
                    </div>
                    {viewingRecord.originators_manager && (
                      <Text type="secondary" style={{ fontSize: '11px', marginTop: '2px', display: 'block' }}>
                        ID: {viewingRecord.originators_manager}
                      </Text>
                    )}
                  </div>
                </Col>
              </Row>
            </div>

            {/* Quick Details */}
            <div>
              <Title level={5} style={{ margin: '0 0 12px 0' }}>Quick Details</Title>
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>System Affected</Text>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {viewingRecord.system_affected}
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Submission Date</Text>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {viewingRecord.submission_date}
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Project</Text>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {viewingRecord.project || 'N/A'}
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Category</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Tag color={getCategoryColor(viewingRecord.change_category)}>
                          {viewingRecord.change_category}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Implementation Date</Text>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {viewingRecord.implementation_date || 'Not set'}
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Implementation Time</Text>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {viewingRecord.implementation_time || 'Not set'}
                      </div>
                    </div>
                  </Col>
                </Row>
                <Row gutter={16}>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Downtime Expected</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Tag color={viewingRecord.downtime_expected ? 'red' : 'green'}>
                          {viewingRecord.downtime_expected ? 'Yes' : 'No'}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                  <Col span={12}>
                    <div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>Workflow State</Text>
                      <div style={{ marginTop: '4px' }}>
                        <Tag color={getWorkflowStateColor(viewingRecord.workflow_state)}>
                          {viewingRecord.workflow_state || 'Not set'}
                        </Tag>
                      </div>
                    </div>
                  </Col>
                </Row>
              </Space>
            </div>

            {/* Change Approvers Section */}
            {viewingRecord.change_approvers && viewingRecord.change_approvers.length > 0 && (
              <div style={{
                padding: '16px',
                background: '#f6f8fb',
                borderRadius: '6px',
                border: '1px solid #e6f4ff'
              }}>
                <Title level={5} style={{ margin: '0 0 16px 0', color: '#1890ff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <UserOutlined />
                  Change Approvers
                </Title>
                <Timeline
                  items={
                    // Sort approvers by modified timestamp (latest first)
                    [...viewingRecord.change_approvers]
                      .sort((a, b) => {
                        const dateA = new Date(a.modified || 0)
                        const dateB = new Date(b.modified || 0)
                        return dateB - dateA
                      })
                      .map((approver, index, sortedApprovers) => {
                        let statusColor = 'gray'
                        let statusIcon = null
                        let statusLabel = approver.approval_status || 'Pending'

                        if (approver.approval_status === 'Approved') {
                          statusColor = 'green'
                          statusIcon = <CheckCircleOutlined style={{ color: '#52c41a' }} />
                        } else if (approver.approval_status === 'Rejected') {
                          statusColor = 'red'
                          statusIcon = <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                        } else if (approver.approval_status === 'Pending') {
                          statusColor = 'orange'
                          statusIcon = <ClockCircleOutlined style={{ color: '#faad14' }} />
                        }

                        return {
                          dot: statusIcon,
                          children: (
                            <div style={{ paddingBottom: index < sortedApprovers.length - 1 ? '16px' : '0' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                <div>
                                  <Text strong style={{ fontSize: '14px' }}>
                                    {approver.user_full_name || approver.user || 'N/A'}
                                  </Text>
                                  <div style={{ marginTop: '4px', fontSize: '12px', color: '#8c8c8c' }}>
                                    {approver.business_function && (
                                      <div>{approver.business_function}</div>
                                    )}
                                  </div>
                                  <div style={{ marginTop: '4px' }}>
                                    <Tag color={statusColor}>
                                      {statusLabel}
                                    </Tag>
                                  </div>
                                </div>
                              </div>
                              {approver.approval_datetime && (
                                <Text type="secondary" style={{ fontSize: '12px' }}>
                                  {formatTimestamp(approver.approval_datetime)}
                                </Text>
                              )}
                              {approver.remarks && (
                                <div style={{ marginTop: '8px', padding: '8px', background: '#fff', borderRadius: '4px', borderLeft: '3px solid #1890ff' }}>
                                  <Text type="secondary" style={{ fontSize: '12px' }}>Remarks:</Text>
                                  <div style={{ fontSize: '13px', marginTop: '4px', color: '#262626' }}>
                                    {approver.remarks}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        }
                      })
                  }
                />
              </div>
            )}

            {/* Detailed Information in Collapsibles */}
            <Collapse
              items={[
                {
                  key: '1',
                  label: 'Detailed Description',
                  children: (
                    <div
                      style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.detailed_description || 'N/A' }}
                    />
                  )
                },
                {
                  key: '2',
                  label: 'Release Notes',
                  children: (
                    <div
                      style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.release_notes || 'N/A' }}
                    />
                  )
                },
                {
                  key: '3',
                  label: 'Testing Plan',
                  children: (
                    <div
                      style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.testing_plan || 'N/A' }}
                    />
                  )
                },
                {
                  key: '4',
                  label: 'Rollback Plan',
                  children: (
                    <div
                      style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                      dangerouslySetInnerHTML={{ __html: viewingRecord.rollback_plan || 'N/A' }}
                    />
                  )
                }
              ]}
              defaultActiveKey={['1']}
            />
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default ChangeRequests
