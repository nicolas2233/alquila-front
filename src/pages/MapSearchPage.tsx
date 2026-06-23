import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { MapView, type MapPoint } from "../shared/map/MapView";
import { geocodeSuggestions, reverseGeocode } from "../shared/map/geocode";
import { requestGeolocationOnce, forceRequestGeolocation } from "../shared/utils/geolocation";
import { env } from "../shared/config/env";

type OperationType = "SALE" | "RENT" | "TEMPORARY";
type PropertyType =
  | "HOUSE" | "APARTMENT" | "LAND" | "FIELD"
  | "QUINTA" | "COMMERCIAL" | "OFFICE" | "WAREHOUSE";
type PoiCategory = "SCHOOL" | "KINDER" | "FIRE" | "POLICE" | "HEALTH" | "SUPERMARKET" | "PARK";
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
};

type PoiItem = {
  id: string; title: string; category: PoiCategory;
  lat: number; lng: number; address?: string | null;
};

type GeoSuggestion = { lat: number; lng: number; displayName: string };

const operationLabels: Record<OperationType, string> = { SALE: "Venta", RENT: "Alquiler", TEMPORARY: "Temporario" };
const typeLabels: Record<PropertyType, string> = {
  HOUSE: "Casa", APARTMENT: "Depto", LAND: "Terreno", FIELD: "Campo",
  QUINTA: "Quinta", COMMERCIAL: "Comercio", OFFICE: "Oficina", WAREHOUSE: "Depósito",
};
const poiLabels: Record<PoiCategory, string> = {
  SCHOOL: "Escuela", KINDER: "Jardín", FIRE: "Bomberos",
  POLICE: "Policía", HEALTH: "Salud", SUPERMARKET: "Súper", PARK: "Plaza",
};
const operationColors: Record<OperationType, string> = { SALE: "#AF8C5C", RENT: "#59c3ff", TEMPORARY: "#7fd1b2" };
const propertyColors: Partial<Record<PropertyType, string>> = { COMMERCIAL: "#f6a44d", FIELD: "#6ea06d", QUINTA: "#7aa37a" };
const poiColors: Record<PoiCategory, string> = {
  SCHOOL: "#7f8cff", KINDER: "#f1c76a", FIRE: "#ff6b6b",
  POLICE: "#5a6bff", HEALTH: "#58c1a0", SUPERMARKET: "#f09f6e", PARK: "#7ecf7a",
};
const publisherLabels: Record<PublisherType, string> = { OWNER: "Dueño directo", AGENCY: "Inmobiliaria" };

const getMarkerColor = (pt: PropertyType, ot: OperationType) => propertyColors[pt] ?? operationColors[ot];

type DropdownKey = "operation" | "type" | "publisher" | "poi" | null;

export function MapSearchPage() {
  const navigate = useNavigate();
  const location = useLocation();

  // Data
  const [properties, setProperties] = useState<MapProperty[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle");
  const [poiItems, setPoiItems] = useState<PoiItem[]>([]);

  // Filters
  const [activeOperations, setActiveOperations] = useState<OperationType[]>([]);
  const [activeTypes, setActiveTypes] = useState<PropertyType[]>([]);
  const [activePublishers, setActivePublishers] = useState<PublisherType[]>([]);
  const [activePoi, setActivePoi] = useState<PoiCategory[]>([]);

  // UI
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [activeDropdown, setActiveDropdown] = useState<DropdownKey>(null);
  const [listPanelOpen, setListPanelOpen] = useState(false);
  const [toolbarOpen, setToolbarOpen] = useState(true);

  // Geo
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [geoStatus, setGeoStatus] = useState<"idle" | "requesting" | "granted" | "denied">("idle");

  // Location search
  const [locationSearch, setLocationSearch] = useState("");
  const [locationSuggestions, setLocationSuggestions] = useState<GeoSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const toolbarRef = useRef<HTMLDivElement>(null);
  const searchDebounce = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Cuando seteamos locationSearch programáticamente (geolocalización o al elegir una
  // sugerencia) NO queremos volver a abrir el dropdown de sugerencias.
  const skipSuggestionRef = useRef(false);

  // Close dropdown and suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(e.target as Node)) {
        setActiveDropdown(null);
        setShowSuggestions(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Geolocation: se pide una sola vez (recuerda la decisión, no molesta en cada visita).
  useEffect(() => {
    setGeoStatus("requesting");
    requestGeolocationOnce({
      onSuccess: async (pos) => {
        const loc: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        setMapCenter(loc);
        setGeoStatus("granted");
        try {
          const result = await reverseGeocode(loc[0], loc[1]);
          const cityName = result?.locality ?? result?.party ?? null;
          // Autocompletar el campo sin disparar el dropdown de sugerencias.
          if (cityName) {
            skipSuggestionRef.current = true;
            setLocationSearch(cityName);
          }
        } catch { /* ignore */ }
      },
      onError: () => setGeoStatus("denied"),
      options: { timeout: 8000, maximumAge: 60000 },
    });
  }, []);

  // Fetch properties
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const load = async () => {
      setListStatus("loading");
      try {
        const params = new URLSearchParams({ status: "ACTIVE", page: "1", pageSize: "100" });
        const res = await fetch(`${env.apiUrl}/properties?${params}`, { signal: controller.signal });
        if (!res.ok) throw new Error("Error al cargar inmuebles");
        const data = (await res.json()) as {
          items: Array<{
            id: string; title: string; operationType: OperationType; propertyType: PropertyType;
            priceAmount: number; priceCurrency: "ARS" | "USD";
            rooms?: number | null; areaM2?: number | null;
            features?: { showMapLocation?: boolean } | null;
            unitLabel?: string | null; buildingId?: string | null;
            agency?: { name: string } | null; ownerDisplayName?: string | null;
            location?: { addressLine?: string | null; lat?: number | null; lng?: number | null } | null;
            photos?: { url: string }[];
          }>;
        };
        if (ignore) return;
        const mapped = (data.items ?? [])
          .map((item) => ({
            id: item.id, title: item.title,
            operationType: item.operationType, propertyType: item.propertyType,
            priceAmount: Number(item.priceAmount), priceCurrency: item.priceCurrency,
            address: `${item.location?.addressLine ?? "Bragado"}${item.unitLabel ? ` (${item.unitLabel})` : ""}`,
            contactLabel: item.agency?.name ?? item.ownerDisplayName?.trim() ?? "Dueño directo",
            rooms: item.rooms ?? undefined, areaM2: item.areaM2 ?? undefined,
            imageUrl: item.photos?.[0]?.url, badge: typeLabels[item.propertyType],
            publisherType: (item.agency?.name ? "AGENCY" : "OWNER") as PublisherType,
            showMapLocation: item.features?.showMapLocation ?? true,
            buildingId: item.buildingId ?? null, unitLabel: item.unitLabel ?? null,
            lat: item.location?.lat === null ? NaN : Number(item.location?.lat ?? NaN),
            lng: item.location?.lng === null ? NaN : Number(item.location?.lng ?? NaN),
          }))
          .filter((item) => Number.isFinite(item.lat) && Number.isFinite(item.lng) && item.showMapLocation !== false);
        setProperties(mapped);
        setListStatus("idle");
      } catch (err) {
        if (ignore || controller.signal.aborted) return;
        setListStatus("error");
        setProperties([]);
      }
    };
    void load();
    return () => { ignore = true; controller.abort(); };
  }, []);

  // Fetch POIs
  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    fetch(`${env.apiUrl}/pois?active=true`, { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { items: PoiItem[] }) => { if (!ignore) setPoiItems(data.items ?? []); })
      .catch(() => {});
    return () => { ignore = true; controller.abort(); };
  }, []);

  // Location search debounce
  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    // Cambio programático (geolocalización / selección de sugerencia): no reabrir el dropdown.
    if (skipSuggestionRef.current) {
      skipSuggestionRef.current = false;
      setLocationSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    if (!locationSearch.trim() || locationSearch.length < 3) { setLocationSuggestions([]); return; }
    searchDebounce.current = setTimeout(async () => {
      try {
        const results = await geocodeSuggestions(locationSearch);
        setLocationSuggestions(results.slice(0, 5).map((r) => ({ lat: r.lat, lng: r.lng, displayName: r.displayName })));
        setShowSuggestions(true);
      } catch { /* ignore */ }
    }, 350);
    return () => { if (searchDebounce.current) clearTimeout(searchDebounce.current); };
  }, [locationSearch]);

  // Filtered data
  const filtered = useMemo(() => {
    let list = [...properties];
    if (activeOperations.length) list = list.filter((i) => activeOperations.includes(i.operationType));
    if (activeTypes.length) list = list.filter((i) => activeTypes.includes(i.propertyType));
    if (activePublishers.length) list = list.filter((i) => activePublishers.includes(i.publisherType));
    return list;
  }, [activeOperations, activeTypes, activePublishers, properties]);

  const filteredPoi = useMemo(() =>
    activePoi.length ? poiItems.filter((p) => activePoi.includes(p.category)) : [],
    [activePoi, poiItems]
  );

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
        points.push({ id: `building:${key}`, title: `${group.length} unidades`, address: first.address, subtitle: `${group.length} unidades disponibles`, color: "#7f8cff", lat: first.lat, lng: first.lng, count: group.length });
      } else {
        points.push({ id: first.id, title: first.title, subtitle: `${operationLabels[first.operationType]} · ${typeLabels[first.propertyType]}`, address: first.address, imageUrl: first.imageUrl, badge: first.badge, color: getMarkerColor(first.propertyType, first.operationType), lat: first.lat, lng: first.lng });
      }
    });
    return points;
  }, [buildingGroups]);

  const propertyIdSet = useMemo(() => new Set(properties.map((i) => i.id)), [properties]);

  useEffect(() => {
    if (selectedId && !filtered.some((i) => i.id === selectedId)) setSelectedId(null);
    if (selectedBuildingId && !buildingGroups.has(selectedBuildingId)) setSelectedBuildingId(null);
  }, [filtered, selectedId, selectedBuildingId, buildingGroups]);

  const selected = filtered.find((i) => i.id === selectedId) ?? null;
  const selectedBuildingItems = selectedBuildingId ? (buildingGroups.get(selectedBuildingId) ?? []) : [];
  const totalActiveFilters = activeOperations.length + activeTypes.length + activePublishers.length + activePoi.length;
  const hasActiveFilters = totalActiveFilters > 0;

  const toggleOperation = (v: OperationType) => setActiveOperations((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const toggleType = (v: PropertyType) => setActiveTypes((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const togglePoi = (v: PoiCategory) => setActivePoi((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const togglePublisher = (v: PublisherType) => setActivePublishers((p) => p.includes(v) ? p.filter((x) => x !== v) : [...p, v]);
  const clearFilters = () => { setActiveOperations([]); setActiveTypes([]); setActivePublishers([]); setActivePoi([]); };

  const requestGeoLocation = () => {
    if (geoStatus === "granted" && mapCenter) { setMapCenter([...mapCenter]); return; }
    setGeoStatus("requesting");
    forceRequestGeolocation({
      onSuccess: (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude]);
        setGeoStatus("granted");
      },
      onError: () => setGeoStatus("denied"),
      options: { timeout: 8000 },
    });
  };

  const openDetail = (id: string) =>
    navigate(`/publicacion/${id}`, { state: { returnTo: `${location.pathname}${location.search}`, returnLabel: "Volver al mapa" } });

  // Toolbar button base class
  const btnBase = "flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs border whitespace-nowrap shrink-0 transition-all duration-150 select-none";
  const btnDefault = `${btnBase} bg-[#2a2722] text-[#D1C7BD] border-white/15 hover:border-white/30 hover:text-white`;
  const btnActive = `${btnBase} bg-[#AF8C5C] text-[#1a1410] border-[#AF8C5C]/50 font-semibold`;

  // Dropdown options renderer
  const renderDropdown = () => {
    if (!activeDropdown) return null;

    type ChipItem = { value: string; label: string; active: boolean; color?: string; onToggle: () => void };
    let chips: ChipItem[] = [];
    let onClear: (() => void) | null = null;
    let hasActive = false;

    if (activeDropdown === "operation") {
      chips = (["SALE", "RENT", "TEMPORARY"] as OperationType[]).map((v) => ({ value: v, label: operationLabels[v], active: activeOperations.includes(v), color: operationColors[v], onToggle: () => toggleOperation(v) }));
      hasActive = activeOperations.length > 0;
      onClear = () => setActiveOperations([]);
    } else if (activeDropdown === "type") {
      chips = (["HOUSE", "APARTMENT", "LAND", "FIELD", "QUINTA", "COMMERCIAL", "OFFICE", "WAREHOUSE"] as PropertyType[]).map((v) => ({ value: v, label: typeLabels[v], active: activeTypes.includes(v), color: propertyColors[v] ?? "#888", onToggle: () => toggleType(v) }));
      hasActive = activeTypes.length > 0;
      onClear = () => setActiveTypes([]);
    } else if (activeDropdown === "publisher") {
      chips = (["OWNER", "AGENCY"] as PublisherType[]).map((v) => ({ value: v, label: publisherLabels[v], active: activePublishers.includes(v), onToggle: () => togglePublisher(v) }));
      hasActive = activePublishers.length > 0;
      onClear = () => setActivePublishers([]);
    } else if (activeDropdown === "poi") {
      chips = (Object.keys(poiLabels) as PoiCategory[]).map((v) => ({ value: v, label: poiLabels[v], active: activePoi.includes(v), color: poiColors[v], onToggle: () => togglePoi(v) }));
      hasActive = activePoi.length > 0;
      onClear = () => setActivePoi([]);
    }

    return (
      <div className="mt-2 flex items-center gap-2 flex-wrap bg-[#1c1916]/96 backdrop-blur-md border border-white/12 rounded-2xl px-3 py-2.5 shadow-2xl">
        {chips.map((chip) => (
          <button
            key={chip.value}
            type="button"
            onClick={chip.onToggle}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs border transition-all duration-150 ${
              chip.active
                ? "bg-[#AF8C5C] text-[#1a1410] border-[#AF8C5C]/50 font-semibold shadow-sm"
                : "bg-[#2a2722] text-[#D1C7BD] border-white/15 hover:border-white/35 hover:text-white"
            }`}
          >
            {chip.color && (
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: chip.color }} />
            )}
            {chip.label}
            {chip.active && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
          </button>
        ))}
        {hasActive && onClear && (
          <button type="button" onClick={onClear} className="ml-auto text-[11px] text-[#AF8C5C] hover:underline shrink-0 pl-1">
            Limpiar
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full overflow-hidden relative bg-night-950">
      {/* ── List panel overlay ─────────────────── */}
      {listPanelOpen && (
        <div
          className="absolute inset-0 z-20 bg-black/40 md:hidden"
          onClick={() => setListPanelOpen(false)}
        />
      )}
      <aside
        className={`absolute inset-y-0 left-0 z-30 flex flex-col w-[300px] bg-night-950/97 backdrop-blur-md border-r border-white/10 shadow-2xl transform transition-transform duration-300 ease-in-out ${listPanelOpen ? "translate-x-0" : "-translate-x-full"}`}
      >
        {/* Panel header */}
        <div className="flex items-center justify-between border-b border-white/10 px-3 py-3">
          <div>
            <div className="text-sm font-semibold text-white">Inmuebles</div>
            <div className="text-[11px] text-[#D1C7BD]">{listStatus === "loading" ? "Cargando…" : `${filtered.length} resultados`}</div>
          </div>
          <button type="button" onClick={() => setListPanelOpen(false)} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/50 hover:text-white transition">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Property list */}
        <div className="flex-1 overflow-y-auto">
          {listStatus === "loading" && (
            <div className="space-y-px">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex gap-3 px-3 py-3 animate-pulse">
                  <div className="h-14 w-14 flex-shrink-0 rounded-lg bg-white/8" />
                  <div className="flex-1 space-y-1.5 pt-1">
                    <div className="h-2.5 w-3/4 rounded bg-white/8" />
                    <div className="h-2 w-1/2 rounded bg-white/5" />
                    <div className="h-2 w-2/3 rounded bg-white/5" />
                  </div>
                </div>
              ))}
            </div>
          )}
          {listStatus === "idle" && filtered.length === 0 && (
            <div className="px-4 py-6 text-center text-xs text-[#D1C7BD]">
              {hasActiveFilters ? "Sin resultados para los filtros elegidos." : "No hay inmuebles con geolocalización."}
            </div>
          )}
          {filtered.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => { setSelectedId(item.id); setSelectedBuildingId(null); setListPanelOpen(false); }}
              className={`flex w-full gap-3 border-b border-white/5 px-3 py-3 text-left transition-all hover:bg-white/4 ${item.id === selectedId ? "border-l-2 border-l-[#AF8C5C] bg-white/6" : ""}`}
            >
              {item.imageUrl ? (
                <img src={item.imageUrl} alt="" className="h-14 w-14 flex-shrink-0 rounded-lg object-cover" loading="lazy" />
              ) : (
                <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-lg" style={{ backgroundColor: getMarkerColor(item.propertyType, item.operationType) + "28" }}>
                  <span className="text-[9px] font-semibold uppercase text-white/60">{typeLabels[item.propertyType].slice(0, 4)}</span>
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-xs font-medium text-white">{item.title}</div>
                <div className="mt-0.5 text-[11px] font-semibold" style={{ color: operationColors[item.operationType] }}>
                  {item.priceCurrency} {item.priceAmount.toLocaleString("es-AR")}
                </div>
                <div className="mt-0.5 text-[10px] text-[#D1C7BD]">
                  {operationLabels[item.operationType]} · {typeLabels[item.propertyType]}{item.rooms ? ` · ${item.rooms} amb` : ""}
                </div>
                <div className="mt-0.5 truncate text-[10px] text-white/40">{item.address}</div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* ── Map area ───────────────────────────── */}
      <div className="relative flex-1 h-full min-w-0">

        {/* ── FLOATING TOOLBAR ── */}
        <div ref={toolbarRef} className="absolute top-3 left-3 z-[500] flex flex-col gap-2 sm:flex-row sm:items-start">

          {/* ── Hamburger — siempre visible ── */}
          <button
            type="button"
            onClick={() => { setToolbarOpen((v) => !v); setActiveDropdown(null); setShowSuggestions(false); }}
            title={toolbarOpen ? "Ocultar filtros" : "Mostrar filtros"}
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border backdrop-blur-md shadow-xl transition-all duration-200 select-none
              ${toolbarOpen
                ? "bg-[#AF8C5C]/20 border-[#AF8C5C]/45 text-[#AF8C5C]"
                : "bg-[#1c1916]/96 border-white/15 text-[#D1C7BD] hover:border-white/30 hover:text-white"}`}
          >
            {toolbarOpen ? (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
                <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            )}
          </button>

          {/* ── Panel de filtros — se muestra/oculta con transición ── */}
          <div
            className={`flex flex-col gap-2 transition-all duration-200 ease-out origin-top-left
              ${toolbarOpen
                ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
                : "opacity-0 scale-95 -translate-y-1 pointer-events-none select-none"}`}
          >

            {/* ── Desktop: pill horizontal (sm+) ── */}
            <div className="hidden sm:inline-flex items-center gap-1.5 bg-[#1c1916]/96 backdrop-blur-md border border-white/12 rounded-2xl px-2 py-1.5 shadow-2xl">

              {/* Ver lista */}
              <button
                type="button"
                onClick={() => setListPanelOpen((v) => !v)}
                title={listPanelOpen ? "Cerrar lista" : "Ver lista de inmuebles"}
                className={`${btnBase} p-[7px] gap-1 ${listPanelOpen ? "bg-[#AF8C5C]/20 border-[#AF8C5C]/35 text-[#AF8C5C]" : "bg-[#2a2722] border-white/15 text-[#D1C7BD] hover:text-white hover:border-white/30"}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                  <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
                </svg>
                <span className="text-[10px]">{listStatus === "loading" ? "…" : filtered.length}</span>
              </button>

              <span className="h-5 w-px bg-white/15 mx-0.5 shrink-0" />

              {/* Buscador */}
              <div className="relative flex items-center">
                <div className="pointer-events-none absolute left-2.5 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 text-white/35">
                    <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder="Buscar zona…"
                  value={locationSearch}
                  onChange={(e) => { setLocationSearch(e.target.value); setActiveDropdown(null); }}
                  onFocus={() => { if (locationSuggestions.length > 0) setShowSuggestions(true); setActiveDropdown(null); }}
                  className="w-32 rounded-xl border border-white/12 bg-[#2a2722] py-[7px] pl-7 pr-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-white/28 transition-colors"
                />
                {locationSearch && (
                  <button type="button" onClick={() => { setLocationSearch(""); setLocationSuggestions([]); setShowSuggestions(false); }} className="absolute right-1.5 text-white/30 hover:text-white/70">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-2.5 w-2.5"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                )}
              </div>

              <span className="h-5 w-px bg-white/15 mx-0.5 shrink-0" />

              {/* Filtros */}
              <button type="button" onClick={() => { setShowSuggestions(false); setActiveDropdown((d) => d === "operation" ? null : "operation"); }} className={activeOperations.length ? btnActive : btnDefault}>
                Operación {activeOperations.length ? `(${activeOperations.length})` : ""}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 transition-transform duration-200 ${activeDropdown === "operation" ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <button type="button" onClick={() => { setShowSuggestions(false); setActiveDropdown((d) => d === "type" ? null : "type"); }} className={activeTypes.length ? btnActive : btnDefault}>
                Tipo {activeTypes.length ? `(${activeTypes.length})` : ""}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 transition-transform duration-200 ${activeDropdown === "type" ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <button type="button" onClick={() => { setShowSuggestions(false); setActiveDropdown((d) => d === "publisher" ? null : "publisher"); }} className={activePublishers.length ? btnActive : btnDefault}>
                Publicador {activePublishers.length ? `(${activePublishers.length})` : ""}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 transition-transform duration-200 ${activeDropdown === "publisher" ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
              </button>
              <button type="button" onClick={() => { setShowSuggestions(false); setActiveDropdown((d) => d === "poi" ? null : "poi"); }} className={activePoi.length ? btnActive : btnDefault}>
                Servicios {activePoi.length ? `(${activePoi.length})` : ""}
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 transition-transform duration-200 ${activeDropdown === "poi" ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
              </button>

              {hasActiveFilters && (
                <>
                  <span className="h-5 w-px bg-white/15 mx-0.5 shrink-0" />
                  <button type="button" onClick={clearFilters} className={`${btnBase} bg-[#2a2722] text-[#AF8C5C] border-[#AF8C5C]/25 hover:border-[#AF8C5C]/50`}>Limpiar</button>
                </>
              )}
            </div>

            {/* ── Mobile: tarjeta vertical (< sm) ── */}
            <div
              className="sm:hidden rounded-2xl shadow-2xl overflow-hidden"
              style={{
                width: "calc(100vw - 60px)",
                background: "rgba(28,25,22,0.97)",
                backdropFilter: "blur(14px)",
                border: "1px solid rgba(255,255,255,0.12)",
              }}
            >
              {/* Fila búsqueda + lista */}
              <div
                className="flex items-center gap-2 px-3 py-2.5"
                style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3 shrink-0" style={{ color: "rgba(255,255,255,0.35)" }}>
                  <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Buscar zona…"
                  value={locationSearch}
                  onChange={(e) => { setLocationSearch(e.target.value); setActiveDropdown(null); }}
                  onFocus={() => { if (locationSuggestions.length > 0) setShowSuggestions(true); setActiveDropdown(null); }}
                  className="flex-1 min-w-0 bg-transparent focus:outline-none text-xs"
                  style={{ color: "#ffffff", caretColor: "#AF8C5C" }}
                />
                {locationSearch && (
                  <button type="button" onClick={() => { setLocationSearch(""); setLocationSuggestions([]); setShowSuggestions(false); }} className="shrink-0" style={{ color: "rgba(255,255,255,0.4)" }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                )}
                <div className="h-4 w-px shrink-0" style={{ background: "rgba(255,255,255,0.15)" }} />
                <button
                  type="button"
                  onClick={() => setListPanelOpen((v) => !v)}
                  className="flex items-center gap-1 shrink-0 text-[10px] transition-colors"
                  style={{ color: listPanelOpen ? "#AF8C5C" : "#D1C7BD" }}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>
                  </svg>
                  {listStatus === "loading" ? "…" : filtered.length}
                </button>
              </div>

              {/* Grid 2×2 filtros */}
              <div className="grid grid-cols-2">
                {[
                  { key: "operation" as DropdownKey, label: "Operación", count: activeOperations.length },
                  { key: "type"      as DropdownKey, label: "Tipo",      count: activeTypes.length },
                  { key: "publisher" as DropdownKey, label: "Publicador",count: activePublishers.length },
                  { key: "poi"       as DropdownKey, label: "Servicios", count: activePoi.length },
                ].map(({ key, label, count }, i) => (
                  <button
                    key={key}
                    type="button"
                    onClick={() => { setShowSuggestions(false); setActiveDropdown((d) => d === key ? null : key); }}
                    className="flex items-center justify-between gap-1.5 px-3 py-3 text-xs transition-all"
                    style={{
                      color: count > 0 ? "#AF8C5C" : "#D1C7BD",
                      fontWeight: count > 0 ? 600 : 400,
                      background: count > 0 ? "rgba(175,140,92,0.12)" : "transparent",
                      borderRight: i % 2 === 0 ? "1px solid rgba(255,255,255,0.1)" : "none",
                      borderBottom: i < 2 ? "1px solid rgba(255,255,255,0.1)" : "none",
                    }}
                  >
                    <span className="truncate">{label}{count > 0 ? ` (${count})` : ""}</span>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={`h-3 w-3 shrink-0 transition-transform duration-200 ${activeDropdown === key ? "rotate-180" : ""}`}><path d="M6 9l6 6 6-6" /></svg>
                  </button>
                ))}
              </div>

              {/* Limpiar — solo con filtros activos */}
              {hasActiveFilters && (
                <div className="px-3 py-2" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
                  <button type="button" onClick={clearFilters} className="text-[11px] hover:underline" style={{ color: "#AF8C5C" }}>
                    Limpiar filtros ({totalActiveFilters})
                  </button>
                </div>
              )}
            </div>

            {/* Sugerencias de ciudad */}
            {showSuggestions && locationSuggestions.length > 0 && (
              <div className="w-72 overflow-hidden rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.65)]" style={{ background: "rgba(18,13,10,0.98)", border: "1px solid rgba(255,255,255,0.18)" }}>
                {locationSuggestions.map((s, i) => (
                  <button key={i} type="button"
                    className="flex w-full items-center gap-2.5 border-b border-white/8 px-3 py-2.5 text-left text-xs text-white/80 last:border-0 hover:bg-white/8 hover:text-white transition"
                    onClick={() => { skipSuggestionRef.current = true; setMapCenter([s.lat, s.lng]); setLocationSearch(s.displayName.split(",")[0]?.trim() ?? s.displayName); setShowSuggestions(false); setLocationSuggestions([]); }}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-[#AF8C5C]">
                      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="truncate">{s.displayName}</span>
                  </button>
                ))}
              </div>
            )}

            {/* Opciones de filtro */}
            {renderDropdown()}
          </div>
        </div>

        {/* Map */}
        <MapView
          points={[
            ...pointsForMap,
            ...filteredPoi.map((poi) => ({
              id: poi.id, title: poi.title, subtitle: poiLabels[poi.category],
              address: poi.address ?? undefined, badge: poiLabels[poi.category],
              color: poiColors[poi.category], lat: poi.lat, lng: poi.lng,
            })),
          ]}
          selectedId={selectedBuildingId ? `building:${selectedBuildingId}` : selectedId}
          onSelect={(id) => {
            if (propertyIdSet.has(id)) { setSelectedId(id); setSelectedBuildingId(null); }
            else if (id.startsWith("building:")) { setSelectedBuildingId(id.replace("building:", "")); setSelectedId(null); }
          }}
          onOpen={(id) => { if (propertyIdSet.has(id)) openDetail(id); }}
          center={mapCenter}
          fullHeight
          hideExpandButton
          disableAutoFit
        />

        {/* Geolocation button */}
        <button
          type="button"
          aria-label="Mi ubicación"
          onClick={requestGeoLocation}
          className={`absolute bottom-6 right-4 z-[500] flex h-10 w-10 items-center justify-center rounded-full border shadow-lg backdrop-blur transition ${
            geoStatus === "granted" ? "bg-[#1c1916]/90 border-[#4285F4]/50 text-[#4285F4]"
            : geoStatus === "denied" ? "bg-[#1c1916]/90 border-white/10 text-white/25 cursor-not-allowed"
            : "bg-[#1c1916]/90 border-white/20 text-white hover:border-white/40"
          }`}
        >
          {geoStatus === "requesting" ? (
            <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
            </svg>
          )}
        </button>

        {/* ── Selected property card ── */}
        {selected && (
          <div className="absolute bottom-6 left-1/2 z-[500] w-[min(340px,calc(100%-2rem))] -translate-x-1/2">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-[#18150f] shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
              {selected.imageUrl && (
                <div className="relative">
                  <img src={selected.imageUrl} alt={selected.title} className="h-36 w-full object-cover" />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#18150f] via-[#18150f]/30 to-transparent" />
                  <span className="absolute left-3 top-3 rounded-full px-2.5 py-1 text-[10px] font-bold shadow-md" style={{ backgroundColor: operationColors[selected.operationType], color: "#1a1410" }}>
                    {operationLabels[selected.operationType]}
                  </span>
                  {/* Botón cerrar sobre la imagen */}
                  <button
                    type="button"
                    aria-label="Cerrar"
                    onClick={() => { setSelectedId(null); setSelectedBuildingId(null); }}
                    className="absolute right-2.5 top-2.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/55 text-white/90 hover:bg-black/75 transition"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
              <div className={selected.imageUrl ? "px-4 pb-4 pt-3" : "p-4"}>
                {!selected.imageUrl && (
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="rounded-full px-2.5 py-1 text-[10px] font-bold" style={{ backgroundColor: operationColors[selected.operationType], color: "#1a1410" }}>
                      {operationLabels[selected.operationType]}
                    </span>
                    <button
                      type="button"
                      aria-label="Cerrar"
                      onClick={() => { setSelectedId(null); setSelectedBuildingId(null); }}
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 hover:bg-white/18 hover:text-white transition"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <div className="truncate text-sm font-semibold text-white leading-snug">{selected.title}</div>
                <div className="mt-1 text-lg font-bold" style={{ color: operationColors[selected.operationType] }}>
                  {selected.priceCurrency} {selected.priceAmount.toLocaleString("es-AR")}
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-white/70">
                  <span>{typeLabels[selected.propertyType]}</span>
                  {selected.rooms && <span>· {selected.rooms} amb</span>}
                  {selected.areaM2 && <span>· {selected.areaM2} m²</span>}
                </div>
                <div className="mt-0.5 truncate text-[11px] text-white/45">{selected.address}</div>
                <button
                  type="button"
                  onClick={() => openDetail(selected.id)}
                  className="mt-3.5 w-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#c9b08a] py-2.5 text-xs font-semibold text-[#1a1410] transition hover:opacity-90 active:scale-[0.98]"
                >
                  Ver ficha completa
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Building cluster card ── */}
        {selectedBuildingItems.length > 0 && !selected && (
          <div className="absolute bottom-6 left-1/2 z-[500] w-[min(340px,calc(100%-2rem))] -translate-x-1/2">
            <div className="overflow-hidden rounded-2xl border border-white/20 bg-[#18150f] shadow-[0_8px_40px_rgba(0,0,0,0.7)]">
              <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
                <div className="text-sm font-semibold text-white">{selectedBuildingItems.length} unidades disponibles</div>
                <button type="button" aria-label="Cerrar" onClick={() => setSelectedBuildingId(null)} className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 text-white/50 hover:text-white transition">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5">
                    <path d="M18 6L6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>
              <div className="max-h-52 overflow-y-auto p-2 space-y-1">
                {selectedBuildingItems.map((item) => (
                  <button key={item.id} type="button" onClick={() => openDetail(item.id)}
                    className="flex w-full items-center justify-between gap-3 rounded-xl border border-white/8 bg-white/4 px-3 py-2.5 text-left transition hover:bg-white/8">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-medium text-white">{item.title}</div>
                      <div className="text-[10px] text-[#D1C7BD]">{operationLabels[item.operationType]} · {typeLabels[item.propertyType]}</div>
                    </div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3.5 w-3.5 shrink-0 text-white/40">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
