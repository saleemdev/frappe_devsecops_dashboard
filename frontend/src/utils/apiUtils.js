/**
 * API utilities for DevSecOps Dashboard
 * Handles communication with Frappe backend APIs
 */

// Base API configuration
const API_BASE = '/api/method/frappe_devsecops_dashboard.api.dashboard'

/**
 * Generic API call function with error handling
 */
async function apiCall(endpoint, options = {}) {
  try {
    const response = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': window.csrf_token,
        ...options.headers
      },
      ...options
    })

    if (!response.ok) {
      throw new Error(`API call failed: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    
    // Handle Frappe API response format
    if (data.message) {
      return data.message
    }
    
    return data
  } catch (error) {
    console.error('API Error:', error)
    throw error
  }
}

/**
 * Get comprehensive dashboard data
 */
export async function getDashboardData() {
  try {
    const data = await apiCall(`${API_BASE}.get_dashboard_data`)
    return data
  } catch (error) {
    console.error('Failed to fetch dashboard data:', error)
    // Return fallback mock data if API fails
    return getFallbackData()
  }
}

/**
 * Get projects data only
 */
export async function getProjectsData() {
  try {
    const projects = await apiCall(`${API_BASE}.get_projects_data`)
    return projects
  } catch (error) {
    console.error('Failed to fetch projects data:', error)
    return []
  }
}

/**
 * Get dashboard metrics
 */
export async function getDashboardMetrics() {
  try {
    const metrics = await apiCall(`${API_BASE}.get_dashboard_metrics`)
    return metrics
  } catch (error) {
    console.error('Failed to fetch dashboard metrics:', error)
    return {
      activeProjects: 0,
      totalTasks: 0,
      teamCapacity: 0
    }
  }
}

/**
 * Get team utilization data
 */
export async function getTeamUtilization() {
  try {
    const teamData = await apiCall(`${API_BASE}.get_team_utilization`)
    return teamData
  } catch (error) {
    console.error('Failed to fetch team utilization:', error)
    return {
      average: 0,
      members: 0,
      overCapacity: 0,
      individuals: []
    }
  }
}

/**
 * Get projects with tasks (new task-based API)
 */
export async function getProjectsWithTasks() {
  try {
    const response = await apiCall('/api/method/frappe_devsecops_dashboard.api.projects.get_projects_with_tasks')
    return response
  } catch (error) {
    console.error('Failed to fetch projects with tasks:', error)
    throw error
  }
}

/**
 * Get detailed project information
 */
export async function getProjectDetails(projectId) {
  try {
    const details = await apiCall(`/api/method/frappe_devsecops_dashboard.api.projects.get_project_details?project_id=${projectId}`)
    return details
  } catch (error) {
    console.error('Failed to fetch project details:', error)
    return null
  }
}

/**
 * Fallback mock data for when API is unavailable
 */
function getFallbackData() {
  return {
    metrics: {
      activeProjects: 6,
      totalTasks: 187,
      teamCapacity: 89
    },
    projects: [
      {
        id: 1,
        name: 'ePrescription System',
        client: 'Ministry of Health',
        status: 'ACTIVE',
        progress: 72,
        currentPhase: 'QA'
      },
      {
        id: 2,
        name: 'Facility360 eLicensing',
        client: 'Kenya Medical Board',
        status: 'ACTIVE',
        progress: 56,
        currentPhase: 'Secure Development'
      }
    ],
    teamUtilization: {
      average: 89,
      members: 10,
      overCapacity: 2,
      individuals: [
        { name: 'Grace Wanjiku', utilization: 92 },
        { name: 'James Mwangi', utilization: 88 },
        { name: 'Amina Kiptoo', utilization: 84 },
        { name: 'Peter Otieno', utilization: 81 },
        { name: 'Samuel Kipchoge', utilization: 77 },
        { name: 'Faith Achieng', utilization: 74 }
      ]
    },
    deliveryLifecycle: [
      'Business Development',
      'Product Design Documentation',
      'Secure Architecture',
      'Secure Design',
      'ATB (Authority to Begin)',
      'Environment Setup',
      'Development Planning',
      'Secure Development',
      'QA',
      'ATO (Authority to Operate)',
      'Deployment',
      'Operations & Support'
    ]
  }
}

/**
 * Refresh dashboard data
 * Useful for manual refresh or after data updates
 */
export async function refreshDashboardData() {
  try {
    const data = await getDashboardData()
    return data
  } catch (error) {
    console.error('Failed to refresh dashboard data:', error)
    throw error
  }
}

/**
 * Check API health
 */
export async function checkApiHealth() {
  try {
    await apiCall('/api/method/ping')
    return true
  } catch (error) {
    console.error('API health check failed:', error)
    return false
  }
}

// Dashboard Settings API Functions

/**
 * Get Dashboard Preferences
 */
export async function getDashboardPreferences() {
  try {
    const response = await apiCall('/api/method/frappe_devsecops_dashboard.api.settings.get_dashboard_preferences')
    return response
  } catch (error) {
    console.error('Failed to fetch dashboard preferences:', error)
    throw error
  }
}

/**
 * Update Dashboard Preferences
 */
export async function updateDashboardPreferences(preferencesData) {
  try {
    const response = await apiCall('/api/method/frappe_devsecops_dashboard.api.settings.update_dashboard_preferences', {
      method: 'POST',
      body: JSON.stringify({ preferences_data: preferencesData })
    })
    return response
  } catch (error) {
    console.error('Failed to update dashboard preferences:', error)
    throw error
  }
}
