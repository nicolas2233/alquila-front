type LegalModalProps = {
  open: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: React.ReactNode;
};

export function LegalModal({ open, title, subtitle, onClose, children }: LegalModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/82 px-4 py-6 backdrop-blur-sm">
      <div className="w-full max-w-2xl overflow-hidden rounded-3xl border border-white/10 bg-night-950/96 shadow-card">
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-4">
          <div>
            <h3 className="text-xl text-white">{title}</h3>
            {subtitle && <p className="text-xs text-[#D1C7BD]">{subtitle}</p>}
          </div>
          <button
            className="rounded-full border border-white/20 px-3 py-1 text-xs text-[#E7E2DD]"
            type="button"
            onClick={onClose}
          >
            Cerrar
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto space-y-4 px-6 py-5 text-sm text-[#E7E2DD]">
          {children}
        </div>
        <div className="flex justify-end border-t border-white/10 px-6 py-4">
          <button
            className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
            type="button"
            onClick={onClose}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
