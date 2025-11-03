import { useState } from 'react'
import {
  Modal,
  Form,
  Input,
  Button,
  Space,
  Alert,
  Spin,
  message
} from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'

/**
 * ApprovalActionModal
 * Modal dialog for approving or rejecting a change request
 * Requires mandatory comments/reason
 */
export default function ApprovalActionModal({
  visible = false,
  action = 'approve', // 'approve' or 'reject'
  approverName = '',
  changeRequestName = '',
  onSubmit = null,
  onCancel = null,
  loading = false
}) {
  const [form] = Form.useForm()
  const [submitting, setSubmitting] = useState(false)

  const isApprove = action === 'approve'
  const actionTitle = isApprove ? 'Approve' : 'Reject'
  const actionColor = isApprove ? '#52c41a' : '#ff4d4f'
  const ActionIcon = isApprove ? CheckCircleOutlined : CloseCircleOutlined

  const handleSubmit = async (values) => {
    try {
      setSubmitting(true)

      // Validate remarks
      if (!values.remarks || !values.remarks.trim()) {
        message.error('Please provide comments/reason for your decision')
        return
      }

      // Call the onSubmit callback
      if (onSubmit) {
        await onSubmit({
          action,
          remarks: values.remarks.trim()
        })
      }

      // Reset form
      form.resetFields()
    } catch (error) {
      message.error(error?.message || 'Failed to submit approval')
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = () => {
    form.resetFields()
    if (onCancel) {
      onCancel()
    }
  }

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <ActionIcon style={{ color: actionColor, fontSize: '20px' }} />
          <span>{actionTitle} Change Request</span>
        </div>
      }
      open={visible}
      onCancel={handleCancel}
      footer={null}
      width={600}
      centered
    >
      <Spin spinning={submitting || loading}>
        <div style={{ marginBottom: '16px' }}>
          {/* Alert box */}
          <Alert
            message={
              isApprove
                ? 'You are about to approve this change request'
                : 'You are about to reject this change request'
            }
            description={
              <>
                <div style={{ marginTop: '8px' }}>
                  <strong>Change Request:</strong> {changeRequestName}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <strong>Approver:</strong> {approverName}
                </div>
              </>
            }
            type={isApprove ? 'success' : 'error'}
            showIcon
            icon={<ActionIcon />}
            style={{ marginBottom: '16px' }}
          />
        </div>

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSubmit}
        >
          {/* Remarks field */}
          <Form.Item
            name="remarks"
            label={
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <span>Comments / Reason</span>
                <span style={{ color: '#ff4d4f' }}>*</span>
              </div>
            }
            rules={[
              {
                required: true,
                message: 'Please provide comments or reason for your decision'
              },
              {
                min: 10,
                message: 'Comments must be at least 10 characters'
              },
              {
                max: 1000,
                message: 'Comments cannot exceed 1000 characters'
              }
            ]}
          >
            <Input.TextArea
              placeholder={
                isApprove
                  ? 'Enter your approval comments (e.g., "Reviewed and approved. No issues found.")'
                  : 'Enter your rejection reason (e.g., "Requires additional testing before approval.")'
              }
              rows={5}
              maxLength={1000}
              showCount
              style={{
                borderColor: actionColor,
                borderWidth: '1px'
              }}
            />
          </Form.Item>

          {/* Action buttons */}
          <Form.Item style={{ marginBottom: 0 }}>
            <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
              <Button onClick={handleCancel} disabled={submitting}>
                Cancel
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={submitting}
                style={{
                  backgroundColor: actionColor,
                  borderColor: actionColor
                }}
                icon={<ActionIcon />}
              >
                {actionTitle}
              </Button>
            </Space>
          </Form.Item>
        </Form>

        {/* Info message */}
        <div style={{ marginTop: '16px', padding: '8px 12px', backgroundColor: '#f5f5f5', borderRadius: '4px' }}>
          <ExclamationCircleOutlined style={{ color: '#faad14', marginRight: '8px' }} />
          <span style={{ fontSize: '12px', color: '#666' }}>
            This action cannot be undone. Please review carefully before submitting.
          </span>
        </div>
      </Spin>
    </Modal>
  )
}

