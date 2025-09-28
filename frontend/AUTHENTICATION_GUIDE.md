# Authentication System Guide

This guide documents the authentication system implemented for the DevSecOps Dashboard and provides guidelines for maintaining and extending the authentication features.

## Overview

The dashboard implements a comprehensive authentication system that:
- Verifies Frappe session cookies (sid, sid_sig)
- Checks user authentication status via Frappe API
- Displays an unauthorized page for non-authenticated users
- Provides user account management in the header
- Maintains responsive design across all authentication states

## Authentication Flow

### 1. Initial Authentication Check

```jsx
const checkAuthentication = async () => {
  try {
    // Check for Frappe session cookies
    const hasSid = document.cookie.includes('sid=')
    const hasSidSig = document.cookie.includes('sid_sig=')
    
    if (!hasSid || !hasSidSig) {
      setIsAuthenticated(false)
      return
    }

    // Verify session with Frappe API
    const response = await fetch('/api/method/frappe.auth.get_logged_user', {
      method: 'GET',
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      }
    })

    if (response.ok) {
      const data = await response.json()
      if (data.message && data.message !== 'Guest') {
        setIsAuthenticated(true)
        setUserInfo({
          username: data.message,
          fullName: data.full_name || data.message,
          email: data.message
        })
      } else {
        setIsAuthenticated(false)
      }
    } else {
      setIsAuthenticated(false)
    }
  } catch (error) {
    console.error('Authentication check failed:', error)
    setIsAuthenticated(false)
  }
}
```

### 2. Authentication States

The application handles three authentication states:

- **`null`**: Checking authentication (shows loading state)
- **`false`**: Not authenticated (shows unauthorized page)
- **`true`**: Authenticated (shows dashboard)

### 3. Session Management

- **Session Cookies**: Checks for `sid` and `sid_sig` cookies
- **API Verification**: Calls `/api/method/frappe.auth.get_logged_user`
- **User Info**: Stores username, full name, and email
- **CSRF Token**: Automatically configured for API calls

## Components

### 1. Main App Component (`App.jsx`)

**Key Features:**
- Authentication state management
- User information storage
- Theme configuration
- Conditional rendering based on auth state

**Authentication Logic:**
```jsx
// Show loading state while checking authentication
if (isAuthenticated === null) {
  return <LoadingState />
}

// Show unauthorized page if not authenticated
if (!isAuthenticated) {
  return <UnauthorizedPage />
}

// Show dashboard if authenticated
return <AuthenticatedApp />
```

### 2. Unauthorized Page (`UnauthorizedPage.jsx`)

**Features:**
- Professional unauthorized message
- Clear call-to-action for login
- Theme-aware styling (light/dark mode)
- Responsive design for all screen sizes
- Consistent header with dashboard branding

**Key Elements:**
- Lock icon for visual context
- "Unauthorized Access" title
- Descriptive explanation text
- Prominent "Login to Continue" button
- Additional help text for troubleshooting

### 3. User Account Section

**Header Integration:**
- User avatar with dropdown menu
- Username display (responsive)
- Profile, Settings, and Logout options
- Positioned alongside theme toggle

**Dropdown Menu Items:**
```jsx
const userMenuItems = [
  {
    key: 'profile',
    icon: <ProfileOutlined />,
    label: 'Profile',
    onClick: () => { /* Navigate to profile */ }
  },
  {
    key: 'settings',
    icon: <SettingOutlined />,
    label: 'Settings',
    onClick: () => { /* Navigate to settings */ }
  },
  {
    type: 'divider'
  },
  {
    key: 'logout',
    icon: <LogoutOutlined />,
    label: 'Logout',
    onClick: handleLogout
  }
]
```

## Header Updates

### 1. Title and Branding

- **Title**: Changed from "Engineering Projects" to "DevSecOps Dashboard"
- **Icon**: Added `SafetyOutlined` icon representing DevSecOps security focus
- **Typography**: Enhanced with responsive font sizing and proper hierarchy
- **Spacing**: Improved layout with consistent gaps and alignment

### 2. Responsive Design

- **Mobile**: Icon-only theme toggle, hidden username
- **Tablet**: Abbreviated theme toggle text, visible username
- **Desktop**: Full text labels, complete user information

## Security Features

### 1. Session Validation

- **Cookie Check**: Validates presence of required session cookies
- **API Verification**: Confirms session validity with Frappe backend
- **Guest Detection**: Properly handles guest users vs authenticated users
- **Error Handling**: Graceful fallback for network or API errors

### 2. CSRF Protection

- **Token Injection**: CSRF token injected via `window.csrf_token`
- **Axios Configuration**: Automatic CSRF header for all API calls
- **Request Headers**: Proper CSRF token inclusion in logout requests

### 3. Logout Handling

```jsx
const handleLogout = async () => {
  try {
    await fetch('/api/method/logout', {
      method: 'POST',
      credentials: 'include',
      headers: {
        'X-Frappe-CSRF-Token': window.csrf_token
      }
    })
    // Redirect to login page
    window.location.href = '/login'
  } catch (error) {
    console.error('Logout failed:', error)
    // Fallback: redirect to login anyway
    window.location.href = '/login'
  }
}
```

## Responsive Authentication UI

### 1. Header Responsiveness

- **Mobile (xs)**: Compact layout, icon-only buttons
- **Tablet (sm/md)**: Abbreviated text, visible user info
- **Desktop (lg+)**: Full layout with complete text labels

### 2. Unauthorized Page Responsiveness

- **Card Layout**: Responsive padding and margins
- **Typography**: Scalable font sizes for different screens
- **Button Sizing**: Touch-friendly on mobile, standard on desktop
- **Icon Scaling**: Appropriate icon sizes for each breakpoint

### 3. CSS Classes

```css
.header-title {
  font-size: 16px; /* Mobile */
}

@media (min-width: 576px) {
  .header-title {
    font-size: 18px; /* Tablet */
  }
}

@media (min-width: 768px) {
  .header-title {
    font-size: 20px; /* Desktop */
  }
}
```

## Best Practices

### 1. Error Handling

- Always provide fallback authentication states
- Log authentication errors for debugging
- Graceful degradation for network failures
- Clear error messages for users

### 2. User Experience

- Show loading states during authentication checks
- Provide clear unauthorized messaging
- Maintain consistent branding across all states
- Ensure responsive design for all authentication flows

### 3. Security

- Validate both session cookies and API responses
- Use CSRF tokens for all state-changing requests
- Implement proper logout functionality
- Handle edge cases (expired sessions, network errors)

### 4. Performance

- Minimize authentication check frequency
- Cache user information appropriately
- Use efficient state management
- Optimize component re-renders

## Future Enhancements

### 1. Profile Management

- User profile editing functionality
- Avatar upload and management
- Personal settings configuration
- Account preferences

### 2. Advanced Security

- Multi-factor authentication support
- Session timeout warnings
- Password change requirements
- Security audit logging

### 3. User Experience

- Remember me functionality
- Single sign-on (SSO) integration
- Social login options
- Progressive web app features

This authentication system provides a solid foundation for secure, user-friendly access control while maintaining the professional appearance and responsive design of the DevSecOps Dashboard.
