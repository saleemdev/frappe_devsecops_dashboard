# Authentication and Authorization Upgrade Plan for all_trails App

## Current State Analysis

### Backend (Frappe Framework)
- Authentication: Cookie-based sessions with CSRF tokens
- Authorization: Role-based permissions defined in doctype JSON files
- Current permissions are basic (System Manager gets full access, others have limited access)

### Frontend (Vue.js)
- Authentication: Pinia store with session checking
- Security: CSRF token validation in API requests
- Session management: Cookie-based with proper logout handling

## Phase 1: Authentication and Authorization Improvements

### 1. Enhanced Backend Authentication

#### 1.1 Create Authentication Middleware
```python
# all_trails/utils/auth.py
import frappe
from functools import wraps

def require_authentication(f):
    """Decorator to require authentication for API endpoints"""
    @wraps(f)
    def wrapper(*args, **kwargs):
        if frappe.session.user == "Guest":
            frappe.throw("Authentication required", frappe.AuthenticationError)
        return f(*args, **kwargs)
    return wrapper

def require_roles(*roles):
    """Decorator to require specific roles for API endpoints"""
    def decorator(f):
        @wraps(f)
        def wrapper(*args, **kwargs):
            if frappe.session.user == "Guest":
                frappe.throw("Authentication required", frappe.AuthenticationError)
            
            user_roles = frappe.get_roles()
            if not any(role in user_roles for role in roles):
                frappe.throw("Insufficient permissions", frappe.PermissionError)
            
            return f(*args, **kwargs)
        return wrapper
    return decorator
```

#### 1.2 Update API Endpoints with Authentication
```python
# Update all_trails/api.py with authentication decorators
from all_trails.utils.auth import require_authentication, require_roles

@frappe.whitelist()
@require_authentication
def get_user_bookings(status=None):
    # Implementation remains the same but now requires authentication
    pass

@frappe.whitelist()
@require_authentication
def create_booking(trail_id, spots_booked, selected_activities=None):
    # Implementation remains the same but now requires authentication
    pass

@frappe.whitelist()
@require_roles("System Manager", "All Trails Admin")
def create_trail(trail_data):
    # Admin-only endpoint
    pass
```

#### 1.3 Enhanced Doctype Permissions
Update the doctype JSON files to have more granular permissions:

**For Trail doctype (all_trails/doctype/trail/trail.json):**
```json
"permissions": [
    {
        "create": 1,
        "delete": 1,
        "email": 1,
        "export": 1,
        "print": 1,
        "read": 1,
        "report": 1,
        "role": "System Manager",
        "share": 1,
        "write": 1
    },
    {
        "create": 1,
        "read": 1,
        "role": "All Trails Admin",
        "write": 1,
        "delete": 1
    },
    {
        "read": 1,
        "role": "All"
    }
]
```

**For Trail Booking doctype:**
```json
"permissions": [
    {
        "create": 1,
        "delete": 1,
        "email": 1,
        "export": 1,
        "print": 1,
        "read": 1,
        "report": 1,
        "role": "System Manager",
        "share": 1,
        "write": 1
    },
    {
        "create": 1,
        "read": 1,
        "role": "All Trails Admin",
        "write": 1
    },
    {
        "create": 1,
        "read": 1,
        "role": "All",
        "delete": 0,
        "write": 0
    }
]
```

**For Trail Review doctype:**
```json
"permissions": [
    {
        "create": 1,
        "delete": 1,
        "email": 1,
        "export": 1,
        "print": 1,
        "read": 1,
        "report": 1,
        "role": "System Manager",
        "share": 1,
        "write": 1
    },
    {
        "create": 1,
        "read": 1,
        "role": "All Trails Admin",
        "write": 1,
        "delete": 1
    },
    {
        "create": 1,
        "read": 1,
        "role": "All",
        "delete": 1,
        "write": 1
    }
]
```

### 2. Enhanced Frontend Authentication

#### 2.1 Update Auth Store with Better Error Handling
```typescript
// Update /frontend/src/stores/authStore.ts
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import type { User } from '../types/index';
import { apiService } from '../services/api';

export const useAuthStore = defineStore('auth', () => {
  const user = ref<User | null>(null);
  const isLoading = ref(false);
  const error = ref<string | null>(null);
  const isCheckingAuth = ref(false);
  const lastAuthCheck = ref<number | null>(null);
  const authCheckInterval = ref<number>(30000); // 30 seconds

  const isAuthenticated = computed(() => !!user.value);

  /**
   * Check current authentication status with caching
   */
  const checkAuthentication = async (forceRefresh: boolean = false) => {
    // Use cached result if within interval and not forcing refresh
    if (!forceRefresh && lastAuthCheck.value && 
        Date.now() - lastAuthCheck.value < authCheckInterval.value) {
      return !!user.value;
    }

    isCheckingAuth.value = true;
    isLoading.value = true;
    error.value = null;

    try {
      // SECURITY: Validate CSRF token exists before checking auth
      if (!(window as any).csrf_token) {
        console.warn('[SECURITY] CSRF token not available during authentication check');
        // Attempt to refresh CSRF token
        await refreshCSRFToken();
      }

      // Get current user info from API service
      const currentUser = await apiService.getCurrentUser();

      if (currentUser) {
        // User is authenticated
        user.value = currentUser;
        lastAuthCheck.value = Date.now();
        isLoading.value = false;
        isCheckingAuth.value = false;
        return true;
      } else {
        // User is not authenticated (Guest or no session)
        user.value = null;
        lastAuthCheck.value = Date.now();
        isLoading.value = false;
        isCheckingAuth.value = false;
        error.value = null;
        return false;
      }
    } catch (err) {
      // Don't redirect on error, just set state to unauthenticated
      user.value = null;
      error.value = err instanceof Error ? err.message : 'Authentication failed';
      lastAuthCheck.value = Date.now();
      isLoading.value = false;
      isCheckingAuth.value = false;
      return false;
    }
  };

  /**
   * Refresh CSRF Token
   */
  const refreshCSRFToken = async () => {
    try {
      const response = await fetch('/api/method/frappe.sessions.get_csrf_token', {
        method: 'POST',
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        (window as any).csrf_token = data.csrf_token;
      }
    } catch (error) {
      console.error('Failed to refresh CSRF token:', error);
    }
  };

  /**
   * Initialize authentication (alias for checkAuthentication for backward compatibility)
   */
  const initializeAuth = async () => {
    return await checkAuthentication();
  };

  /**
   * Handle session expiry (called when 401 error is detected)
   */
  const handleSessionExpiry = () => {
    console.warn('[SECURITY] Session has expired. Clearing authentication state.');
    user.value = null;
    error.value = 'Your session has expired. Please log in again.';
    isLoading.value = false;
    isCheckingAuth.value = false;
    lastAuthCheck.value = null;
    
    // Emit event for global handlers
    window.dispatchEvent(new CustomEvent('session-expired'));
  };

  /**
   * Logout user
   */
  const logout = async () => {
    isLoading.value = true;
    
    try {
      // Call Frappe's logout API endpoint to properly invalidate the session
      await fetch('/api/method/logout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': (window as any).csrf_token || ''
        },
        credentials: 'include'
      });
    } catch (error) {
      // Continue with logout even if API call fails
      console.warn('[AuthStore] Logout API call failed, proceeding with redirect:', error);
    } finally {
      // Clear state regardless of API call result
      user.value = null;
      isLoading.value = false;
      error.value = null;
      lastAuthCheck.value = null;
      
      // Redirect to home page after logout
      window.location.href = '/all-trails/';
    }
  };

  /**
   * Get user permissions
   */
  const getUserPermissions = (): string[] => {
    if (!user.value) return [];
    // This would typically come from the backend with user roles
    return user.value.roles || [];
  };

  /**
   * Check if user has specific permission
   */
  const hasPermission = (permission: string): boolean => {
    const permissions = getUserPermissions();
    return permissions.includes(permission) || permissions.includes('System Manager');
  };

  return {
    user,
    isLoading,
    error,
    isCheckingAuth,
    isAuthenticated,
    checkAuthentication,
    initializeAuth,
    handleSessionExpiry,
    logout,
    getUserPermissions,
    hasPermission,
    refreshCSRFToken
  };
});
```

#### 2.2 Update API Service with Better Authentication Handling
```typescript
// Update /frontend/src/services/api.ts with enhanced authentication
// (The existing implementation is already quite good, but we'll enhance error handling)
```

### 3. Input Validation and Sanitization

#### 3.1 Backend Input Validation
```python
# all_trails/utils/validation.py
import frappe
import re
from frappe import _

def validate_email(email):
    """Validate email format"""
    pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    if not re.match(pattern, email):
        frappe.throw(_("Invalid email format"), frappe.ValidationError)

def validate_phone_number(phone):
    """Validate phone number format (Kenyan numbers)"""
    # Allow various Kenyan number formats
    pattern = r'^(?:\+254|0)?[1-9]\d{8}$'
    if not re.match(pattern, phone.replace(" ", "").replace("-", "")):
        frappe.throw(_("Invalid phone number format"), frappe.ValidationError)

def sanitize_input(text, max_length=1000):
    """Sanitize input text"""
    if not isinstance(text, str):
        return text
    
    # Remove potentially dangerous characters
    sanitized = text.strip()
    
    # Limit length
    if len(sanitized) > max_length:
        sanitized = sanitized[:max_length]
    
    # Escape HTML characters
    sanitized = sanitized.replace('<', '&lt;').replace('>', '&gt;')
    
    return sanitized

def validate_rating(rating):
    """Validate rating is between 1 and 5"""
    try:
        rating = int(rating)
        if rating < 1 or rating > 5:
            frappe.throw(_("Rating must be between 1 and 5"), frappe.ValidationError)
        return rating
    except ValueError:
        frappe.throw(_("Invalid rating value"), frappe.ValidationError)
```

#### 3.2 Update API Endpoints with Validation
```python
# Update all_trails/api.py with input validation
from all_trails.utils.validation import validate_email, validate_phone_number, sanitize_input, validate_rating

@frappe.whitelist()
def create_booking(trail_id, spots_booked, selected_activities=None):
    """Create a new trail booking with validation"""
    # Validate inputs
    if not trail_id:
        frappe.throw(_("Trail ID is required"), frappe.ValidationError)
    
    spots_booked = int(spots_booked) if spots_booked else 0
    if spots_booked <= 0:
        frappe.throw(_("At least one spot must be booked"), frappe.ValidationError)
    
    # Rest of the implementation...
```

### 4. Database Query Optimization

#### 4.1 Add Database Indexes
```sql
-- Add indexes for frequently queried fields
-- For Trail table
ALTER TABLE `tabTrail` ADD INDEX idx_status_scheduled_date (`status`, `scheduled_date`);
ALTER TABLE `tabTrail` ADD INDEX idx_difficulty_location (`difficulty_level`, `location`);

-- For Trail Booking table  
ALTER TABLE `tabTrail Booking` ADD INDEX idx_user_status (`user`, `status`);
ALTER TABLE `tabTrail Booking` ADD INDEX idx_trail_status (`trail`, `status`);

-- For Trail Review table
ALTER TABLE `tabTrail Review` ADD INDEX idx_trail_status_rating (`trail`, `status`, `rating`);
ALTER TABLE `tabTrail Review` ADD INDEX idx_user_booking (`user`, `booking`);
```

#### 4.2 Update Doctype Definitions with Search Indexes
In each doctype JSON file, add search_index to frequently queried fields:

For Trail doctype:
```json
{
    "fieldname": "status",
    "fieldtype": "Select",
    "in_list_view": 1,
    "label": "Status",
    "search_index": 1
},
{
    "fieldname": "scheduled_date",
    "fieldtype": "Date",
    "label": "Scheduled Date",
    "search_index": 1
}
```

### 5. Caching Implementation

#### 5.1 Add Caching to API Endpoints
```python
# all_trails/utils/cache.py
import frappe
import json
from frappe.utils import cint

def get_cache_key(endpoint, params=None):
    """Generate cache key for API endpoint"""
    key_parts = [endpoint]
    if params:
        # Sort params to ensure consistent key
        sorted_params = sorted(params.items()) if isinstance(params, dict) else params
        key_parts.append(json.dumps(sorted_params, sort_keys=True))
    return ":".join(key_parts)

def get_cached_result(cache_key, cache_duration=300):  # 5 minutes default
    """Get cached result if available"""
    try:
        cached = frappe.cache().get_value(cache_key)
        if cached:
            return cached
    except Exception:
        pass
    return None

def set_cache_result(cache_key, result, cache_duration=300):
    """Set result in cache"""
    try:
        frappe.cache().set_value(cache_key, result, expires_in_sec=cache_duration)
    except Exception:
        pass  # Fail silently to not break functionality
```

#### 5.2 Update API Endpoints with Caching
```python
# Update get_trails endpoint with caching
from all_trails.utils.cache import get_cached_result, set_cache_result, get_cache_key

@frappe.whitelist(allow_guest=True)
def get_trails(filters=None, page=1, page_size=10):
    """Get trails with caching and validation"""
    if isinstance(filters, str):
        try:
            filters = json.loads(filters)
        except ValueError:
            frappe.throw(_("Invalid filters format"), frappe.ValidationError)
    
    filters = filters or {}
    page = cint(page) or 1
    page_size = cint(page_size) or 10
    
    # Generate cache key
    cache_key = get_cache_key("get_trails", {
        "filters": filters,
        "page": page,
        "page_size": page_size
    })
    
    # Try to get from cache first
    cached_result = get_cached_result(cache_key)
    if cached_result:
        return cached_result
    
    # Original implementation
    db_filters = {"status": "Active"}
    
    if filters.get("difficulty_level"):
        db_filters["difficulty_level"] = filters.get("difficulty_level")
        
    if filters.get("search"):
        db_filters["title"] = ["like", f"%{sanitize_input(filters.get('search'))}%"]
        
    if filters.get("min_price") or filters.get("max_price"):
        min_p = flt(filters.get("min_price", 0))
        max_p = flt(filters.get("max_price", 999999999))
        db_filters["price_kshs"] = ["between", [min_p, max_p]]
    
    trails = frappe.get_list(
        "Trail",
        filters=db_filters,
        fields=["name", "title", "difficulty_level", "location", "distance_km", 
                "duration_hours", "elevation_gain_m", "price_kshs", "scheduled_date", 
                "max_capacity", "featured_image"],
        start=(page - 1) * page_size,
        page_length=page_size,
        order_by="scheduled_date asc"
    )
    
    # Enrich with available spots
    for trail in trails:
        trail_doc = frappe.get_doc("Trail", trail.name)
        trail.available_spots = trail_doc.get_available_spots()
        trail.id = trail.name
    
    total_count = frappe.db.count("Trail", filters=db_filters)
    
    result = {
        "data": trails,
        "total": total_count,
        "page": page,
        "page_size": page_size
    }
    
    # Cache the result
    set_cache_result(cache_key, result, cache_duration=300)  # 5 minutes
    
    return result
```

## Implementation Steps

1. Create the auth utility module
2. Update all API endpoints with authentication decorators
3. Update doctype permissions
4. Enhance the auth store with better error handling
5. Implement input validation utilities
6. Add database indexes
7. Implement caching for frequently accessed data
8. Test all changes

This upgrade will significantly improve the security, performance, and maintainability of the all_trails application.