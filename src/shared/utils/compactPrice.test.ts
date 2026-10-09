import { describe, expect, it } from "vitest";
import { compactPrice } from "./compactPrice";

describe("compactPrice", () => {
  it("abrevia miles y millones", () => {
    expect(compactPrice(85000, "USD")).toBe("US$ 85k");
    expect(compactPrice(450000, "ARS")).toBe("$ 450k");
    expect(compactPrice(1200000, "USD")).toBe("US$ 1,2M");
    expect(compactPrice(95000000, "ARS")).toBe("$ 95M");
    expect(compactPrice(900, "ARS")).toBe("$ 900");
  });
  it("muestra Consultar sin precio", () => {
    expect(compactPrice(0, "ARS")).toBe("Consultar");
  });
});
