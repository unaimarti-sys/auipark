import { supabase } from './supabase.js';

const API_URL = import.meta.env.VITE_API_URL || '/api';

/**
 * Cliente HTTP de la API Express. Si hay sesión de Supabase envía el token JWT en la
 * cabecera Authorization; el servidor lo verifica y lee el rol de la base de datos.
 */
async function request(path, { method = 'GET', body, signal } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  const { data } = await supabase.auth.getSession();
  if (data.session?.access_token) headers.Authorization = `Bearer ${data.session.access_token}`;

  const response = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  let json = null;
  try {
    json = await response.json();
  } catch {
    json = null;
  }
  if (!response.ok) {
    const error = new Error(json?.error || `Error ${response.status}`);
    error.status = response.status;
    error.fields = json?.fields || undefined;
    throw error;
  }
  return json;
}

export const api = {
  get: (path, signal) => request(path, { signal }),
  post: (path, body = {}) => request(path, { method: 'POST', body }),
  put: (path, body = {}) => request(path, { method: 'PUT', body }),
  patch: (path, body = {}) => request(path, { method: 'PATCH', body }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export default api;
