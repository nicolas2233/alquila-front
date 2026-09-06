import { describe, it, expect } from "vitest";
import { buildAutoTitle, buildAutoDescription, operacionPreposicional } from "./autoText";

describe("buildAutoTitle", () => {
  it("arma el titulo con tipo, operacion y localidad", () => {
    expect(buildAutoTitle({ propertyType: "HOUSE", operationType: "SALE", locality: "Bragado" })).toBe(
      "Casa en venta en Bragado"
    );
    expect(
      buildAutoTitle({ propertyType: "APARTMENT", operationType: "RENT", locality: "Mechita" })
    ).toBe("Departamento en alquiler en Mechita");
  });

  it("suma los ambientes cuando estan y concuerda el plural", () => {
    expect(
      buildAutoTitle({ propertyType: "HOUSE", operationType: "SALE", locality: "Bragado", rooms: 3 })
    ).toBe("Casa en venta en Bragado · 3 ambientes");
    expect(
      buildAutoTitle({ propertyType: "HOUSE", operationType: "SALE", locality: "Bragado", rooms: 1 })
    ).toBe("Casa en venta en Bragado · 1 ambiente");
  });

  it("ignora los ambientes vacios o invalidos en vez de escribir 'null'", () => {
    for (const rooms of ["", null, undefined, 0, "abc"]) {
      expect(
        buildAutoTitle({ propertyType: "HOUSE", operationType: "SALE", locality: "Bragado", rooms }),
        String(rooms)
      ).toBe("Casa en venta en Bragado");
    }
  });

  it("devuelve vacio sin tipo, para que el llamador no pise el titulo del usuario", () => {
    expect(buildAutoTitle({ operationType: "SALE", locality: "Bragado" })).toBe("");
    expect(buildAutoTitle({})).toBe("");
  });

  it("funciona con datos parciales", () => {
    expect(buildAutoTitle({ propertyType: "LAND" })).toBe("Terreno");
    expect(buildAutoTitle({ propertyType: "LAND", locality: "Bragado" })).toBe("Terreno en Bragado");
  });
});

describe("buildAutoDescription", () => {
  it("describe con los datos disponibles", () => {
    expect(
      buildAutoDescription({
        propertyType: "HOUSE",
        operationType: "SALE",
        locality: "Bragado",
        rooms: 3,
        bathrooms: 2,
        areaM2: 120,
      })
    ).toBe(
      "Casa en venta en Bragado. 3 ambientes, 2 baños, 120 m². Consultá por WhatsApp para coordinar una visita."
    );
  });

  it("omite los detalles que faltan sin dejar comas sueltas", () => {
    expect(buildAutoDescription({ propertyType: "LAND", operationType: "SALE", locality: "Bragado" })).toBe(
      "Terreno en venta en Bragado. Consultá por WhatsApp para coordinar una visita."
    );
  });

  it("nunca devuelve vacio: el backend exige description con min(1)", () => {
    expect(buildAutoDescription({}).length).toBeGreaterThan(0);
    expect(buildAutoDescription({})).toContain("Bragado");
  });
});

describe("operacionPreposicional", () => {
  it("traduce las tres operaciones", () => {
    expect(operacionPreposicional("SALE")).toBe("en venta");
    expect(operacionPreposicional("RENT")).toBe("en alquiler");
    expect(operacionPreposicional("TEMPORARY")).toBe("en alquiler temporal");
  });

  it("tolera valores desconocidos o vacios", () => {
    expect(operacionPreposicional(null)).toBe("");
    expect(operacionPreposicional("")).toBe("");
  });
});
