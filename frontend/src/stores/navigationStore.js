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

      // Swagger detail state
      selectedSwaggerId: null,
      showSwaggerDetail: false,

      // Change Request form/detail state
      selectedChangeRequestId: null,
      showChangeRequestForm: false,


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
        console.log('[Navigation] navigateToRoute called with:', { route, projectId, appId })

        switch (route) {
          case 'dashboard':
            set({
              currentRoute: 'dashboard',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = ''
            break

          case 'projects':
            set({
              currentRoute: 'projects',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'projects'
            break

          case 'team-utilization':
            set({
              currentRoute: 'team-utilization',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'team-utilization'
            break

          case 'project-apps':
            set({
              currentRoute: 'project-apps',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'project-apps'
            break

          case 'change-requests':
            set({
              currentRoute: 'change-requests',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false,
              selectedChangeRequestId: null,
              showChangeRequestForm: false
            })
            window.location.hash = 'change-requests'
            break

          case 'change-requests-new':
            set({
              currentRoute: 'change-requests-new',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false,
              selectedChangeRequestId: null,
              showChangeRequestForm: true
            })
            window.location.hash = 'change-requests/new'
            break

          case 'change-requests-edit':
            if (appId) { // reuse appId param to carry change request id
              set({
                currentRoute: 'change-requests-edit',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false,
                selectedChangeRequestId: appId,
                showChangeRequestForm: true
              })
              window.location.hash = 'change-requests/edit/' + appId
            }
            break

          case 'incidents':
            set({
              currentRoute: 'incidents',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'incidents'
            break

          case 'monitoring-dashboards':
            set({
              currentRoute: 'monitoring-dashboards',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'monitoring-dashboards'
            break

          case 'password-vault':
            set({
              currentRoute: 'password-vault',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'password-vault'
            break

          case 'swagger-collections':
            set({
              currentRoute: 'swagger-collections',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'swagger-collections'
            break

          case 'devops-config':
            set({
              currentRoute: 'devops-config',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'devops-config'
            break

          case 'ask-ai':
            set({
              currentRoute: 'ask-ai',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'ask-ai'
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

          case 'project-edit':
            if (projectId) {
              set({
                currentRoute: 'project-edit',
                selectedProjectId: projectId,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false
              })
              window.location.hash = `project/${projectId}/edit`
            }
            break

          case 'project-create':
            console.log('[Navigation] Setting route to project-create')
            set({
              currentRoute: 'project-create',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            console.log('[Navigation] Hash set to project/create')
            window.location.hash = 'project/create'
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
                showIncidentDetail: true,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `incident/${appId}`
            }
            break

          case 'swagger-detail':
            if (appId) { // appId parameter is used for swaggerId in this case
              set({
                currentRoute: 'swagger-collections',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: appId,
                showSwaggerDetail: true
              })
              window.location.hash = `swagger/${appId}`
            }
            break

          default:
            // Unknown route
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
        console.log('[Navigation] handleHashChange:', hash)

        // Check most specific routes first
        if (hash === 'project/create') {
          // Handle project creation route
          set({
            currentRoute: 'project-create',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash === 'projects') {
          get().navigateToRoute('projects')
        } else if (hash === 'team-utilization') {
          get().navigateToRoute('team-utilization')
        } else if (hash === 'project-apps') {
          get().navigateToRoute('project-apps')
        } else if (hash === 'change-requests') {
          get().navigateToRoute('change-requests')
        } else if (hash === 'change-requests/new') {
          set({
            currentRoute: 'change-requests-new',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false,
            selectedChangeRequestId: null,
            showChangeRequestForm: true
          })
        } else if (hash.startsWith('change-requests/edit/')) {
          const changeId = hash.split('/')[2]
          set({
            currentRoute: 'change-requests-edit',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false,
            selectedChangeRequestId: changeId,
            showChangeRequestForm: true
          })
        } else if (hash === 'incidents') {
          get().navigateToRoute('incidents')
        } else if (hash === 'monitoring-dashboards') {
          get().navigateToRoute('monitoring-dashboards')
        } else if (hash === 'password-vault') {
          get().navigateToRoute('password-vault')
        } else if (hash === 'swagger-collections') {
          get().navigateToRoute('swagger-collections')
        } else if (hash === 'devops-config') {
          get().navigateToRoute('devops-config')
        } else if (hash === 'system-test') {
          get().navigateToRoute('system-test')
        } else if (hash === 'ask-ai') {
          get().navigateToRoute('ask-ai')

        // General patterns after specific ones
        } else if (hash.startsWith('project/')) {
          const parts = hash.split('/')
          const projectId = parts[1]
          const action = parts[2] // 'edit' or undefined

          if (action === 'edit') {
            // Handle project edit route
            set({
              currentRoute: 'project-edit',
              selectedProjectId: projectId,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
          } else {
            // Handle project detail route
            set({
              currentRoute: 'projects',
              selectedProjectId: projectId,
              showProjectDetail: true,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
          }
        } else if (hash.startsWith('app/')) {
          const appId = hash.split('/')[1]
          set({
            currentRoute: 'project-apps',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: appId,
            showAppDetail: true,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
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
            showIncidentDetail: true,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash.startsWith('swagger/')) {
          const swaggerId = hash.split('/')[1]
          set({
            currentRoute: 'swagger-collections',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: swaggerId,
            showSwaggerDetail: true
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
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
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
              title: 'Projects',
              onClick: () => get().navigateToRoute('projects')
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
              title: 'Ops',
              onClick: () => get().navigateToRoute('project-apps')
            },
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
              title: 'Ops',
              onClick: () => get().navigateToRoute('incidents')
            },
            {
              title: 'Incidents',
              onClick: () => get().navigateToRoute('incidents')
            },
            {
              title: getIncidentTitle(state.selectedIncidentId)
            }
          )
        } else if (state.showSwaggerDetail && state.selectedSwaggerId) {
          const getSwaggerTitle = (swaggerId) => {
            const swaggerTitles = {
              'swagger-001': 'ePrescription API v1.0',
              'swagger-002': 'Patient Portal API v2.1'
            }
            return swaggerTitles[swaggerId] || swaggerId
          }

          items.push(
            {
              title: 'Ops',
              onClick: () => get().navigateToRoute('swagger-collections')
            },
            {
              title: 'Swagger Collections',
              onClick: () => get().navigateToRoute('swagger-collections')
            },
            {
              title: getSwaggerTitle(state.selectedSwaggerId)
            }
          )
        } else if (state.showChangeRequestForm) {
          items.push(
            { title: 'Ops', onClick: () => get().navigateToRoute('change-requests') },
            { title: 'Change Requests', onClick: () => get().navigateToRoute('change-requests') },
            { title: state.currentRoute === 'change-requests-new' ? 'New' : (state.selectedChangeRequestId || 'Edit') }
          )
        } else {
          switch (state.currentRoute) {
            case 'projects':
              items.push({ title: 'Projects' })
              break
            case 'team-utilization':
              items.push(
                { title: 'Projects', onClick: () => get().navigateToRoute('projects') },
                { title: 'Team Utilization' }
              )
              break
            case 'project-apps':
              items.push(
                { title: 'Ops' },
                { title: 'Project Apps' }
              )
              break
            case 'change-requests':
              items.push(
                { title: 'Ops' },
                { title: 'Change Requests' }
              )
              break
            case 'incidents':
              items.push(
                { title: 'Ops' },
                { title: 'Incidents' }
              )
              break
            case 'monitoring-dashboards':
              items.push(
                { title: 'Ops' },
                { title: 'Monitoring Dashboards' }
              )
              break
            case 'password-vault':
              items.push(
                { title: 'Ops' },
                { title: 'Password Vault' }
              )
              break
            case 'swagger-collections':
              items.push(
                { title: 'Ops' },
                { title: 'Swagger Collections' }
              )
              break
            case 'devops-config':
              items.push(
                { title: 'Settings' },
                { title: 'DevOps Configuration' }
              )
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
        selectedSwaggerId: null,
        showSwaggerDetail: false,
        selectedChangeRequestId: null,
        showChangeRequestForm: false,
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
