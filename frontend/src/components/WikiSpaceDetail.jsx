import React, { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, message, Space, Input, Table, Tag, Modal, Form, Typography, Popconfirm, Row, Col, Tooltip, Checkbox } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, ArrowLeftOutlined, EyeOutlined, SearchOutlined, ReloadOutlined } from '@ant-design/icons'
import { getWikiSpace, getWikiPagesForSpace, createWikiPage, deleteWikiPage } from '../api/wiki'

const { Title, Text } = Typography

const WikiSpaceDetail = ({ spaceSlug, navigateToRoute }) => {
  const [space, setSpace] = useState(null)
  const [pages, setPages] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchText, setSearchText] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [form] = Form.useForm()
  const [refreshing, setRefreshing] = useState(false)

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

  const handleCreatePage = () => {
    setShowCreateModal(true)
  }

  const handleRefresh = async () => {
    setRefreshing(true)
    await loadSpaceData()
    setRefreshing(false)
  }

  const handleCreatePageSubmit = async (values) => {
    try {
      setCreating(true)
      const pageData = {
        title: values.pageTitle,
        content: '',
        route: values.route || generateSlug(values.pageTitle),
        wikiSpace: spaceSlug,
        published: values.published ? 1 : 0
      }
      await createWikiPage(pageData)
      message.success('Wiki page created successfully')
      form.resetFields()
      setShowCreateModal(false)
      loadSpaceData()
    } catch (error) {
      console.error(error)
      message.error('Failed to create wiki page')
    } finally {
      setCreating(false)
    }
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

  const filteredPages = pages.filter(page =>
    page.title?.toLowerCase().includes(searchText.toLowerCase()) ||
    page.name?.toLowerCase().includes(searchText.toLowerCase())
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
        <a onClick={() => handlePageClick(record.name)}>
          <FileTextOutlined style={{ marginRight: '8px', color: '#1677ff' }} />
          {text || record.name}
        </a>
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
      width: 180,
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="View Page">
            <Button
              type="text"
              icon={<EyeOutlined />}
              onClick={() => handlePageClick(record.name)}
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

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Back Button */}
      <Button
        type="text"
        onClick={handleBack}
        style={{ marginBottom: '16px' }}
        icon={<ArrowLeftOutlined />}
      >
        Back to Wiki
      </Button>

      {/* Header Section */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={2} style={{ marginBottom: '8px' }}>{space?.title || spaceSlug}</Title>
        {space?.description && (
          <Text type="secondary">{space.description}</Text>
        )}
        <div style={{ marginTop: '8px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {pages.length} page{pages.length !== 1 ? 's' : ''}
          </Text>
        </div>
      </div>

      {/* Toolbar Section */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align="middle">
          <Col flex="auto">
            <Input
              placeholder="Search pages..."
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
              onClick={handleCreatePage}
            >
              New Page
            </Button>
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

      {/* Create Wiki Page Modal */}
      <Modal
        title="Create Wiki Page"
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
          onFinish={handleCreatePageSubmit}
        >
          <Form.Item
            label="Page Title"
            name="pageTitle"
            rules={[
              { required: true, message: 'Please enter a page title' },
              { min: 2, message: 'Page title must be at least 2 characters' }
            ]}
          >
            <Input
              placeholder="e.g., Getting Started"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Route (URL slug)"
            name="route"
            rules={[
              { pattern: /^[a-z0-9-]*$/, message: 'Route can only contain lowercase letters, numbers, and hyphens' }
            ]}
            tooltip="Auto-generated from page title if left empty"
          >
            <Input
              placeholder="Auto-generated from page title"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Published"
            name="published"
            valuePropName="checked"
            initialValue={false}
          >
            <Checkbox>Publish this page immediately</Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WikiSpaceDetail

