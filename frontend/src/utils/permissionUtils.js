/**
 * Permission utility functions for role-based access control
 */

/**
 * Check if current user has Administrator role
 * @returns {boolean}
 */
export const isAdministrator = () => {
  if (window.frappe?.session?.user === 'Administrator') {
    return true
  }

  const roles = window.frappe?.boot?.user?.roles || []
  return roles.includes('Administrator')
}

/**
 * Check if current user has Project Manager role
 * @returns {boolean}
 */
export const isProjectManager = () => {
  const roles = window.frappe?.boot?.user?.roles || []
  return roles.includes('Project Manager') || roles.includes('Projects Manager')
}

/**
 * Check if current user can edit projects
 * Only Administrator or Project Manager can edit
 * @returns {boolean}
 */
export const canEditProject = () => {
  return isAdministrator() || isProjectManager()
}

/**
 * Check if current user can edit tasks
 * Only Administrator or Project Manager can edit
 * @returns {boolean}
 */
export const canEditTask = () => {
  return isAdministrator() || isProjectManager()
}

/**
 * Get current user's roles
 * @returns {Array<string>}
 */
export const getCurrentUserRoles = () => {
  return window.frappe?.boot?.user?.roles || []
}

/**
 * Get current user info
 * @returns {Object}
 */
export const getCurrentUser = () => {
  return {
    name: window.frappe?.session?.user || 'Guest',
    email: window.frappe?.session?.user || '',
    fullName: window.frappe?.session?.user_fullname || window.frappe?.session?.user || '',
    roles: getCurrentUserRoles(),
    isAdmin: isAdministrator(),
    isProjectManager: isProjectManager()
  }
}

/**
 * Get permission info with detailed breakdown
 * @returns {Object}
 */
export const getPermissionInfo = () => {
  const user = getCurrentUser()
  return {
    user,
    canEdit: canEditProject() || canEditTask(),
    canEditProject: canEditProject(),
    canEditTask: canEditTask(),
    reason: !canEditProject() ? 'Only Administrator or Project Manager can edit' : null
  }
}
