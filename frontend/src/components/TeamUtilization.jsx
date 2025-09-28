import React, { useEffect } from 'react'
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
  Badge
} from 'antd'
import {
  UserOutlined,
  TeamOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined
} from '@ant-design/icons'

const { Title, Text } = Typography

const TeamUtilization = () => {
  // Mock data for team utilization
  const teamStats = {
    totalMembers: 24,
    activeMembers: 22,
    utilizationRate: 87,
    avgHoursPerWeek: 38.5
  }

  const teamMembers = [
    {
      id: 'tm-001',
      name: 'John Smith',
      role: 'Senior Developer',
      avatar: 'JS',
      utilization: 95,
      hoursThisWeek: 42,
      currentProjects: ['ePrescription', 'Patient Portal'],
      skills: ['React', 'Node.js', 'Python'],
      status: 'active',
      performance: 'excellent'
    },
    {
      id: 'tm-002',
      name: 'Sarah Johnson',
      role: 'DevOps Engineer',
      avatar: 'SJ',
      utilization: 88,
      hoursThisWeek: 40,
      currentProjects: ['Infrastructure', 'CI/CD Pipeline'],
      skills: ['Docker', 'Kubernetes', 'AWS'],
      status: 'active',
      performance: 'good'
    },
    {
      id: 'tm-003',
      name: 'Mike Chen',
      role: 'Frontend Developer',
      avatar: 'MC',
      utilization: 92,
      hoursThisWeek: 38,
      currentProjects: ['Mobile Health App', 'Analytics Dashboard'],
      skills: ['React', 'TypeScript', 'CSS'],
      status: 'active',
      performance: 'excellent'
    },
    {
      id: 'tm-004',
      name: 'Lisa Wang',
      role: 'Backend Developer',
      avatar: 'LW',
      utilization: 78,
      hoursThisWeek: 35,
      currentProjects: ['Patient Management'],
      skills: ['Python', 'PostgreSQL', 'Redis'],
      status: 'active',
      performance: 'good'
    },
    {
      id: 'tm-005',
      name: 'Alex Rodriguez',
      role: 'Security Engineer',
      avatar: 'AR',
      utilization: 85,
      hoursThisWeek: 40,
      currentProjects: ['Security Audit', 'Compliance'],
      skills: ['Security', 'Penetration Testing', 'OWASP'],
      status: 'active',
      performance: 'excellent'
    },
    {
      id: 'tm-006',
      name: 'David Kim',
      role: 'QA Engineer',
      avatar: 'DK',
      utilization: 82,
      hoursThisWeek: 37,
      currentProjects: ['Testing Framework', 'Automation'],
      skills: ['Selenium', 'Jest', 'Cypress'],
      status: 'active',
      performance: 'good'
    }
  ]

  const projectAllocations = [
    {
      project: 'ePrescription',
      members: 8,
      utilization: 92,
      status: 'On Track',
      deadline: '2024-06-30'
    },
    {
      project: 'Patient Portal',
      members: 6,
      utilization: 88,
      status: 'On Track',
      deadline: '2024-08-15'
    },
    {
      project: 'Mobile Health App',
      members: 5,
      utilization: 85,
      status: 'At Risk',
      deadline: '2024-07-20'
    },
    {
      project: 'Analytics Dashboard',
      members: 4,
      utilization: 90,
      status: 'On Track',
      deadline: '2024-09-10'
    },
    {
      project: 'Infrastructure',
      members: 3,
      utilization: 95,
      status: 'Ahead',
      deadline: 'Ongoing'
    }
  ]

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

  return (
    <div style={{ padding: '24px' }}>
      <Title level={2}>Team Utilization</Title>
      
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
      <Card title="Team Members" style={{ marginBottom: 24 }}>
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
