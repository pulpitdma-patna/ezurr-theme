"use client";

import { useEffect } from "react";
import { clearSession, setSession, type AuthSession } from "@/lib/auth";
import { api, getApiToken, isApiEnabled } from "@/lib/apiClient";

function sessionFromApiUser(user: {
  name: string;
  mobile: string;
  role: string;
}): AuthSession {
  const role = user.role === "admin" ? "admin" : "customer";
  const parts = user.name.split(/\s+/).filter(Boolean);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[1][0]}`.toUpperCase()
      : user.name.slice(0, 2).toUpperCase() || (role === "admin" ? "AD" : "EZ");
  return {
    mobile: user.mobile,
    name: user.name,
    initials,
    signedInAt: new Date().toISOString(),
    role,
  };
}

/** Validates Sanctum token on boot when API mode is enabled. */
export function ApiAuthBoot() {
  useEffect(() => {
    if (!isApiEnabled()) return;

    // Orphan local session (no token) must not keep looking signed-in.
    if (!getApiToken()) {
      try {
        if (window.localStorage.getItem("ezurr_auth_session")) clearSession();
      } catch {
        /* ignore */
      }
      return;
    }

    let cancelled = false;
    void api
      .me()
      .then((user) => {
        if (cancelled) return;
        setSession(sessionFromApiUser(user));
      })
      .catch(() => {
        if (cancelled) return;
        clearSession();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
