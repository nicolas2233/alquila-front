import { lazy, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { env } from "../shared/config/env";
import type { PropertyApiDetail } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing } from "../shared/properties/propertyMappers";
import { buildWhatsappLink } from "../shared/utils/whatsapp";
import { LazySection } from "../shared/ui/LazySection";
import { getSessionUser, getToken } from "../shared/auth/session";
import { hasSentContactRequest, markContactRequestSent } from "../shared/utils/contactRequests";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { useSeo } from "../shared/seo/useSeo";

const PropertyDetailModal = lazy(() =>
  import("../shared/properties/PropertyDetailModal").then((m) => ({
    default: m.PropertyDetailModal,
  }))
);

const interestMessagePresets = [
  { id: "interes", label: "Me interesa", text: "Me interesa." },
  { id: "contactame", label: "Contactame", text: "Contactame por favor." },
  { id: "mas-info", label: "Quiero mas info", text: "Quiero mas info." },
] as const;

export function ListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const token = useMemo(() => getToken(), []);
  const [status, setStatus] = useState<"loading" | "error" | "idle">("loading");
  const [error, setError] = useState("");
  const [property, setProperty] = useState<PropertyApiDetail | null>(null);
  const [contactStatus, setContactStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [contactMessage, setContactMessage] = useState("");
  const [interestPresetId, setInterestPresetId] = useState<(typeof interestMessagePresets)[number]["id"]>(
    "interes"
  );
  const [interestPresetOpen, setInterestPresetOpen] = useState(false);
  const interestPopoverRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!id) {
      setStatus("error");
      setError("Publicacion no encontrada.");
      return;
    }
    let ignore = false;
    const load = async () => {
      setStatus("loading");
      setError("");
      try {
        const response = await fetch(`${env.apiUrl}/properties/${id}`);
        if (!response.ok) {
          throw new Error("No pudimos cargar la publicacion.");
        }
        const data = (await response.json()) as PropertyApiDetail;
        if (ignore) return;
        setProperty(data);
        setStatus("idle");
      } catch (err) {
        if (ignore) return;
        setStatus("error");
        setError(err instanceof Error ? err.message : "Error al cargar.");
      }
    };
    void load();
    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    if (!interestPresetOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node | null;
      if (!interestPopoverRef.current || !target) return;
      if (!interestPopoverRef.current.contains(target)) {
        setInterestPresetOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
    };
  }, [interestPresetOpen]);

  const listing = useMemo(
    () => (property ? mapPropertyToDetailListing(property) : null),
    [property]
  );
  useSeo({
    title: listing ? `${listing.operation} ${listing.propertyType} en Bragado` : "Ficha de inmueble",
    description: property
      ? `${property.title}. ${property.description || "Propiedad en Bragado"}`
          .replace(/\s+/g, " ")
          .trim()
          .slice(0, 160)
      : "Detalle de inmueble en DomusBrag.",
    canonicalPath: id ? `/publicacion/${id}` : "/publicacion",
    image: property?.photos?.[0]?.url,
    type: "article",
    noindex: false,
    structuredData:
      property && listing
        ? {
            "@context": "https://schema.org",
            "@type": "Offer",
            name: property.title,
            description: property.description,
            url:
              typeof window !== "undefined"
                ? `${window.location.origin}/publicacion/${property.id}`
                : undefined,
            price: String(property.priceAmount),
            priceCurrency: property.priceCurrency,
            itemOffered: {
              "@type": "Residence",
              name: `${listing.propertyType} en Bragado`,
              address: {
                "@type": "PostalAddress",
                streetAddress: property.location.addressLine,
                addressLocality: property.location.locality?.name ?? "Bragado",
                addressCountry: "AR",
              },
            },
            image: property.photos?.map((photo) => photo.url) ?? undefined,
          }
        : undefined,
  });
  const contactMethods = property?.contactMethods ?? ([] as PropertyApiDetail["contactMethods"]);
  const alreadySentInterest = listing
    ? hasSentContactRequest({ propertyId: listing.id, type: "INTEREST" })
    : false;
  const isOwnListing = useMemo(() => {
    if (!listing || !sessionUser) return false;
    if (sessionUser.role === "OWNER") {
      return listing.ownerUserId === sessionUser.id;
    }
    if (sessionUser.role.startsWith("AGENCY")) {
      return listing.agencyId === sessionUser.agencyId;
    }
    return false;
  }, [listing, sessionUser]);

  if (!sessionUser) {
    return (
      <div className="glass-card space-y-4 p-6">
        <h2 className="text-xl text-white">Necesitas una cuenta</h2>
        <p className="text-sm text-[#D1C7BD]">
          Inicia sesión para ver la ficha completa de la propiedad.
        </p>
        <button
          className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-5 py-2 text-xs font-semibold text-night-900"
          type="button"
          onClick={() => navigate("/login")}
        >
          Ir a login
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return <p className="text-xs text-[#D1C7BD]">Cargando publicacion...</p>;
  }
  if (status === "error" || !listing) {
    return <p className="text-xs text-[#AF8C5C]">{error || "No encontrada."}</p>;
  }

  const handleReportProperty = async (reason: string) => {
    if (!token) {
      throw new Error("Inicia sesión para reportar.");
    }
    const response = await fetch(`${env.apiUrl}/properties/${listing.id}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      throw new Error("No pudimos enviar el reporte.");
    }
  };

  const handleReportUser = async (reason: string) => {
    if (!listing.ownerUserId || !token) {
      throw new Error("No pudimos enviar el reporte.");
    }
    const response = await fetch(`${env.apiUrl}/users/${listing.ownerUserId}/report`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ reason }),
    });
    if (!response.ok) {
      throw new Error("No pudimos enviar el reporte.");
    }
  };

  const handleInterest = async () => {
    if (!token) {
      setContactStatus("error");
      setContactMessage("Inicia sesión para enviar la solicitud.");
      addToast("Inicia sesión para enviar la solicitud.", "warning");
      setInterestPresetOpen(false);
      navigate("/login");
      return;
    }
    if (isOwnListing) {
      setContactStatus("error");
      setContactMessage("No puedes enviar solicitudes a tus propias publicaciones.");
      addToast("No puedes enviar solicitudes a tus propias publicaciones.", "warning");
      setInterestPresetOpen(false);
      return;
    }
    if (alreadySentInterest) {
      setContactStatus("success");
      setContactMessage("Ya enviaste una solicitud para esta publicacion.");
      addToast("Ya enviaste una solicitud para esta publicacion.", "info");
      setInterestPresetOpen(false);
      return;
    }
    setContactStatus("loading");
    setContactMessage("Enviando solicitud...");
    try {
      const selectedPreset =
        interestMessagePresets.find((preset) => preset.id === interestPresetId) ??
        interestMessagePresets[0];
      const requesterName = sessionUser.name ?? sessionUser.email ?? "un interesado";
      const response = await fetch(`${env.apiUrl}/properties/${listing.id}/contact-requests`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          type: "INTEREST",
          message: `Hola, soy ${requesterName}. ${selectedPreset.text}`,
        }),
      });
      if (!response.ok) {
        throw new Error("No pudimos enviar la solicitud.");
      }
      markContactRequestSent({ propertyId: listing.id, type: "INTEREST" });
      setContactStatus("success");
      setContactMessage("Solicitud enviada correctamente.");
      setInterestPresetOpen(false);
      addToast("Solicitud enviada correctamente.", "success");
    } catch (interestError) {
      const message =
        interestError instanceof Error
          ? interestError.message
          : "No pudimos enviar la solicitud.";
      setContactStatus("error");
      setContactMessage(message);
      addToast(message, "error");
    }
  };

  return (
    <LazySection fallback={<div className="h-12" />}>
      <PropertyDetailModal
        listing={listing}
        variant="page"
        onReportProperty={handleReportProperty}
        onReportUser={listing.ownerUserId ? handleReportUser : undefined}
        actions={
          <div className="grid w-full gap-2 sm:flex sm:flex-wrap sm:gap-3">
            {contactMethods?.map((contact) => {
              if (contact.type === "WHATSAPP") {
                const message = `Hola, me interesa "${listing.title}". Link: ${
                  window.location.origin
                }/publicacion/${property?.id ?? ""}`;
                const link = buildWhatsappLink(contact.value, message);
                if (!link) {
                  return null;
                }
                return (
                  <a
                    key={contact.id}
                    className="inline-flex w-full items-center justify-center gap-1.5 rounded-full border border-[#25D366]/40 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-2 text-xs font-semibold text-white transition hover:brightness-110 sm:w-auto"
                    href={link}
                    target="_blank"
                    rel="noreferrer"
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
                  </a>
                );
              }
              if (contact.type === "PHONE") {
                return (
                  <a
                    key={contact.id}
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] sm:w-auto"
                    href={`tel:${contact.value}`}
                  >
                    Llamar
                  </a>
                );
              }
              return null;
            })}
            <div ref={interestPopoverRef} className="relative w-full sm:w-auto">
              <button
                type="button"
                className="w-full rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
                onClick={() => {
                  if (contactStatus === "loading" || alreadySentInterest || isOwnListing) return;
                  setInterestPresetOpen((prev) => !prev);
                }}
                disabled={contactStatus === "loading" || alreadySentInterest || isOwnListing}
              >
                Me interesa
              </button>
              {interestPresetOpen && !alreadySentInterest && !isOwnListing ? (
                <div className="mt-2 w-full rounded-2xl border border-white/10 bg-night-900/95 p-3 shadow-card sm:absolute sm:left-0 sm:top-full sm:z-20 sm:mt-2 sm:min-w-[300px] sm:w-[320px]">
                  <div className="mb-2 text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                    Mensaje rápido
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {interestMessagePresets.map((preset) => (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setInterestPresetId(preset.id)}
                        className={
                          preset.id === interestPresetId
                            ? "rounded-full border border-gold-400/45 bg-gold-500/12 px-3 py-1.5 text-xs text-gold-100"
                            : "rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-[#E7E2DD]"
                        }
                        disabled={contactStatus === "loading"}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-[#D1C7BD]"
                      onClick={() => setInterestPresetOpen(false)}
                      disabled={contactStatus === "loading"}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-3 py-1.5 text-xs font-semibold text-night-900 disabled:opacity-70"
                      onClick={() => void handleInterest()}
                      disabled={contactStatus === "loading"}
                    >
                      {contactStatus === "loading" ? "Enviando..." : "Enviar"}
                    </button>
                  </div>
                </div>
              ) : null}
            </div>
            {contactMessage ? (
              <div
                className={
                  contactStatus === "success"
                    ? "w-full text-xs text-emerald-300"
                    : "w-full text-xs text-[#D1C7BD]"
                }
              >
                {contactMessage}
              </div>
            ) : null}
          </div>
        }
      />
    </LazySection>
  );
}
