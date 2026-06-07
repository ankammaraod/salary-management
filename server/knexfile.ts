import path from 'path';
import type { Knex } from 'knex';

const migrations = { directory: path.join(__dirname, 'src/db/migrations') };
const seeds = { directory: path.join(__dirname, 'src/db/seeds') };

const config: { [key: string]: Knex.Config } = {
  development: {
    client: 'sqlite3',
    connection: { filename: path.join(__dirname, 'salary_management.db') },
    useNullAsDefault: true,
    migrations,
    seeds,
  },
  test: {
    client: 'sqlite3',
    connection: { filename: ':memory:' },
    useNullAsDefault: true,
    migrations,
    seeds,
  },
  production: {
    client: 'sqlite3',
    connection: { filename: path.join(__dirname, 'salary_management.db') },
    useNullAsDefault: true,
    migrations,
    seeds,
  },
};

export default config;
