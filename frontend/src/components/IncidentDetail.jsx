import React, { useEffect } from 'react'
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
  Spin,
  Empty
} from 'antd'
import {
  ArrowLeftOutlined,
  ExclamationCircleOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EditOutlined
} from '@ant-design/icons'
import useIncidentsStore from '../stores/incidentsStore'
import useNavigationStore from '../stores/navigationStore'

const { Title, Text, Paragraph } = Typography

const IncidentDetail = ({ incidentId, navigateToRoute }) => {
  // Use store state instead of local state
  const {
    selectedIncident,
    loading,
    fetchIncident,
    setSelectedIncident
  } = useIncidentsStore()

  // Navigation store with fallback to props
  const { goToIncidents, editIncident } = useNavigationStore()

  // Fetch incident on mount or when incidentId changes
  // Also force refresh when coming back from edit by checking timestamp
  useEffect(() => {
    const loadIncidentData = async () => {
      if (!incidentId) return

      try {
        console.log('[IncidentDetail] Loading incident:', incidentId)
        // Force fetch to get fresh data (bypasses cache)
        await fetchIncident(incidentId)
      } catch (error) {
        console.error('[IncidentDetail] Error loading incident:', error)
        message.error(error?.message || 'Failed to load incident details')
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
    if (editIncident && typeof editIncident === 'function') {
      editIncident(incidentId)
    } else if (navigateToRoute && typeof navigateToRoute === 'function') {
      navigateToRoute('incident-edit', null, incidentId)
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
      if (goToIncidents && typeof goToIncidents === 'function') {
        goToIncidents()
      } else if (navigateToRoute && typeof navigateToRoute === 'function') {
        navigateToRoute('incidents')
      }
    }

    return (
      <Card>
        <Empty
          description="Incident not found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={handleBackClick}>
            Back to Incidents
          </Button>
        </Empty>
      </Card>
    )
  }

  if (!selectedIncident) {
    return null // Should not reach here due to earlier check, but safety fallback
  }

  // Navigation helper
  const handleBackToIncidents = () => {
    if (goToIncidents && typeof goToIncidents === 'function') {
      goToIncidents()
    } else if (navigateToRoute && typeof navigateToRoute === 'function') {
      navigateToRoute('incidents')
    }
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
          <Descriptions.Item label="Assigned To">{selectedIncident.assigned_to || '-'}</Descriptions.Item>
          <Descriptions.Item label="Assigned To Full Name">{selectedIncident.assigned_to_full_name || selectedIncident.assigned_to || '-'}</Descriptions.Item>
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
      <Card title="Incident Timeline">
        {selectedIncident.timeline && selectedIncident.timeline.length > 0 ? (
          <Timeline
            items={selectedIncident.timeline.map(item => ({
              children: (
                <div>
                  <Text strong>{item.action || 'Event'}</Text>
                  <br />
                  <Text type="secondary">{item.date || item.timestamp || '-'} - {item.user || '-'}</Text>
                  <br />
                  <Text>{item.description || 'No description'}</Text>
                </div>
              )
            }))}
          />
        ) : (
          <Text type="secondary">No timeline entries yet</Text>
        )}
      </Card>
    </div>
  )
}

export default IncidentDetail
