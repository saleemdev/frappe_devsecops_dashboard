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
  Tooltip
} from 'antd'
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined,
  PlusOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import useIncidentsStore from '../stores/incidentsStore'
import useNavigationStore from '../stores/navigationStore'
import useAuthStore from '../stores/authStore'
import useIncidentNavigation from '../hooks/useIncidentNavigation'
import { clearCache } from '../services/api/config'

const { Title, Text, Paragraph } = Typography

const IncidentDetail = ({ incidentId, navigateToRoute }) => {
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
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={handleBackToIncidents}
              >
                Back to Incidents
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                <ExclamationCircleOutlined style={{ marginRight: 8 }} />
                {selectedIncident.title}
              </Title>
              <Tag color={getSeverityColor(selectedIncident.severity)}>{selectedIncident.severity}</Tag>
              <Tag color={getStatusColor(selectedIncident.status)} icon={getStatusIcon(selectedIncident.status)}>
                {selectedIncident.status}
              </Tag>
            </Space>
          </Col>
          <Col>
            <Button icon={<EditOutlined />} type="primary" onClick={handleEditIncident}>
              Edit Incident
            </Button>
          </Col>
        </Row>
      </Card>

      {/* Incident Details */}
      <Card title="Incident Details" style={{ marginBottom: 16 }}>
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Incident ID">{selectedIncident.name}</Descriptions.Item>
          <Descriptions.Item label="Category">{selectedIncident.category || '-'}</Descriptions.Item>
          <Descriptions.Item label="Priority">{selectedIncident.priority || '-'}</Descriptions.Item>
          <Descriptions.Item label="Severity">
            <Tag color={getSeverityColor(selectedIncident.severity)}>
              {selectedIncident.severity || '-'}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Assigned To">
            {selectedIncident.assigned_to || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Assigned To Full Name">
            {selectedIncident.assigned_to_full_name || selectedIncident.assigned_to || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Project">{selectedIncident.project || '-'}</Descriptions.Item>
          <Descriptions.Item label="Project Name">{selectedIncident.project_name || '-'}</Descriptions.Item>
          <Descriptions.Item label="Reported By">{selectedIncident.reported_by || '-'}</Descriptions.Item>
          <Descriptions.Item label="Reported Date">{selectedIncident.reported_date || '-'}</Descriptions.Item>
          <Descriptions.Item label="Last Updated">{selectedIncident.modified || '-'}</Descriptions.Item>
          <Descriptions.Item label="Affected Systems">
            {selectedIncident.affected_systems || '-'}
          </Descriptions.Item>
          <Descriptions.Item label="Description" span={2}>
            <Paragraph>{selectedIncident.description || '-'}</Paragraph>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Timeline */}
      <Card
        title="Incident Timeline"
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
            items={selectedIncident.incident_timeline.map((item, index) => ({
              children: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <Tag color="blue">{item.event_type || 'Event'}</Tag>
                    <br />
                    <Text type="secondary" style={{ marginTop: '8px', display: 'block' }}>
                      {item.event_timestamp || item.timestamp || '-'} - {item.user || '-'}
                    </Text>
                    <br />
                    <Text style={{ marginTop: '8px', display: 'block' }}>
                      {item.description || 'No description'}
                    </Text>
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
                          style={{ marginLeft: '16px' }}
                          loading={isDeletingIndex === index}
                          disabled={isDeletingIndex !== null}
                        />
                      </Tooltip>
                    </Popconfirm>
                  )}
                </div>
              )
            }))}
          />
        ) : (
          <Text type="secondary">No timeline entries yet</Text>
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <PlusOutlined style={{ fontSize: '16px', color: '#1890ff' }} />
            <span>Add Timeline Event</span>
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
          disabled: isAddingTimeline
        }}
        cancelButtonProps={{
          disabled: isAddingTimeline
        }}
        maskClosable={!isAddingTimeline}
        closable={!isAddingTimeline}
        width={600}
        className="timeline-event-modal"
        style={{
          borderRadius: '8px'
        }}
      >
        <Spin spinning={isAddingTimeline} tip="Adding event to timeline...">
          <Form
            form={form}
            layout="vertical"
            style={{ marginTop: '16px' }}
          >
            {/* Event Type Field */}
            <Form.Item
              label={<span style={{ fontWeight: 500 }}>Event Type</span>}
              name="event_type"
              rules={[{ required: true, message: 'Please select an event type' }]}
            >
              <Select
                placeholder="Select the type of event"
                disabled={isAddingTimeline}
                size="large"
              >
                <Select.Option value="Manual">📝 Manual</Select.Option>
                <Select.Option value="Automated">⚙️ Automated</Select.Option>
                <Select.Option value="Status Change">🔄 Status Change</Select.Option>
                <Select.Option value="Assignment">👤 Assignment</Select.Option>
                <Select.Option value="Comment">💬 Comment</Select.Option>
                <Select.Option value="Investigation">🔍 Investigation</Select.Option>
                <Select.Option value="Resolution">✅ Resolution</Select.Option>
                <Select.Option value="Communication">📢 Communication</Select.Option>
                <Select.Option value="Escalation">⬆️ Escalation</Select.Option>
                <Select.Option value="SLA Update">📋 SLA Update</Select.Option>
              </Select>
            </Form.Item>

            {/* Event Timestamp Field */}
            <Form.Item
              label={<span style={{ fontWeight: 500 }}>When did this happen?</span>}
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
              label={<span style={{ fontWeight: 500 }}>Event Description</span>}
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
              />
            </Form.Item>

            {/* User Field (Read-only) */}
            <Form.Item
              label={<span style={{ fontWeight: 500 }}>Recorded By</span>}
              name="user"
            >
              <Input
                placeholder="Current user"
                disabled
                size="large"
                style={{ opacity: 0.7 }}
              />
            </Form.Item>

            {/* Info Message */}
            <div style={{
              marginTop: '16px',
              padding: '12px',
              backgroundColor: '#e6f7ff',
              border: '1px solid #91d5ff',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#0050b3'
            }}>
              ℹ️ Timeline events are automatically timestamped and recorded. This creates an audit trail of all incident activities.
            </div>
          </Form>
        </Spin>
      </Modal>
    </div>
  )
}

export default IncidentDetail
