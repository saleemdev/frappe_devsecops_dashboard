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
   */
  async getSprintData(projectId) {
    if (!projectId) {
      throw { status: 400, message: 'projectId is required', data: null }
    }

    if (isMockEnabled('zenhub')) {
      await simulateDelay(600)
      return mockZenhubSprintReport(projectId)
    }

    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`zenhub-sprint-${projectId}`, async () => {
        const response = await client.get(API_CONFIG.endpoints.zenhub.sprintData, {
          params: { project_id: projectId }
        })
        // Response already normalized by axios interceptor (response.data.message -> response.data)
        return response.data
      })
    })
  }
}

export default new ZenhubService()

