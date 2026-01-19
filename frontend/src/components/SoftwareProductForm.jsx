import { useState, useEffect, useRef } from 'react'
import {
  Form,
  Input,
  Button,
  Select,
  Row,
  Col,
  Card,
  Space,
  message,
  Table,
  Modal,
  Divider,
  DatePicker,
  Spin,
  Typography,
  Tag,
  Avatar,
  theme,
  Statistic,
  Popconfirm
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  RocketOutlined,
  UserOutlined,
  TeamOutlined,
  LoadingOutlined,
  DashboardOutlined,
  SyncOutlined,
  AppstoreOutlined,
  BarChartOutlined,
  ApiOutlined,
  FileTextOutlined,
  FolderOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { searchUsers, searchDesignations } from '../utils/projectAttachmentsApi'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text } = Typography

const SoftwareProductForm = ({ mode = 'create', productId = null, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [product, setProduct] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [editingTeamMember, setEditingTeamMember] = useState(null)
  const [teamForm] = Form.useForm()
  const [userSearchResults, setUserSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [designations, setDesignations] = useState([])
  const [designationSearchLoading, setDesignationSearchLoading] = useState(false)
  const [isFormDirty, setIsFormDirty] = useState(false)

  // RACI Template and Project Template state
  const [raciTemplates, setRaciTemplates] = useState([])
  const [loadingRaciTemplates, setLoadingRaciTemplates] = useState(false)
  const [projectTemplates, setProjectTemplates] = useState([])
  const [loadingProjectTemplates, setLoadingProjectTemplates] = useState(false)

  // Workspace Summary Modal State
  const [showWorkspaceSummary, setShowWorkspaceSummary] = useState(false)
  const [workspaceSummary, setWorkspaceSummary] = useState(null)
  const [loadingWorkspaceSummary, setLoadingWorkspaceSummary] = useState(false)

  // Refs for debounce timeouts
  const raciSearchTimeoutRef = useRef(null)
  const projectTemplateSearchTimeoutRef = useRef(null)

  const statusOptions = [
    { label: 'Draft', value: 'Draft' },
    { label: 'Active', value: 'Active' },
    { label: 'Inactive', value: 'Inactive' },
    { label: 'Archived', value: 'Archived' }
  ]

  const releaseStatusOptions = [
    { label: 'Planning', value: 'Planning' },
    { label: 'Beta', value: 'Beta' },
    { label: 'Released', value: 'Released' },
    { label: 'Deprecated', value: 'Deprecated' }
  ]

  // Cleanup debounce timeouts on component unmount
  useEffect(() => {
    return () => {
      if (raciSearchTimeoutRef.current) {
        clearTimeout(raciSearchTimeoutRef.current)
      }
      if (projectTemplateSearchTimeoutRef.current) {
        clearTimeout(projectTemplateSearchTimeoutRef.current)
      }
    }
  }, [])

  // Load product data if editing
  useEffect(() => {
    if (mode === 'edit' && productId) {
      loadProduct()
    } else if (mode === 'create') {
      // Initialize form for create mode
      form.setFieldsValue({
        status: 'Draft',
        release_status: 'Planning'
      })
    }
    // Load initial data for search fields
    loadRaciTemplates('')
    loadProjectTemplates('')
  }, [mode, productId])

  // Load designations when team modal opens
  useEffect(() => {
    if (showTeamModal) {
      handleDesignationSearch('')
    }
  }, [showTeamModal])

  // Track form changes to detect dirty state
  const handleFormChange = () => {
    setIsFormDirty(true)
  }

  const loadProduct = async () => {
    setLoading(true)
    try {
      const endpoint = `/api/method/frappe_devsecops_dashboard.api.software_product.get_product_detail?name=${encodeURIComponent(productId)}`
      const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()

      if (data.message && data.message.success) {
        const productData = data.message.data
        setProduct(productData)

        // Set team members from the API response
        const teamMembersData = productData.team_members || []
        setTeamMembers(teamMembersData.map((member, index) => ({
          id: member.name || `member-${index}`,
          idx: member.idx,
          member: member.member,
          role: member.role
        })))

        // Format dates for form
        const formData = {
          ...productData,
          start_date: productData.start_date ? dayjs(productData.start_date) : null,
          completion_date: productData.completion_date ? dayjs(productData.completion_date) : null,
          // Exclude team_members from form fields (handled separately)
          team_members: undefined
        }

        form.setFieldsValue(formData)
        message.success('Product loaded successfully')
      } else {
        message.error('Failed to load Software Product details')
      }
    } catch (error) {
      message.error('Failed to load Software Product')
      console.error('Error loading product:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load RACI Templates with search
  const loadRaciTemplates = async (searchValue = '') => {
    try {
      setLoadingRaciTemplates(true)
      const filters = searchValue && searchValue.trim()
        ? JSON.stringify([['RACI Template', 'template_name', 'like', `%${searchValue.trim()}%`]])
        : JSON.stringify([])
      
      const params = new URLSearchParams({
        fields: JSON.stringify(['name', 'template_name']),
        filters: filters,
        limit_page_length: 100
      })

      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.raci_template.get_raci_templates?${params}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        const result = data.message || data
        if (result.success && result.data) {
          setRaciTemplates(result.data.map(t => ({
            label: t.template_name,
            value: t.name
          })))
        }
      }
    } catch (error) {
      console.error('[SoftwareProductForm] Error loading RACI templates:', error)
    } finally {
      setLoadingRaciTemplates(false)
    }
  }

  // Debounced RACI template search
  const handleRaciTemplateSearch = (searchValue) => {
    if (raciSearchTimeoutRef.current) {
      clearTimeout(raciSearchTimeoutRef.current)
    }

    raciSearchTimeoutRef.current = setTimeout(() => {
      loadRaciTemplates(searchValue)
    }, 400)
  }

  // Load Project Templates with search
  const loadProjectTemplates = async (searchValue = '') => {
    try {
      setLoadingProjectTemplates(true)
      const filters = searchValue && searchValue.trim()
        ? JSON.stringify([['Project', 'project_name', 'like', `%${searchValue.trim()}%`], ['disabled', '=', 0]])
        : JSON.stringify([['disabled', '=', 0]])
      
      const params = new URLSearchParams({
        fields: JSON.stringify(['name', 'project_name']),
        filters: filters,
        limit_page_length: 100
      })

      const response = await fetch(
        `/api/resource/Project?${params}`,
        {
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.data) {
          setProjectTemplates(data.data.map(p => ({
            label: p.project_name,
            value: p.name
          })))
        }
      }
    } catch (error) {
      console.error('[SoftwareProductForm] Error loading project templates:', error)
    } finally {
      setLoadingProjectTemplates(false)
    }
  }

  // Debounced Project Template search
  const handleProjectTemplateSearch = (searchValue) => {
    if (projectTemplateSearchTimeoutRef.current) {
      clearTimeout(projectTemplateSearchTimeoutRef.current)
    }

    projectTemplateSearchTimeoutRef.current = setTimeout(() => {
      loadProjectTemplates(searchValue)
    }, 400)
  }

  const handleAddTeamMember = () => {
    setEditingTeamMember(null)
    teamForm.resetFields()
    setShowTeamModal(true)
  }

  const handleEditTeamMember = (record) => {
    setEditingTeamMember(record)
    teamForm.setFieldsValue({
      member: record.member,
      role: record.role
    })
    setShowTeamModal(true)
  }

  const handleDeleteTeamMember = (id) => {
    setTeamMembers(teamMembers.filter(m => m.id !== id))
    message.success('Team member removed')
  }

  const handleSaveTeamMember = () => {
    teamForm.validateFields().then(values => {
      if (editingTeamMember) {
        // Update existing member
        setTeamMembers(teamMembers.map(m =>
          m.id === editingTeamMember.id
            ? { ...m, ...values, id: m.id }
            : m
        ))
        message.success('Team member updated')
      } else {
        // Add new member
        setTeamMembers([...teamMembers, {
          id: Date.now(), // Temporary ID
          ...values
        }])
        message.success('Team member added')
      }
      setShowTeamModal(false)
      teamForm.resetFields()
    }).catch(() => {
      message.error('Please fill in all required fields')
    })
  }

  const handleUserSearch = async (searchValue) => {
    if (!searchValue || searchValue.trim().length < 2) {
      setUserSearchResults([])
      return
    }

    try {
      setSearchLoading(true)
      const response = await searchUsers(searchValue)
      const users = response.message?.users || response.users || []
      setUserSearchResults(users)
    } catch (error) {
      console.error('Error searching users:', error)
      setUserSearchResults([])
    } finally {
      setSearchLoading(false)
    }
  }

  const handleDesignationSearch = async (searchValue) => {
    try {
      setDesignationSearchLoading(true)
      const response = await searchDesignations(searchValue || '')
      if (response.success) {
        setDesignations(response.designations || [])
      } else {
        setDesignations([])
      }
    } catch (error) {
      console.error('Error searching designations:', error)
      setDesignations([])
    } finally {
      setDesignationSearchLoading(false)
    }
  }

  // Fetch workspace summary from Zenhub
  const fetchWorkspaceSummary = async () => {
    const workspaceId = product?.zenhub_workspace_id || form.getFieldValue('zenhub_workspace_id')
    if (!workspaceId) {
      message.warning('Please configure Zenhub Workspace ID first')
      return
    }

    setLoadingWorkspaceSummary(true)
    setShowWorkspaceSummary(true)
    setWorkspaceSummary(null)

    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary?workspace_id=${encodeURIComponent(workspaceId)}`,
        {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      )

      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWorkspaceSummary(data)
          message.success('Workspace summary loaded successfully')
        } else {
          throw new Error(data.error || 'Failed to fetch workspace summary')
        }
      } else {
        throw new Error(`HTTP error! status: ${response.status}`)
      }
    } catch (error) {
      console.error('Error fetching workspace summary:', error)
      message.error(error.message || 'Failed to fetch workspace summary')
    } finally {
      setLoadingWorkspaceSummary(false)
    }
  }

  const handleCancel = () => {
    if (isFormDirty) {
      Modal.confirm({
        title: 'Unsaved Changes',
        content: 'You have unsaved changes. Are you sure you want to leave?',
        okText: 'Leave',
        cancelText: 'Continue Editing',
        okButtonProps: { danger: true },
        onOk() {
          navigateToRoute('software-product')
        }
      })
    } else {
      navigateToRoute('software-product')
    }
  }

  const handleSubmit = async (values) => {
    console.log('[SoftwareProductForm] Submitting form with values:', values)

    setSubmitting(true)
    try {
      // Transform team members to match Frappe table field format
      const transformedTeamMembers = teamMembers.map(member => ({
        member: member.member,
        role: member.role
      }))

      const formData = {
        ...values,
        start_date: values.start_date ? values.start_date.format('YYYY-MM-DD') : null,
        completion_date: values.completion_date ? values.completion_date.format('YYYY-MM-DD') : null,
        team_members: transformedTeamMembers
      }

      const endpoint = mode === 'create'
        ? '/api/method/frappe_devsecops_dashboard.api.software_product.create_product'
        : '/api/method/frappe_devsecops_dashboard.api.software_product.update_product'

      const payload = mode === 'create' ? formData : { name: productId, ...formData }

      console.log('[SoftwareProductForm] Making POST request to:', endpoint)
      console.log('[SoftwareProductForm] Payload:', payload)

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const result = data.message || data

      if (result.success || result.data) {
        // Show success message
        message.success(
          mode === 'create'
            ? 'Software Product created successfully!'
            : 'Software Product updated successfully!'
        )

        // Reset dirty state since we successfully saved
        setIsFormDirty(false)

        // Navigate back to list with a slight delay to show the message
        setTimeout(() => {
          navigateToRoute('software-product')
        }, 500)
      } else {
        throw new Error(result.error || 'Unknown error occurred')
      }
    } catch (error) {
      console.error('Error saving product:', error)

      let errorMessage = error.message || 'Failed to save Software Product'

      // Parse Frappe error messages
      if (error.message && error.message.includes('required')) {
        errorMessage = 'Please fill in all required fields'
      }

      message.error(errorMessage)
    } finally {
      setSubmitting(false)
    }
  }

  const teamMemberColumns = [
    {
      title: 'Team Member',
      dataIndex: 'member',
      key: 'member',
      render: (member) => {
        const user = userSearchResults.find(u => u.name === member)
        return (
          <Space>
            <UserOutlined style={{ color: getHeaderIconColor(token) }} />
            <span>{user?.full_name || member || '-'}</span>
          </Space>
        )
      }
    },
    {
      title: 'Role',
      dataIndex: 'role',
      key: 'role',
      render: (role) => role ? <Tag>{role}</Tag> : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditTeamMember(record)}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteTeamMember(record.id)}
          />
        </Space>
      )
    }
  ]

  if (loading) {
    return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '400px' }} />
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header - Gestalt: Proximity & Closure */}
      <Card
        style={{
          marginBottom: 24,
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
          ...getHeaderBannerStyle(token)
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleCancel}
                style={{ padding: '4px 8px' }}
              >
                Back to List
              </Button>
              <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 600, display: 'flex', alignItems: 'center' }}>
                <RocketOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                {mode === 'create' ? 'Create Software Product' : `Edit: ${product?.product_name || 'Product'}`}
              </Title>
            </Space>
          </Col>
          <Col>
            <Space>
              {mode === 'edit' && product?.zenhub_workspace_id && (
                <>
                  <Button
                    icon={<DashboardOutlined />}
                    onClick={fetchWorkspaceSummary}
                    size="large"
                  >
                    Workspace Summary
                  </Button>
                  <Button
                    type="primary"
                    icon={<BarChartOutlined />}
                    onClick={() => navigateToRoute('product-sprint-summary', null, null, productId || product?.name)}
                    size="large"
                  >
                    Sprint Summary
                  </Button>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Main Form - Gestalt: Visual Hierarchy & Similarity */}
      <Card
        bordered={false}
        style={{
          borderRadius: 12,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormChange}
          autoComplete="off"
        >
          {/* Product Manager - Prominent Position (Gestalt: Figure/Ground) */}
          <Card
            style={{
              marginBottom: 24,
              borderRadius: 12,
              background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f2ff 100%)',
              border: '1px solid #d6e4ff'
            }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} sm={16}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0050b3' }}>
                    Product Manager
                  </Text>
                  <Form.Item
                    name="product_manager"
                    style={{ marginBottom: 0 }}
                  >
                    <Select
                      placeholder="Select Product Manager"
                      showSearch
                      filterOption={false}
                      onSearch={handleUserSearch}
                      loading={searchLoading}
                      size="large"
                      options={userSearchResults.map(user => ({
                        label: (
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <Avatar size="small" style={{ backgroundColor: getHeaderIconColor(token) }}>
                              {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                            </Avatar>
                            <div>
                              <div style={{ fontWeight: 500 }}>{user.full_name}</div>
                              <div style={{ fontSize: '11px', color: token.colorTextSecondary }}>{user.email}</div>
                            </div>
                          </div>
                        ),
                        value: user.name
                      }))}
                      notFoundContent={searchLoading ? <Spin size="small" /> : 'Type to search users'}
                    />
                  </Form.Item>
                </Space>
              </Col>
              <Col xs={24} sm={8}>
                <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', border: '1px solid #d6e4ff' }}>
                  <Text type="secondary" style={{ fontSize: '11px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0050b3' }}>
                    Key Responsibility
                  </Text>
                  <div style={{ fontSize: '13px', color: '#666', marginTop: '8px' }}>
                    Overall product strategy, roadmap & delivery
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          {/* Basic Information & Status - Grouped by Similarity (Gestalt: Similarity) */}
          <Row gutter={[24, 24]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <RocketOutlined style={{ color: getHeaderIconColor(token) }} />
                    <span style={{ fontWeight: 600 }}>Basic Information</span>
                  </Space>
                }
                size="small"
                style={{ height: '100%', borderRadius: 8 }}
              >
                <Form.Item
                  label={<Text strong>Product Name</Text>}
                  name="product_name"
                  rules={[{ required: true, message: 'Please enter product name' }]}
                >
                  <Input
                    placeholder="e.g., Web Platform v2.0"
                    prefix={<RocketOutlined style={{ color: token.colorTextSecondary }} />}
                    size="large"
                  />
                </Form.Item>

                <Form.Item
                  label={<Text strong>Description</Text>}
                  name="description"
                  rules={[{ required: true, message: 'Please enter description' }]}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="Describe the product, its purpose, and key features..."
                    showCount
                    maxLength={1000}
                  />
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <ApiOutlined style={{ color: getHeaderIconColor(token) }} />
                      <Text strong>API Namespace</Text>
                    </Space>
                  }
                  name="api_namespace"
                  tooltip="API namespace for route generation (e.g., 'user-service', 'payment-gateway')"
                >
                  <Input
                    placeholder="e.g., user-service"
                    prefix={<ApiOutlined style={{ color: token.colorTextSecondary }} />}
                    size="large"
                  />
                </Form.Item>
              </Card>
            </Col>

            <Col xs={24} lg={12}>
              <Card
                title={
                  <Space>
                    <AppstoreOutlined style={{ color: getHeaderIconColor(token) }} />
                    <span style={{ fontWeight: 600 }}>Status & Version</span>
                  </Space>
                }
                size="small"
                style={{ height: '100%', borderRadius: 8 }}
              >
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label={<Text strong>Status</Text>}
                      name="status"
                      rules={[{ required: true, message: 'Please select status' }]}
                    >
                      <Select options={statusOptions} size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={<Text strong>Release Status</Text>}
                      name="release_status"
                      rules={[{ required: true, message: 'Please select release status' }]}
                    >
                      <Select options={releaseStatusOptions} size="large" />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label={<Text strong>Version</Text>}
                  name="version"
                  rules={[{ required: true, message: 'Please enter version' }]}
                >
                  <Input placeholder="e.g., 2.0" size="large" />
                </Form.Item>

                <Form.Item
                  label={
                    <Space>
                      <AppstoreOutlined style={{ color: getHeaderIconColor(token) }} />
                      <Text strong>Zenhub Workspace ID</Text>
                    </Space>
                  }
                  name="zenhub_workspace_id"
                  tooltip="The Zenhub workspace ID for tracking and integration"
                >
                  <Input
                    placeholder="e.g., Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="
                    size="large"
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label={<Text strong>Start Date</Text>}
                      name="start_date"
                    >
                      <DatePicker style={{ width: '100%' }} size="large" />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label={<Text strong>Expected Completion</Text>}
                      name="completion_date"
                    >
                      <DatePicker style={{ width: '100%' }} size="large" />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* Templates & Configuration - Grouped by Function (Gestalt: Proximity) */}
          <Card
            title={
              <Space>
                <FileTextOutlined style={{ color: getHeaderIconColor(token) }} />
                <span style={{ fontWeight: 600 }}>Templates & Configuration</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={
                    <Space>
                      <TeamOutlined style={{ color: getHeaderIconColor(token) }} />
                      <Text strong>Default RACI Template</Text>
                      <Text type="danger">*</Text>
                    </Space>
                  }
                  name="default_raci_template"
                  rules={[{ required: true, message: 'Please select a RACI template' }]}
                  tooltip="Select the default RACI template for this product. This will be used for projects linked to this product."
                >
                  <Select
                    size="large"
                    placeholder="Type to search RACI templates..."
                    options={raciTemplates}
                    allowClear
                    loading={loadingRaciTemplates}
                    showSearch
                    filterOption={false}
                    onSearch={handleRaciTemplateSearch}
                    suffixIcon={loadingRaciTemplates ? <LoadingOutlined spin /> : undefined}
                    notFoundContent={
                      loadingRaciTemplates ? (
                        <div style={{ textAlign: 'center', padding: '20px' }}>
                          <Spin size="small" />
                          <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextSecondary }}>
                            Searching templates...
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
                          <FileTextOutlined style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }} />
                          <div style={{ fontSize: '12px' }}>Type to search RACI templates</div>
                        </div>
                      )
                    }
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={
                    <Space>
                      <FolderOutlined style={{ color: getHeaderIconColor(token) }} />
                      <Text strong>Project Template</Text>
                    </Space>
                  }
                  name="project_template"
                  tooltip="Project template is read-only and will be auto-populated from the selected RACI template"
                >
                  <Select
                    size="large"
                    placeholder="Project template (read-only)"
                    options={projectTemplates}
                    disabled={true}
                    loading={loadingProjectTemplates}
                    suffixIcon={loadingProjectTemplates ? <LoadingOutlined spin /> : undefined}
                    notFoundContent={
                      <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
                        <FolderOutlined style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }} />
                        <div style={{ fontSize: '12px' }}>No project template available</div>
                      </div>
                    }
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Environment URLs - Grouped by Similarity (Gestalt: Similarity) */}
          <Card
            title={
              <Space>
                <RocketOutlined style={{ color: getHeaderIconColor(token) }} />
                <span style={{ fontWeight: 600 }}>Environment URLs</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 24, borderRadius: 8 }}
          >
            <Row gutter={[24, 0]}>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<Text strong>Production URL</Text>}
                  name="production_url"
                >
                  <Input
                    placeholder="https://prod.example.com"
                    type="url"
                    prefix={<RocketOutlined style={{ color: token.colorTextSecondary }} />}
                    size="large"
                  />
                </Form.Item>
              </Col>
              <Col xs={24} md={12}>
                <Form.Item
                  label={<Text strong>UAT URL</Text>}
                  name="uat_url"
                >
                  <Input
                    placeholder="https://uat.example.com"
                    type="url"
                    prefix={<RocketOutlined style={{ color: token.colorTextSecondary }} />}
                    size="large"
                  />
                </Form.Item>
              </Col>
            </Row>
          </Card>

          {/* Team Members Section - Gestalt: Closure */}
          <Card
            title={
              <Space>
                <TeamOutlined style={{ color: getHeaderIconColor(token) }} />
                <span style={{ fontWeight: 600 }}>Team Members</span>
              </Space>
            }
            size="small"
            style={{ marginBottom: 24, borderRadius: 8 }}
            extra={
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddTeamMember}
                size="large"
              >
                Add Member
              </Button>
            }
          >
            {teamMembers.length > 0 ? (
              <Table
                columns={teamMemberColumns}
                dataSource={teamMembers.map((m, i) => ({ ...m, key: m.id || i }))}
                pagination={false}
                size="small"
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', border: `1px dashed ${token.colorBorder}`, borderRadius: 8 }}>
                <TeamOutlined style={{ fontSize: '32px', color: token.colorTextSecondary, marginBottom: '12px', opacity: 0.5 }} />
                <div style={{ color: token.colorTextSecondary }}>No team members assigned yet</div>
                <Button
                  type="link"
                  icon={<PlusOutlined />}
                  onClick={handleAddTeamMember}
                  style={{ marginTop: '8px' }}
                >
                  Add your first team member
                </Button>
              </div>
            )}
          </Card>

          {/* Form Actions - Gestalt: Continuity */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px',
            paddingTop: '24px',
            borderTop: `1px solid ${token.colorBorderSecondary}`
          }}>
            <Button
              onClick={handleCancel}
              size="large"
              disabled={submitting}
              style={{ minWidth: '120px' }}
            >
              Cancel
            </Button>
            <Button
              type="primary"
              icon={<SaveOutlined />}
              htmlType="submit"
              loading={submitting}
              disabled={submitting}
              size="large"
              style={{ minWidth: '160px' }}
            >
              {mode === 'create' ? 'Create Product' : 'Update Product'}
            </Button>
          </div>
        </Form>
      </Card>

      {/* Team Member Modal */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `linear-gradient(135deg, ${getHeaderIconColor(token)} 0%, ${token.colorPrimaryHover} 100%)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TeamOutlined style={{ fontSize: '20px', color: '#fff' }} />
            </div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: '600', color: token.colorText }}>
                {editingTeamMember ? 'Edit Team Member' : 'Add Team Member'}
              </div>
              <div style={{ fontSize: '12px', color: token.colorTextSecondary, fontWeight: 'normal', marginTop: '2px' }}>
                {editingTeamMember ? 'Update team member details' : 'Add a new member to your product team'}
              </div>
            </div>
          </div>
        }
        open={showTeamModal}
        onOk={handleSaveTeamMember}
        onCancel={() => {
          setShowTeamModal(false)
          teamForm.resetFields()
        }}
        width={560}
        okText={editingTeamMember ? 'Update Member' : 'Add Member'}
        cancelText="Cancel"
        okButtonProps={{
          icon: <SaveOutlined />,
          size: 'large',
          style: { minWidth: '120px' }
        }}
        cancelButtonProps={{
          size: 'large'
        }}
        destroyOnClose
        styles={{
          header: {
            paddingBottom: '16px',
            marginBottom: '24px',
            borderBottom: `1px solid ${token.colorBorderSecondary}`
          },
          body: {
            paddingTop: '24px'
          }
        }}
      >
        <Form
          form={teamForm}
          layout="vertical"
          requiredMark="optional"
        >
          <div style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '20px'
          }}>
            <Form.Item
              label={
                <span style={{ fontSize: '13px', fontWeight: '600', color: token.colorText }}>
                  <UserOutlined style={{ marginRight: '6px', color: getHeaderIconColor(token) }} />
                  Team Member
                </span>
              }
              name="member"
              rules={[{ required: true, message: 'Please select a team member' }]}
              style={{ marginBottom: 0 }}
            >
              <Select
                placeholder="Type to search by name or email..."
                showSearch
                filterOption={false}
                onSearch={handleUserSearch}
                loading={searchLoading}
                size="large"
                suffixIcon={searchLoading ? <LoadingOutlined spin /> : undefined}
                getPopupContainer={(trigger) => trigger.parentNode}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                options={userSearchResults.map(user => ({
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <Avatar size="small" style={{ backgroundColor: getHeaderIconColor(token), flexShrink: 0 }}>
                        {user.full_name?.charAt(0)?.toUpperCase() || 'U'}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: '500', fontSize: '13px' }}>{user.full_name}</div>
                        <div style={{ fontSize: '11px', color: token.colorTextSecondary, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {user.email}
                        </div>
                      </div>
                    </div>
                  ),
                  value: user.name
                }))}
                notFoundContent={
                  searchLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin size="small" />
                      <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextSecondary }}>
                        Searching users...
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
                      <UserOutlined style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }} />
                      <div style={{ fontSize: '12px' }}>Type to search users</div>
                    </div>
                  )
                }
              />
            </Form.Item>
          </div>

          <div style={{
            background: token.colorBgContainer,
            border: `1px solid ${token.colorBorder}`,
            borderRadius: '8px',
            padding: '20px'
          }}>
            <Form.Item
              label={
                <span style={{ fontSize: '13px', fontWeight: '600', color: token.colorText }}>
                  <TeamOutlined style={{ marginRight: '6px', color: getHeaderIconColor(token) }} />
                  Role / Designation
                </span>
              }
              name="role"
              style={{ marginBottom: 0 }}
              tooltip="Assign a role or designation from your organization"
            >
              <Select
                placeholder="Type to search designations..."
                showSearch
                allowClear
                filterOption={false}
                onSearch={handleDesignationSearch}
                loading={designationSearchLoading}
                size="large"
                suffixIcon={designationSearchLoading ? <LoadingOutlined spin /> : undefined}
                getPopupContainer={(trigger) => trigger.parentNode}
                dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
                options={designations.map(d => ({
                  label: (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 0' }}>
                      <div style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: getHeaderIconColor(token),
                        flexShrink: 0
                      }} />
                      <span style={{ fontSize: '13px' }}>{d.designation_name || d.name}</span>
                    </div>
                  ),
                  value: d.name
                }))}
                notFoundContent={
                  designationSearchLoading ? (
                    <div style={{ textAlign: 'center', padding: '20px' }}>
                      <Spin size="small" />
                      <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextSecondary }}>
                        Loading designations...
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '20px', color: token.colorTextSecondary }}>
                      <TeamOutlined style={{ fontSize: '24px', marginBottom: '8px', opacity: 0.3 }} />
                      <div style={{ fontSize: '12px' }}>Type to search designations</div>
                    </div>
                  )
                }
              />
            </Form.Item>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '12px 16px',
            background: token.colorInfoBg,
            border: `1px solid ${token.colorInfoBorder}`,
            borderRadius: '6px',
            fontSize: '12px',
            color: token.colorTextSecondary,
            lineHeight: '1.6'
          }}>
            <strong style={{ color: token.colorText }}>Tip:</strong> Start typing in either field to search.
            Team members will have access to this product based on their assigned role.
          </div>
        </Form>
      </Modal>

      {/* Workspace Summary Modal */}
      <Modal
        title={
          <Space>
            <DashboardOutlined style={{ color: token.colorPrimary }} />
            <span>Workspace Summary</span>
            {workspaceSummary?.workspace?.name && (
              <Tag color="blue">{workspaceSummary.workspace.name}</Tag>
            )}
          </Space>
        }
        open={showWorkspaceSummary}
        onCancel={() => setShowWorkspaceSummary(false)}
        width={1000}
        footer={[
          <Button
            key="refresh"
            icon={<SyncOutlined />}
            onClick={fetchWorkspaceSummary}
            loading={loadingWorkspaceSummary}
          >
            Refresh
          </Button>,
          <Button key="close" type="primary" onClick={() => setShowWorkspaceSummary(false)}>
            Close
          </Button>
        ]}
        destroyOnClose
      >
        {loadingWorkspaceSummary ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <Spin size="large" tip="Loading workspace summary..." />
          </div>
        ) : workspaceSummary?.workspace ? (
          <div>
            {/* Summary Stats */}
            <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title="Total Issues"
                    value={workspaceSummary.workspace.summary?.total_issues || 0}
                    prefix={<DashboardOutlined />}
                    valueStyle={{ color: token.colorPrimary }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title="Total Story Points"
                    value={workspaceSummary.workspace.summary?.total_story_points || 0}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col xs={24} sm={8}>
                <Card size="small">
                  <Statistic
                    title="Completion Rate"
                    value={workspaceSummary.workspace.summary?.completion_rate || 0}
                    suffix="%"
                    valueStyle={{ color: workspaceSummary.workspace.summary?.completion_rate >= 70 ? '#52c41a' : '#faad14' }}
                  />
                </Card>
              </Col>
            </Row>

            {/* Team Members */}
            <Card
              size="small"
              title={
                <Space>
                  <TeamOutlined />
                  <span>Team Members ({workspaceSummary.workspace.team_members?.length || 0})</span>
                </Space>
              }
              style={{ marginBottom: 16 }}
            >
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {workspaceSummary.workspace.team_members?.map((member, index) => (
                  <Tag key={index} color="blue" style={{ padding: '4px 8px' }}>
                    <Space>
                      <UserOutlined />
                      {member.name || member.username || `Member ${index + 1}`}
                    </Space>
                  </Tag>
                )) || <Text type="secondary">No team members found</Text>}
              </div>
            </Card>

            {/* Projects */}
            <Card
              size="small"
              title={
                <Space>
                  <RocketOutlined />
                  <span>Projects ({workspaceSummary.workspace.projects?.length || 0})</span>
                </Space>
              }
            >
              {workspaceSummary.workspace.projects?.map((project, index) => (
                <div
                  key={index}
                  style={{
                    padding: '12px',
                    marginBottom: index < workspaceSummary.workspace.projects.length - 1 ? 8 : 0,
                    background: token.colorBgContainer,
                    borderRadius: 6,
                    border: `1px solid ${token.colorBorder}`
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <Text strong>{project.title || `Project ${index + 1}`}</Text>
                    <Tag>{project.id}</Tag>
                  </div>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {project.epics?.length || 0} Epics | {project.sprints?.length || 0} Sprints
                  </Text>
                </div>
              )) || <Text type="secondary">No projects found</Text>}
            </Card>

            {/* Kanban Statuses */}
            {workspaceSummary.workspace.kanban_statuses && (
              <Card
                size="small"
                title="Kanban Statuses"
                style={{ marginTop: 16 }}
              >
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                  {Object.entries(workspaceSummary.workspace.kanban_statuses).map(([name, id]) => (
                    <Tag key={id} color="purple">{name}</Tag>
                  ))}
                </div>
              </Card>
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '40px', color: token.colorTextSecondary }}>
            <DashboardOutlined style={{ fontSize: 48, marginBottom: 16, opacity: 0.3 }} />
            <div>No workspace data available</div>
          </div>
        )}
      </Modal>
    </div>
  )
}

export default SoftwareProductForm
