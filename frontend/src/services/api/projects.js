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
      console.error('[ProjectsService] Error fetching from ERPNext:', error)
      console.error('[ProjectsService] Error details:', {
        message: error.message,
        stack: error.stack
      })

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
      console.error('[ProjectsService] Error fetching tasks by type from ERPNext:', error)
      return {
        success: false,
        error: error.message,
        data: []
      }
    }
  }
}

const projectsService = new ProjectsService()
export default projectsService

