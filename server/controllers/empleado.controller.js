import { HttpError } from '../errors.js';
import * as Parkings from '../models/parking.model.js';
import * as Reservations from '../models/reservation.model.js';

/** El empleado trabaja en UN parking (asignado por el administrador) */
function parkingOf(user) {
  if (!user.parking_id) throw new HttpError(409, 'No tienes ningún parking asignado. Pide al administrador que te asigne uno.');
  return user.parking_id;
}

/** GET /api/empleado/parking */
export async function myParking(req, res) {
  const parking = await Parkings.find(parkingOf(req.user), { onlyActive: false });
  res.json({ parking });
}

/** GET /api/empleado/reservations?status&date&q — solo las de su parking */
export async function reservations(req, res) {
  const results = await Reservations.search({
    parkingId: parkingOf(req.user),
    status: req.query.status,
    date: req.query.date,
    q: req.query.q,
  });
  res.json({ results, count: results.length });
}

/** PATCH /api/empleado/reservations/:code/salida — registra la salida del coche y libera las plazas */
export async function registerExit(req, res) {
  const reservation = await Reservations.findByCode(req.params.code);
  if (!reservation || reservation.parkingId !== parkingOf(req.user)) throw new HttpError(404, 'Reserva no encontrada');
  res.json({ reservation: await Reservations.changeStatus(req.params.code, 'completed') });
}
