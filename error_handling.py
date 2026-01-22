"""
Error Handling and Logging Module for all_trails App

This module provides centralized error handling and logging functionality
for the all_trails application.
"""

import frappe
import traceback
import logging
from datetime import datetime
from typing import Dict, Any, Optional

# Configure application logger
logger = logging.getLogger('all_trails')
logger.setLevel(logging.INFO)

# Create file handler for application logs
file_handler = logging.FileHandler('/tmp/all_trails.log')
file_handler.setLevel(logging.INFO)

# Create console handler for development
console_handler = logging.StreamHandler()
console_handler.setLevel(logging.INFO)

# Create formatter
formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')
file_handler.setFormatter(formatter)
console_handler.setFormatter(formatter)

# Add handlers to logger
if not logger.handlers:
    logger.addHandler(file_handler)
    logger.addHandler(console_handler)

class AppError(Exception):
    """Base exception class for all_trails application"""
    def __init__(self, message: str, error_code: str = "APP_ERROR", details: Optional[Dict] = None):
        super().__init__(message)
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.timestamp = datetime.utcnow()
        self.traceback_info = traceback.format_exc()

class ValidationError(AppError):
    """Exception for validation errors"""
    def __init__(self, message: str, field: str = None, details: Optional[Dict] = None):
        super().__init__(message, "VALIDATION_ERROR", details or {})
        self.field = field

class AuthenticationError(AppError):
    """Exception for authentication errors"""
    def __init__(self, message: str = "Authentication required", details: Optional[Dict] = None):
        super().__init__(message, "AUTH_ERROR", details or {})

class AuthorizationError(AppError):
    """Exception for authorization errors"""
    def __init__(self, message: str = "Insufficient permissions", details: Optional[Dict] = None):
        super().__init__(message, "AUTHORIZATION_ERROR", details or {})

class BusinessLogicError(AppError):
    """Exception for business logic errors"""
    def __init__(self, message: str, error_code: str = "BUSINESS_ERROR", details: Optional[Dict] = None):
        super().__init__(message, error_code, details or {})

class ExternalServiceError(AppError):
    """Exception for external service errors (e.g., payment gateways)"""
    def __init__(self, message: str, service: str = "EXTERNAL_SERVICE", details: Optional[Dict] = None):
        super().__init__(message, f"EXTERNAL_{service.upper()}_ERROR", details or {})

def log_error(error: Exception, context: str = "", user: str = None) -> str:
    """
    Log an error with context information
    
    Args:
        error: The exception object
        context: Context where the error occurred
        user: User associated with the error (if any)
    
    Returns:
        str: Unique error ID for tracking
    """
    import uuid
    
    error_id = str(uuid.uuid4())
    
    # Prepare log entry
    log_entry = {
        "error_id": error_id,
        "timestamp": datetime.utcnow().isoformat(),
        "context": context,
        "user": user or frappe.session.user if frappe.session else "Unknown",
        "error_type": type(error).__name__,
        "error_message": str(error),
        "traceback": traceback.format_exc() if hasattr(error, '__traceback__') else "No traceback"
    }
    
    # Log to file
    logger.error(f"ERROR_ID: {error_id} | CONTEXT: {context} | TYPE: {type(error).__name__} | MESSAGE: {str(error)}")
    
    # Also log to Frappe's error log
    frappe.log_error(
        message=f"all_trails App Error (ID: {error_id}): {str(error)}\nContext: {context}\nTraceback:\n{traceback.format_exc()}",
        title="all_trails App Error"
    )
    
    return error_id

def handle_error(error: Exception, context: str = "", user: str = None, reraise: bool = True):
    """
    Handle an error by logging it and optionally converting to AppError
    
    Args:
        error: The exception to handle
        context: Context where the error occurred
        user: User associated with the error
        reraise: Whether to reraise the error as AppError
    
    Returns:
        AppError if reraise is False, otherwise raises the converted error
    """
    # Log the error
    error_id = log_error(error, context, user)
    
    # Determine if this is already an AppError
    if isinstance(error, AppError):
        # Add error ID to existing AppError
        error.details['error_id'] = error_id
        if reraise:
            raise error
        return error
    
    # Convert standard exceptions to AppError
    if isinstance(error, frappe.ValidationError):
        app_error = ValidationError(str(error), details={"error_id": error_id})
    elif isinstance(error, frappe.AuthenticationError):
        app_error = AuthenticationError(str(error), details={"error_id": error_id})
    elif isinstance(error, frappe.PermissionError):
        app_error = AuthorizationError(str(error), details={"error_id": error_id})
    else:
        app_error = AppError(str(error), details={"error_id": error_id})
    
    if reraise:
        raise app_error
    return app_error

def log_info(message: str, context: str = "", user: str = None):
    """Log an informational message"""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "context": context,
        "user": user or frappe.session.user if frappe.session else "Unknown",
        "message": message
    }
    
    logger.info(f"CONTEXT: {context} | MESSAGE: {message}")
    
def log_warning(message: str, context: str = "", user: str = None):
    """Log a warning message"""
    log_entry = {
        "timestamp": datetime.utcnow().isoformat(),
        "context": context,
        "user": user or frappe.session.user if frappe.session else "Unknown",
        "message": message
    }
    
    logger.warning(f"CONTEXT: {context} | MESSAGE: {message}")

def validate_and_handle(func):
    """
    Decorator to wrap functions with error handling and validation
    """
    def wrapper(*args, **kwargs):
        context = f"{func.__module__}.{func.__name__}"
        user = frappe.session.user if frappe.session else None
        
        try:
            return func(*args, **kwargs)
        except AppError:
            # Re-raise AppErrors as-is
            raise
        except Exception as e:
            # Handle unexpected errors
            handle_error(e, context=context, user=user)
    return wrapper

# Error response utilities
def create_error_response(message: str, error_code: str = "GENERAL_ERROR", 
                         details: Optional[Dict] = None, status_code: int = 500) -> Dict[str, Any]:
    """
    Create a standardized error response
    
    Args:
        message: Error message to return
        error_code: Code identifying the error type
        details: Additional error details
        status_code: HTTP status code
    
    Returns:
        Dict containing error response
    """
    import uuid
    error_id = str(uuid.uuid4())
    
    response = {
        "success": False,
        "error": {
            "id": error_id,
            "message": message,
            "code": error_code,
            "details": details or {},
            "timestamp": datetime.utcnow().isoformat()
        }
    }
    
    # Set status code in Frappe response
    frappe.local.response['http_status_code'] = status_code
    
    return response

def create_success_response(data: Any = None, message: str = "Success", 
                          details: Optional[Dict] = None) -> Dict[str, Any]:
    """
    Create a standardized success response
    
    Args:
        data: Data to return
        message: Success message
        details: Additional details
    
    Returns:
        Dict containing success response
    """
    response = {
        "success": True,
        "data": data,
        "message": message,
        "details": details or {},
        "timestamp": datetime.utcnow().isoformat()
    }
    
    return response

# Specific error handlers for common operations
def handle_validation_errors(validation_errors: list) -> Dict[str, Any]:
    """
    Handle multiple validation errors
    
    Args:
        validation_errors: List of validation error messages
    
    Returns:
        Dict containing error response
    """
    error_details = {
        "validation_errors": validation_errors,
        "error_count": len(validation_errors)
    }
    
    return create_error_response(
        "Validation failed",
        "VALIDATION_ERROR",
        error_details,
        400
    )

def handle_not_found(resource_type: str, resource_id: str) -> Dict[str, Any]:
    """
    Handle resource not found errors
    
    Args:
        resource_type: Type of resource (e.g., 'Trail', 'Booking')
        resource_id: ID of the resource
    
    Returns:
        Dict containing error response
    """
    return create_error_response(
        f"{resource_type} with ID '{resource_id}' not found",
        "RESOURCE_NOT_FOUND",
        {"resource_type": resource_type, "resource_id": resource_id},
        404
    )

def handle_permission_error(operation: str, resource_type: str = None) -> Dict[str, Any]:
    """
    Handle permission errors
    
    Args:
        operation: Operation that was denied
        resource_type: Type of resource involved (optional)
    
    Returns:
        Dict containing error response
    """
    message = f"Permission denied for operation: {operation}"
    if resource_type:
        message += f" on {resource_type}"
    
    return create_error_response(
        message,
        "PERMISSION_DENIED",
        {"operation": operation, "resource_type": resource_type},
        403
    )

# Example usage in API endpoints
EXAMPLE_USAGE = '''
from all_trails.utils.error_handling import (
    handle_error, log_error, create_error_response, create_success_response,
    ValidationError, AuthenticationError, AuthorizationError
)

@frappe.whitelist()
def get_trail_detail(trail_id):
    try:
        # Validate input
        if not trail_id:
            raise ValidationError("Trail ID is required", field="trail_id")
        
        # Check authentication
        if frappe.session.user == "Guest":
            raise AuthenticationError("Login required to view trail details")
        
        # Check authorization if needed
        # (e.g., if trail is private)
        
        # Perform operation
        trail = frappe.get_doc("Trail", trail_id)
        
        return create_success_response(
            data=trail.as_dict(),
            message="Trail retrieved successfully"
        )
        
    except ValidationError as e:
        log_error(e, "get_trail_detail", frappe.session.user)
        return create_error_response(
            str(e),
            e.error_code,
            e.details,
            400
        )
    except Exception as e:
        error_id = log_error(e, "get_trail_detail", frappe.session.user)
        return create_error_response(
            "An error occurred while retrieving the trail",
            "INTERNAL_ERROR",
            {"error_id": error_id},
            500
        )
'''