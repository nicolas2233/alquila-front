
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMap, useMapEvents } from "react-leaflet";
import { geocodeAddress, geocodeSuggestions, reverseGeocode } from "../shared/map/geocode";
import type { GeocodeResult } from "../shared/map/geocode";
import { useNavigate, useParams } from "react-router-dom";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import { useUnsavedChanges } from "../shared/hooks/useUnsavedChanges";
import { ConfirmLeaveModal } from "../shared/ui/ConfirmLeaveModal";
import { scrollToFirstError } from "../shared/utils/scrollToFirstError";

type Step = 0 | 1 | 2 | 3 | 4;
const PLAN_LIMIT_COUNTED_STATUSES = ["DRAFT", "ACTIVE", "PAUSED", "TEMPORARILY_UNAVAILABLE"];

const steps = [
  {
    title: "Datos básicos",
    description: "Título, operación, precio y descripción.",
  },
  {
    title: "Ubicación",
    description: "Dirección, localidad y punto del mapa.",
  },
  {
    title: "Características",
    description: "Superficie, ambientes y detalles del inmueble.",
  },
  {
    title: "Servicios y costos",
    description: "Servicios disponibles y costos complementarios.",
  },
  {
    title: "Fotos y contacto",
    description: "Imágenes, WhatsApp, teléfono y vista previa.",
  },
];

type SummaryHighlightOption = {
  key: string;
  label: string;
  group: "Detalle" | "Amenity" | "Servicio";
};

const SUMMARY_HIGHLIGHT_OPTIONS: SummaryHighlightOption[] = [
  { key: "detail:rooms", label: "Ambientes", group: "Detalle" },
  { key: "detail:coveredAreaM2", label: "Sup. cubierta", group: "Detalle" },
  { key: "detail:areaM2", label: "Sup. total", group: "Detalle" },
  { key: "detail:bathrooms", label: "Baños", group: "Detalle" },
  { key: "detail:bedrooms", label: "Dormitorios", group: "Detalle" },
  { key: "detail:garage", label: "Cochera", group: "Detalle" },
  { key: "detail:garageSpots", label: "Autos en cochera", group: "Detalle" },
  { key: "detail:patio", label: "Patio", group: "Detalle" },
  { key: "detail:laundry", label: "Lavadero", group: "Detalle" },
  { key: "detail:pets", label: "Mascotas", group: "Detalle" },
  { key: "detail:kids", label: "Niños", group: "Detalle" },
  { key: "amenity:AIR_CONDITIONING", label: "Aire acondicionado", group: "Amenity" },
  { key: "amenity:HEATER", label: "Estufa", group: "Amenity" },
  { key: "amenity:KITCHEN", label: "Cocina", group: "Amenity" },
  { key: "amenity:GRILL", label: "Parrilla", group: "Amenity" },
  { key: "amenity:POOL", label: "Pileta", group: "Amenity" },
  { key: "amenity:JACUZZI", label: "Hidromasaje", group: "Amenity" },
  { key: "amenity:SOLARIUM", label: "Solarium", group: "Amenity" },
  { key: "amenity:ELEVATOR", label: "Ascensor", group: "Amenity" },
  { key: "amenity:PRIVATE_SECURITY", label: "Seguridad privada", group: "Amenity" },
  { key: "amenity:SECURITY_CAMERAS", label: "Cámaras de seguridad", group: "Amenity" },
  { key: "amenity:QUINCHO", label: "Quincho", group: "Amenity" },
  { key: "service:electricity", label: "Luz", group: "Servicio" },
  { key: "service:gas", label: "Gas", group: "Servicio" },
  { key: "service:water", label: "Agua", group: "Servicio" },
  { key: "service:sewer", label: "Cloaca", group: "Servicio" },
  { key: "service:internet", label: "Internet", group: "Servicio" },
  { key: "service:pavement", label: "Asfalto", group: "Servicio" },
];

const SUMMARY_HIGHLIGHT_OPTIONS_BY_KEY = Object.fromEntries(
  SUMMARY_HIGHLIGHT_OPTIONS.map((option) => [option.key, option])
) as Record<string, SummaryHighlightOption>;

type SummaryHighlightGroup = SummaryHighlightOption["group"];

type SummaryPreviewMetric = {
  key: string;
  label: string;
  value: string;
  active: boolean;
};

type EditablePropertyFeatures = {
  hasGarage?: boolean;
  garageSpots?: number;
  garageType?: "COVERED" | "OPEN";
  petsAllowed?: boolean;
  kidsAllowed?: boolean;
  hasPatio?: boolean;
  patioType?: "GRASS" | "FLOOR" | "CEMENT";
  hasLaundry?: boolean;
  furnished?: boolean;
  ageYears?: number;
  coveredAreaM2?: number;
  semiCoveredAreaM2?: number;
  bedrooms?: number;
  floorsCount?: number;
  financingAvailable?: boolean;
  financingAmount?: number;
  financingCurrency?: "ARS" | "USD";
  floor?: number;
  unit?: string;
  party?: string;
  province?: string;
  neighborhood?: string;
  lotOrParcel?: string;
  postalCode?: string;
  gatedCommunity?: "CLOSED" | "SEMI_CLOSED";
  facing?: "FRONT" | "BACK" | "INTERNAL";
  frontageM?: number;
  depthM?: number;
  buildable?: boolean;
  investmentOpportunity?: boolean;
  summaryHighlights?: string[];
  amenities?: string[];
  businessUses?: string[];
  officeFeatures?: string[];
  warehouseFeatures?: string[];
  showMapLocation?: boolean;
  rentalRequirements?: {
    guarantees?: string;
    entryMonths?: number;
    contractDurationMonths?: number;
    indexFrequency?: string;
    indexType?: string;
    indexValue?: number;
    isPublic?: boolean;
  };
};

type EditablePropertyResponse = {
  id: string;
  title: string;
  description: string;
  propertyType: string;
  operationType: string;
  priceAmount: string | number;
  priceCurrency: "ARS" | "USD";
  expensesAmount?: string | number | null;
  expensesCurrency?: "ARS" | "USD" | null;
  rooms?: number | null;
  bathrooms?: number | null;
  areaM2?: number | null;
  unitLabel?: string | null;
  features?: EditablePropertyFeatures | null;
  services?: {
    electricity?: boolean;
    gas?: boolean;
    water?: boolean;
    sewer?: boolean;
    internet?: boolean;
    pavement?: boolean;
  } | null;
  location: {
    addressLine: string;
    localityId: string;
    lat?: number | null;
    lng?: number | null;
    locality?: { name: string } | null;
  };
  photos?: { id: string; url: string }[];
  contactMethods?: { id: string; type: "WHATSAPP" | "PHONE" | "IN_APP"; value: string }[];
  identifiers?: { cadastralType: "PARTIDA" | "NOMENCLATURA" | "OTHER"; cadastralValue: string }[];
};

function LocationPicker({
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

  function RecenterMap() {
    const map = useMap();
    useEffect(() => {
      if (lat === undefined || lng === undefined) return;
      const nextZoom = Math.max(map.getZoom(), 16);
      map.setView([lat, lng], nextZoom, { animate: true });
    }, [lat, lng, map]);
    return null;
  }

  return (
    <div className="space-y-2">
      <div className="text-xs text-[#D1C7BD]">Marca el punto exacto en el mapa.</div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <MapContainer
          center={center as [number, number]}
          zoom={13}
          className="h-[200px] w-full md:h-[260px] z-0"
          scrollWheelZoom={false}
        >
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <RecenterMap />
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
    </div>
  );
}
export function PublishPage() {
  const formRef = useRef<HTMLFormElement | null>(null);
  const navigate = useNavigate();
  const { id: editPropertyId } = useParams<{ id: string }>();
  const isEditMode = Boolean(editPropertyId);
  const [isDirty, setIsDirty] = useState(false);
  const { show, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);
  const { addToast } = useToast();
  const sessionUser = getSessionUser();
  const sessionToken = getToken();
  const subscriptionInfo = sessionUser?.subscription ?? null;
  const isOwner = sessionUser?.role === "OWNER";
  const isAgency = sessionUser?.role?.startsWith("AGENCY") ?? false;
  const ownerUserId = isOwner ? sessionUser?.id : undefined;
  const agencyId = isAgency ? sessionUser?.agencyId : undefined;

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [initialStatus, setInitialStatus] = useState<"idle" | "loading" | "error">("idle");
  const [initialError, setInitialError] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [planUsageCount, setPlanUsageCount] = useState(0);
  const [planUsageStatus, setPlanUsageStatus] = useState<"idle" | "loading" | "error">("idle");
  const [planUsageError, setPlanUsageError] = useState("");
  const [showNoSlotsModal, setShowNoSlotsModal] = useState(false);
  const planUsageInitialCheckRef = useRef(false);
  const [step, setStep] = useState<Step>(0);
  const [showErrors, setShowErrors] = useState(false);
  const [showPreview, setShowPreview] = useState(true);
  const previewRef = useRef<HTMLDivElement | null>(null);
  const [showSummaryEditor, setShowSummaryEditor] = useState(false);
  const [showMapPicker, setShowMapPicker] = useState(false);
  const [showLocationReviewModal, setShowLocationReviewModal] = useState(false);
  const [pendingStepTarget, setPendingStepTarget] = useState<Step | null>(null);
  const [locationReviewConfirmed, setLocationReviewConfirmed] = useState(false);
  const [summaryHighlights, setSummaryHighlights] = useState<string[]>([]);
  const [summaryEditorGroupsOpen, setSummaryEditorGroupsOpen] = useState<
    Record<SummaryHighlightGroup, boolean>
  >({
    Detalle: true,
    Amenity: false,
    Servicio: false,
  });
  const [draggingSummaryKey, setDraggingSummaryKey] = useState<string | null>(null);
  const [dragOverSummaryKey, setDragOverSummaryKey] = useState<string | null>(null);

  const togglePreview = useCallback(() => {
    setShowPreview((current) => {
      const next = !current;
      if (next) {
        window.setTimeout(() => {
          previewRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 0);
      }
      return next;
    });
  }, []);

  const [title, setTitle] = useState("");
  const [operationType, setOperationType] = useState("SALE");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("ARS");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("HOUSE");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [coveredAreaM2, setCoveredAreaM2] = useState("");
  const [semiCoveredAreaM2, setSemiCoveredAreaM2] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [floorsCount, setFloorsCount] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [party, setParty] = useState("");
  const [province, setProvince] = useState("");
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [addressQuery, setAddressQuery] = useState("");
  const [addressSuggestions, setAddressSuggestions] = useState<GeocodeResult[]>([]);
  const [suggestionsStatus, setSuggestionsStatus] = useState<"idle" | "loading">("idle");
  const [locationLoadMode, setLocationLoadMode] = useState<"GUIDED" | "MANUAL">("GUIDED");
  const [showMapLocation, setShowMapLocation] = useState(true);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const [cadastralType, setCadastralType] = useState("PARTIDA");
  const [cadastralValue, setCadastralValue] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState(sessionUser?.phone ?? "");
  const [contactPhone, setContactPhone] = useState(sessionUser?.phone ?? "");
  const [photos, setPhotos] = useState<File[]>([]);
  const [existingPhotos, setExistingPhotos] = useState<{ id: string; url: string }[]>([]);

  const maxPropertiesByPlan = subscriptionInfo?.maxProperties ?? 0;
  const planHasLimit = maxPropertiesByPlan > 0;
  const planSlotsRemaining = planHasLimit ? Math.max(0, maxPropertiesByPlan - planUsageCount) : null;
  const subscriptionMonthlyPrice = Number(subscriptionInfo?.priceAmount ?? 0);
  const paidPlanRequiresPaymentMethod =
    !isEditMode &&
    (isOwner || isAgency) &&
    !!subscriptionInfo &&
    subscriptionMonthlyPrice > 0 &&
    !subscriptionInfo.isAdminGrantActive &&
    !subscriptionInfo.hasPaymentMethod;

  const photoPreviews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos]
  );

  useEffect(() => {
    return () => {
      photoPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [photoPreviews]);

  const loadPlanUsage = useCallback(async () => {
    if (!sessionUser || (!isOwner && !isAgency) || !planHasLimit) return;
    setPlanUsageStatus("loading");
    setPlanUsageError("");
    try {
      const params = new URLSearchParams({ pageSize: "100" });
      if (isOwner) {
        params.set("ownerUserId", sessionUser.id);
      }
      if (isAgency && sessionUser.agencyId) {
        params.set("agencyId", sessionUser.agencyId);
      }
      const response = await fetch(`${env.apiUrl}/properties?${params.toString()}`);
      if (!response.ok) {
        throw new Error("No pudimos verificar el cupo de tu plan.");
      }
      const data = (await response.json()) as { items?: Array<{ status?: string | null }> };
      const usedCount = (data.items ?? []).filter((item) =>
        item.status ? PLAN_LIMIT_COUNTED_STATUSES.includes(item.status) : false
      ).length;
      setPlanUsageCount(usedCount);
      setPlanUsageStatus("idle");
    } catch (error) {
      setPlanUsageStatus("error");
      setPlanUsageError(
        error instanceof Error ? error.message : "No pudimos verificar el cupo."
      );
    }
  }, [sessionUser, isOwner, isAgency, planHasLimit]);

  useEffect(() => {
    if (showErrors || status === "error") {
      scrollToFirstError(formRef.current);
    }
  }, [showErrors, status, step]);

  useEffect(() => {
    if (isEditMode) return;
    if (!(isOwner || isAgency)) return;
    if (!planHasLimit) return;
    if (planUsageInitialCheckRef.current) return;
    planUsageInitialCheckRef.current = true;
    void loadPlanUsage();
  }, [isEditMode, isOwner, isAgency, planHasLimit, loadPlanUsage]);

  useEffect(() => {
    if (isEditMode) {
      setShowNoSlotsModal(false);
      return;
    }
    if (!(isOwner || isAgency)) {
      setShowNoSlotsModal(false);
      return;
    }
    if (!planHasLimit) {
      setShowNoSlotsModal(false);
      return;
    }
    if (planUsageStatus !== "idle") return;
    if (planSlotsRemaining !== null && planSlotsRemaining <= 0) {
      setShowNoSlotsModal(true);
      return;
    }
    setShowNoSlotsModal(false);
  }, [isEditMode, isOwner, isAgency, planHasLimit, planSlotsRemaining, planUsageStatus]);

  useEffect(() => {
    const handle = window.setTimeout(() => {
      scrollToFirstError(formRef.current);
    }, 0);
    return () => window.clearTimeout(handle);
  }, [step]);

  useEffect(() => {
    if (step !== 1) {
      setAddressSuggestions([]);
      setSuggestionsStatus("idle");
      return;
    }
    const query = addressQuery.trim();
    if (query.length < 3) {
      setAddressSuggestions([]);
      setSuggestionsStatus("idle");
      return;
    }
    let ignore = false;
    setSuggestionsStatus("loading");
    const timer = window.setTimeout(() => {
      void geocodeSuggestions(query, 5)
        .then((results) => {
          if (ignore) return;
          setAddressSuggestions(results);
        })
        .catch(() => {
          if (ignore) return;
          setAddressSuggestions([]);
        })
        .finally(() => {
          if (ignore) return;
          setSuggestionsStatus("idle");
        });
    }, 320);
    return () => {
      ignore = true;
      window.clearTimeout(timer);
    };
  }, [addressQuery, step]);

  const [expensesAmount, setExpensesAmount] = useState("");
  const [expensesCurrency, setExpensesCurrency] = useState("ARS");
  const [financingAvailable, setFinancingAvailable] = useState(false);
  const [financingAmount, setFinancingAmount] = useState("");
  const [financingCurrency, setFinancingCurrency] = useState("ARS");
  const [rentGuarantees, setRentGuarantees] = useState("");
  const [rentEntryMonths, setRentEntryMonths] = useState("");
  const [rentContractDuration, setRentContractDuration] = useState("");
  const [rentIndexFrequency, setRentIndexFrequency] = useState("");
  const [rentIndexType, setRentIndexType] = useState("");
  const [rentIndexValue, setRentIndexValue] = useState("");
  const [rentInfoPublic, setRentInfoPublic] = useState(true);

  const [hasGarage, setHasGarage] = useState(false);
  const [garageSpots, setGarageSpots] = useState("");
  const [garageType, setGarageType] = useState<"COVERED" | "OPEN">("COVERED");
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [kidsAllowed, setKidsAllowed] = useState(false);
  const [hasPatio, setHasPatio] = useState(false);
  const [patioType, setPatioType] = useState<"GRASS" | "FLOOR" | "CEMENT">("GRASS");
  const [hasLaundry, setHasLaundry] = useState(false);
  const [furnished, setFurnished] = useState(false);
  const [ageYears, setAgeYears] = useState("");

  const [frontageM, setFrontageM] = useState("");
  const [depthM, setDepthM] = useState("");
  const [buildable, setBuildable] = useState(false);

  const [floor, setFloor] = useState("");
  const [unit, setUnit] = useState("");
  const [lotOrParcel, setLotOrParcel] = useState("");
  const [facing, setFacing] = useState("FRONT");

  const [amenityAir, setAmenityAir] = useState(false);
  const [amenityHeater, setAmenityHeater] = useState(false);
  const [amenityKitchen, setAmenityKitchen] = useState(false);
  const [amenityGrill, setAmenityGrill] = useState(false);
  const [amenityPool, setAmenityPool] = useState(false);
  const [amenityJacuzzi, setAmenityJacuzzi] = useState(false);
  const [amenitySolarium, setAmenitySolarium] = useState(false);
  const [amenityElevator, setAmenityElevator] = useState(false);
  const [amenitySecurity, setAmenitySecurity] = useState(false);
  const [amenityCameras, setAmenityCameras] = useState(false);
  const [amenityQuincho, setAmenityQuincho] = useState(false);

  const [businessFood, setBusinessFood] = useState(false);
  const [businessEvents, setBusinessEvents] = useState(false);
  const [businessRetail, setBusinessRetail] = useState(false);
  const [businessFactory, setBusinessFactory] = useState(false);
  const [businessOffices, setBusinessOffices] = useState(false);
  const [businessClinics, setBusinessClinics] = useState(false);

  const [gatedCommunity, setGatedCommunity] = useState<"" | "CLOSED" | "SEMI_CLOSED">("");

  const [officeMeetingRoom, setOfficeMeetingRoom] = useState(false);
  const [officeReception, setOfficeReception] = useState(false);
  const [officePrivateOffices, setOfficePrivateOffices] = useState(false);

  const [warehouseTruckAccess, setWarehouseTruckAccess] = useState(false);
  const [warehouseHeight, setWarehouseHeight] = useState("");
  const [warehouseGateHeight, setWarehouseGateHeight] = useState("");
  const [landInvestment, setLandInvestment] = useState(false);

  const [serviceElectricity, setServiceElectricity] = useState(false);
  const [serviceGas, setServiceGas] = useState(false);
  const [serviceWater, setServiceWater] = useState(false);
  const [serviceSewer, setServiceSewer] = useState(false);
  const [serviceInternet, setServiceInternet] = useState(false);
  const [servicePavement, setServicePavement] = useState(false);

  useEffect(() => {
    if (!isEditMode || !editPropertyId) {
      setInitialStatus("idle");
      setInitialError("");
      return;
    }
    if (!sessionToken) {
      setInitialStatus("error");
      setInitialError("Necesitas iniciar sesión para editar.");
      return;
    }

    let ignore = false;
    const loadProperty = async () => {
      setInitialStatus("loading");
      setInitialError("");
      try {
        const response = await fetch(`${env.apiUrl}/properties/${editPropertyId}`, {
          headers: { Authorization: `Bearer ${sessionToken}` },
        });
        if (!response.ok) {
          const body = (await response.json().catch(() => null)) as { message?: string } | null;
          throw new Error(body?.message ?? "No pudimos cargar la publicación.");
        }
        const data = (await response.json()) as EditablePropertyResponse;
        if (ignore) return;

        const features = data.features ?? {};
        const amenities = Array.isArray(features.amenities) ? features.amenities : [];
        const businessUses = Array.isArray(features.businessUses) ? features.businessUses : [];
        const officeFeatures = Array.isArray(features.officeFeatures) ? features.officeFeatures : [];
        const warehouseFeatures = Array.isArray(features.warehouseFeatures)
          ? features.warehouseFeatures
          : [];
        const rentalRequirements = features.rentalRequirements ?? {};

        setTitle(data.title ?? "");
        setDescription(data.description ?? "");
        setPropertyType(data.propertyType ?? "HOUSE");
        setOperationType(data.operationType ?? "SALE");
        setPriceAmount(data.priceAmount !== undefined && data.priceAmount !== null ? String(data.priceAmount) : "");
        setPriceCurrency(data.priceCurrency ?? "ARS");
        setExpensesAmount(
          data.expensesAmount !== undefined && data.expensesAmount !== null
            ? String(data.expensesAmount)
            : ""
        );
        setExpensesCurrency(data.expensesCurrency ?? "ARS");
        setRooms(data.rooms !== undefined && data.rooms !== null ? String(data.rooms) : "");
        setBathrooms(
          data.bathrooms !== undefined && data.bathrooms !== null ? String(data.bathrooms) : ""
        );
        setAreaM2(data.areaM2 !== undefined && data.areaM2 !== null ? String(data.areaM2) : "");

        setAddressLine(data.location?.addressLine ?? "");
        setLocalityId(data.location?.locality?.name ?? data.location?.localityId ?? "");
        setLat(typeof data.location?.lat === "number" ? data.location.lat : undefined);
        setLng(typeof data.location?.lng === "number" ? data.location.lng : undefined);
        setAddressQuery(data.location?.addressLine ?? "");
        setAddressSuggestions([]);
        setGeoStatus("idle");
        setGeoMessage("");

        setUnitLabel(data.unitLabel ?? "");
        setParty(features.party ?? "");
        setProvince(features.province ?? "");
        setNeighborhood(features.neighborhood ?? "");
        setPostalCode(features.postalCode ?? "");
        setLotOrParcel(features.lotOrParcel ?? "");
        setFrontageM(
          features.frontageM !== undefined && features.frontageM !== null
            ? String(features.frontageM)
            : ""
        );
        setDepthM(
          features.depthM !== undefined && features.depthM !== null
            ? String(features.depthM)
            : ""
        );
        setGatedCommunity(features.gatedCommunity ?? "");

        setHasGarage(Boolean(features.hasGarage));
        setGarageSpots(
          features.garageSpots !== undefined && features.garageSpots !== null
            ? String(features.garageSpots)
            : ""
        );
        setGarageType(features.garageType ?? "COVERED");
        setPetsAllowed(Boolean(features.petsAllowed));
        setKidsAllowed(Boolean(features.kidsAllowed));
        setHasPatio(Boolean(features.hasPatio));
        setPatioType(features.patioType ?? "GRASS");
        setHasLaundry(Boolean(features.hasLaundry));
        setFurnished(Boolean(features.furnished));
        setAgeYears(
          features.ageYears !== undefined && features.ageYears !== null
            ? String(features.ageYears)
            : ""
        );
        setCoveredAreaM2(
          features.coveredAreaM2 !== undefined && features.coveredAreaM2 !== null
            ? String(features.coveredAreaM2)
            : ""
        );
        setSemiCoveredAreaM2(
          features.semiCoveredAreaM2 !== undefined && features.semiCoveredAreaM2 !== null
            ? String(features.semiCoveredAreaM2)
            : ""
        );
        setBedrooms(
          features.bedrooms !== undefined && features.bedrooms !== null
            ? String(features.bedrooms)
            : ""
        );
        setFloorsCount(
          features.floorsCount !== undefined && features.floorsCount !== null
            ? String(features.floorsCount)
            : ""
        );
        setFloor(features.floor !== undefined && features.floor !== null ? String(features.floor) : "");
        setUnit(features.unit ?? "");
        setFacing(features.facing ?? "FRONT");
        setShowMapLocation(features.showMapLocation ?? true);

        setBuildable(Boolean(features.buildable));
        setLandInvestment(Boolean(features.investmentOpportunity));

        setFinancingAvailable(Boolean(features.financingAvailable));
        setFinancingAmount(
          features.financingAmount !== undefined && features.financingAmount !== null
            ? String(features.financingAmount)
            : ""
        );
        setFinancingCurrency(features.financingCurrency ?? "ARS");

        setRentGuarantees(rentalRequirements.guarantees ?? "");
        setRentEntryMonths(
          rentalRequirements.entryMonths !== undefined && rentalRequirements.entryMonths !== null
            ? String(rentalRequirements.entryMonths)
            : ""
        );
        setRentContractDuration(
          rentalRequirements.contractDurationMonths !== undefined &&
            rentalRequirements.contractDurationMonths !== null
            ? String(rentalRequirements.contractDurationMonths)
            : ""
        );
        setRentIndexFrequency(rentalRequirements.indexFrequency ?? "");
        setRentIndexType(rentalRequirements.indexType ?? "");
        setRentIndexValue(
          rentalRequirements.indexValue !== undefined && rentalRequirements.indexValue !== null
            ? String(rentalRequirements.indexValue)
            : ""
        );
        setRentInfoPublic(rentalRequirements.isPublic ?? true);
        setSummaryHighlights(
          Array.isArray(features.summaryHighlights)
            ? features.summaryHighlights
                .filter((value): value is string => typeof value === "string")
                .filter((value, index, array) => array.indexOf(value) === index)
                .slice(0, 8)
            : []
        );

        setAmenityAir(amenities.includes("AIR_CONDITIONING"));
        setAmenityHeater(amenities.includes("HEATER"));
        setAmenityKitchen(amenities.includes("KITCHEN"));
        setAmenityGrill(amenities.includes("GRILL"));
        setAmenityPool(amenities.includes("POOL"));
        setAmenityJacuzzi(amenities.includes("JACUZZI"));
        setAmenitySolarium(amenities.includes("SOLARIUM"));
        setAmenityElevator(amenities.includes("ELEVATOR"));
        setAmenitySecurity(amenities.includes("PRIVATE_SECURITY"));
        setAmenityCameras(amenities.includes("SECURITY_CAMERAS"));
        setAmenityQuincho(amenities.includes("QUINCHO"));

        setBusinessFood(businessUses.includes("FOOD"));
        setBusinessEvents(businessUses.includes("EVENTS"));
        setBusinessRetail(businessUses.includes("RETAIL"));
        setBusinessFactory(businessUses.includes("FACTORY"));
        setBusinessOffices(businessUses.includes("OFFICES"));
        setBusinessClinics(businessUses.includes("CLINICS"));

        setOfficeMeetingRoom(officeFeatures.includes("MEETING_ROOM"));
        setOfficeReception(officeFeatures.includes("RECEPTION"));
        setOfficePrivateOffices(officeFeatures.includes("PRIVATE_OFFICES"));

        setWarehouseTruckAccess(warehouseFeatures.includes("TRUCK_ACCESS"));
        setWarehouseHeight(
          warehouseFeatures.find((value) => value.startsWith("HEIGHT_"))?.replace("HEIGHT_", "") ??
            ""
        );
        setWarehouseGateHeight(
          warehouseFeatures.find((value) => value.startsWith("GATE_"))?.replace("GATE_", "") ?? ""
        );

        setServiceElectricity(Boolean(data.services?.electricity));
        setServiceGas(Boolean(data.services?.gas));
        setServiceWater(Boolean(data.services?.water));
        setServiceSewer(Boolean(data.services?.sewer));
        setServiceInternet(Boolean(data.services?.internet));
        setServicePavement(Boolean(data.services?.pavement));

        const primaryIdentifier = data.identifiers?.[0];
        setCadastralType(primaryIdentifier?.cadastralType ?? "PARTIDA");
        setCadastralValue(primaryIdentifier?.cadastralValue ?? "");

        const whatsappMethod =
          data.contactMethods?.find((method) => method.type === "WHATSAPP")?.value ?? "";
        const phoneMethod =
          data.contactMethods?.find((method) => method.type === "PHONE")?.value ?? "";
        const fallbackPhone = sessionUser?.phone ?? "";
        setContactWhatsapp(whatsappMethod || fallbackPhone);
        setContactPhone(phoneMethod || fallbackPhone);

        setExistingPhotos(data.photos ?? []);
        setPhotos([]);
        setStep(0);
        setLocationReviewConfirmed(false);
        setShowErrors(false);
        setShowPreview(false);
        setStatus("idle");
        setErrorMessage("");
        setIsDirty(false);
        setInitialStatus("idle");
      } catch (error) {
        if (ignore) return;
        setInitialStatus("error");
        setInitialError(
          error instanceof Error ? error.message : "No pudimos cargar la publicación."
        );
      }
    };

    void loadProperty();
    return () => {
      ignore = true;
    };
  }, [editPropertyId, isEditMode, sessionToken, sessionUser?.phone]);

  const roleLabel = isOwner
    ? "Dueño directo"
    : isAgency
    ? "Inmobiliaria"
    : "Usuario";
  const propertyTypeLabel = useMemo(() => {
    switch (propertyType) {
      case "HOUSE":
        return "Casa";
      case "APARTMENT":
        return "Departamento";
      case "LAND":
        return "Terreno";
      case "FIELD":
        return "Campo";
      case "QUINTA":
        return "Quinta";
      case "COMMERCIAL":
        return "Negocio";
      case "OFFICE":
        return "Oficina";
      case "WAREHOUSE":
        return "Galpón / Depósito";
      default:
        return "Inmueble";
    }
  }, [propertyType]);
  const operationLabel = useMemo(() => {
    switch (operationType) {
      case "SALE":
        return "Venta";
      case "RENT":
        return "Alquiler";
      case "TEMPORARY":
        return "Temporario";
      default:
        return operationType;
    }
  }, [operationType]);

  const previewAmenities = useMemo(() => {
    const values: string[] = [];
    if (amenityAir) values.push("AIR_CONDITIONING");
    if (amenityHeater) values.push("HEATER");
    if (amenityKitchen) values.push("KITCHEN");
    if (amenityGrill) values.push("GRILL");
    if (amenityPool) values.push("POOL");
    if (amenityJacuzzi) values.push("JACUZZI");
    if (amenitySolarium) values.push("SOLARIUM");
    if (amenityElevator) values.push("ELEVATOR");
    if (amenitySecurity) values.push("PRIVATE_SECURITY");
    if (amenityCameras) values.push("SECURITY_CAMERAS");
    if (amenityQuincho) values.push("QUINCHO");
    return values;
  }, [
    amenityAir,
    amenityHeater,
    amenityKitchen,
    amenityGrill,
    amenityPool,
    amenityJacuzzi,
    amenitySolarium,
    amenityElevator,
    amenitySecurity,
    amenityCameras,
    amenityQuincho,
  ]);

  const normalizedSummaryHighlights = useMemo(
    () =>
      summaryHighlights
        .filter((value, index, array) => Boolean(SUMMARY_HIGHLIGHT_OPTIONS_BY_KEY[value]) && array.indexOf(value) === index)
        .slice(0, 8),
    [summaryHighlights]
  );
  const canPersistCustomSummary = normalizedSummaryHighlights.length >= 4;

  const isResidentialType =
    propertyType === "HOUSE" || propertyType === "APARTMENT" || propertyType === "QUINTA";
  const isLandType = propertyType === "LAND" || propertyType === "FIELD";
  const isBusinessType =
    propertyType === "COMMERCIAL" || propertyType === "OFFICE" || propertyType === "WAREHOUSE";

  const summaryMetricValueMap = useMemo<Record<string, SummaryPreviewMetric>>(
    () => ({
      "detail:rooms": {
        key: "detail:rooms",
        label: "Ambientes",
        value: rooms && Number(rooms) > 0 ? rooms : "S/D",
        active: rooms.trim() !== "" && Number(rooms) > 0,
      },
      "detail:coveredAreaM2": {
        key: "detail:coveredAreaM2",
        label: "Sup. cubierta",
        value: coveredAreaM2 && Number(coveredAreaM2) > 0 ? `${coveredAreaM2} m2` : "S/D",
        active: coveredAreaM2.trim() !== "" && Number(coveredAreaM2) > 0,
      },
      "detail:areaM2": {
        key: "detail:areaM2",
        label: "Sup. total",
        value: areaM2 && Number(areaM2) > 0 ? `${areaM2} m2` : "S/D",
        active: areaM2.trim() !== "" && Number(areaM2) > 0,
      },
      "detail:bathrooms": {
        key: "detail:bathrooms",
        label: "Baños",
        value: bathrooms.trim() !== "" ? bathrooms : "-",
        active: bathrooms.trim() !== "" && Number(bathrooms) >= 0,
      },
      "detail:bedrooms": {
        key: "detail:bedrooms",
        label: "Dormitorios",
        value: bedrooms.trim() !== "" ? bedrooms : "-",
        active: bedrooms.trim() !== "" && Number(bedrooms) >= 0,
      },
      "detail:garage": {
        key: "detail:garage",
        label: "Cochera",
        value: hasGarage ? "Si" : "No",
        active: hasGarage,
      },
      "detail:garageSpots": {
        key: "detail:garageSpots",
        label: "Autos en cochera",
        value: hasGarage && garageSpots ? garageSpots : "S/D",
        active: hasGarage && garageSpots.trim() !== "" && Number(garageSpots) > 0,
      },
      "detail:patio": {
        key: "detail:patio",
        label: "Patio",
        value: hasPatio ? "Si" : "No",
        active: hasPatio,
      },
      "detail:laundry": {
        key: "detail:laundry",
        label: "Lavadero",
        value: hasLaundry ? "Si" : "No",
        active: hasLaundry,
      },
      "detail:pets": {
        key: "detail:pets",
        label: "Mascotas",
        value: petsAllowed ? "Si" : "No",
        active: petsAllowed,
      },
      "detail:kids": {
        key: "detail:kids",
        label: "Niños",
        value: kidsAllowed ? "Si" : "No",
        active: kidsAllowed,
      },
      "amenity:AIR_CONDITIONING": {
        key: "amenity:AIR_CONDITIONING",
        label: "Aire acondicionado",
        value: amenityAir ? "Si" : "No",
        active: amenityAir,
      },
      "amenity:HEATER": {
        key: "amenity:HEATER",
        label: "Estufa",
        value: amenityHeater ? "Si" : "No",
        active: amenityHeater,
      },
      "amenity:KITCHEN": {
        key: "amenity:KITCHEN",
        label: "Cocina",
        value: amenityKitchen ? "Si" : "No",
        active: amenityKitchen,
      },
      "amenity:GRILL": {
        key: "amenity:GRILL",
        label: "Parrilla",
        value: amenityGrill ? "Si" : "No",
        active: amenityGrill,
      },
      "amenity:POOL": {
        key: "amenity:POOL",
        label: "Pileta",
        value: amenityPool ? "Si" : "No",
        active: amenityPool,
      },
      "amenity:JACUZZI": {
        key: "amenity:JACUZZI",
        label: "Hidromasaje",
        value: amenityJacuzzi ? "Si" : "No",
        active: amenityJacuzzi,
      },
      "amenity:SOLARIUM": {
        key: "amenity:SOLARIUM",
        label: "Solarium",
        value: amenitySolarium ? "Si" : "No",
        active: amenitySolarium,
      },
      "amenity:ELEVATOR": {
        key: "amenity:ELEVATOR",
        label: "Ascensor",
        value: amenityElevator ? "Si" : "No",
        active: amenityElevator,
      },
      "amenity:PRIVATE_SECURITY": {
        key: "amenity:PRIVATE_SECURITY",
        label: "Seguridad privada",
        value: amenitySecurity ? "Si" : "No",
        active: amenitySecurity,
      },
      "amenity:SECURITY_CAMERAS": {
        key: "amenity:SECURITY_CAMERAS",
        label: "Cámaras de seguridad",
        value: amenityCameras ? "Si" : "No",
        active: amenityCameras,
      },
      "amenity:QUINCHO": {
        key: "amenity:QUINCHO",
        label: "Quincho",
        value: amenityQuincho ? "Si" : "No",
        active: amenityQuincho,
      },
      "service:electricity": {
        key: "service:electricity",
        label: "Luz",
        value: serviceElectricity ? "Si" : "No",
        active: serviceElectricity,
      },
      "service:gas": {
        key: "service:gas",
        label: "Gas",
        value: serviceGas ? "Si" : "No",
        active: serviceGas,
      },
      "service:water": {
        key: "service:water",
        label: "Agua",
        value: serviceWater ? "Si" : "No",
        active: serviceWater,
      },
      "service:sewer": {
        key: "service:sewer",
        label: "Cloaca",
        value: serviceSewer ? "Si" : "No",
        active: serviceSewer,
      },
      "service:internet": {
        key: "service:internet",
        label: "Internet",
        value: serviceInternet ? "Si" : "No",
        active: serviceInternet,
      },
      "service:pavement": {
        key: "service:pavement",
        label: "Asfalto",
        value: servicePavement ? "Si" : "No",
        active: servicePavement,
      },
    }),
    [
      rooms,
      coveredAreaM2,
      areaM2,
      bathrooms,
      bedrooms,
      hasGarage,
      garageSpots,
      hasPatio,
      hasLaundry,
      petsAllowed,
      kidsAllowed,
      amenityAir,
      amenityHeater,
      amenityKitchen,
      amenityGrill,
      amenityPool,
      amenityJacuzzi,
      amenitySolarium,
      amenityElevator,
      amenitySecurity,
      amenityCameras,
      amenityQuincho,
      serviceElectricity,
      serviceGas,
      serviceWater,
      serviceSewer,
      serviceInternet,
      servicePavement,
    ]
  );

  const isSummaryOptionRelevant = (option: SummaryHighlightOption) => {
    if (option.group === "Servicio") return true;
    if (option.key === "detail:coveredAreaM2" || option.key === "detail:areaM2") return true;
    if (isLandType) {
      return (
        option.key === "detail:coveredAreaM2" ||
        option.key === "detail:areaM2"
      );
    }
    if (isBusinessType) {
      if (option.key === "detail:pets" || option.key === "detail:kids") return false;
      if (
        option.key === "amenity:POOL" ||
        option.key === "amenity:JACUZZI" ||
        option.key === "amenity:SOLARIUM" ||
        option.key === "amenity:QUINCHO"
      ) {
        return false;
      }
      return true;
    }
    if (isResidentialType) return true;
    return true;
  };

  const visibleSummaryHighlightsByGroup = useMemo(() => {
    const groups: Record<SummaryHighlightGroup, SummaryHighlightOption[]> = {
      Detalle: [],
      Amenity: [],
      Servicio: [],
    };
    SUMMARY_HIGHLIGHT_OPTIONS.forEach((option) => {
      const selected = normalizedSummaryHighlights.includes(option.key);
      if (!selected && !isSummaryOptionRelevant(option)) return;
      groups[option.group].push(option);
    });
    return groups;
  }, [normalizedSummaryHighlights, propertyType, isResidentialType, isLandType, isBusinessType]);

  const selectedSummaryPreviewMetrics = useMemo(
    () =>
      normalizedSummaryHighlights
        .map((key) => summaryMetricValueMap[key] ?? { key, label: SUMMARY_HIGHLIGHT_OPTIONS_BY_KEY[key]?.label ?? key, value: "S/D", active: false })
        .slice(0, 8),
    [normalizedSummaryHighlights, summaryMetricValueMap]
  );

  const toggleSummaryHighlight = (key: string) => {
    setSummaryHighlights((current) => {
      if (current.includes(key)) {
        return current.filter((item) => item !== key);
      }
      if (current.length >= 8) {
        return current;
      }
      return [...current, key];
    });
  };

  const moveSummaryHighlight = (key: string, direction: "up" | "down") => {
    setSummaryHighlights((current) => {
      const index = current.indexOf(key);
      if (index < 0) return current;
      const targetIndex = direction === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(targetIndex, 0, item);
      return next;
    });
  };

  const reorderSummaryHighlight = (dragKey: string, targetKey: string) => {
    if (!dragKey || dragKey === targetKey) return;
    setSummaryHighlights((current) => {
      const fromIndex = current.indexOf(dragKey);
      const toIndex = current.indexOf(targetKey);
      if (fromIndex < 0 || toIndex < 0) return current;
      const next = [...current];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
  };

  const toggleSummaryEditorGroup = (group: SummaryHighlightGroup) => {
    setSummaryEditorGroupsOpen((current) => ({
      ...current,
      [group]: !current[group],
    }));
  };

  const previewListing = useMemo<PropertyDetailListing>(
    () => ({
      id: "preview",
      title: title || "Sin titulo",
      address: `${addressLine || "Sin dirección"}${localityId ? ` - ${localityId}` : ""}`,
      price: priceAmount ? `${priceAmount} ${priceCurrency}` : "Sin precio",
      operation: operationLabel,
      areaM2: areaM2 ? Number(areaM2) : 0,
      coveredAreaM2: coveredAreaM2 ? Number(coveredAreaM2) : undefined,
      summaryHighlights: canPersistCustomSummary ? normalizedSummaryHighlights : undefined,
      rooms: rooms ? Number(rooms) : 0,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      garage: hasGarage,
      garageSpots: garageSpots ? Number(garageSpots) : undefined,
      garageType: hasGarage ? garageType : undefined,
      pets: petsAllowed,
      kids: kidsAllowed,
      hasPatio,
      patioType: hasPatio ? patioType : undefined,
      laundry: hasLaundry,
      descriptionLong: description || "Sin descripción",
      images: photoPreviews.length
        ? photoPreviews.map((item) => item.url)
        : existingPhotos.map((photo) => photo.url),
      amenities: previewAmenities.length ? previewAmenities : undefined,
      services: {
        electricity: serviceElectricity,
        gas: serviceGas,
        water: serviceWater,
        sewer: serviceSewer,
        internet: serviceInternet,
        pavement: servicePavement,
      },
      expensesAmount: expensesAmount ? `${expensesAmount} ${expensesCurrency}` : undefined,
      financing: {
        available: financingAvailable,
        amount:
          financingAvailable && financingAmount
            ? `${financingAmount} ${financingCurrency}`
            : undefined,
      },
      rentalRequirements:
        operationType === "RENT" && rentInfoPublic
          ? {
              guarantees: rentGuarantees || undefined,
              entryMonths: rentEntryMonths ? Number(rentEntryMonths) : undefined,
              contractDurationMonths: rentContractDuration
                ? Number(rentContractDuration)
                : undefined,
              indexFrequency: rentIndexFrequency || undefined,
              indexType: rentIndexType || undefined,
              indexValue: rentIndexValue ? Number(rentIndexValue) : undefined,
              isPublic: rentInfoPublic,
            }
          : undefined,
    }),
    [
      title,
      addressLine,
      localityId,
      priceAmount,
      priceCurrency,
      operationLabel,
      areaM2,
      coveredAreaM2,
      normalizedSummaryHighlights,
      canPersistCustomSummary,
      rooms,
      bathrooms,
      hasGarage,
      garageSpots,
      garageType,
      petsAllowed,
      kidsAllowed,
      hasPatio,
      patioType,
      hasLaundry,
      description,
      photoPreviews,
      existingPhotos,
      previewAmenities,
      serviceElectricity,
      serviceGas,
      serviceWater,
      serviceSewer,
      serviceInternet,
      servicePavement,
      expensesAmount,
      expensesCurrency,
      financingAvailable,
      financingAmount,
      financingCurrency,
      rentGuarantees,
      rentEntryMonths,
      rentContractDuration,
      rentIndexFrequency,
      rentIndexType,
      rentIndexValue,
      rentInfoPublic,
    ]
  );

  const inputBaseClass =
    "w-full rounded-xl border bg-night-900/48 px-3 py-2 text-sm text-white";
  const inputClass = (invalid: boolean) =>
    `${inputBaseClass} ${invalid ? "border-red-400/70 focus:border-red-400" : "border-white/10"}`;
  const isEmpty = (value: string) => !value.trim();
  const minLength = (value: string, min: number) => value.trim().length < min;
  const isPositiveNumber = (value: string) => value.trim() !== "" && Number(value) > 0;
  const digitsOnly = (value: string) => value.replace(/\D/g, "");
  const titleValid = !minLength(title, 3);
  const descriptionValid = !isEmpty(description);
  const priceValid = !isEmpty(priceAmount) && Number(priceAmount) > 0;
  const addressValid = !minLength(addressLine, 3);
  const localityValid = !isEmpty(localityId);
  const areaValid = isPositiveNumber(areaM2);

  const titleError = showErrors && !titleValid;
  const descriptionError = showErrors && !descriptionValid;
  const priceError = showErrors && !priceValid;
  const addressError = showErrors && !addressValid;
  const localityError = showErrors && !localityValid;
  const areaError = showErrors && !areaValid;

  const roomsValid = !rooms || Number(rooms) >= 0;
  const bathroomsValid = !bathrooms || Number(bathrooms) >= 0;
  const bedroomsValid = !bedrooms || Number(bedrooms) >= 0;

  const roomsError = showErrors && !roomsValid;
  const bathroomsError = showErrors && !bathroomsValid;
  const bedroomsError = showErrors && !bedroomsValid;

  const whatsappDigits = digitsOnly(contactWhatsapp);
  const phoneDigits = digitsOnly(contactPhone);
  const contactRequired = !whatsappDigits && !phoneDigits;
  const whatsappValid = !contactWhatsapp || whatsappDigits.length >= 6;
  const phoneValid = !contactPhone || phoneDigits.length >= 6;

  const contactRequiredError = showErrors && contactRequired;
  const whatsappError = showErrors && !whatsappValid;
  const phoneError = showErrors && !phoneValid;

  const stepMissingLabels = useMemo(() => {
    if (step === 0) {
      return [
        !titleValid ? "título" : null,
        !descriptionValid ? "descripción" : null,
        !priceValid ? "precio" : null,
      ].filter(Boolean) as string[];
    }
    if (step === 1) {
      return [
        !addressValid ? "dirección" : null,
        !localityValid ? "localidad" : null,
      ].filter(Boolean) as string[];
    }
    if (step === 2) {
      return [
        !areaValid ? "superficie total" : null,
        !roomsValid ? "ambientes" : null,
        !bathroomsValid ? "baños" : null,
        !bedroomsValid ? "dormitorios" : null,
      ].filter(Boolean) as string[];
    }
    if (step === 4) {
      return [
        contactRequired ? "WhatsApp o teléfono" : null,
        !whatsappValid ? "WhatsApp válido" : null,
        !phoneValid ? "teléfono válido" : null,
      ].filter(Boolean) as string[];
    }
    return [];
  }, [
    step,
    titleValid,
    descriptionValid,
    priceValid,
    addressValid,
    localityValid,
    areaValid,
    roomsValid,
    bathroomsValid,
    bedroomsValid,
    contactRequired,
    whatsappValid,
    phoneValid,
  ]);

  const canNext = useMemo(() => {
    if (step === 0) {
      return titleValid && descriptionValid && priceValid;
    }
    if (step === 1) {
      return addressValid && localityValid;
    }
    if (step === 2) {
      return areaValid && roomsValid && bathroomsValid && bedroomsValid;
    }
    return true;
  }, [
    step,
    titleValid,
    descriptionValid,
    priceValid,
    addressValid,
    localityValid,
    areaValid,
    roomsValid,
    bathroomsValid,
    bedroomsValid,
  ]);

  const stepCompletion = useMemo(
    () => [
      titleValid && descriptionValid && priceValid,
      addressValid && localityValid,
      areaValid && roomsValid && bathroomsValid && bedroomsValid,
      true,
      !contactRequired && whatsappValid && phoneValid,
    ],
    [
      titleValid,
      descriptionValid,
      priceValid,
      addressValid,
      localityValid,
      areaValid,
      roomsValid,
      bathroomsValid,
      bedroomsValid,
      contactRequired,
      whatsappValid,
      phoneValid,
    ]
  );
  const completedCount = stepCompletion.filter(Boolean).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);
  const locationLockedInEdit = isEditMode;

  const requestStepChange = (target: Step) => {
    if (
      !isEditMode &&
      step === 1 &&
      target !== 1 &&
      !locationReviewConfirmed
    ) {
      setPendingStepTarget(target);
      setShowLocationReviewModal(true);
      return;
    }
    setStep(target);
  };

  const confirmLocationReviewAndContinue = () => {
    setLocationReviewConfirmed(true);
    setShowLocationReviewModal(false);
    if (pendingStepTarget !== null) {
      setStep(pendingStepTarget);
      setPendingStepTarget(null);
    }
  };

  const cancelLocationReviewModal = () => {
    setShowLocationReviewModal(false);
    setPendingStepTarget(null);
  };

  const handleGoToStep = (target: Step) => {
    if (target > step && !canNext) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    requestStepChange(target);
  };

  const handleNextStep = () => {
    if (!canNext) {
      setShowErrors(true);
      return;
    }
    setShowErrors(false);
    requestStepChange((step + 1) as Step);
  };

  const applyGeocodeResult = (
    result: GeocodeResult,
    options?: { syncFields?: boolean; source?: "search" | "map" }
  ) => {
    const shouldSyncFields = options?.syncFields ?? locationLoadMode === "GUIDED";
    setLat(result.lat);
    setLng(result.lng);
    if (shouldSyncFields) {
      // En guiada, sincronizamos todo y limpiamos faltantes para evitar arrastre de valores previos.
      setAddressLine(result.addressLine ?? "");
      setLocalityId(result.locality ?? "");
      setParty(result.party ?? "");
      setProvince(result.province ?? "");
      setPostalCode(result.postalCode ?? "");
      setNeighborhood(result.neighborhood ?? "");
    }
    setGeoStatus("idle");
    if (shouldSyncFields) {
      setGeoMessage(`Ubicacion encontrada y campos actualizados: ${result.displayName}`);
    } else {
      setGeoMessage(
        options?.source === "map"
          ? "Punto actualizado. En modo manual no se autocompletan los campos."
          : "Ubicacion encontrada. En modo manual solo se actualiza el punto."
      );
    }
    setAddressSuggestions([]);
  };

  const handleMapPointChange = async (nextLat: number, nextLng: number) => {
    setLat(nextLat);
    setLng(nextLng);
    setGeoStatus("loading");
    setGeoMessage("Buscando dirección del punto...");
    try {
      const result = await reverseGeocode(nextLat, nextLng);
      applyGeocodeResult(result, {
        syncFields: locationLoadMode === "GUIDED",
        source: "map",
      });
      setAddressQuery(result.displayName);
    } catch {
      setGeoStatus("error");
      setGeoMessage(
        "No pudimos resolver la dirección exacta, pero guardamos el punto del mapa."
      );
    }
  };

  const removeExistingPhoto = async (photoId: string) => {
    if (!isEditMode || !editPropertyId || !sessionToken) return;
    try {
      const response = await fetch(`${env.apiUrl}/properties/${editPropertyId}/photos/${photoId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${sessionToken}` },
      });
      if (!response.ok) {
        throw new Error("No pudimos eliminar la foto.");
      }
      setExistingPhotos((prev) => prev.filter((photo) => photo.id !== photoId));
      addToast("Foto eliminada.", "success");
      setIsDirty(true);
    } catch (error) {
      addToast(error instanceof Error ? error.message : "No pudimos eliminar la foto.", "error");
    }
  };

  const handleFindApproxAddress = async () => {
    const query = (
      addressQuery.trim()
        ? addressQuery
        : [
            addressLine,
            neighborhood,
            party,
            province || "Buenos Aires",
            localityId,
            "Bragado",
            "Argentina",
          ]
            .filter(Boolean)
            .join(", ")
    ).trim();
    if (!query) {
      setGeoStatus("error");
      setGeoMessage("Primero ingresa una dirección aproximada para buscar.");
      return;
    }
    setGeoStatus("loading");
    setGeoMessage("");
    try {
      const result = await geocodeAddress(query);
      if (!result) {
        setGeoStatus("error");
        setGeoMessage("No encontramos esa dirección.");
        return;
      }
      applyGeocodeResult(result, {
        syncFields: locationLoadMode === "GUIDED",
        source: "search",
      });
    } catch (error) {
      setGeoStatus("error");
      setGeoMessage(
        error instanceof Error ? error.message : "No pudimos buscar la dirección."
      );
    }
  };

  const approximateAddressPanel = (
    <div className="space-y-3 rounded-2xl border border-[#AF8C5C]/30 bg-night-900/40 p-3 md:p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-[0.14em] text-[#AF8C5C]">
            Ubicación asistida
          </p>
          <p className="text-[11px] text-[#D1C7BD]">
            Buscá una dirección y luego ajustá el punto si hace falta.
          </p>
        </div>
        <div className="inline-flex rounded-full border border-white/15 bg-night-900/65 p-1">
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              locationLoadMode === "GUIDED"
                ? "bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] text-night-900"
                : "text-[#D1C7BD]"
            }`}
            onClick={() => setLocationLoadMode("GUIDED")}
          >
            Guiada
          </button>
          <button
            type="button"
            className={`rounded-full px-3 py-1 text-[11px] font-medium transition ${
              locationLoadMode === "MANUAL"
                ? "bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] text-night-900"
                : "text-[#D1C7BD]"
            }`}
            onClick={() => setLocationLoadMode("MANUAL")}
          >
            Manual
          </button>
        </div>
      </div>
      <div className="grid gap-2 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
        <label className="space-y-2 text-xs text-[#D1C7BD]">
          Dirección aproximada
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
            value={addressQuery}
            onChange={(event) => setAddressQuery(event.target.value)}
            placeholder="Ej: San Martin 123, Bragado"
          />
        </label>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
          onClick={() => void handleFindApproxAddress()}
          disabled={geoStatus === "loading"}
        >
          {geoStatus === "loading" ? "Buscando..." : "Buscar dirección"}
        </button>
      </div>
      {addressQuery.trim().length >= 3 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] text-[#D1C7BD]">
            <span>Sugerencias</span>
            {suggestionsStatus === "loading" ? <span>Buscando...</span> : null}
          </div>
          {addressSuggestions.length > 0 ? (
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {addressSuggestions.map((suggestion, index) => (
                <button
                  key={`${suggestion.displayName}-${index}`}
                  type="button"
                  className="w-full rounded-xl border border-white/10 bg-night-900/55 px-3 py-2 text-left text-xs text-[#E7E2DD] hover:border-white/20"
                  onClick={() => {
                    applyGeocodeResult(suggestion, {
                      syncFields: locationLoadMode === "GUIDED",
                      source: "search",
                    });
                    setAddressQuery("");
                  }}
                >
                  <div className="truncate font-medium">{suggestion.displayName}</div>
                  <div className="mt-1 flex flex-wrap gap-2 text-[11px] text-[#D1C7BD]">
                    {suggestion.locality ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5">
                        {suggestion.locality}
                      </span>
                    ) : null}
                    {suggestion.party ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5">
                        {suggestion.party}
                      </span>
                    ) : null}
                    {suggestion.province ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5">
                        {suggestion.province}
                      </span>
                    ) : null}
                    {suggestion.postalCode ? (
                      <span className="rounded-full border border-white/10 px-2 py-0.5">
                        CP {suggestion.postalCode}
                      </span>
                    ) : null}
                  </div>
                </button>
              ))}
            </div>
          ) : suggestionsStatus === "idle" ? (
            <div className="text-[11px] text-[#9a948a]">
              No encontramos sugerencias para esa dirección.
            </div>
          ) : null}
        </div>
      )}
      {geoMessage && (
        <div className={`text-xs ${geoStatus === "error" ? "text-[#AF8C5C]" : "text-[#D1C7BD]"}`}>
          {geoMessage}
        </div>
      )}
      {lat !== undefined && lng !== undefined && (
        <div className="text-[11px] text-[#D1C7BD]">
          Coordenadas: {lat.toFixed(5)}, {lng.toFixed(5)}
        </div>
      )}
      <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
        <input
          type="checkbox"
          className="h-4 w-4 accent-[#AF8C5C]"
          checked={showMapLocation}
          onChange={(event) => setShowMapLocation(event.target.checked)}
        />
        Mostrar ubicación en el mapa público
      </label>
    </div>
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const canSubmit =
      titleValid &&
      descriptionValid &&
      priceValid &&
      addressValid &&
      localityValid &&
      areaValid &&
      roomsValid &&
      bathroomsValid &&
      bedroomsValid &&
      !contactRequired &&
      whatsappValid &&
      phoneValid;

    if (!canSubmit) {
      const firstInvalidStep = stepCompletion.findIndex((isComplete) => !isComplete);
      if (firstInvalidStep >= 0 && firstInvalidStep !== step) {
        setStep(firstInvalidStep as Step);
      }
      setShowErrors(true);
      addToast(
        isEditMode
          ? "Revisa los campos obligatorios antes de guardar."
          : "Revisa los campos obligatorios antes de publicar.",
        "error"
      );
      return;
    }
    setStatus("loading");
    setErrorMessage("");

    try {
      if (!sessionUser || !sessionToken) {
        throw new Error("Necesitas iniciar sesión.");
      }

      if (!isEditMode && planHasLimit && planSlotsRemaining !== null && planSlotsRemaining <= 0) {
        throw new Error(
          `Alcanzaste el límite de tu plan (${subscriptionInfo?.planName ?? subscriptionInfo?.planCode ?? "actual"}). Liberá una publicación o mejorá tu plan.`
        );
      }
      if (paidPlanRequiresPaymentMethod) {
        throw new Error(
          `Tu plan (${subscriptionInfo?.planName ?? subscriptionInfo?.planCode ?? "actual"}) requiere cargar un medio de pago antes de publicar. El primer mes gratis se activa cuando completas ese paso desde Mi suscripción.`
        );
      }

      if (!isOwner && !isAgency) {
        throw new Error("Solo dueños o inmobiliarias pueden publicar.");
      }

      if (isAgency && !agencyId) {
        throw new Error("Tu cuenta no tiene inmobiliaria asociada.");
      }

      const amenities: string[] = [];
      if (amenityAir) amenities.push("AIR_CONDITIONING");
      if (amenityHeater) amenities.push("HEATER");
      if (amenityKitchen) amenities.push("KITCHEN");
      if (amenityGrill) amenities.push("GRILL");
      if (amenityPool) amenities.push("POOL");
      if (amenityJacuzzi) amenities.push("JACUZZI");
      if (amenitySolarium) amenities.push("SOLARIUM");
      if (amenityElevator) amenities.push("ELEVATOR");
      if (amenitySecurity) amenities.push("PRIVATE_SECURITY");
      if (amenityCameras) amenities.push("SECURITY_CAMERAS");
      if (amenityQuincho) amenities.push("QUINCHO");

      const businessUses: string[] = [];
      if (businessFood) businessUses.push("FOOD");
      if (businessEvents) businessUses.push("EVENTS");
      if (businessRetail) businessUses.push("RETAIL");
      if (businessFactory) businessUses.push("FACTORY");
      if (businessOffices) businessUses.push("OFFICES");
      if (businessClinics) businessUses.push("CLINICS");

      const officeFeatures: string[] = [];
      if (officeMeetingRoom) officeFeatures.push("MEETING_ROOM");
      if (officeReception) officeFeatures.push("RECEPTION");
      if (officePrivateOffices) officeFeatures.push("PRIVATE_OFFICES");

      const warehouseFeatures: string[] = [];
      if (warehouseTruckAccess) warehouseFeatures.push("TRUCK_ACCESS");
      if (warehouseHeight) warehouseFeatures.push(`HEIGHT_${warehouseHeight}`);
      if (warehouseGateHeight) warehouseFeatures.push(`GATE_${warehouseGateHeight}`);

      const createPayload = {
        title,
        description,
        propertyType,
        operationType,
        priceAmount: Number(priceAmount),
        priceCurrency,
        rooms: isPositiveNumber(rooms) ? Number(rooms) : undefined,
        bathrooms: isPositiveNumber(bathrooms) ? Number(bathrooms) : undefined,
        areaM2: areaM2 ? Number(areaM2) : undefined,
        expensesAmount: expensesAmount ? Number(expensesAmount) : undefined,
        expensesCurrency: expensesAmount ? expensesCurrency : undefined,
        ownerUserId: ownerUserId || undefined,
        agencyId: agencyId || undefined,
        location: {
          addressLine,
          localityId,
          lat,
          lng,
        },
        unitLabel: unitLabel || undefined,
          features: {
            hasGarage,
            garageSpots: hasGarage && garageSpots ? Number(garageSpots) : undefined,
            garageType: hasGarage ? garageType : undefined,
            petsAllowed,
            kidsAllowed,
            hasPatio,
            patioType: hasPatio ? patioType : undefined,
            hasLaundry,
            furnished,
            ageYears: ageYears ? Number(ageYears) : undefined,
            coveredAreaM2: coveredAreaM2 ? Number(coveredAreaM2) : undefined,
            semiCoveredAreaM2: semiCoveredAreaM2 ? Number(semiCoveredAreaM2) : undefined,
            bedrooms: isPositiveNumber(bedrooms) ? Number(bedrooms) : undefined,
            floorsCount: floorsCount ? Number(floorsCount) : undefined,
            party: party || undefined,
            province: province || undefined,
            neighborhood: neighborhood || undefined,
            lotOrParcel: lotOrParcel || undefined,
            postalCode: postalCode || undefined,
            frontageM: frontageM ? Number(frontageM) : undefined,
            depthM: depthM ? Number(depthM) : undefined,
            buildable,
            investmentOpportunity: landInvestment || undefined,
            summaryHighlights: canPersistCustomSummary ? normalizedSummaryHighlights : undefined,
            financingAvailable: financingAvailable || undefined,
            financingAmount: financingAvailable && financingAmount ? Number(financingAmount) : undefined,
            financingCurrency: financingAvailable ? financingCurrency : undefined,
            floor: floor ? Number(floor) : undefined,
            unit: unit || undefined,
            facing: facing || undefined,
            gatedCommunity: gatedCommunity || undefined,
            rentalRequirements:
              operationType === "RENT"
                ? {
                    guarantees: rentGuarantees || undefined,
                    entryMonths: rentEntryMonths ? Number(rentEntryMonths) : undefined,
                    contractDurationMonths: rentContractDuration
                      ? Number(rentContractDuration)
                      : undefined,
                    indexFrequency: rentIndexFrequency || undefined,
                    indexType: rentIndexType || undefined,
                    indexValue: rentIndexValue ? Number(rentIndexValue) : undefined,
                    isPublic: rentInfoPublic,
                  }
                : undefined,
            amenities: amenities.length ? amenities : undefined,
            businessUses: businessUses.length ? businessUses : undefined,
            officeFeatures: officeFeatures.length ? officeFeatures : undefined,
            warehouseFeatures: warehouseFeatures.length ? warehouseFeatures : undefined,
            showMapLocation,
          },
        services: {
          electricity: serviceElectricity,
          gas: serviceGas,
          water: serviceWater,
          sewer: serviceSewer,
          internet: serviceInternet,
          pavement: servicePavement,
        },
        identifiers: cadastralValue
          ? [
              {
                cadastralType,
                cadastralValue,
                localityId,
              },
            ]
          : undefined,
        contactMethods: [
          contactWhatsapp ? { type: "WHATSAPP", value: contactWhatsapp } : null,
          contactPhone ? { type: "PHONE", value: contactPhone } : null,
        ].filter(Boolean),
      };

      const updatePayload = {
        title,
        description,
        propertyType,
        operationType,
        priceAmount: Number(priceAmount),
        priceCurrency,
        rooms: isPositiveNumber(rooms) ? Number(rooms) : undefined,
        bathrooms: isPositiveNumber(bathrooms) ? Number(bathrooms) : undefined,
        areaM2: areaM2 ? Number(areaM2) : undefined,
        expensesAmount: expensesAmount ? Number(expensesAmount) : undefined,
        expensesCurrency: expensesAmount ? expensesCurrency : undefined,
        location: {
          addressLine,
          localityId,
          lat,
          lng,
        },
        unitLabel: unitLabel || undefined,
        features: createPayload.features,
        services: createPayload.services,
        contactMethods: createPayload.contactMethods,
      };

      const endpoint = isEditMode
        ? `${env.apiUrl}/properties/${editPropertyId}`
        : `${env.apiUrl}/properties`;
      const response = await fetch(endpoint, {
        method: isEditMode ? "PATCH" : "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(isEditMode ? updatePayload : createPayload),
      });

      if (!response.ok) {
        const fallback = isEditMode
          ? "No pudimos guardar los cambios."
          : "No pudimos crear la publicación.";
        let message = fallback;
        try {
          const data = (await response.json()) as {
            message?: string;
            issues?: { path?: string; message?: string }[];
          };
          if (Array.isArray(data.issues) && data.issues.length > 0) {
            const fieldLabels: Record<string, string> = {
              title: "Título",
              description: "Descripción",
              propertyType: "Tipo de inmueble",
              operationType: "Operación",
              priceAmount: "Precio",
              priceCurrency: "Moneda",
              expensesAmount: "Expensas",
              expensesCurrency: "Moneda de expensas",
              rooms: "Ambientes",
              bathrooms: "Banos",
              bedrooms: "Dormitorios",
              areaM2: "Superficie total",
              availabilityMode: "Disponibilidad",
              availableFrom: "Disponible desde",
              availableTo: "Disponible hasta",
              "location.addressLine": "Dirección",
              "location.localityId": "Localidad",
              "location.lat": "Latitud",
              "location.lng": "Longitud",
              "features.financingAmount": "Monto financiable",
              "features.financingCurrency": "Moneda de financiación",
              "features.ageYears": "Antiguedad",
              "features.coveredAreaM2": "Superficie cubierta",
              "features.semiCoveredAreaM2": "Superficie semicubierta",
              "features.floorsCount": "Pisos",
              "features.garageSpots": "Cantidad de autos en cochera",
              "features.garageType": "Tipo de cochera",
              "features.hasPatio": "Patio",
              "features.patioType": "Tipo de patio",
              "features.hasLaundry": "Lavadero",
              "features.floor": "Piso",
              "features.unit": "Departamento",
              "features.party": "Partido",
              "features.province": "Provincia",
              "features.neighborhood": "Barrio",
              "features.postalCode": "Código postal",
              "features.lotOrParcel": "Lote/Partida",
              "features.frontageM": "Frente",
              "features.depthM": "Fondo",
            };
            const details = data.issues
              .map((issue) => {
                const field = issue.path ?? "campo";
                const label = fieldLabels[issue.path ?? ""] ?? field.replace(/\./g, " ");
                return `${label}: ${issue.message ?? "inválido"}`;
              })
              .join(" · ");
            message = `${data.message ?? "Validación fallida"} (${details})`;
          } else if (data.message) {
            message = data.message;
          }
        } catch {
          // ignore json parse errors
        }
        throw new Error(message);
      }

      const result = (await response.json()) as { id: string };
      const targetPropertyId = isEditMode ? editPropertyId : result.id;

      if (photos.length && targetPropertyId) {
        const formData = new FormData();
        photos.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetch(
          `${env.apiUrl}/properties/${targetPropertyId}/photos`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionToken}` },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error(
            isEditMode
              ? "Los cambios se guardaron pero fallo la carga de fotos."
              : "La publicación se creo pero fallo la carga de fotos."
          );
        }
        setPhotos([]);
      }

      setStatus("success");
      addToast(
        isEditMode ? "Cambios guardados con exito." : "Publicación creada con exito.",
        "success"
      );
      if (isEditMode) {
        setTimeout(() => navigate("/panel?tab=listings"), 250);
      }
      setIsDirty(false);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error
          ? error.message
          : isEditMode
          ? "Error al guardar cambios."
          : "Error al publicar."
      );
      addToast(
        error instanceof Error
          ? error.message
          : isEditMode
          ? "Error al guardar cambios."
          : "Error al publicar.",
        "error"
      );
    }
  };

  if (isEditMode && initialStatus === "loading") {
    return (
      <div className="glass-card flex min-h-[260px] items-center justify-center p-8 text-sm text-[#D1C7BD]">
        Cargando datos de la publicación...
      </div>
    );
  }

  if (isEditMode && initialStatus === "error") {
    return (
      <div className="glass-card space-y-4 p-6">
        <p className="text-sm text-[#AF8C5C]">{initialError || "No pudimos cargar la publicación."}</p>
        <button
          type="button"
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
          onClick={() => navigate("/panel?tab=listings")}
        >
          Volver al panel
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-full min-w-0 overflow-hidden space-y-4 pb-safe-tabs md:space-y-8 md:pb-0">
      <section className="relative max-w-full min-w-0 overflow-hidden rounded-[24px] border border-white/10 bg-night-900/75 p-4 sm:p-5 md:rounded-[28px] md:p-5">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(175,140,92,0.28),transparent_40%),radial-gradient(circle_at_85%_80%,rgba(209,199,189,0.16),transparent_45%)]" />
        <div className="relative grid min-w-0 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(280px,420px)] lg:items-center">
          <div className="min-w-0 space-y-2">
            <span className="inline-flex items-center rounded-full border border-[#AF8C5C]/40 bg-[#AF8C5C]/12 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-[#E7E2DD]">
              {isEditMode ? "Editar inmueble" : "Publicar inmueble"}
            </span>
            <h2 className="text-xl leading-tight text-white sm:text-2xl md:text-3xl">
              {isEditMode ? "Edita tu publicación" : "Crea tu publicación en 5 minutos"}
            </h2>
            <p className="max-w-2xl text-xs leading-relaxed text-[#D1C7BD] sm:text-sm">
              {isEditMode
                ? "Actualizá datos, ubicación y fotos desde un flujo ordenado."
                : "Cargá los datos clave y revisá la ficha antes de publicar."}
            </p>
          </div>
          <div className="grid w-full min-w-0 gap-2 sm:grid-cols-2 lg:grid-cols-1">
            <span className="gold-pill min-w-0 truncate">{isEditMode ? "Editas como" : "Publicas como"} {roleLabel}</span>
            <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-night-900/55 px-3 py-2 text-xs text-[#D1C7BD]">
              <p className="text-[11px] uppercase tracking-[0.12em] text-[#AF8C5C]">Paso actual</p>
              <p className="mt-1 text-sm text-white">
                {String(step + 1).padStart(2, "0")} · {steps[step]?.title}
              </p>
            </div>
            {!isEditMode && (isOwner || isAgency) && subscriptionInfo && (
              <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-night-900/55 px-3 py-2 text-xs text-[#D1C7BD]">
                <p className="text-[11px] uppercase tracking-[0.12em] text-[#AF8C5C]">
                  Plan y cupo
                </p>
                <p className="mt-1 text-sm text-white">
                  {subscriptionInfo.planCode}
                  {planHasLimit ? ` · ${planUsageCount}/${maxPropertiesByPlan}` : ""}
                </p>
                {planHasLimit && planSlotsRemaining !== null && (
                  <p
                    className={`mt-1 text-[11px] ${
                      planSlotsRemaining <= 0
                        ? "text-rose-300"
                        : planSlotsRemaining <= 1
                        ? "text-amber-200"
                        : "text-[#D1C7BD]"
                    }`}
                  >
                    {planSlotsRemaining <= 0
                      ? "Sin cupo disponible para nuevas publicaciones."
                      : `${planSlotsRemaining} cupo(s) libre(s).`}
                  </p>
                )}
                {subscriptionInfo.isTrialActive && (
                  <p className="mt-1 text-[11px] text-[#9fe0c0]">
                    Primer mes gratis activo · {subscriptionInfo.trialDaysRemaining} días restantes
                  </p>
                )}
                {planUsageStatus === "error" && (
                  <p className="mt-1 text-[11px] text-[#AF8C5C]">{planUsageError}</p>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      <div className={`grid max-w-full min-w-0 items-start gap-4 md:gap-6 xl:grid-cols-[320px_minmax(0,1fr)] ${showNoSlotsModal ? "pointer-events-none select-none opacity-60" : ""}`}>
        <aside className="hidden min-w-0 max-w-full space-y-4 xl:sticky xl:top-24 xl:block">
          <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-night-900/65 p-4">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(175,140,92,0.25),transparent_56%)]" />
            <div className="relative space-y-4">
              <div className="space-y-1">
                <p className="text-[11px] uppercase tracking-[0.16em] text-[#D1C7BD]">
                  {isEditMode ? "Edicion guiada" : "Publicacion guiada"}
                </p>
                <h3 className="text-base text-white">
                  {isEditMode ? "Actualiza en pocos pasos" : "Completa en 5 minutos"}
                </h3>
                <p className="text-xs leading-relaxed text-[#D1C7BD]">
                  {isEditMode
                    ? "Entra al paso que necesites, modifica y guarda."
                    : "Avanza por pasos cortos. Solo pedimos lo necesario para publicar rápido."}
                </p>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] text-[#D1C7BD]">
                  <span>
                    Paso {step + 1} de {steps.length}
                  </span>
                  <span>{progressPercent}%</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] transition-all duration-300"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-night-900/38 px-3 py-2 text-xs text-[#D1C7BD] md:hidden">
                Paso actual:{" "}
                <span className="text-white">
                  {String(step + 1).padStart(2, "0")} · {steps[step]?.title}
                </span>
              </div>
              <div className="hidden overflow-hidden rounded-2xl border border-white/10 md:grid">
                {steps.map((item, index) => {
                  const current = step === index;
                  const completed = stepCompletion[index];
                  return (
                    <button
                      key={item.title}
                      type="button"
                      onClick={() => handleGoToStep(index as Step)}
                      className={`flex w-full min-w-0 items-center gap-3 border-b border-white/10 px-3 py-2 text-left transition last:border-b-0 ${
                        current
                          ? "bg-gold-500/10"
                          : "bg-night-900/35 hover:bg-night-900/55"
                      }`}
                    >
                      <div
                        className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-semibold ${
                          completed
                            ? "bg-emerald-500/20 text-emerald-300"
                            : "bg-gold-500/15 text-gold-300"
                        }`}
                      >
                        {completed ? "OK" : String(index + 1).padStart(2, "0")}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-medium text-white">{item.title}</p>
                        <p className="truncate text-[11px] text-[#D1C7BD]">{item.description}</p>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-night-900/45 p-4 text-xs text-[#D1C7BD]">
            <p className="text-[11px] uppercase tracking-[0.14em] text-[#AF8C5C]">
              Resumen rápido
            </p>
            <div className="mt-3 space-y-2">
              <div className="flex justify-between gap-3">
                <span>Operación</span>
                <span className="text-white">{operationLabel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Tipo</span>
                <span className="text-white">{propertyTypeLabel}</span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Precio</span>
                <span className="text-white">
                  {priceAmount ? `${priceCurrency} ${priceAmount}` : "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Ubicacion</span>
                <span className="max-w-[160px] truncate text-right text-white">
                  {addressLine || "-"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span>Fotos</span>
                <span className="text-white">{photos.length}</span>
              </div>
            </div>
          </div>
        </aside>

        <form
        ref={formRef}
        className="w-full max-w-full min-w-0 overflow-hidden rounded-2xl border border-white/20 bg-night-800/70 shadow-soft space-y-5 p-4 sm:p-5 md:space-y-6 md:p-6"
        onSubmit={handleSubmit}
        onChange={() => setIsDirty(true)}
      >
        <div className="min-w-0 overflow-hidden rounded-2xl border border-white/10 bg-night-900/45 p-4">
          <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#AF8C5C]">
                Paso {step + 1} de {steps.length}
              </p>
              <h3 className="mt-1 text-lg text-white">{steps[step]?.title}</h3>
              <p className="text-xs text-[#D1C7BD]">{steps[step]?.description}</p>
            </div>
            <span className="hidden rounded-full border border-white/15 px-3 py-1 text-xs text-[#D1C7BD] sm:inline-flex">
              Tiempo estimado: 5 min
            </span>
            <button
              type="button"
              className="hidden rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] md:inline-flex"
              onClick={togglePreview}
            >
              {showPreview ? "Ocultar vista previa" : "Ver vista previa"}
            </button>
          </div>
          {showErrors && stepMissingLabels.length > 0 && (
            <div className="mt-3 rounded-2xl border border-red-300/25 bg-red-500/8 px-4 py-3 text-xs text-red-100">
              <span className="font-semibold text-white">Falta completar: </span>
              {stepMissingLabels.join(", ")}.
            </div>
          )}
          <div className="mt-4 space-y-3 md:hidden">
            <div className="flex items-center justify-between text-[11px] text-[#D1C7BD]">
              <span>
                Paso {step + 1} de {steps.length}
              </span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <div className="grid grid-cols-5 gap-1.5">
            {steps.map((item, index) => {
              const current = step === index;
              const completed = stepCompletion[index];
              return (
                <button
                  key={`${item.title}-mobile`}
                  type="button"
                  aria-label={`Ir a ${item.title}`}
                  onClick={() => handleGoToStep(index as Step)}
                    className={`flex h-10 min-w-0 items-center justify-center rounded-xl border text-[11px] font-semibold ${
                    current
                      ? "border-gold-500/60 bg-gold-500/12 text-white"
                      : "border-white/10 bg-night-900/42 text-[#D1C7BD]"
                  }`}
                >
                    {completed ? "OK" : index + 1}
                </button>
              );
            })}
            </div>
          </div>
        </div>
        {step === 0 && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Título
                  <input
                    className={inputClass(titleError)}
                    data-error={titleError ? "true" : undefined}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                    placeholder="Ej: Casa de 3 ambientes con patio"
                  />
                  {titleError && (
                    <span className="text-[11px] text-red-300">
                      Obligatorio. Mínimo 3 caracteres.
                    </span>
                  )}
                </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Operación
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={operationType}
                  onChange={(event) => setOperationType(event.target.value)}
                >
                  <option value="SALE">Venta</option>
                  <option value="RENT">Alquiler</option>
                  <option value="TEMPORARY">Temporario</option>
                </select>
              </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Tipo de inmueble
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={propertyType}
                  onChange={(event) => setPropertyType(event.target.value)}
                >
                  <option value="HOUSE">Casa</option>
                  <option value="APARTMENT">Departamento</option>
                  <option value="LAND">Terreno</option>
                  <option value="FIELD">Campo</option>
                  <option value="QUINTA">Quinta</option>
                  <option value="COMMERCIAL">Comercial</option>
                  <option value="OFFICE">Oficina</option>
                  <option value="WAREHOUSE">Depósito</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Precio
                  <input
                    className={inputClass(priceError)}
                    data-error={priceError ? "true" : undefined}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={priceAmount}
                    onChange={(event) => setPriceAmount(event.target.value)}
                  />
                  {priceError && (
                    <span className="text-[11px] text-red-300">
                      Obligatorio. Debe ser mayor a 0.
                    </span>
                  )}
                </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Moneda
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={priceCurrency}
                  onChange={(event) => setPriceCurrency(event.target.value)}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Descripción
                <textarea
                  rows={4}
                  className={inputClass(descriptionError)}
                  data-error={descriptionError ? "true" : undefined}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Contá lo más importante: estado, distribución, barrio, servicios y condiciones."
                />
                {descriptionError && (
                  <span className="text-[11px] text-red-300">Obligatorio.</span>
                )}
              </label>

              {propertyType === "APARTMENT" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Expensas (monto)
                    <input
                      className={inputClass(false)}
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="1"
                      value={expensesAmount}
                      onChange={(event) => setExpensesAmount(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Moneda expensas
                    <select
                      className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                      value={expensesCurrency}
                      onChange={(event) => setExpensesCurrency(event.target.value)}
                    >
                      <option value="ARS">ARS</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                </div>
              )}

              <div className="space-y-3">
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={financingAvailable}
                    onChange={(event) => setFinancingAvailable(event.target.checked)}
                  />
                  Financia
                </label>
                {financingAvailable && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Monto financiable
                      <input
                        className={inputClass(false)}
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="1"
                        value={financingAmount}
                        onChange={(event) => setFinancingAmount(event.target.value)}
                      />
                    </label>
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Moneda financiación
                      <select
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={financingCurrency}
                        onChange={(event) => setFinancingCurrency(event.target.value)}
                      >
                        <option value="ARS">ARS</option>
                        <option value="USD">USD</option>
                      </select>
                    </label>
                  </div>
                )}
              </div>
            </div>
          )}

          {step === 0 && operationType === "RENT" && (
            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">
                Requisitos del alquiler
              </h4>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Garantías solicitadas
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    placeholder="Ej: Garantía propietaria, recibo de sueldo"
                    value={rentGuarantees}
                    onChange={(event) => setRentGuarantees(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Meses para entrar
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={rentEntryMonths}
                    onChange={(event) => setRentEntryMonths(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Duración del contrato (meses)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={rentContractDuration}
                    onChange={(event) => setRentContractDuration(event.target.value)}
                  />
                </label>
              </div>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Indexación cada
                  <select
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={rentIndexFrequency}
                    onChange={(event) => setRentIndexFrequency(event.target.value)}
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
                    value={rentIndexType}
                    onChange={(event) => setRentIndexType(event.target.value)}
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
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={rentIndexValue}
                    onChange={(event) => setRentIndexValue(event.target.value)}
                  />
                </label>
              </div>
              <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={rentInfoPublic}
                  onChange={(event) => setRentInfoPublic(event.target.checked)}
                />
                Mostrar esta información de forma pública
              </label>
            </div>
          )}

        {step === 1 && (
          <div className="space-y-6">
            {locationLockedInEdit && (
              <div className="rounded-2xl border border-amber-300/25 bg-amber-500/8 p-4 text-xs text-amber-100">
                <p className="font-medium text-white">Ubicación bloqueada en edición</p>
                <p className="mt-1 leading-relaxed">
                  Para evitar duplicados y posibles fraudes, una vez publicada no se puede cambiar
                  la dirección, localidad, unidad ni el punto del mapa. Si se trata de otro
                  inmueble, crea una nueva publicación.
                </p>
              </div>
            )}
            <fieldset disabled={locationLockedInEdit} className={locationLockedInEdit ? "opacity-70" : ""}>
              {approximateAddressPanel}
            <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Dirección
                  <input
                    className={inputClass(addressError)}
                    data-error={addressError ? "true" : undefined}
                    value={addressLine}
                    onChange={(event) => setAddressLine(event.target.value)}
                  />
                  {addressError && (
                    <span className="text-[11px] text-red-300">
                      Obligatorio. Mínimo 3 caracteres.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Localidad
                  <input
                    className={inputClass(localityError)}
                    data-error={localityError ? "true" : undefined}
                    value={localityId}
                    onChange={(event) => setLocalityId(event.target.value)}
                  />
                  {localityError && (
                    <span className="text-[11px] text-red-300">Obligatorio.</span>
                  )}
                </label>
            </div>

            <div className="grid gap-4 md:grid-cols-4">
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Partido
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={party}
                  onChange={(event) => setParty(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Provincia
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={province}
                  onChange={(event) => setProvince(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Barrio
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Barrio cerrado
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={gatedCommunity}
                  onChange={(event) =>
                    setGatedCommunity(
                      event.target.value as "" | "CLOSED" | "SEMI_CLOSED"
                    )
                  }
                >
                  <option value="">No aplica</option>
                  <option value="CLOSED">Cerrado</option>
                  <option value="SEMI_CLOSED">Semi cerrado</option>
                </select>
              </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Código postal
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Unidad / Lote (opcional)
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={unitLabel}
                  onChange={(event) => setUnitLabel(event.target.value)}
                  placeholder="Ej: Dpto 3B, Casa 2, Lote 5"
                />
              </label>
              {propertyType === "LAND" && (
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Lote o partida
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={lotOrParcel}
                    onChange={(event) => setLotOrParcel(event.target.value)}
                  />
                </label>
              )}
            </div>

            {propertyType === "APARTMENT" && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Piso
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={floor}
                    onChange={(event) => setFloor(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Departamento (ej: 3F)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                  />
                </label>
              </div>
            )}

            <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4 md:hidden">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="text-xs text-[#D1C7BD]">
                  Marcá el punto exacto en el mapa.
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                  onClick={() => setShowMapPicker(true)}
                  disabled={locationLockedInEdit}
                >
                  Ampliar
                </button>
              </div>
              <LocationPicker
                lat={lat}
                lng={lng}
                onChange={(nextLat, nextLng) => {
                  if (locationLockedInEdit) return;
                  void handleMapPointChange(nextLat, nextLng);
                }}
              />
              {lat !== undefined && lng !== undefined ? (
                <div className="text-[11px] text-[#D1C7BD]">
                  Coordenadas actuales: {lat.toFixed(5)}, {lng.toFixed(5)}
                </div>
              ) : (
                <div className="text-[11px] text-[#D1C7BD]">
                  Todavía no marcaste la ubicación.
                </div>
              )}
            </div>

            <div className="hidden md:block">
              <LocationPicker
                lat={lat}
                lng={lng}
                onChange={(nextLat, nextLng) => {
                  if (locationLockedInEdit) return;
                  void handleMapPointChange(nextLat, nextLng);
                }}
              />
            </div>
            </fieldset>

          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-night-900/32 px-4 py-3 text-sm text-[#cfc9bf]">
              Tipo seleccionado: <span className="text-white">{propertyTypeLabel}</span>
            </div>

            <div className="rounded-2xl border border-white/10 bg-night-900/28 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-white">Vista destacada en ficha</h4>
                  <p className="mt-1 text-xs text-[#D1C7BD]">
                    Elegí y ordená hasta 8 datos para el bloque de resumen (2 columnas).
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {normalizedSummaryHighlights.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setSummaryHighlights([])}
                      className="rounded-full border border-white/15 px-3 py-1 text-xs text-[#D1C7BD]"
                    >
                      Automático
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setShowSummaryEditor((current) => !current)}
                    className="rounded-full border border-gold-400/30 bg-gold-500/10 px-3 py-1 text-xs font-medium text-gold-300"
                  >
                    {showSummaryEditor ? "Cerrar editor" : "Editar vista"}
                  </button>
                </div>
              </div>

              <div className="mt-3 rounded-xl border border-white/10 bg-night-900/40 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-[#D1C7BD]">
                    Vista seleccionada ({normalizedSummaryHighlights.length}/8)
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowPreview(true)}
                      className="rounded-full border border-white/15 bg-night-900/60 px-3 py-1 text-[11px] text-[#E7E2DD]"
                    >
                      Previsualizar ficha
                    </button>
                    {normalizedSummaryHighlights.length > 0 &&
                      normalizedSummaryHighlights.length < 4 && (
                        <div className="text-[11px] text-amber-200">
                          Seleccioná al menos 4.
                        </div>
                      )}
                  </div>
                </div>

                {normalizedSummaryHighlights.length > 0 ? (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {selectedSummaryPreviewMetrics.map((metric, index) => (
                      <div
                        key={metric.key}
                        draggable
                        onDragStart={() => setDraggingSummaryKey(metric.key)}
                        onDragEnd={() => {
                          setDraggingSummaryKey(null);
                          setDragOverSummaryKey(null);
                        }}
                        onDragOver={(event) => {
                          event.preventDefault();
                          if (draggingSummaryKey && draggingSummaryKey !== metric.key) {
                            setDragOverSummaryKey(metric.key);
                          }
                        }}
                        onDragLeave={() => {
                          if (dragOverSummaryKey === metric.key) {
                            setDragOverSummaryKey(null);
                          }
                        }}
                        onDrop={(event) => {
                          event.preventDefault();
                          if (!draggingSummaryKey) return;
                          reorderSummaryHighlight(draggingSummaryKey, metric.key);
                          setDraggingSummaryKey(null);
                          setDragOverSummaryKey(null);
                        }}
                        className={`group relative rounded-xl border px-3 py-2 transition ${
                          draggingSummaryKey === metric.key
                            ? "border-gold-400/45 bg-gold-500/10 shadow-[0_0_0_1px_rgba(175,140,92,0.22)]"
                            : dragOverSummaryKey === metric.key
                            ? "border-sky-300/35 bg-sky-400/10 shadow-[0_0_0_1px_rgba(125,211,252,0.15)]"
                            : metric.active
                            ? "border-white/10 bg-night-900/55"
                            : "border-white/5 bg-night-900/35 opacity-75"
                        }`}
                        title="Arrastrá para cambiar el orden"
                      >
                        {dragOverSummaryKey === metric.key && draggingSummaryKey !== metric.key && (
                          <div className="pointer-events-none absolute inset-x-2 -top-1">
                            <div className="h-0.5 rounded-full bg-sky-300 shadow-[0_0_10px_rgba(125,211,252,0.6)]" />
                          </div>
                        )}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex min-w-0 items-center gap-2">
                            <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full border border-white/10 bg-night-800 px-1 text-[10px] text-[#D1C7BD]">
                              {index + 1}
                            </span>
                            <div className="min-w-0">
                              <div className="truncate text-[11px] uppercase tracking-[0.12em] text-[#D1C7BD]">
                                {metric.label}
                              </div>
                              <div className={`truncate text-xs font-semibold ${metric.active ? "text-white" : "text-[#9a948a]"}`}>
                                {metric.value}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => moveSummaryHighlight(metric.key, "up")}
                              disabled={index === 0}
                              className="rounded-md border border-white/10 px-1.5 py-1 text-[10px] text-[#D1C7BD] disabled:opacity-30"
                              aria-label="Subir"
                            >
                              ↑
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSummaryHighlight(metric.key, "down")}
                              disabled={index === selectedSummaryPreviewMetrics.length - 1}
                              className="rounded-md border border-white/10 px-1.5 py-1 text-[10px] text-[#D1C7BD] disabled:opacity-30"
                              aria-label="Bajar"
                            >
                              ↓
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSummaryHighlight(metric.key)}
                              className="rounded-md border border-red-400/25 bg-red-500/10 px-1.5 py-1 text-[10px] text-red-200"
                              aria-label="Quitar"
                            >
                              ×
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-2 text-xs text-[#D1C7BD]">
                    Modo automático activo. La ficha mostrará el resumen por defecto.
                  </div>
                )}
              </div>

              {showSummaryEditor && (
                <div className="mt-3 space-y-3 rounded-xl border border-white/10 bg-night-900/35 p-3">
                  <div className="text-xs text-[#D1C7BD]">
                    Elegí qué mostrar. Los que no tienen datos cargados se ven deshabilitados.
                    Podés seleccionarlos igual después de completar el formulario.
                  </div>
                  {(["Detalle", "Amenity", "Servicio"] as const).map((group) => {
                    const isOpen = summaryEditorGroupsOpen[group];
                    const options = visibleSummaryHighlightsByGroup[group];
                    return (
                      <div key={group} className="rounded-xl border border-white/10 bg-night-900/30">
                        <button
                          type="button"
                          onClick={() => toggleSummaryEditorGroup(group)}
                          className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left"
                        >
                          <span className="text-[11px] uppercase tracking-[0.14em] text-[#D1C7BD]">
                            {group}
                          </span>
                          <span
                            className={`text-xs text-[#D1C7BD] transition-transform ${
                              isOpen ? "rotate-180" : ""
                            }`}
                            aria-hidden="true"
                          >
                            ▾
                          </span>
                        </button>
                        {isOpen && (
                          <div className="border-t border-white/10 px-3 py-3">
                            <div className="flex flex-wrap gap-2">
                              {options.map((option) => {
                                const selected = normalizedSummaryHighlights.includes(option.key);
                                const limitReached =
                                  !selected && normalizedSummaryHighlights.length >= 8;
                                const metric = summaryMetricValueMap[option.key];
                                const isActive = metric?.active ?? false;
                                return (
                                  <button
                                    key={option.key}
                                    type="button"
                                    onClick={() => toggleSummaryHighlight(option.key)}
                                    disabled={limitReached}
                                    className={`rounded-full border px-3 py-1.5 text-xs transition ${
                                      selected
                                        ? "border-gold-400/35 bg-gold-500/15 text-gold-200"
                                        : isActive
                                        ? "border-white/10 bg-night-900/60 text-[#E7E2DD]"
                                        : "border-white/10 bg-night-900/45 text-[#8e887f]"
                                    } ${limitReached ? "opacity-40" : ""}`}
                                    title={
                                      isActive
                                        ? `${option.label}: ${metric?.value ?? "Si"}`
                                        : "Todavía no tiene datos cargados"
                                    }
                                  >
                                    {selected ? "✓ " : ""}{option.label}
                                  </button>
                                );
                              })}
                              {options.length === 0 && (
                                <span className="text-xs text-[#8e887f]">
                                  No hay opciones relevantes para este tipo de inmueble.
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Características principales</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Superficie total (m2)
                  <input
                    className={inputClass(areaError)}
                    data-error={areaError ? "true" : undefined}
                    value={areaM2}
                    onChange={(event) => setAreaM2(event.target.value)}
                  />
                  {areaError && (
                    <span className="text-[11px] text-red-300">
                      Obligatorio. Debe ser mayor a 0.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Superficie cubierta (m2)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={coveredAreaM2}
                    onChange={(event) => setCoveredAreaM2(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Superficie semicubierta (m2)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={semiCoveredAreaM2}
                    onChange={(event) => setSemiCoveredAreaM2(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Ambientes
                  <input
                    className={inputClass(roomsError)}
                    data-error={roomsError ? "true" : undefined}
                    value={rooms}
                    onChange={(event) => setRooms(event.target.value)}
                  />
                  {roomsError && (
                    <span className="text-[11px] text-red-300">
                      Debe ser 0 o mayor.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Banos
                  <input
                    className={inputClass(bathroomsError)}
                    data-error={bathroomsError ? "true" : undefined}
                    value={bathrooms}
                    onChange={(event) => setBathrooms(event.target.value)}
                  />
                  {bathroomsError && (
                    <span className="text-[11px] text-red-300">
                      Debe ser 0 o mayor.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Dormitorios
                  <input
                    className={inputClass(bedroomsError)}
                    data-error={bedroomsError ? "true" : undefined}
                    value={bedrooms}
                    onChange={(event) => setBedrooms(event.target.value)}
                  />
                  {bedroomsError && (
                    <span className="text-[11px] text-red-300">
                      Debe ser 0 o mayor.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Antiguedad (anos)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={ageYears}
                    onChange={(event) => setAgeYears(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Pisos
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={floorsCount}
                    onChange={(event) => setFloorsCount(event.target.value)}
                  />
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={hasGarage}
                    onChange={(event) => setHasGarage(event.target.checked)}
                  />
                  Cochera
                </label>
                {hasGarage && (
                  <>
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Cantidad de autos
                      <input
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        type="number"
                        inputMode="numeric"
                        min="1"
                        step="1"
                        value={garageSpots}
                        onChange={(event) => setGarageSpots(event.target.value)}
                      />
                    </label>
                    <label className="space-y-2 text-xs text-[#D1C7BD]">
                      Tipo de cochera
                      <select
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={garageType}
                        onChange={(event) =>
                          setGarageType(event.target.value as "COVERED" | "OPEN")
                        }
                      >
                        <option value="COVERED">Cubierta</option>
                        <option value="OPEN">Abierta</option>
                      </select>
                    </label>
                  </>
                )}
                {(propertyType === "HOUSE" ||
                  propertyType === "APARTMENT" ||
                  propertyType === "QUINTA") && (
                  <>
                    <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#AF8C5C]"
                        checked={hasPatio}
                        onChange={(event) => setHasPatio(event.target.checked)}
                      />
                      Tiene patio
                    </label>
                    {hasPatio && (
                      <label className="space-y-2 text-xs text-[#D1C7BD]">
                        Tipo de patio
                        <select
                          className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                          value={patioType}
                          onChange={(event) =>
                            setPatioType(event.target.value as "GRASS" | "FLOOR" | "CEMENT")
                          }
                        >
                          <option value="GRASS">Césped</option>
                          <option value="FLOOR">Piso</option>
                          <option value="CEMENT">Cemento</option>
                        </select>
                      </label>
                    )}
                    <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-[#AF8C5C]"
                        checked={hasLaundry}
                        onChange={(event) => setHasLaundry(event.target.checked)}
                      />
                      Lavadero
                    </label>
                  </>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Amenities</h4>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityAir}
                    onChange={(event) => setAmenityAir(event.target.checked)}
                  />
                  Aire acondicionado
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityHeater}
                    onChange={(event) => setAmenityHeater(event.target.checked)}
                  />
                  Estufa
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityKitchen}
                    onChange={(event) => setAmenityKitchen(event.target.checked)}
                  />
                  Cocina
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityGrill}
                    onChange={(event) => setAmenityGrill(event.target.checked)}
                  />
                  Parrilla
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityPool}
                    onChange={(event) => setAmenityPool(event.target.checked)}
                  />
                  Piscina / pileta
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityJacuzzi}
                    onChange={(event) => setAmenityJacuzzi(event.target.checked)}
                  />
                  Hidromasaje
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenitySolarium}
                    onChange={(event) => setAmenitySolarium(event.target.checked)}
                  />
                  Solarium
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityElevator}
                    onChange={(event) => setAmenityElevator(event.target.checked)}
                  />
                  Ascensor
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenitySecurity}
                    onChange={(event) => setAmenitySecurity(event.target.checked)}
                  />
                  Seguridad privada
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityCameras}
                    onChange={(event) => setAmenityCameras(event.target.checked)}
                  />
                  Camaras de seguridad
                </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={amenityQuincho}
                    onChange={(event) => setAmenityQuincho(event.target.checked)}
                  />
                  Quincho
                </label>
              </div>
            </div>

            {(propertyType === "HOUSE" || propertyType === "APARTMENT") && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Convivencia</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={furnished}
                      onChange={(event) => setFurnished(event.target.checked)}
                    />
                    Amueblado
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={petsAllowed}
                      onChange={(event) => setPetsAllowed(event.target.checked)}
                    />
                    Mascotas
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={kidsAllowed}
                      onChange={(event) => setKidsAllowed(event.target.checked)}
                    />
                    Niños
                  </label>
                </div>
              </div>
            )}

            {propertyType === "APARTMENT" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Departamento</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Vista
                    <select
                      className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                      value={facing}
                      onChange={(event) => setFacing(event.target.value)}
                    >
                      <option value="FRONT">Frente</option>
                      <option value="BACK">Contrafrente</option>
                      <option value="INTERNAL">Pulmon</option>
                    </select>
                  </label>
                </div>
              </div>
            )}

            {propertyType === "LAND" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Terreno</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Frente (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                      value={frontageM}
                      onChange={(event) => setFrontageM(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Fondo (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                      value={depthM}
                      onChange={(event) => setDepthM(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={buildable}
                      onChange={(event) => setBuildable(event.target.checked)}
                    />
                    Apto para construir
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={landInvestment}
                      onChange={(event) => setLandInvestment(event.target.checked)}
                    />
                    Oportunidad de inversion
                  </label>
                </div>
              </div>
            )}

            {propertyType === "COMMERCIAL" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Negocio</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={businessFood}
                      onChange={(event) => setBusinessFood(event.target.checked)}
                    />
                    Local de comida
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={businessEvents}
                      onChange={(event) => setBusinessEvents(event.target.checked)}
                    />
                    Salon de eventos
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={businessRetail}
                      onChange={(event) => setBusinessRetail(event.target.checked)}
                    />
                    Negocio comercial
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={businessFactory}
                      onChange={(event) => setBusinessFactory(event.target.checked)}
                    />
                    Fabrica
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={businessOffices}
                      onChange={(event) => setBusinessOffices(event.target.checked)}
                    />
                    Oficinas
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={businessClinics}
                      onChange={(event) => setBusinessClinics(event.target.checked)}
                    />
                    Consultorios
                  </label>
                </div>
              </div>
            )}

            {propertyType === "OFFICE" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Oficina</h4>
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={officeMeetingRoom}
                      onChange={(event) => setOfficeMeetingRoom(event.target.checked)}
                    />
                    Sala de reuniones
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={officeReception}
                      onChange={(event) => setOfficeReception(event.target.checked)}
                    />
                    Recepción
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={officePrivateOffices}
                      onChange={(event) => setOfficePrivateOffices(event.target.checked)}
                    />
                    Despachos
                  </label>
                </div>
              </div>
            )}

            {propertyType === "WAREHOUSE" && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Galpón / depósito</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#AF8C5C]"
                      checked={warehouseTruckAccess}
                      onChange={(event) => setWarehouseTruckAccess(event.target.checked)}
                    />
                    Acceso camión
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Altura (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                      value={warehouseHeight}
                      onChange={(event) => setWarehouseHeight(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Altura portón (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                      value={warehouseGateHeight}
                      onChange={(event) => setWarehouseGateHeight(event.target.value)}
                    />
                  </label>
                </div>
              </div>
            )}
          </div>
        )}
        {step === 3 && (
            <div className="space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={serviceElectricity}
                  onChange={(event) => setServiceElectricity(event.target.checked)}
                />
                Luz
              </label>
              <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={serviceGas}
                  onChange={(event) => setServiceGas(event.target.checked)}
                />
                Gas
              </label>
              <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={serviceWater}
                  onChange={(event) => setServiceWater(event.target.checked)}
                />
                Agua
              </label>
              <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={serviceSewer}
                  onChange={(event) => setServiceSewer(event.target.checked)}
                />
                Cloaca
              </label>
              <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#AF8C5C]"
                  checked={serviceInternet}
                  onChange={(event) => setServiceInternet(event.target.checked)}
                />
                Internet
              </label>
                <label className="flex items-center gap-3 text-xs text-[#D1C7BD]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#AF8C5C]"
                    checked={servicePavement}
                    onChange={(event) => setServicePavement(event.target.checked)}
                  />
                  Asfalto
                </label>
              </div>
            </div>
          )}

        {step === 4 && (
          <div className="space-y-6">
            {isEditMode && (
              <div className="space-y-3">
                <label className="text-xs text-[#D1C7BD]">Fotos actuales</label>
                {existingPhotos.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {existingPhotos.map((photo) => (
                      <div
                        key={photo.id}
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-night-900/48"
                      >
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white"
                          onClick={() => void removeExistingPhoto(photo.id)}
                        >
                          Quitar
                        </button>
                        <img
                          src={photo.url}
                          alt="Foto actual"
                          className="h-24 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-[#D1C7BD]">No hay fotos cargadas.</p>
                )}
              </div>
            )}

            <div className="space-y-3">
              <label className="text-xs text-[#D1C7BD]">
                {isEditMode ? "Agregar nuevas fotos (hasta 12)" : "Fotos (hasta 12)"}
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-[#E7E2DD]"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  if (!files.length) return;
                  setPhotos((prev) => {
                    const next = [...prev, ...files];
                    const deduped = next.filter(
                      (file, index, all) =>
                        all.findIndex(
                          (item) =>
                            item.name === file.name &&
                            item.size === file.size &&
                            item.lastModified === file.lastModified,
                        ) === index,
                    );
                    return deduped.slice(0, 12);
                  });
                  event.target.value = "";
                }}
              />
              <p className="text-[11px] leading-relaxed text-[#D1C7BD]">
                Podés elegir una foto o varias. Cada selección se suma a las anteriores hasta 12;
                si alguna no te gusta, quitála desde la vista previa de abajo.
              </p>
              {photos.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-[#D1C7BD]">
                    {photos.length}/12 fotos seleccionadas.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {photoPreviews.map((item) => (
                      <div
                        key={item.url}
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-night-900/48"
                      >
                        <button
                          type="button"
                          className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white"
                          onClick={() =>
                            setPhotos((prev) => prev.filter((file) => file !== item.file))
                          }
                        >
                          Quitar
                        </button>
                        <img
                          src={item.url}
                          alt={item.file.name}
                          className="h-24 w-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                WhatsApp
                <input
                  className={inputClass(contactRequiredError || whatsappError)}
                  data-error={contactRequiredError || whatsappError ? "true" : undefined}
                  value={contactWhatsapp}
                  onChange={(event) => setContactWhatsapp(event.target.value)}
                />
                {contactRequiredError && (
                  <span className="text-[11px] text-red-300">
                    Ingresa WhatsApp o teléfono para poder contactar.
                  </span>
                )}
                {whatsappError && (
                  <span className="text-[11px] text-red-300">
                    Debe tener al menos 6 dígitos.
                  </span>
                )}
              </label>
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Teléfono
                <input
                  className={inputClass(contactRequiredError || phoneError)}
                  data-error={contactRequiredError || phoneError ? "true" : undefined}
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
                {contactRequiredError && (
                  <span className="text-[11px] text-red-300">
                    Ingresa WhatsApp o teléfono para poder contactar.
                  </span>
                )}
                {phoneError && (
                  <span className="text-[11px] text-red-300">
                    Debe tener al menos 6 dígitos.
                  </span>
                )}
              </label>
            </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Catastro tipo
                  <select
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={cadastralType}
                    onChange={(event) => setCadastralType(event.target.value)}
                  >
                    <option value="PARTIDA">Partida</option>
                    <option value="NOMENCLATURA">Nomenclatura</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
                  Catastro valor
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={cadastralValue}
                    onChange={(event) => setCadastralValue(event.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                className="hidden rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] md:inline-flex"
                onClick={togglePreview}
              >
                {showPreview ? "Ocultar vista previa" : "Ver vista previa pública"}
              </button>
            </div>
          )}

          {showPreview && (
            <section ref={previewRef} className="hidden space-y-3 rounded-3xl border border-white/10 bg-night-950/45 p-3 sm:p-4 md:block">
              <div className="flex flex-wrap items-start justify-between gap-3 px-1">
                <div>
                  <p className="text-[11px] uppercase tracking-[0.16em] text-[#AF8C5C]">
                    Vista previa pública
                  </p>
                  <h3 className="mt-1 text-base font-semibold text-white">
                    Así se verá la ficha antes de publicarla
                  </h3>
                  <p className="mt-1 text-xs text-[#D1C7BD]">
                    Los botones de contacto quedan desactivados en esta vista.
                  </p>
                </div>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                  onClick={() => setShowPreview(false)}
                >
                  Ocultar
                </button>
              </div>
              <PropertyDetailModal
                listing={previewListing}
                variant="page"
                actions={
                  <div className="rounded-2xl border border-white/10 bg-night-950/45 px-4 py-3 text-xs text-[#D1C7BD]">
                    Vista previa: al publicar, acá aparecerán las acciones de contacto.
                  </div>
                }
              />
            </section>
          )}
          {showMapPicker && !locationLockedInEdit && (
            <div className="fixed inset-0 z-[1300] flex items-center justify-center bg-night-950 p-4">
              <div className="w-full max-w-2xl max-h-[88vh] overflow-y-auto space-y-4 rounded-3xl border border-white/10 bg-night-900 p-4 shadow-card md:p-6">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg text-white">Marcar ubicación</h3>
                    <p className="text-xs text-[#D1C7BD]">
                      Tocá el mapa para guardar el punto exacto.
                    </p>
                  </div>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                    onClick={() => setShowMapPicker(false)}
                  >
                    Cerrar
                  </button>
                </div>
                <LocationPicker
                  lat={lat}
                  lng={lng}
                  onChange={(nextLat, nextLng) => {
                    void handleMapPointChange(nextLat, nextLng);
                  }}
                />
                <div className="flex justify-end gap-2">
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                    onClick={() => setShowMapPicker(false)}
                  >
                    Listo
                  </button>
                </div>
              </div>
            </div>
          )}

          {status === "error" && (
            <p className="text-xs text-[#AF8C5C]">{errorMessage}</p>
          )}
        {status === "success" && (
          <p className="text-xs text-[#9fe0c0]">{isEditMode ? "Cambios guardados correctamente." : "Publicación creada correctamente."}</p>
        )}

            <div className="rounded-2xl border border-white/10 bg-night-900/95 px-2 py-2 sm:border-transparent sm:bg-transparent sm:p-0">
            <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="grid w-full grid-cols-2 gap-2 sm:flex sm:w-auto sm:flex-wrap sm:gap-3">
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                type="button"
                onClick={() => {
                  setShowErrors(false);
                  requestStepChange(step > 0 ? ((step - 1) as Step) : step);
                }}
                disabled={step === 0}
              >
                Anterior
              </button>
              {step < steps.length - 1 && (
                <button
                  className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                  type="button"
                  onClick={handleNextStep}
                >
                  Siguiente
                </button>
              )}
            </div>

          {(isEditMode || step === steps.length - 1) && (
            <button
              className="w-full rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900 sm:w-auto"
              type="submit"
              disabled={status === "loading"}
            >
              {status === "loading"
                ? isEditMode
                  ? "Guardando..."
                  : "Enviando..."
                : isEditMode
                ? "Guardar cambios"
                : "Publicar"}
            </button>
          )}
        </div>
        </div>
      </form>
      </div>
      <ConfirmLeaveModal
        open={showLocationReviewModal}
        title="Revisá bien la ubicación antes de continuar"
        message="Después de publicar no vas a poder cambiar dirección, localidad, unidad ni el punto del mapa desde la edición. Esto ayuda a evitar duplicados y posibles estafas."
        confirmLabel="Continuar"
        cancelLabel="Revisar ubicación"
        onConfirm={confirmLocationReviewAndContinue}
        onCancel={cancelLocationReviewModal}
      />
      {showNoSlotsModal && (
        <div className="fixed inset-0 z-[1600] flex items-center justify-center bg-night-950 px-4">
          <div className="w-full max-w-lg rounded-3xl border border-[#AF8C5C]/35 bg-night-900 shadow-[0_24px_80px_rgba(0,0,0,0.5)]">
            <div className="border-b border-white/10 px-5 py-4 sm:px-6">
              <p className="text-[11px] uppercase tracking-[0.14em] text-[#AF8C5C]">
                Cupo completo
              </p>
              <h3 className="mt-1 text-lg text-white">
                No puedes cargar nuevos inmuebles con tu plan actual
              </h3>
            </div>
            <div className="space-y-3 px-5 py-4 text-sm text-[#D1C7BD] sm:px-6 sm:py-5">
              <p>
                Tu plan tiene el cupo completo ({planUsageCount}/{maxPropertiesByPlan}). Para crear
                una nueva publicación, libera cupo dando de baja/pausando una publicación o mejora
                tu plan.
              </p>
              <p className="rounded-2xl border border-white/10 bg-night-900/65 px-3 py-2 text-xs text-[#E7E2DD]">
                Plan actual: <span className="font-semibold text-white">{subscriptionInfo?.planName ?? subscriptionInfo?.planCode ?? "Actual"}</span>
              </p>
            </div>
            <div className="flex flex-col gap-2 border-t border-white/10 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                onClick={() => navigate("/panel?tab=listings")}
              >
                Ver mis inmuebles
              </button>
              <button
                type="button"
                className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                onClick={() => navigate("/panel?tab=subscription")}
              >
                Ir a mi suscripción
              </button>
            </div>
          </div>
        </div>
      )}
      <ConfirmLeaveModal open={show} onConfirm={confirmLeave} onCancel={cancelLeave} />
    </div>
  );
}






