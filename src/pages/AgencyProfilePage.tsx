import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapContainer, TileLayer, CircleMarker } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import { env } from "../shared/config/env";
import type { PropertyApiDetail, PropertyApiListItem, SearchListing } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing, mapPropertyToSearchListing } from "../shared/properties/propertyMappers";
import { fetchJson } from "../shared/api/http";
import { getSessionUser } from "../shared/auth/session";
import { buildWhatsappLink } from "../shared/utils/whatsapp";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { useSeo } from "../shared/seo/useSeo";

const normalizeExternalUrl = (value?: string | null) => {
  if (!value) return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) {
    return trimmed;
  }
  return `https://${trimmed}`;
};

const hexToRgb = (value?: string | null): [number, number, number] => {
  const fallback: [number, number, number] = [75, 112, 231];
  if (!value) return fallback;
  const hex = value.trim().replace("#", "");
  if (!/^[0-9A-Fa-f]{3}([0-9A-Fa-f]{3})?$/.test(hex)) return fallback;
  const normalized =
    hex.length === 3 ? hex.split("").map((char) => `${char}${char}`).join("") : hex;
  const numeric = Number.parseInt(normalized, 16);
  return [(numeric >> 16) & 255, (numeric >> 8) & 255, numeric & 255];
};

type SocialIconType = "WEB" | "IG" | "FB";

const renderSocialIcon = (icon: SocialIconType) => {
  if (icon === "WEB") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18" />
      </svg>
    );
  }
  if (icon === "IG") {
    return (
      <svg
        aria-hidden="true"
        className="h-4 w-4"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
      >
        <rect x="3.5" y="3.5" width="17" height="17" rx="5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.5" cy="6.5" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  return (
    <svg
      aria-hidden="true"
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M13 9V6.5c0-.8.7-1.5 1.5-1.5H17V2h-2.6A4.4 4.4 0 0 0 10 6.4V9H7v3h3v10h3V12h3l.8-3z" />
    </svg>
  );
};

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

export function AgencyProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
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
    facebook?: string | null;
    logo?: string | null;
    heroColor?: string | null;
    heroImage?: string | null;
    heroImagePosition?: string | null;
    heroImageOpacity?: number | null;
    contactCardColor?: string | null;
    contactCardOpacity?: number | null;
    lat?: number | null;
    lng?: number | null;
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
          facebook?: string | null;
          logo?: string | null;
          heroColor?: string | null;
          heroImage?: string | null;
          heroImagePosition?: string | null;
          heroImageOpacity?: number | null;
          contactCardColor?: string | null;
          contactCardOpacity?: number | null;
          lat?: number | null;
          lng?: number | null;
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
          facebook: data.facebook ?? null,
          logo: data.logo ?? null,
          heroColor: data.heroColor ?? null,
          heroImage: data.heroImage ?? null,
          heroImagePosition: data.heroImagePosition ?? "center",
          heroImageOpacity: typeof data.heroImageOpacity === "number" ? data.heroImageOpacity : 45,
          contactCardColor: data.contactCardColor ?? null,
          contactCardOpacity:
            typeof data.contactCardOpacity === "number" ? data.contactCardOpacity : 35,
          lat: typeof data.lat === "number" ? data.lat : null,
          lng: typeof data.lng === "number" ? data.lng : null,
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
    navigate(`/publicacion/${listing.id}`);
  };

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

  const handleCardWhatsapp = async (listing: SearchListing) => {
    if (!sessionUser) {
      addToast("Inicia sesión para contactar por WhatsApp.", "warning");
      navigate("/login");
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
    } catch {
      addToast("No pudimos abrir WhatsApp.", "error");
    }
  };

  if (!agency && agencyStatus === "error") {
    return (
      <div className="space-y-2">
        <h2 className="text-3xl text-white">Agencia no encontrada</h2>
        <p className="text-sm text-[#D1C7BD]">
          No pudimos encontrar la agencia solicitada.
        </p>
      </div>
    );
  }

  const hasLogoImage =
    Boolean(agency?.logo) &&
    (agency?.logo?.startsWith("http") || agency?.logo?.startsWith("data:"));
  const heroColor = agency?.heroColor?.trim() || "#4b70e7";
  const [heroR, heroG, heroB] = hexToRgb(heroColor);
  const contactCardColor = agency?.contactCardColor?.trim() || heroColor;
  const [cardR, cardG, cardB] = hexToRgb(contactCardColor);
  const contactCardOpacity = Math.max(
    0,
    Math.min(100, typeof agency?.contactCardOpacity === "number" ? agency.contactCardOpacity : 35)
  );
  const hasHeroImage =
    Boolean(agency?.heroImage) &&
    (agency?.heroImage?.startsWith("http") || agency?.heroImage?.startsWith("data:"));
  const heroImagePosition =
    agency?.heroImagePosition === "top" ||
    agency?.heroImagePosition === "center" ||
    agency?.heroImagePosition === "bottom"
      ? agency.heroImagePosition
      : "center";
  const heroImageOpacity = Math.max(
    0,
    Math.min(100, typeof agency?.heroImageOpacity === "number" ? agency.heroImageOpacity : 45)
  );
  const heroObjectPosition =
    heroImagePosition === "top"
      ? "center top"
      : heroImagePosition === "bottom"
      ? "center bottom"
      : "center center";
  const websiteUrl = normalizeExternalUrl(agency?.website);
  const instagramUrl = normalizeExternalUrl(agency?.instagram);
  const facebookUrl = normalizeExternalUrl(agency?.facebook);
  const socialLinks = [
    { key: "website", label: "Sitio web", url: websiteUrl, icon: "WEB" as const },
    { key: "instagram", label: "Instagram", url: instagramUrl, icon: "IG" as const },
    { key: "facebook", label: "Facebook", url: facebookUrl, icon: "FB" as const },
  ].filter(
    (
      item
    ): item is { key: string; label: string; url: string; icon: SocialIconType } =>
      Boolean(item.url)
  );
  const agencyInitials = (agency?.name ?? "I")
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("");
  useSeo({
    title: agency?.name ? `${agency.name} | Inmobiliaria en Bragado` : "Perfil de inmobiliaria",
    description: agency?.description?.trim()
      ? agency.description.trim().slice(0, 160)
      : "Perfil público de inmobiliaria en Bragado con propiedades activas y datos de contacto.",
    canonicalPath: slug ? `/agencia/${slug}` : "/agencia",
    image: agency?.logo ?? agency?.heroImage ?? undefined,
    noindex: false,
    structuredData: agency
      ? {
          "@context": "https://schema.org",
          "@type": "RealEstateAgent",
          name: agency.name,
          image: agency.logo ?? agency.heroImage ?? undefined,
          description: agency.description ?? undefined,
          telephone: agency.phone ?? undefined,
          email: agency.email ?? undefined,
          address: agency.address
            ? {
                "@type": "PostalAddress",
                streetAddress: agency.address,
                addressLocality: "Bragado",
                addressCountry: "AR",
              }
            : undefined,
          sameAs: [agency.website, agency.instagram, agency.facebook].filter(Boolean),
          url:
            typeof window !== "undefined" && slug
              ? `${window.location.origin}/agencia/${slug}`
              : undefined,
        }
      : undefined,
  });

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="relative isolate -mx-2 -mt-4 md:-mt-8 md:mx-0">
        <div
          className="pointer-events-none absolute -inset-x-8 -inset-y-6 rounded-[56px] blur-3xl opacity-80"
          style={{
            background: `radial-gradient(circle at 50% 10%, rgba(${heroR}, ${heroG}, ${heroB}, 0.35), transparent 58%)`,
          }}
        />
        <div
          className="relative min-h-[300px] overflow-hidden rounded-[30px] bg-[#030a1f]/92 ring-1 ring-white/10 md:min-h-[360px] md:rounded-[40px]"
          style={{ boxShadow: `0 28px 90px rgba(${heroR}, ${heroG}, ${heroB}, 0.35)` }}
        >
          {hasHeroImage ? (
            <img
              src={agency?.heroImage ?? ""}
              alt={`Hero de ${agency?.name ?? "inmobiliaria"}`}
              className="absolute inset-0 h-full w-full object-cover"
              style={{
                objectPosition: heroObjectPosition,
                opacity: heroImageOpacity / 100,
              }}
            />
          ) : null}
          <div
            className="absolute inset-0"
            style={{
              background: `radial-gradient(circle at 50% 18%, rgba(${heroR}, ${heroG}, ${heroB}, 0.26), transparent 45%), radial-gradient(circle at 50% 100%, rgba(${heroR}, ${heroG}, ${heroB}, 0.35), transparent 58%)`,
            }}
          />
          <div className="absolute inset-0 bg-[radial-gradient(rgba(141,170,255,0.11)_1px,transparent_1px)] [background-size:18px_18px] opacity-30" />
          <div
            className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b to-transparent"
            style={{ backgroundImage: `linear-gradient(to bottom, rgba(${heroR}, ${heroG}, ${heroB}, 0.18), transparent)` }}
          />
          <div
            className="absolute -left-20 bottom-[-120px] h-[280px] w-[380px] rounded-full blur-3xl"
            style={{ backgroundColor: `rgba(${heroR}, ${heroG}, ${heroB}, 0.25)` }}
          />
          <div
            className="absolute -right-20 bottom-[-120px] h-[280px] w-[380px] rounded-full blur-3xl"
            style={{ backgroundColor: `rgba(${heroR}, ${heroG}, ${heroB}, 0.25)` }}
          />
          <div
            className="absolute left-1/2 top-[34%] h-40 w-40 -translate-x-1/2 rounded-full blur-3xl"
            style={{ backgroundColor: `rgba(${heroR}, ${heroG}, ${heroB}, 0.22)` }}
          />

          <div className="relative flex h-full flex-col justify-between gap-6 p-5 md:gap-8 md:p-10">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div
                className="inline-flex items-center rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#d5e0ff]"
                style={{
                  border: `1px solid rgba(${heroR}, ${heroG}, ${heroB}, 0.45)`,
                  backgroundColor: `rgba(${heroR}, ${heroG}, ${heroB}, 0.2)`,
                }}
              >
                Perfil inmobiliaria
              </div>
              {agencyStatus === "loading" ? (
                <span className="text-xs text-[#bfcdf8]">Cargando datos...</span>
              ) : null}
            </div>

            <div className="mx-auto max-w-3xl space-y-4 text-center">
              <div
                className="mx-auto flex w-fit items-center gap-3 rounded-full px-4 py-2 backdrop-blur-sm"
                style={{
                  border: `1px solid rgba(${heroR}, ${heroG}, ${heroB}, 0.35)`,
                  backgroundColor: `rgba(${heroR}, ${heroG}, ${heroB}, 0.18)`,
                }}
              >
                <div
                  className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-xl text-sm font-semibold text-[#d7e2ff]"
                  style={{
                    border: `1px solid rgba(${heroR}, ${heroG}, ${heroB}, 0.4)`,
                    backgroundColor: `rgba(${heroR}, ${heroG}, ${heroB}, 0.25)`,
                  }}
                  title={agency?.name ?? "Inmobiliaria"}
                >
                  {hasLogoImage ? (
                    <img
                      src={agency?.logo ?? ""}
                      alt={agency?.name ?? "Logo"}
                      className="h-10 w-10 object-cover"
                    />
                  ) : (
                    agencyInitials
                  )}
                </div>
                <span className="text-sm font-medium text-[#d7e2ff]">Inmobiliaria verificada local</span>
              </div>
              <h2 className="text-3xl font-semibold leading-tight text-white md:text-5xl">
                {agency?.name ?? "Inmobiliaria"}
              </h2>
              <p className="mx-auto max-w-2xl text-sm text-[#d5def6] md:text-base">
                {agency?.description?.trim() || "Gestión de propiedades en Bragado con atención personalizada."}
              </p>
              {socialLinks.length > 0 ? (
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {socialLinks.map((item) => (
                    <a
                      key={item.key}
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium text-[#e2e9ff] transition hover:brightness-110"
                      style={{
                        border: `1px solid rgba(${heroR}, ${heroG}, ${heroB}, 0.4)`,
                        backgroundColor: `rgba(${heroR}, ${heroG}, ${heroB}, 0.16)`,
                      }}
                      title={item.label}
                    >
                      {renderSocialIcon(item.icon)}
                      <span>{item.label}</span>
                    </a>
                  ))}
                </div>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div
                className="rounded-2xl p-3 text-xs text-[#d7e2ff] backdrop-blur-sm"
                style={{
                  border: `1px solid rgba(${cardR}, ${cardG}, ${cardB}, 0.45)`,
                  backgroundColor: `rgba(${cardR}, ${cardG}, ${cardB}, ${contactCardOpacity / 100})`,
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#aac0ff]">Contacto</p>
                <p className="mt-1">{agency?.phone || agency?.whatsapp || "-"}</p>
              </div>
              <div
                className="rounded-2xl p-3 text-xs text-[#d7e2ff] backdrop-blur-sm"
                style={{
                  border: `1px solid rgba(${cardR}, ${cardG}, ${cardB}, 0.45)`,
                  backgroundColor: `rgba(${cardR}, ${cardG}, ${cardB}, ${contactCardOpacity / 100})`,
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#aac0ff]">Ubicación</p>
                <p className="mt-1 line-clamp-1">{agency?.address || "-"}</p>
              </div>
              <div
                className="rounded-2xl p-3 text-xs text-[#d7e2ff] backdrop-blur-sm"
                style={{
                  border: `1px solid rgba(${cardR}, ${cardG}, ${cardB}, 0.45)`,
                  backgroundColor: `rgba(${cardR}, ${cardG}, ${cardB}, ${contactCardOpacity / 100})`,
                }}
              >
                <p className="text-[10px] uppercase tracking-[0.12em] text-[#aac0ff]">Canales</p>
                <p className="mt-1 line-clamp-1">
                  {agency?.email || agency?.website || agency?.instagram || "-"}
                </p>
              </div>
            </div>
            {typeof agency?.lat === "number" && typeof agency?.lng === "number" && (
              <div className="rounded-2xl border border-white/15 bg-night-900/45 p-3">
                <p className="mb-2 text-[10px] uppercase tracking-[0.12em] text-[#aac0ff]">
                  Ubicacion exacta
                </p>
                <div className="overflow-hidden rounded-xl border border-white/10">
                  <MapContainer
                    center={[agency.lat, agency.lng]}
                    zoom={15}
                    className="h-44 w-full"
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <CircleMarker
                      center={[agency.lat, agency.lng]}
                      radius={8}
                      pathOptions={{ color: "#f4d19a", fillColor: "#AF8C5C", fillOpacity: 0.95 }}
                    />
                  </MapContainer>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

        <section className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Propiedades publicadas</h3>
              <p className="text-xs text-[#D1C7BD]">
                {listings.length} inmuebles activos
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden text-xs text-[#D1C7BD] sm:inline">Vista</span>
              <button
                className={
                  viewMode === "list"
                    ? "rounded-full border border-white/30 px-3 py-1 text-xs text-white"
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
              <button
                className={
                  viewMode === "grid"
                    ? "rounded-full border border-white/30 px-3 py-1 text-xs text-white"
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
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#D1C7BD]">
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
            <p className="text-xs text-[#D1C7BD]">Cargando publicaciones...</p>
          )}
          {listingStatus === "error" && listings.length === 0 && (
            <p className="text-xs text-[#AF8C5C]">No hay publicaciones activas.</p>
          )}
          {listingStatus === "idle" && listings.length === 0 && (
            <div className="rounded-2xl border border-white/10 bg-night-900/48 p-4 text-xs text-[#D1C7BD]">
              <p className="text-sm text-white">No hay publicaciones activas.</p>
              <p className="mt-1">Explora otras opciones o publica un inmueble.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link
                  className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                  to="/publicar"
                >
                  Publicar inmueble
                </Link>
                <Link
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                  to="/buscar"
                >
                  Ver otras publicaciones
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
              onMouseEnter={() => prefetchDetail(listing.id)}
              onFocus={() => prefetchDetail(listing.id)}
              className={
                viewMode === "grid"
                  ? "glass-card flex h-full min-h-[470px] flex-col overflow-hidden"
                  : "glass-card overflow-hidden md:grid md:min-h-[218.67px] md:grid-cols-[260px_minmax(0,1fr)_210px]"
              }
            >
              {viewMode === "list" ? (
                <>
                  <div className="relative h-44 md:h-[218.67px]">
                    <img
                      className="h-full w-full object-cover"
                      src={listing.image}
                      alt={listing.title}
                      sizes="(min-width: 1024px) 320px, (min-width: 768px) 45vw, 90vw"
                      loading="lazy"
                      decoding="async"
                    />
                    <span
                      className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${getImageOperationBadgeClass(
                        listing.operation
                      )}`}
                    >
                      {listing.operation}
                    </span>
                  </div>
                  <div className="min-w-0 p-3 md:p-4 md:pr-2">
                    <div className="flex h-full flex-col gap-2 overflow-hidden">
                      <div>
                        <h4 className="line-clamp-1 text-xl text-white">{listing.title}</h4>
                        <p className="line-clamp-1 text-sm text-[#D1C7BD]">{listing.address}</p>
                      </div>
                      <p className="line-clamp-1 text-sm text-[#D1C7BD]">
                        {listing.description?.trim() ? listing.description : "Sin descripción."}
                      </p>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-[#D1C7BD]">
                        <span className="inline-flex items-center gap-2">
                          {renderFeatureIcon("rooms")}
                          {listing.rooms > 0 ? `${listing.rooms} ambientes` : "Sin ambientes"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          {renderFeatureIcon("area")}
                          {listing.areaM2} m2
                        </span>
                        <span className="inline-flex items-center gap-2">
                          {renderFeatureIcon("garage")}
                          Cochera: {listing.garage ? "Sí" : "No"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          {renderFeatureIcon("pets")}
                          Mascotas: {listing.pets ? "Sí" : "No"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          {renderFeatureIcon("kids")}
                          Niños: {listing.kids ? "Sí" : "No"}
                        </span>
                      </div>
                    </div>
                  </div>
                  <aside className="flex h-full flex-col gap-2 p-3 md:pl-1 md:pr-3">
                    <div className="w-full rounded-xl border border-white/15 bg-night-900/55 px-2 py-1.5 shadow-[0_8px_18px_rgba(0,0,0,0.2)]">
                      <div className="text-[8px] uppercase tracking-[0.1em] text-[#D1C7BD]">
                        Precio
                      </div>
                      <div className="mt-0.5 text-[1.45rem] font-semibold leading-none text-white">
                        {listing.price}
                      </div>
                    </div>
                    <div className="mt-auto flex flex-wrap gap-1.5 md:flex-nowrap md:justify-end">
                      <button
                        className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-3 py-1.5 text-[11px] font-semibold text-night-900"
                        type="button"
                        onClick={() => openModal(listing)}
                        onMouseEnter={() => prefetchDetail(listing.id)}
                      >
                        Ver ficha
                      </button>
                      <button
                        className="inline-flex items-center gap-1 rounded-full border border-[#25D366]/40 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-3 py-1.5 text-[11px] font-semibold text-white transition hover:brightness-110"
                        type="button"
                        onClick={() => void handleCardWhatsapp(listing)}
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
                </>
              ) : (
                (() => {
                  const gridFeatures = [
                    {
                      key: "rooms",
                      icon: "rooms" as FeatureIconName,
                      label: listing.rooms > 0 ? `${listing.rooms} ambientes` : "Sin ambientes",
                    },
                    {
                      key: "area",
                      icon: "area" as FeatureIconName,
                      label: `${listing.areaM2} m2`,
                    },
                    {
                      key: "garage",
                      icon: "garage" as FeatureIconName,
                      label: listing.garage ? "Cochera" : "Sin cochera",
                    },
                    listing.pets
                      ? { key: "pets", icon: "pets" as FeatureIconName, label: "Mascotas permitidas" }
                      : null,
                    listing.kids
                      ? { key: "kids", icon: "kids" as FeatureIconName, label: "Apto niños" }
                      : null,
                  ].filter(
                    (feature): feature is { key: string; icon: FeatureIconName; label: string } =>
                      feature !== null
                  );
                  const visibleGridFeatures = gridFeatures.slice(0, 3);
                  const extraGridFeatures = gridFeatures.length - visibleGridFeatures.length;
                  return (
                    <>
                      <div className="relative h-44">
                        <img
                          className="h-full w-full rounded-t-2xl object-cover"
                          src={listing.image}
                          alt={listing.title}
                          sizes="(min-width: 1280px) 33vw, (min-width: 768px) 50vw, 92vw"
                          loading="lazy"
                          decoding="async"
                        />
                        <span
                          className={`absolute left-3 top-3 rounded-full px-3 py-1 text-xs font-semibold shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${getImageOperationBadgeClass(
                            listing.operation
                          )}`}
                        >
                          {listing.operation}
                        </span>
                        <span className="absolute bottom-3 right-3 rounded-full bg-white px-3 py-1 text-sm font-semibold text-[#1A1613] shadow-[0_10px_24px_rgba(0,0,0,0.35)]">
                          {listing.price}
                        </span>
                      </div>
                      <div className="flex flex-1 flex-col p-4">
                        <div className="min-w-0">
                          <h4 className="line-clamp-1 text-xl text-white">{listing.title}</h4>
                          <p className="line-clamp-1 text-sm text-[#D1C7BD]">{listing.address}</p>
                        </div>
                        <p className="mt-3 min-h-[2.7rem] text-sm text-[#D1C7BD] line-clamp-2">
                          {listing.description?.trim() ? listing.description : "Sin descripción."}
                        </p>
                        <div className="mt-3 flex min-h-[72px] flex-wrap content-start gap-2 text-xs text-[#D1C7BD]">
                          {visibleGridFeatures.map((feature) => (
                            <span
                              key={`${listing.id}-${feature.key}`}
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
                        <div className="mt-auto grid grid-cols-2 gap-2 pt-4">
                          <button
                            className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                            type="button"
                            onClick={() => openModal(listing)}
                            onMouseEnter={() => prefetchDetail(listing.id)}
                          >
                            Ver ficha
                          </button>
                          <button
                            className="inline-flex items-center justify-center gap-1.5 rounded-full border border-[#25D366]/40 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110"
                            type="button"
                            onClick={() => void handleCardWhatsapp(listing)}
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
                    </>
                  );
                })()
              )}
            </article>
          ))}
        </div>
        <div className="flex items-center justify-between gap-2 text-xs text-[#D1C7BD]">
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
            type="button"
            onClick={() => setPage((prev) => Math.max(1, prev - 1))}
            disabled={page <= 1 || listingStatus === "loading"}
          >
            Anterior
          </button>
          <span className="rounded-full border border-white/10 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[#D1C7BD]">
            Pagina {page}/{totalPages}
          </span>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
            type="button"
            onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
            disabled={page >= totalPages || listingStatus === "loading"}
          >
            Siguiente
          </button>
        </div>
      </section>
    </div>
  );
}







