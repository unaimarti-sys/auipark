import { useCallback, useEffect, useState } from 'react';
import {
  LayoutDashboard,
  Building2,
  Users,
  Ticket,
  Plus,
  Pencil,
  Trash2,
  Search,
  Sparkles,
  X,
  Euro,
  Gauge,
  CalendarCheck2,
  UserCheck,
} from 'lucide-react';
import Spinner from '../components/ui/Spinner.jsx';
import api from '../services/api.js';
import { useAuth, ROLE_LABELS } from '../controllers/AuthContext.jsx';
import { STATUS_LABELS, CAR_TYPES, formatDateTime } from '../models/reservation.model.js';
import { PARKING_TYPE_LABELS, SERVICE_LABELS, formatPrice } from '../models/parking.model.js';

const TABS = [
  { key: 'summary', label: 'Resumen', icon: LayoutDashboard },
  { key: 'parkings', label: 'Parkings', icon: Building2 },
  { key: 'services', label: 'Servicios', icon: Sparkles },
  { key: 'users', label: 'Usuarios y roles', icon: Users },
  { key: 'reservations', label: 'Reservas', icon: Ticket },
];

const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;

/* ------------------------------------------------------------------ Resumen */

function SummaryTab() {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.get('/admin/stats').then(setStats).catch((err) => setError(err.message));
  }, []);

  if (error) return <p className="form-alert">{error}</p>;
  if (!stats) return <div className="state-block"><Spinner label="Cargando estadísticas" /></div>;

  const totalReservations = Object.values(stats.reservations).reduce((a, s) => a + s.count, 0);
  const totalUsers = Object.values(stats.users).reduce((a, n) => a + n, 0);
  const maxDay = Math.max(1, ...stats.last7days.map((d) => d.count));

  const days = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    const found = stats.last7days.find((x) => x.day === key);
    days.push({ key, label: d.toLocaleDateString('es-ES', { weekday: 'short' }), count: found?.count || 0 });
  }

  return (
    <>
      <div className="stat-grid">
        <div className="stat-card">
          <Euro size={20} />
          <span>Ingresos (no canceladas)</span>
          <strong>{formatPrice(stats.revenue)}</strong>
        </div>
        <div className="stat-card">
          <CalendarCheck2 size={20} />
          <span>Reservas totales</span>
          <strong>{totalReservations}</strong>
          <small>
            {plural(stats.reservations.confirmed?.count || 0, 'confirmada', 'confirmadas')} ·{' '}
            {plural(stats.reservations.completed?.count || 0, 'finalizada', 'finalizadas')}
          </small>
        </div>
        <div className="stat-card">
          <Gauge size={20} />
          <span>Ocupación global</span>
          <strong>{String(stats.occupancy).replace('.', ',')} %</strong>
          <small>
            {stats.capacity - stats.available} de {stats.capacity} plazas en {stats.parkings} parkings
          </small>
        </div>
        <div className="stat-card">
          <UserCheck size={20} />
          <span>Usuarios</span>
          <strong>{totalUsers}</strong>
          <small>
            {plural(stats.users.cliente || 0, 'cliente', 'clientes')} · {plural(stats.users.empleado || 0, 'empleado', 'empleados')} ·{' '}
            {stats.users.admin || 0} admin
          </small>
        </div>
      </div>

      <div className="panel-columns">
        <section className="panel-section">
          <h2>Reservas creadas (últimos 7 días)</h2>
          <div className="bar-chart">
            {days.map((d) => (
              <div key={d.key} className="bar-chart__col" title={`${d.count} reservas`}>
                <span className="bar-chart__value">{d.count}</span>
                <span className="bar-chart__bar" style={{ height: `${(d.count / maxDay) * 100}%` }} />
                <span className="bar-chart__label">{d.label}</span>
              </div>
            ))}
          </div>
        </section>
        <section className="panel-section">
          <h2>Parkings con más reservas</h2>
          {stats.topParkings.length === 0 ? (
            <p className="muted">Sin datos todavía.</p>
          ) : (
            <ol className="top-list">
              {stats.topParkings.map((p) => (
                <li key={p.id}>
                  <span>
                    <strong>{p.name}</strong>
                    <small>{p.city}</small>
                  </span>
                  <span>
                    {plural(p.count, 'reserva', 'reservas')} · {formatPrice(p.amount)}
                  </span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- Parkings */

const EMPTY_PARKING = {
  name: '',
  address: '',
  city: '',
  postcode: '',
  lat: '',
  lon: '',
  type: 'underground',
  pricePerHour: '2.50',
  capacity: 100,
  available: 100,
  services: [],
  open24: false,
  openingHours: '07:00-23:00',
  active: true,
};

function ParkingForm({ initial, services, onClose, onSaved }) {
  const [form, setForm] = useState(() => ({ ...EMPTY_PARKING, ...initial }));
  const [errors, setErrors] = useState({});
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const toggleService = (key) =>
    set('services', form.services.includes(key) ? form.services.filter((s) => s !== key) : [...form.services, key]);

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setErrors({});
    const payload = {
      ...form,
      lat: Number(form.lat),
      lon: Number(form.lon),
      pricePerHour: Number(form.pricePerHour),
      capacity: Number(form.capacity),
      available: Number(form.available),
    };
    try {
      const data = initial?.id
        ? await api.put(`/admin/parkings/${initial.id}`, payload)
        : await api.post('/admin/parkings', payload);
      onSaved(data.parking);
    } catch (err) {
      setError(err.message);
      setErrors(err.fields || {});
    } finally {
      setSaving(false);
    }
  };

  const input = (key, label, props = {}) => (
    <div className={`field ${errors[key] ? 'field--error' : ''}`}>
      <label>
        {label}
        <input value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
      </label>
      {errors[key] && <span className="field__error">{errors[key]}</span>}
    </div>
  );

  return (
    <div className="modal" role="dialog" aria-modal="true">
      <div className="modal__backdrop" onClick={onClose} />
      <form className="modal__card" onSubmit={submit} noValidate>
        <header className="modal__head">
          <h2>{initial?.id ? 'Editar parking' : 'Nuevo parking'}</h2>
          <button type="button" className="btn btn--ghost btn--sm" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </header>
        <div className="modal__body">
          {input('name', 'Nombre')}
          <div className="form-grid">
            {input('address', 'Dirección')}
            {input('city', 'Ciudad')}
            {input('lat', 'Latitud', { type: 'number', step: 'any' })}
            {input('lon', 'Longitud', { type: 'number', step: 'any' })}
            <div className="field">
              <label>
                Tipo
                <select value={form.type} onChange={(e) => set('type', e.target.value)}>
                  {Object.entries(PARKING_TYPE_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>
                      {v}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {input('pricePerHour', 'Precio por hora (€)', { type: 'number', step: '0.01', min: '0' })}
            {input('capacity', 'Capacidad (plazas)', { type: 'number', min: '1' })}
            {input('available', 'Plazas libres', { type: 'number', min: '0' })}
            {input('openingHours', 'Horario')}
          </div>
          <fieldset className="chips-fieldset">
            <legend>Servicios</legend>
            {services.map(({ key, name: label }) => (
              <button
                key={key}
                type="button"
                className={`chip${form.services.includes(key) ? ' is-active' : ''}`}
                onClick={() => toggleService(key)}
              >
                {label}
              </button>
            ))}
          </fieldset>
          <div className="modal__checks">
            <label className="checkbox">
              <input type="checkbox" checked={form.open24} onChange={(e) => set('open24', e.target.checked)} />
              Abierto 24 h
            </label>
            <label className="checkbox">
              <input type="checkbox" checked={form.active} onChange={(e) => set('active', e.target.checked)} />
              Activo (visible en el mapa)
            </label>
          </div>
          {error && <p className="form-alert">{error}</p>}
        </div>
        <footer className="modal__foot">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            Cancelar
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Guardando…' : 'Guardar parking'}
          </button>
        </footer>
      </form>
    </div>
  );
}

function ParkingsTab() {
  const [parkings, setParkings] = useState([]);
  const [services, setServices] = useState([]);
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [importCity, setImportCity] = useState('');
  const [importing, setImporting] = useState(false);

  const importFromGeoapify = async (e) => {
    e.preventDefault();
    if (!importCity.trim()) return;
    setImporting(true); setError(null); setMessage(null);
    try {
      const r = await api.post('/admin/parkings/import', { city: importCity.trim() });
      setMessage(`Geoapify · ${r.city}: ${r.found} encontrados, ${r.created} importados, ${r.skipped} ya existían`);
      setImportCity('');
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [p, m] = await Promise.all([
        api.get(`/admin/parkings${q ? `?q=${encodeURIComponent(q)}` : ''}`),
        api.get('/services'),
      ]);
      setParkings(p.results);
      setServices(m.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remove = async (parking) => {
    if (!window.confirm(`¿Eliminar «${parking.name}»? Si tiene reservas se desactivará.`)) return;
    setError(null);
    try {
      const data = await api.delete(`/admin/parkings/${parking.id}`);
      setMessage(data.result === 'deleted' ? 'Parking eliminado' : 'El parking tiene reservas: se ha desactivado');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="panel-toolbar">
        <div className="panel-search">
          <Search size={15} />
          <input placeholder="Buscar por nombre, ciudad o dirección" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="panel-toolbar__group">
          <button type="button" className="btn btn--primary btn--sm" onClick={() => setEditing({})}>
            <Plus size={15} /> Nuevo parking
          </button>
        </div>
      </div>

      <form className="panel-toolbar" onSubmit={importFromGeoapify}>
        <div className="panel-search">
          <Search size={15} />
          <input placeholder="Importar parkings reales de una ciudad (Geoapify), p. ej. Tarragona" value={importCity} onChange={(e) => setImportCity(e.target.value)} />
        </div>
        <button type="submit" className="btn btn--ghost btn--sm" disabled={importing || !importCity.trim()}>
          {importing ? 'Importando…' : 'Importar de Geoapify'}
        </button>
      </form>

      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-alert">{error}</p>}

      {loading ? (
        <div className="state-block"><Spinner label="Cargando parkings" /></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Parking</th>
                <th>Ciudad</th>
                <th>Tipo</th>
                <th>Precio/h</th>
                <th>Plazas</th>
                <th>Empleados</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {parkings.map((p) => (
                <tr key={p.id} className={p.active ? '' : 'is-muted'}>
                  <td>
                    <strong>{p.name}</strong>
                    <small>{p.address}</small>
                  </td>
                  <td>{p.city}</td>
                  <td>{PARKING_TYPE_LABELS[p.type]}</td>
                  <td>{formatPrice(p.pricePerHour)}</td>
                  <td>
                    {p.available}/{p.capacity}
                  </td>
                  <td>{p.employees || <span className="muted">—</span>}</td>
                  <td>
                    <span className={`status-badge ${p.active ? 'status-badge--confirmed' : 'status-badge--cancelled'}`}>
                      {p.active ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="actions">
                    <button type="button" className="btn btn--ghost btn--xs" onClick={() => setEditing(p)} aria-label="Editar">
                      <Pencil size={14} />
                    </button>
                    <button type="button" className="btn btn--ghost btn--xs danger" onClick={() => remove(p)} aria-label="Eliminar">
                      <Trash2 size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {editing && (
        <ParkingForm
          initial={editing}
          services={services}
          onClose={() => setEditing(null)}
          onSaved={(p) => {
            setEditing(null);
            setMessage(`Parking «${p.name}» guardado`);
            load();
          }}
        />
      )}
    </>
  );
}


/* ---------------------------------------------------------------- Servicios */

function ServicesTab() {
  const [services, setServices] = useState([]);
  const [name, setName] = useState('');
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get('/services');
      setServices(data.results);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    try {
      const data = await api.post('/admin/services', { name: name.trim() });
      setMessage(`Servicio «${data.service.name}» creado`);
      setName('');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (s) => {
    if (!window.confirm(`¿Eliminar el servicio «${s.name}»? Se quitará de ${s.parkings} parking/s.`)) return;
    setError(null);
    try {
      await api.delete(`/admin/services/${s.id}`);
      setMessage(`Servicio «${s.name}» eliminado`);
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <form className="panel-toolbar" onSubmit={add}>
        <div className="panel-search">
          <Plus size={15} />
          <input placeholder="Nombre del nuevo servicio (p. ej. Aparcabicis)" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <button type="submit" className="btn btn--primary btn--sm" disabled={name.trim().length < 3}>
          <Plus size={15} /> Añadir servicio
        </button>
      </form>
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-alert">{error}</p>}
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Servicio</th>
              <th>Clave</th>
              <th>Parkings que lo ofrecen</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {services.map((s) => (
              <tr key={s.id}>
                <td>
                  <strong>{s.name}</strong>
                </td>
                <td className="mono">{s.key}</td>
                <td>{s.parkings}</td>
                <td className="actions">
                  <button type="button" className="btn btn--ghost btn--xs danger" onClick={() => remove(s)} aria-label="Eliminar">
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ----------------------------------------------------------------- Usuarios */

function UsersTab() {
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [parkingOptions, setParkingOptions] = useState([]);
  const [q, setQ] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(Object.entries({ q, role }).filter(([, v]) => v)).toString();
      const [data, parks] = await Promise.all([api.get(`/admin/users${qs ? `?${qs}` : ''}`), api.get('/admin/parkings')]);
      setUsers(data.results);
      setParkingOptions(parks.results.filter((p) => p.active));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [q, role]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const update = async (u, changes) => {
    setError(null);
    setMessage(null);
    try {
      const data = await api.patch(`/admin/users/${u.id}`, changes);
      setUsers((list) => list.map((x) => (x.id === u.id ? { ...x, ...data.user } : x)));
      setMessage(`Usuario ${data.user.email} actualizado`);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="panel-toolbar">
        <div className="panel-search">
          <Search size={15} />
          <input placeholder="Buscar por nombre o email" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select value={role} onChange={(e) => setRole(e.target.value)} aria-label="Filtrar por rol">
          <option value="">Todos los roles</option>
          {Object.entries(ROLE_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
      </div>
      {message && <p className="form-success">{message}</p>}
      {error && <p className="form-alert">{error}</p>}
      {loading ? (
        <div className="state-block"><Spinner label="Cargando usuarios" /></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Teléfono</th>
                <th>Alta</th>
                <th>Reservas</th>
                <th>Rol</th>
                <th>Parking (empleados)</th>
                <th>Cuenta</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.active ? '' : 'is-muted'}>
                  <td>
                    <strong>{u.name}</strong>
                    <small>{u.email}</small>
                  </td>
                  <td>{u.phone || '—'}</td>
                  <td>{formatDateTime(u.createdAt)}</td>
                  <td>{u.reservations}</td>
                  <td>
                    <select
                      value={u.role}
                      disabled={u.id === me.id}
                      onChange={(e) => update(u, { role: e.target.value })}
                      aria-label={`Rol de ${u.name}`}
                    >
                      {Object.entries(ROLE_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {u.role === 'empleado' ? (
                      <select
                        value={u.parkingId ?? ''}
                        onChange={(e) => update(u, { parkingId: e.target.value ? Number(e.target.value) : null })}
                        aria-label={`Parking de ${u.name}`}
                      >
                        <option value="">— Sin asignar —</option>
                        {parkingOptions.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>
                    <button
                      type="button"
                      className={`btn btn--xs ${u.active ? 'btn--outline' : 'btn--primary'}`}
                      disabled={u.id === me.id}
                      onClick={() => update(u, { active: !u.active })}
                    >
                      {u.active ? 'Desactivar' : 'Activar'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ----------------------------------------------------------------- Reservas */

function ReservationsTab() {
  const [reservations, setReservations] = useState([]);
  const [filters, setFilters] = useState({ status: '', q: '', date: '' });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
      const data = await api.get(`/admin/reservations${qs ? `?${qs}` : ''}`);
      setReservations(data.results);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const changeStatus = async (code, status) => {
    if (status === 'cancelled' && !window.confirm(`¿Cancelar la reserva ${code}?`)) return;
    setError(null);
    try {
      const data = await api.patch(`/admin/reservations/${code}/status`, { status });
      setReservations((list) => list.map((r) => (r.code === code ? data.reservation : r)));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <>
      <div className="panel-toolbar">
        <div className="panel-search">
          <Search size={15} />
          <input
            placeholder="Código, matrícula, titular o email"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>
        <select value={filters.status} onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}>
          <option value="">Todos los estados</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <input type="date" value={filters.date} onChange={(e) => setFilters((f) => ({ ...f, date: e.target.value }))} />
      </div>
      {error && <p className="form-alert">{error}</p>}
      {loading ? (
        <div className="state-block"><Spinner label="Cargando reservas" /></div>
      ) : (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Código</th>
                <th>Cliente</th>
                <th>Parking</th>
                <th>Vehículo</th>
                <th>Entrada / salida</th>
                <th>Importe</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {reservations.map((r) => (
                <tr key={r.id}>
                  <td className="mono">{r.code}</td>
                  <td>
                    {r.holder.name}
                    <small>{r.userEmail}</small>
                  </td>
                  <td>
                    {r.parkingName}
                    <small>{r.parkingCity}</small>
                  </td>
                  <td>
                    <strong className="mono">{r.vehicle.plate}</strong>
                    <small>{CAR_TYPES.find((t) => t.value === r.vehicle.type)?.label}</small>
                  </td>
                  <td>
                    {formatDateTime(r.entryAt)}
                    <small>{formatDateTime(r.exitAt)}</small>
                  </td>
                  <td>
                    {formatPrice(r.totalPrice)}
                    <small>
                      {r.hours} h × {r.spots}
                    </small>
                  </td>
                  <td>
                    <span className={`status-badge status-badge--${r.status}`}>{STATUS_LABELS[r.status]}</span>
                  </td>
                  <td className="actions">
                    {r.status === 'confirmed' && (
                      <button type="button" className="btn btn--outline btn--xs" onClick={() => changeStatus(r.code, 'completed')}>
                        Finalizar
                      </button>
                    )}
                    {r.status === 'confirmed' && (
                      <button type="button" className="btn btn--ghost btn--xs danger" onClick={() => changeStatus(r.code, 'cancelled')}>
                        Cancelar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {reservations.length === 0 && <p className="muted">No hay reservas con estos filtros.</p>}
        </div>
      )}
    </>
  );
}

/* --------------------------------------------------------------------- Page */

export default function AdminPage() {
  const [tab, setTab] = useState('summary');

  return (
    <div className="panel-page">
      <div className="container">
        <header className="page-head page-head--row">
          <div>
            <span className="section__eyebrow">Administración</span>
            <h1>
              <LayoutDashboard size={26} /> Panel de administración
            </h1>
            <p>Gestiona los parkings, sus precios y servicios, los usuarios y sus roles, y consulta las estadísticas.</p>
          </div>
        </header>

        <div className="tabs tabs--panel" role="tablist">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              className={`tabs__item${tab === key ? ' is-active' : ''}`}
              onClick={() => setTab(key)}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        <div className="panel-body">
          {tab === 'summary' && <SummaryTab />}
          {tab === 'parkings' && <ParkingsTab />}
          {tab === 'services' && <ServicesTab />}
          {tab === 'users' && <UsersTab />}
          {tab === 'reservations' && <ReservationsTab />}
        </div>
      </div>
    </div>
  );
}
