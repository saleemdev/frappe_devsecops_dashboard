# Frontend Patterns - DevSecOps Dashboard

## State Management Philosophy

### When to Use Zustand vs React Hooks

**IMPORTANT: Use Zustand for application-level state at all times.** Only use React hooks (useState, useEffect) for local component state.

#### Use Zustand For:
- **Application State:** Data that needs to be shared across multiple components
- **Persistent State:** Data that should survive component unmounts
- **Server Data:** Data fetched from APIs that needs to be cached
- **User Context:** Authentication state, permissions, user preferences
- **Navigation State:** Current route, selected items, form visibility
- **Feature State:** Applications, incidents, change requests, etc.

#### Use React Hooks (useState, useEffect) For:
- **Local UI State:** Component-specific state like:
  - Form input values (before submission)
  - Modal open/closed states (if not shared)
  - Dropdown selections
  - Temporary validation messages
  - Loading indicators for local operations
  - Hover states, focus states
- **Component Lifecycle:** Side effects tied to component mount/unmount
- **Local Calculations:** Derived values from props or local state

### Example: Correct State Management

```javascript
// ✅ GOOD: Application state in Zustand, local UI state in useState
import { useApplicationsStore } from '../stores/index.js'
import { useState, useEffect } from 'react'
import { Form, Input, Button, message } from 'antd'

const ApplicationForm = ({ appId, onSuccess }) => {
  const [form] = Form.useForm()

  // ✅ Zustand for application state
  const {
    applications,
    loading,
    createApplication,
    updateApplication,
    fetchApplications
  } = useApplicationsStore()

  // ✅ useState for local UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [validationErrors, setValidationErrors] = useState({})

  // ✅ useEffect for component lifecycle
  useEffect(() => {
    if (appId) {
      // Load existing application data
      const app = applications.find(a => a.id === appId)
      if (app) {
        form.setFieldsValue(app)
      }
    }
  }, [appId, applications, form])

  const handleSubmit = async (values) => {
    setIsSubmitting(true)
    setValidationErrors({})

    try {
      if (appId) {
        await updateApplication(appId, values)
        message.success('Application updated')
      } else {
        await createApplication(values)
        message.success('Application created')
      }

      form.resetFields()
      onSuccess?.()
    } catch (error) {
      setValidationErrors(error.errors || {})
      message.error('Failed to save application')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Form form={form} onFinish={handleSubmit}>
      {/* Form fields */}
      <Button type="primary" htmlType="submit" loading={isSubmitting || loading}>
        Submit
      </Button>
    </Form>
  )
}
```

```javascript
// ❌ BAD: Using useState for data that should be in Zustand
const ApplicationsList = () => {
  // ❌ Don't do this - applications should be in Zustand store
  const [applications, setApplications] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      const data = await api.applications.getAll()
      setApplications(data)
      setLoading(false)
    }
    fetchData()
  }, [])

  // This state is lost when component unmounts!
  // Other components can't access this data!
}
```

## Zustand Store Patterns

### Standard Store Structure

Every Zustand store follows this consistent pattern:

```javascript
// stores/exampleStore.js
import { create } from 'zustand'
import { devtools, persist } from 'zustand/middleware'
import apiService from '../services/api/index.js'

const useExampleStore = create(
  devtools(
    persist(
      (set, get) => ({
        // ===== STATE =====
        items: [],
        selectedItem: null,
        loading: false,
        error: null,
        filters: {},
        pagination: {
          current: 1,
          pageSize: 10,
          total: 0
        },

        // ===== BASIC SETTERS =====
        setLoading: (loading) => set({ loading }),
        setError: (error) => set({ error }),
        clearError: () => set({ error: null }),

        setFilters: (filters) => set((state) => ({
          filters: { ...state.filters, ...filters },
          pagination: { ...state.pagination, current: 1 } // Reset to page 1
        })),

        setPagination: (pagination) => set((state) => ({
          pagination: { ...state.pagination, ...pagination }
        })),

        setSelectedItem: (item) => set({ selectedItem: item }),

        // ===== ASYNC ACTIONS =====
        fetchItems: async (filters = {}) => {
          set({ loading: true, error: null })
          try {
            const { pagination } = get()
            const response = await apiService.example.getItems({
              ...filters,
              page: pagination.current,
              page_size: pagination.pageSize
            })

            set({
              items: response.data || [],
              pagination: {
                ...pagination,
                total: response.total || 0
              },
              loading: false
            })
          } catch (error) {
            set({
              error: error.message,
              loading: false,
              items: []
            })
          }
        },

        createItem: async (data) => {
          set({ loading: true, error: null })
          try {
            const response = await apiService.example.create(data)

            // Refresh list after creation
            await get().fetchItems()

            set({ loading: false })
            return response.data
          } catch (error) {
            set({ error: error.message, loading: false })
            throw error
          }
        },

        updateItem: async (id, data) => {
          set({ loading: true, error: null })
          try {
            const response = await apiService.example.update(id, data)

            // Update item in list
            set((state) => ({
              items: state.items.map(item =>
                item.id === id ? { ...item, ...response.data } : item
              ),
              loading: false
            }))

            return response.data
          } catch (error) {
            set({ error: error.message, loading: false })
            throw error
          }
        },

        deleteItem: async (id) => {
          set({ loading: true, error: null })
          try {
            await apiService.example.delete(id)

            // Remove from list
            set((state) => ({
              items: state.items.filter(item => item.id !== id),
              loading: false
            }))
          } catch (error) {
            set({ error: error.message, loading: false })
            throw error
          }
        },

        // ===== COMPUTED/DERIVED STATE =====
        getItemById: (id) => {
          const { items } = get()
          return items.find(item => item.id === id)
        },

        getFilteredItems: () => {
          const { items, filters } = get()
          // Apply client-side filtering if needed
          return items.filter(item => {
            // Filter logic
            return true
          })
        },

        // ===== RESET =====
        reset: () => set({
          items: [],
          selectedItem: null,
          loading: false,
          error: null,
          filters: {},
          pagination: { current: 1, pageSize: 10, total: 0 }
        })
      }),
      {
        name: 'example-store', // LocalStorage key
        partialize: (state) => ({
          // Only persist certain fields
          filters: state.filters,
          pagination: state.pagination
        })
      }
    ),
    { name: 'example-store' } // Redux DevTools name
  )
)

export default useExampleStore
```

### Using Stores in Components

#### Basic Usage
```javascript
import { useExampleStore } from '../stores/index.js'

const ExampleComponent = () => {
  // ✅ Destructure only what you need (prevents unnecessary re-renders)
  const { items, loading, error, fetchItems } = useExampleStore()

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  if (loading) return <Spin />
  if (error) return <Alert type="error" message={error} />

  return <div>{items.map(item => <div key={item.id}>{item.name}</div>)}</div>
}
```

#### Selective Subscription (Performance Optimization)
```javascript
// ✅ BEST: Subscribe to specific state slices to avoid re-renders
const ItemCount = () => {
  const count = useExampleStore(state => state.items.length)
  return <span>Total: {count}</span>
}

// ✅ Subscribe to multiple specific fields
const ItemsStatus = () => {
  const { loading, error } = useExampleStore(
    state => ({ loading: state.loading, error: state.error })
  )

  if (loading) return <Spin />
  if (error) return <Alert type="error" message={error} />
  return null
}
```

#### Calling Actions
```javascript
const CreateItemButton = () => {
  const createItem = useExampleStore(state => state.createItem)

  const handleCreate = async () => {
    try {
      await createItem({ name: 'New Item' })
      message.success('Created successfully')
    } catch (error) {
      message.error('Failed to create')
    }
  }

  return <Button onClick={handleCreate}>Create</Button>
}
```

## API Service Layer Patterns

### Service Structure

Located in [frontend/src/services/api/](frontend/src/services/api/)

```javascript
// services/api/config.js
import axios from 'axios'

export const API_CONFIG = {
  baseURL: window.location.origin,
  timeout: 30000,

  endpoints: {
    applications: {
      list: '/api/method/frappe_devsecops_dashboard.api.applications.get_applications',
      create: '/api/method/frappe_devsecops_dashboard.api.applications.create_application',
      update: '/api/method/frappe_devsecops_dashboard.api.applications.update_application',
      delete: '/api/method/frappe_devsecops_dashboard.api.applications.delete_application'
    }
  },

  features: {
    useMockData: {
      applications: false, // Set to true for development with mock data
      incidents: false,
      projects: false
    },
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

  // Add CSRF token from Frappe
  if (window.csrf_token) {
    client.defaults.headers.common['X-Frappe-CSRF-Token'] = window.csrf_token
  }

  // Request interceptor
  client.interceptors.request.use(
    (config) => {
      console.log('API Request:', config.method, config.url)
      return config
    },
    (error) => Promise.reject(error)
  )

  // Response interceptor
  client.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 403) {
        console.error('Permission denied')
      }
      return Promise.reject(error)
    }
  )

  return client
}

// Retry mechanism
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

### Service Implementation

```javascript
// services/api/applications.js
import { API_CONFIG, createApiClient, withRetry, withCache } from './config.js'
import { mockApplications, simulateDelay } from './mockData.js'

class ApplicationsService {
  async getApplications(filters = {}) {
    // Mock mode for development
    if (API_CONFIG.features.useMockData.applications) {
      await simulateDelay()
      return {
        success: true,
        data: mockApplications,
        total: mockApplications.length
      }
    }

    // Real API call with retry and cache
    return withRetry(async () => {
      const cacheKey = `applications-${JSON.stringify(filters)}`
      return withCache(cacheKey, async () => {
        const client = await createApiClient()
        const response = await client.get(API_CONFIG.endpoints.applications.list, {
          params: filters
        })

        return {
          success: true,
          data: response.data.message?.data || [],
          total: response.data.message?.total || 0
        }
      })
    })
  }

  async create(data) {
    const client = await createApiClient()
    const response = await client.post(API_CONFIG.endpoints.applications.create, data)

    return {
      success: true,
      data: response.data.message
    }
  }

  async update(id, data) {
    const client = await createApiClient()
    const response = await client.put(
      API_CONFIG.endpoints.applications.update,
      { id, ...data }
    )

    return {
      success: true,
      data: response.data.message
    }
  }

  async delete(id) {
    const client = await createApiClient()
    await client.delete(API_CONFIG.endpoints.applications.delete, {
      params: { id }
    })

    return { success: true }
  }
}

export default new ApplicationsService()
```

## Component Patterns

### Functional Components with Hooks

```javascript
import React, { useEffect, useState } from 'react'
import { useApplicationsStore } from '../stores/index.js'
import { useResponsive } from '../hooks/useResponsive.js'
import { Table, Button, Card, Space, message } from 'antd'
import { PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons'

const ApplicationsList = () => {
  // ===== HOOKS =====
  // Ant Design theme
  const { token } = theme.useToken()

  // Responsive design
  const { isMobile, isTablet, isDesktop } = useResponsive()

  // Zustand store
  const {
    applications,
    loading,
    error,
    pagination,
    fetchApplications,
    deleteApplication,
    setPagination
  } = useApplicationsStore()

  // Local UI state
  const [selectedRowKeys, setSelectedRowKeys] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)

  // ===== EFFECTS =====
  useEffect(() => {
    fetchApplications()
  }, [fetchApplications])

  // ===== HANDLERS =====
  const handleTableChange = (newPagination, filters, sorter) => {
    setPagination({
      current: newPagination.current,
      pageSize: newPagination.pageSize
    })
    fetchApplications()
  }

  const handleDelete = async (id) => {
    try {
      await deleteApplication(id)
      message.success('Application deleted')
    } catch (error) {
      message.error('Failed to delete application')
    }
  }

  // ===== TABLE COLUMNS =====
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
      sorter: true
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
            title="Delete this application?"
            onConfirm={() => handleDelete(record.id)}
          >
            <Button icon={<DeleteOutlined />} danger />
          </Popconfirm>
        </Space>
      )
    }
  ]

  // ===== RENDER =====
  return (
    <Card
      title="Applications"
      extra={
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => setShowCreateModal(true)}
        >
          {!isMobile && 'Create Application'}
        </Button>
      }
    >
      <Table
        columns={columns}
        dataSource={applications}
        loading={loading}
        rowKey="id"
        pagination={pagination}
        onChange={handleTableChange}
        scroll={{ x: isMobile ? 800 : undefined }}
      />
    </Card>
  )
}

export default ApplicationsList
```

### Form Handling Pattern

```javascript
import { Form, Input, Button, Select, message } from 'antd'
import { useApplicationsStore } from '../stores/index.js'

const ApplicationForm = ({ appId, onSuccess }) => {
  const [form] = Form.useForm()

  // Zustand store
  const { createApplication, updateApplication, loading } = useApplicationsStore()

  // Local state for form-specific UI
  const [customFieldsVisible, setCustomFieldsVisible] = useState(false)

  const handleSubmit = async (values) => {
    try {
      if (appId) {
        await updateApplication(appId, values)
        message.success('Application updated')
      } else {
        await createApplication(values)
        message.success('Application created')
      }

      form.resetFields()
      onSuccess?.()
    } catch (error) {
      message.error(error.message || 'Operation failed')
    }
  }

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={handleSubmit}
      initialValues={{ status: 'Active' }}
    >
      <Form.Item
        name="name"
        label="Application Name"
        rules={[
          { required: true, message: 'Please enter application name' },
          { min: 3, message: 'Name must be at least 3 characters' }
        ]}
      >
        <Input placeholder="Enter application name" />
      </Form.Item>

      <Form.Item
        name="status"
        label="Status"
        rules={[{ required: true, message: 'Please select status' }]}
      >
        <Select>
          <Select.Option value="Active">Active</Select.Option>
          <Select.Option value="Inactive">Inactive</Select.Option>
        </Select>
      </Form.Item>

      <Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={loading}>
            {appId ? 'Update' : 'Create'}
          </Button>
          <Button onClick={() => form.resetFields()}>
            Reset
          </Button>
        </Space>
      </Form.Item>
    </Form>
  )
}
```

## Responsive Design Pattern

### Custom Hook: useResponsive

Located in [frontend/src/hooks/useResponsive.js](frontend/src/hooks/useResponsive.js)

```javascript
import { useState, useEffect } from 'react'

export const useResponsive = () => {
  const [screenSize, setScreenSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight
  })

  const [currentBreakpoint, setCurrentBreakpoint] = useState('lg')

  const breakpoints = {
    xs: 480,
    sm: 576,
    md: 768,
    lg: 992,
    xl: 1200,
    xxl: 1600
  }

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth
      setScreenSize({ width, height: window.innerHeight })

      // Determine current breakpoint
      if (width < breakpoints.sm) setCurrentBreakpoint('xs')
      else if (width < breakpoints.md) setCurrentBreakpoint('sm')
      else if (width < breakpoints.lg) setCurrentBreakpoint('md')
      else if (width < breakpoints.xl) setCurrentBreakpoint('lg')
      else if (width < breakpoints.xxl) setCurrentBreakpoint('xl')
      else setCurrentBreakpoint('xxl')
    }

    handleResize() // Initial call
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return {
    screenSize,
    currentBreakpoint,
    isMobile: currentBreakpoint === 'xs',
    isTablet: currentBreakpoint === 'sm' || currentBreakpoint === 'md',
    isDesktop: ['lg', 'xl', 'xxl'].includes(currentBreakpoint),
    isSmallScreen: ['xs', 'sm'].includes(currentBreakpoint),
    breakpoints
  }
}
```

### Usage in Components

```javascript
const ResponsiveComponent = () => {
  const { isMobile, isTablet, isDesktop } = useResponsive()

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} sm={12} md={8} lg={6}>
        <Card>
          {isMobile && <MobileView />}
          {isTablet && <TabletView />}
          {isDesktop && <DesktopView />}
        </Card>
      </Col>
    </Row>
  )
}
```

## Navigation Pattern

### Hash-Based Routing

```javascript
// stores/navigationStore.js
const useNavigationStore = create(
  devtools(
    (set, get) => ({
      currentRoute: 'dashboard',
      selectedProjectId: null,
      selectedAppId: null,

      navigateToRoute: (route, params = {}) => {
        set({
          currentRoute: route,
          ...params
        })

        // Update URL hash
        const queryString = new URLSearchParams(params).toString()
        window.location.hash = queryString ? `#${route}?${queryString}` : `#${route}`
      },

      getBreadcrumbs: () => {
        const { currentRoute, selectedProjectId, selectedAppId } = get()

        const breadcrumbs = [{ title: 'Home', onClick: () => get().navigateToRoute('dashboard') }]

        if (currentRoute === 'project-apps' && selectedProjectId) {
          breadcrumbs.push({ title: 'Projects' })
          breadcrumbs.push({ title: selectedProjectId })
        }

        return breadcrumbs
      }
    }),
    { name: 'navigation-store' }
  )
)
```

## Key Files Reference

- **Stores:** [frontend/src/stores/](frontend/src/stores/)
  - [authStore.js](frontend/src/stores/authStore.js) - Authentication and permissions
  - [navigationStore.js](frontend/src/stores/navigationStore.js) - Routing and UI state
  - [applicationsStore.js](frontend/src/stores/applicationsStore.js) - Applications state
  - [incidentsStore.js](frontend/src/stores/incidentsStore.js) - Incidents state

- **API Services:** [frontend/src/services/api/](frontend/src/services/api/)
  - [config.js](frontend/src/services/api/config.js) - API configuration
  - [index.js](frontend/src/services/api/index.js) - Service aggregator
  - [mockData.js](frontend/src/services/api/mockData.js) - Mock data for development

- **Components:** [frontend/src/components/](frontend/src/components/)
  - [Dashboard.jsx](frontend/src/components/Dashboard.jsx) - Main dashboard

- **Hooks:** [frontend/src/hooks/](frontend/src/hooks/)
  - [useResponsive.js](frontend/src/hooks/useResponsive.js) - Responsive design hook
