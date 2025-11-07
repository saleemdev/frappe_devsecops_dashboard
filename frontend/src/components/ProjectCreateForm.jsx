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
  Table,
  Modal,
  Typography,
  Alert,
  Tag
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  EditOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import useAuthStore from '../stores/authStore'
import projectsService from '../services/api/projects'
import { searchUsers } from '../utils/projectAttachmentsApi'

const { Title, Text } = Typography

const BUSINESS_FUNCTION_OPTIONS = [
  'Internal Stakeholder',
  'Client Stakeholder',
  'Client Focal Person',
  'Project Manager',
  'Engineering Lead',
  'Security Analyst',
  'Platform Engineer',
  'DevOps Engineer',
  'Software Reliability Engineer',
  'Software Developer',
  'Product Designer',
  'Business Analyst',
  'Solution Architect',
  'Product Manager',
  'Service Delivery Contact',
  'Quality Assurance',
  'Subject Matter Expert'
]

/**
 * ProjectCreateForm Component
 * Allows users to create new projects with team members
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
  const [selectedTemplate, setSelectedTemplate] = useState(null)
  const userSearchTimeoutRef = useRef(null)

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

  // Load project types, templates, and departments
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
        }

        if (templatesRes.ok) {
          const data = await templatesRes.json()
          setProjectTemplates((data.data || []).map(t => ({ label: t.name, value: t.name })))
        }

        if (deptsRes.ok) {
          const data = await deptsRes.json()
          setDepartments((data.data || []).map(d => ({ label: d.name, value: d.name })))
        }
      } catch (error) {
        console.error('Error loading options:', error)
      }
    }

    loadOptions()
  }, [])

  // Debounced user search
  const handleUserSearch = (value) => {
    if (userSearchTimeoutRef.current) {
      clearTimeout(userSearchTimeoutRef.current)
    }

    if (!value || value.length < 2) {
      console.log('[ProjectCreateForm] Search cleared - value too short:', value?.length)
      setUserSearchResults([])
      setIsDebouncing(false)
      return
    }

    console.log('[ProjectCreateForm] Starting debounced search for:', value)
    setIsDebouncing(true)
    userSearchTimeoutRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true)
        console.log('[ProjectCreateForm] Executing search API call for:', value)
        const response = await searchUsers(value)
        console.log('[ProjectCreateForm] Search response received:', response)

        // Extract users from response - API returns {success: true, users: [...]}
        const users = response.message?.users || response.users || []
        console.log('[ProjectCreateForm] Extracted users:', users)

        setUserSearchResults(users)
      } catch (error) {
        console.error('[ProjectCreateForm] Error searching users:', error)
        setUserSearchResults([])
      } finally {
        setSearchLoading(false)
        setIsDebouncing(false)
      }
    }, 400)
  }

  // Add team member
  const handleAddTeamMember = async () => {
    console.log('[ProjectCreateForm] handleAddTeamMember called, selectedUserToAdd:', selectedUserToAdd)

    if (!selectedUserToAdd) {
      message.warning('Please select a user')
      return
    }

    // Check if user already added
    if (teamMembers.some(m => m.user === selectedUserToAdd)) {
      message.warning('User is already added to the team')
      return
    }

    try {
      setAddingUser(true)
      const user = userSearchResults.find(u => u.name === selectedUserToAdd)
      console.log('[ProjectCreateForm] Found user:', user)

      if (user) {
        const newMember = {
          user: user.name,
          email: user.email,
          full_name: user.full_name,
          image: user.user_image
        }
        if (businessFunctionToAdd) {
          newMember.custom_business_function = businessFunctionToAdd
        }
        console.log('[ProjectCreateForm] Adding new member:', newMember)
        setTeamMembers([...teamMembers, newMember])
        setSelectedUserToAdd(null)
        setBusinessFunctionToAdd(null)
        setUserSearchResults([])
        message.success('Team member added')
      } else {
        console.warn('[ProjectCreateForm] User not found in search results')
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

  // Edit team member business function
  const handleEditMember = (member) => {
    setMemberBeingEdited(member)
    setEditBusinessFunction(member.custom_business_function || null)
    setShowEditMemberModal(true)
  }

  // Save edited team member
  const handleSaveMemberEdit = () => {
    if (!memberBeingEdited) return
    const updatedMembers = teamMembers.map(m =>
      m.user === memberBeingEdited.user
        ? { ...m, custom_business_function: editBusinessFunction || undefined }
        : m
    )
    setTeamMembers(updatedMembers)
    setShowEditMemberModal(false)
    setMemberBeingEdited(null)
    setEditBusinessFunction(null)
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
          // Include custom_business_function if set
          if (m.custom_business_function) {
            memberData.custom_business_function = m.custom_business_function
          }
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

      // Create project
      const response = await projectsService.createProject(projectData)

      if (response.status === 200 && response.data?.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Project Created',
          text: `Project "${values.project_name}" has been created successfully`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })

        // Navigate to project detail (use route helper so hash and state are set consistently)
        console.log('[ProjectCreateForm] Created project, navigating to detail:', response?.data?.project_id)
        navigateToRoute('project-detail', response.data.project_id)
      } else {
        message.error(response.message || 'Failed to create project')
      }
    } catch (error) {
      console.error('Error creating project:', error)
      message.error(error.message || 'An error occurred while creating the project')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Card style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('dashboard')}
              >
                Back to Dashboard
              </Button>
              <Title level={2} style={{ margin: 0 }}>Create New Project</Title>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Form */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              {/* Project Name */}
              <Form.Item
                label="Project Name"
                name="project_name"
                rules={[
                  { required: true, message: 'Project name is required' },
                  { min: 3, message: 'Project name must be at least 3 characters' }
                ]}
              >
                <Input placeholder="Enter project name" />
              </Form.Item>

              {/* Project Type */}
              <Form.Item
                label="Project Type"
                name="project_type"
                rules={[{ required: true, message: 'Project type is required' }]}
              >
                <Select
                  placeholder="Select project type"
                  options={projectTypes}
                  loading={projectTypes.length === 0}
                />
              </Form.Item>

              {/* Project Template */}
              <Form.Item
                label="Project Template (Optional)"
                name="project_template"
              >
                <Select
                  placeholder="Select a template to auto-populate tasks"
                  options={projectTemplates}
                  allowClear
                  onChange={setSelectedTemplate}
                  value={selectedTemplate}
                />
              </Form.Item>

              {/* Dates */}
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Expected Start Date"
                    name="expected_start_date"
                    rules={[{ required: true, message: 'Start date is required' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Expected End Date"
                    name="expected_end_date"
                    rules={[{ required: true, message: 'End date is required' }]}
                  >
                    <DatePicker style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              {/* Priority and Department */}
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Priority"
                    name="priority"
                    initialValue="Medium"
                  >
                    <Select
                      options={[
                        { label: 'Low', value: 'Low' },
                        { label: 'Medium', value: 'Medium' },
                        { label: 'High', value: 'High' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Department"
                    name="department"
                  >
                    <Select
                      placeholder="Select department (optional)"
                      options={departments}
                      allowClear
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Notes */}
              <Form.Item
                label="Project Notes"
                name="notes"
              >
                <Input.TextArea
                  placeholder="Enter project notes or description (optional)"
                  rows={4}
                />
              </Form.Item>

              {/* Submit Button */}
              <Form.Item>
                <Button
                  type="primary"
                  htmlType="submit"
                  icon={<SaveOutlined />}
                  loading={loading}
                  block
                >
                  Create Project
                </Button>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Team Members Sidebar */}
        <Col xs={24} lg={8}>
          <Card title="Team Members" style={{ height: '100%' }}>
            {/* Add User Section */}
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>ADD TEAM MEMBER</Text>
              <Input
                placeholder="Search user (min 2 characters)..."
                onChange={(e) => handleUserSearch(e.target.value)}
                style={{ marginTop: '8px', marginBottom: '8px' }}
              />
              {isDebouncing && (
                <div style={{ textAlign: 'center', padding: '8px', color: '#8c8c8c' }}>
                  <Spin size="small" style={{ marginRight: '4px' }} />
                  Searching...
                </div>
              )}
              {!isDebouncing && userSearchResults.length > 0 && (
                <div style={{
                  border: '1px solid #d9d9d9',
                  borderRadius: '4px',
                  maxHeight: '150px',
                  overflowY: 'auto',
                  marginBottom: '8px'
                }}>
                  {userSearchResults.map(user => (
                    <div
                      key={user.name}
                      onClick={() => setSelectedUserToAdd(user.name)}
                      style={{
                        padding: '8px',
                        cursor: 'pointer',
                        backgroundColor: selectedUserToAdd === user.name ? '#e6f7ff' : 'transparent',
                        borderBottom: '1px solid #f0f0f0'
                      }}
                    >
                      <Text style={{ fontSize: '12px' }}>{user.full_name}</Text>
                    </div>
                  ))}
                </div>
              )}
              <Select
                allowClear
                placeholder="Business function (optional)"
                value={businessFunctionToAdd}
                onChange={setBusinessFunctionToAdd}
                style={{ width: '100%', marginBottom: '8px' }}
                options={BUSINESS_FUNCTION_OPTIONS.map(opt => ({ label: opt, value: opt }))}
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

            <Divider />

            {/* Team Members List */}
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>MEMBERS ({teamMembers.length})</Text>
              <div style={{ marginTop: '12px' }}>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <div key={member.user} style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px',
                      padding: '8px',
                      backgroundColor: '#fafafa',
                      borderRadius: '4px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
                        <Avatar src={member.image} icon={<UserOutlined />} size="small" />
                        <div style={{ minWidth: 0 }}>
                          <Text strong style={{ fontSize: '12px', display: 'block' }}>{member.full_name}</Text>
                          <Text type="secondary" style={{ fontSize: '10px' }}>{member.email}</Text>
                          {member.custom_business_function && (
                            <div style={{ marginTop: 4 }}>
                              <Tag color="blue">{member.custom_business_function}</Tag>
                            </div>
                          )}
                        </div>
                      </div>
                      <Space>
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
                  ))
                ) : (
                  <Text type="secondary" style={{ fontSize: '12px' }}>No team members added yet</Text>
                )}
              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Edit Team Member Modal */}
      <Modal
        title={memberBeingEdited ? `Edit Team Member — ${memberBeingEdited.full_name}` : 'Edit Team Member'}
        open={showEditMemberModal}
        onCancel={() => {
          setShowEditMemberModal(false)
          setMemberBeingEdited(null)
          setEditBusinessFunction(null)
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowEditMemberModal(false)
            setMemberBeingEdited(null)
            setEditBusinessFunction(null)
          }}>
            Cancel
          </Button>,
          <Button key="save" type="primary" onClick={handleSaveMemberEdit}>
            Save
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>BUSINESS FUNCTION</Text>
          <Select
            allowClear
            placeholder="Select business function"
            value={editBusinessFunction}
            onChange={setEditBusinessFunction}
            style={{ width: '100%', marginTop: '8px' }}
            options={BUSINESS_FUNCTION_OPTIONS.map(opt => ({ label: opt, value: opt }))}
          />
        </div>
      </Modal>
    </div>
  )
}

export default ProjectCreateForm

