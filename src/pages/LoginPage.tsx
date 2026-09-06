import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { saveSession } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { trackEvent } from "../shared/analytics/posthog";

export function LoginPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const locationState = location.state as { from?: string } | null;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [switchingToRegister, setSwitchingToRegister] = useState(false);
  const [isEntering, setIsEntering] = useState(() => locationState?.from !== "register");
  const [verifyStatus, setVerifyStatus] = useState<"idle" | "loading">("idle");
  const [verifyCooldown, setVerifyCooldown] = useState(0);

  useEffect(() => {
    if (locationState?.from === "register") {
      const frame = window.requestAnimationFrame(() => setIsEntering(true));
      return () => window.cancelAnimationFrame(frame);
    }
  }, [locationState?.from]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("registered") === "1") {
      addToast("Cuenta creada. Revisa tu email para validarla y luego inicia sesión.", "success");
      navigate("/login", { replace: true });
    }
  }, [location.search, addToast, navigate]);

  useEffect(() => {
    if (verifyCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setVerifyCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [verifyCooldown]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");
    const normalizedEmail = email.trim().toLowerCase();

    try {
      const response = await fetch(`${env.apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail, password }),
      });

      if (!response.ok) {
        const errorData = (await response.json().catch(() => null)) as
          | { message?: string }
          | null;
        throw new Error(errorData?.message ?? "No pudimos iniciar sesión.");
      }

      const data = (await response.json()) as {
        token: string;
        user: {
          id: string;
          email: string;
          name?: string | null;
          role: string;
          status: string;
          agencyId?: string | null;
          avatarUrl?: string | null;
          emailVerifiedAt?: string | null;
          mustChangePassword?: boolean;
          subscription?: {
            planCode: string;
            planName: string;
            maxProperties: number;
            priceAmount: number;
            priceCurrency: string;
            status?: string;
            startsAt?: string | null;
            endsAt?: string | null;
            trialEndsAt?: string | null;
            isTrialActive: boolean;
            trialDaysRemaining: number;
          } | null;
        };
        message?: string;
      };

      let sessionUser = data.user;
      try {
        const meResponse = await fetch(`${env.apiUrl}/auth/me`, {
          headers: { Authorization: `Bearer ${data.token}` },
        });
        if (meResponse.ok) {
          const meData = (await meResponse.json()) as {
            user: typeof sessionUser & { agencyId?: string | null; avatarUrl?: string | null };
          };
          sessionUser = meData.user;
        }
      } catch {
        // keep base user
      }

      saveSession(data.token, sessionUser);
      setStatus("idle");
      addToast("Sesion iniciada correctamente.", "success");
      if (!sessionUser.emailVerifiedAt && sessionUser.email) {
        addToast(
          "Tu email aun no esta verificado. Puedes seguir usando la cuenta y validarlo cuando quieras.",
          "warning",
          6000,
          "Reenviar verificación",
          () => {
            void handleResendVerification(normalizedEmail);
          }
        );
      }
      if (data.message) {
        addToast(data.message, "warning");
      }
      trackEvent("login", { role: sessionUser.role });

      const nextRoute = sessionUser.mustChangePassword
        ? "/change-password"
        : sessionUser.role === "ADMIN"
        ? "/admin"
        : ["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"].includes(sessionUser.role)
        ? "/panel"
        : "/buscar";
      setTimeout(() => {
        navigate(nextRoute);
      }, 0);
      return;
    } catch (error) {
      const message = error instanceof Error ? error.message : "No pudimos iniciar sesión.";
      setStatus("error");
      setErrorMessage(message);
      if (message.toLowerCase().includes("no existe una cuenta")) {
        addToast(message, "error", 4500, "Crear cuenta", () =>
          navigate("/registro", { state: { from: "login" } })
        );
        return;
      }
      if (message.toLowerCase().includes("contraseña incorrecta")) {
        addToast(message, "error", 4500, "Recuperar cuenta", () => navigate("/recuperar"));
        return;
      }
      addToast(message, "error");
    }
  };

  const handleResendVerification = async (emailOverride?: string) => {
    if (verifyCooldown > 0) {
      addToast(`Espera ${verifyCooldown}s para reenviar la verificación.`, "warning");
      return;
    }
    const normalizedEmail = (emailOverride ?? email).trim().toLowerCase();
    if (!normalizedEmail) {
      addToast("Ingresa tu email para reenviar la verificación.", "warning");
      return;
    }
    setVerifyStatus("loading");
    try {
      const response = await fetch(`${env.apiUrl}/auth/verify-email/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? "No pudimos reenviar el email de verificación.");
      }
      addToast(data?.message ?? "Te enviamos un email de verificación.", "success");
      setVerifyCooldown(30);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "No pudimos reenviar el email de verificación.",
        "error"
      );
    } finally {
      setVerifyStatus("idle");
    }
  };

  const handleGoRegister = () => {
    if (switchingToRegister) return;
    setSwitchingToRegister(true);
    window.setTimeout(() => {
      navigate("/registro", { state: { from: "login" } });
    }, 260);
  };

  return (
    <div
      className={`relative overflow-hidden rounded-[24px] border border-white/10 bg-night-900/48 shadow-card transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] ${
        switchingToRegister ? "opacity-0 translate-y-2 scale-[0.98] blur-[1px]" : "opacity-100"
      }`}
    >
      <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative grid min-h-[500px] lg:min-h-[520px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside
          className={`hidden border-r border-white/10 bg-gradient-to-br from-[#2f2b27] via-[#3d3833] to-[#2a2622] p-6 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] lg:flex lg:flex-col lg:justify-between ${
            isEntering ? "translate-x-0 opacity-100 blur-0" : "-translate-x-7 opacity-0 blur-sm"
          }`}
        >
          <button
            type="button"
            onClick={() => navigate("/")}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
          >
            <span aria-hidden="true">{"\u2190"}</span>
            Volver al inicio
          </button>

          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">Acceso seguro</p>
            <h2 className="font-display text-3xl leading-tight text-white">
              Bienvenido de nuevo a DomusBrag
            </h2>
            <p className="max-w-sm text-sm text-[#E7E2DD]">
              Ingresa para gestionar tus publicaciones, solicitudes y panel de forma
              simple desde cualquier dispositivo.
            </p>
          </div>

          <div className="grid gap-2">
            {[
              { label: "1", title: "Iniciar sesión", detail: "Con email y contraseña." },
              { label: "2", title: "Gestiona", detail: "Publicaciones y estados." },
              { label: "3", title: "Conecta", detail: "Responde solicitudes rápido." },
            ].map((item) => (
              <div key={item.label} className="rounded-2xl border border-white/10 bg-black/20 p-3">
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-gold-500/20 text-xs font-semibold text-white">
                    {item.label}
                  </span>
                  <div>
                    <p className="text-sm text-white">{item.title}</p>
                    <p className="text-xs text-[#D1C7BD]">{item.detail}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </aside>

        <section
          className={`flex items-start justify-center p-4 transition-all duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] sm:p-5 lg:p-6 ${
            isEntering ? "translate-x-0 opacity-100 blur-0" : "translate-x-7 opacity-0 blur-sm"
          }`}
        >
          <form
            className="w-full max-w-md space-y-4"
            onSubmit={handleSubmit}
          >
            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="font-display text-3xl text-white sm:text-[2rem]">Bienvenido</h1>
              <p className="text-sm text-[#D1C7BD]">
                Ingresa con tu cuenta para continuar.
              </p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4">
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Email
                <input
                  className="w-full rounded-xl border border-white/15 bg-night-900/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-gold-400/60"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  placeholder="tuemail@ejemplo.com"
                />
              </label>

              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Contraseña
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-white/15 bg-night-900/40 px-3 py-2.5 pr-12 text-sm text-white outline-none transition focus:border-gold-400/60"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    placeholder="Ingresa tu contraseña"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#D1C7BD]"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </label>

              {status === "error" && <p className="text-xs text-[#AF8C5C]">{errorMessage}</p>}

              <div className="flex flex-wrap gap-3">
                <button
                  className="flex-1 rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-6 py-2 text-xs font-semibold text-night-900 disabled:opacity-70"
                  type="submit"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Ingresando..." : "Ingresar"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold text-white/90"
                  onClick={handleGoRegister}
                >
                  Crear cuenta
                </button>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center lg:justify-start lg:text-left">
              <button
                type="button"
                className="text-xs text-gold-400 underline"
                onClick={() => navigate("/recuperar")}
              >
                Olvidé mi contraseña
              </button>
              <button
                type="button"
                className="text-xs text-[#D1C7BD] underline disabled:opacity-60"
                onClick={() => void handleResendVerification()}
                disabled={verifyStatus === "loading" || verifyCooldown > 0}
              >
                {verifyStatus === "loading"
                  ? "Enviando verificación..."
                  : verifyCooldown > 0
                  ? `Reenviar verificación (${verifyCooldown}s)`
                  : "Reenviar verificación"}
              </button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}
