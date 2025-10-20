import { useState, useEffect, useRef } from 'react'
import {
  Card,
  Collapse,
  Progress,
  Tag,
  Button,
  Space,
  Divider,
  Upload,
  Input,
  Steps,
  Spin,
  Tooltip,
  Empty,
  Descriptions,
  theme,
  Typography,
  message,
  Popconfirm,
  Avatar,
  List
} from 'antd'

const { Text } = Typography
import {
  SafetyOutlined,
  ProjectOutlined,
  DashboardOutlined,
  CheckCircleOutlined,
  PaperClipOutlined,
  UploadOutlined,
  MessageOutlined,
  SendOutlined,
  UpOutlined,
  DownOutlined,
  CalendarOutlined,
  UserOutlined,
  BgColorsOutlined,
  DeleteOutlined,
  EditOutlined,
  DownloadOutlined,
  LoadingOutlined
} from '@ant-design/icons'
import './ProjectCard.css'
import MentionDropdown from './MentionDropdown'
import {
  getProjectFiles,
  deleteProjectFile,
  uploadProjectFile,
  getProjectComments,
  addProjectComment,
  updateProjectComment,
  deleteProjectComment,
  formatFileSize,
  getFileIcon,
  formatDate,
  createMention
} from '../utils/projectAttachmentsApi'

/**
 * Enhanced ProjectCard Component
 * Displays project information with improved visual hierarchy, responsive design, and null safety
 */
const ProjectCard = ({
  project,
  onViewDetails,
  onSprintReport,
  onTaskTypeClick,
  taskTypeSummary,
  projectFiles: initialProjectFiles,
  projectComments: initialProjectComments,
  onUpload,
  onCommentSubmit,
  isCollapsed,
  onToggleCollapse,
  loading = false
}) => {
  const { token } = theme.useToken()
  const [commentText, setCommentText] = useState('')
  const [files, setFiles] = useState([])
  const [comments, setComments] = useState([])
  const [filesLoading, setFilesLoading] = useState(false)
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [editingCommentId, setEditingCommentId] = useState(null)
  const [editingCommentText, setEditingCommentText] = useState('')
  const [submittingComment, setSubmittingComment] = useState(false)
  const [updatingCommentId, setUpdatingCommentId] = useState(null)
  const [mentionDropdownVisible, setMentionDropdownVisible] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [mentionPosition, setMentionPosition] = useState(null)
  const commentInputRef = useRef(null)
  const [cursorPosition, setCursorPosition] = useState(0)

  // Load files and comments on mount
  useEffect(() => {
    if (project?.id) {
      loadFiles()
      loadComments()
    }
  }, [project?.id])

  // Null safety helpers
  const safeString = (value, fallback = 'N/A') => String(value || fallback)
  const safeNumber = (value, fallback = 0) => Number(value || fallback)
  const formatDateHelper = (date) => {
    if (!date) return 'Not set'
    try {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch {
      return 'Invalid date'
    }
  }

  // Strip HTML tags from content and decode HTML entities
  const stripHtmlTags = (html) => {
    if (!html) return ''
    // Create a temporary element to parse HTML
    const temp = document.createElement('div')
    temp.innerHTML = html
    // Get text content (automatically decodes entities and removes tags)
    return temp.textContent || temp.innerText || ''
  }

  // Load files from API
  const loadFiles = async () => {
    setFilesLoading(true)
    try {

      const result = await getProjectFiles(project.id)
      if (result.success) {

        setFiles(result.files || [])
      } else {

        const errorMsg = result.error || 'Failed to load files'
        message.error({
          content: errorMsg,
          duration: 4,
          top: 24
        })
      }
    } catch (error) {

      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to load files'
      message.error({
        content: `Error loading files: ${errorMsg}`,
        duration: 4,
        top: 24
      })
    } finally {
      setFilesLoading(false)
    }
  }

  // Load comments from API
  const loadComments = async () => {
    setCommentsLoading(true)
    try {

      const result = await getProjectComments(project.id)

      if (result.success) {

        setComments(result.comments || [])
      } else {

        const errorMsg = result.error || 'Failed to load comments'
        message.error({
          content: errorMsg,
          duration: 4,
          top: 24
        })
      }
    } catch (error) {

      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to load comments'
      message.error({
        content: `Error loading comments: ${errorMsg}`,
        duration: 4,
        top: 24
      })
    } finally {
      setCommentsLoading(false)
    }
  }

  // Handle file upload
  const handleFileUpload = async (file) => {
    setUploading(true)
    try {

      const result = await uploadProjectFile(project.id, file)
      if (result.success) {
        message.success({
          content: 'File uploaded successfully',
          duration: 2,
          top: 24
        })
        await loadFiles()
      } else {
        const errorMsg = result.error || 'Failed to upload file'
        message.error({
          content: errorMsg,
          duration: 4,
          top: 24
        })
      }
    } catch (error) {

      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to upload file'
      message.error({
        content: `Error uploading file: ${errorMsg}`,
        duration: 4,
        top: 24
      })
    } finally {
      setUploading(false)
    }
    return false // Prevent default upload
  }

  // Handle file delete
  const handleFileDelete = async (fileName) => {
    try {
      const result = await deleteProjectFile(fileName)
      if (result.success) {
        message.success({
          content: 'File deleted successfully',
          duration: 2,
          top: 24
        })
        await loadFiles()
      } else {
        const errorMsg = result.error || 'Failed to delete file'
        message.error({
          content: errorMsg,
          duration: 4,
          top: 24
        })
      }
    } catch (error) {

      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to delete file'
      message.error({
        content: `Error deleting file: ${errorMsg}`,
        duration: 4,
        top: 24
      })
    }
  }

  // Handle comment submission
  const handleCommentSubmit = async () => {
    if (!commentText.trim()) {
      message.warning({
        content: 'Please enter a comment',
        duration: 2,
        top: 24
      })
      return
    }

    setSubmittingComment(true)
    try {

      const result = await addProjectComment(project.id, commentText)

      if (result.success) {
        message.success({
          content: 'Comment added successfully',
          duration: 2,
          top: 24
        })
        setCommentText('')

        await loadComments()
      } else {

        const errorMsg = result.error || 'Failed to add comment'
        message.error({
          content: errorMsg,
          duration: 4,
          top: 24
        })
      }
    } catch (error) {

      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to add comment'
      message.error({
        content: `Error adding comment: ${errorMsg}`,
        duration: 4,
        top: 24
      })
    } finally {
      setSubmittingComment(false)
    }
  }

  // Handle comment update
  const handleCommentUpdate = async (commentId) => {
    if (!editingCommentText.trim()) {
      message.warning({
        content: 'Please enter a comment',
        duration: 2,
        top: 24
      })
      return
    }

    setUpdatingCommentId(commentId)
    try {
      const result = await updateProjectComment(commentId, editingCommentText)
      if (result.success) {
        message.success({
          content: 'Comment updated successfully',
          duration: 2,
          top: 24
        })
        setEditingCommentId(null)
        setEditingCommentText('')
        await loadComments()
      } else {
        const errorMsg = result.error || 'Failed to update comment'
        message.error({
          content: errorMsg,
          duration: 4,
          top: 24
        })
      }
    } catch (error) {

      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to update comment'
      message.error({
        content: `Error updating comment: ${errorMsg}`,
        duration: 4,
        top: 24
      })
    } finally {
      setUpdatingCommentId(null)
    }
  }

  // Handle comment delete
  const handleCommentDelete = async (commentId) => {
    try {
      const result = await deleteProjectComment(commentId)
      if (result.success) {
        message.success({
          content: 'Comment deleted successfully',
          duration: 2,
          top: 24
        })
        await loadComments()
      } else {
        const errorMsg = result.error || 'Failed to delete comment'
        message.error({
          content: errorMsg,
          duration: 4,
          top: 24
        })
      }
    } catch (error) {

      const errorMsg = error?.message || error?.response?.data?.message || 'Failed to delete comment'
      message.error({
        content: `Error deleting comment: ${errorMsg}`,
        duration: 4,
        top: 24
      })
    }
  }

  // Handle @ mention
  const handleMentionSelect = (user) => {
    const mention = createMention(user.name, user.full_name)
    const newText = commentText.substring(0, cursorPosition - mentionQuery.length - 1) + mention + ' ' + commentText.substring(cursorPosition)
    setCommentText(newText)
    setMentionDropdownVisible(false)
    setMentionQuery('')
  }

  // Handle comment input change for @ mentions
  const handleCommentInputChange = (e) => {
    const text = e.target.value
    const pos = e.target.selectionStart
    setCommentText(text)
    setCursorPosition(pos)

    // Check for @ mention
    const lastAtIndex = text.lastIndexOf('@', pos - 1)
    if (lastAtIndex !== -1) {
      const query = text.substring(lastAtIndex + 1, pos)
      if (query && !query.includes(' ')) {
        setMentionQuery(query)
        setMentionDropdownVisible(true)
        // Calculate dropdown position
        if (commentInputRef.current) {
          // Get the underlying textarea element from Ant Design Input.TextArea
          const textareaElement = commentInputRef.current.resizableTextArea?.textArea || commentInputRef.current.textarea || commentInputRef.current
          if (textareaElement && textareaElement.getBoundingClientRect) {
            const rect = textareaElement.getBoundingClientRect()
            setMentionPosition({
              top: rect.bottom + 5,
              left: rect.left
            })
          }
        }
      } else {
        setMentionDropdownVisible(false)
      }
    } else {
      setMentionDropdownVisible(false)
    }
  }

  // Determine status color
  const getStatusColor = (status) => {
    const statusMap = {
      'Active': 'green',
      'Completed': 'blue',
      'On Hold': 'orange',
      'Cancelled': 'red',
      'Planning': 'cyan'
    }
    return statusMap[status] || 'default'
  }

  // Calculate progress safely
  const progress = Math.min(100, Math.max(0, safeNumber(project.progress, 0)))
  const taskCount = safeNumber(project.task_count || project.total_tasks, 0)
  const status = safeString(project.project_status || project.status, 'Unknown')
  const projectName = safeString(project.name || project.project_name, 'Unnamed Project')
  const client = safeString(project.client, 'No Client')
  const currentPhase = safeString(project.current_phase || project.currentPhase, 'Planning')

  // Render header section
  const renderHeader = () => (
    <div className="project-card-header">
      {/* Primary Info - Project Name and Status */}
      <div className="project-card-header-primary">
        <div className="project-card-title-section">
          <SafetyOutlined className="project-card-icon" style={{ color: token.colorPrimary }} />
          <h3 className="project-card-title" title={projectName}>
            {projectName}
          </h3>
        </div>
        <Tag
          color={getStatusColor(status)}
          icon={<CheckCircleOutlined />}
          className="project-card-status-tag"
        >
          {status}
        </Tag>
      </div>

      {/* Secondary Info - Client and Phase */}
      <div className="project-card-header-secondary">
        <Text type="secondary" className="project-card-client">
          <UserOutlined style={{ marginRight: 4 }} />
          {client}
        </Text>
        <Divider type="vertical" style={{ margin: '0 8px' }} />
        <Text type="secondary" className="project-card-phase">
          <BgColorsOutlined style={{ marginRight: 4 }} />
          Phase: <Text strong style={{ color: token.colorPrimary }}>{currentPhase}</Text>
        </Text>
        <Divider type="vertical" style={{ margin: '0 8px' }} />
        <Tooltip title="Project identifier for debugging">
          <Text type="secondary" style={{ fontSize: '11px', fontFamily: 'monospace' }}>
            ID: {project.id}
          </Text>
        </Tooltip>
      </div>

      {/* Action Buttons */}
      <div className="project-card-actions">
        <Button
          type="primary"
          size="small"
          icon={<ProjectOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            onViewDetails?.(project)
          }}
          className="project-card-action-btn"
        >
          View Details
        </Button>
        <Button
          size="small"
          icon={<DashboardOutlined />}
          onClick={(e) => {
            e.stopPropagation()
            onSprintReport?.(project)
          }}
          className="project-card-action-btn"
        >
          Sprint Report
        </Button>
      </div>
    </div>
  )

  // Render progress section
  const renderProgress = () => (
    <div className="project-card-progress-section">
      <div className="progress-header">
        <Text type="secondary" className="progress-label">
          Overall Progress
        </Text>
        <Text strong className="progress-value">
          {progress}%
        </Text>
      </div>
      <Progress
        percent={progress}
        showInfo={false}
        strokeColor={token.colorPrimary}
        trailColor={token.colorBgContainer}
        size="small"
      />
    </div>
  )

  // Render metrics section - Compact design using Descriptions
  const renderMetrics = () => (
    <div className="project-card-metrics-section">
      <Descriptions size="small" column={{ xxl: 4, xl: 4, lg: 2, md: 2, sm: 1, xs: 1 }} className="project-card-metrics-descriptions">
        <Descriptions.Item label="Tasks" className="metric-item">
          <Text strong style={{ color: token.colorPrimary }}>{taskCount}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Priority" className="metric-item">
          <Text strong>{safeString(project.priority, 'Normal')}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Department" className="metric-item">
          <Text strong>{safeString(project.department, 'N/A')}</Text>
        </Descriptions.Item>
        <Descriptions.Item label="Type" className="metric-item">
          <Text strong>{safeString(project.project_type, 'Standard')}</Text>
        </Descriptions.Item>
      </Descriptions>
    </div>
  )

  // Render dates section
  const renderDates = () => {
    const hasAnyDate = project.expected_start_date || project.expected_end_date ||
                       project.actual_start_date || project.actual_end_date

    if (!hasAnyDate) return null

    return (
      <div className="project-card-dates-section">
        <div className="section-header">
          <CalendarOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />
          <Text strong>Timeline</Text>
        </div>
        <Descriptions size="small" column={1} className="project-card-descriptions">
          {project.expected_start_date && (
            <Descriptions.Item label="Expected Start">
              {formatDateHelper(project.expected_start_date)}
            </Descriptions.Item>
          )}
          {project.expected_end_date && (
            <Descriptions.Item label="Expected End">
              {formatDateHelper(project.expected_end_date)}
            </Descriptions.Item>
          )}
          {project.actual_start_date && (
            <Descriptions.Item label="Actual Start">
              {formatDateHelper(project.actual_start_date)}
            </Descriptions.Item>
          )}
          {project.actual_end_date && (
            <Descriptions.Item label="Actual End">
              {formatDateHelper(project.actual_end_date)}
            </Descriptions.Item>
          )}
        </Descriptions>
      </div>
    )
  }

  // Render lifecycle section
  const renderLifecycle = () => {
    const groups = taskTypeSummary || []

    if (!groups || groups.length === 0) {
      return (
        <div className="project-card-lifecycle-section">
          <div className="section-header">
            <DashboardOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />
            <Text strong>DevSecOps Lifecycle</Text>
          </div>
          <Empty description="No lifecycle data available" style={{ margin: '16px 0' }} />
        </div>
      )
    }

    const currentIdx = (() => {
      const wip = groups.findIndex(g => g.percent > 0 && g.percent < 100)
      if (wip >= 0) return wip
      const lastDone = [...groups].reverse().findIndex(g => g.percent === 100)
      if (lastDone >= 0) return groups.length - 1 - lastDone
      return 0
    })()

    return (
      <div className="project-card-lifecycle-section">
        <div className="section-header">
          <DashboardOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />
          <Text strong>DevSecOps Lifecycle</Text>
        </div>
        <Steps
          direction="vertical"
          size="small"
          current={currentIdx}
          className="project-card-steps"
          items={groups.map((g) => ({
            title: (
              <div
                role="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onTaskTypeClick?.(project, g)
                }}
                className="lifecycle-step-title"
              >
                <div className="lifecycle-step-content">
                  <span>{g.name}</span>
                  <Tag color={g.color} className="lifecycle-step-tag">{g.completionRate}</Tag>
                </div>
              </div>
            ),
            status: g.percent === 100 ? 'finish' : g.percent > 0 ? 'process' : 'wait',
          }))}
        />
      </div>
    )
  }

  // Render attachments section
  const renderAttachments = () => {
    return (
      <div className="project-card-attachments-section">
        <div className="section-header">
          <PaperClipOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />
          <Text strong>Attachments ({files.length})</Text>
        </div>

        {/* Upload Section */}
        <Upload
          beforeUpload={handleFileUpload}
          multiple
          disabled={uploading}
        >
          <Button
            size="small"
            icon={uploading ? <LoadingOutlined /> : <UploadOutlined />}
            loading={uploading}
          >
            {uploading ? 'Uploading...' : 'Upload Files'}
          </Button>
        </Upload>

        {/* Files List */}
        {filesLoading ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : files.length > 0 ? (
          <List
            dataSource={files}
            renderItem={(file) => (
              <List.Item
                className="attachment-item"
                actions={[
                  <a
                    key="download"
                    href={file.file_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Download"
                  >
                    <DownloadOutlined />
                  </a>,
                  <Popconfirm
                    key="delete"
                    title="Delete File"
                    description="Are you sure you want to delete this file?"
                    onConfirm={() => handleFileDelete(file.name)}
                    okText="Yes"
                    cancelText="No"
                  >
                    <a href="#" onClick={(e) => e.preventDefault()} title="Delete">
                      <DeleteOutlined style={{ color: token.colorError }} />
                    </a>
                  </Popconfirm>
                ]}
              >
                <List.Item.Meta
                  avatar={<span style={{ fontSize: '16px' }}>{getFileIcon(file.file_name)}</span>}
                  title={
                    <Tooltip title={file.file_name}>
                      <Text ellipsis>{file.file_name}</Text>
                    </Tooltip>
                  }
                  description={
                    <Space size="small" style={{ fontSize: '12px' }}>
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>•</span>
                      <span>{formatDate(file.creation)}</span>
                      <span>•</span>
                      <span>{file.owner_name}</span>
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No attachments" style={{ margin: '16px 0' }} />
        )}
      </div>
    )
  }

  // Render comments section
  const renderComments = () => {
    return (
      <div className="project-card-comments-section">
        <div className="section-header">
          <MessageOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />
          <Text strong>Comments ({comments.length})</Text>
        </div>

        {/* Comment Input */}
        <div style={{ marginBottom: '16px', position: 'relative' }}>
          <Input.TextArea
            ref={commentInputRef}
            value={commentText}
            onChange={handleCommentInputChange}
            placeholder="Add a comment... (type @ to mention users)"
            rows={2}
            className="project-card-comment-input"
          />
          <Button
            type="primary"
            icon={submittingComment ? <LoadingOutlined /> : <SendOutlined />}
            onClick={handleCommentSubmit}
            disabled={!commentText.trim() || submittingComment}
            loading={submittingComment}
            size="small"
            style={{ marginTop: '8px' }}
          >
            {submittingComment ? 'Sending...' : 'Send'}
          </Button>

          {/* Mention Dropdown */}
          <MentionDropdown
            visible={mentionDropdownVisible}
            position={mentionPosition}
            searchQuery={mentionQuery}
            onSelect={handleMentionSelect}
          />
        </div>

        {/* Comments List */}
        {commentsLoading ? (
          <div style={{ padding: '16px', textAlign: 'center' }}>
            <Spin size="small" />
          </div>
        ) : comments.length > 0 ? (
          <List
            dataSource={comments}
            renderItem={(comment) => (
              <List.Item
                className="comment-item"
                key={comment.name}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      size={32}
                      icon={<UserOutlined />}
                      src={comment.user_image}
                      style={{ backgroundColor: token.colorPrimary }}
                    />
                  }
                  title={
                    <Space size="small">
                      <Text strong>{comment.owner_name}</Text>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {formatDate(comment.creation)}
                      </Text>
                    </Space>
                  }
                  description={
                    editingCommentId === comment.name ? (
                      <div style={{ marginTop: '8px' }}>
                        <Input.TextArea
                          value={editingCommentText}
                          onChange={(e) => setEditingCommentText(e.target.value)}
                          rows={2}
                          style={{ marginBottom: '8px' }}
                        />
                        <Space>
                          <Button
                            size="small"
                            type="primary"
                            onClick={() => handleCommentUpdate(comment.name)}
                            loading={updatingCommentId === comment.name}
                            disabled={updatingCommentId === comment.name}
                          >
                            {updatingCommentId === comment.name ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditingCommentId(null)
                              setEditingCommentText('')
                            }}
                            disabled={updatingCommentId === comment.name}
                          >
                            Cancel
                          </Button>
                        </Space>
                      </div>
                    ) : (
                      <div
                        className="comment-content"
                        style={{
                          marginTop: '8px',
                          padding: '8px 12px',
                          backgroundColor: token.colorBgLayout,
                          borderRadius: '4px',
                          wordBreak: 'break-word',
                          whiteSpace: 'pre-wrap'
                        }}
                      >
                        <Text>{stripHtmlTags(comment.content)}</Text>
                      </div>
                    )
                  }
                />
                {editingCommentId !== comment.name && (
                  <Space size="small">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => {
                        setEditingCommentId(comment.name)
                        setEditingCommentText(comment.content)
                      }}
                      title="Edit"
                    />
                    <Popconfirm
                      title="Delete Comment"
                      description="Are you sure you want to delete this comment?"
                      onConfirm={() => handleCommentDelete(comment.name)}
                      okText="Yes"
                      cancelText="No"
                    >
                      <Button
                        type="text"
                        size="small"
                        icon={<DeleteOutlined />}
                        danger
                        title="Delete"
                      />
                    </Popconfirm>
                  </Space>
                )}
              </List.Item>
            )}
          />
        ) : (
          <Empty description="No comments yet" style={{ margin: '16px 0' }} />
        )}
      </div>
    )
  }

  return (
    <Card
      className="project-card-enhanced"
      style={{ marginBottom: 16 }}
      loading={loading}
    >
      <Collapse
        ghost
        size="small"
        activeKey={isCollapsed ? [] : ['details']}
        onChange={() => onToggleCollapse?.(project.id)}
        expandIcon={({ isActive }) => isActive ? <UpOutlined /> : <DownOutlined />}
        items={[
          {
            key: 'details',
            label: renderHeader(),
            children: (
              <div className="project-card-content">
                {renderProgress()}
                {renderMetrics()}
                {renderDates()}
                <Divider style={{ margin: '16px 0' }} />
                {renderLifecycle()}
                <Divider style={{ margin: '16px 0' }} />
                {renderAttachments()}
                <Divider style={{ margin: '16px 0' }} />
                {renderComments()}
              </div>
            )
          }
        ]}
      />
    </Card>
  )
}

export default ProjectCard

