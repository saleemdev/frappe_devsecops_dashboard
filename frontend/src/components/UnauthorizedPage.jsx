import React from 'react'
import { Layout, Typography, Button, Card, Space, theme } from 'antd'
import {
  LockOutlined,
  LoginOutlined,
  SafetyOutlined,
  BulbOutlined,
  BulbFilled
} from '@ant-design/icons'
import { getRedirectMessage } from '../utils/redirectUtils'

const { Header, Content } = Layout
const { Title, Text } = Typography

function UnauthorizedPage({ isDarkMode, toggleTheme, loginRedirectUrl }) {
  const { token } = theme.useToken()

  const handleLogin = () => {
    // Redirect to Frappe login page with redirect parameter
    window.location.href = loginRedirectUrl || '/login'
  }

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: token.colorBgLayout }}>
      <Header 
        style={{ 
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`,
          padding: '0 16px',
          boxShadow: isDarkMode 
            ? '0 2px 8px rgba(0, 0, 0, 0.3)' 
            : '0 2px 8px rgba(0, 0, 0, 0.06)'
        }}
      >
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          height: '100%'
        }}>
          {/* Left side - Title with icon */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <SafetyOutlined
              className="header-icon"
              style={{
                color: token.colorPrimary,
                marginRight: '4px'
              }}
            />
            <Title
              level={4}
              className="header-title"
              style={{
                margin: 0,
                color: token.colorText,
                lineHeight: '1.2'
              }}
            >
              DevSecOps Dashboard
            </Title>
          </div>

          {/* Right side - Theme toggle */}
          <Button
            type="text"
            icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
            onClick={toggleTheme}
            style={{ color: token.colorText }}
            size="small"
            title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            <span style={{ display: window.innerWidth > 576 ? 'inline' : 'none' }}>
              {isDarkMode ? 'Light' : 'Dark'}
            </span>
          </Button>
        </div>
      </Header>

      <Content 
        style={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px',
          backgroundColor: token.colorBgLayout,
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        <Card
          className="unauthorized-card"
          style={{
            width: '100%',
            textAlign: 'center',
            boxShadow: isDarkMode
              ? '0 8px 32px rgba(0, 0, 0, 0.4)'
              : '0 8px 32px rgba(0, 0, 0, 0.12)',
            borderRadius: '12px',
            border: `1px solid ${token.colorBorder}`
          }}
          bodyStyle={{ padding: '32px 24px' }}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Lock Icon */}
            <div style={{ marginBottom: '16px' }}>
              <LockOutlined
                className="unauthorized-icon"
                style={{
                  color: token.colorTextSecondary,
                  opacity: 0.6
                }}
              />
            </div>

            {/* Title */}
            <Title
              level={2}
              className="unauthorized-title"
              style={{
                color: token.colorText,
                marginBottom: '8px',
                fontWeight: '600'
              }}
            >
              Unauthorized Access
            </Title>

            {/* Description */}
            <div style={{ marginBottom: '24px' }}>
              <Text
                style={{
                  color: token.colorTextSecondary,
                  fontSize: '16px',
                  lineHeight: '1.6',
                  display: 'block',
                  marginBottom: '12px'
                }}
              >
                You need to be logged in to access the DevSecOps Dashboard.
              </Text>
              <Text
                style={{
                  color: token.colorTextTertiary,
                  fontSize: '14px',
                  lineHeight: '1.5',
                  display: 'block',
                  marginBottom: '8px'
                }}
              >
                Please log in with your Frappe account to view project metrics,
                team utilization, and delivery lifecycle information.
              </Text>
              <Text
                style={{
                  color: token.colorTextTertiary,
                  fontSize: '13px',
                  lineHeight: '1.4',
                  fontStyle: 'italic'
                }}
              >
                {getRedirectMessage()}
              </Text>
            </div>

            {/* Login Button */}
            <Button
              type="primary"
              size="large"
              icon={<LoginOutlined />}
              onClick={handleLogin}
              style={{
                height: '48px',
                fontSize: '16px',
                fontWeight: '500',
                borderRadius: '8px',
                minWidth: '160px',
                boxShadow: '0 2px 8px rgba(24, 144, 255, 0.2)'
              }}
            >
              Login to Continue
            </Button>

            {/* Additional Info */}
            <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Text 
                style={{ 
                  color: token.colorTextTertiary,
                  fontSize: '12px',
                  lineHeight: '1.4'
                }}
              >
                If you're having trouble logging in, please contact your system administrator 
                or check your network connection.
              </Text>
            </div>
          </Space>
        </Card>
      </Content>
    </Layout>
  )
}

export default UnauthorizedPage
