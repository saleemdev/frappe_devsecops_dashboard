import React, { useState, useEffect, useMemo } from 'react'
import {
  Button,
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
  Typography,
  Modal,
  Form,
  Avatar,
  Badge,
  Divider,
  theme,
  Drawer
} from 'antd'
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  EyeOutlined,
  EyeInvisibleOutlined,
  ShareAltOutlined,
  LockOutlined,
  SearchOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  KeyOutlined,
  UserOutlined,
  LinkOutlined,
  UserAddOutlined,
  CloseOutlined,
  CheckCircleOutlined,
  GlobalOutlined,
  LockFilled
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import { createApiClient } from '../services/api/config'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography
const { Meta } = Card

const PasswordVault = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
  const [selectedEntry, setSelectedEntry] = useState(null)
  const [showPassword, setShowPassword] = useState({})
  const [shareDrawerVisible, setShareDrawerVisible] = useState(false)
  const [shareForm] = Form.useForm()
  const [sharedUsers, setSharedUsers] = useState([])
  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false)
  const [apiClient, setApiClient] = useState(null)
  const [stats, setStats] = useState({ owned: 0, shared: 0, total: 0 })

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
          category: categoryFilter,
          include_shared: true
        }
      })

      if (response.data && response.data.success) {
        setEntries(response.data.data || [])
        setStats({
          owned: response.data.owned_count || 0,
          shared: response.data.shared_count || 0,
          total: response.data.total || 0
        })
      } else {
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

  const handleCopyPassword = async (entry) => {
    if (!apiClient) return
    try {
      const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entry', {
        params: { name: entry.name }
      })

      const data = response.data.data || response.data
      if (data && data.password) {
        await navigator.clipboard.writeText(data.password)
        message.success('Password copied to clipboard')
      }
    } catch (error) {
      console.error('[PasswordVault] Error copying password:', error)
      message.error('Failed to copy password')
    }
  }

  const handleCopyCredentials = async (entry) => {
    if (!apiClient) return
    try {
      const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_vault.get_vault_entry', {
        params: { name: entry.name }
      })

      const data = response.data.data || response.data
      if (data) {
        const credentialsText = `Username: ${data.username || 'N/A'}\nPassword: ${data.password || 'N/A'}${data.url ? `\nURL: ${data.url}` : ''}`
        await navigator.clipboard.writeText(credentialsText)
        message.success('Credentials copied to clipboard')
      }
    } catch (error) {
      console.error('[PasswordVault] Error copying credentials:', error)
      message.error('Failed to copy credentials')
    }
  }

  const handleDeletePassword = async (entry) => {
    if (!apiClient) return
    try {
      const response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_vault.delete_vault_entry', {
        name: entry.name
      })

      if (response.data && (response.data.success || response.data.message)) {
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
    setShareDrawerVisible(true)
    await Promise.all([
      loadSharedUsers(entry.name),
      loadUsersForSharing()
    ])
  }

  const loadUsersForSharing = async (search = '') => {
    if (!apiClient) return
    try {
      setLoadingUsers(true)
      const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_vault.get_users_for_sharing', {
        params: { search_query: search }
      })

      if (response.data && response.data.success) {
        setUserOptions(response.data.data || [])
      }
    } catch (error) {
      console.error('[PasswordVault] Error loading users:', error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const loadSharedUsers = async (entryName) => {
    if (!apiClient) return
    try {
      setLoadingSharedUsers(true)
      const response = await apiClient.get('/api/method/frappe_devsecops_dashboard.api.password_vault.get_shared_users', {
        params: { name: entryName }
      })

      if (response.data && response.data.success) {
        setSharedUsers(response.data.data || [])
      }
    } catch (error) {
      console.error('[PasswordVault] Error loading shared users:', error)
    } finally {
      setLoadingSharedUsers(false)
    }
  }

  const handleShareSubmit = async (values) => {
    if (!apiClient || !selectedEntry) return
    try {
      const response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_vault.share_password_entry', {
        name: selectedEntry.name,
        assign_to_users: values.users || [],
        description: values.description || ''
      })

      if (response.data && response.data.success) {
        message.success(response.data.message || 'Password shared successfully')
        await loadSharedUsers(selectedEntry.name)
        shareForm.resetFields()
        loadEntries()
      } else {
        message.error(response.data.error || 'Failed to share password')
      }
    } catch (error) {
      console.error('[PasswordVault] Error sharing password:', error)
      message.error('Failed to share password')
    }
  }

  const handleUnshare = async (userEmail) => {
    if (!apiClient || !selectedEntry) return
    try {
      const response = await apiClient.post('/api/method/frappe_devsecops_dashboard.api.password_vault.unshare_password_entry', {
        name: selectedEntry.name,
        user_email: userEmail
      })

      if (response.data && response.data.success) {
        message.success(response.data.message || 'Password unshared successfully')
        await loadSharedUsers(selectedEntry.name)
        loadEntries()
      }
    } catch (error) {
      console.error('[PasswordVault] Error unsharing password:', error)
      message.error('Failed to unshare password')
    }
  }

  const togglePasswordVisibility = (entryName) => {
    setShowPassword(prev => ({
      ...prev,
      [entryName]: !prev[entryName]
    }))
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Login': 'blue',
      'API Key': 'green',
      'Database': 'orange',
      'SSH Key': 'red',
      'Certificate': 'purple',
      'Other': 'default'
    }
    return colors[category] || 'default'
  }

  const getCategoryIcon = (category) => {
    const icons = {
      'Login': <UserOutlined />,
      'API Key': <KeyOutlined />,
      'Database': <GlobalOutlined />,
      'SSH Key': <KeyOutlined />,
      'Certificate': <SafetyCertificateOutlined />,
      'Other': <LockFilled />
    }
    return icons[category] || <LockFilled />
  }

  // Filter entries based on search and category
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      const matchesSearch = !searchQuery || 
        entry.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.tags?.toLowerCase().includes(searchQuery.toLowerCase())
      
      const matchesCategory = !categoryFilter || entry.category === categoryFilter
      
      return matchesSearch && matchesCategory
    })
  }, [entries, searchQuery, categoryFilter])

  return (
    <div style={{ padding: '0' }}>
      {/* Header Section - Modern Bitwarden-style */}
      <Card 
        style={{
          marginBottom: 24,
          borderRadius: '12px',
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
          background: `linear-gradient(135deg, ${token.colorPrimary}15 0%, ${token.colorPrimary}05 100%)`
        }}
      >
        <Row justify="space-between" align="middle" gutter={[16, 16]}>
          <Col xs={24} sm={24} md={16}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Space align="center">
                <div style={{
                  width: 48,
                  height: 48,
                  borderRadius: '12px',
                  background: `linear-gradient(135deg, ${token.colorPrimary} 0%, ${token.colorPrimary}dd 100%)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: `0 4px 12px ${token.colorPrimary}40`
                }}>
                  <SafetyCertificateOutlined style={{ fontSize: 24, color: '#fff' }} />
                </div>
                <div>
                  <Title level={2} style={{ margin: 0, fontSize: 28, fontWeight: 700 }}>
                    Password Vault
                  </Title>
                  <Text type="secondary" style={{ fontSize: 14 }}>
                    Securely manage and share your credentials
                  </Text>
                </div>
              </Space>
              
              {/* Stats */}
              <Space size="large" style={{ marginTop: 8 }}>
                <Space size={4}>
                  <LockOutlined style={{ color: token.colorPrimary }} />
                  <Text strong>{stats.owned}</Text>
                  <Text type="secondary">Owned</Text>
                </Space>
                <Space size={4}>
                  <ShareAltOutlined style={{ color: token.colorSuccess }} />
                  <Text strong>{stats.shared}</Text>
                  <Text type="secondary">Shared</Text>
                </Space>
                <Space size={4}>
                  <KeyOutlined style={{ color: token.colorWarning }} />
                  <Text strong>{stats.total}</Text>
                  <Text type="secondary">Total</Text>
                </Space>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={24} md={8}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
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
                style={{
                  borderRadius: '8px',
                  height: 40,
                  fontWeight: 600,
                  boxShadow: `0 4px 12px ${token.colorPrimary}40`
                }}
              >
                Add Password
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Filters and Search */}
      <Card 
        style={{ 
          marginBottom: 24,
          borderRadius: '12px',
          border: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
        }}
      >
        <Row gutter={[16, 16]} align="middle">
          <Col xs={24} sm={12} md={10}>
            <Input
              placeholder="Search passwords..."
              prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              allowClear
              size="large"
              style={{ borderRadius: '8px' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Select
              placeholder="All Categories"
              value={categoryFilter}
              onChange={setCategoryFilter}
              allowClear
              style={{ width: '100%' }}
              size="large"
              options={[
                { label: 'Login', value: 'Login' },
                { label: 'API Key', value: 'API Key' },
                { label: 'Database', value: 'Database' },
                { label: 'SSH Key', value: 'SSH Key' },
                { label: 'Certificate', value: 'Certificate' },
                { label: 'Other', value: 'Other' }
              ]}
            />
          </Col>
          <Col xs={24} sm={24} md={8} style={{ textAlign: 'right' }}>
            <Space>
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                onClick={() => setViewMode('grid')}
                icon={<SafetyCertificateOutlined />}
              >
                Grid
              </Button>
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                onClick={() => setViewMode('list')}
                icon={<KeyOutlined />}
              >
                List
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Password Cards - Modern Grid Layout */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '60px 0' }}>
          <Spin size="large" />
        </div>
      ) : filteredEntries.length === 0 ? (
        <Card style={{ borderRadius: '12px', border: 'none' }}>
          <Empty
            description="No passwords found"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={handleCreate} size="large">
              Add First Password
            </Button>
          </Empty>
        </Card>
      ) : viewMode === 'grid' ? (
        <Row gutter={[16, 16]}>
          {filteredEntries.map((entry) => (
            <Col xs={24} sm={12} md={8} lg={6} key={entry.name}>
              <Card
                hoverable
                style={{
                  borderRadius: '12px',
                  border: entry.is_shared 
                    ? `2px solid ${token.colorSuccess}40` 
                    : `1px solid ${token.colorBorderSecondary}`,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
                  transition: 'all 0.3s',
                  height: '100%',
                  background: entry.is_shared 
                    ? `linear-gradient(135deg, ${token.colorSuccess}08 0%, transparent 100%)`
                    : 'white'
                }}
                bodyStyle={{ padding: '20px' }}
                actions={[
                  <Tooltip title="Copy Password">
                    <CopyOutlined 
                      key="copy" 
                      onClick={() => handleCopyPassword(entry)}
                      style={{ fontSize: 16 }}
                    />
                  </Tooltip>,
                  <Tooltip title="Edit">
                    <EditOutlined 
                      key="edit" 
                      onClick={() => handleEdit(entry)}
                      style={{ fontSize: 16 }}
                    />
                  </Tooltip>,
                  <Tooltip title="Share">
                    <ShareAltOutlined 
                      key="share" 
                      onClick={() => handleSharePassword(entry)}
                      style={{ fontSize: 16, color: entry.is_shared ? token.colorSuccess : undefined }}
                    />
                  </Tooltip>,
                  <Popconfirm
                    title="Delete Password"
                    description="Are you sure you want to delete this password?"
                    onConfirm={() => handleDeletePassword(entry)}
                    okText="Yes"
                    cancelText="No"
                    key="delete"
                  >
                    <Tooltip title="Delete">
                      <DeleteOutlined 
                        style={{ fontSize: 16, color: token.colorError }}
                      />
                    </Tooltip>
                  </Popconfirm>
                ]}
              >
                <Meta
                  avatar={
                    <div style={{
                      width: 48,
                      height: 48,
                      borderRadius: '12px',
                      background: `linear-gradient(135deg, ${token.colorPrimary}20 0%, ${token.colorPrimary}10 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      border: `2px solid ${token.colorPrimary}30`
                    }}>
                      {getCategoryIcon(entry.category)}
                    </div>
                  }
                  title={
                    <Space direction="vertical" size={2} style={{ width: '100%' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Text strong style={{ fontSize: 16 }}>{entry.title}</Text>
                        {entry.is_shared && (
                          <Tag color="success" icon={<ShareAltOutlined />} style={{ margin: 0 }}>
                            Shared
                          </Tag>
                        )}
                      </div>
                      {entry.is_shared && entry.owner_name && (
                        <Text type="secondary" style={{ fontSize: 11 }}>
                          From: {entry.owner_name}
                        </Text>
                      )}
                    </Space>
                  }
                  description={
                    <Space direction="vertical" size={8} style={{ width: '100%', marginTop: 12 }}>
                      {entry.username && (
                        <Space size={4}>
                          <UserOutlined style={{ color: token.colorTextSecondary, fontSize: 12 }} />
                          <Text type="secondary" style={{ fontSize: 13 }}>
                            {entry.username}
                          </Text>
                        </Space>
                      )}
                      <Space>
                        <Tag color={getCategoryColor(entry.category)} icon={getCategoryIcon(entry.category)}>
                          {entry.category}
                        </Tag>
                        {entry.url && (
                          <Tooltip title={entry.url}>
                            <a href={entry.url} target="_blank" rel="noopener noreferrer">
                              <LinkOutlined style={{ color: token.colorPrimary }} />
                            </a>
                          </Tooltip>
                        )}
                      </Space>
                    </Space>
                  }
                />
              </Card>
            </Col>
          ))}
        </Row>
      ) : (
        <Card style={{ borderRadius: '12px', border: 'none' }}>
          {filteredEntries.map((entry, index) => (
            <div key={entry.name}>
              <Row 
                gutter={[16, 16]} 
                align="middle"
                style={{
                  padding: '16px',
                  borderRadius: '8px',
                  background: index % 2 === 0 ? token.colorFillAlter : 'transparent',
                  marginBottom: index < filteredEntries.length - 1 ? 8 : 0
                }}
              >
                <Col xs={24} sm={6} md={4}>
                  <Space>
                    <div style={{
                      width: 40,
                      height: 40,
                      borderRadius: '8px',
                      background: `linear-gradient(135deg, ${token.colorPrimary}20 0%, ${token.colorPrimary}10 100%)`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {getCategoryIcon(entry.category)}
                    </div>
                    <div>
                      <Text strong>{entry.title}</Text>
                      {entry.is_shared && (
                        <div>
                          <Tag color="success" size="small" icon={<ShareAltOutlined />}>
                            Shared
                          </Tag>
                        </div>
                      )}
                    </div>
                  </Space>
                </Col>
                <Col xs={24} sm={6} md={4}>
                  {entry.username ? (
                    <Space>
                      <UserOutlined style={{ color: token.colorTextSecondary }} />
                      <Text>{entry.username}</Text>
                    </Space>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Col>
                <Col xs={24} sm={4} md={3}>
                  <Tag color={getCategoryColor(entry.category)}>
                    {entry.category}
                  </Tag>
                </Col>
                <Col xs={24} sm={4} md={4}>
                  {entry.url ? (
                    <a href={entry.url} target="_blank" rel="noopener noreferrer">
                      <LinkOutlined /> Open
                    </a>
                  ) : (
                    <Text type="secondary">-</Text>
                  )}
                </Col>
                <Col xs={24} sm={4} md={9} style={{ textAlign: 'right' }}>
                  <Space>
                    <Tooltip title="Copy Password">
                      <Button
                        type="text"
                        icon={<CopyOutlined />}
                        onClick={() => handleCopyPassword(entry)}
                      />
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(entry)}
                      />
                    </Tooltip>
                    <Tooltip title="Share">
                      <Button
                        type="text"
                        icon={<ShareAltOutlined />}
                        onClick={() => handleSharePassword(entry)}
                        style={{ color: entry.is_shared ? token.colorSuccess : undefined }}
                      />
                    </Tooltip>
                    <Popconfirm
                      title="Delete Password"
                      description="Are you sure?"
                      onConfirm={() => handleDeletePassword(entry)}
                    >
                      <Tooltip title="Delete">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                </Col>
              </Row>
              {index < filteredEntries.length - 1 && <Divider style={{ margin: 0 }} />}
            </div>
          ))}
        </Card>
      )}

      {/* Share Drawer */}
      <Drawer
        title={
          <Space>
            <ShareAltOutlined />
            <span>Share Password: {selectedEntry?.title}</span>
          </Space>
        }
        open={shareDrawerVisible}
        onClose={() => {
          setShareDrawerVisible(false)
          setSelectedEntry(null)
          shareForm.resetFields()
        }}
        width={500}
      >
        <Form
          form={shareForm}
          layout="vertical"
          onFinish={handleShareSubmit}
        >
          <Form.Item
            label="Share with Users"
            name="users"
            rules={[{ required: true, message: 'Please select at least one user' }]}
            tooltip="Select users to share this password with. They will receive a ToDo notification."
          >
            <Select
              mode="multiple"
              placeholder="Select users..."
              showSearch
              loading={loadingUsers}
              onSearch={handleUserSearch}
              filterOption={false}
              options={userOptions}
              size="large"
              notFoundContent={loadingUsers ? <Spin size="small" /> : 'No users found'}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            label="Description (Optional)"
            name="description"
          >
            <Input.TextArea
              rows={3}
              placeholder="Add a note about why you're sharing this password..."
            />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large">
              <UserAddOutlined /> Share Password
            </Button>
          </Form.Item>
        </Form>

        <Divider>Shared With</Divider>

        <Spin spinning={loadingSharedUsers}>
          {sharedUsers.length > 0 ? (
            <Space direction="vertical" style={{ width: '100%' }} size="middle">
              {sharedUsers.map((user) => (
                <Card
                  key={user.email}
                  size="small"
                  style={{
                    background: token.colorFillAlter,
                    borderRadius: '8px'
                  }}
                >
                  <Row justify="space-between" align="middle">
                    <Col>
                      <Space>
                        <Avatar>{user.full_name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}</Avatar>
                        <div>
                          <Text strong>{user.full_name || user.email}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {user.email}
                          </Text>
                        </div>
                      </Space>
                    </Col>
                    <Col>
                      {selectedEntry?.is_owner && (
                        <Popconfirm
                          title="Unshare Password"
                          description={`Remove access for ${user.full_name || user.email}?`}
                          onConfirm={() => handleUnshare(user.email)}
                        >
                          <Button type="text" danger size="small">
                            Remove
                          </Button>
                        </Popconfirm>
                      )}
                    </Col>
                  </Row>
                </Card>
              ))}
            </Space>
          ) : (
            <Empty
              description="Not shared with anyone yet"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          )}
        </Spin>
      </Drawer>
    </div>
  )
}

export default PasswordVault
