import React, { useEffect, useState } from 'react'
import { Card, Row, Col, Statistic, Progress, Tag, Space, Table, Avatar, Tooltip, Alert, Spin, Empty, Button, message, Typography } from 'antd'
import { CheckCircleOutlined, ExclamationCircleOutlined, TeamOutlined, FileTextOutlined, ReloadOutlined, DownloadOutlined } from '@ant-design/icons'
import api from '../services/api'

const { Text, Title } = Typography

/**
 * StakeholderSprintReport Component
 * 
 * Displays a simplified, executive-level sprint report focused on:
 * - Sprint overview and progress
 * - Issue counts and status distribution
 * - Story points summary
 * - Team workload distribution
 * - Sprint health indicators
 */
function StakeholderSprintReport({ projectId, projectName, onClose }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(null)

  const load = async (forceRefresh = false) => {
    if (!projectId) return

    setLoading(true)
    setError(null)
    try {
      const res = await api.zenhub.getStakeholderSprintReport(projectId, forceRefresh)
      setData(res)
      if (forceRefresh) {
        message.success('Sprint report refreshed successfully')
      }
    } catch (e) {
      setError(e?.message || 'Failed to load sprint report')
      message.error('Failed to load sprint report')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId])

  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
        <Spin size="large" />
      </div>
    )
  }

  if (error) {
    return <Alert type="error" message="Failed to load sprint report" description={String(error)} showIcon />
  }

  if (!data || !data.sprints || data.sprints.length === 0) {
    return <Empty description="No sprints found for this project" />
  }

  const sprint = data.sprints[0] // Show first sprint
  if (!sprint) return <Empty description="No sprint data available" />

  // Determine health status color
  const getHealthColor = (status) => {
    if (status === 'on_track') return 'success'
    if (status === 'at_risk') return 'warning'
    return 'error'
  }

  // Determine progress status
  const getProgressStatus = (percentage) => {
    if (percentage >= 75) return 'success'
    if (percentage >= 50) return 'normal'
    if (percentage >= 25) return 'active'
    return 'exception'
  }

  return (
    <Space direction="vertical" size={20} style={{ width: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <Title level={4} style={{ margin: 0 }}>{sprint.sprint_name}</Title>
          <Text type="secondary">
            {sprint.start_date} to {sprint.end_date}
          </Text>
        </div>
        <Space>
          <Tag color={getHealthColor(sprint.health_status)}>
            {sprint.health_status?.toUpperCase().replace('_', ' ')}
          </Tag>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => load(true)}
            disabled={loading}
            size="small"
          >
            Refresh
          </Button>
        </Space>
      </div>

      {/* Sprint Progress */}
      <Card title="Sprint Progress" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Progress"
              value={sprint.progress_percentage || 0}
              suffix="%"
              valueStyle={{ color: '#1677ff' }}
            />
            <Progress
              percent={Math.round(sprint.progress_percentage || 0)}
              status={getProgressStatus(sprint.progress_percentage)}
              style={{ marginTop: 8 }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Completion"
              value={sprint.completion_percentage || 0}
              suffix="%"
              valueStyle={{ color: '#52c41a' }}
            />
            <Progress
              percent={Math.round(sprint.completion_percentage || 0)}
              status="success"
              style={{ marginTop: 8 }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Blocked Rate"
              value={sprint.health_indicators?.blocked_rate || 0}
              suffix="%"
              valueStyle={{ color: sprint.health_indicators?.blocked_rate > 20 ? '#ff4d4f' : '#1677ff' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Team Utilization"
              value={sprint.health_indicators?.team_utilization || 0}
              suffix="%"
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
        </Row>
      </Card>

      {/* Issue Summary */}
      <Card title="Issue Summary" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="Total Issues"
              value={sprint.total_issues || 0}
              valueStyle={{ color: '#1677ff' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="Done"
              value={sprint.issues_by_status?.done || 0}
              valueStyle={{ color: '#52c41a' }}
              prefix={<CheckCircleOutlined />}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="In Progress"
              value={sprint.issues_by_status?.in_progress || 0}
              valueStyle={{ color: '#1677ff' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="In Review"
              value={sprint.issues_by_status?.in_review || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="To Do"
              value={sprint.issues_by_status?.to_do || 0}
              valueStyle={{ color: '#8c8c8c' }}
            />
          </Col>
          <Col xs={24} sm={12} md={4}>
            <Statistic
              title="Blocked"
              value={sprint.issues_by_status?.blocked || 0}
              valueStyle={{ color: '#ff4d4f' }}
              prefix={<ExclamationCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Story Points */}
      <Card title="Story Points" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Total Planned"
              value={sprint.total_story_points || 0}
              valueStyle={{ color: '#1677ff' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Completed"
              value={sprint.completed_story_points || 0}
              valueStyle={{ color: '#52c41a' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Remaining"
              value={sprint.remaining_story_points || 0}
              valueStyle={{ color: '#faad14' }}
            />
          </Col>
          <Col xs={24} sm={12} md={6}>
            <Statistic
              title="Unique Epics"
              value={sprint.unique_epics || 0}
              valueStyle={{ color: '#722ed1' }}
              prefix={<FileTextOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Team Workload */}
      {sprint.team_members && sprint.team_members.length > 0 && (
        <Card title="Team Workload Distribution" size="small">
          <Table
            rowKey={(r) => r.id}
            dataSource={sprint.team_members}
            pagination={false}
            size="small"
            columns={[
              {
                title: 'Team Member',
                dataIndex: 'name',
                key: 'name',
                render: (v, r) => (
                  <Space>
                    <Avatar style={{ backgroundColor: '#1677ff' }}>
                      {(v || '?').slice(0, 2).toUpperCase()}
                    </Avatar>
                    <div>
                      <Text strong>{v}</Text>
                      {r.login && <br />}
                      {r.login && <Text type="secondary" style={{ fontSize: '12px' }}>@{r.login}</Text>}
                    </div>
                  </Space>
                )
              },
              {
                title: 'Tickets',
                dataIndex: 'ticket_count',
                key: 'ticket_count',
                width: 80,
                render: (v) => <Tag color="blue">{v}</Tag>
              },
              {
                title: 'Completed',
                dataIndex: 'completed_tickets',
                key: 'completed_tickets',
                width: 100,
                render: (v) => <Tag color="green">{v}</Tag>
              },
              {
                title: 'Workload',
                dataIndex: 'workload_percentage',
                key: 'workload_percentage',
                width: 150,
                render: (v) => (
                  <Space>
                    <Text>{v?.toFixed ? v.toFixed(1) : v}%</Text>
                    <Progress percent={Math.round(v || 0)} size="small" style={{ width: 80 }} />
                  </Space>
                )
              }
            ]}
          />
        </Card>
      )}

      {/* Health Indicators */}
      <Card title="Sprint Health Indicators" size="small">
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} md={8}>
            <div style={{ textAlign: 'center', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
              <Text type="secondary">Completion Rate</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#52c41a' }}>
                {sprint.health_indicators?.completion_rate?.toFixed(1) || 0}%
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ textAlign: 'center', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
              <Text type="secondary">Blocked Rate</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: sprint.health_indicators?.blocked_rate > 20 ? '#ff4d4f' : '#1677ff' }}>
                {sprint.health_indicators?.blocked_rate?.toFixed(1) || 0}%
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12} md={8}>
            <div style={{ textAlign: 'center', padding: '16px', border: '1px solid #f0f0f0', borderRadius: '4px' }}>
              <Text type="secondary">Team Utilization</Text>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginTop: '8px', color: '#faad14' }}>
                {sprint.health_indicators?.team_utilization?.toFixed(1) || 0}%
              </div>
            </div>
          </Col>
        </Row>
      </Card>
    </Space>
  )
}

export default StakeholderSprintReport

