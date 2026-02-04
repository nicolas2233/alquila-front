import type { PanelSection } from "../../shared/utils/dashboardSections";

export function DashboardSidebar({
  activeSection,
  isAgency,
  showMyRequests,
  onSelectSection,
}: {
  activeSection: PanelSection;
  isAgency: boolean;
  showMyRequests: boolean;
  onSelectSection: (section: PanelSection) => void;
}) {
  return (
    <aside className="glass-card flex flex-col gap-2 p-4 lg:sticky lg:top-24 lg:h-fit">
      <div className="text-xs uppercase tracking-[0.2em] text-[#9a948a]">Panel</div>
      <button
        type="button"
        onClick={() => onSelectSection("profile")}
        className={
          activeSection === "profile"
            ? "w-full rounded-xl border border-gold-500/40 bg-night-900/60 px-3 py-2 text-left text-white"
            : "w-full rounded-xl border border-white/10 bg-night-900/40 px-3 py-2 text-left text-[#c7c2b8]"
        }
      >
        {isAgency ? "Perfil inmobiliaria" : "Perfil dueño"}
      </button>
      <button
        type="button"
        onClick={() => onSelectSection("listings")}
        className={
          activeSection === "listings"
            ? "w-full rounded-xl border border-gold-500/40 bg-night-900/60 px-3 py-2 text-left text-white"
            : "w-full rounded-xl border border-white/10 bg-night-900/40 px-3 py-2 text-left text-[#c7c2b8]"
        }
      >
        Mis inmuebles
      </button>
      <button
        type="button"
        onClick={() => onSelectSection("requests")}
        className={
          activeSection === "requests"
            ? "w-full rounded-xl border border-gold-500/40 bg-night-900/60 px-3 py-2 text-left text-white"
            : "w-full rounded-xl border border-white/10 bg-night-900/40 px-3 py-2 text-left text-[#c7c2b8]"
        }
      >
        Solicitudes
      </button>
      {showMyRequests && (
        <button
          type="button"
          onClick={() => onSelectSection("my-requests")}
          className={
            activeSection === "my-requests"
              ? "w-full rounded-xl border border-gold-500/40 bg-night-900/60 px-3 py-2 text-left text-white"
              : "w-full rounded-xl border border-white/10 bg-night-900/40 px-3 py-2 text-left text-[#c7c2b8]"
          }
        >
          Mis solicitudes
        </button>
      )}
    </aside>
  );
}
