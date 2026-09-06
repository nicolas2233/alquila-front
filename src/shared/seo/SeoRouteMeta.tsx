import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import type { SeoConfig } from "./seo";
import { useSeo } from "./useSeo";

/**
 * Rutas cuyo SEO lo escribe la propia página, porque depende de datos que se cargan
 * (título real, foto, precio, JSON-LD). Acá devolvemos `null` para no pisarlas: las dos
 * fuentes llaman a `applySeo` sobre el mismo <head>, y la normalización de slug de la
 * ficha (`navigate(canonicalPath, { replace: true })`) cambia el pathname DESPUÉS de que
 * cargó la propiedad, así que el SEO por ruta corría último y dejaba el título genérico
 * y el <script type="application/ld+json"> vacío.
 */
const PAGE_OWNED_SEO_PREFIXES = ["/publicacion/", "/publicación/", "/agencia/"];

function getRouteSeo(pathname: string): SeoConfig | null {
  if (PAGE_OWNED_SEO_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return null;
  }
  if (pathname === "/") {
    return {
      title: "DomusBrag | Propiedades en Bragado",
      description:
        "Plataforma digital de publicaciones y contacto inmobiliario en Bragado para buscar, publicar y contactar propiedades en venta, alquiler y temporario.",
      canonicalPath: "/",
      noindex: false,
    };
  }
  if (pathname.startsWith("/buscar")) {
    return {
      title: "Buscar propiedades en Bragado",
      description:
        "Explora propiedades en Bragado con filtros claros, vista lista o cuadrícula y contacto rápido por WhatsApp.",
      canonicalPath: "/buscar",
      noindex: false,
    };
  }
  if (pathname.startsWith("/mapa")) {
    return {
      title: "Mapa de propiedades en Bragado",
      description:
        "Encuentra propiedades en Bragado en un mapa interactivo con filtros por operación, tipo, publicador y puntos de interés.",
      canonicalPath: "/mapa",
      noindex: false,
    };
  }
  if (
    pathname.startsWith("/panel") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/perfil") ||
    pathname.startsWith("/notificaciones") ||
    pathname.startsWith("/mis-solicitudes") ||
    pathname.startsWith("/busquedas") ||
    pathname.startsWith("/publicar") ||
    pathname.startsWith("/change-password")
  ) {
    return {
      title: "Panel privado",
      description: "Seccion privada de DomusBrag.",
      canonicalPath: pathname,
      noindex: true,
    };
  }
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/registro") ||
    pathname.startsWith("/recuperar") ||
    pathname.startsWith("/reset-password")
  ) {
    return {
      title: "Acceso",
      description: "Accede o crea tu cuenta en DomusBrag.",
      canonicalPath: pathname,
      noindex: true,
    };
  }
  return {
    title: "DomusBrag",
    description: "Plataforma digital de publicaciones y contacto inmobiliario en Bragado.",
    canonicalPath: pathname,
    noindex: false,
  };
}

export function SeoRouteMeta() {
  const location = useLocation();
  const config = useMemo(() => getRouteSeo(location.pathname), [location.pathname]);
  useSeo(config);
  return null;
}
