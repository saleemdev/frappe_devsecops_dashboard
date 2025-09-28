/**
 * ProjectAppDetail Component Tests
 * Tests the application detail view functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import ProjectAppDetail from '../components/ProjectAppDetail'

const mockNavigateToRoute = jest.fn()

describe('ProjectAppDetail Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders loading state initially', () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    expect(screen.getByText('Loading application details...')).toBeInTheDocument()
  })

  test('renders app not found for invalid app ID', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="invalid-app" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Application not found')).toBeInTheDocument()
    })

    expect(screen.getByText('Back to Project Apps')).toBeInTheDocument()
  })

  test('renders app details for valid app ID', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check header elements
    expect(screen.getByText('Back to Project Apps')).toBeInTheDocument()
    expect(screen.getByText('Repository')).toBeInTheDocument()
    expect(screen.getByText('Live App')).toBeInTheDocument()
    expect(screen.getByText('Active')).toBeInTheDocument()
  })

  test('displays overview metrics cards', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check metric cards
    expect(screen.getByText('95%')).toBeInTheDocument() // Health Score
    expect(screen.getByText('88%')).toBeInTheDocument() // Security Score
    expect(screen.getByText('99.9%')).toBeInTheDocument() // Uptime
    expect(screen.getByText('145ms')).toBeInTheDocument() // Response Time

    // Check metric labels
    expect(screen.getByText('Health Score')).toBeInTheDocument()
    expect(screen.getByText('Security Score')).toBeInTheDocument()
    expect(screen.getByText('Uptime')).toBeInTheDocument()
    expect(screen.getByText('Avg Response')).toBeInTheDocument()
  })

  test('back button navigates to project apps', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    const backButton = screen.getByText('Back to Project Apps')
    await user.click(backButton)

    expect(mockNavigateToRoute).toHaveBeenCalledWith('project-apps')
  })

  test('external links work correctly', async () => {
    // Mock window.open
    const mockOpen = jest.fn()
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true
    })

    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check repository and live app links exist
    expect(screen.getByText('Repository')).toBeInTheDocument()
    expect(screen.getByText('Live App')).toBeInTheDocument()
  })

  test('overview tab displays application information', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check overview tab is active by default
    expect(screen.getByText('Application Information')).toBeInTheDocument()
    expect(screen.getByText('ePrescription')).toBeInTheDocument() // Project name
    expect(screen.getByText('Node.js')).toBeInTheDocument() // Technology
    expect(screen.getByText('Express.js')).toBeInTheDocument() // Framework
    expect(screen.getByText('PostgreSQL')).toBeInTheDocument() // Database
    expect(screen.getByText('v2.1.3')).toBeInTheDocument() // Version
    expect(screen.getByText('Production')).toBeInTheDocument() // Environment
  })

  test('configuration tab displays environment variables', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Click configuration tab
    const configTab = screen.getByText('Configuration')
    await user.click(configTab)

    // Check environment variables table
    expect(screen.getByText('Environment Variables')).toBeInTheDocument()
    expect(screen.getByText('NODE_ENV')).toBeInTheDocument()
    expect(screen.getByText('production')).toBeInTheDocument()
    expect(screen.getByText('DATABASE_URL')).toBeInTheDocument()
    expect(screen.getByText('***REDACTED***')).toBeInTheDocument()
    
    // Check sensitive column
    expect(screen.getByText('Sensitive')).toBeInTheDocument()
    expect(screen.getAllByText('Yes')).toHaveLength(2) // DATABASE_URL and JWT_SECRET
    expect(screen.getAllByText('No')).toHaveLength(2) // NODE_ENV and API_VERSION
  })

  test('deployment history tab displays deployment records', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Click deployment history tab
    const deploymentTab = screen.getByText('Deployment History')
    await user.click(deploymentTab)

    // Check deployment history table
    expect(screen.getByText('v2.1.3')).toBeInTheDocument()
    expect(screen.getByText('v2.1.2')).toBeInTheDocument()
    expect(screen.getByText('v2.1.1')).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getAllByText('Success')).toHaveLength(2)
    expect(screen.getByText('Failed')).toBeInTheDocument()
  })

  test('security scans tab displays security information', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Click security scans tab
    const securityTab = screen.getByText('Security Scans')
    await user.click(securityTab)

    // Check compliance status alert
    expect(screen.getByText('Security Compliance Status')).toBeInTheDocument()
    expect(screen.getByText(/Application is compliant with DOD security standards/)).toBeInTheDocument()

    // Check security scans table
    expect(screen.getByText('SAST')).toBeInTheDocument()
    expect(screen.getByText('DAST')).toBeInTheDocument()
    expect(screen.getByText('Dependency Scan')).toBeInTheDocument()
    expect(screen.getAllByText('Passed')).toHaveLength(2)
    expect(screen.getByText('Warning')).toBeInTheDocument()
  })

  test('team & access tab displays team members', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Click team & access tab
    const teamTab = screen.getByText('Team & Access')
    await user.click(teamTab)

    // Check team members
    expect(screen.getByText('Team Members')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
    expect(screen.getByText('Lead Developer')).toBeInTheDocument()
    expect(screen.getByText('Sarah Johnson')).toBeInTheDocument()
    expect(screen.getByText('DevOps Engineer')).toBeInTheDocument()
    expect(screen.getByText('Mike Davis')).toBeInTheDocument()
    expect(screen.getByText('Security Analyst')).toBeInTheDocument()
  })

  test('performance metrics display correctly', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check performance metrics in overview
    expect(screen.getByText('Performance Metrics')).toBeInTheDocument()
    expect(screen.getByText('0.02%')).toBeInTheDocument() // Error Rate
    expect(screen.getByText('1250 req/min')).toBeInTheDocument() // Throughput
  })

  test('status tags display with correct colors', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check status tag
    const statusTag = screen.getByText('Active')
    expect(statusTag).toBeInTheDocument()
    expect(statusTag.closest('.ant-tag')).toHaveClass('ant-tag-green')
  })

  test('responsive design elements work correctly', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check responsive grid layout exists
    const metricsCards = screen.getAllByText(/Score|Uptime|Response/)
    expect(metricsCards.length).toBeGreaterThan(0)
  })

  test('tabs navigation works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="app-001" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Test all tabs
    const tabs = ['Configuration', 'Deployment History', 'Security Scans', 'Team & Access']
    
    for (const tabName of tabs) {
      const tab = screen.getByText(tabName)
      await user.click(tab)
      
      // Each tab should be clickable and show different content
      expect(tab).toBeInTheDocument()
    }
  })

  test('handles loading and error states properly', async () => {
    render(
      <ConfigProvider>
        <ProjectAppDetail appId="nonexistent-app" navigateToRoute={mockNavigateToRoute} />
      </ConfigProvider>
    )

    // Should show loading first
    expect(screen.getByText('Loading application details...')).toBeInTheDocument()

    // Then show not found
    await waitFor(() => {
      expect(screen.getByText('Application not found')).toBeInTheDocument()
    })
  })
})
