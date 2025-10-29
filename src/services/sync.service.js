import TariffModel from '../models/tariff.model.js'
import wbApiService from './wb-api.service.js'
import googleSheetsService from './google-sheets.service.js'
import env from '../config/env/env.js'

class SyncService {
    /**
     * Sync tariffs from WB API to database
     * @param {Date} [date] - Date for tariffs (defaults to today)
     * @returns {Promise<{success: boolean, tariffsCount: number}>}
     */
    async syncTariffsFromWB(date = new Date()) {
        try {
            const dateStr = TariffModel.getTariffDate(date)
            console.log(`[Sync] Starting tariff sync for date: ${dateStr}`)

            const wbTariffs = await wbApiService.fetchBoxTariffs(date)

            if (!wbTariffs || wbTariffs.length === 0) {
                console.warn('[Sync] No tariffs received from WB API')
                return { success: true, tariffsCount: 0 }
            }

            await TariffModel.upsertTariffs(wbTariffs, date)

            console.log(`[Sync] Successfully synced ${wbTariffs.length} tariffs to database`)

            return {
                success: true,
                tariffsCount: wbTariffs.length,
            }
        } catch (error) {
            console.error('[Sync] Failed to sync tariffs from WB:', error.message)
            return {
                success: false,
                tariffsCount: 0,
                error: error.message,
            }
        }
    }

    /**
     * Sync tariffs from database to Google Sheets
     * @param {Date} [date] - Date for tariffs (defaults to today)
     * @returns {Promise<{success: boolean, spreadsheetsUpdated: number, errors: Array}>}
     */
    async syncTariffsToGoogleSheets(date = new Date()) {
        try {
            const dateStr = TariffModel.getTariffDate(date)
            console.log(`[Sync] Starting Google Sheets sync for date: ${dateStr}`)

            const tariffs = await TariffModel.getTariffsByDate(date)

            if (!tariffs || tariffs.length === 0) {
                console.warn('[Sync] No tariffs found in database for this date')
                return {
                    success: true,
                    spreadsheetsUpdated: 0,
                    errors: [],
                }
            }

            const spreadsheetIds = env.GOOGLE_SHEETS_IDS

            if (!spreadsheetIds || spreadsheetIds.length === 0) {
                console.warn('[Sync] No Google Sheets IDs configured')
                return {
                    success: true,
                    spreadsheetsUpdated: 0,
                    errors: [],
                }
            }

            const results = await googleSheetsService.updateMultipleSpreadsheets(
                spreadsheetIds,
                tariffs
            )

            console.log(
                `[Sync] Google Sheets sync completed: ${results.success} succeeded, ${results.failed} failed`
            )

            return {
                success: results.failed === 0,
                spreadsheetsUpdated: results.success,
                errors: results.errors,
            }
        } catch (error) {
            console.error('[Sync] Failed to sync tariffs to Google Sheets:', error.message)
            return {
                success: false,
                spreadsheetsUpdated: 0,
                errors: [{ error: error.message }],
            }
        }
    }

    /**
     * Full synchronization: WB API -> Database -> Google Sheets
     * @param {Date} [date] - Date for tariffs (defaults to today)
     * @returns {Promise<{wbSync: object, sheetsSync: object}>}
     */
    async fullSync(date = new Date()) {
        const dateStr = TariffModel.getTariffDate(date)

        console.log(`[Sync] Starting full synchronization for ${dateStr}`)

        const wbSyncResult = await this.syncTariffsFromWB(date)

        let sheetsSyncResult = { success: true, spreadsheetsUpdated: 0, errors: [] }

        if (wbSyncResult.success && wbSyncResult.tariffsCount > 0) {
            sheetsSyncResult = await this.syncTariffsToGoogleSheets(date)
        }

        console.log(`[Sync] Full synchronization completed`)
        console.log(`[Sync] WB API: ${wbSyncResult.success ? 'SUCCESS' : 'FAILED'} (${wbSyncResult.tariffsCount} tariffs)`)
        console.log(`[Sync] Google Sheets: ${sheetsSyncResult.success ? 'SUCCESS' : 'FAILED'} (${sheetsSyncResult.spreadsheetsUpdated} updated)`)

        return {
            wbSync: wbSyncResult,
            sheetsSync: sheetsSyncResult,
        }
    }

    /**
     * Clean up old tariff data
     * @param {number} [daysToKeep] - Number of days to keep
     * @returns {Promise<{success: boolean, deletedCount: number}>}
     */
    async cleanupOldTariffs(daysToKeep = 90) {
        try {
            console.log(`[Sync] Cleaning up tariffs older than ${daysToKeep} days`)
            const deletedCount = await TariffModel.deleteOldTariffs(daysToKeep)
            console.log(`[Sync] Deleted ${deletedCount} old tariff records`)

            return {
                success: true,
                deletedCount,
            }
        } catch (error) {
            console.error('[Sync] Failed to cleanup old tariffs:', error.message)
            return {
                success: false,
                deletedCount: 0,
                error: error.message,
            }
        }
    }
}

const syncService = new SyncService()

export default syncService

