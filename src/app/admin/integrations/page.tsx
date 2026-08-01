"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import {
  IntegrationConfigForm,
  type IntegrationConfigSubmit,
} from "@/components/admin/IntegrationConfigForm";
import {
  ShopifyConnectPanel,
  shopifyFailureMessage,
  SHOPIFY_UPDATES_DELAYED,
} from "@/components/admin/ShopifyConnectPanel";
import { formatAdminDateTime, formatAdminTime } from "@/lib/adminFormat";
import { adminErrorMessage } from "@/lib/adminError";
import { api, isApiEnabled, type ApiIntegration, type ApiIntegrationPatch } from "@/lib/apiClient";
import { type AdminIntegration, type AdminIntegrationField } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useStaffRole } from "@/hooks/useStaffRole";
import { can } from "@/lib/adminPermissions";

/**
 * The companies this shop pays, and what each of them is doing right now.
 *
 * Every card used to carry two switches, and neither of them was the one that
 * mattered. "Enable integration" and a "Connected" badge said nothing about
 * whether a payment would really be taken; that was decided by a `driver`
 * setting on a server the owner cannot reach, and the drawer's advice — "flip
 * its driver to live on the server" — was both unfollowable and, since the mode
 * moved into the database, false.
 *
 * One control now, with three positions, and the position IS the status. Two
 * states sit outside it, because a mode is meaningless before the credentials
 * exist and a broken connection has to shout louder than either: Not set up,
 * and Something's wrong.
 */

/**
 * `mode` is a first-class input on PUT /admin/integrations/{key}: the server
 * validates it, refuses `live` until the required credentials are stored, and
 * writes its own audit line for it. It is missing from `ApiIntegrationPatch` in
 * lib/apiClient.ts, which another agent owns — this local shape is what that
 * type should gain, and nothing else here depends on the difference.
 */
type IntegrationPatch = ApiIntegrationPatch;

/**
 * The result of the last "Check it works", kept on the row by the API so a red
 * card can still say why after a reload — or on the owner's phone, having been
 * checked on the shop laptop. Read structurally for the same reason as above.
 */
type LastCheck = { ok: boolean; message: string; at: string };

type Card = AdminIntegration & { lastCheck?: LastCheck | null };

type Position = "off" | "practice" | "live";

/** What each position means, in the words of the thing it does. */
const POSITIONS: { id: Position; label: string }[] = [
  { id: "off", label: "Off" },
  { id: "practice", label: "Practice" },
  { id: "live", label: "Live" },
];

const PAYMENT_KEYS = ["razorpay", "cashfree"];

function positionOf(card: Card): Position {
  if (!card.enabled) return "off";
  return card.driver === "live" ? "live" : "practice";
}

function offSentence(card: Card): string {
  if (PAYMENT_KEYS.includes(card.id)) return "Checkout won't offer this way of paying at all.";
  if (card.id === "whatsapp") return "No WhatsApp or SMS goes out, including sign-in codes.";
  if (card.id === "shiprocket") return "You'll book couriers yourself and type the tracking number in.";
  return "Switched off completely.";
}

function liveSentence(card: Card): string {
  if (PAYMENT_KEYS.includes(card.id)) return "Really taking money from customers.";
  if (card.id === "whatsapp") return "Really sending messages to customers, and charging you for them.";
  if (card.id === "shiprocket") return "Really booking pickups on your Shiprocket account.";
  if (card.id === "shopify") return "Really reading your Shopify shop.";
  return "Really doing this for you.";
}

const PRACTICE_SENTENCE =
  "Nothing leaves your shop. Everything is written down so you can see what would have happened.";

function apiToCard(i: ApiIntegration): Card {
  return {
    id: i.id,
    name: i.name,
    description: i.description ?? "",
    status: i.status as AdminIntegration["status"],
    enabled: i.enabled,
    lastSync: i.lastSync ?? undefined,
    webhookUrl: i.webhookUrl ?? undefined,
    driver: i.driver,
    fields: i.fields ?? [],
    missingRequired: i.missingRequired ?? [],
    oauth: i.oauth,
    lastCheck: i.lastCheck ?? null,
  };
}

/**
 * Whether this card gets the press-a-button path instead of the boxes.
 *
 * Both halves matter. `supported` is the provider having one at all; `available`
 * is THIS shop's server actually holding the app the owner would approve. On a
 * server that does not, the boxes have to stay — a Connect button that cannot
 * work is a worse afternoon than the long way round.
 */
function connectsByButton(card: Card): boolean {
  return Boolean(card.oauth?.supported && card.oauth?.available);
}

/** One line: is there anything here that needs him today? */
function whatIsLeft(rows: Card[]): string {
  const wrong = rows.filter((card) => cardRank(card) === 0).length;
  const notSetUp = rows.filter((card) => cardRank(card) === 3).length;
  const live = rows.filter((card) => cardRank(card) === 1).length;

  if (wrong > 0) {
    return `${wrong === 1 ? "One of these needs" : `${wrong} of these need`} your attention — ${wrong === 1 ? "it is" : "they are"} first below.`;
  }
  if (live === 0 && notSetUp > 0) {
    return "None of these are doing anything yet. Set up the ones you use.";
  }
  if (notSetUp > 0) {
    return `${live} working. ${notSetUp} you have not set up — you only need the ones you actually use.`;
  }

  return `All ${live} set up and working.`;
}

/**
 * What comes first on the screen.
 *
 * In the order he cares about them: something is wrong → it is really doing
 * something → it is ready but switched off → he has not set it up. Deliberately
 * not alphabetical and not by category; the question this screen answers is
 * "what needs me?", and every other order buries it.
 */
function cardRank(card: Card): number {
  const missing = (card.missingRequired ?? []).length > 0;
  const oauthDisconnected = card.oauth?.supported === true && card.oauth?.connected !== true;
  const setUp = !missing && !oauthDisconnected;

  if (setUp && (card.status === "needs_attention" || card.lastCheck?.ok === false)) return 0;
  if (setUp && card.enabled && card.driver === "live") return 1;
  if (setUp) return 2;

  return 3;
}

function missingFieldLabels(card: Card): string[] {
  const byKey = Object.fromEntries((card.fields ?? []).map((f) => [f.key, f.label]));
  return (card.missingRequired ?? []).map((key) => shortLabel(byKey[key] ?? key));
}

/**
 * The field's name without the "(from your Razorpay dashboard)" tail.
 *
 * That tail belongs ON the field, where it tells him where to go and look. In a
 * sentence naming two of them it reads twice — "Add Key ID (from your Razorpay
 * dashboard) and Key Secret (from your Razorpay dashboard) first" — which is the
 * same instruction stuttered, and pushes the two things he actually has to find
 * to opposite ends of the line.
 */
function shortLabel(label: string): string {
  return label.replace(/\s*\((?:from|in) your [^)]*\)\s*/gi, " ").trim();
}

/** "Key ID and Key Secret" — the owner's own labels, joined the way he'd say it. */
function listLabels(labels: string[]): string {
  if (labels.length <= 1) return labels[0] ?? "";
  return `${labels.slice(0, -1).join(", ")} and ${labels[labels.length - 1]}`;
}

export default function AdminIntegrationsPage() {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const { role } = useStaffRole();
  // At render, never on press: the write routes ask for settings.write, and an
  // admin with no staff role written down now holds nothing at all.
  const canWrite = !apiOn || can("settings.write", role);

  const [cards, setCards] = useState<Card[]>([]);
  const [loadError, setLoadError] = useState("");
  const [returnNotice, setReturnNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rowMessage, setRowMessage] = useState<Record<string, string>>({});
  const [rowError, setRowError] = useState<Record<string, string>>({});
  const [undoFor, setUndoFor] = useState<string | null>(null);
  const [drawerError, setDrawerError] = useState("");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [confirmLive, setConfirmLive] = useState<Card | null>(null);
  const undoTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const loadIntegrations = useCallback(async () => {
    if (!apiOn) return;
    try {
      const res = await api.integrations();
      setCards((res.data ?? []).map(apiToCard));
      setLoadError("");
    } catch (error) {
      // Keep the previous rows: a blip must not look like "you have no accounts".
      setLoadError(adminErrorMessage(error, "Couldn't load your other companies."));
    }
  }, [apiOn]);

  useEffect(() => {
    void loadIntegrations();
  }, [loadIntegrations]);

  useEffect(() => () => {
    if (undoTimer.current) clearTimeout(undoTimer.current);
  }, []);

  // The trip back from Shopify. He approved us on somebody else's website and
  // arrives here on a plain link, so the outcome can only travel in the address —
  // and the address is then wiped, or the same "it worked" would greet him again
  // every time he opened this page from a bookmark.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const outcome = params.get("shopify");
    if (outcome !== "connected" && outcome !== "failed") return;

    setReturnNotice(
      outcome === "connected"
        ? {
            ok: true,
            // Connected-with-a-caveat is still connected. The server used to send
            // this case back as a failure reading "nothing has changed", next to a
            // card that said Connected — with his token stored, his shop live and
            // his catalogue already coming in. He had no way to tell which of the
            // two was telling the truth, and the red one's advice (press it again)
            // was the one thing that could not help.
            message:
              params.get("updates") === "delayed"
                ? SHOPIFY_UPDATES_DELAYED
                : "Shopify is connected. Your shop can bring your products and collections across now.",
          }
        : { ok: false, message: shopifyFailureMessage(params.get("reason")) },
    );

    params.delete("shopify");
    params.delete("reason");
    params.delete("updates");
    const rest = params.toString();
    window.history.replaceState(null, "", `/admin/integrations${rest ? `?${rest}` : ""}`);
  }, []);

  const rows = useMemo(() => {
    const source: Card[] = apiOn
      ? cards
      : store.integrations.map((i) => ({ ...i, lastCheck: null }));
    // Outbound webhooks has no shop-owner story: it is only meaningful once
    // somebody else's system is already expecting the messages.
    const visible = source.filter((card) => card.id !== "webhooks" || Boolean(card.webhookUrl));

    // Cards arrived in the order the rows were created in the database, so the
    // one thing that was broken could sit fourth, below three he has never set
    // up. He opens this screen to find out what needs him; it should be first.
    // He needs ONE company to take payments, and there are two here. Once one
    // of them is doing the job the other is not a task, so it stops competing
    // for the top of the screen — but it stays on it, because switching
    // providers is a real thing shops do and hiding it would strand him.
    const paymentSolved = visible.some(
      (card) => PAYMENT_KEYS.includes(card.id) && cardRank(card) <= 1,
    );
    const rank = (card: Card) =>
      paymentSolved && PAYMENT_KEYS.includes(card.id) && cardRank(card) === 3
        ? 4
        : cardRank(card);

    return [...visible].sort((a, b) => rank(a) - rank(b));
  }, [apiOn, cards, store.integrations]);

  const active = rows.find((card) => card.id === activeId) ?? null;

  async function patchCard(card: Card, patch: IntegrationPatch): Promise<Card | null> {
    setBusyId(card.id);
    setRowError((prev) => ({ ...prev, [card.id]: "" }));
    try {
      const updated = apiToCard(await api.updateIntegration(card.id, patch));
      setCards((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      return updated;
    } catch (error) {
      // Stays on the card, never in a toast: this one is about money moving.
      setRowError((prev) => ({
        ...prev,
        [card.id]: adminErrorMessage(error, "That didn't change."),
      }));
      return null;
    } finally {
      setBusyId(null);
    }
  }

  /** Runs the real check and prints its own sentence on the card. */
  async function check(card: Card, prefix = "") {
    setBusyId(card.id);
    try {
      const res = await api.testIntegration(card.id);
      setRowMessage((prev) => ({ ...prev, [card.id]: `${prefix}${res.message}` }));
      await loadIntegrations();
    } catch (error) {
      setRowError((prev) => ({
        ...prev,
        [card.id]: adminErrorMessage(error, "Couldn't check it just now."),
      }));
    } finally {
      setBusyId(null);
    }
  }

  async function goTo(card: Card, position: Position) {
    if (position === positionOf(card)) return;
    setRowMessage((prev) => ({ ...prev, [card.id]: "" }));

    if (position === "live") {
      // An accidental real WhatsApp is embarrassing and recoverable. An
      // accidental real charge is neither, so payments — and only payments —
      // stop and ask.
      if (PAYMENT_KEYS.includes(card.id)) {
        setConfirmLive(card);
        return;
      }
      await goLive(card);
      return;
    }

    if (position === "practice") {
      const wasLive = positionOf(card) === "live";
      const updated = await patchCard(card, { enabled: true, mode: "log" });
      if (updated && wasLive) {
        // Switching real money off is the safe direction, so it does not stop
        // and ask — but a mis-click costs sales, so it is undoable for ten
        // seconds by the reverse call that really exists.
        setUndoFor(card.id);
        if (undoTimer.current) clearTimeout(undoTimer.current);
        undoTimer.current = setTimeout(() => setUndoFor(null), 10000);
      }
      return;
    }

    await patchCard(card, { enabled: false });
  }

  async function goLive(card: Card) {
    const updated = await patchCard(card, { enabled: true, mode: "live" });
    if (!updated) return;
    // Going live is exactly when "is it actually working?" has to be answered,
    // and it is the one moment the owner is definitely looking at the card.
    await check(updated, "Switched on. ");
  }

  async function saveConfig(patch: IntegrationConfigSubmit) {
    if (!active) return;
    setSaving(true);
    setDrawerError("");
    try {
      const updated = apiToCard(await api.updateIntegration(active.id, patch));
      setCards((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
      setSavedAt(new Date());
    } catch (error) {
      // Rethrown so the form keeps what was typed. A half-pasted key is not
      // something to make somebody find again.
      setDrawerError(adminErrorMessage(error, "That didn't save."));
      throw error;
    } finally {
      setSaving(false);
    }
  }

  /** Asks our own server where on Shopify to send him. The panel does the going. */
  async function startShopifyConnect(shop: string): Promise<string> {
    const res = await api.startShopifyConnect(shop);
    return res.authorizeUrl;
  }

  /**
   * Stops the shop reading Shopify, and leaves everything already brought
   * across exactly where it is — those are ordinary products in this shop now,
   * and nothing in the import ever removes one.
   */
  async function disconnectShopify() {
    // Its own endpoint, because it clears the stored approval — turning the row
    // off left the token behind, so "disconnected" meant nothing that a single
    // press of Live could not undo.
    await api.shopifyDisconnect();
    const updated = apiToCard(await api.integration("shopify"));
    setCards((prev) => prev.map((row) => (row.id === updated.id ? updated : row)));
  }

  return (
    <div>
      <AdminPageHeader
        title="Other companies"
        description="Accounts you hold somewhere else. Every card has one switch, and where it sits is what that company is doing right now."
      />

      {/* The page's own answer, before he reads six cards to work it out. The
          order below already puts anything wrong at the top; this says whether
          there is anything to look for at all. */}
      {apiOn && rows.length > 0 ? (
        <p className="mb-3 text-[12px] text-[#6E6E73]">{whatIsLeft(rows)}</p>
      ) : null}

      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. These are sample cards — nothing here is connected to a real account.
        </AdminNotice>
      ) : null}

      {!canWrite ? (
        <AdminNotice tone="info">
          Only the owner can set these up or switch them on. You can see where each one is.
        </AdminNotice>
      ) : null}

      {returnNotice ? (
        <AdminNotice tone={returnNotice.ok ? "info" : "error"}>
          {returnNotice.message}
        </AdminNotice>
      ) : null}

      {loadError ? (
        <AdminNotice tone="error">
          {loadError}{" "}
          <button
            type="button"
            onClick={() => void loadIntegrations()}
            className="font-semibold underline underline-offset-2"
          >
            Try again
          </button>
        </AdminNotice>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((card) => (
          <IntegrationCard
            key={card.id}
            card={card}
            canWrite={canWrite && apiOn}
            busy={busyId === card.id}
            message={rowMessage[card.id]}
            error={rowError[card.id]}
            undoable={undoFor === card.id}
            onUndo={() => {
              setUndoFor(null);
              void goLive(card);
            }}
            onSelect={(position) => void goTo(card, position)}
            onOpen={() => setActiveId(card.id)}
            onCheck={() => void check(card)}
          />
        ))}
      </div>

      <AdminDrawer
        open={Boolean(active)}
        title={active?.name ?? "Set up"}
        subtitle={active ? "Copied from your account with them" : undefined}
        onClose={() => {
          setActiveId(null);
          setDrawerError("");
          setSavedAt(null);
        }}
        widthClassName="max-w-lg sm:max-w-xl"
      >
        {active ? (
          <div className="space-y-4">
            <p className="text-xs leading-relaxed text-[#6E6E73]">{active.description}</p>
            {connectsByButton(active) ? (
              // One box and a button, instead of the three boxes one of which
              // asks for a token that is ten screens deep in somebody else's
              // developer settings. The boxes are still what a server without a
              // Shopify app of its own shows — see connectsByButton.
              <ShopifyConnectPanel
                key={active.id}
                integration={active}
                readOnly={!canWrite}
                onStart={startShopifyConnect}
                onDisconnect={disconnectShopify}
              />
            ) : (
              <IntegrationConfigForm
                key={active.id}
                integration={active}
                saving={saving}
                readOnly={!canWrite}
                onSave={saveConfig}
              />
            )}
            {drawerError ? (
              <p role="alert" className="text-[11px] font-medium leading-relaxed text-[#B42318]">
                Not saved — {drawerError}
              </p>
            ) : savedAt ? (
              <p className="text-[11px] font-semibold text-[#2D6B3C]">
                Saved · {formatAdminTime(savedAt)}
              </p>
            ) : null}
          </div>
        ) : null}
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(confirmLive)}
        title={`Start taking real money through ${confirmLive?.name ?? ""}?`}
        description={`From the moment you press this, a customer paying at checkout is really charged and the money goes to your ${confirmLive?.name ?? ""} account. Nothing that already happened changes, and no order is re-charged. You can put it back to practice at any time.`}
        confirmLabel="Take real money"
        cancelLabel="Stay in practice"
        danger
        onConfirm={() => {
          const card = confirmLive;
          setConfirmLive(null);
          if (card) void goLive(card);
        }}
        onCancel={() => setConfirmLive(null)}
      />
    </div>
  );
}

function IntegrationCard({
  card,
  canWrite,
  busy,
  message,
  error,
  undoable,
  onUndo,
  onSelect,
  onOpen,
  onCheck,
}: {
  card: Card;
  canWrite: boolean;
  busy: boolean;
  message?: string;
  error?: string;
  undoable: boolean;
  onUndo: () => void;
  onSelect: (position: Position) => void;
  onOpen: () => void;
  onCheck: () => void;
}) {
  const missing = missingFieldLabels(card);
  // A shop connected by pressing Connect is only set up while its approval is
  // still held. Disconnect used to leave the token in place, so this stayed
  // true and the live/practice switch below stayed on the card — pressing Live
  // reconnected the shop silently, with the old token and no fresh approval,
  // while the panel beside it was offering to connect. Two screens, opposite
  // answers, no way for him to tell which was real.
  const oauthDisconnected = card.oauth?.supported === true && card.oauth?.connected !== true;
  const setUp = missing.length === 0 && !oauthDisconnected;
  // Before he has approved us, the missing values are the ones the connect
  // button is about to fetch on his behalf. Naming them here would put "Admin
  // API access token" back on the card — the exact errand this removes.
  const byButton = connectsByButton(card) && !setUp;
  const position = positionOf(card);
  const broken = setUp && (card.status === "needs_attention" || card.lastCheck?.ok === false);

  return (
    <article
      // Named so System health can send the owner straight to the card that
      // fixes what it is reporting, instead of naming a server setting.
      id={card.id}
      className="flex flex-col scroll-mt-24 rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)]"
    >
      <h2 className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{card.name}</h2>
      <p className="mt-1 text-xs leading-relaxed text-[#6E6E73]">{card.description}</p>

      {broken ? (
        <div className="mt-3 rounded-lg border border-[#F5C2C0] bg-[#FDECEC] px-3 py-2 text-[11px] leading-relaxed text-[#B42318]">
          <span className="font-semibold">Something&rsquo;s wrong.</span>{" "}
          {card.lastCheck?.message ??
            "The last check didn't get through. Press Check it works to see why."}
          {card.lastCheck?.at ? (
            <span className="mt-0.5 block text-[10px] font-medium text-[#B42318]/70">
              Last checked {formatAdminDateTime(card.lastCheck.at)}
            </span>
          ) : null}
        </div>
      ) : null}

      {setUp ? (
        <div className="mt-3">
          <div className="text-[11px] font-semibold text-[#424245]">
            What {card.name} does right now
          </div>
          <div
            role="radiogroup"
            aria-label={`What ${card.name} does right now`}
            className="mt-1.5 flex rounded-lg border border-black/[0.06] bg-[#F0F0F2] p-1"
          >
            {POSITIONS.map((option) => {
              const on = option.id === position;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  disabled={!canWrite || busy}
                  onClick={() => onSelect(option.id)}
                  className={`flex-1 rounded-md px-2 py-1.5 text-[11px] font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:cursor-not-allowed disabled:opacity-60 ${
                    on
                      ? option.id === "live"
                        ? "bg-[#1D7A4C] text-white shadow-[0_1px_2px_rgba(17,17,19,0.12)]"
                        : "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.08)]"
                      : "text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-[11px] leading-relaxed text-[#6E6E73]">
            {position === "off"
              ? offSentence(card)
              : position === "practice"
                ? PRACTICE_SENTENCE
                : liveSentence(card)}
          </p>
        </div>
      ) : (
        <div className="mt-3 rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5">
          <div className="text-[11px] font-semibold text-[#424245]">
            {byButton ? "Not connected" : "Not set up"}
          </div>
          <p className="mt-0.5 text-[11px] leading-relaxed text-[#6E6E73]">
            {byButton
              ? `Type the name of your ${card.name} shop and approve it there. It takes a minute and there is nothing to copy.`
              : `Add ${listLabels(missing)} first. Until then there is nothing for this to do.`}
          </p>
        </div>
      )}

      {undoable ? (
        <div className="mt-2 rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-3 py-2 text-[11px] text-[#6E6E73]">
          Back in practice mode.{" "}
          <button
            type="button"
            onClick={onUndo}
            className="font-semibold text-[#1D1D1F] underline underline-offset-2"
          >
            Undo
          </button>
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-2 text-[11px] font-medium leading-relaxed text-[#B42318]">
          {error}
        </p>
      ) : null}

      {message && !error ? (
        <p className="mt-2 text-[11px] leading-relaxed text-[#424245]">{message}</p>
      ) : null}

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-3.5">
        <button
          type="button"
          onClick={onOpen}
          className="h-8 rounded-lg border border-black/[0.1] px-3 text-[11px] font-semibold text-[#1D1D1F]"
        >
          {/* One verb for one door. "Set it up", "Change what's saved" and
              "Connect X" all opened the same drawer, so three labels described
              one action and the difference between them carried no information
              he could use. What changes is whether anything is saved yet.
              Connect stays its own word only where it really is a different
              thing — he leaves for Shopify and comes back. */}
          {byButton ? `Connect ${card.name}` : setUp ? "Change" : "Set up"}
        </button>
        {setUp && canWrite ? (
          <button
            type="button"
            onClick={onCheck}
            disabled={busy}
            className="h-8 rounded-lg border border-black/[0.1] px-3 text-[11px] font-semibold text-[#1D1D1F] disabled:opacity-50"
          >
            {busy ? "Checking…" : "Check it works"}
          </button>
        ) : null}
      </div>
    </article>
  );
}
