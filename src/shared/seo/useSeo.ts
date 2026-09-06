import { useEffect } from "react";
import type { SeoConfig } from "./seo";
import { applySeo } from "./seo";

/**
 * Escribe los meta tags en el <head>.
 *
 * Con `null` no hace nada. Eso permite que las rutas cuyo SEO depende de datos que
 * se cargan (ficha de inmueble, perfil de inmobiliaria) lo resuelvan desde su propia
 * página: si el SEO por ruta también escribiera, ambos llamarían a `applySeo` sobre
 * el mismo <head> y ganaría el último en ejecutarse, que no siempre es el que tiene
 * los datos reales.
 */
export function useSeo(config: SeoConfig | null) {
  useEffect(() => {
    if (!config) return;
    applySeo(config);
  }, [
    config?.title,
    config?.description,
    config?.canonicalPath,
    config?.image,
    config?.type,
    config?.noindex,
    JSON.stringify(config?.structuredData ?? null),
  ]);
}
