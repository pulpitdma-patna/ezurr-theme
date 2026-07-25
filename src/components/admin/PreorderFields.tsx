"use client";

import { useId } from "react";

export type FulfilmentType = "physical" | "digital" | "preorder";

export type FulfilmentValues = {
  type: FulfilmentType;
  /** YYYY-MM-DD for <input type="date">; "" when unset. */
  releaseAt: string;
  /** Whole ₹ as typed; "" means "not set" (server stores null). */
  reservationAmount: string;
};

export const emptyFulfilment: FulfilmentValues = {
  type: "physical",
  releaseAt: "",
  reservationAmount: "",
};

export function isFulfilmentType(value: unknown): value is FulfilmentType {
  return value === "physical" || value === "digital" || value === "preorder";
}

export function normalizeFulfilmentType(value: unknown): FulfilmentType {
  return isFulfilmentType(value) ? value : "physical";
}

export const fulfilmentLabels: Record<FulfilmentType, string> = {
  physical: "Physical",
  digital: "Digital",
  preorder: "Pre-order",
};

/** Product fields this component reads — a structural subset of the API product. */
export type FulfilmentSource = {
  fulfillment_type?: string | null;
  release_at?: string | null;
  reservation_amount?: number | string | null;
};

/**
 * `release_at` is a Laravel date cast, so it serializes with a time component
 * ("2026-11-19T00:00:00.000000Z"); <input type="date"> only accepts the day.
 */
export function toDateInput(raw: unknown): string {
  if (typeof raw !== "string") return "";
  const trimmed = raw.trim();
  return trimmed.length >= 10 ? trimmed.slice(0, 10) : "";
}

export function fulfilmentFromApi(product: FulfilmentSource | null | undefined): FulfilmentValues {
  const amount = product?.reservation_amount;
  return {
    type: normalizeFulfilmentType(product?.fulfillment_type),
    releaseAt: toDateInput(product?.release_at),
    reservationAmount: amount === null || amount === undefined ? "" : String(amount),
  };
}

/**
 * Fulfilment → the three fields ProductController validates. Release date and
 * reservation are nulled whenever the product is not a pre-order, so demoting a
 * product can't leave a stale release date the storefront would still honour.
 */
export function fulfilmentToPayload(value: FulfilmentValues): {
  fulfillment_type: FulfilmentType;
  release_at: string | null;
  reservation_amount: number | null;
} {
  if (value.type !== "preorder") {
    return { fulfillment_type: value.type, release_at: null, reservation_amount: null };
  }
  const digits = value.reservationAmount.replace(/[^\d]/g, "");
  const parsed = Number(digits);
  return {
    fulfillment_type: "preorder",
    release_at: value.releaseAt || null,
    reservation_amount: digits === "" || !Number.isFinite(parsed) ? null : Math.max(0, parsed),
  };
}

/**
 * ProductForm still owns a legacy "Digital product" checkbox bound to the same
 * `fulfillment_type` column. Mirror it both ways so the two controls can never
 * disagree about what gets sent.
 */
export function applyDigitalToggle(value: FulfilmentValues, digital: boolean): FulfilmentValues {
  if (digital) return value.type === "digital" ? value : { ...value, type: "digital" };
  return value.type === "digital" ? { ...value, type: "physical" } : value;
}

const OPTIONS: { value: FulfilmentType; hint: string }[] = [
  { value: "physical", hint: "Ships from on-hand stock" },
  { value: "digital", hint: "Code from the vault" },
  { value: "preorder", hint: "Reserved before release" },
];

const inputClass =
  "w-full rounded-md border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

export function PreorderFields({
  value,
  onChange,
  embedded = false,
}: {
  value: FulfilmentValues;
  onChange: (next: FulfilmentValues) => void;
  /** Strip outer card chrome when used inside a drawer. */
  embedded?: boolean;
}) {
  const groupName = useId();
  const isPreorder = value.type === "preorder";

  return (
    <section
      className={
        embedded
          ? "space-y-3"
          : "mb-4 max-w-2xl space-y-3 rounded-lg border border-black/[0.08] bg-white p-5 sm:p-6"
      }
    >
      <h2 className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
        Fulfilment
      </h2>

      <div className="grid gap-2 sm:grid-cols-3">
        {OPTIONS.map((option) => {
          const active = value.type === option.value;
          return (
            <label
              key={option.value}
              className={`flex cursor-pointer flex-col gap-0.5 rounded-lg border px-3 py-2.5 transition focus-within:outline focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-[#1D1D1F] ${
                active
                  ? "border-[#1D1D1F] bg-[#1D1D1F] text-white"
                  : "border-black/[0.08] bg-[#F7F7F8] hover:border-black/20"
              }`}
            >
              <input
                type="radio"
                name={groupName}
                value={option.value}
                checked={active}
                onChange={() => onChange({ ...value, type: option.value })}
                className="sr-only"
              />
              <span className="text-xs font-semibold">{fulfilmentLabels[option.value]}</span>
              <span className={`text-[10px] ${active ? "text-white/60" : "text-[#86868B]"}`}>
                {option.hint}
              </span>
            </label>
          );
        })}
      </div>

      {isPreorder ? (
        <div className="grid gap-4 rounded-lg border border-black/[0.06] bg-[#FAFAFB] p-4 sm:grid-cols-2">
          <label className="flex flex-col gap-1.5">
            <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
              Release date
            </span>
            <input
              type="date"
              value={value.releaseAt}
              onChange={(event) => onChange({ ...value, releaseAt: event.target.value })}
              className={inputClass}
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
              Reservation amount (₹)
            </span>
            <input
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              placeholder="0"
              value={value.reservationAmount}
              onChange={(event) => onChange({ ...value, reservationAmount: event.target.value })}
              className={inputClass}
            />
          </label>

          <p className="text-[11px] leading-relaxed text-[#86868B] sm:col-span-2">
            Flat amount collected up front to hold one unit. <strong>0 means free to reserve.</strong>{" "}
            The balance of the price is charged when the title releases — the server is what quotes
            both figures at checkout.
          </p>
        </div>
      ) : null}
    </section>
  );
}
