
import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import { env } from "../shared/config/env";
import { getSessionUser } from "../shared/auth/session";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type { PropertyDetailListing } from "../shared/properties/PropertyDetailModal";
import "leaflet/dist/leaflet.css";

type Step = 0 | 1 | 2 | 3 | 4;

const steps = [
  {
    title: "Datos basicos",
    description: "Titulo, descripcion, operacion y precio.",
  },
  {
    title: "Ubicacion",
    description: "Direccion, localidad, partido, barrio y mapa.",
  },
  {
    title: "Caracteristicas",
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
  const sessionUser = getSessionUser();
  const isOwner = sessionUser?.role === "OWNER";
  const isAgency = sessionUser?.role?.startsWith("AGENCY") ?? false;
  const ownerUserId = isOwner ? sessionUser?.id : undefined;
  const agencyId = isAgency ? sessionUser?.agencyId ?? undefined : undefined;

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
  const [lat, setLat] = useState<number | undefined>(undefined);
  const [lng, setLng] = useState<number | undefined>(undefined);
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

  const [businessFood, setBusinessFood] = useState(false);
  const [businessEvents, setBusinessEvents] = useState(false);
  const [businessRetail, setBusinessRetail] = useState(false);
  const [businessFactory, setBusinessFactory] = useState(false);
  const [businessOffices, setBusinessOffices] = useState(false);
  const [businessClinics, setBusinessClinics] = useState(false);

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
    ? "Dueno directo"
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
  ]);

  const previewListing = useMemo<PropertyDetailListing>(
    () => ({
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
      descriptionLong: description || "Sin descripcion",
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
    ]
  );

  const canNext = useMemo(() => {
    if (step === 0) {
      return title.trim() && description.trim() && priceAmount.trim();
    }
    if (step === 1) {
      return addressLine.trim() && localityId.trim();
    }
    return true;
  }, [step, title, description, priceAmount, addressLine, localityId]);

  const inputBaseClass =
    "w-full rounded-xl border bg-night-900/60 px-3 py-2 text-sm text-white";
  const inputClass = (invalid: boolean) =>
    `${inputBaseClass} ${invalid ? "border-red-400/70 focus:border-red-400" : "border-white/10"}`;
  const requiredError = (value: string) => showErrors && !value.trim();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      if (!sessionUser) {
        throw new Error("Necesitas iniciar sesion.");
      }

      if (!isOwner && !isAgency) {
        throw new Error("Solo duenos o inmobiliarias pueden publicar.");
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
        rooms: rooms ? Number(rooms) : undefined,
        bathrooms: bathrooms ? Number(bathrooms) : undefined,
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
          features: {
            hasGarage,
            petsAllowed,
            kidsAllowed,
            furnished,
            ageYears: ageYears ? Number(ageYears) : undefined,
            coveredAreaM2: coveredAreaM2 ? Number(coveredAreaM2) : undefined,
            semiCoveredAreaM2: semiCoveredAreaM2 ? Number(semiCoveredAreaM2) : undefined,
            bedrooms: bedrooms ? Number(bedrooms) : undefined,
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
            amenities: amenities.length ? amenities : undefined,
            businessUses: businessUses.length ? businessUses : undefined,
            officeFeatures: officeFeatures.length ? officeFeatures : undefined,
            warehouseFeatures: warehouseFeatures.length ? warehouseFeatures : undefined,
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No pudimos crear la publicacion.");
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
            body: formData,
          }
        );

        if (!uploadResponse.ok) {
          throw new Error("La publicacion se creo pero fallo la carga de fotos.");
        }
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error al publicar."
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
                  Titulo
                  <input
                    className={inputClass(requiredError(title))}
                    value={title}
                    onChange={(event) => setTitle(event.target.value)}
                  />
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
                    className={inputClass(requiredError(priceAmount))}
                    type="number"
                    inputMode="decimal"
                    min="0"
                    step="1"
                    value={priceAmount}
                    onChange={(event) => setPriceAmount(event.target.value)}
                  />
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
                  className={inputClass(requiredError(description))}
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
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

        {step === 1 && (
          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Direccion
                  <input
                    className={inputClass(requiredError(addressLine))}
                    value={addressLine}
                    onChange={(event) => setAddressLine(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Localidad
                  <input
                    className={inputClass(requiredError(localityId))}
                    value={localityId}
                    onChange={(event) => setLocalityId(event.target.value)}
                  />
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
                Codigo postal
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={postalCode}
                  onChange={(event) => setPostalCode(event.target.value)}
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

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2 text-xs text-[#9a948a]">
                Latitud (opcional)
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={lat ?? ""}
                  onChange={(event) =>
                    setLat(event.target.value ? Number(event.target.value) : undefined)
                  }
                />
              </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Longitud (opcional)
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={lng ?? ""}
                  onChange={(event) =>
                    setLng(event.target.value ? Number(event.target.value) : undefined)
                  }
                />
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
              <h4 className="text-sm font-semibold text-white">Caracteristicas principales</h4>
              <div className="grid gap-4 md:grid-cols-3">
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Superficie total (m2)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={areaM2}
                    onChange={(event) => setAreaM2(event.target.value)}
                  />
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
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={rooms}
                    onChange={(event) => setRooms(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Banos
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={bathrooms}
                    onChange={(event) => setBathrooms(event.target.value)}
                  />
                </label>
                <label className="space-y-2 text-xs text-[#9a948a]">
                  Dormitorios
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={bedrooms}
                    onChange={(event) => setBedrooms(event.target.value)}
                  />
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
                    Ninos
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
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={contactWhatsapp}
                  onChange={(event) => setContactWhatsapp(event.target.value)}
                />
              </label>
              <label className="space-y-2 text-xs text-[#9a948a]">
                Telefono
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={contactPhone}
                  onChange={(event) => setContactPhone(event.target.value)}
                />
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
          <p className="text-xs text-[#9fe0c0]">Publicacion creada correctamente.</p>
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
