# TOIL API Contract

## Contract Shape
All TOIL API methods must return a top-level object:

- Success:
  - `success: true`
  - `data: object|array|null`
  - `message: string` (optional but recommended)
  - additional metadata fields allowed (`total`, `balance`, etc.)
- Failure:
  - `success: false`
  - `error: { code: string, message: string, field?: string }` or string fallback
  - `http_status` set by backend where applicable

## Endpoint Inventory (Canonical)
Base namespace:
`frappe_devsecops_dashboard.api.toil`

### Validation
- `validation_api.validate_employee_setup` (GET)
- `validation_api.get_user_role` (GET)

### Timesheet
- `timesheet_api.get_my_timesheets` (GET)
- `timesheet_api.get_timesheets_to_approve` (GET)
- `timesheet_api.get_timesheet` (GET)
- `timesheet_api.create_timesheet` (POST)
- `timesheet_api.submit_timesheet_for_approval` (POST)
- `timesheet_api.set_timesheet_approval` (POST/PUT)
- `timesheet_api.calculate_toil_preview` (GET)
- `timesheet_api.get_toil_breakdown` (GET)

### Leave
- `leave_api.get_my_leave_applications` (GET)
- `leave_api.create_leave_application` (POST)
- `leave_api.submit_leave_for_approval` (POST)

### Balance / Ledger
- `balance_api.get_toil_balance_for_leave` (GET)
- `balance_api.get_toil_balance` (GET)
- `balance_api.get_toil_summary` (GET)
- `balance_api.get_balance_summary` (GET)
- `balance_api.get_leave_ledger` (GET)

## Compatibility Wrappers
The following wrappers remain supported to avoid breaking existing clients:
- `toil.get_supervisor_timesheets` -> `timesheet_api.get_timesheets_to_approve`
- `toil.approve_timesheet` -> `timesheet_api.set_timesheet_approval(status='approved')`
- `toil.reject_timesheet` -> `timesheet_api.set_timesheet_approval(status='rejected')`

## Payload Rules
- Creation endpoints accept JSON payload in `data` string when called via Frappe form style clients.
- Action endpoints must validate required identifiers (`timesheet_name`, `leave_application_name`).
- Rejection actions must enforce minimum reason length.

## Error Rules
- Use structured failure helper where available.
- Do not leak raw stack traces to UI.
- Keep user-facing messages actionable and concise.

