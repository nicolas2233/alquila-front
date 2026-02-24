import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";
import { useSeo } from "../shared/seo/useSeo";

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
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.16, rootMargin: "0px 0px -6% 0px" }
    );

    observer.observe(current);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delayMs}ms` }}
      className={`transition-all duration-700 ease-out ${
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      } ${className}`}
    >
      {children}
    </div>
  );
}

export function HomePage() {
  const [alertCount, setAlertCount] = useState(0);
  const [sessionUser, setSessionUser] = useState(() => getSessionUser());
  const [token, setToken] = useState(() => getToken());

  useEffect(() => {
    setSessionUser(getSessionUser());
    setToken(getToken());
  }, []);

  useSeo({
    title: "DomusBrag | Propiedades en Bragado",
    description:
      "Plataforma digital de publicaciones y contacto inmobiliario para buscar, publicar y contactar propiedades en Bragado con filtros claros y mapa interactivo.",
    canonicalPath: "/",
    noindex: false,
    structuredData: [
      {
        "@context": "https://schema.org",
        "@type": "Organization",
        name: "DomusBrag",
        url: env.siteUrl,
        description:
          "Plataforma digital de publicaciones y contacto inmobiliario en Bragado para conectar buscadores, dueños directos e inmobiliarias.",
      },
      {
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "DomusBrag",
        url: env.siteUrl,
        potentialAction: {
          "@type": "SearchAction",
          target: `${env.siteUrl}/buscar`,
          "query-input": "required name=search_term_string",
        },
      },
    ],
  });

  useEffect(() => {
    let ignore = false;
    const loadAlerts = async () => {
      if (!token) {
        setAlertCount(0);
        return;
      }

      try {
        const response = await fetch(`${env.apiUrl}/saved-searches/alerts-summary`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          throw new Error("No pudimos cargar alertas.");
        }

        const data = (await response.json()) as { items: { id: string; count: number }[] };
        if (ignore) return;
        const total = (data.items ?? []).reduce((sum, item) => sum + (item.count ?? 0), 0);
        setAlertCount(total);
      } catch {
        if (ignore) return;
        setAlertCount(0);
      }
    };

    void loadAlerts();
    return () => {
      ignore = true;
    };
  }, [token]);

  return (
    <div>
      <section className="relative h-[88svh] min-h-[500px] w-full overflow-hidden lg:h-[calc(86svh-92px)]">
        <div className="absolute inset-0 bg-hero bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-black/40 to-black/55" />
        <div className="relative mx-auto flex h-full max-w-5xl items-center justify-center px-6 text-center">
          <div className="space-y-5">
            <p className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">
              Plataforma digital de publicaciones y contacto inmobiliario
            </p>
            <h1 className="font-display text-4xl leading-tight text-white md:text-6xl">
              DomusBrag conecta Bragado con su proximo hogar
            </h1>
            <p className="mx-auto max-w-2xl text-sm text-[#E7E2DD] md:text-base">
              Menos ruido, menos duplicados y contacto real entre quienes buscan, duenios
              directos e inmobiliarias.
            </p>
          </div>
        </div>
        <div className="pointer-events-none absolute bottom-24 left-1/2 -translate-x-1/2 text-[#D1C7BD] md:bottom-8">
          <div className="flex flex-col items-center opacity-80">
            <span className="flex h-9 w-5 items-start justify-center rounded-full border border-white/35 p-1">
              <span className="scroll-indicator-dot h-1.5 w-1.5 rounded-full bg-[#D1C7BD]" />
            </span>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-10 px-6 py-10 md:space-y-14 md:py-14">
        {sessionUser && alertCount > 0 && (
          <Reveal className="glass-card flex flex-wrap items-center justify-between gap-4 p-5" delayMs={40}>
            <div>
              <h2 className="text-lg text-white">Tenes nuevas alertas</h2>
              <p className="text-sm text-[#D1C7BD]">
                {alertCount} publicaciones nuevas segun tus busquedas guardadas.
              </p>
            </div>
            <Link
              className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
              to="/busquedas"
            >
              Ver alertas
            </Link>
          </Reveal>
        )}

        <Reveal className="grid gap-4 md:grid-cols-3">
        {[
          { title: "Sin duplicados", body: "Control de direccion y datos clave para evitar ruido." },
          { title: "Busqueda agil", body: "Filtros claros + vista lista, grilla y mapa." },
          { title: "Contacto rapido", body: "WhatsApp y solicitudes desde la plataforma." },
        ].map((item, index) => (
          <Reveal key={item.title} delayMs={80 + index * 70} className="glass-card p-5">
            <h3 className="text-lg text-white">{item.title}</h3>
            <p className="mt-2 text-sm text-[#D1C7BD]">{item.body}</p>
          </Reveal>
        ))}
        </Reveal>

        <Reveal className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <div className="glass-card overflow-hidden">
          <div
            className="h-44 bg-cover bg-center md:h-56"
            style={{
              backgroundImage:
                "linear-gradient(180deg, rgba(0,0,0,0.1), rgba(0,0,0,0.48)), url('https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1200&q=80')",
            }}
          />
          <div className="space-y-3 p-6">
            <span className="gold-pill">Quienes somos</span>
            <h2 className="text-2xl text-white">Un proyecto local, pensado para crecer.</h2>
            <p className="text-sm text-[#D1C7BD]">
              DomusBrag nace para ordenar el mercado inmobiliario local con informacion clara,
              una experiencia moderna y foco en confianza.
            </p>
          </div>
        </div>

        <div className="glass-card p-6">
          <span className="gold-pill">Como funciona</span>
          <div className="mt-4 space-y-4">
            {[
              {
                title: "Publicar o buscar",
                body: "Elige venta, alquiler o temporario con filtros claros desde el inicio.",
              },
              {
                title: "Verificacion de datos",
                body: "Estructura de datos comun para reducir errores y publicaciones repetidas.",
              },
              {
                title: "Contactar rapido",
                body: "Escribe por WhatsApp o envia solicitud sin friccion.",
              },
            ].map((step, index) => (
              <Reveal key={step.title} delayMs={90 + index * 75} className="flex gap-3 rounded-2xl border border-white/10 bg-night-900/40 p-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gold-500/20 text-sm font-semibold text-white">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <h3 className="text-sm text-white">{step.title}</h3>
                  <p className="mt-1 text-xs text-[#D1C7BD]">{step.body}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
        </Reveal>

        <Reveal className="grid gap-5 md:grid-cols-3">
        {[
          {
            title: "Quienes buscan",
            body: "Vista simple, ficha completa y mapas para decidir mas rapido.",
            image:
              "url('https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=900&q=80')",
          },
          {
            title: "Duenios directos",
            body: "Publicacion guiada y panel para gestionar estado, precio y disponibilidad.",
            image:
              "url('https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=900&q=80')",
          },
          {
            title: "Inmobiliarias",
            body: "Perfil de agencia, cartera visible y gestion operativa en un solo lugar.",
            image:
              "url('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80')",
          },
        ].map((item, index) => (
          <Reveal key={item.title} delayMs={80 + index * 65} className="glass-card overflow-hidden">
            <div className="h-44 bg-cover bg-center" style={{ backgroundImage: item.image }} />
            <div className="space-y-2 p-5">
              <h3 className="text-lg text-white">{item.title}</h3>
              <p className="text-sm text-[#D1C7BD]">{item.body}</p>
            </div>
          </Reveal>
        ))}
        </Reveal>

        <Reveal className="glass-card p-6 md:p-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="gold-pill">Planes</span>
            <h2 className="mt-3 text-2xl text-white">Escala segun tu necesidad</h2>
          </div>
          <span className="rounded-full border border-white/15 bg-night-900/48 px-4 py-2 text-xs text-[#E7E2DD]">
            Facturacion mensual
          </span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {[
            { title: "Bronce", body: "Hasta 3 inmuebles. Ideal para duenio directo." },
            { title: "Platinum", body: "Hasta 20 inmuebles. Para agencias chicas." },
            { title: "Gold", body: "Hasta 50 inmuebles. Para equipos grandes." },
          ].map((plan, index) => (
            <Reveal key={plan.title} delayMs={80 + index * 65} className="rounded-2xl border border-white/15 bg-night-900/40 p-5">
              <h3 className="text-lg text-white">{plan.title}</h3>
              <p className="mt-2 text-sm text-[#D1C7BD]">{plan.body}</p>
              <button className="mt-4 rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]">
                Elegir plan
              </button>
            </Reveal>
          ))}
        </div>
        </Reveal>

        <Reveal className="relative overflow-hidden rounded-[28px] border border-white/15 bg-night-900/40 p-6 md:p-8">
        <div className="absolute inset-0 bg-gradient-to-r from-gold-500/10 via-transparent to-white/5" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl text-white md:text-3xl">Listo para empezar en Bragado?</h2>
            <p className="mt-2 text-sm text-[#D1C7BD]">
              Crea tu cuenta y publica o encuentra tu proximo lugar hoy.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-5 py-2 text-sm font-semibold text-night-900"
              to="/registro"
            >
              Crear cuenta
            </Link>
            <Link className="rounded-full border border-white/20 px-5 py-2 text-sm text-white" to="/buscar">
              Buscar propiedades
            </Link>
          </div>
        </div>
        </Reveal>
      </div>
    </div>
  );
}

