"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import {
  PreorderFields,
  applyDigitalToggle,
  emptyFulfilment,
  fulfilmentToPayload,
  type FulfilmentValues,
} from "@/components/admin/PreorderFields";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { upsertProduct } from "@/lib/adminStore";
import { apiCreateProduct, isApiEnabled } from "@/lib/apiClient";
import { productFormToApiPayload } from "@/lib/productPayload";
import { useAutoBanner } from "@/hooks/useAutoBanner";

const emptyForm: ProductFormValues = {
  category: "games",
  name: "",
  brand: "",
  sku: "",
  platform: "PS5",
  edition: "Standard",
  price: "",
  strike: "",
  stock: "10",
  digital: false,
  status: "draft",
  image: "",
};

export default function AdminNewProductPage() {
  const router = useRouter();
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [fulfilment, setFulfilment] = useState<FulfilmentValues>(emptyFulfilment);
  const [toast, setToast] = useAutoBanner();
  const [saving, setSaving] = useState(false);
  const [tone, setTone] = useState<"success" | "error">("success");

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // ProductForm's "Digital product" checkbox writes the same column as the
    // Fulfilment selector — mirror it so the two can't disagree.
    if (key === "digital") {
      setFulfilment((prev) => applyDigitalToggle(prev, Boolean(value)));
    }
  }

  function updateFulfilment(next: FulfilmentValues) {
    setFulfilment(next);
    setForm((prev) =>
      prev.digital === (next.type === "digital")
        ? prev
        : { ...prev, digital: next.type === "digital" },
    );
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    const key = `${form.category}:new-${Date.now()}`;
    if (isApiEnabled()) {
      setSaving(true);
      setTone("success");
      void apiCreateProduct({
        ...productFormToApiPayload({
          key,
          name: form.name,
          category: form.category,
          brand: form.brand,
          price: form.price,
          strike: form.strike,
          stock: Number(form.stock) || 0,
          digital: form.digital,
          status: form.status,
          image: form.image,
        }),
        ...fulfilmentToPayload(fulfilment),
      })
        .then(() => router.push("/admin/products"))
        .catch((err) => {
          setTone("error");
          setToast(err instanceof Error ? `Could not create: ${err.message}` : "Could not create product");
          setSaving(false);
        });
      return;
    }
    upsertProduct({
      key,
      category: form.category,
      name: form.name,
      brand: form.brand,
      sku: form.sku || `EZ-NEW-${Date.now().toString().slice(-6)}`,
      platform: form.platform,
      edition: form.edition,
      price: form.price,
      strike: form.strike,
      stock: Number(form.stock) || 0,
      digital: fulfilment.type === "digital",
      status: form.status,
      image: form.image,
      releaseDate: fulfilment.type === "preorder" ? fulfilment.releaseAt || undefined : undefined,
    });
    router.push("/admin/products");
  }

  return (
    <div>
      <AdminPageHeader
        title="New product"
        description="Add a SKU to the catalog — fulfilment, stock, pricing, and publish state."
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: "New" },
        ]}
        actions={
          <Link
            href="/admin/products"
            className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
          >
            Back
          </Link>
        }
      />

      <PreorderFields value={fulfilment} onChange={updateFulfilment} />

      <ProductForm
        form={form}
        update={update}
        onSubmit={handleSubmit}
        submitLabel="Save product"
        toastMessage={toast}
        toastTone={tone}
        submitting={saving}
      />
    </div>
  );
}
