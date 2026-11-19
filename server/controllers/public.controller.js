import { query } from '../db.js';
import { HttpError } from '../errors.js';
import * as Parkings from '../models/parking.model.js';
import * as Reservations from '../models/reservation.model.js';
import * as Nominatim from '../services/nominatim.js';
import * as Geoapify from '../services/geoapify.js';

/** GET /api/health — estado de la API y de la base de datos (lo consultan Zabbix y Apache) */
export async function health(_req, res) {
  try {
    await query('select 1');
    res.json({ status: 'ok', service: 'auipark-api', database: 'ok', time: new Date().toISOString() });
  } catch {
    res.status(503).json({ status: 'error', service: 'auipark-api', database: 'down', time: new Date().toISOString() });
  }
}

function parseBbox(value) {
  if (!value) return null;
  const parts = String(value).split(',').map(Number);
  return parts.length === 4 && parts.every(Number.isFinite) ? parts : null;
}

/** GET /api/parkings?lat&lon&radius | ?bbox=w,s,e,n &type &maxPrice &service &sort=rating &limit */
export async function listParkings(req, res) {
  const q = req.query;
  const results = await Parkings.search({
    bbox: parseBbox(q.bbox),
    lat: q.lat !== undefined ? Number(q.lat) : null,
    lon: q.lon !== undefined ? Number(q.lon) : null,
    radius: Number(q.radius) || 5000,
    type: q.type,
    maxPrice: q.maxPrice,
    service: q.service,
    sort: q.sort,
    limit: q.limit,
  });
  res.json({ results, count: results.length });
}

export async function showParking(req, res) {
  const parking = await Parkings.find(req.params.id);
  if (!parking) throw new HttpError(404, 'Parking no encontrado');
  res.json({ parking });
}

/** GET /api/parkings/:id/quote?entryAt&exitAt&spots — precio calculado en el servidor */
export async function quote(req, res) {
  const parking = await Parkings.find(req.params.id);
  if (!parking) throw new HttpError(404, 'Parking no encontrado');
  const entry = new Date(req.query.entryAt);
  const exit = new Date(req.query.exitAt);
  const spots = Math.min(5, Math.max(1, Number(req.query.spots) || 1));
  if (Number.isNaN(entry.getTime()) || Number.isNaN(exit.getTime()) || exit <= entry) throw new HttpError(422, 'Horario no válido');
  const { hours, total } = Reservations.calculate(entry, exit, parking.pricePerHour, spots);
  res.json({ hours, spots, pricePerHour: parking.pricePerHour, total });
}

export async function services(_req, res) {
  res.json({ results: await Parkings.services() });
}

/** GET /api/geo/search?q= — buscador de direcciones (OpenStreetMap / Nominatim) */
export async function geoSearch(req, res) {
  const q = String(req.query.q || '').trim();
  if (q.length < 3) throw new HttpError(400, 'Escribe al menos 3 caracteres');
  // Geoapify como buscador principal; si falla, Nominatim (OpenStreetMap)
  const results = await Geoapify.geocode(q).catch(() => Nominatim.search(q));
  res.json({ results });
}
