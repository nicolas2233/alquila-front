import { createContext, useCallback, useContext, useMemo, useState } from "react";

type ToastType = "success" | "error" | "info" | "warning";

type Toast = {
  id: string;
  type: ToastType;
  message: string;
  duration: number;
  actionLabel?: string;
  onAction?: () => void;
};

type ToastContextValue = {
  addToast: (
    message: string,
    type?: ToastType,
    duration?: number,
    actionLabel?: string,
    onAction?: () => void
  ) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const toastStyles: Record<ToastType, string> = {
  success: "border-white/10 bg-[#E7E2DD] text-[#1A1613]",
  error: "border-white/10 bg-[#E7E2DD] text-[#1A1613]",
  info: "border-white/10 bg-[#E7E2DD] text-[#1A1613]",
  warning: "border-white/10 bg-[#E7E2DD] text-[#1A1613]",
};

const toastIcons: Record<ToastType, string> = {
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
  warning: "⚠️",
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const addToast = useCallback(
    (
      message: string,
      type: ToastType = "info",
      duration = 2800,
      actionLabel?: string,
      onAction?: () => void
    ) => {
      const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
      const toast: Toast = { id, type, message, duration, actionLabel, onAction };
      setItems((prev) => [...prev, toast]);
      window.setTimeout(() => removeToast(id), duration);
    },
    [removeToast]
  );

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-2 z-[1400] flex flex-col items-center gap-2 sm:inset-x-auto sm:left-1/2 sm:-translate-x-1/2"
        style={{ top: "calc(var(--app-toast-top) + env(safe-area-inset-top))" }}
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto w-full max-w-sm rounded-2xl border px-4 py-2 text-xs shadow-card ${toastStyles[item.type]}`}
          >
            <span className="mr-2" aria-hidden="true">
              {toastIcons[item.type]}
            </span>
            {item.message}
            {item.actionLabel && item.onAction && (
              <button
                type="button"
                className="ml-3 rounded-full border border-black/20 px-2 py-0.5 text-[11px] font-semibold text-[#1A1613]"
                onClick={() => {
                  item.onAction?.();
                  removeToast(item.id);
                }}
              >
                {item.actionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
