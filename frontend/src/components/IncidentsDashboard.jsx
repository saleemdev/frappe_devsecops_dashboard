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
  AlertOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FilterOutlined,
  ReloadOutlined,
  BugOutlined
} from '@ant-design/icons'
import { Column, Pie } from '@ant-design/plots'
import { useResponsive, getResponsiveGrid } from '../hooks/useResponsive'
import api from '../services/api'

const { Title, Text } = Typography

/**
 * Incidents Dashboard Component
 * Displays comprehensive metrics and visualizations for incidents
 */
function IncidentsDashboard() {
  const { token } = theme.useToken()
  const { isMobile, currentBreakpoint } = useResponsive()
  const gridConfig = getResponsiveGrid(currentBreakpoint)

  // State management
  const [metrics, setMetrics] = useState(null)
  const [incidents, setIncidents] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [searchText, setSearchText] = useState('')
  const [sortBy, setSortBy] = useState('modified')

  // Fetch metrics and data
  useEffect(() => {
    fetchIncidentsMetrics()
  }, [statusFilter, severityFilter])

  const fetchIncidentsMetrics = async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await api.dashboard.getIncidentsMetrics({
        status: statusFilter !== 'all' ? statusFilter : undefined,
        severity: severityFilter !== 'all' ? severityFilter : undefined
      })

      if (response?.success) {
        setMetrics(response.metrics || {})
        setIncidents(response.data || [])
      } else {
        setError(response?.error || 'Failed to fetch metrics')
        setMetrics({})
        setIncidents([])
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data')
      setMetrics({})
      setIncidents([])
    } finally {
      setLoading(false)
    }
  }

  // Filter and sort data
  const filteredData = incidents
    .filter(incident => {
      if (!searchText) return true
      const searchLower = searchText.toLowerCase()
      return (
        incident.title?.toLowerCase().includes(searchLower) ||
        incident.incident_id?.toLowerCase().includes(searchLower) ||
        incident.category?.toLowerCase().includes(searchLower)
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
    open: metrics?.open || 0,
    inProgress: metrics?.in_progress || 0,
    resolved: metrics?.resolved || 0,
    critical: metrics?.critical || 0,
    high: metrics?.high || 0,
    medium: metrics?.medium || 0,
    low: metrics?.low || 0,
    avgResolutionTime: metrics?.avg_resolution_time || 0
  }

  // Severity color mapping
  const severityColorMap = {
    'Critical': 'red',
    'High': 'orange',
    'Medium': 'gold',
    'Low': 'blue'
  }

  // Status color mapping
  const statusColorMap = {
    'Open': 'processing',
    'In Progress': 'warning',
    'Resolved': 'success',
    'Closed': 'default'
  }

  // Table columns
  const columns = [
    {
      title: 'Incident ID',
      dataIndex: 'incident_id',
      key: 'incident_id',
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
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      width: 100,
      render: (severity) => (
        <Tag color={severityColorMap[severity] || 'default'}>
          {severity || 'Unknown'}
        </Tag>
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => (
        <Tag color={statusColorMap[status] || 'default'}>
          {status || 'Unknown'}
        </Tag>
      )
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: 120,
      render: (text) => <Text>{text || 'N/A'}</Text>
    },
    {
      title: 'Created Date',
      dataIndex: 'creation',
      key: 'creation',
      width: 130,
      render: (date) => <Text>{date ? new Date(date).toLocaleDateString() : 'N/A'}</Text>
    }
  ]

  // Severity distribution data for pie chart
  const severityDistribution = [
    { type: 'Critical', value: safeMetrics.critical },
    { type: 'High', value: safeMetrics.high },
    { type: 'Medium', value: safeMetrics.medium },
    { type: 'Low', value: safeMetrics.low }
  ].filter(item => item.value > 0)

  // Status distribution data
  const statusDistribution = [
    { type: 'Open', value: safeMetrics.open },
    { type: 'In Progress', value: safeMetrics.inProgress },
    { type: 'Resolved', value: safeMetrics.resolved }
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
              title="Total Incidents"
              value={safeMetrics.total}
              prefix={<BugOutlined />}
              valueStyle={{ color: token.colorPrimary }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Open Incidents"
              value={safeMetrics.open}
              prefix={<AlertOutlined />}
              valueStyle={{ color: token.colorError }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="In Progress"
              value={safeMetrics.inProgress}
              prefix={<ClockCircleOutlined />}
              valueStyle={{ color: token.colorWarning }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Resolved"
              value={safeMetrics.resolved}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: token.colorSuccess }}
            />
          </Card>
        </Col>
      </Row>

      {/* Priority Metrics */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Critical"
              value={safeMetrics.critical}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="High"
              value={safeMetrics.high}
              valueStyle={{ color: '#ff7a45' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Medium"
              value={safeMetrics.medium}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card>
            <Statistic
              title="Low"
              value={safeMetrics.low}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Charts Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} lg={12}>
          <Card title="Severity Distribution" loading={loading}>
            {severityDistribution.length > 0 ? (
              <Pie
                data={severityDistribution}
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
      </Row>

      {/* Filters and Controls */}
      <Card style={{ marginBottom: 16 }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }}>
          <Input
            placeholder="Search by incident ID, title, or category..."
            prefix={<FilterOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : 300 }}
          />
          <Select
            value={statusFilter}
            onChange={setStatusFilter}
            style={{ width: isMobile ? '100%' : 150 }}
          >
            <Select.Option value="all">All Statuses</Select.Option>
            <Select.Option value="Open">Open</Select.Option>
            <Select.Option value="In Progress">In Progress</Select.Option>
            <Select.Option value="Resolved">Resolved</Select.Option>
          </Select>
          <Select
            value={severityFilter}
            onChange={setSeverityFilter}
            style={{ width: isMobile ? '100%' : 150 }}
          >
            <Select.Option value="all">All Severities</Select.Option>
            <Select.Option value="Critical">Critical</Select.Option>
            <Select.Option value="High">High</Select.Option>
            <Select.Option value="Medium">Medium</Select.Option>
            <Select.Option value="Low">Low</Select.Option>
          </Select>
          <Button
            icon={<ReloadOutlined />}
            onClick={fetchIncidentsMetrics}
            loading={loading}
          >
            Refresh
          </Button>
        </Space>
      </Card>

      {/* Data Table */}
      <Card title="Recent Incidents" loading={loading}>
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="name"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} items`
          }}
          scroll={{ x: 1000 }}
          locale={{ emptyText: <Empty description="No incidents found" /> }}
        />
      </Card>
    </div>
  )
}

export default IncidentsDashboard

