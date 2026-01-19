"""
Test script to create a project and verify hooks work
Run with: bench --site desk.kns.co.ke execute frappe_devsecops_dashboard.test_project_hooks.test_project_creation
"""

import frappe
import json
from datetime import datetime, timedelta

def test_project_creation():
    """Create a test project and verify hooks"""

    print("\n" + "="*80)
    print("TESTING PROJECT CREATION WITH HOOKS")
    print("="*80)

    try:
        # Generate unique project name
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        project_name = f"Test_ZenHub_{timestamp}"

        start_date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        end_date = (datetime.now() + timedelta(days=30)).strftime("%Y-%m-%d")

        print(f"\n[1/4] Creating project: {project_name}")

        # Create project document
        project = frappe.get_doc({
            "doctype": "Project",
            "project_name": project_name,
            "custom_software_product": "Afyangu Web",
            "expected_start_date": start_date,
            "expected_end_date": end_date,
            "status": "Open",
            "priority": "Medium"
        })

        # Before save hook should run here
        print(f"\n[2/4] Before save - checking workspace ID...")

        # This triggers the before_save hook
        project.insert()

        frappe.db.commit()

        print(f"\n[3/4] Project created successfully!")
        print(f"  Project ID: {project.name}")
        print(f"  Workspace ID: {project.get('custom_zenhub_workspace_id')}")
        print(f"  ZenHub Project ID: {project.get('custom_zenhub_project_id')}")

        if project.get('custom_zenhub_workspace_id'):
            print(f"\n✅ SUCCESS: Workspace ID auto-populated from product!")
        else:
            print(f"\n❌ FAILED: Workspace ID NOT populated")
            return False

        # After insert hook should queue async job
        print(f"\n[4/4] Checking async job queued...")
        print(f"  Check Error Log for 'ZenHub Project Creation' entries")

        return True

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        frappe.log_error(str(e), "Test Project Creation Error")
        return False

def check_error_logs():
    """Check error logs for ZenHub creation entries"""
    print("\n" + "="*80)
    print("CHECKING ERROR LOGS FOR ZENHUB PROJECT CREATION")
    print("="*80)

    try:
        # Query Error Log table directly
        logs = frappe.db.sql("""
            SELECT *
            FROM `tabError Log`
            ORDER BY creation DESC
            LIMIT 20
        """, as_dict=True)

        print(f"\n[1/2] Recent error log entries (last 20):")

        if logs:
            # Find ZenHub-related logs
            zenhub_logs = []
            for log in logs:
                log_str = str(log)
                if 'zenhub' in log_str.lower() or 'project' in log_str.lower():
                    zenhub_logs.append(log)

            print(f"\nTotal logs: {len(logs)}")
            print(f"ZenHub/Project-related: {len(zenhub_logs)}")

            if zenhub_logs:
                print(f"\n[2/2] ZenHub/Project-related logs:")
                for log in zenhub_logs[:5]:
                    error_doc = frappe.get_doc("Error Log", log["name"])
                    print(f"\n  Name: {log['name']}")
                    print(f"  Created: {log['creation']}")
                    print(f"  Method: {log.get('method')}")
                    if error_doc.error:
                        error_text = str(error_doc.error)[:300]
                        print(f"  Error: {error_text}")
            else:
                print(f"\n  No ZenHub/Project-related error logs yet")
        else:
            print("\nNo error logs found")

        return True

    except Exception as e:
        print(f"\n❌ Error: {str(e)}")
        import traceback
        traceback.print_exc()
        return False


def show_latest_error():
    """Show the latest error from error log"""
    print("\n" + "="*80)
    print("LATEST ERROR LOG ENTRY")
    print("="*80)

    try:
        latest = frappe.db.sql("""
            SELECT name FROM `tabError Log`
            ORDER BY creation DESC
            LIMIT 1
        """)

        if latest:
            error_doc = frappe.get_doc("Error Log", latest[0][0])
            print(f"\nError ID: {error_doc.name}")
            print(f"Created: {error_doc.creation}")
            print(f"\nFull Error Message:")
            print("="*80)
            if error_doc.error:
                print(error_doc.error)
            else:
                print("(No error message)")
            print("="*80)
        else:
            print("\nNo error logs found")

    except Exception as e:
        print(f"Error: {str(e)}")


if __name__ == "__main__":
    test_project_creation()
