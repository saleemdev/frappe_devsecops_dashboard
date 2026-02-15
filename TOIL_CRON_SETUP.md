# TOIL System - Cron Configuration

This document explains how to configure cron jobs for the TOIL system's scheduled tasks.

## Overview

The TOIL system has two scheduled tasks that need to run periodically:

1. **Expire TOIL Allocations** - Runs daily to mark TOIL allocations expired after 6 months
2. **Send Expiry Reminders** - Runs weekly to email employees about TOIL expiring within 30 days

## Cron Scripts

Two Python scripts have been created that can be called directly by cron:

- `frappe_devsecops_dashboard/tasks/cron_expire_toil.py`
- `frappe_devsecops_dashboard/tasks/cron_send_expiry_reminders.py`

These scripts:
- ✓ Initialize Frappe properly
- ✓ Connect to the specified site
- ✓ Execute the task functions
- ✓ Handle errors gracefully
- ✓ Commit/rollback transactions
- ✓ Log output to stdout/stderr
- ✓ Exit with proper status codes

## Installation

### Step 1: Make Scripts Executable

```bash
cd /Users/salim/frappe/my-bench
chmod +x apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_expire_toil.py
chmod +x apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_send_expiry_reminders.py
```

### Step 2: Configure Cron Jobs

Edit your crontab:

```bash
crontab -e
```

Add the following entries (adjust paths and site name as needed):

```cron
# TOIL System - Expire allocations daily at 2:00 AM
0 2 * * * cd /Users/salim/frappe/my-bench && ./env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_expire_toil.py --site YOUR_SITE_NAME >> /var/log/toil_expiry.log 2>&1

# TOIL System - Send expiry reminders weekly on Monday at 9:00 AM
0 9 * * 1 cd /Users/salim/frappe/my-bench && ./env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_send_expiry_reminders.py --site YOUR_SITE_NAME >> /var/log/toil_reminders.log 2>&1
```

**Important:** Replace `YOUR_SITE_NAME` with your actual Frappe site name.

### Step 3: Create Log Directory (Optional)

If you want to log to `/var/log`, create the directory and set permissions:

```bash
sudo mkdir -p /var/log/toil
sudo chown $(whoami):$(whoami) /var/log/toil
```

Then update cron entries to use:
- `/var/log/toil/expiry.log`
- `/var/log/toil/reminders.log`

## Alternative: Using Bench Command Wrapper

For better integration with Frappe bench, you can use `bench execute`:

```cron
# TOIL System - Expire allocations daily at 2:00 AM
0 2 * * * cd /Users/salim/frappe/my-bench && bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations >> /var/log/toil_expiry.log 2>&1

# TOIL System - Send expiry reminders weekly on Monday at 9:00 AM
0 9 * * 1 cd /Users/salim/frappe/my-bench && bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders >> /var/log/toil_reminders.log 2>&1
```

This method:
- ✓ Uses bench's environment automatically
- ✓ Handles Frappe initialization
- ✓ Simpler syntax
- ✓ Better error handling

## Cron Schedule Examples

### Daily Tasks

```cron
# Every day at 2:00 AM
0 2 * * *

# Every day at midnight
0 0 * * *

# Every 6 hours
0 */6 * * *

# Every day at 3:30 AM
30 3 * * *
```

### Weekly Tasks

```cron
# Every Monday at 9:00 AM
0 9 * * 1

# Every Friday at 5:00 PM
0 17 * * 5

# Every Sunday at midnight
0 0 * * 0

# Every Wednesday at 10:00 AM
0 10 * * 3
```

## Testing

### Test the Scripts Manually

**Expire Allocations:**
```bash
cd /Users/salim/frappe/my-bench
./env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_expire_toil.py --site YOUR_SITE_NAME
```

**Send Reminders:**
```bash
cd /Users/salim/frappe/my-bench
./env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_send_expiry_reminders.py --site YOUR_SITE_NAME
```

### Test Using Bench Execute

**Expire Allocations:**
```bash
cd /Users/salim/frappe/my-bench
bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations
```

**Send Reminders:**
```bash
cd /Users/salim/frappe/my-bench
bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders
```

### Verify Cron is Running

```bash
# Check cron service status
sudo systemctl status cron

# View cron logs (Ubuntu/Debian)
sudo tail -f /var/log/syslog | grep CRON

# View TOIL-specific logs
tail -f /var/log/toil_expiry.log
tail -f /var/log/toil_reminders.log
```

## Monitoring

### Email Notifications on Failure

You can configure cron to email you on failures by setting MAILTO:

```cron
MAILTO=your-email@example.com

# TOIL System - Expire allocations
0 2 * * * cd /Users/salim/frappe/my-bench && bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations
```

### Log Rotation

Create a logrotate configuration:

```bash
sudo nano /etc/logrotate.d/toil
```

Add:
```
/var/log/toil/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 0644 YOUR_USER YOUR_USER
}
```

## Troubleshooting

### Cron Job Not Running

1. **Check cron service:**
   ```bash
   sudo systemctl status cron
   ```

2. **Verify crontab entries:**
   ```bash
   crontab -l
   ```

3. **Check permissions:**
   ```bash
   ls -la apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_*.py
   ```

4. **Test script manually** (see Testing section above)

### Script Fails with ImportError

- Verify you're using the bench virtual environment: `./env/bin/python`
- Check that frappe_devsecops_dashboard is installed: `bench list-apps`
- Verify the script paths are correct

### No Emails Being Sent

1. **Check Frappe email settings:**
   - Setup > Email > Email Account
   - Verify SMTP configuration

2. **Check if there are actually employees with expiring TOIL:**
   ```bash
   bench --site YOUR_SITE_NAME console
   >>> from frappe_devsecops_dashboard.tasks.toil_expiry import send_expiry_reminders
   >>> send_expiry_reminders()
   ```

3. **Check logs:**
   ```bash
   tail -f /var/log/toil_reminders.log
   ```

### Database Lock Errors

If you see database lock errors:
- Ensure only one instance of each task runs at a time
- Add lock files to prevent concurrent execution
- Use `flock` in cron entries:
  ```cron
  0 2 * * * flock -n /tmp/toil_expire.lock bash -c "cd /Users/salim/frappe/my-bench && bench --site YOUR_SITE_NAME execute frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations"
  ```

## Removal of Frappe Scheduler

The TOIL tasks have been **removed from hooks.py scheduler_events** to avoid conflicts with cron.

If you want to use Frappe's built-in scheduler instead of cron, you can re-add them to `hooks.py`:

```python
scheduler_events = {
    "daily": [
        "frappe_devsecops_dashboard.tasks.toil_expiry.expire_toil_allocations"
    ],
    "weekly": [
        "frappe_devsecops_dashboard.tasks.toil_expiry.send_expiry_reminders"
    ]
}
```

**Note:** Do NOT use both cron and Frappe scheduler for the same tasks to avoid duplicate execution.

## Summary

- ✓ Two cron-compatible scripts created
- ✓ Can be called directly by system cron
- ✓ Alternative: Use `bench execute` for simpler integration
- ✓ Recommended schedule: Daily at 2 AM (expire), Weekly Monday 9 AM (reminders)
- ✓ Log output to files for monitoring
- ✓ Test scripts manually before scheduling
- ✓ Monitor logs to ensure proper execution
