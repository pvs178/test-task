import dotenv from 'dotenv'

dotenv.config()

/**
 * @typedef {object} EnvConfig
 * @property {string} NODE_ENV - Current environment (development/production)
 * @property {string} POSTGRES_HOST - PostgreSQL host
 * @property {number} POSTGRES_PORT - PostgreSQL port
 * @property {string} POSTGRES_DB - PostgreSQL database name
 * @property {string} POSTGRES_USER - PostgreSQL user
 * @property {string} POSTGRES_PASSWORD - PostgreSQL password
 * @property {string} WB_API_TOKEN - Wildberries API token
 * @property {string} GOOGLE_SERVICE_ACCOUNT_EMAIL - Google service account email
 * @property {string} GOOGLE_PRIVATE_KEY - Google service account private key
 * @property {string[]} GOOGLE_SHEETS_IDS - Array of Google Sheets IDs
 * @property {string} SYNC_CRON_SCHEDULE - Cron schedule for sync (default: every hour)
 */

/**
 * Application environment configuration
 * @type {EnvConfig}
 */
const env = {
    NODE_ENV: process.env.NODE_ENV || 'development',
    POSTGRES_HOST: process.env.POSTGRES_HOST || 'localhost',
    POSTGRES_PORT: parseInt(process.env.POSTGRES_PORT || '5432', 10),
    POSTGRES_DB: process.env.POSTGRES_DB || 'postgres',
    POSTGRES_USER: process.env.POSTGRES_USER || 'postgres',
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD || 'postgres',
    WB_API_TOKEN: process.env.WB_API_TOKEN || '',
    GOOGLE_SERVICE_ACCOUNT_EMAIL: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL || '',
    GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY || '',
    GOOGLE_SHEETS_IDS: process.env.GOOGLE_SHEETS_IDS
        ? process.env.GOOGLE_SHEETS_IDS.split(',').map(id => id.trim())
        : [],
    SYNC_CRON_SCHEDULE: process.env.SYNC_CRON_SCHEDULE || '0 * * * *'
}

export default env

