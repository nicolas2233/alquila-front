import { useEffect, useMemo, useState } from "react";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";

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

type TabKey = "overview" | "users" | "properties" | "reports" | "verifications";

export function AdminPage() {
  const sessionUser = useMemo(() => getSessionUser(), []);
  const token = useMemo(() => getToken(), []);
  const [tab, setTab] = useState<TabKey>("overview");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [overviewStatus, setOverviewStatus] = useState<"idle" | "loading" | "error">(
    "idle"
  );
  const [overviewError, setOverviewError] = useState("");

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [usersStatus, setUsersStatus] = useState<"idle" | "loading" | "error">("idle");
  const [usersError, setUsersError] = useState("");

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

  useEffect(() => {
    if (!token || sessionUser?.role !== "ADMIN") {
      return;
    }
    setOverviewStatus("loading");
    setOverviewError("");
    fetch(`${env.apiUrl}/admin/overview`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No pudimos cargar el overview.");
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
  }, [token, sessionUser?.role]);

  useEffect(() => {
    if (!token || sessionUser?.role !== "ADMIN") return;
    if (tab !== "users") return;
    setUsersStatus("loading");
    setUsersError("");
    fetch(`${env.apiUrl}/admin/users`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No pudimos cargar usuarios.");
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
  }, [token, sessionUser?.role, tab]);

  useEffect(() => {
    if (!token || sessionUser?.role !== "ADMIN") return;
    if (tab !== "verifications") return;
    setVerificationsStatus("loading");
    setVerificationsError("");
    fetch(`${env.apiUrl}/admin/verifications`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No pudimos cargar verificaciones.");
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
  }, [token, sessionUser?.role, tab]);

  useEffect(() => {
    if (!token || sessionUser?.role !== "ADMIN") return;
    if (tab !== "properties") return;
    setPropertiesStatus("loading");
    setPropertiesError("");
    fetch(`${env.apiUrl}/admin/properties`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No pudimos cargar publicaciónes.");
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
  }, [token, sessionUser?.role, tab]);

  useEffect(() => {
    if (!token || sessionUser?.role !== "ADMIN") return;
    if (tab !== "reports") return;
    setReportsStatus("loading");
    setReportsError("");
    fetch(`${env.apiUrl}/admin/reports`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("No pudimos cargar reportes.");
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
  }, [token, sessionUser?.role, tab]);

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
      return;
    }
    setUsers((prev) => prev.map((item) => (item.id === userId ? { ...item, status } : item)));
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
    if (!response.ok) return;
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
    if (!response.ok) return;
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
    if (!response.ok) return;
    setVerifications((prev) =>
      prev.map((item) => (item.id === verificationId ? { ...item, status } : item))
    );
  };

  if (!sessionUser || sessionUser.role !== "ADMIN") {
    return (
      <div className="glass-card p-6 text-sm text-[#9a948a]">
        Esta seccion es solo para administradores.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Panel admin</h2>
          <p className="text-sm text-[#9a948a]">Control total de Brupi.</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {(
            [
              ["overview", "Overview"],
              ["users", "Usuarios"],
              ["properties", "Publicaciones"],
              ["reports", "Reportes"],
              ["verifications", "Verificaciones"],
            ] as Array<[TabKey, string]>
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={
                tab === key
                  ? "rounded-full border border-gold-500/40 bg-night-900/60 px-3 py-1 text-white"
                  : "rounded-full border border-white/10 bg-night-900/50 px-3 py-1 text-[#c7c2b8]"
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
            <div className="glass-card p-4 text-xs text-[#9a948a]">Cargando...</div>
          )}
          {overviewStatus === "error" && (
            <div className="glass-card p-4 text-xs text-[#f5b78a]">{overviewError}</div>
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
                  <div className="text-xs text-[#9a948a]">{item.label}</div>
                  <div className="mt-2 text-2xl text-white">{item.value}</div>
                </div>
              ))}
            </>
          )}
        </section>
      )}

      {tab === "users" && (
        <section className="glass-card space-y-3 p-4">
          {usersStatus === "loading" && (
            <div className="text-xs text-[#9a948a]">Cargando usuarios...</div>
          )}
          {usersStatus === "error" && (
            <div className="text-xs text-[#f5b78a]">{usersError}</div>
          )}
          {users.map((user) => (
            <div
              key={user.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/60 p-3 text-xs"
            >
              <div>
                <div className="text-sm text-white">{user.name ?? "Sin nombre"}</div>
                <div className="text-[#9a948a]">{user.email}</div>
                <div className="text-[#9a948a]">{user.role}</div>
              </div>
              <div className="flex items-center gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[#c7c2b8]">
                  {user.status}
                </span>
                <select
                  className="rounded-full border border-white/20 bg-night-900/60 px-3 py-1 text-xs text-white"
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
            <div className="text-xs text-[#9a948a]">Cargando publicaciónes...</div>
          )}
          {propertiesStatus === "error" && (
            <div className="text-xs text-[#f5b78a]">{propertiesError}</div>
          )}
          {properties.map((item) => (
            <div
              key={item.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-night-900/60 p-3 text-xs"
            >
              <div>
                <div className="text-sm text-white">{item.title}</div>
                <div className="text-[#9a948a]">
                  {item.operationType} - {item.propertyType} - {item.priceCurrency} {item.priceAmount}
                </div>
                <div className="text-[#9a948a]">
                  {item.location?.addressLine} {item.location?.locality?.name ? `- ${item.location.locality.name}` : ""}
                </div>
              </div>
              <span className="rounded-full border border-white/10 px-3 py-1 text-[#c7c2b8]">
                {item.status}
              </span>
              <select
                className="rounded-full border border-white/20 bg-night-900/60 px-3 py-1 text-xs text-white"
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
            <div className="text-xs text-[#9a948a]">Cargando reportes...</div>
          )}
          {reportsStatus === "error" && (
            <div className="text-xs text-[#f5b78a]">{reportsError}</div>
          )}
          {reports.map((report) => (
            <div
              key={report.id}
              className="rounded-2xl border border-white/10 bg-night-900/60 p-3 text-xs"
            >
              <div className="text-sm text-white">
                {report.type === "USER"
                  ? `Usuario: ${report.reportedUser?.name ?? report.reportedUser?.email ?? "N/A"}`
                  : report.property?.title ?? "Publicación"}
              </div>
              <div className="text-[#9a948a]">{report.reason}</div>
              <div className="text-[#9a948a]">
                {report.type === "USER" ? "Reporte de usuario" : "Reporte de publicación"}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span className="rounded-full border border-white/10 px-3 py-1 text-[#c7c2b8]">
                  {report.status}
                </span>
                <span className="text-[#9a948a]">
                  Reportado por {report.reporter?.email ?? "Anónimo"}
                </span>
                <select
                  className="rounded-full border border-white/20 bg-night-900/60 px-3 py-1 text-xs text-white"
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
            <div className="text-xs text-[#9a948a]">Cargando verificaciones...</div>
          )}
          {verificationsStatus === "error" && (
            <div className="text-xs text-[#f5b78a]">{verificationsError}</div>
          )}
          {verifications.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-night-900/60 p-3 text-xs"
            >
              <div className="text-sm text-white">
                {(item.user.name ?? item.user.email ?? "Usuario")} - {item.type}
              </div>
              <div className="text-[#9a948a]">Estado: {item.status}</div>
              <div className="mt-2 text-[#9a948a]">
                Datos: {JSON.stringify(item.payload)}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <select
                  className="rounded-full border border-white/20 bg-night-900/60 px-3 py-1 text-xs text-white"
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
    </div>
  );
}
