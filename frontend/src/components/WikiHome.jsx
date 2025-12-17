import React, { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, message, Space, Input, Tooltip, Typography, Table, Tag, Popconfirm, Row, Col, theme } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOutlined, EyeOutlined, SearchOutlined, ReloadOutlined, EditOutlined, CopyOutlined, LinkOutlined } from '@ant-design/icons'
import { getWikiSpaces, deleteWikiSpace } from '../api/wiki'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'
import '../styles/wikiDesignSystem.css'

const { Title, Text } = Typography

const WikiHome = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadWikiSpaces()
  }, [])

  // After returning from create, ensure list refreshes and bypass any cache
  useEffect(() => {
    (async () => {
      try {
        const shouldRefresh = sessionStorage.getItem('wiki:refreshOnNextVisit')
        if (shouldRefresh) {
          sessionStorage.removeItem('wiki:refreshOnNextVisit')
          await loadWikiSpaces()
          // Double refresh after short delay in case backend index updates slightly later
          setTimeout(() => { loadWikiSpaces() }, 500)
        }
      } catch (e) { /* ignore */ }
    })()
  }, [])

  // Reload list when coming back to #wiki via hashchange or when tab becomes visible
  useEffect(() => {
    const refreshIfWiki = () => {
      const hash = (window.location.hash || '').replace(/^#/, '')
      if (hash === 'wiki') {
        loadWikiSpaces()
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshIfWiki()
    }
    window.addEventListener('hashchange', refreshIfWiki)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('hashchange', refreshIfWiki)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const loadWikiSpaces = async () => {
    try {
      setLoading(true)
      const data = await getWikiSpaces()
      setSpaces(data || [])
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSpace = () => {
    navigateToRoute('wiki-create')
  }

  const handleSpaceClick = (spaceSlug) => {
    navigateToRoute('wiki-space', spaceSlug)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadWikiSpaces()
    setRefreshing(false)
  }

  const handleDeleteSpace = async (spaceName) => {
    try {
      await deleteWikiSpace(spaceName)
      message.success('Wiki space deleted successfully')
      loadWikiSpaces()
    } catch (error) {
      console.error(error)
      message.error('Failed to delete wiki space')
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

  const handleCopyLink = (spaceName) => {
    // Find the space to get its route
    const space = spaces.find(s => s.name === spaceName)
    // Use route as-is - it already contains the full path
    const url = space?.route
      ? `${window.location.origin}/${space.route}`
      : `${window.location.origin}${window.location.pathname}#wiki/space/${spaceName}`

    copyToClipboard(url).then(() => {
      message.success('✓ Documentation link copied to clipboard!')
    }).catch(() => {
      message.error('Failed to copy link')
    })
  }

  const handleOpenPublicSpace = (record) => {
    if (record.route) {
      // Use route as-is - it already contains the full path
      const url = `${window.location.origin}/${record.route}`
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      message.info('This space does not have a public URL yet')
    }
  }

  const filteredSpaces = spaces.filter(space =>
    (space.space_name || space.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (space.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (space.description || '').toLowerCase().includes(searchText.toLowerCase())
  )

  // Table columns configuration
  const columns = [
    {
      title: 'Title',
      dataIndex: 'space_name',
      key: 'space_name',
      ellipsis: true,
      sorter: (a, b) => (a.space_name || a.name || '').localeCompare(b.space_name || b.name || ''),
      render: (text, record) => (
        <a onClick={() => handleSpaceClick(record.name)}>
          <FolderOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
          {(record.space_name || record.name)}
        </a>
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
      render: (text) => text || '-'
    },
    {
      title: 'Pages',
      dataIndex: 'page_count',
      key: 'page_count',
      width: 80,
      sorter: (a, b) => (a.page_count || 0) - (b.page_count || 0),
      render: (count) => count || 0
    },
    {
      title: 'Created',
      dataIndex: 'creation',
      key: 'creation',
      width: 140,
      sorter: (a, b) => new Date(a.creation || 0) - new Date(b.creation || 0),
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
      width: 260,
      render: (_, record) => (
        <Space size="small">
          {record.route && (
            <Tooltip title="Open public space">
              <Button
                type="text"
                icon={<LinkOutlined />}
                onClick={() => handleOpenPublicSpace(record)}
                style={{ color: '#52c41a' }}
              />
            </Tooltip>
          )}
          <Tooltip title="View Space">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleSpaceClick(record.name)}
            />
          </Tooltip>
          <Tooltip title="Copy Documentation Link">
            <Button
              type="text"
              icon={<CopyOutlined />}
              onClick={() => handleCopyLink(record.name)}
              style={{ color: '#1890ff' }}
            />
          </Tooltip>
          <Tooltip title="Edit Space">
            <Button
              type="text"
              icon={<EditOutlined />}
              onClick={() => handleSpaceClick(record.name)}
            />
          </Tooltip>
          <Tooltip title="Delete Space">
            <Popconfirm
              title="Delete Wiki Space"
              description="Are you sure you want to delete this space? All pages in this space will also be deleted."
              onConfirm={() => handleDeleteSpace(record.name)}
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

  return (
    <div style={{ padding: '24px' }}>
      {/* Header Section */}
      <Card style={{ marginBottom: 16, ...getHeaderBannerStyle(token) }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <FolderOutlined style={{ marginRight: 16, color: getHeaderIconColor(token), fontSize: '32px' }} />
                Wiki Documentation
              </Title>
              <Text type="secondary">Use wiki spaces to group documentation by product, domain, or project.</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ReloadOutlined />} onClick={handleRefresh} loading={refreshing}>
                Refresh
              </Button>
              <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateSpace}>
                New Wiki Space
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Toolbar Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Search wiki spaces..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              allowClear
            />
          </Col>
        </Row>
      </Card>

      {/* Content Section */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px' }}>
          <Spin />
        </div>
      ) : filteredSpaces.length === 0 ? (
        <Empty
          description={searchText ? 'No wiki spaces found' : 'No wiki spaces yet'}
          style={{ marginTop: '40px' }}
        >
          {!searchText && (
            <Button type="primary" onClick={handleCreateSpace}>
              Create First Wiki Space
            </Button>
          )}
        </Empty>
      ) : (
        <Table
          columns={columns}
          dataSource={filteredSpaces}
          rowKey="name"
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showTotal: (total, range) => (
              <Text strong style={{ fontSize: '13px' }}>
                {range[0]}-{range[1]} of {total} spaces
              </Text>
            )
          }}
          loading={loading}
        />
      )}

    </div>
  )
}

export default WikiHome

