/**
 * Calendar Utilities for Incident Management
 * Handles incident-to-event transformations and date grouping for calendar view
 */

import dayjs from 'dayjs'

/**
 * Color mappings for severity levels
 * Matches the color scheme used throughout the application
 */
export const SEVERITY_COLORS = {
  'S1 - Critical': '#ff4d4f',
  'Critical': '#ff4d4f',
  'S2 - High': '#ff7a45',
  'High': '#ff7a45',
  'S3 - Medium': '#ffc53d',
  'Medium': '#ffc53d',
  'S4 - Low': '#52c41a',
  'Low': '#52c41a'
}

/**
 * Color mappings for status (used as border colors)
 * Different colors indicate workflow state
 */
export const STATUS_BORDER_COLORS = {
  'Open': '#ff4d4f',
  'New': '#ff4d4f',
  'In Progress': '#1890ff',
  'Acknowledged': '#1890ff',
  'Pending Customer': '#faad14',
  'Pending Third Party': '#faad14',
  'Resolved': '#52c41a',
  'Closed': '#52c41a',
  'Reopened': '#ff7a45',
  'Cancelled': '#8c8c8c'
}

/**
 * Get severity background color for calendar cells
 * @param {string} severity - Severity level string
 * @returns {string} Hex color code
 */
export const getSeverityColor = (severity) => {
  if (!severity) return '#f0f0f0'

  const severityStr = severity.toLowerCase()
  if (severityStr.includes('critical') || severityStr.includes('s1')) return SEVERITY_COLORS.Critical
  if (severityStr.includes('high') || severityStr.includes('s2')) return SEVERITY_COLORS.High
  if (severityStr.includes('medium') || severityStr.includes('s3')) return SEVERITY_COLORS.Medium
  if (severityStr.includes('low') || severityStr.includes('s4')) return SEVERITY_COLORS.Low

  return '#f0f0f0'
}

/**
 * Get status border color
 * @param {string} status - Status string
 * @returns {string} Hex color code
 */
export const getStatusBorderColor = (status) => {
  return STATUS_BORDER_COLORS[status] || '#d9d9d9'
}

/**
 * Group incidents by date (YYYY-MM-DD format)
 * Incidents within each date are sorted by severity (critical first)
 *
 * @param {Array} incidents - Array of incident objects
 * @returns {Object} Object with date keys (YYYY-MM-DD) mapping to incident arrays
 */
export const groupIncidentsByDate = (incidents) => {
  const grouped = {}

  incidents.forEach(incident => {
    // Handle multiple date field formats (snake_case and camelCase)
    const dateValue = incident.reported_date || incident.reportedDate || incident.creation
    if (!dateValue) return

    // Normalize to YYYY-MM-DD
    const dateKey = dayjs(dateValue).format('YYYY-MM-DD')

    if (!grouped[dateKey]) {
      grouped[dateKey] = []
    }

    grouped[dateKey].push(incident)
  })

  // Sort incidents within each date by severity (critical first)
  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].sort((a, b) => {
      const getSeverityLevel = (severity) => {
        if (!severity) return 0
        const s = severity.toLowerCase()
        if (s.includes('critical') || s.includes('s1')) return 4
        if (s.includes('high') || s.includes('s2')) return 3
        if (s.includes('medium') || s.includes('s3')) return 2
        if (s.includes('low') || s.includes('s4')) return 1
        return 0
      }
      return getSeverityLevel(b.severity) - getSeverityLevel(a.severity)
    })
  })

  return grouped
}

/**
 * Get incidents for a specific date
 * @param {Object} groupedIncidents - Result from groupIncidentsByDate()
 * @param {Date|string} date - Date to get incidents for
 * @returns {Array} Array of incidents for that date
 */
export const getDateIncidents = (groupedIncidents, date) => {
  const dateKey = dayjs(date).format('YYYY-MM-DD')
  return groupedIncidents[dateKey] || []
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
 * Check if date has incidents
 * @param {Object} groupedIncidents - Result from groupIncidentsByDate()
 * @param {Date|string} date - Date to check
 * @returns {boolean} True if date has incidents
 */
export const hasIncidents = (groupedIncidents, date) => {
  const dateKey = dayjs(date).format('YYYY-MM-DD')
  return !!(groupedIncidents[dateKey] && groupedIncidents[dateKey].length > 0)
}

/**
 * Get incident count for a specific date
 * @param {Object} groupedIncidents - Result from groupIncidentsByDate()
 * @param {Date|string} date - Date to count incidents for
 * @returns {number} Number of incidents on that date
 */
export const getIncidentCount = (groupedIncidents, date) => {
  const incidents = getDateIncidents(groupedIncidents, date)
  return incidents.length
}

/**
 * Truncate incident title for calendar display
 * Prevents long titles from overflowing calendar cells
 *
 * @param {string} title - Incident title
 * @param {number} maxLength - Maximum characters (default: 30)
 * @returns {string} Truncated title with ellipsis if needed
 */
export const truncateTitle = (title, maxLength = 30) => {
  if (!title) return 'Untitled Incident'
  if (title.length <= maxLength) return title
  return title.substring(0, maxLength) + '...'
}

/**
 * Get severity level as numeric value for sorting
 * Used internally for sorting incidents by severity
 *
 * @param {string} severity - Severity string
 * @returns {number} Severity level (0-4, where 4 is critical)
 */
export const getSeverityLevel = (severity) => {
  if (!severity) return 0
  const s = severity.toLowerCase()
  if (s.includes('critical') || s.includes('s1')) return 4
  if (s.includes('high') || s.includes('s2')) return 3
  if (s.includes('medium') || s.includes('s3')) return 2
  if (s.includes('low') || s.includes('s4')) return 1
  return 0
}
