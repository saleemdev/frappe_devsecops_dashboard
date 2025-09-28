import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import App from '../App'

// Mock the API utilities
jest.mock('../utils/erpnextApiUtils', () => ({
  getDashboardData: jest.fn(() => Promise.resolve({
    success: true,
    metrics: { 
      total_projects: 5, 
      active_projects: 3,
      total_tasks: 25,
      completed_tasks: 15
    },
    projects: []
  }))
}))

// Setup mocks
const mockLocation = {
  hash: '',
  pathname: '/frontend',
  search: '',
  href: 'http://localhost/frontend'
}

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true
})

Object.defineProperty(window, 'csrf_token', {
  value: 'test-csrf-token',
  writable: true
})

Object.defineProperty(document, 'cookie', {
  value: 'user_id=test-user; sid=test-session',
  writable: true
})

describe('Monitoring Dashboards Navigation Integration', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockLocation.hash = ''
    
    // Mock fetch for authentication
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ message: 'success' })
      })
    )
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  test('monitoring dashboards menu item appears in navigation', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Check that Monitoring Dashboards menu item is present
    expect(screen.getByText('Monitoring Dashboards')).toBeInTheDocument()
  })

  test('clicking monitoring dashboards menu navigates correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Click on Monitoring Dashboards menu item
    const monitoringMenu = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringMenu)

    await waitFor(() => {
      // Should navigate to monitoring dashboards page
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('monitoring-dashboards')
    })

    // Check that the menu item is highlighted/selected
    const menuItem = screen.getByRole('menuitem', { name: /Monitoring Dashboards/ })
    expect(menuItem).toHaveClass('ant-menu-item-selected')
  })

  test('direct URL navigation to monitoring dashboards works', async () => {
    // Start with monitoring dashboards hash
    mockLocation.hash = 'monitoring-dashboards'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      // Should load directly to monitoring dashboards page
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
    })

    // Menu should show correct selection
    const menuItem = screen.getByRole('menuitem', { name: /Monitoring Dashboards/ })
    expect(menuItem).toHaveClass('ant-menu-item-selected')
  })

  test('breadcrumb navigation shows correctly for monitoring dashboards', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to monitoring dashboards
    const monitoringMenu = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringMenu)

    await waitFor(() => {
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
    })

    // Check breadcrumb navigation
    const breadcrumb = screen.getByRole('navigation')
    expect(breadcrumb).toBeInTheDocument()
    expect(screen.getByText('Monitoring Dashboards')).toBeInTheDocument()
  })

  test('navigation between monitoring dashboards and other pages works', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to monitoring dashboards
    const monitoringMenu = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringMenu)

    await waitFor(() => {
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('monitoring-dashboards')
    })

    // Navigate to change requests
    const changeRequestsMenu = screen.getByText('Change Requests')
    await user.click(changeRequestsMenu)

    await waitFor(() => {
      expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('change-requests')
    })

    // Navigate back to monitoring dashboards
    const monitoringMenuAgain = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringMenuAgain)

    await waitFor(() => {
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('monitoring-dashboards')
    })
  })

  test('monitoring dashboards page maintains state during navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to monitoring dashboards
    const monitoringMenu = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringMenu)

    await waitFor(() => {
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
    })

    // Perform a search on the monitoring dashboards page
    const searchInput = screen.getByPlaceholderText('Search dashboards...')
    await user.type(searchInput, 'Infrastructure')

    // Navigate away and back
    const dashboardMenu = screen.getByText('Dashboard')
    await user.click(dashboardMenu)

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate back to monitoring dashboards
    const monitoringMenuAgain = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringMenuAgain)

    await waitFor(() => {
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
      // Search should be reset (new component instance)
      const newSearchInput = screen.getByPlaceholderText('Search dashboards...')
      expect(newSearchInput.value).toBe('')
    })
  })

  test('hash change detection works for monitoring dashboards', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Simulate hash change to monitoring dashboards
    mockLocation.hash = 'monitoring-dashboards'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
    })

    // Simulate hash change back to dashboard
    mockLocation.hash = ''
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Manage and access your monitoring dashboards')).not.toBeInTheDocument()
    })
  })

  test('monitoring dashboards menu item has correct icon', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Check that the monitoring dashboards menu item has the bar chart icon
    const menuItem = screen.getByRole('menuitem', { name: /Monitoring Dashboards/ })
    expect(menuItem).toBeInTheDocument()
    
    // The icon should be present (BarChartOutlined)
    const icon = menuItem.querySelector('.anticon-bar-chart')
    expect(icon).toBeInTheDocument()
  })

  test('responsive navigation works for monitoring dashboards', async () => {
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 768
    })

    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigation should still work on mobile
    const monitoringMenu = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringMenu)

    await waitFor(() => {
      expect(screen.getByText('Manage and access your monitoring dashboards')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('monitoring-dashboards')
    })
  })
})
