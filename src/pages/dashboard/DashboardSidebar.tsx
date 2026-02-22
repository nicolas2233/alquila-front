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
    <aside className="glass-card flex flex-col gap-2 p-3 lg:sticky lg:top-24 lg:h-fit lg:p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-[#D1C7BD]">Panel</div>
      <button
        type="button"
        onClick={() => onSelectSection("profile")}
        className={
          activeSection === "profile"
            ? "w-full rounded-xl border border-gold-500/40 bg-night-900/48 px-3 py-2.5 text-left text-sm text-white"
            : "w-full rounded-xl border border-white/10 bg-night-900/32 px-3 py-2.5 text-left text-sm text-[#E7E2DD]"
        }
      >
        {isAgency ? "Perfil inmobiliaria" : "Perfil dueño"}
      </button>
      <button
        type="button"
        onClick={() => onSelectSection("listings")}
        className={
          activeSection === "listings"
            ? "w-full rounded-xl border border-gold-500/40 bg-night-900/48 px-3 py-2.5 text-left text-sm text-white"
            : "w-full rounded-xl border border-white/10 bg-night-900/32 px-3 py-2.5 text-left text-sm text-[#E7E2DD]"
        }
      >
        Mis inmuebles
      </button>
      <button
        type="button"
        onClick={() => onSelectSection("requests")}
        className={
          activeSection === "requests"
            ? "w-full rounded-xl border border-gold-500/40 bg-night-900/48 px-3 py-2.5 text-left text-sm text-white"
            : "w-full rounded-xl border border-white/10 bg-night-900/32 px-3 py-2.5 text-left text-sm text-[#E7E2DD]"
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
              ? "w-full rounded-xl border border-gold-500/40 bg-night-900/48 px-3 py-2.5 text-left text-sm text-white"
              : "w-full rounded-xl border border-white/10 bg-night-900/32 px-3 py-2.5 text-left text-sm text-[#E7E2DD]"
          }
        >
          Mis solicitudes
        </button>
      )}
    </aside>
  );
}

