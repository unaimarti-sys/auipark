import { HttpError } from '../errors.js';

/**
 * Búsqueda de direcciones con Nominatim (OpenStreetMap), sin API key.
 * Política de uso: máx. 1 petición/segundo, User-Agent identificable y NO autocompletar
 * en cada tecla. Por eso el buscador solo consulta al pulsar «Buscar» y aquí se cachea.
 */
const cache = new Map();
let lastCall = 0;

export async function search(text) {
  const q = text.trim().toLowerCase();
  if (cache.has(q)) return cache.get(q);

  const wait = 1000 - (Date.now() - lastCall);
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCall = Date.now();

  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.search = new URLSearchParams({ q: text, format: 'jsonv2', limit: '6', countrycodes: 'es', 'accept-language': 'es', addressdetails: '1' });
  const response = await fetch(url, {
    headers: { 'User-Agent': 'AuiPark/2.0 (proyecto educativo ASIX; contacto: admin@auipark.com)' },
    signal: AbortSignal.timeout(8000),
  }).catch(() => null);
  if (!response || !response.ok) throw new HttpError(502, 'El buscador de direcciones no responde. Inténtalo más tarde.');

  const data = await response.json();
  const results = data.map((r) => ({
    name: r.name || r.display_name.split(',')[0],
    formatted: r.display_name,
    lat: Number(r.lat),
    lon: Number(r.lon),
    city: r.address?.city || r.address?.town || r.address?.village || '',
  }));
  if (cache.size > 500) cache.clear();
  cache.set(q, results);
  return results;
}
