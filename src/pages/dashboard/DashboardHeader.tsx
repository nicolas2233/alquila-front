import { getSectionSubtitle, getSectionTitle, type PanelSection } from "../../shared/utils/dashboardSections";

export function DashboardHeader({
  activeSection,
  isAgency,
  onOpenMenu,
}: {
  activeSection: PanelSection;
  isAgency: boolean;
  onOpenMenu: () => void;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h2 className="text-3xl text-white">{getSectionTitle(activeSection, isAgency)}</h2>
        <p className="text-sm text-[#9a948a]">{getSectionSubtitle(activeSection)}</p>
      </div>
      <button
        type="button"
        className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8] lg:hidden"
        onClick={onOpenMenu}
      >
        Menú
      </button>
    </div>
  );
}
