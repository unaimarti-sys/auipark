export const CAR_TYPES = [
  { value: 'turismo', label: 'Turismo' },
  { value: 'suv_4x4', label: 'SUV / 4x4' },
  { value: 'monovolumen', label: 'Monovolumen' },
  { value: 'furgoneta', label: 'Furgoneta' },
  { value: 'deportivo', label: 'Deportivo' },
  { value: 'electrico', label: 'Eléctrico' },
  { value: 'moto', label: 'Motocicleta' },
  { value: 'otro', label: 'Otro' },
];

export const STATUS_LABELS = {
  confirmed: 'Confirmada',
  cancelled: 'Cancelada',
  completed: 'Finalizada',
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^(\+34)?[6-9]\d{8}$/;
const PLATE_REGEX = /^(\d{4}[A-Z]{3}|[A-Z]{1,2}\d{3,4}[A-Z]{0,2}|\d{4}[A-Z])$/;

export function normalizePlate(value = '') {
  return String(value).toUpperCase().replace(/[\s-]/g, '');
}

function pad(n) {
  return String(n).padStart(2, '0');
}

export function toDateTimeLocal(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function roundUpFifteen(date) {
  const d = new Date(date);
  d.setSeconds(0, 0);
  const minutes = d.getMinutes();
  d.setMinutes(minutes % 15 === 0 ? minutes : minutes + (15 - (minutes % 15)));
  return d;
}

export function createInitialForm() {
  const entry = roundUpFifteen(Date.now() + 15 * 60 * 1000);
  const exit = new Date(entry.getTime() + 3 * 3600 * 1000);
  return {
    carType: 'turismo',
    plate: '',
    brand: '',
    model: '',
    color: '',
    holderName: '',
    email: '',
    phone: '',
    entryAt: toDateTimeLocal(entry),
    exitAt: toDateTimeLocal(exit),
    spots: 1,
    notes: '',
    acceptTerms: false,
  };
}

export function validateForm(form) {
  const errors = {};
  if (!form.holderName || form.holderName.trim().length < 3) {
    errors.holderName = 'Indica el nombre completo del titular';
  }
  if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'El email no es válido';
  if (!PHONE_REGEX.test(form.phone.replace(/[\s-]/g, ''))) {
    errors.phone = 'Introduce un móvil español válido (ej. 612 345 678)';
  }
  if (!CAR_TYPES.some((t) => t.value === form.carType)) errors.carType = 'Selecciona un tipo de vehículo';
  if (!PLATE_REGEX.test(normalizePlate(form.plate))) {
    errors.plate = 'Formato de matrícula no válido (ej. 1234BCD)';
  }

  const entryAt = new Date(form.entryAt);
  const exitAt = new Date(form.exitAt);
  if (Number.isNaN(entryAt.getTime())) errors.entryAt = 'Fecha no válida';
  if (Number.isNaN(exitAt.getTime())) errors.exitAt = 'Fecha no válida';
  if (!errors.entryAt && !errors.exitAt) {
    if (exitAt <= entryAt) errors.exitAt = 'La salida debe ser posterior a la entrada';
    else if (entryAt.getTime() < Date.now() - 60 * 60 * 1000) errors.entryAt = 'La entrada no puede estar en el pasado';
    else if (exitAt - entryAt > 30 * 24 * 3600 * 1000) errors.exitAt = 'Máximo 30 días por reserva';
  }

  const spots = Number(form.spots);
  if (!Number.isInteger(spots) || spots < 1 || spots > 5) errors.spots = 'Entre 1 y 5 plazas';
  if (form.notes.length > 500) errors.notes = 'Máximo 500 caracteres';
  if (!form.acceptTerms) errors.acceptTerms = 'Debes aceptar las condiciones';
  return errors;
}

export function bookingHours(form) {
  const entryAt = new Date(form.entryAt);
  const exitAt = new Date(form.exitAt);
  if (Number.isNaN(entryAt.getTime()) || Number.isNaN(exitAt.getTime()) || exitAt <= entryAt) return 0;
  return Math.max(1, Math.ceil((exitAt - entryAt) / 3600000));
}

export function totalPrice(form, pricePerHour) {
  const hours = bookingHours(form);
  if (!hours || !pricePerHour) return 0;
  return Number((hours * Number(pricePerHour) * Number(form.spots || 1)).toFixed(2));
}

export function toPayload(form, parkingId) {
  return {
    parkingId,
    holder: {
      name: form.holderName.trim(),
      email: form.email.trim(),
      phone: form.phone.replace(/[\s-]/g, ''),
    },
    vehicle: {
      type: form.carType,
      plate: normalizePlate(form.plate),
      brand: form.brand.trim(),
      model: form.model.trim(),
      color: form.color.trim(),
    },
    entryAt: new Date(form.entryAt).toISOString(),
    exitAt: new Date(form.exitAt).toISOString(),
    spots: Number(form.spots),
    notes: form.notes.trim(),
    acceptTerms: form.acceptTerms,
  };
}

export function formatDateTime(msOrDate) {
  const date = new Date(msOrDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatDate(msOrDate) {
  const date = new Date(msOrDate);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('es-ES', { day: '2-digit', month: 'long', year: 'numeric' });
}
