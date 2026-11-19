import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { UserPlus } from 'lucide-react';
import Spinner from '../components/ui/Spinner.jsx';
import { useAuth } from '../controllers/AuthContext.jsx';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/;
const PHONE_REGEX = /^(\+34)?[6-9]\d{8}$/;

function validate(form) {
  const errors = {};
  if (form.name.trim().length < 3) errors.name = 'Indica tu nombre y apellidos';
  if (!EMAIL_REGEX.test(form.email.trim())) errors.email = 'El email no es válido';
  const phone = form.phone.replace(/[\s-]/g, '');
  if (phone && !PHONE_REGEX.test(phone)) errors.phone = 'Móvil español no válido (ej. 612 345 678)';
  if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) {
    errors.password = 'Mínimo 8 caracteres, con letras y números';
  }
  if (form.password2 !== form.password) errors.password2 = 'Las contraseñas no coinciden';
  if (!form.acceptTerms) errors.acceptTerms = 'Debes aceptar las condiciones de uso';
  return errors;
}

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const next = searchParams.get('next');

  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', password2: '', acceptTerms: false });
  const [errors, setErrors] = useState({});
  const [serverError, setServerError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [pendingEmail, setPendingEmail] = useState(null);

  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (event) => {
    event.preventDefault();
    setServerError(null);
    const validation = validate(form);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setSubmitting(true);
    try {
      const result = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.replace(/[\s-]/g, ''),
        password: form.password,
      });
      if (result?.needsConfirmation) {
        setPendingEmail(form.email.trim());
        return;
      }
      navigate(next && next.startsWith('/') ? next : '/mapa', { replace: true });
    } catch (err) {
      setServerError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (key, label, props = {}) => (
    <div className={`field ${errors[key] ? 'field--error' : ''}`}>
      <label>
        {label}
        <input value={form[key]} onChange={(e) => set(key, e.target.value)} {...props} />
      </label>
      {errors[key] && <span className="field__error">{errors[key]}</span>}
    </div>
  );

  if (pendingEmail) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <header className="auth-card__head">
            <span className="auth-card__icon">
              <UserPlus size={22} />
            </span>
            <h1>Revisa tu correo</h1>
            <p>
              Te hemos enviado un enlace de confirmación a <strong>{pendingEmail}</strong>. Ábrelo y después inicia
              sesión.
            </p>
          </header>
          <Link to="/login" className="btn btn--primary btn--block">
            Ir a iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card auth-card--wide">
        <header className="auth-card__head">
          <span className="auth-card__icon">
            <UserPlus size={22} />
          </span>
          <h1>Crear cuenta</h1>
          <p>Regístrate para reservar plazas y gestionar tus reservas.</p>
        </header>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          {field('name', 'Nombre y apellidos', { autoComplete: 'name', placeholder: 'Laura García Sánchez' })}
          <div className="form-grid">
            {field('email', 'Email', { type: 'email', autoComplete: 'email', placeholder: 'laura@email.com' })}
            {field('phone', 'Teléfono móvil (opcional)', { type: 'tel', autoComplete: 'tel', placeholder: '612 345 678' })}
            {field('password', 'Contraseña', { type: 'password', autoComplete: 'new-password' })}
            {field('password2', 'Repite la contraseña', { type: 'password', autoComplete: 'new-password' })}
          </div>

          <div className={`checkbox${errors.acceptTerms ? ' field--error' : ''}`}>
            <input
              id="regTerms"
              type="checkbox"
              checked={form.acceptTerms}
              onChange={(e) => set('acceptTerms', e.target.checked)}
            />
            <label htmlFor="regTerms">Acepto las condiciones de uso y la política de privacidad de AuiPark.</label>
          </div>
          {errors.acceptTerms && <span className="field__error">{errors.acceptTerms}</span>}

          {serverError && (
            <p className="form-alert" role="alert">
              {serverError}
            </p>
          )}

          <button type="submit" className="btn btn--accent btn--lg btn--block" disabled={submitting}>
            {submitting ? <Spinner size="sm" label="Creando cuenta" /> : <UserPlus size={18} />}
            {submitting ? 'Creando cuenta…' : 'Crear cuenta'}
          </button>
        </form>

        <p className="auth-card__switch">
          ¿Ya tienes cuenta? <Link to={`/login${next ? `?next=${encodeURIComponent(next)}` : ''}`}>Inicia sesión</Link>
        </p>
      </div>
    </div>
  );
}
