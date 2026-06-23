// Geolocalización "amable": se pide una sola vez por usuario y se recuerda la decisión.
// - Si el permiso ya está concedido, se usa en silencio (sin popup).
// - Si fue rechazado/ignorado antes, no se vuelve a preguntar automáticamente.
// - El botón manual usa forceRequestGeolocation para volver a intentar cuando el usuario quiere.

const ASKED_KEY = "domusbrag_geo_choice";

type GeoChoice = "granted" | "denied";

function getPriorChoice(): GeoChoice | null {
  try {
    const value = localStorage.getItem(ASKED_KEY);
    return value === "granted" || value === "denied" ? value : null;
  } catch {
    return null;
  }
}

function setPriorChoice(choice: GeoChoice) {
  try {
    localStorage.setItem(ASKED_KEY, choice);
  } catch {
    /* localStorage no disponible: seguimos igual */
  }
}

type GeoHandlers = {
  onSuccess: (position: GeolocationPosition) => void;
  onError?: (error?: GeolocationPositionError) => void;
  options?: PositionOptions;
};

function runGetPosition({ onSuccess, onError, options }: GeoHandlers) {
  navigator.geolocation.getCurrentPosition(
    (position) => {
      setPriorChoice("granted");
      onSuccess(position);
    },
    (error) => {
      setPriorChoice("denied");
      onError?.(error);
    },
    options
  );
}

/**
 * Pide la ubicación una sola vez, respetando la decisión previa y el estado del permiso.
 * No vuelve a mostrar el popup si el usuario ya lo rechazó/ignoró antes.
 */
export function requestGeolocationOnce(handlers: GeoHandlers) {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    handlers.onError?.();
    return;
  }

  // Sin Permissions API (p. ej. Safari): pedir salvo que el usuario ya haya rechazado.
  // Si antes concedió, getCurrentPosition resuelve en silencio (el navegador recuerda).
  const requestUnlessDenied = () => {
    if (getPriorChoice() === "denied") handlers.onError?.();
    else runGetPosition(handlers);
  };

  const permissions = navigator.permissions;
  if (permissions && typeof permissions.query === "function") {
    permissions
      .query({ name: "geolocation" as PermissionName })
      .then((result) => {
        if (result.state === "granted") {
          runGetPosition(handlers); // ya concedido: silencioso
        } else if (result.state === "denied") {
          handlers.onError?.();
        } else {
          // "prompt": preguntar solo si no rechazó antes
          requestUnlessDenied();
        }
      })
      .catch(requestUnlessDenied);
  } else {
    requestUnlessDenied();
  }
}

/** Fuerza el pedido de ubicación (botón "usar mi ubicación"), ignorando el recordatorio. */
export function forceRequestGeolocation(handlers: GeoHandlers) {
  if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
    handlers.onError?.();
    return;
  }
  runGetPosition(handlers);
}
