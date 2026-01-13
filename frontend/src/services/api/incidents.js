/**
 * Incidents API Service
 * Handles all incident-related API calls
 */

import { API_CONFIG, createApiClient, withRetry, withCache, isMockEnabled } from './config.js'
import { mockIncidents, simulateDelay } from './mockData.js'

class IncidentsService {
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
   * Get all incidents
   */
  async getIncidents(filters = {}) {
    if (isMockEnabled('incidents')) {
      await simulateDelay()

      let incidents = [...mockIncidents]

      // Apply filters (handle both camelCase and snake_case)
      if (filters.status) {
        incidents = incidents.filter(incident => incident.status === filters.status)
      }
      if (filters.severity) {
        incidents = incidents.filter(incident => incident.severity === filters.severity)
      }
      if (filters.assigned_to || filters.assignedTo) {
        const assignedToValue = filters.assigned_to || filters.assignedTo
        incidents = incidents.filter(incident => (incident.assigned_to || incident.assignedTo) === assignedToValue)
      }
      if (filters.category) {
        incidents = incidents.filter(incident => incident.category === filters.category)
      }
      if (filters.dateRange) {
        const [startDate, endDate] = filters.dateRange
        incidents = incidents.filter(incident => {
          const incidentDate = new Date(incident.reported_date || incident.reportedDate)
          return incidentDate >= new Date(startDate) && incidentDate <= new Date(endDate)
        })
      }

      return {
        success: true,
        data: incidents,
        total: incidents.length
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`incidents-${JSON.stringify(filters)}`, async () => {
        const params = new URLSearchParams()

        // Convert filters to Frappe format
        if (filters.status) params.append('filters', JSON.stringify([['status', '=', filters.status]]))
        if (filters.severity) params.append('filters', JSON.stringify([['severity', '=', filters.severity]]))
        if (filters.assigned_to) params.append('filters', JSON.stringify([['assigned_to', '=', filters.assigned_to]]))
        if (filters.category) params.append('filters', JSON.stringify([['category', '=', filters.category]]))

        const response = await client.get(API_CONFIG.endpoints.incidents.list, {
          params: {
            fields: JSON.stringify(['name', 'title', 'priority', 'status', 'category', 'severity', 'assigned_to', 'assigned_to_name', 'reported_by', 'reported_date', 'project', 'project_name']),
            limit_start: filters.limit_start || 0,
            limit_page_length: filters.limit_page_length || 20,
            order_by: filters.order_by || 'modified desc'
          }
        })

        // Frappe wraps the response in 'message' property
        const apiResponse = response.data.message || response.data

        return {
          success: apiResponse.success,
          data: apiResponse.data || [],
          total: apiResponse.total || 0
        }
      })
    })
  }

  /**
   * Get incident by ID
   */
  async getIncident(id) {
    if (isMockEnabled('incidents')) {
      await simulateDelay()

      const incident = mockIncidents.find(inc => inc.name === id || inc.id === id)

      if (!incident) {
        throw {
          status: 404,
          message: 'Incident not found',
          data: null
        }
      }

      return {
        success: true,
        data: incident
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      return withCache(`incident-${id}`, async () => {
        try {
          const response = await client.get(API_CONFIG.endpoints.incidents.detail, {
            params: { name: id }
          })

          // Frappe wraps the response in 'message' property
          const apiResponse = response.data.message || response.data

          console.log('[IncidentsService] Raw API response:', response.data)
          console.log('[IncidentsService] Parsed API response:', apiResponse)

          // Check if the response indicates an error
          if (apiResponse.exc || (apiResponse.success === false)) {
            const errorMessage = apiResponse.error || apiResponse.message || apiResponse.exc || 'Failed to fetch incident'
            console.error('[IncidentsService] API returned error:', errorMessage)
            throw {
              status: 400,
              message: errorMessage,
              data: apiResponse
            }
          }

          // Validate we got actual data
          if (!apiResponse.data) {
            console.error('[IncidentsService] No incident data returned')
            throw {
              status: 404,
              message: 'Incident not found',
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
            message: error.message || 'Failed to fetch incident',
            data: null
          }
        }
      })
    })
  }

  /**
   * Create new incident
   */
  async createIncident(incidentData) {
    if (isMockEnabled('incidents')) {
      await simulateDelay(1000)

      const newIncident = {
        name: `INC-${String(Date.now()).slice(-3).padStart(3, '0')}`,
        ...incidentData,
        reported_date: new Date().toISOString(),
        timeline: [
          {
            event_timestamp: new Date().toISOString(),
            event_type: 'Manual',
            description: 'Initial incident report created',
            user: incidentData.reported_by || 'System'
          }
        ]
      }

      // In real implementation, this would be persisted
      mockIncidents.unshift(newIncident)

      return {
        success: true,
        data: newIncident,
        message: 'Incident created successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      const response = await client.post(API_CONFIG.endpoints.incidents.create, {
        data: JSON.stringify(incidentData)
      })

      // Clear cache after creation
      this.clearIncidentsCache()

      return {
        success: response.data.success,
        data: response.data.data,
        message: response.data.message || 'Incident created successfully'
      }
    })
  }

  /**
   * Update incident
   */
  async updateIncident(id, incidentData) {
    if (isMockEnabled('incidents')) {
      await simulateDelay(800)

      const index = mockIncidents.findIndex(inc => inc.name === id || inc.id === id)

      if (index === -1) {
        throw {
          status: 404,
          message: 'Incident not found',
          data: null
        }
      }

      const updatedIncident = {
        ...mockIncidents[index],
        ...incidentData
      }

      // Add timeline entry for update
      if (!updatedIncident.incident_timeline) {
        updatedIncident.incident_timeline = []
      }

      updatedIncident.incident_timeline.push({
        event_timestamp: new Date().toISOString(),
        event_type: 'Manual',
        description: 'Incident details updated',
        user: incidentData.updated_by || 'System'
      })

      mockIncidents[index] = updatedIncident

      return {
        success: true,
        data: updatedIncident,
        message: 'Incident updated successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      try {
        const response = await client.post(API_CONFIG.endpoints.incidents.update, {
          name: id,
          data: JSON.stringify(incidentData)
        })

        // Frappe wraps response in message
        const apiResponse = response.data.message || response.data

        console.log('[IncidentsService] Update response:', apiResponse)

        // Check if the response indicates an error
        if (apiResponse.exc || (apiResponse.success === false)) {
          const errorMessage = apiResponse.error || apiResponse.message || apiResponse.exc || 'Failed to update incident'
          console.error('[IncidentsService] Update failed:', errorMessage)
          throw {
            status: 400,
            message: errorMessage,
            data: apiResponse
          }
        }

        // Clear cache after successful update
        this.clearIncidentsCache()

        return {
          success: true,
          data: apiResponse.data || apiResponse,
          message: apiResponse.message || 'Incident updated successfully'
        }
      } catch (error) {
        if (error.status) {
          throw error
        }
        throw {
          status: error.response?.status || 500,
          message: error.message || 'Failed to update incident',
          data: null
        }
      }
    })
  }

  /**
   * Close incident
   */
  async closeIncident(id, closeData = {}) {
    const updateData = {
      status: 'Closed',
      ...closeData
    }

    return this.updateIncident(id, updateData)
  }

  /**
   * Delete incident
   */
  async deleteIncident(id) {
    if (isMockEnabled('incidents')) {
      await simulateDelay(500)

      const index = mockIncidents.findIndex(inc => inc.name === id || inc.id === id)

      if (index === -1) {
        throw {
          status: 404,
          message: 'Incident not found',
          data: null
        }
      }

      mockIncidents.splice(index, 1)

      return {
        success: true,
        message: 'Incident deleted successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      const response = await client.post(API_CONFIG.endpoints.incidents.delete, {
        name: id
      })

      // Clear cache after deletion
      this.clearIncidentsCache()

      return {
        success: response.data.success,
        message: response.data.message || 'Incident deleted successfully'
      }
    })
  }

  /**
   * Add timeline entry to incident
   */
  async addTimelineEntry(id, timelineEntry) {
    if (isMockEnabled('incidents')) {
      await simulateDelay(300)

      const index = mockIncidents.findIndex(inc => inc.name === id || inc.id === id)
      
      if (index === -1) {
        throw {
          status: 404,
          message: 'Incident not found',
          data: null
        }
      }
      
      const incident = mockIncidents[index]
      
      if (!incident.timeline) {
        incident.timeline = []
      }
      
      const newEntry = {
        date: new Date().toISOString().slice(0, 16).replace('T', ' '),
        ...timelineEntry
      }
      
      incident.timeline.push(newEntry)
      incident.updatedDate = new Date().toISOString().split('T')[0]
      
      return {
        success: true,
        data: incident,
        message: 'Timeline entry added successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.incidents.add_timeline_entry', {
        name: id,
        event_type: timelineEntry.event_type,
        event_timestamp: timelineEntry.event_timestamp,
        description: timelineEntry.description,
        event_source: timelineEntry.event_source || null
      })

      console.log('[API] Full axios response:', response)
      console.log('[API] Response status:', response.status)
      console.log('[API] Response data:', response.data)

      // Clear cache after update
      this.clearIncidentsCache()

      // The axios interceptor already unwrapped response.data.message
      // So response.data is now the unwrapped {success, data, message} object
      const apiResponse = response.data

      console.log('[API] API Response after unwrap:', apiResponse)
      console.log('[API] API Response success value:', apiResponse?.success)
      console.log('[API] API Response success type:', typeof apiResponse?.success)

      // If we got a 2xx response and have data, it's a success
      // The backend returns {success: true, data: {...}, message: "..."}
      if (response.status >= 200 && response.status < 300) {
        console.log('[API] HTTP success (2xx), treating as successful')
        return {
          success: true,
          data: apiResponse?.data || apiResponse,
          message: apiResponse?.message || 'Timeline entry added successfully'
        }
      } else {
        console.error('[API] HTTP error status:', response.status)
        throw new Error(apiResponse?.message || 'Failed to add timeline entry')
      }
    })
  }

  /**
   * Remove timeline entry from incident
   */
  async removeTimelineEntry(id, entryIndex) {
    if (isMockEnabled('incidents')) {
      await simulateDelay(300)

      const index = mockIncidents.findIndex(inc => inc.name === id || inc.id === id)

      if (index === -1) {
        throw {
          status: 404,
          message: 'Incident not found',
          data: null
        }
      }

      const incident = mockIncidents[index]

      if (!incident.timeline || entryIndex >= incident.timeline.length) {
        throw {
          status: 400,
          message: 'Timeline entry not found',
          data: null
        }
      }

      // Prevent deletion of "Incident Reported" entries
      if (incident.timeline[entryIndex].event_type === 'Incident Reported') {
        throw {
          status: 403,
          message: 'Cannot delete "Incident Reported" timeline entry',
          data: null
        }
      }

      incident.timeline.splice(entryIndex, 1)
      incident.updatedDate = new Date().toISOString().split('T')[0]

      return {
        success: true,
        data: incident,
        message: 'Timeline entry removed successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()

    return withRetry(async () => {
      const response = await client.post('/api/method/frappe_devsecops_dashboard.api.incidents.remove_timeline_entry', {
        name: id,
        entry_index: entryIndex
      })

      // Clear cache after update
      this.clearIncidentsCache()

      // Frappe wraps the response in 'message' property
      const apiResponse = response.data.message || response.data

      return {
        success: apiResponse.success,
        data: apiResponse.data,
        message: apiResponse.message || 'Timeline entry removed successfully'
      }
    })
  }

  /**
   * Get incident statistics
   */
  async getIncidentStats(timeRange = '30d') {
    if (isMockEnabled('incidents')) {
      await simulateDelay()
      
      const stats = {
        total: mockIncidents.length,
        open: mockIncidents.filter(inc => inc.status === 'Open').length,
        inProgress: mockIncidents.filter(inc => inc.status === 'In Progress').length,
        closed: mockIncidents.filter(inc => inc.status === 'Closed').length,
        bySeverity: {
          critical: mockIncidents.filter(inc => inc.severity === 'Critical').length,
          high: mockIncidents.filter(inc => inc.severity === 'High').length,
          medium: mockIncidents.filter(inc => inc.severity === 'Medium').length,
          low: mockIncidents.filter(inc => inc.severity === 'Low').length
        },
        byCategory: mockIncidents.reduce((acc, inc) => {
          acc[inc.category] = (acc[inc.category] || 0) + 1
          return acc
        }, {})
      }
      
      return {
        success: true,
        data: stats
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      return withCache(`incident-stats-${timeRange}`, async () => {
        const response = await client.get(`${API_CONFIG.endpoints.incidents.list}/stats`, {
          params: { timeRange }
        })
        
        return {
          success: true,
          data: response.data
        }
      })
    })
  }

  /**
   * Clear incidents cache
   */
  clearIncidentsCache() {
    // Import clearCache dynamically to avoid circular dependency
    import('./config.js').then(({ clearCache }) => {
      clearCache('incidents')
      clearCache('incident')
      clearCache('incident-stats')
    })
  }
}

// Export singleton instance
export default new IncidentsService()
