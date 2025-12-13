/**
 * Permissions Service
 * Handles fetching and caching user permissions from Frappe backend
 */

import { API_CONFIG } from './config.js'

class PermissionsService {
  constructor() {
    this.permissionsCache = new Map()
    this.cacheExpiry = 5 * 60 * 1000 // 5 minutes cache expiry
  }

  /**
   * Get user permissions for a specific DocType
   * @param {string} doctype - The DocType name (e.g., 'Change Request', 'Project')
   * @returns {Promise<Object>} - Permissions object with read, write, create, delete flags
   */
  async getUserPermissions(doctype) {
    try {
      // Check cache first
      const cached = this.permissionsCache.get(doctype)
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        console.log(`[RBAC DEBUG] Using cached permissions for ${doctype}:`, cached.data)
        return cached.data
      }

      console.log(`[RBAC DEBUG] Fetching permissions for ${doctype}...`)

      // Fetch from custom Frappe API endpoint
      const response = await fetch(
        `/api/method/frappe_devsecops_dashboard.api.change_request.get_doctype_permissions?doctype=${encodeURIComponent(doctype)}`,
        {
          credentials: 'include',
          headers: {
            'Accept': 'application/json',
            // SECURITY: Include CSRF token for consistency (GET requests don't require it, but good practice)
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          }
        }
      )

      console.log(`[RBAC DEBUG] API Response status for ${doctype}:`, response.status, response.statusText)

      if (!response.ok) {
        console.error(`[RBAC DEBUG] Failed to fetch permissions for ${doctype}:`, response.statusText)
        return this.getDefaultPermissions()
      }

      const data = await response.json()
      console.log(`[RBAC DEBUG] Raw API response for ${doctype}:`, data)

      // Handle both response formats:
      // 1. New format: {message: {success: true, permissions: {...}}}
      // 2. Old format: {message: {...}}
      let permissions = this.getDefaultPermissions()

      if (data.message) {
        if (data.message.permissions) {
          // New format with permissions object
          permissions = data.message.permissions
        } else if (typeof data.message === 'object') {
          // Old format or direct permissions object
          permissions = data.message
        }
      }

      console.log(`[RBAC DEBUG] Parsed permissions for ${doctype}:`, permissions)

      // Cache the result
      this.permissionsCache.set(doctype, {
        data: permissions,
        timestamp: Date.now()
      })

      return permissions
    } catch (error) {
      console.error(`[RBAC DEBUG] Error fetching permissions for ${doctype}:`, error)
      return this.getDefaultPermissions()
    }
  }

  /**
   * Check if user has write permission for a DocType
   * For Project and Task doctypes: Administrator user OR user with write permission
   * @param {string} doctype - The DocType name
   * @returns {Promise<boolean>} - True if user has write permission
   */
  async hasWritePermission(doctype) {
    // Special handling for Project and Task doctypes
    if (doctype === 'Project' || doctype === 'Task') {
      // Administrator user always has write permission
      if (window.frappe?.session?.user === 'Administrator') {
        console.log(`[RBAC DEBUG] hasWritePermission(${doctype}): Administrator user - granting access`)
        return true
      }

      // Check standard Frappe permissions
      const permissions = await this.getUserPermissions(doctype)
      const hasWrite = permissions.write === true || permissions.write === 1
      console.log(`[RBAC DEBUG] hasWritePermission(${doctype}): write=${permissions.write}, result=${hasWrite}`)
      return hasWrite
    }

    // For other doctypes, use standard permission check
    const permissions = await this.getUserPermissions(doctype)
    const hasWrite = permissions.write === true || permissions.write === 1
    console.log(`[RBAC DEBUG] hasWritePermission(${doctype}): write=${permissions.write}, result=${hasWrite}`)
    return hasWrite
  }

  /**
   * Check if user can edit Project or Task (synchronous check)
   * Returns true if user is Administrator OR has write permission in cached permissions
   * Note: This is a synchronous check and may not reflect latest permissions
   * Use hasWritePermission() for authoritative async permission check
   * @returns {boolean}
   */
  canEditProjectOrTask() {
    // Administrator user always has write permission
    if (window.frappe?.session?.user === 'Administrator') {
      console.log('[RBAC DEBUG] canEditProjectOrTask: Administrator user - returning true')
      return true
    }

    // Check cached permissions (synchronous, best-effort)
    const projectPerms = this.permissionsCache.get('Project')
    const hasProjectWrite = projectPerms && (projectPerms.write === true || projectPerms.write === 1)

    console.log(`[RBAC DEBUG] canEditProjectOrTask: user=${window.frappe?.session?.user}, hasProjectWrite=${hasProjectWrite}`)

    return hasProjectWrite || false
  }

  /**
   * Check if user has read permission for a DocType
   * @param {string} doctype - The DocType name
   * @returns {Promise<boolean>} - True if user has read permission
   */
  async hasReadPermission(doctype) {
    const permissions = await this.getUserPermissions(doctype)
    return permissions.read === true || permissions.read === 1
  }

  /**
   * Check if user has create permission for a DocType
   * @param {string} doctype - The DocType name
   * @returns {Promise<boolean>} - True if user has create permission
   */
  async hasCreatePermission(doctype) {
    const permissions = await this.getUserPermissions(doctype)
    return permissions.create === true || permissions.create === 1
  }

  /**
   * Check if user has delete permission for a DocType
   * @param {string} doctype - The DocType name
   * @returns {Promise<boolean>} - True if user has delete permission
   */
  async hasDeletePermission(doctype) {
    const permissions = await this.getUserPermissions(doctype)
    return permissions.delete === true || permissions.delete === 1
  }

  /**
   * Get default permissions (no permissions)
   * @returns {Object} - Default permissions object
   */
  getDefaultPermissions() {
    return {
      read: false,
      write: false,
      create: false,
      delete: false,
      submit: false,
      amend: false,
      cancel: false,
      print: false,
      email: false,
      report: false,
      export: false,
      import: false,
      share: false
    }
  }

  /**
   * Clear permissions cache
   */
  clearCache() {
    this.permissionsCache.clear()
  }

  /**
   * Clear cache for specific DocType
   * @param {string} doctype - The DocType name
   */
  clearCacheForDoctype(doctype) {
    this.permissionsCache.delete(doctype)
  }
}

// Export singleton instance
const permissionsService = new PermissionsService()

export default permissionsService

