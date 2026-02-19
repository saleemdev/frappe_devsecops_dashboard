import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  Descriptions,
  Empty,
  Grid,
  Input,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  theme,
  notification
} from 'antd'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  TeamOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

import useToilStore from '../stores/toilStore'
import { getHeaderIconColor } from '../utils/themeUtils'
import {
  getToilStatusColor,
  isReviewableTimesheet,
  normalizeToilStatus,
  TOIL_STATUSES
} from '../utils/toilStatusUtils'

const { Title, Text } = Typography

const GLASS = {
  background: 'linear-gradient(145deg, rgba(255,255,255,0.65), rgba(255,255,255,0.35))',
  border: '1px solid rgba(255,255,255,0.45)',
  boxShadow: '0 10px 32px rgba(15, 23, 42, 0.12)',
  backdropFilter: 'blur(14px)',
  WebkitBackdropFilter: 'blur(14px)'
}

const withStatus = (row = {}) => ({
  ...row,
  toil_status: normalizeToilStatus(row),
  status: normalizeToilStatus(row),
  start_date: row.start_date || row.from_date,
  end_date: row.end_date || row.to_date
})


function TOILApprovalsPage({ navigateToRoute }) {
  const { token } = theme.useToken()
  const screens = Grid.useBreakpoint()
  const isMobile = !screens.md

  const [tsApprovalStates, setTsApprovalStates] = useState({})
  const [leaveApprovalStates, setLeaveApprovalStates] = useState({})

  const {
    supervisorTimesheets, supervisorLeaveApplications,
    supervisorLoading, supervisorLeaveLoading,
    setTimesheetApproval, setLeaveApproval,
    fetchSupervisorTimesheets, fetchSupervisorLeaveApplications,
    fetchTOILBalance, fetchLeaveLedger
  } = useToilStore()

  useEffect(() => {
    fetchSupervisorTimesheets().catch(() => {})
    fetchSupervisorLeaveApplications().catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refreshAll = useCallback(async () => {
    await Promise.all([
      fetchSupervisorTimesheets().catch(() => {}),
      fetchSupervisorLeaveApplications().catch(() => {}),
    ])
    notification.success({ message: 'Refreshed', duration: 2 })
  }, [fetchSupervisorTimesheets, fetchSupervisorLeaveApplications])

  const tsRows = useMemo(() => {
    return (Array.isArray(supervisorTimesheets) ? supervisorTimesheets : [])
      .map(withStatus)
      .filter(isReviewableTimesheet)
      .sort((a, b) => dayjs(b.creation || b.modified).valueOf() - dayjs(a.creation || a.modified).valueOf())
  }, [supervisorTimesheets])

  const leaveRows = useMemo(() => {
    return (Array.isArray(supervisorLeaveApplications) ? supervisorLeaveApplications : [])
      .sort((a, b) => dayjs(b.creation || b.modified).valueOf() - dayjs(a.creation || a.modified).valueOf())
  }, [supervisorLeaveApplications])

  // ── Timesheet Approval Handlers ─────────────────────────────────
  const getTsState = (n) => tsApprovalStates[n] || { mode: 'idle', comment: '', reason: '', loading: false }
  const setTsState = (n, p) => setTsApprovalStates(prev => ({ ...prev, [n]: { ...getTsState(n), ...p } }))

  const handleTsApprove = async (name) => {
    const st = getTsState(name)
    setTsState(name, { loading: true })
    try {
      const result = await setTimesheetApproval(String(name), 'approved', st.comment || '')
      if (result?.success) {
        notification.success({ message: `Timesheet ${name} approved`, duration: 4 })
        setTsApprovalStates(prev => { const n = { ...prev }; delete n[name]; return n })
        return
      }
      notification.error({ message: 'Approval failed', description: result?.error || result?.message })
    } catch (err) {
      notification.error({ message: 'Approval failed', description: err?.message })
    } finally {
      setTsState(name, { loading: false })
    }
  }

  const handleTsConfirmReject = async (name) => {
    const st = getTsState(name)
    if ((st.reason || '').trim().length < 10) {
      notification.warning({ message: 'Rejection reason must be at least 10 characters' })
      return
    }
    setTsState(name, { loading: true })
    try {
      const result = await setTimesheetApproval(String(name), 'rejected', st.reason)
      if (result?.success) {
        notification.success({ message: `Timesheet ${name} rejected`, duration: 4 })
        setTsApprovalStates(prev => { const n = { ...prev }; delete n[name]; return n })
        return
      }
      notification.error({ message: 'Rejection failed', description: result?.error || result?.message })
    } catch (err) {
      notification.error({ message: 'Rejection failed', description: err?.message })
    } finally {
      setTsState(name, { loading: false })
    }
  }

  // ── Leave Approval Handlers ─────────────────────────────────────
  const getLvState = (n) => leaveApprovalStates[n] || { mode: 'idle', comment: '', reason: '', loading: false }
  const setLvState = (n, p) => setLeaveApprovalStates(prev => ({ ...prev, [n]: { ...getLvState(n), ...p } }))

  const handleLeaveApprove = async (name) => {
    const st = getLvState(name)
    setLvState(name, { loading: true })
    try {
      const result = await setLeaveApproval(String(name), 'approved', st.comment || '')
      if (result?.success) {
        notification.success({ message: `Leave ${name} approved`, duration: 4 })
        setLeaveApprovalStates(prev => { const n = { ...prev }; delete n[name]; return n })
        return
      }
      notification.error({ message: 'Approval failed', description: result?.error || result?.message })
    } catch (err) {
      notification.error({ message: 'Approval failed', description: err?.message })
    } finally {
      setLvState(name, { loading: false })
    }
  }

  const handleLeaveConfirmReject = async (name) => {
    const st = getLvState(name)
    if ((st.reason || '').trim().length < 10) {
      notification.warning({ message: 'Rejection reason must be at least 10 characters' })
      return
    }
    setLvState(name, { loading: true })
    try {
      const result = await setLeaveApproval(String(name), 'rejected', st.reason)
      if (result?.success) {
        notification.success({ message: `Leave ${name} rejected`, duration: 4 })
        setLeaveApprovalStates(prev => { const n = { ...prev }; delete n[name]; return n })
        return
      }
      notification.error({ message: 'Rejection failed', description: result?.error || result?.message })
    } catch (err) {
      notification.error({ message: 'Rejection failed', description: err?.message })
    } finally {
      setLvState(name, { loading: false })
    }
  }

  // ── Render helpers ──────────────────────────────────────────────
  const renderTimesheetCard = (row) => {
    const st = getTsState(row.name)
    const isRejecting = st.mode === 'rejecting'
    return (
      <Card key={row.name} size="small" className="toil-glass-card toil-approval-card" style={{ marginBottom: 14, ...GLASS }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Descriptions size="small" column={isMobile ? 1 : 2} colon={false}>
              <Descriptions.Item label={<Text type="secondary">Timesheet</Text>}>
                <Button type="link" style={{ padding: 0, fontWeight: 600 }}
                  onClick={() => navigateToRoute?.('timesheet-toil-detail', null, null, null, null, row.name)}>{row.name}</Button>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Employee</Text>}>{row.employee_name || row.employee}</Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Period</Text>}>{row.start_date || '-'} &ndash; {row.end_date || '-'}</Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">TOIL</Text>}>
                <Space size={4}><Tag color="blue">{Number(row.total_toil_hours || 0).toFixed(2)} hrs</Tag><Tag color="cyan">{Number(row.toil_days || 0).toFixed(3)} days</Tag></Space>
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Submitted</Text>}><Text style={{ fontSize: 12 }}>{row.creation ? dayjs(row.creation).format('MMM DD, YYYY HH:mm') : '-'}</Text></Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} lg={10}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {!isRejecting && (
                <>
                  <Input.TextArea rows={2} placeholder="Comment (optional)" value={st.comment}
                    onChange={(e) => setTsState(row.name, { comment: e.target.value })} disabled={st.loading} />
                  <Space>
                    <Button type="primary" icon={<CheckCircleOutlined />} loading={st.loading} onClick={() => handleTsApprove(row.name)}>Approve</Button>
                    <Button danger icon={<CloseCircleOutlined />} disabled={st.loading} onClick={() => setTsState(row.name, { mode: 'rejecting' })}>Reject</Button>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}><CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />Approving allocates {Number(row.toil_days || 0).toFixed(3)} TOIL day(s) valid for 6 months.</Text>
                </>
              )}
              {isRejecting && (
                <>
                  <Alert type="warning" showIcon message="Rejecting this timesheet" style={{ marginBottom: 0 }} />
                  <Input.TextArea rows={3} placeholder="Reason (required, min 10 chars)" value={st.reason} autoFocus
                    onChange={(e) => setTsState(row.name, { reason: e.target.value })} disabled={st.loading}
                    status={(st.reason || '').trim().length > 0 && (st.reason || '').trim().length < 10 ? 'warning' : undefined} />
                  <Space>
                    <Button danger loading={st.loading} onClick={() => handleTsConfirmReject(row.name)}>Confirm Rejection</Button>
                    <Button disabled={st.loading} onClick={() => setTsState(row.name, { mode: 'idle', reason: '' })}>Cancel</Button>
                  </Space>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    )
  }

  const renderLeaveCard = (row) => {
    const st = getLvState(row.name)
    const isRejecting = st.mode === 'rejecting'
    return (
      <Card key={row.name} size="small" className="toil-glass-card toil-approval-card" style={{ marginBottom: 14, ...GLASS }}>
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={14}>
            <Descriptions size="small" column={isMobile ? 1 : 2} colon={false}>
              <Descriptions.Item label={<Text type="secondary">Leave App</Text>}><Text strong>{row.name}</Text></Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Employee</Text>}>{row.employee_name || row.employee}</Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Period</Text>}>
                {row.from_date ? dayjs(row.from_date).format('MMM DD') : '?'} &ndash; {row.to_date ? dayjs(row.to_date).format('MMM DD, YYYY') : '?'}
              </Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Days</Text>}><Tag color="green">{Number(row.total_leave_days || 0).toFixed(1)} day(s)</Tag></Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Reason</Text>}><Text style={{ fontSize: 12 }}>{row.description || '-'}</Text></Descriptions.Item>
              <Descriptions.Item label={<Text type="secondary">Submitted</Text>}><Text style={{ fontSize: 12 }}>{row.creation ? dayjs(row.creation).format('MMM DD, YYYY HH:mm') : '-'}</Text></Descriptions.Item>
            </Descriptions>
          </Col>
          <Col xs={24} lg={10}>
            <Space direction="vertical" size={10} style={{ width: '100%' }}>
              {!isRejecting && (
                <>
                  <Input.TextArea rows={2} placeholder="Comment (optional)" value={st.comment}
                    onChange={(e) => setLvState(row.name, { comment: e.target.value })} disabled={st.loading} />
                  <Space>
                    <Button type="primary" icon={<CheckCircleOutlined />} loading={st.loading} onClick={() => handleLeaveApprove(row.name)}>Approve</Button>
                    <Button danger icon={<CloseCircleOutlined />} disabled={st.loading} onClick={() => setLvState(row.name, { mode: 'rejecting' })}>Reject</Button>
                  </Space>
                  <Text type="secondary" style={{ fontSize: 12 }}><CheckCircleOutlined style={{ marginRight: 4, color: '#52c41a' }} />Approving deducts {Number(row.total_leave_days || 0).toFixed(1)} day(s) from the employee's TOIL balance.</Text>
                </>
              )}
              {isRejecting && (
                <>
                  <Alert type="warning" showIcon message="Rejecting this leave request" style={{ marginBottom: 0 }} />
                  <Input.TextArea rows={3} placeholder="Reason (required, min 10 chars)" value={st.reason} autoFocus
                    onChange={(e) => setLvState(row.name, { reason: e.target.value })} disabled={st.loading}
                    status={(st.reason || '').trim().length > 0 && (st.reason || '').trim().length < 10 ? 'warning' : undefined} />
                  <Space>
                    <Button danger loading={st.loading} onClick={() => handleLeaveConfirmReject(row.name)}>Confirm Rejection</Button>
                    <Button disabled={st.loading} onClick={() => setLvState(row.name, { mode: 'idle', reason: '' })}>Cancel</Button>
                  </Space>
                </>
              )}
            </Space>
          </Col>
        </Row>
      </Card>
    )
  }

  const pageShellStyle = {
    padding: isMobile ? 12 : 20,
    borderRadius: isMobile ? 14 : 18,
    background: 'radial-gradient(circle at 10% 0%, rgba(125,211,252,0.24), rgba(167,243,208,0.1) 36%, rgba(255,255,255,0.08) 68%)'
  }

  const totalPending = tsRows.length + leaveRows.length

  return (
    <div style={pageShellStyle} className="toil-page">

      {/* ─── Header ─── */}
      <Card className="toil-glass-card toil-hero-card" style={{ marginBottom: 20, ...GLASS }}>
        <Row justify="space-between" align="middle" gutter={[12, 12]}>
          <Col xs={24} md={16}>
            <Breadcrumb items={[
              { title: <a onClick={() => navigateToRoute?.('timesheet-toil')}>TOIL Dashboard</a> },
              { title: 'Approvals' }
            ]} style={{ fontSize: 12, marginBottom: 6 }} />
            <Title level={3} style={{ margin: 0, display: 'flex', alignItems: 'center' }}>
              <TeamOutlined style={{ marginRight: 12, color: getHeaderIconColor(token), fontSize: 26 }} />
              TOIL Approvals
              {totalPending > 0 && <Badge count={totalPending} style={{ marginLeft: 12, boxShadow: 'none' }} />}
            </Title>
            <Text type="secondary" style={{ fontSize: 13 }}>
              Review and act on pending timesheet submissions and leave requests from your team.
            </Text>
          </Col>
          <Col xs={24} md={8} style={{ textAlign: isMobile ? 'left' : 'right' }}>
            <Space wrap>
              <Button icon={<ArrowLeftOutlined />} onClick={() => navigateToRoute?.('timesheet-toil')}>Back to Dashboard</Button>
              <Button icon={<ReloadOutlined />} onClick={refreshAll} loading={supervisorLoading || supervisorLeaveLoading}>Refresh</Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* ─── Section 1: Timesheet Approvals ─── */}
      <Card className="toil-glass-card" style={{ marginBottom: 20, ...GLASS }}>
        <div style={{ marginBottom: 14 }}>
          <Space size={8}>
            <ClockCircleOutlined style={{ color: token.colorPrimary }} />
            <Title level={5} style={{ margin: 0 }}>Timesheet Approvals</Title>
            <Badge count={tsRows.length} showZero color={tsRows.length > 0 ? '#fa541c' : '#d9d9d9'} style={{ boxShadow: 'none' }} />
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
            Timesheets submitted by your team members with Pending Accrual status. Approve to submit and create TOIL allocation, or reject with a reason.
          </Text>
        </div>

        {supervisorLoading && tsRows.length === 0 && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
        {!supervisorLoading && tsRows.length === 0 && <Empty description="No pending timesheet requests" style={{ margin: '30px 0' }} />}
        {tsRows.map(renderTimesheetCard)}
      </Card>

      {/* ─── Section 2: Leave Application Approvals ─── */}
      <Card className="toil-glass-card" style={{ marginBottom: 20, ...GLASS }}>
        <div style={{ marginBottom: 14 }}>
          <Space size={8}>
            <CalendarOutlined style={{ color: '#52c41a' }} />
            <Title level={5} style={{ margin: 0 }}>Leave Application Approvals</Title>
            <Badge count={leaveRows.length} showZero color={leaveRows.length > 0 ? '#fa541c' : '#d9d9d9'} style={{ boxShadow: 'none' }} />
          </Space>
          <Text type="secondary" style={{ display: 'block', marginTop: 4, fontSize: 13 }}>
            TOIL leave requests submitted by your team. Approve to deduct from their TOIL balance, or reject with a reason.
          </Text>
        </div>

        {supervisorLeaveLoading && leaveRows.length === 0 && <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>}
        {!supervisorLeaveLoading && leaveRows.length === 0 && <Empty description="No pending leave requests" style={{ margin: '30px 0' }} />}
        {leaveRows.map(renderLeaveCard)}
      </Card>
    </div>
  )
}

export default TOILApprovalsPage
