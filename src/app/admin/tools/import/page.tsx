"use client";

import { useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminStore } from "@/hooks/useAdminStore";
import { logActivity, setAdminState } from "@/lib/adminStore";
import { api, apiImport, isApiEnabled } from "@/lib/apiClient";
import { adminErrorMessage } from "@/lib/adminError";
import type { AdminCatalogRow, AdminDigitalCode } from "@/data/admin";

/**
 * Splits a spreadsheet export, respecting quotes.
 *
 * It used to split on every comma, so one product called "Assassin's Creed
 * Valhalla, Gold Edition" — which is exactly how Excel writes a title with a
 * comma in it — shunted every later column one place along. The price landed in
 * the stock column and the row was imported wrong rather than refused, on a file
 * of three hundred games where nobody would spot it.
 *
 * Line splitting is deliberately left alone: neither template has a free-text
 * column, so a newline inside a quoted cell does not arise, and rewriting it
 * would put files that parse correctly today at risk.
 */
function parseCsv(text: string): string[][] {
  return text
    .trim()
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const cells: string[] = [];
      let cell = "";
      let quoted = false;
      let inQuotes = false;
      for (let i = 0; i < line.length; i += 1) {
        const ch = line[i];
        if (ch === '"') {
          // A doubled quote inside quotes is one literal quote — Excel's own way
          // of writing 24" Monitor.
          if (inQuotes && line[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            inQuotes = !inQuotes;
            quoted = true;
          }
          continue;
        }
        if (ch === "," && !inQuotes) {
          cells.push(quoted ? cell : cell.trim());
          cell = "";
          quoted = false;
          continue;
        }
        cell += ch;
      }
      cells.push(quoted ? cell : cell.trim());
      return cells;
    });
}

export default function AdminImportPage() {
  const store = useAdminStore();
  const toast = useAdminToast();
  const [report, setReport] = useState<string[]>([]);

  function downloadTemplate(kind: "products" | "codes") {
    const content =
      kind === "products"
        ? "key,name,brand,sku,price,strike,stock,platform,category,status\ncustom-sku,Demo Game,Ezurr,EZ-DEMO-0001,2999,3499,10,PS5,games,published\n"
        // productKey names the product each code belongs to — the vault is keyed
        // on it, and a template without it produces a file the importer has to
        // reject.
        : "productKey,code,platform,productName,status\nps-plus-12m,PSN-AAAA-BBBB-CCCC,PS5,Demo Title,available\n";
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
        setReport(["That file had a heading row and nothing under it."]);
        return;
      }
      const [header, ...body] = rows;
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name);

      // A row with the wrong number of columns is not a row this file can be
      // read against — every value after the gap belongs to the wrong heading.
      // They used to be imported anyway, silently, so a price could end up in
      // the stock column on a file of three hundred games.
      const skipped = body.filter((cells) => cells.length !== header.length);
      const usable = body.filter((cells) => cells.length === header.length);
      const skippedNote = skipped.length
        ? `${skipped.length} ${skipped.length === 1 ? "row was" : "rows were"} skipped — they did not have the same columns as the heading row: ${skipped.map((c) => c[0]).join(", ")}.`
        : null;

      // API mode: send the parsed rows to the server's import endpoint instead
      // of only writing to localStorage.
      if (isApiEnabled()) {
        const cell = (cells: string[], name: string) => {
          const i = idx(name);
          return i >= 0 ? cells[i] : undefined;
        };
        const products = usable
          .map((cells) => {
            const name = cell(cells, "name");
            if (!name) return null;
            const key = cell(cells, "key") || name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
            return {
              key,
              title: name,
              slug: key,
              price: Number(String(cell(cells, "price") ?? "0").replace(/[^\d]/g, "")) || 0,
              stock: Number(cell(cells, "stock") ?? 0) || 0,
              category_slug: cell(cells, "category") || null,
              brand_slug: cell(cells, "brand") || null,
              active: (cell(cells, "status") || "draft") === "published",
            };
          })
          .filter((p): p is NonNullable<typeof p> => p !== null);

        if (products.length === 0) {
          setReport(["Nothing could be used — every row needs a name."]);
          return;
        }

        void apiImport({ products, dryRun: false })
          .then((res) => {
            const n = res.summary.products;
            setReport(
              [`${n} ${n === 1 ? "product" : "products"} added or updated.`, skippedNote].filter(
                (line): line is string => Boolean(line),
              ),
            );
            toast.push(`${n} ${n === 1 ? "product" : "products"} brought in`, "success");
          })
          .catch((err: Error) => {
            setReport([`Nothing was brought in — ${err.message}`]);
            toast.push("Nothing was brought in", "warning");
          });
        return;
      }

      const notes: string[] = skippedNote ? [skippedNote] : [];
      let imported = 0;
      setAdminState((prev) => {
        const products = [...prev.products];
        for (const cells of usable) {
          const key = cells[idx("key")] || `import-${Date.now()}-${imported}`;
          const name = cells[idx("name")];
          if (!name) {
            notes.push("Skipped a row with no name in it.");
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
      notes.unshift(`${imported} ${imported === 1 ? "product" : "products"} added or updated.`);
      setReport(notes);
      logActivity({
        actor: "Admin",
        action: "import.products",
        entityType: "product",
        entityId: "bulk",
        detail: `${imported} rows`,
      });
      toast.push(`${imported} ${imported === 1 ? "product" : "products"} brought in`, "success");
    };
    reader.readAsText(file);
  }

  function importCodes(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      const rows = parseCsv(String(reader.result ?? ""));
      if (rows.length < 2) {
        setReport(["That file had a heading row and nothing under it."]);
        return;
      }
      const [header, ...body] = rows;
      const idx = (name: string) => header.findIndex((h) => h.toLowerCase() === name);
      let imported = 0;

      // API mode sends the codes to the vault on the server. This branch used to
      // be the only one: the codes went into localStorage, the screen said
      // "Digital codes import: 500", and the server had none of them — so the
      // owner would list a product as in stock and the first buyer's order would
      // find an empty vault. The products importer above already had this branch;
      // this one was simply never given it.
      if (isApiEnabled()) {
        const byProduct = new Map<string, string[]>();
        for (const cells of body) {
          const code = cells[idx("code")];
          // productKey is what the vault is keyed on; productName is a label.
          const key = cells[idx("productkey")] || cells[idx("productKey".toLowerCase())];
          if (!code || !key) continue;
          byProduct.set(key, [...(byProduct.get(key) ?? []), code]);
          imported += 1;
        }

        if (byProduct.size === 0) {
          setReport([
            "None of those rows could be used. Each one needs the code itself, and the name of the product it belongs to — the blank spreadsheet has both columns already.",
          ]);
          toast.push("Nothing came in — check the columns", "warning");
          return;
        }

        void Promise.all(
          [...byProduct.entries()].map(([key, codes]) =>
            api.importDigitalCodes(key, codes.join("\n")),
          ),
        )
          .then((results) => {
            const added = results.reduce((n, r) => n + (r.imported ?? 0), 0);
            const skipped = results.reduce((n, r) => n + (r.skipped ?? 0), 0);
            setReport([
              `${added} ${added === 1 ? "code is" : "codes are"} ready to sell${
                skipped ? `. ${skipped} were already here, so they were left alone` : ""
              }.`,
            ]);
            toast.push(`${added} ${added === 1 ? "code" : "codes"} added`, "success");
          })
          .catch((err) => {
            const message = adminErrorMessage(err, "The codes did not go in.");
            setReport([message]);
            toast.push(message, "warning");
          });
        return;
      }

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
      setReport([
        `Practice shop — ${imported} ${imported === 1 ? "code" : "codes"} were read, but they stay in this browser only and no customer can be sent one.`,
      ]);
      logActivity({
        actor: "Admin",
        action: "import.digital_codes",
        entityType: "system",
        entityId: "digital-codes",
        detail: `${imported} codes`,
      });
      toast.push(`${imported} ${imported === 1 ? "code" : "codes"} read`, "success");
    };
    reader.readAsText(file);
  }

  return (
    <div>
      <AdminPageHeader
        title="Bring in a list"
        description="Add a lot of products or game codes at once, from a spreadsheet."
        breadcrumbs={[
          { label: "Setup", href: "/admin/settings" },
          { label: "Bring in a list" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="rounded-2xl border border-black/[0.06] bg-white p-5 shadow-[0_8px_30px_rgba(17,17,19,0.04)]">
          <h2 className="text-sm font-semibold tracking-[-0.02em]">Products</h2>
          <p className="mt-1 text-xs text-[#6E6E73]">
            A row already in your shop is updated, not added twice. You sell{" "}
            {store.products.length} {store.products.length === 1 ? "thing" : "things"} today.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("products")}
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold"
            >
              Get the blank spreadsheet
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white">
              Send your file
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
          <h2 className="text-sm font-semibold tracking-[-0.02em]">Game codes</h2>
          <p className="mt-1 text-xs text-[#6E6E73]">
            New codes are added to the ones you already hold. You have{" "}
            {store.digitalCodes.length} unsold right now.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => downloadTemplate("codes")}
              className="inline-flex h-9 items-center rounded-lg border border-black/[0.1] bg-white px-3 text-xs font-semibold"
            >
              Get the blank spreadsheet
            </button>
            <label className="inline-flex h-9 cursor-pointer items-center rounded-lg bg-[#1D1D1F] px-3 text-xs font-semibold text-white">
              Send your file
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
            title="You haven't brought anything in yet"
            description="Get the blank spreadsheet, fill in one row per thing, then send it back here. What happened will be listed on this spot."
          />
        ) : (
          <div className="rounded-2xl border border-black/[0.06] bg-white p-5">
            <h3 className="text-sm font-semibold">What happened last time</h3>
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
