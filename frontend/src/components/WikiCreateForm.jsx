import { useState, useEffect } from 'react'
import {
  Card,
  Form,
  Input,
  Button,
  Row,
  Col,
  Space,
  message,
  Typography,
  Divider
} from 'antd'
import {
  ArrowLeftOutlined,
  SaveOutlined,
  FolderOutlined
} from '@ant-design/icons'
import { createWikiSpace } from '../api/wiki'

const { Title, Text } = Typography

/**
 * WikiCreateForm Component
 * Professional form for creating new Wiki Spaces
 * Based on ProjectCreateForm design pattern
 */
function WikiCreateForm({ navigateToRoute }) {
  const [form] = Form.useForm()
  const [loading, setLoading] = useState(false)

  const generateSlug = (text) => {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
  }

  const handleSubmit = async (values) => {
    try {
      setLoading(true)

      const spaceData = {
        name: values.spaceName,
        route: values.route || generateSlug(values.spaceName),
        description: values.description || ''
      }

      console.log('Creating wiki space with data:', spaceData)
      const createdSpace = await createWikiSpace(spaceData)
      console.log('Created wiki space response:', createdSpace)

      message.success('Wiki space created successfully')
      form.resetFields()

      // Signal WikiHome to refresh on next visit and remember last created
      try {
        sessionStorage.setItem('wiki:refreshOnNextVisit', '1')
        if (createdSpace && createdSpace.name) {
          sessionStorage.setItem('wiki:lastCreatedSpaceName', createdSpace.name)
        }
      } catch (e) { /* ignore storage errors */ }

      // Navigate to the new space or back to wiki home
      if (createdSpace && createdSpace.name) {
        console.log('Navigating to wiki-space:', createdSpace.name)
        navigateToRoute('wiki-space', createdSpace.name)
      } else {
        console.log('No space name in response, navigating to wiki home')
        navigateToRoute('wiki')
      }
    } catch (error) {
      console.error('Error creating wiki space:', error)
      message.error(error.message || 'Failed to create wiki space')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f5f5f5', minHeight: '100vh' }}>
      {/* Header */}
      <Card
        style={{
          marginBottom: '24px',
          borderRadius: '12px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}
      >
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            onClick={() => navigateToRoute('wiki')}
            style={{ padding: '4px 8px' }}
          >
            Back to Wiki
          </Button>
          <Title level={2} style={{ margin: 0, fontSize: '28px', fontWeight: 600 }}>
            Create New Wiki Space
          </Title>
          <Text type="secondary">
            Create a new wiki space to organize your documentation
          </Text>
        </Space>
      </Card>

      {/* Form */}
      <Row gutter={[24, 24]}>
        <Col xs={24} lg={16}>
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
            }}
          >
            <Form
              form={form}
              layout="vertical"
              onFinish={handleSubmit}
              autoComplete="off"
            >
              {/* Space Name */}
              <Form.Item
                label="Space Name"
                name="spaceName"
                rules={[
                  { required: true, message: 'Please enter a space name' },
                  { min: 2, message: 'Space name must be at least 2 characters' }
                ]}
              >
                <Input
                  placeholder="e.g., API Documentation, User Guides"
                  size="large"
                  prefix={<FolderOutlined />}
                />
              </Form.Item>

              {/* Route (Optional) */}
              <Form.Item
                label="Route (Optional)"
                name="route"
                tooltip="Auto-generated from space name if not provided"
              >
                <Input
                  placeholder="e.g., api-documentation"
                  size="large"
                />
              </Form.Item>

              {/* Description */}
              <Form.Item
                label="Description (Optional)"
                name="description"
              >
                <Input.TextArea
                  placeholder="Describe the purpose of this wiki space"
                  rows={4}
                />
              </Form.Item>

              <Divider />

              {/* Action Buttons */}
              <Form.Item>
                <Space>
                  <Button
                    type="primary"
                    htmlType="submit"
                    loading={loading}
                    icon={<SaveOutlined />}
                    size="large"
                  >
                    Create Wiki Space
                  </Button>
                  <Button
                    onClick={() => navigateToRoute('wiki')}
                    size="large"
                  >
                    Cancel
                  </Button>
                </Space>
              </Form.Item>
            </Form>
          </Card>
        </Col>

        {/* Info Sidebar */}
        <Col xs={24} lg={8}>
          <Card
            style={{
              borderRadius: '12px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              background: '#fafafa'
            }}
          >
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              <div>
                <Title level={5}>What is a Wiki Space?</Title>
                <Text type="secondary">
                  A wiki space is a container for organizing related documentation pages. You can create multiple spaces to organize documentation by topic, project, or team.
                </Text>
              </div>

              <Divider />

              <div>
                <Title level={5}>Best Practices</Title>
                <ul style={{ margin: 0, paddingLeft: '20px' }}>
                  <li><Text type="secondary">Use clear, descriptive names</Text></li>
                  <li><Text type="secondary">Keep routes simple and URL-friendly</Text></li>
                  <li><Text type="secondary">Add a meaningful description</Text></li>
                  <li><Text type="secondary">Organize related pages together</Text></li>
                </ul>
              </div>
            </Space>
          </Card>
        </Col>
      </Row>
    </div>
  )
}

export default WikiCreateForm

