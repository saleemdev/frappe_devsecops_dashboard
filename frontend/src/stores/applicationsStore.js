/**
 * Applications Zustand Store
 * Manages application state and actions
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import apiService from '../services/api/index.js'

const useApplicationsStore = create(
  devtools(
    (set, get) => ({
      // State
      applications: [],
      selectedApplication: null,
      loading: false,
      error: null,
      filters: {
        status: '',
        project: '',
        technology: '',
        search: ''
      },
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },

      // Actions
      setLoading: (loading) => set({ loading }),
      
      setError: (error) => set({ error }),
      
      clearError: () => set({ error: null }),

      setFilters: (filters) => set((state) => ({
        filters: { ...state.filters, ...filters },
        pagination: { ...state.pagination, current: 1 } // Reset to first page when filtering
      })),

      setPagination: (pagination) => set((state) => ({
        pagination: { ...state.pagination, ...pagination }
      })),

      /**
       * Fetch applications with current filters and pagination
       */
      fetchApplications: async () => {
        const { filters, pagination } = get()
        
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.applications.getApplications({
            ...filters,
            page: pagination.current,
            limit: pagination.pageSize
          })
          
          if (response.success) {
            set({
              applications: response.data,
              pagination: {
                ...pagination,
                total: response.total || response.data.length
              },
              loading: false
            })
          } else {
            throw new Error(response.message || 'Failed to fetch applications')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch applications',
            loading: false
          })
        }
      },

      /**
       * Fetch single application by ID
       */
      fetchApplication: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.applications.getApplication(id)
          
          if (response.success) {
            set({
              selectedApplication: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch application')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch application',
            loading: false
          })
          throw error
        }
      },

      /**
       * Create new application
       */
      createApplication: async (applicationData) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.applications.createApplication(applicationData)
          
          if (response.success) {
            // Refresh applications list
            await get().fetchApplications()
            
            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to create application')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to create application',
            loading: false
          })
          throw error
        }
      },

      /**
       * Update application
       */
      updateApplication: async (id, applicationData) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.applications.updateApplication(id, applicationData)
          
          if (response.success) {
            // Update in applications list if present
            const { applications } = get()
            const updatedApplications = applications.map(app =>
              app.id === id ? { ...app, ...response.data } : app
            )
            
            // Update selected application if it's the one being updated
            const { selectedApplication } = get()
            const updatedSelectedApplication = selectedApplication?.id === id
              ? { ...selectedApplication, ...response.data }
              : selectedApplication
            
            set({
              applications: updatedApplications,
              selectedApplication: updatedSelectedApplication,
              loading: false
            })
            
            return response.data
          } else {
            throw new Error(response.message || 'Failed to update application')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to update application',
            loading: false
          })
          throw error
        }
      },

      /**
       * Delete application
       */
      deleteApplication: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.applications.deleteApplication(id)
          
          if (response.success) {
            // Remove from applications list
            const { applications } = get()
            const updatedApplications = applications.filter(app => app.id !== id)
            
            // Clear selected application if it's the one being deleted
            const { selectedApplication } = get()
            const updatedSelectedApplication = selectedApplication?.id === id
              ? null
              : selectedApplication
            
            set({
              applications: updatedApplications,
              selectedApplication: updatedSelectedApplication,
              loading: false
            })
            
            return true
          } else {
            throw new Error(response.message || 'Failed to delete application')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to delete application',
            loading: false
          })
          throw error
        }
      },

      /**
       * Set selected application
       */
      setSelectedApplication: (application) => set({ selectedApplication: application }),

      /**
       * Clear selected application
       */
      clearSelectedApplication: () => set({ selectedApplication: null }),

      /**
       * Search applications
       */
      searchApplications: async (searchTerm) => {
        const { setFilters, fetchApplications } = get()
        
        setFilters({ search: searchTerm })
        await fetchApplications()
      },

      /**
       * Reset store to initial state
       */
      reset: () => set({
        applications: [],
        selectedApplication: null,
        loading: false,
        error: null,
        filters: {
          status: '',
          project: '',
          technology: '',
          search: ''
        },
        pagination: {
          current: 1,
          pageSize: 10,
          total: 0
        }
      })
    }),
    {
      name: 'applications-store',
      // Only include state in devtools, not functions
      serialize: {
        options: {
          map: {
            applications: true,
            selectedApplication: true,
            loading: true,
            error: true,
            filters: true,
            pagination: true
          }
        }
      }
    }
  )
)

export default useApplicationsStore
