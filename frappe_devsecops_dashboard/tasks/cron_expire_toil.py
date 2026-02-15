#!/usr/bin/env python3
"""
TOIL Expiry - Cron Script

This script can be called directly by cron to expire TOIL allocations.
It's a wrapper around the expire_toil_allocations() function.

Usage:
    python3 cron_expire_toil.py --site <site-name>

Cron Example (Daily at 2:00 AM):
    0 2 * * * cd /path/to/bench && /path/to/bench/env/bin/python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/tasks/cron_expire_toil.py --site mysite.com >> /var/log/toil_expiry.log 2>&1
"""

import sys
import os
import argparse
from pathlib import Path

def main():
    """Main entry point for cron script"""
    parser = argparse.ArgumentParser(description='Expire TOIL allocations')
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
        # Import and run the expiry function
        from frappe_devsecops_dashboard.tasks.toil_expiry import expire_toil_allocations

        print(f"Starting TOIL expiry task for site: {args.site}")
        expired_count = expire_toil_allocations()
        print(f"TOIL expiry task completed. Expired {expired_count} allocation(s).")

        # Commit the transaction
        frappe.db.commit()

    except Exception as e:
        print(f"ERROR: TOIL expiry task failed: {str(e)}", file=sys.stderr)
        frappe.db.rollback()
        sys.exit(1)

    finally:
        frappe.destroy()

if __name__ == "__main__":
    main()
