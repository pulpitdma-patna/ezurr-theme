"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminStore } from "@/hooks/useAdminStore";
import { logActivity, setAdminState } from "@/lib/adminStore";
import type { AdminCatalogRow, AdminDigitalCode } from "@/data/admin";

function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => line.split(",").map((cell) => cell.trim().replace(/^"|"$/g, "")));
}

export default function AdminImportPage() {
  const store = useAdminStore();
  const toast = useAdminToast();
  const [report, setReport] = useState<string[]>([]);

  function downloadTemplate(kind: "products" | "codes") {
    const content =
      kind === "products"
        ? "key,name,brand,sku,price,strike,stock,platform,category,status\ncustom-sku,Demo Game,Ezurr,EZ-DEMO-0001,2999,3499,10,PS5,games,published\n"
        : "id,code,platform,productName,status\nDC-IMPORT-1,PSN-AAAA-BBBB-CCCC,PS5,Demo Title,available\n";
    const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = kind === "products" ? "ezurr-products-template.csv" : "ezurr-codes-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  function importProducts(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ""));
      if (rows.length < 2) {
        setReport(["No data rows found"]);
        return;
      }
      const [header, ...body] = rows;
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name);
      const notes: string[] = [];
      let imported = 0;
      setAdminState((prev) => {
        const products = [...prev.products];
        for (const cells of body) {
          const key = cells[idx("key")] || `import-${Date.now()}-${imported}`;
          const name = cells[idx("name")];
          if (!name) {
            notes.push(`Skipped row without name`);
            continue;
          }
          const stock = Number(cells[idx("stock")] ?? 0) || 0;
          const row: AdminCatalogRow = {
            key,
            category: (cells[idx("category")] as AdminCatalogRow["category"]) || "games",
            index: products.length + imported,
            name,
            brand: cells[idx("brand")] || "Ezurr",
            price: cells[idx("price")] || "0",
            strike: cells[idx("strike")] || "",
            image: "/products/placeholder.jpg",
            sku: cells[idx("sku")] || `EZ-IMP-${imported + 1}`,
            platform: (cells[idx("platform")] as AdminCatalogRow["platform"]) || "Multi",
            stock,
            status: (cells[idx("status")] as AdminCatalogRow["status"]) || "draft",
            digital: false,
            edition: "Standard",
          };
          const existing = products.findIndex((p) => p.key === key || p.sku === row.sku);
          if (existing >= 0) products[existing] = { ...products[existing], ...row, key: products[existing].key };
          else products.push(row);
          imported += 1;
        }
        return { ...prev, products };
      });
      notes.unshift(`Imported / upserted ${imported} product row(s)`);
      setReport(notes);
      logActivity({
        actor: "Admin",
        action: "import.products",
        entityType: "product",
        entityId: "bulk",
        detail: `${imported} rows`,
      });
      toast.push(`Products import: ${imported} rows`, "success");
    };
    reader.readAsText(file);
  }

  function importCodes(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ""));
      if (rows.length < 2) {
        setReport(["No data rows found"]);
        return;
      }
      const [header, ...body] = rows;
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name);
      let imported = 0;
      setAdminState((prev) => {
        const digitalCodes = [...prev.digitalCodes];
        for (const cells of body) {
          const code = cells[idx("code")];
          if (!code) continue;
          const entry: AdminDigitalCode = {
            id: cells[idx("id")] || `DC-IMP-${Date.now()}-${imported}`,
            code,
            platform: (cells[idx("platform")] as AdminDigitalCode["platform"]) || "Multi",
            productName: cells[idx("productName")] || "Imported title",
            status: (cells[idx("status")] as AdminDigitalCode["status"]) || "available",
          };
          digitalCodes.unshift(entry);
          imported += 1;
        }
        return { ...prev, digitalCodes };
      });
      setReport([`Imported ${imported} digital code(s). Raw codes stay vaulted in local store.`]);
      logActivity({
        actor: "Admin",
        action: "import.digital_codes",
        entityType: "system",
        entityId: "digital-codes",
        detail: `${imported} codes`,
      });
      toast.push(`Digital codes import: ${imported}`, "success");
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <AdminPageHeader
        title="Import"
        description="CSV templates for catalog and digital vault. Validation runs in-browser against the mock store."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Import" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(17,17,19,0.04)]">
          <h2 className="text-sm font-semibold tracking-[-0.02em]">Products CSV</h2>
          <p className="mt-1 text-xs text-[#6E6E73]">
            Upserts by key/SKU. Current catalog: {store.products.length} SKUs.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("products")}
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold"
            >
              Download template
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white">
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importProducts(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>

        <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(17,17,19,0.04)]">
          <h2 className="text-sm font-semibold tracking-[-0.02em]">Digital codes CSV</h2>
          <p className="mt-1 text-xs text-[#6E6E73]">
            Appends available codes to the vault. Current vault: {store.digitalCodes.length}.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("codes")}
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold"
            >
              Download template
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white">
              Upload CSV
              <input
                type="file"
                accept=".csv,text/csv"
                className="sr-only"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) importCodes(file);
                  e.target.value = "";
                }}
              />
            </label>
          </div>
        </section>
      </div>

      <div className="mt-5">
        {report.length === 0 ? (
          <AdminEmptyState
            title="No import run yet"
            description="Download a template, fill rows, then upload to validate against this workspace."
          />
        ) : (
          <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
            <h3 className="text-sm font-semibold">Last import report</h3>
            <ul className="mt-3 space-y-1.5 text-sm text-[#424245]">
              {report.map((line) => (
                <li key={line}>· {line}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
