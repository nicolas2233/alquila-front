// Parseo de links de video para las fichas.
//
// La lista de proveedores es CERRADA a proposito. El valor que sale de aca termina
// en el src de un <iframe> dentro de domusbrag.com: aceptar un host arbitrario seria
// dejar que cualquiera que publique un inmueble embeba contenido de terceros en el
// dominio, con todo lo que eso habilita (phishing sobre nuestra marca, entre otras).
//
// Por eso nunca se guarda ni se renderiza la URL que escribio el usuario: se extrae
// el id, se valida contra un patron estricto y se reconstruye la URL de embed desde
// cero. Si el parseo falla, el link se rechaza.
//
// IMPORTANTE: este archivo debe mantenerse en sintonia con
// alquila-back/src/utils/videoEmbed.ts, igual que pasa con slug.ts. El backend es el
// que manda: aca la validacion es solo para dar feedback inmediato al que publica.

export type VideoProvider = "youtube" | "instagram";

export type VideoEmbed = {
  provider: VideoProvider;
  /** Id o shortcode ya validado contra el patron del proveedor. */
  id: string;
  /** URL reconstruida, apta para el src de un iframe. */
  embedUrl: string;
  /** URL canonica para abrir en una pestaña nueva. */
  watchUrl: string;
};

const YOUTUBE_ID = /^[A-Za-z0-9_-]{11}$/;
const INSTAGRAM_CODE = /^[A-Za-z0-9_-]{5,32}$/;

const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtu.be",
  "www.youtu.be",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

const INSTAGRAM_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

function parseYoutube(url: URL): VideoEmbed | null {
  const segmentos = url.pathname.split("/").filter(Boolean);
  let id: string | null = null;

  if (url.hostname.endsWith("youtu.be")) {
    // https://youtu.be/<id>
    id = segmentos[0] ?? null;
  } else if (segmentos[0] === "watch") {
    // https://www.youtube.com/watch?v=<id>
    id = url.searchParams.get("v");
  } else if (segmentos[0] === "shorts" || segmentos[0] === "embed" || segmentos[0] === "v") {
    // https://www.youtube.com/shorts/<id> | /embed/<id> | /v/<id>
    id = segmentos[1] ?? null;
  }

  if (!id || !YOUTUBE_ID.test(id)) return null;
  return {
    provider: "youtube",
    id,
    // nocookie evita que YouTube plante cookies de seguimiento antes de que reproduzcan.
    embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
  };
}

function parseInstagram(url: URL): VideoEmbed | null {
  const segmentos = url.pathname.split("/").filter(Boolean);
  const tipo = segmentos[0];
  // Instagram usa /p/ para posteos, /reel/ para reels y /tv/ para el formato viejo.
  if (tipo !== "p" && tipo !== "reel" && tipo !== "tv") return null;
  const code = segmentos[1];
  if (!code || !INSTAGRAM_CODE.test(code)) return null;
  return {
    provider: "instagram",
    id: code,
    embedUrl: `https://www.instagram.com/${tipo}/${code}/embed`,
    watchUrl: `https://www.instagram.com/${tipo}/${code}/`,
  };
}

/** Devuelve el embed si la URL es de un proveedor soportado, o null si no lo es. */
export function parseVideoUrl(raw: unknown): VideoEmbed | null {
  if (typeof raw !== "string") return null;
  const texto = raw.trim();
  if (!texto) return null;

  let url: URL;
  try {
    url = new URL(texto);
  } catch {
    return null;
  }
  // Solo https: un http embebido rompe la pagina por mixed content.
  if (url.protocol !== "https:") return null;

  const host = url.hostname.toLowerCase();
  if (YOUTUBE_HOSTS.has(host)) return parseYoutube(url);
  if (INSTAGRAM_HOSTS.has(host)) return parseInstagram(url);
  return null;
}

/**
 * Normaliza para guardar: devuelve la URL canonica del proveedor (no la de embed,
 * asi el dato guardado sigue siendo un link que una persona puede abrir).
 * Lanza si la URL no es valida, para que el endpoint responda 400.
 */
export function normalizeVideoUrl(raw: unknown): string {
  const embed = parseVideoUrl(raw);
  if (!embed) {
    throw new Error("Link de video no soportado. Solo aceptamos YouTube o Instagram.");
  }
  return embed.watchUrl;
}
