import { useState, useEffect, useRef } from 'react'
import {
  Card,
  Form,
  Input,
  DatePicker,
  Select,
  Button,
  Row,
  Col,
  Space,
  message,
  Spin,
  Avatar,
  Divider,
  Modal,
  Typography,
  Tag,
  AutoComplete,
  Checkbox,
  Alert
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  EditOutlined,
  LockOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import useAuthStore from '../stores/authStore'
import projectsService from '../services/api/projects'
import { searchUsers, searchDesignations } from '../utils/projectAttachmentsApi'

const { Title, Text } = Typography

/**
 * ProjectCreateForm Component - Enhanced with Gestalt Principles
 * Professional UX/UI with visual hierarchy and auto-population
 */
function ProjectCreateForm({ navigateToRoute }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [projectTypes, setProjectTypes] = useState([])
  const [projectTemplates, setProjectTemplates] = useState([])
  const [departments, setDepartments] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [userSearchResults, setUserSearchResults] = useState([])
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null)
  const [addingUser, setAddingUser] = useState(false)
  const [searchLoading, setSearchLoading] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const [businessFunctionToAdd, setBusinessFunctionToAdd] = useState(null)
  const [showEditMemberModal, setShowEditMemberModal] = useState(false)
  const [memberBeingEdited, setMemberBeingEdited] = useState(null)
  const [editBusinessFunction, setEditBusinessFunction] = useState(null)
  const [editIsChangeApprover, setEditIsChangeApprover] = useState(false)
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const [designations, setDesignations] = useState([])
  const [designationSearchLoading, setDesignationSearchLoading] = useState(false)
  const [softwareProducts, setSoftwareProducts] = useState([])
  const [loadingSoftwareProducts, setLoadingSoftwareProducts] = useState(false)
  const [selectedSoftwareProduct, setSelectedSoftwareProduct] = useState(null)
  const [autoPopulatedData, setAutoPopulatedData] = useState(null)
  const [fetchingProductDetails, setFetchingProductDetails] = useState(false)
  const [raciTemplates, setRaciTemplates] = useState([])
  const [loadingRaciTemplates, setLoadingRaciTemplates] = useState(false)
  const userSearchTimeoutRef = useRef(null)
  const designationSearchTimeoutRef = useRef(null)

  const { hasPermission, isAuthenticated } = useAuthStore()
  const canWrite = isAuthenticated === true ? hasPermission('write:projects') : false

  // Route protection
  useEffect(() => {
    if (isAuthenticated === null) return
    if (isAuthenticated === false) return
    if (!canWrite) {
      message.error('You do not have permission to create projects')
      navigateToRoute('dashboard')
    }
  }, [isAuthenticated, canWrite, navigateToRoute])

  // Helper function to extract error message from various error formats
  const getErrorMessage = (error, defaultMessage = 'An error occurred') => {
    if (typeof error === 'string') return error
    if (error?.response?.data?.message) return error.response.data.message
    if (error?.response?.data?.error) return error.response.data.error
    if (error?.data?.message) return error.data.message
    if (error?.data?.error) return error.data.error
    if (error?.message) return error.message
    return defaultMessage
  }

  // Load project types, templates, departments, and designations
  useEffect(() => {
    const loadOptions = async () => {
      try {
        const [typesRes, templatesRes, deptsRes] = await Promise.all([
          fetch('/api/resource/Project Type', { credentials: 'include' }),
          fetch('/api/resource/Project Template', { credentials: 'include' }),
          fetch('/api/resource/Department', { credentials: 'include' })
        ])

        if (typesRes.ok) {
          const data = await typesRes.json()
          setProjectTypes((data.data || []).map(t => ({ label: t.name, value: t.name })))
        } else if (!typesRes.ok) {
          message.warning('Could not load project types')
        }

        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setProjectTemplates((data.data || []).map(t => ({ label: t.name, value: t.name })))
        } else if (!templatesRes.ok) {
          message.warning('Could not load project templates')
        }

        if (deptsRes.ok) {
          const data = await deptsRes.json()
          setDepartments((data.data || []).map(d => ({ label: d.name, value: d.name })))
        } else if (!deptsRes.ok) {
          message.warning('Could not load departments')
        }
      } catch (error) {
        console.error('Error loading options:', error)
        message.error('Failed to load project options. Please refresh the page.')
      }
    }

    loadOptions()
    loadDesignations()
    loadSoftwareProducts()
    loadRaciTemplates()
  }, [])

  // Load Software Products
  const loadSoftwareProducts = async () => {
    try {
      setLoadingSoftwareProducts(true)
      const response = await fetch('/api/method/frappe_devsecops_dashboard.api.software_product.get_products?fields=["name","product_name"]&limit_page_length=100', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.message || data
        if (result.success && result.data) {
          setSoftwareProducts(result.data.map(p => ({
            label: p.product_name,
            value: p.name
          })))
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = getErrorMessage(errorData, 'Failed to load software products')
        message.error(errorMsg)
      }
    } catch (error) {
      console.error('[ProjectCreateForm] Error loading software products:', error)
      const errorMsg = getErrorMessage(error, 'Failed to load software products')
      message.error(errorMsg)
    } finally {
      setLoadingSoftwareProducts(false)
    }
  }

  // Load RACI Templates
  const loadRaciTemplates = async () => {
    try {
      setLoadingRaciTemplates(true)
      const response = await fetch('/api/method/frappe_devsecops_dashboard.api.raci_template.get_raci_templates?fields=["name","template_name"]&limit_page_length=100', {
        credentials: 'include',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        }
      })

      if (response.ok) {
        const data = await response.json()
        const result = data.message || data
        if (result.success && result.data) {
          setRaciTemplates(result.data.map(t => ({
            label: t.template_name || t.name,
            value: t.name
          })))
        }
      } else {
        const errorData = await response.json().catch(() => ({}))
        const errorMsg = getErrorMessage(errorData, 'Failed to load RACI templates')
        message.error(errorMsg)
      }
    } catch (error) {
      console.error('[ProjectCreateForm] Error loading RACI templates:', error)
      const errorMsg = getErrorMessage(error, 'Failed to load RACI templates')
      message.error(errorMsg)
    } finally {
      setLoadingRaciTemplates(false)
    }
  }

  // Fetch Software Product details and auto-populate RACI and template
  const handleSoftwareProductChange = async (productName) => {
    setSelectedSoftwareProduct(productName)

    if (!productName) {
      setAutoPopulatedData(null)
      form.setFieldValue('project_template', null)
      form.setFieldValue('custom_default_raci_template', null)
      setSelectedTemplate(null)
      setTeamMembers([])
      return
    }

    try {
      setFetchingProductDetails(true)
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.software_product.get_product_detail?name=${encodeURIComponent(productName)}`,
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
          const productData = result.data
          const autoData = {}
          let populatedCount = 0

          // Auto-populate RACI Template
          if (productData.default_raci_template) {
            autoData.raciTemplate = productData.default_raci_template
            form.setFieldValue('custom_default_raci_template', productData.default_raci_template)
            populatedCount++
          }

          // Auto-populate Project Template from RACI Template
          if (productData.project_template) {
            form.setFieldValue('project_template', productData.project_template)
            setSelectedTemplate(productData.project_template)
            autoData.projectTemplate = productData.project_template
            populatedCount++
          }

          // Auto-populate Team Members from Software Product
          if (productData.team_members && Array.isArray(productData.team_members) && productData.team_members.length > 0) {
            const mappedMembers = productData.team_members.map(tm => ({
              user: tm.member,
              full_name: tm.member_full_name || tm.member,
              email: tm.member_email || '',
              image: tm.member_user_image || '',
              custom_business_function: tm.role || null,
              custom_is_change_approver: 0
            }))

            setTeamMembers(mappedMembers)
            autoData.teamMembers = mappedMembers.length
            populatedCount++
          }

          setAutoPopulatedData(autoData)

          // Show single consolidated success message
          if (populatedCount > 0) {
            const items = []
            if (autoData.raciTemplate) items.push('RACI Template')
            if (autoData.projectTemplate) items.push('Project Template')
            if (autoData.teamMembers) items.push(`${autoData.teamMembers} Team Members`)

            message.success({
              content: `Auto-populated: ${items.join(', ')}`,
              duration: 4
            })
          }
        }
      }
    } catch (error) {
      console.error('[ProjectCreateForm] Error fetching product details:', error)
      const errorMsg = getErrorMessage(error, 'Failed to fetch product details')
      message.error(errorMsg)
    } finally {
      setFetchingProductDetails(false)
    }
  }

  const loadDesignations = async (query = '') => {
    try {
      setDesignationSearchLoading(true)
      const response = await searchDesignations(query)
      if (response.success) {
        setDesignations(response.designations || [])
      } else {
        setDesignations([])
      }
    } catch (error) {
      console.error('[ProjectCreateForm] Error loading designations:', error)
      setDesignations([])
      // Don't show error for designation loading as it's not critical
    } finally {
      setDesignationSearchLoading(false)
    }
  }

  const handleDesignationSearch = (value) => {
    if (designationSearchTimeoutRef.current) {
      clearTimeout(designationSearchTimeoutRef.current)
    }

    designationSearchTimeoutRef.current = setTimeout(() => {
      loadDesignations(value)
    }, 400)
  }

  // Debounced user search
  const handleUserSearch = (value) => {
    if (userSearchTimeoutRef.current) {
      clearTimeout(userSearchTimeoutRef.current)
    }

    if (!value || value.length < 2) {
      setUserSearchResults([])
      setIsDebouncing(false)
      return
    }

    setIsDebouncing(true)
    userSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true)
        const response = await searchUsers(value)
        const users = response.message?.users || response.users || []
        setUserSearchResults(users)
      } catch (error) {
        console.error('[ProjectCreateForm] Error searching users:', error)
        setUserSearchResults([])
        // Don't show error toast for user search as it's non-blocking
      } finally {
        setSearchLoading(false)
        setIsDebouncing(false)
      }
    }, 400)
  }

  // Add team member
  const handleAddTeamMember = async () => {
    if (!selectedUserToAdd) {
      message.warning('Please select a user')
      return
    }

    if (teamMembers.some(m => m.user === selectedUserToAdd)) {
      message.warning('User is already added to the team')
      return
    }

    try {
      setAddingUser(true)
      const user = userSearchResults.find(u => u.name === selectedUserToAdd)

      if (user) {
        const newMember = {
          user: user.name,
          email: user.email,
          full_name: user.full_name,
          image: user.user_image,
          custom_is_change_approver: 0
        }
        if (businessFunctionToAdd) {
          newMember.custom_business_function = businessFunctionToAdd
        }
        setTeamMembers([...teamMembers, newMember])
        setSelectedUserToAdd(null)
        setBusinessFunctionToAdd(null)
        setUserSearchResults([])
        message.success('Team member added')
      }
    } finally {
      setAddingUser(false)
    }
  }

  // Remove team member
  const handleRemoveTeamMember = (userId) => {
    setTeamMembers(teamMembers.filter(m => m.user !== userId))
    message.success('Team member removed')
  }

  // Edit team member
  const handleEditMember = (member) => {
    setMemberBeingEdited(member)
    setEditBusinessFunction(member.custom_business_function || null)
    setEditIsChangeApprover(member.custom_is_change_approver === 1)
    setShowEditMemberModal(true)
  }

  // Save edited team member
  const handleSaveMemberEdit = () => {
    if (!memberBeingEdited) return
    const updatedMembers = teamMembers.map(m =>
      m.user === memberBeingEdited.user
        ? {
            ...m,
            custom_business_function: editBusinessFunction || undefined,
            custom_is_change_approver: editIsChangeApprover ? 1 : 0
          }
        : m
    )
    setTeamMembers(updatedMembers)
    setShowEditMemberModal(false)
    setMemberBeingEdited(null)
    setEditBusinessFunction(null)
    setEditIsChangeApprover(false)
    message.success('Team member updated')
  }

  // Handle form submission
  const handleSubmit = async (values) => {
    try {
      setLoading(true)

      // Validate dates
      if (values.expected_end_date.isBefore(values.expected_start_date)) {
        message.error('End date must be after start date')
        return
      }

      // Prepare project data
      const projectData = {
        project_name: values.project_name,
        project_type: values.project_type,
        expected_start_date: values.expected_start_date.format('YYYY-MM-DD'),
        expected_end_date: values.expected_end_date.format('YYYY-MM-DD'),
        priority: values.priority || 'Medium',
        team_members: teamMembers.map(m => {
          const memberData = {
            user: m.user
          }
          if (m.custom_business_function) {
            memberData.custom_business_function = m.custom_business_function
          }
          memberData.custom_is_change_approver = m.custom_is_change_approver || 0
          return memberData
        })
      }

      if (values.department) {
        projectData.department = values.department
      }

      if (values.notes) {
        projectData.notes = values.notes
      }

      if (selectedTemplate) {
        projectData.project_template = selectedTemplate
      }

      if (values.custom_software_product) {
        projectData.custom_software_product = values.custom_software_product
      }

      if (values.custom_default_raci_template) {
        projectData.custom_default_raci_template = values.custom_default_raci_template
      }

      // Create project
      const response = await projectsService.createProject(projectData)

      if (response.status === 200 && response.data?.success) {
        const projectId = response.data?.project_id

        await Swal.fire({
          icon: 'success',
          title: 'Project Created',
          text: `Project "${values.project_name}" has been created successfully`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })

        if (projectId) {
          navigateToRoute('project-detail', projectId)
        } else {
          message.error('Project created but could not navigate to detail page')
        }
      } else {
        // Extract error message from response
        const errorMsg = response.message || response.data?.error || response.data?.message || 'Failed to create project'
        console.error('Project creation failed:', response)
        message.error(errorMsg)
      }
    } catch (error) {
      console.error('Error creating project:', error)
      // Extract user-friendly error message
      const errorMsg = getErrorMessage(error, 'An error occurred while creating the project')
      message.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header - Proximity Principle */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigateToRoute('dashboard')}
            style={{ padding: '4px 8px' }}
          >
            Back to Dashboard
          </Button>
          <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>
            Create New Project
          </Title>
          <Text type="secondary">
            Configure your project details and build your team
          </Text>
        </Space>
      </Card>

      {/* Form Layout - Visual Hierarchy */}
      <Row gutter={[24, 24]}>
        {/* Main Form - 2/3 width for emphasis */}
        <Col xs={24} lg={16}>
          <Form
            form={form}
            layout="vertical"
            onFinish={handleSubmit}
            autoComplete="off"
          >
            {/* PRIMARY SECTION - Software Product (Most Prominent) */}
            <Card
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.15)',
                border: '2px solid #1890ff'
              }}
            >
              <Space direction="vertical" size="middle" style={{ width: '100%' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div
                    style={{
                      width: '48px',
                      height: '48px',
                      borderRadius: '12px',
                      background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
                    }}
                  >
                    <InfoCircleOutlined style={{ fontSize: '24px', color: '#fff' }} />
                  </div>
                  <div>
                    <Title level={4} style={{ margin: 0, fontSize: '18px' }}>
                      Software Product
                    </Title>
                    <Text type="secondary" style={{ fontSize: '13px' }}>
                      Select a product to auto-populate RACI template, project template, and team members
                    </Text>
                  </div>
                </div>

                <Form.Item
                  name="custom_software_product"
                  style={{ marginBottom: 0 }}
                >
                  <Select
                    size="large"
                    placeholder="Select a software product (optional but recommended)"
                    options={softwareProducts}
                    allowClear
                    loading={loadingSoftwareProducts}
                    showSearch
                    onChange={handleSoftwareProductChange}
                    filterOption={(input, option) =>
                      (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                    }
                    suffixIcon={fetchingProductDetails ? <Spin size="small" /> : undefined}
                    style={{ fontSize: '15px' }}
                  />
                </Form.Item>

                {autoPopulatedData && (
                  <Alert
                    message="Auto-populated from Software Product"
                    description={
                      <div>
                        {autoPopulatedData.raciTemplate && (
                          <div style={{ marginBottom: '4px' }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                            RACI Template: <strong>{autoPopulatedData.raciTemplate}</strong>
                          </div>
                        )}
                        {autoPopulatedData.projectTemplate && (
                          <div style={{ marginBottom: '4px' }}>
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                            Project Template: <strong>{autoPopulatedData.projectTemplate}</strong>
                          </div>
                        )}
                        {autoPopulatedData.teamMembers && (
                          <div>
                            <CheckCircleOutlined style={{ color: '#52c41a', marginRight: '8px' }} />
                            Team Members: <strong>{autoPopulatedData.teamMembers} members added</strong>
                          </div>
                        )}
                      </div>
                    }
                    type="success"
                    showIcon
                    style={{ marginTop: '12px' }}
                  />
                )}
              </Space>
            </Card>

            {/* SECONDARY SECTION - Core Project Details */}
            <Card
              title={
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div
                    style={{
                      width: '8px',
                      height: '24px',
                      borderRadius: '4px',
                      background: 'linear-gradient(180deg, #52c41a 0%, #389e0d 100%)'
                    }}
                  />
                  <Text strong style={{ fontSize: '16px' }}>Project Information</Text>
                </div>
              }
              style={{
                marginBottom: '24px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}
            >
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                {/* Project Name - Most important field */}
                <Form.Item
                  label={<Text strong style={{ fontSize: '14px' }}>Project Name</Text>}
                  name="project_name"
                  rules={[
                    { required: true, message: 'Project name is required' },
                    { min: 3, message: 'Project name must be at least 3 characters' }
                  ]}
                >
                  <Input
                    size="large"
                    placeholder="Enter a descriptive project name"
                    style={{ fontSize: '15px' }}
                  />
                </Form.Item>

                {/* Project Type and Template - Grouped by similarity */}
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: '14px' }}>Project Type</Text>}
                      name="project_type"
                      rules={[{ required: true, message: 'Project type is required' }]}
                    >
                      <Select
                        size="large"
                        placeholder="Select type"
                        options={projectTypes}
                        loading={projectTypes.length === 0}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: '14px' }}>Project Template</Text>}
                      name="project_template"
                      tooltip="Auto-populated from Software Product, or select manually"
                    >
                      <Select
                        size="large"
                        placeholder="Select template"
                        options={projectTemplates}
                        allowClear
                        onChange={setSelectedTemplate}
                        value={selectedTemplate}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* RACI Template - Full width for prominence */}
                <Row gutter={16}>
                  <Col xs={24}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: '14px' }}>Default RACI Template</Text>}
                      name="custom_default_raci_template"
                      tooltip="Auto-populated from Software Product, or select manually"
                    >
                      <Select
                        size="large"
                        placeholder="Select RACI template (optional)"
                        options={raciTemplates}
                        allowClear
                        loading={loadingRaciTemplates}
                        showSearch
                        filterOption={(input, option) =>
                          (option?.label ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Dates - Grouped by temporal relationship */}
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: '14px' }}>Start Date</Text>}
                      name="expected_start_date"
                      rules={[{ required: true, message: 'Start date is required' }]}
                    >
                      <DatePicker
                        size="large"
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: '14px' }}>End Date</Text>}
                      name="expected_end_date"
                      rules={[{ required: true, message: 'End date is required' }]}
                    >
                      <DatePicker
                        size="large"
                        style={{ width: '100%' }}
                        format="YYYY-MM-DD"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Priority and Department - Grouped by administrative function */}
                <Row gutter={16}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: '14px' }}>Priority</Text>}
                      name="priority"
                      initialValue="Medium"
                    >
                      <Select
                        size="large"
                        options={[
                          { label: '🔴 High', value: 'High' },
                          { label: '🟡 Medium', value: 'Medium' },
                          { label: '🟢 Low', value: 'Low' }
                        ]}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label={<Text strong style={{ fontSize: '14px' }}>Department</Text>}
                      name="department"
                    >
                      <Select
                        size="large"
                        placeholder="Select department"
                        options={departments}
                        allowClear
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Notes - Full width for continuity */}
                <Form.Item
                  label={<Text strong style={{ fontSize: '14px' }}>Project Notes</Text>}
                  name="notes"
                >
                  <Input.TextArea
                    placeholder="Add project description, objectives, or important notes..."
                    rows={4}
                    style={{ fontSize: '14px' }}
                  />
                </Form.Item>
              </Space>
            </Card>

            {/* Submit Button - Strong visual closure */}
            <Button
              type="primary"
              htmlType="submit"
              icon={<SaveOutlined />}
              loading={loading}
              block
              size="large"
              style={{
                height: '48px',
                fontSize: '16px',
                fontWeight: 600,
                borderRadius: '8px',
                boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)'
              }}
            >
              Create Project
            </Button>
          </Form>
        </Col>

        {/* Team Members Sidebar - 1/3 width, complementary */}
        <Col xs={24} lg={8}>
          <Card
            title={
              <div>
                <Text strong style={{ fontSize: '16px' }}>Team Members</Text>
                <div style={{ marginTop: '4px' }}>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    {teamMembers.length} member{teamMembers.length !== 1 ? 's' : ''} added
                  </Text>
                </div>
              </div>
            }
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              position: 'sticky',
              top: '24px'
            }}
          >
            {/* Add User Section */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#fafafa', borderRadius: '8px' }}>
              <Text type="secondary" strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Add Team Member
              </Text>
              <Input
                placeholder="Search user (min 2 chars)..."
                onChange={(e) => handleUserSearch(e.target.value)}
                style={{ marginTop: '12px', marginBottom: '12px' }}
              />
              {isDebouncing && (
                <div style={{ textAlign: 'center', padding: '12px', color: '#8c8c8c' }}>
                  <Spin size="small" style={{ marginRight: '8px' }} />
                  <Text type="secondary" style={{ fontSize: '12px' }}>Searching...</Text>
                </div>
              )}
              {!isDebouncing && userSearchResults.length > 0 && (
                <div style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: '6px',
                  maxHeight: '180px',
                  overflowY: 'auto',
                  marginBottom: '12px',
                  backgroundColor: '#fff'
                }}>
                  {userSearchResults.map(user => (
                    <div
                      key={user.name}
                      onClick={() => setSelectedUserToAdd(user.name)}
                      style={{
                        padding: '10px 12px',
                        cursor: 'pointer',
                        backgroundColor: selectedUserToAdd === user.name ? '#e6f7ff' : 'transparent',
                        borderBottom: '1px solid #f0f0f0',
                        transition: 'background-color 0.2s'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Avatar size="small" src={user.user_image} icon={<UserOutlined />} />
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 500 }}>{user.full_name}</div>
                          <div style={{ fontSize: '11px', color: '#8c8c8c' }}>{user.email}</div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <AutoComplete
                allowClear
                placeholder="Designation (optional)"
                value={businessFunctionToAdd}
                onChange={setBusinessFunctionToAdd}
                onSearch={handleDesignationSearch}
                options={designations.map(d => ({
                  label: d.designation_name || d.name,
                  value: d.name
                }))}
                style={{ width: '100%', marginBottom: '12px' }}
                filterOption={false}
                notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
              />
              <Button
                type="primary"
                block
                icon={<PlusOutlined />}
                onClick={handleAddTeamMember}
                loading={addingUser}
                disabled={!selectedUserToAdd}
              >
                Add Member
              </Button>
            </div>

            <Divider style={{ margin: '16px 0' }} />

            {/* Team Members List */}
            <div>
              <Text type="secondary" strong style={{ fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Team ({teamMembers.length})
              </Text>
              <div style={{ marginTop: '16px' }}>
                {teamMembers.length > 0 ? (
                  <Space direction="vertical" size="small" style={{ width: '100%' }}>
                    {teamMembers.map((member) => (
                      <div key={member.user} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px',
                        backgroundColor: '#fafafa',
                        borderRadius: '8px',
                        border: '1px solid #f0f0f0'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
                          <Avatar src={member.image} icon={<UserOutlined />} size={36} />
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                              <Text strong style={{ fontSize: '13px' }}>{member.full_name}</Text>
                              {member.custom_is_change_approver === 1 && (
                                <Tag color="green" style={{ margin: 0, fontSize: '10px', padding: '0 6px' }}>
                                  <LockOutlined style={{ fontSize: '9px', marginRight: '3px' }} />
                                  Approver
                                </Tag>
                              )}
                            </div>
                            <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                              {member.email}
                            </Text>
                            {member.custom_business_function && (
                              <Tag color="blue" style={{ marginTop: '6px', fontSize: '11px' }}>
                                {member.custom_business_function}
                              </Tag>
                            )}
                          </div>
                        </div>
                        <Space size="small">
                          <Button
                            type="text"
                            size="small"
                            icon={<EditOutlined />}
                            onClick={() => handleEditMember(member)}
                          />
                          <Button
                            type="text"
                            danger
                            size="small"
                            icon={<DeleteOutlined />}
                            onClick={() => handleRemoveTeamMember(member.user)}
                          />
                        </Space>
                      </div>
                    ))}
                  </Space>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '32px 16px',
                    backgroundColor: '#fafafa',
                    borderRadius: '8px',
                    border: '2px dashed #d9d9d9'
                  }}>
                    <UserOutlined style={{ fontSize: '32px', color: '#d9d9d9', marginBottom: '12px' }} />
                    <Text type="secondary" style={{ display: 'block', fontSize: '13px' }}>
                      No team members yet
                    </Text>
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      Search and add members above
                    </Text>
                  </div>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Edit Team Member Modal */}
      <Modal
        title={memberBeingEdited ? `Edit — ${memberBeingEdited.full_name}` : 'Edit Team Member'}
        open={showEditMemberModal}
        onCancel={() => {
          setShowEditMemberModal(false)
          setMemberBeingEdited(null)
          setEditBusinessFunction(null)
          setEditIsChangeApprover(false)
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowEditMemberModal(false)
            setMemberBeingEdited(null)
            setEditBusinessFunction(null)
            setEditIsChangeApprover(false)
          }}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveMemberEdit}>
            Save Changes
          </Button>
        ]}
      >
        <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <div>
            <Text strong style={{ display: 'block', marginBottom: '8px' }}>Designation</Text>
            <AutoComplete
              allowClear
              placeholder="Search designation"
              value={editBusinessFunction}
              onChange={setEditBusinessFunction}
              onSearch={handleDesignationSearch}
              options={designations.map(d => ({
                label: d.designation_name || d.name,
                value: d.name
              }))}
              style={{ width: '100%' }}
              filterOption={false}
              notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
            />
          </div>
          <div>
            <Checkbox
              checked={editIsChangeApprover}
              onChange={(e) => setEditIsChangeApprover(e.target.checked)}
            >
              <Space>
                <LockOutlined />
                <Text strong>Change Approver</Text>
              </Space>
            </Checkbox>
            <div style={{ marginTop: '8px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Change approvers can approve change requests for this project
              </Text>
            </div>
          </div>
        </Space>
      </Modal>
    </div>
  )
}

export default ProjectCreateForm
