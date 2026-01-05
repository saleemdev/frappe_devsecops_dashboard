import React, { useEffect } from 'react'
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
  Segmented
} from 'antd'
import {
  PlusOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  EditOutlined,
  CheckCircleOutlined,
  SearchOutlined,
  FilterOutlined,
  ReloadOutlined,
  FilePdfOutlined,
  TableOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import IncidentDetail from './IncidentDetail'
import IncidentsCalendar from './IncidentsCalendar'
import useIncidentsStore from '../stores/incidentsStore'
import useNavigationStore from '../stores/navigationStore'
import useIncidentNavigation from '../hooks/useIncidentNavigation'

const { Title, Text } = Typography
const { RangePicker } = DatePicker
const { Option } = Select

const Incidents = ({ navigateToRoute, showIncidentDetail, selectedIncidentId }) => {
  // Use store state instead of local state
  const {
    incidents,
    loading,
    error,
    filters,
    viewMode,
    setFilters,
    setViewMode,
    loadViewMode,
    fetchIncidents,
    closeIncident
  } = useIncidentsStore()

  // Use the reliable incident navigation hook
  const {
    viewIncident: navViewIncident,
    editIncident: navEditIncident,
    createIncident: navCreateIncident
  } = useIncidentNavigation()

  // Handler for view incident - use the navigation hook
  const handleViewIncident = (id) => {
    console.log('[Incidents] handleViewIncident called with id:', id)
    navViewIncident(id)
  }

  // Handler for edit incident - use the navigation hook
  const handleEditIncident = (id) => {
    console.log('[Incidents] handleEditIncident called with id:', id)
    navEditIncident(id)
  }

  // Handler for create incident - use the navigation hook
  const handleCreateIncident = () => {
    console.log('[Incidents] handleCreateIncident called')
    navCreateIncident()
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

  // Load incidents and view mode on component mount
  useEffect(() => {
    loadViewMode()
    fetchIncidents()
  }, [fetchIncidents, loadViewMode])

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
    const incidentId = incident.name || incident.id
    console.log('[Incidents] handleViewDetails called with incident:', incidentId)
    handleViewIncident(incidentId)
  }

  const handleView = (record) => {
    const incidentId = record.name || record.id
    console.log('[Incidents] handleView (table button) called with incident:', incidentId)
    handleViewIncident(incidentId)
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

  const handlePrintPDF = (record) => {
    try {
      // Use Frappe's built-in PDF download endpoint
      const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Devsecops Dashboard Incident&name=${encodeURIComponent(record.name)}&format=Standard&no_letterhead=0`
      window.open(pdfUrl, '_blank')
      message.success('PDF download started')
    } catch (error) {
      console.error('Error generating PDF:', error)
      message.error('Failed to generate PDF')
    }
  }

  const getSeverityColor = (severity) => {
    if (!severity) return 'default'

    // Handle both formats: "S1 - Critical" and "Critical"
    const severityStr = severity.toLowerCase()

    if (severityStr.includes('critical') || severityStr.includes('s1')) return 'red'
    if (severityStr.includes('high') || severityStr.includes('s2')) return 'orange'
    if (severityStr.includes('medium') || severityStr.includes('s3')) return 'yellow'
    if (severityStr.includes('low') || severityStr.includes('s4')) return 'green'

    return 'default'
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
      const dateValue = incident.reported_date || incident.reportedDate || incident.creation
      if (dateValue) {
        const incidentDate = new Date(dateValue)
        matchesDate = incidentDate >= filters.dateRange[0].toDate() && incidentDate <= filters.dateRange[1].toDate()
      } else {
        matchesDate = false
      }
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
        const getSeverityLevel = (severity) => {
          if (!severity) return 0
          const s = severity.toLowerCase()
          if (s.includes('critical') || s.includes('s1')) return 4
          if (s.includes('high') || s.includes('s2')) return 3
          if (s.includes('medium') || s.includes('s3')) return 2
          if (s.includes('low') || s.includes('s4')) return 1
          return 0
        }
        return getSeverityLevel(b.severity) - getSeverityLevel(a.severity)
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
      dataIndex: 'reported_date',
      key: 'reported_date',
      width: 140,
      sorter: (a, b) => new Date(a.reported_date || 0) - new Date(b.reported_date || 0)
    },
    {
      title: 'Assigned To',
      dataIndex: 'assigned_to_name',
      key: 'assigned_to',
      width: 140,
      ellipsis: true,
      render: (_, record) => record.assigned_to_name || record.assigned_to_full_name || record.assignedTo || record.assigned_to || '-'
    },
    {
      title: 'Project',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 140,
      ellipsis: true
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 220,
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
          <Tooltip title="Download PDF">
            <Button
              type="text"
              icon={<FilePdfOutlined />}
              onClick={() => handlePrintPDF(record)}
              style={{ color: '#ff4d4f' }}
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

        {/* Conditional View Rendering */}
        {viewMode === 'table' ? (
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
        ) : (
          <IncidentsCalendar
            incidents={filteredIncidents}
            onIncidentClick={handleViewIncident}
            loading={loading}
          />
        )}
      </Card>

    </div>
  )
}

export default Incidents
