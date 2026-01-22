"""
Zenhub GraphQL API Logger Wrapper

This module wraps Zenhub GraphQL API calls with comprehensive logging
to track all API interactions for debugging and monitoring.

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import frappe
import requests
import time
import traceback
import json
from typing import Dict, Any, Optional, Tuple
from frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.zenhub_graphql_api_log.zenhub_graphql_api_log import (
    create_zenhub_api_log,
    log_zenhub_success,
    log_zenhub_error
)

ZENHUB_GRAPHQL_ENDPOINT = "https://api.zenhub.com/public/graphql"


def execute_graphql_query_with_logging(
    query: str,
    variables: Optional[Dict[str, Any]],
    reference_doctype: str,
    reference_docname: str,
    operation_name: str,
    operation_type: str = "Mutation",
    token: Optional[str] = None
) -> Tuple[Dict[str, Any], bool]:
    """
    Execute a GraphQL query/mutation with comprehensive logging

    Args:
        query: GraphQL query/mutation string
        variables: Variables for the query
        reference_doctype: DocType being operated on (Software Product, Project, Task)
        reference_docname: Name of the document
        operation_name: Name of the operation (e.g., "createWorkspace", "createIssue")
        operation_type: Query, Mutation, or Subscription
        token: Zenhub API token (if not provided, will be fetched)

    Returns:
        Tuple of (response_data, success_bool)
    """
    start_time = time.time()
    http_status_code = None
    response_data = None
    error_message = None

    try:
        # Get token if not provided
        if not token:
            from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token
            token = get_zenhub_token()

        # Prepare request payload
        request_payload = {
            "query": query,
            "variables": variables or {}
        }

        # Make API request
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }

        response = requests.post(
            ZENHUB_GRAPHQL_ENDPOINT,
            json=request_payload,
            headers=headers,
            timeout=30
        )

        http_status_code = response.status_code
        response_time_ms = int((time.time() - start_time) * 1000)

        # Parse response
        try:
            response_data = response.json()
        except:
            response_data = {"raw_response": response.text}

        # Check for success
        if http_status_code == 200 and "errors" not in response_data:
            # Success - log directly
            log_zenhub_success(
                reference_doctype=reference_doctype,
                reference_docname=reference_docname,
                operation_type=operation_type,
                graphql_operation=operation_name,
                request_payload=request_payload,
                response_data=response_data,
                http_status_code=http_status_code,
                response_time_ms=response_time_ms
            )
            return response_data, True

        else:
            # GraphQL errors or HTTP errors
            if "errors" in response_data:
                error_message = "; ".join([err.get("message", "Unknown error") for err in response_data["errors"]])
            else:
                error_message = f"HTTP {http_status_code}: {response.text}"

            # Log error directly
            log_zenhub_error(
                reference_doctype=reference_doctype,
                reference_docname=reference_docname,
                operation_type=operation_type,
                graphql_operation=operation_name,
                request_payload=request_payload,
                error_message=error_message,
                http_status_code=http_status_code,
                response_data=response_data
            )
            return response_data, False

    except requests.exceptions.Timeout:
        response_time_ms = int((time.time() - start_time) * 1000)
        error_message = "Request timeout after 30 seconds"

        # Log timeout directly
        create_zenhub_api_log(
            reference_doctype=reference_doctype,
            reference_docname=reference_docname,
            operation_type=operation_type,
            graphql_operation=operation_name,
            status="Timeout",
            request_payload=request_payload,
            error_message=error_message,
            response_time_ms=response_time_ms
        )
        return {"error": error_message}, False

    except Exception as e:
        response_time_ms = int((time.time() - start_time) * 1000)
        error_message = str(e)
        error_traceback = traceback.format_exc()

        # Log error directly
        log_zenhub_error(
            reference_doctype=reference_doctype,
            reference_docname=reference_docname,
            operation_type=operation_type,
            graphql_operation=operation_name,
            request_payload=request_payload if 'request_payload' in locals() else {"query": query, "variables": variables},
            error_message=error_message,
            error_traceback=error_traceback,
            http_status_code=http_status_code
        )
        return {"error": error_message, "traceback": error_traceback}, False


def log_async_operation_start(
    reference_doctype: str,
    reference_docname: str,
    operation_name: str,
    operation_type: str = "Mutation"
) -> str:
    """
    Log the start of an asynchronous Zenhub operation

    Returns:
        Log document name for updating later
    """
    return create_zenhub_api_log(
        reference_doctype=reference_doctype,
        reference_docname=reference_docname,
        operation_type=operation_type,
        graphql_operation=operation_name,
        status="In Progress",
        request_payload={"note": "Asynchronous operation started"}
    )


def update_async_operation_log(
    log_name: str,
    status: str,
    response_data: Optional[Dict[str, Any]] = None,
    error_message: Optional[str] = None,
    http_status_code: Optional[int] = None
):
    """
    Update an existing log entry for async operations
    """
    try:
        log_doc = frappe.get_doc("Zenhub GraphQL API Log", log_name)
        log_doc.status = status

        if response_data:
            log_doc.response_data = json.dumps(response_data, indent=2)

        if error_message:
            log_doc.error_message = error_message

        if http_status_code:
            log_doc.http_status_code = http_status_code

        log_doc.save(ignore_permissions=True)
        frappe.db.commit()

    except Exception as e:
        frappe.log_error(
            title="Failed to Update Zenhub API Log",
            message=f"Log: {log_name}, Error: {str(e)}"
        )
