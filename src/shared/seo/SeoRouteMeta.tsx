import { useMemo } from "react";
import { useLocation } from "react-router-dom";
import { useSeo } from "./useSeo";

function getRouteSeo(pathname: string) {
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
  if (pathname.startsWith("/agencia/")) {
    return {
      title: "Perfil de inmobiliaria",
      description: "Perfil público de inmobiliaria en Bragado con cartera de inmuebles y contacto.",
      canonicalPath: pathname,
      noindex: false,
    };
  }
  if (pathname.startsWith("/publicacion/") || pathname.startsWith("/publicación/")) {
    return {
      title: "Ficha de inmueble",
      description: "Detalle de inmueble en DomusBrag con fotos, datos y contacto.",
      canonicalPath: pathname.replace("/publicación/", "/publicacion/"),
      noindex: false,
      type: "article" as const,
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
