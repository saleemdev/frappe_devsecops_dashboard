/**
 * TOIL API Service
 * Handles all TOIL-related API calls
 * Pattern: incidents.js with error handling, caching, retry logic
 */

import { API_CONFIG, createApiClient, withRetry, withCache, isMockEnabled, clearCache } from './config.js'
import { mockTimesheets, simulateDelay } from './mockData.js'

const extractApiResponse = (responseData) => {
  if (!responseData || typeof responseData !== 'object') {
    return responseData
  }

  // For method responses after interceptor flattening.
  if (
    Object.prototype.hasOwnProperty.call(responseData, 'success') ||
    Object.prototype.hasOwnProperty.call(responseData, 'data') ||
    Object.prototype.hasOwnProperty.call(responseData, 'error') ||
    Object.prototype.hasOwnProperty.call(responseData, 'valid') ||
    Object.prototype.hasOwnProperty.call(responseData, 'role')
  ) {
    return responseData
  }

  // Fallback for unflattened Frappe method responses.
  if (responseData.message && typeof responseData.message === 'object') {
    return responseData.message
  }

  return responseData
}

const getErrorMessage = (error, fallback = 'Request failed') => {
  const raw =
    error?.data?.error?.message ||
    error?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    error?.message ||
    (typeof error === 'string' ? error : null)

  if (typeof raw !== 'string') return fallback
  return raw.replace(/^Error:\s*/i, '').trim() || fallback
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

  /**
   * Get timesheets with TOIL data
   * Supports filtering by view (my-toil, supervisor), status, employee, date range
   */
  async getTimesheets(filters = {}) {
    if (isMockEnabled('toil')) {
      await simulateDelay()

      let timesheets = [...mockTimesheets]

      // Apply filters
      if (filters.status) {
        timesheets = timesheets.filter(ts => ts.toil_status === filters.status)
      }
      if (filters.employee) {
        timesheets = timesheets.filter(ts => ts.employee === filters.employee)
      }
      if (filters.dateRange && filters.dateRange.length === 2) {
        const [startDate, endDate] = filters.dateRange
        timesheets = timesheets.filter(ts => {
          const tsDate = new Date(ts.from_date)
          return tsDate >= new Date(startDate) && tsDate <= new Date(endDate)
        })
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase()
        timesheets = timesheets.filter(ts =>
          ts.name.toLowerCase().includes(searchLower) ||
          ts.employee_name.toLowerCase().includes(searchLower)
        )
      }

      return {
        success: true,
        data: timesheets,
        total: timesheets.length
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`toil-timesheets-${JSON.stringify(filters)}`, async () => {
        try {
          const response = await client.get('/api/resource/Timesheet', {
            params: {
              fields: JSON.stringify([
                'name', 'employee', 'employee_name', 'from_date', 'to_date',
                'total_hours', 'total_toil_hours', 'toil_days', 'toil_status',
                'toil_allocation', 'docstatus', 'modified'
              ]),
              filters: JSON.stringify([
                ['total_toil_hours', '>', 0],
                ...(filters.status ? [['toil_status', '=', filters.status]] : []),
                ...(filters.employee ? [['employee', '=', filters.employee]] : []),
                ...(filters.dateRange && filters.dateRange.length === 2 ? [
                  ['from_date', '>=', filters.dateRange[0]],
                  ['to_date', '<=', filters.dateRange[1]]
                ] : [])
              ]),
              limit_start: ((filters.page || 1) - 1) * (filters.limit || 20),
              limit_page_length: filters.limit || 20,
              order_by: filters.order_by || 'modified desc'
            }
          })

          const apiResponse = extractApiResponse(response.data)

          return {
            success: true,
            data: apiResponse.data || [],
            total: apiResponse.total || 0
          }
        } catch (error) {
          if (error.status) {
            throw error
          }
          throw {
            status: error.response?.status || 500,
            message: error.message || 'Failed to fetch timesheets',
            data: null
          }
        }
      }, { ttl: 30000 }) // 30 second cache
    })
  }

  /**
   * Get single timesheet by ID
   */
  async getTimesheet(id) {
    if (isMockEnabled('toil')) {
      await simulateDelay()

      const timesheet = mockTimesheets.find(ts => ts.name === id || ts.id === id)

      if (!timesheet) {
        throw {
          status: 404,
          message: 'Timesheet not found',
          data: null
        }
      }

      return {
        success: true,
        data: timesheet
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`toil-timesheet-${id}`, async () => {
        try {
          const response = await client.get('/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_timesheet', {
            params: { name: id }
          })

          const apiResponse = extractApiResponse(response.data)

          console.log('[TOILService] Raw API response:', response.data)
          console.log('[TOILService] Parsed API response:', apiResponse)

          // Check if the response indicates an error
          if (apiResponse.exc || (apiResponse.success === false)) {
            const errorMessage = apiResponse.error || apiResponse.message || apiResponse.exc || 'Failed to fetch timesheet'
            console.error('[TOILService] API returned error:', errorMessage)
            throw {
              status: 400,
              message: errorMessage,
              data: apiResponse
            }
          }

          // Validate we got actual data
          if (!apiResponse.data) {
            console.error('[TOILService] No timesheet data returned')
            throw {
              status: 404,
              message: 'Timesheet not found',
              data: null
            }
          }

          return {
            success: true,
            data: apiResponse.data
          }
        } catch (error) {
          // Re-throw with proper error structure
          if (error.status) {
            throw error
          }
          throw {
            status: error.response?.status || 500,
            message: error.message || 'Failed to fetch timesheet',
            data: null
          }
        }
      }, { ttl: 60000 }) // 1 minute cache
    })
  }

  /**
   * Set timesheet approval status (supervisor only).
   * Single PUT-style endpoint: approved -> doc.submit(), rejected -> status = Rejected.
   */
  async setTimesheetApproval(id, status, reason = null) {
    const client = await this.initClient()

    clearCache(`toil-timesheet-${id}`)
    clearCache(/^toil-timesheets-/)
    clearCache(/^toil-balance-/)
    clearCache(/^toil-supervisor-timesheets-/)

    try {
      // Keep approval path simple and deterministic: one direct POST + clear message extraction.
      const response = await client.post(
        '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.set_timesheet_approval',
        { timesheet_name: id, status, reason }
      )

      const apiResponse = extractApiResponse(response.data)

      if (apiResponse?.exc || apiResponse?.success === false) {
        throw {
          status: 400,
          message: getErrorMessage(apiResponse, 'Failed to update timesheet approval'),
          data: apiResponse
        }
      }

      return {
        success: true,
        data: apiResponse?.data || apiResponse,
        message: apiResponse?.message || (status === 'approved' ? 'Timesheet approved' : 'Timesheet rejected')
      }
    } catch (error) {
      throw {
        status: error?.status || error?.response?.status || 500,
        message: getErrorMessage(error, 'Failed to update timesheet approval'),
        data: error?.data || error?.response?.data || null
      }
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

  /**
   * Get TOIL balance for employee
   * If employeeId is null, returns balance for current user
   */
  async getTOILBalance(employeeId = null) {
    if (isMockEnabled('toil')) {
      await simulateDelay()
      return {
        success: true,
        data: {
          employee: employeeId || 'EMP-001',
          balance: 3.5,
          total_accrued: 8.0,
          total_consumed: 4.5,
          expiring_soon: [
            {
              allocation: 'LEAVE-ALLOC-001',
              days: 1.5,
              expiry_date: '2026-03-15'
            }
          ]
        }
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`toil-balance-${employeeId || 'current'}`, async () => {
        try {
          const response = await client.get(
            '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_toil_balance',
            { params: { employee: employeeId } }
          )

          const apiResponse = extractApiResponse(response.data)

          return {
            success: true,
            data: apiResponse
          }
        } catch (error) {
          if (error.status) {
            throw error
          }
          throw {
            status: error.response?.status || 500,
            message: error.message || 'Failed to fetch TOIL balance',
            data: null
          }
        }
      }, { ttl: 60000 }) // 1 minute cache
    })
  }

  /**
   * Get TOIL summary for employee
   * More detailed than balance - includes breakdown, recent timesheets, etc.
   */
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
          recent_timesheets: mockTimesheets.slice(0, 5),
          allocations: [
            {
              name: 'LEAVE-ALLOC-001',
              from_date: '2025-09-15',
              to_date: '2026-03-15',
              new_leaves_allocated: 2.0,
              balance: 1.5,
              source_timesheet: 'TS-001'
            }
          ]
        }
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`toil-summary-${employeeId || 'current'}`, async () => {
        try {
          const response = await client.get(
            '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_toil_summary',
            { params: { employee: employeeId } }
          )

          const apiResponse = extractApiResponse(response.data)

          return {
            success: true,
            data: apiResponse
          }
        } catch (error) {
          if (error.status) {
            throw error
          }
          throw {
            status: error.response?.status || 500,
            message: error.message || 'Failed to fetch TOIL summary',
            data: null
          }
        }
      }, { ttl: 300000 }) // 5 minute cache
    })
  }

  /**
   * Get user role for UI adaptation
   * Returns: 'employee' | 'supervisor' | 'hr'
   */
  async getUserRole() {
    const client = await this.initClient()

    return withRetry(async () => {
      try {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.toil.validation_api.get_user_role'
        )

        const apiResponse = extractApiResponse(response.data)

        return {
          success: true,
          data: apiResponse
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to fetch user role',
          data: null
        }
      }
    })
  }

  /**
   * Get TOIL calculation preview for timesheet
   * Shows how TOIL will be calculated before submission
   */
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

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      try {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.calculate_toil_preview',
          { params: { timesheet_name: timesheetName } }
        )

        const apiResponse = extractApiResponse(response.data)

        return {
          success: true,
          data: apiResponse
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to calculate TOIL preview',
          data: null
        }
      }
    })
  }

  /**
   * Get supervisor's pending timesheets
   * Returns timesheets from team members that need approval
   */
  async getSupervisorTimesheets(filters = {}) {
    if (isMockEnabled('toil')) {
      await simulateDelay()
      // Filter to pending timesheets only
      const pending = mockTimesheets.filter(ts => ts.toil_status === 'Pending Accrual')
      return {
        success: true,
        data: pending,
        total: pending.length
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`toil-supervisor-timesheets-${JSON.stringify(filters)}`, async () => {
        try {
          const response = await client.get(
            '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_timesheets_to_approve',
            { params: filters }
          )

          const apiResponse = extractApiResponse(response.data)

          return {
            success: true,
            data: apiResponse.data || [],
            total: apiResponse.total || 0
          }
        } catch (error) {
          if (error.status) {
            throw error
          }
          throw {
            status: error.response?.status || 500,
            message: error.message || 'Failed to fetch supervisor timesheets',
            data: null
          }
        }
      }, { ttl: 30000 }) // 30 second cache
    })
  }

  /**
   * Get TOIL breakdown for a specific timesheet
   * Shows day-by-day non-billable hours
   */
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

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      try {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_toil_breakdown',
          { params: { timesheet_name: timesheetName } }
        )

        const apiResponse = extractApiResponse(response.data)

        return {
          success: true,
          data: apiResponse
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to fetch TOIL breakdown',
          data: null
        }
      }
    })
  }

  /**
   * ========================================
   * PHASE 2-4: NEW API ENDPOINTS
   * ========================================
   */

  /**
   * Validate employee setup (reports_to configured)
   * CRITICAL: Must be called before any timesheet/leave action
   */
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

    const client = await this.initClient()

    return withRetry(async () => {
      try {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.toil.validation_api.validate_employee_setup',
          { params: { employee: employeeId } }
        )

        const apiResponse = extractApiResponse(response.data)

        return {
          success: true,
          data: apiResponse
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to validate employee setup',
          data: null
        }
      }
    })
  }

  /**
   * Create new timesheet with time logs
   */
  async createTimesheet(data) {
    try {
      const client = await this.initClient()
      const response = await client.post(
        '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.create_timesheet',
        { data: JSON.stringify(data) }
      )

      const apiResponse = extractApiResponse(response.data)

      if (apiResponse.success === false) {
        return {
          success: false,
          message: apiResponse.message || 'Failed'
        }
      }

      return {
        success: true,
        data: apiResponse.data || apiResponse,
        message: apiResponse.message || 'Created'
      }
    } catch (error) {
      const normalizedMessage =
        error?.data?.error?.message ||
        error?.data?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Failed'

      return {
        success: false,
        message: typeof normalizedMessage === 'string' ? normalizedMessage : 'Failed to create timesheet'
      }
    }
  }

  /**
   * Get my timesheets (current user)
   */
  async getMyTimesheets(filters = {}) {
    const client = await this.initClient()

    return withRetry(async () => {
      try {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.get_my_timesheets',
          {
            params: {
              status: filters.status || null,
              limit: filters.limit || 20,
              offset: filters.offset || 0
            }
          }
        )

        const apiResponse = extractApiResponse(response.data)

        if (apiResponse.success) {
          return {
            success: true,
            data: apiResponse.data || [],
            total: apiResponse.total || 0
          }
        } else {
          throw new Error(apiResponse.error?.message || 'Failed to fetch timesheets')
        }
      } catch (error) {
        console.error('[toil.js] Error fetching my timesheets:', error)
        return {
          success: false,
          data: [],
          total: 0,
          message: error?.response?.data?.message || error.message || 'Failed to fetch timesheets'
        }
      }
    })
  }

  /**
   * Submit timesheet for approval
   */
  async submitTimesheetForApproval(timesheetName) {
    if (isMockEnabled('toil')) {
      await simulateDelay(500)
      return {
        success: true,
        data: { name: timesheetName, toil_status: 'Pending Accrual' },
        message: 'Timesheet submitted for approval'
      }
    }

    const client = await this.initClient()

    // Clear relevant caches
    clearCache(`toil-timesheet-${timesheetName}`)
    clearCache(/^toil-timesheets-/)

    return withRetry(async () => {
      try {
        const response = await client.post(
          '/api/method/frappe_devsecops_dashboard.api.toil.timesheet_api.submit_timesheet_for_approval',
          { timesheet_name: timesheetName }
        )

        const apiResponse = extractApiResponse(response.data)

        if (apiResponse.exc || apiResponse.success === false) {
          throw {
            status: 400,
            message: apiResponse.error || apiResponse.message || 'Failed to submit timesheet',
            data: apiResponse
          }
        }

        return {
          success: true,
          data: apiResponse.data || apiResponse,
          message: apiResponse.message || 'Timesheet submitted for approval'
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to submit timesheet',
          data: null
        }
      }
    }, 1)
  }

  /**
   * Get TOIL balance for leave application
   * Returns balance with expiry warnings
   */
  async getTOILBalanceForLeave(employeeId = null) {
    if (isMockEnabled('toil')) {
      await simulateDelay(200)
      return {
        success: true,
        data: {
          employee: employeeId || 'EMP-001',
          available: 3.5,
          total_allocated: 8.0,
          consumed: 4.5,
          expiring_soon: [
            {
              allocation: 'LEAVE-ALLOC-001',
              days: 1.5,
              expiry_date: '2026-03-15'
            }
          ],
          allocations: [
            {
              name: 'LEAVE-ALLOC-001',
              from_date: '2025-09-15',
              to_date: '2026-03-15',
              new_leaves_allocated: 2.0,
              balance: 1.5
            }
          ]
        }
      }
    }

    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`toil-balance-leave-${employeeId || 'current'}`, async () => {
        try {
          const response = await client.get(
            '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_toil_balance_for_leave',
            { params: { employee: employeeId } }
          )

          const apiResponse = extractApiResponse(response.data)

          return {
            success: true,
            data: apiResponse
          }
        } catch (error) {
          if (error.status) {
            throw error
          }
          throw {
            status: error.response?.status || 500,
            message: error.message || 'Failed to fetch TOIL balance',
            data: null
          }
        }
      }, { ttl: 60000 })
    })
  }

  /**
   * Get my leave applications
   */
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

    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`toil-leave-apps-${JSON.stringify(filters)}`, async () => {
        try {
          const response = await client.get(
            '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.get_my_leave_applications',
            { params: filters }
          )

          const apiResponse = extractApiResponse(response.data)

          return {
            success: true,
            data: apiResponse.data || [],
            total: apiResponse.total || 0
          }
        } catch (error) {
          if (error.status) {
            throw error
          }
          throw {
            status: error.response?.status || 500,
            message: error.message || 'Failed to fetch leave applications',
            data: null
          }
        }
      }, { ttl: 30000 })
    })
  }

  /**
   * Create leave application
   */
  async createLeaveApplication(data) {
    if (isMockEnabled('toil')) {
      await simulateDelay(500)
      return {
        success: true,
        data: {
          name: 'LEAVE-APP-NEW-001',
          ...data,
          status: 'Open'
        },
        message: 'Leave application created successfully'
      }
    }

    const client = await this.initClient()

    // Clear relevant caches
    clearCache(/^toil-leave-apps-/)
    clearCache(/^toil-balance-/)

    return withRetry(async () => {
      try {
        const response = await client.post(
          '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.create_leave_application',
          { data: JSON.stringify(data) }
        )

        const apiResponse = extractApiResponse(response.data)

        if (apiResponse.exc || apiResponse.success === false) {
          throw {
            status: 400,
            message: apiResponse.error || apiResponse.message || 'Failed to create leave application',
            data: apiResponse
          }
        }

        return {
          success: true,
          data: apiResponse.data || apiResponse,
          message: apiResponse.message || 'Leave application created successfully'
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to create leave application',
          data: null
        }
      }
    }, 1)
  }

  /**
   * Submit leave application for approval
   */
  async submitLeaveForApproval(leaveApplicationName) {
    if (isMockEnabled('toil')) {
      await simulateDelay(500)
      return {
        success: true,
        data: { name: leaveApplicationName, status: 'Approved' },
        message: 'Leave application submitted for approval'
      }
    }

    const client = await this.initClient()

    // Clear relevant caches
    clearCache(/^toil-leave-apps-/)
    clearCache(/^toil-balance-/)

    return withRetry(async () => {
      try {
        const response = await client.post(
          '/api/method/frappe_devsecops_dashboard.api.toil.leave_api.submit_leave_for_approval',
          { leave_application_name: leaveApplicationName }
        )

        const apiResponse = extractApiResponse(response.data)

        if (apiResponse.exc || apiResponse.success === false) {
          throw {
            status: 400,
            message: apiResponse.error || apiResponse.message || 'Failed to submit leave application',
            data: apiResponse
          }
        }

        return {
          success: true,
          data: apiResponse.data || apiResponse,
          message: apiResponse.message || 'Leave application submitted for approval'
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to submit leave application',
          data: null
        }
      }
    }, 1)
  }

  /**
   * Clear TOIL-related caches
   */
  /**
   * Get Leave Ledger Report (transaction history)
   */
  async getLeaveLedger(employeeId = null) {
    const client = await this.initClient()

    return withRetry(async () => {
      try {
        const response = await client.get(
          '/api/method/frappe_devsecops_dashboard.api.toil.balance_api.get_leave_ledger',
          { params: { employee: employeeId } }
        )
        const result = extractApiResponse(response.data)

        return {
          success: true,
          data: result.data || [],
          total: result.total || 0
        }
      } catch (error) {
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to fetch leave ledger',
          data: null
        }
      }
    })
  }

  clearTOILCache() {
    clearCache(/^toil-/)
  }
}

// Export singleton instance
export default new TOILService()
