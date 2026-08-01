"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductCodesPanel } from "@/components/admin/ProductCodesPanel";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { api, apiUpdateProduct, isApiEnabled, type ApiProduct } from "@/lib/apiClient";
import {
  apiProductToForm,
  deriveFulfilment,
  productFormToApiPayload,
} from "@/lib/productPayload";

/**
 * One product, at its own web address.
 *
 * The drawer on the list is where he edits things day to day. This page exists
 * so a product can be linked to — from an order, from search, from a message
 * somebody sent him — without that link having to open a list first and hunt.
 * It is the same form, so the two can never disagree about what a field means.
 */
export default function AdminEditProductPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key: rawKey } = use(params);
  const key = decodeURIComponent(rawKey);
  const apiOn = isApiEnabled();
  const router = useRouter();

  const [form, setForm] = useState<ProductFormValues | null>(null);
  const [product, setProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(apiOn);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [banner, setBanner] = useState("");
  const [tone, setTone] = useState<"success" | "error">("success");

  const loadProduct = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      // The admin read, not the public one: the public route hides `cost`, so
      // this form loaded with an empty box and saved null over what he typed.
      const p = await api.adminProduct(key);
      setProduct(p);
      setForm(apiProductToForm(p));
      setLoadError(null);
    } catch (err) {
      setProduct(null);
      setForm(null);
      setLoadError(
        err instanceof Error ? err.message : "That product is not in your shop any more.",
      );
    } finally {
      setLoading(false);
    }
  }, [apiOn, key]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  function update<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function save(onWebsite: boolean) {
    if (!form || saving || !apiOn) return;
    setSaving(true);
    setTone("success");
    void apiUpdateProduct(
      key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80),
      productFormToApiPayload({
        key,
        name: form.name,
        category: form.category,
        brand: form.brand,
        price: form.price,
        strike: form.strike,
        cost: form.cost,
        taxInclusive: form.taxInclusive,
        stock: Number(form.stock) || 0,
        onWebsite,
        image: form.image,
        description: form.description,
        fulfilment: deriveFulfilment(form),
      }),
    )
      .then(() => {
        setBanner(
          onWebsite ? "Saved. It's on the website." : "Saved, and taken off the website.",
        );
        setSaving(false);
        window.setTimeout(() => router.push("/admin/products"), 700);
      })
      .catch((err) => {
        setTone("error");
        // Everything he typed stays typed, and the screen does not claim success.
        setBanner(err instanceof Error ? `Not saved — ${err.message}` : "Not saved.");
        setSaving(false);
      });
  }

  if (apiOn && loading) {
    return (
      <div>
        <AdminPageHeader title="Loading…" />
        <div className="mt-3 h-64 max-w-2xl animate-pulse rounded-lg border border-black/[0.08] bg-white" />
      </div>
    );
  }

  if (!form) {
    return (
      <div>
        <AdminPageHeader
          title="That product isn't here"
          description={loadError ?? "Nothing in your shop has that web address."}
          actions={
            <Link
              href="/admin/products"
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              Back to what you sell
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <div>
      <AdminPageHeader
        title={product?.title ?? key}
        actions={
          <Link
            href="/admin/products"
            className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
          >
            Back
          </Link>
        }
      />

      <div className="max-w-2xl rounded-lg border border-black/[0.08] bg-white p-5 sm:p-6">
        <ProductForm
          form={form}
          update={update}
          mode="edit"
          onSubmit={() => save(true)}
          onSubmitHidden={() => save(false)}
          banner={banner || undefined}
          bannerTone={tone}
          submitting={saving}
          codesPanel={
            form.delivery === "digital" ? <ProductCodesPanel productKey={key} /> : null
          }
        />
      </div>
    </div>
  );
}
