/**
 * Product KPI API Service
 * Handles all product KPI dashboard API calls
 */

import { createApiClient, withRetry } from './config.js'

class ProductKPIService {
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
   * Get Product KPI data with all related metrics
   * @param {string|null} productName - Optional product name filter
   * @returns {Promise<{success: boolean, data: object|null, error: string|null}>}
   */
  async getProductKPIData(productName = null) {
    const client = await this.initClient()

    return withRetry(async () => {
      const params = {}
      if (productName) {
        params.product_name = productName
      }

      const response = await client.get(
        '/api/method/frappe_devsecops_dashboard.api.product_kpi.get_product_kpi_data',
        { params }
      )

      // Frappe wraps the response in 'message' property
      const apiResponse = response.data.message || response.data

      return {
        success: apiResponse.success !== false,
        data: apiResponse.data || null,
        error: apiResponse.error || null
      }
    })
  }

  /**
   * Get Software Products for filter dropdown
   * @returns {Promise<{success: boolean, data: array, error: string|null}>}
   */
  async getSoftwareProductsForFilter() {
    const client = await this.initClient()

    return withRetry(async () => {
      const response = await client.get(
        '/api/method/frappe_devsecops_dashboard.api.product_kpi.get_software_products_for_filter'
      )

      // Frappe wraps the response in 'message' property
      const apiResponse = response.data.message || response.data

      return {
        success: apiResponse.success !== false,
        data: apiResponse.data || [],
        error: apiResponse.error || null
      }
    })
  }
}

// Export singleton instance
export default new ProductKPIService()
