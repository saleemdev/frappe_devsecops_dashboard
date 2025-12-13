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
  message,
  Divider,
  Badge,
  Tag,
  Collapse,
  Modal,
  Tooltip,
  Timeline,
  Empty,
  Skeleton
} from 'antd'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  ToolOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import Swal from 'sweetalert2'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import useAuthStore from '../stores/authStore'
import useNavigationStore from '../stores/navigationStore'
import RichTextEditor from './RichTextEditor'
import ApprovalTrackingComponent from './ApprovalTrackingComponent'
import ApprovalActionModal from './ApprovalActionModal'
import ApproversTable from './ApproversTable'
import { getChangeRequestActivity } from '../utils/projectAttachmentsApi'

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime)

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
  const [approvers, setApprovers] = useState([])
  const [users, setUsers] = useState([])
  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [approvalAction, setApprovalAction] = useState('approve')
  const [selectedApproverIndex, setSelectedApproverIndex] = useState(null)
  const [selectedApprover, setSelectedApprover] = useState(null)
  const [submittingApproval, setSubmittingApproval] = useState(false)
  const [approvalStatus, setApprovalStatus] = useState('Pending Review')
  const [syncingApprovers, setSyncingApprovers] = useState(false)
  const [originatorSearchResults, setOriginatorSearchResults] = useState([])
  const [originatorSearchLoading, setOriginatorSearchLoading] = useState(false)
  const [managerSearchResults, setManagerSearchResults] = useState([])
  const [managerSearchLoading, setManagerSearchLoading] = useState(false)
  const [managerAutoPopulated, setManagerAutoPopulated] = useState(false)
  const [originatorFullName, setOriginatorFullName] = useState('')
  const [managerFullName, setManagerFullName] = useState('')
  const [devopsResolutionModalVisible, setDevopsResolutionModalVisible] = useState(false)
  const [devopsResolutionForm] = Form.useForm()
  const [submittingDevopsResolution, setSubmittingDevopsResolution] = useState(false)
  const [workflowState, setWorkflowState] = useState('Draft')
  const [activityLogs, setActivityLogs] = useState([])
  const [activityLogsLoading, setActivityLogsLoading] = useState(false)

  const { hasPermission, isAuthenticated, user } = useAuthStore()
  const { navigateToRoute } = useNavigationStore()
  const canWrite = isAuthenticated === true ? hasPermission('write:change-requests') : false

  // Helper function to get status configuration
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved for implementation':
        return {
          color: '#52c41a',
          icon: <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} />,
          label: 'Approved for Implementation',
          tagColor: 'success'
        }
      case 'not accepted':
      case 'rejected':
      case 'withdrawn':
        return {
          color: '#ff4d4f',
          icon: <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />,
          label: status,
          tagColor: 'error'
        }
      case 'rework':
      case 'deferred':
        return {
          color: '#faad14',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />,
          label: status,
          tagColor: 'warning'
        }
      case 'pending review':
      default:
        return {
          color: '#1890ff',
          icon: <ClockCircleOutlined style={{ color: '#1890ff', marginRight: 8 }} />,
          label: 'Pending Review',
          tagColor: 'processing'
        }
    }
  }

  // Helper function to get workflow state configuration
  const getWorkflowStateConfig = (state) => {
    switch (state?.toLowerCase()) {
      case 'awaiting approval':
        return {
          color: '#faad14',
          icon: <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: 8 }} />,
          label: 'Awaiting Approval',
          tagColor: 'warning'
        }
      case 'started deployment':
        return {
          color: '#1890ff',
          icon: <CheckCircleFilled style={{ color: '#1890ff', marginRight: 8 }} />,
          label: 'Started Deployment',
          tagColor: 'processing'
        }
      case 'declined':
        return {
          color: '#ff4d4f',
          icon: <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />,
          label: 'Declined',
          tagColor: 'error'
        }
      case 'implemented':
        return {
          color: '#52c41a',
          icon: <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} />,
          label: 'Implemented',
          tagColor: 'success'
        }
      case 'deployment completed':
        return {
          color: '#52c41a',
          icon: <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} />,
          label: 'Deployment Completed',
          tagColor: 'success'
        }
      case 'deployed':
        return {
          color: '#52c41a',
          icon: <CheckCircleFilled style={{ color: '#52c41a', marginRight: 8 }} />,
          label: 'Deployed',
          tagColor: 'success'
        }
      case 'deployment failed':
        return {
          color: '#ff4d4f',
          icon: <CloseCircleFilled style={{ color: '#ff4d4f', marginRight: 8 }} />,
          label: 'Deployment Failed',
          tagColor: 'error'
        }
      default:
        return {
          color: '#8c8c8c',
          icon: <ClockCircleOutlined style={{ color: '#8c8c8c', marginRight: 8 }} />,
          label: state || 'Unknown',
          tagColor: 'default'
        }
    }
  }

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

  // Load users for approvers table
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch('/api/method/frappe.client.get_list?doctype=User&fields=["name","full_name"]&limit_page_length=500', {
          credentials: 'include'
        })
        if (res.ok) {
          const response = await res.json()
          setUsers(response.message || [])
        } else {
          setUsers([])
        }
      } catch {
        setUsers([])
      }
    }
    load()
  }, [])

  // Auto-populate originator with current user in create mode
  useEffect(() => {
    if (mode === 'create' && user && !form.getFieldValue('originator_name')) {
      // Set originator name to current user's email
      form.setFieldValue('originator_name', user.email || user.name)
      // Set originator full name
      setOriginatorFullName(user.full_name || user.email || user.name)
      // Add current user to search results for display
      setOriginatorSearchResults([{
        name: user.email || user.name,
        employee_name: user.full_name || user.email || user.name,
        reports_to: null,
        reports_to_full_name: null
      }])
    }
  }, [mode, user, form])

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
        // Extract approvers from the response
        if (r.change_approvers && Array.isArray(r.change_approvers)) {
          setApprovers(r.change_approvers)
        }
        // Set approval status for the status indicator
        setApprovalStatus(r.approval_status || 'Pending Review')
        // Set workflow state for the status indicator
        setWorkflowState(r.workflow_state || 'Draft')

        // Set full names from the response
        if (r.originator_full_name) {
          setOriginatorFullName(r.originator_full_name)
        }
        if (r.originator_manager_full_name) {
          setManagerFullName(r.originator_manager_full_name)
        }

        // Populate search results for existing selections (for edit mode)
        if (r.originator_name) {
          setOriginatorSearchResults([{
            name: r.originator_name,
            employee_name: r.originator_full_name || r.originator_name,
            reports_to: r.originators_manager || null,
            reports_to_full_name: r.originator_manager_full_name || r.originators_manager || null
          }])
        }
        if (r.originators_manager) {
          setManagerSearchResults([{
            name: r.originators_manager,
            employee_name: r.originator_manager_full_name || r.originators_manager,
            reports_to: null,
            reports_to_full_name: null
          }])
        }

        form.setFieldsValue({
          ...r,
          // Provide defaults for required fields that might be null in the database
          submission_date: r.submission_date ? dayjs(r.submission_date) : dayjs(), // Default to today if null
          change_category: r.change_category || 'Standard Change', // Default to Standard Change if null
          approval_status: r.approval_status || 'Pending Review', // Default to Pending Review if null
          // Optional fields - keep as null if not set
          implementation_date: r.implementation_date ? dayjs(r.implementation_date) : null,
          implementation_time: r.implementation_time ? dayjs(r.implementation_time, 'HH:mm:ss') : null,
          downtime_expected: r.downtime_expected ? true : false,
          change_approvers: r.change_approvers || []
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

  // Update approvers when form data changes
  useEffect(() => {
    const changeApprovers = form.getFieldValue('change_approvers')
    if (changeApprovers && Array.isArray(changeApprovers)) {
      setApprovers(changeApprovers)
    }
  }, [form])

  // Update approval status when form field changes
  useEffect(() => {
    const subscription = form.getFieldInstance('approval_status')
    if (subscription) {
      const status = form.getFieldValue('approval_status')
      if (status) {
        setApprovalStatus(status)
      }
    }
  }, [form])

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

  // Handle approvers table change
  const handleApproversChange = (newApprovers) => {
    setApprovers(newApprovers)
    form.setFieldValue('change_approvers', newApprovers)
  }

  // Handle approve action
  const handleApproveClick = (index, approver) => {
    setSelectedApproverIndex(index)
    setSelectedApprover(approver)
    setApprovalAction('approve')
    setApprovalModalVisible(true)
  }

  // Handle reject action
  const handleRejectClick = (index, approver) => {
    setSelectedApproverIndex(index)
    setSelectedApprover(approver)
    setApprovalAction('reject')
    setApprovalModalVisible(true)
  }

  // Handle approval submission
  const handleApprovalSubmit = async (data) => {
    try {
      setSubmittingApproval(true)

      // Validate required data
      if (selectedApproverIndex === null || selectedApproverIndex === undefined) {
        message.error('Error: Approver index not set. Please try again.')
        return
      }

      if (!id) {
        message.error('Error: Change Request ID not found. Please refresh and try again.')
        return
      }

      console.log('Submitting approval:', {
        change_request_name: id,
        approver_index: selectedApproverIndex,
        approval_status: data.action === 'approve' ? 'Approved' : 'Rejected',
        remarks: data.remarks
      })

      const response = await fetch('/api/method/frappe_devsecops_dashboard.api.change_request.update_change_request_approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: new URLSearchParams({
          change_request_name: id,
          approver_index: String(selectedApproverIndex),
          approval_status: data.action === 'approve' ? 'Approved' : 'Rejected',
          remarks: data.remarks
        }).toString()
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const result = await response.json()
      const responseData = result.message || result

      if (responseData.success) {
        message.success(`Change Request ${data.action === 'approve' ? 'approved' : 'rejected'} successfully`)
        setApprovalModalVisible(false)
        // Reload the form to get updated data
        setTimeout(() => {
          window.location.reload()
        }, 1000)
      } else {
        message.error(responseData.error || 'Failed to update approval')
      }
    } catch (error) {
      console.error('Approval submission error:', error)
      message.error(error?.message || 'Failed to submit approval')
    } finally {
      setSubmittingApproval(false)
    }
  }

  // Handle sync approvers from project
  const handleSyncApprovers = async () => {
    try {
      setSyncingApprovers(true)

      const response = await fetch('/api/method/frappe_devsecops_dashboard.api.change_request.sync_approvers_from_project', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: new URLSearchParams({
          change_request_name: id
        }).toString()
      })

      const result = await response.json()
      const responseData = result.message || result

      if (responseData.success) {
        message.success(`${responseData.data.approvers_added} approver(s) synced from Project`)
        // Reload the form to get updated approvers
        window.location.reload()
      } else {
        message.error(responseData.error || 'Failed to sync approvers')
      }
    } catch (error) {
      message.error(error?.message || 'Failed to sync approvers')
    } finally {
      setSyncingApprovers(false)
    }
  }

  // Handle originator search
  const handleOriginatorSearch = async (searchValue) => {
    if (!searchValue || searchValue.length < 1) {
      setOriginatorSearchResults([])
      return
    }

    try {
      setOriginatorSearchLoading(true)
      const response = await fetch(`/api/method/frappe_devsecops_dashboard.api.change_request.search_employees?query=${encodeURIComponent(searchValue)}`, {
        method: 'GET',
        headers: {
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      const result = await response.json()
      console.log('Originator search response:', result)

      // Frappe wraps the response in a 'message' property
      const responseData = result.message || result
      console.log('Parsed response data:', responseData)

      if (responseData && responseData.success && responseData.data && Array.isArray(responseData.data)) {
        console.log('Setting search results:', responseData.data)
        setOriginatorSearchResults(responseData.data)
      } else {
        console.warn('Invalid response structure:', responseData)
        setOriginatorSearchResults([])
      }
    } catch (error) {
      console.error('Error searching employees:', error)
      setOriginatorSearchResults([])
    } finally {
      setOriginatorSearchLoading(false)
    }
  }

  // Handle originator selection
  const handleOriginatorSelect = (value, option) => {
    const selectedEmployee = originatorSearchResults.find(emp => emp.name === value)

    if (selectedEmployee) {
      // Set the originator full name
      setOriginatorFullName(selectedEmployee.employee_name)

      // Auto-populate manager if available
      if (selectedEmployee.reports_to) {
        form.setFieldValue('originators_manager', selectedEmployee.reports_to)
        setManagerAutoPopulated(true)
        // Set manager full name from the reports_to_full_name field
        setManagerFullName(selectedEmployee.reports_to_full_name || selectedEmployee.reports_to)
        message.info(`Manager auto-populated: ${selectedEmployee.reports_to_full_name || selectedEmployee.reports_to}`)
      } else {
        // Clear manager field if no reports_to
        form.setFieldValue('originators_manager', null)
        setManagerAutoPopulated(false)
        setManagerFullName('')
        setManagerSearchResults([])
      }
    }
  }

  // Handle originator field clear
  const handleOriginatorClear = () => {
    setOriginatorFullName('')
    setManagerFullName('')
    setManagerAutoPopulated(false)
    setManagerSearchResults([])
    setOriginatorSearchResults([])
  }

  // Handle manager field clear
  const handleManagerClear = () => {
    setManagerFullName('')
    setManagerAutoPopulated(false)
    setManagerSearchResults([])
  }

  // Handle manager search
  const handleManagerSearch = async (searchValue) => {
    if (!searchValue || searchValue.length < 1) {
      setManagerSearchResults([])
      return
    }

    try {
      setManagerSearchLoading(true)
      const response = await fetch(`/api/method/frappe_devsecops_dashboard.api.change_request.search_employees?query=${encodeURIComponent(searchValue)}`, {
        method: 'GET',
        headers: {
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include'
      })

      const result = await response.json()
      console.log('Manager search response:', result)

      // Frappe wraps the response in a 'message' property
      const responseData = result.message || result
      console.log('Parsed response data:', responseData)

      if (responseData && responseData.success && responseData.data && Array.isArray(responseData.data)) {
        console.log('Setting manager search results:', responseData.data)
        setManagerSearchResults(responseData.data)
      } else {
        console.warn('Invalid response structure:', responseData)
        setManagerSearchResults([])
      }
    } catch (error) {
      console.error('Error searching employees:', error)
      setManagerSearchResults([])
    } finally {
      setManagerSearchLoading(false)
    }
  }

  // Handle manager selection
  const handleManagerSelect = (value, option) => {
    setManagerAutoPopulated(false)
    // Find the selected manager and set their full name
    const selectedManager = managerSearchResults.find(emp => emp.name === value)
    if (selectedManager) {
      setManagerFullName(selectedManager.employee_name)
    }
  }

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

  // Handle DevOps Resolution button click
  const handleDevopsResolutionClick = () => {
    devopsResolutionForm.resetFields()
    setDevopsResolutionModalVisible(true)
  }

  // Handle DevOps Resolution form submission
  const handleDevopsResolutionSubmit = async (values) => {
    try {
      setSubmittingDevopsResolution(true)

      console.log('[ChangeRequestForm] Submitting DevOps Resolution:', {
        change_request_name: id,
        resolution_status: values.resolution_status,
        version: values.version,
        notes: values.notes
      })

      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.change_request.submit_devops_resolution`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include',
          body: JSON.stringify({
            change_request_name: id,
            resolution_status: values.resolution_status,
            version: values.version,
            notes: values.notes
          })
        }
      )

      const data = await response.json()
      console.log('[ChangeRequestForm] DevOps Resolution API Response:', data)

      // Check if response is successful
      // Frappe wraps the return value in a 'message' field
      const result = data.message

      if (result?.success) {
        message.success(result.message || 'DevOps resolution submitted successfully')
        setDevopsResolutionModalVisible(false)
        devopsResolutionForm.resetFields()
        // Reload the change request data and activity logs
        await loadChangeRequest()
        await loadActivityLog()
      } else {
        const errorMsg = result?.error || data?.exc || 'Failed to submit DevOps resolution'
        console.error('[ChangeRequestForm] DevOps Resolution Error:', errorMsg)
        message.error(errorMsg)
      }
    } catch (error) {
      console.error('[ChangeRequestForm] Error submitting DevOps resolution:', error)
      message.error('Failed to submit DevOps resolution: ' + error.message)
    } finally {
      setSubmittingDevopsResolution(false)
    }
  }

  // Load activity logs for the Change Request
  const loadActivityLog = async () => {
    if (!id) return // Only load for edit mode

    setActivityLogsLoading(true)
    try {
      const response = await getChangeRequestActivity(id, 10)
      if (response.success) {
        setActivityLogs(response.activity_logs || [])
      } else {
        console.error('[ChangeRequestForm] Error loading activity logs:', response.error)
      }
    } catch (error) {
      console.error('[ChangeRequestForm] Error fetching activity logs:', error)
    } finally {
      setActivityLogsLoading(false)
    }
  }

  // Load activity logs when component mounts or when id changes
  useEffect(() => {
    if (mode === 'edit' && id) {
      loadActivityLog()
    }
  }, [mode, id])

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

      {/* Status Indicator - Prominent display of Change Request Acceptance and Workflow State */}
      {mode === 'edit' && (
        <div style={{
          marginBottom: 24,
          padding: '16px',
          backgroundColor: '#fafafa',
          borderRadius: '4px',
          border: '2px solid #e8e8e8',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '24px',
          flexWrap: 'wrap'
        }}>
          {/* Change Request Acceptance Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
            {getStatusConfig(approvalStatus).icon}
            <div>
              <span style={{ fontSize: '12px', color: '#666', marginRight: '8px' }}>Change Request Acceptance:</span>
              <span style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: getStatusConfig(approvalStatus).color
              }}>
                {getStatusConfig(approvalStatus).label}
              </span>
            </div>
          </div>

          {/* Implementation Status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '250px' }}>
            {getWorkflowStateConfig(workflowState).icon}
            <div>
              <span style={{ fontSize: '12px', color: '#666', marginRight: '8px' }}>Implementation Status:</span>
              <span style={{
                fontSize: '16px',
                fontWeight: 'bold',
                color: getWorkflowStateConfig(workflowState).color
              }}>
                {getWorkflowStateConfig(workflowState).label}
              </span>
            </div>
          </div>

          {/* DevOps Resolution Button */}
          <Tooltip title={approvalStatus !== 'Approved for Implementation' ? 'DevOps Resolution is only available when Change Request Acceptance is "Approved for Implementation"' : ''}>
            <Button
              type="primary"
              icon={<ToolOutlined />}
              onClick={handleDevopsResolutionClick}
              disabled={approvalStatus !== 'Approved for Implementation'}
            >
              DevOps Resolution
            </Button>
          </Tooltip>
        </div>
      )}

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
                  <Select
                    placeholder="Search and select originator"
                    showSearch
                    allowClear
                    loading={originatorSearchLoading}
                    onSearch={handleOriginatorSearch}
                    onSelect={handleOriginatorSelect}
                    onClear={handleOriginatorClear}
                    filterOption={false}
                    notFoundContent={originatorSearchLoading ? 'Searching...' : 'No employees found'}
                  >
                    {originatorSearchResults.map(emp => (
                      <Option key={emp.name} value={emp.name}>
                        {emp.employee_name} ({emp.name})
                      </Option>
                    ))}
                  </Select>
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
                  <Select
                    placeholder="Search and select manager"
                    showSearch
                    allowClear
                    loading={managerSearchLoading}
                    onSearch={handleManagerSearch}
                    onSelect={handleManagerSelect}
                    onClear={handleManagerClear}
                    filterOption={false}
                    notFoundContent={managerSearchLoading ? 'Searching...' : 'No employees found'}
                  >
                    {managerSearchResults.map(emp => (
                      <Option key={emp.name} value={emp.name}>
                        {emp.employee_name} ({emp.name})
                      </Option>
                    ))}
                  </Select>
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item label="Originator Full Name">
                  <Input
                    disabled
                    value={originatorFullName}
                    placeholder="Auto-populated when originator is selected"
                  />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item label="Manager Full Name">
                  <Input
                    disabled
                    value={managerFullName}
                    placeholder="Auto-populated when manager is selected"
                  />
                </Form.Item>
              </Col>
            </Row>
            {managerAutoPopulated && (
              <Row gutter={16}>
                <Col span={24}>
                  <div style={{
                    padding: '8px 12px',
                    backgroundColor: '#e6f7ff',
                    border: '1px solid #91d5ff',
                    borderRadius: '4px',
                    color: '#0050b3',
                    fontSize: '12px'
                  }}>
                    ℹ️ Manager was auto-populated from the selected originator's reporting structure. You can change it if needed.
                  </div>
                </Col>
              </Row>
            )}
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
            <Collapse
              items={[
                {
                  key: '1',
                  label: 'Detailed Description of Proposed Change',
                  children: (
                    <Form.Item name="detailed_description" rules={[{ required: true }]} style={{ marginBottom: 0 }}>
                      <RichTextEditor placeholder="Describe the proposed change in detail..." />
                    </Form.Item>
                  )
                },
                {
                  key: '2',
                  label: 'Release Notes',
                  children: (
                    <Form.Item name="release_notes" style={{ marginBottom: 0 }}>
                      <RichTextEditor placeholder="Enter release notes..." />
                    </Form.Item>
                  )
                }
              ]}
              defaultActiveKey={['1']}
            />
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
            <Collapse
              items={[
                {
                  key: '1',
                  label: 'Testing and Validation Plan',
                  children: (
                    <Form.Item name="testing_plan" style={{ marginBottom: 0 }}>
                      <RichTextEditor placeholder="Describe the testing and validation plan..." />
                    </Form.Item>
                  )
                },
                {
                  key: '2',
                  label: 'Rollback/Backout Plan',
                  children: (
                    <Form.Item name="rollback_plan" style={{ marginBottom: 0 }}>
                      <RichTextEditor placeholder="Describe the rollback/backout plan..." />
                    </Form.Item>
                  )
                }
              ]}
              defaultActiveKey={['1']}
            />
          </TabPane>

          <TabPane tab="Approvers & Approval" key="4">
            {/* Sync Button - Only in edit mode */}
            {mode === 'edit' && (
              <div style={{ marginBottom: '24px' }}>
                <Button
                  type="primary"
                  onClick={handleSyncApprovers}
                  loading={syncingApprovers}
                >
                  Sync Approvers from Project
                </Button>
              </div>
            )}

            {/* Approval Status Section */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5} style={{ marginBottom: '12px' }}>Change Request Acceptance</Title>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="approval_status" rules={[{ required: true }]} initialValue="Pending Review" style={{ marginBottom: 0 }}>
                    <Select placeholder="Select approval status" disabled>
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
              </Row>
            </div>

            {/* Implementation Status Section */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5} style={{ marginBottom: '12px' }}>Implementation Status</Title>
              <Row gutter={16}>
                <Col span={24}>
                  <Form.Item name="workflow_state" rules={[{ required: true }]} initialValue="Awaiting Approval" style={{ marginBottom: 0 }}>
                    <Select placeholder="Select implementation status" disabled>
                      <Option value="Awaiting Approval">Awaiting Approval</Option>
                      <Option value="Started Deployment">Started Deployment</Option>
                      <Option value="Declined">Declined</Option>
                      <Option value="Implemented">Implemented</Option>
                      <Option value="Deployment Completed">Deployment Completed</Option>
                      <Option value="Deployed">Deployed</Option>
                      <Option value="Deployment Failed">Deployment Failed</Option>
                    </Select>
                  </Form.Item>
                </Col>
              </Row>
            </div>

            <Divider />

            {/* Approvers Section */}
            <div style={{ marginBottom: '24px' }}>
              <Title level={5} style={{ marginBottom: '12px' }}>Approvers</Title>
              <ApproversTable
                approvers={approvers}
                currentUser={user?.name || user?.email}
                onApproveClick={handleApproveClick}
                onRejectClick={handleRejectClick}
                loading={loading}
              />
            </div>

            {/* Approval Tracking Section - Only in edit mode */}
            {mode === 'edit' && approvers && approvers.length > 0 && (
              <>
                <Divider />
                <div>
                  <Title level={5} style={{ marginBottom: '12px' }}>Approval Tracking</Title>
                  <ApprovalTrackingComponent
                    approvers={approvers}
                    currentUser={user?.name || user?.email}
                    onApproveClick={handleApproveClick}
                    onRejectClick={handleRejectClick}
                    loading={loading}
                    changeRequestName={id}
                  />
                </div>
              </>
            )}
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

      {/* Activity Log Section - Only in edit mode */}
      {mode === 'edit' && (
        <Card
          title="Activity Log"
          style={{
            marginTop: '24px',
            borderRadius: '12px',
            boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
          }}
        >
          {activityLogsLoading ? (
            <Skeleton active paragraph={{ rows: 4 }} />
          ) : activityLogs && activityLogs.length > 0 ? (
            <Timeline size="small">
              {activityLogs.map((activity) => (
                <Timeline.Item
                  key={activity.name}
                  dot={<FileTextOutlined style={{ color: '#1890ff' }} />}
                >
                  <div>
                    <span style={{ fontSize: '13px', fontWeight: '500' }}>
                      {activity.subject || 'Activity'}
                    </span>
                    <br />
                    <span style={{ fontSize: '12px', color: '#666' }}>
                      by {activity.owner_name || activity.owner} • {dayjs(activity.creation).fromNow()}
                    </span>
                    {activity.content && (
                      <>
                        <br />
                        <span style={{ fontSize: '12px', color: '#999' }}>
                          {activity.content.substring(0, 150)}{activity.content.length > 150 ? '...' : ''}
                        </span>
                      </>
                    )}
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          ) : (
            <Empty description="No activity recorded yet" />
          )}
        </Card>
      )}

      {/* Approval Action Modal */}
      <ApprovalActionModal
        visible={approvalModalVisible}
        action={approvalAction}
        approverName={selectedApprover?.user || 'Unknown'}
        changeRequestName={id}
        onSubmit={handleApprovalSubmit}
        onCancel={() => setApprovalModalVisible(false)}
        loading={submittingApproval}
      />

      {/* DevOps Resolution Modal */}
      <Modal
        title="DevOps Resolution"
        open={devopsResolutionModalVisible}
        onCancel={() => setDevopsResolutionModalVisible(false)}
        footer={[
          <Button key="cancel" onClick={() => setDevopsResolutionModalVisible(false)}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            loading={submittingDevopsResolution}
            onClick={() => devopsResolutionForm.submit()}
          >
            Submit Resolution
          </Button>
        ]}
      >
        <Form
          form={devopsResolutionForm}
          layout="vertical"
          onFinish={handleDevopsResolutionSubmit}
        >
          <Form.Item
            name="resolution_status"
            label="Implementation Status"
            rules={[{ required: true, message: 'Please select an implementation status' }]}
          >
            <Select placeholder="Select implementation status">
              <Option value="Awaiting Approval">Awaiting Approval</Option>
              <Option value="Started Deployment">Started Deployment</Option>
              <Option value="Declined">Declined</Option>
              <Option value="Implemented">Implemented</Option>
              <Option value="Deployment Completed">Deployment Completed</Option>
              <Option value="Deployed">Deployed</Option>
              <Option value="Deployment Failed">Deployment Failed</Option>
            </Select>
          </Form.Item>

          <Form.Item
            name="version"
            label="Version"
            rules={[{ required: true, message: 'Please enter a version' }]}
          >
            <Input placeholder="e.g., v1.2.3" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Resolution Notes"
            rules={[{ required: true, message: 'Please enter resolution notes' }]}
          >
            <Input.TextArea
              placeholder="Enter resolution notes..."
              rows={4}
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  )
}

