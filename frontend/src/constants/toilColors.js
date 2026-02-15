/**
 * TOIL Status Colors
 * Centralized color constants for TOIL status tags and indicators
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
  },
  'Rejected': {
    tag: 'red',
    hex: '#ff4d4f',
    antd: 'colorError'
  }
}

/**
 * Get status color configuration
 * @param {string} status - TOIL status
 * @returns {object} Color configuration with tag, hex, and antd properties
 */
export const getStatusColor = (status) => {
  return TOIL_STATUS_COLORS[status] || TOIL_STATUS_COLORS['Not Applicable']
}

/**
 * Get tag color for Ant Design Tag component
 * @param {string} status - TOIL status
 * @returns {string} Tag color name
 */
export const getTagColor = (status) => {
  return getStatusColor(status).tag
}

/**
 * Get hex color
 * @param {string} status - TOIL status
 * @returns {string} Hex color code
 */
export const getHexColor = (status) => {
  return getStatusColor(status).hex
}
