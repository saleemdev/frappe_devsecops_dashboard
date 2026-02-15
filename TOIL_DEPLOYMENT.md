# TOIL System - Deployment Guide

**Version:** 1.0
**Last Updated:** February 14, 2026
**System:** Time Off in Lieu (TOIL) Management

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [Step-by-Step Deployment Procedure](#step-by-step-deployment-procedure)
3. [Database Migration Steps](#database-migration-steps)
4. [Frontend Build and Deployment](#frontend-build-and-deployment)
5. [Cron Job Setup](#cron-job-setup)
6. [Post-Deployment Verification](#post-deployment-verification)
7. [Rollback Procedure](#rollback-procedure)
8. [Common Issues and Troubleshooting](#common-issues-and-troubleshooting)

---

## Pre-Deployment Checklist

### Infrastructure Requirements

- [ ] Frappe Framework version 14+ installed
- [ ] ERPNext HR module enabled and configured
- [ ] Python 3.10+ environment
- [ ] Node.js 18+ and npm installed
- [ ] Database: MySQL 8.0+ or MariaDB 10.6+
- [ ] Sufficient disk space: minimum 500MB free
- [ ] Backup system configured and tested

### System Dependencies

- [ ] Email server (SMTP) configured in Frappe
- [ ] Cron daemon running (for scheduled tasks)
- [ ] Redis server running (for caching)
- [ ] Web server (nginx/Apache) configured

### Access Requirements

- [ ] System Manager role access for deployment
- [ ] Database admin credentials
- [ ] Server SSH/terminal access
- [ ] Backup storage location accessible

### Pre-Deployment Tasks

- [ ] Full database backup completed
- [ ] Code repository tagged with current version
- [ ] Test environment validated
- [ ] Stakeholders notified of deployment window
- [ ] Downtime window scheduled (recommended: 30-60 minutes)
- [ ] Rollback plan reviewed and approved

### Data Validation

- [ ] Verify all employees have valid user accounts
- [ ] Verify all employees have supervisors assigned (reports_to field)
- [ ] Verify Leave Type "Time Off in Lieu" does not already exist
- [ ] Check for any existing TOIL-related custom fields (should not exist)
- [ ] Verify no pending timesheet submissions

---

## Step-by-Step Deployment Procedure

### Phase 1: Pre-Deployment (15 minutes)

#### 1.1 Create Backup

```bash
# Navigate to bench directory
cd /path/to/your/bench

# Backup database
bench --site YOUR_SITE_NAME backup --with-files

# Verify backup created
ls -lh sites/YOUR_SITE_NAME/private/backups/
```

#### 1.2 Enable Maintenance Mode

```bash
# Enable maintenance mode
bench --site YOUR_SITE_NAME set-maintenance-mode on

# Verify maintenance mode
bench --site YOUR_SITE_NAME doctor
```

#### 1.3 Stop Scheduler (if using Frappe scheduler)

```bash
# Disable scheduler
bench --site YOUR_SITE_NAME scheduler disable

# Verify scheduler stopped
bench --site YOUR_SITE_NAME scheduler status
```

### Phase 2: Code Deployment (10 minutes)

#### 2.1 Pull Latest Code

```bash
# Pull latest code from repository
cd apps/frappe_devsecops_dashboard
git fetch origin
git checkout main  # or your deployment branch
git pull origin main

# Verify correct version
git log -1 --oneline
```

#### 2.2 Install Dependencies

```bash
# Return to bench directory
cd ../..

# Install Python dependencies
bench pip install -r apps/frappe_devsecops_dashboard/requirements.txt

# Install Node dependencies (if needed)
cd apps/frappe_devsecops_dashboard/frontend
npm install
cd ../../..
```

#### 2.3 Update App in Site

```bash
# Update the app
bench --site YOUR_SITE_NAME migrate

# Clear cache
bench --site YOUR_SITE_NAME clear-cache
```

### Phase 3: Database Migration (10 minutes)

See detailed steps in [Database Migration Steps](#database-migration-steps) section below.

### Phase 4: Frontend Deployment (10 minutes)

See detailed steps in [Frontend Build and Deployment](#frontend-build-and-deployment) section below.

### Phase 5: Configuration (10 minutes)

#### 5.1 Load Fixtures

```bash
# Load Leave Type fixture
bench --site YOUR_SITE_NAME export-fixtures
bench --site YOUR_SITE_NAME import-doc frappe_devsecops_dashboard/fixtures/toil_leave_type.json
```

#### 5.2 Verify Fixtures Loaded

```bash
# Check if Leave Type exists
bench --site YOUR_SITE_NAME console

>>> import frappe
>>> leave_type = frappe.get_doc("Leave Type", "Time Off in Lieu")
>>> print(leave_type.name)
>>> exit()
```

#### 5.3 Setup Cron Jobs

See detailed steps in [Cron Job Setup](#cron-job-setup) section below.

### Phase 6: Post-Deployment (10 minutes)

#### 6.1 Disable Maintenance Mode

```bash
# Disable maintenance mode
bench --site YOUR_SITE_NAME set-maintenance-mode off
```

#### 6.2 Enable Scheduler (if using Frappe scheduler)

```bash
# Enable scheduler
bench --site YOUR_SITE_NAME scheduler enable
bench --site YOUR_SITE_NAME scheduler resume

# Verify scheduler running
bench --site YOUR_SITE_NAME scheduler status
```

#### 6.3 Restart Services

```bash
# Restart all bench services
bench restart

# Or restart individual services
sudo systemctl restart nginx
sudo systemctl restart frappe-bench-web.service
sudo systemctl restart frappe-bench-workers.service
```

---

## Database Migration Steps

### Step 1: Run Migration Script

The TOIL system includes a migration patch that creates all necessary custom fields and database indexes.

```bash
# Navigate to bench directory
cd /path/to/your/bench

# Run migration
bench --site YOUR_SITE_NAME migrate

# The migration will execute:
# - apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/patches/v1_0/setup_toil.py
```

### Step 2: Verify Custom Fields Created

#### Timesheet Custom Fields

```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Check Timesheet fields
meta = frappe.get_meta("Timesheet")
toil_fields = [f.fieldname for f in meta.fields if 'toil' in f.fieldname.lower()]
print("Timesheet TOIL fields:", toil_fields)

# Expected output:
# ['toil_section', 'total_toil_hours', 'toil_days', 'toil_allocation',
#  'toil_status', 'toil_calculation_details']

exit()
```

#### Leave Allocation Custom Fields

```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Check Leave Allocation fields
meta = frappe.get_meta("Leave Allocation")
toil_fields = [f.fieldname for f in meta.fields if 'toil' in f.fieldname.lower() or f.fieldname == 'source_timesheet']
print("Leave Allocation TOIL fields:", toil_fields)

# Expected output:
# ['source_timesheet', 'toil_hours', 'is_toil_allocation']

exit()
```

### Step 3: Verify Database Indexes

```bash
bench --site YOUR_SITE_NAME mariadb
```

```sql
-- Check Leave Ledger Entry index
SHOW INDEX FROM `tabLeave Ledger Entry` WHERE Key_name = 'idx_leave_ledger_toil';

-- Check Leave Allocation index
SHOW INDEX FROM `tabLeave Allocation` WHERE Key_name = 'idx_leave_allocation_toil';

-- Check Timesheet index
SHOW INDEX FROM `tabTimesheet` WHERE Key_name = 'idx_timesheet_toil';

-- Exit
exit;
```

### Step 4: Verify Document Hooks Registered

```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Check hooks registered
hooks = frappe.get_hooks()
print("Timesheet hooks:", hooks.get('doc_events', {}).get('Timesheet', {}))
print("Leave Application hooks:", hooks.get('doc_events', {}).get('Leave Application', {}))

# Expected: Should show hooks for validate, on_submit, on_cancel, etc.

exit()
```

### Step 5: Migration Rollback (if needed)

If migration fails, rollback can be performed manually:

```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Delete custom fields
fields_to_delete = [
    # Timesheet fields
    ('Timesheet', 'toil_section'),
    ('Timesheet', 'total_toil_hours'),
    ('Timesheet', 'toil_days'),
    ('Timesheet', 'toil_allocation'),
    ('Timesheet', 'toil_status'),
    ('Timesheet', 'toil_calculation_details'),
    # Leave Allocation fields
    ('Leave Allocation', 'source_timesheet'),
    ('Leave Allocation', 'toil_hours'),
    ('Leave Allocation', 'is_toil_allocation')
]

for doctype, fieldname in fields_to_delete:
    try:
        custom_field = frappe.get_doc('Custom Field', f'{doctype}-{fieldname}')
        custom_field.delete()
        print(f"Deleted {doctype}.{fieldname}")
    except:
        print(f"Field {doctype}.{fieldname} does not exist")

frappe.db.commit()
exit()
```

---

## Frontend Build and Deployment

### Step 1: Build Frontend Assets

```bash
# Navigate to frontend directory
cd /path/to/your/bench/apps/frappe_devsecops_dashboard/frontend

# Install dependencies (if not already done)
npm install

# Build production assets
npm run build

# Verify build completed
ls -la dist/
```

### Step 2: Verify Frontend Routes

The TOIL system uses the existing frontend infrastructure. Verify routes are configured:

```bash
# Check router configuration
cat src/router/index.js | grep -i toil
```

Expected routes:
- `/toil` - TOIL dashboard (if implemented)
- Timesheet pages enhanced with TOIL display

### Step 3: Clear Browser Cache

After deployment, instruct users to:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5 or Cmd+Shift+R)
3. Log out and log back in

### Step 4: Verify Static Assets

```bash
# Check if assets are served correctly
curl -I http://YOUR_DOMAIN/assets/frappe_devsecops_dashboard/frontend/dist/index.js

# Expected: 200 OK response
```

### Step 5: Frontend Rollback (if needed)

```bash
# Navigate to frontend directory
cd /path/to/your/bench/apps/frappe_devsecops_dashboard/frontend

# Checkout previous version
git log --oneline -10
git checkout PREVIOUS_COMMIT_HASH

# Rebuild
npm run build

# Restart services
bench restart
```

---

## Cron Job Setup

The TOIL system requires two scheduled tasks to run periodically. See [TOIL_CRON_SETUP.md](./TOIL_CRON_SETUP.md) for full details.

### Quick Setup (Recommended Method)

#### Option 1: Using bench execute (Recommended)

```bash
# Open crontab
crontab -e

# Add these lines (replace YOUR_SITE_NAME with actual site name)
# Expire TOIL allocations daily at 2:00 AM
0 2 * * * cd /path/to/your/bench && bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations >> /var/log/toil_expiry.log 2>&1

# Send expiry reminders weekly on Monday at 9:00 AM
0 9 * * 1 cd /path/to/your/bench && bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders >> /var/log/toil_reminders.log 2>&1
```

#### Option 2: Using Python scripts directly

```bash
# Make scripts executable
chmod +x /path/to/your/bench/apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_expire_toil.py
chmod +x /path/to/your/bench/apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_send_expiry_reminders.py

# Open crontab
crontab -e

# Add these lines
0 2 * * * cd /path/to/your/bench && ./env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_expire_toil.py --site YOUR_SITE_NAME >> /var/log/toil_expiry.log 2>&1
0 9 * * 1 cd /path/to/your/bench && ./env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_send_expiry_reminders.py --site YOUR_SITE_NAME >> /var/log/toil_reminders.log 2>&1
```

### Verify Cron Setup

```bash
# List cron jobs
crontab -l

# Test expire allocation manually
bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations

# Test send reminders manually
bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders

# Check cron logs
tail -f /var/log/toil_expiry.log
tail -f /var/log/toil_reminders.log
```

### Cron Log Rotation (Optional but Recommended)

```bash
# Create logrotate config
sudo nano /etc/logrotate.d/toil

# Add this content:
/var/log/toil*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 YOUR_USER YOUR_USER
}

# Save and test
sudo logrotate -d /etc/logrotate.d/toil
```

---

## Post-Deployment Verification

### Verification Checklist

- [ ] System accessible (maintenance mode disabled)
- [ ] Leave Type "Time Off in Lieu" exists
- [ ] Custom fields visible in Timesheet form
- [ ] Custom fields visible in Leave Allocation form
- [ ] API endpoints responding correctly
- [ ] Frontend assets loading
- [ ] Cron jobs configured
- [ ] Email notifications working
- [ ] Logs showing no errors

### Test 1: Verify Leave Type

```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Check Leave Type
leave_type = frappe.get_doc("Leave Type", "Time Off in Lieu")
print(f"Leave Type: {leave_type.name}")
print(f"Is Carry Forward: {leave_type.is_carry_forward}")
print(f"Expire After Days: {leave_type.expire_carry_forwarded_leaves_after_days}")

# Expected:
# - is_carry_forward = 1
# - expire_carry_forwarded_leaves_after_days = 180 (6 months)

exit()
```

### Test 2: Verify API Endpoints

```bash
# Test get_user_role endpoint
curl -X GET "http://YOUR_DOMAIN/api/method/frappe_devsecops_dashboard.api.toil.get_user_role" \
  -H "Authorization: token YOUR_API_KEY:YOUR_API_SECRET" \
  -H "Content-Type: application/json"

# Expected: {"message": {"success": true, "role": "employee|supervisor|hr"}}
```

### Test 3: Create Test Timesheet (Manual)

1. Log in as an employee
2. Navigate to Timesheet list
3. Create a new Timesheet
4. Add time logs with `is_billable = 0` (non-billable)
5. Save the timesheet
6. Verify TOIL fields are calculated:
   - Total TOIL Hours should show sum of non-billable hours
   - TOIL Days should show hours / 8
   - TOIL Status should be "Pending Accrual"

### Test 4: Approve Timesheet (Manual)

1. Log in as supervisor of the employee
2. Navigate to the test timesheet
3. Submit/Approve the timesheet
4. Verify:
   - Timesheet status changes to Submitted
   - Leave Allocation is created automatically
   - TOIL Status changes to "Accrued"
   - TOIL Allocation reference is populated

### Test 5: Verify Leave Application

1. Log in as the employee
2. Navigate to Leave Application
3. Create new Leave Application with Leave Type = "Time Off in Lieu"
4. Select dates
5. Verify:
   - Available balance is shown
   - Balance is sufficient
   - Can submit leave application
   - After submission, balance decreases

### Test 6: Check Cron Jobs

```bash
# Wait for cron to run or execute manually
bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations

# Check logs
tail -20 /var/log/toil_expiry.log

# Verify no errors in output
```

### Test 7: Email Notification Test

```bash
# Manually trigger expiry reminder
bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders

# Check Email Queue
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Check email queue
emails = frappe.get_all('Email Queue',
    filters={'reference_doctype': 'Employee'},
    fields=['name', 'recipient', 'subject', 'status'],
    limit=5
)

for email in emails:
    print(email)

exit()
```

### Test 8: Performance Verification

```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe
import time

# Test TOIL balance query performance
start = time.time()
result = frappe.db.sql("""
    SELECT
        SUM(leaves) as balance
    FROM `tabLeave Ledger Entry`
    WHERE employee = 'EMP-001'
    AND leave_type = 'Time Off in Lieu'
    AND docstatus = 1
    AND (is_expired IS NULL OR is_expired = 0)
""", as_dict=True)
end = time.time()

print(f"Query time: {(end - start) * 1000:.2f}ms")
# Expected: < 100ms (with indexes)

exit()
```

---

## Rollback Procedure

### When to Rollback

Initiate rollback if:
- Critical errors occur during deployment
- Database migration fails
- API endpoints not responding
- Data corruption detected
- Performance severely degraded
- Stakeholder requests rollback

### Rollback Steps

#### Step 1: Enable Maintenance Mode

```bash
bench --site YOUR_SITE_NAME set-maintenance-mode on
```

#### Step 2: Stop Cron Jobs

```bash
# Comment out TOIL cron jobs
crontab -e

# Add # at the beginning of TOIL cron lines
# Save and exit
```

#### Step 3: Restore Database Backup

```bash
# List available backups
bench --site YOUR_SITE_NAME list-backups

# Restore specific backup
bench --site YOUR_SITE_NAME restore /path/to/backup/YOUR_SITE_NAME-TIMESTAMP-database.sql.gz

# Verify restoration
bench --site YOUR_SITE_NAME mariadb -e "SELECT COUNT(*) FROM tabEmployee"
```

#### Step 4: Rollback Code

```bash
# Navigate to app directory
cd /path/to/your/bench/apps/frappe_devsecops_dashboard

# Checkout previous version
git log --oneline -10
git checkout PREVIOUS_COMMIT_HASH

# Or rollback to specific tag
git checkout v1.0.0  # Replace with previous stable version
```

#### Step 5: Rebuild Frontend

```bash
# Navigate to frontend
cd frontend

# Install dependencies for previous version
npm install

# Build
npm run build
```

#### Step 6: Clear Cache and Restart

```bash
# Clear cache
bench --site YOUR_SITE_NAME clear-cache

# Restart services
bench restart
```

#### Step 7: Verify Rollback

```bash
# Check version
cd /path/to/your/bench/apps/frappe_devsecops_dashboard
git log -1 --oneline

# Test critical functions
bench --site YOUR_SITE_NAME doctor
```

#### Step 8: Disable Maintenance Mode

```bash
bench --site YOUR_SITE_NAME set-maintenance-mode off
```

#### Step 9: Notify Stakeholders

Send notification about:
- Rollback completed
- Current system version
- Next steps for redeployment
- Any data loss (if applicable)

---

## Common Issues and Troubleshooting

### Issue 1: Migration Fails with "Table doesn't exist"

**Symptoms:**
```
Error: Table 'tabTimesheet' doesn't exist
```

**Cause:** ERPNext HR module not installed or Timesheet DocType not available.

**Solution:**
```bash
# Install HR module
bench --site YOUR_SITE_NAME install-app erpnext

# Or reinstall ERPNext
bench --site YOUR_SITE_NAME reinstall
```

### Issue 2: Custom Fields Not Showing in Form

**Symptoms:** TOIL fields not visible in Timesheet or Leave Allocation forms.

**Cause:** Cache not cleared after migration.

**Solution:**
```bash
# Clear cache
bench --site YOUR_SITE_NAME clear-cache

# Rebuild forms
bench --site YOUR_SITE_NAME migrate
bench build --app frappe_devsecops_dashboard

# Restart services
bench restart

# Hard refresh browser (Ctrl+F5)
```

### Issue 3: "Permission Denied" Error on Timesheet Submit

**Symptoms:**
```
PermissionError: Only the immediate supervisor can approve this timesheet
```

**Cause:** Employee's supervisor not assigned or supervisor has no user account.

**Solution:**
```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Check employee's supervisor
employee = frappe.get_doc('Employee', 'EMP-001')
print(f"Supervisor: {employee.reports_to}")

if not employee.reports_to:
    # Assign supervisor
    employee.reports_to = 'EMP-SUPERVISOR-001'
    employee.save()
    print("Supervisor assigned")
else:
    # Check if supervisor has user account
    supervisor = frappe.get_doc('Employee', employee.reports_to)
    print(f"Supervisor user: {supervisor.user_id}")

    if not supervisor.user_id:
        print("ERROR: Supervisor has no user account. Please assign one.")

frappe.db.commit()
exit()
```

### Issue 4: TOIL Allocation Not Created After Timesheet Submit

**Symptoms:** Timesheet submitted but no Leave Allocation created.

**Cause:** Hooks not registered or error in hook execution.

**Solution:**
```bash
# Check error logs
tail -100 /path/to/your/bench/logs/YOUR_SITE_NAME-error.log

# Verify hooks registered
bench --site YOUR_SITE_NAME console
```

```python
import frappe

hooks = frappe.get_hooks()
print(hooks.get('doc_events', {}).get('Timesheet', {}))

# Should show:
# {'on_submit': 'frappe_devsecops_dashboard.overrides.timesheet.create_toil_allocation', ...}

exit()
```

**If hooks not registered:**
```bash
# Clear cache and migrate
bench --site YOUR_SITE_NAME clear-cache
bench --site YOUR_SITE_NAME migrate
bench restart
```

### Issue 5: Cron Jobs Not Running

**Symptoms:** TOIL not expiring, no reminder emails sent.

**Cause:** Cron not configured or incorrect paths.

**Solution:**
```bash
# Check cron is running
sudo systemctl status cron

# Verify crontab entries
crontab -l

# Test manually
bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations

# Check logs
tail -20 /var/log/toil_expiry.log

# If "No such file" error, verify paths
which bench
pwd
```

**Fix cron paths:**
```bash
crontab -e

# Use absolute paths
0 2 * * * cd /ABSOLUTE/PATH/TO/bench && /ABSOLUTE/PATH/TO/bench/env/bin/bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations >> /var/log/toil_expiry.log 2>&1
```

### Issue 6: Email Notifications Not Sending

**Symptoms:** Cron runs but no emails received.

**Cause:** Email server not configured or Email Queue not processed.

**Solution:**
```bash
# Check email settings
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Check email account
email_account = frappe.get_doc('Email Account', {'default_outgoing': 1})
print(f"SMTP Server: {email_account.smtp_server}")
print(f"Port: {email_account.smtp_port}")
print(f"Enabled: {email_account.enable_outgoing}")

# Check email queue
emails = frappe.get_all('Email Queue',
    filters={'status': ['in', ['Not Sent', 'Error']]},
    limit=5
)
print(f"Pending emails: {len(emails)}")

exit()
```

**Fix email settings:**
1. Go to Setup > Email > Email Account
2. Configure SMTP settings
3. Test email
4. Enable email queue processing:

```bash
# Check email queue worker
bench --site YOUR_SITE_NAME worker --queue email
```

### Issue 7: "Insufficient TOIL Balance" Error

**Symptoms:** Cannot submit Leave Application even though balance exists.

**Cause:** Balance calculation mismatch or expired allocations not marked.

**Solution:**
```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe
from frappe.utils import flt

# Check balance manually
employee = 'EMP-001'

# Get total balance including expired
total = frappe.db.sql("""
    SELECT SUM(leaves) as balance
    FROM `tabLeave Ledger Entry`
    WHERE employee = %s
    AND leave_type = 'Time Off in Lieu'
    AND docstatus = 1
""", employee, as_dict=True)[0].balance

print(f"Total balance: {flt(total, 3)}")

# Get non-expired balance
available = frappe.db.sql("""
    SELECT SUM(leaves) as balance
    FROM `tabLeave Ledger Entry`
    WHERE employee = %s
    AND leave_type = 'Time Off in Lieu'
    AND docstatus = 1
    AND (is_expired IS NULL OR is_expired = 0)
""", employee, as_dict=True)[0].balance

print(f"Available balance: {flt(available, 3)}")

# If mismatch, run expiry task
from frappe_devsecops_dashboard.tasks.toil_expiry import expire_toil_allocations
expired_count = expire_toil_allocations()
print(f"Expired {expired_count} allocations")

frappe.db.commit()
exit()
```

### Issue 8: High Database Load / Slow Queries

**Symptoms:** TOIL queries taking > 500ms, database CPU high.

**Cause:** Database indexes not created.

**Solution:**
```bash
# Check indexes exist
bench --site YOUR_SITE_NAME mariadb
```

```sql
SHOW INDEX FROM `tabLeave Ledger Entry`;
SHOW INDEX FROM `tabLeave Allocation`;
SHOW INDEX FROM `tabTimesheet`;

-- If indexes missing, create manually
CREATE INDEX idx_leave_ledger_toil ON `tabLeave Ledger Entry` (employee, leave_type, docstatus, to_date);
CREATE INDEX idx_leave_allocation_toil ON `tabLeave Allocation` (is_toil_allocation, employee, docstatus);
CREATE INDEX idx_timesheet_toil ON `tabTimesheet` (employee, docstatus, toil_status);

-- Verify indexes
SHOW INDEX FROM `tabLeave Ledger Entry` WHERE Key_name LIKE '%toil%';

exit;
```

### Issue 9: Frontend Not Loading / JavaScript Errors

**Symptoms:** TOIL interface not loading, console shows errors.

**Cause:** Frontend build incomplete or cache issues.

**Solution:**
```bash
# Rebuild frontend
cd /path/to/your/bench/apps/frappe_devsecops_dashboard/frontend
npm run build

# Clear browser cache (instruct users)
# Ctrl+Shift+Delete (Chrome/Firefox)

# Clear Frappe cache
cd /path/to/your/bench
bench --site YOUR_SITE_NAME clear-cache
bench --site YOUR_SITE_NAME clear-website-cache

# Restart services
bench restart

# Check for build errors
cat /path/to/your/bench/apps/frappe_devsecops_dashboard/frontend/build.log
```

### Issue 10: "Cannot cancel timesheet - TOIL consumed"

**Symptoms:** Cannot cancel timesheet after TOIL used in Leave Application.

**Cause:** This is expected behavior (data integrity protection).

**Solution:**
1. Cancel the Leave Application(s) that consumed the TOIL first
2. Then cancel the Timesheet

```bash
bench --site YOUR_SITE_NAME console
```

```python
import frappe

# Find leave applications consuming TOIL from specific timesheet
timesheet = 'TS-00001'
allocation = frappe.db.get_value('Timesheet', timesheet, 'toil_allocation')

if allocation:
    # Find leave applications using this allocation
    leave_apps = frappe.db.sql("""
        SELECT la.name, la.total_leave_days, la.status
        FROM `tabLeave Application` la
        INNER JOIN `tabLeave Ledger Entry` lle ON lle.transaction_name = la.name
        WHERE lle.transaction_type = 'Leave Application'
        AND lle.transaction_name IN (
            SELECT transaction_name
            FROM `tabLeave Ledger Entry`
            WHERE transaction_name = %s
        )
        AND la.docstatus = 1
    """, allocation, as_dict=True)

    print("Leave Applications consuming this TOIL:")
    for la in leave_apps:
        print(f"- {la.name}: {la.total_leave_days} days ({la.status})")

    print("\nCancel these leave applications first, then cancel the timesheet.")

exit()
```

---

## Support and Escalation

### Getting Help

- **Documentation:** Refer to TOIL_ARCHITECTURE.md and TOIL_USER_GUIDE.md
- **Logs Location:**
  - Frappe logs: `/path/to/bench/logs/YOUR_SITE_NAME-error.log`
  - TOIL expiry: `/var/log/toil_expiry.log`
  - TOIL reminders: `/var/log/toil_reminders.log`
- **Debug Mode:**
  ```bash
  # Enable debug mode for detailed logs
  bench --site YOUR_SITE_NAME set-config developer_mode 1
  bench restart
  ```

### Escalation Process

1. **Level 1:** Check this troubleshooting guide
2. **Level 2:** Review error logs and system logs
3. **Level 3:** Contact system administrator
4. **Level 4:** Open issue on GitHub repository
5. **Level 5:** Escalate to development team

### Emergency Contacts

- System Administrator: [Contact Info]
- Database Administrator: [Contact Info]
- Development Team: [Contact Info]
- Escalation Manager: [Contact Info]

---

## Deployment Sign-Off

### Completion Checklist

- [ ] All deployment steps completed successfully
- [ ] All verification tests passed
- [ ] Cron jobs configured and tested
- [ ] Email notifications tested
- [ ] Performance benchmarks acceptable
- [ ] Documentation updated
- [ ] Stakeholders notified
- [ ] Training materials available
- [ ] Support team briefed

### Sign-Off

**Deployed By:** ___________________
**Date:** ___________________
**Time:** ___________________
**Version Deployed:** ___________________

**Verified By:** ___________________
**Date:** ___________________

**Approved By:** ___________________
**Date:** ___________________

---

**Document Version:** 1.0
**Last Updated:** February 14, 2026
**Next Review:** March 14, 2026
