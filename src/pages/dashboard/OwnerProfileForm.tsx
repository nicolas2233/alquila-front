import type { ChangeEvent } from "react";

type OwnerProfileFormProps = {
  status: "idle" | "loading" | "saving" | "error";
  error: string;
  name: string;
  email: string;
  phone: string;
  address: string;
  password: string;
  avatarUrl: string;
  onSave: () => void;
  setName: (value: string) => void;
  setEmail: (value: string) => void;
  setPhone: (value: string) => void;
  setAddress: (value: string) => void;
  setPassword: (value: string) => void;
  setAvatarUrl: (value: string) => void;
};

const avatarChoices = [":)", "[casa]", "*", "chat"]; // ASCII-safe placeholders

export function OwnerProfileForm({
  status,
  error,
  name,
  email,
  phone,
  address,
  password,
  avatarUrl,
  onSave,
  setName,
  setEmail,
  setPhone,
  setAddress,
  setPassword,
  setAvatarUrl,
}: OwnerProfileFormProps) {
  const isSaving = status === "saving";

  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setAvatarUrl(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const initials = (name || email || "U")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="glass-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg text-white">Perfil de dueño</h3>
          <p className="text-xs text-[#9a948a]">
            Actualiza tus datos personales y de contacto.
          </p>
        </div>
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
          type="button"
          onClick={onSave}
          disabled={isSaving}
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {status === "loading" && (
        <p className="text-xs text-[#9a948a]">Cargando perfil...</p>
      )}
      {status === "error" && <p className="text-xs text-[#f5b78a]">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-3 rounded-2xl border border-white/10 bg-night-900/60 p-4 md:col-span-2">
          <div className="text-xs text-[#9a948a]">Avatar</div>
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-gold-500/15 text-lg text-gold-200">
              {avatarUrl?.startsWith("emoji:") ? (
                <span>{avatarUrl.replace("emoji:", "")}</span>
              ) : avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Avatar"
                  className="h-14 w-14 rounded-full object-cover"
                />
              ) : (
                <span className="text-sm">{initials}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {avatarChoices.map((emoji) => (
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
                  onChange={handleAvatarUpload}
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
          Dirección
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a] md:col-span-2">
          Nueva contraseña
          <input
            type="password"
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Dejar en blanco para no cambiar"
          />
        </label>
      </div>
    </div>
  );
}
