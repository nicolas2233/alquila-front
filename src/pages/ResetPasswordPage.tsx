import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { useUnsavedChanges } from "../shared/hooks/useUnsavedChanges";
import { ConfirmLeaveModal } from "../shared/ui/ConfirmLeaveModal";

export function ResetPasswordPage() {
  const { addToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const token = useMemo(() => new URLSearchParams(location.search).get("token"), [location.search]);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const { show, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setMessage("Token inválido.");
      return;
    }
    setStatus("loading");
    setMessage("");
    try {
      const response = await fetch(`${env.apiUrl}/auth/reset`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password, confirmPassword }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? "No pudimos actualizar la contraseña.");
      }
      setStatus("success");
      setMessage("Contraseña actualizada. Iniciá sesión.");
      addToast("Contraseña actualizada.", "success");
      setIsDirty(false);
      navigate("/login");
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "No pudimos actualizar la contraseña.";
      setStatus("error");
      setMessage(msg);
      addToast(msg, "error");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl text-white">Cambiar contraseña</h2>
        <p className="text-sm text-[#9a948a]">Ingresá tu nueva contraseña.</p>
      </div>
      <form
        className="glass-card space-y-4 p-6"
        onSubmit={handleSubmit}
        onChange={() => setIsDirty(true)}
      >
        <label className="space-y-2 text-xs text-[#9a948a]">
          Nueva contraseña
          <input
            type="password"
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          Confirmar contraseña
          <input
            type="password"
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
          />
        </label>
        {message && (
          <p className={status === "error" ? "text-xs text-[#f5b78a]" : "text-xs text-[#9a948a]"}>
            {message}
          </p>
        )}
        <button
          type="submit"
          className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-6 py-2 text-xs font-semibold text-night-900"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Guardando..." : "Guardar"}
        </button>
      </form>
      <ConfirmLeaveModal open={show} onConfirm={confirmLeave} onCancel={cancelLeave} />
    </div>
  );
}
