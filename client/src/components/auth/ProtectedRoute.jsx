import { Link, Navigate, useLocation } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';
import Spinner from '../ui/Spinner.jsx';
import { useAuth, homeForRole } from '../../controllers/AuthContext.jsx';

/**
 * Protege una vista: sin sesión redirige al login (recordando la página de origen);
 * con un rol no permitido muestra un aviso de acceso denegado.
 */
export default function ProtectedRoute({ roles, children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="state-block state-block--page">
        <Spinner label="Comprobando sesión" />
      </div>
    );
  }

  if (!user) {
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (roles && !roles.includes(user.role)) {
    return (
      <div className="state-block state-block--page">
        <ShieldAlert size={34} />
        <h1>Acceso restringido</h1>
        <p>Tu cuenta no tiene permisos para ver esta sección.</p>
        <Link to={homeForRole(user.role)} className="btn btn--primary">
          Ir a mi área
        </Link>
      </div>
    );
  }

  return children;
}
