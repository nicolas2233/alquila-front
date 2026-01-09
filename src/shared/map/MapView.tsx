import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import type { LatLngExpression } from "leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

export type MapPoint = {
  id: string;
  title: string;
  subtitle?: string;
  imageUrl?: string;
  badge?: string;
  color?: string;
  lat: number;
  lng: number;
};

type MapViewProps = {
  points: MapPoint[];
  selectedId: string | null;
  onSelect: (id: string) => void;
};

const defaultCenter: LatLngExpression = [-35.1197, -60.4899];

const createMarkerIcon = (color: string, isSelected: boolean) =>
  L.divIcon({
    className: "alquila-marker",
    html: `
      <svg width="${isSelected ? 46 : 40}" height="${isSelected ? 46 : 40}" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M32 2C19.3 2 9 12.3 9 25C9 42.9 32 62 32 62C32 62 55 42.9 55 25C55 12.3 44.7 2 32 2Z" fill="${color}"/>
        <circle cx="32" cy="26" r="10" fill="rgba(10,11,16,0.65)"/>
        <circle cx="32" cy="26" r="6" fill="rgba(255,255,255,0.92)"/>
      </svg>
    `,
    iconSize: isSelected ? [46, 46] : [40, 40],
    iconAnchor: isSelected ? [23, 44] : [20, 40],
    popupAnchor: [0, -34],
  });

function MapAutoFit({ points, selectedId }: { points: MapPoint[]; selectedId: string | null }) {
  const map = useMap();

  useEffect(() => {
    if (!points.length) {
      return;
    }

    const selected = selectedId
      ? points.find((point) => point.id === selectedId)
      : null;

    if (selected) {
      map.setView([selected.lat, selected.lng], 14, { animate: true });
      return;
    }

    const bounds = L.latLngBounds(points.map((point) => [point.lat, point.lng]));
    map.fitBounds(bounds, { padding: [32, 32], maxZoom: 14 });
  }, [map, points, selectedId]);

  return null;
}

export function MapView({ points, selectedId, onSelect }: MapViewProps) {
  return (
    <div className="relative z-0 overflow-hidden rounded-[32px] border border-white/10 shadow-soft">
      <MapContainer
        center={defaultCenter}
        zoom={13}
        className="h-[420px] w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapAutoFit points={points} selectedId={selectedId} />
        {points.map((point) => (
          <Marker
            key={point.id}
            position={[point.lat, point.lng]}
            icon={createMarkerIcon(point.color ?? "#d1a466", point.id === selectedId)}
            eventHandlers={{
              click: () => onSelect(point.id),
              mouseover: (event) => event.target.openPopup(),
            }}
          >
            <Popup className="alquila-popup" closeButton={false} offset={[0, -28]}>
              <div className="map-popup-body w-52 space-y-2">
                {point.imageUrl && (
                  <div className="relative overflow-hidden rounded-lg">
                    <img
                      src={point.imageUrl}
                      alt={point.title}
                      className="h-24 w-full object-cover"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                    {point.badge && (
                      <span className="absolute left-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] uppercase tracking-wide text-white">
                        {point.badge}
                      </span>
                    )}
                  </div>
                )}
                <div className="text-sm font-semibold text-[#171717]">{point.title}</div>
                {point.subtitle && (
                  <div className="text-[11px] text-[#6b6b6b]">{point.subtitle}</div>
                )}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
