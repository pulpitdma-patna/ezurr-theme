"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminPageTabs } from "@/components/admin/AdminPageTabs";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AutomationBuilder, blankRule } from "@/components/admin/AutomationBuilder";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MessageWordingPanel } from "@/components/admin/MessageWordingPanel";
import { RuleSentence } from "@/components/admin/RuleSentence";
import {
  api,
  isApiEnabled,
  type ApiAutomation,
  type ApiMessageTemplate,
} from "@/lib/apiClient";
import {
  buildRuleSentence,
  describeLastRun,
  sentenceToText,
  type ActionKind,
  type AutomationRule,
  type AutomationRunRecord,
  type AutomationTriggerKey,
  type WordingChoice,
} from "@/lib/automationGrammar";
import { isAlreadyARule, RECOMMENDED_RULES, type RecommendedRule } from "@/data/automationTemplates";
import { useAdminStore } from "@/hooks/useAdminStore";

/**
 * Automatic messages.
 *
 * The old screen was 788 lines carrying four metric pills, a two-tab strip with
 * uppercase sub-labels, a third pseudo-tab that was a link, a "{n} templates →"
 * pill and a "Browse templates" button — three entry points to one route — a
 * search box, two filter dropdowns, and a card per rule showing
 * `TRIGGER → IF → THEN` in three boxes. Everything on it described our data
 * model. None of it answered the only two questions a shop owner has: what is
 * my shop saying to customers on its own, and did it actually go out.
 *
 * So: one column, two headings, one sentence per rule, and a grey line of truth
 * under each running one. Message wording is the second tab rather than a
 * separate nav item, because a rule points at a wording by key and splitting
 * them is why "held back — the wording isn't approved yet" was unreadable.
 */

function apiToRule(a: ApiAutomation): AutomationRule {
  return {
    id: a.id ?? "",
    name: a.name,
    description: a.description ?? "",
    trigger: a.trigger as AutomationTriggerKey,
    enabled: a.enabled,
    conditions: (a.conditions ?? []) as AutomationRule["conditions"],
    actions: (a.actions ?? []) as AutomationRule["actions"],
    createdAt: a.createdAt ?? "",
    updatedAt: a.updatedAt ?? "",
  };
}

function ruleToApi(rule: AutomationRule): ApiAutomation {
  return {
    id: rule.id || undefined,
    name: rule.name,
    description: rule.description,
    trigger: rule.trigger,
    enabled: rule.enabled,
    priority: 100,
    conditions: rule.conditions,
    actions: rule.actions,
  };
}

export default function AdminAutomaticMessagesPage() {
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const router = useRouter();
  const searchParams = useSearchParams();

  const tab = searchParams.get("tab") === "wording" ? "wording" : "messages";

  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [runs, setRuns] = useState<AutomationRunRecord[]>([]);
  const [templates, setTemplates] = useState<ApiMessageTemplate[]>([]);
  const [editing, setEditing] = useState<AutomationRule | null>(null);
  const [deleting, setDeleting] = useState<AutomationRule | null>(null);
  const [notice, setNotice] = useState<{ tone: "info" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [drawerError, setDrawerError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiOn) return;
    try {
      const [ruleRes, runRes, templateRes] = await Promise.all([
        api.automations(),
        api.automationRuns(),
        api.messageTemplates(),
      ]);
      setRules((ruleRes.data ?? []).map(apiToRule));
      setRuns(
        (runRes.data ?? []).map((r) => ({
          id: r.id,
          ruleId: r.ruleId ?? "",
          ruleName: r.ruleName,
          at: r.at,
          status: r.status as AutomationRunRecord["status"],
          delivery: (r.delivery ?? undefined) as AutomationRunRecord["delivery"],
          summary: r.summary ?? "",
        })),
      );
      setTemplates(templateRes.data ?? []);
    } catch (e) {
      // A failure to read stays on the page. It is never a toast — the whole
      // point of this screen is telling him what is running, and an empty list
      // that failed to load looks exactly like a shop that sends nothing.
      setNotice({
        tone: "error",
        text:
          e instanceof Error
            ? `Could not load your automatic messages — ${e.message}`
            : "Could not load your automatic messages.",
      });
    }
  }, [apiOn]);

  useEffect(() => {
    void load();
  }, [load]);

  // In practice mode there is no server; the local sample shop stands in, and
  // the band under the title says so.
  const liveRules: AutomationRule[] = apiOn ? rules : (store.automations as AutomationRule[]);

  /** Only approved + enabled wordings can actually send, so only those are offered. */
  const wordings = useMemo(() => {
    const pick = (channel: string): WordingChoice[] =>
      templates
        .filter((t) => t.channel === channel && t.enabled && t.status === "approved")
        .map((t) => ({ value: t.event_key, label: t.name || t.event_key }));
    return { whatsapp: pick("whatsapp"), email: pick("email") };
  }, [templates]);

  const wordingsFor = useCallback(
    (type: ActionKind): WordingChoice[] =>
      type === "send_email" ? wordings.email : type === "send_whatsapp" ? wordings.whatsapp : [],
    [wordings],
  );

  /** The newest run per rule — the grey line of truth under each sentence. */
  const lastRunByRule = useMemo(() => {
    const map = new Map<string, AutomationRunRecord>();
    for (const run of runs) {
      const existing = map.get(run.ruleId);
      if (!existing || new Date(run.at) > new Date(existing.at)) map.set(run.ruleId, run);
    }
    return map;
  }, [runs]);

  const running = liveRules.filter((rule) => rule.enabled);
  const switchedOff = liveRules.filter((rule) => !rule.enabled);
  const notSetUp = RECOMMENDED_RULES.filter((rec) => !isAlreadyARule(rec, liveRules));
  const offCount = switchedOff.length + notSetUp.length;

  async function write(action: () => Promise<unknown>, done: string) {
    setNotice(null);
    try {
      await action();
      await load();
      setNotice({ tone: "info", text: done });
    } catch (e) {
      setNotice({
        tone: "error",
        text: e instanceof Error ? e.message : "That did not save. Nothing has changed.",
      });
    }
  }

  async function setEnabled(rule: AutomationRule, enabled: boolean) {
    if (!apiOn) return;
    await write(
      () => api.upsertAutomation({ ...ruleToApi(rule), enabled }),
      enabled ? "Switched on. It runs from now on." : "Switched off. Nothing will go out from this one.",
    );
  }

  async function turnOn(recommendation: RecommendedRule) {
    if (!apiOn) return;
    const rule: AutomationRule = {
      ...blankRule(),
      name: recommendation.name,
      trigger: recommendation.trigger,
      conditions: recommendation.conditions,
      actions: recommendation.actions,
    };
    // Name it after what it says, so the run log reads as English too.
    rule.name = sentenceToText(buildRuleSentence(rule, wordingsFor)).slice(0, 160);
    await write(() => api.upsertAutomation(ruleToApi(rule)), "Switched on. It runs from now on.");
  }

  async function saveRule(rule: AutomationRule) {
    if (!apiOn) {
      setDrawerError("This is the sample shop. Connect your shop to save a rule.");
      return;
    }
    setSaving(true);
    setDrawerError(null);
    try {
      await api.upsertAutomation(ruleToApi(rule));
      setEditing(null);
      await load();
      setNotice({ tone: "info", text: "Saved. It runs from now on." });
    } catch (e) {
      // The drawer stays open with his sentence in it.
      setDrawerError(e instanceof Error ? e.message : "That did not save. Nothing has changed.");
    } finally {
      setSaving(false);
    }
  }

  async function tryIt(rule: AutomationRule) {
    if (!apiOn) return;
    await write(
      () => api.testAutomation(rule.id),
      "Tried it with a sample order. The line under the rule says what happened.",
    );
  }

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Automatic messages"
        description="What your shop says to customers on its own."
      />

      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. Nothing here is your real shop, and no customer is contacted.
        </AdminNotice>
      ) : null}
      {notice ? (
        <AdminNotice tone={notice.tone === "error" ? "error" : "info"}>{notice.text}</AdminNotice>
      ) : null}

      <AdminPageTabs
        ariaLabel="Automatic messages"
        active={tab}
        onChange={(key) =>
          router.replace(key === "wording" ? "/admin/automations?tab=wording" : "/admin/automations")
        }
        tabs={[
          { key: "messages", label: "Automatic messages", count: running.length },
          { key: "wording", label: "Message wording", count: templates.length },
        ]}
      />

      {tab === "wording" ? (
        <MessageWordingPanel templates={templates} onReload={load} />
      ) : (
        <div className="space-y-5">
          <section>
            <div className="mb-2 flex items-center justify-between gap-3">
              <h2 className="text-[13px] font-semibold tracking-[-0.01em] text-[#1D1D1F]">
                Running now · {running.length}
              </h2>
              <button
                type="button"
                onClick={() => {
                  setDrawerError(null);
                  setEditing(blankRule());
                }}
                className="h-8 rounded-lg border border-black/[0.1] bg-white px-3 text-[11px] font-semibold text-[#1D1D1F] transition hover:bg-[#F7F7F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              >
                Write your own
              </button>
            </div>

            {running.length === 0 ? (
              <p className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-4 text-[13px] text-[#6E6E73]">
                Your shop is not telling customers anything on its own. The list below is what it
                could be saying.
              </p>
            ) : (
              <ul className="space-y-2">
                {running.map((rule) => (
                  <li
                    key={rule.id}
                    className="rounded-xl border border-black/[0.06] bg-white px-3.5 py-3 shadow-[0_1px_2px_rgba(17,17,19,0.03)]"
                  >
                    <RuleSentence slots={buildRuleSentence(rule, wordingsFor)} />
                    <p className="mt-1.5 text-[11px] text-[#86868B]">
                      {describeLastRun(lastRunByRule.get(rule.id))}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-1 border-t border-black/[0.05] pt-2">
                      <RowAction onClick={() => void tryIt(rule)} disabled={!apiOn}>
                        Try it with a sample order
                      </RowAction>
                      <RowAction
                        onClick={() => {
                          setDrawerError(null);
                          setEditing(rule);
                        }}
                      >
                        Change it
                      </RowAction>
                      <RowAction onClick={() => void setEnabled(rule, false)} disabled={!apiOn}>
                        Switch off
                      </RowAction>
                      <RowAction danger onClick={() => setDeleting(rule)} disabled={!apiOn}>
                        Delete
                      </RowAction>
                    </div>
                  </li>
                ))}
              </ul>
            )}
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
                    <RuleSentence muted slots={buildRuleSentence(rule, wordingsFor)} />
                    <button
                      type="button"
                      onClick={() => void setEnabled(rule, true)}
                      disabled={!apiOn}
                      className={turnOnBtnClass}
                    >
                      Turn on
                    </button>
                  </li>
                ))}
                {notSetUp.map((recommendation) => {
                  const asRule: AutomationRule = {
                    ...blankRule(),
                    id: recommendation.id,
                    name: recommendation.name,
                    trigger: recommendation.trigger,
                    conditions: recommendation.conditions,
                    actions: recommendation.actions,
                  };
                  return (
                    <li
                      key={recommendation.id}
                      className="flex flex-col gap-2 rounded-xl border border-black/[0.05] bg-[#FAFAFB] px-3.5 py-3 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div className="min-w-0">
                        <RuleSentence muted slots={buildRuleSentence(asRule, wordingsFor)} />
                        <p className="mt-1 text-[11px] text-[#AEAEB2]">{recommendation.why}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void turnOn(recommendation)}
                        disabled={!apiOn}
                        className={turnOnBtnClass}
                      >
                        Turn on
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      )}

      {editing ? (
        <AutomationBuilder
          key={editing.id || "new"}
          rule={editing}
          wordings={wordings}
          saving={saving}
          error={drawerError}
          onClose={() => setEditing(null)}
          onSave={(rule) => void saveRule(rule)}
        />
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        title="Delete this automatic message?"
        description={
          deleting
            ? `“${deleting.name}” stops running and cannot be brought back — you would set it up again from the list. No customer is contacted either way, and nothing that has already gone out is affected. If you only want it to stop for now, switch it off instead.`
            : ""
        }
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        danger
        onCancel={() => setDeleting(null)}
        onConfirm={() => {
          const rule = deleting;
          setDeleting(null);
          if (rule) void write(() => api.deleteAutomation(rule.id), "Deleted. It will not run again.");
        }}
      />
    </div>
  );
}

const turnOnBtnClass =
  "h-8 shrink-0 rounded-lg bg-[#1D1D1F] px-3 text-[11px] font-semibold text-white transition hover:bg-[#2C2C2E] disabled:cursor-not-allowed disabled:bg-[#C7C7CC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

function RowAction({
  children,
  onClick,
  danger,
  disabled,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`h-7 rounded-lg px-2.5 text-[11px] font-semibold transition disabled:cursor-not-allowed disabled:text-[#C7C7CC] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 ${
        danger
          ? "text-[#B42318] hover:bg-[#FFF5F5] focus-visible:outline-[#B42318]"
          : "text-[#424245] hover:bg-[#F0F0F2] focus-visible:outline-[#1D1D1F]"
      }`}
    >
      {children}
    </button>
  );
}
