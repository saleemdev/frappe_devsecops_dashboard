import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  message,
  Space,
  Divider,
  Alert,
  Spin,
  Row,
  Col,
  Tooltip,
  Empty
} from 'antd'
import {
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  LockOutlined,
  LinkOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

// API call helper function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token || '',
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    return data.message || data
  } catch (error) {
    console.error('[PasswordShareAccess] API Error:', error)
    throw error
  }
}

const PasswordShareAccess = ({ token }) => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [passwordData, setPasswordData] = useState(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showUsername, setShowUsername] = useState(false)
  const [error, setError] = useState(null)
  const [autoHideTimer, setAutoHideTimer] = useState(null)

  useEffect(() => {
    return () => {
      if (autoHideTimer) {
        clearTimeout(autoHideTimer)
      }
    }
  }, [autoHideTimer])

  const handleValidateLink = async (values) => {
    try {
      setLoading(true)
      setError(null)

      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_share_links.validate_share_link?share_token=${encodeURIComponent(token)}&one_time_code=${encodeURIComponent(values.one_time_code)}`,
        { method: 'POST' }
      )

      if (response?.success && response?.data) {
        setPasswordData(response.data)
        message.success('Password accessed successfully')

        // Auto-hide password after 5 minutes
        const timer = setTimeout(() => {
          setPasswordData(null)
          message.warning('Password has been cleared for security')
        }, 5 * 60 * 1000)

        setAutoHideTimer(timer)
      } else {
        setError(response?.error || 'Failed to access password')
        message.error(response?.error || 'Failed to access password')
      }
    } catch (error) {
      console.error('[PasswordShareAccess] Error validating link:', error)
      setError('Failed to validate share link')
      message.error('Failed to validate share link')
    } finally {
      setLoading(false)
    }
  }

  const handleCopyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text)
    message.success(`${label} copied to clipboard`)
  }

  if (!token) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Empty description="Invalid share link" />
      </div>
    )
  }

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <Card>
        <Row gutter={[16, 16]} justify="center">
          <Col xs={24}>
            <h2 style={{ textAlign: 'center', margin: 0 }}>
              <LockOutlined /> Secure Password Access
            </h2>
          </Col>
        </Row>

        <Divider />

        {!passwordData ? (
          <>
            <Alert
              message="Security Notice"
              description="Enter the one-time code you received to access the shared password. This code is valid for one-time use only."
              type="info"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            {error && (
              <Alert
                message="Error"
                description={error}
                type="error"
                showIcon
                closable
                onClose={() => setError(null)}
                style={{ marginBottom: '16px' }}
              />
            )}

            <Form
              form={form}
              layout="vertical"
              onFinish={handleValidateLink}
            >
              <Form.Item
                label="One-Time Code"
                name="one_time_code"
                rules={[
                  { required: true, message: 'One-time code is required' },
                  { pattern: /^\d{6}$/, message: 'Code must be 6 digits' }
                ]}
              >
                <Input
                  placeholder="Enter 6-digit code"
                  maxLength={6}
                  style={{ fontSize: '24px', letterSpacing: '8px', textAlign: 'center' }}
                />
              </Form.Item>

              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={loading}
                  block
                  size="large"
                >
                  Access Password
                </Button>
              </Form.Item>
            </Form>

            <Alert
              message="Warning"
              description="This password will only be shown once. Please save it securely. The link will expire after use or at the specified expiry time."
              type="warning"
              showIcon
              style={{ marginTop: '16px' }}
            />
          </>
        ) : (
          <>
            <Alert
              message="Password Displayed"
              description="This password will be automatically cleared after 5 minutes for security. Please save it securely."
              type="success"
              showIcon
              style={{ marginBottom: '16px' }}
            />

            <Card type="inner" style={{ marginBottom: '16px' }}>
              <Row gutter={[16, 16]}>
                <Col xs={24}>
                  <div>
                    <strong>Title:</strong>
                    <div style={{ fontSize: '16px', marginTop: '4px' }}>
                      {passwordData.title}
                    </div>
                  </div>
                </Col>

                {passwordData.category && (
                  <Col xs={24}>
                    <div>
                      <strong>Category:</strong>
                      <div style={{ fontSize: '14px', marginTop: '4px' }}>
                        {passwordData.category}
                      </div>
                    </div>
                  </Col>
                )}

                {passwordData.username && (
                  <Col xs={24}>
                    <div>
                      <strong>Username:</strong>
                      <Space style={{ marginTop: '4px' }}>
                        <code style={{ fontSize: '14px' }}>
                          {showUsername ? passwordData.username : '••••••••'}
                        </code>
                        <Tooltip title={showUsername ? 'Hide' : 'Show'}>
                          <Button
                            type="text"
                            size="small"
                            icon={showUsername ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                            onClick={() => setShowUsername(!showUsername)}
                          />
                        </Tooltip>
                        <Tooltip title="Copy">
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyToClipboard(passwordData.username, 'Username')}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </Col>
                )}

                {passwordData.password && (
                  <Col xs={24}>
                    <div>
                      <strong>Password:</strong>
                      <Space style={{ marginTop: '4px' }}>
                        <code style={{ fontSize: '14px' }}>
                          {showPassword ? passwordData.password : '••••••••'}
                        </code>
                        <Tooltip title={showPassword ? 'Hide' : 'Show'}>
                          <Button
                            type="text"
                            size="small"
                            icon={showPassword ? <EyeInvisibleOutlined /> : <EyeOutlined />}
                            onClick={() => setShowPassword(!showPassword)}
                          />
                        </Tooltip>
                        <Tooltip title="Copy">
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyToClipboard(passwordData.password, 'Password')}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </Col>
                )}

                {passwordData.url && (
                  <Col xs={24}>
                    <div>
                      <strong>URL:</strong>
                      <Space style={{ marginTop: '4px' }}>
                        <a href={passwordData.url} target="_blank" rel="noopener noreferrer">
                          <LinkOutlined /> Open
                        </a>
                        <Tooltip title="Copy">
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyToClipboard(passwordData.url, 'URL')}
                          />
                        </Tooltip>
                      </Space>
                    </div>
                  </Col>
                )}

                {passwordData.notes && (
                  <Col xs={24}>
                    <div>
                      <strong>Notes:</strong>
                      <div style={{ fontSize: '14px', marginTop: '4px', whiteSpace: 'pre-wrap' }}>
                        {passwordData.notes}
                      </div>
                    </div>
                  </Col>
                )}
              </Row>
            </Card>

            <Alert
              message="Security Reminder"
              description="This password will be automatically cleared after 5 minutes. Do not share this password with anyone. Close this page when done."
              type="warning"
              showIcon
            />
          </>
        )}
      </Card>
    </div>
  )
}

export default PasswordShareAccess

