// Punto de entrada de Vercel: la app Express se ejecuta como función serverless.
// vercel.json redirige todas las rutas /api/* a esta función.
import app from '../server/app.js';

export default app;
