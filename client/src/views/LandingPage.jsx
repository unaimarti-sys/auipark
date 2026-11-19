import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Map as MapIcon,
  Clock3,
  BadgeEuro,
  CalendarCheck2,
  ShieldCheck,
  Headphones,
  Search,
  Route,
  CreditCard,
  ArrowRight,
  Quote,
  ChevronDown,
  Navigation,
} from 'lucide-react';
import SearchBox from '../components/ui/SearchBox.jsx';
import ParkingCard from '../components/ui/ParkingCard.jsx';
import Spinner from '../components/ui/Spinner.jsx';
import { api } from '../services/api.js';

const FEATURES = [
  {
    icon: MapIcon,
    title: 'Mapa en vivo',
    text: 'Visualiza todos los parkings cercanos con disponibilidad, precio y servicios sobre un mapa interactivo.',
  },
  {
    icon: Clock3,
    title: 'Reserva en 30 segundos',
    text: 'Elige plaza, indica los datos de tu coche y recibe la confirmación al instante con tu código de reserva.',
  },
  {
    icon: BadgeEuro,
    title: 'Precio cerrado',
    text: 'Ves el coste total antes de confirmar: sin sorpresas ni cargos ocultos al salir del parking.',
  },
  {
    icon: CalendarCheck2,
    title: 'Cancelación flexible',
    text: '¿Cambiaron tus planes? Cancela gratis hasta 1 hora antes de la entrada y recuperamos la plaza.',
  },
  {
    icon: ShieldCheck,
    title: 'Parkings verificados',
    text: 'Toda la información procede de fuentes cartográficas reales y se actualiza de forma continua.',
  },
  {
    icon: Headphones,
    title: 'Soporte 24/7',
    text: 'Un equipo real disponible cualquier día del año para ayudarte con tu reserva o tu vehículo.',
  },
];

const STEPS = [
  {
    icon: Search,
    title: 'Busca tu zona',
    text: 'Escribe una dirección o usa tu ubicación para ver en el mapa todos los parkings disponibles cerca de ti.',
  },
  {
    icon: Route,
    title: 'Compara opciones',
    text: 'Filtra por tipo, precio o servicios y elige el parking que mejor encaje con tu trayecto.',
  },
  {
    icon: CreditCard,
    title: 'Reserva y aparca',
    text: 'Rellena el formulario con los datos de tu coche y del titular: recibirás tu código de reserva al instante.',
  },
];

const TESTIMONIALS = [
  {
    name: 'Marta Ruiz',
    role: 'Conductora habitual · Madrid',
    text: 'Dejé de dar vueltas buscando sitio en el centro. Llego, aparco y me voy. La reserva me ahorra medio día de estrés.',
  },
  {
    name: 'Jordi Pujol',
    role: 'Vendedor comercial · Barcelona',
    text: 'Viajo cada semana por trabajo y necesito plazas cubiertas con acceso rápido. AuiPark es ahora mi primera parada.',
  },
  {
    name: 'Lucía Gómez',
    role: 'Familia con niños · Valencia',
    text: 'Ver el precio total antes de salir de casa marca la diferencia. Además cancelé una vez y fue inmediato.',
  },
];

const FAQS = [
  {
    q: '¿Necesito crear una cuenta para reservar?',
    a: 'No. Solo pedimos los datos del titular y del vehículo para asignar tu plaza. Podrás consultar tus reservas con tu email y el código recibido.',
  },
  {
    q: '¿Puedo cancelar mi reserva?',
    a: 'Sí, de forma gratuita hasta 1 hora antes de la hora de entrada desde la sección "Mis reservas".',
  },
  {
    q: '¿Qué datos del coche debo indicar?',
    a: 'El tipo de vehículo, la matrícula y el titular. Opcionalmente puedes añadir marca, modelo y color para facilitar el acceso.',
  },
  {
    q: '¿Los precios incluyen impuestos?',
    a: 'Sí, todos los precios mostrados son por hora e incluyen IVA. Verás el importe total calculado antes de confirmar.',
  },
];

const CITIES = [
  { name: 'Barcelona', lat: 41.3874, lon: 2.1686 },
  { name: 'Madrid', lat: 40.4168, lon: -3.7038 },
  { name: 'Valencia', lat: 39.4699, lon: -0.3763 },
  { name: 'Sevilla', lat: 37.3891, lon: -5.9845 },
];

function FeatureCard({ icon: Icon, title, text }) {
  return (
    <article className="feature-card">
      <span className="feature-card__icon">
        <Icon size={22} />
      </span>
      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const [featured, setFeatured] = useState([]);
  const [loadingFeatured, setLoadingFeatured] = useState(true);

  const [nearMe, setNearMe] = useState(false);

  // Rail «mejor valorados cerca de ti»: usa la ubicación del navegador si se permite
  useEffect(() => {
    let cancelled = false;
    const loadTop = async (coords) => {
      try {
        let results = [];
        if (coords) {
          const data = await api.get(`/parkings?lat=${coords.lat}&lon=${coords.lon}&radius=15000&sort=rating&limit=6`);
          results = data.results || [];
        }
        if (results.length === 0) {
          const data = await api.get('/parkings?sort=rating&limit=6');
          results = data.results || [];
        }
        if (!cancelled) {
          setNearMe(Boolean(coords) && results.some((p) => p.distance != null && p.distance <= 15000));
          setFeatured(results);
        }
      } catch {
        if (!cancelled) setFeatured([]);
      } finally {
        if (!cancelled) setLoadingFeatured(false);
      }
    };
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => loadTop({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
        () => loadTop(null),
        { timeout: 5000, maximumAge: 300000 }
      );
    } else {
      loadTop(null);
    }
    return () => {
      cancelled = true;
    };
  }, []);

  const goToLocation = (result) => {
    if (!result) {
      navigate('/mapa');
      return;
    }
    navigate(`/mapa?lat=${result.lat}&lon=${result.lon}&name=${encodeURIComponent(result.name)}`);
  };

  const goToCity = (city) => {
    navigate(`/mapa?lat=${city.lat}&lon=${city.lon}&name=${encodeURIComponent(city.name)}`);
  };

  return (
    <>
      <section className="hero">
        <div className="hero__bg" aria-hidden="true" />
        <div className="container hero__inner">
          <div className="hero__content">
            <span className="hero__badge">
              <Navigation size={14} /> Reserva de parkings en tiempo real
            </span>
            <h1>
              Tu plaza de parking,
              <br />
              <span>lista antes de llegar</span>
            </h1>
            <p className="hero__subtitle">
              Explora un mapa con todos los parkings cercanos, compara precios y servicios y reserva
              tu plaza en segundos rellenando un simple formulario. Confirmación inmediata, sin colas.
            </p>

            <SearchBox onPick={goToLocation} placeholder="¿A dónde vas? Ej. Plaça de Catalunya, Barcelona" />

            <div className="hero__cities">
              <span>Ciudades destacadas:</span>
              {CITIES.map((city) => (
                <button key={city.name} type="button" onClick={() => goToCity(city)}>
                  {city.name}
                </button>
              ))}
            </div>
          </div>

          <ul className="hero__stats">
            <li>
              <strong>240+</strong>
              <span>parkings conectados</span>
            </li>
            <li>
              <strong>4</strong>
              <span>ciudades activas</span>
            </li>
            <li>
              <strong>24/7</strong>
              <span>reservas abiertas</span>
            </li>
            <li>
              <strong>0 €</strong>
              <span>cancelación gratuita</span>
            </li>
          </ul>
        </div>
      </section>

      <section className="section" id="ventajas">
        <div className="container">
          <header className="section__head">
            <span className="section__eyebrow">Por qué AuiPark</span>
            <h2>Todo lo que necesitas para aparcar sin dudas</h2>
            <p>Diseñada para conductores que valoran su tiempo: información clara, precio cerrado y confirmación instantánea.</p>
          </header>
          <div className="features-grid">
            {FEATURES.map((feature) => (
              <FeatureCard key={feature.title} {...feature} />
            ))}
          </div>
        </div>
      </section>

      <section className="section section--alt" id="como-funciona">
        <div className="container">
          <header className="section__head">
            <span className="section__eyebrow">Cómo funciona</span>
            <h2>Reservar tu plaza en 3 pasos</h2>
            <p>Del mapa al código de reserva en menos de un minuto.</p>
          </header>
          <div className="steps">
            {STEPS.map((step, index) => (
              <article className="step" key={step.title}>
                <span className="step__number">{index + 1}</span>
                <span className="step__icon">
                  <step.icon size={22} />
                </span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
          <div className="section__cta">
            <Link to="/mapa" className="btn btn--primary btn--lg">
              Explorar el mapa <ArrowRight size={18} />
            </Link>
          </div>
        </div>
      </section>

      <section className="section" id="parkings">
        <div className="container">
          <header className="section__head section__head--row">
            <div>
              <span className="section__eyebrow">Mejor valorados</span>
              <h2>{nearMe ? 'Los parkings mejor valorados cerca de ti' : 'Los parkings mejor valorados por los conductores'}</h2>
            </div>
            <Link to="/mapa" className="btn btn--outline">
              Ver todos en el mapa <ArrowRight size={16} />
            </Link>
          </header>

          {loadingFeatured ? (
            <div className="state-block">
              <Spinner label="Cargando parkings destacados" />
            </div>
          ) : featured.length === 0 ? (
            <div className="state-block">
              <p>No pudimos cargar los parkings destacados. Prueba a explorar el mapa.</p>
              <Link to="/mapa" className="btn btn--primary">
                Ir al mapa
              </Link>
            </div>
          ) : (
            <div className="featured-rail">
              {featured.map((parking) => (
                <ParkingCard key={parking.id} parking={parking} />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="section section--alt" id="testimonios">
        <div className="container">
          <header className="section__head">
            <span className="section__eyebrow">Testimonios</span>
            <h2>Conductores que ya aparcan tranquilos</h2>
          </header>
          <div className="testimonials">
            {TESTIMONIALS.map((item) => (
              <figure className="testimonial" key={item.name}>
                <Quote size={22} className="testimonial__quote" />
                <blockquote>{item.text}</blockquote>
                <figcaption>
                  <strong>{item.name}</strong>
                  <span>{item.role}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container container--narrow">
          <header className="section__head">
            <span className="section__eyebrow">Preguntas frecuentes</span>
            <h2>Resolvemos tus dudas</h2>
          </header>
          <div className="faq">
            {FAQS.map((item) => (
              <details key={item.q} className="faq__item">
                <summary>
                  {item.q}
                  <ChevronDown size={18} />
                </summary>
                <p>{item.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="cta-banner" id="contacto">
        <div className="container cta-banner__inner">
          <div>
            <h2>¿Listo para aparcar sin buscar?</h2>
            <p>Encuentra tu plaza ahora y recibe la confirmación en tu email al instante.</p>
          </div>
          <div className="cta-banner__actions">
            <Link to="/mapa" className="btn btn--accent btn--lg">
              <MapIcon size={18} /> Reservar ahora
            </Link>
            <a href="mailto:hola@auipark.es" className="btn btn--ghost-light btn--lg">
              Hablar con soporte
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
