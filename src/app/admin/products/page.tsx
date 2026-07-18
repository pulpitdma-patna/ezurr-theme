"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
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
import { ListToolbar } from "@/components/admin/ListToolbar";
import { ProductForm, type ProductFormValues } from "@/components/admin/ProductForm";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { StockBadge } from "@/components/admin/StockBadge";
import {
  parsePrice,
  type AdminCatalogRow,
  type AdminProductCategory,
} from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { useAutoBanner } from "@/hooks/useAutoBanner";
import { useListSavedViews } from "@/hooks/useListSavedViews";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { adjustStock, publishProducts, unpublishProducts, upsertProduct } from "@/lib/adminStore";
import { useSearchParams } from "next/navigation";

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
    stock: String(product.stock),
    digital: product.digital,
    status: product.status,
    image: product.image,
    releaseDate: product.releaseDate,
  };
}

const PAGE_SIZES = [10, 25, 50, 100];

export default function AdminProductsPage() {
  const store = useAdminStore();
  const searchParams = useSearchParams();
  const [category, setCategory] = useState<AdminProductCategory | "all">("all");
  const [brand, setBrand] = useState("all");
  const [query, setQuery] = useSearchQueryParam();
  const [selected, setSelected] = useState<string[]>([]);
  const [sortKey, setSortKey] = useState("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [pageSize, setPageSize] = useState(25);
  const [page, setPage] = usePagedList(
    `${category}|${brand}|${query}|${sortKey}|${sortDir}|${pageSize}`,
  );

  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormValues>(emptyForm);
  const [toast, setToast] = useAutoBanner();
  const [openedFromNewParam, setOpenedFromNewParam] = useState(false);
  const [listLoading, setListLoading] = useState(true);
  const [viewName, setViewName] = useState("");
  const { views, saveView, removeView } = useListSavedViews("products");

  useEffect(() => {
    const t = window.setTimeout(() => setListLoading(false), 220);
    return () => window.clearTimeout(t);
  }, []);

  const activeProduct = useMemo(
    () => (activeKey ? (store.products.find((p) => p.key === activeKey) ?? null) : null),
    [store.products, activeKey],
  );

  const wantsNew = searchParams.get("new") === "1";
  if (wantsNew && !openedFromNewParam) {
    setOpenedFromNewParam(true);
    setActiveKey(null);
    setForm({ ...emptyForm });
    setDrawerMode("add");
    setToast("");
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", "/admin/products");
    }
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !drawerMode) setSelected([]);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [drawerMode]);

  const brandOptions = useMemo(
    () =>
      store.brands
        .filter((b) => b.active)
        .map((b) => b.name)
        .sort((a, b) => a.localeCompare(b)),
    [store.brands],
  );

  const brandFilter = brand !== "all" && brandOptions.includes(brand) ? brand : "all";

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = store.products.filter((row) => {
      if (category !== "all" && row.category !== category) return false;
      if (brandFilter !== "all" && row.brand !== brandFilter) return false;
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
  }, [store.products, category, brandFilter, query, sortKey, sortDir]);

  function openView(row: AdminCatalogRow) {
    setActiveKey(row.key);
    setForm(toForm(row));
    setDrawerMode("view");
    setToast("");
  }

  function openEdit(row: AdminCatalogRow) {
    setActiveKey(row.key);
    setForm(toForm(row));
    setDrawerMode("edit");
    setToast("");
  }

  function openAdd() {
    setActiveKey(null);
    setForm({ ...emptyForm });
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
  }

  function handleSave(event: React.FormEvent) {
    event.preventDefault();
    if (drawerMode === "add") {
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
      setToast("Product created");
      window.setTimeout(closeDrawer, 500);
      return;
    }

    if (!activeProduct) return;
    const nextStock = Number(form.stock) || 0;
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
      digital: form.digital,
      status: form.status,
      image: form.image,
      releaseDate: form.releaseDate,
    });
    if (delta !== 0) {
      adjustStock(activeProduct.key, delta, "Product edit stock");
    }
    setToast("Product saved");
    window.setTimeout(closeDrawer, 500);
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
    const header = "sku,name,brand,platform,stock,status,price\n";
    const body = rows
      .filter((r) => selected.length === 0 || selected.includes(r.key))
      .map(
        (r) =>
          `${r.sku},"${r.name.replace(/"/g, '""')}",${r.brand},${r.platform},${r.stock},${r.status},${r.price}`,
      )
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
      render: (row) => (
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
            <div className="truncate text-sm font-semibold tracking-[-0.02em]">{row.name}</div>
            <div className="mt-0.5 text-[11px] text-[#86868B]">{row.brand}</div>
          </div>
        </div>
      ),
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
      render: (row) => <StockBadge stock={row.stock} />,
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
    <div>
      <AdminPageHeader
        title="Products"
        description="Quick edit in the drawer · full editor for deep catalog fields and media."
      />

      <ListToolbar
        resultLabel={`${rows.length} products`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search name, SKU, brand, platform…",
        }}
        filters={
          <>
            <AdminSelect
              label="Category"
              value={category}
              onChange={(value) => setCategory(value as AdminProductCategory | "all")}
              options={[
                { value: "all", label: "All categories" },
                ...store.categories
                  .filter((c) => c.active)
                  .map((cat) => ({
                    value: cat.key,
                    label: cat.label,
                  })),
              ]}
            />
            <AdminSelect
              label="Brand"
              value={brandFilter}
              onChange={setBrand}
              options={[
                { value: "all", label: "All brands" },
                ...store.brands
                  .filter((b) => b.active)
                  .map((b) => ({ value: b.name, label: b.name })),
              ]}
            />
          </>
        }
        actions={
          <>
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
          </>
        }
      />

      <div className="mb-3 flex flex-wrap items-center gap-2">
        {views.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => {
              setQuery(view.query);
              setCategory((view.filters.category as AdminProductCategory | "all") || "all");
              setBrand(view.filters.brand || "all");
            }}
            onContextMenu={(event) => {
              event.preventDefault();
              removeView(view.id);
              setToast("View removed");
            }}
            className="rounded-full border border-black/[0.08] bg-white px-3 py-1.5 text-[11px] font-semibold text-[#424245] hover:text-[#1D1D1F]"
            title="Click to apply · right-click to remove"
          >
            {view.name}
          </button>
        ))}
        <input
          value={viewName}
          onChange={(e) => setViewName(e.target.value)}
          placeholder="Save view name"
          className="h-8 rounded-lg border border-black/[0.08] bg-white px-2.5 text-xs outline-none focus:border-black/[0.14]"
        />
        <button
          type="button"
          onClick={() => {
            saveView({
              name: viewName.trim() || "Products view",
              query,
              filters: { category, brand: brandFilter },
            });
            setViewName("");
            setToast("View saved");
          }}
          className="h-8 rounded-lg bg-[#1D1D1F] px-3 text-[11px] font-semibold text-white"
        >
          Save view
        </button>
      </div>

      <DataTable
        loading={listLoading}
        columns={columns}
        rows={rows}
        rowKey={(row) => row.key}
        emptyMessage="No products match this filter."
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
              onClick={() => {
                publishProducts(selected);
                setSelected([]);
              }}
              className="h-7 rounded-md bg-white px-2.5 text-[11px] font-semibold text-[#1D1D1F]"
            >
              Publish drafts
            </button>
            <button
              type="button"
              onClick={() => {
                unpublishProducts(selected);
                setSelected([]);
              }}
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
          <ProductViewPanel product={activeProduct} />
        ) : null}

        {(drawerMode === "edit" || drawerMode === "add") && (
          <ProductForm
            key={drawerMode === "add" ? "add" : (activeKey ?? "edit")}
            form={form}
            update={updateForm}
            onSubmit={handleSave}
            submitLabel={drawerMode === "add" ? "Create product" : "Save changes"}
            onCancel={closeDrawer}
            embedded
            toastMessage={toast || undefined}
          />
        )}
      </AdminDrawer>
    </div>
  );
}

function ProductViewPanel({ product }: { product: AdminCatalogRow }) {
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
            {product.digital ? (
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
            store.categories.find((t) => t.key === product.category)?.label ?? product.category
          }
        />
        <ViewField label="Stock qty" value={String(product.stock)} mono />
        <ViewField
          label="Release"
          value={product.releaseDate ?? "—"}
          mono={Boolean(product.releaseDate)}
        />
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
