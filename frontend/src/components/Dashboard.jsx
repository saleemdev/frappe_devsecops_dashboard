import { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Progress,
  Tag,
  Typography,
  theme,
  Button,
  Space,
  Divider,
  Spin,
  List,
  Empty
} from 'antd'
import {
  ProjectOutlined,
  AlertOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  BugOutlined
} from '@ant-design/icons'

import { useResponsive } from '../hooks/useResponsive'
import api from '../services/api'

const { Title, Text } = Typography

// Default empty metrics
const defaultMetrics = {
  projects: { active: 0, total: 0, trend: 0 },
  incidents: { open: 0, critical: 0, trend: 0 },
  changeRequests: { pending: 0, total: 0, trend: 0 },
  tasks: { total: 0, open: 0, trend: 0 }
}



function Dashboard({ navigateToRoute }) {
  const { token } = theme.useToken()
  const { isMobile } = useResponsive()

  // Metrics state
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Recent items state
  const [recentIncidents, setRecentIncidents] = useState([])
  const [recentChangeRequests, setRecentChangeRequests] = useState([])

  // Task distribution state
  const [taskDistribution, setTaskDistribution] = useState({})

  // Fetch dashboard metrics on mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch all metrics in parallel
        const [projectsRes, incidentsRes, crRes] = await Promise.all([
          api.projects.getProjects?.() || Promise.resolve({ success: true, data: [] }),
          api.incidents.getIncidents?.() || Promise.resolve({ success: true, data: [] }),
          api.changeRequests.getChangeRequests?.() || Promise.resolve({ success: true, data: [] })
        ])

        // DEBUG: Log API responses
        console.log('🔍 Dashboard API Response:', {
          projectsRes,
          incidentsRes,
          crRes
        })
        console.log('📊 Projects Data:', projectsRes?.data)
        if (projectsRes?.data && projectsRes.data.length > 0) {
          console.log('📋 First Project:', projectsRes.data[0])
          console.log('📝 First Project Tasks:', projectsRes.data[0]?.tasks)
        }

        // Process projects
        const projects = projectsRes?.data || []
        const activeProjects = projects.filter(p => (p.status || '').toLowerCase() === 'active').length
        const totalProjects = projects.length

        // Process incidents
        const incidents = incidentsRes?.data || []
        const openIncidents = incidents.filter(i => (i.status || '').toLowerCase() !== 'closed').length
        const criticalIncidents = incidents.filter(i => (i.severity || '').toLowerCase() === 'critical').length

        // Process change requests
        const changeRequests = crRes?.data || []
        const pendingCR = changeRequests.filter(cr => (cr.approval_status || '').toLowerCase() === 'pending').length
        const totalCR = changeRequests.length

        // Calculate tasks overview from projects
        // Aggregate tasks from all projects (if available in project data)
        let totalTasks = 0
        let openTasks = 0
        const taskTypeDistribution = {}

        console.log('🔄 Processing projects for task aggregation:', projects.length, 'projects')

        projects.forEach((project, idx) => {
          console.log(`📌 Project ${idx}:`, {
            name: project.name,
            hasTasks: !!project.tasks,
            tasksIsArray: Array.isArray(project.tasks),
            tasksLength: project.tasks?.length || 0,
            tasks: project.tasks
          })

          if (project.tasks && Array.isArray(project.tasks)) {
            totalTasks += project.tasks.length
            const openCount = project.tasks.filter(t => (t.status || '').toLowerCase() !== 'completed').length
            openTasks += openCount

            console.log(`  ✓ Project ${project.name}: ${project.tasks.length} total, ${openCount} open`)

            // Aggregate task types
            project.tasks.forEach(task => {
              const taskType = task.task_type || 'Untyped'
              taskTypeDistribution[taskType] = (taskTypeDistribution[taskType] || 0) + 1
              console.log(`    - Task: ${task.name}, Type: ${taskType}, Status: ${task.status}`)
            })
          }
        })

        console.log('📊 Task Aggregation Results:', {
          totalTasks,
          openTasks,
          taskTypeDistribution
        })

        setMetrics({
          projects: { active: activeProjects, total: totalProjects, trend: 0 },
          incidents: { open: openIncidents, critical: criticalIncidents, trend: 0 },
          changeRequests: { pending: pendingCR, total: totalCR, trend: 0 },
          tasks: { total: totalTasks, open: openTasks, trend: 0 }
        })

        // Set task distribution
        setTaskDistribution(taskTypeDistribution)

        // Set recent items (last 5)
        setRecentIncidents(incidents.slice(0, 5))
        setRecentChangeRequests(changeRequests.slice(0, 5))
      } catch (err) {
        setError(err?.message || 'Failed to load dashboard metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  // Helper function to get status color
  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('critical') || s.includes('rejected')) return token.colorError
    if (s.includes('high') || s.includes('pending')) return token.colorWarning
    if (s.includes('resolved') || s.includes('approved')) return token.colorSuccess
    return token.colorTextSecondary
  }

  // Helper function to get severity icon
  const getSeverityIcon = (severity) => {
    const s = (severity || '').toLowerCase()
    if (s === 'critical') return <ExclamationCircleOutlined style={{ color: token.colorError }} />
    if (s === 'high') return <AlertOutlined style={{ color: token.colorWarning }} />
    return <BugOutlined style={{ color: token.colorInfo }} />
  }

  // Helper function to get task type color
  const getTaskTypeColor = (_, index) => {
    const colors = [
      token.colorPrimary,
      token.colorSuccess,
      token.colorWarning,
      token.colorError,
      token.colorInfo,
      '#722ED1',
      '#EB2F96',
      '#13C2C2'
    ]
    return colors[index % colors.length]
  }

  return (
    <div style={{ padding: isMobile ? '16px' : '24px', backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      {/* Error State */}
      {error && (
        <Card style={{ marginBottom: '24px', borderColor: token.colorError, borderLeft: `4px solid ${token.colorError}` }}>
          <Text type="danger">{error}</Text>
        </Card>
      )}

      {/* Section 1: Executive Summary - KPI Cards */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Executive Summary
        </Title>
        <Row gutter={[16, 16]}>
          {/* Active Projects */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <ProjectOutlined style={{ fontSize: '32px', color: token.colorPrimary }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.projects.active}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Active Projects</Text>
              <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextTertiary }}>
                of {metrics.projects.total} total
              </div>
            </Card>
          </Col>

          {/* Open Incidents */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <BugOutlined style={{ fontSize: '32px', color: metrics.incidents.critical > 0 ? token.colorError : token.colorWarning }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.incidents.open}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Open Incidents</Text>
              {metrics.incidents.critical > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorError }}>
                  🔴 {metrics.incidents.critical} Critical
                </div>
              )}
            </Card>
          </Col>

          {/* Pending Change Requests */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <FileTextOutlined style={{ fontSize: '32px', color: token.colorWarning }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.changeRequests.pending}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Pending Approvals</Text>
              <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextTertiary }}>
                of {metrics.changeRequests.total} total
              </div>
            </Card>
          </Col>

          {/* Tasks Overview */}
          <Col xs={24} sm={12} lg={6}>
            <Card hoverable style={{ textAlign: 'center', borderRadius: '8px' }}>
              <div style={{ marginBottom: '12px' }}>
                <CheckSquareOutlined style={{ fontSize: '32px', color: metrics.tasks.open > 0 ? token.colorWarning : token.colorSuccess }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.tasks.open}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Open Tasks</Text>
              <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextTertiary }}>
                of {metrics.tasks.total} total
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Section 1.5: Task Distribution */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Task Distribution by Type
        </Title>
        <Card>
          {loading ? (
            <Spin />
          ) : Object.keys(taskDistribution).length === 0 ? (
            <Empty
              description="No tasks to display"
              style={{ marginTop: '24px', marginBottom: '24px' }}
            />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {Object.entries(taskDistribution)
                .sort((a, b) => b[1] - a[1])
                .map(([taskType, count], index) => {
                  const totalCount = Object.values(taskDistribution).reduce((a, b) => a + b, 0)
                  const percentage = Math.round((count / totalCount) * 100)
                  const color = getTaskTypeColor(taskType, index)

                  return (
                    <div key={taskType} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ minWidth: '120px' }}>
                        <Text strong style={{ fontSize: '13px' }}>{taskType}</Text>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Progress
                          percent={percentage}
                          strokeColor={color}
                          size="small"
                          format={percent => `${percent}%`}
                        />
                      </div>
                      <div style={{ minWidth: '60px', textAlign: 'right' }}>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          {count} task{count !== 1 ? 's' : ''}
                        </Text>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </Card>
      </div>

      {/* Section 2: Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Quick Actions
        </Title>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              block
              size="middle"
              icon={<PlusOutlined />}
              onClick={() => navigateToRoute?.('project-create')}
              style={{ height: '36px', fontSize: '13px' }}
            >
              New Project
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="default"
              block
              size="middle"
              icon={<AlertOutlined />}
              onClick={() => navigateToRoute?.('incidents')}
              style={{ height: '36px', fontSize: '13px', color: token.colorError, borderColor: token.colorError }}
            >
              Report Incident
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="default"
              block
              size="middle"
              icon={<FileTextOutlined />}
              onClick={() => navigateToRoute?.('change-requests-new')}
              style={{ height: '36px', fontSize: '13px', color: token.colorWarning, borderColor: token.colorWarning }}
            >
              Submit Change
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="default"
              block
              size="middle"
              icon={<ArrowRightOutlined />}
              onClick={() => navigateToRoute?.('change-requests-dashboard')}
              style={{ height: '36px', fontSize: '13px' }}
            >
              View Dashboards
            </Button>
          </Col>
        </Row>
      </div>

      {/* Section 3: Status Overview */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Status Overview
        </Title>
        <Row gutter={[16, 16]}>
          {/* Projects Status */}
          <Col xs={24} md={12} lg={8}>
            <Card>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Projects by Status</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Progress
                  type="circle"
                  percent={metrics.projects.total > 0 ? Math.round((metrics.projects.active / metrics.projects.total) * 100) : 0}
                  size={80}
                  format={percent => `${percent}%`}
                />
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: token.colorTextSecondary, textAlign: 'center' }}>
                <div>{metrics.projects.active} active of {metrics.projects.total} total</div>
              </div>
            </Card>
          </Col>

          {/* Incidents by Severity */}
          <Col xs={24} md={12} lg={8}>
            <Card>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Incidents by Severity</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: token.colorError }}>
                    {metrics.incidents.critical}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Critical</Text>
                </div>
                <Divider type="vertical" style={{ height: '40px' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: token.colorWarning }}>
                    {metrics.incidents.open}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Open</Text>
                </div>
              </div>
            </Card>
          </Col>

          {/* Change Requests Status */}
          <Col xs={24} md={12} lg={8}>
            <Card>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Change Requests</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Progress
                  type="circle"
                  percent={metrics.changeRequests.total > 0 ? Math.round(((metrics.changeRequests.total - metrics.changeRequests.pending) / metrics.changeRequests.total) * 100) : 0}
                  size={80}
                  format={percent => `${percent}%`}
                />
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: token.colorTextSecondary, textAlign: 'center' }}>
                <div>{metrics.changeRequests.pending} pending approval</div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Section 4: Recent Activity */}
      <div>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Recent Activity
        </Title>
        <Row gutter={[16, 16]}>
          {/* Recent Incidents */}
          <Col xs={24} lg={12}>
            <Card title="Recent Incidents" size="small">
              {loading ? (
                <Spin />
              ) : recentIncidents.length === 0 ? (
                <Empty
                  description="No incidents found"
                  style={{ marginTop: '24px', marginBottom: '24px' }}
                />
              ) : (
                <List
                  dataSource={recentIncidents}
                  size="small"
                  renderItem={(incident) => (
                    <List.Item
                      style={{ paddingLeft: 0, paddingRight: 0, cursor: 'pointer' }}
                      onClick={() => navigateToRoute?.('incidents')}
                    >
                      <List.Item.Meta
                        avatar={getSeverityIcon(incident.severity)}
                        title={
                          <Text ellipsis style={{ fontSize: '13px' }}>
                            {incident.title || incident.name || 'Untitled'}
                          </Text>
                        }
                        description={
                          <Space size={4} style={{ fontSize: '11px' }}>
                            <Tag color={getStatusColor(incident.status)}>
                              {incident.status || 'Unknown'}
                            </Tag>
                            <Text type="secondary">
                              {incident.severity || 'N/A'}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>

          {/* Recent Change Requests */}
          <Col xs={24} lg={12}>
            <Card title="Pending Approvals" size="small">
              {loading ? (
                <Spin />
              ) : recentChangeRequests.filter(cr => (cr.approval_status || '').toLowerCase() === 'pending').length === 0 ? (
                <Empty
                  description="No pending approvals"
                  style={{ marginTop: '24px', marginBottom: '24px' }}
                />
              ) : (
                <List
                  dataSource={recentChangeRequests.filter(cr => (cr.approval_status || '').toLowerCase() === 'pending')}
                  size="small"
                  renderItem={(cr) => (
                    <List.Item
                      style={{ paddingLeft: 0, paddingRight: 0, cursor: 'pointer' }}
                      onClick={() => navigateToRoute?.('change-requests')}
                    >
                      <List.Item.Meta
                        avatar={<FileTextOutlined style={{ color: token.colorWarning }} />}
                        title={
                          <Text ellipsis style={{ fontSize: '13px' }}>
                            {cr.title || cr.name || 'Untitled'}
                          </Text>
                        }
                        description={
                          <Space size={4} style={{ fontSize: '11px' }}>
                            <Tag color="warning">Pending</Tag>
                            <Text type="secondary">
                              {cr.requested_by || 'N/A'}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </Card>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Dashboard
