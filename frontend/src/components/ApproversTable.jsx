import { useState } from 'react'
import {
  Table,
  Button,
  Space,
  Empty,
  Tag
} from 'antd'
import {
  CheckOutlined,
  CloseOutlined,
  UserOutlined
} from '@ant-design/icons'

/**
 * ApproversTable Component (Read-Only)
 * Displays the Change Request Approver child table in read-only mode
 * Allows inline approve/reject actions for current user's pending approvals
 */
export default function ApproversTable({
  approvers = [],
  currentUser = null,
  onApproveClick = null,
  onRejectClick = null,
  loading = false
}) {
  const [actionLoading, setActionLoading] = useState(false)

  // Check if current user is an approver and can take action
  const canApprove = (approver) => {
    return approver.user === currentUser && approver.approval_status === 'Pending'
  }

  const columns = [
    {
      title: 'User',
      dataIndex: 'user',
      key: 'user',
      width: '20%',
      render: (text) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <UserOutlined style={{ color: '#1890ff' }} />
          <span>{text || 'N/A'}</span>
        </div>
      )
    },
    {
      title: 'Business Function',
      dataIndex: 'business_function',
      key: 'business_function',
      width: '20%',
      render: (text) => <span>{text || '-'}</span>
    },
    {
      title: 'Approval Status',
      dataIndex: 'approval_status',
      key: 'approval_status',
      width: '15%',
      render: (status) => {
        let color = 'default'
        if (status === 'Approved') color = 'success'
        else if (status === 'Rejected') color = 'error'
        else if (status === 'Pending') color = 'processing'
        return <Tag color={color}>{status || 'Pending'}</Tag>
      }
    },
    {
      title: 'Remarks',
      dataIndex: 'remarks',
      key: 'remarks',
      width: '25%',
      render: (text) => (
        <span style={{ fontSize: '12px', color: '#666' }}>
          {text ? text.substring(0, 40) + (text.length > 40 ? '...' : '') : '-'}
        </span>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      width: '20%',
      render: (_, record, index) => {
        const isCurrentUserApprover = canApprove(record)
        return (
          <Space size="small">
            <Button
              type="primary"
              size="small"
              icon={<CheckOutlined />}
              onClick={() => onApproveClick && onApproveClick(index, record)}
              disabled={!isCurrentUserApprover}
              style={{
                backgroundColor: isCurrentUserApprover ? '#52c41a' : '#d9d9d9',
                borderColor: isCurrentUserApprover ? '#52c41a' : '#d9d9d9',
                color: isCurrentUserApprover ? '#fff' : '#999'
              }}
            >
              Approve
            </Button>
            <Button
              danger
              size="small"
              icon={<CloseOutlined />}
              onClick={() => onRejectClick && onRejectClick(index, record)}
              disabled={!isCurrentUserApprover}
              style={{
                backgroundColor: isCurrentUserApprover ? '#ff4d4f' : '#f5f5f5',
                borderColor: isCurrentUserApprover ? '#ff4d4f' : '#d9d9d9',
                color: isCurrentUserApprover ? '#fff' : '#999'
              }}
            >
              Reject
            </Button>
          </Space>
        )
      }
    }
  ]

  if (!approvers || approvers.length === 0) {
    return (
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: '0 0 16px 0' }}>Change Request Approvers</h3>
        <Empty description="No approvers assigned" />
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: '16px' }}>
        <h3 style={{ margin: 0 }}>Change Request Approvers</h3>
      </div>

      <Table
        columns={columns}
        dataSource={approvers}
        rowKey={(_, index) => index}
        pagination={false}
        loading={loading}
        size="small"
        scroll={{ x: 800 }}
        rowClassName={(record) => {
          // Highlight current user's row
          if (record.user === currentUser) {
            return 'current-user-row'
          }
          return ''
        }}
      />
      <style>{`
        .current-user-row {
          background-color: #e6f7ff !important;
          border-left: 3px solid #1890ff;
        }
        .current-user-row:hover {
          background-color: #bae7ff !important;
        }
      `}</style>
    </div>
  )
}
