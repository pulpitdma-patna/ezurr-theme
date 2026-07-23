export type AuthRole = "admin" | "customer";

export type AuthSession = {
  mobile: string;
  name: string;
  initials: string;
  signedInAt: string;
  role: AuthRole;
};

const STORAGE_KEY = "ezurr_auth_session";
const API_TOKEN_KEY = "ezurr_api_token";

function isApiMode(): boolean {
  const raw = process.env.NEXT_PUBLIC_API_URL?.trim();
  return Boolean(raw);
}

function getStoredApiToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(API_TOKEN_KEY);
  } catch {
    return null;
  }
}

/** True when a session may grant access (API mode requires a Sanctum token). */
export function isCredentialedSession(session: AuthSession | null | undefined): session is AuthSession {
  if (!session) return false;
  if (isApiMode() && !getStoredApiToken()) return false;
  return true;
}

export function normalizeMobile(value: string) {
  return value.replace(/\D/g, "").slice(0, 10);
}

export function isValidMobile(value: string) {
  return /^[6-9]\d{9}$/.test(normalizeMobile(value));
}

export function isValidOtp(value: string) {
  return /^\d{6}$/.test(value);
}

/** Demo rule: mobiles ending in 0000 are admins (e.g. 9876500000). */
export function isAdminMobile(value: string) {
  const digits = normalizeMobile(value);
  return digits.length === 10 && digits.endsWith("0000");
}

export function isAdminSession(session: AuthSession | null | undefined): session is AuthSession {
  return Boolean(session && session.role === "admin");
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
  return isAdminMobile(digits) ? "Admin" : `Player ${digits.slice(-4)}`;
}

export function createSession(mobile: string): AuthSession {
  const digits = normalizeMobile(mobile);
  const name = defaultNameFromMobile(digits);
  const role: AuthRole = isAdminMobile(digits) ? "admin" : "customer";
  return {
    mobile: digits,
    name,
    initials: role === "admin" ? "AD" : "EZ",
    signedInAt: new Date().toISOString(),
    role,
  };
}

function withRole(session: AuthSession): AuthSession {
  if (session.role === "admin" || session.role === "customer") return session;
  const role: AuthRole = isAdminMobile(session.mobile) ? "admin" : "customer";
  return { ...session, role };
}

export function getSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed?.mobile || !isValidMobile(parsed.mobile)) {
      clearSession();
      return null;
    }
    const session = withRole(parsed);
    // API mode: local role blob without a token must not grant access
    if (isApiMode() && !getStoredApiToken()) {
      clearSession();
      return null;
    }
    if (session.role !== parsed.role) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

export function setSession(session: AuthSession) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(withRole(session)));
  window.dispatchEvent(new Event("ezurr-auth-change"));
}

export function clearSession() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
  try {
    // Clear Laravel Sanctum token when present
    window.localStorage.removeItem("ezurr_api_token");
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event("ezurr-auth-change"));
}

export function updateSessionProfile(input: { name?: string; mobile?: string }) {
  const current = getSession();
  if (!current) return null;
  const name = input.name?.trim() || current.name;
  const mobile = input.mobile ? normalizeMobile(input.mobile) : current.mobile;
  const parts = name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase() || current.initials;
  const next: AuthSession = {
    ...current,
    name,
    mobile: isValidMobile(mobile) ? mobile : current.mobile,
    initials,
  };
  setSession(next);
  return next;
}
