import { useEffect } from 'react'
import { Form, Card, Row, Col, DatePicker, Input, Button, Space, Modal, message, Spin, Typography, theme, Alert } from 'antd'
import { CalendarOutlined, SendOutlined, ArrowLeftOutlined, WarningOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import useToilStore from '../../stores/toilStore'
import SupervisorInfoCard from './SupervisorInfoCard'
import ConfigurationWarning from './ConfigurationWarning'
import TOILBalanceCard from './TOILBalanceCard'
import { getHeaderBannerStyle } from '../../utils/themeUtils'

const { Title, Text } = Typography
const { TextArea } = Input

/**
 * LeaveApplicationForm Component
 * Create leave application with TOIL balance check
 * Pattern: Zustand-only state management (no local useState)
 */
function LeaveApplicationForm({ navigateToRoute }) {
  const { token } = theme.useToken()
  const [form] = Form.useForm()

  // All state from Zustand store
  const {
    employeeSetup,
    toilBalance,
    loading,
    submitting,
    error,
    createLeaveApplication,
    submitLeaveForApproval,
    initializeLeaveForm,
    clearError
  } = useToilStore()

  // Initialize on mount - Zustand actions are stable, no deps needed
  useEffect(() => {
    const init = async () => {
      try {
        await initializeLeaveForm()
      } catch (err) {
        Modal.error({
          title: 'Configuration Required',
          content: employeeSetup?.issues?.join('\n') || err.message,
          okText: 'Contact HR',
          onOk: () => navigateToRoute && navigateToRoute('timesheet-toil')
        })
      }
    }
    init()
    return () => clearError()
  }, [])

  const calculateLeaveDays = (fromDate, toDate) => {
    if (!fromDate || !toDate) return 0

    const start = dayjs(fromDate)
    const end = dayjs(toDate)

    if (end.isBefore(start)) return 0

    // Calculate business days (exclude weekends)
    let days = 0
    let current = start

    while (current.isSameOrBefore(end)) {
      const dayOfWeek = current.day()
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        days++
      }
      current = current.add(1, 'day')
    }

    return days
  }

  const handleDateChange = () => {
    const fromDate = form.getFieldValue('from_date')
    const toDate = form.getFieldValue('to_date')

    if (fromDate && toDate) {
      const days = calculateLeaveDays(fromDate, toDate)
      form.setFieldsValue({ total_leave_days: days })
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const totalDays = form.getFieldValue('total_leave_days') || 0

      if (totalDays === 0) {
        message.warning('Please select valid dates')
        return
      }

      if (totalDays > (toilBalance?.available || 0)) {
        Modal.error({
          title: 'Insufficient Balance',
          content: `You only have ${toilBalance?.available || 0} days available. You cannot apply for ${totalDays} days.`,
          okText: 'Understood'
        })
        return
      }

      const leaveData = {
        leave_type: 'TOIL',
        from_date: values.from_date.format('YYYY-MM-DD'),
        to_date: values.to_date.format('YYYY-MM-DD'),
        total_leave_days: totalDays,
        description: values.description || '',
        half_day: false
      }

      const createdLeave = await createLeaveApplication(leaveData)
      await submitLeaveForApproval(createdLeave.name)

      message.success('Leave application submitted for approval')

      if (navigateToRoute) {
        navigateToRoute('timesheet-toil')
      }
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fill in all required fields')
      } else {
        message.error(err.message || 'Failed to submit leave application')
      }
    }
  }

  const handleCancel = () => {
    if (navigateToRoute) {
      navigateToRoute('timesheet-toil')
    }
  }

  // Show loading while initializing
  if (loading && (!employeeSetup || !toilBalance)) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Initializing leave application form...</Text>
        </div>
      </div>
    )
  }

  // Show error if setup failed
  if (error && !employeeSetup) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Text type="danger">{error}</Text>
      </div>
    )
  }

  const totalDays = form.getFieldValue('total_leave_days') || 0
  const insufficientBalance = totalDays > (toilBalance?.available || 0)
  const noBalance = (toilBalance?.available || 0) === 0

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Header Banner */}
      <div style={getHeaderBannerStyle(token)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              backgroundColor: token.colorPrimary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <CalendarOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: token.colorText }}>
              Apply for TOIL Leave
            </Title>
            <Text type="secondary">
              Request time off using your earned TOIL balance
            </Text>
          </div>
        </div>
        <Button icon={<ArrowLeftOutlined />} onClick={handleCancel}>
          Back to List
        </Button>
      </div>

      {/* Configuration Warning */}
      {employeeSetup && !employeeSetup.valid && (
        <ConfigurationWarning setupData={employeeSetup} />
      )}

      {/* Supervisor Info Card */}
      {employeeSetup?.valid && (
        <SupervisorInfoCard
          supervisor={{
            name: employeeSetup.supervisor_name,
            email: employeeSetup.supervisor_user,
            supervisor_name: employeeSetup.supervisor_name,
            supervisor_user: employeeSetup.supervisor_user
          }}
          type="leave"
        />
      )}

      {/* TOIL Balance Card */}
      {employeeSetup?.valid && (
        <TOILBalanceCard balance={toilBalance} loading={loading} />
      )}

      {/* No Balance Warning */}
      {employeeSetup?.valid && noBalance && (
        <Alert
          message="No TOIL Balance Available"
          description="You do not have any TOIL days to use for leave. Please submit and get approval for timesheets with non-billable hours to accrue TOIL."
          type="warning"
          showIcon
          icon={<WarningOutlined />}
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Leave Application Form */}
      {employeeSetup?.valid && !noBalance && (
        <>
          <Card title="Leave Details" style={{ borderRadius: 8 }}>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="From Date"
                    name="from_date"
                    rules={[{ required: true, message: 'Please select from date' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                      onChange={handleDateChange}
                      disabledDate={(current) => {
                        return current && current.isBefore(dayjs().startOf('day'))
                      }}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="To Date"
                    name="to_date"
                    rules={[{ required: true, message: 'Please select to date' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                      onChange={handleDateChange}
                      disabledDate={(current) => {
                        const fromDate = form.getFieldValue('from_date')
                        return current && fromDate && current.isBefore(fromDate)
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item label="Total Days" name="total_leave_days">
                    <Input
                      readOnly
                      suffix="days"
                      style={{
                        fontWeight: 600,
                        fontSize: 16,
                        color: insufficientBalance ? token.colorError : token.colorSuccess
                      }}
                    />
                  </Form.Item>
                </Col>
              </Row>

              {/* Balance Check Warning */}
              {insufficientBalance && totalDays > 0 && (
                <Alert
                  message="Insufficient Balance"
                  description={`You only have ${toilBalance?.available || 0} days available. Please reduce your leave duration or wait until you accrue more TOIL.`}
                  type="error"
                  showIcon
                  style={{ marginBottom: 16 }}
                />
              )}

              <Form.Item
                label="Reason for Leave"
                name="description"
                rules={[{ required: true, message: 'Please provide a reason' }]}
              >
                <TextArea
                  rows={4}
                  placeholder="Please describe the reason for taking TOIL leave..."
                  maxLength={500}
                  showCount
                />
              </Form.Item>
            </Form>
          </Card>

          {/* Action Buttons */}
          <Card style={{ borderRadius: 8 }}>
            <Space style={{ float: 'right' }}>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                disabled={insufficientBalance || totalDays === 0}
              >
                Submit for Approval
              </Button>
            </Space>
          </Card>
        </>
      )}
    </Space>
  )
}

export default LeaveApplicationForm
