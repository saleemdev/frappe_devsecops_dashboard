/**
 * Incidents Zustand Store
 * Manages incident state and actions
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import apiService from '../services/api/index.js'

const useIncidentsStore = create(
  devtools(
    (set, get) => ({
      // State
      incidents: [],
      selectedIncident: null,
      loading: false,
      error: null,
      filters: {
        status: '',
        severity: '',
        assignedTo: '',
        category: '',
        dateRange: null,
        search: ''
      },
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },
      stats: null,

      // View mode state for toggling between table and calendar views
      viewMode: 'table', // 'table' or 'calendar'

      // Form state management
      formMode: null, // 'create', 'edit', or null
      formData: null, // Current form data being edited
      formErrors: {}, // Form validation errors

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
       * Fetch incidents with current filters and pagination
       */
      fetchIncidents: async () => {
        const { filters, pagination } = get()
        
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.incidents.getIncidents({
            ...filters,
            page: pagination.current,
            limit: pagination.pageSize
          })
          
          if (response.success) {
            set({
              incidents: response.data,
              pagination: {
                ...pagination,
                total: response.total || response.data.length
              },
              loading: false
            })
          } else {
            throw new Error(response.message || 'Failed to fetch incidents')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch incidents',
            loading: false
          })
        }
      },

      /**
       * Fetch single incident by ID
       */
      fetchIncident: async (id) => {
        set({ loading: true, error: null })

        try {
          console.log('[Store] Fetching incident:', id)
          const response = await apiService.incidents.getIncident(id)
          console.log('[Store] API Response:', response)
          console.log('[Store] Response.success:', response.success)
          console.log('[Store] Response.data:', response.data)

          if (response.success) {
            console.log('[Store] Setting selectedIncident:', response.data)
            set({
              selectedIncident: response.data,
              loading: false
            })
            console.log('[Store] Returning data:', response.data)
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch incident')
          }
        } catch (error) {
          console.error('[Store] Error fetching incident:', error)
          set({
            error: error.message || 'Failed to fetch incident',
            loading: false
          })
          throw error
        }
      },

      /**
       * Create new incident
       */
      createIncident: async (incidentData) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.incidents.createIncident(incidentData)
          
          if (response.success) {
            // Refresh incidents list
            await get().fetchIncidents()
            
            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to create incident')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to create incident',
            loading: false
          })
          throw error
        }
      },

      /**
       * Update incident
       */
      updateIncident: async (id, incidentData) => {
        set({ loading: true, error: null })
        
        try {
          const response = await apiService.incidents.updateIncident(id, incidentData)
          
          if (response.success) {
            // Update in incidents list if present
            const { incidents } = get()
            const updatedIncidents = incidents.map(incident =>
              incident.name === id || incident.id === id ? { ...incident, ...response.data } : incident
            )

            // Update selected incident if it's the one being updated
            const { selectedIncident } = get()
            const updatedSelectedIncident = (selectedIncident?.name === id || selectedIncident?.id === id)
              ? { ...selectedIncident, ...response.data }
              : selectedIncident
            
            set({
              incidents: updatedIncidents,
              selectedIncident: updatedSelectedIncident,
              loading: false
            })
            
            return response.data
          } else {
            throw new Error(response.message || 'Failed to update incident')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to update incident',
            loading: false
          })
          throw error
        }
      },

      /**
       * Close incident
       */
      closeIncident: async (id, closeData = {}) => {
        return get().updateIncident(id, { status: 'Closed', ...closeData })
      },

      /**
       * Add timeline entry to incident
       */
      addTimelineEntry: async (id, timelineEntry) => {
        set({ loading: true, error: null })

        try {
          console.log('[Store] Adding timeline entry:', timelineEntry)
          const response = await apiService.incidents.addTimelineEntry(id, timelineEntry)

          console.log('[Store] Response from API:', response)
          console.log('[Store] Response success:', response.success)

          if (response.success) {
            console.log('[Store] Timeline entry added successfully!')
            // Update selected incident if it's the one being updated
            const { selectedIncident } = get()
            if (selectedIncident?.name === id || selectedIncident?.id === id) {
              console.log('[Store] Updating selectedIncident with new data')
              set({
                selectedIncident: response.data,
                loading: false,
                error: null
              })
            } else {
              set({ loading: false, error: null })
            }

            return response.data
          } else {
            const errorMsg = response.message || 'Failed to add timeline entry'
            console.error('[Store] API returned false for success:', errorMsg)
            throw new Error(errorMsg)
          }
        } catch (error) {
          console.error('[Store] Error caught:', error.message)
          const errorMsg = error.message || 'Failed to add timeline entry'
          set({
            error: errorMsg,
            loading: false
          })
          throw error
        }
      },

      /**
       * Remove timeline entry from incident
       */
      removeTimelineEntry: async (id, entryIndex) => {
        set({ loading: true, error: null })

        try {
          const response = await apiService.incidents.removeTimelineEntry(id, entryIndex)

          if (response.success) {
            // Update selected incident if it's the one being updated
            const { selectedIncident } = get()
            if (selectedIncident?.name === id || selectedIncident?.id === id) {
              set({
                selectedIncident: response.data,
                loading: false
              })
            } else {
              set({ loading: false })
            }

            return response.data
          } else {
            throw new Error(response.message || 'Failed to remove timeline entry')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to remove timeline entry',
            loading: false
          })
          throw error
        }
      },

      /**
       * Fetch incident statistics
       */
      fetchStats: async (timeRange = '30d') => {
        try {
          const response = await apiService.incidents.getIncidentStats(timeRange)
          
          if (response.success) {
            set({ stats: response.data })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch incident stats')
          }
        } catch (error) {
          set({ error: error.message || 'Failed to fetch incident stats' })
          throw error
        }
      },

      /**
       * Set selected incident
       */
      setSelectedIncident: (incident) => set({ selectedIncident: incident }),

      /**
       * Clear selected incident
       */
      clearSelectedIncident: () => set({ selectedIncident: null }),

      /**
       * Search incidents
       */
      searchIncidents: async (searchTerm) => {
        const { setFilters, fetchIncidents } = get()
        
        setFilters({ search: searchTerm })
        await fetchIncidents()
      },

      /**
       * Initialize form for creation
       */
      initializeCreateForm: () => {
        set({
          formMode: 'create',
          formData: null,
          formErrors: {},
          selectedIncident: null
        })
      },

      /**
       * Initialize form for editing
       */
      initializeEditForm: async (incidentId) => {
        try {
          set({ formMode: 'edit', formErrors: {} })
          // Load the incident data
          const incident = await get().fetchIncident(incidentId)
          set({ formData: incident })
          return incident
        } catch (error) {
          set({ formMode: null, formData: null })
          throw error
        }
      },

      /**
       * Set form data
       */
      setFormData: (data) => set({ formData: data }),

      /**
       * Set form errors
       */
      setFormErrors: (errors) => set({ formErrors: errors }),

      /**
       * Clear form errors
       */
      clearFormErrors: () => set({ formErrors: {} }),

      /**
       * Reset form to initial state
       */
      resetForm: () => set({
        formMode: null,
        formData: null,
        formErrors: {}
      }),

      /**
       * Set view mode (table or calendar)
       */
      setViewMode: (mode) => {
        if (mode !== 'table' && mode !== 'calendar') {
          console.warn('[incidentsStore] Invalid view mode:', mode)
          return
        }
        set({ viewMode: mode })
        // Persist to localStorage
        try {
          localStorage.setItem('incidents_view_mode', mode)
        } catch (error) {
          console.error('[incidentsStore] Failed to save view mode:', error)
        }
      },

      /**
       * Load view mode from localStorage
       */
      loadViewMode: () => {
        try {
          const savedMode = localStorage.getItem('incidents_view_mode')
          if (savedMode === 'table' || savedMode === 'calendar') {
            set({ viewMode: savedMode })
          }
        } catch (error) {
          console.error('[incidentsStore] Failed to load view mode:', error)
        }
      },

      /**
       * Reset store to initial state
       */
      reset: () => set({
        incidents: [],
        selectedIncident: null,
        loading: false,
        error: null,
        filters: {
          status: '',
          severity: '',
          assignedTo: '',
          category: '',
          dateRange: null,
          search: ''
        },
        pagination: {
          current: 1,
          pageSize: 10,
          total: 0
        },
        stats: null,
        viewMode: 'table',
        formMode: null,
        formData: null,
        formErrors: {}
      })
    }),
    {
      name: 'incidents-store',
      // Only include state in devtools, not functions
      serialize: {
        options: {
          map: {
            incidents: true,
            selectedIncident: true,
            loading: true,
            error: true,
            filters: true,
            pagination: true,
            stats: true,
            formMode: true,
            formData: true,
            formErrors: true
          }
        }
      }
    }
  )
)

export default useIncidentsStore
