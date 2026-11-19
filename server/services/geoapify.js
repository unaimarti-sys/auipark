import { HttpError } from '../errors.js';
import { config } from '../config.js';

/**
 * Geoapify (datos de OpenStreetMap): geocodificación de ciudades y búsqueda de parkings reales.
 * La API key solo se usa en el servidor (no llega al navegador).
 */
const BASE = 'https://api.geoapify.com';

async function call(path, params) {
  if (!config.geoapifyKey) throw new HttpError(503, 'Falta la API key de Geoapify en el servidor');
  const url = new URL(path, BASE);
  url.search = new URLSearchParams({ ...params, apiKey: config.geoapifyKey });
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) }).catch(() => null);
  if (!res || !res.ok) throw new HttpError(502, 'Geoapify no responde. Inténtalo más tarde.');
  return res.json();
}

/** Coordenadas de una ciudad o dirección (España) */
export async function geocode(text) {
  const data = await call('/v1/geocode/search', { text, filter: 'countrycode:es', lang: 'es', limit: '6', format: 'json' });
  return (data.results || []).map((r) => ({
    name: r.name || r.address_line1 || r.formatted,
    formatted: r.formatted,
    lat: r.lat,
    lon: r.lon,
    city: r.city || r.town || r.village || '',
  }));
}

/** Parkings reales alrededor de un punto (radio en metros) */
export async function parkingsNear(lat, lon, radius = 3000, limit = 30) {
  const data = await call('/v2/places', {
    categories: 'parking.cars',
    filter: `circle:${lon},${lat},${radius}`,
    bias: `proximity:${lon},${lat}`,
    limit: String(limit),
    lang: 'es',
  });
  return (data.features || [])
    .map((f) => f.properties)
    .filter((p) => p && p.lat && p.lon)
    .map((p) => {
      const raw = p.datasource?.raw || {};
      const tipo = raw.parking === 'underground' ? 'subterraneo'
        : raw.parking === 'multi-storey' ? 'multinivel'
        : raw.parking === 'rooftop' ? 'azotea' : 'superficie';
      const capacidad = Math.min(Math.max(parseInt(raw.capacity, 10) || 80, 10), 2000);
      return {
        nombre: (p.name || `Parking ${p.street || p.city || ''}`).trim().slice(0, 150),
        direccion: [p.street, p.housenumber].filter(Boolean).join(' ') || p.address_line2 || '',
        ciudad: p.city || p.town || '',
        lat: Number(p.lat.toFixed(6)),
        lon: Number(p.lon.toFixed(6)),
        tipo,
        capacidad,
        abierto_24h: raw.opening_hours === '24/7',
        horario: raw.opening_hours === '24/7' ? '00:00-24:00' : '07:00-23:00',
      };
    });
}
