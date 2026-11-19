import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, MapPinned, LogIn, LogOut, ChevronDown, UserCircle2, LayoutDashboard, ClipboardList, Ticket } from 'lucide-react';
import { useAuth, ROLE_LABELS } from '../../controllers/AuthContext.jsx';

export function Logo({ compact = false }) {
  return (
    <Link to="/" className="brand" aria-label="AuiPark - Inicio">
      <span className="brand__mark" aria-hidden="true">
        P
      </span>
      {!compact && (
        <span className="brand__text">
          Aui<span className="brand__text-accent">Park</span>
        </span>
      )}
    </Link>
  );
}

function navLinksFor(user) {
  const links = [
    { to: '/', label: 'Inicio', end: true },
    { to: '/mapa', label: 'Explorar mapa' },
  ];
  if (user) links.push({ to: '/reservas', label: 'Mis reservas' });
  if (user?.role === 'empleado') links.push({ to: '/empleado', label: 'Panel empleado' });
  if (user?.role === 'admin') links.push({ to: '/admin', label: 'Administración' });
  return links;
}

function UserMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  const initials = user.name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu__trigger" onClick={() => setOpen((v) => !v)} aria-expanded={open}>
        <span className={`user-menu__avatar user-menu__avatar--${user.role}`}>{initials}</span>
        <span className="user-menu__name">{user.name.split(' ')[0]}</span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="user-menu__dropdown" role="menu">
          <div className="user-menu__info">
            <strong>{user.name}</strong>
            <small>{user.email}</small>
            <span className={`role-badge role-badge--${user.role}`}>{ROLE_LABELS[user.role]}</span>
          </div>
          <Link to="/reservas" onClick={() => setOpen(false)} role="menuitem">
            <Ticket size={15} /> Mis reservas
          </Link>
          {user.role === 'empleado' && (
            <Link to="/empleado" onClick={() => setOpen(false)} role="menuitem">
              <ClipboardList size={15} /> Panel de empleado
            </Link>
          )}
          {user.role === 'admin' && (
            <Link to="/admin" onClick={() => setOpen(false)} role="menuitem">
              <LayoutDashboard size={15} /> Administración
            </Link>
          )}
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onLogout();
            }}
          >
            <LogOut size={15} /> Cerrar sesión
          </button>
        </div>
      )}
    </div>
  );
}

export default function Header() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const close = () => setOpen(false);
  const handleLogout = async () => {
    await logout();
    close();
    navigate('/');
  };

  return (
    <header className="header">
      <div className="container header__inner">
        <Logo />

        <nav className={`header__nav ${open ? 'is-open' : ''}`} aria-label="Navegación principal">
          {navLinksFor(user).map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.end}
              className={({ isActive }) => `header__link${isActive ? ' is-active' : ''}`}
              onClick={close}
            >
              {link.label}
            </NavLink>
          ))}
          {!user && (
            <Link to="/login" className="header__link header__login-mobile" onClick={close}>
              <LogIn size={16} /> Iniciar sesión
            </Link>
          )}
          {user && (
            <button type="button" className="header__link header__login-mobile" onClick={handleLogout}>
              <LogOut size={16} /> Cerrar sesión
            </button>
          )}
          <Link to="/mapa" className="btn btn--primary btn--sm header__cta-mobile" onClick={close}>
            <MapPinned size={16} /> Reservar plaza
          </Link>
        </nav>

        <div className="header__actions">
          {user ? (
            <UserMenu user={user} onLogout={handleLogout} />
          ) : (
            <>
              <Link to="/login" className="btn btn--ghost btn--sm header__cta">
                <UserCircle2 size={16} /> Iniciar sesión
              </Link>
              <Link to="/registro" className="btn btn--primary btn--sm header__cta">
                Registrarse
              </Link>
            </>
          )}
          <button
            type="button"
            className="header__burger"
            aria-label={open ? 'Cerrar menú' : 'Abrir menú'}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>
      {open && <div className="header__backdrop" onClick={close} aria-hidden="true" />}
      <span className="sr-only" aria-live="polite">
        Ruta actual: {location.pathname}
      </span>
    </header>
  );
}
