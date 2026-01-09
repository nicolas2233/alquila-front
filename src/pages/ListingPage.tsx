export function ListingPage() {
  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Casa 3 ambientes con patio</h2>
          <p className="text-sm text-[#9a948a]">Cuartel 2 · ARS 180.000 · 120 m2</p>
        </div>
        <span className="gold-pill">Propiedad verificada</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="h-44 rounded-2xl bg-cover bg-center"
                style={{
                  backgroundImage:
                    "url('https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80')",
                }}
              />
            ))}
          </div>
          <div className="glass-card p-5">
            <h3 className="text-lg text-white">Descripcion</h3>
            <p className="mt-2 text-sm text-[#9a948a]">
              Casa luminosa con patio, galeria y cocina integrada. Publicacion sin duplicados.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h3 className="text-lg text-white">Contacto</h3>
            <p className="mt-2 text-sm text-[#9a948a]">WhatsApp directo o contacto dentro de la app.</p>
            <div className="mt-4 flex flex-wrap gap-3">
              <button className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900">
                WhatsApp directo
              </button>
              <button className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]">
                Pedir contacto
              </button>
            </div>
          </div>
          <div className="glass-card p-5">
            <h3 className="text-lg text-white">Estado</h3>
            <p className="mt-2 text-sm text-[#9a948a]">Disponible desde 20/01/2026</p>
            <button className="mt-4 rounded-full border border-accent-500/30 bg-accent-500/15 px-4 py-2 text-xs">
              Reservar visita
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
