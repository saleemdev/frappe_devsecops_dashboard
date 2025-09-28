/**
 * Enhanced Navigation Tests
 * Tests the new navigation features including Incidents and App Detail routing
 */

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

describe('Enhanced Navigation Features', () => {
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

  test('incidents menu item appears in navigation', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Check incidents menu item exists
    expect(screen.getByText('Incidents')).toBeInTheDocument()
  })

  test('incidents navigation works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Click incidents menu item
    const incidentsLink = screen.getByText('Incidents')
    await user.click(incidentsLink)

    // Check URL hash is updated
    expect(window.location.hash).toBe('#incidents')

    // Check incidents page is displayed
    await waitFor(() => {
      expect(screen.getByText('Security Incidents')).toBeInTheDocument()
    })
  })

  test('incidents breadcrumb navigation works', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to incidents
    const incidentsLink = screen.getByText('Incidents')
    await user.click(incidentsLink)

    await waitFor(() => {
      expect(screen.getByText('Security Incidents')).toBeInTheDocument()
    })

    // Check breadcrumb shows incidents
    expect(screen.getByText('Incidents')).toBeInTheDocument()
  })

  test('direct incidents URL navigation works', async () => {
    // Set hash before rendering
    mockLocation.hash = '#incidents'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Security Incidents')).toBeInTheDocument()
    })

    // Check incidents page is displayed directly
    expect(screen.getByText('Add Incident')).toBeInTheDocument()
  })

  test('app detail navigation works from project apps', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to project apps
    const projectAppsLink = screen.getByText('Project Apps')
    await user.click(projectAppsLink)

    await waitFor(() => {
      expect(screen.getByText('Project Applications')).toBeInTheDocument()
    })

    // Click on an app card
    const appCard = screen.getByText('ePrescription API').closest('.ant-card')
    await user.click(appCard)

    // Check URL hash is updated for app detail
    expect(window.location.hash).toBe('#project-apps/app-001')

    // Check app detail view is displayed
    await waitFor(() => {
      expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    })
  })

  test('direct app detail URL navigation works', async () => {
    // Set hash for app detail before rendering
    mockLocation.hash = '#project-apps/app-001'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    // Should show app detail view directly
    await waitFor(() => {
      expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    })
  })

  test('app detail breadcrumb navigation works', async () => {
    // Set hash for app detail
    mockLocation.hash = '#project-apps/app-001'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    })

    // Check breadcrumb shows project apps and app id
    expect(screen.getByText('Project Apps')).toBeInTheDocument()
    expect(screen.getByText('app-001')).toBeInTheDocument()
  })

  test('back navigation from app detail works', async () => {
    const user = userEvent.setup()
    
    // Start with app detail view
    mockLocation.hash = '#project-apps/app-001'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    })

    // Wait for app detail to load
    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Click back to project apps
    const backButton = screen.getByText('Back to Project Apps')
    await user.click(backButton)

    // Check navigation back to project apps
    expect(window.location.hash).toBe('#project-apps')

    await waitFor(() => {
      expect(screen.getByText('Project Applications')).toBeInTheDocument()
    })
  })

  test('mobile navigation includes incidents menu item', async () => {
    const user = userEvent.setup()
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps')).toBeInTheDocument() // Mobile title
    })

    // Open mobile menu
    const hamburgerButton = screen.getByRole('button', { name: /menu/i })
    await user.click(hamburgerButton)

    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument()
    })

    // Check incidents is in mobile menu
    expect(screen.getByText('Incidents')).toBeInTheDocument()
  })

  test('mobile navigation to incidents works', async () => {
    const user = userEvent.setup()
    
    // Mock mobile viewport
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 375,
    })
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps')).toBeInTheDocument()
    })

    // Open mobile menu
    const hamburgerButton = screen.getByRole('button', { name: /menu/i })
    await user.click(hamburgerButton)

    await waitFor(() => {
      expect(screen.getByText('Navigation')).toBeInTheDocument()
    })

    // Click incidents in mobile menu
    const incidentsLink = screen.getByText('Incidents')
    await user.click(incidentsLink)

    // Check mobile menu closes and incidents page loads
    await waitFor(() => {
      expect(screen.queryByText('Navigation')).not.toBeInTheDocument()
      expect(screen.getByText('Security Incidents')).toBeInTheDocument()
    })
  })

  test('navigation state resets correctly between routes', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to project apps and then to app detail
    const projectAppsLink = screen.getByText('Project Apps')
    await user.click(projectAppsLink)

    await waitFor(() => {
      expect(screen.getByText('Project Applications')).toBeInTheDocument()
    })

    const appCard = screen.getByText('ePrescription API').closest('.ant-card')
    await user.click(appCard)

    await waitFor(() => {
      expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    })

    // Navigate to incidents
    const incidentsLink = screen.getByText('Incidents')
    await user.click(incidentsLink)

    await waitFor(() => {
      expect(screen.getByText('Security Incidents')).toBeInTheDocument()
    })

    // Check URL and state are correct
    expect(window.location.hash).toBe('#incidents')
  })

  test('invalid app ID shows error state', async () => {
    // Set hash for invalid app
    mockLocation.hash = '#project-apps/invalid-app'
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    })

    // Should show not found state
    await waitFor(() => {
      expect(screen.getByText('Application not found')).toBeInTheDocument()
    })
  })

  test('navigation preserves existing functionality', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Test existing navigation still works
    const changeRequestsLink = screen.getByText('Change Requests')
    await user.click(changeRequestsLink)

    expect(window.location.hash).toBe('#change-requests')

    await waitFor(() => {
      expect(screen.getByText('Change Request Management')).toBeInTheDocument()
    })

    // Test DevOps Config
    const devopsConfigLink = screen.getByText('DevOps Config')
    await user.click(devopsConfigLink)

    expect(window.location.hash).toBe('#devops-config')

    // Test Monitoring Dashboards
    const monitoringLink = screen.getByText('Monitoring Dashboards')
    await user.click(monitoringLink)

    expect(window.location.hash).toBe('#monitoring-dashboards')
  })

  test('hash change events trigger correct navigation', () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    // Simulate hash change to incidents
    mockLocation.hash = '#incidents'
    window.dispatchEvent(new Event('hashchange'))

    waitFor(() => {
      expect(screen.getByText('Security Incidents')).toBeInTheDocument()
    })

    // Simulate hash change to app detail
    mockLocation.hash = '#project-apps/app-001'
    window.dispatchEvent(new Event('hashchange'))

    waitFor(() => {
      expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    })
  })
})
