import { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Table,
  Tag,
  Typography,
  theme,
  Spin,
  Empty,
  Button,
  Space,
  Input,
  Select,
  Statistic,
  Progress,
  message
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import { Column, Pie } from '@ant-design/plots'
import { useResponsive, getResponsiveGrid } from '../hooks/useResponsive'
import api from '../services/api'

const { Title, Text } = Typography

/**
 * Change Requests Dashboard Component
 * Displays comprehensive metrics and visualizations for change requests
 */
function ChangeRequestsDashboard() {
  const { token } = theme.useToken()
  const { isMobile, currentBreakpoint } = useResponsive()
  const gridConfig = getResponsiveGrid(currentBreakpoint)

  // State management
  const [metrics, setMetrics] = useState(null)
  const [changeRequests, setChangeRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState('modified')

  // Fetch metrics and data
  useEffect(() => {
    fetchChangeRequestsMetrics()
  }, [statusFilter])

  const fetchChangeRequestsMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.dashboard.getChangeRequestsMetrics({
        status: statusFilter !== 'all' ? statusFilter : undefined
      })

      if (response?.success) {
        setMetrics(response.metrics || {})
        setChangeRequests(response.data || [])
      } else {
        setError(response?.error || 'Failed to fetch metrics')
        setMetrics({})
        setChangeRequests([])
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data')
      setMetrics({})
      setChangeRequests([])
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort data
  const filteredData = changeRequests
    .filter(cr => {
      if (!searchText) return true
      const searchLower = searchText.toLowerCase()
      return (
        cr.title?.toLowerCase().includes(searchLower) ||
        cr.cr_number?.toLowerCase().includes(searchLower) ||
        cr.prepared_for?.toLowerCase().includes(searchLower)
      )
    })
    .sort((a, b) => {
      if (sortBy === 'modified') {
        return new Date(b.modified) - new Date(a.modified)
      }
      return 0
    })

  // Safe metric access with defaults
  const safeMetrics = {
    total: metrics?.total || 0,
    pending: metrics?.pending || 0,
    approved: metrics?.approved || 0,
    rejected: metrics?.rejected || 0,
    inProgress: metrics?.in_progress || 0,
    completed: metrics?.completed || 0,
    avgApprovalTime: metrics?.avg_approval_time || 0
  }

  // Status color mapping
  const statusColorMap = {
    'Pending': 'processing',
    'Approved': 'success',
    'Rejected': 'error',
    'In Progress': 'warning',
    'Completed': 'success'
  }

  // Table columns
  const columns = [
    {
      title: 'CR Number',
      dataIndex: 'cr_number',
      key: 'cr_number',
      width: 120,
      render: (text) => <Text strong>{text || 'N/A'}</Text>
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      render: (text) => <Text>{text || 'N/A'}</Text>
    },
    {
      title: 'Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      width: 120,
      render: (status) => (
        <Tag color={statusColorMap[status] || 'default'}>
          {status || 'Unknown'}
        </Tag>
      )
    },
    {
      title: 'Prepared For',
      dataIndex: 'prepared_for',
      key: 'prepared_for',
      width: 150,
      render: (text) => <Text>{text || 'N/A'}</Text>
    },
    {
      title: 'Submission Date',
      dataIndex: 'submission_date',
      key: 'submission_date',
      width: 130,
      render: (date) => <Text>{date ? new Date(date).toLocaleDateString() : 'N/A'}</Text>
    }
  ]

  // Status distribution data for pie chart
  const statusDistribution = [
    { type: 'Pending', value: safeMetrics.pending },
    { type: 'Approved', value: safeMetrics.approved },
    { type: 'Rejected', value: safeMetrics.rejected },
    { type: 'In Progress', value: safeMetrics.inProgress },
    { type: 'Completed', value: safeMetrics.completed }
  ].filter(item => item.value > 0)

  return (
    <div style={{ padding: isMobile ? '12px' : '16px', backgroundColor: token.colorBgLayout }}>
      {error && (
        <Card style={{ marginBottom: 16, borderColor: token.colorError }}>
          <Text type="danger">{error}</Text>
        </Card>
      )}

      {/* Metrics Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Total Change Requests"
              value={safeMetrics.total}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Pending Approvals"
              value={safeMetrics.pending}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: token.colorWarning }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Approved"
              value={safeMetrics.approved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: token.colorSuccess }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Rejected"
              value={safeMetrics.rejected}
              prefix={<CloseCircleOutlined />}
              valueStyle={{ color: token.colorError }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Status Distribution" loading={loading}>
            {statusDistribution.length > 0 ? (
              <Pie
                data={statusDistribution}
                angleField="value"
                colorField="type"
                radius={0.8}
                innerRadius={0.6}
                label={{ content: '{percentage}' }}
                height={300}
              />
            ) : (
              <Empty description="No data available" />
            )}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="Approval Metrics" loading={loading}>
            <Row gutter={[16, 16]}>
              <Col xs={24}>
                <Text>Approval Rate</Text>
                <Progress
                  percent={safeMetrics.total > 0 ? Math.round((safeMetrics.approved / safeMetrics.total) * 100) : 0}
                  status={safeMetrics.total > 0 ? 'active' : 'normal'}
                />
              </Col>
              <Col xs={24}>
                <Text>Avg Approval Time: {safeMetrics.avgApprovalTime || 0} hours</Text>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>

      {/* Filters and Controls */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <Input
            placeholder="Search by CR number, title, or prepared for..."
            prefix={<FilterOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: isMobile ? '100%' : 200 }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            <Select.Option value="Pending">Pending</Select.Option>
            <Select.Option value="Approved">Approved</Select.Option>
            <Select.Option value="Rejected">Rejected</Select.Option>
            <Select.Option value="In Progress">In Progress</Select.Option>
            <Select.Option value="Completed">Completed</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchChangeRequestsMetrics}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Data Table */}
      <Card title="Recent Change Requests" loading={loading}>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="name"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`
          }}
          scroll={{ x: 800 }}
          locale={{ emptyText: <Empty description="No change requests found" /> }}
        />
      </Card>
    </div>
  )
}

export default ChangeRequestsDashboard

