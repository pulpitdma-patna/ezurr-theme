"use client";

import Link from "next/link";
import Image from "next/image";
import { useEffect, useState } from "react";
import { formatInr } from "@/data/admin";
import { useCart } from "@/lib/cart";
import { DEFAULT_IMG } from "@/lib/productResolve";
import { api, isApiEnabled } from "@/lib/apiClient";

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
        className={`absolute inset-0 bg-black/45 transition-opacity duration-300 ${
          drawerOpen ? "opacity-100" : "opacity-0"
        }`}
      />

      {/* Panel: bottom sheet on mobile, right drawer on desktop */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Your cart"
        className={`absolute inset-x-0 bottom-0 flex max-h-[85vh] flex-col rounded-t-[22px] bg-white shadow-[0_-12px_50px_rgba(17,17,19,0.18)] transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] sm:inset-y-0 sm:right-0 sm:left-auto sm:bottom-auto sm:h-full sm:max-h-none sm:w-[420px] sm:rounded-none ${
          drawerOpen
            ? "translate-y-0 sm:translate-x-0"
            : "translate-y-full sm:translate-y-0 sm:translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-black/[0.07] px-5 py-4">
          <h2 className="text-[15px] font-semibold tracking-[-0.02em]">
            Your cart{cart.count > 0 ? ` · ${cart.count}` : ""}
          </h2>
          <button
            type="button"
            onClick={closeDrawer}
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-full text-lg text-[#86868B] hover:bg-black/[0.05]"
          >
            ×
          </button>
        </div>

        {/* Items */}
        {cart.items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-16 text-center">
            <p className="text-sm font-semibold text-[#1D1D1F]">Your cart is empty</p>
            <p className="text-sm text-[#86868B]">Add something you love to get started.</p>
            <Link
              href="/games"
              onClick={closeDrawer}
              className="ez-btn-primary mt-2 inline-flex min-h-10 items-center rounded-full px-5 text-sm font-semibold"
            >
              Browse games
            </Link>
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-black/[0.06] overflow-y-auto px-4">
            {cart.items.map((item) => (
              <li key={item.productKey} className="flex gap-3 py-4">
                <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl border border-[#E8E8ED] bg-[#f8f8fa]">
                  <Image
                    src={item.image || DEFAULT_IMG}
                    alt={item.title}
                    fill
                    className="object-contain p-1"
                    sizes="64px"
                    unoptimized
                  />
                </div>
                <div className="flex min-w-0 flex-1 flex-col">
                  <div className="flex items-start justify-between gap-2">
                    <p className="min-w-0 truncate text-[14px] font-semibold text-[#111113]">
                      {item.title}
                    </p>
                    <button
                      type="button"
                      onClick={() => cart.removeItem(item.productKey)}
                      className="shrink-0 text-[11px] font-semibold text-[#B42318] hover:underline"
                      aria-label={`Remove ${item.title}`}
                    >
                      Remove
                    </button>
                  </div>
                  <p className="mt-0.5 text-[12px] text-[#86868B]">{formatInr(item.price)} each</p>
                  <div className="mt-auto flex items-center justify-between gap-3 pt-2">
                    <div className="inline-flex items-center rounded-full border border-black/[0.12]">
                      <button
                        type="button"
                        onClick={() => cart.setQty(item.productKey, item.qty - 1)}
                        className="flex h-8 w-8 items-center justify-center text-lg text-[#1D1D1F]"
                        aria-label="Decrease quantity"
                      >
                        −
                      </button>
                      <span className="ez-mono w-7 text-center text-sm font-semibold">{item.qty}</span>
                      <button
                        type="button"
                        onClick={() => cart.setQty(item.productKey, item.qty + 1)}
                        className="flex h-8 w-8 items-center justify-center text-lg text-[#1D1D1F]"
                        aria-label="Increase quantity"
                      >
                        +
                      </button>
                    </div>
                    <p className="text-[14px] font-semibold text-[#111113]">
                      {formatInr(item.price * item.qty)}
                    </p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {/* Footer */}
        {cart.items.length > 0 ? (
          <div className="border-t border-black/[0.07] px-5 py-4">
            {apiOn ? (
              <div className="mb-3">
                {cart.couponCode ? (
                  <div className="flex items-center justify-between rounded-[10px] border border-[#A6D5B0] bg-[#EAF6ED] px-3 py-2">
                    <span className="text-[12px] font-semibold text-[#2D6B3C]">
                      Coupon {cart.couponCode} added
                    </span>
                    <button
                      type="button"
                      onClick={removeCoupon}
                      className="text-[11px] font-semibold text-[#B42318]"
                    >
                      Remove
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="flex gap-2">
                      <input
                        value={couponInput}
                        onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                        placeholder="Coupon code"
                        aria-label="Coupon code"
                        className="h-10 flex-1 rounded-[10px] border border-[#E0E0E5] bg-white px-3 text-sm outline-none focus:border-[#1D1D1F]"
                      />
                      <button
                        type="button"
                        onClick={() => void applyCoupon()}
                        disabled={checking || !couponInput.trim()}
                        className="h-10 shrink-0 rounded-[10px] bg-[#1D1D1F] px-4 text-xs font-semibold text-white disabled:opacity-50"
                      >
                        Apply
                      </button>
                    </div>
                    {couponMsg ? (
                      <p
                        className={`mt-1.5 text-[11px] font-medium ${
                          couponOk ? "text-[#2D6B3C]" : "text-[#B42318]"
                        }`}
                      >
                        {couponMsg}
                      </p>
                    ) : null}
                  </>
                )}
              </div>
            ) : null}
            <div className="flex items-center justify-between text-sm">
              <span className="text-[#6E6E73]">Subtotal</span>
              <span className="font-semibold text-[#111113]">{formatInr(cart.subtotal)}</span>
            </div>
            <p className="mt-1 text-[11px] text-[#86868B]">
              Taxes, discounts &amp; shipping calculated at checkout.
            </p>
            <Link
              href="/checkout"
              onClick={closeDrawer}
              className="ez-btn-primary mt-3 flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold"
            >
              Proceed to checkout
            </Link>
            <button
              type="button"
              onClick={closeDrawer}
              className="mt-2 block w-full text-center text-[12px] font-semibold text-[#1D1D1F] hover:underline"
            >
              Continue shopping
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  );
}
