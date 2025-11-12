import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Select,
  Button,
  Row,
  Col,
  Space,
  message,
  Typography,
  Divider,
  Empty,
  Collapse,
  Tag
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import Swal from 'sweetalert2'
import incidentsService from '../services/api/incidents'

const { Title } = Typography
const { TextArea } = Input

const SEVERITY_OPTIONS = [
  { label: 'S1 - Critical', value: 'S1 - Critical' },
  { label: 'S2 - High', value: 'S2 - High' },
  { label: 'S3 - Medium', value: 'S3 - Medium' },
  { label: 'S4 - Low', value: 'S4 - Low' }
]

const PRIORITY_OPTIONS = [
  { label: 'Critical', value: 'Critical' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' }
]

const STATUS_OPTIONS = [
  { label: 'New', value: 'New' },
  { label: 'Open', value: 'Open' },
  { label: 'Acknowledged', value: 'Acknowledged' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' }
]

const CATEGORY_OPTIONS = [
  { label: 'Infrastructure', value: 'Infrastructure' },
  { label: 'Security', value: 'Security' },
  { label: 'Application', value: 'Application' },
  { label: 'Network', value: 'Network' },
  { label: 'Database', value: 'Database' },
  { label: 'API', value: 'API' },
  { label: 'Performance', value: 'Performance' },
  { label: 'Data', value: 'Data' },
  { label: 'Configuration', value: 'Configuration' },
  { label: 'Access', value: 'Access' },
  { label: 'Other', value: 'Other' }
]

/**
 * IncidentCreateForm Component
 * Allows users to create new incidents
 */
function IncidentCreateForm({ navigateToRoute }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [assignedToSearchResults, setAssignedToSearchResults] = useState([])
  const [assignedToSearchLoading, setAssignedToSearchLoading] = useState(false)
  const [assignedToFullName, setAssignedToFullName] = useState('')

  // Null safety check for navigateToRoute
  if (!navigateToRoute || typeof navigateToRoute !== 'function') {
    console.error('[IncidentCreateForm] navigateToRoute prop is missing or not a function')
    return (
      <Empty
        description="Error: Navigation is not available"
        style={{ marginTop: '50px' }}
      >
        <p>Please refresh the page and try again.</p>
      </Empty>
    )
  }

  // Handle assigned to user search
  const handleAssignedToSearch = async (searchValue) => {
    if (!searchValue || searchValue.length < 1) {
      setAssignedToSearchResults([])
      return
    }

    try {
      setAssignedToSearchLoading(true)
      const response = await fetch(`/api/method/frappe_devsecops_dashboard.api.incident.search_users?query=${encodeURIComponent(searchValue)}`, {
        method: 'GET',
        headers: {
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      const result = await response.json()
      console.log('Assigned To search response:', result)

      // Frappe wraps the response in a 'message' property
      const responseData = result.message || result
      console.log('Parsed response data:', responseData)

      if (responseData && responseData.success && responseData.data && Array.isArray(responseData.data)) {
        console.log('Setting search results:', responseData.data)
        setAssignedToSearchResults(responseData.data)
      } else {
        console.warn('Invalid response structure:', responseData)
        setAssignedToSearchResults([])
      }
    } catch (error) {
      console.error('Error searching users:', error)
      setAssignedToSearchResults([])
    } finally {
      setAssignedToSearchLoading(false)
    }
  }

  // Handle assigned to user selection
  const handleAssignedToSelect = (value, option) => {
    const selectedUser = assignedToSearchResults.find(user => user.name === value)

    if (selectedUser) {
      // Set the assigned to full name
      setAssignedToFullName(selectedUser.full_name || selectedUser.name)
    }
  }

  // Handle assigned to field clear
  const handleAssignedToClear = () => {
    setAssignedToFullName('')
    setAssignedToSearchResults([])
  }

  // Actual submission logic (called after confirmation)
  const performSubmit = async (values) => {
    try {
      setLoading(true)

      const payload = {
        title: values.title?.trim(),
        description: values.description?.trim(),
        severity: values.severity,
        priority: values.priority || 'Medium',
        status: values.status || 'New',
        category: values.category,
        assigned_to: values.assigned_to?.trim() || null,
        reported_by: values.reported_by?.trim() || null,
        affected_systems: values.affected_systems?.trim() || null,
        impact_description: values.impact_description?.trim() || null
      }

      const endpoint = '/api/method/frappe_devsecops_dashboard.api.incident.create_incident'
      const formData = new URLSearchParams()
      formData.append('data', JSON.stringify(payload))

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: formData.toString()
      })

      if (!res.ok) {
        let errorMessages = []
        try {
          const err = await res.json()
          if (err.message) {
            errorMessages.push(err.message)
          } else if (err.error) {
            errorMessages.push(err.error)
          }
        } catch (parseErr) {
          // Ignore parse errors
        }

        Swal.close()

        let errorTitle = 'Error'
        let errorText = 'Failed to create Incident. Please try again.'

        if (res.status === 401 || res.status === 403) {
          errorTitle = 'Permission Denied'
          errorText = 'You do not have permission to create Incidents.'
        } else if (res.status === 400 || errorMessages.length > 0) {
          errorTitle = 'Validation Error'
          errorText = errorMessages.length > 0
            ? (errorMessages.length === 1 ? errorMessages[0] : errorMessages.join('\n'))
            : 'Please check your input and try again.'
        } else if (res.status >= 500) {
          errorTitle = 'Server Error'
          errorText = 'Server error occurred. Please try again later.'
        } else {
          errorText = errorMessages.length > 0 ? errorMessages.join('; ') : 'Failed to create Incident.'
        }

        await Swal.fire({
          title: errorTitle,
          text: errorText,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1890ff',
          allowOutsideClick: false,
          allowEscapeKey: false
        })
        return
      }

      const response = await res.json()
      const data = response.message || response

      if (!data.success) {
        let errorMessages = []
        if (data.error) {
          errorMessages.push(data.error)
        }

        Swal.close()
        const errorText = errorMessages.length > 0
          ? (errorMessages.length === 1 ? errorMessages[0] : errorMessages.join('\n'))
          : 'Failed to create Incident. Please try again.'

        await Swal.fire({
          title: 'Error',
          text: errorText,
          icon: 'error',
          confirmButtonText: 'OK',
          confirmButtonColor: '#1890ff',
          allowOutsideClick: false,
          allowEscapeKey: false
        })
        return
      }

      Swal.close()

      await Swal.fire({
        title: 'Success!',
        text: data.message || 'Incident created successfully',
        icon: 'success',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
      })

      const incidentId = data.data?.name
      if (incidentId && navigateToRoute && typeof navigateToRoute === 'function') {
        navigateToRoute('incident-detail', null, incidentId)
      } else {
        navigateToRoute('incidents')
      }
    } catch (e) {
      Swal.close()

      await Swal.fire({
        title: 'Connection Error',
        text: 'Unable to connect to server. Please check your connection and try again.',
        icon: 'error',
        confirmButtonText: 'OK',
        confirmButtonColor: '#1890ff',
        allowOutsideClick: false,
        allowEscapeKey: false
      })
    } finally {
      setLoading(false)
    }
  }

  // Show confirmation dialog before submitting
  const onSubmit = async (values) => {
    const result = await Swal.fire({
      title: 'Confirm Create Incident',
      html: `<p>Are you sure you want to create this Incident?</p>
             <ul style="text-align: left; margin-top: 12px; padding-left: 20px;">
               <li><strong>Title:</strong> ${values.title || 'N/A'}</li>
               <li><strong>Category:</strong> ${values.category || 'N/A'}</li>
               <li><strong>Severity:</strong> ${values.severity || 'N/A'}</li>
             </ul>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Create',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1890ff',
      cancelButtonColor: '#d33',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    })

    if (result.isConfirmed) {
      Swal.fire({
        title: 'Creating Incident...',
        html: 'Please wait while we save your incident...',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: async () => {
          Swal.showLoading()
          try {
            await performSubmit(values)
          } catch (e) {
            // Error handled in performSubmit
          }
        }
      })
    }
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <Card style={{ marginBottom: '24px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space direction="vertical" size={0}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('incidents')}
                style={{ paddingLeft: 0 }}
              >
                Back to Incidents
              </Button>
              <Title level={2} style={{ margin: 0, marginTop: 8 }}>Create New Incident</Title>
              <p style={{ margin: '8px 0 0 0', color: '#666', fontSize: '14px' }}>
                Fill in the incident details below. Fields marked with <span style={{ color: '#ff4d4f' }}>*</span> are required.
              </p>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Form */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={18}>
          <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
            <Form
              form={form}
              layout="vertical"
              onFinish={onSubmit}
              autoComplete="off"
            >
              {/* Section 1: Basic Information */}
              <div style={{ marginBottom: '32px' }}>
                <Title level={4} style={{ marginBottom: '16px', color: '#1890ff' }}>
                  Basic Information
                </Title>
                <Divider style={{ margin: '0 0 16px 0' }} />

                {/* Title */}
                <Form.Item
                  label="Incident Title"
                  name="title"
                  rules={[
                    { required: true, message: 'Incident title is required' },
                    { min: 5, message: 'Title must be at least 5 characters' }
                  ]}
                >
                  <Input
                    placeholder="Enter incident title"
                  />
                </Form.Item>

                {/* Description */}
                <Form.Item
                  label="Description"
                  name="description"
                  rules={[
                    { required: true, message: 'Description is required' }
                  ]}
                >
                  <TextArea
                    placeholder="Provide detailed information about the incident"
                    rows={5}
                  />
                </Form.Item>
              </div>

              {/* Section 2: Classification */}
              <div style={{ marginBottom: '32px' }}>
                <Title level={4} style={{ marginBottom: '16px', color: '#1890ff' }}>
                  Classification
                </Title>
                <Divider style={{ margin: '0 0 16px 0' }} />

                {/* Severity and Priority */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Severity"
                      name="severity"
                      rules={[{ required: true, message: 'Severity is required' }]}
                    >
                      <Select
                        placeholder="Select severity level"
                        options={SEVERITY_OPTIONS}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Priority"
                      name="priority"
                      initialValue="Medium"
                    >
                      <Select
                        placeholder="Select priority"
                        options={PRIORITY_OPTIONS}
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Status and Category */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Status"
                      name="status"
                      initialValue="New"
                    >
                      <Select
                        placeholder="Select status"
                        options={STATUS_OPTIONS}
                      />
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Category"
                      name="category"
                      rules={[{ required: true, message: 'Category is required' }]}
                    >
                      <Select
                        placeholder="Select category"
                        options={CATEGORY_OPTIONS}
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Section 3: Assignment & Reporting */}
              <div style={{ marginBottom: '32px' }}>
                <Title level={4} style={{ marginBottom: '16px', color: '#1890ff' }}>
                  Assignment & Reporting
                </Title>
                <Divider style={{ margin: '0 0 16px 0' }} />

                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Assigned To"
                      name="assigned_to"
                    >
                      <Select
                        placeholder="Search and select user"
                        showSearch
                        allowClear
                        loading={assignedToSearchLoading}
                        onSearch={handleAssignedToSearch}
                        onSelect={handleAssignedToSelect}
                        onClear={handleAssignedToClear}
                        filterOption={false}
                        notFoundContent={assignedToSearchLoading ? 'Searching...' : 'No users found'}
                        size="large"
                      >
                        {assignedToSearchResults.map(user => (
                          <Select.Option key={user.name} value={user.name}>
                            {user.full_name} ({user.name})
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Reported By"
                      name="reported_by"
                    >
                      <Input
                        placeholder="Reporter email or name"
                        size="large"
                      />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Assigned To Full Name Display */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Assigned To Full Name">
                      <Input
                        disabled
                        value={assignedToFullName}
                        placeholder="Auto-populated when user is selected"
                      />
                    </Form.Item>
                  </Col>
                </Row>
              </div>

              {/* Section 4: Impact & Systems */}
              <div style={{ marginBottom: '32px' }}>
                <Title level={4} style={{ marginBottom: '16px', color: '#1890ff' }}>
                  Impact & Systems
                </Title>
                <Divider style={{ margin: '0 0 16px 0' }} />

                {/* Affected Systems */}
                <Form.Item
                  label="Affected Systems"
                  name="affected_systems"
                >
                  <TextArea
                    placeholder="List affected systems (comma separated)"
                    rows={3}
                  />
                </Form.Item>

                {/* Impact Description */}
                <Form.Item
                  label="Impact Description"
                  name="impact_description"
                >
                  <TextArea
                    placeholder="Describe the business impact of this incident"
                    rows={3}
                  />
                </Form.Item>
              </div>

              {/* Form Actions */}
              <Divider />
              <Row gutter={16} style={{ marginTop: '24px' }}>
                <Col>
                  <Button
                    type="primary"
                    size="large"
                    icon={<SaveOutlined />}
                    loading={loading}
                    onClick={() => form.submit()}
                  >
                    Create Incident
                  </Button>
                </Col>
                <Col>
                  <Button
                    size="large"
                    onClick={() => navigateToRoute('incidents')}
                  >
                    Cancel
                  </Button>
                </Col>
              </Row>
            </Form>
          </Card>
        </Col>

        {/* Right Sidebar - Help/Info */}
        <Col xs={24} lg={6}>
          <Card
            title="Quick Tips & Guidance"
            style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
            size="small"
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Severity */}
              <div>
                <Tag color="red">Severity</Tag>
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: '500', color: '#262626' }}>
                  Impact Level Classification
                </p>
                <ul style={{ fontSize: '12px', margin: '4px 0', paddingLeft: '20px', color: '#666' }}>
                  <li><strong>S1 - Critical:</strong> System down, major data loss</li>
                  <li><strong>S2 - High:</strong> Degraded performance, limited functionality</li>
                  <li><strong>S3 - Medium:</strong> Non-critical functions affected</li>
                  <li><strong>S4 - Low:</strong> Minor issue, workaround available</li>
                </ul>
              </div>

              {/* Priority */}
              <div>
                <Tag color="purple">Priority</Tag>
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: '500', color: '#262626' }}>
                  Resolution Urgency
                </p>
                <ul style={{ fontSize: '12px', margin: '4px 0', paddingLeft: '20px', color: '#666' }}>
                  <li><strong>Critical:</strong> Resolve immediately</li>
                  <li><strong>High:</strong> Resolve within hours</li>
                  <li><strong>Medium:</strong> Resolve within 1-2 days</li>
                  <li><strong>Low:</strong> Resolve as time permits</li>
                </ul>
              </div>

              {/* Status */}
              <div>
                <Tag color="orange">Status</Tag>
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: '500', color: '#262626' }}>
                  Incident Lifecycle
                </p>
                <ul style={{ fontSize: '12px', margin: '4px 0', paddingLeft: '20px', color: '#666' }}>
                  <li><strong>New:</strong> Initial state when created</li>
                  <li><strong>Open:</strong> Acknowledged and being tracked</li>
                  <li><strong>Acknowledged:</strong> Team has reviewed it</li>
                  <li><strong>In Progress:</strong> Being actively resolved</li>
                  <li><strong>Resolved:</strong> Solution implemented</li>
                  <li><strong>Closed:</strong> Verified and closed</li>
                </ul>
              </div>

              {/* Category */}
              <div>
                <Tag color="green">Category</Tag>
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: '500', color: '#262626' }}>
                  Incident Type/Domain
                </p>
                <ul style={{ fontSize: '12px', margin: '4px 0', paddingLeft: '20px', color: '#666' }}>
                  <li><strong>Infrastructure:</strong> Servers, hardware, networking</li>
                  <li><strong>Security:</strong> Breaches, vulnerabilities, access issues</li>
                  <li><strong>Application:</strong> Software bugs, crashes, errors</li>
                  <li><strong>Database:</strong> Data corruption, performance, queries</li>
                  <li><strong>API:</strong> Integration, endpoint failures</li>
                  <li><strong>Performance:</strong> Slow response, bottlenecks</li>
                </ul>
              </div>

              {/* Assigned To */}
              <div>
                <Tag color="cyan">Assigned To</Tag>
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: '500', color: '#262626' }}>
                  Assign Ownership
                </p>
                <p style={{ fontSize: '12px', margin: '4px 0', color: '#666' }}>
                  Search by name or email. The system will auto-populate the full name. This helps track responsibility and accountability.
                </p>
              </div>

              {/* Best Practices */}
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#262626', margin: '0 0 8px 0' }}>
                  📋 Best Practices:
                </p>
                <ul style={{ fontSize: '12px', margin: '4px 0', paddingLeft: '20px', color: '#666' }}>
                  <li>Provide descriptive title and details</li>
                  <li>Assign immediately for tracking</li>
                  <li>Update status as work progresses</li>
                  <li>Document affected systems clearly</li>
                </ul>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default IncidentCreateForm
