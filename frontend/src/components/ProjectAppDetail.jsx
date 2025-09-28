import React, { useEffect } from 'react'
import {
  Card,
  Button,
  Typography,
  Space,
  Tag,
  Row,
  Col,
  Descriptions,
  Table,
  Timeline,
  Progress,
  Alert,
  Tabs,
  List,
  Avatar,
  Spin,
  Empty,
  Tooltip,
  message,
  Statistic
} from 'antd'
import {
  ArrowLeftOutlined,
  AppstoreOutlined,
  DeploymentUnitOutlined,
  SecurityScanOutlined,
  TeamOutlined,
  HistoryOutlined,
  SettingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  CloseCircleOutlined,
  GithubOutlined,
  LinkOutlined,
  CloudServerOutlined
} from '@ant-design/icons'
import { useApplicationsStore, useNavigationStore } from '../stores/index.js'

const { Title, Text, Paragraph } = Typography

const ProjectAppDetail = ({ appId }) => {
  // Zustand stores
  const {
    selectedApplication: appData,
    loading,
    error,
    fetchApplication,
    clearError
  } = useApplicationsStore()

  const { navigateToRoute } = useNavigationStore()

  console.log('ProjectAppDetail rendered with appId:', appId)

  // Load application data when component mounts or appId changes
  useEffect(() => {
    if (appId) {
      fetchApplication(appId).catch((error) => {
        console.error('Failed to fetch application:', error)
        message.error('Failed to load application details')
      })
    }
  }, [appId, fetchApplication])

  // Clear error when component unmounts
  useEffect(() => {
    return () => {
      clearError()
    }
  }, [clearError])

  // Mock data for demonstration (will be removed when real API is ready)
  const mockAppData = {
    'app-001': {
      id: 'app-001',
      name: 'ePrescription API',
      description: 'RESTful API service for electronic prescription management system',
      project: 'ePrescription',
      repositoryUrl: 'https://github.com/company/eprescription-api',
      deploymentUrl: 'https://api.eprescription.dod.mil',
      technology: 'Node.js',
      framework: 'Express.js',
      database: 'PostgreSQL',
      status: 'Active',
      version: 'v2.1.3',
      lastDeployment: '2024-01-15 14:30:00',
      environment: 'Production',
      healthScore: 95,
      securityScore: 88,
      complianceStatus: 'Compliant',
      team: [
        { name: 'John Smith', role: 'Lead Developer', avatar: 'JS' },
        { name: 'Sarah Johnson', role: 'DevOps Engineer', avatar: 'SJ' },
        { name: 'Mike Davis', role: 'Security Analyst', avatar: 'MD' }
      ],
      environmentVariables: [
        { key: 'NODE_ENV', value: 'production', sensitive: false },
        { key: 'DATABASE_URL', value: '***REDACTED***', sensitive: true },
        { key: 'JWT_SECRET', value: '***REDACTED***', sensitive: true },
        { key: 'API_VERSION', value: 'v2.1', sensitive: false }
      ],
      deploymentHistory: [
        {
          version: 'v2.1.3',
          date: '2024-01-15 14:30:00',
          status: 'Success',
          deployedBy: 'Sarah Johnson',
          changes: 'Security patches and performance improvements'
        },
        {
          version: 'v2.1.2',
          date: '2024-01-10 09:15:00',
          status: 'Success',
          deployedBy: 'John Smith',
          changes: 'Bug fixes and API endpoint updates'
        },
        {
          version: 'v2.1.1',
          date: '2024-01-05 16:45:00',
          status: 'Failed',
          deployedBy: 'Sarah Johnson',
          changes: 'Database migration issues'
        }
      ],
      securityScans: [
        {
          type: 'SAST',
          status: 'Passed',
          score: 92,
          lastRun: '2024-01-15',
          issues: 2,
          severity: 'Low'
        },
        {
          type: 'DAST',
          status: 'Passed',
          score: 85,
          lastRun: '2024-01-14',
          issues: 1,
          severity: 'Medium'
        },
        {
          type: 'Dependency Scan',
          status: 'Warning',
          score: 78,
          lastRun: '2024-01-15',
          issues: 3,
          severity: 'High'
        }
      ],
      metrics: {
        uptime: 99.9,
        responseTime: 145,
        errorRate: 0.02,
        throughput: 1250
      }
    },
    'app-002': {
      id: 'app-002',
      name: 'Patient Portal',
      description: 'Patient-facing web portal for appointment booking and medical records',
      project: 'Patient Management',
      repositoryUrl: 'https://github.com/company/patient-portal',
      deploymentUrl: 'https://portal.patients.dod.mil',
      technology: 'React',
      framework: 'Next.js',
      database: 'MongoDB',
      status: 'Active',
      version: 'v1.5.2',
      lastDeployment: '2024-01-18 10:15:00',
      environment: 'Staging',
      healthScore: 87,
      securityScore: 92,
      complianceStatus: 'Compliant',
      team: [
        { name: 'Sarah Johnson', role: 'Frontend Lead', avatar: 'SJ' },
        { name: 'Mike Chen', role: 'UX Designer', avatar: 'MC' }
      ],
      environmentVariables: [
        { key: 'REACT_APP_API_URL', value: 'https://api.staging.dod.mil', sensitive: false },
        { key: 'REACT_APP_AUTH_TOKEN', value: '***REDACTED***', sensitive: true }
      ],
      deploymentHistory: [
        { version: 'v1.5.2', date: '2024-01-18', status: 'Success', deployedBy: 'Sarah Johnson' },
        { version: 'v1.5.1', date: '2024-01-15', status: 'Success', deployedBy: 'Mike Chen' }
      ],
      securityScans: [
        { type: 'SAST', status: 'Passed', score: 94, lastRun: '2024-01-18', issues: 1, severity: 'Low' },
        { type: 'DAST', status: 'Passed', score: 89, lastRun: '2024-01-17', issues: 2, severity: 'Medium' }
      ],
      metrics: {
        uptime: 98.5,
        responseTime: 230,
        errorRate: 0.05,
        throughput: 850
      }
    },
    'app-003': {
      id: 'app-003',
      name: 'Mobile Health App',
      description: 'Mobile application for health monitoring and telemedicine',
      project: 'Mobile Health App',
      repositoryUrl: 'https://github.com/company/mobile-health',
      deploymentUrl: 'https://app.mobilehealth.dod.mil',
      technology: 'React Native',
      framework: 'Expo',
      database: 'Firebase',
      status: 'Maintenance',
      version: 'v0.9.1',
      lastDeployment: '2024-01-15 16:45:00',
      environment: 'Development',
      healthScore: 72,
      securityScore: 85,
      complianceStatus: 'Under Review',
      team: [
        { name: 'Alex Rodriguez', role: 'Mobile Lead', avatar: 'AR' },
        { name: 'Lisa Wang', role: 'Backend Developer', avatar: 'LW' }
      ],
      environmentVariables: [
        { key: 'EXPO_API_URL', value: 'https://api.dev.dod.mil', sensitive: false },
        { key: 'FIREBASE_CONFIG', value: '***REDACTED***', sensitive: true }
      ],
      deploymentHistory: [
        { version: 'v0.9.1', date: '2024-01-15', status: 'Failed', deployedBy: 'Alex Rodriguez' },
        { version: 'v0.9.0', date: '2024-01-12', status: 'Success', deployedBy: 'Lisa Wang' }
      ],
      securityScans: [
        { type: 'SAST', status: 'Warning', score: 78, lastRun: '2024-01-15', issues: 5, severity: 'Medium' },
        { type: 'Dependency Scan', status: 'Failed', score: 65, lastRun: '2024-01-14', issues: 8, severity: 'High' }
      ],
      metrics: {
        uptime: 95.2,
        responseTime: 180,
        errorRate: 0.12,
        throughput: 420
      }
    },
    'app-004': {
      id: 'app-004',
      name: 'Analytics Dashboard',
      description: 'Real-time analytics and reporting dashboard for healthcare metrics',
      project: 'ePrescription',
      repositoryUrl: 'https://github.com/company/analytics-dashboard',
      deploymentUrl: 'https://analytics.eprescription.dod.mil',
      technology: 'Vue.js',
      framework: 'Nuxt.js',
      database: 'InfluxDB',
      status: 'Active',
      version: 'v3.2.1',
      lastDeployment: '2024-01-19 09:20:00',
      environment: 'Production',
      healthScore: 98,
      securityScore: 95,
      complianceStatus: 'Compliant',
      team: [
        { name: 'David Kim', role: 'Data Engineer', avatar: 'DK' },
        { name: 'Emma Thompson', role: 'Analytics Lead', avatar: 'ET' }
      ],
      environmentVariables: [
        { key: 'VUE_APP_INFLUX_URL', value: 'https://influx.prod.dod.mil', sensitive: false },
        { key: 'INFLUX_TOKEN', value: '***REDACTED***', sensitive: true }
      ],
      deploymentHistory: [
        { version: 'v3.2.1', date: '2024-01-19', status: 'Success', deployedBy: 'David Kim' },
        { version: 'v3.2.0', date: '2024-01-16', status: 'Success', deployedBy: 'Emma Thompson' }
      ],
      securityScans: [
        { type: 'SAST', status: 'Passed', score: 96, lastRun: '2024-01-19', issues: 0, severity: 'None' },
        { type: 'DAST', status: 'Passed', score: 94, lastRun: '2024-01-18', issues: 1, severity: 'Low' }
      ],
      metrics: {
        uptime: 99.8,
        responseTime: 95,
        errorRate: 0.01,
        throughput: 2100
      }
    }
  }

  // Use the data from Zustand store or fallback to mock data
  const finalAppData = appData || mockAppData[appId]

  // Derived counts for responsive summaries
  const envVarCount = (finalAppData?.environmentVariables || []).length
  const sensitiveCount = (finalAppData?.environmentVariables || []).filter(v => v.sensitive).length
  const recentLogs = (finalAppData?.deploymentHistory || []).slice(0, 5).map(d => ({
    timestamp: d.date,
    level: d.status === 'Failed' ? 'ERROR' : d.status === 'Success' ? 'INFO' : 'WARN',
    message: `Deployment ${d.version} ${String(d.status || '').toLowerCase()}`
  }))

  const getStatusColor = (status) => {
    switch (status) {
      case 'Active': return 'green'
      case 'Inactive': return 'red'
      case 'Maintenance': return 'orange'
      default: return 'default'
    }
  }

  const getSecurityStatusColor = (status) => {
    switch (status) {
      case 'Passed': return 'green'
      case 'Warning': return 'orange'
      case 'Failed': return 'red'
      default: return 'default'
    }
  }

  const getDeploymentStatusColor = (status) => {
    switch (status) {
      case 'Success': return 'green'
      case 'Failed': return 'red'
      case 'In Progress': return 'blue'
      default: return 'default'
    }
  }

  const deploymentColumns = [
    {
      title: 'Version',
      dataIndex: 'version',
      key: 'version'
    },
    {
      title: 'Date',
      dataIndex: 'date',
      key: 'date'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getDeploymentStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: 'Deployed By',
      dataIndex: 'deployedBy',
      key: 'deployedBy'
    },
    {
      title: 'Changes',
      dataIndex: 'changes',
      key: 'changes',
      ellipsis: true
    }
  ]

  const securityColumns = [
    {
      title: 'Scan Type',
      dataIndex: 'type',
      key: 'type'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={getSecurityStatusColor(status)}>{status}</Tag>
      )
    },
    {
      title: 'Score',
      dataIndex: 'score',
      key: 'score',
      render: (score) => (
        <Progress
          percent={score}
          size="small"
          status={score >= 80 ? 'success' : score >= 60 ? 'normal' : 'exception'}
        />
      )
    },
    {
      title: 'Issues',
      dataIndex: 'issues',
      key: 'issues'
    },
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity) => {
        const color = severity === 'High' ? 'red' : severity === 'Medium' ? 'orange' : 'green'
        return <Tag color={color}>{severity}</Tag>
      }
    },
    {
      title: 'Last Run',
      dataIndex: 'lastRun',
      key: 'lastRun'
    }
  ]

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
        <div style={{ marginTop: 16 }}>Loading application details...</div>
      </div>
    )
  }

  if (!finalAppData) {
    return (
      <Card>
        <Empty
          description="Application not found"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        >
          <Button type="primary" onClick={() => navigateToRoute('project-apps')}>
            Back to Project Apps
          </Button>
        </Empty>
      </Card>
    )
  }

  return (
    <div>
      {/* Header */}
      <Card style={{ marginBottom: 16 }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Space>
              <Button
                icon={<ArrowLeftOutlined />}
                onClick={() => navigateToRoute('project-apps')}
              >
                Back to Project Apps
              </Button>
              <Title level={3} style={{ margin: 0 }}>
                <AppstoreOutlined style={{ marginRight: 8 }} />
                {finalAppData.name}
              </Title>
              <Tag color={getStatusColor(finalAppData.status)}>{finalAppData.status}</Tag>
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<GithubOutlined />} href={finalAppData.repositoryUrl} target="_blank">
                Repository
              </Button>
              <Button icon={<LinkOutlined />} href={finalAppData.deploymentUrl} target="_blank">
                Live App
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Overview Cards */}
      <Row gutter={16} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ color: '#52c41a', margin: 0 }}>
                {finalAppData.healthScore}%
              </Title>
              <Text type="secondary">Health Score</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ color: '#1890ff', margin: 0 }}>
                {finalAppData.securityScore}%
              </Title>
              <Text type="secondary">Security Score</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ color: '#722ed1', margin: 0 }}>
                {finalAppData.metrics.uptime}%
              </Title>
              <Text type="secondary">Uptime</Text>
            </div>
          </Card>
        </Col>
        <Col xs={24} sm={12} md={6}>
          <Card>
            <div style={{ textAlign: 'center' }}>
              <Title level={2} style={{ color: '#fa8c16', margin: 0 }}>
                {finalAppData.metrics.responseTime}ms
              </Title>
              <Text type="secondary">Avg Response</Text>
            </div>
          </Card>
        </Col>
      </Row>

      {/* Main Content Tabs */}
      <Card>
        <Tabs
          defaultActiveKey="overview"
          items={[
            {
              key: 'overview',
              label: 'Overview',
              children: (
                <div>
                  <Row gutter={16}>
                    <Col xs={24} lg={12}>
                      <Descriptions title="Application Information" bordered column={1}>
                        <Descriptions.Item label="Name">{finalAppData.name}</Descriptions.Item>
                        <Descriptions.Item label="Project">{finalAppData.project}</Descriptions.Item>
                        <Descriptions.Item label="Technology">{finalAppData.technology}</Descriptions.Item>
                        <Descriptions.Item label="Framework">{finalAppData.framework}</Descriptions.Item>
                        <Descriptions.Item label="Database">{finalAppData.database}</Descriptions.Item>
                        <Descriptions.Item label="Version">{finalAppData.version}</Descriptions.Item>
                        <Descriptions.Item label="Environment">{finalAppData.environment}</Descriptions.Item>
                        <Descriptions.Item label="Last Deployment">{finalAppData.lastDeployment}</Descriptions.Item>
                      </Descriptions>
                    </Col>
                    <Col xs={24} lg={12}>
                      <Card title="Performance Metrics" size="small">
                        <Row gutter={16}>
                          <Col span={12}>
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                              <Progress
                                type="circle"
                                percent={finalAppData.metrics.uptime}
                                format={percent => `${percent}%`}
                                status="success"
                              />
                              <div style={{ marginTop: 8 }}>Uptime</div>
                            </div>
                          </Col>
                          <Col span={12}>
                            <div style={{ textAlign: 'center', marginBottom: 16 }}>
                              <Progress
                                type="circle"
                                percent={Math.min(100, (1000 - finalAppData.metrics.responseTime) / 10)}
                                format={() => `${finalAppData.metrics.responseTime}ms`}
                                status="normal"
                              />
                              <div style={{ marginTop: 8 }}>Response Time</div>
                            </div>
                          </Col>
                        </Row>
                        <Descriptions size="small" column={1}>
                          <Descriptions.Item label="Error Rate">{finalAppData.metrics.errorRate}%</Descriptions.Item>
                          <Descriptions.Item label="Throughput">{finalAppData.metrics.throughput} req/min</Descriptions.Item>
                        </Descriptions>
                      </Card>
                    </Col>
                  </Row>
                  <div style={{ marginTop: 16 }}>
                    <Paragraph>{finalAppData.description}</Paragraph>
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col xs={24} lg={12}>
                        <Card title="Deployment Highlights" size="small">
                          <Timeline
                            items={(finalAppData.deploymentHistory || []).slice(0,4).map(d => ({
                              children: (
                                <span>
                                  <strong>{d.version}</strong> — {d.status} <Text type="secondary">({d.date})</Text>
                                </span>
                              )
                            }))}
                          />
                        </Card>
                      </Col>
                      <Col xs={24} lg={12}>
                        <Card title="Service & Links" size="small">
                          <Descriptions column={1} size="small">
                            <Descriptions.Item label="Repository">
                              <a href={finalAppData.repositoryUrl} target="_blank" rel="noreferrer">{finalAppData.repositoryUrl}</a>
                            </Descriptions.Item>
                            <Descriptions.Item label="Deployment">
                              <a href={finalAppData.deploymentUrl} target="_blank" rel="noreferrer">{finalAppData.deploymentUrl}</a>
                            </Descriptions.Item>
                            <Descriptions.Item label="Environment">{finalAppData.environment}</Descriptions.Item>
                            <Descriptions.Item label="Last Deployment">{finalAppData.lastDeployment}</Descriptions.Item>
                          </Descriptions>
                        </Card>
                      </Col>
                    </Row>
                    <Row gutter={16} style={{ marginTop: 8 }}>
                      <Col xs={24} md={12}>
                        <Card title="Configuration Summary" size="small">
                          <Row gutter={16}>
                            <Col xs={12}>
                              <Statistic title="Env Variables" value={envVarCount} />
                            </Col>
                            <Col xs={12}>
                              <Statistic title="Sensitive" value={sensitiveCount} valueStyle={{ color: sensitiveCount > 0 ? '#fa541c' : undefined }} />
                            </Col>
                          </Row>
                        </Card>
                      </Col>
                      <Col xs={24} md={12}>
                        <Card title="Recent Logs" size="small">
                          <List
                            size="small"
                            dataSource={recentLogs}
                            renderItem={(log) => (
                              <List.Item>
                                <Space>
                                  <Tag color={log.level === 'ERROR' ? 'red' : log.level === 'WARN' ? 'orange' : 'blue'}>{log.level}</Tag>
                                  <Text>{log.message}</Text>
                                  <Text type="secondary">{log.timestamp}</Text>
                                </Space>
                              </List.Item>
                            )}
                          />
                        </Card>
                      </Col>
                    </Row>
                  </div>
                </div>
              )
            },
            {
              key: 'configuration',
              label: 'Configuration',
              children: (

                <Card title="Environment Variables" size="small">
              <Table
                dataSource={finalAppData.environmentVariables}
                columns={[
                  {
                    title: 'Key',
                    dataIndex: 'key',
                    key: 'key'
                  },
                  {
                    title: 'Value',
                    dataIndex: 'value',
                    key: 'value',
                    render: (value, record) => (
                      <Text code={!record.sensitive}>
                        {record.sensitive ? '***REDACTED***' : value}
                      </Text>
                    )
                  },
                  {
                    title: 'Sensitive',
                    dataIndex: 'sensitive',
                    key: 'sensitive',
                    render: (sensitive) => (
                      <Tag color={sensitive ? 'red' : 'green'}>
                        {sensitive ? 'Yes' : 'No'}
                      </Tag>
                    )
                  }
                ]}
                rowKey="key"
                pagination={false}
                size="small"
              />
                </Card>
              )
            },
            {
              key: 'deployment',
              label: 'Deployment History',
              children: (
                <Table
              dataSource={finalAppData.deploymentHistory}
              columns={deploymentColumns}
              rowKey="version"
              pagination={{ pageSize: 5 }}
                />
              )
            },
            {
              key: 'security',

              label: 'Security Scans',
              children: (
                <div>
                  <Alert
              message="Security Compliance Status"
              description={`Application is ${finalAppData.complianceStatus.toLowerCase()} with DOD security standards.`}
              type={finalAppData.complianceStatus === 'Compliant' ? 'success' : 'warning'}
              showIcon
              style={{ marginBottom: 16 }}
            />
            <Table
              dataSource={finalAppData.securityScans}
              columns={securityColumns}
              rowKey="type"
              pagination={false}
                  />
                </div>
              )
            },
            {
              key: 'team',
              label: 'Team & Access',
              children: (
                <Card title="Team Members" size="small">
              <List
                dataSource={finalAppData.team}
                renderItem={(member) => (
                  <List.Item>
                    <List.Item.Meta
                      avatar={<Avatar>{member.avatar}</Avatar>}
                      title={member.name}
                      description={member.role}
                    />
                  </List.Item>
                )}
              />
                </Card>
              )
            }
          ]}
        />
      </Card>
    </div>
  )
}

export default ProjectAppDetail
