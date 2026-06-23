export type SeoConfig = {
  title: string;
  description: string;
  canonicalPath?: string;
  image?: string;
  type?: "website" | "article";
  noindex?: boolean;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

const BRAND_NAME = "DomusBrag";
const DEFAULT_TITLE = `${BRAND_NAME} | Propiedades en Bragado`;
const DEFAULT_DESCRIPTION =
  "DomusBrag conecta personas, dueños directos e inmobiliarias en Bragado con búsqueda clara, mapa y contacto rápido.";
const DEFAULT_OG_IMAGE = "https://domusbrag.com/domusbrag.jpg";

function getSiteUrl() {
  const fromEnv = (import.meta.env.VITE_SITE_URL as string | undefined)?.trim();
  if (fromEnv) {
    return fromEnv.replace(/\/+$/, "");
  }
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin.replace(/\/+$/, "");
  }
  return "https://domusbrag.com";
}

function upsertMetaByName(name: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[name="${name}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("name", name);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function upsertMetaByProperty(property: string, content: string) {
  let node = document.head.querySelector<HTMLMetaElement>(`meta[property="${property}"]`);
  if (!node) {
    node = document.createElement("meta");
    node.setAttribute("property", property);
    document.head.appendChild(node);
  }
  node.setAttribute("content", content);
}

function upsertCanonical(href: string) {
  let node = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
  if (!node) {
    node = document.createElement("link");
    node.setAttribute("rel", "canonical");
    document.head.appendChild(node);
  }
  node.setAttribute("href", href);
}

function upsertStructuredData(data?: SeoConfig["structuredData"]) {
  const existing = document.head.querySelector<HTMLScriptElement>(
    'script[data-seo-structured="true"]'
  );
  if (!data) {
    existing?.remove();
    return;
  }
  const node = existing ?? document.createElement("script");
  node.type = "application/ld+json";
  node.dataset.seoStructured = "true";
  node.textContent = JSON.stringify(data);
  if (!existing) {
    document.head.appendChild(node);
  }
}

export function applySeo(config: SeoConfig) {
  const siteUrl = getSiteUrl();
  const canonicalUrl = config.canonicalPath
    ? new URL(config.canonicalPath, `${siteUrl}/`).toString()
    : siteUrl;
  const title = config.title?.trim()
    ? config.title.includes(BRAND_NAME)
      ? config.title
      : `${config.title} | ${BRAND_NAME}`
    : DEFAULT_TITLE;
  const description = config.description?.trim() || DEFAULT_DESCRIPTION;
  const image = config.image?.trim() || DEFAULT_OG_IMAGE;
  const type = config.type ?? "website";
  const robots = config.noindex ? "noindex, nofollow" : "index, follow";

  document.title = title;
  upsertMetaByName("description", description);
  upsertMetaByName("robots", robots);

  upsertMetaByProperty("og:site_name", BRAND_NAME);
  upsertMetaByProperty("og:title", title);
  upsertMetaByProperty("og:description", description);
  upsertMetaByProperty("og:type", type);
  upsertMetaByProperty("og:url", canonicalUrl);
  upsertMetaByProperty("og:image", image);

  upsertMetaByName("twitter:card", "summary_large_image");
  upsertMetaByName("twitter:title", title);
  upsertMetaByName("twitter:description", description);
  upsertMetaByName("twitter:image", image);

  upsertCanonical(canonicalUrl);
  upsertStructuredData(config.structuredData);
}

/** JSON-LD BreadcrumbList a partir de pares nombre/ruta (mejora el enlazado en buscadores). */
export function buildBreadcrumbList(items: Array<{ name: string; path: string }>) {
  const siteUrl = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: new URL(item.path, `${siteUrl}/`).toString(),
    })),
  };
}
