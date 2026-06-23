import { describe, it, expect } from "vitest";
import {
  cloudinaryOptimized,
  cloudinaryThumb,
  cloudinaryCard,
  cloudinaryFull,
} from "./cloudinaryUrl";

const cloudinaryUrl = "https://res.cloudinary.com/demo/image/upload/v123/casa.jpg";

describe("cloudinaryUrl", () => {
  it("inserta transformaciones f_auto,q_auto,w_N,c_limit en URLs de Cloudinary", () => {
    expect(cloudinaryOptimized(cloudinaryUrl, 600)).toBe(
      "https://res.cloudinary.com/demo/image/upload/f_auto,q_auto,w_600,c_limit/v123/casa.jpg"
    );
  });

  it("no toca URLs que no son de Cloudinary", () => {
    const other = "https://example.com/foto.jpg";
    expect(cloudinaryOptimized(other, 600)).toBe(other);
  });

  it("devuelve string vacío para null/undefined", () => {
    expect(cloudinaryOptimized(null)).toBe("");
    expect(cloudinaryOptimized(undefined)).toBe("");
  });

  it("los helpers usan los anchos correctos", () => {
    expect(cloudinaryThumb(cloudinaryUrl)).toContain("w_400");
    expect(cloudinaryCard(cloudinaryUrl)).toContain("w_800");
    expect(cloudinaryFull(cloudinaryUrl)).toContain("w_1280");
  });
});
