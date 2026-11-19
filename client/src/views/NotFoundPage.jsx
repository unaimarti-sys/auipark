import { Link } from 'react-router-dom';
import { MapPinned } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="state-block state-block--page">
      <span className="notfound-code">404</span>
      <h1>Página no encontrada</h1>
      <p>La ruta que buscas no existe o ha cambiado de dirección.</p>
      <Link to="/" className="btn btn--primary">
        <MapPinned size={17} /> Volver al inicio
      </Link>
    </div>
  );
}
