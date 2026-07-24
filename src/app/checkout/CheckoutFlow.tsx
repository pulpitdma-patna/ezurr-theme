"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import { beginCheckout, addPaymentInfo, purchase, getGaClientId } from "@/lib/analytics";
import { CheckoutHeader } from "@/components/layout/Header";
import { CountdownBoxes, CountdownSummaryPanel } from "@/components/ui/Countdown";
import { formatInr } from "@/data/admin";
import { formatReleaseLabel, useLiveThemeSettings } from "@/hooks/useLiveThemeSettings";
import { useAdminStore } from "@/hooks/useAdminStore";
import { createDemoCheckoutOrder } from "@/lib/adminStore";
import { api, isApiEnabled, type ApiProduct } from "@/lib/apiClient";
import { loadRazorpay } from "@/lib/razorpay";
import { useCart } from "@/lib/cart";
import {
  resolveCheckoutPolicy,
  type CheckoutCarrierId,
  type CheckoutFieldKey,
  type CheckoutGateway,
  type CheckoutPolicy,
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
  productTitle,
  productSubtitle,
  productImage,
  subtotal,
  isPrepaid,
  isPreorder,
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
  productTitle: string;
  productSubtitle: string;
  productImage: string;
  subtotal: number;
  isPrepaid: boolean;
  isPreorder: boolean;
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
            {isPreorder || !isPrepaid ? "Due today" : "Total"}
          </div>
          <div className="mt-2 flex items-end justify-between gap-3">
            <span className="ez-mono text-[44px] font-bold leading-none tracking-tight text-white">
              {dueToday}
            </span>
            <span className="pb-1 text-right text-[12px] leading-snug text-[#A1A1A6]">
              {isPreorder
                ? isPrepaid
                  ? `Authorize now · ${lockedTotal} on ${releaseLabel}`
                  : `Pay ${lockedTotal} on delivery`
                : isPrepaid
                  ? "Paid securely online"
                  : `Pay ${lockedTotal} on delivery`}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3.5 rounded-[14px] border border-white/[0.08] bg-white/[0.04] p-3">
          <div className="relative h-[72px] w-[64px] shrink-0 overflow-hidden rounded-lg bg-white/[0.06]">
            <Image src={productImage} alt="" fill className="object-contain p-1" sizes="64px" unoptimized />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[15px] font-semibold tracking-[-0.02em]">
              {productTitle}
            </div>
            <div className="ez-mono mt-1 text-[10px] uppercase tracking-[0.12em] text-[#A1A1A6]">
              {productSubtitle}
            </div>
            <div className="ez-mono mt-2 text-[11px] text-[#C7C7CC]">Locked {lockedTotal}</div>
          </div>
        </div>

        <div className="flex flex-col gap-2.5 text-[13px]">
          <div className="flex justify-between gap-3">
            <span className="text-[#86868B]">Subtotal</span>
            <span className="ez-mono shrink-0 text-[#E8E8ED]">{fmt(subtotal)}</span>
          </div>
          {isPrepaid && discount > 0 ? (
            <div className="flex justify-between gap-3">
              <span className="text-[#86868B]">Prepaid ({pct}%)</span>
              <span className="ez-mono shrink-0 text-[#8FD9A8]">−{fmt(discount)}</span>
            </div>
          ) : null}
          {taxAmount > 0 ? (
            <div className="flex justify-between gap-3">
              <span className="text-[#86868B]">
                {taxRatePct ? `GST (${taxRatePct}%)` : "GST"}
              </span>
              <span className="ez-mono shrink-0 text-[#E8E8ED]">{fmt(taxAmount)}</span>
            </div>
          ) : taxMessage ? (
            <div className="flex justify-between gap-3">
              <span className="text-[#86868B]">Tax</span>
              <span className="ez-mono shrink-0 text-[#86868B]">{taxMessage}</span>
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
              {isPreorder ? (isPrepaid ? "On release" : "On delivery") : isPrepaid ? "Total" : "On delivery"}
            </span>
            <span className="ez-mono shrink-0 font-semibold text-[#F5F5F7]">{lockedTotal}</span>
          </div>
        </div>

        {isPreorder ? <CountdownSummaryPanel variant="rail" /> : null}
        <TrustRail />
      </div>
    </aside>
  );
}

function MobileSummaryStrip({
  productTitle,
  productImage,
  lockedTotal,
  dueToday,
  onOpen,
}: {
  productTitle: string;
  productImage: string;
  lockedTotal: string;
  dueToday: string;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="ez-checkout-mobile-strip flex w-full items-center gap-3 rounded-[14px] border border-black/[0.06] bg-white px-3 py-3 text-left lg:hidden"
    >
      <div className="relative h-12 w-[54px] shrink-0 overflow-hidden rounded-md bg-[#F0F0F4]">
        <Image src={productImage} alt="" fill className="object-contain p-0.5" sizes="54px" unoptimized />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[13px] font-semibold tracking-[-0.01em]">{productTitle}</div>
        <div className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#86868B]">
          Locked {lockedTotal}
        </div>
      </div>
      <div className="text-right">
        <div className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">Due</div>
        <div className="ez-mono text-lg font-bold leading-none">{dueToday}</div>
      </div>
    </button>
  );
}

function StickyFooterCta({
  label,
  dueToday,
  onClick,
  disabled,
}: {
  label: string;
  dueToday: string;
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
          <div className="ez-mono text-lg font-bold leading-none">{dueToday}</div>
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
  productTitle,
  productSubtitle,
  productImage,
  subtotal,
  isPrepaid,
  isPreorder,
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
  productTitle: string;
  productSubtitle: string;
  productImage: string;
  subtotal: number;
  isPrepaid: boolean;
  isPreorder: boolean;
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
            {isPreorder || !isPrepaid ? "Due today" : "Total"}
          </div>
          <div className="mt-1.5 flex items-end justify-between gap-3">
            <span className="ez-mono text-[40px] font-bold leading-none tracking-tight">{dueToday}</span>
            <span className="pb-1 text-right text-[12px] text-[#A1A1A6]">
              {isPreorder
                ? isPrepaid
                  ? `Charged ${lockedTotal} on ship`
                  : `Pay ${lockedTotal} at door`
                : isPrepaid
                  ? "Paid securely online"
                  : `Pay ${lockedTotal} at door`}
            </span>
          </div>
        </div>

        <div className="mb-5 flex items-center gap-3">
          <div className="relative h-14 w-[50px] shrink-0 overflow-hidden rounded-md bg-white/[0.06]">
            <Image src={productImage} alt="" fill className="object-contain p-0.5" sizes="50px" unoptimized />
          </div>
          <div className="min-w-0">
            <div className="truncate text-[14px] font-semibold">{productTitle}</div>
            <div className="ez-mono text-[10px] uppercase tracking-[0.12em] text-[#A1A1A6]">
              {productSubtitle} · Locked {lockedTotal}
            </div>
          </div>
        </div>

        <div className="mb-5 flex flex-col gap-2 text-[13px]">
          <div className="flex justify-between">
            <span className="text-[#86868B]">Subtotal</span>
            <span className="ez-mono">{fmt(subtotal)}</span>
          </div>
          {isPrepaid && discount > 0 ? (
            <div className="flex justify-between">
              <span className="text-[#86868B]">Prepaid ({pct}%)</span>
              <span className="ez-mono text-[#8FD9A8]">−{fmt(discount)}</span>
            </div>
          ) : null}
          {taxAmount > 0 ? (
            <div className="flex justify-between">
              <span className="text-[#86868B]">GST</span>
              <span className="ez-mono text-[#E8E8ED]">{fmt(taxAmount)}</span>
            </div>
          ) : taxMessage ? (
            <div className="flex justify-between">
              <span className="text-[#86868B]">Tax</span>
              <span className="ez-mono text-[#86868B]">{taxMessage}</span>
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
            <span className="text-[#A1A1A6]">
              {isPreorder ? (isPrepaid ? "On release" : "On delivery") : isPrepaid ? "Total" : "On delivery"}
            </span>
            <span className="ez-mono font-semibold">{lockedTotal}</span>
          </div>
        </div>

        {isPreorder ? (
          <>
            <p className="mb-4 m-0 text-[12px] leading-relaxed text-[#A1A1A6]">
              Releases {releaseLabel}. Nothing charged until then.
            </p>
            <CountdownSummaryPanel variant="rail" />
          </>
        ) : null}
        <div className="mt-4">
          <TrustRail />
        </div>
      </div>
    </div>
  );
}

export function CheckoutFlow({ productKey: buyNowKey }: { productKey?: string }) {
  // Single-product buy-now when a handle is in the path; otherwise cart mode.
  const productKey = buyNowKey?.trim() || "gta-vi-preorder";
  const apiOn = isApiEnabled();

  const [step, setStep] = useState(1);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [policyError, setPolicyError] = useState<string | null>(null);
  const [checkoutProduct, setCheckoutProduct] = useState<ApiProduct | null>(null);
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
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [geoMsg, setGeoMsg] = useState<string | null>(null);
  const [quote, setQuote] = useState<Awaited<ReturnType<typeof api.checkoutQuote>> | null>(null);
  const [whatsappConsent, setWhatsappConsent] = useState(true);
  const [placing, setPlacing] = useState(false);

  const liveTheme = useLiveThemeSettings();
  const { checkoutRules } = useAdminStore();
  const releaseLabel = formatReleaseLabel(liveTheme.releaseDate);
  const unitPrice = checkoutProduct?.price ?? PRICE;
  const productTitle = checkoutProduct?.title ?? "Ezurr Play Console";
  const productSubtitle = checkoutProduct?.category_slug
    ? checkoutProduct.category_slug.replace(/-/g, " ")
    : "Pre-order";
  const productImage = checkoutProduct?.image_url || PRODUCT_IMG;
  // Cart mode (?cart=1): order the whole cart instead of the single ?key product.
  // The server quote re-prices authoritatively from these items, so all money
  // (subtotal/discount/tax/total) stays server-driven for both modes.
  const cart = useCart();
  const isCart = !buyNowKey?.trim() && cart.items.length > 0;

  // In cart mode there is no single ?key product, so derive the fulfillment from
  // the cart (which only ever holds in-stock items) rather than defaulting to
  // "preorder" — otherwise an in-stock cart would show pre-order payment framing.
  const fulfillmentType = (
    isCart
      ? cart.items[0]?.fulfillmentType ?? "physical"
      : checkoutProduct?.fulfillment_type ?? "preorder"
  ) as "digital" | "preorder" | "physical";
  const isPreorder = fulfillmentType === "preorder";
  const productCategory = isCart ? "games" : checkoutProduct?.category_slug ?? "preorders";

  const subtotalBase = isCart ? cart.subtotal : unitPrice;
  const orderLineItems = isCart
    ? cart.items.map((i) => ({ productKey: i.productKey, title: i.title, qty: i.qty }))
    : [{ productKey: checkoutProduct?.key ?? productKey, title: productTitle, qty: 1 }];
  const quoteItems = orderLineItems.map((i) => ({ productKey: i.productKey, qty: i.qty }));
  const itemsKey = quoteItems.map((i) => `${i.productKey}:${i.qty}`).join(",");
  const displayTitle = isCart
    ? `${cart.count} item${cart.count > 1 ? "s" : ""} in cart`
    : productTitle;
  const displaySubtitle = isCart ? "Your cart" : productSubtitle;
  const displayImage = isCart ? cart.items[0]?.image || productImage : productImage;

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .product(productKey)
      .then((p) => {
        if (!cancelled) setCheckoutProduct(p);
      })
      .catch(() => {
        if (!cancelled) setCheckoutProduct(null);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn, productKey]);

  useEffect(() => {
    setSessionKey(getCheckoutSessionKey());
  }, []);

  const localPolicy = useMemo(() => {
    if (apiOn) return null;
    return resolveCheckoutPolicy(liveTheme, checkoutRules, {
      subtotal: subtotalBase,
      pincode: form.pincode || undefined,
      city: form.city || undefined,
      paymentMethod: method,
      fulfillmentType,
      productCategory,
      sessionKey,
    });
  }, [
    apiOn,
    liveTheme,
    checkoutRules,
    form.pincode,
    form.city,
    method,
    sessionKey,
    subtotalBase,
    fulfillmentType,
    productCategory,
  ]);

  const [remotePolicy, setRemotePolicy] = useState<CheckoutPolicy | null>(null);

  useEffect(() => {
    if (!apiOn) {
      setRemotePolicy(null);
      setPolicyError(null);
      return;
    }
    let cancelled = false;
    setPolicyError(null);
    void api
      .checkoutPolicy({
        subtotal: subtotalBase,
        pincode: form.pincode || undefined,
        city: form.city || undefined,
        paymentMethod: method,
        fulfillmentType,
        productCategory,
        sessionKey,
      })
      .then((data) => {
        if (!cancelled) {
          setRemotePolicy(data as unknown as CheckoutPolicy);
          setPolicyError(null);
        }
      })
      .catch((err: Error) => {
        if (!cancelled) {
          setRemotePolicy(null);
          setPolicyError(err.message || "Could not load checkout policy");
        }
      });
    return () => {
      cancelled = true;
    };
  }, [
    apiOn,
    form.pincode,
    form.city,
    method,
    sessionKey,
    subtotalBase,
    fulfillmentType,
    productCategory,
  ]);

  const policy = apiOn ? remotePolicy : localPolicy;

  const selectedCarrier = useMemo(() => {
    const carriers = policy?.carriers ?? [];
    if (!carriers.length) return null;
    return (
      carriers.find((c) => c.id === carrierId) ??
      carriers.find((c) => c.id === policy?.defaultCarrierId) ??
      carriers[0]
    );
  }, [policy?.carriers, policy?.defaultCarrierId, carrierId]);

  const shippingAmount = selectedCarrier?.amount ?? policy?.shippingAmount ?? 0;
  const shippingLabel =
    selectedCarrier != null
      ? selectedCarrier.amount === 0
        ? "FREE"
        : fmt(selectedCarrier.amount)
      : policy?.shippingLabel ?? "FREE";

  const pct = policy?.prepaidDiscountPct ?? 0;
  const isPrepaid = method === "prepaid";
  const discount = subtotalBase * (pct / 100);
  const taxAmount = policy?.taxExempt
    ? 0
    : Math.round(subtotalBase * ((policy?.taxRatePct ?? 0) / 100));
  const taxAdd =
    policy?.taxExempt || policy?.taxInclusiveMessage ? 0 : taxAmount;
  const prepaidTotalNum = subtotalBase - discount + shippingAmount + taxAdd;
  const codTotalNum = subtotalBase + shippingAmount + taxAdd;
  const prepaidTotal = fmt(prepaidTotalNum);
  // Prefer the server-computed quote (authoritative total incl. GST + coupon).
  const useQuote = apiOn && quote != null;
  const effTotalNum = useQuote ? quote.total : isPrepaid ? prepaidTotalNum : codTotalNum;
  const effSubtotal = useQuote ? quote.subtotal : subtotalBase;
  const effDiscount = useQuote ? quote.discount : discount;
  const effTaxAmount = useQuote ? quote.tax : taxAmount;
  const lockedTotal = fmt(effTotalNum);
  const codAvailable = policy?.methods.includes("cod") ?? false;
  const showField = (key: CheckoutFieldKey) => !policy?.hiddenFields.includes(key);
  const fieldRequired = (key: CheckoutFieldKey) =>
    policy?.requiredFields.includes(key) ?? false;

  const activeSplit = useMemo(
    () =>
      policy?.splitPayments.find((s) => s.id === splitId) ??
      policy?.splitPayments[0] ??
      null,
    [policy?.splitPayments, splitId],
  );
  const depositPct = activeSplit?.depositPct ?? policy?.depositPct ?? 0;
  // Pre-orders take a deposit (often ₹0 today, balance on release). In-stock
  // orders are paid in full now (prepaid) or on delivery (COD).
  const dueTodayNum = !isPreorder
    ? isPrepaid
      ? effTotalNum
      : 0
    : useQuote
      ? quote.deposit ?? 0
      : depositPct > 0
        ? Math.round((isPrepaid ? prepaidTotalNum : codTotalNum) * (depositPct / 100))
        : 0;
  const dueToday = fmt(dueTodayNum);

  const prepaidGateways = (policy?.gateways ?? []).filter((g) => g !== "cod");

  useEffect(() => {
    if (!policy?.methods.includes(method)) {
      const next = policy?.methods[0];
      if (next) setMethod(next);
    }
  }, [policy?.methods, method]);

  useEffect(() => {
    if (policy?.preferredGateway && policy.gateways.includes(policy.preferredGateway)) {
      setGateway(policy.preferredGateway);
    }
  }, [policy?.preferredGateway, policy?.gateways]);

  useEffect(() => {
    const carriers = policy?.carriers ?? [];
    if (!carriers.length) return;
    if (!carriers.some((c) => c.id === carrierId)) {
      setCarrierId(policy?.defaultCarrierId ?? carriers[0].id);
    }
  }, [policy?.carriers, policy?.defaultCarrierId, carrierId]);

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

  useEffect(() => {
    if (!apiOn) {
      setQuote(null);
      return;
    }
    if (quoteItems.length === 0) return;
    let cancelled = false;
    void api
      .checkoutQuote({
        items: quoteItems,
        paymentMethod: isPrepaid ? "prepaid" : "cod",
        carrierId: selectedCarrier?.id ?? undefined,
        depositPct: depositPct > 0 ? depositPct : undefined,
        couponCode: appliedCoupon?.code,
        mobile: form.mobile || session?.mobile,
        pincode: form.pincode,
        city: form.city,
      })
      .then((q) => {
        if (!cancelled) setQuote(q);
      })
      .catch(() => {
        if (!cancelled) setQuote(null);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apiOn,
    itemsKey,
    isPrepaid,
    selectedCarrier?.id,
    depositPct,
    appliedCoupon?.code,
    form.mobile,
    form.pincode,
    form.city,
    session?.mobile,
  ]);

  // Best-effort abandoned-cart capture (debounced), once a valid mobile exists.
  useEffect(() => {
    if (!apiOn) return;
    const mobile = isValidMobile(form.mobile) ? form.mobile : session?.mobile ?? "";
    if (!isValidMobile(mobile)) return;
    const t = window.setTimeout(() => {
      void api
        .checkoutTrack({
          sessionKey,
          items: quoteItems,
          mobile,
          paymentMethod: isPrepaid ? "prepaid" : "cod",
          couponCode: appliedCoupon?.code,
          pincode: form.pincode || undefined,
          city: form.city || undefined,
        })
        .catch(() => {});
    }, 1500);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    apiOn,
    sessionKey,
    itemsKey,
    form.mobile,
    form.pincode,
    form.city,
    isPrepaid,
    appliedCoupon?.code,
    session?.mobile,
  ]);

  const patch = (partial: Partial<FormState>) => setForm((prev) => ({ ...prev, ...partial }));

  const fullName = [form.firstName, form.lastName].filter(Boolean).join(" ").trim();
  const shipLine = [form.address, form.city, form.pincode].filter(Boolean).join(", ");

  const goto = (s: number) => {
    setStep(s);
    setStepKey((k) => k + 1);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const applyCoupon = async () => {
    const code = couponInput.trim();
    if (!code) return;
    if (!apiOn) {
      setCouponMsg("Coupons require the live store API.");
      return;
    }
    setCouponMsg("Checking…");
    try {
      const res = await api.validateCoupon({
        code,
        subtotal: subtotalBase,
        mobile: form.mobile || session?.mobile || undefined,
        categorySlugs: productCategory ? [productCategory] : [],
        brandSlugs: [],
      });
      if (res.valid) {
        setAppliedCoupon({ code: res.code, discount: res.discount });
        setCouponMsg(`${res.code} applied — ${fmt(res.discount)} off`);
        cart.setCouponCode(res.code);
      } else {
        setAppliedCoupon(null);
        setCouponMsg(res.reason ?? "Coupon not valid.");
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponMsg(err instanceof Error ? err.message : "Could not check coupon.");
    }
  };

  // Carry a coupon applied in the cart drawer into checkout (re-validated here).
  useEffect(() => {
    if (!apiOn || !cart.couponCode || appliedCoupon) return;
    const code = cart.couponCode;
    setCouponInput(code);
    void api
      .validateCoupon({
        code,
        subtotal: subtotalBase,
        mobile: form.mobile || session?.mobile || undefined,
        categorySlugs: productCategory ? [productCategory] : [],
        brandSlugs: [],
      })
      .then((res) => {
        if (res.valid) {
          setAppliedCoupon({ code: res.code, discount: res.discount });
          setCouponMsg(`${res.code} applied — ${fmt(res.discount)} off`);
        }
      })
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiOn, cart.couponCode]);

  // India Post pincode → city/state (authoritative for India, no permission).
  const applyPincode = async (pin: string): Promise<boolean> => {
    if (pin.length !== 6) return false;
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = (await res.json()) as Array<{
        Status?: string;
        PostOffice?: Array<{ District?: string; State?: string; Block?: string }>;
      }>;
      const po = data?.[0]?.PostOffice?.[0];
      if (data?.[0]?.Status === "Success" && po?.District) {
        patch({ city: po.District });
        setGeoMsg(`${po.District}${po.State ? `, ${po.State}` : ""} · ${pin}`);
        return true;
      }
    } catch {
      /* ignore — manual entry still works */
    }
    return false;
  };

  const detectLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setGeoMsg("Location isn't available on this device.");
      return;
    }
    setLocating(true);
    setGeoMsg(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          // GPS → pincode (BigDataCloud), then pincode → city (India Post).
          const { latitude, longitude } = pos.coords;
          const res = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`,
          );
          const data = (await res.json()) as { city?: string; locality?: string; postcode?: string };
          const pincode = (data.postcode || "").replace(/\D/g, "").slice(0, 6);
          if (pincode.length === 6) {
            patch({ pincode });
            const ok = await applyPincode(pincode);
            if (!ok && (data.city || data.locality)) {
              patch({ city: data.city || data.locality || form.city });
              setGeoMsg(`Detected ${data.city || data.locality} · ${pincode}`);
            }
          } else if (data.city || data.locality) {
            patch({ city: data.city || data.locality || form.city });
            setGeoMsg(`Detected ${data.city || data.locality} — confirm your PIN code.`);
          } else {
            setGeoMsg("Location detected — please confirm your address.");
          }
        } catch {
          setGeoMsg("Could not resolve your location. Enter it manually.");
        } finally {
          setLocating(false);
        }
      },
      (err) => {
        setLocating(false);
        setGeoMsg(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied — enter your address manually."
            : "Could not get your location.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 60000 },
    );
  };

  // Analytics: begin_checkout once on mount; purchase once when the order lands.
  const beganCheckout = useRef(false);
  useEffect(() => {
    if (beganCheckout.current) return;
    beganCheckout.current = true;
    beginCheckout({
      value: subtotalBase,
      items: orderLineItems.map((i) => ({ id: i.productKey, name: i.title, qty: i.qty })),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const purchaseFired = useRef(false);
  useEffect(() => {
    if (placed && orderId && !purchaseFired.current) {
      purchaseFired.current = true;
      purchase({
        transactionId: orderId,
        value: effTotalNum,
        items: orderLineItems.map((i) => ({ id: i.productKey, name: i.title, qty: i.qty })),
      });
    }
  }, [placed, orderId, effTotalNum, orderLineItems]);

  const placeOrder = () => {
    if (placing) return;
    setPlacing(true);
    addPaymentInfo({ value: effTotalNum, method: isPrepaid ? "prepaid" : "cod" });
    void (async () => {
      setOrderError(null);
      if (apiOn) {
        if (policyError) {
          setOrderError(policyError);
          return;
        }
        try {
          const order = await api.createOrder({
            idempotencyKey: `web-${sessionKey}-${
              isCart ? `cart-${itemsKey}` : checkoutProduct?.key ?? productKey
            }`,
            items: orderLineItems,
            paymentMethod: isPrepaid ? "prepaid" : "cod",
            gateway: isPrepaid ? gateway : "cod",
            carrierId: selectedCarrier?.id ?? undefined,
            depositPct: depositPct > 0 ? depositPct : undefined,
            fulfillmentType,
            productCategory,
            sessionKey,
            mobile: form.mobile || session?.mobile,
            pincode: form.pincode,
            city: form.city,
            shippingAddress: {
              mobile: form.mobile || session?.mobile,
              firstName: form.firstName,
              lastName: form.lastName,
              address: form.address,
              city: form.city,
              pincode: form.pincode,
            },
            couponCode: appliedCoupon?.code,
            marketingConsent: whatsappConsent,
            // Stitch the server-side purchase mirror to the same GA user.
            gaClientId: getGaClientId(),
          });
          const publicId = order?.public_id ?? null;
          const handle = order?.gatewayCheckout;
          if (isCart) cart.clear(); // order created — empty the cart

          // Real prepaid order → open the gateway payment sheet. The webhook is
          // the source of truth for capture; the handler only advances the UI.
          if (
            handle &&
            handle.provider === "razorpay" &&
            !handle.simulated &&
            handle.key &&
            handle.gatewayOrderId
          ) {
            const Razorpay = await loadRazorpay();
            const rzp = new Razorpay({
              key: handle.key,
              order_id: handle.gatewayOrderId,
              amount: handle.amount * 100,
              currency: handle.currency,
              name: "Ezurr",
              prefill: {
                name: fullName || undefined,
                contact: form.mobile || session?.mobile || undefined,
              },
              handler: () => {
                setOrderId(publicId);
                setPlaced(true);
                window.scrollTo(0, 0);
              },
              modal: {
                ondismiss: () =>
                  setOrderError(
                    "Payment was not completed. Your order is saved — you can retry payment.",
                  ),
              },
            });
            rzp.open();
            return;
          }

          // COD, or a simulated (log-mode) prepaid order → straight to success.
          setOrderId(publicId);
          setPlaced(true);
          window.scrollTo(0, 0);
          return;
        } catch (err) {
          setOrderError(
            err instanceof Error ? err.message : "Could not place order. Try again.",
          );
          return;
        }
      }

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
    })().finally(() => setPlacing(false));
  };

  const canContinueDetails =
    (!fieldRequired("mobile") || isValidMobile(form.mobile)) &&
    (!fieldRequired("address") || form.address.trim().length > 0) &&
    (!fieldRequired("firstName") || form.firstName.trim().length > 0) &&
    (!fieldRequired("lastName") || form.lastName.trim().length > 0) &&
    (!fieldRequired("city") || form.city.trim().length > 0) &&
    (!fieldRequired("pincode") || form.pincode.trim().length === 6) &&
    (!fieldRequired("upi") || form.upiId.trim().length > 0);

  if (apiOn && !policy && !policyError) {
    return (
      <div className="ez-checkout-bg min-h-screen">
        <div className="ez-checkout-shell">
          <CheckoutHeader label="Secure checkout" shortLabel="Checkout" />
          <main className="ez-page w-full py-20">
            <p className="text-sm text-[#86868B]">Loading checkout policy…</p>
          </main>
        </div>
      </div>
    );
  }

  if (apiOn && policyError && !policy) {
    return (
      <div className="ez-checkout-bg min-h-screen">
        <div className="ez-checkout-shell">
          <CheckoutHeader label="Secure checkout" shortLabel="Checkout" />
          <main className="ez-page w-full py-20">
            <p className="text-sm text-[#B42318]" role="alert">
              {policyError}
            </p>
          </main>
        </div>
      </div>
    );
  }

  if (!policy) {
    return null;
  }

  if (placed) {
    return (
      <div className="ez-checkout-bg min-h-screen">
        <div className="ez-checkout-shell">
          <CheckoutHeader
            label={isPreorder ? "Secure pre-order" : "Secure checkout"}
            shortLabel="Secure"
          />
          <main className="ez-page w-full py-14 pb-20 sm:py-20">
            <div className="ez-checkout-success mx-auto flex max-w-[520px] flex-col items-center gap-5 text-center">
              <span className="ez-mono rounded-full border border-black/[0.08] bg-white px-4 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#6E6E73] shadow-sm">
                {orderId ?? (isPreorder ? "Reserved" : "Confirmed")}
              </span>
              <h1 className="ez-display m-0 font-bold tracking-[-0.04em]">
                {isPreorder ? "You're in line." : "Order confirmed."}
              </h1>
              <p className="m-0 max-w-[420px] text-[15px] leading-relaxed text-[#6E6E73]">
                {isPreorder ? (
                  <>
                    {displayTitle} reserved at{" "}
                    <span className="font-semibold text-[var(--ez-fg)]">{lockedTotal}</span>. We&apos;ll
                    text {formatMobileDisplay(form.mobile || session?.mobile || "")} when it ships.
                  </>
                ) : (
                  <>
                    {displayTitle} · {lockedTotal}. We&apos;ll text{" "}
                    {formatMobileDisplay(form.mobile || session?.mobile || "")} with tracking updates.
                  </>
                )}
              </p>
              {isPreorder ? <CountdownBoxes size="large" /> : null}
              <TrustRail />
              <div className="mt-2 flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
                {orderId ? (
                  <Link
                    href={
                      session
                        ? `/account/orders/${encodeURIComponent(orderId)}`
                        : `/track?id=${encodeURIComponent(orderId)}`
                    }
                    className="ez-checkout-btn-dark w-full rounded-full px-8 py-3.5 text-center text-[15px] font-semibold sm:w-auto"
                  >
                    Track your order →
                  </Link>
                ) : null}
                <Link
                  href="/"
                  className="w-full rounded-full border border-[#D2D2D7] px-8 py-3.5 text-center text-[15px] font-semibold text-[#1D1D1F] transition hover:border-[#1D1D1F] sm:w-auto"
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

  const placeVerb = isPreorder ? "Place pre-order" : isPrepaid ? "Pay" : "Place order";
  const primaryLabel =
    step === 1
      ? "Continue"
      : step === 2
        ? "Review"
        : dueTodayNum > 0
          ? `${placeVerb} · ${dueToday}`
          : `${placeVerb} · ${lockedTotal}`;

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
        <CheckoutHeader
          label={isPreorder ? "Secure pre-order" : "Secure checkout"}
          shortLabel="Secure"
        />

        <main className="ez-page w-full py-6 sm:py-10 sm:pb-16">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3 sm:mb-8">
            <div className="max-w-[36rem]">
              <p className="ez-mono m-0 text-[10px] uppercase tracking-[0.2em] text-[#86868B]">
                {isPreorder ? "Pre-order reservation" : "Checkout"}
              </p>
              <h1 className="m-0 mt-2 text-[26px] font-bold tracking-[-0.045em] text-[var(--ez-fg)] sm:text-[34px]">
                {isPreorder ? "Reserve your copy" : "Complete your order"}
              </h1>
              <p className="m-0 mt-2 text-[14px] leading-relaxed text-[#6E6E73] sm:text-[15px]">
                {isPreorder
                  ? `${displayTitle} — locked at ${lockedTotal}. Nothing charged until release.`
                  : `${displayTitle} — ${lockedTotal} total, paid securely.`}
              </p>
            </div>
          </div>

          <MobileSummaryStrip
            productTitle={displayTitle}
            productImage={displayImage}
            lockedTotal={lockedTotal}
            dueToday={dueToday}
            onOpen={() => setSummaryOpen(true)}
          />

          <div className="mt-5 grid grid-cols-1 items-start gap-7 lg:mt-0 lg:grid-cols-[minmax(0,1.2fr)_360px] lg:gap-10">
            <div className="ez-checkout-panel min-w-0 rounded-[20px] p-5 sm:p-7 lg:p-8">
              <CheckoutProgress step={step} />

              {apiOn ? (
                <div className="mt-5 rounded-[14px] border border-[#E0E0E5] bg-[#FAFAFB] p-4">
                  <div className="flex items-center justify-between gap-2">
                    <FieldLabel>Have a coupon?</FieldLabel>
                    {appliedCoupon ? (
                      <button
                        type="button"
                        onClick={() => {
                          setAppliedCoupon(null);
                          setCouponInput("");
                          setCouponMsg(null);
                          cart.setCouponCode(null);
                        }}
                        className="text-[11px] font-semibold text-[#B42318]"
                      >
                        Remove
                      </button>
                    ) : null}
                  </div>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      aria-label="Coupon code"
                      className="h-11 flex-1 rounded-[12px] border border-[#E0E0E5] bg-white px-3 text-sm outline-none focus:border-[#1D1D1F]"
                    />
                    <button
                      type="button"
                      onClick={() => void applyCoupon()}
                      className="h-11 shrink-0 rounded-[12px] bg-[var(--ez-ink)] px-5 text-xs font-semibold text-white"
                    >
                      {appliedCoupon ? "Update" : "Apply"}
                    </button>
                  </div>
                  {couponMsg ? (
                    <p
                      className={`mt-1.5 text-[11px] font-medium ${
                        appliedCoupon ? "text-[#2D6B3C]" : "text-[#B42318]"
                      }`}
                    >
                      {couponMsg}
                    </p>
                  ) : null}
                </div>
              ) : null}

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
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <h2 className="m-0 text-[19px] font-bold tracking-[-0.03em] sm:text-[21px]">
                          Where should it go?
                        </h2>
                        {showField("pincode") || showField("city") ? (
                          <button
                            type="button"
                            onClick={detectLocation}
                            disabled={locating}
                            className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[#D2D2D7] bg-white px-3 py-1.5 text-[12px] font-semibold text-[#1D1D1F] transition hover:border-[#1D1D1F] disabled:opacity-50"
                          >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" aria-hidden>
                              <path
                                d="M12 21s7-6.5 7-11a7 7 0 1 0-14 0c0 4.5 7 11 7 11Z"
                                stroke="currentColor"
                                strokeWidth="1.8"
                                strokeLinejoin="round"
                              />
                              <circle cx="12" cy="10" r="2.4" stroke="currentColor" strokeWidth="1.8" />
                            </svg>
                            {locating ? "Locating…" : "Use my location"}
                          </button>
                        ) : null}
                      </div>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-[#6E6E73] sm:text-[14px]">
                        {isPreorder
                          ? "Delivery for your physical copy. Nothing due until release."
                          : "Where we'll deliver your order."}
                      </p>
                      {geoMsg ? (
                        <p className="mt-1.5 text-[12px] font-medium text-[#2D6B3C]">{geoMsg}</p>
                      ) : null}
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
                          onChange={(v) => {
                            const pin = v.replace(/\D/g, "").slice(0, 6);
                            patch({ pincode: pin });
                            if (pin.length === 6) void applyPincode(pin);
                          }}
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

                    <label className="mt-1 flex items-start gap-2.5 text-[12px] leading-snug text-[#6E6E73]">
                      <input
                        type="checkbox"
                        checked={whatsappConsent}
                        onChange={(e) => setWhatsappConsent(e.target.checked)}
                        className="mt-0.5 accent-[#1D1D1F]"
                      />
                      <span>
                        Send me order updates and offers on WhatsApp. You can opt out anytime.
                      </span>
                    </label>

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
                          ? isPreorder
                            ? `Prepaid saves ${pct}%. Charged on release — not today.`
                            : `Prepaid saves ${pct}%. Paid securely now.`
                          : "Choose how you'd like to pay on delivery."}
                      </p>
                    </div>

                    {policyError ? (
                      <p className="m-0 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3.5 text-[13px] text-[#B42318]" role="alert">
                        {policyError}
                      </p>
                    ) : null}

                    {orderError ? (
                      <p className="m-0 rounded-[14px] border border-[#FECACA] bg-[#FEF2F2] px-4 py-3.5 text-[13px] text-[#B42318]" role="alert">
                        {orderError}
                      </p>
                    ) : null}

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
                        {isPreorder ? "Confirm reservation" : "Review & confirm"}
                      </h2>
                      <p className="mt-1.5 text-[13px] text-[#6E6E73] sm:text-[14px]">
                        {isPreorder
                          ? "One guarantee: if the price drops before release, you pay the lower amount."
                          : "Review your details and place the order."}
                      </p>
                    </div>

                    <dl className="overflow-hidden rounded-[14px] border border-black/[0.08] bg-[#FAFAFB]">
                      {[
                        ["Item", productTitle],
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
                        disabled={policy.blocked || placing}
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
              productTitle={displayTitle}
              productSubtitle={displaySubtitle}
              productImage={displayImage}
              subtotal={effSubtotal}
              isPrepaid={isPrepaid}
              isPreorder={isPreorder}
              pct={pct}
              discount={effDiscount}
              lockedTotal={lockedTotal}
              releaseLabel={releaseLabel}
              shippingLabel={shippingLabel}
              taxAmount={effTaxAmount}
              taxMessage={policy.taxInclusiveMessage}
              taxRatePct={policy.taxRatePct}
              dueToday={dueToday}
            />
          </div>
        </main>

        <StickyFooterCta
          label={primaryLabel}
          dueToday={dueToday}
          onClick={primaryAction}
          disabled={(step === 1 && !canContinueDetails) || policy.blocked || placing}
        />

        <MobileSummarySheet
          open={summaryOpen}
          onClose={() => setSummaryOpen(false)}
          productTitle={displayTitle}
          productSubtitle={displaySubtitle}
          productImage={displayImage}
          subtotal={effSubtotal}
          isPrepaid={isPrepaid}
          isPreorder={isPreorder}
          pct={pct}
          discount={effDiscount}
          lockedTotal={lockedTotal}
          releaseLabel={releaseLabel}
          shippingLabel={shippingLabel}
          taxAmount={effTaxAmount}
          taxMessage={policy.taxInclusiveMessage}
          dueToday={dueToday}
        />
      </div>
    </div>
  );
}

