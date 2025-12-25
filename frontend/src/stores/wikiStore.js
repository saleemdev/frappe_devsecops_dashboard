/**
 * Wiki Zustand Store
 * Manages wiki spaces, pages, and sidebar state
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import { getWikiSpaces, getWikiSpaceSidebar } from '../api/wiki'

const useWikiStore = create(
  devtools(
    (set, get) => ({
      // State
      spaces: [],
      pagesPerSpace: {}, // { spaceId: [pages] }
      expandedSpaces: [],
      loading: false,
      error: null,

      // Actions
      setLoading: (loading) => set({ loading }),

      setError: (error) => set({ error }),

      setSpaces: (spaces) => set({ spaces }),

      setExpandedSpaces: (expandedSpaces) => set({ expandedSpaces }),

      toggleSpaceExpansion: (spaceName) => {
        const { expandedSpaces } = get()
        const isExpanded = expandedSpaces.includes(spaceName)

        set({
          expandedSpaces: isExpanded
            ? expandedSpaces.filter(key => key !== spaceName)
            : [...expandedSpaces, spaceName]
        })

        // Load pages if expanding and not already loaded
        if (!isExpanded) {
          get().loadSpacePages(spaceName)
        }
      },

      loadSpaces: async () => {
        try {
          set({ loading: true, error: null })
          const spaces = await getWikiSpaces()
          set({ spaces, loading: false })
        } catch (error) {
          console.error('[WikiStore] Error loading spaces:', error)
          set({ error: error.message, loading: false })
        }
      },

      loadSpacePages: async (spaceName) => {
        try {
          console.log('[WikiStore] Loading pages for space:', spaceName)
          const pages = await getWikiSpaceSidebar(spaceName)
          console.log('[WikiStore] Loaded pages:', pages)

          set((state) => ({
            pagesPerSpace: {
              ...state.pagesPerSpace,
              [spaceName]: pages || []
            }
          }))
        } catch (error) {
          console.error('[WikiStore] Error loading pages:', error)
          set({ error: error.message })
        }
      },

      refreshSpacePages: async (spaceName) => {
        // Force refresh pages for a space
        await get().loadSpacePages(spaceName)
      },

      refreshAll: async () => {
        // Refresh spaces and all expanded space pages
        const { expandedSpaces } = get()
        await get().loadSpaces()

        // Reload pages for currently expanded spaces
        for (const spaceName of expandedSpaces) {
          await get().loadSpacePages(spaceName)
        }
      },

      clearPages: (spaceName) => {
        set((state) => {
          const newPagesPerSpace = { ...state.pagesPerSpace }
          delete newPagesPerSpace[spaceName]
          return { pagesPerSpace: newPagesPerSpace }
        })
      }
    }),
    { name: 'WikiStore' }
  )
)

export default useWikiStore
