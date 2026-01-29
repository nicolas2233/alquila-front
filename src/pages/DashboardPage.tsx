import { useCallback, useEffect, useMemo, useState } from "react";
import { env } from "../shared/config/env";
import { getSessionUser } from "../shared/auth/session";
import { PropertyDetailModal } from "../shared/properties/PropertyDetailModal";
import type {
  PropertyApiDetail,
  PropertyApiListItem,
} from "../shared/properties/propertyMappers";
import { mapPropertyToDetailListing } from "../shared/properties/propertyMappers";

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

type AgencyProfile = {
  id: string;
  name: string;
  legalName: string;
  phone?: string | null;
  address?: string | null;
  about?: string | null;
  whatsapp?: string | null;
  email?: string | null;
  website?: string | null;
  instagram?: string | null;
  logo?: string | null;
};

type PanelSection = "profile" | "listings";

export function DashboardPage() {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const isOwner = sessionUser?.role === "OWNER";
  const isAgency = sessionUser?.role?.startsWith("AGENCY") ?? false;
  const ownerUserId = isOwner ? sessionUser?.id : undefined;
  const agencyId = isAgency ? sessionUser?.agencyId ?? undefined : undefined;
  const roleLabel = isOwner
    ? "Dueno directo"
    : isAgency
    ? "Inmobiliaria"
    : "Usuario";

  const [items, setItems] = useState<PropertyApiListItem[]>([]);
  const [propertyStatus, setPropertyStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [propertyError, setPropertyError] = useState("");
  const [agencyStatus, setAgencyStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "idle"
  );
  const [agencyError, setAgencyError] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyLegalName, setAgencyLegalName] = useState("");
  const [agencyPhone, setAgencyPhone] = useState("");
  const [agencyAddress, setAgencyAddress] = useState("");
  const [agencyAbout, setAgencyAbout] = useState("");
  const [agencyWhatsapp, setAgencyWhatsapp] = useState("");
  const [agencyEmail, setAgencyEmail] = useState("");
  const [agencyWebsite, setAgencyWebsite] = useState("");
  const [agencyInstagram, setAgencyInstagram] = useState("");
  const [agencyLogo, setAgencyLogo] = useState("");
  const [ownerStatus, setOwnerStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "idle"
  );
  const [ownerError, setOwnerError] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
  const [ownerAddress, setOwnerAddress] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [activeSection, setActiveSection] = useState<PanelSection>("profile");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedItem, setSelectedItem] = useState<PropertyApiDetail | null>(null);
  const [detailStatus, setDetailStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [detailError, setDetailError] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCurrency, setEditCurrency] = useState("ARS");
  const [editStatus, setEditStatus] = useState("ACTIVE");
  const [editRooms, setEditRooms] = useState("");
  const [editBathrooms, setEditBathrooms] = useState("");
  const [editAreaM2, setEditAreaM2] = useState("");
  const [editExpensesAmount, setEditExpensesAmount] = useState("");
  const [editExpensesCurrency, setEditExpensesCurrency] = useState("ARS");
  const [editPropertyType, setEditPropertyType] = useState("");
  const [editOperationType, setEditOperationType] = useState("");

  const [editHasGarage, setEditHasGarage] = useState(false);
  const [editPetsAllowed, setEditPetsAllowed] = useState(false);
  const [editKidsAllowed, setEditKidsAllowed] = useState(false);
  const [editFurnished, setEditFurnished] = useState(false);
  const [editAgeYears, setEditAgeYears] = useState("");
  const [editCoveredAreaM2, setEditCoveredAreaM2] = useState("");
  const [editSemiCoveredAreaM2, setEditSemiCoveredAreaM2] = useState("");
  const [editBedrooms, setEditBedrooms] = useState("");
  const [editFloorsCount, setEditFloorsCount] = useState("");
  const [editParty, setEditParty] = useState("");
  const [editNeighborhood, setEditNeighborhood] = useState("");
  const [editPostalCode, setEditPostalCode] = useState("");
  const [editLotOrParcel, setEditLotOrParcel] = useState("");
  const [editFrontageM, setEditFrontageM] = useState("");
  const [editDepthM, setEditDepthM] = useState("");
  const [editBuildable, setEditBuildable] = useState(false);
  const [editInvestmentOpportunity, setEditInvestmentOpportunity] = useState(false);
  const [editFinancingAvailable, setEditFinancingAvailable] = useState(false);
  const [editFinancingAmount, setEditFinancingAmount] = useState("");
  const [editFinancingCurrency, setEditFinancingCurrency] = useState("ARS");
  const [editFloor, setEditFloor] = useState("");
  const [editUnit, setEditUnit] = useState("");
  const [editFacing, setEditFacing] = useState("FRONT");

  const [editAmenities, setEditAmenities] = useState<string[]>([]);
  const [editBusinessUses, setEditBusinessUses] = useState<string[]>([]);
  const [editOfficeFeatures, setEditOfficeFeatures] = useState<string[]>([]);
  const [editWarehouseFeatures, setEditWarehouseFeatures] = useState<string[]>([]);

  const [serviceElectricity, setServiceElectricity] = useState(false);
  const [serviceGas, setServiceGas] = useState(false);
  const [serviceWater, setServiceWater] = useState(false);
  const [serviceSewer, setServiceSewer] = useState(false);
  const [serviceInternet, setServiceInternet] = useState(false);
  const [servicePavement, setServicePavement] = useState(false);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [showPublicModal, setShowPublicModal] = useState(false);

  const loadProperties = useCallback(async () => {
    if (!sessionUser) {
      setPropertyStatus("error");
      setPropertyError("Necesitas iniciar sesion.");
      return;
    }

    if (!ownerUserId && !agencyId) {
      setPropertyStatus("error");
      setPropertyError("Solo duenos o inmobiliarias pueden ver este panel.");
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
  }, [agencyId, ownerUserId, sessionUser]);

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
      setAgencyPhone(data.phone ?? "");
      setAgencyAddress(data.address ?? "");
      setAgencyAbout(data.about ?? "");
      setAgencyWhatsapp(data.whatsapp ?? "");
      setAgencyEmail(data.email ?? "");
      setAgencyWebsite(data.website ?? "");
      setAgencyInstagram(data.instagram ?? "");
      setAgencyLogo(data.logo ?? "");
      setAgencyStatus("idle");
    } catch (error) {
      setAgencyStatus("error");
      setAgencyError(
        error instanceof Error ? error.message : "Error al cargar la inmobiliaria."
      );
    }
  }, [agencyId]);

  useEffect(() => {
    if (activeSection === "listings") {
      void loadProperties();
    }
  }, [activeSection, loadProperties]);

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
        const response = await fetch(`${env.apiUrl}/users/${ownerUserId}`);
        if (!response.ok) {
          throw new Error("No pudimos cargar tu perfil.");
        }
        const data = (await response.json()) as {
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          address?: string | null;
        };
        setOwnerName(data.name ?? "");
        setOwnerEmail(data.email ?? "");
        setOwnerPhone(data.phone ?? "");
        setOwnerAddress(data.address ?? "");
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
  }, [isOwner, ownerUserId]);

  const updateStatus = async (propertyId: string, nextStatus: string) => {
    try {
      await fetch(`${env.apiUrl}/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadProperties();
    } catch (error) {
      setPropertyStatus("error");
      setPropertyError("No pudimos actualizar el estado.");
    }
  };

  const openDetail = async (item: PropertyApiListItem) => {
    setSelectedId(item.id);
    setSelectedItem(null);
    setIsEditing(false);
    setDetailStatus("loading");
    setDetailError("");

    try {
      const response = await fetch(`${env.apiUrl}/properties/${item.id}`);
      if (!response.ok) {
        throw new Error("No pudimos cargar la propiedad.");
      }
      const data = (await response.json()) as PropertyApiDetail;
      setSelectedItem(data);
      setEditTitle(data.title ?? "");
      setEditDescription(data.description ?? "");
      setEditPrice(String(data.priceAmount ?? ""));
      setEditCurrency(data.priceCurrency ?? "ARS");
      setEditExpensesAmount(String(data.expensesAmount ?? ""));
      setEditExpensesCurrency(data.expensesCurrency ?? "ARS");
      setEditPropertyType(data.propertyType ?? "");
      setEditOperationType(data.operationType ?? "");
      setEditRooms(String(data.rooms ?? ""));
      setEditBathrooms(String(data.bathrooms ?? ""));
      setEditAreaM2(String(data.areaM2 ?? ""));
      setEditStatus(data.status ?? "ACTIVE");
      const features = data.features ?? {};
      setEditHasGarage(Boolean(features.hasGarage));
      setEditPetsAllowed(Boolean(features.petsAllowed));
      setEditKidsAllowed(Boolean(features.kidsAllowed));
      setEditFurnished(Boolean((features as { furnished?: boolean }).furnished));
      setEditAgeYears(String((features as { ageYears?: number }).ageYears ?? ""));
      setEditCoveredAreaM2(
        String((features as { coveredAreaM2?: number }).coveredAreaM2 ?? "")
      );
      setEditSemiCoveredAreaM2(
        String((features as { semiCoveredAreaM2?: number }).semiCoveredAreaM2 ?? "")
      );
      setEditBedrooms(String((features as { bedrooms?: number }).bedrooms ?? ""));
      setEditFloorsCount(String((features as { floorsCount?: number }).floorsCount ?? ""));
      setEditParty(String((features as { party?: string }).party ?? ""));
      setEditNeighborhood(String((features as { neighborhood?: string }).neighborhood ?? ""));
      setEditPostalCode(String((features as { postalCode?: string }).postalCode ?? ""));
      setEditLotOrParcel(String((features as { lotOrParcel?: string }).lotOrParcel ?? ""));
      setEditFrontageM(String((features as { frontageM?: number }).frontageM ?? ""));
      setEditDepthM(String((features as { depthM?: number }).depthM ?? ""));
      setEditBuildable(Boolean((features as { buildable?: boolean }).buildable));
      setEditInvestmentOpportunity(
        Boolean((features as { investmentOpportunity?: boolean }).investmentOpportunity)
      );
      setEditFinancingAvailable(
        Boolean((features as { financingAvailable?: boolean }).financingAvailable)
      );
      setEditFinancingAmount(
        String((features as { financingAmount?: number }).financingAmount ?? "")
      );
      setEditFinancingCurrency(
        String((features as { financingCurrency?: string }).financingCurrency ?? "ARS")
      );
      setEditFloor(String((features as { floor?: number }).floor ?? ""));
      setEditUnit(String((features as { unit?: string }).unit ?? ""));
      setEditFacing(String((features as { facing?: string }).facing ?? "FRONT"));
      setEditAmenities((features as { amenities?: string[] }).amenities ?? []);
      setEditBusinessUses((features as { businessUses?: string[] }).businessUses ?? []);
      setEditOfficeFeatures((features as { officeFeatures?: string[] }).officeFeatures ?? []);
      setEditWarehouseFeatures(
        (features as { warehouseFeatures?: string[] }).warehouseFeatures ?? []
      );

      const services = data.services ?? {};
      setServiceElectricity(Boolean(services.electricity));
      setServiceGas(Boolean(services.gas));
      setServiceWater(Boolean(services.water));
      setServiceSewer(Boolean(services.sewer));
      setServiceInternet(Boolean(services.internet));
      setServicePavement(Boolean(services.pavement));
      setDetailStatus("idle");
    } catch (error) {
      setDetailStatus("error");
      setDetailError(
        error instanceof Error ? error.message : "Error al cargar la propiedad."
      );
    }
  };

  const closeDetail = () => {
    setSelectedId(null);
    setSelectedItem(null);
    setIsEditing(false);
  };

  const saveEdit = async () => {
    if (!selectedId) {
      return;
    }

    try {
      if (editPrice && Number.isNaN(Number(editPrice))) {
        throw new Error("El precio debe ser un numero valido.");
      }

      const response = await fetch(`${env.apiUrl}/properties/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          operationType: editOperationType || undefined,
          propertyType: editPropertyType || undefined,
          priceAmount: editPrice ? Number(editPrice) : undefined,
          priceCurrency: editPrice ? editCurrency : undefined,
          expensesAmount: editExpensesAmount ? Number(editExpensesAmount) : undefined,
          expensesCurrency: editExpensesAmount ? editExpensesCurrency : undefined,
          rooms: editRooms ? Number(editRooms) : undefined,
          bathrooms: editBathrooms ? Number(editBathrooms) : undefined,
          areaM2: editAreaM2 ? Number(editAreaM2) : undefined,
          features: {
            hasGarage: editHasGarage,
            petsAllowed: editPetsAllowed,
            kidsAllowed: editKidsAllowed,
            furnished: editFurnished,
            ageYears: editAgeYears ? Number(editAgeYears) : undefined,
            coveredAreaM2: editCoveredAreaM2 ? Number(editCoveredAreaM2) : undefined,
            semiCoveredAreaM2: editSemiCoveredAreaM2 ? Number(editSemiCoveredAreaM2) : undefined,
            bedrooms: editBedrooms ? Number(editBedrooms) : undefined,
            floorsCount: editFloorsCount ? Number(editFloorsCount) : undefined,
            party: editParty || undefined,
            neighborhood: editNeighborhood || undefined,
            postalCode: editPostalCode || undefined,
            lotOrParcel: editLotOrParcel || undefined,
            frontageM: editFrontageM ? Number(editFrontageM) : undefined,
            depthM: editDepthM ? Number(editDepthM) : undefined,
            buildable: editBuildable,
            investmentOpportunity: editInvestmentOpportunity,
            financingAvailable: editFinancingAvailable,
            financingAmount:
              editFinancingAvailable && editFinancingAmount
                ? Number(editFinancingAmount)
                : undefined,
            financingCurrency: editFinancingAvailable ? editFinancingCurrency : undefined,
            floor: editFloor ? Number(editFloor) : undefined,
            unit: editUnit || undefined,
            facing: editFacing || undefined,
            amenities: editAmenities.length ? editAmenities : undefined,
            businessUses: editBusinessUses.length ? editBusinessUses : undefined,
            officeFeatures: editOfficeFeatures.length ? editOfficeFeatures : undefined,
            warehouseFeatures: editWarehouseFeatures.length ? editWarehouseFeatures : undefined,
          },
          services: {
            electricity: serviceElectricity,
            gas: serviceGas,
            water: serviceWater,
            sewer: serviceSewer,
            internet: serviceInternet,
            pavement: servicePavement,
          },
        }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        throw new Error(body?.message ?? "No pudimos guardar los cambios.");
      }
      if (selectedItem && editStatus !== selectedItem.status) {
        await updateStatus(selectedId, editStatus);
      }
      if (newPhotos.length) {
        const formData = new FormData();
        newPhotos.forEach((file) => formData.append("files", file));
        await fetch(`${env.apiUrl}/properties/${selectedId}/photos`, {
          method: "POST",
          body: formData,
        });
        setNewPhotos([]);
      }
      await loadProperties();
      await openDetail({ id: selectedId } as PropertyApiListItem);
      setIsEditing(false);
    } catch (error) {
      setDetailStatus("error");
      setDetailError("No pudimos guardar los cambios.");
    }
  };

  const saveAgency = async () => {
    if (!agencyId) {
      return;
    }

    setAgencyStatus("saving");
    setAgencyError("");

    try {
      const response = await fetch(`${env.apiUrl}/agencies/${agencyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: agencyName,
          legalName: agencyLegalName,
          phone: agencyPhone || undefined,
          address: agencyAddress || undefined,
          about: agencyAbout || undefined,
          whatsapp: agencyWhatsapp || undefined,
          email: agencyEmail || undefined,
          website: agencyWebsite || undefined,
          instagram: agencyInstagram || undefined,
          logo: agencyLogo || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error("No pudimos guardar los datos.");
      }

      setAgencyStatus("idle");
    } catch (error) {
      setAgencyStatus("error");
      setAgencyError(
        error instanceof Error ? error.message : "Error al guardar la inmobiliaria."
      );
    }
  };

  const saveOwner = async () => {
    if (!ownerUserId) {
      return;
    }
    setOwnerStatus("saving");
    setOwnerError("");
    try {
      const response = await fetch(`${env.apiUrl}/users/${ownerUserId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ownerName,
          email: ownerEmail,
          phone: ownerPhone || undefined,
          address: ownerAddress || undefined,
          password: ownerPassword || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error("No pudimos guardar tu perfil.");
      }
      setOwnerPassword("");
      setOwnerStatus("idle");
    } catch (error) {
      setOwnerStatus("error");
      setOwnerError(
        error instanceof Error ? error.message : "Error al guardar tu perfil."
      );
    }
  };

  const publicListing = useMemo(
    () => (selectedItem ? mapPropertyToDetailListing(selectedItem) : null),
    [selectedItem]
  );

  const removePhoto = async (photoId: string) => {
    if (!selectedId) {
      return;
    }
    try {
      await fetch(`${env.apiUrl}/properties/${selectedId}/photos/${photoId}`, {
        method: "DELETE",
      });
      await openDetail({ id: selectedId } as PropertyApiListItem);
    } catch {
      setDetailStatus("error");
      setDetailError("No pudimos eliminar la foto.");
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
      <aside className="glass-card h-fit space-y-2 p-4 text-sm text-[#c7c2b8]">
        <div className="text-xs uppercase tracking-[0.2em] text-[#9a948a]">Panel</div>
        <button
          type="button"
          onClick={() => setActiveSection("profile")}
          className={
            activeSection === "profile"
              ? "w-full rounded-xl border border-gold-500/40 bg-night-900/60 px-3 py-2 text-left text-white"
              : "w-full rounded-xl border border-white/10 bg-night-900/40 px-3 py-2 text-left text-[#c7c2b8]"
          }
        >
          {isAgency ? "Perfil inmobiliaria" : "Perfil dueno"}
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("listings")}
          className={
            activeSection === "listings"
              ? "w-full rounded-xl border border-gold-500/40 bg-night-900/60 px-3 py-2 text-left text-white"
              : "w-full rounded-xl border border-white/10 bg-night-900/40 px-3 py-2 text-left text-[#c7c2b8]"
          }
        >
          Mis inmuebles
        </button>
      </aside>

      <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Panel de publicaciones</h2>
          <p className="text-sm text-[#9a948a]">Controla estados, disponibilidad y contactos.</p>
        </div>
        <button className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900">
          Nueva publicacion
        </button>
      </div>

      <div className="glass-card space-y-3 p-6 text-sm text-[#c7c2b8]">
        <div className="flex flex-wrap items-center gap-3">
          <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
            Cuenta: {roleLabel}
          </span>
          {isAgency && !agencyId && (
            <span className="text-xs text-[#f5b78a]">
              Falta asociar una inmobiliaria a tu usuario.
            </span>
          )}
        </div>
        <p className="text-xs text-[#9a948a]">
          Edita el perfil de tu inmobiliaria y luego veremos las publicaciones.
        </p>
      </div>

      {activeSection === "profile" && isAgency && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Perfil de inmobiliaria</h3>
              <p className="text-xs text-[#9a948a]">
                Edita los datos que veran tus clientes.
              </p>
            </div>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
              type="button"
              onClick={saveAgency}
              disabled={agencyStatus === "saving" || !agencyId}
            >
              {agencyStatus === "saving" ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>

          {!agencyId && (
            <p className="text-xs text-[#f5b78a]">
              Necesitamos asociar tu usuario a una inmobiliaria.
            </p>
          )}

          {agencyStatus === "loading" && (
            <p className="text-xs text-[#9a948a]">Cargando datos...</p>
          )}
          {agencyStatus === "error" && (
            <p className="text-xs text-[#f5b78a]">{agencyError}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs text-[#9a948a]">
              Nombre comercial
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyName}
                onChange={(event) => setAgencyName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Razon social
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyLegalName}
                onChange={(event) => setAgencyLegalName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Telefono
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyPhone}
                onChange={(event) => setAgencyPhone(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Domicilio
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyAddress}
                onChange={(event) => setAgencyAddress(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              WhatsApp
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyWhatsapp}
                onChange={(event) => setAgencyWhatsapp(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Email
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyEmail}
                onChange={(event) => setAgencyEmail(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Web
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyWebsite}
                onChange={(event) => setAgencyWebsite(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Instagram
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyInstagram}
                onChange={(event) => setAgencyInstagram(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Logo (texto corto)
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={agencyLogo}
                onChange={(event) => setAgencyLogo(event.target.value)}
              />
            </label>
          </div>

          <label className="space-y-2 text-xs text-[#9a948a]">
            Quienes somos
            <textarea
              rows={3}
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={agencyAbout}
              onChange={(event) => setAgencyAbout(event.target.value)}
            />
          </label>
        </div>
      )}

      {activeSection === "profile" && isOwner && (
        <div className="glass-card space-y-4 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Perfil de dueno</h3>
              <p className="text-xs text-[#9a948a]">
                Actualiza tus datos personales y de contacto.
              </p>
            </div>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
              type="button"
              onClick={saveOwner}
              disabled={ownerStatus === "saving"}
            >
              {ownerStatus === "saving" ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>

          {ownerStatus === "loading" && (
            <p className="text-xs text-[#9a948a]">Cargando perfil...</p>
          )}
          {ownerStatus === "error" && (
            <p className="text-xs text-[#f5b78a]">{ownerError}</p>
          )}

          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs text-[#9a948a]">
              Nombre completo
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={ownerName}
                onChange={(event) => setOwnerName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Email
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={ownerEmail}
                onChange={(event) => setOwnerEmail(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Telefono
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={ownerPhone}
                onChange={(event) => setOwnerPhone(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Direccion
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                value={ownerAddress}
                onChange={(event) => setOwnerAddress(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a] md:col-span-2">
              Nueva contrasena
              <input
                type="password"
                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
            <p className="text-xs text-[#9a948a]">Publicaciones creadas por tu cuenta.</p>
            </div>
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
              type="button"
              onClick={loadProperties}
              disabled={propertyStatus === "loading"}
            >
              {propertyStatus === "loading" ? "Cargando..." : "Actualizar"}
            </button>
          </div>
          {propertyStatus === "error" && (
            <p className="text-xs text-[#f5b78a]">{propertyError}</p>
          )}
          {propertyStatus === "loading" && (
            <p className="text-xs text-[#9a948a]">Cargando publicaciones...</p>
          )}
          {propertyStatus === "idle" && items.length === 0 && (
            <p className="text-xs text-[#9a948a]">No hay publicaciones cargadas.</p>
          )}
          {items.length > 0 && (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/60 px-4 py-3"
                >
                  <div className="min-w-[220px]">
                    <div className="flex items-center gap-2 text-sm text-white">
                      <span
                        className={`h-2.5 w-2.5 rounded-full ${
                          statusDotClass[item.status ?? "DRAFT"] ?? "bg-slate-400"
                        }`}
                      />
                      {item.title}
                    </div>
                    {item.description && (
                      <div className="text-xs text-[#9a948a]">
                        {item.description.length > 80
                          ? `${item.description.slice(0, 80)}...`
                          : item.description}
                      </div>
                    )}
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#c7c2b8]">
                    <div>
                      {item.priceCurrency} {item.priceAmount}
                    </div>
                    <select
                      className="rounded-lg border border-white/10 bg-night-900/60 px-2 py-1 text-xs text-white"
                      value={item.status}
                      onChange={(event) => updateStatus(item.id, event.target.value)}
                    >
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {statusLabels[status] ?? status}
                        </option>
                      ))}
                    </select>
                    <button
                      className="rounded-full border border-white/20 px-3 py-1 text-xs"
                      type="button"
                      onClick={() => openDetail(item)}
                    >
                      Ver
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {selectedId && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
            <div className="max-h-[92vh] w-full max-w-3xl overflow-hidden rounded-3xl border border-white/10 bg-night-900/95 shadow-card">
              <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
                <div>
                  <h3 className="text-xl text-white">
                    {selectedItem?.title ?? "Detalle de inmueble"}
                </h3>
                {selectedItem?.status && (
                  <div className="mt-2 inline-flex items-center gap-2 text-xs text-[#c7c2b8]">
                    <span
                      className={`h-2.5 w-2.5 rounded-full ${
                        statusDotClass[selectedItem.status] ?? "bg-slate-400"
                      }`}
                    />
                    {statusLabels[selectedItem.status] ?? selectedItem.status}
                  </div>
                )}
              </div>
              <button
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                type="button"
                onClick={closeDetail}
              >
                Cerrar
              </button>
            </div>
              <div className="max-h-[calc(92vh-120px)] overflow-y-auto space-y-6 p-6">
              {detailStatus === "loading" && (
                <p className="text-xs text-[#9a948a]">Cargando detalle...</p>
              )}
              {detailStatus === "error" && (
                <p className="text-xs text-[#f5b78a]">{detailError}</p>
              )}
              {detailStatus === "idle" && selectedItem && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="text-sm text-[#c7c2b8]">
                      {selectedItem.priceCurrency} {selectedItem.priceAmount}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                        type="button"
                        onClick={() => setIsEditing((prev) => !prev)}
                      >
                        {isEditing ? "Cancelar" : "Editar"}
                      </button>
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                          type="button"
                          onClick={() => setShowPublicModal(true)}
                        >
                          Ver publico
                        </button>
                      </div>
                    </div>

                  {isEditing ? (
                    <div className="space-y-4">
                          <div className="grid gap-4 md:grid-cols-2">
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Titulo
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editTitle}
                                onChange={(event) => setEditTitle(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Operacion
                              <select
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editOperationType}
                                onChange={(event) => setEditOperationType(event.target.value)}
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
                                value={editPropertyType}
                                onChange={(event) => setEditPropertyType(event.target.value)}
                              >
                                <option value="HOUSE">Casa</option>
                                <option value="APARTMENT">Departamento</option>
                                <option value="LAND">Terreno</option>
                                <option value="COMMERCIAL">Comercio</option>
                                <option value="OFFICE">Oficina</option>
                                <option value="WAREHOUSE">Galpon</option>
                              </select>
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Precio
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editPrice}
                                onChange={(event) => setEditPrice(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Expensas
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editExpensesAmount}
                                onChange={(event) => setEditExpensesAmount(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Moneda expensas
                              <select
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editExpensesCurrency}
                                onChange={(event) => setEditExpensesCurrency(event.target.value)}
                              >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                              </select>
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Ambientes
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editRooms}
                                onChange={(event) => setEditRooms(event.target.value)}
                              />
                            </label>
                          <label className="space-y-2 text-xs text-[#9a948a]">
                            Banos
                            <input
                              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                              value={editBathrooms}
                              onChange={(event) => setEditBathrooms(event.target.value)}
                            />
                          </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              M2
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editAreaM2}
                                onChange={(event) => setEditAreaM2(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Cubierta (m2)
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editCoveredAreaM2}
                                onChange={(event) => setEditCoveredAreaM2(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Semicubierta (m2)
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editSemiCoveredAreaM2}
                                onChange={(event) => setEditSemiCoveredAreaM2(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Dormitorios
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editBedrooms}
                                onChange={(event) => setEditBedrooms(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Pisos
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editFloorsCount}
                                onChange={(event) => setEditFloorsCount(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Moneda
                              <select
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editCurrency}
                                onChange={(event) => setEditCurrency(event.target.value)}
                              >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                              </select>
                            </label>
                          <label className="space-y-2 text-xs text-[#9a948a]">
                            Estado
                            <select
                            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                            value={editStatus}
                            onChange={(event) => setEditStatus(event.target.value)}
                          >
                            {statusOptions.map((status) => (
                              <option key={status} value={status}>
                                {statusLabels[status] ?? status}
                              </option>
                            ))}
                          </select>
                          </label>
                        </div>
                        <label className="space-y-2 text-xs text-[#9a948a]">
                          Descripcion
                          <textarea
                            rows={4}
                            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                            value={editDescription}
                            onChange={(event) => setEditDescription(event.target.value)}
                          />
                        </label>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Ubicacion y datos</h4>
                          <div className="grid gap-4 md:grid-cols-3">
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Partido
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editParty}
                                onChange={(event) => setEditParty(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Barrio
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editNeighborhood}
                                onChange={(event) => setEditNeighborhood(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Codigo postal
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editPostalCode}
                                onChange={(event) => setEditPostalCode(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Lote o partida
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editLotOrParcel}
                                onChange={(event) => setEditLotOrParcel(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Frente (m)
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editFrontageM}
                                onChange={(event) => setEditFrontageM(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Fondo (m)
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editDepthM}
                                onChange={(event) => setEditDepthM(event.target.value)}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Convivencia</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#d1a466]"
                                checked={editHasGarage}
                                onChange={(event) => setEditHasGarage(event.target.checked)}
                              />
                              Cochera
                            </label>
                            <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#d1a466]"
                                checked={editFurnished}
                                onChange={(event) => setEditFurnished(event.target.checked)}
                              />
                              Amueblado
                            </label>
                            <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#d1a466]"
                                checked={editPetsAllowed}
                                onChange={(event) => setEditPetsAllowed(event.target.checked)}
                              />
                              Mascotas
                            </label>
                            <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#d1a466]"
                                checked={editKidsAllowed}
                                onChange={(event) => setEditKidsAllowed(event.target.checked)}
                              />
                              Ninos
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Antiguedad (anos)
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editAgeYears}
                                onChange={(event) => setEditAgeYears(event.target.value)}
                              />
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Amenities</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            {[
                              { id: "AIR_CONDITIONING", label: "Aire acondicionado" },
                              { id: "HEATER", label: "Estufa" },
                              { id: "KITCHEN", label: "Cocina" },
                              { id: "GRILL", label: "Parrilla" },
                              { id: "POOL", label: "Pileta" },
                              { id: "JACUZZI", label: "Hidromasaje" },
                              { id: "SOLARIUM", label: "Solarium" },
                              { id: "ELEVATOR", label: "Ascensor" },
                            ].map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 text-xs text-[#9a948a]"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[#d1a466]"
                                  checked={editAmenities.includes(item.id)}
                                  onChange={(event) =>
                                    setEditAmenities((prev) =>
                                      event.target.checked
                                        ? [...prev, item.id]
                                        : prev.filter((value) => value !== item.id)
                                    )
                                  }
                                />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Negocio</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            {[
                              { id: "FOOD", label: "Local de comida" },
                              { id: "EVENTS", label: "Salon de eventos" },
                              { id: "RETAIL", label: "Negocio comercial" },
                              { id: "FACTORY", label: "Fabrica" },
                              { id: "OFFICES", label: "Oficinas" },
                              { id: "CLINICS", label: "Consultorios" },
                            ].map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 text-xs text-[#9a948a]"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[#d1a466]"
                                  checked={editBusinessUses.includes(item.id)}
                                  onChange={(event) =>
                                    setEditBusinessUses((prev) =>
                                      event.target.checked
                                        ? [...prev, item.id]
                                        : prev.filter((value) => value !== item.id)
                                    )
                                  }
                                />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Oficina</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            {[
                              { id: "MEETING_ROOM", label: "Sala de reuniones" },
                              { id: "RECEPTION", label: "Recepcion" },
                              { id: "PRIVATE_OFFICES", label: "Despachos" },
                            ].map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 text-xs text-[#9a948a]"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[#d1a466]"
                                  checked={editOfficeFeatures.includes(item.id)}
                                  onChange={(event) =>
                                    setEditOfficeFeatures((prev) =>
                                      event.target.checked
                                        ? [...prev, item.id]
                                        : prev.filter((value) => value !== item.id)
                                    )
                                  }
                                />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Galpon</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            {[
                              { id: "TRUCK_ACCESS", label: "Acceso camion" },
                            ].map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 text-xs text-[#9a948a]"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[#d1a466]"
                                  checked={editWarehouseFeatures.includes(item.id)}
                                  onChange={(event) =>
                                    setEditWarehouseFeatures((prev) =>
                                      event.target.checked
                                        ? [...prev, item.id]
                                        : prev.filter((value) => value !== item.id)
                                    )
                                  }
                                />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Terreno</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#d1a466]"
                                checked={editBuildable}
                                onChange={(event) => setEditBuildable(event.target.checked)}
                              />
                              Apto para construir
                            </label>
                            <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#d1a466]"
                                checked={editInvestmentOpportunity}
                                onChange={(event) =>
                                  setEditInvestmentOpportunity(event.target.checked)
                                }
                              />
                              Oportunidad de inversion
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Financiacion</h4>
                          <div className="grid gap-4 md:grid-cols-3">
                            <label className="flex items-center gap-3 text-xs text-[#9a948a]">
                              <input
                                type="checkbox"
                                className="h-4 w-4 accent-[#d1a466]"
                                checked={editFinancingAvailable}
                                onChange={(event) =>
                                  setEditFinancingAvailable(event.target.checked)
                                }
                              />
                              Financia
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Monto
                              <input
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editFinancingAmount}
                                onChange={(event) => setEditFinancingAmount(event.target.value)}
                              />
                            </label>
                            <label className="space-y-2 text-xs text-[#9a948a]">
                              Moneda
                              <select
                                className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                                value={editFinancingCurrency}
                                onChange={(event) => setEditFinancingCurrency(event.target.value)}
                              >
                                <option value="ARS">ARS</option>
                                <option value="USD">USD</option>
                              </select>
                            </label>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <h4 className="text-sm font-semibold text-white">Servicios</h4>
                          <div className="grid gap-3 md:grid-cols-3">
                            {[
                              { id: "electricity", label: "Luz", value: serviceElectricity, setValue: setServiceElectricity },
                              { id: "gas", label: "Gas", value: serviceGas, setValue: setServiceGas },
                              { id: "water", label: "Agua", value: serviceWater, setValue: setServiceWater },
                              { id: "sewer", label: "Cloaca", value: serviceSewer, setValue: setServiceSewer },
                              { id: "internet", label: "Internet", value: serviceInternet, setValue: setServiceInternet },
                              { id: "pavement", label: "Asfalto", value: servicePavement, setValue: setServicePavement },
                            ].map((item) => (
                              <label
                                key={item.id}
                                className="flex items-center gap-3 text-xs text-[#9a948a]"
                              >
                                <input
                                  type="checkbox"
                                  className="h-4 w-4 accent-[#d1a466]"
                                  checked={item.value}
                                  onChange={(event) => item.setValue(event.target.checked)}
                                />
                                {item.label}
                              </label>
                            ))}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs text-[#9a948a]">Fotos actuales</label>
                          {selectedItem.photos && selectedItem.photos.length > 0 ? (
                            <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
                              {selectedItem.photos.map((photo) => (
                                <div
                                  key={photo.id ?? photo.url}
                                  className="relative overflow-hidden rounded-xl border border-white/10 bg-night-900/60"
                                >
                                  {photo.id && (
                                    <button
                                      type="button"
                                      className="absolute right-2 top-2 rounded-full bg-black/60 px-2 py-1 text-[10px] text-white"
                                      onClick={() => photo.id && removePhoto(photo.id)}
                                    >
                                      Quitar
                                    </button>
                                  )}
                                  <img
                                    src={photo.url}
                                    alt="Foto actual"
                                    className="h-24 w-full object-cover"
                                  />
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="text-xs text-[#9a948a]">
                              No hay fotos cargadas.
                            </div>
                          )}
                        </div>

                        <div className="space-y-3">
                          <label className="text-xs text-[#9a948a]">Agregar nuevas fotos</label>
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-[#c7c2b8]"
                            onChange={(event) => {
                              const files = event.target.files
                                ? Array.from(event.target.files)
                                : [];
                              setNewPhotos(files.slice(0, 12));
                            }}
                          />
                          {newPhotos.length > 0 && (
                            <div className="text-xs text-[#9a948a]">
                              {newPhotos.length} fotos nuevas seleccionadas.
                            </div>
                          )}
                        </div>
                      <div className="flex flex-wrap gap-3">
                        <button
                          className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                          type="button"
                          onClick={saveEdit}
                        >
                          Guardar cambios
                        </button>
                        <button
                          className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                          type="button"
                          onClick={() => setIsEditing(false)}
                        >
                          Cancelar
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 text-sm text-[#9a948a]">
                      <div>{selectedItem.description}</div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {showPublicModal && publicListing && (
        <PropertyDetailModal
          listing={publicListing}
          onClose={() => setShowPublicModal(false)}
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
      </div>
    </div>
  );
}
