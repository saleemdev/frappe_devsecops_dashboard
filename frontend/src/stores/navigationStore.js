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

      // Software Product form/detail state
      selectedSoftwareProductId: null,
      showSoftwareProductForm: false,
      showSoftwareProductDetail: false,

      // Password Vault form/detail state
      selectedPasswordVaultEntryId: null,
      showPasswordVaultForm: false,

      // RACI Template state
      selectedRACITemplateId: null,

      // API Route state
      selectedAPIRouteId: null,
      showAPIRouteForm: false,

      // Risk Register state
      selectedRiskRegisterId: null,

      // Change Management Team state
      selectedChangeManagementTeamId: null,

      // Wiki state
      selectedWikiSpaceSlug: null,
      selectedWikiPageSlug: null,

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
      navigateToRoute: (route, projectId = null, appId = null, softwareProductId = null, passwordVaultEntryId = null) => {
        const state = get()
        console.log('[Navigation] navigateToRoute called with:', { route, projectId, appId, softwareProductId, passwordVaultEntryId })

        // Set software product ID if provided
        if (softwareProductId) {
          set({ selectedSoftwareProductId: softwareProductId })
        }

        // Set password vault entry ID if provided
        if (passwordVaultEntryId) {
          set({ selectedPasswordVaultEntryId: passwordVaultEntryId })
        }

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

          case 'zenhub-dashboard':
            set({
              currentRoute: 'zenhub-dashboard',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'zenhub-dashboard'
            break

          case 'product-kpi-dashboard':
            set({
              currentRoute: 'product-kpi-dashboard',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'product-kpi-dashboard'
            break

          case 'software-product':
            set({
              currentRoute: 'software-product',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false,
              showSoftwareProductForm: false,
              showSoftwareProductDetail: false,
              selectedSoftwareProductId: null
            })
            window.location.hash = 'software-product'
            break

          case 'software-product-new':
            set({
              currentRoute: 'software-product-new',
              selectedSoftwareProductId: null,
              showSoftwareProductForm: true,
              showSoftwareProductDetail: false,
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'software-product/new'
            break

          case 'software-product-edit':
            if (softwareProductId) {
              set({
                currentRoute: 'software-product-edit',
                selectedSoftwareProductId: softwareProductId,
                showSoftwareProductForm: true,
                showSoftwareProductDetail: false,
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `software-product/edit/${softwareProductId}`
            }
            break

          case 'software-product-detail':
            if (softwareProductId) {
              set({
                currentRoute: 'software-product',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false,
                selectedSoftwareProductId: softwareProductId,
                showSoftwareProductDetail: true,
                showSoftwareProductForm: false
              })
              window.location.hash = `software-product/${softwareProductId}`
            }
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
              showSwaggerDetail: false,
              selectedPasswordVaultEntryId: null,
              showPasswordVaultForm: false
            })
            window.location.hash = 'password-vault'
            break

          case 'password-vault-new':
            set({
              currentRoute: 'password-vault-new',
              selectedPasswordVaultEntryId: null,
              showPasswordVaultForm: true,
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'password-vault/new'
            break

          case 'password-vault-edit':
            set({
              currentRoute: 'password-vault-edit',
              showPasswordVaultForm: true,
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            if (passwordVaultEntryId) {
              window.location.hash = `password-vault/edit/${passwordVaultEntryId}`
            }
            break

          case 'raci-template':
            set({
              currentRoute: 'raci-template',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'raci-template'
            break

          case 'raci-template-create':
            set({
              currentRoute: 'raci-template-create',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'raci-template/create'
            break

          case 'raci-template-edit':
            if (appId) { // reuse appId parameter to carry template id
              set({
                currentRoute: 'raci-template-edit',
                selectedRACITemplateId: appId,
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `raci-template/edit/${appId}`
            }
            break

          case 'api-provisioning':
            set({
              currentRoute: 'api-provisioning',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false,
              selectedAPIRouteId: null,
              showAPIRouteForm: false
            })
            window.location.hash = 'api-provisioning'
            break

          case 'api-provisioning-create':
            set({
              currentRoute: 'api-provisioning-create',
              selectedAPIRouteId: null,
              showAPIRouteForm: true,
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            window.location.hash = 'api-provisioning/create'
            break

          case 'api-provisioning-edit':
            if (appId) { // reuse appId parameter to carry API route id
              set({
                currentRoute: 'api-provisioning-edit',
                selectedAPIRouteId: appId,
                showAPIRouteForm: true,
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `api-provisioning/edit/${appId}`
            }
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

          case 'wiki':
            set({
              currentRoute: 'wiki',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false,
              selectedWikiSpaceSlug: null,
              selectedWikiPageSlug: null
            })
            window.location.hash = 'wiki'
            break

          case 'wiki-create':
            set({
              currentRoute: 'wiki-create',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false,
              selectedWikiSpaceSlug: null,
              selectedWikiPageSlug: null
            })
            window.location.hash = 'wiki/create'
            break

          case 'wiki-space':
            if (projectId) { // reuse projectId to carry space slug
              set({
                currentRoute: 'wiki-space',
                selectedWikiSpaceSlug: projectId,
                selectedWikiPageSlug: null,
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `wiki/space/${projectId}`
            }
            break

          case 'wiki-page-create':
            if (projectId) { // reuse projectId for space slug
              set({
                currentRoute: 'wiki-page-create',
                selectedWikiSpaceSlug: projectId,
                selectedWikiPageSlug: null,
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `wiki/space/${projectId}/page/new`
            }
            break

          case 'wiki-page':
            if (projectId && appId) { // reuse projectId for space slug, appId for page slug
              set({
                currentRoute: 'wiki-page',
                selectedWikiSpaceSlug: projectId,
                selectedWikiPageSlug: appId,
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `wiki/space/${projectId}/page/${appId}`
            }
            break

          case 'wiki-page-edit':
            if (projectId) { // projectId is the page document name
              set({
                currentRoute: 'wiki-page-edit',
                selectedWikiPageSlug: projectId,
                selectedWikiSpaceSlug: null,
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: null,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `wiki/page/edit/${projectId}`
            }
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

          case 'risk-registers':
            set({
              currentRoute: 'risk-registers',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedRiskRegisterId: null
            })
            window.location.hash = 'risk-registers'
            break

          case 'risk-register-create':
            set({
              currentRoute: 'risk-register-create',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedRiskRegisterId: null
            })
            window.location.hash = 'risk-register/create'
            break

          case 'risk-register-edit':
            if (appId) { // appId parameter is used for registerId in this case
              console.log('[Navigation] Setting risk-register-edit with appId:', appId)
              set({
                currentRoute: 'risk-register-edit',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedRiskRegisterId: appId
              })
              window.location.hash = `risk-register/${appId}/edit`
            } else {
              console.error('[Navigation] risk-register-edit called without appId parameter')
            }
            break

          case 'risk-register-detail':
            if (appId) { // appId parameter is used for registerId in this case
              console.log('[Navigation] Setting risk-register-detail with appId:', appId)
              set({
                currentRoute: 'risk-register-detail',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedRiskRegisterId: appId
              })
              window.location.hash = `risk-register/${appId}`
            } else {
              console.error('[Navigation] risk-register-detail called without appId parameter')
            }
            break

          case 'change-management-teams':
            set({
              currentRoute: 'change-management-teams',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedChangeManagementTeamId: null
            })
            window.location.hash = 'change-management-teams'
            break

          case 'change-management-team-create':
            set({
              currentRoute: 'change-management-team-create',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedChangeManagementTeamId: null
            })
            window.location.hash = 'change-management-team/create'
            break

          case 'change-management-team-edit':
            if (appId) { // appId parameter is used for teamId in this case
              console.log('[Navigation] Setting change-management-team-edit with appId:', appId)
              set({
                currentRoute: 'change-management-team-edit',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedChangeManagementTeamId: appId
              })
              window.location.hash = `change-management-team/${appId}/edit`
            } else {
              console.error('[Navigation] change-management-team-edit called without appId parameter')
            }
            break

          case 'change-management-team-detail':
            if (appId) { // appId parameter is used for teamId in this case
              console.log('[Navigation] Setting change-management-team-detail with appId:', appId)
              set({
                currentRoute: 'change-management-team-detail',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedChangeManagementTeamId: appId
              })
              window.location.hash = `change-management-team/${appId}`
            } else {
              console.error('[Navigation] change-management-team-detail called without appId parameter')
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
                showIncidentDetail: true,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `incident/${appId}`
            }
            break

          case 'incident-create':
            console.log('[Navigation] Setting route to incident-create')
            set({
              currentRoute: 'incident-create',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
            console.log('[Navigation] Hash set to incident/create')
            window.location.hash = 'incident/create'
            break

          case 'incident-edit':
            if (appId) { // appId parameter is used for incidentId in this case
              console.log('[Navigation] Setting route to incident-edit for:', appId)
              set({
                currentRoute: 'incident-edit',
                selectedProjectId: null,
                showProjectDetail: false,
                selectedAppId: null,
                showAppDetail: false,
                selectedIncidentId: appId,
                showIncidentDetail: false,
                selectedSwaggerId: null,
                showSwaggerDetail: false
              })
              window.location.hash = `incident/${appId}/edit`
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
       * Navigation Helper Methods (no prop drilling needed)
       */

      /**
       * Navigate to incidents list
       */
      goToIncidents: () => {
        get().navigateToRoute('incidents')
      },

      /**
       * Navigate to incident detail view
       */
      viewIncident: (incidentId) => {
        if (!incidentId) {
          console.warn('[Navigation] viewIncident called without incidentId')
          return
        }
        get().navigateToRoute('incident-detail', null, incidentId)
      },

      /**
       * Navigate to create incident form
       */
      createIncident: () => {
        get().navigateToRoute('incident-create')
      },

      /**
       * Navigate to edit incident form
       */
      editIncident: (incidentId) => {
        if (!incidentId) {
          console.warn('[Navigation] editIncident called without incidentId')
          return
        }
        get().navigateToRoute('incident-edit', null, incidentId)
      },

      /**
       * Navigate to projects list
       */
      goToProjects: () => {
        get().navigateToRoute('projects')
      },

      /**
       * Navigate to project detail
       */
      viewProject: (projectId) => {
        if (!projectId) {
          console.warn('[Navigation] viewProject called without projectId')
          return
        }
        get().navigateToRoute('project-detail', projectId)
      },

      /**
       * Navigate to create project form
       */
      createProject: () => {
        get().navigateToRoute('project-create')
      },

      /**
       * Navigate to edit project form
       */
      editProject: (projectId) => {
        if (!projectId) {
          console.warn('[Navigation] editProject called without projectId')
          return
        }
        get().navigateToRoute('project-edit', projectId)
      },

      /**
       * Navigate to dashboard
       */
      goToDashboard: () => {
        get().navigateToRoute('dashboard')
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
        } else if (hash === 'product-kpi-dashboard') {
          get().navigateToRoute('product-kpi-dashboard')
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
        } else if (hash.startsWith('change-requests/detail/')) {
          const changeId = hash.split('/')[2]
          set({
            currentRoute: 'change-requests-detail',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false,
            selectedChangeRequestId: changeId,
            showChangeRequestForm: false
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
        } else if (hash === 'password-vault/new') {
          set({
            currentRoute: 'password-vault-new',
            selectedPasswordVaultEntryId: null,
            showPasswordVaultForm: true,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash.startsWith('password-vault/edit/')) {
          const entryId = hash.split('/')[2]
          set({
            currentRoute: 'password-vault-edit',
            selectedPasswordVaultEntryId: entryId,
            showPasswordVaultForm: true,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash === 'software-product') {
          get().navigateToRoute('software-product')
        } else if (hash === 'software-product/new') {
          set({
            currentRoute: 'software-product-new',
            selectedSoftwareProductId: null,
            showSoftwareProductForm: true,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash.startsWith('software-product/')) {
          const parts = hash.split('/')
          const action = parts[1] // 'new', 'edit', or productId
          const productId = parts[2] // only present if action is 'edit'

          if (action === 'new') {
            // Already handled above - do nothing (or could handle here)
            return
          } else if (action === 'edit' && productId) {
            // Handle software product edit route
            set({
              currentRoute: 'software-product-edit',
              selectedSoftwareProductId: productId,
              showSoftwareProductForm: true,
              showSoftwareProductDetail: false,
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
          } else {
            // Handle software product detail route (action is productId)
            set({
              currentRoute: 'software-product',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false,
              selectedSoftwareProductId: action,
              showSoftwareProductDetail: true,
              showSoftwareProductForm: false
            })
          }
        } else if (hash === 'swagger-collections') {
          get().navigateToRoute('swagger-collections')
        } else if (hash === 'devops-config') {
          get().navigateToRoute('devops-config')
        } else if (hash === 'system-test') {
          get().navigateToRoute('system-test')
        } else if (hash === 'ask-ai') {
          get().navigateToRoute('ask-ai')
        } else if (hash === 'risk-registers') {
          get().navigateToRoute('risk-registers')
        } else if (hash === 'risk-register/create') {
          set({
            currentRoute: 'risk-register-create',
            selectedRiskRegisterId: null,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })

          // General patterns after specific ones
        } else if (hash.startsWith('risk-register/')) {
          const parts = hash.split('/')
          const registerId = parts[1]
          const action = parts[2] // 'edit' or undefined

          if (registerId === 'create') {
            // Already handled above
          } else if (action === 'edit') {
            // Handle risk register edit route
            set({
              currentRoute: 'risk-register-edit',
              selectedRiskRegisterId: registerId,
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
          } else {
            // Handle risk register detail route
            set({
              currentRoute: 'risk-register-detail',
              selectedRiskRegisterId: registerId,
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
        } else if (hash === 'change-management-teams') {
          get().navigateToRoute('change-management-teams')
        } else if (hash === 'change-management-team/create') {
          set({
            currentRoute: 'change-management-team-create',
            selectedChangeManagementTeamId: null,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash.startsWith('change-management-team/')) {
          const parts = hash.split('/')
          const teamId = parts[1]
          const action = parts[2] // 'edit' or undefined

          if (teamId === 'create') {
            // Already handled above
          } else if (action === 'edit') {
            // Handle change management team edit route
            set({
              currentRoute: 'change-management-team-edit',
              selectedChangeManagementTeamId: teamId,
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
          } else {
            // Handle change management team detail route
            set({
              currentRoute: 'change-management-team-detail',
              selectedChangeManagementTeamId: teamId,
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
          const parts = hash.split('/')
          const incidentId = parts[1]
          const action = parts[2] // 'edit' or undefined

          if (incidentId === 'create') {
            // Handle incident create route
            set({
              currentRoute: 'incident-create',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: null,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
          } else if (action === 'edit') {
            // Handle incident edit route
            set({
              currentRoute: 'incident-edit',
              selectedProjectId: null,
              showProjectDetail: false,
              selectedAppId: null,
              showAppDetail: false,
              selectedIncidentId: incidentId,
              showIncidentDetail: false,
              selectedSwaggerId: null,
              showSwaggerDetail: false
            })
          } else {
            // Handle incident detail route
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
          }
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
        } else if (hash === 'wiki') {
          get().navigateToRoute('wiki')
        } else if (hash === 'wiki/create') {
          get().navigateToRoute('wiki-create')
        } else if (hash.startsWith('wiki/page/edit/')) {
          // Edit page route: wiki/page/edit/{pageDocName}
          const pageId = hash.replace('wiki/page/edit/', '')
          get().navigateToRoute('wiki-page-edit', pageId)
        } else if (hash.startsWith('wiki/space/')) {
          const parts = hash.split('/')
          const spaceSlug = parts[2]
          const pageAction = parts[3] // 'page' or undefined
          const pageSlug = parts[4] // page slug if pageAction is 'page'

          if (pageAction === 'page' && pageSlug === 'new') {
            // Create page route
            get().navigateToRoute('wiki-page-create', spaceSlug)
          } else if (pageAction === 'page' && pageSlug) {
            // View page route
            get().navigateToRoute('wiki-page', spaceSlug, pageSlug)
          } else {
            // Space route
            get().navigateToRoute('wiki-space', spaceSlug)
          }
        } else if (hash === 'raci-template') {
          get().navigateToRoute('raci-template')
        } else if (hash === 'raci-template/create') {
          set({
            currentRoute: 'raci-template-create',
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash.startsWith('raci-template/edit/')) {
          const templateId = decodeURIComponent(hash.split('/')[2])
          set({
            currentRoute: 'raci-template-edit',
            selectedRACITemplateId: templateId,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash === 'api-provisioning') {
          get().navigateToRoute('api-provisioning')
        } else if (hash === 'api-provisioning/create') {
          set({
            currentRoute: 'api-provisioning-create',
            selectedAPIRouteId: null,
            showAPIRouteForm: true,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
          })
        } else if (hash.startsWith('api-provisioning/edit/')) {
          const routeId = hash.split('/')[2]
          set({
            currentRoute: 'api-provisioning-edit',
            selectedAPIRouteId: routeId,
            showAPIRouteForm: true,
            selectedProjectId: null,
            showProjectDetail: false,
            selectedAppId: null,
            showAppDetail: false,
            selectedIncidentId: null,
            showIncidentDetail: false,
            selectedSwaggerId: null,
            showSwaggerDetail: false
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
        } else if (state.showSoftwareProductDetail && state.selectedSoftwareProductId) {
          items.push(
            {
              title: 'Products',
              onClick: () => get().navigateToRoute('software-product')
            },
            {
              title: 'Software Product',
              onClick: () => get().navigateToRoute('software-product')
            },
            {
              title: state.selectedSoftwareProductId
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
            case 'software-product':
              items.push(
                { title: 'Products', onClick: () => get().navigateToRoute('software-product') },
                { title: 'Software Product' }
              )
              break
            case 'product-kpi-dashboard':
              items.push(
                { title: 'Products', onClick: () => get().navigateToRoute('software-product') },
                { title: 'Product KPI Dashboard' }
              )
              break
            case 'software-product-new':
              items.push(
                { title: 'Products', onClick: () => get().navigateToRoute('software-product') },
                { title: 'Software Product' },
                { title: 'New' }
              )
              break
            case 'software-product-edit':
              items.push(
                { title: 'Products', onClick: () => get().navigateToRoute('software-product') },
                { title: 'Software Product' },
                { title: 'Edit' }
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
            case 'api-provisioning':
              items.push(
                { title: 'Ops' },
                { title: 'API Provisioning' }
              )
              break
            case 'api-provisioning-create':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('api-provisioning') },
                { title: 'API Provisioning', onClick: () => get().navigateToRoute('api-provisioning') },
                { title: 'Create' }
              )
              break
            case 'api-provisioning-edit':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('api-provisioning') },
                { title: 'API Provisioning', onClick: () => get().navigateToRoute('api-provisioning') },
                { title: 'Edit' }
              )
              break
            case 'wiki':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Wiki' }
              )
              break
            case 'wiki-create':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Wiki', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Create Space' }
              )
              break
            case 'wiki-space':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Wiki', onClick: () => get().navigateToRoute('wiki') },
                { title: state.selectedWikiSpaceSlug || 'Space' }
              )
              break
            case 'wiki-page-create':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Wiki', onClick: () => get().navigateToRoute('wiki') },
                { title: state.selectedWikiSpaceSlug || 'Space', onClick: () => get().navigateToRoute('wiki-space', state.selectedWikiSpaceSlug) },
                { title: 'Create Page' }
              )
              break
            case 'wiki-page':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Wiki', onClick: () => get().navigateToRoute('wiki') },
                { title: state.selectedWikiSpaceSlug || 'Space', onClick: () => get().navigateToRoute('wiki-space', state.selectedWikiSpaceSlug) },
                { title: state.selectedWikiPageSlug || 'Page' }
              )
              break
            case 'wiki-page-edit':
              items.push(
                { title: 'Ops', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Wiki', onClick: () => get().navigateToRoute('wiki') },
                { title: 'Edit Page' }
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
        selectedWikiSpaceSlug: null,
        selectedWikiPageSlug: null,
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
            selectedPasswordVaultEntryId: true,
            isMobile: true,
            mobileMenuVisible: true
          }
        }
      }
    }
  )
)

export default useNavigationStore
