import { useState, useEffect } from 'react'
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
  Divider
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  DeleteOutlined,
  PlusOutlined,
  UserOutlined
} from '@ant-design/icons'
import ReactQuill from 'react-quill'
import 'react-quill/dist/quill.snow.css'
import dayjs from 'dayjs'
import {
  getProjectDetails,
  getProjectUsers,
  updateProject,
  addProjectUser,
  removeProjectUser,
  searchUsers
} from '../utils/projectAttachmentsApi'

const { Title, Text } = Typography

const ProjectEdit = ({ projectId, navigateToRoute }) => {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [projectData, setProjectData] = useState(null)
  const [teamMembers, setTeamMembers] = useState([])
  const [projectManager, setProjectManager] = useState(null)
  const [form] = Form.useForm()
  const [userSearchResults, setUserSearchResults] = useState([])
  const [selectedUserToAdd, setSelectedUserToAdd] = useState(null)
  const [addingUser, setAddingUser] = useState(false)
  const [notesContent, setNotesContent] = useState('')

  useEffect(() => {
    if (projectId) {
      loadProjectData()
    }
  }, [projectId])

  const loadProjectData = async () => {
    setLoading(true)
    try {
      // Fetch project details
      const projectResponse = await getProjectDetails(projectId)
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
      } else {
        throw new Error(projectResponse.error || 'Failed to load project')
      }

      // Fetch project users
      const usersResponse = await getProjectUsers(projectId)
      if (usersResponse.success) {
        setProjectManager(usersResponse.project_manager)
        setTeamMembers(usersResponse.team_members || [])
      }

      // Fetch project tasks - temporarily disabled to debug
      // try {
      //   const tasksResponse = await getProjectTasks(projectId)
      //   if (tasksResponse.success) {
      //     setTasks(tasksResponse.tasks || [])
      //   }
      // } catch (err) {
      //   console.error('Failed to load project tasks:', err)
      // }
    } catch (error) {

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
      const updateData = {
        project_name: values.project_name,
        status: values.status,
        priority: values.priority,
        expected_start_date: values.expected_start_date ? values.expected_start_date.format('YYYY-MM-DD') : null,
        expected_end_date: values.expected_end_date ? values.expected_end_date.format('YYYY-MM-DD') : null,
        notes: notesContent || ''
      }

      const response = await updateProject(projectId, updateData)

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

  const handleUserSearch = async (searchValue) => {
    if (!searchValue) {
      setUserSearchResults([])
      return
    }
    try {
      const results = await searchUsers(searchValue)
      if (results && results.length > 0) {
        setUserSearchResults(results)
      }
    } catch (error) {

    }
  }

  const handleAddUser = async () => {
    if (!selectedUserToAdd) return

    setAddingUser(true)
    try {
      const response = await addProjectUser(projectId, selectedUserToAdd)
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
      const response = await removeProjectUser(projectId, userId)
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
                rules={[{ required: true, message: 'Please enter project name' }]}
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
                    <Input placeholder="Select status (Open, Completed, Cancelled)" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Priority"
                    name="priority"
                    rules={[{ required: true, message: 'Please select priority' }]}
                  >
                    <Input placeholder="Select priority (Low, Medium, High)" />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Expected Start Date"
                    name="expected_start_date"
                  >
                    <Input type="date" />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Expected End Date"
                    name="expected_end_date"
                  >
                    <Input type="date" />
                  </Form.Item>
                </Col>
              </Row>

              <Form.Item label="Notes">
                <div style={{ marginBottom: '16px' }}>
                  <ReactQuill
                    theme="snow"
                    value={notesContent}
                    onChange={setNotesContent}
                    placeholder="Enter project notes..."
                    style={{ height: '200px' }}
                  />
                </div>
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
                  <Text type="secondary" style={{ fontSize: '12px' }}>PROJECT MANAGER</Text>
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
                        </div>
                      </div>
                      <Button 
                        type="text" 
                        danger 
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveUser(member.name)}
                      />
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
                  placeholder="Search user by name or email..."
                  onChange={(e) => handleUserSearch(e.target.value)}
                  style={{ marginBottom: '8px' }}
                />
                {userSearchResults.length > 0 && (
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
    </div>
  )
}

export default ProjectEdit

