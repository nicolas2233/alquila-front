import fs from "node:fs/promises";
import path from "node:path";

const cwd = process.cwd();
const siteUrl = (process.env.VITE_SITE_URL || "https://domusbrag.com").replace(/\/+$/, "");
const apiUrl = (process.env.VITE_API_URL || "http://localhost:4000/api").replace(/\/+$/, "");
const strictMode = process.argv.includes("--strict");

const now = new Date().toISOString();

// Slug de propiedad: DEBE coincidir con src/shared/properties/slug.ts y el backend.
const TYPE_SLUG = {
  HOUSE: "casa", APARTMENT: "departamento", LAND: "terreno", FIELD: "campo",
  QUINTA: "quinta", COMMERCIAL: "local-comercial", OFFICE: "oficina", WAREHOUSE: "deposito",
};
const OPERATION_SLUG = { SALE: "en-venta", RENT: "en-alquiler", TEMPORARY: "alquiler-temporal" };

function slugify(text) {
  return String(text)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildPropertyPath(item) {
  const locality = item?.location?.locality?.name ?? null;
  const parts = [
    item?.propertyType ? TYPE_SLUG[item.propertyType] ?? "" : "",
    item?.operationType ? OPERATION_SLUG[item.operationType] ?? "" : "",
    locality ? slugify(locality) : "",
  ].filter(Boolean);
  const slug = parts.join("-");
  const tail = slug ? `${slug}-${item.id}` : item.id;
  return `/publicacion/${tail}`;
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchJson(url, attempts = 3) {
  let lastError;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        headers: {
          Accept: "application/json",
        },
      });
      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText} - ${url}`);
      }
      return await response.json();
    } catch (error) {
      lastError = error;
      if (attempt < attempts) {
        await sleep(attempt * 1000);
      }
    }
  }
  throw lastError;
}

async function fetchAgencies() {
  try {
    const data = await fetchJson(`${apiUrl}/agencies`);
    const items = Array.isArray(data?.items) ? data.items : [];
    return items
      .map((item) => ({
        path: `/agencia/${item.slug ?? item.id}`,
        lastmod: item.updatedAt ?? null,
        changefreq: "weekly",
        priority: "0.8",
      }))
      .filter((item) => item.path && !item.path.endsWith("/undefined"));
  } catch (error) {
    const message = `[sitemap] No pudimos cargar agencias: ${
      error instanceof Error ? error.message : error
    }`;
    if (strictMode) {
      throw new Error(message);
    }
    console.warn(message);
    return [];
  }
}

async function fetchProperties() {
  const pageSize = 100;
  let page = 1;
  let totalPages = 1;
  const urls = [];

  while (page <= totalPages) {
    try {
      const data = await fetchJson(
        `${apiUrl}/properties?status=ACTIVE&page=${page}&pageSize=${pageSize}`
      );
      const items = Array.isArray(data?.items) ? data.items : [];
      const total = Number(data?.total ?? items.length);
      totalPages = Math.max(1, Math.ceil(total / pageSize));

      for (const item of items) {
        if (!item?.id) continue;
        if (item?.features?.isDemo) continue; // no indexar publicaciones de ejemplo
        urls.push({
          path: buildPropertyPath(item),
          lastmod: item.updatedAt ?? null,
          changefreq: "daily",
          priority: "0.7",
        });
      }
      page += 1;
    } catch (error) {
      const message = `[sitemap] No pudimos cargar publicaciones (pagina ${page}): ${
        error instanceof Error ? error.message : error
      }`;
      if (strictMode) {
        throw new Error(message);
      }
      console.warn(message);
      break;
    }
  }

  return urls;
}

function buildXml(urls) {
  const rows = urls.map((entry) => {
    const parts = [
      "  <url>",
      `    <loc>${escapeXml(`${siteUrl}${entry.path}`)}</loc>`,
    ];
    if (entry.lastmod) {
      const lastmod = new Date(entry.lastmod).toISOString();
      if (!Number.isNaN(Date.parse(lastmod))) {
        parts.push(`    <lastmod>${lastmod}</lastmod>`);
      }
    }
    if (entry.changefreq) {
      parts.push(`    <changefreq>${entry.changefreq}</changefreq>`);
    }
    if (entry.priority) {
      parts.push(`    <priority>${entry.priority}</priority>`);
    }
    parts.push("  </url>");
    return parts.join("\n");
  });

  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join(
    "\n"
  )}\n</urlset>\n`;
}

async function main() {
  const staticUrls = [
    { path: "/", lastmod: now, changefreq: "weekly", priority: "1.0" },
    { path: "/buscar", lastmod: now, changefreq: "daily", priority: "0.9" },
    { path: "/mapa", lastmod: now, changefreq: "daily", priority: "0.8" },
  ];

  const [agencies, properties] = await Promise.all([fetchAgencies(), fetchProperties()]);
  const byPath = new Map();
  for (const entry of [...staticUrls, ...agencies, ...properties]) {
    byPath.set(entry.path, entry);
  }
  const urls = [...byPath.values()].sort((a, b) => a.path.localeCompare(b.path));

  const xml = buildXml(urls);
  const outputPath = path.join(cwd, "public", "sitemap.xml");
  await fs.writeFile(outputPath, xml, "utf8");
  console.log(
    `[sitemap] Generado ${outputPath} con ${urls.length} URLs${strictMode ? " (strict)" : ""}`
  );
}

main().catch((error) => {
  console.error("[sitemap] Error fatal:", error);
  process.exitCode = 1;
});
