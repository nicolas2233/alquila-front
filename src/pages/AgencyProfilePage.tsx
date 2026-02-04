import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import { env } from "../shared/config/env";
import type { PropertyApiDetail, PropertyApiListItem, SearchListing } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing, mapPropertyToSearchListing } from "../shared/properties/propertyMappers";
import { fetchJson } from "../shared/api/http";
import { getSessionUser, getToken } from "../shared/auth/session";
import { buildWhatsappLink } from "../shared/utils/whatsapp";
import { hasSentContactRequest, markContactRequestSent } from "../shared/utils/contactRequests";
import { useToast } from "../shared/ui/toast/ToastProvider";

export function AgencyProfilePage() {
  const { slug } = useParams();
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [selectedListing, setSelectedListing] =
    useState<PropertyDetailListing | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading">("idle");
  const [contactStatus, setContactStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [contactMessage, setContactMessage] = useState("");
  const [similarListings, setSimilarListings] = useState<SearchListing[]>([]);
  const sessionUser = useMemo(() => getSessionUser(), []);
  const [agencyData, setAgencyData] = useState<{
    id: string;
    name: string;
    description?: string | null;
    address?: string | null;
    phone?: string | null;
    whatsapp?: string | null;
    email?: string | null;
    website?: string | null;
    instagram?: string | null;
    logo?: string | null;
  } | null>(null);
  const [agencyStatus, setAgencyStatus] = useState<"idle" | "loading" | "error">(
    "loading"
  );
  const [listings, setListings] = useState<SearchListing[]>([]);
  const [listingStatus, setListingStatus] = useState<"idle" | "loading" | "error">(
    "loading"
  );
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);
  const [total, setTotal] = useState(0);
  const detailCacheRef = useRef(new Map<string, PropertyDetailListing>());

  const agency = agencyData;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const agencyUrl = useMemo(
    () => (slug ? `${env.apiUrl}/agencies/${slug}` : ""),
    [slug]
  );
  const listingsUrl = useMemo(
    () =>
      slug
        ? `${env.apiUrl}/properties?agencyId=${slug}&status=ACTIVE&page=${page}&pageSize=${pageSize}`
        : "",
    [slug, page, pageSize]
  );

  useEffect(() => {
    if (!slug) {
      return;
    }
    let ignore = false;
    const controller = new AbortController();
    const loadAgency = async () => {
      setAgencyStatus("loading");
      try {
        const data = await fetchJson<{
          id: string;
          name: string;
          about?: string | null;
          address?: string | null;
          phone?: string | null;
          whatsapp?: string | null;
          email?: string | null;
          website?: string | null;
          instagram?: string | null;
          logo?: string | null;
        }>(agencyUrl, {
          cacheKey: agencyUrl,
          ttlMs: 60_000,
          signal: controller.signal,
        });
        if (ignore) return;
        setAgencyData({
          id: data.id,
          name: data.name,
          description: data.about ?? null,
          address: data.address ?? null,
          phone: data.phone ?? null,
          whatsapp: data.whatsapp ?? null,
          email: data.email ?? null,
          website: data.website ?? null,
          instagram: data.instagram ?? null,
          logo: data.logo ?? null,
        });
        setAgencyStatus("idle");
      } catch {
        if (ignore) return;
        if (controller.signal.aborted) return;
        setAgencyStatus("error");
      }
    };
    void loadAgency();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [agencyUrl, slug]);

  useEffect(() => {
    if (!slug) {
      return;
    }
    let ignore = false;
    const controller = new AbortController();
    const loadListings = async () => {
      setListingStatus("loading");
      try {
        const data = await fetchJson<{
          items: PropertyApiListItem[];
          total: number;
        }>(listingsUrl, {
          cacheKey: listingsUrl,
          ttlMs: 15_000,
          signal: controller.signal,
        });
        if (ignore) return;
        if (data.items.length) {
          setListings(data.items.map(mapPropertyToSearchListing));
          setTotal(data.total ?? data.items.length);
          setListingStatus("idle");
        } else {
          setListings([]);
          setListingStatus("idle");
        }
      } catch {
        if (ignore) return;
        if (controller.signal.aborted) return;
        setListings([]);
        setListingStatus("error");
      }
    };
    void loadListings();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [listingsUrl, slug]);

  const openModal = (listing: SearchListing) => {
    setSelectedListing(listing);
    setContactStatus("idle");
    setContactMessage("");
    const cached = detailCacheRef.current.get(listing.id);
    if (cached) {
      setSelectedListing(cached);
      setDetailStatus("idle");
      return;
    }
    setDetailStatus("loading");
    fetchJson<PropertyApiDetail>(
      `${env.apiUrl}/properties/${listing.id}`,
      {
        cacheKey: `${env.apiUrl}/properties/${listing.id}`,
        ttlMs: 30_000,
      }
    )
      .then((data) => mapPropertyToDetailListing(data))
      .then((mapped) => {
        detailCacheRef.current.set(listing.id, mapped);
        setSelectedListing(mapped);
      })
      .catch(() => {
        // keep preview
      })
      .finally(() => {
        setDetailStatus("idle");
      });
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
      selectedListing.id ? `${window.location.origin}/publicación/${selectedListing.id}` : ""
    }`;
    return buildWhatsappLink(method.value, message);
  }, [selectedListing]);

  const isOwnListing = useMemo(() => {
    if (!selectedListing || !sessionUser) {
      return false;
    }
    if (sessionUser.role === "OWNER") {
      return selectedListing.ownerUserId === sessionUser.id;
    }
    if (sessionUser.role.startsWith("AGENCY")) {
      return selectedListing.agencyId === sessionUser.agencyId;
    }
    return false;
  }, [selectedListing, sessionUser]);

  const handleContactRequest = async (type: "INTEREST" | "VISIT") => {
    if (!selectedListing) {
      return;
    }
    if (hasSentContactRequest({ propertyId: selectedListing.id, type })) {
      setContactStatus("success");
      setContactMessage("Ya enviaste una solicitud para esta publicación.");
      addToast("Ya enviaste una solicitud para esta publicación.", "info");
      return;
    }
    if (isOwnListing) {
      setContactStatus("error");
      setContactMessage("No puedes enviar solicitudes a tus propias publicaciónes.");
      addToast("No puedes enviar solicitudes a tus propias publicaciónes.", "warning");
      return;
    }
    if (contactStatus === "loading") {
      return;
    }
    const token = getToken();
    if (!token) {
      setContactStatus("error");
      setContactMessage("Inicia sesión para enviar la solicitud.");
      addToast("Inicia sesión para enviar la solicitud.", "warning");
      return;
    }
    setContactStatus("loading");
    setContactMessage("Enviando solicitud...");
    try {
      const response = await fetch(`${env.apiUrl}/properties/${selectedListing.id}/contact-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type,
          message: (() => {
            const author = sessionUser?.name ?? sessionUser?.email ?? "Un interesado";
            return `Hola, soy ${author}. Estoy interesado en "${selectedListing.title}".`;
          })(),
        }),
      });
      if (!response.ok) {
        throw new Error("No pudimos enviar la solicitud.");
      }
      setContactStatus("success");
      setContactMessage("Solicitud enviada. Te contactaremos pronto.");
      addToast("Solicitud enviada correctamente.", "success");
      markContactRequestSent({ propertyId: selectedListing.id, type });
      void loadSimilar();
    } catch (error) {
      setContactStatus("error");
      setContactMessage(
        error instanceof Error ? error.message : "No pudimos enviar la solicitud."
      );
      addToast(
        error instanceof Error ? error.message : "No pudimos enviar la solicitud.",
        "error"
      );
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
    if (!selectedListing?.ownerUserId) {
      throw new Error("No pudimos enviar el reporte.");
    }
    const token = getToken();
    if (!token) {
      addToast("Inicia sesión para reportar.", "warning");
      throw new Error("No token");
    }
    const response = await fetch(
      `${env.apiUrl}/users/${selectedListing.ownerUserId}/report`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ reason }),
      }
    );
    if (!response.ok) {
      throw new Error("No pudimos enviar el reporte.");
    }
  };

  const loadSimilar = async () => {
    const base = selectedListing;
    if (!base) {
      return;
    }
    try {
      const params = new URLSearchParams();
      if (base.operation) {
        params.set(
          "operationType",
          base.operation === "Venta"
            ? "SALE"
            : base.operation === "Alquiler"
            ? "RENT"
            : base.operation === "Temporario"
            ? "TEMPORARY"
            : ""
        );
      }
      if (base.propertyType) {
        params.set(
          "propertyType",
          base.propertyType === "Casa"
            ? "HOUSE"
            : base.propertyType === "Departamento"
            ? "APARTMENT"
            : base.propertyType === "Terreno"
            ? "LAND"
            : base.propertyType === "Campo"
            ? "FIELD"
            : base.propertyType === "Quinta"
            ? "QUINTA"
            : base.propertyType === "Comercio"
            ? "COMMERCIAL"
            : base.propertyType === "Oficina"
            ? "OFFICE"
            : base.propertyType === "Galpon" || base.propertyType === "Deposito"
            ? "WAREHOUSE"
            : ""
        );
      }
      params.set("status", "ACTIVE");
      params.set("page", "1");
      params.set("pageSize", "3");
      const response = await fetch(`${env.apiUrl}/properties?${params.toString()}`);
      if (!response.ok) return;
      const data = (await response.json()) as { items: PropertyApiListItem[] };
      const mapped = data.items.map(mapPropertyToSearchListing);
      setSimilarListings(mapped.filter((item) => item.id !== base.id));
    } catch {
      // ignore
    }
  };

  if (!agency && agencyStatus === "error") {
    return (
      <div className="space-y-2">
        <h2 className="text-3xl text-white">Agencia no encontrada</h2>
        <p className="text-sm text-[#9a948a]">
          No pudimos encontrar la agencia solicitada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-start gap-4">
            <div
              className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-2xl bg-gold-500/15 text-xl font-semibold text-gold-400"
              title={agency?.name ?? "Inmobiliaria"}
            >
              {agency?.logo && (agency.logo.startsWith("http") || agency.logo.startsWith("data:")) ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={agency.logo}
                  alt={agency.name ?? "Logo"}
                  className="h-16 w-16 object-cover"
                />
              ) : (
                (agency?.name ?? "I")
                  .split(" ")
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join("")
              )}
            </div>
            <div>
              <h2 className="text-3xl text-white">{agency?.name ?? "Inmobiliaria"}</h2>
              <p className="text-sm text-[#9a948a]">{agency?.description}</p>
            </div>
          </div>
          {agencyStatus === "loading" && (
            <p className="text-xs text-[#9a948a]">Cargando datos...</p>
          )}
          <div className="grid gap-3 text-sm text-[#c7c2b8]">
            <div>Direccion: {agency?.address ?? "-"}</div>
            <div>Telefono: {agency?.phone ?? "-"}</div>
            <div>WhatsApp: {agency?.whatsapp ?? "-"}</div>
            <div>Email: {agency?.email ?? "-"}</div>
            <div>Web: {agency?.website ?? "-"}</div>
            <div>Instagram: {agency?.instagram ?? "-"}</div>
          </div>
        </div>
        <div className="glass-card space-y-4 p-6">
          <h3 className="text-lg text-white">Equipo</h3>
          <div className="space-y-3">
            <p className="text-xs text-[#9a948a]">Equipo no disponible.</p>
          </div>
        </div>
      </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Propiedades publicadas</h3>
              <p className="text-xs text-[#9a948a]">
                {listings.length} inmuebles activos
              </p>
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
          {listingStatus === "loading" && (
            <p className="text-xs text-[#9a948a]">Cargando publicaciónes...</p>
          )}
          {listingStatus === "error" && listings.length === 0 && (
            <p className="text-xs text-[#f5b78a]">No hay publicaciónes activas.</p>
          )}
          {listingStatus === "idle" && listings.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#9a948a]">
              <p className="text-sm text-white">No hay publicaciónes activas.</p>
              <p className="mt-1">Explora otras opciones o publica un inmueble.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                  to="/publicar"
                >
                  Publicar inmueble
                </Link>
                <Link
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                  to="/buscar"
                >
                  Ver otras publicaciónes
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
          {listings.map((listing) => (
            <article
              key={listing.id}
              onMouseEnter={() => {
                if (!detailCacheRef.current.has(listing.id)) {
                  fetchJson<PropertyApiDetail>(`${env.apiUrl}/properties/${listing.id}`, {
                    cacheKey: `${env.apiUrl}/properties/${listing.id}`,
                    ttlMs: 30_000,
                  })
                    .then((data) => {
                      const mapped = mapPropertyToDetailListing(data);
                      detailCacheRef.current.set(listing.id, mapped);
                    })
                    .catch(() => {
                      // ignore prefetch failures
                    });
                }
              }}
              onFocus={() => {
                if (!detailCacheRef.current.has(listing.id)) {
                  fetchJson<PropertyApiDetail>(`${env.apiUrl}/properties/${listing.id}`, {
                    cacheKey: `${env.apiUrl}/properties/${listing.id}`,
                    ttlMs: 30_000,
                  })
                    .then((data) => {
                      const mapped = mapPropertyToDetailListing(data);
                      detailCacheRef.current.set(listing.id, mapped);
                    })
                    .catch(() => {
                      // ignore prefetch failures
                    });
                }
              }}
              className={
                viewMode === "grid"
                  ? "glass-card flex h-full flex-col overflow-hidden"
                  : "glass-card grid gap-5 p-5 md:grid-cols-[220px_1fr]"
              }
            >
              <div className={viewMode === "grid" ? "flex flex-col" : "flex flex-col gap-3"}>
                <img
                  className={
                    viewMode === "grid"
                      ? "h-44 w-full rounded-t-2xl object-cover"
                      : "h-40 w-full rounded-2xl object-cover"
                  }
                  src={listing.image}
                  alt={listing.title}
                  sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 90vw"
                  loading="lazy"
                  decoding="async"
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                    type="button"
                    onClick={() => openModal(listing)}
                    onMouseEnter={() => {
                      if (!detailCacheRef.current.has(listing.id)) {
                        fetchJson<PropertyApiDetail>(
                          `${env.apiUrl}/properties/${listing.id}`,
                          {
                            cacheKey: `${env.apiUrl}/properties/${listing.id}`,
                            ttlMs: 30_000,
                          }
                        )
                          .then((data) => {
                            const mapped = mapPropertyToDetailListing(data);
                            detailCacheRef.current.set(listing.id, mapped);
                          })
                          .catch(() => {
                            // ignore prefetch failures
                          });
                      }
                    }}
                  >
                    Ver ficha
                  </button>
                  <button
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                    type="button"
                    onClick={() => openModal(listing)}
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
              <div className={viewMode === "grid" ? "space-y-3 p-5" : "space-y-4"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg text-white">{listing.title}</h4>
                    <p className="text-sm text-[#9a948a]">{listing.address}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-white">{listing.price}</span>
                    <span className="rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                      {listing.operation}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#9a948a]">{listing.description}</p>
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
                    {listing.rooms > 0 ? `${listing.rooms} ambientes` : "Sin ambientes"}
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
                    {listing.areaM2} m2
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
                    Cochera: {listing.garage ? "Si" : "No"}
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
                    Mascotas: {listing.pets ? "Si" : "No"}
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
                    Niños: {listing.kids ? "Si" : "No"}
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-[#9a948a]">
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || listingStatus === "loading"}
          >
            Anterior
          </button>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || listingStatus === "loading"}
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
            onReportProperty={handleReportProperty}
            onReportUser={selectedListing.ownerUserId ? handleReportUser : undefined}
            actions={
              <>
              <button
                className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900"
                type="button"
                onClick={() => {
                  if (isOwnListing) {
                    setContactStatus("error");
                    setContactMessage("No puedes contactar tus propias publicaciónes.");
                    addToast("No puedes contactar tus propias publicaciónes.", "warning");
                    return;
                  }
                  if (whatsappLink) {
                    window.open(whatsappLink, "_blank", "noopener,noreferrer");
                  } else {
                      setContactStatus("error");
                      setContactMessage("No hay WhatsApp disponible en esta publicacion.");
                      addToast("No hay WhatsApp disponible en esta publicacion.", "warning");
                    }
                  }}
                >
                  WhatsApp
                </button>
                <button
                  className="rounded-full border border-white/20 px-5 py-2 text-xs text-[#c7c2b8]"
                type="button"
                onClick={() => handleContactRequest("INTEREST")}
                disabled={
                  contactStatus !== "idle" ||
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
