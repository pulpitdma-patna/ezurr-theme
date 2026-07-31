"use client";

import Image from "next/image";
import { formatAdminDate } from "@/lib/adminFormat";
import { priceToNumber } from "@/lib/productPayload";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import {
  ExportIcon,
  EyeIcon,
  IconButton,
  PencilIcon,
  PlusIcon,
} from "@/components/admin/IconButton";
import {
  PreorderFields,
  applyDigitalToggle,
  emptyFulfilment,
  fulfilmentFromApi,
  fulfilmentLabels,
  fulfilmentToPayload,
  isFulfilmentType,
  type FulfilmentType,
  type FulfilmentValues,
} from "@/components/admin/PreorderFields";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StockBadge } from "@/components/admin/StockBadge";
import { StockEditor } from "@/components/admin/StockEditor";
import {
  parsePrice,
  type AdminCatalogRow,
  type AdminProductCategory,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { useListSavedViews } from "@/hooks/useListSavedViews";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import {
  adjustStock,
  deleteProduct,
  publishProducts,
  unpublishProducts,
  upsertProduct,
} from "@/lib/adminStore";
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiUpdateProduct,
  api,
  isApiEnabled,
  type ApiProduct,
} from "@/lib/apiClient";
import { mapApiProductToAdminRow } from "@/lib/apiMappers";
import { useSearchParams } from "next/navigation";

/** The three fulfilment columns the API sends but `ApiProduct` doesn't declare. */
type ApiProductFulfilment = ApiProduct & {
  release_at?: string | null;
  reservation_amount?: number | null;
};

// Deliberately NOT a local copy. This was duplicated from lib/productPayload,
// so the negative-price bug had to be fixed in two places — and the create
// drawer kept accepting "-500" as 500 after the edit form was fixed.

function productApiPayload(input: {
  key: string;
  name: string;
  category: string;
  brand: string;
  price: string;
  strike: string;
  stock: number;
  status: string;
  image: string;
  taxInclusive: boolean;
  fulfilment: FulfilmentValues;
}) {
  const key = input.key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80);
  return {
    key,
    slug: key.slice(0, 120),
    title: input.name,
    category_slug: input.category,
    brand_slug: input.brand.toLowerCase().replace(/\s+/g, "-") || "ezurr",
    price: priceToNumber(input.price),
    mrp: priceToNumber(input.strike) || null,
    stock: input.stock,
    image_url: input.image || null,
    active: input.status === "active" || input.status === "published",
    // The drawer has always shown a "Price includes GST" toggle and read it back
    // from the product, but never sent it — so switching it saved nothing and
    // reappeared unchanged on reload. It decides whether the catalogue price is
    // grossed up at checkout, so the wrong value moves what the customer pays.
    tax_inclusive: input.taxInclusive,
    // Fulfilment owns `fulfillment_type` now — spread last so it wins.
    ...fulfilmentToPayload(input.fulfilment),
  };
}

type DrawerMode = "view" | "edit" | "add" | null;

const emptyForm: ProductFormValues = {
  category: "games",
  name: "",
  brand: "",
  sku: "",
  platform: "PS5",
  edition: "Standard",
  price: "",
  strike: "",
  taxInclusive: true,
  stock: "10",
  digital: false,
  status: "draft",
  image: "",
};

function toForm(product: AdminCatalogRow): ProductFormValues {
  return {
    category: product.category,
    name: product.name,
    brand: product.brand,
    sku: product.sku,
    platform: product.platform,
    edition: product.edition,
    price: product.price,
    strike: product.strike,
    taxInclusive: product.taxInclusive ?? true,
    stock: String(product.stock),
    digital: product.digital,
    status: product.status,
    image: product.image,
    releaseDate: product.releaseDate,
  };
}

const PAGE_SIZES = [10, 25, 50, 100];

type StockFilter = "all" | "in_stock" | "low" | "out";

const STOCK_FILTER_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "All stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low", label: "Low stock" },
  { value: "out", label: "Out of stock / Sold out" },
];

function isStockFilter(value: unknown): value is StockFilter {
  return value === "all" || value === "in_stock" || value === "low" || value === "out";
}

/**
 * Low/out use the store's configured threshold (the retired Inventory page's
 * behaviour) rather than a fixed 5.
 */
function matchesStockFilter(
  row: AdminCatalogRow,
  stockFilter: StockFilter,
  lowThreshold: number,
): boolean {
  if (stockFilter === "all") return true;
  if (stockFilter === "in_stock") return row.stock > lowThreshold;
  if (stockFilter === "low") return row.stock > 0 && row.stock <= lowThreshold;
  return row.stock <= 0 || row.status === "sold_out";
}

type FulfilmentFilter = "all" | FulfilmentType;

const FULFILMENT_TABS: { value: FulfilmentFilter; label: string }[] = [
  { value: "all", label: "All products" },
  { value: "physical", label: "Physical" },
  { value: "digital", label: "Digital" },
  { value: "preorder", label: "Pre-orders" },
];

export default function AdminProductsPage() {
  const store = useAdminStore();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<string>("all");
  const [brand, setBrand] = useState("all");
  const [query, setQuery] = useSearchQueryParam();
  const [selected, setSelected] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(25);

  // `?stock=` (and the retired Inventory page's legacy `?filter=`) and
  // `?fulfilment=` seed the two folded-in views without an effect.
  const urlStock = searchParams.get("stock") ?? searchParams.get("filter");
  const [stockLocal, setStockLocal] = useState<StockFilter | null>(null);
  const [seenStockParam, setSeenStockParam] = useState(urlStock);
  if (urlStock !== seenStockParam) {
    setSeenStockParam(urlStock);
    setStockLocal(null);
  }
  const stockFilter: StockFilter = stockLocal ?? (isStockFilter(urlStock) ? urlStock : "all");

  const urlFulfilment = searchParams.get("fulfilment") ?? searchParams.get("fulfillment");
  const [fulfilmentLocal, setFulfilmentLocal] = useState<FulfilmentFilter | null>(null);
  const [seenFulfilmentParam, setSeenFulfilmentParam] = useState(urlFulfilment);
  if (urlFulfilment !== seenFulfilmentParam) {
    setSeenFulfilmentParam(urlFulfilment);
    setFulfilmentLocal(null);
  }
  const fulfilmentFilter: FulfilmentFilter =
    fulfilmentLocal ?? (isFulfilmentType(urlFulfilment) ? urlFulfilment : "all");

  const [page, setPage] = usePagedList(
    `${category}|${brand}|${stockFilter}|${fulfilmentFilter}|${query}|${sortKey}|${sortDir}|${pageSize}`,
  );

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [fulfilment, setFulfilment] = useState<FulfilmentValues>(emptyFulfilment);
  const [toast, setToast] = useAutoBanner();
  const [saving, setSaving] = useState(false);
  const [saveTone, setSaveTone] = useState<"success" | "error">("success");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openedFromNewParam, setOpenedFromNewParam] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [apiProducts, setApiProducts] = useState<AdminCatalogRow[]>([]);
  const [apiRaw, setApiRaw] = useState<Record<string, ApiProductFulfilment>>({});
  const [apiBrandOptions, setApiBrandOptions] = useState<{ value: string; label: string }[]>([]);
  const [apiCategoryOptions, setApiCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [listError, setListError] = useState<string | null>(null);
  const { views, removeView } = useListSavedViews("products");

  const lowThreshold = store.settings.lowStockThreshold ?? 5;

  const loadProducts = useCallback(async () => {
    if (!isApiEnabled()) {
      setListLoading(false);
      return;
    }
    setListLoading(true);
    try {
      // Page through the catalog (server clamps per_page to 100). Brand is
      // filtered server-side when set so we do not pull unrelated pages.
      const perPage = 100;
      const brandParam = brand !== "all" ? brand : undefined;
      const [first, brandsRes, categoriesRes] = await Promise.all([
        api.adminProducts({ page: 1, per_page: perPage, brand: brandParam }),
        api.adminBrands().catch(() => ({ data: [] as Awaited<ReturnType<typeof api.adminBrands>>["data"] })),
        api.adminCategories().catch(() => ({ data: [] as Awaited<ReturnType<typeof api.adminCategories>>["data"] })),
      ]);
      let all = Array.isArray(first.data) ? first.data : [];
      const lastPage = Number(first.last_page ?? 1);
      for (let p = 2; p <= lastPage; p += 1) {
        const res = await api.adminProducts({ page: p, per_page: perPage, brand: brandParam });
        if (Array.isArray(res.data)) all = all.concat(res.data);
      }
      setApiProducts(all.map((p, i) => mapApiProductToAdminRow(p, i)));
      // Keep the raw records: the admin row mapper drops release_at,
      // reservation_amount and the preorder fulfilment type.
      const raw: Record<string, ApiProductFulfilment> = {};
      for (const p of all) raw[p.key] = p as ApiProductFulfilment;
      setApiRaw(raw);
      const brands = Array.isArray(brandsRes.data) ? brandsRes.data : [];
      setApiBrandOptions(
        brands
          .filter((b) => b.active !== false)
          .map((b) => ({ value: b.slug, label: b.name || b.slug }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      const categories = Array.isArray(categoriesRes.data) ? categoriesRes.data : [];
      setApiCategoryOptions(
        categories
          .filter((c) => c.active !== false)
          .map((c) => ({ value: c.key, label: c.label || c.key }))
          .sort((a, b) => a.label.localeCompare(b.label)),
      );
      setListError(null);
    } catch (err) {
      setApiProducts([]);
      setApiRaw({});
      setApiBrandOptions([]);
      setApiCategoryOptions([]);
      setListError(err instanceof Error ? err.message : "Could not load products");
    } finally {
      setListLoading(false);
    }
  }, [brand]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  const activeProduct = useMemo(
    () =>
      activeKey
        ? (isApiEnabled()
            ? apiProducts.find((p) => p.key === activeKey)
            : store.products.find((p) => p.key === activeKey)) ?? null
        : null,
    [store.products, apiProducts, activeKey],
  );

  const wantsNew = searchParams.get("new") === "1";
  if (wantsNew && !openedFromNewParam) {
    setOpenedFromNewParam(true);
    setActiveKey(null);
    setForm({ ...emptyForm });
    setFulfilment({ ...emptyFulfilment });
    setDrawerMode("add");
    setToast("");
    if (typeof window !== "undefined") {
      // Drop only `new` so a `?fulfilment=`/`?stock=` deep link survives.
      const next = new URLSearchParams(window.location.search);
      next.delete("new");
      const qs = next.toString();
      window.history.replaceState(null, "", `/admin/products${qs ? `?${qs}` : ""}`);
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !drawerMode) setSelected([]);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerMode]);

  const brandOptions = useMemo(() => {
    if (isApiEnabled()) {
      return apiBrandOptions.map((b) => b.value);
    }
    return store.brands
      .filter((b) => b.active)
      .map((b) => b.name)
      .sort((a, b) => a.localeCompare(b));
  }, [store.brands, apiBrandOptions]);

  const brandFilter = brand !== "all" && brandOptions.includes(brand) ? brand : "all";

  const categoryOptions = useMemo(() => {
    if (isApiEnabled()) {
      return apiCategoryOptions.map((c) => c.value);
    }
    return store.categories.filter((c) => c.active).map((c) => c.key);
  }, [store.categories, apiCategoryOptions]);

  const categoryFilter =
    category !== "all" && categoryOptions.includes(category) ? category : "all";

  const productSource = isApiEnabled() ? apiProducts : store.products;

  /** Fulfilment for a row: from the API record, else inferred from mock data. */
  const rowFulfilment = useCallback(
    (row: AdminCatalogRow): FulfilmentValues => {
      const raw = apiRaw[row.key];
      if (raw) return fulfilmentFromApi(raw);
      return {
        type: row.digital ? "digital" : row.category === "preorders" ? "preorder" : "physical",
        releaseAt: row.releaseDate ?? "",
        reservationAmount: "",
      };
    },
    [apiRaw],
  );

  const fulfilmentCounts = useMemo(() => {
    const counts: Record<FulfilmentFilter, number> = {
      all: productSource.length,
      physical: 0,
      digital: 0,
      preorder: 0,
    };
    for (const row of productSource) counts[rowFulfilment(row).type] += 1;
    return counts;
  }, [productSource, rowFulfilment]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = productSource.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (brandFilter !== "all" && row.brand !== brandFilter) return false;
      if (!matchesStockFilter(row, stockFilter, lowThreshold)) return false;
      if (fulfilmentFilter !== "all" && rowFulfilment(row).type !== fulfilmentFilter) return false;
      if (!q) return true;
      return (
        row.name.toLowerCase().includes(q) ||
        row.brand.toLowerCase().includes(q) ||
        row.sku.toLowerCase().includes(q) ||
        row.platform.toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "stock") cmp = a.stock - b.stock;
      else if (sortKey === "price") cmp = parsePrice(a.price) - parsePrice(b.price);
      else if (sortKey === "sku") cmp = a.sku.localeCompare(b.sku);
      else cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    productSource,
    categoryFilter,
    brandFilter,
    stockFilter,
    lowThreshold,
    fulfilmentFilter,
    rowFulfilment,
    query,
    sortKey,
    sortDir,
  ]);

  function openView(row: AdminCatalogRow) {
    setActiveKey(row.key);
    setForm(toForm(row));
    setFulfilment(rowFulfilment(row));
    setDrawerMode("view");
    setToast("");
  }

  function openEdit(row: AdminCatalogRow) {
    setActiveKey(row.key);
    setForm(toForm(row));
    setFulfilment(rowFulfilment(row));
    setDrawerMode("edit");
    setToast("");
  }

  function openAdd() {
    setActiveKey(null);
    setForm({ ...emptyForm });
    setFulfilment({ ...emptyFulfilment });
    setDrawerMode("add");
    setToast("");
  }

  function closeDrawer() {
    setDrawerMode(null);
    setActiveKey(null);
    setToast("");
  }

  function updateForm<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
    // ProductForm's legacy "Digital product" checkbox writes the same column.
    if (key === "digital") {
      setFulfilment((prev) => applyDigitalToggle(prev, Boolean(value)));
    }
  }

  function updateFulfilment(next: FulfilmentValues) {
    setFulfilment(next);
    setForm((prev) =>
      prev.digital === (next.type === "digital") ? prev : { ...prev, digital: next.type === "digital" },
    );
  }

  /** Inline stock save landed — patch the row instead of refetching the catalog. */
  const handleStockSaved = useCallback((key: string, nextStock: number) => {
    setApiProducts((prev) =>
      prev.map((row) =>
        row.key === key
          ? {
              ...row,
              stock: nextStock,
              status: row.status === "draft" ? "draft" : nextStock <= 0 ? "sold_out" : "published",
            }
          : row,
      ),
    );
    setApiRaw((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], stock: nextStock } } : prev));
  }, []);

  async function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setSaveTone("success");
    try {
      await saveProduct();
    } finally {
      setSaving(false);
    }
  }

  async function saveProduct() {
    if (drawerMode === "add") {
      const key = `${form.category}:new-${Date.now()}`;
      if (isApiEnabled()) {
        try {
          await apiCreateProduct(
            productApiPayload({
              key,
              name: form.name,
              category: form.category,
              brand: form.brand,
              price: form.price,
              strike: form.strike,
              stock: Number(form.stock) || 0,
              status: form.status,
              image: form.image,
              taxInclusive: form.taxInclusive,
              fulfilment,
            }),
          );
          setToast("Product created");
          await loadProducts();
          closeDrawer();
        } catch (err) {
          setSaveTone("error");
          setToast(
            err instanceof Error ? `Could not create product: ${err.message}` : "Could not create product",
          );
        }
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
      setToast("Product created");
      window.setTimeout(closeDrawer, 500);
      return;
    }

    if (!activeProduct) return;
    const nextStock = Number(form.stock) || 0;
    if (isApiEnabled()) {
      try {
        await apiUpdateProduct(
          activeProduct.key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80),
          productApiPayload({
            key: activeProduct.key,
            name: form.name,
            category: form.category,
            brand: form.brand,
            price: form.price,
            strike: form.strike,
            stock: nextStock,
            status: form.status,
            image: form.image,
            taxInclusive: form.taxInclusive,
            fulfilment,
          }),
        );
        setToast("Product saved");
        await loadProducts();
        closeDrawer();
      } catch (err) {
        setSaveTone("error");
        setToast(
          err instanceof Error ? `Could not save product: ${err.message}` : "Could not save product",
        );
      }
      return;
    }
    const delta = nextStock - activeProduct.stock;
    upsertProduct({
      key: activeProduct.key,
      category: form.category,
      name: form.name,
      brand: form.brand,
      sku: form.sku,
      platform: form.platform,
      edition: form.edition,
      price: form.price,
      strike: form.strike,
      stock: activeProduct.stock,
      digital: fulfilment.type === "digital",
      status: form.status,
      image: form.image,
      releaseDate: fulfilment.type === "preorder" ? fulfilment.releaseAt || undefined : undefined,
    });
    if (delta !== 0) {
      adjustStock(activeProduct.key, delta, "Product edit stock");
    }
    setToast("Product saved");
    window.setTimeout(closeDrawer, 500);
  }

  async function handleDelete() {
    if (!activeProduct) return;
    setConfirmDelete(false);
    if (isApiEnabled()) {
      try {
        await apiDeleteProduct(activeProduct.key);
        await loadProducts();
        closeDrawer();
      } catch (err) {
        setSaveTone("error");
        setToast(
          err instanceof Error ? `Could not delete: ${err.message}` : "Could not delete product",
        );
      }
      return;
    }
    deleteProduct(activeProduct.key);
    closeDrawer();
  }

  async function bulkSetActive(active: boolean) {
    const keys = [...selected];
    setSelected([]);
    if (isApiEnabled()) {
      try {
        await Promise.all(keys.map((k) => apiUpdateProduct(k, { active })));
        setToast(active ? "Published" : "Unpublished");
        await loadProducts();
      } catch (err) {
        setToast(err instanceof Error ? `Bulk update failed: ${err.message}` : "Bulk update failed");
      }
      return;
    }
    if (active) publishProducts(keys);
    else unpublishProducts(keys);
  }

  function toggleRow(key: string) {
    setSelected((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
    );
  }

  function toggleAll() {
    const start = (page - 1) * pageSize;
    const pageKeys = rows.slice(start, start + pageSize).map((r) => r.key);
    const allSelected = pageKeys.every((k) => selected.includes(k));
    setSelected(
      allSelected
        ? selected.filter((k) => !pageKeys.includes(k))
        : [...new Set([...selected, ...pageKeys])],
    );
  }

  function exportCsv() {
    const header = "sku,name,brand,platform,stock,status,price,fulfilment,release_at\n";
    const body = rows
      .filter((r) => selected.length === 0 || selected.includes(r.key))
      .map((r) => {
        const f = rowFulfilment(r);
        return `${r.sku},"${r.name.replace(/"/g, '""')}",${r.brand},${r.platform},${r.stock},${r.status},${r.price},${f.type},${f.releaseAt}`;
      })
      .join("\n");
    const blob = new Blob([header + body], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ezurr-products.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  const columns: DataTableColumn<AdminCatalogRow>[] = [
    {
      key: "name",
      header: "Product",
      sortable: true,
      render: (row) => {
        const f = rowFulfilment(row);
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F7] ring-1 ring-black/[0.04]">
              {row.image ? (
                <Image src={row.image} alt="" fill className="object-contain p-0.5" sizes="40px" />
              ) : (
                <div className="flex h-full items-center justify-center ez-mono text-[7px] text-[#AEAEB2]">
                  DIG
                </div>
              )}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold tracking-[-0.02em]">{row.name}</span>
                {f.type === "preorder" ? <PreorderBadge /> : null}
              </div>
              <div className="mt-0.5 text-[11px] text-[#86868B]">
                {row.brand}
                {f.type === "preorder" && f.releaseAt
                  ? ` · releases ${formatAdminDate(f.releaseAt)}`
                  : ""}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "sku",
      header: "SKU",
      sortable: true,
      hideOnMobile: true,
      render: (row) => <span className="ez-mono text-[11px]">{row.sku}</span>,
    },
    {
      key: "platform",
      header: "Platform",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-[#6E6E73]">{row.platform}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      sortable: true,
      render: (row) => (
        <div className="flex flex-wrap items-center gap-1.5">
          <StockBadge stock={row.stock} />
          <StockEditor
            productKey={row.key}
            name={row.name}
            stock={row.stock}
            onSaved={handleStockSaved}
          />
        </div>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => <StatusBadge kind="product" status={row.status} />,
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      render: (row) => <span className="ez-mono text-xs font-medium">{row.price}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <IconButton label="View product" onClick={() => openView(row)}>
            <EyeIcon />
          </IconButton>
          <IconButton label="Edit product" onClick={() => openEdit(row)}>
            <PencilIcon />
          </IconButton>
        </div>
      ),
    },
  ];

  const drawerTitle =
    drawerMode === "add"
      ? "Add product"
      : drawerMode === "edit"
        ? "Edit product"
        : (activeProduct?.name ?? "Product");

  const drawerSubtitle =
    drawerMode === "add"
      ? "Create a catalog SKU"
      : activeProduct
        ? `${activeProduct.sku} · ${activeProduct.platform}`
        : undefined;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Products"
        description="Stock, fulfilment and pre-orders all live here — edit stock inline, or open the drawer for the rest."
        breadcrumbs={[
          { label: "Catalog", href: "/admin/products" },
          { label: "Products" },
        ]}
        actions={
          <span className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-2.5 py-1 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--ez-accent)]" aria-hidden />
            {productSource.length} SKUs
          </span>
        }
      />

      {listError ? (
        <AdminNotice tone="error">{listError}</AdminNotice>
      ) : null}

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        <div className="flex flex-wrap items-center gap-1 border-b border-black/[0.05] px-2 py-2 sm:px-3">
          {FULFILMENT_TABS.map((tab) => {
            const active = fulfilmentFilter === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                aria-pressed={active}
                onClick={() => setFulfilmentLocal(tab.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                  active
                    ? "bg-[#1D1D1F] text-white"
                    : "text-[#6E6E73] hover:bg-[#F5F5F7] hover:text-[#1D1D1F]"
                }`}
              >
                {tab.label}
                <span
                  className={`ez-mono text-[10px] ${active ? "text-white/60" : "text-[#AEAEB2]"}`}
                >
                  {fulfilmentCounts[tab.value]}
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-2.5 border-b border-black/[0.05] bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <span
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#AEAEB2]"
                aria-hidden
              >
                <SearchGlyph />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, SKU, brand, platform…"
                className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </div>
            <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
              {rows.length} products
            </span>
          </div>

          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AdminSelect
              label="Category"
              value={categoryFilter}
              onChange={setCategory}
              options={[
                { value: "all", label: "All categories" },
                ...(isApiEnabled()
                  ? apiCategoryOptions
                  : store.categories
                      .filter((c) => c.active)
                      .map((cat) => ({
                        value: cat.key,
                        label: cat.label,
                      }))),
              ]}
            />
            <AdminSelect
              label="Brand"
              value={brandFilter}
              onChange={setBrand}
              options={[
                { value: "all", label: "All brands" },
                ...(isApiEnabled()
                  ? apiBrandOptions
                  : store.brands
                      .filter((b) => b.active)
                      .map((b) => ({ value: b.name, label: b.name }))),
              ]}
            />
            <AdminSelect
              label="Stock"
              value={stockFilter}
              onChange={(value) => setStockLocal(value as StockFilter)}
              options={STOCK_FILTER_OPTIONS}
            />
            <div className="hidden h-6 w-px bg-black/[0.08] sm:block" aria-hidden />
            <IconButton label="Export CSV" onClick={exportCsv} size="md">
              <ExportIcon />
            </IconButton>
            <button
              type="button"
              onClick={openAdd}
              className="inline-flex h-9 items-center gap-2 rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white shadow-sm transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            >
              <PlusIcon />
              Add product
            </button>
          </div>
        </div>

        {views.length > 0 ? (
          <div className="flex flex-wrap items-center gap-2 px-3 py-2 sm:px-4">
            {views.map((view) => (
              <button
                key={view.id}
                type="button"
                onClick={() => {
                  setQuery(view.query);
                  setCategory((view.filters.category as AdminProductCategory | "all") || "all");
                  setBrand(view.filters.brand || "all");
                  setStockLocal((view.filters.stock as StockFilter) || "all");
                }}
                onContextMenu={(event) => {
                  event.preventDefault();
                  removeView(view.id);
                  setToast("View removed");
                }}
                className="rounded-full border border-black/[0.08] bg-white px-3 py-1 text-[11px] font-semibold text-[#424245] shadow-[0_1px_2px_rgba(17,17,19,0.03)] transition hover:border-black/[0.12] hover:text-[#1D1D1F]"
                title="Click to apply · right-click to remove"
              >
                {view.name}
              </button>
            ))}
          </div>
        ) : null}
      </section>

      {fulfilmentFilter === "preorder" ? (
        <AdminNotice tone="info">
          Pre-order is a product setting — open a product and pick{" "}
          <strong>Fulfilment → Pre-order</strong> to set its release date and reservation amount.
          Customer release <em>holds</em> are orders:{" "}
          <Link href="/admin/orders" className="font-semibold underline">
            Orders
          </Link>{" "}
          → filter status <strong>Pre-order</strong>.
        </AdminNotice>
      ) : null}

      <DataTable
        loading={listLoading}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        emptyMessage="No products match this filter."
        density="compact"
        emptyAction={
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white"
          >
            <PlusIcon />
            Add product
          </button>
        }
        selectable
        selectedKeys={selected}
        onToggleRow={toggleRow}
        onToggleAll={toggleAll}
        onRowClick={openView}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          else {
            setSortKey(key);
            setSortDir(key === "stock" || key === "price" ? "desc" : "asc");
          }
        }}
        page={page}
        pageSize={pageSize}
        onPageChange={setPage}
        pageSizeOptions={PAGE_SIZES}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
        bulkBar={
          <>
            <span className="text-xs font-semibold">{selected.length} selected</span>
            <button
              type="button"
              onClick={() => void bulkSetActive(true)}
              className="h-7 rounded-md bg-white px-2.5 text-[11px] font-semibold text-[#1D1D1F]"
            >
              Publish drafts
            </button>
            <button
              type="button"
              onClick={() => void bulkSetActive(false)}
              className="h-7 rounded-md border border-white/30 px-2.5 text-[11px] font-semibold text-white"
            >
              Unpublish
            </button>
            <button
              type="button"
              onClick={exportCsv}
              className="h-7 rounded-md border border-white/30 px-2.5 text-[11px] font-semibold text-white"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => setSelected([])}
              className="h-7 rounded-md px-2.5 text-[11px] font-semibold text-white/70"
            >
              Clear (Esc)
            </button>
          </>
        }
      />

      <AdminDrawer
        open={drawerMode !== null}
        title={drawerTitle}
        subtitle={drawerSubtitle}
        onClose={closeDrawer}
        widthClassName="max-w-lg sm:max-w-xl"
        footer={
          drawerMode === "view" && activeProduct ? (
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={closeDrawer}
                className="h-9 rounded-lg border border-black/10 px-4 text-xs font-semibold"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => openEdit(activeProduct)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white"
              >
                <PencilIcon />
                Quick edit
              </button>
              <Link
                href={`/admin/products/${encodeURIComponent(activeProduct.key)}/edit`}
                className="inline-flex h-9 items-center rounded-lg border border-black/10 px-4 text-xs font-semibold"
              >
                Full editor
              </Link>
            </div>
          ) : null
        }
      >
        {drawerMode === "view" && activeProduct ? (
          <ProductViewPanel product={activeProduct} fulfilment={fulfilment} />
        ) : null}

        {(drawerMode === "edit" || drawerMode === "add") && (
          <div className="space-y-5">
            <PreorderFields value={fulfilment} onChange={updateFulfilment} embedded />
            <ProductForm
              key={drawerMode === "add" ? "add" : (activeKey ?? "edit")}
              form={form}
              update={updateForm}
              onSubmit={handleSave}
              submitLabel={drawerMode === "add" ? "Create product" : "Save changes"}
              onCancel={closeDrawer}
              embedded
              toastMessage={toast || undefined}
              toastTone={saveTone}
              submitting={saving}
            />
          </div>
        )}

        {drawerMode === "edit" && activeProduct ? (
          <div className="mt-6 flex items-center justify-between gap-3 border-t border-black/[0.08] pt-4">
            <div>
              <p className="text-xs font-semibold text-[#1D1D1F]">Delete product</p>
              <p className="text-[11px] text-[#86868B]">
                Removes it from the catalog. Blocked if it appears in existing orders.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setConfirmDelete(true)}
              className="inline-flex h-9 shrink-0 items-center rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 hover:bg-red-50"
            >
              Delete
            </button>
          </div>
        ) : null}
      </AdminDrawer>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete product?"
        description={`"${activeProduct?.name ?? "This product"}" will be removed from the catalog. This cannot be undone.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

function PreorderBadge() {
  return (
    <span className="shrink-0 rounded bg-[#EEF2FF] px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-[0.06em] text-[#3730A3]">
      Pre-order
    </span>
  );
}

function ProductViewPanel({
  product,
  fulfilment,
}: {
  product: AdminCatalogRow;
  fulfilment: FulfilmentValues;
}) {
  const store = useAdminStore();
  return (
    <div className="space-y-6">
      <div className="flex gap-4">
        <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-[#F5F5F7] ring-1 ring-black/[0.06]">
          {product.image ? (
            <Image src={product.image} alt="" fill className="object-contain p-2" sizes="112px" />
          ) : (
            <div className="flex h-full items-center justify-center ez-mono text-[10px] text-[#AEAEB2]">
              DIGITAL
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge kind="product" status={product.status} />
            <StockBadge stock={product.stock} />
            {fulfilment.type === "preorder" ? <PreorderBadge /> : null}
            {fulfilment.type === "digital" ? (
              <span className="rounded-full bg-[#F0F0F2] px-2.5 py-1 text-[10px] font-semibold text-[#6E6E73]">
                Digital
              </span>
            ) : null}
          </div>
          <h3 className="mt-2 text-base font-semibold tracking-[-0.02em]">{product.name}</h3>
          <p className="mt-1 text-sm text-[#6E6E73]">{product.brand}</p>
          <p className="mt-3 ez-mono text-lg font-medium tracking-[-0.02em]">{product.price}</p>
          {product.strike ? (
            <p className="ez-mono text-xs text-[#AEAEB2] line-through">{product.strike}</p>
          ) : null}
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-3 rounded-2xl border border-black/[0.06] bg-[#FAFAFB] p-4">
        <ViewField label="SKU" value={product.sku} mono />
        <ViewField label="Platform" value={product.platform} />
        <ViewField label="Edition" value={product.edition || "—"} />
        <ViewField
          label="Category"
          value={
            store.categories.find((t) => t.key === product.category)?.label ??
            product.category
          }
        />
        <ViewField label="Stock qty" value={String(product.stock)} mono />
        <ViewField label="Fulfilment" value={fulfilmentLabels[fulfilment.type]} />
        {fulfilment.type === "preorder" ? (
          <>
            <ViewField
              label="Release"
              value={formatAdminDate(fulfilment.releaseAt, "Not set")}
            />
            <ViewField
              label="Reservation"
              value={
                fulfilment.reservationAmount === ""
                  ? "Not set"
                  : Number(fulfilment.reservationAmount) === 0
                    ? "Free to reserve"
                    : `₹${fulfilment.reservationAmount}`
              }
              mono={fulfilment.reservationAmount !== "" && Number(fulfilment.reservationAmount) > 0}
            />
          </>
        ) : null}
      </dl>
    </div>
  );
}

function ViewField({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div>
      <dt className="ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">{label}</dt>
      <dd className={`mt-1 text-sm font-medium text-[#1D1D1F] ${mono ? "ez-mono text-xs" : ""}`}>
        {value}
      </dd>
    </div>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
