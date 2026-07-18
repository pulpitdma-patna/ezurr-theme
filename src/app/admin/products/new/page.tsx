"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { upsertProduct } from "@/lib/adminStore";

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

  function update<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const key = `${form.category}:new-${Date.now()}`;
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
      digital: form.digital,
      status: form.status,
      image: form.image,
      releaseDate: form.releaseDate,
    });
    router.push("/admin/products");
  }

  return (
    <div>
      <AdminPageHeader
        title="New product"
        description="Add a SKU to the catalog — stock, pricing, and publish state."
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

      <ProductForm form={form} update={update} onSubmit={handleSubmit} submitLabel="Save product" />
    </div>
  );
}
