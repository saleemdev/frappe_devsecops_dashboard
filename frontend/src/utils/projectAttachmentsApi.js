/**
 * Project Attachments and Comments API Utilities
 * Handles all API calls for file uploads, comments, and user search
 */

import { createApiClient } from '../services/api/config.js'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

// Extend dayjs with relativeTime plugin
dayjs.extend(relativeTime)

// Create API client instance
let apiClient = null

const getApiClient = async () => {
  if (!apiClient) {
    apiClient = await createApiClient()
  }
  return apiClient
}

/**
 * Get all files attached to a project
 */
export const getProjectFiles = async (projectName) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_files', {
      params: { project_name: projectName }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Delete a file attachment
 */
export const deleteProjectFile = async (fileName) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.delete_project_file', {
      file_name: fileName
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Upload a file to a project
 * Uses Frappe's native file upload endpoint
 */
export const uploadProjectFile = async (projectName, file) => {
  try {
    const api = await getApiClient()
    const formData = new FormData()
    formData.append('file', file)
    formData.append('doctype', 'Project')
    formData.append('docname', projectName)
    formData.append('fieldname', 'attachments')

    const response = await api.post('/api/method/frappe.client.upload_file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })

    // Frappe returns the File document directly
    // The response interceptor unwraps the message field
    // Check if we got a valid File document
    if (response.data && response.data.name) {
      return {
        success: true,
        file: response.data
      }
    }

    return {
      success: false,
      error: 'Invalid response from server'
    }
  } catch (error) {
    console.error('[uploadProjectFile] Error:', error)
    return {
      success: false,
      error: error?.message || error?.response?.data?.message || 'Failed to upload file'
    }
  }
}

/**
 * Get all comments for a project
 */
export const getProjectComments = async (projectName) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_comments', {
      params: { project_name: projectName }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Add a comment to a project
 */
export const addProjectComment = async (projectName, content) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.add_project_comment', {
      project_name: projectName,
      content: content
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Update an existing comment
 */
export const updateProjectComment = async (commentName, content) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.update_project_comment', {
      comment_name: commentName,
      content: content
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Delete a comment
 */
export const deleteProjectComment = async (commentName) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.delete_project_comment', {
      comment_name: commentName
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Search for users (for @ mentions)
 */
export const searchUsers = async (query) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.search_users', {
      params: { query: query }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Format file size for display
 */
export const formatFileSize = (bytes) => {
  if (!bytes) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i]
}

/**
 * Get file extension from filename
 */
export const getFileExtension = (filename) => {
  if (!filename) return ''
  return filename.split('.').pop().toLowerCase()
}

/**
 * Get file icon based on extension
 */
export const getFileIcon = (filename) => {
  const ext = getFileExtension(filename)
  const iconMap = {
    'pdf': '📄',
    'doc': '📝',
    'docx': '📝',
    'xls': '📊',
    'xlsx': '📊',
    'ppt': '🎯',
    'pptx': '🎯',
    'txt': '📄',
    'csv': '📊',
    'zip': '📦',
    'rar': '📦',
    'jpg': '🖼️',
    'jpeg': '🖼️',
    'png': '🖼️',
    'gif': '🖼️',
    'mp4': '🎬',
    'mp3': '🎵',
    'wav': '🎵'
  }
  return iconMap[ext] || '📎'
}

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
  if (!dateString) return 'Unknown'
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return 'Invalid date'
  }
}

/**
 * Format date with human-readable relative time
 * Example: "Jan 15, 2024 (2 months ago)" or "Mar 20, 2024 (in 1 month)"
 * Returns "Not set" for null/undefined/empty values
 */
export const formatDateWithRelativeTime = (dateString) => {
  // Handle null, undefined, empty string, and "None" values
  if (!dateString || dateString === 'None' || dateString === 'null') {
    return 'Not set'
  }

  try {
    const date = dayjs(dateString)

    // Check if date is valid
    if (!date.isValid()) {
      return 'Not set'
    }

    const formatted = date.format('MMM DD, YYYY')
    const relative = date.fromNow()

    return `${formatted} (${relative})`
  } catch (error) {
    console.error('[formatDateWithRelativeTime] Error formatting date:', dateString, error)
    return 'Not set'
  }
}

/**
 * Parse @ mentions from comment content
 * Returns array of mentioned user names
 */
export const parseMentions = (content) => {
  const mentionRegex = /@\[([^\]]+)\]\(user:([^)]+)\)/g
  const mentions = []
  let match

  while ((match = mentionRegex.exec(content)) !== null) {
    mentions.push({
      displayName: match[1],
      userName: match[2]
    })
  }

  return mentions
}

/**
 * Create mention markup for a user
 */
export const createMention = (userName, fullName) => {
  // Add null/undefined safety checks
  const safeUserName = userName || 'unknown'
  const safeFullName = fullName || userName || 'Unknown User'
  return `@[${safeFullName}](user:${safeUserName})`
}

/**
 * Replace mention markup with display text
 */
export const replaceMentions = (content) => {
  return content.replace(/@\[([^\]]+)\]\(user:([^)]+)\)/g, '@$1')
}

/**
 * Get project details
 * Note: Includes cache-busting parameter to ensure fresh data on each load
 */
export const getProjectDetails = async (projectName) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_details', {
      params: {
        project_name: projectName,
        _t: Date.now()  // Cache-busting parameter to force fresh data
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Get project users (manager and team members)
 * Note: Includes cache-busting parameter to ensure fresh data
 */
export const getProjectUsers = async (projectName) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_users', {
      params: {
        project_name: projectName,
        _t: Date.now()  // Cache-busting parameter
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Get project recent activity (comments)
 * Note: Includes cache-busting parameter to ensure fresh data
 */
export const getProjectRecentActivity = async (projectName, limit = 10) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_recent_activity', {
      params: {
        project_name: projectName,
        limit,
        _t: Date.now()  // Cache-busting parameter
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Get project milestones
 * Note: Includes cache-busting parameter to ensure fresh data
 */
export const getProjectMilestones = async (projectName) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_milestones', {
      params: {
        project_name: projectName,
        _t: Date.now()  // Cache-busting parameter
      }
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Get all available task types
 */
export const getTaskTypes = async () => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.dashboard.get_task_types')
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Create a new task for a project
 */
export const createProjectTask = async (projectName, taskData) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.create_project_task', {
      project_name: projectName,
      task_data: JSON.stringify(taskData)
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Update project details
 */
export const updateProject = async (projectName, projectData) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.update_project', {
      project_name: projectName,
      project_data: JSON.stringify(projectData)
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Add a user to a project
 */
export const addProjectUser = async (projectName, userId, userFields = null) => {
  try {
    const api = await getApiClient()
    const payload = {
      project_name: projectName,
      user_id: userId
    }
    if (userFields && typeof userFields === 'object') {
      // Send as JSON string to be explicit; backend can also accept dict
      payload.user_fields = JSON.stringify(userFields)
    }
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.add_project_user', payload)
    return response.data
  } catch (error) {
    throw error
  }
}

export const updateProjectUser = async (projectName, userId, userFields) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.update_project_user', {
      project_name: projectName,
      user_id: userId,
      user_fields: typeof userFields === 'object' ? JSON.stringify(userFields) : userFields
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Remove a user from a project
 */
export const removeProjectUser = async (projectName, userId) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.remove_project_user', {
      project_name: projectName,
      user_id: userId
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Update the project manager for a project
 */
export const updateProjectManager = async (projectName, userId) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.update_project_manager', {
      project_name: projectName,
      user_id: userId
    })
    return response.data
  } catch (error) {
    throw error
  }
}


/**
 * Get project task metrics
 */
export const getProjectMetrics = async (projectName) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_metrics', {
      project_name: projectName
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Update task status
 */
export const updateTaskStatus = async (taskName, status) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.update_task_status', {
      task_name: taskName,
      status: status
    })
    return response.data
  } catch (error) {
    throw error
  }
}

/**
 * Get all tasks for a project
 */
export const getProjectTasks = async (projectName) => {
  try {
    const api = await getApiClient()
    const response = await api.post('/api/method/frappe_devsecops_dashboard.api.dashboard.get_project_tasks', {
      project_name: projectName
    })
    return response.data
  } catch (error) {
    throw error
  }
}


/**
 * Get activity log for a Change Request
 */
export const getChangeRequestActivity = async (changeRequestName, limit = 10) => {
  try {
    const api = await getApiClient()
    const response = await api.get('/api/method/frappe_devsecops_dashboard.api.change_request.get_change_request_activity', {
      params: {
        change_request_name: changeRequestName,
        limit: limit,
        _t: Date.now()  // Cache-busting parameter
      }
    })
    return response.data
  } catch (error) {
    console.error('[getChangeRequestActivity] Error:', error)
    throw error
  }
}
