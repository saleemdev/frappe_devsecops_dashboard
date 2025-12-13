import React, { useState, useEffect } from 'react'
import { Card, Button, Empty, Spin, message, Space, Input, Table, Tag, Modal, Form, Typography, Popconfirm } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined, ArrowLeftOutlined } from '@ant-design/icons'
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
      form.resetFields()
      setShowCreateModal(false)
      loadSpaceData()
    } catch (error) {
      console.error(error)
    } finally {
      setCreating(false)
    }
  }

  const handleDeletePage = async (pageName) => {
    try {
      await deleteWikiPage(pageName)
      loadSpaceData()
    } catch (error) {
      console.error(error)
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

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (text, record) => (
        <a onClick={() => handlePageClick(record.name)}>
          <FileTextOutlined style={{ marginRight: '8px' }} />
          {text || record.name}
        </a>
      )
    },
    {
      title: 'Status',
      dataIndex: 'published',
      key: 'published',
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
      width: 100,
      render: (_, record) => (
        <Space>
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handlePageClick(record.name)}
            title="Edit page"
          />
          <Popconfirm
            title="Delete Page"
            description="Are you sure you want to delete this page?"
            onConfirm={() => handleDeletePage(record.name)}
            okText="Yes"
            cancelText="No"
          >
            <Button
              type="text"
              size="small"
              danger
              icon={<DeleteOutlined />}
              title="Delete page"
            />
          </Popconfirm>
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
      <Button
        type="text"
        onClick={handleBack}
        style={{ marginBottom: '16px' }}
        icon={<ArrowLeftOutlined />}
      >
        Back to Wiki
      </Button>

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

      <Card style={{ marginBottom: '24px' }}>
        <Space style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Input
            placeholder="Search pages..."
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            style={{ width: '300px', minWidth: '200px' }}
          />
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleCreatePage}
          >
            New Page
          </Button>
        </Space>
      </Card>

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
          pagination={{ pageSize: 10 }}
        />
      )}

      <Modal
        title="Create Wiki Page"
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
            <Input placeholder="e.g., Getting Started" />
          </Form.Item>

          <Form.Item
            label="Route (URL slug)"
            name="route"
            rules={[
              { pattern: /^[a-z0-9-]*$/, message: 'Route can only contain lowercase letters, numbers, and hyphens' }
            ]}
          >
            <Input placeholder="Auto-generated from page title" />
          </Form.Item>

          <Form.Item
            label="Published"
            name="published"
            valuePropName="checked"
            initialValue={false}
          >
            <input type="checkbox" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WikiSpaceDetail

