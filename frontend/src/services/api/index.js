/**
 * API Services Index
 * Central export point for all API services
 */

import { API_CONFIG, clearCache } from './config.js'
import applicationsService from './applications.js'
import incidentsService from './incidents.js'

// Projects service (simplified for now)
class ProjectsService {
  async getProjects(filters = {}) {
    // This would use the existing erpnextApiUtils for now
    // and be migrated to the new pattern later
    const { getProjectsWithTasks } = await import('../../utils/erpnextApiUtils.js')
    return getProjectsWithTasks()
  }
  
  async getProject(id) {
    const { getProjectDetails } = await import('../../utils/erpnextApiUtils.js')
    return getProjectDetails(id)
  }
}

// Dashboard service (simplified for now)
class DashboardService {
  async getDashboardMetrics() {
    const { getDashboardData } = await import('../../utils/erpnextApiUtils.js')
    return getDashboardData()
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
    if (API_CONFIG.features.useMockData) {
      return {
        success: true,
        data: {
          name: 'Administrator',
          email: 'admin@example.com',
          full_name: 'System Administrator',
          user_image: null
        }
      }
    }
    
    // Real API implementation would go here
    // For now, return the existing user info from cookies or session
    return {
      success: true,
      data: {
        name: window.frappe?.session?.user || 'Guest',
        email: window.frappe?.session?.user || 'guest@example.com',
        full_name: window.frappe?.session?.user_fullname || 'Guest User',
        user_image: window.frappe?.session?.user_image || null
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
const projectsService = new ProjectsService()
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
    this.auth = authService
  }
  
  /**
   * Switch between mock and real API mode
   */
  setMockMode(useMockData) {
    API_CONFIG.features.useMockData = useMockData
    
    // Clear all caches when switching modes
    clearCache()
    
    console.log(`API mode switched to: ${useMockData ? 'Mock' : 'Real'}`)
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
    console.log('All API caches cleared')
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
  authService
}

// Configuration exports
export { API_CONFIG } from './config.js'
