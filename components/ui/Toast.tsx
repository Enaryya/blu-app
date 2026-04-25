// components/ui/Toast.tsx
// A simple notification system that shows success/error/info pop-ups at the
// top of the screen. No external library — just React state + Tailwind.
//
// Usage:
//   const { showToast } = useToast();
//   showToast({ type: 'success', message: 'Saved!' });

"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
} from "react";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  showToast: (toast: Omit<Toast, "id">) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const typeStyles: Record<ToastType, string> = {
  success: "bg-success text-white",
  error: "bg-error text-white",
  warning: "bg-warning text-white",
  info: "bg-primary text-white",
};

const typeIcons: Record<ToastType, string> = {
  success: "✓",
  error: "✕",
  warning: "⚠",
  info: "ℹ",
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: (id: string) => void;
}) {
  // Auto-dismiss after 4 seconds
  useEffect(() => {
    const timer = setTimeout(() => onRemove(toast.id), 4000);
    return () => clearTimeout(timer);
  }, [toast.id, onRemove]);

  return (
    <div
      className={[
        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg",
        "animate-in slide-in-from-top duration-300",
        typeStyles[toast.type],
      ].join(" ")}
      role="alert"
    >
      <span className="text-lg font-bold shrink-0" aria-hidden="true">
        {typeIcons[toast.type]}
      </span>
      <p className="text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="ml-auto text-white/80 hover:text-white text-xl leading-none shrink-0"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback(({ type, message }: Omit<Toast, "id">) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container — fixed at the top of the screen */}
      <div
        className="fixed top-4 left-0 right-0 z-50 flex flex-col gap-2 px-4 max-w-lg mx-auto"
        aria-live="polite"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onRemove={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used inside <ToastProvider>");
  return ctx;
}
