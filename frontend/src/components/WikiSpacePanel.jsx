import React, { useState, useEffect } from 'react'
import { Space, Button, Table, Tag, Spin, Empty, Typography, Popconfirm, Tooltip, Input, Descriptions, Divider, theme } from 'antd'
import { PlusOutlined, EditOutlined, EyeOutlined, DeleteOutlined, ArrowUpOutlined, ArrowDownOutlined, CheckOutlined, CloseOutlined, LinkOutlined, CheckCircleOutlined, FileTextOutlined, FolderOutlined } from '@ant-design/icons'
import { getWikiSpaceSidebar, updateWikiSpaceSidebar, deleteWikiPage } from '../api/wiki'

const { Text } = Typography

/**
 * WikiSpacePanel - Independent component for each Wiki Space
 * Manages its own pages state and lifecycle
 */
const WikiSpacePanel = ({ space, navigateToRoute, onPageDeleted }) => {
  const { token } = theme.useToken()
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [editingLabel, setEditingLabel] = useState(null)
  const [labelText, setLabelText] = useState('')

  // Load pages when component mounts
  useEffect(() => {
    console.log('[WikiSpacePanel] Mounted, loading pages for:', space.name)
    loadPages()
  }, [])

  const loadPages = async () => {
    try {
      setLoading(true)
      console.log('[WikiSpacePanel] Calling API for:', space.name)
      const data = await getWikiSpaceSidebar(space.name)
      console.log('[WikiSpacePanel] Got data:', data)
      setPages(data || [])
    } catch (error) {
      console.error('[WikiSpacePanel] Error loading pages:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePage = () => {
    navigateToRoute('wiki-page-create', space.name)
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
        wiki_page: p.wiki_page,
        parent_label: p.wiki_page === page.wiki_page ? labelText : (p.parent_label || p.page_title),
        idx: p.idx
      }))

      await updateWikiSpaceSidebar(space.name, updatedItems)
      await loadPages()
      setEditingLabel(null)
      setLabelText('')
    } catch (error) {
      console.error('Error saving label:', error)
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
      wiki_page: p.wiki_page,
      parent_label: p.parent_label || p.page_title,
      idx: index + 1
    }))

    try {
      await updateWikiSpaceSidebar(space.name, updatedItems)
      await loadPages()
    } catch (error) {
      console.error('Error reordering pages:', error)
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
      wiki_page: p.wiki_page,
      parent_label: p.parent_label || p.page_title,
      idx: index + 1
    }))

    try {
      await updateWikiSpaceSidebar(space.name, updatedItems)
      await loadPages()
    } catch (error) {
      console.error('Error reordering pages:', error)
    }
  }

  const handleDeletePage = async (pageId) => {
    try {
      await deleteWikiPage(pageId)
      await loadPages()
      if (onPageDeleted) onPageDeleted()
    } catch (error) {
      console.error('Error deleting page:', error)
    }
  }

  const pagesColumns = [
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

  console.log('🟡 [WikiSpacePanel RENDER] Space:', space.name)
  console.log('🟡 [WikiSpacePanel RENDER] Pages array:', pages)
  console.log('🟡 [WikiSpacePanel RENDER] Pages.length:', pages.length)
  console.log('🟡 [WikiSpacePanel RENDER] Loading:', loading)
  console.log('🟡 [WikiSpacePanel RENDER] Condition check - loading?', loading, 'pages.length > 0?', pages.length > 0)

  return (
    <div style={{
      padding: '20px',
      backgroundColor: token.colorBgContainer,
      borderLeft: `3px solid ${token.colorPrimary}`,
      borderRadius: '4px',
      border: '5px dashed red' // VISUAL INDICATOR THAT PANEL RENDERED
    }}>
      {/* Space Metadata */}
      <Descriptions
        size="small"
        bordered
        style={{
          marginBottom: 16,
          backgroundColor: token.colorBgLayout
        }}
      >
        <Descriptions.Item label="Description" span={2}>
          {space.description || 'No description provided'}
        </Descriptions.Item>
        <Descriptions.Item label="Public Route">
          {space.route ? (
            <a
              href={`${window.location.origin}/${space.route}`}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: token.colorPrimary, fontFamily: 'monospace' }}
            >
              <LinkOutlined style={{ marginRight: 4 }} />
              /{space.route}
            </a>
          ) : (
            <Text type="secondary">Not set</Text>
          )}
        </Descriptions.Item>
        <Descriptions.Item label="Total Pages">
          <Text strong style={{ fontSize: '16px', color: token.colorPrimary }}>
            {pages.length}
          </Text>
        </Descriptions.Item>
      </Descriptions>

      {/* Create Page Button */}
      <Button
        type="primary"
        icon={<PlusOutlined />}
        onClick={handleCreatePage}
        size="large"
        block
        style={{
          height: '48px',
          fontSize: '15px',
          fontWeight: 500,
          borderRadius: '6px',
          marginBottom: 16
        }}
      >
        Create New Page in This Space
      </Button>

      {/* Pages Table */}
      <div style={{ border: '3px solid orange', padding: '10px', marginTop: '10px' }}>
        <Text strong style={{ color: 'orange' }}>🔶 DEBUG: loading={String(loading)}, pages.length={pages.length}</Text>
      </div>
      {loading ? (
        <div style={{
          padding: '48px 0',
          textAlign: 'center',
          backgroundColor: token.colorBgLayout,
          borderRadius: '6px'
        }}>
          <Spin size="large" />
          <div style={{ marginTop: 16 }}>
            <Text type="secondary">⏳ Loading pages...</Text>
          </div>
        </div>
      ) : pages.length > 0 ? (
        <>
          <Divider orientation="left" style={{ margin: '12px 0 16px 0' }}>
            <Space>
              <FolderOutlined style={{ color: token.colorPrimary }} />
              <Text strong>Pages in this Space</Text>
            </Space>
          </Divider>
          <Table
            columns={pagesColumns}
            dataSource={pages}
            rowKey="wiki_page"
            pagination={false}
            size="middle"
            bordered
            style={{
              borderRadius: '6px',
              overflow: 'hidden'
            }}
          />
        </>
      ) : (
        <Empty
          description={
            <Space direction="vertical" size={4}>
              <Text type="secondary">No pages in this space yet</Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Click the button above to create your first page
              </Text>
            </Space>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          style={{
            padding: '32px 0',
            backgroundColor: token.colorBgLayout,
            borderRadius: '6px',
            border: `1px dashed ${token.colorBorder}`
          }}
        />
      )}
    </div>
  )
}

export default WikiSpacePanel
