"use client";

export type Consent = "granted" | "denied" | "unset";

const KEY = "ez_tracking_consent_v1";
type Listener = () => void;
const listeners = new Set<Listener>();

/** Global Privacy Control / Do-Not-Track = an automatic opt-out we must honor. */
function privacySignalsDeny(): boolean {
  if (typeof navigator === "undefined") return false;
  const nav = navigator as Navigator & { globalPrivacyControl?: boolean };
  return (
    nav.globalPrivacyControl === true ||
    nav.doNotTrack === "1" ||
    (typeof window !== "undefined" && (window as unknown as { doNotTrack?: string }).doNotTrack === "1")
  );
}

export function getConsent(): Consent {
  if (typeof window === "undefined") return "unset";
  if (privacySignalsDeny()) return "denied"; // GPC/DNT overrides — never show tags
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw === "granted" || raw === "denied") return raw;
  } catch {
    /* ignore */
  }
  return "unset";
}

export function setConsent(value: "granted" | "denied") {
  try {
    window.localStorage.setItem(KEY, value);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeConsent(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}
