/**
 * ERPNext API Utilities for DevSecOps Dashboard
 * Integrates with ERPNext Project and Task Type doctypes
 */

import axios from 'axios'

// API base configuration
const API_BASE = '/api/method'

// Create axios instance with default config
const apiClient = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'X-Frappe-CSRF-Token': window.csrf_token || ''
  }
})

// Request interceptor to add CSRF token and handle headers
apiClient.interceptors.request.use(
  (config) => {
    // Add CSRF token if available
    if (window.csrf_token) {
      config.headers['X-Frappe-CSRF-Token'] = window.csrf_token
    }

    // Ensure proper headers for API requests
    config.headers['Accept'] = 'application/json'
    config.headers['Content-Type'] = 'application/json'

    // Remove Expect header to avoid 417 errors
    delete config.headers['Expect']

    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return response
  },
  (error) => {
    console.error('API Error:', error)
    
    if (error.response?.status === 403) {
      console.error('Authentication error - please refresh the page')
    } else if (error.response?.status === 500) {
      console.error('Server error - please try again later')
    }
    
    return Promise.reject(error)
  }
)

/**
 * Get comprehensive dashboard data from ERPNext Project and Task Type integration
 * @returns {Promise<Object>} Dashboard data with projects, metrics, and lifecycle phases
 */
export const getDashboardData = async () => {
  try {
    const response = await apiClient.get('/frappe_devsecops_dashboard.api.dashboard.get_dashboard_data')
    
    if (response.data && response.data.message) {
      const data = response.data.message
      
      // Transform data to ensure consistent field naming
      return {
        success: data.success || false,
        projects: transformProjectsData(data.projects || []),
        metrics: transformMetricsData(data.metrics || {}),
        lifecycle_phases: data.lifecycle_phases || [],
        timestamp: data.timestamp
      }
    }
    
    throw new Error('Invalid response format')
    
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    
    // Return fallback data structure
    return {
      success: false,
      error: error.message || 'Failed to fetch dashboard data',
      projects: [],
      metrics: {
        total_projects: 0,
        active_projects: 0,
        total_tasks: 0,
        completed_tasks: 0,
        average_completion: 0,
        team_capacity: 0,
        completion_rate: 0
      },
      lifecycle_phases: []
    }
  }
}

/**
 * Get detailed information for a specific project
 * @param {string} projectName - Name of the project
 * @returns {Promise<Object>} Detailed project information
 */
export const getProjectDetails = async (projectName) => {
  try {
    const response = await apiClient.get('/frappe_devsecops_dashboard.api.dashboard.get_project_details', {
      params: { project_name: projectName }
    })
    
    if (response.data && response.data.message) {
      const data = response.data.message
      
      if (data.success) {
        return {
          success: true,
          project: transformProjectData(data.project)
        }
      } else {
        throw new Error(data.error || 'Failed to fetch project details')
      }
    }
    
    throw new Error('Invalid response format')
    
  } catch (error) {
    console.error('Error fetching project details:', error)
    
    return {
      success: false,
      error: error.message || 'Failed to fetch project details',
      project: null
    }
  }
}

/**
 * Transform projects data to ensure consistent field naming and structure
 * @param {Array} projects - Raw projects data from API
 * @returns {Array} Transformed projects data
 */
const transformProjectsData = (projects) => {
  return projects.map(project => transformProjectData(project))
}

/**
 * Transform individual project data
 * @param {Object} project - Raw project data
 * @returns {Object} Transformed project data
 */
const transformProjectData = (project) => {
  return {
    // Core project fields
    id: project.id || project.name,
    name: project.name || project.project_name || 'Unnamed Project',
    project_name: project.project_name || project.name,
    project_status: project.project_status || project.status || 'Open',
    status: project.status || project.project_status || 'Open',
    
    // Client and type information
    client: project.client || project.customer || 'No Client',
    customer: project.customer || project.client,
    project_type: project.project_type || 'Standard',
    priority: project.priority || 'Medium',
    
    // Progress and metrics
    progress: parseFloat(project.progress || project.percent_complete || 0),
    percent_complete: parseFloat(project.percent_complete || project.progress || 0),
    completion_rate: parseFloat(project.completion_rate || 0),
    
    // Task information
    task_count: parseInt(project.task_count || 0),
    total_tasks: parseInt(project.total_tasks || project.task_count || 0),
    completed_tasks: parseInt(project.completed_tasks || 0),
    
    // Phase information
    current_phase: project.current_phase || 'Planning',
    currentPhase: project.currentPhase || project.current_phase || 'Planning',
    
    // Delivery phases (ERPNext Task Type based)
    delivery_phases: transformDeliveryPhases(project.delivery_phases || []),
    deliveryPhases: transformDeliveryPhases(project.delivery_phases || []),
    
    // Date fields
    expected_start_date: project.expected_start_date,
    expected_end_date: project.expected_end_date,
    actual_start_date: project.actual_start_date,
    actual_end_date: project.actual_end_date,
    
    // Organizational fields
    cost_center: project.cost_center,
    department: project.department,
    
    // Tasks array for detailed view
    tasks: project.tasks || []
  }
}

/**
 * Transform delivery phases data
 * @param {Array} phases - Raw phases data
 * @returns {Array} Transformed phases data
 */
const transformDeliveryPhases = (phases) => {
  return phases.map(phase => ({
    // New ERPNext-based fields
    section_id: phase.section_id,
    section_name: phase.section_name || phase.name,
    section_status: phase.section_status || phase.status,
    section_progress: parseFloat(phase.section_progress || phase.progress || 0),
    section_order: parseInt(phase.section_order || 0),
    
    // Task counts
    task_count: parseInt(phase.task_count || 0),
    completed_tasks: parseInt(phase.completed_tasks || 0),
    in_progress_tasks: parseInt(phase.in_progress_tasks || 0),
    
    // Legacy fields for backward compatibility
    name: phase.name || phase.section_name,
    status: phase.status || phase.section_status,
    progress: parseFloat(phase.progress || phase.section_progress || 0)
  }))
}

/**
 * Transform metrics data
 * @param {Object} metrics - Raw metrics data
 * @returns {Object} Transformed metrics data
 */
const transformMetricsData = (metrics) => {
  return {
    // Project counts
    total_projects: parseInt(metrics.total_projects || 0),
    active_projects: parseInt(metrics.active_projects || 0),
    activeProjects: parseInt(metrics.active_projects || metrics.activeProjects || 0),
    
    // Task counts
    total_tasks: parseInt(metrics.total_tasks || 0),
    totalTasks: parseInt(metrics.total_tasks || metrics.totalTasks || 0),
    completed_tasks: parseInt(metrics.completed_tasks || 0),
    completedTasks: parseInt(metrics.completed_tasks || metrics.completedTasks || 0),
    
    // Progress metrics
    average_completion: parseFloat(metrics.average_completion || 0),
    completion_rate: parseFloat(metrics.completion_rate || 0),
    
    // Team metrics
    team_capacity: parseFloat(metrics.team_capacity || 0),
    teamCapacity: parseFloat(metrics.team_capacity || metrics.teamCapacity || 0)
  }
}

/**
 * Get ERPNext Task Types for lifecycle phases
 * @returns {Promise<Array>} List of Task Types
 */
export const getTaskTypes = async () => {
  try {
    const response = await axios.get('/api/resource/Task Type', {
      headers: {
        'X-Frappe-CSRF-Token': window.csrf_token || ''
      }
    })
    
    if (response.data && response.data.data) {
      return response.data.data.map(taskType => ({
        name: taskType.name,
        description: taskType.description || `${taskType.name} phase`
      }))
    }
    
    return []
    
  } catch (error) {
    console.error('Error fetching task types:', error)
    return []
  }
}

/**
 * Get ERPNext Projects list
 * @returns {Promise<Array>} List of Projects
 */
export const getProjects = async () => {
  try {
    const response = await axios.get('/api/resource/Project', {
      params: {
        fields: JSON.stringify(['name', 'project_name', 'status', 'customer', 'percent_complete']),
        filters: JSON.stringify([['disabled', '=', 0]])
      },
      headers: {
        'X-Frappe-CSRF-Token': window.csrf_token || ''
      }
    })
    
    if (response.data && response.data.data) {
      return response.data.data
    }
    
    return []
    
  } catch (error) {
    console.error('Error fetching projects:', error)
    return []
  }
}

/**
 * Get tasks for a specific project with Task Type information
 * @param {string} projectId - Project ID or name
 * @returns {Promise<Array>} List of tasks with task_type field
 */
export const getProjectTasksWithTypes = async (projectId) => {
  try {
    // Query ERPNext Task doctype for tasks belonging to this project
    const response = await axios.get('/api/resource/Task', {
      params: {
        fields: JSON.stringify([
          'name',
          'subject',
          'status',
          'priority',
          'project',
          'task_type',
          'exp_start_date',
          'exp_end_date',
          '_assign',
          'description'
        ]),
        filters: JSON.stringify([
          ['project', '=', projectId]
        ]),
        limit_page_length: 999
      },
      headers: {
        'X-Frappe-CSRF-Token': window.csrf_token || ''
      }
    })

    if (response.data && response.data.data) {
      const tasks = response.data.data.map(task => ({
        id: task.name,
        name: task.name,
        subject: task.subject,
        status: task.status,
        priority: task.priority,
        project: task.project,
        task_type: task.task_type,
        due_date: task.exp_end_date,
        start_date: task.exp_start_date,
        assigned_to: task._assign ? JSON.parse(task._assign)[0] : null,
        description: task.description
      }))

      return tasks
    }

    return []

  } catch (error) {
    console.error('[erpnextApiUtils] Error fetching project tasks:', error)
    console.error('[erpnextApiUtils] Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    })
    return []
  }
}

// Export the main function for backward compatibility
export const getProjectsWithTasks = getDashboardData

// Default export
export default {
  getDashboardData,
  getProjectDetails,
  getTaskTypes,
  getProjects,
  getProjectsWithTasks: getDashboardData,
  getProjectTasksWithTypes
}
