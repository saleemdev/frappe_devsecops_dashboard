"""
Software Product Zenhub Workspace Hook

This module handles automatic creation of Zenhub workspaces when a Software Product
is created or saved. The workspace name follows the format: DSO-{docname}

When a Software Product is saved without a zenhub_workspace_id, this hook will:
1. Create a new Zenhub workspace with name "DSO-{docname}"
2. Update the Software Product's zenhub_workspace_id field with the created workspace ID
"""

import frappe
from frappe import _
from frappe.utils import cint
from frappe_devsecops_dashboard.api.zenhub import get_zenhub_token, execute_graphql_query, ZENHUB_GRAPHQL_ENDPOINT


def search_workspace_by_name(workspace_name: str) -> dict:
    """
    Search for an existing Zenhub workspace by name.
    
    Args:
        workspace_name (str): Name of the workspace to search for
        
    Returns:
        dict: Workspace data if found, None otherwise
    """
    query = """
    query SearchWorkspaces($query: String!) {
      viewer {
        searchWorkspaces(query: $query) {
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
            {"query": workspace_name},
            log_to_db=True,
            reference_doctype="Software Product",
            reference_docname=workspace_name,
            operation_name="searchWorkspaces"
        )
        
        if "viewer" in result and "searchWorkspaces" in result["viewer"]:
            workspaces = result["viewer"]["searchWorkspaces"].get("nodes", [])
            # Find exact match
            for workspace in workspaces:
                if workspace.get("name") == workspace_name:
                    return workspace
        return None
    except Exception as e:
        frappe.logger().warning(f"Error searching for workspace '{workspace_name}': {str(e)}")
        return None


def get_zenhub_organization_id() -> str:
    """
    Get the Zenhub organization ID.
    
    Tries multiple methods:
    1. From Zenhub Settings (if configured)
    2. From an existing workspace (if available)
    3. Falls back to hardcoded value if available
    
    Returns:
        str: Organization ID
        
    Raises:
        frappe.ValidationError: If organization ID cannot be retrieved
    """
    # Method 1: Try to get from Zenhub Settings
    try:
        settings = frappe.get_single("Zenhub Settings")
        if hasattr(settings, "zenhub_organization_id") and settings.zenhub_organization_id:
            frappe.logger().info(f"Using organization ID from Zenhub Settings: {settings.zenhub_organization_id}")
            return settings.zenhub_organization_id
    except Exception as e:
        frappe.logger().debug(f"Could not get org ID from settings: {str(e)}")
    
    # Method 2: Fallback to hardcoded value
    # This is the organization ID used in zenhub_workspace_setup.py
    # Users can override this by setting zenhub_organization_id in Zenhub Settings
    fallback_org_id = "Z2lkOi8vcmFwdG9yL1plbmh1Yk9yZ2FuaXphdGlvbi8xNDUwNjY"
    frappe.logger().info(f"Using organization ID: {fallback_org_id}")
    return fallback_org_id


def create_zenhub_workspace(workspace_name: str, description: str = None) -> dict:
    """
    Create a new Zenhub workspace using GraphQL mutation.
    
    First checks if a workspace with the same name already exists.
    
    Args:
        workspace_name (str): Name of the workspace to create (format: DSO-{docname})
        description (str, optional): Description for the workspace
        
    Returns:
        dict: Created workspace data with ID
        
    Raises:
        frappe.ValidationError: If workspace creation fails
    """
    # First, check if workspace already exists
    existing_workspace = search_workspace_by_name(workspace_name)
    if existing_workspace:
        frappe.logger().info(
            f"Workspace '{workspace_name}' already exists with ID: {existing_workspace['id']}"
        )
        return {
            "success": True,
            "workspace": existing_workspace,
            "already_exists": True
        }
    
    # Get organization ID (required for workspace creation)
    try:
        org_id = get_zenhub_organization_id()
    except Exception as e:
        frappe.log_error(
            title="Zenhub Organization ID Error",
            message=f"Failed to get organization ID for workspace creation: {str(e)}"
        )
        frappe.throw(
            _("Failed to get Zenhub organization ID: {0}").format(str(e)),
            frappe.ValidationError
        )
    
    # Try to create workspace via GraphQL mutation
    mutation = """
    mutation CreateWorkspace($name: String!, $description: String, $orgId: ID!) {
      createWorkspace(input: {
        name: $name
        description: $description
        zenhubOrganizationId: $orgId
      }) {
        workspace {
          id
          name
          description
          createdAt
        }
      }
    }
    """
    
    variables = {
        "name": workspace_name,
        "description": description or f"Workspace for {workspace_name}",
        "orgId": org_id
    }
    
    try:
        result = execute_graphql_query(
            mutation,
            variables,
            log_to_db=True,
            reference_doctype="Software Product",
            reference_docname=workspace_name,
            operation_name="createWorkspace"
        )
        
        # Check for GraphQL errors at the top level
        if "errors" in result:
            error_messages = [err.get("message", "Unknown error") for err in result["errors"]]
            error_msg = "; ".join(error_messages)
            frappe.log_error(
                title="Zenhub Workspace Creation Error",
                message=f"Failed to create workspace '{workspace_name}': {error_msg}"
            )
            frappe.throw(
                _("Failed to create Zenhub workspace: {0}").format(error_msg),
                frappe.ValidationError
            )
        
        if "createWorkspace" in result:
            workspace_data = result["createWorkspace"]
            workspace = workspace_data.get("workspace")
            
            if workspace:
                frappe.logger().info(f"✅ Created Zenhub workspace: {workspace['name']} (ID: {workspace['id']})")
                return {
                    "success": True,
                    "workspace": workspace,
                    "already_exists": False
                }
            else:
                frappe.throw(
                    _("Workspace creation returned no workspace data"),
                    frappe.ValidationError
                )
        else:
            frappe.throw(
                _("Unexpected response format from Zenhub API"),
                frappe.ValidationError
            )
            
    except frappe.ValidationError:
        # Re-raise validation errors
        raise
    except Exception as e:
        frappe.log_error(
            title="Zenhub Workspace Creation Error",
            message=f"Failed to create workspace '{workspace_name}': {str(e)}"
        )
        frappe.throw(
            _("Error creating Zenhub workspace: {0}").format(str(e)),
            frappe.ValidationError
        )


def handle_software_product_zenhub_workspace(doc, method=None):
    """
    Hook for Software Product before_save event.
    
    Automatically creates a Zenhub workspace when a Software Product is saved
    if the zenhub_workspace_id field is empty. The workspace name will be "DSO-{docname}".
    
    Args:
        doc: The Software Product document
        method: The hook method name (before_save)
    """
    try:
        # Skip if workspace ID already exists
        if doc.zenhub_workspace_id:
            frappe.logger().debug(
                f"[Software Product Zenhub] Product {doc.name} already has workspace ID: {doc.zenhub_workspace_id}"
            )
            return
        
        # Generate workspace name: DSO-{docname}
        # For new documents, docname will be generated from product_name (autoname field)
        # So we use product_name for new documents, and doc.name for existing ones
        product_identifier = doc.name if doc.name else doc.product_name
        
        if doc.is_new():
            if not doc.product_name:
                frappe.logger().debug(
                    f"[Software Product Zenhub] Skipping workspace creation - product_name required for new documents"
                )
                return
            # For new documents, use product_name (which will become docname after save)
            workspace_name = f"DSO-{doc.product_name}"
        else:
            # For existing documents, use docname
            workspace_name = f"DSO-{doc.name}"
        
        # Generate description - Zenhub has a 144 character limit
        product_name = doc.product_name or doc.name or "Unknown Product"
        description = f"Zenhub workspace for Software Product: {product_name}"
        
        # Add product description if available (truncate to fit 144 char limit)
        if doc.description:
            desc_text = frappe.utils.strip_html(doc.description)
            # Reserve space for prefix and truncation
            max_desc_length = 100  # Leave room for prefix text
            if len(desc_text) > max_desc_length:
                desc_text = desc_text[:max_desc_length] + "..."
            description = f"{description}. {desc_text}"
        
        # Ensure description doesn't exceed 144 characters
        if len(description) > 144:
            description = description[:141] + "..."
        
        frappe.logger().info(
            f"[Software Product Zenhub] Creating workspace '{workspace_name}' for product {product_identifier}"
        )
        
        # Create workspace (or find existing)
        result = create_zenhub_workspace(workspace_name, description)
        
        if result.get("success") and result.get("workspace"):
            workspace_id = result["workspace"]["id"]
            already_exists = result.get("already_exists", False)
            
            # Update the document directly (before_save allows direct field assignment)
            doc.zenhub_workspace_id = workspace_id
            
            if already_exists:
                frappe.logger().info(
                    f"[Software Product Zenhub] ✅ Found existing workspace '{workspace_name}' "
                    f"(ID: {workspace_id}) for product {product_identifier}"
                )
                frappe.msgprint(
                    _("Zenhub workspace '{0}' already exists. Using existing workspace ID: {1}").format(
                        workspace_name,
                        workspace_id
                    ),
                    indicator="blue",
                    title=_("Zenhub Workspace Found")
                )
            else:
                frappe.logger().info(
                    f"[Software Product Zenhub] ✅ Successfully created workspace '{workspace_name}' "
                    f"(ID: {workspace_id}) for product {product_identifier}"
                )
                frappe.msgprint(
                    _("Zenhub workspace '{0}' created successfully. Workspace ID: {1}").format(
                        workspace_name,
                        workspace_id
                    ),
                    indicator="green",
                    title=_("Zenhub Workspace Created")
                )
        else:
            product_identifier = doc.name if doc.name else doc.product_name
            frappe.log_error(
                title="Zenhub Workspace Creation Failed",
                message=f"Failed to create workspace for Software Product {product_identifier}. Result: {result}"
            )
            frappe.msgprint(
                _("Failed to create Zenhub workspace. Please check Error Log for details."),
                indicator="orange",
                title=_("Zenhub Workspace Creation Failed")
            )
    
    except frappe.ValidationError as e:
        # Log and show user-friendly error
        product_identifier = doc.name if doc.name else doc.product_name
        frappe.log_error(
            title="Zenhub Workspace Creation Error",
            message=f"Validation error creating workspace for Software Product {product_identifier}: {str(e)}"
        )
        frappe.msgprint(
            _("Could not create Zenhub workspace: {0}").format(str(e)),
            indicator="red",
            title=_("Zenhub Workspace Creation Error")
        )
        # Don't prevent document save - just log the error
        return
    
    except Exception as e:
        # Log error but don't prevent document save
        product_identifier = doc.name if doc.name else doc.product_name
        frappe.log_error(
            title="Zenhub Workspace Creation Error",
            message=f"Unexpected error creating workspace for Software Product {product_identifier}: {str(e)}"
        )
        frappe.msgprint(
            _("An error occurred while creating Zenhub workspace. Please check Error Log for details."),
            indicator="orange",
            title=_("Zenhub Workspace Creation Error")
        )
        # Don't prevent document save
        return

