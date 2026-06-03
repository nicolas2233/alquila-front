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
    baseMaxProperties?: number;
    adminGrantedExtraProperties?: number;
    adminGrantedUntil?: string | null;
    isAdminGrantActive?: boolean;
    priceAmount: number;
    priceCurrency: string;
    status?: string;
    trialEndsAt?: string | null;
    isTrialActive: boolean;
    trialDaysRemaining: number;
  } | null;
  agencyId?: string | null;
  properties?: Array<{
    id: string;
    title: string;
    status: string;
    operationType: string;
    propertyType: string;
    updatedAt: string;
  }>;
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
  featured?: boolean;
  featuredUntil?: string | null;
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

type AdminBetaInvite = {
  id: string;
  token: string;
  label?: string | null;
  targetRole: string;
  usedCount: number;
  maxUses?: number | null;
  isActive: boolean;
  createdAt: string;
};

type AdminBetaFeedback = {
  id: string;
  title: string;
  body: string;
  category: string;
  status: string;
  createdAt: string;
  inviteToken?: string | null;
  user: { id: string; name?: string | null; email?: string | null; role: string };
};

type TabKey =
  | "overview"
  | "users"
  | "plans"
  | "properties"
  | "reports"
  | "verifications"
  | "pois"
  | "ads"
  | "beta";

const poiCategoryLabels: Record<PoiCategory, string> = {
  SCHOOL: "Escuela",
  KINDER: "Jardín",
  FIRE: "Bomberos",
  POLICE: "Policía",
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

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const pages = Math.ceil(total / pageSize);
  if (pages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-3 text-xs">
      <button
        type="button"
        disabled={page === 1}
        onClick={() => onChange(page - 1)}
        className="rounded-full border border-white/20 px-3 py-1 text-[#E7E2DD] disabled:opacity-40"
      >
        ← Anterior
      </button>
      <span className="text-[#9f988d]">
        {page} / {pages} &middot; {total} total
      </span>
      <button
        type="button"
        disabled={page >= pages}
        onClick={() => onChange(page + 1)}
        className="rounded-full border border-white/20 px-3 py-1 text-[#E7E2DD] disabled:opacity-40"
      >
        Siguiente →
      </button>
    </div>
  );
}

function VerificationPayload({ payload }: { payload: Record<string, unknown> }) {
  const labels: Record<string, string> = {
    firstName: "Nombre",
    lastName: "Apellido",
    birthDate: "Fecha nac.",
    dni: "DNI / CUIT",
    phone: "Teléfono",
    email: "Email",
    company: "Empresa",
    address: "Dirección",
    type: "Tipo",
  };
  const entries = Object.entries(payload);
  if (entries.length === 0) return <span className="text-[#9f988d]">Sin datos</span>;
  return (
    <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
      {entries.map(([key, value]) => (
        <>
          <span key={`${key}-k`} className="shrink-0 text-[#9f988d]">{labels[key] ?? key}</span>
          <span key={`${key}-v`} className="break-all text-[#E7E2DD]">{String(value ?? "—")}</span>
        </>
      ))}
    </div>
  );
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
  const [userSearch, setUserSearch] = useState("");
  const [userGrantSavingId, setUserGrantSavingId] = useState<string | null>(null);
  const [userGrantDrafts, setUserGrantDrafts] = useState<
    Record<string, { planInternalCode: string; freeMonths: string; extraProperties: string }>
  >({});

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
  const [featuredSavingId, setFeaturedSavingId] = useState<string | null>(null);

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

  // Pagination / search
  const [userPage, setUserPage] = useState(1);
  const [userTotal, setUserTotal] = useState(0);
  const [userSearchCommitted, setUserSearchCommitted] = useState("");

  const [propertiesPage, setPropertiesPage] = useState(1);
  const [propertiesTotal, setPropertiesTotal] = useState(0);
  const [propertiesStatusFilter, setPropertiesStatusFilter] = useState("");

  const [verificationsPage, setVerificationsPage] = useState(1);
  const [verificationsTotal, setVerificationsTotal] = useState(0);
  const [verificationsStatusFilter, setVerificationsStatusFilter] = useState("");

  // Beta invites + feedback
  const [betaInvites, setBetaInvites] = useState<AdminBetaInvite[]>([]);
  const [betaInvitesStatus, setBetaInvitesStatus] = useState<"idle" | "loading" | "error">("idle");
  const [betaInviteLabel, setBetaInviteLabel] = useState("");
  const [betaInviteRole, setBetaInviteRole] = useState<"OWNER" | "AGENCY">("OWNER");
  const [betaInviteMaxUses, setBetaInviteMaxUses] = useState("");
  const [betaInviteSaving, setBetaInviteSaving] = useState(false);

  const [betaFeedbackList, setBetaFeedbackList] = useState<AdminBetaFeedback[]>([]);
  const [betaFeedbackStatus, setBetaFeedbackStatus] = useState<"idle" | "loading" | "error">("idle");
  const [betaFeedbackTotal, setBetaFeedbackTotal] = useState(0);
  const [betaFeedbackPage, setBetaFeedbackPage] = useState(1);
  const [betaFeedbackStatusFilter, setBetaFeedbackStatusFilter] = useState("");

  // Ads edit
  const [adEditId, setAdEditId] = useState<string | null>(null);
  const [adEditDraft, setAdEditDraft] = useState({
    title: "", body: "", imageUrl: "", linkUrl: "", ctaText: "", priority: "0",
  });
  const [adEditSaving, setAdEditSaving] = useState(false);

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
    const params = new URLSearchParams();
    if (userSearchCommitted.trim()) params.set("q", userSearchCommitted.trim());
    params.set("page", String(userPage));
    params.set("pageSize", "15");
    fetch(`${env.apiUrl}/admin/users?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar usuarios."));
        }
        return response.json() as Promise<{ items: AdminUser[]; total: number }>;
      })
      .then((data) => {
        setUsers(data.items ?? []);
        setUserTotal(data.total ?? 0);
        setUsersStatus("idle");
      })
      .catch((error) => {
        setUsersStatus("error");
        setUsersError(error instanceof Error ? error.message : "Error al cargar usuarios.");
      });
  }, [token, effectiveRole, tab, userPage, userSearchCommitted]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "verifications") return;
    setVerificationsStatus("loading");
    setVerificationsError("");
    const params = new URLSearchParams();
    params.set("page", String(verificationsPage));
    params.set("pageSize", "15");
    if (verificationsStatusFilter) params.set("status", verificationsStatusFilter);
    fetch(`${env.apiUrl}/admin/verifications?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar verificaciones."));
        }
        return response.json() as Promise<{ items: AdminVerification[]; total: number }>;
      })
      .then((data) => {
        setVerifications(data.items ?? []);
        setVerificationsTotal(data.total ?? 0);
        setVerificationsStatus("idle");
      })
      .catch((error) => {
        setVerificationsStatus("error");
        setVerificationsError(
          error instanceof Error ? error.message : "Error al cargar verificaciones."
        );
      });
  }, [token, effectiveRole, tab, verificationsPage, verificationsStatusFilter]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "properties") return;
    setPropertiesStatus("loading");
    setPropertiesError("");
    const params = new URLSearchParams();
    params.set("page", String(propertiesPage));
    params.set("pageSize", "20");
    if (propertiesStatusFilter) params.set("status", propertiesStatusFilter);
    fetch(`${env.apiUrl}/admin/properties?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error(await readApiError(response, "No pudimos cargar publicaciones."));
        }
        return response.json() as Promise<{ items: AdminProperty[]; total: number }>;
      })
      .then((data) => {
        setProperties(data.items ?? []);
        setPropertiesTotal(data.total ?? 0);
        setPropertiesStatus("idle");
      })
      .catch((error) => {
        setPropertiesStatus("error");
        setPropertiesError(
          error instanceof Error ? error.message : "Error al cargar publicaciónes."
        );
      });
  }, [token, effectiveRole, tab, propertiesPage, propertiesStatusFilter]);

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
  }, [token, effectiveRole, tab, userSearch]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "plans" && tab !== "users") return;
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
    if (tab !== "beta") return;
    setBetaInvitesStatus("loading");
    fetch(`${env.apiUrl}/admin/beta-invites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(await readApiError(r, "Error al cargar invitaciones."));
        return r.json() as Promise<{ items: AdminBetaInvite[] }>;
      })
      .then((data) => {
        setBetaInvites(data.items ?? []);
        setBetaInvitesStatus("idle");
      })
      .catch(() => setBetaInvitesStatus("error"));
  }, [token, effectiveRole, tab]);

  useEffect(() => {
    if (!token || effectiveRole !== "ADMIN") return;
    if (tab !== "beta") return;
    setBetaFeedbackStatus("loading");
    const params = new URLSearchParams();
    params.set("page", String(betaFeedbackPage));
    params.set("pageSize", "20");
    if (betaFeedbackStatusFilter) params.set("status", betaFeedbackStatusFilter);
    fetch(`${env.apiUrl}/admin/beta-feedback?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (r) => {
        if (!r.ok) throw new Error(await readApiError(r, "Error al cargar observaciones."));
        return r.json() as Promise<{ items: AdminBetaFeedback[]; total: number }>;
      })
      .then((data) => {
        setBetaFeedbackList(data.items ?? []);
        setBetaFeedbackTotal(data.total ?? 0);
        setBetaFeedbackStatus("idle");
      })
      .catch(() => setBetaFeedbackStatus("error"));
  }, [token, effectiveRole, tab, betaFeedbackPage, betaFeedbackStatusFilter]);

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

  const updateUserGrantDraft = (
    userId: string,
    field: "planInternalCode" | "freeMonths" | "extraProperties",
    value: string
  ) => {
    setUserGrantDrafts((prev) => ({
      ...prev,
      [userId]: {
        planInternalCode: prev[userId]?.planInternalCode ?? "",
        freeMonths: prev[userId]?.freeMonths ?? "0",
        extraProperties: prev[userId]?.extraProperties ?? "0",
        [field]: value,
      },
    }));
  };

  const saveUserGrant = async (user: AdminUser) => {
    if (!token) return;
    const draft = userGrantDrafts[user.id] ?? {
      planInternalCode: "",
      freeMonths: "0",
      extraProperties: String(user.subscription?.adminGrantedExtraProperties ?? 0),
    };
    setUserGrantSavingId(user.id);
    setUsersError("");
    try {
      const response = await fetch(`${env.apiUrl}/admin/users/${user.id}/subscription-grant`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          planInternalCode: draft.planInternalCode || undefined,
          freeMonths: Number(draft.freeMonths) || 0,
          extraProperties: Number(draft.extraProperties) || 0,
        }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response, "No pudimos aplicar el beneficio."));
      }
      const data = (await response.json()) as { subscription: AdminUser["subscription"] };
      setUsers((prev) =>
        prev.map((item) => (item.id === user.id ? { ...item, subscription: data.subscription } : item))
      );
      setUserGrantDrafts((prev) => ({
        ...prev,
        [user.id]: {
          planInternalCode: "",
          freeMonths: "0",
          extraProperties: String(data.subscription?.adminGrantedExtraProperties ?? 0),
        },
      }));
      addToast("Beneficio aplicado al usuario.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error al aplicar beneficio.";
      setUsersError(message);
      addToast(message, "error");
    } finally {
      setUserGrantSavingId(null);
    }
  };

  const toggleFeatured = async (property: AdminProperty, days?: number) => {
    if (!token) return;
    setFeaturedSavingId(property.id);
    try {
      const nextFeatured = !property.featured;
      const response = await fetch(`${env.apiUrl}/admin/properties/${property.id}/featured`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ featured: nextFeatured, featuredDays: nextFeatured ? (days ?? 30) : undefined }),
      });
      if (!response.ok) throw new Error("No pudimos actualizar el estado.");
      const data = (await response.json()) as { featured: boolean; featuredUntil?: string | null };
      setProperties((prev) =>
        prev.map((item) =>
          item.id === property.id ? { ...item, featured: data.featured, featuredUntil: data.featuredUntil ?? null } : item
        )
      );
      addToast(nextFeatured ? "Propiedad destacada." : "Destaque removido.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Error al actualizar.", "error");
    } finally {
      setFeaturedSavingId(null);
    }
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
      const message = await readApiError(response, "No pudimos actualizar la publicación.");
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
      const message = await readApiError(response, "No pudimos actualizar la verificación.");
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

  const createBetaInvite = async () => {
    if (!token) return;
    setBetaInviteSaving(true);
    try {
      const response = await fetch(`${env.apiUrl}/admin/beta-invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          label: betaInviteLabel.trim() || undefined,
          targetRole: betaInviteRole,
          maxUses: betaInviteMaxUses ? Number(betaInviteMaxUses) : undefined,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "Error al crear invitación."));
      const created = (await response.json()) as AdminBetaInvite;
      setBetaInvites((prev) => [created, ...prev]);
      setBetaInviteLabel("");
      setBetaInviteMaxUses("");
      addToast("Invitación creada.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Error al crear.", "error");
    } finally {
      setBetaInviteSaving(false);
    }
  };

  const toggleBetaInvite = async (invite: AdminBetaInvite) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/beta-invites/${invite.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ isActive: !invite.isActive }),
    });
    if (!response.ok) return;
    const updated = (await response.json()) as AdminBetaInvite;
    setBetaInvites((prev) => prev.map((item) => (item.id === invite.id ? updated : item)));
  };

  const deleteBetaInvite = async (id: string) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/beta-invites/${id}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) return;
    setBetaInvites((prev) => prev.filter((item) => item.id !== id));
    addToast("Invitación eliminada.", "success");
  };

  const updateBetaFeedbackStatus = async (id: string, status: string) => {
    if (!token) return;
    const response = await fetch(`${env.apiUrl}/admin/beta-feedback/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ status }),
    });
    if (!response.ok) return;
    setBetaFeedbackList((prev) => prev.map((item) => (item.id === id ? { ...item, status } : item)));
  };

  const startEditAd = (ad: AdminAd) => {
    setAdEditId(ad.id);
    setAdEditDraft({
      title: ad.title,
      body: ad.body ?? "",
      imageUrl: ad.imageUrl ?? "",
      linkUrl: ad.linkUrl ?? "",
      ctaText: ad.ctaText ?? "",
      priority: String(ad.priority),
    });
  };

  const saveEditAd = async () => {
    if (!token || !adEditId) return;
    setAdEditSaving(true);
    try {
      const response = await fetch(`${env.apiUrl}/admin/ads/${adEditId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title: adEditDraft.title.trim(),
          body: adEditDraft.body || undefined,
          imageUrl: adEditDraft.imageUrl || undefined,
          linkUrl: adEditDraft.linkUrl || undefined,
          ctaText: adEditDraft.ctaText || undefined,
          priority: Number(adEditDraft.priority) || 0,
        }),
      });
      if (!response.ok) throw new Error(await readApiError(response, "No pudimos actualizar la publicidad."));
      const updated = (await response.json()) as AdminAd;
      setAds((prev) => prev.map((ad) => (ad.id === adEditId ? { ...ad, ...updated } : ad)));
      setAdEditId(null);
      addToast("Publicidad actualizada.", "success");
    } catch (error) {
      addToast(error instanceof Error ? error.message : "Error al actualizar.", "error");
    } finally {
      setAdEditSaving(false);
    }
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
          <button
            type="button"
            className={
              tab === "beta"
                ? "rounded-full border border-gold-500/40 bg-night-900/48 px-3 py-1 text-gold-300"
                : "rounded-full border border-gold-500/20 bg-gold-500/8 px-3 py-1 text-gold-400"
            }
            onClick={() => setTab("beta")}
          >
            ✦ Beta
          </button>
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
            <h3 className="text-sm text-white">Planes de suscripción</h3>
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
                        {plan.updatedAt && plan.updatedAt !== plan.createdAt
                          ? `Actualizado ${formatShortDateTime(plan.updatedAt)}`
                          : `Creado ${formatShortDateTime(plan.createdAt)}`}
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Usuarios</h3>
              <p className="text-xs text-[#D1C7BD]">
                Buscá, revisá publicaciones y aplicá beneficios comerciales manuales.
              </p>
            </div>
            <div className="w-full space-y-1 sm:max-w-sm">
              <span className="text-xs text-[#D1C7BD]">Buscar usuario</span>
              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
                  value={userSearch}
                  onChange={(event) => setUserSearch(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter") {
                      setUserSearchCommitted(userSearch);
                      setUserPage(1);
                    }
                  }}
                  placeholder="Nombre, email o teléfono"
                />
                <button
                  type="button"
                  onClick={() => { setUserSearchCommitted(userSearch); setUserPage(1); }}
                  className="rounded-xl border border-white/20 px-4 py-2 text-xs text-[#E7E2DD] hover:border-white/40"
                >
                  Buscar
                </button>
              </div>
            </div>
          </div>
          {usersStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando usuarios...</div>
          )}
          {usersStatus === "error" && (
            <div className="text-xs text-[#AF8C5C]">{usersError}</div>
          )}
          {userTotal > 0 && (
            <div className="text-right text-[11px] text-[#9f988d]">{userTotal} usuario{userTotal !== 1 ? "s" : ""} encontrado{userTotal !== 1 ? "s" : ""}</div>
          )}
          {usersStatus === "idle" && users.length === 0 && (
            <div className="text-xs text-[#9f988d]">No se encontraron usuarios.</div>
          )}
          {users.map((user) => (
            <div
              key={user.id}
              className="grid gap-3 rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs lg:grid-cols-[1.1fr_0.9fr]"
            >
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-white">{user.name ?? "Sin nombre"}</span>
                  <span className="rounded-full border border-white/10 bg-night-900/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em] text-[#9f988d]">{user.role}</span>
                </div>
                <div className="text-[#D1C7BD]">{user.email}</div>
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
                      {(user.subscription.adminGrantedExtraProperties ?? 0) > 0 && (
                        <span className="text-emerald-200">
                          +{user.subscription.adminGrantedExtraProperties} extra
                        </span>
                      )}
                    </div>
                    <div className="mt-1 text-[#cfc7ba]">
                      {user.subscription.isAdminGrantActive && user.subscription.adminGrantedUntil
                        ? `Beneficio admin activo hasta ${formatShortDateTime(user.subscription.adminGrantedUntil)}`
                        : user.subscription.isTrialActive
                        ? `Primer mes gratis activo · ${user.subscription.trialDaysRemaining} días restantes`
                        : user.subscription.trialEndsAt
                        ? `Trial finalizado · venció ${formatShortDateTime(user.subscription.trialEndsAt)}`
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
              <div className="space-y-3">
                <div className="flex flex-wrap items-center justify-end gap-2">
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
                {(user.role === "OWNER" || user.role === "AGENCY_ADMIN" || user.role === "AGENCY_AGENT") && (
                  <div className="rounded-2xl border border-gold-500/25 bg-gold-500/5 p-3">
                    <div className="flex items-center gap-2">
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4 shrink-0 text-gold-300"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-300">
                        Acceso Premium Gratuito
                      </p>
                    </div>
                    <p className="mt-1.5 text-[11px] leading-relaxed text-[#D1C7BD]">
                      Otorgá acceso premium sin tarjeta de crédito. El usuario podrá publicar inmuebles durante los meses que definas, sin necesidad de cargar un medio de pago.
                    </p>
                    {user.subscription?.isAdminGrantActive && user.subscription.adminGrantedUntil && (
                      <div className="mt-2 flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-400/10 px-3 py-2">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-3.5 w-3.5 shrink-0 text-emerald-400"><path d="M9 12l2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>
                        <span className="text-[11px] text-emerald-300">
                          Acceso activo hasta {new Date(user.subscription.adminGrantedUntil).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })}
                        </span>
                      </div>
                    )}
                    <div className="mt-3 grid gap-2 sm:grid-cols-3">
                      <label className="space-y-1 text-[11px] text-[#D1C7BD] sm:col-span-3">
                        Plan a otorgar (sin tarjeta)
                        <select
                          className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
                          value={userGrantDrafts[user.id]?.planInternalCode ?? ""}
                          onChange={(event) =>
                            updateUserGrantDraft(user.id, "planInternalCode", event.target.value)
                          }
                        >
                          <option value="">Mantener plan actual ({user.subscription?.planCode ?? "FREE"})</option>
                          {plans
                            .filter((plan) =>
                              user.role === "OWNER"
                                ? plan.code.startsWith("OWNER_")
                                : plan.code.startsWith("AGENCY_"),
                            )
                            .map((plan) => (
                              <option key={plan.id} value={plan.code}>
                                {plan.name} · {plan.maxProperties} inmuebles
                              </option>
                            ))}
                        </select>
                      </label>
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Meses gratuitos
                        <input
                          type="number"
                          min={0}
                          max={24}
                          placeholder="0"
                          className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
                          value={userGrantDrafts[user.id]?.freeMonths ?? "0"}
                          onChange={(event) =>
                            updateUserGrantDraft(user.id, "freeMonths", event.target.value)
                          }
                        />
                      </label>
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Publicaciones extra
                        <input
                          type="number"
                          min={0}
                          max={500}
                          className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
                          value={
                            userGrantDrafts[user.id]?.extraProperties ??
                            String(user.subscription?.adminGrantedExtraProperties ?? 0)
                          }
                          onChange={(event) =>
                            updateUserGrantDraft(user.id, "extraProperties", event.target.value)
                          }
                        />
                      </label>
                      <button
                        type="button"
                        className="self-end rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900 disabled:opacity-70"
                        disabled={userGrantSavingId === user.id}
                        onClick={() => void saveUserGrant(user)}
                      >
                        {userGrantSavingId === user.id ? "Aplicando..." : "Otorgar acceso"}
                      </button>
                    </div>
                  </div>
                )}
                <div className="rounded-2xl border border-white/10 bg-night-950/35 p-3">
                  <p className="text-[11px] uppercase tracking-[0.14em] text-[#AF8C5C]">
                    Inmuebles cargados
                  </p>
                  {user.properties?.length ? (
                    <div className="mt-2 space-y-2">
                      {user.properties.map((property) => (
                        <div
                          key={property.id}
                          className="rounded-xl border border-white/10 bg-night-900/45 px-3 py-2"
                        >
                          <div className="text-xs text-white">{property.title}</div>
                          <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[#D1C7BD]">
                            <span>{property.status}</span>
                            <span>{property.operationType}</span>
                            <span>{formatShortDateTime(property.updatedAt)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="mt-2 text-[11px] text-[#D1C7BD]">Sin inmuebles cargados.</p>
                  )}
                </div>
              </div>
            </div>
          ))}
          <Pagination page={userPage} total={userTotal} pageSize={15} onChange={(p) => setUserPage(p)} />
        </section>
      )}

      {tab === "properties" && (
        <section className="glass-card space-y-3 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Publicaciones</h3>
              {propertiesTotal > 0 && (
                <p className="text-xs text-[#9f988d]">{propertiesTotal} publicaciones en total</p>
              )}
            </div>
            <select
              value={propertiesStatusFilter}
              onChange={(event) => { setPropertiesStatusFilter(event.target.value); setPropertiesPage(1); }}
              className="rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
            >
              <option value="">Todos los estados</option>
              <option value="ACTIVE">Activo</option>
              <option value="PAUSED">Pausado</option>
              <option value="DRAFT">Borrador</option>
              <option value="SOLD">Vendido</option>
              <option value="RENTED">Alquilado</option>
              <option value="TEMPORARILY_UNAVAILABLE">No disponible</option>
            </select>
          </div>
          {propertiesStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando publicaciónes...</div>
          )}
          {propertiesStatus === "error" && (
            <div className="text-xs text-[#AF8C5C]">{propertiesError}</div>
          )}
          {propertiesStatus === "idle" && properties.length === 0 && (
            <div className="text-xs text-[#9f988d]">No hay publicaciones con ese filtro.</div>
          )}
          {properties.map((item) => (
            <div
              key={item.id}
              className={`flex flex-wrap items-center justify-between gap-3 rounded-2xl border p-3 text-xs ${item.featured ? "border-gold-500/40 bg-gold-500/5" : "border-white/10 bg-night-900/48"}`}
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {item.featured && (
                    <span className="flex items-center gap-1 rounded-full border border-gold-400/50 bg-gold-400/10 px-2 py-0.5 text-[10px] font-semibold text-gold-300">
                      <svg viewBox="0 0 24 24" fill="currentColor" className="h-2.5 w-2.5"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                      Destacado{item.featuredUntil ? ` hasta ${new Date(item.featuredUntil).toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit" })}` : ""}
                    </span>
                  )}
                  <div className="text-sm text-white">{item.title}</div>
                </div>
                <div className="text-[#D1C7BD]">
                  {item.operationType} - {item.propertyType} - {item.priceCurrency} {item.priceAmount}
                </div>
                <div className="text-[#D1C7BD]">
                  {item.location?.addressLine} {item.location?.locality?.name ? `- ${item.location.locality.name}` : ""}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  disabled={featuredSavingId === item.id}
                  onClick={() => void toggleFeatured(item, 30)}
                  className={`rounded-full border px-3 py-1 text-[11px] font-semibold transition disabled:opacity-60 ${item.featured ? "border-gold-400/50 bg-gold-400/15 text-gold-300 hover:bg-gold-400/25" : "border-white/20 bg-white/5 text-[#D1C7BD] hover:border-gold-400/40 hover:text-gold-300"}`}
                >
                  {featuredSavingId === item.id ? "..." : item.featured ? "Quitar destaque" : "Destacar (30d)"}
                </button>
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
            </div>
          ))}
          <Pagination page={propertiesPage} total={propertiesTotal} pageSize={20} onChange={(p) => setPropertiesPage(p)} />
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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">Verificaciones</h3>
              {verificationsTotal > 0 && (
                <p className="text-xs text-[#9f988d]">{verificationsTotal} en total</p>
              )}
            </div>
            <select
              value={verificationsStatusFilter}
              onChange={(event) => { setVerificationsStatusFilter(event.target.value); setVerificationsPage(1); }}
              className="rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
            >
              <option value="">Todos los estados</option>
              <option value="PENDING">Pendiente</option>
              <option value="APPROVED">Aprobado</option>
              <option value="REJECTED">Rechazado</option>
            </select>
          </div>
          {verificationsStatus === "loading" && (
            <div className="text-xs text-[#D1C7BD]">Cargando verificaciones...</div>
          )}
          {verificationsStatus === "error" && (
            <div className="text-xs text-[#AF8C5C]">{verificationsError}</div>
          )}
          {verificationsStatus === "idle" && verifications.length === 0 && (
            <div className="text-xs text-[#9f988d]">No hay verificaciones con ese filtro.</div>
          )}
          {verifications.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-night-900/48 p-3 text-xs"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="text-sm font-medium text-white">
                    {item.user.name ?? item.user.email ?? "Usuario"}
                  </div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2 text-[11px] text-[#D1C7BD]">
                    <span>{item.user.email}</span>
                    <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] uppercase tracking-[0.1em]">{item.type}</span>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.1em] ${item.status === "APPROVED" ? "bg-emerald-500/15 text-emerald-300" : item.status === "REJECTED" ? "bg-rose-500/15 text-rose-300" : "bg-gold-500/15 text-gold-300"}`}>
                      {item.status === "PENDING" ? "Pendiente" : item.status === "APPROVED" ? "Aprobado" : "Rechazado"}
                    </span>
                    <span className="text-[#9f988d]">{formatShortDateTime(item.createdAt)}</span>
                  </div>
                </div>
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
              <div className="mt-3 rounded-xl border border-white/8 bg-night-900/30 px-3 py-2.5 text-[11px]">
                <VerificationPayload payload={item.payload} />
              </div>
            </div>
          ))}
          <Pagination page={verificationsPage} total={verificationsTotal} pageSize={15} onChange={(p) => setVerificationsPage(p)} />
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
              Administrá las cards patrocinadas que aparecen en el mapa, listados y la home. Mayor prioridad = aparece primero.
            </p>
          </div>

          {/* New ad form */}
          <div className="rounded-2xl border border-gold-500/20 bg-gold-500/5 p-4">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-300">Nueva publicidad</p>
            <div className="grid gap-3 md:grid-cols-2">
              <label className="space-y-1.5 text-xs text-[#D1C7BD]">
                Título *
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={adTitle}
                  onChange={(event) => setAdTitle(event.target.value)}
                  placeholder="Ej: Inmobiliaria Central"
                />
              </label>
              <label className="space-y-1.5 text-xs text-[#D1C7BD]">
                Prioridad (mayor = primero)
                <input
                  type="number"
                  min={0}
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={adPriority}
                  onChange={(event) => setAdPriority(event.target.value)}
                />
              </label>
              <label className="space-y-1.5 text-xs text-[#D1C7BD] md:col-span-2">
                Descripción
                <textarea
                  rows={2}
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={adBody}
                  onChange={(event) => setAdBody(event.target.value)}
                  placeholder="Texto breve del anuncio"
                />
              </label>
              <label className="space-y-1.5 text-xs text-[#D1C7BD]">
                Imagen (URL)
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={adImageUrl}
                  onChange={(event) => setAdImageUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
              <label className="space-y-1.5 text-xs text-[#D1C7BD]">
                Texto del botón
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={adCtaText}
                  onChange={(event) => setAdCtaText(event.target.value)}
                  placeholder="Visitar"
                />
              </label>
              <label className="space-y-1.5 text-xs text-[#D1C7BD] md:col-span-2">
                Link de destino
                <input
                  className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                  value={adLinkUrl}
                  onChange={(event) => setAdLinkUrl(event.target.value)}
                  placeholder="https://..."
                />
              </label>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-3">
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
          </div>

          {/* Ads list */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#D1C7BD]">Publicidades activas e inactivas</span>
              <span className="text-[11px] text-[#9f988d]">{ads.length} total</span>
            </div>
            {adsStatus === "loading" && (
              <div className="text-xs text-[#D1C7BD]">Cargando publicidad...</div>
            )}
            {adsStatus === "error" && (
              <div className="text-xs text-[#AF8C5C]">{adsError}</div>
            )}
            {adsStatus === "idle" && ads.length === 0 && (
              <div className="text-xs text-[#9f988d]">No hay publicidades creadas.</div>
            )}
            {ads.map((ad) => (
              <div
                key={ad.id}
                className={`rounded-2xl border p-3 text-xs transition ${ad.isActive ? "border-white/10 bg-night-900/48" : "border-white/6 bg-night-900/24 opacity-60"}`}
              >
                {adEditId === ad.id ? (
                  /* ── Edit mode ── */
                  <div className="space-y-3">
                    <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-gold-300">Editando publicidad</p>
                    <div className="grid gap-2 md:grid-cols-2">
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Título
                        <input className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" value={adEditDraft.title} onChange={(e) => setAdEditDraft((prev) => ({ ...prev, title: e.target.value }))} />
                      </label>
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Prioridad
                        <input type="number" min={0} className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" value={adEditDraft.priority} onChange={(e) => setAdEditDraft((prev) => ({ ...prev, priority: e.target.value }))} />
                      </label>
                      <label className="space-y-1 text-[11px] text-[#D1C7BD] md:col-span-2">
                        Descripción
                        <textarea rows={2} className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" value={adEditDraft.body} onChange={(e) => setAdEditDraft((prev) => ({ ...prev, body: e.target.value }))} />
                      </label>
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Imagen (URL)
                        <input className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" value={adEditDraft.imageUrl} onChange={(e) => setAdEditDraft((prev) => ({ ...prev, imageUrl: e.target.value }))} />
                      </label>
                      <label className="space-y-1 text-[11px] text-[#D1C7BD]">
                        Texto botón
                        <input className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" value={adEditDraft.ctaText} onChange={(e) => setAdEditDraft((prev) => ({ ...prev, ctaText: e.target.value }))} />
                      </label>
                      <label className="space-y-1 text-[11px] text-[#D1C7BD] md:col-span-2">
                        Link de destino
                        <input className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" value={adEditDraft.linkUrl} onChange={(e) => setAdEditDraft((prev) => ({ ...prev, linkUrl: e.target.value }))} />
                      </label>
                    </div>
                    <div className="flex gap-2">
                      <button type="button" disabled={adEditSaving} onClick={() => void saveEditAd()} className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-1.5 text-[11px] font-semibold text-night-900 disabled:opacity-60">
                        {adEditSaving ? "Guardando..." : "Guardar cambios"}
                      </button>
                      <button type="button" onClick={() => setAdEditId(null)} className="rounded-full border border-white/20 px-4 py-1.5 text-[11px] text-[#D1C7BD]">
                        Cancelar
                      </button>
                    </div>
                  </div>
                ) : (
                  /* ── View mode ── */
                  <div className="flex flex-wrap items-start gap-3">
                    {ad.imageUrl && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10">
                        <img src={ad.imageUrl} alt="" className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-white">{ad.title}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${ad.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/6 text-[#9f988d]"}`}>
                          {ad.isActive ? "Activo" : "Inactivo"}
                        </span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#9f988d]">
                          Prioridad {ad.priority}
                        </span>
                      </div>
                      {ad.body && <p className="mt-0.5 text-[#D1C7BD]">{ad.body}</p>}
                      {ad.linkUrl && (
                        <p className="mt-0.5 truncate text-[11px] text-[#9f988d]">{ad.linkUrl}</p>
                      )}
                      {ad.ctaText && (
                        <span className="mt-1 inline-block rounded-full border border-gold-500/25 bg-gold-500/8 px-2 py-0.5 text-[10px] text-gold-300">
                          {ad.ctaText}
                        </span>
                      )}
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2">
                      <button type="button" onClick={() => startEditAd(ad)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD] hover:border-white/40">
                        Editar
                      </button>
                      <button type="button" onClick={() => updateAdStatus(ad.id, !ad.isActive)} className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD] hover:border-white/40">
                        {ad.isActive ? "Desactivar" : "Activar"}
                      </button>
                      <button type="button" onClick={() => deleteAd(ad.id)} className="rounded-full border border-rose-400/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-400/10">
                        Borrar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {tab === "beta" && (
        <div className="space-y-6">
          {/* Invite management */}
          <section className="glass-card space-y-4 p-4">
            <div className="space-y-1">
              <h3 className="text-sm text-white">Invitaciones beta</h3>
              <p className="text-xs text-[#D1C7BD]">
                Generá links únicos para invitar usuarios beta. El link lleva al registro con acceso Gold gratuito por 30 días.
              </p>
            </div>

            <div className="rounded-2xl border border-gold-500/20 bg-gold-500/5 p-4">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-300">Nueva invitación</p>
              <div className="grid gap-3 md:grid-cols-3">
                <label className="space-y-1.5 text-xs text-[#D1C7BD]">
                  Etiqueta (opcional)
                  <input
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={betaInviteLabel}
                    onChange={(e) => setBetaInviteLabel(e.target.value)}
                    placeholder="Ej: Inmobiliarias Mar 2026"
                  />
                </label>
                <label className="space-y-1.5 text-xs text-[#D1C7BD]">
                  Tipo de perfil
                  <select
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={betaInviteRole}
                    onChange={(e) => setBetaInviteRole(e.target.value as "OWNER" | "AGENCY")}
                  >
                    <option value="OWNER">Dueño directo</option>
                    <option value="AGENCY">Inmobiliaria</option>
                  </select>
                </label>
                <label className="space-y-1.5 text-xs text-[#D1C7BD]">
                  Máximo de usos (vacío = sin límite)
                  <input
                    type="number"
                    min={1}
                    className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
                    value={betaInviteMaxUses}
                    onChange={(e) => setBetaInviteMaxUses(e.target.value)}
                    placeholder="Ilimitado"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={betaInviteSaving}
                onClick={() => void createBetaInvite()}
                className="mt-3 rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900 disabled:opacity-60"
              >
                {betaInviteSaving ? "Generando..." : "Generar link"}
              </button>
            </div>

            {betaInvitesStatus === "loading" && <p className="text-xs text-[#D1C7BD]">Cargando...</p>}
            {betaInvites.length === 0 && betaInvitesStatus === "idle" && (
              <p className="text-xs text-[#9f988d]">No hay invitaciones creadas todavía.</p>
            )}
            <div className="space-y-3">
              {betaInvites.map((invite) => {
                const url = `${window.location.origin}/registro?beta=${invite.token}`;
                return (
                  <div
                    key={invite.id}
                    className={`rounded-2xl border p-3 text-xs ${invite.isActive ? "border-white/10 bg-night-900/48" : "border-white/6 bg-night-900/24 opacity-60"}`}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${invite.isActive ? "bg-emerald-500/15 text-emerald-300" : "bg-white/6 text-[#9f988d]"}`}>
                            {invite.isActive ? "Activa" : "Inactiva"}
                          </span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#9f988d]">
                            {invite.targetRole === "OWNER" ? "Dueño directo" : "Inmobiliaria"}
                          </span>
                          <span className="text-[#D1C7BD]">
                            {invite.usedCount} uso{invite.usedCount !== 1 ? "s" : ""}
                            {invite.maxUses ? ` / ${invite.maxUses}` : ""}
                          </span>
                          {invite.label && <span className="font-semibold text-white">{invite.label}</span>}
                        </div>
                        <div className="mt-1.5 flex items-center gap-2">
                          <span className="truncate max-w-xs text-[11px] text-[#9f988d] font-mono">{url}</span>
                          <button
                            type="button"
                            onClick={() => { void navigator.clipboard.writeText(url); addToast("Link copiado.", "success"); }}
                            className="shrink-0 rounded-full border border-white/20 px-2 py-0.5 text-[10px] text-[#E7E2DD] hover:border-white/40"
                          >
                            Copiar
                          </button>
                        </div>
                        <p className="mt-0.5 text-[10px] text-[#9f988d]">
                          Creada {formatShortDateTime(invite.createdAt)}
                        </p>
                      </div>
                      <div className="flex shrink-0 flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => void toggleBetaInvite(invite)}
                          className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD] hover:border-white/40"
                        >
                          {invite.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void deleteBetaInvite(invite.id)}
                          className="rounded-full border border-rose-400/40 px-3 py-1 text-xs text-rose-200 hover:bg-rose-400/10"
                        >
                          Borrar
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {/* Feedback from beta users */}
          <section className="glass-card space-y-4 p-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm text-white">Observaciones de usuarios beta</h3>
                {betaFeedbackTotal > 0 && (
                  <p className="text-xs text-[#9f988d]">{betaFeedbackTotal} observaciones en total</p>
                )}
              </div>
              <select
                value={betaFeedbackStatusFilter}
                onChange={(e) => { setBetaFeedbackStatusFilter(e.target.value); setBetaFeedbackPage(1); }}
                className="rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-xs text-white"
              >
                <option value="">Todas</option>
                <option value="UNREAD">Sin leer</option>
                <option value="READ">Vistas</option>
                <option value="ADDRESSED">Atendidas</option>
              </select>
            </div>

            {betaFeedbackStatus === "loading" && <p className="text-xs text-[#D1C7BD]">Cargando...</p>}
            {betaFeedbackStatus === "idle" && betaFeedbackList.length === 0 && (
              <p className="text-xs text-[#9f988d]">No hay observaciones con ese filtro.</p>
            )}

            <div className="space-y-3">
              {betaFeedbackList.map((item) => {
                const catLabels: Record<string, string> = { UX: "UX", FEATURE: "Mejora", BUG: "Error", GENERAL: "General" };
                return (
                  <div key={item.id} className={`rounded-2xl border p-3 text-xs ${item.status === "UNREAD" ? "border-gold-500/20 bg-night-900/48" : "border-white/8 bg-night-900/32"}`}>
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-semibold text-white">{item.title}</span>
                          <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-[#9f988d]">{catLabels[item.category] ?? item.category}</span>
                          {item.status === "UNREAD" && (
                            <span className="rounded-full bg-gold-500/15 px-2 py-0.5 text-[10px] font-semibold text-gold-300">Nueva</span>
                          )}
                          {item.status === "READ" && (
                            <span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] text-sky-300">Vista</span>
                          )}
                          {item.status === "ADDRESSED" && (
                            <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">Atendida</span>
                          )}
                        </div>
                        <div className="mt-0.5 text-[#9f988d]">
                          {item.user.name ?? item.user.email} · {formatShortDateTime(item.createdAt)}
                        </div>
                      </div>
                      <select
                        value={item.status}
                        onChange={(e) => void updateBetaFeedbackStatus(item.id, e.target.value)}
                        className="rounded-full border border-white/20 bg-night-900/48 px-3 py-1 text-xs text-white"
                      >
                        <option value="UNREAD">Sin leer</option>
                        <option value="READ">Vista</option>
                        <option value="ADDRESSED">Atendida</option>
                      </select>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[#D1C7BD]">{item.body}</p>
                  </div>
                );
              })}
            </div>
            <Pagination page={betaFeedbackPage} total={betaFeedbackTotal} pageSize={20} onChange={(p) => setBetaFeedbackPage(p)} />
          </section>
        </div>
      )}
    </div>
  );
}





