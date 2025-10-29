import knex from '../postgres/knex.js'

/**
 * @typedef {object} TariffData
 * @property {string} warehouseName - Warehouse name
 * @property {string} boxDeliveryAndStorageExpr - Delivery and storage expression
 * @property {number} boxDeliveryBase - Base delivery cost
 * @property {number} boxDeliveryLiter - Delivery cost per liter
 * @property {number} boxStorageBase - Base storage cost
 * @property {number} boxStorageLiter - Storage cost per liter
 */

/**
 * @typedef {object} TariffRecord
 * @property {number} id - Record ID
 * @property {Date} tariff_date - Tariff date
 * @property {string} warehouse_name - Warehouse name
 * @property {string} box_delivery_and_storage_expr - Delivery and storage expression
 * @property {number} box_delivery_base - Base delivery cost
 * @property {number} box_delivery_liter - Delivery cost per liter
 * @property {number} box_storage_base - Base storage cost
 * @property {number} box_storage_liter - Storage cost per liter
 * @property {Date} created_at - Creation timestamp
 * @property {Date} updated_at - Update timestamp
 */

const TABLE_NAME = 'wb_tariffs'

class TariffModel {
    /**
     * Get or create tariff date (normalized to start of day)
     * @param {Date} [date] - Date to normalize (defaults to today)
     * @returns {string} Date in YYYY-MM-DD format
     */
    static getTariffDate(date = new Date()) {
        const d = new Date(date)
        d.setHours(0, 0, 0, 0)
        return d.toISOString().split('T')[0]
    }

    /**
     * Convert number string from WB format (comma) to DB format (dot)
     * @param {string|number} value - Value to convert
     * @returns {number}
     */
    static normalizeNumber(value) {
        if (typeof value === 'number') return value
        if (typeof value === 'string') {
            return parseFloat(value.replace(',', '.'))
        }

        return 0
    }

    /**
     * Upsert tariffs for a specific date
     * @param {TariffData[]} tariffs - Array of tariff data
     * @param {Date} [date] - Date for tariffs (defaults to today)
     * @returns {Promise<void>}
     */
    static async upsertTariffs(tariffs, date = new Date()) {
        const tariffDate = this.getTariffDate(date)

        for (const tariff of tariffs) {
            const expression = tariff.boxDeliveryAndStorageExpr || ''

            await knex(TABLE_NAME)
                .insert({
                    tariff_date: tariffDate,
                    warehouse_name: tariff.warehouseName,
                    box_delivery_and_storage_expr: expression,
                    box_delivery_base: this.normalizeNumber(tariff.boxDeliveryBase),
                    box_delivery_liter: this.normalizeNumber(tariff.boxDeliveryLiter),
                    box_storage_base: this.normalizeNumber(tariff.boxStorageBase),
                    box_storage_liter: this.normalizeNumber(tariff.boxStorageLiter),
                    updated_at: knex.fn.now(),
                })
                .onConflict(['tariff_date', 'warehouse_name'])
                .merge({
                    box_delivery_and_storage_expr: expression,
                    box_delivery_base: this.normalizeNumber(tariff.boxDeliveryBase),
                    box_delivery_liter: this.normalizeNumber(tariff.boxDeliveryLiter),
                    box_storage_base: this.normalizeNumber(tariff.boxStorageBase),
                    box_storage_liter: this.normalizeNumber(tariff.boxStorageLiter),
                    updated_at: knex.fn.now(),
                })
        }
    }

    /**
     * Get tariffs for a specific date
     * @param {Date} [date] - Date to query (defaults to today)
     * @returns {Promise<TariffRecord[]>}
     */
    static async getTariffsByDate(date = new Date()) {
        const tariffDate = this.getTariffDate(date)

        return knex(TABLE_NAME)
            .where('tariff_date', tariffDate)
            .orderBy('box_delivery_and_storage_expr', 'asc')
    }

    /**
     * Get latest tariffs (today's data)
     * @returns {Promise<TariffRecord[]>}
     */
    static async getLatestTariffs() {
        return this.getTariffsByDate(new Date())
    }

    /**
     * Get all tariffs within date range
     * @param {Date} startDate - Start date
     * @param {Date} endDate - End date
     * @returns {Promise<TariffRecord[]>}
     */
    static async getTariffsInRange(startDate, endDate) {
        const start = this.getTariffDate(startDate)
        const end = this.getTariffDate(endDate)

        return knex(TABLE_NAME)
            .whereBetween('tariff_date', [start, end])
            .orderBy(['tariff_date', 'box_delivery_and_storage_expr'])
    }

    /**
     * Delete old tariffs (older than specified days)
     * @param {number} daysToKeep - Number of days to keep
     * @returns {Promise<number>} Number of deleted records
     */
    static async deleteOldTariffs(daysToKeep = 90) {
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - daysToKeep)
        const cutoffDateStr = this.getTariffDate(cutoffDate)

        return knex(TABLE_NAME)
            .where('tariff_date', '<', cutoffDateStr)
            .delete()
    }
}

export default TariffModel

