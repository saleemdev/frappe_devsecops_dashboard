import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Space, Typography, message, theme, Row, Col, Alert, Tooltip, Divider, Spin, Tag, Switch } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, FileMarkdownOutlined, EyeOutlined, InfoCircleOutlined, CheckCircleOutlined, EditOutlined, StopOutlined, GlobalOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import { createWikiPage, updateWikiPage, getWikiPage } from '../api/wiki'
import { getIsDarkMode, getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'
import '../styles/wikiDesignSystem.css'

const { Title, Text } = Typography

const generateSlug = (text) => {
  return (text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

/**
 * WikiPageEdit Component
 *
 * Unified component for creating and editing Wiki Pages
 *
 * Props:
 * - mode: 'create' | 'edit'
 * - wikiSpaceName: The Wiki Space document name (required for create mode)
 * - pageId: The Wiki Page document name (required for edit mode)
 * - navigateToRoute: Navigation function
 */
const WikiPageEdit = ({ mode = 'create', wikiSpaceName, pageId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const isDarkMode = getIsDarkMode(token)
  const isEditMode = mode === 'edit'

  const [loading, setLoading] = useState(isEditMode)
  const [saving, setSaving] = useState(false)
  const [routeError, setRouteError] = useState('')
  const [routeEdited, setRouteEdited] = useState(false)

  const [title, setTitle] = useState('')
  const [route, setRoute] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(false)
  const [allowGuest, setAllowGuest] = useState(false)
  const [loadedWikiSpace, setLoadedWikiSpace] = useState(null)

  // Load existing page in edit mode
  useEffect(() => {
    if (!isEditMode || !pageId) return

    let mounted = true
    ;(async () => {
      try {
        setLoading(true)
        const page = await getWikiPage(pageId)
        if (mounted) {
          setTitle(page.title || '')
          setRoute(page.route || '')
          setContent(page.content || '')
          setPublished(!!page.published)
          setAllowGuest(!!page.allow_guest)
          setLoadedWikiSpace(page.wiki_space || null)
          setRouteEdited(true) // Prevent auto-generation in edit mode
        }
      } catch (error) {
        console.error('Error loading page:', error)
        message.error('Failed to load wiki page')
      } finally {
        if (mounted) setLoading(false)
      }
    })()

    return () => { mounted = false }
  }, [isEditMode, pageId])

  // Auto-save draft to localStorage in create mode
  useEffect(() => {
    if (isEditMode) return
    if (!wikiSpaceName) return

    const DRAFT_KEY = `wiki:create:${wikiSpaceName}`
    const payload = { title, route, content, published }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  }, [title, route, content, published, isEditMode, wikiSpaceName])

  // Restore draft in create mode
  useEffect(() => {
    if (isEditMode) return
    if (!wikiSpaceName) return

    const DRAFT_KEY = `wiki:create:${wikiSpaceName}`
    try {
      const raw = localStorage.getItem(DRAFT_KEY)
      if (raw) {
        const draft = JSON.parse(raw)
        if (draft.title) setTitle(draft.title)
        if (draft.route) setRoute(draft.route)
        if (draft.content) setContent(draft.content)
        if (typeof draft.published === 'boolean') setPublished(draft.published)
      } else {
        setContent('# New Page\n\nStart writing your documentation here...\n\n')
      }
    } catch {
      setContent('# New Page\n\nStart writing your documentation here...\n\n')
    }
  }, [isEditMode, wikiSpaceName])

  const onTitleChange = (val) => {
    setTitle(val)
    if (!routeEdited && !isEditMode) {
      setRoute(generateSlug(val))
    }
  }

  const onRouteChange = (val) => {
    setRouteEdited(true)
    const slug = generateSlug(val)
    setRoute(slug)
    const ok = /^[a-z0-9-]+$/.test(slug)
    setRouteError(ok ? '' : 'Route can include lowercase letters, numbers, and hyphens only')
  }

  const handleBack = () => {
    navigateToRoute('wiki')
  }

  const handleSave = async (publishNow) => {
    if (!title.trim()) {
      message.error('Title is required')
      return
    }
    if (!route.trim()) {
      message.error('Route (URL slug) is required')
      return
    }
    if (routeError) {
      message.error(routeError)
      return
    }

    try {
      setSaving(true)

      if (isEditMode) {
        // Update existing page
        const payload = {
          name: pageId,
          title,
          route,
          content,
          published: publishNow ? 1 : (published ? 1 : 0), // Preserve current state when not explicitly publishing
          allow_guest: allowGuest ? 1 : 0
        }
        const updatedPage = await updateWikiPage(pageId, payload)

        // Show specific success message
        if (publishNow) {
          message.success('Wiki page published successfully')
        } else {
          message.success('Changes saved successfully')
        }

        // Reload page data without navigating away
        setPublished(!!updatedPage.published)
        setAllowGuest(!!updatedPage.allow_guest)
      } else {
        // Create new page - wiki_space will be added via sidebars child table
        const payload = {
          title,
          route,
          content,
          wiki_space: wikiSpaceName, // Backend will add to sidebars child table
          published: publishNow ? 1 : 0,
          allow_guest: allowGuest ? 1 : 0
        }
        const created = await createWikiPage(payload)
        message.success(publishNow ? 'Wiki page published' : 'Draft saved')

        // Clear draft from localStorage
        const DRAFT_KEY = `wiki:create:${wikiSpaceName}`
        localStorage.removeItem(DRAFT_KEY)

        // Set flags to refresh and expand the space when returning
        sessionStorage.setItem('wiki:refreshOnNextVisit', '1')
        sessionStorage.setItem('wiki:expandSpace', wikiSpaceName)

        // Navigate back to wiki space page
        navigateToRoute('wiki-space', wikiSpaceName)
      }
    } catch (error) {
      console.error('Error saving page:', error)
      message.error(error?.message || 'Failed to save page')
    } finally {
      setSaving(false)
    }
  }

  const handleUnpublish = async () => {
    if (!isEditMode || !pageId) return

    try {
      setSaving(true)
      const payload = {
        name: pageId,
        published: 0
      }
      const updatedPage = await updateWikiPage(pageId, payload)
      message.success('Wiki page unpublished')
      setPublished(false)
    } catch (error) {
      console.error('Error unpublishing page:', error)
      message.error('Failed to unpublish page')
    } finally {
      setSaving(false)
    }
  }

  const openPreview = () => {
    if (!route) {
      message.info('Enter a route to preview')
      return
    }
    const url = `/${route}`
    window.open(url, '_blank', 'noopener')
  }

  if (loading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Loading wiki page...</Text>
        </div>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Card with Gradient */}
      <Card style={{ ...getHeaderBannerStyle(token), marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col xs={24} sm={16}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button
                type="text"
                onClick={handleBack}
                icon={<ArrowLeftOutlined />}
                style={{ padding: '0 0', marginBottom: '8px', color: getHeaderIconColor(token) }}
              >
                Back to Wiki Home
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <EditOutlined style={{ marginRight: 16, color: getHeaderIconColor(token), fontSize: '32px' }} />
                {isEditMode ? 'Edit Wiki Page' : 'Create Wiki Page'}
                {isEditMode && (
                  <Tag
                    color={published ? 'success' : 'warning'}
                    icon={published ? <CheckCircleOutlined /> : <FileMarkdownOutlined />}
                    style={{ marginLeft: 12, fontSize: '14px', padding: '4px 12px' }}
                  >
                    {published ? 'Published' : 'Draft'}
                  </Tag>
                )}
              </Title>
              <Text type="secondary">
                {isEditMode ? 'Update your documentation' : 'Build documentation with markdown'}
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size="small" style={{ width: '100%', alignItems: 'flex-end' }}>
              {/* Toggles row */}
              {isEditMode && (
                <Space>
                  <Tooltip title="Allow guests to view this page without login">
                    <Space>
                      <GlobalOutlined />
                      <Text>Allow Guest Access</Text>
                      <Switch
                        checked={allowGuest}
                        onChange={setAllowGuest}
                        disabled={saving}
                      />
                    </Space>
                  </Tooltip>
                </Space>
              )}

              {/* Buttons row */}
              <Space>
                {/* Show View Page link if published */}
                {published && route && (
                  <Tooltip title="View published page">
                    <Button
                      icon={<EyeOutlined />}
                      onClick={() => window.open(`${window.location.origin}/${route}`, '_blank')}
                      size="large"
                    >
                      View Page
                    </Button>
                  </Tooltip>
                )}

                {/* Unpublish button - only show if published */}
                {published && isEditMode && (
                  <Tooltip title="Unpublish this page (make it a draft)">
                    <Button
                      icon={<StopOutlined />}
                      onClick={handleUnpublish}
                      disabled={saving}
                      size="large"
                      danger
                    >
                      Unpublish
                    </Button>
                  </Tooltip>
                )}

                {/* Save button - always visible */}
                <Tooltip title={published ? 'Save changes' : 'Save as draft without publishing'}>
                  <Button
                    icon={<SaveOutlined />}
                    onClick={() => handleSave(false)}
                    disabled={saving}
                    size="large"
                  >
                    {published ? 'Save Changes' : 'Save Draft'}
                  </Button>
                </Tooltip>

                {/* Publish button - only show if not already published */}
                {!published && (
                  <Tooltip title={isEditMode ? 'Save and publish' : 'Create and publish immediately'}>
                    <Button
                      type="primary"
                      icon={<CheckCircleOutlined />}
                      loading={saving}
                      onClick={() => handleSave(true)}
                      size="large"
                    >
                      {saving ? 'Publishing...' : 'Publish'}
                    </Button>
                  </Tooltip>
                )}
              </Space>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Workflow Info Alert (only show in create mode) */}
      {!isEditMode && (
        <Alert
          message="📝 Save Draft vs Publish"
          description={
            <div>
              <strong>Save Draft:</strong> Creates the page but keeps it private (not visible on public wiki).<br/>
              <strong>Publish:</strong> Creates the page and makes it publicly accessible at <Text code>/{route}</Text>
            </div>
          }
          type="info"
          showIcon
          style={{ marginBottom: 16 }}
          closable
        />
      )}

      <Row gutter={24}>
        {/* Main Form Column */}
        <Col xs={24} lg={16}>
          <Card style={{ marginBottom: 24 }}>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Title Section */}
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: '13px' }}>PAGE TITLE</Text>
                  <Text type="danger"> *</Text>
                </div>
                <Input
                  size="large"
                  placeholder="e.g., Getting Started Guide"
                  value={title}
                  onChange={(e) => onTitleChange(e.target.value)}
                  disabled={saving}
                  style={{ fontSize: '16px' }}
                />
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Route Section with Preview */}
              <div>
                <div style={{ marginBottom: 8 }}>
                  <Text strong style={{ fontSize: '13px' }}>URL ROUTE</Text>
                  <Text type="danger"> *</Text>
                  <Tooltip title="Auto-generated from title, but you can customize it">
                    <InfoCircleOutlined style={{ marginLeft: 8, color: '#8c8c8c' }} />
                  </Tooltip>
                </div>
                <Input
                  size="large"
                  placeholder="auto-generated-from-title"
                  value={route}
                  onChange={(e) => onRouteChange(e.target.value)}
                  disabled={saving}
                  status={routeError ? 'error' : undefined}
                  addonBefore="/"
                />
                {routeError && (
                  <Alert
                    message={routeError}
                    type="error"
                    showIcon
                    style={{ marginTop: 8 }}
                  />
                )}
                {!routeError && route && (
                  <div style={{ marginTop: 8, padding: '8px 12px', background: '#f0f5ff', borderRadius: '4px', border: '1px solid #d6e4ff' }}>
                    <Space size={4}>
                      <EyeOutlined style={{ color: '#1890ff' }} />
                      <Text type="secondary" style={{ fontSize: '12px' }}>Preview URL:</Text>
                      <Text code style={{ fontSize: '12px' }}>/{route}</Text>
                    </Space>
                  </div>
                )}
              </div>

              <Divider style={{ margin: '12px 0' }} />

              {/* Markdown Editor Section */}
              <div>
                <div style={{ marginBottom: 12 }}>
                  <Text strong style={{ fontSize: '13px' }}>CONTENT (MARKDOWN)</Text>
                  <Text type="secondary" style={{ marginLeft: 8, fontSize: '12px' }}>
                    Use markdown syntax to format your documentation
                  </Text>
                </div>
                <div className="wiki-md-editor-container" data-color-mode={isDarkMode ? 'dark' : 'light'} style={{ padding: '8px 0' }}>
                  <MDEditor
                    value={content}
                    onChange={setContent}
                    height={600}
                    preview="live"
                    style={{ borderRadius: '8px' }}
                  />
                </div>
              </div>
            </Space>
          </Card>
        </Col>

        {/* Help Sidebar */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <Space>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                <Text strong>Quick Guide</Text>
              </Space>
            }
            style={{ marginBottom: 24, position: 'sticky', top: 24 }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Text strong style={{ fontSize: '12px', color: '#8c8c8c' }}>MARKDOWN BASICS</Text>
                <div style={{ marginTop: 8, fontSize: '12px', lineHeight: '1.8' }}>
                  <div><Text code># Heading 1</Text></div>
                  <div><Text code>## Heading 2</Text></div>
                  <div><Text code>**bold text**</Text></div>
                  <div><Text code>*italic text*</Text></div>
                  <div><Text code>[link](url)</Text></div>
                  <div><Text code>![image](url)</Text></div>
                  <div><Text code>`code`</Text></div>
                  <div><Text code>```language</Text> for code blocks</div>
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div>
                <Text strong style={{ fontSize: '12px', color: '#8c8c8c' }}>TIPS</Text>
                <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: '12px', lineHeight: '1.8', color: '#595959' }}>
                  <li>Use headings to organize content</li>
                  <li>Add code blocks for technical examples</li>
                  <li>Include images to illustrate concepts</li>
                  <li>Save drafts frequently {!isEditMode && '(auto-saved locally)'}</li>
                  <li>Preview before publishing</li>
                </ul>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              {!isEditMode && (
                <>
                  <div>
                    <Text strong style={{ fontSize: '12px', color: '#8c8c8c' }}>DRAFTS</Text>
                    <div style={{ marginTop: 8, fontSize: '12px', lineHeight: '1.8', color: '#595959' }}>
                      Your work is automatically saved locally. You can safely leave and return to continue editing.
                    </div>
                  </div>
                  <Divider style={{ margin: '8px 0' }} />
                </>
              )}

              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={openPreview}
                disabled={!route}
                style={{ padding: 0, height: 'auto', fontSize: '13px' }}
              >
                Preview in Wiki
              </Button>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default WikiPageEdit
