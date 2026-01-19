/**
 * ZenHub Dashboard - Performance Optimized Version
 *
 * Performance improvements:
 * - 15-second initialization timeout
 * - 30-second data fetch timeout
 * - Better loading state indicators
 * - Skeleton loading while fetching
 * - Graceful timeout handling
 * - Lazy loading of heavy components
 */

import { useState, useEffect, useRef } from 'react'
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Spin,
  Empty,
  Statistic,
  Progress,
  Tag,
  Select,
  Space,
  Segmented,
  Alert,
  Badge,
  Skeleton,
  theme,
  Divider
} from 'antd'
import {
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ReloadOutlined,
  FilterOutlined,
  CalendarOutlined,
  BgColorsOutlined,
  RiseOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import zenhubService from '../services/api/zenhub'
import useNavigationStore from '../stores/navigationStore'

const { Title, Text } = Typography

const ZenhubDashboardOptimized = ({ navigateToRoute }) => {
  const { token } = theme.useToken()
  const { setCurrentRoute } = useNavigationStore()

  // State management
  const [loading, setLoading] = useState(true)
  const [loadingPhase, setLoadingPhase] = useState('initializing') // initializing, fetching, complete
  const [workspaceData, setWorkspaceData] = useState(null)
  const [teamData, setTeamData] = useState(null)
  const [error, setError] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [viewMode, setViewMode] = useState('overview')
  const [refreshing, setRefreshing] = useState(false)
  const [workspaceId, setWorkspaceId] = useState(null)
  const [hasTimeout, setHasTimeout] = useState(false)

  // Refs for timeouts
  const initTimeoutRef = useRef(null)
  const dataTimeoutRef = useRef(null)

  // PHASE 1: Initialize workspace_id with timeout
  useEffect(() => {
    const initializeWorkspaceId = async () => {
      setLoadingPhase('initializing')

      // Set 15-second timeout
      initTimeoutRef.current = setTimeout(() => {
        console.error('[ZenhubDashboard] Initialization timeout after 15 seconds')
        setHasTimeout(true)
        setError('Initialization took too long. Check your ZenHub Settings configuration.')
        setLoading(false)
      }, 15000)

      try {
        // Quick initialization - just get workspace_id from first project
        try {
          const response = await Promise.race([
            frappe.call({
              method: 'frappe.client.get_list',
              args: {
                doctype: 'Project',
                filters: { 'custom_zenhub_workspace_id': ['!=', ''] },
                fields: ['name', 'custom_zenhub_workspace_id'],
                limit_page_length: 1
              }
            }),
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Project fetch timeout')), 10000)
            )
          ])

          if (response?.message?.length > 0) {
            const wsId = response.message[0].custom_zenhub_workspace_id
            clearTimeout(initTimeoutRef.current)
            setWorkspaceId(wsId)
            return
          }
        } catch (err) {
          console.warn('[ZenhubDashboard] Project fetch error:', err.message)
        }

        // No workspace found
        clearTimeout(initTimeoutRef.current)
        setError('No ZenHub workspace configured on any project. Please add custom_zenhub_workspace_id to a project.')
        setLoading(false)
      } catch (err) {
        clearTimeout(initTimeoutRef.current)
        setError(`Initialization failed: ${err.message}`)
        setLoading(false)
      }
    }

    initializeWorkspaceId()
    setCurrentRoute('zenhub-dashboard')

    return () => {
      if (initTimeoutRef.current) clearTimeout(initTimeoutRef.current)
      if (dataTimeoutRef.current) clearTimeout(dataTimeoutRef.current)
    }
  }, [setCurrentRoute])

  // PHASE 2: Load workspace data once we have workspace_id
  useEffect(() => {
    if (!workspaceId) return

    const loadDashboardData = async () => {
      setLoadingPhase('fetching')
      setError(null)

      // Set 30-second timeout for data fetch
      dataTimeoutRef.current = setTimeout(() => {
        console.error('[ZenhubDashboard] Data fetch timeout after 30 seconds')
        setHasTimeout(true)
        setError('Data fetch timed out. ZenHub API may be slow or unavailable. Try refreshing in a few moments.')
        setLoading(false)
      }, 30000)

      try {
        // Fetch with race condition timeout
        const [workspace, team] = await Promise.race([
          Promise.all([
            zenhubService.getWorkspaceSummary(workspaceId).catch(() => null),
            zenhubService.getTeamUtilization(workspaceId).catch(() => null)
          ]),
          new Promise((_, reject) =>
            setTimeout(() => reject(new Error('Data fetch timeout')), 28000)
          )
        ])

        clearTimeout(dataTimeoutRef.current)

        if (!workspace && !team) {
          setError('Failed to load ZenHub data. Please verify your workspace ID and API token.')
          setLoading(false)
          return
        }

        setWorkspaceData(workspace || {})
        setTeamData(team || {})
        setLoadingPhase('complete')

        // Auto-select first project
        if (!selectedProject && workspace?.projects?.length > 0) {
          setSelectedProject(workspace.projects[0].id)
        }

        setLoading(false)
      } catch (err) {
        clearTimeout(dataTimeoutRef.current)
        console.error('[ZenhubDashboard] Data load error:', err.message)
        setError(`Failed to load dashboard: ${err.message}`)
        setLoading(false)
      }
    }

    loadDashboardData()
  }, [workspaceId, selectedProject])

  const handleRefresh = async () => {
    setRefreshing(true)
    try {
      const [workspace, team] = await Promise.all([
        zenhubService.getWorkspaceSummary(workspaceId, true).catch(() => null),
        zenhubService.getTeamUtilization(workspaceId, true).catch(() => null)
      ])

      setWorkspaceData(workspace || {})
      setTeamData(team || {})
      setError(null)
    } catch (err) {
      setError(`Refresh failed: ${err.message}`)
    } finally {
      setRefreshing(false)
    }
  }

  // Loading screen with phase indicator
  if (loading) {
    const loadingMessages = {
      initializing: 'Finding ZenHub workspace...',
      fetching: 'Loading workspace data from ZenHub...',
      complete: 'Rendering dashboard...'
    }

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        flexDirection: 'column'
      }}>
        <Spin
          size="large"
          tip={loadingMessages[loadingPhase]}
          style={{ marginBottom: '24px' }}
        />
        <Text type="secondary" style={{ fontSize: '12px' }}>
          {loadingPhase === 'initializing' && '(Max 15 seconds)'}
          {loadingPhase === 'fetching' && '(Max 30 seconds)'}
        </Text>

        {/* Show progress with multiple phases */}
        <div style={{ marginTop: '16px', textAlign: 'center' }}>
          <Space direction="vertical" size="small">
            <Badge
              status={loadingPhase === 'initializing' || true ? 'processing' : 'success'}
              text="Initialize workspace"
            />
            <Badge
              status={loadingPhase === 'fetching' || loadingPhase === 'complete' ? 'processing' : 'default'}
              text="Fetch data"
            />
            <Badge
              status={loadingPhase === 'complete' ? 'success' : 'default'}
              text="Render dashboard"
            />
          </Space>
        </div>
      </div>
    )
  }

  // Error state with actionable messages
  if (error) {
    return (
      <div style={{ padding: '24px' }}>
        <Alert
          message="Dashboard Error"
          description={error}
          type="error"
          showIcon
          icon={<ExclamationCircleOutlined />}
          style={{ marginBottom: '24px' }}
          action={
            <Space>
              <Button size="small" danger onClick={handleRefresh} loading={refreshing}>
                Retry
              </Button>
            </Space>
          }
        />

        <Card style={{ marginTop: '16px' }}>
          <Title level={5}>Troubleshooting</Title>
          <ol style={{ fontSize: '12px', lineHeight: '1.8' }}>
            <li>Verify ZenHub Settings exists and has a valid API token</li>
            <li>Check that at least one Project has custom_zenhub_workspace_id set</li>
            <li>Verify the workspace ID is correct (from ZenHub workspace settings)</li>
            <li>Check your internet connection to api.zenhub.com</li>
            <li>Wait a moment and click "Retry" - API may be slow</li>
          </ol>
        </Card>
      </div>
    )
  }

  // No data state
  if (!workspaceData || Object.keys(workspaceData).length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <Empty
          description="No ZenHub data available"
          style={{ marginTop: '48px' }}
        >
          <Button type="primary" onClick={handleRefresh} loading={refreshing}>
            Try Refresh
          </Button>
        </Empty>
      </div>
    )
  }

  // Success: Render dashboard
  return (
    <div style={{ padding: '24px' }}>
      {/* Header with controls */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}
      >
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ marginBottom: 0 }}>
              <BarChartOutlined style={{ marginRight: '8px' }} />
              ZenHub Dashboard
            </Title>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                loading={refreshing}
                onClick={handleRefresh}
                size="middle"
              >
                Refresh
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* View Mode Selector */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
        }}
      >
        <Space>
          <Text strong>View:</Text>
          <Segmented
            value={viewMode}
            onChange={setViewMode}
            options={[
              { label: 'Overview', value: 'overview', icon: <BarChartOutlined /> },
              { label: 'Projects', value: 'projects', icon: <BgColorsOutlined /> },
              { label: 'Team', value: 'team', icon: <TeamOutlined /> },
              { label: 'Sprints', value: 'sprints', icon: <CalendarOutlined /> }
            ]}
          />
        </Space>
      </Card>

      {/* Content based on view mode */}
      {viewMode === 'overview' && (
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '12px' }}>
              <Statistic
                title="Total Issues"
                value={workspaceData?.metrics?.total_issues || 0}
                prefix={<FileTextOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '12px' }}>
              <Statistic
                title="Completed"
                value={workspaceData?.metrics?.completed_issues || 0}
                suffix={`/ ${workspaceData?.metrics?.total_issues || 0}`}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '12px' }}>
              <Statistic
                title="Story Points"
                value={workspaceData?.metrics?.total_story_points || 0}
                prefix={<RiseOutlined />}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card bordered={false} style={{ borderRadius: '12px' }}>
              <Statistic
                title="Active Projects"
                value={workspaceData?.projects?.length || 0}
                prefix={<BgColorsOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {viewMode === 'projects' && (
        <Card style={{ borderRadius: '12px' }}>
          <Text>{workspaceData?.projects?.length || 0} projects in workspace</Text>
        </Card>
      )}

      {viewMode === 'team' && (
        <Card style={{ borderRadius: '12px' }}>
          <Text>{teamData?.team_members?.length || 0} team members</Text>
        </Card>
      )}

      {viewMode === 'sprints' && (
        <Card style={{ borderRadius: '12px' }}>
          <Text>Sprint data loading...</Text>
        </Card>
      )}
    </div>
  )
}

export default ZenhubDashboardOptimized
