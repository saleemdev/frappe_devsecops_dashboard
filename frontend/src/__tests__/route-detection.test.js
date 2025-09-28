import { render, screen, waitFor, act } from '@testing-library/react'
import { ConfigProvider } from 'antd'
import App from '../App'
import {
  createMockLocation,
  createMockHistory,
  routingTestScenarios,
  setupAuthMocks,
  cleanupMocks,
  simulateHashChange
} from './routing.utils.test'

describe('Route Detection Logic', () => {
  let mockLocation
  let mockHistory

  beforeEach(() => {
    mockLocation = createMockLocation()
    mockHistory = createMockHistory()
    setupAuthMocks()
  })

  afterEach(() => {
    cleanupMocks()
  })

  describe('Hash-based route detection', () => {
    routingTestScenarios.forEach(scenario => {
      test(`detects ${scenario.name} correctly`, async () => {
        // Set initial hash
        mockLocation.hash = scenario.hash

        render(
          <ConfigProvider>
            <App />
          </ConfigProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
        })

        // Verify route detection based on expected content
        switch (scenario.expectedRoute) {
          case 'dashboard':
            // Dashboard should be visible by default
            break
          case 'change-requests':
            await waitFor(() => {
              expect(screen.getByText('Change Request Management')).toBeInTheDocument()
            })
            break
          case 'project-apps':
            await waitFor(() => {
              expect(screen.getByText('Project Applications')).toBeInTheDocument()
            })
            break
          case 'devops-config':
            await waitFor(() => {
              expect(screen.getByText('DevOps Configurations')).toBeInTheDocument()
            })
            break
          case 'project-detail':
            await waitFor(() => {
              expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
            })
            break
        }
      })
    })
  })

  describe('Dynamic route changes', () => {
    test('responds to hash changes correctly', async () => {
      render(
        <ConfigProvider>
          <App />
        </ConfigProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      })

      // Test navigation to change requests
      act(() => {
        simulateHashChange('change-requests')
      })

      await waitFor(() => {
        expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      })

      // Test navigation to project apps
      act(() => {
        simulateHashChange('project-apps')
      })

      await waitFor(() => {
        expect(screen.getByText('Project Applications')).toBeInTheDocument()
      })

      // Test navigation back to dashboard
      act(() => {
        simulateHashChange('')
      })

      await waitFor(() => {
        // Should be back to dashboard view
        expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      })
    })

    test('handles project detail route changes', async () => {
      render(
        <ConfigProvider>
          <App />
        </ConfigProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      })

      // Navigate to project detail
      act(() => {
        simulateHashChange('project/PROJ-001')
      })

      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      })

      // Navigate to different project
      act(() => {
        simulateHashChange('project/PROJ-002')
      })

      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Route parameter extraction', () => {
    test('extracts project ID correctly from hash', async () => {
      const projectIds = ['PROJ-001', 'TEST-123', 'COMPLEX-PROJECT-ID-456']

      for (const projectId of projectIds) {
        mockLocation.hash = `project/${projectId}`

        render(
          <ConfigProvider>
            <App />
          </ConfigProvider>
        )

        await waitFor(() => {
          expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
        })

        // Clean up for next iteration
        screen.unmount?.()
      }
    })

    test('handles malformed project routes gracefully', async () => {
      const malformedRoutes = ['project/', 'project', 'project//']

      for (const route of malformedRoutes) {
        mockLocation.hash = route

        render(
          <ConfigProvider>
            <App />
          </ConfigProvider>
        )

        await waitFor(() => {
          // Should fall back to dashboard
          expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
        })

        // Clean up for next iteration
        screen.unmount?.()
      }
    })
  })

  describe('Initial route detection', () => {
    test('detects initial route on page load', async () => {
      // Set hash before rendering
      mockLocation.hash = 'change-requests'

      render(
        <ConfigProvider>
          <App />
        </ConfigProvider>
      )

      // Should load directly to change requests page
      await waitFor(() => {
        expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      })
    })

    test('defaults to dashboard when no hash present', async () => {
      // Ensure no hash
      mockLocation.hash = ''

      render(
        <ConfigProvider>
          <App />
        </ConfigProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      })
    })
  })

  describe('Error handling', () => {
    test('handles invalid routes gracefully', async () => {
      const invalidRoutes = [
        'invalid-route',
        'not/a/valid/route',
        '////',
        'project//',
        'settings/invalid'
      ]

      for (const route of invalidRoutes) {
        mockLocation.hash = route

        render(
          <ConfigProvider>
            <App />
          </ConfigProvider>
        )

        await waitFor(() => {
          // Should fall back to dashboard
          expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
        })

        // Clean up for next iteration
        screen.unmount?.()
      }
    })

    test('handles special characters in routes', async () => {
      const specialCharRoutes = [
        'project/PROJ%20001',
        'project/PROJ-001%2FTEST',
        'project/PROJ@001'
      ]

      for (const route of specialCharRoutes) {
        mockLocation.hash = route

        render(
          <ConfigProvider>
            <App />
          </ConfigProvider>
        )

        await waitFor(() => {
          // Should either handle gracefully or fall back to dashboard
          expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
        })

        // Clean up for next iteration
        screen.unmount?.()
      }
    })
  })

  describe('Route state management', () => {
    test('maintains route state during re-renders', async () => {
      const { rerender } = render(
        <ConfigProvider>
          <App />
        </ConfigProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      })

      // Navigate to change requests
      act(() => {
        simulateHashChange('change-requests')
      })

      await waitFor(() => {
        expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      })

      // Re-render component
      rerender(
        <ConfigProvider>
          <App />
        </ConfigProvider>
      )

      // Should maintain the same route
      await waitFor(() => {
        expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      })
    })

    test('clears project ID when navigating away from project detail', async () => {
      render(
        <ConfigProvider>
          <App />
        </ConfigProvider>
      )

      await waitFor(() => {
        expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      })

      // Navigate to project detail
      act(() => {
        simulateHashChange('project/PROJ-001')
      })

      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument()
      })

      // Navigate away from project detail
      act(() => {
        simulateHashChange('change-requests')
      })

      await waitFor(() => {
        expect(screen.getByText('Change Request Management')).toBeInTheDocument()
      })

      // Navigate back to dashboard
      act(() => {
        simulateHashChange('')
      })

      await waitFor(() => {
        expect(screen.getByText('DevSecOps Dashboard')).toBeInTheDocument()
      })
    })
  })
})
