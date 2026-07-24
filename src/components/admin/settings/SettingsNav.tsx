"use client";

import type { ReactNode } from "react";

export type SettingsTabId =
  | "store"
  | "appearance"
  | "checkout"
  | "operations"
  | "team"
  | "tax"
  | "shipping"
  | "notifications"
  | "danger";

export const SETTINGS_TABS: {
  id: SettingsTabId;
  label: string;
  hint: string;
}[] = [
  { id: "store", label: "Store", hint: "Identity & support" },
  { id: "appearance", label: "Appearance", hint: "Theme & merch" },
  { id: "checkout", label: "Checkout", hint: "Payments & cart" },
  { id: "operations", label: "Operations", hint: "Stock & locale" },
  { id: "team", label: "Team", hint: "Staff & roles" },
  { id: "tax", label: "Tax", hint: "GST readiness" },
  { id: "shipping", label: "Shipping", hint: "Zones & rates" },
  { id: "notifications", label: "Notifications", hint: "Alert prefs" },
  { id: "danger", label: "Danger zone", hint: "Reset & demo" },
];

function SettingsTabButton({
  tab,
  active,
  onChange,
  compact,
}: {
  tab: (typeof SETTINGS_TABS)[number];
  active: boolean;
  onChange: (id: SettingsTabId) => void;
  compact?: boolean;
}) {
  const danger = tab.id === "danger";

  if (compact) {
    return (
      <button
        type="button"
        role="tab"
        aria-selected={active}
        id={`settings-tab-${tab.id}`}
        aria-controls={`settings-panel-${tab.id}`}
        onClick={() => onChange(tab.id)}
        className={`shrink-0 rounded-md px-2.5 py-1.5 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
          active
            ? danger
              ? "bg-[#B42318] text-white"
              : "bg-[#1D1D1F] text-white"
            : danger
              ? "text-[#B42318] hover:bg-[#FFF5F5]"
              : "text-[#6E6E73] hover:bg-white hover:text-[#1D1D1F]"
        }`}
      >
        {tab.label}
      </button>
    );
  }

  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      id={`settings-tab-${tab.id}`}
      aria-controls={`settings-panel-${tab.id}`}
      onClick={() => onChange(tab.id)}
      className={`relative flex w-full flex-col items-start px-3 py-2 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1D1D1F] ${
        active
          ? danger
            ? "bg-[#FFF5F5] text-[#B42318]"
            : "bg-white text-[#1D1D1F]"
          : danger
            ? "text-[#B42318] hover:bg-[#FFF8F8]"
            : "text-[#424245] hover:bg-white/70"
      }`}
    >
      {active ? (
        <span
          className={`absolute inset-y-1.5 left-0 w-0.5 rounded-full ${
            danger ? "bg-[#B42318]" : "bg-[#1D1D1F]"
          }`}
          aria-hidden
        />
      ) : null}
      <span
        className={`text-xs font-semibold tracking-[-0.01em] ${
          danger && !active ? "text-[#B42318]" : ""
        }`}
      >
        {tab.label}
      </span>
      <span className="mt-0.5 ez-mono text-[7px] uppercase tracking-[0.14em] text-[#AEAEB2]">
        {tab.hint}
      </span>
    </button>
  );
}

export function SettingsNav({
  activeId,
  onChange,
  children,
}: {
  activeId: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
  children: ReactNode;
}) {
  return (
    <>
      <div
        role="tablist"
        aria-label="Settings"
        className="ez-scrollbar-none flex gap-1 overflow-x-auto border-b border-black/[0.05] bg-[#FAFAFB] px-2 py-2 lg:hidden"
      >
        {SETTINGS_TABS.map((tab) => (
          <SettingsTabButton
            key={tab.id}
            tab={tab}
            active={activeId === tab.id}
            onChange={onChange}
            compact
          />
        ))}
      </div>

      <div className="lg:grid lg:grid-cols-[auto_minmax(0,1fr)]">
        <nav
          role="tablist"
          aria-orientation="vertical"
          aria-label="Settings"
          className="hidden shrink-0 border-r border-black/[0.05] bg-[#FAFAFB] py-2 lg:block lg:w-[11.5rem] xl:w-[12.5rem]"
        >
          {SETTINGS_TABS.map((tab) => (
            <SettingsTabButton
              key={tab.id}
              tab={tab}
              active={activeId === tab.id}
              onChange={onChange}
            />
          ))}
        </nav>

        <div className="min-w-0">{children}</div>
      </div>
    </>
  );
}
