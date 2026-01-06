import { useState, useEffect } from 'react'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
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
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Tooltip,
  Checkbox,
  message,
  Steps,
  Upload,
  Popconfirm,
  List,
  Collapse,
  Divider,
  Alert,
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  UserOutlined,
  PlusOutlined,
  CopyOutlined,
  BarChartOutlined,
  LoadingOutlined,
  LockOutlined,
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  PaperClipOutlined,
  TeamOutlined,
  PrinterOutlined,
  SyncOutlined,
  ClockCircleOutlined as TimelineIcon,
  FlagOutlined,
  ShoppingOutlined,
  FileProtectOutlined
} from '@ant-design/icons'
import useAuthStore from '../stores/authStore'
import {
  getProjectDetails,
  getProjectUsers,
  getProjectRecentActivity,
  getProjectMilestones,
  createProjectTask,
  getTaskTypes,
  formatDate,
  formatDateWithRelativeTime,
  searchUsers,
  getProjectMetrics,
  getProjectFiles,
  uploadProjectFile,
  deleteProjectFile,
  formatFileSize,
  getFileIcon,
  addProjectUser
} from '../utils/projectAttachmentsApi'
import projectsService from '../services/api/projects'
import {
  groupTasksByType,
  getTaskTypeStatus,
  getTaskTypeStatusColor,
  getTaskTypeStatusIconType
} from '../utils/taskProgressionUtils'
import SprintReportDialog from './SprintReportDialog'
import EnhancedTaskDialog from './EnhancedTaskDialog'
import ProjectRecentActivity from './ProjectRecentActivity'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const ProjectDetail = ({ projectId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const { hasWritePermission } = useAuthStore()
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
  const [showSprintReport, setShowSprintReport] = useState(false)
  const [notesExpanded, setNotesExpanded] = useState(false)  // For notes expand/collapse
  const [canEditProject, setCanEditProject] = useState(true)
  const [checkingProjectPermissions, setCheckingProjectPermissions] = useState(true)
  const [attachments, setAttachments] = useState([])
  const [attachmentsLoading, setAttachmentsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [showAllTeamMembers, setShowAllTeamMembers] = useState(false)
  const [showEditTaskModal, setShowEditTaskModal] = useState(false)
  const [editingTask, setEditingTask] = useState(null)
  const [editTaskFormLoading, setEditTaskFormLoading] = useState(false)
  const [editForm] = Form.useForm()
  const [syncingUsers, setSyncingUsers] = useState(false)

  // Enhanced Task Dialog state
  const [taskDialogOpen, setTaskDialogOpen] = useState(false)
  const [taskDialogMode, setTaskDialogMode] = useState('create') // 'create', 'edit', or 'view'
  const [selectedTask, setSelectedTask] = useState(null)

  // Fetch task types when modal opens
  useEffect(() => {
    if (taskDialogOpen) {
      loadTaskTypes()
    }
  }, [taskDialogOpen])

  // Check write permissions on mount
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        console.log('[RBAC DEBUG] ProjectDetail: Starting permission check for Project')
        setCheckingProjectPermissions(true)
        const hasWrite = await hasWritePermission('Project')
        console.log('[RBAC DEBUG] ProjectDetail: Permission check result:', hasWrite)
        console.log('[RBAC DEBUG] ProjectDetail: Setting canEditProject to:', hasWrite)
        setCanEditProject(hasWrite)
      } catch (error) {
        console.error('[RBAC DEBUG] ProjectDetail: Error checking project permissions:', error)
        setCanEditProject(false)
      } finally {
        setCheckingProjectPermissions(false)
      }
    }

    checkPermissions()
  }, [hasWritePermission])

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
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(zenHubId)
      } else {
        // Fallback for browsers that don't support clipboard API
        const textArea = document.createElement('textarea')
        textArea.value = zenHubId
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }

      await Swal.fire({
        icon: 'success',
        title: 'ZenHub ID copied to clipboard',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } catch (error) {
      console.error('Error copying ZenHub ID:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Failed to copy ZenHub ID',
        text: error.message || 'Please copy manually',
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
      console.log('[ProjectDetail] Project response:', projectResponse)

      if (projectResponse.success && projectResponse.project) {
        console.log('[ProjectDetail] Setting project data with tasks:', projectResponse.project.tasks?.length || 0)
        setProjectData(projectResponse.project)
      } else {
        const errorMsg = projectResponse.error || 'Failed to load project details'
        console.error('[ProjectDetail] Project fetch failed:', errorMsg)
        setError(errorMsg)
        message.error(errorMsg)
      }

      // Fetch project users
      try {
        const usersResponse = await getProjectUsers(projectId)
        if (usersResponse.success) {
          setProjectManager(usersResponse.project_manager)
          setTeamMembers(usersResponse.team_members || [])
        }
      } catch (err) {
        console.error('[ProjectDetail] Error fetching users:', err)
      }

      // Fetch recent activity
      try {
        const activityResponse = await getProjectRecentActivity(projectId, 10)
        if (activityResponse.success) {
          setRecentActivity(activityResponse.recent_activity || [])
        }
      } catch (err) {
        console.error('[ProjectDetail] Error fetching activity:', err)
      }

      // Fetch milestones
      try {
        const milestonesResponse = await getProjectMilestones(projectId)
        if (milestonesResponse.success) {
          setMilestones(milestonesResponse.milestones || [])
        }
      } catch (err) {
        console.error('[ProjectDetail] Error fetching milestones:', err)
      }

      // Fetch project metrics
      try {
        const metricsResponse = await getProjectMetrics(projectId)
        if (metricsResponse.success && metricsResponse.metrics) {
          setMetrics(metricsResponse.metrics)
        }
      } catch (err) {
        console.error('[ProjectDetail] Error fetching metrics:', err)
      }

      // Fetch attachments
      try {
        await loadProjectFiles()
      } catch (err) {
        console.error('[ProjectDetail] Error fetching attachments:', err)
      }
    } catch (error) {
      console.error('[ProjectDetail] Unexpected error loading project data:', error)
      setError('Failed to load project data')
      message.error('Failed to load project data')
    } finally {
      setLoading(false)
    }
  }

  const loadProjectFiles = async () => {
    setAttachmentsLoading(true)
    try {
      const result = await getProjectFiles(projectId)
      if (result.success) {
        setAttachments(result.files || [])
      } else {
        console.error('[ProjectDetail] Failed to load attachments:', result.error)
        setAttachments([])
      }
    } catch (error) {
      console.error('[ProjectDetail] Error loading attachments:', error)
      setAttachments([])
    } finally {
      setAttachmentsLoading(false)
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

  // Helper function to truncate notes text
  const truncateNotes = (text, maxLength = 200) => {
    if (!text) return ''
    const cleanText = stripHtmlTags(text)
    if (cleanText.length <= maxLength) return cleanText
    return cleanText.substring(0, maxLength) + '...'
  }

  // Helper function to check if notes should be truncated
  const shouldTruncateNotes = (text, maxLength = 200) => {
    if (!text) return false
    const cleanText = stripHtmlTags(text)
    return cleanText.length > maxLength
  }

  // Helper function to determine milestone status for Steps component
  const getMilestoneStepStatus = (milestone) => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const expEndDate = milestone.exp_end_date ? new Date(milestone.exp_end_date) : null
    if (expEndDate) {
      expEndDate.setHours(0, 0, 0, 0)
    }

    const status = milestone.status?.toLowerCase() || 'open'

    // Completed status takes priority
    if (status === 'completed') {
      return 'finish'
    }

    // Check if overdue (exp_end_date < today AND not completed)
    if (expEndDate && expEndDate < today && status !== 'completed') {
      return 'error'
    }

    // Cancelled status
    if (status === 'cancelled') {
      return 'error'
    }

    // In progress status
    if (status === 'working' || status === 'in progress' || status === 'in-progress') {
      return 'process'
    }

    // Default to wait (pending/open)
    return 'wait'
  }

  // Helper function to get milestone icon based on status
  const getMilestoneIcon = (milestone) => {
    const status = getMilestoneStepStatus(milestone)

    switch (status) {
      case 'finish':
        return <CheckCircleOutlined />
      case 'process':
        return <ClockCircleOutlined />
      case 'error':
        return <ExclamationCircleOutlined />
      case 'wait':
      default:
        return <CalendarOutlined />
    }
  }

  // Helper function to format date for display
  const formatMilestoneDate = (dateString) => {
    if (!dateString) return 'N/A'
    try {
      const date = new Date(dateString)
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  const handleOpenNewTaskModal = () => {
    setTaskDialogMode('create')
    setSelectedTask(null)
    setTaskDialogOpen(true)
    form.resetFields()
  }

  const handleCloseNewTaskModal = () => {
    setTaskDialogOpen(false)
    setSelectedTask(null)
    form.resetFields()
  }

  const handleOpenTaskView = (task) => {
    setTaskDialogMode('view')
    setSelectedTask(task)
    setTaskDialogOpen(true)
  }

  const handleOpenTaskEdit = (task) => {
    setTaskDialogMode('edit')
    setSelectedTask(task)
    setTaskDialogOpen(true)
  }

  const handleUserSearch = async (searchValue) => {
    if (!searchValue) {
      setUserSearchResults([])
      return
    }
    try {
      const results = await searchUsers(searchValue)
      if (results && results.users && results.users.length > 0) {
        setUserSearchResults(results.users)
      } else {
        setUserSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setUserSearchResults([])
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
          ${values.is_milestone ? `<p><strong>Milestone:</strong> Yes</p>` : ''}
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
        exp_start_date: values.exp_start_date || null,
        exp_end_date: values.exp_end_date || null,
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

  const handleEditTask = (task) => {
    // Use the new enhanced dialog
    setTaskDialogMode('edit')
    setSelectedTask(task)
    setTaskDialogOpen(true)

    // Keep old state for backward compatibility
    setEditingTask(task)
    editForm.setFieldsValue({
      subject: task.subject,
      status: task.status,
      priority: task.priority,
      description: task.description,
      exp_start_date: task.exp_start_date ? dayjs(task.exp_start_date) : null,
      exp_end_date: task.exp_end_date ? dayjs(task.exp_end_date) : null,
      progress: task.progress || 0,
      is_milestone: task.is_milestone === 1 || task.is_milestone === true
    })
  }

  const handleCloseEditTaskModal = () => {
    setShowEditTaskModal(false)
    setEditingTask(null)
    editForm.resetFields()
  }

  const handleUpdateTask = async (values) => {
    // Use selectedTask (new dialog) or editingTask (old modal) for backward compatibility
    const taskToUpdate = selectedTask || editingTask
    if (!taskToUpdate) return

    setEditTaskFormLoading(true)
    try {
      const { updateTask } = await import('../utils/projectAttachmentsApi.js')

      const taskData = {
        subject: values.subject,
        status: values.status,
        priority: values.priority,
        description: values.description || '',
        exp_start_date: values.exp_start_date || null,
        exp_end_date: values.exp_end_date || null,
        progress: values.progress || 0,
        is_milestone: values.is_milestone ? 1 : 0
      }

      const response = await updateTask(taskToUpdate.name, taskData)

      if (response.success) {
        message.success({
          content: (
            <span>
              <span style={{ marginRight: '8px' }}>✅</span>
              <strong>Task updated successfully!</strong>
              <span style={{ marginLeft: '8px', fontSize: '12px', color: '#52c41a' }}>
                All changes saved
              </span>
            </span>
          ),
          duration: 3,
          style: {
            marginTop: '20vh',
          }
        })
        handleCloseNewTaskModal() // Close the enhanced dialog
        handleCloseEditTaskModal() // Close old modal if open
        loadProjectData()
      } else {
        message.error(response.error || 'Failed to update task')
      }
    } catch (error) {
      message.error('Failed to update task')
      console.error('[ProjectDetail] Task update error:', error)
    } finally {
      setEditTaskFormLoading(false)
    }
  }

  const handleFileUpload = async (file) => {
    setUploading(true)
    try {
      const result = await uploadProjectFile(projectId, file)
      if (result.success) {
        message.success('File uploaded successfully')
        await loadProjectFiles()
      } else {
        const errorMsg = result.error || 'Failed to upload file'
        message.error(errorMsg)
      }
    } catch (error) {
      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to upload file'
      message.error(`Error uploading file: ${errorMsg}`)
      console.error('[ProjectDetail] File upload error:', error)
    } finally {
      setUploading(false)
    }
    return false // Prevent default upload
  }

  const handleDeleteFile = async (fileName) => {
    try {
      const result = await deleteProjectFile(fileName)
      if (result.success) {
        message.success('File deleted successfully')
        await loadProjectFiles()
      } else {
        const errorMsg = result.error || 'Failed to delete file'
        message.error(errorMsg)
      }
    } catch (error) {
      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to delete file'
      message.error(`Error deleting file: ${errorMsg}`)
      console.error('[ProjectDetail] File delete error:', error)
    }
  }

  const handleSyncUsersFromProduct = async () => {
    if (!projectData?.custom_software_product) {
      message.warning('No Software Product linked to this project')
      return
    }

    setSyncingUsers(true)
    try {
      console.log('[ProjectDetail] Fetching team members from Software Product:', projectData.custom_software_product)

      // Fetch team members from Software Product
      const response = await projectsService.getSoftwareProductTeamMembers(projectData.custom_software_product)

      if (!response.success) {
        message.error(response.error || 'Failed to fetch Software Product team members')
        return
      }

      const productMembers = response.team_members || []

      if (productMembers.length === 0) {
        message.info('No team members found in the Software Product')
        return
      }

      // Get current project members
      const currentMemberEmails = teamMembers.map(m => m.email)
      const managerEmail = projectManager?.email

      // Filter out members already in project
      const newMembers = productMembers.filter(m =>
        m.email !== managerEmail && !currentMemberEmails.includes(m.email)
      )

      if (newMembers.length === 0) {
        message.info('All Software Product team members are already in the project')
        return
      }

      // Add each new member to project
      let successCount = 0
      let errorCount = 0

      for (const member of newMembers) {
        try {
          const result = await addProjectUser(
            projectId,
            member.user,
            {
              business_function: member.business_function,
              custom_is_change_approver: 0,  // Default to false
              welcome_email_sent: 1
            }
          )

          if (result.success) {
            successCount++
          } else {
            errorCount++
            console.error('[ProjectDetail] Failed to add user:', member.user, result.error)
          }
        } catch (error) {
          errorCount++
          console.error('[ProjectDetail] Error adding user:', member.user, error)
        }
      }

      // Refresh project users
      const usersResponse = await getProjectUsers(projectId)
      if (usersResponse.success) {
        setProjectManager(usersResponse.project_manager)
        setTeamMembers(usersResponse.team_members || [])
      }

      // Show summary message
      if (successCount > 0 && errorCount === 0) {
        await Swal.fire({
          icon: 'success',
          title: `Successfully synced ${successCount} user${successCount > 1 ? 's' : ''}`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      } else if (successCount > 0 && errorCount > 0) {
        message.warning(`Synced ${successCount} users, ${errorCount} failed`)
      } else {
        message.error('Failed to sync users')
      }

    } catch (error) {
      console.error('[ProjectDetail] Error syncing users:', error)
      message.error('An error occurred while syncing users')
    } finally {
      setSyncingUsers(false)
    }
  }

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
        {/* Header Section with Navigation and Actions */}
        <Row justify="space-between" align="middle" style={{ marginBottom: '24px' }}>
          <Col>
            <Space direction="vertical" size={0}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('projects')}
                style={{ marginBottom: '12px', padding: '0 0' }}
              >
                Back to Projects
              </Button>
              <Title level={2} style={{ margin: 0, marginBottom: '8px' }}>
                {projectData?.name || projectData?.project_name || 'Project'}
              </Title>
              <Tag color={getStatusColor(projectData?.project_status || projectData?.status)} style={{ fontSize: '12px', padding: '4px 12px' }}>
                {projectData?.project_status || projectData?.status || 'Unknown'}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Space size="middle">
              <Tooltip title={canEditProject ? "Edit Project" : "You don't have permission to edit Projects"}>
                <Button
                  type="primary"
                  icon={canEditProject ? <EditOutlined /> : <LockOutlined />}
                  onClick={() => navigateToRoute('project-edit', projectId)}
                  disabled={!canEditProject}
                >
                  Edit Project
                </Button>
              </Tooltip>
              <Button type="default" icon={<PlusOutlined />} onClick={handleOpenNewTaskModal}>
                New Task
              </Button>
              <Button
                type="default"
                icon={<PrinterOutlined />}
                onClick={() => {
                  try {
                    const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Project&name=${encodeURIComponent(projectId)}&format=Standard&no_letterhead=0`
                    window.open(pdfUrl, '_blank')
                    message.success('PDF download started')
                  } catch (error) {
                    console.error('[ProjectDetail] Error printing PDF:', error)
                    message.error('Failed to download PDF')
                  }
                }}
              >
                Print
              </Button>
            </Space>
          </Col>
        </Row>

        {/* Permission Alert Banner */}
        {!canEditProject && !checkingProjectPermissions && (
          <Alert
            message="Read-Only Access"
            description="You have read-only access to this project. Only Administrator or Project Manager roles can edit projects and tasks."
            type="info"
            showIcon
            icon={<LockOutlined />}
            style={{ marginBottom: '16px', marginTop: '16px' }}
            closable
          />
        )}

        {/* Notes/Description Section */}
        {projectData?.notes && projectData.notes.trim() && (
          <Row gutter={[16, 16]} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
            <Col xs={24}>
              <div style={{
                backgroundColor: '#fafafa',
                border: '1px solid #e8e8e8',
                borderRadius: '6px',
                padding: '12px 16px',
                transition: 'all 0.3s ease'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                      Description
                    </Text>
                    <div style={{ marginTop: '8px', lineHeight: '1.6', color: '#262626' }}>
                      {notesExpanded ? (
                        <Text>{stripHtmlTags(projectData.notes)}</Text>
                      ) : (
                        <Text>{truncateNotes(projectData.notes, 200)}</Text>
                      )}
                    </div>
                  </div>
                </div>
                {shouldTruncateNotes(projectData.notes, 200) && (
                  <div style={{ marginTop: '8px' }}>
                    <Button
                      type="text"
                      size="small"
                      onClick={() => {
                        console.log('[ProjectDetail] Toggling notes expanded state')
                        setNotesExpanded(!notesExpanded)
                      }}
                      style={{ padding: '0 0', height: 'auto', color: getHeaderIconColor(token) }}
                    >
                      {notesExpanded ? 'Show less' : 'Show more'}
                    </Button>
                  </div>
                )}
              </div>
            </Col>
          </Row>
        )}

        {/* Attachments Section - Email-style minimalist design */}
        <Row gutter={[16, 16]} style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #f0f0f0' }}>
          <Col xs={24}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <Space size={4} align="center">
                  <PaperClipOutlined style={{ fontSize: '14px', color: '#8c8c8c' }} />
                  <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Attachments
                  </Text>
                  {attachments.length > 0 && (
                    <Text type="secondary" style={{ fontSize: '11px' }}>
                      ({attachments.length})
                    </Text>
                  )}
                </Space>
                <Upload
                  beforeUpload={handleFileUpload}
                  multiple
                  disabled={uploading}
                  showUploadList={false}
                >
                  <Button
                    size="small"
                    type="text"
                    icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
                    loading={uploading}
                    style={{ fontSize: '12px', height: '24px', padding: '0 8px' }}
                  >
                    {uploading ? 'Uploading...' : 'Attach'}
                  </Button>
                </Upload>
              </div>

              {/* Files List - Email attachment style */}
              {attachmentsLoading ? (
                <div style={{ padding: '12px 0' }}>
                  <Spin size="small" />
                </div>
              ) : attachments && attachments.length > 0 ? (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {attachments.map((file) => (
                    <div
                      key={file.name}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '6px 10px',
                        backgroundColor: '#fafafa',
                        border: '1px solid #e8e8e8',
                        borderRadius: '6px',
                        fontSize: '12px',
                        transition: 'all 0.2s ease',
                        cursor: 'pointer',
                        maxWidth: '250px'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.backgroundColor = '#f0f0f0'
                        e.currentTarget.style.borderColor = '#d9d9d9'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.backgroundColor = '#fafafa'
                        e.currentTarget.style.borderColor = '#e8e8e8'
                      }}
                    >
                      <span style={{ fontSize: '14px', flexShrink: 0 }}>
                        {getFileIcon(file.file_name || file.name)}
                      </span>
                      <a
                        href={file.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          color: '#262626',
                          textDecoration: 'none',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                          flex: 1,
                          minWidth: 0
                        }}
                        title={file.file_name || file.name}
                      >
                        {file.file_name || file.name}
                      </a>
                      <Text type="secondary" style={{ fontSize: '11px', flexShrink: 0 }}>
                        {formatFileSize(file.file_size)}
                      </Text>
                      <Space size={2} style={{ flexShrink: 0 }}>
                        <Tooltip title="Download">
                          <a
                            href={file.file_url}
                            download
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="text"
                              size="small"
                              icon={<DownloadOutlined />}
                              style={{ width: '20px', height: '20px', padding: 0, fontSize: '12px' }}
                            />
                          </a>
                        </Tooltip>
                        <Popconfirm
                          title="Delete File"
                          description="Are you sure?"
                          onConfirm={() => handleDeleteFile(file.name)}
                          okText="Yes"
                          cancelText="No"
                        >
                          <Tooltip title="Delete">
                            <Button
                              type="text"
                              size="small"
                              danger
                              icon={<DeleteOutlined />}
                              style={{ width: '20px', height: '20px', padding: 0, fontSize: '12px' }}
                              onClick={(e) => e.stopPropagation()}
                            />
                          </Tooltip>
                        </Popconfirm>
                      </Space>
                    </div>
                  ))}
                </div>
              ) : (
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  No attachments yet
                </Text>
              )}
            </div>
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
          <div style={{ fontSize: '28px', fontWeight: '700', color: getHeaderIconColor(token), lineHeight: '1' }}>
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

      {/* Project Information Card - Enhanced with Gradient */}
      <Card
        title={
          <Text style={{ fontSize: '14px', fontWeight: '600', color: '#262626' }}>
            Project Information
          </Text>
        }
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          background: 'linear-gradient(90deg, #e6f4ff 0%, #bae0ff 50%, #e6f7ff 100%)'
        }}
        headStyle={{
          borderBottom: '1px solid rgba(255,255,255,0.5)',
          padding: '12px 20px',
          minHeight: 'auto',
          background: 'transparent'
        }}
        bodyStyle={{ padding: '20px' }}
      >
        {/* Row 1: Status, Priority, Timeline */}
        <Row gutter={[32, 20]} style={{ marginBottom: '20px' }}>
          <Col xs={24} sm={8} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '8px' }}>
                Status
              </Text>
              <Tag color={getStatusColor(projectData?.project_status || projectData?.status)} style={{ fontSize: '13px', padding: '2px 10px' }}>
                {projectData?.project_status || projectData?.status || 'Unknown'}
              </Tag>
            </div>
          </Col>
          <Col xs={24} sm={8} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '8px' }}>
                Priority
              </Text>
              <Text style={{
                fontSize: '14px',
                color: projectData?.priority === 'High' ? '#cf1322' : projectData?.priority === 'Medium' ? '#d46b08' : '#262626',
                fontWeight: projectData?.priority === 'High' ? '600' : '500'
              }}>
                {projectData?.priority || '—'}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={8} md={12}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '8px' }}>
                Timeline
              </Text>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: '10px', color: '#bfbfbf', display: 'block' }}>Start</Text>
                  <Text style={{ fontSize: '13px', color: '#262626' }}>
                    {formatDateWithRelativeTime(projectData?.expected_start_date || projectData?.actual_start_date) || '—'}
                  </Text>
                </div>
                <Text type="secondary" style={{ color: '#d9d9d9' }}>→</Text>
                <div>
                  <Text type="secondary" style={{ fontSize: '10px', color: '#bfbfbf', display: 'block' }}>End</Text>
                  <Text style={{ fontSize: '13px', color: '#262626' }}>
                    {formatDateWithRelativeTime(projectData?.expected_end_date || projectData?.actual_end_date) || '—'}
                  </Text>
                </div>
              </div>
            </div>
          </Col>
        </Row>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f5f5f5', marginBottom: '20px' }} />

        {/* Row 2: Client, Department, Software Product, RACI Template */}
        <Row gutter={[32, 20]} style={{ marginBottom: '20px' }}>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '6px' }}>
                Client
              </Text>
              <Text style={{ fontSize: '14px', color: '#262626' }}>
                {projectData?.client || '—'}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '6px' }}>
                Department
              </Text>
              <Text style={{ fontSize: '14px', color: '#262626' }}>
                {projectData?.department || '—'}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '6px' }}>
                Software Product
              </Text>
              <Text style={{ fontSize: '14px', color: '#262626' }}>
                {projectData?.custom_software_product || '—'}
              </Text>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '6px' }}>
                RACI Template
              </Text>
              <Text style={{ fontSize: '14px', color: '#262626' }}>
                {projectData?.custom_default_raci_template || '—'}
              </Text>
            </div>
          </Col>
        </Row>

        {/* Divider */}
        <div style={{ borderTop: '1px solid #f5f5f5', marginBottom: '20px' }} />

        {/* Row 3: ZenHub ID & Sprint Report */}
        <Row gutter={[32, 20]}>
          <Col xs={24} sm={12} md={6}>
            <div>
              <Text type="secondary" style={{ fontSize: '11px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#8c8c8c', display: 'block', marginBottom: '6px' }}>
                ZenHub ID
              </Text>
              <Space size={4}>
                <Text style={{ fontSize: '14px', color: '#262626' }}>
                  {projectData?.zenhub_id || projectData?.zenHubId || '—'}
                </Text>
                {(projectData?.zenhub_id || projectData?.zenHubId) && (
                  <Tooltip title="Copy to clipboard">
                    <Button
                      type="text"
                      size="small"
                      icon={<CopyOutlined style={{ fontSize: '12px' }} />}
                      onClick={handleCopyZenHubId}
                      style={{ padding: '2px 4px', height: 'auto', color: '#8c8c8c' }}
                    />
                  </Tooltip>
                )}
              </Space>
            </div>
          </Col>
          <Col xs={24} sm={12} md={6} style={{ display: 'flex', alignItems: 'flex-end' }}>
            <Button
              type="text"
              icon={<BarChartOutlined />}
              onClick={() => setShowSprintReport(true)}
              style={{ color: token.colorPrimary, padding: '4px 0' }}
            >
              View Sprint Report
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Main Content */}
      <Row gutter={[24, 24]}>
        {/* Left Column - Project Info & Tasks */}
        <Col xs={24} lg={16}>
          {/* Collapsible Sections - DevSecOps Timeline & Milestones */}
          <Collapse
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
            items={[
              {
                key: 'timeline',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px', fontWeight: '600', width: '100%' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <BarChartOutlined style={{ color: getHeaderIconColor(token) }} />
                      <span>DevSecOps Timeline</span>
                    </div>
                    {canEditProject && (
                      <Button
                        type="primary"
                        size="small"
                        icon={<PlusOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenNewTaskModal()
                        }}
                        style={{ marginRight: '8px' }}
                      >
                        Add Task
                      </Button>
                    )}
                  </div>
                ),
                children: (
                  <div>
                    {projectData?.tasks && projectData.tasks.length > 0 ? (
                      <Steps
                        direction="vertical"
                        current={-1}
                        items={groupTasksByType(projectData.tasks).map((group) => {
                          const statusInfo = getTaskTypeStatus(group.tasks)
                          const iconType = getTaskTypeStatusIconType(statusInfo.status, statusInfo.hasOverdue)

                          // Create icon component based on type
                          let icon = null
                          if (iconType === 'CheckCircleFilled') {
                            icon = <CheckCircleFilled style={{ color: '#52c41a' }} />
                          } else if (iconType === 'LoadingOutlined') {
                            icon = <LoadingOutlined style={{ color: getHeaderIconColor(token) }} />
                          } else if (iconType === 'ExclamationCircleOutlined') {
                            icon = <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
                          }

                          return {
                            title: (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: getTaskTypeStatusColor(statusInfo.status, statusInfo.hasOverdue) }}>
                                  {group.type}
                                </span>
                                <Tag color={getTaskTypeStatusColor(statusInfo.status, statusInfo.hasOverdue)} style={{ marginLeft: '8px' }}>
                                  {statusInfo.completed}/{statusInfo.total} completed
                                </Tag>
                              </div>
                            ),
                            description: (
                              <div style={{ marginTop: '12px', marginLeft: '0px' }}>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                  {group.tasks.map((task, idx) => (
                                    <div
                                      key={task.name || idx}
                                      style={{
                                        padding: '12px 14px',
                                        backgroundColor: task.status && (task.status.toLowerCase() === 'completed' || task.status.toLowerCase() === 'closed') ? '#f6ffed' : '#fafafa',
                                        borderRadius: '6px',
                                        borderLeft: `4px solid ${task.status && (task.status.toLowerCase() === 'completed' || task.status.toLowerCase() === 'closed') ? '#52c41a' : task.priority === 'Urgent' ? '#ff4d4f' : task.priority === 'High' ? '#fa8c16' : '#1890ff'}`,
                                        fontSize: '12px',
                                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
                                        transition: 'all 0.3s ease',
                                        cursor: 'pointer'
                                      }}
                                      onMouseEnter={(e) => {
                                        e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)'
                                        e.currentTarget.style.transform = 'translateY(-1px)'
                                      }}
                                      onMouseLeave={(e) => {
                                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)'
                                        e.currentTarget.style.transform = 'translateY(0)'
                                      }}
                                    >
                                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: '8px' }}>
                                        <div style={{ flex: 1 }}>
                                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                                            <Text strong style={{ fontSize: '13px', color: '#262626' }}>
                                              {task.subject || task.name}
                                            </Text>
                                            {task.is_milestone === 1 && (
                                              <Tag color="purple" style={{ fontSize: '10px', fontWeight: '600', margin: 0 }}>
                                                🎯 MILESTONE
                                              </Tag>
                                            )}
                                            {task.custom_priority !== undefined && task.custom_priority !== null && (
                                              <Tag color="blue" style={{ fontSize: '10px', fontWeight: '600', margin: 0 }}>
                                                P{task.custom_priority}
                                              </Tag>
                                            )}
                                            {task.modified && new Date(task.modified) > new Date(Date.now() - 24*60*60*1000) && (
                                              <Tag color="cyan" style={{ fontSize: '10px', fontWeight: '600', margin: 0, animation: 'pulse 2s infinite' }}>
                                                ✨ UPDATED
                                              </Tag>
                                            )}
                                          </div>
                                          {task.description && (
                                            <div style={{ marginTop: '4px', color: '#666', fontSize: '11px' }}>
                                              {task.description.substring(0, 80)}...
                                            </div>
                                          )}
                                          <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <Tag color={task.priority === 'High' ? 'red' : task.priority === 'Medium' ? 'orange' : 'green'} style={{ fontSize: '10px' }}>
                                              {task.priority || 'Normal'}
                                            </Tag>
                                            <Tag style={{ fontSize: '10px' }}>
                                              {task.status || 'Open'}
                                            </Tag>
                                            {task.exp_end_date && (
                                              <Tag style={{ fontSize: '10px' }}>
                                                Due: {formatDate(task.exp_end_date)}
                                              </Tag>
                                            )}
                                            {task.assigned_users && task.assigned_users.length > 0 && (
                                              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: '4px' }}>
                                                <UserOutlined style={{ fontSize: '10px', color: '#666' }} />
                                                <Avatar.Group maxCount={3} size="small">
                                                  {task.assigned_users.map((assignment, aIdx) => (
                                                    <Tooltip key={aIdx} title={assignment.full_name}>
                                                      <Avatar size="small" style={{ backgroundColor: '#1890ff', fontSize: '10px' }}>
                                                        {assignment.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                                      </Avatar>
                                                    </Tooltip>
                                                  ))}
                                                </Avatar.Group>
                                              </div>
                                            )}
                                          </div>
                                        </div>
                                        <Button
                                          type="text"
                                          size="small"
                                          icon={<EditOutlined />}
                                          onClick={() => handleEditTask(task)}
                                          style={{ color: getHeaderIconColor(token) }}
                                        />
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            ),
                            status: statusInfo.status,
                            icon: icon
                          }
                        })}
                      />
                    ) : (
                      <Empty description="No tasks found" />
                    )}
                  </div>
                )
              },
              {
                key: 'milestones',
                label: (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '600' }}>
                    <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    <span>Project Milestones</span>
                  </div>
                ),
                children: (
                  <div>
                    {milestones && milestones.length > 0 ? (
                      <Steps
                        direction="vertical"
                        current={-1}
                        items={milestones.map((milestone, index) => ({
                          title: (
                            <div style={{ marginBottom: '8px' }}>
                              <Text strong style={{ fontSize: '14px' }}>
                                {milestone.subject}
                              </Text>
                            </div>
                          ),
                          status: getMilestoneStepStatus(milestone),
                          icon: getMilestoneIcon(milestone),
                          description: (
                            <div style={{ paddingTop: '4px', paddingBottom: '12px' }}>
                              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                                <div>
                                  <Tag color={getStatusColor(milestone.status)}>
                                    {milestone.status || 'Open'}
                                  </Tag>
                                  <Text type="secondary" style={{ marginLeft: '8px', fontSize: '12px', color: milestone.exp_end_date ? 'inherit' : '#999' }}>
                                    Expected: {formatDateWithRelativeTime(milestone.exp_end_date)}
                                  </Text>
                                </div>
                                {milestone.completed_on && (
                                  <div>
                                    <Text type="secondary" style={{ fontSize: '12px', color: milestone.completed_on ? 'inherit' : '#999' }}>
                                      Completed: {formatDateWithRelativeTime(milestone.completed_on)}
                                    </Text>
                                  </div>
                                )}
                                {milestone.progress > 0 && (
                                  <div>
                                    <Progress
                                      percent={milestone.progress || 0}
                                      size="small"
                                      style={{ width: '200px' }}
                                    />
                                  </div>
                                )}
                              </Space>
                            </div>
                          )
                        }))}
                      />
                    ) : (
                      <Empty
                        description="No milestones defined for this project"
                        style={{ marginTop: '24px', marginBottom: '24px' }}
                      >
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Mark tasks as milestones to track key project deliverables
                        </Text>
                      </Empty>
                    )}
                  </div>
                )
              }
            ]}
          />
        </Col>

        {/* Right Column - Team & Activity */}
        <Col xs={24} lg={8}>
          {/* Team Members - Minimalist Flat Design */}
          <Card
            title={
              <Text style={{ fontSize: '14px', fontWeight: '600', color: '#262626' }}>
                Team ({(projectManager ? 1 : 0) + teamMembers.length})
              </Text>
            }
            style={{
              marginBottom: '24px',
              borderRadius: '8px',
              border: '1px solid #f0f0f0',
              boxShadow: 'none'
            }}
            headStyle={{
              borderBottom: '1px solid #f5f5f5',
              padding: '12px 16px',
              minHeight: 'auto'
            }}
            bodyStyle={{ padding: '0' }}
            extra={
              projectData?.custom_software_product && (
                <Button
                  type="primary"
                  size="small"
                  icon={<SyncOutlined spin={syncingUsers} />}
                  onClick={handleSyncUsersFromProduct}
                  loading={syncingUsers}
                  style={{
                    fontSize: '12px',
                    fontWeight: '500'
                  }}
                >
                  Sync from Product
                </Button>
              )
            }
          >
            {/* Project Manager Section */}
            {projectManager && (
              <div style={{
                padding: '16px',
                backgroundColor: '#fafafa',
                borderBottom: '1px solid #f0f0f0'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <Avatar
                    src={projectManager.image}
                    icon={<UserOutlined />}
                    size={40}
                    style={{ flexShrink: 0, backgroundColor: '#e6e6e6' }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                      <Text strong style={{ fontSize: '13px', color: '#262626' }}>
                        {projectManager.full_name}
                      </Text>
                      <Text style={{ fontSize: '10px', fontWeight: '500', color: '#8c8c8c', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                        Lead
                      </Text>
                    </div>
                    <Text type="secondary" style={{ fontSize: '12px', color: '#8c8c8c' }}>
                      {projectManager.business_function || projectManager.email}
                    </Text>
                  </div>
                </div>
              </div>
            )}

            {/* Team Members List */}
            <div style={{ padding: '8px 0' }}>
              {teamMembers && teamMembers.length > 0 ? (
                <>
                  {(showAllTeamMembers ? teamMembers : teamMembers.slice(0, 5)).map((member, index) => (
                    <div
                      key={index}
                      style={{
                        padding: '10px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        transition: 'background-color 0.15s ease',
                        borderLeft: member.custom_is_change_approver === 1 ? '2px solid #52c41a' : '2px solid transparent'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#fafafa'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <Avatar
                        src={member.image}
                        icon={<UserOutlined />}
                        size={32}
                        style={{
                          flexShrink: 0,
                          backgroundColor: member.custom_is_change_approver === 1 ? '#f6ffed' : '#f0f0f0',
                          border: member.custom_is_change_approver === 1 ? '1px solid #b7eb8f' : 'none'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <Text style={{
                              fontSize: '13px',
                              color: '#262626',
                              fontWeight: member.custom_is_change_approver === 1 ? '600' : '500'
                            }}>
                              {member.full_name}
                            </Text>
                            {member.custom_is_change_approver === 1 && (
                              <Tag
                                color="success"
                                style={{
                                  margin: 0,
                                  fontSize: '10px',
                                  padding: '0 6px',
                                  lineHeight: '18px',
                                  fontWeight: '600'
                                }}
                              >
                                ✓ Change Approver
                              </Tag>
                            )}
                          </div>
                          {member.business_function && (
                            <Tag
                              color="blue"
                              style={{
                                margin: 0,
                                fontSize: '11px',
                                fontWeight: '500',
                                padding: '2px 8px'
                              }}
                            >
                              {member.business_function}
                            </Tag>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {/* Show More / Show Less */}
                  {teamMembers.length > 5 && (
                    <div style={{ padding: '8px 16px', borderTop: '1px solid #f5f5f5' }}>
                      <Button
                        type="text"
                        size="small"
                        onClick={() => setShowAllTeamMembers(!showAllTeamMembers)}
                        style={{ color: token.colorPrimary, padding: '4px 0', fontSize: '12px' }}
                      >
                        {showAllTeamMembers ? `Show less` : `Show ${teamMembers.length - 5} more`}
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '24px 16px', textAlign: 'center' }}>
                  <Text type="secondary" style={{ fontSize: '13px', color: '#bfbfbf' }}>
                    No team members assigned
                  </Text>
                </div>
              )}
            </div>
          </Card>

        </Col>
      </Row>

      {/* Recent Activity Section */}
      <ProjectRecentActivity projectId={projectId} />

      {/* Enhanced Task Dialog - Replaces old Create/Edit modals */}
      <EnhancedTaskDialog
        open={taskDialogOpen}
        mode={taskDialogMode}
        taskData={selectedTask}
        projectId={projectId}
        taskTypeOptions={taskTypeOptions}
        userSearchResults={userSearchResults}
        onUserSearch={handleUserSearch}
        onClose={handleCloseNewTaskModal}
        onCreate={handleCreateTask}
        onUpdate={handleUpdateTask}
        loading={taskFormLoading || editTaskFormLoading}
        canEdit={canEditProject}
      />

      {/* Sprint Report Dialog */}
      {showSprintReport && (
        <SprintReportDialog
          open={showSprintReport}
          onClose={() => setShowSprintReport(false)}
          projectId={projectId}
          projectName={projectData?.project_name || projectData?.name}
        />
      )}
    </div>
  )
}

export default ProjectDetail
