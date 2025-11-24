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
  Spin,
  Typography,
  Tag,
  Empty,
  theme,
  AutoComplete
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  EditOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  RiseOutlined
} from '@ant-design/icons'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'
import { searchDesignations } from '../utils/projectAttachmentsApi'

const { Title, Text } = Typography

const RACITemplateForm = ({ mode = 'create', templateId = null, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [template, setTemplate] = useState(null)
  const [assignments, setAssignments] = useState([])
  const [showAssignmentModal, setShowAssignmentModal] = useState(false)
  const [editingAssignment, setEditingAssignment] = useState(null)
  const [assignmentForm] = Form.useForm()
  
  // Decode templateId if it's URL encoded
  const decodedTemplateId = templateId ? (() => {
    try {
      return decodeURIComponent(templateId)
    } catch (e) {
      console.warn('[RACITemplateForm] Failed to decode templateId, using as-is:', templateId)
      return templateId
    }
  })() : null
  const [projectTemplates, setProjectTemplates] = useState([])
  const [projectTemplatesLoading, setProjectTemplatesLoading] = useState(false)
  const [projectTasks, setProjectTasks] = useState([])
  const [designations, setDesignations] = useState([])
  const [designationSearchLoading, setDesignationSearchLoading] = useState(false)
  const designationSearchTimeoutRef = useRef(null)

  useEffect(() => {
    loadProjectTemplates()
    loadDesignations()
    if (mode === 'edit' && decodedTemplateId) {
      console.log('[RACITemplateForm] useEffect: Loading template in edit mode, templateId:', decodedTemplateId, '(original:', templateId, ')')
      // Use decodedTemplateId for loading
      loadTemplate()
    } else if (mode === 'edit' && !decodedTemplateId) {
      console.error('[RACITemplateForm] useEffect: Edit mode but no templateId provided!')
      message.error('Template ID is missing. Please go back and try again.')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, decodedTemplateId])

  const loadDesignations = async (query = '') => {
    try {
      console.log('[RACITemplateForm] Loading designations with query:', query)
      setDesignationSearchLoading(true)
      const response = await searchDesignations(query)
      console.log('[RACITemplateForm] Designations response:', response)
      if (response.success) {
        setDesignations(response.designations || [])
        console.log('[RACITemplateForm] Loaded designations count:', response.designations?.length || 0)
      } else {
        console.warn('[RACITemplateForm] Failed to load designations:', response.error)
        setDesignations([])
      }
    } catch (error) {
      console.error('[RACITemplateForm] Error loading designations:', error)
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

  const loadProjectTemplates = async () => {
    try {
      setProjectTemplatesLoading(true)
      const response = await fetch(
        '/api/resource/Project Template?fields=["name","project_type"]&limit_page_length=500',
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const templates = data.data || []
      setProjectTemplates(templates.map(t => ({
        label: t.name,
        value: t.name
      })))
    } catch (error) {
      console.error('Error loading project templates:', error)
    } finally {
      setProjectTemplatesLoading(false)
    }
  }

  const loadTemplate = async () => {
    setLoading(true)
    try {
      // Use the already decoded templateId
      console.log('[RACITemplateForm] Loading template with ID:', decodedTemplateId)
      
      if (!decodedTemplateId) {
        throw new Error('Template ID is required')
      }
      
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.raci_template.get_raci_template_detail?name=${encodeURIComponent(decodedTemplateId)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      console.log('[RACITemplateForm] Response status:', response.status, response.ok)

      const data = await response.json().catch(() => {
        throw new Error('Invalid response from server')
      })

      console.log('[RACITemplateForm] Full API Response:', JSON.stringify(data, null, 2))

      // Only treat as error if HTTP status is not OK (200-299)
      if (!response.ok) {
        console.error('[RACITemplateForm] HTTP error response:', response.status, data)
        
        // Extract error message from _server_messages if available
        let errorMsg = 'Failed to load template details'
        if (data._server_messages) {
          try {
            const serverMessages = JSON.parse(data._server_messages)
            if (Array.isArray(serverMessages) && serverMessages.length > 0) {
              const firstMessage = JSON.parse(serverMessages[0])
              errorMsg = firstMessage.message || errorMsg
            }
          } catch (e) {
            console.warn('[RACITemplateForm] Could not parse server messages:', e)
          }
        }
        
        message.error(errorMsg)
        
        // ONLY navigate back if it's a 404 (not found) - don't navigate for other errors
        // Commented out auto-redirect to prevent unwanted navigation
        // User can manually navigate back if needed
        if (response.status === 404) {
          console.log('[RACITemplateForm] Template not found (404) - user should navigate back manually')
          // Removed auto-redirect - let user decide
          // setTimeout(() => {
          //   navigateToRoute('raci-template')
          // }, 2000)
        }
        return
      }

      // Response is OK (200), now check the data structure
      const result = data.message || data
      console.log('[RACITemplateForm] Parsed result:', result)

      // Check if we have valid data
      if (result && result.data) {
        const templateData = result.data
        console.log('[RACITemplateForm] Template data received:', templateData.template_name)
        
        setTemplate(templateData)

        const assignmentsData = templateData.raci_assignments || []
        setAssignments(
          assignmentsData.map((assignment, index) => ({
            id: assignment.name || `assignment-${index}`,
            idx: assignment.idx,
            business_function: assignment.business_function,
            task_name: assignment.task_name,
            task_link: assignment.task_link,
            task_type: assignment.task_type,
            task_type_priority: assignment.task_type_priority,
            responsible: assignment.responsible,
            accountable: assignment.accountable,
            consulted: assignment.consulted,
            informed: assignment.informed
          }))
        )

        form.setFieldsValue({
          template_name: templateData.template_name,
          description: templateData.description,
          project_template: templateData.project_template
        })

        console.log('[RACITemplateForm] Template loaded successfully, form populated')
      } else if (result && result.success === false) {
        // Explicit failure
        console.error('[RACITemplateForm] API returned success=false:', result)
        const errorMsg = result.error || result.message || 'Failed to load template details'
        message.error(errorMsg)
      } else {
        // Unexpected structure but not necessarily an error
        console.warn('[RACITemplateForm] Unexpected response structure, but continuing:', result)
      }
    } catch (error) {
      console.error('[RACITemplateForm] Exception caught:', error)
      message.error(error.message || 'Failed to load template')
      // Don't auto-navigate on exceptions - let user see the error
    } finally {
      setLoading(false)
      console.log('[RACITemplateForm] loadTemplate completed')
    }
  }

  const handleProjectTemplateChange = async (value) => {
    if (!value) {
      setProjectTasks([])
      return
    }

    try {
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.raci_template.get_project_template_tasks?project_template=${encodeURIComponent(value)}`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const data = await response.json()
      const result = data.message || data

      if (result.success) {
        const tasks = result.data || []
        setProjectTasks(tasks)

        // Auto-populate assignments from tasks with task type info
        const newAssignments = tasks.map((task, index) => ({
          id: `new-assignment-${index}`,
          task_name: task.task_name,
          task_link: task.task_link,
          task_type: task.task_type,
          task_type_priority: task.task_type_priority
        }))

        setAssignments(newAssignments)
      }
    } catch (error) {
      console.error('Error loading tasks:', error)
      message.error('Failed to load project template tasks')
    }
  }

  const handleAddAssignment = () => {
    setEditingAssignment(null)
    assignmentForm.resetFields()
    setShowAssignmentModal(true)
  }

  const handleEditAssignment = (record) => {
    setEditingAssignment(record)
    assignmentForm.setFieldsValue({
      task_name: record.task_name,
      business_function: record.business_function,
      responsible: record.responsible,
      accountable: record.accountable,
      consulted: record.consulted,
      informed: record.informed
    })
    setShowAssignmentModal(true)
  }

  const handleDeleteAssignment = (id) => {
    setAssignments(assignments.filter(a => a.id !== id))
    message.success('Assignment removed')
  }

  const handleSaveAssignment = () => {
    assignmentForm.validateFields().then(values => {
      if (editingAssignment) {
        setAssignments(assignments.map(a =>
          a.id === editingAssignment.id ? { ...editingAssignment, ...values } : a
        ))
        message.success('Assignment updated')
      } else {
        setAssignments([
          ...assignments,
          {
            id: `assignment-${Date.now()}`,
            ...values
          }
        ])
        message.success('Assignment added')
      }
      setShowAssignmentModal(false)
    })
  }

  const handleSubmit = async (values) => {
    console.log('[RACITemplateForm] Submitting form with values:', values)
    console.log('[RACITemplateForm] Mode:', mode, 'Template ID:', templateId)
    console.log('[RACITemplateForm] Assignments count:', assignments.length)

    // Validate assignments
    if (assignments.length === 0) {
      message.warning('Please add at least one RACI assignment before submitting')
      return
    }

    setSubmitting(true)
    try {
      const transformedAssignments = assignments.map(assignment => ({
        business_function: assignment.business_function,
        task_name: assignment.task_name,
        task_link: assignment.task_link,
        task_type: assignment.task_type,
        task_type_priority: assignment.task_type_priority,
        responsible: assignment.responsible,
        accountable: assignment.accountable,
        consulted: assignment.consulted,
        informed: assignment.informed
      }))

      console.log('[RACITemplateForm] Transformed assignments:', transformedAssignments)

      const formData = {
        ...values,
        raci_assignments: transformedAssignments
      }

      const endpoint = mode === 'create'
        ? '/api/method/frappe_devsecops_dashboard.api.raci_template.create_raci_template'
        : '/api/method/frappe_devsecops_dashboard.api.raci_template.update_raci_template'

      // Use the already decoded templateId
      const payload = mode === 'create' ? formData : { name: decodedTemplateId, ...formData }
      
      console.log('[RACITemplateForm] Using templateId for update:', decodedTemplateId, '(original prop:', templateId, ')')

      console.log('[RACITemplateForm] API Endpoint:', endpoint)
      console.log('[RACITemplateForm] Full Payload:', JSON.stringify(payload, null, 2))

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      })

      const data = await response.json().catch(() => {
        // If JSON parsing fails, throw a user-friendly error
        throw new Error('Invalid response from server')
      })
      
      console.log('[RACITemplateForm] API Response:', data)

      // Check for Frappe error structure or HTTP error status
      if (!response.ok || data.exc_type || data.exception) {
        console.error('[RACITemplateForm] Frappe error:', data)
        
        // Extract error message from _server_messages if available
        let errorMsg = 'Failed to save RACI Template'
        
        // Check for duplicate entry error first
        const isDuplicateError = data.exc_type === 'DuplicateEntryError' || 
          data.exc_type === 'CharacterLengthExceededError' ||
          (data.exception && (
            data.exception.includes('Duplicate') || 
            data.exception.includes('duplicate') ||
            data.exception.includes('Duplicate entry')
          ))
        
        if (data._server_messages) {
          try {
            // _server_messages is a JSON string containing an array of JSON strings
            const serverMessages = JSON.parse(data._server_messages)
            if (Array.isArray(serverMessages) && serverMessages.length > 0) {
              // Parse the first message (which is also a JSON string)
              const firstMessage = JSON.parse(serverMessages[0])
              errorMsg = firstMessage.message || errorMsg
              
              // If it's a duplicate error, look for the duplicate name message
              if (isDuplicateError && firstMessage.title === 'Duplicate Name') {
                errorMsg = firstMessage.message || errorMsg
              }
            }
          } catch (e) {
            console.warn('[RACITemplateForm] Could not parse server messages:', e)
            // Fallback: try to extract from exception string
            if (data.exception) {
              const match = data.exception.match(/Duplicate entry '([^']+)'/)
              if (match) {
                errorMsg = `A RACI Template with the name "${match[1]}" already exists`
              }
            }
          }
        } else if (isDuplicateError) {
          // Fallback for duplicate errors without _server_messages
          const templateName = values.template_name || 'this name'
          errorMsg = `A RACI Template with the name "${templateName}" already exists. Please choose a different name.`
        }
        
        message.error(errorMsg)
        return
      }

      // Handle successful response
      const result = data.message || data

      if (result.success || result.data) {
        message.success(
          mode === 'create'
            ? 'RACI Template created successfully!'
            : 'RACI Template updated successfully!'
        )

        setTimeout(() => {
          navigateToRoute('raci-template')
        }, 500)
      } else {
        const errorMsg = result.error || result.message || 'Unknown error occurred'
        message.error(errorMsg)
      }
    } catch (error) {
      console.error('[RACITemplateForm] Error saving template:', error)
      
      // Handle network errors or JSON parsing errors
      if (error instanceof TypeError && error.message.includes('JSON')) {
        message.error('Invalid response from server. Please try again.')
      } else {
        message.error(error.message || 'Failed to save RACI Template')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const assignmentColumns = [
    {
      title: 'Task Name',
      dataIndex: 'task_name',
      key: 'task_name',
      width: '25%'
    },
    {
      title: 'Business Function',
      dataIndex: 'business_function',
      key: 'business_function',
      width: '15%',
      render: (text) => text ? <Tag color="green">{text}</Tag> : '-'
    },
    {
      title: 'Responsible (R)',
      dataIndex: 'responsible',
      key: 'responsible',
      width: '15%',
      render: (text) => text ? <Tag color="blue">{text}</Tag> : '-'
    },
    {
      title: 'Accountable (A)',
      dataIndex: 'accountable',
      key: 'accountable',
      width: '15%',
      render: (text) => text ? <Tag color="purple">{text}</Tag> : '-'
    },
    {
      title: 'Consulted (C)',
      dataIndex: 'consulted',
      key: 'consulted',
      width: '15%',
      render: (text) => text ? <Tag color="cyan">{text}</Tag> : '-'
    },
    {
      title: 'Informed (I)',
      dataIndex: 'informed',
      key: 'informed',
      width: '15%',
      render: (text) => text ? <Tag color="orange">{text}</Tag> : '-'
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '15%',
      render: (_, record) => (
        <Space size="small">
          <Button
            type="text"
            size="small"
            icon={<EditOutlined />}
            onClick={() => handleEditAssignment(record)}
          />
          <Button
            type="text"
            danger
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => handleDeleteAssignment(record.id)}
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
                onClick={() => navigateToRoute('raci-template')}
                style={{ paddingLeft: 0 }}
              >
                Back to RACI Templates
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <RiseOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                {mode === 'create' ? 'Create RACI Template' : `Edit: ${template?.template_name || 'Template'}`}
              </Title>
            </Space>
          </Col>
        </Row>
      </Card>

      <Card bordered={false}>
        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          <Row gutter={[24, 24]}>
            {/* Left Column */}
            <Col xs={24} md={12}>
              <Card title="Basic Information" size="small" style={{ height: '100%' }}>
                <Form.Item
                  label="Template Name"
                  name="template_name"
                  rules={[{ required: true, message: 'Please enter template name' }]}
                >
                  <Input placeholder="e.g., Development RACI Matrix" />
                </Form.Item>

                <Form.Item
                  label="Project Template"
                  name="project_template"
                  tooltip="Select a Project Template to auto-populate tasks"
                >
                  <Select
                    placeholder="Select Project Template (optional)"
                    loading={projectTemplatesLoading}
                    options={projectTemplates}
                    onChange={handleProjectTemplateChange}
                    allowClear
                  />
                </Form.Item>
              </Card>
            </Col>

            {/* Right Column */}
            <Col xs={24} md={12}>
              <Card title="Description" size="small" style={{ height: '100%' }}>
                <Form.Item
                  label="Description"
                  name="description"
                  style={{ marginBottom: 0 }}
                >
                  <Input.TextArea
                    rows={4}
                    placeholder="Describe the purpose and scope of this RACI template"
                  />
                </Form.Item>
              </Card>
            </Col>
          </Row>

          <Divider />

          {/* RACI Assignments Section */}
          <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
            <Col xs={24}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <Title level={4} style={{ margin: 0 }}>RACI Matrix</Title>
                <Button
                  type="primary"
                  size="small"
                  icon={<PlusOutlined />}
                  onClick={handleAddAssignment}
                >
                  Add Assignment
                </Button>
              </div>

{assignments.length > 0 ? (
                (() => {
                  // Group assignments by task_type
                  const groupedAssignments = {}
                  assignments.forEach(assignment => {
                    const taskType = assignment.task_type || 'Uncategorized'
                    const priority = assignment.task_type_priority || 999
                    if (!groupedAssignments[taskType]) {
                      groupedAssignments[taskType] = {
                        priority: priority,
                        tasks: []
                      }
                    }
                    groupedAssignments[taskType].tasks.push(assignment)
                  })

                  // Sort groups by priority (ascending)
                  const sortedGroups = Object.entries(groupedAssignments).sort((a, b) => {
                    return a[1].priority - b[1].priority
                  })

                  return (
                    <Space direction="vertical" style={{ width: '100%' }} size="large">
                      {sortedGroups.map(([taskType, groupData]) => (
                        <div key={taskType}>
                          <Divider orientation="left" style={{ fontWeight: 'bold', fontSize: '16px' }}>
                            {taskType}
                          </Divider>
                          <Table
                            columns={assignmentColumns}
                            dataSource={groupData.tasks}
                            rowKey="id"
                            pagination={false}
                            scroll={{ x: 800 }}
                            size="small"
                            showHeader={taskType === sortedGroups[0][0]}
                          />
                        </div>
                      ))}
                    </Space>
                  )
                })()
              ) : (
                <Card style={{ background: '#fafafa' }}>
                  <Empty
                    description="No assignments yet"
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                  />
                </Card>
              )}
            </Col>
          </Row>

          {/* Form Actions */}
          <Row justify="center" gutter={[16, 16]}>
            <Col xs={24} sm={8}>
              <Button
                block
                onClick={() => navigateToRoute('raci-template')}
              >
                Cancel
              </Button>
            </Col>
            <Col xs={24} sm={8}>
              <Button
                block
                type="primary"
                htmlType="submit"
                loading={submitting}
                icon={<SaveOutlined />}
                style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  border: 'none'
                }}
              >
                {mode === 'create' ? 'Create Template' : 'Update Template'}
              </Button>
            </Col>
          </Row>
        </Form>
      </Card>

      {/* Assignment Modal */}
      <Modal
        title={editingAssignment ? 'Edit Assignment' : 'Add Assignment'}
        open={showAssignmentModal}
        onOk={handleSaveAssignment}
        onCancel={() => setShowAssignmentModal(false)}
        width={600}
      >
        <Form
          form={assignmentForm}
          layout="vertical"
        >
          <Form.Item
            label="Task Name"
            name="task_name"
            rules={[{ required: true, message: 'Please enter task name' }]}
          >
            <Input placeholder="e.g., Environment Planning" />
          </Form.Item>

          <Divider orientation="left">RACI Roles</Divider>

          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                label={<span>
                  <span style={{ color: '#1890ff', fontWeight: 'bold', marginRight: '4px' }}>R</span>
                  Responsible
                </span>}
                name="responsible"
              >
                <AutoComplete
                  placeholder="Search designation responsible for doing the work"
                  onSearch={handleDesignationSearch}
                  options={designations.map(d => ({
                    label: d.designation_name || d.name,
                    value: d.name
                  }))}
                  allowClear
                  filterOption={false}
                  notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={<span>
                  <span style={{ color: '#722ed1', fontWeight: 'bold', marginRight: '4px' }}>A</span>
                  Accountable
                </span>}
                name="accountable"
              >
                <AutoComplete
                  placeholder="Search designation - final decision maker"
                  onSearch={handleDesignationSearch}
                  options={designations.map(d => ({
                    label: d.designation_name || d.name,
                    value: d.name
                  }))}
                  allowClear
                  filterOption={false}
                  notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={<span>
                  <span style={{ color: '#13c2c2', fontWeight: 'bold', marginRight: '4px' }}>C</span>
                  Consulted
                </span>}
                name="consulted"
              >
                <AutoComplete
                  placeholder="Search designation - provides input/expertise"
                  onSearch={handleDesignationSearch}
                  options={designations.map(d => ({
                    label: d.designation_name || d.name,
                    value: d.name
                  }))}
                  allowClear
                  filterOption={false}
                  notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                label={<span>
                  <span style={{ color: '#faad14', fontWeight: 'bold', marginRight: '4px' }}>I</span>
                  Informed
                </span>}
                name="informed"
              >
                <AutoComplete
                  placeholder="Search designation - kept in the loop"
                  onSearch={handleDesignationSearch}
                  options={designations.map(d => ({
                    label: d.designation_name || d.name,
                    value: d.name
                  }))}
                  allowClear
                  filterOption={false}
                  notFoundContent={designationSearchLoading ? <Spin size="small" /> : 'No designations found'}
                />
              </Form.Item>
            </Col>
          </Row>
        </Form>
      </Modal>
    </div>
  )
}

export default RACITemplateForm
