import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { useToast } from "../shared/ui/toast/ToastProvider";

export function ForgotPasswordPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [dni, setDni] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const [resetLink, setResetLink] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setMessage("");
    setResetLink(null);

    try {
      const response = await fetch(`${env.apiUrl}/auth/forgot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, dni }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? "No pudimos procesar la solicitud.");
      }

      setStatus("success");
      setMessage(data?.message ?? "Revisa tu email para continuar.");
      if (data?.resetLink) setResetLink(data.resetLink);
      addToast("Solicitud enviada.", "success");
    } catch (error) {
      setStatus("error");
      const msg = error instanceof Error ? error.message : "No pudimos procesar la solicitud.";
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
            <p className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">Recuperacion segura</p>
            <h2 className="font-display text-3xl leading-tight text-white">Recupera tu cuenta en minutos</h2>
            <p className="max-w-sm text-sm text-[#E7E2DD]">
              Valida email y DNI. Si los datos coinciden te enviamos un enlace para crear una nueva contrasena.
            </p>
          </div>

          <div className="grid gap-2">
            {[
              { label: "1", title: "Verifica", detail: "Email + DNI." },
              { label: "2", title: "Recibe enlace", detail: "Revisa tu correo." },
              { label: "3", title: "Actualiza clave", detail: "Vuelve a ingresar." },
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
              <h1 className="font-display text-3xl text-white sm:text-[2rem]">Olvide mi contrasena</h1>
              <p className="text-sm text-[#D1C7BD]">Ingresa tus datos para recuperar el acceso.</p>
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
                DNI
                <input
                  className="w-full rounded-xl border border-white/15 bg-night-900/40 px-3 py-2.5 text-sm text-white outline-none transition focus:border-gold-400/60"
                  value={dni}
                  onChange={(event) => setDni(event.target.value)}
                  placeholder="Solo numeros"
                />
              </label>

              {message && (
                <p className={status === "error" ? "text-xs text-[#AF8C5C]" : "text-xs text-[#D1C7BD]"}>
                  {message}
                </p>
              )}

              {resetLink && (
                <p className="text-xs text-[#D1C7BD]">
                  Link de prueba:{" "}
                  <a className="text-gold-400 underline" href={resetLink}>
                    {resetLink}
                  </a>
                </p>
              )}

              <div className="flex flex-wrap gap-3">
                <button
                  type="submit"
                  className="flex-1 rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-6 py-2 text-xs font-semibold text-night-900 disabled:opacity-70"
                  disabled={status === "loading"}
                >
                  {status === "loading" ? "Enviando..." : "Enviar enlace"}
                </button>
                <button
                  type="button"
                  className="rounded-full border border-white/20 px-6 py-2 text-xs font-semibold text-white/90"
                  onClick={() => navigate("/login")}
                >
                    Volver al login
                </button>
              </div>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
}

