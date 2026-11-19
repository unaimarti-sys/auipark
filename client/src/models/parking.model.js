export const PARKING_TYPE_LABELS = {
  underground: 'Sótano',
  multistorey: 'Multinivel',
  rooftop: 'Azotea',
  surface: 'Aire libre',
};

export const SERVICE_LABELS = {
  covered: 'Cubierto',
  security: 'Videovigilancia',
  ev_charging: 'Recarga eléctrica',
  disabled_access: 'Acceso PMR',
  washing: 'Lavado',
  lift: 'Ascensor',
  card_access: 'Acceso con tarjeta',
  'pet-friendly': 'Admite mascotas',
};

export const SERVICE_KEYS = Object.keys(SERVICE_LABELS);

export function formatPrice(value) {
  const n = Number(value || 0);
  return `${n.toFixed(2).replace('.', ',')} €`;
}

export function formatDistance(meters) {
  if (meters == null) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(1).replace('.', ',')} km`;
}

export function availabilityPercent(parking) {
  if (!parking?.capacity) return 100;
  return Math.max(0, Math.min(100, Math.round(((parking.available ?? 0) / parking.capacity) * 100)));
}

export function availabilityLabel(parking) {
  const pct = availabilityPercent(parking);
  if (pct <= 0) return 'Completo';
  if (pct < 20) return 'Últimas plazas';
  if (pct < 60) return 'Plazas disponibles';
  return 'Muchas plazas';
}

export function filterParkings(parkings, filters = {}) {
  return parkings.filter((p) => {
    if (filters.type && filters.type !== 'all' && p.type !== filters.type) return false;
    if (filters.maxPrice && p.pricePerHour != null && p.pricePerHour > Number(filters.maxPrice)) return false;
    if (filters.service && filters.service !== 'all' && !(p.services || []).includes(filters.service)) return false;
    if (filters.onlyAvailable && (p.available ?? 1) <= 0) return false;
    if (filters.query) {
      const q = filters.query.toLowerCase();
      const haystack = `${p.name} ${p.address} ${p.city}`.toLowerCase();
      if (!haystack.includes(q)) return false;
    }
    return true;
  });
}
