import { useEffect, useState } from 'react'
import {
  Card,
  Typography,
  Form,
  Input,
  Select,
  DatePicker,
  TimePicker,
  Tabs,
  Checkbox,
  Button,
  Row,
  Col,
  Space,
  message
} from 'antd'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import useAuthStore from '../stores/authStore'
import useNavigationStore from '../stores/navigationStore'
import RichTextEditor from './RichTextEditor'

const { Title } = Typography
const { Option } = Select
const { TabPane } = Tabs

// Helper function to parse Frappe's _server_messages field
const parseFrappeServerMessages = (serverMessages) => {
  if (!serverMessages) return []

  try {
    // _server_messages is a JSON-encoded string containing an array of JSON-encoded message objects
    const messagesArray = JSON.parse(serverMessages)
    const parsedMessages = []

    for (const msgStr of messagesArray) {
      try {
        const msgObj = JSON.parse(msgStr)
        if (msgObj.message) {
          parsedMessages.push(msgObj.message)
        }
      } catch (e) {
        // If parsing individual message fails, use the string as-is
        parsedMessages.push(msgStr)
      }
    }

    return parsedMessages
  } catch (e) {

    return []
  }
}

export default function ChangeRequestForm({ mode = 'create', id = null }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('1')
  const [projects, setProjects] = useState([])
  const [notFound, setNotFound] = useState(false)

  const { hasPermission, isAuthenticated } = useAuthStore()
  const { navigateToRoute } = useNavigationStore()
  const canWrite = isAuthenticated === true ? hasPermission('write:change-requests') : false

  // Protect route: wait until auth is resolved to avoid false negatives
  useEffect(() => {
    if (isAuthenticated === null) return
    if (isAuthenticated === false) {
      // App-level UnauthorizedPage will render; no navigation here
      return
    }
    if (!canWrite) {
      message.error('You do not have permission to create or edit Change Requests')
      navigateToRoute('change-requests')
    }
  }, [isAuthenticated, canWrite, navigateToRoute])

  // Load projects
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/method/frappe_devsecops_dashboard.api.change_request.get_projects', {
          credentials: 'include'
        })
        if (res.ok) {
          const response = await res.json()
          const data = response.message || response
          setProjects(data.data || [])
        } else {
          setProjects([])
        }
      } catch {
        setProjects([])
      }
    }
    load()
  }, [])

  // Load record in edit mode
  useEffect(() => {
    if (mode !== 'edit' || !id) return
    const loadRecord = async () => {
      setLoading(true)
      try {
        const res = await fetch(`/api/method/frappe_devsecops_dashboard.api.change_request.get_change_request?name=${encodeURIComponent(id)}`, {
          credentials: 'include'
        })
        if (!res.ok) {
          setNotFound(true)
          throw new Error('Not found')
        }
        const response = await res.json()
        const data = response.message || response

        if (!data.success) {
          setNotFound(true)
          throw new Error(data.error || 'Not found')
        }

        const r = data.data
        form.setFieldsValue({
          ...r,
          // Provide defaults for required fields that might be null in the database
          submission_date: r.submission_date ? dayjs(r.submission_date) : dayjs(), // Default to today if null
          change_category: r.change_category || 'Standard Change', // Default to Standard Change if null
          approval_status: r.approval_status || 'Pending Review', // Default to Pending Review if null
          // Optional fields - keep as null if not set
          implementation_date: r.implementation_date ? dayjs(r.implementation_date) : null,
          implementation_time: r.implementation_time ? dayjs(r.implementation_time, 'HH:mm:ss') : null,
          downtime_expected: r.downtime_expected ? true : false
        })
      } catch (e) {
        message.error('Unable to load Change Request: ' + (e?.message || 'Not found'))
        // stay on page and show notFound state; do not navigate away
      } finally {
        setLoading(false)
      }
    }
    loadRecord()
  }, [mode, id, form, navigateToRoute])

  // Unsaved changes warning (simple)
  useEffect(() => {
    const handler = (e) => {
      if (form.isFieldsTouched()) {
        e.preventDefault(); e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [form])

  // Actual submission logic (called after confirmation)
  const performSubmit = async (values) => {
    try {
      setLoading(true)

      const payload = {
        ...values,
        submission_date: values.submission_date ? values.submission_date.format('YYYY-MM-DD') : null,
        implementation_date: values.implementation_date ? values.implementation_date.format('YYYY-MM-DD') : null,
        implementation_time: values.implementation_time ? values.implementation_time.format('HH:mm:ss') : null,
        downtime_expected: values.downtime_expected ? 1 : 0
      }

      let res
      let endpoint

      if (mode === 'edit' && id) {
        endpoint = '/api/method/frappe_devsecops_dashboard.api.change_request.update_change_request'
        // Frappe expects form data, not JSON body
        const formData = new URLSearchParams()
        formData.append('name', id)
        formData.append('data', JSON.stringify(payload))
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include',
          body: formData.toString()
        })
      } else {
        endpoint = '/api/method/frappe_devsecops_dashboard.api.change_request.create_change_request'
        // Frappe expects form data, not JSON body
        const formData = new URLSearchParams()
        formData.append('data', JSON.stringify(payload))
        res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include',
          body: formData.toString()
        })
      }

      if (!res.ok) {
        let errorMessages = []
        try {
          const err = await res.json()

          // Parse _server_messages if available
          if (err._server_messages) {
            errorMessages = parseFrappeServerMessages(err._server_messages)
          }

          // Fallback to other error fields
          if (errorMessages.length === 0) {
            if (err.message) {
              errorMessages.push(err.message)
            } else if (err.error) {
              errorMessages.push(err.error)
            }
          }
        } catch (parseErr) {

        }

        // Close loading dialog and show error
        Swal.close()

        let errorTitle = 'Error'
        let errorText = 'Failed to save Change Request. Please try again.'

        if (res.status === 401 || res.status === 403) {
          errorTitle = 'Permission Denied'
          errorText = 'You do not have permission to perform this action.'

        } else if (res.status === 404) {
          errorTitle = 'Not Found'
          errorText = 'Change Request not found.'

        } else if (res.status === 400 || errorMessages.length > 0) {
          errorTitle = 'Validation Error'
          if (errorMessages.length > 0) {
            errorText = errorMessages.length === 1
              ? errorMessages[0]
              : errorMessages.join('\n')

          } else {
            errorText = 'Please check your input and try again.'

          }
        } else if (res.status >= 500) {
          errorTitle = 'Server Error'
          errorText = 'Server error occurred. Please try again later.'

        } else {
          errorText = errorMessages.length > 0 ? errorMessages.join('; ') : 'Failed to save Change Request.'

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
        // Parse error messages from the response
        let errorMessages = []

        // Check for _server_messages in the response
        if (response._server_messages) {
          errorMessages = parseFrappeServerMessages(response._server_messages)
        }

        // Fallback to data.error
        if (errorMessages.length === 0 && data.error) {
          errorMessages.push(data.error)
        }

        // Close loading dialog and show error
        Swal.close()
        const errorText = errorMessages.length > 0
          ? (errorMessages.length === 1 ? errorMessages[0] : errorMessages.join('\n'))
          : 'Failed to save Change Request. Please try again.'

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

      // Close loading dialog
      Swal.close()

      // Show success message
      await Swal.fire({
        title: 'Success!',
        text: data.message || 'Change Request saved successfully',
        icon: 'success',
        timer: 2000,
        timerProgressBar: true,
        showConfirmButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
      })

      navigateToRoute('change-requests')
    } catch (e) {



      // Close loading dialog and show connection error
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
    const isEdit = mode === 'edit' && id

    const result = await Swal.fire({
      title: isEdit ? 'Confirm Update Change Request' : 'Confirm Create Change Request',
      html: isEdit ?
        `<p>Are you sure you want to save changes to Change Request <strong>${id}</strong>?</p>` :
        `<p>Are you sure you want to create this Change Request?</p>
         <ul style="text-align: left; margin-top: 12px; padding-left: 20px;">
           <li><strong>Title:</strong> ${values.title || 'N/A'}</li>
           <li><strong>System Affected:</strong> ${values.system_affected || 'N/A'}</li>
           <li><strong>Originator:</strong> ${values.originator_name || 'N/A'}</li>
         </ul>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: isEdit ? 'Update' : 'Create',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#1890ff',
      cancelButtonColor: '#d33',
      reverseButtons: true,
      allowOutsideClick: false,
      allowEscapeKey: false
    })

    if (result.isConfirmed) {
      // Show loading dialog immediately
      Swal.fire({
        title: isEdit ? 'Updating Change Request...' : 'Creating Change Request...',
        html: 'Please wait while we save your changes...',
        icon: 'info',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: async () => {
          Swal.showLoading()
          try {
            await performSubmit(values)
          } catch (e) {

          }
        }
      })
    }
  }

  // Switch to the tab containing the first validation error and show a message
  const fieldTabMap = {
    title: '1', prepared_for: '1', submission_date: '1', project: '1', system_affected: '1', originator_name: '1', originator_organization: '1', originators_manager: '1',
    change_category: '2', downtime_expected: '2', detailed_description: '2', release_notes: '2',
    implementation_date: '3', implementation_time: '3', testing_plan: '3', rollback_plan: '3',
    approval_status: '4', workflow_state: '4'
  }
  const onFinishFailed = (info) => {
    // Show detailed error message
    const errorFieldNames = info?.errorFields?.map(f => {
      const fieldName = Array.isArray(f?.name) ? f.name[0] : f?.name
      return fieldName
    }) || []

    message.error(`Please fill all required fields. Missing: ${errorFieldNames.join(', ')}`, 8)

    const first = info?.errorFields?.[0]
    const firstName = Array.isArray(first?.name) ? first.name[0] : first?.name
    const tab = fieldTabMap[firstName]
    if (tab && tab !== activeTab) setActiveTab(tab)
  }


  if (notFound) {
    return (
      <Card>
        <Space direction="vertical">
          <Title level={4}>Change Request not found</Title>
          <Button type="primary" onClick={() => navigateToRoute('change-requests')}>Back to List</Button>
        </Space>
      </Card>
    )
  }

  return (
    <Card loading={loading}>
      <Space style={{ marginBottom: 16 }}>
        <Button onClick={() => navigateToRoute('change-requests')}>Back to List</Button>
        <Title level={4} style={{ margin: 0 }}>
          {mode === 'edit' ? `Edit Change Request${id ? `: ${id}` : ''}` : 'New Change Request'}
        </Title>
      </Space>

      <Form form={form} layout="vertical" onFinish={onSubmit} onFinishFailed={onFinishFailed} validateTrigger="onSubmit">
        <Tabs activeKey={activeTab} onChange={setActiveTab}>
          <TabPane tab="Basic Information" key="1">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="title" label="Change Request Title" rules={[{ required: true }]}>
                  <Input placeholder="Enter change request title" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="prepared_for" label="Prepared For">
                  <Input placeholder="Enter department or team" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="submission_date" label="Date Submitted" initialValue={dayjs()} rules={[{ required: true }]}>
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="project" label="Project (Link)" rules={[{ required: true }]}>
                  <Select placeholder="Select project" showSearch filterOption={(input, option) => (option?.children ?? '').toLowerCase().includes(input.toLowerCase())}>
                    {projects.map(p => (
                      <Option key={p.name} value={p.name}>{p.project_name || p.name}</Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="system_affected" label="System/Application Affected" rules={[{ required: true }]}>
                  <Input placeholder="Enter system or application name" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="originator_name" label="Originator Name" rules={[{ required: true }]}>
                  <Input placeholder="Enter originator name" />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="originator_organization" label="Originator Organization">
                  <Input placeholder="Enter organization" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="originators_manager" label="Originator's Manager">
                  <Input placeholder="Enter manager name" />
                </Form.Item>
              </Col>
            </Row>
          </TabPane>

          <TabPane tab="Change Details" key="2">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="change_category" label="Change Request Category" rules={[{ required: true }]}>
                  <Select placeholder="Select category">
                    <Option value="Major Change">Major Change</Option>
                    <Option value="Minor Change">Minor Change</Option>
                    <Option value="Standard Change">Standard Change</Option>
                    <Option value="Emergency Change">Emergency Change</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="downtime_expected" valuePropName="checked" label=" ">
                  <Checkbox>Downtime Expected</Checkbox>
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="detailed_description" label="Detailed Description of Proposed Change" rules={[{ required: true }]}>
              <RichTextEditor placeholder="Describe the proposed change in detail..." />
            </Form.Item>
            <Form.Item name="release_notes" label="Release Notes">
              <RichTextEditor placeholder="Enter release notes..." />
            </Form.Item>
          </TabPane>

          <TabPane tab="Implementation" key="3">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="implementation_date" label="Implementation/Deployment Date">
                  <DatePicker style={{ width: '100%' }} />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="implementation_time" label="Implementation/Deployment Time">
                  <TimePicker style={{ width: '100%' }} format="HH:mm" />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item name="testing_plan" label="Testing and Validation Plan">
              <RichTextEditor placeholder="Describe the testing and validation plan..." />
            </Form.Item>
            <Form.Item name="rollback_plan" label="Rollback/Backout Plan">
              <RichTextEditor placeholder="Describe the rollback/backout plan..." />
            </Form.Item>
          </TabPane>

          <TabPane tab="Approval" key="4">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="approval_status" label="Change Request Acceptance" rules={[{ required: true }]} initialValue="Pending Review">
                  <Select placeholder="Select approval status">
                    <Option value="">None</Option>
                    <Option value="Pending Review">Pending Review</Option>
                    <Option value="Rework">Rework</Option>
                    <Option value="Not Accepted">Not Accepted</Option>
                    <Option value="Withdrawn">Withdrawn</Option>
                    <Option value="Deferred">Deferred</Option>
                    <Option value="Approved for Implementation">Approved for Implementation</Option>
                  </Select>
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item name="workflow_state" label="Workflow State">
                  <Select placeholder="Select workflow state">
                    <Option value="">None</Option>
                    <Option value="Draft">Draft</Option>
                    <Option value="Pending Approval">Pending Approval</Option>
                    <Option value="Approved">Approved</Option>
                    <Option value="Rejected">Rejected</Option>
                    <Option value="Implemented">Implemented</Option>
                    <Option value="Closed">Closed</Option>
                  </Select>
                </Form.Item>
              </Col>
            </Row>
          </TabPane>
        </Tabs>

        <Form.Item style={{ marginTop: 16 }}>
          <Space>
            <Button onClick={() => navigateToRoute('change-requests')}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={loading}>
              {mode === 'edit' ? 'Update' : 'Create'}
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Card>
  )
}

