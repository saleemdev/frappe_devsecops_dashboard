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
        project_status: 'Active',
        progress: 75,
        client: 'Test Client',
        task_count: 10
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

describe('Project Detail Routing Within Dashboard', () => {
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

  test('project detail shows within dashboard context', async () => {
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
      // Should show project detail within dashboard context
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      // URL should still contain project hash
      expect(mockLocation.hash).toMatch(/^project\//)
      // Should still have the main navigation header
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })
  })

  test('breadcrumb shows correct hierarchy for project detail', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to project detail via hash
    mockLocation.hash = 'project/PROJ-001'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should show project detail
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      
      // Check breadcrumb navigation
      const breadcrumb = screen.getByRole('navigation')
      expect(breadcrumb).toBeInTheDocument()
      
      // Should contain project ID in breadcrumb
      expect(screen.getByText('PROJ-001')).toBeInTheDocument()
    })
  })

  test('back to dashboard navigation works correctly', async () => {
    const user = userEvent.setup()
    
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

    // Click back to dashboard
    const backButton = screen.getByText('Back to Dashboard')
    await user.click(backButton)

    await waitFor(() => {
      // Should be back to dashboard view
      expect(mockLocation.hash).toBe('')
      // Should not show project detail anymore
      expect(screen.queryByText('Back to Dashboard')).not.toBeInTheDocument()
    })
  })

  test('direct URL navigation to project detail works', async () => {
    // Start with project detail hash
    mockLocation.hash = 'project/TEST-PROJECT-123'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      // Should load directly to project detail view
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      // Should still have main navigation
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })
  })

  test('navigation menu remains accessible in project detail view', async () => {
    const user = userEvent.setup()
    
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

    // Navigation menu should still be accessible
    const changeRequestsMenu = screen.getByText('Change Requests')
    await user.click(changeRequestsMenu)

    await waitFor(() => {
      // Should navigate away from project detail to change requests
      expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      expect(mockLocation.hash).toBe('change-requests')
      expect(screen.queryByText('Back to Dashboard')).not.toBeInTheDocument()
    })
  })

  test('project detail state is maintained during navigation', async () => {
    const user = userEvent.setup()
    
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

    // Navigate to different project
    mockLocation.hash = 'project/PROJ-002'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should still show project detail but for different project
      expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      // URL should reflect new project
      expect(mockLocation.hash).toBe('project/PROJ-002')
    })
  })

  test('invalid project routes fall back to dashboard', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to malformed project route
    mockLocation.hash = 'project/'
    fireEvent(window, new Event('hashchange'))

    await waitFor(() => {
      // Should fall back to dashboard
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      expect(screen.queryByText('Back to Dashboard')).not.toBeInTheDocument()
    })
  })
})
