import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { LegalModal } from "../shared/ui/LegalModal";
import { Link } from "react-router-dom";
import { scrollToFirstError } from "../shared/utils/scrollToFirstError";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { trackEvent } from "../shared/analytics/posthog";
import {
  LEGAL_PRIVACY_VERSION,
  LEGAL_TERMS_VERSION,
  LegalDocumentContent,
  legalDocuments,
} from "../shared/legal/legalDocuments";

type AccountType = "viewer" | "owner" | "agency";
type PlanKey = "free" | "bronce" | "platinum" | "gold";

const planCodeByKey: Record<PlanKey, "FREE" | "BRONCE" | "PLATINUM" | "GOLD"> = {
  free: "FREE",
  bronce: "BRONCE",
  platinum: "PLATINUM",
  gold: "GOLD",
};

function extractApiErrorMessage(payload: unknown): string {
  if (!payload || typeof payload !== "object") return "No pudimos completar el registro.";

  const data = payload as {
    message?: unknown;
    issues?: Array<{ message?: string; path?: string }>;
  };

  if (typeof data.message === "string" && data.message.trim()) return data.message;

  if (Array.isArray(data.message) && data.message.length > 0) {
    const first = data.message[0] as { message?: string } | string;
    if (typeof first === "string") return first;
    if (first && typeof first === "object" && typeof first.message === "string") {
      return first.message;
    }
  }

  if (Array.isArray(data.issues) && data.issues.length > 0) {
    const first = data.issues[0];
    if (first?.path) return `${first.path}: ${first.message ?? "dato invalido"}`;
    if (first?.message) return first.message;
  }

  return "No pudimos completar el registro.";
}

const accountTypeOptions: Array<{
  key: AccountType;
  title: string;
  text: string;
  image: string;
}> = [
  {
    key: "viewer",
    title: "Buscador",
    text: "Explora y consulta propiedades.",
    image:
      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=480&q=70",
  },
  {
    key: "owner",
    title: "Dueño directo",
    text: "Publica inmuebles propios.",
    image:
      "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=480&q=70",
  },
  {
    key: "agency",
    title: "Inmobiliaria",
    text: "Gestioná tu cartera y las solicitudes.",
    image:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=480&q=70",
  },
];

// Durante la etapa inicial todas las cuentas entran en Gold sin cargo: mostrar un
// selector con precios de hasta $220.000/mes en un portal que todavia no tiene
// inventario espanta justo a las inmobiliarias que necesitamos sumar primero.
// Los planes siguen existiendo en la base, en el panel y en el backend; esto es
// solo el registro, asi que reactivar el selector es revertir este bloque.
function PlanGoldGratis({ esInmobiliaria }: { esInmobiliaria: boolean }) {
  return (
    <div className="rounded-2xl border border-gold-500/30 bg-gold-500/8 p-3">
      <span className="inline-flex rounded-full border border-gold-400/40 bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gold-300">
        Gold sin costo
      </span>
      <p className="mt-2 text-[11px] leading-relaxed text-[#D1C7BD]">
        Durante la etapa inicial todas las cuentas acceden al plan Gold sin cargo, con hasta{" "}
        {esInmobiliaria ? "50" : "10"} inmuebles publicados. No te pedimos tarjeta.
      </p>
      <p className="mt-1.5 text-[11px] leading-relaxed text-[#9f988d]">
        DomusBrag se reserva el derecho de incorporar planes pagos para inmobiliarias más
        adelante. Si eso ocurre te vamos a avisar con anticipación y vas a poder decidir si
        continuar.
      </p>
    </div>
  );
}

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const locationState = location.state as { from?: string } | null;
  const formRef = useRef<HTMLFormElement | null>(null);

  // Beta invite state
  const betaParam = useMemo(() => new URLSearchParams(location.search).get("beta"), [location.search]);
  const [betaMode, setBetaMode] = useState(false);
  const [betaTargetRole, setBetaTargetRole] = useState<"OWNER" | "AGENCY" | null>(null);
  const [betaInviteLabel, setBetaInviteLabel] = useState<string | null>(null);
  const [betaAccepted, setBetaAccepted] = useState(false);
  const [betaCheckStatus, setBetaCheckStatus] = useState<"idle" | "loading" | "invalid">("idle");

  const [accountType, setAccountType] = useState<AccountType>("viewer");
  const [plan] = useState<PlanKey>("gold");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [dni, setDni] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [ownerFirstName, setOwnerFirstName] = useState("");
  const [ownerLastName, setOwnerLastName] = useState("");
  const [ownerDni, setOwnerDni] = useState("");
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
  const [switchingToLogin, setSwitchingToLogin] = useState(false);
  const [isEntering, setIsEntering] = useState(() => locationState?.from !== "login");

  const hasFieldErrors = Object.values(fieldErrors).some(Boolean);
  const emailInvalid = !!email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const contrasenaRemaining = Math.max(0, 8 - contrasena.length);

  // Mismo patron que en LoginPage: la animacion de entrada no puede depender del state
  // de navegacion, porque cualquier navigate con replace que lo limpie cancela el frame
  // pendiente y deja los paneles en opacity-0. Ver el comentario en LoginPage.
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => setIsEntering(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!betaParam) return;
    setBetaCheckStatus("loading");
    fetch(`${env.apiUrl}/beta/invite-info?token=${encodeURIComponent(betaParam)}`)
      .then((r) => r.json())
      .then((data: { valid?: boolean; targetRole?: string; label?: string | null }) => {
        if (data.valid && (data.targetRole === "OWNER" || data.targetRole === "AGENCY")) {
          setBetaMode(true);
          setBetaTargetRole(data.targetRole);
          setBetaInviteLabel(data.label ?? null);
          setAccountType(data.targetRole === "AGENCY" ? "agency" : "owner");
          setBetaCheckStatus("idle");
        } else {
          setBetaCheckStatus("invalid");
        }
      })
      .catch(() => setBetaCheckStatus("invalid"));
  }, [betaParam]);

  useEffect(() => {
    if (status === "error" || hasFieldErrors) scrollToFirstError(formRef.current);
  }, [status, hasFieldErrors, accountType]);

  const handleGoLogin = () => {
    if (switchingToLogin) return;
    setSwitchingToLogin(true);
    window.setTimeout(() => navigate("/login", { state: { from: "register" } }), 260);
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    setFieldErrors({});
    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (!email || !contrasena) {
        setFieldErrors({ email: !email, password: !contrasena });
        throw new Error("Email y contraseña son obligatorios.");
      }

      if (!termsAccepted) {
        setFieldErrors({ termsAccepted: true });
        throw new Error("Debes aceptar los términos y condiciones.");
      }

      if (betaMode && !betaAccepted) {
        setFieldErrors({ betaAccepted: true });
        throw new Error("Debes aceptar el compromiso beta para continuar.");
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
          throw new Error("El teléfono es obligatorio para dueños.");
        }
        if (!ownerFirstName || !ownerLastName || !ownerDni || !ownerBirthDate) {
          setFieldErrors({
            ownerFirstName: !ownerFirstName,
            ownerLastName: !ownerLastName,
            ownerDni: !ownerDni,
            ownerBirthDate: !ownerBirthDate,
          });
          throw new Error("Completa todos los datos del dueño.");
        }
      }

      if (accountType === "agency") {
        if (!phone) {
          setFieldErrors({ phone: true });
          throw new Error("El teléfono es obligatorio para inmobiliarias.");
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
      let payload: Record<string, string | boolean> = {};

      if (accountType === "viewer") {
        endpoint = "/users";
        payload = {
          email: normalizedEmail,
          password: contrasena,
          firstName,
          lastName,
          dni,
          phone,
          planCode: planCodeByKey[plan],
          termsAccepted: true,
          termsVersion: LEGAL_TERMS_VERSION,
          privacyAccepted: true,
          privacyVersion: LEGAL_PRIVACY_VERSION,
        };
      } else if (accountType === "owner") {
        endpoint = "/owners";
        payload = {
          email: normalizedEmail,
          password: contrasena,
          phone,
          firstName: ownerFirstName,
          lastName: ownerLastName,
          dni: ownerDni,
          birthDate: ownerBirthDate,
          planCode: planCodeByKey[plan],
          ...(betaMode && betaParam ? { betaToken: betaParam } : {}),
          termsAccepted: true,
          termsVersion: LEGAL_TERMS_VERSION,
          privacyAccepted: true,
          privacyVersion: LEGAL_PRIVACY_VERSION,
        };
      } else {
        endpoint = "/agencies";
        payload = {
          email: normalizedEmail,
          password: contrasena,
          phone,
          name: agencyName,
          legalName: agencyLegalName,
          cuit: agencyCuit,
          licenseNumber: agencyLicense,
          planCode: planCodeByKey[plan],
          ...(betaMode && betaParam ? { betaToken: betaParam } : {}),
          termsAccepted: true,
          termsVersion: LEGAL_TERMS_VERSION,
          privacyAccepted: true,
          privacyVersion: LEGAL_PRIVACY_VERSION,
        };
      }

      const response = await fetch(`${env.apiUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(extractApiErrorMessage(data));
      }

      setStatus("success");
      const successMsg =
        (typeof data?.verificationMessage === "string" && data.verificationMessage) ||
        "Cuenta creada correctamente. Revisa tu email para validarla.";
      addToast(successMsg, "success");
      window.setTimeout(() => {
        trackEvent("sign_up", { accountType, plan });
        navigate("/login?registered=1", { state: { from: "register" } });
      }, 500);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error en el registro.";
      setStatus("error");
      setErrorMessage(message);
      addToast(message, "error");
    }
  };

  const fieldClass = (hasError: boolean) =>
    hasError
      ? "w-full rounded-xl border border-red-500/70 bg-night-900/40 px-3 py-2.5 text-sm text-white outline-none"
      : "w-full rounded-xl border border-white/15 bg-night-900/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-gold-400/60";

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-night-900/48 shadow-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        switchingToLogin ? "opacity-0 translate-y-2 scale-[0.98] blur-[1px]" : "opacity-100"
      }`}
    >
      <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative grid min-h-[520px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside
          className={`hidden border-r border-white/10 bg-gradient-to-br from-[#2f2b27] via-[#3d3833] to-[#2a2622] p-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex lg:flex-col lg:gap-4 ${
            isEntering ? "translate-x-0 opacity-100 blur-0" : "-translate-x-7 opacity-0 blur-sm"
          }`}
        >
          <button
            type="button"
            onClick={handleGoLogin}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
          >
            <span aria-hidden="true">{"\u2190"}</span>
            Iniciar sesión
          </button>

          {betaMode ? (
            <div className="rounded-2xl border border-gold-500/40 bg-gold-500/8 p-4 shadow-soft">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-gold-400/50 bg-gold-500/15 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-gold-300">
                ✦ Acceso Beta
              </span>
              <h2 className="mt-2 font-display text-[1.6rem] leading-tight text-white">
                Bienvenido a DomusBrag
              </h2>
              <p className="mt-2 text-sm text-[#E7E2DD]">
                Una nueva plataforma inmobiliaria pensada para facilitar la publicación y búsqueda de propiedades de forma más simple, ordenada y cercana.
              </p>
              <p className="mt-3 text-sm text-[#D1C7BD]">
                La plataforma muestra propiedades según la ubicación del usuario, pero también permite buscar y publicar en otras localidades, ampliando el alcance para quienes quieren vender, alquilar o encontrar una propiedad en distintos lugares.
              </p>
              {betaInviteLabel && (
                <p className="mt-3 text-[11px] text-[#9f988d]">Grupo: {betaInviteLabel}</p>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-soft">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#D1C7BD]">Crear cuenta</p>
              <h2 className="mt-2 font-display text-[2rem] leading-tight text-white">
                Empeza en DomusBrag con el perfil correcto
              </h2>
              <p className="mt-2 max-w-sm text-sm text-[#E7E2DD]">
                Buscador, dueño directo o inmobiliaria. Un flujo claro y rápido para arrancar.
              </p>
            </div>
          )}

          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/15 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#D1C7BD]">Tipo de cuenta</p>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-[#E7E2DD]">
                {accountTypeOptions.find((item) => item.key === accountType)?.title}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2.5">
              {accountTypeOptions.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setAccountType(item.key)}
                  className={
                    accountType === item.key
                      ? "relative rounded-2xl border border-gold-500/60 bg-night-900/70 p-2 text-left ring-1 ring-gold-500/25 transition-all duration-300"
                      : "relative rounded-2xl border border-white/10 bg-black/20 p-2 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20"
                  }
                >
                  {accountType === item.key && (
                    <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-gold-400 shadow-[0_0_8px_rgba(175,140,92,0.8)]" />
                  )}
                  <img
                    src={item.image}
                    alt={item.title}
                    className="h-12 w-full rounded-xl object-cover"
                    loading="lazy"
                  />
                  <p className="mt-1.5 text-xs font-medium text-white">{item.title}</p>
                  <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-[#D1C7BD]">
                    {item.text}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 rounded-2xl border border-white/10 bg-black/15 p-3">
            <div className="flex items-center justify-between">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#D1C7BD]">Plan</p>
              <span className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] text-[#E7E2DD]">
                {betaMode ? "Gold Beta" : "Gold"}
              </span>
            </div>
            {betaMode ? (
              <div className="rounded-2xl border border-gold-500/30 bg-gold-500/8 p-3">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-gold-400/40 bg-gold-500/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-gold-300">
                    Gold · 30 días gratis
                  </span>
                </div>
                <p className="mt-2 text-[11px] leading-relaxed text-[#D1C7BD]">
                  Como usuario beta obtenés acceso Gold sin costo por 30 días desde la creación de tu cuenta. A cambio, nos comprometemos a escuchar tu feedback.
                </p>
                <p className="mt-1.5 text-[11px] text-[#9f988d]">
                  Sin tarjeta requerida. El acceso vence automáticamente al mes 30.
                </p>
              </div>
            ) : null}
            {accountType === "viewer" ? (
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/8 p-3">
                <div className="text-xs font-semibold text-white">Plan Free incluido</div>
                <p className="mt-1 text-[11px] leading-tight text-[#D1C7BD]">
                  Como buscador accedes al plan Free sin costo: explorar, guardar y recibir alertas.
                </p>
              </div>
            ) : betaMode ? null : (
              <PlanGoldGratis esInmobiliaria={accountType === "agency"} />
            )}
          </div>
        </aside>

        <section
          className={`flex items-start justify-center p-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5 lg:p-6 ${
            isEntering ? "translate-x-0 opacity-100 blur-0" : "translate-x-7 opacity-0 blur-sm"
          }`}
        >
          <form ref={formRef} className="w-full max-w-2xl space-y-4" onSubmit={handleSubmit}>
            {betaCheckStatus === "loading" && (
              <div className="rounded-2xl border border-gold-500/20 bg-gold-500/5 p-4 text-xs text-[#D1C7BD]">
                Verificando invitación beta...
              </div>
            )}
            {betaCheckStatus === "invalid" && (
              <div className="rounded-2xl border border-rose-400/30 bg-rose-500/8 p-4 text-xs text-rose-200">
                El link de invitación no es válido o ya expiró. Podés registrarte normalmente sin beneficio beta.
              </div>
            )}
            {betaMode && (
              <div className="rounded-2xl border border-gold-500/40 bg-gold-500/8 p-4">
                <div className="flex items-center gap-2">
                  <span className="rounded-full border border-gold-400/50 bg-gold-500/15 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-gold-300">
                    ✦ Invitación Beta · Acceso Gold 30 días
                  </span>
                  {betaInviteLabel && (
                    <span className="text-[11px] text-[#9f988d]">{betaInviteLabel}</span>
                  )}
                </div>
                <p className="mt-2 text-xs leading-relaxed text-[#D1C7BD]">
                  Estás accediendo como usuario beta de DomusBrag. Obtenés el plan Gold sin costo por 30 días. A cambio, nos comprometemos a escuchar tu experiencia y observaciones desde el panel.
                </p>
              </div>
            )}
            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="font-display text-3xl text-white sm:text-[2rem]">
                {betaMode ? "Registrate como beta tester" : "Crear cuenta"}
              </h1>
              <p className="text-sm text-[#D1C7BD]">
                {betaMode
                  ? `Completa tus datos para activar el acceso ${betaTargetRole === "AGENCY" ? "de inmobiliaria" : "de dueño directo"}.`
                  : "Elegí tu perfil y completá los datos."}
              </p>
            </div>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4 lg:hidden">
              <div className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Tipo de cuenta</div>
              <div className="grid gap-3 md:grid-cols-3">
                {accountTypeOptions.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setAccountType(item.key)}
                    className={
                      accountType === item.key
                        ? "rounded-2xl border border-gold-500/50 bg-night-900/48 p-3 text-left shadow-soft transition-all duration-300"
                        : "rounded-2xl border border-white/10 bg-night-900/24 p-3 text-left transition-all duration-300"
                    }
                  >
                    <h4 className="text-sm text-white">{item.title}</h4>
                    <p className="mt-1 text-[11px] text-[#D1C7BD]">{item.text}</p>
                  </button>
                ))}
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Credenciales</div>
              <div className="grid gap-3 md:grid-cols-2">
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Email
                  <input
                    className={fieldClass(!!fieldErrors.email)}
                    data-error={fieldErrors.email ? "true" : undefined}
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="tuemail@ejemplo.com"
                    autoComplete="email"
                  />
                  <span className={emailInvalid ? "text-[11px] text-[#AF8C5C]" : "text-[11px] text-[#D1C7BD]"}>
                    {emailInvalid ? "Email invalido." : "Formato válido de email."}
                  </span>
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Contraseña
                  <input
                    type="password"
                    className={fieldClass(!!fieldErrors.password)}
                    data-error={fieldErrors.password ? "true" : undefined}
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  {/* Con el campo vacío esto mostraba "Te faltan 8 caracteres" antes de que el
                      usuario escribiera nada: un error de entrada sobre algo que todavía no hizo. */}
                  <span
                    className={
                      contrasena.length > 0 && contrasenaRemaining > 0
                        ? "text-[11px] text-[#AF8C5C]"
                        : "text-[11px] text-[#D1C7BD]"
                    }
                  >
                    {contrasena.length === 0
                      ? "Mínimo 8 caracteres."
                      : contrasenaRemaining > 0
                        ? `Te faltan ${contrasenaRemaining} caracteres.`
                        : "Contraseña válida."}
                  </span>
                </label>
              </div>
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Datos del perfil</div>
              {accountType === "viewer" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Nombre
                    <input className={fieldClass(!!fieldErrors.firstName)} data-error={fieldErrors.firstName ? "true" : undefined} value={firstName} onChange={(event) => setFirstName(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Apellido
                    <input className={fieldClass(!!fieldErrors.lastName)} data-error={fieldErrors.lastName ? "true" : undefined} value={lastName} onChange={(event) => setLastName(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    DNI
                    <input className={fieldClass(!!fieldErrors.dni)} data-error={fieldErrors.dni ? "true" : undefined} value={dni} onChange={(event) => setDni(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Teléfono
                    <input className={fieldClass(!!fieldErrors.phone)} data-error={fieldErrors.phone ? "true" : undefined} value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </label>
                </div>
              )}

              {accountType === "owner" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Telefono
                    <input className={fieldClass(!!fieldErrors.phone)} data-error={fieldErrors.phone ? "true" : undefined} value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Nombre
                    <input className={fieldClass(!!fieldErrors.ownerFirstName)} data-error={fieldErrors.ownerFirstName ? "true" : undefined} value={ownerFirstName} onChange={(event) => setOwnerFirstName(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Apellido
                    <input className={fieldClass(!!fieldErrors.ownerLastName)} data-error={fieldErrors.ownerLastName ? "true" : undefined} value={ownerLastName} onChange={(event) => setOwnerLastName(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    DNI
                    <input className={fieldClass(!!fieldErrors.ownerDni)} data-error={fieldErrors.ownerDni ? "true" : undefined} value={ownerDni} onChange={(event) => setOwnerDni(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Fecha de nacimiento
                    <input type="date" className={fieldClass(!!fieldErrors.ownerBirthDate)} data-error={fieldErrors.ownerBirthDate ? "true" : undefined} value={ownerBirthDate} onChange={(event) => setOwnerBirthDate(event.target.value)} />
                  </label>
                </div>
              )}

              {accountType === "agency" && (
                <div className="grid gap-3 md:grid-cols-2">
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Telefono
                    <input className={fieldClass(!!fieldErrors.phone)} data-error={fieldErrors.phone ? "true" : undefined} value={phone} onChange={(event) => setPhone(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Nombre comercial
                    <input className={fieldClass(!!fieldErrors.agencyName)} data-error={fieldErrors.agencyName ? "true" : undefined} value={agencyName} onChange={(event) => setAgencyName(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Razón social
                    <input className={fieldClass(!!fieldErrors.agencyLegalName)} data-error={fieldErrors.agencyLegalName ? "true" : undefined} value={agencyLegalName} onChange={(event) => setAgencyLegalName(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    CUIT
                    <input className={fieldClass(!!fieldErrors.agencyCuit)} data-error={fieldErrors.agencyCuit ? "true" : undefined} value={agencyCuit} onChange={(event) => setAgencyCuit(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Matrícula
                    <input className={fieldClass(!!fieldErrors.agencyLicense)} data-error={fieldErrors.agencyLicense ? "true" : undefined} value={agencyLicense} onChange={(event) => setAgencyLicense(event.target.value)} />
                  </label>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4 lg:hidden">
              <div className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Plan</div>
              {accountType === "viewer" ? (
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/8 p-3">
                  <div className="text-sm font-semibold text-white">Plan Free incluido</div>
                  <p className="mt-1 text-[11px] text-[#D1C7BD]">
                    Como buscador accedes sin costo para explorar, guardar y recibir alertas.
                  </p>
                </div>
              ) : (
                <PlanGoldGratis esInmobiliaria={accountType === "agency"} />
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4">
              <label className="flex items-start gap-3 text-xs text-[#D1C7BD]">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 accent-[#AF8C5C]"
                  checked={termsAccepted}
                  onChange={(event) => {
                    setTermsAccepted(event.target.checked);
                    setFieldErrors((prev) => ({ ...prev, termsAccepted: false }));
                  }}
                />
                <span>
                  Acepto los términos y condiciones y la política de privacidad de DomusBrag.{" "}
                  <button type="button" className="underline text-[#d8c5a4]" onClick={() => setShowTerms(true)}>
                    Leer términos
                  </button>
                  {" · "}
                  <Link to="/legal/privacidad" target="_blank" className="underline text-[#d8c5a4]">
                    privacidad
                  </Link>
                  {" · "}
                  <Link to="/legal/terminos" target="_blank" className="underline text-[#d8c5a4]">
                    version completa
                  </Link>
                </span>
              </label>
              {fieldErrors.termsAccepted && (
                <p className="text-[11px] text-[#AF8C5C]">
                  Debes aceptar términos y privacidad para continuar.
                </p>
              )}

              {betaMode && (
                <>
                  <div className="border-t border-white/10 pt-3">
                    <div className="mb-2 rounded-xl border border-gold-500/20 bg-gold-500/6 p-3 text-[11px] leading-relaxed text-[#D1C7BD]">
                      <strong className="text-gold-300">Compromiso del usuario beta:</strong> como parte de este programa, me comprometo a utilizar la plataforma y compartir mis observaciones, sugerencias y experiencia de uso desde la sección "Observaciones Beta" del panel. A cambio, DomusBrag me otorga 30 días de acceso Gold sin costo.
                    </div>
                    <label className="flex items-start gap-3 text-xs text-[#D1C7BD]">
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 accent-[#AF8C5C]"
                        checked={betaAccepted}
                        onChange={(event) => {
                          setBetaAccepted(event.target.checked);
                          setFieldErrors((prev) => ({ ...prev, betaAccepted: false }));
                        }}
                      />
                      <span>
                        Acepto el compromiso beta: utilizaré la plataforma y compartiré mi feedback sincero a cambio del acceso Gold gratuito por 30 días.
                      </span>
                    </label>
                  </div>
                  {fieldErrors.betaAccepted && (
                    <p className="text-[11px] text-[#AF8C5C]">
                      Debes aceptar el compromiso beta para continuar.
                    </p>
                  )}
                </>
              )}
            </section>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold text-white/90"
                onClick={handleGoLogin}
              >
                Ya tengo una cuenta
              </button>
              <button
                className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-6 py-2 text-xs font-semibold text-night-900 disabled:opacity-70"
                type="submit"
                disabled={status === "loading"}
              >
                {status === "loading" ? "Creando..." : "Crear cuenta"}
              </button>
            </div>

            {status === "error" && <p className="text-xs text-[#AF8C5C]">{errorMessage}</p>}
            {status === "success" && (
              <div className="rounded-2xl border border-white/10 bg-night-900/40 p-4">
                <h4 className="text-sm text-white">Cuenta creada</h4>
                <p className="mt-1 text-xs text-[#D1C7BD]">
                  En instantes te redirigimos para iniciar sesión.
                </p>
              </div>
            )}
          </form>
        </section>
      </div>

      <LegalModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title={legalDocuments.terminos.title}
        subtitle={legalDocuments.terminos.subtitle}
      >
        <LegalDocumentContent document={legalDocuments.terminos} />
      </LegalModal>
    </div>
  );
}



