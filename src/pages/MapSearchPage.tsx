import { useEffect, useMemo, useState } from "react";
import { MapView } from "../shared/map/MapView";

type OperationType = "SALE" | "RENT" | "TEMPORARY";
type PropertyType = "HOUSE" | "APARTMENT" | "LAND" | "COMMERCIAL" | "OFFICE" | "WAREHOUSE";
type PoiCategory =
  | "SCHOOL"
  | "KINDER"
  | "FIRE"
  | "POLICE"
  | "HEALTH"
  | "SUPERMARKET"
  | "PARK";

type MapProperty = {
  id: string;
  title: string;
  operationType: OperationType;
  propertyType: PropertyType;
  priceAmount: number;
  priceCurrency: "ARS" | "USD";
  address: string;
  contactLabel: string;
  rooms?: number;
  areaM2?: number;
  imageUrl?: string;
  badge?: string;
  lat: number;
  lng: number;
  kind?: "PROPERTY" | "POI";
};

const operationLabels: Record<OperationType, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Temporario",
};

const typeLabels: Record<PropertyType, string> = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  LAND: "Terreno",
  COMMERCIAL: "Comercial",
  OFFICE: "Oficina",
  WAREHOUSE: "Deposito",
};

const poiLabels: Record<PoiCategory, string> = {
  SCHOOL: "Escuela",
  KINDER: "Jardin",
  FIRE: "Bomberos",
  POLICE: "Policia",
  HEALTH: "Salud",
  SUPERMARKET: "Supermercado",
  PARK: "Plaza",
};

const operationColors: Record<OperationType, string> = {
  SALE: "#d1a466",
  RENT: "#59c3ff",
  TEMPORARY: "#7fd1b2",
};

const propertyColors: Partial<Record<PropertyType, string>> = {
  COMMERCIAL: "#f6a44d",
};

const getMarkerColor = (propertyType: PropertyType, operationType: OperationType) =>
  propertyColors[propertyType] ?? operationColors[operationType];

const poiColors: Record<PoiCategory, string> = {
  SCHOOL: "#7f8cff",
  KINDER: "#f1c76a",
  FIRE: "#ff6b6b",
  POLICE: "#5a6bff",
  HEALTH: "#58c1a0",
  SUPERMARKET: "#f09f6e",
  PARK: "#7ecf7a",
};

const poiPoints: Array<Omit<MapProperty, "operationType" | "propertyType" | "priceAmount" | "priceCurrency" | "contactLabel"> & { category: PoiCategory }> = [
  {
    id: "poi-1",
    title: "Escuela Primaria 7",
    address: "Centro",
    lat: -35.1194,
    lng: -60.4918,
    category: "SCHOOL",
    kind: "POI",
  },
  {
    id: "poi-2",
    title: "Jardin Arcoiris",
    address: "Barrio Norte",
    lat: -35.1218,
    lng: -60.4872,
    category: "KINDER",
    kind: "POI",
  },
  {
    id: "poi-3",
    title: "Bomberos Voluntarios",
    address: "Mitre y San Martin",
    lat: -35.1176,
    lng: -60.4849,
    category: "FIRE",
    kind: "POI",
  },
  {
    id: "poi-4",
    title: "Comisaria Bragado",
    address: "Sarmiento 520",
    lat: -35.1159,
    lng: -60.4968,
    category: "POLICE",
    kind: "POI",
  },
  {
    id: "poi-5",
    title: "Hospital Municipal",
    address: "Av. San Martin 850",
    lat: -35.1236,
    lng: -60.4928,
    category: "HEALTH",
    kind: "POI",
  },
  {
    id: "poi-6",
    title: "Supermercado Central",
    address: "Av. Rivadavia 420",
    lat: -35.1168,
    lng: -60.4882,
    category: "SUPERMARKET",
    kind: "POI",
  },
  {
    id: "poi-7",
    title: "Plaza San Martin",
    address: "Centro civico",
    lat: -35.1182,
    lng: -60.4907,
    category: "PARK",
    kind: "POI",
  },
];

const sampleProperties: MapProperty[] = [
  {
    id: "map-1",
    title: "Casa con patio y galeria",
    operationType: "SALE",
    propertyType: "HOUSE",
    priceAmount: 125000,
    priceCurrency: "USD",
    address: "Barrio Norte, Bragado",
    contactLabel: "Dueno directo",
    rooms: 4,
    areaM2: 180,
    lat: -35.1206,
    lng: -60.4901,
    imageUrl:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=600&q=80",
    badge: "Casa",
  },
  {
    id: "map-2",
    title: "Departamento luminoso",
    operationType: "RENT",
    propertyType: "APARTMENT",
    priceAmount: 180000,
    priceCurrency: "ARS",
    address: "Centro, Bragado",
    contactLabel: "Inmobiliaria Bragado",
    rooms: 3,
    areaM2: 82,
    lat: -35.1189,
    lng: -60.4867,
    imageUrl:
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=600&q=80",
    badge: "Depto",
  },
  {
    id: "map-3",
    title: "Casa quinta con arboleda",
    operationType: "TEMPORARY",
    propertyType: "HOUSE",
    priceAmount: 95000,
    priceCurrency: "ARS",
    address: "Cuartel VII, Bragado",
    contactLabel: "Dueno directo",
    rooms: 5,
    areaM2: 240,
    lat: -35.1284,
    lng: -60.5022,
    imageUrl:
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=600&q=80",
    badge: "Temporario",
  },
  {
    id: "map-4",
    title: "Terreno con acceso rapido",
    operationType: "SALE",
    propertyType: "LAND",
    priceAmount: 65000,
    priceCurrency: "USD",
    address: "Cuartel III, Bragado",
    contactLabel: "Inmobiliaria Delta",
    areaM2: 500,
    lat: -35.1104,
    lng: -60.4759,
    imageUrl:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=600&q=80",
    badge: "Terreno",
  },
  {
    id: "map-5",
    title: "Local comercial con vidriera",
    operationType: "RENT",
    propertyType: "COMMERCIAL",
    priceAmount: 260000,
    priceCurrency: "ARS",
    address: "Av. Mitre, Bragado",
    contactLabel: "Inmobiliaria Sarmiento",
    areaM2: 110,
    lat: -35.1187,
    lng: -60.4963,
    imageUrl:
      "https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=600&q=80",
    badge: "Local",
  },
  {
    id: "map-6",
    title: "Oficina flexible para equipos",
    operationType: "RENT",
    propertyType: "OFFICE",
    priceAmount: 220000,
    priceCurrency: "ARS",
    address: "Zona Banco, Bragado",
    contactLabel: "Inmobiliaria Norte",
    areaM2: 95,
    lat: -35.1268,
    lng: -60.4842,
    imageUrl:
      "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=600&q=80",
    badge: "Oficina",
  },
  {
    id: "map-7",
    title: "Deposito con ingreso camion",
    operationType: "SALE",
    propertyType: "WAREHOUSE",
    priceAmount: 210000,
    priceCurrency: "USD",
    address: "Cuartel VI, Bragado",
    contactLabel: "Inmobiliaria Delta",
    areaM2: 640,
    lat: -35.1329,
    lng: -60.4938,
    imageUrl:
      "https://images.unsplash.com/photo-1489515217757-5fd1be406fef?auto=format&fit=crop&w=600&q=80",
    badge: "Deposito",
  },
];

const operationFilters: OperationType[] = ["SALE", "RENT", "TEMPORARY"];
const typeFilters: PropertyType[] = [
  "HOUSE",
  "APARTMENT",
  "LAND",
  "COMMERCIAL",
  "OFFICE",
  "WAREHOUSE",
];

export function MapSearchPage() {
  const [activeOperations, setActiveOperations] = useState<OperationType[]>([]);
  const [activeTypes, setActiveTypes] = useState<PropertyType[]>([]);
  const [activePoi, setActivePoi] = useState<PoiCategory[]>([
    "SCHOOL",
    "KINDER",
    "FIRE",
    "POLICE",
    "HEALTH",
    "SUPERMARKET",
    "PARK",
  ]);
  const [legendOpen, setLegendOpen] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(
    sampleProperties[0]?.id ?? null
  );

  const counts = useMemo(() => {
    const total = sampleProperties.length;
    const byOperation = operationFilters.reduce((acc, op) => {
      acc[op] = sampleProperties.filter((item) => item.operationType === op).length;
      return acc;
    }, {} as Record<OperationType, number>);
    return { total, byOperation };
  }, []);

  const filtered = useMemo(() => {
    let list = [...sampleProperties];
    if (activeOperations.length) {
      list = list.filter((item) => activeOperations.includes(item.operationType));
    }
    if (activeTypes.length) {
      list = list.filter((item) => activeTypes.includes(item.propertyType));
    }
    return list;
  }, [activeOperations, activeTypes]);

  const filteredPoi = useMemo(() => {
    if (!activePoi.length) {
      return [];
    }
    return poiPoints.filter((poi) => activePoi.includes(poi.category));
  }, [activePoi]);

  const propertyIdSet = useMemo(
    () => new Set(sampleProperties.map((item) => item.id)),
    []
  );

  useEffect(() => {
    if (!filtered.length) {
      setSelectedId(null);
      return;
    }
    const exists = filtered.some((item) => item.id === selectedId);
    if (!exists) {
      setSelectedId(filtered[0].id);
    }
  }, [filtered, selectedId]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;

  const toggleOperation = (value: OperationType) => {
    setActiveOperations((prev) =>
      prev.includes(value) ? prev.filter((op) => op !== value) : [...prev, value]
    );
  };

  const toggleType = (value: PropertyType) => {
    setActiveTypes((prev) =>
      prev.includes(value) ? prev.filter((tp) => tp !== value) : [...prev, value]
    );
  };

  const togglePoi = (value: PoiCategory) => {
    setActivePoi((prev) =>
      prev.includes(value) ? prev.filter((poi) => poi !== value) : [...prev, value]
    );
  };

  const clearFilters = () => {
    setActiveOperations([]);
    setActiveTypes([]);
    setActivePoi([]);
  };

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Mapa interactivo</h2>
          <p className="text-sm text-[#9a948a]">
            Filtra por operacion y tipo de inmueble. Los puntos cambian en tiempo real.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 text-xs text-[#9a948a]">
          <span className="rounded-full border border-white/10 px-3 py-1">
            Total: {counts.total}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Venta: {counts.byOperation.SALE}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Alquiler: {counts.byOperation.RENT}
          </span>
          <span className="rounded-full border border-white/10 px-3 py-1">
            Temporario: {counts.byOperation.TEMPORARY}
          </span>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <section className="glass-card space-y-6 p-6">
          <div>
            <h3 className="text-lg text-white">Filtros</h3>
            <p className="text-xs text-[#9a948a]">Activa o desactiva para mostrar puntos.</p>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9a948a]">Operacion</p>
            <div className="grid gap-2">
              {operationFilters.map((value) => (
                <label
                  key={value}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-night-900/50 px-3 py-2 text-xs text-[#c7c2b8]"
                >
                  <span>{operationLabels[value]}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={activeOperations.includes(value)}
                    onChange={() => toggleOperation(value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9a948a]">Tipo</p>
            <div className="grid gap-2">
              {typeFilters.map((value) => (
                <label
                  key={value}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-night-900/50 px-3 py-2 text-xs text-[#c7c2b8]"
                >
                  <span>{typeLabels[value]}</span>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={activeTypes.includes(value)}
                    onChange={() => toggleType(value)}
                  />
                </label>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.2em] text-[#9a948a]">Servicios cerca</p>
            <div className="grid gap-2">
              {Object.keys(poiLabels).map((value) => {
                const key = value as PoiCategory;
                return (
                  <label
                    key={key}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-night-900/50 px-3 py-2 text-xs text-[#c7c2b8]"
                  >
                    <span>{poiLabels[key]}</span>
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={activePoi.includes(key)}
                      onChange={() => togglePoi(key)}
                    />
                  </label>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={clearFilters}
            className="w-full rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
          >
            Limpiar filtros
          </button>
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9a948a]">
              <span>Bragado</span>
              <span>{filtered.length} puntos visibles</span>
            </div>
            <MapView
              points={[
                ...filtered.map((item) => ({
                  id: item.id,
                  title: item.title,
                  subtitle: `${operationLabels[item.operationType]} · ${typeLabels[item.propertyType]}`,
                  imageUrl: item.imageUrl,
                  badge: item.badge,
                  color: getMarkerColor(item.propertyType, item.operationType),
                  lat: item.lat,
                  lng: item.lng,
                })),
                ...filteredPoi.map((poi) => ({
                  id: poi.id,
                  title: poi.title,
                  subtitle: poiLabels[poi.category],
                  badge: poiLabels[poi.category],
                  color: poiColors[poi.category],
                  lat: poi.lat,
                  lng: poi.lng,
                })),
              ]}
              selectedId={selectedId}
              onSelect={(id) => {
                if (propertyIdSet.has(id)) {
                  setSelectedId(id);
                }
              }}
            />
          </div>

          <div className="glass-card space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm text-white">Leyenda</h3>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#c7c2b8] md:hidden"
                onClick={() => setLegendOpen((open) => !open)}
              >
                <span>{legendOpen ? "Ocultar" : "Mostrar"}</span>
                <span
                  className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 ${
                    legendOpen ? "rotate-180" : "rotate-0"
                  } transition-transform duration-300`}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="h-3 w-3"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </span>
              </button>
            </div>
            <div
              className={`flex flex-wrap gap-2 text-xs text-[#c7c2b8] overflow-hidden transition-all duration-300 md:flex ${
                legendOpen
                  ? "max-h-64 opacity-100 translate-y-0"
                  : "max-h-0 opacity-0 -translate-y-2 md:max-h-none md:opacity-100 md:translate-y-0"
              }`}
            >
              {operationFilters
                .filter((op) => !activeOperations.length || activeOperations.includes(op))
                .map((op) => (
                  <span
                    key={op}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1"
                  >
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: operationColors[op] }}
                    />
                    {operationLabels[op]}
                  </span>
                ))}
              {(!activeTypes.length || activeTypes.includes("COMMERCIAL")) && (
                <span className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1">
                  <span
                    className="inline-flex h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: propertyColors.COMMERCIAL }}
                  />
                  Comercial
                </span>
              )}
              {Object.keys(poiLabels)
                .map((key) => key as PoiCategory)
                .filter((poi) => activePoi.includes(poi))
                .map((poi) => (
                  <span
                    key={poi}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1"
                  >
                    <span
                      className="inline-flex h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: poiColors[poi] }}
                    />
                    {poiLabels[poi]}
                  </span>
                ))}
              {!activeOperations.length &&
                !activeTypes.length &&
                !activePoi.length && (
                  <span className="text-xs text-[#9a948a]">
                    Activa filtros para mostrar la leyenda.
                  </span>
                )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="glass-card space-y-4 p-6">
              <h3 className="text-lg text-white">Ficha rapida</h3>
              {selected ? (
                <div className="space-y-3 text-sm text-[#c7c2b8]">
                  <div className="text-base text-white">{selected.title}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-[#9a948a]">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {operationLabels[selected.operationType]}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {typeLabels[selected.propertyType]}
                    </span>
                  </div>
                  <div className="text-2xl text-white">
                    {selected.priceCurrency} {selected.priceAmount.toLocaleString("es-AR")}
                  </div>
                  <div className="text-xs text-[#9a948a]">{selected.address}</div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#9a948a]">
                    {selected.rooms && <span>{selected.rooms} ambientes</span>}
                    {selected.areaM2 && <span>{selected.areaM2} m2</span>}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-night-900/60 px-4 py-3 text-xs text-[#c7c2b8]">
                    Contacto: {selected.contactLabel}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[#9a948a]">No hay inmuebles para mostrar.</p>
              )}
            </div>

            <div className="glass-card space-y-3 p-6">
              <h3 className="text-lg text-white">Resultados</h3>
              <div className="space-y-3 text-xs text-[#9a948a]">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setSelectedId(item.id)}
                    className={
                      item.id === selectedId
                        ? "flex w-full flex-col gap-1 rounded-2xl border border-gold-500/40 bg-night-900/60 px-4 py-3 text-left text-white"
                        : "flex w-full flex-col gap-1 rounded-2xl border border-white/10 bg-night-900/50 px-4 py-3 text-left text-[#c7c2b8]"
                    }
                  >
                    <span className="text-sm text-white">{item.title}</span>
                    <span>{operationLabels[item.operationType]} · {typeLabels[item.propertyType]}</span>
                    <span>{item.address}</span>
                  </button>
                ))}
                {!filtered.length && (
                  <p className="text-xs text-[#9a948a]">Sin resultados para estos filtros.</p>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
