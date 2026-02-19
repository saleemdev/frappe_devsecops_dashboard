/**
 * TOIL Leave Application Form
 * Complete in-app leave application creation with balance validation
 * No redirects to Desk - full functionality within TOIL interface
 * Leverages Frappe document submit workflow
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Typography,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
  Tag,
  notification,
  Popconfirm
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  SendOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import useToilStore from '../../stores/toilStore'

const { Title, Text } = Typography
const { TextArea } = Input

const LeaveApplicationForm = ({ onSuccess, onCancel }) => {
  const [form] = Form.useForm()
  const [selectedDates, setSelectedDates] = useState([])
  const [businessDays, setBusinessDays] = useState(0)
  const [balanceCheck, setBalanceCheck] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const {
    toilBalance,
    createLeaveApplication,
    submitLeaveForApproval,
    fetchTOILBalance,
    loading: storeLoading
  } = useToilStore()

  useEffect(() => {
    if (toilBalance) {
      checkBalance()
    }
  }, [toilBalance, businessDays])

  const checkBalance = () => {
    const available = parseFloat(toilBalance?.available || 0)
    const requested = businessDays
    
    if (requested > 0) {
      setBalanceCheck({
        sufficient: requested <= available,
        available,
        requested,
        shortfall: Math.max(0, requested - available)
      })
    } else {
      setBalanceCheck(null)
    }
  }

  const countBusinessDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0

    let days = 0
    let current = fromDate.clone()

    while (current.isSameOrBefore(toDate, 'day')) {
      const dayOfWeek = current.day()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++
      }
      current = current.add(1, 'day')
    }

    return days
  }

  const handleDateRangeChange = (dates) => {
    if (dates && dates.length === 2) {
      const [from, to] = dates
      const days = countBusinessDays(from, to)
      setSelectedDates([from, to])
      setBusinessDays(days)
      form.setFieldsValue({
        from_date: from,
        to_date: to,
        total_leave_days: days
      })
    } else {
      setSelectedDates([])
      setBusinessDays(0)
      form.setFieldsValue({ total_leave_days: 0 })
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      
      if (businessDays <= 0) {
        notification.warning({
          message: 'Invalid date range',
          description: 'Please select a valid date range with at least one business day.',
          duration: 4
        })
        return
      }

      if (!balanceCheck?.sufficient) {
        notification.error({
          message: 'Insufficient TOIL balance',
          description: `You have ${balanceCheck?.available.toFixed(2)} days available, but need ${balanceCheck?.requested.toFixed(2)} days.`,
          duration: 6
        })
        return
      }

      setSubmitting(true)

      const leaveData = {
        leave_type: 'Time Off in Lieu',
        from_date: values.from_date.format('YYYY-MM-DD'),
        to_date: values.to_date.format('YYYY-MM-DD'),
        total_leave_days: businessDays,
        description: values.reason || 'TOIL leave request'
      }

      const created = await createLeaveApplication(leaveData)
      
      if (created?.name) {
        // Submit using Frappe document workflow
        const submitResult = await submitLeaveForApproval(created.name)
        
        if (submitResult) {
          notification.success({
            message: 'Leave application submitted',
            description: `Your request for ${businessDays} day(s) has been submitted using Frappe workflow. Supervisor approval is required.`,
            duration: 6,
            placement: 'topRight'
          })
          
          // Refresh balance
          await fetchTOILBalance()
          
          if (onSuccess) {
            onSuccess(created)
          }
        }
      }
    } catch (error) {
      notification.error({
        message: 'Failed to submit leave application',
        description: error?.message || 'Please check your entries and try again.',
        duration: 6
      })
    } finally {
      setSubmitting(false)
    }
  }

  const availableBalance = parseFloat(toilBalance?.available || 0)
  const expiringSoon = parseFloat(toilBalance?.expiring_soon || 0)

  return (
    <Card
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.85), rgba(255,255,255,0.65))',
        border: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
        borderRadius: 12
      }}
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* Header */}
        <div>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ color: '#52c41a' }} />
            Apply for TOIL Leave
          </Title>
          <Text type="secondary">
            Request leave using your accrued TOIL balance. Uses Frappe Leave Application workflow.
          </Text>
        </div>

        <Divider style={{ margin: '16px 0' }} />

        {/* Balance Summary */}
        <Card
          size="small"
          style={{
            background: availableBalance > 0
              ? 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)'
              : 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)',
            border: availableBalance > 0 ? '1px solid #b7eb8f' : '1px solid #ffd591'
          }}
        >
          <Row gutter={16}>
            <Col xs={24} sm={8}>
              <Statistic
                title="Available Balance"
                value={availableBalance}
                precision={2}
                suffix="days"
                valueStyle={{
                  color: availableBalance > 0 ? '#52c41a' : '#fa8c16',
                  fontWeight: 600
                }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Requested Days"
                value={businessDays}
                precision={2}
                suffix="days"
                valueStyle={{ fontWeight: 600 }}
              />
            </Col>
            <Col xs={24} sm={8}>
              <Statistic
                title="Remaining After"
                value={Math.max(0, availableBalance - businessDays)}
                precision={2}
                suffix="days"
                valueStyle={{
                  color: balanceCheck?.sufficient ? '#52c41a' : '#ff4d4f',
                  fontWeight: 600
                }}
              />
            </Col>
          </Row>

          {expiringSoon > 0 && (
            <Alert
              type="warning"
              showIcon
              style={{ marginTop: 12 }}
              message={`${expiringSoon.toFixed(2)} days expiring within 30 days`}
              description="Consider using expiring TOIL first."
            />
          )}

          {balanceCheck && !balanceCheck.sufficient && (
            <Alert
              type="error"
              showIcon
              style={{ marginTop: 12 }}
              message="Insufficient balance"
              description={`You need ${balanceCheck.shortfall.toFixed(2)} more day(s). Available: ${balanceCheck.available.toFixed(2)} days.`}
            />
          )}

          {balanceCheck && balanceCheck.sufficient && businessDays > 0 && (
            <Alert
              type="success"
              showIcon
              style={{ marginTop: 12 }}
              message="Balance sufficient"
              description={`You have enough TOIL balance for this request. ${(availableBalance - businessDays).toFixed(2)} days will remain.`}
            />
          )}
        </Card>

        {/* Form */}
        <Form form={form} layout="vertical">
          <Form.Item
            name="date_range"
            label="Leave Period"
            rules={[{ required: true, message: 'Select leave dates' }]}
          >
            <DatePicker.RangePicker
              style={{ width: '100%' }}
              onChange={handleDateRangeChange}
              disabledDate={(current) => current && current.isBefore(dayjs().startOf('day'))}
              format="YYYY-MM-DD"
            />
          </Form.Item>

          <Row gutter={16} style={{ display: 'none' }}>
            <Col span={12}>
              <Form.Item name="from_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item name="to_date" rules={[{ required: true }]}>
                <DatePicker style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="total_leave_days"
            label="Business Days"
            tooltip="Automatically calculated excluding weekends"
          >
            <InputNumber
              value={businessDays}
              disabled
              style={{ width: '100%' }}
              addonAfter="days"
            />
          </Form.Item>

          <Form.Item
            name="reason"
            label="Reason for Leave"
            rules={[{ required: true, message: 'Please provide a reason' }]}
          >
            <TextArea
              rows={4}
              placeholder="Explain why you need this TOIL leave..."
            />
          </Form.Item>
        </Form>

        {/* Action Buttons */}
        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          {onCancel && (
            <Button onClick={onCancel} disabled={submitting}>
              Cancel
            </Button>
          )}
          <Popconfirm
            title="Submit leave application?"
            description="This will create a Leave Application document and submit it through Frappe workflow for supervisor approval."
            onConfirm={handleSubmit}
            okText="Submit"
            cancelText="Cancel"
            disabled={!balanceCheck?.sufficient || businessDays <= 0}
          >
            <Button
              type="primary"
              icon={<SendOutlined />}
              loading={submitting}
              disabled={!balanceCheck?.sufficient || businessDays <= 0}
            >
              Submit Leave Request
            </Button>
          </Popconfirm>
        </Space>

        {/* Info Footer */}
        <Alert
          type="info"
          showIcon
          icon={<InfoCircleOutlined />}
          message="Frappe Workflow Integration"
          description="This leave application uses Frappe's standard Leave Application document workflow. Your supervisor will receive a notification and can approve/reject through the Frappe Desk or this TOIL interface."
        />
      </Space>
    </Card>
  )
}

export default LeaveApplicationForm
