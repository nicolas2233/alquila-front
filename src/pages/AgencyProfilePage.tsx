import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import { env } from "../shared/config/env";
import type { PropertyApiDetail, PropertyApiListItem, SearchListing } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing, mapPropertyToSearchListing } from "../shared/properties/propertyMappers";
import { fetchJson } from "../shared/api/http";

const agencies = [
  {
    slug: "bragado-realty",
    name: "Bragado Realty",
    description:
      "Equipo local con foco en operaciones verificadas y respuesta rapida en Bragado.",
    address: "Av. Alsina 245, Bragado",
    phone: "2342 444-222",
    whatsapp: "+54 9 2342 555 000",
    email: "contacto@bragado-realty.com",
    website: "www.bragadorealty.com",
    instagram: "@bragado.realty",
    logo: "BR",
    agents: [
      { name: "Lucia Perez", role: "Broker", contact: "lucia@bragado.com" },
      { name: "Martin Salas", role: "Ventas", contact: "martin@bragado.com" },
    ],
    listings: [
      {
        id: "a1",
        title: "Casa 3 ambientes con patio",
        price: "ARS 180.000",
        address: "Mitre 123",
        operation: "Alquiler",
        rooms: 3,
        areaM2: 120,
        garage: true,
        pets: true,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "Publicacion sin duplicados. Contacto directo por WhatsApp con el propietario.",
        descriptionLong:
          "Casa luminosa con patio, galeria y cocina integrada. Ambientes amplios, ventilacion cruzada y buena orientacion.",
        image:
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "a2",
        title: "Depto 2 ambientes luminoso",
        price: "USD 65.000",
        address: "Sarmiento 845",
        operation: "Venta",
        rooms: 2,
        areaM2: 65,
        garage: false,
        pets: false,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "Ubicacion central, verificacion completa y disponibilidad inmediata.",
        descriptionLong:
          "Departamento con excelente luz natural, living comedor integrado y balcon. Ideal para primera vivienda o inversion.",
        image:
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "a3",
        title: "Terreno con acceso directo",
        price: "ARS 95.000",
        address: "Ruta 5 Km 207",
        operation: "Venta",
        rooms: 0,
        areaM2: 450,
        garage: false,
        pets: true,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "Ideal para desarrollo, con documentacion catastral validada.",
        descriptionLong:
          "Lote con acceso directo, listo para proyecto residencial. Superficie regular y buen entorno.",
        image:
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    slug: "la-plaza-propiedades",
    name: "La Plaza Propiedades",
    description:
      "Inmobiliaria boutique con foco en ventas residenciales y alquileres temporarios.",
    address: "Plaza Central 22, Bragado",
    phone: "2342 400-111",
    whatsapp: "+54 9 2342 222 444",
    email: "hola@laplaza.com",
    website: "www.laplaza.com",
    instagram: "@laplaza.propiedades",
    logo: "LP",
    agents: [
      { name: "Julieta Rios", role: "Broker", contact: "julieta@laplaza.com" },
      { name: "Diego Moran", role: "Atencion", contact: "diego@laplaza.com" },
    ],
    listings: [
      {
        id: "b1",
        title: "Casa quinta con pileta",
        price: "USD 120.000",
        address: "Los Tilos 950",
        operation: "Venta",
        rooms: 4,
        areaM2: 220,
        garage: true,
        pets: true,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "Casa quinta con pileta, quincho y parque amplio.",
        descriptionLong:
          "Casa quinta con pileta, quincho completo y parque amplio. Ideal para fines de semana.",
        image:
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "b2",
        title: "PH moderno en el centro",
        price: "ARS 140.000",
        address: "Belgrano 340",
        operation: "Alquiler",
        rooms: 2,
        areaM2: 70,
        garage: false,
        pets: false,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "PH moderno con patio interno, listo para ingresar.",
        descriptionLong:
          "PH moderno con patio interno, cocina integrada y buena ubicacion en el centro.",
        image:
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

export function AgencyProfilePage() {
  const { slug } = useParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [selectedListing, setSelectedListing] =
    useState<PropertyDetailListing | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading">("idle");
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

  const fallbackAgency = useMemo(
    () => agencies.find((item) => item.slug === slug),
    [slug]
  );
  const agency = agencyData ?? fallbackAgency;
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
        } else if (fallbackAgency) {
          setListings(
            fallbackAgency.listings.map((item) => ({
              ...item,
              propertyType: "Propiedad",
            })) as SearchListing[]
          );
          setListingStatus("error");
        } else {
          setListings([]);
          setListingStatus("error");
        }
      } catch {
        if (ignore) return;
        if (controller.signal.aborted) return;
        if (fallbackAgency) {
          setListings(
            fallbackAgency.listings.map((item) => ({
              ...item,
              propertyType: "Propiedad",
            })) as SearchListing[]
          );
        }
        setListingStatus("error");
      }
    };
    void loadListings();
    return () => {
      ignore = true;
      controller.abort();
    };
  }, [fallbackAgency, listingsUrl, slug]);

  const openModal = (listing: SearchListing) => {
    setSelectedListing(listing);
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
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/15 text-xl font-semibold text-gold-400">
              {agency?.logo ??
                agency?.name
                  ?.split(" ")
                  .slice(0, 2)
                  .map((part) => part.charAt(0))
                  .join("")}
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
            {fallbackAgency?.agents?.length ? (
              fallbackAgency.agents.map((agent) => (
                <div
                  key={agent.name}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-night-900/60 px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-white">{agent.name}</p>
                    <p className="text-xs text-[#9a948a]">{agent.role}</p>
                  </div>
                  <span className="text-xs text-[#9a948a]">{agent.contact}</span>
                </div>
              ))
            ) : (
              <p className="text-xs text-[#9a948a]">Equipo no disponible.</p>
            )}
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
            <p className="text-xs text-[#9a948a]">Cargando publicaciones...</p>
          )}
          {listingStatus === "error" && listings.length === 0 && (
            <p className="text-xs text-[#f5b78a]">No hay publicaciones activas.</p>
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
                <div
                  className={
                    viewMode === "grid"
                      ? "h-44 w-full bg-cover bg-center"
                      : "h-40 rounded-2xl bg-cover bg-center"
                  }
                  style={{ backgroundImage: `url('${listing.image}')` }}
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
                    Ninos: {listing.kids ? "Si" : "No"}
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
            actions={
              <>
                <button className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900">
                  WhatsApp
                </button>
                <button className="rounded-full border border-white/20 px-5 py-2 text-xs text-[#c7c2b8]">
                  Guardar
                </button>
              </>
            }
          />
        )}
    </div>
  );
}
