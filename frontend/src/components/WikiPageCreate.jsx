import React, { useState, useEffect } from 'react'
import { Card, Button, Input, Space, Typography, message, theme, Row, Col, Alert, Tooltip, Divider } from 'antd'
import { ArrowLeftOutlined, SaveOutlined, FileMarkdownOutlined, EyeOutlined, InfoCircleOutlined, CheckCircleOutlined, EditOutlined } from '@ant-design/icons'
import MDEditor from '@uiw/react-md-editor'
import { createWikiPage, getWikiSpace } from '../api/wiki'
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

const WikiPageCreate = ({ spaceSlug, navigateToRoute }) => {
  const { token } = theme.useToken()
  const isDarkMode = getIsDarkMode(token)
  const DRAFT_KEY = `wiki:create:${spaceSlug}`
  const [spaceRoute, setSpaceRoute] = useState('')
  const [routeError, setRouteError] = useState('')
  const [title, setTitle] = useState('')
  const [route, setRoute] = useState('')
  const [content, setContent] = useState('')
  const [published, setPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [routeEdited, setRouteEdited] = useState(false)

  useEffect(() => {
    let mounted = true
    ;(async () => {
      try {
        const space = await getWikiSpace(spaceSlug)
        if (mounted) setSpaceRoute(space?.route || '')
      } catch (e) {
        // ignore; keep empty route
      }
      // restore draft or init
      try {
        const raw = localStorage.getItem(DRAFT_KEY)
        if (raw) {
          const draft = JSON.parse(raw)
          if (mounted) {
            if (draft.title) setTitle(draft.title)
            if (draft.route) setRoute(draft.route)
            if (draft.content) setContent(draft.content)
            if (typeof draft.published === 'boolean') setPublished(draft.published)
          }
        } else {
          if (mounted) setContent('# New Page\n\n')
        }
      } catch {
        if (mounted) setContent('# New Page\n\n')
      }
    })()
    return () => { mounted = false }
  }, [spaceSlug])

  useEffect(() => {
    const payload = { title, route, content, published }
    localStorage.setItem(DRAFT_KEY, JSON.stringify(payload))
  }, [title, route, content, published])

  const onTitleChange = (val) => {
    setTitle(val)
    if (!routeEdited) setRoute(generateSlug(val))
  }

  const onRouteChange = (val) => {
    setRouteEdited(true)
    const slug = generateSlug(val)
    setRoute(slug)
    const ok = /^[a-z0-9-]+$/.test(slug)
    setRouteError(ok ? '' : 'Route can include lowercase letters, numbers, and hyphens only')
  }

  const handleCancel = () => {
    navigateToRoute('wiki-space', spaceSlug)
  }

  const handleCreate = async (publishNow) => {
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

    const finalRoute = spaceRoute ? `${spaceRoute}/${route}` : route

    try {
      setSaving(true)
      const payload = {
        title,
        route: finalRoute,
        content,
        wikiSpace: spaceSlug,
        published: publishNow ? 1 : 0
      }
      const created = await createWikiPage(payload)
      message.success(publishNow ? 'Wiki page published' : 'Draft saved')
      localStorage.removeItem(DRAFT_KEY)
      navigateToRoute('wiki-page', spaceSlug, created.name)
    } catch (e) {
      console.error(e)
      message.error(e?.message || 'Failed to create page')
    } finally {
      setSaving(false)
    }
  }

  const openPreview = () => {
    if (!spaceRoute || !route) {
      message.info('Enter a route to preview')
      return
    }
    const url = `/app/wiki/${spaceRoute}/${route}`
    window.open(url, '_blank', 'noopener')
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
                onClick={handleCancel}
                icon={<ArrowLeftOutlined />}
                style={{ padding: '0 0', marginBottom: '8px', color: getHeaderIconColor(token) }}
              >
                Back to Space
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <EditOutlined style={{ marginRight: 16, color: getHeaderIconColor(token), fontSize: '32px' }} />
                Create Wiki Page
              </Title>
              <Text type="secondary">Build documentation with markdown</Text>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
            <Space>
              <Tooltip title="Save as draft without publishing">
                <Button
                  icon={<SaveOutlined />}
                  onClick={() => handleCreate(false)}
                  disabled={saving}
                  size="large"
                >
                  Save Draft
                </Button>
              </Tooltip>
              <Tooltip title="Create and publish immediately">
                <Button
                  type="primary"
                  icon={<CheckCircleOutlined />}
                  loading={saving}
                  onClick={() => handleCreate(true)}
                  size="large"
                >
                  {saving ? 'Publishing...' : 'Publish'}
                </Button>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Workflow Info Alert */}
      <Alert
        message="📝 Save Draft vs Publish"
        description={
          <div>
            <strong>Save Draft:</strong> Creates the page but keeps it private (not visible on public wiki).<br/>
            <strong>Publish:</strong> Creates the page and makes it publicly accessible at <Text code>/wiki/your-page-route</Text>
          </div>
        }
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        closable
      />

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
                  <Text strong style={{ fontSize: '13px' }}>URL SLUG</Text>
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
                  prefix={<Text type="secondary" style={{ fontSize: '13px' }}>/{spaceRoute || 'space'}/</Text>}
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
                      <Text code style={{ fontSize: '12px' }}>/{spaceRoute || 'space'}/{route}</Text>
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
                  <li>Save drafts frequently (auto-saved locally)</li>
                  <li>Preview before publishing</li>
                </ul>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <div>
                <Text strong style={{ fontSize: '12px', color: '#8c8c8c' }}>DRAFTS</Text>
                <div style={{ marginTop: 8, fontSize: '12px', lineHeight: '1.8', color: '#595959' }}>
                  Your work is automatically saved locally. You can safely leave and return to continue editing.
                </div>
              </div>

              <Divider style={{ margin: '8px 0' }} />

              <Button
                type="link"
                icon={<EyeOutlined />}
                onClick={openPreview}
                disabled={!spaceRoute || !route}
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

export default WikiPageCreate

