import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
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
  Tooltip,
  Input,
  Select,
  Drawer,
  Descriptions,
  Divider
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
import useIncidentsStore from '../stores/incidentsStore'
import useNavigationStore from '../stores/navigationStore'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const Incidents = ({ navigateToRoute, showIncidentDetail, selectedIncidentId }) => {
  const [isViewDrawerVisible, setIsViewDrawerVisible] = useState(false)
  const [viewingRecord, setViewingRecord] = useState(null)
  // Use store state instead of local state
  const {
    incidents,
    loading,
    error,
    filters,
    setFilters,
    fetchIncidents,
    closeIncident
  } = useIncidentsStore()

  const {
    viewIncident,
    editIncident,
    createIncident
  } = useNavigationStore()

  // Fallback to prop-based navigation if store navigation not available
  const handleViewIncident = (id) => {
    if (viewIncident && typeof viewIncident === 'function') {
      viewIncident(id)
    } else if (navigateToRoute && typeof navigateToRoute === 'function') {
      navigateToRoute('incident-detail', null, id)
    }
  }

  const handleEditIncident = (id) => {
    if (editIncident && typeof editIncident === 'function') {
      editIncident(id)
    } else if (navigateToRoute && typeof navigateToRoute === 'function') {
      navigateToRoute('incident-edit', null, id)
    }
  }

  const handleCreateIncident = () => {
    if (createIncident && typeof createIncident === 'function') {
      createIncident()
    } else if (navigateToRoute && typeof navigateToRoute === 'function') {
      navigateToRoute('incident-create')
    }
  }

  // Show incident detail view if selectedIncidentId is provided
  if (showIncidentDetail && selectedIncidentId) {
    return (
      <IncidentDetail
        incidentId={selectedIncidentId}
        navigateToRoute={navigateToRoute}
        onIncidentUpdate={(updatedIncident) => {
          // Store handles updating the incidents list automatically
          // This callback is kept for backward compatibility but the store updates happen automatically
          console.log('[Incidents] Incident updated via modal:', updatedIncident)
        }}
      />
    )
  }

  // Load incidents on component mount
  useEffect(() => {
    fetchIncidents()
  }, [fetchIncidents])

  // Handle filter changes - sync with store
  const handleStatusFilterChange = (value) => {
    setFilters({ status: value === 'all' ? '' : value })
  }

  const handleSeverityFilterChange = (value) => {
    setFilters({ severity: value === 'all' ? '' : value })
  }

  const handleSearchChange = (e) => {
    setFilters({ search: e.target.value })
  }

  const handleViewDetails = (incident) => {
    handleViewIncident(incident.id || incident.name)
  }

  const handleView = async (record) => {
    try {
      // Fetch the full record with all details
      const res = await fetch(`/api/method/frappe_devsecops_dashboard.api.incident.get_incident?name=${encodeURIComponent(record.name)}`, {
        credentials: 'include'
      })

      if (!res.ok) {
        message.error('Failed to load Incident details')
        return
      }

      const response = await res.json()
      const fullRecord = response.message?.data || record

      setViewingRecord(fullRecord)
      setIsViewDrawerVisible(true)
    } catch (error) {
      console.error('Error fetching Incident:', error)
      // Fallback to the record from the list
      setViewingRecord(record)
      setIsViewDrawerVisible(true)
    }
  }

  const handleMarkAsClosed = async (incidentId) => {
    try {
      console.log('[Incidents] Marking incident as closed:', incidentId)
      await closeIncident(incidentId)
      message.success('Incident marked as closed')
    } catch (error) {
      console.error('[Incidents] Error closing incident:', error)
      message.error(error?.message || 'Failed to update incident status')
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

  // Filter incidents based on search and filters from store
  const filteredIncidents = incidents.filter(incident => {
    // Search filter - matches title, description, or name
    const searchTerm = filters.search || ''
    const matchesSearch = !searchTerm ||
                         incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         incident.name.toLowerCase().includes(searchTerm.toLowerCase())

    // Status filter - empty string means 'all'
    const matchesStatus = !filters.status || incident.status === filters.status

    // Severity filter - empty string means 'all'
    const matchesSeverity = !filters.severity || incident.severity === filters.severity

    // Date range filter
    let matchesDate = true
    if (filters.dateRange && filters.dateRange.length === 2) {
      const incidentDate = new Date(incident.createdDate)
      matchesDate = incidentDate >= filters.dateRange[0].toDate() && incidentDate <= filters.dateRange[1].toDate()
    }

    return matchesSearch && matchesStatus && matchesSeverity && matchesDate
  })

  const columns = [
    {
      title: 'ID',
      dataIndex: 'name',
      key: 'name',
      width: 100,
      sorter: (a, b) => (a.name || '').localeCompare(b.name || '')
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
              onClick={() => handleView(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleEditIncident(record.name)}
            />
          </Tooltip>
          {record.status !== 'Closed' && (
            <Tooltip title="Mark as Closed">
              <Popconfirm
                title="Mark this incident as closed?"
                onConfirm={() => handleMarkAsClosed(record.name)}
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
                Incidents
              </Title>
            </Col>
            <Col>
              <Space>
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateIncident}
                >
                  Add Incident
                </Button>
                <Button
                  icon={<ReloadOutlined />}
                  onClick={fetchIncidents}
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
              <Option value="Open">Open</Option>
              <Option value="In Progress">In Progress</Option>
              <Option value="Closed">Closed</Option>
            </Select>
          </Col>
          <Col xs={12} sm={4} md={3}>
            <Select
              placeholder="Severity"
              value={filters.severity || 'all'}
              onChange={handleSeverityFilterChange}
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
              value={filters.dateRange || null}
              onChange={(dateRange) => setFilters({ dateRange })}
              style={{ width: '100%' }}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={filteredIncidents}
          rowKey="name"
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

      {/* View Details Drawer */}
      <Drawer
        title="Incident Details"
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
                    <Text type="secondary" style={{ fontSize: '12px' }}>Incident ID</Text>
                    <div style={{ fontSize: '14px', fontWeight: '500', marginTop: '4px' }}>
                      {viewingRecord.name}
                    </div>
                  </div>
                </Col>
                <Col span={12}>
                  <div>
                    <Text type="secondary" style={{ fontSize: '12px' }}>Status</Text>
                    <div style={{ marginTop: '4px' }}>
                      <Tag color={getStatusColor(viewingRecord.status)}>
                        {viewingRecord.status}
                      </Tag>
                    </div>
                  </div>
                </Col>
              </Row>
            </div>

            <Divider style={{ margin: '0' }} />

            {/* Quick Details */}
            <div>
              <Title level={5} style={{ margin: '0 0 12px 0' }}>Quick Details</Title>
              <Descriptions bordered column={1} size="small">
                <Descriptions.Item label="Severity">
                  <Tag color={getSeverityColor(viewingRecord.severity)}>
                    {viewingRecord.severity || '-'}
                  </Tag>
                </Descriptions.Item>
                <Descriptions.Item label="Priority">{viewingRecord.priority || '-'}</Descriptions.Item>
                <Descriptions.Item label="Category">{viewingRecord.category || '-'}</Descriptions.Item>
                <Descriptions.Item label="Assigned To">{viewingRecord.assigned_to || '-'}</Descriptions.Item>
                <Descriptions.Item label="Reported By">{viewingRecord.reported_by || '-'}</Descriptions.Item>
                <Descriptions.Item label="Reported Date">{viewingRecord.reported_date || '-'}</Descriptions.Item>
              </Descriptions>
            </div>

            {/* Description */}
            {viewingRecord.description && (
              <div>
                <Title level={5} style={{ margin: '0 0 12px 0' }}>Description</Title>
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', lineHeight: '1.6' }}>
                  {viewingRecord.description}
                </div>
              </div>
            )}

            {/* Affected Systems */}
            {viewingRecord.affected_systems && (
              <div>
                <Title level={5} style={{ margin: '0 0 12px 0' }}>Affected Systems</Title>
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {viewingRecord.affected_systems}
                </div>
              </div>
            )}

            {/* Impact Description */}
            {viewingRecord.impact_description && (
              <div>
                <Title level={5} style={{ margin: '0 0 12px 0' }}>Impact Description</Title>
                <div style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px', whiteSpace: 'pre-wrap' }}>
                  {viewingRecord.impact_description}
                </div>
              </div>
            )}
          </div>
        )}
      </Drawer>
    </div>
  )
}

export default Incidents
