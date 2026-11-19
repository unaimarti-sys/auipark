import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../services/supabase.js';
import api from '../services/api.js';

/**
 * Controlador de autenticación con Supabase Auth.
 * Supabase gestiona el registro, el login y el token; el perfil y el ROL se piden a
 * nuestra API (/api/me), que los lee de la tabla profiles.
 */
const AuthContext = createContext(null);

export const ROLE_LABELS = {
  cliente: 'Cliente',
  empleado: 'Empleado de parking',
  admin: 'Administrador',
};

// Mensajes de Supabase Auth traducidos
const AUTH_ERRORS = {
  'Invalid login credentials': 'Email o contraseña incorrectos',
  'User already registered': 'Ya existe una cuenta con este email',
  'Email not confirmed': 'Tienes que confirmar tu email antes de iniciar sesión (revisa tu correo)',
  'User is banned': 'Tu cuenta está desactivada. Contacta con el administrador.',
};
function translate(error) {
  const msg = error?.message || 'Error de autenticación';
  const key = Object.keys(AUTH_ERRORS).find((k) => msg.includes(k));
  if (key) return AUTH_ERRORS[key];
  if (/password/i.test(msg) && /characters/i.test(msg)) return 'La contraseña es demasiado corta (mínimo 8 caracteres)';
  if (/rate limit/i.test(msg)) return 'Demasiados intentos. Espera unos minutos y vuelve a probar.';
  return msg;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadProfile = useCallback(async () => {
    try {
      const data = await api.get('/me');
      setUser(data.user);
      return data.user;
    } catch {
      setUser(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProfile();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') setUser(null);
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') setTimeout(loadProfile, 0);
    });
    return () => data.subscription.unsubscribe();
  }, [loadProfile]);

  const login = useCallback(
    async (email, password) => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw new Error(translate(error));
      const profile = await loadProfile();
      if (!profile) throw new Error('No se pudo cargar tu perfil');
      if (!profile.active) {
        await supabase.auth.signOut();
        throw new Error('Tu cuenta está desactivada. Contacta con el administrador.');
      }
      return profile;
    },
    [loadProfile]
  );

  /** Devuelve el perfil, o { needsConfirmation: true } si Supabase pide confirmar el email */
  const register = useCallback(
    async ({ name, email, phone, password }) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre: name, telefono: phone } },
      });
      if (error) throw new Error(translate(error));
      if (!data.session) return { needsConfirmation: true };
      return loadProfile();
    },
    [loadProfile]
  );

  const logout = useCallback(async () => {
    await supabase.auth.signOut();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, refresh: loadProfile }),
    [user, loading, login, register, logout, loadProfile]
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  return ctx;
}

/** Página de inicio según el rol tras iniciar sesión */
export function homeForRole(role) {
  if (role === 'admin') return '/admin';
  if (role === 'empleado') return '/empleado';
  return '/reservas';
}
