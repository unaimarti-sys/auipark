/** Error controlado que se devuelve al cliente con su código HTTP */
export class HttpError extends Error {
  constructor(status, message, fields) {
    super(message);
    this.status = status;
    this.fields = fields;
  }
}

/** Envuelve un controlador async para que los errores lleguen al middleware de errores */
export const handle = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

/** Traduce los errores lanzados por las funciones de Postgres (RAISE EXCEPTION) */
export function mapDbError(error) {
  const map = {
    PARKING_NO_EXISTE: [404, 'El parking indicado no existe'],
    SIN_PLAZAS: [409, 'No quedan plazas libres suficientes en este parking'],
    RESERVA_NO_EXISTE: [404, 'No existe ninguna reserva con ese código'],
    RESERVA_NO_CONFIRMADA: [409, 'La reserva ya está finalizada o cancelada'],
    ESTADO_NO_VALIDO: [422, 'Estado no válido'],
  };
  const hit = map[error?.message];
  return hit ? new HttpError(hit[0], hit[1]) : error;
}
