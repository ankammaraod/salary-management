import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  await knex.schema.createTable('employees', (table) => {
    table.increments('id');
    table.string('name').notNullable();
    table.string('email').notNullable().unique();
    table.enu('gender', ['Male', 'Female', 'Other']).notNullable();
    table.string('role').notNullable();
    table.string('department').notNullable();
    table.string('country').notNullable();
    table.float('salary').notNullable();
    table.enu('employment_type', ['Full-time', 'Contractor']).notNullable();
    table.string('joining_date').notNullable();
  });
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTable('employees');
}
