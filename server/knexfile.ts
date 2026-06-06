import type { Knex } from 'knex';

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: { filename: './salary_management.db' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
  },
  test: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations: { directory: './src/db/migrations' },
  },
};

export default config;
