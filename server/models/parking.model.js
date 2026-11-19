import { query, transaction } from '../db.js';

/** Tipos: código de la API (lo usa el frontend) <-> valor en la base de datos */
export const TYPES = { underground: 'subterraneo', multistorey: 'multinivel', rooftop: 'azotea', surface: 'superficie' };
const TYPE_FROM_DB = Object.fromEntries(Object.entries(TYPES).map(([k, v]) => [v, k]));

export function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const rad = (d) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lon2 - lon1) / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(a)));
}

const SELECT = `select p.*,
  coalesce((select array_agg(s.clave order by s.id) from parking_servicio ps join servicios s on s.id = ps.servicio_id
             where ps.parking_id = p.id), '{}') as servicios,
  (select string_agg(u.nombre, ', ') from profiles u where u.parking_id = p.id and u.rol = 'empleado') as empleados
  from parkings p`;

export async function search(f = {}) {
  const where = ['p.activo'];
  const params = [];
  const add = (sql, value) => {
    params.push(value);
    where.push(sql.replace('?', `$${params.length}`));
  };
  let area = f.bbox;
  if (!area && f.lat != null && f.lon != null) {
    const r = f.radius || 5000;
    const dLat = r / 111320;
    const dLon = r / (111320 * Math.cos((f.lat * Math.PI) / 180));
    area = [f.lon - dLon, f.lat - dLat, f.lon + dLon, f.lat + dLat];
  }
  if (area) {
    add('p.lon >= ?', area[0]);
    add('p.lat >= ?', area[1]);
    add('p.lon <= ?', area[2]);
    add('p.lat <= ?', area[3]);
  }
  if (f.type && TYPES[f.type]) add('p.tipo = ?', TYPES[f.type]);
  if (f.maxPrice) add('p.precio_hora <= ?', Number(f.maxPrice));
  if (f.service) {
    add('exists (select 1 from parking_servicio ps join servicios s on s.id = ps.servicio_id where ps.parking_id = p.id and s.clave = ?)', f.service);
  }
  const limit = Math.min(Math.max(Number(f.limit) || 200, 1), 500);
  const order = f.sort === 'rating' ? 'p.valoracion desc, p.resenas desc' : 'p.id';
  const { rows } = await query(`${SELECT} where ${where.join(' and ')} order by ${order} limit ${limit}`, params);
  const list = rows.map(toDto);
  if (f.lat != null && f.lon != null) {
    list.forEach((p) => (p.distance = haversine(f.lat, f.lon, p.lat, p.lon)));
    if (f.sort !== 'rating') list.sort((a, b) => a.distance - b.distance);
  }
  return list;
}

export async function find(id, { onlyActive = true } = {}) {
  if (!Number.isInteger(Number(id))) return null;
  const { rows } = await query(`${SELECT} where p.id = $1 ${onlyActive ? 'and p.activo' : ''}`, [Number(id)]);
  return rows[0] ? toDto(rows[0]) : null;
}

export async function all(q) {
  const params = q ? [`%${q}%`] : [];
  const { rows } = await query(
    `${SELECT} ${q ? 'where p.nombre ilike $1 or p.ciudad ilike $1 or p.direccion ilike $1' : ''} order by p.ciudad, p.nombre`,
    params
  );
  return rows.map(toDto);
}

export async function save(d, id = null) {
  return transaction(async (c) => {
    const values = [d.name, d.address, d.city, d.lat, d.lon, TYPES[d.type], d.pricePerHour, d.capacity, d.available,
      d.rating, d.reviews, d.open24, d.openingHours, d.active];
    let parkingId = id;
    if (id) {
      await c.query(`update parkings set nombre=$1, direccion=$2, ciudad=$3, lat=$4, lon=$5, tipo=$6, precio_hora=$7,
        capacidad=$8, disponibles=$9, valoracion=$10, resenas=$11, abierto_24h=$12, horario=$13, activo=$14,
        actualizado_en=now() where id=$15`, [...values, id]);
    } else {
      const { rows } = await c.query(`insert into parkings (nombre, direccion, ciudad, lat, lon, tipo, precio_hora,
        capacidad, disponibles, valoracion, resenas, abierto_24h, horario, activo)
        values ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) returning id`, values);
      parkingId = rows[0].id;
    }
    await c.query('delete from parking_servicio where parking_id = $1', [parkingId]);
    if (d.services.length) {
      await c.query(`insert into parking_servicio (parking_id, servicio_id)
        select $1, id from servicios where clave = any($2::text[])`, [parkingId, d.services]);
    }
    return parkingId;
  });
}

/** Si tiene reservas no se puede borrar (integridad referencial): se desactiva */
export async function deactivateOrDelete(id) {
  const { rows } = await query('select count(*)::int n from reservas where parking_id = $1', [id]);
  if (rows[0].n > 0) {
    await query('update parkings set activo = false, actualizado_en = now() where id = $1', [id]);
    return 'deactivated';
  }
  await query('delete from parkings where id = $1', [id]);
  return 'deleted';
}

export function toDto(p) {
  return {
    id: p.id,
    name: p.nombre,
    address: p.direccion,
    city: p.ciudad,
    lat: p.lat,
    lon: p.lon,
    type: TYPE_FROM_DB[p.tipo] || 'surface',
    pricePerHour: p.precio_hora,
    capacity: p.capacidad,
    available: p.disponibles,
    rating: p.valoracion,
    reviews: p.resenas,
    services: p.servicios || [],
    open24: p.abierto_24h,
    openingHours: p.horario,
    active: p.activo,
    employees: p.empleados || null,
  };
}

/* ---------------- Servicios (catálogo) ---------------- */

export async function services() {
  const { rows } = await query(`select s.id, s.clave as key, s.nombre as name,
    (select count(*)::int from parking_servicio ps where ps.servicio_id = s.id) as parkings
    from servicios s order by s.id`);
  return rows;
}

export async function createService(key, name) {
  const { rows } = await query('insert into servicios (clave, nombre) values ($1, $2) returning id, clave as key, nombre as name', [key, name]);
  return rows[0];
}

export async function deleteService(id) {
  const { rowCount } = await query('delete from servicios where id = $1', [id]);
  return rowCount > 0;
}
