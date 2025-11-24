import { useState, useEffect, useRef, useCallback } from 'react'
import Swal from 'sweetalert2'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Form,
  Input,
  Space,
  Spin,
  Empty,
  Avatar,
  Divider,
  Select,
  DatePicker,
  Tooltip,
  Modal,
  Tag,
  AutoComplete
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined,
  EditOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import RichTextEditor from './RichTextEditor'
import SprintReportDialog from './SprintReportDialog'
import dayjs from 'dayjs'
import {
  getProjectDetails,
  getProjectUsers,
  updateProject,
  addProjectUser,
  removeProjectUser,
  searchUsers,
  updateProjectManager,
  updateProjectUser,
  searchDesignations
} from '../utils/projectAttachmentsApi'

const { Title, Text } = Typography


/**
 * Debounce utility function
 * Delays function execution until after the specified delay has passed without new calls
 * @param {Function} func - Function to debounce
 * @param {number} delay - Delay in milliseconds (default: 400ms)
 * @returns {Function} Debounced function
 */
const createDebounce = (func, delay = 400) => {
  let timeoutId = null

  return (...args) => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }

    timeoutId = setTimeout(() => {
      func(...args)
      timeoutId = null
    }, delay)
  }
}

const ProjectEdit = ({ projectId, navigateToRoute }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectData, setProjectData] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [projectManager, setProjectManager] = useState(null)
  const [form] = Form.useForm()
  const [userSearchResults, setUserSearchResults] = useState([])
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null)
  const [businessFunctionToAdd, setBusinessFunctionToAdd] = useState(null)
  const [addingUser, setAddingUser] = useState(false)
  const [designations, setDesignations] = useState([])
  const [designationSearchLoading, setDesignationSearchLoading] = useState(false)
  const [notesContent, setNotesContent] = useState('')
  const [searchLoading, setSearchLoading] = useState(false)
  const [showChangeManagerModal, setShowChangeManagerModal] = useState(false)
  const [showSprintReport, setShowSprintReport] = useState(false)
  const [managerSearchResults, setManagerSearchResults] = useState([])
  const [selectedNewManager, setSelectedNewManager] = useState(null)
  const [changingManager, setChangingManager] = useState(false)
  const [isDebouncing, setIsDebouncing] = useState(false)
  const [isManagerDebouncing, setIsManagerDebouncing] = useState(false)

  // Edit Team Member modal state
  const [showEditMemberModal, setShowEditMemberModal] = useState(false)
  const [memberBeingEdited, setMemberBeingEdited] = useState(null)
  const [editBusinessFunction, setEditBusinessFunction] = useState(null)
  const [savingMemberEdit, setSavingMemberEdit] = useState(false)

  // Refs for debounce timeouts
  const userSearchTimeoutRef = useRef(null)
  const managerSearchTimeoutRef = useRef(null)
  const designationSearchTimeoutRef = useRef(null)

  // Cleanup debounce timeouts on component unmount
  useEffect(() => {
    return () => {
      if (userSearchTimeoutRef.current) {
        clearTimeout(userSearchTimeoutRef.current)
      }
      if (managerSearchTimeoutRef.current) {
        clearTimeout(managerSearchTimeoutRef.current)
      }
      if (designationSearchTimeoutRef.current) {
        clearTimeout(designationSearchTimeoutRef.current)
      }
    }
  }, [])

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
    loadDesignations()
  }, [projectId])

  const loadDesignations = async (query = '') => {
    try {
      console.log('[ProjectEdit] Loading designations with query:', query)
      setDesignationSearchLoading(true)
      const response = await searchDesignations(query)
      console.log('[ProjectEdit] Designations response:', response)
      if (response.success) {
        setDesignations(response.designations || [])
        console.log('[ProjectEdit] Loaded designations count:', response.designations?.length || 0)
      } else {
        console.warn('[ProjectEdit] Failed to load designations:', response.error)
        setDesignations([])
      }
    } catch (error) {
      console.error('[ProjectEdit] Error loading designations:', error)
      setDesignations([])
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

  const loadProjectData = async () => {
    setLoading(true)
    try {
      console.log('[ProjectEdit] Loading project data for:', projectId)

      // Fetch project details
      const projectResponse = await getProjectDetails(projectId)
      console.log('[ProjectEdit] Project response:', projectResponse)

      if (projectResponse.success && projectResponse.project) {
        setProjectData(projectResponse.project)
        const notesValue = projectResponse.project.notes || ''
        setNotesContent(notesValue)

        // Populate form with project data
        form.setFieldsValue({
          project_name: projectResponse.project.project_name || projectResponse.project.name,
          status: projectResponse.project.status || 'Open',
          priority: projectResponse.project.priority || 'Medium',
          expected_start_date: projectResponse.project.expected_start_date ? dayjs(projectResponse.project.expected_start_date) : null,
          expected_end_date: projectResponse.project.expected_end_date ? dayjs(projectResponse.project.expected_end_date) : null
        })
        console.log('[ProjectEdit] Form populated successfully')
      } else {
        throw new Error(projectResponse.error || 'Failed to load project')
      }

      // Fetch project users
      const usersResponse = await getProjectUsers(projectId)
      console.log('[ProjectEdit] Users response:', usersResponse)

      if (usersResponse.success) {
        setProjectManager(usersResponse.project_manager)
        setTeamMembers(usersResponse.team_members || [])
      }
    } catch (error) {
      console.error('[ProjectEdit] Error loading project:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Failed to load project',
        text: error.message || 'An error occurred while loading project data',
        confirmButtonText: 'Back'
      })
      navigateToRoute('project-detail', projectId)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProject = async (values) => {
    setSaving(true)
    try {
      console.log('[ProjectEdit] Saving project with values:', values)

      const updateData = {
        project_name: values.project_name,
        status: values.status,
        priority: values.priority,
        expected_start_date: values.expected_start_date ? values.expected_start_date.format('YYYY-MM-DD') : null,
        expected_end_date: values.expected_end_date ? values.expected_end_date.format('YYYY-MM-DD') : null,
        notes: notesContent || ''
      }

      console.log('[ProjectEdit] Update data:', updateData)
      const response = await updateProject(projectId, updateData)
      console.log('[ProjectEdit] Update response:', response)

      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Project updated successfully',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
        // Navigate back to project detail
        navigateToRoute('project-detail', projectId)
      } else {
        await Swal.fire({
          icon: 'error',
          title: response.error || 'Failed to update project',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      }
    } catch (error) {
      console.error('[ProjectEdit] Error saving project:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Failed to save project',
        text: error.message || 'An error occurred while saving',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } finally {
      setSaving(false)
    }
  }

  const handleUserSearch = useCallback((searchValue) => {
    // Clear previous timeout
    if (userSearchTimeoutRef.current) {
      clearTimeout(userSearchTimeoutRef.current)
    }

    // Clear results if input is empty
    if (!searchValue || searchValue.trim().length === 0) {
      setUserSearchResults([])
      setIsDebouncing(false)
      return
    }

    // Don't search if input is too short (less than 2 characters)
    if (searchValue.trim().length < 2) {
      setUserSearchResults([])
      setIsDebouncing(true)
      return
    }

    // Show debouncing state
    setIsDebouncing(true)
    console.log('[ProjectEdit] Debouncing user search for:', searchValue)

    // Set timeout for debounced search
    userSearchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[ProjectEdit] Executing debounced search for:', searchValue)
        setSearchLoading(true)
        const response = await searchUsers(searchValue)
        console.log('[ProjectEdit] Search response:', response)

        // Extract users from response - API returns {success: true, users: [...]}
        const users = response.message?.users || response.users || []
        console.log('[ProjectEdit] Extracted users:', users)

        if (users && users.length > 0) {
          setUserSearchResults(users)
        } else {
          setUserSearchResults([])
        }
      } catch (error) {
        console.error('[ProjectEdit] Error searching users:', error)
        setUserSearchResults([])
      } finally {
        setSearchLoading(false)
        setIsDebouncing(false)
      }
    }, 400) // 400ms debounce delay
  }, [])

  const handleAddUser = async () => {
    if (!selectedUserToAdd) return

    setAddingUser(true)
    try {
      console.log('[ProjectEdit] Adding user:', selectedUserToAdd, 'role:', businessFunctionToAdd)
      const response = await addProjectUser(
        projectId,
        selectedUserToAdd,
        businessFunctionToAdd ? { business_function: businessFunctionToAdd } : null
      )
      console.log('[ProjectEdit] Add user response:', response)

      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'User added successfully',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
        setSelectedUserToAdd(null)
        setBusinessFunctionToAdd(null)
        setUserSearchResults([])
        loadProjectData()
      } else {
        await Swal.fire({
          icon: 'error',
          title: response.error || 'Failed to add user',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      }
    } catch (error) {
      console.error('[ProjectEdit] Error adding user:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Failed to add user',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } finally {
      setAddingUser(false)
    }
  }

  const handleManagerSearch = useCallback((searchValue) => {
    // Clear previous timeout
    if (managerSearchTimeoutRef.current) {
      clearTimeout(managerSearchTimeoutRef.current)
    }

    // Clear results if input is empty
    if (!searchValue || searchValue.trim().length === 0) {
      setManagerSearchResults([])
      setIsManagerDebouncing(false)
      return
    }

    // Don't search if input is too short (less than 2 characters)
    if (searchValue.trim().length < 2) {
      setManagerSearchResults([])
      setIsManagerDebouncing(true)
      return
    }

    // Show debouncing state
    setIsManagerDebouncing(true)
    console.log('[ProjectEdit] Debouncing manager search for:', searchValue)

    // Set timeout for debounced search
    managerSearchTimeoutRef.current = setTimeout(async () => {
      try {
        console.log('[ProjectEdit] Executing debounced manager search for:', searchValue)
        setSearchLoading(true)
        const response = await searchUsers(searchValue)
        console.log('[ProjectEdit] Manager search response:', response)

        // Extract users from response
        const users = response.message?.users || response.users || []
        console.log('[ProjectEdit] Extracted manager candidates:', users)

        if (users && users.length > 0) {
          setManagerSearchResults(users)
        } else {
          setManagerSearchResults([])
        }
      } catch (error) {
        console.error('[ProjectEdit] Error searching for manager:', error)
        setManagerSearchResults([])
      } finally {
        setSearchLoading(false)
        setIsManagerDebouncing(false)
      }
    }, 400) // 400ms debounce delay
  }, [])

  const handleChangeProjectManager = async () => {
    if (!selectedNewManager) {
      await Swal.fire({
        icon: 'warning',
        title: 'Please select a user',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
      return
    }

    setChangingManager(true)
    try {
      console.log('[ProjectEdit] Changing project manager to:', selectedNewManager)
      const response = await updateProjectManager(projectId, selectedNewManager)
      console.log('[ProjectEdit] Change manager response:', response)

      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Project Manager updated successfully',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
        setShowChangeManagerModal(false)
        setSelectedNewManager(null)
        setManagerSearchResults([])
        loadProjectData()
      } else {
        await Swal.fire({
          icon: 'error',
          title: response.error || 'Failed to update project manager',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      }
    } catch (error) {
      console.error('[ProjectEdit] Error changing project manager:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Failed to update project manager',
        text: error.message || 'An error occurred while updating the project manager',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } finally {
      setChangingManager(false)
    }
  }

  const handleRemoveUser = async (userId) => {
    const result = await Swal.fire({
      title: 'Remove User?',
      text: 'Are you sure you want to remove this user from the project?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, Remove',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#ff4d4f'
    })

    if (!result.isConfirmed) return

    try {
      console.log('[ProjectEdit] Removing user:', userId)
      const response = await removeProjectUser(projectId, userId)
      console.log('[ProjectEdit] Remove user response:', response)

      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'User removed successfully',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
        loadProjectData()
      } else {
        await Swal.fire({
          icon: 'error',
          title: response.error || 'Failed to remove user',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      }
    } catch (error) {
      console.error('[ProjectEdit] Error removing user:', error)

      await Swal.fire({
        icon: 'error',
        title: 'Failed to remove user',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    }
  }

  const handleSaveMemberEdit = async () => {
    if (!memberBeingEdited) return
    setSavingMemberEdit(true)
    try {
      console.log('[ProjectEdit] Updating project user:', memberBeingEdited.name, 'role:', editBusinessFunction)
      const response = await updateProjectUser(
        projectId,
        memberBeingEdited.name,
        { business_function: editBusinessFunction || null }
      )
      console.log('[ProjectEdit] Update project user response:', response)
      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Team member updated',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 2500
        })
        setShowEditMemberModal(false)
        setMemberBeingEdited(null)
        setEditBusinessFunction(null)
        loadProjectData()
      } else {
        await Swal.fire({
          icon: 'error',
          title: response.error || 'Failed to update team member',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })
      }
    } catch (error) {
      console.error('[ProjectEdit] Error updating team member:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Failed to update team member',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 3000
      })
    } finally {
      setSavingMemberEdit(false)
    }
  }


  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!projectData) {
    return (
      <Empty description="Project not found">
        <Button type="primary" onClick={() => navigateToRoute('dashboard')}>
          Back to Dashboard
        </Button>
      </Empty>
    )
  }

  const editMemberModalTitle = `Edit Team Member${memberBeingEdited ? ' \u2014 ' + memberBeingEdited.full_name : ''}`


  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <Card style={{ marginBottom: '16px', borderRadius: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size="small">
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('project-detail', projectId)}
              >
                Back to Project
              </Button>
              <Title level={2} style={{ margin: 0 }}>
                Edit Project: {projectData?.project_name || projectData?.name}
              </Title>
            </Space>
          </Col>
          <Col>
            <Button
              type="default"
              icon={<BarChartOutlined />}
              onClick={() => setShowSprintReport(true)}
            >
              Sprint Report
            </Button>
          </Col>
        </Row>
      </Card>

      <Row gutter={[24, 24]}>
        {/* Left Column - Form */}
        <Col xs={24} lg={16}>
          <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSaveProject}
              autoComplete="off"
            >
              <Form.Item
                label="Project Name"
                name="project_name"
                rules={[
                  { required: true, message: 'Please enter project name' },
                  { min: 3, message: 'Project name must be at least 3 characters' }
                ]}
              >
                <Input placeholder="Enter project name" />
              </Form.Item>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Status"
                    name="status"
                    rules={[{ required: true, message: 'Please select status' }]}
                  >
                    <Select
                      placeholder="Select status"
                      options={[
                        { label: 'Open', value: 'Open' },
                        { label: 'Working', value: 'Working' },
                        { label: 'Completed', value: 'Completed' },
                        { label: 'Cancelled', value: 'Cancelled' },
                        { label: 'On Hold', value: 'On Hold' }
                      ]}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Priority"
                    name="priority"
                    rules={[{ required: true, message: 'Please select priority' }]}
                  >
                    <Select
                      placeholder="Select priority"
                      options={[
                        { label: 'Low', value: 'Low' },
                        { label: 'Medium', value: 'Medium' },
                        { label: 'High', value: 'High' },
                        { label: 'Urgent', value: 'Urgent' }
                      ]}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Expected Start Date"
                    name="expected_start_date"
                  >
                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Expected End Date"
                    name="expected_end_date"
                  >
                    <DatePicker format="YYYY-MM-DD" style={{ width: '100%' }} />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Notes">
                <RichTextEditor
                  value={notesContent}
                  onChange={setNotesContent}
                  placeholder="Enter project notes..."
                />
              </Form.Item>

              <Row gutter={16} style={{ marginTop: '24px' }}>
                <Col>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={saving}
                    onClick={() => form.submit()}
                  >
                    Save Changes
                  </Button>
                </Col>
                <Col>
                  <Button
                    onClick={() => navigateToRoute('project-detail', projectId)}
                  >
                    Cancel
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>


        </Col>

        {/* Right Column - Team Members */}
        <Col xs={24} lg={8}>
          <Card style={{ borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
            <Title level={4}>Team Members</Title>

            {/* Project Manager */}
            {projectManager && (
              <>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <Text type="secondary" style={{ fontSize: '12px' }}>PROJECT MANAGER</Text>
                    <Tooltip title="Change Project Manager">
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => setShowChangeManagerModal(true)}
                      />
                    </Tooltip>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '8px' }}>
                    <Avatar src={projectManager.image} icon={<UserOutlined />} />
                    <div>
                      <Text strong>{projectManager.full_name}</Text>
                      <br />
                      <Text type="secondary" style={{ fontSize: '12px' }}>{projectManager.email}</Text>
                    </div>
                  </div>
                </div>
                <Divider />
              </>
            )}

            {/* Team Members List */}
            <div style={{ marginBottom: '16px' }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>TEAM MEMBERS ({teamMembers.length})</Text>
              <div style={{ marginTop: '12px' }}>
                {teamMembers.length > 0 ? (
                  teamMembers.map((member) => (
                    <div key={member.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '8px', backgroundColor: '#fafafa', borderRadius: '4px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                        <Avatar src={member.image} icon={<UserOutlined />} size="small" />
                        <div>
                          <Text strong style={{ fontSize: '13px' }}>{member.full_name}</Text>
                          <br />
                          <Text type="secondary" style={{ fontSize: '11px' }}>{member.email}</Text>
                          {(member.custom_business_function || member.business_function) && (
                            <div style={{ marginTop: 4 }}>
                              <Tag color="blue">{member.custom_business_function || member.business_function}</Tag>
                            </div>
                          )}
                        </div>
                      </div>
                      <Space>
                        <Button
                          type="text"
                          size="small"
                          icon={<EditOutlined />}
                          onClick={() => {
                            setMemberBeingEdited(member)
                            setEditBusinessFunction(member.custom_business_function || member.business_function || null)
                            setShowEditMemberModal(true)
                          }}
                        />
                        <Button
                          type="text"
                          danger
                          size="small"
                          icon={<DeleteOutlined />}
                          onClick={() => handleRemoveUser(member.name)}
                        />
                      </Space>
                    </div>
                  ))
                ) : (
                  <Text type="secondary">No team members assigned</Text>
                )}
              </div>
            </div>

            <Divider />

            {/* Add User */}
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>ADD USER</Text>
              <div style={{ marginTop: '12px' }}>
                <Input
                  placeholder="Search user by name or email (min 2 characters)..."
                  onChange={(e) => handleUserSearch(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                {isDebouncing && (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#8c8c8c', fontSize: '12px' }}>
                    <Spin size="small" style={{ marginRight: '8px' }} />
                    Searching...
                  </div>
                )}
                {!isDebouncing && userSearchResults.length > 0 && (
                  <div style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '4px',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginBottom: '8px'
                  }}>
                    {userSearchResults.map(user => (
                      <div
                        key={user.name}
                        onClick={() => setSelectedUserToAdd(user.name)}
                        style={{
                          padding: '8px 12px',
                          cursor: 'pointer',
                          backgroundColor: selectedUserToAdd === user.name ? '#e6f7ff' : 'transparent',
                          borderBottom: '1px solid #f0f0f0',
                          ':hover': { backgroundColor: '#f5f5f5' }
                        }}
                      >
                        <Text>{user.full_name}</Text>
                        <br />
                        <Text type="secondary" style={{ fontSize: '12px' }}>{user.email}</Text>
                      </div>
                    ))}
                  </div>
                )}
                {!isDebouncing && userSearchResults.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '12px', color: '#8c8c8c', fontSize: '12px' }}>
                    <Text type="secondary">Type to search for users...</Text>
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
                  style={{ width: '100%', marginBottom: '8px' }}
                  filterOption={false}
                  notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
                />
                <Button
                  type="primary"
                  block
                  icon={<PlusOutlined />}
                  onClick={handleAddUser}
                  loading={addingUser}
                  disabled={!selectedUserToAdd}
                >
                  Add User
                </Button>

              </div>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Change Project Manager Modal */}
      <Modal
        title="Change Project Manager"
        open={showChangeManagerModal}
        onCancel={() => {
          setShowChangeManagerModal(false)
          setSelectedNewManager(null)
          setManagerSearchResults([])
          if (managerSearchTimeoutRef.current) {
            clearTimeout(managerSearchTimeoutRef.current)
          }
        }}
        footer={[
          <Button key="cancel" onClick={() => {
            setShowChangeManagerModal(false)
            setSelectedNewManager(null)
            setManagerSearchResults([])
            if (managerSearchTimeoutRef.current) {
              clearTimeout(managerSearchTimeoutRef.current)
            }
          }}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={changingManager}
            disabled={!selectedNewManager}
            onClick={handleChangeProjectManager}
          >
            Change Manager
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>SEARCH FOR NEW PROJECT MANAGER</Text>
          <Input
            placeholder="Search user by name or email (min 2 characters)..."
            onChange={(e) => handleManagerSearch(e.target.value)}
            style={{ marginTop: '8px', marginBottom: '8px' }}
            disabled={searchLoading}
          />
          {isManagerDebouncing && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#8c8c8c' }}>
              <Spin size="small" style={{ marginRight: '8px' }} />
              <Text type="secondary">Searching...</Text>
            </div>


          )}
          {!isManagerDebouncing && managerSearchResults.length > 0 && (
            <div style={{
              border: '1px solid #d9d9d9',
              borderRadius: '4px',
              maxHeight: '250px',
              overflowY: 'auto'
            }}>
              {managerSearchResults.map(user => (
                <div
                  key={user.name}
                  onClick={() => setSelectedNewManager(user.name)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    backgroundColor: selectedNewManager === user.name ? '#e6f7ff' : 'transparent',
                    borderBottom: '1px solid #f0f0f0',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    if (selectedNewManager !== user.name) {
                      e.currentTarget.style.backgroundColor = '#f5f5f5'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedNewManager !== user.name) {
                      e.currentTarget.style.backgroundColor = 'transparent'
                    }
                  }}
                >
                  <Avatar src={user.user_image} icon={<UserOutlined />} size="small" />
                  <div>
                    <Text strong>{user.full_name}</Text>
                    <br />
                    <Text type="secondary" style={{ fontSize: '12px' }}>{user.email}</Text>
                  </div>
                </div>
              ))}
            </div>
          )}
          {!isManagerDebouncing && managerSearchResults.length === 0 && (
            <div style={{ textAlign: 'center', padding: '16px', color: '#8c8c8c', fontSize: '12px' }}>
              <Text type="secondary">Type to search for users...</Text>
            </div>
          )}
        </div>
      </Modal>


      {/* Edit Team Member Modal */}
      <Modal
        title={editMemberModalTitle}
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
          <Button key="save" type="primary" loading={savingMemberEdit} onClick={handleSaveMemberEdit}>
            Save
          </Button>
        ]}
      >
        <div style={{ marginBottom: '16px' }}>
          <Text type="secondary" style={{ fontSize: '12px' }}>DESIGNATION</Text>
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
            style={{ width: '100%', marginTop: '8px' }}
            filterOption={false}
            notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
          />
        </div>
      </Modal>

      {/* Sprint Report Dialog */}
      {showSprintReport && (
        <SprintReportDialog
          open={showSprintReport}
          onClose={() => setShowSprintReport(false)}
          projectId={projectId}
          projectName={projectData?.project_name || projectData?.name}
        />
      )}
    </div>
  )
}

export default ProjectEdit

