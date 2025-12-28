/**
 * Product KPI Dashboard Component - Enhanced Global Dashboard
 * Displays comprehensive KPI metrics for Software Products including
 * projects, team members, risks, change requests, and incidents.
 * 
 * Features:
 * - Global view across all products
 * - Additional metrics (tasks, completion rates, progress)
 * - Export functionality (PDF/Excel)
 * - Real-time refresh with auto-refresh option
 * - Enhanced filtering (status, search, date ranges)
 * - Additional charts (product comparison, risk priority, incident severity)
 * - Drill-down navigation to project details
 * - Performance optimizations
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import {
  Card, Row, Col, Table, Tag, Space, Typography, Select, Spin,
  Alert, Statistic, Breadcrumb, theme, Empty, Avatar, Button,
  Input, Switch, Tooltip, Progress, Dropdown, DatePicker
} from 'antd'
import {
  ProjectOutlined, WarningOutlined, FileTextOutlined,
  AlertOutlined, TeamOutlined, RightOutlined, DownOutlined,
  HomeOutlined, ClearOutlined, ReloadOutlined, ExportOutlined,
  DownloadOutlined, FileExcelOutlined, FilePdfOutlined,
  CheckCircleOutlined, ClockCircleOutlined, ExclamationCircleOutlined,
  SearchOutlined, FilterOutlined, UserOutlined
} from '@ant-design/icons'
import { Pie, Bar, Column } from '@ant-design/plots'
import apiService from '../services/api/index.js'
import * as XLSX from 'xlsx'
import jsPDF from 'jspdf'
import 'jspdf-autotable'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

const ProductKPIDashboard = ({ navigateToRoute }) => {
  const { token } = theme.useToken()

  // State management
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [kpiData, setKpiData] = useState(null)
  const [softwareProducts, setSoftwareProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [selectedProject, setSelectedProject] = useState(null)
  const [expandedRowKeys, setExpandedRowKeys] = useState([])
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [refreshInterval, setRefreshInterval] = useState(null)
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [exporting, setExporting] = useState(false)

  // Fetch software products for filter
  useEffect(() => {
    fetchSoftwareProducts()
  }, [])

  // Fetch KPI data when product filter changes
  useEffect(() => {
    fetchKPIData()
  }, [selectedProduct])

  // Auto-refresh logic
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        fetchKPIData()
      }, 60000) // Refresh every 60 seconds
      setRefreshInterval(interval)
      return () => clearInterval(interval)
    } else {
      if (refreshInterval) {
        clearInterval(refreshInterval)
        setRefreshInterval(null)
      }
    }
  }, [autoRefresh])

  const fetchSoftwareProducts = async () => {
    try {
      const response = await apiService.productKPI.getSoftwareProductsForFilter()
      if (response.success) {
        setSoftwareProducts(response.data)
      }
    } catch (err) {
      console.error('Error fetching software products:', err)
    }
  }

  const fetchKPIData = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const response = await apiService.productKPI.getProductKPIData(selectedProduct)
      if (response.success) {
        setKpiData(response.data)
      } else {
        setError(response.error || 'Failed to fetch KPI data')
      }
    } catch (err) {
      setError(err.message || 'An error occurred while fetching KPI data')
    } finally {
      setLoading(false)
    }
  }, [selectedProduct])

  // Clear all filters
  const handleClearFilters = () => {
    setSelectedProduct(null)
    setSelectedProject(null)
    setSearchText('')
    setStatusFilter('all')
  }

  // Filter projects by selected filters - enhanced search includes product names
  const filteredProjects = useMemo(() => {
    if (!kpiData?.projects) return []

    const filtered = kpiData.projects.filter(project => {
      // Product filter
      if (selectedProduct && project.software_product !== selectedProduct) return false

      // Project filter
      if (selectedProject && project.name !== selectedProject) return false

      // Enhanced search filter - includes product names
      if (searchText) {
        const searchLower = searchText.toLowerCase()
        const product = softwareProducts.find(p => p.name === project.software_product)
        const productName = product?.product_name || ''
        const matchesSearch = 
          project.project_name?.toLowerCase().includes(searchLower) ||
          project.project_manager?.toLowerCase().includes(searchLower) ||
          project.status?.toLowerCase().includes(searchLower) ||
          productName.toLowerCase().includes(searchLower)
        if (!matchesSearch) return false
      }

      // Status filter
      if (statusFilter !== 'all' && project.status?.toLowerCase() !== statusFilter.toLowerCase()) {
        return false
      }

      return true
    })

    // Sort by project name for better organization
    return [...filtered].sort((a, b) => {
      return (a.project_name || '').localeCompare(b.project_name || '')
    })
  }, [kpiData, selectedProduct, selectedProject, searchText, statusFilter, softwareProducts])

  // Get unique statuses for filter
  const statusOptions = useMemo(() => {
    if (!kpiData?.projects) return []
    const statuses = new Set(kpiData.projects.map(p => p.status).filter(Boolean))
    return Array.from(statuses)
  }, [kpiData])

  // Navigate to project detail
  const handleViewProject = useCallback((projectId) => {
    if (navigateToRoute) {
      navigateToRoute('project-detail', projectId)
    }
  }, [navigateToRoute])

  // Export to Excel
  const handleExportExcel = useCallback(async () => {
    if (!kpiData) return

    setExporting(true)
    try {
      const workbook = XLSX.utils.book_new()

      // Projects sheet
      const projectsData = filteredProjects.map(p => ({
        'Project Name': p.project_name,
        'Status': p.status,
        'Manager': p.project_manager || '',
        'Team Size': p.team_size || 0,
        'Total Tasks': p.total_tasks || 0,
        'Completed Tasks': p.completed_tasks || 0,
        'Task Completion Rate': `${p.task_completion_rate || 0}%`,
        'Project Progress': `${p.project_progress || 0}%`,
        'Risks': p.risk_count || 0,
        'Change Requests': p.change_request_count || 0,
        'Incidents': p.incident_count || 0,
        'Start Date': p.expected_start_date || '',
        'End Date': p.expected_end_date || ''
      }))

      const projectsSheet = XLSX.utils.json_to_sheet(projectsData)
      XLSX.utils.book_append_sheet(workbook, projectsSheet, 'Projects')

      // Metrics sheet
      if (kpiData.metrics) {
        const metricsData = [
          ['Metric', 'Value'],
          ['Total Projects', kpiData.metrics.total_projects],
          ['Active Projects', kpiData.metrics.active_projects],
          ['Total Tasks', kpiData.metrics.total_tasks],
          ['Completed Tasks', kpiData.metrics.completed_tasks],
          ['Task Completion Rate', `${kpiData.metrics.task_completion_rate || 0}%`],
          ['Total Risks', kpiData.metrics.total_risks],
          ['Active Risks', kpiData.metrics.active_risks],
          ['Total Change Requests', kpiData.metrics.total_change_requests],
          ['Pending Change Requests', kpiData.metrics.pending_change_requests],
          ['Total Incidents', kpiData.metrics.total_incidents],
          ['Open Incidents', kpiData.metrics.open_incidents]
        ]
        const metricsSheet = XLSX.utils.aoa_to_sheet(metricsData)
        XLSX.utils.book_append_sheet(workbook, metricsSheet, 'Metrics')
      }

      // Download
      const fileName = `Product_KPI_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`
      XLSX.writeFile(workbook, fileName)
    } catch (err) {
      console.error('Error exporting to Excel:', err)
      message.error('Failed to export to Excel')
    } finally {
      setExporting(false)
    }
  }, [kpiData, filteredProjects])

  // Export to PDF
  const handleExportPDF = useCallback(async () => {
    if (!kpiData) return

    setExporting(true)
    try {
      const doc = new jsPDF()
      
      // Title
      doc.setFontSize(18)
      doc.text('Product KPI Dashboard Report', 14, 20)
      doc.setFontSize(12)
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 30)

      let yPos = 40

      // Metrics summary
      if (kpiData.metrics) {
        doc.setFontSize(14)
        doc.text('Summary Metrics', 14, yPos)
        yPos += 10

        const metrics = [
          ['Total Projects', kpiData.metrics.total_projects],
          ['Active Projects', kpiData.metrics.active_projects],
          ['Total Tasks', kpiData.metrics.total_tasks],
          ['Task Completion Rate', `${kpiData.metrics.task_completion_rate || 0}%`],
          ['Active Risks', kpiData.metrics.active_risks],
          ['Pending Change Requests', kpiData.metrics.pending_change_requests],
          ['Open Incidents', kpiData.metrics.open_incidents]
        ]

        doc.autoTable({
          startY: yPos,
          head: [['Metric', 'Value']],
          body: metrics,
          theme: 'striped'
        })

        yPos = doc.lastAutoTable.finalY + 15
      }

      // Projects table
      if (filteredProjects.length > 0) {
        doc.setFontSize(14)
        doc.text('Projects', 14, yPos)
        yPos += 10

        const projectsTableData = filteredProjects.map(p => [
          p.project_name || '',
          p.status || '',
          p.project_manager || '',
          p.total_tasks || 0,
          `${p.task_completion_rate || 0}%`,
          p.risk_count || 0,
          p.incident_count || 0
        ])

        doc.autoTable({
          startY: yPos,
          head: [['Project', 'Status', 'Manager', 'Tasks', 'Completion', 'Risks', 'Incidents']],
          body: projectsTableData,
          theme: 'striped'
        })
      }

      // Save
      const fileName = `Product_KPI_Dashboard_${new Date().toISOString().split('T')[0]}.pdf`
      doc.save(fileName)
    } catch (err) {
      console.error('Error exporting to PDF:', err)
      message.error('Failed to export to PDF')
    } finally {
      setExporting(false)
    }
  }, [kpiData, filteredProjects])

  // Management-Focused Metrics Cards Component - Only Strategic Metrics
  const renderMetricsCards = () => {
    if (!kpiData?.metrics) return null

    const metrics = kpiData.metrics

    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        {/* On-Time Delivery Rate - Key Business Outcome */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ height: '100%', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <CheckCircleOutlined style={{ fontSize: 32, color: '#1890ff' }} />
              <Statistic
                title="On-Time Delivery"
                value={metrics.on_time_delivery_rate || 0}
                suffix="%"
                valueStyle={{ 
                  fontSize: 28, 
                  fontWeight: 600,
                  color: metrics.on_time_delivery_rate >= 80 ? '#52c41a' : metrics.on_time_delivery_rate >= 60 ? '#faad14' : '#ff4d4f' 
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                {metrics.on_time_projects || 0} on-time, {metrics.delayed_projects || 0} delayed
              </Text>
            </Space>
          </Card>
        </Col>

        {/* Critical Risk Exposure - Risk Management */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ height: '100%', background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <WarningOutlined style={{ fontSize: 32, color: '#fa8c16' }} />
              <Statistic
                title="Critical Risk Exposure"
                value={metrics.critical_risks || 0}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>of {metrics.active_risks || 0} active</Text>}
                valueStyle={{ 
                  fontSize: 28, 
                  fontWeight: 600,
                  color: metrics.critical_risks > 5 ? '#ff4d4f' : metrics.critical_risks > 2 ? '#fa8c16' : '#52c41a' 
                }}
              />
              {metrics.critical_risks > 0 && (
                <Tag color={metrics.critical_risks > 5 ? 'red' : 'orange'} style={{ marginTop: 4 }}>
                  Requires Attention
                </Tag>
              )}
            </Space>
          </Card>
        </Col>

        {/* Quality Health - Defect Rate */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ height: '100%', background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <ExclamationCircleOutlined style={{ fontSize: 32, color: '#ff4d4f' }} />
              <Statistic
                title="Quality Health"
                value={metrics.defect_rate || 0}
                suffix="%"
                valueStyle={{ 
                  fontSize: 28, 
                  fontWeight: 600,
                  color: metrics.defect_rate > 10 ? '#ff4d4f' : metrics.defect_rate > 5 ? '#faad14' : '#52c41a' 
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                Defect rate (incidents per 100 tasks)
              </Text>
              {metrics.critical_incidents > 0 && (
                <Tag color="red" style={{ marginTop: 4 }}>
                  {metrics.critical_incidents} Critical Incidents
                </Tag>
              )}
            </Space>
          </Card>
        </Col>

        {/* Project Portfolio Health */}
        <Col xs={24} sm={12} lg={6}>
          <Card hoverable style={{ height: '100%', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' }}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              <ProjectOutlined style={{ fontSize: 32, color: '#52c41a' }} />
              <Statistic
                title="Active Projects"
                value={metrics.active_projects || 0}
                suffix={<Text type="secondary" style={{ fontSize: 12 }}>of {metrics.total_projects || 0} total</Text>}
                valueStyle={{ fontSize: 28, fontWeight: 600 }}
              />
              {metrics.completed_projects > 0 && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {metrics.completed_projects} completed
                </Text>
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    )
  }

  // Stakeholder Metrics Component
  const renderStakeholderMetrics = useCallback(() => {
    if (!kpiData?.metrics) return null

    const metrics = kpiData.metrics

    return (
      <Card
        title={
          <Space>
            <UserOutlined style={{ fontSize: 18, color: token.colorPrimary }} />
            <span style={{ fontSize: '16px', fontWeight: 600 }}>Stakeholder Metrics</span>
          </Space>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          {/* Delivery Timeline Metrics */}
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ height: '100%', background: 'linear-gradient(135deg, #e6f7ff 0%, #bae7ff 100%)' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <CheckCircleOutlined style={{ fontSize: 28, color: '#1890ff' }} />
                <Statistic
                  title="On-Time Delivery Rate"
                  value={metrics.on_time_delivery_rate || 0}
                  suffix="%"
                  valueStyle={{ fontSize: 22, color: metrics.on_time_delivery_rate >= 80 ? '#52c41a' : metrics.on_time_delivery_rate >= 60 ? '#faad14' : '#ff4d4f' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {metrics.on_time_projects || 0} on-time, {metrics.delayed_projects || 0} delayed
                </Text>
              </Space>
            </Card>
          </Col>

          {/* Average Project Duration */}
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ height: '100%', background: 'linear-gradient(135deg, #f6ffed 0%, #d9f7be 100%)' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <ClockCircleOutlined style={{ fontSize: 28, color: '#52c41a' }} />
                <Statistic
                  title="Avg. Project Duration"
                  value={metrics.average_project_duration_days || 0}
                  suffix="days"
                  valueStyle={{ fontSize: 22 }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Based on completed projects
                </Text>
              </Space>
            </Card>
          </Col>

          {/* Team Workload */}
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ height: '100%', background: 'linear-gradient(135deg, #fff7e6 0%, #ffe7ba 100%)' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <TeamOutlined style={{ fontSize: 28, color: '#faad14' }} />
                <Statistic
                  title="Avg. Tasks per Member"
                  value={metrics.avg_tasks_per_member || 0}
                  valueStyle={{ fontSize: 22, color: metrics.avg_tasks_per_member > 20 ? '#ff4d4f' : metrics.avg_tasks_per_member > 10 ? '#faad14' : '#52c41a' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Workload indicator
                </Text>
                {metrics.avg_tasks_per_member > 20 && (
                  <Tag color="red" style={{ marginTop: 4 }}>High Workload</Tag>
                )}
              </Space>
            </Card>
          </Col>

          {/* Quality Metrics */}
          <Col xs={24} sm={12} lg={6}>
            <Card size="small" style={{ height: '100%', background: 'linear-gradient(135deg, #fff1f0 0%, #ffccc7 100%)' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                <ExclamationCircleOutlined style={{ fontSize: 28, color: '#ff4d4f' }} />
                <Statistic
                  title="Defect Rate"
                  value={metrics.defect_rate || 0}
                  suffix="%"
                  valueStyle={{ fontSize: 22, color: metrics.defect_rate > 10 ? '#ff4d4f' : metrics.defect_rate > 5 ? '#faad14' : '#52c41a' }}
                />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  Incidents per 100 tasks
                </Text>
                {metrics.defect_rate > 10 && (
                  <Tag color="red" style={{ marginTop: 4 }}>Quality Concern</Tag>
                )}
              </Space>
            </Card>
          </Col>
        </Row>
      </Card>
    )
  }, [kpiData, token])

  // Enhanced Charts Component
  const renderCharts = () => {
    if (!kpiData?.charts) return null

    const pieData = kpiData.charts.project_status || []
    const taskTypeData = kpiData.charts.task_types || []
    const productComparisonData = kpiData.charts.product_comparison || []
    const riskPriorityData = kpiData.charts.risk_priority || []
    const riskScoreData = kpiData.charts.risk_score_distribution || []
    const riskMitigationData = kpiData.charts.risk_mitigation_status || []
    const incidentSeverityData = kpiData.charts.incident_severity || []
    const incidentResolutionData = kpiData.charts.incident_resolution_status || []
    const advancedMetrics = kpiData.advanced_metrics || {}

    // Enhanced: Prepare task type data with status breakdown for bottleneck analysis
    // Sort by total count, then by overdue rate to highlight bottlenecks
    const sortedTaskTypeData = [...taskTypeData]
      .map(item => ({
        ...item,
        completed: item.completed || 0,
        in_progress: item.in_progress || 0,
        overdue: item.overdue || 0,
        open: item.open || 0,
        completion_rate: item.completion_rate || 0,
        overdue_rate: item.overdue_rate || 0
      }))
      .sort((a, b) => {
        // Primary sort: by overdue rate (descending) to highlight bottlenecks
        if (b.overdue_rate !== a.overdue_rate) {
          return b.overdue_rate - a.overdue_rate
        }
        // Secondary sort: by total count (descending)
        return b.count - a.count
      })
    
    // Prepare stacked bar chart data
    const stackedTaskData = sortedTaskTypeData.flatMap(item => [
      { task_type: item.task_type, status: 'Completed', count: item.completed, color: '#52C41A' },
      { task_type: item.task_type, status: 'In Progress', count: item.in_progress, color: '#1890FF' },
      { task_type: item.task_type, status: 'Overdue', count: item.overdue, color: '#FF4D4F' },
      { task_type: item.task_type, status: 'Open', count: item.open, color: '#FAAD14' }
    ]).filter(d => d.count > 0)

    // Replace pie chart with horizontal stacked bar for project status
    const projectStatusBarData = pieData.flatMap(item => [
      { status: item.status, count: item.count }
    ])

    const projectStatusBarConfig = projectStatusBarData.length > 0 ? {
      data: projectStatusBarData,
      xField: 'count',
      yField: 'status',
      seriesField: 'status',
      legend: {
        position: 'bottom'
      },
      height: Math.max(200, projectStatusBarData.length * 50),
      color: ({ status }) => {
        const colorMap = {
          'Active': '#52C41A',
          'Completed': '#1890FF',
          'On Hold': '#FAAD14',
          'Cancelled': '#FF4D4F'
        }
        return colorMap[status] || '#8C8C8C'
      },
      barStyle: {
        radius: [0, 6, 6, 0],
      },
      label: {
        position: 'right',
        formatter: (datum) => `${datum.count}`
      }
    } : null

    // Enhanced stacked horizontal bar chart for task types - highlights bottlenecks
    const taskTypeStackedConfig = stackedTaskData.length > 0 ? {
      data: stackedTaskData,
      xField: 'count',
      yField: 'task_type',
      seriesField: 'status',
      isStack: true,
      legend: {
        position: 'bottom',
        itemHeight: 14
      },
      height: Math.max(400, sortedTaskTypeData.length * 50),
      color: ({ status }) => {
        const colorMap = {
          'Completed': '#52C41A',
          'In Progress': '#1890FF',
          'Overdue': '#FF4D4F',
          'Open': '#FAAD14'
        }
        return colorMap[status] || '#8C8C8C'
      },
      barStyle: {
        radius: [0, 6, 6, 0],
      },
      label: {
        position: 'right',
        formatter: (datum) => datum.count > 0 ? `${datum.count}` : '',
        style: {
          fill: '#000',
          fontSize: 12,
          fontWeight: 500
        }
      },
      xAxis: {
        grid: {
          line: {
            style: {
              stroke: '#E8E8E8',
              lineWidth: 1,
              lineDash: [3, 3],
            }
          }
        }
      },
      yAxis: {
        label: {
          autoRotate: false,
          autoHide: false,
          style: {
            fontSize: 13,
            fontWeight: 500,
            fill: '#262626',
          },
          formatter: (text) => {
            return text.length > 25 ? text.substring(0, 22) + '...' : text
          }
        }
      },
      tooltip: {
        customContent: (title, items) => {
          if (!items || items.length === 0) return ''
          const taskType = items[0].data.task_type
          const taskTypeInfo = sortedTaskTypeData.find(t => t.task_type === taskType)
          if (!taskTypeInfo) return ''
          
          return `
            <div style="padding: 12px; min-width: 250px;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px; color: #262626;">${taskType}</div>
              <div style="margin-bottom: 4px; padding-bottom: 4px; border-bottom: 1px solid #f0f0f0;">
                <span style="color: #666;">Total Tasks:</span>
                <span style="font-weight: 600; margin-left: 8px;">${taskTypeInfo.count}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #52C41A;">✓ Completed:</span>
                <span style="font-weight: 500;">${taskTypeInfo.completed} (${taskTypeInfo.completion_rate.toFixed(1)}%)</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #1890FF;">⟳ In Progress:</span>
                <span style="font-weight: 500;">${taskTypeInfo.in_progress}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
                <span style="color: #FAAD14;">○ Open:</span>
                <span style="font-weight: 500;">${taskTypeInfo.open}</span>
              </div>
              <div style="display: flex; justify-content: space-between; margin-top: 6px; padding-top: 6px; border-top: 2px solid #ff4d4f;">
                <span style="color: #FF4D4F; font-weight: 600;">⚠ Overdue:</span>
                <span style="font-weight: 600; color: #FF4D4F;">${taskTypeInfo.overdue} (${taskTypeInfo.overdue_rate.toFixed(1)}%)</span>
              </div>
              ${taskTypeInfo.overdue_rate > 20 ? '<div style="margin-top: 8px; padding: 4px 8px; background: #fff2e8; border-left: 3px solid #ff4d4f; font-size: 12px; color: #d46b08;">⚠️ Bottleneck detected!</div>' : ''}
            </div>
          `
        }
      },
      animation: {
        appear: {
          animation: 'wave-in',
          duration: 800,
        }
      }
    } : null

    // Product comparison column chart
    // Map product IDs to product names for better display
    const productComparisonDataWithNames = productComparisonData.map(item => {
      const product = softwareProducts.find(p => p.name === item.product)
      return {
        ...item,
        product_name: product?.product_name || item.product,
        product_id: item.product
      }
    })
    
    const productComparisonConfig = productComparisonDataWithNames.length > 0 ? {
      data: productComparisonDataWithNames,
      xField: 'product_name',
      yField: 'project_count',
      columnStyle: {
        radius: [4, 4, 0, 0],
      },
      label: {
        position: 'top',
        style: {
          fill: '#000',
          opacity: 0.85,
        },
      },
      tooltip: {
        customContent: (title, items) => {
          if (!items || items.length === 0) return ''
          const data = items[0].data
          const productManager = data.product_manager || 'Not assigned'
          return `
            <div style="padding: 12px; min-width: 200px;">
              <div style="font-weight: 600; margin-bottom: 8px; font-size: 14px;">${data.product_name}</div>
              <div style="margin-bottom: 6px; padding-bottom: 6px; border-bottom: 1px solid #f0f0f0;">
                <span style="font-weight: 500; color: #666;">Product Manager:</span>
                <span style="margin-left: 8px; font-weight: 600; color: #1890ff;">${productManager}</span>
              </div>
              <div>Projects: ${data.project_count}</div>
              <div>Tasks: ${data.total_tasks}</div>
              <div>Risks: ${data.active_risks}</div>
              <div>Incidents: ${data.open_incidents}</div>
            </div>
          `
        }
      }
    } : null

    // Risk priority horizontal bar chart (replaces pie)
    const riskPriorityBarConfig = riskPriorityData.length > 0 ? {
      data: riskPriorityData.sort((a, b) => {
        const priorityOrder = { 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
        return (priorityOrder[b.priority] || 0) - (priorityOrder[a.priority] || 0)
      }),
      xField: 'count',
      yField: 'priority',
      height: Math.max(200, riskPriorityData.length * 50),
      color: ({ priority }) => {
        const colorMap = {
          'Critical': '#FF4D4F',
          'High': '#FF7A45',
          'Medium': '#FAAD14',
          'Low': '#52C41A'
        }
        return colorMap[priority] || '#8C8C8C'
      },
      barStyle: {
        radius: [0, 6, 6, 0],
      },
      label: {
        position: 'right',
        formatter: (datum) => `${datum.count}`
      }
    } : null

    // Risk Score Distribution - Shows risk exposure levels
    const riskScoreConfig = riskScoreData.length > 0 ? {
      data: riskScoreData,
      xField: 'score_range',
      yField: 'count',
      height: 250,
      color: ({ score_range }) => {
        const colorMap = {
          '0-5': '#52C41A',
          '6-10': '#FAAD14',
          '11-15': '#FF7A45',
          '16-20': '#FF4D4F',
          '21+': '#8B0000'
        }
        return colorMap[score_range] || '#8C8C8C'
      },
      columnStyle: {
        radius: [4, 4, 0, 0],
      },
      label: {
        position: 'top',
        formatter: (datum) => `${datum.count}`
      }
    } : null

    // Risk Mitigation Status - Shows risk management progress
    const riskMitigationConfig = riskMitigationData.length > 0 ? {
      data: riskMitigationData,
      xField: 'status',
      yField: 'count',
      height: 250,
      color: ({ status }) => {
        const colorMap = {
          'Open': '#FF4D4F',
          'Monitoring': '#FAAD14',
          'Mitigated': '#1890FF',
          'Closed': '#52C41A'
        }
        return colorMap[status] || '#8C8C8C'
      },
      columnStyle: {
        radius: [4, 4, 0, 0],
      },
      label: {
        position: 'top',
        formatter: (datum) => `${datum.count}`
      }
    } : null

    // Incident severity horizontal bar chart (replaces pie)
    const incidentSeverityBarConfig = incidentSeverityData.length > 0 ? {
      data: incidentSeverityData.sort((a, b) => {
        const severityOrder = { 'S1 - Critical': 4, 'S2 - High': 3, 'S3 - Medium': 2, 'S4 - Low': 1, 'Critical': 4, 'High': 3, 'Medium': 2, 'Low': 1 }
        return (severityOrder[b.severity] || 0) - (severityOrder[a.severity] || 0)
      }),
      xField: 'count',
      yField: 'severity',
      height: Math.max(200, incidentSeverityData.length * 50),
      color: ({ severity }) => {
        const colorMap = {
          'S1 - Critical': '#FF4D4F',
          'S2 - High': '#FF7A45',
          'S3 - Medium': '#FAAD14',
          'S4 - Low': '#52C41A',
          'Critical': '#FF4D4F',
          'High': '#FF7A45',
          'Medium': '#FAAD14',
          'Low': '#52C41A'
        }
        return colorMap[severity] || '#8C8C8C'
      },
      barStyle: {
        radius: [0, 6, 6, 0],
      },
      label: {
        position: 'right',
        formatter: (datum) => `${datum.count}`
      }
    } : null

    // Incident Resolution Status - Shows operational efficiency
    const incidentResolutionConfig = incidentResolutionData.length > 0 ? {
      data: incidentResolutionData,
      xField: 'status',
      yField: 'count',
      height: 250,
      color: ({ status }) => {
        const colorMap = {
          'Open': '#FF4D4F',
          'In Progress': '#FAAD14',
          'Resolved': '#1890FF',
          'Closed': '#52C41A'
        }
        return colorMap[status] || '#8C8C8C'
      },
      columnStyle: {
        radius: [4, 4, 0, 0],
      },
      label: {
        position: 'top',
        formatter: (datum) => `${datum.count}`
      }
    } : null

    return (
      <>
        {/* Enhanced Tasks by Type - Bottleneck Analysis (Full Width) */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24}>
            <Card
              title={
                <Space>
                  <span style={{ fontSize: '16px', fontWeight: 600 }}>Task Type Bottleneck Analysis</span>
                  <Tag color="blue">{sortedTaskTypeData.length} types</Tag>
                  {sortedTaskTypeData.some(t => t.overdue_rate > 20) && (
                    <Tag color="red">⚠️ Bottlenecks Detected</Tag>
                  )}
                </Space>
              }
              extra={
                <Space>
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Sorted by overdue rate to highlight bottlenecks
                  </Text>
                </Space>
              }
            >
              {taskTypeStackedConfig ? (
                <div style={{
                  maxHeight: '600px',
                  overflowY: sortedTaskTypeData.length > 10 ? 'auto' : 'visible',
                  overflowX: 'hidden',
                }}>
                  <Bar {...taskTypeStackedConfig} />
                </div>
              ) : (
                <Empty description="No task type data" />
              )}
            </Card>
          </Col>
        </Row>

        {/* Project Status Chart */}
        {projectStatusBarConfig && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24} lg={12}>
              <Card title="Projects by Status" style={{ height: '100%' }}>
                <Bar {...projectStatusBarConfig} />
              </Card>
            </Col>
          </Row>
        )}

        {/* Enhanced Risk Analysis - Multi-dimensional */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={8}>
            <Card 
              title={
                <Space>
                  <WarningOutlined />
                  <span>Risk Priority Distribution</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              {riskPriorityBarConfig ? (
                <Bar {...riskPriorityBarConfig} />
              ) : (
                <Empty description="No risk data" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card 
              title={
                <Space>
                  <WarningOutlined />
                  <span>Risk Score Distribution</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              {riskScoreConfig ? (
                <Column {...riskScoreConfig} />
              ) : (
                <Empty description="No risk score data" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card 
              title={
                <Space>
                  <CheckCircleOutlined />
                  <span>Risk Mitigation Status</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              {riskMitigationConfig ? (
                <Column {...riskMitigationConfig} />
              ) : (
                <Empty description="No mitigation data" />
              )}
            </Card>
          </Col>
        </Row>

        {/* Enhanced Incident Analysis - Multi-dimensional */}
        <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
          <Col xs={24} lg={8}>
            <Card 
              title={
                <Space>
                  <AlertOutlined />
                  <span>Incident Severity</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              {incidentSeverityBarConfig ? (
                <Bar {...incidentSeverityBarConfig} />
              ) : (
                <Empty description="No incident data" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card 
              title={
                <Space>
                  <CheckCircleOutlined />
                  <span>Incident Resolution Status</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              {incidentResolutionConfig ? (
                <Column {...incidentResolutionConfig} />
              ) : (
                <Empty description="No resolution data" />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card 
              title={
                <Space>
                  <ClockCircleOutlined />
                  <span>Mean Time To Resolution (MTTR)</span>
                </Space>
              }
              style={{ height: '100%' }}
            >
              {advancedMetrics.mttr_days !== undefined ? (
                <Space direction="vertical" size="large" style={{ width: '100%', padding: '20px 0', textAlign: 'center' }}>
                  <Statistic
                    title="Average Resolution Time"
                    value={advancedMetrics.mttr_days || 0}
                    suffix="days"
                    valueStyle={{ 
                      fontSize: 36, 
                      fontWeight: 600,
                      color: advancedMetrics.mttr_days <= 1 ? '#52C41A' : advancedMetrics.mttr_days <= 3 ? '#FAAD14' : '#FF4D4F'
                    }}
                  />
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    {advancedMetrics.total_resolved_incidents || 0} incidents resolved
                  </Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {advancedMetrics.mttr_hours?.toFixed(1) || 0} hours average
                  </Text>
                </Space>
              ) : (
                <Empty description="No MTTR data available" />
              )}
            </Card>
          </Col>
        </Row>

        {/* Enhanced Product Comparison - Health Score Visualization */}
        {productComparisonConfig && (
          <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
            <Col xs={24}>
              <Card 
                title={
                  <Space>
                    <ProjectOutlined />
                    <span style={{ fontSize: '16px', fontWeight: 600 }}>Product Health Comparison</span>
                    <Tag color="blue">{productComparisonDataWithNames.length} products</Tag>
                  </Space>
                }
                extra={
                  <Text type="secondary" style={{ fontSize: '12px' }}>
                    Health score based on task completion, risk exposure, incidents, and delivery rate
                  </Text>
                }
                style={{ height: '100%' }}
              >
                <Column {...productComparisonConfig} />
              </Card>
            </Col>
          </Row>
        )}
      </>
    )
  }

  // Expandable row content for projects
  const expandedRowRender = useCallback((project) => {
    return (
      <div style={{ padding: 16, backgroundColor: token.colorBgLayout, width: '100%', overflowX: 'auto', boxSizing: 'border-box' }}>
        {/* Team Members Section */}
        <Title level={5} style={{ marginTop: 0 }}>
          <TeamOutlined /> Team Members ({project.team_size})
        </Title>
        <Table
          size="small"
          dataSource={project.team_members}
          rowKey="user"
          pagination={false}
          style={{ marginBottom: 24 }}
          locale={{ emptyText: <Empty description="No team members" /> }}
          columns={[
            {
              title: 'Member',
              dataIndex: 'full_name',
              key: 'full_name',
              render: (text, record) => (
                <Space>
                  <Avatar size="small">{text?.charAt(0) || record.user?.charAt(0) || 'U'}</Avatar>
                  <Text>{text || record.user}</Text>
                </Space>
              )
            },
            {
              title: 'Email',
              dataIndex: 'email',
              key: 'email',
              render: (email) => email || '-'
            },
            {
              title: 'Business Function',
              dataIndex: 'custom_business_function',
              key: 'custom_business_function',
              render: (func) => func ? <Tag>{func}</Tag> : '-'
            }
          ]}
        />

        {/* Risks Section */}
        <Title level={5}>
          <WarningOutlined /> Risks ({project.risk_count})
        </Title>
        <Table
          size="small"
          dataSource={project.risks}
          rowKey="name"
          pagination={false}
          style={{ marginBottom: 24 }}
          locale={{ emptyText: <Empty description="No risks found" /> }}
          columns={[
            {
              title: 'Risk Title',
              dataIndex: 'risk_title',
              key: 'risk_title'
            },
            {
              title: 'Category',
              dataIndex: 'risk_category',
              key: 'risk_category',
              render: (category) => category || '-'
            },
            {
              title: 'Risk Score',
              dataIndex: 'risk_score',
              key: 'risk_score',
              render: (score) => {
                const color = score >= 15 ? 'red' : score >= 10 ? 'orange' : score >= 5 ? 'gold' : 'green'
                return score ? <Tag color={color}>{score}</Tag> : '-'
              },
              sorter: (a, b) => (a.risk_score || 0) - (b.risk_score || 0)
            },
            {
              title: 'Priority',
              dataIndex: 'priority',
              key: 'priority',
              render: (priority) => {
                const colorMap = {
                  'Critical': 'red',
                  'High': 'orange',
                  'Medium': 'gold',
                  'Low': 'green'
                }
                return priority ? <Tag color={colorMap[priority] || 'default'}>{priority}</Tag> : '-'
              }
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => status ? <Tag>{status}</Tag> : '-'
            }
          ]}
        />

        {/* Change Requests Section */}
        <Title level={5}>
          <FileTextOutlined /> Change Requests ({project.change_request_count})
        </Title>
        <Table
          size="small"
          dataSource={project.change_requests}
          rowKey="name"
          pagination={false}
          style={{ marginBottom: 24 }}
          locale={{ emptyText: <Empty description="No change requests found" /> }}
          columns={[
            {
              title: 'Title',
              dataIndex: 'title',
              key: 'title'
            },
            {
              title: 'Category',
              dataIndex: 'change_category',
              key: 'change_category',
              render: (category) => category ? <Tag>{category}</Tag> : '-'
            },
            {
              title: 'Submission Date',
              dataIndex: 'submission_date',
              key: 'submission_date',
              render: (date) => date || '-'
            },
            {
              title: 'Workflow State',
              dataIndex: 'workflow_state',
              key: 'workflow_state',
              render: (state) => {
                const colorMap = {
                  'Approved': 'green',
                  'Pending': 'gold',
                  'Rejected': 'red',
                  'Draft': 'default'
                }
                return state ? <Tag color={colorMap[state] || 'blue'}>{state}</Tag> : '-'
              }
            },
            {
              title: 'Approval Status',
              dataIndex: 'approval_status',
              key: 'approval_status',
              render: (status) => {
                const colorMap = {
                  'Approved': 'green',
                  'Pending Review': 'gold',
                  'Rejected': 'red'
                }
                return status ? <Tag color={colorMap[status] || 'default'}>{status}</Tag> : '-'
              }
            }
          ]}
        />

        {/* Incidents Section */}
        <Title level={5}>
          <AlertOutlined /> Incidents ({project.incident_count})
        </Title>
        <Table
          size="small"
          dataSource={project.incidents}
          rowKey="name"
          pagination={false}
          locale={{ emptyText: <Empty description="No incidents found" /> }}
          columns={[
            {
              title: 'Title',
              dataIndex: 'title',
              key: 'title'
            },
            {
              title: 'Severity',
              dataIndex: 'severity',
              key: 'severity',
              render: (severity) => {
                const colorMap = {
                  'Critical': 'red',
                  'High': 'orange',
                  'Medium': 'gold',
                  'Low': 'blue'
                }
                return severity ? <Tag color={colorMap[severity] || 'default'}>{severity}</Tag> : '-'
              }
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              render: (status) => {
                const colorMap = {
                  'Open': 'red',
                  'In Progress': 'gold',
                  'Resolved': 'green',
                  'Closed': 'default'
                }
                return status ? <Tag color={colorMap[status] || 'default'}>{status}</Tag> : '-'
              }
            },
            {
              title: 'Reported Date',
              dataIndex: 'reported_date',
              key: 'reported_date',
              render: (date) => date || '-'
            }
          ]}
        />
      </div>
    )
  }, [token])

  // Generate consistent color for each product
  const getProductColor = useCallback((productId) => {
    if (!productId) return '#f0f0f0' // Light gray for unassigned
    
    // Generate a consistent color based on product ID hash
    const colors = [
      '#e6f7ff', // Light blue
      '#f6ffed', // Light green
      '#fff7e6', // Light orange
      '#fff1f0', // Light red
      '#f9f0ff', // Light purple
      '#e6fffb', // Light cyan
      '#fffbe6', // Light yellow
      '#f0f5ff', // Light indigo
      '#fff0f6', // Light pink
      '#f0fff4'  // Light mint
    ]
    
    // Simple hash function to get consistent color for same product
    let hash = 0
    for (let i = 0; i < productId.length; i++) {
      hash = productId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return colors[Math.abs(hash) % colors.length]
  }, [])

  // Get product border color (darker version for left border)
  const getProductBorderColor = useCallback((productId) => {
    if (!productId) return '#d9d9d9'
    
    const borderColors = [
      '#1890ff', // Blue
      '#52c41a', // Green
      '#fa8c16', // Orange
      '#ff4d4f', // Red
      '#722ed1', // Purple
      '#13c2c2', // Cyan
      '#faad14', // Gold
      '#2f54eb', // Indigo
      '#eb2f96', // Pink
      '#73d13d'  // Mint
    ]
    
    let hash = 0
    for (let i = 0; i < productId.length; i++) {
      hash = productId.charCodeAt(i) + ((hash << 5) - hash)
    }
    return borderColors[Math.abs(hash) % borderColors.length]
  }, [])

  // Enhanced Projects table columns - Product column removed, use filters instead
  const projectColumns = useMemo(() => [
    {
      title: 'Project Name',
      dataIndex: 'project_name',
      key: 'project_name',
      width: 250,
      render: (text, record) => {
        const product = softwareProducts.find(p => p.name === record.software_product)
        const productName = product?.product_name || null
        return (
          <Space direction="vertical" size={4} style={{ width: '100%' }}>
            <Button 
              type="link" 
              onClick={() => handleViewProject(record.name)}
              style={{ padding: 0, fontWeight: 600, textAlign: 'left', height: 'auto' }}
            >
              {text}
            </Button>
            {productName && (
              <Tag color="blue" style={{ fontSize: '10px', padding: '0 6px', height: '18px', lineHeight: '18px', margin: 0 }}>
                {productName}
              </Tag>
            )}
          </Space>
        )
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      width: 120,
      render: (status) => {
        const colorMap = {
          'Active': 'green',
          'Completed': 'blue',
          'On Hold': 'orange',
          'Cancelled': 'red'
        }
        const statusConfig = {
          'Active': { color: 'green', bg: '#f6ffed', border: '#b7eb8f' },
          'Completed': { color: 'blue', bg: '#e6f7ff', border: '#91d5ff' },
          'On Hold': { color: 'orange', bg: '#fff7e6', border: '#ffd591' },
          'Cancelled': { color: 'red', bg: '#fff1f0', border: '#ffa39e' }
        }
        const config = statusConfig[status] || { color: 'default', bg: '#fafafa', border: '#d9d9d9' }
        
        return status ? (
          <Tag 
            color={colorMap[status] || 'default'}
            style={{
              backgroundColor: config.bg,
              borderColor: config.border,
              borderWidth: '1px',
              borderStyle: 'solid',
              fontWeight: 600,
              fontSize: '12px',
              padding: '2px 8px'
            }}
          >
            {status}
          </Tag>
        ) : '-'
      }
    },
    {
      title: 'Manager',
      dataIndex: 'project_manager',
      key: 'project_manager',
      render: (manager) => manager || '-'
    },
    {
      title: 'Team Size',
      dataIndex: 'team_size',
      key: 'team_size',
      render: (size) => (
        <Space>
          <TeamOutlined />
          <Text>{size}</Text>
        </Space>
      )
    },
    {
      title: 'Progress',
      dataIndex: 'project_progress',
      key: 'project_progress',
      render: (progress) => progress !== undefined ? (
        <Progress 
          percent={progress} 
          size="small" 
          format={percent => `${percent?.toFixed(0)}%`}
        />
      ) : '-'
    },
    {
      title: 'Tasks',
      key: 'tasks',
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.total_tasks || 0} total</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {record.completed_tasks || 0} completed
            {record.task_completion_rate !== undefined && ` (${record.task_completion_rate.toFixed(0)}%)`}
          </Text>
        </Space>
      )
    },
    {
      title: 'Risks',
      dataIndex: 'risk_count',
      key: 'risk_count',
      render: (count) => (
        <Tag color={count > 0 ? 'orange' : 'default'}>
          {count}
        </Tag>
      )
    },
    {
      title: 'Change Requests',
      dataIndex: 'change_request_count',
      key: 'change_request_count',
      render: (count) => <Tag>{count}</Tag>
    },
    {
      title: 'Incidents',
      dataIndex: 'incident_count',
      key: 'incident_count',
      render: (count) => (
        <Tag color={count > 0 ? 'red' : 'default'}>
          {count}
        </Tag>
      )
    }
  ], [handleViewProject, token, softwareProducts])

  // Generate row class name for color coding
  const getRowClassName = useCallback((record) => {
    const productId = record.software_product
    const status = record.status?.toLowerCase() || ''
    
    // Create class names for product and status
    const productClass = productId ? `product-${productId.replace(/[^a-zA-Z0-9]/g, '-')}` : 'product-unassigned'
    const statusClass = status ? `status-${status.replace(/\s+/g, '-')}` : ''
    
    return `${productClass} ${statusClass}`.trim()
  }, [])

  // Export menu items
  const exportMenuItems = [
    {
      key: 'excel',
      label: 'Export to Excel',
      icon: <FileExcelOutlined />,
      onClick: handleExportExcel
    },
    {
      key: 'pdf',
      label: 'Export to PDF',
      icon: <FilePdfOutlined />,
      onClick: handleExportPDF
    }
  ]

  return (
    <div style={{ padding: 24 }}>
      {/* Header */}
      <Breadcrumb style={{ marginBottom: 16 }}>
        <Breadcrumb.Item>
          <HomeOutlined />
        </Breadcrumb.Item>
        <Breadcrumb.Item>Projects</Breadcrumb.Item>
        <Breadcrumb.Item>Product KPI Dashboard</Breadcrumb.Item>
      </Breadcrumb>

      <div style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
          <Title level={2} style={{ margin: 0 }}>
            {selectedProduct 
              ? `Product KPI Dashboard - ${softwareProducts.find(p => p.name === selectedProduct)?.product_name || selectedProduct}`
              : 'Global Product KPI Dashboard'}
          </Title>
          <Space>
            <Tooltip title="Auto-refresh every 60 seconds">
              <Space>
                <Text>Auto-refresh</Text>
                <Switch checked={autoRefresh} onChange={setAutoRefresh} />
              </Space>
            </Tooltip>
            <Button
              icon={<ReloadOutlined />}
              onClick={fetchKPIData}
              loading={loading}
            >
              Refresh
            </Button>
            <Dropdown
              menu={{ items: exportMenuItems }}
              trigger={['click']}
              disabled={!kpiData || exporting}
            >
              <Button
                icon={<ExportOutlined />}
                loading={exporting}
              >
                Export <DownOutlined />
              </Button>
            </Dropdown>
          </Space>
        </div>
        
        {/* Product Manager Display - Prominent */}
        {selectedProduct && (() => {
          const product = softwareProducts.find(p => p.name === selectedProduct)
          const productManager = product?.product_manager_full_name || product?.product_manager
          if (productManager) {
            return (
              <Card
                style={{
                  background: 'linear-gradient(135deg, #f0f4ff 0%, #e6f2ff 100%)',
                  border: '1px solid #d6e4ff',
                  borderRadius: '12px',
                  marginBottom: 16
                }}
                bodyStyle={{ padding: '16px 20px' }}
              >
                <Space size="middle" style={{ width: '100%' }}>
                  <div style={{
                    width: 48,
                    height: 48,
                    background: '#1890ff',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <UserOutlined style={{ fontSize: 24, color: '#fff' }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <Text 
                      type="secondary" 
                      style={{ 
                        fontSize: 12, 
                        fontWeight: 600, 
                        textTransform: 'uppercase', 
                        letterSpacing: '0.5px',
                        color: '#0050b3'
                      }}
                    >
                      Product Manager
                    </Text>
                    <div style={{ fontSize: 18, fontWeight: 600, color: '#000', marginTop: 4 }}>
                      {productManager}
                    </div>
                  </div>
                </Space>
              </Card>
            )
          }
          return null
        })()}
      </div>

      {/* Enhanced Filters */}
      <Card
        title={
          <Space>
            <FilterOutlined />
            <span>Filters</span>
          </Space>
        }
        extra={
          <Button
            icon={<ClearOutlined />}
            onClick={handleClearFilters}
            disabled={!selectedProduct && !selectedProject && !searchText && statusFilter === 'all'}
          >
            Clear Filters
          </Button>
        }
        style={{ marginBottom: 24 }}
      >
        <Row gutter={[16, 16]}>
          <Col xs={24} sm={12} lg={6}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Software Product</Text>
              <Select
                placeholder="All Products (Global View)"
                allowClear
                showSearch
                style={{ width: '100%' }}
                value={selectedProduct}
                onChange={setSelectedProduct}
                filterOption={(input, option) =>
                  option.children.toLowerCase().includes(input.toLowerCase())
                }
              >
                {softwareProducts.map(product => (
                  <Option key={product.name} value={product.name}>
                    {product.product_name || product.name} ({product.project_count} projects)
                  </Option>
                ))}
              </Select>
            </Space>
          </Col>

                <Col xs={24} sm={12} lg={8}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      <SearchOutlined style={{ marginRight: 8 }} />
                      Search Projects
                    </Text>
                    <Input
                      placeholder="Search by project name, manager, status, or product name..."
                      prefix={<SearchOutlined />}
                      size="large"
                      value={searchText}
                      onChange={(e) => setSearchText(e.target.value)}
                      allowClear
                    />
                  </Space>
                </Col>

                <Col xs={24} sm={12} lg={4}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      <FilterOutlined style={{ marginRight: 8 }} />
                      Status
                    </Text>
                    <Select
                      placeholder="All Statuses"
                      size="large"
                      style={{ width: '100%' }}
                      value={statusFilter}
                      onChange={setStatusFilter}
                    >
                      <Option value="all">All Statuses</Option>
                      {statusOptions.map(status => (
                        <Option key={status} value={status.toLowerCase()}>
                          {status}
                        </Option>
                      ))}
                    </Select>
                  </Space>
                </Col>

                <Col xs={24} sm={12} lg={4}>
                  <Space direction="vertical" style={{ width: '100%' }}>
                    <Text strong style={{ fontSize: '14px' }}>
                      <ProjectOutlined style={{ marginRight: 8 }} />
                      Project
                    </Text>
                    <Select
                      placeholder="All Projects"
                      allowClear
                      showSearch
                      size="large"
                      style={{ width: '100%' }}
                      value={selectedProject}
                      onChange={setSelectedProject}
                      disabled={!kpiData?.projects || kpiData.projects.length === 0}
                      filterOption={(input, option) =>
                        option.children.toLowerCase().includes(input.toLowerCase())
                      }
                    >
                      {kpiData?.projects?.map(project => (
                        <Option key={project.name} value={project.name}>
                          {project.project_name}
                        </Option>
                      ))}
                    </Select>
                  </Space>
                </Col>
        </Row>
      </Card>

      {/* Loading State */}
      {loading && (
        <div style={{ textAlign: 'center', padding: 48 }}>
          <Spin size="large" tip="Loading KPI data..." />
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <Alert
          message="Error Loading KPI Data"
          description={error}
          type="error"
          showIcon
          closable
          onClose={() => setError(null)}
          style={{ marginBottom: 24 }}
          action={
            <Button size="small" onClick={fetchKPIData}>
              Retry
            </Button>
          }
        />
      )}

      {/* Data Display */}
      {!loading && !error && kpiData && (
        <>
          {renderMetricsCards()}
          
          {/* Stakeholder Metrics */}
          {renderStakeholderMetrics()}
          
          {/* Projects Table - Moved up for better hierarchy */}
          <Card 
            title={
              <Space>
                <span style={{ fontSize: '18px', fontWeight: 600 }}>Projects ({filteredProjects.length})</span>
                {selectedProduct && (
                  <Tag color="blue">Filtered by Product</Tag>
                )}
                {!selectedProduct && (
                  <Tag color="green">Global View - All Products</Tag>
                )}
              </Space>
            }
            style={{ marginBottom: 16 }}
            bodyStyle={{ padding: '16px' }}
          >
            <Table
              dataSource={filteredProjects}
              columns={projectColumns}
              rowKey="name"
              rowClassName={getRowClassName}
              expandable={{
                expandedRowRender,
                expandedRowKeys,
                onExpand: (expanded, record) => {
                  setExpandedRowKeys(expanded ? [record.name] : [])
                },
                expandIcon: ({ expanded, onExpand, record }) => (
                  expanded ? (
                    <DownOutlined onClick={e => onExpand(record, e)} style={{ cursor: 'pointer' }} />
                  ) : (
                    <RightOutlined onClick={e => onExpand(record, e)} style={{ cursor: 'pointer' }} />
                  )
                )
              }}
              pagination={{
                pageSize: 10,
                showSizeChanger: true,
                showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} projects`,
                pageSizeOptions: ['10', '25', '50', '100']
              }}
              locale={{ emptyText: <Empty description="No projects found" /> }}
              scroll={{ x: 'max-content' }}
              size="middle"
            />
            <style>{`
              /* Fix expanded row overflow */
              .ant-table-expanded-row > td {
                padding: 0 !important;
                border-bottom: none !important;
              }
              .ant-table-expanded-row > td > div {
                padding: 16px !important;
                background-color: ${token.colorBgLayout} !important;
                overflow-x: auto;
                max-width: 100%;
                box-sizing: border-box;
              }

              /* Product-based row color coding */
              ${(() => {
                const uniqueProducts = new Set()
                filteredProjects.forEach(record => {
                  if (record.software_product) {
                    uniqueProducts.add(record.software_product)
                  }
                })
                
                return Array.from(uniqueProducts).map((productId) => {
                  const bgColor = getProductColor(productId)
                  const borderColor = getProductBorderColor(productId)
                  const className = `product-${productId.replace(/[^a-zA-Z0-9]/g, '-')}`
                  
                  return `
                    .ant-table-tbody > tr.${className} > td {
                      background-color: ${bgColor} !important;
                      border-left: 4px solid ${borderColor} !important;
                    }
                    .ant-table-tbody > tr.${className}:hover > td {
                      background-color: ${bgColor}dd !important;
                      border-left-width: 6px !important;
                    }
                  `
                }).join('')
              })()}

              /* Status-based row styling - enhance border colors */
              .ant-table-tbody > tr.status-active > td {
                border-left-color: #52c41a !important;
              }
              .ant-table-tbody > tr.status-completed > td {
                border-left-color: #1890ff !important;
              }
              .ant-table-tbody > tr.status-on-hold > td {
                border-left-color: #fa8c16 !important;
              }
              .ant-table-tbody > tr.status-cancelled > td {
                border-left-color: #ff4d4f !important;
              }

              /* Unassigned product rows */
              .ant-table-tbody > tr.product-unassigned > td {
                background-color: #fafafa !important;
                border-left: 4px solid #d9d9d9 !important;
              }

              /* Enhanced hover effects */
              .ant-table-tbody > tr:hover > td {
                transition: all 0.2s ease;
              }
            `}</style>
          </Card>

          {/* Charts - Moved after table for better hierarchy */}
          {renderCharts()}
        </>
      )}

      {/* Empty State */}
      {!loading && !error && (!kpiData || !kpiData.projects || kpiData.projects.length === 0) && (
        <Card>
          <Empty
            description={
              selectedProduct
                ? "No projects found for the selected product"
                : "No projects found"
            }
          />
        </Card>
      )}
    </div>
  )
}

export default ProductKPIDashboard
