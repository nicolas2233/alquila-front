type ConfirmLeaveModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmLeaveModal({
  open,
  title = "¿Salir sin guardar?",
  message = "Tenés cambios sin guardar. Si salís, se van a perder.",
  onConfirm,
  onCancel,
}: ConfirmLeaveModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-night-900/95 shadow-card">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-lg text-white">{title}</h3>
          <p className="text-xs text-[#9a948a]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#c7c2b8]"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-[#b88b50] to-[#e0c08a] px-4 py-2 text-xs font-semibold text-night-900"
            onClick={onConfirm}
          >
            Salir
          </button>
        </div>
      </div>
    </div>
  );
}
