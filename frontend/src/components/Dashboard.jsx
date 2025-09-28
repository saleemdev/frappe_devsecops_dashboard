import React, { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Progress,
  Tag,
  Typography,
  theme,
  Collapse,
  Steps,
  Modal,
  Upload,
  Input,
  Button,
  Space,
  Divider
} from 'antd'
import {
  ProjectOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BarChartOutlined,
  SafetyOutlined,
  DashboardOutlined,
  DownOutlined,
  UpOutlined,
  PaperClipOutlined,
  MessageOutlined,
  UploadOutlined,
  SendOutlined,
  SearchOutlined,
  ClearOutlined,
  FilterOutlined
} from '@ant-design/icons'
import { useResponsive, getResponsiveGrid } from '../hooks/useResponsive'
import { getDashboardData, getProjectDetails, getProjectsWithTasks } from '../utils/erpnextApiUtils'
import ProjectDetail from './ProjectDetail'

const { Title, Text } = Typography

// Mock data - ERPNext Project structure
const mockData = {
  success: true,
  metrics: {
    total_projects: 6,
    active_projects: 4,
    total_tasks: 187,
    completed_tasks: 134,
    average_completion: 71.7,
    team_capacity: 89,
    completion_rate: 71.7
  },
  projects: [
    {
      id: 'PROJ-001',
      name: 'ePrescription System',
      project_name: 'ePrescription System',
      project_status: 'Open',
      client: 'Ministry of Health',
      customer: 'Ministry of Health',
      project_type: 'Healthcare',
      priority: 'High',
      progress: 72,
      current_phase: 'Security Testing',
      task_count: 45,
      completed_tasks: 32,
      completion_rate: 71.1,
      delivery_phases: [
        { section_name: 'Planning', section_status: 'complete', section_progress: 100, section_order: 1, task_count: 8, completed_tasks: 8 },
        { section_name: 'Development', section_status: 'complete', section_progress: 100, section_order: 2, task_count: 15, completed_tasks: 15 },
        { section_name: 'Security Review', section_status: 'complete', section_progress: 100, section_order: 3, task_count: 6, completed_tasks: 6 },
        { section_name: 'Testing', section_status: 'in_progress', section_progress: 60, section_order: 4, task_count: 10, completed_tasks: 6 },
        { section_name: 'Security Testing', section_status: 'in_progress', section_progress: 25, section_order: 5, task_count: 4, completed_tasks: 1 },
        { section_name: 'Deployment', section_status: 'pending', section_progress: 0, section_order: 6, task_count: 2, completed_tasks: 0 }
      ]
    },
    {
      id: 'PROJ-002',
      name: 'Facility360 eLicensing',
      project_name: 'Facility360 eLicensing',
      project_status: 'Open',
      client: 'Kenya Medical Board',
      customer: 'Kenya Medical Board',
      project_type: 'Government',
      priority: 'Medium',
      progress: 56,
      current_phase: 'Development',
      task_count: 38,
      completed_tasks: 21,
      completion_rate: 55.3,
      delivery_phases: [
        { section_name: 'Planning', section_status: 'complete', section_progress: 100, section_order: 1, task_count: 6, completed_tasks: 6 },
        { section_name: 'Requirements Analysis', section_status: 'complete', section_progress: 100, section_order: 2, task_count: 8, completed_tasks: 8 },
        { section_name: 'Design', section_status: 'complete', section_progress: 100, section_order: 3, task_count: 5, completed_tasks: 5 },
        { section_name: 'Development', section_status: 'in_progress', section_progress: 45, section_order: 4, task_count: 12, completed_tasks: 5 },
        { section_name: 'Security Review', section_status: 'pending', section_progress: 0, section_order: 5, task_count: 4, completed_tasks: 0 },
        { section_name: 'Testing', section_status: 'pending', section_progress: 0, section_order: 6, task_count: 3, completed_tasks: 0 }
      ]
    }
  ],
  teamUtilization: {
    average: 89,
    members: 10,
    overCapacity: 2,
    individuals: [
      { name: 'Grace Wanjiku', utilization: 92 },
      { name: 'James Mwangi', utilization: 88 },
      { name: 'Amina Kiptoo', utilization: 84 },
      { name: 'Peter Otieno', utilization: 81 },
      { name: 'Samuel Kipchoge', utilization: 77 },
      { name: 'Faith Achieng', utilization: 74 }
    ]
  },
  deliveryLifecycle: [
    'Business Development',
    'Product Design Documentation',
    'Secure Architecture',
    'Secure Design',
    'ATB (Authority to Begin)',
    'Environment Setup',
    'Development Planning',
    'Secure Development',
    'QA',
    'ATO (Authority to Operate)',
    'Deployment',
    'Operations & Support'
  ]
}



function Dashboard({ navigateToRoute, showProjectDetail, selectedProjectId }) {
  const { token } = theme.useToken()
  const { isMobile, currentBreakpoint } = useResponsive()
  const gridConfig = getResponsiveGrid(currentBreakpoint)

  // API data state
  const [dashboardData, setDashboardData] = useState(mockData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projectDetailsCache, setProjectDetailsCache] = useState({})

  // State management for enhanced features - Initialize all projects as collapsed
  const [projectCollapsed, setProjectCollapsed] = useState({})
  const [sprintModalVisible, setSprintModalVisible] = useState(false)
  const [selectedStep, setSelectedStep] = useState(null)
  const [projectComments, setProjectComments] = useState({})
  const [projectFiles, setProjectFiles] = useState({})

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProjects, setFilteredProjects] = useState([])

  // Search/Filter functionality
  const filterProjects = (projects, query) => {
    if (!query.trim()) {
      return projects
    }

    const searchTerm = query.toLowerCase().trim()

    return projects.filter(project => {
      // Search in project name
      const projectName = (project.name || project.project_name || '').toLowerCase()

      // Search in client name
      const clientName = (project.client || project.company_name || '').toLowerCase()

      // Search in current phase
      const currentPhase = (project.current_phase || project.currentPhase || '').toLowerCase()

      // Search in status
      const status = (project.status || '').toLowerCase()

      return projectName.includes(searchTerm) ||
             clientName.includes(searchTerm) ||
             currentPhase.includes(searchTerm) ||
             status.includes(searchTerm)
    })
  }

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)

    const projects = dashboardData?.projects || []
    const filtered = filterProjects(projects, query)
    setFilteredProjects(filtered)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setFilteredProjects(dashboardData?.projects || [])
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search projects"]')
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Escape to clear search
      if (event.key === 'Escape' && searchQuery) {
        clearSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  // Handle sprint report button click
  const handleStepClick = (project, stepIndex) => {
    setSelectedStep({
      name: project.name || 'Project Sprint Report',
      status: project.project_status || project.status || 'active',
      index: stepIndex,
      task_count: project.total_tasks || 0,
      completed_tasks: project.completed_tasks || 0,
      progress: project.progress || 0,
      totalSteps: project.delivery_phases?.length || 8
    })
    setSprintModalVisible(true)
  }

  // Handle file upload for specific project
  const handleUpload = (projectId, info) => {
    setProjectFiles(prev => ({
      ...prev,
      [projectId]: info.fileList
    }))
  }

  // Handle comment submission for specific project
  const handleCommentSubmit = (projectId) => {
    const comment = projectComments[projectId]
    if (comment?.trim()) {
      console.log('Comment submitted for project', projectId, ':', comment)
      setProjectComments(prev => ({
        ...prev,
        [projectId]: ''
      }))
      // Here you would typically send the comment to an API
    }
  }

  // Toggle project collapse state
  const toggleProjectCollapse = (projectId) => {
    setProjectCollapsed(prev => ({
      ...prev,
      [projectId]: !prev[projectId]
    }))
  }

  // Initialize project collapsed state when data changes
  const initializeProjectCollapsedState = (projects) => {
    const initialState = {}
    projects.forEach(project => {
      initialState[project.id] = true // true means collapsed
    })
    setProjectCollapsed(initialState)
  }

  // Fetch dashboard data on component mount
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use the new ERPNext-integrated API
        const response = await getDashboardData()

        if (response.success) {
          // Transform ERPNext data to dashboard format
          const metrics = response.metrics || {}
          const transformedData = {
            success: true,
            metrics: {
              activeProjects: metrics.active_projects || metrics.total_projects || 0,
              totalTasks: metrics.total_tasks || 0,
              completedTasks: metrics.completed_tasks || 0,
              teamCapacity: metrics.team_capacity || 85,
              completionRate: metrics.completion_rate || metrics.average_completion || 0,
              // Additional ERPNext metrics
              totalProjects: metrics.total_projects || 0,
              averageCompletion: metrics.average_completion || 0
            },
            projects: response.projects || [],
            lifecycle_phases: response.lifecycle_phases || [],
            teamUtilization: {
              average: metrics.team_capacity || 85,
              members: 12, // This would come from actual team data in ERPNext
              overCapacity: Math.max(0, Math.ceil((metrics.team_capacity || 85) - 80) / 10),
              individuals: [
                { name: 'John Doe', utilization: 95 },
                { name: 'Jane Smith', utilization: 87 },
                { name: 'Mike Johnson', utilization: 103 },
                { name: 'Sarah Wilson', utilization: 78 }
              ]
            },
            // Use ERPNext Task Types as delivery lifecycle, fallback to default
            deliveryLifecycle: (response.lifecycle_phases || []).map(phase => phase.name).length > 0
              ? (response.lifecycle_phases || []).map(phase => phase.name)
              : [
                  'Planning',
                  'Requirements Analysis',
                  'Design',
                  'Development',
                  'Security Review',
                  'Testing',
                  'Security Testing',
                  'Deployment',
                  'Monitoring'
                ],
            timestamp: response.timestamp
          }
          setDashboardData(transformedData)
        } else {
          throw new Error(response.error || 'Failed to fetch projects data')
        }

        // Initialize collapsed state for projects
        if (response.projects && Array.isArray(response.projects)) {
          initializeProjectCollapsedState(response.projects)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
        setError(err.message)

        // Fallback to old API
        try {
          const fallbackData = await getDashboardData()
          setDashboardData(fallbackData)
          if (fallbackData.projects) {
            initializeProjectCollapsedState(fallbackData.projects)
          }
        } catch (fallbackErr) {
          console.error('Fallback API also failed:', fallbackErr)
          // Keep using mock data as final fallback
        }
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  // Update filtered projects when dashboard data changes
  useEffect(() => {
    const projects = dashboardData?.projects || []
    const filtered = filterProjects(projects, searchQuery)
    setFilteredProjects(filtered)
  }, [dashboardData, searchQuery])

  // If project detail is requested, show it instead of the dashboard
  if (showProjectDetail && selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        navigateToRoute={navigateToRoute}
      />
    )
  }

  return (
    <div data-testid="dashboard-container" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: token.colorBgLayout
    }}>
      {/* Fixed Header Section - Metrics Cards */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: token.colorBgLayout,
        padding: isMobile ? '12px' : '16px',
        paddingBottom: isMobile ? '8px' : '12px',
        borderBottom: `1px solid ${token.colorBorder}`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
      }}>
        <Row gutter={gridConfig.gutter}>
          {/* Metrics Cards */}
          <Col xs={24} sm={12} lg={8}>
            <Card className="metric-card">
              <div className="mobile-stack" style={{ justifyContent: 'center', marginBottom: isMobile ? 8 : 16 }}>
                <ProjectOutlined style={{ fontSize: isMobile ? 24 : 28, color: token.colorPrimary }} />
                <div className="mobile-center">
                  <div className="metric-value">{loading ? '...' : (dashboardData?.metrics?.activeProjects || 0)}</div>
                  <div className="metric-label">Active Projects</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card className="metric-card">
              <div className="mobile-stack" style={{ justifyContent: 'center', marginBottom: isMobile ? 8 : 16 }}>
                <CheckCircleOutlined style={{ fontSize: isMobile ? 24 : 28, color: token.colorPrimary }} />
                <div className="mobile-center">
                  <div className="metric-value">{loading ? '...' : (dashboardData?.metrics?.totalTasks || 0)}</div>
                  <div className="metric-label">Total Tasks</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={24} lg={8}>
            <Card className="metric-card">
              <div className="mobile-stack" style={{ justifyContent: 'center', marginBottom: isMobile ? 8 : 16 }}>
                <TeamOutlined style={{ fontSize: isMobile ? 24 : 28, color: token.colorPrimary }} />
                <div className="mobile-center">
                  <div className="metric-value">{loading ? '...' : (dashboardData?.metrics?.teamCapacity || 0)}%</div>
                  <div className="metric-label">Team Capacity</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Left Section - Projects (Scrollable) */}
        <div style={{
          flex: isMobile ? '1' : '0 0 65%',
          padding: isMobile ? '12px' : '16px',
          paddingTop: isMobile ? '8px' : '12px',
          overflowY: 'auto',
          height: '100%'
        }}>
          {/* Search/Filter Section */}
          <div data-testid="search-container" className="search-container" style={{
            backgroundColor: token.colorBgLayout,
            borderBottomColor: token.colorBorderSecondary
          }}>
            <Input.Search
              data-testid="search-input"
              placeholder={isMobile ? "Search projects..." : "Search projects by name, client, phase, or status... (Ctrl+K)"}
              value={searchQuery}
              onChange={handleSearchChange}
              onSearch={handleSearchChange}
              allowClear
              size={isMobile ? 'middle' : 'large'}
              aria-label="Search projects"
              style={{
                marginBottom: 8,
                borderRadius: token.borderRadius,
                boxShadow: `0 2px 8px ${token.colorFillSecondary}`,
                border: `1px solid ${token.colorBorder}`,
                backgroundColor: token.colorBgContainer
              }}
              prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
              enterButton={
                <Button
                  type="primary"
                  style={{
                    backgroundColor: token.colorPrimary,
                    borderColor: token.colorPrimary,
                    color: token.colorWhite
                  }}
                >
                  Search
                </Button>
              }
            />

            {/* Results Counter */}
            <div data-testid="search-results-counter" className="search-results-counter" role="status" aria-live="polite" style={{
              color: token.colorTextSecondary
            }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {searchQuery ? (
                  <>
                    <FilterOutlined style={{ marginRight: 4 }} />
                    Showing {filteredProjects.length} of {(dashboardData?.projects || []).length} projects
                  </>
                ) : (
                  <>
                    <ProjectOutlined style={{ marginRight: 4 }} />
                    {(dashboardData?.projects || []).length} total projects
                  </>
                )}
              </Text>

              {searchQuery && (
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={clearSearch}
                  style={{ fontSize: '12px' }}
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div data-testid="projects-grid" style={{ marginBottom: 16 }}>
            {loading ? (
              <Card className="project-card" style={{ marginBottom: 16 }}>
                <div data-testid="loading-spinner" style={{ textAlign: 'center', padding: '20px' }}>
                  <Text type="secondary">Loading projects...</Text>
                </div>
              </Card>
            ) : error ? (
              <Card className="project-card" style={{ marginBottom: 16 }}>
                <div data-testid="error-message" role="alert" style={{ textAlign: 'center', padding: '20px' }}>
                  <Text type="danger">Error loading projects: {typeof error === 'string' ? error : error?.message || 'Unknown error occurred'}</Text>
                </div>
              </Card>
            ) : filteredProjects.length === 0 && searchQuery ? (
              <Card className="project-card" style={{ marginBottom: 16 }}>
                <div data-testid="no-projects-message" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <SearchOutlined style={{ fontSize: 48, color: token.colorTextSecondary, marginBottom: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                      No projects found
                    </Text>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Try adjusting your search criteria or{' '}
                      <Button type="link" size="small" onClick={clearSearch} style={{ padding: 0, height: 'auto' }}>
                        clear the search
                      </Button>
                    </Text>
                  </div>
                </div>
              </Card>
            ) : (filteredProjects.length > 0 ? filteredProjects : (dashboardData?.projects || [])).map(project => (
              <Card key={project.id} data-testid={`project-card-${project.name}`} className="project-card" style={{ marginBottom: 16 }}>
                <Collapse
                  ghost
                  size="small"
                  activeKey={projectCollapsed[project.id] ? [] : ['details']}
                  onChange={() => toggleProjectCollapse(project.id)}
                  expandIcon={({ isActive }) => isActive ? <UpOutlined /> : <DownOutlined />}
                  items={[
                    {
                      key: 'details',
                      label: (
                        <div>
                          {/* Project Header - Always Visible */}
                          <div style={{ marginBottom: 16 }}>
                            <div className="project-status">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <SafetyOutlined style={{ color: token.colorPrimary }} />
                                <Title level={5} data-testid="project-name" style={{ margin: 0, fontSize: '16px' }}>{String(project.name || 'Unnamed Project')}</Title>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Button
                                  data-testid="view-details-button"
                                  size="small"
                                  type="primary"
                                  icon={<ProjectOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigateToRoute && navigateToRoute('project-detail', project.id || project.name)
                                  }}
                                  style={{ fontSize: '12px' }}
                                >
                                  View Details
                                </Button>
                                <Button
                                  data-testid="sprint-report-button"
                                  size="small"
                                  type="text"
                                  icon={<DashboardOutlined />}
                                  onClick={() => handleStepClick(project, 0)}
                                  style={{ fontSize: '12px' }}
                                >
                                  Sprint Report
                                </Button>
                                <Tag data-testid="project-status" color="green" icon={<CheckCircleOutlined />}>{String(project.project_status || project.status || 'Unknown')}</Tag>
                              </div>
                            </div>
                            <Text data-testid="project-client" type="secondary" style={{ fontSize: '13px' }}>{String(project.client || 'No Client')}</Text>
                          </div>

                          {/* Progress Bar - Always Visible */}
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                              Overall Progress (<span data-testid="completion-rate">{project.progress}%</span>)
                            </Text>
                            <Progress
                              percent={project.progress}
                              showInfo={false}
                              strokeColor={token.colorPrimary}
                              trailColor={token.colorBgContainer}
                              size="small"
                            />
                          </div>

                          {/* Task Count - Always Visible */}
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Tasks: <span data-testid="task-count">{project.task_count || project.total_tasks || 0}</span>
                            </Text>
                          </div>

                          {/* Current Phase - Always Visible */}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Current Phase: <Text strong style={{ color: token.colorPrimary }}>{String(project.current_phase || project.currentPhase || 'Planning')}</Text>
                          </Text>
                        </div>
                      ),
                      children: (
                        <div style={{ marginTop: 16 }}>
                          {/* Delivery Lifecycle Steps */}
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <DashboardOutlined style={{ color: token.colorPrimary }} />
                              <Text strong style={{ fontSize: '14px' }}>Delivery Lifecycle Progress</Text>
                            </div>
                            <Steps
                              data-testid="delivery-phases"
                              direction="vertical"
                              size="small"
                              current={(project.delivery_phases || project.deliveryPhases || []).findIndex(phase => (phase.section_status || phase.status) === 'in_progress') || 0}
                              style={{ fontSize: '10px' }}
                              items={(project.delivery_phases || project.deliveryPhases || (dashboardData?.deliveryLifecycle || []).map(step => ({ name: step, status: 'pending', task_count: 0, completed_tasks: 0, progress: 0 }))).map((phase) => {
                                const phaseStatus = phase.section_status || phase.status
                                const phaseProgress = phase.section_progress || phase.progress
                                const phaseName = phase.section_name || phase.name
                                const isCompleted = phaseStatus === 'complete'
                                const isActive = phaseStatus === 'in_progress'

                                return {
                                  title: (
                                    <div data-testid={`phase-${phaseName}`} className={phaseStatus}>
                                      <span
                                        style={{
                                          fontSize: '11px',
                                          color: isActive ? token.colorPrimary : isCompleted ? token.colorSuccess : token.colorTextTertiary,
                                          fontWeight: isActive ? 'bold' : 'normal'
                                        }}
                                      >
                                        {String(phaseName || 'Unknown Phase')}
                                      </span>
                                      {phase.task_count > 0 && (
                                        <div style={{ fontSize: '9px', color: token.colorTextTertiary, marginTop: '2px' }}>
                                          {phase.completed_tasks}/{phase.task_count} tasks ({Math.round(phaseProgress)}%)
                                        </div>
                                      )}
                                    </div>
                                  ),
                                  status: isCompleted ? 'finish' : isActive ? 'process' : 'wait',
                                  icon: isCompleted ? <CheckCircleOutlined style={{ color: token.colorSuccess }} /> :
                                        isActive ? <ClockCircleOutlined style={{ color: token.colorPrimary }} /> :
                                        <ClockCircleOutlined style={{ color: token.colorTextSecondary }} />
                                }
                              })}
                            />
                          </div>

                          <Divider style={{ margin: '16px 0' }} />

                          {/* Attachments Section */}
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <PaperClipOutlined style={{ color: token.colorPrimary }} />
                              <Text strong style={{ fontSize: '12px' }}>Attachments</Text>
                            </div>
                            <Upload
                              fileList={projectFiles[project.id] || []}
                              onChange={(info) => handleUpload(project.id, info)}
                              beforeUpload={() => false} // Prevent auto upload
                              multiple
                            >
                              <Button size="small" icon={<UploadOutlined />}>
                                Upload Files
                              </Button>
                            </Upload>
                          </div>

                          {/* Comments Section */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <MessageOutlined style={{ color: token.colorPrimary }} />
                              <Text strong style={{ fontSize: '12px' }}>Comments</Text>
                            </div>
                            <Space.Compact style={{ width: '100%' }}>
                              <Input.TextArea
                                value={projectComments[project.id] || ''}
                                onChange={(e) => setProjectComments(prev => ({
                                  ...prev,
                                  [project.id]: e.target.value
                                }))}
                                placeholder="Add a comment..."
                                rows={2}
                                style={{ fontSize: '11px' }}
                              />
                              <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={() => handleCommentSubmit(project.id)}
                                disabled={!projectComments[project.id]?.trim()}
                                size="small"
                              >
                                Send
                              </Button>
                            </Space.Compact>
                          </div>
                        </div>
                      )
                    }
                  ]}
                />
              </Card>
            ))}
          </div>
        </div>

        {/* Right Section - Sidebar (Scrollable) */}
        {!isMobile && (
          <div style={{
            flex: '0 0 35%',
            padding: '16px',
            paddingTop: '12px',
            paddingLeft: '8px',
            overflowY: 'auto',
            height: '100%',
            borderLeft: `1px solid ${token.colorBorder}`
          }}>
          {/* Team Utilization */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <TeamOutlined style={{ color: token.colorPrimary }} />
                <span style={{ fontSize: '16px' }}>Team Utilization</span>
              </div>
            }
            style={{ marginBottom: 16 }}
            size="small"
          >
            <div style={{ marginBottom: 16 }}>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: '13px' }}>
                  <BarChartOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                  Average Utilization:
                </Text>
                <Text strong style={{ fontSize: '13px' }}>{loading ? '...' : (dashboardData?.teamUtilization?.average || 0)}%</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: '13px' }}>
                  <UserOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                  Team Members:
                </Text>
                <Text strong style={{ fontSize: '13px' }}>{loading ? '...' : (dashboardData?.teamUtilization?.members || 0)}</Text>
              </Row>
              <Row justify="space-between" style={{ marginBottom: 8 }}>
                <Text style={{ fontSize: '13px' }}>
                  <ClockCircleOutlined style={{ marginRight: 6, color: token.colorWarning }} />
                  Over Capacity:
                </Text>
                <Text strong style={{ fontSize: '13px' }}>{loading ? '...' : (dashboardData?.teamUtilization?.overCapacity || 0)}</Text>
              </Row>
            </div>

            <div>
              {loading ? (
                <Text type="secondary" style={{ fontSize: '12px' }}>Loading team data...</Text>
              ) : (dashboardData?.teamUtilization?.individuals || []).map(member => (
                <div key={member.name} style={{ marginBottom: 10 }}>
                  <Row justify="space-between" style={{ marginBottom: 4 }}>
                    <Text style={{ fontSize: 11 }}>{member.name}</Text>
                    <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{member.utilization}%</Text>
                  </Row>
                  <div className="utilization-bar">
                    <div
                      className="utilization-fill"
                      style={{ width: `${member.utilization}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </Card>
          </div>
        )}

        {/* Mobile Sidebar - Show below projects on mobile */}
        {isMobile && (
          <div style={{
            padding: '12px',
            paddingTop: '8px'
          }}>
            {/* Team Utilization */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <TeamOutlined style={{ color: token.colorPrimary }} />
                  <span style={{ fontSize: '16px' }}>Team Utilization</span>
                </div>
              }
              style={{ marginBottom: 16 }}
              size="small"
            >
              <div style={{ marginBottom: 16 }}>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: '13px' }}>
                    <BarChartOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                    Average Utilization:
                  </Text>
                  <Text strong style={{ fontSize: '13px' }}>{loading ? '...' : (dashboardData?.teamUtilization?.average || 0)}%</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: '13px' }}>
                    <UserOutlined style={{ marginRight: 6, color: token.colorPrimary }} />
                    Team Members:
                  </Text>
                  <Text strong style={{ fontSize: '13px' }}>{loading ? '...' : (dashboardData?.teamUtilization?.members || 0)}</Text>
                </Row>
                <Row justify="space-between" style={{ marginBottom: 8 }}>
                  <Text style={{ fontSize: '13px' }}>
                    <ClockCircleOutlined style={{ marginRight: 6, color: token.colorWarning }} />
                    Over Capacity:
                  </Text>
                  <Text strong style={{ fontSize: '13px' }}>{loading ? '...' : (dashboardData?.teamUtilization?.overCapacity || 0)}</Text>
                </Row>
              </div>

              <div>
                {loading ? (
                  <Text type="secondary" style={{ fontSize: '12px' }}>Loading team data...</Text>
                ) : (dashboardData?.teamUtilization?.individuals || []).map(member => (
                  <div key={member.name} style={{ marginBottom: 10 }}>
                    <Row justify="space-between" style={{ marginBottom: 4 }}>
                      <Text style={{ fontSize: 11 }}>{member.name}</Text>
                      <Text style={{ fontSize: 11, fontWeight: 'bold' }}>{member.utilization}%</Text>
                    </Row>
                    <Progress
                      percent={member.utilization}
                      size="small"
                      strokeColor={member.utilization > 100 ? token.colorError : token.colorSuccess}
                      showInfo={false}
                    />
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Sprint Report Modal */}
      <Modal
        data-testid="sprint-report-modal"
        title={
          <div data-testid="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DashboardOutlined style={{ color: token.colorPrimary }} />
            <span>Sprint Report - {selectedStep?.name}</span>
          </div>
        }
        open={sprintModalVisible}
        onCancel={() => setSprintModalVisible(false)}
        width={isMobile ? '95%' : 800}
        footer={[
          <Button key="close" onClick={() => setSprintModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Project Name: </Text>
            <Text data-testid="modal-project-name">{selectedStep?.name}</Text>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>Project Status: </Text>
            <Tag data-testid="modal-project-status" color={
              selectedStep?.status === 'completed' ? 'success' :
              selectedStep?.status === 'active' ? 'processing' :
              'default'
            }>
              {selectedStep?.status?.toUpperCase() || 'INFO'}
            </Tag>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>Step Number: </Text>
            <Text>{(selectedStep?.index || 0) + 1} of {selectedStep?.totalSteps || (dashboardData?.deliveryLifecycle?.length || 8)}</Text>
          </div>

          {selectedStep?.task_count > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Tasks: </Text>
              <Text data-testid="modal-task-count">{selectedStep.completed_tasks}/{selectedStep.task_count} completed (<span data-testid="modal-completion-rate">{Math.round(selectedStep.progress)}%</span>)</Text>
              <Progress
                percent={selectedStep.progress}
                size="small"
                style={{ marginTop: 8 }}
                strokeColor={selectedStep.progress === 100 ? token.colorSuccess : token.colorPrimary}
              />
            </div>
          )}

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <Title level={5}>Sprint Report Details</Title>
            <Text type="secondary">
              This is a placeholder for the sprint report content. In a real implementation,
              this would show detailed information about the current step including:
            </Text>
          </div>

          <div style={{ marginLeft: 16 }}>
            <ul style={{ color: token.colorTextSecondary, fontSize: '14px' }}>
              <li>Task completion status</li>
              <li>Team member assignments</li>
              <li>Timeline and milestones</li>
              <li>Blockers and dependencies</li>
              <li>Quality metrics and KPIs</li>
              <li>Security compliance status</li>
              <li>Documentation and deliverables</li>
            </ul>
          </div>

          <div style={{ marginTop: 24, padding: 16, backgroundColor: token.colorFillTertiary, borderRadius: 6 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Next Steps:</Text>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Future implementation will integrate with project management APIs to display
              real-time sprint data, task progress, and team performance metrics.
            </Text>
          </div>
        </div>
      </Modal>
    </div>
  )
}

export default Dashboard
