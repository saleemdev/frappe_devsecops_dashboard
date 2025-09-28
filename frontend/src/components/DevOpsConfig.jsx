import React, { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Tabs,
  Row,
  Col,
  Typography,
  Space,
  Switch,
  InputNumber,
  Select,
  Collapse,
  message,
  Divider,
  Alert,
  Tooltip
} from 'antd'
import {
  DockerOutlined,
  CloudServerOutlined,
  BuildOutlined,
  SaveOutlined,
  ReloadOutlined,
  SettingOutlined,
  SecurityScanOutlined,
  DatabaseOutlined,
  ApiOutlined,
  InfoCircleOutlined
} from '@ant-design/icons'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input
const { Option } = Select
const { Panel } = Collapse

const DevOpsConfig = () => {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('docker')
  const [hasChanges, setHasChanges] = useState(false)

  // Mock configuration data
  const mockConfig = {
    docker: {
      registryUrl: 'registry.company.com',
      username: 'devops-user',
      password: '',
      enableBuildCache: true,
      buildTimeout: 30,
      defaultBaseImage: 'node:18-alpine',
      buildArgs: 'NODE_ENV=production\nPORT=3000',
      enableMultiStage: true,
      enableSecurity: true
    },
    kubernetes: {
      clusterEndpoint: 'https://k8s.company.com:6443',
      namespace: 'default',
      serviceAccount: 'devops-sa',
      configContext: 'production',
      enableAutoScaling: true,
      minReplicas: 2,
      maxReplicas: 10,
      cpuThreshold: 70,
      memoryThreshold: 80,
      enableIngress: true,
      ingressClass: 'nginx',
      enableTLS: true
    },
    kaniko: {
      buildContext: '/workspace',
      cacheRepo: 'registry.company.com/cache',
      enableCache: true,
      cacheRunLayers: true,
      enableReproducibleBuilds: true,
      skipTLSVerify: false,
      verbosity: 'info',
      buildArgs: 'BUILD_DATE=$(date)\nVCS_REF=$(git rev-parse HEAD)',
      enableSecurity: true,
      scanImage: true
    }
  }

  useEffect(() => {
    loadConfiguration()
  }, [])

  const loadConfiguration = async () => {
    setLoading(true)
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      form.setFieldsValue(mockConfig)
    } catch (error) {
      message.error('Failed to load configuration')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500))
      
      message.success('Configuration saved successfully')
      setHasChanges(false)
    } catch (error) {
      if (error.errorFields) {
        message.error('Please fix validation errors before saving')
      } else {
        message.error('Failed to save configuration')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleReset = () => {
    form.setFieldsValue(mockConfig)
    setHasChanges(false)
    message.info('Configuration reset to saved values')
  }

  const handleFormChange = () => {
    setHasChanges(true)
  }

  const dockerConfigForm = (
    <Card title={
      <Space>
        <DockerOutlined style={{ color: '#2496ED' }} />
        Docker Configuration
      </Space>
    }>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['docker', 'registryUrl']}
            label="Registry URL"
            rules={[{ required: true, message: 'Please enter registry URL' }]}
          >
            <Input placeholder="registry.company.com" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['docker', 'defaultBaseImage']}
            label="Default Base Image"
            rules={[{ required: true, message: 'Please enter base image' }]}
          >
            <Input placeholder="node:18-alpine" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['docker', 'username']}
            label="Registry Username"
            rules={[{ required: true, message: 'Please enter username' }]}
          >
            <Input placeholder="devops-user" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['docker', 'password']}
            label="Registry Password"
          >
            <Input.Password placeholder="Enter password" />
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name={['docker', 'buildArgs']}
        label="Build Arguments"
        tooltip="One argument per line in KEY=VALUE format"
      >
        <TextArea
          rows={4}
          placeholder="NODE_ENV=production&#10;PORT=3000"
        />
      </Form.Item>

      <Collapse ghost>
        <Panel header="Advanced Settings" key="advanced">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['docker', 'buildTimeout']}
                label="Build Timeout (minutes)"
              >
                <InputNumber min={5} max={120} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['docker', 'enableBuildCache']}
                label="Enable Build Cache"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['docker', 'enableMultiStage']}
                label="Multi-stage Builds"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['docker', 'enableSecurity']}
                label="Security Scanning"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Panel>
      </Collapse>
    </Card>
  )

  const kubernetesConfigForm = (
    <Card title={
      <Space>
        <CloudServerOutlined style={{ color: '#326CE5' }} />
        Kubernetes Configuration
      </Space>
    }>
      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['kubernetes', 'clusterEndpoint']}
            label="Cluster Endpoint"
            rules={[{ required: true, message: 'Please enter cluster endpoint' }]}
          >
            <Input placeholder="https://k8s.company.com:6443" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['kubernetes', 'namespace']}
            label="Default Namespace"
            rules={[{ required: true, message: 'Please enter namespace' }]}
          >
            <Input placeholder="default" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['kubernetes', 'serviceAccount']}
            label="Service Account"
          >
            <Input placeholder="devops-sa" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['kubernetes', 'configContext']}
            label="Config Context"
          >
            <Select placeholder="Select context">
              <Option value="development">Development</Option>
              <Option value="staging">Staging</Option>
              <Option value="production">Production</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Collapse ghost>
        <Panel header="Auto Scaling Configuration" key="autoscaling">
          <Row gutter={16}>
            <Col span={6}>
              <Form.Item
                name={['kubernetes', 'enableAutoScaling']}
                label="Enable Auto Scaling"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name={['kubernetes', 'minReplicas']}
                label="Min Replicas"
              >
                <InputNumber min={1} max={50} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={6}>
              <Form.Item
                name={['kubernetes', 'maxReplicas']}
                label="Max Replicas"
              >
                <InputNumber min={1} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name={['kubernetes', 'cpuThreshold']}
                label="CPU Threshold (%)"
              >
                <InputNumber min={10} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name={['kubernetes', 'memoryThreshold']}
                label="Memory Threshold (%)"
              >
                <InputNumber min={10} max={100} style={{ width: '100%' }} />
              </Form.Item>
            </Col>
          </Row>
        </Panel>

        <Panel header="Ingress Configuration" key="ingress">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['kubernetes', 'enableIngress']}
                label="Enable Ingress"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['kubernetes', 'ingressClass']}
                label="Ingress Class"
              >
                <Select placeholder="Select ingress class">
                  <Option value="nginx">NGINX</Option>
                  <Option value="traefik">Traefik</Option>
                  <Option value="istio">Istio</Option>
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['kubernetes', 'enableTLS']}
                label="Enable TLS"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Panel>
      </Collapse>
    </Card>
  )

  const kanikoConfigForm = (
    <Card title={
      <Space>
        <BuildOutlined style={{ color: '#FF6B35' }} />
        Kaniko Configuration
      </Space>
    }>
      <Alert
        message="Kaniko Security"
        description="Kaniko builds container images without requiring Docker daemon, providing enhanced security for CI/CD pipelines."
        type="info"
        showIcon
        style={{ marginBottom: '16px' }}
      />

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['kaniko', 'buildContext']}
            label="Build Context"
            rules={[{ required: true, message: 'Please enter build context' }]}
          >
            <Input placeholder="/workspace" />
          </Form.Item>
        </Col>
        <Col span={12}>
          <Form.Item
            name={['kaniko', 'cacheRepo']}
            label="Cache Repository"
          >
            <Input placeholder="registry.company.com/cache" />
          </Form.Item>
        </Col>
      </Row>

      <Row gutter={16}>
        <Col span={12}>
          <Form.Item
            name={['kaniko', 'verbosity']}
            label="Log Verbosity"
          >
            <Select placeholder="Select verbosity level">
              <Option value="panic">Panic</Option>
              <Option value="fatal">Fatal</Option>
              <Option value="error">Error</Option>
              <Option value="warn">Warning</Option>
              <Option value="info">Info</Option>
              <Option value="debug">Debug</Option>
              <Option value="trace">Trace</Option>
            </Select>
          </Form.Item>
        </Col>
      </Row>

      <Form.Item
        name={['kaniko', 'buildArgs']}
        label="Build Arguments"
        tooltip="Build-time variables for Kaniko"
      >
        <TextArea
          rows={3}
          placeholder="BUILD_DATE=$(date)&#10;VCS_REF=$(git rev-parse HEAD)"
        />
      </Form.Item>

      <Collapse ghost>
        <Panel header="Cache Settings" key="cache">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['kaniko', 'enableCache']}
                label="Enable Cache"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['kaniko', 'cacheRunLayers']}
                label="Cache RUN Layers"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['kaniko', 'enableReproducibleBuilds']}
                label="Reproducible Builds"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Panel>

        <Panel header="Security Settings" key="security">
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name={['kaniko', 'enableSecurity']}
                label="Security Scanning"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['kaniko', 'scanImage']}
                label="Scan Built Images"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name={['kaniko', 'skipTLSVerify']}
                label="Skip TLS Verify"
                valuePropName="checked"
              >
                <Switch />
              </Form.Item>
            </Col>
          </Row>
        </Panel>
      </Collapse>
    </Card>
  )

  const tabItems = [
    {
      key: 'docker',
      label: (
        <Space>
          <DockerOutlined />
          Docker
        </Space>
      ),
      children: dockerConfigForm
    },
    {
      key: 'kubernetes',
      label: (
        <Space>
          <CloudServerOutlined />
          Kubernetes
        </Space>
      ),
      children: kubernetesConfigForm
    },
    {
      key: 'kaniko',
      label: (
        <Space>
          <BuildOutlined />
          Kaniko
        </Space>
      ),
      children: kanikoConfigForm
    }
  ]

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <Row justify="space-between" align="middle">
          <Col>
            <Title level={3} style={{ margin: 0 }}>
              DevOps Configurations
            </Title>
            <Text type="secondary">
              Configure your DevOps tools and deployment settings
            </Text>
          </Col>
          <Col>
            <Space>
              <Button
                icon={<ReloadOutlined />}
                onClick={loadConfiguration}
                loading={loading}
              >
                Reset
              </Button>
              <Button
                type="primary"
                icon={<SaveOutlined />}
                onClick={handleSave}
                loading={loading}
                disabled={!hasChanges}
              >
                Save Configuration
              </Button>
            </Space>
          </Col>
        </Row>
        
        {hasChanges && (
          <Alert
            message="You have unsaved changes"
            description="Don't forget to save your configuration changes."
            type="warning"
            showIcon
            style={{ marginTop: '16px' }}
            action={
              <Space>
                <Button size="small" onClick={handleReset}>
                  Reset
                </Button>
                <Button size="small" type="primary" onClick={handleSave}>
                  Save
                </Button>
              </Space>
            }
          />
        )}
      </div>

      <Form
        form={form}
        layout="vertical"
        onValuesChange={handleFormChange}
      >
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
          size="large"
        />
      </Form>
    </div>
  )
}

export default DevOpsConfig
