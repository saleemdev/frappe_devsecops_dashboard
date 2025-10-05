/**
 * Applications API Service
 * Handles all application-related API calls
 */

import { API_CONFIG, createApiClient, withRetry, withCache, isMockEnabled } from './config.js'
import { mockApplications, simulateDelay } from './mockData.js'

class ApplicationsService {
  constructor() {
    this.client = null
    this.initClient()
  }

  async initClient() {
    if (!this.client) {
      this.client = await createApiClient()
    }
    return this.client
  }

  /**
   * Get all applications
   */
  async getApplications(filters = {}) {
    if (isMockEnabled('applications')) {
      await simulateDelay()
      
      let applications = [...mockApplications]
      
      // Apply filters
      if (filters.status) {
        applications = applications.filter(app => app.status === filters.status)
      }
      if (filters.project) {
        applications = applications.filter(app => app.project === filters.project)
      }
      if (filters.technology) {
        applications = applications.filter(app => app.technology === filters.technology)
      }
      
      return {
        success: true,
        data: applications,
        total: applications.length
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      return withCache(`applications-${JSON.stringify(filters)}`, async () => {
        const response = await client.get(API_CONFIG.endpoints.applications.list, {
          params: filters
        })
        
        return {
          success: true,
          data: response.data.data || [],
          total: response.data.total || 0
        }
      })
    })
  }

  /**
   * Get application by ID
   */
  async getApplication(id) {
    if (isMockEnabled('applications')) {
      await simulateDelay()
      
      const application = mockApplications.find(app => app.id === id)
      
      if (!application) {
        throw {
          status: 404,
          message: 'Application not found',
          data: null
        }
      }
      
      return {
        success: true,
        data: application
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      return withCache(`application-${id}`, async () => {
        const response = await client.get(`${API_CONFIG.endpoints.applications.detail}/${id}`)
        
        return {
          success: true,
          data: response.data
        }
      })
    })
  }

  /**
   * Create new application
   */
  async createApplication(applicationData) {
    if (isMockEnabled('applications')) {
      await simulateDelay(1000)
      
      const newApplication = {
        id: `app-${Date.now()}`,
        ...applicationData,
        version: 'v1.0.0',
        lastDeployment: new Date().toISOString(),
        healthScore: 85,
        securityScore: 90,
        complianceStatus: 'Pending Review',
        team: [],
        environmentVariables: [],
        deploymentHistory: [],
        securityScans: [],
        metrics: {
          uptime: 0,
          responseTime: 0,
          errorRate: 0,
          throughput: 0
        }
      }
      
      // In real implementation, this would be persisted
      mockApplications.push(newApplication)
      
      return {
        success: true,
        data: newApplication,
        message: 'Application created successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.post(API_CONFIG.endpoints.applications.create, applicationData)
      
      // Clear cache after creation
      this.clearApplicationsCache()
      
      return {
        success: true,
        data: response.data,
        message: 'Application created successfully'
      }
    })
  }

  /**
   * Update application
   */
  async updateApplication(id, applicationData) {
    if (isMockEnabled('applications')) {
      await simulateDelay(800)
      
      const index = mockApplications.findIndex(app => app.id === id)
      
      if (index === -1) {
        throw {
          status: 404,
          message: 'Application not found',
          data: null
        }
      }
      
      const updatedApplication = {
        ...mockApplications[index],
        ...applicationData,
        updatedDate: new Date().toISOString()
      }
      
      mockApplications[index] = updatedApplication
      
      return {
        success: true,
        data: updatedApplication,
        message: 'Application updated successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.put(`${API_CONFIG.endpoints.applications.update}/${id}`, applicationData)
      
      // Clear cache after update
      this.clearApplicationsCache()
      
      return {
        success: true,
        data: response.data,
        message: 'Application updated successfully'
      }
    })
  }

  /**
   * Delete application
   */
  async deleteApplication(id) {
    if (isMockEnabled('applications')) {
      await simulateDelay(500)
      
      const index = mockApplications.findIndex(app => app.id === id)
      
      if (index === -1) {
        throw {
          status: 404,
          message: 'Application not found',
          data: null
        }
      }
      
      mockApplications.splice(index, 1)
      
      return {
        success: true,
        message: 'Application deleted successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      await client.delete(`${API_CONFIG.endpoints.applications.delete}/${id}`)
      
      // Clear cache after deletion
      this.clearApplicationsCache()
      
      return {
        success: true,
        message: 'Application deleted successfully'
      }
    })
  }

  /**
   * Get application metrics
   */
  async getApplicationMetrics(id, timeRange = '24h') {
    if (isMockEnabled('applications')) {
      await simulateDelay()
      
      const application = mockApplications.find(app => app.id === id)
      
      if (!application) {
        throw {
          status: 404,
          message: 'Application not found',
          data: null
        }
      }
      
      return {
        success: true,
        data: application.metrics
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.get(`${API_CONFIG.endpoints.applications.detail}/${id}/metrics`, {
        params: { timeRange }
      })
      
      return {
        success: true,
        data: response.data
      }
    })
  }

  /**
   * Clear applications cache
   */
  clearApplicationsCache() {
    // Import clearCache dynamically to avoid circular dependency
    import('./config.js').then(({ clearCache }) => {
      clearCache('applications')
      clearCache('application')
    })
  }
}

// Export singleton instance
export default new ApplicationsService()
