import { useEffect, useMemo, useState } from "react";
import { MapContainer, TileLayer, CircleMarker, useMapEvents } from "react-leaflet";
import { geocodeAddress } from "../shared/map/geocode";
import { env } from "../shared/config/env";
import { getRoleFromToken, getSessionUser, getToken } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";

type Overview = {
  users: number;
  agencies: number;
  properties: number;
  contactRequests: number;
  reports: number;
  pendingVerifications: number;
};

type AdminUser = {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  role: string;
  status: string;
  createdAt: string;
  legalAcceptances?: Array<{
    documentKey: string;
    version: string;
    acceptedAt: string;
  }>;
  subscription?: {
    planCode: string;
    planName: string;
    maxProperties: number;
    priceAmount: number;
    priceCurrency: string;
    status?: string;
    trialEndsAt?: string | null;
    isTrialActive: boolean;
    trialDaysRemaining: number;
  } | null;
};

type AdminReport = {
  id: string;
  type: "PROPERTY" | "USER";
  reason: string;
  status: string;
  createdAt: string;
  property?: { id: string; title: string; operationType: string; propertyType: string };
  reportedUser?: { id: string; name?: string | null; email?: string | null; role?: string };
  reporter?: { id: string; name?: string | null; email?: string | null } | null;
};

type AdminProperty = {
  id: string;
  title: string;
  status: string;
  operationType: string;
  propertyType: string;
  priceAmount: string;
  priceCurrency: string;
  updatedAt: string;
  ownerUser?: { id: string; name?: string | null; email?: string | null } | null;
  agency?: { id: string; name?: string | null } | null;
  location?: { addressLine?: string | null; locality?: { name: string } | null } | null;
};

type AdminVerification = {
  id: string;
  type: string;
  status: string;
  payload: Record<string, unknown>;
  createdAt: string;
  user: { id: string; name?: string | null; email?: string | null; role: string };
};

type PoiCategory =
  | "SCHOOL"
  | "KINDER"
  | "FIRE"
  | "POLICE"
  | "HEALTH"
  | "SUPERMARKET"
  | "PARK";

type AdminPoi = {
  id: string;
  title: string;
  category: PoiCategory;
  lat: number;
  lng: number;
  address?: string | null;
  description?: string | null;
  isActive: boolean;
  createdAt: string;
};

type AdminPoiApi = Omit<AdminPoi, "lat" | "lng"> & {
  lat: number | string;
  lng: number | string;
};

type AdminAd = {
  id: string;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  ctaText?: string | null;
  priority: number;
  isActive: boolean;
  createdAt: string;
};

type AdminPlan = {
  id: string;
  code: string;
  name: string;
  priceAmount: number | string;
  priceCurrency: string;
  maxProperties: number;
  createdAt: string;
  updatedAt?: string;
};

type TabKey =
  | "overview"
  | "users"
  | "plans"
  | "properties"
  | "reports"
  | "verifications"
  | "pois"
  | "ads";

const poiCategoryLabels: Record<PoiCategory, string> = {
  SCHOOL: "Escuela",
  KINDER: "Jardin",
  FIRE: "Bomberos",
  POLICE: "Policia",
  HEALTH: "Salud",
  SUPERMARKET: "Supermercado",
  PARK: "Plaza",
};

async function readApiError(response: Response, fallback: string): Promise<string> {
  try {
    const json = (await response.json()) as { message?: string };
    if (json?.message && typeof json.message === "string") {
      return json.message;
    }
  } catch {
    // ignore invalid JSON error payloads
  }
  return fallback;
}

function normalizePoi(poi: AdminPoiApi): AdminPoi {
  return {
    ...poi,
    lat: Number(poi.lat),
    lng: Number(poi.lng),
  };
}

function formatShortDateTime(value?: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizePlan(plan: AdminPlan): AdminPlan {
  return {
    ...plan,
    priceAmount: Number(plan.priceAmount),
    maxProperties: Number(plan.maxProperties),
  };
}

function getLatestAcceptance(
  acceptances: AdminUser["legalAcceptances"] | undefined,
  documentKey: "TERMS" | "PRIVACY"
) {
  return (acceptances ?? []).find((item) => item.documentKey === documentKey) ?? null;
}

function PoiLocationPicker({
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
        className="h-56 w-full"
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

export function AdminPage() {
  const { addToast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const token = useMemo(() => getToken(), []);
  const tokenRole = useMemo(() => getRoleFromToken(token), [token]);
  const effectiveRole = sessionUser?.role ?? tokenRole ?? null;
  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [overviewError, setOverviewError] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersStatus, setUsersStatus] = useState<"idle" | "loading" | "error">("idle");
  const [usersError, setUsersError] = useState("");

  const [plans, setPlans] = useState<AdminPlan[]>([]);
  const [plansStatus, setPlansStatus] = useState<"idle" | "loading" | "error">("idle");
  const [plansError, setPlansError] = useState("");
  const [planDrafts, setPlanDrafts] = useState<Record<string, { name: string; priceAmount: string; maxProperties: string }>>(
    {}
  );
  const [planSavingId, setPlanSavingId] = useState<string | null>(null);

  const [properties, setProperties] = useState<AdminProperty[]>([]);
  const [propertiesStatus, setPropertiesStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [propertiesError, setPropertiesError] = useState("");

  const [reports, setReports] = useState<AdminReport[]>([]);
  const [reportsStatus, setReportsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [reportsError, setReportsError] = useState("");

  const [verifications, setVerifications] = useState<AdminVerification[]>([]);
  const [verificationsStatus, setVerificationsStatus] = useState<
    "idle" | "loading" | "error"
  >("idle");
  const [verificationsError, setVerificationsError] = useState("");

  const [pois, setPois] = useState<AdminPoi[]>([]);
  const [poisStatus, setPoisStatus] = useState<"idle" | "loading" | "error">("idle");
  const [poisError, setPoisError] = useState("");
  const [poiTitle, setPoiTitle] = useState("");
  const [poiCategory, setPoiCategory] = useState<PoiCategory>("SCHOOL");
  const [poiLat, setPoiLat] = useState("");
  const [poiLng, setPoiLng] = useState("");
  const [poiAddress, setPoiAddress] = useState("");
  const [poiDescription, setPoiDescription] = useState("");
  const [poiSaving, setPoiSaving] = useState(false);
  const [poiSearch, setPoiSearch] = useState("");
  const [poiSearchStatus, setPoiSearchStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [poiSearchMessage, setPoiSearchMessage] = useState("");

  const [ads, setAds] = useState<AdminAd[]>([]);
  const [adsStatus, setAdsStatus] = useState<"idle" | "loading" | "error">("idle");
  const [adsError, setAdsError] = useState("");
  const [adTitle, setAdTitle] = useState("");
  const [adBody, setAdBody] = useState("");
  const [adImageUrl, setAdImageUrl] = useState("");
  const [adLinkUrl, setAdLinkUrl] = useState("");
  const [adCtaText, setAdCtaText] = useState("");
  const [adPriority, setAdPriority] = useState("0");
  const [adSaving, setAdSaving] = useState(false);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") {
      return;
    }
    setOverviewStatus("loading");
    setOverviewError("");
    fetch(`${env.apiUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar el overview."));
        }
        return response.json() as Promise<Overview>;
      })
      .then((data) => {
        setOverview(data);
        setOverviewStatus("idle");
      })
      .catch((error) => {
        setOverviewStatus("error");
        setOverviewError(error instanceof Error ? error.message : "Error al cargar.");
      });
  }, [token, effectiveRole]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "users") return;
    setUsersStatus("loading");
    setUsersError("");
    fetch(`${env.apiUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar usuarios."));
        }
        return response.json() as Promise<{ items: AdminUser[] }>;
      })
      .then((data) => {
        setUsers(data.items ?? []);
        setUsersStatus("idle");
      })
      .catch((error) => {
        setUsersStatus("error");
        setUsersError(error instanceof Error ? error.message : "Error al cargar usuarios.");
      });
  }, [token, effectiveRole, tab]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "verifications") return;
    setVerificationsStatus("loading");
    setVerificationsError("");
    fetch(`${env.apiUrl}/admin/verifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar verificaciones."));
        }
        return response.json() as Promise<{ items: AdminVerification[] }>;
      })
      .then((data) => {
        setVerifications(data.items ?? []);
        setVerificationsStatus("idle");
      })
      .catch((error) => {
        setVerificationsStatus("error");
        setVerificationsError(
          error instanceof Error ? error.message : "Error al cargar verificaciones."
        );
      });
  }, [token, effectiveRole, tab]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "properties") return;
    setPropertiesStatus("loading");
    setPropertiesError("");
    fetch(`${env.apiUrl}/admin/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar publicaciones."));
        }
        return response.json() as Promise<{ items: AdminProperty[] }>;
      })
      .then((data) => {
        setProperties(data.items ?? []);
        setPropertiesStatus("idle");
      })
      .catch((error) => {
        setPropertiesStatus("error");
        setPropertiesError(
          error instanceof Error ? error.message : "Error al cargar publicaciónes."
        );
      });
  }, [token, effectiveRole, tab]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "reports") return;
    setReportsStatus("loading");
    setReportsError("");
    fetch(`${env.apiUrl}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar reportes."));
        }
        return response.json() as Promise<{ items: AdminReport[] }>;
      })
      .then((data) => {
        setReports(data.items ?? []);
        setReportsStatus("idle");
      })
      .catch((error) => {
        setReportsStatus("error");
        setReportsError(error instanceof Error ? error.message : "Error al cargar reportes.");
      });
  }, [token, effectiveRole, tab]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "pois") return;
    setPoisStatus("loading");
    setPoisError("");
    fetch(`${env.apiUrl}/admin/pois`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar los puntos."));
        }
        return response.json() as Promise<{ items: AdminPoiApi[] }>;
      })
      .then((data) => {
        setPois((data.items ?? []).map(normalizePoi));
        setPoisStatus("idle");
      })
      .catch((error) => {
        setPoisStatus("error");
        setPoisError(error instanceof Error ? error.message : "Error al cargar puntos.");
      });
  }, [token, effectiveRole, tab]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "plans") return;
    setPlansStatus("loading");
    setPlansError("");
    fetch(`${env.apiUrl}/admin/plans`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar planes."));
        }
        return response.json() as Promise<{ items: AdminPlan[] }>;
      })
      .then((data) => {
        const normalized = (data.items ?? []).map(normalizePlan);
        setPlans(normalized);
        setPlanDrafts(
          Object.fromEntries(
            normalized.map((plan) => [
              plan.id,
              {
                name: plan.name ?? "",
                priceAmount: String(Number(plan.priceAmount) || 0),
                maxProperties: String(Number(plan.maxProperties) || 0),
              },
            ])
          )
        );
        setPlansStatus("idle");
      })
      .catch((error) => {
        setPlansStatus("error");
        setPlansError(error instanceof Error ? error.message : "Error al cargar planes.");
      });
  }, [token, effectiveRole, tab]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "ads") return;
    setAdsStatus("loading");
    setAdsError("");
    fetch(`${env.apiUrl}/admin/ads`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar publicidad."));
        }
        return response.json() as Promise<{ items: AdminAd[] }>;
      })
      .then((data) => {
        setAds(data.items ?? []);
        setAdsStatus("idle");
      })
      .catch((error) => {
        setAdsStatus("error");
        setAdsError(error instanceof Error ? error.message : "Error al cargar publicidad.");
      });
  }, [token, effectiveRole, tab]);

  const updateUserStatus = async (userId: string, status: string) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/users/${userId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos actualizar el usuario.");
      setUsersError(message);
      addToast(message, "error");
      return;
    }
    setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, status } : item)));
  };

  const updatePlanDraft = (planId: string, field: "name" | "priceAmount" | "maxProperties", value: string) => {
    setPlanDrafts((prev) => ({
      ...prev,
      [planId]: {
        name: prev[planId]?.name ?? "",
        priceAmount: prev[planId]?.priceAmount ?? "0",
        maxProperties: prev[planId]?.maxProperties ?? "0",
        [field]: value,
      },
    }));
  };

  const savePlan = async (planId: string) => {
    if (!token) return;
    const draft = planDrafts[planId];
    if (!draft) return;
    setPlanSavingId(planId);
    setPlansError("");
    try {
      const response = await fetch(`${env.apiUrl}/admin/plans/${planId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: draft.name.trim(),
          priceAmount: Number(draft.priceAmount),
          maxProperties: Number(draft.maxProperties),
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "No pudimos actualizar el plan."));
      }
      const updated = normalizePlan((await response.json()) as AdminPlan);
      setPlans((prev) => prev.map((item) => (item.id === planId ? updated : item)));
      setPlanDrafts((prev) => ({
        ...prev,
        [planId]: {
          name: updated.name,
          priceAmount: String(Number(updated.priceAmount)),
          maxProperties: String(updated.maxProperties),
        },
      }));
      addToast(`Plan ${updated.name} actualizado.`, "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al actualizar el plan.";
      setPlansError(message);
      addToast(message, "error");
    } finally {
      setPlanSavingId(null);
    }
  };

  const updateReportStatus = async (
    reportId: string,
    status: string,
    type: "PROPERTY" | "USER"
  ) => {
    if (!token) return;
    const endpoint =
      type === "USER"
        ? `${env.apiUrl}/admin/user-reports/${reportId}/status`
        : `${env.apiUrl}/admin/reports/${reportId}/status`;
    const response = await fetch(endpoint, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos actualizar el reporte.");
      setReportsError(message);
      addToast(message, "error");
      return;
    }
    setReports((prev) => prev.map((item) => (item.id === reportId ? { ...item, status } : item)));
  };

  const updatePropertyStatus = async (propertyId: string, status: string) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/properties/${propertyId}/status`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos actualizar la publicacion.");
      setPropertiesError(message);
      addToast(message, "error");
      return;
    }
    setProperties((prev) =>
      prev.map((item) => (item.id === propertyId ? { ...item, status } : item))
    );
  };

  const updateVerificationStatus = async (verificationId: string, status: string) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/verifications/${verificationId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos actualizar la verificacion.");
      setVerificationsError(message);
      addToast(message, "error");
      return;
    }
    setVerifications((prev) =>
      prev.map((item) => (item.id === verificationId ? { ...item, status } : item))
    );
  };

  const createPoi = async () => {
    if (!token) return;
    setPoisError("");
    if (!poiTitle.trim() || !poiLat.trim() || !poiLng.trim()) {
      setPoisError("Completa titulo, latitud y longitud.");
      return;
    }
    setPoiSaving(true);
    try {
      const response = await fetch(`${env.apiUrl}/admin/pois`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: poiTitle.trim(),
          category: poiCategory,
          lat: Number(poiLat),
          lng: Number(poiLng),
          address: poiAddress || undefined,
          description: poiDescription || undefined,
          isActive: true,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "No pudimos crear el punto."));
      }
      const created = normalizePoi((await response.json()) as AdminPoiApi);
      setPois((prev) => [created, ...prev]);
      setPoiTitle("");
      setPoiLat("");
      setPoiLng("");
      setPoiAddress("");
      setPoiDescription("");
    } catch (error) {
      setPoisError(error instanceof Error ? error.message : "Error al crear punto.");
    } finally {
      setPoiSaving(false);
    }
  };

  const updatePoiStatus = async (poiId: string, isActive: boolean) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/pois/${poiId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive }),
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos actualizar el punto.");
      setPoisError(message);
      addToast(message, "error");
      return;
    }
    setPois((prev) => prev.map((poi) => (poi.id === poiId ? { ...poi, isActive } : poi)));
  };

  const deletePoi = async (poiId: string) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/pois/${poiId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos borrar el punto.");
      setPoisError(message);
      addToast(message, "error");
      return;
    }
    setPois((prev) => prev.filter((poi) => poi.id !== poiId));
  };

  const createAd = async () => {
    if (!token) return;
    setAdsError("");
    if (!adTitle.trim()) {
      setAdsError("El titulo es obligatorio.");
      return;
    }
    setAdSaving(true);
    try {
      const response = await fetch(`${env.apiUrl}/admin/ads`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: adTitle.trim(),
          body: adBody || undefined,
          imageUrl: adImageUrl || undefined,
          linkUrl: adLinkUrl || undefined,
          ctaText: adCtaText || undefined,
          priority: Number(adPriority) || 0,
          isActive: true,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "No pudimos crear la publicidad."));
      }
      const created = (await response.json()) as AdminAd;
      setAds((prev) => [created, ...prev]);
      setAdTitle("");
      setAdBody("");
      setAdImageUrl("");
      setAdLinkUrl("");
      setAdCtaText("");
      setAdPriority("0");
    } catch (error) {
      setAdsError(error instanceof Error ? error.message : "Error al crear publicidad.");
    } finally {
      setAdSaving(false);
    }
  };

  const updateAdStatus = async (adId: string, isActive: boolean) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/ads/${adId}`, {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ isActive }),
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos actualizar la publicidad.");
      setAdsError(message);
      addToast(message, "error");
      return;
    }
    setAds((prev) => prev.map((ad) => (ad.id === adId ? { ...ad, isActive } : ad)));
  };

  const deleteAd = async (adId: string) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/ads/${adId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const message = await readApiError(response, "No pudimos borrar la publicidad.");
      setAdsError(message);
      addToast(message, "error");
      return;
    }
    setAds((prev) => prev.filter((ad) => ad.id !== adId));
  };

  if (effectiveRole !== "ADMIN") {
    return (
      <div className="glass-card p-6 text-sm text-[#D1C7BD]">
        Esta seccion es solo para administradores.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Panel admin</h2>
          <p className="text-sm text-[#D1C7BD]">Control total de DomusBrag.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(
            [
              ["overview", "Overview"],
              ["users", "Usuarios"],
              ["plans", "Planes"],
              ["properties", "Publicaciones"],
              ["reports", "Reportes"],
              ["verifications", "Verificaciones"],
              ["pois", "Puntos mapa"],
              ["ads", "Publicidad"],
            ] as Array<[TabKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                tab === key
                  ? "rounded-full border border-gold-500/40 bg-night-900/48 px-3 py-1 text-white"
                  : "rounded-full border border-white/10 bg-night-900/32 px-3 py-1 text-[#E7E2DD]"
              }
              onClick={() => setTab(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {tab === "overview" && (
        <section className="grid gap-4 md:grid-cols-3">
          {overviewStatus === "loading" && (
            <div className="glass-card p-4 text-xs text-[#D1C7BD]">Cargando...</div>
          )}
          {overviewStatus === "error" && (
            <div className="glass-card p-4 text-xs text-[#AF8C5C]">{overviewError}</div>
          )}
          {overview && (
            <>
              {[
                { label: "Usuarios", value: overview.users },
                { label: "Inmobiliarias", value: overview.agencies },
                { label: "Publicaciones", value: overview.properties },
                { label: "Solicitudes", value: overview.contactRequests },
                { label: "Reportes abiertos", value: overview.reports },
                { label: "Verificaciones pendientes", value: overview.pendingVerifications },
              ].map((item) => (
                <div key={item.label} className="glass-card p-4">
                  <div className="text-xs text-[#D1C7BD]">{item.label}</div>
                  <div className="mt-2 text-2xl text-white">{item.value}</div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "plans" && (
        <section className="glass-card space-y-4 p-4">
          <div className="space-y-1">
            <h3 className="text-sm text-white">Planes de suscripcion</h3>
            <p className="text-xs text-[#D1C7BD]">
              Ajusta precios y cupos sin tocar codigo. Moneda fija: ARS.
            </p>
          </div>

          {plansStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando planes...</div>
          )}
          {plansStatus === "error" && <div className="text-xs text-[#AF8C5C]">{plansError}</div>}
          {plansError && plansStatus !== "error" && (
            <div className="text-xs text-[#AF8C5C]">{plansError}</div>
          )}

          <div className="space-y-3">
            {plans.map((plan) => {
              const draft = planDrafts[plan.id] ?? {
                name: plan.name,
                priceAmount: String(plan.priceAmount),
                maxProperties: String(plan.maxProperties),
              };
              const isSaving = planSavingId === plan.id;
              const isPaidPlan = plan.code !== "OWNER_FREE";
              return (
                <div
                  key={plan.id}
                  className="rounded-2xl border border-white/10 bg-night-900/48 p-4"
                >
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-gold-500/30 bg-night-900/60 px-3 py-1 text-[11px] tracking-[0.12em] text-[#D1C7BD]">
                        {plan.code}
                      </span>
                      <span className="text-xs text-[#9f988d]">
                        Act. {formatShortDateTime(plan.updatedAt ?? plan.createdAt)}
                      </span>
                    </div>
                    <span className="rounded-full border border-white/10 px-3 py-1 text-xs text-[#E7E2DD]">
                      {plan.priceCurrency}
                    </span>
                  </div>

                  <div className="grid gap-3 md:grid-cols-12">
                    <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-5">
                      Nombre del plan
                      <input
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={draft.name}
                        onChange={(event) => updatePlanDraft(plan.id, "name", event.target.value)}
                      />
                    </label>
                    <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-4">
                      Precio mensual (ARS)
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={draft.priceAmount}
                        onChange={(event) =>
                          updatePlanDraft(plan.id, "priceAmount", event.target.value)
                        }
                      />
                      {isPaidPlan && Number(draft.priceAmount || 0) < 15 && (
                        <div className="text-[11px] text-[#AF8C5C]">
                          Mercado Pago puede rechazar montos menores a ARS 15.
                        </div>
                      )}
                    </label>
                    <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-3">
                      Cupo de inmuebles
                      <input
                        type="number"
                        min={0}
                        step="1"
                        className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                        value={draft.maxProperties}
                        onChange={(event) =>
                          updatePlanDraft(plan.id, "maxProperties", event.target.value)
                        }
                      />
                    </label>
                  </div>

                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    <button
                      type="button"
                      className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
                      onClick={() => savePlan(plan.id)}
                      disabled={isSaving}
                    >
                      {isSaving ? "Guardando..." : "Guardar cambios"}
                    </button>
                    <span className="text-xs text-[#9f988d]">
                      {isPaidPlan
                        ? "Impacta nuevas activaciones y renovaciones. Revisa reglas de cambio de plan."
                        : "Plan gratuito para dueño directo (sin cobro)."}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "users" && (
        <section className="glass-card space-y-3 p-4">
          {usersStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando usuarios...</div>
          )}
          {usersStatus === "error" && (
            <div className="text-xs text-[#AF8C5C]">{usersError}</div>
          )}
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs"
            >
              <div>
                <div className="text-sm text-white">{user.name ?? "Sin nombre"}</div>
                <div className="text-[#D1C7BD]">{user.email}</div>
                <div className="text-[#D1C7BD]">{user.role}</div>
                {user.subscription && (
                  <div className="mt-2 rounded-xl border border-white/10 bg-night-900/36 px-2.5 py-2 text-[11px] text-[#ddd5c9]">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-gold-400/30 bg-gold-500/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-gold-300">
                        {user.subscription.planCode}
                      </span>
                      <span>{user.subscription.planName}</span>
                      {user.subscription.maxProperties > 0 && (
                        <span className="text-[#9f988d]">
                          Hasta {user.subscription.maxProperties} inmuebles
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[#cfc7ba]">
                      {user.subscription.isTrialActive
                        ? `Primer mes gratis activo · ${user.subscription.trialDaysRemaining} dias restantes`
                        : user.subscription.trialEndsAt
                        ? `Trial finalizado · vencio ${formatShortDateTime(user.subscription.trialEndsAt)}`
                        : "Sin trial activo"}
                    </div>
                  </div>
                )}
                <div className="mt-2 grid gap-1 text-[11px] text-[#cfc7ba]">
                  {(() => {
                    const terms = getLatestAcceptance(user.legalAcceptances, "TERMS");
                    const privacy = getLatestAcceptance(user.legalAcceptances, "PRIVACY");
                    return (
                      <>
                        <div className="inline-flex items-center gap-2">
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#D1C7BD]">
                            TyC
                          </span>
                          <span>{terms ? `v${terms.version}` : "Sin registro"}</span>
                          {terms ? (
                            <span className="text-[#9f988d]">{formatShortDateTime(terms.acceptedAt)}</span>
                          ) : null}
                        </div>
                        <div className="inline-flex items-center gap-2">
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-[#D1C7BD]">
                            Priv
                          </span>
                          <span>{privacy ? `v${privacy.version}` : "Sin registro"}</span>
                          {privacy ? (
                            <span className="text-[#9f988d]">{formatShortDateTime(privacy.acceptedAt)}</span>
                          ) : null}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[#E7E2DD]">
                  {user.status}
                </span>
                <select
                  className="rounded-full border border-white/20 bg-night-900/48 px-3 py-1 text-xs text-white"
                  value={user.status}
                  onChange={(event) => updateUserStatus(user.id, event.target.value)}
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PENDING">Pending</option>
                  <option value="SUSPENDED">Suspended</option>
                </select>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "properties" && (
        <section className="glass-card space-y-3 p-4">
          {propertiesStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando publicaciónes...</div>
          )}
          {propertiesStatus === "error" && (
            <div className="text-xs text-[#AF8C5C]">{propertiesError}</div>
          )}
          {properties.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs"
            >
              <div>
                <div className="text-sm text-white">{item.title}</div>
                <div className="text-[#D1C7BD]">
                  {item.operationType} - {item.propertyType} - {item.priceCurrency} {item.priceAmount}
                </div>
                <div className="text-[#D1C7BD]">
                  {item.location?.addressLine} {item.location?.locality?.name ? `- ${item.location.locality.name}` : ""}
                </div>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[#E7E2DD]">
                {item.status}
              </span>
              <select
                className="rounded-full border border-white/20 bg-night-900/48 px-3 py-1 text-xs text-white"
                value={item.status}
                onChange={(event) => updatePropertyStatus(item.id, event.target.value)}
              >
                <option value="ACTIVE">Active</option>
                <option value="PAUSED">Paused</option>
                <option value="SOLD">Sold</option>
                <option value="RENTED">Rented</option>
                <option value="TEMPORARILY_UNAVAILABLE">No disponible</option>
              </select>
            </div>
          ))}
        </section>
      )}

      {tab === "reports" && (
        <section className="glass-card space-y-3 p-4">
          {reportsStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando reportes...</div>
          )}
          {reportsStatus === "error" && (
            <div className="text-xs text-[#AF8C5C]">{reportsError}</div>
          )}
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs"
            >
              <div className="text-sm text-white">
                {report.type === "USER"
                  ? `Usuario: ${report.reportedUser?.name ?? report.reportedUser?.email ?? "N/A"}`
                  : report.property?.title ?? "Publicación"}
              </div>
              <div className="text-[#D1C7BD]">{report.reason}</div>
              <div className="text-[#D1C7BD]">
                {report.type === "USER" ? "Reporte de usuario" : "Reporte de publicación"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[#E7E2DD]">
                  {report.status}
                </span>
                <span className="text-[#D1C7BD]">
                  Reportado por {report.reporter?.email ?? "Anónimo"}
                </span>
                <select
                  className="rounded-full border border-white/20 bg-night-900/48 px-3 py-1 text-xs text-white"
                  value={report.status}
                  onChange={(event) =>
                    updateReportStatus(report.id, event.target.value, report.type)
                  }
                >
                  <option value="OPEN">Open</option>
                  <option value="REVIEWED">Reviewed</option>
                  <option value="DISMISSED">Dismissed</option>
                </select>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "verifications" && (
        <section className="glass-card space-y-3 p-4">
          {verificationsStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando verificaciones...</div>
          )}
          {verificationsStatus === "error" && (
            <div className="text-xs text-[#AF8C5C]">{verificationsError}</div>
          )}
          {verifications.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs"
            >
              <div className="text-sm text-white">
                {(item.user.name ?? item.user.email ?? "Usuario")} - {item.type}
              </div>
              <div className="text-[#D1C7BD]">Estado: {item.status}</div>
              <div className="mt-2 text-[#D1C7BD]">
                Datos: {JSON.stringify(item.payload)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  className="rounded-full border border-white/20 bg-night-900/48 px-3 py-1 text-xs text-white"
                  value={item.status}
                  onChange={(event) => updateVerificationStatus(item.id, event.target.value)}
                >
                  <option value="PENDING">Pending</option>
                  <option value="APPROVED">Approved</option>
                  <option value="REJECTED">Rejected</option>
                </select>
              </div>
            </div>
          ))}
        </section>
      )}

      {tab === "pois" && (
        <section className="glass-card space-y-4 p-4">
          <div className="space-y-1">
            <h3 className="text-sm text-white">Cargar puntos de interes</h3>
            <p className="text-xs text-[#D1C7BD]">
              Estos puntos se muestran en el mapa cuando el usuario activa los filtros.
            </p>
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Titulo
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={poiTitle}
                onChange={(event) => setPoiTitle(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Categoria
              <select
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={poiCategory}
                onChange={(event) => setPoiCategory(event.target.value as PoiCategory)}
              >
                {Object.keys(poiCategoryLabels).map((key) => (
                  <option key={key} value={key}>
                    {poiCategoryLabels[key as PoiCategory]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Latitud
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={poiLat}
                onChange={(event) => setPoiLat(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Longitud
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={poiLng}
                onChange={(event) => setPoiLng(event.target.value)}
              />
            </label>
            <div className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span>Selecciona el punto en el mapa</span>
                {poiLat && poiLng && (
                  <span className="text-[11px] text-[#E7E2DD]">
                    {Number(poiLat).toFixed(5)}, {Number(poiLng).toFixed(5)}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap items-end gap-2">
                <label className="flex-1 space-y-1 text-[11px] text-[#D1C7BD]">
                  Buscar dirección
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                    value={poiSearch}
                    onChange={(event) => setPoiSearch(event.target.value)}
                    placeholder="Ej: Rivadavia 123, Bragado"
                  />
                </label>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-3 py-2 text-xs text-[#E7E2DD]"
                  onClick={async () => {
                    const query = poiSearch.trim();
                    if (!query) {
                      setPoiSearchStatus("error");
                      setPoiSearchMessage("Ingresá una dirección.");
                      return;
                    }
                    setPoiSearchStatus("loading");
                    setPoiSearchMessage("");
                    try {
                      const result = await geocodeAddress(query);
                      if (!result) {
                        setPoiSearchStatus("error");
                        setPoiSearchMessage("No encontramos esa dirección.");
                        return;
                      }
                      setPoiLat(String(result.lat));
                      setPoiLng(String(result.lng));
                      setPoiSearchStatus("idle");
                      setPoiSearchMessage(`Encontrado: ${result.displayName}`);
                    } catch (error) {
                      setPoiSearchStatus("error");
                      setPoiSearchMessage(
                        error instanceof Error
                          ? error.message
                          : "No pudimos buscar la dirección."
                      );
                    }
                  }}
                  disabled={poiSearchStatus === "loading"}
                >
                  {poiSearchStatus === "loading" ? "Buscando..." : "Buscar"}
                </button>
              </div>
              {poiSearchMessage && (
                <div
                  className={`text-[11px] ${
                    poiSearchStatus === "error" ? "text-[#AF8C5C]" : "text-[#D1C7BD]"
                  }`}
                >
                  {poiSearchMessage}
                </div>
              )}
              <PoiLocationPicker
                lat={poiLat ? Number(poiLat) : undefined}
                lng={poiLng ? Number(poiLng) : undefined}
                onChange={(nextLat, nextLng) => {
                  setPoiLat(String(nextLat));
                  setPoiLng(String(nextLng));
                }}
              />
            </div>
            <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
              Direccion (opcional)
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={poiAddress}
                onChange={(event) => setPoiAddress(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
              Descripcion (opcional)
              <textarea
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={poiDescription}
                onChange={(event) => setPoiDescription(event.target.value)}
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
              onClick={createPoi}
              disabled={poiSaving}
            >
              {poiSaving ? "Guardando..." : "Agregar punto"}
            </button>
            {poisError && <span className="text-xs text-[#AF8C5C]">{poisError}</span>}
          </div>

          <div className="space-y-3">
            <div className="text-xs text-[#D1C7BD]">Listado</div>
            {poisStatus === "loading" && (
              <div className="text-xs text-[#D1C7BD]">Cargando puntos...</div>
            )}
            {poisStatus === "error" && (
              <div className="text-xs text-[#AF8C5C]">{poisError}</div>
            )}
            {pois.map((poi) => (
              <div
                key={poi.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs"
              >
                <div>
                  <div className="text-sm text-white">{poi.title}</div>
                  <div className="text-[#D1C7BD]">
                    {poiCategoryLabels[poi.category]} - {poi.lat.toFixed(5)}, {poi.lng.toFixed(5)}
                  </div>
                  {poi.address && <div className="text-[#D1C7BD]">{poi.address}</div>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[#E7E2DD]">
                    {poi.isActive ? "Activo" : "Inactivo"}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                    onClick={() => updatePoiStatus(poi.id, !poi.isActive)}
                  >
                    {poi.isActive ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-400/40 px-3 py-1 text-xs text-rose-200"
                    onClick={() => deletePoi(poi.id)}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "ads" && (
        <section className="glass-card space-y-4 p-4">
          <div className="space-y-1">
            <h3 className="text-sm text-white">Publicidad</h3>
            <p className="text-xs text-[#D1C7BD]">
              Las cards publicitarias se muestran entre los inmuebles.
            </p>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Titulo
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={adTitle}
                onChange={(event) => setAdTitle(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Prioridad (mayor primero)
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={adPriority}
                onChange={(event) => setAdPriority(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
              Texto
              <textarea
                rows={3}
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={adBody}
                onChange={(event) => setAdBody(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
              Imagen (URL)
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={adImageUrl}
                onChange={(event) => setAdImageUrl(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
              Link de destino
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={adLinkUrl}
                onChange={(event) => setAdLinkUrl(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#D1C7BD]">
              Texto boton
              <input
                className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                value={adCtaText}
                onChange={(event) => setAdCtaText(event.target.value)}
                placeholder="Visitar"
              />
            </label>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
              onClick={createAd}
              disabled={adSaving}
            >
              {adSaving ? "Guardando..." : "Agregar publicidad"}
            </button>
            {adsError && <span className="text-xs text-[#AF8C5C]">{adsError}</span>}
          </div>

          <div className="space-y-3">
            <div className="text-xs text-[#D1C7BD]">Listado</div>
            {adsStatus === "loading" && (
              <div className="text-xs text-[#D1C7BD]">Cargando publicidad...</div>
            )}
            {adsStatus === "error" && (
              <div className="text-xs text-[#AF8C5C]">{adsError}</div>
            )}
            {ads.map((ad) => (
              <div
                key={ad.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs"
              >
                <div>
                  <div className="text-sm text-white">{ad.title}</div>
                  <div className="text-[#D1C7BD]">
                    Prioridad {ad.priority} {ad.linkUrl ? `- ${ad.linkUrl}` : ""}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-white/10 px-3 py-1 text-[#E7E2DD]">
                    {ad.isActive ? "Activo" : "Inactivo"}
                  </span>
                  <button
                    type="button"
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                    onClick={() => updateAdStatus(ad.id, !ad.isActive)}
                  >
                    {ad.isActive ? "Desactivar" : "Activar"}
                  </button>
                  <button
                    type="button"
                    className="rounded-full border border-rose-400/40 px-3 py-1 text-xs text-rose-200"
                    onClick={() => deleteAd(ad.id)}
                  >
                    Borrar
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}



