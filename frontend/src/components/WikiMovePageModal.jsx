import React, { useState, useEffect } from 'react'
import { Modal, Select, message, Typography, Space, Alert } from 'antd'
import { FolderOutlined, ArrowRightOutlined } from '@ant-design/icons'
import { getWikiSpaces, moveWikiPage } from '../api/wiki'

const { Text } = Typography
const { Option } = Select

/**
 * WikiMovePageModal - Move a wiki page to a different space
 */
const WikiMovePageModal = ({ visible, onClose, page, currentSpaceSlug, onSuccess }) => {
  const [spaces, setSpaces] = useState([])
  const [selectedSpace, setSelectedSpace] = useState(null)
  const [loading, setLoading] = useState(false)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    if (visible) {
      loadSpaces()
    }
  }, [visible])

  const loadSpaces = async () => {
    try {
      setLoading(true)
      const data = await getWikiSpaces()
      // Filter out current space
      const filteredSpaces = (data || []).filter(s => s.name !== currentSpaceSlug)
      setSpaces(filteredSpaces)
    } catch (error) {
      console.error(error)
      message.error('Failed to load wiki spaces')
    } finally {
      setLoading(false)
    }
  }

  const handleMove = async () => {
    if (!selectedSpace) {
      message.warning('Please select a destination space')
      return
    }

    try {
      setMoving(true)
      await moveWikiPage(page.name, selectedSpace)
      message.success('Page moved successfully!')
      onSuccess && onSuccess()
      handleClose()
    } catch (error) {
      console.error(error)
      message.error('Failed to move page')
    } finally {
      setMoving(false)
    }
  }

  const handleClose = () => {
    setSelectedSpace(null)
    onClose()
  }

  const selectedSpaceObj = spaces.find(s => s.name === selectedSpace)

  return (
    <Modal
      title="Move Wiki Page"
      open={visible}
      onCancel={handleClose}
      onOk={handleMove}
      okText="Move Page"
      okButtonProps={{ loading: moving, disabled: !selectedSpace }}
      cancelButtonProps={{ disabled: moving }}
      width={500}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Current Page Info */}
        <div>
          <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
            PAGE TO MOVE
          </Text>
          <div style={{ padding: '12px', background: '#fafafa', borderRadius: '4px', border: '1px solid #e8e8e8' }}>
            <Text strong>{page?.title || page?.name}</Text>
          </div>
        </div>

        {/* Destination Space Selector */}
        <div>
          <Text type="secondary" style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px', display: 'block', marginBottom: 8 }}>
            MOVE TO SPACE
          </Text>
          <Select
            style={{ width: '100%' }}
            placeholder="Select destination wiki space"
            value={selectedSpace}
            onChange={setSelectedSpace}
            loading={loading}
            size="large"
            showSearch
            filterOption={(input, option) =>
              (option?.children?.toLowerCase() || '').includes(input.toLowerCase())
            }
          >
            {spaces.map(space => (
              <Option key={space.name} value={space.name}>
                <Space>
                  <FolderOutlined style={{ color: '#1890ff' }} />
                  {space.space_name || space.title || space.name}
                </Space>
              </Option>
            ))}
          </Select>
        </div>

        {/* Preview */}
        {selectedSpaceObj && (
          <Alert
            message={
              <Space align="center">
                <Text type="secondary">{currentSpaceSlug}</Text>
                <ArrowRightOutlined style={{ color: '#1890ff' }} />
                <Text strong>{selectedSpaceObj.space_name || selectedSpaceObj.title}</Text>
              </Space>
            }
            type="info"
            showIcon
          />
        )}

        {/* Warning */}
        <Alert
          message="This action will:"
          description={
            <ul style={{ marginBottom: 0, paddingLeft: 20 }}>
              <li>Remove the page from the current space's sidebar</li>
              <li>Add the page to the destination space's sidebar</li>
              <li>Update the page's wiki_space field</li>
            </ul>
          }
          type="warning"
          showIcon
        />
      </Space>
    </Modal>
  )
}

export default WikiMovePageModal
