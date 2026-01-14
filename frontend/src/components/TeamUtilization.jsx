import React, { useEffect, useState } from 'react'
import {
  Card,
  Row,
  Col,
  Progress,
  Table,
  Avatar,
  Tag,
  Typography,
  Space,
  Statistic,
  Tooltip,
  List,
  Badge,
  Alert,
  Spin
} from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import zenhubService from '../services/api/zenhub'

const { Title, Text } = Typography

const TeamUtilization = ({ workspaceId: propWorkspaceId, forceRefresh = false }) => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [projectAllocations, setProjectAllocations] = useState([])
  const [workspaceId, setWorkspaceId] = useState(propWorkspaceId)

  // Fetch team utilization data from Zenhub API
  const fetchTeamData = async () => {
    if (!workspaceId) {
      setError('Workspace ID is required. Please configure Zenhub Settings.')
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Fetch both team utilization and workspace summary in parallel
      const [teamDataResult, summaryResult] = await Promise.all([
        zenhubService.getTeamUtilization(workspaceId, forceRefresh),
        zenhubService.getWorkspaceSummary(workspaceId, forceRefresh)
      ])

      if (teamDataResult && teamDataResult.success) {
        setTeamData(teamDataResult)
      } else {
        setError(teamDataResult?.error || 'Failed to fetch team utilization data')
      }

      // Process project allocations from workspace summary
      if (summaryResult?.success && summaryResult.workspace?.projects) {
        const allocations = summaryResult.workspace.projects.map(project => {
          // Count unique team members across all tasks
          const memberCount = new Set()
          let taskCount = 0

          project.epics?.forEach(epic => {
            epic.sprints?.forEach(sprint => {
              sprint.tasks?.forEach(task => {
                taskCount++
                task.assignees?.forEach(a => memberCount.add(a.id))
              })
            })
          })

          return {
            project: project.title || 'Unknown',
            members: memberCount.size,
            taskCount,
            utilization: 85, // Placeholder
            status: 'On Track',
            deadline: 'Ongoing'
          }
        })
        setProjectAllocations(allocations)
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeamData()
  }, [workspaceId, forceRefresh])

  // Calculate stats from API data
  const getTeamStats = () => {
    if (!teamData?.team_members) {
      return {
        totalMembers: 0,
        activeMembers: 0,
        utilizationRate: 0,
        avgHoursPerWeek: 0
      }
    }

    const members = teamData.team_members
    const totalMembers = members.length
    const activeMembers = members.filter(m => m.task_count > 0).length
    const avgUtilization = teamData.average_utilization || 0

    return {
      totalMembers,
      activeMembers,
      utilizationRate: Math.round(avgUtilization),
      avgHoursPerWeek: 38.5 // Estimate - not available in Zenhub API
    }
  }

  // Transform Zenhub data for table display
  const getTeamMembers = () => {
    if (!teamData?.team_members) return []

    return teamData.team_members.map(member => ({
      id: member.id,
      name: member.name || 'Unknown',
      role: 'Team Member',
      avatar: getInitials(member.name),
      utilization: member.utilization_percentage || 0,
      taskCount: member.task_count || 0,
      storyPoints: member.story_points || 0,
      completedPoints: member.completed_points || 0,
      currentProjects: ['Project'], // Placeholder - not in Zenhub data
      skills: [], // Placeholder - not in Zenhub data
      status: member.task_count > 0 ? 'active' : 'inactive',
      performance: getPerformanceLevel(member.utilization_percentage)
    }))
  }

  const getInitials = (name) => {
    if (!name) return '??'
    return name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
  }

  const getPerformanceLevel = (utilization) => {
    if (!utilization) return 'needs-improvement'
    if (utilization >= 80) return 'excellent'
    if (utilization >= 60) return 'good'
    return 'needs-improvement'
  }

  const teamStats = getTeamStats()
  const teamMembers = getTeamMembers()

  const getUtilizationColor = (utilization) => {
    if (utilization >= 90) return '#52c41a'
    if (utilization >= 80) return '#faad14'
    if (utilization >= 70) return '#fa8c16'
    return '#f5222d'
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'On Track': return 'green'
      case 'Ahead': return 'blue'
      case 'At Risk': return 'orange'
      case 'Behind': return 'red'
      default: return 'default'
    }
  }

  const getPerformanceIcon = (performance) => {
    switch (performance) {
      case 'excellent': return <TrophyOutlined style={{ color: '#faad14' }} />
      case 'good': return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'needs-improvement': return <ExclamationCircleOutlined style={{ color: '#fa8c16' }} />
      default: return <UserOutlined />
    }
  }

  const teamColumns = [
    {
      title: 'Team Member',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <Avatar style={{ backgroundColor: '#1890ff' }}>
            {record.avatar}
          </Avatar>
          <div>
            <div style={{ fontWeight: 500 }}>{text}</div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.role}
            </Text>
          </div>
        </Space>
      )
    },
    {
      title: 'Utilization',
      dataIndex: 'utilization',
      key: 'utilization',
      render: (utilization) => (
        <div style={{ width: 120 }}>
          <Progress
            percent={utilization}
            size="small"
            strokeColor={getUtilizationColor(utilization)}
            format={percent => `${percent}%`}
          />
        </div>
      ),
      sorter: (a, b) => a.utilization - b.utilization
    },
    {
      title: 'Hours/Week',
      dataIndex: 'hoursThisWeek',
      key: 'hoursThisWeek',
      render: (hours) => (
        <Space>
          <ClockCircleOutlined />
          <span>{hours}h</span>
        </Space>
      ),
      sorter: (a, b) => a.hoursThisWeek - b.hoursThisWeek
    },
    {
      title: 'Current Projects',
      dataIndex: 'currentProjects',
      key: 'currentProjects',
      render: (projects) => (
        <div>
          {projects.map(project => (
            <Tag key={project} style={{ marginBottom: 2 }}>
              {project}
            </Tag>
          ))}
        </div>
      )
    },
    {
      title: 'Skills',
      dataIndex: 'skills',
      key: 'skills',
      render: (skills) => (
        <div>
          {skills.slice(0, 2).map(skill => (
            <Tag key={skill} color="blue" style={{ marginBottom: 2 }}>
              {skill}
            </Tag>
          ))}
          {skills.length > 2 && (
            <Tooltip title={skills.slice(2).join(', ')}>
              <Tag color="default">+{skills.length - 2}</Tag>
            </Tooltip>
          )}
        </div>
      )
    },
    {
      title: 'Performance',
      dataIndex: 'performance',
      key: 'performance',
      render: (performance) => (
        <Space>
          {getPerformanceIcon(performance)}
          <span style={{ textTransform: 'capitalize' }}>
            {performance.replace('-', ' ')}
          </span>
        </Space>
      )
    }
  ]

  const projectColumns = [
    {
      title: 'Project',
      dataIndex: 'project',
      key: 'project',
      render: (text) => <Text strong>{text}</Text>
    },
    {
      title: 'Team Size',
      dataIndex: 'members',
      key: 'members',
      render: (members) => (
        <Space>
          <TeamOutlined />
          <span>{members} members</span>
        </Space>
      )
    },
    {
      title: 'Utilization',
      dataIndex: 'utilization',
      key: 'utilization',
      render: (utilization) => (
        <Progress
          percent={utilization}
          size="small"
          strokeColor={getUtilizationColor(utilization)}
          style={{ width: 100 }}
        />
      )
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: 'Deadline',
      dataIndex: 'deadline',
      key: 'deadline'
    }
  ]

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" tip="Loading team utilization data..." />
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          type="error"
          message="Failed to Load Team Utilization"
          description={error}
          action={
            <button onClick={fetchTeamData} style={{ border: 'none', background: 'none', color: '#ff4d4f', cursor: 'pointer' }}>
              Retry
            </button>
          }
        />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <Title level={2}>Team Utilization</Title>
        <Tooltip title="Refresh data">
          <button
            onClick={fetchTeamData}
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: '18px' }}
          >
            <ReloadOutlined spin={loading} />
          </button>
        </Tooltip>
      </div>

      {/* Overview Statistics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Total Team Members"
              value={teamStats.totalMembers}
              prefix={<TeamOutlined />}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Active Members"
              value={teamStats.activeMembers}
              prefix={<UserOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Avg Utilization"
              value={teamStats.utilizationRate}
              suffix="%"
              valueStyle={{ color: getUtilizationColor(teamStats.utilizationRate) }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={6}>
          <Card>
            <Statistic
              title="Avg Hours/Week"
              value={teamStats.avgHoursPerWeek}
              prefix={<ClockCircleOutlined />}
              precision={1}
            />
          </Card>
        </Col>
      </Row>

      {/* Team Members Table */}
      <Card title={`Team Members (${teamMembers.length})`} style={{ marginBottom: 24 }}>
        <Table
          columns={teamColumns}
          dataSource={teamMembers}
          rowKey="id"
          pagination={{ pageSize: 10 }}
          scroll={{ x: 800 }}
        />
      </Card>

      {/* Project Allocations */}
      <Card title="Project Allocations">
        <Table
          columns={projectColumns}
          dataSource={projectAllocations}
          rowKey="project"
          pagination={false}
        />
      </Card>
    </div>
  )
}

export default TeamUtilization
