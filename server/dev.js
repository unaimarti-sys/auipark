// Servidor local para desarrollo: npm run dev (lee el fichero .env)
import app from './app.js';

const port = Number(process.env.PORT) || 4000;
app.listen(port, () => console.log(`API AuiPark en http://localhost:${port}/api/health`));
