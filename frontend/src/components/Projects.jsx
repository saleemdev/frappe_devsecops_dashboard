import { useState, useEffect } from 'react'
import { Row, Col, Card, Spin, Empty, Button, Space, Typography, theme, Input, Select, Table, Tag, Progress, Tooltip, Avatar, Descriptions, Popconfirm, message, Segmented } from 'antd'
import { PlusOutlined, SearchOutlined, FilterOutlined, ProjectOutlined, ReloadOutlined, TableOutlined, AppstoreOutlined, CalendarOutlined, UserOutlined, TeamOutlined, PrinterOutlined, BarChartOutlined, EditOutlined, CloseCircleOutlined, RightOutlined, DownOutlined } from '@ant-design/icons'
import ProjectCard from './ProjectCard'
import SprintReportDialog from './SprintReportDialog'
import api from '../services/api'
import { useResponsive } from '../hooks/useResponsive'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

/**
 * Projects Component
 * Displays a grid/list of project cards with filtering and search capabilities
 */
function Projects({ navigateToRoute, showProjectDetail, selectedProjectId }) {
  const { token } = theme.useToken()
  const { isMobile } = useResponsive()

  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [collapsedProjects, setCollapsedProjects] = useState({})
  const [showSprintReport, setShowSprintReport] = useState(false)
  const [selectedProjectForReport, setSelectedProjectForReport] = useState(null)
  const [viewMode, setViewMode] = useState('table') // 'table' or 'cards'
  const [cancellingProjectId, setCancellingProjectId] = useState(null)

  // Initialize collapsed state for all projects when they load
  useEffect(() => {
    if (projects.length > 0) {
      // Set all projects to collapsed by default (true = collapsed)
      const initialCollapsedState = {}
      projects.forEach(project => {
        initialCollapsedState[project.id || project.name] = true
      })
      setCollapsedProjects(initialCollapsedState)
    }
  }, [projects.length])

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects()
  }, [])

  const fetchProjects = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.projects.getProjects?.()

      if (response?.success && response?.data) {
        setProjects(response.data)
      } else {
        setError('Failed to fetch projects')
        setProjects([])
      }
    } catch (err) {
      console.error('Error fetching projects:', err)
      setError(err.message || 'An error occurred while fetching projects')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  // Filter projects based on search and status
  const filteredProjects = projects.filter(project => {
    const matchesSearch = !searchText ||
      (project.name && project.name.toLowerCase().includes(searchText.toLowerCase())) ||
      (project.project_name && project.project_name.toLowerCase().includes(searchText.toLowerCase()))

    const matchesStatus = filterStatus === 'all' ||
      (project.project_status && project.project_status.toLowerCase() === filterStatus.toLowerCase())

    return matchesSearch && matchesStatus
  })

  // Get unique project statuses for filter
  const statusOptions = [
    { label: 'All Statuses', value: 'all' },
    ...Array.from(new Set(projects.map(p => p.project_status || 'Unknown')))
      .map(status => ({ label: status, value: status.toLowerCase() }))
  ]

  const handleToggleCollapse = (projectId) => {
    setCollapsedProjects(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  const handleViewDetails = (project) => {
    if (navigateToRoute) {
      navigateToRoute('project-detail', project.id || project.name)
    }
  }

  const handleSprintReport = (project) => {
    setSelectedProjectForReport(project)
    setShowSprintReport(true)
  }

  const handleTaskTypeClick = (taskType) => {
    // Placeholder for task type filtering
    console.log('Filter by task type:', taskType)
  }

  const handleCreateProject = () => {
    if (navigateToRoute) {
      // Navigate to project creation form
      navigateToRoute('project-create')
    }
  }

  const handleEditProject = (projectId) => {
    if (navigateToRoute) {
      navigateToRoute('project-edit', projectId)
    }
  }

  const handleCancelProject = async (projectId) => {
    try {
      setCancellingProjectId(projectId)
      const response = await fetch(`/api/resource/Project/${projectId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify({
          status: 'Cancelled'
        })
      })

      if (response.ok) {
        message.success('Project cancelled successfully')
        fetchProjects() // Refresh the list
      } else {
        const error = await response.json()
        message.error(error.message || 'Failed to cancel project')
      }
    } catch (error) {
      console.error('[Projects] Error cancelling project:', error)
      message.error('An error occurred while cancelling the project')
    } finally {
      setCancellingProjectId(null)
    }
  }

  const handlePrintProject = (projectId) => {
    try {
      const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Project&name=${encodeURIComponent(projectId)}&format=Standard&no_letterhead=0`
      window.open(pdfUrl, '_blank')
      message.success('PDF download started')
    } catch (error) {
      console.error('[Projects] Error printing PDF:', error)
      message.error('Failed to download PDF')
    }
  }

  const formatDate = (dateString) => {
    if (!dateString) return '-'
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
  }

  const getStatusColor = (status) => {
    const statusLower = (status || '').toLowerCase()
    switch (statusLower) {
      case 'open': return 'blue'
      case 'working': return 'cyan'
      case 'completed': return 'green'
      case 'cancelled': return 'red'
      case 'on hold': return 'orange'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority) => {
    const priorityLower = (priority || '').toLowerCase()
    switch (priorityLower) {
      case 'urgent': return 'red'
      case 'high': return 'orange'
      case 'medium': return 'blue'
      case 'low': return 'green'
      default: return 'default'
    }
  }

  // Table columns configuration
  const tableColumns = [
    {
      title: <Text strong style={{ fontSize: '13px' }}>Project Name</Text>,
      dataIndex: 'project_name',
      key: 'project_name',
      fixed: 'left',
      width: 280,
      render: (text, record) => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', padding: '4px 0' }}>
          <Button
            type="link"
            onClick={() => handleViewDetails(record)}
            style={{
              padding: 0,
              height: 'auto',
              fontWeight: 600,
              fontSize: '15px',
              textAlign: 'left',
              color: token.colorPrimary,
              lineHeight: '1.4'
            }}
          >
            {text || record.name || 'Unnamed Project'}
          </Button>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            {record.client && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <TeamOutlined style={{ fontSize: '11px', color: token.colorTextTertiary }} />
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  {record.client}
                </Text>
              </div>
            )}
            {record.project_type && (
              <Tag
                style={{
                  fontSize: '10px',
                  padding: '1px 6px',
                  lineHeight: '18px',
                  margin: 0,
                  border: 'none',
                  backgroundColor: token.colorFillSecondary,
                  color: token.colorTextSecondary,
                  borderRadius: '4px'
                }}
              >
                {record.project_type}
              </Tag>
            )}
          </div>
        </div>
      ),
      sorter: (a, b) => (a.project_name || a.name || '').localeCompare(b.project_name || b.name || ''),
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Status</Text>,
      dataIndex: 'project_status',
      key: 'status',
      width: 120,
      align: 'center',
      render: (status) => (
        <Tag
          color={getStatusColor(status)}
          style={{
            margin: 0,
            fontWeight: 500,
            fontSize: '12px',
            padding: '3px 12px',
            borderRadius: '6px'
          }}
        >
          {status || 'Unknown'}
        </Tag>
      ),
      filters: Array.from(new Set(projects.map(p => p.project_status || 'Unknown')))
        .map(status => ({ text: status, value: status })),
      onFilter: (value, record) => (record.project_status || 'Unknown') === value,
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Priority</Text>,
      dataIndex: 'priority',
      key: 'priority',
      width: 110,
      align: 'center',
      render: (priority) => (
        <Tag
          color={getPriorityColor(priority)}
          style={{
            margin: 0,
            fontWeight: 500,
            fontSize: '12px',
            padding: '3px 12px',
            borderRadius: '6px'
          }}
        >
          {priority || 'Normal'}
        </Tag>
      ),
      filters: [
        { text: 'Urgent', value: 'Urgent' },
        { text: 'High', value: 'High' },
        { text: 'Medium', value: 'Medium' },
        { text: 'Low', value: 'Low' },
      ],
      onFilter: (value, record) => (record.priority || 'Normal') === value,
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Progress</Text>,
      dataIndex: 'progress',
      key: 'progress',
      width: 170,
      render: (progress) => {
        const progressValue = Math.min(100, Math.max(0, progress || 0))
        const getProgressColor = (value) => {
          if (value >= 75) return token.colorSuccess
          if (value >= 50) return token.colorInfo
          if (value >= 25) return token.colorWarning
          return token.colorError
        }
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '4px 0' }}>
            <Progress
              percent={progressValue}
              size="small"
              style={{ margin: 0, flex: 1, minWidth: '80px' }}
              status={progressValue === 100 ? 'success' : 'active'}
              strokeColor={getProgressColor(progressValue)}
              trailColor={token.colorBgLayout}
            />
            <Text strong style={{ fontSize: '13px', minWidth: '40px', color: getProgressColor(progressValue) }}>
              {progressValue}%
            </Text>
          </div>
        )
      },
      sorter: (a, b) => (a.progress || 0) - (b.progress || 0),
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Manager</Text>,
      dataIndex: 'project_manager',
      key: 'project_manager',
      width: 180,
      render: (manager) => (
        manager ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '4px 0' }}>
            <Avatar
              size={32}
              icon={<UserOutlined />}
              style={{
                backgroundColor: token.colorPrimary,
                fontSize: '14px'
              }}
            />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <Text style={{ fontSize: '13px', fontWeight: 500, lineHeight: '1.4' }}>
                {manager}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                Project Manager
              </Text>
            </div>
          </div>
        ) : (
          <Text type="secondary" style={{ fontSize: '12px' }}>Not assigned</Text>
        )
      ),
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Timeline</Text>,
      key: 'timeline',
      width: 260,
      render: (_, record) => {
        // Calculate number of days between start and end dates (total duration)
        const calculateDays = (startDate, endDate) => {
          if (!startDate || !endDate) return null
          const start = new Date(startDate)
          const end = new Date(endDate)
          const diffTime = Math.abs(end - start)
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays
        }

        // Calculate days remaining until end date
        const calculateDaysRemaining = (endDate) => {
          if (!endDate) return null
          const today = new Date()
          today.setHours(0, 0, 0, 0) // Reset to midnight for accurate day calculation
          const end = new Date(endDate)
          end.setHours(0, 0, 0, 0)
          const diffTime = end - today
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
          return diffDays
        }

        const totalDays = calculateDays(record.expected_start_date, record.expected_end_date)
        const daysRemaining = calculateDaysRemaining(record.expected_end_date)

        // Determine color and label for days remaining
        const getRemainingStyle = (days) => {
          if (days === null) return null
          if (days < 0) {
            // Overdue
            return {
              bg: token.colorErrorBg,
              border: token.colorErrorBorder,
              color: token.colorError,
              label: `${Math.abs(days)} ${Math.abs(days) === 1 ? 'day' : 'days'} overdue`
            }
          } else if (days === 0) {
            return {
              bg: token.colorWarningBg,
              border: token.colorWarningBorder,
              color: token.colorWarning,
              label: 'Due today'
            }
          } else if (days <= 7) {
            // Less than a week left
            return {
              bg: token.colorWarningBg,
              border: token.colorWarningBorder,
              color: token.colorWarning,
              label: `${days} ${days === 1 ? 'day' : 'days'} left`
            }
          } else {
            // More than a week left
            return {
              bg: token.colorSuccessBg,
              border: token.colorSuccessBorder,
              color: token.colorSuccess,
              label: `${days} ${days === 1 ? 'day' : 'days'} left`
            }
          }
        }

        const remainingStyle = getRemainingStyle(daysRemaining)

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', padding: '4px 0' }}>
            {record.expected_start_date && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                backgroundColor: token.colorFillQuaternary,
                borderRadius: '4px',
                border: `1px solid ${token.colorBorder}`
              }}>
                <CalendarOutlined style={{ fontSize: '10px', color: token.colorTextSecondary }} />
                <Text style={{ fontSize: '11px', color: token.colorTextSecondary }}>
                  {formatDate(record.expected_start_date)}
                </Text>
              </div>
            )}
            {record.expected_end_date && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '2px 8px',
                backgroundColor: token.colorFillQuaternary,
                borderRadius: '4px',
                border: `1px solid ${token.colorBorder}`
              }}>
                <CalendarOutlined style={{ fontSize: '10px', color: token.colorTextSecondary }} />
                <Text style={{ fontSize: '11px', color: token.colorTextSecondary }}>
                  {formatDate(record.expected_end_date)}
                </Text>
              </div>
            )}
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {totalDays !== null && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 6px',
                  backgroundColor: token.colorInfoBg,
                  borderRadius: '3px',
                  border: `1px solid ${token.colorInfoBorder}`
                }}>
                  <Text style={{ fontSize: '10px', color: token.colorInfo, fontWeight: 500 }}>
                    {totalDays}d
                  </Text>
                </div>
              )}
              {remainingStyle && (
                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 6px',
                  backgroundColor: remainingStyle.bg,
                  borderRadius: '3px',
                  border: `1px solid ${remainingStyle.border}`
                }}>
                  <Text style={{ fontSize: '10px', color: remainingStyle.color, fontWeight: 600 }}>
                    {remainingStyle.label}
                  </Text>
                </div>
              )}
            </div>
            {!record.expected_start_date && !record.expected_end_date && (
              <Text type="secondary" style={{ fontSize: '11px' }}>No timeline</Text>
            )}
          </div>
        )
      },
    },
    {
      title: <Text strong style={{ fontSize: '13px' }}>Actions</Text>,
      key: 'actions',
      fixed: 'right',
      width: 220,
      align: 'center',
      render: (_, record) => (
        <Space size="small" wrap>
          <Tooltip title="View Details">
            <Button
              type="text"
              size="middle"
              icon={<ProjectOutlined />}
              onClick={() => handleViewDetails(record)}
              style={{ color: token.colorPrimary }}
            />
          </Tooltip>
          <Tooltip title="Edit Project">
            <Button
              type="text"
              size="middle"
              icon={<EditOutlined />}
              onClick={() => handleEditProject(record.id || record.name)}
              style={{ color: token.colorInfo }}
            />
          </Tooltip>
          <Tooltip title="Sprint Report">
            <Button
              type="text"
              size="middle"
              icon={<BarChartOutlined />}
              onClick={() => handleSprintReport(record)}
              style={{ color: token.colorWarning }}
            />
          </Tooltip>
          <Tooltip title="Print PDF">
            <Button
              type="text"
              size="middle"
              icon={<PrinterOutlined />}
              onClick={() => handlePrintProject(record.id || record.name)}
              style={{ color: token.colorTextSecondary }}
            />
          </Tooltip>
          <Popconfirm
            title="Cancel Project"
            description="Are you sure you want to cancel this project?"
            onConfirm={() => handleCancelProject(record.id || record.name)}
            okText="Yes"
            cancelText="No"
            disabled={record.project_status === 'Cancelled'}
          >
            <Tooltip title={record.project_status === 'Cancelled' ? 'Already cancelled' : 'Cancel Project'}>
              <Button
                type="text"
                size="middle"
                danger
                icon={<CloseCircleOutlined />}
                disabled={record.project_status === 'Cancelled'}
                loading={cancellingProjectId === (record.id || record.name)}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  // Expandable row render
  const expandedRowRender = (record) => {
    return (
      <div style={{ padding: '16px', backgroundColor: token.colorBgLayout }}>
        <Descriptions bordered size="small" column={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
          <Descriptions.Item label="Project Type">
            {record.project_type || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Department">
            {record.department || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Current Phase">
            {record.current_phase || record.currentPhase || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Total Tasks">
            {record.task_count || record.total_tasks || 0}
          </Descriptions.Item>
          <Descriptions.Item label="Actual Start">
            {formatDate(record.actual_start_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Actual End">
            {formatDate(record.actual_end_date)}
          </Descriptions.Item>
          <Descriptions.Item label="Software Product" span={2}>
            {record.custom_software_product || '-'}
          </Descriptions.Item>
          {record.notes && (
            <Descriptions.Item label="Notes" span={4}>
              <div dangerouslySetInnerHTML={{ __html: record.notes }} style={{ maxHeight: '100px', overflow: 'auto' }} />
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ProjectOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Projects
              </Title>
              <Text type="secondary">Manage and view all your projects</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={fetchProjects}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateProject}
                size="large"
              >
                New Project
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: token.colorError, borderLeft: `4px solid ${token.colorError}` }}>
          <Text type="danger">{error}</Text>
          <Button type="primary" onClick={fetchProjects} style={{ marginLeft: '12px' }}>
            Retry
          </Button>
        </Card>
      )}

      {/* Filters */}
      <Card style={{ marginBottom: '16px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search projects..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              value={filterStatus}
              onChange={setFilterStatus}
              options={statusOptions}
              style={{ width: '100%' }}
              placeholder="Filter by status"
            />
          </Col>
          <Col xs={24} sm={24} md={8} style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                  label: 'Card View',
                  value: 'cards',
                  icon: <AppstoreOutlined />
                }
              ]}
            />
          </Col>
        </Row>
      </Card>

      {/* Projects Display */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '50px' }}>
          <Spin size="large" />
        </div>
      ) : filteredProjects.length === 0 ? (
        <Card>
          <Empty
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            description={searchText || filterStatus !== 'all' ? 'No projects match your filters' : 'No projects found'}
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
              Create Your First Project
            </Button>
          </Empty>
        </Card>
      ) : viewMode === 'table' ? (
        <Card bodyStyle={{ padding: 0 }}>
          <Table
            columns={tableColumns}
            dataSource={filteredProjects}
            rowKey={(record) => record.id || record.name}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total, range) => (
                <Text strong style={{ fontSize: '13px' }}>
                  {range[0]}-{range[1]} of {total} projects
                </Text>
              ),
              pageSizeOptions: ['10', '20', '50', '100'],
              style: { padding: '16px 24px' }
            }}
            expandable={{
              expandedRowRender,
              defaultExpandAllRows: false,
              expandRowByClick: false,
              expandIcon: ({ expanded, onExpand, record }) => (
                <Button
                  type="text"
                  size="small"
                  icon={expanded ? <DownOutlined /> : <RightOutlined />}
                  onClick={e => onExpand(record, e)}
                  style={{ marginRight: '8px' }}
                />
              )
            }}
            scroll={{ x: 1400 }}
            size="middle"
            bordered={false}
            rowClassName={(record, index) =>
              index % 2 === 0 ? 'table-row-light' : 'table-row-dark'
            }
            style={{
              '--table-row-hover-bg': token.colorPrimaryBg
            }}
          />
          <style>
            {`
              .table-row-light {
                background-color: ${token.colorBgContainer};
              }
              .table-row-dark {
                background-color: ${token.colorBgLayout};
              }
              .table-row-light:hover,
              .table-row-dark:hover {
                background-color: ${token.colorPrimaryBg} !important;
              }
              .ant-table-thead > tr > th {
                background-color: ${token.colorBgContainer} !important;
                font-weight: 600 !important;
                padding: 16px !important;
                border-bottom: 2px solid ${token.colorBorder} !important;
              }
              .ant-table-tbody > tr > td {
                padding: 12px 16px !important;
                border-bottom: 1px solid ${token.colorBorderSecondary} !important;
              }
              .ant-table-expanded-row > td {
                padding: 0 !important;
              }
            `}
          </style>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {filteredProjects.map(project => (
            <ProjectCard
              key={project.id || project.name}
              project={project}
              onViewDetails={handleViewDetails}
              onSprintReport={handleSprintReport}
              onTaskTypeClick={handleTaskTypeClick}
              isCollapsed={collapsedProjects[project.id || project.name]}
              onToggleCollapse={handleToggleCollapse}
              loading={false}
            />
          ))}
        </div>
      )}

      {/* Sprint Report Dialog */}
      {selectedProjectForReport && (
        <SprintReportDialog
          open={showSprintReport}
          onClose={() => {
            setShowSprintReport(false)
            setSelectedProjectForReport(null)
          }}
          projectId={selectedProjectForReport.id || selectedProjectForReport.name}
          projectName={selectedProjectForReport.project_name || selectedProjectForReport.name}
        />
      )}
    </div>
  )
}

export default Projects

