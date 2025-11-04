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
  DatePicker
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
  UnlockOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

// API call helper function
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token,
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
    console.error('[PasswordVault] API Error:', error)
    throw error
  }
}

const PasswordVault = () => {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [modalVisible, setModalVisible] = useState(false)
  const [shareModalVisible, setShareModalVisible] = useState(false)
  const [editingEntry, setEditingEntry] = useState(null)
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [form] = Form.useForm()
  const [shareForm] = Form.useForm()
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [showPasswords, setShowPasswords] = useState({})
  const [shareLinks, setShareLinks] = useState([])
  const [shareLinksLoading, setShareLinksLoading] = useState(false)

  // Load password entries on mount
  useEffect(() => {
    loadEntries()
  }, [searchQuery, categoryFilter])

  const loadEntries = async () => {
    try {
      setLoading(true)
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entries?search_query=${encodeURIComponent(searchQuery)}&category=${encodeURIComponent(categoryFilter)}`
      )

      if (response?.success) {
        setEntries(response.data || [])
      } else {
        message.error(response?.error || 'Failed to load password entries')
      }
    } catch (error) {
      console.error('[PasswordVault] Error loading entries:', error)
      message.error('Failed to load password entries')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPassword = () => {
    setEditingEntry(null)
    form.resetFields()
    setModalVisible(true)
  }

  const handleEditPassword = async (entry) => {
    try {
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entry?name=${encodeURIComponent(entry.name)}`
      )

      if (response?.success && response?.data) {
        setEditingEntry(response.data)
        form.setFieldsValue({
          title: response.data.title,
          username: response.data.username,
          password: response.data.password,
          url: response.data.url,
          port: response.data.port,
          category: response.data.category,
          project: response.data.project,
          notes: response.data.notes,
          tags: response.data.tags,
          expiry_date: response.data.expiry_date ? dayjs(response.data.expiry_date) : null,
          is_active: response.data.is_active
        })
        setModalVisible(true)
      }
    } catch (error) {
      console.error('[PasswordVault] Error fetching entry:', error)
      message.error('Failed to fetch password entry')
    }
  }

  const handleCopyPassword = async (entry) => {
    try {
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_vault.copy_vault_entry?name=${encodeURIComponent(entry.name)}`,
        { method: 'POST' }
      )

      if (response?.success) {
        message.success('Password copied successfully')
        loadEntries()
        // Optionally open the edit form for the new entry
        setTimeout(() => {
          const newEntry = { name: response.data.name }
          handleEditPassword(newEntry)
        }, 500)
      } else {
        message.error(response?.error || 'Failed to copy password')
      }
    } catch (error) {
      console.error('[PasswordVault] Error copying password:', error)
      message.error('Failed to copy password')
    }
  }

  const handleSavePassword = async (values) => {
    try {
      const data = {
        title: values.title,
        username: values.username || '',
        password: values.password,
        url: values.url || '',
        port: values.port || null,
        category: values.category || 'Login',
        project: values.project || '',
        notes: values.notes || '',
        tags: values.tags || '',
        expiry_date: values.expiry_date ? values.expiry_date.format('YYYY-MM-DD') : null,
        is_active: values.is_active ? 1 : 0
      }

      let response
      if (editingEntry) {
        response = await apiCall(
          `/api/method/frappe_devsecops_dashboard.api.password_vault.update_vault_entry?name=${encodeURIComponent(editingEntry.name)}`,
          { method: 'POST', data }
        )
      } else {
        response = await apiCall(
          `/api/method/frappe_devsecops_dashboard.api.password_vault.create_vault_entry`,
          { method: 'POST', data }
        )
      }

      if (response?.success) {
        message.success(editingEntry ? 'Password updated successfully' : 'Password created successfully')
        setModalVisible(false)
        form.resetFields()
        loadEntries()
      } else {
        message.error(response?.error || 'Failed to save password')
      }
    } catch (error) {
      console.error('[PasswordVault] Error saving password:', error)
      message.error('Failed to save password')
    }
  }

  const handleDeletePassword = async (entry) => {
    try {
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_vault.delete_vault_entry?name=${encodeURIComponent(entry.name)}`,
        { method: 'POST' }
      )

      if (response?.success) {
        message.success('Password deleted successfully')
        loadEntries()
      } else {
        message.error(response?.error || 'Failed to delete password')
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
    try {
      setShareLinksLoading(true)
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_share_links.get_share_links?vault_entry_name=${encodeURIComponent(entryName)}`
      )

      if (response?.success) {
        setShareLinks(response.data || [])
      }
    } catch (error) {
      console.error('[PasswordVault] Error loading share links:', error)
    } finally {
      setShareLinksLoading(false)
    }
  }

  const handleCreateShareLink = async (values) => {
    try {
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_share_links.create_share_link?vault_entry_name=${encodeURIComponent(selectedEntry.name)}&expiry_hours=${values.expiry_hours || 24}&recipient_email=${values.recipient_email || ''}`,
        { method: 'POST' }
      )

      if (response?.success) {
        message.success('Share link created successfully')
        await loadShareLinks(selectedEntry.name)
        shareForm.resetFields()
      } else {
        message.error(response?.error || 'Failed to create share link')
      }
    } catch (error) {
      console.error('[PasswordVault] Error creating share link:', error)
      message.error('Failed to create share link')
    }
  }

  const handleRevokeShareLink = async (linkName) => {
    try {
      const response = await apiCall(
        `/api/method/frappe_devsecops_dashboard.api.password_share_links.revoke_share_link?share_link_name=${encodeURIComponent(linkName)}`,
        { method: 'POST' }
      )

      if (response?.success) {
        message.success('Share link revoked successfully')
        await loadShareLinks(selectedEntry.name)
      } else {
        message.error(response?.error || 'Failed to revoke share link')
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
      render: (text) => <strong>{text}</strong>
    },
    {
      title: 'Username',
      dataIndex: 'username',
      key: 'username',
      width: '20%',
      render: (text) => text || '-'
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
      width: '20%',
      render: (url) => url ? (
        <Tooltip title="Open URL">
          <a href={url} target="_blank" rel="noopener noreferrer">
            <LinkOutlined /> Open
          </a>
        </Tooltip>
      ) : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '25%',
      render: (_, record) => (
        <Space size="small">
          <Tooltip title="Edit">
            <Button
              type="text"
              size="small"
              icon={<EditOutlined />}
              onClick={() => handleEditPassword(record)}
            />
          </Tooltip>
          <Tooltip title="Copy">
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
    <div style={{ padding: '24px' }}>
      <Card>
        <Row gutter={[16, 16]} align="middle" justify="space-between">
          <Col flex="auto">
            <h2 style={{ margin: 0 }}>
              <LockOutlined /> Password Vault
            </h2>
          </Col>
          <Col>
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleAddPassword}
            >
              Add Password
            </Button>
          </Col>
        </Row>

        <Divider />

        <Row gutter={[16, 16]} style={{ marginBottom: '16px' }}>
          <Col xs={24} sm={12} md={8}>
            <Input.Search
              placeholder="Search by title, username, or tags..."
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

        <Spin spinning={loading}>
          {entries.length > 0 ? (
            <Table
              columns={columns}
              dataSource={entries}
              rowKey="name"
              pagination={{ pageSize: 10 }}
              scroll={{ x: 800 }}
            />
          ) : (
            <Empty description="No passwords found" />
          )}
        </Spin>
      </Card>

      {/* Add/Edit Password Modal */}
      <Modal
        title={editingEntry ? 'Edit Password' : 'Add Password'}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          form.resetFields()
          setEditingEntry(null)
        }}
        footer={null}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSavePassword}
        >
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Title is required' }]}
          >
            <Input placeholder="e.g., Gmail Account" />
          </Form.Item>

          <Form.Item
            label="Username"
            name="username"
          >
            <Input placeholder="e.g., user@example.com" />
          </Form.Item>

          <Form.Item
            label="Password"
            name="password"
            rules={[{ required: true, message: 'Password is required' }]}
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>

          <Form.Item
            label="URL"
            name="url"
          >
            <Input placeholder="e.g., https://gmail.com" />
          </Form.Item>

          <Form.Item
            label="Port"
            name="port"
          >
            <InputNumber placeholder="e.g., 3306" min={1} max={65535} />
          </Form.Item>

          <Form.Item
            label="Project"
            name="project"
          >
            <Input placeholder="Associated project" />
          </Form.Item>

          <Form.Item
            label="Category"
            name="category"
            initialValue="Login"
          >
            <Select
              options={[
                { label: 'Login', value: 'Login' },
                { label: 'API Key', value: 'API Key' },
                { label: 'Database', value: 'Database' },
                { label: 'SSH Key', value: 'SSH Key' },
                { label: 'Certificate', value: 'Certificate' },
                { label: 'Other', value: 'Other' }
              ]}
            />
          </Form.Item>

          <Form.Item
            label="Notes"
            name="notes"
          >
            <Input.TextArea rows={3} placeholder="Additional notes..." />
          </Form.Item>

          <Form.Item
            label="Tags"
            name="tags"
          >
            <Input placeholder="Comma-separated tags" />
          </Form.Item>

          <Form.Item
            label="Expiry Date"
            name="expiry_date"
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            label="Active"
            name="is_active"
            valuePropName="checked"
            initialValue={true}
          >
            <Input type="checkbox" />
          </Form.Item>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                {editingEntry ? 'Update' : 'Create'}
              </Button>
              <Button onClick={() => {
                setModalVisible(false)
                form.resetFields()
                setEditingEntry(null)
              }}>
                Cancel
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>

      {/* Share Password Modal */}
      <Modal
        title={`Share Password: ${selectedEntry?.title}`}
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
            <Form.Item
              label="Recipient Email (Optional)"
              name="recipient_email"
            >
              <Input type="email" placeholder="recipient@example.com" />
            </Form.Item>

            <Form.Item
              label="Expiry Time (Hours)"
              name="expiry_hours"
              initialValue={24}
            >
              <InputNumber min={1} max={720} />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit">
                Generate Share Link
              </Button>
            </Form.Item>
          </Form>

          <Divider>Active Share Links</Divider>

          {shareLinks.length > 0 ? (
            <div>
              {shareLinks.map((link) => (
                <Card key={link.name} size="small" style={{ marginBottom: '12px' }}>
                  <Row gutter={[16, 16]}>
                    <Col xs={24}>
                      <div>
                        <strong>Share Token:</strong>
                        <Space>
                          <code style={{ fontSize: '12px' }}>{link.share_token.substring(0, 8)}...</code>
                          <Button
                            type="text"
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => handleCopyToClipboard(link.share_token)}
                          />
                        </Space>
                      </div>
                    </Col>
                    <Col xs={24}>
                      <div>
                        <strong>Status:</strong> <Tag color={link.status === 'Active' ? 'green' : 'red'}>{link.status}</Tag>
                      </div>
                    </Col>
                    <Col xs={24}>
                      <div>
                        <strong>Expires:</strong> {dayjs(link.expiry_datetime).format('MMM DD, YYYY HH:mm')}
                      </div>
                    </Col>
                    <Col xs={24}>
                      <div>
                        <strong>Uses:</strong> {link.current_uses}/{link.max_uses}
                      </div>
                    </Col>
                    <Col xs={24}>
                      <Popconfirm
                        title="Revoke Share Link"
                        description="Are you sure you want to revoke this share link?"
                        onConfirm={() => handleRevokeShareLink(link.name)}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Button type="text" danger size="small" icon={<UnlockOutlined />}>
                          Revoke
                        </Button>
                      </Popconfirm>
                    </Col>
                  </Row>
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="No active share links" />
          )}
        </Spin>
      </Modal>
    </div>
  )
}

export default PasswordVault

