import { useState } from "react";
import { env } from "../shared/config/env";
import { useToast } from "../shared/ui/toast/ToastProvider";

export function ForgotPasswordPage() {
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
      setMessage(data?.message ?? "Revisá tu email para continuar.");
      if (data?.resetLink) {
        setResetLink(data.resetLink);
      }
      addToast("Solicitud enviada.", "success");
    } catch (error) {
      setStatus("error");
      const msg = error instanceof Error ? error.message : "No pudimos procesar la solicitud.";
      setMessage(msg);
      addToast(msg, "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-white">Recuperar cuenta</h2>
        <p className="text-sm text-[#9a948a]">
          Ingresá tu email y DNI. Te enviaremos un link para cambiar tu contraseña.
        </p>
      </div>
      <form className="glass-card space-y-4 p-6" onSubmit={handleSubmit}>
        <label className="space-y-2 text-xs text-[#9a948a]">
          Email
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          DNI
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={dni}
            onChange={(event) => setDni(event.target.value)}
          />
        </label>
        {message && (
          <p className={status === "error" ? "text-xs text-[#f5b78a]" : "text-xs text-[#9a948a]"}>
            {message}
          </p>
        )}
        {resetLink && (
          <p className="text-xs text-[#9a948a]">
            Link de prueba: <a className="text-gold-400 underline" href={resetLink}>{resetLink}</a>
          </p>
        )}
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-6 py-2 text-xs font-semibold text-night-900"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Enviando..." : "Enviar"}
        </button>
      </form>
    </div>
  );
}
