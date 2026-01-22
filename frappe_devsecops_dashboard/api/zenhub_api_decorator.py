"""
Zenhub API Logging Decorator

Provides a decorator to automatically log Zenhub API calls to the database.

Author: Frappe DevSecOps Dashboard
License: MIT
"""

import frappe
import time
import traceback
from functools import wraps
from typing import Any, Callable, Dict, Optional
from frappe_devsecops_dashboard.frappe_devsecops_dashboard.doctype.zenhub_graphql_api_log.zenhub_graphql_api_log import (
    create_zenhub_api_log
)


def log_zenhub_api_call(
    operation_name: str,
    reference_doctype: str = "Zenhub API Call",
    get_reference_docname: Optional[Callable] = None
):
    """
    Decorator to log Zenhub API calls automatically.

    Usage:
        @frappe.whitelist()
        @log_zenhub_api_call(
            operation_name="getWorkspaceSummary",
            reference_doctype="Software Product",
            get_reference_docname=lambda kwargs: kwargs.get("workspace_id")
        )
        def get_workspace_summary(workspace_id: str):
            # Your function code
            pass

    Args:
        operation_name: Name of the operation (e.g., "getWorkspaceSummary")
        reference_doctype: DocType being operated on
        get_reference_docname: Function to extract document name from kwargs

    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs) -> Any:
            start_time = time.time()
            response_data = None
            status = "Success"
            error_message = None
            http_status_code = 200

            # Get reference document name
            reference_docname = "API Call"
            if get_reference_docname and callable(get_reference_docname):
                try:
                    reference_docname = get_reference_docname(kwargs)
                except:
                    pass

            # Extract request details
            request_payload = {
                "function": func.__name__,
                "args": str(args)[:500],  # Truncate to avoid huge logs
                "kwargs": {k: str(v)[:200] for k, v in kwargs.items()}  # Truncate values
            }

            try:
                # Execute the function
                result = func(*args, **kwargs)
                response_data = result

                # Check if result indicates failure
                if isinstance(result, dict):
                    if not result.get("success", True):
                        status = "Failed"
                        error_message = result.get("error", "Unknown error")
                        http_status_code = 400

                return result

            except frappe.AuthenticationError as e:
                status = "Failed"
                error_message = str(e)
                http_status_code = 401
                raise

            except frappe.ValidationError as e:
                status = "Error"
                error_message = str(e)
                http_status_code = 400
                raise

            except Exception as e:
                status = "Error"
                error_message = str(e)
                http_status_code = 500
                raise

            finally:
                response_time_ms = int((time.time() - start_time) * 1000)

                # Log to database directly
                try:
                    create_zenhub_api_log(
                        reference_doctype=reference_doctype,
                        reference_docname=reference_docname or "API Call",
                        operation_type="Query",
                        graphql_operation=operation_name,
                        status=status,
                        request_payload=request_payload,
                        response_data=response_data if isinstance(response_data, dict) else {"result": str(response_data)[:1000]},
                        http_status_code=http_status_code,
                        response_time_ms=response_time_ms,
                        error_message=error_message,
                        error_traceback=traceback.format_exc() if error_message else None
                    )
                except Exception as log_error:
                    # Don't fail the main operation if logging fails
                    frappe.log_error(
                        title="Zenhub API Logging Failed",
                        message=f"Failed to log API call: {str(log_error)}"
                    )

        return wrapper
    return decorator


def log_button_click(operation_name: str):
    """
    Simplified decorator for frontend button clicks that trigger API calls.

    Usage:
        @frappe.whitelist()
        @log_button_click("viewWorkspaceSummary")
        def get_workspace_summary(workspace_id: str):
            pass

    Args:
        operation_name: Name of the button/operation

    Returns:
        Decorated function
    """
    return log_zenhub_api_call(
        operation_name=operation_name,
        reference_doctype="UI Interaction",
        get_reference_docname=lambda kwargs: frappe.session.user
    )
