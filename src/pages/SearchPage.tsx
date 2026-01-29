import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useLocation, useNavigate } from "react-router-dom";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import { env } from "../shared/config/env";
import type { PropertyApiDetail, PropertyApiListItem, SearchListing } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing, mapPropertyToSearchListing } from "../shared/properties/propertyMappers";
import { fetchJson } from "../shared/api/http";
import { getToken } from "../shared/auth/session";
import { buildWhatsappLink } from "../shared/utils/whatsapp";

export function SearchPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [listStatus, setListStatus] = useState<"idle" | "loading" | "error">("idle");
  const [listError, setListError] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const [agencies, setAgencies] = useState<{ id: string; name: string; logo?: string | null }[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [operationType, setOperationType] = useState<"" | "SALE" | "RENT" | "TEMPORARY">("");
  const [propertyType, setPropertyType] = useState<
    "" | "HOUSE" | "APARTMENT" | "LAND" | "COMMERCIAL" | "OFFICE" | "WAREHOUSE"
  >("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [selectedListing, setSelectedListing] =
    useState<PropertyDetailListing | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading">("idle");
  const [contactStatus, setContactStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [contactMessage, setContactMessage] = useState("");
  const [similarListings, setSimilarListings] = useState<SearchListing[]>([]);
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const detailCacheRef = useRef(new Map<string, PropertyDetailListing>());

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
    return `${env.apiUrl}/properties?${params.toString()}`;
  }, [page, pageSize, operationType, propertyType]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const nextOperation = (params.get("operationType") ?? "") as typeof operationType;
    const nextProperty = (params.get("propertyType") ?? "") as typeof propertyType;
    if (nextOperation !== operationType) {
      setOperationType(nextOperation);
      setPage(1);
    }
    if (nextProperty !== propertyType) {
      setPropertyType(nextProperty);
      setPage(1);
    }
  }, [location.search, operationType, propertyType]);

  useEffect(() => {
    const params = new URLSearchParams();
    if (operationType) {
      params.set("operationType", operationType);
    }
    if (propertyType) {
      params.set("propertyType", propertyType);
    }
    const nextSearch = params.toString();
    const currentSearch = location.search.startsWith("?")
      ? location.search.slice(1)
      : location.search;
    if (nextSearch !== currentSearch) {
      navigate(nextSearch ? `/buscar?${nextSearch}` : "/buscar", { replace: true });
    }
  }, [navigate, location.search, operationType, propertyType]);

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

  const prefetchDetail = (listingId: string) => {
    if (detailCacheRef.current.has(listingId)) {
      return;
    }
    fetchJson<PropertyApiDetail>(`${env.apiUrl}/properties/${listingId}`, {
      cacheKey: `${env.apiUrl}/properties/${listingId}`,
      ttlMs: 30_000,
    })
      .then((data) => {
        const mapped = mapPropertyToDetailListing(data);
        detailCacheRef.current.set(listingId, mapped);
      })
      .catch(() => {
        // ignore prefetch failures
      });
  };

  const openModal = async (listing: SearchListing) => {
    setSelectedListing(listing);
    const cached = detailCacheRef.current.get(listing.id);
    if (cached) {
      setSelectedListing(cached);
      setDetailStatus("idle");
      return;
    }
    setDetailStatus("loading");
    try {
      const data = await fetchJson<PropertyApiDetail>(
        `${env.apiUrl}/properties/${listing.id}`,
        {
          cacheKey: `${env.apiUrl}/properties/${listing.id}`,
          ttlMs: 30_000,
        }
      );
      const mapped = mapPropertyToDetailListing(data);
      detailCacheRef.current.set(listing.id, mapped);
      setSelectedListing(mapped);
    } catch {
      // keep initial listing preview
    } finally {
      setDetailStatus("idle");
    }
  };

  const closeModal = () => {
    setSelectedListing(null);
    setContactStatus("idle");
    setContactMessage("");
    setSimilarListings([]);
  };

  const whatsappLink = useMemo(() => {
    if (!selectedListing?.contactMethods) {
      return null;
    }
    const method = selectedListing.contactMethods.find((item) => item.type === "WHATSAPP");
    if (!method?.value) {
      return null;
    }
    const message = `Hola, me interesa "${selectedListing.title}". Link: ${
      selectedListing.id ? `${window.location.origin}/publicacion/${selectedListing.id}` : ""
    }`;
    return buildWhatsappLink(method.value, message);
  }, [selectedListing]);

  const handleContactRequest = async (type: "INTEREST" | "VISIT") => {
    if (!selectedListing) {
      return;
    }
    const token = getToken();
    if (!token) {
      setContactStatus("error");
      setContactMessage("Inicia sesion para enviar la solicitud.");
      return;
    }
    setContactStatus("loading");
    setContactMessage("");
    try {
      const response = await fetch(`${env.apiUrl}/properties/${selectedListing.id}/contact-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          message:
            type === "INTEREST"
              ? "Estoy interesado en esta propiedad."
              : "Quiero reservar una visita.",
        }),
      });
      if (!response.ok) {
        throw new Error("No pudimos enviar la solicitud.");
      }
      setContactStatus("success");
      setContactMessage("Solicitud enviada. Te contactaremos pronto.");
      void loadSimilar();
    } catch (error) {
      setContactStatus("error");
      setContactMessage(
        error instanceof Error ? error.message : "No pudimos enviar la solicitud."
      );
    }
  };

  const loadSimilar = async () => {
    try {
      const params = new URLSearchParams();
      if (operationType) params.set("operationType", operationType);
      if (propertyType) params.set("propertyType", propertyType);
      params.set("status", "ACTIVE");
      params.set("page", "1");
      params.set("pageSize", "3");
      const response = await fetch(`${env.apiUrl}/properties?${params.toString()}`);
      if (!response.ok) return;
      const data = (await response.json()) as { items: PropertyApiListItem[] };
      const mapped = data.items.map(mapPropertyToSearchListing);
      setSimilarListings(mapped.filter((item) => item.id !== selectedListing?.id));
    } catch {
      // ignore
    }
  };

  const handleSaveSearch = async () => {
    const token = getToken();
    if (!token) {
      setSaveStatus("error");
      setSaveMessage("Inicia sesion para guardar busquedas.");
      return;
    }
    setSaveStatus("loading");
    setSaveMessage("");
    try {
      const operationLabel =
        operationType === "SALE"
          ? "Venta"
          : operationType === "RENT"
          ? "Alquiler"
          : operationType === "TEMPORARY"
          ? "Temporario"
          : "Todas";
      const propertyLabel =
        propertyType === "HOUSE"
          ? "Casa"
          : propertyType === "APARTMENT"
          ? "Departamento"
          : propertyType === "LAND"
          ? "Terreno"
          : propertyType === "COMMERCIAL"
          ? "Comercio"
          : propertyType === "WAREHOUSE"
          ? "Deposito"
          : propertyType === "OFFICE"
          ? "Oficina"
          : "Todos";
      const response = await fetch(`${env.apiUrl}/saved-searches`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: `${operationLabel} · ${propertyLabel}`,
          query: {
            operationType: operationType || null,
            propertyType: propertyType || null,
          },
        }),
      });
      if (!response.ok) {
        throw new Error("No pudimos guardar la busqueda.");
      }
      setSaveStatus("success");
      setSaveMessage("Busqueda guardada.");
      void loadSimilar();
    } catch (error) {
      setSaveStatus("error");
      setSaveMessage(
        error instanceof Error ? error.message : "No pudimos guardar la busqueda."
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Busqueda en Bragado</h2>
          <p className="text-sm text-[#9a948a]">Filtra por operacion, tipo y rango de precio.</p>
        </div>
        <span className="gold-pill">Resultados verificados</span>
      </div>

      <div className="glass-card p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Operacion
            <select
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
          <label className="space-y-2 text-xs text-[#9a948a]">
            Tipo
            <select
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
              <option value="COMMERCIAL">Comercio</option>
              <option value="WAREHOUSE">Deposito</option>
              <option value="OFFICE">Oficina</option>
            </select>
          </label>
          <div className="flex flex-col justify-end gap-2 text-xs text-[#9a948a]">
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
              type="button"
              onClick={handleSaveSearch}
              disabled={saveStatus === "loading"}
            >
              {saveStatus === "loading" ? "Guardando..." : "Guardar busqueda"}
            </button>
            {saveMessage && <span className="text-xs text-[#9a948a]">{saveMessage}</span>}
          </div>
        </div>
      </div>

      {saveStatus === "success" && similarListings.length > 0 && (
        <section className="glass-card space-y-3 p-5">
          <div>
            <h3 className="text-lg text-white">Sugeridos para tu busqueda</h3>
            <p className="text-xs text-[#9a948a]">Resultados similares segun tus filtros.</p>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {similarListings.slice(0, 3).map((item) => (
              <button
                key={item.id}
                className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-left"
                type="button"
                onClick={() => openModal(item)}
              >
                <div className="text-sm text-white">{item.title}</div>
                <div className="text-xs text-[#9a948a]">{item.address}</div>
              </button>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg text-white">Inmobiliarias en Bragado</h3>
          <span className="text-xs text-[#9a948a]">Scroll horizontal</span>
        </div>
          <div className="relative">
            <span className="scroll-fade scroll-fade-left" aria-hidden="true" />
            <span className="scroll-fade scroll-fade-right" aria-hidden="true" />
            <div className="elegant-scroll flex gap-4 overflow-x-auto pb-2">
              {agencies.map((agency) => {
                const initials =
                  agency.logo ??
                  agency.name
                    .split(" ")
                    .slice(0, 2)
                    .map((part) => part.charAt(0))
                    .join("")
                    .toUpperCase();
                return (
                  <a
                    key={agency.id}
                    href={`/agencia/${agency.id}`}
                    className="min-w-[220px] rounded-2xl border border-white/10 bg-night-900/60 p-4 transition hover:border-gold-500/40"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15 text-sm font-semibold text-gold-400">
                        {initials}
                      </div>
                      <div>
                        <h4 className="text-sm text-white">{agency.name}</h4>
                      </div>
                    </div>
                  </a>
                );
              })}
              {agencies.length === 0 && (
                <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#9a948a]">
                  <p className="text-sm text-white">Aun no hay inmobiliarias cargadas.</p>
                  <p className="mt-1">Sumate y destacate en el carrusel principal.</p>
                  <Link
                    className="mt-3 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                    to="/registro"
                  >
                    Crear perfil inmobiliaria
                  </Link>
                </div>
              )}
            </div>
          </div>
        </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">Resultados</h3>
            <p className="text-xs text-[#9a948a]">Ordenados por relevancia y actualizacion.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9a948a]">Vista</span>
            <button
              className={
                viewMode === "list"
                  ? "rounded-full border border-white/30 px-3 py-1 text-xs text-white"
                  : "rounded-full border border-white/15 px-3 py-1 text-xs text-[#9a948a]"
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
            <button
              className={
                viewMode === "grid"
                  ? "rounded-full border border-white/30 px-3 py-1 text-xs text-white"
                  : "rounded-full border border-white/15 px-3 py-1 text-xs text-[#9a948a]"
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
        <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9a948a]">
          <div>
            Pagina {page} de {totalPages}
          </div>
          <div className="flex items-center gap-2">
            <span>Por pagina</span>
            <select
              className="rounded-full border border-white/15 bg-night-900/60 px-3 py-1 text-xs text-white"
              value={pageSize}
              onChange={(event) => {
                const next = Number(event.target.value);
                setPageSize(next);
                setPage(1);
              }}
            >
              <option value={5}>5</option>
              <option value={9}>9</option>
              <option value={15}>15</option>
            </select>
          </div>
        </div>
        {listStatus === "loading" && (
          <p className="text-xs text-[#9a948a]">Cargando publicaciones...</p>
        )}
        {listStatus === "error" && (
          <p className="text-xs text-[#f5b78a]">{listError}</p>
        )}
        {listStatus === "idle" && listings.length === 0 && (
          <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#9a948a]">
            <p className="text-sm text-white">No hay publicaciones activas.</p>
            <p className="mt-1">
              Podes ser el primero en publicar o crear una cuenta para recibir alertas.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Link
                className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                to="/publicar"
              >
                Publicar inmueble
              </Link>
              <Link
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
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
            : listings.map((item) => (
                <article
                  key={item.id}
                  onMouseEnter={() => prefetchDetail(item.id)}
                  onFocus={() => prefetchDetail(item.id)}
                  className={
                    viewMode === "grid"
                      ? "glass-card flex h-full flex-col overflow-hidden"
                      : "glass-card grid gap-5 p-5 md:grid-cols-[220px_1fr]"
                  }
                >
                  <div
                    className={
                      viewMode === "grid"
                        ? "flex flex-col"
                        : "flex flex-col gap-3"
                    }
                  >
                    <img
                      className={
                        viewMode === "grid"
                          ? "h-44 w-full rounded-t-2xl object-cover"
                          : "h-40 w-full rounded-2xl object-cover"
                      }
                      src={item.image}
                      alt={item.title}
                      loading="lazy"
                      decoding="async"
                    />
                    <div
                      className={
                        viewMode === "grid"
                          ? "mt-3 flex w-full gap-2"
                          : "mt-3 flex flex-wrap gap-2"
                      }
                    >
                      <button
                        className={
                          viewMode === "grid"
                            ? "flex-1 rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                            : "rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                        }
                        type="button"
                        onClick={() => openModal(item)}
                        onMouseEnter={() => prefetchDetail(item.id)}
                      >
                        Ver ficha
                      </button>
                      <button
                        className={
                          viewMode === "grid"
                            ? "flex-1 rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                            : "rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                        }
                        type="button"
                        onClick={() => openModal(item)}
                      >
                        WhatsApp
                      </button>
                    </div>
                  </div>
                  <div className={viewMode === "grid" ? "space-y-3 p-5" : "space-y-4"}>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h3 className="text-lg text-white">{item.title}</h3>
                        <p className="text-sm text-[#9a948a]">{item.address}</p>
                      </div>
                      <div className="flex flex-col items-end gap-2">
                        <span className="text-sm font-semibold text-white">{item.price}</span>
                        <span className="rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                          {item.operation}
                        </span>
                      </div>
                    </div>
                    {item.agency ? (
                      <p className="text-sm font-semibold text-white">Inmobiliaria: {item.agency}</p>
                    ) : (
                      <p className="text-sm font-semibold text-white">Dueno directo</p>
                    )}
                    <p className="text-sm text-[#9a948a]">{item.description}</p>
                    {item.expensesAmount && (
                      <p className="text-xs text-[#9a948a]">
                        Expensas: {item.expensesAmount}
                      </p>
                    )}
                    {item.financingLabel && (
                      <p className="text-xs text-[#9a948a]">
                        Financia: {item.financingLabel}
                      </p>
                    )}
                    {viewMode === "list" && (
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#9a948a]">
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
                          Cochera: {item.garage ? "Si" : "No"}
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
                          Mascotas: {item.pets ? "Si" : "No"}
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
                          Ninos: {item.kids ? "Si" : "No"}
                        </span>
                      </div>
                    )}
                    {viewMode === "grid" && (
                      <div className="flex flex-wrap gap-3 text-xs text-[#9a948a]">
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
                          Cochera: {item.garage ? "Si" : "No"}
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
                          Mascotas: {item.pets ? "Si" : "No"}
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
                          Ninos: {item.kids ? "Si" : "No"}
                        </span>
                      </div>
                    )}
                  </div>
                </article>
              ))}
        </div>
        <div className="flex items-center justify-between text-xs text-[#9a948a]">
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || listStatus === "loading"}
          >
            Anterior
          </button>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || listStatus === "loading"}
          >
            Siguiente
          </button>
        </div>
      </section>

      {selectedListing && (
        <PropertyDetailModal
          listing={selectedListing}
          onClose={closeModal}
          isLoading={detailStatus === "loading"}
          actions={
            <>
              <button
                className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900"
                type="button"
                onClick={() => {
                  if (whatsappLink) {
                    window.open(whatsappLink, "_blank", "noopener,noreferrer");
                  } else {
                    setContactStatus("error");
                    setContactMessage("No hay WhatsApp disponible en esta publicacion.");
                  }
                }}
              >
                WhatsApp
              </button>
              <button
                className="rounded-full border border-white/20 px-5 py-2 text-xs text-[#c7c2b8]"
                type="button"
                onClick={() => handleContactRequest("INTEREST")}
                disabled={contactStatus === "loading"}
              >
                Me interesa
              </button>
              <button
                className="rounded-full border border-white/20 px-5 py-2 text-xs text-[#c7c2b8]"
                type="button"
                onClick={() => handleContactRequest("VISIT")}
                disabled={contactStatus === "loading"}
              >
                Reservar visita
              </button>
              {contactMessage && (
                <span className="text-xs text-[#9a948a]">{contactMessage}</span>
              )}
              {similarListings.length > 0 && (
                <div className="mt-4 w-full space-y-2 text-xs text-[#9a948a]">
                  <div className="text-sm text-white">Publicaciones similares</div>
                  <div className="grid gap-2 md:grid-cols-2">
                    {similarListings.slice(0, 2).map((item) => (
                      <button
                        key={item.id}
                        className="rounded-xl border border-white/10 bg-night-900/60 p-3 text-left"
                        type="button"
                        onClick={() => openModal(item)}
                      >
                        <div className="text-sm text-white">{item.title}</div>
                        <div className="text-xs text-[#9a948a]">{item.address}</div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          }
        />
      )}
    </div>
  );
}
