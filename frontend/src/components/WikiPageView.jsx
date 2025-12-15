import React, { useState, useEffect } from 'react'
import { Card, Button, Spin, message, Space, Input, Divider, Tag, Empty, Typography, Popconfirm, Row, Col, Tooltip, Modal, Form, Checkbox } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, SaveOutlined, CloseOutlined } from '@ant-design/icons'
import { getWikiPage, updateWikiPage, deleteWikiPage } from '../api/wiki'
import useNavigationStore from '../stores/navigationStore'

const { Title, Text } = Typography

const WikiPageView = ({ pageSlug, navigateToRoute }) => {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editModalOpen, setEditModalOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editContent, setEditContent] = useState('')
  const [editPublished, setEditPublished] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form] = Form.useForm()
  const selectedWikiSpaceSlug = useNavigationStore(state => state.selectedWikiSpaceSlug)

  useEffect(() => {
    if (pageSlug) {
      loadPageData()
    }
  }, [pageSlug])

  const loadPageData = async () => {
    try {
      setLoading(true)
      const pageData = await getWikiPage(pageSlug)
      setPage(pageData)
      setEditTitle(pageData.title || '')
      setEditContent(pageData.content || '')
      setEditPublished(pageData.published ? true : false)
    } catch (error) {
      console.error(error)
      message.error('Failed to load page')
    } finally {
      setLoading(false)
    }
  }

  const handleEditClick = () => {
    setEditTitle(page?.title || '')
    setEditContent(page?.content || '')
    setEditPublished(page?.published ? true : false)
    setEditModalOpen(true)
  }

  const handleSave = async () => {
    if (!editTitle.trim()) {
      message.error('Page title cannot be empty')
      return
    }
    try {
      setSaving(true)
      await updateWikiPage(pageSlug, {
        title: editTitle,
        content: editContent,
        published: editPublished ? 1 : 0
      })
      message.success('Page updated successfully')
      setEditModalOpen(false)
      loadPageData()
    } catch (error) {
      console.error(error)
      message.error('Failed to update page')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditModalOpen(false)
  }

  const handleDelete = async () => {
    try {
      await deleteWikiPage(pageSlug)
      message.success('Page deleted successfully')
      // Navigate back to parent space or wiki home
      if (selectedWikiSpaceSlug) {
        navigateToRoute('wiki-space', selectedWikiSpaceSlug)
      } else {
        navigateToRoute('wiki')
      }
    } catch (error) {
      console.error(error)
      message.error('Failed to delete page')
    }
  }

  const handleBack = () => {
    if (selectedWikiSpaceSlug) {
      navigateToRoute('wiki-space', selectedWikiSpaceSlug)
    } else {
      navigateToRoute('wiki')
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '40px' }}>
        <Spin />
      </div>
    )
  }

  if (!page) {
    return (
      <div style={{ padding: '24px' }}>
        <Button
          type="text"
          onClick={handleBack}
          style={{ marginBottom: '16px' }}
          icon={<ArrowLeftOutlined />}
        >
          Back
        </Button>
        <Empty description="Page not found" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1000px', margin: '0 auto' }}>
      {/* Back Button */}
      <Button
        type="text"
        onClick={handleBack}
        style={{ marginBottom: '16px' }}
        icon={<ArrowLeftOutlined />}
      >
        Back
      </Button>

      {/* Page Header Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} justify="space-between" align="middle">
          <Col flex="auto">
            <div>
              <Title level={2} style={{ marginBottom: '12px' }}>{page.title}</Title>

              {/* Metadata Tags */}
              <Space wrap>
                <Tag color={page.published ? 'green' : 'default'}>
                  {page.published ? 'Published' : 'Draft'}
                </Tag>
                {page.custom_linked_project && (
                  <Tag color="blue">
                    Project: {page.custom_linked_project_name}
                  </Tag>
                )}
                <Text type="secondary" style={{ fontSize: '12px' }}>
                  Modified: {new Date(page.modified).toLocaleDateString()}
                </Text>
              </Space>
            </div>
          </Col>

          {/* Action Buttons */}
          <Col>
            <Space>
              <Tooltip title="Edit Page">
                <Button
                  type="primary"
                  icon={<EditOutlined />}
                  onClick={handleEditClick}
                >
                  Edit
                </Button>
              </Tooltip>
              <Tooltip title="Delete Page">
                <Popconfirm
                  title="Delete Page"
                  description="Are you sure you want to delete this page? This action cannot be undone."
                  onConfirm={handleDelete}
                  okText="Yes"
                  cancelText="No"
                >
                  <Button
                    danger
                    icon={<DeleteOutlined />}
                  >
                    Delete
                  </Button>
                </Popconfirm>
              </Tooltip>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Page Content Card */}
      <Card>
        <div style={{ minHeight: '400px', lineHeight: '1.8' }} className="wiki-content">
          {page.content ? (
            <div dangerouslySetInnerHTML={{ __html: page.html_content || page.content }} />
          ) : (
            <Empty description="No content yet" />
          )}
        </div>
      </Card>

      {/* Edit Modal */}
      <Modal
        title="Edit Wiki Page"
        open={editModalOpen}
        onCancel={handleCancel}
        onOk={handleSave}
        confirmLoading={saving}
        width={800}
        okText="Save"
        cancelText="Cancel"
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            label="Page Title"
            required
          >
            <Input
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              placeholder="Page title"
              size="large"
            />
          </Form.Item>

          <Form.Item
            label="Content (Markdown)"
          >
            <Input.TextArea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              placeholder="Write your documentation in markdown..."
              rows={12}
              style={{ fontFamily: 'monospace' }}
            />
          </Form.Item>

          <Form.Item>
            <Checkbox
              checked={editPublished}
              onChange={(e) => setEditPublished(e.target.checked)}
            >
              Publish this page
            </Checkbox>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  )
}

export default WikiPageView

