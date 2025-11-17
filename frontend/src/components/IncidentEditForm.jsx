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
  Spin,
  Empty,
  Tag,
  DatePicker
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined
} from '@ant-design/icons'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import useIncidentsStore from '../stores/incidentsStore'
import useNavigationStore from '../stores/navigationStore'
import useIncidentNavigation from '../hooks/useIncidentNavigation'
import { clearCache } from '../services/api/config'

const { Title } = Typography
const { TextArea } = Input

const SEVERITY_OPTIONS = [
  { label: 'Critical', value: 'Critical' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' }
]

const PRIORITY_OPTIONS = [
  { label: 'Critical', value: 'Critical' },
  { label: 'High', value: 'High' },
  { label: 'Medium', value: 'Medium' },
  { label: 'Low', value: 'Low' }
]

const STATUS_OPTIONS = [
  { label: 'Open', value: 'Open' },
  { label: 'In Progress', value: 'In Progress' },
  { label: 'Resolved', value: 'Resolved' },
  { label: 'Closed', value: 'Closed' }
]

const CATEGORY_OPTIONS = [
  { label: 'Security', value: 'Security' },
  { label: 'Infrastructure', value: 'Infrastructure' },
  { label: 'Application', value: 'Application' },
  { label: 'Compliance', value: 'Compliance' },
  { label: 'Performance', value: 'Performance' },
  { label: 'Other', value: 'Other' }
]

/**
 * IncidentEditForm Component
 * Allows users to edit existing incidents
 */
function IncidentEditForm({ incidentId, navigateToRoute }) {
  const [form] = Form.useForm()
  const [loadError, setLoadError] = useState(null)
  const [assignedToSearchResults, setAssignedToSearchResults] = useState([])
  const [assignedToSearchLoading, setAssignedToSearchLoading] = useState(false)
  const [assignedToFullName, setAssignedToFullName] = useState('')
  const [projectSearchResults, setProjectSearchResults] = useState([])
  const [projectSearchLoading, setProjectSearchLoading] = useState(false)
  const [projectName, setProjectName] = useState('')

  // Use store state instead of local state
  const {
    selectedIncident,
    loading,
    fetchIncident,
    updateIncident
  } = useIncidentsStore()

  // Use reliable incident navigation
  const { viewIncident: navViewIncident, goToIncidentsList } = useIncidentNavigation()

  // Null safety checks for required props
  if (!incidentId) {
    console.error('[IncidentEditForm] incidentId prop is missing')
    return (
      <Empty
        description="Error: Incident ID is missing"
        style={{ marginTop: '50px' }}
      >
        <p>Cannot edit incident without an ID. Please go back.</p>
      </Empty>
    )
  }

  if (!navigateToRoute || typeof navigateToRoute !== 'function') {
    console.error('[IncidentEditForm] navigateToRoute prop is missing or not a function')
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
      const responseData = result.message || result

      if (responseData && responseData.success && responseData.data && Array.isArray(responseData.data)) {
        setAssignedToSearchResults(responseData.data)
      } else {
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
      setAssignedToFullName(selectedUser.full_name || selectedUser.name)
    }
  }

  // Handle assigned to field clear
  const handleAssignedToClear = () => {
    setAssignedToFullName('')
    setAssignedToSearchResults([])
  }

  // Handle project search
  const handleProjectSearch = async (searchValue) => {
    if (!searchValue || searchValue.length < 1) {
      setProjectSearchResults([])
      return
    }

    try {
      setProjectSearchLoading(true)
      const response = await fetch(`/api/resource/Project?fields=["name","title"]&filters=[["name","like","%${searchValue}%"]]`, {
        method: 'GET',
        headers: {
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      const result = await response.json()
      if (result && result.data && Array.isArray(result.data)) {
        setProjectSearchResults(result.data)
      } else {
        setProjectSearchResults([])
      }
    } catch (error) {
      console.error('Error searching projects:', error)
      setProjectSearchResults([])
    } finally {
      setProjectSearchLoading(false)
    }
  }

  // Handle project selection
  const handleProjectSelect = (value) => {
    const selectedProject = projectSearchResults.find(project => project.name === value)
    if (selectedProject) {
      setProjectName(selectedProject.name)
    }
  }

  // Handle project field clear
  const handleProjectClear = () => {
    setProjectSearchResults([])
    setProjectName('')
  }

  // Disable future dates in date picker
  const disableFutureDate = (current) => {
    // Disable if date is after today
    return current && current > dayjs().endOf('day')
  }

  // Generate timeline entry for "Incident Reported"
  const generateIncidentReportedTimeline = (reportedDate) => {
    return {
      event_timestamp: reportedDate || dayjs().format('YYYY-MM-DD HH:mm:ss'),
      event_type: 'Incident Reported',
      description: 'Initial incident report created',
      user: window.frappe?.session?.user || 'System'
    }
  }

  // Load incident data on mount and populate form
  useEffect(() => {
    const loadIncident = async () => {
      if (!incidentId) return

      try {
        console.log('[IncidentEditForm] Loading incident:', incidentId)

        const incident = await fetchIncident(incidentId)

        if (incident) {
          // Validate required fields exist
          if (!incident.title || !incident.name) {
            throw new Error('Invalid incident data received from server')
          }

          console.log('[IncidentEditForm] Full incident data received:', incident)
          console.log('[IncidentEditForm] assigned_to:', incident.assigned_to)
          console.log('[IncidentEditForm] assigned_to_full_name:', incident.assigned_to_full_name)

          // Populate form with incident data (null-safe)
          form.setFieldsValue({
            title: incident.title || '',
            description: incident.description || '',
            severity: incident.severity || '',
            priority: incident.priority || '',
            status: incident.status || '',
            category: incident.category || '',
            project: incident.project || '',
            reported_date: incident.reported_date ? dayjs(incident.reported_date) : null,
            assigned_to: incident.assigned_to || '',
            reported_by: incident.reported_by || '',
            affected_systems: incident.affected_systems || '',
            impact_description: incident.impact_description || '',
            root_cause: incident.root_cause || '',
            resolution_notes: incident.resolution_notes || ''
          })

          // Set assigned to full name if available
          console.log('[IncidentEditForm] Raw incident.assigned_to_full_name:', incident.assigned_to_full_name)
          console.log('[IncidentEditForm] Raw incident.assigned_to:', incident.assigned_to)
          console.log('[IncidentEditForm] Type of assigned_to_full_name:', typeof incident.assigned_to_full_name)
          console.log('[IncidentEditForm] Is it the same as assigned_to?', incident.assigned_to_full_name === incident.assigned_to)

          if (incident.assigned_to_full_name && incident.assigned_to_full_name !== incident.assigned_to) {
            console.log('[IncidentEditForm] ✅ Setting assigned_to_full_name from backend:', incident.assigned_to_full_name)
            setAssignedToFullName(incident.assigned_to_full_name)
          } else if (incident.assigned_to_full_name === incident.assigned_to) {
            console.log('[IncidentEditForm] ⚠️ assigned_to_full_name equals assigned_to (both are email)')
            setAssignedToFullName(incident.assigned_to)
          } else if (incident.assigned_to) {
            console.log('[IncidentEditForm] ⚠️ Fallback to assigned_to:', incident.assigned_to)
            setAssignedToFullName(incident.assigned_to)
          } else {
            console.warn('[IncidentEditForm] ❌ No assigned_to or assigned_to_full_name found!')
            setAssignedToFullName('')
          }

          console.log('[IncidentEditForm] After state set, assignedToFullName will be:', incident.assigned_to_full_name || incident.assigned_to || '')

          // Set project name if available
          if (incident.project_name) {
            console.log('[IncidentEditForm] Setting projectName from backend:', incident.project_name)
            setProjectName(incident.project_name)
          } else if (incident.project) {
            console.log('[IncidentEditForm] Fallback to project:', incident.project)
            setProjectName(incident.project)
          } else {
            console.warn('[IncidentEditForm] No project or project_name found!')
            setProjectName('')
          }

          console.log('[IncidentEditForm] Incident loaded successfully:', incident.name)
        } else {
          message.error('Failed to load incident details')
        }
      } catch (error) {
        console.error('[IncidentEditForm] Error loading incident:', error)
        const errorMsg = error?.message || 'Failed to load incident details'
        setLoadError(errorMsg)
        message.error(errorMsg)
      }
    }

    loadIncident()
  }, [incidentId, fetchIncident, form])

  const handleSubmit = async (values) => {
    try {
      if (!selectedIncident || !selectedIncident.name) {
        message.error('Incident data not available')
        return
      }

      console.log('[IncidentEditForm] Updating incident:', incidentId, values)

      // Prepare update data
      const updateData = {
        title: values.title || '',
        description: values.description || '',
        severity: values.severity || '',
        priority: values.priority || '',
        status: values.status || '',
        category: values.category || '',
        assigned_to: values.assigned_to || '',
        reported_by: values.reported_by || '',
        affected_systems: values.affected_systems || '',
        impact_description: values.impact_description || '',
        root_cause: values.root_cause || '',
        resolution_notes: values.resolution_notes || ''
      }

      // Use store to update incident
      const updatedIncident = await updateIncident(selectedIncident.name || selectedIncident.id, updateData)

      if (updatedIncident) {
        console.log('[IncidentEditForm] Updated incident successfully:', updatedIncident)

        // Clear cache and refetch the incident to ensure fresh data is available
        clearCache(`incident-${selectedIncident.name || selectedIncident.id}`)
        await fetchIncident(selectedIncident.name || selectedIncident.id)

        await Swal.fire({
          icon: 'success',
          title: 'Incident Updated',
          text: `Incident "${values.title}" has been updated successfully`,
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 3000
        })

        // Navigate back to incident detail
        console.log('[IncidentEditForm] Incident updated successfully, navigating back to detail')
        navViewIncident(incidentId)
      } else {
        console.error('[IncidentEditForm] Update failed')
        await Swal.fire({
          icon: 'error',
          title: 'Failed to Update Incident',
          text: 'An error occurred while updating the incident',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000
        })
      }
    } catch (error) {
      console.error('[IncidentEditForm] Error updating incident:', error)
      await Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error?.message || 'An error occurred while updating the incident',
        toast: true,
        position: 'top-end',
        showConfirmButton: false,
        timer: 5000
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

  if (!loading && !selectedIncident) {
    const handleBackClick = () => {
      console.log('[IncidentEditForm] Back button clicked from empty state')
      goToIncidentsList()
    }

    const errorDescription = loadError || 'Incident not found'

    return (
      <Empty
        description={errorDescription}
        style={{ marginTop: '50px' }}
      >
        <Space direction="vertical" style={{ marginTop: '16px' }}>
          <div style={{ color: '#666', fontSize: '14px' }}>{errorDescription}</div>
          <Button type="primary" onClick={handleBackClick}>
            Back to Incidents
          </Button>
        </Space>
      </Empty>
    )
  }

  if (!selectedIncident) {
    return null // Should not reach here due to earlier check, but safety fallback
  }

  // Navigation helpers
  const handleBackToDetail = () => {
    console.log('[IncidentEditForm] Back to detail button clicked')
    navViewIncident(incidentId)
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
                onClick={handleBackToDetail}
              >
                Back to Incident
              </Button>
              <Title level={2} style={{ margin: 0 }}>Edit Incident: {selectedIncident.title}</Title>
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
                  <Input placeholder="Enter incident title" />
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
                    placeholder="Enter incident description"
                    rows={4}
                  />
                </Form.Item>

                {/* Reported Date */}
                <Form.Item
                  label="Reported Date"
                  name="reported_date"
                >
                  <DatePicker
                    showTime
                    format="YYYY-MM-DD HH:mm:ss"
                    placeholder="Select incident report date and time"
                    disabledDate={disableFutureDate}
                    size="large"
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
                      rules={[{ required: true, message: 'Status is required' }]}
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
                      <Input placeholder="Enter reporter email or name" />
                    </Form.Item>
                  </Col>
                </Row>

                {/* Assigned To Full Name Display and Project */}
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
                  <Col xs={24} sm={12}>
                    <Form.Item
                      label="Project"
                      name="project"
                      rules={[{ required: true, message: 'Project is required' }]}
                    >
                      <Select
                        placeholder="Search and select project"
                        showSearch
                        allowClear
                        loading={projectSearchLoading}
                        onSearch={handleProjectSearch}
                        onSelect={handleProjectSelect}
                        onClear={handleProjectClear}
                        filterOption={false}
                        notFoundContent={projectSearchLoading ? 'Searching...' : 'No projects found'}
                      >
                        {projectSearchResults.map(project => (
                          <Select.Option key={project.name} value={project.name}>
                            {project.title || project.name}
                          </Select.Option>
                        ))}
                      </Select>
                    </Form.Item>
                  </Col>
                </Row>

                {/* Project Name Display */}
                <Row gutter={[16, 16]}>
                  <Col xs={24} sm={12}>
                    <Form.Item label="Project Name">
                      <Input
                        disabled
                        value={projectName}
                        placeholder="Auto-populated when project is selected"
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
                    placeholder="Enter affected systems (comma separated)"
                    rows={3}
                  />
                </Form.Item>

                {/* Impact Description */}
                <Form.Item
                  label="Impact Description"
                  name="impact_description"
                >
                  <TextArea
                    placeholder="Describe the impact of this incident"
                    rows={3}
                  />
                </Form.Item>
              </div>

              {/* Section 5: Resolution */}
              <div style={{ marginBottom: '32px' }}>
                <Title level={4} style={{ marginBottom: '16px', color: '#1890ff' }}>
                  Resolution
                </Title>
                <Divider style={{ margin: '0 0 16px 0' }} />

                {/* Root Cause */}
                <Form.Item
                  label="Root Cause"
                  name="root_cause"
                >
                  <TextArea
                    placeholder="Describe the root cause"
                    rows={3}
                  />
                </Form.Item>

                {/* Resolution Notes */}
                <Form.Item
                  label="Resolution Notes"
                  name="resolution_notes"
                >
                  <TextArea
                    placeholder="Enter resolution notes"
                    rows={3}
                  />
                </Form.Item>
              </div>

              <Divider />

              {/* Form Actions */}
              <Row gutter={16} style={{ marginTop: '24px' }}>
                <Col>
                  <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    loading={loading}
                    onClick={() => form.submit()}
                  >
                    Save Changes
                  </Button>
                </Col>
                <Col>
                  <Button
                    onClick={handleBackToDetail}
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
                  <li><strong>Critical:</strong> System down, major data loss</li>
                  <li><strong>High:</strong> Degraded performance, limited functionality</li>
                  <li><strong>Medium:</strong> Non-critical functions affected</li>
                  <li><strong>Low:</strong> Minor issue, workaround available</li>
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

              {/* Project */}
              <div>
                <Tag color="gold">Project</Tag>
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: '500', color: '#262626' }}>
                  Link to Project
                </p>
                <p style={{ fontSize: '12px', margin: '4px 0', color: '#666' }}>
                  Select the project this incident is related to. This is required and helps organize incidents by project scope. Search by project name.
                </p>
              </div>

              {/* Reported Date */}
              <div>
                <Tag color="blue">Reported Date</Tag>
                <p style={{ fontSize: '12px', margin: '8px 0 4px 0', fontWeight: '500', color: '#262626' }}>
                  When Was Incident Reported
                </p>
                <p style={{ fontSize: '12px', margin: '4px 0', color: '#666' }}>
                  Select the date and time when the incident was initially reported. Past dates are allowed, future dates are disabled. This is used for the incident timeline.
                </p>
              </div>

              {/* Best Practices */}
              <Divider style={{ margin: '12px 0' }} />
              <div>
                <p style={{ fontSize: '12px', fontWeight: '500', color: '#262626', margin: '0 0 8px 0' }}>
                  📋 Best Practices:
                </p>
                <ul style={{ fontSize: '12px', margin: '4px 0', paddingLeft: '20px', color: '#666' }}>
                  <li>Keep descriptions up to date</li>
                  <li>Update status as work progresses</li>
                  <li>Document resolution steps</li>
                  <li>Add root cause analysis</li>
                </ul>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default IncidentEditForm
