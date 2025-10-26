/**
 * Zenhub API Service
 * Provides methods to fetch sprint data and workspace issues via Frappe backend
 */

import { API_CONFIG, createApiClient, withRetry, withCache, isMockEnabled } from './config.js'
import { mockZenhubSprintReport, simulateDelay } from './mockData.js'

class ZenhubService {
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
   * Get sprint data for a project (via Frappe method zenhub.get_sprint_data)
   * @param {string} projectId - The Frappe Project ID
   * @param {boolean} forceRefresh - Force refresh from API, bypass cache
   */
  async getSprintData(projectId, forceRefresh = false) {
    if (!projectId) {
      throw { status: 400, message: 'projectId is required', data: null }
    }

    if (isMockEnabled('zenhub')) {
      await simulateDelay(600)
      return mockZenhubSprintReport(projectId)
    }

    const client = await this.initClient()

    // If force refresh, clear the cache first
    if (forceRefresh) {
      const { clearCache } = await import('./config.js')
      clearCache(`zenhub-sprint-${projectId}`)
    }

    return withRetry(async () => {
      return withCache(`zenhub-sprint-${projectId}`, async () => {
        const response = await client.get(API_CONFIG.endpoints.zenhub.sprintData, {
          params: {
            project_id: projectId,
            force_refresh: forceRefresh ? 1 : 0
          }
        })
        // Response already normalized by axios interceptor (response.data.message -> response.data)
        return response.data
      })
    })
  }

  /**
   * Get stakeholder-focused sprint report for a project
   * Simplified metrics optimized for executive-level reporting
   * @param {string} projectId - The Frappe Project ID
   * @param {boolean} forceRefresh - Force refresh from API, bypass cache
   */
  async getStakeholderSprintReport(projectId, forceRefresh = false) {
    if (!projectId) {
      throw { status: 400, message: 'projectId is required', data: null }
    }

    if (isMockEnabled('zenhub')) {
      await simulateDelay(600)
      return mockZenhubSprintReport(projectId)
    }

    const client = await this.initClient()

    // If force refresh, clear the cache first
    if (forceRefresh) {
      const { clearCache } = await import('./config.js')
      clearCache(`zenhub-stakeholder-sprint-${projectId}`)
    }

    return withRetry(async () => {
      return withCache(`zenhub-stakeholder-sprint-${projectId}`, async () => {
        const response = await client.get(API_CONFIG.endpoints.zenhub.stakeholderReport, {
          params: {
            project_id: projectId,
            force_refresh: forceRefresh ? 1 : 0
          }
        })
        // Response already normalized by axios interceptor (response.data.message -> response.data)
        return response.data
      })
    })
  }
}

export default new ZenhubService()

