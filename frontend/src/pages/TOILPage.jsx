import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Collapse,
  Descriptions,
  Empty,
  Grid,
  Row,
  Space,
  Spin,
  Statistic,
  Steps,
  Table,
  Tag,
  Timeline,
  Typography,
  theme,
  notification
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  EyeOutlined,
  HistoryOutlined,
  MailOutlined,
  MinusCircleOutlined,
  PlusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UpOutlined,
  UserOutlined,
  CrownOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'
import '../styles/toilPage.css'

import useToilStore from '../stores/toilStore'
import { getHeaderIconColor } from '../utils/themeUtils'
import {
  getToilStatusColor,
  normalizeToilStatus,
  TOIL_STATUSES
} from '../utils/toilStatusUtils'

const { Title, Text } = Typography

const STATUS_GUIDE = {
  [TOIL_STATUSES.PENDING_ACCRUAL]: 'Awaiting supervisor approval. TOIL days will be allocated once approved.',
  [TOIL_STATUSES.ACCRUED]: 'Approved and allocated. TOIL days are available for leave applications.',
  [TOIL_STATUSES.PARTIALLY_USED]: 'Some allocated TOIL days have been consumed via leave.',
  [TOIL_STATUSES.FULLY_USED]: 'All allocated TOIL days from this timesheet have been consumed.',
  [TOIL_STATUSES.EXPIRED]: 'Allocation expired (past 6-month validity window).',
  [TOIL_STATUSES.REJECTED]: 'Supervisor rejected this submission. Review comments, correct, and resubmit.',
  [TOIL_STATUSES.CANCELLED]: 'Timesheet or allocation cancelled.',
  [TOIL_STATUSES.NOT_APPLICABLE]: 'No non-billable TOIL hours on this timesheet.'
}

const GLASS = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 10px 32px rgba(15, 23, 42, 0.12)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)'
}

const formatError = (error, fallback = 'Something went wrong.') => {
  if (!error) return fallback
  const raw = error?.response?.data?.message || error?.error?.message || error?.message
  if (typeof raw !== 'string') return fallback
  return raw.replace(/^Error:\s*/i, '').trim() || fallback
}

const withStatus = (row = {}) => ({
  ...row,
  toil_status: normalizeToilStatus(row),
  status: normalizeToilStatus(row),
  start_date: row.start_date || row.from_date,
  end_date: row.end_date || row.to_date
})


function TOILPage({ navigateToRoute }) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const [expandedRowKeys, setExpandedRowKeys] = useState([])
  const [setupRetrying, setSetupRetrying] = useState(false)

  const {
    employeeSetup, toilBalance, leaveLedger, timesheets, supervisorTimesheets, teamMembers,
    setupLoading, balanceLoading, timesheetsLoading, supervisorLoading, ledgerLoading, teamLoading,
    userRole,
    validateSetup, initialize,
    fetchTOILBalance, fetchLeaveLedger, fetchMyTimesheets, fetchSupervisorTimesheets, fetchMyTeam
  } = useToilStore()

  const availableBalance = Number(toilBalance?.available || 0)
  const totalEarned = Number(toilBalance?.total || 0)
  const totalUsed = Number(toilBalance?.used || 0)
  const isSupervisor = userRole === 'supervisor' || userRole === 'hr'

  const myTimesheetRows = useMemo(
    () => (Array.isArray(timesheets) ? timesheets : []).map(withStatus),
    [timesheets]
  )

  const pendingTeamRequests = useMemo(() => {
    const rows = (Array.isArray(supervisorTimesheets) ? supervisorTimesheets : []).map(withStatus)
    return rows.filter(r => r.toil_status === TOIL_STATUSES.PENDING_ACCRUAL).length
  }, [supervisorTimesheets])

  const historyRows = useMemo(() => {
    const raw = Array.isArray(leaveLedger) ? [...leaveLedger] : []
    const sorted = [...raw].sort(
      (a, b) => dayjs(a.entry_date || a.date).valueOf() - dayjs(b.entry_date || b.date).valueOf()
    )
    let balance = 0
    return sorted.map(row => {
      balance += Number(row.leaves || 0)
      return { ...row, running_balance: Number(balance.toFixed(3)) }
    }).reverse()
  }, [leaveLedger])

  const pendingTimesheets = myTimesheetRows.filter(r => r.toil_status === TOIL_STATUSES.PENDING_ACCRUAL).length
  const rejectedTimesheets = myTimesheetRows.filter(r => r.toil_status === TOIL_STATUSES.REJECTED).length
  const hasAccruedBalance = availableBalance > 0

  // ── Effects ──────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      try {
        await validateSetup()
        await initialize()
        await Promise.all([
          fetchTOILBalance(), fetchLeaveLedger(), fetchMyTimesheets(),
          fetchSupervisorTimesheets().catch(() => {}),
          fetchMyTeam().catch(() => {})
        ])
      } catch (err) {
        notification.error({ message: 'Initialization failed', description: formatError(err), duration: 6 })
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAll = useCallback(async () => {
    try {
      await Promise.all([
        fetchTOILBalance(), fetchLeaveLedger(), fetchMyTimesheets(),
        fetchSupervisorTimesheets().catch(() => {}),
        fetchMyTeam().catch(() => {})
      ])
      notification.success({ message: 'Data refreshed', duration: 2 })
    } catch (err) {
      notification.error({ message: 'Refresh failed', description: formatError(err) })
    }
  }, [fetchTOILBalance, fetchLeaveLedger, fetchMyTimesheets, fetchSupervisorTimesheets, fetchMyTeam])

  const retrySetup = async () => {
    try {
      setSetupRetrying(true)
      await validateSetup()
      await initialize()
      await Promise.all([
        fetchTOILBalance(), fetchLeaveLedger(), fetchMyTimesheets(),
        fetchSupervisorTimesheets().catch(() => {}),
        fetchMyTeam().catch(() => {})
      ])
      notification.success({ message: 'Setup validated' })
    } catch (err) {
      notification.error({ message: 'Setup still incomplete', description: formatError(err) })
    } finally {
      setSetupRetrying(false)
    }
  }

  // ── Styles ──────────────────────────────────────────────────────
  const pageShellStyle = {
    padding: isMobile ? 12 : 20,
    borderRadius: isMobile ? 14 : 18,
    background: 'radial-gradient(circle at 10% 0%, rgba(125,211,252,0.24), rgba(167,243,208,0.1) 36%, rgba(255,255,255,0.08) 68%)'
  }

  // ── Workflow Steps ──────────────────────────────────────────────
  const workflowCurrent = myTimesheetRows.length === 0 ? 0 : pendingTeamRequests > 0 ? 1 : hasAccruedBalance ? 2 : 1
  const workflowSteps = [
    { title: 'Record TOIL', description: myTimesheetRows.length > 0 ? `${myTimesheetRows.length} recorded` : 'Create overtime entry' },
    { title: 'Supervisor Approval', description: pendingTeamRequests > 0 ? `${pendingTeamRequests} pending` : 'Up to date' },
    { title: 'Use TOIL', description: hasAccruedBalance ? `${availableBalance.toFixed(2)} days available` : 'Earn balance first' }
  ]

  // ── Column Definitions ──────────────────────────────────────────
  const col = (title) => <Text strong style={{ fontSize: 13, color: token.colorText }}>{title}</Text>

  const timesheetColumns = [
    {
      title: col('Timesheet'), dataIndex: 'name', key: 'name',
      render: (name) => (
        <Button type="link" style={{ padding: 0, height: 'auto', fontWeight: 600, fontSize: 14 }}
          onClick={() => navigateToRoute?.('timesheet-toil-detail', null, null, null, null, name)}>
          {name}
        </Button>
      )
    },
    { title: col('Period'), key: 'range', render: (_, r) => <Text style={{ fontSize: 12, color: token.colorTextSecondary }}>{r.start_date || '-'} to {r.end_date || '-'}</Text> },
    { title: col('Total Hrs'), dataIndex: 'total_hours', key: 'hours', align: 'right', render: (v) => <Text style={{ fontSize: 12 }}>{Number(v || 0).toFixed(2)}</Text> },
    { title: col('TOIL Days'), key: 'toil', align: 'right', render: (_, r) => <Tag color="blue">{Number(r.toil_days || 0).toFixed(3)}</Tag> },
    { title: col('Status'), key: 'status', render: (_, r) => <Tag color={getToilStatusColor(r.toil_status)}>{r.toil_status}</Tag> }
  ]

  const auditColumns = [
    { title: col('Date'), dataIndex: 'entry_date', key: 'date', width: 120, render: (v) => <Text style={{ fontSize: 12 }}>{v ? dayjs(v).format('MMM DD, YYYY') : '-'}</Text> },
    { title: col('Type'), key: 'type', width: 100, render: (_, r) => r.transaction_type === 'Leave Allocation' ? <Tag color="green" icon={<PlusCircleOutlined />}>Earned</Tag> : <Tag color="red" icon={<MinusCircleOutlined />}>Used</Tag> },
    { title: col('Days'), dataIndex: 'leaves', key: 'days', align: 'right', width: 90, render: (v) => { const n = Number(v || 0); return <Text strong style={{ color: n > 0 ? '#52c41a' : '#ff4d4f' }}>{n > 0 ? '+' : ''}{n.toFixed(3)}</Text> } },
    { title: col('Balance'), dataIndex: 'running_balance', key: 'balance', align: 'right', width: 100, render: (v) => <Tag color="processing">{Number(v || 0).toFixed(3)}d</Tag> },
    { title: col('Reference'), dataIndex: 'transaction_name', key: 'ref', render: (v) => <Text style={{ fontSize: 12, fontFamily: 'monospace' }}>{v || '-'}</Text> },
    { title: col('Expiry'), key: 'expiry', width: 90, render: (_, r) => { if (r.days_until_expiry == null) return '-'; if (r.days_until_expiry <= 0) return <Tag color="error">Expired</Tag>; if (r.days_until_expiry <= 30) return <Tag color="warning">{r.days_until_expiry}d</Tag>; return <Text style={{ fontSize: 12 }}>{r.days_until_expiry}d</Text> } }
  ]

  // ── Expanded Row ────────────────────────────────────────────────
  const renderExpandedRow = (record) => {
    const s = record.toil_status
    return (
      <div style={{ padding: '8px 0' }}>
        <Descriptions size="small" bordered column={isMobile ? 1 : 2} style={{ marginBottom: 12 }}>
          <Descriptions.Item label="Status"><Tag color={getToilStatusColor(s)}>{s}</Tag></Descriptions.Item>
          <Descriptions.Item label="Explanation"><Text type="secondary" style={{ fontSize: 13 }}>{STATUS_GUIDE[s] || '-'}</Text></Descriptions.Item>
          <Descriptions.Item label="TOIL Calculation"><Text>{Number(record.total_toil_hours || 0).toFixed(2)} hrs &divide; 8 = <strong>{Number(record.toil_days || 0).toFixed(3)} days</strong></Text></Descriptions.Item>
          <Descriptions.Item label="Allocation Ref"><Text copyable={!!record.toil_allocation}>{record.toil_allocation || 'Pending approval'}</Text></Descriptions.Item>
          <Descriptions.Item label="Created">{record.creation ? dayjs(record.creation).format('MMM DD, YYYY HH:mm:ss') : '-'}</Descriptions.Item>
          <Descriptions.Item label="Modified">{record.modified ? dayjs(record.modified).format('MMM DD, YYYY HH:mm:ss') : '-'}</Descriptions.Item>
        </Descriptions>
        {s === TOIL_STATUSES.REJECTED && (
          <Alert type="error" showIcon style={{ marginBottom: 12 }} message="Rejected by supervisor" description="Check document comments for the reason. Correct and resubmit."
            action={<Button size="small" type="primary" danger onClick={() => navigateToRoute?.('timesheet-toil-detail', null, null, null, null, record.name)}>Open &amp; Edit</Button>} />
        )}
        <Button type="link" icon={<EyeOutlined />} style={{ padding: 0 }} onClick={() => navigateToRoute?.('timesheet-toil-detail', null, null, null, null, record.name)}>
          View full details with time logs
        </Button>
      </div>
    )
  }

  // ── Loading / Setup Error ───────────────────────────────────────
  if (setupLoading && !employeeSetup) {
    return <div style={{ textAlign: 'center', padding: '100px 0' }}><Spin size="large" /></div>
  }

  if (!employeeSetup?.valid) {
    const issues = employeeSetup?.issues || ['Configuration incomplete. Contact HR.']
    const isEmployeeMissing = issues.some(i => typeof i === 'string' && i.toLowerCase().includes('no employee'))
    const cfg = isEmployeeMissing
      ? { icon: UserOutlined, title: 'Almost there', summary: 'Your account needs to be linked to your employee profile.', fixHint: 'Ask HR to connect your login to your employee profile.', label: 'Contact HR to complete setup' }
      : { icon: TeamOutlined, title: 'One more step', summary: 'A reporting manager needs to be assigned for approval routing.', fixHint: 'Ask HR to set your reporting manager.', label: 'Contact HR to assign your manager' }
    const SetupIcon = cfg.icon
    return (
      <div style={pageShellStyle}>
        <Card className="toil-glass-card" style={{ maxWidth: 680, margin: '60px auto', borderRadius: 16, ...GLASS }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <div style={{ width: 72, height: 72, borderRadius: 16, background: 'linear-gradient(145deg, rgba(22,119,255,0.12), rgba(22,119,255,0.06))', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <SetupIcon style={{ fontSize: 36, color: token.colorPrimary }} />
            </div>
            <Title level={3} style={{ margin: 0, marginBottom: 8 }}>{cfg.title}</Title>
            <Text type="secondary" style={{ fontSize: 14, display: 'block', maxWidth: 520, margin: '0 auto' }}>{cfg.summary}</Text>
          </div>
          <Alert type="warning" showIcon message="What needs to happen" style={{ marginBottom: 16 }} description={<ul style={{ margin: 0, paddingLeft: 16 }}>{issues.map((issue, i) => <li key={i}>{issue}</li>)}</ul>} />
          <Alert type="info" showIcon icon={<CheckCircleOutlined />} message="Next step" description={cfg.fixHint} style={{ marginBottom: 20 }} />
          <Button type="primary" size="large" icon={<ReloadOutlined />} onClick={retrySetup} loading={setupRetrying} block={isMobile} style={{ height: 44, borderRadius: 10, marginBottom: 12 }}>Retry Setup Validation</Button>
          <div style={{ textAlign: 'center' }}><Text type="secondary" style={{ fontSize: 12 }}><MailOutlined style={{ marginRight: 6 }} />{cfg.label}</Text></div>
        </Card>
      </div>
    )
  }

  // ── Main Dashboard ──────────────────────────────────────────────
  return (
    <div style={pageShellStyle} className="toil-page">

      {/* ─── Hero Header ─── */}
      <Card className="toil-glass-card toil-hero-card" style={{ marginBottom: 16, ...GLASS }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={14}>
            <Breadcrumb items={[{ title: 'Ops' }, { title: 'TOIL Management' }]} style={{ fontSize: 12, marginBottom: 6 }} />
            <Title level={2} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <ClockCircleOutlined style={{ marginRight: 14, color: getHeaderIconColor(token), fontSize: 30 }} />
              TOIL Dashboard
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>Record overtime, get approval, apply for leave. Each workflow step has its own dedicated page.</Text>
          </Col>
          <Col xs={24} md={10} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <Space wrap>
              <Tag color="processing">Balance: {availableBalance.toFixed(2)}d</Tag>
              {pendingTimesheets > 0 && <Tag color="warning">Pending: {pendingTimesheets}</Tag>}
              {rejectedTimesheets > 0 && <Tag color="error">Rejected: {rejectedTimesheets}</Tag>}
              <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={timesheetsLoading || balanceLoading}>Refresh</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ─── Supervisor Card ─── */}
      {employeeSetup?.valid && employeeSetup?.supervisor_name && (
        <Card className="toil-glass-card" style={{ marginBottom: 16, ...GLASS, border: `2px solid ${token.colorPrimary}20`, background: 'linear-gradient(145deg, rgba(255,255,255,0.75), rgba(255,255,255,0.50))' }}>
          <Row align="middle" gutter={[16, 12]}>
            <Col xs={24} sm={24} md={6} style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'flex-start' }}>
              <div style={{ position: 'relative' }}>
                <div style={{ width: 64, height: 64, borderRadius: 16, background: `linear-gradient(145deg, ${token.colorPrimary}15, ${token.colorPrimary}08)`, display: 'flex', alignItems: 'center', justifyContent: 'center', border: `2px solid ${token.colorPrimary}30` }}>
                  <CrownOutlined style={{ fontSize: 32, color: token.colorPrimary }} />
                </div>
                <div style={{ position: 'absolute', bottom: -4, right: -4, width: 24, height: 24, borderRadius: '50%', background: token.colorSuccess, border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
                  <CheckCircleOutlined style={{ fontSize: 12, color: 'white' }} />
                </div>
              </div>
            </Col>
            <Col xs={24} sm={24} md={18}>
              <Space direction="vertical" size={4} style={{ width: '100%' }}>
                <div>
                  <Text type="secondary" style={{ fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Reporting Manager</Text>
                </div>
                <div>
                  <Title level={4} style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <TeamOutlined style={{ color: token.colorPrimary, fontSize: 20 }} />
                    {employeeSetup.supervisor_name}
                  </Title>
                </div>
                <div>
                  <Space size={8}>
                    <MailOutlined style={{ color: token.colorTextSecondary, fontSize: 14 }} />
                    <Text type="secondary" style={{ fontSize: 13 }}>{employeeSetup.supervisor_user || 'No email configured'}</Text>
                  </Space>
                </div>
                <div style={{ marginTop: 4 }}>
                  <Tag color="processing" icon={<CheckCircleOutlined />} style={{ fontSize: 12 }}>
                    Approves your TOIL timesheets and leave applications
                  </Tag>
                </div>
              </Space>
            </Col>
          </Row>
        </Card>
      )}

      {/* ─── My Team ─── */}
      {teamMembers && teamMembers.length > 0 && (
        <Card className="toil-glass-card" style={{ marginBottom: 16, ...GLASS, padding: 0 }}>
          <Collapse
            items={[{
              key: 'team',
              label: (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', paddingRight: 8 }}>
                  <Space size={8}>
                    <TeamOutlined style={{ color: token.colorPrimary, fontSize: 16 }} />
                    <Title level={5} style={{ margin: 0, fontSize: 15 }}>My Team</Title>
                    <Badge count={teamMembers.length} showZero color="#1677ff" style={{ boxShadow: 'none' }} />
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {teamMembers.length} {teamMembers.length === 1 ? 'member' : 'members'}
                  </Text>
                </div>
              ),
              children: (
                <div style={{ paddingTop: 8 }}>
                  <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 13 }}>
                    Team members who report to you. You approve their TOIL timesheets and leave applications.
                  </Text>
                  {teamLoading ? (
                    <div style={{ textAlign: 'center', padding: 40 }}>
                      <Spin />
                    </div>
                  ) : (
                    <Row gutter={[8, 8]}>
                      {teamMembers.map((member) => (
                        <Col xs={24} sm={12} md={8} lg={6} xl={4} key={member.name}>
                          <div
                            style={{
                              background: 'rgba(255, 255, 255, 0.7)',
                              border: `1px solid ${token.colorBorderSecondary}`,
                              borderRadius: 8,
                              padding: 12,
                              height: '100%',
                              transition: 'all 0.2s ease',
                              cursor: 'default'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.9)'
                              e.currentTarget.style.borderColor = token.colorPrimary
                              e.currentTarget.style.boxShadow = `0 2px 8px ${token.colorPrimary}15`
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.7)'
                              e.currentTarget.style.borderColor = token.colorBorderSecondary
                              e.currentTarget.style.boxShadow = 'none'
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                              <div style={{
                                width: 36,
                                height: 36,
                                borderRadius: 8,
                                background: `linear-gradient(145deg, ${token.colorPrimary}15, ${token.colorPrimary}08)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: `1px solid ${token.colorPrimary}20`,
                                flexShrink: 0
                              }}>
                                <UserOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
                              </div>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <Text strong style={{ fontSize: 13, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', lineHeight: 1.4 }}>
                                  {member.employee_name}
                                </Text>
                                {member.designation && (
                                  <Text type="secondary" style={{ fontSize: 11, display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                                    {member.designation}
                                  </Text>
                                )}
                                {member.department && (
                                  <Tag color="default" style={{ fontSize: 10, marginTop: 4, padding: '0 6px', height: 18, lineHeight: '18px' }}>
                                    {member.department}
                                  </Tag>
                                )}
                              </div>
                            </div>
                          </div>
                        </Col>
                      ))}
                    </Row>
                  )}
                </div>
              ),
              style: {
                background: 'transparent',
                border: 'none',
                borderRadius: 0
              }
            }]}
            ghost
            style={{
              background: 'transparent'
            }}
            defaultActiveKey={[]}
          />
        </Card>
      )}

      {/* ─── Balance Metrics ─── */}
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col xs={24} md={8}>
          <Card className="toil-glass-card toil-metric-card" style={GLASS}>
            <Statistic title="Available Balance" value={availableBalance} precision={3} suffix="days" valueStyle={{ fontWeight: 700 }} />
            <Text type="secondary" className="toil-metric-note">Ready to use for leave</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="toil-glass-card toil-metric-card" style={GLASS}>
            <Statistic title="Total Earned" value={totalEarned} precision={3} suffix="days" />
            <Text type="secondary" className="toil-metric-note">Lifetime accrued</Text>
          </Card>
        </Col>
        <Col xs={24} md={8}>
          <Card className="toil-glass-card toil-metric-card" style={GLASS}>
            <Statistic title="Total Used" value={totalUsed} precision={3} suffix="days" />
            <Text type="secondary" className="toil-metric-note">Consumed via leave</Text>
          </Card>
        </Col>
      </Row>

      {/* ─── Workflow + Actions ─── */}
      <Card className="toil-glass-card" style={{ marginBottom: 20, ...GLASS }}>
        <Text strong style={{ display: 'block', marginBottom: 12 }}>TOIL Workflow</Text>
        <Steps size="small" current={workflowCurrent} items={workflowSteps} responsive style={{ marginBottom: 16 }} />
        <Space wrap>
          <Button type="primary" icon={<PlusOutlined />} onClick={() => navigateToRoute?.('toil-timesheet-new')}>
            Record Overtime
          </Button>
          {isSupervisor && (
            <Button icon={<TeamOutlined />} onClick={() => navigateToRoute?.('toil-approvals')}>
              Approvals
              {pendingTeamRequests > 0 && <Badge count={pendingTeamRequests} size="small" style={{ marginLeft: 8, boxShadow: 'none' }} />}
            </Button>
          )}
          <Button icon={<CalendarOutlined />} onClick={() => navigateToRoute?.('toil-leave-new')} disabled={!hasAccruedBalance}>
            Apply for Leave
          </Button>
        </Space>
      </Card>

      {/* ─── My Timesheets ─── */}
      <Card className="toil-glass-card" style={{ marginBottom: 20, ...GLASS }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Space size={8}>
            <CheckCircleOutlined style={{ color: token.colorPrimary }} />
            <Title level={5} style={{ margin: 0 }}>My Timesheets</Title>
            <Badge count={myTimesheetRows.length} showZero color="#1677ff" style={{ boxShadow: 'none' }} />
          </Space>
          <Button type="primary" size="small" icon={<PlusOutlined />} onClick={() => navigateToRoute?.('toil-timesheet-new')}>Record Overtime</Button>
        </div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 12, fontSize: 13 }}>
          Expand any row for audit details: status explanation, TOIL calculation, timestamps, and allocation reference.
        </Text>
        <Table
          className="toil-table" rowKey="name" dataSource={myTimesheetRows} columns={timesheetColumns}
          loading={timesheetsLoading} size="middle"
          scroll={isMobile ? { x: 800 } : undefined}
          pagination={{ pageSize: 8, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
          locale={{ emptyText: <Empty description="No timesheets yet. Record overtime to get started." style={{ margin: '40px 0' }} /> }}
          expandable={{
            expandedRowKeys,
            onExpandedRowsChange: (keys) => setExpandedRowKeys(keys),
            expandedRowRender: renderExpandedRow,
            expandRowByClick: true,
            rowExpandable: () => true
          }}
        />
      </Card>

      {/* ─── Audit Trail ─── */}
      <Card className="toil-glass-card" style={{ marginBottom: 20, ...GLASS }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <Space size={8}>
            <HistoryOutlined style={{ color: '#722ed1' }} />
            <Title level={5} style={{ margin: 0 }}>Audit Trail</Title>
            <Badge count={historyRows.length} showZero color="#722ed1" style={{ boxShadow: 'none' }} />
          </Space>
        </div>
        <Text type="secondary" style={{ display: 'block', marginBottom: 4, fontSize: 13 }}>
          Complete Leave Ledger for TOIL. Every accrual and consumption is recorded with running balance, references, and expiry.
        </Text>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16, fontSize: 12 }}>
          Current balance: <Text strong>{availableBalance.toFixed(3)} days</Text>
        </Text>

        {historyRows.length > 0 && (
          <Row gutter={[16, 16]}>
            <Col xs={24} lg={16}>
              <Table
                className="toil-table" size="small"
                rowKey={(row, i) => row?.transaction_name ? `${row.transaction_name}-${i}` : `audit-${i}`}
                dataSource={historyRows} columns={auditColumns} loading={ledgerLoading}
                scroll={{ x: 700 }}
                pagination={{ pageSize: 10, showSizeChanger: true, showTotal: (total, range) => `${range[0]}-${range[1]} of ${total}` }}
              />
            </Col>
            <Col xs={24} lg={8}>
              <Card size="small" title="Timeline" style={{ background: 'rgba(248,250,252,0.65)', maxHeight: 480, overflowY: 'auto' }}>
                <Timeline
                  items={historyRows.slice(0, 15).map((row) => {
                    const isEarned = Number(row.leaves || 0) > 0
                    return {
                      color: isEarned ? 'green' : 'red',
                      dot: isEarned ? <PlusCircleOutlined /> : <MinusCircleOutlined />,
                      children: (
                        <div>
                          <Text strong style={{ fontSize: 13 }}>{isEarned ? 'Earned' : 'Used'} {Math.abs(Number(row.leaves || 0)).toFixed(3)}d</Text>
                          <br /><Text type="secondary" style={{ fontSize: 12 }}>{row.entry_date ? dayjs(row.entry_date).format('MMM DD, YYYY') : '-'}</Text>
                          <br /><Text style={{ fontSize: 12 }}>Balance: {Number(row.running_balance || 0).toFixed(3)}d</Text>
                        </div>
                      )
                    }
                  })}
                />
              </Card>
            </Col>
          </Row>
        )}
        {historyRows.length === 0 && !ledgerLoading && (
          <Empty description="No TOIL audit entries yet." style={{ margin: '40px 0' }} />
        )}
        {ledgerLoading && historyRows.length === 0 && (
          <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
        )}
      </Card>
    </div>
  )
}

export default TOILPage
