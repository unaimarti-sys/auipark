// Variables de entorno (en local: fichero .env · en Vercel: Settings → Environment Variables)
const env = process.env;

export const config = {
  // Cadena de conexión de Supabase → Connect → "Transaction pooler" (puerto 6543)
  // (o POSTGRES_URL si las variables las pone la integración Supabase ↔ Vercel)
  databaseUrl: env.DATABASE_URL || env.POSTGRES_URL,
  databaseSsl: env.DATABASE_SSL !== 'false',
  supabaseUrl: env.SUPABASE_URL || env.NEXT_PUBLIC_SUPABASE_URL,
  // Clave secreta (sb_secret_...): SOLO en el servidor, nunca en el frontend
  supabaseSecretKey: env.SUPABASE_SECRET_KEY || env.SUPABASE_SERVICE_ROLE_KEY,
  // Geoapify (importación de parkings reales y buscador de direcciones)
  geoapifyKey: env.GEOAPIFY_API_KEY || '1e5878597d5c45b78db4ee1910d3a776',
  nodeEnv: env.NODE_ENV || 'development',
};

export function assertConfig() {
  const missing = ['databaseUrl', 'supabaseUrl', 'supabaseSecretKey'].filter((k) => !config[k]);
  if (missing.length && config.nodeEnv !== 'test') {
    throw new Error(`Faltan variables de entorno: ${missing.join(', ')}`);
  }
}
