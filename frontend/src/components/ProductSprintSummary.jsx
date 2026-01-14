/**
 * Product Sprint Summary Component
 * Displays a comprehensive sprint summary for a Software Product with Zenhub workspace data
 * Optimized for stakeholder consumption with minimalist data visualization
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
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  ReloadOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  RocketOutlined,
  ProjectOutlined,
  BarChartOutlined,
  AppstoreOutlined,
  UserOutlined
} from '@ant-design/icons'
import zenhubService from '../services/api/zenhub'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text, Paragraph } = Typography

const ProductSprintSummary = ({ productId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [product, setProduct] = useState(null)
  const [workspaceData, setWorkspaceData] = useState(null)
  const [teamUtilization, setTeamUtilization] = useState(null)
  const [error, setError] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)

  useEffect(() => {
    if (productId) {
      loadData()
    }
  }, [productId])

  const loadData = async (forceRefresh = false) => {
    setLoading(true)
    setError(null)

    try {
      // Load product details
      const productResponse = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.software_product.get_product_detail?name=${encodeURIComponent(productId)}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      ).then(res => res.json())

      if (productResponse.message?.success) {
        setProduct(productResponse.message.data)
      } else {
        throw new Error('Failed to load product details')
      }

      // Check if workspace ID exists
      const workspaceId = productResponse.message.data?.zenhub_workspace_id
      if (!workspaceId) {
        setError('No Zenhub Workspace ID configured for this product')
        setLoading(false)
        return
      }

      // Load workspace summary and team utilization in parallel
      const [workspaceRes, utilizationRes] = await Promise.all([
        zenhubService.getWorkspaceSummary(workspaceId, forceRefresh),
        zenhubService.getTeamUtilization(workspaceId, forceRefresh)
      ])

      if (workspaceRes.success) {
        setWorkspaceData(workspaceRes)
      } else {
        throw new Error(workspaceRes.error || 'Failed to load workspace data')
      }

      if (utilizationRes.success) {
        setTeamUtilization(utilizationRes)
      }
    } catch (err) {
      console.error('Error loading sprint summary:', err)
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
    navigateToRoute('software-product-edit', null, null, productId)
  }

  // Calculate key metrics
  const summary = workspaceData?.workspace?.summary || {}
  const kanbanStatuses = workspaceData?.workspace?.kanban_statuses || {}
  const projects = workspaceData?.workspace?.projects || []
  const teamMembers = workspaceData?.workspace?.team_members || []

  const totalIssues = summary.total_issues || 0
  const totalPoints = summary.total_story_points || 0
  const completionRate = summary.completion_rate || 0
  const doneCount = kanbanStatuses['Done'] || kanbanStatuses['Completed'] || 0
  const inProgressCount = kanbanStatuses['In Progress'] || 0
  const backLogCount = kanbanStatuses['Backlog'] || 0

  // Project options for filtering
  const projectOptions = projects.map(p => ({
    label: p.title || p.name,
    value: p.id
  }))

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" tip="Loading sprint summary..." />
      </div>
    )
  }

  if (error && !product) {
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
                Back to Product
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <RocketOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Sprint Summary: {product?.product_name || 'Product'}
              </Title>
              <Text type="secondary">
                Zenhub Workspace: {product?.zenhub_workspace_id || 'N/A'}
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

      {/* Key Metrics Row - Executive Summary */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Total Issues"
              value={totalIssues}
              prefix={<ProjectOutlined style={{ color: token.colorPrimary }} />}
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
              title="Completion Rate"
              value={completionRate}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
              valueStyle={{
                fontSize: 28,
                fontWeight: 600,
                color: completionRate >= 70 ? '#52c41a' : completionRate >= 40 ? '#faad14' : '#ff4d4f'
              }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={6}>
          <Card size="small" style={{ height: '100%' }}>
            <Statistic
              title="Team Members"
              value={teamMembers.length}
              prefix={<TeamOutlined style={{ color: '#722ed1' }} />}
              valueStyle={{ fontSize: 28, fontWeight: 600 }}
            />
          </Card>
        </Col>
      </Row>

      {/* Kanban Status Distribution */}
      <Card
        title={
          <Space>
            <BarChartOutlined />
            <span>Status Distribution</span>
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

      {/* Projects Overview */}
      <Card
        title={
          <Space>
            <AppstoreOutlined />
            <span>Projects & Epics</span>
            {projectOptions.length > 0 && (
              <Select
                size="small"
                placeholder="Filter by project"
                allowClear
                style={{ width: 200, marginLeft: 16 }}
                options={projectOptions}
                value={selectedProject}
                onChange={setSelectedProject}
              />
            )}
          </Space>
        }
        style={{ marginBottom: '16px' }}
      >
        {projects.length === 0 ? (
          <Empty description="No projects found in workspace" />
        ) : (
          <Row gutter={[16, 16]}>
            {projects
              .filter(p => !selectedProject || p.id === selectedProject)
              .map((project) => {
                const epicCount = project.epics?.length || 0
                const taskCount = project.epics?.reduce((acc, e) =>
                  acc + (e.sprints?.reduce((sacc, s) => sacc + (s.tasks?.length || 0), 0) || 0), 0) || 0

                return (
                  <Col xs={24} sm={12} lg={8} key={project.id}>
                    <Card size="small" hoverable style={{ height: '100%' }}>
                      <div style={{ marginBottom: 12 }}>
                        <Text strong style={{ fontSize: 16 }}>{project.title || project.name}</Text>
                        <Tag style={{ marginLeft: 8 }}>{project.type || 'Project'}</Tag>
                      </div>
                      <Row gutter={16}>
                        <Col span={12}>
                          <Statistic
                            title="Epics"
                            value={epicCount}
                            valueStyle={{ fontSize: 20 }}
                            prefix={<ProjectOutlined style={{ fontSize: 14 }} />}
                          />
                        </Col>
                        <Col span={12}>
                          <Statistic
                            title="Tasks"
                            value={taskCount}
                            valueStyle={{ fontSize: 20 }}
                            prefix={<CheckCircleOutlined style={{ fontSize: 14 }} />}
                          />
                        </Col>
                      </Row>
                    </Card>
                  </Col>
                )
              })}
          </Row>
        )}
      </Card>

      {/* Team Utilization */}
      {teamUtilization && teamUtilization.team_members?.length > 0 && (
        <Card
          title={
            <Space>
              <TeamOutlined />
              <span>Team Utilization</span>
              <Tag color="blue">Avg: {teamUtilization.average_utilization}%</Tag>
            </Space>
          }
          style={{ marginBottom: '16px' }}
        >
          <Table
            size="small"
            pagination={false}
            columns={[
              {
                title: 'Team Member',
                dataIndex: 'name',
                key: 'name',
                render: (name, record) => (
                  <Space>
                    <Avatar size="small" icon={<UserOutlined />} />
                    <Text>{name}</Text>
                  </Space>
                )
              },
              {
                title: 'Tasks',
                dataIndex: 'task_count',
                key: 'task_count',
                align: 'center'
              },
              {
                title: 'Story Points',
                dataIndex: 'story_points',
                key: 'story_points',
                align: 'center'
              },
              {
                title: 'Completed',
                dataIndex: 'completed_tasks',
                key: 'completed_tasks',
                align: 'center',
                render: (val, record) => `${val}/${record.task_count}`
              },
              {
                title: 'Utilization',
                dataIndex: 'utilization_percentage',
                key: 'utilization',
                align: 'center',
                render: (val) => {
                  const color = val >= 70 ? '#52c41a' : val >= 40 ? '#faad14' : '#ff4d4f'
                  return (
                    <Tooltip title={`${val}% of assigned story points completed`}>
                      <span style={{ color, fontWeight: 600 }}>{val}%</span>
                    </Tooltip>
                  )
                }
              },
              {
                title: 'Progress',
                dataIndex: 'utilization_percentage',
                key: 'progress',
                width: 150,
                render: (val) => (
                  <Progress
                    percent={val}
                    size="small"
                    strokeColor={val >= 70 ? '#52c41a' : val >= 40 ? '#faad14' : '#ff4d4f'}
                  />
                )
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
          Back to Product Form
        </Button>
      </Card>
    </div>
  )
}

export default ProductSprintSummary