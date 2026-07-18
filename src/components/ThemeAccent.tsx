"use client";

import { useEffect } from "react";
import { getLiveThemeSettings } from "@/lib/adminStore";
import { theme } from "@/lib/theme";
import { subscribeAdminStore } from "@/lib/adminStore";

export function ThemeAccent() {
  useEffect(() => {
    function apply() {
      const settings = getLiveThemeSettings();
      const hue = settings.accentHue ?? theme.accentHue;
      document.documentElement.style.setProperty("--ez-h", String(hue));
    }
    apply();
    return subscribeAdminStore(apply);
  }, []);

  return null;
}
