import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";

type ToastTone = "success" | "error" | "info" | "warning";

interface ToastInput {
  title: string;
  description?: string;
  tone?: ToastTone;
}

interface ToastRecord extends ToastInput {
  id: string;
  tone: ToastTone;
}

interface ToastContextValue {
  notify: (toast: ToastInput) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const toneStyles: Record<ToastTone, { icon: typeof Info; className: string }> = {
  success: { icon: CheckCircle2, className: "border-emerald-200 bg-emerald-50 text-emerald-900" },
  error: { icon: XCircle, className: "border-red-200 bg-red-50 text-red-900" },
  warning: { icon: AlertTriangle, className: "border-amber-200 bg-amber-50 text-amber-900" },
  info: { icon: Info, className: "border-cyan-200 bg-cyan-50 text-cyan-950" },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: ToastInput) => {
      const id = crypto.randomUUID();
      const record: ToastRecord = { ...toast, id, tone: toast.tone || "info" };
      setToasts((current) => [record, ...current].slice(0, 4));
      window.setTimeout(() => dismiss(id), toast.tone === "error" ? 6500 : 4200);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 grid w-[min(420px,calc(100vw-2rem))] gap-3">
        {toasts.map((toast) => {
          const style = toneStyles[toast.tone];
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex gap-3 rounded-lg border p-4 shadow-card backdrop-blur ${style.className}`}
              role="status"
            >
              <Icon className="mt-0.5 h-5 w-5 shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{toast.title}</p>
                {toast.description ? <p className="mt-1 text-sm opacity-80">{toast.description}</p> : null}
              </div>
              <button className="grid h-7 w-7 shrink-0 place-items-center rounded-md transition hover:bg-black/5" type="button" onClick={() => dismiss(toast.id)}>
                <X className="h-4 w-4" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used inside ToastProvider.");
  return context;
}
