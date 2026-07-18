"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { adjustStock, upsertProduct } from "@/lib/adminStore";

function toForm(product: {
  category: ProductFormValues["category"];
  name: string;
  brand: string;
  sku: string;
  platform: ProductFormValues["platform"];
  edition: string;
  price: string;
  strike: string;
  stock: number;
  digital: boolean;
  status: ProductFormValues["status"];
  image: string;
  releaseDate?: string;
}): ProductFormValues {
  return {
    category: product.category,
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    platform: product.platform,
    edition: product.edition,
    price: product.price,
    strike: product.strike,
    stock: String(product.stock),
    digital: product.digital,
    status: product.status,
    image: product.image,
    releaseDate: product.releaseDate,
  };
}

export default function AdminEditProductPage({
  params,
}: {
  params: Promise<{ key: string }>;
}) {
  const { key: rawKey } = use(params);
  const key = decodeURIComponent(rawKey);
  const store = useAdminStore();
  const router = useRouter();
  const product = useMemo(
    () => store.products.find((row) => row.key === key) ?? null,
    [store.products, key],
  );

  const [form, setForm] = useState<ProductFormValues | null>(() =>
    product ? toForm(product) : null,
  );
  const [formKey, setFormKey] = useState(product?.key ?? null);
  const [toast, setToast] = useAutoBanner();

  if (product && product.key !== formKey) {
    setFormKey(product.key);
    setForm(toForm(product));
  }

  if (!product || !form) {
    return (
      <div>
        <AdminPageHeader
          title="Product not found"
          description="That key does not match a catalog entry in the admin store."
          breadcrumbs={[
            { label: "Products", href: "/admin/products" },
            { label: key },
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
      </div>
    );
  }

  function update<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || !product) return;
    const nextStock = Number(form.stock) || 0;
    const delta = nextStock - product.stock;
    upsertProduct({
      key,
      category: form.category,
      name: form.name,
      brand: form.brand,
      sku: form.sku,
      platform: form.platform,
      edition: form.edition,
      price: form.price,
      strike: form.strike,
      stock: product.stock,
      digital: form.digital,
      status: form.status,
      image: form.image,
      releaseDate: form.releaseDate,
    });
    if (delta !== 0) {
      adjustStock(key, delta, "Product edit stock");
    }
    setToast("Product saved");
    window.setTimeout(() => router.push("/admin/products"), 600);
  }

  return (
    <div>
      <AdminPageHeader
        title="Edit product"
        description={product.sku}
        breadcrumbs={[
          { label: "Products", href: "/admin/products" },
          { label: product.name },
        ]}
        actions={
          <>
            <Link
              href={`/admin/products?q=${encodeURIComponent(product.sku)}`}
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              Products
            </Link>
            <Link
              href="/admin/products"
              className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
            >
              Back
            </Link>
          </>
        }
      />

      <ProductForm
        form={form}
        update={update}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        toastMessage={toast}
      />
    </div>
  );
}
