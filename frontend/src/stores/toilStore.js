/**
 * TOIL Zustand Store
 * Manages TOIL timesheet state and actions
 * Pattern: incidentsStore.js
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import apiService from '../services/api/index.js'
import { clearCache } from '../services/api/config.js'

const getErrorMessage = (error, fallback) => {
  const raw =
    error?.message ||
    error?.data?.error?.message ||
    error?.data?.message ||
    error?.response?.data?.error?.message ||
    error?.response?.data?.message ||
    (typeof error === 'string' ? error : null)

  if (typeof raw !== 'string') return fallback
  return raw.replace(/^Error:\s*/i, '').trim() || fallback
}

const useToilStore = create(
  devtools(
    (set, get) => ({
      // CORE DATA
      timesheets: [],           // All timesheets (role-filtered by backend)
      supervisorTimesheets: [], // Team timesheets pending approval (supervisor only)
      selectedTimesheet: null,  // Current detail view
      leaveApplications: [],    // Leave applications
      selectedLeaveApplication: null,

      // CONFIGURATION
      employeeSetup: null,      // Employee validation data (supervisor info)
      toilBalance: null,        // Current TOIL balance
      leaveLedger: [],          // Leave Ledger entries (transaction history)

      // LOADING & ERROR (Simplified)
      loading: false,           // General data fetching
      submitting: false,        // Form submissions
      error: null,

      // FILTERS (needed by TOILList.jsx)
      filters: {
        employee: null,
        status: '',
        dateRange: null,
        search: ''
      },

      // PAGINATION (needed by TOILList.jsx)
      pagination: { current: 1, pageSize: 10, total: 0 },

      // VIEW STATE (needed by TOILList.jsx)
      viewMode: 'table',
      currentView: 'my-toil',
      userRole: null,

      // ACTIONS
      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      clearError: () => set({ error: null }),

      /**
       * Initialize store - get user role from backend
       */
      initialize: async () => {
        try {
          const response = await apiService.toil.getUserRole()
          const role = response.data?.role || null
          set({ userRole: role })
          get().loadFiltersFromStorage()
          get().loadViewMode()
          return role
        } catch (error) {
          console.error('[toilStore] Failed to initialize:', error)
          set({ error: error.message || 'Failed to initialize TOIL store' })
          return null
        }
      },

      /**
       * Fetch timesheets with current filters and pagination
       */
      fetchTimesheets: async () => {
        const { filters, currentView, pagination } = get()

        set({ loading: true, error: null })

        try {
          const response = await apiService.toil.getTimesheets({
            view: currentView,
            ...filters,
            page: pagination.current,
            limit: pagination.pageSize
          })

          if (response.success) {
            set({
              timesheets: response.data,
              pagination: {
                ...pagination,
                total: response.total || response.data.length
              },
              loading: false
            })
          } else {
            throw new Error(response.message || 'Failed to fetch timesheets')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch timesheets',
            loading: false
          })
        }
      },

      /**
       * Fetch single timesheet by ID
       */
      fetchTimesheet: async (id) => {
        set({ loading: true, error: null })

        try {
          console.log('[toilStore] Fetching timesheet:', id)
          const response = await apiService.toil.getTimesheet(id)
          console.log('[toilStore] API Response:', response)

          if (response.success) {
            console.log('[toilStore] Setting selectedTimesheet:', response.data)
            set({
              selectedTimesheet: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch timesheet')
          }
        } catch (error) {
          console.error('[toilStore] Error fetching timesheet:', error)
          set({
            error: error.message || 'Failed to fetch timesheet',
            loading: false
          })
          throw error
        }
      },

      /**
       * Update timesheet approval state (supervisor only)
       */
      setTimesheetApproval: async (id, status, reason = null) => {
        set({ submitting: true, error: null })

        try {
          const normalizedStatus = (status || '').toLowerCase()
          if (normalizedStatus !== 'approved' && normalizedStatus !== 'rejected') {
            throw new Error("Status must be either 'approved' or 'rejected'")
          }

          if (normalizedStatus === 'rejected' && (!reason || reason.trim().length < 10)) {
            throw new Error('Rejection reason must be at least 10 characters')
          }

          const response = await apiService.toil.setTimesheetApproval(id, normalizedStatus, reason)
          if (!response?.success) {
            throw new Error(response?.message || 'Failed to update timesheet approval')
          }

          clearCache(`toil-timesheet-${id}`)
          clearCache(/^toil-timesheets-/)
          clearCache(/^toil-balance-/)
          clearCache(/^toil-supervisor-timesheets-/)

          const refreshTasks = [
            get().fetchMyTimesheets(),
            get().fetchSupervisorTimesheets().catch(() => {})
          ]

          if (normalizedStatus === 'approved') {
            refreshTasks.push(
              get().fetchTOILBalance().catch(() => {}),
              get().fetchLeaveLedger().catch(() => {})
            )
          }

          await Promise.all(refreshTasks)

          set({ submitting: false })
          return {
            success: true,
            message: response?.message || (normalizedStatus === 'approved' ? 'Timesheet approved' : 'Timesheet rejected'),
            data: response?.data || null
          }
        } catch (error) {
          const errMsg = getErrorMessage(error, 'Failed to update timesheet approval')
          set({
            error: errMsg,
            submitting: false
          })
          return { success: false, error: errMsg }
        }
      },

      /**
       * Approve timesheet (supervisor only)
       */
      approveTimesheet: async (id, comment) => {
        return get().setTimesheetApproval(id, 'approved', comment)
      },

      /**
       * Reject timesheet (supervisor only)
       */
      rejectTimesheet: async (id, reason) => {
        return get().setTimesheetApproval(id, 'rejected', reason)
      },

      /**
       * Set filters and persist to localStorage
       */
      setFilters: (newFilters) => {
        const STORAGE_KEY = 'devsecops_toil_filters_v1'
        const filters = { ...get().filters, ...newFilters }

        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(filters))
        } catch (err) {
          console.error('[toilStore] Error saving filters:', err)
        }

        set({
          filters,
          pagination: { ...get().pagination, current: 1 } // Reset to first page when filtering
        })
      },

      /**
       * Load filters from localStorage
       */
      loadFiltersFromStorage: () => {
        const STORAGE_KEY = 'devsecops_toil_filters_v1'
        try {
          const saved = localStorage.getItem(STORAGE_KEY)
          if (saved) {
            const filters = JSON.parse(saved)
            set({ filters })
          }
        } catch (err) {
          console.error('[toilStore] Error loading filters:', err)
          try {
            localStorage.removeItem(STORAGE_KEY)
          } catch (e) {
            console.error('[toilStore] Error clearing corrupt filters:', e)
          }
        }
      },

      /**
       * Set pagination
       */
      setPagination: (pagination) => set((state) => ({
        pagination: { ...state.pagination, ...pagination }
      })),

      /**
       * Set view mode (table or calendar) and persist to localStorage
       */
      setViewMode: (viewMode) => {
        if (viewMode !== 'table' && viewMode !== 'calendar') {
          console.warn('[toilStore] Invalid view mode:', viewMode)
          return
        }

        try {
          localStorage.setItem('toil_view_mode', viewMode)
        } catch (error) {
          console.error('[toilStore] Failed to save view mode:', error)
        }

        set({ viewMode })
      },

      /**
       * Load view mode from localStorage
       */
      loadViewMode: () => {
        try {
          const saved = localStorage.getItem('toil_view_mode')
          if (saved === 'table' || saved === 'calendar') {
            set({ viewMode: saved })
          }
        } catch (error) {
          console.error('[toilStore] Failed to load view mode:', error)
        }
      },

      /**
       * Set current view (my-toil or supervisor)
       */
      setCurrentView: (currentView) => {
        if (currentView !== 'my-toil' && currentView !== 'supervisor') {
          console.warn('[toilStore] Invalid current view:', currentView)
          return
        }
        set({ currentView })
      },

      /**
       * Set selected timesheet
       */
      setSelectedTimesheet: (timesheet) => set({ selectedTimesheet: timesheet }),

      /**
       * Clear selected timesheet
       */
      clearSelectedTimesheet: () => set({ selectedTimesheet: null }),

      /**
       * Search timesheets
       */
      searchTimesheets: async (searchTerm) => {
        const { setFilters, fetchTimesheets } = get()

        setFilters({ search: searchTerm })
        await fetchTimesheets()
      },

      /**
       * ========================================
       * PHASE 2-4: NEW ACTIONS
       * ========================================
       */

      /**
       * Validate employee setup (supervisor configuration)
       * MUST be called before any timesheet/leave action
       */
      validateSetup: async (employeeId = null) => {
        set({ loading: true, error: null })
        try {
          const response = await apiService.toil.validateEmployeeSetup(employeeId)
          if (response.success) {
            set({
              employeeSetup: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to validate employee setup')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to validate employee setup',
            loading: false
          })
          throw error
        }
      },

      /**
       * Create new timesheet
       */
      createTimesheet: async (data) => {
        set({ submitting: true, error: null })
        const response = await apiService.toil.createTimesheet(data)
        set({ submitting: false })

        if (response?.success) {
          return response.data
        }

        const errorMsg = response?.message || 'Failed'
        set({ error: errorMsg })
        throw new Error(errorMsg)
      },

      /**
       * Submit timesheet for approval
       */
      submitTimesheetForApproval: async (timesheetName) => {
        set({ submitting: true, error: null })
        try {
          const response = await apiService.toil.submitTimesheetForApproval(timesheetName)
          if (response.success) {
            clearCache(`toil-timesheet-${timesheetName}`)
            clearCache(/^toil-timesheets-/)
            set({ submitting: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to submit timesheet')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to submit timesheet',
            submitting: false
          })
          throw error
        }
      },

      /**
       * Fetch TOIL balance
       */
      fetchTOILBalance: async (employeeId = null) => {
        set({ loading: true, error: null })
        try {
          const response = await apiService.toil.getTOILBalanceForLeave(employeeId)
          if (response.success) {
            set({
              toilBalance: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch TOIL balance')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch TOIL balance',
            loading: false
          })
          throw error
        }
      },

      /**
       * Fetch my timesheets
       */
      fetchMyTimesheets: async (filters = {}) => {
        set({ loading: true, error: null })
        try {
          const response = await apiService.toil.getMyTimesheets(filters)
          if (response.success) {
            set({
              timesheets: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch timesheets')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch timesheets',
            loading: false
          })
          throw error
        }
      },

      /**
       * Fetch team timesheets pending approval (supervisor only)
       */
      fetchSupervisorTimesheets: async (filters = {}) => {
        set({ loading: true, error: null })
        try {
          const response = await apiService.toil.getSupervisorTimesheets(filters)
          if (response.success) {
            set({
              supervisorTimesheets: response.data || [],
              loading: false
            })
            return response.data || []
          } else {
            throw new Error(response.message || 'Failed to fetch team timesheets')
          }
        } catch (error) {
          set({
            supervisorTimesheets: [],
            error: error.message || 'Failed to fetch team timesheets',
            loading: false
          })
          throw error
        }
      },

      /**
       * Fetch leave applications
       */
      fetchLeaveApplications: async (filters = {}) => {
        set({ loading: true, error: null })
        try {
          const response = await apiService.toil.getMyLeaveApplications(filters)
          if (response.success) {
            set({
              leaveApplications: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch leave applications')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch leave applications',
            loading: false
          })
          throw error
        }
      },

      /**
       * Create leave application
       */
      createLeaveApplication: async (data) => {
        set({ submitting: true, error: null })
        try {
          const response = await apiService.toil.createLeaveApplication(data)
          if (response.success) {
            set({ submitting: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to create leave application')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to create leave application',
            submitting: false
          })
          throw error
        }
      },

      /**
       * Submit leave application for approval
       */
      submitLeaveForApproval: async (leaveApplicationName) => {
        set({ submitting: true, error: null })
        try {
          const response = await apiService.toil.submitLeaveForApproval(leaveApplicationName)
          if (response.success) {
            // Refresh leave applications and balance
            await Promise.all([
              get().fetchLeaveApplications(),
              get().fetchTOILBalance()
            ])
            set({ submitting: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to submit leave application')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to submit leave application',
            submitting: false
          })
          throw error
        }
      },

      /**
       * Set selected leave application
       */
      setSelectedLeaveApplication: (leaveApplication) => set({ selectedLeaveApplication: leaveApplication }),

      /**
       * Clear selected leave application
       */
      clearSelectedLeaveApplication: () => set({ selectedLeaveApplication: null }),

      /**
       * Initialize timesheet form - validates setup
       */
      initializeTimesheetForm: async () => {
        set({ loading: true, error: null })
        try {
          const setup = await get().validateSetup()
          set({ loading: false })
          return setup
        } catch (error) {
          set({ loading: false, error: error.message })
          throw error
        }
      },

      /**
       * Initialize leave form - validates setup and fetches balance
       */
      initializeLeaveForm: async () => {
        set({ loading: true, error: null })
        try {
          const setup = await get().validateSetup()
          const balance = await get().fetchTOILBalance()
          set({ loading: false })
          return { setup, balance }
        } catch (error) {
          set({ loading: false, error: error.message })
          throw error
        }
      },

      /**
       * Fetch Leave Ledger entries (transaction history)
       */
      fetchLeaveLedger: async (employeeId = null) => {
        set({ loading: true, error: null })
        try {
          const response = await apiService.toil.getLeaveLedger(employeeId)
          if (response.success) {
            set({
              leaveLedger: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch leave ledger')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch leave ledger',
            loading: false
          })
          throw error
        }
      },

      /**
       * Reset store to initial state
       */
      reset: () => set({
        timesheets: [],
        selectedTimesheet: null,
        leaveApplications: [],
        selectedLeaveApplication: null,
        employeeSetup: null,
        toilBalance: null,
        loading: false,
        error: null,
        submitting: false,
        setupLoading: false,
        balanceLoading: false,
        leaveLoading: false,
        timesheetSubmitting: false,
        submitting: false,
        filters: {
          employee: null,
          status: '',
          dateRange: null,
          search: ''
        },
        pagination: {
          current: 1,
          pageSize: 10,
          total: 0
        },
        viewMode: 'table',
        currentView: 'my-toil',
        userRole: null
      })
    }),
    {
      name: 'toil-store',
      // Only include state in devtools, not functions
      serialize: {
        options: {
          map: {
            timesheets: true,
            selectedTimesheet: true,
            leaveApplications: true,
            selectedLeaveApplication: true,
            employeeSetup: true,
            toilBalance: true,
            loading: true,
            error: true,
            submitting: true,
            setupLoading: true,
            balanceLoading: true,
            leaveLoading: true,
            timesheetSubmitting: true,
            submitting: true,
            filters: true,
            pagination: true,
            viewMode: true,
            currentView: true,
            userRole: true
          }
        }
      }
    }
  )
)

export default useToilStore
