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
      tasks: '/api/resource/Task'
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
    useMockData: true, // Set to false when real APIs are ready
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
            // Unauthorized - redirect to login
            window.location.href = '/login'
            break
          case 403:
            // Forbidden - show permission error
            console.error('Permission denied:', data.message || 'Access forbidden')
            break
          case 404:
            // Not found
            console.error('Resource not found:', error.config.url)
            break
          case 500:
            // Server error
            console.error('Server error:', data.message || 'Internal server error')
            break
          default:
            console.error('API error:', data.message || error.message)
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

export {
  API_CONFIG,
  createApiClient,
  withRetry,
  withCache,
  clearCache
}
