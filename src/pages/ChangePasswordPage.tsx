import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { getToken, clearSession } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";

export function ChangePasswordPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");

    try {
      const token = getToken();
      if (!token) throw new Error("Sesion expirada.");

      const response = await fetch(`${env.apiUrl}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ password, confirmPassword }),
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.message ?? "No pudimos actualizar la contrasena.");
      }

      setStatus("success");
      setMessage("Contrasena actualizada. Inicia sesion nuevamente.");
      addToast("Contrasena actualizada.", "success");
      clearSession();
      setTimeout(() => navigate("/login"), 500);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "No pudimos actualizar la contrasena.";
      setStatus("error");
      setMessage(msg);
      addToast(msg, "error");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-white/10 bg-night-900/48 shadow-card">
      <div className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-gold-500/20 blur-3xl" />
      <div className="absolute -bottom-24 -right-16 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

      <div className="relative grid min-h-[500px] lg:min-h-[520px] lg:grid-cols-[0.95fr_1.05fr]">
        <aside className="hidden border-r border-white/10 bg-gradient-to-br from-[#2f2b27] via-[#3d3833] to-[#2a2622] p-6 lg:flex lg:flex-col lg:justify-between">
          <button
            type="button"
            onClick={() => navigate("/login")}
            className="inline-flex w-fit items-center gap-2 rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
          >
            <span aria-hidden="true">{"\u2190"}</span>
            Volver al login
          </button>

          <div className="space-y-4">
            <p className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">Cambio obligatorio</p>
            <h2 className="font-display text-3xl leading-tight text-white">Actualiza tu contrasena</h2>
            <p className="max-w-sm text-sm text-[#E7E2DD]">
              Por seguridad, primero debes crear una nueva clave para continuar usando tu cuenta.
            </p>
          </div>

          <div className="grid gap-2">
            {[
              { label: "1", title: "Nueva clave", detail: "Minimo 8 caracteres." },
              { label: "2", title: "Confirmacion", detail: "Debe coincidir." },
              { label: "3", title: "Acceso seguro", detail: "Inicia sesion otra vez." },
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

        <section className="flex items-start justify-center p-4 sm:p-5 lg:p-6">
          <form className="w-full max-w-md space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-1.5 text-center lg:text-left">
              <h1 className="font-display text-3xl text-white sm:text-[2rem]">Cambiar contrasena</h1>
              <p className="text-sm text-[#D1C7BD]">Completa los campos para guardar tu nueva clave.</p>
            </div>

            <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/32 p-4">
              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Nueva contrasena
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-white/15 bg-night-900/40 px-3 py-2.5 pr-14 text-sm text-white outline-none transition focus:border-gold-400/60"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Minimo 8 caracteres"
                    autoComplete="new-password"
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

              <label className="space-y-2 text-xs text-[#D1C7BD]">
                Confirmar contrasena
                <div className="relative">
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    className="w-full rounded-xl border border-white/15 bg-night-900/40 px-3 py-2.5 pr-14 text-sm text-white outline-none transition focus:border-gold-400/60"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Repite tu contrasena"
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-[#D1C7BD]"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                  >
                    {showConfirmPassword ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </label>

              {message && (
                <p className={status === "error" ? "text-xs text-[#AF8C5C]" : "text-xs text-[#D1C7BD]"}>
                  {message}
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-6 py-2 text-xs font-semibold text-night-900 disabled:opacity-70"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Guardando..." : "Guardar"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold text-white/90"
                  onClick={() => navigate("/login")}
                >
                  Cancelar
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}


