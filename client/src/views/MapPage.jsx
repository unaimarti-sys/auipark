import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { LocateFixed, SlidersHorizontal, MapPin, ListFilter, Star } from 'lucide-react';
import MapView from '../components/map/MapView.jsx';
import ParkingCard from '../components/ui/ParkingCard.jsx';
import SearchBox from '../components/ui/SearchBox.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import useParkingsController from '../controllers/useParkingsController.js';
import { useGeolocation } from '../controllers/useGeolocation.js';
import {
  filterParkings,
  formatPrice,
  formatDistance,
  PARKING_TYPE_LABELS,
  SERVICE_LABELS,
  SERVICE_KEYS,
} from '../models/parking.model.js';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from '../services/map.js';

const TYPE_OPTIONS = [
  { value: 'all', label: 'Todos los tipos' },
  ...Object.entries(PARKING_TYPE_LABELS).map(([value, label]) => ({ value, label })),
];

const SERVICE_OPTIONS = [
  { value: 'all', label: 'Todos los servicios' },
  ...SERVICE_KEYS.map((key) => ({ value: key, label: SERVICE_LABELS[key] })),
];

const PRICE_OPTIONS = [
  { value: '', label: 'Precio libre' },
  { value: '2', label: 'Hasta 2 €/h' },
  { value: '3', label: 'Hasta 3 €/h' },
  { value: '4', label: 'Hasta 4 €/h' },
];

export default function MapPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { parkings, loading, error, loadParkings } = useParkingsController();
  const { position, locate, locating, error: geoError } = useGeolocation();

  const [area, setArea] = useState(() => {
    const lat = Number(searchParams.get('lat'));
    const lon = Number(searchParams.get('lon'));
    if (!Number.isNaN(lat) && !Number.isNaN(lon) && searchParams.get('lat')) {
      return { lat, lon, radius: 3500 };
    }
    return { ...DEFAULT_CENTER, radius: 3500 };
  });
  const [selectedId, setSelectedId] = useState(null);
  const [flyTarget, setFlyTarget] = useState(null);
  const [filters, setFilters] = useState({ type: 'all', maxPrice: '', service: 'all' });
  const [notice, setNotice] = useState(null);
  const boundsTimer = useRef(null);

  const searchName = searchParams.get('name');

  useEffect(() => {
    loadParkings({
      ...(area.bbox ? { bbox: area.bbox } : { lat: area.lat, lon: area.lon, radius: area.radius }),
      ...(filters.type !== 'all' ? { type: filters.type } : {}),
      ...(filters.maxPrice ? { maxPrice: filters.maxPrice } : {}),
      ...(filters.service !== 'all' ? { service: filters.service } : {}),
    });
  }, [area, filters, loadParkings]);

  const handleBoundsChange = useCallback(
    (bounds) => {
      clearTimeout(boundsTimer.current);
      boundsTimer.current = setTimeout(() => {
        const { west, south, east, north } = bounds;
        setArea((current) => {
          const bbox = `${west},${south},${east},${north}`;
          if (current.bbox === bbox) return current;
          return { bbox };
        });
      }, 550);
    },
    []
  );

  useEffect(() => () => clearTimeout(boundsTimer.current), []);

  const handlePickLocation = (result) => {
    setSelectedId(null);
    if (!result) {
      setArea({ ...DEFAULT_CENTER, radius: 3500 });
      setFlyTarget({ ...DEFAULT_CENTER, zoom: 13 });
      return;
    }
    setArea({ lat: result.lat, lon: result.lon, radius: 3500 });
    setFlyTarget({ lat: result.lat, lon: result.lon, zoom: 14 });
    setNotice(`Mostrando parkings cerca de ${result.name}`);
  };

  const handleLocate = async () => {
    setNotice(null);
    const next = await locate();
    if (next) {
      setArea({ lat: next.lat, lon: next.lon, radius: 3500 });
      setNotice('Usando tu ubicación actual');
    }
  };

  const handleReserve = (parking) => {
    navigate(`/reservar/${parking.id}`);
  };

  const visible = useMemo(() => filterParkings(parkings, filters), [parkings, filters]);
  const topRated = useMemo(
    () => [...visible].filter((p) => p.id && p.rating).sort((a, b) => b.rating - a.rating).slice(0, 8),
    [visible]
  );

  return (
    <div className="map-page">
      <div className="map-page__toolbar">
        <SearchBox onPick={handlePickLocation} placeholder="Buscar ciudad o dirección…" />
        <div className="map-page__toolbar-actions">
          <button
            type="button"
            className={`btn btn--outline btn--sm${locating ? ' is-loading' : ''}`}
            onClick={handleLocate}
          >
            <LocateFixed size={16} /> Mi ubicación
          </button>
        </div>
      </div>

      {topRated.length > 0 && (
        <section className="top-rail" aria-label="Mejor valorados en esta zona">
          <span className="top-rail__title">
            <Star size={15} /> Mejor valorados en esta zona
          </span>
          <div className="top-rail__track">
            {topRated.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`top-rail__item${selectedId === p.id ? ' is-active' : ''}`}
                onClick={() => {
                  setSelectedId(p.id);
                  setFlyTarget({ lat: p.lat, lon: p.lon, zoom: 16 });
                }}
              >
                <strong>{p.name}</strong>
                <span>
                  ★ {p.rating.toFixed(1)} · {formatPrice(p.pricePerHour)}/h
                  {p.distance != null ? ` · ${formatDistance(p.distance)}` : ''}
                </span>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="map-page__grid">
        <aside className="map-page__list">
          <header className="map-page__list-head">
            <div>
              <h1>
                <MapPin size={18} /> Parkings {searchName ? `en ${searchName}` : 'cerca de ti'}
              </h1>
              <p>
                {loading ? 'Actualizando…' : `${visible.length} ${visible.length === 1 ? 'parking encontrado' : 'parkings encontrados'}`}
              </p>
            </div>
          </header>

          <div className="filters">
            <span className="filters__label">
              <SlidersHorizontal size={14} /> Filtros
            </span>
            <div className="filters__row">
              <select
                aria-label="Tipo de parking"
                value={filters.type}
                onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value }))}
              >
                {TYPE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Precio máximo"
                value={filters.maxPrice}
                onChange={(e) => setFilters((f) => ({ ...f, maxPrice: e.target.value }))}
              >
                {PRICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <select
                aria-label="Servicio"
                value={filters.service}
                onChange={(e) => setFilters((f) => ({ ...f, service: e.target.value }))}
              >
                {SERVICE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {notice && <p className="map-page__notice">{notice}</p>}
          {error && <p className="map-page__error">{error}</p>}
          {geoError && <p className="map-page__error">{geoError}</p>}

          <div className="map-page__cards">
            {loading && parkings.length === 0 && (
              <div className="state-block">
                <Spinner label="Cargando parkings" />
              </div>
            )}
            {!loading && visible.length === 0 && (
              <div className="state-block">
                <ListFilter size={26} />
                <p>No hay parkings con esos filtros en esta zona.</p>
                <button
                  type="button"
                  className="btn btn--outline btn--sm"
                  onClick={() => setFilters({ type: 'all', maxPrice: '', service: 'all' })}
                >
                  Quitar filtros
                </button>
              </div>
            )}
            {visible.map((parking) => (
              <div
                key={parking.id || parking.externalId}
                className={`map-page__card${selectedId === (parking.id || parking.externalId) ? ' is-selected' : ''}`}
              >
                <ParkingCard
                  parking={parking}
                  onSelect={() => setSelectedId(parking.id || parking.externalId)}
                  onReserve={handleReserve}
                />
              </div>
            ))}
          </div>
        </aside>

        <div className="map-page__map">
          <MapView
            center={DEFAULT_CENTER}
            zoom={DEFAULT_ZOOM}
            parkings={visible}
            selectedId={selectedId}
            userLocation={position}
            flyTarget={flyTarget}
            onBoundsChange={handleBoundsChange}
            onMarkerClick={(parking) => setSelectedId(parking.id || parking.externalId)}
            onReserve={handleReserve}
          />
          <div className="map-page__hint">Mapa y búsqueda de direcciones: © OpenStreetMap contributors</div>
        </div>
      </div>
    </div>
  );
}
