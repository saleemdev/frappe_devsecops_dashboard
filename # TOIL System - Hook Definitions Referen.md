# TOIL System - Hook Definitions Reference

## Hook Registration (hooks.py)

```python
# toil_management/hooks.py

app_name = "toil_management"

# ============================================================================
# DOCUMENT EVENT HOOKS
# ============================================================================

doc_events = {
    # -------------------------------------------------------------------------
    # TIMESHEET HOOKS - Core TOIL Accrual Logic
    # -------------------------------------------------------------------------
    "Timesheet": {
        # Hook 1: Calculate TOIL on validation (before save)
        "validate": "toil_management.overrides.timesheet.validate_timesheet",
        
        # Hook 2: Check supervisor permission before submit
        "before_submit": "toil_management.overrides.timesheet.before_submit_timesheet",
        
        # Hook 3: Create TOIL allocation on successful submit
        "on_submit": "toil_management.overrides.timesheet.create_toil_allocation",
        
        # Hook 4: Cancel TOIL allocation if timesheet is cancelled
        "on_cancel": "toil_management.overrides.timesheet.cancel_toil_allocation",
        
        # Hook 5: Recalculate TOIL on update
        "on_update": "toil_management.overrides.timesheet.recalculate_toil"
    },
    
    # -------------------------------------------------------------------------
    # LEAVE APPLICATION HOOKS - TOIL Consumption Tracking
    # -------------------------------------------------------------------------
    "Leave Application": {
        # Hook 6: Validate TOIL balance and expiry
        "validate": "toil_management.overrides.leave_application.validate_toil_balance",
        
        # Hook 7: Track TOIL source consumption on submit
        "on_submit": "toil_management.overrides.leave_application.track_toil_consumption",
        
        # Hook 8: Restore TOIL balance on cancel
        "on_cancel": "toil_management.overrides.leave_application.restore_toil_balance"
    },
    
    # -------------------------------------------------------------------------
    # LEAVE ALLOCATION HOOKS - Optional tracking
    # -------------------------------------------------------------------------
    "Leave Allocation": {
        # Hook 9: Mark TOIL allocations
        "before_save": "toil_management.overrides.leave_allocation.mark_toil_allocation"
    }
}

# ============================================================================
# PERMISSION QUERY HOOKS
# ============================================================================

permission_query_conditions = {
    "Timesheet": "toil_management.permissions.timesheet_query"
}

has_permission = {
    "Timesheet": "toil_management.permissions.has_timesheet_permission"
}

# ============================================================================
# SCHEDULED TASKS
# ============================================================================

scheduler_events = {
    # Daily: Expire old TOIL allocations
    "daily": [
        "toil_management.tasks.daily.expire_toil_allocations"
    ],
    
    # Weekly: Send TOIL expiry reminders
    "weekly": [
        "toil_management.tasks.weekly.send_expiry_reminders"
    ],
    
    # Monthly: Generate TOIL usage reports
    "monthly": [
        "toil_management.tasks.monthly.generate_usage_reports"
    ]
}

# ============================================================================
# API WHITELISTED METHODS
# ============================================================================

# Methods accessible via /api/method/[method_name]
# Used by frontend React components

override_whitelisted_methods = {
    # TOIL Balance APIs
    "toil_management.api.get_toil_balance": "toil_management.api.get_toil_balance",
    "toil_management.api.get_toil_summary": "toil_management.api.get_toil_summary",
    
    # Supervisor APIs
    "toil_management.api.get_supervisor_timesheets": "toil_management.api.get_supervisor_timesheets",
    "toil_management.api.approve_timesheet": "toil_management.api.approve_timesheet",
    
    # Preview/Calculation APIs
    "toil_management.api.calculate_toil_preview": "toil_management.api.calculate_toil_preview",
    "toil_management.api.get_toil_breakdown": "toil_management.api.get_toil_breakdown",
    
    # Report APIs
    "toil_management.api.get_toil_report": "toil_management.api.get_toil_report",
    "toil_management.api.export_toil_data": "toil_management.api.export_toil_data"
}

# ============================================================================
# FIXTURES - Master Data
# ============================================================================

fixtures = [
    {
        "dt": "Leave Type",
        "filters": [["name", "in", ["Time Off in Lieu"]]]
    },
    {
        "dt": "Custom Field",
        "filters": [["dt", "in", ["Timesheet", "Leave Allocation"]]]
    }
]

# ============================================================================
# JINJA TEMPLATE HOOKS (for print formats, emails)
# ============================================================================

jenv = {
    "methods": [
        "get_toil_balance:toil_management.api.get_toil_balance",
        "format_toil_hours:toil_management.utils.format_toil_hours"
    ]
}

# ============================================================================
# NOTIFICATION HOOKS
# ============================================================================

# Auto-send notifications on TOIL events
notification_config = "toil_management.notifications.get_notification_config"

# ============================================================================
# DASHBOARD HOOKS
# ============================================================================

# Add TOIL widgets to HR dashboard
# dashboards = {
#     "HR": "toil_management.dashboards.hr_dashboard.get_data"
# }
```

---

## Detailed Hook Implementations

### Hook 1: validate_timesheet

**Trigger:** Before timesheet is saved (Draft or Submit)  
**Purpose:** Calculate TOIL hours for preview  
**Impact:** Read-only, no data changes  

```python
def validate_timesheet(doc, method):
    """
    Calculate and display TOIL hours
    Updates: total_toil_hours, toil_days, toil_calculation_details
    """
    # Calculate non-billable hours
    # Update TOIL preview fields
    # Does NOT create allocation yet
```

**When it runs:**
- User creates new timesheet
- User edits existing timesheet
- Before submit validation

---

### Hook 2: before_submit_timesheet

**Trigger:** Just before timesheet is submitted (docstatus → 1)  
**Purpose:** Validate supervisor permission  
**Impact:** Can throw error to prevent submission  

```python
def before_submit_timesheet(doc, method):
    """
    Validate that current user is authorized to submit
    Only immediate supervisor or System Manager can submit
    """
    if not can_approve_timesheet(doc):
        raise frappe.PermissionError("Only supervisor can approve")
```

**When it runs:**
- User clicks "Submit" button
- API call to submit timesheet
- Before any permanent changes

**Validation logic:**
```python
def can_approve_timesheet(doc):
    current_user = frappe.session.user
    
    # System Manager bypass
    if "System Manager" in frappe.get_roles(current_user):
        return True
    
    # Check supervisor
    employee = frappe.get_doc("Employee", doc.employee)
    supervisor_user = frappe.db.get_value(
        "Employee", 
        employee.reports_to, 
        "user_id"
    )
    
    return current_user == supervisor_user
```

---

### Hook 3: create_toil_allocation (PRIMARY HOOK)

**Trigger:** After timesheet is successfully submitted  
**Purpose:** Create Leave Allocation for TOIL  
**Impact:** Creates Leave Allocation, Leave Ledger Entry  

```python
def create_toil_allocation(doc, method):
    """
    PRIMARY TOIL ACCRUAL HOOK
    
    Flow:
    1. Check if TOIL hours exist (doc.total_toil_hours > 0)
    2. Create Leave Allocation document
    3. Submit allocation (auto-creates Leave Ledger Entry)
    4. Link back to timesheet
    5. Update timesheet status
    """
    
    if flt(doc.total_toil_hours) <= 0:
        return  # No TOIL to allocate
    
    # Create Leave Allocation
    allocation = frappe.get_doc({
        "doctype": "Leave Allocation",
        "employee": doc.employee,
        "leave_type": "Time Off in Lieu",
        "from_date": getdate(),
        "to_date": add_months(getdate(), 6),
        "new_leaves_allocated": flt(doc.toil_days, 3),
        "description": f"TOIL from Timesheet {doc.name}",
        # Custom fields
        "source_timesheet": doc.name,
        "toil_hours": flt(doc.total_toil_hours, 2),
        "is_toil_allocation": 1
    })
    
    allocation.insert(ignore_permissions=True)
    allocation.submit()  # This triggers Leave Ledger Entry creation
    
    # Update timesheet
    doc.db_set('toil_allocation', allocation.name)
    doc.db_set('toil_status', 'Accrued')
```

**What gets created:**
1. Leave Allocation document (docstatus=1)
2. Leave Ledger Entry (automatically by ERPNext)
   - transaction_type: "Leave Allocation"
   - leaves: +positive value
   - employee, leave_type, dates

**Database impact:**
```sql
-- Leave Allocation
INSERT INTO `tabLeave Allocation` (
    name, employee, leave_type, 
    new_leaves_allocated, source_timesheet
) VALUES (
    'LA-2026-00001', 'EMP-001', 'Time Off in Lieu',
    1.5, 'TS-2026-00042'
);

-- Leave Ledger Entry (automatic)
INSERT INTO `tabLeave Ledger Entry` (
    employee, leave_type, transaction_type,
    transaction_name, leaves
) VALUES (
    'EMP-001', 'Time Off in Lieu', 'Leave Allocation',
    'LA-2026-00001', 1.5
);
```

---

### Hook 4: cancel_toil_allocation

**Trigger:** When timesheet is cancelled  
**Purpose:** Reverse TOIL allocation  
**Impact:** Cancels Leave Allocation, removes Leave Ledger Entry  

```python
def cancel_toil_allocation(doc, method):
    """
    Reverse TOIL accrual when timesheet is cancelled
    """
    if not doc.toil_allocation:
        return
    
    allocation = frappe.get_doc("Leave Allocation", doc.toil_allocation)
    
    if allocation.docstatus == 1:
        allocation.cancel()  # Also cancels Leave Ledger Entry
        
    doc.db_set('toil_status', 'Cancelled')
```

---

### Hook 5: recalculate_toil

**Trigger:** When timesheet is updated (before submit)  
**Purpose:** Recalculate TOIL if time logs change  
**Impact:** Updates preview fields only  

```python
def recalculate_toil(doc, method):
    """
    Recalculate TOIL when time logs are modified
    Only for draft timesheets
    """
    if doc.docstatus == 0:  # Draft only
        calculate_toil_hours(doc)
```

---

### Hook 6: validate_toil_balance

**Trigger:** Before Leave Application is submitted  
**Purpose:** Additional TOIL-specific validations  
**Impact:** Can warn or block submission  

```python
def validate_toil_balance(doc, method):
    """
    TOIL-specific validations for Leave Application
    - Check expiring balances
    - Warn if TOIL will expire soon
    """
    if doc.leave_type != "Time Off in Lieu":
        return  # Not TOIL, skip
    
    # Standard balance check done by ERPNext
    # Add TOIL-specific warnings
    
    balance_info = get_toil_balance_details(doc.employee)
    
    if balance_info.get("expiring_soon", 0) > 0:
        frappe.msgprint(
            f"Note: {balance_info['expiring_soon']} days expiring in 30 days",
            alert=True,
            indicator="orange"
        )
```

---

### Hook 7: track_toil_consumption

**Trigger:** After Leave Application is submitted  
**Purpose:** Track which timesheets were consumed (FIFO)  
**Impact:** Audit logging, future reporting  

```python
def track_toil_consumption(doc, method):
    """
    Track TOIL consumption for audit trail
    Links leave application to source timesheets
    """
    if doc.leave_type != "Time Off in Lieu":
        return
    
    # Get TOIL allocations (FIFO order)
    allocations = get_available_toil_allocations(doc.employee)
    
    days_remaining = flt(doc.total_leave_days)
    consumption_log = []
    
    for alloc in allocations:
        if days_remaining <= 0:
            break
            
        available = get_allocation_balance(alloc.name)
        consumed_from_this = min(days_remaining, available)
        
        if consumed_from_this > 0:
            consumption_log.append({
                "timesheet": alloc.source_timesheet,
                "allocation": alloc.name,
                "days": consumed_from_this
            })
            days_remaining -= consumed_from_this
    
    # Log for audit
    frappe.logger().info(
        f"Leave Application {doc.name} consumed TOIL from: {consumption_log}"
    )
```

---

### Hook 8: restore_toil_balance

**Trigger:** When Leave Application is cancelled  
**Purpose:** Restore TOIL balance  
**Impact:** Leave Ledger Entry cancelled automatically  

```python
def restore_toil_balance(doc, method):
    """
    Leave Ledger Entry is automatically cancelled by ERPNext
    This hook is for additional cleanup if needed
    """
    if doc.leave_type != "Time Off in Lieu":
        return
    
    # ERPNext automatically cancels the Leave Ledger Entry
    # Balance is restored automatically
    
    frappe.msgprint(
        f"TOIL balance of {doc.total_leave_days} days restored",
        alert=True,
        indicator="blue"
    )
```

---

### Hook 9: mark_toil_allocation

**Trigger:** Before Leave Allocation is saved  
**Purpose:** Mark TOIL allocations for filtering  
**Impact:** Sets custom field flag  

```python
def mark_toil_allocation(doc, method):
    """
    Mark allocations created by TOIL system
    """
    if doc.source_timesheet:
        doc.is_toil_allocation = 1
```

---

## Hook Execution Order

### Timesheet Submission Flow:

```
1. User clicks "Submit" button
   ↓
2. validate_timesheet() 
   - Calculates TOIL hours
   - Updates preview fields
   ↓
3. before_submit_timesheet()
   - Checks supervisor permission
   - Throws error if unauthorized
   ↓
4. [ERPNext internal validation]
   - Required fields
   - Date validation
   - etc.
   ↓
5. [Docstatus changes 0 → 1]
   ↓
6. on_submit() → create_toil_allocation()
   - Creates Leave Allocation
   - Leave Allocation.submit()
     └→ Creates Leave Ledger Entry (ERPNext automatic)
   - Updates timesheet.toil_allocation
   - Updates timesheet.toil_status
   ↓
7. [Transaction committed to database]
   ↓
8. Success message to user
```

### Leave Application Submission Flow:

```
1. User submits Leave Application (type=TOIL)
   ↓
2. validate_toil_balance()
   - Checks for expiring TOIL
   - Shows warnings
   ↓
3. [ERPNext validate_balance()]
   - Queries Leave Ledger
   - Checks sufficient balance
   - Throws error if insufficient
   ↓
4. [Docstatus changes 0 → 1]
   ↓
5. on_submit() → track_toil_consumption()
   - Logs which timesheets consumed
   - FIFO allocation
   - Audit trail
   ↓
6. [ERPNext creates Leave Ledger Entry]
   - transaction_type: "Leave Application"
   - leaves: -negative value
   ↓
7. [Transaction committed]
   ↓
8. Balance automatically updated
```

---

## Permission Hooks

### Timesheet Query Permission

```python
# toil_management/permissions.py

def timesheet_query(user):
    """
    Filter timesheets user can see
    - Own timesheets
    - Subordinate timesheets (if supervisor)
    """
    if "System Manager" in frappe.get_roles(user):
        return None  # See all
    
    # Get employee record
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    
    if not employee:
        return "1=0"  # See nothing
    
    # Get subordinates
    subordinates = frappe.db.sql("""
        SELECT name 
        FROM `tabEmployee` 
        WHERE reports_to = %s
    """, employee, as_dict=1)
    
    allowed_employees = [employee] + [d.name for d in subordinates]
    
    return f"`tabTimesheet`.employee IN ({','.join(['%s']*len(allowed_employees))})"

def has_timesheet_permission(doc, user):
    """
    Check if user has permission for specific timesheet
    """
    if "System Manager" in frappe.get_roles(user):
        return True
    
    # Own timesheet
    employee = frappe.db.get_value("Employee", {"user_id": user}, "name")
    if doc.employee == employee:
        return True
    
    # Subordinate timesheet
    reports_to = frappe.db.get_value("Employee", doc.employee, "reports_to")
    if reports_to == employee:
        return True
    
    return False
```

---

## Scheduled Task Hooks

### Daily: Expire Old Allocations

```python
# toil_management/tasks/daily.py

def expire_toil_allocations():
    """
    Mark TOIL allocations as expired after validity period
    """
    from frappe.utils import getdate
    
    expired = frappe.db.sql("""
        UPDATE `tabLeave Ledger Entry`
        SET is_expired = 1
        WHERE leave_type = 'Time Off in Lieu'
        AND to_date < %s
        AND is_expired = 0
        AND docstatus = 1
    """, getdate())
    
    frappe.logger().info(f"Expired {expired} TOIL allocations")
```

### Weekly: Send Expiry Reminders

```python
# toil_management/tasks/weekly.py

def send_expiry_reminders():
    """
    Email employees with expiring TOIL
    """
    from frappe.utils import add_days, getdate
    
    thirty_days_out = add_days(getdate(), 30)
    
    # Get employees with expiring TOIL
    expiring = frappe.db.sql("""
        SELECT 
            employee,
            SUM(leaves) as balance
        FROM `tabLeave Ledger Entry`
        WHERE leave_type = 'Time Off in Lieu'
        AND to_date <= %s
        AND to_date >= %s
        AND is_expired = 0
        AND docstatus = 1
        GROUP BY employee
        HAVING balance > 0
    """, (thirty_days_out, getdate()), as_dict=1)
    
    for record in expiring:
        send_email_reminder(record.employee, record.balance)
```

---

## API Hook Usage (Frontend)

```javascript
// React component calling API hooks

import { useFrappeGetCall } from 'frappe-react-sdk';

// Get TOIL balance
const { data } = useFrappeGetCall(
  'toil_management.api.get_toil_balance',
  { employee: 'EMP-001' }
);

// Preview TOIL calculation
const { data } = useFrappeGetCall(
  'toil_management.api.calculate_toil_preview',
  { timesheet_name: 'TS-2026-00042' }
);

// Approve timesheet (supervisor only)
const { call } = useFrappePostCall(
  'toil_management.api.approve_timesheet'
);

await call({ timesheet_name: 'TS-2026-00042' });
```

---

## Hook Testing Commands

```bash
# Test validate hook
bench --site [site] console
>>> doc = frappe.get_doc("Timesheet", "TS-2026-00042")
>>> doc.validate()
>>> print(doc.total_toil_hours, doc.toil_days)

# Test submit hook
>>> doc.submit()
>>> print(doc.toil_allocation)

# Verify Leave Ledger Entry created
>>> frappe.db.sql("""
    SELECT * FROM `tabLeave Ledger Entry`
    WHERE transaction_name = %s
""", doc.toil_allocation, as_dict=1)

# Test cancel hook
>>> doc.cancel()
>>> frappe.db.sql("""
    SELECT docstatus FROM `tabLeave Allocation`
    WHERE name = %s
""", doc.toil_allocation)
```

---

**End of Hook Definitions Reference**