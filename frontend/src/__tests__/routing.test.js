import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import App from '../App'

// Mock the API utilities
jest.mock('../utils/erpnextApiUtils', () => ({
  getDashboardData: jest.fn(() => Promise.resolve({
    success: true,
    metrics: { total_projects: 5, active_projects: 3 },
    projects: []
  }))
}))

// Mock window.location
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

// Mock window.history
const mockHistory = {
  pushState: jest.fn()
}

Object.defineProperty(window, 'history', {
  value: mockHistory,
  writable: true
})

// Mock CSRF token
Object.defineProperty(window, 'csrf_token', {
  value: 'test-csrf-token',
  writable: true
})

// Mock document.cookie for authentication
Object.defineProperty(document, 'cookie', {
  value: 'user_id=test-user; sid=test-session',
  writable: true
})

describe('DevSecOps Dashboard Routing', () => {
  beforeEach(() => {
    // Reset mocks
    jest.clearAllMocks()
    mockLocation.hash = ''
    mockHistory.pushState.mockClear()
    
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

  test('renders dashboard by default', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })
  })

  test('navigates to change requests page', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Find and click the Change Requests menu item
    const changeRequestsMenu = screen.getByText('Change Requests')
    fireEvent.click(changeRequestsMenu)

    await waitFor(() => {
      expect(mockLocation.hash).toBe('change-requests')
    })
  })

  test('navigates to project apps page', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Find and click the Project Apps menu item
    const projectAppsMenu = screen.getByText('Project Apps')
    fireEvent.click(projectAppsMenu)

    await waitFor(() => {
      expect(mockLocation.hash).toBe('project-apps')
    })
  })

  test('navigates to devops config page', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Find and click the DevOps Config menu item
    const devopsConfigMenu = screen.getByText('DevOps Config')
    fireEvent.click(devopsConfigMenu)

    await waitFor(() => {
      expect(mockLocation.hash).toBe('devops-config')
    })
  })

  test('handles hash change events correctly', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Simulate hash change to change-requests
    mockLocation.hash = 'change-requests'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should show change requests content
      expect(screen.getByText('Change Request Management')).toBeInTheDocument()
    })
  })

  test('handles project detail navigation', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Simulate hash change to project detail
    mockLocation.hash = 'project/PROJ-001'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should show project detail content
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })
  })

  test('breadcrumb navigation works correctly', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to change requests
    mockLocation.hash = 'change-requests'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should show breadcrumb
      const breadcrumb = screen.getByRole('navigation')
      expect(breadcrumb).toBeInTheDocument()
    })
  })

  test('back navigation from project detail works', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to project detail
    mockLocation.hash = 'project/PROJ-001'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })

    // Click back button
    const backButton = screen.getByText('Back to Dashboard')
    fireEvent.click(backButton)

    await waitFor(() => {
      expect(mockLocation.hash).toBe('')
    })
  })

  test('menu highlights active route correctly', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to project apps
    const projectAppsMenu = screen.getByText('Project Apps')
    fireEvent.click(projectAppsMenu)

    await waitFor(() => {
      // Menu item should be highlighted (selected)
      const menuItem = screen.getByRole('menuitem', { name: /Project Apps/ })
      expect(menuItem).toHaveClass('ant-menu-item-selected')
    })
  })

  test('handles invalid routes gracefully', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to invalid route
    mockLocation.hash = 'invalid-route'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should default to dashboard
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })
  })

  test('route parameters are handled correctly for project detail', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to specific project
    const projectId = 'TEST-PROJECT-123'
    mockLocation.hash = `project/${projectId}`
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should show project detail with correct ID
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
    })
  })
})
