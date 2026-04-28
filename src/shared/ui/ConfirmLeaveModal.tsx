type ConfirmLeaveModalProps = {
  open: boolean;
  title?: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmLeaveModal({
  open,
  title = "¿Salir sin guardar?",
  message = "Tenés cambios sin guardar. Si salís, se van a perder.",
  confirmLabel = "Salir",
  cancelLabel = "Cancelar",
  onConfirm,
  onCancel,
}: ConfirmLeaveModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1800] flex items-center justify-center bg-night-950 px-4 py-6">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-night-900 shadow-card">
        <div className="border-b border-white/10 px-6 py-4">
          <h3 className="text-lg text-white">{title}</h3>
          <p className="text-xs text-[#D1C7BD]">{message}</p>
        </div>
        <div className="flex items-center justify-end gap-3 px-6 py-4">
          <button
            type="button"
            className="rounded-full border border-white/20 px-4 py-2 text-xs text-[#E7E2DD]"
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="rounded-full bg-gradient-to-r from-[#AF8C5C] to-[#D1C7BD] px-4 py-2 text-xs font-semibold text-night-900"
            onClick={onConfirm}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
