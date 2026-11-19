import { query } from '../db.js';
import { HttpError } from '../errors.js';
import { supabaseAdmin } from '../middlewares/auth.js';
import { config } from '../config.js';
import * as Parkings from '../models/parking.model.js';
import * as Reservations from '../models/reservation.model.js';
import * as Users from '../models/user.model.js';

/** GET /api/admin/stats */
export async function stats(_req, res) {
  const { rows } = await query('select estadisticas() as s');
  const s = rows[0].s;
  // Estados con los códigos que usa el frontend
  const reservations = {};
  for (const [api, db] of Object.entries(Reservations.STATUS)) {
    reservations[api] = { count: Number(s.reservations[db] || 0) };
  }
  res.json({
    ...s,
    reservations,
    occupancy: s.capacity > 0 ? Math.round((1 - s.available / s.capacity) * 1000) / 10 : 0,
  });
}

/* ---------------- Parkings ---------------- */

export async function parkings(req, res) {
  res.json({ results: await Parkings.all(req.query.q) });
}

function validateParking(d) {
  const errors = {};
  const name = String(d.name || '').trim();
  if (name.length < 3) errors.name = 'Nombre obligatorio';
  if (!Parkings.TYPES[d.type]) errors.type = 'Tipo no válido';
  const lat = Number(d.lat);
  const lon = Number(d.lon);
  if (!Number.isFinite(lat) || lat < -90 || lat > 90) errors.lat = 'Latitud no válida';
  if (!Number.isFinite(lon) || lon < -180 || lon > 180) errors.lon = 'Longitud no válida';
  const price = Number(d.pricePerHour);
  if (!Number.isFinite(price) || price <= 0 || price > 100) errors.pricePerHour = 'Precio entre 0,01 y 100 €';
  const capacity = Number(d.capacity);
  if (!Number.isInteger(capacity) || capacity < 1 || capacity > 5000) errors.capacity = 'Capacidad entre 1 y 5000';
  const available = d.available === undefined || d.available === '' ? capacity : Number(d.available);
  if (!Number.isInteger(available) || available < 0 || available > capacity) errors.available = 'No puede superar la capacidad';
  if (Object.keys(errors).length) throw new HttpError(422, 'Revisa los datos del parking', errors);
  return {
    name,
    address: String(d.address || '').trim(),
    city: String(d.city || '').trim(),
    lat,
    lon,
    type: d.type,
    pricePerHour: Math.round(price * 100) / 100,
    capacity,
    available,
    rating: Number(d.rating ?? 4.0),
    reviews: Number(d.reviews ?? 0),
    services: Array.isArray(d.services) ? d.services.filter((s) => typeof s === 'string') : [],
    open24: Boolean(d.open24),
    openingHours: String(d.openingHours || '').trim() || (d.open24 ? '24/7' : '07:00-23:00'),
    active: d.active === undefined ? true : Boolean(d.active),
  };
}

export async function createParking(req, res) {
  const id = await Parkings.save(validateParking(req.body));
  res.status(201).json({ parking: await Parkings.find(id, { onlyActive: false }) });
}

export async function updateParking(req, res) {
  const current = await Parkings.find(req.params.id, { onlyActive: false });
  if (!current) throw new HttpError(404, 'Parking no encontrado');
  await Parkings.save(validateParking({ ...current, ...req.body }), current.id);
  res.json({ parking: await Parkings.find(current.id, { onlyActive: false }) });
}

export async function deleteParking(req, res) {
  if (!(await Parkings.find(req.params.id, { onlyActive: false }))) throw new HttpError(404, 'Parking no encontrado');
  res.json({ result: await Parkings.deactivateOrDelete(Number(req.params.id)) });
}

/* ---------------- Servicios ---------------- */

export async function createService(req, res) {
  const name = String(req.body.name || '').trim();
  const key = String(req.body.key || name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '');
  if (name.length < 3 || !key) throw new HttpError(422, 'Nombre del servicio obligatorio', { name: 'Mínimo 3 caracteres' });
  try {
    res.status(201).json({ service: await Parkings.createService(key, name) });
  } catch (error) {
    if (error.code === '23505') throw new HttpError(409, 'Ya existe un servicio con ese nombre');
    throw error;
  }
}

export async function deleteService(req, res) {
  if (!(await Parkings.deleteService(Number(req.params.id)))) throw new HttpError(404, 'Servicio no encontrado');
  res.json({ ok: true });
}

/* ---------------- Usuarios y roles ---------------- */

export async function users(req, res) {
  res.json({ results: await Users.all({ q: req.query.q, role: req.query.role }) });
}

/** PATCH /api/admin/users/:id {role?, active?, parkingId?} */
export async function updateUser(req, res) {
  const target = await Users.findById(req.params.id);
  if (!target) throw new HttpError(404, 'Usuario no encontrado');
  const { role, active, parkingId } = req.body;
  if (role !== undefined && !Users.ROLES.includes(role)) throw new HttpError(422, 'Rol no válido');
  if (target.id === req.user.id && ((role !== undefined && role !== 'admin') || active === false)) {
    throw new HttpError(409, 'No puedes quitarte el rol de administrador ni desactivar tu propia cuenta');
  }
  const nextRole = role ?? target.rol;
  let nextParking = parkingId === undefined ? undefined : parkingId === null || parkingId === '' ? null : Number(parkingId);
  if (nextRole === 'empleado' && nextParking && !(await Parkings.find(nextParking, { onlyActive: false }))) {
    throw new HttpError(422, 'El parking indicado no existe');
  }
  const updated = await Users.updateAdmin(target.id, { rol: role, activo: active, parkingId: nextParking });

  // Una cuenta desactivada tampoco puede iniciar sesión en Supabase Auth
  if (active !== undefined && config.nodeEnv !== 'test') {
    await supabaseAdmin().auth.admin.updateUserById(target.id, { ban_duration: active ? 'none' : '876000h' });
  }
  res.json({ user: Users.toDto(updated) });
}

/* ---------------- Reservas ---------------- */

export async function reservations(req, res) {
  const results = await Reservations.search({
    status: req.query.status,
    parkingId: req.query.parkingId,
    date: req.query.date,
    q: req.query.q,
  });
  res.json({ results, count: results.length });
}

/** PATCH /api/admin/reservations/:code/status {status: completed|cancelled} */
export async function updateReservationStatus(req, res) {
  const { status } = req.body;
  if (!['completed', 'cancelled'].includes(status)) throw new HttpError(422, 'Estado no válido');
  res.json({ reservation: await Reservations.changeStatus(req.params.code, status) });
}
