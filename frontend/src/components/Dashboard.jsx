import { useState, useEffect } from 'react'
import {
  Row,
  Col,
  Card,
  Progress,
  Tag,
  Typography,
  theme,
  Collapse,
  Steps,
  Modal,
  Upload,
  Input,
  Button,
  Space,
  Divider,
  Spin,
  List
} from 'antd'
import {
  ProjectOutlined,
  TeamOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  UserOutlined,
  BarChartOutlined,
  SafetyOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  BellOutlined,
  DownOutlined,
  UpOutlined,
  PaperClipOutlined,
  MessageOutlined,
  UploadOutlined,
  SendOutlined,
  SearchOutlined,
  ClearOutlined,
  FilterOutlined,
  ApiOutlined
} from '@ant-design/icons'
import { Line, Column, Pie, Area, Gauge } from '@ant-design/plots'

import { useResponsive, getResponsiveGrid } from '../hooks/useResponsive'
import api from '../services/api'

import { getDashboardData, getProjectDetails, getProjectsWithTasks } from '../utils/erpnextApiUtils'
import ProjectDetail from './ProjectDetail'
import TaskTypeTasksModal from './TaskTypeTasksModal'
import SprintReportDialog from './SprintReportDialog'

const { Title, Text } = Typography

// Mock data - ERPNext Project structure
const mockData = {
  success: true,
  metrics: {
    total_projects: 6,
    active_projects: 4,
    total_tasks: 187,
    completed_tasks: 134,
    average_completion: 71.7,
    team_capacity: 89,
    completion_rate: 71.7
  },
  projects: [
    {
      id: 'PROJ-001',
      name: 'ePrescription System',
      project_name: 'ePrescription System',
      project_status: 'Open',
      client: 'Ministry of Health',
      customer: 'Ministry of Health',
      project_type: 'Healthcare',
      priority: 'High',
      progress: 72,
      current_phase: 'Security Testing',
      task_count: 45,
      completed_tasks: 32,
      completion_rate: 71.1,
      delivery_phases: [
        { section_name: 'Planning', section_status: 'complete', section_progress: 100, section_order: 1, task_count: 8, completed_tasks: 8 },
        { section_name: 'Development', section_status: 'complete', section_progress: 100, section_order: 2, task_count: 15, completed_tasks: 15 },
        { section_name: 'Security Review', section_status: 'complete', section_progress: 100, section_order: 3, task_count: 6, completed_tasks: 6 },
        { section_name: 'Testing', section_status: 'in_progress', section_progress: 60, section_order: 4, task_count: 10, completed_tasks: 6 },
        { section_name: 'Security Testing', section_status: 'in_progress', section_progress: 25, section_order: 5, task_count: 4, completed_tasks: 1 },
        { section_name: 'Deployment', section_status: 'pending', section_progress: 0, section_order: 6, task_count: 2, completed_tasks: 0 }
      ]
    },
    {
      id: 'PROJ-002',
      name: 'Facility360 eLicensing',
      project_name: 'Facility360 eLicensing',
      project_status: 'Open',
      client: 'Kenya Medical Board',
      customer: 'Kenya Medical Board',
      project_type: 'Government',
      priority: 'Medium',
      progress: 56,
      current_phase: 'Development',
      task_count: 38,
      completed_tasks: 21,
      completion_rate: 55.3,
      delivery_phases: [
        { section_name: 'Planning', section_status: 'complete', section_progress: 100, section_order: 1, task_count: 6, completed_tasks: 6 },
        { section_name: 'Requirements Analysis', section_status: 'complete', section_progress: 100, section_order: 2, task_count: 8, completed_tasks: 8 },
        { section_name: 'Design', section_status: 'complete', section_progress: 100, section_order: 3, task_count: 5, completed_tasks: 5 },
        { section_name: 'Development', section_status: 'in_progress', section_progress: 45, section_order: 4, task_count: 12, completed_tasks: 5 },
        { section_name: 'Security Review', section_status: 'pending', section_progress: 0, section_order: 5, task_count: 4, completed_tasks: 0 },
        { section_name: 'Testing', section_status: 'pending', section_progress: 0, section_order: 6, task_count: 3, completed_tasks: 0 }
      ]
    }
  ],
  teamUtilization: {
    average: 89,
    members: 10,
    overCapacity: 2,
    individuals: [
      { name: 'Grace Wanjiku', utilization: 92 },
      { name: 'James Mwangi', utilization: 88 },
      { name: 'Amina Kiptoo', utilization: 84 },
      { name: 'Peter Otieno', utilization: 81 },
      { name: 'Samuel Kipchoge', utilization: 77 },
      { name: 'Faith Achieng', utilization: 74 }
    ]
  },
  deliveryLifecycle: [
    'Business Development',
    'Product Design Documentation',
    'Secure Architecture',
    'Secure Design',
    'ATB (Authority to Begin)',
    'Environment Setup',
    'Development Planning',
    'Secure Development',
    'QA',
    'ATO (Authority to Operate)',
    'Deployment',
    'Operations & Support'
  ]
}



function Dashboard({ navigateToRoute, showProjectDetail, selectedProjectId, viewMode = 'metrics', initialDashboardData = null }) {
  const { token } = theme.useToken()
  const { isMobile, currentBreakpoint } = useResponsive()
  const gridConfig = getResponsiveGrid(currentBreakpoint)

  // API data state
  const [dashboardData, setDashboardData] = useState(mockData)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [projectDetailsCache, setProjectDetailsCache] = useState({})

  // State management for enhanced features - Initialize all projects as collapsed
  const [projectCollapsed, setProjectCollapsed] = useState({})
  const [sprintModalVisible, setSprintModalVisible] = useState(false)
  const [selectedStep, setSelectedStep] = useState(null)
  // Sprint Report Dialog state
  const [sprintDialogOpen, setSprintDialogOpen] = useState(false)
  const [sprintDialogProjectId, setSprintDialogProjectId] = useState(null)
  const [sprintDialogProjectName, setSprintDialogProjectName] = useState('')
  const [projectComments, setProjectComments] = useState({})
  const [projectFiles, setProjectFiles] = useState({})
  // New DevSecOps metrics state
  const [crStats, setCrStats] = useState({ approved: 0, rejected: 0, pending: 0, avgApprovalHrs: 0 })
  const [incStats, setIncStats] = useState({ severity: { Critical: 0, High: 0, Medium: 0, Low: 0 }, open: 0, closed: 0, avgResolutionHrs: 0 })
  const [appStats, setAppStats] = useState({ active: 0, deployments14d: 0, successRate: 0 })
  const [apiStats, setApiStats] = useState({ collections: 0, endpoints: 0, passed: 0, failed: 0 })
  const [activity, setActivity] = useState([])
  const [deployTrend, setDeployTrend] = useState([])

  // Task Type grouped summaries per project and modal state
  const [taskTypeSummaryMap, setTaskTypeSummaryMap] = useState({})
  const [tasksModal, setTasksModal] = useState({ open: false, loading: false, projectId: null, taskType: null, tasks: [], projectName: '' })

  // Search/Filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [filteredProjects, setFilteredProjects] = useState([])

  // Search/Filter functionality
  const filterProjects = (projects, query) => {
    if (!query.trim()) {
      return projects
    }

    const searchTerm = query.toLowerCase().trim()

    return projects.filter(project => {
      // Search in project name
      const projectName = (project.name || project.project_name || '').toLowerCase()

      // Search in client name
      const clientName = (project.client || project.company_name || '').toLowerCase()

      // Search in current phase
      const currentPhase = (project.current_phase || project.currentPhase || '').toLowerCase()

      // Search in status
      const status = (project.status || '').toLowerCase()

      return projectName.includes(searchTerm) ||
             clientName.includes(searchTerm) ||
             currentPhase.includes(searchTerm) ||
             status.includes(searchTerm)
    })
  }

  // Handle search input change
  const handleSearchChange = (e) => {
    const query = e.target.value
    setSearchQuery(query)

    const projects = dashboardData?.projects || []
    const filtered = filterProjects(projects, query)
    setFilteredProjects(filtered)
  }

  // Clear search
  const clearSearch = () => {
    setSearchQuery('')
    setFilteredProjects(dashboardData?.projects || [])
  }

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event) => {
      // Ctrl/Cmd + K to focus search
      if ((event.ctrlKey || event.metaKey) && event.key === 'k') {
        event.preventDefault()
        const searchInput = document.querySelector('input[placeholder*="Search projects"]')
        if (searchInput) {
          searchInput.focus()
        }
      }

      // Escape to clear search
      if (event.key === 'Escape' && searchQuery) {
        clearSearch()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [searchQuery])

  // Handle sprint report button click
  const handleStepClick = (project, stepIndex) => {
    setSelectedStep({
      name: project.name || 'Project Sprint Report',
      status: project.project_status || project.status || 'active',
      index: stepIndex,
      task_count: project.total_tasks || 0,
      completed_tasks: project.completed_tasks || 0,
      progress: project.progress || 0,
      totalSteps: project.delivery_phases?.length || 8
    })
    // Open new Sprint Report Dialog (Zenhub)
    setSprintDialogProjectId(project.id || project.name)
    setSprintDialogProjectName(project.name || '')
    setSprintDialogOpen(true)
    // Do not open legacy modal
    setSprintModalVisible(false)
  }

  // Handle file upload for specific project
  const handleUpload = (projectId, info) => {
    setProjectFiles(prev => ({
      ...prev,
      [projectId]: info.fileList
    }))
  }

  // Handle comment submission for specific project
  const handleCommentSubmit = (projectId) => {
    const comment = projectComments[projectId]
    if (comment?.trim()) {
      console.log('Comment submitted for project', projectId, ':', comment)
      setProjectComments(prev => ({
        ...prev,
        [projectId]: ''
      }))
      // Here you would typically send the comment to an API
    }
  }

  // Load Task Type summary for a project (idempotent)
  const loadSummaryForProject = async (projectId) => {
    if (taskTypeSummaryMap[projectId]) {
      return
    }

    try {
      const res = await api.projects.getTaskTypeSummary(projectId)

      if (res?.success) {
        setTaskTypeSummaryMap(prev => {
          const updated = { ...prev, [projectId]: res.data || [] }
          return updated
        })
      }
    } catch (e) {
      console.error('[Dashboard] Failed to load task type summary for', projectId, ':', e)
    }
  }

  // Click Task Type to open modal with tasks
  const handleTaskTypeClick = async (project, group) => {
    setTasksModal({ open: true, loading: true, projectId: project.id, taskType: group.taskType || group.name, tasks: [], projectName: project.name })
    try {
      const res = await api.projects.getTasksByType(project.id, group.taskType || group.name)
      setTasksModal(prev => ({ ...prev, loading: false, tasks: res?.data || [] }))
    } catch (e) {
      console.error('Failed to load tasks by type', e)
      setTasksModal(prev => ({ ...prev, loading: false }))
    }
  }

  // Toggle project collapse state
  const toggleProjectCollapse = (projectId) => {
    setProjectCollapsed(prev => {
      const next = !prev[projectId]
      const newState = { ...prev, [projectId]: next }

      if (!next) {
        // expanded -> load summary lazily
        setTimeout(() => loadSummaryForProject(projectId), 0)
      }
      return newState
    })
  }

  // Initialize project collapsed state when data changes
  const initializeProjectCollapsedState = (projects) => {
    const initialState = {}
    projects.forEach(project => {
      initialState[project.id] = true // true means collapsed
    })
    setProjectCollapsed(initialState)
  }

  // Initialize from injected data (for tests/components) or fetch from API
  useEffect(() => {
    if (initialDashboardData) {
      try {
        setDashboardData(initialDashboardData)
        if (initialDashboardData.projects) initializeProjectCollapsedState(initialDashboardData.projects)
      } finally {
        setLoading(false)
      }
      return
    }

    const fetchData = async () => {
      try {
        setLoading(true)
        setError(null)

        // Use the new ERPNext-integrated API
        const response = await getDashboardData()

        if (response.success) {
          // Transform ERPNext data to dashboard format
          const metrics = response.metrics || {}
          const transformedData = {
            success: true,
            metrics: {
              activeProjects: metrics.active_projects || metrics.total_projects || 0,
              totalTasks: metrics.total_tasks || 0,
              completedTasks: metrics.completed_tasks || 0,
              teamCapacity: metrics.team_capacity || 85,
              completionRate: metrics.completion_rate || metrics.average_completion || 0,
              // Additional ERPNext metrics
              totalProjects: metrics.total_projects || 0,
              averageCompletion: metrics.average_completion || 0
            },
            projects: response.projects || [],
            lifecycle_phases: response.lifecycle_phases || [],
            teamUtilization: {
              average: metrics.team_capacity || 85,
              members: 12, // This would come from actual team data in ERPNext
              overCapacity: Math.max(0, Math.ceil((metrics.team_capacity || 85) - 80) / 10),
              individuals: [
                { name: 'John Doe', utilization: 95 },
                { name: 'Jane Smith', utilization: 87 },
                { name: 'Mike Johnson', utilization: 103 },
                { name: 'Sarah Wilson', utilization: 78 }
              ]
            },
            // Use ERPNext Task Types as delivery lifecycle, fallback to default
            deliveryLifecycle: (response.lifecycle_phases || []).map(phase => phase.name).length > 0
              ? (response.lifecycle_phases || []).map(phase => phase.name)
              : [
                  'Planning',
                  'Requirements Analysis',
                  'Design',
                  'Development',
                  'Security Review',
                  'Testing',
                  'Security Testing',
                  'Deployment',
                  'Monitoring'
                ],
            timestamp: response.timestamp
          }
          setDashboardData(transformedData)
        } else {
          throw new Error(response.error || 'Failed to fetch projects data')
        }

        // Initialize collapsed state for projects
        if (response.projects && Array.isArray(response.projects)) {
          initializeProjectCollapsedState(response.projects)
        }
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err)
        setError(err.message)

        // Fallback to old API
        try {
          const fallbackData = await getDashboardData()
          setDashboardData(fallbackData)
          if (fallbackData.projects) {
            initializeProjectCollapsedState(fallbackData.projects)
          }
  // Fetch data for new DevSecOps metrics dashboard
  useEffect(() => {
    let mounted = true
    const toDate = (d) => {
      if (!d) return null
      try { return new Date(d) } catch { return null }
    }

    const compute = async () => {
      try {
        const [crRes, incRes, appRes, swRes] = await Promise.all([
          api.changeRequests.getChangeRequests(),
          api.incidents.getIncidents(),
          api.applications.getApplications(),
          api.swaggerCollections.getSwaggerCollections()
        ])


        if (!mounted) return

        const crs = crRes?.data || []
        const approved = crs.filter(c => (c.status || '').toLowerCase().includes('approved')).length
        const rejected = crs.filter(c => (c.status || '').toLowerCase().includes('rejected')).length
        const pending = crs.filter(c => !(c.status || '').toLowerCase().includes('approved') && !(c.status || '').toLowerCase().includes('rejected')).length
        const approvedWithDates = crs.filter(c => c.approvalDate && c.requestDate)
        const avgApprovalHrs = approvedWithDates.length
          ? Math.round(approvedWithDates
              .map(c => (toDate(c.approvalDate) - toDate(c.requestDate)) / 36e5)
              .filter(v => Number.isFinite(v) && v >= 0)
              .reduce((a,b)=>a+b,0) / approvedWithDates.length)
          : 0
        setCrStats({ approved, rejected, pending, avgApprovalHrs })

        const incs = incRes?.data || []
        const severity = { Critical: 0, High: 0, Medium: 0, Low: 0 }
        incs.forEach(i => { const s = (i.severity || '').toLowerCase();
          if (s === 'critical') severity.Critical++
          else if (s === 'high') severity.High++
          else if (s === 'medium') severity.Medium++
          else severity.Low++
        })
        const open = incs.filter(i => (i.status || '').toLowerCase() !== 'closed').length
        const closed = incs.filter(i => (i.status || '').toLowerCase() === 'closed').length
        const closedWithDates = incs.filter(i => (i.status || '').toLowerCase() === 'closed' && i.reportedDate && i.updatedDate)
        const avgResolutionHrs = closedWithDates.length
          ? Math.round(closedWithDates
              .map(i => (toDate(i.updatedDate) - toDate(i.reportedDate)) / 36e5)
              .filter(v => Number.isFinite(v) && v >= 0)
              .reduce((a,b)=>a+b,0) / closedWithDates.length)
          : 0
        setIncStats({ severity, open, closed, avgResolutionHrs })

        const apps = appRes?.data || []
        const active = apps.filter(a => (a.status || '').toLowerCase() === 'active').length
        const now = new Date()
        const past14 = new Date(now.getTime() - 14*24*3600*1000)
        let totalDeploys = 0
        let successDeploys = 0
        apps.forEach(a => (a.deploymentHistory || []).forEach(d => {
          const dt = toDate(d.date)
          if (dt && dt >= past14) totalDeploys++
          if ((d.status || '').toLowerCase() === 'success') successDeploys++
        }))
        const successRate = totalDeploys > 0 ? Math.round((successDeploys/totalDeploys)*100) : 0
        setAppStats({ active, deployments14d: totalDeploys, successRate })

        // Build deployment trend for last 14 days
        const trendMap = new Map()
        for (let i = 13; i >= 0; i--) {
          const dt = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
          const key = dt.toISOString().slice(0, 10)
          trendMap.set(key, 0)
        }
        apps.forEach(a => (a.deploymentHistory || []).forEach(d => {
          const dt = toDate(d.date)
          if (dt && dt >= past14) {
            const key = dt.toISOString().slice(0, 10)
            trendMap.set(key, (trendMap.get(key) || 0) + 1)
          }
        }))
        const deployTrendArr = Array.from(trendMap.entries()).map(([date, value]) => ({ date, value }))
        setDeployTrend(deployTrendArr)


        const sw = swRes?.data || []
        const collections = sw.length
        const endpoints = sw.reduce((sum, c) => sum + ((c.endpoints || []).length), 0)
        const passed = sw.filter(c => (c.testStatus || '').toLowerCase() === 'passed').length
        const failed = sw.filter(c => (c.testStatus || '').toLowerCase() === 'failed').length
        setApiStats({ collections, endpoints, passed, failed })

        // Activity feed
        const activityItems = []
        apps.forEach(a => (a.deploymentHistory || []).slice(-3).forEach(d => {
          activityItems.push({
            date: toDate(d.date) || new Date(),
            title: `Deployment: ${a.name} ${d.version}`,
            description: `${d.status} • by ${d.deployedBy || 'system'}`
          })
        }))
        crs.forEach(c => {
          if (c.approvalDate) activityItems.push({
            date: toDate(c.approvalDate),
            title: `Change Approved: ${c.title}`,
            description: `Approved by ${c.approvedBy || 'N/A'}`
          })
          else activityItems.push({
            date: toDate(c.requestDate),
            title: `Change Requested: ${c.title}`,
            description: `Requested by ${c.requestedBy || 'N/A'}`
          })
        })
        incs.forEach(i => {
          const last = (i.timeline || [])[ (i.timeline || []).length - 1 ]
          if (last) activityItems.push({
            date: toDate(last.date),
            title: `Incident: ${i.title}`,
            description: `${last.action} • ${last.user}`
          })
        })
        activityItems.sort((a,b) => (b.date||0) - (a.date||0))
        setActivity(activityItems.slice(0, 10))
      } catch (e) {
        console.error('Metrics load failed', e)
      }
    }

    compute()
    return () => { mounted = false }
  }, [])

        } catch (fallbackErr) {
          console.error('Fallback API also failed:', fallbackErr)
          // Keep using mock data as final fallback
        }
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [initialDashboardData])

  // Update filtered projects when dashboard data changes
  useEffect(() => {
    const projects = dashboardData?.projects || []
    const filtered = filterProjects(projects, searchQuery)
    setFilteredProjects(filtered)
  }, [dashboardData, searchQuery])

  // If project detail is requested, show it instead of the dashboard
  if (showProjectDetail && selectedProjectId) {
    return (
      <ProjectDetail
        projectId={selectedProjectId}
        navigateToRoute={navigateToRoute}
      />
    )
  }


  // Chart configs (derived from state)
  const incidentsPieData = [
    { type: 'Critical', value: incStats.severity.Critical },
    { type: 'High', value: incStats.severity.High },
    { type: 'Medium', value: incStats.severity.Medium },
    { type: 'Low', value: incStats.severity.Low },
  ]
  const incidentsPieConfig = {
    data: incidentsPieData,
    angleField: 'value',
    colorField: 'type',
    radius: 0.9,
    legend: false,
    height: 180,
    padding: 0,
    label: { text: 'value', position: 'spider', connector: true },
  }

  const crColumnData = [
    { status: 'Approved', value: crStats.approved },
    { status: 'Rejected', value: crStats.rejected },
    { status: 'Pending', value: crStats.pending },
  ]
  const crColumnConfig = {
    data: crColumnData,
    xField: 'status',
    yField: 'value',
    columnWidthRatio: 0.5,
    height: 180,
    autoFit: true,
  }

  const deploymentsLineConfig = {
    data: deployTrend,
    xField: 'date',
    yField: 'value',
    height: 160,
    autoFit: true,
    smooth: true,
  }

  const deploymentsAreaData = deployTrend.reduce((acc, d, idx) => {
    const cum = (acc[idx - 1]?.cum || 0) + d.value
    acc.push({ date: d.date, cum })
    return acc
  }, [])
  const deploymentsAreaConfig = {
    data: deploymentsAreaData,
    xField: 'date',
    yField: 'cum',
    height: 100,
    autoFit: true,
    smooth: true,
    areaStyle: { fillOpacity: 0.15 },
  }

  const deployGaugeConfig = {
    percent: (appStats.successRate || 0) / 100,
    range: { color: [token.colorError, token.colorWarning, token.colorSuccess] },
    height: 160,
    indicator: { pointer: { style: { stroke: token.colorTextTertiary } }, pin: { style: { stroke: token.colorTextTertiary } } },
    axis: { label: null, subTickLine: null, tickLine: null },
    statistic: { content: { formatter: () => `${appStats.successRate}%` } },
  }

  const apiPassTotal = apiStats.passed + apiStats.failed
  const apiPassRate = apiPassTotal ? Math.round((apiStats.passed / apiPassTotal) * 100) : 0
  const apiGaugeConfig = {
    percent: apiPassRate / 100,
    range: { color: [token.colorError, token.colorWarning, token.colorSuccess] },
    height: 160,
    indicator: { pointer: { style: { stroke: token.colorTextTertiary } }, pin: { style: { stroke: token.colorTextTertiary } } },
    axis: { label: null, subTickLine: null, tickLine: null },
    statistic: { content: { formatter: () => `${apiPassRate}%` } },
  }

  // New DevSecOps Metrics Dashboard (default)
  if (viewMode !== 'projects') {
    return (
    <div style={{ padding: isMobile ? '12px' : '16px', backgroundColor: token.colorBgLayout }}>
      <Row gutter={[16, 16]}>
        <Col xs={24} md={12} lg={6}>
          <Card title={<span><DashboardOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />Change Requests</span>}>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Pending</Text>
              <Text strong>{crStats.pending}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Approved</Text>
              <Text strong>{crStats.approved}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Rejected</Text>
              <Text strong>{crStats.rejected}</Text>
            </Row>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Avg approval time</Text>
              <div style={{ fontWeight: 600 }}>{crStats.avgApprovalHrs} hrs</div>
            </div>
            <Divider style={{ margin: '12px 0' }} />
            {loading ? <Spin /> : <Column {...crColumnConfig} />}
          </Card>
        </Col>

        <Col xs={24} md={12} lg={6}>
          <Card title={<span><SafetyOutlined style={{ color: token.colorWarning, marginRight: 8 }} />Incidents</span>}>
            <Text type="secondary" style={{ fontSize: 12 }}>Open vs Closed</Text>
            <Progress
              percent={(() => { const total = incStats.open + incStats.closed; return total ? Math.round((incStats.closed / total) * 100) : 0 })()}
              status="active"
              showInfo
            />
            <Space size="small" wrap>
              <Tag color="red">Critical: {incStats.severity.Critical}</Tag>
              <Tag color="volcano">High: {incStats.severity.High}</Tag>
              <Tag color="gold">Medium: {incStats.severity.Medium}</Tag>
              <Tag color="blue">Low: {incStats.severity.Low}</Tag>
            </Space>
            <div style={{ marginTop: 8 }}>
              {loading ? <Spin /> : <Pie {...incidentsPieConfig} />}
            </div>
            <div style={{ marginTop: 8 }}>
              <Text type="secondary" style={{ fontSize: 12 }}>Avg resolution time</Text>
              <div style={{ fontWeight: 600 }}>{incStats.avgResolutionHrs} hrs</div>
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={6}>
          <Card title={<span><AppstoreOutlined style={{ color: token.colorSuccess, marginRight: 8 }} />Applications & Releases</span>}>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Active Applications</Text>
              <Text strong>{appStats.active}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Deployments (14d)</Text>
              <Text strong>{appStats.deployments14d}</Text>

            </Row>
            <Text type="secondary" style={{ fontSize: 12 }}>Deployment success rate</Text>
            <Progress percent={appStats.successRate} status="normal" />
            <div style={{ marginTop: 8 }}>
              {loading ? <Spin /> : <>
                <Line {...deploymentsLineConfig} />
                <div style={{ marginTop: 8 }}><Area {...deploymentsAreaConfig} /></div>
              </>}
            </div>
          </Card>
        </Col>

        <Col xs={24} md={12} lg={6}>
          <Card title={<span><ApiOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />Swagger APIs</span>}>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Collections</Text>
              <Text strong>{apiStats.collections}</Text>
            </Row>
            <Row justify="space-between" style={{ marginBottom: 8 }}>
              <Text>Total Endpoints</Text>
              <Text strong>{apiStats.endpoints}</Text>
            </Row>
            <Space size="small" wrap>
              <Tag color="green">Passed: {apiStats.passed}</Tag>
              <Tag color="red">Failed: {apiStats.failed}</Tag>
            </Space>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 8 }}>
        <Col xs={24} lg={12}>
          <Card title={<span><BellOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />Current Activity</span>}>
            <List
              dataSource={activity}
              locale={{ emptyText: 'No recent activity' }}
              renderItem={(item) => (
                <List.Item>
                  <List.Item.Meta
                    title={<span style={{ fontSize: 14 }}>{item.title}</span>}
                    description={<span style={{ fontSize: 12, color: token.colorTextSecondary }}>{item.description}</span>}
                  />
                  <div style={{ fontSize: 12, color: token.colorTextTertiary }}>{item.date ? new Date(item.date).toLocaleString() : ''}</div>
                </List.Item>
              )}
            />
          </Card>
        </Col>

        <Col xs={24} lg={12}>
          <Card title={<span><BarChartOutlined style={{ color: token.colorPrimary, marginRight: 8 }} />Key Indicators</span>}>
            <Row gutter={[12, 12]}>
              <Col span={12}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>Avg CR Approval</Text>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{crStats.avgApprovalHrs} hrs</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>Avg Incident Resolution</Text>
                  <div style={{ fontSize: 20, fontWeight: 600 }}>{incStats.avgResolutionHrs} hrs</div>
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>Deploy Success</Text>
                  {loading ? <Spin /> : <Gauge {...deployGaugeConfig} />}
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Text type="secondary" style={{ fontSize: 12 }}>APIs Health Pass Rate</Text>
                  {loading ? <Spin /> : <Gauge {...apiGaugeConfig} />}
                </Card>
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

  return (
    <div data-testid="dashboard-container" style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      backgroundColor: token.colorBgLayout
    }}>
      {/* Fixed Header Section - Metrics Cards */}
      <div style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        backgroundColor: token.colorBgLayout,
        padding: isMobile ? '12px' : '16px',
        paddingBottom: isMobile ? '8px' : '12px',
        borderBottom: `1px solid ${token.colorBorder}`,
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)'
      }}>
        <Row gutter={gridConfig.gutter}>
          {/* Metrics Cards */}
          <Col xs={24} sm={12} lg={8}>
            <Card className="metric-card">
              <div className="mobile-stack" style={{ justifyContent: 'center', marginBottom: isMobile ? 8 : 16 }}>
                <ProjectOutlined style={{ fontSize: isMobile ? 24 : 28, color: token.colorPrimary }} />
                <div className="mobile-center">
                  <div className="metric-value">{loading ? '...' : (dashboardData?.metrics?.activeProjects || 0)}</div>
                  <div className="metric-label">Active Projects</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={8}>
            <Card className="metric-card">
              <div className="mobile-stack" style={{ justifyContent: 'center', marginBottom: isMobile ? 8 : 16 }}>
                <CheckCircleOutlined style={{ fontSize: isMobile ? 24 : 28, color: token.colorPrimary }} />
                <div className="mobile-center">
                  <div className="metric-value">{loading ? '...' : (dashboardData?.metrics?.totalTasks || 0)}</div>
                  <div className="metric-label">Total Tasks</div>
                </div>
              </div>
            </Card>
          </Col>
          <Col xs={24} sm={24} lg={8}>
            <Card className="metric-card">
              <div className="mobile-stack" style={{ justifyContent: 'center', marginBottom: isMobile ? 8 : 16 }}>
                <TeamOutlined style={{ fontSize: isMobile ? 24 : 28, color: token.colorPrimary }} />
                <div className="mobile-center">
                  <div className="metric-value">{loading ? '...' : (dashboardData?.metrics?.teamCapacity || 0)}%</div>
                  <div className="metric-label">Team Capacity</div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>

      {/* Scrollable Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        overflow: 'hidden'
      }}>
        {/* Projects Section - Full Width (Scrollable) */}
        <div style={{
          flex: '1',
          width: '100%',
          padding: isMobile ? '12px' : '16px',
          paddingTop: isMobile ? '8px' : '12px',
          overflowY: 'auto',
          height: '100%'
        }}>
          {/* Search/Filter Section */}
          <div data-testid="search-container" className="search-container" style={{
            backgroundColor: token.colorBgLayout,
            borderBottomColor: token.colorBorderSecondary
          }}>
            <Input.Search
              data-testid="search-input"
              placeholder={isMobile ? "Search projects..." : "Search projects by name, client, phase, or status... (Ctrl+K)"}
              value={searchQuery}
              onChange={handleSearchChange}
              onSearch={handleSearchChange}
              allowClear
              size={isMobile ? 'middle' : 'large'}
              aria-label="Search projects"
              style={{
                marginBottom: 8,
                borderRadius: token.borderRadius,
                boxShadow: `0 2px 8px ${token.colorFillSecondary}`,
                border: `1px solid ${token.colorBorder}`,
                backgroundColor: token.colorBgContainer
              }}
              prefix={<SearchOutlined style={{ color: token.colorTextSecondary }} />}
              enterButton={
                <Button
                  type="primary"
                  style={{
                    backgroundColor: token.colorPrimary,
                    borderColor: token.colorPrimary,
                    color: token.colorWhite
                  }}
                >
                  Search
                </Button>
              }
            />

            {/* Results Counter */}
            <div data-testid="search-results-counter" className="search-results-counter" role="status" aria-live="polite" style={{
              color: token.colorTextSecondary
            }}>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {searchQuery ? (
                  <>
                    <FilterOutlined style={{ marginRight: 4 }} />
                    Showing {filteredProjects.length} of {(dashboardData?.projects || []).length} projects
                  </>
                ) : (
                  <>
                    <ProjectOutlined style={{ marginRight: 4 }} />
                    {(dashboardData?.projects || []).length} total projects
                  </>
                )}
              </Text>

              {searchQuery && (
                <Button
                  type="text"
                  size="small"
                  icon={<ClearOutlined />}
                  onClick={clearSearch}
                  style={{ fontSize: '12px' }}

                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          <div data-testid="projects-grid" style={{ marginBottom: 16 }}>
            {loading ? (
              <Card className="project-card" style={{ marginBottom: 16 }}>
                <div data-testid="loading-spinner" style={{ textAlign: 'center', padding: '20px' }}>
                  <Text type="secondary">Loading projects...</Text>
                </div>
              </Card>
            ) : error ? (
              <Card className="project-card" style={{ marginBottom: 16 }}>
                <div data-testid="error-message" role="alert" style={{ textAlign: 'center', padding: '20px' }}>
                  <Text type="danger">Error loading projects: {typeof error === 'string' ? error : error?.message || 'Unknown error occurred'}</Text>
                </div>
              </Card>
            ) : filteredProjects.length === 0 && searchQuery ? (
              <Card className="project-card" style={{ marginBottom: 16 }}>
                <div data-testid="no-projects-message" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <SearchOutlined style={{ fontSize: 48, color: token.colorTextSecondary, marginBottom: 16 }} />
                  <div>
                    <Text type="secondary" style={{ fontSize: 16, display: 'block', marginBottom: 8 }}>
                      No projects found
                    </Text>
                    <Text type="secondary" style={{ fontSize: 14 }}>
                      Try adjusting your search criteria or{' '}
                      <Button type="link" size="small" onClick={clearSearch} style={{ padding: 0, height: 'auto' }}>
                        clear the search
                      </Button>
                    </Text>
                  </div>
                </div>
              </Card>
            ) : (filteredProjects.length > 0 ? filteredProjects : (dashboardData?.projects || [])).map(project => {
              return (
              <Card key={project.id} data-testid={`project-card-${project.name}`} className="project-card" style={{ marginBottom: 16 }}>
                <Collapse
                  ghost
                  size="small"
                  activeKey={projectCollapsed[project.id] ? [] : ['details']}
                  onChange={() => toggleProjectCollapse(project.id)}
                  expandIcon={({ isActive }) => isActive ? <UpOutlined /> : <DownOutlined />}
                  items={[
                    {
                      key: 'details',
                      label: (
                        <div>
                          {/* Project Header - Always Visible */}
                          <div style={{ marginBottom: 16 }}>
                            <div className="project-status">
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
                                <SafetyOutlined style={{ color: token.colorPrimary }} />
                                <Title level={5} data-testid="project-name" style={{ margin: 0, fontSize: '16px' }}>{String(project.name || 'Unnamed Project')}</Title>
                              </div>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <Button
                                  data-testid="view-details-button"
                                  size="small"
                                  type="primary"
                                  icon={<ProjectOutlined />}
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    navigateToRoute && navigateToRoute('project-detail', project.id || project.name)
                                  }}
                                  style={{ fontSize: '12px' }}
                                >
                                  View Details
                                </Button>
                                <Button
                                  data-testid="sprint-report-button"
                                  size="small"
                                  type="text"
                                  icon={<DashboardOutlined />}
                                  onClick={() => handleStepClick(project, 0)}
                                  style={{ fontSize: '12px' }}
                                >
                                  Sprint Report
                                </Button>
                                <Tag data-testid="project-status" color="green" icon={<CheckCircleOutlined />}>{String(project.project_status || project.status || 'Unknown')}</Tag>
                              </div>
                            </div>
                            <Text data-testid="project-client" type="secondary" style={{ fontSize: '13px' }}>{String(project.client || 'No Client')}</Text>
                          </div>

                          {/* Progress Bar - Always Visible */}
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary" style={{ fontSize: 12, marginBottom: 8, display: 'block' }}>
                              Overall Progress (<span data-testid="completion-rate">{project.progress}%</span>)
                            </Text>
                            <Progress
                              percent={project.progress}
                              showInfo={false}
                              strokeColor={token.colorPrimary}
                              trailColor={token.colorBgContainer}
                              size="small"
                            />
                          </div>

                          {/* Task Count - Always Visible */}
                          <div style={{ marginBottom: 16 }}>
                            <Text type="secondary" style={{ fontSize: 12 }}>
                              Tasks: <span data-testid="task-count">{project.task_count || project.total_tasks || 0}</span>
                            </Text>
                          </div>

                          {/* Current Phase - Always Visible */}
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            Current Phase: <Text strong style={{ color: token.colorPrimary }}>{String(project.current_phase || project.currentPhase || 'Planning')}</Text>
                          </Text>
                        </div>
                      ),
                      children: (
                        <div style={{ marginTop: 16 }}>
                          {/* DevSecOps Lifecycle (Task Types) */}
                          <div style={{ marginBottom: 24 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
                              <DashboardOutlined style={{ color: token.colorPrimary }} />
                              <Text strong style={{ fontSize: '14px' }}>DevSecOps Lifecycle</Text>
                            </div>
                            {(() => {
                              const groups = taskTypeSummaryMap[project.id]

                              if (!groups) {
                                return (
                                  <div style={{ textAlign: 'center', padding: '20px 0' }}>
                                    <Spin size="small" />
                                    <div style={{ marginTop: 8, fontSize: 11, color: token.colorTextTertiary }}>
                                      Loading Task Type data...
                                    </div>
                                  </div>
                                )
                              }
                              const currentIdx = (() => {
                                const wip = groups.findIndex(g => g.percent > 0 && g.percent < 100)
                                if (wip >= 0) return wip
                                const lastDone = [...groups].reverse().findIndex(g => g.percent === 100)
                                if (lastDone >= 0) return groups.length - 1 - lastDone
                                return 0
                              })()
                              return (
                                <Steps
                                  data-testid="task-type-steps"
                                  direction="vertical"
                                  size="small"
                                  current={currentIdx}
                                  style={{ fontSize: '10px' }}
                                  items={groups.map((g) => ({
                                    title: (
                                      <div
                                        role="button"
                                        onClick={(e) => { e.stopPropagation(); handleTaskTypeClick(project, g) }}
                                        style={{ cursor: 'pointer' }}
                                      >
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                          <span style={{ fontSize: 11 }}>{g.name}</span>
                                          <Tag color={g.color} style={{ marginLeft: 8, fontSize: 10 }}>{g.completionRate}</Tag>
                                        </div>
                                      </div>
                                    ),
                                    status: g.percent === 100 ? 'finish' : g.percent > 0 ? 'process' : 'wait',
                                  }))}
                                />
                              )
                            })()}
                          </div>

                          <Divider style={{ margin: '16px 0' }} />

                          {/* Attachments Section */}
                          <div style={{ marginBottom: 16 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <PaperClipOutlined style={{ color: token.colorPrimary }} />
                              <Text strong style={{ fontSize: '12px' }}>Attachments</Text>
                            </div>
                            <Upload
                              fileList={projectFiles[project.id] || []}
                              onChange={(info) => handleUpload(project.id, info)}
                              beforeUpload={() => false} // Prevent auto upload
                              multiple
                            >
                              <Button size="small" icon={<UploadOutlined />}>
                                Upload Files
                              </Button>
                            </Upload>
                          </div>

                          {/* Comments Section */}
                          <div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                              <MessageOutlined style={{ color: token.colorPrimary }} />
                              <Text strong style={{ fontSize: '12px' }}>Comments</Text>
                            </div>
                            <Space.Compact style={{ width: '100%' }}>
                              <Input.TextArea


                                value={projectComments[project.id] || ''}
                                onChange={(e) => setProjectComments(prev => ({
                                  ...prev,
                                  [project.id]: e.target.value
                                }))}
                                placeholder="Add a comment..."
                                rows={2}
                                style={{ fontSize: '11px' }}
                              />
                              <Button
                                type="primary"
                                icon={<SendOutlined />}
                                onClick={() => handleCommentSubmit(project.id)}
                                disabled={!projectComments[project.id]?.trim()}
                                size="small"
                              >
                                Send
                              </Button>
                            </Space.Compact>
                          </div>
                        </div>
                      )
                    }
                  ]}
                />
              </Card>
            )}
            )}
          </div>
        </div>
      </div>

      {/* Tasks by Task Type Modal */}
      <TaskTypeTasksModal
        open={tasksModal.open}
        onCancel={() => setTasksModal(prev => ({ ...prev, open: false }))}
        taskType={tasksModal.taskType}
        projectName={tasksModal.projectName}
        loading={tasksModal.loading}
        tasks={tasksModal.tasks}
      />

      {/* Sprint Report Modal */}
      <Modal
        data-testid="sprint-report-modal"
        title={
          <div data-testid="modal-title" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <DashboardOutlined style={{ color: token.colorPrimary }} />
            <span>Sprint Report - {selectedStep?.name}</span>
          </div>
        }
        open={sprintModalVisible}
        onCancel={() => setSprintModalVisible(false)}
        width={isMobile ? '95%' : 800}
        footer={[
          <Button key="close" onClick={() => setSprintModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        <div style={{ padding: '16px 0' }}>
          <div style={{ marginBottom: 16 }}>
            <Text strong>Project Name: </Text>
            <Text data-testid="modal-project-name">{selectedStep?.name}</Text>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>Project Status: </Text>
            <Tag data-testid="modal-project-status" color={
              selectedStep?.status === 'completed' ? 'success' :
              selectedStep?.status === 'active' ? 'processing' :
              'default'
            }>
              {selectedStep?.status?.toUpperCase() || 'INFO'}
            </Tag>
          </div>

          <div style={{ marginBottom: 16 }}>
            <Text strong>Step Number: </Text>
            <Text>{(selectedStep?.index || 0) + 1} of {selectedStep?.totalSteps || (dashboardData?.deliveryLifecycle?.length || 8)}</Text>
          </div>

          {selectedStep?.task_count > 0 && (
            <div style={{ marginBottom: 16 }}>
              <Text strong>Tasks: </Text>
              <Text data-testid="modal-task-count">{selectedStep.completed_tasks}/{selectedStep.task_count} completed (<span data-testid="modal-completion-rate">{Math.round(selectedStep.progress)}%</span>)</Text>
              <Progress
                percent={selectedStep.progress}
                size="small"
                style={{ marginTop: 8 }}
                strokeColor={selectedStep.progress === 100 ? token.colorSuccess : token.colorPrimary}
              />
            </div>
          )}

          <Divider />

          <div style={{ marginBottom: 16 }}>
            <Title level={5}>Sprint Report Details</Title>
            <Text type="secondary">
              This is a placeholder for the sprint report content. In a real implementation,
              this would show detailed information about the current step including:
            </Text>
          </div>

          <div style={{ marginLeft: 16 }}>
            <ul style={{ color: token.colorTextSecondary, fontSize: '14px' }}>
              <li>Task completion status</li>
              <li>Team member assignments</li>
              <li>Timeline and milestones</li>
              <li>Blockers and dependencies</li>
              <li>Quality metrics and KPIs</li>
              <li>Security compliance status</li>
              <li>Documentation and deliverables</li>
            </ul>
          </div>

          <div style={{ marginTop: 24, padding: 16, backgroundColor: token.colorFillTertiary, borderRadius: 6 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>Next Steps:</Text>
            <Text type="secondary" style={{ fontSize: '13px' }}>
              Future implementation will integrate with project management APIs to display
              real-time sprint data, task progress, and team performance metrics.
            </Text>
          </div>
        </div>
      </Modal>

      {/* New Sprint Report Dialog (Zenhub) */}
      <SprintReportDialog
        open={sprintDialogOpen}
        onClose={() => setSprintDialogOpen(false)}
        projectId={sprintDialogProjectId}
        projectName={sprintDialogProjectName}
      />

    </div>
  )
}

export default Dashboard
