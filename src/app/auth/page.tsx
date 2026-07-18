"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { CheckoutHeader } from "@/components/layout/Header";
import {
  createSession,
  formatMobileDisplay,
  getSession,
  isValidMobile,
  isValidOtp,
  maskMobile,
  normalizeMobile,
  setSession,
} from "@/lib/auth";

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
    <div className="flex justify-between gap-2 sm:gap-3" role="group" aria-label="One-time password">
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
          className="ez-checkout-input h-14 w-full max-w-[56px] rounded-xl text-center ez-mono text-xl font-bold text-[#1D1D1F] outline-none sm:h-16 sm:max-w-[64px] sm:text-2xl"
        />
      ))}
    </div>
  );
}

export default function AuthPage() {
  const router = useRouter();
  const [step, setStep] = useState<"mobile" | "otp">("mobile");
  const [mobile, setMobile] = useState("");
  const [otp, setOtp] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendIn, setResendIn] = useState(0);

  useEffect(() => {
    if (getSession()) router.replace("/account");
  }, [router]);

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = window.setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  async function sendOtp(nextMobile = mobile) {
    const digits = normalizeMobile(nextMobile);
    if (!isValidMobile(digits)) {
      setError("Enter a valid 10-digit mobile number.");
      return;
    }

    setError("");
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setMobile(digits);
    setOtp("");
    setStep("otp");
    setResendIn(RESEND_SECONDS);
    setLoading(false);
  }

  async function verifyOtp() {
    if (!isValidOtp(otp)) {
      setError("Enter the 6-digit OTP sent to your mobile.");
      return;
    }

    setError("");
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 700));
    setSession(createSession(mobile));
    router.push("/account");
  }

  return (
    <div className="ez-checkout-bg min-h-screen">
      <CheckoutHeader label="Secure login · OTP" shortLabel="Secure · OTP" />

      <main className="ez-page py-8 sm:py-10 lg:py-14">
        <div className="mx-auto grid max-w-[980px] gap-6 lg:grid-cols-[1.05fr_0.95fr] lg:items-stretch lg:gap-8">
          <aside className="ez-checkout-summary hidden overflow-hidden rounded-[28px] p-8 text-white lg:flex lg:flex-col lg:justify-between lg:p-10">
            <div>
              <span className="ez-section-kicker !text-white/45">Ezurr Play HQ</span>
              <h1 className="mt-4 text-[clamp(2.4rem,4vw,3.6rem)] font-semibold leading-[0.98] tracking-[-0.05em]">
                Sign in with your mobile.
              </h1>
              <p className="mt-5 max-w-[360px] text-[15px] leading-relaxed text-white/55">
                No passwords. We send a one-time code so you can track pre-orders, wishlist, and delivery updates securely.
              </p>
            </div>
            <ul className="mt-12 space-y-4">
              {[
                "OTP delivered instantly to your phone",
                "Secure session for account & checkout",
                "No email required to get started",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3 text-sm text-white/70">
                  <span
                    aria-hidden="true"
                    className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[11px]"
                  >
                    ✓
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </aside>

          <section className="ez-checkout-panel rounded-[28px] p-6 sm:p-8 lg:p-10">
            <div className="mb-8">
              <span className="ez-section-kicker">
                {step === "mobile" ? "Step 1 of 2" : "Step 2 of 2"}
              </span>
              <h2 className="mt-3 text-[clamp(1.8rem,3vw,2.4rem)] font-semibold tracking-[-0.04em] text-[#1D1D1F]">
                {step === "mobile" ? "Enter your mobile number" : "Enter the OTP"}
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#6E6E73] sm:text-[15px]">
                {step === "mobile"
                  ? "We’ll text you a 6-digit verification code."
                  : `Sent to ${maskMobile(mobile)}. Demo accepts any 6-digit code.`}
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
                  <label className="ez-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#86868B]">
                    Mobile no.
                  </label>
                  <div className="ez-checkout-input flex overflow-hidden rounded-xl">
                    <span className="ez-mono flex shrink-0 items-center border-r border-[#E3E3E8] bg-[#F0F0F4] px-3.5 text-[13px] font-medium text-[#424245]">
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
                      className="min-w-0 flex-1 border-none bg-transparent px-4 py-3.5 text-[15px] outline-none"
                    />
                  </div>
                  <p className="m-0 text-[12px] text-[#86868B]">
                    OTP and account alerts will be sent to this number.
                  </p>
                </div>

                {error && (
                  <p className="m-0 rounded-xl border border-[#F5C2C0] bg-[#FFF5F5] px-4 py-3 text-sm text-[#B42318]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="ez-checkout-btn-dark inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "Sending OTP…" : "Continue"}
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
                  onChange={(next) => {
                    setOtp(next);
                    setError("");
                  }}
                />

                {error && (
                  <p className="m-0 rounded-xl border border-[#F5C2C0] bg-[#FFF5F5] px-4 py-3 text-sm text-[#B42318]">
                    {error}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="ez-checkout-btn-dark inline-flex min-h-12 items-center justify-center rounded-full px-6 text-sm font-semibold disabled:opacity-60"
                >
                  {loading ? "Verifying…" : "Verify & continue"}
                </button>

                <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                  <button
                    type="button"
                    className="font-medium text-[#424245] hover:text-[#1D1D1F]"
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
                    className="font-semibold text-[var(--ez-accent-text)] disabled:text-[#AEAEB2]"
                    onClick={() => void sendOtp(mobile)}
                  >
                    {resendIn > 0 ? `Resend in ${resendIn}s` : "Resend OTP"}
                  </button>
                </div>

                <p className="m-0 text-center text-[12px] text-[#86868B]">
                  Signing in as {formatMobileDisplay(mobile)}
                </p>
              </form>
            )}

            <p className="mt-8 border-t border-black/[0.06] pt-6 text-center text-[12px] leading-relaxed text-[#86868B]">
              By continuing, you agree to receive a one-time SMS from Ezurr.{" "}
              <Link href="/" className="font-semibold text-[#1D1D1F] hover:!text-[#1D1D1F]">
                Back to store
              </Link>
            </p>
          </section>
        </div>
      </main>
    </div>
  );
}
