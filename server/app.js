import express from 'express';
import { assertConfig } from './config.js';
import { loadUser } from './middlewares/auth.js';
import { HttpError } from './errors.js';
import routes from './routes.js';

assertConfig();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', true);
app.use(express.json({ limit: '100kb' }));

// Sin caché para las respuestas de la API
app.use((_req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

app.use(loadUser);
app.use('/api', routes);

app.use((_req, _res, next) => next(new HttpError(404, 'Ruta no encontrada')));

// Manejador de errores: mensaje controlado al cliente, detalle solo en el log
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'JSON no válido' });
  const status = err.status || 500;
  if (status >= 500) console.error('[AuiPark]', err);
  res.status(status).json({ error: status >= 500 ? 'Error interno del servidor' : err.message, fields: err.fields });
});

export default app;
