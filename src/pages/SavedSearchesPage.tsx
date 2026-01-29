import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { env } from "../shared/config/env";
import { getToken } from "../shared/auth/session";

type SavedSearch = {
  id: string;
  name?: string | null;
  query: Record<string, unknown>;
  createdAt: string;
  lastCheckedAt?: string | null;
};

type MatchItem = {
  id: string;
  title: string;
  operationType: string;
  propertyType: string;
  priceAmount: string | number;
  priceCurrency: string;
  location?: { addressLine?: string | null; locality?: { name?: string | null } | null } | null;
  photos?: { url: string }[] | null;
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
  COMMERCIAL: "Comercio",
  OFFICE: "Oficina",
  WAREHOUSE: "Deposito",
};

function buildSearchUrl(query: Record<string, unknown>) {
  const params = new URLSearchParams();
  if (typeof query.operationType === "string" && query.operationType) {
    params.set("operationType", query.operationType);
  }
  if (typeof query.propertyType === "string" && query.propertyType) {
    params.set("propertyType", query.propertyType);
  }
  const queryString = params.toString();
  return queryString ? `/buscar?${queryString}` : "/buscar";
}

function describeSearch(query: Record<string, unknown>) {
  const operation =
    typeof query.operationType === "string"
      ? operationLabels[query.operationType] ?? query.operationType
      : "Todas";
  const property =
    typeof query.propertyType === "string"
      ? propertyLabels[query.propertyType] ?? query.propertyType
      : "Todas";
  return `${operation} · ${property}`;
}

export function SavedSearchesPage() {
  const [items, setItems] = useState<SavedSearch[]>([]);
  const [matches, setMatches] = useState<Record<string, MatchItem[]>>({});
  const [alertCounts, setAlertCounts] = useState<Record<string, number>>({});
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [message, setMessage] = useState("");

  const token = useMemo(() => getToken(), []);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Inicia sesion para ver tus busquedas guardadas.");
        return;
      }
      setStatus("loading");
      setMessage("");
      try {
        const response = await fetch(`${env.apiUrl}/saved-searches`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar las busquedas guardadas.");
        }
        const data = (await response.json()) as { items: SavedSearch[] };
        setItems(data.items ?? []);
        setStatus("idle");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "No pudimos cargar las busquedas."
        );
      }
    };
    void load();
  }, [token]);

  const removeSearch = async (id: string) => {
    if (!token) {
      return;
    }
    try {
      const response = await fetch(`${env.apiUrl}/saved-searches/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("No pudimos borrar la busqueda.");
      }
      setItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No pudimos borrar la busqueda."
      );
    }
  };

  const loadMatches = async (id: string) => {
    if (!token) {
      return;
    }
    try {
      const response = await fetch(`${env.apiUrl}/saved-searches/${id}/alerts`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) {
        throw new Error("No pudimos cargar coincidencias.");
      }
      const data = (await response.json()) as { items: MatchItem[]; newCount: number };
      setMatches((prev) => ({ ...prev, [id]: data.items ?? [] }));
      setAlertCounts((prev) => ({ ...prev, [id]: data.newCount ?? 0 }));
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "No pudimos cargar coincidencias."
      );
    }
  };

  useEffect(() => {
    const loadSummary = async () => {
      if (!token) {
        return;
      }
      try {
        const response = await fetch(`${env.apiUrl}/saved-searches/alerts-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar alertas.");
        }
        const data = (await response.json()) as { items: { id: string; count: number }[] };
        const next: Record<string, number> = {};
        data.items.forEach((item) => {
          next[item.id] = item.count;
        });
        setAlertCounts(next);
      } catch {
        // ignore
      }
    };
    void loadSummary();
  }, [token, items.length]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-white">Mis busquedas guardadas</h2>
        <p className="text-sm text-[#9a948a]">Volve a ejecutar una busqueda en un click.</p>
      </div>

      {status === "loading" && (
        <p className="text-xs text-[#9a948a]">Cargando busquedas...</p>
      )}
      {status === "error" && (
        <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#f5b78a]">
          {message}
        </div>
      )}

      {status === "idle" && items.length === 0 && (
        <div className="rounded-2xl border border-white/10 bg-night-900/60 p-4 text-xs text-[#9a948a]">
          <p className="text-sm text-white">Todavia no guardaste busquedas.</p>
          <p className="mt-1">Anda a Buscar y guarda tus filtros favoritos.</p>
          <Link
            className="mt-3 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            to="/buscar"
          >
            Ir a Buscar
          </Link>
        </div>
      )}

      {status === "idle" && items.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((item) => {
            const summary = describeSearch(item.query ?? {});
            const url = buildSearchUrl(item.query ?? {});
            const matchItems = matches[item.id] ?? [];
            const alertCount = alertCounts[item.id] ?? 0;
            return (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-night-900/60 p-5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg text-white">
                        {item.name ?? "Busqueda guardada"}
                      </h3>
                      {alertCount > 0 && (
                        <span className="rounded-full bg-gold-500/20 px-2 py-0.5 text-[10px] text-gold-300">
                          {alertCount} nuevas
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-[#9a948a]">{summary}</p>
                  </div>
                  <button
                    className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                    type="button"
                    onClick={() => removeSearch(item.id)}
                  >
                    Borrar
                  </button>
                </div>
                <Link
                  className="mt-4 inline-flex rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                  to={url}
                >
                  Ejecutar busqueda
                </Link>
                <button
                  className="ml-2 mt-4 inline-flex rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                  type="button"
                  onClick={() => loadMatches(item.id)}
                >
                  Ver alertas
                </button>
                {matchItems.length > 0 && (
                  <div className="mt-4 space-y-2 text-xs text-[#9a948a]">
                    <div className="text-sm text-white">Coincidencias recientes</div>
                    <div className="grid gap-2 md:grid-cols-2">
                      {matchItems.map((match) => {
                        const locality = match.location?.locality?.name;
                        const address = match.location?.addressLine;
                        return (
                          <Link
                            key={match.id}
                            to={`/publicacion/${match.id}`}
                            className="rounded-xl border border-white/10 bg-night-900/60 p-3"
                          >
                            <div className="text-sm text-white">{match.title}</div>
                            <div className="text-xs text-[#9a948a]">
                              {address}
                              {locality ? ` - ${locality}` : ""}
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
