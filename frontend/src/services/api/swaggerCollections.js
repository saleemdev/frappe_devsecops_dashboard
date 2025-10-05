/**
 * Swagger Collections API Service
 * Handles all swagger collection-related API calls
 */

import { API_CONFIG, createApiClient, withRetry, withCache, isMockEnabled } from './config.js'
import { mockSwaggerCollections, simulateDelay } from './mockData.js'

class SwaggerCollectionsService {
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
   * Get all swagger collections
   */
  async getSwaggerCollections(filters = {}) {
    if (isMockEnabled('swaggerCollections')) {
      await simulateDelay()
      
      let collections = [...mockSwaggerCollections]
      
      // Apply filters
      if (filters.status) {
        collections = collections.filter(collection => collection.status === filters.status)
      }
      if (filters.version) {
        collections = collections.filter(collection => collection.version === filters.version)
      }
      if (filters.project) {
        collections = collections.filter(collection => collection.project === filters.project)
      }
      if (filters.search) {
        const searchTerm = filters.search.toLowerCase()
        collections = collections.filter(collection => 
          collection.name.toLowerCase().includes(searchTerm) ||
          collection.description.toLowerCase().includes(searchTerm) ||
          collection.project.toLowerCase().includes(searchTerm)
        )
      }
      
      return {
        success: true,
        data: collections,
        total: collections.length
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      return withCache(`swagger-collections-${JSON.stringify(filters)}`, async () => {
        const response = await client.get(API_CONFIG.endpoints.swaggerCollections.list, {
          params: filters
        })
        
        return {
          success: true,
          data: response.data.data || [],
          total: response.data.total || 0
        }
      })
    })
  }

  /**
   * Get swagger collection by ID
   */
  async getSwaggerCollection(id) {
    if (isMockEnabled('swaggerCollections')) {
      await simulateDelay()
      
      const collection = mockSwaggerCollections.find(col => col.id === id)
      
      if (!collection) {
        throw {
          status: 404,
          message: 'Swagger collection not found',
          data: null
        }
      }
      
      return {
        success: true,
        data: collection
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      return withCache(`swagger-collection-${id}`, async () => {
        const response = await client.get(`${API_CONFIG.endpoints.swaggerCollections.detail}/${id}`)
        
        return {
          success: true,
          data: response.data
        }
      })
    })
  }

  /**
   * Create new swagger collection
   */
  async createSwaggerCollection(collectionData) {
    if (isMockEnabled('swaggerCollections')) {
      await simulateDelay(1000)
      
      const newCollection = {
        id: `swagger-${String(Date.now()).slice(-3).padStart(3, '0')}`,
        ...collectionData,
        createdDate: new Date().toISOString().split('T')[0],
        updatedDate: new Date().toISOString().split('T')[0],
        endpoints: collectionData.endpoints || [],
        tags: collectionData.tags || []
      }
      
      // In real implementation, this would be persisted
      mockSwaggerCollections.unshift(newCollection)
      
      return {
        success: true,
        data: newCollection,
        message: 'Swagger collection created successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.post(API_CONFIG.endpoints.swaggerCollections.create, collectionData)
      
      // Clear cache after creation
      this.clearSwaggerCollectionsCache()
      
      return {
        success: true,
        data: response.data,
        message: 'Swagger collection created successfully'
      }
    })
  }

  /**
   * Update swagger collection
   */
  async updateSwaggerCollection(id, collectionData) {
    if (isMockEnabled('swaggerCollections')) {
      await simulateDelay(800)
      
      const index = mockSwaggerCollections.findIndex(col => col.id === id)
      
      if (index === -1) {
        throw {
          status: 404,
          message: 'Swagger collection not found',
          data: null
        }
      }
      
      const updatedCollection = {
        ...mockSwaggerCollections[index],
        ...collectionData,
        updatedDate: new Date().toISOString().split('T')[0]
      }
      
      mockSwaggerCollections[index] = updatedCollection
      
      return {
        success: true,
        data: updatedCollection,
        message: 'Swagger collection updated successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.put(`${API_CONFIG.endpoints.swaggerCollections.update}/${id}`, collectionData)
      
      // Clear cache after update
      this.clearSwaggerCollectionsCache()
      
      return {
        success: true,
        data: response.data,
        message: 'Swagger collection updated successfully'
      }
    })
  }

  /**
   * Delete swagger collection
   */
  async deleteSwaggerCollection(id) {
    if (isMockEnabled('swaggerCollections')) {
      await simulateDelay(500)
      
      const index = mockSwaggerCollections.findIndex(col => col.id === id)
      
      if (index === -1) {
        throw {
          status: 404,
          message: 'Swagger collection not found',
          data: null
        }
      }
      
      mockSwaggerCollections.splice(index, 1)
      
      return {
        success: true,
        message: 'Swagger collection deleted successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.delete(`${API_CONFIG.endpoints.swaggerCollections.delete}/${id}`)
      
      // Clear cache after deletion
      this.clearSwaggerCollectionsCache()
      
      return {
        success: true,
        message: 'Swagger collection deleted successfully'
      }
    })
  }

  /**
   * Import swagger collection from URL or file
   */
  async importSwaggerCollection(importData) {
    if (isMockEnabled('swaggerCollections')) {
      await simulateDelay(2000)
      
      const newCollection = {
        id: `swagger-${String(Date.now()).slice(-3).padStart(3, '0')}`,
        name: importData.name || 'Imported API Collection',
        description: importData.description || 'Imported from external source',
        version: importData.version || '1.0.0',
        project: importData.project || 'Unknown',
        status: 'Active',
        createdDate: new Date().toISOString().split('T')[0],
        updatedDate: new Date().toISOString().split('T')[0],
        endpoints: importData.endpoints || [],
        tags: importData.tags || [],
        importSource: importData.source || 'manual'
      }
      
      mockSwaggerCollections.unshift(newCollection)
      
      return {
        success: true,
        data: newCollection,
        message: 'Swagger collection imported successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.post(`${API_CONFIG.endpoints.swaggerCollections.import}`, importData)
      
      // Clear cache after import
      this.clearSwaggerCollectionsCache()
      
      return {
        success: true,
        data: response.data,
        message: 'Swagger collection imported successfully'
      }
    })
  }

  /**
   * Export swagger collection
   */
  async exportSwaggerCollection(id, format = 'json') {
    if (isMockEnabled('swaggerCollections')) {
      await simulateDelay(1000)
      
      const collection = mockSwaggerCollections.find(col => col.id === id)
      
      if (!collection) {
        throw {
          status: 404,
          message: 'Swagger collection not found',
          data: null
        }
      }
      
      return {
        success: true,
        data: {
          filename: `${collection.name.replace(/\s+/g, '_')}_${collection.version}.${format}`,
          content: JSON.stringify(collection, null, 2),
          format: format
        },
        message: 'Swagger collection exported successfully'
      }
    }

    // Real API implementation
    const client = await this.initClient()
    
    return withRetry(async () => {
      const response = await client.get(`${API_CONFIG.endpoints.swaggerCollections.export}/${id}`, {
        params: { format }
      })
      
      return {
        success: true,
        data: response.data,
        message: 'Swagger collection exported successfully'
      }
    })
  }

  /**
   * Clear swagger collections cache
   */
  clearSwaggerCollectionsCache() {
    // Import clearCache dynamically to avoid circular dependency
    import('./config.js').then(({ clearCache }) => {
      clearCache('swagger-collections')
      clearCache('swagger-collection')
    })
  }
}

// Export singleton instance
export default new SwaggerCollectionsService()
