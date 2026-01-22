/**
 * useZenhubNavigation Hook
 *
 * Manages navigation state and breadcrumb tracking for the hierarchy:
 * Product → Project → Epic
 *
 * Provides:
 * - Active navigation level
 * - Breadcrumb path construction
 * - Navigation callbacks
 */

import { useState, useCallback } from 'react'

export function useZenhubNavigation() {
  // Track current navigation level: 'product' | 'project' | 'epic'
  const [activeLevel, setActiveLevel] = useState('product')

  // Breadcrumb path: array of { label, level, id }
  const [breadcrumbPath, setBreadcrumbPath] = useState([
    { label: 'Dashboard', level: 'root', id: null }
  ])

  /**
   * Navigate to product level
   * @param {object} product - Product object with name and workspace_id
   */
  const navigateToProduct = useCallback((product) => {
    setActiveLevel('product')
    setBreadcrumbPath([
      { label: 'Dashboard', level: 'root', id: null },
      { label: product.name, level: 'product', id: product.name }
    ])
  }, [])

  /**
   * Navigate to project level
   * @param {object} project - Project object with title and id
   */
  const navigateToProject = useCallback((project) => {
    setActiveLevel('project')
    setBreadcrumbPath(prev => {
      const productPath = prev.slice(0, 2) // Keep root and product
      return [
        ...productPath,
        { label: project.title, level: 'project', id: project.id }
      ]
    })
  }, [])

  /**
   * Navigate to epic level
   * @param {object} epic - Epic object with title and id
   */
  const navigateToEpic = useCallback((epic) => {
    setActiveLevel('epic')
    setBreadcrumbPath(prev => {
      const basePath = prev.slice(0, 3) // Keep root, product, project
      return [
        ...basePath,
        { label: epic.title, level: 'epic', id: epic.id }
      ]
    })
  }, [])

  /**
   * Navigate back to previous level
   */
  const navigateBack = useCallback(() => {
    setBreadcrumbPath(prev => {
      const newPath = prev.slice(0, -1)
      const lastItem = newPath[newPath.length - 1]
      setActiveLevel(lastItem?.level || 'product')
      return newPath
    })
  }, [])

  /**
   * Navigate to specific breadcrumb item
   * @param {number} index - Index in breadcrumb path
   */
  const navigateToBreadcrumb = useCallback((index) => {
    setBreadcrumbPath(prev => {
      const newPath = prev.slice(0, index + 1)
      const lastItem = newPath[newPath.length - 1]
      setActiveLevel(lastItem?.level || 'product')
      return newPath
    })
  }, [])

  /**
   * Reset navigation to root
   */
  const reset = useCallback(() => {
    setActiveLevel('product')
    setBreadcrumbPath([
      { label: 'Dashboard', level: 'root', id: null }
    ])
  }, [])

  return {
    activeLevel,
    breadcrumbPath,
    navigateToProduct,
    navigateToProject,
    navigateToEpic,
    navigateBack,
    navigateToBreadcrumb,
    reset
  }
}
