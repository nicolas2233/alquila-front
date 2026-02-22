export type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
  addressLine?: string;
  locality?: string;
  party?: string;
  province?: string;
  postalCode?: string;
  neighborhood?: string;
};

type NominatimItem = {
  lat: string;
  lon: string;
  display_name: string;
  address?: {
    house_number?: string;
    road?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    suburb?: string;
    neighbourhood?: string;
  };
};

type PhotonItem = {
  geometry?: { coordinates?: [number, number] };
  properties?: {
    name?: string;
    street?: string;
    housenumber?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    district?: string;
    suburb?: string;
  };
};

function normalizeNominatimItem(item: NominatimItem): GeocodeResult {
  const address = item.address;
  const addressLine = [address?.road, address?.house_number].filter(Boolean).join(" ").trim();
  return {
    lat: Number(item.lat),
    lng: Number(item.lon),
    displayName: item.display_name,
    addressLine: addressLine || undefined,
    locality:
      address?.city ||
      address?.town ||
      address?.village ||
      address?.municipality ||
      undefined,
    party: address?.county || address?.municipality || undefined,
    province: address?.state || undefined,
    postalCode: address?.postcode || undefined,
    neighborhood: address?.suburb || address?.neighbourhood || undefined,
  };
}

function normalizePhotonItem(item: PhotonItem, fallbackQuery: string): GeocodeResult | null {
  const coords = item.geometry?.coordinates;
  if (!coords) return null;
  const props = item.properties;
  const addressLine = [props?.street, props?.housenumber].filter(Boolean).join(" ").trim();
  const displayName = [
    props?.name || addressLine || fallbackQuery,
    props?.city,
    props?.state,
  ]
    .filter(Boolean)
    .join(", ");
  return {
    lat: coords[1],
    lng: coords[0],
    displayName: displayName || fallbackQuery,
    addressLine: addressLine || undefined,
    locality: props?.city || undefined,
    party: props?.county || undefined,
    province: props?.state || undefined,
    postalCode: props?.postcode || undefined,
    neighborhood: props?.district || props?.suburb || undefined,
  };
}

async function fetchNominatim(query: string, limit: number): Promise<GeocodeResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&addressdetails=1&limit=${limit}&countrycodes=ar&q=${encoded}`;
  const response = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!response.ok) return [];
  const data = (await response.json()) as NominatimItem[];
  return data
    .map(normalizeNominatimItem)
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

async function fetchMapsCo(query: string, limit: number): Promise<GeocodeResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://geocode.maps.co/search?q=${encoded}`;
  const response = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!response.ok) return [];
  const data = (await response.json()) as NominatimItem[];
  return data
    .slice(0, limit)
    .map(normalizeNominatimItem)
    .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng));
}

async function fetchPhoton(query: string, limit: number): Promise<GeocodeResult[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://photon.komoot.io/api/?q=${encoded}&limit=${limit}&lang=es`;
  const response = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!response.ok) return [];
  const data = (await response.json()) as { features?: PhotonItem[] };
  return (data.features ?? [])
    .map((feature) => normalizePhotonItem(feature, query))
    .filter((item): item is GeocodeResult => Boolean(item));
}

async function fetchNominatimReverse(lat: number, lng: number): Promise<GeocodeResult | null> {
  const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&addressdetails=1&zoom=18&lat=${encodeURIComponent(
    String(lat)
  )}&lon=${encodeURIComponent(String(lng))}`;
  const response = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!response.ok) return null;
  const data = (await response.json()) as NominatimItem | null;
  if (!data || !data.lat || !data.lon || !data.display_name) return null;
  const normalized = normalizeNominatimItem(data);
  if (!Number.isFinite(normalized.lat) || !Number.isFinite(normalized.lng)) return null;
  return normalized;
}

async function fetchMapsCoReverse(lat: number, lng: number): Promise<GeocodeResult | null> {
  const url = `https://geocode.maps.co/reverse?lat=${encodeURIComponent(
    String(lat)
  )}&lon=${encodeURIComponent(String(lng))}`;
  const response = await fetch(url, { headers: { "Accept-Language": "es" } });
  if (!response.ok) return null;
  const data = (await response.json()) as NominatimItem | null;
  if (!data || !data.lat || !data.lon || !data.display_name) return null;
  const normalized = normalizeNominatimItem(data);
  if (!Number.isFinite(normalized.lat) || !Number.isFinite(normalized.lng)) return null;
  return normalized;
}

export async function geocodeSuggestions(query: string, limit = 5) {
  const safeLimit = Math.min(Math.max(limit, 1), 8);
  const attempts = [fetchNominatim, fetchMapsCo, fetchPhoton];
  for (const attempt of attempts) {
    try {
      const results = await attempt(query, safeLimit);
      if (results.length > 0) {
        return results;
      }
    } catch {
      // try next provider
    }
  }
  return [];
}

export async function geocodeAddress(query: string) {
  const results = await geocodeSuggestions(query, 1);
  if (results.length > 0) {
    return results[0];
  }
  throw new Error("No pudimos buscar la direccion.");
}

export async function reverseGeocode(lat: number, lng: number) {
  const attempts = [fetchNominatimReverse, fetchMapsCoReverse];
  for (const attempt of attempts) {
    try {
      const result = await attempt(lat, lng);
      if (result) {
        return result;
      }
    } catch {
      // try next provider
    }
  }
  throw new Error("No pudimos obtener la direccion desde el mapa.");
}
