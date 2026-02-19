/**
 * TOIL API Service
 * Unified TOIL API client with consistent contract handling.
 */

import { createApiClient, withRetry, withCache, isMockEnabled, clearCache } from './config.js'
import { mockTimesheets, simulateDelay } from './mockData.js'

const methodPath = {
  getSupervisorLeaveApplications: '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.get_leave_applications_to_approve',
  setLeaveApproval: '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.set_leave_approval',
  getTimesheet: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_timesheet',
  setTimesheetApproval: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.set_timesheet_approval',
  getUserRole: '/api/method/frappe_devsecops_dashboard.api.toil.validation_api.get_user_role',
  getMyTeam: '/api/method/frappe_devsecops_dashboard.api.toil.validation_api.get_my_team',
  calculateTOILPreview: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.calculate_toil_preview',
  getSupervisorTimesheets: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_timesheets_to_approve',
  getTOILBreakdown: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_toil_breakdown',
  validateEmployeeSetup: '/api/method/frappe_devsecops_dashboard.api.toil.validation_api.validate_employee_setup',
  createTimesheet: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.create_timesheet',
  getMyTimesheets: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_my_timesheets',
  submitTimesheetForApproval: '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.submit_timesheet_for_approval',
  getTOILBalanceForLeave: '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_toil_balance_for_leave',
  getTOILBalance: '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_toil_balance',
  getTOILSummary: '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_toil_summary',
  getMyLeaveApplications: '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.get_my_leave_applications',
  createLeaveApplication: '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.create_leave_application',
  submitLeaveForApproval: '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.submit_leave_for_approval',
  getLeaveLedger: '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_leave_ledger'
}

const extractApiResponse = (responseData) => {
  if (!responseData || typeof responseData !== 'object') {
    return responseData
  }

  if (responseData.message && typeof responseData.message === 'object') {
    return responseData.message
  }

  return responseData
}

const getErrorMessage = (error, fallback = 'Request failed') => {
  const raw =
    error?.error?.message ||
    error?.data?.error?.message ||
    error?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    (typeof error === 'string' ? error : null)

  if (typeof raw !== 'string') return fallback
  return raw.replace(/^Error:\s*/i, '').trim() || fallback
}

const toResult = (raw, fallbackMessage = '') => {
  const payload = extractApiResponse(raw)
  if (payload?.success === false) {
    return {
      success: false,
      message: getErrorMessage(payload, fallbackMessage || 'Request failed'),
      error: payload.error || null,
      data: payload.data ?? null
    }
  }

  if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'success')) {
    return {
      success: !!payload.success,
      message: payload.message,
      data: payload.data,
      total: payload.total,
      ...payload
    }
  }

  return {
    success: true,
    data: payload,
    message: fallbackMessage || undefined
  }
}

class TOILService {
  constructor() {
    this.client = null
    this.initClient()
  }

  async initClient() {
    if (!this.client) {
      this.client = await createApiClient()
    }
    return this.client
  }

  async request(endpoint, { method = 'GET', params = {}, body = null, fallbackMessage = 'Request failed' } = {}) {
    const client = await this.initClient()

    try {
      const response = method === 'GET'
        ? await client.get(endpoint, { params })
        : await client.post(endpoint, body)

      return toResult(response.data, fallbackMessage)
    } catch (error) {
      return {
        success: false,
        message: getErrorMessage(error, fallbackMessage),
        error: error?.data?.error || error?.response?.data?.error || null,
        data: error?.data || error?.response?.data || null
      }
    }
  }

  /**
   * Aggregate timesheet listing for legacy TOIL list views.
   */
  async getTimesheets(filters = {}) {
    if (isMockEnabled('toil')) {
      await simulateDelay()
      let timesheets = [...mockTimesheets]

      if (filters.status) {
        timesheets = timesheets.filter(ts => ts.toil_status === filters.status)
      }
      if (filters.employee) {
        timesheets = timesheets.filter(ts => ts.employee === filters.employee)
      }
      if (filters.dateRange && filters.dateRange.length === 2) {
        const [startDate, endDate] = filters.dateRange
        timesheets = timesheets.filter(ts => {
          const tsDate = new Date(ts.from_date || ts.start_date)
          return tsDate >= new Date(startDate) && tsDate <= new Date(endDate)
        })
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        timesheets = timesheets.filter(ts =>
          (ts.name || '').toLowerCase().includes(searchLower) ||
          (ts.employee_name || '').toLowerCase().includes(searchLower)
        )
      }

      return { success: true, data: timesheets, total: timesheets.length }
    }

    const view = filters.view || filters.currentView || 'my-toil'
    if (view === 'supervisor') {
      return this.getSupervisorTimesheets(filters)
    }

    const response = await this.getMyTimesheets({
      status: filters.status || null,
      limit: Math.max(Number(filters.limit || 100), 20),
      offset: 0
    })

    if (!response.success) return response

    let data = Array.isArray(response.data) ? [...response.data] : []

    if (filters.employee) {
      data = data.filter(row => row.employee === filters.employee)
    }

    if (filters.dateRange && filters.dateRange.length === 2) {
      const [startDate, endDate] = filters.dateRange
      data = data.filter(row => {
        const rowDate = new Date(row.start_date || row.from_date)
        return rowDate >= new Date(startDate) && rowDate <= new Date(endDate)
      })
    }

    if (filters.search) {
      const q = String(filters.search).toLowerCase()
      data = data.filter(row =>
        (row.name || '').toLowerCase().includes(q) ||
        (row.employee_name || '').toLowerCase().includes(q)
      )
    }

    const page = Math.max(Number(filters.page || 1), 1)
    const limit = Math.max(Number(filters.limit || 20), 1)
    const start = (page - 1) * limit

    return {
      success: true,
      data: data.slice(start, start + limit),
      total: data.length
    }
  }

  async getTimesheet(id) {
    if (!id) return { success: false, message: 'Timesheet id is required' }

    const result = await withRetry(() => this.request(methodPath.getTimesheet, {
      method: 'GET',
      params: { name: id },
      fallbackMessage: 'Failed to fetch timesheet'
    }))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || null,
      message: result.message
    }
  }

  /**
   * Approve/reject a timesheet using single backend action endpoint.
   */
  async setTimesheetApproval(id, status, reason = null) {
    clearCache(`toil-timesheet-${id}`)
    clearCache(/^toil-timesheets-/)
    clearCache(/^toil-balance-/)
    clearCache(/^toil-supervisor-timesheets-/)

    const result = await this.request(methodPath.setTimesheetApproval, {
      method: 'POST',
      body: {
        timesheet_name: id,
        status,
        reason
      },
      fallbackMessage: 'Failed to update timesheet approval'
    })

    if (!result.success) return result

    return {
      success: true,
      data: result.data || null,
      message: result.message || (status === 'approved' ? 'Timesheet approved' : 'Timesheet rejected')
    }
  }

  /** @deprecated Use setTimesheetApproval(id, 'approved', comment) */
  async approveTimesheet(id, comment = null) {
    return this.setTimesheetApproval(id, 'approved', comment)
  }

  /** @deprecated Use setTimesheetApproval(id, 'rejected', reason) */
  async rejectTimesheet(id, reason) {
    return this.setTimesheetApproval(id, 'rejected', reason)
  }

  async getTOILBalance(employeeId = null) {
    const result = await withRetry(() => withCache(`toil-balance-${employeeId || 'current'}`, () => (
      this.request(methodPath.getTOILBalance, {
        method: 'GET',
        params: { employee: employeeId },
        fallbackMessage: 'Failed to fetch TOIL balance'
      })
    )))

    if (!result.success) return result

    const data = result.data || {}
    const expiringAllocations = Array.isArray(data.expiring_soon)
      ? data.expiring_soon
      : Array.isArray(data.allocations)
        ? data.allocations.filter(a => Number(a.days_until_expiry ?? 999) <= 30)
        : []

    return {
      success: true,
      data: {
        ...data,
        expiring_soon: expiringAllocations,
        expiring_soon_days: typeof data.expiring_soon === 'number' ? data.expiring_soon : undefined
      },
      message: result.message
    }
  }

  async getTOILSummary(employeeId = null) {
    if (isMockEnabled('toil')) {
      await simulateDelay()
      return {
        success: true,
        data: {
          employee: employeeId || 'EMP-001',
          current_balance: 3.5,
          total_accrued: 8.0,
          total_consumed: 4.5,
          expiring_soon: 1.5,
          pending_accrual: 0.5
        }
      }
    }

    const result = await withRetry(() => withCache(`toil-summary-${employeeId || 'current'}`, () => (
      this.request(methodPath.getTOILSummary, {
        method: 'GET',
        params: { employee: employeeId },
        fallbackMessage: 'Failed to fetch TOIL summary'
      })
    )))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || {},
      message: result.message
    }
  }

  async getUserRole() {
    const result = await withRetry(() => this.request(methodPath.getUserRole, {
      method: 'GET',
      fallbackMessage: 'Failed to fetch user role'
    }))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || result,
      message: result.message
    }
  }

  async getMyTeam() {
    const result = await withRetry(() => this.request(methodPath.getMyTeam, {
      method: 'GET',
      fallbackMessage: 'Failed to fetch team members'
    }))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    }
  }

  async calculateTOILPreview(timesheetName) {
    if (isMockEnabled('toil')) {
      await simulateDelay(300)
      return {
        success: true,
        data: {
          timesheet: timesheetName,
          total_toil_hours: 16.0,
          toil_days: 2.0,
          breakdown: [
            { date: '2026-02-10', hours: 8.0, description: 'Training' },
            { date: '2026-02-11', hours: 8.0, description: 'Documentation' }
          ]
        }
      }
    }

    const result = await withRetry(() => this.request(methodPath.calculateTOILPreview, {
      method: 'GET',
      params: { timesheet_name: timesheetName },
      fallbackMessage: 'Failed to calculate TOIL preview'
    }))

    if (!result.success) return result

    return { success: true, data: result.data || {}, message: result.message }
  }

  async getSupervisorTimesheets(filters = {}) {
    if (isMockEnabled('toil')) {
      await simulateDelay()
      const pending = mockTimesheets.filter(ts => ts.toil_status === 'Pending Accrual')
      return { success: true, data: pending, total: pending.length }
    }

    const limit = Number(filters.limit || 50)
    const offset = Number(filters.offset || 0)

    const result = await withRetry(() => withCache(`toil-supervisor-timesheets-${JSON.stringify({ limit, offset })}`, () => (
      this.request(methodPath.getSupervisorTimesheets, {
        method: 'GET',
        params: { limit, offset },
        fallbackMessage: 'Failed to fetch supervisor timesheets'
      })
    )))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || [],
      total: result.total || 0,
      pending_total: result.pending_total || 0,
      message: result.message
    }
  }

  async getTOILBreakdown(timesheetName) {
    if (isMockEnabled('toil')) {
      await simulateDelay(200)
      return {
        success: true,
        data: {
          timesheet: timesheetName,
          breakdown: [
            { date: '2026-02-10', hours: 8.0, is_billable: false, activity: 'Training', project: null },
            { date: '2026-02-11', hours: 6.0, is_billable: false, activity: 'Documentation', project: null },
            { date: '2026-02-12', hours: 2.0, is_billable: false, activity: 'Team Meeting', project: null }
          ],
          total_toil_hours: 16.0,
          toil_days: 2.0
        }
      }
    }

    const result = await withRetry(() => this.request(methodPath.getTOILBreakdown, {
      method: 'GET',
      params: { timesheet_name: timesheetName },
      fallbackMessage: 'Failed to fetch TOIL breakdown'
    }))

    if (!result.success) return result

    return { success: true, data: result.data || {}, message: result.message }
  }

  async validateEmployeeSetup(employeeId = null) {
    if (isMockEnabled('toil')) {
      await simulateDelay(200)
      return {
        success: true,
        data: {
          valid: true,
          employee: employeeId || 'EMP-001',
          employee_name: 'John Doe',
          supervisor: 'EMP-SUPER-001',
          supervisor_name: 'Jane Manager',
          supervisor_user: 'jane@company.com',
          issues: []
        }
      }
    }

    // Add cache-busting timestamp to ensure fresh data
    const result = await withRetry(() => this.request(methodPath.validateEmployeeSetup, {
      method: 'GET',
      params: { employee: employeeId },
      fallbackMessage: 'Failed to validate employee setup'
    }))

    if (!result.success) return result

    // Backend returns valid/employee/supervisor flat (not under .data)
    // because toResult spreads the payload but .data is undefined
    const data = result.data || {
      valid: result.valid,
      employee: result.employee,
      employee_name: result.employee_name,
      supervisor: result.supervisor,
      supervisor_name: result.supervisor_name,
      supervisor_user: result.supervisor_user,
      issues: result.issues || [],
      debug: result.debug || null
    }

    return { success: true, data, message: result.message }
  }

  async createTimesheet(data) {
    const result = await this.request(methodPath.createTimesheet, {
      method: 'POST',
      body: { data: JSON.stringify(data) },
      fallbackMessage: 'Failed to create timesheet'
    })

    if (!result.success) return result

    return {
      success: true,
      data: result.data || {},
      message: result.message || 'Timesheet created'
    }
  }

  async getMyTimesheets(filters = {}) {
    const result = await withRetry(() => this.request(methodPath.getMyTimesheets, {
      method: 'GET',
      params: {
        status: filters.status || null,
        limit: Number(filters.limit || 20),
        offset: Number(filters.offset || 0)
      },
      fallbackMessage: 'Failed to fetch timesheets'
    }))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    }
  }

  async submitTimesheetForApproval(timesheetName) {
    if (isMockEnabled('toil')) {
      await simulateDelay(500)
      return {
        success: true,
        data: { name: timesheetName, toil_status: 'Pending Accrual' },
        message: 'Timesheet submitted for approval'
      }
    }

    clearCache(`toil-timesheet-${timesheetName}`)
    clearCache(/^toil-timesheets-/)

    const result = await this.request(methodPath.submitTimesheetForApproval, {
      method: 'POST',
      body: { timesheet_name: timesheetName },
      fallbackMessage: 'Failed to submit timesheet'
    })

    if (!result.success) return result

    return {
      success: true,
      data: result.data || {},
      message: result.message || 'Timesheet submitted for approval'
    }
  }

  async getTOILBalanceForLeave(employeeId = null) {
    if (isMockEnabled('toil')) {
      await simulateDelay(200)
      return {
        success: true,
        data: {
          employee: employeeId || 'EMP-001',
          available: 3.5,
          total: 8.0,
          used: 4.5,
          expiring_soon: 1.5,
          allocations: []
        }
      }
    }

    const result = await withRetry(() => withCache(`toil-balance-leave-${employeeId || 'current'}`, () => (
      this.request(methodPath.getTOILBalanceForLeave, {
        method: 'GET',
        params: { employee: employeeId },
        fallbackMessage: 'Failed to fetch TOIL balance'
      })
    )))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || {},
      message: result.message
    }
  }

  async getMyLeaveApplications(filters = {}) {
    if (isMockEnabled('toil')) {
      await simulateDelay(300)
      return {
        success: true,
        data: [
          {
            name: 'LEAVE-APP-001',
            employee: 'EMP-001',
            employee_name: 'John Doe',
            from_date: '2026-03-01',
            to_date: '2026-03-02',
            total_leave_days: 2.0,
            leave_type: 'TOIL',
            status: 'Approved',
            description: 'Taking earned TOIL'
          }
        ],
        total: 1
      }
    }

    const result = await withRetry(() => withCache(`toil-leave-apps-${JSON.stringify(filters)}`, () => (
      this.request(methodPath.getMyLeaveApplications, {
        method: 'GET',
        params: filters,
        fallbackMessage: 'Failed to fetch leave applications'
      })
    )))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    }
  }

  async createLeaveApplication(data) {
    clearCache(/^toil-leave-apps-/)
    clearCache(/^toil-balance-/)

    const result = await this.request(methodPath.createLeaveApplication, {
      method: 'POST',
      body: { data: JSON.stringify(data) },
      fallbackMessage: 'Failed to create leave application'
    })

    if (!result.success) return result

    return {
      success: true,
      data: result.data || {},
      message: result.message || 'Leave application created successfully'
    }
  }

  async submitLeaveForApproval(leaveApplicationName) {
    if (isMockEnabled('toil')) {
      await simulateDelay(500)
      return {
        success: true,
        data: { name: leaveApplicationName, status: 'Approved' },
        message: 'Leave application submitted for approval'
      }
    }

    clearCache(/^toil-leave-apps-/)
    clearCache(/^toil-balance-/)

    const result = await this.request(methodPath.submitLeaveForApproval, {
      method: 'POST',
      body: { leave_application_name: leaveApplicationName },
      fallbackMessage: 'Failed to submit leave application'
    })

    if (!result.success) return result

    return {
      success: true,
      data: result.data || {},
      message: result.message || 'Leave application submitted for approval'
    }
  }

  async getSupervisorLeaveApplications(filters = {}) {
    const limit = Number(filters.limit || 50)
    const offset = Number(filters.offset || 0)

    const result = await withRetry(() => withCache(`toil-supervisor-leave-apps-${JSON.stringify({ limit, offset })}`, () => (
      this.request(methodPath.getSupervisorLeaveApplications, {
        method: 'GET',
        params: { limit, offset },
        fallbackMessage: 'Failed to fetch leave applications for approval'
      })
    )))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    }
  }

  async setLeaveApproval(leaveApplicationName, status, comment = null) {
    clearCache(/^toil-supervisor-leave-apps-/)
    clearCache(/^toil-leave-apps-/)
    clearCache(/^toil-balance-/)

    const result = await this.request(methodPath.setLeaveApproval, {
      method: 'POST',
      body: {
        leave_application_name: leaveApplicationName,
        status,
        comment
      },
      fallbackMessage: 'Failed to update leave application approval'
    })

    if (!result.success) return result

    return {
      success: true,
      data: result.data || null,
      message: result.message || (status === 'approved' ? 'Leave approved' : 'Leave rejected')
    }
  }

  async getLeaveLedger(employeeId = null) {
    const result = await withRetry(() => this.request(methodPath.getLeaveLedger, {
      method: 'GET',
      params: { employee: employeeId },
      fallbackMessage: 'Failed to fetch leave ledger'
    }))

    if (!result.success) return result

    return {
      success: true,
      data: result.data || [],
      total: result.total || 0,
      message: result.message
    }
  }

  clearTOILCache() {
    clearCache(/^toil-/)
  }
}

export default new TOILService()
