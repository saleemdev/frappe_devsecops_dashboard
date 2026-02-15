import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Row,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
  theme,
  message,
  notification
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  HistoryOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserAddOutlined,
  MailOutlined,
  TeamOutlined,
  UserOutlined
} from '@ant-design/icons'
import { getHeaderBannerStyle, getHeaderIconColor } from '../utils/themeUtils'
import dayjs from 'dayjs'
import Swal from 'sweetalert2'
import useToilStore from '../stores/toilStore'
import ApprovalModal from '../components/ApprovalModal'

const { TextArea } = Input
const { Title, Text } = Typography

const formatErrorMessage = (error, fallback = 'Something went wrong. Please try again.') => {
  if (!error) return fallback

  const apiMessage =
    error?.response?.data?.message ||
    error?.response?.data?._error_message ||
    error?.response?.data?.error?.message

  const directMessage = error?.message || error?.error
  const raw = apiMessage || directMessage || fallback

  if (typeof raw !== 'string') return fallback
  return raw.replace(/^Error:\s*/i, '').trim() || fallback
}

const classifyOvertimeError = (errorMessage) => {
  if (!errorMessage) return null
  const normalized = errorMessage.toLowerCase()

  if (normalized.includes('overlap') || normalized.includes('overlapping')) {
    const rowMatch = errorMessage.match(/row\s+(\d+)/i)
    const tsMatches = errorMessage.match(/TS-\d{4}-\d+/g) || []
    const existingRef = tsMatches.length > 0 ? tsMatches[tsMatches.length - 1] : null

    return {
      level: 'warning',
      title: 'Time Conflict Detected',
      summary: existingRef
        ? `This entry overlaps with existing timesheet ${existingRef}.`
        : 'This entry overlaps with an existing timesheet.',
      actionHint: rowMatch
        ? `Update the time range in entry row ${rowMatch[1]} and try again.`
        : 'Adjust your start/end time and try again.'
    }
  }

  if (normalized.includes('no employee')) {
    return {
      level: 'error',
      title: 'Employee Profile Missing',
      summary: 'Your user account is not linked to an Employee record.',
      actionHint: 'Ask HR/Admin to link your User to Employee before creating timesheets.'
    }
  }

  if (normalized.includes('supervisor') || normalized.includes('reports_to')) {
    return {
      level: 'error',
      title: 'Supervisor Setup Needed',
      summary: 'Timesheet workflow needs a supervisor assignment.',
      actionHint: 'Ask HR to set Employee.reports_to for your profile.'
    }
  }

  return null
}

function TOILPage({ initialTab = 'timesheets', navigateToRoute }) {
  const { token } = theme.useToken()
  const [activeTab, setActiveTab] = useState(initialTab)
  const [overtimeFeedback, setOvertimeFeedback] = useState(null)
  const [overtimeForm] = Form.useForm()
  const [leaveForm] = Form.useForm()

  const {
    employeeSetup,
    toilBalance,
    leaveLedger,
    timesheets,
    supervisorTimesheets,
    loading,
    submitting,
    userRole,
    validateSetup,
    initialize,
    createTimesheet,
    createLeaveApplication,
    submitLeaveForApproval,
    fetchTOILBalance,
    fetchLeaveLedger,
    fetchMyTimesheets,
    fetchSupervisorTimesheets
  } = useToilStore()

  const [approvalModalVisible, setApprovalModalVisible] = useState(false)
  const [timesheetForApproval, setTimesheetForApproval] = useState(null)
  const [overtimeModalVisible, setOvertimeModalVisible] = useState(false)
  const [approvalSubmitting, setApprovalSubmitting] = useState(false)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  useEffect(() => {
    if (activeTab === 'team-requests') {
      fetchSupervisorTimesheets().catch(() => {})
    }
  }, [activeTab])

  useEffect(() => {
    const init = async () => {
      try {
        await validateSetup()
        const role = await initialize()
        await Promise.all([
          fetchTOILBalance(),
          fetchLeaveLedger(),
          fetchMyTimesheets(),
          fetchSupervisorTimesheets().catch(() => {})
        ])
      } catch (error) {
        message.error({
          content: formatErrorMessage(error, 'Unable to initialize TOIL at the moment.'),
          duration: 5
        })
      }
    }

    init()
  }, [])

  const availableBalance = Number(toilBalance?.available || 0)
  const totalEarned = Number(toilBalance?.total || 0)
  const totalUsed = Number(toilBalance?.used || 0)
  const pendingTimesheets = timesheets.filter(ts => ts.docstatus === 0).length
  const pendingTeamRequests = supervisorTimesheets.filter(ts => ts.docstatus !== 1).length

  const historyRows = useMemo(() => leaveLedger || [], [leaveLedger])
  const supervisorRows = useMemo(() => {
    const rows = Array.isArray(supervisorTimesheets) ? [...supervisorTimesheets] : []
    return rows.sort((a, b) => {
      const aDate = dayjs(a.creation || a.modified)
      const bDate = dayjs(b.creation || b.modified)
      return bDate.valueOf() - aDate.valueOf()
    })
  }, [supervisorTimesheets])

  const handleOvertimeSubmit = async () => {
    setOvertimeFeedback(null)

    try {
      const values = await overtimeForm.validateFields()
      const now = dayjs()
      const toTime = values.date
        .hour(now.hour())
        .minute(now.minute())
        .second(now.second())
      const fromTime = toTime.clone().subtract(values.hours, 'hours')

      const payload = {
        start_date: fromTime.format('YYYY-MM-DD'),
        end_date: toTime.format('YYYY-MM-DD'),
        time_logs: [
          {
            activity_type: 'Execution',
            from_time: fromTime.format('YYYY-MM-DD HH:mm:ss'),
            to_time: toTime.format('YYYY-MM-DD HH:mm:ss'),
            is_billable: 0,
            description: values.description
          }
        ]
      }

      const created = await createTimesheet(payload)
      const createdName = created?.name

      overtimeForm.resetFields()
      setOvertimeFeedback(null)

      if (navigateToRoute && createdName) {
        const result = await Swal.fire({
          title: `Timesheet ${createdName} created`,
          text: 'Open the detail view now?',
          icon: 'success',
          showCancelButton: true,
          confirmButtonText: 'Open details',
          cancelButtonText: 'Stay here',
          timer: 9000,
          timerProgressBar: true
        })

        if (result.isConfirmed) {
          handleCloseOvertimeModal()
          navigateToRoute('timesheet-toil-detail', null, null, null, null, createdName)
        } else {
          handleCloseOvertimeModal()
          await Promise.all([fetchTOILBalance(), fetchMyTimesheets(), fetchLeaveLedger()])
          setActiveTab('timesheets')
        }
        return
      }

      await Swal.fire({
        title: createdName ? `Timesheet ${createdName} created` : 'Timesheet created',
        icon: 'success',
        timer: 2400,
        timerProgressBar: true,
        showConfirmButton: false
      })

      handleCloseOvertimeModal()
      await Promise.all([fetchTOILBalance(), fetchMyTimesheets(), fetchLeaveLedger()])
      setActiveTab('timesheets')
    } catch (error) {
      const errMsg = formatErrorMessage(error, 'Could not submit overtime.')
      const classification = classifyOvertimeError(errMsg)

      if (classification) {
        const notifier = classification.level === 'warning' ? notification.warning : notification.error
        setOvertimeFeedback({
          level: classification.level,
          title: classification.title,
          summary: classification.summary,
          actionHint: classification.actionHint
        })
        notifier({
          message: classification.title,
          description: (
            <Space direction="vertical" size={2}>
              <Text>{classification.summary}</Text>
              <Text type="secondary">{classification.actionHint}</Text>
            </Space>
          ),
          btn: classification.level === 'warning' ? (
            <Button
              size="small"
              onClick={() => {
                setActiveTab('timesheets')
              }}
            >
              Review Timesheets
            </Button>
          ) : undefined,
          duration: 7
        })
        return
      }

      setOvertimeFeedback({
        level: 'error',
        title: 'Could not create timesheet',
        summary: errMsg,
        actionHint: 'Please check your entry and try again.'
      })
      message.error({
        content: errMsg,
        duration: 5
      })
    }
  }

  const businessDaysBetween = (fromDate, toDate) => {
    let days = 0
    let current = fromDate.clone()
    while (current.isSameOrBefore(toDate, 'day')) {
      const d = current.day()
      if (d !== 0 && d !== 6) days += 1
      current = current.add(1, 'day')
    }
    return days
  }

  const handleLeaveSubmit = async () => {
    try {
      const values = await leaveForm.validateFields()
      const days = businessDaysBetween(values.from_date, values.to_date)

      if (days <= 0) {
        message.warning('Select a valid weekday range for leave.')
        return
      }

      if (days > availableBalance) {
        Modal.warning({
          title: 'Insufficient TOIL balance',
          content: `Requested ${days} day(s), but only ${availableBalance.toFixed(2)} day(s) are available.`
        })
        return
      }

      const leaveData = {
        leave_type: 'TOIL',
        from_date: values.from_date.format('YYYY-MM-DD'),
        to_date: values.to_date.format('YYYY-MM-DD'),
        total_leave_days: days,
        description: values.reason
      }

      const created = await createLeaveApplication(leaveData)
      await submitLeaveForApproval(created.name)

      await Swal.fire({
        title: 'Leave request submitted',
        text: `${days} day${days > 1 ? 's' : ''} requested successfully.`,
        icon: 'success',
        timer: 2400,
        timerProgressBar: true,
        showConfirmButton: false
      })

      leaveForm.resetFields()
      await Promise.all([fetchTOILBalance(), fetchLeaveLedger(), fetchMyTimesheets()])
      setActiveTab('history')
    } catch (error) {
      message.error({
        content: formatErrorMessage(error, 'Could not submit leave request.'),
        duration: 5
      })
    }
  }

  const handleRefresh = async () => {
    try {
      await Promise.all([
        fetchTOILBalance(),
        fetchLeaveLedger(),
        fetchMyTimesheets(),
        fetchSupervisorTimesheets().catch(() => {})
      ])
      message.success('Data refreshed')
    } catch (error) {
      message.error(formatErrorMessage(error, 'Failed to refresh'))
    }
  }

  const handleRecordOvertime = () => {
    setOvertimeModalVisible(true)
  }

  const handleCloseOvertimeModal = () => {
    setOvertimeModalVisible(false)
    setOvertimeFeedback(null)
  }

  const handleOpenApprovalModal = (row) => {
    setTimesheetForApproval(row)
    setApprovalModalVisible(true)
  }

  const handleCloseApprovalModal = () => {
    setApprovalModalVisible(false)
    setTimesheetForApproval(null)
  }

  const handleApprove = async (comment) => {
    const msgKey = 'toil-approval-submit'
    try {
      const id = timesheetForApproval?.name ?? timesheetForApproval?.id
      if (!id) {
        const error = 'No timesheet selected'
        await Swal.fire({ icon: 'error', title: 'Approval failed', text: error })
        return { success: false, error }
      }

      message.loading({ content: 'Submitting approval...', key: msgKey, duration: 0 })
      setApprovalSubmitting(true)
      const response = await fetch('/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.set_timesheet_approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: new URLSearchParams({
          timesheet_name: String(id),
          status: 'approved',
          reason: comment || ''
        }).toString()
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const payload = await response.json()
      const result = payload?.message || payload
      if (result?.success) {
        await Promise.all([
          fetchMyTimesheets().catch(() => {}),
          fetchSupervisorTimesheets().catch(() => {}),
          fetchTOILBalance().catch(() => {}),
          fetchLeaveLedger().catch(() => {})
        ])
        handleCloseApprovalModal()
        message.success({ content: result?.message || 'Timesheet submitted. TOIL accrual is processing.', key: msgKey })
        return result
      }

      const error =
        result?.error?.message ||
        result?.error ||
        result?.message ||
        'Failed to approve'
      message.destroy(msgKey)
      await Swal.fire({ icon: 'error', title: 'Approval failed', text: error })
      return { success: false, error }
    } catch (error) {
      const errMsg = formatErrorMessage(error, 'Failed to approve')
      message.destroy(msgKey)
      await Swal.fire({ icon: 'error', title: 'Approval failed', text: errMsg })
      return { success: false, error: errMsg }
    } finally {
      setApprovalSubmitting(false)
    }
  }

  const handleReject = async (reason) => {
    const msgKey = 'toil-rejection-submit'
    try {
      const id = timesheetForApproval?.name ?? timesheetForApproval?.id
      if (!id) {
        const error = 'No timesheet selected'
        await Swal.fire({ icon: 'error', title: 'Rejection failed', text: error })
        return { success: false, error }
      }

      message.loading({ content: 'Submitting rejection...', key: msgKey, duration: 0 })
      setApprovalSubmitting(true)
      const response = await fetch('/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.set_timesheet_approval', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: new URLSearchParams({
          timesheet_name: String(id),
          status: 'rejected',
          reason: reason || ''
        }).toString()
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const payload = await response.json()
      const result = payload?.message || payload
      if (result?.success) {
        await Promise.all([
          fetchMyTimesheets().catch(() => {}),
          fetchSupervisorTimesheets().catch(() => {})
        ])
        handleCloseApprovalModal()
        message.success({ content: result?.message || 'Timesheet rejected.', key: msgKey })
        return result
      }

      const error =
        result?.error?.message ||
        result?.error ||
        result?.message ||
        'Failed to reject'
      message.destroy(msgKey)
      await Swal.fire({ icon: 'error', title: 'Rejection failed', text: error })
      return { success: false, error }
    } catch (error) {
      const errMsg = formatErrorMessage(error, 'Failed to reject')
      message.destroy(msgKey)
      await Swal.fire({ icon: 'error', title: 'Rejection failed', text: errMsg })
      return { success: false, error: errMsg }
    } finally {
      setApprovalSubmitting(false)
    }
  }

  if (loading && !employeeSetup) {
    return (
      <div style={{ textAlign: 'center', padding: '100px 0' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (!employeeSetup?.valid) {
    const issues = employeeSetup?.issues || ['Configuration incomplete. Contact HR.']
    const isEmployeeMissing = issues.some(
      (i) => typeof i === 'string' && i.toLowerCase().includes('no employee') && i.toLowerCase().includes('record')
    )

    const setupConfig = isEmployeeMissing
      ? {
          icon: UserOutlined,
          title: 'Employee profile required',
          summary: 'Your user account is not linked to an Employee record. HR needs to create your Employee master and link it to your User before you can use TOIL.',
          fixHint: 'Ask HR to create your Employee record in Frappe and set the User (user_id) field to your login email.',
          actionLabel: 'Ask HR to create your Employee record'
        }
      : {
          icon: TeamOutlined,
          title: 'TOIL setup required',
          summary: 'You need a supervisor assigned before you can record overtime or request TOIL leave.',
          fixHint: 'Your HR team can fix this by setting the reports_to field on your Employee master record in Frappe.',
          actionLabel: 'Ask HR to assign your supervisor'
        }

    const SetupIcon = setupConfig.icon

    return (
      <Card
        style={{
          maxWidth: 560,
          margin: '40px auto',
          textAlign: 'center',
          borderRadius: 12,
          boxShadow: '0 2px 12px rgba(0,0,0,0.08)'
        }}
      >
        <Empty
          image={
            <div
              style={{
                width: 80,
                height: 80,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #fff2e8 0%, #ffe7ba 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto'
              }}
            >
              <SetupIcon style={{ fontSize: 36, color: '#fa8c16' }} />
            </div>
          }
          description={null}
        >
          <Typography.Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
            {setupConfig.title}
          </Typography.Title>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 14 }}>
            {setupConfig.summary}
          </Typography.Paragraph>
          <div
            style={{
              textAlign: 'left',
              background: token.colorFillQuaternary,
              padding: 16,
              borderRadius: 8,
              marginBottom: 20
            }}
          >
            <Typography.Text strong style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <UserAddOutlined /> What&apos;s missing
            </Typography.Text>
            <ul style={{ margin: '8px 0 0 0', paddingLeft: 20 }}>
              {issues.map((issue, i) => (
                <li key={i}>
                  <Typography.Text>{issue}</Typography.Text>
                </li>
              ))}
            </ul>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 16, fontSize: 13 }}>
            {setupConfig.fixHint}
          </Typography.Paragraph>
          <Space>
            <Button
              type="primary"
              icon={<MailOutlined />}
              onClick={() => { window.location.href = '/app' }}
            >
              Open Frappe Desk
            </Button>
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {setupConfig.actionLabel}
            </Typography.Text>
          </Space>
        </Empty>
      </Card>
    )
  }

  const timesheetColumns = [
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Timesheet</Text>,
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <Button
          type="link"
          onClick={() => navigateToRoute && navigateToRoute('timesheet-toil-detail', null, null, null, null, name)}
          style={{ padding: 0, height: 'auto', fontWeight: 600, fontSize: '14px' }}
        >
          {name}
        </Button>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Range</Text>,
      key: 'range',
      render: (_, row) => (
        <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>
          {row.start_date} to {row.end_date}
        </Text>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Hours</Text>,
      dataIndex: 'total_hours',
      key: 'hours',
      align: 'right',
      render: v => <Text style={{ fontSize: '12px' }}>{Number(v || 0).toFixed(2)}</Text>
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>TOIL</Text>,
      key: 'toil',
      align: 'right',
      render: (_, row) => (
        <Tag color="blue">{Number(row.toil_days || 0).toFixed(2)} day(s)</Tag>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Status</Text>,
      key: 'status',
      render: (_, row) => {
        if (row.docstatus === 1) return <Tag color="green">Submitted</Tag>
        if (row.docstatus === 2) return <Tag color="red">Cancelled</Tag>
        return <Tag color="orange">Draft</Tag>
      }
    }
  ]

  const historyColumns = [
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Date</Text>,
      dataIndex: 'from_date',
      key: 'date',
      render: v => (
        <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>
          {v ? dayjs(v).format('YYYY-MM-DD') : '-'}
        </Text>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Type</Text>,
      dataIndex: 'transaction_type',
      key: 'type',
      render: v => (v === 'Leave Allocation' ? <Tag color="green">Earned</Tag> : <Tag color="red">Used</Tag>)
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Reference</Text>,
      dataIndex: 'transaction_name',
      key: 'ref',
      render: v => <Text style={{ fontSize: '12px', fontFamily: 'monospace' }}>{v || '-'}</Text>
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Days</Text>,
      dataIndex: 'leaves',
      key: 'days',
      align: 'right',
      render: v => {
        const num = Number(v || 0)
        return num > 0 ? <Tag color="green">+{num}</Tag> : <Tag color="red">{num}</Tag>
      }
    }
  ]

  const supervisorColumns = [
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Timesheet</Text>,
      dataIndex: 'name',
      key: 'name',
      render: (name, row) => (
        <Button
          type="link"
          onClick={() => navigateToRoute && navigateToRoute('timesheet-toil-detail', null, null, null, null, name)}
          style={{ padding: 0, height: 'auto', fontWeight: 600, fontSize: '14px' }}
        >
          {name}
        </Button>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Employee</Text>,
      dataIndex: 'employee_name',
      key: 'employee_name',
      render: v => <Text style={{ fontSize: '12px' }}>{v || '-'}</Text>
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Range</Text>,
      key: 'range',
      render: (_, row) => (
        <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>
          {row.start_date} to {row.end_date}
        </Text>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>TOIL Hours</Text>,
      dataIndex: 'total_toil_hours',
      key: 'toil_hours',
      align: 'right',
      render: v => <Text style={{ fontSize: '12px' }}>{Number(v || 0).toFixed(2)}</Text>
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>TOIL Days</Text>,
      dataIndex: 'toil_days',
      key: 'toil_days',
      align: 'right',
      render: v => <Tag color="blue">{Number(v || 0).toFixed(2)}</Tag>
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Created</Text>,
      dataIndex: 'creation',
      key: 'creation',
      render: v => (
        <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>
          {v ? dayjs(v).format('YYYY-MM-DD HH:mm') : '-'}
        </Text>
      )
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Status</Text>,
      key: 'docstatus',
      render: (_, row) => {
        if (row.docstatus === 1) return <Tag color="green">Submitted</Tag>
        if (row.docstatus === 2) return <Tag color="red">Cancelled</Tag>
        return <Tag color="orange">Draft</Tag>
      }
    },
    {
      title: <Text strong style={{ fontSize: '13px', color: token.colorText }}>Actions</Text>,
      key: 'actions',
      render: (_, row) => (
        row.docstatus !== 1 ? (
          <Button type="primary" size="small" onClick={() => handleOpenApprovalModal(row)}>
            Approve / Reject
          </Button>
        ) : (
          <Tag color="green">Reviewed</Tag>
        )
      )
    }
  ]

  return (
    <div>
      {/* Header - matches Change Management Teams */}
      <Card style={{
        marginBottom: 16,
        ...getHeaderBannerStyle(token)
      }}>
        <Row justify="space-between" align="middle">
          <Col xs={24} sm={16}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <Breadcrumb
                items={[
                  { title: 'Ops' },
                  { title: 'Timesheet (TOIL Record)' }
                ]}
                style={{ fontSize: '12px' }}
              />
              <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
                <ClockCircleOutlined style={{
                  marginRight: 16,
                  color: getHeaderIconColor(token),
                  fontSize: '32px'
                }} />
                Timesheet (TOIL Record)
              </Title>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Record overtime, request leave, and review your history in one place.
              </Text>
            </Space>
          </Col>
          <Col xs={24} sm={8} style={{ textAlign: 'right', marginTop: 16 }}>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={handleRefresh}
                loading={loading}
              >
                Refresh
              </Button>
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleRecordOvertime}
              >
                Record Overtime
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Stats Row */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={8}>
          <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <Statistic title="Available" value={availableBalance} precision={2} suffix="days" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <Statistic title="Earned" value={totalEarned} precision={2} suffix="days" />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
            <Statistic title="Used / Pending" value={`${totalUsed.toFixed(2)} / ${pendingTimesheets}`} />
          </Card>
        </Col>
      </Row>

      {/* Tabs Card - matches Change Management table card styling */}
      <Card style={{ boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={[
            {
              key: 'timesheets',
              label: (
                <span>
                  <CheckCircleOutlined /> My Timesheets
                </span>
              ),
              children: (
                <div>
                  <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Text type="secondary">Your timesheets. Click a row to view details.</Text>
                    <Button type="primary" icon={<PlusOutlined />} onClick={handleRecordOvertime}>
                      Create
                    </Button>
                  </div>
                  <Table
                    rowKey="name"
                    dataSource={timesheets}
                    columns={timesheetColumns}
                    pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
                    size="middle"
                    locale={{ emptyText: <Empty description="No timesheets yet." style={{ marginTop: 50, marginBottom: 50 }} /> }}
                  />
                </div>
              )
            },
            {
              key: 'leave',
              label: (
                <span>
                  <CalendarOutlined /> Apply for Leave
                </span>
              ),
              children: (
                <Form
                  form={leaveForm}
                  layout="vertical"
                  disabled={availableBalance <= 0}
                  style={{ maxWidth: 560 }}
                >
                  {availableBalance <= 0 && (
                    <Alert
                      type="warning"
                      showIcon
                      message="No TOIL balance available"
                      description="Submit overtime first, then request leave."
                      style={{ marginBottom: 16 }}
                    />
                  )}
                  <Form.Item label="From Date" name="from_date" rules={[{ required: true, message: 'Select start date' }]}>
                    <DatePicker
                      style={{ width: '100%' }}
                      disabledDate={current => current && current.isBefore(dayjs().startOf('day'))}
                    />
                  </Form.Item>
                  <Form.Item label="To Date" name="to_date" rules={[{ required: true, message: 'Select end date' }]}>
                    <DatePicker
                      style={{ width: '100%' }}
                      disabledDate={current => {
                        const from = leaveForm.getFieldValue('from_date')
                        return current && from && current.isBefore(from, 'day')
                      }}
                    />
                  </Form.Item>
                  <Form.Item label="Reason" name="reason" rules={[{ required: true, message: 'Enter reason' }]}>
                    <TextArea rows={4} placeholder="Reason for TOIL leave." />
                  </Form.Item>
                  <Button type="primary" onClick={handleLeaveSubmit} loading={submitting}>
                    Submit Leave Request
                  </Button>
                </Form>
              )
            },
            {
              key: 'history',
              label: (
                <span>
                  <HistoryOutlined /> My History
                </span>
              ),
              children: (
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Leave Ledger: earned and used TOIL. Refresh to see approval updates and balance changes.
                  </Text>
                  <Table
                    rowKey={(row, i) => row?.transaction_name ? `${row.transaction_name}-${i}` : `history-${i}`}
                    dataSource={historyRows}
                    columns={historyColumns}
                    pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
                    size="middle"
                    locale={{ emptyText: <Empty description="No TOIL history yet." style={{ marginTop: 50, marginBottom: 50 }} /> }}
                  />
                </div>
              )
            },
            {
              key: 'team-requests',
              label: (
                <Space size={6}>
                  <TeamOutlined />
                  <span>Team Requests</span>
                  <Badge
                    count={pendingTeamRequests}
                    overflowCount={99}
                    color={pendingTeamRequests > 0 ? '#fa541c' : '#d9d9d9'}
                    style={{ boxShadow: 'none' }}
                  />
                </Space>
              ),
              children: (
                <div>
                  {approvalSubmitting ? (
                    <Alert
                      type="info"
                      showIcon
                      style={{ marginBottom: 12 }}
                      message="Updating timesheet approval..."
                      description="Refreshing team request state with latest backend data."
                    />
                  ) : null}
                  <Text type="secondary" style={{ display: 'block', marginBottom: 12 }}>
                    Team requests are sorted by creation. The badge counts only items with docstatus not equal to Submitted.
                  </Text>
                  <Table
                    rowKey="name"
                    dataSource={supervisorRows}
                    columns={supervisorColumns}
                    pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
                    size="middle"
                    loading={loading}
                    locale={{ emptyText: <Empty description="No team requests found." style={{ marginTop: 50, marginBottom: 50 }} /> }}
                  />
                </div>
              )
            }
          ]}
        />
      </Card>

      <Modal
        title="Record Overtime"
        open={overtimeModalVisible}
        onCancel={handleCloseOvertimeModal}
        footer={null}
        width={560}
        destroyOnClose
      >
        <Form form={overtimeForm} layout="vertical">
          {overtimeFeedback ? (
            <Alert
              type={overtimeFeedback.level === 'warning' ? 'warning' : 'error'}
              showIcon
              style={{ marginBottom: 16 }}
              message={overtimeFeedback.title}
              description={
                <Space direction="vertical" size={2}>
                  <Text>{overtimeFeedback.summary}</Text>
                  <Text type="secondary">{overtimeFeedback.actionHint}</Text>
                </Space>
              }
            />
          ) : null}
          <Form.Item label="Date Worked" name="date" rules={[{ required: true, message: 'Select a date' }]}>
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item label="Hours Worked" name="hours" rules={[{ required: true, message: 'Enter hours' }]}>
            <InputNumber min={0.5} max={24} step={0.5} style={{ width: '100%' }} addonAfter="hours" />
          </Form.Item>
          <Form.Item
            label="What did you work on?"
            name="description"
            rules={[{ required: true, message: 'Add a short description' }]}
          >
            <TextArea rows={4} placeholder="Example: Incident triage and production hardening." />
          </Form.Item>
          <Space>
            <Button type="primary" onClick={handleOvertimeSubmit} loading={submitting}>
              Save & View Details
            </Button>
            <Button onClick={handleCloseOvertimeModal}>Cancel</Button>
            <Text type="secondary" style={{ marginLeft: 8 }}>Supervisor approval is required before TOIL accrues.</Text>
          </Space>
        </Form>
      </Modal>

      <ApprovalModal
        visible={approvalModalVisible}
        timesheet={timesheetForApproval}
        onApprove={handleApprove}
        onReject={handleReject}
        onCancel={handleCloseApprovalModal}
        loading={approvalSubmitting}
      />
    </div>
  )
}

export default TOILPage
