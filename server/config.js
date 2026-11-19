// Variables de entorno (en local: fichero .env · en Vercel: Settings → Environment Variables)
const env = process.env;

export const config = {
  // Cadena de conexión de Supabase → Connect → "Transaction pooler" (puerto 6543)
  databaseUrl: env.DATABASE_URL,
  databaseSsl: env.DATABASE_SSL !== 'false',
  supabaseUrl: env.SUPABASE_URL,
  // Clave secreta (sb_secret_...): SOLO en el servidor, nunca en el frontend
  supabaseSecretKey: env.SUPABASE_SECRET_KEY,
  nodeEnv: env.NODE_ENV || 'development',
};

export function assertConfig() {
  const missing = ['databaseUrl', 'supabaseUrl', 'supabaseSecretKey'].filter((k) => !config[k]);
  if (missing.length && config.nodeEnv !== 'test') {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}
