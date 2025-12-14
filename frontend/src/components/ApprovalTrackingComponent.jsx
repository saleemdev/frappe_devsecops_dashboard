import { useState } from 'react'
import {
  Timeline,
  Tag,
  Card,
  Space,
  Button,
  Typography,
  Empty,
  Spin,
  Tooltip,
  Badge,
  Divider
} from 'antd'
import {
  CheckCircleFilled,
  CloseCircleFilled,
  ClockCircleOutlined,
  UserOutlined,
  FileTextOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

dayjs.extend(relativeTime)

const { Text, Paragraph } = Typography

/**
 * ApprovalTrackingComponent
 * Displays all approvers and their approval status in a timeline format
 * Highlights current user's pending approvals
 */
export default function ApprovalTrackingComponent({
  approvers = [],
  currentUser = null,
  onApproveClick = null,
  onRejectClick = null,
  loading = false,
  changeRequestName = null
}) {
  if (loading) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <Spin size="large" tip="Loading approval tracking..." />
      </Card>
    )
  }

  if (!approvers || approvers.length === 0) {
    return (
      <Card>
        <Empty
          description="No approvers assigned"
          style={{ margin: '20px 0' }}
        />
      </Card>
    )
  }

  // Get status color and icon
  const getStatusConfig = (status) => {
    switch (status?.toLowerCase()) {
      case 'approved':
        return {
          color: '#52c41a',
          icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
          label: 'Approved',
          dotColor: '#52c41a'
        }
      case 'rejected':
        return {
          color: '#ff4d4f',
          icon: <CloseCircleFilled style={{ color: '#ff4d4f' }} />,
          label: 'Rejected',
          dotColor: '#ff4d4f'
        }
      default:
        return {
          color: '#1890ff',
          icon: <ClockCircleOutlined style={{ color: '#1890ff' }} />,
          label: 'Pending',
          dotColor: '#1890ff'
        }
    }
  }

  // Build timeline items
  const timelineItems = approvers.map((approver, index) => {
    const statusConfig = getStatusConfig(approver.approval_status)
    const isCurrentUser = currentUser && approver.user === currentUser
    const isPending = approver.approval_status?.toLowerCase() === 'pending'
    const isCurrentUserPending = isCurrentUser && isPending

    // Get user display name
    const userName = approver.user || 'Unknown User'
    const businessFunction = approver.business_function || 'N/A'

    // Format timestamp - use approval_datetime if available (when decision was made)
    // This field is only set when the approver makes their decision (Approved/Rejected)
    const timestamp = approver.approval_datetime
    const hasActed = approver.approval_status && approver.approval_status.toLowerCase() !== 'pending'

    // Show relative time for recent actions, absolute time for older ones
    const timeDisplay = timestamp && hasActed
      ? `${dayjs(timestamp).format('MMM DD, YYYY [at] HH:mm')} (${dayjs(timestamp).fromNow()})`
      : 'Pending - Not yet acted'

    return {
      dot: statusConfig.icon,
      color: statusConfig.dotColor,
      children: (
        <div
          style={{
            padding: '12px 16px',
            backgroundColor: isCurrentUserPending ? '#e6f7ff' : '#fafafa',
            border: isCurrentUserPending ? '2px solid #1890ff' : '1px solid #f0f0f0',
            borderRadius: '6px',
            marginBottom: '12px'
          }}
        >
          {/* Header with user and status */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <UserOutlined style={{ fontSize: '14px', color: '#666' }} />
              <Text strong style={{ fontSize: '14px' }}>
                {userName}
              </Text>
              {isCurrentUser && (
                <Badge
                  count="YOU"
                  style={{
                    backgroundColor: '#1890ff',
                    color: 'white',
                    fontSize: '10px',
                    padding: '0 6px',
                    borderRadius: '3px'
                  }}
                />
              )}
            </div>
            <Tag color={statusConfig.color} style={{ margin: 0 }}>
              {statusConfig.label}
            </Tag>
          </div>

          {/* Business Function */}
          <div style={{ marginBottom: '8px' }}>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Business Function: <strong>{businessFunction}</strong>
            </Text>
          </div>

          {/* Remarks/Comments */}
          {approver.remarks && (
            <div style={{ marginBottom: '8px', padding: '8px', backgroundColor: '#fff', borderRadius: '4px', borderLeft: `3px solid ${statusConfig.color}` }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '6px' }}>
                <FileTextOutlined style={{ fontSize: '12px', color: '#666', marginTop: '2px' }} />
                <div style={{ flex: 1 }}>
                  <Text type="secondary" style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>
                    Comments:
                  </Text>
                  <Paragraph
                    style={{ margin: 0, fontSize: '13px', color: '#333' }}
                    ellipsis={{ rows: 2, expandable: true }}
                  >
                    {approver.remarks}
                  </Paragraph>
                </div>
              </div>
            </div>
          )}

          {/* Timestamp */}
          <div style={{ marginBottom: '8px' }}>
            <Text type="secondary" style={{ fontSize: '11px' }}>
              {timeDisplay}
            </Text>
          </div>

          {/* Action buttons for current user's pending approval */}
          {isCurrentUserPending && onApproveClick && onRejectClick && (
            <>
              <Divider style={{ margin: '8px 0' }} />
              <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
                <Button
                  type="primary"
                  size="small"
                  style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
                  onClick={() => onApproveClick(index, approver)}
                >
                  Approve
                </Button>
                <Button
                  danger
                  size="small"
                  onClick={() => onRejectClick(index, approver)}
                >
                  Reject
                </Button>
              </Space>
            </>
          )}
        </div>
      )
    }
  })

  return (
    <Card
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Badge count={approvers.length} style={{ backgroundColor: '#1890ff' }} />
          <span>Approval Tracking</span>
        </div>
      }
      style={{ marginTop: '16px' }}
    >
      <Timeline items={timelineItems} />
    </Card>
  )
}

