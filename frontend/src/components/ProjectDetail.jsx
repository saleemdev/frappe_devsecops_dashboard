import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
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
  Space,
  Table,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tooltip
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  PlusOutlined,
  CopyOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import {
  getProjectDetails,
  getProjectUsers,
  getProjectRecentActivity,
  getProjectMilestones,
  createProjectTask,
  getTaskTypes,
  formatDate,
  searchUsers,
  getProjectMetrics
} from '../utils/projectAttachmentsApi'

const { Title, Text } = Typography

const ProjectDetail = ({ projectId, navigateToRoute }) => {
  const [loading, setLoading] = useState(true)
  const [projectData, setProjectData] = useState(null)
  const [projectManager, setProjectManager] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [recentActivity, setRecentActivity] = useState([])
  const [milestones, setMilestones] = useState([])
  const [metrics, setMetrics] = useState(null)
  const [error, setError] = useState(null)
  const [showNewTaskModal, setShowNewTaskModal] = useState(false)
  const [taskFormLoading, setTaskFormLoading] = useState(false)
  const [form] = Form.useForm()
  const [taskTypeOptions, setTaskTypeOptions] = useState([])
  const [userSearchResults, setUserSearchResults] = useState([])

  // Fetch task types when modal opens
  useEffect(() => {
    if (showNewTaskModal) {
      loadTaskTypes()
    }
  }, [showNewTaskModal])

  const loadTaskTypes = async () => {
    try {
      const response = await getTaskTypes()
      if (response.success && response.task_types) {
        const options = response.task_types.map(type => ({
          label: type.name,
          value: type.name
        }))
        setTaskTypeOptions(options)
      }
    } catch (error) {

    }
  }

  // Copy ZenHub ID to clipboard
  const handleCopyZenHubId = async () => {
    const zenHubId = projectData?.zenhub_id || projectData?.zenHubId
    if (!zenHubId) {
      await Swal.fire({
        icon: 'warning',
        title: 'No ZenHub ID available',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
      return
    }
    try {
      await navigator.clipboard.writeText(zenHubId)
      await Swal.fire({
        icon: 'success',
        title: 'ZenHub ID copied to clipboard',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } catch (error) {

      await Swal.fire({
        icon: 'error',
        title: 'Failed to copy ZenHub ID',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    }
  }

  // Helper function to strip HTML tags from content
  const stripHtmlTags = (html) => {
    if (!html) return ''
    const temp = document.createElement('div')
    temp.innerHTML = html
    return temp.textContent || temp.innerText || ''
  }

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  const loadProjectData = async () => {
    setLoading(true)
    setError(null)
    try {
      // Fetch project details
      const projectResponse = await getProjectDetails(projectId)
      if (projectResponse.success && projectResponse.project) {
        setProjectData(projectResponse.project)
      } else {
        setError(projectResponse.error || 'Failed to load project details')
        message.error(projectResponse.error || 'Failed to load project details')
      }

      // Fetch project users
      try {
        const usersResponse = await getProjectUsers(projectId)
        if (usersResponse.success) {
          setProjectManager(usersResponse.project_manager)
          setTeamMembers(usersResponse.team_members || [])
        }
      } catch (err) {

      }

      // Fetch recent activity
      try {
        const activityResponse = await getProjectRecentActivity(projectId, 10)
        if (activityResponse.success) {
          setRecentActivity(activityResponse.recent_activity || [])
        }
      } catch (err) {

      }

      // Fetch milestones
      try {
        const milestonesResponse = await getProjectMilestones(projectId)
        if (milestonesResponse.success) {
          setMilestones(milestonesResponse.milestones || [])
        }
      } catch (err) {

      }

      // Fetch project metrics
      try {
        const metricsResponse = await getProjectMetrics(projectId)
        if (metricsResponse.success && metricsResponse.metrics) {
          setMetrics(metricsResponse.metrics)
        }
      } catch (err) {

      }
    } catch (error) {

      setError('Failed to load project data')
      message.error('Failed to load project data')
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

  const handleOpenNewTaskModal = () => {
    form.resetFields()
    setShowNewTaskModal(true)
  }

  const handleCloseNewTaskModal = () => {
    setShowNewTaskModal(false)
    form.resetFields()
  }

  const handleUserSearch = async (searchValue) => {
    if (!searchValue) {
      setUserSearchResults([])
      return
    }
    try {
      const results = await searchUsers(searchValue)
      if (results && results.length > 0) {
        setUserSearchResults(results)
      }
    } catch (error) {

    }
  }

  const handleCreateTask = async (values) => {
    // Show confirmation dialog
    const confirmResult = await Swal.fire({
      title: 'Create New Task?',
      html: `
        <div style="text-align: left; margin: 20px 0;">
          <p><strong>Subject:</strong> ${values.subject}</p>
          <p><strong>Priority:</strong> ${values.priority || 'Medium'}</p>
          <p><strong>Status:</strong> ${values.status || 'Open'}</p>
          ${values.task_type ? `<p><strong>Type:</strong> ${values.task_type}</p>` : ''}
          ${values.exp_end_date ? `<p><strong>Due Date:</strong> ${values.exp_end_date.format('YYYY-MM-DD')}</p>` : ''}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes, Create Task',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1890ff',
      cancelButtonColor: '#d9d9d9'
    })

    // If user cancelled, do nothing
    if (!confirmResult.isConfirmed) {
      return
    }

    setTaskFormLoading(true)
    try {
      const taskData = {
        subject: values.subject,
        description: values.description || '',
        priority: values.priority || 'Medium',
        status: values.status || 'Open',
        task_type: values.task_type,
        exp_start_date: values.exp_start_date ? values.exp_start_date.format('YYYY-MM-DD') : null,
        exp_end_date: values.exp_end_date ? values.exp_end_date.format('YYYY-MM-DD') : null,
        assigned_to: values.assigned_to,
        is_milestone: values.is_milestone ? 1 : 0
      }

      const response = await createProjectTask(projectId, taskData)

      if (response.success) {
        // Show success toast
        await Swal.fire({
          icon: 'success',
          title: 'Task created successfully',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
        handleCloseNewTaskModal()
        // Reload project data to show the new task
        loadProjectData()
      } else {
        // Show error toast
        await Swal.fire({
          icon: 'error',
          title: response.error || 'Failed to create task',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      }
    } catch (error) {

      // Show error toast
      await Swal.fire({
        icon: 'error',
        title: 'Failed to create task',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } finally {
      setTaskFormLoading(false)
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
        <Row justify="space-between" align="middle" style={{ marginBottom: '16px' }}>
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('projects')}
                style={{ marginBottom: '8px' }}
              >
                Back to Projects
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                {projectData?.name || projectData?.project_name || 'Project'}
              </Title>
              <Tag color={getStatusColor(projectData?.project_status || projectData?.status)}>
                {projectData?.project_status || projectData?.status || 'Unknown'}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => navigateToRoute('project-edit', projectId)}
              >
                Edit Project
              </Button>
              <Button type="default" icon={<PlusOutlined />} onClick={handleOpenNewTaskModal}>
                New Task
              </Button>
            </Space>
          </Col>
        </Row>

        {/* ZenHub ID and Sprint Report Row */}
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12}>
            <Space>
              <Text type="secondary">ZenHub ID:</Text>
              <Text strong>{projectData?.zenhub_id || projectData?.zenHubId || 'N/A'}</Text>
              {(projectData?.zenhub_id || projectData?.zenHubId) && (
                <Tooltip title="Copy ZenHub ID to clipboard">
                  <Button
                    type="text"
                    size="small"
                    icon={<CopyOutlined />}
                    onClick={handleCopyZenHubId}
                  />
                </Tooltip>
              )}
            </Space>
          </Col>
          <Col xs={24} sm={12} style={{ textAlign: 'right' }}>
            <Button
              type="default"
              icon={<BarChartOutlined />}
              onClick={() => {
                // Sprint Report functionality to be implemented
                Swal.fire({
                  icon: 'info',
                  title: 'Sprint Report',
                  text: 'Sprint Report feature coming soon',
                  toast: true,
                  position: 'top-end',
                  showConfirmButton: false,
                  timer: 3000
                })
              }}
            >
              Sprint Report
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Project Overview Cards - Improved Visual Hierarchy */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        {/* Total Tasks */}
        <div style={{
          flex: '1 1 calc(20% - 10px)',
          minWidth: '100px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '16px 12px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        >
          <div style={{ fontSize: '24px', color: '#52c41a' }}>
            <CheckCircleOutlined />
          </div>
          <div style={{ fontSize: '11px', color: '#999', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Total Tasks</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#1890ff', lineHeight: '1' }}>
            {metrics?.total_tasks || 0}
          </div>
        </div>

        {/* Completed Tasks */}
        <div style={{
          flex: '1 1 calc(20% - 10px)',
          minWidth: '100px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '16px 12px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        >
          <div style={{ fontSize: '24px', color: '#52c41a' }}>
            <CheckCircleOutlined />
          </div>
          <div style={{ fontSize: '11px', color: '#999', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Completed</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#52c41a', lineHeight: '1' }}>
            {metrics?.completed_tasks || 0}
          </div>
        </div>

        {/* In Progress */}
        <div style={{
          flex: '1 1 calc(20% - 10px)',
          minWidth: '100px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '16px 12px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        >
          <div style={{ fontSize: '24px', color: '#faad14' }}>
            <ClockCircleOutlined />
          </div>
          <div style={{ fontSize: '11px', color: '#999', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>In Progress</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#faad14', lineHeight: '1' }}>
            {metrics?.in_progress_tasks || 0}
          </div>
        </div>

        {/* Completion Rate */}
        <div style={{
          flex: '1 1 calc(20% - 10px)',
          minWidth: '100px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '16px 12px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        >
          <div style={{ fontSize: '24px', color: '#722ed1' }}>
            <ExclamationCircleOutlined />
          </div>
          <div style={{ fontSize: '11px', color: '#999', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Completion Rate</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#722ed1', lineHeight: '1' }}>
            {metrics?.completion_rate || 0}%
          </div>
        </div>

        {/* Team Members */}
        <div style={{
          flex: '1 1 calc(20% - 10px)',
          minWidth: '100px',
          backgroundColor: '#fff',
          border: '1px solid #e8e8e8',
          borderRadius: '8px',
          padding: '16px 12px',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
          transition: 'all 0.3s ease',
          cursor: 'pointer'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)'
          e.currentTarget.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.05)'
          e.currentTarget.style.transform = 'translateY(0)'
        }}
        >
          <div style={{ fontSize: '24px', color: '#fa8c16' }}>
            <UserOutlined />
          </div>
          <div style={{ fontSize: '11px', color: '#999', fontWeight: '500', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Team Members</div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#fa8c16', lineHeight: '1' }}>
            {teamMembers.length + (projectManager ? 1 : 0)}
          </div>
        </div>
      </div>

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
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Status</Text>
                  <Tag color={getStatusColor(projectData?.project_status || projectData?.status)} style={{ fontSize: '14px' }}>
                    {projectData?.project_status || projectData?.status || 'Unknown'}
                  </Tag>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Priority</Text>
                  <Tag color={getPriorityColor(projectData?.priority)} style={{ fontSize: '14px' }}>
                    {projectData?.priority || 'Normal'}
                  </Tag>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Start Date</Text>
                  <Text><CalendarOutlined /> {projectData?.expected_start_date || projectData?.actual_start_date || 'N/A'}</Text>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">End Date</Text>
                  <Text><CalendarOutlined /> {projectData?.expected_end_date || projectData?.actual_end_date || 'N/A'}</Text>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Client</Text>
                  <Text>{projectData?.client || 'N/A'}</Text>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small">
                  <Text type="secondary">Department</Text>
                  <Text>{projectData?.department || 'N/A'}</Text>
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
            {projectData?.tasks && projectData.tasks.length > 0 ? (
              <Table
                columns={taskColumns}
                dataSource={projectData.tasks.map((task, idx) => ({
                  key: task.name || idx,
                  name: task.subject || task.name,
                  description: task.description || '',
                  assignee: task.owner || 'Unassigned',
                  status: task.status || 'Open',
                  priority: task.priority || 'Normal',
                  dueDate: task.exp_end_date || 'N/A'
                }))}
                pagination={{ pageSize: 10 }}
                size="middle"
              />
            ) : (
              <Empty description="No tasks found" />
            )}
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
            {milestones && milestones.length > 0 ? (
              <Timeline>
                {milestones.map((milestone) => (
                  <Timeline.Item
                    key={milestone.name}
                    dot={
                      milestone.status === 'Completed' ? (
                        <CheckCircleOutlined style={{ color: '#52c41a' }} />
                      ) : milestone.status === 'In Progress' ? (
                        <ClockCircleOutlined style={{ color: '#1890ff' }} />
                      ) : (
                        <ExclamationCircleOutlined style={{ color: '#faad14' }} />
                      )
                    }
                    color={
                      milestone.status === 'Completed' ? 'green' :
                      milestone.status === 'In Progress' ? 'blue' : 'gray'
                    }
                  >
                    <div>
                      <Text strong>{milestone.subject}</Text>
                      <br />
                      <Text type="secondary">{milestone.exp_end_date || 'N/A'}</Text>
                      <br />
                      <Tag color={getStatusColor(milestone.status)}>{milestone.status}</Tag>
                      <Progress
                        percent={milestone.progress || 0}
                        size="small"
                        style={{ marginTop: '8px', width: '200px' }}
                      />
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="No milestones found" />
            )}
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
            {projectManager ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ textAlign: 'center' }}>
                  <Avatar
                    size={64}
                    src={projectManager.image}
                    icon={<UserOutlined />}
                    style={{ marginBottom: '12px' }}
                  />
                  <div>
                    <Text strong style={{ fontSize: '16px' }}>{projectManager.full_name}</Text>
                    <br />
                    <Text type="secondary">{projectManager.email}</Text>
                  </div>
                </div>
              </Space>
            ) : (
              <Empty description="No project manager assigned" />
            )}
          </Card>

          {/* Team Members */}
          <Card
            title={`Team Members (${teamMembers.length})`}
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            {teamMembers && teamMembers.length > 0 ? (
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                {teamMembers.map((member, index) => (
                  <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Avatar
                      src={member.image}
                      icon={<UserOutlined />}
                    />
                    <div>
                      <Text strong>{member.full_name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>{member.email}</Text>
                    </div>
                  </div>
                ))}
              </Space>
            ) : (
              <Empty description="No team members assigned" />
            )}
          </Card>

          {/* Recent Activity */}
          <Card
            title="Recent Activity"
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            {recentActivity && recentActivity.length > 0 ? (
              <Timeline size="small">
                {recentActivity.map((activity) => (
                  <Timeline.Item
                    key={activity.name}
                    dot={<FileTextOutlined style={{ color: '#1890ff' }} />}
                  >
                    <div>
                      <Text strong style={{ fontSize: '13px' }}>
                        {activity.reference_doctype}
                      </Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        by {activity.owner_name || activity.owner} • {formatDate(activity.creation)}
                      </Text>
                      <br />
                      <Text style={{ fontSize: '12px' }}>
                        {stripHtmlTags(activity.content).substring(0, 100)}...
                      </Text>
                    </div>
                  </Timeline.Item>
                ))}
              </Timeline>
            ) : (
              <Empty description="No recent activity" />
            )}
          </Card>
        </Col>
      </Row>

      {/* New Task Modal */}
      <Modal
        title="Create New Task"
        open={showNewTaskModal}
        onCancel={handleCloseNewTaskModal}
        width={1000}
        okText="Create Task"
        cancelText="Cancel"
        confirmLoading={taskFormLoading}
        onOk={() => form.submit()}
        style={{ minWidth: '300px' }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateTask}
          autoComplete="off"
        >
          <Form.Item
            label="Task Subject"
            name="subject"
            rules={[{ required: true, message: 'Please enter task subject' }]}
          >
            <Input placeholder="Enter task subject" />
          </Form.Item>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Task Type"
                name="task_type"
              >
                <Select
                  placeholder="Select task type"
                  options={taskTypeOptions}
                  loading={taskTypeOptions.length === 0}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Priority"
                name="priority"
                initialValue="Medium"
                rules={[{ required: true, message: 'Please select priority' }]}
              >
                <Select
                  placeholder="Select priority"
                  options={[
                    { label: 'Low', value: 'Low' },
                    { label: 'Medium', value: 'Medium' },
                    { label: 'High', value: 'High' },
                    { label: 'Urgent', value: 'Urgent' }
                  ]}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Status"
                name="status"
                initialValue="Open"
              >
                <Select
                  placeholder="Select status"
                  options={[
                    { label: 'Open', value: 'Open' },
                    { label: 'Working', value: 'Working' },
                    { label: 'Pending Review', value: 'Pending Review' },
                    { label: 'Overdue', value: 'Overdue' },
                    { label: 'Template', value: 'Template' },
                    { label: 'Completed', value: 'Completed' },
                    { label: 'Cancelled', value: 'Cancelled' }
                  ]}
                />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Assigned To"
                name="assigned_to"
              >
                <Select
                  placeholder="Search and select user"
                  onSearch={handleUserSearch}
                  filterOption={false}
                  options={userSearchResults.map(user => ({
                    label: user.full_name || user.name,
                    value: user.name
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Expected Start Date"
                name="exp_start_date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col xs={24} sm={12}>
              <Form.Item
                label="Expected End Date"
                name="exp_end_date"
              >
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            label="Description"
            name="description"
          >
            <Input.TextArea
              placeholder="Enter task description"
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default ProjectDetail
