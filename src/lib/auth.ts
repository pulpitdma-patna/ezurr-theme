export type AuthSession = {
  mobile: string;
  name: string;
  initials: string;
  signedInAt: string;
};

const STORAGE_KEY = "ezurr_auth_session";

export function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isValidMobile(value: string) {
  return /^[6-9]\d{9}$/.test(normalizeMobile(value));
}

export function isValidOtp(value: string) {
  return /^\d{6}$/.test(value);
}

export function formatMobileDisplay(value: string) {
  const digits = normalizeMobile(value);
  if (digits.length !== 10) return `+91 ${digits}`;
  return `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
}

export function maskMobile(value: string) {
  const digits = normalizeMobile(value);
  if (digits.length !== 10) return formatMobileDisplay(digits);
  return `+91 ${digits.slice(0, 2)}••• ••${digits.slice(8)}`;
}

function defaultNameFromMobile(mobile: string) {
  const digits = normalizeMobile(mobile);
  return `Player ${digits.slice(-4)}`;
}

export function createSession(mobile: string): AuthSession {
  const digits = normalizeMobile(mobile);
  const name = defaultNameFromMobile(digits);
  return {
    mobile: digits,
    name,
    initials: "EZ",
    signedInAt: new Date().toISOString(),
  };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.mobile || !isValidMobile(parsed.mobile)) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function setSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("ezurr-auth-change"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  window.dispatchEvent(new Event("ezurr-auth-change"));
}
