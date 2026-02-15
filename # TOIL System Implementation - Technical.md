# TOIL System Implementation - Technical Execution Plan
## Frappe/Doppio + AntD Brownfield Integration

**Project:** Time Off in Lieu (TOIL) Management System  
**Stack:** Frappe (Backend) + Doppio + React + AntD (Frontend)  
**Implementation Type:** Brownfield Integration  
**Estimated Effort:** 3-4 days  

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Backend Implementation](#backend-implementation)
3. [Frontend Implementation](#frontend-implementation)
4. [Migration Scripts](#migration-scripts)
5. [Testing Strategy](#testing-strategy)
6. [Deployment Checklist](#deployment-checklist)

---

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────┐
│                     TOIL SYSTEM ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  FRONTEND (React + AntD + Doppio)                           │
│  ├─ TimesheetList (existing, enhanced)                      │
│  ├─ TimesheetDetail (existing, enhanced)                    │
│  │   └─ TOIL Summary Card (new)                            │
│  │   └─ Approve Button (conditional)                       │
│  ├─ LeaveApplicationList (existing, enhanced)              │
│  ├─ LeaveApplicationDetail (existing, enhanced)            │
│  │   └─ TOIL Balance Display (new)                         │
│  └─ TOILDashboard (new, optional)                          │
│                                                              │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  BACKEND (Frappe)                                           │
│  ├─ Custom App: toil_management                            │
│  │   ├─ hooks.py (event handlers)                          │
│  │   ├─ api.py (REST endpoints)                            │
│  │   └─ utils.py (helper functions)                        │
│  │                                                           │
│  ├─ DocType Extensions                                      │
│  │   ├─ Timesheet (custom fields)                          │
│  │   ├─ Leave Allocation (custom fields)                   │
│  │   └─ Leave Application (no changes)                     │
│  │                                                           │
│  └─ Standard DocTypes (use as-is)                          │
│      ├─ Leave Type                                          │
│      ├─ Leave Allocation                                    │
│      ├─ Leave Application                                   │
│      └─ Leave Ledger Entry                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
TOIL ACCRUAL:
Employee → Submit Timesheet (is_billable=false) 
  → on_submit hook validates supervisor 
  → Calculate TOIL hours 
  → Create Leave Allocation 
  → Leave Ledger Entry (auto)

TOIL CONSUMPTION:
Employee → Submit Leave Application (type=TOIL) 
  → Validate balance (Leave Ledger) 
  → Supervisor approves 
  → Leave Ledger Entry (auto)
  → Update TOIL balance
```

---

## Backend Implementation

### Phase 1: Custom App Setup (30 minutes)

#### 1.1 Create Custom App

```bash
# In frappe-bench directory
bench new-app toil_management
cd apps/toil_management
```

#### 1.2 Directory Structure

```
toil_management/
├── toil_management/
│   ├── __init__.py
│   ├── hooks.py              # Event hooks
│   ├── api.py                # REST API endpoints
│   ├── utils/
│   │   ├── __init__.py
│   │   └── toil_calculator.py  # TOIL calculation logic
│   ├── fixtures/
│   │   └── leave_type.json   # Leave Type fixture
│   └── patches/
│       └── v1_0/
│           ├── __init__.py
│           └── create_toil_leave_type.py
└── ...
```

### Phase 2: Custom Fields (1 hour)

#### 2.1 Timesheet Custom Fields

```python
# File: toil_management/custom_fields.py

TIMESHEET_CUSTOM_FIELDS = [
    {
        "fieldname": "toil_section",
        "label": "TOIL Details",
        "fieldtype": "Section Break",
        "insert_after": "total_billable_amount",
        "collapsible": 1
    },
    {
        "fieldname": "total_toil_hours",
        "label": "Total TOIL Hours",
        "fieldtype": "Float",
        "insert_after": "toil_section",
        "read_only": 1,
        "precision": 2
    },
    {
        "fieldname": "toil_days",
        "label": "TOIL Days",
        "fieldtype": "Float",
        "insert_after": "total_toil_hours",
        "read_only": 1,
        "precision": 3
    },
    {
        "fieldname": "toil_allocation",
        "label": "TOIL Allocation Reference",
        "fieldtype": "Link",
        "options": "Leave Allocation",
        "insert_after": "toil_days",
        "read_only": 1
    },
    {
        "fieldname": "toil_status",
        "label": "TOIL Status",
        "fieldtype": "Select",
        "options": "Not Applicable\nPending Accrual\nAccrued\nPartially Used\nFully Used",
        "insert_after": "toil_allocation",
        "read_only": 1,
        "default": "Not Applicable"
    },
    {
        "fieldname": "column_break_toil",
        "fieldtype": "Column Break",
        "insert_after": "toil_status"
    },
    {
        "fieldname": "toil_calculation_details",
        "label": "TOIL Calculation Details",
        "fieldtype": "Small Text",
        "insert_after": "column_break_toil",
        "read_only": 1
    }
]

LEAVE_ALLOCATION_CUSTOM_FIELDS = [
    {
        "fieldname": "source_timesheet",
        "label": "Source Timesheet",
        "fieldtype": "Link",
        "options": "Timesheet",
        "insert_after": "description",
        "read_only": 1
    },
    {
        "fieldname": "toil_hours",
        "label": "TOIL Hours",
        "fieldtype": "Float",
        "insert_after": "source_timesheet",
        "read_only": 1,
        "precision": 2
    },
    {
        "fieldname": "is_toil_allocation",
        "label": "Is TOIL Allocation",
        "fieldtype": "Check",
        "insert_after": "toil_hours",
        "read_only": 1,
        "default": 0
    }
]
```

#### 2.2 Install Custom Fields

```python
# File: toil_management/install.py

import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_fields

def after_install():
    """Execute after app installation"""
    create_toil_custom_fields()
    create_toil_leave_type()
    frappe.db.commit()

def create_toil_custom_fields():
    """Create custom fields for TOIL tracking"""
    from .custom_fields import TIMESHEET_CUSTOM_FIELDS, LEAVE_ALLOCATION_CUSTOM_FIELDS
    
    custom_fields = {
        "Timesheet": TIMESHEET_CUSTOM_FIELDS,
        "Leave Allocation": LEAVE_ALLOCATION_CUSTOM_FIELDS
    }
    
    create_custom_fields(custom_fields)
    print("✓ TOIL custom fields created")
```

### Phase 3: Core Logic - Hooks (2 hours)

#### 3.1 Hook Configuration

```python
# File: toil_management/hooks.py

app_name = "toil_management"
app_title = "TOIL Management"
app_publisher = "Your Company"
app_description = "Time Off in Lieu Management System"
app_version = "1.0.0"

# Document Events
doc_events = {
    "Timesheet": {
        "validate": "toil_management.overrides.timesheet.validate_timesheet",
        "before_submit": "toil_management.overrides.timesheet.before_submit_timesheet",
        "on_submit": "toil_management.overrides.timesheet.create_toil_allocation",
        "on_cancel": "toil_management.overrides.timesheet.cancel_toil_allocation"
    },
    "Leave Application": {
        "validate": "toil_management.overrides.leave_application.validate_toil_balance",
        "on_submit": "toil_management.overrides.leave_application.track_toil_consumption"
    }
}

# Whitelisted API Methods
# These are accessible via REST API
api_methods = [
    "toil_management.api.get_toil_balance",
    "toil_management.api.get_toil_summary",
    "toil_management.api.get_supervisor_timesheets",
    "toil_management.api.calculate_toil_preview"
]

# Fixtures (for migration)
fixtures = [
    {
        "dt": "Leave Type",
        "filters": [["name", "in", ["Time Off in Lieu"]]]
    }
]
```

#### 3.2 Timesheet Overrides

```python
# File: toil_management/overrides/timesheet.py

import frappe
from frappe import _
from frappe.utils import flt, getdate, add_months
from datetime import datetime

def validate_timesheet(doc, method):
    """
    Validate timesheet before save
    Calculate TOIL hours for preview
    """
    calculate_toil_hours(doc)

def before_submit_timesheet(doc, method):
    """
    Validate supervisor approval before submission
    Only supervisors can submit timesheets
    """
    if not can_approve_timesheet(doc):
        frappe.throw(
            _("Only the immediate supervisor can approve this timesheet"),
            frappe.PermissionError
        )

def create_toil_allocation(doc, method):
    """
    Hook: on_submit(Timesheet)
    Create Leave Allocation for TOIL-eligible hours
    """
    # Skip if no TOIL hours
    if flt(doc.total_toil_hours) <= 0:
        frappe.msgprint(_("No TOIL hours to allocate"))
        return
    
    # Create Leave Allocation
    allocation = frappe.get_doc({
        "doctype": "Leave Allocation",
        "employee": doc.employee,
        "leave_type": "Time Off in Lieu",
        "from_date": getdate(),
        "to_date": add_months(getdate(), 6),  # 6-month validity
        "new_leaves_allocated": flt(doc.toil_days, 3),
        "description": f"TOIL from Timesheet {doc.name}",
        "source_timesheet": doc.name,
        "toil_hours": flt(doc.total_toil_hours, 2),
        "is_toil_allocation": 1
    })
    
    allocation.insert(ignore_permissions=True)
    allocation.submit()
    
    # Update timesheet reference
    doc.db_set('toil_allocation', allocation.name)
    doc.db_set('toil_status', 'Accrued')
    
    frappe.msgprint(
        _("TOIL Allocation created: {0} days").format(flt(doc.toil_days, 2)),
        alert=True,
        indicator="green"
    )

def cancel_toil_allocation(doc, method):
    """
    Hook: on_cancel(Timesheet)
    Cancel the associated TOIL allocation
    """
    if doc.toil_allocation:
        try:
            allocation = frappe.get_doc("Leave Allocation", doc.toil_allocation)
            if allocation.docstatus == 1:
                allocation.cancel()
                frappe.msgprint(_("TOIL Allocation cancelled"), alert=True)
        except Exception as e:
            frappe.log_error(f"Error cancelling TOIL allocation: {str(e)}")

def calculate_toil_hours(doc):
    """
    Calculate total TOIL-eligible hours from time logs
    TOIL = Non-billable hours only
    """
    total_toil_hours = 0.0
    calculation_details = []
    
    for time_log in doc.time_logs:
        if not time_log.is_billable and flt(time_log.hours) > 0:
            total_toil_hours += flt(time_log.hours)
            calculation_details.append(
                f"{time_log.activity_type}: {time_log.hours} hrs"
            )
    
    # Convert to days (8-hour workday)
    standard_hours_per_day = frappe.db.get_single_value(
        "HR Settings", "standard_working_hours"
    ) or 8.0
    
    toil_days = total_toil_hours / standard_hours_per_day
    
    # Update document fields
    doc.total_toil_hours = flt(total_toil_hours, 2)
    doc.toil_days = flt(toil_days, 3)
    doc.toil_calculation_details = "\n".join(calculation_details) if calculation_details else ""
    doc.toil_status = "Pending Accrual" if total_toil_hours > 0 else "Not Applicable"

def can_approve_timesheet(doc):
    """
    Check if current user can approve this timesheet
    Only immediate supervisor can approve
    """
    current_user = frappe.session.user
    
    # System Manager can always approve
    if "System Manager" in frappe.get_roles(current_user):
        return True
    
    # Check if current user is the employee's immediate supervisor
    employee = frappe.get_doc("Employee", doc.employee)
    
    if employee.reports_to:
        supervisor_user = frappe.db.get_value(
            "Employee", 
            employee.reports_to, 
            "user_id"
        )
        return current_user == supervisor_user
    
    return False
```

#### 3.3 Leave Application Overrides

```python
# File: toil_management/overrides/leave_application.py

import frappe
from frappe import _
from frappe.utils import flt

def validate_toil_balance(doc, method):
    """
    Additional validation for TOIL leave applications
    Check for expiring TOIL balances
    """
    if doc.leave_type != "Time Off in Lieu":
        return
    
    # Get detailed TOIL balance
    balance_info = get_toil_balance_details(doc.employee)
    
    # Warn if using TOIL that will expire soon
    if balance_info.get("expiring_soon", 0) > 0:
        frappe.msgprint(
            _("Note: You have {0} days of TOIL expiring within 30 days").format(
                balance_info["expiring_soon"]
            ),
            alert=True,
            indicator="orange"
        )

def track_toil_consumption(doc, method):
    """
    Hook: on_submit(Leave Application)
    Track which timesheets are being consumed (FIFO)
    """
    if doc.leave_type != "Time Off in Lieu":
        return
    
    # Get available TOIL allocations (FIFO)
    allocations = get_available_toil_allocations(doc.employee)
    
    days_to_consume = flt(doc.total_leave_days)
    consumed_timesheets = []
    
    for allocation in allocations:
        if days_to_consume <= 0:
            break
        
        # Get available days from this allocation
        available = get_allocation_available_days(allocation.name)
        days_from_this = min(days_to_consume, available)
        
        if days_from_this > 0:
            consumed_timesheets.append({
                "timesheet": allocation.source_timesheet,
                "days": days_from_this
            })
            days_to_consume -= days_from_this
    
    # Log consumption for audit
    frappe.logger().info(
        f"TOIL consumed from timesheets: {consumed_timesheets}"
    )

def get_toil_balance_details(employee):
    """Get detailed TOIL balance breakdown"""
    from datetime import timedelta
    from frappe.utils import getdate, add_days
    
    # Get all active TOIL allocations
    allocations = frappe.db.sql("""
        SELECT 
            name,
            new_leaves_allocated,
            to_date
        FROM `tabLeave Allocation`
        WHERE employee = %s
        AND leave_type = 'Time Off in Lieu'
        AND docstatus = 1
        AND to_date >= %s
        ORDER BY from_date ASC
    """, (employee, getdate()), as_dict=1)
    
    total_balance = 0
    expiring_soon = 0
    thirty_days_out = add_days(getdate(), 30)
    
    for allocation in allocations:
        available = get_allocation_available_days(allocation.name)
        total_balance += available
        
        # Check if expiring within 30 days
        if allocation.to_date <= thirty_days_out:
            expiring_soon += available
    
    return {
        "total": total_balance,
        "expiring_soon": expiring_soon
    }

def get_available_toil_allocations(employee):
    """Get TOIL allocations with available balance (FIFO)"""
    return frappe.db.sql("""
        SELECT 
            la.name,
            la.source_timesheet,
            la.new_leaves_allocated,
            la.from_date,
            la.to_date
        FROM `tabLeave Allocation` la
        WHERE la.employee = %s
        AND la.leave_type = 'Time Off in Lieu'
        AND la.docstatus = 1
        AND la.to_date >= %s
        AND la.is_toil_allocation = 1
        ORDER BY la.from_date ASC
    """, (employee, getdate()), as_dict=1)

def get_allocation_available_days(allocation_name):
    """Calculate available days for a specific allocation"""
    # Use Leave Ledger to calculate balance
    balance = frappe.db.sql("""
        SELECT SUM(leaves) as balance
        FROM `tabLeave Ledger Entry`
        WHERE transaction_name = %s
        AND docstatus = 1
    """, allocation_name)
    
    return flt(balance[0][0]) if balance else 0
```

### Phase 4: REST API (1 hour)

```python
# File: toil_management/api.py

import frappe
from frappe import _
from frappe.utils import flt, getdate

@frappe.whitelist()
def get_toil_balance(employee=None):
    """
    Get TOIL balance for employee
    If no employee specified, use current user's employee record
    """
    if not employee:
        employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
        if not employee:
            frappe.throw(_("No employee record found for current user"))
    
    # Query Leave Ledger for TOIL balance
    balance = frappe.db.sql("""
        SELECT 
            SUM(leaves) as total_balance
        FROM `tabLeave Ledger Entry`
        WHERE employee = %s
        AND leave_type = 'Time Off in Lieu'
        AND docstatus = 1
        AND is_expired = 0
        AND to_date >= %s
    """, (employee, getdate()), as_dict=1)
    
    return {
        "employee": employee,
        "balance": flt(balance[0].total_balance, 2) if balance else 0
    }

@frappe.whitelist()
def get_toil_summary(employee=None):
    """
    Get detailed TOIL summary including accrual and consumption
    """
    if not employee:
        employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
    
    # Accrued TOIL
    accrued = frappe.db.sql("""
        SELECT 
            SUM(leaves) as total_accrued
        FROM `tabLeave Ledger Entry`
        WHERE employee = %s
        AND leave_type = 'Time Off in Lieu'
        AND transaction_type = 'Leave Allocation'
        AND docstatus = 1
    """, employee, as_dict=1)
    
    # Consumed TOIL
    consumed = frappe.db.sql("""
        SELECT 
            SUM(ABS(leaves)) as total_consumed
        FROM `tabLeave Ledger Entry`
        WHERE employee = %s
        AND leave_type = 'Time Off in Lieu'
        AND transaction_type = 'Leave Application'
        AND docstatus = 1
    """, employee, as_dict=1)
    
    # Source timesheets
    timesheets = frappe.db.sql("""
        SELECT 
            ts.name,
            ts.start_date,
            ts.total_toil_hours,
            ts.toil_days,
            ts.toil_status
        FROM `tabTimesheet` ts
        WHERE ts.employee = %s
        AND ts.total_toil_hours > 0
        AND ts.docstatus = 1
        ORDER BY ts.start_date DESC
        LIMIT 10
    """, employee, as_dict=1)
    
    total_accrued = flt(accrued[0].total_accrued, 2) if accrued else 0
    total_consumed = flt(consumed[0].total_consumed, 2) if consumed else 0
    
    return {
        "employee": employee,
        "total_accrued": total_accrued,
        "total_consumed": total_consumed,
        "current_balance": total_accrued - total_consumed,
        "recent_timesheets": timesheets
    }

@frappe.whitelist()
def get_supervisor_timesheets():
    """
    Get timesheets pending approval for current user's subordinates
    """
    current_user = frappe.session.user
    
    # Get employees reporting to current user
    subordinates = frappe.db.sql("""
        SELECT name
        FROM `tabEmployee`
        WHERE reports_to IN (
            SELECT name FROM `tabEmployee` WHERE user_id = %s
        )
    """, current_user, as_dict=1)
    
    if not subordinates:
        return []
    
    employee_list = [d.name for d in subordinates]
    
    # Get pending timesheets
    timesheets = frappe.db.sql("""
        SELECT 
            name,
            employee,
            employee_name,
            start_date,
            end_date,
            total_hours,
            total_toil_hours,
            toil_days,
            status
        FROM `tabTimesheet`
        WHERE employee IN %s
        AND docstatus = 0
        AND total_toil_hours > 0
        ORDER BY start_date DESC
    """, [employee_list], as_dict=1)
    
    return timesheets

@frappe.whitelist()
def calculate_toil_preview(timesheet_name):
    """
    Calculate TOIL preview for a timesheet (before submission)
    """
    doc = frappe.get_doc("Timesheet", timesheet_name)
    
    # Calculate TOIL
    total_toil_hours = 0.0
    breakdown = []
    
    for log in doc.time_logs:
        if not log.is_billable and flt(log.hours) > 0:
            total_toil_hours += flt(log.hours)
            breakdown.append({
                "activity": log.activity_type,
                "hours": flt(log.hours, 2),
                "from_time": log.from_time,
                "to_time": log.to_time
            })
    
    standard_hours = frappe.db.get_single_value("HR Settings", "standard_working_hours") or 8.0
    toil_days = total_toil_hours / standard_hours
    
    return {
        "total_hours": flt(total_toil_hours, 2),
        "total_days": flt(toil_days, 3),
        "breakdown": breakdown,
        "can_approve": can_user_approve(doc)
    }

def can_user_approve(timesheet_doc):
    """Check if current user can approve the timesheet"""
    from toil_management.overrides.timesheet import can_approve_timesheet
    return can_approve_timesheet(timesheet_doc)
```

---

## Frontend Implementation

### Phase 5: React Components (4-6 hours)

#### 5.1 Project Structure

```
src/
├── components/
│   ├── Timesheet/
│   │   ├── TimesheetList.jsx (enhance existing)
│   │   ├── TimesheetDetail.jsx (enhance existing)
│   │   ├── TOILSummaryCard.jsx (new)
│   │   └── ApproveTimesheetButton.jsx (new)
│   │
│   ├── LeaveApplication/
│   │   ├── LeaveApplicationList.jsx (enhance existing)
│   │   ├── LeaveApplicationDetail.jsx (enhance existing)
│   │   └── TOILBalanceCard.jsx (new)
│   │
│   └── TOIL/
│       ├── TOILDashboard.jsx (new, optional)
│       └── TOILCalculator.jsx (new)
│
├── hooks/
│   └── useTOIL.js (new)
│
└── utils/
    └── toilCalculations.js (new)
```

#### 5.2 Custom Hook: useTOIL

```javascript
// File: src/hooks/useTOIL.js

import { useState, useEffect } from 'react';
import { useFrappeGetCall, useFrappePostCall } from 'frappe-react-sdk';

export const useTOIL = (employee) => {
  const [balance, setBalance] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  // Get TOIL balance
  const { data: balanceData, error: balanceError } = useFrappeGetCall(
    'toil_management.api.get_toil_balance',
    { employee },
    employee ? undefined : null // Skip if no employee
  );

  // Get TOIL summary
  const { data: summaryData, error: summaryError } = useFrappeGetCall(
    'toil_management.api.get_toil_summary',
    { employee },
    employee ? undefined : null
  );

  useEffect(() => {
    if (balanceData) {
      setBalance(balanceData.message);
    }
  }, [balanceData]);

  useEffect(() => {
    if (summaryData) {
      setSummary(summaryData.message);
      setLoading(false);
    }
  }, [summaryData]);

  return {
    balance,
    summary,
    loading,
    error: balanceError || summaryError
  };
};

export const useTOILPreview = (timesheetName) => {
  const { data, error, isLoading } = useFrappeGetCall(
    'toil_management.api.calculate_toil_preview',
    { timesheet_name: timesheetName },
    timesheetName ? undefined : null
  );

  return {
    preview: data?.message,
    loading: isLoading,
    error
  };
};

export const useSupervisorTimesheets = () => {
  const { data, error, isLoading, mutate } = useFrappeGetCall(
    'toil_management.api.get_supervisor_timesheets'
  );

  return {
    timesheets: data?.message || [],
    loading: isLoading,
    error,
    refresh: mutate
  };
};
```

#### 5.3 TOIL Summary Card Component

```jsx
// File: src/components/Timesheet/TOILSummaryCard.jsx

import React from 'react';
import { Card, Statistic, Row, Col, Table, Tag, Tooltip } from 'antd';
import { ClockCircleOutlined, CheckCircleOutlined, WarningOutlined } from '@ant-design/icons';
import { useTOILPreview } from '../../hooks/useTOIL';

const TOILSummaryCard = ({ timesheetName, timesheetData }) => {
  const { preview, loading } = useTOILPreview(timesheetName);

  if (loading) {
    return <Card loading />;
  }

  if (!preview || preview.total_hours === 0) {
    return (
      <Card>
        <div style={{ textAlign: 'center', padding: '20px' }}>
          <Tag>No TOIL Hours</Tag>
          <p style={{ marginTop: '10px', color: '#666' }}>
            This timesheet contains only billable hours
          </p>
        </div>
      </Card>
    );
  }

  const columns = [
    {
      title: 'Activity',
      dataIndex: 'activity',
      key: 'activity',
    },
    {
      title: 'Hours',
      dataIndex: 'hours',
      key: 'hours',
      render: (hours) => `${hours} hrs`,
    },
    {
      title: 'Period',
      key: 'period',
      render: (_, record) => (
        <span>
          {new Date(record.from_time).toLocaleTimeString()} - 
          {new Date(record.to_time).toLocaleTimeString()}
        </span>
      ),
    },
  ];

  return (
    <Card 
      title={
        <span>
          <ClockCircleOutlined style={{ marginRight: 8 }} />
          TOIL Summary
        </span>
      }
      extra={
        timesheetData?.toil_status && (
          <Tag color={getStatusColor(timesheetData.toil_status)}>
            {timesheetData.toil_status}
          </Tag>
        )
      }
    >
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Statistic
            title="TOIL Hours"
            value={preview.total_hours}
            suffix="hrs"
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={12}>
          <Statistic
            title="TOIL Days"
            value={preview.total_days}
            precision={2}
            suffix="days"
            prefix={<CheckCircleOutlined />}
          />
        </Col>
      </Row>

      <Table
        dataSource={preview.breakdown}
        columns={columns}
        pagination={false}
        size="small"
        rowKey={(record) => record.activity + record.from_time}
      />

      {timesheetData?.toil_allocation && (
        <div style={{ marginTop: 16, padding: 12, background: '#f0f2f5', borderRadius: 4 }}>
          <CheckCircleOutlined style={{ color: '#52c41a', marginRight: 8 }} />
          <span>
            TOIL Allocation Created: 
            <a href={`/app/leave-allocation/${timesheetData.toil_allocation}`} style={{ marginLeft: 8 }}>
              {timesheetData.toil_allocation}
            </a>
          </span>
        </div>
      )}
    </Card>
  );
};

const getStatusColor = (status) => {
  const colors = {
    'Not Applicable': 'default',
    'Pending Accrual': 'orange',
    'Accrued': 'green',
    'Partially Used': 'blue',
    'Fully Used': 'purple'
  };
  return colors[status] || 'default';
};

export default TOILSummaryCard;
```

#### 5.4 Enhanced Timesheet Detail Component

```jsx
// File: src/components/Timesheet/TimesheetDetail.jsx
// This enhances your existing TimesheetDetail component
// Pattern borrowed from ProjectDetail component

import React, { useState } from 'react';
import { Card, Descriptions, Button, Space, message, Modal } from 'antd';
import { CheckOutlined, CloseOutlined } from '@ant-design/icons';
import { useFrappeGetDoc, useFrappeUpdateDoc } from 'frappe-react-sdk';
import TOILSummaryCard from './TOILSummaryCard';

const TimesheetDetail = ({ timesheetId }) => {
  const [approving, setApproving] = useState(false);
  
  // Get timesheet data
  const { data: timesheet, mutate } = useFrappeGetDoc('Timesheet', timesheetId);
  
  // Update doc hook
  const { updateDoc } = useFrappeUpdateDoc();

  const handleApprove = async () => {
    Modal.confirm({
      title: 'Approve Timesheet',
      content: `This will submit the timesheet and create TOIL allocation of ${timesheet.toil_days} days. Continue?`,
      onOk: async () => {
        try {
          setApproving(true);
          
          // Submit the timesheet (this triggers the hooks)
          await updateDoc('Timesheet', timesheetId, {
            docstatus: 1
          });
          
          message.success('Timesheet approved and TOIL allocated successfully');
          mutate(); // Refresh data
        } catch (error) {
          message.error('Failed to approve timesheet: ' + error.message);
        } finally {
          setApproving(false);
        }
      }
    });
  };

  const handleReject = () => {
    Modal.confirm({
      title: 'Reject Timesheet',
      content: 'Are you sure you want to reject this timesheet?',
      onOk: async () => {
        // Implementation for rejection
        message.info('Timesheet rejected');
      }
    });
  };

  if (!timesheet) return <Card loading />;

  const canApprove = timesheet.docstatus === 0 && timesheet.total_toil_hours > 0;

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Existing Timesheet Details */}
      <Card title="Timesheet Details">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Employee">
            {timesheet.employee_name}
          </Descriptions.Item>
          <Descriptions.Item label="Period">
            {timesheet.start_date} to {timesheet.end_date}
          </Descriptions.Item>
          <Descriptions.Item label="Total Hours">
            {timesheet.total_hours} hrs
          </Descriptions.Item>
          <Descriptions.Item label="Billable Hours">
            {timesheet.total_billable_hours} hrs
          </Descriptions.Item>
          <Descriptions.Item label="Status" span={2}>
            {timesheet.status}
          </Descriptions.Item>
        </Descriptions>

        {/* Approval Buttons - Only show for supervisors */}
        {canApprove && (
          <div style={{ marginTop: 16, textAlign: 'right' }}>
            <Space>
              <Button
                danger
                icon={<CloseOutlined />}
                onClick={handleReject}
              >
                Reject
              </Button>
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={approving}
                onClick={handleApprove}
              >
                Approve & Submit
              </Button>
            </Space>
          </div>
        )}
      </Card>

      {/* TOIL Summary - New Component */}
      <TOILSummaryCard 
        timesheetName={timesheetId} 
        timesheetData={timesheet}
      />

      {/* Existing time logs table, etc. */}
    </Space>
  );
};

export default TimesheetDetail;
```

#### 5.5 TOIL Balance Card for Leave Application

```jsx
// File: src/components/LeaveApplication/TOILBalanceCard.jsx

import React from 'react';
import { Card, Statistic, Row, Col, Alert, List, Tag } from 'antd';
import { 
  ClockCircleOutlined, 
  PlusCircleOutlined, 
  MinusCircleOutlined,
  WarningOutlined 
} from '@ant-design/icons';
import { useTOIL } from '../../hooks/useTOIL';

const TOILBalanceCard = ({ employee }) => {
  const { balance, summary, loading, error } = useTOIL(employee);

  if (loading) return <Card loading />;
  if (error) return <Alert message="Error loading TOIL balance" type="error" />;
  if (!summary) return null;

  const hasExpiringSoon = summary.expiring_soon > 0;

  return (
    <Card 
      title="TOIL Balance"
      extra={<Tag color="blue">Time Off in Lieu</Tag>}
    >
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={8}>
          <Statistic
            title="Current Balance"
            value={summary.current_balance}
            precision={2}
            suffix="days"
            valueStyle={{ color: '#3f8600' }}
            prefix={<ClockCircleOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Total Accrued"
            value={summary.total_accrued}
            precision={2}
            suffix="days"
            prefix={<PlusCircleOutlined />}
          />
        </Col>
        <Col span={8}>
          <Statistic
            title="Total Used"
            value={summary.total_consumed}
            precision={2}
            suffix="days"
            prefix={<MinusCircleOutlined />}
          />
        </Col>
      </Row>

      {hasExpiringSoon && (
        <Alert
          message="TOIL Expiring Soon"
          description={`You have ${summary.expiring_soon} days expiring within 30 days. Use them before they expire!`}
          type="warning"
          icon={<WarningOutlined />}
          showIcon
          style={{ marginBottom: 16 }}
        />
      )}

      {summary.recent_timesheets && summary.recent_timesheets.length > 0 && (
        <>
          <h4 style={{ marginTop: 16, marginBottom: 12 }}>Recent TOIL Accruals</h4>
          <List
            size="small"
            dataSource={summary.recent_timesheets}
            renderItem={(item) => (
              <List.Item>
                <List.Item.Meta
                  title={
                    <a href={`/app/timesheet/${item.name}`}>
                      {item.name}
                    </a>
                  }
                  description={`${item.start_date} - ${item.toil_hours} hrs (${item.toil_days} days)`}
                />
                <Tag color={getStatusColor(item.toil_status)}>
                  {item.toil_status}
                </Tag>
              </List.Item>
            )}
          />
        </>
      )}
    </Card>
  );
};

const getStatusColor = (status) => {
  const colors = {
    'Accrued': 'green',
    'Partially Used': 'blue',
    'Fully Used': 'purple'
  };
  return colors[status] || 'default';
};

export default TOILBalanceCard;
```

#### 5.6 Enhanced Leave Application Detail

```jsx
// File: src/components/LeaveApplication/LeaveApplicationDetail.jsx
// Enhance existing component

import React, { useEffect } from 'react';
import { Card, Descriptions, Space } from 'antd';
import { useFrappeGetDoc } from 'frappe-react-sdk';
import TOILBalanceCard from './TOILBalanceCard';

const LeaveApplicationDetail = ({ leaveApplicationId }) => {
  const { data: leaveApp } = useFrappeGetDoc('Leave Application', leaveApplicationId);

  if (!leaveApp) return <Card loading />;

  const isTOIL = leaveApp.leave_type === 'Time Off in Lieu';

  return (
    <Space direction="vertical" size="large" style={{ width: '100%' }}>
      {/* Existing Leave Application Details */}
      <Card title="Leave Application Details">
        <Descriptions bordered column={2}>
          <Descriptions.Item label="Employee">
            {leaveApp.employee_name}
          </Descriptions.Item>
          <Descriptions.Item label="Leave Type">
            {leaveApp.leave_type}
          </Descriptions.Item>
          <Descriptions.Item label="From Date">
            {leaveApp.from_date}
          </Descriptions.Item>
          <Descriptions.Item label="To Date">
            {leaveApp.to_date}
          </Descriptions.Item>
          <Descriptions.Item label="Total Days">
            {leaveApp.total_leave_days}
          </Descriptions.Item>
          <Descriptions.Item label="Status">
            {leaveApp.status}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Show TOIL Balance only for TOIL leave type */}
      {isTOIL && (
        <TOILBalanceCard employee={leaveApp.employee} />
      )}
    </Space>
  );
};

export default LeaveApplicationDetail;
```

---

## Migration Scripts

### Phase 6: Database Migrations (30 minutes)

#### 6.1 Leave Type Migration

```python
# File: toil_management/patches/v1_0/create_toil_leave_type.py

import frappe
from frappe import _

def execute():
    """
    Create 'Time Off in Lieu' leave type if it doesn't exist
    """
    if frappe.db.exists("Leave Type", "Time Off in Lieu"):
        print("Leave Type 'Time Off in Lieu' already exists")
        return
    
    leave_type = frappe.get_doc({
        "doctype": "Leave Type",
        "leave_type_name": "Time Off in Lieu",
        "max_leaves_allowed": 0,  # Unlimited
        "allow_negative": 0,
        "is_carry_forward": 1,
        "maximum_carry_forwarded_leaves": 30,
        "expire_carry_forwarded_leaves_after_days": 180,  # 6 months
        "is_optional_leave": 0,
        "allow_encashment": 0,
        "earned_leave": 0,
        "is_lwp": 0,
        "include_holiday": 0,
        "is_compensatory": 0,
        "description": "Time Off in Lieu (TOIL) - earned from non-billable overtime work"
    })
    
    leave_type.insert(ignore_permissions=True)
    frappe.db.commit()
    
    print("✓ Leave Type 'Time Off in Lieu' created successfully")
```

#### 6.2 Patch List Configuration

```python
# File: toil_management/patches.txt

toil_management.patches.v1_0.create_toil_leave_type
```

#### 6.3 Fixture Export (for fresh installs)

```python
# File: toil_management/fixtures/leave_type.json

[
  {
    "doctype": "Leave Type",
    "leave_type_name": "Time Off in Lieu",
    "max_leaves_allowed": 0,
    "allow_negative": 0,
    "is_carry_forward": 1,
    "maximum_carry_forwarded_leaves": 30,
    "expire_carry_forwarded_leaves_after_days": 180,
    "is_optional_leave": 0,
    "allow_encashment": 0,
    "earned_leave": 0,
    "is_lwp": 0,
    "include_holiday": 0,
    "is_compensatory": 0,
    "description": "Time Off in Lieu (TOIL) - earned from non-billable overtime work"
  }
]
```

---

## Testing Strategy

### Phase 7: Testing (2 hours)

#### 7.1 Unit Tests

```python
# File: toil_management/tests/test_toil_calculation.py

import frappe
import unittest
from frappe.utils import getdate, add_months, now_datetime

class TestTOILCalculation(unittest.TestCase):
    
    def setUp(self):
        """Set up test data"""
        self.employee = create_test_employee()
        
    def test_toil_calculation_from_timesheet(self):
        """Test TOIL hours calculation"""
        timesheet = create_test_timesheet(
            employee=self.employee,
            billable_hours=8,
            non_billable_hours=4
        )
        
        self.assertEqual(timesheet.total_toil_hours, 4.0)
        self.assertEqual(timesheet.toil_days, 0.5)
    
    def test_toil_allocation_creation(self):
        """Test Leave Allocation is created on timesheet submit"""
        timesheet = create_test_timesheet(
            employee=self.employee,
            non_billable_hours=8
        )
        timesheet.submit()
        
        # Check allocation was created
        allocation = frappe.get_doc("Leave Allocation", timesheet.toil_allocation)
        self.assertEqual(allocation.employee, self.employee)
        self.assertEqual(allocation.leave_type, "Time Off in Lieu")
        self.assertEqual(allocation.new_leaves_allocated, 1.0)
    
    def test_toil_balance_query(self):
        """Test TOIL balance calculation"""
        # Create allocation
        timesheet = create_test_timesheet(
            employee=self.employee,
            non_billable_hours=16  # 2 days
        )
        timesheet.submit()
        
        # Query balance
        from toil_management.api import get_toil_balance
        balance = get_toil_balance(self.employee)
        
        self.assertEqual(balance['balance'], 2.0)
    
    def tearDown(self):
        """Clean up test data"""
        frappe.db.rollback()

def create_test_employee():
    """Helper to create test employee"""
    # Implementation
    pass

def create_test_timesheet(employee, billable_hours=0, non_billable_hours=0):
    """Helper to create test timesheet"""
    # Implementation
    pass
```

#### 7.2 Integration Test Checklist

```markdown
## TOIL System Integration Tests

### Timesheet Workflow
- [ ] Create timesheet with non-billable hours
- [ ] Validate TOIL calculation displays correctly
- [ ] Submit timesheet as supervisor
- [ ] Verify Leave Allocation created
- [ ] Verify Leave Ledger Entry created
- [ ] Check TOIL balance updates

### Leave Application Workflow  
- [ ] Create leave application with TOIL type
- [ ] Verify balance validation
- [ ] Check insufficient balance rejection
- [ ] Submit leave application
- [ ] Verify Leave Ledger Entry created
- [ ] Verify TOIL balance decreases

### Supervisor Approval
- [ ] Non-supervisor cannot submit timesheet
- [ ] Supervisor can see pending timesheets
- [ ] Supervisor can approve/reject

### Edge Cases
- [ ] Timesheet with zero TOIL hours
- [ ] Timesheet cancellation reverses allocation
- [ ] Leave application cancellation restores balance
- [ ] Expired TOIL allocations not counted
- [ ] Fractional TOIL days (0.5, 0.25)

### UI Tests
- [ ] TOIL summary card displays correctly
- [ ] Balance card shows accurate data
- [ ] Approval buttons visible to supervisors only
- [ ] Mobile responsive design
```

---

## Deployment Checklist

### Phase 8: Deployment (1 hour)

```markdown
## Pre-Deployment Checklist

### Code Review
- [ ] All hooks tested in development
- [ ] API endpoints validated
- [ ] Frontend components reviewed
- [ ] Error handling implemented
- [ ] Logging added for audit trail

### Database
- [ ] Migration scripts tested
- [ ] Custom fields verified
- [ ] Leave Type created
- [ ] Backup database before deployment

### Configuration
- [ ] HR Settings: standard_working_hours configured
- [ ] Employee records: reports_to field populated
- [ ] User permissions reviewed
- [ ] System Manager role configured

### Documentation
- [ ] User guide created
- [ ] Admin guide created
- [ ] API documentation
- [ ] Troubleshooting guide

## Deployment Steps

1. **Backup Production Database**
   ```bash
   bench --site [site-name] backup --with-files
   ```

2. **Install Custom App**
   ```bash
   bench get-app toil_management [git-repo-url]
   bench --site [site-name] install-app toil_management
   ```

3. **Run Migrations**
   ```bash
   bench --site [site-name] migrate
   ```

4. **Clear Cache**
   ```bash
   bench --site [site-name] clear-cache
   ```

5. **Build Frontend**
   ```bash
   cd apps/toil_management
   npm install
   npm run build
   bench build
   ```

6. **Restart Services**
   ```bash
   bench restart
   ```

7. **Verify Installation**
   - [ ] Check Leave Type exists
   - [ ] Check custom fields visible
   - [ ] Test timesheet creation
   - [ ] Test TOIL calculation
   - [ ] Test supervisor approval

## Post-Deployment

### Monitoring
- [ ] Check error logs: `bench --site [site-name] --verbose console`
- [ ] Monitor background jobs
- [ ] Check Leave Ledger entries

### User Training
- [ ] Train supervisors on approval workflow
- [ ] Train employees on TOIL tracking
- [ ] Share user documentation

### Support
- [ ] Set up support channel
- [ ] Monitor feedback
- [ ] Document common issues
```

---

## Implementation Timeline

```
Week 1:
├─ Day 1: Backend setup (Phases 1-2)
├─ Day 2: Core logic & hooks (Phase 3)
├─ Day 3: REST API (Phase 4)
└─ Day 4: Testing backend

Week 2:
├─ Day 1: Frontend components (Phase 5)
├─ Day 2: Integration & styling
├─ Day 3: Testing frontend
└─ Day 4: End-to-end testing

Week 3:
├─ Day 1: Bug fixes & refinements
├─ Day 2: Documentation
├─ Day 3: UAT (User Acceptance Testing)
└─ Day 4: Production deployment
```

---

## Key Decision Points

### 1. TOIL Calculation Method
**Decision:** Non-billable hours = TOIL  
**Alternative:** Could add Activity Type filter  
**Rationale:** Simpler implementation, clear business rule

### 2. Approval Workflow
**Decision:** Supervisor approval via timesheet submit  
**Alternative:** Separate TOIL approval step  
**Rationale:** Reduces workflow complexity

### 3. TOIL Expiry
**Decision:** 6 months from accrual  
**Alternative:** Annual reset  
**Rationale:** Encourages timely usage

### 4. Hours per Day
**Decision:** 8 hours (configurable in HR Settings)  
**Alternative:** Per-employee configuration  
**Rationale:** Organization-wide standard

---

## Troubleshooting Guide

### Common Issues

**Issue: TOIL allocation not created**
- Check: Timesheet has non-billable hours
- Check: User has supervisor permission
- Check: Leave Type exists
- Check: Hooks are registered

**Issue: Balance validation fails**
- Check: Leave Ledger Entries created
- Check: Allocation not expired
- Check: Employee field matches

**Issue: Supervisor cannot approve**
- Check: Employee.reports_to is set
- Check: Supervisor has user_id
- Check: Logged-in user matches supervisor

---

## Success Metrics

- [ ] 100% of non-billable timesheets create TOIL allocations
- [ ] Zero balance calculation errors
- [ ] Average approval time < 24 hours
- [ ] User satisfaction > 80%
- [ ] Zero data inconsistencies in Leave Ledger

---

## Appendix: Code Templates

### A. Supervisor Permission Check

```python
def has_supervisor_permission(doc, user):
    """Check if user is supervisor for employee"""
    employee = frappe.get_doc("Employee", doc.employee)
    if not employee.reports_to:
        return False
    
    supervisor_user = frappe.db.get_value(
        "Employee", 
        employee.reports_to, 
        "user_id"
    )
    return user == supervisor_user or "System Manager" in frappe.get_roles(user)
```

### B. TOIL Balance Widget (React)

```jsx
const TOILBalanceWidget = ({ employeeId }) => {
  const { balance, loading } = useTOIL(employeeId);
  
  return (
    <Card size="small">
      <Statistic
        title="TOIL Balance"
        value={balance?.balance || 0}
        precision={2}
        suffix="days"
      />
    </Card>
  );
};
```

### C. Error Handling Template

```python
try:
    # TOIL operation
    allocation = create_toil_allocation(doc)
except frappe.ValidationError as e:
    frappe.log_error(f"TOIL Validation Error: {str(e)}")
    frappe.throw(_("Failed to create TOIL allocation: {0}").format(str(e)))
except Exception as e:
    frappe.log_error(f"TOIL System Error: {str(e)}")
    frappe.throw(_("An unexpected error occurred. Please contact support."))
```

---

**End of Technical Execution Plan**

This plan provides Claude with all the necessary components, code structures, and implementation details to execute the TOIL system in your brownfield Frappe/Doppio + AntD application.