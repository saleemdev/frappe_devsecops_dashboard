/**
 * Swagger Collections Store
 * Manages swagger collections state using Zustand
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import swaggerCollectionsService from '../services/api/swaggerCollections.js'

const useSwaggerCollectionsStore = create(
  devtools(
    (set, get) => ({
      // State
      swaggerCollections: [],
      selectedSwaggerCollection: null,
      loading: false,
      error: null,
      filters: {
        status: '',
        project: '',
        version: '',
        search: ''
      },
      pagination: {
        current: 1,
        pageSize: 10,
        total: 0
      },

      // Actions
      /**
       * Fetch all swagger collections
       */
      fetchSwaggerCollections: async (customFilters = {}) => {
        set({ loading: true, error: null })
        
        try {
          const state = get()
          const filters = { ...state.filters, ...customFilters }
          
          const response = await swaggerCollectionsService.getSwaggerCollections(filters)
          
          if (response.success) {
            set({
              swaggerCollections: response.data,
              pagination: {
                ...state.pagination,
                total: response.total
              },
              loading: false
            })
          } else {
            throw new Error(response.message || 'Failed to fetch swagger collections')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch swagger collections',
            loading: false
          })
        }
      },

      /**
       * Fetch swagger collection by ID
       */
      fetchSwaggerCollection: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await swaggerCollectionsService.getSwaggerCollection(id)
          
          if (response.success) {
            set({
              selectedSwaggerCollection: response.data,
              loading: false
            })
          } else {
            throw new Error(response.message || 'Failed to fetch swagger collection')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to fetch swagger collection',
            loading: false
          })
        }
      },

      /**
       * Create new swagger collection
       */
      createSwaggerCollection: async (collectionData) => {
        set({ loading: true, error: null })
        
        try {
          const response = await swaggerCollectionsService.createSwaggerCollection(collectionData)
          
          if (response.success) {
            // Refresh the list
            await get().fetchSwaggerCollections()
            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to create swagger collection')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to create swagger collection',
            loading: false
          })
          throw error
        }
      },

      /**
       * Update swagger collection
       */
      updateSwaggerCollection: async (id, collectionData) => {
        set({ loading: true, error: null })
        
        try {
          const response = await swaggerCollectionsService.updateSwaggerCollection(id, collectionData)
          
          if (response.success) {
            // Update the selected collection if it's the one being updated
            const state = get()
            if (state.selectedSwaggerCollection?.id === id) {
              set({ selectedSwaggerCollection: response.data })
            }
            
            // Refresh the list
            await get().fetchSwaggerCollections()
            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to update swagger collection')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to update swagger collection',
            loading: false
          })
          throw error
        }
      },

      /**
       * Delete swagger collection
       */
      deleteSwaggerCollection: async (id) => {
        set({ loading: true, error: null })
        
        try {
          const response = await swaggerCollectionsService.deleteSwaggerCollection(id)
          
          if (response.success) {
            // Remove from local state
            const state = get()
            const updatedCollections = state.swaggerCollections.filter(collection => collection.id !== id)
            
            set({
              swaggerCollections: updatedCollections,
              selectedSwaggerCollection: state.selectedSwaggerCollection?.id === id ? null : state.selectedSwaggerCollection,
              loading: false
            })
            
            return true
          } else {
            throw new Error(response.message || 'Failed to delete swagger collection')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to delete swagger collection',
            loading: false
          })
          throw error
        }
      },

      /**
       * Import swagger collection
       */
      importSwaggerCollection: async (importData) => {
        set({ loading: true, error: null })
        
        try {
          const response = await swaggerCollectionsService.importSwaggerCollection(importData)
          
          if (response.success) {
            // Refresh the list
            await get().fetchSwaggerCollections()
            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to import swagger collection')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to import swagger collection',
            loading: false
          })
          throw error
        }
      },

      /**
       * Export swagger collection
       */
      exportSwaggerCollection: async (id, format = 'json') => {
        set({ loading: true, error: null })
        
        try {
          const response = await swaggerCollectionsService.exportSwaggerCollection(id, format)
          
          if (response.success) {
            set({ loading: false })
            return response.data
          } else {
            throw new Error(response.message || 'Failed to export swagger collection')
          }
        } catch (error) {
          set({
            error: error.message || 'Failed to export swagger collection',
            loading: false
          })
          throw error
        }
      },

      /**
       * Set filters
       */
      setFilters: (newFilters) => {
        const state = get()
        set({
          filters: { ...state.filters, ...newFilters },
          pagination: { ...state.pagination, current: 1 }
        })
      },

      /**
       * Set pagination
       */
      setPagination: (newPagination) => {
        const state = get()
        set({
          pagination: { ...state.pagination, ...newPagination }
        })
      },

      /**
       * Clear error
       */
      clearError: () => set({ error: null }),

      /**
       * Clear selected swagger collection
       */
      clearSelectedSwaggerCollection: () => set({ selectedSwaggerCollection: null }),

      /**
       * Reset store
       */
      reset: () => set({
        swaggerCollections: [],
        selectedSwaggerCollection: null,
        loading: false,
        error: null,
        filters: {
          status: '',
          project: '',
          version: '',
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
      name: 'swagger-collections-store'
    }
  )
)

export default useSwaggerCollectionsStore
