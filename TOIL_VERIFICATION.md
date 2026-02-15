# TOIL System Verification Checklist

## Overview

This document provides a comprehensive checklist for verifying the TOIL (Time Off In Lieu) system implementation. Follow these steps to ensure all components are working correctly.

**System Under Test**: TOIL Management System
**Version**: 1.0
**Last Updated**: 2026-02-14

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Backend Verification](#backend-verification)
3. [Frontend Verification](#frontend-verification)
4. [API Testing](#api-testing)
5. [Manual Testing Workflows](#manual-testing-workflows)
6. [Expected Results Reference](#expected-results-reference)
7. [Troubleshooting Guide](#troubleshooting-guide)

---

## Prerequisites

### Required Setup

- [ ] Frappe/ERPNext instance running
- [ ] Test site created and configured
- [ ] TOIL module installed in frappe_devsecops_dashboard app
- [ ] Test data fixtures available
- [ ] Test users created (employee, supervisor, HR)

### Required Custom Fields

Verify these custom fields exist on **Timesheet** DocType:

- [ ] `total_toil_hours` (Float, Read Only)
- [ ] `toil_days` (Float, Read Only, 3 decimals)
- [ ] `toil_status` (Select: Pending/Accrued/Consumed/Cancelled)
- [ ] `toil_allocation` (Link to Leave Allocation)

Verify these custom fields exist on **Leave Allocation** DocType:

- [ ] `is_toil_allocation` (Check, default=0)
- [ ] `source_timesheet` (Link to Timesheet)
- [ ] `toil_hours` (Float, Read Only)

### Required Leave Type

- [ ] Leave Type "Time Off in Lieu" exists
- [ ] Configuration: No carry forward, Non-compensatory, Allow negative = No

---

## Backend Verification

### 1. Module Structure

**Location**: `/apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/`

#### Verify Files Exist:

```bash
cd /path/to/frappe-bench/apps/frappe_devsecops_dashboard
```

- [ ] `utils/toil_calculator.py` - Core calculation functions
- [ ] `api/toil.py` - API endpoints
- [ ] `tasks/toil_expiry.py` - Scheduled tasks
- [ ] `overrides/timesheet.py` - Timesheet hooks
- [ ] `tests/test_toil_system.py` - Unit tests

#### Verify Hooks Registration:

**File**: `hooks.py`

```python
# Document Events
doc_events = {
    "Timesheet": {
        "validate": "frappe_devsecops_dashboard.overrides.timesheet.validate_timesheet",
        "before_submit": "frappe_devsecops_dashboard.overrides.timesheet.before_submit_timesheet",
        "on_submit": "frappe_devsecops_dashboard.overrides.timesheet.create_toil_allocation",
        "before_cancel": "frappe_devsecops_dashboard.overrides.timesheet.before_cancel_timesheet",
        "on_cancel": "frappe_devsecops_dashboard.overrides.timesheet.cancel_toil_allocation"
    }
}

# Scheduled Tasks
scheduler_events = {
    "daily": [
        "frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations"
    ],
    "weekly": [
        "frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders"
    ]
}
```

### 2. Database Schema

#### Run Database Verification:

```bash
bench --site [site-name] console
```

```python
# Verify custom fields
frappe.get_meta("Timesheet").get_field("total_toil_hours")
frappe.get_meta("Timesheet").get_field("toil_days")
frappe.get_meta("Leave Allocation").get_field("is_toil_allocation")

# Verify Leave Type
frappe.db.exists("Leave Type", "Time Off in Lieu")
```

**Expected Output**: All fields should return field objects, Leave Type should exist.

### 3. Unit Tests

#### Run Complete Test Suite:

```bash
cd /path/to/frappe-bench
bench --site [site-name] run-tests --app frappe_devsecops_dashboard --module test_toil_system
```

#### Expected Test Results:

```
Test TOIL System
✓ test_toil_hours_calculation_basic
✓ test_toil_days_conversion
✓ test_timesheet_toil_calculation_on_validate
✓ test_supervisor_validation_success
✓ test_supervisor_validation_unauthorized_user
✓ test_supervisor_validation_missing_supervisor
✓ test_api_get_toil_balance
✓ test_api_calculate_toil_preview
✓ test_api_get_user_role
✓ test_api_get_supervisor_timesheets
✓ test_expiry_6_month_window
✓ test_expiry_reminders
✓ test_allocation_creation_on_submit
✓ test_allocation_cancellation_protection
✓ test_allocation_balance_calculation

Ran 15 tests in X.XXXs
OK
```

- [ ] All 15 tests pass
- [ ] No errors or warnings
- [ ] Test data cleaned up properly

### 4. Calculation Functions

#### Test TOIL Calculator:

```python
from frappe_devsecops_dashboard.utils.toil_calculator import (
    calculate_toil_days
)

# Test cases
assert calculate_toil_days(8.0) == 1.0, "8 hours should equal 1 day"
assert calculate_toil_days(16.0) == 2.0, "16 hours should equal 2 days"
assert calculate_toil_days(4.0) == 0.5, "4 hours should equal 0.5 days"
assert calculate_toil_days(10.0) == 1.25, "10 hours should equal 1.25 days"
```

**Expected Result**: All assertions pass

### 5. Security Validation

#### Test Supervisor Validation:

```python
from frappe_devsecops_dashboard.utils.toil_calculator import (
    validate_supervisor_permission
)

# Create test timesheet
ts = frappe.get_doc("Timesheet", "TEST-TS-001")

# Test as supervisor
frappe.set_user("supervisor@test.com")
is_valid, error = validate_supervisor_permission(ts)
# Expected: is_valid = True, error = None

# Test as unauthorized user
frappe.set_user("other@test.com")
is_valid, error = validate_supervisor_permission(ts)
# Expected: is_valid = False, error = "Only the immediate supervisor..."
```

**Expected Result**: Proper authorization checks enforced

---

## Frontend Verification

### 1. TOIL Store (State Management)

**Location**: `frontend/src/stores/toilStore.js`

#### Verify Store Structure:

- [ ] State properties: `balance`, `summary`, `timesheets`, `loading`, `error`
- [ ] Actions: `fetchTOILBalance`, `fetchTOILSummary`, `approveTimesheet`, etc.
- [ ] Getters: `formattedBalance`, `expiringBalance`, etc.

#### Test Store in Browser Console:

```javascript
// Open browser dev tools
const store = useToilStore();
await store.fetchTOILBalance('EMP-001');
console.log(store.balance); // Should show balance object
```

### 2. TOIL Components

#### Employee Dashboard Component:

**Location**: `frontend/src/components/toil/TOILEmployeeDashboard.vue`

Visual Verification:
- [ ] Balance card displays current TOIL balance
- [ ] Expiring balance warning shown when < 30 days
- [ ] Recent timesheets table populated
- [ ] "Request Leave" button functional
- [ ] Calendar view shows TOIL dates

#### Supervisor Dashboard Component:

**Location**: `frontend/src/components/toil/TOILSupervisorDashboard.vue`

Visual Verification:
- [ ] Team timesheets table showing subordinates
- [ ] Filter by status working (Draft, Submitted)
- [ ] Approve/Reject buttons visible
- [ ] TOIL preview modal shows details
- [ ] Approval/rejection workflow completes

### 3. UI/UX Testing

#### Test Responsive Design:

- [ ] Desktop (1920x1080): All components visible, no overflow
- [ ] Tablet (768x1024): Cards stack properly
- [ ] Mobile (375x667): Mobile-optimized layout

#### Test Accessibility:

- [ ] Keyboard navigation works (Tab, Enter, Space)
- [ ] ARIA labels present on interactive elements
- [ ] Color contrast meets WCAG AA standards
- [ ] Screen reader compatible

---

## API Testing

### 1. API Endpoint Verification

Use the following tools for testing:
- Postman
- cURL
- Frappe REST API Client
- Browser DevTools Network tab

### 2. Authentication

All API calls require authentication:

```bash
# Login first
curl -X POST http://localhost:8000/api/method/login \
  -H "Content-Type: application/json" \
  -d '{"usr": "test@example.com", "pwd": "password"}'
```

### 3. Test Each API Endpoint

#### API 1: Get User Role

```bash
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.get_user_role" \
  -H "Cookie: sid=your_session_id"
```

**Expected Response**:
```json
{
  "message": {
    "success": true,
    "role": "supervisor",
    "employee": "EMP-001",
    "subordinates_count": 5
  }
}
```

**Verification**:
- [ ] Returns 200 status
- [ ] Role is one of: employee, supervisor, hr
- [ ] Employee ID returned if applicable
- [ ] Subordinates count > 0 for supervisors

#### API 2: Get TOIL Balance

```bash
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.get_toil_balance?employee=EMP-001" \
  -H "Cookie: sid=your_session_id"
```

**Expected Response**:
```json
{
  "message": {
    "success": true,
    "employee": "EMP-001",
    "employee_name": "Test Employee",
    "balance": 3.5,
    "leave_type": "Time Off in Lieu",
    "unit": "days"
  }
}
```

**Verification**:
- [ ] Returns 200 status
- [ ] Balance is numeric (float)
- [ ] Balance >= 0
- [ ] Employee details correct
- [ ] Cached (subsequent calls faster)

#### API 3: Get TOIL Summary

```bash
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.get_toil_summary?employee=EMP-001" \
  -H "Cookie: sid=your_session_id"
```

**Expected Response**:
```json
{
  "message": {
    "success": true,
    "employee": "EMP-001",
    "employee_name": "Test Employee",
    "balance": 3.5,
    "total_accrued": 10.0,
    "total_consumed": 6.5,
    "expiring_soon": 1.5,
    "expiring_in_days": 30,
    "recent_timesheets": [...]
  }
}
```

**Verification**:
- [ ] Returns 200 status
- [ ] Calculations correct: balance = accrued - consumed
- [ ] Recent timesheets array present
- [ ] Expiring balance <= total balance

#### API 4: Calculate TOIL Preview

```bash
curl -X POST "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.calculate_toil_preview" \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=your_session_id" \
  -d '{"timesheet_name": "TS-001"}'
```

**Expected Response**:
```json
{
  "message": {
    "success": true,
    "timesheet": "TS-001",
    "employee": "EMP-001",
    "total_toil_hours": 12.0,
    "toil_days": 1.5,
    "breakdown": [
      {
        "activity_type": "Development",
        "hours": 8.0,
        "from_time": "2026-02-14 09:00:00",
        "to_time": "2026-02-14 17:00:00"
      }
    ],
    "can_submit": true
  }
}
```

**Verification**:
- [ ] Returns 200 status
- [ ] Hours calculation correct (only non-billable)
- [ ] Days = hours / 8
- [ ] Breakdown array shows all non-billable entries
- [ ] can_submit = true if hours > 0

#### API 5: Approve Timesheet

```bash
curl -X POST "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.approve_timesheet" \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=your_session_id" \
  -d '{"timesheet_name": "TS-001", "comment": "Approved"}'
```

**Expected Response**:
```json
{
  "message": {
    "success": true,
    "message": "Timesheet approved successfully",
    "timesheet": "TS-001",
    "toil_allocation": "LA-001",
    "toil_days": 1.5
  }
}
```

**Verification**:
- [ ] Returns 200 status
- [ ] Timesheet status = Submitted
- [ ] Leave Allocation created
- [ ] TOIL balance updated
- [ ] Cache cleared

#### API 6: Get Supervisor Timesheets

```bash
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.get_supervisor_timesheets?status=Draft&limit_page_length=20" \
  -H "Cookie: sid=your_session_id"
```

**Expected Response**:
```json
{
  "message": {
    "success": true,
    "data": [
      {
        "name": "TS-001",
        "employee": "EMP-001",
        "employee_name": "Test Employee",
        "total_toil_hours": 8.0,
        "toil_days": 1.0,
        "toil_status": "Pending"
      }
    ],
    "total": 1,
    "subordinates": [...]
  }
}
```

**Verification**:
- [ ] Returns 200 status
- [ ] Only subordinate timesheets shown
- [ ] Status filter working
- [ ] Pagination working
- [ ] Total count correct

### 4. Error Handling Tests

#### Test Permission Errors:

```bash
# Try to access another employee's data
curl -X GET "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.get_toil_balance?employee=OTHER-EMP" \
  -H "Cookie: sid=employee_session"
```

**Expected Result**:
- [ ] Returns 403 Forbidden
- [ ] Error message: "Permission denied"

#### Test Invalid Parameters:

```bash
# Missing required parameter
curl -X POST "http://localhost:8000/api/method/frappe_devsecops_dashboard.api.toil.calculate_toil_preview" \
  -H "Content-Type: application/json" \
  -H "Cookie: sid=your_session_id" \
  -d '{}'
```

**Expected Result**:
- [ ] Returns 400 Bad Request
- [ ] Error message indicates missing parameter

---

## Manual Testing Workflows

### Workflow 1: Employee Logs TOIL Hours

**Objective**: Verify employee can create timesheet with TOIL hours

**Steps**:

1. [ ] Login as test employee
   - User: `test.employee@toil.test`
   - Expected: Successful login

2. [ ] Navigate to Timesheet list
   - Path: `/app/timesheet`
   - Expected: Timesheet list view loads

3. [ ] Create new Timesheet
   - Click "New"
   - Set Employee: Auto-populated or select
   - Expected: New timesheet form opens

4. [ ] Add time log entries
   - Add entry 1:
     - Activity Type: Development
     - Hours: 8
     - Billable: No (unchecked)
   - Add entry 2:
     - Activity Type: Meeting
     - Hours: 2
     - Billable: Yes (checked)
   - Expected: Entries added to table

5. [ ] Save timesheet
   - Click "Save"
   - Expected:
     - Status = Draft
     - `total_toil_hours` = 8.0 (only non-billable)
     - `toil_days` = 1.0
     - `toil_status` = "Pending"

6. [ ] Verify TOIL preview
   - Check calculated fields
   - Expected: Preview shows 8 hours = 1 day

**Result**: ✅ PASS / ❌ FAIL

---

### Workflow 2: Supervisor Approves Timesheet

**Objective**: Verify supervisor can approve timesheet and TOIL is accrued

**Steps**:

1. [ ] Login as test supervisor
   - User: `test.supervisor@toil.test`
   - Expected: Successful login

2. [ ] Navigate to TOIL Supervisor Dashboard
   - Path: `/app/toil-supervisor`
   - Expected: Dashboard shows pending timesheets

3. [ ] Find pending timesheet
   - Filter: Status = "Draft"
   - Expected: Timesheet from Workflow 1 appears

4. [ ] Preview timesheet details
   - Click "Preview" or expand row
   - Expected:
     - Shows employee details
     - Shows TOIL breakdown
     - Shows total hours and days

5. [ ] Approve timesheet
   - Click "Approve"
   - Add comment: "Approved for TOIL"
   - Confirm approval
   - Expected:
     - Success message displayed
     - Timesheet status = Submitted
     - `toil_status` = "Accrued"

6. [ ] Verify Leave Allocation created
   - Navigate to Leave Allocation list
   - Filter: Employee = test employee
   - Expected:
     - New allocation exists
     - Linked to timesheet
     - Amount = 1.0 days
     - Validity = 6 months from today
     - `is_toil_allocation` = Yes

7. [ ] Verify TOIL balance updated
   - Navigate to employee's TOIL dashboard
   - Expected:
     - Balance increased by 1.0 day
     - Recent timesheet appears in list

**Result**: ✅ PASS / ❌ FAIL

---

### Workflow 3: Employee Requests TOIL Leave

**Objective**: Verify employee can request leave using TOIL balance

**Steps**:

1. [ ] Login as test employee
   - User: `test.employee@toil.test`

2. [ ] Check TOIL balance
   - Navigate to TOIL Employee Dashboard
   - Path: `/app/toil-employee`
   - Expected: Shows balance >= 1.0 day

3. [ ] Create Leave Application
   - Click "Request Leave" button
   - Or navigate to: `/app/leave-application/new`
   - Expected: Leave application form opens

4. [ ] Fill leave details
   - Leave Type: "Time Off in Lieu"
   - From Date: Tomorrow
   - To Date: Tomorrow (1 day)
   - Expected: Available balance shown

5. [ ] Submit leave application
   - Click "Submit"
   - Expected:
     - Success message
     - Status = Submitted (or pending approval)

6. [ ] Verify balance deducted
   - Return to TOIL dashboard
   - Expected:
     - Balance reduced by 1.0 day
     - Leave application appears in history

**Result**: ✅ PASS / ❌ FAIL

---

### Workflow 4: TOIL Expiry Process

**Objective**: Verify TOIL expires after 6 months

**Steps**:

1. [ ] Create old TOIL allocation (backdated)
   - Login as Administrator
   - Create timesheet with date 7 months ago
   - Submit timesheet
   - Expected: Allocation created with old dates

2. [ ] Run expiry task manually
   - Open Frappe console:
     ```bash
     bench --site [site-name] console
     ```
   - Run:
     ```python
     from frappe_devsecops_dashboard.tasks.toil_expiry import expire_toil_allocations
     count = expire_toil_allocations()
     print(f"Expired {count} allocations")
     ```
   - Expected: Count >= 1

3. [ ] Verify allocation marked as expired
   - Check Leave Ledger Entry:
     ```python
     frappe.get_all("Leave Ledger Entry",
       filters={
         "transaction_name": allocation_name,
         "is_expired": 1
       })
     ```
   - Expected: Ledger entry has `is_expired` = 1

4. [ ] Verify expired TOIL not shown in balance
   - Check employee balance
   - Expected: Expired allocation not included

**Result**: ✅ PASS / ❌ FAIL

---

### Workflow 5: Expiry Reminder Emails

**Objective**: Verify reminder emails sent for expiring TOIL

**Steps**:

1. [ ] Create allocation expiring soon
   - Create timesheet with TOIL
   - Set expiry date to 15 days from now
   - Submit timesheet

2. [ ] Run reminder task manually
   - Open Frappe console:
     ```bash
     bench --site [site-name] console
     ```
   - Run:
     ```python
     from frappe_devsecops_dashboard.tasks.toil_expiry import send_expiry_reminders
     count = send_expiry_reminders()
     print(f"Sent {count} reminders")
     ```
   - Expected: Count >= 1

3. [ ] Check email queue
   - Navigate to: `/app/email-queue`
   - Filter: Recipient = test employee email
   - Expected: Email queued with subject "TOIL Expiry Reminder"

4. [ ] Verify email content
   - Open email
   - Expected content:
     - Employee name
     - Expiring balance amount
     - Expiry date
     - Link to request leave
     - List of expiring allocations

**Result**: ✅ PASS / ❌ FAIL

---

### Workflow 6: Cancellation Protection

**Objective**: Verify timesheet cannot be cancelled if TOIL consumed

**Steps**:

1. [ ] Create and approve timesheet with TOIL
   - Follow Workflow 1 and 2
   - Expected: 1.0 day TOIL accrued

2. [ ] Request leave using TOIL
   - Follow Workflow 3
   - Use 0.5 days
   - Expected: Leave approved, 0.5 days consumed

3. [ ] Attempt to cancel timesheet
   - Login as supervisor
   - Navigate to timesheet
   - Click "Cancel"
   - Expected:
     - ❌ Error message displayed
     - Message: "Cannot cancel timesheet. 0.5 days of TOIL ... have already been consumed"
     - Timesheet remains Submitted

4. [ ] Cancel leave application first
   - Navigate to leave application
   - Click "Cancel"
   - Expected: Leave cancelled, TOIL restored

5. [ ] Retry cancelling timesheet
   - Navigate to timesheet
   - Click "Cancel"
   - Expected:
     - ✅ Success
     - Timesheet status = Cancelled
     - TOIL allocation cancelled
     - Balance reduced

**Result**: ✅ PASS / ❌ FAIL

---

### Workflow 7: Supervisor Validation

**Objective**: Verify only supervisor can approve timesheet

**Steps**:

1. [ ] Create timesheet as employee
   - Login as test employee
   - Create timesheet with TOIL
   - Save as Draft

2. [ ] Try to submit as employee (self-approval)
   - Click "Submit"
   - Expected:
     - ❌ Error: "Only the immediate supervisor can approve"
     - Timesheet remains Draft

3. [ ] Try to submit as different supervisor
   - Logout, login as different supervisor
   - Navigate to timesheet
   - Try to submit
   - Expected:
     - ❌ Error: "Only the immediate supervisor can approve"

4. [ ] Submit as correct supervisor
   - Logout, login as direct supervisor
   - Navigate to timesheet
   - Click "Submit"
   - Expected:
     - ✅ Success
     - Timesheet submitted
     - TOIL allocated

**Result**: ✅ PASS / ❌ FAIL

---

## Expected Results Reference

### TOIL Calculation Formulas

| Hours | Days | Formula |
|-------|------|---------|
| 4     | 0.5  | 4 ÷ 8 = 0.5 |
| 8     | 1.0  | 8 ÷ 8 = 1.0 |
| 12    | 1.5  | 12 ÷ 8 = 1.5 |
| 16    | 2.0  | 16 ÷ 8 = 2.0 |
| 20    | 2.5  | 20 ÷ 8 = 2.5 |
| 40    | 5.0  | 40 ÷ 8 = 5.0 |

**Rule**: Only **non-billable** hours count toward TOIL

### TOIL Status Flow

```
Draft (Pending) → Submitted (Accrued) → Partially Consumed → Fully Consumed
                       ↓
                   Cancelled
                       ↓
                    Expired
```

### Leave Allocation Validity

- **Creation Date**: When timesheet is submitted
- **From Date**: Submission date
- **To Date**: 6 months from submission date
- **Expiry Logic**: Rolling 6-month window (NOT fiscal year)

### Permission Matrix

| Role | View Own TOIL | View Team TOIL | Approve Timesheet | Cancel Timesheet | Access API |
|------|---------------|----------------|-------------------|------------------|------------|
| Employee | ✅ | ❌ | ❌ | ❌ | ✅ (own data) |
| Supervisor | ✅ | ✅ (subordinates) | ✅ (subordinates) | ✅ (subordinates) | ✅ (team data) |
| HR Manager | ✅ | ✅ (all) | ✅ (all) | ✅ (all) | ✅ (all data) |
| System Manager | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## Troubleshooting Guide

### Issue: TOIL Hours Not Calculating

**Symptoms**:
- `total_toil_hours` = 0 despite non-billable entries
- `toil_days` = 0

**Diagnosis**:
1. Check if time logs exist: `doc.time_logs`
2. Check `is_billable` field (should be 0 or False)
3. Verify `hours` field has value > 0

**Solution**:
- Ensure `billable` checkbox is unchecked
- Ensure time log has valid from/to times
- Check hook is registered in hooks.py

### Issue: Supervisor Cannot Approve Timesheet

**Symptoms**:
- Error: "Only the immediate supervisor can approve"
- User is the correct supervisor

**Diagnosis**:
1. Check employee's `reports_to` field
   ```python
   frappe.get_value("Employee", employee, "reports_to")
   ```
2. Check supervisor's `user_id` field
   ```python
   frappe.get_value("Employee", supervisor, "user_id")
   ```
3. Check current user
   ```python
   frappe.session.user
   ```

**Solution**:
- Set correct supervisor in Employee master
- Ensure supervisor has user account linked
- Verify user logged in correctly

### Issue: Leave Allocation Not Created

**Symptoms**:
- Timesheet submitted successfully
- `toil_allocation` field is null
- No Leave Allocation created

**Diagnosis**:
1. Check Error Log:
   ```python
   frappe.get_all("Error Log",
     filters={"method": ["like", "%toil%"]},
     order_by="creation desc",
     limit=5)
   ```
2. Check if Leave Type exists
3. Check hook is registered

**Solution**:
- Create "Time Off in Lieu" Leave Type
- Verify hook: `on_submit` for Timesheet
- Check permissions for Leave Allocation creation

### Issue: TOIL Balance Incorrect

**Symptoms**:
- Balance doesn't match expected value
- Balance negative when shouldn't be

**Diagnosis**:
1. Check Leave Ledger Entries:
   ```python
   frappe.get_all("Leave Ledger Entry",
     filters={
       "employee": employee,
       "leave_type": "Time Off in Lieu"
     },
     fields=["transaction_name", "leaves", "is_expired"])
   ```
2. Sum manually:
   ```python
   # Positive = Accrued, Negative = Consumed
   balance = sum(lle.leaves for lle in entries if not lle.is_expired)
   ```

**Solution**:
- Verify all transactions are submitted (docstatus=1)
- Check for duplicate allocations
- Clear cache: `clear_toil_cache(employee)`

### Issue: API Returns 403 Forbidden

**Symptoms**:
- API call returns Permission Error
- User should have access

**Diagnosis**:
1. Check user session: `frappe.session.user`
2. Check user roles: `frappe.get_roles(user)`
3. Verify employee record: `frappe.get_value("Employee", {"user_id": user})`

**Solution**:
- Ensure user has Employee record with `user_id` set
- Verify user has "Employee" role
- Check supervisor relationship for team data access

### Issue: Expiry Task Not Running

**Symptoms**:
- TOIL not expiring after 6 months
- Scheduler task not executing

**Diagnosis**:
1. Check scheduler enabled:
   ```bash
   bench --site [site-name] doctor
   ```
2. Check task logs:
   ```python
   frappe.get_all("Scheduled Job Log",
     filters={"scheduled_job_type": ["like", "%toil%"]},
     order_by="creation desc")
   ```

**Solution**:
- Enable scheduler: `bench --site [site-name] enable-scheduler`
- Run manually to test:
   ```python
   from frappe_devsecops_dashboard.tasks.toil_expiry import expire_toil_allocations
   expire_toil_allocations()
   ```
- Check hooks.py registration

### Issue: Frontend Not Updating

**Symptoms**:
- UI shows old data
- Balance not refreshing

**Diagnosis**:
1. Check browser console for errors
2. Check network tab for API calls
3. Verify store state

**Solution**:
- Clear browser cache
- Clear Redis cache:
   ```bash
   bench --site [site-name] redis-cli FLUSHALL
   ```
- Restart bench: `bench restart`
- Check API endpoint directly

---

## Test Summary Report Template

Use this template to document test results:

```
TOIL SYSTEM VERIFICATION REPORT
================================

Test Date: _______________
Tester: _______________
Environment: _______________
Site: _______________

BACKEND TESTS
-------------
[ ] Module Structure - PASS / FAIL
[ ] Database Schema - PASS / FAIL
[ ] Unit Tests (15/15) - PASS / FAIL
[ ] Calculation Functions - PASS / FAIL
[ ] Security Validation - PASS / FAIL

FRONTEND TESTS
--------------
[ ] TOIL Store - PASS / FAIL
[ ] Employee Dashboard - PASS / FAIL
[ ] Supervisor Dashboard - PASS / FAIL
[ ] UI/UX - PASS / FAIL
[ ] Responsive Design - PASS / FAIL

API TESTS
---------
[ ] Get User Role - PASS / FAIL
[ ] Get TOIL Balance - PASS / FAIL
[ ] Get TOIL Summary - PASS / FAIL
[ ] Calculate TOIL Preview - PASS / FAIL
[ ] Approve Timesheet - PASS / FAIL
[ ] Get Supervisor Timesheets - PASS / FAIL

WORKFLOW TESTS
--------------
[ ] Workflow 1: Employee Logs TOIL - PASS / FAIL
[ ] Workflow 2: Supervisor Approves - PASS / FAIL
[ ] Workflow 3: Employee Requests Leave - PASS / FAIL
[ ] Workflow 4: TOIL Expiry - PASS / FAIL
[ ] Workflow 5: Expiry Reminders - PASS / FAIL
[ ] Workflow 6: Cancellation Protection - PASS / FAIL
[ ] Workflow 7: Supervisor Validation - PASS / FAIL

OVERALL RESULT: _______________

NOTES:
________________________________________________________________________________
________________________________________________________________________________
________________________________________________________________________________

ISSUES FOUND:
________________________________________________________________________________
________________________________________________________________________________
________________________________________________________________________________
```

---

## Sign-Off

**Prepared By**: Development Team
**Reviewed By**: QA Team
**Approved By**: Project Manager

**Date**: _______________
**Version**: 1.0

---

*For questions or issues, contact the development team or refer to the technical documentation.*
