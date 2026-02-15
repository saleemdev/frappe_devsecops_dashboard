import React, { useEffect } from 'react'
import { Modal, Form, Input, Descriptions, Button, Typography, Alert, Space, Tag } from 'antd'
import { CheckCircleOutlined, CloseCircleOutlined, FileTextOutlined } from '@ant-design/icons'
import Swal from 'sweetalert2'

const { Text } = Typography

const ApprovalModal = ({
  visible,
  timesheet,
  onApprove,
  onReject,
  onCancel,
  loading
}) => {
  const [form] = Form.useForm()

  useEffect(() => {
    if (!visible) {
      form.resetFields()
    }
  }, [visible, form])

  const handleApprove = async (e) => {
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
    try {
      const result = await onApprove?.(comment)
      if (result?.success === false) {
        await Swal.fire({
          icon: 'error',
          title: 'Approval failed',
          text: result?.error || 'Approval failed. Please try again.'
        })
      }
    } catch (error) {
      await Swal.fire({
        icon: 'error',
        title: 'Approval failed',
        text: error?.message || 'Approval failed. Please try again.'
      })
    }
  }

  const handleReject = async (e) => {
    e?.preventDefault?.()
    e?.stopPropagation?.()
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
      if (error?.errorFields) return
      await Swal.fire({
        icon: 'error',
        title: 'Rejection failed',
        text: error?.message || 'Rejection failed. Please try again.'
      })
    }
  }

  return (
    <Modal
      title={
        <Space size={10}>
          <FileTextOutlined style={{ color: '#1677ff' }} />
          <span>Review Team Timesheet</span>
        </Space>
      }
      open={visible}
      onCancel={onCancel}
      footer={
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button htmlType="button" key="cancel" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button
            htmlType="button"
            key="reject"
            danger
            onClick={handleReject}
            loading={loading}
            disabled={loading}
          >
            Reject
          </Button>
          <Button
            htmlType="button"
            key="approve"
            type="primary"
            onClick={handleApprove}
            loading={loading}
            disabled={loading}
          >
            Approve
          </Button>
        </div>
      }
      width={600}
    >
      {timesheet && (
        <>
          {loading ? (
            <Alert
              type="warning"
              showIcon
              style={{ marginBottom: 16 }}
              message="Submitting timesheet..."
              description="Please wait while we process your approval action."
            />
          ) : null}
          <Alert
            type="info"
            showIcon
            style={{ marginBottom: 16 }}
            message={`Timesheet ${timesheet.name || ''}`}
            description="Choose Approve to submit the timesheet and accrue TOIL, or Reject to return it for correction."
          />

          <Descriptions bordered size="small" column={1} style={{ marginBottom: 16 }}>
            <Descriptions.Item label="Employee">
              {timesheet.employee_name}
            </Descriptions.Item>
            <Descriptions.Item label="Period">
              {(timesheet.start_date || timesheet.from_date)} - {(timesheet.end_date || timesheet.to_date)}
            </Descriptions.Item>
            <Descriptions.Item label="TOIL Hours">
              {Number(timesheet.total_toil_hours || 0).toFixed(2)}
            </Descriptions.Item>
            <Descriptions.Item label="TOIL Days">
              {Number(timesheet.toil_days || 0).toFixed(2)}
            </Descriptions.Item>
          </Descriptions>

          <Space size={8} wrap style={{ marginBottom: 12 }}>
            <Tag color="processing">Needs Supervisor Action</Tag>
            <Tag color="blue">{Number(timesheet.total_toil_hours || 0).toFixed(2)} hrs</Tag>
            <Tag color="cyan">{Number(timesheet.toil_days || 0).toFixed(2)} days</Tag>
          </Space>

          <Form form={form} layout="vertical" preserve={false} style={{ marginTop: 16 }}>
            <Form.Item name="comment" label="Approval Comment (Optional)">
              <Input.TextArea
                rows={3}
                placeholder="Add notes about this approval..."
              />
            </Form.Item>

            <Form.Item
              name="reason"
              label="Rejection Reason (Required for reject)"
              rules={[
                { required: false },
                { min: 10, message: 'Reason must be at least 10 characters' }
              ]}
            >
              <Input.TextArea
                rows={3}
                placeholder="Explain why this timesheet is rejected..."
              />
            </Form.Item>
          </Form>

          <div style={{
            marginTop: '16px',
            padding: '12px',
            backgroundColor: '#f6ffed',
            borderRadius: '4px',
            border: '1px solid #b7eb8f'
          }}>
            <Text style={{ fontSize: '13px', color: '#135200' }}>
              <CheckCircleOutlined style={{ marginRight: 6 }} />
              Approving will submit this timesheet and create a Leave Allocation of {Number(timesheet.toil_days || 0).toFixed(2)} days (valid for 6 months).
            </Text>
          </div>

          <div style={{
            marginTop: '10px',
            padding: '12px',
            backgroundColor: '#fff2f0',
            borderRadius: '4px',
            border: '1px solid #ffccc7'
          }}>
            <Text style={{ fontSize: '13px', color: '#a8071a' }}>
              <CloseCircleOutlined style={{ marginRight: 6 }} />
              Rejecting keeps the timesheet in draft and requires a clear reason so the applicant can correct and resubmit.
            </Text>
          </div>
        </>
      )}
    </Modal>
  )
}

export default ApprovalModal
