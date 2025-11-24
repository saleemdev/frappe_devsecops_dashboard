import React, { useEffect, useState } from 'react'
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Descriptions,
  Timeline,
  message,
  notification,
  Spin,
  Empty,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Popconfirm,
  Tooltip,
  Divider
,
  theme
} from 'antd'
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  BugOutlined,
  FolderOutlined,
  UserOutlined,
  CalendarOutlined,
  FileTextOutlined,
  TeamOutlined,
  AlertOutlined,
  FileDoneOutlined,
  MessageOutlined,
  SearchOutlined,
  RiseOutlined,
  HistoryOutlined,
  BellOutlined,
  EnvironmentOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import useIncidentsStore from '../stores/incidentsStore'
import useNavigationStore from '../stores/navigationStore'
import useAuthStore from '../stores/authStore'
import useIncidentNavigation from '../hooks/useIncidentNavigation'
import { clearCache } from '../services/api/config'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

const { Title, Text, Paragraph } = Typography

const IncidentDetail = ({ incidentId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const [form] = Form.useForm()
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [isAddingTimeline, setIsAddingTimeline] = useState(false)
  const [isDeletingIndex, setIsDeletingIndex] = useState(null)
  const [loadError, setLoadError] = useState(null)

  // Result dialog state
  const [resultDialogVisible, setResultDialogVisible] = useState(false)
  const [resultType, setResultType] = useState(null) // 'success' or 'error'
  const [resultMessage, setResultMessage] = useState('')
  const [resultDescription, setResultDescription] = useState('')

  // Use store state instead of local state
  const {
    selectedIncident,
    loading,
    fetchIncident,
    setSelectedIncident,
    addTimelineEntry,
    removeTimelineEntry
  } = useIncidentsStore()

  // Navigation store with fallback to props
  const { goToIncidents } = useNavigationStore()

  // Use reliable incident navigation
  const { editIncident: navEditIncident, goToIncidentsList } = useIncidentNavigation()

  // Auth store to get current user
  const { user } = useAuthStore()

  // Fetch incident on mount or when incidentId changes
  useEffect(() => {
    const loadIncidentData = async () => {
      if (!incidentId) {
        console.warn('[IncidentDetail] No incidentId provided')
        return
      }

      try {
        console.log('[IncidentDetail] Loading incident:', incidentId)
        // Clear cache to ensure fresh data
        clearCache(`incident-${incidentId}`)
        // Fetch fresh data from backend
        const incident = await fetchIncident(incidentId)
        console.log('[IncidentDetail] Loaded incident data:', incident)
        console.log('[IncidentDetail] Incident is null/undefined?', incident === null || incident === undefined)
        console.log('[IncidentDetail] Incident type:', typeof incident)
        console.log('[IncidentDetail] Incident keys:', Object.keys(incident || {}))
        if (incident) {
          console.log('[IncidentDetail] assigned_to:', incident.assigned_to)
          console.log('[IncidentDetail] assigned_to_full_name:', incident.assigned_to_full_name)
          if (incident.assigned_to_full_name) {
            console.log('[IncidentDetail] ✅ Found assigned_to_full_name:', incident.assigned_to_full_name)
          } else {
            console.warn('[IncidentDetail] ⚠️ assigned_to_full_name is missing or empty!')
          }
        } else {
          console.error('[IncidentDetail] ❌ Incident data is null/undefined!')
        }
      } catch (error) {
        console.error('[IncidentDetail] Error loading incident:', error)
        const errorMsg = error?.message || 'Failed to load incident details'
        setLoadError(errorMsg)
        message.error(errorMsg)
      }
    }

    loadIncidentData()
  }, [incidentId, fetchIncident])

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'Critical': return 'red'
      case 'High': return 'orange'
      case 'Medium': return 'yellow'
      case 'Low': return 'green'
      default: return 'default'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'Open': return 'red'
      case 'In Progress': return 'blue'
      case 'Resolved': return 'green'
      case 'Closed': return 'default'
      default: return 'default'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Open': return <ExclamationCircleOutlined />
      case 'In Progress': return <ClockCircleOutlined />
      case 'Resolved':
      case 'Closed': return <CheckCircleOutlined />
      default: return <ExclamationCircleOutlined />
    }
  }

  // Get icon for incident details field
  const getDetailFieldIcon = (fieldName) => {
    const iconMap = {
      'name': <BugOutlined />,
      'category': <FolderOutlined />,
      'priority': <RiseOutlined />,
      'severity': <AlertOutlined />,
      'assigned_to': <UserOutlined />,
      'assigned_to_full_name': <TeamOutlined />,
      'project': <FolderOutlined />,
      'project_name': <EnvironmentOutlined />,
      'reported_by': <UserOutlined />,
      'reported_date': <CalendarOutlined />,
      'modified': <HistoryOutlined />,
      'affected_systems': <EnvironmentOutlined />,
      'description': <FileTextOutlined />
    }
    return iconMap[fieldName] || <FileTextOutlined />
  }

  // Get icon for timeline event types
  const getTimelineEventIcon = (eventType) => {
    const iconMap = {
      'Manual': <FileTextOutlined />,
      'Automated': <RiseOutlined />,
      'Status Change': <CheckCircleOutlined />,
      'Assignment': <UserOutlined />,
      'Comment': <MessageOutlined />,
      'Investigation': <SearchOutlined />,
      'Resolution': <CheckCircleOutlined />,
      'Communication': <BellOutlined />,
      'Escalation': <AlertOutlined />,
      'SLA Update': <FileDoneOutlined />,
      'Incident Reported': <ExclamationCircleOutlined />
    }
    return iconMap[eventType] || <HistoryOutlined />
  }

  // Handle edit navigation
  const handleEditIncident = () => {
    console.log('[IncidentDetail] Edit button clicked for incident:', incidentId)
    if (incidentId) {
      navEditIncident(incidentId)
    } else {
      message.error('Cannot edit: Incident ID is missing')
    }
  }

  // Handle adding timeline entry
  const handleAddTimelineClick = () => {
    form.resetFields()
    // Set default values: current user and current timestamp
    form.setFieldsValue({
      event_timestamp: dayjs(),
      user: user?.name || user?.email || 'Unknown User'
    })
    setIsModalVisible(true)
  }

  // Handle modal OK button - manually validate and submit form
  const handleModalOk = async () => {
    try {
      console.log('[IncidentDetail] Validating form fields...')
      // Validate form without triggering submission
      const values = await form.validateFields()

      console.log('[IncidentDetail] Form validation passed, values:', values)
      // Now submit the validated values
      await handleAddTimelineSubmit(values)
    } catch (error) {
      console.error('[IncidentDetail] Form validation error:', error)
      console.error('[IncidentDetail] Error details:', {
        message: error?.message,
        errorFields: error?.errorFields,
        values: error?.values
      })
      // Validation errors are shown by Ant Design form automatically
      // Don't need to do anything here - Form component shows the errors
    }
  }

  const handleAddTimelineSubmit = async (values) => {
    let isSuccessful = false

    try {
      setIsAddingTimeline(true)
      console.log('[IncidentDetail] Starting timeline entry submission...')

      if (!selectedIncident || !selectedIncident.name) {
        console.error('[IncidentDetail] VALIDATION ERROR: Incident not found')
        throw {
          type: 'VALIDATION_ERROR',
          status: 400,
          message: 'Incident not found',
          description: 'Incident not found. Please refresh and try again.'
        }
      }

      const timelineEntry = {
        event_type: values.event_type,
        event_timestamp: values.event_timestamp.format('YYYY-MM-DD HH:mm:ss'),
        description: values.description?.trim() || '',
        user: values.user || user?.name || user?.email || 'Unknown User',
        event_source: null
      }

      console.log('[IncidentDetail] Timeline entry data:', timelineEntry)

      // Use store action to add timeline entry
      const response = await addTimelineEntry(selectedIncident.name, timelineEntry)

      console.log('[IncidentDetail] API RESPONSE:', response)
      console.log('[IncidentDetail] Timeline entry added successfully!')

      // Mark as successful BEFORE setting state
      isSuccessful = true

      // Set success result dialog
      setResultType('success')
      setResultMessage('Event Added Successfully')
      setResultDescription(`Timeline event "${values.event_type}" has been added to the incident.`)

      // Close the Add Event modal
      console.log('[IncidentDetail] Closing Add Event modal...')
      setIsModalVisible(false)
      form.resetFields()

      // Show result dialog after modal closes
      setTimeout(() => {
        console.log('[IncidentDetail] Showing success result dialog...')
        setResultDialogVisible(true)
      }, 300)

    } catch (error) {
      // Only handle error if we haven't already marked it as successful
      if (isSuccessful) {
        console.warn('[IncidentDetail] Error caught but already marked successful, ignoring')
        return
      }

      console.error('[IncidentDetail] ERROR CAUGHT:', error)

      // Determine error details
      let errorMessage = 'Failed to add timeline entry'
      let errorDescription = 'An unexpected error occurred. Please try again.'
      let errorStatus = error?.status || error?.response?.status || 0

      // Handle different error types with clear logging
      if (error?.type === 'VALIDATION_ERROR') {
        errorMessage = error.message || errorMessage
        errorDescription = error.description || errorDescription
        console.error('[IncidentDetail] Validation error:', errorMessage)
      } else if (errorStatus === 400) {
        errorMessage = 'Invalid Request'
        errorDescription = error?.response?.data?.message || error?.message || 'Invalid request. Please check your input.'
        console.error('[IncidentDetail] Bad request (400):', errorDescription)
      } else if (errorStatus === 403) {
        errorMessage = 'Permission Denied'
        errorDescription = 'You do not have permission to add timeline entries to this incident.'
        console.error('[IncidentDetail] Permission denied (403)')
      } else if (errorStatus === 404) {
        errorMessage = 'Not Found'
        errorDescription = 'Incident not found. It may have been deleted.'
        console.error('[IncidentDetail] Resource not found (404)')
      } else if (errorStatus >= 500) {
        errorMessage = 'Server Error'
        errorDescription = 'Server error occurred. Please try again later.'
        console.error('[IncidentDetail] Server error (500+):', errorStatus)
      } else if (error?.message) {
        errorDescription = error.message
        console.error('[IncidentDetail] Error message:', error.message)
      }

      // Ensure we're setting error state (not success)
      console.log('[IncidentDetail] Setting error state:', { errorMessage, errorDescription })
      setResultType('error')
      setResultMessage(errorMessage)
      setResultDescription(errorDescription)

      // Close the Add Event modal
      console.log('[IncidentDetail] Closing Add Event modal (error case)...')
      setIsModalVisible(false)

      // Show result dialog after modal closes
      setTimeout(() => {
        console.log('[IncidentDetail] Showing error result dialog...')
        setResultDialogVisible(true)
      }, 300)

    } finally {
      console.log('[IncidentDetail] Finally block - setting isAddingTimeline to false')
      setIsAddingTimeline(false)
    }
  }

  // Handle result dialog OK
  const handleResultDialogOk = () => {
    console.log('[IncidentDetail] Result dialog OK clicked, closing result dialog')

    // Close result dialog
    setResultDialogVisible(false)

    // Timeline is already updated in the store automatically
    // No need to manually refresh or reload the page
  }

  const handleDeleteTimelineEntry = async (index) => {
    try {
      setIsDeletingIndex(index)

      if (!selectedIncident || !selectedIncident.name) {
        notification.error({
          message: 'Error',
          description: 'Incident not found. Please refresh and try again.',
          placement: 'topRight',
          duration: 4.5
        })
        return
      }

      console.log('[IncidentDetail] Deleting timeline entry at index:', index)

      // Use store action to remove timeline entry
      const response = await removeTimelineEntry(selectedIncident.name, index)

      console.log('[IncidentDetail] Timeline entry deleted successfully:', response)

      // Show success notification
      notification.success({
        message: 'Event Deleted Successfully',
        description: 'Timeline event has been removed from the incident.',
        placement: 'topRight',
        duration: 3
      })
    } catch (error) {
      console.error('[IncidentDetail] Error deleting timeline entry:', error)

      // Extract detailed error message
      let errorMessage = 'Failed to delete timeline entry'
      let errorDescription = 'An unexpected error occurred. Please try again.'

      if (error?.response?.status === 400) {
        errorDescription = error?.response?.data?.message || 'Cannot delete this timeline entry.'
      } else if (error?.response?.status === 403) {
        errorDescription = 'You do not have permission to delete timeline entries from this incident.'
      } else if (error?.response?.status === 404) {
        errorDescription = 'Timeline entry not found. It may have already been deleted.'
      } else if (error?.response?.status >= 500) {
        errorDescription = 'Server error occurred. Please try again later.'
      } else if (error?.message) {
        errorDescription = error.message
      }

      // Show error notification
      notification.error({
        message: errorMessage,
        description: errorDescription,
        placement: 'topRight',
        duration: 4.5
      })
    } finally {
      setIsDeletingIndex(null)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading incident details...</div>
      </div>
    )
  }

  if (!loading && !selectedIncident) {
    const handleBackClick = () => {
      console.log('[IncidentDetail] Back button clicked from empty state')
      goToIncidentsList()
    }

    const errorDescription = loadError || 'Incident not found'

    return (
      <Card>
        <Empty
          description={errorDescription}
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Space direction="vertical" style={{ marginTop: '16px' }}>
            <Text type="secondary">{errorDescription}</Text>
            <Button type="primary" onClick={handleBackClick}>
              Back to Incidents
            </Button>
          </Space>
        </Empty>
      </Card>
    )
  }

  if (!selectedIncident) {
    return null // Should not reach here due to earlier check, but safety fallback
  }

  // Navigation helper
  const handleBackToIncidents = () => {
    console.log('[IncidentDetail] Back to incidents button clicked')
    goToIncidentsList()
  }

  return (
    <div>
      {/* Header */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col xs={24} sm={16}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToIncidents}
                type="default"
                size="large"
              >
                Back to Incidents List
              </Button>
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ExclamationCircleOutlined style={{
                  marginRight: 16,
                  color: '#ff7a45',
                  fontSize: '32px'
                }} />
                {selectedIncident.title}
              </Title>
              <Space wrap size="small">
                <Tag
                  icon={<AlertOutlined />}
                  color={getSeverityColor(selectedIncident.severity)}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  <strong>Severity:</strong> {selectedIncident.severity}
                </Tag>
                <Tag
                  icon={getStatusIcon(selectedIncident.status)}
                  color={getStatusColor(selectedIncident.status)}
                  style={{ fontSize: '14px', padding: '6px 12px' }}
                >
                  <strong>Status:</strong> {selectedIncident.status}
                </Tag>
              </Space>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right', marginTop: '16px' }}>
            <Button
              icon={<EditOutlined />}
              type="primary"
              size="large"
              onClick={handleEditIncident}
              style={{ minWidth: '150px' }}
            >
              Edit Incident
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Incident Details */}
      <Card title={
        <Space>
          <BugOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
          <span>Incident Details</span>
        </Space>
      } style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('name')}
              <span>Incident ID</span>
            </Space>
          }>
            <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px' }}>
              {selectedIncident.name}
            </code>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('category')}
              <span>Category</span>
            </Space>
          }>
            <Tag icon={<FolderOutlined />}>{selectedIncident.category || '-'}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('priority')}
              <span>Priority</span>
            </Space>
          }>
            {selectedIncident.priority ? (
              <Tag icon={<RiseOutlined />} color="orange">{selectedIncident.priority}</Tag>
            ) : (
              <span>-</span>
            )}
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('severity')}
              <span>Severity</span>
            </Space>
          }>
            <Tag icon={<AlertOutlined />} color={getSeverityColor(selectedIncident.severity)}>
              {selectedIncident.severity || '-'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('assigned_to')}
              <span>Assigned To</span>
            </Space>
          }>
            <Space size={8}>
              <UserOutlined style={{ color: getHeaderIconColor(token) }} />
              <Text>{selectedIncident.assigned_to || '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('assigned_to_full_name')}
              <span>Assignee Name</span>
            </Space>
          }>
            <Space size={8}>
              <TeamOutlined style={{ color: '#722ed1' }} />
              <Text strong>{selectedIncident.assigned_to_full_name || selectedIncident.assigned_to || '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('project')}
              <span>Project</span>
            </Space>
          }>
            <Tag icon={<FolderOutlined />}>{selectedIncident.project || '-'}</Tag>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('project_name')}
              <span>Project Name</span>
            </Space>
          }>
            <Space size={8}>
              <EnvironmentOutlined style={{ color: '#13c2c2' }} />
              <Text>{selectedIncident.project_name || '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('reported_by')}
              <span>Reported By</span>
            </Space>
          }>
            <Space size={8}>
              <UserOutlined style={{ color: '#eb2f96' }} />
              <Text>{selectedIncident.reported_by || '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('reported_date')}
              <span>Reported Date</span>
            </Space>
          }>
            <Space size={8}>
              <CalendarOutlined style={{ color: '#faad14' }} />
              <Text type="secondary">{selectedIncident.reported_date || '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('modified')}
              <span>Last Updated</span>
            </Space>
          }>
            <Space size={8}>
              <HistoryOutlined style={{ color: getHeaderIconColor(token) }} />
              <Text type="secondary">{selectedIncident.modified || '-'}</Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('affected_systems')}
              <span>Affected Systems</span>
            </Space>
          }>
            {selectedIncident.affected_systems ? (
              <Space size={8} wrap>
                <EnvironmentOutlined style={{ color: '#faad14' }} />
                <Text>{selectedIncident.affected_systems}</Text>
              </Space>
            ) : (
              <Text type="secondary">-</Text>
            )}
          </Descriptions.Item>

          <Descriptions.Item label={
            <Space size={8}>
              {getDetailFieldIcon('description')}
              <span>Description</span>
            </Space>
          } span={2}>
            <div style={{
              backgroundColor: '#fafafa',
              padding: '12px',
              borderRadius: '4px',
              borderLeft: '3px solid #1890ff'
            }}>
              <Paragraph style={{ margin: 0 }}>
                {selectedIncident.description || <Text type="secondary">No description provided</Text>}
              </Paragraph>
            </div>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Timeline */}
      <Card
        title={
          <Space>
            <HistoryOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>Incident Timeline</span>
          </Space>
        }
        extra={
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={handleAddTimelineClick}
            size="small"
          >
            Add Event
          </Button>
        }
      >
        {selectedIncident.incident_timeline && selectedIncident.incident_timeline.length > 0 ? (
          <Timeline
            items={selectedIncident.incident_timeline.map((item, index) => {
              // Determine event type color based on type
              const getEventTypeColor = (eventType) => {
                const colorMap = {
                  'Manual': 'blue',
                  'Automated': 'cyan',
                  'Status Change': 'green',
                  'Assignment': 'purple',
                  'Comment': 'magenta',
                  'Investigation': 'gold',
                  'Resolution': 'green',
                  'Communication': 'geekblue',
                  'Escalation': 'red',
                  'SLA Update': 'orange',
                  'Incident Reported': 'volcano'
                }
                return colorMap[eventType] || 'blue'
              }

              return {
                dot: (
                  <Tooltip title={item.event_type || 'Event'}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      backgroundColor: '#fff',
                      border: `2px solid ${
                        item.event_type === 'Incident Reported' ? '#ff7a45' : '#1890ff'
                      }`,
                      borderRadius: '50%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      color: item.event_type === 'Incident Reported' ? '#ff7a45' : '#1890ff'
                    }}>
                      {getTimelineEventIcon(item.event_type)}
                    </div>
                  </Tooltip>
                ),
                children: (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    padding: '12px 0'
                  }}>
                    <div style={{ flex: 1, paddingRight: '16px' }}>
                      <Space wrap style={{ marginBottom: '8px' }}>
                        <Tag
                          icon={getTimelineEventIcon(item.event_type)}
                          color={getEventTypeColor(item.event_type)}
                        >
                          {item.event_type || 'Event'}
                        </Tag>
                        {item.event_type === 'Incident Reported' && (
                          <Tag icon={<ExclamationCircleOutlined />} color="red">
                            Initial Report
                          </Tag>
                        )}
                      </Space>

                      <div style={{
                        backgroundColor: '#fafafa',
                        padding: '10px 12px',
                        borderRadius: '4px',
                        borderLeft: `3px solid ${
                          getEventTypeColor(item.event_type) === 'red' ? '#ff7a45' : '#1890ff'
                        }`,
                        marginTop: '8px'
                      }}>
                        <Text style={{ display: 'block', marginBottom: '8px' }}>
                          {item.description || 'No description'}
                        </Text>

                        <Space size={16} wrap style={{ fontSize: '12px' }}>
                          <Space size={4}>
                            <CalendarOutlined style={{ color: '#999' }} />
                            <Text type="secondary">
                              {item.event_timestamp || item.timestamp || '-'}
                            </Text>
                          </Space>
                          <Space size={4}>
                            <UserOutlined style={{ color: '#999' }} />
                            <Text type="secondary">
                              {item.user || '-'}
                            </Text>
                          </Space>
                        </Space>
                      </div>
                    </div>

                    {item.event_type !== 'Incident Reported' && (
                      <Popconfirm
                        title="Delete Timeline Entry"
                        description="Are you sure you want to delete this timeline entry? This action cannot be undone."
                        onConfirm={() => handleDeleteTimelineEntry(index)}
                        okText="Delete"
                        cancelText="Cancel"
                        okButtonProps={{ danger: true }}
                      >
                        <Tooltip title="Delete Event">
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            size="small"
                            style={{ marginLeft: '16px', flexShrink: 0 }}
                            loading={isDeletingIndex === index}
                            disabled={isDeletingIndex !== null}
                          />
                        </Tooltip>
                      </Popconfirm>
                    )}
                  </div>
                )
              }
            })}
          />
        ) : (
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            <HistoryOutlined style={{ fontSize: '48px', color: '#bfbfbf', marginBottom: '16px', display: 'block' }} />
            <Text type="secondary">No timeline entries yet</Text>
          </div>
        )}
      </Card>

      {/* Result Dialog - Success/Error from Adding Timeline Event */}
      {resultDialogVisible && (
        <Modal
          title={null}
          open={true}
          onOk={handleResultDialogOk}
          onCancel={handleResultDialogOk}
          closable={true}
          okText="OK"
          cancelText={null}
          okButtonProps={{
            type: resultType === 'success' ? 'primary' : 'danger',
            danger: resultType === 'error'
          }}
          width={500}
          centered
          key={`result-${resultType}`}
        >
          <div style={{ textAlign: 'center', padding: '20px 0' }}>
            {resultType === 'success' && (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px', color: '#52c41a' }}>
                  ✓
                </div>
                <Title level={3} style={{ color: '#52c41a', marginBottom: '8px' }}>
                  {resultMessage || 'Operation Successful'}
                </Title>
                <Paragraph style={{ fontSize: '14px', color: '#666', marginTop: '12px', marginBottom: '0' }}>
                  {resultDescription || 'The operation completed successfully.'}
                </Paragraph>
              </>
            )}

            {resultType === 'error' && (
              <>
                <div style={{ fontSize: '48px', marginBottom: '16px', color: '#ff4d4f' }}>
                  ✕
                </div>
                <Title level={3} style={{ color: '#ff4d4f', marginBottom: '8px' }}>
                  {resultMessage || 'Operation Failed'}
                </Title>
                <Paragraph style={{ fontSize: '14px', color: '#666', marginTop: '12px', marginBottom: '0' }}>
                  {resultDescription || 'An error occurred. Please try again.'}
                </Paragraph>
              </>
            )}

            {!resultType && (
              <div style={{ color: '#999' }}>
                <Text>Loading...</Text>
              </div>
            )}
          </div>
        </Modal>
      )}


      {/* Add Timeline Event Modal - Polished & Modern */}
      <Modal
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              backgroundColor: '#e6f7ff',
              borderRadius: '6px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: getHeaderIconColor(token)
            }}>
              <PlusOutlined style={{ fontSize: '18px' }} />
            </div>
            <span style={{ fontSize: '16px', fontWeight: '500' }}>Add Timeline Event</span>
          </div>
        }
        open={isModalVisible}
        onOk={handleModalOk}
        onCancel={() => {
          if (!isAddingTimeline) {
            setIsModalVisible(false)
          }
        }}
        okText={isAddingTimeline ? 'Adding...' : 'Add Event'}
        cancelText="Cancel"
        okButtonProps={{
          loading: isAddingTimeline,
          disabled: isAddingTimeline,
          icon: <PlusOutlined />
        }}
        cancelButtonProps={{
          disabled: isAddingTimeline
        }}
        maskClosable={!isAddingTimeline}
        closable={!isAddingTimeline}
        width={650}
        className="timeline-event-modal"
        centered
      >
        <Spin spinning={isAddingTimeline} tip="Adding event to timeline...">
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: '24px' }}
          >
            {/* Event Type Field */}
            <Form.Item
              label={
                <Space size={8}>
                  <FileTextOutlined style={{ color: getHeaderIconColor(token) }} />
                  <span style={{ fontWeight: 600 }}>Event Type</span>
                </Space>
              }
              name="event_type"
              rules={[{ required: true, message: 'Please select an event type' }]}
            >
              <Select
                placeholder="Select the type of event that occurred"
                disabled={isAddingTimeline}
                size="large"
              >
                <Select.Option value="Manual">
                  <Space size={8}><FileTextOutlined />Manual</Space>
                </Select.Option>
                <Select.Option value="Automated">
                  <Space size={8}><RiseOutlined />Automated</Space>
                </Select.Option>
                <Select.Option value="Status Change">
                  <Space size={8}><CheckCircleOutlined />Status Change</Space>
                </Select.Option>
                <Select.Option value="Assignment">
                  <Space size={8}><UserOutlined />Assignment</Space>
                </Select.Option>
                <Select.Option value="Comment">
                  <Space size={8}><MessageOutlined />Comment</Space>
                </Select.Option>
                <Select.Option value="Investigation">
                  <Space size={8}><SearchOutlined />Investigation</Space>
                </Select.Option>
                <Select.Option value="Resolution">
                  <Space size={8}><CheckCircleOutlined />Resolution</Space>
                </Select.Option>
                <Select.Option value="Communication">
                  <Space size={8}><BellOutlined />Communication</Space>
                </Select.Option>
                <Select.Option value="Escalation">
                  <Space size={8}><AlertOutlined />Escalation</Space>
                </Select.Option>
                <Select.Option value="SLA Update">
                  <Space size={8}><FileDoneOutlined />SLA Update</Space>
                </Select.Option>
              </Select>
            </Form.Item>

            {/* Event Timestamp Field */}
            <Form.Item
              label={
                <Space size={8}>
                  <CalendarOutlined style={{ color: '#faad14' }} />
                  <span style={{ fontWeight: 600 }}>When did this happen?</span>
                </Space>
              }
              name="event_timestamp"
              rules={[{ required: true, message: 'Please select a date and time' }]}
            >
              <DatePicker
                showTime
                format="YYYY-MM-DD HH:mm:ss"
                placeholder="Select date and time"
                disabled={isAddingTimeline}
                style={{ width: '100%' }}
                size="large"
              />
            </Form.Item>

            {/* Description Field */}
            <Form.Item
              label={
                <Space size={8}>
                  <FileTextOutlined style={{ color: '#52c41a' }} />
                  <span style={{ fontWeight: 600 }}>Event Description</span>
                </Space>
              }
              name="description"
              rules={[
                { required: true, message: 'Please enter a description' },
                { min: 5, message: 'Description should be at least 5 characters' }
              ]}
            >
              <Input.TextArea
                placeholder="What happened? Provide details about this event..."
                rows={4}
                disabled={isAddingTimeline}
                size="large"
                maxLength={500}
                showCount
                style={{
                  borderRadius: '6px'
                }}
              />
            </Form.Item>

            {/* User Field (Read-only) */}
            <Form.Item
              label={
                <Space size={8}>
                  <UserOutlined style={{ color: '#722ed1' }} />
                  <span style={{ fontWeight: 600 }}>Recorded By</span>
                </Space>
              }
              name="user"
            >
              <Input
                placeholder="Current user"
                disabled
                size="large"
                style={{ opacity: 0.7 }}
                prefix={<UserOutlined style={{ color: '#999' }} />}
              />
            </Form.Item>

            {/* Info Message */}
            <div style={{
              marginTop: '20px',
              padding: '14px 16px',
              backgroundColor: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: '6px',
              fontSize: '13px',
              color: '#0050b3',
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start'
            }}>
              <BellOutlined style={{ fontSize: '16px', flexShrink: 0, marginTop: '2px' }} />
              <div>
                Timeline events are automatically timestamped and recorded. This creates a complete audit trail of all incident activities for compliance and analysis.
              </div>
            </div>
          </Form>
        </Spin>
      </Modal>
    </div>
  )
}

export default IncidentDetail
