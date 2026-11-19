import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, CalendarClock, Car, MapPin, Ban, Info } from 'lucide-react';
import Spinner from '../components/ui/Spinner.jsx';
import useReservationController from '../controllers/useReservationController.js';
import { useAuth } from '../controllers/AuthContext.jsx';
import { STATUS_LABELS, CAR_TYPES, formatDateTime } from '../models/reservation.model.js';
import { formatPrice } from '../models/parking.model.js';

const TABS = [
  { key: 'active', label: 'Activas' },
  { key: 'past', label: 'Historial' },
];

function canCancel(reservation) {
  return reservation.status === 'confirmed' && new Date(reservation.entryAt).getTime() - Date.now() >= 3600 * 1000;
}

export default function MyReservationsPage() {
  const { user } = useAuth();
  const { loadMine, cancelReservation, loadingList, reservations, listError } = useReservationController();
  const [tab, setTab] = useState('active');
  const [actionError, setActionError] = useState(null);
  const [confirmingCode, setConfirmingCode] = useState(null);
  const [cancelling, setCancelling] = useState(null);

  useEffect(() => {
    loadMine();
  }, [loadMine]);

  const list = useMemo(
    () =>
      reservations.filter((r) =>
        tab === 'active' ? r.status === 'confirmed' : ['completed', 'cancelled'].includes(r.status)
      ),
    [reservations, tab]
  );

  const handleCancel = async (code) => {
    setActionError(null);
    setCancelling(code);
    try {
      await cancelReservation(code);
      setConfirmingCode(null);
    } catch (err) {
      setActionError(err.message);
    } finally {
      setCancelling(null);
    }
  };

  return (
    <div className="my-reservations">
      <div className="container container--narrow">
        <header className="page-head">
          <span className="section__eyebrow">Área de cliente</span>
          <h1>Mis reservas</h1>
          <p>
            Hola, {user.name.split(' ')[0]}. Aquí tienes todas las reservas asociadas a tu cuenta ({user.email}).
          </p>
        </header>

        <div className="tabs" role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={tab === t.key}
              className={`tabs__item${tab === t.key ? ' is-active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}
              <span className="tabs__count">
                {
                  reservations.filter((r) =>
                    t.key === 'active' ? r.status === 'confirmed' : ['completed', 'cancelled'].includes(r.status)
                  ).length
                }
              </span>
            </button>
          ))}
        </div>

        {listError && <p className="form-alert" role="alert">{listError}</p>}
        {actionError && <p className="form-alert" role="alert">{actionError}</p>}

        {loadingList && (
          <div className="state-block">
            <Spinner label="Cargando reservas" />
          </div>
        )}

        {!loadingList && list.length === 0 && (
          <div className="state-block">
            <Ticket size={26} />
            <p>{tab === 'active' ? 'No tienes reservas activas.' : 'Todavía no hay reservas en tu historial.'}</p>
            <Link to="/mapa" className="btn btn--outline btn--sm">
              Reservar una plaza
            </Link>
          </div>
        )}

        <div className="reservation-list">
          {list.map((reservation) => (
            <article key={reservation.id} className={`reservation-card reservation-card--${reservation.status}`}>
              <header className="reservation-card__head">
                <span className="reservation-card__code">
                  <Ticket size={15} /> {reservation.code}
                </span>
                <span className={`status-badge status-badge--${reservation.status}`}>
                  {STATUS_LABELS[reservation.status] || reservation.status}
                </span>
              </header>

              <h2>{reservation.parkingName}</h2>
              <p className="reservation-card__address">
                <MapPin size={14} /> {reservation.parkingAddress}
              </p>

              <div className="reservation-card__grid">
                <div>
                  <span>
                    <CalendarClock size={14} /> Entrada
                  </span>
                  <strong>{formatDateTime(reservation.entryAt)}</strong>
                </div>
                <div>
                  <span>
                    <CalendarClock size={14} /> Salida
                  </span>
                  <strong>{formatDateTime(reservation.exitAt)}</strong>
                </div>
                <div>
                  <span>
                    <Car size={14} /> Vehículo
                  </span>
                  <strong>
                    {reservation.vehicle.plate} ·{' '}
                    {CAR_TYPES.find((t) => t.value === reservation.vehicle.type)?.label || reservation.vehicle.type}
                  </strong>
                </div>
                <div>
                  <span>Total</span>
                  <strong>{formatPrice(reservation.totalPrice)}</strong>
                </div>
              </div>

              <footer className="reservation-card__foot">
                <small>
                  Titular: {reservation.holder.name} · {reservation.spots} plaza/s · {reservation.hours} h ×{' '}
                  {formatPrice(reservation.pricePerHour)}
                </small>
                {reservation.status === 'confirmed' && !canCancel(reservation) && (
                  <small className="reservation-card__hint">
                    <Info size={13} /> Ya no se puede cancelar (menos de 1 h para la entrada)
                  </small>
                )}
                {canCancel(reservation) &&
                  (confirmingCode === reservation.code ? (
                    <span className="reservation-card__confirm">
                      ¿Seguro?
                      <button
                        type="button"
                        className="btn btn--danger btn--sm"
                        onClick={() => handleCancel(reservation.code)}
                        disabled={cancelling === reservation.code}
                      >
                        {cancelling === reservation.code ? 'Cancelando…' : 'Sí, cancelar'}
                      </button>
                      <button type="button" className="btn btn--ghost btn--sm" onClick={() => setConfirmingCode(null)}>
                        No
                      </button>
                    </span>
                  ) : (
                    <button
                      type="button"
                      className="btn btn--outline btn--sm"
                      onClick={() => setConfirmingCode(reservation.code)}
                    >
                      <Ban size={14} /> Cancelar reserva
                    </button>
                  ))}
              </footer>
            </article>
          ))}
        </div>
      </div>
    </div>
  );
}
