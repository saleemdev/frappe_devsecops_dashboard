export const TOIL_STATUSES = {
  NOT_APPLICABLE: 'Not Applicable',
  PENDING_ACCRUAL: 'Pending Accrual',
  ACCRUED: 'Accrued',
  PARTIALLY_USED: 'Partially Used',
  FULLY_USED: 'Fully Used',
  EXPIRED: 'Expired',
  REJECTED: 'Rejected',
  CANCELLED: 'Cancelled'
}

export const normalizeToilStatus = (timesheet = {}) => {
  const explicitStatus = String(timesheet?.toil_status || '').trim()
  if (Object.values(TOIL_STATUSES).includes(explicitStatus)) {
    return explicitStatus
  }

  const docstatus = Number(timesheet?.docstatus ?? 0)
  const toilHours = Number(timesheet?.total_toil_hours ?? 0)

  if (docstatus === 2) return TOIL_STATUSES.CANCELLED
  if (toilHours <= 0) return TOIL_STATUSES.NOT_APPLICABLE
  if (docstatus === 1) return TOIL_STATUSES.ACCRUED
  return TOIL_STATUSES.PENDING_ACCRUAL
}

export const isReviewableTimesheet = (timesheet = {}) => {
  if (timesheet.is_reviewable !== undefined) {
    return !!timesheet.is_reviewable
  }
  const docstatus = Number(timesheet?.docstatus ?? 0)
  const status = normalizeToilStatus(timesheet)
  const toilHours = Number(timesheet?.total_toil_hours ?? 0)
  return docstatus === 0 && status === TOIL_STATUSES.PENDING_ACCRUAL && toilHours > 0
}

export const getToilStatusColor = (status) => {
  switch (status) {
    case TOIL_STATUSES.PENDING_ACCRUAL:
      return 'orange'
    case TOIL_STATUSES.ACCRUED:
      return 'blue'
    case TOIL_STATUSES.PARTIALLY_USED:
      return 'cyan'
    case TOIL_STATUSES.FULLY_USED:
      return 'green'
    case TOIL_STATUSES.REJECTED:
      return 'red'
    case TOIL_STATUSES.EXPIRED:
      return 'magenta'
    case TOIL_STATUSES.CANCELLED:
      return 'default'
    case TOIL_STATUSES.NOT_APPLICABLE:
    default:
      return 'default'
  }
}

