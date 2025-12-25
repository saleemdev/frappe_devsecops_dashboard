import React, { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, message, Space, Input, Typography, Popconfirm, Row, Col, theme, List } from 'antd'
import { PlusOutlined, DeleteOutlined, FolderOutlined, SearchOutlined, ReloadOutlined, RightOutlined, FileTextOutlined } from '@ant-design/icons'
import { getWikiSpaces, deleteWikiSpace } from '../api/wiki'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const WikiHome = ({ navigateToRoute }) => {
  const { token } = theme.useToken()

  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadSpaces()
  }, [])

  const loadSpaces = async () => {
    try {
      setLoading(true)
      const data = await getWikiSpaces()
      setSpaces(data || [])
    } catch (error) {
      console.error('Error loading spaces:', error)
      message.error('Failed to load spaces')
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSpace = () => {
    navigateToRoute('wiki-create')
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSpaces()
    setRefreshing(false)
  }

  const handleDeleteSpace = async (spaceName) => {
    try {
      await deleteWikiSpace(spaceName)
      message.success('Wiki space deleted successfully')
      loadSpaces()
    } catch (error) {
      console.error(error)
      message.error('Failed to delete wiki space')
    }
  }

  const handleSpaceClick = (space) => {
    navigateToRoute('wiki-space', space.name)
  }

  const filteredSpaces = spaces.filter(space =>
    (space.space_name || space.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    (space.description || '').toLowerCase().includes(searchText.toLowerCase())
  )

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
              <Text type="secondary">Click on a space to view and manage its pages</Text>
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

      {/* Search Bar */}
      <Card style={{ marginBottom: '24px' }}>
        <Input
          placeholder="Search wiki spaces..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
          size="large"
        />
      </Card>

      {/* Content Section */}
      {loading ? (
        <Card>
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading wiki spaces...</Text>
            </div>
          </div>
        </Card>
      ) : filteredSpaces.length === 0 ? (
        <Card>
          <Empty
            description={searchText ? 'No wiki spaces found' : 'No wiki spaces yet'}
            style={{ padding: '40px 0' }}
          >
            {!searchText && (
              <Button type="primary" onClick={handleCreateSpace}>
                Create First Wiki Space
              </Button>
            )}
          </Empty>
        </Card>
      ) : (
        <Card>
          <List
            itemLayout="horizontal"
            dataSource={filteredSpaces}
            renderItem={(space) => (
              <List.Item
                key={space.name}
                actions={[
                  <Popconfirm
                    key="delete"
                    title="Delete Wiki Space"
                    description="Are you sure you want to delete this space and all its pages?"
                    onConfirm={() => handleDeleteSpace(space.name)}
                    okText="Yes"
                    cancelText="No"
                    okButtonProps={{ danger: true }}
                  >
                    <Button
                      type="text"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    >
                      Delete
                    </Button>
                  </Popconfirm>
                ]}
                style={{
                  cursor: 'pointer',
                  padding: '16px 24px',
                  borderRadius: '8px',
                  transition: 'all 0.3s',
                  backgroundColor: token.colorBgContainer
                }}
                className="wiki-space-item"
                onClick={() => handleSpaceClick(space)}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorBgTextHover
                  e.currentTarget.style.transform = 'translateX(4px)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = token.colorBgContainer
                  e.currentTarget.style.transform = 'translateX(0)'
                }}
              >
                <List.Item.Meta
                  avatar={
                    <div style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '8px',
                      backgroundColor: token.colorPrimaryBg,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      <FolderOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />
                    </div>
                  }
                  title={
                    <Space>
                      <Text strong style={{ fontSize: '16px' }}>{space.space_name || space.name}</Text>
                      <RightOutlined style={{ fontSize: '12px', color: token.colorTextTertiary }} />
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={4} style={{ width: '100%' }}>
                      <Text type="secondary">{space.description || 'No description'}</Text>
                      {space.route && (
                        <Space size={4}>
                          <FileTextOutlined style={{ fontSize: '12px', color: token.colorTextTertiary }} />
                          <Text type="secondary" code style={{ fontSize: '12px' }}>/{space.route}</Text>
                        </Space>
                      )}
                    </Space>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
    </div>
  )
}

export default WikiHome
