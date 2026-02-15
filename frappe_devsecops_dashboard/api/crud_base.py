"""
Simple CRUD base for frappe_devsecops_dashboard API layer.

Keeps DocType operations consistent. All CRUD goes through DocTypes -
no raw SQL, no bypassing validation.

Usage:
    from frappe_devsecops_dashboard.api.crud_base import crud_list, crud_get, crud_create, crud_update, crud_delete
"""

from __future__ import annotations

import json
import frappe
from typing import Any, Optional


def _parse_json(value: Any) -> Any:
    """Parse JSON string from Frappe kwargs (REST sends JSON as string)."""
    if value is None:
        return None
    if isinstance(value, str):
        try:
            return json.loads(value)
        except (json.JSONDecodeError, TypeError):
            return value
    return value


def _normalize_kwargs(kwargs: dict) -> dict:
    """Remove Frappe's cmd and parse JSON fields."""
    out = {k: v for k, v in kwargs.items() if k != "cmd"}
    for key in ("filters", "data", "fields", "order_by"):
        if key in out and isinstance(out[key], str):
            out[key] = _parse_json(out[key])
    return out


def crud_list(
    doctype: str,
    filters: dict | list | None = None,
    fields: list[str] | None = None,
    order_by: str | None = None,
    limit: int = 20,
    start: int = 0,
    **kwargs,
) -> dict:
    """
    List documents. Uses frappe.get_list (respects permissions).

    Returns: {success, data, total, page, page_size}
    """
    filters = filters or kwargs.get("filters") or []
    fields = fields or kwargs.get("fields") or ["name", "creation", "modified"]
    order_by = order_by or kwargs.get("order_by") or "modified desc"
    limit = min(int(kwargs.get("limit_page_length", kwargs.get("limit", limit))), 100)
    start = max(0, int(kwargs.get("limit_start", kwargs.get("start", start))))

    try:
        data = frappe.get_list(
            doctype,
            filters=filters,
            fields=fields,
            order_by=order_by,
            limit_page_length=limit,
            limit_start=start,
        )
        total = frappe.db.count(doctype, filters=filters)
        return {
            "success": True,
            "data": data,
            "total": total,
            "page": (start // limit) + 1,
            "page_size": limit,
        }
    except frappe.PermissionError as e:
        frappe.log_error(str(e), f"CRUD List {doctype}")
        frappe.response["http_status_code"] = 403
        return {"success": False, "error": str(e), "error_type": "permission_error"}
    except Exception as e:
        frappe.log_error(str(e), f"CRUD List {doctype}")
        frappe.response["http_status_code"] = 500
        return {"success": False, "error": str(e), "error_type": "server_error"}


def crud_get(doctype: str, name: str, fields: list[str] | None = None, **kwargs) -> dict:
    """
    Get a single document. Uses frappe.get_doc (respects permissions).

    Returns: {success, data} or {success, error, error_type}
    """
    if not name:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "Document name is required", "error_type": "validation_error"}

    try:
        if fields:
            doc = frappe.db.get_value(doctype, name, fields, as_dict=True)
            if not doc:
                frappe.response["http_status_code"] = 404
                return {"success": False, "error": f"Document {name} not found", "error_type": "not_found"}
        else:
            doc = frappe.get_doc(doctype, name)
            doc = doc.as_dict()
        return {"success": True, "data": doc}
    except frappe.DoesNotExistError:
        frappe.response["http_status_code"] = 404
        return {"success": False, "error": f"Document {name} not found", "error_type": "not_found"}
    except frappe.PermissionError as e:
        frappe.log_error(str(e), f"CRUD Get {doctype}")
        frappe.response["http_status_code"] = 403
        return {"success": False, "error": str(e), "error_type": "permission_error"}
    except Exception as e:
        frappe.log_error(str(e), f"CRUD Get {doctype}")
        frappe.response["http_status_code"] = 500
        return {"success": False, "error": str(e), "error_type": "server_error"}


def crud_create(doctype: str, data: dict, **kwargs) -> dict:
    """
    Create a document. Uses frappe.new_doc + insert.

    Returns: {success, data, message} or {success, error, error_type}
    """
    data = data or kwargs.get("data") or {}
    data = _normalize_kwargs({**kwargs, **data})
    data.pop("cmd", None)
    data.pop("doctype", None)

    try:
        doc = frappe.new_doc(doctype)
        doc.update(data)
        doc.insert()
        frappe.db.commit()
        frappe.response["http_status_code"] = 201
        return {"success": True, "data": doc.as_dict(), "message": "Created successfully"}
    except frappe.ValidationError as e:
        frappe.db.rollback()
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except frappe.DuplicateEntryError as e:
        frappe.db.rollback()
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except frappe.PermissionError as e:
        frappe.db.rollback()
        frappe.log_error(str(e), f"CRUD Create {doctype}")
        frappe.response["http_status_code"] = 403
        return {"success": False, "error": str(e), "error_type": "permission_error"}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), f"CRUD Create {doctype}")
        frappe.response["http_status_code"] = 500
        return {"success": False, "error": str(e), "error_type": "server_error"}


def crud_update(doctype: str, name: str, data: dict, **kwargs) -> dict:
    """
    Update a document. Uses frappe.get_doc + update + save.

    Returns: {success, data, message} or {success, error, error_type}
    """
    if not name:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "Document name is required", "error_type": "validation_error"}

    data = data or kwargs.get("data") or {}
    data = _normalize_kwargs({**kwargs, **data})
    data.pop("cmd", None)
    data.pop("doctype", None)
    data.pop("name", None)

    try:
        doc = frappe.get_doc(doctype, name)
        doc.update(data)
        doc.save()
        frappe.db.commit()
        return {"success": True, "data": doc.as_dict(), "message": "Updated successfully"}
    except frappe.DoesNotExistError:
        frappe.response["http_status_code"] = 404
        return {"success": False, "error": f"Document {name} not found", "error_type": "not_found"}
    except frappe.ValidationError as e:
        frappe.db.rollback()
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except frappe.PermissionError as e:
        frappe.db.rollback()
        frappe.log_error(str(e), f"CRUD Update {doctype}")
        frappe.response["http_status_code"] = 403
        return {"success": False, "error": str(e), "error_type": "permission_error"}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), f"CRUD Update {doctype}")
        frappe.response["http_status_code"] = 500
        return {"success": False, "error": str(e), "error_type": "server_error"}


def crud_delete(doctype: str, name: str, **kwargs) -> dict:
    """
    Delete a document. Uses frappe.delete_doc.

    Returns: {success, message} or {success, error, error_type}
    """
    if not name:
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": "Document name is required", "error_type": "validation_error"}

    try:
        frappe.delete_doc(doctype, name, force=kwargs.get("force", False))
        frappe.db.commit()
        return {"success": True, "message": "Deleted successfully"}
    except frappe.DoesNotExistError:
        frappe.response["http_status_code"] = 404
        return {"success": False, "error": f"Document {name} not found", "error_type": "not_found"}
    except frappe.ValidationError as e:
        frappe.db.rollback()
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except frappe.LinkExistsError as e:
        frappe.db.rollback()
        frappe.response["http_status_code"] = 400
        return {"success": False, "error": str(e), "error_type": "validation_error"}
    except frappe.PermissionError as e:
        frappe.db.rollback()
        frappe.log_error(str(e), f"CRUD Delete {doctype}")
        frappe.response["http_status_code"] = 403
        return {"success": False, "error": str(e), "error_type": "permission_error"}
    except Exception as e:
        frappe.db.rollback()
        frappe.log_error(str(e), f"CRUD Delete {doctype}")
        frappe.response["http_status_code"] = 500
        return {"success": False, "error": str(e), "error_type": "server_error"}
