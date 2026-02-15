# TOIL System - Architecture Documentation

**Version:** 1.0
**Last Updated:** February 14, 2026
**System:** Time Off in Lieu (TOIL) Management

---

## Table of Contents

1. [System Architecture Overview](#system-architecture-overview)
2. [Data Flow Explanation](#data-flow-explanation)
3. [Component Interactions](#component-interactions)
4. [API Endpoints Documentation](#api-endpoints-documentation)
5. [Hook Execution Order](#hook-execution-order)
6. [Database Schema Changes](#database-schema-changes)
7. [Frontend Component Hierarchy](#frontend-component-hierarchy)

---

## System Architecture Overview

### High-Level Architecture

```
┌────────────────────────────────────────────────────────────────────┐
│                        TOIL SYSTEM ARCHITECTURE                     │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                     PRESENTATION LAYER                      │   │
│  │                                                              │   │
│  │  React Frontend (Doppio + AntD)                            │   │
│  │  ├─ Timesheet List/Detail Pages                            │   │
│  │  ├─ Leave Application Pages                                │   │
│  │  ├─ TOIL Dashboard Components                              │   │
│  │  └─ Zustand Stores (State Management)                      │   │
│  └────────────────────────────────────────────────────────────┘   │
│                            ↕ HTTP/REST                              │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                      API LAYER                              │   │
│  │                                                              │   │
│  │  Frappe Whitelisted Methods                                │   │
│  │  ├─ toil.py (9 API endpoints)                              │   │
│  │  ├─ Security validation                                    │   │
│  │  ├─ Response caching                                       │   │
│  │  └─ Error handling                                         │   │
│  └────────────────────────────────────────────────────────────┘   │
│                            ↕                                        │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   BUSINESS LOGIC LAYER                      │   │
│  │                                                              │   │
│  │  Document Hooks (hooks.py)                                 │   │
│  │  ├─ Timesheet Hooks (6 hooks)                              │   │
│  │  │   ├─ validate_timesheet                                 │   │
│  │  │   ├─ before_submit_timesheet                            │   │
│  │  │   ├─ on_submit → create_toil_allocation                 │   │
│  │  │   ├─ before_cancel_timesheet                            │   │
│  │  │   ├─ on_cancel → cancel_toil_allocation                 │   │
│  │  │   └─ recalculate_toil                                   │   │
│  │  │                                                           │   │
│  │  ├─ Leave Application Hooks (3 hooks)                      │   │
│  │  │   ├─ validate_toil_balance                              │   │
│  │  │   ├─ on_submit → track_toil_consumption                 │   │
│  │  │   └─ on_cancel → restore_toil_balance                   │   │
│  │  │                                                           │   │
│  │  └─ Utilities (toil_calculator.py)                         │   │
│  │      ├─ calculate_toil_hours()                             │   │
│  │      ├─ calculate_toil_days()                              │   │
│  │      ├─ validate_supervisor_permission()                   │   │
│  │      └─ check_toil_consumption()                           │   │
│  └────────────────────────────────────────────────────────────┘   │
│                            ↕                                        │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                       DATA LAYER                            │   │
│  │                                                              │   │
│  │  ERPNext Standard DocTypes (extended)                      │   │
│  │  ├─ Timesheet (+ 6 custom fields)                          │   │
│  │  ├─ Leave Allocation (+ 3 custom fields)                   │   │
│  │  ├─ Leave Application (no changes)                         │   │
│  │  ├─ Leave Ledger Entry (standard)                          │   │
│  │  ├─ Leave Type (fixture)                                   │   │
│  │  └─ Employee (standard)                                    │   │
│  │                                                              │   │
│  │  Database Indexes (3 indexes)                              │   │
│  │  ├─ idx_leave_ledger_toil                                  │   │
│  │  ├─ idx_leave_allocation_toil                              │   │
│  │  └─ idx_timesheet_toil                                     │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                   SCHEDULED TASKS LAYER                     │   │
│  │                                                              │   │
│  │  Cron Jobs (toil_expiry.py)                                │   │
│  │  ├─ expire_toil_allocations() - Daily                      │   │
│  │  └─ send_expiry_reminders() - Weekly                       │   │
│  └────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Backend:**
- Frappe Framework 14+
- Python 3.10+
- MariaDB 10.6+ / MySQL 8.0+
- Redis (caching)

**Frontend:**
- React 18
- Ant Design (AntD)
- Zustand (state management)
- Axios (HTTP client)
- Doppio (Frappe frontend framework)

**Infrastructure:**
- Nginx/Apache (web server)
- Supervisor (process management)
- Cron (scheduled tasks)
- Email server (SMTP)

---

## Data Flow Explanation

### Flow 1: TOIL Accrual (Timesheet Submission)

```
┌──────────────────────────────────────────────────────────────────┐
│                    TOIL ACCRUAL DATA FLOW                         │
└──────────────────────────────────────────────────────────────────┘

1. EMPLOYEE CREATES TIMESHEET
   ↓
   Employee enters time logs with is_billable = false
   ↓
   Saves timesheet (docstatus = 0)
   ↓

2. AUTOMATIC CALCULATION (before_save hook)
   ↓
   recalculate_toil() → calculate_toil_hours()
   ↓
   Calculates: total_toil_hours = SUM(hours WHERE is_billable = 0)
   ↓
   Calculates: toil_days = total_toil_hours / 8
   ↓
   Sets: toil_status = "Pending"
   ↓

3. SUPERVISOR REVIEWS
   ↓
   Supervisor opens timesheet
   ↓
   Sees TOIL summary card (total hours, days, breakdown)
   ↓

4. SUBMISSION VALIDATION (before_submit hook)
   ↓
   before_submit_timesheet() → validate_supervisor_permission()
   ↓
   Checks:
   - Employee has supervisor (reports_to IS NOT NULL)
   - Supervisor has user account (user_id IS NOT NULL)
   - Current user IS supervisor (or System Manager)
   ↓
   If validation fails → throw ValidationError
   ↓

5. TIMESHEET SUBMITTED
   ↓
   docstatus = 1 (Submitted)
   ↓
   on_submit hook triggers
   ↓

6. CREATE TOIL ALLOCATION (on_submit hook)
   ↓
   create_toil_allocation()
   ↓
   TRANSACTION START
   ↓
   Lock employee record (SELECT FOR UPDATE)
   ↓
   Create Leave Allocation:
   - employee: from timesheet
   - leave_type: "Time Off in Lieu"
   - from_date: today
   - to_date: today + 6 months
   - new_leaves_allocated: toil_days
   - source_timesheet: timesheet.name
   - is_toil_allocation: 1
   ↓
   Submit Leave Allocation (docstatus = 1)
   ↓

7. LEAVE LEDGER ENTRY (automatic by ERPNext)
   ↓
   ERPNext automatically creates Leave Ledger Entry:
   - transaction_type: "Leave Allocation"
   - transaction_name: allocation.name
   - leaves: +toil_days (positive = accrual)
   - employee: from allocation
   - leave_type: "Time Off in Lieu"
   - from_date, to_date: from allocation
   - is_expired: 0
   - docstatus: 1
   ↓

8. UPDATE TIMESHEET REFERENCE
   ↓
   Update timesheet fields:
   - toil_allocation: allocation.name
   - toil_status: "Accrued"
   ↓
   TRANSACTION COMMIT
   ↓

9. CACHE INVALIDATION
   ↓
   Clear TOIL caches for employee:
   - toil-balance-{employee}
   - toil-summary-{employee}
   - toil-timesheets-*
   ↓

10. NOTIFY EMPLOYEE (msgprint)
    ↓
    Display success message:
    "TOIL Allocation created: X days (Y hours) valid for 6 months"
    ↓
    DONE

ERROR HANDLING (if step 6 fails):
   ↓
   ROLLBACK TRANSACTION
   ↓
   Reset timesheet to Draft:
   - docstatus = 0
   - toil_status = "Pending"
   - toil_allocation = NULL
   ↓
   Throw user-friendly error
   ↓
   User can fix issue and resubmit
```

### Flow 2: TOIL Consumption (Leave Application)

```
┌──────────────────────────────────────────────────────────────────┐
│                 TOIL CONSUMPTION DATA FLOW                        │
└──────────────────────────────────────────────────────────────────┘

1. EMPLOYEE CREATES LEAVE APPLICATION
   ↓
   Employee selects:
   - Leave Type: "Time Off in Lieu"
   - From Date, To Date
   ↓
   System calculates: total_leave_days
   ↓

2. BALANCE CHECK (validate hook)
   ↓
   validate_toil_balance()
   ↓
   Query Leave Ledger Entry:
   SELECT SUM(leaves) as balance
   FROM `tabLeave Ledger Entry`
   WHERE employee = {employee}
   AND leave_type = "Time Off in Lieu"
   AND docstatus = 1
   AND is_expired = 0
   ↓
   Check: total_leave_days <= balance
   ↓
   If insufficient → throw ValidationError
   ↓

3. EXPIRY WARNING (validate hook)
   ↓
   Check for allocations expiring within 30 days:
   SELECT SUM(leaves), MIN(to_date)
   FROM Leave Ledger Entry
   JOIN Leave Allocation
   WHERE to_date BETWEEN today AND today+30
   ↓
   If expiring soon → show warning message
   ↓

4. SUPERVISOR APPROVAL
   ↓
   Supervisor reviews and approves
   ↓
   Leave Application submitted (docstatus = 1)
   ↓

5. LEAVE LEDGER ENTRY (automatic by ERPNext)
   ↓
   ERPNext creates Leave Ledger Entry:
   - transaction_type: "Leave Application"
   - transaction_name: leave_app.name
   - leaves: -total_leave_days (negative = consumption)
   - employee: from leave app
   - leave_type: "Time Off in Lieu"
   - from_date, to_date: from leave app
   - docstatus: 1
   ↓

6. TRACK CONSUMPTION (on_submit hook)
   ↓
   track_toil_consumption()
   ↓
   Get available allocations (FIFO order):
   SELECT * FROM Leave Allocation
   WHERE employee = {employee}
   AND is_toil_allocation = 1
   AND to_date >= today
   ORDER BY from_date ASC (oldest first)
   ↓
   For each allocation:
   - Calculate available balance
   - Consume from allocation
   - Log consumption for audit trail
   ↓
   Store consumption log (if custom field exists)
   ↓

7. CACHE INVALIDATION
   ↓
   Clear TOIL caches for employee:
   - toil-balance-{employee}
   - toil-summary-{employee}
   ↓

8. BALANCE UPDATE
   ↓
   New balance = Previous balance - total_leave_days
   ↓
   DONE

CANCELLATION FLOW:
   ↓
   Employee/Supervisor cancels Leave Application
   ↓
   restore_toil_balance() hook triggers
   ↓
   ERPNext automatically cancels Leave Ledger Entry
   (leaves are restored automatically)
   ↓
   Show message: "TOIL balance restored"
   ↓
   Clear caches
   ↓
   DONE
```

### Flow 3: TOIL Expiry (Scheduled Task)

```
┌──────────────────────────────────────────────────────────────────┐
│                    TOIL EXPIRY DATA FLOW                          │
└──────────────────────────────────────────────────────────────────┘

1. CRON TRIGGER (Daily at 2:00 AM)
   ↓
   Cron executes: expire_toil_allocations()
   ↓

2. CALCULATE EXPIRY DATE
   ↓
   six_months_ago = today - 6 months
   ↓

3. MARK EXPIRED ALLOCATIONS
   ↓
   Execute UPDATE query:
   UPDATE `tabLeave Ledger Entry` lle
   INNER JOIN `tabLeave Allocation` la
     ON lle.transaction_name = la.name
   SET lle.is_expired = 1
   WHERE la.is_toil_allocation = 1
   AND la.from_date <= six_months_ago
   AND la.docstatus = 1
   AND lle.is_expired = 0
   AND lle.docstatus = 1
   ↓

4. COMMIT CHANGES
   ↓
   frappe.db.commit()
   ↓

5. LOG RESULT
   ↓
   Log: "Expired {count} TOIL allocation(s)"
   ↓

6. BALANCE QUERIES (automatic effect)
   ↓
   Future balance queries exclude expired entries:
   WHERE is_expired = 0 OR is_expired IS NULL
   ↓
   DONE
```

### Flow 4: Expiry Reminders (Scheduled Task)

```
┌──────────────────────────────────────────────────────────────────┐
│                 EXPIRY REMINDER DATA FLOW                         │
└──────────────────────────────────────────────────────────────────┘

1. CRON TRIGGER (Weekly, Monday 9:00 AM)
   ↓
   Cron executes: send_expiry_reminders()
   ↓

2. FIND EXPIRING ALLOCATIONS
   ↓
   thirty_days_out = today + 30 days
   ↓
   Query:
   SELECT employee, SUM(leaves), MIN(to_date), COUNT(*)
   FROM Leave Ledger Entry
   JOIN Leave Allocation
   WHERE is_toil_allocation = 1
   AND to_date BETWEEN today AND thirty_days_out
   AND is_expired = 0
   AND docstatus = 1
   GROUP BY employee
   HAVING SUM(leaves) > 0
   ↓

3. FOR EACH EMPLOYEE WITH EXPIRING TOIL
   ↓
   Get employee email from user_id
   ↓
   Get detailed allocation information
   ↓
   Get current total balance
   ↓

4. BUILD EMAIL
   ↓
   Subject: "TOIL Expiry Reminder: {days} days expiring soon"
   ↓
   Body contains:
   - Expiring balance (days)
   - Earliest expiry date
   - Days until expiry
   - Current total balance
   - Table of expiring allocations
   - Link to request TOIL leave
   ↓

5. SEND EMAIL
   ↓
   frappe.sendmail()
   ↓
   Email queued in Email Queue
   ↓
   Email Queue worker sends asynchronously
   ↓

6. LOG RESULT
   ↓
   Log: "Sent {count} TOIL expiry reminder(s)"
   ↓
   DONE
```

---

## Component Interactions

### Backend Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    BACKEND COMPONENTS                            │
└─────────────────────────────────────────────────────────────────┘

api/toil.py (API Layer)
├─ @frappe.whitelist() methods
├─ Security: validate_employee_access()
├─ Caching: @cache_response decorator
└─ Error handling: try/except with logging
    ↓ calls
    ↓
utils/toil_calculator.py (Business Logic)
├─ calculate_toil_hours(timesheet_doc)
├─ calculate_toil_days(toil_hours)
├─ validate_supervisor_permission(timesheet_doc)
├─ check_toil_consumption(allocation_name)
└─ get_allocation_balance(allocation_name)
    ↓ used by
    ↓
overrides/timesheet.py (Document Hooks)
├─ validate_timesheet(doc, method)
├─ before_submit_timesheet(doc, method)
├─ create_toil_allocation(doc, method)
├─ before_cancel_timesheet(doc, method)
├─ cancel_toil_allocation(doc, method)
└─ recalculate_toil(doc, method)
    ↓ modifies
    ↓
DocTypes (Data Layer)
├─ Timesheet (with custom fields)
├─ Leave Allocation (with custom fields)
├─ Leave Ledger Entry (standard)
└─ Leave Application (standard)

Scheduled Tasks
tasks/toil_expiry.py
├─ expire_toil_allocations()
│  └─ Updates Leave Ledger Entry.is_expired
│
└─ send_expiry_reminders()
   └─ Queries expiring allocations
   └─ Sends emails via frappe.sendmail()

Hooks Registration
hooks.py
├─ doc_events
│  ├─ Timesheet: [6 hooks]
│  └─ Leave Application: [3 hooks]
│
└─ (scheduler_events removed - using system cron)
```

### Frontend Component Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                   FRONTEND COMPONENTS                            │
└─────────────────────────────────────────────────────────────────┘

src/stores/toilStore.js (State Management)
├─ State:
│  ├─ timesheets: []
│  ├─ selectedTimesheet: null
│  ├─ filters: {}
│  ├─ loading, error
│  └─ userRole
│
├─ Actions:
│  ├─ initialize()
│  ├─ fetchTimesheets()
│  ├─ fetchTimesheet(id)
│  ├─ approveTimesheet(id, comment)
│  ├─ rejectTimesheet(id, reason)
│  └─ setFilters()
│
└─ Uses:
    ↓
    ↓
src/services/api/toil.js (API Client)
├─ TOILService class
├─ Methods:
│  ├─ getTimesheets(filters)
│  ├─ getTimesheet(id)
│  ├─ approveTimesheet(id, comment)
│  ├─ rejectTimesheet(id, reason)
│  ├─ getTOILBalance(employeeId)
│  ├─ getTOILSummary(employeeId)
│  ├─ calculateTOILPreview(timesheetName)
│  ├─ getSupervisorTimesheets(filters)
│  └─ getTOILBreakdown(timesheetName)
│
├─ Features:
│  ├─ Retry logic (withRetry)
│  ├─ Response caching (withCache)
│  ├─ Error handling
│  └─ Mock data support
│
└─ Calls:
    ↓
    ↓
Backend API Endpoints
/api/method/frappe_devsecops_dashboard.api.toil.*

Components (if implemented):
src/components/toil/
├─ TOILSummaryCard.jsx
├─ TOILBreakdownTable.jsx
├─ TOILBalanceWidget.jsx
└─ TimesheetApprovalButtons.jsx
```

---

## API Endpoints Documentation

### Base URL
```
https://YOUR_DOMAIN/api/method/frappe_devsecops_dashboard.api.toil
```

### Authentication
All endpoints require authentication via:
- Cookie-based session (for web UI)
- API key/secret (for programmatic access)

### Endpoint 1: Get User Role

**Method:** `GET`
**Endpoint:** `/get_user_role`
**Description:** Get current user's role in TOIL system

**Request:**
```http
GET /api/method/frappe_devsecops_dashboard.api.toil.get_user_role
Authorization: token {api_key}:{api_secret}
```

**Response:**
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

**Possible Roles:**
- `employee` - Regular employee (can view own TOIL)
- `supervisor` - Has subordinates (can approve timesheets)
- `hr` - System Manager or HR Manager (can view all)

---

### Endpoint 2: Get TOIL Balance

**Method:** `GET`
**Endpoint:** `/get_toil_balance`
**Description:** Get current TOIL balance for an employee

**Request:**
```http
GET /api/method/frappe_devsecops_dashboard.api.toil.get_toil_balance?employee=EMP-001
Authorization: token {api_key}:{api_secret}
```

**Parameters:**
- `employee` (optional) - Employee ID. Defaults to current user's employee.

**Response:**
```json
{
  "message": {
    "success": true,
    "employee": "EMP-001",
    "employee_name": "John Doe",
    "balance": 3.500,
    "leave_type": "Time Off in Lieu",
    "unit": "days"
  }
}
```

**Cache:** 60 seconds

---

### Endpoint 3: Get TOIL Summary

**Method:** `GET`
**Endpoint:** `/get_toil_summary`
**Description:** Get detailed TOIL summary with breakdowns

**Request:**
```http
GET /api/method/frappe_devsecops_dashboard.api.toil.get_toil_summary?employee=EMP-001
Authorization: token {api_key}:{api_secret}
```

**Parameters:**
- `employee` (optional) - Employee ID

**Response:**
```json
{
  "message": {
    "success": true,
    "employee": "EMP-001",
    "employee_name": "John Doe",
    "balance": 3.500,
    "total_accrued": 8.000,
    "total_consumed": 4.500,
    "expiring_soon": 1.500,
    "expiring_in_days": 30,
    "recent_timesheets": [
      {
        "name": "TS-00001",
        "start_date": "2026-02-01",
        "end_date": "2026-02-07",
        "total_toil_hours": 16.00,
        "toil_days": 2.000,
        "toil_status": "Accrued",
        "docstatus": 1
      }
    ],
    "leave_type": "Time Off in Lieu"
  }
}
```

**Cache:** 300 seconds (5 minutes)

---

### Endpoint 4: Get Supervisor Timesheets

**Method:** `GET`
**Endpoint:** `/get_supervisor_timesheets`
**Description:** Get timesheets from supervisor's subordinates

**Request:**
```http
GET /api/method/frappe_devsecops_dashboard.api.toil.get_supervisor_timesheets
  ?status=Pending
  &from_date=2026-02-01
  &to_date=2026-02-28
  &limit_start=0
  &limit_page_length=20
Authorization: token {api_key}:{api_secret}
```

**Parameters:**
- `status` (optional) - Filter by status: Draft, Pending, Submitted, Cancelled
- `from_date` (optional) - Start date filter (YYYY-MM-DD)
- `to_date` (optional) - End date filter (YYYY-MM-DD)
- `limit_start` (optional) - Pagination offset (default: 0)
- `limit_page_length` (optional) - Records per page (default: 20)

**Response:**
```json
{
  "message": {
    "success": true,
    "data": [
      {
        "name": "TS-00001",
        "employee": "EMP-002",
        "employee_name": "Jane Smith",
        "start_date": "2026-02-01",
        "end_date": "2026-02-07",
        "total_toil_hours": 16.00,
        "toil_days": 2.000,
        "toil_status": "Pending Accrual",
        "docstatus": 0,
        "modified": "2026-02-08 10:30:00"
      }
    ],
    "total": 5,
    "subordinates": [
      {"name": "EMP-002", "employee_name": "Jane Smith"},
      {"name": "EMP-003", "employee_name": "Bob Johnson"}
    ]
  }
}
```

---

### Endpoint 5: Calculate TOIL Preview

**Method:** `GET`
**Endpoint:** `/calculate_toil_preview`
**Description:** Preview TOIL calculation before submission

**Request:**
```http
GET /api/method/frappe_devsecops_dashboard.api.toil.calculate_toil_preview
  ?timesheet_name=TS-00001
Authorization: token {api_key}:{api_secret}
```

**Parameters:**
- `timesheet_name` (required) - Timesheet ID

**Response:**
```json
{
  "message": {
    "success": true,
    "timesheet": "TS-00001",
    "employee": "EMP-001",
    "employee_name": "John Doe",
    "total_toil_hours": 16.00,
    "toil_days": 2.000,
    "breakdown": [
      {
        "activity_type": "Training",
        "project": "PRO-001",
        "from_time": "2026-02-10 09:00:00",
        "to_time": "2026-02-10 17:00:00",
        "hours": 8.00,
        "description": "Team training session"
      },
      {
        "activity_type": "Documentation",
        "project": null,
        "from_time": "2026-02-11 09:00:00",
        "to_time": "2026-02-11 17:00:00",
        "hours": 8.00,
        "description": "Writing documentation"
      }
    ],
    "can_submit": true
  }
}
```

---

### Endpoint 6: Approve Timesheet

**Method:** `POST`
**Endpoint:** `/approve_timesheet`
**Description:** Approve timesheet (supervisor only)

**Request:**
```http
POST /api/method/frappe_devsecops_dashboard.api.toil.approve_timesheet
Authorization: token {api_key}:{api_secret}
Content-Type: application/json

{
  "timesheet_name": "TS-00001",
  "comment": "Approved - all hours verified"
}
```

**Parameters:**
- `timesheet_name` (required) - Timesheet ID
- `comment` (optional) - Approval comment

**Response:**
```json
{
  "message": {
    "success": true,
    "message": "Timesheet approved successfully",
    "timesheet": "TS-00001",
    "toil_allocation": "LEAVE-ALLOC-00001",
    "toil_days": 2.000
  }
}
```

**Errors:**
- `403` - Not authorized (not supervisor)
- `400` - Already submitted
- `404` - Timesheet not found

---

### Endpoint 7: Reject Timesheet

**Method:** `POST`
**Endpoint:** `/reject_timesheet`
**Description:** Reject timesheet (supervisor only)

**Request:**
```http
POST /api/method/frappe_devsecops_dashboard.api.toil.reject_timesheet
Authorization: token {api_key}:{api_secret}
Content-Type: application/json

{
  "timesheet_name": "TS-00001",
  "reason": "Please provide more details on activities"
}
```

**Parameters:**
- `timesheet_name` (required) - Timesheet ID
- `reason` (required) - Rejection reason (min 10 characters)

**Response:**
```json
{
  "message": {
    "success": true,
    "message": "Timesheet rejected",
    "timesheet": "TS-00001",
    "reason": "Please provide more details on activities"
  }
}
```

**Errors:**
- `403` - Not authorized
- `400` - Invalid reason (too short)
- `404` - Timesheet not found

---

### Endpoint 8: Get TOIL Breakdown

**Method:** `GET`
**Endpoint:** `/get_toil_breakdown`
**Description:** Get day-by-day TOIL breakdown for timesheet

**Request:**
```http
GET /api/method/frappe_devsecops_dashboard.api.toil.get_toil_breakdown
  ?timesheet_name=TS-00001
Authorization: token {api_key}:{api_secret}
```

**Parameters:**
- `timesheet_name` (required) - Timesheet ID

**Response:**
```json
{
  "message": {
    "success": true,
    "timesheet": "TS-00001",
    "employee": "EMP-001",
    "employee_name": "John Doe",
    "start_date": "2026-02-01",
    "end_date": "2026-02-07",
    "total_toil_hours": 16.00,
    "toil_days": 2.000,
    "daily_breakdown": [
      {
        "date": "2026-02-10",
        "total_hours": 8.00,
        "activities": [
          {
            "activity_type": "Training",
            "project": "PRO-001",
            "from_time": "2026-02-10 09:00:00",
            "to_time": "2026-02-10 17:00:00",
            "hours": 8.00,
            "description": "Team training"
          }
        ]
      },
      {
        "date": "2026-02-11",
        "total_hours": 8.00,
        "activities": [
          {
            "activity_type": "Documentation",
            "project": null,
            "from_time": "2026-02-11 09:00:00",
            "to_time": "2026-02-11 17:00:00",
            "hours": 8.00,
            "description": "Writing docs"
          }
        ]
      }
    ],
    "toil_status": "Accrued"
  }
}
```

---

### Endpoint 9: Get TOIL Report

**Method:** `GET`
**Endpoint:** `/get_toil_report`
**Description:** Generate TOIL report for date range

**Request:**
```http
GET /api/method/frappe_devsecops_dashboard.api.toil.get_toil_report
  ?employee=EMP-001
  &from_date=2026-01-01
  &to_date=2026-02-28
Authorization: token {api_key}:{api_secret}
```

**Parameters:**
- `employee` (required) - Employee ID
- `from_date` (required) - Start date (YYYY-MM-DD)
- `to_date` (required) - End date (YYYY-MM-DD)

**Response:**
```json
{
  "message": {
    "success": true,
    "employee": "EMP-001",
    "employee_name": "John Doe",
    "department": "Engineering",
    "designation": "Software Developer",
    "from_date": "2026-01-01",
    "to_date": "2026-02-28",
    "summary": {
      "total_accrued": 8.000,
      "total_consumed": 4.500,
      "net_change": 3.500
    },
    "transactions": [
      {
        "transaction_type": "Leave Allocation",
        "transaction_name": "LEAVE-ALLOC-00001",
        "leaves": 2.000,
        "from_date": "2026-02-08",
        "to_date": "2026-08-08",
        "creation": "2026-02-08 15:30:00",
        "source_timesheet": "TS-00001"
      },
      {
        "transaction_type": "Leave Application",
        "transaction_name": "LEAVE-APP-00001",
        "leaves": -1.000,
        "from_date": "2026-02-15",
        "to_date": "2026-02-15",
        "creation": "2026-02-14 10:00:00",
        "source_timesheet": null
      }
    ]
  }
}
```

---

## Hook Execution Order

### Timesheet Lifecycle Hooks

```
DRAFT STATE (docstatus = 0)
│
├─ User creates/edits timesheet
│  └─ before_save
│     └─ recalculate_toil(doc, method)
│        ├─ Calculates: total_toil_hours
│        ├─ Calculates: toil_days
│        └─ Sets: toil_status = "Pending"
│
├─ validate
│  └─ validate_timesheet(doc, method)
│     ├─ Recalculates TOIL (same as before_save)
│     └─ Updates preview fields
│
└─ after_save (no hooks)

SUBMISSION (docstatus = 0 → 1)
│
├─ before_submit
│  └─ before_submit_timesheet(doc, method)
│     └─ validate_supervisor_permission(doc)
│        ├─ Check: employee.reports_to IS NOT NULL
│        ├─ Check: supervisor.user_id IS NOT NULL
│        ├─ Check: current_user == supervisor.user_id
│        └─ Throws ValidationError if fails
│
├─ on_submit
│  └─ create_toil_allocation(doc, method)
│     ├─ TRANSACTION START
│     ├─ Lock employee (SELECT FOR UPDATE)
│     ├─ Create Leave Allocation
│     │  ├─ employee: doc.employee
│     │  ├─ leave_type: "Time Off in Lieu"
│     │  ├─ from_date: today
│     │  ├─ to_date: today + 6 months
│     │  ├─ new_leaves_allocated: doc.toil_days
│     │  ├─ source_timesheet: doc.name
│     │  └─ is_toil_allocation: 1
│     ├─ Submit Leave Allocation
│     │  └─ ERPNext creates Leave Ledger Entry (auto)
│     ├─ Update timesheet:
│     │  ├─ toil_allocation: allocation.name
│     │  └─ toil_status: "Accrued"
│     ├─ TRANSACTION COMMIT
│     ├─ Clear caches
│     └─ Show success message
│     │
│     └─ ON ERROR:
│        ├─ ROLLBACK TRANSACTION
│        ├─ Reset timesheet to Draft
│        └─ Throw error
│
└─ after_submit (no hooks)

CANCELLATION (docstatus = 1 → 2)
│
├─ before_cancel
│  └─ before_cancel_timesheet(doc, method)
│     └─ check_toil_consumption(doc.toil_allocation)
│        ├─ Check if TOIL has been used
│        ├─ If consumed: throw ValidationError
│        └─ Prevents data inconsistency
│
├─ on_cancel
│  └─ cancel_toil_allocation(doc, method)
│     ├─ Get Leave Allocation
│     ├─ Cancel allocation
│     │  └─ ERPNext cancels Leave Ledger Entry (auto)
│     ├─ Update: toil_status = "Cancelled"
│     └─ Clear caches
│
└─ after_cancel (no hooks)
```

### Leave Application Lifecycle Hooks

```
DRAFT STATE (docstatus = 0)
│
└─ validate
   └─ validate_toil_balance(doc, method)
      ├─ Only for leave_type = "Time Off in Lieu"
      ├─ Query current balance
      ├─ Check: total_leave_days <= balance
      ├─ If insufficient: throw ValidationError
      ├─ Check for expiring allocations (within 30 days)
      └─ Show warning if expiring soon

SUBMISSION (docstatus = 0 → 1)
│
├─ on_submit
│  ├─ ERPNext creates Leave Ledger Entry (auto)
│  │  ├─ transaction_type: "Leave Application"
│  │  ├─ leaves: -total_leave_days (negative)
│  │  └─ docstatus: 1
│  │
│  └─ track_toil_consumption(doc, method)
│     ├─ Only for leave_type = "Time Off in Lieu"
│     ├─ Get available allocations (FIFO order)
│     ├─ For each allocation:
│     │  ├─ Get available balance
│     │  ├─ Consume from allocation
│     │  └─ Log consumption
│     ├─ Store consumption log (if field exists)
│     └─ Clear caches

CANCELLATION (docstatus = 1 → 2)
│
└─ on_cancel
   └─ restore_toil_balance(doc, method)
      ├─ Only for leave_type = "Time Off in Lieu"
      ├─ ERPNext cancels Leave Ledger Entry (auto)
      │  └─ Balance restored automatically
      ├─ Show message: "Balance restored"
      └─ Clear caches
```

### Hook Priority and Dependencies

**Order of Execution (same event):**
1. Framework hooks (ERPNext standard)
2. Custom app hooks (TOIL system)
3. Other app hooks (if any)

**Critical Dependencies:**
- `before_submit_timesheet` MUST complete before `on_submit`
- `create_toil_allocation` MUST be atomic (transaction)
- `before_cancel_timesheet` MUST validate before `on_cancel`
- Leave Ledger Entry creation is automatic (no explicit hook needed)

---

## Database Schema Changes

### Custom Fields Added

#### Timesheet Custom Fields

| Field Name | Type | Properties |
|------------|------|------------|
| `toil_section` | Section Break | collapsible=1 |
| `total_toil_hours` | Float | read_only=1, precision=2 |
| `toil_days` | Float | read_only=1, precision=3 |
| `toil_allocation` | Link | options='Leave Allocation', read_only=1, allow_on_submit=1 |
| `toil_status` | Select | options='Not Applicable\nPending Accrual\nAccrued\nPartially Used\nFully Used', read_only=1, allow_on_submit=1 |
| `toil_calculation_details` | Small Text | read_only=1 |

#### Leave Allocation Custom Fields

| Field Name | Type | Properties |
|------------|------|------------|
| `source_timesheet` | Link | options='Timesheet', read_only=1 |
| `toil_hours` | Float | read_only=1, precision=2 |
| `is_toil_allocation` | Check | read_only=1, default=0 |

### Database Indexes

#### Index 1: idx_leave_ledger_toil
```sql
CREATE INDEX idx_leave_ledger_toil
ON `tabLeave Ledger Entry` (employee, leave_type, docstatus, to_date);
```
**Purpose:** Optimize TOIL balance queries
**Usage:** Used in get_toil_balance, get_toil_summary

#### Index 2: idx_leave_allocation_toil
```sql
CREATE INDEX idx_leave_allocation_toil
ON `tabLeave Allocation` (is_toil_allocation, employee, docstatus);
```
**Purpose:** Optimize TOIL allocation queries
**Usage:** Used in allocation lookups, expiry checks

#### Index 3: idx_timesheet_toil
```sql
CREATE INDEX idx_timesheet_toil
ON `tabTimesheet` (employee, docstatus, toil_status);
```
**Purpose:** Optimize timesheet queries with TOIL
**Usage:** Used in timesheet listings, supervisor views

### Entity Relationship Diagram

```
┌────────────────────┐
│     Employee       │
│                    │
│ PK: name           │
│    employee_name   │
│    user_id ────────┼─── Links to User account
│    reports_to ─────┼─── Self-reference (Supervisor)
│    status          │
└────────────────────┘
         │
         │ 1:N
         │
         ↓
┌────────────────────┐       ┌─────────────────────┐
│    Timesheet       │       │  Leave Type         │
│                    │       │                     │
│ PK: name           │       │ PK: name            │
│ FK: employee       │       │    "Time Off in     │
│    start_date      │       │     Lieu"           │
│    end_date        │       │    is_carry_forward │
│    docstatus       │       │    expire_after_    │
│                    │       │     days: 180       │
│ Custom Fields:     │       └─────────────────────┘
│ + total_toil_hours │                │
│ + toil_days        │                │
│ + toil_allocation ─┼───┐            │
│ + toil_status      │   │            │
│ + toil_calculation │   │            │
│   _details         │   │            │
└────────────────────┘   │            │
                         │            │
                         │ 1:1        │
                         │            │
                         ↓            │
                ┌────────────────────┐│
                │ Leave Allocation   ││
                │                    ││
                │ PK: name           ││
                │ FK: employee       ││
                │ FK: leave_type ────┼┘
                │    from_date       │
                │    to_date         │
                │    new_leaves_     │
                │     allocated      │
                │    docstatus       │
                │                    │
                │ Custom Fields:     │
                │ + source_timesheet │─── References Timesheet
                │ + toil_hours       │
                │ + is_toil_         │
                │   allocation: 1    │
                └────────────────────┘
                         │
                         │ 1:N (auto-created by ERPNext)
                         │
                         ↓
                ┌────────────────────┐
                │ Leave Ledger Entry │
                │                    │
                │ PK: name           │
                │ FK: employee       │
                │ FK: leave_type     │
                │    transaction_    │
                │     type           │
                │    transaction_    │
                │     name ──────────┼─── References Leave Allocation
                │    leaves          │     or Leave Application
                │    from_date       │
                │    to_date         │
                │    is_expired: 0   │
                │    docstatus       │
                └────────────────────┘
                         ↑
                         │ 1:N (auto-created by ERPNext)
                         │
                ┌────────────────────┐
                │ Leave Application  │
                │                    │
                │ PK: name           │
                │ FK: employee       │
                │ FK: leave_type     │
                │    from_date       │
                │    to_date         │
                │    total_leave_    │
                │     days           │
                │    docstatus       │
                │                    │
                │ (No custom fields) │
                └────────────────────┘
```

### Data Flow in Database

**TOIL Accrual:**
```
1. Timesheet (docstatus=1)
   ↓ triggers on_submit hook
   ↓ creates
2. Leave Allocation (docstatus=1, is_toil_allocation=1)
   ↓ ERPNext auto-creates
   ↓
3. Leave Ledger Entry (transaction_type='Leave Allocation', leaves=+2.0)
```

**TOIL Consumption:**
```
1. Leave Application (docstatus=1, leave_type='Time Off in Lieu')
   ↓ ERPNext auto-creates
   ↓
2. Leave Ledger Entry (transaction_type='Leave Application', leaves=-1.0)
```

**Balance Calculation:**
```sql
-- Current balance query
SELECT SUM(leaves) as balance
FROM `tabLeave Ledger Entry`
WHERE employee = 'EMP-001'
AND leave_type = 'Time Off in Lieu'
AND docstatus = 1
AND (is_expired IS NULL OR is_expired = 0)

-- Result: Sum of all allocations (+) and consumptions (-)
-- Example: +2.0 +3.0 -1.0 -1.5 = 2.5 days
```

---

## Frontend Component Hierarchy

```
App (Doppio)
│
├─ Router
│  ├─ /timesheets → TimesheetList
│  ├─ /timesheet/:id → TimesheetDetail
│  ├─ /leave-applications → LeaveApplicationList
│  ├─ /leave-application/:id → LeaveApplicationDetail
│  └─ /toil-dashboard → TOILDashboard (if implemented)
│
└─ Providers
   ├─ AuthProvider
   ├─ ApiProvider
   └─ StoreProvider

State Management (Zustand):
toilStore
├─ timesheets: Array
├─ selectedTimesheet: Object
├─ filters: Object
├─ pagination: Object
├─ loading: Boolean
├─ error: String
├─ userRole: String
│
└─ Actions:
   ├─ initialize()
   ├─ fetchTimesheets()
   ├─ fetchTimesheet(id)
   ├─ approveTimesheet(id, comment)
   ├─ rejectTimesheet(id, reason)
   ├─ setFilters(filters)
   ├─ setPagination(pagination)
   └─ setViewMode(mode)

Service Layer:
src/services/api/toil.js
└─ TOILService
   ├─ client: axios instance
   ├─ withRetry() - Retry failed requests
   ├─ withCache() - Cache responses
   └─ Methods (9 API methods)

Component Structure (if implemented):

TimesheetDetail
├─ Header
├─ TimesheetInfo
├─ TimeLogsTable
├─ TOILSummaryCard ← NEW
│  ├─ Total TOIL Hours display
│  ├─ TOIL Days display
│  ├─ TOIL Status badge
│  └─ Allocation reference link
│
├─ TOILBreakdownTable ← NEW
│  ├─ Day-by-day breakdown
│  ├─ Activity details
│  └─ Hours per day
│
└─ ApprovalButtons (if supervisor) ← NEW
   ├─ Approve button
   ├─ Reject button
   └─ Comment modal

LeaveApplicationDetail
├─ Header
├─ LeaveDetails
├─ TOILBalanceWidget ← NEW
│  ├─ Current balance
│  ├─ Requested days
│  ├─ Remaining balance
│  └─ Expiring soon warning
│
└─ SubmitButton

TOILDashboard (optional)
├─ BalanceSummary
│  ├─ Total accrued
│  ├─ Total consumed
│  ├─ Current balance
│  └─ Expiring soon
│
├─ RecentTimesheets
│  └─ Table of recent TOIL timesheets
│
├─ ExpiringAllocations
│  └─ Warning cards for expiring TOIL
│
└─ UsageChart
   └─ Visual representation of TOIL usage
```

---

## Performance Considerations

### Database Query Optimization

1. **Indexes:** All critical queries use database indexes
2. **Caching:** API responses cached (60s - 5min depending on endpoint)
3. **Query limits:** Pagination on list endpoints
4. **Connection pooling:** Handled by Frappe/MariaDB

### Frontend Performance

1. **Code splitting:** React lazy loading (if applicable)
2. **Memoization:** React.memo for expensive components
3. **Virtual scrolling:** For long lists
4. **Debounced search:** 300ms delay on search inputs

### Scalability

- **Horizontal scaling:** Stateless API endpoints
- **Caching layer:** Redis for response caching
- **Async processing:** Email queue for notifications
- **Batch operations:** Expiry task processes in batches

---

**Document Version:** 1.0
**Last Updated:** February 14, 2026
**Next Review:** March 14, 2026
