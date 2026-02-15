/**
 * Calendar Utilities for TOIL (Time Off In Lieu) Management
 * Handles timesheet-to-event transformations and date grouping for calendar view
 */

import dayjs from 'dayjs'

/**
 * Color mappings for TOIL status (consistent with toilColors.js)
 * Matches the color scheme used throughout the TOIL application
 */
export const TOIL_STATUS_COLORS = {
  'Draft': {
    tag: 'default',
    hex: '#d9d9d9',
    antd: 'colorTextSecondary'
  },
  'Pending Accrual': {
    tag: 'orange',
    hex: '#ff7a45',
    antd: 'colorWarning'
  },
  'Accrued': {
    tag: 'blue',
    hex: '#1890ff',
    antd: 'colorPrimary'
  },
  'Partially Used': {
    tag: 'cyan',
    hex: '#13c2c2',
    antd: 'colorInfo'
  },
  'Fully Used': {
    tag: 'green',
    hex: '#52c41a',
    antd: 'colorSuccess'
  },
  'Not Applicable': {
    tag: 'default',
    hex: '#d9d9d9',
    antd: 'colorTextSecondary'
  }
}

/**
 * Get TOIL status background color for calendar cells
 * @param {string} status - TOIL status string
 * @returns {string} Hex color code
 */
export const getStatusColor = (status) => {
  if (!status) return '#f0f0f0'
  return TOIL_STATUS_COLORS[status]?.hex || '#f0f0f0'
}

/**
 * Group timesheets by date (YYYY-MM-DD format)
 * Timesheets within each date are sorted by TOIL days (highest first)
 *
 * @param {Array} timesheets - Array of timesheet objects
 * @returns {Object} Object with date keys (YYYY-MM-DD) mapping to timesheet arrays
 */
export const groupTimesheetsByDate = (timesheets) => {
  const grouped = {}

  timesheets.forEach(timesheet => {
    // Use from_date as the primary date for calendar display
    const dateValue = timesheet.from_date || timesheet.fromDate
    if (!dateValue) return

    // Normalize to YYYY-MM-DD
    const dateKey = dayjs(dateValue).format('YYYY-MM-DD')

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }

    grouped[dateKey].push(timesheet)
  })

  // Sort timesheets within each date by TOIL days (highest first)
  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].sort((a, b) => {
      const toilDaysA = parseFloat(a.toil_days || a.toilDays || 0)
      const toilDaysB = parseFloat(b.toil_days || b.toilDays || 0)
      return toilDaysB - toilDaysA
    })
  })

  return grouped
}

/**
 * Get timesheets for a specific date
 * @param {Object} groupedTimesheets - Result from groupTimesheetsByDate()
 * @param {Date|string} date - Date to get timesheets for
 * @returns {Array} Array of timesheets for that date
 */
export const getDateTimesheets = (groupedTimesheets, date) => {
  const dateKey = dayjs(date).format('YYYY-MM-DD')
  return groupedTimesheets[dateKey] || []
}

/**
 * Format date for calendar display
 * @param {Date|string} date - Date to format
 * @param {string} format - dayjs format string (default: YYYY-MM-DD)
 * @returns {string} Formatted date string
 */
export const formatCalendarDate = (date, format = 'YYYY-MM-DD') => {
  return dayjs(date).format(format)
}

/**
 * Check if date has timesheets
 * @param {Object} groupedTimesheets - Result from groupTimesheetsByDate()
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date has timesheets
 */
export const hasTimesheets = (groupedTimesheets, date) => {
  const dateKey = dayjs(date).format('YYYY-MM-DD')
  return !!(groupedTimesheets[dateKey] && groupedTimesheets[dateKey].length > 0)
}

/**
 * Get timesheet count for a specific date
 * @param {Object} groupedTimesheets - Result from groupTimesheetsByDate()
 * @param {Date|string} date - Date to count timesheets for
 * @returns {number} Number of timesheets on that date
 */
export const getTimesheetCount = (groupedTimesheets, date) => {
  const timesheets = getDateTimesheets(groupedTimesheets, date)
  return timesheets.length
}

/**
 * Truncate employee name for calendar display
 * Prevents long names from overflowing calendar cells
 *
 * @param {string} name - Employee name
 * @param {number} maxLength - Maximum characters (default: 20)
 * @returns {string} Truncated name with ellipsis if needed
 */
export const truncateEmployeeName = (name, maxLength = 20) => {
  if (!name) return 'Unknown'
  if (name.length <= maxLength) return name
  return name.substring(0, maxLength) + '...'
}

/**
 * Format TOIL days for display
 * @param {number} days - TOIL days value
 * @returns {string} Formatted TOIL days string (e.g., "2.50 days")
 */
export const formatTOILDays = (days) => {
  const numDays = parseFloat(days || 0)
  return `${numDays.toFixed(2)} ${numDays === 1 ? 'day' : 'days'}`
}

/**
 * Format TOIL hours for display
 * @param {number} hours - TOIL hours value
 * @returns {string} Formatted TOIL hours string (e.g., "16.00 hrs")
 */
export const formatTOILHours = (hours) => {
  const numHours = parseFloat(hours || 0)
  return `${numHours.toFixed(2)} hrs`
}

/**
 * Get status priority for sorting
 * Used internally for sorting timesheets by status priority
 *
 * @param {string} status - Status string
 * @returns {number} Status priority (higher = more important)
 */
export const getStatusPriority = (status) => {
  const priorities = {
    'Pending Accrual': 5,
    'Accrued': 4,
    'Partially Used': 3,
    'Fully Used': 2,
    'Draft': 1,
    'Not Applicable': 0
  }
  return priorities[status] || 0
}
