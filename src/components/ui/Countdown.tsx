"use client";

import { useEffect, useState } from "react";
import { theme } from "@/lib/theme";

const PLACEHOLDER = { dd: "--", hh: "--", mm: "--", ss: "--" };

function useCountdown() {
  const [mounted, setMounted] = useState(false);
  const [now, setNow] = useState(0);

  useEffect(() => {
    setMounted(true);
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!mounted) return PLACEHOLDER;

  const target = new Date(theme.releaseDate).getTime();
  let s = Math.max(0, Math.floor((target - now) / 1000));
  const dd = Math.floor(s / 86400);
  s -= dd * 86400;
  const hh = Math.floor(s / 3600);
  s -= hh * 3600;
  const mm = Math.floor(s / 60);
  const ss = s - mm * 60;
  const pad = (n: number) => String(n).padStart(2, "0");

  return { dd: pad(dd), hh: pad(hh), mm: pad(mm), ss: pad(ss) };
}

function CountdownBox({
  value,
  label,
  accent,
  size = "default",
}: {
  value: string;
  label: string;
  accent?: boolean;
  size?: "default" | "large";
}) {
  const isLarge = size === "large";
  return (
    <div
      className={`shrink-0 rounded-[14px] border border-[#E8E8ED] bg-white text-center ${
        isLarge ? "w-[72px] py-3 sm:w-[82px] sm:py-3.5" : "w-16 py-2.5 sm:w-[74px] sm:py-3"
      }`}
    >
      <div
        className={`ez-mono font-bold ${
          isLarge ? "text-xl sm:text-2xl" : "text-lg sm:text-[22px]"
        } ${accent ? "text-[var(--ez-accent-text)]" : "text-[#1D1D1F]"}`}
      >
        {value}
      </div>
      <div className="ez-mono mt-0.5 text-[8px] uppercase tracking-[0.14em] text-[#86868B] sm:text-[9px]">
        {label}
      </div>
    </div>
  );
}

export function CountdownBoxes({ size = "default" }: { size?: "default" | "large" }) {
  const { dd, hh, mm, ss } = useCountdown();

  return (
    <div className="ez-countdown-row">
      <CountdownBox value={dd} label="DAYS" size={size} />
      <CountdownBox value={hh} label="HRS" size={size} />
      <CountdownBox value={mm} label="MIN" size={size} />
      <CountdownBox value={ss} label="SEC" accent size={size} />
    </div>
  );
}

export function CountdownInline() {
  const { dd, hh, mm, ss } = useCountdown();
  return (
    <span className="text-sm font-bold sm:text-[15px]">
      {dd}d {hh}h {mm}m{" "}
      <span className="text-[var(--ez-accent-text)]">{ss}s</span>
    </span>
  );
}

function SummaryUnit({
  value,
  label,
  accent,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    <div
      className={`flex min-w-0 flex-1 flex-col items-center justify-center rounded-xl px-1 py-2.5 sm:py-3 ${
        accent
          ? "border border-[oklch(0.78_0.1_var(--ez-h)/0.35)] bg-[oklch(0.55_0.17_var(--ez-h)/0.14)]"
          : "border border-white/[0.08] bg-white/[0.06]"
      }`}
    >
      <span
        className={`ez-mono text-lg font-bold leading-none tracking-tight sm:text-xl ${
          accent ? "text-[oklch(0.82_0.12_var(--ez-h))]" : "text-[#F5F5F7]"
        }`}
      >
        {value}
      </span>
      <span className="ez-mono mt-1.5 text-[8px] uppercase tracking-[0.18em] text-[#86868B] sm:text-[9px]">
        {label}
      </span>
    </div>
  );
}

/** Premium segmented countdown for dark checkout summary */
export function CountdownSummaryPanel() {
  const { dd, hh, mm, ss } = useCountdown();

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.08] to-white/[0.03] p-3.5 backdrop-blur-md sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="ez-mono text-[9px] uppercase tracking-[0.2em] text-[#A1A1A6]">
          Releases in
        </span>
        <span className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#6E6E73]">
          Nov 19, 2026
        </span>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
        <SummaryUnit value={dd} label="Days" />
        <SummaryUnit value={hh} label="Hrs" />
        <SummaryUnit value={mm} label="Min" />
        <SummaryUnit value={ss} label="Sec" accent />
      </div>
    </div>
  );
}

export { CountdownBox };
