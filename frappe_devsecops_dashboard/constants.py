"""
TOIL System Constants

Centralized configuration to avoid hardcoded strings throughout codebase.
"""

# Leave Type name for TOIL
TOIL_LEAVE_TYPE = "Time Off in Lieu"


# TOIL Status values (must match custom field options in patches/v1_0/setup_toil.py)
class TOILStatus:
    """TOIL status values for Timesheet.toil_status field"""

    # Timesheet has no TOIL or not yet calculated
    NOT_APPLICABLE = "Not Applicable"

    # Timesheet has TOIL hours, pending supervisor approval
    PENDING_ACCRUAL = "Pending Accrual"

    # TOIL approved and allocation created
    ACCRUED = "Accrued"

    # Part of allocation has been consumed
    PARTIALLY_USED = "Partially Used"

    # All allocation has been consumed
    FULLY_USED = "Fully Used"

    # Allocation expired (past to_date)
    EXPIRED = "Expired"

    # Supervisor rejected TOIL request
    REJECTED = "Rejected"

    # Timesheet or allocation cancelled
    CANCELLED = "Cancelled"

    @classmethod
    def all(cls):
        """Get all valid status values"""
        return [
            cls.NOT_APPLICABLE,
            cls.PENDING_ACCRUAL,
            cls.ACCRUED,
            cls.PARTIALLY_USED,
            cls.FULLY_USED,
            cls.EXPIRED,
            cls.REJECTED,
            cls.CANCELLED
        ]
