import { query } from '../db.js';
import { HttpError, mapDbError } from '../errors.js';

export const CAR_TYPES = ['turismo', 'suv_4x4', 'monovolumen', 'furgoneta', 'deportivo', 'electrico', 'moto', 'otro'];
/** Estados: código de la API <-> valor en la base de datos */
export const STATUS = { confirmed: 'confirmada', completed: 'finalizada', cancelled: 'cancelada' };
const STATUS_FROM_DB = Object.fromEntries(Object.entries(STATUS).map(([k, v]) => [v, k]));

const PLATE = /^(\d{4}[A-Z]{3}|[A-Z]{1,2}\d{3,4}[A-Z]{0,2}|\d{4}[A-Z])$/;
const PHONE = /^(\+34)?[6-9]\d{8}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;

export const normalizePlate = (v = '') => String(v).toUpperCase().replace(/[\s-]/g, '');
export const normalizePhone = (v = '') => String(v).replace(/[\s-]/g, '');
export const isPhone = (v) => PHONE.test(normalizePhone(v));

/** Precio = horas (redondeadas hacia arriba, mínimo 1) × precio/hora × plazas */
export function calculate(entry, exit, pricePerHour, spots) {
  const hours = Math.max(1, Math.ceil((exit - entry) / 3600000));
  return { hours, total: Math.round(hours * pricePerHour * spots * 100) / 100 };
}

/** Misma validación que el formulario del frontend (nunca nos fiamos del navegador) */
export function validate(input) {
  const errors = {};
  const holder = input.holder || {};
  const vehicle = input.vehicle || {};
  if (!holder.name || String(holder.name).trim().length < 3) errors['holder.name'] = 'Indica el nombre completo del titular';
  if (!EMAIL.test(String(holder.email || '').trim())) errors['holder.email'] = 'El email no es válido';
  if (!isPhone(holder.phone)) errors['holder.phone'] = 'El teléfono móvil español no es válido';
  if (!CAR_TYPES.includes(vehicle.type)) errors['vehicle.type'] = 'Selecciona un tipo de vehículo';
  const plate = normalizePlate(vehicle.plate);
  if (!PLATE.test(plate)) errors['vehicle.plate'] = 'La matrícula no tiene un formato válido (ej. 1234BCD)';

  const entry = new Date(input.entryAt);
  const exit = new Date(input.exitAt);
  if (Number.isNaN(entry.getTime())) errors.entryAt = 'Fecha y hora de entrada no válidas';
  if (Number.isNaN(exit.getTime())) errors.exitAt = 'Fecha y hora de salida no válidas';
  if (!errors.entryAt && !errors.exitAt) {
    if (exit <= entry) errors.exitAt = 'La salida debe ser posterior a la entrada';
    else if (entry.getTime() < Date.now() - 3600000) errors.entryAt = 'La entrada no puede ser en el pasado';
    else if (exit - entry > 30 * 86400000) errors.exitAt = 'La reserva no puede superar los 30 días';
  }
  const spots = Number(input.spots);
  if (!Number.isInteger(spots) || spots < 1 || spots > 5) errors.spots = 'Entre 1 y 5 plazas';
  if (input.notes && String(input.notes).length > 500) errors.notes = 'Máximo 500 caracteres';
  if (input.acceptTerms !== true) errors.acceptTerms = 'Debes aceptar las condiciones';
  if (Object.keys(errors).length) throw new HttpError(422, 'Revisa los datos del formulario', errors);

  return {
    holder: { name: String(holder.name).trim(), email: String(holder.email).trim().toLowerCase(), phone: normalizePhone(holder.phone) },
    vehicle: {
      type: vehicle.type,
      plate,
      brand: String(vehicle.brand || '').trim().slice(0, 50),
      model: String(vehicle.model || '').trim().slice(0, 50),
      color: String(vehicle.color || '').trim().slice(0, 30),
    },
    entry,
    exit,
    spots,
    notes: String(input.notes || '').trim(),
  };
}

/** Crea la reserva llamando a la función de Postgres (transacción con bloqueo de fila) */
export async function create(userId, parkingId, input) {
  const d = validate(input);
  try {
    const { rows } = await query(
      'select crear_reserva($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) as id',
      [userId, Number(parkingId), d.vehicle.plate, d.vehicle.type, d.vehicle.brand, d.vehicle.model, d.vehicle.color,
        d.holder.name, d.holder.email, d.holder.phone, d.entry, d.exit, d.spots, d.notes]
    );
    return findBy('r.id = $1', [rows[0].id]);
  } catch (error) {
    throw mapDbError(error);
  }
}

export async function changeStatus(code, status) {
  try {
    await query('select cambiar_estado_reserva($1, $2)', [code, STATUS[status]]);
  } catch (error) {
    throw mapDbError(error);
  }
  return findByCode(code);
}

const SELECT = `select r.*, p.nombre as parking_nombre, p.direccion as parking_direccion, p.ciudad as parking_ciudad,
  v.matricula, v.tipo as vehiculo_tipo, v.marca, v.modelo, v.color, u.email as usuario_email
  from reservas r
  join parkings p on p.id = r.parking_id
  join vehiculos v on v.id = r.vehiculo_id
  join profiles u on u.id = r.usuario_id`;

async function findBy(where, params) {
  const { rows } = await query(`${SELECT} where ${where}`, params);
  return rows[0] ? toDto(rows[0]) : null;
}

export const findByCode = (code) => findBy('r.codigo = $1', [String(code).toUpperCase().trim()]);

export async function byUser(userId) {
  const { rows } = await query(`${SELECT} where r.usuario_id = $1 order by r.entrada desc`, [userId]);
  return rows.map(toDto);
}

/** Listado con filtros: admin (todas) o empleado (solo su parking) */
export async function search(f = {}) {
  const where = ['true'];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replaceAll('?', `$${params.length}`));
  };
  if (f.parkingId) add('r.parking_id = ?', Number(f.parkingId));
  if (f.status && STATUS[f.status]) add('r.estado = ?', STATUS[f.status]);
  if (f.date) add('r.entrada::date <= ?::date and r.salida::date >= ?::date', f.date);
  if (f.q) add('(r.codigo ilike ? or v.matricula ilike ? or r.titular_nombre ilike ? or r.titular_email ilike ?)', `%${f.q}%`);
  const { rows } = await query(`${SELECT} where ${where.join(' and ')} order by r.entrada desc limit 300`, params);
  return rows.map(toDto);
}

export async function vehiclesOf(userId) {
  const { rows } = await query(
    'select id, matricula as plate, tipo as type, marca as brand, modelo as model, color from vehiculos where usuario_id = $1 order by creado_en desc',
    [userId]
  );
  return rows;
}

export function toDto(r) {
  return {
    id: r.id,
    code: r.codigo,
    status: STATUS_FROM_DB[r.estado],
    userId: r.usuario_id,
    userEmail: r.usuario_email,
    parkingId: r.parking_id,
    parkingName: r.parking_nombre,
    parkingAddress: r.parking_direccion,
    parkingCity: r.parking_ciudad,
    vehicle: { id: r.vehiculo_id, type: r.vehiculo_tipo, plate: r.matricula, brand: r.marca, model: r.modelo, color: r.color },
    holder: { name: r.titular_nombre, email: r.titular_email, phone: r.titular_telefono },
    entryAt: r.entrada,
    exitAt: r.salida,
    hours: r.horas,
    spots: r.plazas,
    pricePerHour: r.precio_hora,
    totalPrice: r.precio_total,
    notes: r.notas,
    createdAt: r.creado_en,
  };
}
