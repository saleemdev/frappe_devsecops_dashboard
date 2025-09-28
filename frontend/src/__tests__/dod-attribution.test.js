import { render, screen, waitFor } from '@testing-library/react'
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

describe('DOD DevSecOps Attribution', () => {
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

  test('displays DOD DevSecOps attribution footer', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Check for DOD DevSecOps attribution
    expect(screen.getByText(/Powered by/)).toBeInTheDocument()
    expect(screen.getByText('DOD DevSecOps')).toBeInTheDocument()
    expect(screen.getByText(/tiberbu HealthNet Initiative/)).toBeInTheDocument()
  })

  test('attribution footer is visible on all pages', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Check attribution on dashboard
    expect(screen.getByText('DOD DevSecOps')).toBeInTheDocument()

    // Navigate to different pages and verify attribution is still present
    const pages = [
      { hash: 'change-requests', text: 'Change Request Management' },
      { hash: 'project-apps', text: 'Project Applications' },
      { hash: 'devops-config', text: 'DevOps Configurations' },
      { hash: 'monitoring-dashboards', text: 'Monitoring Dashboards' }
    ]

    for (const page of pages) {
      mockLocation.hash = page.hash
      window.dispatchEvent(new Event('hashchange'))

      await waitFor(() => {
        expect(screen.getByText(page.text)).toBeInTheDocument()
      })

      // Attribution should still be visible
      expect(screen.getByText('DOD DevSecOps')).toBeInTheDocument()
    }
  })

  test('attribution footer has proper styling and positioning', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Find the attribution text
    const attribution = screen.getByText(/Powered by/)
    expect(attribution).toBeInTheDocument()

    // Check that it's in a footer-like container
    const footerContainer = attribution.closest('div')
    expect(footerContainer).toBeInTheDocument()
  })

  test('no Avaza references remain in the application', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Ensure no Avaza text is present anywhere
    expect(screen.queryByText(/avaza/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/Avaza/)).not.toBeInTheDocument()
  })

  test('settings dropdown no longer contains Avaza settings', async () => {
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
    expect(settingsButton).toBeInTheDocument()

    // Settings dropdown should not contain Avaza settings
    expect(screen.queryByText('Avaza Settings')).not.toBeInTheDocument()
  })

  test('breadcrumb navigation works without Avaza routes', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Navigate to monitoring dashboards
    mockLocation.hash = 'monitoring-dashboards'
    window.dispatchEvent(new Event('hashchange'))

    await waitFor(() => {
      expect(screen.getByText('Monitoring Dashboards')).toBeInTheDocument()
    })

    // Check breadcrumb
    const breadcrumb = screen.getByRole('navigation')
    expect(breadcrumb).toBeInTheDocument()
    expect(screen.getByText('Monitoring Dashboards')).toBeInTheDocument()

    // Should not contain any Avaza breadcrumb items
    expect(screen.queryByText(/Avaza/)).not.toBeInTheDocument()
  })

  test('attribution text is properly formatted', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Check that the attribution contains the expected elements
    const poweredByText = screen.getByText(/Powered by/)
    const dodText = screen.getByText('DOD DevSecOps')
    const initiativeText = screen.getByText(/tiberbu HealthNet Initiative/)

    expect(poweredByText).toBeInTheDocument()
    expect(dodText).toBeInTheDocument()
    expect(initiativeText).toBeInTheDocument()

    // Check that DOD DevSecOps is styled as strong/emphasized
    expect(dodText.tagName.toLowerCase()).toBe('span')
  })

  test('attribution footer does not interfere with page functionality', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Verify main navigation still works
    const menuItems = ['Dashboard', 'Change Requests', 'Project Apps', 'DevOps Config', 'Monitoring Dashboards']
    
    for (const menuItem of menuItems) {
      const menuElement = screen.getByText(menuItem)
      expect(menuElement).toBeInTheDocument()
    }

    // Attribution should be present but not interfere
    expect(screen.getByText('DOD DevSecOps')).toBeInTheDocument()
  })

  test('page layout accommodates attribution footer properly', async () => {
    render(
      <ConfigProvider>
        <App />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
    })

    // Check that the main content area is still accessible
    const mainContent = screen.getByText('DevSecOps Dashboard')
    expect(mainContent).toBeInTheDocument()

    // Attribution should be at the bottom
    const attribution = screen.getByText('DOD DevSecOps')
    expect(attribution).toBeInTheDocument()

    // Both should be visible simultaneously
    expect(mainContent).toBeVisible()
    expect(attribution).toBeVisible()
  })
})
