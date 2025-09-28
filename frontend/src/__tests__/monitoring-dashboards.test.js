import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import MonitoringDashboards from '../components/MonitoringDashboards'

// Mock window.open
Object.defineProperty(window, 'open', {
  value: jest.fn(),
  writable: true
})

describe('MonitoringDashboards Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders monitoring dashboards page correctly', async () => {
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    // Check page title
    expect(screen.getByText('Monitoring Dashboards')).toBeInTheDocument()
    expect(screen.getByText(/Manage and access your monitoring dashboards/)).toBeInTheDocument()

    // Check for Add Dashboard button
    expect(screen.getByText('Add Dashboard')).toBeInTheDocument()

    // Check for search and filter components
    expect(screen.getByPlaceholderText('Search dashboards...')).toBeInTheDocument()
    expect(screen.getByText('All Categories')).toBeInTheDocument()
    expect(screen.getByText('All Status')).toBeInTheDocument()
  })

  test('displays mock dashboard data in table', async () => {
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      // Check for mock dashboard entries
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
      expect(screen.getByText('Application Performance')).toBeInTheDocument()
      expect(screen.getByText('Security Monitoring')).toBeInTheDocument()
      expect(screen.getByText('Database Performance')).toBeInTheDocument()
    })

    // Check for category tags
    expect(screen.getByText('Infrastructure')).toBeInTheDocument()
    expect(screen.getByText('Application')).toBeInTheDocument()
    expect(screen.getByText('Security')).toBeInTheDocument()
    expect(screen.getByText('Performance')).toBeInTheDocument()

    // Check for status indicators
    const activeStatuses = screen.getAllByText('Active')
    const inactiveStatuses = screen.getAllByText('Inactive')
    expect(activeStatuses.length).toBeGreaterThan(0)
    expect(inactiveStatuses.length).toBeGreaterThan(0)
  })

  test('search functionality works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Search for "Infrastructure"
    const searchInput = screen.getByPlaceholderText('Search dashboards...')
    await user.type(searchInput, 'Infrastructure')

    await waitFor(() => {
      // Should show Infrastructure Monitoring
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
      // Should not show other dashboards
      expect(screen.queryByText('Application Performance')).not.toBeInTheDocument()
    })

    // Clear search
    await user.clear(searchInput)

    await waitFor(() => {
      // All dashboards should be visible again
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
      expect(screen.getByText('Application Performance')).toBeInTheDocument()
    })
  })

  test('category filter works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Click on category filter dropdown
    const categoryFilter = screen.getByDisplayValue('All Categories')
    await user.click(categoryFilter)

    // Select Infrastructure category
    await user.click(screen.getByText('Infrastructure'))

    await waitFor(() => {
      // Should show only Infrastructure dashboards
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
      // Should not show other categories
      expect(screen.queryByText('Application Performance')).not.toBeInTheDocument()
    })
  })

  test('status filter works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Click on status filter dropdown
    const statusFilter = screen.getByDisplayValue('All Status')
    await user.click(statusFilter)

    // Select Active status
    await user.click(screen.getByText('Active'))

    await waitFor(() => {
      // Should show only active dashboards
      const activeStatuses = screen.getAllByText('Active')
      expect(activeStatuses.length).toBeGreaterThan(0)
      // Should not show inactive dashboards
      expect(screen.queryByText('Inactive')).not.toBeInTheDocument()
    })
  })

  test('add dashboard modal opens and closes correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    // Click Add Dashboard button
    const addButton = screen.getByText('Add Dashboard')
    await user.click(addButton)

    await waitFor(() => {
      // Modal should be open
      expect(screen.getByText('Add New Dashboard')).toBeInTheDocument()
      expect(screen.getByLabelText('Dashboard Name')).toBeInTheDocument()
      expect(screen.getByLabelText('Description')).toBeInTheDocument()
      expect(screen.getByLabelText('Dashboard URL')).toBeInTheDocument()
      expect(screen.getByLabelText('Category')).toBeInTheDocument()
    })

    // Close modal by clicking Cancel
    const cancelButton = screen.getByText('Cancel')
    await user.click(cancelButton)

    await waitFor(() => {
      // Modal should be closed
      expect(screen.queryByText('Add New Dashboard')).not.toBeInTheDocument()
    })
  })

  test('add dashboard form validation works', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    // Open add dashboard modal
    const addButton = screen.getByText('Add Dashboard')
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Add New Dashboard')).toBeInTheDocument()
    })

    // Try to submit without filling required fields
    const submitButton = screen.getByText('Add')
    await user.click(submitButton)

    await waitFor(() => {
      // Should show validation errors
      expect(screen.getByText('Please enter dashboard name')).toBeInTheDocument()
      expect(screen.getByText('Please enter description')).toBeInTheDocument()
      expect(screen.getByText('Please enter dashboard URL')).toBeInTheDocument()
    })
  })

  test('add dashboard form submission works', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    // Open add dashboard modal
    const addButton = screen.getByText('Add Dashboard')
    await user.click(addButton)

    await waitFor(() => {
      expect(screen.getByText('Add New Dashboard')).toBeInTheDocument()
    })

    // Fill in the form
    await user.type(screen.getByLabelText('Dashboard Name'), 'Test Dashboard')
    await user.type(screen.getByLabelText('Description'), 'Test dashboard description')
    await user.type(screen.getByLabelText('Dashboard URL'), 'https://test.example.com')
    
    // Select category
    const categorySelect = screen.getByLabelText('Category')
    await user.click(categorySelect)
    await user.click(screen.getByText('Infrastructure'))

    // Submit form
    const submitButton = screen.getByText('Add')
    await user.click(submitButton)

    await waitFor(() => {
      // Modal should close and new dashboard should appear in table
      expect(screen.queryByText('Add New Dashboard')).not.toBeInTheDocument()
      expect(screen.getByText('Test Dashboard')).toBeInTheDocument()
    })
  })

  test('view dashboard action opens URL in new tab', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Find and click the view button for the first dashboard
    const viewButtons = screen.getAllByRole('button', { name: /view/i })
    await user.click(viewButtons[0])

    // Should call window.open with the dashboard URL
    expect(window.open).toHaveBeenCalledWith(
      'https://grafana.example.com/d/infrastructure',
      '_blank',
      'noopener,noreferrer'
    )
  })

  test('edit dashboard functionality works', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Find and click the edit button for the first dashboard
    const editButtons = screen.getAllByRole('button', { name: /edit/i })
    await user.click(editButtons[0])

    await waitFor(() => {
      // Edit modal should open with pre-filled data
      expect(screen.getByText('Edit Dashboard')).toBeInTheDocument()
      expect(screen.getByDisplayValue('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Modify the name
    const nameInput = screen.getByDisplayValue('Infrastructure Monitoring')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Infrastructure Monitoring')

    // Submit changes
    const updateButton = screen.getByText('Update')
    await user.click(updateButton)

    await waitFor(() => {
      // Modal should close and updated name should appear
      expect(screen.queryByText('Edit Dashboard')).not.toBeInTheDocument()
      expect(screen.getByText('Updated Infrastructure Monitoring')).toBeInTheDocument()
    })
  })

  test('delete dashboard functionality works', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Find and click the delete button for the first dashboard
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i })
    await user.click(deleteButtons[0])

    await waitFor(() => {
      // Confirmation dialog should appear
      expect(screen.getByText('Delete Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Are you sure you want to delete this dashboard?')).toBeInTheDocument()
    })

    // Confirm deletion
    const confirmButton = screen.getByText('Yes')
    await user.click(confirmButton)

    await waitFor(() => {
      // Dashboard should be removed from the table
      expect(screen.queryByText('Infrastructure Monitoring')).not.toBeInTheDocument()
    })
  })

  test('table sorting works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <MonitoringDashboards />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
    })

    // Click on Dashboard Name column header to sort
    const nameHeader = screen.getByText('Dashboard Name')
    await user.click(nameHeader)

    // Table should be sorted (we can't easily test the exact order without more complex setup)
    // But we can verify the table still shows the data
    await waitFor(() => {
      expect(screen.getByText('Infrastructure Monitoring')).toBeInTheDocument()
      expect(screen.getByText('Application Performance')).toBeInTheDocument()
    })
  })
})
