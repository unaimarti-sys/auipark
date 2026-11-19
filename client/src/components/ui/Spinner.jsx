export default function Spinner({ label = 'Cargando…', size = 'md' }) {
  return (
    <span className={`spinner spinner--${size}`} role="status" aria-live="polite">
      <span className="spinner__circle" aria-hidden="true" />
      <span className="sr-only">{label}</span>
    </span>
  );
}
