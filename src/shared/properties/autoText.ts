// Genera titulo y descripcion a partir de los datos que ya cargo el usuario.
//
// Pedirle a un particular que escriba un titulo es un problema de pagina en blanco:
// no sabe que se espera, y es una de las razones por las que se abandona el formulario.
// Con tipo, operacion y localidad ya alcanza para un titulo mejor que el promedio, y
// ademas queda parejo con lo que indexa Google y con la preview de WhatsApp.
//
// El texto generado es un punto de partida editable, nunca pisa lo que escribio el
// usuario: quien llama decide cuando aplicarlo.

import { operationLabel, propertyTypeLabel } from "./propertyMappers";

/** Operacion en forma preposicional. Igual que SEO_OPERATION_LABELS en ListingPage. */
const OPERACION_PREPOSICIONAL: Record<string, string> = {
  SALE: "en venta",
  RENT: "en alquiler",
  TEMPORARY: "en alquiler temporal",
};

export type DatosAuto = {
  propertyType?: string | null;
  operationType?: string | null;
  locality?: string | null;
  rooms?: string | number | null;
  bathrooms?: string | number | null;
  areaM2?: string | number | null;
};

const numero = (v: unknown): number | null => {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : null;
};

/**
 * "Casa en venta en Bragado" · "Departamento en alquiler en Bragado · 2 ambientes"
 * Devuelve "" si no hay datos suficientes, para que el llamador no pise el titulo.
 */
export function buildAutoTitle(datos: DatosAuto): string {
  const tipo = datos.propertyType ? propertyTypeLabel(datos.propertyType) : "";
  if (!tipo) return "";
  const operacion = datos.operationType ? OPERACION_PREPOSICIONAL[datos.operationType] ?? "" : "";
  const localidad = datos.locality?.trim();
  const ambientes = numero(datos.rooms);

  let texto = tipo;
  if (operacion) texto += ` ${operacion}`;
  if (localidad) texto += ` en ${localidad}`;
  if (ambientes) texto += ` · ${ambientes} ambiente${ambientes === 1 ? "" : "s"}`;
  return texto;
}

/**
 * Descripcion minima para la carga express. El backend exige description no vacia
 * (createPropertySchema: z.string().min(1)) y ademas alimenta la meta description
 * de la ficha, asi que un aviso sin texto perjudica al que publica.
 */
export function buildAutoDescription(datos: DatosAuto): string {
  const tipo = datos.propertyType ? propertyTypeLabel(datos.propertyType) : "Propiedad";
  const operacion = datos.operationType ? OPERACION_PREPOSICIONAL[datos.operationType] ?? "" : "";
  const localidad = datos.locality?.trim() || "Bragado";

  const encabezado = `${tipo}${operacion ? ` ${operacion}` : ""} en ${localidad}.`;

  const detalles: string[] = [];
  const ambientes = numero(datos.rooms);
  const banos = numero(datos.bathrooms);
  const superficie = numero(datos.areaM2);
  if (ambientes) detalles.push(`${ambientes} ambiente${ambientes === 1 ? "" : "s"}`);
  if (banos) detalles.push(`${banos} baño${banos === 1 ? "" : "s"}`);
  if (superficie) detalles.push(`${superficie} m²`);

  const cuerpo = detalles.length ? ` ${detalles.join(", ")}.` : "";
  return `${encabezado}${cuerpo} Consultá por WhatsApp para coordinar una visita.`;
}

/** Etiqueta preposicional suelta, para no repetir el mapa en otros archivos. */
export function operacionPreposicional(operationType?: string | null): string {
  if (!operationType) return "";
  return OPERACION_PREPOSICIONAL[operationType] ?? operationLabel(operationType).toLowerCase();
}
