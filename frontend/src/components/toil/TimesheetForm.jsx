import { useEffect } from 'react'
import { Form, Card, Row, Col, DatePicker, Button, Space, Modal, message, Spin, Typography, theme } from 'antd'
import { ClockCircleOutlined, SaveOutlined, SendOutlined, ArrowLeftOutlined } from '@ant-design/icons'
import dayjs from 'dayjs'
import useToilStore from '../../stores/toilStore'
import SupervisorInfoCard from './SupervisorInfoCard'
import ConfigurationWarning from './ConfigurationWarning'
import TimeLogTable from './TimeLogTable'
import { getHeaderBannerStyle } from '../../utils/themeUtils'

const { Title, Text } = Typography

/**
 * TimesheetForm Component
 * Create/edit timesheet with editable time logs
 * Pattern: Zustand-only state management (no local useState)
 */
function TimesheetForm({ navigateToRoute, timesheetId = null }) {
  const { token } = theme.useToken()
  const [form] = Form.useForm()

  // All state from Zustand store
  const {
    employeeSetup,
    loading,
    submitting,
    error,
    createTimesheet,
    submitTimesheetForApproval,
    initializeTimesheetForm,
    clearError
  } = useToilStore()

  // Initialize on mount - Zustand actions are stable, no deps needed
  useEffect(() => {
    const init = async () => {
      try {
        await initializeTimesheetForm()

        // Set default date range (current week)
        const startDate = dayjs().startOf('week')
        const endDate = dayjs().endOf('week')
        form.setFieldsValue({
          start_date: startDate,
          end_date: endDate
        })
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

  const handleStartDateChange = (date) => {
    if (date) {
      const endDate = date.add(6, 'day')
      form.setFieldsValue({ end_date: endDate })
    }
  }

  const handleSaveDraft = async () => {
    try {
      const values = await form.validateFields()
      const timeLogs = form.getFieldValue('time_logs') || []

      if (timeLogs.length === 0) {
        message.warning('Please add at least one time log')
        return
      }

      const timesheetData = {
        start_date: values.start_date.format('YYYY-MM-DD'),
        end_date: values.end_date.format('YYYY-MM-DD'),
        time_logs: timeLogs,
        docstatus: 0
      }

      await createTimesheet(timesheetData)
      message.success('Timesheet saved as draft')

      if (navigateToRoute) {
        navigateToRoute('timesheet-toil')
      }
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fill in all required fields')
      } else {
        message.error(err.message || 'Failed to save timesheet')
      }
    }
  }

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()
      const timeLogs = form.getFieldValue('time_logs') || []

      if (timeLogs.length === 0) {
        message.warning('Please add at least one time log')
        return
      }

      const totalTOILHours = timeLogs
        .filter(log => !log.is_billable)
        .reduce((sum, log) => sum + (log.hours || 0), 0)

      const submitTimesheet = async () => {
        const timesheetData = {
          start_date: values.start_date.format('YYYY-MM-DD'),
          end_date: values.end_date.format('YYYY-MM-DD'),
          time_logs: timeLogs,
          docstatus: 0
        }

        const createdTimesheet = await createTimesheet(timesheetData)
        await submitTimesheetForApproval(createdTimesheet.name)
        message.success('Timesheet submitted for approval')

        if (navigateToRoute) {
          navigateToRoute('timesheet-toil')
        }
      }

      if (totalTOILHours === 0) {
        Modal.confirm({
          title: 'No TOIL Hours',
          content: 'This timesheet has no non-billable hours. TOIL will not be accrued. Continue?',
          onOk: submitTimesheet
        })
      } else {
        await submitTimesheet()
      }
    } catch (err) {
      if (err.errorFields) {
        message.error('Please fill in all required fields')
      } else {
        message.error(err.message || 'Failed to submit timesheet')
      }
    }
  }

  const handleCancel = () => {
    if (navigateToRoute) {
      navigateToRoute('timesheet-toil')
    }
  }

  // Show loading while initializing
  if (loading && !employeeSetup) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>
          <Text type="secondary">Initializing timesheet form...</Text>
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
            <ClockCircleOutlined style={{ fontSize: 20, color: '#fff' }} />
          </div>
          <div>
            <Title level={3} style={{ margin: 0, color: token.colorText }}>
              Record Timesheet
            </Title>
            <Text type="secondary">
              {timesheetId ? 'Edit timesheet' : 'Create new timesheet with TOIL calculation'}
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
          type="timesheet"
        />
      )}

      {/* Timesheet Form */}
      {employeeSetup?.valid && (
        <>
          <Card title="Timesheet Period" style={{ borderRadius: 8 }}>
            <Form form={form} layout="vertical">
              <Row gutter={16}>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Week Starting"
                    name="start_date"
                    rules={[{ required: true, message: 'Please select start date' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                      onChange={handleStartDateChange}
                    />
                  </Form.Item>
                </Col>
                <Col xs={24} sm={12}>
                  <Form.Item
                    label="Week Ending"
                    name="end_date"
                    rules={[{ required: true, message: 'Please select end date' }]}
                  >
                    <DatePicker
                      style={{ width: '100%' }}
                      format="YYYY-MM-DD"
                      disabled
                    />
                  </Form.Item>
                </Col>
              </Row>
            </Form>
          </Card>

          {/* Time Logs Table */}
          <Card title="Time Logs" style={{ borderRadius: 8 }}>
            <Form.Item name="time_logs" initialValue={[]}>
              <TimeLogTable />
            </Form.Item>
          </Card>

          {/* Action Buttons */}
          <Card style={{ borderRadius: 8 }}>
            <Space style={{ float: 'right' }}>
              <Button onClick={handleCancel}>Cancel</Button>
              <Button
                icon={<SaveOutlined />}
                onClick={handleSaveDraft}
                loading={submitting}
              >
                Save Draft
              </Button>
              <Button
                type="primary"
                icon={<SendOutlined />}
                onClick={handleSubmit}
                loading={submitting}
                disabled={!form.getFieldValue('time_logs')?.length}
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

export default TimesheetForm
