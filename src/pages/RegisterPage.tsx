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

const ANNUAL_DISCOUNT_PERCENT = 20;

function getAnnualOffer(priceLabel: string) {
  const numeric = Number.parseFloat(priceLabel.replace(/[^\d.]/g, ""));
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return null;
  }
  const annualBase = numeric * 12;
  const annualPrice = Math.round(annualBase * (1 - ANNUAL_DISCOUNT_PERCENT / 100) * 100) / 100;
  const monthlyEquivalent = Math.round((annualPrice / 12) * 100) / 100;
  return {
    annualPriceLabel: `$${annualPrice}`,
    monthlyEquivalentLabel: `$${monthlyEquivalent}`,
  };
}

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

const planOptions = [
  {
    key: "free",
    label: "Free",
    price: "$0",
    description: "Ideal para empezar y explorar.",
    promo: "",
    perks: ["Búsqueda", "Guardados", "Alertas"],
  },
  {
    key: "bronce",
    label: "Bronce",
    price: "$15000",
    description: "Hasta 3 inmuebles. Ideal para dueños directos.",
    promo: "Primer mes gratis",
    perks: ["Hasta 3 inmuebles", "Panel de gestion", "Contacto directo"],
  },
  {
    key: "platinum",
    label: "Platinum",
    price: "$30000",
    description: "Plan superior con mayor capacidad y herramientas.",
    promo: "Primer mes gratis",
    perks: ["Capacidad ampliada", "Perfil profesional", "Mayor visibilidad"],
  },
  {
    key: "gold",
    label: "Gold",
    price: "$45000",
    description: "Mayor capacidad y soporte prioritario.",
    promo: "Primer mes gratis",
    perks: ["Capacidad máxima", "Soporte prioritario", "Posicionamiento"],
  },
];

const planOverridesByAccountType: Record<
  AccountType,
  Record<PlanKey, { price: string; description: string; promo?: string; disabledHint?: string }>
> = {
  viewer: {
    free: {
      price: "$0",
      description: "Explora, guarda y recibe alertas. Sin publicaciones.",
    },
    bronce: {
      price: "$15000",
      description: "No disponible para buscador.",
      disabledHint: "Solo para dueños directos.",
    },
    platinum: {
      price: "$120000",
      description: "No disponible para buscador.",
      disabledHint: "Solo para perfiles publicadores.",
    },
    gold: {
      price: "$220000",
      description: "No disponible para buscador.",
      disabledHint: "Solo para perfiles publicadores.",
    },
  },
  owner: {
    free: {
      price: "$0",
      description: "Publica 1 inmueble gratis para probar la plataforma.",
    },
    bronce: {
      price: "$15000",
      description: "Hasta 3 inmuebles. Ideal para empezar.",
      promo: "Primer mes gratis",
    },
    platinum: {
      price: "$30000",
      description: "Hasta 6 inmuebles. Para propietarios con varias unidades.",
      promo: "Primer mes gratis",
    },
    gold: {
      price: "$45000",
      description: "Hasta 10 inmuebles. Para cartera personal amplia.",
      promo: "Primer mes gratis",
    },
  },
  agency: {
    free: {
      price: "$0",
      description: "No disponible para inmobiliarias.",
      disabledHint: "Las inmobiliarias empiezan en Platinum.",
    },
    bronce: {
      price: "$15000",
      description: "No disponible para inmobiliarias.",
      disabledHint: "Las inmobiliarias usan planes de mayor capacidad.",
    },
    platinum: {
      price: "$120000",
      description: "Hasta 25 inmuebles. Para inmobiliarias chicas/medianas.",
      promo: "Primer mes gratis",
    },
    gold: {
      price: "$220000",
      description: "Hasta 50 inmuebles. Para inmobiliarias con mayor cartera.",
      promo: "Primer mes gratis",
    },
  },
};

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
    text: "Gestiona cartera y equipo.",
    image:
      "https://images.unsplash.com/photo-1460317442991-0ec209397118?auto=format&fit=crop&w=480&q=70",
  },
];

export function RegisterPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { addToast } = useToast();
  const locationState = location.state as { from?: string } | null;
  const formRef = useRef<HTMLFormElement | null>(null);

  const [accountType, setAccountType] = useState<AccountType>("viewer");
  const [plan, setPlan] = useState<PlanKey>("free");
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

  const planChoices = useMemo(() => planOptions, []);
  const availablePlans = useMemo<PlanKey[]>(() => {
    if (accountType === "viewer") return ["free"];
    if (accountType === "owner") return ["free", "bronce", "platinum", "gold"];
    return ["platinum", "gold"];
  }, [accountType]);

  const planDisplayConfig = useMemo(() => planOverridesByAccountType[accountType], [accountType]);
  const visiblePlanChoices = useMemo(
    () => planChoices.filter((item) => availablePlans.includes(item.key as PlanKey)),
    [planChoices, availablePlans]
  );

  useEffect(() => {
    if (locationState?.from === "login") {
      const frame = window.requestAnimationFrame(() => setIsEntering(true));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [locationState?.from]);

  useEffect(() => {
    if (!availablePlans.includes(plan)) {
      setPlan(availablePlans[0]);
    }
  }, [availablePlans, plan]);

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

          <div className="rounded-2xl border border-white/10 bg-black/20 p-4 shadow-soft">
            <p className="text-[11px] uppercase tracking-[0.2em] text-[#D1C7BD]">Crear cuenta</p>
            <h2 className="mt-2 font-display text-[2rem] leading-tight text-white">
              Empeza en DomusBrag con el perfil correcto
            </h2>
            <p className="mt-2 max-w-sm text-sm text-[#E7E2DD]">
              Buscador, dueño directo o inmobiliaria. Un flujo claro y rápido para arrancar.
            </p>
          </div>

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
                {planChoices.find((item) => item.key === plan)?.label}
              </span>
            </div>
            {accountType !== "viewer" && (
              <div className="space-y-1">
                <p className="text-[11px] leading-tight text-[#D1C7BD]">
                  Podés mejorar el plan, volver a uno anterior o cancelar la suscripción en
                  cualquier momento.
                </p>
                <p className="text-[11px] leading-tight text-[#D1C7BD]">
                  No te pedimos tarjeta para crear la cuenta. En planes pagos se solicita el medio
                  de pago al momento de publicar y ahí se activa el primer mes gratis.
                </p>
              </div>
            )}
            {accountType === "viewer" ? (
              <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/8 p-3">
                <div className="text-xs font-semibold text-white">Plan Free incluido</div>
                <p className="mt-1 text-[11px] leading-tight text-[#D1C7BD]">
                  Como buscador accedes al plan Free sin costo: explorar, guardar y recibir alertas.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                {visiblePlanChoices.map((item) => (
                  (() => {
                    const disabled = false;
                    const selected = plan === item.key;
                    const planView = planDisplayConfig[item.key as PlanKey];
                    const annualOffer = getAnnualOffer(planView.price);
                    return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => {
                      if (!disabled) setPlan(item.key as PlanKey);
                    }}
                    disabled={disabled}
                    className={
                      selected
                        ? "rounded-2xl border border-gold-500/60 bg-gradient-to-br from-[#4a433c]/60 to-[#2b2723]/80 p-2.5 text-left ring-1 ring-gold-500/25 transition-all duration-300"
                        : "rounded-2xl border border-white/10 bg-black/20 p-2.5 text-left transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20"
                    }
                  >
                    {planView.promo ? (
                      <span className="mb-1 inline-flex rounded-full border border-emerald-300/45 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                        {planView.promo}
                      </span>
                    ) : null}
                    <div className="text-xs font-medium text-white">{item.label}</div>
                    <div className="mt-0.5 text-xl font-semibold text-white">
                      {planView.price}
                      <span className="text-[11px] font-normal text-[#D1C7BD]"> /mes</span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-[10px] leading-tight text-[#D1C7BD]">
                      {planView.description}
                    </p>
                    {annualOffer && (
                      <p className="mt-1 text-[10px] leading-tight text-emerald-200/90">
                        Anual {annualOffer.annualPriceLabel} (-{ANNUAL_DISCOUNT_PERCENT}%) · equiv.{" "}
                        {annualOffer.monthlyEquivalentLabel}/mes
                      </p>
                    )}
                  </button>
                    );
                  })()
                ))}
              </div>
            )}
          </div>
        </aside>

        <section
          className={`flex items-start justify-center p-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5 lg:p-6 ${
            isEntering ? "translate-x-0 opacity-100 blur-0" : "translate-x-7 opacity-0 blur-sm"
          }`}
        >
          <form ref={formRef} className="w-full max-w-2xl space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="font-display text-3xl text-white sm:text-[2rem]">Crear cuenta</h1>
              <p className="text-sm text-[#D1C7BD]">Elegi tu perfil y completa los datos.</p>
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
                    {emailInvalid ? "Email invalido." : "Formato valido de email."}
                  </span>
                </label>
                <label className="space-y-2 text-xs text-[#D1C7BD]">
                  Contrasena
                  <input
                    type="password"
                    className={fieldClass(!!fieldErrors.password)}
                    data-error={fieldErrors.password ? "true" : undefined}
                    value={contrasena}
                    onChange={(event) => setContrasena(event.target.value)}
                    placeholder="Minimo 8 caracteres"
                    autoComplete="new-password"
                  />
                  <span className={contrasenaRemaining > 0 ? "text-[11px] text-[#AF8C5C]" : "text-[11px] text-[#D1C7BD]"}>
                    {contrasenaRemaining > 0
                      ? `Te faltan ${contrasenaRemaining} caracteres.`
                      : "Contrasena valida."}
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
                    Telefono
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
                    Razon social
                    <input className={fieldClass(!!fieldErrors.agencyLegalName)} data-error={fieldErrors.agencyLegalName ? "true" : undefined} value={agencyLegalName} onChange={(event) => setAgencyLegalName(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    CUIT
                    <input className={fieldClass(!!fieldErrors.agencyCuit)} data-error={fieldErrors.agencyCuit ? "true" : undefined} value={agencyCuit} onChange={(event) => setAgencyCuit(event.target.value)} />
                  </label>
                  <label className="space-y-2 text-xs text-[#D1C7BD]">
                    Matricula
                    <input className={fieldClass(!!fieldErrors.agencyLicense)} data-error={fieldErrors.agencyLicense ? "true" : undefined} value={agencyLicense} onChange={(event) => setAgencyLicense(event.target.value)} />
                  </label>
                </div>
              )}
            </section>

            <section className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4 lg:hidden">
              <div className="text-xs uppercase tracking-[0.18em] text-[#D1C7BD]">Plan</div>
              {accountType !== "viewer" && (
                <div className="space-y-1">
                  <p className="text-[11px] leading-tight text-[#D1C7BD]">
                    Podés mejorar el plan, volver a uno anterior o cancelar la suscripción en
                    cualquier momento.
                  </p>
                  <p className="text-[11px] leading-tight text-[#D1C7BD]">
                    No te pedimos tarjeta para crear la cuenta. En planes pagos se solicita el
                    medio de pago al momento de publicar y ahí se activa el primer mes gratis.
                  </p>
                </div>
              )}
              {accountType === "viewer" ? (
                <div className="rounded-2xl border border-emerald-300/25 bg-emerald-500/8 p-3">
                  <div className="text-sm font-semibold text-white">Plan Free incluido</div>
                  <p className="mt-1 text-[11px] text-[#D1C7BD]">
                    Como buscador accedes sin costo para explorar, guardar y recibir alertas.
                  </p>
                </div>
              ) : (
                <div className="grid gap-3 md:grid-cols-2">
                {visiblePlanChoices.map((item) => (
                  (() => {
                    const disabled = false;
                    const selected = plan === item.key;
                    const planView = planDisplayConfig[item.key as PlanKey];
                    const annualOffer = getAnnualOffer(planView.price);
                    return (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => {
                        if (!disabled) setPlan(item.key as PlanKey);
                      }}
                      disabled={disabled}
                      className={
                        selected
                          ? "rounded-2xl border border-gold-500/60 bg-emerald-500/10 p-3 text-left shadow-[0_0_0_1px_rgba(16,185,129,0.35)] transition-all duration-300"
                          : "rounded-2xl border border-white/10 bg-night-900/24 p-3 text-left transition-all duration-300"
                      }
                    >
                      {planView.promo ? (
                        <span className="mb-1 inline-flex rounded-full border border-emerald-300/45 bg-emerald-500/15 px-2 py-0.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-emerald-200">
                          {planView.promo}
                        </span>
                      ) : null}
                      <div className="text-sm text-white">{item.label}</div>
                      <div className="mt-1 text-xl font-semibold text-white">
                        {planView.price}
                        <span className="text-[11px] font-normal text-[#D1C7BD]"> /mes</span>
                      </div>
                      <p className="mt-1 text-[11px] text-[#D1C7BD]">{planView.description}</p>
                      {annualOffer && (
                        <p className="mt-1 text-[10px] text-emerald-200/90">
                          Anual {annualOffer.annualPriceLabel} (-{ANNUAL_DISCOUNT_PERCENT}%) · equiv.{" "}
                          {annualOffer.monthlyEquivalentLabel}/mes
                        </p>
                      )}
                    </button>
                      );
                    })()
                  ))}
                </div>
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



