import { createClient } from '@supabase/supabase-js';
import { config } from '../config.js';
import { HttpError } from '../errors.js';
import * as Users from '../models/user.model.js';

let admin = null;
/** Cliente de Supabase con la clave secreta (verificar tokens y administrar usuarios) */
export function supabaseAdmin() {
  if (!admin) {
    admin = createClient(config.supabaseUrl, config.supabaseSecretKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return admin;
}

/** Obtiene el id del usuario a partir del token JWT de Supabase Auth */
async function userIdFromToken(token) {
  // Solo en las pruebas automáticas: el token es "test:<uuid>"
  if (config.nodeEnv === 'test' && token.startsWith('test:')) return token.slice(5);
  const { data, error } = await supabaseAdmin().auth.getUser(token);
  if (error || !data?.user) return null;
  return data.user.id;
}

/**
 * Carga el usuario (si hay token) en req.user. El rol se lee SIEMPRE de la base de datos,
 * así un cambio de rol o una baja se aplican al momento.
 */
export async function loadUser(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    req.user = null;
    if (token) {
      const id = await userIdFromToken(token);
      if (id) req.user = await Users.findById(id);
    }
    next();
  } catch (error) {
    next(error);
  }
}

/** Exige sesión iniciada y, opcionalmente, uno de los roles indicados */
export const requireRole = (...roles) => (req, _res, next) => {
  if (!req.user) return next(new HttpError(401, 'Debes iniciar sesión para continuar'));
  if (!req.user.activo) return next(new HttpError(403, 'Tu cuenta está desactivada. Contacta con el administrador.'));
  if (roles.length && !roles.includes(req.user.rol)) {
    return next(new HttpError(403, 'No tienes permisos para realizar esta acción'));
  }
  next();
};
