/**
 * Route Constants
 * Centralized route definitions to prevent typos and enable type-safe navigation
 */

export const ROUTES = {
  // Main navigation
  DASHBOARD: 'dashboard',
  PROJECTS: 'projects',
  PROJECT_CREATE: 'project-create',
  PROJECT_DETAIL: 'project-detail',
  PROJECT_EDIT: 'project-edit',

  // Zenhub Sprint Summaries
  PRODUCT_SPRINT_SUMMARY: 'product-sprint-summary',
  PROJECT_SPRINT_SUMMARY: 'project-sprint-summary',
  TASK_SUMMARY: 'task-summary',

  // Incidents
  INCIDENTS: 'incidents',
  INCIDENT_CREATE: 'incident-create',
  INCIDENT_DETAIL: 'incident-detail',
  INCIDENT_EDIT: 'incident-edit',
  INCIDENTS_DASHBOARD: 'incidents-dashboard',

  // Change Requests
  CHANGE_REQUESTS: 'change-requests',
  CHANGE_REQUESTS_NEW: 'change-requests-new',
  CHANGE_REQUESTS_EDIT: 'change-requests-edit',
  CHANGE_REQUESTS_DASHBOARD: 'change-requests-dashboard',

  // Applications
  PROJECT_APPS: 'project-apps',
  APP_DETAIL: 'app-detail',

  // Other
  TEAM_UTILIZATION: 'team-utilization',
  MONITORING_DASHBOARDS: 'monitoring-dashboards',
  PASSWORD_VAULT: 'password-vault',
  SWAGGER_COLLECTIONS: 'swagger-collections',
  SWAGGER_DETAIL: 'swagger-detail',
  DEVOPS_CONFIG: 'devops-config',
  SYSTEM_TEST: 'system-test',
  API_TEST: 'api-test',
  API_DIAGNOSTICS: 'api-diagnostics',
  ASK_AI: 'ask-ai'
}

/**
 * Hash patterns for URL routing
 */
export const HASH_PATTERNS = {
  INCIDENT_CREATE: 'incident/create',
  INCIDENT_DETAIL: (id) => `incident/${id}`,
  INCIDENT_EDIT: (id) => `incident/${id}/edit`,
  PROJECT_DETAIL: (id) => `project/${id}`,
  PROJECT_EDIT: (id) => `project/${id}/edit`,
  PROJECT_CREATE: 'project/create',
  PRODUCT_SPRINT_SUMMARY: (productId) => `sprint-summary/product/${productId}`,
  PROJECT_SPRINT_SUMMARY: (projectId) => `sprint-summary/project/${projectId}`,
  TASK_SUMMARY: (taskId) => `sprint-summary/task/${taskId}`
}

export default ROUTES
