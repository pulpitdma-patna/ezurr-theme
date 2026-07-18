"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type ToastTone = "neutral" | "success" | "warning" | "danger";

type ToastItem = {
  id: string;
  message: string;
  tone: ToastTone;
};

type ToastApi = {
  push: (message: string, tone?: ToastTone) => void;
};

const ToastContext = createContext<ToastApi | null>(null);

const toneClass: Record<ToastTone, string> = {
  neutral: "border-black/[0.08] bg-[#1D1D1F] text-white",
  success: "border-[#067647]/20 bg-[#ECFDF3] text-[#067647]",
  warning: "border-[#B54708]/20 bg-[#FFFAEB] text-[#B54708]",
  danger: "border-[#B42318]/20 bg-[#FEF3F2] text-[#B42318]",
};

export function AdminToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback((message: string, tone: ToastTone = "neutral") => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    setItems((prev) => [...prev.slice(-4), { id, message, tone }]);
  }, []);

  useEffect(() => {
    if (items.length === 0) return;
    const latest = items[items.length - 1];
    const id = window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== latest.id));
    }, 2800);
    return () => window.clearTimeout(id);
  }, [items]);

  const api = useMemo(() => ({ push }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[80] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2"
        aria-live="polite"
      >
        {items.map((item) => (
          <div
            key={item.id}
            className={`pointer-events-auto rounded-xl border px-3.5 py-2.5 text-sm font-medium shadow-[0_12px_32px_rgba(17,17,19,0.14)] ${toneClass[item.tone]}`}
          >
            {item.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useAdminToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    return {
      push: (message: string) => {
        if (typeof window !== "undefined") {
          console.info("[admin toast]", message);
        }
      },
    };
  }
  return ctx;
}
