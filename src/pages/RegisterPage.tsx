import { useMemo, useState } from "react";
import { env } from "../shared/config/env";

type AccountType = "viewer" | "owner" | "agency";

const planOptions = [
  {
    key: "bronce",
    label: "Bronce",
    description: "Hasta 3 inmuebles. Ideal para duenos directos.",
  },
  {
    key: "platinum",
    label: "Platinum",
    description: "Hasta 20 inmuebles. Para inmobiliarias chicas.",
  },
  {
    key: "gold",
    label: "Gold",
    description: "Hasta 50 inmuebles. Para equipos grandes.",
  },
];

export function RegisterPage() {
  const [accountType, setAccountType] = useState<AccountType>("viewer");
  const [plan, setPlan] = useState("bronce");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [ownerFullName, setOwnerFullName] = useState("");
  const [ownerDni, setOwnerDni] = useState("");
  const [ownerTramite, setOwnerTramite] = useState("");
  const [ownerBirthDate, setOwnerBirthDate] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyLegalName, setAgencyLegalName] = useState("");
  const [agencyCuit, setAgencyCuit] = useState("");
  const [agencyLicense, setAgencyLicense] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});

  const showPlan = accountType !== "viewer";
  const planChoices = useMemo(() => {
    if (accountType === "owner") {
      return planOptions.filter((item) => item.key === "bronce");
    }
    if (accountType === "agency") {
      return planOptions.filter((item) => item.key !== "bronce");
    }
    return [];
  }, [accountType]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    setFieldErrors({});

    try {
      if (!email || !password) {
        setFieldErrors({
          email: !email,
          password: !password,
        });
        throw new Error("Email y password son obligatorios.");
      }

      if (accountType === "viewer") {
        if (!name) {
          setFieldErrors({ name: true });
          throw new Error("El nombre es obligatorio.");
        }
      }

      if (accountType === "owner") {
        if (!phone) {
          setFieldErrors({ phone: true });
          throw new Error("El telefono es obligatorio para duenos.");
        }
        if (!ownerFullName || !ownerDni || !ownerTramite || !ownerBirthDate) {
          setFieldErrors({
            ownerFullName: !ownerFullName,
            ownerDni: !ownerDni,
            ownerTramite: !ownerTramite,
            ownerBirthDate: !ownerBirthDate,
          });
          throw new Error("Completa todos los datos del dueno.");
        }
      }

      if (accountType === "agency") {
        if (!phone) {
          setFieldErrors({ phone: true });
          throw new Error("El telefono es obligatorio para inmobiliarias.");
        }
        if (!agencyName || !agencyLegalName || !agencyCuit || !agencyLicense) {
          setFieldErrors({
            agencyName: !agencyName,
            agencyLegalName: !agencyLegalName,
            agencyCuit: !agencyCuit,
            agencyLicense: !agencyLicense,
          });
          throw new Error("Completa todos los datos de la inmobiliaria.");
        }
      }

      let endpoint = "";
      let payload: Record<string, string> = {};

      if (accountType === "viewer") {
        endpoint = "/users";
        payload = {
          email,
          password,
          name,
          ...(phone ? { phone } : {}),
        };
      } else if (accountType === "owner") {
        endpoint = "/owners";
        payload = {
          email,
          password,
          phone,
          fullName: ownerFullName,
          dni: ownerDni,
          dniTramite: ownerTramite,
          birthDate: ownerBirthDate,
        };
      } else {
        endpoint = "/agencies";
        payload = {
          email,
          password,
          phone,
          name: agencyName,
          legalName: agencyLegalName,
          cuit: agencyCuit,
          licenseNumber: agencyLicense,
        };
      }

      const response = await fetch(`${env.apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error("No pudimos completar el registro.");
      }

      setStatus("success");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "Error en el registro."
      );
    }
  };

  const fieldClass = (hasError: boolean) =>
    hasError
      ? "w-full rounded-xl border border-red-500/70 bg-night-900/60 px-3 py-2 text-sm text-white"
      : "w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white";

  return (
    <div className="space-y-10">
      <div className="space-y-2">
        <h2 className="text-3xl text-white">Crear cuenta</h2>
        <p className="text-sm text-[#9a948a]">
          Un solo registro, tres perfiles. Elegi tu tipo de cuenta y completa los datos.
        </p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        <section className="glass-card space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">1. Tipo de cuenta</h3>
            <p className="text-xs text-[#9a948a]">Definimos tu experiencia y el flujo de verificacion.</p>
          </div>
          <span className="gold-pill">Paso 1</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { key: "viewer", title: "Buscador", text: "Solo explorar y guardar." },
            { key: "owner", title: "Dueno", text: "Publica inmuebles propios." },
            { key: "agency", title: "Inmobiliaria", text: "Equipo y multiples publicaciones." },
          ].map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setAccountType(item.key as AccountType)}
              className={
                accountType === item.key
                  ? "rounded-2xl border border-gold-500/40 bg-night-900/60 p-4 text-left shadow-soft"
                  : "rounded-2xl border border-white/10 bg-night-800/70 p-4 text-left"
              }
            >
              <h4 className="text-base text-white">{item.title}</h4>
              <p className="mt-2 text-xs text-[#9a948a]">{item.text}</p>
            </button>
          ))}
        </div>
      </section>

      <section className="glass-card space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">2. Credenciales</h3>
            <p className="text-xs text-[#9a948a]">Usa email y password para ingresar.</p>
          </div>
          <span className="gold-pill">Paso 2</span>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Email
            <input
              className={fieldClass(!!fieldErrors.email)}
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Password
            <input
              type="password"
              className={fieldClass(!!fieldErrors.password)}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>
      </section>

      <section className="glass-card space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">3. Datos personales o empresa</h3>
            <p className="text-xs text-[#9a948a]">Datos necesarios para validar la cuenta.</p>
          </div>
          <span className="gold-pill">Paso 3</span>
        </div>
        {accountType === "viewer" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs text-[#9a948a]">
              Nombre
              <input
                className={fieldClass(!!fieldErrors.name)}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Telefono (opcional)
              <input
                className={fieldClass(!!fieldErrors.phone)}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
          </div>
        )}
        {accountType === "owner" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs text-[#9a948a]">
              Telefono
              <input
                className={fieldClass(!!fieldErrors.phone)}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Nombre completo
              <input
                className={fieldClass(!!fieldErrors.ownerFullName)}
                value={ownerFullName}
                onChange={(event) => setOwnerFullName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              DNI
              <input
                className={fieldClass(!!fieldErrors.ownerDni)}
                value={ownerDni}
                onChange={(event) => setOwnerDni(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Nro de tramite
              <input
                className={fieldClass(!!fieldErrors.ownerTramite)}
                value={ownerTramite}
                onChange={(event) => setOwnerTramite(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Fecha de nacimiento
              <input
                type="date"
                className={fieldClass(!!fieldErrors.ownerBirthDate)}
                value={ownerBirthDate}
                onChange={(event) => setOwnerBirthDate(event.target.value)}
              />
            </label>
          </div>
        )}
        {accountType === "agency" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="space-y-2 text-xs text-[#9a948a]">
              Telefono
              <input
                className={fieldClass(!!fieldErrors.phone)}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Nombre comercial
              <input
                className={fieldClass(!!fieldErrors.agencyName)}
                value={agencyName}
                onChange={(event) => setAgencyName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Razon social
              <input
                className={fieldClass(!!fieldErrors.agencyLegalName)}
                value={agencyLegalName}
                onChange={(event) => setAgencyLegalName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              CUIT
              <input
                className={fieldClass(!!fieldErrors.agencyCuit)}
                value={agencyCuit}
                onChange={(event) => setAgencyCuit(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Matricula
              <input
                className={fieldClass(!!fieldErrors.agencyLicense)}
                value={agencyLicense}
                onChange={(event) => setAgencyLicense(event.target.value)}
              />
            </label>
          </div>
        )}
      </section>

      {showPlan && (
        <section className="glass-card space-y-6 p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-lg text-white">4. Plan</h3>
              <p className="text-xs text-[#9a948a]">Elegi el plan que se adapta a tu escala.</p>
            </div>
            <span className="gold-pill">Paso 4</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {planChoices.map((item) => (
              <button
                key={item.key}
                type="button"
                onClick={() => setPlan(item.key)}
                className={
                  plan === item.key
                    ? "rounded-2xl border border-gold-500/40 bg-night-900/60 p-4 text-left shadow-soft"
                    : "rounded-2xl border border-white/10 bg-night-800/70 p-4 text-left"
                }
              >
                <h4 className="text-base text-white">{item.label}</h4>
                <p className="mt-2 text-xs text-[#9a948a]">{item.description}</p>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-[#9a948a]">
          Las cuentas de duenos e inmobiliarias quedan pendientes de verificacion.
        </p>
        <button
          className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-6 py-2 text-xs font-semibold text-night-900"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Creando..." : "Crear cuenta"}
        </button>
      </div>
      {status === "error" && (
        <p className="text-xs text-[#f5b78a]">{errorMessage}</p>
      )}
      {status === "success" && accountType !== "viewer" && (
        <div className="glass-card space-y-2 p-4">
          <h4 className="text-sm text-white">Cuenta creada</h4>
          <p className="text-xs text-[#9a948a]">
            Tu cuenta esta pendiente de verificacion. Te avisaremos cuando este activa.
          </p>
        </div>
      )}
      {status === "success" && accountType === "viewer" && (
        <div className="glass-card space-y-2 p-4">
          <h4 className="text-sm text-white">Cuenta creada</h4>
          <p className="text-xs text-[#9a948a]">Ya podes iniciar sesion y guardar publicaciones.</p>
        </div>
      )}
    </form>
  </div>
  );
}
