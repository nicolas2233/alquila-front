import { describe, it, expect } from "vitest";
import { slugify, buildPropertySlug, buildPropertyPath, extractPropertyId } from "./slug";

describe("slugify", () => {
  it("pasa a minúsculas y reemplaza espacios por guiones", () => {
    expect(slugify("Comodoro Rivadavia")).toBe("comodoro-rivadavia");
  });

  it("quita acentos y la ñ", () => {
    expect(slugify("Año Peñón")).toBe("ano-penon");
  });

  it("colapsa separadores y recorta guiones de los extremos", () => {
    expect(slugify("  Hola -- Mundo!! ")).toBe("hola-mundo");
  });
});

describe("buildPropertySlug / buildPropertyPath", () => {
  const base = { id: "clh123abc", operationType: "SALE", propertyType: "HOUSE", locality: "Bragado" };

  it("construye el slug a partir de tipo, operación y localidad", () => {
    expect(buildPropertySlug(base)).toBe("casa-en-venta-bragado");
  });

  it("construye el path /publicacion/<slug>-<id>", () => {
    expect(buildPropertyPath(base)).toBe("/publicacion/casa-en-venta-bragado-clh123abc");
  });

  it("cae a solo el id cuando faltan datos", () => {
    expect(buildPropertyPath({ id: "clh123abc" })).toBe("/publicacion/clh123abc");
  });
});

describe("extractPropertyId", () => {
  it("extrae el id (cuid) del slug-id", () => {
    expect(extractPropertyId("casa-en-venta-bragado-clh123abc")).toBe("clh123abc");
  });

  it("acepta un id pelado", () => {
    expect(extractPropertyId("clh123abc")).toBe("clh123abc");
  });

  it("hace round-trip con buildPropertyPath", () => {
    const path = buildPropertyPath({ id: "clxyz789", operationType: "RENT", propertyType: "APARTMENT", locality: "Mechita" });
    const slugId = path.replace("/publicacion/", "");
    expect(extractPropertyId(slugId)).toBe("clxyz789");
  });
});
