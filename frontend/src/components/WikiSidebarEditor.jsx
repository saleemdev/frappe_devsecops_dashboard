import React, { useState, useEffect } from 'react'
import { Modal, List, Button, Space, message, Input, Tooltip, Tag, Spin } from 'antd'
import {
  MenuOutlined,
  SaveOutlined,
  CloseOutlined,
  EditOutlined,
  CheckOutlined,
  FileTextOutlined,
  EyeInvisibleOutlined,
  EyeOutlined
} from '@ant-design/icons'
import { getWikiSpaceSidebar, updateWikiSpaceSidebar } from '../api/wiki'

/**
 * WikiSidebarEditor - Modal component for editing Wiki Space sidebar ordering
 *
 * Features:
 * - Drag and drop reordering
 * - Edit parent labels
 * - Toggle hide_on_sidebar
 * - Visual feedback for published/draft pages
 * - Auto-save on reorder
 */
const WikiSidebarEditor = ({ visible, onClose, spaceName, spaceSlug }) => {
  const [sidebarItems, setSidebarItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [editLabel, setEditLabel] = useState('')
  const [draggedItem, setDraggedItem] = useState(null)

  // Load sidebar data when modal opens
  useEffect(() => {
    if (visible && spaceName) {
      loadSidebarData()
    }
  }, [visible, spaceName])

  const loadSidebarData = async () => {
    try {
      setLoading(true)
      const items = await getWikiSpaceSidebar(spaceName)
      setSidebarItems(items || [])
    } catch (error) {
      console.error('Error loading sidebar:', error)
      message.error('Failed to load sidebar items')
    } finally {
      setLoading(false)
    }
  }

  const saveSidebarOrder = async (updatedItems) => {
    try {
      setSaving(true)

      // Prepare items with updated idx
      const itemsToSave = updatedItems.map((item, index) => ({
        name: item.name,
        idx: index + 1,
        parent_label: item.parent_label,
        hide_on_sidebar: item.hide_on_sidebar || 0
      }))

      const result = await updateWikiSpaceSidebar(spaceName, itemsToSave)

      console.log('Sidebar updated:', result)
      message.success('Sidebar order updated successfully')

      // Reload to get fresh data
      await loadSidebarData()
    } catch (error) {
      console.error('Error saving sidebar:', error)
      message.error('Failed to save sidebar order')
    } finally {
      setSaving(false)
    }
  }

  // Drag and drop handlers
  const handleDragStart = (e, item, index) => {
    setDraggedItem({ item, index })
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e, dropIndex) => {
    e.preventDefault()

    if (!draggedItem) return

    const { index: dragIndex } = draggedItem
    if (dragIndex === dropIndex) return

    // Reorder array
    const newItems = [...sidebarItems]
    const [removed] = newItems.splice(dragIndex, 1)
    newItems.splice(dropIndex, 0, removed)

    setSidebarItems(newItems)
    setDraggedItem(null)

    // Auto-save on reorder
    saveSidebarOrder(newItems)
  }

  const handleDragEnd = () => {
    setDraggedItem(null)
  }

  // Edit label handlers
  const startEditLabel = (item) => {
    setEditingItem(item.name)
    setEditLabel(item.parent_label || item.page_title || '')
  }

  const saveLabel = async (item) => {
    const updatedItems = sidebarItems.map(i =>
      i.name === item.name ? { ...i, parent_label: editLabel } : i
    )
    setSidebarItems(updatedItems)
    setEditingItem(null)
    await saveSidebarOrder(updatedItems)
  }

  const cancelEditLabel = () => {
    setEditingItem(null)
    setEditLabel('')
  }

  // Toggle visibility
  const toggleVisibility = async (item) => {
    const updatedItems = sidebarItems.map(i =>
      i.name === item.name ? { ...i, hide_on_sidebar: i.hide_on_sidebar ? 0 : 1 } : i
    )
    setSidebarItems(updatedItems)
    await saveSidebarOrder(updatedItems)
  }

  return (
    <Modal
      title={
        <Space>
          <MenuOutlined />
          <span>Edit Sidebar - {spaceSlug}</span>
        </Space>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={[
        <Button key="close" onClick={onClose} icon={<CloseOutlined />}>
          Close
        </Button>
      ]}
    >
      <div style={{ marginBottom: 16 }}>
        <p style={{ color: '#8c8c8c', fontSize: '13px' }}>
          Drag items to reorder. Click labels to edit. Changes are saved automatically.
        </p>
      </div>

      <Spin spinning={loading || saving} tip={saving ? 'Saving...' : 'Loading...'}>
        <List
          bordered
          dataSource={sidebarItems}
          locale={{ emptyText: 'No pages in sidebar' }}
          renderItem={(item, index) => (
            <List.Item
              draggable
              onDragStart={(e) => handleDragStart(e, item, index)}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, index)}
              onDragEnd={handleDragEnd}
              style={{
                cursor: 'move',
                backgroundColor: draggedItem?.index === index ? '#f0f0f0' : 'white',
                opacity: item.hide_on_sidebar ? 0.5 : 1,
                padding: '12px 16px'
              }}
            >
              <Space style={{ width: '100%', justifyContent: 'space-between' }}>
                {/* Left side: Drag handle + Label/Title */}
                <Space>
                  <MenuOutlined style={{ color: '#8c8c8c', cursor: 'grab' }} />

                  <FileTextOutlined style={{
                    color: item.page_published ? '#1677ff' : '#8c8c8c',
                    fontSize: '16px'
                  }} />

                  {editingItem === item.name ? (
                    <Space>
                      <Input
                        value={editLabel}
                        onChange={(e) => setEditLabel(e.target.value)}
                        onPressEnter={() => saveLabel(item)}
                        autoFocus
                        style={{ width: '250px' }}
                      />
                      <Button
                        type="primary"
                        size="small"
                        icon={<CheckOutlined />}
                        onClick={() => saveLabel(item)}
                      />
                      <Button
                        size="small"
                        icon={<CloseOutlined />}
                        onClick={cancelEditLabel}
                      />
                    </Space>
                  ) : (
                    <Space>
                      <span
                        style={{
                          fontWeight: item.page_published ? 500 : 400,
                          color: item.page_published ? '#262626' : '#8c8c8c'
                        }}
                      >
                        {item.parent_label || item.page_title || 'Untitled'}
                      </span>
                      {!item.page_published && (
                        <Tag color="default" style={{ fontSize: '11px' }}>DRAFT</Tag>
                      )}
                    </Space>
                  )}
                </Space>

                {/* Right side: Action buttons */}
                {editingItem !== item.name && (
                  <Space size="small">
                    <Tooltip title="Edit label">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => startEditLabel(item)}
                      />
                    </Tooltip>

                    <Tooltip title={item.hide_on_sidebar ? "Show in sidebar" : "Hide from sidebar"}>
                      <Button
                        type="text"
                        size="small"
                        icon={item.hide_on_sidebar ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                        onClick={() => toggleVisibility(item)}
                        style={{
                          color: item.hide_on_sidebar ? '#ff4d4f' : '#52c41a'
                        }}
                      />
                    </Tooltip>

                    <span style={{
                      fontSize: '12px',
                      color: '#8c8c8c',
                      minWidth: '30px',
                      textAlign: 'right'
                    }}>
                      #{index + 1}
                    </span>
                  </Space>
                )}
              </Space>
            </List.Item>
          )}
        />
      </Spin>
    </Modal>
  )
}

export default WikiSidebarEditor
