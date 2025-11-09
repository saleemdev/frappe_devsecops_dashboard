/**
 * Projects API Service
 * Provides grouped Task Type summaries and task listings per Task Type
 */

import { isMockEnabled } from './config.js'

// Dynamic imports to keep initial bundle small
const loadMock = async () => await import('./mockData.js')
const loadErpNextUtils = async () => await import('../../utils/erpnextApiUtils.js')

// Helper to color-code by percent
const colorByPercent = (pct) => {
  if (pct <= 33) return 'red'
  if (pct <= 66) return 'gold'
  return 'green'
}

class ProjectsService {
  /**
   * Get all projects with their associated tasks
   * Uses the backend API endpoint that returns projects with task data
   */
  async getProjects() {
    if (isMockEnabled('projects')) {
      const { simulateDelay, mockProjects } = await loadMock()
      await simulateDelay(300)
      return {
        success: true,
        data: mockProjects
      }
    }

    try {
      // Use the backend API that returns projects with tasks
      // This endpoint calls get_projects_with_tasks() which enhances projects with task data
      const { createApiClient } = await loadErpNextUtils()
      const client = await createApiClient()

      const response = await client.get('frappe_devsecops_dashboard.api.dashboard.get_dashboard_data')

      // Normalize Frappe response: unwrap message if present
      const payload = response?.data?.message ?? response?.data

      if (payload && payload.success && Array.isArray(payload.projects)) {
        return {
          success: true,
          data: payload.projects
        }
      }

      console.error('❌ Projects Service - Invalid response format:', response.data)
      return {
        success: false,
        error: 'Invalid response format',
        data: []
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * Returns grouped summary by Task Type for a project
   * Each item: { taskType, name, custom_priority, total, completed, completionRate, percent, color }
   */
  async getTaskTypeSummary(projectId) {
    if (isMockEnabled('projects')) {
      const { simulateDelay, mockTaskTypes, mockTasksByProject } = await loadMock()

      await simulateDelay(300)

      const types = [...mockTaskTypes].sort((a, b) => (a.custom_priority ?? 999) - (b.custom_priority ?? 999))
      const tasks = (mockTasksByProject[projectId] || [])

      const groups = types.map((t) => {
        const inType = tasks.filter((tk) => String(tk.task_type) === String(t.name))
        const total = inType.length
        const completed = inType.filter((tk) => (tk.status || '').toLowerCase() === 'completed').length
        const percent = total ? Math.round((completed / total) * 100) : 0
        const group = {
          taskType: t.name,
          name: t.name,
          custom_priority: t.custom_priority ?? 999,
          total,
          completed,
          completionRate: `${completed}/${total}`,
          percent,
          color: colorByPercent(percent)
        }
        return group
      })

      const result = { success: true, data: groups }
      return result
    }

    // Real API path - Query ERPNext Task and Task Type doctypes
    try {
      const { getProjectTasksWithTypes, getTaskTypes } = await loadErpNextUtils()

      const [types, tasks] = await Promise.all([
        getTaskTypes(),
        getProjectTasksWithTypes(projectId)
      ])

      const typesSorted = [...(types || [])].sort((a, b) => (a.custom_priority ?? 999) - (b.custom_priority ?? 999))

      const groups = typesSorted.map((t) => {
        const inType = (tasks || []).filter((tk) => String(tk.task_type) === String(t.name))
        const total = inType.length
        const completed = inType.filter((tk) => (tk.status || '').toLowerCase() === 'completed').length
        const percent = total ? Math.round((completed / total) * 100) : 0
        const group = {
          taskType: t.name,
          name: t.name,
          custom_priority: t.custom_priority ?? 999,
          total,
          completed,
          completionRate: `${completed}/${total}`,
          percent,
          color: colorByPercent(percent)
        }
        return group
      })

      const result = { success: true, data: groups }
      return result

    } catch (error) {
      // Return empty groups on error
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * Returns detailed list of tasks for a project and a specific Task Type
   */
  async getTasksByType(projectId, taskType) {
    if (isMockEnabled('projects')) {
      const { simulateDelay, mockTasksByProject } = await loadMock()
      await simulateDelay(200)
      const all = mockTasksByProject[projectId] || []
      const items = all.filter((t) => String(t.task_type) === String(taskType))
      const result = { success: true, data: items }
      return result
    }

    try {
      const { getProjectTasksWithTypes } = await loadErpNextUtils()
      const all = await getProjectTasksWithTypes(projectId)

      const items = (all || []).filter((t) => String(t.task_type) === String(taskType))

      const result = { success: true, data: items }
      return result

    } catch (error) {
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }

  /**
   * Create a new project with team members
   * @param {Object} projectData - Project data object
   * @param {string} projectData.project_name - Project name (required)
   * @param {string} projectData.project_type - Project type (required)
   * @param {string} projectData.expected_start_date - Start date in YYYY-MM-DD format (required)
   * @param {string} projectData.expected_end_date - End date in YYYY-MM-DD format (required)
   * @param {Array} projectData.team_members - Array of team member objects with 'user' field (optional)
   * @param {string} projectData.notes - Project notes/description (optional)
   * @param {string} projectData.priority - Project priority (optional)
   * @param {string} projectData.department - Department link (optional)
   * @returns {Promise<Object>} Response with success status and project details
   */
  async createProject(projectData) {
    if (isMockEnabled('projects')) {
      const { simulateDelay } = await loadMock()
      await simulateDelay(500)

      // Mock successful project creation
      return {
        success: true,
        message: 'Project created successfully',
        project_id: `PROJ-${Date.now()}`,
        project_name: projectData.project_name,
        project: {
          name: `PROJ-${Date.now()}`,
          project_name: projectData.project_name,
          project_type: projectData.project_type,
          status: 'Open',
          expected_start_date: projectData.expected_start_date,
          expected_end_date: projectData.expected_end_date,
          priority: projectData.priority || 'Medium',
          team_members_count: (projectData.team_members || []).length
        }
      }
    }

    try {
      // Validate required fields
      if (!projectData.project_name || !projectData.project_name.trim()) {
        return {
          status: 400,
          message: 'Project name is required',
          data: null
        }
      }

      if (!projectData.project_type) {
        return {
          status: 400,
          message: 'Project type is required',
          data: null
        }
      }

      if (!projectData.expected_start_date) {
        return {
          status: 400,
          message: 'Expected start date is required',
          data: null
        }
      }

      if (!projectData.expected_end_date) {
        return {
          status: 400,
          message: 'Expected end date is required',
          data: null
        }
      }

      // Prepare request body
      const requestBody = {
        project_name: projectData.project_name.trim(),
        project_type: projectData.project_type,
        expected_start_date: projectData.expected_start_date,
        expected_end_date: projectData.expected_end_date
      }

      // Add optional fields
      if (projectData.team_members && Array.isArray(projectData.team_members)) {
        requestBody.team_members = projectData.team_members
      }

      if (projectData.notes) {
        requestBody.notes = projectData.notes
      }

      if (projectData.priority) {
        requestBody.priority = projectData.priority
      }

      if (projectData.department) {
        requestBody.department = projectData.department
      }

      if (projectData.project_template) {
        requestBody.project_template = projectData.project_template
      }

      // Make API call using axios client (includes CSRF token automatically)
      const { createApiClient } = await loadErpNextUtils()
      const client = await createApiClient()

      const response = await client.post('frappe_devsecops_dashboard.api.dashboard.create_project', requestBody)

      console.log('[ProjectsService] Create project response:', response)

      // Frappe wraps the response in response.data.message
      const payload = response?.data?.message ?? response?.data
      console.log('[ProjectsService] Payload:', payload)

      if (payload && payload.success) {
        return {
          status: 200,
          message: payload.message || 'Project created successfully',
          data: payload
        }
      } else {
        const errorMsg = payload?.error || response.data?.error || 'Failed to create project'
        console.error('[ProjectsService] Create failed:', errorMsg, payload)
        return {
          status: 400,
          message: errorMsg,
          data: null
        }
      }
    } catch (error) {
      console.error('Error creating project:', error)
      return {
        status: error.status || 500,
        message: error.message || 'An error occurred while creating the project',
        data: null
      }
    }
  }
}

const projectsService = new ProjectsService()
export default projectsService

