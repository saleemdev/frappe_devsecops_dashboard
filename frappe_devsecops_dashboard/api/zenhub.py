"""
Zenhub GraphQL API Integration Module

This module provides integration with the Zenhub GraphQL API to fetch sprint information
from Zenhub workspaces. It handles authentication, GraphQL queries, and data transformation.

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import frappe
import requests
from typing import Dict, List, Optional, Any


# Zenhub GraphQL API endpoint
ZENHUB_GRAPHQL_ENDPOINT = "https://api.zenhub.com/public/graphql"

# Cache key for Zenhub token
ZENHUB_TOKEN_CACHE_KEY = "zenhub_api_token"
ZENHUB_TOKEN_CACHE_TTL = 3600  # 1 hour


def get_zenhub_token() -> Optional[str]:
    """
    Retrieve the Zenhub API token from Zenhub Settings doctype.

    Uses caching to avoid repeated database queries. The token is cached
    for 1 hour to balance security and performance.

    Returns:
        str: The Zenhub API token

    Raises:
        frappe.ValidationError: If Zenhub Settings is not configured or token is missing
    """
    # Try to get from cache first
    cached_token = frappe.cache().get_value(ZENHUB_TOKEN_CACHE_KEY)
    if cached_token:
        return cached_token

    try:
        # Fetch from database
        zenhub_settings = frappe.get_single("Zenhub Settings")

        if not zenhub_settings:
            frappe.throw(
                "Zenhub Settings not found. Please configure Zenhub Settings first.",
                frappe.ValidationError
            )

        # Retrieve decrypted password value from Password field (compatibility with different Frappe versions)
        try:
            from frappe.utils.password import get_password as _get_password
        except Exception:
            from frappe.utils.password import get_decrypted_password as _get_password
        token = _get_password("Zenhub Settings", "Zenhub Settings", "zenhub_token")

        if not token:
            frappe.throw(
                "Zenhub API token not configured. Please set the token in Zenhub Settings.",
                frappe.ValidationError
            )

        # Cache the token
        frappe.cache().set_value(ZENHUB_TOKEN_CACHE_KEY, token, expires_in_sec=ZENHUB_TOKEN_CACHE_TTL)

        return token

    except frappe.DoesNotExistError:
        frappe.throw(
            "Zenhub Settings doctype not found. Please create Zenhub Settings.",
            frappe.ValidationError
        )
    except Exception as e:
        frappe.log_error(
            title="Zenhub Token Retrieval Error",
            message=f"Failed to retrieve Zenhub token: {str(e)}"
        )
        raise


def execute_graphql_query(query: str, variables: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a GraphQL query against the Zenhub API.

    Args:
        query (str): The GraphQL query string
        variables (dict): Variables for the GraphQL query

    Returns:
        dict: The GraphQL response data

    Raises:
        requests.exceptions.RequestException: For network errors
        frappe.AuthenticationError: For authentication failures
        frappe.ValidationError: For invalid responses
    """
    token = get_zenhub_token()

    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }

    payload = {
        "query": query,
        "variables": variables
    }

    try:
        response = requests.post(
            ZENHUB_GRAPHQL_ENDPOINT,
            headers=headers,
            json=payload,
            timeout=30  # 30 second timeout
        )

        # Handle HTTP errors
        if response.status_code == 401:
            frappe.throw(
                "Zenhub API authentication failed. Please check your API token.",
                frappe.AuthenticationError
            )
        elif response.status_code == 429:
            frappe.throw(
                "Zenhub API rate limit exceeded. Please try again later.",
                frappe.RateLimitExceededError
            )
        elif response.status_code >= 400:
            error_msg = f"Zenhub API error: {response.status_code} - {response.text}"
            frappe.log_error(
                title="Zenhub API Error",
                message=error_msg
            )
            frappe.throw(
                f"Zenhub API request failed with status {response.status_code}",
                frappe.ValidationError
            )

        response.raise_for_status()

        # Parse JSON response
        data = response.json()

        # Check for GraphQL errors
        if "errors" in data:
            error_messages = [err.get("message", "Unknown error") for err in data["errors"]]
            error_msg = f"GraphQL errors: {', '.join(error_messages)}"
            frappe.log_error(
                title="Zenhub GraphQL Error",
                message=error_msg
            )
            frappe.throw(error_msg, frappe.ValidationError)

        return data.get("data", {})

    except requests.exceptions.Timeout:
        frappe.throw(
            "Zenhub API request timed out. Please try again.",
            frappe.ValidationError
        )
    except requests.exceptions.ConnectionError:
        frappe.throw(
            "Failed to connect to Zenhub API. Please check your network connection.",
            frappe.ValidationError
        )
    except requests.exceptions.RequestException as e:
        frappe.log_error(
            title="Zenhub API Request Error",
            message=f"Request failed: {str(e)}"
        )
        frappe.throw(
            f"Zenhub API request failed: {str(e)}",
            frappe.ValidationError
        )


def get_workspace_sprints_query() -> str:
    """
    Get a compatible GraphQL query for fetching workspace sprints.

    Notes:
    - Keep the query minimal to maximize compatibility across Zenhub schema versions
    - Removed unsupported arguments/fields (states, startDate, endDate, username, blockedBy)
    - Fetch only id, name, state for sprints

    Returns:
        str: The GraphQL query string
    """
    return """
    query GetWorkspaceSprints($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        sprints(first: 10) {
          nodes {
            id
            name
            state
            issues(first: 50) {
              nodes {
                id
                title
                state
                estimate { value }
                assignees { nodes { id name } }
              }
            }
          }
        }
      }
    }
    """


def get_workspace_sprints_query_enhanced() -> str:
    """
    Attempt to fetch richer issue fields if supported by the Zenhub schema.
    Notes:
    - Some fields (e.g., blockedBy, epic, pipeline) may not be available in all schema versions.
    - Callers should be prepared to fall back to a minimal query if this fails.
    """
    return """
    query GetWorkspaceSprintsEnhanced($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        # Attempt to fetch pipelines directly on workspace (may not exist on all schemas)
        pipelines { nodes { id name position } }
        sprints(first: 10) {
          nodes {
            id
            name
            state
            issues(first: 50) {
              nodes {
                id
                title
                state
                estimate { value }
                assignees { nodes { id name username } }
                # Optional fields (may not be present in some schemas)
                pipeline { id name }
                pipelineIssue { position pipeline { id name position } }
                epic { id title }
                blockedBy { nodes { id } }
              }
            }
          }
        }
      }
    }
    """



def get_workspace_sprints_query_enhanced_alt() -> str:
    """
    Alternative enhanced query that attempts to fetch pipelines via workspace.board.
    Use as a secondary attempt if the primary enhanced query fails due to schema differences.
    """
    return """
    query GetWorkspaceSprintsEnhancedAlt($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        board { pipelines { nodes { id name position } } }
        sprints(first: 10) {
          nodes {
            id
            name
            state
            issues(first: 50) {
              nodes {
                id
                title
                state
                estimate { value }
                assignees { nodes { id name username } }
                pipeline { id name }
                pipelineIssue { position pipeline { id name position } }
                epic { id title }
                blockedBy { nodes { id } }
              }
            }
          }
        }
      }
    }
    """



def get_workspace_issues_query() -> str:
    """
    GraphQL query to fetch issues directly from a workspace (not via sprints).

    Uses a minimal field set to maximize schema compatibility.
    """
    return """
    query GetWorkspaceIssues($workspaceId: ID!, $first: Int!) {
      workspace(id: $workspaceId) {
        id
        name
        issues(first: $first) {
          totalCount
          nodes {
            id
            title
            state
            estimate { value }
            assignees { nodes { id name } }
          }
        }
      }
    }
    """


def calculate_sprint_metrics(sprint_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate sprint metrics from raw Zenhub sprint data.

    Also computes story points per team member. For issues with multiple assignees,
    we assign FULL story points to each assignee (no splitting). Issues without
    assignees do not contribute to any team member totals. Issues without estimates
    are treated as 0 points.

    Args:
        sprint_data (dict): Raw sprint data from Zenhub GraphQL API

    Returns:
        dict: Calculated metrics including story points, utilization, issue counts,
              and per-member story points breakdown
    """
    issues = sprint_data.get("issues", {}).get("nodes", [])
    sprint_id_ctx = sprint_data.get("id")
    sprint_name_ctx = sprint_data.get("name")

    total_story_points = 0
    completed_story_points = 0

    issue_counts = {
        "total": len(issues),
        "completed": 0,
        "in_progress": 0,
        "blocked": 0
    }

    blockers = []
    team_members_set = set()

    # Track story points per team member
    # Structure: { assignee_id: { id, name, username, total_story_points, completed_story_points } }
    team_member_points: Dict[str, Dict[str, Any]] = {}

    # Kanban mapping from raw state -> bucket
    def map_state_to_status(raw_state: str) -> str:
        s = (raw_state or "").lower()
        if s in ("closed", "done", "completed"): return "Done"
        if s in ("in_progress", "in progress", "working"): return "In Progress"
        if s in ("review", "in_review"): return "In Review"
        if s in ("blocked",): return "Blocked"
        return "To Do"

    def map_pipeline_to_status(pipeline_name: Optional[str]) -> Optional[str]:
        if not pipeline_name:
            return None
        p = pipeline_name.lower()
        if "progress" in p:
            return "In Progress"
        if "review" in p:
            return "In Review"
        if "block" in p:
            return "Blocked"
        if "done" in p or "close" in p:
            return "Done"
        # New Issues / Backlog / Sprint Backlog -> treat as To Do
        if "backlog" in p or "new" in p or "todo" in p or "to do" in p:
            return "To Do"
        return None

    issues_array: List[Dict[str, Any]] = []

    for issue in issues:
        # Determine points and state
        estimate = issue.get("estimate") or {}
        points = estimate.get("value", 0) if isinstance(estimate, dict) else 0
        state = (issue.get("state") or "").lower()
        pipeline_name = ((issue.get("pipeline") or {}).get("name") if isinstance(issue.get("pipeline"), dict) else None)
        # Try alternative path via pipelineIssue if present
        pipeline_issue = issue.get("pipelineIssue") if isinstance(issue.get("pipelineIssue"), dict) else {}
        if not pipeline_name:
            pipeline_name = ((pipeline_issue.get("pipeline") or {}).get("name") if isinstance(pipeline_issue.get("pipeline"), dict) else None)
        pipeline_position = pipeline_issue.get("position") if isinstance(pipeline_issue, dict) else None
        status_bucket = map_pipeline_to_status(pipeline_name) or map_state_to_status(state)

        # Build issue object for output (blocked_by unsupported in schema we use)
        assignees_container = issue.get("assignees") or {}
        assignees_nodes = assignees_container.get("nodes")
        if not isinstance(assignees_nodes, list):
            edges = assignees_container.get("edges")
            if isinstance(edges, list):
                assignees_nodes = [e.get("node") for e in edges if isinstance(e, dict) and isinstance(e.get("node"), dict)]
            else:
                assignees_nodes = []
        assignees_list = [{"id": a.get("id"), "name": a.get("name"), "username": a.get("username")} for a in assignees_nodes]
        # blockedBy may exist in enhanced schema; default to []
        blocked_nodes = ((issue.get("blockedBy") or {}).get("nodes", []) if isinstance(issue.get("blockedBy"), dict) else [])
        blocked_by_ids: List[str] = [b.get("id") for b in blocked_nodes if isinstance(b, dict) and b.get("id")]

        issues_array.append({
            "issue_id": issue.get("id"),
            "title": issue.get("title"),
            "status": status_bucket,
            "state": state,
            "story_points": points,
            "assignees": assignees_list,
            "blocked_by": blocked_by_ids,
            # Optional fields based on availability
            "pipeline_name": pipeline_name,
            "pipeline_position": pipeline_position,
            "epic": (lambda e: {"id": e.get("id"), "title": e.get("title")} if isinstance(e, dict) else None)(issue.get("epic")),
            "sprint": {"id": sprint_id_ctx, "name": sprint_name_ctx},
        })

        # Accumulate global totals
        total_story_points += points
        if state in ["closed", "done", "completed"]:
            completed_story_points += points
            issue_counts["completed"] += 1
        elif state in ["in_progress", "in progress", "working"]:
            issue_counts["in_progress"] += 1

        # If blocked_by were available, we would track blockers count here.
        if blocked_by_ids:
            issue_counts["blocked"] += 1
            blockers.append({
                "issue_id": issue.get("id"),
                "title": issue.get("title"),
                "blocked_by": blocked_by_ids,
            })

        # Collect team members and per-member points
        for assignee in assignees_nodes:
            assignee_id = assignee.get("id")
            name = assignee.get("name")
            username = assignee.get("username")

            # Track unique team members (for legacy team_members list)
            team_members_set.add((assignee_id, name, username))

            if not assignee_id:
                continue

            if assignee_id not in team_member_points:
                team_member_points[assignee_id] = {
                    "id": assignee_id,
                    "name": name,
                    "username": username,
                    "total_story_points": 0,
                    "completed_story_points": 0,
                }

            # Assign FULL points per assignee (no splitting)
            team_member_points[assignee_id]["total_story_points"] += points
            if state in ["closed", "done", "completed"]:
                team_member_points[assignee_id]["completed_story_points"] += points

    # Calculate utilization percentage (global)
    remaining_story_points = total_story_points - completed_story_points
    utilization_percentage = (
        (completed_story_points / total_story_points * 100)
        if total_story_points > 0
        else 0.0
    )

    # Convert team members set to list of dicts
    team_members = [
        {"id": tm[0], "name": tm[1], "username": tm[2]}
        for tm in team_members_set
    ]

    # Build team_member_story_points list with per-member utilization
    team_member_story_points = []
    for tm in team_member_points.values():
        tm_total = tm.get("total_story_points", 0)
        tm_completed = tm.get("completed_story_points", 0)
        tm_util = (tm_completed / tm_total * 100) if tm_total > 0 else 0.0
        team_member_story_points.append({
            **tm,
            "utilization_percentage": round(tm_util, 2)
        })

    return {
        "total_story_points": total_story_points,
        "completed_story_points": completed_story_points,
        "remaining_story_points": remaining_story_points,
        "utilization_percentage": round(utilization_percentage, 2),
        "team_members": team_members,
        "team_member_story_points": team_member_story_points,
        # Keep summary counts for backward compatibility
        "issues_summary": issue_counts,
        # New detailed issues array as requested
        "issues": issues_array,
        "blockers": blockers
    }


def transform_sprint_data(sprint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw Zenhub sprint data into the expected response format.

    Args:
        sprint (dict): Raw sprint data from Zenhub

    Returns:
        dict: Transformed sprint data
    """
    metrics = calculate_sprint_metrics(sprint)

    return {
        "sprint_id": sprint.get("id"),
        "sprint_name": sprint.get("name"),
        "state": sprint.get("state", "").lower(),
        "start_date": sprint.get("startDate"),
        "end_date": sprint.get("endDate"),
        **metrics
    }


@frappe.whitelist()
def get_sprint_data(project_id: str, sprint_states: Optional[str] = None) -> Dict[str, Any]:
    """
    Fetch sprint data from Zenhub for a given project.

    This is the main API endpoint that retrieves sprint information from Zenhub
    based on the project's configured workspace ID.

    Args:
        project_id (str): The Frappe Project doctype name/ID
        sprint_states (str, optional): Comma-separated sprint states (e.g., "ACTIVE,CLOSED")
                                       Defaults to "ACTIVE,CLOSED"

    Returns:
        dict: JSON response containing sprint data or error information

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data?project_id=PROJ-001
    """
    try:
        # Validate project_id
        if not project_id:
            return {
                "success": False,
                "error": "project_id parameter is required",
                "error_type": "validation_error"
            }

        # Fetch the Project document
        try:
            project = frappe.get_doc("Project", project_id)
        except frappe.DoesNotExistError:
            return {
                "success": False,
                "error": f"Project '{project_id}' not found",
                "error_type": "validation_error"
            }

        # Get workspace ID from project
        workspace_id = project.get("custom_zenhub_workspace_id")
        if not workspace_id:
            return {
                "success": False,
                "error": f"Zenhub workspace ID not configured for project '{project_id}'. Please set the 'custom_zenhub_workspace_id' field.",
                "error_type": "validation_error",
            }

        # Parse sprint states (used for client-side filtering after fetch)
        if sprint_states:
            states = [state.strip().upper() for state in sprint_states.split(",")]
        else:
            states = ["ACTIVE", "CLOSED"]

        # Try enhanced query first; if it fails (schema/complexity), fall back to minimal query
        variables = {"workspaceId": workspace_id}
        try:
            query = get_workspace_sprints_query_enhanced()
            response_data = execute_graphql_query(query, variables)
        except Exception as _enhanced_err:
            # Try alternative enhanced query using workspace.board.pipelines
            try:
                query = get_workspace_sprints_query_enhanced_alt()
                response_data = execute_graphql_query(query, variables)
            except Exception as _enhanced_err_alt:
                frappe.log_error(
                    title="Zenhub Enhanced Query Failed - Falling back",
                    message=f"Enhanced query failed: {str(_enhanced_err)} | Alt failed: {str(_enhanced_err_alt)}"
                )
                query = get_workspace_sprints_query()
                response_data = execute_graphql_query(query, variables)

        # Extract workspace, pipelines and sprints
        workspace = response_data.get("workspace", {})
        pipelines_nodes = (
            ((workspace.get("pipelines") or {}).get("nodes", []))
            or (((workspace.get("board") or {}).get("pipelines") or {}).get("nodes", []))
        )
        pipelines_list = []
        for idx, p in enumerate(pipelines_nodes or []):
            if isinstance(p, dict):
                pos = p.get("position")
                if pos is None:
                    pos = p.get("index") if isinstance(p.get("index"), int) else idx
                pipelines_list.append({
                    "id": p.get("id"),
                    "name": p.get("name"),
                    "position": pos,
                })

        sprints_data = workspace.get("sprints", {}).get("nodes", [])

        # Filter sprints by state if provided
        if states:
            sprints_data = [s for s in sprints_data if (s.get("state") or "").upper() in states]

        # Transform sprint data
        transformed_sprints = [transform_sprint_data(sprint) for sprint in sprints_data]

        # Fallback: if no sprints exist/returned, surface workspace issues as a pseudo sprint "Backlog"
        if not transformed_sprints:
            try:
                issues_query = get_workspace_issues_query()
                issues_vars = {"workspaceId": workspace_id, "first": 100}
                issues_response = execute_graphql_query(issues_query, issues_vars)
                ws = issues_response.get("workspace", {})
                issues_nodes = (ws.get("issues", {}) or {}).get("nodes", [])
                pseudo_sprint = {
                    "id": f"workspace-{workspace_id}-backlog",
                    "name": "Backlog",
                    "state": "backlog",
                    "issues": {"nodes": issues_nodes},
                }
                transformed_sprints = [transform_sprint_data(pseudo_sprint)]
            except Exception as e:
                frappe.log_error(
                    title="Zenhub Sprint Fallback Error",
                    message=f"Failed to fetch workspace issues for fallback: {str(e)}",
                )

        return {
            "success": True,
            "workspace_id": workspace_id,
            "workspace_name": workspace.get("name"),
            "pipelines": pipelines_list,
            "sprints": transformed_sprints,
        }

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Sprint Data Error",
            message=f"Unexpected error fetching sprint data for project {project_id}: {str(e)}",
        )
        return {"success": False, "error": f"An unexpected error occurred: {str(e)}", "error_type": "api_error"}


@frappe.whitelist()
def get_workspace_issues(project_id: str, page_size: int = 100) -> Dict[str, Any]:
    """
    Fetch ALL issues from a Zenhub workspace (not filtered by sprints).

    Args:
        project_id (str): The Frappe Project doctype name/ID
        page_size (int): Number of issues to fetch (default 100)

    Returns:
        dict: JSON response with issues and counts
    """
    try:
        if not project_id:
            return {
                "success": False,
                "error": "project_id parameter is required",
                "error_type": "validation_error",
            }

        # Fetch the Project document
        try:
            project = frappe.get_doc("Project", project_id)
        except frappe.DoesNotExistError:
            return {
                "success": False,
                "error": f"Project '{project_id}' not found",
                "error_type": "validation_error",
            }

        # Get workspace ID from project
        workspace_id = project.get("custom_zenhub_workspace_id")
        if not workspace_id:
            return {
                "success": False,
                "error": f"Zenhub workspace ID not configured for project '{project_id}'. Please set the 'custom_zenhub_workspace_id' field.",
                "error_type": "validation_error",
            }

        # Execute GraphQL query
        query = get_workspace_issues_query()
        variables = {"workspaceId": workspace_id, "first": int(page_size)}
        response_data = execute_graphql_query(query, variables)

        # Extract workspace and issues
        workspace = response_data.get("workspace", {})
        issues_edge = workspace.get("issues", {})
        issues_nodes = issues_edge.get("nodes", [])
        total_count = issues_edge.get("totalCount", len(issues_nodes))

        # Transform issues to the expected shape
        transformed_issues: List[Dict[str, Any]] = []
        for issue in issues_nodes:
            estimate = issue.get("estimate") or {}
            points = estimate.get("value", 0) if isinstance(estimate, dict) else 0
            assignees_nodes = (issue.get("assignees") or {}).get("nodes", [])
            assignees = [
                {"id": a.get("id"), "name": a.get("name")}
                for a in assignees_nodes
            ]

            transformed_issues.append(
                {
                    "id": issue.get("id"),
                    "title": issue.get("title"),
                    "state": (issue.get("state") or "").lower(),
                    "story_points": points,
                    "assignees": assignees,
                    "sprint_id": None,  # Not fetched in this minimal query
                }
            )

        # Since sprint association is not fetched here, treat all as unassigned
        unassigned_count = sum(1 for _ in transformed_issues)  # equals total_count

        return {
            "success": True,
            "workspace_id": workspace_id,
            "workspace_name": workspace.get("name"),
            "issues": transformed_issues,
            "total_issues": total_count,
            "unassigned_to_sprint": unassigned_count,
        }

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Workspace Issues Error",
            message=f"Unexpected error fetching workspace issues for project {project_id}: {str(e)}",
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error",
        }



