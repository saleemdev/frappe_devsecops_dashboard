# Diagnostic Tools - Quick Reference Guide

## Overview

The DevSecOps Dashboard includes comprehensive diagnostic tools to help troubleshoot API issues, verify configuration, and test functionality.

---

## 1. API Diagnostics Page

### Access
Navigate to: `https://your-domain/devsecops-ui#api-diagnostics`

### What It Does
- ✓ Verifies API service availability
- ✓ Tests Projects API methods
- ✓ Displays configuration status
- ✓ Shows mock data availability
- ✓ Provides detailed response data

### Sections

#### 1.1 Service Availability
Checks if API services are properly initialized:
- API Service exists
- Projects Service exists
- `getTaskTypeSummary` method exists
- `getTasksByType` method exists

**Expected Result**: All checks show green "OK" tags

#### 1.2 Configuration
Displays current API configuration:
- Mock data settings for all services
- Projects mock enabled status

**Expected Result**: 
```json
{
  "applications": true,
  "incidents": true,
  "projects": true,
  "changeRequests": true,
  "swaggerCollections": true,
  "dashboard": true
}
```

#### 1.3 API Call Test (getTaskTypeSummary)
Tests the Task Type summary endpoint:
- Calls `api.projects.getTaskTypeSummary('proj-001')`
- Displays response data
- Shows number of groups returned

**Expected Result**: 
- Call Success: ✓ OK
- Data Returned: 8 groups
- Response shows all 8 Task Types with completion metrics

#### 1.4 API Call Test (getTasksByType)
Tests the task filtering endpoint:
- Calls `api.projects.getTasksByType('proj-001', 'Development')`
- Displays filtered tasks
- Shows task count

**Expected Result**:
- Call Success: ✓ OK
- Tasks Returned: 1 task
- Response shows Development task details

#### 1.5 Mock Data Availability
Verifies mock data is loaded:
- mockTaskTypes exists (8 types)
- mockTasksByProject exists
- Project keys: proj-001, proj-002
- proj-001 tasks: 8 tasks

**Expected Result**: All checks show green "OK" tags

### How to Use
1. Navigate to `#api-diagnostics`
2. Page automatically runs diagnostics on load
3. Click "Re-run Diagnostics" to refresh
4. Review each section for green "OK" tags
5. If any section shows red "FAIL", check the error message
6. Review response data to verify correct structure

---

## 2. API Test Runner Page

### Access
Navigate to: `https://your-domain/devsecops-ui#api-test`

### What It Does
- ✓ Runs comprehensive test suite
- ✓ Validates Task Type grouping logic
- ✓ Tests color coding (red/yellow/green)
- ✓ Verifies mock data integration
- ✓ Tests error handling

### Test Suite

#### Test 1: getTaskTypeSummary
Verifies:
- API call succeeds
- Response has `success: true`
- Data is an array
- Data is sorted by `custom_priority`
- All groups have required fields
- Color coding is correct
- Task counts are accurate

#### Test 2: getTasksByType
Verifies:
- API call succeeds
- Response has `success: true`
- Data is an array
- All tasks have correct `task_type`
- Correct number of tasks returned
- Correct task details

#### Test 3: Color Coding Logic
Verifies:
- 0-33% → red
- 34-66% → gold
- 67-100% → green
- All groups have correct colors

#### Test 4: Mock Data Integration
Verifies:
- mockTaskTypes exists
- mockTasksByProject exists
- proj-001 has tasks
- All tasks have `task_type` field

#### Test 5: Error Handling
Verifies:
- Non-existent project returns success
- Returns all Task Types with 0 tasks
- No errors thrown

### How to Use
1. Navigate to `#api-test`
2. Click "Run All Tests" button
3. Wait for tests to complete
4. Review results:
   - Green alert: All tests passed ✓
   - Red alert: Some tests failed ✗
5. Expand "Test Logs" to see detailed output
6. Review console for additional debug info

### Expected Output
```
╔════════════════════════════════════════════════════════════╗
║         Projects API Service Test Suite                   ║
╚════════════════════════════════════════════════════════════╝

=== Test 1: getTaskTypeSummary ===
✓ API call successful
✓ Response has success: true
✓ Data is an array
✓ Data is sorted by custom_priority: [1,2,3,4,5,6,7,8]
✓ All groups have required fields and correct color coding
✓ Planning group has correct counts

=== Test 2: getTasksByType ===
✓ API call successful
✓ Response has success: true
✓ Data is an array
✓ All tasks have task_type: Development
✓ Correct number of Development tasks
✓ Correct task returned: API endpoints v1

=== Test 3: Color Coding Logic ===
✓ Color coding logic is correct
✓ All groups have correct colors based on their percentages

=== Test 4: Mock Data Integration ===
✓ mockTaskTypes exists: 8 types
✓ mockTasksByProject exists
✓ proj-001 has 8 tasks
✓ All tasks have task_type field

=== Test 5: Error Handling ===
✓ API call completed for non-existent project
✓ Returns success: true for non-existent project
✓ Returns array of task types
✓ All groups have total: 0 for non-existent project

╔════════════════════════════════════════════════════════════╗
║                    Test Results                            ║
╚════════════════════════════════════════════════════════════╝
✓ PASS: getTaskTypeSummary
✓ PASS: getTasksByType
✓ PASS: Color Coding Logic
✓ PASS: Mock Data Integration
✓ PASS: Error Handling

============================================================
Total: 5 | Passed: 5 | Failed: 0
============================================================
```

---

## 3. Browser Console Testing

### Access
1. Open browser DevTools (F12)
2. Go to Console tab
3. Type: `window.runProjectsApiTests()`
4. Press Enter

### What It Does
Runs the same test suite as the API Test Runner page, but outputs directly to console.

### When to Use
- Quick testing without navigating to test page
- Debugging during development
- Automated testing scripts

---

## 4. Console Debug Logs

### Viewing Debug Logs
1. Open browser DevTools (F12)
2. Go to Console tab
3. Perform actions in the application
4. Review log messages

### Log Prefixes

#### [DashboardService]
Logs from Dashboard API service:
```
[DashboardService] getDashboardMetrics called
[DashboardService] isMockEnabled("dashboard"): true
[DashboardService] Using mock data
[DashboardService] Returning mock data: {...}
```

#### [ProjectsService]
Logs from Projects API service:
```
[ProjectsService] getTaskTypeSummary called with projectId: proj-001
[ProjectsService] isMockEnabled("projects"): true
[ProjectsService] Using mock data
[ProjectsService] mockTaskTypes: [...]
[ProjectsService] Tasks for proj-001: [...]
[ProjectsService] Final groups: [...]
```

#### [Dashboard]
Logs from Dashboard component:
```
[Dashboard] toggleProjectCollapse called for: proj-001
[Dashboard] Project proj-001 collapsed state: true -> false
[Dashboard] Project expanded, scheduling loadSummaryForProject
[Dashboard] loadSummaryForProject called for: proj-001
[Dashboard] API response for proj-001: {...}
[Dashboard] Rendering Steps for project: proj-001
[Dashboard] Rendering Task Type Steps with 8 groups
```

#### [ApiDiagnostics]
Logs from API Diagnostics component:
```
[ApiDiagnostics] Checking API service availability...
[ApiDiagnostics] API service: {...}
[ApiDiagnostics] Testing getTaskTypeSummary with proj-001...
[ApiDiagnostics] Response: {...}
```

### Filtering Logs
To filter logs by service:
1. In Console, click the filter icon
2. Type the prefix (e.g., `[ProjectsService]`)
3. Only matching logs will display

---

## 5. Troubleshooting Guide

### Issue: No projects displayed

**Check**:
1. Navigate to `#api-diagnostics`
2. Look at "API Call Test (getTaskTypeSummary)" section
3. Verify "Data Returned" shows "8 groups"

**If 0 groups**:
- Check Configuration section
- Verify "Projects Mock Enabled" is ✓ OK
- Check browser console for errors

### Issue: Task Type Steps not rendering

**Check**:
1. Open browser console
2. Expand a project card
3. Look for `[Dashboard] Rendering Task Type Steps with X groups`

**If not found**:
- Look for `[Dashboard] No groups found, showing default steps`
- Check `[Dashboard] API response for proj-XXX`
- Verify response has `success: true` and `data: [...]`

### Issue: Wrong colors on Task Type Steps

**Check**:
1. Navigate to `#api-test`
2. Run tests
3. Look for "Test 3: Color Coding Logic"

**If failed**:
- Review test logs for specific failures
- Check console for `[ProjectsService]` logs showing group colors

### Issue: Modal not opening when clicking Task Type

**Check**:
1. Open browser console
2. Click a Task Type step
3. Look for `[Dashboard] handleTaskTypeClick called`
4. Look for `[ProjectsService] getTasksByType called`

**If not found**:
- Check for JavaScript errors in console
- Verify click event is firing
- Check if modal state is updating

### Issue: API calls failing

**Check**:
1. Navigate to `#api-diagnostics`
2. Look for red "FAIL" tags
3. Check error messages

**Common causes**:
- Mock data not enabled
- API service not initialized
- Import errors
- Configuration issues

---

## 6. Quick Checklist

Use this checklist to verify everything is working:

- [ ] Navigate to `#api-diagnostics`
- [ ] All Service Availability checks show ✓ OK
- [ ] Configuration shows projects: true
- [ ] API Call Test shows 8 groups
- [ ] getTasksByType shows 1 task
- [ ] Mock Data shows 8 types, 8 tasks
- [ ] Navigate to `#api-test`
- [ ] Click "Run All Tests"
- [ ] All 5 tests pass ✓
- [ ] Navigate to main dashboard
- [ ] Projects display (ePrescription, Patient Management)
- [ ] Expand a project card
- [ ] Task Type Steps display (8 steps)
- [ ] Steps show color-coded tags
- [ ] Click a Task Type step
- [ ] Modal opens with task table
- [ ] Console shows no errors

---

## 7. Support

If issues persist after using diagnostic tools:

1. **Collect Information**:
   - Screenshot of API Diagnostics page
   - Screenshot of Test Runner results
   - Copy of browser console logs
   - Description of expected vs. actual behavior

2. **Review Documentation**:
   - `TASK_TYPE_INVESTIGATION_REPORT.md` - Detailed technical report
   - This guide - Diagnostic tools usage

3. **Check Configuration**:
   - `apps/frappe_devsecops_dashboard/frontend/src/services/api/config.js`
   - Verify `useMockData.projects: true`
   - Verify `useMockData.dashboard: true`

---

**Last Updated**: 2025-09-30
**Version**: 1.0

