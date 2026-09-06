// Servidor de producción del front.
//
// Hasta acá el `dist` lo servía el estático de Railway, que no deja configurar
// cabeceras. Eso dejaba el sitio sin HSTS y sin proteccion contra clickjacking
// (cualquiera podia embeberlo en un iframe, con login incluido). Esta capa,
// ademas, resuelve dos cosas que necesitan estar en el MISMO dominio:
//
//   - /sitemap.xml    -> el dinamico del backend. Declararlo cross-domain en
//                        robots.txt no sirve: Google ignora sitemaps de otro
//                        dominio salvo que ambos esten verificados.
//   - /publicacion/*  -> para los bots de preview (WhatsApp, Facebook, X...),
//                        el HTML con OG reales del backend. Esos bots no ejecutan
//                        JavaScript, asi que del SPA solo leen el index vacio.
import path from "node:path";
import { fileURLToPath } from "node:url";
import compression from "compression";
import express from "express";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const distDir = path.join(__dirname, "..", "dist");
const port = Number(process.env.PORT) || 4173;
const apiUrl = (process.env.API_URL ?? "https://alquila-back-production.up.railway.app/api").replace(
  /\/+$/,
  ""
);

// Bots de preview social: no ejecutan JS, necesitan el HTML con OG ya resuelto.
// Googlebot y Bingbot quedan afuera a proposito: renderizan JS y deben ver el SPA,
// que ya declara canonical y JSON-LD propios.
const PREVIEW_BOTS =
  /facebookexternalhit|facebookcatalog|WhatsApp|Twitterbot|Slackbot|LinkedInBot|TelegramBot|Discordbot|Pinterest|SkypeUriPreview|redditbot|vkShare|Iframely|embedly/i;

const app = express();
app.disable("x-powered-by");
app.use(compression());

// --- Cabeceras de seguridad --------------------------------------------------
// El CSP va partido en dos a proposito:
//
//   1. Enforced, solo las directivas de riesgo cero. `frame-ancestors 'none'` es
//      lo que corta el clickjacking; no afecta a los iframes que la propia app
//      abre (eso es frame-src).
//   2. Report-Only con la politica completa de recursos. El front habla con
//      bastantes hosts externos (mapas, fuentes, Cloudinary, MercadoPago,
//      PostHog, geocoding), asi que activarla de una podria romper algo en
//      silencio. Revisar la consola unos dias y, cuando no reporte nada, mover
//      el valor de `resourcePolicy` a la cabecera enforced de arriba.
const enforcedPolicy = ["frame-ancestors 'none'", "base-uri 'self'", "object-src 'none'"].join("; ");

// El checkout salta entre dominios de MercadoPago y MercadoLibre segun el pais y el medio
// de pago. Cada TLD se lista con y sin comodin: en CSP `*.mercadopago.com` no matchea el
// dominio desnudo `mercadopago.com` ni otro TLD como `mercadopago.com.ar`.
const MERCADOPAGO_ORIGINS = [
  "https://mercadopago.com",
  "https://*.mercadopago.com",
  "https://mercadopago.com.ar",
  "https://*.mercadopago.com.ar",
  "https://mercadolibre.com",
  "https://*.mercadolibre.com",
  "https://mercadolibre.com.ar",
  "https://*.mercadolibre.com.ar",
].join(" ");

const resourcePolicy = [
  "default-src 'self'",
  // 'unsafe-inline' es necesario mientras el SDK de MercadoPago inyecte estilos.
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "script-src 'self' https://sdk.mercadopago.com",
  "img-src 'self' data: blob: https://res.cloudinary.com https://images.unsplash.com https://ui-avatars.com https://*.tile.openstreetmap.org https://*.basemaps.cartocdn.com https://server.arcgisonline.com",
  `connect-src 'self' ${new URL(apiUrl).origin} https://app.posthog.com https://nominatim.openstreetmap.org https://geocode.maps.co https://photon.komoot.io https://api.mercadopago.com`,
  // Los dominios regionales van explicitos: el comodin de `*.mercadopago.com` NO cubre
  // `mercadopago.com.ar`, que es el que usa el checkout en Argentina. Report-Only lo
  // detecto contra produccion; enforced habria roto el pago en silencio.
  `frame-src 'self' ${MERCADOPAGO_ORIGINS}`,
  `form-action 'self' ${MERCADOPAGO_ORIGINS}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

app.use((_req, res, next) => {
  res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "geolocation=(self), camera=(), microphone=(), payment=(self)");
  res.setHeader("Content-Security-Policy", enforcedPolicy);
  res.setHeader("Content-Security-Policy-Report-Only", resourcePolicy);
  next();
});

// --- Sitemap dinamico --------------------------------------------------------
// Va antes del estatico para que responda el del backend (con las propiedades
// activas al dia) y no un archivo generado en build time, que queda viejo apenas
// se publica algo nuevo.
app.get("/sitemap.xml", async (_req, res) => {
  try {
    const upstream = await fetch(`${apiUrl}/sitemap.xml`, {
      headers: { Accept: "application/xml" },
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
    res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(await upstream.text());
  } catch (error) {
    console.error("[sitemap] no se pudo obtener del backend:", error);
    // Sin sitemap es preferible un 503 (Google reintenta) a un XML vacio, que le
    // diria que el sitio no tiene ninguna URL.
    res.status(503).type("text/plain").send("sitemap temporalmente no disponible");
  }
});

// --- Preview social de las fichas -------------------------------------------
// Solo para los bots de la lista: el resto (personas y buscadores que ejecutan JS)
// sigue recibiendo el SPA. La URL es la misma en los dos casos, y el HTML del
// backend declara el mismo canonical, asi que no hay contenido divergente.
app.get(/^\/publicaci[oó]n\/(.+)$/, async (req, res, next) => {
  const userAgent = req.get("user-agent") ?? "";
  if (!PREVIEW_BOTS.test(userAgent)) return next();

  const slugId = req.params[0];
  try {
    const upstream = await fetch(`${apiUrl}/share/publicacion/${encodeURIComponent(slugId)}`, {
      headers: { Accept: "text/html" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (!upstream.ok) throw new Error(`HTTP ${upstream.status}`);
    res.type("text/html").set("Cache-Control", "public, max-age=300").send(await upstream.text());
  } catch (error) {
    console.error("[share] no se pudo obtener la preview:", error);
    next(); // que el bot reciba el SPA antes que un error
  }
});

// --- Estaticos ---------------------------------------------------------------
// Los assets de Vite llevan hash en el nombre: cachearlos para siempre es seguro
// y evita revalidar en cada visita.
app.use(
  "/assets",
  express.static(path.join(distDir, "assets"), {
    immutable: true,
    maxAge: "1y",
    fallthrough: false,
  })
);

// El resto de public/ (favicon, robots.txt) cambia sin cambiar de nombre.
app.use(express.static(distDir, { index: false, maxAge: "1h" }));

// --- Fallback del SPA --------------------------------------------------------
// index.html nunca se cachea: es lo que apunta a los assets con hash nuevo.
app.get(/.*/, (_req, res) => {
  res.set("Cache-Control", "no-cache").sendFile(path.join(distDir, "index.html"));
});

app.listen(port, () => {
  console.log(`[front] escuchando en :${port} — API ${apiUrl}`);
});
