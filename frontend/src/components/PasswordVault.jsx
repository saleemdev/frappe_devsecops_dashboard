import React, { useState, useEffect } from 'react'
import {
  Table,
  Button,
  Modal,
  Form,
  Input,
  Select,
  message,
  Space,
  Popconfirm,
  Tag,
  Tooltip,
  Card,
  Row,
  Col,
  Spin,
  Empty,
  Divider,
  InputNumber,
  DatePicker,
  Typography
,
  theme
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  LinkOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ShareAltOutlined,
  LockOutlined,
  UnlockOutlined,
  SearchOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  UserOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import { createApiClient } from '../services/api/config'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const PasswordVault = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [shareForm] = Form.useForm()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [shareLinks, setShareLinks] = useState([])
  const [shareLinksLoading, setShareLinksLoading] = useState(false)
  const [apiClient, setApiClient] = useState(null)

  // Initialize API client
  useEffect(() => {
    const initClient = async () => {
      const client = await createApiClient()
      setApiClient(client)
    }
    initClient()
  }, [])

  // Load password entries when client is ready or filters change
  useEffect(() => {
    if (apiClient) {
      loadEntries()
    }
  }, [apiClient, searchQuery, categoryFilter])

  const loadEntries = async () => {
    if (!apiClient) return
    try {
      setLoading(true)
      const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entries', {
        params: {
          search_query: searchQuery,
          category: categoryFilter
        }
      })

      if (response.data && response.data.success) {
        setEntries(response.data.data || [])
      } else {
        // Fallback if response structure is different (handled by interceptor)
        setEntries(response.data || [])
      }
    } catch (error) {
      console.error('[PasswordVault] Error loading entries:', error)
      message.error('Failed to load password entries')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = () => {
    navigateToRoute('password-vault-new')
  }

  const handleEdit = (entry) => {
    if (entry?.name) {
      navigateToRoute('password-vault-edit', null, null, entry.name)
    } else {
      message.error('Invalid password entry')
    }
  }

  const handleCopyCredentials = async (entry) => {
    if (!apiClient) return
    try {
      // Fetch full entry details including password
      const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entry', {
        params: { name: entry.name }
      })

      const data = response.data.data || response.data

      if (data) {
        // Create credentials text
        const credentialsText = `Username: ${data.username || 'N/A'}\nPassword: ${data.password || 'N/A'}${data.url ? `\nURL: ${data.url}` : ''}`

        // Copy to clipboard
        await navigator.clipboard.writeText(credentialsText)

        // Show success with SweetAlert2
        await Swal.fire({
          icon: 'success',
          title: 'Credentials Copied!',
          html: `
            <div style="text-align: left; padding: 12px; background: #f5f5f5; border-radius: 4px; margin-top: 12px;">
              <strong>Username:</strong> ${data.username || 'N/A'}<br/>
              <strong>Password:</strong> ${'*'.repeat((data.password || '').length)}<br/>
              ${data.url ? `<strong>URL:</strong> ${data.url}` : ''}
            </div>
          `,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true
        })
      }
    } catch (error) {
      console.error('[PasswordVault] Error copying credentials:', error)
      message.error('Failed to copy credentials')
    }
  }

  const handleCopyPassword = async (entry) => {
    if (!apiClient) return
    try {
      const response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_vault.copy_vault_entry', {
        name: entry.name
      })

      if (response.data.success || response.data) {
        message.success('Password entry duplicated successfully')
        loadEntries()

        // Optionally open the edit form for the new entry
        setTimeout(() => {
          const newEntryName = response.data.data?.name || response.data.name
          if (newEntryName) {
            handleEdit({ name: newEntryName })
          }
        }, 500)
      }
    } catch (error) {
      console.error('[PasswordVault] Error duplicating password:', error)
      message.error('Failed to duplicate password entry')
    }
  }

  const handleDeletePassword = async (entry) => {
    if (!apiClient) return
    try {
      const response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_vault.delete_vault_entry', {
        name: entry.name
      })

      if (response.data.success || response.data) {
        message.success('Password deleted successfully')
        loadEntries()
      }
    } catch (error) {
      console.error('[PasswordVault] Error deleting password:', error)
      message.error('Failed to delete password')
    }
  }

  const handleSharePassword = async (entry) => {
    setSelectedEntry(entry)
    shareForm.resetFields()
    setShareModalVisible(true)
    await loadShareLinks(entry.name)
  }

  const loadShareLinks = async (entryName) => {
    if (!apiClient) return
    try {
      setShareLinksLoading(true)
      const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_share_links.get_share_links', {
        params: { vault_entry_name: entryName }
      })

      const data = response.data.data || response.data
      setShareLinks(data || [])
    } catch (error) {
      console.error('[PasswordVault] Error loading share links:', error)
    } finally {
      setShareLinksLoading(false)
    }
  }

  const handleCreateShareLink = async (values) => {
    if (!apiClient) return
    try {
      const response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_share_links.create_share_link', {
        vault_entry_name: selectedEntry.name,
        expiry_hours: values.expiry_hours || 24,
        recipient_email: values.recipient_email || ''
      })

      if (response.data.success || response.data) {
        message.success('Share link created successfully')
        await loadShareLinks(selectedEntry.name)
        shareForm.resetFields()
      }
    } catch (error) {
      console.error('[PasswordVault] Error creating share link:', error)
      message.error('Failed to create share link')
    }
  }

  const handleRevokeShareLink = async (linkName) => {
    if (!apiClient) return
    try {
      const response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_share_links.revoke_share_link', {
        share_link_name: linkName
      })

      if (response.data.success || response.data) {
        message.success('Share link revoked successfully')
        await loadShareLinks(selectedEntry.name)
      }
    } catch (error) {
      console.error('[PasswordVault] Error revoking share link:', error)
      message.error('Failed to revoke share link')
    }
  }

  const handleCopyToClipboard = (text) => {
    navigator.clipboard.writeText(text)
    message.success('Copied to clipboard')
  }

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: '25%',
      render: (text) => (
        <Space>
          <KeyOutlined style={{ color: getHeaderIconColor(token) }} />
          <strong>{text}</strong>
        </Space>
      )
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: '20%',
      render: (text) => text || <Text type="secondary">-</Text>
    },
    {
      title: 'Category',
      dataIndex: 'category',
      key: 'category',
      width: '15%',
      render: (category) => {
        const colors = {
          'Login': 'blue',
          'API Key': 'green',
          'Database': 'orange',
          'SSH Key': 'red',
          'Other': 'default'
        }
        return <Tag color={colors[category] || 'default'}>{category}</Tag>
      }
    },
    {
      title: 'URL',
      dataIndex: 'url',
      key: 'url',
      width: '15%',
      render: (url) => url ? (
        <Tooltip title="Open URL">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <LinkOutlined /> Open
          </a>
        </Tooltip>
      ) : <Text type="secondary">-</Text>
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '25%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Copy Credentials">
            <Button
              type="primary"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyCredentials(record)}
            />
          </Tooltip>
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEdit(record)}
            />
          </Tooltip>
          <Tooltip title="Duplicate">
            <Button
              type="text"
              size="small"
              icon={<CopyOutlined />}
              onClick={() => handleCopyPassword(record)}
            />
          </Tooltip>
          <Tooltip title="Share">
            <Button
              type="text"
              size="small"
              icon={<ShareAltOutlined />}
              onClick={() => handleSharePassword(record)}
            />
          </Tooltip>
          <Popconfirm
            title="Delete Password"
            description="Are you sure you want to delete this password?"
            onConfirm={() => handleDeletePassword(record)}
            okText="Yes"
            cancelText="No"
          >
            <Tooltip title="Delete">
              <Button
                type="text"
                size="small"
                danger
                icon={<DeleteOutlined />}
              />
            </Tooltip>
          </Popconfirm>
        </Space>
      )
    }
  ]

  return (
    <div>
      {/* Header Section */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <SafetyCertificateOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Password Vault
              </Title>
              <Text type="secondary">Securely manage and share your credentials</Text>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadEntries}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreate}
                size="large"
              >
                Add Password
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card>
        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={8}>
            <Input
              placeholder="Search by title, username, or tags..."
              prefix={<SearchOutlined style={{ color: '#bfbfbf' }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
            />
          </Col>
          <Col xs={24} sm={12} md={8}>
            <Select
              placeholder="Filter by category"
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowClear
              style={{ width: '100%' }}
              options={[
                { label: 'Login', value: 'Login' },
                { label: 'API Key', value: 'API Key' },
                { label: 'Database', value: 'Database' },
                { label: 'SSH Key', value: 'SSH Key' },
                { label: 'Other', value: 'Other' }
              ]}
            />
          </Col>
        </Row>

        <Table
          columns={columns}
          dataSource={entries}
          rowKey="name"
          loading={loading}
          pagination={{
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} items`
          }}
          scroll={{ x: 800 }}
          locale={{
            emptyText: (
              <Empty
                description="No passwords found"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" onClick={handleCreate}>
                  Add First Password
                </Button>
              </Empty>
            )
          }}
        />
      </Card>

      {/* Share Password Modal */}
      <Modal
        title={
          <Space>
            <ShareAltOutlined />
            {`Share Password: ${selectedEntry?.title}`}
          </Space>
        }
        open={shareModalVisible}
        onCancel={() => {
          setShareModalVisible(false)
          setSelectedEntry(null)
          shareForm.resetFields()
        }}
        footer={null}
        width={700}
      >
        <Spin spinning={shareLinksLoading}>
          <Form
            form={shareForm}
            layout="vertical"
            onFinish={handleCreateShareLink}
          >
            <Row gutter={16} align="bottom">
              <Col span={14}>
                <Form.Item
                  label="Recipient Email (Optional)"
                  name="recipient_email"
                  style={{ marginBottom: 0 }}
                >
                  <Input type="email" placeholder="recipient@example.com" />
                </Form.Item>
              </Col>
              <Col span={6}>
                <Form.Item
                  label="Expiry (Hours)"
                  name="expiry_hours"
                  initialValue={24}
                  style={{ marginBottom: 0 }}
                >
                  <InputNumber min={1} max={720} style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={4}>
                <Form.Item style={{ marginBottom: 0 }}>
                  <Button type="primary" htmlType="submit" block>
                    Generate
                  </Button>
                </Form.Item>
              </Col>
            </Row>
          </Form>

          <Divider orientation="left">Active Share Links</Divider>

          {shareLinks.length > 0 ? (
            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {shareLinks.map((link) => (
                <Card key={link.name} size="small" style={{ marginBottom: '12px', background: '#fafafa' }}>
                  <Row gutter={[8, 8]} align="middle">
                    <Col span={24}>
                      <Space>
                        <Tag color={link.status === 'Active' ? 'green' : 'red'}>{link.status}</Tag>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Expires: {dayjs(link.expiry_datetime).format('MMM DD, YYYY HH:mm')}
                        </Text>
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                          Uses: {link.current_uses}/{link.max_uses}
                        </Text>
                      </Space>
                    </Col>
                    <Col span={20}>
                      <div style={{ display: 'flex', alignItems: 'center', background: '#fff', padding: '4px 8px', border: '1px solid #d9d9d9', borderRadius: '4px' }}>
                        <code style={{ fontSize: '12px', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {link.share_token}
                        </code>
                        <Tooltip title="Copy Token">
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyToClipboard(link.share_token)}
                          />
                        </Tooltip>
                      </div>
                    </Col>
                    <Col span={4} style={{ textAlign: 'right' }}>
                      <Popconfirm
                        title="Revoke Share Link"
                        description="Are you sure you want to revoke this share link?"
                        onConfirm={() => handleRevokeShareLink(link.name)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Tooltip title="Revoke">
                          <Button type="text" danger icon={<UnlockOutlined />} />
                        </Tooltip>
                      </Popconfirm>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="No active share links" image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </Spin>
      </Modal>
    </div>
  )
}

export default PasswordVault
