
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { MapView, type MapPoint } from "../shared/map/MapView";
import { getSessionUser } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { env } from "../shared/config/env";

type OperationType = "SALE" | "RENT" | "TEMPORARY";
type PropertyType =
  | "HOUSE"
  | "APARTMENT"
  | "LAND"
  | "FIELD"
  | "QUINTA"
  | "COMMERCIAL"
  | "OFFICE"
  | "WAREHOUSE";
type PoiCategory =
  | "SCHOOL"
  | "KINDER"
  | "FIRE"
  | "POLICE"
  | "HEALTH"
  | "SUPERMARKET"
  | "PARK";
type PublisherType = "OWNER" | "AGENCY";

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
  publisherType: PublisherType;
  showMapLocation?: boolean;
  buildingId?: string | null;
  unitLabel?: string | null;
  lat: number;
  lng: number;
  kind?: "PROPERTY" | "POI";
};

type PoiItem = {
  id: string;
  title: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  address?: string | null;
  description?: string | null;
  isActive?: boolean;
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
  FIELD: "Campo",
  QUINTA: "Quinta",
  COMMERCIAL: "Comercio",
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
  SALE: "#AF8C5C",
  RENT: "#59c3ff",
  TEMPORARY: "#7fd1b2",
};

const propertyColors: Partial<Record<PropertyType, string>> = {
  COMMERCIAL: "#f6a44d",
  FIELD: "#6ea06d",
  QUINTA: "#7aa37a",
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

const operationFilters: OperationType[] = ["SALE", "RENT", "TEMPORARY"];
const typeFilters: PropertyType[] = [
  "HOUSE",
  "APARTMENT",
  "LAND",
  "FIELD",
  "QUINTA",
  "COMMERCIAL",
  "OFFICE",
  "WAREHOUSE",
];
const publisherFilters: PublisherType[] = ["OWNER", "AGENCY"];
const publisherLabels: Record<PublisherType, string> = {
  OWNER: "Dueño directo",
  AGENCY: "Inmobiliaria",
};
const publisherColors: Record<PublisherType, string> = {
  OWNER: "#AF8C5C",
  AGENCY: "#59c3ff",
};

export function MapSearchPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");
  const [poiItems, setPoiItems] = useState<PoiItem[]>([]);
  const [poiStatus, setPoiStatus] = useState<"idle" | "loading" | "error">("idle");
  const [poiError, setPoiError] = useState("");
  const [activeOperations, setActiveOperations] = useState<OperationType[]>([]);
  const [activeTypes, setActiveTypes] = useState<PropertyType[]>([]);
  const [activePublishers, setActivePublishers] = useState<PublisherType[]>([]);
  const [activePoi, setActivePoi] = useState<PoiCategory[]>([]);
  const [legendOpen, setLegendOpen] = useState(false);
  const [operationOpen, setOperationOpen] = useState(false);
  const [typeOpen, setTypeOpen] = useState(false);
  const [publisherOpen, setPublisherOpen] = useState(false);
  const [poiOpen, setPoiOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);

  useEffect(() => {
    if (!sessionUser) {
      setProperties([]);
      setListStatus("idle");
      setListError("");
      return;
    }
    let ignore = false;
    const controller = new AbortController();
    const load = async () => {
      setListStatus("loading");
      setListError("");
      try {
        const params = new URLSearchParams({
          status: "ACTIVE",
          page: "1",
          pageSize: "100",
        });
        const response = await fetch(`${env.apiUrl}/properties?${params.toString()}`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar los inmuebles.");
        }
        const data = (await response.json()) as {
          items: Array<{
            id: string;
            title: string;
            operationType: OperationType;
            propertyType: PropertyType;
            priceAmount: number;
            priceCurrency: "ARS" | "USD";
            rooms?: number | null;
            areaM2?: number | null;
            features?: { showMapLocation?: boolean } | null;
            unitLabel?: string | null;
            buildingId?: string | null;
            agency?: { name: string } | null;
            ownerDisplayName?: string | null;
            location?: {
              addressLine?: string | null;
              lat?: number | null;
              lng?: number | null;
            } | null;
            photos?: { url: string }[];
          }>;
        };
        if (ignore) return;
        const mapped: MapProperty[] = (data.items ?? [])
          .map((item) => {
            const rawLat = item.location?.lat ?? null;
            const rawLng = item.location?.lng ?? null;
            const lat = rawLat === null ? NaN : Number(rawLat);
            const lng = rawLng === null ? NaN : Number(rawLng);
            return {
              id: item.id,
              title: item.title,
              operationType: item.operationType,
              propertyType: item.propertyType,
              priceAmount: Number(item.priceAmount),
              priceCurrency: item.priceCurrency,
              address: `${item.location?.addressLine ?? "Bragado"}${
                item.unitLabel ? ` (${item.unitLabel})` : ""
              }`,
              contactLabel:
                item.agency?.name ??
                item.ownerDisplayName?.trim() ??
                "Dueño directo",
              rooms: item.rooms ?? undefined,
              areaM2: item.areaM2 ?? undefined,
              imageUrl: item.photos?.[0]?.url,
              badge: typeLabels[item.propertyType],
              publisherType: (item.agency?.name ? "AGENCY" : "OWNER") as PublisherType,
              showMapLocation: item.features?.showMapLocation ?? true,
              buildingId: item.buildingId ?? null,
              unitLabel: item.unitLabel ?? null,
              lat,
              lng,
            };
          })
          .filter(
            (item) =>
              Number.isFinite(item.lat) &&
              Number.isFinite(item.lng) &&
              item.showMapLocation !== false
          );
        setProperties(mapped);
        setListStatus("idle");
      } catch (error) {
        if (ignore || controller.signal.aborted) return;
        setListStatus("error");
        setListError(
          error instanceof Error ? error.message : "No pudimos cargar los inmuebles."
        );
        setProperties([]);
      }
    };
    void load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [sessionUser]);

  useEffect(() => {
    if (!sessionUser) {
      setPoiItems([]);
      setPoiStatus("idle");
      setPoiError("");
      return;
    }
    let ignore = false;
    const controller = new AbortController();
    const load = async () => {
      setPoiStatus("loading");
      setPoiError("");
      try {
        const response = await fetch(`${env.apiUrl}/pois?active=true`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar los puntos de interes.");
        }
        const data = (await response.json()) as { items: PoiItem[] };
        if (ignore) return;
        setPoiItems(data.items ?? []);
        setPoiStatus("idle");
      } catch (error) {
        if (ignore || controller.signal.aborted) return;
        setPoiStatus("error");
        setPoiError(
          error instanceof Error ? error.message : "No pudimos cargar los puntos de interes."
        );
      }
    };
    void load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [sessionUser]);

  const filtered = useMemo(() => {
    if (!activeOperations.length && !activeTypes.length) {
      return [];
    }
    let list = [...properties];
    if (activeOperations.length) {
      list = list.filter((item) => activeOperations.includes(item.operationType));
    }
    if (activeTypes.length) {
      list = list.filter((item) => activeTypes.includes(item.propertyType));
    }
    if (activePublishers.length) {
      list = list.filter((item) => activePublishers.includes(item.publisherType));
    }
    return list;
  }, [activeOperations, activeTypes, activePublishers, properties]);

  const filteredPoi = useMemo(() => {
    if (!sessionUser || !activePoi.length) {
      return [];
    }
    return poiItems.filter((poi) => activePoi.includes(poi.category));
  }, [activePoi, sessionUser, poiItems]);

  const buildingGroups = useMemo(() => {
    const groups = new Map<string, MapProperty[]>();
    filtered.forEach((item) => {
      const key = item.buildingId ?? `loc:${item.lat.toFixed(5)}:${item.lng.toFixed(5)}`;
      const list = groups.get(key) ?? [];
      list.push(item);
      groups.set(key, list);
    });
    return groups;
  }, [filtered]);

  const pointsForMap = useMemo(() => {
    const points: MapPoint[] = [];
    buildingGroups.forEach((group, key) => {
      const first = group[0];
      if (!first) return;
      if (group.length > 1) {
        points.push({
          id: `building:${key}`,
          title: `${group.length} unidades`,
          address: first.address,
          subtitle: `${group.length} unidades disponibles`,
          color: "#7f8cff",
          lat: first.lat,
          lng: first.lng,
          count: group.length,
        });
      } else {
        points.push({
          id: first.id,
          title: first.title,
          subtitle: `${operationLabels[first.operationType]} - ${typeLabels[first.propertyType]}`,
          address: first.address,
          imageUrl: first.imageUrl,
          badge: first.badge,
          color: getMarkerColor(first.propertyType, first.operationType),
          lat: first.lat,
          lng: first.lng,
        });
      }
    });
    return points;
  }, [buildingGroups]);

  const openDetail = async (id: string) => {
    if (!sessionUser) {
      addToast("Inicia sesion para ver la ficha completa.", "warning");
      navigate("/login");
      return;
    }
    navigate(`/publicacion/${id}`);
  };

  const propertyIdSet = useMemo(() => new Set(properties.map((item) => item.id)), [
    properties,
  ]);

  useEffect(() => {
    if (selectedId && !filtered.some((item) => item.id === selectedId)) {
      setSelectedId(null);
    }
    if (selectedBuildingId && !buildingGroups.has(selectedBuildingId)) {
      setSelectedBuildingId(null);
    }
  }, [filtered, selectedId, selectedBuildingId, buildingGroups]);

  const selected = filtered.find((item) => item.id === selectedId) ?? null;
  const selectedBuildingItems = selectedBuildingId
    ? (buildingGroups.get(selectedBuildingId) ?? [])
    : [];

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
  const togglePublisher = (value: PublisherType) => {
    setActivePublishers((prev) =>
      prev.includes(value) ? prev.filter((item) => item !== value) : [...prev, value]
    );
  };

  const clearFilters = () => {
    setActiveOperations([]);
    setActiveTypes([]);
    setActivePublishers([]);
    setActivePoi([]);
  };
  const hasActiveFilters =
    activeOperations.length > 0 ||
    activeTypes.length > 0 ||
    activePublishers.length > 0 ||
    activePoi.length > 0;

  const mapFilterSectionButtonClass =
    "flex w-full items-center justify-between rounded-xl border border-white/15 bg-gradient-to-r from-night-900/75 to-night-800/55 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#E7E2DD] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02)]";
  const mapFilterOptionClass =
    "flex items-center justify-between rounded-xl border border-white/12 bg-night-900/42 px-3 py-2 text-xs text-[#E7E2DD]";
  const mapFilterCheckboxWrapClass =
    "inline-flex h-6 w-6 items-center justify-center rounded-md border border-white/15 bg-night-800/75";

  const filtersPanel = (
    <div className="space-y-5">
      <div>
        <h3 className="text-lg text-white">Filtros del mapa</h3>
        <p className="text-xs text-[#D1C7BD]">
          Activa criterios para mostrar solo puntos relevantes.
        </p>
        <p className="mt-2 text-[11px] text-[#D1C7BD]">
          {hasActiveFilters
            ? `${activeOperations.length + activeTypes.length + activePublishers.length + activePoi.length} filtros activos`
            : "Sin filtros activos"}
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className={mapFilterSectionButtonClass}
          onClick={() => setPublisherOpen((prev) => !prev)}
        >
          Publicador {activePublishers.length > 0 ? `(${activePublishers.length})` : ""}
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 transition-transform ${
              publisherOpen ? "rotate-180" : "rotate-0"
            }`}
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
        <div
          className={`grid gap-2 overflow-hidden transition-all duration-300 ${
            publisherOpen ? "max-h-48 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {publisherFilters.map((value) => (
            <label
              key={value}
              className={mapFilterOptionClass}
              style={{ borderLeftWidth: 3, borderLeftColor: publisherColors[value] }}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: publisherColors[value] }}
                />
                {publisherLabels[value]}
              </span>
              <span className={mapFilterCheckboxWrapClass}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={activePublishers.includes(value)}
                  onChange={() => togglePublisher(value)}
                />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className={mapFilterSectionButtonClass}
          onClick={() => setOperationOpen((prev) => !prev)}
        >
          Operacion {activeOperations.length > 0 ? `(${activeOperations.length})` : ""}
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 transition-transform ${
              operationOpen ? "rotate-180" : "rotate-0"
            }`}
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
        <div
          className={`grid gap-2 overflow-hidden transition-all duration-300 ${
            operationOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {operationFilters.map((value) => (
            <label
              key={value}
              className={mapFilterOptionClass}
              style={{ borderLeftWidth: 3, borderLeftColor: operationColors[value] }}
            >
              <span className="inline-flex items-center gap-2">
                <span
                  aria-hidden="true"
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: operationColors[value] }}
                />
                {operationLabels[value]}
              </span>
              <span className={mapFilterCheckboxWrapClass}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={activeOperations.includes(value)}
                  onChange={() => toggleOperation(value)}
                />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className={mapFilterSectionButtonClass}
          onClick={() => setTypeOpen((prev) => !prev)}
        >
          Tipo {activeTypes.length > 0 ? `(${activeTypes.length})` : ""}
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 transition-transform ${
              typeOpen ? "rotate-180" : "rotate-0"
            }`}
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
        <div
          className={`grid gap-2 overflow-hidden transition-all duration-300 ${
            typeOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {typeFilters.map((value) => (
            <label
              key={value}
              className={mapFilterOptionClass}
            >
              <span>{typeLabels[value]}</span>
              <span className={mapFilterCheckboxWrapClass}>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={activeTypes.includes(value)}
                  onChange={() => toggleType(value)}
                />
              </span>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className={mapFilterSectionButtonClass}
          onClick={() => setPoiOpen((prev) => !prev)}
        >
          Servicios cerca {activePoi.length > 0 ? `(${activePoi.length})` : ""}
          <span
            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/10 transition-transform ${
              poiOpen ? "rotate-180" : "rotate-0"
            }`}
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
        <div
          className={`grid gap-2 overflow-hidden transition-all duration-300 ${
            poiOpen ? "max-h-[520px] opacity-100" : "max-h-0 opacity-0"
          }`}
        >
          {Object.keys(poiLabels).map((value) => {
            const key = value as PoiCategory;
            return (
              <label
                key={key}
                className={mapFilterOptionClass}
                style={{ borderLeftWidth: 3, borderLeftColor: poiColors[key] }}
              >
                <span className="inline-flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: poiColors[key] }}
                  />
                  {poiLabels[key]}
                </span>
                <span className={mapFilterCheckboxWrapClass}>
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={activePoi.includes(key)}
                    onChange={() => togglePoi(key)}
                  />
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={clearFilters}
        className="w-full rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] disabled:cursor-not-allowed disabled:opacity-40"
        disabled={!hasActiveFilters}
      >
        Limpiar filtros
      </button>
    </div>
  );

  return (
    <div className="space-y-4 md:space-y-8">
      <section className="relative h-[40svh] min-h-[240px] w-full overflow-hidden rounded-[24px] border border-white/15 md:h-[52svh] md:min-h-[320px] md:rounded-[30px] lg:-mt-8 xl:-mt-10">
        <div className="absolute inset-0 bg-hero bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/45 to-black/68" />
        <div className="relative mx-auto flex h-full max-w-5xl items-center justify-center px-4 text-center sm:px-6">
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">DomusBrag Map</p>
            <h2 className="font-display text-2xl leading-tight text-white sm:text-3xl md:text-5xl">
              Explora Bragado en el mapa
            </h2>
            <p className="mx-auto max-w-2xl text-xs text-[#E7E2DD] sm:text-sm md:text-base">
              Filtra por operacion, tipo de inmueble, publicador y servicios cercanos.
            </p>
            <div className="flex justify-center">
              <span className="gold-pill">{filtered.length} puntos visibles</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 text-xs text-[#D1C7BD] md:hidden">
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition md:hidden ${
              hasActiveFilters
                ? "border border-gold-200/70 bg-[linear-gradient(180deg,rgba(175,140,92,0.46),rgba(175,140,92,0.26))] text-white shadow-[0_10px_28px_rgba(0,0,0,0.38),0_0_0_1px_rgba(209,164,102,0.35),0_0_24px_rgba(209,164,102,0.18)]"
                : "border border-gold-300/60 bg-[linear-gradient(180deg,rgba(175,140,92,0.32),rgba(175,140,92,0.18))] text-gold-100 shadow-[0_8px_24px_rgba(0,0,0,0.35),0_0_0_1px_rgba(209,164,102,0.22)]"
            }`}
            onClick={() => setMobileFiltersOpen(true)}
          >
            <svg
              aria-hidden="true"
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="h-3.5 w-3.5"
            >
              <line x1="4" y1="6" x2="20" y2="6" />
              <line x1="7" y1="12" x2="17" y2="12" />
              <line x1="10" y1="18" x2="14" y2="18" />
            </svg>
            Filtros
            {hasActiveFilters && (
              <span className="rounded-full bg-gold-500/40 px-2 py-0.5 text-[10px] text-[#1A1613]">
                {activeOperations.length + activeTypes.length + activePublishers.length + activePoi.length}
              </span>
            )}
          </button>
        </div>
      </section>

      <div className="grid items-start gap-4 md:gap-8 lg:grid-cols-[264px_1fr] xl:grid-cols-[276px_1fr]">
        <section className="glass-card hidden space-y-5 p-5 lg:block lg:h-fit">
          {filtersPanel}
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#D1C7BD]">
              <span>Bragado</span>
              <span>{filtered.length} puntos visibles</span>
            </div>
            <div className="rounded-2xl border border-white/10 bg-night-900/48 p-2.5 sm:rounded-3xl sm:p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-[#D1C7BD]">
                <span>Mapa principal</span>
                <span>{listStatus === "loading" ? "Cargando..." : "Actualizado"}</span>
              </div>
              <div className="mt-3 h-[42svh] max-h-[540px] min-h-[250px] overflow-hidden rounded-2xl border border-white/10 sm:h-[62vh] sm:min-h-[360px]">
                <MapView
                  points={[
                    ...(sessionUser ? pointsForMap : []),
                    ...(sessionUser
                      ? filteredPoi.map((poi) => ({
                      id: poi.id,
                      title: poi.title,
                      subtitle: poiLabels[poi.category],
                      address: poi.address ?? undefined,
                      badge: poiLabels[poi.category],
                      color: poiColors[poi.category],
                      lat: poi.lat,
                      lng: poi.lng,
                    }))
                      : []),
                  ]}
                  selectedId={selectedBuildingId ? `building:${selectedBuildingId}` : selectedId}
                  onSelect={(id) => {
                    if (propertyIdSet.has(id)) {
                      setSelectedId(id);
                      setSelectedBuildingId(null);
                      return;
                    }
                    if (id.startsWith("building:")) {
                      setSelectedBuildingId(id.replace("building:", ""));
                      setSelectedId(null);
                    }
                  }}
                  onOpen={(id) => {
                    if (propertyIdSet.has(id)) {
                      void openDetail(id);
                    }
                  }}
                />
              </div>
              {listStatus === "error" && (
                <div className="mt-3 text-xs text-[#AF8C5C]">{listError}</div>
              )}
              {poiStatus === "error" && (
                <div className="mt-2 text-xs text-[#AF8C5C]">{poiError}</div>
              )}
              {!sessionUser && (
                <div className="mt-3 text-xs text-[#D1C7BD]">
                  Inicia sesion para ver los puntos en el mapa.
                </div>
              )}
              {sessionUser && listStatus === "idle" && properties.length === 0 && (
                <div className="mt-3 text-xs text-[#D1C7BD]">
                  No hay inmuebles con geolocalizacion cargada.
                </div>
              )}
              {sessionUser && listStatus === "idle" && !hasActiveFilters && (
                <div className="mt-3 rounded-2xl border border-white/10 bg-night-900/38 px-4 py-4 text-xs text-[#D1C7BD]">
                  <div className="text-sm text-white">Activa filtros para comenzar</div>
                  <div className="mt-1">
                    Selecciona operacion, tipo o publicador para mostrar puntos en el mapa.
                  </div>
                </div>
              )}
              {sessionUser && listStatus === "idle" && hasActiveFilters && filtered.length === 0 && (
                <div className="mt-3 rounded-2xl border border-[#AF8C5C]/35 bg-night-900/38 px-4 py-4 text-xs text-[#D1C7BD]">
                  <div className="text-sm text-white">No encontramos coincidencias</div>
                  <div className="mt-1">
                    Prueba aflojando algun filtro o limpiando la seleccion actual.
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="glass-card space-y-3 p-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm text-white">Leyenda</h3>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-full border border-white/10 px-3 py-1 text-[11px] text-[#E7E2DD] md:hidden"
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
              className={`flex flex-wrap gap-2 text-xs text-[#E7E2DD] overflow-hidden transition-all duration-300 md:flex ${
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
              {!activeOperations.length && !activeTypes.length && !activePoi.length && (
                <span className="text-xs text-[#D1C7BD]">
                  Activa filtros para mostrar la leyenda.
                </span>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <div className="glass-card space-y-4 p-6">
              <h3 className="text-lg text-white">Ficha rapida</h3>
              {selected ? (
                <div className="space-y-3 text-sm text-[#E7E2DD]">
                  <div className="text-base text-white">{selected.title}</div>
                  <div className="flex flex-wrap gap-2 text-xs text-[#D1C7BD]">
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {operationLabels[selected.operationType]}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {publisherLabels[selected.publisherType]}
                    </span>
                    <span className="rounded-full border border-white/10 px-3 py-1">
                      {typeLabels[selected.propertyType]}
                    </span>
                  </div>
                  <div className="text-2xl text-white">
                    {selected.priceCurrency} {selected.priceAmount.toLocaleString("es-AR")}
                  </div>
                  <div className="text-xs text-[#D1C7BD]">{selected.address}</div>
                  <div className="flex flex-wrap gap-3 text-xs text-[#D1C7BD]">
                    {selected.rooms && <span>{selected.rooms} ambientes</span>}
                    {selected.areaM2 && <span>{selected.areaM2} m2</span>}
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-night-900/48 px-4 py-3 text-xs text-[#E7E2DD]">
                    Contacto: {selected.contactLabel}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                      type="button"
                      onClick={() => openDetail(selected.id)}
                    >
                      Ver ficha
                    </button>
                  </div>
                </div>
              ) : selectedBuildingItems.length ? (
                <div className="space-y-3 text-xs text-[#E7E2DD]">
                  <div className="text-sm text-white">
                    {selectedBuildingItems.length} unidades disponibles
                  </div>
                  <div className="space-y-2">
                    {selectedBuildingItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/32 px-3 py-2"
                      >
                        <div className="space-y-1">
                          <div className="text-sm text-white">{item.title}</div>
                          <div className="text-[11px] text-[#D1C7BD]">
                            {operationLabels[item.operationType]} - {typeLabels[item.propertyType]}
                          </div>
                          <div className="text-[11px] text-[#D1C7BD]">{item.address}</div>
                        </div>
                        <button
                          type="button"
                          onClick={() => openDetail(item.id)}
                          className="rounded-full border border-white/20 px-3 py-1 text-[11px] text-white"
                        >
                          Ver ficha
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-white/10 bg-night-900/38 px-4 py-4 text-xs text-[#D1C7BD]">
                  {!hasActiveFilters
                    ? "Activa filtros para mostrar inmuebles en esta ficha rapida."
                    : "No hay inmuebles para mostrar con los filtros actuales."}
                </div>
              )}
            </div>

            <div className="glass-card space-y-3 p-6">
              <h3 className="text-lg text-white">Resultados</h3>
              <div className="space-y-3 text-xs text-[#D1C7BD]">
                {filtered.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(item.id);
                      setSelectedBuildingId(null);
                    }}
                    className={
                      item.id === selectedId
                        ? "flex w-full flex-col gap-1 rounded-2xl border border-gold-500/40 bg-night-900/48 px-4 py-3 text-left text-white"
                        : "flex w-full flex-col gap-1 rounded-2xl border border-white/10 bg-night-900/32 px-4 py-3 text-left text-[#E7E2DD]"
                    }
                  >
                    <span className="text-sm text-white">{item.title}</span>
                    <span>
                      {operationLabels[item.operationType]} - {typeLabels[item.propertyType]}
                    </span>
                    <span>{publisherLabels[item.publisherType]}</span>
                    <span>{item.address}</span>
                  </button>
                ))}
                {!filtered.length && (
                  <div className="rounded-2xl border border-white/10 bg-night-900/38 px-4 py-4 text-xs text-[#D1C7BD]">
                    {!hasActiveFilters
                      ? "Selecciona al menos un filtro para listar resultados."
                      : "Sin resultados para los filtros elegidos."}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[1300] bg-black/70 p-4 pb-[calc(6.6rem+env(safe-area-inset-bottom))] lg:hidden">
          <div className="glass-card mx-auto flex h-full max-h-[82vh] w-full max-w-md flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-sm text-white">Filtros</div>
                <div className="text-[11px] text-[#D1C7BD]">
                  Ajusta para ver solo lo que te interesa.
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filtersPanel}</div>
            <div className="border-t border-white/10 p-4">
              <button
                type="button"
                className="w-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Ver resultados
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





