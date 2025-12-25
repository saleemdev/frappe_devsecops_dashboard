import React, { useState } from 'react'
import { Layout, Typography, Button, Card, Space, theme, Row, Col, Alert } from 'antd'
import {
  LockOutlined,
  LoginOutlined,
  SafetyOutlined,
  BulbOutlined,
  BulbFilled,
  CheckCircleOutlined,
  TeamOutlined,
  BarChartOutlined,
  SecurityScanOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import { getRedirectMessage } from '../utils/redirectUtils'

const { Header, Content } = Layout
const { Title, Text, Paragraph } = Typography

function UnauthorizedPage({ isDarkMode, toggleTheme, loginRedirectUrl }) {
  const { token } = theme.useToken()
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  const handleLogin = () => {
    setIsLoggingIn(true)
    // Provide immediate visual feedback
    setTimeout(() => {
      window.location.href = loginRedirectUrl || '/login'
    }, 200)
  }

  // Feature highlights with icons
  const features = [
    {
      icon: <BarChartOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />,
      title: 'Project Metrics',
      description: 'Real-time insights into project performance and delivery'
    },
    {
      icon: <TeamOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />,
      title: 'Team Utilization',
      description: 'Track team capacity and resource allocation'
    },
    {
      icon: <SecurityScanOutlined style={{ fontSize: '24px', color: token.colorPrimary }} />,
      title: 'Security Insights',
      description: 'Monitor security posture across your infrastructure'
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: token.colorBgLayout }}>
      {/* Simplified Header */}
      <Header
        style={{
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorderSecondary}`,
          padding: '0 24px',
          boxShadow: '0 1px 4px rgba(0, 0, 0, 0.05)',
          position: 'sticky',
          top: 0,
          zIndex: 10
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '64px',
          maxWidth: '1200px',
          margin: '0 auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              background: `linear-gradient(135deg, ${token.colorPrimary}, ${token.colorPrimaryHover})`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <SafetyOutlined style={{ fontSize: '20px', color: '#fff' }} />
            </div>
            <Title
              level={4}
              style={{
                margin: 0,
                color: token.colorText,
                fontWeight: '600',
                letterSpacing: '-0.02em'
              }}
            >
              DevSecOps Dashboard
            </Title>
          </div>

          <Button
            type="text"
            icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
            onClick={toggleTheme}
            style={{
              color: token.colorTextSecondary,
              borderRadius: '8px'
            }}
            aria-label={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDarkMode ? 'Light' : 'Dark'} Mode
          </Button>
        </div>
      </Header>

      <Content
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '48px 24px',
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <div style={{ maxWidth: '1000px', width: '100%' }}>
          <Row gutter={[48, 48]} align="middle">
            {/* Left Column - Main Card */}
            <Col xs={24} lg={12}>
              <Card
                style={{
                  boxShadow: isDarkMode
                    ? '0 4px 24px rgba(0, 0, 0, 0.4)'
                    : '0 4px 24px rgba(0, 0, 0, 0.08)',
                  borderRadius: '16px',
                  border: 'none',
                  overflow: 'hidden'
                }}
                bodyStyle={{ padding: '48px 40px' }}
              >
                <Space direction="vertical" size={24} style={{ width: '100%' }}>
                  {/* Icon with animated gradient background */}
                  <div style={{
                    width: '72px',
                    height: '72px',
                    borderRadius: '16px',
                    background: `linear-gradient(135deg, ${token.colorPrimaryBg}, ${token.colorPrimaryBgHover})`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '8px'
                  }}>
                    <LockOutlined style={{ fontSize: '36px', color: token.colorPrimary }} />
                  </div>

                  {/* Clear Hierarchy - Title & Description */}
                  <div>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: '#8c8c8c',
                        display: 'block',
                        marginBottom: '12px'
                      }}
                    >
                      Access Control
                    </Text>
                    <Title
                      level={2}
                      style={{
                        margin: 0,
                        marginBottom: '12px',
                        fontWeight: '700',
                        fontSize: '32px',
                        letterSpacing: '-0.02em',
                        color: token.colorText
                      }}
                    >
                      Authentication Required
                    </Title>
                    <Paragraph
                      style={{
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: token.colorTextSecondary,
                        margin: 0
                      }}
                    >
                      Access to the DevSecOps Dashboard requires authentication.
                      Please sign in with your Frappe account to continue.
                    </Paragraph>
                  </div>

                  {/* Redirect Message Alert */}
                  {getRedirectMessage() && (
                    <Alert
                      message="Redirect Notice"
                      description={getRedirectMessage()}
                      type="info"
                      showIcon
                      style={{ borderRadius: '8px' }}
                    />
                  )}

                  {/* Primary Action - Login Button */}
                  <Button
                    type="primary"
                    size="large"
                    icon={<LoginOutlined />}
                    onClick={handleLogin}
                    loading={isLoggingIn}
                    block
                    style={{
                      height: '48px',
                      fontSize: '14px',
                      fontWeight: '600',
                      borderRadius: '8px',
                      boxShadow: `0 4px 16px ${token.colorPrimaryBg}`,
                      border: 'none'
                    }}
                  >
                    {isLoggingIn ? 'Redirecting...' : 'Sign In to Continue'}
                    {!isLoggingIn && <ArrowRightOutlined style={{ marginLeft: '8px' }} />}
                  </Button>

                  {/* Help Text */}
                  <div style={{
                    padding: '16px',
                    borderRadius: '8px',
                    backgroundColor: token.colorBgLayout,
                    border: `1px solid ${token.colorBorderSecondary}`
                  }}>
                    <Text
                      type="secondary"
                      style={{
                        fontSize: '11px',
                        fontWeight: '500',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        color: '#8c8c8c',
                        display: 'block',
                        marginBottom: '6px'
                      }}
                    >
                      Need Help?
                    </Text>
                    <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
                      Contact your system administrator or check your network connection if you're experiencing issues.
                    </Text>
                  </div>
                </Space>
              </Card>
            </Col>

            {/* Right Column - Feature Highlights */}
            <Col xs={24} lg={12}>
              <Space direction="vertical" size={24} style={{ width: '100%' }}>
                <div>
                  <Text
                    type="secondary"
                    style={{
                      fontSize: '11px',
                      fontWeight: '500',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      color: '#8c8c8c',
                      display: 'block',
                      marginBottom: '8px'
                    }}
                  >
                    Platform Features
                  </Text>
                  <Title level={3} style={{ marginBottom: '8px', fontWeight: '600' }}>
                    What you'll get access to
                  </Title>
                  <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                    Once authenticated, you'll be able to:
                  </Text>
                </div>

                {features.map((feature, index) => (
                  <Card
                    key={index}
                    style={{
                      borderRadius: '12px',
                      border: `1px solid ${token.colorBorderSecondary}`,
                      transition: 'all 0.3s ease',
                      cursor: 'default'
                    }}
                    bodyStyle={{ padding: '20px' }}
                    hoverable
                  >
                    <Space size={16}>
                      <div style={{
                        width: '48px',
                        height: '48px',
                        borderRadius: '10px',
                        backgroundColor: token.colorPrimaryBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}>
                        {feature.icon}
                      </div>
                      <div style={{ flex: 1 }}>
                        <Title level={5} style={{ margin: 0, marginBottom: '4px', fontWeight: '600', fontSize: '14px' }}>
                          {feature.title}
                        </Title>
                        <Text style={{ fontSize: '12px', color: token.colorTextSecondary }}>
                          {feature.description}
                        </Text>
                      </div>
                      <CheckCircleOutlined style={{ fontSize: '20px', color: token.colorSuccess }} />
                    </Space>
                  </Card>
                ))}
              </Space>
            </Col>
          </Row>

          {/* Footer Note */}
          <div style={{
            marginTop: '48px',
            padding: '24px',
            textAlign: 'center',
            borderTop: `1px solid ${token.colorBorderSecondary}`
          }}>
            <Text
              type="secondary"
              style={{
                fontSize: '11px',
                fontWeight: '500',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                color: '#8c8c8c',
                display: 'block',
                marginBottom: '6px'
              }}
            >
              Security Notice
            </Text>
            <Text style={{ fontSize: '12px', color: token.colorTextTertiary }}>
              Secured with enterprise-grade authentication • Your data is encrypted and protected
            </Text>
          </div>
        </div>
      </Content>
    </Layout>
  )
}

export default UnauthorizedPage
