import frappe
from frappe import _
import json

@frappe.whitelist()
def save_timesheet(data):
    """Create a new Timesheet - matches Change Request pattern"""
    try:
        # Parse data (same as create_change_request)
        doc_data = json.loads(data) if isinstance(data, str) else data

        # Get employee for current user
        employee = frappe.db.get_value("Employee", {"user_id": frappe.session.user}, "name")
        if not employee:
            frappe.throw(_("No employee record found for user {0}").format(frappe.session.user))

        # Create document using frappe.get_doc pattern (same as create_change_request)
        doc = frappe.get_doc({
            "doctype": "Timesheet",
            "employee": employee,
            "start_date": doc_data["start_date"],
            "end_date": doc_data["end_date"],
            "time_logs": [
                {
                    "activity_type": "Execution",
                    "from_time": log["from_time"],
                    "to_time": log["to_time"],
                    "is_billable": 0,
                    "description": log.get("description", "")
                }
                for log in doc_data["time_logs"]
            ]
        })

        # Insert (NO commit needed - Frappe handles it)
        doc.insert()

        # Return same format as create_change_request
        return {
            "success": True,
            "data": doc.as_dict(),
            "message": _("Timesheet {0} created successfully").format(doc.name)
        }

    except Exception as e:
        frappe.log_error(f"Error creating timesheet: {str(e)}", "Timesheet API")
        return {
            "success": False,
            "error": str(e)
        }
