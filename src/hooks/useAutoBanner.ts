"use client";

import { useCallback } from "react";
import { useAdminToast } from "@/components/admin/AdminToast";

function inferToastTone(message: string) {
  const lower = message.toLowerCase();
  if (lower.includes("saving")) return "neutral" as const;
  if (
    lower.includes("not saved") ||
    lower.includes("could not") ||
    lower.includes("failed") ||
    lower.includes("error")
  ) {
    return "danger" as const;
  }
  if (lower.includes("warn")) return "warning" as const;
  return "success" as const;
}

/**
 * Legacy banner setter — routes messages through AdminToast.
 * Returns a no-op display string so inline banner UI can be removed.
 */
export function useAutoBanner(_ms = 3000): [string, (message: string) => void] {
  const toast = useAdminToast();
  const setMessage = useCallback(
    (message: string) => {
      if (!message.trim()) return;
      toast.push(message, inferToastTone(message));
    },
    [toast],
  );
  return ["", setMessage];
}
