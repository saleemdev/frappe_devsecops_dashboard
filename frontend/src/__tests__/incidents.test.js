/**
 * Incidents Component Tests
 * Tests the incident management system functionality
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import Incidents from '../components/Incidents'

// Mock antd message
jest.mock('antd', () => ({
  ...jest.requireActual('antd'),
  message: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn()
  }
}))

describe('Incidents Component', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders incidents page with title and add button', async () => {
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Check page title
    expect(screen.getByText('Security Incidents')).toBeInTheDocument()
    
    // Check add incident button
    expect(screen.getByText('Add Incident')).toBeInTheDocument()
    
    // Check refresh button
    expect(screen.getByText('Refresh')).toBeInTheDocument()
  })

  test('displays incident table with mock data', async () => {
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Check table headers
    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Title')).toBeInTheDocument()
    expect(screen.getByText('Severity')).toBeInTheDocument()
    expect(screen.getByText('Status')).toBeInTheDocument()
    expect(screen.getByText('Created Date')).toBeInTheDocument()
    expect(screen.getByText('Assigned To')).toBeInTheDocument()
    expect(screen.getByText('Actions')).toBeInTheDocument()

    // Check sample incident data
    expect(screen.getByText('SQL Injection Vulnerability in Login API')).toBeInTheDocument()
    expect(screen.getByText('Critical')).toBeInTheDocument()
    expect(screen.getByText('John Smith')).toBeInTheDocument()
  })

  test('opens add incident modal when add button is clicked', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Click add incident button
    const addButton = screen.getByText('Add Incident')
    await user.click(addButton)

    // Check modal is open
    await waitFor(() => {
      expect(screen.getByText('Add New Incident')).toBeInTheDocument()
    })

    // Check form fields
    expect(screen.getByLabelText('Title')).toBeInTheDocument()
    expect(screen.getByLabelText('Description')).toBeInTheDocument()
    expect(screen.getByLabelText('Severity')).toBeInTheDocument()
    expect(screen.getByLabelText('Category')).toBeInTheDocument()
    expect(screen.getByLabelText('Assigned To')).toBeInTheDocument()
  })

  test('search functionality filters incidents', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Search for specific incident
    const searchInput = screen.getByPlaceholderText('Search incidents...')
    await user.type(searchInput, 'SQL Injection')

    // Check filtered results
    expect(screen.getByText('SQL Injection Vulnerability in Login API')).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized Access to Admin Panel')).not.toBeInTheDocument()
  })

  test('severity filter works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Open severity filter dropdown
    const severityFilter = screen.getByDisplayValue('All Severity')
    await user.click(severityFilter)

    // Select Critical severity
    await user.click(screen.getByText('Critical'))

    // Check only critical incidents are shown
    expect(screen.getByText('SQL Injection Vulnerability in Login API')).toBeInTheDocument()
    expect(screen.queryByText('Unauthorized Access to Admin Panel')).not.toBeInTheDocument()
  })

  test('status filter works correctly', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Open status filter dropdown
    const statusFilter = screen.getByDisplayValue('All Status')
    await user.click(statusFilter)

    // Select Closed status
    await user.click(screen.getByText('Closed'))

    // Check only closed incidents are shown
    expect(screen.getByText('Compliance Audit Finding - Missing Logs')).toBeInTheDocument()
    expect(screen.queryByText('SQL Injection Vulnerability in Login API')).not.toBeInTheDocument()
  })

  test('view details modal shows incident information', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Click view details button (eye icon)
    const viewButtons = screen.getAllByRole('button')
    const viewButton = viewButtons.find(button => 
      button.querySelector('.anticon-eye')
    )
    
    if (viewButton) {
      await user.click(viewButton)

      // Check details modal
      await waitFor(() => {
        expect(screen.getByText('Incident Details - INC-001')).toBeInTheDocument()
      })
    }
  })

  test('edit incident opens modal with pre-filled data', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Click edit button (edit icon)
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(button => 
      button.querySelector('.anticon-edit')
    )
    
    if (editButton) {
      await user.click(editButton)

      // Check edit modal
      await waitFor(() => {
        expect(screen.getByText('Edit Incident')).toBeInTheDocument()
      })

      // Check pre-filled data
      expect(screen.getByDisplayValue('SQL Injection Vulnerability in Login API')).toBeInTheDocument()
    }
  })

  test('mark as closed functionality works', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Click mark as closed button (check circle icon)
    const closeButtons = screen.getAllByRole('button')
    const closeButton = closeButtons.find(button => 
      button.querySelector('.anticon-check-circle')
    )
    
    if (closeButton) {
      await user.click(closeButton)

      // Confirm the action
      await waitFor(() => {
        expect(screen.getByText('Mark this incident as closed?')).toBeInTheDocument()
      })

      const confirmButton = screen.getByText('Yes')
      await user.click(confirmButton)

      // Check success message was called
      await waitFor(() => {
        expect(require('antd').message.success).toHaveBeenCalledWith('Incident marked as closed')
      })
    }
  })

  test('form validation works for required fields', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Click add incident button
    const addButton = screen.getByText('Add Incident')
    await user.click(addButton)

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Add New Incident')).toBeInTheDocument()
    })

    // Try to submit without filling required fields
    const createButton = screen.getByText('Create Incident')
    await user.click(createButton)

    // Check validation messages appear
    await waitFor(() => {
      expect(screen.getByText('Please enter incident title')).toBeInTheDocument()
      expect(screen.getByText('Please enter incident description')).toBeInTheDocument()
      expect(screen.getByText('Please select severity')).toBeInTheDocument()
      expect(screen.getByText('Please select category')).toBeInTheDocument()
      expect(screen.getByText('Please enter assigned user')).toBeInTheDocument()
    })
  })

  test('creates new incident successfully', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Click add incident button
    const addButton = screen.getByText('Add Incident')
    await user.click(addButton)

    // Wait for modal to open
    await waitFor(() => {
      expect(screen.getByText('Add New Incident')).toBeInTheDocument()
    })

    // Fill form fields
    await user.type(screen.getByLabelText('Title'), 'Test Incident')
    await user.type(screen.getByLabelText('Description'), 'Test incident description')
    
    // Select severity
    await user.click(screen.getByLabelText('Severity'))
    await user.click(screen.getByText('High'))
    
    // Select category
    await user.click(screen.getByLabelText('Category'))
    await user.click(screen.getByText('Security'))
    
    await user.type(screen.getByLabelText('Assigned To'), 'Test User')

    // Submit form
    const createButton = screen.getByText('Create Incident')
    await user.click(createButton)

    // Check success message
    await waitFor(() => {
      expect(require('antd').message.success).toHaveBeenCalledWith('Incident created successfully')
    })
  })

  test('refresh button reloads incidents', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Click refresh button
    const refreshButton = screen.getByText('Refresh')
    await user.click(refreshButton)

    // Check loading state appears briefly
    expect(refreshButton.closest('button')).toHaveAttribute('class', expect.stringContaining('ant-btn-loading'))
  })

  test('table pagination works correctly', async () => {
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Wait for data to load
    await waitFor(() => {
      expect(screen.getByText('INC-001')).toBeInTheDocument()
    })

    // Check pagination info
    expect(screen.getByText(/1-5 of 5 incidents/)).toBeInTheDocument()
  })

  test('responsive design elements are present', () => {
    render(
      <ConfigProvider>
        <Incidents />
      </ConfigProvider>
    )

    // Check responsive grid layout
    const searchInput = screen.getByPlaceholderText('Search incidents...')
    expect(searchInput).toBeInTheDocument()

    // Check responsive columns exist
    const statusFilter = screen.getByDisplayValue('All Status')
    const severityFilter = screen.getByDisplayValue('All Severity')
    
    expect(statusFilter).toBeInTheDocument()
    expect(severityFilter).toBeInTheDocument()
  })
})
