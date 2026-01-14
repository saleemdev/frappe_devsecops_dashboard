import { useState, useEffect } from 'react'
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
  BarChartOutlined
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

  // Workspace Summary Modal State
  const [showWorkspaceSummary, setShowWorkspaceSummary] = useState(false)
  const [workspaceSummary, setWorkspaceSummary] = useState(null)
  const [loadingWorkspaceSummary, setLoadingWorkspaceSummary] = useState(false)

  // Mock data for dropdowns (in a real app, these might come from API)
  const projectOptions = [
    { label: 'Portal App', value: 'Portal App' },
    { label: 'Mobile Project', value: 'Mobile Project' },
    { label: 'Backend Infra', value: 'Backend Infra' }
  ]

  const userOptions = [
    { label: 'John Doe', value: 'john-doe' },
    { label: 'Jane Smith', value: 'jane-smith' },
    { label: 'Mike Johnson', value: 'mike-johnson' },
    { label: 'Sarah Lee', value: 'sarah-lee' },
    { label: 'Tom Brown', value: 'tom-brown' }
  ]

  const businessRoles = [
    'Product Owner',
    'Tech Lead',
    'QA Lead',
    'Business Analyst',
    'DevOps Engineer',
    'Security Lead',
    'Stakeholder',
    'Architect'
  ]

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
        const user = userOptions.find(u => u.value === member)
        return (
          <Space>
            <UserOutlined style={{ color: getHeaderIconColor(token) }} />
            <span>{user?.label || member || '-'}</span>
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
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={handleCancel}
                style={{ paddingLeft: 0 }}
              >
                Back to List
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
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
                    Fetch Workspace Summary
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

      <Card bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
          onValuesChange={handleFormChange}
        >
          {/* Project Manager Header - Prominent Position */}
          <Card
            style={{
              marginBottom: '24px',
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f2ff 100%)',
              border: '1px solid #d6e4ff'
            }}
          >
            <Row gutter={[24, 24]} align="middle">
              <Col xs={24} sm={12}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text type="secondary" style={{ fontSize: '12px', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.5px', color: '#0050b3' }}>
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
                      options={userSearchResults.map(user => ({
                        label: user.full_name,
                        value: user.name
                      }))}
                      notFoundContent={searchLoading ? <Spin size="small" /> : 'Type to search users'}
                      style={{ fontSize: '16px', fontWeight: 500 }}
                    />
                  </Form.Item>
                </Space>
              </Col>
              <Col xs={24} sm={12}>
                <div style={{ padding: '16px', background: '#fff', borderRadius: '8px', textAlign: 'center', border: '1px solid #d6e4ff' }}>
                  <div style={{ fontSize: '12px', color: '#0050b3', fontWeight: '500', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Key Responsibility
                  </div>
                  <div style={{ fontSize: '14px', color: '#666' }}>
                    Overall product strategy, roadmap & delivery
                  </div>
                </div>
              </Col>
            </Row>
          </Card>

          <Row gutter={[24, 24]}>
            {/* Left Column */}
            <Col xs={24} md={12}>
              <Card title="Basic Information" size="small" style={{ height: '100%' }}>
                <Form.Item
                  label="Product Name"
                  name="product_name"
                  rules={[{ required: true, message: 'Please enter product name' }]}
                >
                  <Input placeholder="e.g., Web Platform v2.0" prefix={<RocketOutlined />} />
                </Form.Item>

                <Form.Item
                  label="Description"
                  name="description"
                  rules={[{ required: true, message: 'Please enter description' }]}
                >
                  <Input.TextArea rows={4} placeholder="Product description" />
                </Form.Item>
              </Card>
            </Col>

            {/* Right Column */}
            <Col xs={24} md={12}>
              <Card title="Status & Details" size="small" style={{ height: '100%' }}>
                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Status"
                      name="status"
                      rules={[{ required: true, message: 'Please select status' }]}
                    >
                      <Select options={statusOptions} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Release Status"
                      name="release_status"
                      rules={[{ required: true, message: 'Please select release status' }]}
                    >
                      <Select options={releaseStatusOptions} />
                    </Form.Item>
                  </Col>
                </Row>

                <Form.Item
                  label="Version"
                  name="version"
                  rules={[{ required: true, message: 'Please enter version' }]}
                >
                  <Input placeholder="e.g., 2.0" />
                </Form.Item>

                <Form.Item
                  label={
                    <span style={{ fontWeight: 600 }}>
                      <AppstoreOutlined style={{ marginRight: '6px', color: getHeaderIconColor(token) }} />
                      Zenhub Workspace ID
                    </span>
                  }
                  name="zenhub_workspace_id"
                  tooltip="The Zenhub workspace ID for tracking and integration. This enables workspace summary and sprint tracking features."
                >
                  <Input 
                    placeholder="e.g., Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY=" 
                    size="large"
                  />
                </Form.Item>

                <Row gutter={16}>
                  <Col span={12}>
                    <Form.Item
                      label="Start Date"
                      name="start_date"
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                  <Col span={12}>
                    <Form.Item
                      label="Expected Completion"
                      name="completion_date"
                    >
                      <DatePicker style={{ width: '100%' }} />
                    </Form.Item>
                  </Col>
                </Row>
              </Card>
            </Col>
          </Row>

          {/* Environment URLs */}
          <Divider orientation="left">
            <Space>
              <RocketOutlined />
              Environment URLs
            </Space>
          </Divider>

          <Row gutter={[24, 24]}>
            <Col xs={24} md={12}>
              <Card title="Production URL" size="small" style={{ height: '100%' }}>
                <Form.Item
                  label="Production URL"
                  name="production_url"
                >
                  <Input
                    placeholder="https://prod.example.com"
                    type="url"
                    prefix={<RocketOutlined />}
                  />
                </Form.Item>
              </Card>
            </Col>
            <Col xs={24} md={12}>
              <Card title="UAT URL" size="small" style={{ height: '100%' }}>
                <Form.Item
                  label="UAT URL"
                  name="uat_url"
                >
                  <Input
                    placeholder="https://uat.example.com"
                    type="url"
                    prefix={<RocketOutlined />}
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          {/* Team Members Section */}
          <Divider orientation="left">
            <Space>
              <TeamOutlined />
              Team Members
            </Space>
          </Divider>

          <Card size="small" style={{ marginBottom: '24px', background: '#fafafa' }}>
            <div style={{ marginBottom: '16px' }}>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleAddTeamMember}
              >
                Add Team Member
              </Button>
            </div>

            {teamMembers.length > 0 ? (
              <Table
                columns={teamMemberColumns}
                dataSource={teamMembers.map((m, i) => ({ ...m, key: m.id || i }))}
                pagination={false}
                size="small"
                style={{ background: '#fff' }}
              />
            ) : (
              <div style={{ padding: '32px', textAlign: 'center', background: '#fff', borderRadius: '4px', border: '1px dashed #d9d9d9' }}>
                <TeamOutlined style={{ fontSize: '24px', color: '#bfbfbf', marginBottom: '8px' }} />
                <div style={{ color: '#999' }}>No team members assigned yet</div>
              </div>
            )}

          </Card>

          {/* Form Actions */}
          <Form.Item>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <Button onClick={handleCancel} size="large" disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                htmlType="submit"
                loading={submitting}
                disabled={submitting}
                size="large"
              >
                {mode === 'create' ? 'Create Product' : 'Update Product'}
              </Button>
            </div>
          </Form.Item>
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
