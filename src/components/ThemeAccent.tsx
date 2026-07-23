"use client";

import { useEffect } from "react";
import { getStorefrontSettings, subscribeStorefrontSettings } from "@/hooks/useLiveThemeSettings";
import { theme } from "@/lib/theme";

export function ThemeAccent() {
  useEffect(() => {
    function apply() {
      const settings = getStorefrontSettings();
      const hue = settings.accentHue ?? theme.accentHue;
      document.documentElement.style.setProperty("--ez-h", String(hue));
    }
    apply();
    return subscribeStorefrontSettings(apply);
  }, []);

  return null;
}
