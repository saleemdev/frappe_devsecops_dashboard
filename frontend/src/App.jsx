import { useState, useEffect } from 'react'
import { Layout, Typography, Button, theme, Avatar, Dropdown, Space, Menu, Breadcrumb, Drawer } from 'antd'
import {
  BulbOutlined,
  BulbFilled,
  SafetyOutlined,
  LogoutOutlined,
  DesktopOutlined,
  SettingOutlined,
  BellOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  BuildOutlined,
  HomeOutlined,
  ProjectOutlined,
  MenuOutlined
} from '@ant-design/icons'
import Dashboard from './components/Dashboard'
import UnauthorizedPage from './components/UnauthorizedPage'

import ChangeRequests from './components/ChangeRequests'
import ChangeRequestForm from './components/ChangeRequestForm'
import ChangeRequestsDashboard from './components/ChangeRequestsDashboard'
import ProjectApps from './components/ProjectApps'
import ProjectAppDetail from './components/ProjectAppDetail'
import ProjectEdit from './components/ProjectEdit'
import DevOpsConfig from './components/DevOpsConfig'
import MonitoringDashboards from './components/MonitoringDashboards'
import Incidents from './components/Incidents'
import IncidentDetail from './components/IncidentDetail'
import IncidentsDashboard from './components/IncidentsDashboard'
import TeamUtilization from './components/TeamUtilization'
import SwaggerCollections from './components/SwaggerCollections'
import SwaggerCollectionDetail from './components/SwaggerCollectionDetail'
import SystemTest from './components/SystemTest'
import ApiTestRunner from './components/ApiTestRunner'
import ApiDiagnostics from './components/ApiDiagnostics'

import { ConfigProvider } from 'antd'
import { buildLoginUrl, handlePostLoginRedirect } from './utils/redirectUtils'
import useAuthStore from './stores/authStore.js'
import useNavigationStore from './stores/navigationStore.js'

const { Header, Content } = Layout
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

  const navigationState = useNavigationStore()

  // Destructure with defaults to prevent undefined errors
  const {
    currentRoute = 'dashboard',
    selectedProjectId = null,
    showProjectDetail = false,
    selectedAppId = null,
    showAppDetail = false,
    selectedIncidentId = null,
    showIncidentDetail = false,
    selectedSwaggerId = null,
    showSwaggerDetail = false,
    selectedChangeRequestId = null,
    showChangeRequestForm = false,
    isMobile = false,
    mobileMenuVisible = false,
    navigateToRoute = () => {},
    handleHashChange = () => {},
    getBreadcrumbs = () => [],
    setIsMobile = () => {},
    toggleMobileMenu = () => {}
  } = navigationState || {}



  // Early return if navigation store is not initialized
  if (!navigationState) {
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div>Loading...</div>
        </Content>
      </Layout>
    )
  }

  // Route detection (hash-based). Run once on mount to avoid update loops.
  useEffect(() => {
    if (typeof handleHashChange === 'function') {
      // Set initial route from current hash
      handleHashChange()

      const onHashChange = () => handleHashChange()
      window.addEventListener('hashchange', onHashChange)
      return () => window.removeEventListener('hashchange', onHashChange)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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

  // Function to get user initials (first 2 letters)
  const getUserInitials = (fullName, userName) => {
    let name = fullName || userName || 'U'
    // Handle null/undefined by using 'U'
    if (!name || typeof name !== 'string') {
      return 'U'
    }
    // Remove spaces and get first 2 characters
    const initials = name.replace(/\s+/g, '').substring(0, 2).toUpperCase()
    return initials || 'U'
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
      fontSize: 12,
      fontSizeLG: 14,
      fontSizeXL: 18,
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

  // Show unauthorized page if not authenticated (stay within app UX)
  if (isAuthenticated === false) {
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
        showSwaggerDetail={showSwaggerDetail}
        selectedSwaggerId={selectedSwaggerId}
        selectedChangeRequestId={selectedChangeRequestId}
        showChangeRequestForm={showChangeRequestForm}
        isMobile={isMobile}
        mobileMenuVisible={mobileMenuVisible}
        setIsMobile={setIsMobile}
        toggleMobileMenu={toggleMobileMenu}
        getUserInitials={getUserInitials}
      />
    </ConfigProvider>
  )
}

// Component that can access theme tokens
function AppContent({
  isDarkMode,
  toggleTheme,
  userInfo,
  onLogout,
  currentRoute,
  navigateToRoute,
  showProjectDetail,
  selectedProjectId,
  showAppDetail,
  selectedAppId,
  showIncidentDetail,
  selectedIncidentId,
  showSwaggerDetail,
  selectedSwaggerId,
  isMobile,
  mobileMenuVisible,
  setIsMobile,
  toggleMobileMenu,
  selectedChangeRequestId,
  showChangeRequestForm,
  getUserInitials
}) {
  const { token } = theme.useToken()

  // Function to render current page based on route and state
  const renderCurrentPage = () => {
    // Handle detail views first with null safety
    if (showAppDetail === true && selectedAppId) {
      return <ProjectAppDetail appId={selectedAppId} />
    }

    if (showIncidentDetail === true && selectedIncidentId) {
      return <IncidentDetail incidentId={selectedIncidentId} />
    }

    if (showSwaggerDetail === true && selectedSwaggerId) {
      return <SwaggerCollectionDetail swaggerId={selectedSwaggerId} />
    }

    // Handle main routes
    switch (currentRoute) {
      case 'projects':
        return (
          <Dashboard
            navigateToRoute={navigateToRoute}
            showProjectDetail={showProjectDetail}
            selectedProjectId={selectedProjectId}
            viewMode="projects"
          />
        )
      case 'team-utilization':
        return <TeamUtilization />
      case 'project-apps':
        return (
          <ProjectApps
            navigateToRoute={navigateToRoute}
            showAppDetail={showAppDetail}
            selectedAppId={selectedAppId}
          />
        )
      case 'change-requests':
        return <ChangeRequests />
      case 'change-requests-dashboard':
        return <ChangeRequestsDashboard />
      case 'change-requests-new':
        return <ChangeRequestForm mode="create" />
      case 'change-requests-edit':
        return <ChangeRequestForm mode="edit" id={selectedChangeRequestId} />
      case 'incidents':
        return <Incidents
          navigateToRoute={navigateToRoute}
          showIncidentDetail={showIncidentDetail}
          selectedIncidentId={selectedIncidentId}
        />
      case 'incidents-dashboard':
        return <IncidentsDashboard />
      case 'monitoring-dashboards':
        return <MonitoringDashboards />
      case 'swagger-collections':
        return <SwaggerCollections />
      case 'devops-config':
        return <DevOpsConfig />
      case 'system-test':
        return <SystemTest />
      case 'api-test':
        return <ApiTestRunner />
      case 'api-diagnostics':
        return <ApiDiagnostics />

      case 'project-edit':
        return (
          <ProjectEdit
            projectId={selectedProjectId}
            navigateToRoute={navigateToRoute}
          />
        )

      case 'dashboard':
      default:
        return (
          <Dashboard
            navigateToRoute={navigateToRoute}
            showProjectDetail={showProjectDetail}
            selectedProjectId={selectedProjectId}
            viewMode="metrics"
          />
        )
    }
  }

  // Check screen size for mobile responsiveness
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkScreenSize()
    window.addEventListener('resize', checkScreenSize)

    return () => window.removeEventListener('resize', checkScreenSize)
  }, [setIsMobile])

  // Navigation menu items for horizontal navigation
  const navigationItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'projects-menu',
      icon: <ProjectOutlined />,
      label: 'Projects',
      children: [
        {
          key: 'projects',
          label: 'Project Cards'
        },
        {
          key: 'team-utilization',
          label: 'Team Utilization'
        }
      ]
    },
    {
      key: 'ops-menu',
      icon: <AppstoreOutlined />,
      label: 'Ops',
      children: [
        {
          key: 'project-apps',
          label: 'Project Apps'
        },
        {
          key: 'change-requests',
          label: 'Change Requests'
        },
        {
          key: 'change-requests-dashboard',
          label: 'CR Dashboard'
        },
        {
          key: 'incidents',
          label: 'Incidents'
        },
        {
          key: 'incidents-dashboard',
          label: 'Incidents Dashboard'
        },
        {
          key: 'monitoring-dashboards',
          label: 'Monitoring Dashboards'
        },
        {
          key: 'swagger-collections',
          label: 'Swagger Collections'
        }
      ]
    },
    {
      key: 'settings-menu',
      icon: <BuildOutlined />,
      label: 'Settings',
      children: [
        {
          key: 'devops-config',
          label: 'DevOps Config'
        }
      ]
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
          onClick: () => navigateToRoute('projects')
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
      }
    },
    {
      key: 'notification-settings',
      icon: <BellOutlined />,
      label: 'Notification Settings',
      onClick: () => {
        // Placeholder for future implementation
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
                onClick={() => toggleMobileMenu()}
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
                onClick={({ key }) => navigateToRoute(key)}
                items={navigationItems}
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
                  style={{ backgroundColor: token.colorPrimary, color: '#ffffff', fontWeight: 600 }}
                >
                  {getUserInitials(userInfo?.full_name, userInfo?.name)}
                </Avatar>
                <div style={{ display: window.innerWidth > 768 ? 'block' : 'none' }}>
                  <div style={{
                    color: token.colorText,
                    fontSize: '14px',
                    fontWeight: 500,
                    lineHeight: 1.2
                  }}>
                    {userInfo?.full_name || userInfo?.name}
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
        onClose={() => toggleMobileMenu()}
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
          onClick={({ key }) => {
            navigateToRoute(key)
            toggleMobileMenu()
          }}
          items={navigationItems}
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
              tiBERbu HealthNet Initiative
            </Text>
          </div>
        </div>
      </Content>
    </Layout>
  )

}

export default App
