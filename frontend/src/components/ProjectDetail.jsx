import React, { useState, useEffect } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Progress,
  Tag,
  Avatar,
  Timeline,
  Statistic,
  Space,
  Divider,
  Table,
  Badge,
  Tooltip,
  Alert,
  Spin,
  Empty
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  TeamOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  TrophyOutlined,
  RocketOutlined,
  BugOutlined,
  FileTextOutlined,
  UserOutlined,
  BarChartOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography

const ProjectDetail = ({ projectId, navigateToRoute }) => {
  const [loading, setLoading] = useState(true)
  const [projectData, setProjectData] = useState(null)

  // Mock project data
  const mockProjectData = {
    id: projectId || 'PROJ-001',
    name: 'E-Commerce Platform Redesign',
    description: 'Complete redesign of the e-commerce platform with modern UI/UX, improved performance, and enhanced security features.',
    status: 'In Progress',
    priority: 'High',
    progress: 68,
    startDate: '2024-01-15',
    endDate: '2024-04-30',
    budget: 150000,
    spent: 89500,
    manager: {
      name: 'Sarah Johnson',
      avatar: null,
      email: 'sarah.johnson@company.com'
    },
    team: [
      { name: 'John Doe', role: 'Frontend Developer', avatar: null },
      { name: 'Jane Smith', role: 'Backend Developer', avatar: null },
      { name: 'Mike Wilson', role: 'UI/UX Designer', avatar: null },
      { name: 'Lisa Chen', role: 'QA Engineer', avatar: null }
    ],
    stats: {
      totalTasks: 45,
      completedTasks: 31,
      inProgressTasks: 8,
      pendingTasks: 6,
      bugs: 3,
      features: 12
    },
    milestones: [
      {
        id: 1,
        title: 'Project Kickoff',
        date: '2024-01-15',
        status: 'completed',
        description: 'Initial project setup and team onboarding'
      },
      {
        id: 2,
        title: 'Design Phase Complete',
        date: '2024-02-28',
        status: 'completed',
        description: 'UI/UX designs approved and finalized'
      },
      {
        id: 3,
        title: 'Backend Development',
        date: '2024-03-31',
        status: 'in-progress',
        description: 'API development and database optimization'
      },
      {
        id: 4,
        title: 'Frontend Integration',
        date: '2024-04-15',
        status: 'pending',
        description: 'Frontend components and API integration'
      },
      {
        id: 5,
        title: 'Testing & Deployment',
        date: '2024-04-30',
        status: 'pending',
        description: 'Quality assurance and production deployment'
      }
    ],
    recentActivity: [
      {
        id: 1,
        type: 'task_completed',
        title: 'Payment Gateway Integration',
        user: 'Jane Smith',
        timestamp: '2 hours ago',
        description: 'Completed Stripe payment integration with error handling'
      },
      {
        id: 2,
        type: 'bug_fixed',
        title: 'Cart Calculation Bug',
        user: 'John Doe',
        timestamp: '5 hours ago',
        description: 'Fixed tax calculation issue in shopping cart'
      },
      {
        id: 3,
        type: 'milestone_reached',
        title: 'Backend API Complete',
        user: 'System',
        timestamp: '1 day ago',
        description: 'All backend APIs have been developed and tested'
      },
      {
        id: 4,
        type: 'task_assigned',
        title: 'Mobile Responsive Design',
        user: 'Mike Wilson',
        timestamp: '2 days ago',
        description: 'Assigned mobile responsiveness tasks for checkout flow'
      }
    ]
  }

  useEffect(() => {
    loadProjectData()
  }, [projectId])

  const loadProjectData = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      setProjectData(mockProjectData)
    } catch (error) {
      console.error('Failed to load project data:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'completed': return 'success'
      case 'in progress': case 'in-progress': return 'processing'
      case 'pending': return 'warning'
      case 'cancelled': return 'error'
      default: return 'default'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'red'
      case 'medium': return 'orange'
      case 'low': return 'green'
      default: return 'blue'
    }
  }

  const getActivityIcon = (type) => {
    switch (type) {
      case 'task_completed': return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'bug_fixed': return <BugOutlined style={{ color: '#fa8c16' }} />
      case 'milestone_reached': return <TrophyOutlined style={{ color: '#1890ff' }} />
      case 'task_assigned': return <UserOutlined style={{ color: '#722ed1' }} />
      default: return <FileTextOutlined style={{ color: '#8c8c8c' }} />
    }
  }

  const taskColumns = [
    {
      title: 'Task',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <div>
          <Text strong>{text}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      )
    },
    {
      title: 'Assignee',
      dataIndex: 'assignee',
      key: 'assignee',
      render: (assignee) => (
        <Space>
          <Avatar size="small" icon={<UserOutlined />} />
          <Text>{assignee}</Text>
        </Space>
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
      title: 'Priority',
      dataIndex: 'priority',
      key: 'priority',
      render: (priority) => (
        <Tag color={getPriorityColor(priority)}>{priority}</Tag>
      )
    },
    {
      title: 'Due Date',
      dataIndex: 'dueDate',
      key: 'dueDate'
    }
  ]

  const mockTasks = [
    {
      key: '1',
      name: 'User Authentication System',
      description: 'Implement secure login and registration',
      assignee: 'Jane Smith',
      status: 'Completed',
      priority: 'High',
      dueDate: '2024-02-15'
    },
    {
      key: '2',
      name: 'Product Catalog UI',
      description: 'Design and implement product listing pages',
      assignee: 'John Doe',
      status: 'In Progress',
      priority: 'Medium',
      dueDate: '2024-03-20'
    },
    {
      key: '3',
      name: 'Payment Integration',
      description: 'Integrate Stripe payment gateway',
      assignee: 'Jane Smith',
      status: 'Completed',
      priority: 'High',
      dueDate: '2024-03-10'
    },
    {
      key: '4',
      name: 'Mobile Responsiveness',
      description: 'Ensure all pages work on mobile devices',
      assignee: 'Mike Wilson',
      status: 'Pending',
      priority: 'Medium',
      dueDate: '2024-04-05'
    }
  ]

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px' 
      }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!projectData) {
    return (
      <Empty
        description="Project not found"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      >
        <Button type="primary" onClick={() => navigateToRoute('dashboard')}>
          Back to Dashboard
        </Button>
      </Empty>
    )
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header Section */}
      <Card
        style={{
          marginBottom: '16px',
          borderRadius: '8px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button 
                type="text" 
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('dashboard')}
                style={{ marginBottom: '8px' }}
              >
                Back to Dashboard
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                {projectData.name}
              </Title>
              <Paragraph style={{ margin: 0, maxWidth: '600px' }}>
                {projectData.description}
              </Paragraph>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button type="primary" icon={<EditOutlined />}>
                Edit Project
              </Button>
              <Button icon={<BarChartOutlined />}>
                Reports
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Project Overview Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: '8px', textAlign: 'center' }}>
            <Statistic
              title="Progress"
              value={projectData.progress}
              suffix="%"
              valueStyle={{ color: '#1890ff' }}
            />
            <Progress 
              percent={projectData.progress} 
              showInfo={false}
              strokeColor="#1890ff"
              style={{ marginTop: '8px' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: '12px', textAlign: 'center' }}>
            <Statistic
              title="Budget Used"
              value={projectData.spent}
              prefix="$"
              valueStyle={{ color: '#52c41a' }}
            />
            <Text type="secondary">of ${projectData.budget.toLocaleString()}</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: '12px', textAlign: 'center' }}>
            <Statistic
              title="Tasks Completed"
              value={projectData.stats.completedTasks}
              suffix={`/ ${projectData.stats.totalTasks}`}
              valueStyle={{ color: '#722ed1' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card style={{ borderRadius: '12px', textAlign: 'center' }}>
            <Statistic
              title="Team Members"
              value={projectData.team.length}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {/* Left Column */}
        <Col xs={24} lg={16}>
          {/* Project Status & Info */}
          <Card
            title="Project Information"
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Row gutter={[16, 16]}>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Status</Text>
                  <Tag color={getStatusColor(projectData.status)} style={{ fontSize: '14px' }}>
                    {projectData.status}
                  </Tag>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Priority</Text>
                  <Tag color={getPriorityColor(projectData.priority)} style={{ fontSize: '14px' }}>
                    {projectData.priority}
                  </Tag>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Start Date</Text>
                  <Text><CalendarOutlined /> {projectData.startDate}</Text>
                </Space>
              </Col>
              <Col span={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">End Date</Text>
                  <Text><CalendarOutlined /> {projectData.endDate}</Text>
                </Space>
              </Col>
            </Row>
          </Card>

          {/* Tasks Table */}
          <Card
            title="Project Tasks"
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Table
              columns={taskColumns}
              dataSource={mockTasks}
              pagination={{ pageSize: 10 }}
              size="middle"
            />
          </Card>

          {/* Milestones Timeline */}
          <Card
            title="Project Milestones"
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Timeline>
              {projectData.milestones.map((milestone) => (
                <Timeline.Item
                  key={milestone.id}
                  dot={
                    milestone.status === 'completed' ? (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    ) : milestone.status === 'in-progress' ? (
                      <ClockCircleOutlined style={{ color: '#1890ff' }} />
                    ) : (
                      <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                    )
                  }
                  color={
                    milestone.status === 'completed' ? 'green' :
                    milestone.status === 'in-progress' ? 'blue' : 'gray'
                  }
                >
                  <div>
                    <Text strong>{milestone.title}</Text>
                    <br />
                    <Text type="secondary">{milestone.date}</Text>
                    <br />
                    <Text>{milestone.description}</Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>

        {/* Right Column */}
        <Col xs={24} lg={8}>
          {/* Project Manager */}
          <Card
            title="Project Manager"
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ textAlign: 'center' }}>
                <Avatar size={64} icon={<UserOutlined />} style={{ marginBottom: '12px' }} />
                <div>
                  <Text strong style={{ fontSize: '16px' }}>{projectData.manager.name}</Text>
                  <br />
                  <Text type="secondary">{projectData.manager.email}</Text>
                </div>
              </div>
            </Space>
          </Card>

          {/* Team Members */}
          <Card
            title="Team Members"
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {projectData.team.map((member, index) => (
                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar icon={<UserOutlined />} />
                  <div>
                    <Text strong>{member.name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{member.role}</Text>
                  </div>
                </div>
              ))}
            </Space>
          </Card>

          {/* Recent Activity */}
          <Card
            title="Recent Activity"
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Timeline size="small">
              {projectData.recentActivity.map((activity) => (
                <Timeline.Item
                  key={activity.id}
                  dot={getActivityIcon(activity.type)}
                >
                  <div>
                    <Text strong style={{ fontSize: '13px' }}>{activity.title}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      by {activity.user} • {activity.timestamp}
                    </Text>
                    <br />
                    <Text style={{ fontSize: '12px' }}>{activity.description}</Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default ProjectDetail
