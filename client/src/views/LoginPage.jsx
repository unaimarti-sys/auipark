import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { LogIn, Mail, Lock } from 'lucide-react';
import Spinner from '../components/ui/Spinner.jsx';
import { useAuth, homeForRole } from '../controllers/AuthContext.jsx';

const DEMO_ACCOUNTS = [
  { label: 'Cliente', email: 'cliente@auipark.com', password: 'Cliente1234!' },
  { label: 'Empleado', email: 'empleado@auipark.com', password: 'Empleado1234!' },
  { label: 'Admin', email: 'admin@auipark.com', password: 'Admin1234!' },
];

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError(null);
    if (!form.email.trim() || !form.password) {
      setError('Introduce tu email y tu contraseña');
      return;
    }
    setSubmitting(true);
    try {
      const user = await login(form.email.trim(), form.password);
      navigate(next && next.startsWith('/') ? next : homeForRole(user.role), { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <header className="auth-card__head">
          <span className="auth-card__icon">
            <LogIn size={22} />
          </span>
          <h1>Iniciar sesión</h1>
          <p>
            {next?.startsWith('/reservar')
              ? 'Inicia sesión para completar tu reserva.'
              : 'Accede a tu cuenta de AuiPark.'}
          </p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <div className="field">
            <label>
              Email
              <span className="input-icon">
                <Mail size={16} />
                <input
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  placeholder="tu@email.com"
                  onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                />
              </span>
            </label>
          </div>
          <div className="field">
            <label>
              Contraseña
              <span className="input-icon">
                <Lock size={16} />
                <input
                  type="password"
                  autoComplete="current-password"
                  value={form.password}
                  placeholder="••••••••"
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                />
              </span>
            </label>
          </div>

          {error && (
            <p className="form-alert" role="alert">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn--primary btn--lg btn--block" disabled={submitting}>
            {submitting ? <Spinner size="sm" label="Entrando" /> : <LogIn size={18} />}
            {submitting ? 'Entrando…' : 'Entrar'}
          </button>
        </form>

        <p className="auth-card__switch">
          ¿No tienes cuenta?{' '}
          <Link to={`/registro${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Regístrate gratis</Link>
        </p>

        <div className="auth-demo">
          <span>Cuentas de demostración</span>
          <div>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => setForm({ email: acc.email, password: acc.password })}
              >
                {acc.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
