"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  adminProductTabs,
  parsePrice,
  type AdminPlatform,
  type AdminProductCategory,
  type AdminProductStatus,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { ImageUploadField } from "@/components/admin/ImageUploadField";

const platforms: AdminPlatform[] = [
  "PS5",
  "PS4",
  "Xbox",
  "Nintendo",
  "PC",
  "Multi",
  "Hardware",
  "Digital",
];

export type ProductFormValues = {
  category: AdminProductCategory;
  name: string;
  brand: string;
  sku: string;
  platform: AdminPlatform;
  edition: string;
  price: string;
  strike: string;
  stock: string;
  digital: boolean;
  status: AdminProductStatus;
  image: string;
  releaseDate?: string;
};

const inputClass =
  "w-full rounded-md border border-black/[0.08] bg-[#F7F7F8] px-3 py-2.5 text-sm outline-none focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

function isValidInr(value: string) {
  if (!value.trim()) return false;
  if (value.trim().toLowerCase() === "sold out") return true;
  return parsePrice(value) > 0 || /^₹?[\d,]+$/.test(value.trim());
}

export function ProductForm({
  form,
  update,
  onSubmit,
  submitLabel,
  toastMessage,
  toastTone = "success",
  submitting = false,
  onCancel,
  embedded = false,
}: {
  form: ProductFormValues;
  update: <K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) => void;
  onSubmit: (event: React.FormEvent) => void;
  submitLabel: string;
  toastMessage?: string;
  /** Colour of the inline banner — success (green) or error (red) */
  toastTone?: "success" | "error";
  /** Disable the submit button and show a pending label while a save is in flight */
  submitting?: boolean;
  onCancel?: () => void;
  /** Strip outer card chrome when used inside a drawer */
  embedded?: boolean;
}) {
  const store = useAdminStore();
  const categoryOptions = store.categories.filter((c) => c.active);
  const brandOptions = store.brands.filter((b) => b.active);
  const [errors, setErrors] = useState<Partial<Record<keyof ProductFormValues, string>>>({});
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

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const nextErrors: Partial<Record<keyof ProductFormValues, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Name is required";
    if (!form.brand.trim()) nextErrors.brand = "Brand is required";
    if (!isValidInr(form.price)) nextErrors.price = "Enter a valid INR amount";
    if (form.strike && !isValidInr(form.strike) && form.strike.toLowerCase() !== "sold out") {
      nextErrors.strike = "Enter a valid INR amount";
    }
    const stockNum = Number(form.stock);
    if (!Number.isFinite(stockNum) || stockNum < 0) nextErrors.stock = "Stock must be 0 or more";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;
    initial.current = JSON.stringify(form);
    setDirty(false);
    onSubmit(event);
  }

  function handleCancel() {
    if (dirty && !window.confirm("Discard unsaved changes?")) return;
    onCancel?.();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={
        embedded
          ? "space-y-5"
          : "max-w-2xl space-y-5 rounded-lg border border-black/[0.08] bg-white p-5 sm:p-6"
      }
    >
      <div aria-live="polite" className="sr-only">
        {toastMessage}
      </div>
      {toastMessage ? (
        <div
          role={toastTone === "error" ? "alert" : undefined}
          className={
            toastTone === "error"
              ? "rounded-md border border-[#F5C2C0] bg-[#FDECEC] px-4 py-2.5 text-sm text-[#B42318]"
              : "rounded-md border border-[#A6D5B0] bg-[#EAF6ED] px-4 py-2.5 text-sm text-[#2D6B3C]"
          }
        >
          {toastMessage}
        </div>
      ) : null}

      <Section title="Basics">
        <Field label="Category" error={errors.category}>
          <select
            value={form.category}
            onChange={(e) => handleUpdate("category", e.target.value as AdminProductCategory)}
            className={inputClass}
          >
            {(categoryOptions.length > 0
              ? categoryOptions
              : adminProductTabs.map((t) => ({ key: t.key, label: t.label }))
            ).map((tab) => (
              <option key={tab.key} value={tab.key}>
                {tab.label}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Name" error={errors.name}>
          <input
            required
            value={form.name}
            onChange={(e) => handleUpdate("name", e.target.value)}
            className={inputClass}
            placeholder="Product name"
          />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" error={errors.brand}>
            <input
              required
              list="admin-brand-options"
              value={form.brand}
              onChange={(e) => handleUpdate("brand", e.target.value)}
              className={inputClass}
              placeholder="PS5"
            />
            <datalist id="admin-brand-options">
              {brandOptions.map((brand) => (
                <option key={brand.id} value={brand.name} />
              ))}
            </datalist>
          </Field>
          <Field label="SKU" error={errors.sku}>
            <input
              value={form.sku}
              onChange={(e) => handleUpdate("sku", e.target.value)}
              className={inputClass}
              placeholder="EZ-GAM-0099"
            />
          </Field>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Platform">
            <select
              value={form.platform}
              onChange={(e) => handleUpdate("platform", e.target.value as AdminPlatform)}
              className={inputClass}
            >
              {platforms.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Edition">
            <input
              value={form.edition}
              onChange={(e) => handleUpdate("edition", e.target.value)}
              className={inputClass}
            />
          </Field>
        </div>

        {form.category === "preorders" ? (
          <Field label="Release date">
            <input
              type="date"
              value={form.releaseDate ?? ""}
              onChange={(e) => handleUpdate("releaseDate", e.target.value)}
              className={inputClass}
            />
          </Field>
        ) : null}
      </Section>

      <Section title="Media">
        <ImageUploadField
          value={form.image}
          onChange={(url) => handleUpdate("image", url)}
          folder="products"
          label="Product image"
        />
      </Section>

      <Section title="Pricing">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Price" error={errors.price}>
            <input
              required
              value={form.price}
              onChange={(e) => handleUpdate("price", e.target.value)}
              className={inputClass}
              placeholder="₹4,999"
            />
          </Field>
          <Field label="Compare-at" error={errors.strike}>
            <input
              value={form.strike}
              onChange={(e) => handleUpdate("strike", e.target.value)}
              className={inputClass}
              placeholder="₹5,999"
            />
          </Field>
        </div>
      </Section>

      <Section title="Inventory & status">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Stock" error={errors.stock}>
            <input
              type="number"
              min={0}
              value={form.stock}
              onChange={(e) => handleUpdate("stock", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="Publish status">
            <select
              value={form.status}
              onChange={(e) => handleUpdate("status", e.target.value as AdminProductStatus)}
              className={inputClass}
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="sold_out">Sold out</option>
            </select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={form.digital}
            onChange={(e) => handleUpdate("digital", e.target.checked)}
            className="accent-[#1D1D1F] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          />
          Digital product (fulfill from code vault)
        </label>
      </Section>

      <div className="flex flex-wrap gap-2 pt-1">
        <button
          type="submit"
          disabled={submitting}
          className="inline-flex h-9 items-center rounded-md bg-[#1D1D1F] px-4 text-xs font-semibold text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] disabled:cursor-wait disabled:opacity-50"
        >
          {submitting ? "Saving…" : submitLabel}
        </button>
        {onCancel ? (
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex h-9 items-center rounded-md border border-black/10 px-4 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
          >
            Cancel
          </button>
        ) : (
          <Link
            href="/admin/products"
            className="inline-flex h-9 items-center rounded-md border border-black/10 px-4 text-xs font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            onClick={(event) => {
              if (dirty && !window.confirm("Discard unsaved changes?")) {
                event.preventDefault();
              }
            }}
          >
            Cancel
          </Link>
        )}
        {dirty ? (
          <span className="self-center text-[11px] text-[#86868B]">Unsaved changes</span>
        ) : null}
      </div>
    </form>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 border-t border-black/[0.06] pt-4 first:border-t-0 first:pt-0">
      <h2 className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Field({
  label,
  children,
  error,
}: {
  label: string;
  children: React.ReactNode;
  error?: string;
}) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]">
        {label}
      </span>
      {children}
      {error ? <span className="text-[11px] text-[#B42318]">{error}</span> : null}
    </label>
  );
}
