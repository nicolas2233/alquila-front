import { useMemo, useState } from "react";
import { env } from "../shared/config/env";
import { LegalModal } from "../shared/ui/LegalModal";

type AccountType = "viewer" | "owner" | "agency";

const planOptions = [
  {
    key: "bronce",
    label: "Bronce",
    description: "Hasta 3 inmuebles. Ideal para dueños directos.",
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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerDni, setOwnerDni] = useState("");
  const [ownerTramite, setOwnerTramite] = useState("");
  const [ownerBirthDate, setOwnerBirthDate] = useState("");
  const [agencyName, setAgencyName] = useState("");
  const [agencyLegalName, setAgencyLegalName] = useState("");
  const [agencyCuit, setAgencyCuit] = useState("");
  const [agencyLicense, setAgencyLicense] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [showTerms, setShowTerms] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, boolean>>({});
  const emailInvalid = !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const contrasenaRemaining = Math.max(0, 8 - contrasena.length);
  const contrasenaHelper =
    contrasena.length === 0
      ? "Mínimo 8 caracteres."
      : contrasenaRemaining > 0
      ? `Te faltan ${contrasenaRemaining} caracteres.`
      : "Contraseña válida.";

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
      if (!email || !contrasena) {
        setFieldErrors({
          email: !email,
          password: !contrasena,
        });
        throw new Error("Email y contraseña son obligatorios.");
      }

      if (!termsAccepted) {
        setFieldErrors({ termsAccepted: true });
        throw new Error("Debes aceptar los términos y condiciones.");
      }

      if (contrasena.length < 8) {
        setFieldErrors({ password: true });
        throw new Error("La contraseña debe tener al menos 8 caracteres.");
      }

      if (accountType === "viewer") {
        if (!firstName || !lastName || !dni || !phone) {
          setFieldErrors({
            firstName: !firstName,
            lastName: !lastName,
            dni: !dni,
            phone: !phone,
          });
          throw new Error("Completa todos los datos del buscador.");
        }
      }

      if (accountType === "owner") {
        if (!phone) {
          setFieldErrors({ phone: true });
          throw new Error("El tel?fono es obligatorio para dueños.");
        }
        if (!ownerFirstName || !ownerLastName || !ownerDni || !ownerTramite || !ownerBirthDate) {
          setFieldErrors({
            ownerFirstName: !ownerFirstName,
            ownerLastName: !ownerLastName,
            ownerDni: !ownerDni,
            ownerTramite: !ownerTramite,
            ownerBirthDate: !ownerBirthDate,
          });
          throw new Error("Completa todos los datos del dueño.");
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
          password: contrasena,
          firstName,
          lastName,
          dni,
          phone,
        };
      } else if (accountType === "owner") {
        endpoint = "/owners";
        payload = {
          email,
          password: contrasena,
          phone,
          firstName: ownerFirstName,
          lastName: ownerLastName,
          dni: ownerDni,
          dniTramite: ownerTramite,
          birthDate: ownerBirthDate,
        };
      } else {
        endpoint = "/agencies";
        payload = {
          email,
          password: contrasena,
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
        const data = await response.json().catch(() => null);
        throw new Error(data?.message ?? "No pudimos completar el registro.");
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
          Un solo registro, tres perfiles. Elegí tu tipo de cuenta y completá los datos.
        </p>
      </div>

      <form className="space-y-10" onSubmit={handleSubmit}>
        <section className="glass-card space-y-6 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">1. Tipo de cuenta</h3>
            <p className="text-xs text-[#9a948a]">Definimos tu experiencia y el flujo de verificación.</p>
          </div>
          <span className="gold-pill">Paso 1</span>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[
            { key: "viewer", title: "Buscador", text: "Solo explorar y guardar." },
            { key: "owner", title: "Dueño", text: "Publica inmuebles propios." },
            { key: "agency", title: "Inmobiliaria", text: "Equipo y m?ltiples publicaciones." },
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
            <p className="text-xs text-[#9a948a]">Usá email y contraseña para ingresar.</p>
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
            <span className={emailInvalid ? "text-[11px] text-[#f5b78a]" : "text-[11px] text-[#9a948a]"}>
              {emailInvalid ? "Email inválido." : "Ej: nombre@mail.com"}
            </span>
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Contraseña
            <input
              type="password"
              className={fieldClass(!!fieldErrors.password)}
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
            />
            <span
              className={
                contrasenaRemaining > 0
                  ? "text-[11px] text-[#f5b78a]"
                  : "text-[11px] text-[#9a948a]"
              }
            >
              {contrasenaHelper}
            </span>
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
                className={fieldClass(!!fieldErrors.firstName)}
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Apellido
              <input
                className={fieldClass(!!fieldErrors.lastName)}
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              DNI
              <input
                className={fieldClass(!!fieldErrors.dni)}
                value={dni}
                onChange={(event) => setDni(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Teléfono
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
              Teléfono
              <input
                className={fieldClass(!!fieldErrors.phone)}
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Nombre
              <input
                className={fieldClass(!!fieldErrors.ownerFirstName)}
                value={ownerFirstName}
                onChange={(event) => setOwnerFirstName(event.target.value)}
              />
            </label>
            <label className="space-y-2 text-xs text-[#9a948a]">
              Apellido
              <input
                className={fieldClass(!!fieldErrors.ownerLastName)}
                value={ownerLastName}
                onChange={(event) => setOwnerLastName(event.target.value)}
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
              Teléfono
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
              <p className="text-xs text-[#9a948a]">Elegí el plan que se adapta a tu escala.</p>
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

      <section className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">5. T?rminos y condiciones</h3>
            <p className="text-xs text-[#9a948a]">
              Acepta las reglas de uso para finalizar el registro.
            </p>
          </div>
          <span className="gold-pill">Paso 5</span>
        </div>
        <label className="flex items-start gap-3 text-xs text-[#9a948a]">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4 accent-[#d1a466]"
            checked={termsAccepted}
            onChange={(event) => {
              setTermsAccepted(event.target.checked);
              setFieldErrors((prev) => ({ ...prev, termsAccepted: false }));
            }}
          />
          <span>
            Acepto los términos y condiciones de Brupi.{" "}
            <button
              type="button"
              className="underline text-[#d8c5a4]"
              onClick={() => setShowTerms(true)}
            >
              Leer términos
            </button>
          </span>
        </label>
        {fieldErrors.termsAccepted && (
          <p className="text-[11px] text-[#f5b78a]">
            Debes aceptar los términos y condiciones para continuar.
          </p>
        )}
      </section>

      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-xs text-[#9a948a]">
          Las cuentas de dueños e inmobiliarias quedan pendientes de verificación.
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
            Tu cuenta esta pendiente de verificación. Te avisaremos cuando este activa.
          </p>
        </div>
      )}
      {status === "success" && accountType === "viewer" && (
        <div className="glass-card space-y-2 p-4">
          <h4 className="text-sm text-white">Cuenta creada</h4>
          <p className="text-xs text-[#9a948a]">Ya podes iniciar sesión y guardar publicaciones.</p>
        </div>
      )}
    </form>
      <LegalModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title="T?rminos y condiciones"
        subtitle="Lineamientos de uso de Brupi."
      >
        <div className="space-y-3">
          <h4 className="text-base text-white">1. Uso responsable</h4>
          <p>
            Brupi es una plataforma para conectar personas que buscan propiedades con
            propietarios e inmobiliarias. No se permite publicar informacion falsa,
            engañosa o duplicada.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">2. Contenido y veracidad</h4>
          <p>
            Cada usuario es responsable de la informacion que publica. Brupi puede
            solicitar datos para validar publicaciones, pero no garantiza la veracidad
            total de cada anuncio.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">3. Responsabilidad</h4>
          <p>
            Brupi no se hace responsable por operaciones, transacciones o acuerdos entre
            usuarios. La plataforma actua unicamente como un canal de contacto.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">4. No somos corredores</h4>
          <p>
            Brupi no es una inmobiliaria ni corredor inmobiliario. No gestionamos
            operaciones ni cobramos comisiones por los acuerdos entre usuarios.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">5. Buenas practicas</h4>
          <p>
            Esperamos un comportamiento respetuoso entre usuarios. Las cuentas con uso
            abusivo, fraudulento o spam podran ser suspendidas.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">6. Privacidad</h4>
          <p>
            Los datos personales se utilizan solo para gestionar publicaciones y
            contactos. No compartimos informacion con terceros sin consentimiento.
          </p>
        </div>
      </LegalModal>
  </div>
  );
}
