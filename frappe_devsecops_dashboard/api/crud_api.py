"""
Thin CRUD API router for frappe_devsecops_dashboard.

Exposes generic CRUD for any DocType. Keeps the API layer organized.

Call from frontend:
  GET  /api/method/frappe_devsecops_dashboard.api.crud_api.crud_list?doctype=Change Management Team
  GET  /api/method/frappe_devsecops_dashboard.api.crud_api.crud_get?doctype=Change Management Team&name=xxx
  POST /api/method/frappe_devsecops_dashboard.api.crud_api.crud_create
  PUT  /api/method/frappe_devsecops_dashboard.api.crud_api.crud_update
  POST /api/method/frappe_devsecops_dashboard.api.crud_api.crud_delete
"""

import json
import frappe
from .crud_base import crud_list, crud_get, crud_create, crud_update, crud_delete


def _parse_kwargs(kwargs):
    """Parse kwargs - Frappe sends JSON body as string sometimes."""
    out = dict(kwargs)
    out.pop("cmd", None)
    for key in ("filters", "data", "fields"):
        if key in out and isinstance(out[key], str):
            try:
                out[key] = json.loads(out[key])
            except (json.JSONDecodeError, TypeError):
                pass
    return out


@frappe.whitelist(methods=["GET"])
def crud_list_endpoint(doctype=None, **kwargs):
    """List documents. GET params: doctype, filters, fields, order_by, limit_page_length, limit_start."""
    kwargs = _parse_kwargs(kwargs)
    doctype = doctype or kwargs.get("doctype")
    if not doctype:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "doctype is required", "error_type": "validation_error"}
    return crud_list(doctype, **kwargs)


@frappe.whitelist(methods=["GET"])
def crud_get_endpoint(doctype=None, name=None, **kwargs):
    """Get one document. GET params: doctype, name, fields."""
    kwargs = _parse_kwargs(kwargs)
    doctype = doctype or kwargs.get("doctype")
    name = name or kwargs.get("name")
    if not doctype or not name:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "doctype and name are required", "error_type": "validation_error"}
    return crud_get(doctype, name, **kwargs)


@frappe.whitelist(methods=["POST"])
def crud_create_endpoint(doctype=None, **kwargs):
    """Create document. POST body: doctype, and all DocType fields."""
    kwargs = _parse_kwargs(kwargs)
    doctype = doctype or kwargs.get("doctype")
    if not doctype:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "doctype is required", "error_type": "validation_error"}
    data = {k: v for k, v in kwargs.items() if k not in ("doctype", "cmd")}
    return crud_create(doctype, data, **kwargs)


@frappe.whitelist(methods=["PUT", "PATCH", "POST"])
def crud_update_endpoint(doctype=None, name=None, **kwargs):
    """Update document. Body: doctype, name, and fields to update."""
    kwargs = _parse_kwargs(kwargs)
    doctype = doctype or kwargs.get("doctype")
    name = name or kwargs.get("name")
    if not doctype or not name:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "doctype and name are required", "error_type": "validation_error"}
    data = {k: v for k, v in kwargs.items() if k not in ("doctype", "name", "cmd")}
    return crud_update(doctype, name, data, **kwargs)


@frappe.whitelist(methods=["DELETE", "POST"])
def crud_delete_endpoint(doctype=None, name=None, force=0, **kwargs):
    """Delete document. Params: doctype, name, force (optional)."""
    kwargs = _parse_kwargs(kwargs)
    doctype = doctype or kwargs.get("doctype")
    name = name or kwargs.get("name")
    if not doctype or not name:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "doctype and name are required", "error_type": "validation_error"}
    return crud_delete(doctype, name, force=bool(force), **kwargs)
