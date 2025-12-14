import React, { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, message, Space, Input, Tooltip, Modal, Form, Typography } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FolderOutlined } from '@ant-design/icons'
import { getWikiSpaces, createWikiSpace, deleteWikiSpace } from '../api/wiki'

const { Title, Text } = Typography

const WikiHome = ({ navigateToRoute }) => {
  const [spaces, setSpaces] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()

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

  const filteredSpaces = spaces.filter(space =>
    space.title?.toLowerCase().includes(searchText.toLowerCase()) ||
    space.name?.toLowerCase().includes(searchText.toLowerCase())
  )

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ marginBottom: '8px' }}>Wiki Documentation</Title>
        <Text type="secondary">
          Use wiki spaces to group documentation by product, domain, or project. Easily manage and share knowledge with your team.
        </Text>
      </div>

      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search wiki spaces..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px', minWidth: '200px' }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreateSpace}
          >
            New Wiki Space
          </Button>
        </Space>
      </Card>

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
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '16px' }}>
          {filteredSpaces.map(space => (
            <Card
              key={space.name}
              hoverable
              onClick={() => handleSpaceClick(space.name)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '12px' }}>
                <FolderOutlined style={{ fontSize: '20px', marginRight: '8px', color: '#1677ff' }} />
                <Text strong>{space.title || space.name}</Text>
              </div>
              {space.description && (
                <Text type="secondary" style={{ display: 'block', marginBottom: '12px', fontSize: '12px' }}>
                  {space.description}
                </Text>
              )}
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {space.page_count || 0} pages
              </Text>
            </Card>
          ))}
        </div>
      )}

      <Modal
        title="Create Wiki Space"
        open={showCreateModal}
        onCancel={() => {
          setShowCreateModal(false)
          form.resetFields()
        }}
        onOk={() => form.submit()}
        confirmLoading={creating}
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
            <Input placeholder="e.g., API Documentation" />
          </Form.Item>

          <Form.Item
            label="Route (URL slug)"
            name="route"
            rules={[
              { pattern: /^[a-z0-9-]*$/, message: 'Route can only contain lowercase letters, numbers, and hyphens' }
            ]}
          >
            <Input placeholder="Auto-generated from space name" />
          </Form.Item>

          <Form.Item
            label="Description (optional)"
            name="description"
          >
            <Input.TextArea placeholder="Brief description of this wiki space" rows={3} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WikiHome

