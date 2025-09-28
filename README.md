# DevSecOps Dashboard - Developer Playbook

A comprehensive DevSecOps dashboard application built with React 19, Zustand state management, and Frappe framework integration. This playbook provides everything developers need to understand, contribute to, and extend the application.

## Table of Contents

1. [Application Architecture Overview](#application-architecture-overview)
2. [State Management with Zustand](#state-management-with-zustand)
3. [API Architecture](#api-architecture)
4. [Development Setup Guide](#development-setup-guide)
5. [Component Development Guidelines](#component-development-guidelines)
6. [Build and Deployment](#build-and-deployment)
7. [Testing and Debugging](#testing-and-debugging)
8. [Contributing Guidelines](#contributing-guidelines)

---

## Application Architecture Overview

### High-Level System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    DevSecOps Dashboard                     │
├─────────────────────────────────────────────────────────────┤
│  Frontend (React 19 + Vite)                               │
│  ├── Components (Ant Design UI)                           │
│  ├── State Management (Zustand Stores)                    │
│  ├── API Services (Centralized Layer)                     │
│  └── Routing (Hash-based SPA)                             │
├─────────────────────────────────────────────────────────────┤
│  Backend (Frappe Framework)                               │
│  ├── API Endpoints (/api/method/...)                      │
│  ├── Authentication & Session Management                   │
│  ├── CSRF Protection                                       │
│  └── ERPNext Project Integration                           │
├─────────────────────────────────────────────────────────────┤
│  Data Layer                                                │
│  ├── Projects (ERPNext Projects)                          │
│  ├── Applications (Custom DocTypes)                       │
│  ├── Incidents (Security Management)                      │
│  └── Change Requests (DevOps Workflows)                   │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- **React 19**: Latest React with concurrent features and improved performance
- **Vite**: Fast build tool with HMR (Hot Module Replacement)
- **Ant Design 5.x**: Enterprise-class UI component library
- **Zustand**: Lightweight state management (chosen over Redux for simplicity)
- **Axios**: HTTP client for API communication

**Backend:**
- **Frappe Framework**: Python web framework with built-in ORM
- **ERPNext**: Business application platform for project management
- **MariaDB/PostgreSQL**: Database layer
- **Redis**: Caching and session storage

### File and Folder Structure

```
apps/frappe_devsecops_dashboard/
├── frontend/                          # React application
│   ├── src/
│   │   ├── components/                # React components
│   │   │   ├── Dashboard.jsx         # Main dashboard view
│   │   │   ├── ProjectApps.jsx       # Application management
│   │   │   ├── ProjectAppDetail.jsx  # Application details
│   │   │   ├── Incidents.jsx         # Incident management
│   │   │   └── ...
│   │   ├── stores/                   # Zustand state stores
│   │   │   ├── index.js             # Store exports
│   │   │   ├── authStore.js         # Authentication state
│   │   │   ├── navigationStore.js   # Navigation state
│   │   │   ├── applicationsStore.js # Applications state
│   │   │   └── incidentsStore.js    # Incidents state
│   │   ├── services/                # API service layer
│   │   │   └── api/
│   │   │       ├── index.js         # Main API service
│   │   │       ├── config.js        # API configuration
│   │   │       ├── mockData.js      # Mock data service
│   │   │       ├── applications.js  # Applications API
│   │   │       └── incidents.js     # Incidents API
│   │   ├── utils/                   # Utility functions
│   │   └── App.jsx                  # Main application component
│   ├── package.json                 # Dependencies and scripts
│   └── vite.config.js              # Vite configuration
├── frappe_devsecops_dashboard/      # Python backend
│   ├── api/                         # API endpoints
│   ├── www/                         # Web pages
│   └── public/                      # Static assets
└── README.md                        # This playbook
```

---

## State Management with Zustand

### Why Zustand?

We chose Zustand over Redux or React Context API for several reasons:

1. **Simplicity**: Minimal boilerplate compared to Redux
2. **Performance**: No unnecessary re-renders like Context API
3. **TypeScript Support**: Excellent TypeScript integration
4. **Bundle Size**: Lightweight (~2.5kb gzipped)
5. **DevTools**: Built-in Redux DevTools support
6. **Flexibility**: Works with or without React

### Store Structure and Organization

Each store follows a consistent pattern:

```javascript
// stores/exampleStore.js
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import apiService from '../services/api/index.js'

const useExampleStore = create(
  devtools(
    (set, get) => ({
      // State
      items: [],
      selectedItem: null,
      loading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      clearError: () => set({ error: null }),

      // Async actions
      fetchItems: async () => {
        set({ loading: true, error: null })
        try {
          const response = await apiService.example.getItems()
          set({ items: response.data, loading: false })
        } catch (error) {
          set({ error: error.message, loading: false })
        }
      },

      // Reset store
      reset: () => set({
        items: [],
        selectedItem: null,
        loading: false,
        error: null
      })
    }),
    { name: 'example-store' }
  )
)

export default useExampleStore
```

### How to Create New Stores

1. **Create the store file** in `src/stores/`:

```javascript
// stores/newFeatureStore.js
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useNewFeatureStore = create(
  devtools(
    (set, get) => ({
      // Define your state and actions here
    }),
    { name: 'new-feature-store' }
  )
)

export default useNewFeatureStore
```

2. **Export from stores/index.js**:

```javascript
// stores/index.js
import useNewFeatureStore from './newFeatureStore.js'

export {
  useAuthStore,
  useNavigationStore,
  useApplicationsStore,
  useIncidentsStore,
  useNewFeatureStore  // Add your new store
}
```

3. **Use in components**:

```javascript
// components/NewFeatureComponent.jsx
import { useNewFeatureStore } from '../stores/index.js'

const NewFeatureComponent = () => {
  const { items, loading, fetchItems } = useNewFeatureStore()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  if (loading) return <Spin />

  return (
    <div>
      {items.map(item => (
        <div key={item.id}>{item.name}</div>
      ))}
    </div>
  )
}
```

### Best Practices for State Management

1. **Keep stores focused**: Each store should handle a specific domain (auth, navigation, etc.)
2. **Use async actions**: Handle API calls within store actions, not in components
3. **Error handling**: Always include error states and handling in stores
4. **Loading states**: Provide loading indicators for better UX
5. **Reset functionality**: Include reset methods for cleanup
6. **Avoid deep nesting**: Keep state structure flat when possible

### Store Usage Examples

**Authentication Store:**
```javascript
const { isAuthenticated, user, login, logout, checkAuthentication } = useAuthStore()

// Check auth on app load
useEffect(() => {
  checkAuthentication()
}, [checkAuthentication])

// Handle logout
const handleLogout = () => {
  logout()
  navigateToRoute('dashboard')
}
```

**Applications Store with Pagination:**
```javascript
const {
  applications,
  loading,
  pagination,
  fetchApplications,
  setFilters,
  setPagination
} = useApplicationsStore()

// Fetch with filters
const handleSearch = (searchTerm) => {
  setFilters({ search: searchTerm })
  fetchApplications()
}

// Handle pagination
const handlePageChange = (page, pageSize) => {
  setPagination({ current: page, pageSize })
  fetchApplications()
}
```

---

## API Architecture

### Centralized API Service Layer

The API architecture provides a unified interface for all backend communication with built-in error handling, caching, and authentication.

### Service Structure

```
services/api/
├── index.js          # Main API service aggregator
├── config.js         # Base configuration and client setup
├── mockData.js       # Centralized mock data
├── applications.js   # Applications CRUD operations
├── incidents.js      # Incidents CRUD operations
└── projects.js       # Projects API (future)
```

### Base Configuration

```javascript
// services/api/config.js
import axios from 'axios'

export const API_CONFIG = {
  baseURL: '/api/method/frappe_devsecops_dashboard.api',
  timeout: 30000,
  features: {
    useMockData: true,  // Toggle between mock and real APIs
    enableCaching: true,
    enableRetry: true
  }
}

export const createApiClient = async () => {
  const client = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    withCredentials: true,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })

  // Add CSRF token if available
  if (window.csrf_token) {
    client.defaults.headers.common['X-Frappe-CSRF-Token'] = window.csrf_token
  }

  return client
}
```

### Mock vs Real API Switching

The application supports seamless switching between mock data and real APIs:

```javascript
// Switch to real API mode
import apiService from './services/api/index.js'
apiService.setMockMode(false)

// Switch to mock mode for development
apiService.setMockMode(true)
```

### How to Add New API Endpoints

1. **Create the service file**:

```javascript
// services/api/newFeature.js
import { API_CONFIG, createApiClient, withRetry, withCache } from './config.js'
import { mockNewFeatureData, simulateDelay } from './mockData.js'

class NewFeatureService {
  async getItems(filters = {}) {
    if (API_CONFIG.features.useMockData) {
      await simulateDelay()
      return {
        success: true,
        data: mockNewFeatureData,
        total: mockNewFeatureData.length
      }
    }

    const client = await createApiClient()
    return withRetry(async () => {
      const response = await client.get('/new-feature/list', { params: filters })
      return {
        success: true,
        data: response.data.data || [],
        total: response.data.total || 0
      }
    })
  }
}

export default new NewFeatureService()
```

2. **Add to main API service**:

```javascript
// services/api/index.js
import newFeatureService from './newFeature.js'

class ApiService {
  constructor() {
    this.applications = applicationsService
    this.incidents = incidentsService
    this.newFeature = newFeatureService  // Add new service
  }
}
```

3. **Add mock data**:

```javascript
// services/api/mockData.js
export const mockNewFeatureData = [
  {
    id: 'nf-001',
    name: 'Feature One',
    status: 'Active'
  }
]
```

### Error Handling and Retry Mechanisms

```javascript
// Automatic retry with exponential backoff
export const withRetry = async (fn, maxRetries = 3) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn()
    } catch (error) {
      if (i === maxRetries - 1) throw error
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, i) * 1000))
    }
  }
}

// Caching mechanism
const cache = new Map()
export const withCache = async (key, fn, ttl = 300000) => {
  if (cache.has(key)) {
    const { data, timestamp } = cache.get(key)
    if (Date.now() - timestamp < ttl) {
      return data
    }
  }

  const data = await fn()
  cache.set(key, { data, timestamp: Date.now() })
  return data
}
```

---

## Development Setup Guide

### Prerequisites

- **Node.js**: Version 18.x or higher
- **npm**: Version 9.x or higher (or yarn 3.x)
- **Python**: Version 3.8+ (for Frappe backend)
- **Frappe Bench**: Latest version

### Step-by-Step Installation

1. **Clone and setup Frappe bench** (if not already done):

```bash
# Install bench
pip install frappe-bench

# Create new site
bench new-site your-site.local
bench use your-site.local
```

2. **Install the DevSecOps Dashboard app**:

```bash
# Navigate to bench directory
cd /path/to/your/bench

# Get the app (if from repository)
bench get-app https://github.com/your-org/frappe_devsecops_dashboard

# Install on site
bench install-app frappe_devsecops_dashboard
```

3. **Setup frontend development environment**:

```bash
# Navigate to frontend directory
cd apps/frappe_devsecops_dashboard/frontend

# Install dependencies
npm install

# Verify installation
npm run dev
```

### Environment Configuration

Create a `.env` file in the frontend directory:

```bash
# frontend/.env
VITE_API_BASE_URL=/api/method/frappe_devsecops_dashboard.api
VITE_MOCK_MODE=true
VITE_DEBUG=true
```

### Development vs Production

**Development Mode:**
```bash
# Start Frappe development server
bench start

# In another terminal, start frontend dev server
cd apps/frappe_devsecops_dashboard/frontend
npm run dev
```

**Production Build:**
```bash
# Build frontend assets
cd apps/frappe_devsecops_dashboard/frontend
npm run build

# Copy built files to Frappe
cp ../frappe_devsecops_dashboard/public/frontend/index.html ../frappe_devsecops_dashboard/www/devsecops-ui.html

# Clear Frappe cache
bench clear-website-cache

# Restart if needed
bench restart
```

### Integration with Frappe Bench Commands

```bash
# Clear cache after frontend changes
bench clear-website-cache

# Restart after backend changes
bench restart

# Update app from repository
bench update --app frappe_devsecops_dashboard

# Migrate database changes
bench migrate

# Build and install frontend assets
cd apps/frappe_devsecops_dashboard/frontend && npm run build
```

---

## Component Development Guidelines

### Component Organization and Naming Conventions

**File Structure:**
```
components/
├── Dashboard.jsx              # Main views (PascalCase)
├── ProjectApps.jsx           # Feature components
├── ProjectAppDetail.jsx      # Detail views
├── common/                   # Reusable components
│   ├── LoadingSpinner.jsx
│   ├── ErrorBoundary.jsx
│   └── ConfirmDialog.jsx
└── forms/                    # Form components
    ├── ApplicationForm.jsx
    └── IncidentForm.jsx
```

**Naming Conventions:**
- **Components**: PascalCase (`ProjectAppDetail.jsx`)
- **Files**: Match component name
- **Props**: camelCase (`selectedAppId`, `onItemClick`)
- **Event handlers**: `handle` prefix (`handleSubmit`, `handleCancel`)

### How to Use Zustand Stores in Components

**Basic Usage:**
```javascript
import React, { useEffect } from 'react'
import { useApplicationsStore } from '../stores/index.js'
import { Spin, Alert } from 'antd'

const ApplicationsList = () => {
  // Destructure only what you need to avoid unnecessary re-renders
  const {
    applications,
    loading,
    error,
    fetchApplications,
    clearError
  } = useApplicationsStore()

  // Fetch data on mount
  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  // Clear errors when component unmounts
  useEffect(() => {
    return () => clearError()
  }, [clearError])

  if (loading) return <Spin size="large" />
  if (error) return <Alert message="Error" description={error} type="error" />

  return (
    <div>
      {applications.map(app => (
        <div key={app.id}>{app.name}</div>
      ))}
    </div>
  )
}
```

**Advanced Usage with Selectors:**
```javascript
// Use selectors to prevent unnecessary re-renders
const ApplicationsCount = () => {
  const count = useApplicationsStore(state => state.applications.length)
  return <span>Total Applications: {count}</span>
}

// Subscribe to specific state changes
const ApplicationsStatus = () => {
  const { loading, error } = useApplicationsStore(
    state => ({ loading: state.loading, error: state.error })
  )

  if (loading) return <Spin />
  if (error) return <Alert type="error" message={error} />
  return null
}
```

### Ant Design Component Usage Patterns

**Form Handling:**
```javascript
import { Form, Input, Button, message } from 'antd'
import { useApplicationsStore } from '../stores/index.js'

const ApplicationForm = ({ appId, onSuccess }) => {
  const [form] = Form.useForm()
  const { createApplication, updateApplication, loading } = useApplicationsStore()

  const handleSubmit = async (values) => {
    try {
      if (appId) {
        await updateApplication(appId, values)
        message.success('Application updated successfully')
      } else {
        await createApplication(values)
        message.success('Application created successfully')
      }
      onSuccess?.()
    } catch (error) {
      message.error('Operation failed')
    }
  }

  return (
    <Form form={form} onFinish={handleSubmit} layout="vertical">
      <Form.Item
        name="name"
        label="Application Name"
        rules={[{ required: true, message: 'Please enter application name' }]}
      >
        <Input placeholder="Enter application name" />
      </Form.Item>

      <Form.Item>
        <Button type="primary" htmlType="submit" loading={loading}>
          {appId ? 'Update' : 'Create'} Application
        </Button>
      </Form.Item>
    </Form>
  )
}
```

**Table with Actions:**
```javascript
import { Table, Button, Space, Popconfirm } from 'antd'
import { EditOutlined, DeleteOutlined } from '@ant-design/icons'

const ApplicationsTable = () => {
  const {
    applications,
    loading,
    deleteApplication,
    fetchApplications
  } = useApplicationsStore()

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name'
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status) => (
        <Tag color={status === 'Active' ? 'green' : 'red'}>
          {status}
        </Tag>
      )
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            icon={<EditOutlined />}
            onClick={() => handleEdit(record.id)}
          />
          <Popconfirm
            title="Are you sure?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ]

  const handleDelete = async (id) => {
    await deleteApplication(id)
    fetchApplications() // Refresh list
  }

  return (
    <Table
      columns={columns}
      dataSource={applications}
      loading={loading}
      rowKey="id"
      pagination={{ pageSize: 10 }}
    />
  )
}
```

### Responsive Design Considerations

**Mobile-First Approach:**
```javascript
import { useNavigationStore } from '../stores/index.js'
import { Drawer, Button } from 'antd'
import { MenuOutlined } from '@ant-design/icons'

const ResponsiveLayout = ({ children }) => {
  const {
    isMobile,
    mobileMenuVisible,
    toggleMobileMenu,
    setIsMobile
  } = useNavigationStore()

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [setIsMobile])

  return (
    <Layout>
      {isMobile ? (
        <>
          <Button
            icon={<MenuOutlined />}
            onClick={toggleMobileMenu}
            style={{ margin: 16 }}
          />
          <Drawer
            title="Navigation"
            placement="left"
            open={mobileMenuVisible}
            onClose={toggleMobileMenu}
          >
            {/* Mobile navigation content */}
          </Drawer>
        </>
      ) : (
        <Sider>{/* Desktop navigation */}</Sider>
      )}
      <Content>{children}</Content>
    </Layout>
  )
}
```

**Responsive Grid:**
```javascript
import { Row, Col } from 'antd'

const ResponsiveGrid = () => (
  <Row gutter={[16, 16]}>
    <Col xs={24} sm={12} md={8} lg={6}>
      <Card>Mobile: 100%, Tablet: 50%, Desktop: 33%, Large: 25%</Card>
    </Col>
    <Col xs={24} sm={12} md={8} lg={6}>
      <Card>Responsive content</Card>
    </Col>
  </Row>
)
```

### Navigation and Routing Patterns

**Hash-based SPA Navigation:**
```javascript
import { useNavigationStore } from '../stores/index.js'

const NavigationMenu = () => {
  const { currentRoute, navigateToRoute } = useNavigationStore()

  const menuItems = [
    { key: 'dashboard', label: 'Dashboard', icon: <DashboardOutlined /> },
    { key: 'project-apps', label: 'Applications', icon: <AppstoreOutlined /> },
    { key: 'incidents', label: 'Incidents', icon: <ExclamationCircleOutlined /> }
  ]

  return (
    <Menu
      mode="horizontal"
      selectedKeys={[currentRoute]}
      items={menuItems.map(item => ({
        ...item,
        onClick: () => navigateToRoute(item.key)
      }))}
    />
  )
}
```

**Breadcrumb Navigation:**
```javascript
const BreadcrumbNav = () => {
  const { getBreadcrumbs } = useNavigationStore()
  const breadcrumbs = getBreadcrumbs()

  return (
    <Breadcrumb style={{ margin: '16px 0' }}>
      {breadcrumbs.map((item, index) => (
        <Breadcrumb.Item key={index}>
          {item.onClick ? (
            <Button type="link" onClick={item.onClick}>
              {item.title}
            </Button>
          ) : (
            item.title
          )}
        </Breadcrumb.Item>
      ))}
    </Breadcrumb>
  )
}
```

---

## Build and Deployment

### Build Process Explanation

The application uses **Vite** as the build tool for optimal performance:

```javascript
// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: '/assets/frappe_devsecops_dashboard/frontend/',
  build: {
    outDir: '../frappe_devsecops_dashboard/public/frontend',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          antd: ['antd'],
          utils: ['axios', 'zustand']
        }
      }
    }
  },
  server: {
    port: 3000,
    proxy: {
      '/api': 'http://localhost:8000'
    }
  }
})
```

### Asset Management and Optimization

**Code Splitting:**
```javascript
// Lazy load components for better performance
import { lazy, Suspense } from 'react'
import { Spin } from 'antd'

const ProjectAppDetail = lazy(() => import('./components/ProjectAppDetail'))
const IncidentDetail = lazy(() => import('./components/IncidentDetail'))

const App = () => (
  <Suspense fallback={<Spin size="large" />}>
    <Router>
      <Route path="/app/:id" component={ProjectAppDetail} />
      <Route path="/incident/:id" component={IncidentDetail} />
    </Router>
  </Suspense>
)
```

**Bundle Analysis:**
```bash
# Analyze bundle size
npm run build -- --analyze

# Check bundle composition
npx vite-bundle-analyzer dist
```

### Integration with Frappe's Asset Pipeline

**Build Script:**
```bash
#!/bin/bash
# scripts/build-and-deploy.sh

echo "Building frontend assets..."
cd apps/frappe_devsecops_dashboard/frontend
npm run build

echo "Copying HTML template..."
cp ../frappe_devsecops_dashboard/public/frontend/index.html \
   ../frappe_devsecops_dashboard/www/devsecops-ui.html

echo "Clearing Frappe cache..."
cd ../../../
bench clear-website-cache

echo "Restarting services..."
bench restart

echo "Deployment complete!"
```

### Production Deployment Steps

1. **Prepare for production:**
```bash
# Set production environment
export NODE_ENV=production

# Install production dependencies only
npm ci --production
```

2. **Build and optimize:**
```bash
# Build with production optimizations
npm run build

# Verify build output
ls -la ../frappe_devsecops_dashboard/public/frontend/
```

3. **Deploy to Frappe:**
```bash
# Copy assets
cp ../frappe_devsecops_dashboard/public/frontend/index.html \
   ../frappe_devsecops_dashboard/www/devsecops-ui.html

# Update Frappe
bench update --app frappe_devsecops_dashboard
bench migrate
bench clear-website-cache
bench restart
```

4. **Verify deployment:**
```bash
# Check application status
curl -I http://your-site.com/devsecops-ui

# Monitor logs
bench logs
```

---

## Testing and Debugging

### How to Test Components with Zustand Stores

**Setup Test Environment:**
```javascript
// tests/setup.js
import { beforeEach } from 'vitest'
import { resetAllStores } from '../src/stores/index.js'

beforeEach(() => {
  // Reset all stores before each test
  resetAllStores()
})
```

**Component Testing:**
```javascript
// tests/components/ApplicationsList.test.jsx
import { render, screen, waitFor } from '@testing-library/react'
import { vi } from 'vitest'
import ApplicationsList from '../src/components/ApplicationsList'
import { useApplicationsStore } from '../src/stores/index.js'

// Mock the store
vi.mock('../src/stores/index.js', () => ({
  useApplicationsStore: vi.fn()
}))

describe('ApplicationsList', () => {
  it('displays loading state', () => {
    useApplicationsStore.mockReturnValue({
      applications: [],
      loading: true,
      error: null,
      fetchApplications: vi.fn()
    })

    render(<ApplicationsList />)
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('displays applications when loaded', async () => {
    const mockApplications = [
      { id: 'app-001', name: 'Test App' }
    ]

    useApplicationsStore.mockReturnValue({
      applications: mockApplications,
      loading: false,
      error: null,
      fetchApplications: vi.fn()
    })

    render(<ApplicationsList />)
    await waitFor(() => {
      expect(screen.getByText('Test App')).toBeInTheDocument()
    })
  })
})
```

### API Service Testing

**Mock API Responses:**
```javascript
// tests/services/applications.test.js
import { vi } from 'vitest'
import applicationsService from '../src/services/api/applications.js'

// Mock axios
vi.mock('axios', () => ({
  default: {
    create: () => ({
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn()
    })
  }
}))

describe('ApplicationsService', () => {
  it('fetches applications successfully', async () => {
    const mockData = [{ id: 'app-001', name: 'Test App' }]

    // Test with mock data
    const result = await applicationsService.getApplications()

    expect(result.success).toBe(true)
    expect(result.data).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: 'Test App' })
    ]))
  })
})
```

### Common Debugging Techniques

**Zustand DevTools:**
```javascript
// Enable Redux DevTools for Zustand
import { devtools } from 'zustand/middleware'

const useStore = create(
  devtools(
    (set, get) => ({
      // Your store implementation
    }),
    { name: 'store-name' } // Shows in DevTools
  )
)
```

**API Debugging:**
```javascript
// Add request/response interceptors
const client = axios.create()

client.interceptors.request.use(request => {
  console.log('API Request:', request)
  return request
})

client.interceptors.response.use(
  response => {
    console.log('API Response:', response)
    return response
  },
  error => {
    console.error('API Error:', error)
    return Promise.reject(error)
  }
)
```

**Performance Debugging:**
```javascript
// Monitor component re-renders
import { useEffect, useRef } from 'react'

const useRenderCount = (componentName) => {
  const renderCount = useRef(0)

  useEffect(() => {
    renderCount.current += 1
    console.log(`${componentName} rendered ${renderCount.current} times`)
  })
}

// Use in components
const MyComponent = () => {
  useRenderCount('MyComponent')
  // Component implementation
}
```

### Development Tools and Browser Extensions

**Recommended Extensions:**
- **React Developer Tools**: Component inspection and profiling
- **Redux DevTools**: Zustand store debugging
- **Vite DevTools**: Build analysis and HMR debugging
- **Ant Design DevTools**: Component theme debugging

**Useful Console Commands:**
```javascript
// Access stores from browser console
window.__ZUSTAND_STORES__ = {
  auth: useAuthStore.getState(),
  navigation: useNavigationStore.getState(),
  applications: useApplicationsStore.getState()
}

// Debug API calls
window.__API_DEBUG__ = true

// Performance monitoring
console.time('component-render')
// ... component code
console.timeEnd('component-render')
```

---

## Contributing Guidelines

### Code Style and Formatting Standards

**ESLint Configuration:**
```javascript
// .eslintrc.js
module.exports = {
  extends: [
    'eslint:recommended',
    '@typescript-eslint/recommended',
    'plugin:react/recommended',
    'plugin:react-hooks/recommended'
  ],
  rules: {
    'react/prop-types': 'off',
    'react/react-in-jsx-scope': 'off',
    '@typescript-eslint/no-unused-vars': 'error',
    'prefer-const': 'error',
    'no-var': 'error'
  }
}
```

**Prettier Configuration:**
```javascript
// .prettierrc
{
  "semi": false,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "bracketSpacing": true,
  "arrowParens": "avoid"
}
```

**Pre-commit Hooks:**
```json
// package.json
{
  "husky": {
    "hooks": {
      "pre-commit": "lint-staged"
    }
  },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": [
      "eslint --fix",
      "prettier --write",
      "git add"
    ]
  }
}
```

### Git Workflow and Branch Naming

**Branch Naming Convention:**
```bash
# Feature branches
feature/add-user-management
feature/improve-dashboard-performance

# Bug fixes
bugfix/fix-login-redirect
bugfix/resolve-memory-leak

# Hotfixes
hotfix/critical-security-patch

# Refactoring
refactor/modernize-api-layer
refactor/optimize-bundle-size
```

**Commit Message Format:**
```
type(scope): description

[optional body]

[optional footer]
```

**Examples:**
```bash
feat(auth): add multi-factor authentication support

- Implement TOTP-based 2FA
- Add backup codes functionality
- Update user settings UI

Closes #123

fix(api): resolve CSRF token refresh issue

The CSRF token was not being properly refreshed on session renewal,
causing API calls to fail after extended idle periods.

Fixes #456

refactor(stores): migrate from Redux to Zustand

- Replace Redux toolkit with Zustand stores
- Simplify state management patterns
- Reduce bundle size by 15kb

BREAKING CHANGE: Store API has changed, see migration guide
```

### Pull Request Process

1. **Create Feature Branch:**
```bash
git checkout -b feature/your-feature-name
git push -u origin feature/your-feature-name
```

2. **Development Checklist:**
- [ ] Code follows style guidelines
- [ ] Tests are written and passing
- [ ] Documentation is updated
- [ ] No console errors or warnings
- [ ] Performance impact assessed
- [ ] Accessibility considerations addressed

3. **Pull Request Template:**
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests pass
- [ ] Integration tests pass
- [ ] Manual testing completed

## Screenshots (if applicable)
[Add screenshots here]

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No breaking changes (or documented)
```

### How to Add New Features Following Established Patterns

**1. Planning Phase:**
- Review existing similar features
- Design API endpoints if needed
- Plan state management requirements
- Consider mobile responsiveness

**2. Implementation Steps:**

```bash
# 1. Create feature branch
git checkout -b feature/new-feature

# 2. Add API service (if needed)
touch src/services/api/newFeature.js

# 3. Create Zustand store
touch src/stores/newFeatureStore.js

# 4. Create components
mkdir src/components/newFeature
touch src/components/newFeature/NewFeatureList.jsx
touch src/components/newFeature/NewFeatureDetail.jsx

# 5. Add tests
touch tests/components/newFeature/NewFeatureList.test.jsx
touch tests/services/newFeature.test.js

# 6. Update documentation
# Edit README.md to include new feature
```

**3. Code Review Checklist:**
- Follows established patterns
- Proper error handling
- Loading states implemented
- Mobile responsive
- Accessible (ARIA labels, keyboard navigation)
- Performance optimized
- Tests included

---

## License

MIT License - see LICENSE file for details.

## Support

For questions and support:
- Create an issue in the repository
- Check existing documentation
- Review code examples in this playbook

---

*This playbook is a living document. Please keep it updated as the application evolves.*