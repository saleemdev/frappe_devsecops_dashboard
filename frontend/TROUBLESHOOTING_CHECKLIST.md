# Task Type Integration - Troubleshooting Checklist

## Quick Diagnostic Steps

Use this checklist to diagnose why Task Type data might not be showing correctly.

---

## ✅ Step 1: Verify ERPNext Data Exists

### Check Task Doctype
1. Go to ERPNext: **Desk → Task**
2. Find your task (e.g., the one you mentioned exists)
3. Verify these fields are populated:
   - [ ] **Project**: Should match project name exactly (e.g., "ePrescription")
   - [ ] **Task Type**: Should be set (e.g., "Planning", "Development")
   - [ ] **Status**: Should be set (e.g., "Open", "Working", "Completed")
   - [ ] **Subject**: Task title/description

**Example**:
```
Task Name: TASK-0001
Subject: Implement user authentication
Project: ePrescription
Task Type: Development
Status: Working
```

### Check Task Type Doctype
1. Go to ERPNext: **Desk → Task Type**
2. Verify Task Types exist with:
   - [ ] **Name**: Task Type name (e.g., "Planning")
   - [ ] **Custom Priority**: Number for ordering (e.g., 1, 2, 3)

**Example**:
```
Name: Planning
Custom Priority: 1

Name: Development  
Custom Priority: 4
```

---

## ✅ Step 2: Check Browser Console Logs

### Open Browser Console
1. Press **F12** to open DevTools
2. Go to **Console** tab
3. Refresh the page
4. Expand a project card

### Look for These Key Messages

#### ✓ Configuration Check
```
[DashboardService] isMockEnabled("dashboard"): false
[ProjectsService] isMockEnabled("projects"): false
```
**Expected**: Both should be `false` (using real data)  
**If `true`**: Mock data is still enabled - check config.js

#### ✓ Project ID Check
```
[Dashboard] Rendering project card: ePrescription with ID: ePrescription
```
**Expected**: ID should match your ERPNext Project name  
**If different**: Project ID mismatch - see Step 4

#### ✓ API Call Check
```
[erpnextApiUtils] getProjectTasksWithTypes called with projectId: ePrescription
[erpnextApiUtils] Total tasks found: 1
```
**Expected**: Should show number of tasks > 0  
**If 0**: No tasks found - check Task.project field matches

#### ✓ Task Data Check
```
[ProjectsService] Tasks received: [{ id: "TASK-0001", subject: "...", task_type: "Development" }]
[ProjectsService] Total tasks for project: 1
```
**Expected**: Should show your task with task_type populated  
**If empty array**: API returned no tasks - check filters

#### ✓ Groups Check
```
[ProjectsService] Final groups from ERPNext: [
  { name: "Planning", total: 0, completed: 0, ... },
  { name: "Development", total: 1, completed: 0, ... }
]
```
**Expected**: Should show counts > 0 for Task Types with tasks  
**If all 0**: Tasks not matching Task Types - check names

---

## ✅ Step 3: Check for Errors

### Look for Error Messages

#### API Errors
```
[erpnextApiUtils] Error fetching project tasks: ...
```
**Common Causes**:
- 403 Forbidden → Permission issue
- 404 Not Found → Wrong endpoint
- 500 Server Error → Backend issue

#### Permission Errors
```
Error: You don't have permission to access Task
```
**Solution**: Grant user "Task" read permission in ERPNext

#### CSRF Token Errors
```
Error: Invalid CSRF Token
```
**Solution**: Refresh the page to get new token

---

## ✅ Step 4: Verify Project ID Matching

### The Problem
The dashboard uses Project ID to query tasks, but the Task doctype uses Project name.

### Check Project ID
Look in console for:
```
[Dashboard] Rendering project card: ePrescription with ID: ePrescription
```

### Check Task.project Field
In ERPNext Task doctype, verify:
```
Task.project = "ePrescription"  ← Must match exactly
```

### Common Mismatches
- Dashboard shows: `proj-001` but Task.project = `"ePrescription"` ❌
- Dashboard shows: `ePrescription` but Task.project = `"eprescription"` ❌ (case-sensitive)
- Dashboard shows: `ePrescription` but Task.project = `"ePrescription "` ❌ (trailing space)

### Solution
Ensure Task.project field matches the Project name exactly (case-sensitive, no extra spaces).

---

## ✅ Step 5: Verify Task Type Matching

### The Problem
Task.task_type must match Task Type.name exactly.

### Check Task Type Names
In console, look for:
```
[ProjectsService] Sorted Task Types: [
  { name: "Planning", priority: 1 },
  { name: "Development", priority: 4 }
]
```

### Check Task.task_type Field
In ERPNext Task doctype, verify:
```
Task.task_type = "Development"  ← Must match exactly
```

### Common Mismatches
- Task Type name: `"Development"` but Task.task_type = `"development"` ❌ (case)
- Task Type name: `"Development"` but Task.task_type = `"Dev"` ❌ (abbreviation)
- Task Type name: `"Development"` but Task.task_type = `null` ❌ (not set)

### Solution
Ensure Task.task_type matches a Task Type.name exactly.

---

## ✅ Step 6: Test API Directly

### Using Browser Console

#### Test 1: Get Task Types
```javascript
fetch('/api/resource/Task Type', {
  headers: { 'X-Frappe-CSRF-Token': window.csrf_token }
})
.then(r => r.json())
.then(d => console.log('Task Types:', d.data))
```

**Expected**: Should return array of Task Types with `custom_priority`

#### Test 2: Get Tasks for Project
```javascript
fetch('/api/resource/Task?filters=[["project","=","ePrescription"]]&fields=["name","subject","task_type","status","project"]', {
  headers: { 'X-Frappe-CSRF-Token': window.csrf_token }
})
.then(r => r.json())
.then(d => console.log('Tasks:', d.data))
```

**Expected**: Should return array of tasks for the project

**If empty**: Task.project field doesn't match "ePrescription"

---

## ✅ Step 7: Check Permissions

### Required Permissions
User must have:
- [ ] **Task** doctype: Read permission
- [ ] **Task Type** doctype: Read permission
- [ ] **Project** doctype: Read permission

### How to Check
1. Go to ERPNext: **Desk → Role Permission Manager**
2. Select role (e.g., "System Manager", "Projects User")
3. Verify permissions for Task, Task Type, Project

### How to Grant
1. Go to **Role Permission Manager**
2. Select the role
3. Add permissions:
   - Doctype: Task → Read: ✓
   - Doctype: Task Type → Read: ✓
   - Doctype: Project → Read: ✓

---

## ✅ Step 8: Verify Configuration

### Check Mock Data Setting

**File**: `apps/frappe_devsecops_dashboard/frontend/src/services/api/config.js`

**Line 79-86**:
```javascript
useMockData: {
  applications: true,
  incidents: true,
  projects: false,       // ← Should be false
  changeRequests: true,
  swaggerCollections: true,
  dashboard: false       // ← Should be false
}
```

**If `true`**: Change to `false`, rebuild, and redeploy:
```bash
cd apps/frappe_devsecops_dashboard/frontend
npm run build
cp ../frappe_devsecops_dashboard/public/frontend/index.html ../www/devsecops-ui.html
cd ../../..
bench clear-website-cache
```

---

## ✅ Step 9: Use Diagnostic Tools

### API Diagnostics Page
1. Navigate to: `#api-diagnostics`
2. Check all sections for green "OK" tags
3. Review "API Call Test" section for actual data returned

### API Test Runner
1. Navigate to: `#api-test`
2. Click "Run All Tests"
3. Review test results and logs

---

## Common Issues & Solutions

### Issue: "Loading Task Type data..." never completes

**Cause**: API call is failing or returning no data

**Solution**:
1. Check console for errors
2. Verify project ID matches Task.project
3. Ensure tasks exist with task_type populated
4. Check user permissions

### Issue: Shows "0/0" for all Task Types

**Cause**: Tasks exist but task_type field is not populated

**Solution**:
1. Open Task in ERPNext
2. Set Task Type field
3. Save
4. Refresh dashboard

### Issue: Some Task Types show counts, others don't

**Cause**: Task.task_type doesn't match Task Type.name exactly

**Solution**:
1. Check Task Type names in console logs
2. Verify Task.task_type matches exactly (case-sensitive)
3. Update tasks with correct Task Type names

### Issue: 403 Forbidden error

**Cause**: User doesn't have permission to read Task doctype

**Solution**:
1. Go to Role Permission Manager
2. Grant Task read permission to user's role
3. Refresh dashboard

### Issue: Project shows but no tasks

**Cause**: Task.project field doesn't match project name

**Solution**:
1. Check console for project ID being queried
2. Open Task in ERPNext
3. Verify Task.project matches exactly
4. Update if needed

---

## Quick Reference: Console Log Patterns

### ✓ Everything Working
```
[DashboardService] isMockEnabled("dashboard"): false
[ProjectsService] isMockEnabled("projects"): false
[erpnextApiUtils] Total tasks found: 1
[ProjectsService] Total tasks for project: 1
[ProjectsService] Group for Development: { total: 1, completed: 0, ... }
```

### ❌ Mock Data Still Enabled
```
[DashboardService] isMockEnabled("dashboard"): true
[DashboardService] Using mock data
[ProjectsService] isMockEnabled("projects"): true
[ProjectsService] Using mock data
```
**Fix**: Update config.js, rebuild, redeploy

### ❌ No Tasks Found
```
[erpnextApiUtils] Total tasks found: 0
[ProjectsService] Total tasks for project: 0
```
**Fix**: Check Task.project field matches project name

### ❌ Tasks Found But No Task Type
```
[ProjectsService] Tasks received: [{ task_type: null }]
[ProjectsService] Group for Development: { total: 0, ... }
```
**Fix**: Set Task Type field in ERPNext Task

### ❌ API Error
```
[erpnextApiUtils] Error fetching project tasks: 403 Forbidden
```
**Fix**: Grant Task read permission to user

---

## Need More Help?

1. **Review Documentation**:
   - `REAL_ERPNEXT_INTEGRATION.md` - Implementation details
   - `DIAGNOSTIC_TOOLS_GUIDE.md` - How to use diagnostic tools

2. **Collect Debug Info**:
   - Full browser console output
   - Screenshot of API Diagnostics page
   - ERPNext Task record details
   - User role and permissions

3. **Check ERPNext Logs**:
   - Go to ERPNext: **Desk → Error Log**
   - Look for recent API errors

---

**Last Updated**: 2025-09-30

