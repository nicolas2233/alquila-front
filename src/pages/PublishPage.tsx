import { useState } from "react";
import { env } from "../shared/config/env";
import { getSessionUser } from "../shared/auth/session";

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

  const [title, setTitle] = useState("");
  const [operationType, setOperationType] = useState("SALE");
  const [priceAmount, setPriceAmount] = useState("");
  const [priceCurrency, setPriceCurrency] = useState("ARS");
  const [description, setDescription] = useState("");
  const [propertyType, setPropertyType] = useState("HOUSE");
  const [rooms, setRooms] = useState("");
  const [bathrooms, setBathrooms] = useState("");
  const [areaM2, setAreaM2] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [localityId, setLocalityId] = useState("");
  const [cadastralType, setCadastralType] = useState("PARTIDA");
  const [cadastralValue, setCadastralValue] = useState("");
  const [contactWhatsapp, setContactWhatsapp] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const roleLabel = isOwner
    ? "Dueno directo"
    : isAgency
    ? "Inmobiliaria"
    : "Usuario";

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
        ownerUserId: ownerUserId || undefined,
        agencyId: agencyId || undefined,
        location: {
          addressLine,
          localityId,
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
          contactWhatsapp
            ? { type: "WHATSAPP", value: contactWhatsapp }
            : null,
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
            Formulario claro con datos de catastro para evitar duplicados.
          </p>
        </div>
        <span className="gold-pill">Publicas como {roleLabel}</span>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {["Datos basicos", "Ubicacion", "Verificacion"].map((step, index) => (
          <div key={step} className="glass-card p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/15 text-sm font-semibold text-gold-400">
                {String(index + 1).padStart(2, "0")}
              </div>
              <div>
                <h3 className="text-sm text-white">{step}</h3>
                <p className="text-xs text-[#9a948a]">
                  {index === 0 && "Operacion, precio y descripcion."}
                  {index === 1 && "Direccion, cuartel y mapa."}
                  {index === 2 && "Catastro y contacto."}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <form className="glass-card space-y-6 p-6" onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Titulo
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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

        <div className="grid gap-4 md:grid-cols-4">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Precio
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
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
            M2
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={areaM2}
              onChange={(event) => setAreaM2(event.target.value)}
            />
          </label>
        </div>

        <label className="space-y-2 text-xs text-[#9a948a]">
          Descripcion
          <textarea
            rows={4}
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={description}
            onChange={(event) => setDescription(event.target.value)}
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Direccion
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={addressLine}
              onChange={(event) => setAddressLine(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Localidad (ID)
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={localityId}
              onChange={(event) => setLocalityId(event.target.value)}
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

        {status === "error" && (
          <p className="text-xs text-[#f5b78a]">{errorMessage}</p>
        )}
        {status === "success" && (
          <p className="text-xs text-[#9fe0c0]">Publicacion creada correctamente.</p>
        )}

        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            type="button"
          >
            Guardar borrador
          </button>
          <button
            className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Enviando..." : "Enviar a verificacion"}
          </button>
        </div>
      </form>
    </div>
  );
}
