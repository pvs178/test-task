import env from '../env/env.js'

const NODE_ENV = env.NODE_ENV || 'development'

/**
 * @typedef {import('knex').Knex.Config} KnexConfig
 */

/**
 * Knex configurations for different environments
 * @type {Record<string, KnexConfig>}
 */
const knexConfigs = {
    development: {
        client: 'pg',
        connection: {
            host: env.POSTGRES_HOST,
            port: env.POSTGRES_PORT,
            database: env.POSTGRES_DB,
            user: env.POSTGRES_USER,
            password: env.POSTGRES_PASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            stub: 'src/config/knex/migration.stub.js',
            directory: './src/postgres/migrations',
            tableName: 'migrations',
            extension: 'js',
        },
        seeds: {
            stub: 'src/config/knex/seed.stub.js',
            directory: './src/postgres/seeds',
            extension: 'js',
        },
    },
    production: {
        client: 'pg',
        connection: {
            host: env.POSTGRES_HOST,
            port: env.POSTGRES_PORT,
            database: env.POSTGRES_DB,
            user: env.POSTGRES_USER,
            password: env.POSTGRES_PASSWORD,
        },
        pool: {
            min: 2,
            max: 10,
        },
        migrations: {
            directory: './src/postgres/migrations',
            tableName: 'migrations',
            extension: 'js',
        },
        seeds: {
            directory: './src/postgres/seeds',
            extension: 'js',
        },
    },
}

export default knexConfigs[NODE_ENV]

