import { useState, useEffect } from 'react'
import { Layout, Typography, Button, theme, Avatar, Dropdown, Space, Menu, Breadcrumb, Drawer } from 'antd'
import {
  BulbOutlined,
  BulbFilled,
  SafetyOutlined,
  LogoutOutlined,
  DesktopOutlined,
  BellOutlined,
  DashboardOutlined,
  AppstoreOutlined,
  BuildOutlined,
  HomeOutlined,
  ProjectOutlined,
  MenuOutlined,
  RobotOutlined,
  LockOutlined,
  RiseOutlined,
  FileProtectOutlined,
  BarChartOutlined
} from '@ant-design/icons'
import Dashboard from './components/Dashboard'
import Projects from './components/Projects'
import ProjectDetail from './components/ProjectDetail'
import UnauthorizedPage from './components/UnauthorizedPage'

import ChangeRequests from './components/ChangeRequests'
import ChangeRequestForm from './components/ChangeRequestForm'
import ChangeRequestsDashboard from './components/ChangeRequestsDashboard'
import ChangeRequestDetail from './components/ChangeRequestDetail'
import ProjectApps from './components/ProjectApps'
import ProjectAppDetail from './components/ProjectAppDetail'
import ProjectEdit from './components/ProjectEdit'
import ProjectCreateForm from './components/ProjectCreateForm'
import DevOpsConfig from './components/DevOpsConfig'
import MonitoringDashboards from './components/MonitoringDashboards'
import PasswordVault from './components/PasswordVault'
import PasswordVaultForm from './components/PasswordVaultForm'
import Incidents from './components/Incidents'
import IncidentDetail from './components/IncidentDetail'
import IncidentCreateForm from './components/IncidentCreateForm'
import IncidentEditForm from './components/IncidentEditForm'
import IncidentsDashboard from './components/IncidentsDashboard'
import TeamUtilization from './components/TeamUtilization'
import SoftwareProduct from './components/SoftwareProduct'
import SoftwareProductForm from './components/SoftwareProductForm'
import RACITemplate from './components/RACITemplate'
import RACITemplateForm from './components/RACITemplateForm'
import SwaggerCollections from './components/SwaggerCollections'
import SwaggerCollectionDetail from './components/SwaggerCollectionDetail'
import SystemTest from './components/SystemTest'
import ApiTestRunner from './components/ApiTestRunner'
import ApiDiagnostics from './components/ApiDiagnostics'
import RiskRegisters from './components/RiskRegisters'
import RiskRegisterForm from './components/RiskRegisterForm'
import AskAI from './components/AskAI'
import APIProvisioning from './components/APIProvisioning'
import APIRouteForm from './components/APIRouteForm'
import WikiHome from './components/WikiHome'
import WikiSpacePages from './components/WikiSpacePages'
import WikiPageViewEnhanced from './components/WikiPageViewEnhanced'
import WikiCreateForm from './components/WikiCreateForm'
import WikiPageCreate from './components/WikiPageCreate'
import WikiPageEdit from './components/WikiPageEdit'
import ProductKPIDashboard from './components/ProductKPIDashboard'

import { ConfigProvider } from 'antd'
import { buildLoginUrl, handlePostLoginRedirect } from './utils/redirectUtils'
import useAuthStore from './stores/authStore.js'
import useNavigationStore from './stores/navigationStore.js'
import { canAccessProductKPIDashboard } from './utils/permissionUtils'

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

  // Provide clear error message if store is completely unavailable
  if (!navigationState) {
    console.error('[App] Navigation store returned null/undefined')
    return (
      <Layout style={{ minHeight: '100vh' }}>
        <Content style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div>Error: Navigation store not initialized</div>
        </Content>
      </Layout>
    )
  }

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
    selectedRiskRegisterId = null,
    selectedChangeRequestId = null,
    showChangeRequestForm = false,
    selectedSoftwareProductId = null,
    showSoftwareProductForm = false,
    selectedPasswordVaultEntryId = null,
    showPasswordVaultForm = false,
    selectedRACITemplateId = null,
    selectedAPIRouteId = null,
    showAPIRouteForm = false,
    selectedWikiSpaceSlug = null,
    selectedWikiPageSlug = null,
    isMobile = false,
    mobileMenuVisible = false,
    navigateToRoute = () => { },
    handleHashChange = () => { },
    getBreadcrumbs = () => [],
    setIsMobile = () => { },
    toggleMobileMenu = () => { }
  } = navigationState


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
    // SECURITY: Validate CSRF token is available
    if (!window.csrf_token) {
      console.error('[SECURITY] CSRF token is not available. Frappe may not have injected it properly.')
    } else {
      console.log('[SECURITY] CSRF token initialized successfully')
      // Set up axios defaults for CSRF token
      import('axios').then(axiosModule => {
        axiosModule.default.defaults.headers.common['X-Frappe-CSRF-Token'] = window.csrf_token
      })
    }
  }, [])

  // Listen for session expiry events from API interceptor
  useEffect(() => {
    const handleSessionExpired = (event) => {
      console.warn('[SECURITY] Session expired event received. Triggering re-authentication.')
      checkAuthentication()
    }

    const handlePermissionDenied = (event) => {
      console.warn('[SECURITY] Permission denied event received.')
      // Could show a toast notification here
    }

    window.addEventListener('session-expired', handleSessionExpired)
    window.addEventListener('permission-denied', handlePermissionDenied)

    return () => {
      window.removeEventListener('session-expired', handleSessionExpired)
      window.removeEventListener('permission-denied', handlePermissionDenied)
    }
  }, [checkAuthentication])

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
        selectedRiskRegisterId={selectedRiskRegisterId}
        selectedChangeRequestId={selectedChangeRequestId}
        showChangeRequestForm={showChangeRequestForm}
        selectedSoftwareProductId={selectedSoftwareProductId}
        showSoftwareProductForm={showSoftwareProductForm}
        selectedRACITemplateId={selectedRACITemplateId}
        selectedWikiSpaceSlug={selectedWikiSpaceSlug}
        selectedWikiPageSlug={selectedWikiPageSlug}
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
  selectedRiskRegisterId,
  isMobile,
  mobileMenuVisible,
  setIsMobile,
  toggleMobileMenu,
  selectedChangeRequestId,
  showChangeRequestForm,
  selectedSoftwareProductId,
  showSoftwareProductForm,
  selectedRACITemplateId,
  selectedWikiSpaceSlug,
  selectedWikiPageSlug,
  getUserInitials
}) {
  const { token } = theme.useToken()

  // Function to render current page based on route and state
  const renderCurrentPage = () => {
    // Handle detail views first with null safety
    if (showProjectDetail === true && selectedProjectId) {
      return <ProjectDetail projectId={selectedProjectId} navigateToRoute={navigateToRoute} />
    }

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
          <Projects
            navigateToRoute={navigateToRoute}
            showProjectDetail={showProjectDetail}
            selectedProjectId={selectedProjectId}
          />
        )
      case 'product-kpi-dashboard':
        return <ProductKPIDashboard navigateToRoute={navigateToRoute} />
      case 'team-utilization':
        return <TeamUtilization />
      case 'software-product':
        return <SoftwareProduct navigateToRoute={navigateToRoute} />
      case 'software-product-new':
        return (
          <SoftwareProductForm
            mode="create"
            navigateToRoute={navigateToRoute}
          />
        )
      case 'software-product-edit':
        return (
          <SoftwareProductForm
            mode="edit"
            productId={selectedSoftwareProductId}
            navigateToRoute={navigateToRoute}
          />
        )
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
      case 'change-requests-detail':
        return (
          <ChangeRequestDetail
            changeRequestId={selectedChangeRequestId}
            navigateToRoute={navigateToRoute}
          />
        )
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
      case 'incident-create':
        return (
          <IncidentCreateForm
            navigateToRoute={navigateToRoute}
          />
        )
      case 'incident-edit':
        return (
          <IncidentEditForm
            incidentId={selectedIncidentId}
            navigateToRoute={navigateToRoute}
          />
        )
      case 'incidents-dashboard':
        return <IncidentsDashboard />
      case 'monitoring-dashboards':
        return <MonitoringDashboards />
      case 'password-vault':
        return <PasswordVault navigateToRoute={navigateToRoute} />
      case 'password-vault-new':
        return (
          <PasswordVaultForm
            mode="create"
            navigateToRoute={navigateToRoute}
          />
        )
      case 'password-vault-edit':
        return (
          <PasswordVaultForm
            mode="edit"
            entryId={selectedPasswordVaultEntryId}
            navigateToRoute={navigateToRoute}
          />
        )
      case 'raci-template':
        return <RACITemplate navigateToRoute={navigateToRoute} />
      case 'raci-template-create':
        return (
          <RACITemplateForm
            mode="create"
            navigateToRoute={navigateToRoute}
          />
        )
      case 'raci-template-edit':
        return (
          <RACITemplateForm
            mode="edit"
            templateId={selectedRACITemplateId}
            navigateToRoute={navigateToRoute}
          />
        )
      case 'api-provisioning':
        return <APIProvisioning navigateToRoute={navigateToRoute} />
      case 'api-provisioning-create':
        return (
          <APIRouteForm
            mode="create"
            navigateToRoute={navigateToRoute}
          />
        )
      case 'api-provisioning-edit':
        return (
          <APIRouteForm
            mode="edit"
            routeId={selectedAPIRouteId}
            navigateToRoute={navigateToRoute}
          />
        )
      case 'swagger-collections':
        return <SwaggerCollections />
      case 'wiki':
        return <WikiHome navigateToRoute={navigateToRoute} />
      case 'wiki-space':
        return (
          <WikiSpacePages
            spaceId={selectedWikiSpaceSlug}
            navigateToRoute={navigateToRoute}
          />
        )
      case 'wiki-create':
        return <WikiCreateForm navigateToRoute={navigateToRoute} />
      case 'wiki-page-create':
        return <WikiPageEdit mode="create" wikiSpaceName={selectedWikiSpaceSlug} navigateToRoute={navigateToRoute} />
      case 'wiki-page-edit':
        return <WikiPageEdit mode="edit" pageId={selectedWikiPageSlug} navigateToRoute={navigateToRoute} />
      case 'wiki-page':
        return <WikiPageViewEnhanced pageSlug={selectedWikiPageSlug} navigateToRoute={navigateToRoute} />
      case 'devops-config':
        return <DevOpsConfig />
      case 'system-test':
        return <SystemTest />
      case 'api-test':
        return <ApiTestRunner />
      case 'api-diagnostics':
        return <ApiDiagnostics />
      case 'ask-ai':
        return <AskAI />

      case 'project-edit':
        return (
          <ProjectEdit
            projectId={selectedProjectId}
            navigateToRoute={navigateToRoute}
          />
        )

      case 'project-create':
        return (
          <ProjectCreateForm
            navigateToRoute={navigateToRoute}
          />
        )

      case 'risk-registers':
        return <RiskRegisters navigateToRoute={navigateToRoute} />

      case 'risk-register-create':
        return (
          <RiskRegisterForm
            navigateToRoute={navigateToRoute}
          />
        )

      case 'risk-register-edit':
        return (
          <RiskRegisterForm
            registerId={selectedRiskRegisterId || null}
            navigateToRoute={navigateToRoute}
            mode="edit"
          />
        )

      case 'risk-register-detail':
        return (
          <RiskRegisterForm
            registerId={selectedRiskRegisterId || null}
            navigateToRoute={navigateToRoute}
            mode="view"
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

  // Main navigation items (displayed prominently in header)
  const mainMenuItems = [
    {
      key: 'dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard'
    },
    {
      key: 'products-menu',
      icon: <ProjectOutlined />,
      label: 'Products',
      children: [
        {
          key: 'software-product',
          label: 'Software Product'
        },
        ...(canAccessProductKPIDashboard() ? [{
          key: 'product-kpi-dashboard',
          icon: <BarChartOutlined />,
          label: 'Product KPI Dashboard'
        }] : []),
        {
          key: 'raci-template',
          label: 'RACI Setup',
          icon: <RiseOutlined />
        }
      ]
    },
    {
      key: 'projects-menu',
      icon: <ProjectOutlined />,
      label: 'Projects',
      children: [
        {
          key: 'projects',
          label: 'Projects'
        },
        {
          key: 'risk-registers',
          icon: <FileProtectOutlined />,
          label: 'Risk Registers'
        },
        {
          key: 'team-utilization',
          label: 'Team Utilization',
          disabled: true
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
          label: 'Project Apps',
          disabled: true
        },
        {
          key: 'change-requests',
          label: 'Change Requests'
        },
        {
          key: 'incidents',
          label: 'Incidents'
        },
        {
          key: 'monitoring-dashboards',
          label: 'Monitoring Dashboards'
        },
        {
          key: 'password-vault',
          icon: <LockOutlined />,
          label: 'Password Vault'
        },
        {
          key: 'api-provisioning',
          icon: <BuildOutlined />,
          label: 'API Provisioning'
        },
        {
          key: 'wiki',
          label: 'Wiki'
        },
        {
          key: 'swagger-collections',
          label: 'Swagger Collections',
          disabled: true
        }
      ]
    }
  ]

  // More menu items (hidden under "...")
  const moreMenuItems = [
    {
      key: 'ask-ai',
      icon: <RobotOutlined />,
      label: 'Ask AI'
    },
    {
      type: 'divider'
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

  // All navigation items (for mobile menu)
  const navigationItems = [...mainMenuItems, ...moreMenuItems]

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
          borderBottom: 'none',
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

            {/* Desktop Horizontal Navigation Menu - Main Items */}
            {!isMobile && (
              <div style={{ display: 'flex', gap: '0px', alignItems: 'center' }}>
                {/* Dashboard */}
                <Button
                  type="text"
                  className="nav-button-no-hover"
                  onClick={() => navigateToRoute('dashboard')}
                  style={{
                    color: currentRoute === 'dashboard' ? token.colorPrimary : token.colorText,
                    height: '64px',
                    borderRadius: '0px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    paddingLeft: '16px',
                    paddingRight: '16px',
                    fontWeight: currentRoute === 'dashboard' ? '600' : '400',
                    borderBottom: currentRoute === 'dashboard' ? `2px solid ${token.colorPrimary}` : '2px solid transparent'
                  }}
                >
                  <DashboardOutlined />
                  Dashboard
                </Button>

                {/* Products */}
                <Dropdown
                  menu={{
                    items: mainMenuItems.find(m => m.key === 'products-menu')?.children || [],
                    onClick: ({ key }) => navigateToRoute(key)
                  }}
                  placement="bottomLeft"
                >
                  <Button
                    type="text"
                    className="nav-button-no-hover"
                    onClick={() => navigateToRoute('software-product')}
                    style={{
                      color: (currentRoute === 'products-menu' || currentRoute === 'software-product') ? token.colorPrimary : token.colorText,
                      height: '64px',
                      borderRadius: '0px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      fontWeight: (currentRoute === 'products-menu' || currentRoute === 'software-product') ? '600' : '400',
                      borderBottom: (currentRoute === 'products-menu' || currentRoute === 'software-product') ? `2px solid ${token.colorPrimary}` : '2px solid transparent'
                    }}
                  >
                    <ProjectOutlined />
                    Products
                  </Button>
                </Dropdown>

                {/* Projects */}
                <Dropdown
                  menu={{
                    items: mainMenuItems.find(m => m.key === 'projects-menu')?.children || [],
                    onClick: ({ key }) => navigateToRoute(key)
                  }}
                  placement="bottomLeft"
                >
                  <Button
                    type="text"
                    className="nav-button-no-hover"
                    onClick={() => navigateToRoute('projects')}
                    style={{
                      color: (currentRoute === 'projects-menu' || currentRoute === 'projects') ? token.colorPrimary : token.colorText,
                      height: '64px',
                      borderRadius: '0px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      fontWeight: (currentRoute === 'projects-menu' || currentRoute === 'projects') ? '600' : '400',
                      borderBottom: (currentRoute === 'projects-menu' || currentRoute === 'projects') ? `2px solid ${token.colorPrimary}` : '2px solid transparent'
                    }}
                  >
                    <ProjectOutlined />
                    Projects
                  </Button>
                </Dropdown>

                {/* Ops */}
                <Dropdown
                  menu={{
                    items: mainMenuItems.find(m => m.key === 'ops-menu')?.children || [],
                    onClick: ({ key }) => navigateToRoute(key)
                  }}
                  placement="bottomLeft"
                >
                  <Button
                    type="text"
                    className="nav-button-no-hover"
                    onClick={() => navigateToRoute('change-requests')}
                    style={{
                      color: (currentRoute === 'ops-menu' || (currentRoute !== 'dashboard' && currentRoute !== 'software-product' && currentRoute !== 'projects')) ? token.colorPrimary : token.colorText,
                      height: '64px',
                      borderRadius: '0px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      paddingLeft: '16px',
                      paddingRight: '16px',
                      fontWeight: (currentRoute === 'ops-menu' || (currentRoute !== 'dashboard' && currentRoute !== 'software-product' && currentRoute !== 'projects')) ? '600' : '400',
                      borderBottom: (currentRoute === 'ops-menu' || (currentRoute !== 'dashboard' && currentRoute !== 'software-product' && currentRoute !== 'projects')) ? `2px solid ${token.colorPrimary}` : '2px solid transparent'
                    }}
                  >
                    <AppstoreOutlined />
                    Ops
                  </Button>
                </Dropdown>

                {/* More Menu Dropdown */}
                <Dropdown
                  menu={{
                    items: moreMenuItems,
                    onClick: ({ key }) => {
                      if (key !== 'divider') navigateToRoute(key)
                    }
                  }}
                  placement="bottomRight"
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    style={{
                      color: token.colorText,
                      height: '64px',
                      borderRadius: '0px',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '12px',
                      paddingRight: '12px',
                      fontSize: '18px',
                      fontWeight: 'bold'
                    }}
                  >
                    ⋮
                  </Button>
                </Dropdown>
              </div>
            )}
          </div>

          {/* Right side - User account and theme toggle */}
          <Space size="large">

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
