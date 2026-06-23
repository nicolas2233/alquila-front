// Slugs amigables para URLs de propiedad: /publicacion/<slug>-<id>
// El id es un cuid (sin guiones), por eso siempre es el último segmento al separar por "-".
// IMPORTANTE: el backend (alquila-back/src/utils/slug.ts) y el generador de sitemap usan
// EXACTAMENTE estas mismas reglas para que canonical === sitemap === share.

const TYPE_SLUG: Record<string, string> = {
  HOUSE: "casa",
  APARTMENT: "departamento",
  LAND: "terreno",
  FIELD: "campo",
  QUINTA: "quinta",
  COMMERCIAL: "local-comercial",
  OFFICE: "oficina",
  WAREHOUSE: "deposito",
};

const OPERATION_SLUG: Record<string, string> = {
  SALE: "en-venta",
  RENT: "en-alquiler",
  TEMPORARY: "alquiler-temporal",
};

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type SlugInput = {
  id: string;
  operationType?: string | null;
  propertyType?: string | null;
  locality?: string | null;
};

export function buildPropertySlug(input: SlugInput): string {
  const parts = [
    input.propertyType ? TYPE_SLUG[input.propertyType] ?? "" : "",
    input.operationType ? OPERATION_SLUG[input.operationType] ?? "" : "",
    input.locality ? slugify(input.locality) : "",
  ].filter(Boolean);
  return parts.join("-");
}

export function buildPropertyPath(input: SlugInput): string {
  const slug = buildPropertySlug(input);
  const tail = slug ? `${slug}-${input.id}` : input.id;
  return `/publicacion/${tail}`;
}

/** Extrae el id (cuid sin guiones) del parámetro `slug-id` de la URL. */
export function extractPropertyId(slugId: string | undefined): string {
  if (!slugId) return "";
  const parts = slugId.split("-");
  return parts[parts.length - 1] ?? "";
}
