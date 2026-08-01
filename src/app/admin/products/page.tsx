"use client";

import Image from "next/image";
import { formatAdminDate } from "@/lib/adminFormat";
import { useCallback, useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { CatalogTabs } from "@/components/admin/CatalogTabs";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { PlusIcon } from "@/components/admin/IconButton";
import { ProductCodesPanel } from "@/components/admin/ProductCodesPanel";
import {
  ProductForm,
  emptyProductForm,
  type ProductFormValues,
} from "@/components/admin/ProductForm";
import { StockEditor } from "@/components/admin/StockEditor";
import { type AdminCatalogRow, parsePrice } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { adjustStock, deleteProduct, upsertProduct } from "@/lib/adminStore";
import {
  apiCreateProduct,
  apiDeleteProduct,
  apiUpdateProduct,
  api,
  isApiEnabled,
  type ApiProduct,
} from "@/lib/apiClient";
import { mapApiProductToAdminRow } from "@/lib/apiMappers";
import {
  apiProductToForm,
  deriveFulfilment,
  productFormToApiPayload,
  websiteState,
  websiteStateLabels,
  websiteStateTones,
} from "@/lib/productPayload";
import { useSearchParams } from "next/navigation";

/** The fulfilment columns the API sends but `ApiProduct` doesn't declare. */
type ApiProductFulfilment = ApiProduct & {
  release_at?: string | null;
  reservation_amount?: number | null;
};

type DrawerMode = "edit" | "add" | null;

const PAGE_SIZES = [10, 25, 50, 100];

type StockFilter = "all" | "in_stock" | "low" | "out";

const STOCK_FILTER_OPTIONS: { value: StockFilter; label: string }[] = [
  { value: "all", label: "Any stock" },
  { value: "in_stock", label: "In stock" },
  { value: "low", label: "Running low" },
  { value: "out", label: "None left" },
];

function isStockFilter(value: unknown): value is StockFilter {
  return value === "all" || value === "in_stock" || value === "low" || value === "out";
}

/**
 * How the thing reaches the customer — and the only route to his pre-orders.
 *
 * Named for what each one means to him rather than for the column's values: a
 * pre-order is money he is already holding for something that has not arrived,
 * and a game code is sent rather than posted.
 */
type KindFilter = "all" | "physical" | "digital" | "preorder";

const KIND_FILTER_OPTIONS: { value: KindFilter; label: string }[] = [
  { value: "all", label: "Anything" },
  { value: "preorder", label: "Pre-orders" },
  { value: "digital", label: "Game codes" },
  { value: "physical", label: "Posted to the customer" },
];

function isKindFilter(value: unknown): value is KindFilter {
  return value === "all" || value === "physical" || value === "digital" || value === "preorder";
}

/**
 * Low/out use the store's configured threshold (the retired Inventory page's
 * behaviour) rather than a fixed 5. `stock` here is the *true* count — for a
 * code-delivered product that is the number of unsold codes, not the ignored
 * `products.stock` column.
 */
function matchesStockFilter(stock: number, filter: StockFilter, lowThreshold: number): boolean {
  if (filter === "all") return true;
  if (filter === "in_stock") return stock > lowThreshold;
  if (filter === "low") return stock > 0 && stock <= lowThreshold;
  return stock <= 0;
}

export default function AdminProductsPage() {
  const store = useAdminStore();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<string>("all");
  const [brand, setBrand] = useState("all");
  // The Platform column read "Hardware" on every row, so it went. The question
  // it was trying to answer — "show me the Xbox things" — is a filter.
  const [consoleFilter, setConsoleFilter] = useState("all");
  const [query, setQuery] = useSearchQueryParam();
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(25);

  // `?stock=` (and the retired Inventory page's legacy `?filter=`) seeds the
  // folded-in low-stock view without an effect.
  const urlStock = searchParams.get("stock") ?? searchParams.get("filter");
  const [stockLocal, setStockLocal] = useState<StockFilter | null>(null);
  const [seenStockParam, setSeenStockParam] = useState(urlStock);
  if (urlStock !== seenStockParam) {
    setSeenStockParam(urlStock);
    setStockLocal(null);
  }
  const stockFilter: StockFilter = stockLocal ?? (isStockFilter(urlStock) ? urlStock : "all");

  // `?fulfillment_type=` seeds this the same way, and is what /admin/preorders
  // now redirects with. It used to send `?fulfilment=preorder` — the theme's
  // internal spelling, one `l`, for a parameter this screen never read in
  // either spelling — so every route to his pre-orders landed on the whole
  // catalogue with no filter and nothing explaining why.
  const urlKind = searchParams.get("fulfillment_type");
  const [kindLocal, setKindLocal] = useState<KindFilter | null>(null);
  const [seenKindParam, setSeenKindParam] = useState(urlKind);
  if (urlKind !== seenKindParam) {
    setSeenKindParam(urlKind);
    setKindLocal(null);
  }
  const kindFilter: KindFilter = kindLocal ?? (isKindFilter(urlKind) ? urlKind : "all");

  const [page, setPage] = usePagedList(
    `${category}|${brand}|${consoleFilter}|${stockFilter}|${query}|${sortKey}|${sortDir}|${pageSize}`,
  );

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyProductForm);
  const [alsoIn, setAlsoIn] = useState<string[]>([]);
  const [banner, setBanner] = useState("");
  const [bannerTone, setBannerTone] = useState<"success" | "error">("success");
  const [savedKey, setSavedKey] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [openedFromNewParam, setOpenedFromNewParam] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [apiProducts, setApiProducts] = useState<AdminCatalogRow[]>([]);
  const [apiRaw, setApiRaw] = useState<Record<string, ApiProductFulfilment>>({});
  /** Unsold codes per product key — the only honest stock for a digital line. */
  const [codeStock, setCodeStock] = useState<Record<string, number>>({});
  const [apiBrandOptions, setApiBrandOptions] = useState<{ value: string; label: string }[]>([]);
  const [apiCategoryOptions, setApiCategoryOptions] = useState<{ value: string; label: string }[]>([]);
  const [listError, setListError] = useState<string | null>(null);

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
      const [first, brandsRes, categoriesRes, digitalStock] = await Promise.all([
        api.adminProducts({ page: 1, per_page: perPage, brand: brandParam }),
        api.adminBrands().catch(() => ({ data: [] as Awaited<ReturnType<typeof api.adminBrands>>["data"] })),
        api.adminCategories().catch(() => ({ data: [] as Awaited<ReturnType<typeof api.adminCategories>>["data"] })),
        // One call, every product. Without it the list rendered `products.stock`
        // for a code-delivered product — so a game card could read "30 in stock"
        // while OrderService::assertAvailable, which counts vault rows and
        // ignores that column entirely, refused every single order for it.
        api.adminDigitalStock().catch(() => []),
      ]);
      let all = Array.isArray(first.data) ? first.data : [];
      const lastPage = Number(first.last_page ?? 1);
      for (let p = 2; p <= lastPage; p += 1) {
        const res = await api.adminProducts({ page: p, per_page: perPage, brand: brandParam });
        if (Array.isArray(res.data)) all = all.concat(res.data);
      }
      setApiProducts(all.map((p, i) => mapApiProductToAdminRow(p, i)));
      // Keep the raw records: the admin row mapper drops reservation_amount and
      // the description.
      const raw: Record<string, ApiProductFulfilment> = {};
      for (const p of all) raw[p.key] = p as ApiProductFulfilment;
      setApiRaw(raw);
      const counts: Record<string, number> = {};
      for (const s of digitalStock) counts[s.product_key] = s.available;
      setCodeStock(counts);
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
      setListError(err instanceof Error ? err.message : "Could not load what you sell.");
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

  const openAdd = useCallback(() => {
    setActiveKey(null);
    setForm({ ...emptyProductForm });
    setAlsoIn([]);
    setDrawerMode("add");
    setBanner("");
    setSavedKey(null);
  }, []);

  const wantsNew = searchParams.get("new") === "1";
  if (wantsNew && !openedFromNewParam) {
    setOpenedFromNewParam(true);
    openAdd();
    if (typeof window !== "undefined") {
      // Drop only `new` so a `?stock=` deep link survives.
      const next = new URLSearchParams(window.location.search);
      next.delete("new");
      const qs = next.toString();
      window.history.replaceState(null, "", `/admin/products${qs ? `?${qs}` : ""}`);
    }
  }

  const brandOptions = useMemo(() => {
    if (isApiEnabled()) return apiBrandOptions.map((b) => b.value);
    return store.brands
      .filter((b) => b.active)
      .map((b) => b.name)
      .sort((a, b) => a.localeCompare(b));
  }, [store.brands, apiBrandOptions]);

  const brandFilter = brand !== "all" && brandOptions.includes(brand) ? brand : "all";

  const categoryOptions = useMemo(() => {
    if (isApiEnabled()) return apiCategoryOptions.map((c) => c.value);
    return store.categories.filter((c) => c.active).map((c) => c.key);
  }, [store.categories, apiCategoryOptions]);

  const categoryFilter =
    category !== "all" && categoryOptions.includes(category) ? category : "all";

  const productSource = isApiEnabled() ? apiProducts : store.products;

  const consoleOptions = useMemo(
    () => [...new Set(productSource.map((p) => p.platform))].sort((a, b) => a.localeCompare(b)),
    [productSource],
  );

  /** The number that is actually true for this row. */
  const trueStock = useCallback(
    (row: AdminCatalogRow) => (row.digital ? (codeStock[row.key] ?? 0) : row.stock),
    [codeStock],
  );

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = productSource.filter((row) => {
      if (categoryFilter !== "all" && row.category !== categoryFilter) return false;
      if (brandFilter !== "all" && row.brand !== brandFilter) return false;
      if (consoleFilter !== "all" && row.platform !== consoleFilter) return false;
      if (!matchesStockFilter(trueStock(row), stockFilter, lowThreshold)) return false;
      if (kindFilter !== "all" && (row.fulfillmentType ?? "physical") !== kindFilter) return false;
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
      if (sortKey === "stock") cmp = trueStock(a) - trueStock(b);
      else if (sortKey === "price") cmp = parsePrice(a.price) - parsePrice(b.price);
      else cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [
    productSource,
    categoryFilter,
    brandFilter,
    consoleFilter,
    stockFilter,
    lowThreshold,
    trueStock,
    query,
    sortKey,
    sortDir,
  ]);

  function openEdit(row: AdminCatalogRow) {
    const raw = isApiEnabled() ? apiRaw[row.key] : undefined;
    setActiveKey(row.key);
    setForm(
      raw
        ? apiProductToForm(raw)
        : {
            ...emptyProductForm,
            category: row.category,
            name: row.name,
            brand: row.brand,
            itemCode: row.sku,
            platform: row.platform,
            webAddress: row.key,
            price: String(parsePrice(row.price) || ""),
            strike: row.strike ? String(parsePrice(row.strike)) : "",
            taxInclusive: row.taxInclusive ?? true,
            stock: String(row.stock),
            delivery: row.digital ? "digital" : "physical",
            releaseAt: row.releaseDate ?? "",
            onWebsite: row.status !== "draft",
            image: row.image,
          },
    );
    setAlsoIn([]);
    setDrawerMode("edit");
    setBanner("");
    setSavedKey(null);
  }

  function closeDrawer() {
    setDrawerMode(null);
    setActiveKey(null);
    setBanner("");
    setSavedKey(null);
  }

  function updateForm<K extends keyof ProductFormValues>(key: K, value: ProductFormValues[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  /** Inline stock save landed — patch the row instead of refetching the catalog. */
  const handleStockSaved = useCallback((key: string, nextStock: number) => {
    setApiProducts((prev) =>
      prev.map((row) => (row.key === key ? { ...row, stock: nextStock } : row)),
    );
    setApiRaw((prev) => (prev[key] ? { ...prev, [key]: { ...prev[key], stock: nextStock } } : prev));
  }, []);

  const handleCodeCount = useCallback((key: string, unsold: number) => {
    setCodeStock((prev) => (prev[key] === unsold ? prev : { ...prev, [key]: unsold }));
  }, []);

  async function save(onWebsite: boolean) {
    if (saving) return;
    setSaving(true);
    setBannerTone("success");
    try {
      await saveProduct(onWebsite);
    } finally {
      setSaving(false);
    }
  }

  function payloadFor(key: string, onWebsite: boolean) {
    return productFormToApiPayload({
      key,
      name: form.name,
      category: form.category,
      brand: form.brand,
      price: form.price,
      strike: form.strike,
      cost: form.cost,
      taxInclusive: form.taxInclusive,
      // For a code-delivered product this column is meaningless — the vault is
      // its stock, and OrderService::assertAvailable ignores the column
      // entirely. The form stops asking, so whatever was already there rides
      // along untouched; a save is not the place to quietly rewrite it.
      stock: Number(form.stock) || 0,
      onWebsite,
      image: form.image,
      description: form.description,
      fulfilment: deriveFulfilment(form),
      alsoIn: alsoIn.length > 0 ? alsoIn : undefined,
    });
  }

  async function saveProduct(onWebsite: boolean) {
    if (drawerMode === "add") {
      // Sanitised up front, not inside the payload builder: the codes panel and
      // the reload both need the key the SERVER will hold. Generating
      // "games:new-123" here and letting the builder turn it into
      // "games-new-123" meant the panel then asked for codes belonging to a
      // product key that does not exist.
      const key = `${form.category}-new-${Date.now()}`.replace(/[^a-zA-Z0-9_-]/g, "-");
      if (isApiEnabled()) {
        try {
          await apiCreateProduct(payloadFor(key, onWebsite));
          // He is receiving a shipment, not creating one product. The drawer
          // stays open and says what really happened; the old flow closed it and
          // made him press "Add product" again for the second box in the carton.
          setSavedKey(key);
          setBanner(
            onWebsite
              ? "Saved. It's on the website."
              : "Saved, and hidden. Customers can't see it yet.",
          );
          await loadProducts();
        } catch (err) {
          setBannerTone("error");
          setBanner(
            err instanceof Error ? `Not saved — ${err.message}` : "Not saved. Nothing was changed.",
          );
        }
        return;
      }
      upsertProduct({
        key,
        category: form.category,
        name: form.name,
        brand: form.brand,
        sku: form.itemCode,
        platform: form.platform,
        edition: "",
        price: form.price,
        strike: form.strike,
        stock: Number(form.stock) || 0,
        digital: form.delivery === "digital",
        status: onWebsite ? "published" : "draft",
        image: form.image,
        releaseDate: form.releaseAt || undefined,
      });
      setSavedKey(key);
      setBanner(onWebsite ? "Saved. It's on the website." : "Saved, and hidden.");
      return;
    }

    if (!activeProduct) return;
    const nextStock = form.delivery === "digital" ? 0 : Number(form.stock) || 0;
    if (isApiEnabled()) {
      try {
        await apiUpdateProduct(
          activeProduct.key.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 80),
          payloadFor(activeProduct.key, onWebsite),
        );
        setBanner(
          onWebsite ? "Saved. It's on the website." : "Saved, and taken off the website.",
        );
        await loadProducts();
        closeDrawer();
      } catch (err) {
        setBannerTone("error");
        // The drawer stays open and every value he typed stays typed.
        setBanner(
          err instanceof Error ? `Not saved — ${err.message}` : "Not saved. Nothing was changed.",
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
      sku: form.itemCode,
      platform: form.platform,
      edition: "",
      price: form.price,
      strike: form.strike,
      stock: activeProduct.stock,
      digital: form.delivery === "digital",
      status: onWebsite ? "published" : "draft",
      image: form.image,
      releaseDate: form.releaseAt || undefined,
    });
    if (delta !== 0) adjustStock(activeProduct.key, delta, "Product edit stock");
    setBanner("Saved.");
    window.setTimeout(closeDrawer, 500);
  }

  /** Keep category and brand; clear the box-specific fields. */
  function addAnother() {
    setSavedKey(null);
    setBanner("");
    setForm((prev) => ({
      ...emptyProductForm,
      category: prev.category,
      brand: prev.brand,
      delivery: prev.delivery,
      taxInclusive: prev.taxInclusive,
    }));
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
        setBannerTone("error");
        setBanner(
          err instanceof Error ? `Not deleted — ${err.message}` : "Could not delete this product.",
        );
      }
      return;
    }
    deleteProduct(activeProduct.key);
    closeDrawer();
  }

  function downloadSpreadsheet() {
    const header = "item code,name,brand,console,in stock,on the website,price\n";
    const body = rows
      .map((r) => {
        const state = websiteState({
          active: r.status !== "draft",
          stock: r.stock,
          fulfilmentType: r.digital ? "digital" : "physical",
          codeCount: codeStock[r.key],
        });
        return `${r.sku},"${r.name.replace(/"/g, '""')}",${r.brand},${r.platform},${trueStock(r)},${websiteStateLabels[state]},${r.price}`;
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
        // The column, not the calendar. Comparing releaseDate to today meant a
        // pre-order whose release had passed stopped showing as one — the exact
        // moment the owner most needs to see it, because those are the ones he
        // owes people.
        const preorder = row.fulfillmentType === "preorder";
        return (
          <div className="flex items-center gap-3">
            <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-lg bg-[#F5F5F7] ring-1 ring-black/[0.04]">
              {row.image ? (
                <Image src={row.image} alt="" fill className="object-contain p-0.5" sizes="40px" />
              ) : null}
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate text-sm font-semibold tracking-[-0.02em]">{row.name}</span>
                {preorder ? (
                  <span className="shrink-0 rounded bg-[#FFEDD5] px-1.5 py-0.5 text-[9px] font-semibold text-[#9A3412]">
                    Waiting for release
                  </span>
                ) : null}
              </div>
              {/* The SKU column is gone. It printed the URL slug —
                  "dualsense-wireless-controller-chrome-indigo-accplay265" —
                  which wrapped over five lines and forced every row to ~130px,
                  so a 298-product catalogue was sixty screens of scrolling. The
                  code that IS on the shelf label sits here in eleven characters.
                  The Platform column is gone with it: it read "Hardware" on
                  every row, a column whose job was to be the same word 298
                  times. The question survives as a filter. */}
              <div className="mt-0.5 truncate text-[11px] text-[#86868B]">
                {row.platform}
                {row.sku ? ` · ${row.sku}` : ""}
                {preorder ? ` · releases ${formatAdminDate(row.releaseDate)}` : ""}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      key: "stock",
      header: "In stock",
      sortable: true,
      // One control, not two. A StockBadge and a separate "± Stock" button used
      // to sit side by side for the same job — click the number you are looking
      // at. A code-delivered product opens the codes panel instead, because its
      // stock is not a number anyone can type.
      render: (row) =>
        row.digital ? (
          <span className="text-xs font-semibold text-[#1D1D1F]">
            {codeStock[row.key] ?? 0} codes
          </span>
        ) : (
          <StockEditor
            productKey={row.key}
            name={row.name}
            stock={row.stock}
            onSaved={handleStockSaved}
          >
            <StockNumber stock={row.stock} low={lowThreshold} />
          </StockEditor>
        ),
    },
    {
      key: "price",
      header: "Price",
      sortable: true,
      render: (row) => (
        <span className="ez-mono text-xs font-medium">
          {row.price}
          {row.strike ? (
            <span className="ml-1.5 text-[#AEAEB2] line-through">{row.strike}</span>
          ) : null}
        </span>
      ),
    },
    {
      key: "status",
      header: "On the website",
      render: (row) => {
        const state = websiteState({
          active: row.status !== "draft",
          stock: row.stock,
          fulfilmentType: row.digital ? "digital" : "physical",
          codeCount: codeStock[row.key],
        });
        return (
          <span
            className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[10px] font-semibold ${websiteStateTones[state]}`}
          >
            {websiteStateLabels[state]}
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      // A labelled word, not an unexplained eye and pencil pair. The eye opened
      // a read-only panel of the same values the edit drawer shows — a second
      // screen for looking at what you are about to change.
      render: (row) => (
        <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => openEdit(row)}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-[#1D1D1F] underline underline-offset-2"
          >
            Edit
          </button>
        </div>
      ),
    },
  ];

  const drawerProductKey = drawerMode === "add" ? savedKey : activeProduct?.key ?? null;

  return (
    <div className="space-y-4">
      <AdminPageHeader
        title="Products"
        description="Everything you sell. Click a stock number to change it, or a product to edit the rest."
        // The "298 SKUs" pill that lived here said the same number as the count
        // beside the search box 200px below, in a word he does not use. Both are
        // gone: DataTable's footer already prints "1–25 of 298".
      />

      <CatalogTabs active="products" />

      {listError ? <AdminNotice tone="error">{listError}</AdminNotice> : null}

      <section className="overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
        {/* The four-tab fulfilment strip is gone: "All 298 · Physical 291 ·
            Digital 0 · Pre-orders 7" was two tabs of decoration and one tab of
            seven, above a notice that existed only to explain the strip. */}
        <div className="flex flex-col gap-2.5 bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
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
              placeholder="Search by name, item code or brand"
              className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
            />
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
                      .map((cat) => ({ value: cat.key, label: cat.label }))),
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
                  : store.brands.filter((b) => b.active).map((b) => ({ value: b.name, label: b.name }))),
              ]}
            />
            <AdminSelect
              label="Console"
              value={consoleFilter}
              onChange={setConsoleFilter}
              options={[
                { value: "all", label: "Any console" },
                ...consoleOptions.map((c) => ({ value: c, label: c })),
              ]}
            />
            <AdminSelect
              label="Stock"
              value={stockFilter}
              onChange={(value) => setStockLocal(value as StockFilter)}
              options={STOCK_FILTER_OPTIONS}
            />
            <AdminSelect
              label="Kind"
              value={kindFilter}
              onChange={(value) => setKindLocal(value as KindFilter)}
              options={KIND_FILTER_OPTIONS}
            />
            <div className="hidden h-6 w-px bg-black/[0.08] sm:block" aria-hidden />
            <button
              type="button"
              onClick={downloadSpreadsheet}
              className="inline-flex h-9 items-center rounded-xl border border-black/[0.1] bg-white px-3 text-xs font-semibold text-[#424245]"
            >
              Download as a spreadsheet
            </button>
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
      </section>

      <DataTable
        loading={listLoading}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        emptyMessage={
          query.trim()
            ? `Nothing matches "${query.trim()}".`
            : "Nothing here yet. Add the first thing you sell."
        }
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
        onRowClick={openEdit}
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
      />

      <AdminDrawer
        open={drawerMode !== null}
        title={drawerMode === "add" ? "Add a product" : (activeProduct?.name ?? "Product")}
        onClose={closeDrawer}
        widthClassName="max-w-lg sm:max-w-xl"
      >
        {drawerMode === "add" && savedKey ? (
          <div className="space-y-3">
            <AdminNotice tone="info">{banner}</AdminNotice>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={addAnother}
                className="inline-flex h-10 items-center rounded-lg bg-[#1D1D1F] px-4 text-xs font-semibold text-white"
              >
                Add another
              </button>
              <button
                type="button"
                onClick={closeDrawer}
                className="inline-flex h-10 items-center rounded-lg border border-black/10 px-4 text-xs font-semibold"
              >
                Done
              </button>
            </div>
            {form.delivery === "digital" && drawerProductKey ? (
              <ProductCodesPanel
                productKey={drawerProductKey}
                onCountChange={handleCodeCount}
              />
            ) : null}
          </div>
        ) : drawerMode !== null ? (
          <ProductForm
            key={drawerMode === "add" ? "add" : (activeKey ?? "edit")}
            form={form}
            update={updateForm}
            mode={drawerMode}
            onSubmit={() => void save(true)}
            onSubmitHidden={() => void save(false)}
            onCancel={closeDrawer}
            onDelete={drawerMode === "edit" ? () => setConfirmDelete(true) : undefined}
            banner={banner || undefined}
            bannerTone={bannerTone}
            submitting={saving}
            extraCategories={alsoIn}
            onExtraCategoriesChange={setAlsoIn}
            codesPanel={
              form.delivery === "digital" && drawerMode === "edit" && drawerProductKey ? (
                <ProductCodesPanel
                  productKey={drawerProductKey}
                  onCountChange={handleCodeCount}
                />
              ) : form.delivery === "digital" ? (
                <p className="rounded-xl border border-black/[0.07] bg-[#FAFAFB] p-3.5 text-[12px] leading-snug text-[#6E6E73]">
                  Save this first, then paste in the codes your supplier sent.
                </p>
              ) : null
            }
          />
        ) : null}
      </AdminDrawer>

      <ConfirmDialog
        open={confirmDelete}
        title={`Delete ${activeProduct?.name ?? "this product"}?`}
        description={
          `It comes off your website and out of this list straight away. ` +
          `Nothing happens to orders that already contain it, and no customer is told anything. ` +
          `Your categories, brands and every other product are untouched. ` +
          `If you only want to stop selling it for now, close this and use "Save but keep it hidden" instead.`
        }
        confirmLabel="Delete it"
        cancelLabel="Keep it"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete()}
      />
    </div>
  );
}

/** The stock number, coloured by how worried he should be. */
function StockNumber({ stock, low }: { stock: number; low: number }) {
  const tone =
    stock <= 0 ? "text-[#B42318]" : stock <= low ? "text-[#8A5A00]" : "text-[#1D1D1F]";
  return <span className={`text-xs font-semibold ${tone}`}>{stock}</span>;
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}
