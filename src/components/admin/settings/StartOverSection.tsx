"use client";

import { useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { SettingsSection } from "@/components/admin/settings/SettingsSection";
import {
  startOverList,
  startOverSentence,
  type PracticeShopContents,
} from "@/components/admin/settings/settingsValues";

/**
 * The one destructive thing on this screen, and the only tab that is not about
 * changing a setting.
 *
 * It exists on the practice shop only — the tab is not built at all once this
 * admin is talking to a real shop — and what it does was read before this copy
 * was written, not assumed:
 *
 *   resetAdminStore() → state = createSeedState(); localStorage.removeItem(…)
 *
 * `createSeedState()` rebuilds EVERY collection this browser holds, which is
 * more than the old wording admitted. It said "the sample products, orders,
 * customers and settings come back". It also rebuilds the coupons, the digital
 * codes, the stock ledger, the categories, the brands, the integrations, the
 * automatic rules, the activity list, the checkout exceptions — and the home
 * page and custom code in the website builder, which is the one an owner would
 * actually mourn, having spent an evening on it.
 *
 * So the list is not a sentence someone wrote once. It is built from what is in
 * the store right now, counted, and shown twice: on the button's own panel, and
 * again inside the confirmation, so the last thing read before pressing names
 * exactly what stops existing.
 */
export function StartOverSection({
  active,
  status,
  disabled,
  contents,
  onReset,
}: {
  active: boolean;
  status?: React.ReactNode;
  disabled?: boolean;
  contents: PracticeShopContents;
  onReset: () => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const items = startOverList(contents);

  return (
    <SettingsSection
      id="danger"
      active={active}
      title="Start over"
      description="Empty this practice shop and put the samples back. Only this browser is touched."
      danger
      status={status}
      disabled={disabled}
    >
      <div className="rounded-lg border border-[#F5C2C0] bg-[#FFF8F8] p-3">
        <div className="text-xs font-semibold text-[#B42318]">
          Everything below is deleted from this browser
        </div>
        <ul className="mt-2 space-y-1">
          {items.map((item) => (
            <li key={item} className="flex gap-2 text-[11px] leading-relaxed text-[#912018]">
              <span aria-hidden>·</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[11px] leading-relaxed text-[#912018]/80">
          Your real shop is not connected to this one, so no customer is affected and no money
          moves. There is no undo.
        </p>
        <button
          type="button"
          onClick={() => setConfirming(true)}
          className="mt-3 inline-flex h-8 items-center rounded-md bg-[#B42318] px-3 text-[11px] font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]"
        >
          Start over
        </button>
      </div>

      <ConfirmDialog
        open={confirming}
        title="Delete everything in this practice shop?"
        description={startOverSentence(contents)}
        confirmLabel="Delete and start over"
        cancelLabel="Keep what's here"
        danger
        onConfirm={() => {
          setConfirming(false);
          onReset();
        }}
        onCancel={() => setConfirming(false)}
      />
    </SettingsSection>
  );
}
