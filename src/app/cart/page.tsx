"use client";

import Link from "next/link";
import Image from "next/image";
import { MicroBar } from "@/components/layout/MicroBar";
import { Header } from "@/components/layout/Header";
import { FooterFull } from "@/components/layout/Footer";
import { formatInr } from "@/data/admin";
import { useCart } from "@/lib/cart";
import { DEFAULT_IMG } from "@/lib/productResolve";

export default function CartPage() {
  const cart = useCart();

  return (
    <div className="min-h-screen bg-white">
      <MicroBar />
      <Header active="games" />

      <div className="ez-page py-8 sm:py-12">
        <h1 className="text-[clamp(1.8rem,3vw,2.6rem)] font-bold tracking-[-0.04em] text-[#111113]">
          Your cart
        </h1>

        {!cart.hydrated ? (
          <p className="mt-6 text-sm text-[#86868B]">Loading…</p>
        ) : cart.items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-black/[0.07] bg-[#F8F8FA] p-10 text-center">
            <p className="text-base font-semibold text-[#1D1D1F]">Your cart is empty</p>
            <p className="mt-1 text-sm text-[#86868B]">
              Browse the store and add something you love.
            </p>
            <Link
              href="/games"
              className="ez-btn-primary mt-5 inline-flex min-h-11 items-center justify-center rounded-full px-6 text-sm font-semibold"
            >
              Browse games
            </Link>
          </div>
        ) : (
          <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
            {/* Line items */}
            <ul className="flex flex-col divide-y divide-black/[0.06] rounded-2xl border border-black/[0.07] bg-white">
              {cart.items.map((item) => (
                <li key={item.productKey} className="flex gap-4 p-4 sm:p-5">
                  <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-[#E8E8ED] bg-[#f8f8fa]">
                    <Image
                      src={item.image || DEFAULT_IMG}
                      alt={item.title}
                      fill
                      className="object-contain p-1.5"
                      sizes="80px"
                      unoptimized
                    />
                  </div>

                  <div className="flex min-w-0 flex-1 flex-col">
                    <div className="flex items-start justify-between gap-3">
                      <p className="min-w-0 truncate text-[15px] font-semibold text-[#111113]">
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
                    <p className="mt-0.5 text-[13px] text-[#86868B]">
                      {formatInr(item.price)} each
                    </p>

                    <div className="mt-auto flex items-center justify-between gap-3 pt-3">
                      <div className="inline-flex items-center rounded-full border border-black/[0.12]">
                        <button
                          type="button"
                          onClick={() => cart.setQty(item.productKey, item.qty - 1)}
                          className="flex h-9 w-9 items-center justify-center text-lg text-[#1D1D1F]"
                          aria-label="Decrease quantity"
                        >
                          −
                        </button>
                        <span className="ez-mono w-8 text-center text-sm font-semibold">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => cart.setQty(item.productKey, item.qty + 1)}
                          className="flex h-9 w-9 items-center justify-center text-lg text-[#1D1D1F]"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>
                      <p className="text-[15px] font-semibold text-[#111113]">
                        {formatInr(item.price * item.qty)}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            {/* Summary */}
            <aside className="h-fit rounded-2xl border border-black/[0.07] bg-white p-5 lg:sticky lg:top-24">
              <h2 className="ez-mono text-[10px] font-bold uppercase tracking-[0.14em] text-[#86868B]">
                Order summary
              </h2>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="text-[#6E6E73]">Subtotal ({cart.count} items)</span>
                <span className="font-semibold text-[#111113]">{formatInr(cart.subtotal)}</span>
              </div>
              <p className="mt-2 text-[12px] text-[#86868B]">
                Taxes, discounts &amp; shipping are calculated at checkout.
              </p>
              <Link
                href="/checkout"
                className="ez-btn-primary mt-5 flex min-h-12 w-full items-center justify-center rounded-full text-sm font-semibold"
              >
                Proceed to checkout
              </Link>
              <div className="mt-3 flex items-center justify-between">
                <Link href="/games" className="text-[12px] font-semibold text-[#1D1D1F] hover:underline">
                  ← Continue shopping
                </Link>
                <button
                  type="button"
                  onClick={() => cart.clear()}
                  className="text-[12px] font-semibold text-[#86868B] hover:text-[#B42318]"
                >
                  Clear cart
                </button>
              </div>
            </aside>
          </div>
        )}
      </div>

      <FooterFull />
    </div>
  );
}
