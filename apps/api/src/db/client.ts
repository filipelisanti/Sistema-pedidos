import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from './schema';

export type Db = NodePgDatabase<typeof schema>;

/** Crea el pool de conexiones y la instancia de Drizzle. Lo usan la API (vía DbModule) y el seed. */
export function crearDb(databaseUrl = process.env.DATABASE_URL): { db: Db; pool: Pool } {
  if (!databaseUrl) throw new Error('Falta la variable de entorno DATABASE_URL');
  const pool = new Pool({ connectionString: databaseUrl });
  const db = drizzle(pool, { schema, casing: 'snake_case' });
  return { db, pool };
}
