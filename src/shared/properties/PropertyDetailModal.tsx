import { useEffect, useState } from "react";
import { CircleMarker, MapContainer, TileLayer, LayersControl } from "react-leaflet";

const ESRI_SATELLITE =
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const ESRI_ATTRIBUTION =
  "Tiles © Esri — Source: Esri, Maxar, Earthstar Geographics";

export type PropertyDetailListing = {
  id: string;
  title: string;
  address: string;
  price: string;
  operation: string;
  areaM2: number;
  coveredAreaM2?: number;
  summaryHighlights?: string[];
  rooms: number;
  bathrooms?: number;
  bedrooms?: number;
  garage: boolean;
  garageSpots?: number;
  garageType?: "COVERED" | "OPEN";
  pets: boolean;
  kids: boolean;
  hasPatio?: boolean;
  patioType?: "GRASS" | "FLOOR" | "CEMENT";
  laundry?: boolean;
  descriptionLong: string;
  images: string[];
  agency?: string | null;
  ownerDisplayName?: string | null;
  agencyLogo?: string | null;
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

type SummaryMetric = {
  label: string;
  value: string;
  icon: React.ReactNode;
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
  const [detailsExpanded, setDetailsExpanded] = useState(false);
  const [amenitiesExpanded, setAmenitiesExpanded] = useState(false);
  const [servicesExpanded, setServicesExpanded] = useState(false);
  const [showImageZoom, setShowImageZoom] = useState(false);
  const [showMapZoom, setShowMapZoom] = useState(false);
  const [isMobileViewport, setIsMobileViewport] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
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
  const mapCenter = hasMapLocation ? ([listing.lat as number, listing.lng as number] as [number, number]) : null;
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
    QUINCHO: "Quincho",
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
  const garageTypeLabels: Record<string, string> = {
    COVERED: "Cubierta",
    OPEN: "Abierta",
  };
  const patioTypeLabels: Record<string, string> = {
    GRASS: "Césped",
    FLOOR: "Piso",
    CEMENT: "Cemento",
  };
  const propertyTypeLabels: Record<string, string> = {
    HOUSE: "Casa",
    APARTMENT: "Departamento",
    LAND: "Terreno",
    FIELD: "Campo",
    QUINTA: "Quinta",
    COMMERCIAL: "Comercio",
    OFFICE: "Oficina",
    WAREHOUSE: "Depósito",
  };
  const ownerDisplayName = listing.ownerDisplayName?.trim() ?? "";
  const isAgencyPublisher = Boolean(listing.agency?.trim());
  const publisherRole = isAgencyPublisher ? "Inmobiliaria" : "Dueño directo";
  const publisherName = isAgencyPublisher
    ? listing.agency?.trim() ?? "Inmobiliaria"
    : ownerDisplayName || "Dueño directo";
  const hasAgencyLogo =
    Boolean(listing.agencyLogo) &&
    (listing.agencyLogo?.startsWith("http") || listing.agencyLogo?.startsWith("data:"));
  const publisherInitials = publisherName
    .split(" ")
    .slice(0, 2)
    .map((part) => part.charAt(0))
    .join("")
    .toUpperCase();
  const defaultSummaryMetrics: SummaryMetric[] = [
    {
      label: "Ambientes",
      value: listing.rooms > 0 ? String(listing.rooms) : "S/D",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 9h16M4 9l2-3h12l2 3M4 9v9h16V9" />
          <path d="M9 13h6" />
        </svg>
      ),
    },
    {
      label: "Sup. cubierta",
      value:
        listing.coveredAreaM2 !== undefined && listing.coveredAreaM2 > 0
          ? `${listing.coveredAreaM2} m2`
          : "S/D",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 4h16v16H4z" />
          <path d="M4 9h16M9 4v16" />
        </svg>
      ),
    },
    {
      label: "Sup. total",
      value: listing.areaM2 > 0 ? `${listing.areaM2} m2` : "S/D",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="1.6" />
          <path d="M8 8h8v8H8z" />
        </svg>
      ),
    },
    {
      label: "Baños",
      value: listing.bathrooms !== undefined ? String(listing.bathrooms) : "-",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M6 3v7a4 4 0 0 0 8 0V3" />
          <path d="M4 20h12" />
          <path d="M8 20v-4" />
        </svg>
      ),
    },
    {
      label: "Dormitorios",
      value: listing.bedrooms !== undefined ? String(listing.bedrooms) : "-",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 11h18v7H3z" />
          <path d="M6 11V8a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v3" />
        </svg>
      ),
    },
    {
      label: "Cochera",
      value: listing.garage ? "Sí" : "No",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 11l9-7 9 7v9H3v-9z" />
          <path d="M8 20v-5h8v5" />
        </svg>
      ),
    },
    {
      label: "Patio",
      value: listing.hasPatio ? "Sí" : "No",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 16h8M8 12h8" />
        </svg>
      ),
    },
    {
      label: "Lavadero",
      value: listing.laundry ? "Sí" : "No",
      icon: (
        <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M8 8h8" />
        </svg>
      ),
    },
  ];
  const defaultSummaryMetricKeys = [
    "detail:rooms",
    "detail:coveredAreaM2",
    "detail:areaM2",
    "detail:bathrooms",
    "detail:bedrooms",
    "detail:garage",
    "detail:patio",
    "detail:laundry",
  ] as const;
  const defaultSummaryMetricMap = Object.fromEntries(
    defaultSummaryMetricKeys.map((key, index) => [key, defaultSummaryMetrics[index]])
  ) as Record<(typeof defaultSummaryMetricKeys)[number], SummaryMetric>;
  const detailItems = [
    {
      label: "Cochera",
      value: listing.garage ? "Sí" : "No",
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 11l9-7 9 7v9H3v-9z" />
          <path d="M8 20v-5h8v5" />
        </svg>
      ),
    },
    {
      label: "Mascotas",
      value: listing.pets ? "Sí" : "No",
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M7 12h10M5 8l2 12M19 8l-2 12" />
          <path d="M9 6l3 4 3-4" />
        </svg>
      ),
    },
    {
      label: "Niños",
      value: listing.kids ? "Sí" : "No",
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="12" cy="7" r="3" />
          <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
        </svg>
      ),
    },
    {
      label: "Autos en cochera",
      value:
        listing.garage && listing.garageSpots !== undefined
          ? String(listing.garageSpots)
          : "-",
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="3" y="10" width="18" height="8" rx="2" />
          <circle cx="8" cy="18" r="1.6" />
          <circle cx="16" cy="18" r="1.6" />
        </svg>
      ),
    },
    {
      label: "Tipo de cochera",
      value:
        listing.garage && listing.garageType
          ? garageTypeLabels[listing.garageType] ?? listing.garageType
          : "-",
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 11l9-7 9 7v9H3v-9z" />
          <path d="M8 20v-5h8v5" />
        </svg>
      ),
    },
    {
      label: "Patio",
      value: listing.hasPatio
        ? listing.patioType
          ? patioTypeLabels[listing.patioType] ?? "Sí"
          : "Sí"
        : "No",
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <path d="M8 16h8M8 12h8" />
        </svg>
      ),
    },
    {
      label: "Lavadero",
      value: listing.laundry ? "Sí" : "No",
      icon: (
        <svg aria-hidden="true" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <rect x="4" y="4" width="16" height="16" rx="2" />
          <circle cx="12" cy="13" r="3.5" />
          <path d="M8 8h8" />
        </svg>
      ),
    },
  ];
  const enabledServices = serviceLabels.filter((service) => services[service.key]);
  const collapsedCount = isMobileViewport ? 3 : 4;
  const detailRows = [
    ...detailItems.map((item) => ({
      key: item.label,
      label: item.label,
      value: item.value,
      icon: item.icon,
      full: false,
    })),
    ...(listing.expensesAmount
      ? [
          {
            key: "Expensas",
            label: "Expensas",
            value: listing.expensesAmount,
            icon: null as React.ReactNode,
            full: false,
          },
        ]
      : []),
    ...(listing.financing?.available
      ? [
          {
            key: "Financia",
            label: "Financia",
            value: listing.financing.amount ? listing.financing.amount : "Si",
            icon: null as React.ReactNode,
            full: true,
          },
        ]
      : []),
  ];
  const detailRowsPrimary = detailRows.slice(0, collapsedCount);
  const detailRowsExtra = detailRows.slice(collapsedCount);
  const amenitiesPrimary = amenities.slice(0, collapsedCount);
  const amenitiesExtra = amenities.slice(collapsedCount);
  const servicesPrimary = enabledServices.slice(0, collapsedCount);
  const servicesExtra = enabledServices.slice(collapsedCount);
  const canExpandDetails = detailRows.length > collapsedCount;
  const canExpandAmenities = amenities.length > collapsedCount;
  const canExpandServices = enabledServices.length > collapsedCount;
  const amenityIcons: Record<string, React.ReactNode> = {
    AIR_CONDITIONING: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="3" y="6" width="18" height="6" rx="2" />
        <path d="M7 16h10M9 19h6" />
      </svg>
    ),
    HEATER: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M6 4v16M10 4v16M14 4v16M18 4v16" />
      </svg>
    ),
    KITCHEN: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 6h16v12H4z" />
        <path d="M8 10h8" />
      </svg>
    ),
    GRILL: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 12h16M7 12v6M12 12v6M17 12v6" />
      </svg>
    ),
    POOL: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 14c2 0 2 2 4 2s2-2 4-2 2 2 4 2 2-2 4-2 2 2 2 2" />
      </svg>
    ),
    JACUZZI: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="4" y="10" width="16" height="8" rx="2" />
        <path d="M8 7c.5-.7 1-1 2-1M13 6c.5-.7 1-1 2-1" />
      </svg>
    ),
    SOLARIUM: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="3.5" />
        <path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6l1.4 1.4M17 17l1.4 1.4M5.6 18.4 7 17M17 7l1.4-1.4" />
      </svg>
    ),
    ELEVATOR: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <rect x="7" y="4" width="10" height="16" rx="1.5" />
        <path d="m10 10 2-2 2 2M10 14l2 2 2-2" />
      </svg>
    ),
    PRIVATE_SECURITY: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3 5 6v6c0 4.2 2.6 7.4 7 9 4.4-1.6 7-4.8 7-9V6l-7-3Z" />
      </svg>
    ),
    SECURITY_CAMERAS: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="m4 10 10-4v4l6 2-6 2v4L4 14z" />
      </svg>
    ),
    QUINCHO: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M3 11h18v8H3z" />
        <path d="m2 11 10-7 10 7" />
      </svg>
    ),
  };

  const serviceSummaryIcons: Record<string, React.ReactNode> = {
    electricity: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="m13 3-6 10h4l-2 8 8-12h-4l2-6Z" />
      </svg>
    ),
    gas: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3c3 3.2 5 5.7 5 9a5 5 0 1 1-10 0c0-3.3 2-5.8 5-9Z" />
      </svg>
    ),
    water: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M12 3c3 3.8 6 6.5 6 10a6 6 0 0 1-12 0c0-3.5 3-6.2 6-10Z" />
      </svg>
    ),
    sewer: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <circle cx="12" cy="12" r="8" />
        <path d="M9 10h.01M15 10h.01M12 14h.01" />
      </svg>
    ),
    internet: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M4 9a12 12 0 0 1 16 0M7 12a8 8 0 0 1 10 0M10 15a4 4 0 0 1 4 0" />
        <circle cx="12" cy="18" r="1" fill="currentColor" stroke="none" />
      </svg>
    ),
    pavement: (
      <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
        <path d="M9 3 5 21M19 3l-4 18M4 8h16M3 16h16" />
      </svg>
    ),
  };

  const summaryMetrics = (() => {
    const customKeys = Array.isArray(listing.summaryHighlights)
      ? listing.summaryHighlights.filter((value, index, array) => Boolean(value) && array.indexOf(value) === index).slice(0, 8)
      : [];
    const customMetrics: SummaryMetric[] = [];

    const pushCustomMetric = (metric: SummaryMetric | null) => {
      if (!metric) return;
      if (customMetrics.some((item) => item.label === metric.label)) return;
      customMetrics.push(metric);
    };

    for (const key of customKeys) {
      if (key in defaultSummaryMetricMap) {
        pushCustomMetric(defaultSummaryMetricMap[key as keyof typeof defaultSummaryMetricMap]);
        continue;
      }

      if (key === "detail:garageSpots") {
        pushCustomMetric({
          label: "Autos en cochera",
          value: listing.garage && listing.garageSpots ? String(listing.garageSpots) : "S/D",
          icon: defaultSummaryMetricMap["detail:garage"].icon,
        });
        continue;
      }

      if (key === "detail:pets") {
        pushCustomMetric({
          label: "Mascotas",
          value: listing.pets ? "Sí" : "No",
          icon: (
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M7 12h10M5 8l2 12M19 8l-2 12" />
              <path d="M9 6l3 4 3-4" />
            </svg>
          ),
        });
        continue;
      }

      if (key === "detail:kids") {
        pushCustomMetric({
          label: "Niños",
          value: listing.kids ? "Sí" : "No",
          icon: (
            <svg aria-hidden="true" className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <circle cx="12" cy="7" r="3" />
              <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
            </svg>
          ),
        });
        continue;
      }

      if (key.startsWith("amenity:")) {
        const amenityKey = key.replace("amenity:", "");
        if (!amenities.includes(amenityKey)) continue;
        pushCustomMetric({
          label: amenityLabels[amenityKey] ?? amenityKey,
          value: "Sí",
          icon: amenityIcons[amenityKey] ?? defaultSummaryMetricMap["detail:rooms"].icon,
        });
        continue;
      }

      if (key.startsWith("service:")) {
        const serviceKey = key.replace("service:", "") as keyof typeof services;
        if (!services[serviceKey]) continue;
        const serviceLabel = serviceLabels.find((item) => item.key === serviceKey)?.label ?? serviceKey;
        pushCustomMetric({
          label: serviceLabel,
          value: "Sí",
          icon: serviceSummaryIcons[serviceKey] ?? defaultSummaryMetricMap["detail:areaM2"].icon,
        });
      }
    }

    if (customMetrics.length === 0) {
      return defaultSummaryMetrics;
    }

    // Mantiene una base visual mínima de 2x2 si el usuario eligió pocos items.
    if (customMetrics.length < 4) {
      for (const metric of defaultSummaryMetrics) {
        if (customMetrics.some((item) => item.label === metric.label)) continue;
        customMetrics.push(metric);
        if (customMetrics.length >= 4) break;
      }
    }

    return customMetrics.slice(0, 8);
  })();

  const openReport = (target: "PROPERTY" | "USER") => {
    setReportTarget(target);
    setReportReason("");
    setReportStatus("idle");
    setReportMessage("");
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onResize = () => setIsMobileViewport(window.innerWidth < 768);
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    if (!showImageZoom) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setShowImageZoom(false);
      }
      if (images.length > 1 && event.key === "ArrowLeft") {
        setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1));
      }
      if (images.length > 1 && event.key === "ArrowRight") {
        setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1));
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [showImageZoom, images.length]);

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
          ? "fixed inset-0 z-[1300] flex items-center justify-center bg-night-950 px-0 py-0 sm:px-4 sm:py-8"
          : "w-full"
      }
    >
      <div
        className={
          isModal
            ? "relative w-full max-w-4xl h-screen overflow-y-auto rounded-none border border-white/10 bg-night-900 shadow-card sm:h-[calc(100vh-2rem)] sm:rounded-3xl md:max-h-[90vh] md:overflow-hidden"
            : "relative w-full overflow-hidden rounded-3xl border border-white/10 bg-night-900 shadow-card"
        }
      >
        <span className="pointer-events-none absolute inset-y-0 left-0 hidden w-1 bg-gradient-to-b from-gold-500/80 via-[#D1C7BD]/50 to-transparent md:block" />
        <div
          className={
            isModal
              ? "relative flex flex-col gap-4 border-b border-white/10 bg-gradient-to-r from-night-900 to-night-950 px-6 py-4 md:flex-row md:items-center md:justify-between"
              : "relative flex flex-col gap-4 border-b border-white/10 bg-gradient-to-r from-night-800/90 via-night-900 to-night-900 px-5 py-3 md:flex-row md:items-center md:justify-between md:px-6 md:py-4"
          }
        >
          <div className={isModal ? "space-y-1" : "space-y-0.5"}>
            <p className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
              Ficha de inmueble
            </p>
            <h3 className={isModal ? "font-display text-2xl leading-tight text-white" : "font-display text-2xl leading-tight text-white md:text-3xl"}>
              {listing.title}
            </h3>
            <p className={isModal ? "text-sm text-[#D1C7BD]" : "text-sm text-[#D1C7BD] md:text-base"}>
              {listing.address}
            </p>
          </div>
          <div className="flex items-center justify-between gap-2 rounded-full border border-white/10 bg-night-950/85 px-3 py-1.5 md:min-w-[280px] md:justify-end md:gap-4 md:rounded-2xl md:px-4 md:py-2">
            <div className="text-left md:text-right">
              <div className="hidden text-[10px] uppercase tracking-[0.16em] text-[#D1C7BD] md:block">
                Precio
              </div>
              <div className="text-base font-semibold text-white md:text-xl">{listing.price}</div>
            </div>
            <div className="hidden h-10 w-px bg-white/10 md:block" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 overflow-hidden rounded-full border border-white/15 bg-night-800 md:h-9 md:w-9">
                {isAgencyPublisher && hasAgencyLogo ? (
                  <img
                    src={listing.agencyLogo ?? ""}
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
              <div>
                <div
                  className={
                    isAgencyPublisher
                      ? "text-[10px] font-semibold text-sky-200 md:text-[11px]"
                      : "text-[10px] font-semibold text-gold-300 md:text-[11px]"
                  }
                >
                  {publisherRole}
                </div>
                <div className="hidden max-w-[150px] truncate text-xs text-[#E7E2DD] md:block">
                  {publisherName}
                </div>
              </div>
            </div>
          </div>
          {isModal && onClose && (
            <button
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
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
              ? "grid min-h-0 gap-4 p-4 sm:gap-5 sm:p-5 md:gap-6 md:p-6 lg:grid-cols-[1.2fr_0.8fr] md:max-h-[calc(90vh-88px)] md:overflow-hidden"
              : "grid gap-4 p-4 sm:gap-5 sm:p-5 md:p-6 lg:grid-cols-[1.2fr_0.8fr]"
          }
        >
          <div className={isModal ? "space-y-4 md:min-h-0" : "space-y-4"}>
            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-[0_18px_40px_rgba(0,0,0,0.35)]">
              {activeImageUrl ? (
                <img
                  key={activeImageUrl}
                  className="h-56 w-full animate-fadeUp cursor-zoom-in object-cover sm:h-64 md:h-72"
                  src={activeImageUrl}
                  alt={listing.title}
                  loading="eager"
                  decoding="async"
                  onClick={() => setShowImageZoom(true)}
                  title="Click para ampliar"
                />
              ) : (
                <div className="flex h-56 items-center justify-center bg-night-800 text-xs text-[#D1C7BD] sm:h-64 md:h-72">
                  Sin fotos cargadas
                </div>
              )}
              {images.length > 1 && (
                <div className="absolute inset-x-0 bottom-3 flex items-center justify-between px-3 sm:bottom-4 sm:px-4">
                  <button
                    className="rounded-full border border-white/30 bg-night-900/68 px-3 py-1 text-[11px] text-white sm:text-xs"
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
                    className="rounded-full border border-white/30 bg-night-900/68 px-3 py-1 text-[11px] text-white sm:text-xs"
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
              <div className="flex gap-2 overflow-x-auto pb-1 pr-1">
                {images.map((img, index) => (
                  <button
                    key={img}
                    className={
                      index === activeImage
                        ? "h-12 w-16 overflow-hidden rounded-xl border border-gold-400/60 sm:h-14 sm:w-20"
                        : "h-12 w-16 overflow-hidden rounded-xl border border-white/10 sm:h-14 sm:w-20"
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
            {actions && (
              <div
                className={
                  isModal
                    ? "mt-2 rounded-2xl border border-white/10 bg-night-800 p-3"
                    : "mt-1 rounded-2xl border border-white/10 bg-night-800/75 p-3"
                }
              >
                <div className="flex flex-wrap gap-2 sm:gap-3">{actions}</div>
              </div>
            )}
            <div className="rounded-2xl border border-gold-500/25 bg-gradient-to-br from-[#5A534C]/35 via-night-800 to-night-800 p-3 sm:p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                    Precio destacado
                  </div>
                  <div className="mt-1 text-xl font-semibold text-white sm:text-2xl">{listing.price}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className="inline-flex rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-300">
                      {listing.operation}
                    </span>
                    {listing.propertyType && (
                      <span className="inline-flex rounded-full border border-white/15 bg-night-900/70 px-3 py-1 text-xs text-[#E7E2DD]">
                        {propertyTypeLabels[listing.propertyType] ?? listing.propertyType}
                      </span>
                    )}
                    <span
                      className={
                        isAgencyPublisher
                          ? "inline-flex rounded-full border border-sky-300/35 bg-sky-400/15 px-3 py-1 text-xs font-semibold text-sky-200"
                          : "inline-flex rounded-full border border-gold-400/35 bg-gold-500/15 px-3 py-1 text-xs font-semibold text-gold-300"
                      }
                    >
                      {publisherRole}
                    </span>
                  </div>
                  <div className="mt-2 text-sm font-semibold text-white">{publisherName}</div>
                </div>
                <span className="rounded-full border border-white/10 bg-night-900/65 px-3 py-1 text-xs text-[#D1C7BD]">
                  {listing.areaM2} m2
                </span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 sm:mt-4">
                {summaryMetrics.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-xl border border-white/10 bg-night-900/55 px-3 py-2"
                  >
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.12em] text-[#D1C7BD]">
                      <span className="text-[#D1C7BD]">{item.icon}</span>
                      {item.label}
                    </div>
                    <div className="mt-1 text-xs font-semibold text-white sm:text-sm">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div
            className={
              isModal
                ? "space-y-4 md:max-h-[calc(90vh-88px)] md:min-h-0 md:overflow-y-auto md:pr-3 md:pb-10"
                : "space-y-4"
            }
          >
            <div className="rounded-2xl border border-white/10 bg-night-800 p-3 sm:p-4">
              <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                Descripción
              </div>
              <p
                className={`mt-2 whitespace-pre-line break-words [overflow-wrap:anywhere] text-sm leading-6 text-[#D1C7BD] ${
                  isModal ? "max-h-44 overflow-y-auto" : ""
                }`}
              >
                {listing.descriptionLong}
              </p>
              {isLoading && (
                <p className="mt-2 text-xs text-[#D1C7BD] animate-pulse">
                  Cargando detalles...
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-night-800 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                  Detalles
                </div>
                {canExpandDetails && (
                  <button
                    type="button"
                    onClick={() => setDetailsExpanded((prev) => !prev)}
                    className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-night-900/72 px-2.5 py-1 text-[10px] font-semibold text-[#E7E2DD] transition hover:border-white/25"
                  >
                    {detailsExpanded
                      ? "Ver menos"
                      : `Ver más (${detailRows.length - collapsedCount})`}
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className={`h-3 w-3 transition-transform ${detailsExpanded ? "rotate-180" : ""}`}
                    >
                      <path d="M6 9l6 6 6-6" />
                    </svg>
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-2 text-xs text-[#D1C7BD] md:grid-cols-2">
                {detailRowsPrimary.map((item) => (
                  <div
                    key={item.key}
                    className={`rounded-xl border border-white/10 bg-night-900/72 px-3 py-2 ${
                      item.full ? "md:col-span-2" : ""
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {item.icon ? <span className="text-[#D1C7BD]">{item.icon}</span> : null}
                      <span>
                        {item.label}: <span className="text-white">{item.value}</span>
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              {canExpandDetails && (
                <div
                  className={`overflow-hidden transition-all duration-300 ease-out ${
                    detailsExpanded
                      ? "mt-2 max-h-[520px] opacity-100"
                      : "mt-0 max-h-0 opacity-0"
                  }`}
                >
                  <div className="grid gap-2 pt-2 text-xs text-[#D1C7BD] md:grid-cols-2">
                    {detailRowsExtra.map((item) => (
                      <div
                        key={item.key}
                        className={`rounded-xl border border-white/10 bg-night-900/72 px-3 py-2 ${
                          item.full ? "md:col-span-2" : ""
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {item.icon ? <span className="text-[#D1C7BD]">{item.icon}</span> : null}
                          <span>
                            {item.label}: <span className="text-white">{item.value}</span>
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {rentalRequirements && (
              <div className="rounded-2xl border border-white/10 bg-night-800 p-3 sm:p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                  Requisitos de alquiler
                </div>
                <div className="mt-3 grid gap-2 text-xs text-[#D1C7BD] md:grid-cols-2">
                  {rentalRequirements.guarantees && (
                    <div>Garantías: {rentalRequirements.guarantees}</div>
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
              <div className="space-y-3 text-xs text-[#D1C7BD]">
                {amenities.length > 0 && (
                  <div className="rounded-2xl border border-white/10 bg-night-800 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                        Amenities
                      </div>
                      {canExpandAmenities && (
                        <button
                          type="button"
                          onClick={() => setAmenitiesExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-night-900/72 px-2.5 py-1 text-[10px] font-semibold text-[#E7E2DD] transition hover:border-white/25"
                        >
                          {amenitiesExpanded
                            ? "Ver menos"
                            : `Ver más (${amenities.length - collapsedCount})`}
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`h-3 w-3 transition-transform ${amenitiesExpanded ? "rotate-180" : ""}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {amenitiesPrimary.map((amenity) => (
                        <div
                          key={amenity}
                          className="rounded-xl border border-white/10 bg-night-900/72 px-3 py-2"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[#D1C7BD]">{amenityIcons[amenity] ?? null}</span>
                            <span>{amenityLabels[amenity] ?? amenity}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    {canExpandAmenities && (
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${
                          amenitiesExpanded
                            ? "mt-2 max-h-[520px] opacity-100"
                            : "mt-0 max-h-0 opacity-0"
                        }`}
                      >
                        <div className="grid gap-2 pt-2 md:grid-cols-2">
                          {amenitiesExtra.map((amenity) => (
                            <div
                              key={amenity}
                              className="rounded-xl border border-white/10 bg-night-900/72 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <span className="text-[#D1C7BD]">{amenityIcons[amenity] ?? null}</span>
                                <span>{amenityLabels[amenity] ?? amenity}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
                {Object.values(services).some(Boolean) && (
                  <div className="rounded-2xl border border-white/10 bg-night-800 p-3 sm:p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                        Servicios
                      </div>
                      {canExpandServices && (
                        <button
                          type="button"
                          onClick={() => setServicesExpanded((prev) => !prev)}
                          className="inline-flex items-center gap-1 rounded-full border border-white/15 bg-night-900/72 px-2.5 py-1 text-[10px] font-semibold text-[#E7E2DD] transition hover:border-white/25"
                        >
                          {servicesExpanded
                            ? "Ver menos"
                            : `Ver más (${enabledServices.length - collapsedCount})`}
                          <svg
                            aria-hidden="true"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className={`h-3 w-3 transition-transform ${servicesExpanded ? "rotate-180" : ""}`}
                          >
                            <path d="M6 9l6 6 6-6" />
                          </svg>
                        </button>
                      )}
                    </div>
                    <div className="mt-3 grid gap-2 md:grid-cols-2">
                      {servicesPrimary.map((service) => (
                          <div
                            key={service.key}
                            className="rounded-xl border border-white/10 bg-night-900/72 px-3 py-2"
                          >
                            <div className="flex items-center gap-2">
                              <svg
                                aria-hidden="true"
                                className="h-3.5 w-3.5 text-[#D1C7BD]"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="1.6"
                              >
                                <circle cx="12" cy="12" r="3" />
                                <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                              </svg>
                              <span>{service.label}</span>
                            </div>
                          </div>
                        ))}
                    </div>
                    {canExpandServices && (
                      <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${
                          servicesExpanded
                            ? "mt-2 max-h-[420px] opacity-100"
                            : "mt-0 max-h-0 opacity-0"
                        }`}
                      >
                        <div className="grid gap-2 pt-2 md:grid-cols-2">
                          {servicesExtra.map((service) => (
                            <div
                              key={service.key}
                              className="rounded-xl border border-white/10 bg-night-900/72 px-3 py-2"
                            >
                              <div className="flex items-center gap-2">
                                <svg
                                  aria-hidden="true"
                                  className="h-3.5 w-3.5 text-[#D1C7BD]"
                                  viewBox="0 0 24 24"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.6"
                                >
                                  <circle cx="12" cy="12" r="3" />
                                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2" />
                                </svg>
                                <span>{service.label}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {hasMapLocation && (
              <div className="rounded-2xl border border-white/10 bg-night-800 p-3 sm:p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                    Ubicación
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 bg-night-900/70 px-3 py-1 text-[10px] text-[#E7E2DD]"
                    onClick={() => setShowMapZoom(true)}
                  >
                    Ampliar mapa
                  </button>
                </div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <MapContainer
                    center={mapCenter as [number, number]}
                    zoom={15}
                    className="h-40 w-full"
                    scrollWheelZoom={false}
                  >
                    <LayersControl position="topleft">
                      <LayersControl.BaseLayer checked name="Mapa">
                        <TileLayer
                          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                      </LayersControl.BaseLayer>
                      <LayersControl.BaseLayer name="Satélite">
                        <TileLayer attribution={ESRI_ATTRIBUTION} url={ESRI_SATELLITE} />
                      </LayersControl.BaseLayer>
                    </LayersControl>
                    <CircleMarker
                      center={mapCenter as [number, number]}
                      radius={8}
                      pathOptions={{ color: "#f4d19a", fillColor: "#AF8C5C", fillOpacity: 0.9 }}
                    />
                  </MapContainer>
                </div>
                <div className="mt-2 text-[11px] text-[#D1C7BD]">{listing.address}</div>
              </div>
            )}
            {(onReportProperty || onReportUser) && (
              <div className="rounded-2xl border border-white/10 bg-night-800 p-4">
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                  Reportes
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {onReportProperty && (
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                      onClick={() => openReport("PROPERTY")}
                    >
                      Reportar inmueble
                    </button>
                  )}
                  {onReportUser && (
                    <button
                      type="button"
                      className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                      onClick={() => openReport("USER")}
                    >
                      Reportar usuario
                    </button>
                  )}
                </div>
                {reportTarget && (
                  <div className="mt-3 space-y-2">
                    <div className="text-xs text-[#D1C7BD]">
                      {reportTarget === "PROPERTY"
                        ? "Describí el problema con la publicación."
                        : "Describí el problema con el usuario."}
                    </div>
                    <textarea
                      value={reportReason}
                      onChange={(event) => setReportReason(event.target.value)}
                      className="w-full rounded-2xl border border-white/10 bg-night-900/58 px-3 py-2 text-xs text-white"
                      rows={3}
                      placeholder="Motivo del reporte"
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                        onClick={submitReport}
                        disabled={reportStatus === "loading"}
                      >
                        Enviar reporte
                      </button>
                      <button
                        type="button"
                        className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
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
                            : "text-xs text-[#AF8C5C]"
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
      {showImageZoom && activeImageUrl && (
        <div
          className="fixed inset-0 z-[1450] flex items-center justify-center bg-night-950 p-3 sm:p-6"
          onClick={() => setShowImageZoom(false)}
        >
          <div
            className="relative w-full max-w-6xl"
            onClick={(event) => event.stopPropagation()}
          >
            <button
              type="button"
              className="absolute right-2 top-2 z-10 rounded-full border border-white/20 bg-black/50 px-3 py-1 text-xs text-white"
              onClick={() => setShowImageZoom(false)}
            >
              Cerrar
            </button>
            <img
              src={activeImageUrl}
              alt={listing.title}
              className="max-h-[88vh] w-full rounded-2xl border border-white/10 object-contain bg-night-900"
            />
            {images.length > 1 && (
              <div className="pointer-events-none absolute inset-x-0 top-1/2 flex -translate-y-1/2 items-center justify-between px-2 sm:px-4">
                <button
                  type="button"
                  className="pointer-events-auto rounded-full border border-white/25 bg-black/60 px-3 py-2 text-xs text-white"
                  onClick={() =>
                    setActiveImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))
                  }
                >
                  Anterior
                </button>
                <button
                  type="button"
                  className="pointer-events-auto rounded-full border border-white/25 bg-black/60 px-3 py-2 text-xs text-white"
                  onClick={() =>
                    setActiveImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))
                  }
                >
                  Siguiente
                </button>
              </div>
            )}
            {images.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {images.map((img, index) => (
                  <button
                    key={`${img}-zoom`}
                    type="button"
                    onClick={() => setActiveImage(index)}
                    className={
                      index === activeImage
                        ? "h-14 w-20 overflow-hidden rounded-xl border border-gold-400/70"
                        : "h-14 w-20 overflow-hidden rounded-xl border border-white/15"
                    }
                  >
                    <img src={img} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {showMapZoom && hasMapLocation && mapCenter && (
        <div
          className="fixed inset-0 z-[1450] flex items-center justify-center bg-night-950 p-3 sm:p-6"
          onClick={() => setShowMapZoom(false)}
        >
          <div
            className="w-full max-w-6xl rounded-3xl border border-white/10 bg-night-900 p-3 shadow-soft sm:p-4"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                  Ubicacion ampliada
                </div>
                <div className="text-sm text-[#E7E2DD]">{listing.address}</div>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/20 bg-night-900/70 px-3 py-1 text-xs text-[#E7E2DD]"
                onClick={() => setShowMapZoom(false)}
              >
                Cerrar
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10">
              <MapContainer
                center={mapCenter}
                zoom={16}
                className="h-[58vh] w-full sm:h-[68vh]"
                scrollWheelZoom
              >
                <LayersControl position="topleft">
                  <LayersControl.BaseLayer checked name="Mapa">
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                  </LayersControl.BaseLayer>
                  <LayersControl.BaseLayer name="Satelite">
                    <TileLayer attribution={ESRI_ATTRIBUTION} url={ESRI_SATELLITE} />
                  </LayersControl.BaseLayer>
                </LayersControl>
                <CircleMarker
                  center={mapCenter}
                  radius={10}
                  pathOptions={{ color: "#f4d19a", fillColor: "#AF8C5C", fillOpacity: 0.92 }}
                />
              </MapContainer>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}





