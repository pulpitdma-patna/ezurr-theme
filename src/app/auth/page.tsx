"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  clearSession,
  formatMobileDisplay,
  getSession,
  isAdminSession,
  isCredentialedSession,
  isValidMobile,
  isValidOtp,
  maskMobile,
  normalizeMobile,
  setSession,
  type AuthSession,
} from "@/lib/auth";
import { asStaffRole, clearStaffRole, setStaffRole } from "@/lib/adminPermissions";
import { api, isApiEnabled, setApiToken } from "@/lib/apiClient";

const RESEND_SECONDS = 30;

/**
 * Shown instead of signing anyone in when the API is not configured.
 *
 * There used to be a fallback here that accepted any six digits and derived
 * the role from the phone number, so an unset NEXT_PUBLIC_API_URL silently
 * granted admin. Sign-in now fails closed.
 */
const API_UNAVAILABLE = "Sign-in is unavailable right now — the store API is not reachable.";

function OtpBoxes({
  value,
  onChange,
  disabled,
  focusSignal,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
  /** Bumped by the parent to pull focus back to the first cell (failed verify). */
  focusSignal: number;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  useEffect(() => {
    if (focusSignal <= 0) return;
    refs.current[0]?.focus();
    refs.current[0]?.select();
  }, [focusSignal]);

  function commit(next: string) {
    onChange(next.replace(/\D/g, "").slice(0, 6));
  }

  function handleChange(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "");
    if (!cleaned) {
      const next = value.split("");
      next[index] = "";
      commit(next.join(""));
      return;
    }

    // A full-length burst is the OS filling the whole code from an SMS
    // (autocomplete="one-time-code"). Anything shorter is a keystroke landing
    // in a cell that already holds a digit — the old code read that as a paste
    // and replaced the entire code, wiping every other cell.
    if (cleaned.length >= 6) {
      commit(cleaned);
      refs.current[5]?.focus();
      return;
    }

    const next = value.padEnd(6, " ").split("");
    next[index] = cleaned.slice(-1);
    const joined = next.join("").replace(/ /g, "");
    commit(joined);
    if (index < 5) refs.current[index + 1]?.focus();
  }

  function handleKeyDown(index: number, event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Backspace" && !value[index] && index > 0) {
      refs.current[index - 1]?.focus();
    }
  }

  function handlePaste(event: React.ClipboardEvent<HTMLInputElement>) {
    event.preventDefault();
    const pasted = event.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    commit(pasted);
    refs.current[Math.min(pasted.length, 5)]?.focus();
  }

  return (
    <div className="auth-otp-grid flex justify-between gap-2 sm:gap-2.5" role="group" aria-label="One-time password">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(el) => {
            refs.current[index] = el;
          }}
          type="text"
          inputMode="numeric"
          autoComplete={index === 0 ? "one-time-code" : "off"}
          maxLength={6}
          disabled={disabled}
          value={digit.trim()}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => handleChange(index, event.target.value)}
          onKeyDown={(event) => handleKeyDown(index, event)}
          onPaste={handlePaste}
          // Selecting on focus means retyping a cell replaces its digit
          // instead of appending to it.
          onFocus={(event) => event.target.select()}
          className="auth-otp-cell h-[3.5rem] w-full max-w-[52px] rounded-[10px] border border-[var(--ez-border)] bg-[var(--ez-warm-surface)] text-center ez-mono text-lg font-bold text-[var(--ez-ink)] outline-none transition-[border-color,box-shadow,background-color] duration-200 placeholder:text-[#c5c8d1] hover:border-[#d2d2d7] focus:border-[var(--ez-accent)] focus:bg-white focus:shadow-[0_0_0_3px_oklch(0.55_0.17_var(--ez-h)_/_0.1)] sm:h-[3.75rem] sm:max-w-[58px] sm:text-xl"
        />
      ))}
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="auth-brand-panel relative isolate overflow-hidden bg-[var(--ez-ink)] text-white">
      <Image
        src="/images/hero-handheld-cyan.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="auth-brand-image object-cover object-[67%_center] opacity-[0.42]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(8,10,16,.97)_0%,rgba(8,10,16,.88)_42%,rgba(8,10,16,.72)_100%)]" />
      <div aria-hidden="true" className="auth-grain absolute inset-0 opacity-[0.12]" />
      <div aria-hidden="true" className="auth-brand-grid absolute inset-0" />

      <div className="relative flex min-h-[20rem] flex-col justify-between p-6 sm:min-h-[24rem] sm:p-9 lg:min-h-screen lg:p-10 xl:p-14">
        <Link href="/" className="group relative z-10 flex w-fit items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-white/15 bg-white/[0.06] text-sm font-bold tracking-[-0.04em] transition group-hover:border-white/25 group-hover:bg-white/[0.1]">
            E
          </span>
          <span className="flex flex-col">
            <span className="text-[1.15rem] font-semibold leading-none tracking-[-0.05em]">Ezurr</span>
            <span className="ez-mono mt-1 text-[8px] font-bold uppercase tracking-[0.18em] text-white/45 transition-colors group-hover:text-white/70">
              Commerce platform
            </span>
          </span>
        </Link>

        <div className="auth-trust-panel pointer-events-none absolute bottom-7 right-6 hidden w-[min(42%,16rem)] sm:block lg:bottom-12 lg:right-14">
          <div className="rounded-[14px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur-sm">
            <p className="ez-mono text-[8px] font-bold uppercase tracking-[0.2em] text-white/45">Session security</p>
            <ul className="mt-3 space-y-2.5">
              {["OTP-verified sign-in", "Encrypted at rest", "Role-based access"].map((item) => (
                <li key={item} className="flex items-center gap-2 text-[12px] text-white/72">
                  <span className="h-1 w-1 shrink-0 rounded-full bg-[var(--ez-accent)]" aria-hidden="true" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="relative z-10 mt-auto max-w-[32rem] pt-12 lg:pb-8">
          <p className="auth-kicker ez-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ez-accent)]">
            Secure access
          </p>
          <h1 className="mt-3 max-w-lg text-[clamp(2.4rem,5vw,4.5rem)] font-semibold leading-[0.92] tracking-[-0.06em]">
            Your operations
            <br />
            <span className="text-white/75">command center.</span>
          </h1>
          <div className="mt-6 flex items-start gap-3 border-t border-white/10 pt-6">
            <span className="mt-0.5 h-px w-8 shrink-0 bg-[var(--ez-accent)]" aria-hidden="true" />
            <p className="max-w-[22rem] text-[13px] leading-relaxed text-white/55 sm:text-sm">
              Manage orders, inventory, and customer operations from one unified workspace.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function AuthStepIndicator({ step }: { step: "mobile" | "otp" }) {
  const steps = [
    { id: "mobile" as const, label: "Mobile", num: "01" },
    { id: "otp" as const, label: "Verify", num: "02" },
  ];
  const activeIndex = step === "mobile" ? 0 : 1;

  return (
    <div className="auth-stepper">
      <div className="flex items-center justify-between gap-4">
        {steps.map((s, index) => {
          const isActive = index === activeIndex;
          const isComplete = index < activeIndex;
          return (
            <div key={s.id} className="flex min-w-0 items-center gap-2">
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ez-mono text-[10px] font-bold transition-colors ${
                  isActive || isComplete
                    ? "bg-[var(--ez-accent)] text-white"
                    : "border border-[var(--ez-border)] bg-white text-[var(--ez-subtle)]"
                }`}
              >
                {s.num}
              </span>
              <span
                className={`truncate ez-mono text-[10px] font-bold uppercase tracking-[0.14em] ${
                  isActive ? "text-[var(--ez-accent-text)]" : isComplete ? "text-[var(--ez-ink)]" : "text-[var(--ez-subtle)]"
                }`}
              >
                {s.label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="auth-progress-track mt-3.5" aria-hidden="true">
        <span className={step === "otp" ? "auth-progress-fill is-complete" : "auth-progress-fill"} />
      </div>
    </div>
  );
}

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  // Reject path traversal and encoded tricks that still start with "/".
  if (raw.includes("..") || raw.includes("\\") || raw.includes("%2e") || raw.includes("%2E")) {
    return null;
  }
  try {
    const url = new URL(raw, "https://ezurr.local");
    if (url.origin !== "https://ezurr.local" || url.pathname.includes("..")) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [otpFocusSignal, setOtpFocusSignal] = useState(0);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [existingSession, setExistingSession] = useState<AuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);
  /** unknown until installState settles — never flash OTP on an unclaimed store. */
  const [installGate, setInstallGate] = useState<"unknown" | "needsSetup" | "claimed">("unknown");

  function destination(session: AuthSession) {
    if (isAdminSession(session)) return "/admin";
    return nextPath && nextPath.startsWith("/account") ? nextPath : "/account";
  }

  useEffect(() => {
    function sync() {
      const session = getSession();
      setExistingSession(isCredentialedSession(session) ? session : null);
      setSessionReady(true);
    }
    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("ezurr-auth-change", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("ezurr-auth-change", sync);
    };
  }, []);

  // A store nobody has claimed cannot sign anyone in. Fail closed: until we know
  // the store is claimed, keep OTP hidden (including when installState errors).
  useEffect(() => {
    if (!isApiEnabled()) {
      setInstallGate("claimed");
      return;
    }
    let cancelled = false;
    setInstallGate("unknown");
    api
      .installState()
      .then((s) => {
        if (!cancelled) setInstallGate(s.needsSetup ? "needsSetup" : "claimed");
      })
      .catch(() => {
        if (!cancelled) setInstallGate("needsSetup");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  function signOutExisting() {
    clearSession();
    setExistingSession(null);
    setStep("mobile");
    setMobile("");
    setOtp("");
    setError("");
  }

  async function sendOtp(nextMobile = mobile) {
    const digits = normalizeMobile(nextMobile);
    if (!isValidMobile(digits)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }
    if (!isApiEnabled()) {
      setError(API_UNAVAILABLE);
      return;
    }
    if (installGate !== "claimed") {
      setError("This store still needs setup before a sign-in code can be sent.");
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await api.sendOtp(digits);
      if (res.devCode) {
        // Local Laravel returns a fixed OTP for demos
        console.info("[ezurr-api] dev OTP", res.devCode);
      }
      setMobile(digits);
      setOtp("");
      setStep("otp");
      setResendIn(RESEND_SECONDS);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send OTP.");
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    if (!isValidOtp(otp)) {
      setError("Enter the 6-digit OTP sent to your mobile.");
      return;
    }
    // Defence in depth: the only path to a session is a server-verified OTP.
    if (!isApiEnabled()) {
      setError(API_UNAVAILABLE);
      return;
    }

    setError("");
    setLoading(true);
    try {
      const res = await api.verifyOtp(mobile, otp);
      setApiToken(res.token);
      const session: AuthSession = {
        mobile: res.user.mobile,
        name: res.user.name,
        initials: res.user.role === "admin" ? "AD" : "EZ",
        signedInAt: new Date().toISOString(),
        // Role is whatever the server says it is, and nothing else.
        role: res.user.role === "admin" ? "admin" : "customer",
      };
      setSession(session);
      const staffRole = asStaffRole(res.user.staffRole);
      if (staffRole) setStaffRole(staffRole);
      else clearStaffRole();
      router.push(destination(session));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP.");
      // Send focus back to the first cell so a retype starts from the left.
      setOtpFocusSignal((n) => n + 1);
    } finally {
      setLoading(false);
    }
  }

  const continueHref = existingSession ? destination(existingSession) : "/account";
  const continueLabel = existingSession && isAdminSession(existingSession) ? "Continue to admin" : "Continue to account";

  return (
    <main className="auth-page min-h-[100dvh] bg-[var(--ez-warm-surface)] lg:grid lg:grid-cols-[minmax(0,1.08fr)_minmax(420px,.92fr)]">
      <BrandPanel />

      <section className="auth-form-panel relative flex min-h-[calc(100dvh-20rem)] items-center overflow-hidden border-t border-[var(--ez-border)] bg-white px-5 py-10 sm:px-8 sm:py-14 lg:min-h-screen lg:border-t-0 lg:border-l lg:px-[clamp(2.5rem,6vw,5.5rem)]">
        <div aria-hidden="true" className="auth-form-grid absolute inset-0" />
        <div className="relative mx-auto w-full max-w-[26rem]">
          <Link
            href="/"
            className="auth-back-link mb-10 inline-flex items-center gap-2 ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ez-subtle)] transition-colors hover:!text-[var(--ez-ink)]"
          >
            <span aria-hidden="true">←</span> Storefront
          </Link>

          {!sessionReady || (isApiEnabled() && installGate === "unknown") ? (
            <div className="ez-mono text-xs uppercase tracking-[0.16em] text-[var(--ez-subtle)] animate-pulse">
              Checking…
            </div>
          ) : installGate === "needsSetup" ? (
            // Nobody owns this store yet. OTP would go to a log file on a fresh
            // install, so the form is hidden entirely — setup is the only path.
            <div className="auth-form-body">
              <div className="mb-8">
                <span className="ez-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#9A3412]">
                  Not set up yet
                </span>
                <h2 className="mt-5 text-[clamp(1.75rem,3vw,2.35rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ez-ink)]">
                  Set up this store first
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--ez-muted)] sm:text-sm">
                  There is no owner account yet. Setup takes a minute and signs you
                  straight in — a sign-in code cannot reach anyone until then.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  href="/setup"
                  className="auth-submit inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-[10px] bg-[var(--ez-ink)] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#2a2a2d] hover:text-white"
                >
                  Start setup <span aria-hidden="true" className="text-white/70">→</span>
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    setInstallGate("unknown");
                    api
                      .installState()
                      .then((s) => setInstallGate(s.needsSetup ? "needsSetup" : "claimed"))
                      .catch(() => setInstallGate("needsSetup"));
                  }}
                  className="inline-flex min-h-[2.75rem] items-center justify-center rounded-[10px] text-sm font-semibold text-[var(--ez-muted)] transition hover:text-[var(--ez-ink)]"
                >
                  Retry check
                </button>
                {existingSession ? (
                  <>
                    <Link
                      href={continueHref}
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-[10px] border border-[var(--ez-border)] bg-white px-5 text-sm font-semibold text-[var(--ez-muted)] transition hover:border-[#d2d2d7] hover:text-[var(--ez-ink)]"
                    >
                      {continueLabel}
                    </Link>
                    <button
                      type="button"
                      onClick={signOutExisting}
                      className="inline-flex min-h-[3rem] items-center justify-center rounded-[10px] border border-[var(--ez-border)] bg-white px-5 text-sm font-semibold text-[var(--ez-muted)] transition hover:border-[#d2d2d7] hover:text-[var(--ez-ink)]"
                    >
                      Sign out
                    </button>
                  </>
                ) : null}
              </div>
            </div>
          ) : existingSession ? (
            <div className="auth-form-body">
              <div className="mb-8">
                <div className="flex items-center gap-2.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--ez-accent)]" aria-hidden="true" />
                  <span className="ez-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[var(--ez-accent-text)]">
                    Active session
                  </span>
                </div>
                <h2 className="mt-5 text-[clamp(1.75rem,3vw,2.35rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ez-ink)]">
                  You&apos;re already signed in
                </h2>
                <p className="mt-3 text-[13px] leading-relaxed text-[var(--ez-muted)] sm:text-sm">
                  Continue as {existingSession.name} ({formatMobileDisplay(existingSession.mobile)})
                  {isAdminSession(existingSession) ? " · Admin" : ""}, or sign out to use a different number.
                </p>
              </div>

              <div className="flex flex-col gap-2.5">
                <Link
                  href={continueHref}
                  className="auth-submit inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-[10px] bg-[var(--ez-ink)] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[#2a2a2d] hover:text-white"
                >
                  {continueLabel} <span aria-hidden="true" className="text-white/70">→</span>
                </Link>
                <button
                  type="button"
                  onClick={signOutExisting}
                  className="inline-flex min-h-[3rem] items-center justify-center rounded-[10px] border border-[var(--ez-border)] bg-white px-5 text-sm font-semibold text-[var(--ez-muted)] transition hover:border-[#d2d2d7] hover:text-[var(--ez-ink)]"
                >
                  Sign out
                </button>
              </div>
            </div>
          ) : (
            <div className="auth-form-body">
            <div className="mb-8">
              <AuthStepIndicator step={step} />
              <h2 className="mt-6 text-[clamp(1.75rem,3vw,2.35rem)] font-semibold leading-[1.02] tracking-[-0.045em] text-[var(--ez-ink)]">
                {step === "mobile" ? "Enter your mobile number" : "Enter verification code"}
              </h2>
              <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--ez-muted)] sm:text-sm">
                {step === "mobile"
                  ? "No password needed. We'll send a six-digit code to get you in."
                  : `We sent a six-digit code to ${maskMobile(mobile)}.`}
              </p>
            </div>

            {step === "mobile" ? (
              <form
                className="flex flex-col gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendOtp();
                }}
              >
                <div className="flex flex-col gap-2">
                  <label htmlFor="auth-mobile" className="ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ez-muted)]">
                    Mobile number
                  </label>
                  <div className="auth-input-group flex overflow-hidden rounded-[10px] border border-[var(--ez-border)] bg-[var(--ez-warm-surface)] transition-[border-color,box-shadow,background-color] focus-within:border-[var(--ez-accent)] focus-within:bg-white focus-within:shadow-[0_0_0_3px_oklch(0.55_0.17_var(--ez-h)_/_0.1)]">
                    <span className="ez-mono flex shrink-0 items-center border-r border-[var(--ez-border)] bg-white/60 px-3.5 text-[13px] font-bold text-[var(--ez-soft-ink)]">
                      +91
                    </span>
                    <input
                      id="auth-mobile"
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="98765 43210"
                      value={mobile}
                      onChange={(event) => {
                        setMobile(normalizeMobile(event.target.value));
                        setError("");
                      }}
                      // A red panel below the field says nothing to a screen
                      // reader unless the field itself is marked invalid and
                      // linked to the message that explains why.
                      aria-invalid={error ? true : undefined}
                      aria-describedby={error ? "auth-error" : undefined}
                      className="min-w-0 flex-1 border-none bg-transparent px-3.5 py-3.5 text-[15px] font-medium tracking-[0.01em] text-[var(--ez-ink)] outline-none"
                    />
                  </div>
                  <p className="m-0 text-[12px] text-[var(--ez-subtle)]">
                    We&apos;ll only use this for your sign-in code.
                  </p>
                </div>

                {error && (
                  <p id="auth-error" role="alert" className="auth-error m-0 rounded-[10px] border border-[#f5c2c0] bg-[#fff5f5] px-3.5 py-2.5 text-[13px] text-[#b42318]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-[10px] bg-[var(--ez-ink)] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[var(--ez-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending OTP…" : <>Continue <span aria-hidden="true" className="text-white/70">→</span></>}
                </button>
              </form>
            ) : (
              <form
                className="flex flex-col gap-6"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verifyOtp();
                }}
              >
                <OtpBoxes
                  value={otp}
                  disabled={loading}
                  focusSignal={otpFocusSignal}
                  onChange={(next) => {
                    setOtp(next);
                    setError("");
                  }}
                />

                {error && (
                  <p id="auth-error" role="alert" className="auth-error m-0 rounded-[10px] border border-[#f5c2c0] bg-[#fff5f5] px-3.5 py-2.5 text-[13px] text-[#b42318]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit inline-flex min-h-[3.25rem] items-center justify-center gap-2.5 rounded-[10px] bg-[var(--ez-ink)] px-5 text-sm font-semibold text-white transition hover:-translate-y-px hover:bg-[var(--ez-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying…" : <>Verify & continue <span aria-hidden="true" className="text-white/70">→</span></>}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ez-border)] pt-4 text-[13px]">
                  <button
                    type="button"
                    className="font-medium text-[var(--ez-muted)] transition hover:text-[var(--ez-ink)]"
                    onClick={() => {
                      setStep("mobile");
                      setOtp("");
                      setError("");
                    }}
                  >
                    Change number
                  </button>
                  <button
                    type="button"
                    disabled={loading || resendIn > 0}
                    className="font-semibold text-[var(--ez-accent-text)] transition hover:text-[var(--ez-ink)] disabled:text-[var(--ez-subtle)]"
                    onClick={() => void sendOtp(mobile)}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>

                <p className="m-0 text-center ez-mono text-[11px] text-[var(--ez-subtle)]">
                  Signing in as {formatMobileDisplay(mobile)}
                </p>
              </form>
            )}

            <p className="auth-legal mt-8 text-center ez-mono text-[10px] leading-relaxed tracking-[0.02em] text-[var(--ez-subtle)]">
              By continuing, you agree to receive a one-time sign-in SMS from Ezurr.
            </p>
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

export default function AuthPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-[100dvh] bg-[var(--ez-warm-surface)] flex items-center justify-center">
          <div className="ez-mono text-xs uppercase tracking-[0.16em] text-[var(--ez-subtle)] animate-pulse">
            Loading Auth Gate…
          </div>
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
