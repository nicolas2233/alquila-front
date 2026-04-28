import { Link } from "react-router-dom";
import { useSeo } from "../shared/seo/useSeo";

export function NotFoundPage() {
  useSeo({
    title: "Página no encontrada | DomusBrag",
    description: "La página solicitada no existe o cambió de ubicación.",
    canonicalPath: "/404",
    noindex: true,
  });

  return (
    <section className="relative isolate overflow-hidden rounded-[28px] border border-white/12 bg-night-900/68 px-5 py-10 shadow-card sm:px-8 md:py-14">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_15%,rgba(175,140,92,0.22),transparent_42%),radial-gradient(circle_at_85%_80%,rgba(231,226,221,0.12),transparent_45%)]" />
      <div className="relative mx-auto max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.18em] text-[#AF8C5C]">Error 404</p>
        <h1 className="mt-3 font-display text-4xl leading-tight text-white md:text-5xl">
          No encontramos esa página
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-[#D1C7BD] md:text-base">
          Es posible que el enlace haya cambiado, la publicación ya no esté disponible o la
          dirección esté mal escrita.
        </p>

        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link
            to="/buscar"
            className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-5 py-2 text-sm font-semibold text-night-900"
          >
            Buscar propiedades
          </Link>
          <Link
            to="/mapa"
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-white"
          >
            Ver mapa
          </Link>
          <Link
            to="/"
            className="rounded-full border border-white/20 px-5 py-2 text-sm text-[#E7E2DD]"
          >
            Ir al inicio
          </Link>
        </div>

        <div className="mt-8 grid gap-3 text-left sm:grid-cols-3">
          {[
            ["Propiedades", "Explorá inmuebles activos con filtros claros."],
            ["Mapa", "Ubicá opciones por zona y servicios cercanos."],
            ["Publicar", "Cargá tu inmueble desde un flujo guiado."],
          ].map(([title, body]) => (
            <div key={title} className="rounded-2xl border border-white/10 bg-night-900/45 p-4">
              <p className="text-sm font-semibold text-white">{title}</p>
              <p className="mt-1 text-xs leading-5 text-[#D1C7BD]">{body}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
