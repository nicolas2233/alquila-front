import { useEffect, useState } from "react";
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Container } from "../ui/Container";
import { clearSession, getSessionUser, getToken } from "../auth/session";
import type { SessionUser } from "../auth/session";
import { env } from "../config/env";

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "text-gold-400" : "text-[#c7c2b8]";

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);

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
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-gold-500/20 bg-night-900/80 backdrop-blur-xl">
        <Container>
          <div className="grid items-center gap-6 py-5 lg:grid-cols-[auto_1fr_auto]">
            <div className="font-display text-2xl tracking-wide">Alquila Bragado</div>
            <nav className="flex flex-wrap justify-center gap-6 text-sm">
              <NavLink to="/buscar" className={navClass}>
                Buscar
              </NavLink>
              <NavLink to="/mapa" className={navClass}>
                Mapa
              </NavLink>
              {user && (
                <>
                  <NavLink to="/busquedas" className={navClass}>
                    Mis busquedas
                  </NavLink>
                  <NavLink to="/notificaciones" className={navClass}>
                    Notificaciones
                    {notificationCount > 0 && (
                      <span className="ml-2 rounded-full bg-gold-500/30 px-2 py-0.5 text-[10px] text-gold-300">
                        {notificationCount}
                      </span>
                    )}
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
            </nav>
            {user ? (
              <div className="flex flex-wrap items-center gap-3 text-sm text-[#c7c2b8]">
                <span className="rounded-full border border-white/10 px-4 py-2">
                  Hola, {user.name ?? user.email}
                </span>
                <button
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/90"
                  type="button"
                  onClick={handleLogout}
                >
                  Salir
                </button>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-3">
                <Link
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-sm font-semibold text-night-900 shadow-soft"
                  to="/registro"
                >
                  Crear cuenta
                </Link>
                <Link
                  className="inline-flex items-center gap-2 rounded-full border border-white/20 px-4 py-2 text-sm font-semibold text-white/90"
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
      <footer className="py-10 text-sm text-[#9a948a]">
        <Container>Alquila Bragado. Publicaciones verificadas y sin duplicados.</Container>
      </footer>
    </div>
  );
}
