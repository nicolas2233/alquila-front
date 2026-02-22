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
        <h2 className="text-2xl text-white sm:text-3xl">
          {getSectionTitle(activeSection, isAgency)}
        </h2>
        <p className="text-xs text-[#D1C7BD] sm:text-sm">{getSectionSubtitle(activeSection)}</p>
      </div>
      <button
        type="button"
        className="inline-flex items-center gap-2 rounded-full border border-gold-400/45 bg-gold-500/15 px-4 py-2 text-xs font-semibold text-gold-100 shadow-[0_0_0_1px_rgba(209,164,102,0.22)] lg:hidden"
        onClick={onOpenMenu}
      >
        <span
          aria-hidden="true"
          className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-gold-300/30 bg-gold-500/20 text-[11px]"
        >
          ≡
        </span>
        Menú
      </button>
    </div>
  );
}

