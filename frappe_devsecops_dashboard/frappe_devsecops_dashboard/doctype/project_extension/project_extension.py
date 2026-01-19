# Copyright (c) 2026, Frappe and contributors
# License: MIT

"""
Project DocType Extension - ZenHub Integration
Creates a Zenhub Issue of type Project when a Project is saved
"""

import frappe
import requests
from typing import Optional, Dict, Any, List
import base64


def verify_issue_exists(issue_id: str, issue_title: str, issue_type: str) -> bool:
    """
    Verify that an issue actually exists in Zenhub by querying it.
    
    Args:
        issue_id: Zenhub Issue ID
        issue_title: Issue title (for logging)
        issue_type: Type of issue (Project/Epic) for logging
        
    Returns:
        bool: True if issue exists, False otherwise
    """
    try:
        from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token
        
        token = get_zenhub_token()
        if not token:
            return False
        
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
            frappe.logger().info(f"[verify_issue_exists] ✅ Verified {issue_type} issue exists: #{issue_number} - {verified_issue.get('title')}")
            return True
        else:
            frappe.logger().error(f"[verify_issue_exists] ❌ {issue_type} issue does NOT exist in Zenhub: {issue_id}")
            frappe.logger().error(f"[verify_issue_exists] Issue title: {issue_title}")
            return False
            
    except Exception as e:
        frappe.logger().warning(f"[verify_issue_exists] Could not verify issue existence: {str(e)}")
        return False


def create_zenhub_project_issue(
    project_id: str,
    workspace_id: str,
    project_name: str,
    repository_id: str
) -> Optional[str]:
    """
    Create a Zenhub Issue of type Project.

    In Zenhub, "Project" is an issue type (level 2).
    Issue format: {project_id}-{project_name}

    Args:
        project_id: Frappe Project ID (name)
        workspace_id: Zenhub Workspace ID
        project_name: Project display name
        repository_id: Zenhub Repository ID (required for creating issues)

    Returns:
        str: Zenhub Issue ID if successful, None otherwise
    """
    try:
        from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

        token = get_zenhub_token()
        if not token:
            frappe.logger().error(f"[create_zenhub_project_issue] No Zenhub token found")
            return None

        url = "https://api.zenhub.com/public/graphql"

        # Zenhub Project issue type ID (level 2)
        # This is the ID for issues of type "Project"
        PROJECT_ISSUE_TYPE_ID = "Z2lkOi8vcmFwdG9yL0lzc3VlVHlwZS8yMzY4MTM"

        # GraphQL mutation to create issue of type Project
        # NOTE: CreateIssuePayload doesn't have an 'errors' field - errors are at top level
        mutation = """
        mutation CreateProjectIssue($input: CreateIssueInput!) {
            createIssue(input: $input) {
                issue {
                    id
                    title
                    number
                }
            }
        }
        """

        issue_title = f"{project_id}-{project_name}"

        # Validate repository_id format - must be a Zenhub ID (starts with Z2lk) not a URL
        if repository_id and (repository_id.startswith("http://") or repository_id.startswith("https://")):
            frappe.logger().error(f"[create_zenhub_project_issue] Invalid repository ID format (URL): {repository_id}")
            frappe.logger().error(f"[create_zenhub_project_issue] Repository ID must be a Zenhub ID (starts with Z2lk), not a GitHub URL")
            return None

        variables = {
            "input": {
                "repositoryId": repository_id,
                "title": issue_title,
                "body": f"Project created from Frappe on {frappe.utils.now()}",
                "issueTypeId": PROJECT_ISSUE_TYPE_ID
            }
        }

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        frappe.logger().info(f"[create_zenhub_project_issue] Creating Zenhub Project issue: {issue_title}")
        frappe.logger().info(f"[create_zenhub_project_issue] Repository ID: {repository_id}")
        frappe.logger().info(f"[create_zenhub_project_issue] Issue Type ID: {PROJECT_ISSUE_TYPE_ID}")

        response = requests.post(
            url,
            json={"query": mutation, "variables": variables},
            headers=headers,
            timeout=30
        )
        
        # Log response details
        frappe.logger().info(f"[create_zenhub_project_issue] HTTP Status: {response.status_code}")
        
        try:
            data = response.json()
        except Exception as json_error:
            frappe.logger().error(f"[create_zenhub_project_issue] Failed to parse JSON response: {str(json_error)}")
            frappe.logger().error(f"[create_zenhub_project_issue] Raw response: {response.text[:500]}")
            return None

        frappe.logger().info(f"[create_zenhub_project_issue] Full API Response: {frappe.as_json(data, indent=2)}")

        # Check for top-level GraphQL errors
        if "errors" in data:
            error_msg = "; ".join([str(e.get("message", str(e))) for e in data["errors"]])
            frappe.logger().error(f"[create_zenhub_project_issue] GraphQL error: {error_msg}")
            frappe.logger().error(f"[create_zenhub_project_issue] Full errors: {frappe.as_json(data['errors'], indent=2)}")
            return None

        # Parse response - errors are at top level, not in createIssue
        create_issue_response = data.get("data", {}).get("createIssue")
        if not create_issue_response:
            frappe.logger().error(f"[create_zenhub_project_issue] No createIssue in response data")
            frappe.logger().error(f"[create_zenhub_project_issue] Response structure: {frappe.as_json(data, indent=2)}")
            return None

        issue = create_issue_response.get("issue")
        if not issue:
            frappe.logger().error(f"[create_zenhub_project_issue] Failed to create issue: No issue returned from API")
            frappe.logger().error(f"[create_zenhub_project_issue] createIssue response: {frappe.as_json(create_issue_response, indent=2)}")
            return None

        issue_id = issue.get("id")
        if not issue_id:
            frappe.logger().error(f"[create_zenhub_project_issue] Issue created but no ID returned")
            frappe.logger().error(f"[create_zenhub_project_issue] Issue object: {frappe.as_json(issue, indent=2)}")
            return None

        # CRITICAL VALIDATION: Ensure this is actually an Issue ID, not a Pipeline ID
        # Issue IDs should contain "Issue" when decoded, Pipeline IDs contain "Pipeline"
        try:
            decoded = base64.b64decode(issue_id + '==').decode('utf-8')
            if 'Pipeline' in decoded:
                frappe.logger().error(f"[create_zenhub_project_issue] ❌ CRITICAL: API returned a Pipeline ID instead of an Issue ID!")
                frappe.logger().error(f"[create_zenhub_project_issue] Decoded ID: {decoded}")
                frappe.logger().error(f"[create_zenhub_project_issue] This should NOT happen with createIssue mutation")
                return None
            elif 'Issue' not in decoded:
                frappe.logger().warning(f"[create_zenhub_project_issue] Warning: ID doesn't appear to be an Issue ID: {decoded}")
        except Exception as decode_error:
            frappe.logger().warning(f"[create_zenhub_project_issue] Could not validate ID format: {str(decode_error)}")

        frappe.logger().info(f"[create_zenhub_project_issue] ✅ Created Zenhub Project issue ID: {issue_id}")
        frappe.logger().info(f"[create_zenhub_project_issue] Issue details: {frappe.as_json(issue, indent=2)}")
        
        # Verify the issue actually exists and can be queried
        verify_issue_exists(issue_id, issue.get("title", "Unknown"), "Project")
        
        return issue_id

    except Exception as e:
        frappe.logger().error(f"[create_zenhub_project_issue] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[create_zenhub_project_issue] Traceback: {traceback.format_exc()}")
        return None


@frappe.whitelist()
def get_workspace_repositories(workspace_id: str) -> Dict[str, Any]:
    """
    API endpoint to list all repositories in a Zenhub workspace.
    Uses Zenhub GraphQL API with repositoriesConnection.
    
    Args:
        workspace_id: Zenhub Workspace ID
        
    Returns:
        dict: List of repositories with their IDs and names
    """
    try:
        from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token
        
        token = get_zenhub_token()
        if not token:
            return {
                "success": False,
                "error": "Zenhub token not configured",
                "error_type": "configuration_error"
            }
        
        url = "https://api.zenhub.com/public/graphql"
        
        # GraphQL query to get repositories from workspace
        query = """
        query GetWorkspaceRepositories($workspaceId: ID!) {
          workspace(id: $workspaceId) {
            id
            name
            repositoriesConnection {
              nodes {
                id
                name
                ghId
              }
            }
            zenhubRepository {
              id
              name
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
            json={"query": query, "variables": {"workspaceId": workspace_id}},
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()
        
        if "errors" in data:
            error_msg = "; ".join([str(e.get("message", str(e))) for e in data["errors"]])
            return {
                "success": False,
                "error": f"GraphQL error: {error_msg}",
                "error_type": "api_error"
            }
        
        workspace = data.get("data", {}).get("workspace", {})
        repositories = []
        
        # Get Zenhub-only repository FIRST (best for creating Zenhub issues)
        zenhub_repo = workspace.get("zenhubRepository")
        if zenhub_repo and zenhub_repo.get("id"):
            repositories.append({
                "id": zenhub_repo.get("id"),
                "name": zenhub_repo.get("name", "Zenhub Repository"),
                "type": "zenhub",
                "preferred": True  # Mark as preferred for creating issues
            })
        
        # Get regular GitHub repositories
        repos_connection = workspace.get("repositoriesConnection", {}).get("nodes", [])
        for repo in repos_connection:
            repositories.append({
                "id": repo.get("id"),
                "name": repo.get("name", "Unknown"),
                "gh_id": repo.get("ghId"),
                "type": "github",
                "preferred": False
            })
        
        # Identify which repository will be used by default (for display purposes)
        default_repository = None
        if repositories:
            # Prefer zenhubRepository (marked as preferred)
            preferred = next((r for r in repositories if r.get("preferred")), None)
            default_repository = preferred if preferred else repositories[0]
        
        return {
            "success": True,
            "repositories": repositories,
            "count": len(repositories),
            "workspace_name": workspace.get("name", "Unknown"),
            "default_repository": default_repository  # Which one will be used automatically
        }
            
    except Exception as e:
        frappe.logger().error(f"[get_workspace_repositories] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[get_workspace_repositories] Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": f"An error occurred: {str(e)}",
            "error_type": "api_error"
        }


def get_workspace_repository(workspace_id: str) -> Optional[str]:
    """
    Get a repository ID from a workspace using the following priority order:
    
    1. From existing issues in workspace (if any exist)
    2. zenhubRepository (Zenhub-only repository - BEST for creating Zenhub issues)
    3. First GitHub repository from repositoriesConnection
    4. Default repository from Zenhub Settings
    
    Args:
        workspace_id: Zenhub Workspace ID

    Returns:
        str: Repository ID if found, None otherwise
    """
    try:
        from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token

        token = get_zenhub_token()
        if not token:
            return None

        url = "https://api.zenhub.com/public/graphql"

        query = """
        query GetWorkspaceRepository($workspaceId: ID!) {
            workspace(id: $workspaceId) {
                issues(first: 1) {
                    nodes {
                        repository {
                            id
                            name
                        }
                    }
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
            json={"query": query, "variables": {"workspaceId": workspace_id}},
            headers=headers,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        frappe.logger().info(f"[get_workspace_repository] API Response: {data}")

        if "errors" in data:
            error_msg = "; ".join([str(e.get("message", str(e))) for e in data["errors"]])
            frappe.logger().error(f"[get_workspace_repository] GraphQL error: {error_msg}")
            # Fall through to check default repository

        issues = data.get("data", {}).get("workspace", {}).get("issues", {}).get("nodes", [])
        if issues and issues[0].get("repository"):
            repo = issues[0].get("repository", {})
            repo_id = repo.get("id")
            repo_name = repo.get("name", "Unknown")
            
            # Validate repository ID is a proper Zenhub ID (not a URL)
            if repo_id and not (repo_id.startswith("http://") or repo_id.startswith("https://")):
                frappe.logger().info(f"[get_workspace_repository] ✅ Found repository from workspace issues: {repo_name} (ID: {repo_id[:20]}...)")
                return repo_id
            else:
                frappe.logger().warning(f"[get_workspace_repository] Repository ID is a URL, not a Zenhub ID: {repo_id}")
                # Continue to fallback

        # Fallback 1: Use GraphQL to get repositories directly from workspace
        frappe.logger().info(f"[get_workspace_repository] No issues found in workspace, querying repositories directly...")
        try:
            from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token
            
            token = get_zenhub_token()
            if token:
                url = "https://api.zenhub.com/public/graphql"
                query = """
                query GetWorkspaceRepos($workspaceId: ID!) {
                  workspace(id: $workspaceId) {
                    repositoriesConnection {
                      nodes {
                        id
                        name
                      }
                    }
                    zenhubRepository {
                      id
                      name
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
                    json={"query": query, "variables": {"workspaceId": workspace_id}},
                    headers=headers,
                    timeout=30
                )
                response.raise_for_status()
                data = response.json()
                
                if "errors" not in data:
                    workspace = data.get("data", {}).get("workspace", {})
                    
                    # PRIORITY 1: Use zenhubRepository (best for Zenhub issues - designed for Zenhub-only issues)
                    zenhub_repo = workspace.get("zenhubRepository")
                    if zenhub_repo and zenhub_repo.get("id"):
                        repo_id = zenhub_repo.get("id")
                        repo_name = zenhub_repo.get("name", "Zenhub Repository")
                        frappe.logger().info(f"[get_workspace_repository] ✅ Using Zenhub repository (preferred for issues): {repo_name} (ID: {repo_id[:20]}...)")
                        return repo_id
                    
                    # PRIORITY 2: Use first GitHub repository from repositoriesConnection
                    repos = workspace.get("repositoriesConnection", {}).get("nodes", [])
                    if repos and repos[0].get("id"):
                        repo_id = repos[0].get("id")
                        repo_name = repos[0].get("name", "Unknown")
                        frappe.logger().info(f"[get_workspace_repository] ✅ Using first GitHub repository: {repo_name} (ID: {repo_id[:20]}...)")
                        return repo_id
                    
                    frappe.logger().warning(f"[get_workspace_repository] No repositories found in workspace (neither zenhubRepository nor repositoriesConnection)")
        except Exception as graphql_error:
            frappe.logger().warning(f"[get_workspace_repository] Error querying repositories: {str(graphql_error)}")
        
        # Fallback 2: Check for default repository in Zenhub Settings
        frappe.logger().info(f"[get_workspace_repository] REST API failed, checking default repository...")
        try:
            if frappe.db.exists("Zenhub Settings", "Zenhub Settings"):
                settings = frappe.get_doc("Zenhub Settings", "Zenhub Settings")
                default_repo_id = getattr(settings, 'default_repository_id', None)
                if default_repo_id:
                    # Validate default repository ID is a proper Zenhub ID (not a URL)
                    if default_repo_id.startswith("http://") or default_repo_id.startswith("https://"):
                        frappe.logger().error(f"[get_workspace_repository] ❌ Default repository ID is a URL, not a Zenhub ID: {default_repo_id}")
                        frappe.logger().error(f"[get_workspace_repository] Please set a valid Zenhub Repository ID (starts with Z2lk) in Zenhub Settings")
                        return None
                    frappe.logger().info(f"[get_workspace_repository] ✅ Using default repository from Zenhub Settings: {default_repo_id[:20]}...")
                    return default_repo_id
                else:
                    frappe.logger().warning(f"[get_workspace_repository] No default repository configured in Zenhub Settings")
            else:
                frappe.logger().warning(f"[get_workspace_repository] Zenhub Settings not found")
        except Exception as settings_error:
            frappe.logger().error(f"[get_workspace_repository] Error checking Zenhub Settings: {str(settings_error)}")

        frappe.logger().warning(f"[get_workspace_repository] No repository found in workspace {workspace_id} and no default repository configured")
        return None

    except Exception as e:
        frappe.logger().error(f"[get_workspace_repository] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[get_workspace_repository] Traceback: {traceback.format_exc()}")
        return None


def create_zenhub_project_async(project_name: str, workspace_id: str):
    """
    Async job to create Zenhub Project issue.
    Uses frappe.db.set_value() to persist the ID outside the save transaction.

    Args:
        project_name: Frappe Project name/ID
        workspace_id: Zenhub Workspace ID
    """
    try:
        project_doc = frappe.get_doc("Project", project_name)

        project_doc.add_comment(
            comment_type="Comment",
            text=f"<b>Zenhub Integration - Starting:</b><br>🔄 Workspace ID: {workspace_id}"
        )

        frappe.logger().info(f"[create_zenhub_project_async] Starting async creation for {project_name}")

        # Get repository from workspace (with fallback to default)
        repository_id = get_workspace_repository(workspace_id)
        if not repository_id:
            frappe.logger().warning(f"[create_zenhub_project_async] No repository found in workspace {workspace_id}, skipping")

            # Check if default repository is configured
            default_repo_configured = False
            try:
                if frappe.db.exists("Zenhub Settings", "Zenhub Settings"):
                    settings = frappe.get_doc("Zenhub Settings", "Zenhub Settings")
                    default_repo_configured = bool(getattr(settings, 'default_repository_id', None))
            except:
                pass

            # Add comment to Project about missing repository
            error_msg = (
                f"<b>Zenhub Integration - FAILED:</b><br>"
                f"❌ No repositories found in workspace {workspace_id}<br><br>"
                f"<b>Solution:</b><br>"
            )
            if default_repo_configured:
                error_msg += "Default repository is configured but not accessible. Please verify the repository ID in Zenhub Settings."
            else:
                error_msg += (
                    "Please either:<br>"
                    "1. Create at least one issue in the Zenhub workspace, OR<br>"
                    "2. Configure a default repository ID in Zenhub Settings<br><br>"
                    "To configure: Go to Zenhub Settings → Set 'Default Repository ID' field"
                )
            
            project_doc.add_comment(
                comment_type="Comment",
                text=error_msg
            )
            return

        project_doc.add_comment(
            comment_type="Comment",
            text=f"<b>Zenhub Integration - Repository Found:</b><br>✅ Repository ID: {repository_id}"
        )

        # Get project document for display name
        project = frappe.get_doc("Project", project_name)
        project_display_name = project.project_name or project.name

        # Create the Zenhub Project issue
        project_doc.add_comment(
            comment_type="Comment",
            text=f"<b>Zenhub Integration - Creating Issue:</b><br>📝 Calling Zenhub API with display name: {project_display_name}"
        )

        zenhub_issue_id = create_zenhub_project_issue(
            project_name,
            workspace_id,
            project_display_name,
            repository_id
        )

        if zenhub_issue_id:
            frappe.logger().info(f"[create_zenhub_project_async] Got zenhub_issue_id back from API: {zenhub_issue_id}")

            project_doc.add_comment(
                comment_type="Comment",
                text=f"<b>Zenhub Integration - API Response:</b><br>✅ Issue ID: {zenhub_issue_id}"
            )

            # CRITICAL: Use frappe.db.set_value() to persist the ID directly to database
            frappe.logger().info(f"[create_zenhub_project_async] About to call frappe.db.set_value() for Project={project_name}, field=custom_zenhub_project_id, value={zenhub_issue_id}")

            frappe.db.set_value("Project", project_name, "custom_zenhub_project_id", zenhub_issue_id)
            frappe.logger().info(f"[create_zenhub_project_async] frappe.db.set_value() completed")

            frappe.db.commit()
            frappe.logger().info(f"[create_zenhub_project_async] frappe.db.commit() completed")

            # Small delay to ensure database state is consistent
            import time
            time.sleep(0.5)

            # Verify it was actually saved with direct SQL query
            result = frappe.db.sql(
                "SELECT `custom_zenhub_project_id` FROM `tabProject` WHERE `name` = %s",
                (project_name,),
                as_dict=True
            )
            frappe.logger().info(f"[create_zenhub_project_async] VERIFICATION - Direct SQL Query Result: {result}")

            saved_value = result[0]['custom_zenhub_project_id'] if result else None
            frappe.logger().info(f"[create_zenhub_project_async] VERIFICATION: Database now has custom_zenhub_project_id = {saved_value}")

            # Add comment to Project document with the result
            project_doc.add_comment(
                comment_type="Comment",
                text=f"<b>Zenhub Integration - COMPLETE:</b><br>✅ Successfully saved<br><b>Zenhub Project ID:</b> {zenhub_issue_id}<br><b>Database Value:</b> {saved_value}"
            )

            frappe.logger().info(f"[create_zenhub_project_async] ✅ Successfully created and saved Zenhub Project issue: {zenhub_issue_id}")
        else:
            frappe.logger().warning(f"[create_zenhub_project_async] zenhub_issue_id is None/empty - API call failed to return ID")

            # Add comment to Project about the failure
            project_doc.add_comment(
                comment_type="Comment",
                text="<b>Zenhub Integration - FAILED:</b><br>❌ API did not return an Issue ID"
            )

    except Exception as e:
        frappe.logger().error(f"[create_zenhub_project_async] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[create_zenhub_project_async] Traceback: {traceback.format_exc()}")

        # Add error comment to Project
        try:
            project_doc = frappe.get_doc("Project", project_name)
            project_doc.add_comment(
                comment_type="Comment",
                text=f"<b>Zenhub Integration - ERROR:</b><br>❌ {str(e)}"
            )
        except:
            pass


@frappe.whitelist()
def generate_zenhub_project_id(project_id: str) -> dict:
    """
    API endpoint to manually generate Zenhub Project ID.
    Creates a Zenhub Issue of type Project and returns the result.

    Args:
        project_id: Frappe Project ID (name)

    Returns:
        dict: API response with success status, issue ID, and full API response
    """
    try:
        # Validate project exists and user has permission
        project_doc = frappe.get_doc("Project", project_id)
        
        if not project_doc.has_permission('write'):
            return {
                "success": False,
                "error": f"You do not have permission to modify project '{project_id}'",
                "error_type": "permission_error"
            }

        # Check if project ID already exists
        existing_project_id = project_doc.get("custom_zenhub_project_id")
        if existing_project_id:
            return {
                "success": False,
                "error": f"Zenhub Project ID already exists: {existing_project_id}",
                "error_type": "validation_error",
                "existing_id": existing_project_id
            }

        # Get workspace ID
        workspace_id = project_doc.get("custom_zenhub_workspace_id")
        if not workspace_id:
            return {
                "success": False,
                "error": "Zenhub Workspace ID is not configured for this project. Please set the workspace ID first.",
                "error_type": "validation_error"
            }

        # Get repository from workspace (with fallback to default)
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
            
            # Try to get repositories via API to show what's available
            available_repos = []
            try:
                repos_result = get_workspace_repositories(workspace_id)
                if repos_result.get("success") and repos_result.get("repositories"):
                    available_repos = repos_result["repositories"]
            except:
                pass
            
            error_msg = (
                f"No repositories found in workspace {workspace_id}.\n\n"
            )
            
            if available_repos:
                preferred_repo = next((r for r in available_repos if r.get("preferred")), None)
                if preferred_repo:
                    error_msg += (
                        f"⚠️ However, we found {len(available_repos)} repository(ies) available:\n"
                        f"   - {preferred_repo.get('name')} (ID: {preferred_repo.get('id')}) - RECOMMENDED\n"
                        "   This repository should work. The system will automatically use it.\n\n"
                        "Please try again - the repository should be auto-detected now."
                    )
                else:
                    error_msg += (
                        f"⚠️ However, we found {len(available_repos)} repository(ies) available:\n"
                    )
                    for repo in available_repos[:3]:
                        error_msg += f"   - {repo.get('name')} (ID: {repo.get('id')})\n"
                    error_msg += (
                        "\nThe system will automatically use the first repository found.\n"
                        "Please try again."
                    )
            else:
                error_msg += (
                    "Please either:\n"
                    "1. Ensure your workspace has repositories connected, OR\n"
                    "2. Configure a default repository ID in Zenhub Settings\n\n"
                    "To configure a default repository:\n"
                    "- Go to Zenhub Settings: /app/zenhub-settings\n"
                    "- Set the 'Default Repository ID' field\n"
                    "- Use the get_workspace_repositories API endpoint to list available repositories"
                )
            
            return {
                "success": False,
                "error": error_msg,
                "error_type": "api_error",
                "suggestion": "Configure a default repository ID in Zenhub Settings or create an issue in the workspace first"
            }

        # Get project display name
        project_display_name = project_doc.project_name or project_doc.name

        # Create the Zenhub Project issue
        frappe.logger().info(f"[generate_zenhub_project_id] Creating Zenhub Project issue for {project_id}")
        
        zenhub_issue_id = create_zenhub_project_issue(
            project_id,
            workspace_id,
            project_display_name,
            repository_id
        )

        if zenhub_issue_id:
            # Save the ID to the project
            frappe.db.set_value("Project", project_id, "custom_zenhub_project_id", zenhub_issue_id)
            frappe.db.commit()

            # Get issue number and details for display
            issue_number = None
            issue_title = None
            try:
                from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token
                token = get_zenhub_token()
                if token:
                    url = "https://api.zenhub.com/public/graphql"
                    query = """
                    query GetIssue($issueId: ID!) {
                      node(id: $issueId) {
                        ... on Issue {
                          id
                          title
                          number
                          repository {
                            id
                            name
                          }
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
                        json={"query": query, "variables": {"issueId": zenhub_issue_id}},
                        headers=headers,
                        timeout=10
                    )
                    data = response.json()
                    if data.get("data", {}).get("node"):
                        issue_data = data["data"]["node"]
                        issue_number = issue_data.get("number")
                        issue_title = issue_data.get("title")
                        repo_name = issue_data.get("repository", {}).get("name", "Unknown")
            except Exception as e:
                frappe.logger().warning(f"[generate_zenhub_project_id] Could not get issue details: {str(e)}")

            # Add comment to project with issue number
            comment_text = f"<b>Zenhub Integration - Manual Generation:</b><br>✅ Successfully created Zenhub Project Issue<br><b>Issue ID:</b> {zenhub_issue_id}"
            if issue_number:
                comment_text += f"<br><b>Issue #:</b> {issue_number}"
                comment_text += f"<br><b>Title:</b> {issue_title or 'N/A'}"
            project_doc.add_comment(
                comment_type="Comment",
                text=comment_text
            )

            # Build success message with helpful instructions
            message = "Zenhub Project ID generated successfully"
            if issue_number:
                message += f"\n\n✅ Issue #{issue_number} has been created in Zenhub"
                message += f"\n\n📍 WHERE TO FIND IT IN ZENHUB UI:"
                message += f"\n   Issues created via API appear in REPOSITORIES, not on boards automatically."
                message += f"\n\n   Steps to view:"
                message += f"\n   1. Go to your Zenhub workspace: https://app.zenhub.com/workspaces"
                message += f"\n   2. Click on your workspace"
                message += f"\n   3. Look for the REPOSITORY section/view (not just the board view)"
                message += f"\n   4. Click on the repository name to open repository issues"
                message += f"\n   5. Search for Issue #{issue_number} or look for: {issue_title or project_display_name}"
                message += f"\n\n   💡 TIP: Use Zenhub's search feature (top bar) to find Issue #{issue_number} quickly"
                message += f"\n   💡 TIP: If you want it on a board, you may need to add it manually from the repository"

            return {
                "success": True,
                "zenhub_project_id": zenhub_issue_id,
                "zenhub_issue_number": issue_number,
                "zenhub_issue_title": issue_title,
                "message": message,
                "project_id": project_id,
                "workspace_id": workspace_id,
                "repository_id": repository_id
            }
        else:
            # Provide detailed error message
            error_msg = "Failed to create Zenhub Project Issue. The API did not return an issue ID."
            
            # Check if repository ID was invalid
            if repository_id and (repository_id.startswith("http://") or repository_id.startswith("https://")):
                error_msg = (
                    f"Invalid repository ID format. The repository ID '{repository_id}' is a URL, not a Zenhub ID.\n\n"
                    "Zenhub Repository IDs start with 'Z2lk' (e.g., Z2lkOi8vcmFwdG9yL1JlcG9zaXRvcnkv...).\n\n"
                    "To fix this:\n"
                    "1. Go to Zenhub Settings\n"
                    "2. Set 'Default Repository ID' to a valid Zenhub Repository ID (starts with Z2lk)\n"
                    "3. Get the repository ID from:\n"
                    "   - An existing issue in your workspace (check the repository field), OR\n"
                    "   - The Zenhub UI repository details page\n\n"
                    "The repository ID should look like: Z2lkOi8vcmFwdG9yL1JlcG9zaXRvcnkvNzE5NDYxOTM4"
                )
            else:
                error_msg += "\n\nPlease check Frappe error logs for detailed API response."
            
            frappe.logger().error(f"[generate_zenhub_project_id] API call failed. Repository ID used: {repository_id}")
            
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
            "error": f"Project '{project_id}' not found",
            "error_type": "validation_error"
        }
    except frappe.PermissionError:
        return {
            "success": False,
            "error": f"You do not have permission to access project '{project_id}'",
            "error_type": "permission_error"
        }
    except Exception as e:
        frappe.logger().error(f"[generate_zenhub_project_id] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[generate_zenhub_project_id] Traceback: {traceback.format_exc()}")
        return {
            "success": False,
            "error": f"An error occurred: {str(e)}",
            "error_type": "api_error"
        }


def on_project_before_save(doc, method):
    """
    Hook called before Project document is saved.
    Queues async job to create Zenhub Project issue if needed.
    Works for both NEW and EXISTING Projects (retrospective saves).

    - Zenhub Workspace ID must be provided
    - Zenhub Project ID must not be already set
    """
    try:
        print(f"[DEBUG] on_project_before_save HOOK CALLED for {doc.name}", flush=True)
        frappe.logger().info(f"[on_project_before_save] HOOK CALLED for {doc.name}")
        workspace_id = doc.get("custom_zenhub_workspace_id")
        project_id = doc.get("custom_zenhub_project_id")

        frappe.logger().info(f"[on_project_before_save] workspace_id={workspace_id}, project_id={project_id}")

        # Only queue if workspace ID is provided and project ID is not set
        if workspace_id and not project_id:
            frappe.logger().info(f"[on_project_before_save] ✅ CONDITIONS MET - Queuing async Zenhub Project creation for {doc.name}")

            # Queue the creation as a background job - non-blocking
            frappe.enqueue(
                "frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.project_extension.project_extension.create_zenhub_project_async",
                project_name=doc.name,
                workspace_id=workspace_id,
                queue="default",
                is_async=True
            )
            frappe.logger().info(f"[on_project_before_save] Job queued successfully")
        else:
            frappe.logger().info(f"[on_project_before_save] ❌ CONDITIONS NOT MET - workspace_id={workspace_id}, project_id={project_id}")

    except Exception as e:
        frappe.logger().error(f"[on_project_before_save] Error: {str(e)}")
        import traceback
        frappe.logger().error(f"[on_project_before_save] Traceback: {traceback.format_exc()}")
        # Don't block document save on error
        frappe.log_error(str(e), "Project Before Save Error")
