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
            'Accept': 'application/json'
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
   * @param {string} doctype - The DocType name
   * @returns {Promise<boolean>} - True if user has write permission
   */
  async hasWritePermission(doctype) {
    const permissions = await this.getUserPermissions(doctype)
    const hasWrite = permissions.write === true || permissions.write === 1
    console.log(`[RBAC DEBUG] hasWritePermission(${doctype}): write=${permissions.write}, result=${hasWrite}`)
    return hasWrite
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

