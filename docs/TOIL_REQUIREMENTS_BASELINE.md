# TOIL Requirements Baseline

## Purpose
This document is the single source of truth for TOIL behavior in this app.
It resolves conflicting status documents by defining the required behavior,
system boundaries, and acceptance criteria for implementation.

## In Scope
- Timesheet-based TOIL accrual.
- Supervisor review flow for TOIL-bearing timesheets.
- Leave Application-based TOIL consumption.
- Leave Ledger-based TOIL balance and history.
- TOIL expiry and reminder tasks.
- Frontend TOIL user journeys for employee and supervisor.

## Out of Scope
- Non-TOIL leave types beyond compatibility handling.
- Payroll/encashment business logic changes.
- Global HR policy redesign.

## Canonical Business Rules
1. TOIL accrues only from non-billable overtime time logs.
2. TOIL is represented in days for Leave Allocation and Leave Ledger operations.
3. Accrual creates or updates TOIL allocation records in a deterministic way.
4. Consumption happens via Leave Application for TOIL leave type.
5. Available balance is computed from Leave Ledger entries only.
6. Expired TOIL is excluded from available balance and warning views.
7. Timesheet cancellation is blocked when associated TOIL was already consumed.
8. Supervisor approval is required for reviewable TOIL timesheets.
9. API access is role-bound: self, supervisor, or privileged roles.
10. All TOIL APIs return a consistent success/error contract.

## System Actors
- Employee: logs overtime, views balance/history, requests TOIL leave.
- Supervisor: reviews and approves/rejects subordinate TOIL timesheets.
- HR/Admin: monitors exceptions, oversees policy and maintenance.
- Scheduler: runs expiry and reminder tasks.

## Use Case Baseline
- UC1: Employee records overtime and creates timesheet.
- UC2: Supervisor approves/rejects TOIL timesheet with optional comment/reason.
- UC3: Approval accrues TOIL and updates status/allocation references.
- UC4: Employee applies for TOIL leave within available balance.
- UC5: Leave submission consumes TOIL in ledger-aware flow.
- UC6: Leave cancellation restores balance through standard ledger reversal.
- UC7: Timesheet cancellation enforces anti-consumption protection.
- UC8: Scheduled expiry marks aged TOIL and sends reminders.
- UC9: History and summary views remain ledger-accurate.
- UC10: Access control prevents cross-employee data leaks.

## Non-Functional Requirements
- Deterministic hook behavior for submit/cancel flows.
- Idempotent and transaction-safe accrual/cancellation operations.
- Consistent API shape to reduce frontend branching.
- Query efficiency for supervisor list and balance/history endpoints.
- Test coverage for lifecycle, permission, and edge conditions.

## Acceptance Criteria
- No critical mismatch between timesheet status, allocation state, and ledger state.
- TOIL balance and summary endpoints return expired-safe values.
- Supervisor approval and rejection paths are fully testable and auditable.
- Frontend approval and leave flows validate inputs and handle failures clearly.
- Documentation includes endpoint inventory and risk controls.

