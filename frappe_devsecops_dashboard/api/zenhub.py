"""
Zenhub GraphQL API Integration Module

This module provides integration with the Zenhub GraphQL API to fetch sprint information
from Zenhub workspaces. It handles authentication, GraphQL queries, and data transformation.

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import frappe
import requests
import base64
import json as json_lib
from typing import Dict, List, Optional, Any


# Zenhub GraphQL API endpoint
ZENHUB_GRAPHQL_ENDPOINT = "https://api.zenhub.com/public/graphql"

# Cache key for Zenhub token
ZENHUB_TOKEN_CACHE_KEY = "zenhub_api_token"
ZENHUB_TOKEN_CACHE_TTL = 3600  # 1 hour


# Cache key for GitHub user data
GITHUB_USER_CACHE_KEY_PREFIX = "github_user_"
GITHUB_USER_CACHE_TTL = 86400  # 24 hours (usernames rarely change)

# Cache key for sprint data responses
SPRINT_DATA_CACHE_KEY_PREFIX = "zenhub_sprint_data_"
SPRINT_DATA_CACHE_TTL = 300  # 5 minutes


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


def decode_zenhub_user_id(zenhub_user_id: str) -> Optional[int]:
    """
    Decode a Zenhub user ID to extract the GitHub user ID.

    Zenhub user IDs are base64-encoded strings in the format:
    "Z2lkOi8vcmFwdG9yL1VzZXIvMzkzNjk4NDcw" -> "gid://raptor/User/393698470"

    Args:
        zenhub_user_id: The Zenhub user ID (base64 encoded)

    Returns:
        int: The GitHub user ID, or None if decoding fails
    """
    try:
        decoded = base64.b64decode(zenhub_user_id).decode('utf-8')
        # Format: gid://raptor/User/{github_user_id}
        if '/User/' in decoded:
            github_id = decoded.split('/User/')[-1]
            return int(github_id)
    except Exception:
        pass
    return None


def fetch_github_user(github_user_id: int) -> Optional[Dict[str, str]]:
    """
    Fetch GitHub user information from the GitHub REST API.

    Uses the public GitHub API (no authentication required) to fetch user data.
    Results are cached for 24 hours to minimize API calls. Includes rate limit handling.

    Args:
        github_user_id: The numeric GitHub user ID

    Returns:
        dict: User data with 'login' and 'name' fields, or None if fetch fails
    """
    cache_key = f"{GITHUB_USER_CACHE_KEY_PREFIX}{github_user_id}"

    # Check cache first
    cached_user = frappe.cache().get_value(cache_key)
    if cached_user:
        try:
            return json_lib.loads(cached_user)
        except Exception:
            pass

    try:
        # GitHub REST API endpoint for user by ID
        url = f"https://api.github.com/user/{github_user_id}"
        headers = {
            "Accept": "application/vnd.github.v3+json",
            "User-Agent": "Frappe-DevSecOps-Dashboard"
        }

        response = requests.get(url, headers=headers, timeout=10)

        # Check rate limit headers
        rate_limit_remaining = response.headers.get('X-RateLimit-Remaining')
        rate_limit_reset = response.headers.get('X-RateLimit-Reset')

        if rate_limit_remaining:
            remaining = int(rate_limit_remaining)
            if remaining < 10:
                frappe.log_error(
                    title="GitHub Rate Limit Warning",
                    message=f"Only {remaining} GitHub API requests remaining. Resets at {rate_limit_reset}"
                )

        if response.status_code == 200:
            data = response.json()
            user_data = {
                "login": data.get("login"),
                "name": data.get("name") or data.get("login")
            }
            # Cache for 24 hours
            frappe.cache().set_value(cache_key, json_lib.dumps(user_data), expires_in_sec=GITHUB_USER_CACHE_TTL)
            return user_data
        elif response.status_code == 404:
            # User not found - cache negative result for 1 hour
            frappe.cache().set_value(cache_key, json_lib.dumps(None), expires_in_sec=3600)
        elif response.status_code == 403:
            # Check if rate limited
            if 'rate limit' in response.text.lower():
                frappe.log_error(
                    title="GitHub Rate Limit Exceeded",
                    message=f"GitHub API rate limit exceeded for user {github_user_id}. Resets at {rate_limit_reset}"
                )
                # Cache None for 1 hour to avoid hammering the API
                frappe.cache().set_value(cache_key, json_lib.dumps(None), expires_in_sec=3600)
    except Exception as e:
        frappe.log_error(
            title="GitHub User Fetch Error",
            message=f"Failed to fetch GitHub user {github_user_id}: {str(e)}"
        )

    return None


def process_assignees_from_zenhub(assignees: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Process assignee data from Zenhub GraphQL response.

    Uses the login and name fields directly from Zenhub's API.
    No GitHub API calls - all data comes from Zenhub.

    Args:
        assignees: List of assignee dicts with 'id', 'login', 'name' fields from Zenhub

    Returns:
        List[Dict]: Processed assignee list with human-friendly names
    """
    processed = []

    for assignee in assignees:
        if not isinstance(assignee, dict):
            continue

        zenhub_id = assignee.get("id")
        if not zenhub_id:
            continue

        # Get login (GitHub username) and name from Zenhub response
        login = assignee.get("login")
        name = assignee.get("name")

        # Use login as the primary username, name as display name
        processed.append({
            "id": zenhub_id,
            "username": login or "unknown",
            "name": name or login or "Unknown User"
        })

    return processed


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
    - Fetch assignees with GitHub login and name
    - Get epic and blockedBy information
    - Use Zenhub's actual field names (login, not username)

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
                assignees {
                  nodes {
                    id
                    login
                    name
                  }
                }
                epic {
                  issue {
                    id
                    title
                  }
                }
                blockedBy {
                  nodes {
                    id
                    title
                  }
                }
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
                assignees {
                  nodes {
                    id
                    login
                    name
                  }
                }
                # Optional fields (may not be present in some schemas)
                pipeline { id name }
                pipelineIssue { position pipeline { id name position } }
                epic {
                  issue {
                    id
                    title
                  }
                }
                blockedBy {
                  nodes {
                    id
                    title
                  }
                }
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
                assignees {
                  nodes {
                    id
                    login
                    name
                  }
                }
                pipeline { id name }
                pipelineIssue { position pipeline { id name position } }
                epic {
                  issue {
                    id
                    title
                  }
                }
                blockedBy {
                  nodes {
                    id
                    title
                  }
                }
              }
            }
          }
        }
      }
    }
    """



def get_workspace_issues_query() -> str:
    """
    GraphQL query to fetch ALL issues directly from a workspace (not via sprints).

    This is the primary query to use when you want all workspace issues
    regardless of sprint assignment.

    Uses only fields confirmed to exist in Zenhub's GraphQL schema.
    """
    return """
    query GetWorkspaceIssues($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        issues(first: 100) {
          totalCount
          nodes {
            id
            title
            state
            htmlUrl
            number
            repository {
              id
              ghId
              name
            }
            estimate { value }
            assignees {
              nodes {
                id
                login
                name
              }
            }
            epic {
              issue {
                id
                title
              }
            }
          }
        }
      }
    }
    """




def get_workspace_issues_query_edges() -> str:
    """
    Alternative GraphQL query variant that requests assignees via edges { node { ... } }.
    Some Zenhub schemas expose assignees through edges rather than nodes.
    """
    return """
    query GetWorkspaceIssuesEdges($workspaceId: ID!, $first: Int!) {
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
            assignees { edges { node { id name username } } }
          }
        }
      }
    }
    """


def get_stakeholder_sprint_query() -> str:
    """
    Optimized GraphQL query for stakeholder-focused sprint reporting.

    Fetches only essential data needed for executive-level reporting:
    - Sprint metadata (name, dates, state)
    - Issue counts and status distribution
    - Epic information for unique epic count
    - Assignee information for team workload
    - Story points for capacity planning

    This query is optimized for performance and reduced payload size.

    Returns:
        str: The GraphQL query string
    """
    return """
    query GetStakeholderSprintData($workspaceId: ID!) {
      workspace(id: $workspaceId) {
        id
        name
        sprints(first: 10) {
          nodes {
            id
            name
            state
            startDate
            endDate
            issues(first: 100) {
              totalCount
              nodes {
                id
                state
                estimate { value }
                assignees {
                  nodes {
                    id
                    login
                    name
                  }
                }
                epic {
                  issue {
                    id
                    title
                  }
                }
              }
            }
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

    # Log ONLY if there are zero issues - this could indicate a problem
    if len(issues) == 0:
        try:
            frappe.log_error(
                title="Zenhub Sprint Has Zero Issues",
                message=f"Sprint '{sprint_name_ctx}' ({sprint_id_ctx}) returned 0 issues. Issues container: {json_lib.dumps(sprint_data.get('issues'))}"
            )
        except Exception:
            pass

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

        # Map state to status bucket (no pipeline data available)
        status_bucket = map_state_to_status(state) or "To Do"

        # Build issue object for output (blocked_by unsupported in schema we use)
        assignees_container = issue.get("assignees") or {}
        assignees_nodes = assignees_container.get("nodes")

        # Handle both nodes and edges patterns for assignees
        if not isinstance(assignees_nodes, list):
            edges = assignees_container.get("edges")
            if isinstance(edges, list):
                assignees_nodes = [e.get("node") for e in edges if isinstance(e, dict) and isinstance(e.get("node"), dict)]
            else:
                assignees_nodes = []

        # Extract raw assignees from Zenhub response
        raw_assignees = []
        if assignees_nodes:
            for a in assignees_nodes:
                if isinstance(a, dict) and a.get("id"):
                    raw_assignees.append({
                        "id": a.get("id"),
                        "login": a.get("login"),
                        "name": a.get("name")
                    })

        assignees_list = process_assignees_from_zenhub(raw_assignees) if raw_assignees else []

        # Process epic with human-friendly data
        epic_data = issue.get("epic")
        epic_info = None
        if isinstance(epic_data, dict):
            # Epic might be nested as epic.issue or directly
            epic_issue = epic_data.get("issue") if epic_data.get("issue") else epic_data
            if isinstance(epic_issue, dict):
                epic_info = {
                    "id": epic_issue.get("id"),
                    "title": epic_issue.get("title") or "Unnamed Epic"
                }

        # Get GitHub repository and issue number
        repo_data = issue.get("repository") or {}
        repo_name = repo_data.get("name") if isinstance(repo_data, dict) else None
        github_number = issue.get("number")
        html_url = issue.get("htmlUrl")

        issues_array.append({
            "issue_id": issue.get("id"),
            "github_number": github_number,
            "github_url": html_url,
            "repository": repo_name,
            "title": issue.get("title"),
            "status": status_bucket,
            "state": state,
            "story_points": points,
            "assignees": assignees_list,
            "blocked_by": [],  # Not available in current Zenhub schema
            "epic": epic_info,
            "sprint": {"id": sprint_id_ctx, "name": sprint_name_ctx},
        })

        # Accumulate global totals
        total_story_points += points
        if state in ["closed", "done", "completed"]:
            completed_story_points += points
            issue_counts["completed"] += 1
        elif state in ["in_progress", "in progress", "working"]:
            issue_counts["in_progress"] += 1

        # Note: blocked_by field not available in current Zenhub GraphQL schema

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


def calculate_stakeholder_metrics(sprint_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Calculate simplified stakeholder-focused metrics from raw Zenhub sprint data.

    This function extracts only the metrics needed for executive-level reporting:
    - Issue counts by status
    - Unique epic count
    - Story points summary
    - Team member workload (ticket count, not story points)
    - Sprint health indicators

    Args:
        sprint_data (dict): Raw sprint data from Zenhub GraphQL API

    Returns:
        dict: Stakeholder-focused metrics
    """
    issues = sprint_data.get("issues", {}).get("nodes", [])

    # Initialize counters
    issues_by_status = {
        "to_do": 0,
        "in_progress": 0,
        "in_review": 0,
        "done": 0,
        "blocked": 0
    }

    total_story_points = 0
    completed_story_points = 0
    blocked_count = 0
    unique_epics = set()
    team_member_tickets: Dict[str, Dict[str, Any]] = {}

    # Process each issue
    for issue in issues:
        state = (issue.get("state") or "").lower()
        estimate = issue.get("estimate") or {}
        points = estimate.get("value", 0) if isinstance(estimate, dict) else 0

        # Count by status
        if state in ("closed", "done", "completed"):
            issues_by_status["done"] += 1
            completed_story_points += points
        elif state in ("in_progress", "in progress", "working"):
            issues_by_status["in_progress"] += 1
        elif state in ("review", "in_review"):
            issues_by_status["in_review"] += 1
        elif state in ("blocked",):
            issues_by_status["blocked"] += 1
            blocked_count += 1
        else:
            issues_by_status["to_do"] += 1

        total_story_points += points

        # Count unique epics
        epic_data = issue.get("epic")
        if isinstance(epic_data, dict):
            epic_issue = epic_data.get("issue") if epic_data.get("issue") else epic_data
            if isinstance(epic_issue, dict) and epic_issue.get("id"):
                unique_epics.add(epic_issue.get("id"))

        # Track team member ticket counts
        assignees_container = issue.get("assignees") or {}
        assignees_nodes = assignees_container.get("nodes", [])

        if not isinstance(assignees_nodes, list):
            edges = assignees_container.get("edges", [])
            if isinstance(edges, list):
                assignees_nodes = [e.get("node") for e in edges if isinstance(e, dict) and isinstance(e.get("node"), dict)]
            else:
                assignees_nodes = []

        for assignee in assignees_nodes:
            if not isinstance(assignee, dict) or not assignee.get("id"):
                continue

            assignee_id = assignee.get("id")
            if assignee_id not in team_member_tickets:
                team_member_tickets[assignee_id] = {
                    "id": assignee_id,
                    "name": assignee.get("name"),
                    "login": assignee.get("login"),
                    "ticket_count": 0,
                    "completed_tickets": 0
                }

            team_member_tickets[assignee_id]["ticket_count"] += 1
            if state in ("closed", "done", "completed"):
                team_member_tickets[assignee_id]["completed_tickets"] += 1

    # Calculate percentages
    total_issues = len(issues)
    completion_percentage = (
        (completed_story_points / total_story_points * 100)
        if total_story_points > 0
        else 0.0
    )

    progress_percentage = (
        (issues_by_status["done"] / total_issues * 100)
        if total_issues > 0
        else 0.0
    )

    blocked_rate = (
        (blocked_count / total_issues * 100)
        if total_issues > 0
        else 0.0
    )

    # Calculate team utilization (average workload)
    team_utilization = 0.0
    if team_member_tickets:
        avg_tickets = total_issues / len(team_member_tickets)
        team_utilization = (avg_tickets / max(total_issues, 1)) * 100

    # Determine sprint health
    health_status = "on_track"
    if blocked_rate > 20:
        health_status = "at_risk"
    elif progress_percentage < 30 and total_issues > 0:
        health_status = "off_track"

    # Build team members list with workload percentage
    team_members = []
    for tm in team_member_tickets.values():
        workload_pct = (tm["ticket_count"] / total_issues * 100) if total_issues > 0 else 0.0
        team_members.append({
            **tm,
            "workload_percentage": round(workload_pct, 2)
        })

    # Sort by ticket count (descending)
    team_members.sort(key=lambda x: x["ticket_count"], reverse=True)

    return {
        "total_issues": total_issues,
        "unique_epics": len(unique_epics),
        "issues_by_status": issues_by_status,
        "total_story_points": total_story_points,
        "completed_story_points": completed_story_points,
        "remaining_story_points": total_story_points - completed_story_points,
        "completion_percentage": round(completion_percentage, 2),
        "progress_percentage": round(progress_percentage, 2),
        "blocked_issues_count": blocked_count,
        "health_status": health_status,
        "health_indicators": {
            "completion_rate": round(completion_percentage, 2),
            "blocked_rate": round(blocked_rate, 2),
            "team_utilization": round(team_utilization, 2)
        },
        "team_members": team_members
    }


def transform_stakeholder_sprint_data(sprint: Dict[str, Any]) -> Dict[str, Any]:
    """
    Transform raw Zenhub sprint data into stakeholder-focused report format.

    Args:
        sprint (dict): Raw sprint data from Zenhub

    Returns:
        dict: Transformed stakeholder sprint data
    """
    metrics = calculate_stakeholder_metrics(sprint)

    return {
        "sprint_id": sprint.get("id"),
        "sprint_name": sprint.get("name"),
        "state": sprint.get("state", "").lower(),
        "start_date": sprint.get("startDate"),
        "end_date": sprint.get("endDate"),
        **metrics
    }


@frappe.whitelist()
def get_sprint_data(project_id: str, sprint_states: Optional[str] = None, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetch sprint data from Zenhub for a given project.

    This is the main API endpoint that retrieves sprint information from Zenhub
    based on the project's configured workspace ID. Results are cached for 5 minutes.

    Args:
        project_id (str): The Frappe Project doctype name/ID
        sprint_states (str, optional): Comma-separated sprint states (e.g., "ACTIVE,CLOSED")
                                       Defaults to "ACTIVE,CLOSED"
        force_refresh (bool, optional): Force refresh from API, bypass cache. Defaults to False

    Returns:
        dict: JSON response containing sprint data or error information

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub.get_sprint_data?project_id=PROJ-001
    """
    try:
        # Generate cache key
        states_key = sprint_states or "ACTIVE,CLOSED"
        cache_key = f"{SPRINT_DATA_CACHE_KEY_PREFIX}{project_id}_{states_key}"

        # Try to get from cache first (unless force_refresh)
        if not force_refresh:
            cached_data = frappe.cache().get_value(cache_key)
            if cached_data:
                try:
                    result = json_lib.loads(cached_data)
                    # Add cache indicator
                    result["_cached"] = True
                    result["_cache_time"] = frappe.cache().ttl(cache_key)
                    return result
                except Exception:
                    # Cache corrupted, continue to fetch fresh
                    pass
        # Validate project_id
        if not project_id:
            return {
                "success": False,
                "error": "project_id parameter is required",
                "error_type": "validation_error"
            }

        # Fetch the Project document with permission check
        try:
            project = frappe.get_doc("Project", project_id)

            # Check read permission on the project
            if not project.has_permission('read'):
                return {
                    "success": False,
                    "error": f"You do not have permission to access project '{project_id}'",
                    "error_type": "permission_error"
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

        # Fetch ALL workspace issues directly (not just sprint issues)
        # This ensures we get all issues regardless of sprint assignment
        variables = {"workspaceId": workspace_id}
        response_data = None
        query_used = "workspace_issues"

        try:
            query = get_workspace_issues_query()
            response_data = execute_graphql_query(query, variables)
        except Exception as e:
            frappe.log_error(
                title="Zenhub Workspace Issues Query Failed",
                message=f"Failed to fetch workspace issues: {str(e)}"
            )
            raise

        # Extract workspace and issues
        workspace = response_data.get("workspace", {})

        # Log diagnostic info about the workspace response
        try:
            issues_count = len(workspace.get("issues", {}).get("nodes", []))
            frappe.log_error(
                title="Zenhub Workspace Response Debug",
                message=f"Workspace ID: {workspace.get('id')}, Name: {workspace.get('name')}, Issues count: {issues_count}, Query used: {query_used}"
            )
        except Exception:
            pass

        # No pipelines in this simplified query
        pipelines_list = []

        # Get all workspace issues
        issues_container = workspace.get("issues", {})
        all_issues = issues_container.get("nodes", [])
        total_count = issues_container.get("totalCount", len(all_issues))

        # Log issues count
        try:
            frappe.log_error(
                title="Zenhub Workspace Issues Count",
                message=f"Found {len(all_issues)} issues in workspace (total: {total_count})"
            )
        except Exception:
            pass

        # Create a single "All Issues" pseudo-sprint with all workspace issues
        pseudo_sprint = {
            "id": f"workspace_{workspace_id}_all_issues",
            "name": "All Workspace Issues",
            "state": "ACTIVE",
            "issues": {"nodes": all_issues}
        }

        # Transform sprint data (just our pseudo-sprint)
        transformed_sprints = [transform_sprint_data(pseudo_sprint)]

        result = {
            "success": True,
            "workspace_id": workspace_id,
            "workspace_name": workspace.get("name"),
            "pipelines": pipelines_list,
            "sprints": transformed_sprints,
            "_cached": False,
            "_fetched_at": frappe.utils.now()
        }

        # Cache the successful result
        try:
            frappe.cache().set_value(
                cache_key,
                json_lib.dumps(result),
                expires_in_sec=SPRINT_DATA_CACHE_TTL
            )
        except Exception as cache_error:
            # Don't fail if caching fails
            frappe.log_error(
                title="Zenhub Cache Error",
                message=f"Failed to cache sprint data: {str(cache_error)}"
            )

        return result

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

        # Fetch the Project document with permission check
        try:
            project = frappe.get_doc("Project", project_id)

            # Check read permission on the project
            if not project.has_permission('read'):
                return {
                    "success": False,
                    "error": f"You do not have permission to access project '{project_id}'",
                    "error_type": "permission_error"
                }
        except frappe.DoesNotExistError:
            return {
                "success": False,
                "error": f"Project '{project_id}' not found",
                "error_type": "validation_error",
            }
        except frappe.PermissionError:
            return {
                "success": False,
                "error": f"You do not have permission to access project '{project_id}'",
                "error_type": "permission_error"
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


@frappe.whitelist()
def get_stakeholder_sprint_report(project_id: str, force_refresh: bool = False) -> Dict[str, Any]:
    """
    Fetch simplified stakeholder-focused sprint report from Zenhub.

    This endpoint returns only the metrics needed for executive-level reporting:
    - Sprint overview (name, dates, status)
    - Issue counts by status
    - Unique epic count
    - Story points summary
    - Team member workload distribution
    - Sprint health indicators

    This is optimized for performance and reduced payload size compared to get_sprint_data.

    Args:
        project_id (str): The Frappe Project doctype name/ID
        force_refresh (bool, optional): Force refresh from API, bypass cache. Defaults to False

    Returns:
        dict: JSON response containing stakeholder sprint report or error information

    Example:
        GET /api/method/frappe_devsecops_dashboard.api.zenhub.get_stakeholder_sprint_report?project_id=PROJ-001
    """
    try:
        # Generate cache key
        cache_key = f"{SPRINT_DATA_CACHE_KEY_PREFIX}stakeholder_{project_id}"

        # Try to get from cache first (unless force_refresh)
        if not force_refresh:
            cached_data = frappe.cache().get_value(cache_key)
            if cached_data:
                try:
                    result = json_lib.loads(cached_data)
                    result["_cached"] = True
                    result["_cache_time"] = frappe.cache().ttl(cache_key)
                    return result
                except Exception:
                    pass

        # Validate project_id
        if not project_id:
            return {
                "success": False,
                "error": "project_id parameter is required",
                "error_type": "validation_error"
            }

        # Fetch the Project document with permission check
        try:
            project = frappe.get_doc("Project", project_id)

            if not project.has_permission('read'):
                return {
                    "success": False,
                    "error": f"You do not have permission to access project '{project_id}'",
                    "error_type": "permission_error"
                }
        except frappe.DoesNotExistError:
            return {
                "success": False,
                "error": f"Project '{project_id}' not found",
                "error_type": "not_found_error"
            }

        # Get workspace ID from project
        workspace_id = project.get("custom_zenhub_workspace_id")
        if not workspace_id:
            return {
                "success": False,
                "error": f"Zenhub workspace ID not configured for project '{project_id}'",
                "error_type": "validation_error"
            }

        # Execute GraphQL query
        query = get_stakeholder_sprint_query()
        variables = {"workspaceId": workspace_id}
        response_data = execute_graphql_query(query, variables)

        # Extract workspace and sprints
        workspace = response_data.get("workspace", {})
        sprints_container = workspace.get("sprints", {})
        sprints_nodes = sprints_container.get("nodes", [])

        # Transform sprints to stakeholder format
        transformed_sprints = [transform_stakeholder_sprint_data(s) for s in sprints_nodes]

        result = {
            "success": True,
            "workspace_id": workspace_id,
            "workspace_name": workspace.get("name"),
            "sprints": transformed_sprints,
            "_cached": False,
            "_fetched_at": frappe.utils.now()
        }

        # Cache the successful result
        try:
            frappe.cache().set_value(
                cache_key,
                json_lib.dumps(result),
                expires_in_sec=SPRINT_DATA_CACHE_TTL
            )
        except Exception as cache_error:
            frappe.log_error(
                title="Zenhub Cache Error",
                message=f"Failed to cache stakeholder sprint report: {str(cache_error)}"
            )

        return result

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Stakeholder Report Error",
            message=f"Unexpected error fetching stakeholder sprint report for project {project_id}: {str(e)}",
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error",
        }


@frappe.whitelist()
def get_workspace_summary(workspace_id: str, project_id: Optional[str] = None) -> Dict[str, Any]:
    """
    Get workspace summary for Product Summary view.

    Fetches comprehensive workspace data including:
    - Projects and their issues
    - Sprint progress and metrics
    - Team utilization
    - Kanban pipeline status

    Args:
        workspace_id (str): The Zenhub workspace ID
        project_id (str, optional): Filter by specific project ID

    Returns:
        dict: JSON response containing workspace summary or error information
    """
    try:
        if not workspace_id:
            return {
                "success": False,
                "error": "workspace_id parameter is required",
                "error_type": "validation_error"
            }

        # Fetch workspace data using GraphQL
        variables = {"workspaceId": workspace_id}
        response_data = execute_graphql_query(get_workspace_issues_query(), variables)

        workspace = response_data.get("workspace", {})
        issues_container = workspace.get("issues", {})
        all_issues = issues_container.get("nodes", [])

        # Process issues and calculate metrics
        metrics = calculate_sprint_metrics({
            "id": workspace_id,
            "name": workspace.get("name", "Workspace"),
            "issues": {"nodes": all_issues}
        })

        # Group by project if repository info available
        projects_data = {}
        for issue in all_issues:
            repo = issue.get("repository", {})
            repo_name = repo.get("name", "Unknown")
            if repo_name not in projects_data:
                projects_data[repo_name] = {
                    "name": repo_name,
                    "issue_count": 0,
                    "story_points": 0,
                    "completed_points": 0
                }
            projects_data[repo_name]["issue_count"] += 1
            estimate = issue.get("estimate") or {}
            points = estimate.get("value", 0) if isinstance(estimate, dict) else 0
            projects_data[repo_name]["story_points"] += points
            if issue.get("state") in ["closed", "done", "completed"]:
                projects_data[repo_name]["completed_points"] += points

        # Calculate overall health
        total_issues = len(all_issues)
        completed_issues = sum(1 for i in all_issues if i.get("state") in ["closed", "done", "completed"])
        progress_pct = (completed_issues / total_issues * 100) if total_issues > 0 else 0

        health_status = "on_track"
        if progress_pct < 30:
            health_status = "off_track"
        elif metrics.get("issues_by_status", {}).get("blocked", 0) / max(total_issues, 1) > 0.2:
            health_status = "at_risk"

        result = {
            "success": True,
            "workspace_id": workspace_id,
            "workspace_name": workspace.get("name"),
            "summary": {
                "total_issues": total_issues,
                "completed_issues": completed_issues,
                "progress_percentage": round(progress_pct, 2),
                "total_story_points": metrics.get("total_story_points", 0),
                "completed_story_points": metrics.get("completed_story_points", 0),
                "remaining_story_points": metrics.get("remaining_story_points", 0),
                "health_status": health_status,
                "team_members_count": len(metrics.get("team_members", []))
            },
            "projects": list(projects_data.values()),
            "team_members": metrics.get("team_member_story_points", [])[:10],
            "issues_by_status": metrics.get("issues_by_status", {}),
            "pipelines": [],
            "_fetched_at": frappe.utils.now()
        }

        return result

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Workspace Summary Error",
            message=f"Unexpected error fetching workspace summary: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }


@frappe.whitelist()
def get_project_summary(project_id: str, zenhub_workspace_id: str = None) -> Dict[str, Any]:
    """
    Get project-specific summary with Zenhub data.

    Fetches project data combined with Zenhub workspace metrics
    filtered by the project's Zenhub workspace.

    Args:
        project_id (str): The Frappe Project doctype name/ID
        zenhub_workspace_id (str, optional): Override workspace ID from project

    Returns:
        dict: JSON response containing project summary or error information
    """
    try:
        if not project_id:
            return {
                "success": False,
                "error": "project_id parameter is required",
                "error_type": "validation_error"
            }

        # Fetch project with permission check
        try:
            project = frappe.get_doc("Project", project_id)
            if not project.has_permission('read'):
                return {
                    "success": False,
                    "error": f"You do not have permission to access project '{project_id}'",
                    "error_type": "permission_error"
                }
        except frappe.DoesNotExistError:
            return {
                "success": False,
                "error": f"Project '{project_id}' not found",
                "error_type": "validation_error"
            }

        # Get workspace ID
        workspace_id = zenhub_workspace_id or project.get("custom_zenhub_workspace_id")
        if not workspace_id:
            return {
                "success": False,
                "error": f"Zenhub workspace ID not configured for project '{project_id}'",
                "error_type": "validation_error"
            }

        # Fetch project tasks
        tasks = frappe.get_all(
            "Task",
            filters={"project": project_id},
            fields=["name", "subject", "status", "priority", "exp_end_date", "progress", "type"]
        )

        # Fetch workspace issues
        variables = {"workspaceId": workspace_id}
        response_data = execute_graphql_query(get_workspace_issues_query(), variables)
        workspace = response_data.get("workspace", {})
        all_issues = workspace.get("issues", {}).get("nodes", [])

        # Calculate project metrics
        total_tasks = len(tasks)
        completed_tasks = sum(1 for t in tasks if t.status in ["Completed", "Closed"])
        in_progress_tasks = sum(1 for t in tasks if t.status in ["Working", "In Progress"])

        # Calculate Zenhub metrics
        zenhub_total = len(all_issues)
        zenhub_completed = sum(1 for i in all_issues if i.get("state") in ["closed", "done", "completed"])
        total_story_points = sum(
            (i.get("estimate") or {}).get("value", 0)
            for i in all_issues
            if isinstance(i.get("estimate"), dict)
        )
        completed_story_points = sum(
            (i.get("estimate") or {}).get("value", 0)
            for i in all_issues
            if i.get("state") in ["closed", "done", "completed"] and isinstance(i.get("estimate"), dict)
        )

        # Group tasks by status
        tasks_by_status = {}
        for task in tasks:
            status = task.status or "Open"
            if status not in tasks_by_status:
                tasks_by_status[status] = 0
            tasks_by_status[status] += 1

        # Group Zenhub issues by status
        issues_by_status = {"done": 0, "in_progress": 0, "to_do": 0, "in_review": 0, "blocked": 0}
        for issue in all_issues:
            state = (issue.get("state") or "").lower()
            if state in ["closed", "done", "completed"]:
                issues_by_status["done"] += 1
            elif state in ["in_progress", "in progress", "working"]:
                issues_by_status["in_progress"] += 1
            elif state in ["review", "in_review"]:
                issues_by_status["in_review"] += 1
            elif state == "blocked":
                issues_by_status["blocked"] += 1
            else:
                issues_by_status["to_do"] += 1

        # Calculate health status
        completion_rate = (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0
        health_status = "healthy"
        if completion_rate < 30 and total_tasks > 0:
            health_status = "at_risk"
        elif issues_by_status["blocked"] / max(zenhub_total, 1) > 0.2:
            health_status = "blocked"

        result = {
            "success": True,
            "project_id": project_id,
            "project_name": project.project_name,
            "workspace_id": workspace_id,
            "workspace_name": workspace.get("name"),
            "tasks_summary": {
                "total": total_tasks,
                "completed": completed_tasks,
                "in_progress": in_progress_tasks,
                "completion_rate": round(completion_rate, 2),
                "by_status": tasks_by_status
            },
            "zenhub_summary": {
                "total_issues": zenhub_total,
                "completed_issues": zenhub_completed,
                "total_story_points": total_story_points,
                "completed_story_points": completed_story_points,
                "remaining_story_points": total_story_points - completed_story_points,
                "by_status": issues_by_status
            },
            "health_status": health_status,
            "recent_tasks": sorted(tasks, key=lambda x: x.exp_end_date or "", reverse=True)[:5],
            "_fetched_at": frappe.utils.now()
        }

        return result

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Project Summary Error",
            message=f"Unexpected error fetching project summary for {project_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }


@frappe.whitelist()
def get_task_summary(task_id: str) -> Dict[str, Any]:
    """
    Get task-specific summary with Zenhub issue details.

    Fetches task data and related Zenhub issue information
    for detailed task view.

    Args:
        task_id (str): The Frappe Task doctype name

    Returns:
        dict: JSON response containing task summary or error information
    """
    try:
        if not task_id:
            return {
                "success": False,
                "error": "task_id parameter is required",
                "error_type": "validation_error"
            }

        # Fetch task with permission check
        try:
            task = frappe.get_doc("Task", task_id)
            if not task.has_permission('read'):
                return {
                    "success": False,
                    "error": f"You do not have permission to access task '{task_id}'",
                    "error_type": "permission_error"
                }
        except frappe.DoesNotExistError:
            return {
                "success": False,
                "error": f"Task '{task_id}' not found",
                "error_type": "validation_error"
            }

        # Get project and workspace info
        project = None
        workspace_id = None
        if task.project:
            try:
                project = frappe.get_doc("Project", task.project)
                workspace_id = project.get("custom_zenhub_workspace_id")
            except Exception:
                pass

        # Base task data
        task_data = {
            "task_id": task.name,
            "subject": task.subject,
            "description": task.description,
            "status": task.status,
            "priority": task.priority,
            "progress": task.progress or 0,
            "type": task.type,
            "project": task.project,
            "project_name": project.project_name if project else None,
            "expected_start_date": task.exp_start_date,
            "expected_end_date": task.exp_end_date,
            "completed_on": task.completed_on
        }

        # Fetch related activity/timeline
        activity = frappe.get_all(
            "Activity Log",
            filters={
                "reference_doctype": "Task",
                "reference_name": task_id
            },
            fields=["creation", "content", "operation"],
            order_by="creation desc",
            limit=10
        )

        # If we have a workspace, try to find related Zenhub issues
        zenhub_related = None
        if workspace_id:
            # Search for issues related to this task
            variables = {"workspaceId": workspace_id}
            try:
                response_data = execute_graphql_query(get_workspace_issues_query(), variables)
                workspace = response_data.get("workspace", {})
                all_issues = workspace.get("issues", {}).get("nodes", [])

                # Find issues that might be related
                task_name_normalized = task_id.lower().replace("-", " ")
                related_issues = []
                for issue in all_issues[:50]:
                    issue_title = (issue.get("title") or "").lower()
                    if task_name_normalized in issue_title or issue_title in task_name_normalized:
                        estimate = issue.get("estimate") or {}
                        points = estimate.get("value", 0) if isinstance(estimate, dict) else 0
                        related_issues.append({
                            "id": issue.get("id"),
                            "title": issue.get("title"),
                            "number": issue.get("number"),
                            "state": issue.get("state"),
                            "story_points": points,
                            "repository": issue.get("repository", {}).get("name"),
                            "html_url": issue.get("htmlUrl")
                        })

                if related_issues:
                    zenhub_related = {
                        "workspace_id": workspace_id,
                        "workspace_name": workspace.get("name"),
                        "related_issues": related_issues
                    }
            except Exception:
                pass

        # Calculate task metrics
        days_until_due = None
        if task.exp_end_date:
            from datetime import date
            due_date = task.exp_end_date if isinstance(task.exp_end_date, date) else date.fromisoformat(str(task.exp_end_date))
            today = date.today()
            days_until_due = (due_date - today).days

        # Determine task health
        task_health = "on_track"
        if task.status in ["Completed", "Closed"]:
            task_health = "completed"
        elif days_until_due is not None and days_until_due < 0:
            task_health = "overdue"
        elif task.status in ["Open", "Pending"] and task.progress == 0:
            task_health = "not_started"
        elif task.status in ["Working", "In Progress"] and task.progress < 50 and days_until_due is not None and days_until_due < 3:
            task_health = "at_risk"

        result = {
            "success": True,
            "task": task_data,
            "activity": [
                {
                    "date": a.creation,
                    "content": a.content,
                    "operation": a.operation
                }
                for a in activity
            ],
            "zenhub": zenhub_related,
            "metrics": {
                "progress": task.progress or 0,
                "days_until_due": days_until_due,
                "health": task_health,
                "is_overdue": days_until_due is not None and days_until_due < 0,
                "is_completed": task.status in ["Completed", "Closed"]
            },
            "_fetched_at": frappe.utils.now()
        }

        return result

    except frappe.AuthenticationError as e:
        return {"success": False, "error": str(e), "error_type": "authentication_error"}
    except frappe.ValidationError as e:
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except Exception as e:
        frappe.log_error(
            title="Zenhub Task Summary Error",
            message=f"Unexpected error fetching task summary for {task_id}: {str(e)}"
        )
        return {
            "success": False,
            "error": f"An unexpected error occurred: {str(e)}",
            "error_type": "api_error"
        }