/**
 * API Configuration and Base Client
 * Centralized configuration for all API calls to Frappe instance
 */

// Environment configuration
const API_CONFIG = {
  // Base URL for Frappe instance
  baseURL: window.location.origin,

  // API endpoints
  endpoints: {
    // Authentication
    auth: {
      login: '/api/method/login',
      logout: '/api/method/logout',
      session: '/api/method/frappe.auth.get_logged_user'
    },

    // Projects
    projects: {
      list: '/api/resource/Project',
      detail: '/api/resource/Project',
      tasks: '/api/resource/Task',
      create: '/api/method/frappe_devsecops_dashboard.api.dashboard.create_project'
    },

    // Applications
    applications: {
      list: '/api/method/frappe_devsecops_dashboard.api.applications.get_applications',
      detail: '/api/method/frappe_devsecops_dashboard.api.applications.get_application_detail',
      create: '/api/method/frappe_devsecops_dashboard.api.applications.create_application',
      update: '/api/method/frappe_devsecops_dashboard.api.applications.update_application',
      delete: '/api/method/frappe_devsecops_dashboard.api.applications.delete_application'
    },

    // Incidents
    incidents: {
      list: '/api/method/frappe_devsecops_dashboard.api.incidents.get_incidents',
      detail: '/api/method/frappe_devsecops_dashboard.api.incidents.get_incident_detail',
      create: '/api/method/frappe_devsecops_dashboard.api.incidents.create_incident',
      update: '/api/method/frappe_devsecops_dashboard.api.incidents.update_incident',
      delete: '/api/method/frappe_devsecops_dashboard.api.incidents.delete_incident'
    },

    // Change Requests
    changeRequests: {
      list: '/api/method/frappe_devsecops_dashboard.api.change_requests.get_change_requests',
      detail: '/api/method/frappe_devsecops_dashboard.api.change_requests.get_change_request_detail',
      create: '/api/method/frappe_devsecops_dashboard.api.change_requests.create_change_request',
      update: '/api/method/frappe_devsecops_dashboard.api.change_requests.update_change_request'
    },

    // Swagger Collections
    swaggerCollections: {
      list: '/api/method/frappe_devsecops_dashboard.api.swagger_collections.get_swagger_collections',
      detail: '/api/method/frappe_devsecops_dashboard.api.swagger_collections.get_swagger_collection_detail',
      create: '/api/method/frappe_devsecops_dashboard.api.swagger_collections.create_swagger_collection',
      update: '/api/method/frappe_devsecops_dashboard.api.swagger_collections.update_swagger_collection',
      delete: '/api/method/frappe_devsecops_dashboard.api.swagger_collections.delete_swagger_collection',
      import: '/api/method/frappe_devsecops_dashboard.api.swagger_collections.import_swagger_collection',
      export: '/api/method/frappe_devsecops_dashboard.api.swagger_collections.export_swagger_collection'
    },

    	// Zenhub (sprints, issues)
    	zenhub: {
    	  sprintData: '/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data',
    	  stakeholderReport: '/api/method/frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report',
    	  workspaceIssues: '/api/method/frappe_devsecops_dashboard.api.zenhub.get_workspace_issues'
    	},


    // Dashboard
    dashboard: {
      metrics: '/api/method/frappe_devsecops_dashboard.api.dashboard.get_dashboard_metrics',
      projects: '/api/method/frappe_devsecops_dashboard.api.dashboard.get_projects_with_tasks'
    }
  },

  // Request configuration
  timeout: 30000,

  // Feature flags
  features: {
    // Granular mock data control per service. Backward compatible with boolean.
    // If a boolean is provided, it acts as a global toggle.
    // If an object is provided, it controls individual services.
    useMockData: {
      applications: true,
      incidents: true,
      projects: false,        // ✓ Use real ERPNext data for projects
      changeRequests: true,
      swaggerCollections: true,
      dashboard: false,       // ✓ Use real ERPNext data for dashboard
      zenhub: false           // Use real Zenhub API by default
    },
    enableCaching: true,
    enableRetry: true
  }
}

/**
 * Create axios instance with Frappe-specific configuration
 */
const createApiClient = async () => {
  const axios = (await import('axios')).default

  const client = axios.create({
    baseURL: API_CONFIG.baseURL,
    timeout: API_CONFIG.timeout,
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
  })

  // Request interceptor for CSRF token
  client.interceptors.request.use(
    (config) => {
      // Add CSRF token if available
      if (window.csrf_token) {
        config.headers['X-Frappe-CSRF-Token'] = window.csrf_token
      }

      // Add timestamp to prevent caching for GET requests
      if (config.method === 'get' && !API_CONFIG.features.enableCaching) {
        config.params = {
          ...config.params,
          _t: Date.now()
        }
      }

      return config
    },
    (error) => {
      return Promise.reject(error)
    }
  )

  // Response interceptor for error handling
  client.interceptors.response.use(
    (response) => {
      // Frappe returns data in response.data.message for method calls
      if (response.data && response.data.message !== undefined) {
        return {
          ...response,
          data: response.data.message
        }
      }
      return response
    },
    (error) => {
      // Handle common Frappe errors
      if (error.response) {
        const { status, data } = error.response

        switch (status) {
          case 401:
            // Unauthorized - don't auto-redirect, let the app handle it
            break
          case 403:
            // Forbidden - show permission error
            break
          case 404:
            // Not found
            break
          case 500:
            // Server error
            break
          default:
            // Handle error
        }

        // Return structured error
        return Promise.reject({
          status,
          message: data.message || error.message,
          data: data
        })
      }

      // Network or other errors
      return Promise.reject({
        status: 0,
        message: error.message || 'Network error',
        data: null
      })
    }
  )

  return client
}

/**
 * Retry mechanism for failed requests
 */
const withRetry = async (apiCall, maxRetries = 3) => {
  if (!API_CONFIG.features.enableRetry) {
    return apiCall()
  }

  let lastError

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await apiCall()
    } catch (error) {
      lastError = error

      // Don't retry on client errors (4xx)
      if (error.status >= 400 && error.status < 500) {
        throw error
      }

      // Wait before retry (exponential backoff)
      if (attempt < maxRetries) {
        const delay = Math.pow(2, attempt) * 1000
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  throw lastError
}

/**
 * Cache implementation for GET requests
 */
const cache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

const withCache = async (key, apiCall) => {
  if (!API_CONFIG.features.enableCaching) {
    return apiCall()
  }

  const cached = cache.get(key)
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data
  }

  const data = await apiCall()
  cache.set(key, {
    data,
    timestamp: Date.now()
  })

  return data
}

/**
 * Clear cache for specific key or all cache
 */
const clearCache = (key = null) => {
  if (key) {
    cache.delete(key)
  } else {
    cache.clear()
  }
}

// Helper to determine if mock is enabled for a specific service
// Accepts serviceName like 'applications', 'incidents', 'projects',
// 'changeRequests', 'swaggerCollections', 'dashboard'.
const isMockEnabled = (serviceName) => {
  const setting = API_CONFIG.features?.useMockData
  if (typeof setting === 'boolean') return setting
  if (setting && typeof setting === 'object') {
    // default to false if not explicitly set
    return !!setting[serviceName]
  }
  return false
}

export {
  API_CONFIG,
  createApiClient,
  withRetry,
  withCache,
  clearCache,
  isMockEnabled
}
