import React, { useState, useEffect } from 'react'
import { Card, Button, Spin, message, Space, Input, Divider, Tag, Empty, Typography, Popconfirm, Tooltip, Alert } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, SaveOutlined, EyeOutlined, FileMarkdownOutlined, CloseOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import { getWikiPage, updateWikiPage, deleteWikiPage } from '../api/wiki'
import useNavigationStore from '../stores/navigationStore'
import '../styles/wikiPageEnhanced.css'

const { Title, Text } = Typography

const WikiPageViewEnhanced = ({ pageSlug, navigateToRoute }) => {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const selectedWikiSpaceSlug = useNavigationStore(state => state.selectedWikiSpaceSlug)

  useEffect(() => {
    if (pageSlug) {
      loadPageData()
    }
  }, [pageSlug])

  const loadPageData = async () => {
    try {
      setLoading(true)
      const pageData = await getWikiPage(pageSlug)
      setPage(pageData)
      setTitle(pageData.title || '')
      setContent(pageData.content || '')
    } catch (error) {
      console.error(error)
      message.error('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      message.error('Page title cannot be empty')
      return
    }
    try {
      setSaving(true)
      await updateWikiPage(pageSlug, {
        title,
        content
      })
      message.success('Page saved successfully')
      setEditing(false)
      loadPageData()
    } catch (error) {
      console.error(error)
      message.error('Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setTitle(page.title || '')
    setContent(page.content || '')
    setEditing(false)
  }

  const handleDelete = async () => {
    try {
      await deleteWikiPage(pageSlug)
      message.success('Page deleted successfully')
      handleBack()
    } catch (error) {
      console.error(error)
      message.error('Failed to delete page')
    }
  }

  const handleBack = () => {
    if (selectedWikiSpaceSlug) {
      navigateToRoute('wiki-space', selectedWikiSpaceSlug)
    } else {
      navigateToRoute('wiki')
    }
  }

  if (loading) {
    return (
      <div className="wiki-loading">
        <Spin size="large" />
        <Text type="secondary" style={{ marginTop: '16px' }}>Loading documentation...</Text>
      </div>
    )
  }

  if (!page) {
    return (
      <div className="wiki-page-container">
        <Button
          type="text"
          onClick={handleBack}
          className="wiki-back-button"
          icon={<ArrowLeftOutlined />}
        >
          Back to Wiki
        </Button>
        <Empty
          description="Page not found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    )
  }

  return (
    <div className="wiki-page-container">
      {/* Navigation Breadcrumb */}
      <div className="wiki-breadcrumb">
        <Button
          type="text"
          onClick={handleBack}
          icon={<ArrowLeftOutlined />}
          className="wiki-back-button"
        >
          Back to Wiki
        </Button>
        {editing && (
          <Alert
            message="Editing Mode"
            description="Make your changes and click Save when done"
            type="info"
            showIcon
            closable
            onClose={() => setEditing(false)}
            style={{ marginLeft: '16px', flex: 1 }}
          />
        )}
      </div>

      <Card className="wiki-page-card" bordered={false}>
        {/* Header Section - Gestalt: Proximity & Common Region */}
        <div className="wiki-page-header">
          <div className="wiki-page-header-content">
            {editing ? (
              <div className="wiki-title-editor">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Page title"
                  className="wiki-title-input"
                  size="large"
                  prefix={<FileMarkdownOutlined />}
                />
              </div>
            ) : (
              <div className="wiki-title-display">
                <Title level={1} className="wiki-title">
                  {title}
                </Title>
              </div>
            )}

            {/* Meta Tags - Gestalt: Similarity */}
            <div className="wiki-meta-tags">
              {page.custom_linked_project && (
                <Tag color="blue" icon={<span>🔗</span>} className="wiki-tag">
                  Project: {page.custom_linked_project_name}
                </Tag>
              )}
              <Tag color={page.published ? 'success' : 'default'} className="wiki-tag">
                {page.published ? '✓ Published' : '📝 Draft'}
              </Tag>
              <Tag color="geekblue" className="wiki-tag">
                📄 Markdown
              </Tag>
            </div>
          </div>

          {/* Action Buttons - Gestalt: Proximity */}
          {!editing && (
            <Space className="wiki-actions">
              <Tooltip title="Edit this page">
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditing(true)}
                  size="large"
                >
                  Edit
                </Button>
              </Tooltip>
              <Popconfirm
                title="Delete Page"
                description="Are you sure you want to delete this page? This action cannot be undone."
                onConfirm={handleDelete}
                okText="Yes, Delete"
                cancelText="Cancel"
                okButtonProps={{ danger: true }}
              >
                <Tooltip title="Delete this page">
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                    size="large"
                  >
                    Delete
                  </Button>
                </Tooltip>
              </Popconfirm>
            </Space>
          )}
        </div>

        <Divider className="wiki-divider" />

        {/* Content Section */}
        {editing ? (
          <div className="wiki-editor-section">
            {/* Professional Markdown Editor with Live Preview */}
            <div className="wiki-editor-container">
              <MDEditor
                value={content}
                onChange={setContent}
                preview="live"
                height={600}
                visibleDragbar={false}
                className="wiki-md-editor"
              />
            </div>

            {/* Editor Actions - Gestalt: Common Fate */}
            <div className="wiki-editor-actions">
              <Space size="large">
                <Button
                  type="primary"
                  icon={<SaveOutlined />}
                  loading={saving}
                  onClick={handleSave}
                  size="large"
                >
                  {saving ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancel}
                  size="large"
                >
                  Cancel
                </Button>
              </Space>
            </div>
          </div>
        ) : (
          /* View Mode - Professional Documentation Layout */
          <div className="wiki-content-display">
            {content ? (
              <div
                className="wiki-markdown-content"
                dangerouslySetInnerHTML={{ __html: page.html_content || content }}
              />
            ) : (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={
                  <span>
                    <Text type="secondary">No content yet</Text>
                    <br />
                    <Button
                      type="link"
                      onClick={() => setEditing(true)}
                      icon={<EditOutlined />}
                    >
                      Add content
                    </Button>
                  </span>
                }
              />
            )}
          </div>
        )}
      </Card>

      {/* Help Section - Gestalt: Closure */}
      {editing && (
        <Card className="wiki-help-card" size="small">
          <Text type="secondary">
            <strong>💡 Tip:</strong> Use markdown syntax for formatting.
            The preview updates in real-time as you type.
          </Text>
        </Card>
      )}
    </div>
  )
}

export default WikiPageViewEnhanced
