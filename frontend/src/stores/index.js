/**
 * Stores Index
 * Central export point for all Zustand stores
 */

import useAuthStore from './authStore.js'
import useNavigationStore from './navigationStore.js'
import useApplicationsStore from './applicationsStore.js'
import useIncidentsStore from './incidentsStore.js'
import useSwaggerCollectionsStore from './swaggerCollectionsStore.js'

// Store utilities
export const resetAllStores = () => {
  useAuthStore.getState().reset()
  useNavigationStore.getState().reset()
  useApplicationsStore.getState().reset()
  useIncidentsStore.getState().reset()
  useSwaggerCollectionsStore.getState().reset()
}

export const getStoreStates = () => ({
  auth: useAuthStore.getState(),
  navigation: useNavigationStore.getState(),
  applications: useApplicationsStore.getState(),
  incidents: useIncidentsStore.getState(),
  swaggerCollections: useSwaggerCollectionsStore.getState()
})

// Development helpers
export const logStoreStates = () => {
  // Logging disabled for security purposes
}

// Export individual stores
export {
  useAuthStore,
  useNavigationStore,
  useApplicationsStore,
  useIncidentsStore,
  useSwaggerCollectionsStore
}

// Export default object with all stores
export default {
  useAuthStore,
  useNavigationStore,
  useApplicationsStore,
  useIncidentsStore,
  useSwaggerCollectionsStore,
  resetAllStores,
  getStoreStates,
  logStoreStates
}
