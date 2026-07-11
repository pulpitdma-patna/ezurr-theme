"use client";

import { useEffect } from "react";
import { theme } from "@/lib/theme";

export function ThemeAccent() {
  useEffect(() => {
    document.documentElement.style.setProperty("--ez-h", String(theme.accentHue));
  }, []);

  return null;
}
