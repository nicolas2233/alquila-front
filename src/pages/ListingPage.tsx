import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { env } from "../shared/config/env";
import type { PropertyApiDetail } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing } from "../shared/properties/propertyMappers";
import { buildWhatsappLink } from "../shared/utils/whatsapp";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import { getSessionUser, getToken } from "../shared/auth/session";

export function ListingPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const token = useMemo(() => getToken(), []);
  const [status, setStatus] = useState<"loading" | "error" | "idle">("loading");
  const [error, setError] = useState("");
  const [property, setProperty] = useState<PropertyApiDetail | null>(null);

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

  const listing = useMemo(
    () => (property ? mapPropertyToDetailListing(property) : null),
    [property]
  );
  const contactMethods =
    property?.contactMethods ?? ([] as PropertyApiDetail["contactMethods"]);

  if (!sessionUser) {
    return (
      <div className="glass-card space-y-4 p-6">
        <h2 className="text-xl text-white">Necesitas una cuenta</h2>
        <p className="text-sm text-[#9a948a]">
          Inicia sesión para ver la ficha completa de la propiedad.
        </p>
        <button
          className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900"
          type="button"
          onClick={() => navigate("/login")}
        >
          Ir a login
        </button>
      </div>
    );
  }

  if (status === "loading") {
    return <p className="text-xs text-[#9a948a]">Cargando publicación...</p>;
  }
  if (status === "error" || !listing) {
    return <p className="text-xs text-[#f5b78a]">{error || "No encontrada."}</p>;
  }

  const handleReportProperty = async (reason: string) => {
    const response = await fetch(`${env.apiUrl}/properties/${listing.id}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, reporterUserId: sessionUser?.id }),
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

  return (
    <PropertyDetailModal
      listing={listing}
      variant="page"
      onReportProperty={handleReportProperty}
      onReportUser={listing.ownerUserId ? handleReportUser : undefined}
      actions={
        <div className="flex flex-wrap gap-3">
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
                  className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                  href={link}
                  target="_blank"
                  rel="noreferrer"
                >
                  WhatsApp
                </a>
              );
            }
            if (contact.type === "PHONE") {
              return (
                <a
                  key={contact.id}
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                  href={`tel:${contact.value}`}
                >
                  Llamar
                </a>
              );
            }
            return null;
          })}
        </div>
      }
    />
  );
}
