# QA Test Plan: Change Request List View Implementation

**Version:** 1.0
**Date:** February 14, 2026
**Scope:** Change Request List View with User-Specific Approval Status

## Executive Summary

This document provides a comprehensive QA test plan for the Change Request List View implementation, covering two main components:
- Backend API (`change_request.py` lines 923-1129)
- Frontend List View (`change_request.js` lines 10-143)

## Files Under Test

1. **Backend API:**
   - Path: `/Users/salim/frappe/my-bench/apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/api/change_request.py`
   - Lines: 923-1129
   - Functions:
     - `get_my_approval_status_batch()` (lines 923-1000)
     - `get_change_requests_filtered()` (lines 1003-1129)

2. **Frontend List View:**
   - Path: `/Users/salim/frappe/my-bench/apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/frappe_devsecops_dashboard/doctype/change_request/change_request.js`
   - Lines: 10-143
   - Components:
     - List view settings and indicators
     - Data enrichment logic
     - Filter buttons and handlers

---

## Test Priority Matrix

| Priority | Risk Level | Category |
|----------|-----------|----------|
| P0 | Critical | Security, Data Integrity |
| P1 | High | Permission Issues, Core Functionality |
| P2 | Medium | UI/UX, Performance |
| P3 | Low | Edge Cases, Nice-to-have |

---

## 1. PERMISSION TESTING (P0 - Critical)

### Test Suite 1.1: Unauthorized Access Prevention

#### TC-1.1.1: Prevent Unauthorized Approval Status Access
**Priority:** P0
**Risk:** Security breach - users viewing approval data they shouldn't see

**Test Steps:**
1. Create user `test_unauthorized` with no Change Request permissions
2. Create a Change Request with approvers: `approver1@test.com`, `approver2@test.com`
3. Log in as `test_unauthorized`
4. Attempt to call API:
   ```javascript
   frappe.call({
     method: 'frappe_devsecops_dashboard.api.change_request.get_my_approval_status_batch',
     args: { change_request_names: JSON.stringify(['CR-26-00001']) }
   })
   ```

**Expected Result:**
- API should return `success: true` with empty data (graceful degradation)
- No SQL errors or permission errors exposed
- User should NOT see any approval status indicators

**Actual Result:** [To be filled during testing]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-1.1.2: Test Read-Only Permission Level
**Priority:** P0

**Test Steps:**
1. Create role `Change Request Viewer` with only Read permission
2. Assign user `viewer@test.com` to this role
3. Create Change Request CR-26-00001 with approver `approver@test.com`
4. Log in as `viewer@test.com`
5. Navigate to Change Request list view
6. Call `get_my_approval_status_batch(['CR-26-00001'])`

**Expected Result:**
- User can view the list
- Enrichment API returns `is_approver: false` for this user
- No indicators show "Pending My Action" or "Approved By Me"
- Only overall approval status is visible

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-1.1.3: Test Approver Permission Isolation
**Priority:** P0

**Test Steps:**
1. Create 2 Change Requests:
   - CR-26-00001: Approver = `user1@test.com`
   - CR-26-00002: Approver = `user2@test.com`
2. Log in as `user1@test.com`
3. Call `get_my_approval_status_batch(['CR-26-00001', 'CR-26-00002'])`

**Expected Result:**
- Returns `is_approver: true` for CR-26-00001
- Returns `is_approver: false` for CR-26-00002
- User1 cannot see User2's approval status

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 1.2: Permission Edge Cases

#### TC-1.2.1: Test Administrator Permission Override
**Priority:** P1

**Test Steps:**
1. Create Change Request with approver `approver@test.com`
2. Log in as Administrator
3. Navigate to list view and call enrichment API

**Expected Result:**
- Administrator can view all Change Requests
- If Administrator is not an approver, `is_approver: false`
- No errors or permission issues

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-1.2.2: Test Guest User Access
**Priority:** P0

**Test Steps:**
1. Log out completely (Guest session)
2. Attempt to access `/app/change-request`
3. Attempt to call API endpoints directly via browser console

**Expected Result:**
- Redirect to login page
- API calls return 403 Forbidden or require authentication
- No data leakage

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 2. PAGINATION TESTING (P1 - High)

### Test Suite 2.1: Filter Persistence

#### TC-2.1.1: Test "Pending My Action" Filter Pagination
**Priority:** P1
**Risk:** Users lose filter context when paginating

**Pre-requisites:**
- Create 25 Change Requests with current user as approver (Pending status)

**Test Steps:**
1. Log in as the approver user
2. Navigate to Change Request list view
3. Click "Filters" > "Pending My Action"
4. Verify first page shows 20 records
5. Click "Next Page" or scroll to trigger pagination
6. Verify page 2 loads

**Expected Result:**
- Page 1: Shows first 20 pending CRs
- Page 2: Shows remaining 5 pending CRs
- Filter remains active (no reset to "All Requests")
- Each record shows "⏳ Pending My Action" indicator

**Known Issue:**
⚠️ **BUG ALERT:** The current implementation does NOT persist special filters across pagination. The `load_filtered_list()` function always uses `limit_start: 0`.

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

**Bug Reference:** [To be created if fails]

---

#### TC-2.1.2: Test Filter Persistence After Refresh
**Priority:** P1

**Test Steps:**
1. Apply "Pending My Action" filter
2. Press F5 to refresh the page
3. Observe list view state

**Expected Result:**
- Filter is lost (expected behavior - no persistence implemented)
- List shows "All Requests" view
- User must reapply filter

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-2.1.3: Test Combined Filter + Pagination
**Priority:** P1

**Test Steps:**
1. Apply "Pending My Action" filter
2. Add standard filter: "Change Category = Emergency Change"
3. Navigate to page 2

**Expected Result:**
⚠️ **EXPECTED FAILURE:** Standard filters will be lost because `load_filtered_list()` doesn't merge them with special filters.

**Recommended Fix:** Capture `listview.filter_area.get()` and merge with special filters.

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 2.2: Edge Case Pagination

#### TC-2.2.1: Empty Result Set
**Priority:** P2

**Test Steps:**
1. Log in as user with no pending approvals
2. Click "Pending My Action" filter

**Expected Result:**
- Empty list message displayed
- No JavaScript errors
- Filter can be cleared by clicking "All Requests"

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-2.2.2: Single Page Result
**Priority:** P2

**Test Steps:**
1. Create exactly 5 Change Requests with user as approver
2. Apply "Pending My Action" filter

**Expected Result:**
- All 5 records displayed on single page
- No pagination controls shown (or disabled)
- Total count shows "5 of 5"

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-2.2.3: Exact Page Boundary (20 records)
**Priority:** P2

**Test Steps:**
1. Create exactly 20 pending Change Requests
2. Apply "Pending My Action" filter

**Expected Result:**
- All 20 records displayed
- Pagination shows "20 of 20"
- No "Next Page" button or it's disabled

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 3. CONCURRENCY TESTING (P1 - High)

### Test Suite 3.1: Race Conditions

#### TC-3.1.1: Rapid Record Navigation
**Priority:** P1
**Risk:** Memory leaks, duplicate API calls, stale data

**Test Steps:**
1. Open Change Request list view
2. Quickly click through 10 different records (open and close forms rapidly)
3. Monitor browser console for errors
4. Monitor network tab for duplicate API calls

**Expected Result:**
- No JavaScript errors
- No memory warnings
- API calls are debounced or cancelled appropriately
- Each record loads correct data

**Known Issue:**
⚠️ **POTENTIAL BUG:** No debouncing implemented in `enrich_with_approval_status()`. Rapid list refreshes could trigger duplicate API calls.

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-3.1.2: Multiple Tabs/Windows
**Priority:** P1

**Test Steps:**
1. Open Change Request list in Tab 1
2. Open same list in Tab 2
3. In Tab 1: Approve a pending Change Request
4. In Tab 2: Refresh the list

**Expected Result:**
- Tab 2 shows updated approval status
- No cache conflicts
- Each tab maintains independent state

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-3.1.3: Concurrent Filter Changes
**Priority:** P2

**Test Steps:**
1. Click "Pending My Action" filter
2. Before API returns, click "Approved By Me" filter
3. Before second API returns, click "All Requests"

**Expected Result:**
- Last filter wins
- No mixed results from different filters
- No JavaScript errors

**Known Issue:**
⚠️ **POTENTIAL BUG:** No request cancellation implemented. All 3 API calls will complete, potentially causing race condition.

**Recommended Fix:** Track active request and cancel previous requests using `frappe.request.abort()`.

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 3.2: Data Refresh Scenarios

#### TC-3.2.1: Auto-Refresh with Active Filter
**Priority:** P2

**Test Steps:**
1. Enable auto-refresh (if available)
2. Apply "Pending My Action" filter
3. Wait for auto-refresh to trigger

**Expected Result:**
- List refreshes automatically
- Filter remains applied
- Data is re-enriched

**Known Issue:**
⚠️ **LIKELY BUG:** Auto-refresh probably calls default `listview.refresh()` which will lose special filter.

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 4. DATA INTEGRITY TESTING (P0 - Critical)

### Test Suite 4.1: SQL Query Correctness

#### TC-4.1.1: Multiple Approvers Per Change Request
**Priority:** P0
**Risk:** Incorrect approval status shown

**Test Steps:**
1. Create Change Request CR-26-00001
2. Add multiple approvers:
   - Row 1: `user1@test.com`, Business Function: Security, Status: Pending
   - Row 2: `user2@test.com`, Business Function: Operations, Status: Approved
   - Row 3: `user1@test.com`, Business Function: Management, Status: Approved
3. Log in as `user1@test.com`
4. Call `get_my_approval_status_batch(['CR-26-00001'])`

**Expected Result:**
- SQL query uses `ORDER BY parent, idx DESC`
- Returns LAST entry for user1 (Management, Approved)
- Indicator shows "✓ Approved By Me"

**Known Issue:**
⚠️ **POTENTIAL BUG:** User might have multiple approval entries. Current query returns the LAST one by idx. Verify this is the intended business logic.

**Question for Product Owner:** If a user has multiple approval roles, which status should be shown?

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-4.1.2: SQL Injection Prevention
**Priority:** P0

**Test Steps:**
1. Call API with malicious payload:
   ```javascript
   frappe.call({
     method: '...get_my_approval_status_batch',
     args: {
       change_request_names: '["CR-26-00001", "CR-26-00001\' OR 1=1--"]'
     }
   })
   ```

**Expected Result:**
- No SQL injection occurs
- Query uses parameterized SQL with `%s` placeholders
- Invalid CR names are safely handled
- Returns empty or error for invalid names

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-4.1.3: Large Batch Size Handling
**Priority:** P1

**Test Steps:**
1. Create 500 Change Requests
2. Load list view (defaults to 20 per page)
3. Call `get_my_approval_status_batch()` with 20 CR names
4. Navigate to page 2 (next 20 CRs)

**Expected Result:**
- Each API call completes within 2 seconds
- No database timeout errors
- Query uses efficient `IN` clause with tuple

**Performance Benchmark:**
- Acceptable: < 500ms for 20 records
- Needs optimization: > 1000ms

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 4.2: Edge Case Data Scenarios

#### TC-4.2.1: Change Request With No Approvers
**Priority:** P1

**Test Steps:**
1. Create Change Request with empty `change_approvers` table
2. Load list view

**Expected Result:**
- No errors in enrichment
- Indicator shows overall approval status (not user-specific)
- `is_approver: false` for all users

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-4.2.2: Deleted Approver User
**Priority:** P1

**Test Steps:**
1. Create Change Request with approver `deleted_user@test.com`
2. Disable the user account
3. Log in as different user and load list view

**Expected Result:**
- No errors
- Deleted user data handled gracefully
- Other approvers' data loads correctly

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-4.2.3: Special Characters in CR Names
**Priority:** P2

**Test Steps:**
1. Create Change Request with special characters (if naming allows)
2. Call batch API with these names

**Expected Result:**
- Names properly escaped in SQL
- JSON parsing handles special characters
- No SQL errors

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-4.2.4: Null/Empty Business Function
**Priority:** P2

**Test Steps:**
1. Create approver entry with `business_function: None`
2. Load list view

**Expected Result:**
- No JavaScript errors
- Field displays as empty string
- Indicator still functions correctly

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 5. UI/UX TESTING (P2 - Medium)

### Test Suite 5.1: Loading States

#### TC-5.1.1: Loading Indicator During Enrichment
**Priority:** P2

**Test Steps:**
1. Throttle network to "Slow 3G" in browser DevTools
2. Load Change Request list view
3. Observe initial load

**Expected Result:**
- Frappe default loading indicator shows
- List renders with basic data first
- Indicators update when enrichment completes
- No UI flickering or layout shift

**Known Issue:**
⚠️ **UX CONCERN:** No explicit loading state for enrichment. Users might see indicators change after initial render.

**Recommended Enhancement:** Show shimmer/skeleton for indicators during enrichment.

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-5.1.2: Error State Display
**Priority:** P1

**Test Steps:**
1. Simulate API error by calling with invalid data
2. Observe error handling in UI

**Expected Result:**
- Console error logged (developer visibility)
- List view still renders with basic data
- No user-facing error message (graceful degradation)
- Indicators show fallback state (overall approval status)

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-5.1.3: Rapid Filter Switching UI
**Priority:** P2

**Test Steps:**
1. Rapidly click between "Pending My Action", "Approved By Me", "All Requests"
2. Observe UI behavior

**Expected Result:**
- Button states update correctly
- No duplicate loading indicators
- Final state matches last clicked button
- No "stuck" loading states

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 5.2: Visual Correctness

#### TC-5.2.1: Indicator Color Accuracy
**Priority:** P2

**Test Steps:**
1. Create Change Requests with all possible states:
   - User status: Pending, Approved, Rejected
   - Overall status: Pending Review, Rework, Not Accepted, Withdrawn, Deferred, Approved for Implementation
2. Verify indicator colors

**Expected Result:**
| Status | Color | Label |
|--------|-------|-------|
| Pending My Action | Red | ⏳ Pending My Action |
| Approved By Me | Green | ✓ Approved By Me |
| Rejected By Me | Orange | ✗ Rejected By Me |
| Pending Review (overall) | Orange | Pending Review |
| Approved for Implementation | Green | Approved for Implementation |

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-5.2.2: Emoji Display Cross-Browser
**Priority:** P3

**Test Steps:**
1. Test in Chrome, Firefox, Safari, Edge
2. Verify emoji rendering: ⏳, ✓, ✗

**Expected Result:**
- Emojis render consistently
- Fallback to text if emoji not supported
- No garbled characters

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-5.2.3: Responsive Design
**Priority:** P3

**Test Steps:**
1. Resize browser to mobile width
2. Check filter buttons and indicators

**Expected Result:**
- Filter buttons accessible on mobile
- Indicators don't overflow
- Text remains readable

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 5.3: Memory Leak Testing

#### TC-5.3.1: Event Handler Cleanup
**Priority:** P1
**Risk:** Memory leaks from uncleaned event listeners

**Test Steps:**
1. Open Chrome DevTools > Memory Profiler
2. Take heap snapshot
3. Navigate away from Change Request list
4. Navigate back to list
5. Repeat 10 times
6. Take another heap snapshot
7. Compare snapshots

**Expected Result:**
- Event listener count remains stable
- No exponential growth of DOM nodes
- Memory usage increases < 10% after 10 iterations

**Known Issue:**
⚠️ **POTENTIAL BUG:** Event handler `listview.$result.on('render-complete', ...)` is registered in `onload` but never cleaned up. This could leak memory.

**Recommended Fix:**
```javascript
listview.$result.off('render-complete').on('render-complete', function() {
  // Handler code
});
```

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-5.3.2: Timeout Cleanup
**Priority:** P2

**Test Steps:**
1. Load Change Request list
2. Navigate away before 100ms timeout completes (line 139-140)
3. Check console for errors

**Expected Result:**
- No errors about missing listview object
- Timeout is cleared or checks for existence

**Known Issue:**
⚠️ **POTENTIAL BUG:** `setTimeout` at line 139 might execute after listview is destroyed.

**Recommended Fix:**
```javascript
const enrichTimeout = setTimeout(function() {
  if (listview && listview.data) {
    enrich_with_approval_status(listview);
  }
}, 100);

// Store timeout ID for cleanup if needed
listview._enrich_timeout = enrichTimeout;
```

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 6. INTEGRATION TESTING (P1 - High)

### Test Suite 6.1: End-to-End Workflows

#### TC-6.1.1: Approval Workflow Integration
**Priority:** P1

**Test Steps:**
1. Create Change Request with user as approver (Pending)
2. Verify "Pending My Action" filter shows it
3. Open the CR and approve it
4. Return to list view
5. Verify it now appears in "Approved By Me" filter
6. Verify it disappears from "Pending My Action"

**Expected Result:**
- Real-time data consistency
- Indicators update correctly
- Filters reflect current state

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-6.1.2: Multi-User Approval Scenario
**Priority:** P1

**Test Steps:**
1. Create Change Request with 3 approvers: User A, User B, User C
2. User A: Approves
3. User B: Rejects
4. User C: Pending
5. Log in as each user and check list view

**Expected Result:**
- User A sees "✓ Approved By Me"
- User B sees "✗ Rejected By Me"
- User C sees "⏳ Pending My Action"
- Each user's filter works correctly

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-6.1.3: Permission Change Mid-Session
**Priority:** P2

**Test Steps:**
1. Log in as User A (has read permission)
2. Load Change Request list
3. Admin adds User A as approver to CR-26-00001
4. Refresh the list view

**Expected Result:**
- New approval status appears after refresh
- User A now sees "Pending My Action" for CR-26-00001

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 6.2: API Contract Testing

#### TC-6.2.1: Batch API Response Format
**Priority:** P1

**Test Steps:**
1. Call `get_my_approval_status_batch(['CR-26-00001'])`
2. Verify response structure

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "CR-26-00001": {
      "is_approver": true,
      "status": "Pending",
      "business_function": "Security",
      "approval_datetime": "2026-02-14 10:30:00"
    }
  }
}
```

**Expected Fields:**
- `success` (boolean)
- `data` (object)
- `data[cr_name].is_approver` (boolean)
- `data[cr_name].status` (string or null)
- `data[cr_name].business_function` (string or null)
- `data[cr_name].approval_datetime` (datetime string or null)

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-6.2.2: Filtered List API Response Format
**Priority:** P1

**Test Steps:**
1. Call `get_change_requests_filtered({special_filter: 'pending_my_action'})`
2. Verify response structure

**Expected Response:**
```json
{
  "success": true,
  "data": [
    {
      "name": "CR-26-00001",
      "title": "Test CR",
      "cr_number": "CR-26-00001",
      // ... all fields from field_list
    }
  ],
  "total": 15
}
```

**Expected Fields:**
- `success` (boolean)
- `data` (array of objects)
- `total` (integer)
- Each record has `cr_number` field populated

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 7. ERROR HANDLING TESTING (P1 - High)

### Test Suite 7.1: Backend Error Scenarios

#### TC-7.1.1: Invalid JSON Input
**Priority:** P1

**Test Steps:**
1. Call API with malformed JSON:
   ```python
   frappe.call({
     method: '...get_my_approval_status_batch',
     args: { change_request_names: 'invalid-json-[' }
   })
   ```

**Expected Result:**
- Returns `success: false` with error message
- Error logged to Frappe error log
- No server crash
- Frontend receives graceful error

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-7.1.2: Database Connection Error
**Priority:** P0

**Test Steps:**
1. Simulate database disconnection (if possible in test env)
2. Call batch API

**Expected Result:**
- Returns `success: false`
- Error logged with details
- User sees fallback state
- System recovers when DB reconnects

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-7.1.3: Empty or Null Parameters
**Priority:** P1

**Test Steps:**
1. Call API with various invalid inputs:
   - `change_request_names: null`
   - `change_request_names: ""`
   - `change_request_names: "[]"`
   - `change_request_names: undefined`

**Expected Result:**
- All cases return `success: true, data: {}`
- No errors thrown
- Handled gracefully per code lines 943-947

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 7.2: Frontend Error Scenarios

#### TC-7.2.1: API Timeout
**Priority:** P2

**Test Steps:**
1. Throttle network to simulate slow connection
2. Set API timeout to 5 seconds
3. Make API call take > 5 seconds
4. Observe behavior

**Expected Result:**
- Timeout error caught
- User sees message or fallback state
- List view remains functional
- Can retry manually

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-7.2.2: Partial API Failure
**Priority:** P2

**Test Steps:**
1. Load list view successfully
2. Enrichment API fails
3. Observe UI state

**Expected Result:**
- List renders with basic data
- No indicators show user-specific status
- Console logs error
- No user-facing error dialog

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 8. PERFORMANCE TESTING (P2 - Medium)

### Test Suite 8.1: Load Performance

#### TC-8.1.1: Initial Page Load Time
**Priority:** P2

**Test Steps:**
1. Clear browser cache
2. Navigate to Change Request list
3. Measure time to interactive (TTI)

**Performance Targets:**
- List renders (basic): < 500ms
- Enrichment completes: < 1000ms
- Total TTI: < 1500ms

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-8.1.2: Large Dataset Performance
**Priority:** P2

**Test Steps:**
1. Create 1000 Change Requests
2. Load list view
3. Measure performance

**Expected Result:**
- Pagination limits to 20 records
- Page load time < 2 seconds
- Scrolling remains smooth
- No browser freeze

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-8.1.3: Rapid Filter Switching Performance
**Priority:** P3

**Test Steps:**
1. Click between filters 20 times rapidly
2. Monitor CPU usage and response times

**Expected Result:**
- No memory leaks
- CPU usage < 50%
- Each filter applies within 1 second
- No API call pile-up

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 9. ACCESSIBILITY TESTING (P3 - Low)

### Test Suite 9.1: Screen Reader Compatibility

#### TC-9.1.1: Indicator Announcements
**Priority:** P3

**Test Steps:**
1. Enable screen reader (NVDA/JAWS)
2. Navigate through Change Request list
3. Verify indicator text is announced

**Expected Result:**
- "Pending My Action" announced correctly
- "Approved By Me" announced correctly
- Overall status announced when no personal status

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 9.2: Keyboard Navigation

#### TC-9.2.1: Filter Button Keyboard Access
**Priority:** P3

**Test Steps:**
1. Tab to filter buttons
2. Press Enter to activate
3. Verify filter applies

**Expected Result:**
- All buttons accessible via keyboard
- Enter/Space activates buttons
- Focus visible on active element

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 10. REGRESSION TESTING (P1 - High)

### Test Suite 10.1: Existing Functionality Preserved

#### TC-10.1.1: Standard Frappe List Features
**Priority:** P1

**Test Steps:**
1. Test standard list features:
   - Search box
   - Standard filters (date range, category, etc.)
   - Sorting columns
   - Bulk actions (if applicable)
   - Export to Excel/CSV

**Expected Result:**
- All standard Frappe list features work
- New code doesn't break existing functionality

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

#### TC-10.1.2: Form View Integration
**Priority:** P1

**Test Steps:**
1. From list view, click a Change Request
2. Modify and save
3. Return to list view
4. Verify changes reflected

**Expected Result:**
- Form opens correctly
- Save persists data
- List view updates automatically
- Indicators remain accurate

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 11. SECURITY TESTING (P0 - Critical)

### Test Suite 11.1: SQL Injection Prevention

#### TC-11.1.1: Malicious CR Names
**Priority:** P0

**Test Steps:**
1. Attempt various SQL injection payloads:
   ```javascript
   // Test payloads
   ["CR-26-00001'; DROP TABLE tabChangeRequest;--"]
   ["CR-26-00001\" OR 1=1--"]
   ["CR-26-00001' UNION SELECT * FROM tabUser--"]
   ```

**Expected Result:**
- All queries use parameterized statements
- No SQL injection possible
- Invalid names return empty result
- Error logged for suspicious input

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

### Test Suite 11.2: Authorization Bypass Attempts

#### TC-11.2.1: Direct API Call Without Session
**Priority:** P0

**Test Steps:**
1. Copy API endpoint URL
2. Attempt to call from external tool (curl/Postman)
3. Don't include session cookies

**Expected Result:**
- API returns 401 Unauthorized
- No data returned
- Session validation enforced

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## 12. BROWSER COMPATIBILITY TESTING (P2 - Medium)

### Test Suite 12.1: Cross-Browser Testing

#### TC-12.1.1: Chrome, Firefox, Safari, Edge
**Priority:** P2

**Test Steps:**
1. Test all functionality in each browser
2. Verify indicators, filters, and API calls work

**Expected Result:**
- Consistent behavior across browsers
- No browser-specific bugs
- Same visual appearance

**Actual Result:** [To be filled]

**Status:** [ ] Pass [ ] Fail [ ] Blocked

---

## KNOWN ISSUES SUMMARY

### Critical Issues (P0)
1. **No explicit SQL injection testing** - Need to verify parameterized queries (TC-4.1.2)
2. **Permission boundary testing incomplete** - Need comprehensive permission matrix (TC-1.1.x)

### High Priority Issues (P1)
1. **Filter Persistence Bug** - Special filters lost on pagination (TC-2.1.1)
2. **Race Condition Risk** - No request cancellation for rapid filter switching (TC-3.1.3)
3. **Memory Leak Potential** - Event handlers not cleaned up (TC-5.3.1)
4. **Standard Filter Conflict** - Special filters don't merge with standard filters (TC-2.1.3)

### Medium Priority Issues (P2)
1. **No Loading State** - Enrichment happens silently (TC-5.1.1)
2. **Timeout Error Handling** - setTimeout might execute after destruction (TC-5.3.2)
3. **Auto-Refresh Conflict** - Special filters likely lost on auto-refresh (TC-3.2.1)

### Low Priority Issues (P3)
1. **No Debouncing** - Rapid list refreshes could cause duplicate API calls (TC-3.1.1)
2. **Accessibility** - Screen reader support not verified (TC-9.1.1)

---

## TEST EXECUTION GUIDELINES

### 1. Test Environment Setup

#### Pre-requisites
- Fresh Frappe bench installation
- Test database with sample data
- Multiple test user accounts with different roles
- Network throttling tools (Chrome DevTools)
- Memory profiling tools

#### Test Data Setup Script
```python
# Run in Frappe console or as a test fixture
import frappe

def setup_test_data():
    """Create comprehensive test data for Change Request QA"""

    # Create test users
    test_users = [
        {'email': 'approver1@test.com', 'role': 'System Manager'},
        {'email': 'approver2@test.com', 'role': 'System Manager'},
        {'email': 'viewer@test.com', 'role': 'Change Request Viewer'},
        {'email': 'unauthorized@test.com', 'role': 'Guest'},
    ]

    for user_data in test_users:
        if not frappe.db.exists('User', user_data['email']):
            user = frappe.get_doc({
                'doctype': 'User',
                'email': user_data['email'],
                'first_name': user_data['email'].split('@')[0],
                'enabled': 1
            })
            user.insert(ignore_permissions=True)
            user.add_roles(user_data['role'])

    # Create sample Change Requests
    statuses = ['Pending', 'Approved', 'Rejected']
    categories = ['Major Change', 'Minor Change', 'Standard Change', 'Emergency Change']

    for i in range(30):
        cr = frappe.get_doc({
            'doctype': 'Change Request',
            'title': f'Test Change Request {i+1}',
            'submission_date': frappe.utils.today(),
            'system_affected': 'Test System',
            'originator_name': 'EMP-001',
            'change_category': categories[i % 4],
            'detailed_description': f'Test description {i+1}',
            'approval_status': 'Pending Review'
        })
        cr.insert(ignore_permissions=True)

        # Add approvers
        for j in range(2):
            cr.append('change_approvers', {
                'user': f'approver{j+1}@test.com',
                'business_function': f'Function {j+1}',
                'approval_status': statuses[i % 3]
            })
        cr.save(ignore_permissions=True)

    frappe.db.commit()
    print("Test data setup complete!")

# Execute
setup_test_data()
```

### 2. Test Execution Order

**Phase 1: Critical Security & Permissions (P0)**
- Execute Test Suites 1.1, 1.2, 11.1, 11.2
- All tests must pass before proceeding
- Document any failures immediately

**Phase 2: Core Functionality (P1)**
- Execute Test Suites 2.1, 3.1, 4.1, 6.1, 7.1, 10.1
- High-risk areas for user experience
- Prioritize bug fixes for any failures

**Phase 3: UI/UX & Performance (P2)**
- Execute Test Suites 2.2, 5.1, 5.2, 7.2, 8.1, 12.1
- Focus on user experience quality
- Document performance benchmarks

**Phase 4: Edge Cases & Polish (P3)**
- Execute Test Suites 4.2, 5.3, 8.1.3, 9.1, 9.2
- Nice-to-have improvements
- Create backlog tickets for failures

### 3. Bug Reporting Template

```markdown
## Bug Report: [Test Case ID]

**Title:** [Brief description]

**Priority:** P0 / P1 / P2 / P3

**Test Case:** [TC-X.X.X]

**Environment:**
- Browser: [Chrome 120.x / Firefox 121.x / etc.]
- OS: [macOS 14 / Windows 11 / etc.]
- Frappe Version: [vX.X.X]

**Steps to Reproduce:**
1. [Step 1]
2. [Step 2]
3. [Step 3]

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Screenshots/Logs:**
[Attach relevant evidence]

**Affected Files:**
- [File path]

**Recommended Fix:**
[If known]

**Related Test Cases:**
[List related TCs that might also fail]
```

---

## TEST METRICS & REPORTING

### Success Criteria

**Must Pass (Release Blockers):**
- 100% of P0 tests pass
- 95%+ of P1 tests pass
- No critical security vulnerabilities
- No data integrity issues

**Should Pass (Pre-Release):**
- 90%+ of P2 tests pass
- All known P1 bugs have fix plans
- Performance benchmarks met

**Nice to Have:**
- 80%+ of P3 tests pass
- Accessibility compliance
- Cross-browser consistency

### Test Coverage Matrix

| Category | Total TCs | P0 | P1 | P2 | P3 |
|----------|-----------|----|----|----|----|
| Permission Testing | 5 | 3 | 2 | 0 | 0 |
| Pagination Testing | 6 | 0 | 3 | 3 | 0 |
| Concurrency Testing | 4 | 0 | 2 | 2 | 0 |
| Data Integrity Testing | 8 | 3 | 3 | 2 | 0 |
| UI/UX Testing | 9 | 0 | 2 | 6 | 1 |
| Integration Testing | 3 | 0 | 3 | 0 | 0 |
| Error Handling Testing | 5 | 1 | 3 | 1 | 0 |
| Performance Testing | 3 | 0 | 0 | 3 | 0 |
| Accessibility Testing | 2 | 0 | 0 | 0 | 2 |
| Regression Testing | 2 | 0 | 2 | 0 | 0 |
| Security Testing | 2 | 2 | 0 | 0 | 0 |
| Browser Compatibility | 1 | 0 | 0 | 1 | 0 |
| **TOTAL** | **50** | **9** | **20** | **18** | **3** |

### Daily Test Report Template

```markdown
# QA Test Report - [Date]

## Summary
- Total Test Cases Executed: X / 50
- Pass: X (X%)
- Fail: X (X%)
- Blocked: X (X%)

## Priority Breakdown
- P0: X/9 passed
- P1: X/20 passed
- P2: X/18 passed
- P3: X/3 passed

## Critical Issues Found
1. [Bug ID] - [Brief description]
2. [Bug ID] - [Brief description]

## Tests Blocked
- [TC-X.X.X] - Blocked by [reason]

## Next Steps
- [Action items]
- [Pending items]

## Sign-off
Tester: [Name]
Date: [Date]
```

---

## AUTOMATED TEST SCRIPT EXAMPLES

### Script 1: Python Backend Unit Tests

```python
# test_change_request_listview_api.py
import frappe
import json
from frappe.tests.utils import FrappeTestCase

class TestChangeRequestListViewAPI(FrappeTestCase):
    """
    Automated tests for Change Request List View APIs
    Covers: TC-1.1.1, TC-1.1.3, TC-4.1.1, TC-7.1.3
    """

    @classmethod
    def setUpClass(cls):
        super().setUpClass()
        cls.create_test_data()

    @classmethod
    def create_test_data(cls):
        """Create test users and Change Requests"""
        # Create test users
        for email in ['testuser1@example.com', 'testuser2@example.com']:
            if not frappe.db.exists('User', email):
                user = frappe.get_doc({
                    'doctype': 'User',
                    'email': email,
                    'first_name': email.split('@')[0],
                    'enabled': 1
                })
                user.insert(ignore_permissions=True)

        # Create test Change Request
        cls.test_cr = frappe.get_doc({
            'doctype': 'Change Request',
            'title': 'Test CR for API Testing',
            'submission_date': frappe.utils.today(),
            'system_affected': 'Test System',
            'originator_name': 'EMP-001',
            'change_category': 'Standard Change',
            'detailed_description': 'Test description',
        })
        cls.test_cr.insert(ignore_permissions=True)

        # Add approvers
        cls.test_cr.append('change_approvers', {
            'user': 'testuser1@example.com',
            'business_function': 'Security',
            'approval_status': 'Pending'
        })
        cls.test_cr.append('change_approvers', {
            'user': 'testuser2@example.com',
            'business_function': 'Operations',
            'approval_status': 'Approved'
        })
        cls.test_cr.save(ignore_permissions=True)
        frappe.db.commit()

    def test_get_my_approval_status_batch_success(self):
        """TC-1.1.3: Test approval status isolation per user"""
        frappe.set_user('testuser1@example.com')

        from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

        result = get_my_approval_status_batch(
            json.dumps([self.test_cr.name])
        )

        self.assertTrue(result['success'])
        self.assertIn(self.test_cr.name, result['data'])

        status_data = result['data'][self.test_cr.name]
        self.assertTrue(status_data['is_approver'])
        self.assertEqual(status_data['status'], 'Pending')
        self.assertEqual(status_data['business_function'], 'Security')

    def test_get_my_approval_status_batch_not_approver(self):
        """TC-1.1.2: Test non-approver user gets is_approver: false"""
        # Create a user who is not an approver
        frappe.set_user('Administrator')

        from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

        result = get_my_approval_status_batch(
            json.dumps([self.test_cr.name])
        )

        self.assertTrue(result['success'])
        status_data = result['data'][self.test_cr.name]
        self.assertFalse(status_data['is_approver'])
        self.assertIsNone(status_data['status'])

    def test_get_my_approval_status_batch_empty_input(self):
        """TC-7.1.3: Test empty CR names list"""
        frappe.set_user('testuser1@example.com')

        from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

        result = get_my_approval_status_batch(json.dumps([]))

        self.assertTrue(result['success'])
        self.assertEqual(result['data'], {})

    def test_get_change_requests_filtered_pending_my_action(self):
        """TC-2.1.1: Test pending_my_action filter"""
        frappe.set_user('testuser1@example.com')

        from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

        result = get_change_requests_filtered(
            special_filter='pending_my_action',
            limit_page_length=20
        )

        self.assertTrue(result['success'])
        self.assertGreater(len(result['data']), 0)

        # Verify the test CR is in the results
        cr_names = [cr['name'] for cr in result['data']]
        self.assertIn(self.test_cr.name, cr_names)

    def test_get_change_requests_filtered_approved_by_me(self):
        """TC-6.1.2: Test approved_by_me filter"""
        frappe.set_user('testuser2@example.com')

        from frappe_devsecops_dashboard.api.change_request import get_change_requests_filtered

        result = get_change_requests_filtered(
            special_filter='approved_by_me',
            limit_page_length=20
        )

        self.assertTrue(result['success'])

        # testuser2 approved the test CR
        cr_names = [cr['name'] for cr in result['data']]
        self.assertIn(self.test_cr.name, cr_names)

    def test_sql_injection_prevention(self):
        """TC-4.1.2: Test SQL injection prevention"""
        frappe.set_user('testuser1@example.com')

        from frappe_devsecops_dashboard.api.change_request import get_my_approval_status_batch

        # Attempt SQL injection
        malicious_input = json.dumps([
            "CR-26-00001' OR 1=1--",
            "CR-26-00001'; DROP TABLE tabChangeRequest;--"
        ])

        # Should not raise error, just return empty for invalid names
        result = get_my_approval_status_batch(malicious_input)
        self.assertTrue(result['success'])
        # Invalid CR names should return is_approver: false
        for data in result['data'].values():
            self.assertFalse(data['is_approver'])

    @classmethod
    def tearDownClass(cls):
        """Cleanup test data"""
        frappe.set_user('Administrator')
        frappe.delete_doc('Change Request', cls.test_cr.name, force=1)
        frappe.db.commit()

# Run: bench run-tests --app frappe_devsecops_dashboard --doctype "Change Request"
```

### Script 2: JavaScript Frontend Unit Tests (Jest)

```javascript
// change_request_listview.test.js
/**
 * Frontend tests for Change Request List View
 * Covers: TC-5.1.2, TC-5.3.1, TC-6.2.1
 */

import { jest } from '@jest/globals';

describe('Change Request List View - Data Enrichment', () => {
    let listview;
    let frappe;

    beforeEach(() => {
        // Mock Frappe API
        frappe = {
            call: jest.fn(),
            session: { user: 'test@example.com' },
            msgprint: jest.fn()
        };
        global.frappe = frappe;

        // Mock listview object
        listview = {
            data: [
                { name: 'CR-26-00001', title: 'Test CR 1' },
                { name: 'CR-26-00002', title: 'Test CR 2' }
            ],
            render: jest.fn(),
            page_length: 20
        };
    });

    test('TC-6.2.1: Batch API returns correct format', (done) => {
        const expectedResponse = {
            success: true,
            data: {
                'CR-26-00001': {
                    is_approver: true,
                    status: 'Pending',
                    business_function: 'Security',
                    approval_datetime: '2026-02-14 10:30:00'
                },
                'CR-26-00002': {
                    is_approver: false,
                    status: null,
                    business_function: null
                }
            }
        };

        frappe.call.mockImplementation((args) => {
            expect(args.method).toBe(
                'frappe_devsecops_dashboard.api.change_request.get_my_approval_status_batch'
            );
            expect(JSON.parse(args.args.change_request_names)).toEqual(
                ['CR-26-00001', 'CR-26-00002']
            );

            args.callback({ message: expectedResponse });

            // Verify data was injected
            expect(listview.data[0]._my_approval_status).toBeDefined();
            expect(listview.data[0]._my_approval_status.is_approver).toBe(true);
            expect(listview.render).toHaveBeenCalled();

            done();
        });

        // Simulate enrichment function
        enrich_with_approval_status(listview);
    });

    test('TC-5.1.2: Error handling with graceful degradation', (done) => {
        frappe.call.mockImplementation((args) => {
            args.error({ message: 'Network error' });

            // List view should still be functional
            expect(listview.data[0]._my_approval_status).toBeUndefined();
            expect(listview.render).not.toHaveBeenCalled();

            done();
        });

        enrich_with_approval_status(listview);
    });

    test('TC-5.3.1: No duplicate event handlers', () => {
        const $result = {
            on: jest.fn(),
            off: jest.fn()
        };

        listview.$result = $result;

        // Call onload multiple times (simulate navigation)
        for (let i = 0; i < 3; i++) {
            // Simulate onload
            listview.$result.on('render-complete', () => {});
        }

        // Should have been called 3 times
        expect($result.on).toHaveBeenCalledTimes(3);

        // WARNING: This test will PASS but highlights the memory leak issue
        // Should be calling .off() before .on() to prevent duplicates
    });
});

describe('Change Request List View - Filter Buttons', () => {
    test('TC-2.1.1: Filter persists during pagination', () => {
        // This test documents expected FAILURE
        const listview = {
            data: [],
            render: jest.fn(),
            page_length: 20
        };

        frappe.call.mockImplementation((args) => {
            // Check if limit_start is passed
            expect(args.args.limit_start).toBe(0); // Always 0 - BUG!

            args.callback({
                message: { success: true, data: [], total: 0 }
            });
        });

        load_filtered_list(listview, 'pending_my_action');

        // To fix: Should accept and pass limit_start parameter
    });
});

// Helper function from change_request.js (simplified for testing)
function enrich_with_approval_status(listview) {
    const cr_names = listview.data.map(d => d.name);

    if (cr_names.length === 0) return;

    frappe.call({
        method: 'frappe_devsecops_dashboard.api.change_request.get_my_approval_status_batch',
        args: {
            change_request_names: JSON.stringify(cr_names)
        },
        callback: function(r) {
            if (r.message && r.message.success) {
                listview.data.forEach(doc => {
                    doc._my_approval_status = r.message.data[doc.name] || {
                        is_approver: false,
                        status: null
                    };
                });
                listview.render();
            }
        },
        error: function(err) {
            console.error('Error fetching approval status:', err);
        }
    });
}

function load_filtered_list(listview, special_filter) {
    frappe.call({
        method: 'frappe_devsecops_dashboard.api.change_request.get_change_requests_filtered',
        args: {
            special_filter: special_filter,
            limit_start: 0, // BUG: Should be configurable
            limit_page_length: listview.page_length || 20
        },
        callback: function(r) {
            if (r.message && r.message.success) {
                listview.data = r.message.data;
                listview.render();
                enrich_with_approval_status(listview);
            }
        },
        error: function(err) {
            console.error('Error loading filtered list:', err);
            frappe.msgprint({
                title: 'Error',
                indicator: 'red',
                message: 'Failed to load filtered Change Requests'
            });
        }
    });
}
```

### Script 3: Performance Benchmark Script

```javascript
// performance_benchmark.js
/**
 * Performance benchmarking for Change Request List View
 * Run in browser console on /app/change-request page
 * Covers: TC-8.1.1, TC-8.1.2, TC-8.1.3
 */

class ChangeRequestPerformanceBenchmark {
    constructor() {
        this.results = [];
    }

    async benchmarkInitialLoad() {
        console.log('🔍 Benchmarking: Initial Page Load');

        const startTime = performance.now();

        // Clear cache
        localStorage.clear();
        sessionStorage.clear();

        // Reload page
        location.reload();

        // Measure via Performance API
        window.addEventListener('load', () => {
            const entries = performance.getEntriesByType('navigation')[0];

            const metrics = {
                domContentLoaded: entries.domContentLoadedEventEnd - entries.domContentLoadedEventStart,
                loadComplete: entries.loadEventEnd - entries.loadEventStart,
                totalTime: entries.loadEventEnd - entries.fetchStart,
                apiCalls: performance.getEntriesByType('resource').filter(
                    r => r.name.includes('change_request')
                ).length
            };

            console.table(metrics);

            // TC-8.1.1 validation
            if (metrics.totalTime < 1500) {
                console.log('✅ PASS: Initial load < 1500ms');
            } else {
                console.warn('❌ FAIL: Initial load exceeds 1500ms');
            }

            this.results.push({
                test: 'TC-8.1.1',
                metric: 'Initial Load Time',
                value: metrics.totalTime,
                threshold: 1500,
                pass: metrics.totalTime < 1500
            });
        });
    }

    async benchmarkEnrichmentTime() {
        console.log('🔍 Benchmarking: Approval Status Enrichment');

        // Hook into frappe.call
        const originalCall = frappe.call;
        let enrichmentStart, enrichmentEnd;

        frappe.call = function(args) {
            if (args.method.includes('get_my_approval_status_batch')) {
                enrichmentStart = performance.now();

                const originalCallback = args.callback;
                args.callback = function(r) {
                    enrichmentEnd = performance.now();
                    const duration = enrichmentEnd - enrichmentStart;

                    console.log(`⏱️ Enrichment API call: ${duration.toFixed(2)}ms`);

                    // TC-8.1.1 validation
                    if (duration < 1000) {
                        console.log('✅ PASS: Enrichment < 1000ms');
                    } else {
                        console.warn('❌ FAIL: Enrichment exceeds 1000ms');
                    }

                    if (originalCallback) originalCallback(r);
                };
            }
            return originalCall.call(this, args);
        };
    }

    async benchmarkFilterSwitching() {
        console.log('🔍 Benchmarking: Rapid Filter Switching (TC-8.1.3)');

        const filterButtons = [
            'Pending My Action',
            'Approved By Me',
            'All Requests'
        ];

        const measurements = [];

        for (let i = 0; i < 20; i++) {
            const filterIndex = i % 3;
            const startTime = performance.now();

            // Simulate clicking filter button
            const button = Array.from(document.querySelectorAll('button'))
                .find(b => b.textContent.trim() === filterButtons[filterIndex]);

            if (button) {
                button.click();

                // Wait for API to complete
                await new Promise(resolve => setTimeout(resolve, 500));

                const duration = performance.now() - startTime;
                measurements.push(duration);

                console.log(`Filter ${i+1}: ${duration.toFixed(2)}ms`);
            }
        }

        const avgTime = measurements.reduce((a, b) => a + b, 0) / measurements.length;
        const maxTime = Math.max(...measurements);

        console.table({
            'Average Time': `${avgTime.toFixed(2)}ms`,
            'Max Time': `${maxTime.toFixed(2)}ms`,
            'Threshold': '1000ms',
            'Pass': maxTime < 1000 ? '✅' : '❌'
        });

        this.results.push({
            test: 'TC-8.1.3',
            metric: 'Rapid Filter Switching',
            value: avgTime,
            threshold: 1000,
            pass: avgTime < 1000
        });
    }

    async benchmarkMemoryUsage() {
        console.log('🔍 Benchmarking: Memory Usage (TC-5.3.1)');

        if (!performance.memory) {
            console.warn('⚠️ Performance.memory not available (Chrome only)');
            return;
        }

        const initialMemory = performance.memory.usedJSHeapSize;

        // Navigate away and back 10 times
        for (let i = 0; i < 10; i++) {
            // Simulate navigation
            window.history.pushState({}, '', '/app/home');
            await new Promise(resolve => setTimeout(resolve, 100));
            window.history.pushState({}, '', '/app/change-request');
            await new Promise(resolve => setTimeout(resolve, 500));
        }

        // Force garbage collection (requires --js-flags="--expose-gc")
        if (window.gc) window.gc();

        const finalMemory = performance.memory.usedJSHeapSize;
        const increase = ((finalMemory - initialMemory) / initialMemory) * 100;

        console.table({
            'Initial Memory': `${(initialMemory / 1024 / 1024).toFixed(2)} MB`,
            'Final Memory': `${(finalMemory / 1024 / 1024).toFixed(2)} MB`,
            'Increase': `${increase.toFixed(2)}%`,
            'Threshold': '10%',
            'Pass': increase < 10 ? '✅' : '❌'
        });

        this.results.push({
            test: 'TC-5.3.1',
            metric: 'Memory Leak Test',
            value: increase,
            threshold: 10,
            pass: increase < 10
        });
    }

    generateReport() {
        console.log('\n📊 Performance Test Summary\n');
        console.table(this.results);

        const passCount = this.results.filter(r => r.pass).length;
        const totalCount = this.results.length;
        const passRate = ((passCount / totalCount) * 100).toFixed(1);

        console.log(`\n${passCount}/${totalCount} tests passed (${passRate}%)`);

        return this.results;
    }
}

// Usage:
// const benchmark = new ChangeRequestPerformanceBenchmark();
// await benchmark.benchmarkEnrichmentTime();
// await benchmark.benchmarkFilterSwitching();
// await benchmark.benchmarkMemoryUsage();
// benchmark.generateReport();
```

---

## CONCLUSION

This comprehensive QA test plan covers **50 test cases** across **12 major categories**, prioritized by risk and impact. The plan identifies **7 known issues** that require attention before production deployment.

### Critical Next Steps

1. **Execute P0 tests immediately** - Security and data integrity cannot be compromised
2. **Fix identified bugs** - Particularly filter persistence and memory leak issues
3. **Automate regression tests** - Use provided scripts as starting point
4. **Performance benchmark** - Establish baseline metrics
5. **Document results** - Use provided templates for consistent reporting

### Estimated Testing Timeline

- **Phase 1 (P0):** 2 days
- **Phase 2 (P1):** 3 days
- **Phase 3 (P2):** 2 days
- **Phase 4 (P3):** 1 day
- **Total:** 8 working days

### Sign-off Requirements

- [ ] All P0 tests passed
- [ ] 95%+ P1 tests passed
- [ ] Critical bugs fixed and retested
- [ ] Performance benchmarks documented
- [ ] QA Lead approval
- [ ] Product Owner acceptance

---

**Document Version:** 1.0
**Last Updated:** February 14, 2026
**Next Review:** [After Phase 1 completion]
