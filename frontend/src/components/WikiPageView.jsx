import React, { useState, useEffect } from 'react'
import { Card, Button, Spin, message, Space, Input, Divider, Tag, Empty, Typography, Popconfirm } from 'antd'
import { ArrowLeftOutlined, EditOutlined, DeleteOutlined, SaveOutlined } from '@ant-design/icons'
import { getWikiPage, updateWikiPage, deleteWikiPage } from '../api/wiki'
import useNavigationStore from '../stores/navigationStore'

const { Title, Text } = Typography

const WikiPageView = ({ pageSlug, navigateToRoute }) => {
  const [page, setPage] = useState(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)
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
      setTitle(pageData.title || '')
      setContent(pageData.content || '')
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    if (!title.trim()) {
      message.error('Page title cannot be empty')
      return
    }
    try {
      setSaving(true)
      await updateWikiPage(pageSlug, {
        title,
        content
      })
      setEditing(false)
      loadPageData()
    } catch (error) {
      console.error(error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset to original page values
    setTitle(page?.title || '')
    setContent(page?.content || '')
    setEditing(false)
  }

  const handleDelete = async () => {
    try {
      await deleteWikiPage(pageSlug)
      // Navigate back to parent space or wiki home
      if (selectedWikiSpaceSlug) {
        navigateToRoute('wiki-space', selectedWikiSpaceSlug)
      } else {
        navigateToRoute('wiki')
      }
    } catch (error) {
      console.error(error)
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
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      <Button
        type="text"
        onClick={handleBack}
        style={{ marginBottom: '16px' }}
        icon={<ArrowLeftOutlined />}
      >
        Back
      </Button>

      <Card>
        <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ flex: 1 }}>
            {editing ? (
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Page title"
                style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '16px' }}
              />
            ) : (
              <Title level={2} style={{ marginBottom: '16px' }}>{title}</Title>
            )}

            <div style={{ marginBottom: '16px' }}>
              {page.custom_linked_project && (
                <Tag color="blue" style={{ marginRight: '8px' }}>
                  Project: {page.custom_linked_project_name}
                </Tag>
              )}
              <Tag color={page.published ? 'green' : 'default'}>
                {page.published ? 'Published' : 'Draft'}
              </Tag>
            </div>
          </div>

          {!editing && (
            <Space style={{ marginLeft: '16px' }}>
              <Button
                type="primary"
                icon={<EditOutlined />}
                onClick={() => setEditing(true)}
              >
                Edit
              </Button>
              <Popconfirm
                title="Delete Page"
                description="Are you sure you want to delete this page?"
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
            </Space>
          )}
        </div>

        <Divider />

        {editing ? (
          <>
            <Input.TextArea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your documentation in markdown..."
              rows={15}
              style={{ marginBottom: '16px', fontFamily: 'monospace' }}
            />
            <Space>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                loading={saving}
                onClick={handleSave}
              >
                Save
              </Button>
              <Button onClick={handleCancel}>
                Cancel
              </Button>
            </Space>
          </>
        ) : (
          <div style={{ minHeight: '400px', lineHeight: '1.8' }} className="from-markdown">
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: page.html_content || content }} />
            ) : (
              <Text type="secondary">No content yet</Text>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}

export default WikiPageView

