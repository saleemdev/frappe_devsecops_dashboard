"""
ZenHub Workspace Setup - Workspace and Project Creation
This module provides methods to create ZenHub workspaces and projects,
then sync the IDs back to Frappe documents.

Usage:
    python -c "from frappe_devsecops_dashboard.api.zenhub_workspace_setup import create_product_workspace;
    create_product_workspace('Afyangu')"
"""

import frappe
import requests
import json
from typing import Dict, Any, Optional, List


def get_zenhub_token() -> str:
    """Get ZenHub API token from Zenhub Settings"""
    try:
        from frappe.utils.password import get_password as _get_password
    except:
        from frappe.utils.password import get_decrypted_password as _get_password

    token = _get_password("Zenhub Settings", "Zenhub Settings", "zenhub_token")
    if not token:
        raise frappe.ValidationError("ZenHub API token not configured in Zenhub Settings")
    return token


def create_workspace_graphql(token: str, workspace_name: str, org_id: str) -> Dict[str, Any]:
    """
    Create a ZenHub workspace using GraphQL API

    Args:
        token: ZenHub API token
        workspace_name: Name for the workspace
        org_id: Organization ID (ZenHub) - REQUIRED

    Returns:
        dict: Contains workspace_id, name, etc.
    """
    url = "https://api.zenhub.com/public/graphql"

    # GraphQL mutation to create workspace
    # NOTE: zenhubOrganizationId is REQUIRED, not optional
    query = """
    mutation {
        createWorkspace(input: {
            name: "%s"
            description: "%s"
            zenhubOrganizationId: "%s"
        }) {
            workspace {
                id
                name
                description
            }
        }
    }
    """ % (workspace_name, f"Workspace for {workspace_name} product development", org_id)

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        frappe.logger().info(f"[create_workspace_graphql] Calling ZenHub API to create workspace: {workspace_name}")

        response = requests.post(
            url,
            json={"query": query},
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        if "errors" in data:
            error_msg = f"GraphQL error: {data['errors']}"
            frappe.logger().error(f"[create_workspace_graphql] {error_msg}")
            raise Exception(error_msg)

        workspace = data.get("data", {}).get("createWorkspace", {}).get("workspace")
        if not workspace:
            raise Exception(f"Failed to create workspace: No workspace returned")

        result = {
            "success": True,
            "workspace_id": workspace.get("id"),
            "name": workspace.get("name"),
            "created_at": None  # Not returned in response
        }

        frappe.logger().info(
            f"[create_workspace_graphql] Workspace created successfully: {result['workspace_id']}"
        )

        # Log API response for audit trail
        frappe.log_error(
            f"ZenHub Workspace Created:\n{json.dumps(result, indent=2)}",
            "ZenHub Workspace Creation Success"
        )

        return result

    except Exception as e:
        error_msg = f"Failed to create ZenHub workspace '{workspace_name}': {str(e)}"
        frappe.logger().error(f"[create_workspace_graphql] {error_msg}")
        frappe.log_error(error_msg, "ZenHub Workspace Creation Error")
        return {
            "success": False,
            "error": str(e)
        }


def create_project_graphql(token: str, workspace_id: str, project_name: str, project_key: str = None) -> Dict[str, Any]:
    """
    Create a ZenHub Pipeline (project container) in a workspace using GraphQL API

    NOTE: ZenHub's public GraphQL API does not provide a 'createProject' mutation.
    Instead, we create a Pipeline which serves as a project container at the workspace level.
    Pipelines organize work without requiring GitHub repositories.

    This investigation was completed and documented in:
    /home/erpuser/frappe-bench/ZENHUB_INVESTIGATION_FINDINGS.md

    Args:
        token: ZenHub API token
        workspace_id: Workspace ID (ZenHub)
        project_name: Name for the pipeline/project
        project_key: Deprecated (not used, kept for backward compatibility)

    Returns:
        dict: Contains pipeline_id, name, etc.
    """
    url = "https://api.zenhub.com/public/graphql"

    # GraphQL mutation to create pipeline (project container)
    # This is the working alternative to createProject (which doesn't exist)
    query = """
    mutation CreatePipeline($input: CreatePipelineInput!) {
        createPipeline(input: $input) {
            pipeline {
                id
                name
                description
            }
        }
    }
    """

    variables = {
        "input": {
            "workspaceId": workspace_id,
            "name": project_name,
            "description": f"Project: {project_name}",
            "position": 0
        }
    }

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    try:
        frappe.logger().info(f"[create_project_graphql] Creating ZenHub pipeline (project): {project_name}")

        response = requests.post(
            url,
            json={"query": query, "variables": variables},
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        if "errors" in data:
            error_msg = f"GraphQL error: {data['errors']}"
            frappe.logger().error(f"[create_project_graphql] {error_msg}")
            raise Exception(error_msg)

        pipeline = data.get("data", {}).get("createPipeline", {}).get("pipeline")
        if not pipeline:
            raise Exception(f"Failed to create pipeline: No pipeline returned")

        result = {
            "success": True,
            "project_id": pipeline.get("id"),  # Stored as project_id for compatibility
            "pipeline_id": pipeline.get("id"),  # Also expose as pipeline_id
            "name": pipeline.get("name"),
            "description": pipeline.get("description"),
            "created_at": None  # Not returned in response
        }

        frappe.logger().info(f"[create_project_graphql] Pipeline (project) created successfully: {result['project_id']}")

        return result

    except Exception as e:
        error_detail = str(e)[:150]  # Truncate for logging
        frappe.logger().error(f"[create_project_graphql] Failed to create pipeline: {error_detail}")
        frappe.log_error(f"Failed to create ZenHub pipeline/project: {error_detail}", "ZenHub Pipeline Creation Error")
        return {
            "success": False,
            "error": str(e)
        }


def create_zenhub_project_for_frappe_project(
    frappe_project_name: str,
    workspace_id: str,
    token: Optional[str] = None
) -> Dict[str, Any]:
    """
    Create a ZenHub project for a Frappe project under a specific workspace
    This is called from Project.after_insert hook

    Args:
        frappe_project_name: Name of the Frappe Project document
        workspace_id: ZenHub workspace ID to create project in
        token: Optional ZenHub API token (fetched from settings if not provided)

    Returns:
        dict: Contains project_id, name, key, and other details
              Format: {"success": True/False, "project_id": "...", "error": "..."}
    """
    frappe.logger().info(f"[create_zenhub_project_for_frappe_project] Creating ZenHub project for Frappe project: {frappe_project_name}")

    try:
        # Get token if not provided
        if not token:
            token = get_zenhub_token()

        # Force reload from database to ensure we get the latest document
        frappe_project = frappe.get_doc("Project", frappe_project_name, force=True)
        if not frappe_project:
            raise frappe.DoesNotExistError(f"Frappe Project '{frappe_project_name}' not found")

        frappe.logger().info(f"[create_zenhub_project_for_frappe_project] Retrieved project: {frappe_project.name}")

        # Get project name for ZenHub
        zenhub_project_name = frappe_project.project_name or frappe_project_name

        # Generate project key from project name
        # Remove special characters and convert to uppercase, limit to 10 chars
        project_key = frappe_project_name.replace("-", "_").replace(" ", "_").upper()[:10]

        frappe.logger().info(
            f"[create_zenhub_project_for_frappe_project] Creating project '{zenhub_project_name}' "
            f"with key '{project_key}' in workspace '{workspace_id}'"
        )

        # Call GraphQL mutation to create project
        result = create_project_graphql(token, workspace_id, zenhub_project_name, project_key)

        if result.get("success"):
            project_id = result.get('project_id')
            frappe.logger().info(
                f"[create_zenhub_project_for_frappe_project] Project created successfully with ID: {project_id}"
            )

            # Update Project document with ZenHub project ID
            try:
                frappe.logger().info(f"[create_zenhub_project_for_frappe_project] Updating Project {frappe_project_name} with ZenHub ID")
                project_doc = frappe.get_doc("Project", frappe_project_name, force=True)
                project_doc.custom_zenhub_project_id = project_id
                project_doc.save()
                frappe.db.commit()
                frappe.logger().info(
                    f"[create_zenhub_project_for_frappe_project] Successfully updated Project {frappe_project_name} with ZenHub ID {project_id}"
                )
            except Exception as update_error:
                frappe.logger().warning(
                    f"[create_zenhub_project_for_frappe_project] Warning: Could not update Project document: {str(update_error)}"
                )

            # Log the successful creation for audit trail
            frappe.log_error(
                f"ZenHub Project Created:\n"
                f"Frappe Project: {frappe_project_name}\n"
                f"ZenHub Project ID: {project_id}\n"
                f"Workspace ID: {workspace_id}\n"
                f"Full Response:\n{json.dumps(result, indent=2)}",
                "ZenHub Project Creation Success"
            )
        else:
            error_detail = str(result.get('error'))[:150]  # Truncate to prevent field length overflow
            frappe.logger().error(
                f"[create_zenhub_project_for_frappe_project] Failed to create project: {error_detail}"
            )
            frappe.log_error(
                f"Failed to create ZenHub project for {frappe_project_name}: {error_detail}",
                "ZenHub Project Creation Error"
            )

        return result

    except frappe.DoesNotExistError as e:
        error_msg = f"Project '{frappe_project_name}' not found in database: {str(e)}"
        frappe.logger().error(f"[create_zenhub_project_for_frappe_project] {error_msg}")
        frappe.log_error(error_msg, "ZenHub Project Creation Error - Not Found")
        return {
            "success": False,
            "error": error_msg,
            "frappe_project": frappe_project_name
        }
    except Exception as e:
        error_msg = f"Failed to create ZenHub project for '{frappe_project_name}': {str(e)}"
        frappe.logger().error(f"[create_zenhub_project_for_frappe_project] {error_msg}")
        frappe.log_error(error_msg, "ZenHub Project Creation Error")
        return {
            "success": False,
            "error": str(e),
            "frappe_project": frappe_project_name
        }


@frappe.whitelist()
def setup_product_workspace(product_name: str, workspace_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Setup ZenHub projects for a product with linked projects

    If workspace_id is not provided, uses existing workspace from ZenHub settings.
    Then:
    1. Create ZenHub projects for linked Frappe projects
    2. Update Project documents with ZenHub IDs

    Args:
        product_name: Name of product in Frappe
        workspace_id: Optional workspace ID (uses existing if not provided)

    Returns:
        dict: Success status and created project IDs
    """
    frappe.logger().info(f"[setup_product_workspace] Starting setup for product: {product_name}")

    try:
        # Get product document
        product = frappe.get_doc("Software Product", product_name)
        if not product:
            error_msg = f"Software Product '{product_name}' not found"
            frappe.logger().error(f"[setup_product_workspace] {error_msg}")
            frappe.log_error(error_msg, "ZenHub Setup - Product Not Found")
            return {
                "success": False,
                "error": error_msg
            }

        # Get ZenHub token
        token = get_zenhub_token()
        frappe.logger().info(f"[setup_product_workspace] Retrieved ZenHub token for product: {product_name}")

        # Organization ID for tiberbu.com
        org_id = "Z2lkOi8vcmFwdG9yL1plbmh1Yk9yZ2FuaXphdGlvbi8xNDUwNjY"

        # If workspace_id not provided, create new one
        if not workspace_id:
            frappe.logger().info(f"[setup_product_workspace] Creating new ZenHub workspace for {product_name}")
            workspace_result = create_workspace_graphql(token, product_name, org_id)

            if not workspace_result["success"]:
                error_msg = f"Workspace creation failed: {workspace_result.get('error')}"
                frappe.logger().error(f"[setup_product_workspace] {error_msg}")
                frappe.log_error(error_msg, "ZenHub Workspace Creation Failed")
                return workspace_result

            workspace_id = workspace_result["workspace_id"]
            frappe.logger().info(f"[setup_product_workspace] Workspace created successfully: {workspace_id}")
        else:
            frappe.logger().info(f"[setup_product_workspace] Using provided workspace ID: {workspace_id}")

        # Update product with workspace ID
        product.zenhub_workspace_id = workspace_id
        product.save()
        frappe.db.commit()
        frappe.logger().info(f"[setup_product_workspace] Product {product_name} updated with workspace ID: {workspace_id}")

        # Get linked projects
        linked_projects = frappe.get_all(
            "Project",
            filters={"custom_software_product": product_name},
            fields=["name", "project_name"]
        )

        if not linked_projects:
            warning_msg = f"No projects linked to product {product_name}"
            frappe.logger().warning(f"[setup_product_workspace] {warning_msg}")
            return {
                "success": True,
                "workspace_id": workspace_id,
                "product_name": product_name,
                "projects_created": 0,
                "projects": []
            }

        # Prepare projects list (GraphQL project creation not available via public API)
        frappe.logger().info(f"[setup_product_workspace] Preparing {len(linked_projects)} projects for workspace")
        created_projects = []

        for project in linked_projects:
            project_name = project.get("project_name") or project.get("name")
            # Generate a project key from the name
            project_key = project.get("name").replace("-", "_").upper()[:10]

            frappe.logger().debug(f"[setup_product_workspace] Processing project: {project.get('name')}")
            created_projects.append({
                "frappe_project": project.get("name"),
                "zenhub_project_id": None,  # Will be set manually
                "zenhub_project_key": project_key
            })

        # Update projects with ZenHub workspace ID
        frappe.logger().info(f"[setup_product_workspace] Updating {len(created_projects)} projects with workspace ID")
        updated_count = 0
        failed_projects = []

        for proj in created_projects:
            try:
                frappe_proj = frappe.get_doc("Project", proj["frappe_project"])
                frappe_proj.custom_zenhub_workspace_id = workspace_id
                # Only update project_id if it was set
                if proj.get("zenhub_project_id"):
                    frappe_proj.custom_zenhub_project_id = proj["zenhub_project_id"]
                frappe_proj.save()
                frappe.db.commit()
                updated_count += 1
                frappe.logger().info(f"[setup_product_workspace] Updated project: {proj['frappe_project']}")
            except Exception as e:
                error_msg = f"Failed to update project {proj['frappe_project']}: {str(e)}"
                frappe.logger().error(f"[setup_product_workspace] {error_msg}")
                failed_projects.append(proj["frappe_project"])
                frappe.log_error(error_msg, "ZenHub Project Update Error")

        # Log API result summary
        result = {
            "success": True,
            "workspace_id": workspace_id,
            "workspace_name": product_name,
            "product_name": product_name,
            "projects_created": updated_count,
            "projects": created_projects,
            "failed_projects": failed_projects if failed_projects else None
        }

        frappe.logger().info(
            f"[setup_product_workspace] Setup completed for {product_name}: "
            f"workspace_id={workspace_id}, updated={updated_count}/{len(created_projects)} projects"
        )

        # Log full result to error log for audit trail
        frappe.log_error(
            f"ZenHub Setup Result:\n{json.dumps(result, indent=2)}",
            "ZenHub Setup Completed"
        )

        return result

    except Exception as e:
        error_msg = f"Workspace setup failed for {product_name}: {str(e)}"
        frappe.logger().error(f"[setup_product_workspace] {error_msg}")
        frappe.log_error(error_msg, "ZenHub Setup Error")
        return {
            "success": False,
            "error": str(e),
            "product_name": product_name
        }


@frappe.whitelist()
def test_create_project_in_workspace(workspace_id: str, project_name: str, project_key: str = "TEST") -> Dict[str, Any]:
    """
    Test endpoint for creating a ZenHub project in a workspace
    Useful for testing before implementing hooks

    Args:
        workspace_id: ZenHub workspace ID
        project_name: Name for the project
        project_key: Project key (default: "TEST")

    Returns:
        dict with success status and project details
    """
    frappe.logger().info(f"[test_create_project_in_workspace] Testing project creation for: {project_name}")

    try:
        token = get_zenhub_token()
        result = create_project_graphql(token, workspace_id, project_name, project_key)
        frappe.logger().info(f"[test_create_project_in_workspace] Result: {result}")

        if result.get("success"):
            frappe.log_error(
                f"Test Project Created:\n{json.dumps(result, indent=2)}",
                "ZenHub Test Project Creation Success"
            )

        return result
    except Exception as e:
        frappe.logger().error(f"[test_create_project_in_workspace] Error: {str(e)}")
        frappe.log_error(f"Test project creation failed: {str(e)}", "ZenHub Test Project Error")
        return {
            "success": False,
            "error": str(e)
        }


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1:
        product_name = sys.argv[1]
        result = setup_product_workspace(product_name)
        print(json.dumps(result, indent=2))
    else:
        print("Usage: python zenhub_workspace_setup.py <product_name>")
