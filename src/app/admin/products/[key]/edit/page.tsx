"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { adjustStock, upsertProduct } from "@/lib/adminStore";
import { api, apiUpdateProduct, isApiEnabled, type ApiProduct } from "@/lib/apiClient";
import { apiProductToForm, productFormToApiPayload } from "@/lib/productPayload";

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
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const router = useRouter();
  const [toast, setToast] = useAutoBanner();

  const localProduct = useMemo(
    () => store.products.find((row) => row.key === key) ?? null,
    [store.products, key],
  );

  const [form, setForm] = useState<ProductFormValues | null>(() =>
    !apiOn && localProduct ? toForm(localProduct) : null,
  );
  const [apiProduct, setApiProduct] = useState<ApiProduct | null>(null);
  const [loading, setLoading] = useState(apiOn);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(localProduct?.key ?? null);
  const [saving, setSaving] = useState(false);
  const [tone, setTone] = useState<"success" | "error">("success");

  const loadProduct = useCallback(async () => {
    if (!apiOn) return;
    setLoading(true);
    try {
      const p = await api.product(key);
      setApiProduct(p);
      setForm(apiProductToForm(p));
      setLoadError(null);
    } catch (err) {
      setApiProduct(null);
      setForm(null);
      setLoadError(err instanceof Error ? err.message : "Could not load product");
    } finally {
      setLoading(false);
    }
  }, [apiOn, key]);

  useEffect(() => {
    void loadProduct();
  }, [loadProduct]);

  // Mock mode: keep the form in sync with the local store record.
  if (!apiOn && localProduct && localProduct.key !== formKey) {
    setFormKey(localProduct.key);
    setForm(toForm(localProduct));
  }

  function update<K extends keyof ProductFormValues>(field: K, value: ProductFormValues[K]) {
    setForm((prev) => (prev ? { ...prev, [field]: value } : prev));
  }

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!form || saving) return;
    if (apiOn) {
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
          stock: Number(form.stock) || 0,
          digital: form.digital,
          status: form.status,
          image: form.image,
        }),
      )
        .then(() => {
          setToast("Product saved");
          window.setTimeout(() => router.push("/admin/products"), 600);
        })
        .catch((err) => {
          setTone("error");
          setToast(err instanceof Error ? `Could not save: ${err.message}` : "Could not save product");
          setSaving(false);
        });
      return;
    }
    if (!localProduct) return;
    const nextStock = Number(form.stock) || 0;
    const delta = nextStock - localProduct.stock;
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
      stock: localProduct.stock,
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

  const headerName = apiOn ? apiProduct?.title ?? key : localProduct?.name ?? key;
  const headerSku = apiOn ? apiProduct?.key ?? key : localProduct?.sku ?? key;

  if (apiOn && loading) {
    return (
      <div>
        <AdminPageHeader
          title="Edit product"
          description="Loading…"
          breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: key }]}
        />
        <div className="mt-3 h-64 max-w-2xl animate-pulse rounded-lg border border-black/[0.08] bg-white" />
      </div>
    );
  }

  if (!form) {
    return (
      <div>
        <AdminPageHeader
          title="Product not found"
          description={loadError ?? "That key does not match a catalog entry."}
          breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: key }]}
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

  return (
    <div>
      <AdminPageHeader
        title="Edit product"
        description={headerSku}
        breadcrumbs={[{ label: "Products", href: "/admin/products" }, { label: headerName }]}
        actions={
          <Link
            href="/admin/products"
            className="inline-flex h-8 items-center rounded-md border border-black/10 bg-white px-3 text-xs font-semibold"
          >
            Back
          </Link>
        }
      />

      <ProductForm
        form={form}
        update={update}
        onSubmit={handleSubmit}
        submitLabel="Save changes"
        toastMessage={toast}
        toastTone={tone}
        submitting={saving}
      />
    </div>
  );
}
