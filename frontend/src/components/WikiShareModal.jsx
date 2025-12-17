import React, { useState } from 'react'
import { Modal, Space, Input, Button, Typography, Divider, message, Tooltip, QRCode } from 'antd'
import { CopyOutlined, LinkOutlined, QrcodeOutlined, CheckCircleOutlined } from '@ant-design/icons'

const { Text, Title } = Typography

/**
 * WikiShareModal - Professional modal for sharing wiki documentation
 * Provides multiple sharing options: copy link, QR code
 * Follows IncidentDetail/ProjectDetail UX patterns
 */
const WikiShareModal = ({ visible, onClose, title, url, type = 'page' }) => {
  const [copied, setCopied] = useState(false)

  const copyToClipboard = (text) => {
    // Try modern clipboard API first
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text)
    }

    // Fallback for older browsers or non-HTTPS contexts
    return new Promise((resolve, reject) => {
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.opacity = '0'
        document.body.appendChild(textarea)
        textarea.select()
        const success = document.execCommand('copy')
        document.body.removeChild(textarea)

        if (success) {
          resolve()
        } else {
          reject(new Error('Copy failed'))
        }
      } catch (err) {
        reject(err)
      }
    })
  }

  const handleCopyLink = () => {
    if (!url) {
      alert('No URL available to copy')
      return
    }

    copyToClipboard(url).then(() => {
      setCopied(true)
      // Simple alert for better visibility
      alert('✓ Link copied to clipboard!')

      // Reset copied state after 2 seconds
      setTimeout(() => setCopied(false), 2000)
    }).catch(() => {
      alert('Failed to copy link')
    })
  }

  const handleClose = () => {
    setCopied(false)
    onClose()
  }

  const typeLabel = type === 'space' ? 'Wiki Space' : 'Wiki Page'

  return (
    <Modal
      title={
        <Space>
          <LinkOutlined style={{ color: '#1890ff' }} />
          <Text strong>Share {typeLabel}</Text>
        </Space>
      }
      open={visible}
      onCancel={handleClose}
      footer={[
        <Button key="close" onClick={handleClose}>
          Close
        </Button>
      ]}
      width={560}
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Title Section */}
        <div>
          <Text type="secondary" style={{ fontSize: '12px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            DOCUMENTATION TITLE
          </Text>
          <Title level={4} style={{ margin: '8px 0 0 0', fontWeight: 600 }}>
            {title || 'Untitled'}
          </Title>
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* Copy Link Section */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <Space size={4}>
              <LinkOutlined style={{ color: '#1890ff' }} />
              <Text strong style={{ fontSize: '13px' }}>SHAREABLE LINK</Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Anyone with this link can view the documentation
              </Text>
            </div>
          </div>

          <Input.Search
            value={url || ''}
            readOnly
            size="large"
            enterButton={
              <Tooltip title={copied ? 'Copied!' : 'Copy to clipboard'}>
                <Button
                  type="primary"
                  icon={copied ? <CheckCircleOutlined /> : <CopyOutlined />}
                  style={{
                    background: copied ? '#52c41a' : undefined,
                    borderColor: copied ? '#52c41a' : undefined
                  }}
                >
                  {copied ? 'Copied!' : 'Copy'}
                </Button>
              </Tooltip>
            }
            onSearch={handleCopyLink}
            style={{ marginBottom: 8 }}
          />
        </div>

        <Divider style={{ margin: '8px 0' }} />

        {/* QR Code Section */}
        <div>
          <div style={{ marginBottom: 12 }}>
            <Space size={4}>
              <QrcodeOutlined style={{ color: '#1890ff' }} />
              <Text strong style={{ fontSize: '13px' }}>QR CODE</Text>
            </Space>
            <div style={{ marginTop: 4 }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Scan with a mobile device to open documentation
              </Text>
            </div>
          </div>

          <div style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '24px',
            background: '#fafafa',
            borderRadius: '8px',
            border: '1px solid #e8e8e8'
          }}>
            {url ? (
              <QRCode
                value={url}
                size={200}
                bordered={false}
                errorLevel="M"
                icon="/assets/frappe_devsecops_dashboard/images/logo.png"
                iconSize={32}
              />
            ) : (
              <Text type="secondary">No URL available</Text>
            )}
          </div>
        </div>

        {/* Help Text */}
        <div style={{
          background: '#e6f7ff',
          border: '1px solid #91d5ff',
          borderRadius: '6px',
          padding: '12px 16px'
        }}>
          <Space>
            <CheckCircleOutlined style={{ color: '#1890ff' }} />
            <Text style={{ fontSize: '12px', color: '#0050b3' }}>
              This link provides read-only access to the documentation
            </Text>
          </Space>
        </div>
      </Space>
    </Modal>
  )
}

export default WikiShareModal
