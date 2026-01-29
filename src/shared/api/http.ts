type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const cache = new Map<string, CacheEntry<unknown>>();

function getCache<T>(key: string): T | null {
  const entry = cache.get(key);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.value as T;
}

function setCache<T>(key: string, value: T, ttlMs: number) {
  cache.set(key, { value, expiresAt: Date.now() + ttlMs });
}

type FetchJsonOptions = {
  cacheKey?: string;
  ttlMs?: number;
  signal?: AbortSignal;
};

export async function fetchJson<T>(url: string, options?: FetchJsonOptions): Promise<T> {
  const cacheKey = options?.cacheKey;
  if (cacheKey) {
    const cached = getCache<T>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  const response = await fetch(url, { signal: options?.signal });
  if (!response.ok) {
    throw new Error("Request failed");
  }
  const data = (await response.json()) as T;
  if (cacheKey && options?.ttlMs) {
    setCache(cacheKey, data, options.ttlMs);
  }
  return data;
}
