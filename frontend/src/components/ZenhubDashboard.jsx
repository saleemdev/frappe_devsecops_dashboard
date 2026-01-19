/**
 * ZenHub Dashboard - Enhanced Stakeholder View
 *
 * Implements 3-level hierarchy:
 * 1. Software Product (Maps to Zenhub Workspace via Frappe Doc)
 * 2. Project (Maps to Zenhub Issue of type 'Project')
 * 3. Epic (Maps to Zenhub Issue of type 'Epic', child of Project)
 *
 * Displays key stakeholder metrics:
 * - Team Utilization
 * - Blockers
 * - Time Estimates & Completion
 * - Pipeline Status
 */

import { useState, useEffect, useMemo } from 'react'
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
  Select,
  Space,
  Tag,
  Table,
  Alert,
  Divider,
  Tooltip
} from 'antd'
import {
  BarChartOutlined,
  TeamOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  AlertOutlined,
  ReloadOutlined,
  ProjectOutlined,
  RiseOutlined,
  WarningOutlined
} from '@ant-design/icons'
import zenhubService from '../services/api/zenhub'
import useNavigationStore from '../stores/navigationStore'

const { Title, Text } = Typography
const { Option } = Select

const ZenhubDashboard = () => {
  const { setCurrentRoute } = useNavigationStore()

  // --- State: Filters ---
  const [softwareProducts, setSoftwareProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null) // { name, zenhub_workspace_id }

  const [projects, setProjects] = useState([]) // Zenhub Issues (type=Project)
  const [selectedProject, setSelectedProject] = useState(null) // ID

  const [epics, setEpics] = useState([]) // Children of selected Project
  const [selectedEpic, setSelectedEpic] = useState(null) // ID

  // --- State: Data & UI ---
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [error, setError] = useState(null)
  const [currentIssues, setCurrentIssues] = useState([]) // Issues to display/calculate metrics from
  const [teamUtilization, setTeamUtilization] = useState([])

  // --- Initialization ---
  useEffect(() => {
    setCurrentRoute('zenhub-dashboard')
    loadSoftwareProducts()
  }, [setCurrentRoute])

  // --- Data Loaders ---

  const loadSoftwareProducts = async () => {
    setLoading(true)
    setLoadingText('Loading Software Products...')
    try {
      const response = await zenhubService.getSoftwareProducts()
      if (response.success && response.products) {
        setSoftwareProducts(response.products)

        // Auto-select first if available
        if (response.products.length > 0) {
          handleProductChange(response.products[0].name)
        }
      } else {
        setError(response.error || 'Failed to load software products')
      }
    } catch (err) {
      console.error('[ZenhubDashboard] Error loading software products:', err)
      const errorMsg = err.message || (typeof err === 'string' ? err : 'Unknown error')
      const errorDetails = err.data?.exception || err.data?.message || ''
      setError(`Error loading software products: ${errorMsg} ${errorDetails}`)
    } finally {
      setLoading(false)
    }
  }

  const loadProjects = async (workspaceId) => {
    setLoading(true)
    setLoadingText('Loading Projects...')
    setProjects([])
    setEpics([])
    setCurrentIssues([])
    try {
      // Fetch Projects (Issues of type Project)
      const response = await zenhubService.getZenhubProjects(workspaceId)
      if (response.success) {
        const projList = response.projects || []
        setProjects(projList)
        setCurrentIssues(projList)

        // Also fetch Team Utilization for the workspace context
        const teamResp = await zenhubService.getTeamUtilization(workspaceId)
        if (teamResp.success) {
          setTeamUtilization(teamResp.team_members || [])
        }
      } else {
        // Fallback or error handling
        console.warn('Failed to load projects:', response.error)
      }
    } catch (err) {
      console.error(err)
      setError('Error loading projects')
    } finally {
      setLoading(false)
    }
  }

  const loadEpics = async (projectId) => {
    setLoading(true)
    setLoadingText('Loading Epics...')
    setEpics([])
    setCurrentIssues([])
    try {
      // Fetch children of the Project Issue -> these are our Epics
      const response = await zenhubService.getIssuesByEpic(projectId)
      if (response.success) {
        setEpics(response.issues || [])
        // When a project is selected, the "issues" context is the list of Epics
        setCurrentIssues(response.issues || [])
      }
    } catch (err) {
      console.error(err)
      setError('Error loading epics')
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async (epicId) => {
    setLoading(true)
    setLoadingText('Loading Tasks...')
    try {
      const response = await zenhubService.getIssuesByEpic(epicId)
      if (response.success) {
        setCurrentIssues(response.issues || [])
      }
    } catch (err) {
      console.error(err)
      setError('Error loading tasks')
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers ---

  const handleProductChange = (productName) => {
    const product = softwareProducts.find(p => p.name === productName)
    setSelectedProduct(product)
    setSelectedProject(null)
    setSelectedEpic(null)
    setProjects([])
    setEpics([])
    setTeamUtilization([])
    setError(null)

    if (product && product.zenhub_workspace_id) {
      loadProjects(product.zenhub_workspace_id)
    } else {
      setError('Selected product does not have a Zenhub Workspace ID configured.')
    }
  }

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId)
    setSelectedEpic(null)
    if (projectId) {
      loadEpics(projectId)
    } else {
      setEpics([])
      setCurrentIssues([])
    }
  }

  const handleEpicChange = (epicId) => {
    setSelectedEpic(epicId)
    if (epicId) {
      loadTasks(epicId)
    } else if (selectedProject) {
      // Revert to showing Epics if Epic deselected
      loadEpics(selectedProject)
    }
  }

  const handleRefresh = () => {
    if (selectedEpic) loadTasks(selectedEpic)
    else if (selectedProject) loadEpics(selectedProject)
    else if (selectedProduct) loadProjects(selectedProduct.zenhub_workspace_id)
    else loadSoftwareProducts()
  }

  // --- Metrics Calculation ---

  const metrics = useMemo(() => {
    if (!currentIssues.length) return null

    const total = currentIssues.length
    const completed = currentIssues.filter(i => i.state === 'CLOSED').length
    const points = currentIssues.reduce((acc, i) => acc + (i.estimate || 0), 0)

    // Calculate blocked
    const blocked = currentIssues.filter(i =>
      (i.blockedBy && i.blockedBy.length > 0) ||
      (i.pipeline && i.pipeline.toLowerCase().includes('block'))
    ).length

    // Pipeline distribution
    const pipelineCounts = currentIssues.reduce((acc, i) => {
      const p = i.pipeline || 'Unknown'
      acc[p] = (acc[p] || 0) + 1
      return acc
    }, {})

    return {
      total,
      completed,
      progress: total ? Math.round((completed / total) * 100) : 0,
      points,
      blocked,
      pipelineCounts
    }
  }, [currentIssues])


  // --- Render Helpers ---

  const renderFilters = () => (
    <Card style={{ marginBottom: 16, borderRadius: 8 }}>
      <Row gutter={16} align="middle">
        <Col xs={24} md={8}>
          <Text strong>Software Product (Workspace)</Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder="Select Product"
            onChange={handleProductChange}
            value={selectedProduct?.name}
            loading={loading && !softwareProducts.length}
          >
            {softwareProducts.map(p => (
              <Option key={p.name} value={p.name}>{p.product_name}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Project</Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder={selectedProduct ? "Select Project" : "Select Product First"}
            onChange={handleProjectChange}
            value={selectedProject}
            disabled={!projects.length}
            allowClear
          >
            {projects.map(p => (
              <Option key={p.id} value={p.id}>{p.title}</Option>
            ))}
          </Select>
        </Col>
        <Col xs={24} md={8}>
          <Text strong>Epic</Text>
          <Select
            style={{ width: '100%', marginTop: 8 }}
            placeholder={selectedProject ? "Select Epic" : "Select Project First"}
            onChange={handleEpicChange}
            value={selectedEpic}
            disabled={!epics.length}
            allowClear
          >
            {epics.map(e => (
              <Option key={e.id} value={e.id}>{e.title}</Option>
            ))}
          </Select>
        </Col>
      </Row>
    </Card>
  )

  const renderMetrics = () => {
    if (!metrics) return null
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="metric-card">
            <Statistic
              title="Completion Status"
              value={metrics.progress}
              suffix="%"
              prefix={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            />
            <Progress percent={metrics.progress} size="small" showInfo={false} strokeColor="#52c41a" />
            <div style={{ marginTop: 8, fontSize: 12, color: '#888' }}>
              {metrics.completed} / {metrics.total} items completed
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="metric-card">
            <Statistic
              title="Total Estimates"
              value={metrics.points}
              prefix={<RiseOutlined style={{ color: '#1890ff' }} />}
              suffix="Pts"
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Total effort across {metrics.total} items</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="metric-card">
            <Statistic
              title="Blockers"
              value={metrics.blocked}
              valueStyle={{ color: metrics.blocked > 0 ? '#cf1322' : '#3f8600' }}
              prefix={<WarningOutlined />}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>Blocked items requiring attention</Text>
          </Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card bordered={false} className="metric-card">
            <Title level={5} style={{ marginTop: 0, marginBottom: 16 }}>Pipeline Status</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              {Object.entries(metrics.pipelineCounts).slice(0, 3).map(([pipeline, count]) => (
                <Row key={pipeline} justify="space-between">
                  <Text>{pipeline}</Text>
                  <Tag>{count}</Tag>
                </Row>
              ))}
            </Space>
          </Card>
        </Col>
      </Row>
    )
  }

  const renderContent = () => {
    if (loading) {
      return <div style={{ textAlign: 'center', padding: 50 }}><Spin size="large" tip={loadingText} /></div>
    }

    if (error) {
      return <Alert message="Error" description={error} type="error" showIcon style={{ marginBottom: 16 }} />
    }

    if (!selectedProduct) {
      return <Empty description="Please select a Software Product to begin" />
    }

    if (!projects.length && !loading) {
      return <Empty description="No Projects found in this workspace" />
    }

    // Columns for the issues table
    const columns = [
      {
        title: 'ID',
        dataIndex: 'number',
        width: 80,
        render: (text, record) => <a href={record.htmlUrl} target="_blank" rel="noopener noreferrer">#{text}</a>
      },
      {
        title: 'Title',
        dataIndex: 'title',
        render: (text) => <Text strong>{text}</Text>
      },
      {
        title: 'State',
        dataIndex: 'state',
        width: 100,
        render: (state) => <Tag color={state === 'CLOSED' ? 'green' : 'blue'}>{state}</Tag>
      },
      {
        title: 'Pipeline',
        dataIndex: 'pipeline',
        width: 150,
        render: v => v ? <Tag>{v}</Tag> : '-'
      },
      {
        title: 'Estimates',
        dataIndex: 'estimate',
        width: 100,
        render: v => v ? <Tag color="geekblue">{v} Pts</Tag> : '-'
      },
      {
        title: 'Assignees',
        dataIndex: 'assignees',
        render: (assignees) => (
          <Space wrap>
            {assignees && assignees.map(a => <Tag key={a}>{a}</Tag>)}
          </Space>
        )
      }
    ]

    return (
      <>
        {renderMetrics()}

        <Row gutter={16}>
          <Col span={16}>
            <Card title={selectedEpic ? "Tasks" : (selectedProject ? "Epics" : "Projects")} className="shadow-sm">
              <Table
                dataSource={currentIssues}
                columns={columns}
                rowKey="id"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          </Col>
          <Col span={8}>
            <Card title="Team Utilization" className="shadow-sm">
              {teamUtilization.length > 0 ? (
                <Space direction="vertical" style={{ width: '100%' }}>
                  {teamUtilization.map(member => (
                    <div key={member.id} style={{ marginBottom: 12 }}>
                      <Row justify="space-between">
                        <Text strong>{member.name}</Text>
                        <Text type="secondary">{member.story_points} Pts</Text>
                      </Row>
                      <Progress
                        percent={member.task_completion_percentage || 0}
                        status="active"
                        size="small"
                      />
                    </div>
                  ))}
                </Space>
              ) : (
                <Empty description="No team data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
              )}
            </Card>
          </Col>
        </Row>
      </>
    )
  }

  return (
    <div style={{ padding: 24 }}>
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Title level={2} style={{ marginBottom: 0 }}>
            <ProjectOutlined style={{ marginRight: 8 }} />
            Stakeholder Dashboard
          </Title>
          <Text type="secondary">Zenhub Integration & Metrics</Text>
        </Col>
        <Col>
          <Button icon={<ReloadOutlined />} onClick={handleRefresh}>Refresh</Button>
        </Col>
      </Row>

      {renderFilters()}
      {renderContent()}
    </div>
  )
}

export default ZenhubDashboard
