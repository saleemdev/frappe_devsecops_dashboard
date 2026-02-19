# TOIL Release Runbook

## Staging Go/No-Go Checklist
- All TOIL backend tests pass (unit + integration).
- E2E TOIL approval/rejection and leave request flows pass.
- No open critical bugs in accrual, consumption, cancellation, expiry.
- API contract document reviewed and accepted.
- DB patch and migration dry-run completed.
- Rollback drill completed successfully in staging.

## Deployment Steps
1. Deploy app code to staging/prod branch.
2. Run site migration.
3. Build frontend assets.
4. Validate TOIL endpoints and UI smoke tests.
5. Verify scheduled task configuration for TOIL expiry/reminder jobs.

## Rollback Plan
1. Pause TOIL approval actions in UI (temporary banner/ops lock).
2. Revert to previous app revision.
3. Re-run migration rollback patch if needed.
4. Rebuild/redeploy previous frontend assets.
5. Execute post-rollback health checks:
   - get_toil_balance_for_leave
   - get_timesheets_to_approve
   - create_leave_application (dry-run)

## Operational Ownership
- Backend: Hook and ledger integrity.
- Frontend: UX, state flow, and regression checks.
- QA: Validation matrix and release sign-off.
- DevOps: Deployment orchestration and rollback execution.

## Handoff Artifacts
- Requirements baseline (`TOIL_REQUIREMENTS_BASELINE.md`)
- API contract (`TOIL_API_CONTRACT.md`)
- Risk register (`TOIL_RISK_REGISTER.md`)
- This runbook (`TOIL_RELEASE_RUNBOOK.md`)

