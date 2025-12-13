import { useState, useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Row,
  Col,
  Button,
  Space,
  Card,
  Avatar,
  Typography,
  Tag,
  Spin,
  message,
  Alert,
  theme
} from 'antd'
import {
  UserOutlined,
  CalendarOutlined,
  FlagOutlined,
  FileTextOutlined,
  CommentOutlined,
  SendOutlined,
  ClockCircleOutlined,
  SaveOutlined,
  LockOutlined
} from '@ant-design/icons'
import ReactQuill from 'react-quill-new'
import 'react-quill-new/dist/quill.snow.css'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Text, Title } = Typography
const { TextArea } = Input

const EnhancedTaskDialog = ({
  open,
  mode = 'create', // 'create', 'edit', or 'view'
  taskData = null,
  projectId,
  taskTypeOptions = [],
  userSearchResults = [],
  onUserSearch,
  onClose,
  onCreate,
  onUpdate,
  loading = false,
  canEdit = false // Permission passed from parent component
}) => {
  const { token } = theme.useToken()
  const [form] = Form.useForm()

  // Use permission from parent (which checks: Administrator user OR has write permission)
  const hasEditPermission = canEdit

  // State
  const [comments, setComments] = useState([])
  const [loadingComments, setLoadingComments] = useState(false)
  const [commentText, setCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [activeTab, setActiveTab] = useState('details') // 'details' or 'comments'
  const [commentLimit, setCommentLimit] = useState(10) // Initial limit for pagination
  const [hasMoreComments, setHasMoreComments] = useState(false)
  const [assignedUsers, setAssignedUsers] = useState([])
  const [loadingAssignments, setLoadingAssignments] = useState(false)

  // Load task data when editing/viewing
  useEffect(() => {
    if (open && mode !== 'create' && taskData) {
      form.setFieldsValue({
        subject: taskData.subject,
        task_type: taskData.task_type,
        priority: taskData.priority || 'Medium',
        status: taskData.status || 'Open',
        assigned_to: taskData.assigned_to,
        exp_start_date: taskData.exp_start_date ? dayjs(taskData.exp_start_date) : null,
        exp_end_date: taskData.exp_end_date ? dayjs(taskData.exp_end_date) : null,
        is_milestone: taskData.is_milestone || false,
        description: taskData.description || ''
      })

      // Load comments if viewing/editing
      if (taskData.name) {
        loadComments(taskData.name)
        loadAssignments(taskData.name)
      }
    } else if (open && mode === 'create') {
      form.resetFields()
      setComments([])
      setCommentText('')
      setAssignedUsers([])
    }
  }, [open, mode, taskData, form])

  // Load comments from backend API
  const loadComments = async (taskName, limit = commentLimit) => {
    setLoadingComments(true)
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.task.get_task_comments?task_name=${encodeURIComponent(taskName)}&limit=${limit}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const taskComments = data.message?.data || []
        const totalComments = data.message?.total || 0
        setComments(taskComments)
        setHasMoreComments(taskComments.length < totalComments)
      } else {
        throw new Error('Failed to load comments')
      }
    } catch (error) {
      console.error('[EnhancedTaskDialog] Error loading comments:', error)
      message.error('Failed to load comments')
    } finally {
      setLoadingComments(false)
    }
  }

  // Load more comments
  const handleLoadMoreComments = () => {
    const newLimit = commentLimit + 10
    setCommentLimit(newLimit)
    if (taskData?.name) {
      loadComments(taskData.name, newLimit)
    }
  }

  // Load assignments from backend API
  const loadAssignments = async (taskName) => {
    setLoadingAssignments(true)
    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.task.get_task_assignments_api?task_name=${encodeURIComponent(taskName)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const assignments = data.message?.data || []
        setAssignedUsers(assignments)
      } else {
        throw new Error('Failed to load assignments')
      }
    } catch (error) {
      console.error('[EnhancedTaskDialog] Error loading assignments:', error)
    } finally {
      setLoadingAssignments(false)
    }
  }

  // Add user assignment
  const handleAddAssignment = async (userEmail) => {
    if (!taskData?.name) {
      message.error('Please save the task first before assigning users')
      return
    }

    try {
      const response = await fetch(
        '/api/method/frappe.desk.form.assign_to.add',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          body: JSON.stringify({
            doctype: 'Task',
            name: taskData.name,
            assign_to: [userEmail],
            description: 'Assigned from task dialog'
          })
        }
      )

      if (response.ok) {
        message.success('User assigned successfully')
        await loadAssignments(taskData.name)
      } else {
        throw new Error('Failed to assign user')
      }
    } catch (error) {
      console.error('[EnhancedTaskDialog] Error assigning user:', error)
      message.error(error.message || 'Failed to assign user')
    }
  }

  // Remove user assignment
  const handleRemoveAssignment = async (userEmail) => {
    if (!taskData?.name) return

    try {
      const response = await fetch(
        '/api/method/frappe.desk.form.assign_to.remove',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          body: JSON.stringify({
            doctype: 'Task',
            name: taskData.name,
            assign_to: userEmail
          })
        }
      )

      if (response.ok) {
        message.success('User unassigned successfully')
        await loadAssignments(taskData.name)
      } else {
        throw new Error('Failed to remove assignment')
      }
    } catch (error) {
      console.error('[EnhancedTaskDialog] Error removing assignment:', error)
      message.error(error.message || 'Failed to remove assignment')
    }
  }

  // Add comment using backend API
  const handleAddComment = async () => {
    if (!commentText || !commentText.trim()) {
      message.warning('Please enter a comment')
      return
    }

    if (!taskData?.name) {
      message.error('Cannot add comment: Task not saved yet')
      return
    }

    setSubmittingComment(true)
    try {
      const response = await fetch(
        '/api/method/frappe_devsecops_dashboard.api.task.add_task_comment',
        {
          method: 'POST',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          body: JSON.stringify({
            task_name: taskData.name,
            content: commentText
          })
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.message?.success) {
          message.success('Comment added successfully')
          setCommentText('')

          // Reload comments
          await loadComments(taskData.name)
        } else {
          throw new Error(data.message?.message || 'Failed to add comment')
        }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.exception || 'Failed to add comment')
      }
    } catch (error) {
      console.error('[EnhancedTaskDialog] Error adding comment:', error)
      message.error(error.message || 'Failed to add comment')
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle form submission
  const handleSubmit = () => {
    form.validateFields().then(values => {
      const formattedValues = {
        ...values,
        exp_start_date: values.exp_start_date ? values.exp_start_date.format('YYYY-MM-DD') : null,
        exp_end_date: values.exp_end_date ? values.exp_end_date.format('YYYY-MM-DD') : null
      }

      if (mode === 'create') {
        onCreate?.(formattedValues)
      } else if (mode === 'edit') {
        onUpdate?.(formattedValues)
      }
    })
  }

  // Priority color mapping
  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'Urgent': return 'red'
      case 'High': return 'orange'
      case 'Medium': return 'blue'
      case 'Low': return 'green'
      default: return 'default'
    }
  }

  // Status color mapping
  const getStatusColor = (status) => {
    switch (status) {
      case 'Completed': return 'success'
      case 'Working': return 'processing'
      case 'Overdue': return 'error'
      case 'Cancelled': return 'default'
      default: return 'default'
    }
  }

  // Rich text editor modules
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['blockquote', 'code-block'],
      [{ 'color': [] }, { 'background': [] }],
      ['link'],
      ['clean']
    ]
  }

  // Force view mode if user doesn't have edit permission and trying to edit
  const effectiveMode = (!hasEditPermission && mode === 'edit') ? 'view' : mode

  // Show permission warning for users trying to create/edit without permission
  const showPermissionWarning = !hasEditPermission && (mode === 'create' || mode === 'edit')

  return (
    <Modal
      title={
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            {!hasEditPermission && (mode === 'edit' || mode === 'create') && (
              <LockOutlined style={{ fontSize: '20px', color: token.colorWarning }} />
            )}
            <FileTextOutlined style={{ fontSize: '20px', color: token.colorPrimary }} />
            <span style={{ fontSize: '18px', fontWeight: 600 }}>
              {effectiveMode === 'create' ? 'Create New Task' : effectiveMode === 'edit' ? 'Edit Task' : 'Task Details'}
            </span>
          </Space>
          {mode !== 'create' && taskData && (
            <Space>
              <Tag color={getPriorityColor(taskData.priority)}>{taskData.priority}</Tag>
              <Tag color={getStatusColor(taskData.status)}>{taskData.status}</Tag>
            </Space>
          )}
        </Space>
      }
      open={open}
      onCancel={onClose}
      width={1200}
      style={{ top: 20 }}
      footer={
        effectiveMode === 'view' ? [
          <Button key="close" onClick={onClose}>Close</Button>
        ] : [
          <Button key="cancel" onClick={onClose}>Cancel</Button>,
          <Button
            key="submit"
            type="primary"
            loading={loading}
            onClick={handleSubmit}
            disabled={showPermissionWarning}
            icon={effectiveMode === 'create' ? <FileTextOutlined /> : <SaveOutlined />}
          >
            {effectiveMode === 'create' ? 'Create Task' : 'Update Task'}
          </Button>
        ]
      }
    >
      {/* Tab Navigation */}
      <div style={{ marginBottom: '24px', borderBottom: `1px solid ${token.colorBorder}` }}>
        <Space size="large">
          <Button
            type={activeTab === 'details' ? 'text' : 'text'}
            style={{
              color: activeTab === 'details' ? token.colorPrimary : token.colorTextSecondary,
              fontWeight: activeTab === 'details' ? 600 : 400,
              borderBottom: activeTab === 'details' ? `2px solid ${token.colorPrimary}` : 'none',
              borderRadius: 0,
              paddingBottom: '12px'
            }}
            onClick={() => setActiveTab('details')}
            icon={<FileTextOutlined />}
          >
            Task Details
          </Button>
          {mode !== 'create' && (
            <Button
              type={activeTab === 'comments' ? 'text' : 'text'}
              style={{
                color: activeTab === 'comments' ? token.colorPrimary : token.colorTextSecondary,
                fontWeight: activeTab === 'comments' ? 600 : 400,
                borderBottom: activeTab === 'comments' ? `2px solid ${token.colorPrimary}` : 'none',
                borderRadius: 0,
                paddingBottom: '12px'
              }}
              onClick={() => setActiveTab('comments')}
              icon={<CommentOutlined />}
            >
              Comments {comments.length > 0 && `(${comments.length})`}
            </Button>
          )}
        </Space>
      </div>

      {/* Permission Warning Banner */}
      {showPermissionWarning && (
        <Alert
          message="Read-Only Access"
          description="You do not have permission to edit tasks. Only Administrator or Project Manager roles can create or edit tasks."
          type="warning"
          showIcon
          icon={<LockOutlined />}
          style={{ marginBottom: '20px' }}
          closable
        />
      )}

      {/* Task Details Tab */}
      {activeTab === 'details' && (
        <Form
          form={form}
          layout="vertical"
          autoComplete="off"
          disabled={effectiveMode === 'view'}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            {/* Task Subject - Full width, prominent */}
            <div style={{
              background: token.colorBgContainer,
              padding: '24px',
              borderRadius: '8px',
              border: `1px solid ${token.colorBorderSecondary}`
            }}>
              <Form.Item
                label={
                  <Text strong style={{ fontSize: '15px', color: token.colorText }}>
                    Task Subject
                  </Text>
                }
                name="subject"
                rules={[{ required: true, message: 'Please enter task subject' }]}
                style={{ marginBottom: 0 }}
              >
                <Input
                  placeholder="What needs to be done?"
                  size="large"
                  style={{
                    fontSize: '16px',
                    fontWeight: 500
                  }}
                />
              </Form.Item>
            </div>

            {/* Two Column Layout */}
            <Row gutter={20}>
              {/* Left Column */}
              <Col xs={24} lg={12}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  {/* Classification Card */}
                  <Card
                    title={
                      <Space>
                        <FileTextOutlined style={{ color: token.colorPrimary }} />
                        <Text strong>Classification</Text>
                      </Space>
                    }
                    size="small"
                    style={{ borderRadius: '8px' }}
                    headStyle={{ background: token.colorBgLayout }}
                  >
                    <Form.Item
                      label={<Text strong style={{ fontSize: '13px' }}>Task Type</Text>}
                      name="task_type"
                      style={{ marginBottom: '16px' }}
                    >
                      <Select
                        placeholder="Select task type"
                        options={taskTypeOptions}
                        loading={taskTypeOptions.length === 0}
                        size="large"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<Text strong style={{ fontSize: '13px' }}>Priority</Text>}
                      name="priority"
                      initialValue="Medium"
                      rules={[{ required: true, message: 'Please select priority' }]}
                      style={{ marginBottom: '16px' }}
                    >
                      <Select
                        placeholder="Select priority"
                        size="large"
                        options={[
                          {
                            label: <Space><FlagOutlined style={{ color: '#f5222d' }} /> Urgent</Space>,
                            value: 'Urgent'
                          },
                          {
                            label: <Space><FlagOutlined style={{ color: '#fa8c16' }} /> High</Space>,
                            value: 'High'
                          },
                          {
                            label: <Space><FlagOutlined style={{ color: '#1890ff' }} /> Medium</Space>,
                            value: 'Medium'
                          },
                          {
                            label: <Space><FlagOutlined style={{ color: '#52c41a' }} /> Low</Space>,
                            value: 'Low'
                          }
                        ]}
                      />
                    </Form.Item>

                    <Form.Item
                      label={<Text strong style={{ fontSize: '13px' }}>Status</Text>}
                      name="status"
                      initialValue="Open"
                      style={{ marginBottom: 0 }}
                    >
                      <Select
                        placeholder="Select status"
                        size="large"
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
                  </Card>

                  {/* Timeline Card */}
                  <Card
                    title={
                      <Space>
                        <CalendarOutlined style={{ color: token.colorPrimary }} />
                        <Text strong>Timeline</Text>
                      </Space>
                    }
                    size="small"
                    style={{ borderRadius: '8px' }}
                    headStyle={{ background: token.colorBgLayout }}
                  >
                    <Form.Item
                      label={<Text strong style={{ fontSize: '13px' }}>Start Date</Text>}
                      name="exp_start_date"
                      style={{ marginBottom: '16px' }}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        size="large"
                        format="YYYY-MM-DD"
                        placeholder="Select start date"
                      />
                    </Form.Item>

                    <Form.Item
                      label={<Text strong style={{ fontSize: '13px' }}>Due Date</Text>}
                      name="exp_end_date"
                      style={{ marginBottom: 0 }}
                    >
                      <DatePicker
                        style={{ width: '100%' }}
                        size="large"
                        format="YYYY-MM-DD"
                        placeholder="Select due date"
                      />
                    </Form.Item>
                  </Card>
                </Space>
              </Col>

              {/* Right Column */}
              <Col xs={24} lg={12}>
                <Space direction="vertical" size={20} style={{ width: '100%' }}>
                  {/* Assignment Card - Enhanced UX with Gestalt Principles */}
                  <Card
                    title={
                      <Space>
                        <UserOutlined style={{ color: token.colorPrimary }} />
                        <Text strong>Team Members</Text>
                        {assignedUsers.length > 0 && (
                          <Tag color="blue" style={{ marginLeft: '8px' }}>{assignedUsers.length} assigned</Tag>
                        )}
                      </Space>
                    }
                    size="small"
                    style={{ borderRadius: '8px' }}
                    headStyle={{ background: token.colorBgLayout }}
                  >
                    {/* Assigned Users Display - Gestalt Proximity & Similarity */}
                    {assignedUsers.length > 0 && (
                      <div style={{ marginBottom: '16px' }}>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                          Currently Assigned
                        </Text>
                        <Space wrap size={[8, 8]}>
                          {assignedUsers.map((assignment, index) => (
                            <Tag
                              key={index}
                              closable={effectiveMode !== 'view'}
                              onClose={() => handleRemoveAssignment(assignment.user_email)}
                              style={{
                                padding: '4px 8px',
                                borderRadius: '6px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '13px',
                                border: '1px solid ' + token.colorBorder,
                                background: token.colorBgContainer
                              }}
                            >
                              <Avatar
                                size={20}
                                style={{
                                  backgroundColor: token.colorPrimary,
                                  fontSize: '11px'
                                }}
                              >
                                {assignment.full_name?.charAt(0)?.toUpperCase() || 'U'}
                              </Avatar>
                              <span>{assignment.full_name || assignment.user_email}</span>
                            </Tag>
                          ))}
                        </Space>
                      </div>
                    )}

                    {/* Add User Section - Gestalt Continuity */}
                    {effectiveMode !== 'view' && (
                      <div>
                        <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '8px' }}>
                          {assignedUsers.length > 0 ? 'Add More Members' : 'Assign Team Members'}
                        </Text>
                        <Select
                          placeholder="Search and select user to assign"
                          showSearch
                          onSearch={onUserSearch}
                          onChange={handleAddAssignment}
                          value={null}
                          filterOption={false}
                          notFoundContent={loadingAssignments ? <Spin size="small" /> : null}
                          disabled={!taskData?.name}
                          style={{ width: '100%' }}
                          options={userSearchResults
                            .filter(user => !assignedUsers.find(a => a.user_email === user.name))
                            .map(user => ({
                              label: (
                                <Space>
                                  <Avatar
                                    size={24}
                                    style={{ backgroundColor: token.colorPrimary }}
                                  >
                                    {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                                  </Avatar>
                                  <span>{user.full_name || user.name}</span>
                                </Space>
                              ),
                              value: user.name
                            }))}
                          size="large"
                          suffixIcon={<UserOutlined />}
                        />
                        {!taskData?.name && (
                          <Text type="secondary" style={{ fontSize: '11px', display: 'block', marginTop: '8px' }}>
                            💡 Save the task first to assign team members
                          </Text>
                        )}
                      </div>
                    )}

                    {/* View Mode Display */}
                    {effectiveMode === 'view' && assignedUsers.length === 0 && (
                      <Text type="secondary" style={{ fontSize: '13px' }}>
                        No team members assigned
                      </Text>
                    )}
                  </Card>

                  {/* Description Card */}
                  <Card
                    title={
                      <Space>
                        <FileTextOutlined style={{ color: token.colorPrimary }} />
                        <Text strong>Description</Text>
                      </Space>
                    }
                    size="small"
                    style={{ borderRadius: '8px' }}
                    headStyle={{ background: token.colorBgLayout }}
                  >
                    <Form.Item
                      name="description"
                      style={{ marginBottom: 0 }}
                    >
                      <TextArea
                        placeholder="Provide detailed description, acceptance criteria, and context..."
                        rows={8}
                        style={{ fontSize: '14px', lineHeight: '1.6' }}
                      />
                    </Form.Item>
                  </Card>

                  {/* Options Card */}
                  <Card
                    size="small"
                    style={{ borderRadius: '8px' }}
                  >
                    <Form.Item
                      name="is_milestone"
                      valuePropName="checked"
                      initialValue={false}
                      style={{ marginBottom: 0 }}
                    >
                      <Checkbox style={{ fontSize: '14px' }}>
                        <Space>
                          <FlagOutlined style={{ color: token.colorWarning }} />
                          <Text strong>Mark as milestone</Text>
                        </Space>
                      </Checkbox>
                    </Form.Item>
                  </Card>
                </Space>
              </Col>
            </Row>
          </div>
        </Form>
      )}

      {/* Comments Tab */}
      {activeTab === 'comments' && mode !== 'create' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Add Comment Section - Compact */}
          <div style={{
            background: token.colorBgContainer,
            padding: '16px',
            borderRadius: '8px',
            border: `1px solid ${token.colorBorderSecondary}`
          }}>
            <div style={{ marginBottom: '12px' }}>
              <Text strong style={{ fontSize: '13px', color: token.colorTextSecondary }}>
                Add Comment
              </Text>
            </div>
            <ReactQuill
              value={commentText}
              onChange={setCommentText}
              modules={quillModules}
              placeholder="Write your comment..."
              style={{
                height: '100px',
                marginBottom: '46px',
                fontSize: '13px'
              }}
            />
            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                type="primary"
                size="small"
                icon={<SendOutlined />}
                onClick={handleAddComment}
                loading={submittingComment}
                disabled={!commentText || !commentText.trim()}
              >
                Post
              </Button>
            </div>
          </div>

          {/* Comments List - Compact */}
          <div style={{
            background: token.colorBgContainer,
            padding: '16px',
            borderRadius: '8px',
            border: `1px solid ${token.colorBorderSecondary}`,
            maxHeight: '500px',
            overflowY: 'auto'
          }}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '12px',
              paddingBottom: '8px',
              borderBottom: `1px solid ${token.colorBorderSecondary}`
            }}>
              <Text strong style={{ fontSize: '13px', color: token.colorTextSecondary }}>
                Comments
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {comments.length} {comments.length === 1 ? 'comment' : 'comments'}
              </Text>
            </div>

            {loadingComments ? (
              <div style={{ textAlign: 'center', padding: '20px' }}>
                <Spin size="small" />
              </div>
            ) : comments.length === 0 ? (
              <div style={{
                textAlign: 'center',
                padding: '24px 12px',
                color: token.colorTextSecondary
              }}>
                <CommentOutlined style={{ fontSize: '32px', color: token.colorTextDisabled, marginBottom: '8px' }} />
                <div style={{ fontSize: '12px' }}>No comments yet</div>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {comments.map((comment, index) => (
                  <div
                    key={comment.name || index}
                    style={{
                      background: index % 2 === 0 ? token.colorBgLayout : 'transparent',
                      padding: '10px',
                      borderRadius: '6px',
                      borderLeft: `2px solid ${token.colorPrimary}`,
                      transition: 'background 0.2s'
                    }}
                  >
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <Avatar
                        size={28}
                        icon={<UserOutlined />}
                        src={comment.user_image}
                        style={{
                          backgroundColor: token.colorPrimary,
                          flexShrink: 0,
                          fontSize: '12px'
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'baseline',
                          marginBottom: '4px',
                          gap: '8px'
                        }}>
                          <Text strong style={{ fontSize: '12px', color: token.colorText }}>
                            {comment.comment_by || comment.sender_full_name || comment.sender || 'Unknown User'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: '11px', whiteSpace: 'nowrap' }}>
                            {dayjs(comment.creation).fromNow()}
                          </Text>
                        </div>
                        <div
                          style={{
                            fontSize: '12px',
                            lineHeight: '1.5',
                            color: token.colorText
                          }}
                          dangerouslySetInnerHTML={{ __html: comment.content }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Load More Button */}
            {!loadingComments && hasMoreComments && comments.length > 0 && (
              <div style={{ textAlign: 'center', marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
                <Button
                  size="small"
                  type="link"
                  onClick={handleLoadMoreComments}
                  style={{ fontSize: '12px' }}
                >
                  Load More Comments
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </Modal>
  )
}

export default EnhancedTaskDialog
