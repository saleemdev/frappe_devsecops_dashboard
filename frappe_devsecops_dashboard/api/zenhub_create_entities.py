"""
Zenhub Entity Creation Script

This script creates a Workspace, Project, and Epics in Zenhub using the GraphQL API.
It stores the created IDs in a markdown file for reference.

Usage:
    bench --site <site> console
    exec(open('apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/api/zenhub_create_entities.py').read())
    
    Or run directly:
    python apps/frappe_devsecops_dashboard/frappe_devsecops_dashboard/api/zenhub_create_entities.py

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import frappe
import requests
import json
from datetime import datetime
from typing import Dict, Any, Optional, List
from pathlib import Path

# Import existing Zenhub utilities
from .zenhub import get_zenhub_token, execute_graphql_query, ZENHUB_GRAPHQL_ENDPOINT


def get_or_create_workspace(workspace_name: str, workspace_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get an existing workspace or provide instructions to create one.
    
    Note: Zenhub workspaces are typically created via the UI. This function
    will fetch an existing workspace if workspace_id is provided, or return
    instructions for manual creation.
    
    Args:
        workspace_name (str): Name of the workspace
        workspace_id (str, optional): Existing workspace ID to use
        
    Returns:
        dict: Workspace data with ID
    """
    if workspace_id:
        # Fetch existing workspace
        query = """
        query GetWorkspace($workspaceId: ID!) {
          workspace(id: $workspaceId) {
            id
            name
            description
            createdAt
          }
        }
        """

        try:
            result = execute_graphql_query(
                query,
                {"workspaceId": workspace_id},
                log_to_db=True,
                reference_doctype="Software Product",
                reference_docname=workspace_id,
                operation_name="getWorkspaceById"
            )
            
            if "workspace" in result and result["workspace"]:
                workspace = result["workspace"]
                frappe.logger().info(f"✅ Found workspace: {workspace['name']} (ID: {workspace['id']})")
                return {
                    "success": True,
                    "workspace": workspace
                }
            else:
                frappe.throw(f"Workspace with ID {workspace_id} not found", frappe.ValidationError)
        except Exception as e:
            frappe.log_error(
                title="Zenhub Workspace Fetch Error",
                message=f"Failed to fetch workspace '{workspace_id}': {str(e)}"
            )
            raise
    else:
        # Return instructions for manual creation
        frappe.throw(
            "Workspace ID is required. Please create a workspace in Zenhub UI first, "
            "or provide an existing workspace_id. Workspaces cannot be created via API.",
            frappe.ValidationError
        )


def get_or_create_project(workspace_id: str, project_name: str, project_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get an existing project or create one in a Zenhub workspace.
    
    Note: Zenhub projects may need to be created via UI. This function will
    try to create via API, or fetch existing if project_id is provided.
    
    Args:
        workspace_id (str): The Zenhub workspace ID
        project_name (str): Name of the project
        project_id (str, optional): Existing project ID to use
        
    Returns:
        dict: Project data with ID
    """
    if project_id:
        # Fetch existing project
        query = """
        query GetProject($workspaceId: ID!, $projectId: ID!) {
          workspace(id: $workspaceId) {
            projects(first: 100) {
              nodes {
                id
                name
                description
              }
            }
          }
        }
        """

        try:
            result = execute_graphql_query(
                query,
                {"workspaceId": workspace_id},
                log_to_db=True,
                reference_doctype="Project",
                reference_docname=project_id,
                operation_name="getProjectById"
            )
            
            if "workspace" in result:
                projects = result["workspace"].get("projects", {}).get("nodes", [])
                project = next((p for p in projects if p["id"] == project_id), None)
                
                if project:
                    frappe.logger().info(f"✅ Found project: {project['name']} (ID: {project['id']})")
                    return {
                        "success": True,
                        "project": project
                    }
                else:
                    frappe.throw(f"Project with ID {project_id} not found in workspace", frappe.ValidationError)
            else:
                frappe.throw("Failed to fetch workspace projects", frappe.ValidationError)
        except Exception as e:
            frappe.log_error(
                title="Zenhub Project Fetch Error",
                message=f"Failed to fetch project '{project_id}': {str(e)}"
            )
            raise
    else:
        # Try to create project (may not be supported by API)
        # First, list existing projects to see if one with the same name exists
        query = """
        query ListProjects($workspaceId: ID!) {
          workspace(id: $workspaceId) {
            projects(first: 100) {
              nodes {
                id
                name
                description
              }
            }
          }
        }
        """

        try:
            result = execute_graphql_query(
                query,
                {"workspaceId": workspace_id},
                log_to_db=True,
                reference_doctype="Project",
                reference_docname=project_name,
                operation_name="listProjects"
            )
            
            if "workspace" in result:
                projects = result["workspace"].get("projects", {}).get("nodes", [])
                # Check if project with same name exists
                existing = next((p for p in projects if p["name"] == project_name), None)
                
                if existing:
                    frappe.logger().info(f"✅ Using existing project: {existing['name']} (ID: {existing['id']})")
                    return {
                        "success": True,
                        "project": existing
                    }
                else:
                    # Project doesn't exist - need to create via UI
                    frappe.throw(
                        f"Project '{project_name}' not found. Please create it in Zenhub UI first, "
                        "or provide an existing project_id. Projects may not be creatable via API.",
                        frappe.ValidationError
                    )
            else:
                frappe.throw("Failed to fetch workspace projects", frappe.ValidationError)
        except Exception as e:
            frappe.log_error(
                title="Zenhub Project Creation Error",
                message=f"Failed to get/create project '{project_name}': {str(e)}"
            )
            raise


def create_epic(workspace_id: str, project_id: str, epic_title: str, epic_description: Optional[str] = None) -> Dict[str, Any]:
    """
    Create a new epic in a Zenhub project.
    
    Note: Epics in Zenhub are typically GitHub issues with a specific type.
    This function creates an epic issue in the workspace.
    
    Args:
        workspace_id (str): The Zenhub workspace ID
        project_id (str): The Zenhub project ID
        epic_title (str): Title of the epic
        epic_description (str, optional): Description of the epic
        
    Returns:
        dict: Created epic data with ID
    """
    # First, we need to get a repository ID from the workspace
    # Epics are created as issues in a repository
    query = """
    query GetWorkspaceRepositories($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        repositoriesConnection {
          nodes {
            id
            name
          }
        }
      }
    }
    """
    
    try:
        # Get repositories in the workspace
        repo_result = execute_graphql_query(
            query,
            {"workspaceId": workspace_id},
            log_to_db=True,
            reference_doctype="Software Product",
            reference_docname=workspace_id,
            operation_name="getWorkspaceRepositories"
        )
        
        if "workspace" not in repo_result:
            frappe.throw("Failed to fetch workspace repositories", frappe.ValidationError)
        
        repositories = repo_result["workspace"].get("repositoriesConnection", {}).get("nodes", [])
        
        if not repositories:
            frappe.throw(
                "No repositories found in workspace. Please add a GitHub repository to the workspace first.",
                frappe.ValidationError
            )
        
        # Use the first repository (you can modify this logic to select a specific repo)
        repository_id = repositories[0]["id"]
        repository_name = repositories[0]["name"]
        
        frappe.logger().info(f"Using repository: {repository_name} (ID: {repository_id})")
        
        # Create epic as an issue with epic type
        mutation = """
        mutation CreateEpic($repositoryId: ID!, $title: String!, $body: String) {
          createIssue(input: {
            repositoryId: $repositoryId
            title: $title
            body: $body
            issueType: EPIC
          }) {
            issue {
              id
              number
              title
              body
              state
              type
              createdAt
            }
            errors {
              message
            }
          }
        }
        """
        
        variables = {
            "repositoryId": repository_id,
            "title": epic_title,
            "body": epic_description or f"Epic created on {datetime.now().strftime('%Y-%m-%d')}"
        }
        
        result = execute_graphql_query(
            mutation,
            variables,
            log_to_db=True,
            reference_doctype="Task",
            reference_docname=epic_title,
            operation_name="createEpicIssue"
        )

        if "createIssue" in result:
            issue_data = result["createIssue"]
            
            if issue_data.get("errors"):
                error_msg = "; ".join([err.get("message", "Unknown error") for err in issue_data["errors"]])
                frappe.throw(f"Failed to create epic: {error_msg}", frappe.ValidationError)
            
            issue = issue_data.get("issue")
            if issue:
                # Link the epic to the project
                link_mutation = """
                mutation LinkEpicToProject($issueId: ID!, $projectId: ID!) {
                  addIssueToProject(input: {
                    issueId: $issueId
                    projectId: $projectId
                  }) {
                    issue {
                      id
                    }
                    errors {
                      message
                    }
                  }
                }
                """
                
                link_variables = {
                    "issueId": issue["id"],
                    "projectId": project_id
                }

                link_result = execute_graphql_query(
                    link_mutation,
                    link_variables,
                    log_to_db=True,
                    reference_doctype="Task",
                    reference_docname=epic_title,
                    operation_name="linkEpicToProject"
                )
                
                if "addIssueToProject" in link_result:
                    link_data = link_result["addIssueToProject"]
                    if link_data.get("errors"):
                        frappe.logger().warning(
                            f"Epic created but failed to link to project: {link_data['errors']}"
                        )
                
                frappe.logger().info(f"✅ Created epic: {issue['title']} (ID: {issue['id']}, Number: {issue['number']})")
                return {
                    "success": True,
                    "epic": issue,
                    "repository": {
                        "id": repository_id,
                        "name": repository_name
                    }
                }
            else:
                frappe.throw("Epic creation returned no issue data", frappe.ValidationError)
        else:
            frappe.throw("Unexpected response format from Zenhub API", frappe.ValidationError)
            
    except Exception as e:
        frappe.log_error(
            title="Zenhub Epic Creation Error",
            message=f"Failed to create epic '{epic_title}' in project {project_id}: {str(e)}"
        )
        raise


def save_ids_to_markdown(results: Dict[str, Any], output_file: Optional[str] = None) -> str:
    """
    Save the created entity IDs to a markdown file.
    
    Args:
        results (dict): Dictionary containing created entities
        output_file (str, optional): Path to output file. If None, uses default location.
        
    Returns:
        str: Path to the created markdown file
    """
    if output_file is None:
        # Default to app directory
        app_path = Path(frappe.get_app_path("frappe_devsecops_dashboard"))
        output_file = str(app_path / "zenhub_created_entities.md")
    
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    markdown_content = f"""# Zenhub Created Entities

**Created on:** {timestamp}

This document contains the IDs of entities created in Zenhub.

---

## Workspace

"""
    
    if "workspace" in results:
        workspace = results["workspace"]
        markdown_content += f"""- **Name:** {workspace.get('name', 'N/A')}
- **ID:** `{workspace.get('id', 'N/A')}`
- **Description:** {workspace.get('description', 'N/A')}
- **Created At:** {workspace.get('createdAt', 'N/A')}

"""
    
    if "project" in results:
        project = results["project"]
        markdown_content += f"""## Project

- **Name:** {project.get('name', 'N/A')}
- **ID:** `{project.get('id', 'N/A')}`
- **Description:** {project.get('description', 'N/A')}
- **Created At:** {project.get('createdAt', 'N/A')}

"""
    
    if "epics" in results:
        markdown_content += "## Epics\n\n"
        for i, epic in enumerate(results["epics"], 1):
            epic_data = epic.get('epic', {})
            repo_data = epic.get('repository', {})
            markdown_content += f"""### Epic {i}

- **Title:** {epic_data.get('title', 'N/A')}
- **ID:** `{epic_data.get('id', 'N/A')}`
- **Number:** {epic_data.get('number', 'N/A')}
- **State:** {epic_data.get('state', 'N/A')}
- **Repository:** {repo_data.get('name', 'N/A')} (`{repo_data.get('id', 'N/A')}`)
- **Created At:** {epic_data.get('createdAt', 'N/A')}

"""
    
    markdown_content += f"""
---

## Summary

- **Workspace ID:** `{results.get('workspace', {}).get('id', 'N/A')}`
- **Project ID:** `{results.get('project', {}).get('id', 'N/A')}`
- **Total Epics Created:** {len(results.get('epics', []))}

## Usage in Frappe

To use these IDs in your Frappe projects:

1. **Workspace ID:** Set this in `Project.custom_zenhub_workspace_id`
2. **Project ID:** Store this for reference (can be used in API calls)
3. **Epic IDs:** Use these to link tasks/issues to epics

### Example: Update Project with Workspace ID

```python
import frappe

project = frappe.get_doc("Project", "YOUR-PROJECT-NAME")
project.custom_zenhub_workspace_id = "{results.get('workspace', {}).get('id', 'WORKSPACE_ID')}"
project.save()
frappe.db.commit()
```

---

*This file was auto-generated by the Zenhub entity creation script.*
"""
    
    # Write to file
    with open(output_file, 'w') as f:
        f.write(markdown_content)
    
    frappe.logger().info(f"✅ Saved IDs to: {output_file}")
    return output_file


@frappe.whitelist()
def create_zenhub_entities(
    workspace_id: str,
    project_id: Optional[str] = None,
    project_name: Optional[str] = None,
    epic_titles: List[str] = None,
    output_file: Optional[str] = None
) -> Dict[str, Any]:
    """
    Main function to create epics in Zenhub workspace/project.
    
    Note: Workspaces and Projects should be created via Zenhub UI first.
    This function creates epics (GitHub issues) in the specified workspace/project.
    
    Args:
        workspace_id (str): The Zenhub workspace ID (required)
        project_id (str, optional): The Zenhub project ID. If not provided, will search by name.
        project_name (str, optional): Project name to search for if project_id not provided
        epic_titles (list): List of epic titles to create
        output_file (str, optional): Path to output markdown file
        
    Returns:
        dict: Results containing all created entities
    """
    if epic_titles is None:
        epic_titles = []
    
    results = {
        "workspace": None,
        "project": None,
        "epics": []
    }
    
    try:
        # Step 1: Get Workspace
        frappe.logger().info(f"Fetching workspace: {workspace_id}")
        workspace_result = get_or_create_workspace("", workspace_id)
        results["workspace"] = workspace_result["workspace"]
        workspace_id = workspace_result["workspace"]["id"]
        
        # Step 2: Get or Find Project
        if project_id:
            frappe.logger().info(f"Fetching project: {project_id}")
            project_result = get_or_create_project(workspace_id, "", project_id)
        elif project_name:
            frappe.logger().info(f"Searching for project: {project_name}")
            project_result = get_or_create_project(workspace_id, project_name)
        else:
            frappe.throw("Either project_id or project_name must be provided", frappe.ValidationError)
        
        results["project"] = project_result["project"]
        project_id = project_result["project"]["id"]
        
        # Step 3: Create Epics
        if epic_titles:
            for epic_title in epic_titles:
                frappe.logger().info(f"Creating epic: {epic_title}")
                epic_result = create_epic(workspace_id, project_id, epic_title)
                results["epics"].append(epic_result)
        
        # Step 4: Save to markdown
        output_path = save_ids_to_markdown(results, output_file)
        
        return {
            "success": True,
            "message": f"Successfully created {len(epic_titles)} epic(s) in Zenhub",
            "results": results,
            "output_file": output_path
        }
        
    except Exception as e:
        frappe.log_error(
            title="Zenhub Entity Creation Error",
            message=f"Failed to create entities: {str(e)}"
        )
        return {
            "success": False,
            "error": str(e),
            "results": results
        }


# Script execution when run directly
if __name__ == "__main__":
    # Example usage - modify these values
    WORKSPACE_NAME = "DevSecOps Dashboard Workspace"
    PROJECT_NAME = "Main Project"
    EPIC_TITLES = [
        "User Authentication & Authorization",
        "Dashboard & Reporting",
        "API Integration & Management"
    ]
    
    print("🚀 Starting Zenhub entity creation...")
    print(f"Workspace: {WORKSPACE_NAME}")
    print(f"Project: {PROJECT_NAME}")
    print(f"Epics: {', '.join(EPIC_TITLES)}")
    print()
    
    result = create_zenhub_entities(
        workspace_name=WORKSPACE_NAME,
        project_name=PROJECT_NAME,
        epic_titles=EPIC_TITLES,
        workspace_description="Workspace for DevSecOps Dashboard project management",
        project_description="Main project for tracking development work"
    )
    
    if result["success"]:
        print("✅ Success!")
        print(f"📄 Results saved to: {result['output_file']}")
        print(f"\nWorkspace ID: {result['results']['workspace']['id']}")
        print(f"Project ID: {result['results']['project']['id']}")
        print(f"Epics created: {len(result['results']['epics'])}")
    else:
        print(f"❌ Error: {result['error']}")

