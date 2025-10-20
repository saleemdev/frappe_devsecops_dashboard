# API Security Review - DevSecOps Dashboard

## Executive Summary

The DevSecOps Dashboard React application uses a combination of **mock data** and **real Frappe APIs**. This review focuses on the real APIs that are exposed and their RBAC (Role-Based Access Control) implementation.

**Risk Level: MEDIUM**

---

## 1. API Endpoints Inventory

### 1.1 Real/Production APIs (Non-Mock)
These endpoints are configured to use actual backend implementations:

| Endpoint | Method | Backend | RBAC Status |
|----------|--------|---------|-------------|
| `/api/resource/Project` | GET/POST/PUT | Frappe Standard | ✅ Secure |
| `/api/resource/Task` | GET/POST/PUT | Frappe Standard | ✅ Secure |
| `/api/method/frappe_devsecops_dashboard.api.dashboard.get_dashboard_data` | GET | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.dashboard.get_dashboard_metrics` | GET | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.dashboard.get_projects_with_tasks` | GET | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.change_requests.get_change_requests` | GET | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.change_requests.get_change_request_detail` | GET | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.change_requests.create_change_request` | POST | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.change_requests.update_change_request` | PUT | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data` | GET | Custom | ⚠️ NEEDS REVIEW |
| `/api/method/frappe_devsecops_dashboard.api.zenhub.get_workspace_issues` | GET | Custom | ⚠️ NEEDS REVIEW |

### 1.2 Mock APIs (Development Only)
These endpoints currently return mock data and bypass real backend implementations:

| Endpoint | Status | Current Usage |
|----------|--------|---------------|
| Applications API | Mock | Development |
| Incidents API | Mock | Development |
| Change Requests API | Mock | Development (but also has real backend!) |
| Swagger Collections API | Mock | Development |

---

## 2. Security Findings

### 2.1 Critical Issues 🔴

#### Issue #1: Guest Access to Dashboard Endpoint
**File:** `frappe_devsecops_dashboard/api/dashboard.py` (Line 12)

```python
@frappe.whitelist(allow_guest=True)
def get_dashboard_data():
```

**Risk:** The dashboard endpoint allows guest/unauthenticated users to access dashboard data.

**Impact:** Unauthorized users can retrieve sensitive project information, metrics, and task details.

**Recommendation:** Remove `allow_guest=True` parameter
```python
@frappe.whitelist()
def get_dashboard_data():
```

---

#### Issue #2: Debug Print Statements in Change Request API
**File:** `frappe_devsecops_dashboard/api/change_request.py` (Lines 190-198)

```python
print(f"\n=== UPDATE_CHANGE_REQUEST CALLED ===")
print(f"name parameter: {name}")
print(f"data parameter type: {type(data)}")
print(f"data parameter (first 200 chars): {str(data)[:200]}")
print(f"Parsed update_data keys: {list(update_data.keys())}")
print(f"Parsed update_data: {update_data}")
```

**Risk:** Production debug statements expose sensitive change request data in server logs.

**Impact:** Information disclosure through log files.

**Recommendation:** Remove all debug print statements before production deployment.

---

### 2.2 High Priority Issues 🟠

#### Issue #3: Inconsistent Permission Checking in Change Request API
**File:** `frappe_devsecops_dashboard/api/change_request.py` (Line 157)

```python
def create_change_request(data: str) -> Dict[str, Any]:
    # ...
    doc = frappe.get_doc({
        'doctype': 'Change Request',
        **doc_data
    })
    doc.insert()  # Relies on implicit permission check
```

**Risk:** The create method relies on implicit permission checking by `insert()`. Best practice is to explicitly check permissions.

**Recommendation:** Add explicit permission check:
```python
def create_change_request(data: str) -> Dict[str, Any]:
    try:
        import json
        doc_data = json.loads(data) if isinstance(data, str) else data

        # Explicit permission check
        if not frappe.has_permission('Change Request', 'create'):
            frappe.throw(_('You do not have permission to create Change Requests'), frappe.PermissionError)

        doc = frappe.get_doc({
            'doctype': 'Change Request',
            **doc_data
        })
        doc.insert()
        # ...
```

---

#### Issue #4: Missing RBAC Implementation for Custom Modules
**File:** `frappe_devsecops_dashboard/api/` (multiple files)

**Risk:** The following custom API modules have NO corresponding backend implementations but are configured in the frontend:
- Applications API (`frappe_devsecops_dashboard.api.applications.*`)
- Incidents API (`frappe_devsecops_dashboard.api.incidents.*`)
- Swagger Collections API (`frappe_devsecops_dashboard.api.swagger_collections.*`)

**Current State:** Currently using mock data, but if these are enabled in production, they will fail.

**Recommendation:** Either:
1. Implement these APIs with proper RBAC in the backend, OR
2. Remove these endpoint configurations from the frontend config

---

### 2.3 Medium Priority Issues 🟡

#### Issue #5: Count Query Permission Check
**File:** `frappe_devsecops_dashboard/api/change_request.py` (Line 71)

```python
total = frappe.db.count('Change Request', filters=filter_list)
```

**Risk:** `frappe.db.count()` bypasses permission checking. It counts ALL records matching filters, not just those the user has access to.

**Impact:** Users can see the count of all change requests, even those they don't have permission to access.

**Recommendation:** Use Frappe's ORM to get total count:
```python
# Get total count with same filters
total = len(frappe.get_list(
    'Change Request',
    fields=['name'],
    filters=filter_list
))
```

---

#### Issue #6: Error Responses May Leak Information
**File:** `frappe_devsecops_dashboard/api/change_request.py` (Lines 88-95)

```python
except Exception as e:
    frappe.log_error(f"Error fetching Change Requests: {str(e)}", "Change Request API")
    return {
        'success': False,
        'error': str(e)  # <-- May contain sensitive details
    }
```

**Risk:** Generic exception messages are returned to clients, which may contain sensitive information about the system structure.

**Recommendation:** Return generic error messages to clients:
```python
except Exception as e:
    frappe.log_error(f"Error fetching Change Requests: {str(e)}", "Change Request API")
    return {
        'success': False,
        'error': _('An error occurred while processing your request')
    }
```

---

## 3. Current RBAC Implementation Assessment

### 3.1 Dashboard API ✅ Partial Compliance

**Positive:**
- Uses `frappe.get_list()` which respects user permissions
- Uses `frappe.get_doc()` for single document retrieval
- Proper exception handling for `PermissionError`

**Issues:**
- Allows guest access (`allow_guest=True`)
- Does NOT explicitly validate user permissions for document access

**Code Review:**
```python
# GOOD: Uses frappe.get_list() which respects permissions
projects_data = frappe.get_list(
    "Project",
    fields=[...],
    filters={...}
)

# GOOD: Handles PermissionError
except frappe.PermissionError:
    frappe.log_error("Permission denied", "DevSecOps Dashboard")
    return []
```

---

### 3.2 Change Request API ⚠️ Needs Review

**Positive:**
- Uses `@frappe.whitelist()` (requires authentication)
- Uses `frappe.get_list()` with permission checking
- Implements explicit `has_permission()` check in `get_change_request()`

**Issues:**
- Uses `frappe.db.count()` instead of ORM (bypasses permissions)
- Contains debug print statements
- Inconsistent permission checking across methods
- Generic exceptions may leak information

**Code Review:**
```python
# GOOD: Explicit permission check
if not doc.has_permission('read'):
    frappe.throw(_('You do not have permission to read this Change Request'), frappe.PermissionError)

# PROBLEM: frappe.db.count() bypasses permissions
total = frappe.db.count('Change Request', filters=filter_list)

# PROBLEM: Contains debug prints
print(f"name parameter: {name}")
print(f"Parsed update_data: {update_data}")

# PROBLEM: Inconsistent permission checking in create method
# No explicit permission check before doc.insert()
```

---

### 3.3 Standard Frappe Endpoints ✅ Secure

**Positive:**
- `/api/resource/Project` - Uses Frappe's standard resource API with built-in RBAC
- `/api/resource/Task` - Uses Frappe's standard resource API with built-in RBAC

**Details:**
- Frappe's standard REST API (`/api/resource/DocType`) automatically:
  - Checks user permissions
  - Filters documents based on document-level permissions
  - Validates roles and user permissions
  - Applies document sharing rules

---

## 4. Whitelisting Analysis

### Endpoints Summary:

| Endpoint | Whitelisting | Guest Access | RBAC |
|----------|--------------|--------------|------|
| `get_dashboard_data()` | ✅ Whitelisted | ❌ **ALLOWS GUESTS** | ⚠️ Implicit |
| `get_projects_with_tasks()` | ❌ Not whitelisted | N/A | ✅ Uses ORM |
| `get_change_requests()` | ✅ Whitelisted | ✅ Requires auth | ⚠️ Partial |
| `get_change_request()` | ✅ Whitelisted | ✅ Requires auth | ✅ Explicit check |
| `create_change_request()` | ✅ Whitelisted | ✅ Requires auth | ⚠️ Implicit |
| `update_change_request()` | ✅ Whitelisted | ✅ Requires auth | ⚠️ Implicit |

---

## 5. Recommendations

### Priority 1: IMMEDIATE ACTION REQUIRED 🔴

1. **Remove Guest Access from Dashboard**
   ```python
   # BEFORE
   @frappe.whitelist(allow_guest=True)

   # AFTER
   @frappe.whitelist()
   ```
   **File:** `frappe_devsecops_dashboard/api/dashboard.py:12`

2. **Remove Debug Print Statements**
   ```python
   # Remove lines 190-198 from change_request.py
   print(f"\n=== UPDATE_CHANGE_REQUEST CALLED ===")
   # ... etc
   ```
   **File:** `frappe_devsecops_dashboard/api/change_request.py:190-198`

### Priority 2: HIGH PRIORITY 🟠

3. **Add Explicit Permission Checks**
   - In `create_change_request()`: Check `frappe.has_permission('Change Request', 'create')`
   - In `update_change_request()`: Check `frappe.has_permission('read')` and `frappe.has_permission('write')`

4. **Fix Count Query**
   - Replace `frappe.db.count()` with ORM-based count using `frappe.get_list()`
   - This ensures permission filtering is applied

5. **Sanitize Error Messages**
   - Return generic error messages to clients
   - Log detailed errors on server side only

### Priority 3: MEDIUM PRIORITY 🟡

6. **Document Missing API Implementations**
   - Document which APIs are using mock data
   - Clear documentation on path to production

7. **Add Audit Logging**
   - Add `frappe.log_audit_trail()` for sensitive operations
   - Track who accessed/modified sensitive documents

8. **Test Permission Scenarios**
   - Test that users cannot access documents they don't have permission for
   - Test role-based filtering

---

## 6. Testing Recommendations

### Unit Tests to Add:
1. **Authentication Tests**
   - Verify guest access is rejected
   - Verify unauthenticated users cannot access endpoints

2. **Permission Tests**
   - User without 'Change Request' read access should get empty list
   - User without 'Project' access should not see those projects
   - Count queries respect user permissions

3. **Data Filtering Tests**
   - Multi-tenant scenario: User A shouldn't see User B's data
   - Department-level filtering works correctly
   - Role-based filtering works correctly

### Example Test:
```python
# Test that guest user cannot access dashboard
def test_dashboard_guest_access_blocked():
    frappe.set_user('Guest')

    try:
        result = frappe.call('frappe_devsecops_dashboard.api.dashboard.get_dashboard_data')
        assert False, "Should have thrown PermissionError"
    except frappe.PermissionError:
        pass  # Expected
```

---

## 7. Compliance Checklist

| Requirement | Status | Notes |
|------------|--------|-------|
| Authentication enforced | ⚠️ Partial | Dashboard allows guests |
| Authorization (permissions) | ⚠️ Partial | Some methods missing explicit checks |
| Data access control | ✅ Mostly | Uses Frappe ORM which filters by permissions |
| Audit logging | ❌ Missing | No audit trail implemented |
| Error handling | ⚠️ Partial | Generic messages not always used |
| Input validation | ✅ | Frappe validates JSON input |
| SQL injection prevention | ✅ | Using Frappe ORM prevents SQL injection |
| XSS prevention | ✅ | Frappe handles response encoding |

---

## 8. Summary

**Current State:**
- Frappe standard endpoints: SECURE ✅
- Custom dashboard API: INSECURE (allows guests) 🔴
- Custom change request API: PARTIALLY SECURE ⚠️
- Mock data APIs: NOT A CONCERN (development only)

**Action Items:**
1. Remove `allow_guest=True` from dashboard endpoint
2. Remove debug print statements
3. Add explicit permission checks
4. Fix permission filtering in count queries
5. Sanitize error messages

**Estimated Remediation Time:** 2-3 hours

**Risk if Not Fixed:** Unauthorized access to sensitive project, task, and change request data.

---

## 9. References

- [Frappe Security Best Practices](https://frappeframework.com/docs/user/en/basics/security)
- [Frappe Permission System](https://frappeframework.com/docs/user/en/guides/security/permissions)
- [Frappe Whitelisting](https://frappeframework.com/docs/user/en/api/server/index#whitelisting)

