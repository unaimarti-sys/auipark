import pg from 'pg';
import { config } from './config.js';

// numeric de Postgres llega como texto: lo convertimos a número
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)));
pg.types.setTypeParser(20, (v) => (v === null ? null : Number(v))); // bigint

// En serverless cada instancia mantiene pocas conexiones; el pooler de Supabase hace el resto
// Quitamos sslmode/supa de la URL (las añade la integración de Vercel): el SSL se configura abajo
function cleanUrl(url) {
  if (!url) return url;
  try {
    const u = new URL(url);
    ['sslmode', 'supa', 'pgbouncer'].forEach((k) => u.searchParams.delete(k));
    return u.toString();
  } catch {
    return url;
  }
}

export const pool = new pg.Pool({
  connectionString: cleanUrl(config.databaseUrl),
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
