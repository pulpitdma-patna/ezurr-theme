import { revokeApiToken } from "@/lib/apiClient";

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

/**
 * Sign-in is server-verified, always. There is deliberately no local fallback:
 * an earlier build minted a session — including admin, derived from the phone
 * number itself — whenever NEXT_PUBLIC_API_URL was unset, so one forgotten env
 * var silently handed out unauthenticated admin.
 *
 * Two guards replace it. next.config.ts refuses to produce a production build
 * without the API, and the sign-in flow fails closed rather than falling back.
 * Deliberately no module-level throw here: this file is imported by the site
 * header, so throwing would take the whole storefront down over an auth
 * misconfiguration — and it would not run at build time anyway.
 */
function getStoredApiToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage.getItem(API_TOKEN_KEY);
  } catch {
    return null;
  }
}

/**
 * True when a session may grant access.
 *
 * Every session is server-issued, so one without its Sanctum token is not a
 * session — there is no local-only mode left to fall back to.
 */
export function isCredentialedSession(session: AuthSession | null | undefined): session is AuthSession {
  if (!session) return false;
  return Boolean(getStoredApiToken());
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

/**
 * Roles come from the server and nowhere else.
 *
 * A stored blob with an unrecognised role is treated as a customer rather than
 * re-derived locally; `ApiAuthBoot` re-reads the real role from `/auth/me` on
 * every boot, so the downgrade is momentary and self-correcting — and it errs
 * towards less access, not more.
 */
function withRole(session: AuthSession): AuthSession {
  if (session.role === "admin" || session.role === "customer") return session;
  return { ...session, role: "customer" };
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
    // A local role blob without a token must never grant access.
    if (!getStoredApiToken()) {
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
  // Revoke server-side first, while the token is still readable. Sign-out used
  // to clear localStorage only, so a "signed out" Sanctum token stayed valid
  // for its full 14-day TTL. Best-effort: local state clears either way.
  revokeApiToken();
  window.localStorage.removeItem(STORAGE_KEY);
  try {
    window.localStorage.removeItem(API_TOKEN_KEY);
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
