import type { ChangeEvent } from "react";

type AgencyProfileFormProps = {
  agencyId?: string;
  status: "idle" | "loading" | "saving" | "error";
  error: string;
  name: string;
  legalName: string;
  phone: string;
  address: string;
  about: string;
  whatsapp: string;
  email: string;
  website: string;
  instagram: string;
  logo: string;
  onSave: () => void;
  setName: (value: string) => void;
  setLegalName: (value: string) => void;
  setPhone: (value: string) => void;
  setAddress: (value: string) => void;
  setAbout: (value: string) => void;
  setWhatsapp: (value: string) => void;
  setEmail: (value: string) => void;
  setWebsite: (value: string) => void;
  setInstagram: (value: string) => void;
  setLogo: (value: string) => void;
};

export function AgencyProfileForm({
  agencyId,
  status,
  error,
  name,
  legalName,
  phone,
  address,
  about,
  whatsapp,
  email,
  website,
  instagram,
  logo,
  onSave,
  setName,
  setLegalName,
  setPhone,
  setAddress,
  setAbout,
  setWhatsapp,
  setEmail,
  setWebsite,
  setInstagram,
  setLogo,
}: AgencyProfileFormProps) {
  const isSaving = status === "saving";

  const handleLogoUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        setLogo(reader.result);
      }
    };
    reader.readAsDataURL(file);
  };

  const initials = (logo || name || "A")
    .split(" ")
    .map((part) => part.charAt(0))
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="glass-card space-y-4 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="text-lg text-white">Perfil de inmobiliaria</h3>
          <p className="text-xs text-[#9a948a]">Edita los datos que vern tus clientes.</p>
        </div>
        <button
          className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
          type="button"
          onClick={onSave}
          disabled={isSaving || !agencyId}
        >
          {isSaving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>

      {!agencyId && (
        <p className="text-xs text-[#f5b78a]">
          Necesitamos asociar tu usuario a una inmobiliaria.
        </p>
      )}

      {status === "loading" && (
        <p className="text-xs text-[#9a948a]">Cargando datos...</p>
      )}
      {status === "error" && <p className="text-xs text-[#f5b78a]">{error}</p>}

      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-2 text-xs text-[#9a948a]">
          Nombre comercial
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          Razn social
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={legalName}
            onChange={(event) => setLegalName(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          Telfono
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={phone}
            onChange={(event) => setPhone(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          Domicilio
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          WhatsApp
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={whatsapp}
            onChange={(event) => setWhatsapp(event.target.value)}
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
          Web
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
          />
        </label>
        <label className="space-y-2 text-xs text-[#9a948a]">
          Instagram
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={instagram}
            onChange={(event) => setInstagram(event.target.value)}
          />
        </label>
        <div className="space-y-2 text-xs text-[#9a948a]">
          <div>Logo</div>
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15 text-sm font-semibold text-gold-200">
              {logo?.startsWith("data:") || logo?.startsWith("http") ? (
                <img loading="lazy" decoding="async" src={logo} alt="Logo" className="h-12 w-12 rounded-2xl object-cover" />
              ) : (
                initials
              )}
            </div>
            <label className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]">
              Subir logo
              <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
            </label>
            <button
              type="button"
              className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
              onClick={() => setLogo("")}
            >
              Iniciales
            </button>
          </div>
          <input
            className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
            value={logo}
            onChange={(event) => setLogo(event.target.value)}
            placeholder="URL del logo o texto corto"
          />
        </div>
      </div>

      <label className="space-y-2 text-xs text-[#9a948a]">
        Quines somos
        <textarea
          rows={3}
          className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white"
          value={about}
          onChange={(event) => setAbout(event.target.value)}
        />
      </label>
    </div>
  );
}
