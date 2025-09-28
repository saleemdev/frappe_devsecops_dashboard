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
          console.error('Error fetching incidents:', error)
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
          const response = await apiService.incidents.getIncident(id)
          
          if (response.success) {
            set({
              selectedIncident: response.data,
              loading: false
            })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to fetch incident')
          }
        } catch (error) {
          console.error('Error fetching incident:', error)
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
          console.error('Error creating incident:', error)
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
              incident.id === id ? { ...incident, ...response.data } : incident
            )
            
            // Update selected incident if it's the one being updated
            const { selectedIncident } = get()
            const updatedSelectedIncident = selectedIncident?.id === id
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
          console.error('Error updating incident:', error)
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
          const response = await apiService.incidents.addTimelineEntry(id, timelineEntry)
          
          if (response.success) {
            // Update selected incident if it's the one being updated
            const { selectedIncident } = get()
            if (selectedIncident?.id === id) {
              set({
                selectedIncident: response.data,
                loading: false
              })
            } else {
              set({ loading: false })
            }
            
            return response.data
          } else {
            throw new Error(response.message || 'Failed to add timeline entry')
          }
        } catch (error) {
          console.error('Error adding timeline entry:', error)
          set({
            error: error.message || 'Failed to add timeline entry',
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
          console.error('Error fetching incident stats:', error)
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
        stats: null
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
            stats: true
          }
        }
      }
    }
  )
)

export default useIncidentsStore
