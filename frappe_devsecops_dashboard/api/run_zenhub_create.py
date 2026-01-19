"""
Quick Runner Script for Zenhub Entity Creation

This script can be run directly from Frappe console to create Zenhub epics.

IMPORTANT: Workspaces and Projects must be created in Zenhub UI first.
This script will create epics (GitHub issues) in an existing workspace/project.

Usage:
    bench --site <site> console
    exec(open('apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/api/run_zenhub_create.py').read())
"""

import frappe
from frappe_devsecops_dashboard.api.zenhub_create_entities import create_zenhub_entities

# ============================================================================
# CONFIGURATION - Modify these values before running
# ============================================================================

# REQUIRED: Get this from Zenhub UI or from an existing Project's custom_zenhub_workspace_id
WORKSPACE_ID = None  # e.g., "Z2lkOi8vcmFwdG9yL1dvcmtzcGFjZS8xNDUwNjY="

# OPTIONAL: Provide either project_id OR project_name
PROJECT_ID = None  # e.g., "Z2lkOi8vcmFwdG9yL1Byb2plY3QvMTIzNDU2"
PROJECT_NAME = None  # e.g., "Main Development Project"

# List of epic titles to create
EPIC_TITLES = [
    "User Authentication & Authorization",
    "Dashboard & Reporting Features",
    "API Integration & Management",
    "Security & Compliance",
    "Performance Optimization"
]

# ============================================================================
# EXECUTION
# ============================================================================

if __name__ == "__main__" or True:  # Allow execution from console
    print("=" * 80)
    print("🚀 Zenhub Epic Creation Script")
    print("=" * 80)
    print()
    
    # Validate configuration
    if not WORKSPACE_ID:
        print("❌ ERROR: WORKSPACE_ID is required!")
        print()
        print("To get your workspace ID:")
        print("  1. Open Zenhub in your browser")
        print("  2. Navigate to your workspace")
        print("  3. Look at the URL: https://app.zenhub.com/workspaces/{workspace_id}/...")
        print("  4. Copy the workspace_id part")
        print()
        print("Or get it from a Project:")
        print("  - Check Project.custom_zenhub_workspace_id in Frappe")
        print()
        print("Then update WORKSPACE_ID in this script and run again.")
        exit(1)
    
    if not PROJECT_ID and not PROJECT_NAME:
        print("❌ ERROR: Either PROJECT_ID or PROJECT_NAME must be provided!")
        print()
        print("Update PROJECT_ID or PROJECT_NAME in this script and run again.")
        exit(1)
    
    print(f"Workspace ID: {WORKSPACE_ID}")
    if PROJECT_ID:
        print(f"Project ID: {PROJECT_ID}")
    else:
        print(f"Project Name: {PROJECT_NAME}")
    print(f"Epics to create: {len(EPIC_TITLES)}")
    for i, title in enumerate(EPIC_TITLES, 1):
        print(f"  {i}. {title}")
    print()
    print("Starting creation process...")
    print()
    
    try:
        result = create_zenhub_entities(
            workspace_id=WORKSPACE_ID,
            project_id=PROJECT_ID,
            project_name=PROJECT_NAME,
            epic_titles=EPIC_TITLES
        )
        
        if result["success"]:
            print("=" * 80)
            print("✅ SUCCESS!")
            print("=" * 80)
            print()
            print(f"📄 Results saved to: {result['output_file']}")
            print()
            print("Created Entities:")
            print(f"  • Workspace ID: {result['results']['workspace']['id']}")
            print(f"  • Workspace Name: {result['results']['workspace'].get('name', 'N/A')}")
            print(f"  • Project ID: {result['results']['project']['id']}")
            print(f"  • Project Name: {result['results']['project'].get('name', 'N/A')}")
            print(f"  • Epics Created: {len(result['results']['epics'])}")
            print()
            if result['results']['epics']:
                print("Epic Details:")
                for i, epic in enumerate(result['results']['epics'], 1):
                    epic_data = epic.get('epic', {})
                    print(f"  {i}. {epic_data.get('title', 'N/A')}")
                    print(f"     ID: {epic_data.get('id', 'N/A')}")
                    print(f"     Number: {epic_data.get('number', 'N/A')}")
            print()
            print("Check the markdown file for complete details and IDs.")
        else:
            print("=" * 80)
            print("❌ ERROR!")
            print("=" * 80)
            print(f"Error: {result.get('error', 'Unknown error')}")
            print()
            print("Please check:")
            print("  1. Zenhub Settings is configured with a valid API token")
            print("  2. The workspace has at least one GitHub repository connected")
            print("  3. The workspace_id and project_id/name are correct")
            print("  4. Your Zenhub account has permissions to create issues")
            
    except Exception as e:
        print("=" * 80)
        print("❌ EXCEPTION OCCURRED!")
        print("=" * 80)
        print(f"Error: {str(e)}")
        import traceback
        traceback.print_exc()

