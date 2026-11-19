import { useState } from 'react';
import { Link } from 'react-router-dom';
import { MapPinned, Mail, Phone, CheckCircle2 } from 'lucide-react';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = (event) => {
    event.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[a-zA-Z]{2,}$/.test(email)) return;
    setSubscribed(true);
    setEmail('');
  };

  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div className="footer__brand">
          <Link to="/" className="brand brand--on-dark">
            <span className="brand__mark">P</span>
            <span className="brand__text">
              Aui<span className="brand__text-accent">Park</span>
            </span>
          </Link>
          <p className="footer__about">
            Encuentra, compara y reserva plazas de parking cercanas en un mapa interactivo.
            Precio cerrado, confirmación instantánea y cancelación gratuita hasta 1 h antes.
          </p>
          <div className="footer__contact">
            <span>
              <Mail size={15} /> hola@auipark.es
            </span>
            <span>
              <Phone size={15} /> +34 900 123 456
            </span>
          </div>
        </div>

        <div className="footer__col">
          <h4>Producto</h4>
          <Link to="/mapa">Explorar mapa</Link>
          <Link to="/reservas">Mis reservas</Link>
          <Link to="/mapa?type=underground">Parkings cubiertos</Link>
          <Link to="/mapa?type=surface">Parkings al aire libre</Link>
        </div>

        <div className="footer__col">
          <h4>Empresa</h4>
          <Link to="/#como-funciona">Cómo funciona</Link>
          <Link to="/#ventajas">Ventajas</Link>
          <Link to="/#faq">Preguntas frecuentes</Link>
          <Link to="/#contacto">Contacto</Link>
        </div>

        <div className="footer__col footer__col--newsletter">
          <h4>Newsletter</h4>
          <p>Novedades, ciudades nuevas y ofertas de parking.</p>
          {subscribed ? (
            <p className="footer__ok">
              <CheckCircle2 size={16} /> ¡Gracias! Te has suscrito.
            </p>
          ) : (
            <form className="footer__form" onSubmit={handleSubscribe}>
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-label="Correo electrónico"
              />
              <button type="submit" className="btn btn--accent btn--sm">
                Unirme
              </button>
            </form>
          )}
        </div>
      </div>

      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} AuiPark. Todos los derechos reservados.</span>
        <span className="footer__legal">
          Mapa © OpenStreetMap contributors
        </span>
        <span className="footer__made">
          Hecho con <MapPinned size={13} /> en España
        </span>
      </div>
    </footer>
  );
}
