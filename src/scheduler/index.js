import cron from 'node-cron'
import syncService from '../services/sync.service.js'
import env from '../config/env/env.js'

class Scheduler {
    constructor() {
        this.jobs = []
    }

    start() {
        console.log('[Scheduler] Starting scheduled tasks')

        const syncJob = cron.schedule(
            env.SYNC_CRON_SCHEDULE,
            async () => {
                console.log(`[Scheduler] Running scheduled sync task at ${new Date().toISOString()}`)
                try {
                    await syncService.fullSync()
                } catch (error) {
                    console.error('[Scheduler] Sync task failed:', error)
                }
            },
            {
                scheduled: true,
                timezone: 'Europe/Moscow',
            }
        )

        this.jobs.push({ name: 'tariff-sync', job: syncJob })

        console.log(`[Scheduler] Tariff sync scheduled with cron: ${env.SYNC_CRON_SCHEDULE}`)

        const cleanupJob = cron.schedule(
            '0 3 * * *',
            async () => {
                console.log(`[Scheduler] Running cleanup task at ${new Date().toISOString()}`)
                try {
                    await syncService.cleanupOldTariffs(90)
                } catch (error) {
                    console.error('[Scheduler] Cleanup task failed:', error)
                }
            },
            {
                scheduled: true,
                timezone: 'Europe/Moscow',
            }
        )

        this.jobs.push({ name: 'cleanup', job: cleanupJob })

        console.log('[Scheduler] Cleanup task scheduled (daily at 03:00)')
        console.log('[Scheduler] All tasks started successfully')
    }

    stop() {
        console.log('[Scheduler] Stopping all scheduled tasks')

        for (const { name, job } of this.jobs) {
            job.stop()
            console.log(`[Scheduler] Stopped task: ${name}`)
        }

        this.jobs = []
    }

    /**
     * Get status of all scheduled jobs
     * @returns {Array<{name: string, status: string}>}
     */
    getStatus() {
        return this.jobs.map(({ name, job }) => ({
            name,
            status: job.getStatus ? job.getStatus() : 'running',
        }))
    }
}

const scheduler = new Scheduler()

export default scheduler
