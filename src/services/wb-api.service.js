import axios from 'axios'
import env from '../config/env/env.js'

/**
 * @typedef {object} WBTariffResponse
 * @property {object} response - Response data
 * @property {WBTariffData} response.data - Tariff data
 */

/**
 * @typedef {object} WBTariffData
 * @property {WBWarehouseBoxTariff[]} warehouseList - List of warehouse tariffs
 */

/**
 * @typedef {object} WBWarehouseBoxTariff
 * @property {string} warehouseName - Warehouse name
 * @property {string} boxDeliveryAndStorageExpr - Delivery and storage formula
 * @property {number} boxDeliveryBase - Base delivery cost
 * @property {number} boxDeliveryLiter - Cost per liter for delivery
 * @property {number} boxStorageBase - Base storage cost
 * @property {number} boxStorageLiter - Cost per liter for storage
 */

const WB_API_BASE_URL = 'https://common-api.wildberries.ru/api/v1'
const WB_TARIFFS_BOX_ENDPOINT = '/tariffs/box'

class WbApiService {
    /**
     * Create WB API service instance
     * @param {string} apiToken - WB API token
     */
    constructor(apiToken) {
        this.apiToken = apiToken
        this.axiosInstance = axios.create({
            baseURL: WB_API_BASE_URL,
            timeout: 30000,
        })
    }

    /**
     * Fetch box tariffs from WB API
     * @param {Date} [date] - Date for tariffs (defaults to today)
     * @returns {Promise<WBWarehouseBoxTariff[]>}
     * @throws {Error} If API request fails
     */
    async fetchBoxTariffs(date = new Date()) {
        try {
            const dateStr = date.toISOString().split('T')[0]
            console.log(`[WB API] Fetching box tariffs for date: ${dateStr}`)

            const headers = this.apiToken ? {
                'Authorization': this.apiToken
            } : {}

            const response = await this.axiosInstance.get(WB_TARIFFS_BOX_ENDPOINT, {
                headers,
                params: {
                    date: dateStr,
                },
            })

            if (!response.data || !response.data.response || !response.data.response.data) {
                throw new Error('Invalid response structure from WB API')
            }

            const tariffs = response.data.response.data.warehouseList || []
            console.log(`[WB API] Successfully fetched ${tariffs.length} tariffs`)

            return tariffs
        } catch (error) {
            if (axios.isAxiosError(error)) {
                const status = error.response?.status
                const message = error.response?.data?.message || error.message
                console.error(`[WB API] Request failed with status ${status}: ${message}`)
                throw new Error(`WB API request failed: ${message}`)
            }
            console.error('[WB API] Unexpected error:', error)
            throw error
        }
    }

    /**
     * Validate API token by making a test request
     * @returns {Promise<boolean>} True if token is valid
     */
    async validateToken() {
        try {
            await this.fetchBoxTariffs()
            return true
        } catch (error) {
            console.error('[WB API] Token validation failed:', error.message)
            return false
        }
    }
}

const wbApiService = new WbApiService(env.WB_API_TOKEN)

export default wbApiService

