import { Star, MapPin, Clock, Zap, ShieldCheck, Accessibility, CarFront, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';
import {
  PARKING_TYPE_LABELS,
  SERVICE_LABELS,
  formatPrice,
  formatDistance,
  availabilityPercent,
  availabilityLabel,
} from '../../models/parking.model.js';

const TYPE_ICONS = {
  underground: CarFront,
  multistorey: Layers,
  rooftop: Layers,
  surface: CarFront,
};

const SERVICE_ICONS = {
  ev_charging: Zap,
  security: ShieldCheck,
  disabled_access: Accessibility,
};

export function RatingStars({ rating, reviews }) {
  if (!rating) return null;
  return (
    <span className="rating" title={`${rating} sobre 5`}>
      <Star size={14} className="rating__star" fill="currentColor" />
      <strong>{Number(rating).toFixed(1)}</strong>
      {reviews != null && <span className="rating__reviews">({reviews})</span>}
    </span>
  );
}

export default function ParkingCard({ parking, onReserve, onSelect, variant = 'list' }) {
  const isLive = parking.live || !parking.id;
  const pct = availabilityPercent(parking);
  const TypeIcon = TYPE_ICONS[parking.type] || CarFront;
  const services = (parking.services || []).slice(0, 3);

  return (
    <article
      className={`parking-card parking-card--${variant}${onSelect ? ' is-clickable' : ''}`}
      onMouseEnter={() => onSelect?.(parking)}
      onFocus={() => onSelect?.(parking)}
      tabIndex={onSelect ? 0 : -1}
    >
      <header className="parking-card__head">
        <span className="parking-card__type">
          <TypeIcon size={15} />
          {PARKING_TYPE_LABELS[parking.type] || 'Parking'}
        </span>
        {parking.open24 && (
          <span className="parking-card__badge parking-card__badge--dark">
            <Clock size={12} /> 24 h
          </span>
        )}
        {isLive && <span className="parking-card__badge parking-card__badge--live">En directo</span>}
      </header>

      <h3 className="parking-card__name">{parking.name}</h3>
      <p className="parking-card__address">
        <MapPin size={14} /> {parking.address}
      </p>

      <div className="parking-card__meta">
        <RatingStars rating={parking.rating} reviews={parking.reviews} />
        {parking.distance != null && <span className="parking-card__distance">{formatDistance(parking.distance)}</span>}
        <span className={`parking-card__avail parking-card__avail--${pct <= 0 ? 'full' : pct < 20 ? 'low' : 'ok'}`}>
          {isLive ? 'Consulta disponibilidad' : availabilityLabel(parking)}
        </span>
      </div>

      {!isLive && (
        <div className="parking-card__bar" aria-hidden="true">
          <span style={{ width: `${pct}%` }} className={pct < 20 ? 'is-low' : ''} />
        </div>
      )}

      {services.length > 0 && (
        <ul className="parking-card__services">
          {services.map((service) => {
            const Icon = SERVICE_ICONS[service] || null;
            return (
              <li key={service}>
                {Icon && <Icon size={13} />}
                {SERVICE_LABELS[service] || service}
              </li>
            );
          })}
        </ul>
      )}

      <footer className="parking-card__foot">
        <div className="parking-card__price">
          {parking.pricePerHour != null ? (
            <>
              <strong>{formatPrice(parking.pricePerHour)}</strong>
              <span>/hora</span>
            </>
          ) : (
            <span className="parking-card__price-cta">Precio al reservar</span>
          )}
        </div>
        {onReserve ? (
          <button type="button" className="btn btn--primary btn--sm" onClick={() => onReserve(parking)}>
            Reservar
          </button>
        ) : (
          <Link to={`/reservar/${parking.id}`} className="btn btn--primary btn--sm">
            Reservar
          </Link>
        )}
      </footer>
    </article>
  );
}
