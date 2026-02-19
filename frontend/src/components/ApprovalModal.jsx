import { useEffect, useState } from 'react'
import { Alert, Button, Descriptions, Form, Grid, Input, Modal, Space, Tag, Typography } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import Swal from 'sweetalert2'

import { getToilStatusColor, normalizeToilStatus } from '../utils/toilStatusUtils'

const { Text } = Typography

const ApprovalModal = ({
  visible,
  timesheet,
  onApprove,
  onReject,
  onCancel,
  loading
}) => {
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md
  const [form] = Form.useForm()
  const [showRejectForm, setShowRejectForm] = useState(false)

  const toilStatus = normalizeToilStatus(timesheet || {})

  useEffect(() => {
    if (!visible) {
      form.resetFields()
      setShowRejectForm(false)
    }
  }, [visible, form])

  const handleApprove = async (e) => {
    if (loading) {
      return
    }

    e?.preventDefault?.()
    e?.stopPropagation?.()

    if (!timesheet?.name && !timesheet?.id) {
      await Swal.fire({
        icon: 'error',
        title: 'Approval failed',
        text: 'No timesheet selected for approval.'
      })
      return
    }

    const comment = form?.getFieldValue?.('comment') ?? ''
    const result = await onApprove?.(comment)
    if (result?.success === false) {
      await Swal.fire({
        icon: 'error',
        title: 'Approval failed',
        text: result?.error || 'Approval failed. Please try again.'
      })
    }
  }

  const handleRejectClick = (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
    if (!showRejectForm) {
      setShowRejectForm(true)
      return
    }
    handleRejectConfirm()
  }

  const handleRejectConfirm = async () => {
    if (loading) return

    if (!timesheet?.name && !timesheet?.id) {
      await Swal.fire({
        icon: 'error',
        title: 'Rejection failed',
        text: 'No timesheet selected for rejection.'
      })
      return
    }

    try {
      await form.validateFields(['reason'])
      const result = await onReject?.(form.getFieldValue('reason'))
      if (result?.success === false) {
        await Swal.fire({
          icon: 'error',
          title: 'Rejection failed',
          text: result?.error || 'Rejection failed. Please try again.'
        })
      }
    } catch (error) {
      if (!error?.errorFields) {
        await Swal.fire({
          icon: 'error',
          title: 'Rejection failed',
          text: error?.message || 'Rejection failed. Please try again.'
        })
      }
    }
  }

  return (
    <Modal
      title={(
        <Space size={10}>
          <FileTextOutlined style={{ color: '#1677ff' }} />
          <span>Review Team Timesheet</span>
        </Space>
      )}
      open={visible}
      onCancel={onCancel}
      width={isMobile ? '94vw' : 600}
      styles={{
        body: {
          background: 'linear-gradient(145deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.45)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)'
        }
      }}
      footer={(
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, flexWrap: 'wrap' }}>
          <Button htmlType="button" key="cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button htmlType="button" key="reject" danger onClick={handleRejectClick} loading={loading} disabled={loading}>
            {showRejectForm ? 'Confirm Rejection' : 'Reject'}
          </Button>
          <Button htmlType="button" key="approve" type="primary" onClick={handleApprove} loading={loading} disabled={loading}>
            Approve
          </Button>
        </div>
      )}
    >
      {timesheet && (
        <>
          {loading ? (
            <Alert
              type="info"
              showIcon
              style={{ marginBottom: 16 }}
              message="Submitting timesheet..."
              description="Please wait while we process your review action."
            />
          ) : null}

          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Timesheet ${timesheet.name || ''}`}
            description="Approve to submit the timesheet and accrue TOIL, or reject it with a reason for correction."
          />

          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Employee">{timesheet.employee_name}</Descriptions.Item>
            <Descriptions.Item label="Period">{(timesheet.start_date || timesheet.from_date)} - {(timesheet.end_date || timesheet.to_date)}</Descriptions.Item>
            <Descriptions.Item label="TOIL Status">
              <Tag color={getToilStatusColor(toilStatus)}>{toilStatus}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="TOIL Hours">{Number(timesheet.total_toil_hours || 0).toFixed(2)}</Descriptions.Item>
            <Descriptions.Item label="TOIL Days">{Number(timesheet.toil_days || 0).toFixed(2)}</Descriptions.Item>
          </Descriptions>

          <Space size={8} wrap style={{ marginBottom: 12 }}>
            <Tag color="processing">Supervisor Review</Tag>
            <Tag color={getToilStatusColor(toilStatus)}>{toilStatus}</Tag>
            <Tag color="cyan">{Number(timesheet.toil_days || 0).toFixed(2)} days</Tag>
          </Space>

          <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 16 }}>
            {!showRejectForm && (
              <Form.Item name="comment" label="Approval Comment (Optional)">
                <Input.TextArea rows={3} placeholder="Add notes about this approval..." />
              </Form.Item>
            )}

            {showRejectForm && (
              <Form.Item
                name="reason"
                label="Rejection Reason (Required)"
                rules={[
                  {
                    validator: async (_, value) => {
                      const text = String(value || '').trim()
                      if (!text) {
                        throw new Error('Rejection reason is required')
                      }
                    }
                  },
                  { min: 10, message: 'Reason must be at least 10 characters' }
                ]}
              >
                <Input.TextArea rows={3} placeholder="Explain why this timesheet is rejected..." autoFocus />
              </Form.Item>
            )}
          </Form>

          {!showRejectForm && (
            <div
              style={{
                marginTop: 16,
                padding: 12,
                backgroundColor: 'rgba(246,255,237,0.9)',
                borderRadius: 6,
                border: '1px solid #b7eb8f'
              }}
            >
              <Text style={{ fontSize: '13px', color: '#135200' }}>
                <CheckCircleOutlined style={{ marginRight: 6 }} />
                Approving will submit this timesheet and create a Leave Allocation of {Number(timesheet.toil_days || 0).toFixed(2)} days (valid for 6 months).
              </Text>
            </div>
          )}

          {showRejectForm && (
            <div
              style={{
                marginTop: 10,
                padding: 12,
                backgroundColor: 'rgba(255,242,240,0.95)',
                borderRadius: 6,
                border: '1px solid #ffccc7'
              }}
            >
              <Text style={{ fontSize: '13px', color: '#a8071a' }}>
                <CloseCircleOutlined style={{ marginRight: 6 }} />
                Rejecting keeps the timesheet in draft. The applicant will see the status as Rejected and can correct and resubmit.
              </Text>
            </div>
          )}
        </>
      )}
    </Modal>
  )
}

export default ApprovalModal
