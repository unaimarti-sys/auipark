import { createClient } from '@supabase/supabase-js';

// Valores PÚBLICOS del proyecto (la publishable key está pensada para ir en el navegador:
// la seguridad la dan las políticas RLS y la API). Se pueden sobrescribir con VITE_SUPABASE_*.
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://qlkwgwpkvflcwepmezbw.supabase.co';
const SUPABASE_PUBLISHABLE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || 'sb_publishable_LgoVaOTQj2dR-P3S6D4_gQ_lhbCZUI6';

export const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});
