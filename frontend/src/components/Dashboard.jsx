import { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Progress,
  Tag,
  Typography,
  theme,
  Button,
  Space,
  Divider,
  Spin,
  List,
  Empty
} from 'antd'
import { GlassCard } from './design-system'
import {
  ProjectOutlined,
  AlertOutlined,
  FileTextOutlined,
  CheckSquareOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  ExclamationCircleOutlined,
  BugOutlined
} from '@ant-design/icons'

import { useResponsive } from '../hooks/useResponsive'
import api from '../services/api'

const { Title, Text } = Typography

// Default empty metrics
const defaultMetrics = {
  projects: { active: 0, total: 0, trend: 0 },
  incidents: { open: 0, critical: 0, trend: 0 },
  changeRequests: { pending: 0, total: 0, trend: 0 },
  tasks: { total: 0, open: 0, trend: 0 }
}



function Dashboard({ navigateToRoute }) {
  const { token } = theme.useToken()
  const { isMobile } = useResponsive()

  // Metrics state
  const [metrics, setMetrics] = useState(defaultMetrics)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Recent items state
  const [recentIncidents, setRecentIncidents] = useState([])
  const [recentChangeRequests, setRecentChangeRequests] = useState([])

  // Fetch dashboard metrics on mount
  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        setLoading(true)
        setError(null)

        // Fetch optimized dashboard metrics from backend
        const metricsRes = await api.dashboard.getMetrics?.()

        if (metricsRes?.success && metricsRes.metrics) {
          const m = metricsRes.metrics

          setMetrics({
            projects: {
              active: m.projects?.active || 0,
              total: m.projects?.total || 0,
              trend: 0
            },
            incidents: {
              open: m.incidents?.open || 0,
              critical: m.incidents?.critical || 0,
              trend: 0
            },
            changeRequests: {
              pending: m.change_requests?.pending_approvals || 0,
              total: m.change_requests?.total || 0,
              trend: 0
            },
            tasks: {
              total: m.tasks?.total || 0,
              open: m.tasks?.in_progress || 0,
              trend: 0
            }
          })
        } else {
          setError('Failed to load dashboard metrics')
        }

        // Fetch recent incidents and change requests in parallel
        const [incidentsRes, crRes] = await Promise.all([
          api.incidents.getIncidents?.() || Promise.resolve({ success: true, data: [] }),
          api.changeRequests.getChangeRequests?.() || Promise.resolve({ success: true, data: [] })
        ])

        setRecentIncidents((incidentsRes?.data || []).slice(0, 5))
        setRecentChangeRequests((crRes?.data || []).slice(0, 5))
      } catch (err) {
        setError(err?.message || 'Failed to load dashboard metrics')
      } finally {
        setLoading(false)
      }
    }

    fetchMetrics()
  }, [])

  // Helper function to get status color
  const getStatusColor = (status) => {
    const s = (status || '').toLowerCase()
    if (s.includes('critical') || s.includes('rejected')) return token.colorError
    if (s.includes('high') || s.includes('pending')) return token.colorWarning
    if (s.includes('resolved') || s.includes('approved')) return token.colorSuccess
    return token.colorTextSecondary
  }

  // Helper function to get severity icon
  const getSeverityIcon = (severity) => {
    const s = (severity || '').toLowerCase()
    if (s === 'critical') return <ExclamationCircleOutlined style={{ color: token.colorError }} />
    if (s === 'high') return <AlertOutlined style={{ color: token.colorWarning }} />
    return <BugOutlined style={{ color: token.colorInfo }} />
  }



  return (
    <div style={{ padding: isMobile ? '16px' : '24px', backgroundColor: token.colorBgLayout, minHeight: '100vh' }}>
      {/* Error State */}
      {error && (
        <GlassCard variant="default" elevation={2} style={{ marginBottom: '24px', borderColor: token.colorError, borderLeft: `4px solid ${token.colorError}` }}>
          <Text type="danger">{error}</Text>
        </GlassCard>
      )}

      {/* Section 1: Executive Summary - KPI Cards */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Executive Summary
        </Title>
        <Row gutter={[16, 16]}>
          {/* Active Projects */}
          <Col xs={24} sm={12} lg={6}>
            <GlassCard variant="default" elevation={2} hoverable style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '12px' }}>
                <ProjectOutlined style={{ fontSize: '32px', color: token.colorPrimary }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.projects.active}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Active Projects</Text>
              <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextTertiary }}>
                of {metrics.projects.total} total
              </div>
            </GlassCard>
          </Col>

          {/* Open Incidents */}
          <Col xs={24} sm={12} lg={6}>
            <GlassCard variant="default" elevation={2} hoverable style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '12px' }}>
                <BugOutlined style={{ fontSize: '32px', color: metrics.incidents.critical > 0 ? token.colorError : token.colorWarning }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.incidents.open}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Open Incidents</Text>
              {metrics.incidents.critical > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorError }}>
                  🔴 {metrics.incidents.critical} Critical
                </div>
              )}
            </GlassCard>
          </Col>

          {/* Pending Change Requests */}
          <Col xs={24} sm={12} lg={6}>
            <GlassCard variant="default" elevation={2} hoverable style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '12px' }}>
                <FileTextOutlined style={{ fontSize: '32px', color: token.colorWarning }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.changeRequests.pending}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Pending Approvals</Text>
              <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextTertiary }}>
                of {metrics.changeRequests.total} total
              </div>
            </GlassCard>
          </Col>

          {/* Tasks Overview */}
          <Col xs={24} sm={12} lg={6}>
            <GlassCard variant="default" elevation={2} hoverable style={{ textAlign: 'center' }}>
              <div style={{ marginBottom: '12px' }}>
                <CheckSquareOutlined style={{ fontSize: '32px', color: metrics.tasks.open > 0 ? token.colorWarning : token.colorSuccess }} />
              </div>
              <div style={{ fontSize: '28px', fontWeight: '600', marginBottom: '4px' }}>
                {loading ? <Spin size="small" /> : metrics.tasks.open}
              </div>
              <Text type="secondary" style={{ fontSize: '12px' }}>Open Tasks</Text>
              <div style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextTertiary }}>
                of {metrics.tasks.total} total
              </div>
            </GlassCard>
          </Col>
        </Row>
      </div>

      {/* Section 2: Quick Actions */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Quick Actions
        </Title>
        <Row gutter={[12, 12]}>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="primary"
              block
              size="middle"
              icon={<PlusOutlined />}
              onClick={() => navigateToRoute?.('project-create')}
              style={{ height: '36px', fontSize: '13px' }}
            >
              New Project
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="default"
              block
              size="middle"
              icon={<AlertOutlined />}
              onClick={() => navigateToRoute?.('incidents')}
              style={{ height: '36px', fontSize: '13px', color: token.colorError, borderColor: token.colorError }}
            >
              Report Incident
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="default"
              block
              size="middle"
              icon={<FileTextOutlined />}
              onClick={() => navigateToRoute?.('change-requests-new')}
              style={{ height: '36px', fontSize: '13px', color: token.colorWarning, borderColor: token.colorWarning }}
            >
              Submit Change
            </Button>
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Button
              type="default"
              block
              size="middle"
              icon={<ArrowRightOutlined />}
              onClick={() => navigateToRoute?.('monitoring-dashboards')}
              style={{ height: '36px', fontSize: '13px' }}
            >
              View Dashboards
            </Button>
          </Col>
        </Row>
      </div>

      {/* Section 3: Status Overview */}
      <div style={{ marginBottom: '32px' }}>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Status Overview
        </Title>
        <Row gutter={[16, 16]}>
          {/* Projects Status */}
          <Col xs={24} md={12} lg={8}>
            <GlassCard variant="subtle" elevation={1}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Projects by Status</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Progress
                  type="circle"
                  percent={metrics.projects.total > 0 ? Math.round((metrics.projects.active / metrics.projects.total) * 100) : 0}
                  size={80}
                  format={percent => `${percent}%`}
                />
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: token.colorTextSecondary, textAlign: 'center' }}>
                <div>{metrics.projects.active} active of {metrics.projects.total} total</div>
              </div>
            </GlassCard>
          </Col>

          {/* Incidents by Severity */}
          <Col xs={24} md={12} lg={8}>
            <GlassCard variant="subtle" elevation={1}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Incidents by Severity</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'center' }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: token.colorError }}>
                    {metrics.incidents.critical}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Critical</Text>
                </div>
                <Divider type="vertical" style={{ height: '40px' }} />
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '20px', fontWeight: '600', color: token.colorWarning }}>
                    {metrics.incidents.open}
                  </div>
                  <Text type="secondary" style={{ fontSize: '12px' }}>Open</Text>
                </div>
              </div>
            </GlassCard>
          </Col>

          {/* Change Requests Status */}
          <Col xs={24} md={12} lg={8}>
            <GlassCard variant="subtle" elevation={1}>
              <div style={{ marginBottom: '12px' }}>
                <Text strong>Change Requests</Text>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
                <Progress
                  type="circle"
                  percent={metrics.changeRequests.total > 0 ? Math.round(((metrics.changeRequests.total - metrics.changeRequests.pending) / metrics.changeRequests.total) * 100) : 0}
                  size={80}
                  format={percent => `${percent}%`}
                />
              </div>
              <div style={{ marginTop: '12px', fontSize: '12px', color: token.colorTextSecondary, textAlign: 'center' }}>
                <div>{metrics.changeRequests.pending} pending approval</div>
              </div>
            </GlassCard>
          </Col>
        </Row>
      </div>

      {/* Section 4: Recent Activity */}
      <div>
        <Title level={4} style={{ marginBottom: '16px', color: token.colorTextHeading }}>
          Recent Activity
        </Title>
        <Row gutter={[16, 16]}>
          {/* Recent Incidents */}
          <Col xs={24} lg={12}>
            <GlassCard variant="default" elevation={2} title="Recent Incidents" size="small">
              {loading ? (
                <Spin />
              ) : recentIncidents.length === 0 ? (
                <Empty
                  description="No incidents found"
                  style={{ marginTop: '24px', marginBottom: '24px' }}
                />
              ) : (
                <List
                  dataSource={recentIncidents}
                  size="small"
                  renderItem={(incident) => (
                    <List.Item
                      style={{ paddingLeft: 0, paddingRight: 0, cursor: 'pointer' }}
                      onClick={() => navigateToRoute?.('incidents')}
                    >
                      <List.Item.Meta
                        avatar={getSeverityIcon(incident.severity)}
                        title={
                          <Text ellipsis style={{ fontSize: '13px' }}>
                            {incident.title || incident.name || 'Untitled'}
                          </Text>
                        }
                        description={
                          <Space size={4} style={{ fontSize: '11px' }}>
                            <Tag color={getStatusColor(incident.status)}>
                              {incident.status || 'Unknown'}
                            </Tag>
                            <Text type="secondary">
                              {incident.severity || 'N/A'}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </GlassCard>
          </Col>

          {/* Recent Change Requests */}
          <Col xs={24} lg={12}>
            <GlassCard variant="default" elevation={2} title="Pending Approvals" size="small">
              {loading ? (
                <Spin />
              ) : recentChangeRequests.filter(cr => (cr.approval_status || '').toLowerCase() === 'pending').length === 0 ? (
                <Empty
                  description="No pending approvals"
                  style={{ marginTop: '24px', marginBottom: '24px' }}
                />
              ) : (
                <List
                  dataSource={recentChangeRequests.filter(cr => (cr.approval_status || '').toLowerCase() === 'pending')}
                  size="small"
                  renderItem={(cr) => (
                    <List.Item
                      style={{ paddingLeft: 0, paddingRight: 0, cursor: 'pointer' }}
                      onClick={() => navigateToRoute?.('change-requests')}
                    >
                      <List.Item.Meta
                        avatar={<FileTextOutlined style={{ color: token.colorWarning }} />}
                        title={
                          <Text ellipsis style={{ fontSize: '13px' }}>
                            {cr.title || cr.name || 'Untitled'}
                          </Text>
                        }
                        description={
                          <Space size={4} style={{ fontSize: '11px' }}>
                            <Tag color="warning">Pending</Tag>
                            <Text type="secondary">
                              {cr.requested_by || 'N/A'}
                            </Text>
                          </Space>
                        }
                      />
                    </List.Item>
                  )}
                />
              )}
            </GlassCard>
          </Col>
        </Row>
      </div>
    </div>
  )
}

export default Dashboard
