import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents, LayersControl } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";

export type MapPoint = {
  id: string;
  title: string;
  subtitle?: string;
  address?: string;
  imageUrl?: string;
  badge?: string;
  color?: string;
  count?: number;
  clusterItems?: Array<{
    id: string;
    title: string;
    address?: string;
    badge?: string;
  }>;
  clusterSourcePoints?: MapPoint[];
  spiderfied?: boolean;
  lat: number;
  lng: number;
};

type MapViewProps = {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpen?: (id: string) => void;
};

const defaultCenter: LatLngExpression = [-35.1197, -60.4899];
const ESRI_SATELLITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION =
  "Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics";

const createMarkerIcon = (color: string, isSelected: boolean, count?: number) =>
  L.divIcon({
    className: "domusbrag-marker",
    html: `
      ${
        typeof count === "number" && count > 1
          ? `<svg width="${isSelected ? 44 : 38}" height="${isSelected ? 44 : 38}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <circle cx="32" cy="32" r="28" fill="${color}" fill-opacity="0.95"/>
        <circle cx="32" cy="32" r="24" stroke="rgba(255,255,255,0.55)" stroke-width="2"/>
        <circle cx="32" cy="32" r="20" fill="rgba(10,11,16,0.72)"/>
        <text x="32" y="38" text-anchor="middle" font-size="18" fill="white" font-family="Arial" font-weight="700">${count}</text>
      </svg>`
          : `<svg width="${isSelected ? 40 : 34}" height="${isSelected ? 40 : 34}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 2C19.3 2 9 12.3 9 25C9 42.9 32 62 32 62C32 62 55 42.9 55 25C55 12.3 44.7 2 32 2Z" fill="${color}" fill-opacity="0.96"/>
        <path d="M32 2C19.3 2 9 12.3 9 25C9 42.9 32 62 32 62C32 62 55 42.9 55 25C55 12.3 44.7 2 32 2Z" stroke="rgba(255,255,255,0.5)" stroke-width="2"/>
        <circle cx="32" cy="26" r="10" fill="rgba(10,11,16,0.72)"/>
        <circle cx="32" cy="26" r="6" fill="rgba(255,255,255,0.92)"/>
      </svg>`
      }
    `,
    iconSize:
      typeof count === "number" && count > 1
        ? isSelected
          ? [44, 44]
          : [38, 38]
        : isSelected
          ? [40, 40]
          : [34, 34],
    iconAnchor:
      typeof count === "number" && count > 1
        ? isSelected
          ? [22, 22]
          : [19, 19]
        : isSelected
          ? [20, 38]
          : [17, 33],
    popupAnchor: [0, -34],
  });

function MapAutoFit({
  points,
  selectedId,
  freezeAutoFit = false,
}: {
  points: MapPoint[];
  selectedId: string | null;
  freezeAutoFit?: boolean;
}) {
  const map = useMap();

  useEffect(() => {
    if (freezeAutoFit) return;
    if (!points.length) return;

    const selected = selectedId ? points.find((point) => point.id === selectedId) : null;
    if (selected) {
      map.setView([selected.lat, selected.lng], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [freezeAutoFit, map, points, selectedId]);

  return null;
}

function MapInteractionBridge({ onMapClick, onZoomStart }: { onMapClick: () => void; onZoomStart: () => void }) {
  useMapEvents({
    click: () => onMapClick(),
    zoomstart: () => onZoomStart(),
  });

  return null;
}

function spreadNearbyPoints(points: MapPoint[]) {
  const buckets = new Map<string, MapPoint[]>();

  for (const point of points) {
    if (point.spiderfied) {
      // Los puntos ya "abiertos" en abanico no se vuelven a separar para evitar movimientos raros.
      buckets.set(`spider:${point.id}`, [point]);
      continue;
    }
    // Agrupa por ~5m aprox para evitar que dos pines queden exactamente superpuestos.
    const key = `${point.lat.toFixed(5)}:${point.lng.toFixed(5)}`;
    const list = buckets.get(key);
    if (list) list.push(point);
    else buckets.set(key, [point]);
  }

  const result: MapPoint[] = [];
  for (const group of buckets.values()) {
    // Si ya viene como cluster (count > 1) respetamos el punto agregado del backend/frontend.
    if (group.length === 1 || (group[0].count && group[0].count > 1)) {
      result.push(...group);
      continue;
    }

    const radius = 0.00006; // ~6-7m
    group.forEach((point, index) => {
      const angle = (Math.PI * 2 * index) / group.length;
      result.push({
        ...point,
        lat: point.lat + Math.sin(angle) * radius,
        lng: point.lng + Math.cos(angle) * radius,
      });
    });
  }

  return result;
}

function clusterNearbyPoints(points: MapPoint[], selectedId: string | null) {
  const buckets = new Map<string, MapPoint[]>();

  for (const point of points) {
    // Bucket más amplio (~11m) para cluster visual inicial.
    const key = `${point.lat.toFixed(4)}:${point.lng.toFixed(4)}`;
    const list = buckets.get(key);
    if (list) list.push(point);
    else buckets.set(key, [point]);
  }

  const result: MapPoint[] = [];
  for (const [key, group] of buckets.entries()) {
    if (group.length === 1) {
      result.push(group[0]);
      continue;
    }

    // Si hay un punto seleccionado en el grupo, evitamos clusterizarlo para no perder foco.
    if (selectedId && group.some((point) => point.id === selectedId)) {
      result.push(...group);
      continue;
    }

    // Si ya es un cluster generado aguas arriba, lo respetamos.
    if (group.some((point) => (point.count ?? 0) > 1)) {
      result.push(...group);
      continue;
    }

    const lat = group.reduce((sum, point) => sum + point.lat, 0) / group.length;
    const lng = group.reduce((sum, point) => sum + point.lng, 0) / group.length;
    const first = group[0];
    const badgeSet = new Set(
      group
        .map((point) => point.badge?.toLowerCase().trim())
        .filter((badge): badge is string => Boolean(badge))
    );
    const clusterColor =
      badgeSet.size === 1
        ? badgeSet.has("venta")
          ? "#D39A45"
          : badgeSet.has("alquiler")
            ? "#39A8F2"
            : badgeSet.has("temporario")
              ? "#8C72FF"
              : "#5aa9e6"
        : "#5aa9e6";

    result.push({
      id: `cluster:${key}`,
      title: `${group.length} inmuebles cercanos`,
      subtitle: "Hace zoom o selecciona al acercarte",
      address: first.address,
      imageUrl: first.imageUrl,
      badge: "Cluster",
      color: clusterColor,
      count: group.length,
      clusterItems: group.slice(0, 4).map((point) => ({
        id: point.id,
        title: point.title,
        address: point.address,
        badge: point.badge,
      })),
      clusterSourcePoints: group,
      lat,
      lng,
    });
  }

  return result;
}

function expandSpiderfiedCluster(points: MapPoint[], spiderfiedClusterId: string | null) {
  if (!spiderfiedClusterId) return { points, links: [] as Array<{ id: string; from: [number, number]; to: [number, number] }> };

  const result: MapPoint[] = [];
  const links: Array<{ id: string; from: [number, number]; to: [number, number] }> = [];
  for (const point of points) {
    if (
      point.id !== spiderfiedClusterId ||
      !point.clusterSourcePoints?.length ||
      (point.count ?? 0) <= 1
    ) {
      result.push(point);
      continue;
    }

    const radius = 0.00009; // ~10m
    point.clusterSourcePoints.forEach((sourcePoint, index) => {
      const angle = (Math.PI * 2 * index) / point.clusterSourcePoints!.length;
      const nextLat = point.lat + Math.sin(angle) * radius;
      const nextLng = point.lng + Math.cos(angle) * radius;
      links.push({
        id: `${point.id}:${sourcePoint.id}`,
        from: [point.lat, point.lng],
        to: [nextLat, nextLng],
      });
      result.push({
        ...sourcePoint,
        spiderfied: true,
        lat: nextLat,
        lng: nextLng,
      });
    });
  }

  return { points: result, links };
}

export function MapView({ points, selectedId, onSelect, onOpen }: MapViewProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [spiderfiedClusterId, setSpiderfiedClusterId] = useState<string | null>(null);
  const { renderPoints, spiderLinks } = useMemo(() => {
    const clustered = clusterNearbyPoints(points, selectedId);
    const expanded = expandSpiderfiedCluster(clustered, spiderfiedClusterId);
    return {
      renderPoints: spreadNearbyPoints(expanded.points),
      spiderLinks: expanded.links,
    };
  }, [points, selectedId, spiderfiedClusterId]);

  useEffect(() => {
    if (!isExpanded) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isExpanded]);

  useEffect(() => {
    if (selectedId) {
      setSpiderfiedClusterId(null);
    }
  }, [selectedId]);

  return (
    <div
      className={
        isExpanded
          ? "fixed inset-0 z-[1350] bg-night-950 p-3 sm:p-5"
          : "relative z-0"
      }
    >
      <div
        className={
          isExpanded
            ? "relative h-full overflow-hidden rounded-[28px] border border-white/10 bg-night-950 shadow-soft"
            : "relative overflow-hidden rounded-[32px] border border-white/10 shadow-soft"
        }
      >
        <div className="pointer-events-none absolute inset-x-0 top-0 z-[500] flex justify-between p-3">
          <div className="pointer-events-auto rounded-full border border-white/15 bg-black/45 px-3 py-1 text-[11px] text-white/90 backdrop-blur">
            {renderPoints.length} puntos
          </div>
          <button
            type="button"
            className="pointer-events-auto rounded-full border border-white/20 bg-black/55 px-3 py-1 text-[11px] text-white transition hover:bg-black/70"
            onClick={() => setIsExpanded((prev) => !prev)}
          >
            {isExpanded ? "Cerrar mapa" : "Ampliar mapa"}
          </button>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={13}
          className={isExpanded ? "h-full w-full" : "h-[420px] w-full"}
          scrollWheelZoom={false}
        >
          <MapInteractionBridge
            onMapClick={() => setSpiderfiedClusterId(null)}
            onZoomStart={() => setSpiderfiedClusterId(null)}
          />
          <LayersControl position="topleft">
            <LayersControl.BaseLayer checked name="Mapa">
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
            </LayersControl.BaseLayer>
            <LayersControl.BaseLayer name="Satelite">
              <TileLayer attribution={ESRI_ATTRIBUTION} url={ESRI_SATELLITE} />
            </LayersControl.BaseLayer>
          </LayersControl>
          <MapAutoFit
            points={renderPoints}
            selectedId={selectedId}
            freezeAutoFit={Boolean(spiderfiedClusterId)}
          />
          {spiderLinks.map((link) => (
            <Polyline
              key={link.id}
              positions={[link.from, link.to]}
              pathOptions={{ color: "#9fd0ff", weight: 2, opacity: 0.65, dashArray: "4 4" }}
            />
          ))}

          {renderPoints.map((point) => (
            <Marker
              key={point.id}
              position={[point.lat, point.lng]}
              icon={createMarkerIcon(point.color ?? "#AF8C5C", point.id === selectedId, point.count)}
              eventHandlers={{
                click: () => {
                  if (point.id.startsWith("cluster:")) {
                    // Dejar que Leaflet abra el popup del cluster; el despliegue en abanico se hace desde el popup.
                    return;
                  }
                  setSpiderfiedClusterId(null);
                  onSelect(point.id);
                },
              }}
              zIndexOffset={
                point.id.startsWith("cluster:")
                  ? 2000
                  : point.id === selectedId
                    ? 1000
                    : point.spiderfied
                      ? 900
                      : 0
              }
            >
              <Popup className="domusbrag-popup" closeButton={false} offset={[0, -28]}>
                <div className="map-popup-body w-52 space-y-2">
                  {point.count && point.count > 1 ? (
                    <>
                      <div className="text-sm font-semibold text-[#171717]">
                        {point.count} unidades en este edificio
                      </div>
                      {point.address && (
                        <div className="text-[11px] text-[#4e4e4e]">{point.address}</div>
                      )}
                      {point.subtitle && (
                        <div className="text-[11px] text-[#6b6b6b]">{point.subtitle}</div>
                      )}
                      {point.clusterItems?.length ? (
                        <div className="rounded-lg border border-black/10 bg-black/[0.03] p-2">
                          <div className="mb-1 text-[10px] uppercase tracking-wide text-[#666]">
                            Unidades agrupadas
                          </div>
                          <div className="space-y-1">
                            {point.clusterItems.map((item) => (
                              <button
                                key={item.id}
                                type="button"
                                className="flex w-full items-start justify-between gap-2 rounded-md px-1 py-1 text-left text-[11px] transition hover:bg-black/[0.05]"
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setSpiderfiedClusterId(null);
                                  onSelect(item.id);
                                }}
                              >
                                <div className="min-w-0">
                                  <div className="truncate font-medium text-[#222]">{item.title}</div>
                                  {item.address ? (
                                    <div className="truncate text-[#666]">{item.address}</div>
                                  ) : null}
                                </div>
                                {item.badge ? (
                                  <span className="shrink-0 rounded-full bg-black/10 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-[#333]">
                                    {item.badge}
                                  </span>
                                ) : null}
                              </button>
                            ))}
                          </div>
                        </div>
                      ) : null}
                      {point.clusterSourcePoints?.length ? (
                        <div className="flex gap-2">
                          <button
                            type="button"
                            className="rounded-full border border-black/15 bg-white/70 px-2.5 py-1 text-[10px] font-medium text-[#222] transition hover:bg-white"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSpiderfiedClusterId((prev) => (prev === point.id ? null : point.id));
                            }}
                          >
                            {spiderfiedClusterId === point.id ? "Cerrar abanico" : "Desplegar pines"}
                          </button>
                        </div>
                      ) : null}
                      <div className="text-[10px] text-[#5f5f5f]">
                        Usa "Desplegar pines" para separar las unidades y seleccionar una.
                      </div>
                    </>
                  ) : (
                    <>
                      {point.imageUrl && (
                        <div className="relative overflow-hidden rounded-lg">
                          <button
                            type="button"
                            className="block w-full"
                            onClick={(event) => {
                              event.stopPropagation();
                              if (onOpen) onOpen(point.id);
                              else onSelect(point.id);
                            }}
                          >
                            <img
                              src={point.imageUrl}
                              alt={point.title}
                              className="h-24 w-full object-cover"
                            />
                          </button>
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                          {point.badge && (
                            <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white">
                              {point.badge}
                            </span>
                          )}
                        </div>
                      )}
                      <button
                        type="button"
                        className="text-left text-sm font-semibold text-[#171717] hover:underline"
                        onClick={(event) => {
                          event.stopPropagation();
                          if (onOpen) onOpen(point.id);
                          else onSelect(point.id);
                        }}
                      >
                        {point.title}
                      </button>
                      {point.address && (
                        <div className="text-[11px] text-[#4e4e4e]">{point.address}</div>
                      )}
                      {point.subtitle && (
                        <div className="text-[11px] text-[#6b6b6b]">{point.subtitle}</div>
                      )}
                    </>
                  )}
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
