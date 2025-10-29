import { google } from 'googleapis'
import env from '../config/env/env.js'

/**
 * @typedef {object} SheetRow
 * @property {string} warehouseName - Warehouse name
 * @property {number} coefficient - Calculated coefficient for sorting
 * @property {string} boxDeliveryAndStorageExpr - Delivery and storage expression
 * @property {number} boxDeliveryBase - Base delivery cost
 * @property {number} boxDeliveryLiter - Delivery cost per liter
 * @property {number} boxStorageBase - Base storage cost
 * @property {number} boxStorageLiter - Storage cost per liter
 */

const SHEET_NAME = 'stocks_coefs'

class GoogleSheetsService {
    constructor() {
        this.auth = null
        this.sheets = null
        this.initialized = false
    }

    /**
     * Initialize Google Sheets API client
     * @throws {Error} If credentials are invalid
     */
    async initialize() {
        if (this.initialized) {
            return
        }

        try {
            if (!env.GOOGLE_SERVICE_ACCOUNT_EMAIL || !env.GOOGLE_PRIVATE_KEY) {
                throw new Error('Google credentials not configured')
            }

            this.auth = new google.auth.JWT({
                email: env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
                key: env.GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            })

            await this.auth.authorize()

            this.sheets = google.sheets({ version: 'v4', auth: this.auth })
            this.initialized = true

            console.log('[Google Sheets] Service initialized successfully')
        } catch (error) {
            console.error('[Google Sheets] Initialization failed:', error.message)
            throw new Error(`Failed to initialize Google Sheets service: ${error.message}`)
        }
    }

    /**
     * Calculate coefficient for tariff (used for sorting)
     * @param {object} tariff - Tariff record
     * @returns {number} Calculated coefficient
     */
    calculateCoefficient(tariff) {
        return (
            parseFloat(tariff.box_delivery_base || 0) +
            parseFloat(tariff.box_delivery_liter || 0) +
            parseFloat(tariff.box_storage_base || 0) +
            parseFloat(tariff.box_storage_liter || 0)
        )
    }

    /**
     * Prepare tariff data for spreadsheet
     * @param {Array} tariffs - Array of tariff records
     * @returns {Array<Array>} 2D array for Google Sheets
     */
    prepareTariffData(tariffs) {
        const tariffsWithCoef = tariffs.map(tariff => ({
            ...tariff,
            coefficient: this.calculateCoefficient(tariff),
        }))

        tariffsWithCoef.sort((a, b) => a.coefficient - b.coefficient)

        const headers = [
            'Склад',
            'Коэффициент',
            'Формула',
            'Доставка база',
            'Доставка за литр',
            'Хранение база',
            'Хранение за литр',
        ]

        const rows = tariffsWithCoef.map(tariff => [
            tariff.warehouse_name,
            tariff.coefficient.toFixed(2),
            tariff.box_delivery_and_storage_expr,
            parseFloat(tariff.box_delivery_base).toFixed(2),
            parseFloat(tariff.box_delivery_liter).toFixed(2),
            parseFloat(tariff.box_storage_base).toFixed(2),
            parseFloat(tariff.box_storage_liter).toFixed(2),
        ])

        return [headers, ...rows]
    }

    /**
     * Update spreadsheet with tariff data
     * @param {string} spreadsheetId - Google Spreadsheet ID
     * @param {Array} tariffs - Array of tariff records
     * @returns {Promise<void>}
     */
    async updateSpreadsheet(spreadsheetId, tariffs) {
        await this.initialize()

        try {
            console.log(`[Google Sheets] Updating spreadsheet: ${spreadsheetId}`)

            const spreadsheet = await this.sheets.spreadsheets.get({
                spreadsheetId,
            })

            const sheetExists = spreadsheet.data.sheets?.some(
                sheet => sheet.properties?.title === SHEET_NAME
            )

            if (!sheetExists) {
                await this.sheets.spreadsheets.batchUpdate({
                    spreadsheetId,
                    requestBody: {
                        requests: [{
                            addSheet: {
                                properties: {
                                    title: SHEET_NAME,
                                },
                            },
                        }],
                    },
                })
                console.log(`[Google Sheets] Created sheet: ${SHEET_NAME}`)
            }

            const data = this.prepareTariffData(tariffs)

            await this.sheets.spreadsheets.values.clear({
                spreadsheetId,
                range: `${SHEET_NAME}!A:Z`,
            })

            await this.sheets.spreadsheets.values.update({
                spreadsheetId,
                range: `${SHEET_NAME}!A1`,
                valueInputOption: 'RAW',
                requestBody: {
                    values: data,
                },
            })

            const sheetId = spreadsheet.data.sheets?.find(
                sheet => sheet.properties?.title === SHEET_NAME
            )?.properties?.sheetId || 0

            await this.sheets.spreadsheets.batchUpdate({
                spreadsheetId,
                requestBody: {
                    requests: [
                        {
                            repeatCell: {
                                range: {
                                    sheetId,
                                    startRowIndex: 0,
                                    endRowIndex: 1,
                                },
                                cell: {
                                    userEnteredFormat: {
                                        textFormat: {
                                            bold: true,
                                        },
                                        backgroundColor: {
                                            red: 0.9,
                                            green: 0.9,
                                            blue: 0.9,
                                        },
                                    },
                                },
                                fields: 'userEnteredFormat(textFormat,backgroundColor)',
                            },
                        },
                        {
                            autoResizeDimensions: {
                                dimensions: {
                                    sheetId,
                                    dimension: 'COLUMNS',
                                    startIndex: 0,
                                    endIndex: 7,
                                },
                            },
                        },
                    ],
                },
            })

            console.log(`[Google Sheets] Successfully updated ${data.length - 1} rows in ${SHEET_NAME}`)
        } catch (error) {
            console.error(`[Google Sheets] Failed to update spreadsheet ${spreadsheetId}:`, error.message)
            throw new Error(`Failed to update spreadsheet: ${error.message}`)
        }
    }

    /**
     * Update multiple spreadsheets with tariff data
     * @param {string[]} spreadsheetIds - Array of Google Spreadsheet IDs
     * @param {Array} tariffs - Array of tariff records
     * @returns {Promise<{success: number, failed: number, errors: Array}>}
     */
    async updateMultipleSpreadsheets(spreadsheetIds, tariffs) {
        await this.initialize()

        const results = {
            success: 0,
            failed: 0,
            errors: [],
        }

        for (const spreadsheetId of spreadsheetIds) {
            try {
                await this.updateSpreadsheet(spreadsheetId, tariffs)
                results.success++
            } catch (error) {
                results.failed++
                results.errors.push({
                    spreadsheetId,
                    error: error.message,
                })
            }
        }

        return results
    }
}

const googleSheetsService = new GoogleSheetsService()

export default googleSheetsService

