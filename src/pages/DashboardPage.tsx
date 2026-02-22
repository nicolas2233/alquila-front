import { useCallback, useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import { geocodeAddress, reverseGeocode } from "../shared/map/geocode";
import { useLocation, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type {
  PropertyApiDetail,
  PropertyApiListItem,
} from "../shared/properties/propertyMappers";
import { formatPrice, mapPropertyToDetailListing } from "../shared/properties/propertyMappers";
import { buildWhatsappLink } from "../shared/utils/whatsapp";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { formatRentalRequirements } from "../shared/utils/rentalRequirements";
import { useUnsavedChanges } from "../shared/hooks/useUnsavedChanges";
import { ConfirmLeaveModal } from "../shared/ui/ConfirmLeaveModal";

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  RENTED: "Alquilada",
  TEMPORARILY_UNAVAILABLE: "No disponible",
};
const statusDotClass: Record<string, string> = {
  ACTIVE: "bg-emerald-400",
  PAUSED: "bg-amber-400",
  SOLD: "bg-rose-400",
  RENTED: "bg-rose-400",
  DRAFT: "bg-slate-400",
  TEMPORARILY_UNAVAILABLE: "bg-rose-400",
};
const statusOptions = ["ACTIVE", "PAUSED", "SOLD", "RENTED", "TEMPORARILY_UNAVAILABLE"];
const quickEditStatusOptionsByOperation: Record<string, string[]> = {
  SALE: ["ACTIVE", "PAUSED", "SOLD"],
  RENT: ["ACTIVE", "PAUSED", "RENTED"],
  TEMPORARY: ["ACTIVE", "PAUSED", "TEMPORARILY_UNAVAILABLE"],
};
const requestStatusLabels: Record<string, string> = {
  NEW: "Nueva",
  CONTACTED: "Contactado",
  CLOSED: "Cerrada",
};
const requestTypeLabels: Record<string, string> = {
  INTEREST: "Me interesa",
  VISIT: "Reservar visita",
};
const operationLabels: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Temporario",
};
const propertyLabels: Record<string, string> = {
  HOUSE: "Casa",
  APARTMENT: "Departamento",
  LAND: "Terreno",
  FIELD: "Campo",
  QUINTA: "Quinta",
  COMMERCIAL: "Comercio",
  OFFICE: "Oficina",
  WAREHOUSE: "Deposito",
};

function hexToRgba(hex: string, alpha: number) {
  const value = hex.trim().replace("#", "");
  const normalized =
    value.length === 3 ? value.split("").map((char) => `${char}${char}`).join("") : value;
  if (!/^[0-9A-Fa-f]{6}$/.test(normalized)) {
    return `rgba(17, 39, 95, ${alpha})`;
  }
  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function EditLocationPicker({
  lat,
  lng,
  onChange,
}: {
  lat?: number;
  lng?: number;
  onChange: (nextLat: number, nextLng: number) => void;
}) {
  const center = useMemo(() => [lat ?? -35.1197, lng ?? -60.4899], [lat, lng]);

  function ClickHandler() {
    useMapEvents({
      click: (event) => {
        onChange(event.latlng.lat, event.latlng.lng);
      },
    });
    return null;
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-white/10">
      <MapContainer
        center={center as [number, number]}
        zoom={13}
        className="h-[220px] w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <ClickHandler />
        {lat !== undefined && lng !== undefined && (
          <CircleMarker
            center={[lat, lng]}
            radius={8}
            pathOptions={{ color: "#f4d19a", fillColor: "#AF8C5C", fillOpacity: 0.9 }}
          />
        )}
      </MapContainer>
    </div>
  );
}

type AgencyProfile = {
  id: string;
  name: string;
  legalName: string;
  cuit?: string | null;
  licenseNumber?: string | null;
  phone?: string | null;
  address?: string | null;
  about?: string | null;
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
};

type PanelSection = "profile" | "listings" | "requests" | "my-requests";

export function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const sessionToken = useMemo(() => getToken(), []);
  const isOwner = sessionUser?.role === "OWNER";
  const isAgency = sessionUser?.role?.startsWith("AGENCY") ?? false;
  const ownerUserId = isOwner ? sessionUser?.id : undefined;
  const agencyId = isAgency ? sessionUser?.agencyId : undefined;
  const roleLabel = isOwner
    ? "Dueño directo"
    : isAgency
    ? "Inmobiliaria"
    : "Usuario";

  const [items, setItems] = useState<PropertyApiListItem[]>([]);
  const [propertyStatus, setPropertyStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [propertyError, setPropertyError] = useState("");
  const [propertyFilterType, setPropertyFilterType] = useState("");
  const [propertyFilterOperation, setPropertyFilterOperation] = useState("");
  const [agencyStatus, setAgencyStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "idle"
  );
  const [agencyError, setAgencyError] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyLegalName, setAgencyLegalName] = useState("");
  const [agencyCuit, setAgencyCuit] = useState("");
  const [agencyLicenseNumber, setAgencyLicenseNumber] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [agencyAbout, setAgencyAbout] = useState("");
  const [agencyWhatsapp, setAgencyWhatsapp] = useState("");
  const [agencyEmail, setAgencyEmail] = useState("");
  const [agencyWebsite, setAgencyWebsite] = useState("");
  const [agencyInstagram, setAgencyInstagram] = useState("");
  const [agencyFacebook, setAgencyFacebook] = useState("");
  const [agencyLogo, setAgencyLogo] = useState("");
  const [agencyHeroColor, setAgencyHeroColor] = useState("#4b70e7");
  const [agencyHeroImage, setAgencyHeroImage] = useState("");
  const [agencyHeroImagePosition, setAgencyHeroImagePosition] = useState<
    "top" | "center" | "bottom"
  >("center");
  const [agencyHeroImageOpacity, setAgencyHeroImageOpacity] = useState(45);
  const [agencyContactCardColor, setAgencyContactCardColor] = useState("#11275f");
  const [agencyContactCardOpacity, setAgencyContactCardOpacity] = useState(35);
  const [agencyLat, setAgencyLat] = useState<number | undefined>(undefined);
  const [agencyLng, setAgencyLng] = useState<number | undefined>(undefined);
  const [agencyMapQuery, setAgencyMapQuery] = useState("");
  const [agencyGeoStatus, setAgencyGeoStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [agencyGeoMessage, setAgencyGeoMessage] = useState("");
  const [agencyProfileTab, setAgencyProfileTab] = useState<"data" | "styles">("data");
  const [ownerStatus, setOwnerStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "idle"
  );
  const [ownerError, setOwnerError] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerDni, setOwnerDni] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [ownerAvatarUrl, setOwnerAvatarUrl] = useState("");
  const [ownerShowNamePublic, setOwnerShowNamePublic] = useState(false);
  const [ownerDniTramite, setOwnerDniTramite] = useState("");
  const [ownerBirthDate, setOwnerBirthDate] = useState("");
  const [activeSection, setActiveSection] = useState<PanelSection>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const { show, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);
  const lockIcon = (
    <span className="ml-1 inline-flex items-center text-[#BFB8AD]" title="No editable">
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Z" />
      </svg>
    </span>
  );
  const [selectedItem, setSelectedItem] = useState<PropertyApiDetail | null>(null);
  const [publicStatus, setPublicStatus] = useState<"idle" | "loading" | "error">("idle");
  const [publicError, setPublicError] = useState("");
  const [showPublicModal, setShowPublicModal] = useState(false);
  const [quickEditOpen, setQuickEditOpen] = useState(false);
  const [quickEditStatus, setQuickEditStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "idle"
  );
  const [quickEditError, setQuickEditError] = useState("");
  const [quickEditItem, setQuickEditItem] = useState<PropertyApiDetail | null>(null);
  const [quickEditOperationType, setQuickEditOperationType] = useState<"SALE" | "RENT" | "TEMPORARY">(
    "SALE"
  );
  const [quickEditPriceAmount, setQuickEditPriceAmount] = useState("");
  const [quickEditPriceCurrency, setQuickEditPriceCurrency] = useState<"ARS" | "USD">("ARS");
  const [quickEditStatusValue, setQuickEditStatusValue] = useState("ACTIVE");
  const [quickEditPermutaAccepted, setQuickEditPermutaAccepted] = useState(false);
  const [quickEditPermutaReason, setQuickEditPermutaReason] = useState("");
  const [quickEditOperationReason, setQuickEditOperationReason] = useState("");
  const [quickEditRentGuarantees, setQuickEditRentGuarantees] = useState("");
  const [quickEditRentEntryMonths, setQuickEditRentEntryMonths] = useState("");
  const [quickEditRentContractDuration, setQuickEditRentContractDuration] = useState("");
  const [quickEditRentIndexFrequency, setQuickEditRentIndexFrequency] = useState("");
  const [quickEditRentIndexType, setQuickEditRentIndexType] = useState("");
  const [quickEditRentIndexValue, setQuickEditRentIndexValue] = useState("");
  const [quickEditRentInfoPublic, setQuickEditRentInfoPublic] = useState(true);
  const [requestStatus, setRequestStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [requestError, setRequestError] = useState("");
  const [contactRequests, setContactRequests] = useState<
    Array<{
      id: string;
      type: "INTEREST" | "VISIT";
      status: "NEW" | "CONTACTED" | "CLOSED";
      name?: string | null;
      email?: string | null;
      phone?: string | null;
      message?: string | null;
      createdAt: string;
      requesterUser?: {
        id?: string;
        name?: string | null;
        email?: string | null;
        phone?: string | null;
      } | null;
      property: {
        id: string;
        title: string;
        operationType: string;
        propertyType: string;
        priceAmount: string;
        priceCurrency: string;
        location?: { addressLine?: string | null } | null;
        rentalRequirements?: {
          guarantees?: string;
          entryMonths?: number;
          contractDurationMonths?: number;
          indexFrequency?: string;
          indexType?: string;
          indexValue?: number;
          isPublic?: boolean;
        } | null;
      };
    }>
  >([]);
  const [requestFilterType, setRequestFilterType] = useState("");
  const [requestFilterOperation, setRequestFilterOperation] = useState("");
  const [myRequests, setMyRequests] = useState<
    Array<{
      id: string;
      type: "INTEREST" | "VISIT";
      status: "NEW" | "CONTACTED" | "CLOSED";
      message?: string | null;
      createdAt: string;
      property: {
        id: string;
        title: string;
        operationType: string;
        propertyType: string;
        priceAmount: string;
        priceCurrency: string;
        location?: { addressLine?: string | null } | null;
        rentalRequirements?: {
          guarantees?: string;
          entryMonths?: number;
          contractDurationMonths?: number;
          indexFrequency?: string;
          indexType?: string;
          indexValue?: number;
          isPublic?: boolean;
        } | null;
      };
    }>
  >([]);
  const [selectedRequest, setSelectedRequest] =
    useState<(typeof contactRequests)[number] | null>(null);
  const [requestDetailOpen, setRequestDetailOpen] = useState(false);
  const [requestPreviewListing, setRequestPreviewListing] =
    useState<ReturnType<typeof mapPropertyToDetailListing> | null>(null);
  const [requestPreviewStatus, setRequestPreviewStatus] =
    useState<"idle" | "loading" | "error">("idle");
  const [requestPreviewError, setRequestPreviewError] = useState("");
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);
  const [highlightRequestId, setHighlightRequestId] = useState<string | null>(null);
  const [highlightFlash, setHighlightFlash] = useState(false);
  const [highlightPulse, setHighlightPulse] = useState(false);
  // chat in-app lives in floating widget

  const loadProperties = useCallback(async () => {
    if (!sessionUser) {
      setPropertyStatus("error");
      setPropertyError("Necesitas iniciar sesión.");
      return;
    }

    if (!ownerUserId && !agencyId) {
      setPropertyStatus("error");
      setPropertyError("Solo dueños o inmobiliarias pueden ver este panel.");
      return;
    }

    setPropertyStatus("loading");
    setPropertyError("");

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12000);

    try {
      const params = new URLSearchParams();
      if (ownerUserId) {
        params.set("ownerUserId", ownerUserId);
      }
      if (agencyId) {
        params.set("agencyId", agencyId);
      }
      if (propertyFilterType) {
        params.set("propertyType", propertyFilterType);
      }
      if (propertyFilterOperation) {
        params.set("operationType", propertyFilterOperation);
      }

      const response = await fetch(`${env.apiUrl}/properties?${params.toString()}`, {
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new Error("No pudimos cargar las publicaciones.");
      }

      const data = (await response.json()) as { items: PropertyApiListItem[] };
      setItems(data.items);
      setPropertyStatus("idle");
    } catch (error) {
      setPropertyStatus("error");
      setPropertyError(
        error instanceof Error ? error.message : "Error al cargar publicaciones."
      );
    } finally {
      clearTimeout(timeout);
    }
  }, [agencyId, ownerUserId, sessionUser, propertyFilterType, propertyFilterOperation]);

  const loadRequests = useCallback(async () => {
    if (!sessionToken) {
      setRequestStatus("error");
      setRequestError("Necesitas iniciar sesión.");
      return;
    }
    setRequestStatus("loading");
    setRequestError("");
    try {
      const response = await fetch(`${env.apiUrl}/contact-requests`, {
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("No pudimos cargar las solicitudes.");
      }
      const data = (await response.json()) as { items: typeof contactRequests };
      setContactRequests(data.items ?? []);
      setRequestStatus("idle");
    } catch (error) {
      setRequestStatus("error");
      setRequestError(
        error instanceof Error ? error.message : "Error al cargar solicitudes."
      );
    }
  }, [sessionToken]);

  const loadRequestDetail = useCallback(
    async (requestId: string) => {
      if (!sessionToken) {
        addToast("Necesitas iniciar sesión.", "warning");
        return null;
      }
      try {
        const response = await fetch(`${env.apiUrl}/contact-requests/${requestId}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar el detalle.");
        }
        const data = (await response.json()) as (typeof contactRequests)[number];
        return data;
      } catch (error) {
        addToast(
          error instanceof Error ? error.message : "No pudimos cargar el detalle.",
          "error"
        );
        return null;
      }
    },
    [sessionToken, addToast, contactRequests]
  );

  const openRequestDetail = useCallback(
    async (requestItem: (typeof contactRequests)[number]) => {
      setSelectedRequest(requestItem);
      setRequestDetailOpen(true);
      const detail = await loadRequestDetail(requestItem.id);
      if (detail) {
        setSelectedRequest(detail);
      }
    },
    [loadRequestDetail]
  );

  const loadMyRequests = useCallback(async () => {
    if (!sessionToken) {
      setRequestStatus("error");
      setRequestError("Necesitas iniciar sesión.");
      return;
    }
    setRequestStatus("loading");
    setRequestError("");
    try {
      const response = await fetch(`${env.apiUrl}/contact-requests/mine`, {
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("No pudimos cargar tus solicitudes.");
      }
      const data = (await response.json()) as { items: typeof myRequests };
      setMyRequests(data.items ?? []);
      setRequestStatus("idle");
    } catch (error) {
      setRequestStatus("error");
      setRequestError(
        error instanceof Error ? error.message : "Error al cargar tus solicitudes."
      );
    }
  }, [sessionToken]);

  const loadAgency = useCallback(async () => {
    if (!agencyId) {
      return;
    }
    setAgencyStatus("loading");
    setAgencyError("");

    try {
      const response = await fetch(`${env.apiUrl}/agencies/${agencyId}`);
      if (!response.ok) {
        throw new Error("No pudimos cargar la inmobiliaria.");
      }
      const data = (await response.json()) as AgencyProfile;
      setAgencyName(data.name ?? "");
      setAgencyLegalName(data.legalName ?? "");
      setAgencyCuit(data.cuit ?? "");
      setAgencyLicenseNumber(data.licenseNumber ?? "");
      setAgencyPhone(data.phone ?? "");
      setAgencyAddress(data.address ?? "");
      setAgencyAbout(data.about ?? "");
      setAgencyWhatsapp(data.whatsapp ?? "");
      setAgencyEmail(data.email ?? "");
      setAgencyWebsite(data.website ?? "");
      setAgencyInstagram(data.instagram ?? "");
      setAgencyFacebook(data.facebook ?? "");
      setAgencyLogo(data.logo ?? "");
      setAgencyHeroColor(data.heroColor ?? "#4b70e7");
      setAgencyHeroImage(data.heroImage ?? "");
      setAgencyHeroImagePosition(
        data.heroImagePosition === "top" ||
          data.heroImagePosition === "center" ||
          data.heroImagePosition === "bottom"
          ? data.heroImagePosition
          : "center"
      );
      setAgencyHeroImageOpacity(
        typeof data.heroImageOpacity === "number"
          ? Math.max(0, Math.min(100, data.heroImageOpacity))
          : 45
      );
      setAgencyContactCardColor(data.contactCardColor ?? "#11275f");
      setAgencyContactCardOpacity(
        typeof data.contactCardOpacity === "number"
          ? Math.max(0, Math.min(100, data.contactCardOpacity))
          : 35
      );
      setAgencyLat(typeof data.lat === "number" ? data.lat : undefined);
      setAgencyLng(typeof data.lng === "number" ? data.lng : undefined);
      setAgencyMapQuery(data.address ?? "");
      setAgencyStatus("idle");
    } catch (error) {
      setAgencyStatus("error");
      setAgencyError(
        error instanceof Error ? error.message : "Error al cargar la inmobiliaria."
      );
    }
  }, [agencyId]);

  const handleSelectSection = useCallback((section: PanelSection) => {
    setActiveSection(section);
    if (section === "profile") {
      setAgencyProfileTab("data");
    }
    setSidebarOpen(false);
  }, []);

  useEffect(() => {
    if (activeSection === "listings") {
      void loadProperties();
    }
  }, [activeSection, loadProperties]);

  useEffect(() => {
    if (activeSection !== "requests") {
      return;
    }
    void loadRequests();
  }, [activeSection, loadRequests]);

  useEffect(() => {
    if (activeSection !== "my-requests") {
      return;
    }
    void loadMyRequests();
  }, [activeSection, loadMyRequests]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get("tab");
    const requestId = params.get("requestId");
    if (tab === "profile") {
      setActiveSection("profile");
      setAgencyProfileTab("data");
      setPendingRequestId(null);
      return;
    }
    if (tab === "listings") {
      setActiveSection("listings");
      setPendingRequestId(null);
      return;
    }
    if (tab === "my-requests") {
      setActiveSection("my-requests");
      setPendingRequestId(null);
      return;
    }
    if (tab === "requests" || requestId) {
      setActiveSection("requests");
      setPendingRequestId(requestId);
    }
  }, [location.search]);

  useEffect(() => {
    if (!pendingRequestId || requestStatus !== "idle") {
      return;
    }
    const run = async () => {
      const match = contactRequests.find((item) => item.id === pendingRequestId);
      if (match) {
      setSelectedRequest(match);
      setRequestDetailOpen(true);
      setHighlightRequestId(match.id);
      setHighlightFlash((prev) => !prev);
      setHighlightPulse(false);
      setPendingRequestId(null);
      return;
    }
    const detail = await loadRequestDetail(pendingRequestId);
    if (detail) {
      setSelectedRequest(detail);
      setRequestDetailOpen(true);
      setHighlightRequestId(detail.id);
      setHighlightFlash((prev) => !prev);
      setHighlightPulse(false);
    } else {
      addToast("No encontramos esa solicitud.", "warning");
    }
    setPendingRequestId(null);
    };
    void run();
  }, [pendingRequestId, requestStatus, contactRequests, addToast, loadRequestDetail]);

  useEffect(() => {
    if (!highlightRequestId) return;
    const timeout = setTimeout(() => setHighlightRequestId(null), 5000);
    return () => clearTimeout(timeout);
  }, [highlightRequestId]);

  useEffect(() => {
    if (!highlightRequestId) return;
    const timeout = setTimeout(() => setHighlightPulse(true), 120);
    return () => clearTimeout(timeout);
  }, [highlightRequestId, highlightFlash]);

  useEffect(() => {
    if (!highlightRequestId) return;
    const timeout = setTimeout(() => {
      const el = document.querySelector(
        `[data-request-id="${highlightRequestId}"]`
      ) as HTMLElement | null;
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    return () => clearTimeout(timeout);
  }, [highlightRequestId, highlightFlash]);


  useEffect(() => {
    if (isAgency && agencyId) {
      void loadAgency();
    }
  }, [agencyId, isAgency, loadAgency]);

  useEffect(() => {
    const loadOwner = async () => {
      if (!ownerUserId) {
        return;
      }
      setOwnerStatus("loading");
      setOwnerError("");
      try {
        const response = await fetch(`${env.apiUrl}/users/${ownerUserId}`, {
          headers: {
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
        });

        if (!response.ok) {
          throw new Error("No pudimos cargar tu perfil.");
        }
        const data = (await response.json()) as {
          name?: string | null;
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
          dni?: string | null;
          phone?: string | null;
          address?: string | null;
          avatarUrl?: string | null;
          showOwnerNamePublic?: boolean | null;
          ownerProfile?: {
            dniTramite?: string | null;
            birthDate?: string | null;
          } | null;
        };
        const fullName = (data.name ?? "").trim();
        if (data.firstName || data.lastName) {
          setOwnerFirstName(data.firstName ?? "");
          setOwnerLastName(data.lastName ?? "");
        } else {
          const [first = "", ...rest] = fullName.split(/\s+/).filter(Boolean);
          setOwnerFirstName(first);
          setOwnerLastName(rest.join(" "));
        }
        setOwnerName(data.name ?? "");
        setOwnerEmail(data.email ?? "");
        setOwnerDni(data.dni ?? "");
        setOwnerPhone(data.phone ?? "");
        setOwnerAddress(data.address ?? "");
        setOwnerAvatarUrl(data.avatarUrl ?? "");
        setOwnerShowNamePublic(Boolean(data.showOwnerNamePublic));
        setOwnerDniTramite(data.ownerProfile?.dniTramite ?? "");
        setOwnerBirthDate(
          data.ownerProfile?.birthDate
            ? new Date(data.ownerProfile.birthDate).toISOString().slice(0, 10)
            : ""
        );
        setOwnerStatus("idle");
      } catch (error) {
        setOwnerStatus("error");
        setOwnerError(
          error instanceof Error ? error.message : "Error al cargar tu perfil."
        );
      }
    };
    if (isOwner && ownerUserId) {
      void loadOwner();
    }
  }, [isOwner, ownerUserId, sessionToken]);

  const updateStatus = async (propertyId: string, nextStatus: string) => {
    try {
      await fetch(`${env.apiUrl}/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadProperties();
    } catch (error) {
      setPropertyStatus("error");
      setPropertyError("No pudimos actualizar el estado.");
    }
  };

  const openEditFromList = (item: PropertyApiListItem) => {
    navigate(`/publicar/${item.id}/editar`);
  };

  const openPublicFromList = async (item: PropertyApiListItem) => {
    setPublicStatus("loading");
    setPublicError("");
    try {
      const response = await fetch(`${env.apiUrl}/properties/${item.id}`);
      if (!response.ok) {
        throw new Error("No pudimos cargar la propiedad.");
      }
      const data = (await response.json()) as PropertyApiDetail;
      setSelectedItem(data);
      setShowPublicModal(true);
      setPublicStatus("idle");
    } catch (error) {
      setPublicStatus("error");
      const message =
        error instanceof Error ? error.message : "Error al cargar la propiedad."
      setPublicError(message);
      addToast(message, "error");
    }
  };

  const openQuickEditFromList = async (item: PropertyApiListItem) => {
    setSidebarOpen(false);
    setQuickEditOpen(true);
    setQuickEditStatus("loading");
    setQuickEditError("");
    try {
      const response = await fetch(`${env.apiUrl}/properties/${item.id}`, {
        headers: {
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
      });
      if (!response.ok) {
        throw new Error("No pudimos cargar la publicación.");
      }
      const data = (await response.json()) as PropertyApiDetail;
      const features =
        data.features && typeof data.features === "object"
          ? (data.features as Record<string, unknown>)
          : {};
      const operationType = (data.operationType ?? "SALE") as "SALE" | "RENT" | "TEMPORARY";
      const allowedStatuses = quickEditStatusOptionsByOperation[operationType] ?? statusOptions;
      const defaultStatus = data.status && allowedStatuses.includes(data.status) ? data.status : "ACTIVE";

      setQuickEditItem(data);
      setQuickEditOperationType(operationType);
      setQuickEditPriceAmount(String(data.priceAmount ?? ""));
      setQuickEditPriceCurrency((data.priceCurrency ?? "ARS") as "ARS" | "USD");
      setQuickEditStatusValue(defaultStatus);
      setQuickEditPermutaAccepted(Boolean(features.permutaAccepted));
      setQuickEditPermutaReason(
        typeof features.permutaReason === "string" ? features.permutaReason : ""
      );
      const rentalRequirements =
        features.rentalRequirements && typeof features.rentalRequirements === "object"
          ? (features.rentalRequirements as Record<string, unknown>)
          : {};
      setQuickEditRentGuarantees(
        typeof rentalRequirements.guarantees === "string"
          ? rentalRequirements.guarantees
          : ""
      );
      setQuickEditRentEntryMonths(
        rentalRequirements.entryMonths !== undefined &&
          rentalRequirements.entryMonths !== null
          ? String(rentalRequirements.entryMonths)
          : ""
      );
      setQuickEditRentContractDuration(
        rentalRequirements.contractDurationMonths !== undefined &&
          rentalRequirements.contractDurationMonths !== null
          ? String(rentalRequirements.contractDurationMonths)
          : ""
      );
      setQuickEditRentIndexFrequency(
        typeof rentalRequirements.indexFrequency === "string"
          ? rentalRequirements.indexFrequency
          : ""
      );
      setQuickEditRentIndexType(
        typeof rentalRequirements.indexType === "string" ? rentalRequirements.indexType : ""
      );
      setQuickEditRentIndexValue(
        rentalRequirements.indexValue !== undefined && rentalRequirements.indexValue !== null
          ? String(rentalRequirements.indexValue)
          : ""
      );
      setQuickEditRentInfoPublic(
        typeof rentalRequirements.isPublic === "boolean" ? rentalRequirements.isPublic : true
      );
      setQuickEditOperationReason("");
      setQuickEditStatus("idle");
    } catch (error) {
      setQuickEditStatus("error");
      setQuickEditError(
        error instanceof Error ? error.message : "No pudimos abrir la edición rápida."
      );
    }
  };

  const closeQuickEdit = () => {
    setQuickEditOpen(false);
    setQuickEditStatus("idle");
    setQuickEditError("");
    setQuickEditItem(null);
    setQuickEditOperationReason("");
    setQuickEditRentGuarantees("");
    setQuickEditRentEntryMonths("");
    setQuickEditRentContractDuration("");
    setQuickEditRentIndexFrequency("");
    setQuickEditRentIndexType("");
    setQuickEditRentIndexValue("");
    setQuickEditRentInfoPublic(true);
  };

  useEffect(() => {
    if (!quickEditOpen) return;
    const allowedStatuses =
      quickEditStatusOptionsByOperation[quickEditOperationType] ?? statusOptions;
    if (!allowedStatuses.includes(quickEditStatusValue)) {
      setQuickEditStatusValue("ACTIVE");
    }
    if (quickEditOperationType !== "SALE") {
      setQuickEditPermutaAccepted(false);
      setQuickEditPermutaReason("");
    }
  }, [quickEditOpen, quickEditOperationType, quickEditStatusValue]);

  const saveQuickEdit = async () => {
    if (!quickEditItem) {
      return;
    }
    const parsedPrice = Number(quickEditPriceAmount);
    if (!Number.isFinite(parsedPrice) || parsedPrice <= 0) {
      setQuickEditStatus("error");
      setQuickEditError("El precio debe ser un número mayor a cero.");
      return;
    }
    const isOperationChanged = quickEditOperationType !== quickEditItem.operationType;
    if (isOperationChanged && quickEditOperationReason.trim().length < 4) {
      setQuickEditStatus("error");
      setQuickEditError("Indica por qué cambiaste la operación (mínimo 4 caracteres).");
      return;
    }
    if (quickEditOperationType === "SALE" && quickEditPermutaAccepted && quickEditPermutaReason.trim().length < 4) {
      setQuickEditStatus("error");
      setQuickEditError("Indica el motivo/condiciones de la permuta (mínimo 4 caracteres).");
      return;
    }

    setQuickEditStatus("saving");
    setQuickEditError("");
    try {
      const baseFeatures =
        quickEditItem.features && typeof quickEditItem.features === "object"
          ? { ...(quickEditItem.features as Record<string, unknown>) }
          : {};

      if (quickEditOperationType === "SALE") {
        baseFeatures.permutaAccepted = quickEditPermutaAccepted;
        if (quickEditPermutaAccepted) {
          baseFeatures.permutaReason = quickEditPermutaReason.trim();
        } else {
          delete baseFeatures.permutaReason;
        }
      } else {
        baseFeatures.permutaAccepted = false;
        delete baseFeatures.permutaReason;
      }

      if (quickEditOperationType === "RENT") {
        baseFeatures.rentalRequirements = {
          guarantees: quickEditRentGuarantees.trim() || undefined,
          entryMonths: quickEditRentEntryMonths ? Number(quickEditRentEntryMonths) : undefined,
          contractDurationMonths: quickEditRentContractDuration
            ? Number(quickEditRentContractDuration)
            : undefined,
          indexFrequency: quickEditRentIndexFrequency || undefined,
          indexType: quickEditRentIndexType || undefined,
          indexValue: quickEditRentIndexValue ? Number(quickEditRentIndexValue) : undefined,
          isPublic: quickEditRentInfoPublic,
        };
      } else {
        delete baseFeatures.rentalRequirements;
      }

      if (isOperationChanged) {
        baseFeatures.previousOperationType = quickEditItem.operationType;
        baseFeatures.operationChangeReason = quickEditOperationReason.trim();
      } else {
        delete baseFeatures.operationChangeReason;
      }

      const updateResponse = await fetch(`${env.apiUrl}/properties/${quickEditItem.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          operationType: quickEditOperationType,
          priceAmount: parsedPrice,
          priceCurrency: quickEditPriceCurrency,
          features: baseFeatures,
        }),
      });
      if (!updateResponse.ok) {
        const body = await updateResponse.json().catch(() => null);
        throw new Error(body?.message ?? "No pudimos guardar la edición rápida.");
      }

      if (quickEditStatusValue !== quickEditItem.status) {
        const statusResponse = await fetch(`${env.apiUrl}/properties/${quickEditItem.id}/status`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
          },
          body: JSON.stringify({ status: quickEditStatusValue }),
        });
        if (!statusResponse.ok) {
          const body = await statusResponse.json().catch(() => null);
          throw new Error(body?.message ?? "No pudimos actualizar el estado.");
        }
      }

      await loadProperties();
      addToast("Edición rápida guardada.", "success");
      closeQuickEdit();
    } catch (error) {
      setQuickEditStatus("error");
      setQuickEditError(
        error instanceof Error ? error.message : "No pudimos guardar la edición rápida."
      );
    }
  };

  const openRequestPropertyDetail = async (propertyId: string) => {
    setRequestPreviewStatus("loading");
    setRequestPreviewError("");
    try {
      const response = await fetch(`${env.apiUrl}/properties/${propertyId}`);
      if (!response.ok) {
        throw new Error("No pudimos cargar la ficha.");
      }
      const data = (await response.json()) as PropertyApiDetail;
      setRequestPreviewListing(mapPropertyToDetailListing(data));
      setRequestPreviewStatus("idle");
    } catch (error) {
      setRequestPreviewStatus("error");
      setRequestPreviewError(
        error instanceof Error ? error.message : "No pudimos cargar la ficha."
      );
    }
  };

  const closeRequestPropertyDetail = () => {
    setRequestPreviewListing(null);
    setRequestPreviewStatus("idle");
    setRequestPreviewError("");
  };

  const saveAgency = async () => {
    if (!agencyId) {
      return;
    }

    const normalizedHeroColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(agencyHeroColor.trim())
      ? agencyHeroColor.trim()
      : undefined;
    const normalizedContactCardColor = /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(
      agencyContactCardColor.trim()
    )
      ? agencyContactCardColor.trim()
      : undefined;
    const normalizedContactCardOpacity = Math.max(
      0,
      Math.min(100, Number.isFinite(agencyContactCardOpacity) ? agencyContactCardOpacity : 35)
    );
    const normalizedHeroOpacity = Math.max(
      0,
      Math.min(100, Number.isFinite(agencyHeroImageOpacity) ? agencyHeroImageOpacity : 45)
    );

    setAgencyStatus("saving");
    setAgencyError("");

    try {
      const response = await fetch(`${env.apiUrl}/agencies/${agencyId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          name: agencyName,
          phone: agencyPhone || undefined,
          address: agencyAddress || undefined,
          about: agencyAbout || undefined,
          whatsapp: agencyWhatsapp || undefined,
          website: agencyWebsite || undefined,
          instagram: agencyInstagram || undefined,
          facebook: agencyFacebook || undefined,
          logo: agencyLogo || undefined,
          heroColor: normalizedHeroColor,
          heroImage: agencyHeroImage || undefined,
          heroImagePosition: agencyHeroImagePosition,
          heroImageOpacity: normalizedHeroOpacity,
          contactCardColor: normalizedContactCardColor,
          contactCardOpacity: normalizedContactCardOpacity,
          lat: agencyLat ?? null,
          lng: agencyLng ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error("No pudimos guardar los datos.");
      }

      setAgencyStatus("idle");
      if (agencyProfileTab === "data") {
        setAgencyProfileTab("styles");
        addToast("Datos guardados. Ahora puedes ajustar estilos.", "success");
      } else {
        addToast("Perfil actualizado.", "success");
      }
      setIsDirty(false);
    } catch (error) {
      setAgencyStatus("error");
      setAgencyError(
        error instanceof Error ? error.message : "Error al guardar la inmobiliaria."
      );
      addToast("No pudimos guardar el perfil.", "error");
    }
  };

  const searchAgencyLocation = async () => {
    const query = agencyMapQuery.trim() || agencyAddress.trim();
    if (!query) {
      setAgencyGeoStatus("error");
      setAgencyGeoMessage("Ingresa una direccion para ubicar la inmobiliaria.");
      return;
    }
    setAgencyGeoStatus("loading");
    setAgencyGeoMessage("");
    try {
      const result = await geocodeAddress(query);
      setAgencyLat(result.lat);
      setAgencyLng(result.lng);
      const locationParts = [result.locality, result.party, result.province].filter(
        (part, index, arr) => Boolean(part) && arr.indexOf(part) === index
      ) as string[];
      const formattedAddress = [result.addressLine || result.displayName, locationParts.join(", ")]
        .filter(Boolean)
        .join(" - ");
      setAgencyAddress(formattedAddress || result.displayName);
      setAgencyMapQuery(formattedAddress || result.displayName);
      setAgencyGeoStatus("idle");
      setAgencyGeoMessage("Ubicacion encontrada. Ajusta el punto en el mapa si hace falta.");
    } catch (error) {
      setAgencyGeoStatus("error");
      setAgencyGeoMessage(
        error instanceof Error ? error.message : "No pudimos buscar la direccion."
      );
    }
  };

  const handleAgencyMapPointChange = async (nextLat: number, nextLng: number) => {
    setAgencyLat(nextLat);
    setAgencyLng(nextLng);
    setAgencyGeoStatus("loading");
    setAgencyGeoMessage("Buscando direccion del punto...");
    try {
      const result = await reverseGeocode(nextLat, nextLng);
      const locationParts = [result.locality, result.party, result.province].filter(
        (part, index, arr) => Boolean(part) && arr.indexOf(part) === index
      ) as string[];
      const formattedAddress = [result.addressLine || result.displayName, locationParts.join(", ")]
        .filter(Boolean)
        .join(" - ");
      setAgencyAddress(formattedAddress || result.displayName);
      setAgencyMapQuery(formattedAddress || result.displayName);
      setAgencyGeoStatus("idle");
      setAgencyGeoMessage("Direccion actualizada desde el mapa.");
    } catch {
      setAgencyGeoStatus("error");
      setAgencyGeoMessage(
        "No pudimos resolver la direccion exacta, pero guardamos el punto del mapa."
      );
    }
  };

  const updateRequestStatus = async (id: string, status: "NEW" | "CONTACTED" | "CLOSED") => {
    if (!sessionToken) {
      setRequestStatus("error");
      setRequestError("Necesitas iniciar sesión.");
      return;
    }
    try {
      const response = await fetch(`${env.apiUrl}/contact-requests/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({ status }),
      });
      if (!response.ok) {
        throw new Error("No pudimos actualizar la solicitud.");
      }
      setContactRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status } : item))
      );
    } catch (error) {
      setRequestStatus("error");
      setRequestError(
        error instanceof Error ? error.message : "No pudimos actualizar la solicitud."
      );
    }
  };

  const saveOwner = async () => {
    if (!ownerUserId) {
      return;
    }
    const ownerFullName = [ownerFirstName.trim(), ownerLastName.trim()]
      .filter(Boolean)
      .join(" ")
      .trim();
    setOwnerStatus("saving");
    setOwnerError("");
    try {
      const response = await fetch(`${env.apiUrl}/users/${ownerUserId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {}),
        },
        body: JSON.stringify({
          name: ownerFullName || ownerName,
          email: ownerEmail,
          phone: ownerPhone || undefined,
          address: ownerAddress || undefined,
          avatarUrl: ownerAvatarUrl ? ownerAvatarUrl : null,
          showOwnerNamePublic: ownerShowNamePublic,
          password: ownerPassword || undefined,
          ownerDniTramite: ownerDniTramite || undefined,
          ownerBirthDate: ownerBirthDate || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error("No pudimos guardar tu perfil.");
      }
      setOwnerPassword("");
      setOwnerStatus("idle");
      const currentUser = getSessionUser();
      if (currentUser && currentUser.id === ownerUserId) {
        localStorage.setItem(
          "alquila_user",
          JSON.stringify({
            ...currentUser,
            name: ownerFullName || ownerName,
            email: ownerEmail,
            avatarUrl: ownerAvatarUrl || null,
            showOwnerNamePublic: ownerShowNamePublic,
          })
        );
      }
      addToast("Perfil actualizado.", "success");
      setIsDirty(false);
    } catch (error) {
      setOwnerStatus("error");
      setOwnerError(
        error instanceof Error ? error.message : "Error al guardar tu perfil."
      );
      addToast("No pudimos guardar tu perfil.", "error");
    }
  };

  const sendRentalRequirements = async (id: string) => {
    if (!sessionToken) {
      addToast("Necesitas iniciar sesión.", "error");
      return;
    }
    try {
      const response = await fetch(
        `${env.apiUrl}/contact-requests/${id}/send-requirements`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${sessionToken}`,
          },
        }
      );
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "No pudimos enviar los requisitos.");
      }
      setContactRequests((prev) =>
        prev.map((item) => (item.id === id ? { ...item, status: "CONTACTED" } : item))
      );
      addToast("Requisitos enviados al solicitante.", "success");
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "No pudimos enviar los requisitos.",
        "error"
      );
    }
  };

  const publicListing = useMemo(
    () => (selectedItem ? mapPropertyToDetailListing(selectedItem) : null),
    [selectedItem]
  );

  const sectionMeta: Record<
    PanelSection,
    { badge: string; title: string; description: string }
  > = {
    profile: {
      badge: "Perfil",
      title: isAgency ? "Perfil de inmobiliaria" : "Perfil de dueño directo",
      description: isAgency
        ? "Configura identidad, canales y hero público de tu agencia."
        : "Gestiona tus datos personales y de contacto.",
    },
    listings: {
      badge: "Publicaciones",
      title: "Mis inmuebles",
      description: "Edita, pausa y controla el estado de tus publicaciones.",
    },
    requests: {
      badge: "Gestión",
      title: "Solicitudes de contacto",
      description: "Responde consultas y seguimiento comercial desde un solo lugar.",
    },
    "my-requests": {
      badge: "Actividad",
      title: "Mis solicitudes",
      description: "Revisa el estado de tus consultas y conversaciones abiertas.",
    },
  };
  const currentSectionMeta = sectionMeta[activeSection];
  const isPremiumPanelHero =
    activeSection === "profile" || activeSection === "listings" || activeSection === "requests";
  const isProfileHero = activeSection === "profile";
  const premiumHeroTitle = isProfileHero
    ? isAgency
      ? "Tu marca inmobiliaria, clara y confiable"
      : "Tu perfil de dueño, listo para convertir"
    : activeSection === "listings"
    ? "Gestioná tus inmuebles con foco comercial"
    : "Respondé solicitudes sin perder contexto";
  const premiumHeroDescription = isProfileHero
    ? isAgency
      ? "Mostrá identidad, canales de contacto y una presencia profesional para reforzar confianza."
      : "Configurá tus datos públicos y privados para publicar con mejor presentación y contacto más rápido."
    : activeSection === "listings"
    ? "Controlá estados, ediciones y publicaciones desde un flujo más claro, rápido y ordenado."
    : "Centralizá consultas, seguimiento y contacto con interesados desde un solo lugar.";
  const sidebarButtonClass = (section: PanelSection) =>
    activeSection === section
      ? "w-full rounded-2xl border border-[#AF8C5C]/55 bg-gradient-to-r from-[#AF8C5C]/25 to-[#D1C7BD]/20 px-3 py-2 text-left text-white shadow-[0_8px_24px_rgba(175,140,92,0.18)]"
      : "w-full rounded-2xl border border-white/10 bg-night-900/32 px-3 py-2 text-left text-[#E7E2DD] hover:border-white/20";
  const agencyInputClass =
    "w-full rounded-2xl border border-white/15 bg-night-900/62 px-3 py-2.5 text-sm text-white placeholder:text-[#9a948a]";
  const agencyProfileStep = agencyProfileTab === "data" ? 1 : 2;

  return (
    <div className="relative" onChange={() => setIsDirty(true)}>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-[1250] bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <section
        className={`relative overflow-hidden rounded-[30px] border border-white/10 p-4 sm:p-5 md:p-7 lg:-mt-8 xl:-mt-10 ${
          isPremiumPanelHero ? "bg-night-900/78" : "bg-night-900/72"
        }`}
      >
        {isPremiumPanelHero && (
          <>
            <div className="pointer-events-none absolute inset-0 bg-hero bg-cover bg-center opacity-20" />
            <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(120deg,rgba(12,16,28,0.92)_0%,rgba(12,16,28,0.78)_50%,rgba(12,16,28,0.9)_100%)]" />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(175,140,92,0.28),transparent_45%),radial-gradient(circle_at_78%_26%,rgba(108,141,255,0.18),transparent_44%)]" />
          </>
        )}
        {!isPremiumPanelHero && (
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(175,140,92,0.28),transparent_42%),radial-gradient(circle_at_85%_75%,rgba(209,199,189,0.18),transparent_48%)]" />
        )}
        <div
          className={`relative flex flex-wrap gap-4 ${
            isPremiumPanelHero
              ? "min-h-[210px] flex-col items-center justify-center text-center sm:min-h-[230px] md:min-h-[250px]"
              : "items-end justify-between"
          }`}
        >
          <div
            className={`space-y-2 ${
              isPremiumPanelHero ? "mx-auto max-w-3xl text-center" : "max-w-2xl"
            }`}
          >
            <span className="inline-flex items-center rounded-full border border-[#AF8C5C]/45 bg-[#AF8C5C]/14 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E7E2DD]">
              {currentSectionMeta.badge}
            </span>
            <h2
              className={`text-white ${
                isPremiumPanelHero ? "text-2xl sm:text-3xl md:text-4xl" : "text-3xl md:text-4xl"
              }`}
            >
              {isPremiumPanelHero ? premiumHeroTitle : currentSectionMeta.title}
            </h2>
            <p
              className={`text-[#D1C7BD] ${
                isPremiumPanelHero ? "max-w-2xl text-sm md:text-base" : "text-sm"
              }`}
            >
              {isPremiumPanelHero ? premiumHeroDescription : currentSectionMeta.description}
            </p>
            {isPremiumPanelHero && (
              <div className="hidden sm:flex flex-wrap justify-center gap-2 pt-1">
                {activeSection === "profile" && (
                  <>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Perfil público
                    </span>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Contacto directo
                    </span>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Confianza local
                    </span>
                  </>
                )}
                {activeSection === "listings" && (
                  <>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Estados
                    </span>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Edición rápida
                    </span>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Vista pública
                    </span>
                  </>
                )}
                {activeSection === "requests" && (
                  <>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Consultas
                    </span>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Seguimiento
                    </span>
                    <span className="rounded-full border border-white/10 bg-night-900/45 px-3 py-1 text-xs text-[#E7E2DD]">
                      Conversación
                    </span>
                  </>
                )}
              </div>
            )}
          </div>
          <div
            className={`flex items-center gap-2 ${
              isPremiumPanelHero ? "mx-auto w-full flex-col justify-center gap-2 sm:self-auto" : ""
            }`}
          >
            <span className="rounded-full border border-white/15 bg-night-900/50 px-3 py-1 text-xs text-[#E7E2DD]">
              Cuenta: {roleLabel}
            </span>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-full border border-gold-400/50 bg-gold-500/20 px-4 py-2 text-xs font-semibold text-gold-100 shadow-[0_0_0_1px_rgba(209,164,102,0.25)] lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <svg
                aria-hidden="true"
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-4 w-4"
              >
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
              Menu
            </button>
          </div>
        </div>
        {isAgency && !agencyId && (
          <p className="relative mt-4 text-xs text-[#AF8C5C]">
            Falta asociar una inmobiliaria a tu usuario.
          </p>
        )}
      </section>
      <div className="mt-5 grid items-start gap-5 md:mt-6 md:gap-6 lg:grid-cols-[220px_1fr]">
        <aside
          className={`glass-card fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] left-3 top-4 z-[1300] max-h-[calc(100svh-6.75rem-env(safe-area-inset-bottom))] w-[min(82vw,260px)] space-y-2 overflow-y-auto overscroll-contain p-4 text-sm text-[#E7E2DD] transition-transform lg:static lg:bottom-auto lg:left-auto lg:top-auto lg:z-auto lg:h-fit lg:max-h-none lg:w-auto lg:translate-x-0 lg:overflow-visible ${
            sidebarOpen ? "translate-x-0" : "-translate-x-[calc(100%+2rem)]"
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">Panel</div>
            <button
              type="button"
              className="rounded-full border border-white/20 px-2 py-1 text-[10px] text-[#E7E2DD] lg:hidden"
              onClick={() => setSidebarOpen(false)}
            >
              Cerrar
            </button>
          </div>
          <button
            type="button"
            onClick={() => handleSelectSection("profile")}
            className={sidebarButtonClass("profile")}
          >
            {isAgency ? "Perfil inmobiliaria" : "Perfil dueño"}
          </button>
          <button
            type="button"
            onClick={() => handleSelectSection("listings")}
            className={sidebarButtonClass("listings")}
          >
            Mis inmuebles
          </button>
          <button
            type="button"
            onClick={() => handleSelectSection("requests")}
            className={sidebarButtonClass("requests")}
          >
            Solicitudes
          </button>
          {sessionUser?.role === "VISITOR" && (
            <button
              type="button"
              onClick={() => handleSelectSection("my-requests")}
              className={sidebarButtonClass("my-requests")}
            >
              Mis solicitudes
            </button>
          )}
      </aside>

      <div className="space-y-6 md:space-y-8">

      {activeSection === "profile" && isAgency && (
        <div className="glass-card space-y-6 p-6 md:p-7">
          <div className="rounded-2xl border border-white/10 bg-night-900/45 p-4">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#AF8C5C]">
              Perfil público inmobiliaria
            </p>
            <p className="mt-1 text-xs text-[#D1C7BD]">
              Completa estos datos para reforzar marca, confianza y contacto directo.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Perfil de inmobiliaria</h3>
              <p className="text-xs text-[#D1C7BD]">
                Edita los datos que veran tus clientes.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] disabled:opacity-50"
                type="button"
                onClick={() => {
                  if (!agencyId) return;
                  window.open(`/agencia/${agencyId}`, "_blank", "noopener,noreferrer");
                }}
                disabled={!agencyId}
              >
                Ver perfil
              </button>
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                type="button"
                onClick={saveAgency}
                disabled={agencyStatus === "saving" || !agencyId}
              >
                {agencyStatus === "saving" ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          </div>

          {!agencyId && (
            <p className="text-xs text-[#AF8C5C]">
              Necesitamos asociar tu usuario a una inmobiliaria.
            </p>
          )}

          {agencyStatus === "loading" && (
            <p className="text-xs text-[#D1C7BD]">Cargando datos...</p>
          )}
          {agencyStatus === "error" && (
            <p className="text-xs text-[#AF8C5C]">{agencyError}</p>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-xs transition ${
                  agencyProfileTab === "data"
                    ? "border border-[#AF8C5C]/55 bg-[#AF8C5C]/20 text-white"
                    : "border border-white/20 text-[#E7E2DD]"
                }`}
                onClick={() => setAgencyProfileTab("data")}
              >
                Datos del perfil
              </button>
              <button
                type="button"
                className={`rounded-full px-4 py-2 text-xs transition ${
                  agencyProfileTab === "styles"
                    ? "border border-[#AF8C5C]/55 bg-[#AF8C5C]/20 text-white"
                    : "border border-white/20 text-[#E7E2DD]"
                }`}
                onClick={() => setAgencyProfileTab("styles")}
              >
                Estilos del perfil
              </button>
            </div>
            <span className="rounded-full border border-white/15 bg-night-900/55 px-3 py-1 text-[11px] uppercase tracking-[0.12em] text-[#D1C7BD]">
              Paso {agencyProfileStep}/2
            </span>
          </div>

          {agencyProfileTab === "data" && (
            <>
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Nombre comercial
                  <input
                    className={agencyInputClass}
                    value={agencyName}
                    onChange={(event) => setAgencyName(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Razon social
                  {lockIcon}
                  <input
                    className={`${agencyInputClass} bg-night-900/35 text-white/80`}
                    value={agencyLegalName}
                    readOnly
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  CUIT
                  {lockIcon}
                  <input
                    className={`${agencyInputClass} bg-night-900/35 text-white/80`}
                    value={agencyCuit}
                    readOnly
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Matrícula
                  {lockIcon}
                  <input
                    className={`${agencyInputClass} bg-night-900/35 text-white/80`}
                    value={agencyLicenseNumber}
                    readOnly
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Telefono
                  <input
                    className={agencyInputClass}
                    value={agencyPhone}
                    onChange={(event) => setAgencyPhone(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Domicilio
                  <input
                    className={agencyInputClass}
                    value={agencyAddress}
                    onChange={(event) => setAgencyAddress(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  WhatsApp
                  <input
                    className={agencyInputClass}
                    value={agencyWhatsapp}
                    onChange={(event) => setAgencyWhatsapp(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Email
                  {lockIcon}
                  <input
                    className={`${agencyInputClass} bg-night-900/35 text-white/80`}
                    value={agencyEmail}
                    readOnly
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Web
                  <input
                    className={agencyInputClass}
                    value={agencyWebsite}
                    onChange={(event) => setAgencyWebsite(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Instagram
                  <input
                    className={agencyInputClass}
                    value={agencyInstagram}
                    onChange={(event) => setAgencyInstagram(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Facebook
                  <input
                    className={agencyInputClass}
                    value={agencyFacebook}
                    onChange={(event) => setAgencyFacebook(event.target.value)}
                    placeholder="https://facebook.com/tu-inmobiliaria"
                  />
                </label>
              </div>

              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Quienes somos
                <textarea
                  rows={3}
                  className={agencyInputClass}
                  value={agencyAbout}
                  onChange={(event) => setAgencyAbout(event.target.value)}
                />
              </label>

              <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/40 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.12em] text-[#D1C7BD]">
                    Ubicacion en mapa de la inmobiliaria
                  </p>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                    onClick={() => {
                      setAgencyLat(undefined);
                      setAgencyLng(undefined);
                      setAgencyGeoStatus("idle");
                      setAgencyGeoMessage("");
                    }}
                  >
                    Limpiar punto
                  </button>
                </div>
                <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                  <input
                    className={agencyInputClass}
                    value={agencyMapQuery}
                    onChange={(event) => setAgencyMapQuery(event.target.value)}
                    placeholder="Ej: San Martin 123, Bragado, Buenos Aires"
                  />
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                    onClick={() => void searchAgencyLocation()}
                    disabled={agencyGeoStatus === "loading"}
                  >
                    {agencyGeoStatus === "loading" ? "Buscando..." : "Buscar direccion"}
                  </button>
                </div>
                {agencyGeoMessage && (
                  <p
                    className={`text-xs ${
                      agencyGeoStatus === "error" ? "text-[#AF8C5C]" : "text-[#D1C7BD]"
                    }`}
                  >
                    {agencyGeoMessage}
                  </p>
                )}
                <EditLocationPicker
                  lat={agencyLat}
                  lng={agencyLng}
                  onChange={(nextLat, nextLng) => {
                    void handleAgencyMapPointChange(nextLat, nextLng);
                  }}
                />
                <div className="flex flex-wrap gap-3 text-xs text-[#D1C7BD]">
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    Lat: {typeof agencyLat === "number" ? agencyLat.toFixed(6) : "-"}
                  </span>
                  <span className="rounded-full border border-white/10 px-3 py-1">
                    Lng: {typeof agencyLng === "number" ? agencyLng.toFixed(6) : "-"}
                  </span>
                </div>
              </div>
            </>
          )}

          {agencyProfileTab === "styles" && (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
                <div>Vista previa del hero</div>
                <div
                  className="relative overflow-hidden rounded-2xl border border-white/10 p-5"
                  style={{ backgroundColor: agencyHeroColor || "#4b70e7" }}
                >
                  {agencyHeroImage && (
                    <img
                      src={agencyHeroImage}
                      alt="Vista previa"
                      className={`absolute inset-0 h-full w-full object-cover ${
                        agencyHeroImagePosition === "top"
                          ? "object-top"
                          : agencyHeroImagePosition === "bottom"
                          ? "object-bottom"
                          : "object-center"
                      }`}
                      style={{ opacity: Math.max(0, Math.min(100, agencyHeroImageOpacity)) / 100 }}
                    />
                  )}
                  <div className="absolute inset-0 bg-black/35" />
                  <div className="relative flex items-center justify-between">
                    <div>
                      <p className="text-[11px] uppercase tracking-[0.14em] text-white/75">
                        Hero publico
                      </p>
                      <p className="text-lg font-semibold text-white">{agencyName || "Tu inmobiliaria"}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/25 bg-white/10 text-xs font-semibold text-white">
                      {agencyLogo?.startsWith("data:") || agencyLogo?.startsWith("http") ? (
                        <img
                          src={agencyLogo}
                          alt="Logo"
                          className="h-10 w-10 rounded-xl object-cover"
                        />
                      ) : (
                        (agencyLogo || agencyName || "A")
                          .split(" ")
                          .map((part) => part.charAt(0))
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()
                      )}
                    </div>
                  </div>
                  <div className="relative mt-4 grid gap-2 sm:grid-cols-3">
                    {["Contacto", "Ubicacion", "Canales"].map((item) => (
                      <div
                        key={item}
                        className="rounded-xl border px-3 py-2 text-[11px] text-white/90"
                        style={{
                          borderColor: "rgba(255,255,255,0.24)",
                          backgroundColor: hexToRgba(
                            agencyContactCardColor || "#11275f",
                            Math.max(0, Math.min(100, agencyContactCardOpacity)) / 100
                          ),
                        }}
                      >
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-2 text-xs text-[#D1C7BD]">
                <div>Color del hero publico</div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded-lg border border-white/20 bg-transparent"
                    value={agencyHeroColor}
                    onChange={(event) => setAgencyHeroColor(event.target.value)}
                  />
                  <input
                    className={agencyInputClass}
                    value={agencyHeroColor}
                    onChange={(event) => setAgencyHeroColor(event.target.value)}
                    placeholder="#4b70e7"
                  />
                </div>
              </div>
              <div className="space-y-2 text-xs text-[#D1C7BD]">
                <div>Color de tarjetas de contacto</div>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    className="h-10 w-14 cursor-pointer rounded-lg border border-white/20 bg-transparent"
                    value={agencyContactCardColor}
                    onChange={(event) => setAgencyContactCardColor(event.target.value)}
                  />
                  <input
                    className={agencyInputClass}
                    value={agencyContactCardColor}
                    onChange={(event) => setAgencyContactCardColor(event.target.value)}
                    placeholder="#11275f"
                  />
                </div>
                <label className="mt-2 block space-y-2 text-xs text-[#D1C7BD]">
                  Opacidad tarjetas ({agencyContactCardOpacity}%)
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={1}
                    className="w-full accent-[#AF8C5C]"
                    value={agencyContactCardOpacity}
                    onChange={(event) => setAgencyContactCardOpacity(Number(event.target.value))}
                  />
                </label>
              </div>
              <div className="space-y-2 text-xs text-[#D1C7BD]">
                <div>Logo</div>
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15 text-sm font-semibold text-gold-200">
                    {agencyLogo?.startsWith("data:") || agencyLogo?.startsWith("http") ? (
                      <img
                        src={agencyLogo}
                        alt="Logo"
                        className="h-12 w-12 rounded-2xl object-cover"
                      />
                    ) : (
                      (agencyLogo || agencyName || "A")
                        .split(" ")
                        .map((part) => part.charAt(0))
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()
                    )}
                  </div>
                  <label className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]">
                    Subir logo
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setAgencyLogo(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                    onClick={() => setAgencyLogo("")}
                  >
                    Iniciales
                  </button>
                </div>
                <input
                  className={agencyInputClass}
                  value={agencyLogo}
                  onChange={(event) => setAgencyLogo(event.target.value)}
                  placeholder="URL del logo o texto corto"
                />
              </div>
              <div className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
                <div>Imagen de fondo del hero (opcional)</div>
                <div className="flex flex-wrap items-center gap-3">
                  {agencyHeroImage ? (
                    <img
                      src={agencyHeroImage}
                      alt="Hero"
                      className="h-16 w-28 rounded-xl border border-white/10 object-cover"
                    />
                  ) : (
                    <div className="flex h-16 w-28 items-center justify-center rounded-xl border border-dashed border-white/20 text-[11px] text-[#9a948a]">
                      Sin imagen
                    </div>
                  )}
                  <label className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]">
                    Subir imagen
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setAgencyHeroImage(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                    onClick={() => setAgencyHeroImage("")}
                  >
                    Quitar
                  </button>
                </div>
                <input
                  className={agencyInputClass}
                  value={agencyHeroImage}
                  onChange={(event) => setAgencyHeroImage(event.target.value)}
                  placeholder="URL de imagen para el hero"
                />
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Posicion de imagen
                    <select
                      className={agencyInputClass}
                      value={agencyHeroImagePosition}
                      onChange={(event) =>
                        setAgencyHeroImagePosition(
                          event.target.value as "top" | "center" | "bottom"
                        )
                      }
                    >
                      <option value="top">Arriba</option>
                      <option value="center">Centro</option>
                      <option value="bottom">Abajo</option>
                    </select>
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Opacidad de imagen ({agencyHeroImageOpacity}%)
                    <input
                      type="range"
                      min={0}
                      max={100}
                      step={1}
                      className="w-full accent-[#AF8C5C]"
                      value={agencyHeroImageOpacity}
                      onChange={(event) =>
                        setAgencyHeroImageOpacity(Number(event.target.value))
                      }
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeSection === "profile" && isOwner && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Perfil de dueño</h3>
              <p className="text-xs text-[#D1C7BD]">
                Actualiza tus datos personales y de contacto.
              </p>
            </div>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
              type="button"
              onClick={saveOwner}
              disabled={ownerStatus === "saving"}
            >
              {ownerStatus === "saving" ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>

          {ownerStatus === "loading" && (
            <p className="text-xs text-[#D1C7BD]">Cargando perfil...</p>
          )}
          {ownerStatus === "error" && (
            <p className="text-xs text-[#AF8C5C]">{ownerError}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/48 p-4 md:col-span-2">
              <div className="text-xs text-[#D1C7BD]">Avatar</div>
              <div className="flex flex-wrap items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-lg text-gold-200">
                  {ownerAvatarUrl?.startsWith("emoji:") ? (
                    <span>{ownerAvatarUrl.replace("emoji:", "")}</span>
                  ) : ownerAvatarUrl ? (
                    <img
                      src={ownerAvatarUrl}
                      alt="Avatar"
                      className="h-14 w-14 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-sm">
                      {([ownerFirstName, ownerLastName].filter(Boolean).join(" ") ||
                        ownerName ||
                        ownerEmail ||
                        "U")
                        .split(" ")
                        .map((part) => part.charAt(0))
                        .slice(0, 2)
                        .join("")
                        .toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {["🙂", "🏠", "⭐", "💬"].map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-night-900/48 text-base"
                      onClick={() => setOwnerAvatarUrl(`emoji:${emoji}`)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <label className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]">
                    Subir foto
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (!file) return;
                        const reader = new FileReader();
                        reader.onload = () => {
                          if (typeof reader.result === "string") {
                            setOwnerAvatarUrl(reader.result);
                          }
                        };
                        reader.readAsDataURL(file);
                      }}
                    />
                  </label>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                    onClick={() => setOwnerAvatarUrl("")}
                  >
                    Iniciales
                  </button>
                </div>
              </div>
            </div>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Nombre
              {lockIcon}
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
                value={ownerFirstName}
                readOnly
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Apellido
              {lockIcon}
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
                value={ownerLastName}
                readOnly
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Email
              {lockIcon}
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
                value={ownerEmail}
                readOnly
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              DNI
              {lockIcon}
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
                value={ownerDni}
                readOnly
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Telefono
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={ownerPhone}
                onChange={(event) => setOwnerPhone(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Direccion
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={ownerAddress}
                onChange={(event) => setOwnerAddress(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Nro de tramite
              {ownerDniTramite ? lockIcon : null}
              <input
                className={`w-full rounded-xl border border-white/10 px-3 py-2 text-sm ${
                  ownerDniTramite
                    ? "bg-night-900/35 text-white/80"
                    : "bg-night-900/48 text-white"
                }`}
                value={ownerDniTramite}
                onChange={(event) => setOwnerDniTramite(event.target.value)}
                readOnly={Boolean(ownerDniTramite)}
              />
              {ownerDniTramite ? (
                <p className="text-[11px] text-[#BFB8AD]">
                  Ya registrado. Este dato no se puede modificar.
                </p>
              ) : null}
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Fecha de nacimiento
              {ownerBirthDate ? lockIcon : null}
              <input
                type="date"
                className={`w-full rounded-xl border border-white/10 px-3 py-2 text-sm ${
                  ownerBirthDate
                    ? "bg-night-900/35 text-white/80"
                    : "bg-night-900/48 text-white"
                }`}
                value={ownerBirthDate}
                onChange={(event) => setOwnerBirthDate(event.target.value)}
                readOnly={Boolean(ownerBirthDate)}
              />
              {ownerBirthDate ? (
                <p className="text-[11px] text-[#BFB8AD]">
                  Ya registrada. Este dato no se puede modificar.
                </p>
              ) : null}
            </label>
            <label className="flex items-center gap-3 rounded-xl border border-white/10 bg-night-900/48 px-3 py-3 text-sm text-[#E7E2DD] md:col-span-2">
              <input
                type="checkbox"
                className="h-4 w-4 accent-[#AF8C5C]"
                checked={ownerShowNamePublic}
                onChange={(event) => setOwnerShowNamePublic(event.target.checked)}
              />
              Mostrar mi nombre y apellido en mis publicaciones
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
              Nueva contraseña
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={ownerPassword}
                onChange={(event) => setOwnerPassword(event.target.value)}
                placeholder="Dejar en blanco para no cambiar"
              />
            </label>
          </div>
        </div>
      )}

      {activeSection === "listings" && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
            <h3 className="text-lg text-white">Mis inmuebles</h3>
            <p className="text-xs text-[#D1C7BD]">Publicaciones creadas por tu cuenta.</p>
            </div>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
              type="button"
              onClick={loadProperties}
              disabled={propertyStatus === "loading"}
            >
              {propertyStatus === "loading" ? "Cargando..." : "Actualizar"}
            </button>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Tipo de inmueble
              <select
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
                value={propertyFilterType}
                onChange={(event) => {
                  setPropertyFilterType(event.target.value);
                }}
              >
                <option value="">Todos</option>
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Departamento</option>
                <option value="LAND">Terreno</option>
                <option value="FIELD">Campo</option>
                <option value="QUINTA">Quinta</option>
                <option value="COMMERCIAL">Comercio</option>
                <option value="OFFICE">Oficina</option>
                <option value="WAREHOUSE">Deposito</option>
              </select>
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Operacion
              <select
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
                value={propertyFilterOperation}
                onChange={(event) => {
                  setPropertyFilterOperation(event.target.value);
                }}
              >
                <option value="">Todas</option>
                <option value="SALE">Venta</option>
                <option value="RENT">Alquiler</option>
                <option value="TEMPORARY">Temporario</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                type="button"
                onClick={loadProperties}
                disabled={propertyStatus === "loading"}
              >
                Aplicar filtros
              </button>
            </div>
          </div>
          {propertyStatus === "error" && (
            <p className="text-xs text-[#AF8C5C]">{propertyError}</p>
          )}
          {propertyStatus === "loading" && (
            <p className="text-xs text-[#D1C7BD]">Cargando publicaciones...</p>
          )}
          {propertyStatus === "idle" && items.length === 0 && (
            <p className="text-xs text-[#D1C7BD]">No hay publicaciones cargadas.</p>
          )}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="group rounded-3xl border border-white/12 bg-gradient-to-br from-white/5 via-white/[0.03] to-transparent p-[1px] shadow-[0_10px_35px_rgba(0,0,0,0.22)]"
                >
                  <div className="grid gap-4 rounded-[calc(1.5rem-1px)] border border-white/6 bg-night-900/65 p-3 sm:p-4 xl:grid-cols-[220px_minmax(0,1fr)_250px]">
                    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-night-950/80">
                      <img
                        src={item.photos?.[0]?.url ?? "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80"}
                        alt={item.title}
                        className="h-[160px] w-full object-cover xl:h-full xl:min-h-[180px]"
                        loading="lazy"
                      />
                      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-transparent to-transparent" />
                      <div className="absolute left-3 top-3 flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                            item.operationType === "SALE"
                              ? "bg-[#AF8C5C]/95 text-night-950"
                              : item.operationType === "RENT"
                              ? "bg-sky-400/95 text-night-950"
                              : "bg-violet-400/95 text-night-950"
                          }`}
                        >
                          {operationLabels[item.operationType] ?? item.operationType}
                        </span>
                        <span className="rounded-full border border-white/20 bg-black/35 px-2.5 py-1 text-[11px] text-white/95">
                          {propertyLabels[item.propertyType] ?? item.propertyType}
                        </span>
                      </div>
                      <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between gap-2">
                        <div className="truncate text-xs text-white/95">
                          {item.location.addressLine}
                          {item.location.locality?.name ? ` - ${item.location.locality.name}` : ""}
                        </div>
                      </div>
                    </div>

                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`h-2.5 w-2.5 rounded-full ${
                            statusDotClass[item.status ?? "DRAFT"] ?? "bg-slate-400"
                          }`}
                        />
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-[#D1C7BD]">
                          {statusLabels[item.status ?? "DRAFT"] ?? item.status ?? "Borrador"}
                        </span>
                        {item.updatedAt && (
                          <span className="text-[11px] text-[#BFB8AD]">
                            Actualizada{" "}
                            {new Date(item.updatedAt).toLocaleDateString("es-AR", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            })}
                          </span>
                        )}
                      </div>

                      <div>
                        <div className="truncate text-lg font-semibold text-white sm:text-xl">
                          {item.title}
                        </div>
                        <div className="mt-1 text-base font-semibold text-[#E7E2DD]">
                          {formatPrice(item.priceAmount, item.priceCurrency)}
                        </div>
                      </div>

                    </div>

                    <div className="flex min-w-0 flex-col justify-end gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Estado de publicación
                        <select
                          className="w-full rounded-xl border border-white/10 bg-night-900/70 px-3 py-2 text-xs text-white"
                          value={item.status}
                          onChange={(event) => updateStatus(item.id, event.target.value)}
                        >
                          {statusOptions.map((status) => (
                            <option key={status} value={status}>
                              {statusLabels[status] ?? status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <button
                          className="rounded-full border border-white/20 bg-white/5 px-3 py-2 text-xs text-white transition hover:border-white/35"
                          type="button"
                          onClick={() => openEditFromList(item)}
                        >
                          Editar
                        </button>
                        <button
                          className="rounded-full border border-gold-400/35 bg-gold-500/10 px-3 py-2 text-xs text-gold-100 transition hover:border-gold-300/60"
                          type="button"
                          onClick={() => void openQuickEditFromList(item)}
                        >
                          Rápida
                        </button>
                        <button
                          className="col-span-2 rounded-full border border-white/20 px-3 py-2 text-xs text-[#E7E2DD] transition hover:border-white/35"
                          type="button"
                          onClick={() => openPublicFromList(item)}
                        >
                          Ver ficha pública
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === "requests" && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Solicitudes de contacto</h3>
              <p className="text-xs text-[#D1C7BD]">
                Gestiona interesados y reservas de visita.
              </p>
            </div>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
              type="button"
              onClick={loadRequests}
              disabled={requestStatus === "loading"}
            >
              {requestStatus === "loading" ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          {requestStatus === "error" && (
            <p className="text-xs text-[#AF8C5C]">{requestError}</p>
          )}
          {requestStatus === "loading" && (
            <p className="text-xs text-[#D1C7BD]">Cargando solicitudes...</p>
          )}
          {requestStatus === "idle" && contactRequests.length === 0 && (
            <p className="text-xs text-[#D1C7BD]">Todavia no recibiste solicitudes.</p>
          )}

          <div className="grid gap-3 md:grid-cols-3">
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Tipo de inmueble
              <select
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
                value={requestFilterType}
                onChange={(event) => setRequestFilterType(event.target.value)}
              >
                <option value="">Todos</option>
                <option value="HOUSE">Casa</option>
                <option value="APARTMENT">Departamento</option>
                <option value="LAND">Terreno</option>
                <option value="FIELD">Campo</option>
                <option value="QUINTA">Quinta</option>
                <option value="COMMERCIAL">Comercio</option>
                <option value="OFFICE">Oficina</option>
                <option value="WAREHOUSE">Deposito</option>
              </select>
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Operacion
              <select
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
                value={requestFilterOperation}
                onChange={(event) => setRequestFilterOperation(event.target.value)}
              >
                <option value="">Todas</option>
                <option value="SALE">Venta</option>
                <option value="RENT">Alquiler</option>
                <option value="TEMPORARY">Temporario</option>
              </select>
            </label>
            <div className="flex items-end">
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                type="button"
                onClick={loadRequests}
                disabled={requestStatus === "loading"}
              >
                Aplicar filtros
              </button>
            </div>
          </div>

          {contactRequests.length > 0 && (
            <div className="space-y-3">
              {contactRequests
                .filter((request) => {
                  if (
                    requestFilterType &&
                    request.property.propertyType !== requestFilterType
                  ) {
                    return false;
                  }
                  if (
                    requestFilterOperation &&
                    request.property.operationType !== requestFilterOperation
                  ) {
                    return false;
                  }
                  return true;
                })
                .map((request) => (
                <div
                  key={request.id}
                  data-request-id={request.id}
                  className={
                    highlightRequestId === request.id
                      ? `rounded-3xl border border-gold-500/70 bg-night-900/80 p-[1px] shadow-[0_0_0_2px_rgba(224,192,138,0.7)] transition duration-500 ${
                          highlightPulse ? "scale-[1.01]" : "scale-100"
                        }`
                      : "rounded-3xl border border-white/10 bg-night-900/55 p-[1px]"
                  }
                >
                  <div className="grid gap-3 rounded-[calc(1.5rem-1px)] border border-white/6 bg-gradient-to-br from-white/[0.04] via-white/[0.02] to-transparent p-3 lg:grid-cols-[minmax(0,1fr)_230px]">
                    <div className="min-w-0 space-y-2.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-gold-400/35 bg-gold-500/12 px-2.5 py-1 text-[11px] font-semibold text-gold-100">
                          {requestTypeLabels[request.type] ?? request.type}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                          {requestStatusLabels[request.status] ?? request.status}
                        </span>
                      </div>

                      <div className="rounded-2xl border border-white/10 bg-black/15 p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate text-base font-semibold text-white">
                              {request.property.title}
                            </div>
                            {request.property.location?.addressLine && (
                              <div className="mt-1 truncate text-xs text-[#D1C7BD]">
                                {request.property.location.addressLine}
                              </div>
                            )}
                          </div>
                          <div className="shrink-0 rounded-full border border-white/15 bg-white/90 px-3 py-1 text-xs font-semibold text-night-900">
                            {formatPrice(
                              request.property.priceAmount,
                              request.property.priceCurrency
                            )}
                          </div>
                        </div>
                      </div>

                      {request.message && (
                        <div className="rounded-2xl border border-white/10 bg-night-950/35 p-3">
                          <div className="text-[10px] uppercase tracking-[0.2em] text-[#D1C7BD]">
                            Mensaje
                          </div>
                          <p className="mt-1 line-clamp-3 text-sm leading-relaxed text-[#E7E2DD]">
                            {request.message}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col justify-end gap-3 rounded-2xl border border-white/10 bg-black/15 p-3">
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Estado de solicitud
                        <select
                          className="w-full rounded-xl border border-white/10 bg-night-900/70 px-3 py-2 text-xs text-white"
                          value={request.status}
                          onChange={(event) =>
                            updateRequestStatus(
                              request.id,
                              event.target.value as "NEW" | "CONTACTED" | "CLOSED"
                            )
                          }
                        >
                          {["NEW", "CONTACTED", "CLOSED"].map((status) => (
                            <option key={status} value={status}>
                              {requestStatusLabels[status] ?? status}
                            </option>
                          ))}
                        </select>
                      </label>

                      <button
                        className="rounded-full border border-gold-400/35 bg-gradient-to-r from-[#AF8C5C]/18 to-[#D1C7BD]/10 px-4 py-2 text-xs font-medium text-[#F1E3C5] transition hover:border-gold-300/60"
                        type="button"
                        onClick={() => {
                          void openRequestDetail(request);
                        }}
                      >
                        Ver detalle
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeSection === "my-requests" && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Mis solicitudes enviadas</h3>
              <p className="text-xs text-[#D1C7BD]">
                Historial de solicitudes que enviaste.
              </p>
            </div>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
              type="button"
              onClick={loadMyRequests}
              disabled={requestStatus === "loading"}
            >
              {requestStatus === "loading" ? "Cargando..." : "Actualizar"}
            </button>
          </div>

          {requestStatus === "error" && (
            <p className="text-xs text-[#AF8C5C]">{requestError}</p>
          )}
          {requestStatus === "loading" && (
            <p className="text-xs text-[#D1C7BD]">Cargando solicitudes...</p>
          )}
          {requestStatus === "idle" && myRequests.length === 0 && (
            <p className="text-xs text-[#D1C7BD]">Todavia no enviaste solicitudes.</p>
          )}

          {myRequests.length > 0 && (
            <div className="space-y-3">
              {myRequests.map((request) => (
                <div
                  key={request.id}
                  data-request-id={request.id}
                  className={
                    highlightRequestId === request.id
                      ? `rounded-2xl border border-gold-500/70 bg-night-900/72 p-4 shadow-[0_0_0_2px_rgba(224,192,138,0.7)] transition duration-500 ${
                          highlightPulse ? "scale-[1.01]" : "scale-100"
                        }`
                      : "rounded-2xl border border-white/10 bg-night-900/48 p-4"
                  }
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <div className="text-sm text-white">
                        {requestTypeLabels[request.type] ?? request.type}
                      </div>
                      <div className="text-xs text-[#D1C7BD]">
                        {request.property.title} -{" "}
                        {operationLabels[request.property.operationType] ??
                          request.property.operationType}{" "}
                        -{" "}
                        {propertyLabels[request.property.propertyType] ??
                          request.property.propertyType}
                      </div>
                      {request.property.location?.addressLine && (
                        <div className="text-xs text-[#D1C7BD]">
                          {request.property.location.addressLine}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-[#E7E2DD]">
                      <div>
                        {request.property.priceCurrency} {request.property.priceAmount}
                      </div>
                      <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
                        {requestStatusLabels[request.status] ?? request.status}
                      </span>
                    </div>
                  </div>
                  {request.message && (
                    <div className="mt-2 text-xs text-[#D1C7BD]">
                      Mensaje: {request.message}
                    </div>
                  )}
                  {request.type === "INTEREST" &&
                    request.property.rentalRequirements &&
                    request.property.rentalRequirements.isPublic === false && (
                      <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-[#E7E2DD]">
                        <div className="rounded-full border border-white/10 px-3 py-1">
                          Requisitos privados:{" "}
                          {formatRentalRequirements(request.property.rentalRequirements) ||
                            "Sin detalles"}
                        </div>
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => sendRentalRequirements(request.id)}
                        >
                          Enviar requisitos
                        </button>
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {quickEditOpen && (
        <div className="fixed inset-0 z-[1300] flex items-start justify-center overflow-y-auto bg-black/70 px-3 py-4 sm:items-center sm:px-4 sm:py-6">
          <div className="my-auto flex max-h-[calc(100vh-2rem)] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-white/10 bg-night-900/90 shadow-card">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-xl text-white">Edición rápida</h3>
                <p className="text-xs text-[#D1C7BD]">
                  Ajusta precio, operación, estado y permuta sin entrar al formulario completo.
                </p>
              </div>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                onClick={closeQuickEdit}
                disabled={quickEditStatus === "saving"}
              >
                Cerrar
              </button>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-6 py-5">
              {quickEditStatus === "loading" && (
                <p className="text-sm text-[#D1C7BD]">Cargando publicación...</p>
              )}
              {quickEditStatus !== "loading" && quickEditItem && (
                <>
                  <div className="rounded-2xl border border-white/10 bg-night-900/45 p-4">
                    <div className="text-sm text-white">{quickEditItem.title}</div>
                    {quickEditItem.location?.addressLine && (
                      <div className="text-xs text-[#D1C7BD]">{quickEditItem.location.addressLine}</div>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Operación
                      <select
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={quickEditOperationType}
                        onChange={(event) =>
                          setQuickEditOperationType(
                            event.target.value as "SALE" | "RENT" | "TEMPORARY"
                          )
                        }
                      >
                        <option value="SALE">Venta</option>
                        <option value="RENT">Alquiler</option>
                        <option value="TEMPORARY">Temporario</option>
                      </select>
                    </label>
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Estado
                      <select
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={quickEditStatusValue}
                        onChange={(event) => setQuickEditStatusValue(event.target.value)}
                      >
                        {(quickEditStatusOptionsByOperation[quickEditOperationType] ?? statusOptions).map(
                          (status) => (
                            <option key={status} value={status}>
                              {statusLabels[status] ?? status}
                            </option>
                          )
                        )}
                      </select>
                    </label>
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Precio
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={quickEditPriceAmount}
                        onChange={(event) => setQuickEditPriceAmount(event.target.value)}
                      />
                    </label>
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Moneda
                      <select
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={quickEditPriceCurrency}
                        onChange={(event) =>
                          setQuickEditPriceCurrency(event.target.value as "ARS" | "USD")
                        }
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                  </div>

                  {quickEditOperationType !== quickEditItem.operationType && (
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Motivo de cambio a{" "}
                      {operationLabels[quickEditOperationType] ?? quickEditOperationType}
                      <textarea
                        rows={3}
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={quickEditOperationReason}
                        onChange={(event) => setQuickEditOperationReason(event.target.value)}
                        placeholder="Ej: pasó de venta a alquiler por estrategia comercial"
                      />
                    </label>
                  )}

                  {quickEditOperationType === "RENT" && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/45 p-4">
                      <h4 className="text-sm font-semibold text-white">Requisitos del alquiler</h4>
                      <div className="grid gap-3 md:grid-cols-3">
                        <label className="space-y-2 text-xs text-[#D1C7BD]">
                          Garantías solicitadas
                          <input
                            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                            value={quickEditRentGuarantees}
                            onChange={(event) => setQuickEditRentGuarantees(event.target.value)}
                            placeholder="Ej: garantía propietaria, recibo de sueldo"
                          />
                        </label>
                        <label className="space-y-2 text-xs text-[#D1C7BD]">
                          Meses para entrar
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                            value={quickEditRentEntryMonths}
                            onChange={(event) => setQuickEditRentEntryMonths(event.target.value)}
                          />
                        </label>
                        <label className="space-y-2 text-xs text-[#D1C7BD]">
                          Duración del contrato (meses)
                          <input
                            type="number"
                            min={0}
                            step={1}
                            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                            value={quickEditRentContractDuration}
                            onChange={(event) =>
                              setQuickEditRentContractDuration(event.target.value)
                            }
                          />
                        </label>
                        <label className="space-y-2 text-xs text-[#D1C7BD]">
                          Indexación cada
                          <select
                            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                            value={quickEditRentIndexFrequency}
                            onChange={(event) =>
                              setQuickEditRentIndexFrequency(event.target.value)
                            }
                          >
                            <option value="">Sin definir</option>
                            <option value="MONTHLY">Mensual</option>
                            <option value="QUARTERLY">Trimestral</option>
                            <option value="SEMI_ANNUAL">Semestral</option>
                            <option value="ANNUAL">Anual</option>
                          </select>
                        </label>
                        <label className="space-y-2 text-xs text-[#D1C7BD]">
                          Tipo de indexación
                          <select
                            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                            value={quickEditRentIndexType}
                            onChange={(event) => setQuickEditRentIndexType(event.target.value)}
                          >
                            <option value="">Sin definir</option>
                            <option value="IPC">IPC</option>
                            <option value="UVA">UVA</option>
                            <option value="INFLATION">Inflación</option>
                            <option value="OTHER">Otro</option>
                          </select>
                        </label>
                        <label className="space-y-2 text-xs text-[#D1C7BD]">
                          Porcentaje / valor
                          <input
                            type="number"
                            min={0}
                            step="0.01"
                            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                            value={quickEditRentIndexValue}
                            onChange={(event) => setQuickEditRentIndexValue(event.target.value)}
                          />
                        </label>
                      </div>
                      <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#AF8C5C]"
                          checked={quickEditRentInfoPublic}
                          onChange={(event) => setQuickEditRentInfoPublic(event.target.checked)}
                        />
                        Mostrar esta información de forma pública
                      </label>
                    </div>
                  )}

                  {quickEditOperationType === "SALE" && (
                    <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/45 p-4">
                      <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                        <input
                          type="checkbox"
                          className="h-4 w-4 accent-[#AF8C5C]"
                          checked={quickEditPermutaAccepted}
                          onChange={(event) => setQuickEditPermutaAccepted(event.target.checked)}
                        />
                        Acepta permuta
                      </label>
                      {quickEditPermutaAccepted && (
                        <label className="space-y-2 text-xs text-[#D1C7BD]">
                          Motivo/condiciones de permuta
                          <textarea
                            rows={3}
                            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                            value={quickEditPermutaReason}
                            onChange={(event) => setQuickEditPermutaReason(event.target.value)}
                            placeholder="Ej: permuta por casa más chica + diferencia"
                          />
                        </label>
                      )}
                    </div>
                  )}
                </>
              )}

            </div>
            <div className="border-t border-white/10 bg-night-900/95 px-6 py-4 backdrop-blur-sm">
              {quickEditError && (
                <p className="mb-3 text-xs text-[#AF8C5C]">{quickEditError}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                  onClick={closeQuickEdit}
                  disabled={quickEditStatus === "saving"}
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900 disabled:cursor-not-allowed disabled:opacity-70"
                  onClick={() => void saveQuickEdit()}
                  disabled={quickEditStatus === "saving" || quickEditStatus === "loading"}
                >
                  {quickEditStatus === "saving" ? "Guardando..." : "Guardar rápido"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {requestDetailOpen && selectedRequest && (
        <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-black/80 backdrop-blur-sm px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-[#1B1714] shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
            <div className="flex items-center justify-between border-b border-white/10 bg-[#211c18] px-6 py-4">
              <div>
                <h3 className="text-xl text-white">Detalle de solicitud</h3>
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-gold-400/35 bg-gold-500/12 px-2.5 py-1 text-[11px] font-semibold text-gold-100">
                    {requestTypeLabels[selectedRequest.type] ?? selectedRequest.type}
                  </span>
                  <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                    {requestStatusLabels[selectedRequest.status] ?? selectedRequest.status}
                  </span>
                </div>
              </div>
              <button
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                type="button"
                onClick={() => {
                  setRequestDetailOpen(false);
                  setSelectedRequest(null);
                }}
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-[calc(90vh-90px)] overflow-y-auto px-6 py-5 text-sm text-[#E7E2DD]">
              <div className="mx-auto max-w-xl space-y-4">
                  <div className="rounded-2xl border border-white/10 bg-[#24201c] p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#D1C7BD]">
                      Datos de contacto
                    </div>
                    <div className="mt-3 space-y-3">
                      <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#BFB8AD]">
                          Nombre
                        </div>
                        <div className="mt-1 text-sm text-white">
                          {selectedRequest.name ??
                            selectedRequest.requesterUser?.name ??
                            "Sin nombre"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#BFB8AD]">
                          Email
                        </div>
                        <div className="mt-1 break-all text-sm text-white">
                          {selectedRequest.email ??
                            selectedRequest.requesterUser?.email ??
                            "Sin email"}
                        </div>
                      </div>
                      <div className="rounded-xl border border-white/10 bg-black/15 px-3 py-2">
                        <div className="text-[10px] uppercase tracking-[0.16em] text-[#BFB8AD]">
                          Teléfono
                        </div>
                        <div className="mt-1 text-sm text-white">
                          {selectedRequest.phone ??
                            selectedRequest.requesterUser?.phone ??
                            "Sin telefono"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-[#24201c] p-4">
                    <div className="text-[10px] uppercase tracking-[0.2em] text-[#D1C7BD]">
                      Acciones
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {(() => {
                        const phone = selectedRequest.phone ?? selectedRequest.requesterUser?.phone;
                        if (!phone) return null;
                        const message = `Hola ${selectedRequest.name ?? ""}, vimos tu solicitud por "${
                          selectedRequest.property.title
                        }".`;
                        const link = buildWhatsappLink(phone, message);
                        if (!link) {
                          return null;
                        }
                        return (
                          <a
                            className="inline-flex items-center gap-1.5 rounded-full border border-[#25D366]/40 bg-gradient-to-r from-[#25D366] to-[#128C7E] px-4 py-2 text-xs font-semibold text-white shadow-[0_10px_24px_rgba(37,211,102,0.25)]"
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
                      })()}
                      {(() => {
                        const phone = selectedRequest.phone ?? selectedRequest.requesterUser?.phone;
                        if (!phone) return null;
                        return (
                          <a
                            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                            href={`tel:${phone}`}
                          >
                            Llamar
                          </a>
                        );
                      })()}
                      {(() => {
                        const email = selectedRequest.email ?? selectedRequest.requesterUser?.email;
                        if (!email) return null;
                        return (
                          <a
                            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                            href={`mailto:${email}`}
                          >
                            Email
                          </a>
                        );
                      })()}
                      {selectedRequest.property.id && (
                        <button
                          className="rounded-full border border-gold-400/35 bg-gold-500/10 px-4 py-2 text-xs text-[#F1E3C5]"
                          type="button"
                          onClick={() => openRequestPropertyDetail(selectedRequest.property.id)}
                        >
                          Ver ficha
                        </button>
                      )}
                    </div>
                  </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {requestPreviewListing && (
        <PropertyDetailModal
          listing={requestPreviewListing}
          onClose={closeRequestPropertyDetail}
          isLoading={requestPreviewStatus === "loading"}
        />
      )}
      {requestPreviewStatus === "error" && requestPreviewError && (
        <div className="fixed bottom-6 right-6 rounded-xl border border-white/10 bg-night-900/78 px-4 py-3 text-xs text-[#AF8C5C] shadow-card">
          {requestPreviewError}
        </div>
      )}
      {publicStatus === "error" && publicError && (
        <div className="fixed bottom-6 left-6 rounded-xl border border-white/10 bg-night-900/78 px-4 py-3 text-xs text-[#AF8C5C] shadow-card">
          {publicError}
        </div>
      )}
      {showPublicModal && publicListing && (
        <PropertyDetailModal
          listing={publicListing}
          onClose={() => setShowPublicModal(false)}
          actions={
            <>
              <button className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-5 py-2 text-xs font-semibold text-night-900">
                WhatsApp
              </button>
              <button className="rounded-full border border-white/20 px-5 py-2 text-xs text-[#E7E2DD]">
                Guardar
              </button>
            </>
          }
        />
      )}
      <ConfirmLeaveModal open={show} onConfirm={confirmLeave} onCancel={cancelLeave} />
      </div>
    </div>
    </div>
  );
}


