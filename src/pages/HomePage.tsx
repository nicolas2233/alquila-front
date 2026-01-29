import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { env } from "../shared/config/env";
import { getSessionUser, getToken } from "../shared/auth/session";

export function HomePage() {
  const [alertCount, setAlertCount] = useState(0);
  const [sessionUser, setSessionUser] = useState(() => getSessionUser());
  const [token, setToken] = useState(() => getToken());

  useEffect(() => {
    setSessionUser(getSessionUser());
    setToken(getToken());
  }, []);

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
    <div className="grid gap-12">
      {sessionUser && alertCount > 0 && (
        <section className="glass-card flex flex-wrap items-center justify-between gap-4 p-5">
          <div>
            <h2 className="text-lg text-white">Tienes nuevas alertas</h2>
            <p className="text-sm text-[#9a948a]">
              {alertCount} publicaciones nuevas segun tus busquedas guardadas.
            </p>
          </div>
          <Link
            className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
            to="/busquedas"
          >
            Ver alertas
          </Link>
        </section>
      )}
      <section className="grid items-center gap-10 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-6">
          <span className="gold-pill">Portal premium local</span>
          <h1 className="font-display text-4xl leading-tight text-white md:text-5xl">
            Un mercado inmobiliario limpio, elegante y sin duplicados.
          </h1>
          <p className="text-base text-[#c7c2b8] md:text-lg">
            Bragado primero. Publicaciones con respaldo y contacto directo. Sin ruido, sin
            intermediarios innecesarios.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-5 py-2 text-sm font-semibold text-night-900 shadow-soft"
              to="/buscar"
            >
              Explorar propiedades
            </Link>
            <Link
              className="rounded-full border border-accent-500/30 bg-accent-500/15 px-5 py-2 text-sm font-semibold"
              to="/publicar"
            >
              Publicar ahora
            </Link>
            <button className="rounded-full border border-white/20 px-5 py-2 text-sm text-[#c7c2b8]" type="button">
              Ver planes
            </button>
          </div>
        </div>
        <div className="relative min-h-[360px] overflow-hidden rounded-[28px] bg-hero bg-cover bg-center shadow-card">
          <div className="absolute inset-6 rounded-2xl border border-gold-500/40" />
          <div className="absolute bottom-6 left-6 rounded-2xl border border-gold-500/40 bg-night-900/80 px-4 py-3 text-sm">
            <strong className="block text-lg text-white">+320</strong>
            <span className="text-[#9a948a]">Propiedades activas</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: "24 hs", text: "Tiempo medio de respuesta" },
          { label: "92%", text: "Contactos directos con duenos" },
          { label: "0 duplicados", text: "Validacion catastral" },
        ].map((item) => (
          <div key={item.label} className="glass-card p-4">
            <strong className="block text-lg text-white">{item.label}</strong>
            <span className="text-sm text-[#9a948a]">{item.text}</span>
          </div>
        ))}
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {["Dueños directos", "Inmobiliarias", "Contacto inmediato"].map((title) => (
          <div key={title} className="glass-card overflow-hidden">
            <div
              className="h-44 bg-cover bg-center"
              style={{
                backgroundImage:
                  title === "Dueños directos"
                    ? "url('https://images.unsplash.com/photo-1507089947368-19c1da9775ae?auto=format&fit=crop&w=800&q=80')"
                    : title === "Inmobiliarias"
                      ? "url('https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=800&q=80')"
                      : "url('https://images.unsplash.com/photo-1493809842364-78817add7ffb?auto=format&fit=crop&w=800&q=80')",
              }}
            />
            <div className="space-y-2 p-5">
              <h3 className="text-lg text-white">{title}</h3>
              <p className="text-sm text-[#9a948a]">
                {title === "Dueños directos" && "Se ve quien publica y si esta verificado."}
                {title === "Inmobiliarias" && "Matricula y CUIT validados."}
                {title === "Contacto inmediato" && "WhatsApp directo o contacto dentro de la app."}
              </p>
            </div>
          </div>
        ))}
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="glass-card p-6">
          <span className="gold-pill">Quienes somos</span>
          <h2 className="mt-4 text-2xl text-white">Somos un equipo local que quiere ordenar el mercado.</h2>
          <p className="mt-4 text-sm text-[#9a948a]">
            Nacimos en Bragado con una idea simple: menos publicaciones repetidas y mas
            transparencia. Verificamos identidad, catastro y actividad real antes de destacar
            una propiedad.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <button className="rounded-full border border-white/20 px-4 py-2 text-sm" type="button">
              Nuestro proceso
            </button>
            <button className="rounded-full border border-accent-500/30 bg-accent-500/15 px-4 py-2 text-sm">
              Contactanos
            </button>
          </div>
        </div>
        <div className="glass-card overflow-hidden">
          <div
            className="h-48 bg-cover bg-center"
            style={{
              backgroundImage:
                "url('https://images.unsplash.com/photo-1502005229762-cf1b2da7c5d6?auto=format&fit=crop&w=800&q=80')",
            }}
          />
          <div className="space-y-4 p-6">
            <h3 className="text-lg text-white">Como funciona</h3>
            {[
              "Publica con respaldo",
              "Verificacion rapida",
              "Contacto inmediato",
            ].map((step, index) => (
              <div key={step} className="flex gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gold-500/15 text-sm font-semibold text-gold-400">
                  {String(index + 1).padStart(2, "0")}
                </div>
                <div>
                  <strong className="block text-sm text-white">{step}</strong>
                  <span className="text-xs text-[#9a948a]">
                    {index === 0 && "DNI y datos catastrales minimos para validar."}
                    {index === 1 && "Revisamos datos y eliminamos duplicados."}
                    {index === 2 && "WhatsApp directo o contacto en la app."}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        {[
          {
            title: "Catastro y dedupe inteligente",
            body: "Usamos partida o nomenclatura para evitar que una propiedad aparezca repetida.",
          },
          {
            title: "Estados reales de disponibilidad",
            body: "Temporarios con fechas exactas y avisos de proxima disponibilidad.",
          },
          {
            title: "Ranking transparente",
            body: "Prioridad a verificados, completos y actualizados. Sin hacks ni pagos ocultos.",
          },
        ].map((feature, index) => (
          <div key={feature.title} className="glass-card p-5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gold-500/15 text-sm font-semibold text-gold-400">
                0{index + 1}
              </div>
              <h3 className="text-lg text-white">{feature.title}</h3>
            </div>
            <p className="mt-3 text-sm text-[#9a948a]">{feature.body}</p>
          </div>
        ))}
      </section>

      <section className="glass-card p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl text-white">Planes pensados para Bragado</h2>
            <p className="text-sm text-[#9a948a]">Un plan para cada escala, sin comisiones por contacto.</p>
          </div>
          <span className="gold-pill">Mensual</span>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {["Bronce", "Platinum", "Gold"].map((plan) => (
            <div key={plan} className="rounded-2xl border border-white/10 bg-night-900/60 p-5">
              <h3 className="text-lg text-white">{plan}</h3>
              <p className="mt-2 text-sm text-[#9a948a]">
                {plan === "Bronce" && "Hasta 3 inmuebles. Ideal para duenos directos."}
                {plan === "Platinum" && "Hasta 20 inmuebles. Para inmobiliarias chicas."}
                {plan === "Gold" && "Hasta 50 inmuebles. Para equipos grandes."}
              </p>
              <button className="mt-4 rounded-full border border-white/15 px-4 py-2 text-xs">
                Elegir plan
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
