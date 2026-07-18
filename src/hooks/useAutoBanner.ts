"use client";

import { useCallback } from "react";
import { useAdminToast } from "@/components/admin/AdminToast";

/**
 * Legacy banner setter — now routes success messages through AdminToast
 * so callers keep working without inline banner UI.
 */
export function useAutoBanner(_ms = 3000): [string, (message: string) => void] {
  const toast = useAdminToast();
  const setMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      const lower = message.toLowerCase();
      const tone =
        lower.includes("could not") || lower.includes("failed") || lower.includes("error")
          ? ("danger" as const)
          : lower.includes("warn")
            ? ("warning" as const)
            : ("success" as const);
      toast.push(message, tone);
    },
    [toast],
  );
  return ["", setMessage];
}
