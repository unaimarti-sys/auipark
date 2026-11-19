import { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  MapPin,
  Car,
  User,
  CalendarClock,
  ShieldCheck,
  Ticket,
} from 'lucide-react';
import Spinner from '../components/ui/Spinner.jsx';
import { RatingStars } from '../components/ui/ParkingCard.jsx';
import useReservationController from '../controllers/useReservationController.js';
import { useAuth } from '../controllers/AuthContext.jsx';
import {
  CAR_TYPES,
  createInitialForm,
  validateForm,
  toPayload,
  bookingHours,
  totalPrice,
  formatDateTime,
} from '../models/reservation.model.js';
import { PARKING_TYPE_LABELS, SERVICE_LABELS, formatPrice } from '../models/parking.model.js';

const SERVER_TO_FORM_FIELDS = {
  'holder.name': 'holderName',
  'holder.email': 'email',
  'holder.phone': 'phone',
  'vehicle.type': 'carType',
  'vehicle.plate': 'plate',
  entryAt: 'entryAt',
  exitAt: 'exitAt',
  spots: 'spots',
  notes: 'notes',
  acceptTerms: 'acceptTerms',
};

function Field({ label, error, hint, children, className = '' }) {
  return (
    <div className={`field ${error ? 'field--error' : ''} ${className}`}>
      <label>
        {label}
        {children}
      </label>
      {error && <span className="field__error">{error}</span>}
      {!error && hint && <span className="field__hint">{hint}</span>}
    </div>
  );
}

export default function ReservePage() {
  const { parkingId } = useParams();
  const { getParking, getVehicles, createReservation, submitting, submitError, fieldErrors } = useReservationController();
  const { user } = useAuth();
  const [vehicles, setVehicles] = useState([]);

  const [parking, setParking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);
  const [form, setForm] = useState(() => ({
    ...createInitialForm(),
    holderName: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
  }));
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [confirmed, setConfirmed] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getParking(parkingId)
      .then((data) => {
        if (cancelled) return;
        setParking(data);
        setLoadError(null);
      })
      .catch((err) => {
        if (!cancelled) setLoadError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [parkingId, getParking]);

  useEffect(() => {
    getVehicles()
      .then(setVehicles)
      .catch(() => setVehicles([]));
  }, [getVehicles]);

  const pickVehicle = (id) => {
    const v = vehicles.find((item) => String(item.id) === id);
    if (!v) return;
    setForm((current) => ({ ...current, carType: v.type, plate: v.plate, brand: v.brand, model: v.model, color: v.color }));
    setErrors((current) => ({ ...current, plate: undefined, carType: undefined }));
  };

  const mergedErrors = useMemo(() => {
    const mapped = { ...errors };
    Object.entries(fieldErrors || {}).forEach(([serverKey, message]) => {
      const formKey = SERVER_TO_FORM_FIELDS[serverKey];
      if (formKey) mapped[formKey] = message;
    });
    return mapped;
  }, [errors, fieldErrors]);

  const setValue = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    if (touched[key]) {
      const next = validateForm({ ...form, [key]: value });
      setErrors((current) => ({ ...current, [key]: next[key] }));
    }
  };

  const handleBlur = (key) => {
    setTouched((current) => ({ ...current, [key]: true }));
    const next = validateForm(form);
    setErrors((current) => ({ ...current, [key]: next[key] }));
  };

  const hours = bookingHours(form);
  const total = totalPrice(form, parking?.pricePerHour);

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validation = validateForm(form);
    setErrors(validation);
    setTouched({
      holderName: true,
      email: true,
      phone: true,
      plate: true,
      entryAt: true,
      exitAt: true,
      spots: true,
      acceptTerms: true,
    });
    if (Object.keys(validation).length > 0) {
      const firstInvalid = document.querySelector('.field--error');
      firstInvalid?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    try {
      const reservation = await createReservation(toPayload(form, Number(parkingId)));
      setConfirmed(reservation);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch {
      /* los errores quedan en el estado del controller */
    }
  };

  if (loading) {
    return (
      <div className="state-block state-block--page">
        <Spinner label="Cargando parking" />
      </div>
    );
  }

  if (loadError || !parking) {
    return (
      <div className="state-block state-block--page">
        <h2>No encontramos ese parking</h2>
        <p>{loadError || 'Puede que haya dejado de estar disponible.'}</p>
        <Link to="/mapa" className="btn btn--primary">
          Volver al mapa
        </Link>
      </div>
    );
  }

  if (confirmed) {
    return (
      <div className="confirm-page">
        <div className="container container--narrow">
          <div className="confirm-card">
            <span className="confirm-card__icon">
              <CheckCircle2 size={34} />
            </span>
            <h1>¡Reserva confirmada!</h1>
            <p>
              Hemos reservado tu plaza en <strong>{confirmed.parkingName}</strong>. Puedes consultarla
              o cancelarla en cualquier momento desde <strong>Mis reservas</strong>.
            </p>

            <div className="confirm-card__code">
              <Ticket size={18} />
              <span>Código de reserva</span>
              <strong>{confirmed.code}</strong>
            </div>

            <dl className="confirm-card__details">
              <div>
                <dt>
                  <MapPin size={15} /> Parking
                </dt>
                <dd>
                  {confirmed.parkingName}
                  <small>{confirmed.parkingAddress}</small>
                </dd>
              </div>
              <div>
                <dt>
                  <CalendarClock size={15} /> Entrada
                </dt>
                <dd>{formatDateTime(confirmed.entryAt)}</dd>
              </div>
              <div>
                <dt>
                  <Clock size={15} /> Salida
                </dt>
                <dd>{formatDateTime(confirmed.exitAt)}</dd>
              </div>
              <div>
                <dt>
                  <Car size={15} /> Vehículo
                </dt>
                <dd>
                  {confirmed.vehicle.plate}
                  <small>
                    {CAR_TYPES.find((t) => t.value === confirmed.vehicle.type)?.label}
                    {confirmed.vehicle.brand ? ` · ${confirmed.vehicle.brand} ${confirmed.vehicle.model}` : ''}
                  </small>
                </dd>
              </div>
              <div>
                <dt>
                  <User size={15} /> Titular
                </dt>
                <dd>{confirmed.holder.name}</dd>
              </div>
              <div>
                <dt>Total</dt>
                <dd className="confirm-card__total">
                  {formatPrice(confirmed.totalPrice)} <small>({confirmed.hours} h × {confirmed.spots} plaza/s)</small>
                </dd>
              </div>
            </dl>

            <div className="confirm-card__actions">
              <Link to="/reservas" className="btn btn--primary">
                Ver mis reservas
              </Link>
              <Link to="/mapa" className="btn btn--outline">
                Seguir explorando
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="reserve-page">
      <div className="container">
        <Link to="/mapa" className="back-link">
          <ArrowLeft size={16} /> Volver al mapa
        </Link>

        <div className="reserve-page__grid">
          <aside className="reserve-page__summary">
            <div className="summary-card">
              <header>
                <span className="summary-card__type">
                  {PARKING_TYPE_LABELS[parking.type] || 'Parking'}
                  {parking.open24 && ' · 24 h'}
                </span>
                <h1>{parking.name}</h1>
                <p>
                  <MapPin size={14} /> {parking.address}
                </p>
                <RatingStars rating={parking.rating} reviews={parking.reviews} />
              </header>

              <ul className="summary-card__services">
                {(parking.services || []).map((service) => (
                  <li key={service}>{SERVICE_LABELS[service] || service}</li>
                ))}
              </ul>

              <div className="summary-card__price">
                <strong>{formatPrice(parking.pricePerHour)}</strong>
                <span>por hora · IVA incluido</span>
              </div>

              <div className="summary-card__calc">
                <div>
                  <span>Duración</span>
                  <strong>{hours || '—'}{hours ? ' h' : ''}</strong>
                </div>
                <div>
                  <span>Plazas</span>
                  <strong>{form.spots}</strong>
                </div>
                <div className="summary-card__total">
                  <span>Total (cálculo automático)</span>
                  <strong>{total ? formatPrice(total) : '—'}</strong>
                </div>
              </div>

              <p className="summary-card__note">
                <ShieldCheck size={15} /> Cancelación gratuita hasta 1 h antes de la entrada.
              </p>
            </div>
          </aside>

          <section className="reserve-page__form">
            <header className="reserve-page__form-head">
              <span className="section__eyebrow">Formulario de reserva</span>
              <h2>Completa los datos de tu vehículo</h2>
              <p>Todos los campos marcados son obligatorios.</p>
            </header>

            <form className="booking-form" onSubmit={handleSubmit} noValidate>
              <fieldset>
                <legend>
                  <Car size={16} /> Vehículo
                </legend>
                {vehicles.length > 0 && (
                  <div className="saved-vehicles">
                    <span>Mis vehículos:</span>
                    {vehicles.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        className={`chip${form.plate === v.plate ? ' is-active' : ''}`}
                        onClick={() => pickVehicle(String(v.id))}
                      >
                        {v.plate} {v.brand && `· ${v.brand} ${v.model}`}
                      </button>
                    ))}
                  </div>
                )}
                <div className="form-grid">
                  <Field label="Tipo de coche" error={mergedErrors.carType}>
                    <select
                      value={form.carType}
                      onChange={(e) => setValue('carType', e.target.value)}
                      onBlur={() => handleBlur('carType')}
                    >
                      {CAR_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </Field>

                  <Field label="Matrícula" error={mergedErrors.plate} hint="Formato español, ej. 1234BCD">
                    <input
                      type="text"
                      value={form.plate}
                      placeholder="1234BCD"
                      maxLength={10}
                      autoComplete="off"
                      onChange={(e) => setValue('plate', e.target.value.toUpperCase())}
                      onBlur={() => handleBlur('plate')}
                    />
                  </Field>

                  <Field label="Marca (opcional)">
                    <input
                      type="text"
                      value={form.brand}
                      placeholder="Seat"
                      onChange={(e) => setValue('brand', e.target.value)}
                    />
                  </Field>

                  <Field label="Modelo (opcional)">
                    <input
                      type="text"
                      value={form.model}
                      placeholder="León"
                      onChange={(e) => setValue('model', e.target.value)}
                    />
                  </Field>

                  <Field label="Color (opcional)">
                    <input
                      type="text"
                      value={form.color}
                      placeholder="Blanco"
                      onChange={(e) => setValue('color', e.target.value)}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset>
                <legend>
                  <User size={16} /> Titular de la reserva
                </legend>
                <div className="form-grid">
                  <Field label="Nombre y apellidos" error={mergedErrors.holderName}>
                    <input
                      type="text"
                      value={form.holderName}
                      placeholder="Laura García Sánchez"
                      autoComplete="name"
                      onChange={(e) => setValue('holderName', e.target.value)}
                      onBlur={() => handleBlur('holderName')}
                    />
                  </Field>

                  <Field label="Email" error={mergedErrors.email}>
                    <input
                      type="email"
                      value={form.email}
                      placeholder="laura@email.com"
                      autoComplete="email"
                      onChange={(e) => setValue('email', e.target.value)}
                      onBlur={() => handleBlur('email')}
                    />
                  </Field>

                  <Field label="Teléfono móvil" error={mergedErrors.phone} hint="Te avisamos por SMS si hay incidencias">
                    <input
                      type="tel"
                      value={form.phone}
                      placeholder="612 345 678"
                      autoComplete="tel"
                      onChange={(e) => setValue('phone', e.target.value)}
                      onBlur={() => handleBlur('phone')}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset>
                <legend>
                  <CalendarClock size={16} /> Horario de la reserva
                </legend>
                <div className="form-grid">
                  <Field label="Entrada" error={mergedErrors.entryAt}>
                    <input
                      type="datetime-local"
                      value={form.entryAt}
                      onChange={(e) => setValue('entryAt', e.target.value)}
                      onBlur={() => handleBlur('entryAt')}
                    />
                  </Field>

                  <Field label="Salida" error={mergedErrors.exitAt}>
                    <input
                      type="datetime-local"
                      value={form.exitAt}
                      onChange={(e) => setValue('exitAt', e.target.value)}
                      onBlur={() => handleBlur('exitAt')}
                    />
                  </Field>

                  <Field label="Plazas a reservar" error={mergedErrors.spots}>
                    <input
                      type="number"
                      min={1}
                      max={5}
                      value={form.spots}
                      onChange={(e) => setValue('spots', e.target.value)}
                      onBlur={() => handleBlur('spots')}
                    />
                  </Field>
                </div>
              </fieldset>

              <fieldset>
                <legend>Información adicional</legend>
                <Field label="Notas para el parking (opcional)" error={mergedErrors.notes} hint={`${form.notes.length}/500`}>
                  <textarea
                    rows={3}
                    value={form.notes}
                    placeholder="Necesito plaza junto al ascensor…"
                    onChange={(e) => setValue('notes', e.target.value)}
                    onBlur={() => handleBlur('notes')}
                  />
                </Field>

                <div className={`checkbox${mergedErrors.acceptTerms ? ' field--error' : ''}`}>
                  <input
                    id="acceptTerms"
                    type="checkbox"
                    checked={form.acceptTerms}
                    onChange={(e) => setValue('acceptTerms', e.target.checked)}
                  />
                  <label htmlFor="acceptTerms">
                    Acepto las condiciones de reserva y la política de privacidad de AuiPark. Sé que
                    la cancelación es gratuita hasta 1 hora antes de la entrada.
                  </label>
                </div>
                {mergedErrors.acceptTerms && <span className="field__error">{mergedErrors.acceptTerms}</span>}
              </fieldset>

              {submitError && !Object.keys(fieldErrors || {}).length && (
                <p className="form-alert" role="alert">
                  {submitError}
                </p>
              )}

              <div className="booking-form__footer">
                <div className="booking-form__total">
                  <span>Total a pagar</span>
                  <strong>{total ? formatPrice(total) : '—'}</strong>
                  <small>{hours ? `${hours} h × ${formatPrice(parking.pricePerHour)} × ${form.spots} plaza/s` : 'Selecciona el horario'}</small>
                </div>
                <button type="submit" className="btn btn--accent btn--lg" disabled={submitting}>
                  {submitting ? <Spinner size="sm" label="Enviando" /> : <CheckCircle2 size={18} />}
                  {submitting ? 'Reservando…' : 'Confirmar reserva'}
                </button>
              </div>
            </form>
          </section>
        </div>
      </div>
    </div>
  );
}
