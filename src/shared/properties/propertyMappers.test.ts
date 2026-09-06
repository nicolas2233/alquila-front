import { describe, it, expect } from "vitest";
import {
  operationLabel,
  propertyTypeLabel,
  formatPrice,
  mapPropertyToSearchListing,
  type PropertyApiListItem,
} from "./propertyMappers";
import { buildPropertyPath } from "./slug";

describe("propertyMappers helpers", () => {
  it("operationLabel traduce los tipos de operación", () => {
    expect(operationLabel("SALE")).toBe("Venta");
    expect(operationLabel("RENT")).toBe("Alquiler");
    expect(operationLabel("TEMPORARY")).toBe("Temporario");
  });

  it("propertyTypeLabel traduce los tipos de propiedad", () => {
    expect(propertyTypeLabel("HOUSE")).toBe("Casa");
    expect(propertyTypeLabel("APARTMENT")).toBe("Departamento");
    expect(propertyTypeLabel("WAREHOUSE")).toBe("Galpon");
  });

  it("formatPrice formatea montos como moneda", () => {
    const result = formatPrice(150000, "USD");
    expect(result).toContain("150");
    expect(typeof result).toBe("string");
  });
});

const apiItem: PropertyApiListItem = {
  id: "p1",
  title: "Casa con patio",
  description: "Linda casa",
  operationType: "SALE",
  propertyType: "HOUSE",
  priceAmount: 120000,
  priceCurrency: "USD",
  rooms: 3,
  bathrooms: 2,
  areaM2: 90,
  location: {
    addressLine: "Calle 1 123",
    localityId: "loc-1",
    locality: { name: "Bragado" },
  },
  photos: [{ url: "https://res.cloudinary.com/demo/image/upload/v1/casa.jpg" }],
};

describe("mapPropertyToSearchListing", () => {
  it("mapea un item del API a una SearchListing con campos clave", () => {
    const listing = mapPropertyToSearchListing(apiItem);
    expect(listing.id).toBe("p1");
    expect(listing.title).toBe("Casa con patio");
    expect(listing.operation).toBe("Venta");
    expect(listing.propertyType).toBe("Casa");
    expect(listing.address).toContain("Bragado");
    expect(listing.image).toContain("res.cloudinary.com");
    expect(listing.image).toContain("w_800");
  });

  it("expone los valores crudos que necesita el slug canonico de la ficha", () => {
    const listing = mapPropertyToSearchListing(apiItem);
    expect(listing.operationTypeRaw).toBe("SALE");
    expect(listing.propertyTypeRaw).toBe("HOUSE");
    expect(listing.localityName).toBe("Bragado");
    // Con estos tres campos la tarjeta arma el href sin pasar por /publicacion/<id>.
    expect(buildPropertyPath({
      id: listing.id,
      operationType: listing.operationTypeRaw,
      propertyType: listing.propertyTypeRaw,
      locality: listing.localityName,
    })).toBe("/publicacion/casa-en-venta-bragado-p1");
  });

  it("deja localityName en null cuando el item no trae localidad", () => {
    const sinLocalidad = {
      ...apiItem,
      location: { addressLine: "Calle 1 123", localityId: "loc-1" },
    };
    expect(mapPropertyToSearchListing(sinLocalidad).localityName).toBeNull();
  });

  it("usa imagen de fallback cuando no hay fotos", () => {
    const listing = mapPropertyToSearchListing({ ...apiItem, photos: [] });
    expect(listing.image).toBeTruthy();
  });
});
