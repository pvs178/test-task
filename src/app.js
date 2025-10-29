import knex, { migrate } from './postgres/knex.js'
import scheduler from './scheduler/index.js'
import syncService from './services/sync.service.js'
import env from './config/env/env.js'

class Application {
    constructor() {
        this.isShuttingDown = false
    }

    async initializeDatabase() {
        try {
            console.log('[App] Running database migrations...')
            await migrate.latest()
            console.log('[App] Database initialized successfully')
        } catch (error) {
            console.error('[App] Failed to initialize database:', error)
            throw error
        }
    }

    async runInitialSync() {
        try {
            console.log('[App] Running initial synchronization...')
            await syncService.fullSync()
            console.log('[App] Initial synchronization completed')
        } catch (error) {
            console.error('[App] Initial synchronization failed:', error)
        }
    }

    async start() {
        try {
            console.log('[App] WB Tariffs Sync Application')
            console.log('[App] Environment:', env.NODE_ENV)
            console.log('[App] Database:', `${env.POSTGRES_HOST}:${env.POSTGRES_PORT}/${env.POSTGRES_DB}`)
            console.log('[App] WB API Token:', env.WB_API_TOKEN ? 'Configured' : 'NOT CONFIGURED')
            console.log('[App] Google Sheets:', env.GOOGLE_SHEETS_IDS.length > 0 ? `${env.GOOGLE_SHEETS_IDS.length} configured` : 'NOT CONFIGURED')
            console.log('[App] Sync Schedule:', env.SYNC_CRON_SCHEDULE)

            if (!env.WB_API_TOKEN) {
                console.warn('[App] WARNING: WB_API_TOKEN is not set. Sync from WB API will fail.')
            }

            if (env.GOOGLE_SHEETS_IDS.length === 0) {
                console.warn('[App] WARNING: GOOGLE_SHEETS_IDS is not set. Google Sheets sync will be skipped.')
            }

            await this.initializeDatabase()

            await this.runInitialSync()

            scheduler.start()

            console.log('[App] Application started successfully!')

            this.setupGracefulShutdown()

        } catch (error) {
            console.error('[App] Failed to start application:', error)
            await this.shutdown(1)
        }
    }


    setupGracefulShutdown() {
        const signals = ['SIGINT', 'SIGTERM', 'SIGQUIT']

        signals.forEach(signal => {
            process.on(signal, async () => {
                if (this.isShuttingDown) {
                    console.log('[App] Forced shutdown')
                    process.exit(1)
                }

                console.log(`\n[App] Received ${signal}, shutting down gracefully...`)
                await this.shutdown(0)
            })
        })

        process.on('uncaughtException', async (error) => {
            console.error('[App] Uncaught exception:', error)
            await this.shutdown(1)
        })

        process.on('unhandledRejection', async (reason, promise) => {
            console.error('[App] Unhandled rejection at:', promise, 'reason:', reason)
            await this.shutdown(1)
        })
    }

    /**
     * Shutdown the application gracefully
     * @param {number} exitCode - Exit code
     */
    async shutdown(exitCode = 0) {
        if (this.isShuttingDown) {
            return
        }

        this.isShuttingDown = true

        console.log('[App] Shutting down...')

        scheduler.stop()

        try {
            await knex.destroy()
            console.log('[App] Database connection closed')
        } catch (error) {
            console.error('[App] Error closing database connection:', error)
        }

        console.log('[App] Shutdown complete')
        process.exit(exitCode)
    }
}

const app = new Application()

app.start().catch(error => {
    console.error('[App] Critical startup error:', error)
    process.exit(1)
})

