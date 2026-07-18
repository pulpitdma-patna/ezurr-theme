"use client";

import { formatInr } from "@/data/admin";
import { useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";

export function MicroBar() {
  const settings = useLiveThemeSettings();
  const codLine = settings.codEnabled
    ? `COD under ${formatInr(settings.codLimit)}`
    : "Prepaid only";

  return (
    <div className="flex flex-col items-center justify-center gap-1.5 bg-[#1D1D1F] px-4 py-2 text-center ez-mono text-[9px] uppercase tracking-[0.1em] text-[#AEAEB2] sm:flex-row sm:flex-wrap sm:gap-4 sm:py-2.5 sm:text-[10.5px]">
      <span>
        <span className="text-[#F5F5F7]">Minimum price guarantee</span> on selected
        titles
      </span>
      <span className="hidden sm:inline">·</span>
      <span>{codLine}</span>
      <span className="hidden sm:inline">·</span>
      <span>Ships in 24 hrs</span>
    </div>
  );
}
