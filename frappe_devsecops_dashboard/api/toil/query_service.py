"""
Shared query helpers for TOIL modules and hooks.
"""

from __future__ import annotations

from typing import Any, Dict, List

import frappe
from frappe.utils import add_days, cstr, flt, getdate

from frappe_devsecops_dashboard.constants import TOIL_LEAVE_TYPE


def get_allocation_balance(allocation_name: str) -> float:
    """Get remaining leave balance for a specific allocation."""
    if not allocation_name:
        return 0.0

    rows = frappe.db.sql(
        """
        SELECT COALESCE(SUM(leaves), 0) AS balance
        FROM `tabLeave Ledger Entry`
        WHERE transaction_name = %(allocation)s
          AND docstatus = 1
        """,
        {"allocation": allocation_name},
        as_dict=True,
    )
    return flt((rows[0] or {}).get("balance") if rows else 0, 3)


def get_available_toil_allocations(employee: str) -> List[Dict[str, Any]]:
    """
    Return active TOIL allocations in FIFO order with remaining balances.
    """
    if not employee:
        return []

    rows = frappe.db.sql(
        """
        SELECT
            la.name,
            la.employee,
            la.from_date,
            la.to_date,
            la.new_leaves_allocated AS allocated,
            la.source_timesheet,
            COALESCE(SUM(lle.leaves), 0) AS balance
        FROM `tabLeave Allocation` la
        LEFT JOIN `tabLeave Ledger Entry` lle
            ON lle.transaction_name = la.name
           AND lle.docstatus = 1
           AND (lle.is_expired IS NULL OR lle.is_expired = 0)
        WHERE la.employee = %(employee)s
          AND la.leave_type = %(leave_type)s
          AND la.is_toil_allocation = 1
          AND la.docstatus = 1
          AND la.to_date >= %(today)s
        GROUP BY
            la.name,
            la.employee,
            la.from_date,
            la.to_date,
            la.new_leaves_allocated,
            la.source_timesheet
        HAVING balance > 0
        ORDER BY la.from_date ASC, la.creation ASC
        """,
        {
            "employee": employee,
            "leave_type": TOIL_LEAVE_TYPE,
            "today": getdate(),
        },
        as_dict=True,
    )

    today = getdate()
    allocations: List[Dict[str, Any]] = []
    for row in rows:
        row = dict(row)
        row["allocated"] = flt(row.get("allocated") or 0, 3)
        row["balance"] = flt(row.get("balance") or 0, 3)
        row["days_until_expiry"] = (row["to_date"] - today).days if row.get("to_date") else None
        allocations.append(row)

    return allocations


def get_employee_for_user(user: str | None = None) -> str | None:
    """Resolve Employee docname from User."""
    user_id = user or frappe.session.user
    if not user_id:
        return None
    return frappe.db.get_value("Employee", {"user_id": user_id}, "name")


def get_leave_ledger_report(
    employee: str,
    from_date: Any = None,
    to_date: Any = None,
    leave_type: str = TOIL_LEAVE_TYPE,
    employee_status: str = "Active",
) -> Dict[str, Any]:
    """
    Execute the Leave Ledger report and return normalized rows.

    A 120-day window is used by default to match TOIL UX/reporting scope.
    """
    if not employee:
        return {
            "rows": [],
            "columns": [],
            "total_balance": 0.0,
            "from_date": None,
            "to_date": None,
        }

    to_dt = getdate(to_date or getdate())
    from_dt = getdate(from_date or add_days(to_dt, -120))

    filters = {
        "employee": employee,
        "from_date": from_dt,
        "to_date": to_dt,
        "leave_type": leave_type,
        "employee_status": employee_status,
    }

    rows = frappe.db.sql(
        """
        SELECT
            lle.name AS ledger_entry,
            lle.creation AS date,
            lle.from_date,
            lle.to_date,
            lle.transaction_type,
            lle.transaction_name,
            lle.leaves,
            lle.is_expired
        FROM `tabLeave Ledger Entry` lle
        WHERE lle.employee = %(employee)s
          AND lle.leave_type = %(leave_type)s
          AND lle.docstatus = 1
          AND lle.from_date <= %(to_date)s
          AND COALESCE(lle.to_date, lle.from_date) >= %(from_date)s
          AND (lle.is_expired IS NULL OR lle.is_expired = 0)
        ORDER BY lle.creation DESC
        """,
        {
            "employee": employee,
            "leave_type": leave_type,
            "from_date": from_dt,
            "to_date": to_dt,
        },
        as_dict=True,
    )

    normalized_rows: List[Dict[str, Any]] = []
    for row in rows:
        item = dict(row)
        item["leaves"] = flt(item.get("leaves") or 0, 3)
        for key in ("date", "from_date", "to_date"):
            if item.get(key):
                item[key] = cstr(item.get(key))
        normalized_rows.append(item)

    total_balance = flt(
        sum(flt(r.get("leaves") or 0, 3) for r in normalized_rows),
        3,
    )

    return {
        "rows": normalized_rows,
        "columns": [],
        "total_balance": flt(total_balance, 3),
        "from_date": cstr(from_dt),
        "to_date": cstr(to_dt),
        "filters": filters,
    }
