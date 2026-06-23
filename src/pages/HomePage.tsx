import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";
import { useSeo } from "../shared/seo/useSeo";

type Plan = {
  id: string;
  code: string;
  name: string;
  maxProperties: number;
  priceAmount: string | number;
  priceCurrency: string;
};

type HomeAd = {
  id: string;
  title: string;
  body?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  ctaText?: string | null;
  priority: number;
};

function formatPlanPrice(amount: string | number, currency: string): string {
  const num = Number(amount);
  if (!Number.isFinite(num) || num === 0) return "Sin costo";
  try {
    return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(num) + "/mes";
  } catch {
    return `${currency} ${num}/mes`;
  }
}

type RevealProps = {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
};

function Reveal({ children, className = "", delayMs = 0 }: RevealProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const current = ref.current;
    if (!current) return;
    const observer = new IntersectionObserver(
      (entries) => { if (entries[0]?.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { threshold: 0.12, rootMargin: "0px 0px -4% 0px" }
    );
    observer.observe(current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"} ${className}`}
    >
      {children}
    </div>
  );
}

const OPERATION_LABELS = [
  { value: "RENT", label: "Alquilar" },
  { value: "SALE", label: "Comprar" },
  { value: "TEMPORARY", label: "Temporario" },
];

export function HomePage() {
  const navigate = useNavigate();
  const [sessionUser] = useState(() => getSessionUser());
  const [token] = useState(() => getToken());
  const [alertCount, setAlertCount] = useState(0);
  const [heroOperation, setHeroOperation] = useState("RENT");
  const [plans, setPlans] = useState<Plan[]>([]);
  const [homeAds, setHomeAds] = useState<HomeAd[]>([]);

  useEffect(() => {
    fetch(`${env.apiUrl}/ads?limit=3`)
      .then((r) => r.json())
      .then((data: { items?: HomeAd[] }) => { if (data.items) setHomeAds(data.items); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${env.apiUrl}/plans`)
      .then((r) => r.json())
      .then((data: { items?: Plan[] }) => { if (data.items) setPlans(data.items); })
      .catch(() => {});
  }, []);

  useSeo({
    title: "DomusBrag | Propiedades en venta y alquiler",
    description:
      "Encontrá tu próximo hogar o publicá tu propiedad en DomusBrag. Buscadores, dueños directos e inmobiliarias conectados en una sola plataforma digital.",
    canonicalPath: "/",
    noindex: false,
    structuredData: [
      { "@context": "https://schema.org", "@type": "Organization", name: "DomusBrag", url: env.siteUrl, logo: `${env.siteUrl}/domusbrag.jpg`, description: "Plataforma inmobiliaria digital para buscar, publicar y contactar propiedades." },
      { "@context": "https://schema.org", "@type": "WebSite", name: "DomusBrag", url: env.siteUrl, potentialAction: { "@type": "SearchAction", target: `${env.siteUrl}/buscar`, "query-input": "required name=search_term_string" } },
    ],
  });

  useEffect(() => {
    if (!token) return;
    let ignore = false;
    fetch(`${env.apiUrl}/saved-searches/alerts-summary`, { headers: { Authorization: `Bearer ${token}` }, credentials: "include" })
      .then((r) => r.json())
      .then((data: { items: { id: string; count: number }[] }) => {
        if (ignore) return;
        setAlertCount((data.items ?? []).reduce((sum, item) => sum + (item.count ?? 0), 0));
      })
      .catch(() => {});
    return () => { ignore = true; };
  }, [token]);

  return (
    <div>
      {/* ── HERO ───────────────────────────────────────────────── */}
      <section className="relative min-h-[92svh] w-full overflow-hidden lg:min-h-[calc(88svh-92px)]">
        <div className="absolute inset-0 bg-hero bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70" />

        <div className="relative mx-auto flex h-full min-h-[92svh] max-w-4xl flex-col items-center justify-center px-6 py-20 text-center lg:min-h-[calc(88svh-92px)]">
          {/* Eyebrow */}
          <span className="mb-4 rounded-full border border-gold-300/30 bg-gold-500/10 px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.2em] text-gold-300">
            La plataforma inmobiliaria digital
          </span>

          {/* Headline */}
          <h1 className="font-display text-4xl leading-[1.1] text-white sm:text-5xl md:text-6xl lg:text-7xl">
            Encontrá tu
            <br />
            <span className="bg-gradient-to-r from-[#AF8C5C] to-[#E7E2DD] bg-clip-text text-transparent">
              próximo hogar.
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-xl text-sm leading-relaxed text-[#E7E2DD] md:text-base">
            Propiedades en venta, alquiler y temporario. Sin intermediarios innecesarios, sin duplicados, con contacto directo al dueño o inmobiliaria.
          </p>

          {/* Quick search bar */}
          <div className="mt-8 flex w-full max-w-lg overflow-hidden rounded-2xl border border-white/20 bg-black/40 backdrop-blur-md">
            <div className="flex divide-x divide-white/15">
              {OPERATION_LABELS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setHeroOperation(value)}
                  className={`px-4 py-3 text-sm font-medium transition ${heroOperation === value ? "bg-gold-500/25 text-gold-200" : "text-white/70 hover:text-white"}`}
                >
                  {label}
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={() => navigate(`/buscar?operationType=${heroOperation}`)}
              className="ml-auto flex items-center gap-2 rounded-r-2xl bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-5 py-3 text-sm font-semibold text-night-900"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="h-4 w-4">
                <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
              </svg>
              Buscar
            </button>
          </div>

          {/* Trust badges */}
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            {["Búsqueda gratuita", "Sin comisiones ocultas", "Contacto directo", "Publicación en minutos"].map((badge) => (
              <span key={badge} className="rounded-full border border-white/15 bg-black/30 px-3 py-1 text-[11px] text-[#E7E2DD]">
                {badge}
              </span>
            ))}
          </div>

          {/* CTAs */}
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            {!sessionUser ? (
              <>
                <Link to="/registro" className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-6 py-2.5 text-sm font-semibold text-night-900 shadow-lg">
                  Crear cuenta gratis
                </Link>
                <Link to="/mapa" className="rounded-full border border-white/25 px-6 py-2.5 text-sm text-white backdrop-blur-sm hover:border-white/40">
                  Ver mapa
                </Link>
              </>
            ) : (
              <>
                <Link
                  to={sessionUser.role === "VISITOR" ? "/buscar" : "/panel?tab=subscription"}
                  className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-6 py-2.5 text-sm font-semibold text-night-900"
                >
                  {sessionUser.role === "VISITOR" ? "Buscar propiedades" : "Ir al panel"}
                </Link>
                {(sessionUser.role === "OWNER" || sessionUser.role?.startsWith("AGENCY")) && (
                  <Link to="/publicar" className="rounded-full border border-white/25 px-6 py-2.5 text-sm text-white">
                    Publicar inmueble
                  </Link>
                )}
              </>
            )}
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="pointer-events-none absolute bottom-8 left-1/2 -translate-x-1/2 text-[#D1C7BD]">
          <div className="flex flex-col items-center opacity-70">
            <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/30 p-1">
              <span className="scroll-indicator-dot h-1.5 w-1.5 rounded-full bg-[#D1C7BD]" />
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-12 px-6 py-12 md:space-y-16 md:py-16">

        {/* Alert banner */}
        {sessionUser && alertCount > 0 && (
          <Reveal className="glass-card flex flex-wrap items-center justify-between gap-4 border border-gold-500/30 bg-gold-500/8 p-5" delayMs={40}>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-full border border-gold-400/40 bg-gold-500/15 text-gold-300">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-4"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0"/></svg>
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Novedades en tus búsquedas</h3>
                <p className="text-xs text-[#D1C7BD]">{alertCount} publicaciones nuevas coinciden con tus alertas guardadas.</p>
              </div>
            </div>
            <Link className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900" to="/busquedas">
              Ver alertas
            </Link>
          </Reveal>
        )}

        {/* Stats bar */}
        <Reveal className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Sin comisiones", sub: "El contacto es directo", icon: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" },
            { label: "Publicación en 5 min", sub: "Proceso guiado paso a paso", icon: "M13 2L3 14h9l-1 8 10-12h-9l1-8z" },
            { label: "Contacto real", sub: "WhatsApp o solicitud directa", icon: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
            { label: "Mapa interactivo", sub: "Explorá por ubicación", icon: "M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" },
          ].map((stat, i) => (
            <Reveal key={stat.label} delayMs={i * 60} className="glass-card flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-gold-500/25 bg-gold-500/10">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gold-300">
                  <path d={stat.icon} />
                </svg>
              </div>
              <div>
                <div className="text-sm font-semibold text-white">{stat.label}</div>
                <div className="text-[11px] text-[#D1C7BD]">{stat.sub}</div>
              </div>
            </Reveal>
          ))}
        </Reveal>

        {/* For who section */}
        <Reveal>
          <div className="mb-6 text-center">
            <span className="gold-pill">Para cada perfil</span>
            <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">Una plataforma, tres perfiles</h2>
            <p className="mt-2 text-sm text-[#D1C7BD]">Cada experiencia está pensada para lo que realmente necesitás.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {[
              {
                icon: "M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z",
                label: "Quienes buscan",
                title: "Encontrá sin registrarte",
                body: "Buscá con filtros claros, navegá en mapa interactivo, ampliá fotos y contactá directo. Sin crear cuenta.",
                cta: { label: "Buscar ahora", to: "/buscar" },
                accent: "from-sky-500/20 to-sky-600/5",
                border: "border-sky-500/20",
                pill: "bg-sky-500/15 text-sky-300 border-sky-400/30",
              },
              {
                icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z",
                label: "Dueño directo",
                title: "Publicá sin comisiones",
                body: "1 publicación gratis para siempre. Escalá con planes si necesitás más. Sin intermediarios que te lleven un porcentaje.",
                cta: { label: "Publicar gratis", to: "/registro" },
                accent: "from-gold-500/20 to-gold-600/5",
                border: "border-gold-500/20",
                pill: "bg-gold-500/15 text-gold-300 border-gold-400/30",
              },
              {
                icon: "M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-2 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4",
                label: "Inmobiliaria",
                title: "Tu vitrina digital",
                body: "Perfil público con logo, hero y cartera completa. Gestión de solicitudes, agentes y suscripciones por equipo.",
                cta: { label: "Crear perfil", to: "/registro" },
                accent: "from-violet-500/20 to-violet-600/5",
                border: "border-violet-500/20",
                pill: "bg-violet-500/15 text-violet-300 border-violet-400/30",
              },
            ].map((item, i) => (
              <Reveal key={item.label} delayMs={80 + i * 70} className={`glass-card overflow-hidden rounded-3xl border ${item.border}`}>
                <div className={`bg-gradient-to-br ${item.accent} p-6`}>
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-semibold uppercase tracking-wider ${item.pill}`}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3 w-3">
                      <path d={item.icon} />
                    </svg>
                    {item.label}
                  </span>
                  <h3 className="mt-3 text-xl font-semibold text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#D1C7BD]">{item.body}</p>
                </div>
                <div className="p-4">
                  <Link to={item.cta.to} className="block w-full rounded-full bg-white/8 py-2.5 text-center text-sm text-[#E7E2DD] transition hover:bg-white/14">
                    {item.cta.label} →
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* How it works */}
        <Reveal>
          <div className="mb-8 text-center">
            <span className="gold-pill">Simple y rápido</span>
            <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">¿Cómo funciona?</h2>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { n: "01", title: "Creá tu cuenta", body: "Elegí tu perfil (buscador, dueño o inmobiliaria) y verificá tu email en 60 segundos.", icon: "M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" },
              { n: "02", title: "Buscá o publicá", body: "Usá los filtros, el mapa interactivo o cargá tu propiedad con el asistente de 5 pasos.", icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" },
              { n: "03", title: "Conectá y cerrá", body: "Contactá por WhatsApp, enviá una solicitud o respondé desde el panel. Sin pasos innecesarios.", icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" },
            ].map((step, i) => (
              <Reveal key={step.n} delayMs={90 + i * 80} className="relative glass-card p-6">
                <div className="absolute right-5 top-5 font-display text-5xl font-bold text-white/5">{step.n}</div>
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-gold-500/30 to-gold-600/10">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-5 w-5 text-gold-300">
                    <path d={step.icon} />
                  </svg>
                </div>
                <h3 className="mt-4 text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-[#D1C7BD]">{step.body}</p>
              </Reveal>
            ))}
          </div>
        </Reveal>

        {/* Sponsored ads — non-invasive */}
        {homeAds.length > 0 && (
          <Reveal>
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full border border-white/10 bg-white/4 px-2.5 py-0.5 text-[10px] uppercase tracking-[0.16em] text-[#9f988d]">
                Patrocinado
              </span>
            </div>
            <div className={`grid gap-4 ${homeAds.length > 1 ? "sm:grid-cols-2" : ""}`}>
              {homeAds.map((ad) =>
                ad.linkUrl ? (
                  <a
                    key={ad.id}
                    href={ad.linkUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="glass-card group flex items-start gap-4 p-4 transition hover:border-white/20"
                  >
                    {ad.imageUrl && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10">
                        <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{ad.title}</p>
                      {ad.body && <p className="mt-0.5 text-xs leading-relaxed text-[#D1C7BD]">{ad.body}</p>}
                      {ad.ctaText && (
                        <span className="mt-2 inline-block rounded-full border border-gold-500/30 bg-gold-500/10 px-3 py-1 text-[11px] text-gold-300 transition group-hover:bg-gold-500/18">
                          {ad.ctaText} →
                        </span>
                      )}
                    </div>
                  </a>
                ) : (
                  <div key={ad.id} className="glass-card flex items-start gap-4 p-4">
                    {ad.imageUrl && (
                      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl border border-white/10">
                        <img src={ad.imageUrl} alt={ad.title} className="h-full w-full object-cover" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-white">{ad.title}</p>
                      {ad.body && <p className="mt-0.5 text-xs leading-relaxed text-[#D1C7BD]">{ad.body}</p>}
                    </div>
                  </div>
                )
              )}
            </div>
          </Reveal>
        )}

        {/* Plans — dynamic from DB */}
        <Reveal>
          <div className="mb-8 text-center">
            <span className="gold-pill">Sin sorpresas</span>
            <h2 className="mt-3 font-display text-2xl text-white md:text-3xl">Planes claros, sin letra chica</h2>
            <p className="mt-2 text-sm text-[#D1C7BD]">Empezá gratis. Escalá cuando necesites. Cancelá cuando quieras.</p>
          </div>
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Owner plans */}
            <div className="rounded-3xl border border-white/12 bg-night-900/50 p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">Dueño directo</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-[#D1C7BD]">Mensual o anual −20%</span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {plans.filter((p) => p.code.startsWith("OWNER_")).map((plan) => {
                  const isTopPlan = plan.maxProperties >= 10;
                  return (
                    <div key={plan.code} className={`rounded-2xl border p-4 ${isTopPlan ? "border-gold-500/40 bg-gold-500/8" : "border-white/10 bg-black/15"}`}>
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-white">{plan.name.replace("Dueño ", "")}</p>
                        {isTopPlan && <span className="rounded-full border border-gold-400/50 bg-gold-400/15 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-gold-300">Popular</span>}
                      </div>
                      <p className="mt-1 text-xs text-[#D1C7BD]">{plan.maxProperties === 1 ? "1 inmueble" : `Hasta ${plan.maxProperties} inmuebles`}</p>
                      <p className="mt-2 text-[11px] font-semibold text-gold-400">{formatPlanPrice(plan.priceAmount, plan.priceCurrency)}</p>
                    </div>
                  );
                })}
                {plans.filter((p) => p.code.startsWith("OWNER_")).length === 0 && (
                  [{ name: "Free", max: 1, price: "Sin costo" }, { name: "Bronce", max: 3, price: "" }, { name: "Platinum", max: 6, price: "" }, { name: "Gold", max: 10, price: "" }]
                    .map((p) => (
                      <div key={p.name} className="animate-pulse rounded-2xl border border-white/10 bg-black/15 p-4">
                        <div className="h-4 w-16 rounded bg-white/10" /><div className="mt-2 h-3 w-24 rounded bg-white/6" />
                      </div>
                    ))
                )}
              </div>
              <p className="mt-4 text-[11px] text-[#D1C7BD]">
                Sin tarjeta al registrarte. En planes pagos, el primer mes es gratis al activar el medio de pago.
              </p>
            </div>
            {/* Agency plans */}
            <div className="rounded-3xl border border-white/12 bg-night-900/50 p-6">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-300">Inmobiliaria</p>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] text-[#D1C7BD]">Mensual o anual −20%</span>
              </div>
              <div className="mt-4 space-y-3">
                {plans.filter((p) => p.code.startsWith("AGENCY_")).map((plan) => (
                  <div key={plan.code} className="rounded-2xl border border-white/10 bg-black/15 p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold text-white">{plan.name.replace("Inmobiliaria ", "")} — Hasta {plan.maxProperties} inmuebles</p>
                        <p className="mt-1 text-xs text-[#D1C7BD]">
                          {plan.maxProperties <= 25 ? "Ideal para cartera chica y mediana" : "Para equipos grandes y cartera extensa"}
                        </p>
                      </div>
                      <p className="shrink-0 text-[11px] font-semibold text-gold-400">{formatPlanPrice(plan.priceAmount, plan.priceCurrency)}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-2xl border border-white/8 bg-white/4 p-4">
                <p className="text-sm font-semibold text-white">¿Necesitás más slots?</p>
                <p className="mt-1 text-xs text-[#D1C7BD]">Contactanos — el primer mes puede ser gratuito para inmobiliarias que se están sumando.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link to="/registro" className="inline-flex rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-7 py-3 text-sm font-semibold text-night-900 shadow-lg">
              Empezar gratis →
            </Link>
          </div>
        </Reveal>

        {/* Trust section */}
        <Reveal className="glass-card p-6 md:p-8">
          <div className="mb-5">
            <span className="gold-pill">Confianza y control</span>
            <h2 className="mt-3 text-xl font-semibold text-white md:text-2xl">Diseñado para cuidar tu experiencia</h2>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { icon: "M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z", text: "Verificación de email para publicar" },
              { icon: "M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z", text: "Datos protegidos con cookie segura" },
              { icon: "M3 21v-4m0 0V5a2 2 0 012-2h6.5l1 1H21l-3 6 3 6h-8.5l-1-1H5a2 2 0 00-2 2zm9-13.5V9", text: "Reportes de usuarios y publicaciones" },
              { icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z", text: "Términos, privacidad y políticas claras" },
            ].map((item) => (
              <div key={item.text} className="flex items-start gap-3 rounded-2xl border border-white/10 bg-night-900/40 p-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-400">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-3.5 w-3.5">
                    <path d={item.icon} />
                  </svg>
                </div>
                <p className="text-xs leading-relaxed text-[#E7E2DD]">{item.text}</p>
              </div>
            ))}
          </div>
        </Reveal>

        {/* Final CTA */}
        <Reveal className="relative overflow-hidden rounded-[28px] border border-gold-500/20 bg-gradient-to-br from-night-900/80 via-black/60 to-night-900/70 p-8 md:p-12">
          <div className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full bg-gold-500/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-8 h-40 w-40 rounded-full bg-gold-400/8 blur-3xl" />
          <div className="relative text-center">
            <h2 className="font-display text-3xl text-white md:text-4xl">
              ¿Listo para empezar?
            </h2>
            <p className="mx-auto mt-3 max-w-md text-sm text-[#D1C7BD]">
              Creá tu cuenta en menos de 2 minutos. Sin tarjeta, sin compromiso. Tu primer publicación es gratis.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link to="/registro" className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-8 py-3 text-sm font-bold text-night-900 shadow-[0_8px_24px_rgba(175,140,92,0.35)]">
                Crear cuenta gratis
              </Link>
              <Link to="/buscar" className="rounded-full border border-white/25 px-8 py-3 text-sm text-white hover:border-white/40">
                Buscar propiedades
              </Link>
            </div>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
