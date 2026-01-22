# Copyright (c) 2026, Frappe and contributors
# License: MIT

"""
Task DocType Extension - ZenHub Integration
Creates a Zenhub Issue of type Epic when a Task is saved
"""

import frappe
import requests
import time
from typing import Optional
from frappe_devsecops_dashboard.api.zenhub_graphql_logger import execute_graphql_query_with_logging


def create_zenhub_epic_issue(
    task_id: str,
    task_name: str,
    parent_issue_id: str,
    repository_id: str
) -> Optional[str]:
    """
    Create a Zenhub Issue of type Epic.

    In Zenhub, "Epic" is an issue type (level 1).
    Issue format: {task_id}-{task_name}

    Args:
        task_id: Frappe Task ID (name)
        task_name: Task display name (subject)
        parent_issue_id: Parent Zenhub Issue ID (the Project issue)
        repository_id: Zenhub Repository ID (required for creating issues)

    Returns:
        str: Zenhub Issue ID if successful, None otherwise
    """
    try:
        from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

        token = get_zenhub_token()
        if not token:
            frappe.logger().error(f"[create_zenhub_epic_issue] No Zenhub token found")
            return None

        url = "https://api.zenhub.com/public/graphql"

        # Zenhub Epic issue type ID (level 1)
        # This is the ID for issues of type "Epic"
        EPIC_ISSUE_TYPE_ID = "Z2lkOi8vcmFwdG9yL0lzc3VlVHlwZS8yMzY4MTI"

        # GraphQL mutation to create issue of type Epic with parent
        mutation = """
        mutation CreateEpicIssue($input: CreateIssueInput!) {
            createIssue(input: $input) {
                issue {
                    id
                    title
                    number
                }
            }
        }
        """

        issue_title = f"{task_id}-{task_name}"

        variables = {
            "input": {
                "repositoryId": repository_id,
                "title": issue_title,
                "body": f"Task created from Frappe on {frappe.utils.now()}",
                "issueTypeId": EPIC_ISSUE_TYPE_ID,
                "parentIssueId": parent_issue_id
            }
        }

        # Validate repository_id format - must be a Zenhub ID (starts with Z2lk) not a URL
        if repository_id and (repository_id.startswith("http://") or repository_id.startswith("https://")):
            frappe.logger().error(f"[create_zenhub_epic_issue] Invalid repository ID format (URL): {repository_id}")
            frappe.logger().error(f"[create_zenhub_epic_issue] Repository ID must be a Zenhub ID (starts with Z2lk), not a GitHub URL")
            return None

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        frappe.logger().info(f"[create_zenhub_epic_issue] Creating Zenhub Epic issue: {issue_title}")
        frappe.logger().info(f"[create_zenhub_epic_issue] Repository ID: {repository_id}")
        frappe.logger().info(f"[create_zenhub_epic_issue] Parent Issue ID: {parent_issue_id}")
        frappe.logger().info(f"[create_zenhub_epic_issue] Issue Type ID: {EPIC_ISSUE_TYPE_ID}")

        # Use logging wrapper for API call
        data, success = execute_graphql_query_with_logging(
            query=mutation,
            variables=variables,
            reference_doctype="Task",
            reference_docname=task_id,
            operation_name="createEpicIssue",
            operation_type="Mutation",
            token=token
        )

        if not success:
            frappe.logger().error(f"[create_zenhub_epic_issue] API call failed (logged to Zenhub GraphQL API Log)")
            return None

        frappe.logger().info(f"[create_zenhub_epic_issue] Full API Response: {frappe.as_json(data, indent=2)}")

        # Check for top-level GraphQL errors
        if "errors" in data:
            error_msg = "; ".join([str(e.get("message", str(e))) for e in data["errors"]])
            frappe.logger().error(f"[create_zenhub_epic_issue] GraphQL error: {error_msg}")
            frappe.logger().error(f"[create_zenhub_epic_issue] Full errors: {frappe.as_json(data['errors'], indent=2)}")
            return None

        # Parse response - errors are at top level, not in createIssue
        create_issue_response = data.get("data", {}).get("createIssue")
        if not create_issue_response:
            frappe.logger().error(f"[create_zenhub_epic_issue] No createIssue in response data")
            frappe.logger().error(f"[create_zenhub_epic_issue] Response structure: {frappe.as_json(data, indent=2)}")
            return None

        issue = create_issue_response.get("issue")
        if not issue:
            frappe.logger().error(f"[create_zenhub_epic_issue] Failed to create issue: No issue returned from API")
            frappe.logger().error(f"[create_zenhub_epic_issue] createIssue response: {frappe.as_json(create_issue_response, indent=2)}")
            return None

        issue_id = issue.get("id")
        if not issue_id:
            frappe.logger().error(f"[create_zenhub_epic_issue] Issue created but no ID returned")
            frappe.logger().error(f"[create_zenhub_epic_issue] Issue object: {frappe.as_json(issue, indent=2)}")
            return None

        # CRITICAL VALIDATION: Ensure this is actually an Issue ID, not a Pipeline ID
        try:
            import base64
            decoded = base64.b64decode(issue_id + '==').decode('utf-8')
            if 'Pipeline' in decoded:
                frappe.logger().error(f"[create_zenhub_epic_issue] ❌ CRITICAL: API returned a Pipeline ID instead of an Issue ID!")
                frappe.logger().error(f"[create_zenhub_epic_issue] Decoded ID: {decoded}")
                return None
            elif 'Issue' not in decoded:
                frappe.logger().warning(f"[create_zenhub_epic_issue] Warning: ID doesn't appear to be an Issue ID: {decoded}")
        except Exception as decode_error:
            frappe.logger().warning(f"[create_zenhub_epic_issue] Could not validate ID format: {str(decode_error)}")

        frappe.logger().info(f"[create_zenhub_epic_issue] ✅ Created Zenhub Epic issue ID: {issue_id}")
        frappe.logger().info(f"[create_zenhub_epic_issue] Issue details: {frappe.as_json(issue, indent=2)}")
        
        # Verify the issue actually exists
        try:
            from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token
            token = get_zenhub_token()
            if token:
                url = "https://api.zenhub.com/public/graphql"
                query = """
                query VerifyIssue($issueId: ID!) {
                  node(id: $issueId) {
                    ... on Issue {
                      id
                      title
                      number
                    }
                  }
                }
                """
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                response = requests.post(
                    url,
                    json={"query": query, "variables": {"issueId": issue_id}},
                    headers=headers,
                    timeout=10
                )
                data = response.json()
                if data.get("data", {}).get("node"):
                    verified_issue = data["data"]["node"]
                    issue_number = verified_issue.get("number")
                    frappe.logger().info(f"[create_zenhub_epic_issue] ✅ Verified Epic issue exists: #{issue_number} - {verified_issue.get('title')}")
                else:
                    frappe.logger().error(f"[create_zenhub_epic_issue] ❌ Epic issue does NOT exist in Zenhub: {issue_id}")
        except Exception as verify_error:
            frappe.logger().warning(f"[create_zenhub_epic_issue] Could not verify issue existence: {str(verify_error)}")
        
        return issue_id

    except Exception as e:
        frappe.logger().error(f"[create_zenhub_epic_issue] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[create_zenhub_epic_issue] Traceback: {traceback.format_exc()}")
        return None


def create_zenhub_epic_issue_async(task_id: str, task_name: str, project_id: str):
    """
    Async job to create Zenhub Epic issue.

    Args:
        task_id: Frappe Task ID
        task_name: Task subject
        project_id: Frappe Project ID (to get the parent Zenhub Project ID)
    """
    try:
        from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

        token = get_zenhub_token()
        if not token:
            frappe.logger().error(f"[create_zenhub_epic_issue_async] No Zenhub token found for task {task_id}")
            return

        # Get the parent Project's Zenhub Project ID
        project = frappe.get_doc("Project", project_id)
        parent_issue_id = project.get("custom_zenhub_project_id")

        if not parent_issue_id:
            frappe.logger().warning(f"[create_zenhub_epic_issue_async] Project {project_id} has no Zenhub Project ID")
            return

        # Get workspace from project to find repository
        workspace_id = project.get("custom_zenhub_workspace_id")
        if not workspace_id:
            frappe.logger().warning(f"[create_zenhub_epic_issue_async] Project {project_id} has no Zenhub Workspace ID")
            return

        from frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.project_extension.project_extension import get_workspace_repository

        repository_id = get_workspace_repository(workspace_id)
        if not repository_id:
            frappe.logger().warning(f"[create_zenhub_epic_issue_async] No repository found in workspace {workspace_id}")
            return

        # Create the Epic issue
        zenhub_issue_id = create_zenhub_epic_issue(task_id, task_name, parent_issue_id, repository_id)

        if zenhub_issue_id:
            # Update the task with the Epic ID
            frappe.db.set_value("Task", task_id, "custom_zenhub_epic_id", zenhub_issue_id)
            frappe.db.commit()  # Explicit commit to ensure persistence

            # Small delay to ensure database state is consistent
            import time
            time.sleep(0.5)

            # Verify it was actually saved with direct SQL query
            result = frappe.db.sql(
                "SELECT `custom_zenhub_epic_id` FROM `tabTask` WHERE `name` = %s",
                (task_id,),
                as_dict=True
            )
            saved_value = result[0]['custom_zenhub_epic_id'] if result else None
            frappe.logger().info(f"[create_zenhub_epic_issue_async] VERIFICATION: Database now has custom_zenhub_epic_id = {saved_value}")

            # Log result to the linked Project document
            try:
                project_doc = frappe.get_doc("Project", project_id)
                project_doc.add_comment(
                    comment_type="Comment",
                    text=f"<b>Zenhub Integration - Task Epic Created:</b><br>✅ Task <b>{task_id}</b> Epic successfully created<br><b>Task Epic ID:</b> {zenhub_issue_id}<br><b>Issue Type:</b> Epic (Level 1)<br><b>Saved Value in DB:</b> {saved_value}"
                )
                frappe.logger().info(f"[create_zenhub_epic_issue_async] Added comment to Project {project_id} documenting Epic creation")
            except Exception as e:
                frappe.logger().warning(f"[create_zenhub_epic_issue_async] Could not add comment to Project {project_id}: {str(e)}")

            # Also log result to the Task document
            try:
                task_doc = frappe.get_doc("Task", task_id)
                task_doc.add_comment(
                    comment_type="Comment",
                    text=f"<b>Zenhub Integration:</b><br>✅ Successfully created Zenhub Epic issue<br><b>Epic ID:</b> {zenhub_issue_id}<br><b>Saved Value in DB:</b> {saved_value}"
                )
                frappe.logger().info(f"[create_zenhub_epic_issue_async] Added comment to Task {task_id} documenting Epic creation")
            except Exception as e:
                frappe.logger().warning(f"[create_zenhub_epic_issue_async] Could not add comment to Task {task_id}: {str(e)}")

            frappe.logger().info(f"[create_zenhub_epic_issue_async] ✅ Successfully created and saved Zenhub Epic issue: {zenhub_issue_id}")
        else:
            frappe.logger().warning(f"[create_zenhub_epic_issue_async] Failed to create Zenhub Epic issue for {task_id}")

            # Log failure to the Task document
            try:
                task_doc = frappe.get_doc("Task", task_id)
                task_doc.add_comment(
                    comment_type="Comment",
                    text="<b>Zenhub Integration:</b><br>❌ Failed to create Zenhub Epic issue - API returned no ID"
                )
            except Exception as e:
                frappe.logger().warning(f"[create_zenhub_epic_issue_async] Could not add failure comment to Task {task_id}: {str(e)}")

    except Exception as e:
        frappe.logger().error(f"[create_zenhub_epic_issue_async] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[create_zenhub_epic_issue_async] Traceback: {traceback.format_exc()}")


@frappe.whitelist()
def generate_zenhub_epic_id(task_id: str) -> dict:
    """
    API endpoint to manually generate Zenhub Epic ID for a Task.
    Creates a Zenhub Issue of type Epic with parent being the linked Project's Zenhub Project ID.

    Args:
        task_id: Frappe Task ID (name)

    Returns:
        dict: API response with success status, issue ID, and error details
    """
    try:
        # Validate task exists and user has permission
        task_doc = frappe.get_doc("Task", task_id)
        
        if not task_doc.has_permission('write'):
            return {
                "success": False,
                "error": f"You do not have permission to modify task '{task_id}'",
                "error_type": "permission_error"
            }

        # Check if epic ID already exists
        existing_epic_id = task_doc.get("custom_zenhub_epic_id")
        if existing_epic_id:
            return {
                "success": False,
                "error": f"Zenhub Epic ID already exists: {existing_epic_id}",
                "error_type": "validation_error",
                "existing_id": existing_epic_id
            }

        # Get project ID
        project_id = task_doc.get("project")
        if not project_id:
            return {
                "success": False,
                "error": "Task must be linked to a Project to create a Zenhub Epic.",
                "error_type": "validation_error"
            }

        # Get project and check for Zenhub IDs
        project_doc = frappe.get_doc("Project", project_id)
        parent_project_id = project_doc.get("custom_zenhub_project_id")
        workspace_id = project_doc.get("custom_zenhub_workspace_id")
        
        if not workspace_id:
            return {
                "success": False,
                "error": f"Project '{project_id}' does not have a Zenhub Workspace ID. Please configure it first.",
                "error_type": "validation_error"
            }
        
        if not parent_project_id:
            return {
                "success": False,
                "error": f"Project '{project_id}' does not have a Zenhub Project ID. Please generate it first using the 'Generate Zenhub Project ID' button on the Project.",
                "error_type": "validation_error"
            }

        # Get repository from workspace (using same logic as Project)
        from frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.project_extension.project_extension import get_workspace_repository
        
        repository_id = get_workspace_repository(workspace_id)
        if not repository_id:
            # Check if default repository is configured
            default_repo_configured = False
            try:
                if frappe.db.exists("Zenhub Settings", "Zenhub Settings"):
                    settings = frappe.get_doc("Zenhub Settings", "Zenhub Settings")
                    default_repo_configured = bool(getattr(settings, 'default_repository_id', None))
            except:
                pass
            
            error_msg = f"No repositories found in workspace {workspace_id}."
            if default_repo_configured:
                error_msg += " Default repository is configured but not accessible. Please verify the repository ID in Zenhub Settings."
            else:
                error_msg += " Please configure a default repository ID in Zenhub Settings or ensure the workspace has repositories."
            
            return {
                "success": False,
                "error": error_msg,
                "error_type": "api_error",
                "suggestion": "Configure a default repository ID in Zenhub Settings"
            }

        # Get task display name
        task_name = task_doc.subject or task_doc.name

        # Create the Zenhub Epic issue
        frappe.logger().info(f"[generate_zenhub_epic_id] Creating Zenhub Epic issue for Task {task_id}")
        
        zenhub_epic_id = create_zenhub_epic_issue(
            task_id,
            task_name,
            parent_project_id,
            repository_id
        )

        if zenhub_epic_id:
            # Save the ID to the task
            frappe.db.set_value("Task", task_id, "custom_zenhub_epic_id", zenhub_epic_id)
            frappe.db.commit()

            # Add comment to task
            task_doc.add_comment(
                comment_type="Comment",
                text=f"<b>Zenhub Integration - Manual Generation:</b><br>✅ Successfully created Zenhub Epic Issue<br><b>Epic ID:</b> {zenhub_epic_id}"
            )

            # Get issue number for display
            issue_number = None
            try:
                from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token
                token = get_zenhub_token()
                url = "https://api.zenhub.com/public/graphql"
                query = """
                query GetIssue($issueId: ID!) {
                  node(id: $issueId) {
                    ... on Issue {
                      id
                      title
                      number
                    }
                  }
                }
                """
                headers = {
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                }
                response = requests.post(url, json={"query": query, "variables": {"issueId": zenhub_epic_id}}, headers=headers, timeout=10)
                data = response.json()
                if data.get("data", {}).get("node"):
                    issue_number = data["data"]["node"].get("number")
            except:
                pass
            
            message = "Zenhub Epic ID generated successfully"
            if issue_number:
                message += f"\n\n✅ Epic Issue #{issue_number} has been created in Zenhub"
                message += f"\n\n📍 WHERE TO FIND IT IN ZENHUB UI:"
                message += f"\n   Issues created via API appear in REPOSITORIES, not on boards automatically."
                message += f"\n\n   Steps to view:"
                message += f"\n   1. Go to your Zenhub workspace: https://app.zenhub.com/workspaces"
                message += f"\n   2. Click on your workspace"
                message += f"\n   3. Look for the REPOSITORY section/view (not just the board view)"
                message += f"\n   4. Click on the repository name to open repository issues"
                message += f"\n   5. Search for Issue #{issue_number} or look for: {task_name}"
                message += f"\n   6. The Epic is a child of the Project Issue (parent relationship)"
                message += f"\n\n   💡 TIP: Use Zenhub's search feature to find Issue #{issue_number} quickly"
            
            return {
                "success": True,
                "zenhub_epic_id": zenhub_epic_id,
                "zenhub_issue_number": issue_number,
                "message": message,
                "task_id": task_id,
                "project_id": project_id,
                "parent_project_id": parent_project_id,
                "repository_id": repository_id
            }
        else:
            error_msg = "Failed to create Zenhub Epic Issue. The API did not return an issue ID."
            
            # Check if repository ID was invalid
            if repository_id and (repository_id.startswith("http://") or repository_id.startswith("https://")):
                error_msg = (
                    f"Invalid repository ID format. The repository ID '{repository_id}' is a URL, not a Zenhub ID.\n\n"
                    "Zenhub Repository IDs start with 'Z2lk'. Please configure a valid repository ID in Zenhub Settings."
                )
            else:
                error_msg += "\n\nPlease check Frappe error logs for detailed API response."
            
            frappe.logger().error(f"[generate_zenhub_epic_id] API call failed. Repository ID used: {repository_id}")
            
            return {
                "success": False,
                "error": error_msg,
                "error_type": "api_error",
                "repository_id_used": repository_id[:100] if repository_id else None,
                "suggestion": "Check Frappe error logs for full API response details"
            }

    except frappe.DoesNotExistError:
        return {
            "success": False,
            "error": f"Task '{task_id}' not found",
            "error_type": "validation_error"
        }
    except frappe.PermissionError:
        return {
            "success": False,
            "error": f"You do not have permission to access task '{task_id}'",
            "error_type": "permission_error"
        }
    except Exception as e:
        frappe.logger().error(f"[generate_zenhub_epic_id] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[generate_zenhub_epic_id] Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": f"An error occurred: {str(e)}",
            "error_type": "api_error"
        }


def on_task_before_save(doc, method):
    """
    Hook called before Task document is saved.
    Creates a Zenhub Issue of type Epic (asynchronously) if:
    - Task is linked to a Project
    - Project has a Zenhub Workspace ID
    - Project has a Zenhub Project ID (parent Epic)
    - Task does not already have a Zenhub Epic ID
    
    Uses the same pattern as Project before_save hook.
    """
    try:
        project_id = doc.get("project")
        epic_id = doc.get("custom_zenhub_epic_id")

        # Only create if project is set, epic ID not set
        if project_id and not epic_id:
            # Check if project has Zenhub Project ID (required as parent)
            try:
                project_doc = frappe.get_doc("Project", project_id)
                parent_project_id = project_doc.get("custom_zenhub_project_id")
                workspace_id = project_doc.get("custom_zenhub_workspace_id")
                
                if not workspace_id:
                    frappe.logger().info(f"[on_task_before_save] Project {project_id} has no Zenhub Workspace ID, skipping Epic creation")
                    return
                
                if not parent_project_id:
                    frappe.logger().info(f"[on_task_before_save] Project {project_id} has no Zenhub Project ID (parent), skipping Epic creation")
                    return
                
                frappe.logger().info(f"[on_task_before_save] Queuing async Zenhub Epic creation for Task {doc.name} with parent Project {parent_project_id}")

                # Queue the Epic creation as an async job
                frappe.enqueue(
                    "frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.task_extension.task_extension.create_zenhub_epic_issue_async",
                    task_id=doc.name,
                    task_name=doc.subject,
                    project_id=project_id,
                    queue="default",
                    is_async=True
                )
            except frappe.DoesNotExistError:
                frappe.logger().warning(f"[on_task_before_save] Project {project_id} not found, skipping Epic creation")
            except Exception as e:
                frappe.logger().error(f"[on_task_before_save] Error checking project {project_id}: {str(e)}")

    except Exception as e:
        frappe.logger().error(f"[on_task_before_save] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[on_task_before_save] Traceback: {traceback.format_exc()}")
        # Don't block document save on error
        frappe.log_error(str(e), "Task Before Save Error")
