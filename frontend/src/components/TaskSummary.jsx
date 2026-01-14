/**
 * Task Summary Component
 * Displays task-level details from Zenhub workspace data
 * Shows task information including status, assignees, and context
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
  Tag,
  Avatar,
  Descriptions,
  Timeline,
  Tooltip,
  Alert,
  Empty,
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  TeamOutlined,
  ProjectOutlined,
  TagOutlined,
  LinkOutlined,
  CalendarOutlined,
  EyeOutlined
} from '@ant-design/icons'
import zenhubService from '../services/api/zenhub'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text, Paragraph } = Typography

const TaskSummary = ({ taskData, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [taskContext, setTaskContext] = useState(null)
  const [workspaceData, setWorkspaceData] = useState(null)
  const [error, setError] = useState(null)

  // Task can be passed directly or fetched by ID
  const taskId = taskData?.id || taskData?.name
  const workspaceId = taskData?.workspace_id

  useEffect(() => {
    if (workspaceId) {
      loadTaskContext()
    } else if (taskData) {
      // Use task data directly if available
      setTaskContext(taskData)
    }
  }, [workspaceId, taskData])

  const loadTaskContext = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      // Find the task in workspace data
      const workspaceRes = await zenhubService.getWorkspaceSummary(workspaceId, forceRefresh)

      if (!workspaceRes.success) {
        throw new Error(workspaceRes.error || 'Failed to load workspace data')
      }

      setWorkspaceData(workspaceRes)

      // Search for the task in the hierarchy
      let foundTask = null
      let context = null

      for (const project of workspaceRes.workspace?.projects || []) {
        for (const epic of project.epics || []) {
          for (const sprint of epic.sprints || []) {
            const task = sprint.tasks?.find(t => t.id === taskId || t.number == taskId)
            if (task) {
              foundTask = task
              context = {
                project: { id: project.id, title: project.title || project.name },
                epic: { id: epic.id, title: epic.title, number: epic.number, status: epic.status },
                sprint: { id: sprint.id, name: sprint.name, startAt: sprint.startAt, endAt: sprint.endAt }
              }
              break
            }
          }
          if (foundTask) break
        }
        if (foundTask) break
      }

      if (foundTask) {
        setTaskContext({ ...foundTask, ...context })
      } else {
        // Task not found in workspace, use provided data
        setTaskContext(taskData)
      }
    } catch (err) {
      console.error('Error loading task context:', err)
      setError(err.message || 'Failed to load task context')
      setTaskContext(taskData)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = () => {
    setRefreshing(true)
    loadTaskContext(true).finally(() => setRefreshing(false))
  }

  const handleBack = () => {
    // Navigate back to previous page
    if (taskData?.projectId) {
      navigateToRoute('project-detail', taskData.projectId)
    } else {
      navigateToRoute('dashboard')
    }
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading task details..." />
      </div>
    )
  }

  if (!taskContext) {
    return (
      <Card>
        <Empty description="Task not found" />
        <Button type="primary" onClick={handleBack} style={{ marginTop: 16 }}>
          Back to Project
        </Button>
      </Card>
    )
  }

  const statusColors = {
    'Done': 'success',
    'Completed': 'success',
    'In Progress': 'processing',
    'In-Progress': 'processing',
    'Open': 'default',
    'Backlog': 'warning',
    'Review/QA': 'processing',
    'Closed': 'success'
  }

  const priorityColors = {
    'High': 'red',
    'Urgent': 'red',
    'Medium': 'orange',
    'Low': 'green'
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
                Back
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <CheckCircleOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Task: {taskContext.title || taskContext.name || taskData?.subject}
              </Title>
              <Space>
                <Tag color={statusColors[taskContext.status] || 'default'}>
                  {taskContext.status || 'Unknown'}
                </Tag>
                {taskContext.kanban_status_id && (
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    ID: {taskContext.kanban_status_id}
                  </Text>
                )}
              </Space>
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

      {/* Task Details Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        {/* Main Task Info */}
        <Col xs={24} lg={16}>
          <Card
            title={
              <Space>
                <ProjectOutlined />
                <span>Task Details</span>
              </Space>
            }
          >
            <Descriptions column={2} size="small">
              <Descriptions.Item label="Task Number">
                #{taskContext.number || taskContext.id?.split('_').pop() || 'N/A'}
              </Descriptions.Item>
              <Descriptions.Item label="Status">
                <Tag color={statusColors[taskContext.status] || 'default'}>
                  {taskContext.status}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="Estimate">
                {taskContext.estimate ? `${taskContext.estimate} points` : 'Not estimated'}
              </Descriptions.Item>
              <Descriptions.Item label="Priority">
                {taskContext.priority && (
                  <Tag color={priorityColors[taskContext.priority] || 'default'}>
                    {taskContext.priority}
                  </Tag>
                )}
              </Descriptions.Item>
            </Descriptions>

            {taskContext.description && (
              <div style={{ marginTop: 16 }}>
                <Text strong style={{ display: 'block', marginBottom: 8 }}>
                  <EyeOutlined style={{ marginRight: 8 }} />
                  Description
                </Text>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Paragraph style={{ marginBottom: 0, whiteSpace: 'pre-wrap' }}>
                    {taskContext.description}
                  </Paragraph>
                </Card>
              </div>
            )}
          </Card>
        </Col>

        {/* Context Sidebar */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <LinkOutlined />
                <span>Context</span>
              </Space>
            }
          >
            {taskContext.project && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <ProjectOutlined style={{ marginRight: 4 }} />
                  Project
                </Text>
                <div>
                  <Text strong>{taskContext.project.title}</Text>
                </div>
              </div>
            )}

            {taskContext.epic && (
              <div style={{ marginBottom: 16 }}>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <TagOutlined style={{ marginRight: 4 }} />
                  Epic
                </Text>
                <div>
                  <Space>
                    <Text strong>{taskContext.epic.title}</Text>
                    <Tag>{taskContext.epic.status}</Tag>
                  </Space>
                </div>
              </div>
            )}

            {taskContext.sprint && (
              <div>
                <Text type="secondary" style={{ fontSize: 12 }}>
                  <CalendarOutlined style={{ marginRight: 4 }} />
                  Sprint
                </Text>
                <div>
                  <Text strong>{taskContext.sprint.name}</Text>
                  {taskContext.sprint.startAt && (
                    <div style={{ fontSize: 12, color: '#666' }}>
                      {new Date(taskContext.sprint.startAt).toLocaleDateString()} - {
                        taskContext.sprint.endAt
                          ? new Date(taskContext.sprint.endAt).toLocaleDateString()
                          : 'Ongoing'
                      }
                    </div>
                  )}
                </div>
              </div>
            )}
          </Card>
        </Col>
      </Row>

      {/* Assignees */}
      {taskContext.assignees?.length > 0 && (
        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>Assignees ({taskContext.assignees.length})</span>
            </Space>
          }
          style={{ marginBottom: '16px' }}
        >
          <Row gutter={[16, 16]}>
            {taskContext.assignees.map((assignee) => (
              <Col xs={24} sm={12} md={8} key={assignee.id}>
                <Card size="small" style={{ background: '#fafafa' }}>
                  <Space>
                    <Avatar icon={<UserOutlined />} />
                    <div>
                      <Text strong>{assignee.name || 'Unknown'}</Text>
                      <div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          @{assignee.username || assignee.id}
                        </Text>
                      </div>
                    </div>
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        </Card>
      )}

      {/* Task Timeline in Workspace */}
      {workspaceData && (
        <Card
          title={
            <Space>
              <ClockCircleOutlined />
              <span>Workspace Position</span>
            </Space>
          }
        >
          <Timeline
            items={[{
              color: 'blue',
              children: (
                <div>
                  <Text strong>Project: {taskContext.project?.title || 'Unknown'}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Level 1 - Main project container
                  </Text>
                </div>
              )
            }, {
              color: taskContext.epic ? 'green' : 'gray',
              children: (
                <div>
                  <Text strong>Epic: {taskContext.epic?.title || 'Unknown'}</Text>
                  {taskContext.epic && (
                    <Tag style={{ marginLeft: 8 }}>{taskContext.epic.status}</Tag>
                  )}
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Level 2 - Major feature container
                  </Text>
                </div>
              )
            }, {
              color: taskContext.sprint ? 'orange' : 'gray',
              children: (
                <div>
                  <Text strong>Sprint: {taskContext.sprint?.name || 'Unknown'}</Text>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Level 3 - Iteration timebox
                  </Text>
                </div>
              )
            }, {
              color: 'purple',
              children: (
                <div>
                  <Text strong>Task: {taskContext.title}</Text>
                  <Tag style={{ marginLeft: 8 }}>{taskContext.status}</Tag>
                  <br />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Level 4 - Individual work item
                  </Text>
                </div>
              )
            }]}
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

export default TaskSummary