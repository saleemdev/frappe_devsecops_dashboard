import React, { useState, useEffect } from 'react'
import { Card, Button, Spin, message, Space, Input, Divider, Tag, Empty, Typography, Popconfirm, Tooltip, Alert, theme, Row, Col, Switch, Descriptions } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, SaveOutlined, EyeOutlined, FileMarkdownOutlined, CloseOutlined, CopyOutlined, LinkOutlined, ShareAltOutlined, UserOutlined, ClockCircleOutlined, CheckCircleOutlined, FileProtectOutlined, GlobalOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import { getWikiPage, updateWikiPage, deleteWikiPage, publishWikiPage, unpublishWikiPage, toggleGuestAccess } from '../api/wiki'
import useNavigationStore from '../stores/navigationStore'
import { getIsDarkMode, getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'
import WikiShareModal from './WikiShareModal'
import WikiBreadcrumb from './WikiBreadcrumb'
import '../styles/wikiPageEnhanced.css'
import '../styles/wikiDesignSystem.css'

const { Title, Text } = Typography

const WikiPageViewEnhanced = ({ pageSlug, navigateToRoute }) => {
  const { token } = theme.useToken()
  const isDarkMode = getIsDarkMode(token)
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [shareModalVisible, setShareModalVisible] = useState(false)
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

  const copyToClipboard = (text) => {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
    }

    // Fallback for older browsers or non-HTTPS contexts
    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (success) {
          resolve()
        } else {
          reject(new Error('Copy failed'))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  const handleCopyLink = () => {
    // Use route as-is - it already contains the full path
    const url = page?.route
      ? `${window.location.origin}/${page.route}`
      : `${window.location.origin}${window.location.pathname}#wiki/page/${pageSlug}`

    copyToClipboard(url).then(() => {
      message.success('✓ Page link copied to clipboard!')
    }).catch(() => {
      message.error('Failed to copy link')
    })
  }

  const handleOpenPublicLink = () => {
    if (page?.route) {
      // Use route as-is - it already contains the full path
      const url = `${window.location.origin}/${page.route}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      message.info('This page does not have a public URL yet')
    }
  }

  const handlePublish = async () => {
    try {
      setPublishing(true)
      const result = await publishWikiPage(pageSlug)
      console.log('Publish result:', result)
      message.success('Page published successfully!')
      await loadPageData() // Reload to get updated state
    } catch (error) {
      console.error('Publish error:', error)
      message.error(error?.message || 'Failed to publish page')
    } finally {
      setPublishing(false)
    }
  }

  const handleUnpublish = async () => {
    try {
      setPublishing(true)
      const result = await unpublishWikiPage(pageSlug)
      console.log('Unpublish result:', result)
      message.success('Page unpublished (marked as draft)')
      await loadPageData() // Reload to get updated state
    } catch (error) {
      console.error('Unpublish error:', error)
      message.error(error?.message || 'Failed to unpublish page')
    } finally {
      setPublishing(false)
    }
  }

  const handleGuestAccessToggle = async (checked) => {
    try {
      await toggleGuestAccess(pageSlug, checked)
      message.success(checked ? 'Guest access enabled' : 'Guest access disabled')
      loadPageData() // Reload to get updated state
    } catch (error) {
      console.error(error)
      message.error('Failed to toggle guest access')
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

  // Use route as-is - it already contains the full path
  const pageUrl = page.route
    ? `${window.location.origin}/${page.route}`
    : `${window.location.origin}${window.location.pathname}#wiki/page/${pageSlug}`

  return (
    <div className="wiki-page-container">
      {/* Breadcrumb Navigation */}
      <WikiBreadcrumb
        spaceName={page.wiki_space_name || page.wiki_space}
        spaceSlug={page.wiki_space}
        pageName={page.title}
        navigateToRoute={navigateToRoute}
      />

      {editing && (
        <Alert
          message="Editing Mode"
          description="Make your changes and click Save when done"
          type="info"
          showIcon
          closable
          onClose={() => setEditing(false)}
          style={{ marginBottom: '16px' }}
        />
      )}

      {/* Header Banner - Gestalt: Figure/Ground with gradient */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} lg={16}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('wiki-space', page.wiki_space)}
                type="default"
                size="large"
              >
                Back to Wiki Space
              </Button>

              {editing ? (
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Page title"
                  size="large"
                  prefix={<FileMarkdownOutlined />}
                  style={{ fontSize: '24px', fontWeight: 'bold' }}
                />
              ) : (
                <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                  <FileMarkdownOutlined style={{
                    marginRight: 16,
                    color: '#1890ff',
                    fontSize: '32px'
                  }} />
                  {title}
                </Title>
              )}

              {/* Status Tags */}
              {!editing && (
                <Space wrap size="small">
                  <Tag
                    icon={page.published ? <CheckCircleOutlined /> : <EditOutlined />}
                    color={page.published ? 'success' : 'default'}
                    style={{ fontSize: '14px', padding: '6px 12px' }}
                  >
                    <strong>Status:</strong> {page.published ? 'Published' : 'Draft'}
                  </Tag>
                  <Tag
                    icon={<GlobalOutlined />}
                    color={page.allow_guest ? 'blue' : 'default'}
                    style={{ fontSize: '14px', padding: '6px 12px' }}
                  >
                    <strong>Access:</strong> {page.allow_guest ? 'Public' : 'Private'}
                  </Tag>
                  {page.custom_linked_project && (
                    <Tag
                      icon={<LinkOutlined />}
                      color="purple"
                      style={{ fontSize: '14px', padding: '6px 12px' }}
                    >
                      <strong>Project:</strong> {page.custom_linked_project_name}
                    </Tag>
                  )}
                </Space>
              )}
            </Space>
          </Col>

          {/* Action Buttons - Right aligned on desktop, stacked on mobile */}
          <Col xs={24} lg={8}>
            {!editing && (
              <Space wrap style={{
                justifyContent: 'flex-end',
                width: '100%'
              }}>
                {page.route && (
                  <Tooltip title="Open public page">
                    <Button
                      icon={<LinkOutlined />}
                      onClick={handleOpenPublicLink}
                      type="default"
                      size="large"
                    />
                  </Tooltip>
                )}
                <Tooltip title="Copy page link">
                  <Button
                    icon={<CopyOutlined />}
                    onClick={handleCopyLink}
                    type="default"
                    size="large"
                  />
                </Tooltip>
                <Tooltip title={page.allow_guest ? "Disable guest access" : "Enable guest access"}>
                  <Button
                    icon={<GlobalOutlined />}
                    onClick={() => handleGuestAccessToggle(!page.allow_guest)}
                    type="default"
                    size="large"
                    style={{ color: page.allow_guest ? '#52c41a' : '#8c8c8c' }}
                  />
                </Tooltip>
                {page.published ? (
                  <Button
                    icon={<FileProtectOutlined />}
                    onClick={handleUnpublish}
                    loading={publishing}
                    disabled={publishing}
                    size="large"
                    type="default"
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    icon={<CheckCircleOutlined />}
                    onClick={handlePublish}
                    loading={publishing}
                    disabled={publishing}
                    size="large"
                    type="default"
                    style={{ color: '#52c41a', borderColor: '#52c41a' }}
                  >
                    Publish
                  </Button>
                )}
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={() => setEditing(true)}
                  size="large"
                  style={{ minWidth: '120px' }}
                >
                  Edit Page
                </Button>
              </Space>
            )}
          </Col>
        </Row>
      </Card>

      {/* Share Modal */}
      <WikiShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={page.title}
        url={pageUrl}
        type="page"
      />

      {/* Page Details Card with Descriptions */}
      {!editing && (
        <Card
          title={
            <Space>
              <FileMarkdownOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
              <span>Page Information</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
          <Descriptions bordered column={2}>
            <Descriptions.Item label={
              <Space size={8}>
                <UserOutlined />
                <span>Publisher</span>
              </Space>
            }>
              {page.owner_full_name || page.owner || 'Unknown'}
            </Descriptions.Item>

            <Descriptions.Item label={
              <Space size={8}>
                <ClockCircleOutlined />
                <span>Created</span>
              </Space>
            }>
              {page.creation ? new Date(page.creation).toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }) : 'N/A'}
            </Descriptions.Item>

            <Descriptions.Item label={
              <Space size={8}>
                <EditOutlined />
                <span>Last Modified</span>
              </Space>
            }>
              {page.modified ? new Date(page.modified).toLocaleString(undefined, {
                year: 'numeric', month: 'short', day: 'numeric',
                hour: '2-digit', minute: '2-digit'
              }) : 'N/A'}
            </Descriptions.Item>

            {page?.route && (
              <Descriptions.Item label={
                <Space size={8}>
                  <LinkOutlined />
                  <span>Public URL</span>
                </Space>
              }>
                <code style={{
                  backgroundColor: '#f5f5f5',
                  padding: '2px 6px',
                  borderRadius: '3px'
                }}>
                  /{page.route}
                </code>
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      <Card bordered={false}>

        {/* Content Section */}
        {editing ? (
          <div className="wiki-editor-section">
            {/* Professional Markdown Editor with Live Preview */}
            <div className="wiki-editor-container" data-color-mode={isDarkMode ? 'dark' : 'light'}>
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
