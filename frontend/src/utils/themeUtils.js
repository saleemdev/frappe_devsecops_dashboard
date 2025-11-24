/**
 * Theme utility functions for responsive dark/light mode styling
 */

/**
 * Get header banner gradient style based on theme token
 * @param {Object} token - Ant Design theme token from theme.useToken()
 * @returns {Object} Style object with background gradient
 */
export const getHeaderBannerStyle = (token) => {
  // Check if we're in dark mode by examining the background color
  const isDarkMode = token.colorBgContainer &&
    parseInt(token.colorBgContainer.replace('#', ''), 16) < 0x808080

  return {
    background: isDarkMode
      ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)'
      : 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
    borderRadius: '8px'
  }
}

/**
 * Get icon color based on theme
 * @param {Object} token - Ant Design theme token from theme.useToken()
 * @returns {string} Color value
 */
export const getHeaderIconColor = (token) => {
  return token.colorPrimary || '#1890ff'
}
