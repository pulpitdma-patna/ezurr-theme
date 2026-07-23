"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import {
  clearSession,
  createSession,
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
import { api, isApiEnabled, setApiToken } from "@/lib/apiClient";

const RESEND_SECONDS = 30;

function OtpBoxes({
  value,
  onChange,
  disabled,
}: {
  value: string;
  onChange: (next: string) => void;
  disabled?: boolean;
}) {
  const refs = useRef<Array<HTMLInputElement | null>>([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

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

    if (cleaned.length > 1) {
      commit(cleaned);
      const focusIndex = Math.min(cleaned.length, 5);
      refs.current[focusIndex]?.focus();
      return;
    }

    const next = value.padEnd(6, " ").split("");
    next[index] = cleaned;
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
    <div className="auth-otp-grid flex justify-between gap-2.5 sm:gap-3" role="group" aria-label="One-time password">
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
          className="h-[3.8rem] w-full max-w-[57px] rounded-[1rem] border border-[#dde0e8] bg-[#f8f9fb] text-center ez-mono text-xl font-bold text-[#17191f] outline-none transition-[border-color,box-shadow,transform,background-color] duration-200 placeholder:text-[#c5c8d1] hover:border-[#babfca] focus:border-[var(--ez-accent)] focus:bg-white focus:shadow-[0_0_0_4px_oklch(0.55_0.17_var(--ez-h)_/_0.12)] sm:h-[4.15rem] sm:max-w-[65px] sm:text-2xl"
        />
      ))}
    </div>
  );
}

function BrandPanel() {
  return (
    <aside className="auth-brand-panel relative isolate overflow-hidden bg-[#070b13] text-white">
      <Image
        src="/images/hero-handheld-cyan.png"
        alt=""
        fill
        priority
        sizes="(min-width: 1024px) 55vw, 100vw"
        className="auth-brand-image object-cover object-[67%_center]"
      />
      <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(3,7,13,.94)_0%,rgba(3,7,13,.76)_38%,rgba(3,7,13,.18)_100%),linear-gradient(0deg,rgba(3,7,13,.88)_0%,transparent_54%,rgba(3,7,13,.18)_100%)]" />
      <div aria-hidden="true" className="auth-grain absolute inset-0" />
      <div aria-hidden="true" className="auth-orb absolute -left-20 top-[18%] h-64 w-64 rounded-full bg-[var(--ez-accent)] blur-3xl" />

      <div className="relative flex min-h-[23rem] flex-col justify-between p-6 sm:min-h-[27rem] sm:p-9 lg:min-h-screen lg:p-10 xl:p-14">
        <Link href="/" className="group relative z-10 flex w-fit items-baseline gap-2.5">
          <span className="text-[1.7rem] font-semibold tracking-[-0.06em]">Ezurr</span>
          <span className="ez-mono text-[9px] font-bold uppercase tracking-[0.2em] text-white/55 transition-colors group-hover:text-white">
            Play HQ
          </span>
        </Link>

        <div className="auth-console-scene pointer-events-none absolute bottom-7 right-6 hidden w-[42%] min-w-48 sm:right-10 sm:block lg:bottom-12 lg:right-14">
          <div className="aspect-[1.15] rotate-[-8deg] rounded-[2rem] border border-white/25 bg-[linear-gradient(145deg,rgba(255,255,255,.24),rgba(255,255,255,.03)_45%,rgba(0,0,0,.5))] p-2 shadow-[0_25px_70px_rgba(0,0,0,.44)] backdrop-blur-sm">
            <div className="relative h-full overflow-hidden rounded-[1.55rem] border border-white/15 bg-[#060a10]">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_22%_28%,var(--ez-accent),transparent_22%),linear-gradient(135deg,#16233a,#06080d_62%)]" />
              <div className="absolute inset-x-[12%] top-[16%] flex items-center justify-between ez-mono text-[7px] font-bold uppercase tracking-[.24em] text-white/65">
                <span>Live</span><span>00:01</span>
              </div>
              <div className="absolute bottom-[14%] left-[12%] text-[clamp(1.1rem,2.5vw,2.25rem)] font-semibold leading-[.87] tracking-[-.07em]">PLAY<br />BEYOND.</div>
              <div className="absolute bottom-[15%] right-[12%] h-7 w-7 rounded-full border border-white/25 bg-white/10" />
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-auto max-w-[35rem] pt-16 lg:pb-8">
          <p className="auth-kicker ez-mono text-[10px] font-bold uppercase tracking-[0.22em] text-white/58">The home of play</p>
          <h1 className="mt-4 max-w-md text-[clamp(3.25rem,6vw,6.35rem)] font-semibold leading-[0.84] tracking-[-0.08em]">
            Ezurr<br />
            <span className="text-white/92">Play HQ.</span>
          </h1>
          <div className="mt-7 flex items-center gap-3">
            <span className="h-px w-10 bg-[var(--ez-accent)]" />
            <p className="max-w-[20rem] text-sm leading-relaxed text-white/66 sm:text-[15px]">
              Games, gear and the next drop—ready when you are.
            </p>
          </div>
        </div>
      </div>
    </aside>
  );
}

function safeNextPath(raw: string | null) {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return null;
  return raw;
}

function AuthPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);
  const [existingSession, setExistingSession] = useState<AuthSession | null>(null);
  const [sessionReady, setSessionReady] = useState(false);

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

    setError("");
    setLoading(true);
    try {
      if (isApiEnabled()) {
        const res = await api.sendOtp(digits);
        if (res.devCode) {
          // Local Laravel returns fixed OTP for demos
          console.info("[ezurr-api] dev OTP", res.devCode);
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));
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

    setError("");
    setLoading(true);
    try {
      if (isApiEnabled()) {
        const res = await api.verifyOtp(mobile, otp);
        setApiToken(res.token);
        const session: AuthSession = {
          mobile: res.user.mobile,
          name: res.user.name,
          initials: res.user.role === "admin" ? "AD" : "EZ",
          signedInAt: new Date().toISOString(),
          role: res.user.role === "admin" ? "admin" : "customer",
        };
        setSession(session);
        router.push(destination(session));
      } else {
        await new Promise((resolve) => setTimeout(resolve, 700));
        const session = createSession(mobile);
        setSession(session);
        router.push(destination(session));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid OTP.");
    } finally {
      setLoading(false);
    }
  }

  const continueHref = existingSession ? destination(existingSession) : "/account";
  const continueLabel = existingSession && isAdminSession(existingSession) ? "Continue to admin" : "Continue to account";

  return (
    <main className="auth-page min-h-[100dvh] bg-[#f5f6fa] lg:grid lg:grid-cols-[minmax(0,1.12fr)_minmax(440px,.88fr)]">
      <BrandPanel />

      <section className="relative flex min-h-[calc(100dvh-23rem)] items-center overflow-hidden bg-[#fbfbfc] px-5 py-10 sm:px-8 sm:py-14 lg:min-h-screen lg:px-[clamp(3rem,7vw,8rem)]">
        <div aria-hidden="true" className="auth-form-wash absolute right-[-10rem] top-[-11rem] h-[27rem] w-[27rem] rounded-full bg-[var(--ez-accent)] opacity-[.07] blur-3xl" />
        <div aria-hidden="true" className="absolute right-8 top-8 hidden h-12 w-12 border-r border-t border-[#e1e3e9] lg:block" />
        <div className="relative mx-auto w-full max-w-[28rem]">
          <Link href="/" className="mb-12 inline-flex items-center gap-2 ez-mono text-[10px] font-bold uppercase tracking-[.15em] text-[#777c89] transition-colors hover:!text-[#17191f]">
            <span aria-hidden="true">←</span> Storefront
          </Link>

          {!sessionReady ? (
            <div className="ez-mono text-xs uppercase tracking-[0.16em] text-[#86868B] animate-pulse">
              Checking session…
            </div>
          ) : existingSession ? (
            <>
              <div className="mb-9">
                <div className="flex items-center gap-3">
                  <span className="ez-mono text-[10px] font-bold uppercase tracking-[.18em] text-[var(--ez-accent-text)]">
                    Signed in
                  </span>
                  <span className="h-px flex-1 bg-[#e0e2e8]" />
                </div>
                <h2 className="mt-7 text-[clamp(2.3rem,3.4vw,3.25rem)] font-semibold leading-[.92] tracking-[-0.07em] text-[#17191f]">
                  You&apos;re already signed in
                </h2>
                <p className="mt-3.5 text-sm leading-relaxed text-[#666b78] sm:text-[15px]">
                  Continue as {existingSession.name} ({formatMobileDisplay(existingSession.mobile)})
                  {isAdminSession(existingSession) ? " · Admin" : ""}, or sign out to use a different number.
                </p>
              </div>

              <div className="flex flex-col gap-3">
                <Link
                  href={continueHref}
                  className="auth-submit inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#171920] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(20,22,30,.16)] transition hover:-translate-y-0.5 hover:bg-[var(--ez-accent)] hover:text-white"
                >
                  {continueLabel} <span aria-hidden="true">→</span>
                </Link>
                <button
                  type="button"
                  onClick={signOutExisting}
                  className="inline-flex min-h-12 items-center justify-center rounded-full border border-[#d9dce4] bg-white px-6 text-sm font-semibold text-[#555b68] transition hover:border-[#babfca] hover:text-[#17191f]"
                >
                  Sign out
                </button>
              </div>
            </>
          ) : (
            <>
            <div className="mb-9">
              <div className="flex items-center gap-3">
                <span className="ez-mono text-[10px] font-bold uppercase tracking-[.18em] text-[var(--ez-accent-text)]">
                  {step === "mobile" ? "Sign in · 01" : "Verify · 02"}
                </span>
                <span className="h-px flex-1 bg-[#e0e2e8]" />
                <span className="ez-mono text-[9px] font-bold tracking-[.12em] text-[#9b9faa]">02</span>
              </div>
              <div className="auth-progress-track mt-4" aria-hidden="true">
                <span className={step === "otp" ? "auth-progress-fill is-complete" : "auth-progress-fill"} />
              </div>
              <h2 className="mt-7 text-[clamp(2.3rem,3.4vw,3.25rem)] font-semibold leading-[.92] tracking-[-0.07em] text-[#17191f]">
                {step === "mobile" ? "Enter your mobile number" : "Enter the OTP"}
              </h2>
              <p className="mt-3.5 text-sm leading-relaxed text-[#666b78] sm:text-[15px]">
                {step === "mobile"
                  ? "No password needed. We’ll send a six-digit code to get you in."
                  : `We sent a six-digit code to ${maskMobile(mobile)}.`}
              </p>
            </div>

            {step === "mobile" ? (
              <form
                className="flex flex-col gap-7"
                onSubmit={(event) => {
                  event.preventDefault();
                  void sendOtp();
                }}
              >
                <div className="flex flex-col gap-2.5">
                  <label className="ez-mono text-[10px] font-bold uppercase tracking-[0.16em] text-[#686d7c]">
                    Mobile no.
                  </label>
                  <div className="flex overflow-hidden rounded-[1rem] border border-[#d9dce4] bg-white shadow-[0_1px_2px_rgba(17,24,39,.02)] transition-[border-color,box-shadow,background-color] focus-within:border-[var(--ez-accent)] focus-within:shadow-[0_0_0_4px_oklch(0.55_0.17_var(--ez-h)_/_0.12)]">
                    <span className="ez-mono flex shrink-0 items-center border-r border-[#e5e7ec] bg-[#f5f6f8] px-4 text-[13px] font-bold text-[#4e5462]">
                      +91
                    </span>
                    <input
                      type="tel"
                      inputMode="numeric"
                      autoComplete="tel-national"
                      placeholder="98765 43210"
                      value={mobile}
                      onChange={(event) => {
                        setMobile(normalizeMobile(event.target.value));
                        setError("");
                      }}
                      className="min-w-0 flex-1 border-none bg-transparent px-4 py-4 text-[15px] font-medium tracking-[.01em] text-[#17191f] outline-none"
                    />
                  </div>
                  <p className="m-0 pl-1 text-[12px] text-[#7d8290]">
                    We’ll only use this for your sign-in code.
                  </p>
                  <p className="m-0 mt-1 border-l-2 border-[var(--ez-accent)] px-3 py-1 text-[11px] leading-relaxed text-[#777c89]">
                    <span className="font-semibold text-[#4a505d]">Demo access:</span> numbers ending in <span className="ez-mono font-bold text-[#323744]">0000</span> open Admin.
                  </p>
                </div>

                {error && (
                  <p className="m-0 rounded-xl border border-[#f5c2c0] bg-[#fff5f5] px-4 py-3 text-sm text-[#b42318]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#171920] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(20,22,30,.16)] transition hover:-translate-y-0.5 hover:bg-[var(--ez-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Sending OTP…" : <>Continue <span aria-hidden="true">→</span></>}
                </button>
              </form>
            ) : (
              <form
                className="flex flex-col gap-7"
                onSubmit={(event) => {
                  event.preventDefault();
                  void verifyOtp();
                }}
              >
                <OtpBoxes
                  value={otp}
                  disabled={loading}
                  onChange={(next) => {
                    setOtp(next);
                    setError("");
                  }}
                />

                {error && (
                  <p className="m-0 rounded-xl border border-[#f5c2c0] bg-[#fff5f5] px-4 py-3 text-sm text-[#b42318]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="auth-submit inline-flex min-h-14 items-center justify-center gap-3 rounded-full bg-[#171920] px-6 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(20,22,30,.16)] transition hover:-translate-y-0.5 hover:bg-[var(--ez-accent)] hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Verifying…" : <>Verify & continue <span aria-hidden="true">→</span></>}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#e4e6eb] pt-5 text-sm">
                  <button
                    type="button"
                    className="font-medium text-[#555b68] transition hover:text-[#17191f]"
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
                    className="font-semibold text-[var(--ez-accent-text)] transition hover:text-[#17191f] disabled:text-[#aeb1bc]"
                    onClick={() => void sendOtp(mobile)}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>

                <p className="m-0 text-center text-[12px] text-[#7c818e]">
                  Signing in as {formatMobileDisplay(mobile)}
                </p>
              </form>
            )}

            <p className="mt-10 text-center text-[11px] leading-relaxed text-[#858a96]">
              By continuing, you agree to receive a one-time sign-in SMS from Ezurr.
            </p>
            </>
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
        <main className="min-h-[100dvh] bg-[#f5f6fa] flex items-center justify-center">
          <div className="ez-mono text-xs uppercase tracking-[0.16em] text-[#86868B] animate-pulse">
            Loading Auth Gate…
          </div>
        </main>
      }
    >
      <AuthPageContent />
    </Suspense>
  );
}
