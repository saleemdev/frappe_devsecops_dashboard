import { Card, Empty, Alert, Typography, Button, Space, Divider, Row, Col, Tag } from 'antd'
import {
  RobotOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  ApiOutlined
} from '@ant-design/icons'

const { Title, Paragraph, Text } = Typography

/**
 * AskAI Component
 * AI-powered help and assistance for DevSecOps workflows
 * Phase 1: UI and placeholder implementation
 * Phase 2: AI model integration (future)
 */
export default function AskAI() {
  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
          <RobotOutlined style={{ fontSize: '32px', color: '#1890ff' }} />
          <Title level={2} style={{ margin: 0 }}>
            Ask AI
          </Title>
        </div>
        <Paragraph type="secondary" style={{ fontSize: '16px', marginBottom: 0 }}>
          AI-powered assistance for DevSecOps workflows, change requests, and project management
        </Paragraph>
      </div>

      {/* Coming Soon Banner */}
      <Alert
        message="Coming Soon"
        description="The AI assistant is currently under development. We're integrating advanced AI models to provide intelligent assistance for your DevSecOps operations."
        type="info"
        showIcon
        icon={<BulbOutlined />}
        style={{ marginBottom: '24px' }}
      />

      {/* Feature Overview */}
      <Row gutter={[16, 16]} style={{ marginBottom: '32px' }}>
        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ height: '100%', textAlign: 'center' }}
          >
            <CheckCircleOutlined style={{ fontSize: '32px', color: '#52c41a', marginBottom: '12px' }} />
            <Title level={5}>Change Request Assistance</Title>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              Get AI-powered suggestions for creating and managing change requests
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ height: '100%', textAlign: 'center' }}
          >
            <ApiOutlined style={{ fontSize: '32px', color: '#1890ff', marginBottom: '12px' }} />
            <Title level={5}>Project Insights</Title>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              Analyze project data and get recommendations for optimization
            </Paragraph>
          </Card>
        </Col>

        <Col xs={24} sm={12} md={8}>
          <Card
            hoverable
            style={{ height: '100%', textAlign: 'center' }}
          >
            <BulbOutlined style={{ fontSize: '32px', color: '#faad14', marginBottom: '12px' }} />
            <Title level={5}>Best Practices</Title>
            <Paragraph type="secondary" style={{ fontSize: '12px' }}>
              Learn DevSecOps best practices and security recommendations
            </Paragraph>
          </Card>
        </Col>
      </Row>

      {/* Planned Features */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>Planned Features</Title>
        <Divider />
        
        <div style={{ marginBottom: '16px' }}>
          <Tag color="blue" style={{ marginBottom: '8px' }}>Phase 1 - UI Setup</Tag>
          <Paragraph>
            ✓ Navigation menu integration<br />
            ✓ Route configuration<br />
            ✓ Component structure and layout
          </Paragraph>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <Tag color="orange" style={{ marginBottom: '8px' }}>Phase 2 - AI Integration</Tag>
          <Paragraph>
            • Chat interface with message history<br />
            • Context-aware assistance for Change Requests<br />
            • Project analysis and recommendations<br />
            • Integration with multiple AI models (OpenAI, Claude, local models)<br />
            • Real-time suggestions and auto-complete
          </Paragraph>
        </div>

        <div>
          <Tag color="green" style={{ marginBottom: '8px' }}>Phase 3 - Advanced Features</Tag>
          <Paragraph>
            • Document generation and templates<br />
            • Workflow automation suggestions<br />
            • Risk assessment and compliance checks<br />
            • Team collaboration features
          </Paragraph>
        </div>
      </Card>

      {/* Integration Points Documentation */}
      <Card style={{ marginBottom: '24px' }}>
        <Title level={4}>Integration Architecture</Title>
        <Divider />
        
        <Paragraph>
          <Text strong>Backend API Endpoint:</Text><br />
          <code style={{ backgroundColor: '#f5f5f5', padding: '4px 8px', borderRadius: '4px' }}>
            /api/method/frappe_devsecops_dashboard.api.ask_ai.*
          </code>
        </Paragraph>

        <Paragraph style={{ marginTop: '12px' }}>
          <Text strong>Supported AI Models:</Text><br />
          • OpenAI GPT-4 / GPT-3.5-turbo<br />
          • Anthropic Claude<br />
          • Local LLM models (via Ollama)<br />
          • Custom enterprise models
        </Paragraph>

        <Paragraph style={{ marginTop: '12px' }}>
          <Text strong>Configuration:</Text><br />
          AI model settings will be managed via Frappe DocType configuration<br />
          API keys stored securely in environment variables or Frappe Config Singleton
        </Paragraph>
      </Card>

      {/* Call to Action */}
      <Card style={{ backgroundColor: '#f0f5ff', border: '1px solid #b3d8ff' }}>
        <div style={{ textAlign: 'center' }}>
          <Title level={4}>Ready to Get Started?</Title>
          <Paragraph>
            The AI assistant will be available soon. Check back for updates!
          </Paragraph>
          <Space>
            <Button type="primary" icon={<ClockCircleOutlined />}>
              Notify Me When Ready
            </Button>
            <Button>
              View Documentation
            </Button>
          </Space>
        </div>
      </Card>
    </div>
  )
}

