/**
 * Wiki API Service
 * Handles all wiki-related API calls using standard HTTP requests
 * Follows the same pattern as incidents, projects, and other services
 */

import { API_CONFIG, createApiClient } from '../services/api/config.js'

class WikiService {
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
   * Handle API errors consistently
   */
  handleError(error, defaultMessage) {
    console.error(defaultMessage, error)

    // Extract error message from Frappe response
    if (error.response?.data?.exc) {
      const exc = error.response.data.exc
      // Parse Frappe error message
      const match = exc.match(/frappe\.exceptions\.\w+: (.+)/)
      if (match) {
        throw new Error(match[1])
      }
    }

    if (error.response?.data?.message) {
      throw new Error(error.response.data.message)
    }

    if (error.message) {
      throw new Error(error.message)
    }

    throw new Error(defaultMessage)
  }

  /**
   * Get list of Wiki Spaces
   * @param {Object} filters - Filter conditions
   * @param {number} limitStart - Pagination start
   * @param {number} limitPageLength - Records per page
   * @returns {Promise<Array>} List of wiki spaces
   */
  async getWikiSpaces(filters = {}, limitStart = 0, limitPageLength = 20) {
    try {
      const client = await this.initClient()
      const response = await client.get(API_CONFIG.endpoints.wiki.spaces.list, {
        params: {
          filters: JSON.stringify(filters),
          limit_start: limitStart,
          limit_page_length: limitPageLength,
          _ts: Date.now() // cache buster to ensure fresh list after create
        }
      })

      // Response interceptor flattens `message` -> `data`
      return response.data || []
    } catch (error) {
      this.handleError(error, 'Failed to fetch wiki spaces')
    }
  }

  /**
   * Get list of Wiki Spaces with full documentation URLs
   * @param {Object} filters - Filter conditions
   * @param {number} limitStart - Pagination start
   * @param {number} limitPageLength - Records per page
   * @returns {Promise<Array>} List of wiki spaces with doc_url and public_url fields
   */
  async getWikiSpacesWithLinks(filters = {}, limitStart = 0, limitPageLength = 20) {
    try {
      const client = await this.initClient()
      const response = await client.get('/api/method/frappe_devsecops_dashboard.api.wiki.get_wiki_spaces_with_links', {
        params: {
          filters: JSON.stringify(filters),
          limit_start: limitStart,
          limit_page_length: limitPageLength,
          _ts: Date.now()
        }
      })

      return response.data || []
    } catch (error) {
      this.handleError(error, 'Failed to fetch wiki spaces with links')
    }
  }

  /**
   * Get a specific Wiki Space
   * @param {string} spaceName - Name of the wiki space
   * @returns {Promise<Object>} Wiki space document
   */
  async getWikiSpace(spaceName) {
    try {
      const client = await this.initClient()
      const response = await client.get(API_CONFIG.endpoints.wiki.spaces.detail, {
        params: {
          space_name: spaceName
        }
      })

      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to fetch wiki space')
    }
  }

  /**
   * Get Wiki Pages in a specific Space
   * @param {string} spaceName - Name of the wiki space
   * @param {number} limitStart - Pagination start
   * @param {number} limitPageLength - Records per page
   * @returns {Promise<Array>} List of wiki pages in the space
   */
  async getWikiPagesForSpace(spaceName, limitStart = 0, limitPageLength = 20) {
    try {
      const client = await this.initClient()
      const response = await client.get(API_CONFIG.endpoints.wiki.pages.list, {
        params: {
          space_name: spaceName,
          limit_start: limitStart,
          limit_page_length: limitPageLength
        }
      })

      return response.data || []
    } catch (error) {
      this.handleError(error, 'Failed to fetch wiki pages')
    }
  }

  /**
   * Get Wiki Pages linked to a Project
   * @param {string} projectName - Name of the project
   * @param {number} limitStart - Pagination start
   * @param {number} limitPageLength - Records per page
   * @returns {Promise<Array>} List of wiki pages
   */
  async getWikiPagesForProject(projectName, limitStart = 0, limitPageLength = 20) {
    try {
      const client = await this.initClient()
      const response = await client.get(API_CONFIG.endpoints.wiki.pages.listByProject, {
        params: {
          project_name: projectName,
          limit_start: limitStart,
          limit_page_length: limitPageLength
        }
      })

      return response.data || []
    } catch (error) {
      this.handleError(error, 'Failed to fetch wiki pages')
    }
  }

  /**
   * Get a specific Wiki Page
   * @param {string} pageName - Name of the wiki page
   * @returns {Promise<Object>} Wiki page document
   */
  async getWikiPage(pageName) {
    try {
      const client = await this.initClient()
      const response = await client.get(API_CONFIG.endpoints.wiki.pages.detail, {
        params: {
          page_name: pageName
        }
      })

      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to fetch wiki page')
    }
  }

  /**
   * Create a new Wiki Page
   * @param {Object} pageData - Page data (title, content, route, wikiSpace, projectName, published)
   * @returns {Promise<Object>} Created wiki page document
   */
  async createWikiPage(pageData) {
    try {
      const client = await this.initClient()
      const response = await client.post(API_CONFIG.endpoints.wiki.pages.create, {
        title: pageData.title,
        content: pageData.content || '',
        route: pageData.route,
        wiki_space: pageData.wikiSpace || null,
        project_name: pageData.projectName || null,
        published: pageData.published ? 1 : 0
      })

      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to create wiki page')
    }
  }

  /**
   * Update a Wiki Page
   * @param {string} pageName - Name of the wiki page
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated wiki page document
   */
  async updateWikiPage(pageName, updates) {
    try {
      const client = await this.initClient()
      const response = await client.post(API_CONFIG.endpoints.wiki.pages.update, {
        page_name: pageName,
        updates
      })

      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to update wiki page')
    }
  }

  /**
   * Publish a draft Wiki Page
   * @param {string} pageName - Name of the wiki page
   * @returns {Promise<Object>} Success message with updated page
   */
  async publishWikiPage(pageName) {
    try {
      const client = await this.initClient()
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.wiki.publish_wiki_page', {
        page_name: pageName
      })
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to publish wiki page')
    }
  }

  /**
   * Unpublish a Wiki Page (mark as draft)
   * @param {string} pageName - Name of the wiki page
   * @returns {Promise<Object>} Success message with updated page
   */
  async unpublishWikiPage(pageName) {
    try {
      const client = await this.initClient()
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.wiki.unpublish_wiki_page', {
        page_name: pageName
      })
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to unpublish wiki page')
    }
  }

  /**
   * Toggle guest access for a Wiki Page
   * @param {string} pageName - Name of the wiki page
   * @param {boolean} allowGuest - True to enable, false to disable
   * @returns {Promise<Object>} Success message with updated page
   */
  async toggleGuestAccess(pageName, allowGuest) {
    try {
      const client = await this.initClient()
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.wiki.toggle_guest_access', {
        page_name: pageName,
        allow_guest: allowGuest ? 1 : 0
      })
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to toggle guest access')
    }
  }

  /**
   * Move a Wiki Page to a different Wiki Space
   * @param {string} pageName - Name of the wiki page
   * @param {string} newWikiSpace - Name of destination wiki space
   * @returns {Promise<Object>} Success message with updated page
   */
  async moveWikiPage(pageName, newWikiSpace) {
    try {
      const client = await this.initClient()
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.wiki.move_wiki_page', {
        page_name: pageName,
        new_wiki_space: newWikiSpace
      })
      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to move wiki page')
    }
  }

  /**
   * Delete a Wiki Page
   * @param {string} pageName - Name of the wiki page
   * @returns {Promise<void>}
   */
  async deleteWikiPage(pageName) {
    try {
      const client = await this.initClient()
      await client.post(API_CONFIG.endpoints.wiki.pages.delete, {
        page_name: pageName
      })
    } catch (error) {
      this.handleError(error, 'Failed to delete wiki page')
    }
  }

  /**
   * Create a new Wiki Space
   * @param {Object} spaceData - Space data (name, route, description)
   * @returns {Promise<Object>} Created wiki space document
   */
  async createWikiSpace(spaceData) {
    try {
      const client = await this.initClient()
      console.log('WikiService: Creating wiki space with data:', spaceData)
      console.log('WikiService: Using endpoint:', API_CONFIG.endpoints.wiki.spaces.create)

      const response = await client.post(API_CONFIG.endpoints.wiki.spaces.create, {
        name: spaceData.name,
        route: spaceData.route,
        description: spaceData.description || null
      })

      console.log('WikiService: Raw response:', response)
      console.log('WikiService: Response data:', response.data)
      // Interceptor flattens message; keep for reference
      // console.log('WikiService: Response message:', response.data.message)

      return response.data
    } catch (error) {
      console.error('WikiService: Error creating wiki space:', error)
      this.handleError(error, 'Failed to create wiki space')
    }
  }

  /**
   * Update a Wiki Space
   * @param {string} spaceName - Name of the wiki space
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated wiki space document
   */
  async updateWikiSpace(spaceName, updates) {
    try {
      const client = await this.initClient()
      const response = await client.post(API_CONFIG.endpoints.wiki.spaces.update, {
        name: spaceName,
        updates
      })

      return response.data
    } catch (error) {
      this.handleError(error, 'Failed to update wiki space')
    }
  }

  /**
   * Delete a Wiki Space
   * @param {string} spaceName - Name of the wiki space
   * @returns {Promise<void>}
   */
  async deleteWikiSpace(spaceName) {
    try {
      const client = await this.initClient()
      await client.post(API_CONFIG.endpoints.wiki.spaces.delete, {
        name: spaceName
      })
    } catch (error) {
      this.handleError(error, 'Failed to delete wiki space')
    }
  }

  /**
   * Get Wiki Space sidebar items with current ordering
   * @param {string} spaceName - Name of the wiki space
   * @returns {Promise<Array>} List of sidebar items ordered by idx
   */
  async getWikiSpaceSidebar(spaceName) {
    try {
      const client = await this.initClient()
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.wiki.get_wiki_space_sidebar', {
        space_name: spaceName
      })
      return response.data.message || []
    } catch (error) {
      this.handleError(error, 'Failed to fetch wiki space sidebar')
    }
  }

  /**
   * Update Wiki Space sidebar ordering and settings
   * @param {string} spaceName - Name of the wiki space
   * @param {Array} sidebarItems - List of sidebar items with updated idx values
   * @returns {Promise<Object>} Updated sidebar
   */
  async updateWikiSpaceSidebar(spaceName, sidebarItems) {
    try {
      const client = await this.initClient()
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.wiki.update_wiki_space_sidebar', {
        space_name: spaceName,
        sidebar_items: JSON.stringify(sidebarItems)
      })
      return response.data.message
    } catch (error) {
      this.handleError(error, 'Failed to update wiki space sidebar')
    }
  }

  /**
   * Add a Wiki Page to a Wiki Space's sidebar
   * @param {string} spaceName - Name of the wiki space
   * @param {string} pageName - Name of the wiki page to add
   * @param {string} parentLabel - Optional custom label (defaults to page title)
   * @returns {Promise<Object>} Updated sidebar
   */
  async addPageToSidebar(spaceName, pageName, parentLabel = null) {
    try {
      const client = await this.initClient()
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.wiki.add_page_to_sidebar', {
        space_name: spaceName,
        page_name: pageName,
        parent_label: parentLabel
      })
      return response.data.message
    } catch (error) {
      this.handleError(error, 'Failed to add page to sidebar')
    }
  }
}

// Create singleton instance
const wikiService = new WikiService()

// Export methods as standalone functions for backward compatibility
export const getWikiSpaces = (filters, limitStart, limitPageLength) =>
  wikiService.getWikiSpaces(filters, limitStart, limitPageLength)

export const getWikiSpacesWithLinks = (filters, limitStart, limitPageLength) =>
  wikiService.getWikiSpacesWithLinks(filters, limitStart, limitPageLength)

export const getWikiSpace = (spaceName) =>
  wikiService.getWikiSpace(spaceName)

export const getWikiPagesForSpace = (spaceName, limitStart, limitPageLength) =>
  wikiService.getWikiPagesForSpace(spaceName, limitStart, limitPageLength)

export const getWikiPagesForProject = (projectName, limitStart, limitPageLength) =>
  wikiService.getWikiPagesForProject(projectName, limitStart, limitPageLength)

export const getWikiPage = (pageName) =>
  wikiService.getWikiPage(pageName)

export const createWikiPage = (pageData) =>
  wikiService.createWikiPage(pageData)

export const updateWikiPage = (pageName, updates) =>
  wikiService.updateWikiPage(pageName, updates)

export const publishWikiPage = (pageName) =>
  wikiService.publishWikiPage(pageName)

export const unpublishWikiPage = (pageName) =>
  wikiService.unpublishWikiPage(pageName)

export const toggleGuestAccess = (pageName, allowGuest) =>
  wikiService.toggleGuestAccess(pageName, allowGuest)

export const moveWikiPage = (pageName, newWikiSpace) =>
  wikiService.moveWikiPage(pageName, newWikiSpace)

export const deleteWikiPage = (pageName) =>
  wikiService.deleteWikiPage(pageName)

export const createWikiSpace = (spaceData) =>
  wikiService.createWikiSpace(spaceData)

export const updateWikiSpace = (spaceName, updates) =>
  wikiService.updateWikiSpace(spaceName, updates)

export const deleteWikiSpace = (spaceName) =>
  wikiService.deleteWikiSpace(spaceName)

export const getWikiSpaceSidebar = (spaceName) =>
  wikiService.getWikiSpaceSidebar(spaceName)

export const updateWikiSpaceSidebar = (spaceName, sidebarItems) =>
  wikiService.updateWikiSpaceSidebar(spaceName, sidebarItems)

export const addPageToSidebar = (spaceName, pageName, parentLabel) =>
  wikiService.addPageToSidebar(spaceName, pageName, parentLabel)

export default wikiService

