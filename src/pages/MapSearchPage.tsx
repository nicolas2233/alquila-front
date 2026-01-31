
import { useEffect, useMemo, useState } from "react";
import { MapView, type MapPoint } from "../shared/map/MapView";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type { PropertyApiDetail } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing } from "../shared/properties/propertyMappers";
import { buildWhatsappLink } from "../shared/utils/whatsapp";
import { getSessionUser, getToken } from "../shared/auth/session";
import { hasSentContactRequest, markContactRequestSent } from "../shared/utils/contactRequests";
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
  showMapLocation?: boolean;
  buildingId?: string | null;
  unitLabel?: string | null;
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
  SALE: "#d1a466",
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

const poiPoints: Array<
  Omit<
    MapProperty,
    "operationType" | "propertyType" | "priceAmount" | "priceCurrency" | "contactLabel"
  > & { category: PoiCategory }
> = [];

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

export function MapSearchPage() {
  const { addToast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const sessionToken = useMemo(() => getToken(), []);
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");
  const [activeOperations, setActiveOperations] = useState<OperationType[]>([]);
  const [activeTypes, setActiveTypes] = useState<PropertyType[]>([]);
  const [activePoi, setActivePoi] = useState<PoiCategory[]>([]);
  const [legendOpen, setLegendOpen] = useState(true);
  const [operationOpen, setOperationOpen] = useState(true);
  const [typeOpen, setTypeOpen] = useState(true);
  const [poiOpen, setPoiOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "error">("idle");
  const [detailError, setDetailError] = useState("");
  const [selectedListing, setSelectedListing] =
    useState<ReturnType<typeof mapPropertyToDetailListing> | null>(null);
  const [contactStatus, setContactStatus] = useState<"idle" | "loading" | "success">(
    "idle"
  );
  const [contactMessage, setContactMessage] = useState("");

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
            location?: {
              addressLine?: string | null;
              lat?: number | null;
              lng?: number | null;
            } | null;
            photos?: { url: string }[];
          }>;
        };
        if (ignore) return;
        const mapped = (data.items ?? [])
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
              contactLabel: item.agency?.name ?? "Dueño directo",
              rooms: item.rooms ?? undefined,
              areaM2: item.areaM2 ?? undefined,
              imageUrl: item.photos?.[0]?.url,
              badge: typeLabels[item.propertyType],
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

  const counts = useMemo(() => {
    const total = properties.length;
    const byOperation = operationFilters.reduce((acc, op) => {
      acc[op] = properties.filter((item) => item.operationType === op).length;
      return acc;
    }, {} as Record<OperationType, number>);
    return { total, byOperation };
  }, [properties]);

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
    return list;
  }, [activeOperations, activeTypes, properties]);

  const filteredPoi = useMemo(() => {
    if (!sessionUser || !activePoi.length) {
      return [];
    }
    return poiPoints.filter((poi) => activePoi.includes(poi.category));
  }, [activePoi, sessionUser]);

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
          title: first.address,
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
      addToast("Inicia sesi?n para ver la ficha completa.", "warning");
      return;
    }
    setDetailStatus("loading");
    setDetailError("");
    setContactStatus("idle");
    setContactMessage("");
    try {
      const response = await fetch(`${env.apiUrl}/properties/${id}`);
      if (!response.ok) {
        throw new Error("No pudimos cargar la ficha.");
      }
      const data = (await response.json()) as PropertyApiDetail;
      const mapped = mapPropertyToDetailListing(data);
      setSelectedListing(mapped);
      setDetailStatus("idle");
    } catch (error) {
      setDetailStatus("error");
      setDetailError(error instanceof Error ? error.message : "No pudimos cargar la ficha.");
    }
  };

  const closeDetail = () => {
    setSelectedListing(null);
    setDetailStatus("idle");
    setDetailError("");
    setContactStatus("idle");
    setContactMessage("");
  };

  const isOwnListing = useMemo(() => {
    if (!selectedListing || !sessionUser) return false;
    if (sessionUser.role === "OWNER") {
      return selectedListing.ownerUserId === sessionUser.id;
    }
    if (sessionUser.role.startsWith("AGENCY")) {
      return selectedListing.agencyId === sessionUser.agencyId;
    }
    return false;
  }, [selectedListing, sessionUser]);

  const whatsappLink = useMemo(() => {
    if (!selectedListing?.contactMethods) return null;
    const method = selectedListing.contactMethods.find((item) => item.type === "WHATSAPP");
    if (!method?.value) return null;
    const message = `Hola, me interesa "${selectedListing.title}".`;
    return buildWhatsappLink(method.value, message);
  }, [selectedListing]);

  const handleContactRequest = async () => {
    if (!selectedListing) return;
    if (!sessionUser || !sessionToken) {
      addToast("Inicia sesión para enviar solicitudes.", "warning");
      return;
    }
    if (isOwnListing) {
      addToast("No puedes contactar tus propias publicaciones.", "warning");
      return;
    }
    if (hasSentContactRequest({ propertyId: selectedListing.id, type: "INTEREST" })) {
      setContactStatus("success");
      setContactMessage("Ya enviaste una solicitud para este inmueble.");
      return;
    }
    setContactStatus("loading");
    try {
      const response = await fetch(
        `${env.apiUrl}/properties/${selectedListing.id}/contact-requests`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
          body: JSON.stringify({
            propertyId: selectedListing.id,
            type: "INTEREST",
            message: `Hola! Soy ${sessionUser.name ?? "un interesado"} y me interesa "${
              selectedListing.title
            }".`,
          }),
        }
      );
      if (!response.ok) {
        throw new Error("No pudimos enviar la solicitud.");
      }
      setContactStatus("success");
      setContactMessage("Solicitud enviada.");
      markContactRequestSent({ propertyId: selectedListing.id, type: "INTEREST" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos enviar la solicitud.";
      setContactStatus("idle");
      setContactMessage(message);
    }
  };

  const handleReportProperty = async (reason: string) => {
    if (!selectedListing) return;
    if (!sessionUser) {
      addToast("Inicia sesión para reportar.", "warning");
      throw new Error("No session");
    }
    const response = await fetch(`${env.apiUrl}/properties/${selectedListing.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, reporterUserId: sessionUser.id }),
    });
    if (!response.ok) {
      throw new Error("No pudimos enviar el reporte.");
    }
  };

  const handleReportUser = async (reason: string) => {
    if (!selectedListing?.ownerUserId || !sessionToken) {
      throw new Error("No pudimos enviar el reporte.");
    }
    const response = await fetch(
      `${env.apiUrl}/users/${selectedListing.ownerUserId}/report`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify({ reason }),
      }
    );
    if (!response.ok) {
      throw new Error("No pudimos enviar el reporte.");
    }
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

  const clearFilters = () => {
    setActiveOperations([]);
    setActiveTypes([]);
    setActivePoi([]);
  };

  const filtersPanel = (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg text-white">Filtros</h3>
        <p className="text-xs text-[#9a948a]">Activa o desactiva para mostrar puntos.</p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#c7c2b8]"
          onClick={() => setOperationOpen((prev) => !prev)}
        >
          Operacion
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
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#c7c2b8]"
          onClick={() => setTypeOpen((prev) => !prev)}
        >
          Tipo
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
        <button
          type="button"
          className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-xs uppercase tracking-[0.2em] text-[#c7c2b8]"
          onClick={() => setPoiOpen((prev) => !prev)}
        >
          Servicios cerca
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
    </div>
  );

  return (
    <div className="space-y-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Mapa interactivo</h2>
          <p className="text-sm text-[#9a948a]">
            Filtra por operaci?n y tipo de inmueble. Los puntos cambian en tiempo real.
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
          <button
            type="button"
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8] md:hidden"
            onClick={() => setMobileFiltersOpen(true)}
          >
            Filtros
          </button>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[320px_1fr]">
        <section className="glass-card hidden space-y-6 p-6 lg:sticky lg:top-24 lg:block lg:h-fit">
          {filtersPanel}
        </section>

        <section className="space-y-6">
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs text-[#9a948a]">
              <span>Bragado</span>
              <span>{filtered.length} puntos visibles</span>
            </div>
            <div className="rounded-3xl border border-white/10 bg-night-900/60 p-3">
              <div className="flex items-center justify-between gap-3 text-xs text-[#9a948a]">
                <span>Mapa principal</span>
                <span>{listStatus === "loading" ? "Cargando..." : "Actualizado"}</span>
              </div>
              <div className="mt-3 h-[45vh] max-h-[540px] min-h-[260px] overflow-hidden rounded-2xl border border-white/10 sm:h-[62vh] sm:min-h-[360px]">
                <MapView
                  points={[
                    ...(sessionUser ? pointsForMap : []),
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
                />
              </div>
              {listStatus === "error" && (
                <div className="mt-3 text-xs text-[#f5b78a]">{listError}</div>
              )}
              {!sessionUser && (
                <div className="mt-3 text-xs text-[#9a948a]">
                  Inicia sesi?n para ver los puntos en el mapa.
                </div>
              )}
              {sessionUser && listStatus === "idle" && properties.length === 0 && (
                <div className="mt-3 text-xs text-[#9a948a]">
                  No hay inmuebles con geolocalizaci?n cargada.
                </div>
              )}
            </div>
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
              {!activeOperations.length && !activeTypes.length && !activePoi.length && (
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
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                      type="button"
                      onClick={() => openDetail(selected.id)}
                    >
                      Ver ficha
                    </button>
                  </div>
                </div>
              ) : selectedBuildingItems.length ? (
                <div className="space-y-3 text-xs text-[#c7c2b8]">
                  <div className="text-sm text-white">
                    {selectedBuildingItems.length} unidades disponibles
                  </div>
                  <div className="space-y-2">
                    {selectedBuildingItems.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/50 px-3 py-2"
                      >
                        <div className="space-y-1">
                          <div className="text-sm text-white">{item.title}</div>
                          <div className="text-[11px] text-[#9a948a]">
                            {operationLabels[item.operationType]} - {typeLabels[item.propertyType]}
                          </div>
                          <div className="text-[11px] text-[#9a948a]">{item.address}</div>
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
                    onClick={() => {
                      setSelectedId(item.id);
                      setSelectedBuildingId(null);
                    }}
                    className={
                      item.id === selectedId
                        ? "flex w-full flex-col gap-1 rounded-2xl border border-gold-500/40 bg-night-900/60 px-4 py-3 text-left text-white"
                        : "flex w-full flex-col gap-1 rounded-2xl border border-white/10 bg-night-900/50 px-4 py-3 text-left text-[#c7c2b8]"
                    }
                  >
                    <span className="text-sm text-white">{item.title}</span>
                    <span>
                      {operationLabels[item.operationType]} - {typeLabels[item.propertyType]}
                    </span>
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

      {selectedListing && (
        <PropertyDetailModal
          listing={selectedListing}
          onClose={closeDetail}
          isLoading={detailStatus === "loading"}
          onReportProperty={handleReportProperty}
          onReportUser={selectedListing.ownerUserId ? handleReportUser : undefined}
          actions={
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900"
                type="button"
                onClick={() => {
                  if (!sessionUser) {
                    addToast("Inicia sesión para contactar.", "warning");
                    return;
                  }
                  if (isOwnListing) {
                    addToast("No puedes contactar tus propias publicaciones.", "warning");
                    return;
                  }
                  if (whatsappLink) {
                    window.open(whatsappLink, "_blank", "noopener,noreferrer");
                  } else {
                    addToast("No hay WhatsApp disponible en esta publicacion.", "warning");
                  }
                }}
              >
                WhatsApp
              </button>
              <button
                className="rounded-full border border-white/20 px-5 py-2 text-xs text-[#c7c2b8]"
                type="button"
                onClick={handleContactRequest}
                disabled={
                  contactStatus === "loading" ||
                  isOwnListing ||
                  (selectedListing
                    ? hasSentContactRequest({
                        propertyId: selectedListing.id,
                        type: "INTEREST",
                      })
                    : false)
                }
              >
                Me interesa
              </button>
              {contactMessage && (
                <div className="w-full text-xs text-[#9a948a]">{contactMessage}</div>
              )}
            </div>
          }
        />
      )}
      {detailStatus === "error" && detailError && (
        <div className="fixed bottom-6 right-6 rounded-xl border border-white/10 bg-night-900/90 px-4 py-3 text-xs text-[#f5b78a] shadow-card">
          {detailError}
        </div>
      )}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 p-4 lg:hidden">
          <div className="glass-card mx-auto flex h-full max-h-[85vh] w-full max-w-md flex-col overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div>
                <div className="text-sm text-white">Filtros</div>
                <div className="text-[11px] text-[#9a948a]">
                  Ajusta para ver solo lo que te interesa.
                </div>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                onClick={() => setMobileFiltersOpen(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">{filtersPanel}</div>
            <div className="border-t border-white/10 p-4">
              <button
                type="button"
                className="w-full rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
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
