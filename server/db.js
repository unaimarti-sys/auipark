import pg from 'pg';
import { config } from './config.js';

// numeric de Postgres llega como texto: lo convertimos a número
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // bigint

// En serverless cada instancia mantiene pocas conexiones; el pooler de Supabase hace el resto
export const pool = new pg.Pool({
  connectionString: config.databaseUrl,
  ssl: config.databaseSsl ? { rejectUnauthorized: false } : false,
  max: 3,
  idleTimeoutMillis: 10000,
});

export const query = (text, params) => pool.query(text, params);

/** Ejecuta varias consultas en una transacción */
export async function transaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    client.release();
  }
}
