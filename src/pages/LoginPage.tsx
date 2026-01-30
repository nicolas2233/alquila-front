import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { saveSession } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";

export function LoginPage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("loading");
    setErrorMessage("");

    try {
      const response = await fetch(`${env.apiUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error("Credenciales inválidas.");
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
      addToast("Sesión iniciada correctamente.", "success");
      if (sessionUser.mustChangePassword) {
        navigate("/change-password");
        return;
      }
      const canAccessPanel = ["OWNER", "AGENCY_ADMIN", "AGENCY_AGENT"].includes(sessionUser.role);
      navigate(canAccessPanel ? "/panel" : "/buscar");
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "No pudimos iniciar sesión."
      );
      addToast(
        error instanceof Error ? error.message : "No pudimos iniciar sesión.",
        "error"
      );
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl text-white">Login</h2>
        <p className="text-sm text-[#9a948a]">Ingresá con tu email y contraseña.</p>
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
          Contraseña
          <input
            type="password"
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        {status === "error" && (
          <p className="text-xs text-[#f5b78a]">{errorMessage}</p>
        )}
        <button
          className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-6 py-2 text-xs font-semibold text-night-900"
          type="submit"
          disabled={status === "loading"}
        >
          {status === "loading" ? "Ingresando..." : "Ingresar"}
        </button>
        <button
          type="button"
          className="text-xs text-gold-400 underline"
          onClick={() => navigate("/recuperar")}
        >
          Olvidé mi contraseña
        </button>
      </form>
    </div>
  );
}
