import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const agencies = [
  {
    slug: "bragado-realty",
    name: "Bragado Realty",
    description:
      "Equipo local con foco en operaciones verificadas y respuesta rapida en Bragado.",
    address: "Av. Alsina 245, Bragado",
    phone: "2342 444-222",
    whatsapp: "+54 9 2342 555 000",
    email: "contacto@bragado-realty.com",
    website: "www.bragadorealty.com",
    instagram: "@bragado.realty",
    logo: "BR",
    agents: [
      { name: "Lucia Perez", role: "Broker", contact: "lucia@bragado.com" },
      { name: "Martin Salas", role: "Ventas", contact: "martin@bragado.com" },
    ],
    listings: [
      {
        id: "a1",
        title: "Casa 3 ambientes con patio",
        price: "ARS 180.000",
        address: "Mitre 123",
        operation: "Alquiler",
        rooms: 3,
        areaM2: 120,
        garage: true,
        pets: true,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "Publicacion sin duplicados. Contacto directo por WhatsApp con el propietario.",
        descriptionLong:
          "Casa luminosa con patio, galeria y cocina integrada. Ambientes amplios, ventilacion cruzada y buena orientacion.",
        image:
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "a2",
        title: "Depto 2 ambientes luminoso",
        price: "USD 65.000",
        address: "Sarmiento 845",
        operation: "Venta",
        rooms: 2,
        areaM2: 65,
        garage: false,
        pets: false,
        kids: true,
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
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "a3",
        title: "Terreno con acceso directo",
        price: "ARS 95.000",
        address: "Ruta 5 Km 207",
        operation: "Venta",
        rooms: 0,
        areaM2: 450,
        garage: false,
        pets: true,
        kids: true,
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
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
  {
    slug: "la-plaza-propiedades",
    name: "La Plaza Propiedades",
    description:
      "Inmobiliaria boutique con foco en ventas residenciales y alquileres temporarios.",
    address: "Plaza Central 22, Bragado",
    phone: "2342 400-111",
    whatsapp: "+54 9 2342 222 444",
    email: "hola@laplaza.com",
    website: "www.laplaza.com",
    instagram: "@laplaza.propiedades",
    logo: "LP",
    agents: [
      { name: "Julieta Rios", role: "Broker", contact: "julieta@laplaza.com" },
      { name: "Diego Moran", role: "Atencion", contact: "diego@laplaza.com" },
    ],
    listings: [
      {
        id: "b1",
        title: "Casa quinta con pileta",
        price: "USD 120.000",
        address: "Los Tilos 950",
        operation: "Venta",
        rooms: 4,
        areaM2: 220,
        garage: true,
        pets: true,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "Casa quinta con pileta, quincho y parque amplio.",
        descriptionLong:
          "Casa quinta con pileta, quincho completo y parque amplio. Ideal para fines de semana.",
        image:
          "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
      },
      {
        id: "b2",
        title: "PH moderno en el centro",
        price: "ARS 140.000",
        address: "Belgrano 340",
        operation: "Alquiler",
        rooms: 2,
        areaM2: 70,
        garage: false,
        pets: false,
        kids: true,
        images: [
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=1400&q=80",
          "https://images.unsplash.com/photo-1505691938895-1758d7feb511?auto=format&fit=crop&w=1400&q=80",
        ],
        description:
          "PH moderno con patio interno, listo para ingresar.",
        descriptionLong:
          "PH moderno con patio interno, cocina integrada y buena ubicacion en el centro.",
        image:
          "https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80",
      },
    ],
  },
];

type AgencyListing = (typeof agencies)[number]["listings"][number];

export function AgencyProfilePage() {
  const { slug } = useParams();
  const [viewMode, setViewMode] = useState<"list" | "grid">("grid");
  const [selectedListing, setSelectedListing] = useState<AgencyListing | null>(null);
  const [activeImage, setActiveImage] = useState(0);
  const agency = useMemo(
    () => agencies.find((item) => item.slug === slug),
    [slug]
  );

  const openModal = (listing: AgencyListing) => {
    setSelectedListing(listing);
    setActiveImage(0);
  };

  const closeModal = () => {
    setSelectedListing(null);
  };

  if (!agency) {
    return (
      <div className="space-y-2">
        <h2 className="text-3xl text-white">Agencia no encontrada</h2>
        <p className="text-sm text-[#9a948a]">
          No pudimos encontrar la agencia solicitada.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-10">
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="glass-card space-y-4 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gold-500/15 text-xl font-semibold text-gold-400">
              {agency.logo}
            </div>
            <div>
              <h2 className="text-3xl text-white">{agency.name}</h2>
              <p className="text-sm text-[#9a948a]">{agency.description}</p>
            </div>
          </div>
          <div className="grid gap-3 text-sm text-[#c7c2b8]">
            <div>Direccion: {agency.address}</div>
            <div>Telefono: {agency.phone}</div>
            <div>WhatsApp: {agency.whatsapp}</div>
            <div>Email: {agency.email}</div>
            <div>Web: {agency.website}</div>
            <div>Instagram: {agency.instagram}</div>
          </div>
        </div>
        <div className="glass-card space-y-4 p-6">
          <h3 className="text-lg text-white">Equipo</h3>
          <div className="space-y-3">
            {agency.agents.map((agent) => (
              <div
                key={agent.name}
                className="flex items-center justify-between rounded-xl border border-white/10 bg-night-900/60 px-4 py-3"
              >
                <div>
                  <p className="text-sm text-white">{agent.name}</p>
                  <p className="text-xs text-[#9a948a]">{agent.role}</p>
                </div>
                <span className="text-xs text-[#9a948a]">{agent.contact}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-lg text-white">Propiedades publicadas</h3>
            <p className="text-xs text-[#9a948a]">
              {agency.listings.length} inmuebles activos
            </p>
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
          {agency.listings.map((listing) => (
            <article
              key={listing.id}
              className={
                viewMode === "grid"
                  ? "glass-card flex h-full flex-col overflow-hidden"
                  : "glass-card grid gap-5 p-5 md:grid-cols-[220px_1fr]"
              }
            >
              <div className={viewMode === "grid" ? "flex flex-col" : "flex flex-col gap-3"}>
                <div
                  className={
                    viewMode === "grid"
                      ? "h-44 w-full bg-cover bg-center"
                      : "h-40 rounded-2xl bg-cover bg-center"
                  }
                  style={{ backgroundImage: `url('${listing.image}')` }}
                />
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
                    type="button"
                    onClick={() => openModal(listing)}
                  >
                    Ver ficha
                  </button>
                  <button
                    className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
                    type="button"
                  >
                    WhatsApp
                  </button>
                </div>
              </div>
              <div className={viewMode === "grid" ? "space-y-3 p-5" : "space-y-4"}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg text-white">{listing.title}</h4>
                    <p className="text-sm text-[#9a948a]">{listing.address}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className="text-sm font-semibold text-white">{listing.price}</span>
                    <span className="rounded-full bg-gold-500/20 px-3 py-1 text-xs font-semibold text-gold-400">
                      {listing.operation}
                    </span>
                  </div>
                </div>
                <p className="text-sm text-[#9a948a]">{listing.description}</p>
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
                    {listing.rooms > 0 ? `${listing.rooms} ambientes` : "Sin ambientes"}
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
                    {listing.areaM2} m2
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
                    Cochera: {listing.garage ? "Si" : "No"}
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
                    Mascotas: {listing.pets ? "Si" : "No"}
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
                    Ninos: {listing.kids ? "Si" : "No"}
                  </span>
                </div>
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
                  <div>
                    Ambientes: {selectedListing.rooms > 0 ? selectedListing.rooms : "Sin ambientes"}
                  </div>
                  <div>Cochera: {selectedListing.garage ? "Si" : "No"}</div>
                  <div>Mascotas: {selectedListing.pets ? "Si" : "No"}</div>
                  <div>Ninos: {selectedListing.kids ? "Si" : "No"}</div>
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
