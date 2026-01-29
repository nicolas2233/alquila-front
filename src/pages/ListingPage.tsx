import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { env } from "../shared/config/env";
import type { PropertyApiDetail } from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing } from "../shared/properties/propertyMappers";

export function ListingPage() {
  const { id } = useParams();
  const [status, setStatus] = useState<"loading" | "error" | "idle">("loading");
  const [error, setError] = useState("");
  const [property, setProperty] = useState<PropertyApiDetail | null>(null);
  const [activeImage, setActiveImage] = useState(0);

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
  const photos = property?.photos ?? [];
  const contactMethods =
    property?.contactMethods ?? ([] as PropertyApiDetail["contactMethods"]);
  const imagePool =
    photos.length > 0 ? photos.map((photo) => photo.url) : listing?.images ?? [];
  const safeActiveIndex =
    activeImage >= imagePool.length ? 0 : Math.max(activeImage, 0);

  if (status === "loading") {
    return <p className="text-xs text-[#9a948a]">Cargando publicacion...</p>;
  }
  if (status === "error" || !listing) {
    return <p className="text-xs text-[#f5b78a]">{error || "No encontrada."}</p>;
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">{listing.title}</h2>
          <p className="text-sm text-[#9a948a]">
            {listing.address} - {listing.price} - {listing.areaM2} m2
          </p>
        </div>
        <span className="gold-pill">{listing.operation}</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-2xl">
              {imagePool[safeActiveIndex] ? (
                <img
                  className="h-72 w-full object-cover"
                  src={imagePool[safeActiveIndex]}
                  alt={listing.title}
                />
              ) : (
                <div className="flex h-72 items-center justify-center bg-night-900/60 text-xs text-[#9a948a]">
                  Sin fotos cargadas
                </div>
              )}
              {imagePool.length > 1 && (
                <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
                  <button
                    className="rounded-full border border-white/30 bg-night-900/80 px-3 py-1 text-xs text-white"
                    type="button"
                    onClick={() =>
                      setActiveImage((prev) =>
                        prev === 0 ? imagePool.length - 1 : prev - 1
                      )
                    }
                  >
                    Anterior
                  </button>
                  <button
                    className="rounded-full border border-white/30 bg-night-900/80 px-3 py-1 text-xs text-white"
                    type="button"
                    onClick={() =>
                      setActiveImage((prev) =>
                        prev === imagePool.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
            {imagePool.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {imagePool.map((img, index) => (
                  <button
                    key={`${img}-${index}`}
                    className={
                      index === safeActiveIndex
                        ? "h-16 w-24 overflow-hidden rounded-xl border border-gold-400/60"
                        : "h-16 w-24 overflow-hidden rounded-xl border border-white/10"
                    }
                    type="button"
                    onClick={() => setActiveImage(index)}
                  >
                    <img className="h-full w-full object-cover" src={img} alt="" />
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="glass-card p-5">
            <h3 className="text-lg text-white">Descripcion</h3>
            <p className="mt-2 text-sm text-[#9a948a]">{listing.descriptionLong}</p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-lg text-white">Contacto</h3>
            <p className="mt-2 text-sm text-[#9a948a]">
              Contacto directo con el propietario o la inmobiliaria.
            </p>
            <div className="mt-4 flex flex-wrap gap-3">
              {contactMethods?.map((contact) => {
                if (contact.type === "WHATSAPP") {
                  const phone = contact.value.replace(/[^0-9]/g, "");
                  return (
                    <a
                      key={contact.id}
                      className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                      href={`https://wa.me/${phone}`}
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
          </div>
          <div className="glass-card p-5">
            <h3 className="text-lg text-white">Detalles</h3>
            <p className="mt-2 text-sm text-[#9a948a]">
              {listing.rooms > 0 ? `${listing.rooms} ambientes` : "Sin ambientes"} ? {" "}
              {listing.bedrooms ? `${listing.bedrooms} dormitorios` : "Sin dormitorios"}
            </p>
            {listing.expensesAmount && (
              <p className="mt-2 text-xs text-[#9a948a]">
                Expensas: {listing.expensesAmount}
              </p>
            )}
            {listing.financing?.available && (
              <p className="mt-2 text-xs text-[#9a948a]">
                Financia: {listing.financing.amount ?? "Si"}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
