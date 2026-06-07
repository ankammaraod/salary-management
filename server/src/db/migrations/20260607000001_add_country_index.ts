import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.table('employees', (table) => {
    table.index('country', 'idx_employees_country');
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.table('employees', (table) => {
    table.dropIndex('country', 'idx_employees_country');
  });
}
