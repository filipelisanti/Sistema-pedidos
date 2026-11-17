/** Una vez antes de toda la suite: aplica las migraciones a la base de test. */
import 'dotenv/config';
import { join } from 'node:path';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { crearDb } from '../src/db/client';

export default async function globalSetup() {
  const { db, pool } = crearDb(process.env.DATABASE_URL_TEST);
  try {
    await migrate(db, { migrationsFolder: join(__dirname, '..', 'drizzle') });
  } finally {
    await pool.end();
  }
}
