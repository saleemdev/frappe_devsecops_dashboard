import React, { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, message, Space, Input, Table, Tag, Typography, Popconfirm, Row, Col, Tooltip, theme } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, ArrowLeftOutlined, EyeOutlined, SearchOutlined, ReloadOutlined, CopyOutlined, FolderOutlined, FileOutlined, CheckCircleOutlined, ClockCircleOutlined, ShareAltOutlined, LinkOutlined, SwapOutlined, MenuOutlined, HolderOutlined, ArrowUpOutlined, ArrowDownOutlined, CloseOutlined } from '@ant-design/icons'
import { getWikiSpace, getWikiPagesForSpace, deleteWikiPage, getWikiSpaceSidebar, updateWikiSpaceSidebar, addPageToSidebar } from '../api/wiki'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'
import WikiShareModal from './WikiShareModal'
import WikiMovePageModal from './WikiMovePageModal'
import WikiBreadcrumb from './WikiBreadcrumb'
import '../styles/wikiDesignSystem.css'

const { Title, Text } = Typography

const WikiSpaceDetail = ({ spaceSlug, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [space, setSpace] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [refreshing, setRefreshing] = useState(false)
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const [moveModalVisible, setMoveModalVisible] = useState(false)
  const [pageToMove, setPageToMove] = useState(null)
  const [sidebarItems, setSidebarItems] = useState([])
  const [editingLabel, setEditingLabel] = useState(null)
  const [labelText, setLabelText] = useState('')

  useEffect(() => {
    if (spaceSlug) {
      loadSpaceData()
    }
  }, [spaceSlug])

  const loadSpaceData = async () => {
    try {
      setLoading(true)
      // Load space details
      const spaceData = await getWikiSpace(spaceSlug)
      setSpace(spaceData)

      // Load pages in this space
      const pagesData = await getWikiPagesForSpace(spaceSlug)
      setPages(pagesData || [])

      // Load sidebar items for ordering
      if (spaceData?.name) {
        const sidebarData = await getWikiSpaceSidebar(spaceData.name)
        setSidebarItems(sidebarData || [])
      }
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }



  const handleCreatePage = () => {
    navigateToRoute('wiki-page-create', spaceSlug)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSpaceData()
    setRefreshing(false)
  }



  const handleDeletePage = async (pageName) => {
    try {
      await deleteWikiPage(pageName)
      message.success('Wiki page deleted successfully')
      loadSpaceData()
    } catch (error) {
      console.error(error)
      message.error('Failed to delete wiki page')
    }
  }

  const handlePageClick = (pageSlug) => {
    navigateToRoute('wiki-page', spaceSlug, pageSlug)
  }

  const handleBack = () => {
    navigateToRoute('wiki')
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

  const handleCopySpaceLink = () => {
    // Use route as-is - it already contains the full path
    const url = space?.route
      ? `${window.location.origin}/${space.route}`
      : `${window.location.origin}${window.location.pathname}#wiki/space/${spaceSlug}`

    copyToClipboard(url).then(() => {
      message.success('✓ Space link copied to clipboard!')
    }).catch(() => {
      message.error('Failed to copy link')
    })
  }

  const handleCopyPageLink = (page) => {
    // Use route as-is - it already contains the full path
    const url = page.route
      ? `${window.location.origin}/${page.route}`
      : `${window.location.origin}${window.location.pathname}#wiki/page/${page.name}`

    copyToClipboard(url).then(() => {
      message.success('✓ Page link copied to clipboard!')
    }).catch(() => {
      message.error('Failed to copy link')
    })
  }

  const handleOpenPublicLink = (page) => {
    if (page.route) {
      // Use route as-is - it already contains the full path
      const url = `${window.location.origin}/${page.route}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      message.info('This page does not have a public URL yet')
    }
  }

  const handleMovePageClick = (page) => {
    setPageToMove(page)
    setMoveModalVisible(true)
  }

  const handleMoveSuccess = () => {
    loadSpaceData()
  }

  // Helper function to get sidebar item for a page
  const getSidebarItem = (pageName) => {
    return sidebarItems.find(item => item.wiki_page === pageName)
  }

  // Move page up in sidebar
  const handleMoveSidebarUp = async (record) => {
    const sidebarItem = getSidebarItem(record.name)
    if (!sidebarItem || sidebarItem.idx <= 1) return

    try {
      // Swap idx with previous item
      const updatedItems = sidebarItems.map(item => {
        if (item.name === sidebarItem.name) {
          return { ...item, idx: item.idx - 1 }
        } else if (item.idx === sidebarItem.idx - 1) {
          return { ...item, idx: item.idx + 1 }
        }
        return item
      })

      await updateWikiSpaceSidebar(space.name, updatedItems)
      message.success('Sidebar order updated')
      await loadSpaceData()
    } catch (error) {
      console.error('Error updating sidebar order:', error)
      message.error('Failed to update sidebar order')
    }
  }

  // Move page down in sidebar
  const handleMoveSidebarDown = async (record) => {
    const sidebarItem = getSidebarItem(record.name)
    if (!sidebarItem || sidebarItem.idx >= sidebarItems.length) return

    try {
      // Swap idx with next item
      const updatedItems = sidebarItems.map(item => {
        if (item.name === sidebarItem.name) {
          return { ...item, idx: item.idx + 1 }
        } else if (item.idx === sidebarItem.idx + 1) {
          return { ...item, idx: item.idx - 1 }
        }
        return item
      })

      await updateWikiSpaceSidebar(space.name, updatedItems)
      message.success('Sidebar order updated')
      await loadSpaceData()
    } catch (error) {
      console.error('Error updating sidebar order:', error)
      message.error('Failed to update sidebar order')
    }
  }

  // Start editing sidebar label
  const handleStartEditLabel = (record) => {
    const sidebarItem = getSidebarItem(record.name)
    setEditingLabel(record.name)
    setLabelText(sidebarItem?.parent_label || record.title || '')
  }

  // Save sidebar label
  const handleSaveLabel = async (record) => {
    const sidebarItem = getSidebarItem(record.name)
    if (!sidebarItem) return

    try {
      const updatedItems = sidebarItems.map(item => {
        if (item.name === sidebarItem.name) {
          return { ...item, parent_label: labelText }
        }
        return item
      })

      await updateWikiSpaceSidebar(space.name, updatedItems)
      message.success('Sidebar label updated')
      setEditingLabel(null)
      await loadSpaceData()
    } catch (error) {
      console.error('Error updating sidebar label:', error)
      message.error('Failed to update sidebar label')
    }
  }

  // Cancel editing label
  const handleCancelEditLabel = () => {
    setEditingLabel(null)
    setLabelText('')
  }

  // Add page to sidebar
  const handleAddToSidebar = async (record) => {
    try {
      await addPageToSidebar(space.name, record.name, record.title)
      message.success('Page added to sidebar')
      await loadSpaceData()
    } catch (error) {
      console.error('Error adding page to sidebar:', error)
      const errorMsg = error?.response?.data?.message || error?.message || 'Failed to add page to sidebar'
      message.error(errorMsg)
    }
  }

  const filteredPages = pages.filter(page =>
    page.title?.toLowerCase().includes(searchText.toLowerCase()) ||
    page.name?.toLowerCase().includes(searchText.toLowerCase())
  )

  // Table columns configuration
  const columns = [
    {
      title: 'Sidebar',
      key: 'sidebar',
      width: 200,
      render: (_, record) => {
        const sidebarItem = getSidebarItem(record.name)
        const isEditing = editingLabel === record.name

        if (!sidebarItem) {
          return (
            <Tooltip title="Add this page to the sidebar">
              <Button
                type="dashed"
                size="small"
                icon={<PlusOutlined />}
                onClick={() => handleAddToSidebar(record)}
                style={{ width: '100%' }}
              >
                Add to Sidebar
              </Button>
            </Tooltip>
          )
        }

        return (
          <Space direction="vertical" size="small" style={{ width: '100%' }}>
            {/* Label row */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {isEditing ? (
                <>
                  <Input
                    value={labelText}
                    onChange={(e) => setLabelText(e.target.value)}
                    onPressEnter={() => handleSaveLabel(record)}
                    autoFocus
                    size="small"
                    style={{ width: '120px' }}
                  />
                  <Button
                    type="primary"
                    size="small"
                    icon={<CheckCircleOutlined />}
                    onClick={() => handleSaveLabel(record)}
                  />
                  <Button
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={handleCancelEditLabel}
                  />
                </>
              ) : (
                <>
                  <Text style={{ fontSize: '12px', flex: 1 }}>
                    {sidebarItem.parent_label || record.title || 'Untitled'}
                  </Text>
                  <Tooltip title="Edit sidebar label">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined />}
                      onClick={() => handleStartEditLabel(record)}
                    />
                  </Tooltip>
                </>
              )}
            </div>

            {/* Order controls row */}
            {!isEditing && (
              <Space size="small">
                <Tooltip title="Move up">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowUpOutlined />}
                    onClick={() => handleMoveSidebarUp(record)}
                    disabled={sidebarItem.idx <= 1}
                  />
                </Tooltip>
                <Tooltip title="Move down">
                  <Button
                    type="text"
                    size="small"
                    icon={<ArrowDownOutlined />}
                    onClick={() => handleMoveSidebarDown(record)}
                    disabled={sidebarItem.idx >= sidebarItems.length}
                  />
                </Tooltip>
                <Text type="secondary" style={{ fontSize: '11px', marginLeft: '4px' }}>
                  #{sidebarItem.idx}
                </Text>
              </Space>
            )}
          </Space>
        )
      }
    },
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      sorter: (a, b) => (a.title || a.name).localeCompare(b.title || b.name),
      render: (text, record) => (
        <Space>
          <a
            onClick={() => handlePageClick(record.name)}
            style={{
              color: record.published ? '#1677ff' : '#8c8c8c',
              opacity: record.published ? 1 : 0.6
            }}
          >
            <FileTextOutlined style={{
              marginRight: '8px',
              color: record.published ? '#1677ff' : '#8c8c8c'
            }} />
            {text || record.name}
          </a>
          {!record.published && (
            <Tag color="default" style={{ fontSize: '11px' }}>
              DRAFT
            </Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Status',
      dataIndex: 'published',
      key: 'published',
      width: 100,
      render: (published) => (
        <Tag color={published ? 'green' : 'default'}>
          {published ? 'Published' : 'Draft'}
        </Tag>
      )
    },
    {
      title: 'Modified',
      dataIndex: 'modified',
      key: 'modified',
      width: 140,
      sorter: (a, b) => new Date(a.modified || 0) - new Date(b.modified || 0),
      render: (date) => {
        try {
          return new Date(date).toLocaleDateString()
        } catch {
          return date
        }
      }
    },
    {
      title: 'Actions',
      key: 'actions',
      width: 300,
      render: (_, record) => (
        <Space size="small">
          {record.route && (
            <Tooltip title={record.published ? "Open public page" : "Page not published - cannot open public link"}>
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={() => handleOpenPublicLink(record)}
                disabled={!record.published}
                style={{
                  color: record.published ? '#52c41a' : '#d9d9d9',
                  cursor: record.published ? 'pointer' : 'not-allowed'
                }}
              />
            </Tooltip>
          )}
          <Tooltip title="View Page">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePageClick(record.name)}
            />
          </Tooltip>
          <Tooltip title={record.published ? "Copy public page link" : "Copy page link (draft)"}>
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopyPageLink(record)}
              style={{
                color: record.published ? '#1890ff' : '#8c8c8c',
                opacity: record.published ? 1 : 0.6
              }}
            />
          </Tooltip>
          <Tooltip title="Move to another space">
            <Button
              type="text"
              icon={<SwapOutlined />}
              onClick={() => handleMovePageClick(record)}
              style={{ color: '#722ed1' }}
            />
          </Tooltip>
          <Tooltip title="Edit Page">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handlePageClick(record.name)}
            />
          </Tooltip>
          <Tooltip title="Delete Page">
            <Popconfirm
              title="Delete Page"
              description="Are you sure you want to delete this page?"
              onConfirm={() => handleDeletePage(record.name)}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button
                type="text"
                danger
                icon={<DeleteOutlined />}
              />
            </Popconfirm>
          </Tooltip>
        </Space>
      )
    }
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin />
      </div>
    )
  }

  // Calculate metrics
  const totalPages = pages.length
  const publishedPages = pages.filter(p => p.published).length
  const draftPages = totalPages - publishedPages
  const recentlyModified = pages.filter(p => {
    const daysSinceModified = (Date.now() - new Date(p.modified)) / (1000 * 60 * 60 * 24)
    return daysSinceModified <= 7
  }).length

  // Use route as-is - it already contains the full path
  const spaceUrl = space?.route
    ? `${window.location.origin}/${space.route}`
    : `${window.location.origin}${window.location.pathname}#wiki/space/${spaceSlug}`

  return (
    <div style={{ padding: '24px' }}>
      {/* Breadcrumb Navigation */}
      <WikiBreadcrumb
        spaceName={space?.space_name || space?.title || spaceSlug}
        spaceSlug={spaceSlug}
        navigateToRoute={navigateToRoute}
      />

      {/* Header Card with Gradient */}
      <Card style={{ ...getHeaderBannerStyle(token), marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col xs={24} sm={16}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <FolderOutlined style={{ marginRight: 16, color: getHeaderIconColor(token), fontSize: '32px' }} />
                {space?.space_name || space?.title || spaceSlug}
              </Title>
              {space?.description && (
                <Text type="secondary">{space.description}</Text>
              )}
              {space?.route && (
                <Space size={8} style={{ marginTop: 8 }}>
                  <LinkOutlined style={{ color: '#8c8c8c', fontSize: '12px' }} />
                  <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Public URL:
                  </Text>
                  <Text code style={{ fontSize: '12px' }}>
                    /{space.route}
                  </Text>
                </Space>
              )}
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right' }}>
            <Space>
              <Tooltip title="Share space">
                <Button icon={<ShareAltOutlined />} onClick={() => setShareModalVisible(true)} size="large">
                  Share
                </Button>
              </Tooltip>
              <Tooltip title="Copy space link">
                <Button icon={<CopyOutlined />} onClick={handleCopySpaceLink} size="large">
                  Copy Link
                </Button>
              </Tooltip>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreatePage} size="large">
                New Page
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Share Modal */}
      <WikiShareModal
        visible={shareModalVisible}
        onClose={() => setShareModalVisible(false)}
        title={space?.space_name || space?.title || spaceSlug}
        url={spaceUrl}
        type="space"
      />

      {/* Move Page Modal */}
      <WikiMovePageModal
        visible={moveModalVisible}
        onClose={() => setMoveModalVisible(false)}
        page={pageToMove}
        currentSpaceSlug={spaceSlug}
        onSuccess={handleMoveSuccess}
      />

      {/* Metrics Cards */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <div className="wiki-stat-card">
          <FileOutlined className="wiki-stat-card-icon" style={{ color: '#1890ff' }} />
          <div className="wiki-stat-card-label">Total Pages</div>
          <div className="wiki-stat-card-value" style={{ color: '#1890ff' }}>{totalPages}</div>
        </div>
        <div className="wiki-stat-card">
          <CheckCircleOutlined className="wiki-stat-card-icon" style={{ color: '#52c41a' }} />
          <div className="wiki-stat-card-label">Published</div>
          <div className="wiki-stat-card-value" style={{ color: '#52c41a' }}>{publishedPages}</div>
        </div>
        <div className="wiki-stat-card">
          <ClockCircleOutlined className="wiki-stat-card-icon" style={{ color: '#faad14' }} />
          <div className="wiki-stat-card-label">Drafts</div>
          <div className="wiki-stat-card-value" style={{ color: '#faad14' }}>{draftPages}</div>
        </div>
        <div className="wiki-stat-card">
          <EditOutlined className="wiki-stat-card-icon" style={{ color: '#722ed1' }} />
          <div className="wiki-stat-card-label">Recent (7d)</div>
          <div className="wiki-stat-card-value" style={{ color: '#722ed1' }}>{recentlyModified}</div>
        </div>
      </div>

      {/* Search Bar */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Search pages in this space..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
              size="large"
            />
          </Col>
          <Col>
            <Tooltip title="Refresh page list">
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={handleRefresh}
                size="large"
              />
            </Tooltip>
          </Col>
        </Row>
      </Card>

      {/* Content Section */}
      {filteredPages.length === 0 ? (
        <Empty
          description={searchText ? 'No pages found' : 'No pages in this space'}
          style={{ marginTop: '40px' }}
        >
          {!searchText && (
            <Button type="primary" onClick={handleCreatePage}>
              Create First Page
            </Button>
          )}
        </Empty>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredPages}
          rowKey="name"
          pagination={{ pageSize: 10, showSizeChanger: true }}
          loading={loading}
        />
      )}


    </div>
  )
}

export default WikiSpaceDetail

