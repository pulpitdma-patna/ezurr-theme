"use client";

import { getConsent } from "@/lib/consent";

/**
 * Consent-gated GA4 + Meta Pixel façade. Vendor scripts are injected only after
 * explicit consent (see AnalyticsLoader); event helpers no-op until then. Call
 * sites use the typed helpers — they never touch gtag/fbq directly.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
    dataLayer?: unknown[];
    fbq?: ((...args: unknown[]) => void) & { callMethod?: (...a: unknown[]) => void; queue?: unknown[]; loaded?: boolean; version?: string; push?: unknown };
    _fbq?: unknown;
  }
}

let gaLoaded = false;
let pixelLoaded = false;

export function initAnalytics({ ga, pixel, nonce }: { ga?: string; pixel?: string; nonce?: string }) {
  if (typeof window === "undefined" || getConsent() !== "granted") return;
  if (ga && !gaLoaded) {
    gaLoaded = true;
    loadGtag(ga, nonce);
  }
  if (pixel && !pixelLoaded) {
    pixelLoaded = true;
    loadPixel(pixel, nonce);
  }
}

function loadGtag(id: string, nonce?: string) {
  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer!.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", id, { send_page_view: true });
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://www.googletagmanager.com/gtag/js?id=${id}`;
  if (nonce) s.nonce = nonce;
  document.head.appendChild(s);
}

function loadPixel(id: string, nonce?: string) {
  const w = window as Window;
  if (w.fbq) return;
  const fbq = function fbq(...args: unknown[]) {
    // @ts-expect-error fbq shim
    fbq.callMethod ? fbq.callMethod(...args) : fbq.queue!.push(args);
  } as Window["fbq"];
  w.fbq = fbq;
  w._fbq = w._fbq || fbq;
  // @ts-expect-error shim init
  fbq.queue = [];
  // @ts-expect-error shim init
  fbq.loaded = true;
  // @ts-expect-error shim init
  fbq.version = "2.0";
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://connect.facebook.net/en_US/fbevents.js";
  if (nonce) s.nonce = nonce;
  document.head.appendChild(s);
  w.fbq!("init", id);
  w.fbq!("track", "PageView");
}

function ready(): boolean {
  return typeof window !== "undefined" && getConsent() === "granted";
}

/**
 * The GA4 client id from the first-party `_ga` cookie (format
 * `GA1.1.<a>.<b>` → client id `<a>.<b>`). Sent with the order so the server-side
 * purchase mirror stitches to the same GA user/session. Undefined when GA has
 * not set the cookie (no consent / not loaded) — the server derives a fallback.
 */
export function getGaClientId(): string | undefined {
  if (typeof document === "undefined") return undefined;
  const m = document.cookie.match(/_ga=GA\d\.\d\.(\d+\.\d+)/);
  return m?.[1];
}

type Item = { id: string; name: string; price?: number; qty?: number };

function gaItems(items: Item[]) {
  return items.map((i) => ({ item_id: i.id, item_name: i.name, price: i.price, quantity: i.qty ?? 1 }));
}

export function viewItem(item: Item) {
  if (!ready()) return;
  window.gtag?.("event", "view_item", { currency: "INR", value: item.price, items: gaItems([item]) });
  window.fbq?.("track", "ViewContent", { content_ids: [item.id], content_name: item.name, value: item.price, currency: "INR" });
}

export function addToCart(item: Item) {
  if (!ready()) return;
  const value = (item.price ?? 0) * (item.qty ?? 1);
  window.gtag?.("event", "add_to_cart", { currency: "INR", value, items: gaItems([item]) });
  window.fbq?.("track", "AddToCart", { content_ids: [item.id], content_name: item.name, value, currency: "INR" });
}

export function beginCheckout(payload: { value: number; items: Item[] }) {
  if (!ready()) return;
  window.gtag?.("event", "begin_checkout", { currency: "INR", value: payload.value, items: gaItems(payload.items) });
  window.fbq?.("track", "InitiateCheckout", { value: payload.value, currency: "INR", num_items: payload.items.length });
}

export function addPaymentInfo(payload: { value: number; method?: string }) {
  if (!ready()) return;
  window.gtag?.("event", "add_payment_info", { currency: "INR", value: payload.value, payment_type: payload.method });
  window.fbq?.("track", "AddPaymentInfo", { value: payload.value, currency: "INR" });
}

export function purchase(payload: { transactionId: string; value: number; items: Item[] }) {
  if (!ready()) return;
  window.gtag?.("event", "purchase", {
    transaction_id: payload.transactionId,
    currency: "INR",
    value: payload.value,
    items: gaItems(payload.items),
  });
  window.fbq?.("track", "Purchase", { value: payload.value, currency: "INR", num_items: payload.items.length }, { eventID: payload.transactionId });
}
