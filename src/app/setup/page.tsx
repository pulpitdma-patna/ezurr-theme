"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { api, ApiError, isApiEnabled, setApiToken, type ApiInstallState } from "@/lib/apiClient";
import { setStaffRole, type StaffRole } from "@/lib/adminPermissions";
import { isValidMobile, normalizeMobile, setSession } from "@/lib/auth";

/**
 * The screen that turns a running server into somebody's store.
 *
 * A fresh install deliberately has no owner. It used to seed one on a hardcoded
 * mobile number, which meant every store built from this codebase shared an
 * administrator while the person who actually bought it signed in as a customer.
 *
 * So this is where the owner account is made, from the phone number they will
 * really use — and it signs them in directly rather than sending an OTP, because
 * on a fresh install the OTP goes to a log file they cannot read.
 *
 * It is reachable only while the store is unclaimed. The server closes it for
 * good the moment an owner exists; this page just reflects that.
 */

const inputClass =
  "mt-1.5 h-12 w-full rounded-[10px] border border-[var(--ez-border)] bg-white px-3.5 text-[15px] text-[var(--ez-ink)] outline-none transition placeholder:text-[var(--ez-subtle)] focus:border-[var(--ez-ink)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--ez-ink)]";

const labelClass =
  "ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ez-subtle)]";

function Panel({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-[100dvh] bg-[var(--ez-warm-surface)] px-5 py-12 sm:px-8 sm:py-16">
      <div className="mx-auto w-full max-w-[34rem]">{children}</div>
    </main>
  );
}

function ReadyRow({ ok, label, detail }: { ok: boolean; label: string; detail: string }) {
  return (
    <li className="flex items-start gap-2.5">
      <span
        aria-hidden="true"
        className={`mt-[3px] flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
          ok ? "bg-[#1D7A4C]" : "bg-[#B45309]"
        }`}
      >
        {ok ? "✓" : "!"}
      </span>
      <span className="text-[13px] leading-relaxed text-[var(--ez-muted)]">
        <span className="font-semibold text-[var(--ez-ink)]">{label}</span> — {detail}
      </span>
    </li>
  );
}

function initialsFromName(name: string, role: "admin" | "customer"): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.slice(0, 2).toUpperCase() || (role === "admin" ? "AD" : "EZ");
}

function isCriticalSimulating(simulating: { name: string; variable: string }[]): boolean {
  return simulating.some(
    (item) =>
      item.name.toLowerCase().includes("payment") ||
      item.name.toLowerCase().includes("messaging") ||
      item.variable.includes("RAZORPAY") ||
      item.variable.includes("CASHFREE") ||
      item.variable.includes("MSG91"),
  );
}

function asStaffRole(value: string | undefined): StaffRole | null {
  if (value === "owner" || value === "manager" || value === "support" || value === "viewer") {
    return value;
  }
  return null;
}

export default function SetupPage() {
  const router = useRouter();
  const [state, setState] = useState<ApiInstallState | null>(null);
  const [loadError, setLoadError] = useState("");
  const [storeName, setStoreName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerMobile, setOwnerMobile] = useState("");
  const [claimToken, setClaimToken] = useState("");
  const [acknowledgedSimulating, setAcknowledgedSimulating] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isApiEnabled()) {
      setLoadError("The store server is not configured, so there is nothing to set up yet.");
      return;
    }
    let cancelled = false;
    api
      .installState()
      .then((s) => {
        if (cancelled) return;
        setState(s);
        if (s.storeName) setStoreName(s.storeName);
      })
      .catch(() => {
        if (cancelled) return;
        setLoadError(
          "Couldn't reach the store server. Check that it is running and that its address is correct.",
        );
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const ready = state?.ready;
  const hostNotReady = Boolean(ready && (!ready.database || !ready.schema));
  const simulating = state?.simulating ?? [];
  const needsAck = isCriticalSimulating(simulating);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const mobile = normalizeMobile(ownerMobile);
    if (!storeName.trim()) return setError("Give your store a name.");
    if (!ownerName.trim()) return setError("Enter your name.");
    if (!isValidMobile(mobile)) {
      return setError("Enter the 10-digit mobile number you will sign in with.");
    }
    if (state?.requiresClaimToken && !claimToken.trim()) {
      return setError("Enter the setup code printed when the server was prepared.");
    }
    if (hostNotReady) {
      return setError("The server is not ready yet. Fix the checklist below before continuing.");
    }
    if (needsAck && !acknowledgedSimulating) {
      return setError("Confirm you understand that payments and messaging are still in practice mode.");
    }

    setError("");
    setSubmitting(true);
    try {
      const res = await api.installComplete({
        storeName: storeName.trim(),
        ownerName: ownerName.trim(),
        ownerMobile: mobile,
        ...(claimToken.trim() ? { claimToken: claimToken.trim() } : {}),
      });

      // The server signs them in, so there is no OTP round trip to survive here.
      setApiToken(res.token);
      const role = res.user.role === "admin" ? "admin" : "customer";
      setSession({
        mobile: res.user.mobile,
        name: res.user.name,
        initials: initialsFromName(res.user.name, role),
        signedInAt: new Date().toISOString(),
        role,
      });
      const staffRole = asStaffRole(res.user.staffRole);
      if (staffRole) setStaffRole(staffRole);
      router.push("/admin");
    } catch (e) {
      // The server's own wording is better than anything generic here: it knows
      // whether the store was already claimed, whether it has orders, or which
      // field was wrong.
      const body =
        e instanceof ApiError
          ? (e.body as { message?: string; errors?: Record<string, string[]> } | null)
          : null;
      const fieldError = body?.errors ? Object.values(body.errors)[0]?.[0] : undefined;
      setError(
        fieldError ??
          body?.message ??
          "Couldn't finish setup. Check your connection and try again.",
      );
      setSubmitting(false);
    }
  }

  if (loadError) {
    return (
      <Panel>
        <h1 className="text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.045em] text-[var(--ez-ink)]">
          Setup can&apos;t start yet
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ez-muted)]">{loadError}</p>
      </Panel>
    );
  }

  if (!state) {
    return (
      <Panel>
        <p className="ez-mono animate-pulse text-[11px] uppercase tracking-[0.16em] text-[var(--ez-subtle)]">
          Checking your store…
        </p>
      </Panel>
    );
  }

  if (!state.needsSetup) {
    return (
      <Panel>
        <h1 className="text-[clamp(1.6rem,3vw,2.1rem)] font-semibold tracking-[-0.045em] text-[var(--ez-ink)]">
          {state.storeName ?? "This store"} is already set up
        </h1>
        <p className="mt-3 text-[14px] leading-relaxed text-[var(--ez-muted)]">
          Setup runs once. Sign in with the mobile number the owner used.
        </p>
        <Link
          href="/auth"
          className="mt-7 inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-[10px] bg-[var(--ez-ink)] px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#2a2a2d] hover:text-white"
        >
          Sign in <span aria-hidden="true" className="text-white/70">→</span>
        </Link>
      </Panel>
    );
  }

  const submitDisabled = submitting || hostNotReady || (needsAck && !acknowledgedSimulating);

  return (
    <Panel>
      <p className="ez-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ez-accent-text)]">
        One-time setup
      </p>
      <h1 className="mt-3 text-[clamp(1.9rem,4vw,2.6rem)] font-semibold leading-[1.02] tracking-[-0.05em] text-[var(--ez-ink)]">
        Make this store yours
      </h1>
      <p className="mt-3 text-[14px] leading-relaxed text-[var(--ez-muted)]">
        Your server is running but nobody owns it yet. Fill this in and you&apos;ll be signed in
        as the owner — this page then closes for good.
      </p>

      {simulating.length > 0 ? (
        <section className="mt-6 rounded-[14px] border border-[#F1C7B8] bg-[#FEF3EE] p-5">
          <h2 className="ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#9A3412]">
            Not switched on yet
          </h2>
          <p className="mt-2.5 text-[13px] leading-relaxed text-[#7C3A16]">
            These are running in practice mode: they write down what they would have done and
            contact nobody. A payment will look like it succeeded without money moving, and an
            order message will never arrive. Saving credentials in the admin does not lift this —
            each one needs a setting changed on the server.
          </p>
          <ul className="mt-3.5 space-y-1.5">
            {simulating.map((item) => (
              <li key={item.variable} className="flex flex-wrap items-baseline gap-2 text-[13px] text-[#7C3A16]">
                <span className="font-semibold">{item.name}</span>
                <code className="ez-mono rounded bg-white/70 px-1.5 py-0.5 text-[11px]">
                  {item.variable}=live
                </code>
              </li>
            ))}
          </ul>
          {needsAck ? (
            <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[13px] leading-relaxed text-[#7C3A16]">
              <input
                type="checkbox"
                checked={acknowledgedSimulating}
                onChange={(e) => setAcknowledgedSimulating(e.target.checked)}
                className="mt-1 h-4 w-4 shrink-0 rounded border-[#E2A98F]"
              />
              <span>
                I understand payments and messaging are still in practice mode, and I can finish
                setup now — this list also stays on Admin → System.
              </span>
            </label>
          ) : (
            <p className="mt-3.5 text-[12px] text-[#7C3A16]">
              You can finish setup now — this list is also on Admin → System, so nothing here is
              lost.
            </p>
          )}
        </section>
      ) : null}

      <form onSubmit={submit} className="mt-9 space-y-5">
        <label className="block">
          <span className={labelClass}>Store name</span>
          <input
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            placeholder="Pulpit Games"
            maxLength={120}
            className={inputClass}
            autoComplete="organization"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Your name</span>
          <input
            value={ownerName}
            onChange={(e) => setOwnerName(e.target.value)}
            placeholder="Rakesh"
            maxLength={120}
            className={inputClass}
            autoComplete="name"
          />
        </label>

        <label className="block">
          <span className={labelClass}>Your mobile number</span>
          <input
            value={ownerMobile}
            onChange={(e) => setOwnerMobile(normalizeMobile(e.target.value))}
            placeholder="9876543210"
            inputMode="numeric"
            className={inputClass}
            autoComplete="tel-national"
          />
          <span className="mt-1.5 block text-[12px] text-[var(--ez-subtle)]">
            This is how you will sign in from now on. Use the number you actually carry.
          </span>
        </label>

        {state.requiresClaimToken ? (
          <label className="block">
            <span className={labelClass}>Setup code</span>
            <input
              value={claimToken}
              onChange={(e) => setClaimToken(e.target.value.toUpperCase())}
              placeholder="ABCD-EFGH"
              className={`${inputClass} ez-mono tracking-[0.12em]`}
            />
            <span className="mt-1.5 block text-[12px] text-[var(--ez-subtle)]">
              Printed on the server when it was prepared. Ask whoever set it up.
            </span>
          </label>
        ) : null}

        {error ? (
          <p
            role="alert"
            className="rounded-[10px] border border-[#F1C7B8] bg-[#FEF3EE] px-3.5 py-3 text-[13px] leading-relaxed text-[#9A3412]"
          >
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={submitDisabled}
          className="inline-flex min-h-[3.25rem] w-full items-center justify-center gap-2.5 rounded-[10px] bg-[var(--ez-ink)] px-6 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#2a2a2d] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
        >
          {submitting ? "Setting up…" : "Create my owner account"}
        </button>
      </form>

      {ready ? (
        <section className="mt-10 rounded-[14px] border border-[var(--ez-border)] bg-white p-5">
          <h2 className="ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ez-subtle)]">
            Server check
          </h2>
          <ul className="mt-3.5 space-y-2.5">
            <ReadyRow
              ok={ready.database}
              label="Database"
              detail={ready.database ? "connected" : "not reachable — setup will fail"}
            />
            <ReadyRow
              ok={ready.schema}
              label="Tables"
              detail={
                ready.schema
                  ? "up to date"
                  : "some are missing. Ask whoever runs your server for `php artisan ezurr:update`"
              }
            />
            <ReadyRow
              ok={ready.content}
              label="Starter pages"
              detail={ready.content ? "installed" : "not installed yet"}
            />
          </ul>
        </section>
      ) : null}
    </Panel>
  );
}
