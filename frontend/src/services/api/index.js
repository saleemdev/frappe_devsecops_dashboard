/**
 * API Services Index
 * Central export point for all API services
 */

import { API_CONFIG, clearCache, isMockEnabled } from './config.js'
import applicationsService from './applications.js'
import incidentsService from './incidents.js'
import swaggerCollectionsService from './swaggerCollections.js'
import zenhubService from './zenhub.js'
import permissionsService from './permissions.js'

// Projects service
import projectsService from './projects.js'

// Dashboard service (simplified for now)
class DashboardService {
  async getDashboardMetrics() {
    if (isMockEnabled('dashboard')) {
      const { mockProjects, mockTaskTypes, simulateDelay } = await import('./mockData.js')
      await simulateDelay(500)

      // Return mock dashboard data with proper structure
      const result = {
        success: true,
        projects: mockProjects,
        metrics: {
          total_projects: mockProjects.length,
          active_projects: mockProjects.filter(p => p.status === 'Active').length,
          total_tasks: mockProjects.reduce((sum, p) => sum + (p.tasks?.total || 0), 0),
          completed_tasks: mockProjects.reduce((sum, p) => sum + (p.tasks?.completed || 0), 0),
          average_completion: Math.round(mockProjects.reduce((sum, p) => sum + (p.progress || 0), 0) / mockProjects.length),
          team_capacity: 85,
          completion_rate: 75
        },
        lifecycle_phases: mockTaskTypes.map(t => ({ name: t.name, custom_priority: t.custom_priority })),
        timestamp: new Date().toISOString()
      }
      return result
    }

    const { getDashboardData } = await import('../../utils/erpnextApiUtils.js')
    return getDashboardData()
  }

  /**
   * Get Change Requests metrics
   */
  async getChangeRequestsMetrics(filters = {}) {
    if (isMockEnabled('changeRequests')) {
      const { mockChangeRequests, simulateDelay } = await import('./mockData.js')
      await simulateDelay(500)

      // Calculate metrics with null safety
      const metrics = {
        total: mockChangeRequests?.length || 0,
        pending: mockChangeRequests?.filter(cr => cr.approval_status === 'Pending')?.length || 0,
        approved: mockChangeRequests?.filter(cr => cr.approval_status === 'Approved')?.length || 0,
        rejected: mockChangeRequests?.filter(cr => cr.approval_status === 'Rejected')?.length || 0,
        in_progress: mockChangeRequests?.filter(cr => cr.approval_status === 'In Progress')?.length || 0,
        completed: mockChangeRequests?.filter(cr => cr.approval_status === 'Completed')?.length || 0,
        avg_approval_time: 24
      }

      return {
        success: true,
        metrics,
        data: mockChangeRequests || [],
        timestamp: new Date().toISOString()
      }
    }

    // Real API call
    try {
      const { createApiClient } = await import('./config.js')
      const client = await createApiClient()
      const response = await client.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_dashboard_metrics', {
        params: { metric_type: 'change_requests', ...filters }
      })

      return response.data?.message || {
        success: false,
        metrics: {},
        data: [],
        error: 'Failed to fetch metrics'
      }
    } catch (error) {
      return {
        success: false,
        metrics: {},
        data: [],
        error: error.message || 'An error occurred'
      }
    }
  }

  /**
   * Get Incidents metrics
   */
  async getIncidentsMetrics(filters = {}) {
    if (isMockEnabled('incidents')) {
      const { mockIncidents, simulateDelay } = await import('./mockData.js')
      await simulateDelay(500)

      // Calculate metrics with null safety
      const metrics = {
        total: mockIncidents?.length || 0,
        open: mockIncidents?.filter(inc => inc.status === 'Open')?.length || 0,
        in_progress: mockIncidents?.filter(inc => inc.status === 'In Progress')?.length || 0,
        resolved: mockIncidents?.filter(inc => inc.status === 'Resolved')?.length || 0,
        critical: mockIncidents?.filter(inc => inc.severity === 'Critical')?.length || 0,
        high: mockIncidents?.filter(inc => inc.severity === 'High')?.length || 0,
        medium: mockIncidents?.filter(inc => inc.severity === 'Medium')?.length || 0,
        low: mockIncidents?.filter(inc => inc.severity === 'Low')?.length || 0,
        avg_resolution_time: 48
      }

      return {
        success: true,
        metrics,
        data: mockIncidents || [],
        timestamp: new Date().toISOString()
      }
    }

    // Real API call
    try {
      const { createApiClient } = await import('./config.js')
      const client = await createApiClient()
      const response = await client.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_dashboard_metrics', {
        params: { metric_type: 'incidents', ...filters }
      })

      return response.data?.message || {
        success: false,
        metrics: {},
        data: [],
        error: 'Failed to fetch metrics'
      }
    } catch (error) {
      return {
        success: false,
        metrics: {},
        data: [],
        error: error.message || 'An error occurred'
      }
    }
  }
}

// Change Requests service (placeholder)
class ChangeRequestsService {
  async getChangeRequests(filters = {}) {
    // Mock implementation for now
    const { mockChangeRequests, simulateDelay } = await import('./mockData.js')
    await simulateDelay()
    
    return {
      success: true,
      data: mockChangeRequests,
      total: mockChangeRequests.length
    }
  }
  
  async getChangeRequest(id) {
    const { mockChangeRequests, simulateDelay } = await import('./mockData.js')
    await simulateDelay()
    
    const changeRequest = mockChangeRequests.find(cr => cr.id === id)
    
    if (!changeRequest) {
      throw {
        status: 404,
        message: 'Change request not found',
        data: null
      }
    }
    
    return {
      success: true,
      data: changeRequest
    }
  }
  
  async createChangeRequest(data) {
    const { simulateDelay } = await import('./mockData.js')
    await simulateDelay(1000)
    
    const newChangeRequest = {
      id: `CR-${String(Date.now()).slice(-3).padStart(3, '0')}`,
      ...data,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending'
    }
    
    return {
      success: true,
      data: newChangeRequest,
      message: 'Change request created successfully'
    }
  }
  
  async updateChangeRequest(id, data) {
    const { simulateDelay } = await import('./mockData.js')
    await simulateDelay(800)
    
    return {
      success: true,
      data: { id, ...data },
      message: 'Change request updated successfully'
    }
  }
}

// Authentication service
class AuthService {
  async getCurrentUser() {
    // Check if user has valid session cookies first
    const cookies = document.cookie.split(';').reduce((acc, cookie) => {
      const [key, value] = cookie.trim().split('=')
      acc[key] = value
      return acc
    }, {})

    // If no session cookies (sid or user_id), user is not logged in
    if (!cookies.sid && !cookies.user_id) {
      return {
        success: false,
        data: null,
        message: 'No active session found'
      }
    }

    // If frappe session data is available in window, use it
    if (window.frappe?.session?.user && window.frappe.session.user !== 'Guest') {
      return {
        success: true,
        data: {
          name: window.frappe.session.user,
          email: window.frappe.session.user,
          full_name: window.frappe.session.user_fullname || window.frappe.session.user,
          user_image: window.frappe.session.user_image || null
        }
      }
    }

    // Try to fetch current user from Frappe API
    try {
      const { createApiClient } = await import('./config.js')
      const client = await createApiClient()
      const response = await client.get(API_CONFIG.endpoints.auth.session)

      if (response.data && response.data !== 'Guest') {
        return {
          success: true,
          data: {
            name: response.data,
            email: response.data,
            full_name: response.data,
            user_image: null
          }
        }
      } else {
        // User is Guest, not authenticated
        return {
          success: false,
          data: null,
          message: 'User is not authenticated (Guest user)'
        }
      }
    } catch (error) {
      return {
        success: false,
        data: null,
        message: error.message || 'Failed to fetch user session'
      }
    }
  }

  async login(credentials) {
    // This would integrate with Frappe's login system
    throw new Error('Login should be handled by Frappe\'s authentication system')
  }

  async logout() {
    // This would integrate with Frappe's logout system
    window.location.href = '/logout'
  }
}

// Create service instances
const dashboardService = new DashboardService()
const changeRequestsService = new ChangeRequestsService()
const authService = new AuthService()

// API service aggregator
class ApiService {
  constructor() {
    this.applications = applicationsService
    this.incidents = incidentsService
    this.projects = projectsService
    this.dashboard = dashboardService
    this.changeRequests = changeRequestsService
    this.swaggerCollections = swaggerCollectionsService
    this.zenhub = zenhubService
    this.auth = authService
    this.permissions = permissionsService
  }

  /**
   * Switch between mock and real API mode
   */
  setMockMode(useMockData) {
    API_CONFIG.features.useMockData = useMockData
    
    // Clear all caches when switching modes
    clearCache()
  }
  
  /**
   * Get current API configuration
   */
  getConfig() {
    return { ...API_CONFIG }
  }
  
  /**
   * Clear all caches
   */
  clearAllCaches() {
    clearCache()
  }
  
  /**
   * Health check for API services
   */
  async healthCheck() {
    const results = {}
    
    try {
      // Test applications service
      await this.applications.getApplications({ limit: 1 })
      results.applications = 'OK'
    } catch (error) {
      results.applications = 'ERROR'
    }
    
    try {
      // Test incidents service
      await this.incidents.getIncidents({ limit: 1 })
      results.incidents = 'OK'
    } catch (error) {
      results.incidents = 'ERROR'
    }
    
    try {
      // Test projects service
      await this.projects.getProjects()
      results.projects = 'OK'
    } catch (error) {
      results.projects = 'ERROR'
    }
    
    try {
      // Test dashboard service
      await this.dashboard.getDashboardMetrics()
      results.dashboard = 'OK'
    } catch (error) {
      results.dashboard = 'ERROR'
    }
    
    return {
      success: true,
      data: results,
      timestamp: new Date().toISOString()
    }
  }
}

// Export singleton instance
const apiService = new ApiService()

export default apiService

// Named exports for individual services
export {
  applicationsService,
  incidentsService,
  projectsService,
  dashboardService,
  changeRequestsService,
  authService,
  permissionsService
}

// Configuration exports
export { API_CONFIG } from './config.js'
