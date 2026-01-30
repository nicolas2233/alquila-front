import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Container } from "../ui/Container";
import { clearSession, getSessionUser, getToken } from "../auth/session";
import type { SessionUser } from "../auth/session";
import { env } from "../config/env";
import { ToastProvider } from "../ui/toast/ToastProvider";
import { LegalModal } from "../ui/LegalModal";
import { FloatingChat } from "../ui/chat/FloatingChat";

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "text-gold-400" : "text-[#c7c2b8]";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);

  useEffect(() => {
    setUser(getSessionUser());
    setToken(getToken());
  }, [location.pathname]);

  useEffect(() => {
    let ignore = false;
    const loadCount = async () => {
      if (!token) {
        setNotificationCount(0);
        return;
      }
      try {
        const response = await fetch(`${env.apiUrl}/notifications/unread-count`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) {
          throw new Error("No pudimos cargar notificaciones.");
        }
        const data = (await response.json()) as { count: number };
        if (ignore) return;
        setNotificationCount(data.count ?? 0);
      } catch {
        if (ignore) return;
        setNotificationCount(0);
      }
    };
    void loadCount();
    return () => {
      ignore = true;
    };
  }, [token, location.pathname]);

  const handleLogout = () => {
    clearSession();
    setUser(null);
    navigate("/login");
  };

  return (
    <ToastProvider>
      <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gold-500/20 bg-night-900/80 backdrop-blur-xl">
        <Container>
          <div className="grid items-center gap-4 py-4 sm:gap-6 sm:py-5 lg:grid-cols-[auto_1fr_auto]">
            <Link
              to="/"
              className="text-center font-display text-xl tracking-wide text-white sm:text-2xl lg:text-left"
            >
              Brupi
            </Link>
            <nav className="flex flex-wrap justify-center gap-3 text-xs sm:gap-6 sm:text-sm">
              <NavLink to="/buscar" className={navClass}>
                Buscar
              </NavLink>
              <NavLink to="/mapa" className={navClass}>
                Mapa
              </NavLink>
              {user && user.role === "VISITOR" && (
                <>
                  <NavLink to="/mis-solicitudes" className={navClass}>
                    Mis solicitudes
                  </NavLink>
                  <NavLink to="/perfil" className={navClass}>
                    Mi perfil
                  </NavLink>
                </>
              )}
              {user && user.role !== "VISITOR" && (
                <>
                  <NavLink to="/publicar" className={navClass}>
                    Publicar
                  </NavLink>
                  <NavLink to="/panel" className={navClass}>
                    Panel
                  </NavLink>
                </>
              )}
              {user && user.role === "ADMIN" && (
                <NavLink to="/admin" className={navClass}>
                  Admin
                </NavLink>
              )}
            </nav>
            {user ? (
              <div className="flex flex-col items-center gap-3 text-xs text-[#c7c2b8] sm:flex-row sm:text-sm">
                <span className="flex items-center gap-2 rounded-full border border-white/10 px-3 py-2">
                  <span
                    className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gold-500/15 text-xs text-gold-200"
                    title={user.name ?? user.email ?? "Usuario"}
                  >
                    {user.avatarUrl?.startsWith("emoji:") ? (
                      <span>{user.avatarUrl.replace("emoji:", "")}</span>
                    ) : user.avatarUrl ? (
                      <img
                        src={user.avatarUrl}
                        alt="Avatar"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-[10px]">
                        {(user.name ?? user.email ?? "U")
                          .split(" ")
                          .map((part) => part.charAt(0))
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                    )}
                  </span>
                  Hola, {user.name ?? user.email}
                </span>
                <NavLink
                  to="/notificaciones"
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-3 py-2 text-xs text-white/90 sm:text-sm"
                  aria-label="Notificaciones"
                >
                  <span aria-hidden="true">🔔</span>
                  {notificationCount > 0 && (
                    <span className="rounded-full bg-gold-500/30 px-2 py-0.5 text-[10px] text-gold-300">
                      {notificationCount}
                    </span>
                  )}
                </NavLink>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 sm:text-sm"
                  type="button"
                  onClick={handleLogout}
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900 shadow-soft sm:text-sm"
                  to="/registro"
                >
                  Crear cuenta
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-xs font-semibold text-white/90 sm:text-sm"
                  to="/login"
                >
                  Login
                </Link>
              </div>
            )}
          </div>
        </Container>
      </header>
      <main className="py-10 lg:py-16">
        <Container>
          <Outlet />
        </Container>
      </main>
      <footer className="border-t border-white/10 bg-night-900/80 py-10 text-sm text-[#9a948a]">
        <Container>
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-3">
              <div className="font-display text-xl text-white">Brupi</div>
              <p className="text-sm text-[#9a948a]">
                Plataforma inmobiliaria local para Bragado. Conectamos personas con su
                proxima vivienda de forma clara y directa.
              </p>
              <div className="text-xs text-[#7b756d]">© 2026 Brupi. Todos los derechos reservados.</div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-white">Legal</div>
              <div className="flex flex-col gap-2 text-xs">
                <button
                  type="button"
                  className="text-left text-[#c7c2b8] hover:text-white"
                  onClick={() => setShowTerms(true)}
                >
                  Terminos y condiciones
                </button>
                <button
                  type="button"
                  className="text-left text-[#c7c2b8] hover:text-white"
                  onClick={() => setShowPrivacy(true)}
                >
                  Politica de privacidad
                </button>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-white">Ayuda</div>
              <div className="flex flex-col gap-2 text-xs">
                <span>Contacto: contacto@brupi.com</span>
                <span>Soporte: soporte@brupi.com</span>
                <span>Bragado, Buenos Aires</span>
              </div>
            </div>
          </div>
        </Container>
      </footer>
      <FloatingChat user={user} token={token} />
      <LegalModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title="Terminos y condiciones"
        subtitle="Lineamientos de uso de Brupi."
      >
        <div className="space-y-3">
          <h4 className="text-base text-white">1. Uso responsable</h4>
          <p>
            Brupi es una plataforma para conectar personas que buscan propiedades con
            propietarios e inmobiliarias. No se permite publicar informacion falsa,
            engañosa o duplicada.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">2. Contenido y veracidad</h4>
          <p>
            Cada usuario es responsable de la informacion que publica. Brupi puede
            solicitar datos para validar publicaciones, pero no garantiza la veracidad
            total de cada anuncio.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">3. Responsabilidad</h4>
          <p>
            Brupi no se hace responsable por operaciones, transacciones o acuerdos entre
            usuarios. La plataforma actua unicamente como un canal de contacto.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">4. No somos corredores</h4>
          <p>
            Brupi no es una inmobiliaria ni corredor inmobiliario. No gestionamos
            operaciones ni cobramos comisiones por los acuerdos entre usuarios.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">5. Buenas practicas</h4>
          <p>
            Esperamos un comportamiento respetuoso entre usuarios. Las cuentas con uso
            abusivo, fraudulento o spam podran ser suspendidas.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">6. Privacidad</h4>
          <p>
            Los datos personales se utilizan solo para gestionar publicaciones y
            contactos. No compartimos informacion con terceros sin consentimiento.
          </p>
        </div>
      </LegalModal>
      <LegalModal
        open={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title="Politica de privacidad"
        subtitle="Como cuidamos tus datos en Brupi."
      >
        <div className="space-y-3">
          <h4 className="text-base text-white">Datos que recopilamos</h4>
          <p>
            Solo pedimos la informacion necesaria para crear una cuenta, publicar y
            contactar. Nunca vendemos datos a terceros.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">Uso de la informacion</h4>
          <p>
            Utilizamos tus datos para facilitar el contacto y mejorar la calidad de las
            publicaciones. Puedes solicitar la eliminacion de tu cuenta cuando quieras.
          </p>
        </div>
        <div className="space-y-3">
          <h4 className="text-base text-white">Seguridad</h4>
          <p>
            Aplicamos buenas practicas de seguridad y controlamos accesos para proteger tu
            informacion.
          </p>
        </div>
      </LegalModal>
      </div>
    </ToastProvider>
  );
}
