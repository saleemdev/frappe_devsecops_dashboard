/**
 * Task Progression Utilities
 * Shared helper functions for task grouping, ordering, and status calculation
 * Used by both ProjectDetail and ProjectCard components
 */

/**
 * Strip HTML tags from text
 */
export const stripHtmlTags = (html) => {
  if (!html) return ''
  const temp = document.createElement('div')
  temp.innerHTML = html
  return temp.textContent || temp.innerText || ''
}

/**
 * Group tasks by Task Type and order chronologically
 * @param {Array} tasks - Array of task objects
 * @returns {Array} Array of grouped tasks with type, tasks array, and earliest date
 */
export const groupTasksByType = (tasks) => {
  if (!tasks || tasks.length === 0) return []

  // Group tasks by type
  const grouped = {}
  tasks.forEach(task => {
    const taskType = task.type || 'Uncategorized'
    if (!grouped[taskType]) {
      grouped[taskType] = []
    }
    grouped[taskType].push(task)
  })

  // Sort tasks within each group by creation date (oldest first)
  Object.keys(grouped).forEach(type => {
    grouped[type].sort((a, b) => {
      const dateA = new Date(a.creation || a.exp_start_date || 0)
      const dateB = new Date(b.creation || b.exp_start_date || 0)
      return dateA - dateB
    })
  })

  // Convert to array and sort by earliest task in each group
  const result = Object.entries(grouped).map(([type, typeTasks]) => {
    const earliestDate = Math.min(...typeTasks.map(t => new Date(t.creation || t.exp_start_date || 0).getTime()))
    return {
      type,
      tasks: typeTasks,
      earliestDate: new Date(earliestDate)
    }
  })

  // Sort groups by earliest task date
  result.sort((a, b) => a.earliestDate - b.earliestDate)

  return result
}

/**
 * Calculate task type completion status
 * @param {Array} tasks - Array of task objects for a specific type
 * @returns {Object} Status info with status, completed count, total count, and overdue flag
 */
export const getTaskTypeStatus = (tasks) => {
  if (!tasks || tasks.length === 0) return { status: 'wait', completed: 0, total: 0, hasOverdue: false }

  const completed = tasks.filter(t => t.status && (t.status.toLowerCase() === 'completed' || t.status.toLowerCase() === 'closed')).length
  const total = tasks.length
  const hasOverdue = tasks.some(t => {
    if (!t.exp_end_date) return false
    const dueDate = new Date(t.exp_end_date)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    dueDate.setHours(0, 0, 0, 0)
    return dueDate < today && t.status && t.status.toLowerCase() !== 'completed' && t.status.toLowerCase() !== 'closed'
  })

  let status = 'wait'
  if (hasOverdue) {
    status = 'error'
  } else if (completed === total) {
    status = 'finish'
  } else if (completed > 0) {
    status = 'process'
  }

  return { status, completed, total, hasOverdue }
}

/**
 * Get color for task type status
 * @param {string} status - Status value (wait, process, finish, error)
 * @param {boolean} hasOverdue - Whether the task type has overdue tasks
 * @returns {string} Hex color code
 */
export const getTaskTypeStatusColor = (status, hasOverdue) => {
  if (hasOverdue) return '#ff4d4f'  // error red
  switch (status) {
    case 'finish': return '#52c41a'  // success green
    case 'process': return '#1890ff'  // processing blue
    case 'error': return '#ff4d4f'  // error red
    default: return '#d9d9d9'  // default gray
  }
}

/**
 * Get status icon type for task type status
 * Returns the icon type name to be used by components
 * @param {string} status - Status value (wait, process, finish, error)
 * @param {boolean} hasOverdue - Whether the task type has overdue tasks
 * @returns {string} Icon type name (CheckCircleFilled, LoadingOutlined, ExclamationCircleOutlined, or null)
 */
export const getTaskTypeStatusIconType = (status, hasOverdue) => {
  if (hasOverdue) return 'ExclamationCircleOutlined'
  switch (status) {
    case 'finish': return 'CheckCircleFilled'
    case 'process': return 'LoadingOutlined'
    case 'error': return 'ExclamationCircleOutlined'
    default: return null
  }
}

/**
 * Calculate completion percentage for a task type
 * @param {number} completed - Number of completed tasks
 * @param {number} total - Total number of tasks
 * @returns {number} Completion percentage (0-100)
 */
export const calculateCompletionPercentage = (completed, total) => {
  if (total === 0) return 0
  return Math.round((completed / total) * 100)
}

/**
 * Get badge color based on completion percentage
 * @param {number} percentage - Completion percentage (0-100)
 * @returns {string} Ant Design color name
 */
export const getCompletionBadgeColor = (percentage) => {
  if (percentage === 100) return 'success'
  if (percentage >= 50) return 'processing'
  if (percentage > 0) return 'warning'
  return 'default'
}

