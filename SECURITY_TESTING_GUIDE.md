# DevSecOps Dashboard - Security Testing Guide

**Date**: 2025-11-08  
**Purpose**: Test authentication, CSRF protection, and session validation fixes

---

## Test Environment Setup

### Prerequisites
- Access to desk.kns.co.ke
- Browser Developer Tools (F12)
- Ability to clear cookies/session
- Two browser windows or incognito mode

---

## Test Cases

### Test 1: CSRF Token Validation on App Initialization

**Objective**: Verify CSRF token is properly validated when app loads

**Steps**:
1. Open DevSecOps Dashboard in browser
2. Open Developer Tools (F12)
3. Go to Console tab
4. Look for message: `[SECURITY] CSRF token initialized successfully`

**Expected Result**: ✅
- Console shows CSRF token initialization message
- No errors about missing CSRF token
- App loads normally

**Failure Indicators**: ❌
- Error message: `[SECURITY] CSRF token is not available`
- App fails to load
- API calls return 403 Forbidden

---

### Test 2: Session Validation on App Mount

**Objective**: Verify authentication check runs on app initialization

**Steps**:
1. Open DevSecOps Dashboard
2. Open Developer Tools Console
3. Look for authentication check logs

**Expected Result**: ✅
- App shows loading state briefly
- User is authenticated and dashboard loads
- No UnauthorizedPage is shown

**Failure Indicators**: ❌
- UnauthorizedPage is displayed
- Console shows authentication errors
- User cannot access dashboard

---

### Test 3: Accessing App Without Valid Session

**Objective**: Verify app properly handles unauthenticated users

**Steps**:
1. Clear all cookies for desk.kns.co.ke
2. Open DevSecOps Dashboard in new tab
3. Observe behavior

**Expected Result**: ✅
- UnauthorizedPage is displayed
- "Login to Continue" button is visible
- Button redirects to Frappe login page
- After login, user is redirected back to dashboard

**Failure Indicators**: ❌
- Dashboard loads without authentication
- UnauthorizedPage doesn't appear
- Login button doesn't work

---

### Test 4: CSRF Token in API Requests

**Objective**: Verify all API requests include CSRF token

**Steps**:
1. Open DevSecOps Dashboard
2. Open Developer Tools → Network tab
3. Make an API call (e.g., create a project, update something)
4. Click on the request in Network tab
5. Go to "Headers" tab
6. Look for `X-Frappe-CSRF-Token` header

**Expected Result**: ✅
- All POST/PUT/DELETE requests have `X-Frappe-CSRF-Token` header
- Token value matches `window.csrf_token`
- GET requests may or may not have token (not required)

**Failure Indicators**: ❌
- POST/PUT/DELETE requests missing CSRF token header
- Token value is empty or undefined
- API returns 403 Forbidden

---

### Test 5: Invalid CSRF Token Handling

**Objective**: Verify app handles invalid CSRF tokens gracefully

**Steps**:
1. Open DevSecOps Dashboard
2. Open Developer Tools Console
3. Run: `window.csrf_token = 'invalid-token-12345'`
4. Try to create a project or make an API call
5. Observe error handling

**Expected Result**: ✅
- API call fails with proper error message
- Console shows error logs
- App doesn't crash
- User can retry or navigate away

**Failure Indicators**: ❌
- App crashes or becomes unresponsive
- No error message shown to user
- Silent failure without feedback

---

### Test 6: Session Expiry Detection

**Objective**: Verify app detects and handles session expiry

**Steps**:
1. Open DevSecOps Dashboard
2. Wait for session to expire (or simulate by clearing sid cookie)
3. Try to make an API call (e.g., refresh projects list)
4. Observe behavior

**Expected Result**: ✅
- Console shows: `[SECURITY] 401 Unauthorized - Session may have expired`
- App detects session expiry
- User is prompted to re-authenticate
- UnauthorizedPage is displayed

**Failure Indicators**: ❌
- API call silently fails
- No session expiry detection
- User sees stale data
- App doesn't prompt for re-login

---

### Test 7: Permission Denied (403) Handling

**Objective**: Verify app handles permission errors properly

**Steps**:
1. Open DevSecOps Dashboard as regular user
2. Try to access a resource you don't have permission for
3. Observe error handling

**Expected Result**: ✅
- Console shows: `[SECURITY] 403 Forbidden - User lacks required permissions`
- Proper error message is displayed
- App doesn't crash

**Failure Indicators**: ❌
- App crashes or shows blank page
- No error message
- User can access restricted resources

---

### Test 8: API Call Consistency

**Objective**: Verify all API services use consistent CSRF handling

**Steps**:
1. Open DevSecOps Dashboard
2. Open Network tab in Developer Tools
3. Perform actions in different sections:
   - Create/update a project
   - Create/update an application
   - Create/update an incident
4. Check each request for CSRF token

**Expected Result**: ✅
- All POST/PUT/DELETE requests have CSRF token
- All requests use axios client (consistent pattern)
- No direct fetch() calls without CSRF token

**Failure Indicators**: ❌
- Inconsistent CSRF token handling
- Some requests missing token
- Mix of fetch() and axios calls

---

## Security Checklist

- [ ] CSRF token is validated on app initialization
- [ ] CSRF token is included in all POST/PUT/DELETE requests
- [ ] Session validation runs on app mount
- [ ] Unauthenticated users see UnauthorizedPage
- [ ] Session expiry is detected and handled
- [ ] 401 errors trigger re-authentication
- [ ] 403 errors are handled gracefully
- [ ] All API services use consistent CSRF handling
- [ ] No sensitive data in console logs
- [ ] No CSRF token exposed in URLs

---

## Debugging Tips

### Check CSRF Token
```javascript
console.log('CSRF Token:', window.csrf_token)
```

### Check Session Cookies
```javascript
console.log('Cookies:', document.cookie)
```

### Check Authentication State
```javascript
// In browser console
// This depends on your store implementation
```

### Monitor API Requests
1. Open Network tab in DevTools
2. Filter by XHR/Fetch
3. Check Headers tab for each request
4. Look for `X-Frappe-CSRF-Token` header

### Check Console for Security Logs
```
[SECURITY] - All security-related logs start with this prefix
```

---

## Deployment Verification

After deploying to desk.kns.co.ke:

1. ✅ Clear browser cache
2. ✅ Clear Frappe cache: `bench --site desk.kns.co.ke clear-cache`
3. ✅ Restart Frappe: `bench restart`
4. ✅ Test in incognito mode (fresh session)
5. ✅ Run all test cases above
6. ✅ Monitor error logs for security issues

---

## Support

If you encounter issues:

1. Check browser console for `[SECURITY]` logs
2. Check Frappe error logs: `bench logs`
3. Verify CSRF token is being injected: `window.csrf_token`
4. Verify session cookies exist: `document.cookie`
5. Check Network tab for failed requests

---

## References

- **CSRF Protection**: Frappe uses `X-Frappe-CSRF-Token` header
- **Session Management**: Frappe uses `sid` and `user_id` cookies
- **Authentication**: Frappe session-based authentication
- **Error Codes**: 401 = Unauthorized, 403 = Forbidden, 404 = Not Found

