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
    projects: [
      {
        id: 'PROJ-001',
        name: 'Test Project 1',
        status: 'Active',
        progress: 75,
        client: 'Test Client',
        task_count: 10
      },
      {
        id: 'PROJ-002', 
        name: 'Test Project 2',
        status: 'Active',
        progress: 50,
        client: 'Another Client',
        task_count: 8
      }
    ]
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

describe('DevSecOps Dashboard Navigation Integration', () => {
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

  test('complete navigation flow through all main pages', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // 1. Navigate to Change Requests
    const changeRequestsMenu = screen.getByText('Change Requests')
    await user.click(changeRequestsMenu)

    await waitFor(() => {
      expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('change-requests')
    })

    // 2. Navigate to Project Apps
    const projectAppsMenu = screen.getByText('Project Apps')
    await user.click(projectAppsMenu)

    await waitFor(() => {
      expect(screen.getByText('Project Applications')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('project-apps')
    })

    // 3. Navigate to DevOps Config
    const devopsConfigMenu = screen.getByText('DevOps Config')
    await user.click(devopsConfigMenu)

    await waitFor(() => {
      expect(screen.getByText('DevOps Configurations')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('devops-config')
    })

    // 4. Navigate back to Dashboard
    const dashboardMenu = screen.getByText('Dashboard')
    await user.click(dashboardMenu)

    await waitFor(() => {
      expect(mockLocation.hash).toBe('')
    })
  })

  test('project detail navigation and back navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    // Wait for dashboard to load
    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Wait for projects to load and find a "View Details" button
    await waitFor(() => {
      const viewDetailsButtons = screen.getAllByText('View Details')
      expect(viewDetailsButtons.length).toBeGreaterThan(0)
    })

    // Click on first project's "View Details" button
    const viewDetailsButtons = screen.getAllByText('View Details')
    await user.click(viewDetailsButtons[0])

    await waitFor(() => {
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      expect(mockLocation.hash).toMatch(/^project\//)
    })

    // Test back navigation
    const backButton = screen.getByText('Back to Dashboard')
    await user.click(backButton)

    await waitFor(() => {
      expect(mockLocation.hash).toBe('')
    })
  })

  test('breadcrumb navigation functionality', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to Change Requests
    const changeRequestsMenu = screen.getByText('Change Requests')
    await user.click(changeRequestsMenu)

    await waitFor(() => {
      expect(screen.getByText('Change Request Management')).toBeInTheDocument()
    })

    // Check breadcrumb is present
    const breadcrumb = screen.getByRole('navigation')
    expect(breadcrumb).toBeInTheDocument()

    // Navigate to project detail
    mockLocation.hash = 'project/PROJ-001'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })

    // Check breadcrumb shows project navigation
    const projectBreadcrumb = screen.getByRole('navigation')
    expect(projectBreadcrumb).toBeInTheDocument()
  })

  test('menu state persistence during navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to Project Apps
    const projectAppsMenu = screen.getByText('Project Apps')
    await user.click(projectAppsMenu)

    await waitFor(() => {
      // Check that Project Apps menu item is selected
      const menuItem = screen.getByRole('menuitem', { name: /Project Apps/ })
      expect(menuItem).toHaveClass('ant-menu-item-selected')
    })

    // Navigate to another page
    const changeRequestsMenu = screen.getByText('Change Requests')
    await user.click(changeRequestsMenu)

    await waitFor(() => {
      // Check that Change Requests menu item is now selected
      const menuItem = screen.getByRole('menuitem', { name: /Change Requests/ })
      expect(menuItem).toHaveClass('ant-menu-item-selected')
    })
  })

  test('responsive navigation behavior', async () => {
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
    const changeRequestsMenu = screen.getByText('Change Requests')
    await user.click(changeRequestsMenu)

    await waitFor(() => {
      expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('change-requests')
    })
  })

  test('error handling for invalid navigation', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Simulate navigation to invalid route
    mockLocation.hash = 'invalid-route-that-does-not-exist'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should gracefully fall back to dashboard
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })
  })

  test('settings dropdown navigation', async () => {
    const user = userEvent.setup()

    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Find and click settings button
    const settingsButton = screen.getByRole('button', { name: /setting/i })
    await user.click(settingsButton)

    await waitFor(() => {
      // Should show settings dropdown with Dashboard Preferences
      expect(screen.getByText('Dashboard Preferences')).toBeInTheDocument()
    })
  })

  test('deep linking works correctly', async () => {
    // Start with a specific hash
    mockLocation.hash = 'project-apps'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      // Should load directly to Project Apps page
      expect(screen.getByText('Project Applications')).toBeInTheDocument()
    })

    // Menu should show correct selection
    const menuItem = screen.getByRole('menuitem', { name: /Project Apps/ })
    expect(menuItem).toHaveClass('ant-menu-item-selected')
  })
})
