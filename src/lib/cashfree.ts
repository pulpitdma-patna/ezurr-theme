// Lazy loader for Cashfree Checkout.js. Invoked only for a real (non-simulated)
// Cashfree prepaid / COD-advance order. Hosts must be allowed by the CSP
// (see src/middleware.ts).

export interface CashfreeCheckoutOptions {
  paymentSessionId: string;
  redirectTarget?: "_modal" | "_self" | "_blank";
}

export interface CashfreeCheckoutResult {
  error?: { message?: string };
  redirect?: boolean;
  paymentDetails?: unknown;
}

interface CashfreeInstance {
  checkout: (options: CashfreeCheckoutOptions) => Promise<CashfreeCheckoutResult>;
}

type CashfreeFactory = (opts: { mode: "sandbox" | "production" }) => CashfreeInstance;

declare global {
  interface Window {
    Cashfree?: CashfreeFactory;
  }
}

const SCRIPT_SRC = "https://sdk.cashfree.com/js/v3/cashfree.js";
let loading: Promise<CashfreeFactory> | null = null;

export function loadCashfree(): Promise<CashfreeFactory> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Cashfree is browser-only"));
  }
  if (window.Cashfree) return Promise.resolve(window.Cashfree);
  if (loading) return loading;

  loading = new Promise<CashfreeFactory>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.addEventListener("load", () => {
      if (window.Cashfree) resolve(window.Cashfree);
      else reject(new Error("Cashfree failed to initialize"));
    });
    el.addEventListener("error", () => {
      loading = null;
      reject(new Error("Failed to load the payment gateway"));
    });
    document.body.appendChild(el);
  });

  return loading;
}

/** Fallback when the API omits mode — simulated sessions are always sandbox. */
export function cashfreeMode(sessionId: string): "sandbox" | "production" {
  return sessionId.startsWith("session_sim_") ? "sandbox" : "production";
}

/** Prefer server-provided mode; fall back to session-id heuristic. */
export function resolveCashfreeMode(
  serverMode: string | null | undefined,
  sessionId: string,
): "sandbox" | "production" {
  if (serverMode === "sandbox" || serverMode === "production") return serverMode;
  return cashfreeMode(sessionId);
}
