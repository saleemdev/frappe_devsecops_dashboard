import { create } from 'zustand'

const useChangeManagementTeamStore = create((set, get) => ({
  teams: [],
  selectedTeam: null,
  loading: false,
  error: null,
  filters: {
    search: '',
    status: 'all'
  },
  pagination: {
    current: 1,
    pageSize: 10,
    total: 0
  },
  formMode: null, // 'create', 'edit', null
  formData: null,
  formErrors: {},

  // Fetch all teams
  fetchTeams: async (filters = {}, pagination = {}) => {
    set({ loading: true, error: null })
    try {
      const page = pagination.current || 1
      const pageSize = pagination.pageSize || 10
      const offset = (page - 1) * pageSize

      // Build filter conditions
      let filterConditions = []
      if (filters.search) {
        filterConditions.push(['name', 'like', `%${filters.search}%`])
      }
      if (filters.status && filters.status !== 'all') {
        filterConditions.push(['status', '=', filters.status])
      }

      const response = await fetch(
        `/api/resource/Change Management Team?${new URLSearchParams({
          fields: JSON.stringify(['name', 'team_name', 'status', 'description', 'creation', 'modified', 'is_default']),
          filters: JSON.stringify(filterConditions),
          offset: offset,
          limit_page_length: pageSize,
          order_by: 'modified desc'
        })}`,
        {
          method: 'GET',
          headers: {
            'X-Frappe-CSRF-Token': window.csrf_token || ''
          },
          credentials: 'include'
        }
      )

      if (response.ok) {
        const result = await response.json()
        const teams = result.data || []

        // Get total count
        const countResponse = await fetch(
          `/api/resource/Change Management Team?${new URLSearchParams({
            filters: JSON.stringify(filterConditions),
            fields: JSON.stringify(['name'])
          })}`,
          {
            method: 'GET',
            headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
            credentials: 'include'
          }
        )

        const countResult = countResponse.ok ? await countResponse.json() : { data: [] }
        const total = countResult.data?.length || teams.length

        set({
          teams,
          pagination: { ...pagination, current: page, pageSize, total },
          loading: false
        })
      } else {
        throw new Error('Failed to fetch teams')
      }
    } catch (error) {
      console.error('[ChangeManagementTeamStore] Error fetching teams:', error)
      set({ error: error.message, loading: false })
    }
  },

  // Fetch single team
  fetchTeam: async (teamId) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/resource/Change Management Team/${teamId}`, {
        method: 'GET',
        headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
        credentials: 'include'
      })

      if (response.ok) {
        const result = await response.json()
        set({ selectedTeam: result.data, loading: false })
        return result.data
      } else {
        throw new Error('Failed to fetch team')
      }
    } catch (error) {
      console.error('[ChangeManagementTeamStore] Error fetching team:', error)
      set({ error: error.message, loading: false })
      return null
    }
  },

  // Create new team
  createTeam: async (data) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch('/api/resource/Change Management Team', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        const newTeam = result.data
        set((state) => ({
          teams: [newTeam, ...state.teams],
          selectedTeam: newTeam,
          loading: false,
          formMode: null
        }))
        return newTeam
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to create team')
      }
    } catch (error) {
      console.error('[ChangeManagementTeamStore] Error creating team:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Update team
  updateTeam: async (teamId, data) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/resource/Change Management Team/${teamId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'X-Frappe-CSRF-Token': window.csrf_token || ''
        },
        credentials: 'include',
        body: JSON.stringify(data)
      })

      if (response.ok) {
        const result = await response.json()
        const updatedTeam = result.data

        set((state) => ({
          teams: state.teams.map((t) => (t.name === teamId ? updatedTeam : t)),
          selectedTeam: updatedTeam,
          loading: false,
          formMode: null
        }))

        return updatedTeam
      } else {
        const errorData = await response.json()
        throw new Error(errorData.message || 'Failed to update team')
      }
    } catch (error) {
      console.error('[ChangeManagementTeamStore] Error updating team:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Delete team
  deleteTeam: async (teamId) => {
    set({ loading: true, error: null })
    try {
      const response = await fetch(`/api/resource/Change Management Team/${teamId}`, {
        method: 'DELETE',
        headers: { 'X-Frappe-CSRF-Token': window.csrf_token || '' },
        credentials: 'include'
      })

      if (response.ok) {
        set((state) => ({
          teams: state.teams.filter((t) => t.name !== teamId),
          selectedTeam: state.selectedTeam?.name === teamId ? null : state.selectedTeam,
          loading: false
        }))
      } else {
        throw new Error('Failed to delete team')
      }
    } catch (error) {
      console.error('[ChangeManagementTeamStore] Error deleting team:', error)
      set({ error: error.message, loading: false })
      throw error
    }
  },

  // Set filters and reset pagination
  setFilters: (filters) => {
    set({ filters, pagination: { current: 1, pageSize: 10, total: 0 } })
    get().fetchTeams(filters, { current: 1, pageSize: 10 })
  },

  // Set pagination
  setPagination: (pagination) => {
    const state = get()
    set({ pagination })
    state.fetchTeams(state.filters, pagination)
  },

  // Set form mode
  setFormMode: (mode) => set({ formMode: mode }),

  // Set form data
  setFormData: (data) => set({ formData: data }),

  // Clear error
  clearError: () => set({ error: null })
}))

export default useChangeManagementTeamStore
