/**
 * TOIL Utility Functions
 * Helper functions for TOIL calculations and validations
 */

/**
 * Calculate TOIL days from hours
 * Standard conversion: 8 hours = 1 day
 * @param {number} hours - Total TOIL hours
 * @returns {number} TOIL days (rounded to 3 decimal places)
 */
export const calculateTOILDays = (hours) => {
  if (!hours || hours <= 0) return 0
  return parseFloat((hours / 8).toFixed(3))
}

/**
 * Check if TOIL allocation is expiring soon (within 30 days)
 * @param {string|Date} toDate - Expiry date of TOIL allocation
 * @returns {boolean} True if expiring within 30 days
 */
export const isExpiringSoon = (toDate) => {
  if (!toDate) return false

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Reset time to start of day

  const expiry = new Date(toDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  return diffDays <= 30 && diffDays > 0
}

/**
 * Check if current user can approve timesheet
 * This is for UI hints only - actual permission check is done on backend
 * @param {object} timesheet - Timesheet object
 * @param {object} currentUser - Current user object
 * @returns {boolean} True if user might be able to approve
 */
export const canApproveTimesheet = (timesheet, currentUser) => {
  if (!timesheet) return false

  // Only pending timesheets can be approved
  if (timesheet.toil_status !== 'Pending Accrual') return false

  // Can't approve own timesheet
  if (timesheet.employee === currentUser?.employee) return false

  // Final check is done on backend
  return true
}

/**
 * Format TOIL days for display
 * @param {number} days - TOIL days
 * @param {number} precision - Decimal places (default: 2)
 * @returns {string} Formatted string (e.g., "2.50 days")
 */
export const formatTOILDays = (days, precision = 2) => {
  if (!days || days === 0) return '0.00 days'
  return `${Number(days).toFixed(precision)} ${days === 1 ? 'day' : 'days'}`
}

/**
 * Format TOIL hours for display
 * @param {number} hours - TOIL hours
 * @param {number} precision - Decimal places (default: 2)
 * @returns {string} Formatted string (e.g., "16.00 hours")
 */
export const formatTOILHours = (hours, precision = 2) => {
  if (!hours || hours === 0) return '0.00 hours'
  return `${Number(hours).toFixed(precision)} ${hours === 1 ? 'hour' : 'hours'}`
}

/**
 * Calculate days until expiry
 * @param {string|Date} toDate - Expiry date
 * @returns {number} Days until expiry (negative if expired)
 */
export const daysUntilExpiry = (toDate) => {
  if (!toDate) return 0

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const expiry = new Date(toDate)
  expiry.setHours(0, 0, 0, 0)

  const diffTime = expiry.getTime() - today.getTime()
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

/**
 * Check if TOIL allocation is expired
 * @param {string|Date} toDate - Expiry date
 * @returns {boolean} True if expired
 */
export const isExpired = (toDate) => {
  return daysUntilExpiry(toDate) < 0
}

/**
 * Get expiry status and warning level
 * @param {string|Date} toDate - Expiry date
 * @returns {object} { status: 'expired' | 'expiring' | 'valid', level: 'error' | 'warning' | 'success', days: number }
 */
export const getExpiryStatus = (toDate) => {
  const days = daysUntilExpiry(toDate)

  if (days < 0) {
    return { status: 'expired', level: 'error', days: Math.abs(days) }
  } else if (days <= 30) {
    return { status: 'expiring', level: 'warning', days }
  } else {
    return { status: 'valid', level: 'success', days }
  }
}

/**
 * Validate timesheet status for approval
 * @param {object} timesheet - Timesheet object
 * @returns {object} { valid: boolean, reason: string }
 */
export const validateTimesheetForApproval = (timesheet) => {
  if (!timesheet) {
    return { valid: false, reason: 'Timesheet not found' }
  }

  if (timesheet.docstatus !== 0) {
    return { valid: false, reason: 'Timesheet is already submitted or cancelled' }
  }

  if (!timesheet.total_toil_hours || timesheet.total_toil_hours <= 0) {
    return { valid: false, reason: 'Timesheet has no TOIL hours' }
  }

  if (timesheet.toil_status === 'Accrued') {
    return { valid: false, reason: 'Timesheet is already approved' }
  }

  if (timesheet.toil_status === 'Rejected') {
    return { valid: false, reason: 'Timesheet is rejected' }
  }

  return { valid: true, reason: null }
}

/**
 * Get TOIL status badge text
 * @param {object} timesheet - Timesheet object
 * @returns {string} Badge text
 */
export const getStatusBadgeText = (timesheet) => {
  if (!timesheet) return 'Unknown'

  if (timesheet.docstatus === 0) return 'Draft'
  if (timesheet.docstatus === 2) return 'Cancelled'

  return timesheet.toil_status || 'Unknown'
}
