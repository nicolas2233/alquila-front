# DomusBrag - Front

App web (Vite + React + Tailwind).

## Requisitos
- Node.js 18+ (recomendado 20)

## Setup local
1) Instalar deps
- `npm install`

2) Variables de entorno
- Crear `front/.env` desde `front/.env.example`

3) Levantar
- `npm run dev`

## Scripts
- `npm run dev`
- `npm run seo:sitemap` (genera `public/sitemap.xml` usando la API)
- `npm run seo:sitemap:strict` (falla si no puede leer la API)
- `npm run build`
- `npm run preview`

## Deploy en Railway
- Root Directory: `front`
- Build Command: `npm install && npm run build`
- Start Command: `npm run preview -- --host 0.0.0.0 --port $PORT`
- Variables:
  - `VITE_API_URL=https://TU_BACK_URL/api`
  - `VITE_SITE_URL=https://TU_DOMINIO`

## Notas
- El mapa usa Leaflet y esta encapsulado en `src/shared/map/MapView.tsx` para facilitar cambio a Mapbox.
- SEO base implementado: `title/description` dinamicos, `og/twitter`, `canonical`, `robots.txt` y `sitemap.xml`.
- Para sitemap con URLs reales (agencias/publicaciones), ejecuta `npm run seo:sitemap` con `VITE_API_URL` y `VITE_SITE_URL` configurados.
- `npm run build` ya ejecuta sitemap automaticamente via `prebuild` (modo tolerante).
