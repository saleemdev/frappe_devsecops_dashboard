#!/usr/bin/env python3
"""
TOIL Expiry Reminders - Cron Script

This script can be called directly by cron to send expiry reminders.
It's a wrapper around the send_expiry_reminders() function.

Usage:
    python3 cron_send_expiry_reminders.py --site <site-name>

Cron Example (Weekly on Monday at 9:00 AM):
    0 9 * * 1 cd /path/to/bench && /path/to/bench/env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_send_expiry_reminders.py --site mysite.com >> /var/log/toil_reminders.log 2>&1
"""

import sys
import os
import argparse
from pathlib import Path

def main():
    """Main entry point for cron script"""
    parser = argparse.ArgumentParser(description='Send TOIL expiry reminders')
    parser.add_argument('--site', required=True, help='Site name')
    args = parser.parse_args()

    # Add bench directory to path
    bench_path = Path(__file__).resolve().parents[5]
    sys.path.insert(0, str(bench_path))

    # Import Frappe
    import frappe

    # Initialize Frappe
    frappe.init(site=args.site)
    frappe.connect()

    try:
        # Import and run the reminder function
        from frappe_devsecops_dashboard.tasks.toil_expiry import send_expiry_reminders

        print(f"Starting TOIL expiry reminders task for site: {args.site}")
        email_count = send_expiry_reminders()
        print(f"TOIL expiry reminders task completed. Sent {email_count} email(s).")

        # Commit the transaction
        frappe.db.commit()

    except Exception as e:
        print(f"ERROR: TOIL expiry reminders task failed: {str(e)}", file=sys.stderr)
        frappe.db.rollback()
        sys.exit(1)

    finally:
        frappe.destroy()

if __name__ == "__main__":
    main()
