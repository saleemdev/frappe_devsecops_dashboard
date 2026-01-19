"""
Verify that PROJ-0015 was created with ZenHub IDs
"""

import frappe


def verify_project_creation(project_name: str = "PROJ-0016"):
    """Verify the project was updated with ZenHub IDs"""

    print("\n" + "=" * 80)
    print(f"VERIFYING PROJECT CREATION: {project_name}")
    print("=" * 80)

    try:
        project = frappe.get_doc("Project", project_name)

        print(f"\n✅ Project found: {project.name}")
        print(f"   Project Name: {project.project_name}")
        print(f"   Status: {project.status}")
        print(f"   Software Product: {project.get('custom_software_product')}")
        print(f"\n   ZenHub Integration:")
        print(f"   - Workspace ID: {project.get('custom_zenhub_workspace_id')}")
        print(f"   - ZenHub Project ID: {project.get('custom_zenhub_project_id')}")

        if project.get('custom_zenhub_workspace_id'):
            print(f"\n✅ Workspace ID was populated (before_save hook worked)")
        else:
            print(f"\n❌ Workspace ID NOT populated")

        if project.get('custom_zenhub_project_id'):
            print(f"✅ ZenHub Project ID was populated (async job worked)")
        else:
            print(f"❌ ZenHub Project ID NOT populated (async job may have failed)")

    except Exception as e:
        print(f"❌ Error: {str(e)}")

    print("\n" + "=" * 80)


if __name__ == "__main__":
    verify_project_creation()
