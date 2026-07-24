"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { formatInr } from "@/data/admin";
import { useCart } from "@/lib/cart";
import { DEFAULT_IMG } from "@/lib/productResolve";
import { api, isApiEnabled } from "@/lib/apiClient";

function CloseIcon() {
  return (
    <svg viewBox="0 0 14 14" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M3 3l8 8M11 3l-8 8"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" aria-hidden>
      <path
        d="M3.5 4.5h9M6 4.5V3.75A.75.75 0 0 1 6.75 3h2.5a.75.75 0 0 1 .75.75V4.5M6.25 7v4.25M9.75 7v4.25M4.25 4.5l.55 7.7a1 1 0 0 0 1 .9h4.5a1 1 0 0 0 1-.9l.55-7.7"
        stroke="currentColor"
        strokeWidth="1.45"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function MinusIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      <path d="M2.5 6h7" stroke="currentColor" strokeWidth="1.35" strokeLinecap="round" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3 w-3" fill="none" aria-hidden>
      <path
        d="M6 2.5v7M2.5 6h7"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GhostIconButton({
  label,
  onClick,
  className = "",
  children,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[#EBCBC8] bg-[#FEF3F2]/75 text-[#C4322B] transition hover:border-[#E5A8A3] hover:bg-[#FEF3F2] hover:text-[#B42318] active:scale-[0.97] ${className}`}
    >
      {children}
    </button>
  );
}

/**
 * Cart as a slide-out drawer (desktop, from the right) / bottom sheet (mobile).
 * Opened from the header bag via cart.openDrawer(). Money stays display-only —
 * the checkout re-prices server-side.
 */
export function CartDrawer() {
  const cart = useCart();
  const { drawerOpen, closeDrawer } = cart;
  const apiOn = isApiEnabled();
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const [couponOk, setCouponOk] = useState(false);
  const [checking, setChecking] = useState(false);

  async function applyCoupon() {
    const code = couponInput.trim();
    if (!code) return;
    setChecking(true);
    setCouponMsg("Checking…");
    try {
      const res = await api.validateCoupon({ code, subtotal: cart.subtotal });
      if (res.valid) {
        cart.setCouponCode(res.code);
        setCouponOk(true);
        setCouponMsg(`${res.code} applied — ${formatInr(res.discount)} off at checkout`);
      } else {
        cart.setCouponCode(null);
        setCouponOk(false);
        setCouponMsg(res.reason ?? "Coupon not valid.");
      }
    } catch (e) {
      setCouponOk(false);
      setCouponMsg(e instanceof Error ? e.message : "Could not check coupon.");
    } finally {
      setChecking(false);
    }
  }

  function removeCoupon() {
    cart.setCouponCode(null);
    setCouponInput("");
    setCouponMsg(null);
    setCouponOk(false);
  }

  // Lock body scroll + close on Escape while open.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeDrawer();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [drawerOpen, closeDrawer]);

  return (
    <div
      className={`fixed inset-0 z-[100] ${drawerOpen ? "" : "pointer-events-none"}`}
      aria-hidden={!drawerOpen}
    >
      {/* Scrim */}
      <button
        type="button"
        aria-label="Close cart"
        onClick={closeDrawer}
        className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel: bottom sheet on mobile, right drawer on desktop */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className={`absolute inset-x-0 bottom-0 flex max-h-[88vh] flex-col overflow-hidden rounded-t-[24px] bg-white shadow-[0_-16px_60px_rgba(17,17,19,0.16)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:max-h-none sm:w-[520px] sm:rounded-none sm:border-l sm:border-[var(--ez-accent-panel-border)] sm:shadow-[-24px_0_80px_rgba(17,17,19,0.12)] ${
          drawerOpen
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="relative shrink-0 overflow-hidden border-b border-black/[0.06] bg-gradient-to-b from-[var(--ez-accent-panel)]/65 to-[var(--ez-warm-surface)] px-5 py-4 sm:px-6">
          <div
            className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-transparent via-[var(--ez-accent)]/40 to-transparent"
            aria-hidden
          />
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="ez-mono text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--ez-accent-soft-text)]">
                Shopping bag
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <h2 className="text-[21px] font-bold leading-none tracking-[-0.04em] text-[var(--ez-ink)] sm:text-[22px]">
                  Your cart
                </h2>
                {cart.count > 0 ? (
                  <span className="inline-flex items-center rounded-full border border-[var(--ez-accent-panel-border)] bg-white px-3 py-1 text-[12px] font-semibold tracking-[-0.01em] text-[var(--ez-accent-soft-text)] shadow-[0_1px_3px_rgba(17,17,19,0.05)]">
                    {cart.count} {cart.count === 1 ? "item" : "items"}
                  </span>
                ) : null}
              </div>
            </div>
            <GhostIconButton
              label="Close cart"
              onClick={closeDrawer}
              className="h-10 w-10"
            >
              <CloseIcon />
            </GhostIconButton>
          </div>
        </div>

        {/* Items */}
        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 bg-[var(--ez-warm-surface)] px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-black/[0.06] bg-white shadow-[0_8px_24px_rgba(17,17,19,0.06)]">
              <svg viewBox="0 0 24 24" className="h-6 w-6 text-[var(--ez-subtle)]" fill="none" aria-hidden>
                <path
                  d="M6 8h12l-1.2 12.2a1.5 1.5 0 0 1-1.5 1.3H8.7a1.5 1.5 0 0 1-1.5-1.3L6 8z"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M9 10V6a3 3 0 0 1 6 0v4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <p className="text-[15px] font-semibold text-[var(--ez-ink)]">Your cart is empty</p>
            <p className="max-w-[240px] text-sm leading-relaxed text-[var(--ez-subtle)]">
              Add something you love to get started.
            </p>
            <Link
              href="/games"
              onClick={closeDrawer}
              className="ez-btn-primary mt-2 inline-flex min-h-11 items-center rounded-full px-6 text-sm font-semibold shadow-[0_8px_28px_oklch(0.4_0.16_var(--ez-h)/0.32)]"
            >
              Browse games
            </Link>
          </div>
        ) : (
          <ul className="flex-1 overflow-y-auto bg-[var(--ez-warm-surface)] px-4 py-2 sm:px-5">
            {cart.items.map((item) => (
              <li
                key={item.productKey}
                className="border-b border-black/[0.05] py-4 last:border-b-0"
              >
                <div className="flex gap-3.5 sm:gap-4">
                  <div className="relative h-[72px] w-[72px] shrink-0 overflow-hidden rounded-[14px] border border-[var(--ez-border)] bg-white shadow-[0_4px_16px_rgba(17,17,19,0.05)] sm:h-[76px] sm:w-[76px]">
                    <Image
                      src={item.image || DEFAULT_IMG}
                      alt={item.title}
                      fill
                      className="object-contain p-2"
                      sizes="76px"
                      unoptimized
                    />
                  </div>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-[14px] font-semibold leading-snug tracking-[-0.01em] text-[var(--ez-ink)] sm:text-[15px]">
                          {item.title}
                        </p>
                        <p className="ez-mono mt-1 text-[11px] font-medium text-[var(--ez-subtle)] sm:text-[12px]">
                          {formatInr(item.price)} each
                        </p>
                      </div>
                      <GhostIconButton
                        label={`Remove ${item.title}`}
                        onClick={() => cart.removeItem(item.productKey)}
                      >
                        <TrashIcon />
                      </GhostIconButton>
                    </div>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="inline-flex items-center rounded-full border border-black/[0.1] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.04)]">
                        <button
                          type="button"
                          onClick={() => cart.setQty(item.productKey, item.qty - 1)}
                          className="flex h-8 w-8 items-center justify-center text-[var(--ez-ink)] transition hover:bg-black/[0.03]"
                          aria-label="Decrease quantity"
                        >
                          <MinusIcon />
                        </button>
                        <span className="ez-mono w-8 border-x border-black/[0.08] py-1 text-center text-[13px] font-semibold text-[var(--ez-ink)]">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQty(item.productKey, item.qty + 1)}
                          className="flex h-8 w-8 items-center justify-center text-[var(--ez-ink)] transition hover:bg-black/[0.03]"
                          aria-label="Increase quantity"
                        >
                          <PlusIcon />
                        </button>
                      </div>
                      <p className="ez-mono text-[14px] font-semibold tracking-[-0.02em] text-[var(--ez-ink)] sm:text-[15px]">
                        {formatInr(item.price * item.qty)}
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        {cart.items.length > 0 ? (
          <div className="shrink-0 border-t border-black/[0.06] bg-white px-5 pb-5 pt-4 shadow-[0_-12px_40px_rgba(17,17,19,0.06)] sm:px-6 sm:pb-6">
            {apiOn ? (
              <div className="mb-4">
                {cart.couponCode ? (
                  <div className="flex items-center justify-between gap-3 rounded-[12px] border border-[var(--ez-accent-panel-border)] bg-[var(--ez-accent-panel)] px-3.5 py-2.5">
                    <div className="min-w-0">
                      <p className="ez-mono text-[10px] font-bold uppercase tracking-[0.12em] text-[var(--ez-accent-soft-text)]">
                        Coupon applied
                      </p>
                      <p className="mt-0.5 truncate text-[13px] font-semibold text-[var(--ez-ink)]">
                        {cart.couponCode}
                      </p>
                    </div>
                    <GhostIconButton
                      label={`Remove coupon ${cart.couponCode}`}
                      onClick={removeCoupon}
                    >
                      <TrashIcon />
                    </GhostIconButton>
                  </div>
                ) : (
                  <>
                    <label className="ez-mono mb-2 block text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ez-subtle)]">
                      Promo code
                    </label>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Enter code"
                        aria-label="Coupon code"
                        className="h-11 flex-1 rounded-[12px] border border-[var(--ez-border)] bg-[var(--ez-warm-surface)] px-3.5 text-sm text-[var(--ez-ink)] outline-none transition focus:border-[var(--ez-accent)] focus:bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => void applyCoupon()}
                        disabled={checking || !couponInput.trim()}
                        className="h-11 shrink-0 rounded-[12px] bg-[var(--ez-ink)] px-4 text-xs font-semibold text-white transition hover:bg-[#2a2a2d] disabled:opacity-45"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg ? (
                      <p
                        className={`mt-2 text-[12px] font-medium ${
                          couponOk ? "text-[var(--ez-in-stock)]" : "text-[#B42318]"
                        }`}
                      >
                        {couponMsg}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}

            <div className="rounded-[14px] border border-black/[0.06] bg-[var(--ez-warm-surface)] px-4 py-3.5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[var(--ez-subtle)]">
                    Subtotal
                  </p>
                  <p className="mt-0.5 text-[12px] text-[var(--ez-muted)]">
                    {cart.count} {cart.count === 1 ? "item" : "items"}
                  </p>
                </div>
                <span className="text-[18px] font-semibold tracking-[-0.03em] text-[var(--ez-ink)]">
                  {formatInr(cart.subtotal)}
                </span>
              </div>
              <p className="mt-2 border-t border-black/[0.05] pt-2 text-[11px] leading-relaxed text-[var(--ez-subtle)]">
                Taxes, discounts &amp; shipping calculated at checkout.
              </p>
            </div>

            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="ez-btn-primary mt-4 flex min-h-[52px] w-full items-center justify-center rounded-full text-[14px] font-semibold shadow-[0_8px_28px_oklch(0.4_0.16_var(--ez-h)/0.38)] transition hover:brightness-105 active:scale-[0.98]"
            >
              Proceed to checkout
            </Link>
            <button
              type="button"
              onClick={closeDrawer}
              className="mt-3 block w-full text-center text-[13px] font-semibold text-[var(--ez-accent-text)] transition hover:underline hover:underline-offset-2"
            >
              Continue shopping
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
