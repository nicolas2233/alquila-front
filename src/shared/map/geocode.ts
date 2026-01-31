type GeocodeResult = {
  lat: number;
  lng: number;
  displayName: string;
};

export async function geocodeAddress(query: string) {
  const encoded = encodeURIComponent(query);
  const sources: Array<
    | { type: "nominatim"; url: string }
    | { type: "photon"; url: string }
  > = [
    { type: "photon", url: `https://photon.komoot.io/api/?q=${encoded}&limit=1` },
    { type: "nominatim", url: `https://geocode.maps.co/search?q=${encoded}` },
    {
      type: "nominatim",
      url: `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encoded}`,
    },
  ];

  for (const source of sources) {
    try {
      const response = await fetch(source.url, {
        headers: {
          "Accept-Language": "es",
        },
      });
      if (!response.ok) {
        continue;
      }
      if (source.type === "photon") {
        const data = (await response.json()) as {
          features?: Array<{
            geometry?: { coordinates?: [number, number] };
            properties?: { name?: string };
          }>;
        };
        const feature = data.features?.[0];
        const coords = feature?.geometry?.coordinates;
        if (!coords) {
          continue;
        }
        return {
          lat: coords[1],
          lng: coords[0],
          displayName: feature?.properties?.name ?? query,
        } as GeocodeResult;
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
    } catch {
      // try next provider
    }
  }

  throw new Error("No pudimos buscar la direccion.");
}
