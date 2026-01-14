/**
 * Project Sprint Summary Component
 * Displays sprint summary filtered by project from Zenhub workspace data
 * Designed for project stakeholders with focused metrics
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Space,
  Spin,
  Progress,
  Tag,
  Avatar,
  Table,
  Select,
  Statistic,
  Tooltip,
  Alert,
  Empty,
  Collapse,
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ProjectOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined,
  FolderOutlined,
  FileOutlined
} from '@ant-design/icons'
import zenhubService from '../services/api/zenhub'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const ProjectSprintSummary = ({ projectId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [project, setProject] = useState(null)
  const [workspaceData, setWorkspaceData] = useState(null)
  const [teamUtilization, setTeamUtilization] = useState(null)
  const [error, setError] = useState(null)
  const [selectedEpic, setSelectedEpic] = useState(null)

  useEffect(() => {
    if (projectId) {
      loadData()
    }
  }, [projectId])

  const loadData = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      // Load project details to get workspace ID
      const projectResponse = await fetch(
        `/api/method/frappe.client.get?name=${encodeURIComponent(projectId)}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      ).then(res => res.json())

      if (projectResponse.message?.name) {
        // Try to get custom field for zenhub workspace ID
        const projectData = projectResponse.message
        setProject({
          name: projectData.project_name || projectData.name,
          zenhub_workspace_id: projectData.custom_zenhub_workspace_id,
          zenhub_project_id: projectData.custom_zenhub_project_id
        })
      } else {
        throw new Error('Failed to load project details')
      }

      const workspaceId = project?.zenhub_workspace_id
      if (!workspaceId) {
        setError('No Zenhub Workspace ID configured for this project')
        setLoading(false)
        return
      }

      // Load workspace data filtered by project and team utilization
      const [workspaceRes, utilizationRes] = await Promise.all([
        zenhubService.getWorkspaceSummaryWithFilters(
          workspaceId,
          project?.zenhub_project_id ? { project_id: project.zenhub_project_id } : {},
          forceRefresh
        ),
        zenhubService.getTeamUtilization(workspaceId, forceRefresh)
      ])

      if (workspaceRes.success) {
        setWorkspaceData(workspaceRes)
      } else {
        // Try without project filter if it fails
        const fallbackRes = await zenhubService.getWorkspaceSummary(workspaceId, forceRefresh)
        if (fallbackRes.success) {
          setWorkspaceData(fallbackRes)
        } else {
          throw new Error(workspaceRes.error || fallbackRes.error || 'Failed to load workspace data')
        }
      }

      if (utilizationRes.success) {
        setTeamUtilization(utilizationRes)
      }
    } catch (err) {
      console.error('Error loading project sprint summary:', err)
      setError(err.message || 'Failed to load sprint summary data')
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadData(true).finally(() => setRefreshing(false))
  }

  const handleBack = () => {
    navigateToRoute('project-detail', projectId)
  }

  // Calculate project-specific metrics
  const workspace = workspaceData?.workspace || {}
  const projects = workspace.projects || []
  const selectedProjectData = projects[0] || {}
  const epics = selectedProjectData.epics || []
  const kanbanStatuses = workspaceData?.kanban_statuses || {}
  const allTeamMembers = workspace.team_members || []

  // Flatten all tasks from the project
  const allTasks = epics.reduce((acc, epic) => {
    const epicTasks = epic.sprints?.flatMap(s => s.tasks || []) || []
    return [...acc, ...epicTasks]
  }, [])

  const totalIssues = allTasks.length || workspaceData?.task_count || 0
  const totalPoints = allTasks.reduce((sum, t) => sum + (t.estimate || 0), 0)
  const doneTasks = allTasks.filter(t =>
    ['Done', 'Completed', 'Closed'].includes(t.status)
  ).length
  const completionRate = totalIssues > 0 ? Math.round((doneTasks / totalIssues) * 100) : 0

  // Epic options for filtering
  const epicOptions = epics.map(e => ({
    label: `Epic: ${e.title || e.number} (${e.status})`,
    value: e.id
  }))

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading project sprint summary..." />
      </div>
    )
  }

  if (error && !project) {
    return (
      <Card>
        <Alert
          type="error"
          message="Unable to Load Sprint Summary"
          description={error}
          showIcon
          action={
            <Button size="small" onClick={() => loadData()}>
              Retry
            </Button>
          }
        />
      </Card>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <Card style={{ marginBottom: '16px', ...getHeaderBannerStyle(token) }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleBack}
                style={{ paddingLeft: 0 }}
              >
                Back to Project
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ProjectOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Sprint Summary: {project?.name || projectId}
              </Title>
              <Text type="secondary">
                Zenhub Workspace: {project?.zenhub_workspace_id || 'N/A'}
              </Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined spin={refreshing} />}
                onClick={handleRefresh}
                loading={refreshing}
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {error && (
        <Alert
          style={{ marginBottom: '16px' }}
          type="warning"
          message={error}
          showIcon
          closable
          onClose={() => setError(null)}
        />
      )}

      {/* Key Metrics Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Total Tasks"
              value={totalIssues}
              prefix={<FileOutlined style={{ color: token.colorPrimary }} />}
              valueStyle={{ fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Story Points"
              value={totalPoints}
              prefix={<BarChartOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Completed"
              value={`${doneTasks}/${totalIssues}`}
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{ fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Completion Rate"
              value={completionRate}
              suffix="%"
              prefix={<ClockCircleOutlined style={{ color: '#1890ff' }} />}
              valueStyle={{
                fontSize: 28,
                fontWeight: 600,
                color: completionRate >= 70 ? '#52c41a' : completionRate >= 40 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Card>
        </Col>
      </Row>

      {/* Kanban Status Cards */}
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>Task Status</span>
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        <Row gutter={[16, 16]}>
          {Object.entries(kanbanStatuses).map(([status, count]) => {
            const percentage = totalIssues > 0 ? Math.round((count / totalIssues) * 100) : 0
            const color = status === 'Done' || status === 'Completed' ? 'success'
              : status === 'In Progress' ? 'processing'
              : status === 'Backlog' ? 'warning'
              : 'default'

            return (
              <Col xs={12} sm={8} md={6} key={status}>
                <Card size="small" bordered={false} style={{ background: '#fafafa' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Tag color={color} style={{ marginBottom: 8 }}>{status}</Tag>
                    <div style={{ fontSize: 24, fontWeight: 600 }}>{count}</div>
                    <Progress
                      percent={percentage}
                      showInfo={false}
                      strokeColor={
                        status === 'Done' || status === 'Completed' ? '#52c41a'
                          : status === 'In Progress' ? '#1890ff'
                          : status === 'Backlog' ? '#faad14'
                          : '#d9d9d9'
                      }
                      size="small"
                    />
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      </Card>

      {/* Epics Breakdown */}
      <Card
        title={
          <Space>
            <FolderOutlined />
            <span>Epics & Sprints</span>
            {epicOptions.length > 1 && (
              <Select
                size="small"
                placeholder="Filter by epic"
                allowClear
                style={{ width: 250, marginLeft: 16 }}
                options={epicOptions}
                value={selectedEpic}
                onChange={setSelectedEpic}
              />
            )}
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        {epics.length === 0 ? (
          <Empty description="No epics found for this project" />
        ) : (
          <Collapse
            size="small"
            items={epics
              .filter(e => !selectedEpic || e.id === selectedEpic)
              .map((epic) => ({
                key: epic.id,
                label: (
                  <Space>
                    <Tag color="purple">{epic.number || 'Epic'}</Tag>
                    <Text strong>{epic.title}</Text>
                    <Tag>{epic.status}</Tag>
                    <Text type="secondary">
                      {epic.sprints?.reduce((acc, s) => acc + (s.tasks?.length || 0), 0) || 0} tasks
                    </Text>
                    {epic.estimate && (
                      <Tag color="blue">{epic.estimate} pts</Tag>
                    )}
                  </Space>
                ),
                children: (
                  <Table
                    size="small"
                    pagination={false}
                    columns={[
                      {
                        title: 'Sprint',
                        dataIndex: 'name',
                        key: 'sprint_name',
                        render: (_, record) => record.name || 'Sprint'
                      },
                      {
                        title: 'Start',
                        dataIndex: 'startAt',
                        key: 'start',
                        render: (date) => date ? new Date(date).toLocaleDateString() : '-'
                      },
                      {
                        title: 'End',
                        dataIndex: 'endAt',
                        key: 'end',
                        render: (date) => date ? new Date(date).toLocaleDateString() : '-'
                      },
                      {
                        title: 'Tasks',
                        dataIndex: 'tasks',
                        key: 'task_count',
                        render: (tasks) => tasks?.length || 0
                      },
                      {
                        title: 'Completed',
                        key: 'completed',
                        render: (_, record) => {
                          const done = record.tasks?.filter(t =>
                            ['Done', 'Completed', 'Closed'].includes(t.status)
                          ).length || 0
                          const total = record.tasks?.length || 0
                          return `${done}/${total}`
                        }
                      }
                    ]}
                    dataSource={epic.sprints || []}
                    rowKey="id"
                    style={{ marginTop: 8 }}
                  />
                )
              }))}
          />
        )}
      </Card>

      {/* Team Members in Project */}
      <Card
        title={
          <Space>
            <TeamOutlined />
            <span>Team Working on Project</span>
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        {allTeamMembers.length === 0 ? (
          <Empty description="No team members found in project" />
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
            {allTeamMembers.map((member) => {
              const memberTasks = allTasks.filter(t =>
                t.assignees?.some(a => a.id === member.id || a.name === member.name)
              )
              const memberDone = memberTasks.filter(t =>
                ['Done', 'Completed', 'Closed'].includes(t.status)
              ).length

              return (
                <Card
                  key={member.id}
                  size="small"
                  style={{ width: 200, background: '#fafafa' }}
                >
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    <Space>
                      <Avatar size="small" icon={<UserOutlined />} />
                      <Text strong style={{ fontSize: 13 }}>{member.name}</Text>
                    </Space>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {memberTasks.length} tasks
                      </Text>
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {memberDone} done
                      </Text>
                    </div>
                    <Progress
                      percent={memberTasks.length > 0
                        ? Math.round((memberDone / memberTasks.length) * 100)
                        : 0}
                      size="small"
                      status={memberTasks.length > 0 && memberDone === memberTasks.length ? 'success' : 'active'}
                    />
                  </Space>
                </Card>
              )
            })}
          </div>
        )}
      </Card>

      {/* Team Utilization Summary */}
      {teamUtilization?.team_members?.length > 0 && (
        <Card
          title={
            <Space>
              <BarChartOutlined />
              <span>Team Utilization Metrics</span>
            </Space>
          }
        >
          <Table
            size="small"
            pagination={false}
            columns={[
              {
                title: 'Member',
                dataIndex: 'name',
                key: 'name',
                render: (name) => (
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    {name}
                  </Space>
                )
              },
              { title: 'Tasks', dataIndex: 'task_count', key: 'tasks', align: 'center' },
              { title: 'Points', dataIndex: 'story_points', key: 'points', align: 'center' },
              {
                title: 'Completed',
                key: 'completed',
                render: (_, record) => `${record.completed_tasks}/${record.task_count}`
              },
              {
                title: 'Utilization',
                dataIndex: 'utilization_percentage',
                key: 'utilization',
                align: 'center',
                render: (val) => {
                  const color = val >= 70 ? '#52c41a' : val >= 40 ? '#faad14' : '#ff4d4f'
                  return <Text style={{ color, fontWeight: 600 }}>{val}%</Text>
                }
              }
            ]}
            dataSource={teamUtilization.team_members}
            rowKey="id"
          />
        </Card>
      )}

      {/* Back Button */}
      <Card>
        <Button
          type="default"
          icon={<ArrowLeftOutlined />}
          onClick={handleBack}
          size="large"
        >
          Back to Project
        </Button>
      </Card>
    </div>
  )
}

export default ProjectSprintSummary