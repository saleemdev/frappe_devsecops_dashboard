/**
 * TOIL Timesheet Creation Form
 * Simplified: record when overtime started and how many hours.
 * Backend receives from_time / to_time / hours per the Frappe Timesheet schema.
 */

import { useState, useEffect } from 'react'
import {
  Card,
  Input,
  InputNumber,
  DatePicker,
  Button,
  Space,
  Table,
  Typography,
  Alert,
  Divider,
  Row,
  Col,
  Statistic,
  notification,
  Popconfirm,
  Switch
} from 'antd'
import {
  PlusOutlined,
  DeleteOutlined,
  SaveOutlined,
  SendOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import useToilStore from '../../stores/toilStore'

const { Title, Text } = Typography

const TimesheetCreateForm = ({ onSuccess, onCancel }) => {
  const [timeLogs, setTimeLogs] = useState([])
  const [previewData, setPreviewData] = useState({ toilHours: 0, toilDays: 0 })
  const [submitting, setSubmitting] = useState(false)

  const {
    employeeSetup,
    createTimesheet,
    submitTimesheetForApproval
  } = useToilStore()

  useEffect(() => {
    const nonBillableHours = timeLogs
      .filter(log => !log.is_billable)
      .reduce((sum, log) => sum + (parseFloat(log.hours) || 0), 0)

    setPreviewData({
      toilHours: nonBillableHours,
      toilDays: (nonBillableHours / 8).toFixed(3)
    })
  }, [timeLogs])

  const addTimeLog = () => {
    setTimeLogs(prev => [...prev, {
      key: Date.now(),
      started: dayjs().hour(18).minute(0).second(0),
      hours: 2,
      activity_type: 'Execution',
      is_billable: false,
      description: ''
    }])
  }

  const removeTimeLog = (key) => {
    setTimeLogs(prev => prev.filter(log => log.key !== key))
  }

  const updateTimeLog = (key, field, value) => {
    setTimeLogs(prev => prev.map(log =>
      log.key === key ? { ...log, [field]: value } : log
    ))
  }

  const buildPayload = () => {
    const logs = timeLogs.filter(log => log.started && log.hours > 0)
    if (logs.length === 0) return null

    const timestamps = logs.map(log => log.started.valueOf())
    const startDate = dayjs(Math.min(...timestamps)).format('YYYY-MM-DD')
    const endDate = dayjs(Math.max(...timestamps)).format('YYYY-MM-DD')

    return {
      start_date: startDate,
      end_date: endDate,
      time_logs: logs.map(log => {
        const from = log.started
        const to = from.add(parseFloat(log.hours) || 0, 'hour')
        return {
          activity_type: log.activity_type || 'Execution',
          from_time: from.format('YYYY-MM-DD HH:mm:ss'),
          to_time: to.format('YYYY-MM-DD HH:mm:ss'),
          hours: parseFloat(log.hours) || 0,
          is_billable: log.is_billable ? 1 : 0,
          description: log.description || ''
        }
      })
    }
  }

  const handleSaveDraft = async () => {
    if (timeLogs.length === 0) {
      notification.warning({ message: 'No time logs', description: 'Add at least one entry before saving.' })
      return
    }
    const payload = buildPayload()
    if (!payload) {
      notification.warning({ message: 'Invalid entries', description: 'Each entry needs a start time and hours > 0.' })
      return
    }

    setSubmitting(true)
    try {
      const result = await createTimesheet(payload)
      if (result?.name) {
        notification.success({ message: 'Timesheet saved', description: `Draft ${result.name} created.`, duration: 5 })
        onSuccess?.(result)
      }
    } catch (error) {
      notification.error({ message: 'Failed to save', description: error?.message || 'Please check your entries.', duration: 6 })
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitForApproval = async () => {
    if (timeLogs.length === 0) {
      notification.warning({ message: 'No time logs', description: 'Add at least one entry before submitting.' })
      return
    }
    if (previewData.toilHours <= 0) {
      notification.warning({ message: 'No TOIL hours', description: 'Mark entries as non-billable (TOIL) to accrue time off.' })
      return
    }
    const payload = buildPayload()
    if (!payload) {
      notification.warning({ message: 'Invalid entries', description: 'Each entry needs a start time and hours > 0.' })
      return
    }

    setSubmitting(true)
    try {
      const created = await createTimesheet(payload)
      if (created?.name) {
        const submitResult = await submitTimesheetForApproval(created.name)
        if (submitResult) {
          notification.success({
            message: 'Timesheet submitted',
            description: `${created.name} sent for supervisor approval. TOIL accrues once approved.`,
            duration: 6
          })
          onSuccess?.(created)
        }
      }
    } catch (error) {
      notification.error({ message: 'Failed to submit', description: error?.message || 'Please check your entries.', duration: 6 })
    } finally {
      setSubmitting(false)
    }
  }

  const timeLogColumns = [
    {
      title: 'Started',
      dataIndex: 'started',
      key: 'started',
      width: 200,
      render: (val, record) => (
        <DatePicker
          showTime={{ format: 'HH:mm' }}
          format="YYYY-MM-DD HH:mm"
          value={val}
          onChange={(v) => updateTimeLog(record.key, 'started', v)}
          style={{ width: '100%' }}
          placeholder="When did overtime start?"
        />
      )
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      width: 110,
      render: (val, record) => (
        <InputNumber
          value={val}
          onChange={(v) => updateTimeLog(record.key, 'hours', v)}
          min={0.5}
          max={24}
          step={0.5}
          precision={2}
          style={{ width: '100%' }}
          addonAfter="h"
        />
      )
    },
    {
      title: 'Activity',
      dataIndex: 'activity_type',
      key: 'activity_type',
      width: 140,
      render: (val, record) => (
        <Input
          value={val}
          onChange={(e) => updateTimeLog(record.key, 'activity_type', e.target.value)}
          placeholder="e.g. Deployment"
        />
      )
    },
    {
      title: 'Billable',
      dataIndex: 'is_billable',
      key: 'is_billable',
      width: 90,
      render: (val, record) => (
        <Switch
          checked={!!val}
          onChange={(checked) => updateTimeLog(record.key, 'is_billable', checked)}
          checkedChildren="Yes"
          unCheckedChildren="TOIL"
          size="small"
        />
      )
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
      render: (val, record) => (
        <Input
          value={val}
          onChange={(e) => updateTimeLog(record.key, 'description', e.target.value)}
          placeholder="What did you work on?"
        />
      )
    },
    {
      title: '',
      key: 'action',
      width: 50,
      render: (_, record) => (
        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removeTimeLog(record.key)} />
      )
    }
  ]

  if (!employeeSetup?.valid) {
    return (
      <Card>
        <Alert type="warning" showIcon message="Setup Required"
          description="Employee and supervisor configuration must be complete before creating timesheets." />
      </Card>
    )
  }

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
        <div>
          <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ color: '#1677ff' }} />
            Record Overtime
          </Title>
          <Text type="secondary">
            Log when overtime started and how many hours. Non-billable hours accrue as TOIL (8 hrs = 1 day, valid 6 months).
          </Text>
        </div>

        <Divider style={{ margin: '12px 0' }} />

        <Card size="small" style={{ background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)', border: '1px solid #91d5ff' }}>
          <Row gutter={16}>
            <Col span={12}>
              <Statistic title="TOIL Hours" value={previewData.toilHours} precision={2} suffix="hrs" valueStyle={{ color: '#1677ff', fontWeight: 600 }} />
            </Col>
            <Col span={12}>
              <Statistic title="TOIL Days" value={previewData.toilDays} precision={3} suffix="days" valueStyle={{ color: '#1677ff', fontWeight: 600 }} />
            </Col>
          </Row>
          {previewData.toilHours > 0 && (
            <Alert type="info" showIcon style={{ marginTop: 12 }}
              message={`${previewData.toilDays} TOIL day(s) will be available after supervisor approval`} />
          )}
        </Card>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text strong>Overtime Entries</Text>
            <Button type="dashed" icon={<PlusOutlined />} onClick={addTimeLog}>Add Entry</Button>
          </div>

          {timeLogs.length === 0 ? (
            <Alert type="info" showIcon message="No entries yet"
              description="Click 'Add Entry' to start recording your overtime."
              action={<Button size="small" icon={<PlusOutlined />} onClick={addTimeLog}>Add First Entry</Button>} />
          ) : (
            <Table dataSource={timeLogs} columns={timeLogColumns} pagination={false} size="small" scroll={{ x: 700 }} />
          )}
        </div>

        <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
          {onCancel && <Button onClick={onCancel} disabled={submitting}>Cancel</Button>}
          <Button icon={<SaveOutlined />} onClick={handleSaveDraft} loading={submitting} disabled={timeLogs.length === 0}>
            Save Draft
          </Button>
          <Popconfirm title="Submit for approval?" description="Your supervisor will review this. You won't be able to edit after submission."
            onConfirm={handleSubmitForApproval} okText="Submit" cancelText="Cancel">
            <Button type="primary" icon={<SendOutlined />} loading={submitting}
              disabled={timeLogs.length === 0 || previewData.toilHours <= 0}>
              Submit for Approval
            </Button>
          </Popconfirm>
        </Space>
      </Space>
    </Card>
  )
}

export default TimesheetCreateForm
