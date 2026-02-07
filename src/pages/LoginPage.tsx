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
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("registered") === "1") {
      addToast("Cuenta creada. Ahora inicia sesion.", "success");
      navigate("/login", { replace: true });
    }
  }, [location.search, addToast, navigate]);

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
        throw new Error(errorData?.message ?? "No pudimos iniciar sesion.");
      }

      const data = (await response.json()) as {
        token: string;
        user: {
          id: string;
          email: string;
          name?: string | null;
          role: string;
          status: string;
          avatarUrl?: string | null;
          mustChangePassword?: boolean;
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
      const message = error instanceof Error ? error.message : "No pudimos iniciar sesion.";
      setStatus("error");
      setErrorMessage(message);
      if (message.toLowerCase().includes("no existe una cuenta")) {
        addToast(message, "error", 4500, "Crear cuenta", () => navigate("/registro"));
        return;
      }
      if (message.toLowerCase().includes("contrasena incorrecta")) {
        addToast(message, "error", 4500, "Recuperar cuenta", () => navigate("/recuperar"));
        return;
      }
      addToast(message, "error");
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl text-white">Login</h2>
        <p className="text-sm text-[#9a948a]">Ingresa con tu email y contrasena.</p>
      </div>

      <form
        className="glass-card space-y-4 p-6"
        onSubmit={handleSubmit}
      >
        <label className="space-y-2 text-xs text-[#9a948a]">
          Email
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          Contrasena
          <input
            type="password"
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {status === "error" && <p className="text-xs text-[#f5b78a]">{errorMessage}</p>}
        <div className="flex flex-wrap gap-3">
          <button
            className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-6 py-2 text-xs font-semibold text-night-900"
            type="submit"
            disabled={status === "loading"}
          >
            {status === "loading" ? "Ingresando..." : "Ingresar"}
          </button>
          <button
            type="button"
            className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold text-white/90"
            onClick={() => navigate("/registro")}
          >
            Crear cuenta
          </button>
        </div>
        <button
          type="button"
          className="text-xs text-gold-400 underline"
          onClick={() => navigate("/recuperar")}
        >
          Olvide mi contrasena
        </button>
      </form>
    </div>
  );
}
