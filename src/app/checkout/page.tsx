"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { CheckoutHeader } from "@/components/layout/Header";
import { CountdownBoxes, CountdownSummaryPanel } from "@/components/ui/Countdown";
import { formatInr } from "@/data/admin";
import { formatReleaseLabel, useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";
import { useAdminStore } from "@/hooks/useAdminStore";
import { createDemoCheckoutOrder } from "@/lib/adminStore";
import {
  resolveCheckoutPolicy,
  type CheckoutCarrierId,
  type CheckoutFieldKey,
  type CheckoutGateway,
} from "@/lib/checkoutRules";
import {
  formatMobileDisplay,
  getSession,
  normalizeMobile,
  isValidMobile,
  type AuthSession,
} from "@/lib/auth";

const PRICE = 5999;
const PRODUCT_IMG =
  "https://ezurr.com/cdn/shop/files/GAMPLAY540.jpg?v=1782735956&width=533";

const GATEWAY_LABELS: Record<CheckoutGateway, string> = {
  upi: "UPI",
  card: "Card",
  wallet: "Wallet",
  cod: "Cash on delivery",
};

const CHECKOUT_SESSION_KEY = "ezurr-checkout-session";

function getCheckoutSessionKey(): string {
  if (typeof window === "undefined") return "demo-session";
  try {
    let key = window.localStorage.getItem(CHECKOUT_SESSION_KEY);
    if (!key) {
      key = `cs-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      window.localStorage.setItem(CHECKOUT_SESSION_KEY, key);
    }
    return key;
  } catch {
    return "demo-session";
  }
}

function fmt(n: number) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

const STEPS = [
  { num: 1, label: "Details" },
  { num: 2, label: "Payment" },
  { num: 3, label: "Review" },
] as const;

type FormState = {
  mobile: string;
  firstName: string;
  lastName: string;
  address: string;
  city: string;
  pincode: string;
  upiId: string;
};

const EMPTY_FORM: FormState = {
  mobile: "",
  firstName: "",
  lastName: "",
  address: "",
  city: "",
  pincode: "",
  upiId: "",
};

function FieldLabel({ children, htmlFor }: { children: React.ReactNode; htmlFor?: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="ez-mono text-[10px] font-medium uppercase tracking-[0.16em] text-[#6E6E73]"
    >
      {children}
    </label>
  );
}

function CheckoutInput({
  id,
  type = "text",
  placeholder,
  value,
  onChange,
  className = "",
  required,
  inputMode,
  autoComplete,
  hasError,
}: {
  id: string;
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
  required?: boolean;
  inputMode?: React.HTMLAttributes<HTMLInputElement>["inputMode"];
  autoComplete?: string;
  hasError?: boolean;
}) {
  return (
    <input
      id={id}
      type={type}
      placeholder={placeholder}
      value={value}
      required={required}
      inputMode={inputMode}
      autoComplete={autoComplete}
      onChange={(e) => onChange(e.target.value)}
      className={`ez-checkout-input w-full rounded-[12px] px-4 py-3.5 text-[15px] text-[var(--ez-fg)] outline-none ${
        hasError ? "!border-[#B42318] !bg-[#FFF5F5]" : ""
      } ${className}`}
    />
  );
}

function CheckoutProgress({ step }: { step: number }) {
  return (
    <nav aria-label="Checkout progress" className="ez-checkout-progress">
      {STEPS.map(({ num, label }, i) => {
        const done = step > num;
        const active = step === num;
        return (
          <div key={num} className="ez-checkout-progress-item">
            {i > 0 ? (
              <span
                className={`ez-checkout-progress-line ${done || active ? "is-lit" : ""}`}
                aria-hidden
              />
            ) : null}
            <div
              className={`ez-checkout-progress-step ${active ? "is-active" : ""} ${done ? "is-done" : ""}`}
            >
              <span className="ez-checkout-progress-dot ez-mono" aria-hidden>
                {done ? "✓" : num}
              </span>
              <span className="ez-checkout-progress-label">{label}</span>
            </div>
          </div>
        );
      })}
    </nav>
  );
}

function TrustRail() {
  return (
    <ul className="ez-checkout-trust ez-mono flex flex-wrap gap-x-3 gap-y-1 text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
      <li>Cancel anytime</li>
      <li aria-hidden>·</li>
      <li>Charged on ship</li>
      <li aria-hidden>·</li>
      <li>Price match</li>
    </ul>
  );
}

function OrderSummaryRail({
  isPrepaid,
  pct,
  discount,
  lockedTotal,
  releaseLabel,
  shippingLabel,
  taxAmount,
  taxMessage,
  taxRatePct,
  dueToday,
}: {
  isPrepaid: boolean;
  pct: number;
  discount: number;
  lockedTotal: string;
  releaseLabel: string;
  shippingLabel: string;
  taxAmount: number;
  taxMessage: string | null;
  taxRatePct: number;
  dueToday: string;
}) {
  return (
    <aside className="ez-checkout-summary ez-checkout-rail-in relative hidden flex-col overflow-hidden rounded-[20px] p-6 text-[#F5F5F7] lg:sticky lg:top-8 lg:flex lg:p-7">
      <div className="relative z-[1] flex flex-col gap-6">
        <div>
          <div className="ez-mono text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
            Due today
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="ez-mono text-[44px] font-bold leading-none tracking-tight text-white">
              {dueToday}
            </span>
            <span className="pb-1 text-right text-[12px] leading-snug text-[#A1A1A6]">
              {isPrepaid
                ? `Authorize now · ${lockedTotal} on ${releaseLabel}`
                : `Pay ${lockedTotal} on delivery`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-3">
          <div className="relative h-[72px] w-[64px] shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
            <Image src={PRODUCT_IMG} alt="" fill className="object-contain p-1" sizes="64px" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-[-0.02em]">
              Grand Theft Auto VI
            </div>
            <div className="ez-mono mt-1 text-[10px] uppercase tracking-[0.12em] text-[#A1A1A6]">
              PS5 · Standard
            </div>
            <div className="ez-mono mt-2 text-[11px] text-[#C7C7CC]">Locked {lockedTotal}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 text-[13px]">
          <div className="flex justify-between gap-3">
            <span className="text-[#86868B]">Subtotal</span>
            <span className="ez-mono shrink-0 text-[#E8E8ED]">{fmt(PRICE)}</span>
          </div>
          {isPrepaid ? (
            <div className="flex justify-between gap-3">
              <span className="text-[#86868B]">Prepaid ({pct}%)</span>
              <span className="ez-mono shrink-0 text-[#8FD9A8]">−{fmt(discount)}</span>
            </div>
          ) : null}
          {taxAmount > 0 || taxMessage ? (
            <div className="flex justify-between gap-3">
              <span className="text-[#86868B]">
                {taxMessage ? "Tax" : `GST (${taxRatePct}%)`}
              </span>
              <span className="ez-mono shrink-0 text-[#E8E8ED]">
                {taxMessage ?? fmt(taxAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between gap-3">
            <span className="text-[#86868B]">Shipping</span>
            <span
              className={`ez-mono shrink-0 ${
                shippingLabel === "FREE" ? "text-[#8FD9A8]" : "text-[#E8E8ED]"
              }`}
            >
              {shippingLabel}
            </span>
          </div>
          <div className="mt-1 flex justify-between gap-3 border-t border-white/[0.1] pt-3">
            <span className="text-[#A1A1A6]">
              {isPrepaid ? "On release" : "On delivery"}
            </span>
            <span className="ez-mono shrink-0 font-semibold text-[#F5F5F7]">{lockedTotal}</span>
          </div>
        </div>

        <CountdownSummaryPanel variant="rail" />
        <TrustRail />
      </div>
    </aside>
  );
}

function MobileSummaryStrip({
  lockedTotal,
  onOpen,
}: {
  lockedTotal: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ez-checkout-mobile-strip flex w-full items-center gap-3 rounded-[14px] border border-black/[0.06] bg-white px-3 py-3 text-left lg:hidden"
    >
      <div className="relative h-12 w-[54px] shrink-0 overflow-hidden rounded-md bg-[#F0F0F4]">
        <Image src={PRODUCT_IMG} alt="" fill className="object-contain p-0.5" sizes="54px" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold tracking-[-0.01em]">GTA VI · PS5</div>
        <div className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">
          Locked {lockedTotal}
        </div>
      </div>
      <div className="text-right">
        <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">Due</div>
        <div className="ez-mono text-lg font-bold leading-none">₹0</div>
      </div>
    </button>
  );
}

function StickyFooterCta({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="ez-checkout-sticky-cta lg:hidden">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
            Due today
          </div>
          <div className="ez-mono text-lg font-bold leading-none">₹0</div>
        </div>
        <button
          type="button"
          disabled={disabled}
          onClick={onClick}
          className="ez-checkout-btn-dark shrink-0 rounded-full px-7 py-3.5 text-[14px] font-semibold disabled:opacity-50"
        >
          {label}
        </button>
      </div>
    </div>
  );
}

function MobileSummarySheet({
  open,
  onClose,
  isPrepaid,
  pct,
  discount,
  lockedTotal,
  releaseLabel,
  shippingLabel,
  taxAmount,
  taxMessage,
  dueToday,
}: {
  open: boolean;
  onClose: () => void;
  isPrepaid: boolean;
  pct: number;
  discount: number;
  lockedTotal: string;
  releaseLabel: string;
  shippingLabel: string;
  taxAmount: number;
  taxMessage: string | null;
  dueToday: string;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-black/45"
        aria-label="Close summary"
        onClick={onClose}
      />
      <div className="ez-checkout-summary absolute inset-x-0 bottom-0 max-h-[85vh] overflow-auto rounded-t-[22px] p-5 text-[#F5F5F7]">
        <div className="mb-5 flex items-center justify-between">
          <span className="text-sm font-semibold">Order summary</span>
          <button
            type="button"
            onClick={onClose}
            className="ez-mono text-[10px] uppercase tracking-[0.14em] text-[#A1A1A6]"
          >
            Close
          </button>
        </div>

        <div className="mb-5">
          <div className="ez-mono text-[9px] uppercase tracking-[0.18em] text-[#86868B]">
            Due today
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <span className="ez-mono text-[40px] font-bold leading-none tracking-tight">{dueToday}</span>
            <span className="pb-1 text-right text-[12px] text-[#A1A1A6]">
              {isPrepaid ? `Charged ${lockedTotal} on ship` : `Pay ${lockedTotal} at door`}
            </span>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="relative h-14 w-[50px] shrink-0 overflow-hidden rounded-md bg-white/[0.06]">
            <Image src={PRODUCT_IMG} alt="" fill className="object-contain p-0.5" sizes="50px" />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">Grand Theft Auto VI</div>
            <div className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#A1A1A6]">
              PS5 · Standard · Locked {lockedTotal}
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-[#86868B]">Subtotal</span>
            <span className="ez-mono">{fmt(PRICE)}</span>
          </div>
          {isPrepaid ? (
            <div className="flex justify-between">
              <span className="text-[#86868B]">Prepaid ({pct}%)</span>
              <span className="ez-mono text-[#8FD9A8]">−{fmt(discount)}</span>
            </div>
          ) : null}
          {taxAmount > 0 || taxMessage ? (
            <div className="flex justify-between">
              <span className="text-[#86868B]">Tax</span>
              <span className="ez-mono text-[#E8E8ED]">
                {taxMessage ?? fmt(taxAmount)}
              </span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-[#86868B]">Shipping</span>
            <span
              className={`ez-mono ${
                shippingLabel === "FREE" ? "text-[#8FD9A8]" : "text-[#E8E8ED]"
              }`}
            >
              {shippingLabel}
            </span>
          </div>
          <div className="flex justify-between border-t border-white/[0.1] pt-2">
            <span className="text-[#A1A1A6]">{isPrepaid ? "On release" : "On delivery"}</span>
            <span className="ez-mono font-semibold">{lockedTotal}</span>
          </div>
        </div>

        <p className="mb-4 m-0 text-[12px] leading-relaxed text-[#A1A1A6]">
          Releases {releaseLabel}. Nothing charged until then.
        </p>
        <CountdownSummaryPanel variant="rail" />
        <div className="mt-4">
          <TrustRail />
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  const [step, setStep] = useState(1);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [method, setMethod] = useState<"prepaid" | "cod">("prepaid");
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [stepKey, setStepKey] = useState(0);
  const [sessionKey, setSessionKey] = useState("demo-session");
  const [gateway, setGateway] = useState<CheckoutGateway>("upi");
  const [carrierId, setCarrierId] = useState<CheckoutCarrierId | "">("");
  const [splitId, setSplitId] = useState<string>("");
  const [showValidationErrors, setShowValidationErrors] = useState(false);

  const liveTheme = useLiveThemeSettings();
  const { checkoutRules } = useAdminStore();
  const releaseLabel = formatReleaseLabel(liveTheme.releaseDate);

  useEffect(() => {
    setSessionKey(getCheckoutSessionKey());
  }, []);

  const policy = useMemo(
    () =>
      resolveCheckoutPolicy(liveTheme, checkoutRules, {
        subtotal: PRICE,
        pincode: form.pincode || undefined,
        city: form.city || undefined,
        paymentMethod: method,
        fulfillmentType: "preorder",
        productCategory: "preorders",
        sessionKey,
      }),
    [liveTheme, checkoutRules, form.pincode, form.city, method, sessionKey],
  );

  const selectedCarrier = useMemo(() => {
    const carriers = policy.carriers;
    if (!carriers.length) return null;
    return (
      carriers.find((c) => c.id === carrierId) ??
      carriers.find((c) => c.id === policy.defaultCarrierId) ??
      carriers[0]
    );
  }, [policy.carriers, policy.defaultCarrierId, carrierId]);

  const shippingAmount = selectedCarrier?.amount ?? policy.shippingAmount;
  const shippingLabel =
    selectedCarrier != null
      ? selectedCarrier.amount === 0
        ? "FREE"
        : fmt(selectedCarrier.amount)
      : policy.shippingLabel;

  const pct = policy.prepaidDiscountPct;
  const isPrepaid = method === "prepaid";
  const discount = PRICE * (pct / 100);
  const taxAmount = policy.taxExempt
    ? 0
    : Math.round(PRICE * (policy.taxRatePct / 100));
  const taxAdd =
    policy.taxExempt || policy.taxInclusiveMessage ? 0 : taxAmount;
  const prepaidTotalNum = PRICE - discount + shippingAmount + taxAdd;
  const codTotalNum = PRICE + shippingAmount + taxAdd;
  const prepaidTotal = fmt(prepaidTotalNum);
  const lockedTotal = isPrepaid ? prepaidTotal : fmt(codTotalNum);
  const codAvailable = policy.methods.includes("cod");
  const showField = (key: CheckoutFieldKey) => !policy.hiddenFields.includes(key);
  const fieldRequired = (key: CheckoutFieldKey) => policy.requiredFields.includes(key);

  const activeSplit = useMemo(
    () =>
      policy.splitPayments.find((s) => s.id === splitId) ??
      policy.splitPayments[0] ??
      null,
    [policy.splitPayments, splitId],
  );
  const depositPct = activeSplit?.depositPct ?? policy.depositPct ?? 0;
  const dueTodayNum =
    depositPct > 0
      ? Math.round((isPrepaid ? prepaidTotalNum : codTotalNum) * (depositPct / 100))
      : 0;
  const dueToday = fmt(dueTodayNum);

  const prepaidGateways = policy.gateways.filter((g) => g !== "cod");

  useEffect(() => {
    if (!policy.methods.includes(method)) {
      const next = policy.methods[0];
      if (next) setMethod(next);
    }
  }, [policy.methods, method]);

  useEffect(() => {
    if (policy.preferredGateway && policy.gateways.includes(policy.preferredGateway)) {
      setGateway(policy.preferredGateway);
    }
  }, [policy.preferredGateway, policy.gateways]);

  useEffect(() => {
    const carriers = policy.carriers;
    if (!carriers.length) return;
    if (!carriers.some((c) => c.id === carrierId)) {
      setCarrierId(policy.defaultCarrierId ?? carriers[0].id);
    }
  }, [policy.carriers, policy.defaultCarrierId, carrierId]);

  useEffect(() => {
    const s = getSession();
    setSessionState(s);
    if (s) {
      setForm((prev) => ({
        ...prev,
        mobile: prev.mobile || normalizeMobile(s.mobile),
        firstName: prev.firstName || s.name.split(" ")[0] || "",
        lastName: prev.lastName || s.name.split(" ").slice(1).join(" ") || "",
      }));
    }
  }, []);

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }));

  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const shipLine = [form.address, form.city, form.pincode].filter(Boolean).join(", ");

  const goto = (s: number) => {
    setStep(s);
    setStepKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const placeOrder = () => {
    const result = createDemoCheckoutOrder({
      name: fullName || session?.name || "Guest Player",
      mobile: form.mobile || session?.mobile || "9876500001",
      city: form.city || "Bengaluru",
      payment: isPrepaid ? "Prepaid" : "COD",
      total: lockedTotal,
      addressLine1: form.address || undefined,
      pincode: form.pincode || undefined,
    });
    setOrderId(result.orderId);
    setPlaced(true);
    window.scrollTo(0, 0);
  };

  const canContinueDetails =
    (!fieldRequired("mobile") || isValidMobile(form.mobile)) &&
    (!fieldRequired("address") || form.address.trim().length > 0) &&
    (!fieldRequired("firstName") || form.firstName.trim().length > 0) &&
    (!fieldRequired("lastName") || form.lastName.trim().length > 0) &&
    (!fieldRequired("city") || form.city.trim().length > 0) &&
    (!fieldRequired("pincode") || form.pincode.trim().length === 6) &&
    (!fieldRequired("upi") || form.upiId.trim().length > 0);

  if (placed) {
    return (
      <div className="ez-checkout-bg min-h-screen">
        <div className="ez-checkout-shell">
          <CheckoutHeader label="Secure pre-order" shortLabel="Secure" />
          <main className="ez-page w-full py-14 pb-20 sm:py-20">
            <div className="ez-checkout-success mx-auto flex max-w-[520px] flex-col items-center gap-5 text-center">
              <span className="ez-mono rounded-full border border-black/[0.08] bg-white px-4 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#6E6E73] shadow-sm">
                {orderId ?? "Reserved"}
              </span>
              <h1 className="ez-display m-0 font-bold tracking-[-0.04em]">You&apos;re in line.</h1>
              <p className="m-0 max-w-[420px] text-[15px] leading-relaxed text-[#6E6E73]">
                GTA VI · PS5 reserved at{" "}
                <span className="font-semibold text-[var(--ez-fg)]">{lockedTotal}</span>. We&apos;ll
                text {formatMobileDisplay(form.mobile || session?.mobile || "")} when it ships.
              </p>
              <CountdownBoxes size="large" />
              <TrustRail />
              <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
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
                    setOrderId(null);
                    setStep(1);
                    setMethod("prepaid");
                  }}
                  className="w-full rounded-full px-4 py-3 text-[13px] font-medium text-[#86868B] hover:text-[#424245] sm:w-auto"
                >
                  Restart demo
                </button>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const primaryLabel =
    step === 1
      ? "Continue"
      : step === 2
        ? "Review"
        : dueTodayNum > 0
          ? `Place pre-order · ${dueToday}`
          : "Place pre-order · ₹0";

  const primaryAction = () => {
    if (policy.blocked) return;
    if (step === 1) {
      if (canContinueDetails) {
        setShowValidationErrors(false);
        goto(2);
      } else {
        setShowValidationErrors(true);
      }
    } else if (step === 2) {
      goto(3);
    } else if (step === 3) {
      placeOrder();
    }
  };

  return (
    <div className="ez-checkout-bg min-h-screen pb-28 lg:pb-0">
      <div className="ez-checkout-shell">
        <CheckoutHeader label="Secure pre-order" shortLabel="Secure" />

        <main className="ez-page w-full py-6 sm:py-10 sm:pb-16">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div className="max-w-[36rem]">
              <p className="ez-mono m-0 text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                Pre-order reservation
              </p>
              <h1 className="m-0 mt-2 text-[26px] font-bold tracking-[-0.045em] text-[var(--ez-fg)] sm:text-[34px]">
                Reserve your copy
              </h1>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-[#6E6E73] sm:text-[15px]">
                Grand Theft Auto VI · PS5 — locked at {lockedTotal}. Nothing charged until release.
              </p>
            </div>
          </div>

          <MobileSummaryStrip lockedTotal={lockedTotal} onOpen={() => setSummaryOpen(true)} />

          <div className="mt-5 grid grid-cols-1 items-start gap-7 lg:mt-0 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:gap-10">
            <div className="ez-checkout-panel min-w-0 rounded-[20px] p-5 sm:p-7 lg:p-8">
              <CheckoutProgress step={step} />

              {session ? (
                <div className="ez-checkout-session mt-6 flex flex-wrap items-center justify-between gap-3 rounded-[14px] px-4 py-3.5">
                  <div>
                    <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
                      Playing as
                    </div>
                    <div className="mt-0.5 text-sm font-semibold">{session.name}</div>
                    <div className="ez-mono text-[11px] text-[#86868B]">
                      {formatMobileDisplay(session.mobile)}
                    </div>
                  </div>
                  <Link
                    href="/auth"
                    className="text-xs font-semibold text-[#424245] underline-offset-2 hover:underline"
                  >
                    Switch account
                  </Link>
                </div>
              ) : (
                <div className="ez-checkout-session mt-6 flex flex-wrap items-center justify-between gap-2 rounded-[14px] px-4 py-3.5">
                  <p className="m-0 text-[13px] text-[#6E6E73]">
                    Guest checkout — or{" "}
                    <Link
                      href="/auth"
                      className="font-semibold text-[var(--ez-fg)] underline-offset-2 hover:underline"
                    >
                      sign in with OTP
                    </Link>
                  </p>
                </div>
              )}

              <div key={stepKey} className="ez-checkout-step mt-7 sm:mt-8">
                {policy.blocked ? (
                  <div
                    role="alert"
                    className="rounded-[14px] border border-[#F5C2C0] bg-[#FEF3F2] px-4 py-3.5 text-[13px] leading-relaxed text-[#B42318]"
                  >
                    {policy.blockMessage ?? "Checkout is unavailable for this cart."}
                  </div>
                ) : null}

                {step === 1 && (
                  <form
                    className="flex flex-col gap-5"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (canContinueDetails) goto(2);
                    }}
                  >
                    <div>
                      <h2 className="m-0 text-[19px] font-bold tracking-[-0.03em] sm:text-[21px]">
                        Where should it go?
                      </h2>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#6E6E73] sm:text-[14px]">
                        Delivery for your physical copy. Nothing due until release.
                      </p>
                    </div>

                    {showField("mobile") ? (
                    <div className="flex flex-col gap-2">
                      <FieldLabel htmlFor="mobile">Mobile</FieldLabel>
                      <div className={`ez-checkout-input flex overflow-hidden rounded-[12px] ${
                        showValidationErrors && !isValidMobile(form.mobile)
                          ? "!border-[#B42318] !bg-[#FFF5F5]"
                          : ""
                      }`}>
                        <span className="ez-mono flex shrink-0 items-center border-r border-[#D2D2D7] bg-[#F5F5F7] px-3.5 text-[13px] font-medium text-[#424245]">
                          +91
                        </span>
                        <input
                          id="mobile"
                          type="tel"
                          inputMode="numeric"
                          autoComplete="tel-national"
                          required={fieldRequired("mobile")}
                          value={form.mobile}
                          onChange={(e) => patch({ mobile: normalizeMobile(e.target.value) })}
                          placeholder="98765 43210"
                          className="min-w-0 flex-1 border-none bg-transparent px-4 py-3.5 text-[15px] outline-none"
                        />
                      </div>
                      {showValidationErrors && !isValidMobile(form.mobile) && (
                        <span className="text-[11px] font-medium text-[#B42318]">
                          Please enter a valid 10-digit mobile number starting with 6-9.
                        </span>
                      )}
                    </div>
                    ) : null}

                    {showField("address") ? (
                    <div className="flex flex-col gap-2">
                      <FieldLabel htmlFor="address">Address</FieldLabel>
                      <CheckoutInput
                        id="address"
                        required={fieldRequired("address")}
                        value={form.address}
                        onChange={(v) => patch({ address: v })}
                        placeholder="Flat, street and area"
                        autoComplete="street-address"
                      />
                    </div>
                    ) : null}

                    {showField("firstName") || showField("lastName") ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                      {showField("firstName") ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel htmlFor="first">First name</FieldLabel>
                        <CheckoutInput
                          id="first"
                          required={fieldRequired("firstName")}
                          value={form.firstName}
                          onChange={(v) => patch({ firstName: v })}
                          placeholder="Arjun"
                          autoComplete="given-name"
                        />
                      </div>
                      ) : null}
                      {showField("lastName") ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel htmlFor="last">Last name</FieldLabel>
                        <CheckoutInput
                          id="last"
                          required={fieldRequired("lastName")}
                          value={form.lastName}
                          onChange={(v) => patch({ lastName: v })}
                          placeholder="Mehta"
                          autoComplete="family-name"
                        />
                      </div>
                      ) : null}
                    </div>
                    ) : null}

                    {showField("city") || showField("pincode") ? (
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1.4fr_1fr] sm:gap-5">
                      {showField("city") ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel htmlFor="city">City</FieldLabel>
                        <CheckoutInput
                          id="city"
                          required={fieldRequired("city")}
                          value={form.city}
                          onChange={(v) => patch({ city: v })}
                          placeholder="Mumbai"
                          autoComplete="address-level2"
                        />
                      </div>
                      ) : null}
                      {showField("pincode") ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel htmlFor="pin">PIN code</FieldLabel>
                        <CheckoutInput
                          id="pin"
                          type="tel"
                          required={fieldRequired("pincode")}
                          value={form.pincode}
                          onChange={(v) => patch({ pincode: v.replace(/\D/g, "").slice(0, 6) })}
                          placeholder="400001"
                          inputMode="numeric"
                          autoComplete="postal-code"
                          hasError={showValidationErrors && form.pincode.trim().length !== 6}
                        />
                        {showValidationErrors && form.pincode.trim().length !== 6 && (
                          <span className="text-[11px] font-medium text-[#B42318]">
                            Please enter a valid 6-digit PIN code (e.g. 400001).
                          </span>
                        )}
                      </div>
                      ) : null}
                    </div>
                    ) : null}

                    {policy.carriers.length > 1 ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel>Shipping carrier</FieldLabel>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                          {policy.carriers.map((carrier) => {
                            const selected = carrierId === carrier.id;
                            return (
                              <button
                                key={carrier.id}
                                type="button"
                                onClick={() => setCarrierId(carrier.id)}
                                className={`rounded-[12px] border px-3 py-3 text-left ${
                                  selected
                                    ? "border-[var(--ez-ink)] bg-[#F7F7F8]"
                                    : "border-[#E0E0E5] bg-white"
                                }`}
                              >
                                <span className="block text-sm font-semibold">{carrier.label}</span>
                                <span className="ez-mono mt-1 block text-[10px] text-[#86868B]">
                                  {carrier.amount === 0 ? "FREE" : fmt(carrier.amount)} · {carrier.eta}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    <button
                      type="submit"
                      disabled={!canContinueDetails || policy.blocked}
                      className="ez-checkout-btn-dark mt-1 hidden w-full rounded-full border-none py-4 text-[15px] font-semibold disabled:opacity-40 lg:block"
                    >
                      Continue to payment
                    </button>
                  </form>
                )}

                {step === 2 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="m-0 text-[19px] font-bold tracking-[-0.03em] sm:text-[21px]">
                        How will you pay?
                      </h2>
                      <p className="mt-1.5 text-[13px] text-[#6E6E73] sm:text-[14px]">
                        {policy.methods.includes("prepaid")
                          ? `Prepaid saves ${pct}%. Charged on release — not today.`
                          : "Choose how you'd like to pay on delivery."}
                      </p>
                    </div>

                    {policy.banner ? (
                      <p className="m-0 rounded-[14px] border border-black/[0.06] bg-[#F7F7F8] px-4 py-3.5 text-[13px] leading-relaxed text-[#424245]">
                        {policy.banner}
                      </p>
                    ) : null}

                    {policy.methods.length === 0 ? (
                      <p className="m-0 text-sm text-[#B42318]">
                        No payment methods are available for this cart. Adjust checkout rules or
                        contact support.
                      </p>
                    ) : (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {(
                        [
                          ...(policy.methods.includes("prepaid")
                            ? [
                                {
                                  id: "prepaid" as const,
                                  title: "Prepaid · UPI",
                                  sub: `Save ${pct}% · ${prepaidTotal}`,
                                },
                              ]
                            : []),
                          ...(codAvailable
                            ? [
                                {
                                  id: "cod" as const,
                                  title: "Cash on delivery",
                                  sub: `Pay ${fmt(codTotalNum)} at door · under ${formatInr(policy.codMax)}`,
                                },
                              ]
                            : []),
                        ] as const
                      ).map((opt) => {
                        const selected = method === opt.id;
                        return (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setMethod(opt.id)}
                            className={`rounded-[14px] border-[1.5px] px-4 py-4 text-left transition-all duration-200 ${
                              selected
                                ? "border-[var(--ez-ink)] bg-[#F7F7F8] shadow-[0_0_0_3px_rgba(17,17,19,0.08)]"
                                : "border-[#E0E0E5] bg-white hover:border-[#C8C8CE]"
                            }`}
                          >
                            <span className="block text-[14px] font-semibold sm:text-[15px]">
                              {opt.title}
                            </span>
                            <span className="ez-mono mt-1.5 block text-[11px] text-[#6E6E73]">
                              {opt.sub}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                    )}

                    {isPrepaid && prepaidGateways.length > 0 ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel>Payment gateway</FieldLabel>
                        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                          {prepaidGateways.map((g) => {
                            const selected = gateway === g;
                            return (
                              <button
                                key={g}
                                type="button"
                                onClick={() => setGateway(g)}
                                className={`rounded-[12px] border px-3 py-3 text-left text-sm font-semibold ${
                                  selected
                                    ? "border-[var(--ez-ink)] bg-[#F7F7F8]"
                                    : "border-[#E0E0E5] bg-white"
                                } ${g === policy.preferredGateway ? "ring-1 ring-[#8FD9A8]/40" : ""}`}
                              >
                                {GATEWAY_LABELS[g]}
                                {g === policy.preferredGateway ? (
                                  <span className="ez-mono mt-1 block text-[9px] font-normal uppercase tracking-[0.12em] text-[#86868B]">
                                    Recommended
                                  </span>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {(policy.splitPayments.length > 0 || policy.payLaterEnabled) && isPrepaid ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel>Pay today</FieldLabel>
                        <div className="grid grid-cols-1 gap-2">
                          {(policy.splitPayments.length
                            ? policy.splitPayments
                            : [
                                {
                                  id: "deposit-default",
                                  label: `${policy.depositPct ?? 0}% deposit today`,
                                  depositPct: policy.depositPct ?? 0,
                                  balanceLabel: "Balance on release",
                                },
                              ]
                          ).map((split) => {
                            const selected = (splitId || policy.splitPayments[0]?.id) === split.id;
                            const splitDue = fmt(
                              Math.round(
                                prepaidTotalNum * (split.depositPct / 100),
                              ),
                            );
                            return (
                              <button
                                key={split.id}
                                type="button"
                                onClick={() => setSplitId(split.id)}
                                className={`rounded-[12px] border px-4 py-3 text-left ${
                                  selected
                                    ? "border-[var(--ez-ink)] bg-[#F7F7F8]"
                                    : "border-[#E0E0E5] bg-white"
                                }`}
                              >
                                <span className="block text-sm font-semibold">{split.label}</span>
                                <span className="ez-mono mt-1 block text-[11px] text-[#6E6E73]">
                                  {splitDue} today · {split.balanceLabel}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {policy.taxInclusiveMessage ? (
                      <p className="m-0 text-[12px] text-[#86868B]">{policy.taxInclusiveMessage}</p>
                    ) : null}

                    {isPrepaid && showField("upi") && gateway === "upi" ? (
                      <div className="flex flex-col gap-2">
                        <FieldLabel htmlFor="upi">UPI ID</FieldLabel>
                        <CheckoutInput
                          id="upi"
                          required={fieldRequired("upi")}
                          value={form.upiId}
                          onChange={(v) => patch({ upiId: v })}
                          placeholder="name@upi"
                          className="ez-mono text-sm"
                          autoComplete="off"
                        />
                        <p className="m-0 text-[12px] leading-relaxed text-[#86868B]">
                          We authorize now and charge {prepaidTotal} when it ships on {releaseLabel}.
                        </p>
                      </div>
                    ) : isPrepaid ? (
                      <p className="m-0 text-[12px] leading-relaxed text-[#86868B]">
                        We authorize now and charge {prepaidTotal} when it ships on {releaseLabel}.
                      </p>
                    ) : codAvailable ? (
                      <p className="m-0 rounded-[14px] border border-black/[0.06] bg-[#F7F7F8] px-4 py-3.5 text-[13px] leading-relaxed text-[#6E6E73]">
                        Pay {fmt(codTotalNum)} in cash or UPI when the courier arrives. Available
                        under {formatInr(policy.codMax)}.
                      </p>
                    ) : null}

                    <div className="hidden gap-3 lg:flex lg:items-center">
                      <button
                        type="button"
                        disabled={policy.blocked || policy.methods.length === 0}
                        onClick={() => goto(3)}
                        className="ez-checkout-btn-dark flex-1 rounded-full border-none py-4 text-[15px] font-semibold"
                      >
                        Review order
                      </button>
                      <button
                        type="button"
                        onClick={() => goto(1)}
                        className="px-3 py-3 text-sm font-semibold text-[#6E6E73] hover:text-[var(--ez-fg)]"
                      >
                        Back
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => goto(1)}
                      className="self-start text-sm font-semibold text-[#6E6E73] lg:hidden"
                    >
                      ← Back
                    </button>
                  </div>
                )}

                {step === 3 && (
                  <div className="flex flex-col gap-5">
                    <div>
                      <h2 className="m-0 text-[19px] font-bold tracking-[-0.03em] sm:text-[21px]">
                        Confirm reservation
                      </h2>
                      <p className="mt-1.5 text-[13px] text-[#6E6E73] sm:text-[14px]">
                        One guarantee: if the price drops before release, you pay the lower amount.
                      </p>
                    </div>

                    <dl className="overflow-hidden rounded-[14px] border border-black/[0.08] bg-[#FAFAFB]">
                      {[
                        ["Item", "GTA VI · PS5 · Standard"],
                        ["Releases", releaseLabel],
                        ["Ships to", shipLine || "—"],
                        ["Mobile", formatMobileDisplay(form.mobile)],
                        [
                          "Payment",
                          isPrepaid
                            ? `${GATEWAY_LABELS[gateway]} prepaid · ${form.upiId || "authorize later"}`
                            : "Cash on delivery",
                        ],
                        ...(selectedCarrier
                          ? [["Carrier", `${selectedCarrier.label} · ${shippingLabel}`] as const]
                          : []),
                        ["Locked", lockedTotal],
                        ...(dueTodayNum > 0 ? [["Due today", dueToday] as const] : []),
                      ].map(([label, value], idx) => (
                        <div
                          key={label}
                          className={`flex flex-col gap-0.5 px-4 py-3.5 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4 ${
                            idx > 0 ? "border-t border-black/[0.06]" : ""
                          }`}
                        >
                          <dt className="ez-mono text-[10px] uppercase tracking-[0.14em] text-[#86868B]">
                            {label}
                          </dt>
                          <dd className="m-0 text-sm font-semibold sm:text-right">{value}</dd>
                        </div>
                      ))}
                    </dl>

                    <div className="hidden gap-3 lg:flex lg:items-center">
                      <button
                        type="button"
                        onClick={placeOrder}
                        disabled={policy.blocked}
                        className="ez-checkout-btn-dark flex-1 rounded-full border-none py-4 text-[15px] font-semibold disabled:opacity-40"
                      >
                        Place pre-order — {dueTodayNum > 0 ? dueToday : "₹0 today"}
                      </button>
                      <button
                        type="button"
                        onClick={() => goto(2)}
                        className="px-3 py-3 text-sm font-semibold text-[#6E6E73] hover:text-[var(--ez-fg)]"
                      >
                        Back
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => goto(2)}
                      className="self-start text-sm font-semibold text-[#6E6E73] lg:hidden"
                    >
                      ← Back
                    </button>
                    <p className="m-0 text-center text-[12px] text-[#86868B] lg:text-left">
                      Cancel anytime before dispatch.
                    </p>
                  </div>
                )}
              </div>
            </div>

            <OrderSummaryRail
              isPrepaid={isPrepaid}
              pct={pct}
              discount={discount}
              lockedTotal={lockedTotal}
              releaseLabel={releaseLabel}
              shippingLabel={shippingLabel}
              taxAmount={taxAmount}
              taxMessage={policy.taxInclusiveMessage}
              taxRatePct={policy.taxRatePct}
              dueToday={dueToday}
            />
          </div>
        </main>

        <StickyFooterCta
          label={primaryLabel}
          onClick={primaryAction}
          disabled={(step === 1 && !canContinueDetails) || policy.blocked}
        />

        <MobileSummarySheet
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          isPrepaid={isPrepaid}
          pct={pct}
          discount={discount}
          lockedTotal={lockedTotal}
          releaseLabel={releaseLabel}
          shippingLabel={shippingLabel}
          taxAmount={taxAmount}
          taxMessage={policy.taxInclusiveMessage}
          dueToday={dueToday}
        />
      </div>
    </div>
  );
}
