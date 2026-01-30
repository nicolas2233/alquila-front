
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import { geocodeAddress } from "../shared/map/geocode";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import "leaflet/dist/leaflet.css";

type Step = 0 | 1 | 2 | 3 | 4;

const steps = [
  {
    title: "Datos basicos",
    description: "T?tulo, descripci?n, operaci?n y precio.",
  },
  {
    title: "Ubicaci?n",
    description: "Direcci?n, localidad, partido, barrio y mapa.",
  },
  {
    title: "Caracter?sticas",
    description: "Ambientes y datos segun tipo.",
  },
  {
    title: "Servicios y costos",
    description: "Servicios y expensas si aplican.",
  },
  {
    title: "Contacto",
    description: "WhatsApp y telefono.",
  },
];

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

  return (
    <div className="space-y-2">
      <div className="text-xs text-[#9a948a]">Marca el punto exacto en el mapa.</div>
      <div className="overflow-hidden rounded-2xl border border-white/10">
        <MapContainer
          center={center as [number, number]}
          zoom={13}
          className="h-[260px] w-full"
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
              pathOptions={{ color: "#f4d19a", fillColor: "#d1a466", fillOpacity: 0.9 }}
            />
          )}
        </MapContainer>
      </div>
    </div>
  );
}
export function PublishPage() {
  const { addToast } = useToast();
  const sessionUser = getSessionUser();
  const sessionToken = getToken();
  const isOwner = sessionUser?.role === "OWNER";
  const isAgency = sessionUser?.role?.startsWith("AGENCY") ?? false;
  const ownerUserId = isOwner ? sessionUser?.id : undefined;
  const agencyId = isAgency ? sessionUser?.agencyId : undefined;

  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [step, setStep] = useState<Step>(0);
  const [showErrors, setShowErrors] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

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
  const [neighborhood, setNeighborhood] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [unitLabel, setUnitLabel] = useState("");
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
  const [addressQuery, setAddressQuery] = useState("");
  const [showMapLocation, setShowMapLocation] = useState(true);
  const [geoStatus, setGeoStatus] = useState<"idle" | "loading" | "error">("idle");
  const [geoMessage, setGeoMessage] = useState("");
  const [cadastralType, setCadastralType] = useState("PARTIDA");
  const [cadastralValue, setCadastralValue] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [photos, setPhotos] = useState<File[]>([]);

  const photoPreviews = useMemo(
    () => photos.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [photos]
  );

  useEffect(() => {
    return () => {
      photoPreviews.forEach((item) => URL.revokeObjectURL(item.url));
    };
  }, [photoPreviews]);

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
  const [petsAllowed, setPetsAllowed] = useState(false);
  const [kidsAllowed, setKidsAllowed] = useState(false);
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
        return "Galpon / Deposito";
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
  ]);

  const previewListing = useMemo<PropertyDetailListing>(
    () => ({
      id: "preview",
      title: title || "Sin titulo",
      address: `${addressLine || "Sin direccion"}${localityId ? ` - ${localityId}` : ""}`,
      price: priceAmount ? `${priceAmount} ${priceCurrency}` : "Sin precio",
      operation: operationLabel,
      areaM2: areaM2 ? Number(areaM2) : 0,
      rooms: rooms ? Number(rooms) : 0,
      bathrooms: bathrooms ? Number(bathrooms) : undefined,
      bedrooms: bedrooms ? Number(bedrooms) : undefined,
      garage: hasGarage,
      pets: petsAllowed,
      kids: kidsAllowed,
      descriptionLong: description || "Sin descripci?n",
      images: photoPreviews.map((item) => item.url),
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
      rooms,
      bathrooms,
      hasGarage,
      petsAllowed,
      kidsAllowed,
      description,
      photoPreviews,
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
    "w-full rounded-xl border bg-night-900/60 px-3 py-2 text-sm text-white";
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
      setShowErrors(true);
      addToast("Revisa los campos obligatorios antes de publicar.", "error");
      return;
    }
    setStatus("loading");
    setErrorMessage("");

    try {
      if (!sessionUser || !sessionToken) {
        throw new Error("Necesitas iniciar sesión.");
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

      const payload = {
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
            petsAllowed,
            kidsAllowed,
            furnished,
            ageYears: ageYears ? Number(ageYears) : undefined,
            coveredAreaM2: coveredAreaM2 ? Number(coveredAreaM2) : undefined,
            semiCoveredAreaM2: semiCoveredAreaM2 ? Number(semiCoveredAreaM2) : undefined,
            bedrooms: isPositiveNumber(bedrooms) ? Number(bedrooms) : undefined,
            floorsCount: floorsCount ? Number(floorsCount) : undefined,
            party: party || undefined,
            neighborhood: neighborhood || undefined,
            lotOrParcel: lotOrParcel || undefined,
            postalCode: postalCode || undefined,
            frontageM: frontageM ? Number(frontageM) : undefined,
            depthM: depthM ? Number(depthM) : undefined,
            buildable,
            investmentOpportunity: landInvestment || undefined,
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

      const response = await fetch(`${env.apiUrl}/properties`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${sessionToken}`,
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const fallback = "No pudimos crear la publicaci?n.";
        let message = fallback;
        try {
          const data = (await response.json()) as {
            message?: string;
            issues?: { path?: string; message?: string }[];
          };
          if (Array.isArray(data.issues) && data.issues.length > 0) {
            const fieldLabels: Record<string, string> = {
              title: "T?tulo",
              description: "Descripcion",
              propertyType: "Tipo de inmueble",
              operationType: "Operacion",
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
              "location.addressLine": "Direcci?n",
              "location.localityId": "Localidad",
              "location.lat": "Latitud",
              "location.lng": "Longitud",
              "features.financingAmount": "Monto financiable",
              "features.financingCurrency": "Moneda de financiacion",
              "features.ageYears": "Antiguedad",
              "features.coveredAreaM2": "Superficie cubierta",
              "features.semiCoveredAreaM2": "Superficie semicubierta",
              "features.floorsCount": "Pisos",
              "features.floor": "Piso",
              "features.unit": "Departamento",
              "features.party": "Partido",
              "features.neighborhood": "Barrio",
              "features.postalCode": "Codigo postal",
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

      const created = (await response.json()) as { id: string };

      if (photos.length) {
        const formData = new FormData();
        photos.forEach((file) => {
          formData.append("files", file);
        });

        const uploadResponse = await fetch(
          `${env.apiUrl}/properties/${created.id}/photos`,
          {
            method: "POST",
            headers: { Authorization: `Bearer ${sessionToken}` },
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("La publicaci?n se creo pero fallo la carga de fotos.");
        }
      }

      setStatus("success");
      addToast("Publicaci?n creada con exito.", "success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error al publicar."
      );
      addToast(
        error instanceof Error ? error.message : "Error al publicar.",
        "error"
      );
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Publicar inmueble</h2>
          <p className="text-sm text-[#9a948a]">
            Flujo por pasos con datos claros para evitar duplicados.
          </p>
        </div>
        <span className="gold-pill">Publicas como {roleLabel}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {steps.map((item, index) => (
          <div
            key={item.title}
            className={`glass-card p-4 ${step === index ? "border-gold-500/60" : ""}`}
          >
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/15 text-sm font-semibold text-gold-400">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <h3 className="text-sm text-white">{item.title}</h3>
                <p className="text-xs text-[#9a948a]">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="glass-card space-y-6 p-6" onSubmit={handleSubmit}>
        {step === 0 && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  T?tulo
                  <input
                    className={inputClass(titleError)}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
                  {titleError && (
                    <span className="text-[11px] text-red-300">
                      Obligatorio. Minimo 3 caracteres.
                    </span>
                  )}
                </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Operacion
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={operationType}
                  onChange={(event) => setOperationType(event.target.value)}
                >
                  <option value="SALE">Venta</option>
                  <option value="RENT">Alquiler</option>
                  <option value="TEMPORARY">Temporario</option>
                </select>
              </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Tipo de inmueble
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
                  <option value="WAREHOUSE">Deposito</option>
                </select>
              </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Precio
                  <input
                    className={inputClass(priceError)}
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
              <label className="space-y-2 text-xs text-[#9a948a]">
                Moneda
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={priceCurrency}
                  onChange={(event) => setPriceCurrency(event.target.value)}
                >
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
            </div>

              <label className="space-y-2 text-xs text-[#9a948a]">
                Descripcion
                <textarea
                  rows={4}
                  className={inputClass(descriptionError)}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
                {descriptionError && (
                  <span className="text-[11px] text-red-300">Obligatorio.</span>
                )}
              </label>

              {propertyType === "APARTMENT" && (
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="space-y-2 text-xs text-[#9a948a]">
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
                  <label className="space-y-2 text-xs text-[#9a948a]">
                    Moneda expensas
                    <select
                      className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={financingAvailable}
                    onChange={(event) => setFinancingAvailable(event.target.checked)}
                  />
                  Financia
                </label>
                {financingAvailable && (
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="space-y-2 text-xs text-[#9a948a]">
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
                    <label className="space-y-2 text-xs text-[#9a948a]">
                      Moneda financiacion
                      <select
                        className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Garantias solicitadas
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    placeholder="Ej: Garantia propietaria, recibo de sueldo"
                    value={rentGuarantees}
                    onChange={(event) => setRentGuarantees(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Meses para entrar
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={rentEntryMonths}
                    onChange={(event) => setRentEntryMonths(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Duracion del contrato (meses)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Indexacion cada
                  <select
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Tipo de indexacion
                  <select
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={rentIndexType}
                    onChange={(event) => setRentIndexType(event.target.value)}
                  >
                    <option value="">Sin definir</option>
                    <option value="IPC">IPC</option>
                    <option value="UVA">UVA</option>
                    <option value="INFLATION">Inflaci?n</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Porcentaje / valor
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="0.01"
                    value={rentIndexValue}
                    onChange={(event) => setRentIndexValue(event.target.value)}
                  />
                </label>
              </div>
              <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#d1a466]"
                  checked={rentInfoPublic}
                  onChange={(event) => setRentInfoPublic(event.target.checked)}
                />
                Mostrar esta informacion de forma publica
              </label>
            </div>
          )}

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Direcci?n
                  <input
                    className={inputClass(addressError)}
                    value={addressLine}
                    onChange={(event) => setAddressLine(event.target.value)}
                  />
                  {addressError && (
                    <span className="text-[11px] text-red-300">
                      Obligatorio. Minimo 3 caracteres.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Localidad
                  <input
                    className={inputClass(localityError)}
                    value={localityId}
                    onChange={(event) => setLocalityId(event.target.value)}
                  />
                  {localityError && (
                    <span className="text-[11px] text-red-300">Obligatorio.</span>
                  )}
                </label>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="space-y-2 text-xs text-[#9a948a]">
                Partido
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={party}
                  onChange={(event) => setParty(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Barrio
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Barrio cerrado
                <select
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
              <label className="space-y-2 text-xs text-[#9a948a]">
                Codigo postal
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Unidad / Lote (opcional)
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={unitLabel}
                  onChange={(event) => setUnitLabel(event.target.value)}
                  placeholder="Ej: Dpto 3B, Casa 2, Lote 5"
                />
              </label>
              {propertyType === "LAND" && (
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Lote o partida
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={lotOrParcel}
                    onChange={(event) => setLotOrParcel(event.target.value)}
                  />
                </label>
              )}
            </div>

            {propertyType === "APARTMENT" && (
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Piso
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={floor}
                    onChange={(event) => setFloor(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Departamento (ej: 3F)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={unit}
                    onChange={(event) => setUnit(event.target.value)}
                  />
                </label>
              </div>
            )}

            <LocationPicker
              lat={lat}
              lng={lng}
              onChange={(nextLat, nextLng) => {
                setLat(nextLat);
                setLng(nextLng);
              }}
            />

            <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#9a948a]">
                <span>Ubicaci?n aproximada por direccion</span>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                  onClick={async () => {
                    const query = (
                      addressQuery.trim()
                        ? addressQuery
                        : [
                            addressLine,
                            neighborhood,
                            party,
                            localityId,
                            "Bragado",
                            "Buenos Aires",
                            "Argentina",
                          ]
                            .filter(Boolean)
                            .join(", ")
                    ).trim();
                    if (!query) {
                      setGeoStatus("error");
                      setGeoMessage("Completa la direccion para buscarla en el mapa.");
                      return;
                    }
                    setGeoStatus("loading");
                    setGeoMessage("");
                    try {
                      const result = await geocodeAddress(query);
                      if (!result) {
                        setGeoStatus("error");
                        setGeoMessage("No encontramos esa direccion.");
                        return;
                      }
                      setLat(result.lat);
                      setLng(result.lng);
                      setGeoStatus("idle");
                      setGeoMessage(`Encontrado: ${result.displayName}`);
                    } catch (error) {
                      setGeoStatus("error");
                      setGeoMessage(
                        error instanceof Error
                          ? error.message
                          : "No pudimos buscar la direccion."
                      );
                    }
                  }}
                  disabled={geoStatus === "loading"}
                >
                  {geoStatus === "loading" ? "Buscando..." : "Buscar dirección"}
                </button>
              </div>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Buscar dirección (texto libre)
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={addressQuery}
                  onChange={(event) => setAddressQuery(event.target.value)}
                  placeholder="Ej: San Martin 123, Bragado"
                />
              </label>
              {geoMessage && (
                <div
                  className={`text-xs ${
                    geoStatus === "error" ? "text-[#f5b78a]" : "text-[#9a948a]"
                  }`}
                >
                  {geoMessage}
                </div>
              )}
              {lat !== undefined && lng !== undefined && (
                <div className="text-[11px] text-[#9a948a]">
                  Coordenadas: {lat.toFixed(5)}, {lng.toFixed(5)}
                </div>
              )}
              <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#d1a466]"
                  checked={showMapLocation}
                  onChange={(event) => setShowMapLocation(event.target.checked)}
                />
                Mostrar ubicacion en el mapa publico
              </label>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-8">
            <div className="rounded-2xl border border-white/10 bg-night-900/40 px-4 py-3 text-sm text-[#cfc9bf]">
              Tipo seleccionado: <span className="text-white">{propertyTypeLabel}</span>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Caracter?sticas principales</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Superficie total (m2)
                  <input
                    className={inputClass(areaError)}
                    value={areaM2}
                    onChange={(event) => setAreaM2(event.target.value)}
                  />
                  {areaError && (
                    <span className="text-[11px] text-red-300">
                      Obligatorio. Debe ser mayor a 0.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Superficie cubierta (m2)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={coveredAreaM2}
                    onChange={(event) => setCoveredAreaM2(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Superficie semicubierta (m2)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={semiCoveredAreaM2}
                    onChange={(event) => setSemiCoveredAreaM2(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Ambientes
                  <input
                    className={inputClass(roomsError)}
                    value={rooms}
                    onChange={(event) => setRooms(event.target.value)}
                  />
                  {roomsError && (
                    <span className="text-[11px] text-red-300">
                      Debe ser 0 o mayor.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Banos
                  <input
                    className={inputClass(bathroomsError)}
                    value={bathrooms}
                    onChange={(event) => setBathrooms(event.target.value)}
                  />
                  {bathroomsError && (
                    <span className="text-[11px] text-red-300">
                      Debe ser 0 o mayor.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Dormitorios
                  <input
                    className={inputClass(bedroomsError)}
                    value={bedrooms}
                    onChange={(event) => setBedrooms(event.target.value)}
                  />
                  {bedroomsError && (
                    <span className="text-[11px] text-red-300">
                      Debe ser 0 o mayor.
                    </span>
                  )}
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Antiguedad (anos)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={ageYears}
                    onChange={(event) => setAgeYears(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Pisos
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={floorsCount}
                    onChange={(event) => setFloorsCount(event.target.value)}
                  />
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={hasGarage}
                    onChange={(event) => setHasGarage(event.target.checked)}
                  />
                  Cochera
                </label>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-sm font-semibold text-white">Amenities</h4>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityAir}
                    onChange={(event) => setAmenityAir(event.target.checked)}
                  />
                  Aire acondicionado
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityHeater}
                    onChange={(event) => setAmenityHeater(event.target.checked)}
                  />
                  Estufa
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityKitchen}
                    onChange={(event) => setAmenityKitchen(event.target.checked)}
                  />
                  Cocina
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityGrill}
                    onChange={(event) => setAmenityGrill(event.target.checked)}
                  />
                  Parrilla
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityPool}
                    onChange={(event) => setAmenityPool(event.target.checked)}
                  />
                  Piscina / pileta
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityJacuzzi}
                    onChange={(event) => setAmenityJacuzzi(event.target.checked)}
                  />
                  Hidromasaje
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenitySolarium}
                    onChange={(event) => setAmenitySolarium(event.target.checked)}
                  />
                  Solarium
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityElevator}
                    onChange={(event) => setAmenityElevator(event.target.checked)}
                  />
                  Ascensor
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenitySecurity}
                    onChange={(event) => setAmenitySecurity(event.target.checked)}
                  />
                  Seguridad privada
                </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
                    checked={amenityCameras}
                    onChange={(event) => setAmenityCameras(event.target.checked)}
                  />
                  Camaras de seguridad
                </label>
              </div>
            </div>

            {(propertyType === "HOUSE" || propertyType === "APARTMENT") && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold text-white">Convivencia</h4>
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={furnished}
                      onChange={(event) => setFurnished(event.target.checked)}
                    />
                    Amueblado
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={petsAllowed}
                      onChange={(event) => setPetsAllowed(event.target.checked)}
                    />
                    Mascotas
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
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
                  <label className="space-y-2 text-xs text-[#9a948a]">
                    Vista
                    <select
                      className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
                  <label className="space-y-2 text-xs text-[#9a948a]">
                    Frente (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                      value={frontageM}
                      onChange={(event) => setFrontageM(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-xs text-[#9a948a]">
                    Fondo (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                      value={depthM}
                      onChange={(event) => setDepthM(event.target.value)}
                    />
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={buildable}
                      onChange={(event) => setBuildable(event.target.checked)}
                    />
                    Apto para construir
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
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
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={businessFood}
                      onChange={(event) => setBusinessFood(event.target.checked)}
                    />
                    Local de comida
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={businessEvents}
                      onChange={(event) => setBusinessEvents(event.target.checked)}
                    />
                    Salon de eventos
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={businessRetail}
                      onChange={(event) => setBusinessRetail(event.target.checked)}
                    />
                    Negocio comercial
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={businessFactory}
                      onChange={(event) => setBusinessFactory(event.target.checked)}
                    />
                    Fabrica
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={businessOffices}
                      onChange={(event) => setBusinessOffices(event.target.checked)}
                    />
                    Oficinas
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
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
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={officeMeetingRoom}
                      onChange={(event) => setOfficeMeetingRoom(event.target.checked)}
                    />
                    Sala de reuniones
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={officeReception}
                      onChange={(event) => setOfficeReception(event.target.checked)}
                    />
                    Recepcion
                  </label>
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
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
                <h4 className="text-sm font-semibold text-white">Galpon / deposito</h4>
                <div className="grid gap-4 md:grid-cols-3">
                  <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                    <input
                      type="checkbox"
                      className="h-4 w-4 accent-[#d1a466]"
                      checked={warehouseTruckAccess}
                      onChange={(event) => setWarehouseTruckAccess(event.target.checked)}
                    />
                    Acceso camion
                  </label>
                  <label className="space-y-2 text-xs text-[#9a948a]">
                    Altura (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                      value={warehouseHeight}
                      onChange={(event) => setWarehouseHeight(event.target.value)}
                    />
                  </label>
                  <label className="space-y-2 text-xs text-[#9a948a]">
                    Altura porton (m)
                    <input
                      className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#d1a466]"
                  checked={serviceElectricity}
                  onChange={(event) => setServiceElectricity(event.target.checked)}
                />
                Luz
              </label>
              <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#d1a466]"
                  checked={serviceGas}
                  onChange={(event) => setServiceGas(event.target.checked)}
                />
                Gas
              </label>
              <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#d1a466]"
                  checked={serviceWater}
                  onChange={(event) => setServiceWater(event.target.checked)}
                />
                Agua
              </label>
              <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#d1a466]"
                  checked={serviceSewer}
                  onChange={(event) => setServiceSewer(event.target.checked)}
                />
                Cloaca
              </label>
              <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[#d1a466]"
                  checked={serviceInternet}
                  onChange={(event) => setServiceInternet(event.target.checked)}
                />
                Internet
              </label>
                <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-[#d1a466]"
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
            <div className="space-y-3">
              <label className="text-xs text-[#9a948a]">Fotos (hasta 12)</label>
              <input
                type="file"
                accept="image/*"
                multiple
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-[#c7c2b8]"
                onChange={(event) => {
                  const files = event.target.files ? Array.from(event.target.files) : [];
                  setPhotos(files.slice(0, 12));
                }}
              />
              {photos.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs text-[#9a948a]">
                    {photos.length} fotos seleccionadas.
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                    {photoPreviews.map((item) => (
                      <div
                        key={item.url}
                        className="relative overflow-hidden rounded-xl border border-white/10 bg-night-900/60"
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
              <label className="space-y-2 text-xs text-[#9a948a]">
                WhatsApp
                <input
                  className={inputClass(contactRequiredError || whatsappError)}
                  value={contactWhatsapp}
                  onChange={(event) => setContactWhatsapp(event.target.value)}
                />
                {contactRequiredError && (
                  <span className="text-[11px] text-red-300">
                    Ingresa WhatsApp o telefono para poder contactar.
                  </span>
                )}
                {whatsappError && (
                  <span className="text-[11px] text-red-300">
                    Debe tener al menos 6 digitos.
                  </span>
                )}
              </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Telefono
                <input
                  className={inputClass(contactRequiredError || phoneError)}
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
                {contactRequiredError && (
                  <span className="text-[11px] text-red-300">
                    Ingresa WhatsApp o telefono para poder contactar.
                  </span>
                )}
                {phoneError && (
                  <span className="text-[11px] text-red-300">
                    Debe tener al menos 6 digitos.
                  </span>
                )}
              </label>
            </div>

              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Catastro tipo
                  <select
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={cadastralType}
                    onChange={(event) => setCadastralType(event.target.value)}
                  >
                    <option value="PARTIDA">Partida</option>
                    <option value="NOMENCLATURA">Nomenclatura</option>
                    <option value="OTHER">Otro</option>
                  </select>
                </label>
                <label className="space-y-2 text-xs text-[#9a948a] md:col-span-2">
                  Catastro valor
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={cadastralValue}
                    onChange={(event) => setCadastralValue(event.target.value)}
                  />
                </label>
              </div>

              <button
                type="button"
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                onClick={() => setShowPreview(true)}
              >
                Ver ficha
              </button>
            </div>
          )}

          {showPreview && (
            <PropertyDetailModal
              listing={previewListing}
              onClose={() => setShowPreview(false)}
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

          {status === "error" && (
            <p className="text-xs text-[#f5b78a]">{errorMessage}</p>
          )}
        {status === "success" && (
          <p className="text-xs text-[#9fe0c0]">Publicaci?n creada correctamente.</p>
        )}

            <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-3">
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                type="button"
                onClick={() => {
                  setShowErrors(false);
                  setStep((prev) => (prev > 0 ? ((prev - 1) as Step) : prev));
                }}
                disabled={step === 0}
              >
                Anterior
              </button>
              {step < steps.length - 1 && (
                <button
                  className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                  type="button"
                  onClick={() => {
                    if (!canNext) {
                      setShowErrors(true);
                      return;
                    }
                    setShowErrors(false);
                    setStep((prev) => ((prev + 1) as Step));
                  }}
                >
                  Siguiente
                </button>
              )}
            </div>

          {step === steps.length - 1 && (
            <button
              className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
              type="submit"
              disabled={status === "loading"}
            >
              {status === "loading" ? "Enviando..." : "Publicar"}
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
