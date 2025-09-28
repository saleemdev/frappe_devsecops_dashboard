/**
 * Test utilities for routing functionality
 * This file contains helper functions and test scenarios for routing
 */

// Mock location object for testing
export const createMockLocation = (initialHash = '') => {
  const mockLocation = {
    hash: initialHash,
    pathname: '/frontend',
    search: '',
    href: `http://localhost/frontend${initialHash ? '#' + initialHash : ''}`
  }

  Object.defineProperty(window, 'location', {
    value: mockLocation,
    writable: true,
    configurable: true
  })

  return mockLocation
}

// Mock history object for testing
export const createMockHistory = () => {
  const mockHistory = {
    pushState: jest.fn(),
    replaceState: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    go: jest.fn()
  }

  Object.defineProperty(window, 'history', {
    value: mockHistory,
    writable: true,
    configurable: true
  })

  return mockHistory
}

// Test scenarios for routing
export const routingTestScenarios = [
  {
    name: 'Dashboard route',
    hash: '',
    expectedRoute: 'dashboard',
    expectedProjectId: null
  },
  {
    name: 'Change Requests route',
    hash: 'change-requests',
    expectedRoute: 'change-requests',
    expectedProjectId: null
  },
  {
    name: 'Project Apps route',
    hash: 'project-apps',
    expectedRoute: 'project-apps',
    expectedProjectId: null
  },
  {
    name: 'DevOps Config route',
    hash: 'devops-config',
    expectedRoute: 'devops-config',
    expectedProjectId: null
  },
  {
    name: 'Project Detail route',
    hash: 'project/PROJ-001',
    expectedRoute: 'project-detail',
    expectedProjectId: 'PROJ-001'
  },
  {
    name: 'Project Detail with complex ID',
    hash: 'project/TEST-PROJECT-123-ABC',
    expectedRoute: 'project-detail',
    expectedProjectId: 'TEST-PROJECT-123-ABC'
  }
]

// Navigation test scenarios
export const navigationTestScenarios = [
  {
    name: 'Navigate from Dashboard to Change Requests',
    startRoute: 'dashboard',
    targetRoute: 'change-requests',
    expectedHash: 'change-requests'
  },
  {
    name: 'Navigate from Change Requests to Project Apps',
    startRoute: 'change-requests',
    targetRoute: 'project-apps',
    expectedHash: 'project-apps'
  },
  {
    name: 'Navigate from Project Apps to DevOps Config',
    startRoute: 'project-apps',
    targetRoute: 'devops-config',
    expectedHash: 'devops-config'
  },
  {
    name: 'Navigate to Project Detail',
    startRoute: 'dashboard',
    targetRoute: 'project-detail',
    projectId: 'PROJ-001',
    expectedHash: 'project/PROJ-001'
  },
  {
    name: 'Navigate back to Dashboard from Project Detail',
    startRoute: 'project-detail',
    targetRoute: 'dashboard',
    expectedHash: ''
  }
]

// Breadcrumb test scenarios
export const breadcrumbTestScenarios = [
  {
    route: 'dashboard',
    expectedBreadcrumbs: ['Dashboard']
  },
  {
    route: 'change-requests',
    expectedBreadcrumbs: ['Home', 'Change Requests']
  },
  {
    route: 'project-apps',
    expectedBreadcrumbs: ['Home', 'Project Apps']
  },
  {
    route: 'devops-config',
    expectedBreadcrumbs: ['Home', 'DevOps Configuration']
  },
  {
    route: 'project-detail',
    expectedBreadcrumbs: ['Home', 'Projects', 'Project Details']
  }
]

// Helper function to simulate hash change
export const simulateHashChange = (newHash) => {
  window.location.hash = newHash
  window.dispatchEvent(new Event('hashchange'))
}

// Helper function to wait for route change
export const waitForRouteChange = (expectedRoute, timeout = 5000) => {
  return new Promise((resolve, reject) => {
    const startTime = Date.now()
    
    const checkRoute = () => {
      const currentHash = window.location.hash.slice(1)
      
      if (currentHash === expectedRoute || 
          (expectedRoute === 'dashboard' && currentHash === '')) {
        resolve(true)
        return
      }
      
      if (Date.now() - startTime > timeout) {
        reject(new Error(`Route change timeout. Expected: ${expectedRoute}, Got: ${currentHash}`))
        return
      }
      
      setTimeout(checkRoute, 100)
    }
    
    checkRoute()
  })
}

// Helper function to create test project data
export const createTestProjectData = (id = 'PROJ-001') => ({
  id,
  name: `Test Project ${id}`,
  description: 'Test project description',
  status: 'Active',
  priority: 'High',
  progress: 75,
  startDate: '2024-01-15',
  endDate: '2024-04-30',
  budget: 100000,
  spent: 65000,
  manager: {
    name: 'Test Manager',
    email: 'manager@test.com'
  },
  team: [
    { name: 'Developer 1', role: 'Frontend Developer' },
    { name: 'Developer 2', role: 'Backend Developer' }
  ],
  stats: {
    totalTasks: 20,
    completedTasks: 15,
    inProgressTasks: 3,
    pendingTasks: 2
  }
})

// Helper function to setup authentication mocks
export const setupAuthMocks = () => {
  // Mock CSRF token
  Object.defineProperty(window, 'csrf_token', {
    value: 'test-csrf-token',
    writable: true,
    configurable: true
  })

  // Mock document.cookie
  Object.defineProperty(document, 'cookie', {
    value: 'user_id=test-user; sid=test-session',
    writable: true,
    configurable: true
  })

  // Mock fetch for authentication
  global.fetch = jest.fn(() =>
    Promise.resolve({
      ok: true,
      json: () => Promise.resolve({ message: 'success' })
    })
  )
}

// Helper function to cleanup mocks
export const cleanupMocks = () => {
  jest.restoreAllMocks()
  delete window.location
  delete window.history
  delete window.csrf_token
}

// Test data for menu items
export const menuTestData = [
  {
    key: 'dashboard',
    label: 'Dashboard',
    expectedRoute: 'dashboard'
  },
  {
    key: 'change-requests',
    label: 'Change Requests',
    expectedRoute: 'change-requests'
  },
  {
    key: 'project-apps',
    label: 'Project Apps',
    expectedRoute: 'project-apps'
  },
  {
    key: 'devops-config',
    label: 'DevOps Config',
    expectedRoute: 'devops-config'
  }
]

// Error scenarios for testing
export const errorTestScenarios = [
  {
    name: 'Invalid hash format',
    hash: 'invalid-hash-format',
    expectedFallback: 'dashboard'
  },
  {
    name: 'Malformed project route',
    hash: 'project/',
    expectedFallback: 'dashboard'
  },
  {
    name: 'Non-existent route',
    hash: 'non-existent-route',
    expectedFallback: 'dashboard'
  },
  {
    name: 'Empty project ID',
    hash: 'project/',
    expectedFallback: 'dashboard'
  }
]

// Performance test scenarios
export const performanceTestScenarios = [
  {
    name: 'Rapid navigation',
    routes: ['dashboard', 'change-requests', 'project-apps', 'devops-config', 'dashboard'],
    maxTimePerNavigation: 100 // milliseconds
  },
  {
    name: 'Deep navigation',
    routes: ['dashboard', 'project/PROJ-001', 'dashboard', 'project/PROJ-002', 'dashboard'],
    maxTimePerNavigation: 150 // milliseconds
  }
]

export default {
  createMockLocation,
  createMockHistory,
  routingTestScenarios,
  navigationTestScenarios,
  breadcrumbTestScenarios,
  simulateHashChange,
  waitForRouteChange,
  createTestProjectData,
  setupAuthMocks,
  cleanupMocks,
  menuTestData,
  errorTestScenarios,
  performanceTestScenarios
}
