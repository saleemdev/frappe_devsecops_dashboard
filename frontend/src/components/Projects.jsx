import { useState, useEffect } from 'react'
import { Row, Col, Card, Spin, Empty, Button, Space, Typography, theme, Input, Select } from 'antd'
import { PlusOutlined, SearchOutlined, FilterOutlined, ProjectOutlined, ReloadOutlined } from '@ant-design/icons'
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
        <Row gutter={[16, 16]}>
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
        </Row>
      </Card>

      {/* Projects Grid */}
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

