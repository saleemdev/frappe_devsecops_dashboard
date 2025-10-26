import { useState, useEffect } from 'react'
import { Row, Col, Card, Spin, Empty, Button, Space, Typography, theme, Input, Select } from 'antd'
import { PlusOutlined, SearchOutlined, FilterOutlined } from '@ant-design/icons'
import ProjectCard from './ProjectCard'
import SprintReportDialog from './SprintReportDialog'
import api from '../services/api'
import { useResponsive } from '../hooks/useResponsive'

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
    <div style={{ padding: isMobile ? '16px' : '24px', backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <Title level={2} style={{ marginBottom: '8px', color: token.colorText }}>
          Projects
        </Title>
        <Text type="secondary">
          Manage and view all your projects
        </Text>
      </div>

      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: token.colorError, borderLeft: `4px solid ${token.colorError}` }}>
          <Text type="danger">{error}</Text>
          <Button type="primary" onClick={fetchProjects} style={{ marginLeft: '12px' }}>
            Retry
          </Button>
        </Card>
      )}

      {/* Toolbar */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction={isMobile ? 'vertical' : 'horizontal'} style={{ width: '100%' }} size="large">
          <Input
            placeholder="Search projects..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: isMobile ? '100%' : '300px' }}
          />
          <Select
            value={filterStatus}
            onChange={setFilterStatus}
            options={statusOptions}
            style={{ width: isMobile ? '100%' : '200px' }}
            prefix={<FilterOutlined />}
          />
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
            New Project
          </Button>
        </Space>
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

