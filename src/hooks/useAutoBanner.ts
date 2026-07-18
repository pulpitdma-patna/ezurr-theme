"use client";

import { useEffect, useState } from "react";

/** Auto-dismiss a string banner after `ms` (default 3s). */
export function useAutoBanner(ms = 3000) {
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!message) return;
    const id = window.setTimeout(() => setMessage(""), ms);
    return () => window.clearTimeout(id);
  }, [message, ms]);

  return [message, setMessage] as const;
}
