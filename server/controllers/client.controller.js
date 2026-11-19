import { HttpError } from '../errors.js';
import * as Users from '../models/user.model.js';
import * as Reservations from '../models/reservation.model.js';

/** GET /api/me — perfil y rol del usuario de la sesión */
export async function me(req, res) {
  res.json({ user: req.user ? Users.toDto(req.user) : null });
}

/** PATCH /api/me — nombre y teléfono */
export async function updateMe(req, res) {
  const name = String(req.body.name ?? req.user.nombre).trim();
  const phone = Reservations.normalizePhone(req.body.phone ?? req.user.telefono ?? '');
  const errors = {};
  if (name.length < 3) errors.name = 'Indica tu nombre y apellidos';
  if (phone && !Reservations.isPhone(phone)) errors.phone = 'El teléfono móvil no es válido';
  if (Object.keys(errors).length) throw new HttpError(422, 'Revisa los datos', errors);
  await Users.updateProfile(req.user.id, { nombre: name, telefono: phone });
  res.json({ user: Users.toDto(await Users.findById(req.user.id)) });
}

/** POST /api/reservations */
export async function createReservation(req, res) {
  const reservation = await Reservations.create(req.user.id, req.body.parkingId, req.body);
  res.status(201).json({ reservation });
}

export async function myReservations(req, res) {
  const results = await Reservations.byUser(req.user.id);
  res.json({ results, count: results.length });
}

export async function myVehicles(req, res) {
  res.json({ results: await Reservations.vehiclesOf(req.user.id) });
}

function canSee(user, reservation) {
  if (user.rol === 'admin' || reservation.userId === user.id) return true;
  return user.rol === 'empleado' && user.parking_id === reservation.parkingId;
}

/** GET /api/reservations/code/:code — propietario, empleado de ese parking o admin */
export async function showReservation(req, res) {
  const reservation = await Reservations.findByCode(req.params.code);
  if (!reservation || !canSee(req.user, reservation)) throw new HttpError(404, 'Reserva no encontrada');
  res.json({ reservation });
}

/** PATCH /api/reservations/:code/cancel — el cliente cancela gratis hasta 1 h antes de la entrada */
export async function cancelReservation(req, res) {
  const reservation = await Reservations.findByCode(req.params.code);
  if (!reservation || reservation.userId !== req.user.id) throw new HttpError(404, 'Reserva no encontrada');
  if (new Date(reservation.entryAt).getTime() - Date.now() < 3600000) {
    throw new HttpError(409, 'Solo se puede cancelar hasta 1 hora antes de la entrada');
  }
  res.json({ reservation: await Reservations.changeStatus(req.params.code, 'cancelled') });
}
