import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { getToken } from "../shared/auth/session";

type NotificationItem = {
  id: string;
  title: string;
  body?: string | null;
  link?: string | null;
  type?: string | null;
  resourceId?: string | null;
  propertyId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export function NotificationsPage() {
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [message, setMessage] = useState("");
  const [total, setTotal] = useState(0);
  const token = useMemo(() => getToken(), []);
  const navigate = useNavigate();

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Inicia sesion para ver tus notificaciones.");
        return;
      }
      setStatus("loading");
      setMessage("");
      try {
        const response = await fetch(`${env.apiUrl}/notifications`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar notificaciones.");
        }
        const data = (await response.json()) as {
          items: NotificationItem[];
          total: number;
        };
        setItems(data.items ?? []);
        setTotal(data.total ?? data.items?.length ?? 0);
        setStatus("idle");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "No pudimos cargar notificaciones."
        );
      }
    };
    void load();
  }, [token]);

  const markAsRead = async (id: string) => {
    if (!token) return;
    try {
      const response = await fetch(`${env.apiUrl}/notifications/${id}`, {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("No pudimos actualizar la notificacion.");
      }
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, readAt: new Date().toISOString() } : item))
      );
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No pudimos actualizar la notificacion."
      );
    }
  };

  const openRequestReply = async (notification: NotificationItem) => {
    if (!notification.resourceId) {
      if (notification.link) {
        navigate(notification.link);
        return;
      }
      navigate("/mis-solicitudes");
      return;
    }
    if (!notification.readAt) {
      await markAsRead(notification.id);
    }
    if (notification.link?.includes("/mis-solicitudes")) {
      navigate(`/mis-solicitudes?requestId=${notification.resourceId}`);
      return;
    }
    navigate(`/panel?tab=requests&requestId=${notification.resourceId}`);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-white">Notificaciones</h2>
        <p className="text-sm text-[#9a948a]">Tus alertas y novedades recientes.</p>
      </div>

      <div className="glass-card p-4 text-xs text-[#9a948a]">
        Revisa cada notificacion para ver el detalle completo.
      </div>

      {status === "loading" && (
        <p className="text-xs text-[#9a948a]">Cargando notificaciones...</p>
      )}
      {status === "error" && (
        <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#f5b78a]">
          {message}
        </div>
      )}
      {status === "idle" && items.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#9a948a]">
          No tenes notificaciones por ahora.
        </div>
      )}

      {status === "idle" && items.length > 0 && (
        <div className="space-y-3">
          {items.map((item) => (
            <div
              key={item.id}
              className="rounded-2xl border border-white/10 bg-night-900/60 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-white">{item.title}</div>
                  {item.body && <div className="text-xs text-[#9a948a]">{item.body}</div>}
                </div>
                <div className="flex items-center gap-2 text-xs text-[#c7c2b8]">
                  {item.link ? (
                    item.type === "CONTACT_REQUEST" ? (
                      <button
                        className="rounded-full border border-white/20 px-3 py-1"
                        type="button"
                        onClick={() => void openRequestReply(item)}
                      >
                        Responder
                      </button>
                    ) : (
                      <Link
                        className="rounded-full border border-white/20 px-3 py-1"
                        to={item.link}
                      >
                        Ver
                      </Link>
                    )
                  ) : null}
                  {!item.readAt && (
                    <button
                      className="rounded-full border border-white/20 px-3 py-1"
                      type="button"
                      onClick={() => markAsRead(item.id)}
                    >
                      Marcar leida
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
