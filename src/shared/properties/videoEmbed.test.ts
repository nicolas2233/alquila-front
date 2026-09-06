import { describe, it, expect } from "vitest";
import { parseVideoUrl, normalizeVideoUrl } from "./videoEmbed";

describe("parseVideoUrl - formatos validos", () => {
  it("acepta las variantes de YouTube y siempre reconstruye el mismo embed", () => {
    const variantes = [
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
      "https://youtu.be/dQw4w9WgXcQ",
      "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      "https://www.youtube.com/embed/dQw4w9WgXcQ",
      "https://m.youtube.com/watch?v=dQw4w9WgXcQ",
      // Con parametros de tracking, que es como suele llegar pegado desde el celular.
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ&feature=share&t=30",
    ];
    for (const url of variantes) {
      const embed = parseVideoUrl(url);
      expect(embed, url).not.toBeNull();
      expect(embed!.provider).toBe("youtube");
      expect(embed!.id).toBe("dQw4w9WgXcQ");
      expect(embed!.embedUrl).toBe("https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ");
    }
  });

  it("acepta posteos, reels y tv de Instagram", () => {
    expect(parseVideoUrl("https://www.instagram.com/p/Cx1AbCdEfGh/")?.embedUrl).toBe(
      "https://www.instagram.com/p/Cx1AbCdEfGh/embed"
    );
    expect(parseVideoUrl("https://www.instagram.com/reel/Cx1AbCdEfGh/")?.embedUrl).toBe(
      "https://www.instagram.com/reel/Cx1AbCdEfGh/embed"
    );
    expect(parseVideoUrl("https://instagram.com/tv/Cx1AbCdEfGh/")?.provider).toBe("instagram");
  });

  it("ignora los parametros de tracking al reconstruir la URL", () => {
    // El link copiado desde la app trae ?igshid=... y no debe llegar al iframe.
    const embed = parseVideoUrl("https://www.instagram.com/reel/Cx1AbCdEfGh/?igshid=abc123");
    expect(embed!.embedUrl).toBe("https://www.instagram.com/reel/Cx1AbCdEfGh/embed");
    expect(embed!.embedUrl).not.toContain("igshid");
  });
});

describe("parseVideoUrl - rechazos", () => {
  it("rechaza hosts que no estan en la lista", () => {
    // El caso que importa: el valor termina en el src de un iframe dentro de
    // domusbrag.com, asi que un host arbitrario no puede pasar nunca.
    for (const url of [
      "https://evil.com/video",
      "https://vimeo.com/123456789",
      "https://tiktok.com/@user/video/123",
      // Host que solo *parece* de YouTube.
      "https://youtube.com.evil.com/watch?v=dQw4w9WgXcQ",
      "https://notyoutube.com/watch?v=dQw4w9WgXcQ",
    ]) {
      expect(parseVideoUrl(url), url).toBeNull();
    }
  });

  it("rechaza esquemas peligrosos", () => {
    for (const url of [
      "javascript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      // http embebido rompe la pagina por mixed content.
      "http://www.youtube.com/watch?v=dQw4w9WgXcQ",
    ]) {
      expect(parseVideoUrl(url), url).toBeNull();
    }
  });

  it("rechaza ids que no cumplen el patron del proveedor", () => {
    expect(parseVideoUrl("https://www.youtube.com/watch?v=corto")).toBeNull();
    expect(parseVideoUrl("https://www.youtube.com/watch?v=tiene/barra1")).toBeNull();
    expect(parseVideoUrl("https://www.instagram.com/p//")).toBeNull();
    // Ruta de Instagram que no es un posteo (un perfil, por ejemplo).
    expect(parseVideoUrl("https://www.instagram.com/algunperfil/")).toBeNull();
  });

  it("rechaza valores vacios o de otro tipo", () => {
    for (const valor of ["", "   ", "no soy una url", null, undefined, 42, {}]) {
      expect(parseVideoUrl(valor), String(valor)).toBeNull();
    }
  });
});

describe("normalizeVideoUrl", () => {
  it("guarda la URL canonica del proveedor, no la de embed", () => {
    expect(normalizeVideoUrl("https://youtu.be/dQw4w9WgXcQ")).toBe(
      "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    );
    expect(normalizeVideoUrl("https://www.instagram.com/reel/Cx1AbCdEfGh/?igshid=x")).toBe(
      "https://www.instagram.com/reel/Cx1AbCdEfGh/"
    );
  });

  it("lanza ante un link no soportado, para que el endpoint responda 400", () => {
    expect(() => normalizeVideoUrl("https://evil.com/x")).toThrow(/YouTube o Instagram/);
  });
});
