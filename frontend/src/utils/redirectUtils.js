/**
 * Utility functions for handling authentication redirects
 */

/**
 * Get the current URL for redirect purposes
 * @returns {string} Encoded current URL
 */
export const getCurrentUrlForRedirect = () => {
  const currentPath = window.location.pathname
  const currentSearch = window.location.search
  const currentHash = window.location.hash
  
  // Combine path, search, and hash
  const fullUrl = currentPath + currentSearch + currentHash
  
  // Encode for safe URL parameter usage
  return encodeURIComponent(fullUrl)
}

/**
 * Build login URL with redirect parameter
 * @param {string} redirectUrl - Optional custom redirect URL
 * @returns {string} Login URL with redirect parameter
 */
export const buildLoginUrl = (redirectUrl = null) => {
  const redirectTo = redirectUrl || getCurrentUrlForRedirect()
  return `/login?redirect-to=${redirectTo}`
}

/**
 * Get redirect URL from current page parameters
 * @returns {string|null} Decoded redirect URL or null if not found
 */
export const getRedirectUrlFromParams = () => {
  const urlParams = new URLSearchParams(window.location.search)
  const redirectParam = urlParams.get('redirect-to')
  
  if (redirectParam) {
    try {
      return decodeURIComponent(redirectParam)
    } catch (error) {
      console.error('Failed to decode redirect URL:', error)
      return null
    }
  }
  
  return null
}

/**
 * Clean redirect parameters from current URL
 */
export const cleanRedirectParams = () => {
  const url = new URL(window.location)
  url.searchParams.delete('redirect-to')
  
  // Update URL without page reload
  window.history.replaceState({}, document.title, url.pathname + url.search + url.hash)
}

/**
 * Perform redirect to specified URL
 * @param {string} url - URL to redirect to
 * @param {boolean} replace - Whether to replace current history entry
 */
export const performRedirect = (url, replace = false) => {
  if (replace) {
    window.location.replace(url)
  } else {
    window.location.href = url
  }
}

/**
 * Check if a URL is safe for redirect (prevents open redirect attacks)
 * @param {string} url - URL to check
 * @returns {boolean} True if URL is safe for redirect
 */
export const isSafeRedirectUrl = (url) => {
  try {
    // Allow relative URLs
    if (url.startsWith('/')) {
      return true
    }
    
    // Allow URLs on the same origin
    const redirectUrl = new URL(url, window.location.origin)
    return redirectUrl.origin === window.location.origin
  } catch (error) {
    // Invalid URL
    return false
  }
}

/**
 * Handle post-login redirect logic
 * @param {boolean} isAuthenticated - Current authentication status
 * @returns {boolean} True if redirect was performed
 */
export const handlePostLoginRedirect = (isAuthenticated) => {
  if (!isAuthenticated) {
    return false
  }
  
  const redirectUrl = getRedirectUrlFromParams()
  
  if (redirectUrl && isSafeRedirectUrl(redirectUrl)) {
    // Clean up URL parameters
    cleanRedirectParams()
    
    // Perform redirect
    performRedirect(redirectUrl)
    return true
  }
  
  // Clean up parameters even if no redirect
  if (redirectUrl) {
    cleanRedirectParams()
  }
  
  return false
}

/**
 * Get user-friendly redirect message
 * @returns {string} Message about redirect behavior
 */
export const getRedirectMessage = () => {
  const redirectUrl = getRedirectUrlFromParams()
  
  if (redirectUrl) {
    return "You'll be redirected to your requested page after login."
  }
  
  return "You'll be automatically redirected back to this page after login."
}

/**
 * Default redirect URL for the application
 */
export const DEFAULT_REDIRECT_URL = '/frontend'

/**
 * Build logout URL with redirect to login
 * @returns {string} Logout URL that redirects to login with current page redirect
 */
export const buildLogoutUrl = () => {
  const currentUrl = getCurrentUrlForRedirect()
  return `/api/method/logout?redirect-to=${encodeURIComponent(`/login?redirect-to=${currentUrl}`)}`
}
