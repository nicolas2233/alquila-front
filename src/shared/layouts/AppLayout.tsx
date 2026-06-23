import { useEffect, useState, lazy, Suspense } from "react";
const OnboardingModal = lazy(() =>
  import("../ui/OnboardingModal").then((m) => ({ default: m.OnboardingModal }))
);
import { NavLink, Outlet, Link, useLocation, useNavigate } from "react-router-dom";
import { Container } from "../ui/Container";
import { clearSession, getSessionUser, getToken } from "../auth/session";
import { hasCompletedOnboarding } from "../ui/OnboardingModal";
import type { ReactNode } from "react";
import type { SessionUser } from "../auth/session";
import { env } from "../config/env";
import { ToastProvider } from "../ui/toast/ToastProvider";
import { LegalModal } from "../ui/LegalModal";
import { ConfirmLeaveModal } from "../ui/ConfirmLeaveModal";
import { identifyUser, trackPageView } from "../analytics/posthog";
import { SeoRouteMeta } from "../seo/SeoRouteMeta";
import { LegalDocumentContent, legalDocuments } from "../legal/legalDocuments";
// import { FloatingChat } from "../ui/chat/FloatingChat";

const navClass = ({ isActive }: { isActive: boolean }) =>
  isActive ? "text-gold-400" : "text-[#E7E2DD]";

type MobileDockItem = {
  to?: string;
  label: string;
  icon: ReactNode;
  showDot?: boolean;
  onClick?: () => void;
};

function DockIcon({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex h-5 w-5 items-center justify-center" aria-hidden="true">
      {children}
    </span>
  );
}

function IconSearch() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <circle cx="11" cy="11" r="6.5" />
      <path d="m16 16 4.2 4.2" strokeLinecap="round" />
    </svg>
  );
}

function IconMap() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M8 6 3.8 7.7A1 1 0 0 0 3 8.63v9.74a1 1 0 0 0 1.37.93L8 17.8l8 3.2 4.2-1.68a1 1 0 0 0 .8-.93V8.63a1 1 0 0 0-1.37-.93L16 9.2 8 6Z" />
      <path d="M8 6v11.8M16 9.2V21" />
    </svg>
  );
}

function IconPanel() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <rect x="3.5" y="4" width="7.5" height="7.5" rx="1.2" />
      <rect x="13" y="4" width="7.5" height="5.1" rx="1.2" />
      <rect x="13" y="11" width="7.5" height="9" rx="1.2" />
      <rect x="3.5" y="13.4" width="7.5" height="6.6" rx="1.2" />
    </svg>
  );
}

function IconBell() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M6.2 16.3h11.6c-.78-1.08-1.2-2.4-1.2-3.74V10a4.6 4.6 0 0 0-9.2 0v2.56c0 1.34-.42 2.66-1.2 3.74Z" />
      <path d="M9.4 18.6a2.8 2.8 0 0 0 5.2 0" strokeLinecap="round" />
    </svg>
  );
}

function IconHome() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="m4.8 10.2 6.64-5.54a.86.86 0 0 1 1.1 0l6.66 5.54v8.1a1 1 0 0 1-1 1H5.8a1 1 0 0 1-1-1v-8.1Z" />
      <path d="M9.2 19.3v-5.1h5.6v5.1" />
    </svg>
  );
}

function IconPlus() {
  return (
    <svg viewBox="0 0 24 24" className="h-7 w-7 fill-none stroke-current stroke-[2]">
      <path d="M12 5.5v13M5.5 12h13" strokeLinecap="round" />
    </svg>
  );
}

function IconLogin() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M10 4.8H7a2 2 0 0 0-2 2v10.4a2 2 0 0 0 2 2h3" />
      <path d="M14 8.3 18.8 12 14 15.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M18.4 12H9.2" strokeLinecap="round" />
    </svg>
  );
}

function IconLogout() {
  return (
    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-none stroke-current stroke-[1.8]">
      <path d="M14 4.8h3a2 2 0 0 1 2 2v10.4a2 2 0 0 1-2 2h-3" />
      <path d="M10 8.3 5.2 12 10 15.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M5.6 12h9.2" strokeLinecap="round" />
    </svg>
  );
}

function MobileDockTab({ to, label, icon, showDot = false, onClick }: MobileDockItem) {
  if (!to) {
    return (
      <button type="button" className="group min-w-0 px-2" onClick={onClick}>
        <span className="relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-0.5 text-[#b5ada1] transition">
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-transparent text-current transition group-hover:bg-white/8 group-hover:text-white">
            {icon}
          </span>
          <span className="max-w-[54px] truncate text-[9px] font-semibold leading-none">{label}</span>
          {showDot && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold-500" />}
        </span>
      </button>
    );
  }
  return (
    <NavLink to={to} className="group min-w-0 px-2">
      {({ isActive }) => (
        <span
          className={`relative flex flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-0.5 transition ${
            isActive ? "text-white" : "text-[#b5ada1]"
          }`}
        >
          <span
            className={`inline-flex h-7 w-7 items-center justify-center rounded-full transition ${
              isActive
                ? "bg-gold-500/20 text-gold-200"
                : "bg-transparent text-current group-hover:bg-white/8 group-hover:text-white"
            }`}
          >
            {icon}
          </span>
          <span className="max-w-[54px] truncate text-[9px] font-semibold leading-none">{label}</span>
          {showDot && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold-500" />}
        </span>
      )}
    </NavLink>
  );
}

export function AppLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === "/";
  const isMapPage = location.pathname === "/mapa";
  const isListingPage =
    location.pathname.startsWith("/publicacion/") ||
    location.pathname.startsWith("/publicación/");
  const isAuthPage = ["/login", "/registro", "/recuperar", "/reset-password"].includes(
    location.pathname
  );
  const [user, setUser] = useState<SessionUser | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [token, setToken] = useState<string | null>(null);
  const [showTerms, setShowTerms] = useState(false);
  const [showPrivacy, setShowPrivacy] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);

  useEffect(() => {
    const currentUser = getSessionUser();
    setUser(currentUser);
    setToken(getToken());
    // Show onboarding to new publisher users who haven't seen it
    if (currentUser && (currentUser.role === "OWNER" || currentUser.role?.startsWith("AGENCY")) && !hasCompletedOnboarding()) {
      setTimeout(() => setShowOnboarding(true), 1500);
    }
  }, [location.pathname]);

  useEffect(() => {
    identifyUser(user);
  }, [user]);

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  // Subir al tope solo al navegar a otra página (cambio de pathname), NO al cambiar
  // la query (filtros/orden en /buscar): así no se pierde la posición de scroll al filtrar.
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
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
          credentials: "include",
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
    // Poll every 60 seconds for new notifications
    const interval = setInterval(() => { void loadCount(); }, 60_000);
    return () => {
      ignore = true;
      clearInterval(interval);
    };
  }, [token, location.pathname]);

  const handleLogout = () => {
    setShowLogoutConfirm(true);
  };

  const confirmLogout = () => {
    clearSession();
    setUser(null);
    setShowLogoutConfirm(false);
    navigate("/login");
  };

  const cancelLogout = () => {
    setShowLogoutConfirm(false);
  };

  const mobileLeftItems: MobileDockItem[] = [
    { to: "/buscar", label: "Buscar", icon: <DockIcon><IconSearch /></DockIcon> },
    { to: "/mapa", label: "Mapa", icon: <DockIcon><IconMap /></DockIcon> },
  ];

  let mobileRightItems: MobileDockItem[] = [];
  let mobileCenterAction: { to: string; label: string; icon: ReactNode } = {
    to: "/registro",
    label: "Crear cuenta",
    icon: <IconPlus />,
  };

  if (!user) {
    mobileCenterAction = { to: "/registro", label: "Crear cuenta", icon: <IconPlus /> };
    mobileRightItems = [
      { to: "/", label: "Inicio", icon: <DockIcon><IconHome /></DockIcon> },
      { to: "/login", label: "Login", icon: <DockIcon><IconLogin /></DockIcon> },
    ];
  } else if (user.role === "VISITOR") {
    mobileCenterAction = {
      to: "/buscar",
      label: "Buscar",
      icon: <IconSearch />,
    };
    mobileRightItems = [
      {
        label: "Salir",
        icon: <DockIcon><IconLogout /></DockIcon>,
        onClick: handleLogout,
        showDot: notificationCount > 0,
      },
    ];
  } else if (user.role === "ADMIN") {
    mobileCenterAction = { to: "/admin", label: "Admin", icon: <IconPanel /> };
    mobileRightItems = [
      {
        to: "/notificaciones",
        label: "Avisos",
        icon: <DockIcon><IconBell /></DockIcon>,
        showDot: notificationCount > 0,
      },
      { label: "Salir", icon: <DockIcon><IconLogout /></DockIcon>, onClick: handleLogout },
    ];
  } else {
    mobileCenterAction = { to: "/publicar", label: "Publicar", icon: <IconPlus /> };
    mobileRightItems = [
      {
        to: "/panel?tab=listings",
        label: "Panel",
        icon: <DockIcon><IconPanel /></DockIcon>,
        showDot: notificationCount > 0,
      },
      {
        label: "Salir",
        icon: <DockIcon><IconLogout /></DockIcon>,
        onClick: handleLogout,
        showDot: notificationCount > 0,
      },
    ];
  }

  const mobileLeftDockItems: MobileDockItem[] =
    user?.role === "VISITOR"
      ? [{ to: "/mapa", label: "Mapa", icon: <DockIcon><IconMap /></DockIcon> }]
      : mobileLeftItems;
  const mobileLeftCols = mobileLeftDockItems.length === 1 ? "grid-cols-1" : "grid-cols-2";
  const mobileLeftWidth = mobileLeftDockItems.length === 1 ? "w-[30%]" : "w-[42%]";
  const mobileRightCols = mobileRightItems.length === 1 ? "grid-cols-1" : "grid-cols-2";
  const mobileRightWidth = mobileRightItems.length === 1 ? "w-[30%]" : "w-[42%]";
  const mobileRightAlign = mobileRightItems.length === 1 ? "justify-items-end" : "";

  return (
    <ToastProvider>
      <SeoRouteMeta />
      <div className="min-h-screen">
      <header className="sticky top-0 z-[1200] hidden border-b border-gold-500/20 bg-night-900/82 backdrop-blur-xl lg:block">
        <Container>
          <div className="grid items-center gap-4 py-4 sm:gap-6 sm:py-5 lg:grid-cols-[auto_1fr_auto]">
            <Link
              to="/"
              className="text-center font-display text-xl tracking-wide text-white sm:text-2xl lg:text-left"
            >
              DomusBrag
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
                    <span className="inline-flex items-center gap-2">
                      Mis solicitudes
                      {notificationCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-gold-400" />
                      )}
                    </span>
                  </NavLink>
                  <NavLink to="/perfil" className={navClass}>
                    <span className="inline-flex items-center gap-2">
                      Mi perfil
                      {notificationCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-gold-400" />
                      )}
                    </span>
                  </NavLink>
                </>
              )}
              {user && user.role === "ADMIN" && (
                <NavLink to="/admin" className={navClass}>
                  Admin
                </NavLink>
              )}
              {user && user.role !== "VISITOR" && user.role !== "ADMIN" && (
                <>
                  <NavLink to="/publicar" className={navClass}>
                    Publicar
                  </NavLink>
                  <NavLink to="/panel?tab=listings" className={navClass}>
                    <span className="inline-flex items-center gap-2">
                      Panel
                      {notificationCount > 0 && (
                        <span className="h-2 w-2 rounded-full bg-gold-400" />
                      )}
                    </span>
                  </NavLink>
                </>
              )}
            </nav>
            {user ? (
              <div className="flex flex-col items-center gap-3 text-xs text-[#E7E2DD] sm:flex-row sm:text-sm">
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
                  className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900 shadow-soft sm:text-sm"
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
      <main
        className={
          isMapPage
            ? "overflow-hidden"
            : isHome
            ? "pb-safe-tabs lg:pb-16"
            : isListingPage
            ? "pt-3 pb-safe-tabs lg:pt-6 lg:pb-12"
            : isAuthPage
            ? "py-2 pb-4 lg:py-4 lg:pb-6"
            : "py-6 pb-safe-tabs lg:py-16 lg:pb-16"
        }
        style={isMapPage ? { height: "calc(100dvh - 76px)" } : undefined}
      >
        {isHome || isMapPage ? (
          <Outlet />
        ) : (
          <Container>
            <Outlet />
          </Container>
        )}
      </main>
      <footer className="border-t border-white/10 bg-night-900/68 py-10 pb-safe-tabs text-sm text-[#D1C7BD] lg:pb-10">
        <Container>
          <div className="grid gap-8 md:grid-cols-[1.2fr_1fr_1fr]">
            <div className="space-y-3">
              <div className="font-display text-xl text-white">DomusBrag</div>
              <p className="text-sm text-[#D1C7BD]">
                Plataforma digital de publicaciones y contacto inmobiliario para Bragado. Conectamos personas con su
                próxima vivienda de forma clara y directa.
              </p>
              <div className="text-xs text-[#7b756d]">© 2026 DomusBrag. Todos los derechos reservados.</div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-white">Legal</div>
              <div className="flex flex-col gap-2 text-xs">
                <button
                  type="button"
                  className="text-left text-[#E7E2DD] hover:text-white"
                  onClick={() => setShowTerms(true)}
                >
                  Términos y condiciones
                </button>
                <button
                  type="button"
                  className="text-left text-[#E7E2DD] hover:text-white"
                  onClick={() => setShowPrivacy(true)}
                >
                  Política de privacidad
                </button>
                <Link to="/legal/publicaciones" className="text-left text-[#E7E2DD] hover:text-white">
                  Publicaciones y denuncias
                </Link>
                <Link to="/legal/planes" className="text-left text-[#E7E2DD] hover:text-white">
                  Planes, cancelación y reembolsos
                </Link>
                <Link
                  to="/legal/arrepentimiento"
                  className="text-left text-[#E7E2DD] hover:text-white"
                >
                  Botón de arrepentimiento
                </Link>
                <Link
                  to="/legal/baja-servicio"
                  className="text-left text-[#E7E2DD] hover:text-white"
                >
                  Baja de servicio
                </Link>
              </div>
            </div>
            <div className="space-y-3">
              <div className="text-sm text-white">Ayuda</div>
              <div className="flex flex-col gap-2 text-xs">
                <span>Contacto: contacto@domusbrag.com</span>
                <span>Soporte: soporte@domusbrag.com</span>
                <span>Legal / Copyright: legal@domusbrag.com</span>
                <span>Bragado, Buenos Aires</span>
              </div>
            </div>
          </div>
        </Container>
      </footer>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[1200] lg:hidden">
        <Container>
          <div className="relative px-1 pb-[calc(0.45rem+env(safe-area-inset-bottom))] pt-1">
            <div className="pointer-events-auto relative mx-auto flex max-w-md items-end justify-between rounded-[24px] border border-white/12 bg-night-900/88 px-3 pb-1.5 pt-4 shadow-[0_12px_28px_rgba(0,0,0,0.36)] backdrop-blur-xl">
              <div className={`grid ${mobileLeftWidth} ${mobileLeftCols} items-end`}>
                {mobileLeftDockItems.map((item) => (
                  <MobileDockTab
                    key={`${item.to ?? item.label}-left`}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    showDot={item.showDot}
                    onClick={item.onClick}
                  />
                ))}
              </div>
              <div className={`grid ${mobileRightWidth} ${mobileRightCols} ${mobileRightAlign} items-end`}>
                {mobileRightItems.map((item) => (
                  <MobileDockTab
                    key={`${item.to ?? item.label}-right`}
                    to={item.to}
                    label={item.label}
                    icon={item.icon}
                    showDot={item.showDot}
                    onClick={item.onClick}
                  />
                ))}
              </div>
              <Link
                to={mobileCenterAction.to}
                className="absolute left-1/2 top-0 inline-flex h-14 w-14 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-[3px] border-night-900 bg-gradient-to-br from-[#AF8C5C] to-[#7f6a4a] text-white shadow-[0_12px_24px_rgba(0,0,0,0.34)] transition hover:scale-[1.03]"
                aria-label={mobileCenterAction.label}
              >
                <DockIcon>
                  {mobileCenterAction.icon}
                </DockIcon>
              </Link>
            </div>
          </div>
        </Container>
      </div>
      {/** Chat in-app desactivado temporalmente */}
      <LegalModal
        open={showTerms}
        onClose={() => setShowTerms(false)}
        title={legalDocuments.terminos.title}
        subtitle={legalDocuments.terminos.subtitle}
      >
        <LegalDocumentContent document={legalDocuments.terminos} />
      </LegalModal>
      <LegalModal
        open={showPrivacy}
        onClose={() => setShowPrivacy(false)}
        title={legalDocuments.privacidad.title}
        subtitle={legalDocuments.privacidad.subtitle}
      >
        <LegalDocumentContent document={legalDocuments.privacidad} />
      </LegalModal>
      <ConfirmLeaveModal
        open={showLogoutConfirm}
        title="¿Cerrar sesión?"
        message="Vas a salir de tu cuenta y volver a la pantalla de login. Podras ingresar nuevamente cuando quieras."
        confirmLabel="Cerrar sesión"
        cancelLabel="Cancelar"
        onConfirm={confirmLogout}
        onCancel={cancelLogout}
      />
      {showOnboarding && (
        <Suspense fallback={null}>
          <OnboardingModal onClose={() => setShowOnboarding(false)} />
        </Suspense>
      )}
      </div>
    </ToastProvider>
  );
}







