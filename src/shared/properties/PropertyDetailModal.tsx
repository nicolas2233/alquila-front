import { useState } from "react";
import { CircleMarker, MapContainer, TileLayer } from "react-leaflet";

export type PropertyDetailListing = {
  id: string;
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
  ownerUserId?: string | null;
  agencyId?: string | null;
  propertyType?: string;
  amenities?: string[];
  expensesAmount?: string;
  financing?: {
    available: boolean;
    amount?: string;
  };
  rentalRequirements?: {
    guarantees?: string;
    entryMonths?: number;
    contractDurationMonths?: number;
    indexFrequency?: string;
    indexType?: string;
    indexValue?: number;
    isPublic?: boolean;
  };
  contactMethods?: { type: "WHATSAPP" | "PHONE" | "IN_APP"; value: string }[];
  services?: {
    electricity?: boolean;
    gas?: boolean;
    water?: boolean;
    sewer?: boolean;
    internet?: boolean;
    pavement?: boolean;
  };
  lat?: number | null;
  lng?: number | null;
  showMapLocation?: boolean;
};

type PropertyDetailModalProps = {
  listing: PropertyDetailListing;
  onClose?: () => void;
  actions?: React.ReactNode;
  isLoading?: boolean;
  variant?: "modal" | "page";
  onReportProperty?: (reason: string) => Promise<void> | void;
  onReportUser?: (reason: string) => Promise<void> | void;
};

export function PropertyDetailModal({
  listing,
  onClose,
  actions,
  isLoading = false,
  variant = "modal",
  onReportProperty,
  onReportUser,
}: PropertyDetailModalProps) {
  const isModal = variant !== "page";
  const [activeImage, setActiveImage] = useState(0);
  const [reportTarget, setReportTarget] = useState<"PROPERTY" | "USER" | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [reportStatus, setReportStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [reportMessage, setReportMessage] = useState("");
  const images = listing.images.length ? listing.images : [];
  const hasImages = images.length > 0;
  const activeImageUrl = hasImages ? images[activeImage] : null;
  const amenities = listing.amenities ?? [];
  const services = listing.services ?? {};
  const rentalRequirements = listing.rentalRequirements;
  const hasMapLocation =
    listing.showMapLocation !== false &&
    typeof listing.lat === "number" &&
    Number.isFinite(listing.lat) &&
    typeof listing.lng === "number" &&
    Number.isFinite(listing.lng);
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
    PRIVATE_SECURITY: "Seguridad privada",
    SECURITY_CAMERAS: "Camaras de seguridad",
  };
  const rentalFrequencyLabels: Record<string, string> = {
    MONTHLY: "Mensual",
    QUARTERLY: "Trimestral",
    SEMI_ANNUAL: "Semestral",
    ANNUAL: "Anual",
  };
  const rentalIndexLabels: Record<string, string> = {
    IPC: "IPC",
    UVA: "UVA",
    INFLATION: "Inflación",
    OTHER: "Otro",
  };

  const openReport = (target: "PROPERTY" | "USER") => {
    setReportTarget(target);
    setReportReason("");
    setReportStatus("idle");
    setReportMessage("");
  };

  const submitReport = async () => {
    if (!reportTarget) return;
    const reason = reportReason.trim();
    if (!reason) {
      setReportStatus("error");
      setReportMessage("Contanos el motivo del reporte.");
      return;
    }
    const handler = reportTarget === "PROPERTY" ? onReportProperty : onReportUser;
    if (!handler) {
      setReportStatus("error");
      setReportMessage("No pudimos enviar el reporte.");
      return;
    }
    try {
      setReportStatus("loading");
      await handler(reason);
      setReportStatus("success");
      setReportMessage("Reporte enviado.");
    } catch {
      setReportStatus("error");
      setReportMessage("No pudimos enviar el reporte.");
    }
  };

  return (
    <div
      className={
        isModal
          ? "fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-0 py-0 sm:px-4 sm:py-8"
          : "w-full"
      }
    >
      <div
        className={
          isModal
            ? "w-full max-w-4xl h-screen overflow-y-auto rounded-none border border-white/10 bg-night-900/95 shadow-card sm:h-[calc(100vh-2rem)] sm:rounded-3xl md:max-h-[90vh] md:overflow-hidden"
            : "w-full rounded-3xl border border-white/10 bg-night-900/95 shadow-card"
        }
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-xl text-white">{listing.title}</h3>
            <p className="text-sm text-[#9a948a]">{listing.address}</p>
          </div>
          {isModal && onClose && (
            <button
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
              type="button"
              onClick={onClose}
            >
              Cerrar
            </button>
          )}
        </div>
        <div
          className={
            isModal
              ? "grid min-h-0 gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] md:max-h-[calc(90vh-88px)] md:overflow-hidden"
              : "grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]"
          }
        >
          <div className={isModal ? "space-y-4 md:min-h-0" : "space-y-4"}>
            <div className="relative overflow-hidden rounded-2xl">
              {activeImageUrl ? (
                <img
                  className="h-72 w-full object-cover"
                  src={activeImageUrl}
                  alt={listing.title}
                  loading="eager"
                  decoding="async"
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
                    <img
                      className="h-full w-full object-cover"
                      src={img}
                      alt=""
                      loading="lazy"
                      decoding="async"
                    />
                  </button>
                ))}
              </div>
            )}
            {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
          </div>
          <div
            className={
              isModal
                ? "space-y-4 md:max-h-[calc(90vh-88px)] md:min-h-0 md:overflow-y-auto md:pr-3 md:pb-10"
                : "space-y-4"
            }
          >
            <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-base font-semibold text-white">{listing.price}</p>
                  <span className="mt-2 inline-flex rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                    {listing.operation}
                  </span>
                </div>
                <span className="text-xs text-[#9a948a]">{listing.areaM2} m2</span>
              </div>
              {listing.agency !== undefined && (
                <div className="mt-3 text-xs text-[#9a948a]">
                  {listing.agency ? `Inmobiliaria: ${listing.agency}` : "Dueño directo"}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4">
              <div className="text-sm text-white">Descripcion</div>
              <p className="mt-2 max-h-28 overflow-y-auto text-sm text-[#9a948a]">
                {listing.descriptionLong}
              </p>
              {isLoading && (
                <p className="mt-2 text-xs text-[#9a948a] animate-pulse">
                  Cargando detalles...
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4">
              <div className="text-sm text-white">Detalles</div>
              <div className="mt-3 grid gap-2 text-xs text-[#9a948a] md:grid-cols-2">
                <div>Ambientes: {listing.rooms > 0 ? listing.rooms : "Sin ambientes"}</div>
                {listing.bathrooms !== undefined && <div>Banos: {listing.bathrooms}</div>}
                {listing.bedrooms !== undefined && <div>Dormitorios: {listing.bedrooms}</div>}
                {listing.expensesAmount && <div>Expensas: {listing.expensesAmount}</div>}
                {listing.financing?.available && (
                  <div>
                    Financia: {listing.financing.amount ? listing.financing.amount : "Si"}
                  </div>
                )}
                <div>Cochera: {listing.garage ? "Si" : "No"}</div>
                <div>Mascotas: {listing.pets ? "Si" : "No"}</div>
                <div>Niños: {listing.kids ? "Si" : "No"}</div>
              </div>
            </div>

            {rentalRequirements && (
              <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4">
                <div className="text-sm text-white">Requisitos de alquiler</div>
                <div className="mt-3 grid gap-2 text-xs text-[#9a948a] md:grid-cols-2">
                  {rentalRequirements.guarantees && (
                    <div>Garantias: {rentalRequirements.guarantees}</div>
                  )}
                  {rentalRequirements.entryMonths !== undefined && (
                    <div>Meses para entrar: {rentalRequirements.entryMonths}</div>
                  )}
                  {rentalRequirements.contractDurationMonths !== undefined && (
                    <div>
                      Duración contrato: {rentalRequirements.contractDurationMonths} meses
                    </div>
                  )}
                  {rentalRequirements.indexFrequency && (
                    <div>
                      Indexación:{" "}
                      {rentalFrequencyLabels[rentalRequirements.indexFrequency] ?? rentalRequirements.indexFrequency}
                    </div>
                  )}
                  {rentalRequirements.indexType && (
                    <div>
                      Índice:{" "}
                      {rentalIndexLabels[rentalRequirements.indexType] ?? rentalRequirements.indexType}
                    </div>
                  )}
                  {rentalRequirements.indexValue !== undefined && (
                    <div>Valor Índice: {rentalRequirements.indexValue}</div>
                  )}
                </div>
              </div>
            )}

            {!isLoading && (amenities.length > 0 || Object.values(services).some(Boolean)) && (
              <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#9a948a]">
                {amenities.length > 0 && (
                  <div>
                    <div className="text-sm text-white">Amenities</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {amenities.map((amenity) => (
                        <span
                          key={amenity}
                          className="rounded-full border border-white/10 px-3 py-1"
                        >
                          {amenityLabels[amenity] ?? amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {Object.values(services).some(Boolean) && (
                  <div>
                    <div className="text-sm text-white">Servicios</div>
                    <div className="mt-2 flex flex-wrap gap-2">
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
                  </div>
                )}
              </div>
            )}
            {hasMapLocation && (
              <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4">
                <div className="mb-3 text-sm font-semibold text-white">Ubicación</div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <MapContainer
                    center={[listing.lat as number, listing.lng as number]}
                    zoom={15}
                    className="h-40 w-full"
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <CircleMarker
                      center={[listing.lat as number, listing.lng as number]}
                      radius={8}
                      pathOptions={{ color: "#f4d19a", fillColor: "#d1a466", fillOpacity: 0.9 }}
                    />
                  </MapContainer>
                </div>
                <div className="mt-2 text-[11px] text-[#9a948a]">{listing.address}</div>
              </div>
            )}
            {(onReportProperty || onReportUser) && (
              <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4">
                <div className="text-sm text-white">Reportes</div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {onReportProperty && (
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                      onClick={() => openReport("PROPERTY")}
                    >
                      Reportar inmueble
                    </button>
                  )}
                  {onReportUser && (
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                      onClick={() => openReport("USER")}
                    >
                      Reportar usuario
                    </button>
                  )}
                </div>
                {reportTarget && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-[#9a948a]">
                      {reportTarget === "PROPERTY"
                        ? "Describi el problema con la publicacion."
                        : "Describi el problema con el usuario."}
                    </div>
                    <textarea
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-night-900/70 px-3 py-2 text-xs text-white"
                      rows={3}
                      placeholder="Motivo del reporte"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                        onClick={submitReport}
                        disabled={reportStatus === "loading"}
                      >
                        Enviar reporte
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                        onClick={() => setReportTarget(null)}
                      >
                        Cancelar
                      </button>
                    </div>
                    {reportMessage && (
                      <div
                        className={
                          reportStatus === "success"
                            ? "text-xs text-emerald-300"
                            : "text-xs text-[#f5b78a]"
                        }
                      >
                        {reportMessage}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
