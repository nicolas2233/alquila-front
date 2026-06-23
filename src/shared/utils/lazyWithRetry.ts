import { lazy } from "react";
import type { ComponentType, LazyExoticComponent } from "react";

/**
 * Igual que React.lazy, pero si falla la carga del chunk (típico tras un deploy
 * nuevo: el index viejo en el navegador apunta a hashes que ya no existen → 404),
 * recarga la página UNA sola vez para tomar la versión nueva, en lugar de crashear
 * con "Failed to fetch dynamically imported module".
 */
export function lazyWithRetry<T extends ComponentType<any>>(
  loader: () => Promise<{ default: T }>
): LazyExoticComponent<T> {
  return lazy(async () => {
    const KEY = "domusbrag_chunk_reloaded";
    try {
      const mod = await loader();
      try {
        window.sessionStorage.removeItem(KEY);
      } catch {
        /* sessionStorage no disponible */
      }
      return mod;
    } catch (error) {
      let alreadyReloaded = false;
      try {
        alreadyReloaded = window.sessionStorage.getItem(KEY) === "1";
      } catch {
        /* ignore */
      }
      if (!alreadyReloaded) {
        try {
          window.sessionStorage.setItem(KEY, "1");
        } catch {
          /* ignore */
        }
        window.location.reload();
        // No resolvemos: la página se está recargando para tomar los chunks nuevos.
        return new Promise<{ default: T }>(() => {});
      }
      throw error; // ya recargamos una vez y sigue fallando: propagar el error real
    }
  });
}
