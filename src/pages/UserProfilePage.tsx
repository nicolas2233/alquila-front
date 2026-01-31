import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";
import { useToast } from "../shared/ui/toast/ToastProvider";
import { useUnsavedChanges } from "../shared/hooks/useUnsavedChanges";
import { ConfirmLeaveModal } from "../shared/ui/ConfirmLeaveModal";

export function UserProfilePage() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const sessionUser = useMemo(() => getSessionUser(), []);
  const token = useMemo(() => getToken(), []);
  const [status, setStatus] = useState<"idle" | "loading" | "saving" | "error">(
    "idle"
  );
  const [errorMessage, setErrorMessage] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [isDirty, setIsDirty] = useState(false);
  const { show, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);

  useEffect(() => {
    if (!sessionUser) return;
    if (sessionUser.role !== "VISITOR") {
      navigate("/panel");
      return;
    }
    setStatus("loading");
    setErrorMessage("");
    const load = async () => {
      try {
        const response = await fetch(`${env.apiUrl}/users/${sessionUser.id}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar tu perfil.");
        }
        const data = (await response.json()) as {
          name?: string | null;
          email?: string | null;
          phone?: string | null;
          avatarUrl?: string | null;
        };
        setName(data.name ?? "");
        setEmail(data.email ?? "");
        setPhone(data.phone ?? "");
        setAvatarUrl(data.avatarUrl ?? "");
        setStatus("idle");
      } catch (error) {
        setStatus("error");
        setErrorMessage(
          error instanceof Error ? error.message : "No pudimos cargar tu perfil."
        );
      }
    };
    void load();
  }, [sessionUser, token, navigate]);

  const saveProfile = async () => {
    if (!sessionUser) return;
    setStatus("saving");
    setErrorMessage("");
    try {
      const response = await fetch(`${env.apiUrl}/users/${sessionUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          phone: phone || undefined,
          avatarUrl: avatarUrl ? avatarUrl : null,
          password: contrasena || undefined,
        }),
      });
      if (!response.ok) {
        throw new Error("No pudimos guardar tu perfil.");
      }
      setContrasena("");
      setStatus("idle");
      localStorage.setItem(
        "alquila_user",
        JSON.stringify({
          ...sessionUser,
          name,
          email,
          avatarUrl: avatarUrl || null,
        })
      );
      addToast("Perfil actualizado.", "success");
      setIsDirty(false);
    } catch (error) {
      setStatus("error");
      setErrorMessage(
        error instanceof Error ? error.message : "No pudimos guardar tu perfil."
      );
      addToast("No pudimos guardar tu perfil.", "error");
    }
  };

  return (
    <div className="space-y-6" onChange={() => setIsDirty(true)}>
      <div>
        <h2 className="text-3xl text-white">Mi perfil</h2>
        <p className="text-sm text-[#9a948a]">Actualiza tu teléfono, contraseña y avatar.</p>
      </div>

      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#9a948a]">Datos personales</div>
          <button
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            type="button"
            onClick={saveProfile}
            disabled={status === "saving"}
          >
            {status === "saving" ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>

        {status === "loading" && (
          <p className="text-xs text-[#9a948a]">Cargando perfil...</p>
        )}
        {status === "error" && (
          <p className="text-xs text-[#f5b78a]">{errorMessage}</p>
        )}

        <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/60 p-4">
          <div className="text-xs text-[#9a948a]">Avatar</div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-lg text-gold-200">
              {avatarUrl?.startsWith("emoji:") ? (
                <span>{avatarUrl.replace("emoji:", "")}</span>
              ) : avatarUrl ? (
                <img src={avatarUrl} alt="Avatar" className="h-14 w-14 rounded-full object-cover" />
              ) : (
                <span className="text-sm">
                  {(name || email || "U")
                    .split(" ")
                    .map((part) => part.charAt(0))
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["🙂", "🏡", "⭐", "💬"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-night-900/60 text-base"
                  onClick={() => setAvatarUrl(`emoji:${emoji}`)}
                >
                  {emoji}
                </button>
              ))}
              <label className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]">
                Subir foto
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = () => {
                      if (typeof reader.result === "string") {
                        setAvatarUrl(reader.result);
                      }
                    };
                    reader.readAsDataURL(file);
                  }}
                />
              </label>
              <button
                type="button"
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                onClick={() => setAvatarUrl("")}
              >
                Iniciales
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Nombre completo
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={name}
              onChange={(event) => setName(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Email
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Teléfono
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Nueva contraseña
            <input
              type="password"
              className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
              value={contrasena}
              onChange={(event) => setContrasena(event.target.value)}
              placeholder="Dejar en blanco para no cambiar"
            />
          </label>
        </div>
      </div>
      <ConfirmLeaveModal open={show} onConfirm={confirmLeave} onCancel={cancelLeave} />
    </div>
  );
}
