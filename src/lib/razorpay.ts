// Lazy loader for the Razorpay Checkout script. Only ever invoked for a real
// (non-simulated) prepaid order, so nothing loads in log/dev mode. The script
// host must be allowed by the CSP (see src/middleware.ts).

export interface RazorpaySuccess {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
}

export interface RazorpayOptions {
  key: string;
  order_id: string;
  amount: number; // in paise
  currency: string;
  name?: string;
  description?: string;
  prefill?: { name?: string; contact?: string; email?: string };
  notes?: Record<string, string>;
  theme?: { color?: string };
  handler?: (response: RazorpaySuccess) => void;
  modal?: { ondismiss?: () => void };
}

interface RazorpayInstance {
  open: () => void;
}

type RazorpayConstructor = new (options: RazorpayOptions) => RazorpayInstance;

declare global {
  interface Window {
    Razorpay?: RazorpayConstructor;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";
let loading: Promise<RazorpayConstructor> | null = null;

export function loadRazorpay(): Promise<RazorpayConstructor> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("Razorpay is browser-only"));
  }
  if (window.Razorpay) return Promise.resolve(window.Razorpay);
  if (loading) return loading;

  loading = new Promise<RazorpayConstructor>((resolve, reject) => {
    const el = document.createElement("script");
    el.src = SCRIPT_SRC;
    el.async = true;
    el.addEventListener("load", () => {
      if (window.Razorpay) resolve(window.Razorpay);
      else reject(new Error("Razorpay failed to initialize"));
    });
    el.addEventListener("error", () => {
      loading = null; // allow a retry on next attempt
      reject(new Error("Failed to load the payment gateway"));
    });
    document.body.appendChild(el);
  });

  return loading;
}
