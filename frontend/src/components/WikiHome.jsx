import React, { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, message, Space, Input, Tooltip, Modal, Form, Typography, Table, Tag, Popconfirm, Row, Col } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { getWikiSpaces, createWikiSpace, deleteWikiSpace } from '../api/wiki'

const { Title, Text } = Typography

const WikiHome = ({ navigateToRoute }) => {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    loadWikiSpaces()
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

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleCreateSpace = () => {
    setShowCreateModal(true)
  }

  const handleCreateSpaceSubmit = async (values) => {
    try {
      setCreating(true)
      const spaceData = {
        name: values.spaceName,
        route: values.route || generateSlug(values.spaceName),
        description: values.description || ''
      }
      const createdSpace = await createWikiSpace(spaceData)
      form.resetFields()
      setShowCreateModal(false)
      message.success('Wiki space created successfully')
      loadWikiSpaces()
      // Navigate to the new space using the returned name (hash)
      if (createdSpace && createdSpace.name) {
        navigateToRoute('wiki-space', createdSpace.name)
      }
    } catch (error) {
      console.error(error)
    } finally {
      setCreating(false)
    }
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

  const filteredSpaces = spaces.filter(space =>
    space.title?.toLowerCase().includes(searchText.toLowerCase()) ||
    space.name?.toLowerCase().includes(searchText.toLowerCase()) ||
    space.description?.toLowerCase().includes(searchText.toLowerCase())
  )

  // Table columns configuration
  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      ellipsis: true,
      sorter: (a, b) => (a.title || a.name).localeCompare(b.title || b.name),
      render: (text, record) => (
        <a onClick={() => handleSpaceClick(record.name)}>
          <FolderOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
          {text || record.name}
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
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Space">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handleSpaceClick(record.name)}
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
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ marginBottom: '8px' }}>Wiki Documentation</Title>
        <Text type="secondary">
          Use wiki spaces to group documentation by product, domain, or project. Easily manage and share knowledge with your team.
        </Text>
      </div>

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
          <Col>
            <Tooltip title="Refresh">
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={handleRefresh}
              />
            </Tooltip>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreateSpace}
            >
              New Wiki Space
            </Button>
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
          pagination={{ pageSize: 10, showSizeChanger: true }}
          loading={loading}
        />
      )}

      {/* Create Wiki Space Modal */}
      <Modal
        title="Create Wiki Space"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={creating}
        width={500}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleCreateSpaceSubmit}
        >
          <Form.Item
            label="Space Name"
            name="spaceName"
            rules={[
              { required: true, message: 'Please enter a space name' },
              { min: 2, message: 'Space name must be at least 2 characters' }
            ]}
          >
            <Input
              placeholder="e.g., API Documentation"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Route (URL slug)"
            name="route"
            rules={[
              { pattern: /^[a-z0-9-]*$/, message: 'Route can only contain lowercase letters, numbers, and hyphens' }
            ]}
            tooltip="Auto-generated from space name if left empty"
          >
            <Input
              placeholder="Auto-generated from space name"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Description (optional)"
            name="description"
          >
            <Input.TextArea
              placeholder="Brief description of this wiki space"
              rows={3}
            />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WikiHome

