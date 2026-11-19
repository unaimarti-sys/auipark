import { useCallback, useEffect, useState } from 'react';
import { ClipboardList, LogOut, Search, Building2, RefreshCw } from 'lucide-react';
import Spinner from '../components/ui/Spinner.jsx';
import api from '../services/api.js';
import { STATUS_LABELS, CAR_TYPES, formatDateTime } from '../models/reservation.model.js';
import { formatPrice, availabilityPercent, PARKING_TYPE_LABELS } from '../models/parking.model.js';

function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Panel del EMPLEADO: ve las reservas de SU parking y registra la salida de los coches
 * (la reserva pasa a «Finalizada» y las plazas quedan libres).
 */
export default function EmpleadoPage() {
  const [parking, setParking] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({ status: 'confirmed', date: '', q: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(null);

  const loadParking = useCallback(async () => {
    try {
      const data = await api.get('/empleado/parking');
      setParking(data.parking);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  const loadReservations = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v !== '')).toString();
      const data = await api.get(`/empleado/reservations${qs ? `?${qs}` : ''}`);
      setReservations(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    loadParking();
  }, [loadParking]);

  useEffect(() => {
    const t = setTimeout(loadReservations, 200);
    return () => clearTimeout(t);
  }, [loadReservations]);

  const registerExit = async (r) => {
    if (!window.confirm(`¿Registrar la salida del vehículo ${r.vehicle.plate} (${r.code})?`)) return;
    setBusy(r.code);
    setError(null);
    setMessage(null);
    try {
      const data = await api.patch(`/empleado/reservations/${r.code}/salida`);
      setReservations((list) =>
        filters.status === 'confirmed' ? list.filter((x) => x.code !== r.code) : list.map((x) => (x.code === r.code ? data.reservation : x))
      );
      setMessage(`Salida registrada: ${r.vehicle.plate} (${r.code}). ${r.spots} plaza/s liberada/s.`);
      loadParking();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const occupied = parking ? 100 - availabilityPercent(parking) : 0;

  return (
    <div className="panel-page">
      <div className="container">
        <header className="page-head page-head--row">
          <div>
            <span className="section__eyebrow">Panel de empleado</span>
            <h1>
              <ClipboardList size={26} /> Reservas de mi parking
            </h1>
            <p>Consulta las reservas y registra la salida de cada vehículo para liberar sus plazas.</p>
          </div>
        </header>

        {message && <p className="form-success">{message}</p>}
        {error && <p className="form-alert" role="alert">{error}</p>}

        {parking && (
          <section className="panel-section employee-parking">
            <div>
              <h2>
                <Building2 size={18} /> {parking.name}
              </h2>
              <p className="muted">
                {parking.address} · {PARKING_TYPE_LABELS[parking.type]} · {formatPrice(parking.pricePerHour)}/h · {parking.openingHours}
              </p>
            </div>
            <div className="employee-parking__stats">
              <div>
                <strong>{parking.available}</strong>
                <span>plazas libres</span>
              </div>
              <div>
                <strong>{parking.capacity}</strong>
                <span>capacidad</span>
              </div>
              <div>
                <strong>{occupied}%</strong>
                <span>ocupación</span>
              </div>
            </div>
            <div className="manager-parking__bar">
              <span style={{ width: `${occupied}%` }} />
            </div>
          </section>
        )}

        <section className="panel-section">
          <div className="panel-section__head">
            <h2>Reservas</h2>
            <button type="button" className="btn btn--ghost btn--sm" onClick={loadReservations}>
              <RefreshCw size={14} /> Actualizar
            </button>
          </div>
          <div className="panel-filters">
            <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
              <option value="">Todos los estados</option>
              {Object.entries(STATUS_LABELS).map(([k, v]) => (
                <option key={k} value={k}>
                  {k === 'confirmed' ? 'Pendientes de salida' : v}
                </option>
              ))}
            </select>
            <input type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} aria-label="Fecha" />
            <button
              type="button"
              className={`btn btn--sm ${filters.date === todayISO() ? 'btn--primary' : 'btn--ghost'}`}
              onClick={() => setFilters((f) => ({ ...f, date: f.date === todayISO() ? '' : todayISO() }))}
            >
              Hoy
            </button>
            <div className="panel-search">
              <Search size={15} />
              <input placeholder="Código, matrícula o titular" value={filters.q} onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))} />
            </div>
          </div>

          {loading ? (
            <div className="state-block">
              <Spinner label="Cargando reservas" />
            </div>
          ) : reservations.length === 0 ? (
            <p className="muted">No hay reservas con estos filtros.</p>
          ) : (
            <div className="table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Código</th>
                    <th>Vehículo</th>
                    <th>Titular</th>
                    <th>Entrada / salida</th>
                    <th>Plazas</th>
                    <th>Importe</th>
                    <th>Estado</th>
                    <th>Acción</th>
                  </tr>
                </thead>
                <tbody>
                  {reservations.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{r.code}</td>
                      <td>
                        <strong className="mono">{r.vehicle.plate}</strong>
                        <small>
                          {CAR_TYPES.find((t) => t.value === r.vehicle.type)?.label}
                          {r.vehicle.brand ? ` · ${r.vehicle.brand} ${r.vehicle.model}` : ''}
                        </small>
                      </td>
                      <td>
                        {r.holder.name}
                        <small>{r.holder.phone}</small>
                      </td>
                      <td>
                        {formatDateTime(r.entryAt)}
                        <small>{formatDateTime(r.exitAt)}</small>
                      </td>
                      <td>{r.spots}</td>
                      <td>{formatPrice(r.totalPrice)}</td>
                      <td>
                        <span className={`status-badge status-badge--${r.status}`}>{STATUS_LABELS[r.status]}</span>
                      </td>
                      <td className="actions">
                        {r.status === 'confirmed' && (
                          <button type="button" className="btn btn--primary btn--xs" disabled={busy === r.code} onClick={() => registerExit(r)}>
                            <LogOut size={13} /> Registrar salida
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
