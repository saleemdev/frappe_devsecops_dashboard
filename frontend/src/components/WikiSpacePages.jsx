import React, { useState, useEffect } from 'react'
import { Card, Button, Table, Tag, Typography, Popconfirm, Tooltip, Input, Space, Divider, Spin, Empty, Row, Col, theme, message } from 'antd'
import { ArrowLeftOutlined, PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, CheckOutlined, CloseOutlined, LinkOutlined, CheckCircleOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons'
import { getWikiSpace, getWikiSpaceSidebar, updateWikiSpaceSidebar, deleteWikiPage } from '../api/wiki'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

/**
 * WikiSpacePages - Dedicated page to view and manage pages in a Wiki Space
 */
const WikiSpacePages = ({ spaceId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [space, setSpace] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingLabel, setEditingLabel] = useState(null)
  const [labelText, setLabelText] = useState('')

  useEffect(() => {
    loadSpaceAndPages()
  }, [spaceId])

  const loadSpaceAndPages = async () => {
    try {
      setLoading(true)
      // Load space details and pages in parallel
      const [spaceData, pagesData] = await Promise.all([
        getWikiSpace(spaceId),
        getWikiSpaceSidebar(spaceId)
      ])
      console.log('📘 [WikiSpacePages] Space data:', spaceData)
      console.log('📘 [WikiSpacePages] Pages data:', pagesData)
      setSpace(spaceData)
      setPages(pagesData || [])
    } catch (error) {
      console.error('Error loading space and pages:', error)
      message.error('Failed to load wiki space')
    } finally {
      setLoading(false)
    }
  }

  const loadPages = async () => {
    try {
      const data = await getWikiSpaceSidebar(spaceId)
      console.log('📘 [WikiSpacePages] Reloaded pages:', data)
      setPages(data || [])
    } catch (error) {
      console.error('Error loading pages:', error)
      message.error('Failed to reload pages')
    }
  }

  const handleBack = () => {
    navigateToRoute('wiki')
  }

  const handleCreatePage = () => {
    navigateToRoute('wiki-page-create', spaceId)
  }

  const handleEditLabel = (page) => {
    setEditingLabel(page.wiki_page)
    setLabelText(page.parent_label || page.page_title || '')
  }

  const handleCancelEdit = () => {
    setEditingLabel(null)
    setLabelText('')
  }

  const handleSaveLabel = async (page) => {
    try {
      const updatedItems = pages.map(p => ({
        name: p.name, // Wiki Group Item name (required for backend update)
        wiki_page: p.wiki_page,
        parent_label: p.wiki_page === page.wiki_page ? labelText : (p.parent_label || p.page_title),
        idx: p.idx
      }))

      await updateWikiSpaceSidebar(spaceId, updatedItems)
      await loadPages()
      setEditingLabel(null)
      setLabelText('')
    } catch (error) {
      console.error('Error saving label:', error)
      message.error('Failed to update label')
    }
  }

  const handleMovePageUp = async (page) => {
    const currentIndex = pages.findIndex(p => p.wiki_page === page.wiki_page)
    if (currentIndex <= 0) return

    const reordered = [...pages]
    const temp = reordered[currentIndex]
    reordered[currentIndex] = reordered[currentIndex - 1]
    reordered[currentIndex - 1] = temp

    const updatedItems = reordered.map((p, index) => ({
      name: p.name, // Wiki Group Item name (required for backend update)
      wiki_page: p.wiki_page,
      parent_label: p.parent_label || p.page_title,
      idx: index + 1
    }))

    try {
      await updateWikiSpaceSidebar(spaceId, updatedItems)
      await loadPages()
    } catch (error) {
      console.error('Error reordering pages:', error)
      message.error('Failed to reorder pages')
    }
  }

  const handleMovePageDown = async (page) => {
    const currentIndex = pages.findIndex(p => p.wiki_page === page.wiki_page)
    if (currentIndex < 0 || currentIndex >= pages.length - 1) return

    const reordered = [...pages]
    const temp = reordered[currentIndex]
    reordered[currentIndex] = reordered[currentIndex + 1]
    reordered[currentIndex + 1] = temp

    const updatedItems = reordered.map((p, index) => ({
      name: p.name, // Wiki Group Item name (required for backend update)
      wiki_page: p.wiki_page,
      parent_label: p.parent_label || p.page_title,
      idx: index + 1
    }))

    try {
      await updateWikiSpaceSidebar(spaceId, updatedItems)
      await loadPages()
    } catch (error) {
      console.error('Error reordering pages:', error)
      message.error('Failed to reorder pages')
    }
  }

  const handleDeletePage = async (pageId) => {
    try {
      await deleteWikiPage(pageId)
      await loadPages()
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  const columns = [
    {
      title: 'Sidebar Label',
      dataIndex: 'parent_label',
      key: 'parent_label',
      width: 250,
      render: (text, page) => {
        if (editingLabel === page.wiki_page) {
          return (
            <Space.Compact style={{ width: '100%' }}>
              <Input
                value={labelText}
                onChange={(e) => setLabelText(e.target.value)}
                onPressEnter={() => handleSaveLabel(page)}
                autoFocus
                style={{ width: '100%' }}
              />
              <Tooltip title="Save">
                <Button
                  type="primary"
                  icon={<CheckOutlined />}
                  onClick={() => handleSaveLabel(page)}
                />
              </Tooltip>
              <Tooltip title="Cancel">
                <Button
                  icon={<CloseOutlined />}
                  onClick={handleCancelEdit}
                />
              </Tooltip>
            </Space.Compact>
          )
        }
        return (
          <Space>
            <Text>{text || page.page_title || page.parent_label || '-'}</Text>
            <Tooltip title="Edit Label">
              <Button
                type="text"
                size="small"
                icon={<EditOutlined />}
                onClick={() => handleEditLabel(page)}
              />
            </Tooltip>
          </Space>
        )
      }
    },
    {
      title: 'Page Title',
      dataIndex: 'page_title',
      key: 'page_title',
      render: (text, page) => (
        <Space>
          <LinkOutlined style={{ color: token.colorTextTertiary, fontSize: '12px' }} />
          <a
            href={page.page_route ? `${window.location.origin}/${page.page_route}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: token.colorPrimary, fontWeight: 500 }}
          >
            {text || page.page_name || page.parent_label}
          </a>
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'page_published',
      key: 'page_published',
      width: 120,
      align: 'center',
      render: (published) => (
        <Tag
          icon={published ? <CheckCircleOutlined /> : <FileTextOutlined />}
          color={published ? 'success' : 'warning'}
          style={{ fontWeight: 500 }}
        >
          {published ? 'Published' : 'Draft'}
        </Tag>
      )
    },
    {
      title: 'Order',
      key: 'order',
      width: 150,
      align: 'center',
      render: (_, page, index) => (
        <Space>
          <Tooltip title="Move Up">
            <Button
              type="text"
              size="small"
              icon={<ArrowUpOutlined />}
              onClick={() => handleMovePageUp(page)}
              disabled={index === 0}
            />
          </Tooltip>
          <Text type="secondary">#{index + 1}</Text>
          <Tooltip title="Move Down">
            <Button
              type="text"
              size="small"
              icon={<ArrowDownOutlined />}
              onClick={() => handleMovePageDown(page)}
              disabled={index === pages.length - 1}
            />
          </Tooltip>
        </Space>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 120,
      align: 'center',
      render: (_, page) => (
        <Space size="small">
          <Tooltip title="View Page">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => {
                if (page.page_route) {
                  window.open(`${window.location.origin}/${page.page_route}`, '_blank', 'noopener,noreferrer')
                }
              }}
            />
          </Tooltip>
          <Tooltip title="Edit Page">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => navigateToRoute('wiki-page-edit', page.wiki_page)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Page"
            description="Are you sure you want to delete this page?"
            onConfirm={() => handleDeletePage(page.wiki_page)}
            okText="Yes"
            cancelText="No"
            okButtonProps={{ danger: true }}
          >
            <Tooltip title="Delete Page">
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  if (loading && !space) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading wiki space...</Text>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!space) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Empty description="Wiki space not found">
            <Button type="primary" onClick={handleBack}>
              Back to Wiki Spaces
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: 16, ...getHeaderBannerStyle(token) }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                onClick={handleBack}
                icon={<ArrowLeftOutlined />}
                style={{ padding: '0 0', marginBottom: '8px', color: getHeaderIconColor(token) }}
              >
                Back to Wiki Spaces
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <FolderOutlined style={{ marginRight: 16, color: getHeaderIconColor(token), fontSize: '32px' }} />
                {space.space_name || space.name || spaceId}
              </Title>
              <Text type="secondary">{space.description || 'Manage pages in this wiki space'}</Text>
              {space.route && (
                <Space size={4}>
                  <LinkOutlined style={{ color: token.colorTextTertiary }} />
                  <Text type="secondary" code>/{space.route}</Text>
                </Space>
              )}
            </Space>
          </Col>
          <Col>
            <Button
              type="primary"
              size="large"
              icon={<PlusOutlined />}
              onClick={handleCreatePage}
              style={{ height: '48px', fontSize: '15px', fontWeight: 500 }}
            >
              Create New Page
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Stats Card */}
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={16}>
          <Col span={8}>
            <Text type="secondary">Total Pages</Text>
            <Title level={3} style={{ margin: 0, color: token.colorPrimary }}>{pages.length}</Title>
          </Col>
          <Col span={8}>
            <Text type="secondary">Published</Text>
            <Title level={3} style={{ margin: 0, color: '#52c41a' }}>
              {pages.filter(p => p.page_published).length}
            </Title>
          </Col>
          <Col span={8}>
            <Text type="secondary">Drafts</Text>
            <Title level={3} style={{ margin: 0, color: '#faad14' }}>
              {pages.filter(p => !p.page_published).length}
            </Title>
          </Col>
        </Row>
      </Card>

      {/* Pages Table */}
      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading pages...</Text>
            </div>
          </div>
        </Card>
      ) : pages.length > 0 ? (
        <Card>
          <Divider orientation="left" style={{ marginTop: 0, marginBottom: 16 }}>
            <Space>
              <FileTextOutlined style={{ color: token.colorPrimary }} />
              <Text strong>Pages in this Space</Text>
            </Space>
          </Divider>
          <Table
            columns={columns}
            dataSource={pages}
            rowKey="wiki_page"
            pagination={false}
            size="middle"
            bordered
          />
        </Card>
      ) : (
        <Card>
          <Empty
            description={
              <Space direction="vertical" size={4}>
                <Text type="secondary">No pages in this space yet</Text>
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Click "Create New Page" above to get started
                </Text>
              </Space>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
            style={{ padding: '48px 0' }}
          />
        </Card>
      )}
    </div>
  )
}

export default WikiSpacePages
