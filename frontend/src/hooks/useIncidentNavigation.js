/**
 * Incident Navigation Hook
 * Provides reliable incident navigation and CRUD operations
 */

import { useCallback } from 'react'
import useNavigationStore from '../stores/navigationStore'
import useIncidentsStore from '../stores/incidentsStore'

export const useIncidentNavigation = () => {
  const { navigateToRoute } = useNavigationStore()
  const { fetchIncident } = useIncidentsStore()

  // Navigate to incidents list
  const goToIncidentsList = useCallback(() => {
    navigateToRoute('incidents')
  }, [navigateToRoute])

  // Navigate to view incident detail
  const viewIncident = useCallback((incidentId) => {
    if (!incidentId) {
      console.error('[IncidentNav] viewIncident: incidentId is required')
      return
    }
    console.log('[IncidentNav] Navigating to view incident:', incidentId)
    navigateToRoute('incident-detail', null, incidentId)
  }, [navigateToRoute])

  // Navigate to edit incident
  const editIncident = useCallback((incidentId) => {
    if (!incidentId) {
      console.error('[IncidentNav] editIncident: incidentId is required')
      return
    }
    console.log('[IncidentNav] Navigating to edit incident:', incidentId)
    navigateToRoute('incident-edit', null, incidentId)
  }, [navigateToRoute])

  // Navigate to create incident
  const createIncident = useCallback(() => {
    console.log('[IncidentNav] Navigating to create incident')
    navigateToRoute('incident-create')
  }, [navigateToRoute])

  // Navigate and load incident
  const viewIncidentWithLoad = useCallback(async (incidentId) => {
    if (!incidentId) {
      console.error('[IncidentNav] viewIncidentWithLoad: incidentId is required')
      return
    }

    try {
      console.log('[IncidentNav] Loading and viewing incident:', incidentId)
      // First navigate
      navigateToRoute('incident-detail', null, incidentId)
      // Then load the data
      await fetchIncident(incidentId)
    } catch (error) {
      console.error('[IncidentNav] Error viewing incident:', error)
    }
  }, [navigateToRoute, fetchIncident])

  return {
    goToIncidentsList,
    viewIncident,
    editIncident,
    createIncident,
    viewIncidentWithLoad
  }
}

export default useIncidentNavigation
