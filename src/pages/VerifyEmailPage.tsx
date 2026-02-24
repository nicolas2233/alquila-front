import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { getSessionUser, getToken, saveSession } from "../shared/auth/session";

export function VerifyEmailPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get("token"), [location.search]);
  const sessionUser = useMemo(() => getSessionUser(), []);
  const sessionToken = useMemo(() => getToken(), []);
  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("Validando email...");

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!token) {
        setStatus("error");
        setMessage("El enlace de verificacion es invalido.");
        return;
      }
      try {
        const response = await fetch(`${env.apiUrl}/auth/verify-email/confirm`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });
        const data = await response.json().catch(() => null);
        if (!response.ok) {
          throw new Error(data?.message ?? "No pudimos validar el email.");
        }
        if (cancelled) return;
        setStatus("success");
        setMessage(data?.message ?? "Email verificado correctamente.");
        addToast("Email verificado correctamente.", "success");
        if (sessionUser && sessionToken) {
          saveSession(sessionToken, { ...sessionUser, emailVerifiedAt: new Date().toISOString() });
        }
      } catch (error) {
        if (cancelled) return;
        const msg = error instanceof Error ? error.message : "No pudimos validar el email.";
        setStatus("error");
        setMessage(msg);
        addToast(msg, "error");
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, [token, addToast, sessionToken, sessionUser]);

  useEffect(() => {
    if (status === "loading") return;
    const timeout = window.setTimeout(() => {
      if (sessionUser) {
        const role = sessionUser.role;
        if (role === "VISITOR") {
          navigate("/perfil", { replace: true });
          return;
        }
        if (["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"].includes(role)) {
          navigate("/panel?tab=profile", { replace: true });
          return;
        }
        if (role === "ADMIN") {
          navigate("/admin", { replace: true });
          return;
        }
      }
      navigate("/login", { replace: true });
    }, status === "success" ? 1300 : 1800);

    return () => window.clearTimeout(timeout);
  }, [status, navigate, sessionUser]);

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-night-900/48 shadow-card">
      <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
      <div className="relative flex min-h-[420px] items-center justify-center p-6">
        <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-night-900/40 p-6 text-center">
          <p className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">Verificacion de email</p>
          <h1 className="mt-2 font-display text-3xl text-white">
            {status === "loading"
              ? "Validando tu cuenta"
              : status === "success"
              ? "Email verificado"
              : "No pudimos validar el email"}
          </h1>
          <p
            className={`mt-3 text-sm ${
              status === "error" ? "text-[#AF8C5C]" : "text-[#D1C7BD]"
            }`}
          >
            {message}
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <button
              type="button"
              onClick={() =>
                navigate(
                  sessionUser
                    ? sessionUser.role === "VISITOR"
                      ? "/perfil"
                      : ["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"].includes(sessionUser.role)
                      ? "/panel?tab=profile"
                      : "/admin"
                    : "/login"
                )
              }
              className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-6 py-2 text-xs font-semibold text-night-900"
            >
              {sessionUser ? "Ir a tu perfil" : "Ir a login"}
            </button>
            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold text-white/90"
            >
              Ir al inicio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
