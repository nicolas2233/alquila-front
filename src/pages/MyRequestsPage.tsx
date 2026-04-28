import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { getToken } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";

type MyRequest = {
  id: string;
  type: "INTEREST" | "VISIT";
  status: "NEW" | "CONTACTED" | "CLOSED";
  message?: string | null;
  createdAt: string;
  property: {
    id: string;
    title: string;
    operationType: string;
    propertyType: string;
    priceAmount: string;
    priceCurrency: string;
    location?: { addressLine?: string | null } | null;
  };
};

const requestStatusLabels: Record<string, string> = {
  NEW: "Nueva",
  CONTACTED: "Contactado",
  CLOSED: "Cerrada",
};

const requestTypeLabels: Record<string, string> = {
  INTEREST: "Me interesa",
  VISIT: "Reservar visita",
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
  FIELD: "Campo",
  QUINTA: "Quinta",
  COMMERCIAL: "Comercio",
  OFFICE: "Oficina",
  WAREHOUSE: "Depósito",
};

export function MyRequestsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [items, setItems] = useState<MyRequest[]>([]);
  const [status, setStatus] = useState<"idle" | "loading" | "error">("loading");
  const [message, setMessage] = useState("");
  const token = useMemo(() => getToken(), []);
  const [selectedRequest, setSelectedRequest] = useState<MyRequest | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [pendingRequestId, setPendingRequestId] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      if (!token) {
        setStatus("error");
        setMessage("Necesitas iniciar sesión.");
        return;
      }
      setStatus("loading");
      setMessage("");
      try {
        const response = await fetch(`${env.apiUrl}/contact-requests/mine`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar tus solicitudes.");
        }
        const data = (await response.json()) as { items: MyRequest[] };
        setItems(data.items ?? []);
        setStatus("idle");
      } catch (error) {
        setStatus("error");
        setMessage(
          error instanceof Error ? error.message : "No pudimos cargar tus solicitudes."
        );
      }
    };
    void load();
  }, [token]);

  const openRequestDetail = async (requestItem: MyRequest) => {
    if (!token) {
      addToast("Necesitas iniciar sesión.", "warning");
      return;
    }
    setSelectedRequest(requestItem);
    setDetailOpen(true);
  };

  const openPropertyDetail = async (propertyId: string) => {
    if (!token) {
      addToast("Necesitas iniciar sesión.", "warning");
      navigate("/login");
      return;
    }
    navigate(`/publicacion/${propertyId}`);
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const requestId = params.get("requestId");
    if (requestId) {
      setPendingRequestId(requestId);
    }
  }, [location.search]);

  useEffect(() => {
    if (!pendingRequestId || status !== "idle") {
      return;
    }
    const match = items.find((item) => item.id === pendingRequestId);
    if (match) {
      void openRequestDetail(match);
    }
    setPendingRequestId(null);
  }, [pendingRequestId, status, items]);


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-white">Mis solicitudes</h2>
        <p className="text-sm text-[#D1C7BD]">Tus solicitudes enviadas a propiedades.</p>
      </div>

      {status === "loading" && (
        <p className="text-xs text-[#D1C7BD]">Cargando solicitudes...</p>
      )}
      {status === "error" && (
        <p className="text-xs text-[#AF8C5C]">{message}</p>
      )}
      {status === "idle" && items.length === 0 && (
        <p className="text-xs text-[#D1C7BD]">Aun no has hecho solicitudes.</p>
      )}

      {status === "idle" && items.length > 0 && (
        <div className="space-y-3">
          {items.map((request) => (
            <div
              key={request.id}
              className="rounded-2xl border border-white/10 bg-night-900/48 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="text-sm text-white">
                    {requestTypeLabels[request.type] ?? request.type}
                  </div>
                  <div className="text-xs text-[#D1C7BD]">
                    {request.property.title} -{" "}
                    {operationLabels[request.property.operationType] ?? request.property.operationType}{" "}
                    -{" "}
                    {propertyLabels[request.property.propertyType] ?? request.property.propertyType}
                  </div>
                  {request.property.location?.addressLine && (
                    <div className="text-xs text-[#D1C7BD]">
                      {request.property.location.addressLine}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-3 text-xs text-[#E7E2DD]">
                  <div>
                    {request.property.priceCurrency} {request.property.priceAmount}
                  </div>
                  <span className="rounded-full border border-white/10 px-3 py-1 text-xs">
                    {requestStatusLabels[request.status] ?? request.status}
                  </span>
                  <button
                    className="rounded-full border border-white/20 px-3 py-1 text-xs"
                    type="button"
                    onClick={() => void openRequestDetail(request)}
                  >
                    Ver detalle
                  </button>
                </div>
              </div>
              {request.message && (
                <div className="mt-2 text-xs text-[#D1C7BD]">
                  Mensaje: {request.message}
                </div>
              )}
              <div className="mt-3">
                <button
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                  type="button"
                  onClick={() => openPropertyDetail(request.property.id)}
                >
                  Ver ficha
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {detailOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-night-950 px-4 py-6">
          <div className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-night-900 shadow-card">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-xl text-white">Detalle de solicitud</h3>
                <p className="text-xs text-[#D1C7BD]">
                  {requestTypeLabels[selectedRequest.type] ?? selectedRequest.type}
                </p>
              </div>
              <button
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                type="button"
                onClick={() => {
                  setDetailOpen(false);
                  setSelectedRequest(null);
                }}
              >
                Cerrar
              </button>
            </div>
            <div className="max-h-[calc(90vh-90px)] overflow-y-auto space-y-4 px-6 py-5 text-sm text-[#E7E2DD]">
              <div className="rounded-2xl border border-white/10 bg-night-900/48 p-4">
                <div className="text-sm text-white">{selectedRequest.property.title}</div>
                <div className="text-xs text-[#D1C7BD]">
                  {operationLabels[selectedRequest.property.operationType] ?? selectedRequest.property.operationType}{" "}
                  -{" "}
                  {propertyLabels[selectedRequest.property.propertyType] ?? selectedRequest.property.propertyType}
                </div>
                {selectedRequest.property.location?.addressLine && (
                  <div className="text-xs text-[#D1C7BD]">
                    {selectedRequest.property.location.addressLine}
                  </div>
                )}
                <div className="mt-2 text-xs text-[#D1C7BD]">
                  {selectedRequest.property.priceCurrency}{" "}
                  {selectedRequest.property.priceAmount}
                </div>
              </div>

              {selectedRequest.message && (
                <div>
                  <div className="text-xs text-[#D1C7BD]">Tu mensaje</div>
                  <div className="text-sm text-white">{selectedRequest.message}</div>
                </div>
              )}

              <div>
                <button
                  className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                  type="button"
                  onClick={() => openPropertyDetail(selectedRequest.property.id)}
                >
                  Ver ficha
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}


