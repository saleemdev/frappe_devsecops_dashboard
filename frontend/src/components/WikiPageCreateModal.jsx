import React, { useState, useEffect } from 'react'
import { Modal, Form, Input, Button, message, Space } from 'antd'
import MDEditor from '@uiw/react-md-editor'
import { createWikiPage } from '../api/wiki'

/**
 * WikiPageCreateModal - Quick page creation modal from expanded Wiki Space view
 *
 * Features:
 * - Modal dialog (not full page navigation)
 * - Title field with auto-route generation
 * - Full markdown editor
 * - Route field (editable, prefixed with space route)
 * - Two actions: Save Draft and Publish
 *
 * Props:
 * - visible: boolean - Modal visibility
 * - onClose: function - Close handler
 * - space: object - Wiki Space record { name, route, space_name }
 * - onSuccess: function - Callback after successful page creation
 */
const WikiPageCreateModal = ({ visible, onClose, space, onSuccess }) => {
  const [form] = Form.useForm()
  const [title, setTitle] = useState('')
  const [route, setRoute] = useState('')
  const [content, setContent] = useState('')
  const [saving, setSaving] = useState(false)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (visible) {
      form.resetFields()
      setTitle('')
      setRoute('')
      setContent('')
    }
  }, [visible, form])

  // Generate slug from title
  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  // Auto-generate route when title changes
  const handleTitleChange = (e) => {
    const newTitle = e.target.value
    setTitle(newTitle)

    // Auto-generate route if not manually edited
    if (!route || route === generateSlug(title)) {
      setRoute(generateSlug(newTitle))
    }
  }

  // Handle page creation
  const handleCreate = async (published) => {
    try {
      // Validate required fields
      if (!title.trim()) {
        message.error('Please enter a page title')
        return
      }

      if (!route.trim()) {
        message.error('Please enter a route')
        return
      }

      if (!content.trim()) {
        message.error('Please enter some content')
        return
      }

      setSaving(true)

      // Create page with wiki_space to auto-add to sidebar
      const pageData = {
        title: title.trim(),
        content: content.trim(),
        route: route.trim(),
        wiki_space: space.name, // This triggers automatic sidebar append
        published: published
      }

      console.log('[WikiPageCreateModal] Creating page:', pageData)

      const createdPage = await createWikiPage(pageData)

      console.log('[WikiPageCreateModal] Page created:', createdPage)

      message.success(`Page ${published ? 'published' : 'saved as draft'} successfully`)

      // Close modal and trigger success callback
      onClose()

      if (onSuccess) {
        onSuccess(createdPage)
      }
    } catch (error) {
      console.error('[WikiPageCreateModal] Error creating page:', error)
      message.error(error.message || 'Failed to create page')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal
      title={`Create New Page in "${space?.space_name || space?.route}"`}
      open={visible}
      onCancel={onClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={onClose} disabled={saving}>
          Cancel
        </Button>,
        <Button
          key="draft"
          onClick={() => handleCreate(false)}
          loading={saving}
          disabled={saving}
        >
          Save Draft
        </Button>,
        <Button
          key="publish"
          type="primary"
          onClick={() => handleCreate(true)}
          loading={saving}
          disabled={saving}
        >
          Publish
        </Button>
      ]}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item
          label="Page Title"
          required
          tooltip="The title of your wiki page"
        >
          <Input
            value={title}
            onChange={handleTitleChange}
            placeholder="e.g., Getting Started Guide"
            size="large"
            disabled={saving}
          />
        </Form.Item>

        <Form.Item
          label="URL Slug"
          required
          tooltip="The URL path for this page"
        >
          <Input
            value={route}
            onChange={(e) => setRoute(generateSlug(e.target.value))}
            addonBefore={`/${space?.route}/`}
            placeholder="e.g., getting-started-guide"
            size="large"
            disabled={saving}
          />
        </Form.Item>

        <Form.Item
          label="Content (Markdown)"
          required
          tooltip="Write your documentation in Markdown format"
        >
          <div data-color-mode="light">
            <MDEditor
              value={content}
              onChange={setContent}
              height={400}
              preview="live"
              disabled={saving}
            />
          </div>
        </Form.Item>
      </Form>

      <div style={{ marginTop: 16, padding: '12px', background: '#f0f9ff', borderRadius: '4px' }}>
        <p style={{ margin: 0, fontSize: '13px', color: '#0066cc' }}>
          <strong>Tip:</strong> The page will be automatically added to the sidebar with "{title || 'your page title'}" as the label.
          You can edit the sidebar label later using the inline editor.
        </p>
      </div>
    </Modal>
  )
}

export default WikiPageCreateModal
