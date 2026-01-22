/**
 * useZenhubData Hook
 *
 * Manages all Zenhub data fetching and state for the dashboard.
 * Handles:
 * - Software products loading
 * - Workspace/project/epic navigation
 * - Error and loading states
 * - Team utilization data
 */

import { useState, useCallback, useEffect } from 'react'
import zenhubService from '../services/api/zenhub'

export function useZenhubData() {
  // Product/Project/Epic state
  const [softwareProducts, setSoftwareProducts] = useState([])
  const [selectedProduct, setSelectedProduct] = useState(null)
  const [projects, setProjects] = useState([])
  const [selectedProject, setSelectedProject] = useState(null)
  const [epics, setEpics] = useState([])
  const [selectedEpic, setSelectedEpic] = useState(null)

  // Data state
  const [currentIssues, setCurrentIssues] = useState([])
  const [teamUtilization, setTeamUtilization] = useState([])

  // UI state
  const [loading, setLoading] = useState(false)
  const [loadingText, setLoadingText] = useState('')
  const [error, setError] = useState(null)

  /**
   * Load all software products from Frappe backend
   * Automatically selects first product if available
   * @async
   */
  const loadSoftwareProducts = useCallback(async () => {
    setLoading(true)
    setLoadingText('Connecting to Workspaces...')
    setError(null)

    try {
      const response = await zenhubService.getSoftwareProducts()

      if (response.success && response.products) {
        setSoftwareProducts(response.products)

        // Auto-load first product
        if (response.products.length > 0) {
          await loadProductView(response.products[0].name, response.products[0])
        }
      } else {
        setError(response.error || 'Failed to load software products')
        setSoftwareProducts([])
      }
    } catch (err) {
      console.error('[useZenhubData] Error loading products:', err)
      setError(`Error: ${err.message || 'Could not load products'}`)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load product view: fetches projects, epics, and team data
   * @async
   * @param {string} productName - Name of the product
   * @param {object} product - Product object with zenhub_workspace_id
   */
  const loadProductView = useCallback(
    async (productName, product) => {
      setLoading(true)
      setLoadingText('Fetching Workspace Aggregate...')
      setError(null)

      try {
        if (!product || !product.zenhub_workspace_id) {
          setError('Product workspace ID not available')
          return
        }

        setSelectedProduct(product)
        setSelectedProject(null)
        setSelectedEpic(null)

        // Parallel fetch for better performance
        const [projectsResp, teamResp, epicsResp] = await Promise.all([
          zenhubService.getZenhubProjects(product.zenhub_workspace_id),
          zenhubService.getTeamUtilization(product.zenhub_workspace_id),
          zenhubService.getEpics(product.zenhub_workspace_id)
        ])

        if (projectsResp.success) {
          setProjects(projectsResp.projects || [])
          setCurrentIssues(projectsResp.projects || [])
        } else {
          setError('Failed to load projects')
        }

        if (teamResp.success) {
          setTeamUtilization(teamResp.team_members || [])
        }

        if (epicsResp.success) {
          setEpics(epicsResp.epics || [])
        }
      } catch (err) {
        console.error('[useZenhubData] Error loading product view:', err)
        setError(`Failed to load product: ${err.message}`)
      } finally {
        setLoading(false)
      }
    },
    []
  )

  /**
   * Load project view: fetches child epics/tasks
   * @async
   * @param {string} projectId - ID of the project
   */
  const loadProjectView = useCallback(async (projectId) => {
    setLoading(true)
    setLoadingText('Drilling into Project Detail...')
    setError(null)

    try {
      const response = await zenhubService.getIssuesByEpic(projectId)

      if (response.success) {
        setCurrentIssues(response.issues || [])
        setSelectedProject(projectId)
        setSelectedEpic(null)
      } else {
        setError('Failed to load project epics')
      }
    } catch (err) {
      console.error('[useZenhubData] Error loading project:', err)
      setError(`Failed to load project: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Load epic view: fetches child tasks
   * @async
   * @param {string} epicId - ID of the epic
   */
  const loadEpicView = useCallback(async (epicId) => {
    setLoading(true)
    setLoadingText('Gathering Epic Tasks...')
    setError(null)

    try {
      const response = await zenhubService.getIssuesByEpic(epicId)

      if (response.success) {
        setCurrentIssues(response.issues || [])
        setSelectedEpic(epicId)
      } else {
        setError('Failed to load epic tasks')
      }
    } catch (err) {
      console.error('[useZenhubData] Error loading epic:', err)
      setError(`Failed to load epic: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }, [])

  /**
   * Refresh current view with fresh data
   * @async
   */
  const refreshData = useCallback(async () => {
    if (selectedEpic) {
      await loadEpicView(selectedEpic)
    } else if (selectedProject) {
      await loadProjectView(selectedProject)
    } else if (selectedProduct) {
      await loadProductView(selectedProduct.name, selectedProduct)
    }
  }, [selectedEpic, selectedProject, selectedProduct, loadEpicView, loadProjectView, loadProductView])

  /**
   * Clear all data and reset to initial state
   */
  const resetData = useCallback(() => {
    setSoftwareProducts([])
    setSelectedProduct(null)
    setProjects([])
    setSelectedProject(null)
    setEpics([])
    setSelectedEpic(null)
    setCurrentIssues([])
    setTeamUtilization([])
    setError(null)
  }, [])

  // Load products on mount
  useEffect(() => {
    loadSoftwareProducts()
  }, [loadSoftwareProducts])

  return {
    // State
    softwareProducts,
    selectedProduct,
    projects,
    selectedProject,
    epics,
    selectedEpic,
    currentIssues,
    teamUtilization,
    loading,
    loadingText,
    error,

    // Actions
    loadSoftwareProducts,
    loadProductView,
    loadProjectView,
    loadEpicView,
    refreshData,
    resetData,

    // Setters
    setSelectedProduct,
    setSelectedProject,
    setSelectedEpic,
    setError
  }
}
