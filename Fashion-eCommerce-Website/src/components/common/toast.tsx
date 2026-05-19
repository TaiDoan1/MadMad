import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

/* ─── Types ─────────────────────────────────────────────────────── */
export type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

/* ─── Context ────────────────────────────────────────────────────── */
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

/* ─── Config ─────────────────────────────────────────────────────── */
const TOAST_DURATION = 3500; // ms

const CONFIG: Record<ToastType, { icon: typeof CheckCircle; bg: string; border: string; text: string; progress: string }> = {
  success: {
    icon: CheckCircle,
    bg: "bg-white dark:bg-neutral-900",
    border: "border-green-400",
    text: "text-green-700 dark:text-green-400",
    progress: "bg-green-400",
  },
  error: {
    icon: XCircle,
    bg: "bg-white dark:bg-neutral-900",
    border: "border-red-400",
    text: "text-red-700 dark:text-red-400",
    progress: "bg-red-400",
  },
  warning: {
    icon: AlertTriangle,
    bg: "bg-white dark:bg-neutral-900",
    border: "border-amber-400",
    text: "text-amber-700 dark:text-amber-400",
    progress: "bg-amber-400",
  },
  info: {
    icon: Info,
    bg: "bg-white dark:bg-neutral-900",
    border: "border-blue-400",
    text: "text-blue-700 dark:text-blue-400",
    progress: "bg-blue-400",
  },
};

/* ─── Single Toast Item ──────────────────────────────────────────── */
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const cfg = CONFIG[toast.type];
  const Icon = cfg.icon;

  return (
    <div
      className={`
        relative flex items-start gap-3 w-[360px] max-w-[calc(100vw-2rem)]
        rounded-2xl border-l-4 ${cfg.border} ${cfg.bg}
        shadow-[0_8px_30px_rgb(0,0,0,0.12)] px-4 py-3.5
        animate-[slideInToast_0.35s_cubic-bezier(0.175,0.885,0.32,1.275)_both]
      `}
    >
      <Icon className={`h-5 w-5 shrink-0 mt-0.5 ${cfg.text}`} />
      <p className="flex-1 text-sm font-semibold text-neutral-800 dark:text-neutral-100 leading-snug pr-2">
        {toast.message}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
      >
        <X className="h-4 w-4" />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${cfg.progress} rounded-bl-2xl animate-[toastProgress_3.5s_linear_forwards]`}
        style={{ width: "100%" }}
      />
    </div>
  );
}

/* ─── Provider ───────────────────────────────────────────────────── */
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = "success") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setToasts((current) => [...current.slice(-4), { id, message, type }]);
    setTimeout(() => dismiss(id), TOAST_DURATION);
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast stack – bottom-right on desktop, bottom-center on mobile */}
      <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 items-end pointer-events-none">
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

/* ─── Hook ───────────────────────────────────────────────────────── */
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
