import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Table,
  Typography,
  Space,
  Tag,
  message,
  Empty,
  Spin,
  Row,
  Col,
  DatePicker,
  Tooltip,
  Input,
  Select,
  Segmented
} from 'antd'
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SearchOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  TableOutlined,
  CalendarOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import useToilStore from '../stores/toilStore'
import useNavigationStore from '../stores/navigationStore'
import ApprovalModal from './ApprovalModal'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const TOILList = ({ navigateToRoute }) => {
  // Use store state
  const {
    timesheets,
    loading,
    submitting,
    error,
    filters,
    viewMode,
    userRole,
    currentView,
    setFilters,
    setViewMode,
    loadViewMode,
    fetchTimesheets,
    approveTimesheet,
    rejectTimesheet,
    initialize
  } = useToilStore()

  const { viewTimesheet } = useNavigationStore()

  // State for ApprovalModal (replaces unsafe prompt())
  const [isApprovalModalVisible, setIsApprovalModalVisible] = useState(false)
  const [selectedTimesheetForAction, setSelectedTimesheetForAction] = useState(null)

  // Initialize store and load timesheets on mount
  // Empty dependency array ensures this runs only once
  // Zustand store actions are stable references and don't need to be in dependencies
  useEffect(() => {
    initialize()
    loadViewMode()
    fetchTimesheets()
  }, [])

  // Handler for view timesheet
  const handleViewTimesheet = (id) => {
    console.log('[TOILList] Viewing timesheet:', id)
    viewTimesheet(id)
  }

  // Handler for edit timesheet - use native ERPNext form for editing existing records
  const handleEditTimesheet = (id) => {
    window.location.href = `/app/timesheet/${id}`
  }

  // Handler for create timesheet - navigate to React form
  const handleCreateTimesheet = () => {
    if (navigateToRoute) {
      navigateToRoute('toil-timesheet-new')
    }
  }

  // Handler for approve timesheet
  const handleApproveTimesheet = async (id, comment = null) => {
    try {
      const result = await approveTimesheet(id, comment)
      if (result.success) {
        message.success(result.message || 'Timesheet submitted. TOIL accrual is processing.')
        return result
      } else {
        const error = result.error || 'Failed to approve timesheet'
        message.error(error)
        return { success: false, error }
      }
    } catch (error) {
      console.error('[TOILList] Error approving timesheet:', error)
      const errMsg = error?.message || 'Failed to approve timesheet'
      message.error(errMsg)
      return { success: false, error: errMsg }
    }
  }

  // Handler for reject timesheet
  const handleRejectTimesheet = async (id, reason) => {
    try {
      const result = await rejectTimesheet(id, reason)
      if (result.success) {
        message.success(result.message || 'Timesheet rejected')
        return result
      } else {
        const error = result.error || 'Failed to reject timesheet'
        message.error(error)
        return { success: false, error }
      }
    } catch (error) {
      console.error('[TOILList] Error rejecting timesheet:', error)
      const errMsg = error?.message || 'Failed to reject timesheet'
      message.error(errMsg)
      return { success: false, error: errMsg }
    }
  }

  // Handler for filter changes
  const handleStatusFilterChange = (value) => {
    setFilters({ status: value === 'all' ? '' : value })
  }

  const handleSearchChange = (e) => {
    setFilters({ search: e.target.value })
  }

  const handleDateRangeChange = (dateRange) => {
    setFilters({ dateRange })
  }

  // Get status color
  const getStatusColor = (status) => {
    switch (status) {
      case 'Draft': return 'default'
      case 'Pending Accrual': return 'orange'
      case 'Accrued': return 'blue'
      case 'Partially Used': return 'cyan'
      case 'Fully Used': return 'green'
      default: return 'default'
    }
  }

  // Filter timesheets based on search and filters
  const filteredTimesheets = timesheets.filter(timesheet => {
    // Search filter
    const searchTerm = filters.search || ''
    const matchesSearch = !searchTerm ||
      timesheet.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      timesheet.employee_name?.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter
    const matchesStatus = !filters.status || timesheet.toil_status === filters.status

    // Date range filter
    let matchesDate = true
    if (filters.dateRange && filters.dateRange.length === 2) {
      const fromDate = new Date(timesheet.from_date)
      matchesDate = fromDate >= filters.dateRange[0].toDate() && fromDate <= filters.dateRange[1].toDate()
    }

    return matchesSearch && matchesStatus && matchesDate
  })

  // Table columns
  const columns = [
    {
      title: 'Timesheet ID',
      dataIndex: 'name',
      key: 'name',
      width: 140,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '')
    },
    {
      title: 'Employee',
      dataIndex: 'employee_name',
      key: 'employee_name',
      width: 180,
      sorter: (a, b) => (a.employee_name || '').localeCompare(b.employee_name || '')
    },
    {
      title: 'Date Range',
      key: 'date_range',
      width: 200,
      render: (_, record) => (
        <Text>{record.from_date} to {record.to_date}</Text>
      )
    },
    {
      title: 'Total Hours',
      dataIndex: 'total_hours',
      key: 'total_hours',
      width: 100,
      align: 'right',
      render: (hours) => <Text>{Number(hours || 0).toFixed(2)}</Text>,
      sorter: (a, b) => (a.total_hours || 0) - (b.total_hours || 0)
    },
    {
      title: 'TOIL Hours',
      dataIndex: 'total_toil_hours',
      key: 'total_toil_hours',
      width: 100,
      align: 'right',
      render: (hours) => <Text strong>{Number(hours || 0).toFixed(2)}</Text>,
      sorter: (a, b) => (a.total_toil_hours || 0) - (b.total_toil_hours || 0)
    },
    {
      title: 'TOIL Days',
      dataIndex: 'toil_days',
      key: 'toil_days',
      width: 100,
      align: 'right',
      render: (days) => (
        <Tag color="blue" style={{ fontWeight: 600 }}>
          {Number(days || 0).toFixed(2)} days
        </Tag>
      ),
      sorter: (a, b) => (a.toil_days || 0) - (b.toil_days || 0)
    },
    {
      title: 'Status',
      dataIndex: 'toil_status',
      key: 'toil_status',
      width: 140,
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status || 'Not Applicable'}</Tag>
      ),
      filters: [
        { text: 'Draft', value: 'Draft' },
        { text: 'Pending Accrual', value: 'Pending Accrual' },
        { text: 'Accrued', value: 'Accrued' },
        { text: 'Partially Used', value: 'Partially Used' },
        { text: 'Fully Used', value: 'Fully Used' }
      ],
      onFilter: (value, record) => record.toil_status === value
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 280,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Details">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleViewTimesheet(record.name)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditTimesheet(record.name)}
            />
          </Tooltip>
          <Tooltip title="Download PDF">
            <Button
              type="text"
              icon={<FilePdfOutlined />}
              onClick={() => {
                const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Timesheet&name=${encodeURIComponent(record.name)}&format=Standard&no_letterhead=0`
                window.open(pdfUrl, '_blank')
                message.success('PDF download started')
              }}
              style={{ color: '#ff4d4f' }}
            />
          </Tooltip>
          {userRole === 'supervisor' && record.toil_status === 'Pending Accrual' && (
            <>
              <Tooltip title="Approve">
                <Button
                  type="text"
                  icon={<CheckCircleOutlined />}
                  onClick={() => {
                    setSelectedTimesheetForAction(record)
                    setIsApprovalModalVisible(true)
                  }}
                  style={{ color: '#52c41a' }}
                  loading={submitting}
                />
              </Tooltip>
              <Tooltip title="Reject">
                <Button
                  type="text"
                  icon={<CloseCircleOutlined />}
                  onClick={() => {
                    setSelectedTimesheetForAction(record)
                    setIsApprovalModalVisible(true)
                  }}
                  style={{ color: '#ff4d4f' }}
                />
              </Tooltip>
            </>
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
                <ClockCircleOutlined style={{ marginRight: 8, color: '#1890ff' }} />
                Timesheet (TOIL Record)
              </Title>
            </Col>
            <Col>
              <Space>
                <Button
                  type="default"
                  onClick={() => {
                    // Navigate to balance view - placeholder
                    message.info('Balance view coming soon')
                  }}
                >
                  View My Balance
                </Button>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateTimesheet}
                >
                  Create Timesheet
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchTimesheets}
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
              placeholder="Search timesheets..."
              prefix={<SearchOutlined />}
              value={filters.search || ''}
              onChange={handleSearchChange}
              allowClear
            />
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Select
              placeholder="Status"
              value={filters.status || 'all'}
              onChange={handleStatusFilterChange}
              style={{ width: '100%' }}
            >
              <Option value="all">All Status</Option>
              <Option value="Draft">Draft</Option>
              <Option value="Pending Accrual">Pending Accrual</Option>
              <Option value="Accrued">Accrued</Option>
              <Option value="Partially Used">Partially Used</Option>
              <Option value="Fully Used">Fully Used</Option>
            </Select>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <RangePicker
              placeholder={['Start Date', 'End Date']}
              value={filters.dateRange || null}
              onChange={handleDateRangeChange}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        {/* View Mode Toggle */}
        <Row justify="space-between" align="middle" style={{ marginBottom: 16 }}>
          <Col>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                {
                  label: 'Table View',
                  value: 'table',
                  icon: <TableOutlined />
                },
                {
                  label: 'Calendar View',
                  value: 'calendar',
                  icon: <CalendarOutlined />
                }
              ]}
            />
          </Col>
        </Row>

        {/* Table View */}
        {viewMode === 'table' ? (
          <Table
            columns={columns}
            dataSource={filteredTimesheets}
            rowKey="name"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showQuickJumper: true,
              showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} timesheets`
            }}
            locale={{
              emptyText: (
                <Empty
                  description="No timesheets found"
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                />
              )
            }}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '50px' }}>
            <CalendarOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px' }} />
            <Text type="secondary">Calendar view coming soon</Text>
          </div>
        )}
      </Card>

      {/* Approval/Rejection Modal - replaces unsafe prompt() */}
      <ApprovalModal
        visible={isApprovalModalVisible}
        loading={submitting}
        onCancel={() => {
          setIsApprovalModalVisible(false)
          setSelectedTimesheetForAction(null)
        }}
        onApprove={async (comment) => {
          let result = { success: false, error: 'No timesheet selected' }
          if (selectedTimesheetForAction) {
            result = await handleApproveTimesheet(selectedTimesheetForAction.name, comment)
          }
          if (result?.success) {
            setIsApprovalModalVisible(false)
            setSelectedTimesheetForAction(null)
          }
          return result
        }}
        onReject={async (reason) => {
          let result = { success: false, error: 'No timesheet selected' }
          if (selectedTimesheetForAction) {
            result = await handleRejectTimesheet(selectedTimesheetForAction.name, reason)
          }
          if (result?.success) {
            setIsApprovalModalVisible(false)
            setSelectedTimesheetForAction(null)
          }
          return result
        }}
        timesheet={selectedTimesheetForAction}
      />
    </div>
  )
}

export default TOILList
