import { describe, it, expect } from "vitest";
import { buildWhatsappLink } from "./whatsapp";

describe("buildWhatsappLink", () => {
  it("construye un link wa.me con el mensaje codificado", () => {
    expect(buildWhatsappLink("+54 9 2342 55-1234", "Hola mundo")).toBe(
      "https://wa.me/5492342551234?text=Hola%20mundo"
    );
  });

  it("quita todo lo que no sean dígitos del teléfono", () => {
    expect(buildWhatsappLink("(02342) 15-123456", "x")).toBe(
      "https://wa.me/0234215123456?text=x"
    );
  });

  it("devuelve null si no hay dígitos", () => {
    expect(buildWhatsappLink("", "hola")).toBeNull();
    expect(buildWhatsappLink("sin numero", "hola")).toBeNull();
  });
});
