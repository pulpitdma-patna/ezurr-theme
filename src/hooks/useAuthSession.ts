"use client";

import { useEffect, useState } from "react";
import { getSession, type AuthSession } from "@/lib/auth";

export function useAuthSession() {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    function sync() {
      setSessionState(getSession());
      setReady(true);
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("ezurr-auth-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("ezurr-auth-change", sync);
    };
  }, []);

  return { session, ready };
}
