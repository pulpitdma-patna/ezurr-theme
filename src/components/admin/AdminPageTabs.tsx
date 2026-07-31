"use client";

/**
 * A fixed row of work piles with counts, in place of filter dropdowns.
 *
 * The orders screen used to offer Status / Payment / Date dropdowns. Three
 * problems with that: the owner does not think in statuses, the status list
 * omitted three of the eleven the server can return (so `paid`,
 * `pending_payment` and `payment_failed` could not be filtered to at all), and
 * a dropdown hides the size of each pile until you pick it.
 *
 * Tabs show every pile and its count at once, which is the actual question on a
 * weekday morning: what is waiting for me, and how much of it. They also make
 * the bulk action safe — every order behind one tab shares a next move, so the
 * action offered can never be refused (see OrderController::BUCKETS).
 *
 * The active tab lives in the URL so the back button and a bookmark both work.
 */
export type AdminTab = {
  key: string;
  label: string;
  count?: number;
  /** Draws attention when there is work here — used for money problems. */
  tone?: "default" | "alert";
};

export function AdminPageTabs({
  tabs,
  active,
  onChange,
  ariaLabel = "Views",
}: {
  tabs: AdminTab[];
  active: string;
  onChange: (key: string) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      // Scrolls horizontally below 640px rather than wrapping to a second row:
      // this sits directly above the table on a phone, and a wrapping tab strip
      // pushes the first order off the screen.
      className="mb-3 flex w-full gap-1 overflow-x-auto rounded-xl border border-black/[0.06] bg-[#F0F0F2] p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        const hasWork = (tab.count ?? 0) > 0;
        return (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
              isActive
                ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.06)]"
                : "text-[#6E6E73] hover:text-[#1D1D1F]"
            }`}
          >
            {tab.label}
            {tab.count !== undefined ? (
              <span
                className={`ez-mono rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                  tab.tone === "alert" && hasWork
                    ? "bg-[#FEE4E2] text-[#B42318]"
                    : hasWork
                      ? "bg-[#1D1D1F] text-white"
                      : "bg-black/[0.06] text-[#86868B]"
                }`}
              >
                {tab.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
