import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Spin,
  Empty,
  Statistic,
  Progress,
  Tag,
  Select,
  Space,
  Tabs,
  Table,
  Alert,
  Badge,
  Tooltip,
  theme,
  Drawer,
  Segmented
} from 'antd'
import {
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ReloadOutlined,
  FilterOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  CalendarOutlined,
  UnorderedListOutlined,
  BgColorsOutlined,
  RiseOutlined
} from '@ant-design/icons'
import zenhubService from '../services/api/zenhub'
import useNavigationStore from '../stores/navigationStore'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography
const { Option } = Select

const ZenhubDashboard = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const { setCurrentRoute } = useNavigationStore()

  // State management
  const [loading, setLoading] = useState(true)
  const [workspaceData, setWorkspaceData] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [viewMode, setViewMode] = useState('overview') // overview, projects, team, sprints
  const [refreshing, setRefreshing] = useState(false)
  const [filterDrawerOpen, setFilterDrawerOpen] = useState(false)
  const [workspaceId, setWorkspaceId] = useState(null)

  // Initialize workspace_id from frappe context or environment
  useEffect(() => {
    const initializeWorkspaceId = async () => {
      try {
        // Try to get workspace_id from multiple sources

        // 1. Check frappe context (if available)
        if (window.frappe && window.frappe.session && window.frappe.session.user) {
          console.log('[ZenhubDashboard] Checking Frappe context for workspace configuration...')
        }

        // 2. Try to fetch from API - get first project with workspace_id
        try {
          const response = await frappe.call({
            method: 'frappe.client.get_list',
            args: {
              doctype: 'Project',
              filters: {
                'custom_zenhub_workspace_id': ['!=', ''],
                'custom_zenhub_workspace_id': ['is', 'set']
              },
              fields: ['name', 'title', 'custom_zenhub_workspace_id'],
              limit_page_length: 1
            }
          })

          if (response && response.message && response.message.length > 0) {
            const firstProject = response.message[0]
            setWorkspaceId(firstProject.custom_zenhub_workspace_id)
            console.log('[ZenhubDashboard] Found workspace_id:', firstProject.custom_zenhub_workspace_id)
            return
          }
        } catch (apiError) {
          console.warn('[ZenhubDashboard] Could not fetch projects from API:', apiError)
        }

        // If no workspace_id found
        console.warn('[ZenhubDashboard] No projects with ZenHub workspace_id configured')
      } catch (err) {
        console.error('[ZenhubDashboard] Error initializing workspace_id:', err)
      }
    }

    initializeWorkspaceId()
    setCurrentRoute('zenhub-dashboard')
  }, [setCurrentRoute])

  // Load workspace data
  useEffect(() => {
    if (workspaceId) {
      loadDashboardData()
    }
  }, [workspaceId])

  // Reload when project selection changes
  useEffect(() => {
    if (workspaceId && selectedProject) {
      loadDashboardData()
    }
  }, [selectedProject, workspaceId])

  const loadDashboardData = async () => {
    try {
      setLoading(true)
      setError(null)

      // If no workspace_id set, try to get it from first project
      let currentWorkspaceId = workspaceId

      if (!currentWorkspaceId) {
        // Attempt to fetch from first available project
        console.warn('[ZenhubDashboard] No workspace_id provided. Please configure ZenHub workspace ID on your projects.')
        setError('No ZenHub workspace configured. Please add ZenHub Workspace ID to your projects.')
        setLoading(false)
        return
      }

      // Fetch workspace summary and team utilization in parallel
      const [workspace, team] = await Promise.all([
        zenhubService.getWorkspaceSummary(currentWorkspaceId),
        zenhubService.getTeamUtilization(currentWorkspaceId)
      ])

      // Response from axios interceptor strips the .message wrapper
      setWorkspaceData(workspace)
      setTeamData(team)

      // Auto-select first project if none selected
      if (!selectedProject && workspace?.projects?.length > 0) {
        setSelectedProject(workspace.projects[0].id)
      }
    } catch (err) {
      console.error('[ZenhubDashboard] Failed to load ZenHub data:', err)
      frappe.log_error({
        title: 'ZenHub Dashboard Error',
        message: `Failed to load ZenHub data: ${err?.message || JSON.stringify(err)}`,
        doc: null
      })
      setError(`Failed to load ZenHub dashboard data: ${err?.message || 'Unknown error'}`)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    if (!workspaceId) {
      setError('No ZenHub workspace configured.')
      return
    }

    setRefreshing(true)
    try {
      const [workspace, team] = await Promise.all([
        zenhubService.getWorkspaceSummary(workspaceId, true),
        zenhubService.getTeamUtilization(workspaceId, true)
      ])
      setWorkspaceData(workspace)
      setTeamData(team)
      setError(null)
    } catch (err) {
      console.error('[ZenhubDashboard] Failed to refresh data:', err)
      setError(`Failed to refresh data: ${err?.message || 'Unknown error'}`)
    } finally {
      setRefreshing(false)
    }
  }

  // Calculate metrics
  const calculateMetrics = () => {
    if (!workspaceData) return {}

    let totalIssues = 0
    let completedIssues = 0
    let totalStoryPoints = 0
    let completedStoryPoints = 0
    let activeProjects = 0

    workspaceData.projects?.forEach(project => {
      if (project.sprints?.length > 0) {
        activeProjects++
      }

      project.epics?.forEach(epic => {
        epic.sprints?.forEach(sprint => {
          sprint.tasks?.forEach(task => {
            totalIssues++
            totalStoryPoints += task.estimate || 0

            if (task.kanban_status_id === 'done' || task.status === 'CLOSED') {
              completedIssues++
              completedStoryPoints += task.estimate || 0
            }
          })
        })
      })
    })

    return {
      totalIssues,
      completedIssues,
      completionRate: totalIssues > 0 ? (completedIssues / totalIssues * 100).toFixed(1) : 0,
      totalStoryPoints,
      completedStoryPoints,
      pointsCompletionRate: totalStoryPoints > 0 ? (completedStoryPoints / totalStoryPoints * 100).toFixed(1) : 0,
      activeProjects
    }
  }

  const metrics = calculateMetrics()

  // Get project options for selector
  const projectOptions = workspaceData?.projects?.map(p => ({
    label: p.title || p.name,
    value: p.id
  })) || []

  // Filter data by selected project
  const getFilteredData = () => {
    if (!selectedProject || !workspaceData) return null
    return workspaceData.projects?.find(p => p.id === selectedProject)
  }

  const filteredProject = getFilteredData()

  // Render Overview Tab
  const renderOverview = () => (
    <div>
      {/* Key Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Total Issues"
              value={metrics.totalIssues}
              prefix={<FileTextOutlined style={{ color: token.colorPrimary }} />}
              valueStyle={{ color: token.colorText }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Completed"
              value={metrics.completedIssues}
              suffix={`/ ${metrics.totalIssues}`}
              prefix={<CheckCircleOutlined style={{ color: token.colorSuccess }} />}
              valueStyle={{ color: token.colorSuccess }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Completion Rate"
              value={metrics.completionRate}
              suffix="%"
              prefix={<RiseOutlined style={{ color: token.colorWarning }} />}
              valueStyle={{ color: token.colorWarning }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Statistic
              title="Active Projects"
              value={metrics.activeProjects}
              prefix={<BgColorsOutlined style={{ color: token.colorInfo }} />}
              valueStyle={{ color: token.colorInfo }}
            />
          </Card>
        </Col>
      </Row>

      {/* Story Points Progress */}
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', marginBottom: '24px' }}>
        <Title level={4} style={{ marginBottom: '16px' }}>
          Story Points Progress
        </Title>
        <Row gutter={[24, 24]}>
          <Col xs={24} lg={12}>
            <div>
              <Text style={{ display: 'block', marginBottom: '8px', color: token.colorTextSecondary }}>
                Completed: {metrics.completedStoryPoints} / {metrics.totalStoryPoints} points
              </Text>
              <Progress
                percent={metrics.pointsCompletionRate}
                strokeColor={token.colorSuccess}
                format={percent => `${percent.toFixed(0)}%`}
              />
            </div>
          </Col>
          <Col xs={24} lg={12}>
            <Text style={{ display: 'block', fontSize: '12px', color: token.colorTextTertiary }}>
              {metrics.totalStoryPoints > 0 ? (
                <>
                  {metrics.completedStoryPoints} points delivered • {metrics.totalStoryPoints - metrics.completedStoryPoints} remaining
                </>
              ) : (
                'No story points assigned'
              )}
            </Text>
          </Col>
        </Row>
      </Card>
    </div>
  )

  // Render Projects Tab
  const renderProjects = () => {
    const projectColumns = [
      {
        title: 'Project',
        dataIndex: 'title',
        key: 'title',
        render: (text) => <Text strong>{text}</Text>
      },
      {
        title: 'Sprints',
        dataIndex: 'sprints',
        key: 'sprints',
        render: (sprints) => sprints?.length || 0
      },
      {
        title: 'Tasks',
        key: 'tasks',
        render: (_, record) => {
          let taskCount = 0
          record.epics?.forEach(epic => {
            epic.sprints?.forEach(sprint => {
              taskCount += sprint.tasks?.length || 0
            })
          })
          return taskCount
        }
      },
      {
        title: 'Status',
        key: 'status',
        render: (_, record) => (
          <Badge status={record.sprints?.length > 0 ? 'success' : 'default'} text={record.sprints?.length > 0 ? 'Active' : 'Inactive'} />
        )
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <Table
          columns={projectColumns}
          dataSource={workspaceData?.projects || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
          onRow={(record) => ({
            onClick: () => setSelectedProject(record.id)
          })}
        />
      </Card>
    )
  }

  // Render Team Tab
  const renderTeam = () => {
    const teamColumns = [
      {
        title: 'Team Member',
        dataIndex: 'name',
        key: 'name',
        render: (text, record) => (
          <Space>
            <Text strong>{text}</Text>
            {record.role && <Tag>{record.role}</Tag>}
          </Space>
        )
      },
      {
        title: 'Tasks Assigned',
        dataIndex: 'task_count',
        key: 'task_count',
        render: (count) => <Text>{count || 0}</Text>
      },
      {
        title: 'Story Points',
        dataIndex: 'story_points',
        key: 'story_points',
        render: (points) => <Text strong>{points || 0}</Text>
      },
      {
        title: 'Utilization',
        key: 'utilization',
        render: (_, record) => {
          const utilization = record.utilization_percent || 0
          return (
            <Tooltip title={`${utilization}% utilized`}>
              <Progress type="circle" percent={utilization} width={40} strokeColor={utilization > 80 ? token.colorError : token.colorSuccess} />
            </Tooltip>
          )
        }
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <Table
          columns={teamColumns}
          dataSource={teamData?.team_members || []}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          loading={loading}
        />
      </Card>
    )
  }

  // Render Sprints Tab
  const renderSprints = () => {
    if (!filteredProject) {
      return <Empty description="Select a project to view sprints" />
    }

    const sprints = []
    filteredProject.epics?.forEach(epic => {
      epic.sprints?.forEach(sprint => {
        sprints.push({
          id: sprint.id,
          name: sprint.name,
          epic: epic.title,
          taskCount: sprint.tasks?.length || 0,
          completedCount: sprint.tasks?.filter(t => t.status === 'CLOSED')?.length || 0,
          storyPoints: sprint.tasks?.reduce((sum, t) => sum + (t.estimate || 0), 0) || 0
        })
      })
    })

    const sprintColumns = [
      {
        title: 'Sprint',
        dataIndex: 'name',
        key: 'name',
        render: (text) => <Text strong>{text}</Text>
      },
      {
        title: 'Epic',
        dataIndex: 'epic',
        key: 'epic'
      },
      {
        title: 'Progress',
        key: 'progress',
        render: (_, record) => {
          const progress = record.taskCount > 0 ? (record.completedCount / record.taskCount * 100).toFixed(0) : 0
          return (
            <Space size="small">
              <Progress
                type="circle"
                percent={progress}
                width={40}
                strokeColor={token.colorPrimary}
              />
              <Text>{record.completedCount}/{record.taskCount}</Text>
            </Space>
          )
        }
      },
      {
        title: 'Story Points',
        dataIndex: 'storyPoints',
        key: 'storyPoints',
        render: (points) => <Text strong>{points}</Text>
      }
    ]

    return (
      <Card bordered={false} style={{ borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
        <Table
          columns={sprintColumns}
          dataSource={sprints}
          rowKey="id"
          pagination={{ pageSize: 10 }}
        />
      </Card>
    )
  }

  if (loading && !workspaceData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" tip="Loading ZenHub Dashboard..." />
      </div>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header Banner */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '0',
          border: 'none',
          ...getHeaderBannerStyle(token)
        }}
        bodyStyle={{ padding: '24px' }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                onClick={() => navigateToRoute('projects')}
                style={{ paddingLeft: 0, color: token.colorPrimary }}
              >
                ← Back to Projects
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <BarChartOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '28px'
                }} />
                ZenHub Dashboard
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={handleRefresh}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<FilterOutlined />}
                onClick={() => setFilterDrawerOpen(true)}
              >
                Filters
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Error Alert */}
      {error && (
        <Alert
          message="Error"
          description={error}
          type="error"
          closable
          style={{ marginBottom: '24px' }}
        />
      )}

      {/* Content */}
      <div style={{ paddingLeft: '24px', paddingRight: '24px', paddingBottom: '24px' }}>
        {/* View Mode Selector */}
        <Card bordered={false} style={{ marginBottom: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
          <Space>
            <Text strong>View:</Text>
            <Segmented
              value={viewMode}
              onChange={setViewMode}
              options={[
                { label: 'Overview', value: 'overview', icon: <BarChartOutlined /> },
                { label: 'Projects', value: 'projects', icon: <BgColorsOutlined /> },
                { label: 'Team', value: 'team', icon: <TeamOutlined /> },
                { label: 'Sprints', value: 'sprints', icon: <CalendarOutlined /> }
              ]}
            />
          </Space>
        </Card>

        {/* Project Selector (for filtered views) */}
        {(viewMode === 'sprints' || viewMode === 'overview') && (
          <Card bordered={false} style={{ marginBottom: '24px', borderRadius: '12px', boxShadow: '0 1px 4px rgba(0,0,0,0.08)' }}>
            <Space>
              <Text strong>Project:</Text>
              <Select
                style={{ minWidth: '250px' }}
                placeholder="Select a project..."
                value={selectedProject}
                onChange={setSelectedProject}
                options={projectOptions}
              />
            </Space>
          </Card>
        )}

        {/* Tab Content */}
        {viewMode === 'overview' && renderOverview()}
        {viewMode === 'projects' && renderProjects()}
        {viewMode === 'team' && renderTeam()}
        {viewMode === 'sprints' && renderSprints()}
      </div>

      {/* Filters Drawer */}
      <Drawer
        title="Dashboard Filters"
        placement="right"
        onClose={() => setFilterDrawerOpen(false)}
        open={filterDrawerOpen}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <div>
            <Text strong>Project</Text>
            <Select
              style={{ width: '100%', marginTop: '8px' }}
              placeholder="Select project..."
              value={selectedProject}
              onChange={setSelectedProject}
              options={projectOptions}
            />
          </div>
        </Space>
      </Drawer>
    </div>
  )
}

export default ZenhubDashboard
