"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  blankCheckoutRule,
  CheckoutRuleBuilder,
  ExampleOrderPicker,
  WhatThisDoes,
} from "@/components/admin/CheckoutRuleBuilder";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { RuleSentence } from "@/components/admin/RuleSentence";
import { useAdminStore } from "@/hooks/useAdminStore";
import { adminErrorMessage } from "@/lib/adminError";
import { deleteCheckoutRule, upsertCheckoutRule } from "@/lib/adminStore";
import { api, isApiEnabled, type ApiCheckoutRule } from "@/lib/apiClient";
import {
  alreadyHasRule,
  buildCheckoutSentence,
  checkoutSentenceText,
  COMMON_CHECKOUT_RULES,
  DEFAULT_EXAMPLE_ORDER,
  deadConditions,
  type AdminCheckoutRule,
  type CommonCheckoutRule,
  type ExampleOrder,
} from "@/lib/checkoutRules";

/**
 * Checkout rules.
 *
 * The owner's words: "Checkout rules in the admin looks complicated."
 *
 * What he was looking at: five metric pills across the top — one of them
 * "Sample methods: PREPAID · COD" — a search box, a state filter, two separate
 * links to a Templates screen, and then a row per rule reading
 *
 *     Enforce COD maximum   P10   On
 *     Hide COD when cart exceeds the configured COD limit (via set_cod_max).
 *     Always · COD max
 *
 * Three lines, none of which is what happens. The name was typed by whoever
 * made the rule; the grey line was a description that nothing keeps true; and
 * "Always · COD max" is our own vocabulary. Thirteen rows of that, including
 * one that could never run and two halves of a split test whose only number was
 * invented.
 *
 * Now: one order at the top that he chooses, and under it every rule as one
 * sentence with the rupees it moves on that order. Rules that are waiting say
 * what they are waiting for. Rules that can never run say so. And the starting
 * points that used to be a screen of their own are the grey half of the same
 * list, one button each.
 */

function apiToRule(rule: ApiCheckoutRule): AdminCheckoutRule {
  return {
    id: rule.id,
    name: rule.name,
    description: rule.description ?? "",
    enabled: rule.enabled,
    priority: rule.priority,
    conditions: (rule.conditions ?? []) as AdminCheckoutRule["conditions"],
    actions: (rule.actions ?? []) as AdminCheckoutRule["actions"],
    experimentId: rule.experimentId ?? undefined,
    variant: rule.variant ?? undefined,
    trafficPct: rule.trafficPct ?? undefined,
    createdAt: "",
    updatedAt: "",
  };
}

function ruleToApi(rule: AdminCheckoutRule): ApiCheckoutRule {
  return {
    id: rule.id,
    name: rule.name || checkoutSentenceText(rule).slice(0, 160),
    description: "",
    enabled: rule.enabled,
    priority: rule.priority,
    conditions: rule.conditions,
    actions: rule.actions,
    experimentId: rule.experimentId ?? null,
    variant: rule.variant ?? null,
    trafficPct: rule.trafficPct ?? null,
  };
}

/**
 * An id for a rule saved in the practice shop, where there is no server to mint
 * one. Lives outside the component: the clock is not something a render may
 * read.
 */
function practiceId(): string {
  return `cr-${Date.now()}`;
}

function ruleFromCommon(common: CommonCheckoutRule, priority: number): AdminCheckoutRule {
  const now = new Date().toISOString();
  const rule: AdminCheckoutRule = {
    ...blankCheckoutRule(),
    priority,
    conditions: structuredClone(common.conditions),
    actions: structuredClone(common.actions),
    createdAt: now,
    updatedAt: now,
  };
  return { ...rule, name: checkoutSentenceText(rule).slice(0, 160) };
}

export default function AdminCheckoutRulesPage() {
  const apiOn = isApiEnabled();
  const store = useAdminStore();

  const [remoteRules, setRemoteRules] = useState<AdminCheckoutRule[]>([]);
  const [editing, setEditing] = useState<AdminCheckoutRule | null>(null);
  const [deleting, setDeleting] = useState<AdminCheckoutRule | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);
  const [order, setOrder] = useState<ExampleOrder>(DEFAULT_EXAMPLE_ORDER);

  const load = useCallback(async () => {
    if (!apiOn) return;
    try {
      const res = await api.checkoutRules();
      setRemoteRules((res.data ?? []).map(apiToRule));
    } catch (e) {
      // A failure to read stays on the page rather than becoming a toast. An
      // empty list that failed to load looks exactly like a shop with no rules,
      // and he would go and write the ones he already has.
      setNotice({
        tone: "error",
        text: adminErrorMessage(e, "Could not load your checkout rules."),
      });
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  const rules = useMemo(
    () =>
      [...(apiOn ? remoteRules : store.checkoutRules)].sort((a, b) => a.priority - b.priority),
    [apiOn, remoteRules, store.checkoutRules],
  );

  const settings = store.settings;
  const working = rules.filter((rule) => rule.enabled);
  const switchedOff = rules.filter((rule) => !rule.enabled);
  const notSetUp = COMMON_CHECKOUT_RULES.filter((common) => !alreadyHasRule(common, rules));
  const offCount = switchedOff.length + notSetUp.length;

  async function write(action: () => Promise<unknown> | unknown, done: string) {
    setNotice(null);
    try {
      await action();
      await load();
      setNotice({ tone: "info", text: done });
    } catch (e) {
      setNotice({
        tone: "error",
        text: adminErrorMessage(e, "That did not save. Nothing has changed."),
      });
    }
  }

  /** One place that writes a rule, so practice mode and the real shop agree. */
  async function persist(rule: AdminCheckoutRule) {
    if (!apiOn) {
      upsertCheckoutRule({ ...rule, id: rule.id || practiceId() });
      return;
    }
    await api.upsertCheckoutRule(ruleToApi(rule));
  }

  async function setEnabled(rule: AdminCheckoutRule, enabled: boolean) {
    await write(
      () => persist({ ...rule, enabled }),
      enabled
        ? "Switched on. It applies to the next order."
        : "Switched off. It changes nothing from now on.",
    );
  }

  async function turnOnCommon(common: CommonCheckoutRule) {
    const priority = (rules[rules.length - 1]?.priority ?? 0) + 10;
    await write(
      () => persist(ruleFromCommon(common, priority)),
      "Switched on. It applies to the next order.",
    );
  }

  /**
   * Move a rule up or down the list.
   *
   * This is what "Priority (lower runs first)" used to be: a number field in
   * the editor. The order matters — when two rules both set the delivery
   * charge, the lower one wins — but that is a fact about this list, not a
   * number to type into a form.
   */
  async function move(rule: AdminCheckoutRule, direction: -1 | 1) {
    // Neighbour within the list he can SEE. Swapping with a switched-off rule
    // sitting invisibly between two working ones would move nothing on screen,
    // and he would press the button again and again.
    const index = working.findIndex((r) => r.id === rule.id);
    const neighbour = working[index + direction];
    if (!neighbour) return;
    await write(async () => {
      if (rule.priority === neighbour.priority) {
        // Two rules that were never ordered against each other. Put this one
        // decisively on the right side rather than swapping two equal numbers.
        await persist({ ...rule, priority: neighbour.priority + direction });
        return;
      }
      await persist({ ...rule, priority: neighbour.priority });
      await persist({ ...neighbour, priority: rule.priority });
    }, "Moved. Where two rules decide the same thing, the lower one wins.");
  }

  async function saveRule(rule: AdminCheckoutRule) {
    setSaving(true);
    setDrawerError(null);
    try {
      await persist(rule);
      setEditing(null);
      await load();
      setNotice({ tone: "info", text: "Saved. It applies to the next order." });
    } catch (e) {
      // The drawer stays open with his sentence in it.
      setDrawerError(adminErrorMessage(e, "That did not save. Nothing has changed."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Checkout rules"
        description="What a customer is offered, and charged, when they pay."
        breadcrumbs={[{ label: "Online store", href: "/admin/cms" }, { label: "Checkout rules" }]}
      />

      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. These rules only change the practice checkout — no real customer sees
          them.
        </AdminNotice>
      ) : null}
      {notice ? (
        <AdminNotice tone={notice.tone === "error" ? "error" : "info"}>{notice.text}</AdminNotice>
      ) : null}

      <section className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        <ExampleOrderPicker order={order} onChange={setOrder} />
        <p className="mt-1.5 text-[11px] text-[#86868B]">
          Every rule below says what it would do to this order. Change the order to check another
          one.
        </p>
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between gap-3">
          <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
            Working now · {working.length}
          </h2>
          <button
            type="button"
            onClick={() => {
              setDrawerError(null);
              setEditing(blankCheckoutRule());
            }}
            className="h-8 rounded-lg border border-black/[0.1] bg-white px-3 text-[11px] font-semibold text-[#1D1D1F] transition hover:bg-[#F7F7F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            Write your own
          </button>
        </div>

        {working.length === 0 ? (
          <p className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-4 text-[13px] text-[#6E6E73]">
            Nothing is changing your checkout. Customers get the delivery, payment and GST
            settings from{" "}
            <Link href="/admin/settings#checkout" className="font-semibold text-[#1D1D1F] underline">
              Settings → Checkout
            </Link>
            , exactly as they are.
          </p>
        ) : (
          <ul className="space-y-2">
            {working.map((rule, index) => {
              const dead = deadConditions(rule);
              return (
                <li
                  key={rule.id}
                  className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(17,17,19,0.03)]"
                >
                  <RuleSentence slots={buildCheckoutSentence(rule)} />

                  {dead.length > 0 ? (
                    <p className="mt-1.5 rounded-lg border border-[#F4D8A8] bg-[#FEF6E7] px-2.5 py-1.5 text-[11px] font-medium text-[#8A5A00]">
                      This one can never run — it waits for {dead.map((c) => c.field).join(", ")},
                      which the checkout no longer records.
                    </p>
                  ) : (
                    <div className="mt-1.5">
                      <WhatThisDoes
                        compact
                        settings={settings}
                        allRules={rules}
                        rule={rule}
                        order={order}
                      />
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-end gap-1 border-t border-black/[0.05] pt-2">
                    {index > 0 ? (
                      <RowAction onClick={() => void move(rule, -1)}>Move up</RowAction>
                    ) : null}
                    {index < working.length - 1 ? (
                      <RowAction onClick={() => void move(rule, 1)}>Move down</RowAction>
                    ) : null}
                    <RowAction
                      onClick={() => {
                        setDrawerError(null);
                        setEditing(rule);
                      }}
                    >
                      Change it
                    </RowAction>
                    <RowAction onClick={() => void setEnabled(rule, false)}>Switch off</RowAction>
                    <RowAction danger onClick={() => setDeleting(rule)}>
                      Delete
                    </RowAction>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {working.length > 1 ? (
          <p className="mt-2 text-[11px] text-[#86868B]">
            They run top to bottom. Where two of them decide the same thing, the lower one wins.
          </p>
        ) : null}
      </section>

      <section>
        <h2 className="mb-2 text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
          Not turned on · {offCount}
        </h2>
        {offCount === 0 ? (
          <p className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-4 text-[13px] text-[#6E6E73]">
            Everything worth switching on is on.
          </p>
        ) : (
          <ul className="space-y-2">
            {switchedOff.map((rule) => (
              <li
                key={rule.id}
                className="flex flex-col gap-2 rounded-xl border border-black/[0.05] bg-[#FAFAFB] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <RuleSentence muted slots={buildCheckoutSentence(rule)} />
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-1">
                  <button
                    type="button"
                    onClick={() => void setEnabled(rule, true)}
                    className={turnOnBtnClass}
                  >
                    Turn it on
                  </button>
                  <RowAction danger onClick={() => setDeleting(rule)}>
                    Delete
                  </RowAction>
                </div>
              </li>
            ))}

            {/* The old Templates screen, folded back in. A starting point is
                just a sentence he has not turned on yet. */}
            {notSetUp.map((common) => {
              const asRule = ruleFromCommon(common, 100);
              return (
                <li
                  key={common.id}
                  className="flex flex-col gap-2 rounded-xl border border-black/[0.05] bg-[#FAFAFB] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <RuleSentence muted slots={buildCheckoutSentence(asRule)} />
                    <p className="mt-1 text-[11px] text-[#AEAEB2]">{common.why}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => void turnOnCommon(common)}
                    className={turnOnBtnClass}
                  >
                    Turn it on
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-[11px] text-[#86868B]">
        The starting point for every order — your delivery charge, whether you take cash on
        delivery, and your GST — lives in{" "}
        <Link href="/admin/settings#checkout" className="font-semibold text-[#424245] underline">
          Settings → Checkout
        </Link>
        . The rules above change it for the orders they name.
      </p>

      {editing ? (
        <CheckoutRuleBuilder
          key={editing.id || "new"}
          rule={editing}
          settings={settings}
          otherRules={rules}
          order={order}
          onOrderChange={setOrder}
          saving={saving}
          error={drawerError}
          onClose={() => setEditing(null)}
          onSave={(rule) => void saveRule(rule)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this checkout rule?"
        description={
          deleting
            ? `“${checkoutSentenceText(deleting)}” stops applying and cannot be brought back — you would set it up again from the list. Orders already placed are not affected. If you only want it to stop for now, switch it off instead.`
            : ""
        }
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const rule = deleting;
          setDeleting(null);
          if (!rule) return;
          void write(async () => {
            if (apiOn) await api.deleteCheckoutRule(rule.id);
            else deleteCheckoutRule(rule.id);
          }, "Deleted. It will not change another order.");
        }}
      />
    </div>
  );
}

const turnOnBtnClass =
  "h-8 shrink-0 rounded-lg bg-[#1D1D1F] px-3 text-[11px] font-semibold text-white transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

function RowAction({
  children,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`h-7 rounded-lg px-2.5 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        danger
          ? "text-[#B42318] hover:bg-[#FFF5F5] focus-visible:outline-[#B42318]"
          : "text-[#424245] hover:bg-[#F0F0F2] focus-visible:outline-[#1D1D1F]"
      }`}
    >
      {children}
    </button>
  );
}
