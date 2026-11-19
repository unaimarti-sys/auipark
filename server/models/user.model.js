import { query } from '../db.js';

export const ROLES = ['cliente', 'empleado', 'admin'];

const SELECT = `select u.*, p.nombre as parking_nombre,
  (select count(*) from reservas r where r.usuario_id = u.id) as total_reservas
  from profiles u left join parkings p on p.id = u.parking_id`;

export async function findById(id) {
  const { rows } = await query(`${SELECT} where u.id = $1`, [id]);
  return rows[0] || null;
}

export async function all({ q, role } = {}) {
  const where = [];
  const params = [];
  if (q) {
    params.push(`%${q}%`);
    where.push(`(u.nombre ilike $${params.length} or u.email ilike $${params.length})`);
  }
  if (role && ROLES.includes(role)) {
    params.push(role);
    where.push(`u.rol = $${params.length}`);
  }
  const { rows } = await query(`${SELECT} ${where.length ? 'where ' + where.join(' and ') : ''} order by u.creado_en desc`, params);
  return rows.map(toDto);
}

export async function updateProfile(id, { nombre, telefono }) {
  await query('update profiles set nombre = $1, telefono = $2 where id = $3', [nombre, telefono || null, id]);
}

export async function updateAdmin(id, { rol, activo, parkingId }) {
  const current = await findById(id);
  const nextRol = rol ?? current.rol;
  // Solo los empleados tienen parking asignado
  const nextParking = nextRol === 'empleado' ? (parkingId !== undefined ? parkingId : current.parking_id) : null;
  await query('update profiles set rol = $1, activo = $2, parking_id = $3 where id = $4', [
    nextRol,
    activo ?? current.activo,
    nextParking,
    id,
  ]);
  return findById(id);
}

/** Datos públicos del usuario */
export function toDto(u) {
  return {
    id: u.id,
    name: u.nombre,
    email: u.email,
    phone: u.telefono || '',
    role: u.rol,
    active: u.activo,
    parkingId: u.parking_id,
    parkingName: u.parking_nombre || null,
    createdAt: u.creado_en,
    reservations: u.total_reservas ?? 0,
  };
}
