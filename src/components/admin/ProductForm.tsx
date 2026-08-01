"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  adminProductTabs,
  type AdminPlatform,
  type AdminProductCategory,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { api, isApiEnabled } from "@/lib/apiClient";
import { ImageUploadField } from "@/components/admin/ImageUploadField";
import { formatAdminDate } from "@/lib/adminFormat";

/**
 * What the owner fills in to put something on his website.
 *
 * Two fields left this shape and are not coming back:
 *
 *  - **SKU.** An editable text box that `productApiPayload` never sent. There is
 *    no `sku` column on products. He typed the code off the box in his hand,
 *    pressed Save, read "Product saved" in green, and the value went nowhere.
 *    The real shelf code — GAMCXBOX249, which all 298 products already carry at
 *    `meta.variants[0].sku` — is now shown read-only with a Copy button, under
 *    the name he uses for it: Item code.
 *
 *  - **Edition.** Same: editable, never sent, no column, and pre-filled with the
 *    invented word "Standard" on every product in the catalogue.
 *
 * `status` is gone too. It offered Draft / Published / **Sold out**, and Sold
 * out saved `active: false` — which takes the product off the website rather
 * than marking it sold out. Live or hidden is now the name of the button he
 * presses; sold out is derived from stock, where it comes from.
 */
export type ProductFormValues = {
  category: AdminProductCategory;
  name: string;
  brand: string;
  /** Read-only. The code on the shelf label, from the import. */
  itemCode: string;
  /** Read-only. Derived from the product's tags, with nowhere to save an edit. */
  platform: AdminPlatform;
  /** Read-only + Copy. The product's page on the website. */
  webAddress: string;
  description: string;
  price: string;
  /** MRP — the struck-through figure. */
  strike: string;
  /** What he paid his supplier, per item. "" means he has not said — never 0. */
  cost: string;
  /** Does the entered price already contain GST? Defaults to true. */
  taxInclusive: boolean;
  stock: string;
  /** How does the customer get it? */
  delivery: "physical" | "digital";
  /** YYYY-MM-DD. A future date makes this a pre-order. */
  releaseAt: string;
  /** Advance to book, in whole ₹. "" means not set. */
  advance: string;
  /** Live on the website, or hidden. Sold out is never chosen. */
  onWebsite: boolean;
  image: string;
};

export const emptyProductForm: ProductFormValues = {
  category: "games",
  name: "",
  brand: "",
  itemCode: "",
  platform: "Multi",
  webAddress: "",
  description: "",
  price: "",
  strike: "",
  cost: "",
  taxInclusive: true,
  // Deliberately empty. It used to default to "10", so every product created in
  // a hurry claimed ten units on the shelf — and the shop sold stock it did not
  // have. He is holding the box; ask him.
  stock: "",
  delivery: "physical",
  releaseAt: "",
  advance: "",
  onWebsite: true,
  image: "",
};

const inputClass =
  "w-full rounded-lg border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

function isValidInr(value: string) {
  if (!value.trim()) return false;
  const n = Number(value.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) && n >= 0;
}

export function ProductForm({
  form,
  update,
  onSubmit,
  onSubmitHidden,
  mode,
  banner,
  bannerTone = "success",
  submitting = false,
  onCancel,
  onDelete,
  extraCategories,
  onExtraCategoriesChange,
  codesPanel,
}: {
  form: ProductFormValues;
  update: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void;
  /** Save and put it on the website. */
  onSubmit: () => void;
  /** Save but keep it hidden. */
  onSubmitHidden: () => void;
  mode: "add" | "edit";
  banner?: string;
  bannerTone?: "success" | "error";
  submitting?: boolean;
  onCancel?: () => void;
  onDelete?: () => void;
  /** "Also show in" — the multi-category pivot. */
  extraCategories?: string[];
  onExtraCategoriesChange?: (next: string[]) => void;
  /** Game codes, when this product is delivered by email. */
  codesPanel?: React.ReactNode;
}) {
  const store = useAdminStore();
  const apiOn = isApiEnabled();
  const brandOptions = store.brands.filter((b) => b.active);

  /**
   * Categories come from the server in API mode.
   *
   * This read `store.categories` — the localStorage mock, seeded with the same
   * five slugs the theme has always shipped. So an owner who created "Holiday
   * Sale" in /admin/categories could not select it here: the category existed on
   * the server and was absent from the only dropdown that assigns it.
   */
  const [apiCategories, setApiCategories] = useState<{ key: string; label: string }[]>([]);
  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .adminCategories()
      .then((res) => {
        if (cancelled) return;
        setApiCategories(
          (Array.isArray(res.data) ? res.data : [])
            .filter((c) => c.active)
            .map((c) => ({ key: c.key, label: c.label }))
            .sort((a, b) => a.label.localeCompare(b.label)),
        );
      })
      .catch(() => {
        // Keep the mock list rather than an empty dropdown that would silently
        // clear the product's category on save.
        if (!cancelled) setApiCategories([]);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const categoryOptions = useMemo(() => {
    if (apiOn && apiCategories.length > 0) return apiCategories;
    const local = store.categories.filter((c) => c.active);
    return local.length > 0
      ? local.map((c) => ({ key: c.key, label: c.label }))
      : adminProductTabs.map((t) => ({ key: t.key, label: t.label }));
  }, [apiOn, apiCategories, store.categories]);

  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
  const [showMore, setShowMore] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const initial = useRef(JSON.stringify(form));

  useEffect(() => {
    setDirty(JSON.stringify(form) !== initial.current);
  }, [form]);

  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(event: BeforeUnloadEvent) {
      event.preventDefault();
      event.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function handleUpdate<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    update(key, value);
    setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  /** Shared by both save buttons; returns false when something is missing. */
  function validate(): boolean {
    const next: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!form.name.trim()) next.name = "Give it a name — this is what customers see.";
    if (!isValidInr(form.price)) next.price = "What do you sell it for?";
    if (form.strike && !isValidInr(form.strike)) next.strike = "Enter an amount, or leave it blank.";
    // Empty is a real answer for a code-delivered product (its stock is the
    // number of codes) but not for something he posts.
    if (form.delivery === "physical") {
      const n = Number(form.stock);
      if (form.stock.trim() === "" || !Number.isFinite(n) || n < 0) {
        next.stock = "How many are on the shelf? Put 0 if none.";
      }
    }
    setErrors(next);
    if (Object.keys(next).length > 0) return false;
    initial.current = JSON.stringify(form);
    setDirty(false);
    return true;
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (validate()) onSubmit();
  }

  function saveHidden() {
    if (validate()) onSubmitHidden();
  }

  function handleCancel() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onCancel?.();
  }

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(label);
      window.setTimeout(() => setCopied(null), 2000);
    } catch {
      setCopied(null);
    }
  }

  const today = new Date().toISOString().slice(0, 10);
  const isPreorder = form.delivery === "physical" && !!form.releaseAt && form.releaseAt > today;

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div aria-live="polite" className="sr-only">
        {banner}
      </div>
      {banner ? (
        <div
          role={bannerTone === "error" ? "alert" : undefined}
          className={
            bannerTone === "error"
              ? "rounded-lg border border-[#F5C2C0] bg-[#FDECEC] px-4 py-2.5 text-sm text-[#B42318]"
              : "rounded-lg border border-[#A6D5B0] bg-[#EAF6ED] px-4 py-2.5 text-sm text-[#2D6B3C]"
          }
        >
          {banner}
        </div>
      ) : null}

      {/* Six fields, in the order a shipment arrives: the picture on the box,
          what it is called, what it costs, how many came, where it belongs. */}
      <ImageUploadField
        value={form.image}
        onChange={(url) => handleUpdate("image", url)}
        folder="products"
        label="Photo"
      />

      <Field label="Name" error={errors.name}>
        <input
          value={form.name}
          onChange={(e) => handleUpdate("name", e.target.value)}
          className={inputClass}
          placeholder="EA Sports FC 26 — PS5"
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Price" error={errors.price}>
          {/* type="number" min=0: these were plain text inputs, and the digit
              filter at submit STRIPPED a minus sign — so "-500" saved silently
              as 500, turning a ₹3,499 product into a ₹500 one with a green
              "Product saved" banner. Reject rather than coerce. */}
          <input
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={form.price}
            onChange={(e) => handleUpdate("price", e.target.value)}
            className={inputClass}
            placeholder="4999"
          />
        </Field>
        <Field label="MRP" error={errors.strike} hint="Struck out beside your price. Leave blank if there is no discount.">
          <input
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={form.strike}
            onChange={(e) => handleUpdate("strike", e.target.value)}
            className={inputClass}
            placeholder="5999"
          />
        </Field>
        <Field
          label="What you paid"
          error={errors.cost}
          hint="Per item. Only you ever see this — it never appears on your website. Leave it blank if you do not know."
        >
          <input
            type="number"
            min={0}
            step="1"
            inputMode="numeric"
            value={form.cost}
            onChange={(e) => handleUpdate("cost", e.target.value)}
            className={inputClass}
            placeholder="3200"
          />
        </Field>
      </div>

      {form.delivery === "physical" ? (
        <Field label="How many do you have?" error={errors.stock}>
          <input
            type="number"
            min={0}
            inputMode="numeric"
            value={form.stock}
            onChange={(e) => handleUpdate("stock", e.target.value)}
            className={`${inputClass} sm:max-w-[9rem]`}
            placeholder="12"
          />
        </Field>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Category">
          <select
            value={form.category}
            onChange={(e) => handleUpdate("category", e.target.value as AdminProductCategory)}
            className={inputClass}
          >
            {categoryOptions.map((option) => (
              <option key={option.key} value={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Brand">
          <input
            list="admin-brand-options"
            value={form.brand}
            onChange={(e) => handleUpdate("brand", e.target.value)}
            className={inputClass}
            placeholder="PlayStation"
          />
          <datalist id="admin-brand-options">
            {brandOptions.map((brand) => (
              <option key={brand.id} value={brand.name} />
            ))}
          </datalist>
        </Field>
      </div>

      {/* One row below the six, always visible — never a radio card he has to
          accept a noun to open. */}
      <div className="space-y-3 rounded-xl border border-black/[0.07] bg-[#FAFAFB] p-3.5">
        <fieldset>
          <legend className="text-[13px] font-semibold text-[#1D1D1F]">
            How does the customer get it?
          </legend>
          <div className="mt-2 flex flex-wrap gap-2">
            {(
              [
                { value: "physical", label: "I post it" },
                { value: "digital", label: "Code by email" },
              ] as const
            ).map((option) => {
              const active = form.delivery === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  aria-pressed={active}
                  onClick={() => handleUpdate("delivery", option.value)}
                  className={`inline-flex h-9 items-center rounded-lg border px-3.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                    active
                      ? "border-[#1D1D1F] bg-[#1D1D1F] text-white"
                      : "border-black/[0.1] bg-white text-[#424245] hover:border-black/25"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {form.delivery === "digital" ? (
          <p className="text-[11px] leading-snug text-[#6E6E73]">
            The code goes out on its own once the payment clears. How many you can
            sell is how many codes you have loaded — not a number you type here.
          </p>
        ) : (
          <>
            <Field
              label="Release date"
              hint="Only if it hasn't come out yet. Leave blank for anything already on your shelf."
            >
              <input
                type="date"
                value={form.releaseAt}
                onChange={(e) => handleUpdate("releaseAt", e.target.value)}
                className={`${inputClass} sm:max-w-[12rem]`}
              />
            </Field>
            {isPreorder ? (
              <div className="rounded-lg border border-black/[0.07] bg-white p-3">
                <p className="text-[12px] font-semibold text-[#1D1D1F]">
                  Customers can book this before {formatAdminDate(form.releaseAt)}.
                </p>
                <label className="mt-2 block">
                  <span className="text-[11px] font-medium text-[#424245]">
                    Advance to book (₹)
                  </span>
                  <input
                    type="number"
                    min={0}
                    step={1}
                    inputMode="numeric"
                    placeholder="0"
                    value={form.advance}
                    onChange={(e) => handleUpdate("advance", e.target.value)}
                    className={`${inputClass} mt-1 bg-white sm:max-w-[12rem]`}
                  />
                </label>
                <p className="mt-1.5 text-[11px] leading-snug text-[#86868B]">
                  {/* "0 means free to book" was the belief the storefront copy
                      was built on, and it was wrong: at 0 the customer is
                      charged the whole price at checkout. */}
                  Flat amount you collect up front to hold one unit. The rest is due
                  when the title releases. Leave it 0 and the customer pays the full
                  price at checkout.
                </p>
              </div>
            ) : null}
          </>
        )}
      </div>

      {codesPanel}

      {/* Everything he touches once a year, or never. */}
      <div className="rounded-xl border border-black/[0.07]">
        <button
          type="button"
          onClick={() => setShowMore((v) => !v)}
          aria-expanded={showMore}
          className="flex w-full items-center justify-between px-3.5 py-3 text-[13px] font-semibold text-[#424245]"
        >
          More options
          <span aria-hidden className="text-[#86868B]">
            {showMore ? "−" : "+"}
          </span>
        </button>
        {showMore ? (
          <div className="space-y-4 border-t border-black/[0.06] px-3.5 py-4">
            <ReadOnlyValue
              label="Web address"
              value={form.webAddress ? `/products/${form.webAddress}` : "Set when you save"}
              copyValue={form.webAddress ? `/products/${form.webAddress}` : ""}
              copied={copied === "Web address"}
              onCopy={copy}
            />
            <ReadOnlyValue
              label="Item code"
              value={form.itemCode || "None yet"}
              copyValue={form.itemCode}
              copied={copied === "Item code"}
              onCopy={copy}
            />
            <ReadOnlyValue label="Console" value={form.platform} />

            <Field label="Description">
              <textarea
                rows={4}
                value={form.description}
                onChange={(e) => handleUpdate("description", e.target.value)}
                className={inputClass}
              />
            </Field>

            {onExtraCategoriesChange ? (
              <Field
                label="Also show in"
                hint="It stays in its category above and appears here too."
              >
                <div className="flex flex-wrap gap-1.5">
                  {categoryOptions
                    .filter((c) => c.key !== form.category)
                    .map((c) => {
                      const on = (extraCategories ?? []).includes(c.key);
                      return (
                        <button
                          key={c.key}
                          type="button"
                          aria-pressed={on}
                          onClick={() =>
                            onExtraCategoriesChange(
                              on
                                ? (extraCategories ?? []).filter((k) => k !== c.key)
                                : [...(extraCategories ?? []), c.key],
                            )
                          }
                          className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
                            on
                              ? "border-[#1D1D1F] bg-[#1D1D1F] text-white"
                              : "border-black/[0.1] bg-white text-[#6E6E73]"
                          }`}
                        >
                          {c.label}
                        </button>
                      );
                    })}
                </div>
              </Field>
            ) : null}

            {/* Kept word for word. It is the clearest sentence in the admin about
                what a setting does to what the customer pays. */}
            <label className="flex items-start gap-2.5 text-[13px] leading-snug text-[#424245]">
              <input
                type="checkbox"
                checked={form.taxInclusive}
                onChange={(e) => handleUpdate("taxInclusive", e.target.checked)}
                className="mt-0.5 accent-[#1D1D1F]"
              />
              <span>
                Price includes GST
                <span className="mt-0.5 block text-[11px] text-[#86868B]">
                  {form.taxInclusive
                    ? "Customers pay exactly this price."
                    : "GST is added on top — the storefront advertises the higher, payable figure."}
                </span>
              </span>
            </label>

            {onDelete && mode === "edit" ? (
              <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
                <p className="text-[11px] leading-snug text-[#86868B]">
                  Deleting is blocked if it appears in any order, or still holds
                  unsold codes.
                </p>
                <button
                  type="button"
                  onClick={onDelete}
                  className="inline-flex h-9 shrink-0 items-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {/* The status dropdown is the button. He reads what will happen before he
          presses it, instead of picking a word and hoping. */}
      <div className="flex flex-wrap items-center gap-3 border-t border-black/[0.06] pt-4">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-10 items-center rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:cursor-wait disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Save and put it on the website"}
        </button>
        <button
          type="button"
          onClick={saveHidden}
          disabled={submitting}
          className="text-xs font-semibold text-[#6E6E73] underline underline-offset-2 disabled:opacity-50"
        >
          Save but keep it hidden
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={handleCancel}
            className="ml-auto inline-flex h-10 items-center rounded-lg border border-black/10 px-4 text-xs font-semibold"
          >
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** Read-only values are text with a Copy button — never a disabled input. */
function ReadOnlyValue({
  label,
  value,
  copyValue,
  copied,
  onCopy,
}: {
  label: string;
  value: string;
  copyValue?: string;
  copied?: boolean;
  onCopy?: (label: string, value: string) => void;
}) {
  return (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="text-[11px] font-medium text-[#86868B]">{label}</div>
        <div className="ez-mono mt-0.5 truncate text-xs text-[#1D1D1F]">{value}</div>
      </div>
      {copyValue && onCopy ? (
        <button
          type="button"
          onClick={() => void onCopy(label, copyValue)}
          className="shrink-0 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] font-semibold text-[#424245]"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      ) : null}
    </div>
  );
}

function Field({
  label,
  children,
  error,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
  hint?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[13px] font-semibold text-[#1D1D1F]">{label}</span>
      {children}
      {hint && !error ? (
        <span className="text-[11px] leading-snug text-[#86868B]">{hint}</span>
      ) : null}
      {error ? <span className="text-[11px] text-[#B42318]">{error}</span> : null}
    </label>
  );
}
