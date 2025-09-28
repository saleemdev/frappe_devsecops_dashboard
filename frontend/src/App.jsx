import React, { useState, useEffect } from 'react'
import { Layout, Typography, Button, theme, Avatar, Dropdown, Space, Menu, Breadcrumb, Drawer } from 'antd'
import {
  BulbOutlined,
  BulbFilled,
  SafetyOutlined,
  UserOutlined,
  LogoutOutlined,
  DesktopOutlined,
  SettingOutlined,
  BellOutlined,
  DashboardOutlined,
  FileTextOutlined,
  AppstoreOutlined,
  BuildOutlined,
  HomeOutlined,
  ProjectOutlined,
  MenuOutlined,
  BarChartOutlined,
  ExclamationCircleOutlined
} from '@ant-design/icons'
import Dashboard from './components/Dashboard'
import UnauthorizedPage from './components/UnauthorizedPage'
import ChangeRequests from './components/ChangeRequests'
import ProjectApps from './components/ProjectApps'
import DevOpsConfig from './components/DevOpsConfig'
import MonitoringDashboards from './components/MonitoringDashboards'
import Incidents from './components/Incidents'
import { ConfigProvider } from 'antd'
import { buildLoginUrl, handlePostLoginRedirect, getCurrentUrlForRedirect } from './utils/redirectUtils'
import { useAuthStore, useNavigationStore } from './stores/index.js'

const { Header, Content, Sider } = Layout
const { Title, Text } = Typography

function App() {
  const [isDarkMode, setIsDarkMode] = useState(false)

  // Zustand stores
  const {
    isAuthenticated,
    user: userInfo,
    loading: authLoading,
    checkAuthentication,
    logout
  } = useAuthStore()

  const {
    currentRoute,
    selectedProjectId,
    showProjectDetail,
    selectedAppId,
    showAppDetail,
    selectedIncidentId,
    showIncidentDetail,
    isMobile,
    mobileMenuVisible,
    navigateToRoute,
    handleHashChange,
    getBreadcrumbs,
    setIsMobile,
    toggleMobileMenu
  } = useNavigationStore()

  // Route detection based on URL hash - now handled by navigation store
  useEffect(() => {
    // Set initial route
    handleHashChange()

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange)

    return () => {
      window.removeEventListener('hashchange', handleHashChange)
    }
  }, [handleHashChange])

  // Check authentication status
  useEffect(() => {
    checkAuthentication()
  }, [checkAuthentication])

  // Handle post-login redirects
  useEffect(() => {
    if (isAuthenticated === true) {
      handlePostLoginRedirect(isAuthenticated)
    }
  }, [isAuthenticated])



  // Navigation is now handled by the navigation store

  // Initialize CSRF token from window object (injected by Frappe)
  useEffect(() => {
    if (window.csrf_token) {
      // Set up axios defaults for CSRF token
      import('axios').then(axiosModule => {
        axiosModule.default.defaults.headers.common['X-Frappe-CSRF-Token'] = window.csrf_token
      })
    }
  }, [])

  // Update document theme attribute when dark mode changes
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDarkMode ? 'dark' : 'light')
  }, [isDarkMode])

  // Authentication is now handled by the auth store

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode)
  }

  // Logout is now handled by the auth store
  const handleLogout = logout

  // Enhanced theme configuration with professional design
  const themeConfig = {
    algorithm: isDarkMode ? theme.darkAlgorithm : theme.defaultAlgorithm,
    token: {
      colorPrimary: '#1677ff',
      colorSuccess: '#52c41a',
      colorWarning: '#faad14',
      colorError: '#ff4d4f',
      colorInfo: '#1677ff',
      borderRadius: 8,
      borderRadiusLG: 12,
      borderRadiusXS: 4,
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
      fontSize: 14,
      fontSizeLG: 16,
      fontSizeXL: 20,
      lineHeight: 1.5714285714285714,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
      boxShadowSecondary: '0 4px 16px rgba(0, 0, 0, 0.08)',
      colorBgLayout: isDarkMode ? '#141414' : '#f5f5f5',
      colorBgContainer: isDarkMode ? '#1f1f1f' : '#ffffff',
      colorBgElevated: isDarkMode ? '#262626' : '#ffffff',
      colorBorder: isDarkMode ? '#303030' : '#d9d9d9',
      colorBorderSecondary: isDarkMode ? '#424242' : '#f0f0f0',
      colorText: isDarkMode ? '#ffffff' : '#000000d9',
      colorTextSecondary: isDarkMode ? '#a6a6a6' : '#00000073',
      colorTextTertiary: isDarkMode ? '#737373' : '#00000045',
      colorFill: isDarkMode ? '#262626' : '#f5f5f5',
      colorFillSecondary: isDarkMode ? '#1f1f1f' : '#fafafa',
      colorFillTertiary: isDarkMode ? '#141414' : '#f5f5f5',
      colorFillQuaternary: isDarkMode ? '#0f0f0f' : '#f0f0f0'
    },
    components: {
      Layout: {
        headerBg: isDarkMode ? '#1f1f1f' : '#ffffff',
        bodyBg: isDarkMode ? '#141414' : '#f5f5f5',
        siderBg: isDarkMode ? '#1f1f1f' : '#ffffff'
      },
      Menu: {
        itemBg: 'transparent',
        itemSelectedBg: isDarkMode ? '#1677ff1a' : '#e6f4ff',
        itemHoverBg: isDarkMode ? '#262626' : '#f5f5f5',
        itemActiveBg: isDarkMode ? '#1677ff1a' : '#e6f4ff'
      },
      Card: {
        borderRadiusLG: 12,
        boxShadowTertiary: '0 2px 8px rgba(0, 0, 0, 0.06)'
      },
      Button: {
        borderRadius: 6,
        borderRadiusLG: 8,
        borderRadiusSM: 4
      },
      Input: {
        borderRadius: 6
      },
      Table: {
        borderRadiusLG: 8
      }
    }
  }

  // Show loading state while checking authentication
  if (isAuthenticated === null) {
    return (
      <ConfigProvider theme={themeConfig}>
        <Layout className="auth-loading">
          <div>Checking authentication...</div>
        </Layout>
      </ConfigProvider>
    )
  }

  // Show unauthorized page if not authenticated
  if (!isAuthenticated) {
    return (
      <ConfigProvider theme={themeConfig}>
        <UnauthorizedPage
          isDarkMode={isDarkMode}
          toggleTheme={toggleTheme}
          loginRedirectUrl={buildLoginUrl()}
        />
      </ConfigProvider>
    )
  }

  return (
    <ConfigProvider theme={themeConfig}>
      <AppContent
        isDarkMode={isDarkMode}
        toggleTheme={toggleTheme}
        userInfo={userInfo}
        onLogout={handleLogout}
        currentRoute={currentRoute}
        navigateToRoute={navigateToRoute}
        showProjectDetail={showProjectDetail}
        selectedProjectId={selectedProjectId}
        showAppDetail={showAppDetail}
        selectedAppId={selectedAppId}
        showIncidentDetail={showIncidentDetail}
        selectedIncidentId={selectedIncidentId}
      />
    </ConfigProvider>
  )
}

// Component that can access theme tokens
function AppContent({ isDarkMode, toggleTheme, userInfo, onLogout, currentRoute, navigateToRoute, showProjectDetail, selectedProjectId, showAppDetail, selectedAppId, showIncidentDetail, selectedIncidentId }) {
  const { token } = theme.useToken()

  // Mobile responsiveness state
  const [isMobile, setIsMobile] = useState(false)
  const [mobileMenuVisible, setMobileMenuVisible] = useState(false)

  // Check screen size for mobile responsiveness
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [])

  // Navigation menu items for horizontal navigation
  const navigationItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'change-requests',
      icon: <FileTextOutlined />,
      label: 'Change Requests'
    },
    {
      key: 'project-apps',
      icon: <AppstoreOutlined />,
      label: 'Project Apps'
    },
    {
      key: 'devops-config',
      icon: <BuildOutlined />,
      label: 'DevOps Config'
    },
    {
      key: 'monitoring-dashboards',
      icon: <BarChartOutlined />,
      label: 'Monitoring Dashboards'
    },
    {
      key: 'incidents',
      icon: <ExclamationCircleOutlined />,
      label: 'Incidents'
    }
  ]

  // Generate breadcrumb items based on current route
  const getBreadcrumbItems = () => {
    const items = [
      {
        title: <HomeOutlined />,
        onClick: () => navigateToRoute('dashboard')
      }
    ]

    if (showProjectDetail && selectedProjectId) {
      items.push(
        {
          title: 'Dashboard',
          onClick: () => navigateToRoute('dashboard')
        },
        {
          title: 'Projects',
          onClick: () => navigateToRoute('dashboard')
        },
        {
          title: selectedProjectId
        }
      )
    } else if (showAppDetail && selectedAppId) {
      // Get app name for breadcrumb
      const getAppName = (appId) => {
        const appNames = {
          'app-001': 'ePrescription API',
          'app-002': 'Patient Portal',
          'app-003': 'Mobile Health App',
          'app-004': 'Analytics Dashboard'
        }
        return appNames[appId] || appId
      }

      items.push(
        {
          title: 'Project Apps',
          onClick: () => navigateToRoute('project-apps')
        },
        {
          title: getAppName(selectedAppId)
        }
      )
    } else if (showIncidentDetail && selectedIncidentId) {
      // Get incident title for breadcrumb
      const getIncidentTitle = (incidentId) => {
        const incidentTitles = {
          'INC-001': 'Database Connection Timeout',
          'INC-002': 'Authentication Service Outage'
        }
        return incidentTitles[incidentId] || incidentId
      }

      items.push(
        {
          title: 'Incidents',
          onClick: () => navigateToRoute('incidents')
        },
        {
          title: getIncidentTitle(selectedIncidentId)
        }
      )
    } else {
      switch (currentRoute) {
        case 'change-requests':
          items.push({ title: 'Change Requests' })
          break
        case 'project-apps':
          items.push({ title: 'Project Apps' })
          break
        case 'devops-config':
          items.push({ title: 'DevOps Configuration' })
          break
        case 'monitoring-dashboards':
          items.push({ title: 'Monitoring Dashboards' })
          break
        case 'incidents':
          items.push({ title: 'Incidents' })
          break
        default:
          items.push({ title: 'Dashboard' })
      }
    }

    return items
  }

  // Settings dropdown menu items
  const settingsMenuItems = [
    {
      key: 'dashboard-preferences',
      icon: <DashboardOutlined />,
      label: 'Dashboard Preferences',
      onClick: () => {
        // Placeholder for future implementation
        console.log('Dashboard Preferences clicked')
      }
    },
    {
      key: 'notification-settings',
      icon: <BellOutlined />,
      label: 'Notification Settings',
      onClick: () => {
        // Placeholder for future implementation
        console.log('Notification Settings clicked')
      }
    }
  ]

  // User dropdown menu items
  const userMenuItems = [
    {
      key: 'switch-to-desk',
      icon: <DesktopOutlined />,
      label: 'Switch to Desk',
      onClick: () => {
        // Navigate to Frappe Desk
        window.location.href = '/app'
      }
    },
    {
      type: 'divider'
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: 'Logout',
      onClick: onLogout
    }
  ]

  return (
    <Layout style={{ minHeight: '100vh', backgroundColor: token.colorBgLayout }}>
      <Header
        style={{
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`,
          padding: '0 24px',
          boxShadow: isDarkMode
            ? '0 2px 8px rgba(0, 0, 0, 0.15)'
            : '0 2px 8px rgba(0, 0, 0, 0.06)',
          position: 'fixed',
          width: '100%',
          zIndex: 1000,
          height: '64px'
        }}
      >
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          height: '100%',
          maxWidth: '1200px',
          margin: '0 auto',
          padding: isMobile ? '0 16px' : '0'
        }}>
          {/* Left side - Logo and navigation */}
          <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? '12px' : '24px' }}>
            {/* Mobile hamburger menu button */}
            {isMobile && (
              <Button
                type="text"
                icon={<MenuOutlined />}
                onClick={() => setMobileMenuVisible(true)}
                style={{
                  color: token.colorText,
                  height: '40px',
                  width: '40px',
                  borderRadius: '8px'
                }}
              />
            )}

            {/* Logo and title */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <SafetyOutlined
                style={{
                  color: token.colorPrimary,
                  fontSize: isMobile ? '20px' : '24px'
                }}
              />
              <Title
                level={4}
                style={{
                  margin: 0,
                  color: token.colorText,
                  fontWeight: 600,
                  fontSize: isMobile ? '16px' : '18px',
                  whiteSpace: 'nowrap'
                }}
              >
                {isMobile ? 'DevSecOps' : 'DevSecOps Dashboard'}
              </Title>
            </div>

            {/* Desktop Horizontal Navigation Menu */}
            {!isMobile && (
              <Menu
                mode="horizontal"
                selectedKeys={[currentRoute]}
                style={{
                  backgroundColor: 'transparent',
                  border: 'none',
                  minWidth: '320px'
                }}
                items={navigationItems.map(item => ({
                  ...item,
                  onClick: () => navigateToRoute(item.key)
                }))}
              />
            )}
          </div>

          {/* Right side - Settings, User account and theme toggle */}
          <Space size="large">
            {/* Settings Dropdown */}
            <Dropdown
              menu={{ items: settingsMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <Button
                type="text"
                icon={<SettingOutlined />}
                style={{
                  color: token.colorText,
                  height: '40px',
                  width: '40px',
                  borderRadius: '8px'
                }}
              />
            </Dropdown>

            {/* User Dropdown */}
            <Dropdown
              menu={{ items: userMenuItems }}
              placement="bottomRight"
              trigger={['click']}
            >
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                transition: 'all 0.2s ease',
                backgroundColor: token.colorFillQuaternary,
                border: `1px solid ${token.colorBorder}`
              }}>
                <Avatar
                  size={32}
                  icon={<UserOutlined />}
                  style={{ backgroundColor: token.colorPrimary }}
                />
                <div style={{ display: window.innerWidth > 768 ? 'block' : 'none' }}>
                  <div style={{
                    color: token.colorText,
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}>
                    {userInfo?.fullName || userInfo?.username || 'User'}
                  </div>
                  <div style={{
                    color: token.colorTextSecondary,
                    fontSize: '12px',
                    lineHeight: 1.2
                  }}>
                    Administrator
                  </div>
                </div>
              </div>
            </Dropdown>

            {/* Dark Mode Toggle */}
            <Button
              type="text"
              icon={isDarkMode ? <BulbFilled /> : <BulbOutlined />}
              onClick={toggleTheme}
              style={{
                color: token.colorText,
                height: '40px',
                width: '40px',
                borderRadius: '8px'
              }}
              title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            />
          </Space>
        </div>
      </Header>

      {/* Mobile Navigation Drawer */}
      <Drawer
        title="Navigation"
        placement="left"
        onClose={() => setMobileMenuVisible(false)}
        open={mobileMenuVisible}
        width={280}
        styles={{
          body: { padding: 0 }
        }}
      >
        <Menu
          mode="vertical"
          selectedKeys={[currentRoute]}
          style={{
            backgroundColor: 'transparent',
            border: 'none'
          }}
          items={navigationItems.map(item => ({
            ...item,
            onClick: () => {
              navigateToRoute(item.key)
              setMobileMenuVisible(false)
            }
          }))}
        />
      </Drawer>

      {/* Main Content Area */}
      <Content
        style={{
          marginTop: '64px',
          backgroundColor: token.colorBgLayout,
          minHeight: 'calc(100vh - 64px)'
        }}
      >
        {/* Breadcrumb Navigation */}
        <div style={{
          backgroundColor: token.colorBgContainer,
          borderBottom: `1px solid ${token.colorBorder}`,
          padding: isMobile ? '8px 16px' : '12px 20px'
        }}>
          <div style={{
            maxWidth: '1200px',
            margin: '0 auto',
            overflow: 'hidden'
          }}>
            <Breadcrumb
              items={getBreadcrumbItems()}
              style={{
                fontSize: isMobile ? '12px' : '14px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            />
          </div>
        </div>

        {/* Page Content */}
        <div style={{
          padding: isMobile ? '16px' : '20px',
          maxWidth: '1200px',
          margin: '0 auto',
          width: '100%'
        }}>
          {renderCurrentPage()}
        </div>

        {/* DOD DevSecOps Attribution Footer */}
        <div style={{
          backgroundColor: token.colorBgContainer,
          borderTop: `1px solid ${token.colorBorder}`,
          padding: isMobile ? '12px 16px' : '16px 20px',
          textAlign: 'center',
          marginTop: 'auto'
        }}>
          <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
            <Text type="secondary" style={{ fontSize: isMobile ? '10px' : '12px' }}>
              Powered by <Text strong style={{ color: token.colorPrimary }}>DOD DevSecOps</Text>
              {isMobile ? <br /> : ' | '}
              tiberbu HealthNet Initiative
            </Text>
          </div>
        </div>
      </Content>
    </Layout>
  )

  function renderCurrentPage() {
    switch (currentRoute) {
      case 'change-requests':
        return <ChangeRequests />
      case 'project-apps':
        return (
          <ProjectApps
            navigateToRoute={navigateToRoute}
            showAppDetail={showAppDetail}
            selectedAppId={selectedAppId}
          />
        )
      case 'devops-config':
        return <DevOpsConfig />
      case 'monitoring-dashboards':
        return <MonitoringDashboards />
      case 'incidents':
        return <Incidents
          navigateToRoute={navigateToRoute}
          showIncidentDetail={showIncidentDetail}
          selectedIncidentId={selectedIncidentId}
        />
      case 'dashboard':
      default:
        return (
          <Dashboard
            navigateToRoute={navigateToRoute}
            showProjectDetail={showProjectDetail}
            selectedProjectId={selectedProjectId}
          />
        )
    }
  }
}

export default App
