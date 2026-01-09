import { useState } from "react";

const listings = [
  {
    id: 1,
    title: "Casa 3 ambientes con patio",
    address: "Av. Mitre 123",
    price: "ARS 180.000",
    rooms: 3,
    areaM2: 120,
    garage: true,
    pets: true,
    kids: true,
    operation: "Alquiler",
    propertyType: "Casa",
    agency: "Bragado Realty",
    images: [
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
    ],
    description:
      "Publicacion sin duplicados. Contacto directo por WhatsApp con el propietario.",
    descriptionLong:
      "Casa luminosa con patio, galeria y cocina integrada. Ambientes amplios, ventilacion cruzada y buena orientacion. Lista para habitar.",
    image:
      "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 2,
    title: "Depto 2 ambientes luminoso",
    address: "Sarmiento 845",
    price: "USD 65.000",
    rooms: 2,
    areaM2: 65,
    garage: false,
    pets: false,
    kids: true,
    operation: "Venta",
    propertyType: "Departamento",
    agency: "La Plaza Propiedades",
    images: [
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
    ],
    description:
      "Ubicacion central, verificacion completa y disponibilidad inmediata.",
    descriptionLong:
      "Departamento con excelente luz natural, living comedor integrado y balcon. Ideal para primera vivienda o inversion.",
    image:
      "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80",
  },
  {
    id: 3,
    title: "Terreno con acceso directo",
    address: "Ruta 5 Km 207",
    price: "ARS 95.000",
    rooms: 0,
    areaM2: 450,
    garage: false,
    pets: true,
    kids: true,
    operation: "Venta",
    propertyType: "Terreno",
    agency: null,
    images: [
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80",
      "https://images.unsplash.com/photo-1501183638710-841dd1904471?auto=format&fit=crop&w=1400&q=80",
    ],
    description:
      "Ideal para desarrollo, con documentacion catastral validada.",
    descriptionLong:
      "Lote con acceso directo, listo para proyecto residencial. Superficie regular y buen entorno.",
    image:
      "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=800&q=80",
  },
];

export function SearchPage() {
  const [viewMode, setViewMode] = useState<"list" | "grid">("list");
  const [selectedListing, setSelectedListing] = useState<
    (typeof listings)[number] | null
  >(null);
  const [activeImage, setActiveImage] = useState(0);

  const openModal = (listing: (typeof listings)[number]) => {
    setSelectedListing(listing);
    setActiveImage(0);
  };

  const closeModal = () => {
    setSelectedListing(null);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl text-white">Busqueda en Bragado</h2>
          <p className="text-sm text-[#9a948a]">Filtra por operacion, cuartel y rango de precio.</p>
        </div>
        <span className="gold-pill">Resultados verificados</span>
      </div>

      <div className="glass-card p-5">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Operacion
            <select className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white">
              <option>Venta</option>
              <option>Alquiler</option>
              <option>Temporario</option>
            </select>
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Cuartel
            <select className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white">
              <option>Centro</option>
              <option>Cuartel 1</option>
              <option>Cuartel 2</option>
              <option>Cuartel 3</option>
            </select>
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Tipo
            <select className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white">
              <option>Casa</option>
              <option>Departamento</option>
              <option>Terreno</option>
            </select>
          </label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="space-y-2 text-xs text-[#9a948a]">
            Precio min
            <input className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" />
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Precio max
            <input className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white" />
          </label>
          <label className="space-y-2 text-xs text-[#9a948a]">
            Ambientes
            <select className="w-full rounded-xl border border-white/10 bg-night-900/60 px-3 py-2 text-sm text-white">
              <option>1</option>
              <option>2</option>
              <option>3</option>
              <option>4+</option>
            </select>
          </label>
        </div>
      </div>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg text-white">Inmobiliarias en Bragado</h3>
          <span className="text-xs text-[#9a948a]">Scroll horizontal</span>
        </div>
        <div className="relative">
          <span className="scroll-fade scroll-fade-left" aria-hidden="true" />
          <span className="scroll-fade scroll-fade-right" aria-hidden="true" />
          <div className="elegant-scroll flex gap-4 overflow-x-auto pb-2">
            {[
            { name: "Bragado Realty", initials: "BR", slug: "bragado-realty" },
            { name: "Cuartel Norte", initials: "CN", slug: "cuartel-norte" },
            { name: "La Plaza Propiedades", initials: "LP", slug: "la-plaza-propiedades" },
            { name: "Campo & Casa", initials: "CC", slug: "campo-y-casa" },
            { name: "Estudio Urbano", initials: "EU", slug: "estudio-urbano" },
            { name: "Rural Bragado", initials: "RB", slug: "rural-bragado" },
          ].map((agency) => (
            <a
              key={agency.name}
              href={`/agencia/${agency.slug}`}
              className="min-w-[220px] rounded-2xl border border-white/10 bg-night-900/60 p-4 transition hover:border-gold-500/40"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gold-500/15 text-sm font-semibold text-gold-400">
                  {agency.initials}
                </div>
                <div>
                  <h4 className="text-sm text-white">{agency.name}</h4>
                </div>
              </div>
            </a>
          ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">Resultados</h3>
            <p className="text-xs text-[#9a948a]">Ordenados por relevancia y actualizacion.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[#9a948a]">Vista</span>
            <button
              className={
                viewMode === "list"
                  ? "rounded-full border border-white/30 px-3 py-1 text-xs text-white"
                  : "rounded-full border border-white/15 px-3 py-1 text-xs text-[#9a948a]"
              }
              type="button"
              onClick={() => setViewMode("list")}
            >
              Lista
            </button>
            <button
              className={
                viewMode === "grid"
                  ? "rounded-full border border-white/30 px-3 py-1 text-xs text-white"
                  : "rounded-full border border-white/15 px-3 py-1 text-xs text-[#9a948a]"
              }
              type="button"
              onClick={() => setViewMode("grid")}
            >
              Cuadricula
            </button>
          </div>
        </div>

        <div
          className={
            viewMode === "grid"
              ? "grid gap-4 md:grid-cols-2 xl:grid-cols-3"
              : "space-y-4"
          }
        >
          {listings.map((item) => (
            <article
              key={item.id}
              className={
                viewMode === "grid"
                  ? "glass-card flex h-full flex-col overflow-hidden"
                  : "glass-card grid gap-5 p-5 md:grid-cols-[220px_1fr]"
              }
            >
              <div
                className={
                  viewMode === "grid"
                    ? "flex flex-col"
                    : "flex flex-col gap-3"
                }
              >
                <div
                  className={
                    viewMode === "grid"
                      ? "h-44 w-full bg-cover bg-center"
                      : "h-40 rounded-2xl bg-cover bg-center"
                  }
                  style={{ backgroundImage: `url('${item.image}')` }}
                />
                <div
                  className={
                    viewMode === "grid"
                      ? "mt-3 flex w-full gap-2"
                      : "mt-3 flex flex-wrap gap-2"
                  }
                >
                  <button
                    className={
                      viewMode === "grid"
                        ? "flex-1 rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                        : "rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                    }
                    type="button"
                    onClick={() => openModal(item)}
                  >
                    Ver ficha
                  </button>
                  <button
                    className={
                      viewMode === "grid"
                        ? "flex-1 rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                        : "rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                    }
                    type="button"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
              <div className={viewMode === "grid" ? "space-y-3 p-5" : "space-y-4"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h3 className="text-lg text-white">{item.title}</h3>
                    <p className="text-sm text-[#9a948a]">{item.address}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-white">{item.price}</span>
                    <span className="rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                      {item.operation}
                    </span>
                  </div>
                </div>
                {item.agency ? (
                  <p className="text-sm font-semibold text-white">Inmobiliaria: {item.agency}</p>
                ) : (
                  <p className="text-sm font-semibold text-white">Dueno directo</p>
                )}
                <p className="text-sm text-[#9a948a]">{item.description}</p>
                {viewMode === "list" && (
                  <div className="flex flex-wrap items-center gap-3 text-xs text-[#9a948a]">
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 9h16M4 9l2-3h12l2 3M4 9v9h16V9" />
                        <path d="M9 13h6" />
                      </svg>
                      {item.rooms > 0 ? `${item.rooms} ambientes` : "Sin ambientes"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 4h16v16H4z" />
                        <path d="M4 9h16M9 4v16" />
                      </svg>
                      {item.areaM2} m2
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M3 11l9-7 9 7v9H3v-9z" />
                        <path d="M8 20v-5h8v5" />
                      </svg>
                      Cochera: {item.garage ? "Si" : "No"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M7 12h10M5 8l2 12M19 8l-2 12" />
                        <path d="M9 6l3 4 3-4" />
                      </svg>
                      Mascotas: {item.pets ? "Si" : "No"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <circle cx="12" cy="7" r="3" />
                        <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
                      </svg>
                      Ninos: {item.kids ? "Si" : "No"}
                    </span>
                  </div>
                )}
                {viewMode === "grid" && (
                  <div className="flex flex-wrap gap-3 text-xs text-[#9a948a]">
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 9h16M4 9l2-3h12l2 3M4 9v9h16V9" />
                        <path d="M9 13h6" />
                      </svg>
                      {item.rooms > 0 ? `${item.rooms} ambientes` : "Sin ambientes"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M4 4h16v16H4z" />
                        <path d="M4 9h16M9 4v16" />
                      </svg>
                      {item.areaM2} m2
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M3 11l9-7 9 7v9H3v-9z" />
                        <path d="M8 20v-5h8v5" />
                      </svg>
                      Cochera: {item.garage ? "Si" : "No"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <path d="M7 12h10M5 8l2 12M19 8l-2 12" />
                        <path d="M9 6l3 4 3-4" />
                      </svg>
                      Mascotas: {item.pets ? "Si" : "No"}
                    </span>
                    <span className="inline-flex items-center gap-2">
                      <svg
                        aria-hidden="true"
                        className="h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      >
                        <circle cx="12" cy="7" r="3" />
                        <path d="M4 20c0-3.3 3.6-6 8-6s8 2.7 8 6" />
                      </svg>
                      Ninos: {item.kids ? "Si" : "No"}
                    </span>
                  </div>
                )}
              </div>
            </article>
          ))}
        </div>
      </section>

      {selectedListing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-10">
          <div className="w-full max-w-4xl rounded-3xl border border-white/10 bg-night-900/95 shadow-card">
            <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
              <div>
                <h3 className="text-xl text-white">{selectedListing.title}</h3>
                <p className="text-sm text-[#9a948a]">{selectedListing.address}</p>
              </div>
              <button
                className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#c7c2b8]"
                type="button"
                onClick={closeModal}
              >
                Cerrar
              </button>
            </div>
            <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="space-y-4">
                <div className="relative overflow-hidden rounded-2xl">
                  <img
                    className="h-72 w-full object-cover"
                    src={selectedListing.images[activeImage]}
                    alt={selectedListing.title}
                  />
                  <div className="absolute inset-x-0 bottom-4 flex items-center justify-between px-4">
                    <button
                      className="rounded-full border border-white/30 bg-night-900/80 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() =>
                        setActiveImage((prev) =>
                          prev === 0
                            ? selectedListing.images.length - 1
                            : prev - 1
                        )
                      }
                    >
                      Anterior
                    </button>
                    <button
                      className="rounded-full border border-white/30 bg-night-900/80 px-3 py-1 text-xs text-white"
                      type="button"
                      onClick={() =>
                        setActiveImage((prev) =>
                          prev === selectedListing.images.length - 1
                            ? 0
                            : prev + 1
                        )
                      }
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
                <div className="flex gap-2">
                  {selectedListing.images.map((img, index) => (
                    <button
                      key={img}
                      className={
                        index === activeImage
                          ? "h-14 w-20 overflow-hidden rounded-xl border border-gold-400/60"
                          : "h-14 w-20 overflow-hidden rounded-xl border border-white/10"
                      }
                      type="button"
                      onClick={() => setActiveImage(index)}
                    >
                      <img className="h-full w-full object-cover" src={img} alt="" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{selectedListing.price}</p>
                    <span className="mt-2 inline-flex rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                      {selectedListing.operation}
                    </span>
                  </div>
                  <span className="text-sm text-[#9a948a]">
                    {selectedListing.areaM2} m2
                  </span>
                </div>
                <p className="text-sm text-[#9a948a]">{selectedListing.descriptionLong}</p>
                <div className="grid gap-2 text-xs text-[#9a948a]">
                  <div>Ambientes: {selectedListing.rooms > 0 ? selectedListing.rooms : "Sin ambientes"}</div>
                  <div>Cochera: {selectedListing.garage ? "Si" : "No"}</div>
                  <div>Mascotas: {selectedListing.pets ? "Si" : "No"}</div>
                  <div>Ninos: {selectedListing.kids ? "Si" : "No"}</div>
                  <div>
                    {selectedListing.agency ? `Inmobiliaria: ${selectedListing.agency}` : "Dueno directo"}
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-xs font-semibold text-night-900">
                    WhatsApp
                  </button>
                  <button className="rounded-full border border-white/20 px-5 py-2 text-xs text-[#c7c2b8]">
                    Guardar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
