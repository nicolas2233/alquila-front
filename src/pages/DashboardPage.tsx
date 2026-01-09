import { useCallback, useEffect, useState } from "react";
import { env } from "../shared/config/env";
import { getSessionUser } from "../shared/auth/session";

const operationLabels: Record<string, string> = {
  SALE: "Venta",
  RENT: "Alquiler",
  TEMPORARY: "Temporario",
};

const statusLabels: Record<string, string> = {
  DRAFT: "Borrador",
  ACTIVE: "Activa",
  PAUSED: "Pausada",
  SOLD: "Vendida",
  RENTED: "Alquilada",
  TEMPORARILY_UNAVAILABLE: "No disponible",
};

type PropertyItem = {
  id: string;
  title: string;
  description?: string;
  operationType: string;
  status: string;
  priceAmount: string | number;
  priceCurrency: string;
  updatedAt: string;
};

export function DashboardPage() {
  const sessionUser = getSessionUser();
  const isOwner = sessionUser?.role === "OWNER";
  const isAgency = sessionUser?.role?.startsWith("AGENCY") ?? false;
  const ownerUserId = isOwner ? sessionUser?.id : undefined;
  const agencyId = isAgency ? sessionUser?.agencyId ?? undefined : undefined;
  const roleLabel = isOwner
    ? "Dueno directo"
    : isAgency
    ? "Inmobiliaria"
    : "Usuario";

  const [items, setItems] = useState<PropertyItem[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [editCurrency, setEditCurrency] = useState("ARS");

  const loadProperties = useCallback(async () => {
    setStatus("loading");
    setErrorMessage("");

    if (!sessionUser) {
      setStatus("error");
      setErrorMessage("Necesitas iniciar sesion.");
      return;
    }

    if (!ownerUserId && !agencyId) {
      setStatus("error");
      setErrorMessage("Solo duenos o inmobiliarias pueden ver este panel.");
      return;
    }

    try {
      const params = new URLSearchParams();
      if (ownerUserId) {
        params.set("ownerUserId", ownerUserId);
      }
      if (agencyId) {
        params.set("agencyId", agencyId);
      }

      const response = await fetch(`${env.apiUrl}/properties?${params.toString()}`);
      if (!response.ok) {
        throw new Error("No pudimos cargar las publicaciones.");
      }

      const data = (await response.json()) as { items: PropertyItem[] };
      setItems(data.items);
      setStatus("idle");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error al cargar el panel."
      );
    }
  }, [agencyId, ownerUserId, sessionUser]);

  useEffect(() => {
    if (sessionUser && (ownerUserId || agencyId)) {
      void loadProperties();
    }
  }, [agencyId, loadProperties, ownerUserId, sessionUser]);

  const updateStatus = async (propertyId: string, nextStatus: string) => {
    try {
      await fetch(`${env.apiUrl}/properties/${propertyId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      await loadProperties();
    } catch (error) {
      setStatus("error");
      setErrorMessage("No pudimos actualizar el estado.");
    }
  };

  const startEdit = (item: PropertyItem) => {
    setEditingId(item.id);
    setEditTitle(item.title ?? "");
    setEditDescription(item.description ?? "");
    setEditPrice(String(item.priceAmount ?? ""));
    setEditCurrency(item.priceCurrency ?? "ARS");
  };

  const saveEdit = async (propertyId: string) => {
    try {
      await fetch(`${env.apiUrl}/properties/${propertyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: editTitle,
          description: editDescription,
          priceAmount: Number(editPrice),
          priceCurrency: editCurrency,
        }),
      });
      setEditingId(null);
      await loadProperties();
    } catch (error) {
      setStatus("error");
      setErrorMessage("No pudimos guardar el precio.");
    }
  };

  return (
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
        <div className="flex flex-wrap items-center gap-3">
          <button
            className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900"
            type="button"
            onClick={loadProperties}
            disabled={status === "loading"}
          >
            {status === "loading" ? "Cargando..." : "Actualizar publicaciones"}
          </button>
          <span className="text-xs text-[#9a948a]">Mostramos las publicaciones de tu cuenta.</span>
        </div>
        {status === "error" && (
          <p className="text-xs text-[#f5b78a]">{errorMessage}</p>
        )}
      </div>

      <div className="glass-card overflow-hidden">
        <div className="overflow-auto">
          <table className="w-full text-left text-sm">
            <thead className="text-xs uppercase text-[#9a948a]">
              <tr>
                <th className="px-4 py-3">Propiedad</th>
                <th className="px-4 py-3">Operacion</th>
                <th className="px-4 py-3">Estado</th>
                <th className="px-4 py-3">Precio</th>
                <th className="px-4 py-3">Actualizado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody className="text-[#c7c2b8]">
              {items.map((item) => (
                <tr key={item.id} className="border-t border-white/10">
                  <td className="px-4 py-3 text-white">
                    {editingId === item.id ? (
                      <div className="space-y-2">
                        <input
                          className="w-full rounded-lg border border-white/10 bg-night-900/60 px-2 py-1 text-xs text-white"
                          value={editTitle}
                          onChange={(event) => setEditTitle(event.target.value)}
                        />
                        <textarea
                          className="w-full rounded-lg border border-white/10 bg-night-900/60 px-2 py-1 text-xs text-white"
                          rows={2}
                          value={editDescription}
                          onChange={(event) => setEditDescription(event.target.value)}
                        />
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div>{item.title}</div>
                        {item.description && (
                          <div className="text-xs text-[#9a948a]">
                            {item.description.length > 80
                              ? `${item.description.slice(0, 80)}...`
                              : item.description}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {operationLabels[item.operationType] ?? item.operationType}
                  </td>
                  <td className="px-4 py-3">
                    {statusLabels[item.status] ?? item.status}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === item.id ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <input
                          className="w-24 rounded-lg border border-white/10 bg-night-900/60 px-2 py-1 text-xs text-white"
                          value={editPrice}
                          onChange={(event) => setEditPrice(event.target.value)}
                        />
                        <select
                          className="rounded-lg border border-white/10 bg-night-900/60 px-2 py-1 text-xs text-white"
                          value={editCurrency}
                          onChange={(event) => setEditCurrency(event.target.value)}
                        >
                          <option value="ARS">ARS</option>
                          <option value="USD">USD</option>
                        </select>
                      </div>
                    ) : (
                      <span className="text-sm text-[#c7c2b8]">
                        {item.priceCurrency} {item.priceAmount}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {new Date(item.updatedAt).toLocaleDateString("es-AR")}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      {item.status !== "PAUSED" && (
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => updateStatus(item.id, "PAUSED")}
                        >
                          Pausar
                        </button>
                      )}
                      {item.status !== "ACTIVE" && (
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => updateStatus(item.id, "ACTIVE")}
                        >
                          Activar
                        </button>
                      )}
                      {item.operationType === "SALE" && item.status !== "SOLD" && (
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => updateStatus(item.id, "SOLD")}
                        >
                          Marcar vendido
                        </button>
                      )}
                      {item.operationType === "RENT" && item.status !== "RENTED" && (
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => updateStatus(item.id, "RENTED")}
                        >
                          Marcar alquilado
                        </button>
                      )}
                      {item.operationType === "TEMPORARY" &&
                        item.status !== "TEMPORARILY_UNAVAILABLE" && (
                          <button
                            className="rounded-full border border-white/20 px-3 py-1 text-xs"
                            type="button"
                            onClick={() => updateStatus(item.id, "TEMPORARILY_UNAVAILABLE")}
                          >
                            Marcar ocupado
                          </button>
                        )}
                      {item.operationType === "TEMPORARY" && item.status !== "ACTIVE" && (
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => updateStatus(item.id, "ACTIVE")}
                        >
                          Marcar disponible
                        </button>
                      )}
                      {editingId === item.id ? (
                        <>
                          <button
                            className="rounded-full border border-white/20 px-3 py-1 text-xs"
                            type="button"
                            onClick={() => saveEdit(item.id)}
                          >
                            Guardar
                          </button>
                          <button
                            className="rounded-full border border-white/20 px-3 py-1 text-xs"
                            type="button"
                            onClick={() => setEditingId(null)}
                          >
                            Cancelar
                          </button>
                        </>
                      ) : (
                        <button
                          className="rounded-full border border-white/20 px-3 py-1 text-xs"
                          type="button"
                          onClick={() => startEdit(item)}
                        >
                          Editar precio
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && status !== "loading" && (
                <tr className="border-t border-white/10">
                  <td className="px-4 py-6 text-sm text-[#9a948a]" colSpan={6}>
                    No hay publicaciones cargadas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
