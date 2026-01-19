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

  /**
   * Get workspace summary with full hierarchical structure
   * @param {string} workspaceId - The Zenhub workspace ID
   * @param {boolean} forceRefresh - Force refresh from API, bypass cache
   */
  async getWorkspaceSummary(workspaceId, forceRefresh = false) {
    if (!workspaceId) {
      throw { status: 400, message: 'workspaceId is required', data: null }
    }

    const client = await this.initClient()

    if (forceRefresh) {
      const { clearCache } = await import('./config.js')
      clearCache(`zenhub-workspace-summary-${workspaceId}`)
    }

    return withRetry(async () => {
      return withCache(`zenhub-workspace-summary-${workspaceId}`, async () => {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary',
          {
            params: { workspace_id: workspaceId }
          }
        )
        return response.data
      })
    })
  }

  /**
   * Get workspace summary filtered by project
   * @param {string} workspaceId - The Zenhub workspace ID
   * @param {string} projectId - The project ID to filter by
   * @param {boolean} forceRefresh - Force refresh from API, bypass cache
   */
  async getWorkspaceByProject(workspaceId, projectId, forceRefresh = false) {
    if (!workspaceId || !projectId) {
      throw { status: 400, message: 'workspaceId and projectId are required', data: null }
    }

    const client = await this.initClient()

    if (forceRefresh) {
      const { clearCache } = await import('./config.js')
      clearCache(`zenhub-workspace-project-${workspaceId}-${projectId}`)
    }

    return withRetry(async () => {
      return withCache(`zenhub-workspace-project-${workspaceId}-${projectId}`, async () => {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_project',
          {
            params: { workspace_id: workspaceId, project_id: projectId }
          }
        )
        return response.data
      })
    })
  }

  /**
   * Get workspace summary filtered by epic
   * @param {string} workspaceId - The Zenhub workspace ID
   * @param {string} epicId - The epic ID to filter by
   * @param {boolean} forceRefresh - Force refresh from API, bypass cache
   */
  async getWorkspaceByEpic(workspaceId, epicId, forceRefresh = false) {
    if (!workspaceId || !epicId) {
      throw { status: 400, message: 'workspaceId and epicId are required', data: null }
    }

    const client = await this.initClient()

    if (forceRefresh) {
      const { clearCache } = await import('./config.js')
      clearCache(`zenhub-workspace-epic-${workspaceId}-${epicId}`)
    }

    return withRetry(async () => {
      return withCache(`zenhub-workspace-epic-${workspaceId}-${epicId}`, async () => {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_by_epic',
          {
            params: { workspace_id: workspaceId, epic_id: epicId }
          }
        )
        return response.data
      })
    })
  }

  /**
   * Get team utilization metrics
   * @param {string} workspaceId - The Zenhub workspace ID
   * @param {boolean} forceRefresh - Force refresh from API, bypass cache
   */
  async getTeamUtilization(workspaceId, forceRefresh = false) {
    if (!workspaceId) {
      throw { status: 400, message: 'workspaceId is required', data: null }
    }

    const client = await this.initClient()

    if (forceRefresh) {
      const { clearCache } = await import('./config.js')
      clearCache(`zenhub-team-utilization-${workspaceId}`)
    }

    return withRetry(async () => {
      return withCache(`zenhub-team-utilization-${workspaceId}`, async () => {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_team_utilization',
          {
            params: { workspace_id: workspaceId }
          }
        )
        return response.data
      })
    })
  }

  /**
   * Get workspace summary with filters and team utilization
   * @param {string} workspaceId - The Zenhub workspace ID
   * @param {object} filters - Optional filters (project_id, epic_id, status)
   * @param {boolean} forceRefresh - Force refresh from API, bypass cache
   */
  async getWorkspaceSummaryWithFilters(workspaceId, filters = {}, forceRefresh = false) {
    if (!workspaceId) {
      throw { status: 400, message: 'workspaceId is required', data: null }
    }

    const client = await this.initClient()

    const cacheKey = `zenhub-workspace-filters-${workspaceId}-${JSON.stringify(filters)}`
    if (forceRefresh) {
      const { clearCache } = await import('./config.js')
      clearCache(cacheKey)
    }

    return withRetry(async () => {
      return withCache(cacheKey, async () => {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.zenhub_workspace_api.get_workspace_summary_with_filters',
          {
            params: { workspace_id: workspaceId, ...filters }
          }
        )
        return response.data
      })
    })
  }

  /**
   * Get Software Products with configured Zenhub Workspaces
   */
  async getSoftwareProducts() {
    const client = await this.initClient()
    return withRetry(async () => {
      const response = await client.get('/api/method/frappe_devsecops_dashboard.api.zenhub.get_software_products_with_workspace')
      return response.data
    })
  }

  /**
   * Get Zenhub Projects (Issues of type Project)
   * @param {string} workspaceId 
   */
  async getZenhubProjects(workspaceId) {
    if (!workspaceId) throw { status: 400, message: 'workspaceId is required' }
    const client = await this.initClient()
    return withRetry(async () => {
      const response = await client.get('/api/method/frappe_devsecops_dashboard.api.zenhub.get_zenhub_projects', {
        params: { workspace_id: workspaceId }
      })
      return response.data
    })
  }

  /**
   * Get Epics from workspace
   * @param {string} workspaceId 
   */
  async getEpics(workspaceId) {
    if (!workspaceId) throw { status: 400, message: 'workspaceId is required' }
    const client = await this.initClient()
    return withRetry(async () => {
      const response = await client.get('/api/method/frappe_devsecops_dashboard.api.zenhub.get_epics', {
        params: { workspace_id: workspaceId }
      })
      return response.data
    })
  }

  /**
   * Get Issues by Epic
   * @param {string} epicId - The Zenhub Issue ID of the Epic
   */
  async getIssuesByEpic(epicId) {
    if (!epicId) throw { status: 400, message: 'epicId is required' }
    const client = await this.initClient()
    return withRetry(async () => {
      const response = await client.get('/api/method/frappe_devsecops_dashboard.api.zenhub.get_issues_by_epic', {
        params: { zenhub_issue_id: epicId }
      })
      return response.data
    })
  }
}

export default new ZenhubService()

