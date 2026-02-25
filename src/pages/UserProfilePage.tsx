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
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [emailVerifiedAt, setEmailVerifiedAt] = useState<string>("");
  const [dni, setDni] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [verificationStatus, setVerificationStatus] = useState<"idle" | "sending">("idle");
  const [verificationCooldown, setVerificationCooldown] = useState(0);
  const [isDirty, setIsDirty] = useState(false);
  const { show, confirmLeave, cancelLeave } = useUnsavedChanges(isDirty);
  const lockIcon = (
    <span className="ml-1 inline-flex items-center text-[#BFB8AD]" title="No editable">
      <svg
        aria-hidden="true"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="currentColor"
        className="h-3.5 w-3.5"
      >
        <path d="M17 8h-1V6a4 4 0 1 0-8 0v2H7a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Zm-7-2a2 2 0 1 1 4 0v2h-4V6Z" />
      </svg>
    </span>
  );
  const emailVerifiedIcon = emailVerifiedAt ? (
    <span
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-300"
      title="Email verificado"
      aria-label="Email verificado"
    >
      ✓
    </span>
  ) : (
    <span
      className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-rose-500/15 text-rose-300"
      title="Email pendiente"
      aria-label="Email pendiente"
    >
      ✕
    </span>
  );

  useEffect(() => {
    if (verificationCooldown <= 0) return;
    const timer = window.setInterval(() => {
      setVerificationCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [verificationCooldown]);

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
          firstName?: string | null;
          lastName?: string | null;
          email?: string | null;
          emailVerifiedAt?: string | null;
          dni?: string | null;
          birthDate?: string | null;
          phone?: string | null;
          address?: string | null;
          avatarUrl?: string | null;
        };
        const fullName = (data.name ?? "").trim();
        if (data.firstName || data.lastName) {
          setFirstName(data.firstName ?? "");
          setLastName(data.lastName ?? "");
        } else {
          const [first = "", ...rest] = fullName.split(/\s+/).filter(Boolean);
          setFirstName(first);
          setLastName(rest.join(" "));
        }
        setEmail(data.email ?? "");
        setEmailVerifiedAt(data.emailVerifiedAt ?? "");
        setDni(data.dni ?? "");
        setBirthDate(
          data.birthDate ? new Date(data.birthDate).toISOString().slice(0, 10) : ""
        );
        setPhone(data.phone ?? "");
        setAddress(data.address ?? "");
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
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ").trim();
    setStatus("saving");
    setErrorMessage("");
    try {
      const response = await fetch(`${env.apiUrl}/users/${sessionUser.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          name,
          firstName: firstName.trim() || undefined,
          lastName: lastName.trim() || undefined,
          email,
          birthDate: birthDate || undefined,
          phone: phone || undefined,
          address: address || undefined,
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
        "domusbrag_user",
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

  const resendVerificationEmail = async () => {
    if (!email) return;
    if (verificationCooldown > 0) {
      addToast(`Espera ${verificationCooldown}s para reenviar la verificación.`, "warning");
      return;
    }
    setVerificationStatus("sending");
    try {
      const response = await fetch(`${env.apiUrl}/auth/verify-email/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ email }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) {
        throw new Error(data?.message ?? "No pudimos reenviar el email de verificación.");
      }
      addToast(data?.message ?? "Te enviamos un email de verificación.", "success");
      setVerificationCooldown(30);
    } catch (error) {
      addToast(
        error instanceof Error ? error.message : "No pudimos reenviar el email de verificación.",
        "error"
      );
    } finally {
      setVerificationStatus("idle");
    }
  };

  return (
    <div className="space-y-6" onChange={() => setIsDirty(true)}>
      <div>
        <h2 className="text-3xl text-white">Mi perfil</h2>
        <p className="text-sm text-[#D1C7BD]">
          Completa tus datos de contacto y perfil. La identidad registrada se muestra en modo lectura.
        </p>
      </div>

      <div className="glass-card space-y-4 p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-xs text-[#D1C7BD]">Datos personales</div>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-1 text-[11px] ${
                emailVerifiedAt
                  ? "border-emerald-400/35 bg-emerald-500/10 text-emerald-200"
                  : "border-amber-400/35 bg-amber-500/10 text-amber-200"
              }`}
            >
              {emailVerifiedAt ? "Email verificado" : "Email pendiente"}
            </span>
            {!emailVerifiedAt && (
              <button
                className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
                type="button"
                onClick={resendVerificationEmail}
                disabled={verificationStatus === "sending" || verificationCooldown > 0}
              >
                {verificationStatus === "sending"
                  ? "Enviando..."
                  : verificationCooldown > 0
                  ? `Reenviar verificación (${verificationCooldown}s)`
                  : "Reenviar verificación"}
              </button>
            )}
            <button
              className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
              type="button"
              onClick={saveProfile}
              disabled={status === "saving"}
            >
              {status === "saving" ? "Guardando..." : "Guardar cambios"}
            </button>
          </div>
        </div>

        {status === "loading" && (
          <p className="text-xs text-[#D1C7BD]">Cargando perfil...</p>
        )}
        {status === "error" && (
          <p className="text-xs text-[#AF8C5C]">{errorMessage}</p>
        )}

        <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/48 p-4">
          <div className="text-xs text-[#D1C7BD]">Avatar</div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-lg text-gold-200">
              {avatarUrl?.startsWith("emoji:") ? (
                <span>{avatarUrl.replace("emoji:", "")}</span>
              ) : avatarUrl ? (
                <img
                  loading="lazy"
                  decoding="async"
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                  <span className="text-sm">
                  {([firstName, lastName].filter(Boolean).join(" ") || email || "U")
                    .split(" ")
                    .map((part) => part.charAt(0))
                    .slice(0, 2)
                    .join("")
                    .toUpperCase()}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {["🙂", "🏠", "⭐", "💬"].map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-night-900/48 text-base"
                  onClick={() => setAvatarUrl(`emoji:${emoji}`)}
                >
                  {emoji}
                </button>
              ))}
              <label className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]">
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
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
                onClick={() => setAvatarUrl("")}
              >
                Iniciales
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Nombre
            {lockIcon}
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
              value={firstName}
              onChange={(event) => setFirstName(event.target.value)}
              readOnly
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Apellido
            {lockIcon}
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
              value={lastName}
              onChange={(event) => setLastName(event.target.value)}
              readOnly
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Email
            {lockIcon}
            {emailVerifiedIcon}
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              readOnly
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            DNI
            {lockIcon}
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/35 px-3 py-2 text-sm text-white/80"
              value={dni}
              readOnly
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Teléfono
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Fecha de nacimiento
            <input
              type="date"
              className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD] md:col-span-2">
            Domicilio
            <input
              className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
              value={address}
              onChange={(event) => setAddress(event.target.value)}
              placeholder="Ej: San Martín 390, Bragado"
            />
          </label>
          <label className="space-y-2 text-xs text-[#D1C7BD]">
            Nueva contraseña
            <input
              type="password"
              className="w-full rounded-xl border border-white/10 bg-night-900/48 px-3 py-2 text-sm text-white"
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


