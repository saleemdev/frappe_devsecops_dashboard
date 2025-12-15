/**
 * Wiki API Module
 * Provides methods to interact with Wiki Spaces and Wiki Pages
 */

import { message } from 'antd'

/**
 * Get frappe instance safely
 * Frappe is available globally in Frappe framework
 */
const getFrappe = () => {
  if (!window.frappe) {
    throw new Error('Frappe framework is not loaded')
  }
  return window.frappe
}

/**
 * Get list of Wiki Spaces
 * @param {Object} filters - Filter conditions
 * @param {number} limitStart - Pagination start
 * @param {number} limitPageLength - Records per page
 * @returns {Promise<Array>} List of wiki spaces
 */
export const getWikiSpaces = async (filters = {}, limitStart = 0, limitPageLength = 20) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.get_wiki_spaces',
      args: {
        filters,
        limit_start: limitStart,
        limit_page_length: limitPageLength
      }
    })
    return response.message || []
  } catch (error) {
    console.error('Error fetching wiki spaces:', error)
    message.error('Failed to fetch wiki spaces')
    throw error
  }
}

/**
 * Get a specific Wiki Space
 * @param {string} spaceName - Name of the wiki space
 * @returns {Promise<Object>} Wiki space document
 */
export const getWikiSpace = async (spaceName) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.get_wiki_space',
      args: { space_name: spaceName }
    })
    return response.message
  } catch (error) {
    console.error('Error fetching wiki space:', error)
    message.error('Failed to fetch wiki space')
    throw error
  }
}

/**
 * Get Wiki Pages in a specific Space
 * @param {string} spaceName - Name of the wiki space
 * @param {number} limitStart - Pagination start
 * @param {number} limitPageLength - Records per page
 * @returns {Promise<Array>} List of wiki pages in the space
 */
export const getWikiPagesForSpace = async (spaceName, limitStart = 0, limitPageLength = 20) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.get_wiki_pages_for_space',
      args: {
        space_name: spaceName,
        limit_start: limitStart,
        limit_page_length: limitPageLength
      }
    })
    return response.message || []
  } catch (error) {
    console.error('Error fetching wiki pages for space:', error)
    message.error('Failed to fetch wiki pages')
    throw error
  }
}

/**
 * Get Wiki Pages linked to a Project
 * @param {string} projectName - Name of the project
 * @param {number} limitStart - Pagination start
 * @param {number} limitPageLength - Records per page
 * @returns {Promise<Array>} List of wiki pages
 */
export const getWikiPagesForProject = async (projectName, limitStart = 0, limitPageLength = 20) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.get_wiki_pages_for_project',
      args: {
        project_name: projectName,
        limit_start: limitStart,
        limit_page_length: limitPageLength
      }
    })
    return response.message || []
  } catch (error) {
    console.error('Error fetching wiki pages for project:', error)
    message.error('Failed to fetch wiki pages')
    throw error
  }
}

/**
 * Get a specific Wiki Page
 * @param {string} pageName - Name of the wiki page
 * @returns {Promise<Object>} Wiki page document
 */
export const getWikiPage = async (pageName) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.get_wiki_page',
      args: { page_name: pageName }
    })
    return response.message
  } catch (error) {
    console.error('Error fetching wiki page:', error)
    message.error('Failed to fetch wiki page')
    throw error
  }
}

/**
 * Create a new Wiki Page
 * @param {Object} pageData - Page data (title, content, route, wikiSpace, projectName, published)
 * @returns {Promise<Object>} Created wiki page document
 */
export const createWikiPage = async (pageData) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.create_wiki_page',
      args: {
        title: pageData.title,
        content: pageData.content || '',
        route: pageData.route,
        wiki_space: pageData.wikiSpace || null,
        project_name: pageData.projectName || null,
        published: pageData.published ? 1 : 0
      }
    })
    message.success('Wiki page created successfully')
    return response.message
  } catch (error) {
    console.error('Error creating wiki page:', error)
    message.error('Failed to create wiki page')
    throw error
  }
}

/**
 * Update a Wiki Page
 * @param {string} pageName - Name of the wiki page
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated wiki page document
 */
export const updateWikiPage = async (pageName, updates) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe.client.set_value',
      args: {
        doctype: 'Wiki Page',
        name: pageName,
        fieldname: updates
      }
    })
    message.success('Wiki page updated successfully')
    return response.message
  } catch (error) {
    console.error('Error updating wiki page:', error)
    message.error('Failed to update wiki page')
    throw error
  }
}

/**
 * Delete a Wiki Page
 * @param {string} pageName - Name of the wiki page
 * @returns {Promise<void>}
 */
export const deleteWikiPage = async (pageName) => {
  try {
    const frappe = getFrappe()
    await frappe.call({
      method: 'frappe.client.delete',
      args: {
        doctype: 'Wiki Page',
        name: pageName
      }
    })
    message.success('Wiki page deleted successfully')
  } catch (error) {
    console.error('Error deleting wiki page:', error)
    message.error('Failed to delete wiki page')
    throw error
  }
}

/**
 * Create a new Wiki Space
 * @param {Object} spaceData - Space data (name, route, description)
 * @returns {Promise<Object>} Created wiki space document
 */
export const createWikiSpace = async (spaceData) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.create_wiki_space',
      args: {
        name: spaceData.name,
        route: spaceData.route,
        description: spaceData.description || null
      }
    })
    message.success('Wiki space created successfully')
    return response.message
  } catch (error) {
    console.error('Error creating wiki space:', error)
    message.error('Failed to create wiki space')
    throw error
  }
}

/**
 * Update a Wiki Space
 * @param {string} spaceName - Name of the wiki space
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated wiki space document
 */
export const updateWikiSpace = async (spaceName, updates) => {
  try {
    const frappe = getFrappe()
    const response = await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.update_wiki_space',
      args: {
        name: spaceName,
        updates
      }
    })
    message.success('Wiki space updated successfully')
    return response.message
  } catch (error) {
    console.error('Error updating wiki space:', error)
    message.error('Failed to update wiki space')
    throw error
  }
}

/**
 * Delete a Wiki Space
 * @param {string} spaceName - Name of the wiki space
 * @returns {Promise<void>}
 */
export const deleteWikiSpace = async (spaceName) => {
  try {
    const frappe = getFrappe()
    await frappe.call({
      method: 'frappe_devsecops_dashboard.api.wiki.delete_wiki_space',
      args: {
        name: spaceName
      }
    })
    message.success('Wiki space deleted successfully')
  } catch (error) {
    console.error('Error deleting wiki space:', error)
    message.error('Failed to delete wiki space')
    throw error
  }
}

