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
  Tooltip,
  Input,
  Breadcrumb,
  Skeleton
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

  // --- State: Filters & Context ---
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
  const [searchText, setSearchText] = useState('')
  const [teamUtilization, setTeamUtilization] = useState([])

  // Tracking the active hierarchy level for Breadcrumbs: 'product' | 'project' | 'epic'
  const [activeLevel, setActiveLevel] = useState('product')

  // --- Initialization ---
  useEffect(() => {
    setCurrentRoute('zenhub-dashboard')
    loadSoftwareProducts()
  }, [setCurrentRoute])

  // --- Data Loaders ---

  const loadSoftwareProducts = async () => {
    setLoading(true)
    setLoadingText('Connecting to Workspaces...')
    try {
      const response = await zenhubService.getSoftwareProducts()
      if (response.success && response.products) {
        const prodList = response.products
        setSoftwareProducts(prodList)

        // Default Auto-load first product if available
        if (prodList.length > 0) {
          selectProductInternal(prodList[0].name, prodList)
        }
      } else {
        setError(response.error || 'Failed to load software products')
      }
    } catch (err) {
      console.error('[ZenhubDashboard] Error loading software products:', err)
      setError(`Critical Error: Could not initialize product list. ${err.message || ''}`)
    } finally {
      setLoading(false)
    }
  }

  const loadProductView = async (workspaceId) => {
    setLoading(true)
    setLoadingText('Fetching Workspace Aggregate...')
    setProjects([])
    setEpics([])
    setCurrentIssues([])
    setActiveLevel('product')
    try {
      // 1. Fetch Projects
      const response = await zenhubService.getZenhubProjects(workspaceId)
      if (response.success) {
        const projList = response.projects || []
        setProjects(projList)
        setCurrentIssues(projList)

        // 2. Fetch Team Utilization
        const teamResp = await zenhubService.getTeamUtilization(workspaceId)
        if (teamResp.success) {
          setTeamUtilization(teamResp.team_members || [])
        }

        // 3. Pre-load Epics for the workspace context if needed
        const epicsResp = await zenhubService.getEpics(workspaceId)
        if (epicsResp.success) {
          setEpics(epicsResp.epics || [])
        }
      }
    } catch (err) {
      console.error(err)
      setError('Error loading product lifecycle data.')
    } finally {
      setLoading(false)
    }
  }

  const loadProjectView = async (projectId) => {
    setLoading(true)
    setLoadingText('Drilling into Project Detail...')
    setActiveLevel('project')
    try {
      // Fetch children of the Project Issue -> these are our Epics
      const response = await zenhubService.getIssuesByEpic(projectId)
      if (response.success) {
        // In Project view, current context is the list of child Epics
        setCurrentIssues(response.issues || [])
      }
    } catch (err) {
      console.error(err)
      setError('Error loading project epics')
    } finally {
      setLoading(false)
    }
  }

  const loadEpicView = async (epicId) => {
    setLoading(true)
    setLoadingText('Gathering Epic Tasks...')
    setActiveLevel('epic')
    try {
      const response = await zenhubService.getIssuesByEpic(epicId)
      if (response.success) {
        // In Epic view, current context is the list of child Tasks
        setCurrentIssues(response.issues || [])
      }
    } catch (err) {
      console.error(err)
      setError('Error loading epic tasks')
    } finally {
      setLoading(false)
    }
  }

  // --- Handlers ---

  const handleProductChange = (productName) => {
    selectProductInternal(productName, softwareProducts)
  }

  const selectProductInternal = (productName, productList) => {
    const product = productList.find(p => p.name === productName)
    setSelectedProduct(product)
    setSelectedProject(null)
    setSelectedEpic(null)
    setProjects([])
    setEpics([])
    setCurrentIssues([])
    setSearchText('')
    setTeamUtilization([])
    setError(null)

    if (product && product.zenhub_workspace_id) {
      loadProductView(product.zenhub_workspace_id)
    } else if (product) {
      setError(`Configuration Warning: Product "${product.product_name}" has no Zenhub Workspace ID.`)
    }
  }

  const handleProjectChange = (projectId) => {
    setSelectedProject(projectId)
    setSelectedEpic(null)
    setSearchText('')
    if (projectId) {
      loadProjectView(projectId)
    } else if (selectedProduct) {
      loadProductView(selectedProduct.zenhub_workspace_id)
    }
  }

  const handleEpicChange = (epicId) => {
    setSelectedEpic(epicId)
    setSearchText('')
    if (epicId) {
      loadEpicView(epicId)
    } else if (selectedProject) {
      loadProjectView(selectedProject)
    } else if (selectedProduct) {
      loadProductView(selectedProduct.zenhub_workspace_id)
    }
  }

  const handleRefresh = () => {
    if (selectedEpic) loadEpicView(selectedEpic)
    else if (selectedProject) loadProjectView(selectedProject)
    else if (selectedProduct) loadProductView(selectedProduct.zenhub_workspace_id)
    else loadSoftwareProducts()
  }

  // --- Metrics Calculation ---

  const metrics = useMemo(() => {
    if (!selectedProduct) return null

    const total = currentIssues.length
    const completed = currentIssues.filter(i => i.state === 'CLOSED').length
    const points = currentIssues.reduce((acc, i) => acc + (i.estimate || 0), 0)

    const blocked = currentIssues.filter(i =>
      (i.blockedBy && i.blockedBy.length > 0) ||
      (i.pipeline && (i.pipeline.toLowerCase().includes('block') || i.pipeline.toLowerCase().includes('hold')))
    ).length

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
  }, [currentIssues, selectedProduct])

  // --- Render Helpers ---

  const renderBreadcrumbs = () => {
    if (!selectedProduct) return null

    const items = [
      {
        title: <Space><ProjectOutlined /> Workspaces</Space>,
        onClick: () => handleProductChange(null),
        className: 'clickable-breadcrumb'
      },
      {
        title: selectedProduct.product_name,
        onClick: () => handleProductChange(selectedProduct.name),
        className: 'clickable-breadcrumb'
      }
    ]

    if (selectedProject) {
      const proj = projects.find(p => p.id === selectedProject)
      items.push({
        title: proj?.title || 'Project',
        onClick: () => handleProjectChange(selectedProject),
        className: 'clickable-breadcrumb'
      })
    }

    if (selectedEpic) {
      const epic = currentIssues.find(e => e.id === selectedEpic) || epics.find(e => e.id === selectedEpic)
      items.push({ title: epic?.title || 'Epic' })
    }

    return (
      <Breadcrumb
        items={items}
        style={{ marginBottom: 16, fontSize: 13, color: '#8c8c8c' }}
      />
    )
  }

  const renderFilters = () => (
    <div className="professional-filter-bar">
      <Row gutter={16} align="middle">
        <Col flex="auto">
          <Space size="large">
            <div className="filter-group">
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>PRODUCT</Text>
              <Select
                showSearch
                className="glass-select"
                style={{ width: 220 }}
                placeholder="Select Product"
                onChange={handleProductChange}
                value={selectedProduct?.name}
                loading={loading && !softwareProducts.length}
                optionFilterProp="children"
              >
                {softwareProducts.map(p => (
                  <Option key={p.name} value={p.name}>{p.product_name}</Option>
                ))}
              </Select>
            </div>

            <div className="filter-group">
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>PROJECT</Text>
              <Select
                showSearch
                className="glass-select"
                style={{ width: 220 }}
                placeholder="All Projects"
                onChange={handleProjectChange}
                value={selectedProject}
                disabled={!projects.length}
                allowClear
                optionFilterProp="children"
              >
                {projects.map(p => (
                  <Option key={p.id} value={p.id}>{p.title}</Option>
                ))}
              </Select>
            </div>

            <div className="filter-group">
              <Text type="secondary" style={{ fontSize: 11, display: 'block' }}>EPIC</Text>
              <Select
                showSearch
                className="glass-select"
                style={{ width: 220 }}
                placeholder="All Epics"
                onChange={handleEpicChange}
                value={selectedEpic}
                disabled={!epics.length}
                allowClear
                optionFilterProp="children"
              >
                {epics.map(e => (
                  <Option key={e.id} value={e.id}>{e.title}</Option>
                ))}
              </Select>
            </div>
          </Space>
        </Col>
        <Col>
          <Button
            type="text"
            icon={<ReloadOutlined spin={loading} />}
            onClick={handleRefresh}
            className="refresh-btn-minimal"
          >
            Sync Data
          </Button>
        </Col>
      </Row>
    </div>
  )

  const renderMetrics = () => {
    if (!metrics) return null
    return (
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-metric-card completion">
            <Statistic
              title={<span className="stat-label">Completion Velocity</span>}
              value={metrics.progress}
              suffix="%"
              prefix={<RiseOutlined />}
            />
            <Progress
              percent={metrics.progress}
              size="small"
              strokeColor={{ '0%': '#108ee9', '100%': '#87d068' }}
              className="mt-2"
            />
            <div className="stat-footer">
              <CheckCircleOutlined /> {metrics.completed} / {metrics.total} Resolved
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-metric-card estimates">
            <Statistic
              title={<span className="stat-label">Total Estimates</span>}
              value={metrics.points}
              prefix={<ClockCircleOutlined />}
              suffix={<span style={{ fontSize: 14 }}>SP</span>}
            />
            <div className="stat-footer">
              Across {metrics.total} scope items
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-metric-card risk">
            <Statistic
              title={<span className="stat-label">Blocked / Risks</span>}
              value={metrics.blocked}
              prefix={<WarningOutlined />}
              className={metrics.blocked > 0 ? 'text-danger' : 'text-success'}
            />
            <div className="stat-footer">
              {metrics.blocked > 0 ? "Action required" : "Healthy Pipeline"}
            </div>
          </div>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <div className="glass-metric-card pipelines">
            <Title level={5} style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13, marginBottom: 12 }}>Pipeline Map</Title>
            <div className="pipeline-mini-list">
              {Object.entries(metrics.pipelineCounts).slice(0, 3).map(([pipeline, count]) => (
                <div key={pipeline} className="pipeline-row">
                  <Text style={{ color: '#eee', fontSize: 12 }}>{pipeline}</Text>
                  <Tag color="rgba(255,255,255,0.1)" style={{ border: 'none', color: '#fff' }}>{count}</Tag>
                </div>
              ))}
            </div>
          </div>
        </Col>
      </Row>
    )
  }

  const renderTableContent = () => {
    const columns = [
      {
        title: 'STATUS',
        dataIndex: 'state',
        width: 100,
        render: (state) => (
          <Tag color={state === 'CLOSED' ? '#e6f7ff' : '#f9f0ff'} style={{ border: 'none', color: state === 'CLOSED' ? '#1890ff' : '#722ed1', fontWeight: 600 }}>
            {state}
          </Tag>
        )
      },
      {
        title: 'REFERENCE',
        dataIndex: 'number',
        width: 110,
        render: (text, record) => <a href={record.htmlUrl} target="_blank" rel="noopener noreferrer" style={{ color: '#1890ff', opacity: 0.8 }}>#{text}</a>
      },
      {
        title: 'TITLE',
        dataIndex: 'title',
        render: (text) => <Text strong style={{ color: '#262626' }}>{text}</Text>
      },
      {
        title: 'PIPELINE',
        dataIndex: 'pipeline',
        width: 150,
        render: v => v ? <Tag style={{ borderRadius: 12, border: '1px solid #f0f0f0' }}>{v}</Tag> : '-'
      },
      {
        title: 'ESTIMATE',
        dataIndex: 'estimate',
        width: 110,
        render: v => v ? <Text strong style={{ color: '#595959' }}>{v} Pts</Text> : <Text type="secondary">0 Pts</Text>
      }
    ]

    return (
      <Card
        className="professional-data-card"
        title={
          <Row justify="space-between" align="middle" style={{ width: '100%' }}>
            <Col>
              <Text strong style={{ fontSize: 16 }}>
                {activeLevel === 'product' ? 'Product Projects' : (activeLevel === 'project' ? 'Project Epics' : 'Epic Tasks')}
              </Text>
              <Text type="secondary" style={{ marginLeft: 8, fontSize: 12 }}>({currentIssues.length} items)</Text>
            </Col>
            <Col>
              <Input.Search
                placeholder="Search by title, ID, or status..."
                allowClear
                onChange={e => setSearchText(e.target.value)}
                style={{ width: 280 }}
                className="clean-search"
              />
            </Col>
          </Row>
        }
        bodyStyle={{ padding: 0 }}
      >
        <Table
          dataSource={currentIssues.filter(i =>
            i.title?.toLowerCase().includes(searchText.toLowerCase()) ||
            i.number?.toString().includes(searchText) ||
            i.state?.toLowerCase().includes(searchText.toLowerCase()) ||
            i.pipeline?.toLowerCase().includes(searchText.toLowerCase())
          )}
          columns={columns}
          rowKey="id"
          pagination={{ pageSize: 8, showSizeChanger: false }}
          locale={{ emptyText: <Empty description="No matching records found" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
        />
      </Card>
    )
  }

  return (
    <div className="zenhub-dashboard-container">
      {/* Dynamic Header */}
      <div className="dashboard-header">
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0, letterSpacing: -0.5 }}>
              Precision Dashboard
            </Title>
            <Text type="secondary" style={{ fontSize: 12 }}>Strategic Oversight & Zenhub Lifecycle</Text>
          </Col>
          <Col>
            {renderFilters()}
          </Col>
        </Row>
      </div>

      <Divider style={{ margin: '16px 0' }} />

      {/* Main Viewport */}
      <div className="dashboard-viewport">
        {renderBreadcrumbs()}

        {loading ? (
          <div style={{ background: '#fff', padding: 32, borderRadius: 12 }}>
            <Skeleton active avatar paragraph={{ rows: 2 }} />
            <Divider />
            <Skeleton active paragraph={{ rows: 8 }} />
          </div>
        ) : error ? (
          <Alert message="Workspace Insight Interrupted" description={error} type="error" showIcon closable onClose={() => setError(null)} />
        ) : !selectedProduct ? (
          <Empty
            image={Empty.PRESENTED_IMAGE_DEFAULT}
            description={<Text type="secondary">Connect a Workspace to Begin Strategic Analysis</Text>}
            style={{ marginTop: 100 }}
          />
        ) : (
          <>
            {renderMetrics()}
            <Row gutter={16}>
              <Col span={17}>
                {renderTableContent()}
              </Col>
              <Col span={7}>
                <Card title={<Space><TeamOutlined /> Team Velocity</Space>} className="professional-data-card">
                  {teamUtilization.length > 0 ? (
                    <div className="team-scroll-area">
                      {teamUtilization.map(member => (
                        <div key={member.id} className="team-member-row">
                          <Row justify="space-between" align="middle" style={{ marginBottom: 4 }}>
                            <Text strong style={{ fontSize: 13 }}>{member.name}</Text>
                            <Text type="secondary" style={{ fontSize: 11 }}>{member.story_points} Pts</Text>
                          </Row>
                          <Progress
                            percent={member.task_completion_percentage || 0}
                            strokeColor={member.task_completion_percentage > 80 ? '#52c41a' : '#1890ff'}
                            trailColor="#f5f5f5"
                            strokeWidth={6}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <Empty description="No utility data" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                  )}
                </Card>

                <Card
                  title={<Space><BarChartOutlined /> Health Index</Space>}
                  className="professional-data-card mt-3"
                  style={{ marginTop: 16 }}
                >
                  <div style={{ textAlign: 'center', padding: '16px 0' }}>
                    <Progress
                      type="dashboard"
                      percent={metrics?.progress || 0}
                      strokeColor={{ '0%': '#ff4d4f', '50%': '#faad14', '100%': '#52c41a' }}
                      width={120}
                      format={p => <div style={{ fontSize: 24, fontWeight: 'bold' }}>{p}%<div style={{ fontSize: 11, fontWeight: 'normal', color: '#999' }}>Health</div></div>}
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </div>

      <style jsx="true">{`
        .zenhub-dashboard-container {
          padding: 24px;
          background: #fafafa;
          min-height: 100vh;
        }
        .dashboard-header {
          margin-bottom: 8px;
        }
        .professional-filter-bar {
          background: #fff;
          padding: 12px 20px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid #f0f0f0;
        }
        .filter-group {
          line-height: 1.2;
        }
        .glass-select .ant-select-selector {
          border-radius: 8px !important;
          border: 1px solid #d9d9d9 !important;
          background: #fdfdfd !important;
        }
        .refresh-btn-minimal {
          color: #1890ff;
          font-weight: 500;
          font-size: 13px;
        }
        
        /* Glassmorphism Metrics */
        .glass-metric-card {
          padding: 20px;
          border-radius: 16px;
          color: #fff;
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          min-height: 140px;
        }
        .glass-metric-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 15px 30px rgba(0,0,0,0.15);
        }
        .glass-metric-card.completion { background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%); }
        .glass-metric-card.estimates { background: linear-gradient(135deg, #485563 0%, #29323c 100%); }
        .glass-metric-card.risk { background: linear-gradient(135deg, #cb2d3e 0%, #ef473a 100%); }
        .glass-metric-card.pipelines { background: linear-gradient(135deg, #5c258d 0%, #4389a2 100%); }
        
        .stat-label { color: rgba(255,255,255,0.7); font-size: 12px; font-weight: 600; text-transform: uppercase; }
        .glass-metric-card .ant-statistic-content { color: #fff !important; font-weight: 700; margin-top: 4px; }
        .glass-metric-card .ant-statistic-title { margin-bottom: 0; }
        
        .stat-footer {
          margin-top: 12px;
          font-size: 11px;
          color: rgba(255,255,255,0.6);
          display: flex;
          align-items: center;
          gap: 6px;
        }
        
        .pipeline-mini-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .pipeline-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .professional-data-card {
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
          border: 1px solid #f0f0f0;
        }
        .ant-table-thead > tr > th {
          background: #fafafa !important;
          font-size: 11px;
          letter-spacing: 0.5px;
          color: #8c8c8c !important;
          text-transform: uppercase;
        }
        
        .team-member-row {
          padding-bottom: 12px;
          margin-bottom: 12px;
          border-bottom: 1px solid #f9f9f9;
        }
        .team-member-row:last-child {
          border-bottom: none;
        }
        
        .clickable-breadcrumb {
          cursor: pointer;
          transition: color 0.2s;
        }
        .clickable-breadcrumb:hover {
          color: #1890ff !important;
        }
      `}</style>
    </div>
  )
}

export default ZenhubDashboard
