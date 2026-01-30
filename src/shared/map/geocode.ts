type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

export async function geocodeAddress(query: string) {
  const encoded = encodeURIComponent(query);
  const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encoded}`;
  const response = await fetch(url, {
    headers: {
      "Accept-Language": "es",
    },
  });
  if (!response.ok) {
    throw new Error("No pudimos buscar la direccion.");
  }
  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    display_name: string;
  }>;
  if (!data.length) {
    return null;
  }
  const first = data[0];
  return {
    lat: Number(first.lat),
    lng: Number(first.lon),
    displayName: first.display_name,
  } as GeocodeResult;
}
