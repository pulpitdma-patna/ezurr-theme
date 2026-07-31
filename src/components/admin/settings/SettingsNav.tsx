"use client";

import type { ReactNode } from "react";

export type SettingsTabId =
  | "store"
  | "appearance"
  | "checkout"
  | "operations"
  | "tax"
  | "notifications"
  | "danger";

/**
 * The vertical rail stays — it is the best-organised thing in this admin, and
 * seven items do not fit across a phone. Two things changed:
 *
 *  - the second line under each tab ("IDENTITY & SUPPORT", "STOCK & LOCALE") is
 *    gone. It was 7px uppercase mono, it repeated the tab in different words,
 *    and it was one of the last places on this screen speaking in capitals;
 *  - each tab is now named for what the owner would go looking for. "Store" sat
 *    in a nav group also called Store and meant neither of them.
 *
 * Two tabs went with the rewrite: Team, which rendered four invented staff
 * members to a shop with real ones, and Shipping, which held three fixed
 * sentences and no control at all.
 *
 * "Stock & region" is now just "Stock": the region half was a currency list and
 * a time-zone list, and neither was read by anything — prices are printed in ₹
 * and times in IST whatever those two said. The ids are untouched, because
 * other screens link straight to ?tab=tax and #checkout and a renamed id would
 * quietly drop those links on the first tab.
 */
export const SETTINGS_TABS: { id: SettingsTabId; label: string }[] = [
  { id: "store", label: "Shop details" },
  { id: "appearance", label: "Look" },
  { id: "checkout", label: "Checkout" },
  { id: "operations", label: "Stock" },
  { id: "tax", label: "GST & invoices" },
  { id: "notifications", label: "Alerts" },
  { id: "danger", label: "Start over" },
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
      className={`relative flex w-full items-center px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-[#1D1D1F] ${
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
    </button>
  );
}

export function SettingsNav({
  activeId,
  onChange,
  children,
  tabs = SETTINGS_TABS,
}: {
  activeId: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
  children: ReactNode;
  /** Lets a tab with nothing on it for this shop not exist, rather than open empty. */
  tabs?: { id: SettingsTabId; label: string }[];
}) {
  return (
    <>
      <div
        role="tablist"
        aria-label="Settings"
        className="ez-scrollbar-none flex gap-1 overflow-x-auto border-b border-black/[0.05] bg-[#FAFAFB] px-2 py-2 lg:hidden"
      >
        {tabs.map((tab) => (
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
          {tabs.map((tab) => (
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
