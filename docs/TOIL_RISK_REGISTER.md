# TOIL Risk Register

## Purpose
Track high-impact technical and product risks for TOIL rollout and provide concrete mitigations.

## Risk Matrix

| ID | Risk | Impact | Likelihood | Mitigation | Owner |
|---|---|---|---|---|---|
| R1 | Hook race conditions during accrual/cancel | High | Medium | Enforce idempotency checks, lock strategy, and transaction-safe updates | Backend |
| R2 | Balance mismatch due to mixed read models | High | Medium | Unify Leave Ledger-based reads and expiry filtering | Backend |
| R3 | API contract drift between modules and UI | High | Medium | Publish contract and add API response tests | Backend + Frontend |
| R4 | Permission gaps exposing employee data | High | Low/Med | Centralize access validation in employee-scoped queries | Backend |
| R5 | Frontend state inconsistencies after approval actions | Medium | Medium | Align cache invalidation + store refresh flow | Frontend |
| R6 | Low coverage on edge paths | High | Medium | Expand integration and E2E test scenarios for lifecycle failures | QA + Backend + Frontend |
| R7 | Deployment rollback uncertainty | High | Low | Publish go/no-go and rollback runbook before release | DevOps |
| R8 | Context7 unavailable for framework validation | Medium | Medium | Keep follow-up checkpoint for final best-practice audit | Tech Lead |

## Go/No-Go Gates
- No open critical defects in accrual/consumption/cancellation paths.
- Contract and endpoint inventory approved.
- Core TOIL user journeys pass automated and manual checks.
- Rollback procedure validated in staging.

## Monitoring Suggestions
- Log each accrual/cancel action with correlation IDs.
- Alert on repeated allocation creation failures.
- Track rejection reasons and approval latency.
- Monitor API error rates and response durations.

