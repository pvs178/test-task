/**
 * Migration: Create wb_tariffs table
 * @param {import('knex').Knex} knex
 */
export async function up(knex) {
    await knex.schema.createTable('wb_tariffs', (table) => {
        table.increments('id').primary()

        table.date('tariff_date').notNullable()

        table.string('warehouse_name').notNullable()
        table.string('box_delivery_and_storage_expr').notNullable()
        table.decimal('box_delivery_base', 10, 2).notNullable()
        table.decimal('box_delivery_liter', 10, 2).notNullable()
        table.decimal('box_storage_base', 10, 2).notNullable()
        table.decimal('box_storage_liter', 10, 2).notNullable()

        table.timestamp('created_at').defaultTo(knex.fn.now())
        table.timestamp('updated_at').defaultTo(knex.fn.now())

        table.unique(['tariff_date', 'warehouse_name'])

        table.index('tariff_date')
    })
}

/**
 * Rollback migration
 * @param {import('knex').Knex} knex
 */
export async function down(knex) {
    await knex.schema.dropTableIfExists('wb_tariffs')
}

