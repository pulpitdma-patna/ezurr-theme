"use client";

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

export function SettingsNav({
  activeId,
  onChange,
}: {
  activeId: SettingsTabId;
  onChange: (id: SettingsTabId) => void;
}) {
  return (
    <>
      <div
        role="tablist"
        aria-label="Settings"
        className="ez-scrollbar-none mb-5 flex gap-1.5 overflow-x-auto rounded-2xl border border-black/[0.06] bg-white p-1.5 shadow-[0_4px_20px_rgba(17,17,19,0.04)] lg:hidden"
      >
        {SETTINGS_TABS.map((tab) => {
          const active = activeId === tab.id;
          const danger = tab.id === "danger";
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`settings-tab-${tab.id}`}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`shrink-0 rounded-xl px-3.5 py-2 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                active
                  ? danger
                    ? "bg-[#B42318] text-white"
                    : "bg-[#1D1D1F] text-white"
                  : danger
                    ? "text-[#B42318] hover:bg-[#FFF5F5]"
                    : "text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <nav
        role="tablist"
        aria-orientation="vertical"
        aria-label="Settings"
        className="sticky top-20 hidden overflow-hidden rounded-2xl border border-black/[0.06] bg-white p-2 shadow-[0_8px_30px_rgba(17,17,19,0.04)] lg:block"
      >
        {SETTINGS_TABS.map((tab) => {
          const active = activeId === tab.id;
          const danger = tab.id === "danger";
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              id={`settings-tab-${tab.id}`}
              aria-controls={`settings-panel-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`flex w-full flex-col items-start rounded-xl px-3 py-2.5 text-left transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                active
                  ? danger
                    ? "bg-[#FFF5F5] ring-1 ring-[#F5C2C0]"
                    : "bg-[#F5F5F7] ring-1 ring-black/[0.04]"
                  : "hover:bg-[#FAFAFB]"
              }`}
            >
              <span
                className={`text-[13px] font-semibold tracking-[-0.02em] ${
                  danger ? "text-[#B42318]" : "text-[#1D1D1F]"
                }`}
              >
                {tab.label}
              </span>
              <span className="mt-0.5 ez-mono text-[8px] uppercase tracking-[0.12em] text-[#AEAEB2]">
                {tab.hint}
              </span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
