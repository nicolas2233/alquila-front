import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import { env } from "../shared/config/env";
import type { PropertyApiDetail, PropertyApiListItem, SearchListing } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing, mapPropertyToSearchListing } from "../shared/properties/propertyMappers";
import { fetchJson } from "../shared/api/http";
import { getSessionUser } from "../shared/auth/session";
import { buildWhatsappLink } from "../shared/utils/whatsapp";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { trackEvent } from "../shared/analytics/posthog";
import { useSeo } from "../shared/seo/useSeo";

type AdItem = {
  id: string;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  ctaText?: string | null;
  priority?: number;
};

type SearchCardItem =
  | { kind: "listing"; item: SearchListing }
  | { kind: "ad"; ad: AdItem };

type LocalityOption = {
  id: string;
  name: string;
  count: number;
};

const operationFilterLabels = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Temporario",
} as const;

const propertyFilterLabels = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  LAND: "Terreno",
  FIELD: "Campo",
  QUINTA: "Quinta",
  COMMERCIAL: "Comercio",
  WAREHOUSE: "Depósito",
  OFFICE: "Oficina",
} as const;

const publisherFilterLabels = {
  OWNER: "Dueño directo",
  AGENCY: "Inmobiliaria",
} as const;

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat("es-AR", { maximumFractionDigits: 0 }).format(value);

const currencyFilterLabels = {
  ARS: "ARS",
  USD: "USD",
} as const;

const getImageOperationBadgeClass = (operation: string) => {
  if (operation === "Venta") {
    return "border border-[#AF8C5C]/90 bg-[#AF8C5C] text-[#1A1613]";
  }
  if (operation === "Alquiler") {
    return "border border-sky-300/90 bg-sky-400 text-[#0a1b28]";
  }
  if (operation === "Temporario") {
    return "border border-emerald-300/90 bg-emerald-400 text-[#0a2318]";
  }
  return "border border-white/90 bg-night-900 text-white";
};

type FeatureIconName = "rooms" | "area" | "garage" | "pets" | "kids";

const renderFeatureIcon = (icon: FeatureIconName) => {
  if (icon === "rooms") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 9h16M4 9l2-3h12l2 3M4 9v9h16V9" />
        <path d="M9 13h6" />
      </svg>
    );
  }
  if (icon === "area") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M4 4h16v16H4z" />
        <path d="M4 9h16M9 4v16" />
      </svg>
    );
  }
  if (icon === "garage") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M3 11l9-7 9 7v9H3v-9z" />
        <path d="M8 20v-5h8v5" />
      </svg>
    );
  }
  if (icon === "pets") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
      >
        <path d="M7 12h10M5 8l2 12M19 8l-2 12" />
        <path d="M9 6l3 4 3-4" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
    >
      <circle cx="12" cy="7" r="3" />
      <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
    </svg>
  );
};

export function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");
  const [ads, setAds] = useState<AdItem[]>([]);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [agencies, setAgencies] = useState<{ id: string; name: string; logo?: string | null }[]>([]);
  const [localities, setLocalities] = useState<LocalityOption[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [operationType, setOperationType] = useState<"" | "SALE" | "RENT" | "TEMPORARY">("");
  const [propertyType, setPropertyType] = useState<
    "" | "HOUSE" | "APARTMENT" | "LAND" | "FIELD" | "QUINTA" | "COMMERCIAL" | "OFFICE" | "WAREHOUSE"
  >("");
  const [publisherType, setPublisherType] = useState<"" | "OWNER" | "AGENCY">("");
  const [localityId, setLocalityId] = useState("");
  const [priceCurrency, setPriceCurrency] = useState<"" | "ARS" | "USD">("");
  const [minPriceInput, setMinPriceInput] = useState("");
  const [maxPriceInput, setMaxPriceInput] = useState("");
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const detailCacheRef = useRef(new Map<string, PropertyDetailListing>());
  const sessionUser = getSessionUser();
  const activeFilters = useMemo(() => {
    const chips: { key: string; label: string; onClear: () => void }[] = [];
    if (operationType) {
      chips.push({
        key: "operation",
        label: `Operacion: ${operationFilterLabels[operationType]}`,
        onClear: () => {
          setOperationType("");
          setPage(1);
        },
      });
    }
    if (propertyType) {
      chips.push({
        key: "property",
        label: `Tipo: ${propertyFilterLabels[propertyType]}`,
        onClear: () => {
          setPropertyType("");
          setPage(1);
        },
      });
    }
    if (publisherType) {
      chips.push({
        key: "publisher",
        label: `Publicador: ${publisherFilterLabels[publisherType]}`,
        onClear: () => {
          setPublisherType("");
          setPage(1);
        },
      });
    }
    if (localityId) {
      const selectedLocality = localities.find((item) => item.id === localityId);
      chips.push({
        key: "zone",
        label: `Zona: ${selectedLocality?.name ?? localityId}`,
        onClear: () => {
          setLocalityId("");
          setPage(1);
        },
      });
    }
    if (priceCurrency) {
      chips.push({
        key: "currency",
        label: `Moneda: ${currencyFilterLabels[priceCurrency]}`,
        onClear: () => {
          setPriceCurrency("");
          setPage(1);
        },
      });
    }
    if (minPriceInput) {
      const parsedMin = Number(minPriceInput);
      chips.push({
        key: "minPrice",
        label: `Precio desde: ${
          Number.isFinite(parsedMin) ? formatCompactNumber(parsedMin) : minPriceInput
        }`,
        onClear: () => {
          setMinPriceInput("");
          setPage(1);
        },
      });
    }
    if (maxPriceInput) {
      const parsedMax = Number(maxPriceInput);
      chips.push({
        key: "maxPrice",
        label: `Precio hasta: ${
          Number.isFinite(parsedMax) ? formatCompactNumber(parsedMax) : maxPriceInput
        }`,
        onClear: () => {
          setMaxPriceInput("");
          setPage(1);
        },
      });
    }
    return chips;
  }, [operationType, propertyType, publisherType, localityId, localities, priceCurrency, minPriceInput, maxPriceInput]);
  const selectedLocalityName = useMemo(
    () => localities.find((item) => item.id === localityId)?.name ?? "Bragado",
    [localities, localityId]
  );
  const searchSeo = useMemo(() => {
    const canonicalParams = new URLSearchParams();
    if (operationType) canonicalParams.set("operationType", operationType);
    if (propertyType) canonicalParams.set("propertyType", propertyType);
    if (publisherType) canonicalParams.set("publisherType", publisherType);
    if (localityId) canonicalParams.set("localityId", localityId);
    const canonicalQuery = canonicalParams.toString();

    const primaryFilterCount = [operationType, propertyType, publisherType, localityId].filter(Boolean).length;
    const hasPriceFilters = Boolean(minPriceInput || maxPriceInput);
    const hasSecondaryFilters = Boolean(priceCurrency || hasPriceFilters);
    const noindex = page > 1 || hasSecondaryFilters || primaryFilterCount > 3;

    const operationLabel = operationType ? operationFilterLabels[operationType] : null;
    const propertyLabel = propertyType ? propertyFilterLabels[propertyType] : "propiedades";
    const localityLabel = localityId ? selectedLocalityName : "Bragado";
    const publisherLabel = publisherType ? publisherFilterLabels[publisherType] : null;

    const titleParts = ["Buscar"];
    if (propertyType) titleParts.push(propertyLabel.toLowerCase());
    else titleParts.push("propiedades");
    if (operationLabel) titleParts.push(operationLabel.toLowerCase());
    titleParts.push("en", localityLabel);

    const descriptionParts = [
      `Explora ${propertyType ? propertyLabel.toLowerCase() : "propiedades"}${
        operationLabel ? ` en ${operationLabel.toLowerCase()}` : ""
      } en ${localityLabel}`,
    ];
    if (publisherLabel) {
      descriptionParts.push(`publicadas por ${publisherLabel.toLowerCase()}`);
    }
    descriptionParts.push("con filtros claros, mapa y contacto rápido en DomusBrag.");

    return {
      title: titleParts.join(" "),
      description: descriptionParts.join(" "),
      canonicalPath: canonicalQuery ? `/buscar?${canonicalQuery}` : "/buscar",
      noindex,
      structuredData: {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: titleParts.join(" "),
        description: descriptionParts.join(" "),
        url:
          typeof window !== "undefined"
            ? `${window.location.origin}${canonicalQuery ? `/buscar?${canonicalQuery}` : "/buscar"}`
            : undefined,
        isPartOf: {
          "@type": "WebSite",
          name: "DomusBrag",
          url: env.siteUrl,
        },
      },
    };
  }, [
    operationType,
    propertyType,
    publisherType,
    localityId,
    selectedLocalityName,
    minPriceInput,
    maxPriceInput,
    priceCurrency,
    page,
  ]);
  useSeo(searchSeo);
  const pageProgress = totalPages > 1 ? Math.min(100, Math.max(0, (page / totalPages) * 100)) : 100;

  useEffect(() => {
    const updateViewport = () => {
      setIsMobileViewport(window.innerWidth < 768);
    };
    updateViewport();
    window.addEventListener("resize", updateViewport);
    return () => window.removeEventListener("resize", updateViewport);
  }, []);

  useEffect(() => {
    if (!isMobileViewport) return;
    if (viewMode !== "grid") {
      setViewMode("grid");
    }
    if (pageSize !== 9) {
      setPageSize(9);
      setPage(1);
    }
  }, [isMobileViewport, viewMode, pageSize]);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({
      status: "ACTIVE",
      page: String(page),
      pageSize: String(pageSize),
    });
    if (operationType) {
      params.set("operationType", operationType);
    }
    if (propertyType) {
      params.set("propertyType", propertyType);
    }
    if (publisherType) {
      params.set("publisherType", publisherType);
    }
    if (localityId) {
      params.set("localityId", localityId);
    }
    if (priceCurrency) {
      params.set("priceCurrency", priceCurrency);
    }
    if (minPriceInput) {
      params.set("minPrice", minPriceInput);
    }
    if (maxPriceInput) {
      params.set("maxPrice", maxPriceInput);
    }
    return `${env.apiUrl}/properties?${params.toString()}`;
  }, [page, pageSize, operationType, propertyType, publisherType, localityId, priceCurrency, minPriceInput, maxPriceInput]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextOperation = (params.get("operationType") ?? "") as typeof operationType;
    const nextProperty = (params.get("propertyType") ?? "") as typeof propertyType;
    const nextPublisherType = (params.get("publisherType") ?? "") as typeof publisherType;
    const nextLocalityId = params.get("localityId") ?? "";
    const nextPriceCurrency = (params.get("priceCurrency") ?? "") as typeof priceCurrency;
    const nextMinPrice = params.get("minPrice") ?? "";
    const nextMaxPrice = params.get("maxPrice") ?? "";
    setOperationType(nextOperation);
    setPropertyType(nextProperty);
    setPublisherType(nextPublisherType);
    setLocalityId(nextLocalityId);
    setPriceCurrency(nextPriceCurrency);
    setMinPriceInput(nextMinPrice);
    setMaxPriceInput(nextMaxPrice);
    setPage(1);
  }, [location.search]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (operationType) {
      params.set("operationType", operationType);
    }
    if (propertyType) {
      params.set("propertyType", propertyType);
    }
    if (publisherType) {
      params.set("publisherType", publisherType);
    }
    if (localityId) {
      params.set("localityId", localityId);
    }
    if (priceCurrency) {
      params.set("priceCurrency", priceCurrency);
    }
    if (minPriceInput) {
      params.set("minPrice", minPriceInput);
    }
    if (maxPriceInput) {
      params.set("maxPrice", maxPriceInput);
    }
    const nextSearch = params.toString();
    const currentSearch = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;
    if (nextSearch !== currentSearch) {
      navigate(nextSearch ? `/buscar?${nextSearch}` : "/buscar", { replace: true });
    }
  }, [navigate, location.search, operationType, propertyType, publisherType, localityId, priceCurrency, minPriceInput, maxPriceInput]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const load = async () => {
      setListStatus("loading");
      setListError("");
      try {
        const data = await fetchJson<{
          items: PropertyApiListItem[];
          total: number;
        }>(listUrl, {
          cacheKey: listUrl,
          ttlMs: 15_000,
          signal: controller.signal,
        });
        if (ignore) return;
        if (data.items.length > 0) {
          setListings(data.items.map(mapPropertyToSearchListing));
          setTotal(data.total ?? data.items.length);
          setListStatus("idle");
        } else {
          setListings([]);
          setListStatus("idle");
          setListError("");
        }
      } catch (error) {
        if (ignore) return;
        if (controller.signal.aborted) return;
        setListStatus("error");
        setListError(
          error instanceof Error ? error.message : "Error al cargar publicaciones."
        );
        setListings([]);
      }
    };
    void load();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [listUrl]);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const loadAgencies = async () => {
      try {
        const data = await fetchJson<{
          items: { id: string; name: string; logo?: string | null }[];
        }>(`${env.apiUrl}/agencies`, {
          cacheKey: `${env.apiUrl}/agencies`,
          ttlMs: 60_000,
          signal: controller.signal,
        });
        if (ignore) return;
        if (data.items.length) {
          setAgencies(data.items);
        } else {
          setAgencies([]);
        }
      } catch {
        if (ignore) return;
        if (controller.signal.aborted) return;
        setAgencies([]);
      }
    };
    void loadAgencies();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const loadLocalities = async () => {
      try {
        const data = await fetchJson<{ items: LocalityOption[] }>(
          `${env.apiUrl}/properties/localities?status=ACTIVE`,
          {
            cacheKey: `${env.apiUrl}/properties/localities?status=ACTIVE`,
            ttlMs: 60_000,
            signal: controller.signal,
          }
        );
        if (ignore) return;
        setLocalities(data.items ?? []);
      } catch {
        if (ignore || controller.signal.aborted) return;
        setLocalities([]);
      }
    };
    void loadLocalities();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  useEffect(() => {
    let ignore = false;
    const controller = new AbortController();
    const loadAds = async () => {
      try {
        const response = await fetch(`${env.apiUrl}/ads?active=true&limit=10`, {
          signal: controller.signal,
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar publicidad.");
        }
        const data = (await response.json()) as { items: AdItem[] };
        if (ignore) return;
        setAds(data.items ?? []);
      } catch {
        if (ignore || controller.signal.aborted) return;
        setAds([]);
      }
    };
    void loadAds();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, []);

  const displayItems = useMemo((): SearchCardItem[] => {
    const base = listings.map((item) => ({ kind: "listing" as const, item }));
    if (!ads.length || !base.length) {
      return base;
    }
    const interval = viewMode === "grid" ? 6 : 4;
    const firstInsertAt = viewMode === "grid" ? 3 : 2;
    const output: SearchCardItem[] = [];
    let adIndex = 0;
    let insertedAds = 0;
    base.forEach((entry, index) => {
      output.push(entry);
      const shownListings = index + 1;
      const isFirstSlot = shownListings === firstInsertAt;
      const isIntervalSlot =
        shownListings > firstInsertAt &&
        (shownListings - firstInsertAt) % interval === 0;
      if (isFirstSlot || isIntervalSlot) {
        const ad = ads[adIndex % ads.length];
        if (ad) {
          output.push({ kind: "ad", ad });
          adIndex += 1;
          insertedAds += 1;
        }
      }
    });
    if (insertedAds === 0 && ads.length > 0) {
      output.push({ kind: "ad", ad: ads[0] });
    }
    return output;
  }, [listings, ads, viewMode]);

  const getPropertyDetail = async (listingId: string) => {
    const cached = detailCacheRef.current.get(listingId);
    if (cached) return cached;
    const data = await fetchJson<PropertyApiDetail>(`${env.apiUrl}/properties/${listingId}`, {
      cacheKey: `${env.apiUrl}/properties/${listingId}`,
      ttlMs: 30_000,
    });
    const mapped = mapPropertyToDetailListing(data);
    detailCacheRef.current.set(listingId, mapped);
    return mapped;
  };

  const prefetchDetail = (listingId: string) => {
    void getPropertyDetail(listingId).catch(() => {
      // ignore prefetch failures
    });
  };

  const openModal = async (listing: SearchListing) => {
    trackEvent("view_listing", {
      propertyId: listing.id,
      operation: listing.operation,
      propertyType: listing.propertyType,
    });
    navigate(`/publicacion/${listing.id}`);
  };

  const handleCardWhatsapp = async (listing: SearchListing) => {
    if (!sessionUser) {
      addToast("Inicia sesión para contactar por WhatsApp.", "warning");
      return;
    }
    try {
      const detail = await getPropertyDetail(listing.id);
      const isMine =
        (sessionUser.role === "OWNER" && detail.ownerUserId === sessionUser.id) ||
        (sessionUser.role.startsWith("AGENCY") && detail.agencyId === sessionUser.agencyId);
      if (isMine) {
        addToast("No puedes contactar tus propias publicaciones.", "warning");
        return;
      }
      const method = detail.contactMethods?.find((item) => item.type === "WHATSAPP");
      if (!method?.value) {
        addToast("No hay WhatsApp disponible en esta publicación.", "warning");
        navigate(`/publicacion/${listing.id}`);
        return;
      }
      const message = `Hola, me interesa "${detail.title}". Link: ${
        detail.id ? `${window.location.origin}/publicacion/${detail.id}` : ""
      }`;
      const url = buildWhatsappLink(method.value, message);
      if (!url) {
        addToast("No pudimos generar el enlace de WhatsApp.", "error");
        return;
      }
      window.open(url, "_blank", "noopener,noreferrer");
      trackEvent("click_whatsapp", { propertyId: detail.id, source: "search_card" });
    } catch {
      addToast("No pudimos abrir WhatsApp.", "error");
    }
  };

  const clearAllFilters = () => {
    setOperationType("");
    setPropertyType("");
    setPublisherType("");
    setLocalityId("");
    setPriceCurrency("");
    setMinPriceInput("");
    setMaxPriceInput("");
    setPage(1);
  };

  const filtersCard = (
    <div className="glass-card space-y-4 border-white/25 bg-night-800/80 p-5 backdrop-blur-md">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Filtros</p>
          <p className="mt-1 text-xs text-[#E7E2DD]/80">
            {total} resultado{total === 1 ? "" : "s"} disponibles
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeFilters.length > 0 ? (
            <button
              type="button"
              className="rounded-full border border-gold-500/40 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-300 transition hover:bg-gold-500/20"
              onClick={clearAllFilters}
            >
              Limpiar filtros
            </button>
          ) : null}
        </div>
      </div>
      <div className="grid gap-4">
        <label className="space-y-2 text-xs text-[#D1C7BD]">
          Operación
          <select
            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
            value={operationType}
            onChange={(event) => {
              setOperationType(event.target.value as typeof operationType);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            <option value="SALE">Venta</option>
            <option value="RENT">Alquiler</option>
            <option value="TEMPORARY">Temporario</option>
          </select>
        </label>
        <label className="space-y-2 text-xs text-[#D1C7BD]">
          Tipo
          <select
            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
            value={propertyType}
            onChange={(event) => {
              setPropertyType(event.target.value as typeof propertyType);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="HOUSE">Casa</option>
            <option value="APARTMENT">Departamento</option>
            <option value="LAND">Terreno</option>
            <option value="FIELD">Campo</option>
            <option value="QUINTA">Quinta</option>
            <option value="COMMERCIAL">Comercio</option>
            <option value="WAREHOUSE">Depósito</option>
            <option value="OFFICE">Oficina</option>
          </select>
        </label>
        <label className="space-y-2 text-xs text-[#D1C7BD]">
          Publicador
          <select
            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
            value={publisherType}
            onChange={(event) => {
              setPublisherType(event.target.value as typeof publisherType);
              setPage(1);
            }}
          >
            <option value="">Todos</option>
            <option value="OWNER">Dueño directo</option>
            <option value="AGENCY">Inmobiliaria</option>
          </select>
        </label>
        <label className="space-y-2 text-xs text-[#D1C7BD]">
          Zona
          <select
            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
            value={localityId}
            onChange={(event) => {
              setLocalityId(event.target.value);
              setPage(1);
            }}
          >
            <option value="">Todas las zonas</option>
            {localities.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.count})
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Precio mínimo
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white placeholder:text-[#9a948a]"
              type="number"
              min={0}
              step="1000"
              inputMode="numeric"
              placeholder="Ej: 100000"
              value={minPriceInput}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "") {
                  setMinPriceInput("");
                  setPage(1);
                  return;
                }
                const parsed = Number(next);
                if (!Number.isFinite(parsed)) return;
                setMinPriceInput(String(Math.round(Math.max(0, parsed))));
                setPage(1);
              }}
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Precio máximo
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white placeholder:text-[#9a948a]"
              type="number"
              min={0}
              step="1000"
              inputMode="numeric"
              placeholder="Ej: 300000"
              value={maxPriceInput}
              onChange={(event) => {
                const next = event.target.value;
                if (next === "") {
                  setMaxPriceInput("");
                  setPage(1);
                  return;
                }
                const parsed = Number(next);
                if (!Number.isFinite(parsed)) return;
                setMaxPriceInput(String(Math.round(Math.max(0, parsed))));
                setPage(1);
              }}
            />
          </label>
        </div>
        <label className="space-y-2 text-xs text-[#D1C7BD]">
          Moneda
          <select
            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
            value={priceCurrency}
            onChange={(event) => {
              setPriceCurrency(event.target.value as typeof priceCurrency);
              setPage(1);
            }}
          >
            <option value="">Todas</option>
            <option value="ARS">ARS</option>
            <option value="USD">USD</option>
          </select>
        </label>
      </div>
      {activeFilters.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {activeFilters.map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="rounded-full border border-white/20 bg-white/5 px-3 py-1 text-xs text-[#E7E2DD] transition hover:border-gold-500/45 hover:text-white"
              onClick={chip.onClear}
            >
              {chip.label} x
            </button>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#D1C7BD]">Sin filtros activos. Mostramos todo el inventario activo.</p>
      )}
    </div>
  );
  return (
    <div className="space-y-4 md:space-y-8">
      <section className="relative h-[36svh] min-h-[230px] w-full overflow-hidden rounded-[24px] border border-white/15 md:h-[44svh] md:min-h-[300px] md:rounded-[30px] lg:-mt-8 xl:-mt-10">
        <div className="absolute inset-0 bg-hero bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/62" />
        <div className="relative mx-auto flex h-full max-w-5xl items-center justify-center px-4 text-center sm:px-6">
          <div className="space-y-3 md:space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">Buscar propiedades</p>
            <h2 className="font-display text-3xl leading-tight text-white sm:text-4xl md:text-5xl">
              Búsqueda en Bragado
            </h2>
            <p className="mx-auto max-w-2xl text-xs text-[#E7E2DD] sm:text-sm md:text-base">
              Propiedades en Bragado con filtros claros, fotos, ubicación y contacto rápido.
            </p>
            <div className="flex justify-center">
              <span className="gold-pill">Resultados actualizados</span>
            </div>
          </div>
        </div>
        <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 text-xs text-[#D1C7BD] lg:hidden">
          <button
            type="button"
            className={`inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-semibold backdrop-blur-md transition ${
              activeFilters.length > 0
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
            {activeFilters.length > 0 && (
              <span className="rounded-full bg-gold-500/40 px-2 py-0.5 text-[10px] text-[#1A1613]">
                {activeFilters.length}
              </span>
            )}
          </button>
        </div>
      </section>

      <section className="space-y-3 md:space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Inmobiliarias locales</p>
            <h3 className="text-xl text-white">Inmobiliarias en Bragado</h3>
          </div>
          <span className="hidden text-xs text-[#D1C7BD] md:inline">Deslizá para explorar</span>
        </div>
        <div className="relative rounded-[22px] border border-white/10 bg-gradient-to-r from-night-900/70 via-night-800/45 to-night-900/70 p-3 md:rounded-[28px] md:p-4 shadow-[0_18px_45px_rgba(0,0,0,0.28)]">
          <span className="scroll-fade scroll-fade-left" aria-hidden="true" />
          <span className="scroll-fade scroll-fade-right" aria-hidden="true" />
          <div className="elegant-scroll flex gap-4 overflow-x-auto pb-2">
            {agencies.map((agency) => {
              const isLogoImage =
                agency.logo?.startsWith("http") || agency.logo?.startsWith("data:");
              const initials = agency.name
                .split(" ")
                .slice(0, 2)
                .map((part) => part.charAt(0))
                .join("")
                .toUpperCase();
              return (
                <Link
                  key={agency.id}
                  to={`/agencia/${agency.id}`}
                  className="group relative min-h-[96px] min-w-[214px] overflow-hidden rounded-2xl border border-white/10 bg-night-900/70 p-3 transition duration-300 hover:-translate-y-0.5 hover:border-gold-500/50"
                >
                  <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[#AF8C5C]/16 via-transparent to-[#D1C7BD]/10 opacity-70 transition group-hover:opacity-100" />
                  {isLogoImage ? (
                    <img
                      src={agency.logo ?? ""}
                      alt={agency.name}
                      className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full object-cover opacity-20 blur-sm"
                    />
                  ) : null}
                  <div className="relative flex h-full items-center gap-3">
                    <span className="absolute right-2 top-2 inline-flex w-fit rounded-full border border-gold-500/30 bg-gold-500/10 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.12em] text-gold-300">
                      Inmobiliaria
                    </span>
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-white/15 bg-night-800/70 text-xs font-semibold text-gold-300">
                      {isLogoImage ? (
                        <img
                          src={agency.logo ?? ""}
                          alt={agency.name}
                          className="h-11 w-11 object-cover"
                        />
                      ) : (
                        agency.logo || initials
                      )}
                    </div>
                    <div className="min-w-0">
                      <h4 className="line-clamp-1 text-sm font-semibold text-white">{agency.name}</h4>
                      <p className="mt-1 text-[11px] text-[#D1C7BD]">
                        Ver perfil y publicaciones activas
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
            {agencies.length === 0 && (
              <div className="rounded-2xl border border-white/10 bg-night-900/48 p-4 text-xs text-[#D1C7BD]">
                <p className="text-sm text-white">Aún no hay inmobiliarias cargadas.</p>
                <p className="mt-1">Sumate y destacate en el carrusel principal.</p>
                <Link
                  className="mt-3 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                  to="/registro"
                >
                  Crear perfil inmobiliaria
                </Link>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-[264px_minmax(0,1fr)] xl:grid-cols-[276px_minmax(0,1fr)]">
        <aside className="hidden space-y-4 lg:block">{filtersCard}</aside>

        <div className="space-y-4">
      <section className="space-y-4">
        <div className="rounded-2xl border border-white/15 bg-night-900/55 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Resultados</h3>
              <p className="text-xs text-[#D1C7BD]">Ordenados por relevancia y actualización.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-[#D1C7BD] sm:inline">Vista</span>
              {!isMobileViewport && (
                <button
                  className={
                    viewMode === "list"
                      ? "rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white"
                      : "rounded-full border border-white/15 px-3 py-1 text-xs text-[#D1C7BD]"
                  }
                  type="button"
                  onClick={() => {
                    setViewMode("list");
                    setPageSize(5);
                    setPage(1);
                  }}
                >
                  Lista
                </button>
              )}
              <button
                className={
                  viewMode === "grid"
                    ? "rounded-full border border-white/30 bg-white/10 px-3 py-1 text-xs text-white"
                    : "rounded-full border border-white/15 px-3 py-1 text-xs text-[#D1C7BD]"
                }
                type="button"
                onClick={() => {
                  setViewMode("grid");
                  setPageSize(9);
                  setPage(1);
                }}
              >
                Cuadricula
              </button>
            </div>
          </div>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] transition-all duration-300"
              style={{ width: `${pageProgress}%` }}
            />
          </div>
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-[#D1C7BD]">
            <div>
              Pagina {page} de {totalPages}
            </div>
            <div className="flex items-center gap-2">
              <span>Por página</span>
              <select
                className="rounded-full border border-white/15 bg-night-900/48 px-3 py-1 text-xs text-white"
                value={pageSize}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  if (isMobileViewport) return;
                  setPageSize(next);
                  setPage(1);
                }}
                disabled={isMobileViewport}
              >
                {!isMobileViewport && <option value={5}>5</option>}
                <option value={9}>9</option>
              </select>
            </div>
          </div>
        </div>
        {listStatus === "loading" && (
          <p className="text-xs text-[#D1C7BD]">Cargando publicaciones...</p>
        )}
        {listStatus === "error" && (
          <p className="text-xs text-[#AF8C5C]">{listError}</p>
        )}
        {listStatus === "idle" && listings.length === 0 && (
          <div className="overflow-hidden rounded-3xl border border-white/15 bg-gradient-to-br from-night-900/90 via-night-800/80 to-night-700/70 p-6 text-xs text-[#D1C7BD] shadow-soft">
            <p className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]/90">Sin coincidencias</p>
            <h4 className="mt-2 text-xl text-white">No encontramos inmuebles con este filtro</h4>
            <p className="mt-2 max-w-xl text-sm text-[#D1C7BD]">
              Ajusta operación, zona o precio para ampliar resultados. También puedes publicar tu
              inmueble y aparecer primero en Bragado.
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.length > 0 ? (
                <button
                  type="button"
                  className="rounded-full border border-gold-500/40 bg-gold-500/15 px-4 py-2 text-xs font-semibold text-gold-300"
                  onClick={() => {
                    setOperationType("");
                    setPropertyType("");
                    setPublisherType("");
                    setLocalityId("");
                    setPriceCurrency("");
                    setMinPriceInput("");
                    setMaxPriceInput("");
                    setPage(1);
                  }}
                >
                  Quitar filtros
                </button>
              ) : null}
              <Link
                className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                to="/publicar"
              >
                Publicar inmueble
              </Link>
              <Link
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                to="/registro"
              >
                Crear cuenta
              </Link>
            </div>
          </div>
        )}

        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-4"
          }
        >
          {listStatus === "loading"
            ? Array.from({ length: pageSize }).map((_, index) => (
                <article
                  key={`skeleton-${index}`}
                  className={
                    viewMode === "grid"
                      ? "glass-card flex h-full flex-col overflow-hidden animate-pulse"
                      : "glass-card grid gap-5 p-5 md:grid-cols-[220px_1fr] animate-pulse"
                  }
                >
                  <div className="flex flex-col gap-3">
                    <div className="h-40 w-full rounded-2xl bg-white/10" />
                    <div className="flex gap-2">
                      <div className="h-8 flex-1 rounded-full bg-white/10" />
                      <div className="h-8 flex-1 rounded-full bg-white/10" />
                    </div>
                  </div>
                  <div className={viewMode === "grid" ? "space-y-3 p-5" : "space-y-4"}>
                    <div className="h-4 w-3/4 rounded-full bg-white/10" />
                    <div className="h-3 w-2/3 rounded-full bg-white/10" />
                    <div className="h-3 w-1/2 rounded-full bg-white/10" />
                    <div className="h-3 w-2/3 rounded-full bg-white/10" />
                  </div>
                </article>
              ))
            : displayItems.map((entry, index) => {
                if (entry.kind === "ad") {
                  const ad = entry.ad;
                  const isGrid = viewMode === "grid";
                  return (
                    <article
                      key={`ad-${ad.id}-${index}`}
                      style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
                      className={
                        isGrid
                          ? "glass-card animate-fadeUp overflow-hidden border border-gold-500/30 md:col-span-2 xl:col-span-3"
                          : "glass-card animate-fadeUp overflow-hidden border border-gold-500/30"
                      }
                    >
                      <div className="flex flex-col">
                        {ad.imageUrl ? (
                          <img
                            className="h-32 w-full object-cover md:h-40"
                            src={ad.imageUrl}
                            alt={ad.title}
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div
                            className="flex h-32 items-center justify-center bg-white/5 text-sm text-[#E7E2DD] md:h-40"
                          >
                            Publicidad destacada
                          </div>
                        )}
                        <div className="mt-3 flex flex-wrap gap-2 px-5 pb-4">
                          <span className="rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-xs font-semibold text-gold-400">
                            Publicidad
                          </span>
                          {ad.ctaText && (
                            <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#E7E2DD]">
                              {ad.ctaText}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="space-y-3 px-5 pb-5">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <h3 className="text-lg text-white">{ad.title}</h3>
                            {ad.body && <p className="text-sm text-[#D1C7BD]">{ad.body}</p>}
                          </div>
                        </div>
                        {ad.linkUrl && (
                          <a
                            className="inline-flex items-center justify-center rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                            href={ad.linkUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {ad.ctaText || "Ver mas"}
                          </a>
                        )}
                      </div>
                    </article>
                  );
                }
                const item = entry.item;
                const ownerDisplayName = item.ownerDisplayName?.trim() ?? "";
                const isAgencyPublisher = Boolean(item.agency?.trim());
                const publisherName = isAgencyPublisher
                  ? item.agency?.trim() ?? "Inmobiliaria"
                  : ownerDisplayName || "Dueño directo";
                const hasAgencyLogo =
                  Boolean(item.agencyLogo) &&
                  (item.agencyLogo?.startsWith("http") || item.agencyLogo?.startsWith("data:"));
                const publisherInitials = publisherName
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join("")
                  .toUpperCase();
                const gridFeatureChips = [
                  {
                    key: "rooms",
                    icon: "rooms" as FeatureIconName,
                    label: item.rooms > 0 ? `${item.rooms} ambientes` : "Sin ambientes",
                  },
                  {
                    key: "area",
                    icon: "area" as FeatureIconName,
                    label: `${item.areaM2} m2`,
                  },
                  {
                    key: "garage",
                    icon: "garage" as FeatureIconName,
                    label: item.garage ? "Cochera" : "Sin cochera",
                  },
                  item.pets
                    ? {
                        key: "pets",
                        icon: "pets" as FeatureIconName,
                        label: "Mascotas permitidas",
                      }
                    : null,
                  item.kids
                    ? {
                        key: "kids",
                        icon: "kids" as FeatureIconName,
                        label: "Apto niños",
                      }
                    : null,
                ].filter(
                  (feature): feature is { key: string; icon: FeatureIconName; label: string } =>
                    feature !== null
                );
                const visibleGridFeatures = gridFeatureChips.slice(0, 3);
                const extraGridFeatures = gridFeatureChips.length - visibleGridFeatures.length;

                if (viewMode === "list") {
                  return (
                    <article
                      key={item.id}
                      onMouseEnter={() => prefetchDetail(item.id)}
                      onFocus={() => prefetchDetail(item.id)}
                      style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
                      className="glass-card overflow-hidden animate-fadeUp md:grid md:min-h-[218.67px] md:grid-cols-[260px_minmax(0,1fr)_210px]"
                    >
                      <div className="relative h-44 md:h-[218.67px]">
                        <button
                          type="button"
                          className="block h-full w-full text-left"
                          onClick={() => openModal(item)}
                          onMouseEnter={() => prefetchDetail(item.id)}
                          aria-label={`Ver ficha de ${item.title}`}
                        >
                          <img
                            className="h-full w-full object-cover transition duration-300 hover:scale-[1.02]"
                            src={item.image}
                            alt={item.title}
                            sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 90vw"
                            loading="lazy"
                            decoding="async"
                          />
                        </button>
                        <span
                          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${getImageOperationBadgeClass(
                            item.operation
                          )}`}
                        >
                          {item.operation}
                        </span>
                      </div>
                      <div className="min-w-0 p-3 md:p-4 md:pr-2">
                        <div className="flex h-full flex-col gap-2 overflow-hidden">
                          <div>
                            <h4 className="line-clamp-1 text-xl text-white">
                              <button
                                type="button"
                                className="block max-w-full text-left transition hover:text-[#E7E2DD]"
                                onClick={() => openModal(item)}
                                onMouseEnter={() => prefetchDetail(item.id)}
                              >
                                {item.title}
                              </button>
                            </h4>
                            <p className="line-clamp-1 text-sm text-[#D1C7BD]">{item.address}</p>
                          </div>
                          <p className="line-clamp-1 text-sm text-[#D1C7BD]">
                            {item.description?.trim() ? item.description : "Sin descripción."}
                          </p>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#D1C7BD]">
                            <span className="inline-flex items-center gap-2">
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path d="M4 9h16M4 9l2-3h12l2 3M4 9v9h16V9" />
                                <path d="M9 13h6" />
                              </svg>
                              {item.rooms > 0 ? `${item.rooms} ambientes` : "Sin ambientes"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path d="M4 4h16v16H4z" />
                                <path d="M4 9h16M9 4v16" />
                              </svg>
                              {item.areaM2} m2
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path d="M3 11l9-7 9 7v9H3v-9z" />
                                <path d="M8 20v-5h8v5" />
                              </svg>
                              Cochera: {item.garage ? "Sí" : "No"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <path d="M7 12h10M5 8l2 12M19 8l-2 12" />
                                <path d="M9 6l3 4 3-4" />
                              </svg>
                              Mascotas: {item.pets ? "Sí" : "No"}
                            </span>
                            <span className="inline-flex items-center gap-2">
                              <svg
                                aria-hidden="true"
                                className="h-4 w-4"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.5"
                              >
                                <circle cx="12" cy="7" r="3" />
                                <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
                              </svg>
                              Niños: {item.kids ? "Sí" : "No"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <aside className="flex h-full flex-col gap-2 p-3 md:pl-1 md:pr-3">
                        <div className="w-full rounded-xl border border-white/15 bg-night-900/55 px-2 py-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.2)]">
                          <div>
                            <div className="text-[8px] uppercase tracking-[0.1em] text-[#D1C7BD]">Precio</div>
                            <div className="mt-0.5 text-[1.45rem] font-semibold leading-none text-white">{item.price}</div>
                          </div>
                          <div className="my-1 h-px w-full bg-white/12" />
                          <div className="flex items-center gap-2">
                            <div className="h-6 w-6 overflow-hidden rounded-full border border-white/15 bg-night-800">
                              {isAgencyPublisher && hasAgencyLogo ? (
                                <img
                                  src={item.agencyLogo ?? ""}
                                  alt={publisherName}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                  decoding="async"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-[9px] font-semibold text-[#E7E2DD]">
                                  {publisherInitials || "BR"}
                                </div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <div className="text-[10px] font-semibold tracking-[0.02em] text-sky-200">
                                {isAgencyPublisher ? "Inmobiliaria" : "Dueño directo"}
                              </div>
                              <div
                                className="line-clamp-1 text-base font-semibold leading-tight text-white"
                                title={publisherName}
                              >
                                {publisherName}
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap gap-1.5 md:flex-nowrap md:justify-end">
                          <button
                            className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-3 py-1.5 text-[11px] font-semibold text-night-900"
                            type="button"
                            onClick={() => openModal(item)}
                            onMouseEnter={() => prefetchDetail(item.id)}
                          >
                            Ver ficha
                          </button>
                          <button
                            className="inline-flex items-center gap-1 rounded-full border border-[#25D366]/40 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110"
                            type="button"
                            onClick={() => void handleCardWhatsapp(item)}
                          >
                            <svg
                              aria-hidden="true"
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              fill="currentColor"
                              className="h-3.5 w-3.5"
                            >
                              <path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.46 0 .1 5.37.1 11.96c0 2.1.55 4.15 1.6 5.96L0 24l6.25-1.64a11.9 11.9 0 0 0 5.8 1.49h.01c6.6 0 11.96-5.37 11.96-11.96 0-3.2-1.25-6.2-3.5-8.41Zm-8.46 18.35h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-3.71.98.99-3.61-.23-.37a9.88 9.88 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.98 2.9a9.82 9.82 0 0 1 2.9 6.98c0 5.46-4.44 9.9-9.89 9.9Zm5.43-7.43c-.3-.15-1.78-.88-2.06-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.95 1.18-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.37-1.46a8.94 8.94 0 0 1-1.64-2.03c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.52 0 1.48 1.07 2.91 1.22 3.11.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.78-.73 2.03-1.43.25-.7.25-1.31.17-1.44-.07-.13-.27-.2-.57-.35Z" />
                            </svg>
                            WhatsApp
                          </button>
                        </div>
                      </aside>
                    </article>
                  );
                }

                return (
                  <article
                    key={item.id}
                    onMouseEnter={() => prefetchDetail(item.id)}
                    onFocus={() => prefetchDetail(item.id)}
                    style={{ animationDelay: `${Math.min(index, 10) * 55}ms` }}
                    className="glass-card flex h-full min-h-[470px] flex-col overflow-hidden animate-fadeUp"
                  >
                    <div className="relative h-44">
                      <button
                        type="button"
                        className="block h-full w-full text-left"
                        onClick={() => openModal(item)}
                        onMouseEnter={() => prefetchDetail(item.id)}
                        aria-label={`Ver ficha de ${item.title}`}
                      >
                        <img
                          className="h-full w-full rounded-t-2xl object-cover transition duration-300 hover:scale-[1.02]"
                          src={item.image}
                          alt={item.title}
                          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 92vw"
                          loading="lazy"
                          decoding="async"
                        />
                      </button>
                      <span
                        className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${getImageOperationBadgeClass(
                          item.operation
                        )}`}
                      >
                        {item.operation}
                      </span>
                      <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#1A1613] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                        {item.price}
                      </span>
                    </div>

                    <div className="flex flex-1 flex-col p-4">
                      <div className="min-w-0">
                        <h4 className="line-clamp-1 text-xl text-white">
                          <button
                            type="button"
                            className="block max-w-full text-left transition hover:text-[#E7E2DD]"
                            onClick={() => openModal(item)}
                            onMouseEnter={() => prefetchDetail(item.id)}
                          >
                            {item.title}
                          </button>
                        </h4>
                        <p className="line-clamp-1 text-sm text-[#D1C7BD]">{item.address}</p>
                      </div>

                      <p className="mt-3 min-h-[2.7rem] text-sm text-[#D1C7BD] line-clamp-2">
                        {item.description?.trim() ? item.description : "Sin descripción."}
                      </p>

                      <div className="mt-3 flex min-h-[72px] flex-wrap content-start gap-2 text-xs text-[#D1C7BD]">
                        {visibleGridFeatures.map((feature) => (
                          <span
                            key={`${item.id}-${feature.key}`}
                            className="inline-flex items-center gap-1.5 rounded-full border border-white/12 px-3 py-1"
                          >
                            {renderFeatureIcon(feature.icon)}
                            {feature.label}
                          </span>
                        ))}
                        {extraGridFeatures > 0 && (
                          <span className="inline-flex items-center rounded-full border border-gold-500/35 bg-gold-500/10 px-3 py-1 text-gold-300">
                            +{extraGridFeatures} mas
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-2 rounded-xl border border-white/12 bg-night-900/50 px-3 py-2">
                        <div className="h-7 w-7 overflow-hidden rounded-full border border-white/15 bg-night-800">
                          {isAgencyPublisher && hasAgencyLogo ? (
                            <img
                              src={item.agencyLogo ?? ""}
                              alt={publisherName}
                              className="h-full w-full object-cover"
                              loading="lazy"
                              decoding="async"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-[10px] font-semibold text-[#E7E2DD]">
                              {publisherInitials || "BR"}
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-sky-200">
                            {isAgencyPublisher ? "Inmobiliaria" : "Dueño directo"}
                          </div>
                          <div className="line-clamp-1 text-base font-semibold leading-tight text-white" title={publisherName}>
                            {publisherName}
                          </div>
                        </div>
                      </div>

                      <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                        <button
                          className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                          type="button"
                          onClick={() => openModal(item)}
                          onMouseEnter={() => prefetchDetail(item.id)}
                        >
                          Ver ficha
                        </button>
                        <button
                          className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#25D366]/40 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                          type="button"
                          onClick={() => void handleCardWhatsapp(item)}
                        >
                          <svg
                            aria-hidden="true"
                            xmlns="http://www.w3.org/2000/svg"
                            viewBox="0 0 24 24"
                            fill="currentColor"
                            className="h-3.5 w-3.5"
                          >
                            <path d="M20.52 3.48A11.94 11.94 0 0 0 12.06 0C5.46 0 .1 5.37.1 11.96c0 2.1.55 4.15 1.6 5.96L0 24l6.25-1.64a11.9 11.9 0 0 0 5.8 1.49h.01c6.6 0 11.96-5.37 11.96-11.96 0-3.2-1.25-6.2-3.5-8.41Zm-8.46 18.35h-.01a9.9 9.9 0 0 1-5.05-1.39l-.36-.21-3.71.98.99-3.61-.23-.37a9.88 9.88 0 0 1-1.52-5.27c0-5.46 4.44-9.9 9.9-9.9 2.64 0 5.12 1.03 6.98 2.9a9.82 9.82 0 0 1 2.9 6.98c0 5.46-4.44 9.9-9.89 9.9Zm5.43-7.43c-.3-.15-1.78-.88-2.06-.98-.27-.1-.47-.15-.67.15-.2.3-.77.98-.95 1.18-.17.2-.35.22-.65.08-.3-.15-1.25-.46-2.37-1.46a8.94 8.94 0 0 1-1.64-2.03c-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.53.15-.17.2-.3.3-.5.1-.2.05-.38-.02-.53-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.53.08-.8.38-.28.3-1.05 1.03-1.05 2.52 0 1.48 1.07 2.91 1.22 3.11.15.2 2.1 3.2 5.09 4.49.71.31 1.27.49 1.7.63.71.23 1.36.2 1.87.12.57-.09 1.78-.73 2.03-1.43.25-.7.25-1.31.17-1.44-.07-.13-.27-.2-.57-.35Z" />
                          </svg>
                          WhatsApp
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
        </div>
        <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-night-900/45 p-3 text-xs text-[#D1C7BD]">
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || listStatus === "loading"}
          >
            Anterior
          </button>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[#D1C7BD]">
            Pagina {page}/{totalPages}
          </span>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] disabled:cursor-not-allowed disabled:opacity-45"
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || listStatus === "loading"}
          >
            Siguiente
          </button>
        </div>
      </section>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-[1300] bg-night-950 p-4 lg:hidden">
          <div className="mx-auto flex h-full max-h-[85vh] w-full max-w-md flex-col overflow-hidden rounded-3xl border border-white/10 bg-night-900 shadow-card">
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
            <div className="flex-1 overflow-y-auto p-4">{filtersCard}</div>
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








