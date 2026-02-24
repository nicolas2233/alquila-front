import { useEffect } from "react";
import type { SeoConfig } from "./seo";
import { applySeo } from "./seo";

export function useSeo(config: SeoConfig) {
  useEffect(() => {
    applySeo(config);
  }, [
    config.title,
    config.description,
    config.canonicalPath,
    config.image,
    config.type,
    config.noindex,
    JSON.stringify(config.structuredData ?? null),
  ]);
}

