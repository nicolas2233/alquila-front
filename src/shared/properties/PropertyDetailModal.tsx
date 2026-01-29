import { useState } from "react";

export type PropertyDetailListing = {
  title: string;
  address: string;
  price: string;
  operation: string;
  areaM2: number;
  rooms: number;
  bathrooms?: number;
  bedrooms?: number;
  garage: boolean;
  pets: boolean;
  kids: boolean;
  descriptionLong: string;
  images: string[];
  agency?: string | null;
  propertyType?: string;
  amenities?: string[];
  expensesAmount?: string;
  financing?: {
    available: boolean;
    amount?: string;
  };
  services?: {
    electricity?: boolean;
    gas?: boolean;
    water?: boolean;
    sewer?: boolean;
    internet?: boolean;
    pavement?: boolean;
  };
};

type PropertyDetailModalProps = {
  listing: PropertyDetailListing;
  onClose: () => void;
  actions?: React.ReactNode;
  isLoading?: boolean;
};

export function PropertyDetailModal({
  listing,
  onClose,
  actions,
  isLoading = false,
}: PropertyDetailModalProps) {
  const [activeImage, setActiveImage] = useState(0);
  const images = listing.images.length ? listing.images : [];
  const hasImages = images.length > 0;
  const activeImageUrl = hasImages ? images[activeImage] : null;
  const amenities = listing.amenities ?? [];
  const services = listing.services ?? {};
  const serviceLabels = [
    { key: "electricity", label: "Luz" },
    { key: "gas", label: "Gas" },
    { key: "water", label: "Agua" },
    { key: "sewer", label: "Cloaca" },
    { key: "internet", label: "Internet" },
    { key: "pavement", label: "Asfalto" },
  ] as const;
  const amenityLabels: Record<string, string> = {
    AIR_CONDITIONING: "Aire acondicionado",
    HEATER: "Estufa",
    KITCHEN: "Cocina",
    GRILL: "Parrilla",
    POOL: "Pileta",
    JACUZZI: "Hidromasaje",
    SOLARIUM: "Solarium",
    ELEVATOR: "Ascensor",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
      <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-night-900/95 shadow-card">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-xl text-white">{listing.title}</h3>
            <p className="text-sm text-[#9a948a]">{listing.address}</p>
          </div>
          <button
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="relative overflow-hidden rounded-2xl">
              {activeImageUrl ? (
                <img
                  className="h-72 w-full object-cover"
                  src={activeImageUrl}
                  alt={listing.title}
                />
              ) : (
                <div className="flex h-72 items-center justify-center bg-night-900/60 text-xs text-[#9a948a]">
                  Sin fotos cargadas
                </div>
              )}
              {images.length > 1 && (
                <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
                  <button
                    className="rounded-full border border-white/30 bg-night-900/80 px-3 py-1 text-xs text-white"
                    type="button"
                    onClick={() =>
                      setActiveImage((prev) =>
                        prev === 0 ? images.length - 1 : prev - 1
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
                        prev === images.length - 1 ? 0 : prev + 1
                      )
                    }
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
            {images.length > 1 && (
              <div className="flex gap-2">
                {images.map((img, index) => (
                  <button
                    key={img}
                    className={
                      index === activeImage
                        ? "h-14 w-20 overflow-hidden rounded-xl border border-gold-400/60"
                        : "h-14 w-20 overflow-hidden rounded-xl border border-white/10"
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
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-white">{listing.price}</p>
                <span className="mt-2 inline-flex rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                  {listing.operation}
                </span>
              </div>
              <span className="text-sm text-[#9a948a]">{listing.areaM2} m2</span>
            </div>
            <p className="text-sm text-[#9a948a]">{listing.descriptionLong}</p>
            {isLoading && (
              <p className="text-xs text-[#9a948a] animate-pulse">
                Cargando detalles...
              </p>
            )}
            <div className="grid gap-2 text-xs text-[#9a948a]">
              <div>Ambientes: {listing.rooms > 0 ? listing.rooms : "Sin ambientes"}</div>
              {listing.bathrooms !== undefined && (
                <div>Banos: {listing.bathrooms}</div>
              )}
              {listing.bedrooms !== undefined && (
                <div>Dormitorios: {listing.bedrooms}</div>
              )}
              {listing.expensesAmount && <div>Expensas: {listing.expensesAmount}</div>}
              {listing.financing?.available && (
                <div>
                  Financia: {listing.financing.amount ? listing.financing.amount : "Si"}
                </div>
              )}
              <div>Cochera: {listing.garage ? "Si" : "No"}</div>
              <div>Mascotas: {listing.pets ? "Si" : "No"}</div>
              <div>Ninos: {listing.kids ? "Si" : "No"}</div>
              {listing.agency !== undefined && (
                <div>{listing.agency ? `Inmobiliaria: ${listing.agency}` : "Dueno directo"}</div>
              )}
            </div>
            {!isLoading && (amenities.length > 0 || Object.values(services).some(Boolean)) && (
              <div className="space-y-2 text-xs text-[#9a948a]">
                {amenities.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {amenities.map((amenity) => (
                      <span
                        key={amenity}
                        className="rounded-full border border-white/10 px-3 py-1"
                      >
                        {amenityLabels[amenity] ?? amenity}
                      </span>
                    ))}
                  </div>
                )}
                {Object.values(services).some(Boolean) && (
                  <div className="flex flex-wrap gap-2">
                    {serviceLabels
                      .filter((service) => services[service.key])
                      .map((service) => (
                        <span
                          key={service.key}
                          className="rounded-full border border-white/10 px-3 py-1"
                        >
                          {service.label}
                        </span>
                      ))}
                  </div>
                )}
              </div>
            )}
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
