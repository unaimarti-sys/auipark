# AuiPark · Reserva de parkings (Sprint 2)

Aplicación web para encontrar parkings en un mapa y reservar una plaza con cálculo automático del precio.

| Parte | Tecnología |
|-------|------------|
| Frontend | React 18 + Vite (MVC: views / controllers / models), React Router, Leaflet + OpenStreetMap |
| API | Node 20 + Express (función serverless de Vercel: `api/index.js`) |
| Base de datos y login | Supabase (PostgreSQL + Supabase Auth) |
| Despliegue | Vercel (frontend + API en el mismo dominio) |
| Infraestructura (Docker) | Apache2 + PHP 8.3 + SSL autofirmado (estado + proxy `/app/`), Zabbix 7.0, backup diario con `pg_dump` |

**Roles:** cliente (reserva, ve y cancela sus reservas) · empleado (reservas de su parking y registro de salida) ·
admin (parkings, precios, servicios, usuarios, roles y estadísticas).

## Estructura

```
auipark/
├── api/index.js          Entrada de la función serverless (exporta la app Express)
├── server/               API Express (MVC): routes, controllers, models (SQL), middlewares (auth), services
├── client/               Frontend React (Vite)
├── supabase/             schema.sql · seed.sql · seed_demo.sql
├── infra/                docker-compose.yml · apache/ (Dockerfile, VirtualHost, página PHP) · backup/
└── vercel.json           build, función /api y reescrituras de la SPA
```

## Variables de entorno (Vercel → Settings → Environment Variables)

| Variable | Valor |
|----------|-------|
| `DATABASE_URL` | Supabase → Connect → *Transaction pooler* (puerto 6543) con la contraseña de la BD |
| `SUPABASE_URL` | `https://qlkwgwpkvflcwepmezbw.supabase.co` |
| `SUPABASE_SECRET_KEY` | Supabase → Project Settings → API Keys → *Secret key* |

Las variables públicas del frontend están en `client/.env.production` (URL y *publishable key*).

## Base de datos

En Supabase → SQL Editor ejecutar `supabase/schema.sql` y `supabase/seed.sql`.
Después crear los usuarios de prueba (Authentication → Users → Add user) y ejecutar `supabase/seed_demo.sql`.

## Desarrollo local

```bash
npm install && npm install --prefix client
cp .env.example .env            # rellenar
npm run dev                     # API en http://localhost:4000
npm run dev:client              # web en http://localhost:5173
```

## Infraestructura Docker

```bash
cd infra
cp .env.example .env            # VERCEL_HOST, SUPABASE_DB_URL (session pooler) y ZABBIX_DB_PASSWORD
docker compose up -d --build
```

- Estado del servidor: https://localhost · App a través del proxy: https://localhost/app/
- Zabbix: http://localhost:8081 (usuario inicial `Admin` / `zabbix`)
- Copias: `infra/backups/auipark_AAAA-MM-DD_HHMM.sql.gz`
