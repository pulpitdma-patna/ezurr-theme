"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { CheckoutHeader } from "@/components/layout/Header";
import { CountdownBoxes, CountdownSummaryPanel } from "@/components/ui/Countdown";
import { theme } from "@/lib/theme";

const PRICE = 5999;

function fmt(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

const STEPS = [
  { num: 1, label: "Details" },
  { num: 2, label: "Payment" },
  { num: 3, label: "Review" },
] as const;

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="ez-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#86868B]">
      {children}
    </label>
  );
}

function CheckoutInput({
  type = "text",
  placeholder,
  className = "",
}: {
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      className={`ez-checkout-input w-full rounded-xl px-4 py-3.5 text-[15px] text-[#1D1D1F] ${className}`}
    />
  );
}

function MobileInput() {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>Mobile no.</FieldLabel>
      <div className="ez-checkout-input flex overflow-hidden rounded-xl">
        <span className="ez-mono flex shrink-0 items-center border-r border-[#E3E3E8] bg-[#F0F0F4] px-3.5 text-[13px] font-medium text-[#424245]">
          +91
        </span>
        <input
          type="tel"
          inputMode="numeric"
          placeholder="98765 43210"
          className="min-w-0 flex-1 border-none bg-transparent px-4 py-3.5 text-[15px] outline-none"
        />
      </div>
      <p className="m-0 text-[12px] text-[#86868B]">
        Order updates and OTP will be sent to this number.
      </p>
    </div>
  );
}

function Stepper({ step }: { step: number }) {
  return (
    <div className="flex items-center gap-0">
      {STEPS.map(({ num, label }, i) => {
        const done = step > num;
        const active = step === num;
        return (
          <div key={num} className="flex flex-1 items-center">
            {i > 0 && (
              <span
                className="h-px flex-1 transition-colors duration-300"
                style={{
                  background: done || active ? "var(--ez-accent)" : "#E3E3E8",
                }}
              />
            )}
            <div className="flex shrink-0 items-center gap-2 px-1 sm:px-2">
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-full ez-mono text-[11px] font-medium transition-all duration-300 sm:h-8 sm:w-8"
                style={{
                  background: done
                    ? "var(--ez-accent-soft)"
                    : active
                      ? "#1D1D1F"
                      : "#FFFFFF",
                  color: done
                    ? "var(--ez-accent-soft-text)"
                    : active
                      ? "#FFFFFF"
                      : "#86868B",
                  border: `1.5px solid ${
                    done
                      ? "var(--ez-accent-panel-border)"
                      : active
                        ? "#1D1D1F"
                        : "#D2D2D7"
                  }`,
                  boxShadow: active ? "0 4px 12px rgba(0,0,0,0.15)" : "none",
                }}
              >
                {done ? "✓" : num}
              </span>
              <span
                className="hidden text-[13px] font-semibold sm:inline"
                style={{ color: active ? "#1D1D1F" : done ? "#6E6E73" : "#86868B" }}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <span
                className="h-px flex-1 transition-colors duration-300"
                style={{
                  background: step > num ? "var(--ez-accent)" : "#E3E3E8",
                }}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function OrderSummary({
  isPrepaid,
  pct,
  discount,
  lockedTotal,
}: {
  isPrepaid: boolean;
  pct: number;
  discount: number;
  lockedTotal: string;
}) {
  return (
    <aside className="ez-checkout-summary relative order-1 flex flex-col gap-5 overflow-hidden rounded-3xl p-6 text-[#F5F5F7] sm:p-7 lg:order-2 lg:sticky lg:top-8">
      <div className="pointer-events-none absolute inset-0 opacity-40" aria-hidden>
        <div
          className="absolute -right-16 -top-16 h-48 w-48 rounded-full blur-3xl"
          style={{ background: "oklch(0.55 0.17 var(--ez-h))" }}
        />
      </div>

      <div className="relative flex items-center gap-4">
        <div className="relative h-[72px] w-[88px] shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-1">
          <Image
            src="https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533"
            alt="GTA VI"
            fill
            className="object-contain"
            sizes="88px"
          />
        </div>
        <div className="flex min-w-0 flex-col gap-1">
          <span className="truncate text-[17px] font-semibold tracking-[-0.01em]">
            Grand Theft Auto VI
          </span>
          <span className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#A1A1A6]">
            PS5 · Standard · Pre-order
          </span>
        </div>
      </div>

      <div className="relative h-px bg-white/10" />

      <div className="relative flex flex-col gap-3 text-[14px]">
        <div className="flex justify-between gap-4">
          <span className="text-[#A1A1A6]">GTA VI · Standard Edition</span>
          <span className="ez-mono shrink-0 text-[13px]">₹5,999</span>
        </div>
        {isPrepaid && (
          <div className="flex justify-between gap-4">
            <span className="text-[#A1A1A6]">Prepaid discount ({pct}%)</span>
            <span className="ez-mono shrink-0 text-[13px] text-[#7DD99A]">
              −{fmt(discount)}
            </span>
          </div>
        )}
        <div className="flex justify-between gap-4">
          <span className="text-[#A1A1A6]">Shipping</span>
          <span className="ez-mono shrink-0 text-[13px] text-[#7DD99A]">FREE</span>
        </div>
        <div className="flex justify-between gap-4">
          <span className="text-[#A1A1A6]">
            {isPrepaid ? "Charged on release day" : "Pay on delivery"}
          </span>
          <span className="ez-mono shrink-0 text-[13px]">{lockedTotal}</span>
        </div>
      </div>

      <div className="relative h-px bg-white/10" />

      <div className="relative flex items-baseline justify-between">
        <span className="text-[15px] font-semibold text-[#E8E8ED]">Due today</span>
        <span className="ez-mono text-2xl font-bold tracking-tight">₹0</span>
      </div>

      <CountdownSummaryPanel />

      <div className="relative flex items-start gap-2.5 rounded-2xl border border-[oklch(0.78_0.1_var(--ez-h)/0.25)] bg-[oklch(0.55_0.17_var(--ez-h)/0.12)] px-4 py-3">
        <span className="mt-0.5 text-[var(--ez-accent-text)]">◆</span>
        <p className="m-0 text-[12.5px] leading-relaxed text-[#C7C7CC]">
          Minimum price guarantee — if the price drops before release, the
          difference is refunded automatically.
        </p>
      </div>
    </aside>
  );
}

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [placed, setPlaced] = useState(false);
  const [method, setMethod] = useState<"prepaid" | "cod">("prepaid");

  const pct = theme.prepaidDiscount;
  const isPrepaid = method === "prepaid";
  const discount = PRICE * (pct / 100);
  const prepaidTotal = fmt(PRICE - discount);
  const lockedTotal = isPrepaid ? prepaidTotal : fmt(PRICE);

  const goto = (s: number) => {
    setStep(s);
    window.scrollTo(0, 0);
  };

  if (placed) {
    return (
      <div className="ez-checkout-bg min-h-screen">
        <CheckoutHeader />
        <main className="ez-page w-full py-14 pb-20 sm:py-20">
          <div className="mx-auto flex max-w-[640px] flex-col items-center gap-6 text-center">
            <span className="ez-mono rounded-full border border-[var(--ez-accent-panel-border)] bg-white px-5 py-2 text-[10px] uppercase tracking-[0.16em] text-[var(--ez-accent-soft-text)] shadow-sm sm:text-[11px]">
              Order EZ-88412
            </span>
            <h1 className="ez-display m-0 font-bold">You&apos;re in line.</h1>
            <p className="m-0 max-w-[460px] text-base leading-relaxed text-[#6E6E73] sm:text-[16.5px]">
              Grand Theft Auto VI · PS5 is reserved at{" "}
              <span className="font-semibold text-[#1D1D1F]">{lockedTotal}, locked</span>.
              We&apos;ll text you when it ships — and sooner if the price drops in
              your favor.
            </p>
            <CountdownBoxes size="large" />
            <div className="mt-2 flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:justify-center">
              <Link
                href="/"
                className="ez-checkout-btn-dark w-full rounded-full px-8 py-3.5 text-center text-[15px] font-semibold sm:w-auto"
              >
                Back to store
              </Link>
              <button
                type="button"
                onClick={() => {
                  setPlaced(false);
                  setStep(1);
                  setMethod("prepaid");
                }}
                className="w-full rounded-full border border-[#D2D2D7] bg-white px-6 py-3.5 text-sm font-semibold text-[#424245] transition-colors hover:border-[#1D1D1F] sm:w-auto"
              >
                Restart demo
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="ez-checkout-bg min-h-screen">
      <CheckoutHeader />

      <main className="ez-page w-full py-8 pb-16 sm:py-12 sm:pb-24">
        <div className="mb-6 sm:mb-8">
          <p className="ez-mono m-0 text-[10px] uppercase tracking-[0.18em] text-[#86868B]">
            Pre-order checkout
          </p>
          <h1 className="ez-h2 m-0 mt-2 font-bold">Reserve Grand Theft Auto VI</h1>
        </div>

        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.35fr_1fr] lg:gap-8">
          <div className="ez-checkout-panel order-2 rounded-3xl p-5 sm:p-8 lg:order-1">
            <Stepper step={step} />

            <div className="mt-8 sm:mt-10">
              {step === 1 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <div>
                    <h2 className="ez-h3 m-0 font-bold">Where should it go?</h2>
                    <p className="mt-2 text-[14px] leading-relaxed text-[#6E6E73]">
                      Delivery details for your physical copy. Pay nothing until
                      release day.
                    </p>
                  </div>

                  <MobileInput />

                  <div className="flex flex-col gap-2">
                    <FieldLabel>Address</FieldLabel>
                    <CheckoutInput placeholder="Flat, street and area" />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                    {[
                      ["First name", "Arjun"],
                      ["Last name", "Mehta"],
                    ].map(([label, placeholder]) => (
                      <div key={label} className="flex flex-col gap-2">
                        <FieldLabel>{label}</FieldLabel>
                        <CheckoutInput placeholder={placeholder} />
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr] sm:gap-5">
                    {[
                      ["City", "Mumbai"],
                      ["PIN code", "400001"],
                    ].map(([label, placeholder]) => (
                      <div key={label} className="flex flex-col gap-2">
                        <FieldLabel>{label}</FieldLabel>
                        <CheckoutInput
                          placeholder={placeholder}
                          type={label === "PIN code" ? "tel" : "text"}
                        />
                      </div>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={() => goto(2)}
                    className="ez-checkout-btn-dark mt-2 w-full rounded-full border-none py-4 text-[15px] font-semibold sm:py-[17px]"
                  >
                    Continue to payment
                  </button>
                </div>
              )}

              {step === 2 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <div>
                    <h2 className="ez-h3 m-0 font-bold">How would you like to pay?</h2>
                    <p className="mt-2 text-[14px] text-[#6E6E73]">
                      Choose prepaid for 10% off, or pay at your door on delivery.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {(
                      [
                        {
                          id: "prepaid" as const,
                          title: "Prepaid · UPI or card",
                          sub: `SAVE ${pct}% — PAY ${prepaidTotal}`,
                          subClass: "text-[var(--ez-accent-soft-text)]",
                        },
                        {
                          id: "cod" as const,
                          title: "Cash on delivery",
                          sub: `PAY ${fmt(PRICE)} AT YOUR DOOR`,
                          subClass: "text-[#6E6E73]",
                        },
                      ] as const
                    ).map((opt) => {
                      const selected = method === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => setMethod(opt.id)}
                          className="cursor-pointer rounded-2xl border-[1.5px] p-4 text-left transition-all duration-200 sm:p-5"
                          style={{
                            borderColor: selected ? "var(--ez-accent)" : "#E3E3E8",
                            background: selected ? "var(--ez-accent-panel)" : "#FAFAFA",
                            boxShadow: selected
                              ? "0 0 0 3px oklch(0.55 0.17 var(--ez-h) / 0.1)"
                              : "none",
                          }}
                        >
                          <span className="block text-[15px] font-semibold">{opt.title}</span>
                          <span className={`ez-mono mt-1.5 block text-[11px] ${opt.subClass}`}>
                            {opt.sub}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="rounded-2xl border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-5 py-4 text-[13.5px] leading-relaxed text-[#424245]">
                    {isPrepaid
                      ? `Nothing is charged today. Your payment method is authorized now and charged ${prepaidTotal} (with your ${pct}% prepaid discount) when it ships on Nov 19.`
                      : `Pay ${fmt(PRICE)} in cash or UPI when it arrives at your door. Available on orders under ₹10,000.`}
                  </div>

                  {isPrepaid && (
                    <div className="flex flex-col gap-5">
                      <div className="flex flex-col gap-2">
                        <FieldLabel>UPI ID or card number</FieldLabel>
                        <CheckoutInput
                          placeholder="name@upi · 1234 5678 9012 3456"
                          className="ez-mono text-sm"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {["Expiry", "CVC"].map((label) => (
                          <div key={label} className="flex flex-col gap-2">
                            <FieldLabel>{label}</FieldLabel>
                            <CheckoutInput
                              placeholder={label === "Expiry" ? "MM / YY" : "123"}
                              className="ez-mono text-sm"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => goto(3)}
                      className="ez-checkout-btn-dark w-full rounded-full border-none py-4 text-[15px] font-semibold sm:flex-1"
                    >
                      Review order
                    </button>
                    <button
                      type="button"
                      onClick={() => goto(1)}
                      className="border-none bg-transparent py-3 text-sm font-semibold text-[#6E6E73] hover:text-[#1D1D1F]"
                    >
                      Back
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div className="flex flex-col gap-5 sm:gap-6">
                  <div>
                    <h2 className="ez-h3 m-0 font-bold">One last look</h2>
                    <p className="mt-2 text-[14px] text-[#6E6E73]">
                      Confirm your details before we lock in your pre-order.
                    </p>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#E8E8ED] bg-[#FAFAFA]">
                    {[
                      ["Item", "Grand Theft Auto VI · PS5 · Standard"],
                      ["Releases", "Nov 19, 2026"],
                      ["Ships to", "Your entered address"],
                      ["Mobile", "+91 · Your entered number"],
                      [
                        "Payment",
                        isPrepaid ? "UPI / CARD · PREPAID" : "CASH ON DELIVERY",
                      ],
                    ].map(([label, value], i, arr) => (
                      <div
                        key={label}
                        className={`flex flex-col gap-1 bg-white px-5 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:py-4 ${
                          i < arr.length - 1 ? "border-b border-[#F0F0F4]" : ""
                        }`}
                      >
                        <span className="ez-mono text-[10px] uppercase tracking-[0.14em] text-[#86868B]">
                          {label}
                        </span>
                        <span
                          className={`text-sm font-semibold sm:text-[14.5px] ${
                            label === "Payment" ? "ez-mono text-[13px]" : ""
                          }`}
                        >
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="rounded-2xl border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-5 py-4">
                    <span className="ez-mono text-[10px] uppercase tracking-[0.14em] text-[var(--ez-accent-soft-text)]">
                      Price locked at {lockedTotal}
                    </span>
                    <p className="mt-1.5 mb-0 text-[13.5px] leading-relaxed text-[#424245]">
                      If our price drops before Nov 19, you pay the lower price —
                      refunded automatically.
                    </p>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPlaced(true);
                        window.scrollTo(0, 0);
                      }}
                      className="ez-checkout-btn-dark w-full rounded-full border-none py-4 text-[15px] font-semibold sm:flex-1"
                    >
                      Place pre-order — ₹0 today
                    </button>
                    <button
                      type="button"
                      onClick={() => goto(2)}
                      className="border-none bg-transparent py-3 text-sm font-semibold text-[#6E6E73] hover:text-[#1D1D1F]"
                    >
                      Back
                    </button>
                  </div>
                  <p className="m-0 text-center text-[12.5px] text-[#86868B]">
                    Cancel anytime before dispatch. No fees, no questions.
                  </p>
                </div>
              )}
            </div>
          </div>

          <OrderSummary
            isPrepaid={isPrepaid}
            pct={pct}
            discount={discount}
            lockedTotal={lockedTotal}
          />
        </div>
      </main>
    </div>
  );
}
