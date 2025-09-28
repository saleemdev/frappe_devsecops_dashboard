/**
 * Navigation Zustand Store
 * Manages navigation state and routing
 */

import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

const useNavigationStore = create(
  devtools(
    (set, get) => ({
      // State
      currentRoute: 'dashboard',
      
      // Project detail state
      selectedProjectId: null,
      showProjectDetail: false,
      
      // Application detail state
      selectedAppId: null,
      showAppDetail: false,
      
      // Incident detail state
      selectedIncidentId: null,
      showIncidentDetail: false,
      
      // Mobile state
      isMobile: false,
      mobileMenuVisible: false,
      
      // Breadcrumb state
      breadcrumbs: [],

      // Actions
      setCurrentRoute: (route) => set({ currentRoute: route }),
      
      setIsMobile: (isMobile) => set({ isMobile }),
      
      setMobileMenuVisible: (visible) => set({ mobileMenuVisible: visible }),
      
      toggleMobileMenu: () => set((state) => ({ 
        mobileMenuVisible: !state.mobileMenuVisible 
      })),

      /**
       * Navigate to a specific route
       */
      navigateToRoute: (route, projectId = null, appId = null) => {
        const state = get()
        
        switch (route) {
          case 'dashboard':
            set({
              currentRoute: 'dashboard',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false
            })
            window.location.hash = ''
            break

          case 'change-requests':
            set({
              currentRoute: 'change-requests',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false
            })
            window.location.hash = 'change-requests'
            break

          case 'project-apps':
            set({
              currentRoute: 'project-apps',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false
            })
            window.location.hash = 'project-apps'
            break

          case 'devops-config':
            set({
              currentRoute: 'devops-config',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false
            })
            window.location.hash = 'devops-config'
            break

          case 'monitoring-dashboards':
            set({
              currentRoute: 'monitoring-dashboards',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false
            })
            window.location.hash = 'monitoring-dashboards'
            break

          case 'incidents':
            set({
              currentRoute: 'incidents',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false
            })
            window.location.hash = 'incidents'
            break

          case 'project-detail':
            if (projectId) {
              set({
                currentRoute: 'dashboard',
                selectedProjectId: projectId,
                showProjectDetail: true,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false
              })
              window.location.hash = `project/${projectId}`
            }
            break

          case 'app-detail':
            if (appId) {
              set({
                currentRoute: 'project-apps',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: appId,
                showAppDetail: true,
                selectedIncidentId: null,
                showIncidentDetail: false
              })
              window.location.hash = `app/${appId}`
            }
            break

          case 'incident-detail':
            if (appId) { // appId parameter is used for incidentId in this case
              set({
                currentRoute: 'incidents',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: appId,
                showIncidentDetail: true
              })
              window.location.hash = `incident/${appId}`
            }
            break

          default:
            console.warn(`Unknown route: ${route}`)
        }
        
        // Close mobile menu after navigation
        if (state.mobileMenuVisible) {
          set({ mobileMenuVisible: false })
        }
      },

      /**
       * Handle browser hash changes
       */
      handleHashChange: () => {
        const hash = window.location.hash.slice(1) // Remove the '#'
        
        if (hash === 'change-requests') {
          get().navigateToRoute('change-requests')
        } else if (hash === 'project-apps') {
          get().navigateToRoute('project-apps')
        } else if (hash === 'devops-config') {
          get().navigateToRoute('devops-config')
        } else if (hash === 'monitoring-dashboards') {
          get().navigateToRoute('monitoring-dashboards')
        } else if (hash === 'incidents') {
          get().navigateToRoute('incidents')
        } else if (hash.startsWith('project/')) {
          const projectId = hash.split('/')[1]
          set({
            currentRoute: 'dashboard',
            selectedProjectId: projectId,
            showProjectDetail: true,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false
          })
        } else if (hash.startsWith('app/')) {
          const appId = hash.split('/')[1]
          set({
            currentRoute: 'project-apps',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: appId,
            showAppDetail: true,
            selectedIncidentId: null,
            showIncidentDetail: false
          })
        } else if (hash.startsWith('incident/')) {
          const incidentId = hash.split('/')[1]
          set({
            currentRoute: 'incidents',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: incidentId,
            showIncidentDetail: true
          })
        } else {
          // Default to dashboard
          set({
            currentRoute: 'dashboard',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false
          })
        }
      },

      /**
       * Generate breadcrumb items based on current state
       */
      getBreadcrumbs: () => {
        const state = get()
        const items = [
          {
            title: 'Home',
            onClick: () => get().navigateToRoute('dashboard')
          }
        ]

        if (state.showProjectDetail && state.selectedProjectId) {
          items.push(
            {
              title: 'Dashboard',
              onClick: () => get().navigateToRoute('dashboard')
            },
            {
              title: 'Projects',
              onClick: () => get().navigateToRoute('dashboard')
            },
            {
              title: state.selectedProjectId
            }
          )
        } else if (state.showAppDetail && state.selectedAppId) {
          const getAppName = (appId) => {
            const appNames = {
              'app-001': 'ePrescription API',
              'app-002': 'Patient Portal',
              'app-003': 'Mobile Health App',
              'app-004': 'Analytics Dashboard'
            }
            return appNames[appId] || appId
          }

          items.push(
            {
              title: 'Project Apps',
              onClick: () => get().navigateToRoute('project-apps')
            },
            {
              title: getAppName(state.selectedAppId)
            }
          )
        } else if (state.showIncidentDetail && state.selectedIncidentId) {
          const getIncidentTitle = (incidentId) => {
            const incidentTitles = {
              'INC-001': 'Database Connection Timeout',
              'INC-002': 'Authentication Service Outage'
            }
            return incidentTitles[incidentId] || incidentId
          }

          items.push(
            {
              title: 'Incidents',
              onClick: () => get().navigateToRoute('incidents')
            },
            {
              title: getIncidentTitle(state.selectedIncidentId)
            }
          )
        } else {
          switch (state.currentRoute) {
            case 'change-requests':
              items.push({ title: 'Change Requests' })
              break
            case 'project-apps':
              items.push({ title: 'Project Apps' })
              break
            case 'devops-config':
              items.push({ title: 'DevOps Configuration' })
              break
            case 'monitoring-dashboards':
              items.push({ title: 'Monitoring Dashboards' })
              break
            case 'incidents':
              items.push({ title: 'Incidents' })
              break
            default:
              items.push({ title: 'Dashboard' })
          }
        }

        return items
      },

      /**
       * Reset navigation state
       */
      reset: () => set({
        currentRoute: 'dashboard',
        selectedProjectId: null,
        showProjectDetail: false,
        selectedAppId: null,
        showAppDetail: false,
        selectedIncidentId: null,
        showIncidentDetail: false,
        mobileMenuVisible: false,
        breadcrumbs: []
      })
    }),
    {
      name: 'navigation-store',
      serialize: {
        options: {
          map: {
            currentRoute: true,
            selectedProjectId: true,
            showProjectDetail: true,
            selectedAppId: true,
            showAppDetail: true,
            selectedIncidentId: true,
            showIncidentDetail: true,
            isMobile: true,
            mobileMenuVisible: true
          }
        }
      }
    }
  )
)

export default useNavigationStore
