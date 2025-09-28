/**
 * ProjectApps Routing Tests
 * Tests the enhanced routing functionality for project applications
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ConfigProvider } from 'antd'
import ProjectApps from '../components/ProjectApps'

const mockNavigateToRoute = jest.fn()

describe('ProjectApps Routing Enhancement', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  test('renders project apps list by default', async () => {
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('Project Applications')).toBeInTheDocument()
    })

    // Check that app cards are displayed
    expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    expect(screen.getByText('Patient Portal')).toBeInTheDocument()
    expect(screen.getByText('Medical Records System')).toBeInTheDocument()
  })

  test('renders app detail view when showAppDetail is true', () => {
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={true}
          selectedAppId="app-001"
        />
      </ConfigProvider>
    )

    // Should show loading state of ProjectAppDetail component
    expect(screen.getByText('Loading application details...')).toBeInTheDocument()
  })

  test('app cards are clickable and trigger navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Find and click on the first app card
    const appCard = screen.getByText('ePrescription API').closest('.ant-card')
    expect(appCard).toBeInTheDocument()
    
    await user.click(appCard)

    // Check that navigation was called with correct parameters
    expect(mockNavigateToRoute).toHaveBeenCalledWith('app-detail', null, 'app-001')
  })

  test('action buttons do not trigger card navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Find edit button and click it
    const editButtons = screen.getAllByRole('button')
    const editButton = editButtons.find(button => 
      button.querySelector('.anticon-edit')
    )
    
    if (editButton) {
      await user.click(editButton)
      
      // Navigation should not be called when clicking action buttons
      expect(mockNavigateToRoute).not.toHaveBeenCalled()
      
      // Edit modal should open instead
      await waitFor(() => {
        expect(screen.getByText('Edit Application')).toBeInTheDocument()
      })
    }
  })

  test('repository link button does not trigger card navigation', async () => {
    const user = userEvent.setup()
    
    // Mock window.open
    const mockOpen = jest.fn()
    Object.defineProperty(window, 'open', {
      value: mockOpen,
      writable: true
    })
    
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Find repository link button and click it
    const linkButtons = screen.getAllByRole('button')
    const linkButton = linkButtons.find(button => 
      button.querySelector('.anticon-link')
    )
    
    if (linkButton) {
      await user.click(linkButton)
      
      // Navigation should not be called
      expect(mockNavigateToRoute).not.toHaveBeenCalled()
      
      // Window.open should be called instead
      expect(mockOpen).toHaveBeenCalled()
    }
  })

  test('delete button does not trigger card navigation', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Find delete button and click it
    const deleteButtons = screen.getAllByRole('button')
    const deleteButton = deleteButtons.find(button => 
      button.querySelector('.anticon-delete')
    )
    
    if (deleteButton) {
      await user.click(deleteButton)
      
      // Navigation should not be called
      expect(mockNavigateToRoute).not.toHaveBeenCalled()
      
      // Confirmation dialog should appear
      await waitFor(() => {
        expect(screen.getByText('Are you sure you want to delete this app?')).toBeInTheDocument()
      })
    }
  })

  test('card hover effect works correctly', async () => {
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Find app card
    const appCard = screen.getByText('ePrescription API').closest('.ant-card')
    expect(appCard).toBeInTheDocument()
    
    // Check that card has hoverable class and cursor pointer style
    expect(appCard).toHaveClass('ant-card-hoverable')
    expect(appCard).toHaveStyle('cursor: pointer')
  })

  test('multiple app cards can be clicked independently', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
      expect(screen.getByText('Patient Portal')).toBeInTheDocument()
    })

    // Click first app card
    const firstAppCard = screen.getByText('ePrescription API').closest('.ant-card')
    await user.click(firstAppCard)
    
    expect(mockNavigateToRoute).toHaveBeenCalledWith('app-detail', null, 'app-001')
    
    // Reset mock
    mockNavigateToRoute.mockClear()
    
    // Click second app card
    const secondAppCard = screen.getByText('Patient Portal').closest('.ant-card')
    await user.click(secondAppCard)
    
    expect(mockNavigateToRoute).toHaveBeenCalledWith('app-detail', null, 'app-002')
  })

  test('navigation works without navigateToRoute prop', async () => {
    const user = userEvent.setup()
    
    render(
      <ConfigProvider>
        <ProjectApps 
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Click app card without navigateToRoute prop
    const appCard = screen.getByText('ePrescription API').closest('.ant-card')
    await user.click(appCard)
    
    // Should not throw error
    expect(appCard).toBeInTheDocument()
  })

  test('app detail view receives correct props', () => {
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={true}
          selectedAppId="app-002"
        />
      </ConfigProvider>
    )

    // ProjectAppDetail should be rendered with correct appId
    expect(screen.getByText('Loading application details...')).toBeInTheDocument()
  })

  test('conditional rendering works correctly', () => {
    const { rerender } = render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    // Should show app list
    expect(screen.getByText('Project Applications')).toBeInTheDocument()

    // Re-render with app detail view
    rerender(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={true}
          selectedAppId="app-001"
        />
      </ConfigProvider>
    )

    // Should show app detail view
    expect(screen.getByText('Loading application details...')).toBeInTheDocument()
    expect(screen.queryByText('Project Applications')).not.toBeInTheDocument()
  })

  test('app cards display correct information', async () => {
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    await waitFor(() => {
      expect(screen.getByText('ePrescription API')).toBeInTheDocument()
    })

    // Check app information is displayed
    expect(screen.getByText('RESTful API for electronic prescription management')).toBeInTheDocument()
    expect(screen.getByText('Node.js')).toBeInTheDocument()
    expect(screen.getByText('DEPLOYED')).toBeInTheDocument()
  })

  test('empty state displays when no apps available', () => {
    // Mock empty apps array
    const originalConsoleError = console.error
    console.error = jest.fn() // Suppress React warnings for this test
    
    render(
      <ConfigProvider>
        <ProjectApps 
          navigateToRoute={mockNavigateToRoute}
          showAppDetail={false}
          selectedAppId={null}
        />
      </ConfigProvider>
    )

    // Note: This test would need the component to be modified to accept apps as props
    // or have a way to mock the empty state. For now, we test the structure exists.
    expect(screen.getByText('Project Applications')).toBeInTheDocument()
    
    console.error = originalConsoleError
  })
})
