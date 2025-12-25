import { useState, useEffect } from 'react'
import {
  Card,
  Button,
  Space,
  Typography,
  Row,
  Col,
  Tag,
  Spin,
  message,
  Timeline,
  theme,
  Tooltip,
  Empty,
  Divider,
  Collapse,
  Input,
  Modal,
  Descriptions
} from 'antd'
import {
  ArrowLeftOutlined,
  EditOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  FilePdfOutlined,
  InfoCircleOutlined,
  LockOutlined,
  CalendarOutlined,
  FolderOutlined,
  FileTextOutlined,
  TeamOutlined,
  SafetyOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  FieldTimeOutlined,
  ExclamationCircleOutlined,
  AlertOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import useAuthStore from '../stores/authStore'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'

dayjs.extend(relativeTime)

const { Title, Text } = Typography

const ChangeRequestDetail = ({ changeRequestId, navigateToRoute }) => {
  const { token } = theme.useToken()
  const { hasWritePermission, user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [changeRequest, setChangeRequest] = useState(null)
  const [canEdit, setCanEdit] = useState(false)
  const [currentUserApprover, setCurrentUserApprover] = useState(null)

  useEffect(() => {
    loadChangeRequest()
    checkPermissions()
  }, [changeRequestId])

  const checkPermissions = async () => {
    try {
      const hasWrite = await hasWritePermission('Change Request')
      setCanEdit(hasWrite)
    } catch (error) {
      console.error('Error checking permissions:', error)
      setCanEdit(false)
    }
  }

  const loadChangeRequest = async () => {
    try {
      setLoading(true)
      const res = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.change_request.get_change_request?name=${changeRequestId}`,
        { credentials: 'include' }
      )

      if (!res.ok) {
        message.error('Failed to load Change Request details')
        return
      }

      const response = await res.json()
      const data = response.message?.data

      if (!data) {
        message.error('No data returned from server')
        return
      }

      setChangeRequest(data)

      // Check if current user is a pending approver
      const currentUserEmail = user?.email || user?.name
      if (data?.change_approvers && currentUserEmail) {
        const pendingApprover = data.change_approvers.find(
          approver => approver.user === currentUserEmail && approver.approval_status === 'Pending'
        )
        setCurrentUserApprover(pendingApprover)
        console.log('[ChangeRequestDetail] Current user:', currentUserEmail, 'Pending approver:', pendingApprover)
      }
    } catch (error) {
      console.error('Error loading change request:', error)
      message.error('Unable to load Change Request')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    navigateToRoute('change-requests')
  }

  const handleEdit = () => {
    if (changeRequest?.name) {
      window.location.hash = `change-requests/edit/${changeRequest.name}`
    }
  }

  const handlePrintPDF = () => {
    try {
      const pdfUrl = `/api/method/frappe.utils.print_format.download_pdf?doctype=Change Request&name=${encodeURIComponent(
        changeRequest.name
      )}&format=Standard&no_letterhead=0`
      window.open(pdfUrl, '_blank')
      message.success('PDF download started')
    } catch (error) {
      console.error('Error generating PDF:', error)
      message.error('Failed to generate PDF')
    }
  }

  const getApprovalStatusColor = (status) => {
    const colors = {
      'Pending Review': 'orange',
      'Approved for Implementation': 'green',
      'Rework': 'blue',
      'Not Accepted': 'red',
      'Withdrawn': 'gray',
      'Deferred': 'purple'
    }
    return colors[status] || 'default'
  }

  const getCategoryColor = (category) => {
    const colors = {
      'Major Change': 'red',
      'Minor Change': 'orange',
      'Standard Change': 'blue',
      'Emergency Change': 'magenta'
    }
    return colors[category] || 'default'
  }

  const getWorkflowStateColor = (state) => {
    const colors = {
      'Draft': 'default',
      'Pending Approval': 'orange',
      'Approved': 'green',
      'Rejected': 'red',
      'Implemented': 'blue',
      'Closed': 'purple'
    }
    return colors[state] || 'default'
  }

  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A'
    try {
      const date = new Date(timestamp)
      return date.toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true
      })
    } catch (error) {
      return timestamp
    }
  }

  const formatTimestampWithRelative = (timestamp) => {
    if (!timestamp) return { full: 'N/A', relative: '' }
    try {
      const dt = dayjs(timestamp)
      if (!dt.isValid()) return { full: timestamp, relative: '' }

      const formattedDate = dt.format('MMM DD, YYYY')
      const formattedTime = dt.format('h:mm A')
      const relativeText = dt.fromNow()

      return {
        full: `${formattedDate} at ${formattedTime}`,
        relative: relativeText
      }
    } catch (error) {
      return { full: timestamp, relative: '' }
    }
  }

  const calculateApprovalDuration = (submissionDate, approvalDatetime) => {
    if (!submissionDate || !approvalDatetime) return null

    try {
      const submitted = dayjs(submissionDate)
      const approved = dayjs(approvalDatetime)

      if (!submitted.isValid() || !approved.isValid()) return null

      const diffMinutes = approved.diff(submitted, 'minute')
      const diffHours = approved.diff(submitted, 'hour')
      const diffDays = approved.diff(submitted, 'day')

      if (diffDays > 0) {
        const remainingHours = diffHours % 24
        return diffDays === 1
          ? `1 day${remainingHours > 0 ? `, ${remainingHours}h` : ''}`
          : `${diffDays} days${remainingHours > 0 ? `, ${remainingHours}h` : ''}`
      } else if (diffHours > 0) {
        const remainingMinutes = diffMinutes % 60
        return diffHours === 1
          ? `1 hour${remainingMinutes > 0 ? `, ${remainingMinutes}m` : ''}`
          : `${diffHours} hours${remainingMinutes > 0 ? `, ${remainingMinutes}m` : ''}`
      } else if (diffMinutes > 0) {
        return diffMinutes === 1 ? '1 minute' : `${diffMinutes} minutes`
      } else {
        return 'Less than a minute'
      }
    } catch (error) {
      return null
    }
  }

  const formatImplementationDateTime = (date, time) => {
    if (!date) return 'Not scheduled'

    try {
      // Combine date and time
      const dateTimeStr = time ? `${date} ${time}` : date
      const dt = dayjs(dateTimeStr)

      if (!dt.isValid()) return date

      const now = dayjs()
      const relativeText = dt.fromNow()
      const formattedDate = dt.format('MMM DD, YYYY')
      const formattedTime = time ? dt.format('h:mm A') : ''

      return {
        full: time ? `${formattedDate} at ${formattedTime}` : formattedDate,
        relative: relativeText,
        isPast: dt.isBefore(now),
        isSoon: !dt.isBefore(now) && dt.diff(now, 'day') <= 3
      }
    } catch (error) {
      return { full: date, relative: '', isPast: false, isSoon: false }
    }
  }

  const getIncidentSeverityColor = (severity) => {
    const colors = {
      'Critical': 'red',
      'High': 'orange',
      'Medium': 'gold',
      'Low': 'blue'
    }
    return colors[severity] || 'default'
  }

  const getIncidentStatusColor = (status) => {
    const colors = {
      'Open': 'orange',
      'In Progress': 'blue',
      'Resolved': 'green',
      'Closed': 'default'
    }
    return colors[status] || 'default'
  }

  const getDetailFieldIcon = (fieldName) => {
    const iconMap = {
      'cr_number': <FileTextOutlined style={{ color: '#1890ff' }} />,
      'system_affected': <FolderOutlined style={{ color: '#722ed1' }} />,
      'project': <FolderOutlined style={{ color: '#13c2c2' }} />,
      'incident': <ExclamationCircleOutlined style={{ color: '#ff7a45' }} />,
      'category': <SafetyOutlined style={{ color: '#fa8c16' }} />,
      'submission_date': <CalendarOutlined style={{ color: '#52c41a' }} />,
      'implementation': <FieldTimeOutlined style={{ color: '#eb2f96' }} />,
      'downtime': <WarningOutlined style={{ color: '#faad14' }} />,
      'workflow': <ThunderboltOutlined style={{ color: '#1890ff' }} />,
      'originator': <UserOutlined style={{ color: '#722ed1' }} />,
      'manager': <TeamOutlined style={{ color: '#13c2c2' }} />
    }
    return iconMap[fieldName] || <InfoCircleOutlined style={{ color: '#8c8c8c' }} />
  }

  if (loading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <Spin size="large" />
            <div style={{ marginTop: 16 }}>
              <Text type="secondary">Loading change request details...</Text>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!changeRequest) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Empty description="Change Request not found">
            <Button type="primary" onClick={handleBack}>
              Back to Change Requests
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Header with Back Button and Actions */}
      <Card style={{ marginBottom: 16, ...getHeaderBannerStyle(token) }}>
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <Button
            type="text"
            onClick={handleBack}
            icon={<ArrowLeftOutlined />}
            style={{ padding: '0 0' }}
          >
            Back to Change Requests
          </Button>
          <Row justify="space-between" align="middle">
            <Col flex="auto">
              <Title level={3} style={{ margin: 0 }}>
                {changeRequest.title}
              </Title>
            </Col>
            <Col>
              <Space size="small">
                <Tooltip
                  title={
                    canEdit
                      ? 'Edit Change Request'
                      : "You don't have permission to edit Change Requests"
                  }
                >
                  <Button
                    type="primary"
                    size="small"
                    icon={canEdit ? <EditOutlined /> : <LockOutlined />}
                    onClick={handleEdit}
                    disabled={!canEdit}
                  >
                    Edit
                  </Button>
                </Tooltip>
                <Button
                  type="default"
                  size="small"
                  icon={<FilePdfOutlined />}
                  onClick={handlePrintPDF}
                >
                  Print
                </Button>
              </Space>
            </Col>
          </Row>
        </Space>
      </Card>

      {/* Approver Notification Card - Read-only notification directing to Edit view */}
      {currentUserApprover && (
        <Card
          style={{
            marginBottom: 16,
            background: '#e6f7ff',
            borderColor: '#91d5ff',
            borderWidth: '2px'
          }}
        >
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <InfoCircleOutlined style={{ fontSize: '20px', color: '#1890ff' }} />
              <Title level={5} style={{ margin: 0, color: '#096dd9' }}>
                Your Approval Required
              </Title>
            </div>

            <div>
              <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                Business Function
              </Text>
              <Text strong style={{ fontSize: '14px' }}>
                {currentUserApprover.business_function}
              </Text>
            </div>

            <div style={{
              padding: '12px',
              background: '#fff',
              borderRadius: '4px',
              border: '1px solid #d9d9d9'
            }}>
              <Text type="secondary" style={{ fontSize: '13px' }}>
                To approve or reject this change request, please click the <strong>Edit</strong> button above and use the approval dialog.
              </Text>
            </div>
          </Space>
        </Card>
      )}

      {/* Change Request Details */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>Change Request Details</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions bordered column={2}>
          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('cr_number')}
                <span>CR Number</span>
              </Space>
            }
          >
            <code style={{ backgroundColor: '#f5f5f5', padding: '2px 6px', borderRadius: '3px', fontSize: '13px' }}>
              {changeRequest.name}
            </code>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                <InfoCircleOutlined style={{ color: '#1890ff' }} />
                <span>Approval Status</span>
              </Space>
            }
          >
            <Tag color={getApprovalStatusColor(changeRequest.approval_status)} style={{ fontSize: '13px' }}>
              {changeRequest.approval_status}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('originator')}
                <span>Originator</span>
              </Space>
            }
          >
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: '14px' }}>
                {changeRequest.originator_full_name || changeRequest.originator_name}
              </Text>
              <Text type="secondary" style={{ fontSize: '11px' }}>
                ID: {changeRequest.originator_name}
              </Text>
            </Space>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('manager')}
                <span>Originator Manager</span>
              </Space>
            }
          >
            <Space direction="vertical" size={0}>
              <Text strong style={{ fontSize: '14px' }}>
                {changeRequest.originator_manager_full_name || changeRequest.originators_manager || 'N/A'}
              </Text>
              {changeRequest.originators_manager && (
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  ID: {changeRequest.originators_manager}
                </Text>
              )}
            </Space>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                <FolderOutlined style={{ color: '#13c2c2' }} />
                <span>Organization</span>
              </Space>
            }
          >
            {changeRequest.originator_organization || 'N/A'}
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('system_affected')}
                <span>System Affected</span>
              </Space>
            }
          >
            <Tag icon={<FolderOutlined />} style={{ fontSize: '13px' }}>
              {changeRequest.system_affected}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('project')}
                <span>Project</span>
              </Space>
            }
          >
            {changeRequest.project ? (
              <Tag icon={<FolderOutlined />} style={{ fontSize: '13px' }}>
                {changeRequest.project}
              </Tag>
            ) : (
              'N/A'
            )}
          </Descriptions.Item>

          {changeRequest.incident_details && (
            <Descriptions.Item
              label={
                <Space size={8}>
                  {getDetailFieldIcon('incident')}
                  <span>Related Incident</span>
                </Space>
              }
              span={2}
            >
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                <Space size={8} wrap>
                  <Button
                    type="link"
                    icon={<ExclamationCircleOutlined />}
                    onClick={() => window.location.hash = `incidents/detail/${changeRequest.incident_details.name}`}
                    style={{ padding: 0, height: 'auto', fontWeight: '500', fontSize: '14px' }}
                  >
                    {changeRequest.incident_details.name}
                  </Button>
                  <Text strong style={{ fontSize: '14px' }}>
                    {changeRequest.incident_details.title}
                  </Text>
                </Space>
                <Space size={8} wrap>
                  <Tag
                    icon={<AlertOutlined />}
                    color={getIncidentSeverityColor(changeRequest.incident_details.severity)}
                    style={{ fontSize: '12px' }}
                  >
                    {changeRequest.incident_details.severity} Severity
                  </Tag>
                  <Tag
                    color={getIncidentStatusColor(changeRequest.incident_details.status)}
                    style={{ fontSize: '12px' }}
                  >
                    {changeRequest.incident_details.status}
                  </Tag>
                  {changeRequest.incident_details.category && (
                    <Tag icon={<FolderOutlined />} style={{ fontSize: '12px' }}>
                      {changeRequest.incident_details.category}
                    </Tag>
                  )}
                  {changeRequest.incident_details.assigned_to_full_name && (
                    <Tag icon={<UserOutlined />} style={{ fontSize: '12px' }}>
                      {changeRequest.incident_details.assigned_to_full_name}
                    </Tag>
                  )}
                </Space>
              </Space>
            </Descriptions.Item>
          )}

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('category')}
                <span>Change Category</span>
              </Space>
            }
          >
            <Tag color={getCategoryColor(changeRequest.change_category)} style={{ fontSize: '13px' }}>
              {changeRequest.change_category}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('submission_date')}
                <span>Submission Date</span>
              </Space>
            }
          >
            {(() => {
              const submissionTimestamp = formatTimestampWithRelative(changeRequest.creation)
              return (
                <Space size={8}>
                  <CalendarOutlined style={{ color: '#52c41a' }} />
                  <Text>{submissionTimestamp.full}</Text>
                  {submissionTimestamp.relative && (
                    <Text type="secondary" style={{ fontSize: '12px' }}>
                      ({submissionTimestamp.relative})
                    </Text>
                  )}
                </Space>
              )
            })()}
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('implementation')}
                <span>Implementation Scheduled</span>
              </Space>
            }
            span={2}
          >
            {(() => {
              const implDateTime = formatImplementationDateTime(
                changeRequest.implementation_date,
                changeRequest.implementation_time
              )
              if (typeof implDateTime === 'string') {
                return implDateTime
              }
              return (
                <Space size={8}>
                  <FieldTimeOutlined style={{ color: '#eb2f96' }} />
                  <Text strong>{implDateTime.full}</Text>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '12px',
                      color: implDateTime.isPast
                        ? '#ff4d4f'
                        : implDateTime.isSoon
                        ? '#faad14'
                        : '#52c41a'
                    }}
                  >
                    ({implDateTime.relative})
                  </Text>
                </Space>
              )
            })()}
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('downtime')}
                <span>Downtime Expected</span>
              </Space>
            }
          >
            <Tag
              icon={changeRequest.downtime_expected ? <WarningOutlined /> : <CheckCircleOutlined />}
              color={changeRequest.downtime_expected ? 'red' : 'green'}
              style={{ fontSize: '13px' }}
            >
              {changeRequest.downtime_expected ? 'Yes' : 'No'}
            </Tag>
          </Descriptions.Item>

          <Descriptions.Item
            label={
              <Space size={8}>
                {getDetailFieldIcon('workflow')}
                <span>Workflow State</span>
              </Space>
            }
          >
            <Tag
              icon={<ThunderboltOutlined />}
              color={getWorkflowStateColor(changeRequest.workflow_state)}
              style={{ fontSize: '13px' }}
            >
              {changeRequest.workflow_state || 'Not set'}
            </Tag>
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Change Approvers Section */}
      {changeRequest.change_approvers && changeRequest.change_approvers.length > 0 && (
        <Card
          title={
            <Space>
              <UserOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
              <span>Change Approvers</span>
            </Space>
          }
          style={{ marginBottom: 16 }}
        >
              <Timeline
                items={[...changeRequest.change_approvers]
                  .sort((a, b) => {
                    const dateA = new Date(a.modified || 0)
                    const dateB = new Date(b.modified || 0)
                    return dateB - dateA
                  })
                  .map((approver, index, sortedApprovers) => {
                    let statusColor = 'gray'
                    let statusIcon = null
                    let statusLabel = approver.approval_status || 'Pending'

                    if (approver.approval_status === 'Approved') {
                      statusColor = 'green'
                      statusIcon = <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    } else if (approver.approval_status === 'Rejected') {
                      statusColor = 'red'
                      statusIcon = <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
                    } else if (approver.approval_status === 'Pending') {
                      statusColor = 'orange'
                      statusIcon = <ClockCircleOutlined style={{ color: '#faad14' }} />
                    }

                    return {
                      dot: statusIcon,
                      children: (
                        <div style={{ paddingBottom: index < sortedApprovers.length - 1 ? '16px' : '0' }}>
                          <div
                            style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '8px'
                            }}
                          >
                            <div>
                              <Text strong style={{ fontSize: '14px' }}>
                                {approver.user_full_name || approver.user || 'N/A'}
                              </Text>
                              <div style={{ marginTop: '4px', fontSize: '12px', color: '#8c8c8c' }}>
                                {approver.business_function && <div>{approver.business_function}</div>}
                              </div>
                              <div style={{ marginTop: '4px' }}>
                                <Tag color={statusColor}>{statusLabel}</Tag>
                              </div>
                            </div>
                          </div>
                          {approver.approval_datetime && (
                            <Space direction="vertical" size={4}>
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {formatTimestamp(approver.approval_datetime)}
                              </Text>
                              {(approver.approval_status === 'Approved' || approver.approval_status === 'Rejected') && (() => {
                                const duration = calculateApprovalDuration(changeRequest.creation, approver.approval_datetime)
                                return duration ? (
                                  <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
                                    {approver.approval_status} in {duration}
                                  </Text>
                                ) : null
                              })()}
                            </Space>
                          )}
                          {approver.remarks && (
                            <div
                              style={{
                                marginTop: '8px',
                                padding: '8px',
                                background: '#fff',
                                borderRadius: '4px',
                                borderLeft: '3px solid #1890ff'
                              }}
                            >
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                Remarks:
                              </Text>
                              <div style={{ fontSize: '13px', marginTop: '4px', color: '#262626' }}>
                                {approver.remarks}
                              </div>
                            </div>
                          )}
                        </div>
                      )
                    }
                  })}
              />
        </Card>
      )}

      {/* Detailed Information in Collapsibles */}
      <Card
        title={
          <Space>
            <FileTextOutlined style={{ color: getHeaderIconColor(token), fontSize: '18px' }} />
            <span>Detailed Information</span>
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Collapse
            items={[
              {
                key: '1',
                label: 'Detailed Description',
                children: (
                  <div
                    style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                    dangerouslySetInnerHTML={{
                      __html: changeRequest.detailed_description || 'N/A'
                    }}
                  />
                )
              },
              {
                key: '2',
                label: 'Release Notes',
                children: (
                  <div
                    style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                    dangerouslySetInnerHTML={{ __html: changeRequest.release_notes || 'N/A' }}
                  />
                )
              },
              {
                key: '3',
                label: 'Testing Plan',
                children: (
                  <div
                    style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                    dangerouslySetInnerHTML={{ __html: changeRequest.testing_plan || 'N/A' }}
                  />
                )
              },
              {
                key: '4',
                label: 'Rollback Plan',
                children: (
                  <div
                    style={{ padding: '12px', background: '#f5f5f5', borderRadius: '4px' }}
                    dangerouslySetInnerHTML={{ __html: changeRequest.rollback_plan || 'N/A' }}
                  />
                )
              }
            ]}
            defaultActiveKey={['1']}
        />
      </Card>
    </div>
  )
}

export default ChangeRequestDetail
