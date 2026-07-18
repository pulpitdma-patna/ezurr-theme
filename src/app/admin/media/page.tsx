"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { Phase2PageShell } from "@/components/admin/Phase2PageShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminStore } from "@/hooks/useAdminStore";

type MediaAsset = {
  id: string;
  name: string;
  url: string;
  kind: "product" | "banner" | "upload";
  bytesLabel: string;
};

export default function AdminMediaPage() {
  const store = useAdminStore();
  const toast = useAdminToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [uploads, setUploads] = useState<MediaAsset[]>([]);

  const catalogAssets = useMemo<MediaAsset[]>(
    () =>
      store.products.slice(0, 24).map((product) => ({
        id: `prod-${product.key}`,
        name: product.name,
        url: product.image,
        kind: "product" as const,
        bytesLabel: "CDN · pending",
      })),
    [store.products],
  );

  const assets = useMemo(() => {
    const all = [...uploads, ...catalogAssets];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((asset) => asset.name.toLowerCase().includes(q));
  }, [uploads, catalogAssets, query]);

  const active = assets.find((asset) => asset.id === selected) ?? assets[0] ?? null;

  return (
    <Phase2PageShell
      title="Media"
      description="CDN library for product stills and merchandising — uploads stay local until Phase 2."
      breadcrumbs={[
        { label: "Catalog", href: "/admin/products" },
        { label: "Media" },
      ]}
      bannerTitle="CDN pipeline preview"
      bannerDescription="Uploads use object URLs in this browser only. Crop, variants, and signed CDN URLs arrive with the media service."
      planned={[
        "Signed CDN uploads & variants",
        "Crop studio & focal points",
        "Asset usage across catalog",
      ]}
      actions={
        <label className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white">
          Upload
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              const url = URL.createObjectURL(file);
              const asset: MediaAsset = {
                id: `up-${Date.now()}`,
                name: file.name,
                url,
                kind: "upload",
                bytesLabel: `${Math.round(file.size / 1024)} KB · local`,
              };
              setUploads((prev) => [asset, ...prev]);
              setSelected(asset.id);
              toast.push("File staged locally — not uploaded to CDN", "warning");
              e.target.value = "";
            }}
          />
        </label>
      }
    >
      <ListToolbar
        resultLabel={`${assets.length} assets`}
        search={{ value: query, onChange: setQuery, placeholder: "Search media…" }}
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
          {assets.map((asset) => {
            const on = active?.id === asset.id;
            return (
              <button
                key={asset.id}
                type="button"
                onClick={() => setSelected(asset.id)}
                className={`overflow-hidden rounded-2xl border text-left transition ${
                  on
                    ? "border-[#1D1D1F] ring-2 ring-[#1D1D1F]/15"
                    : "border-black/[0.06] hover:border-black/[0.12]"
                } bg-white`}
              >
                <div className="relative aspect-square bg-[#F7F7F8]">
                  {asset.url ? (
                    <Image
                      src={asset.url}
                      alt=""
                      fill
                      className="object-contain p-3"
                      sizes="160px"
                      unoptimized={asset.kind === "upload"}
                    />
                  ) : null}
                </div>
                <div className="border-t border-black/[0.05] px-2.5 py-2">
                  <div className="truncate text-[11px] font-semibold">{asset.name}</div>
                  <div className="ez-mono truncate text-[9px] text-[#AEAEB2]">
                    {asset.bytesLabel}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <aside className="h-fit rounded-2xl border border-black/[0.06] bg-white p-4">
          {active ? (
            <>
              <div className="relative mx-auto aspect-square w-full max-w-[200px] rounded-xl bg-[#F7F7F8]">
                <Image
                  src={active.url}
                  alt=""
                  fill
                  className="object-contain p-4"
                  sizes="200px"
                  unoptimized={active.kind === "upload"}
                />
              </div>
              <h2 className="mt-3 text-sm font-semibold tracking-[-0.02em]">{active.name}</h2>
              <p className="mt-1 text-xs text-[#86868B]">{active.bytesLabel}</p>
              <dl className="mt-3 space-y-1.5 text-xs text-[#6E6E73]">
                <div className="flex justify-between gap-2">
                  <dt>Kind</dt>
                  <dd className="font-semibold capitalize text-[#1D1D1F]">{active.kind}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Variants</dt>
                  <dd className="font-semibold text-[#1D1D1F]">1× · planned 3×</dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(active.url);
                    toast.push("URL copied (may be local blob)", "success");
                  }}
                  className="h-9 rounded-xl border border-black/10 text-xs font-semibold"
                >
                  Copy URL
                </button>
                <button
                  type="button"
                  onClick={() => toast.push("Crop studio is Phase 2 UI only", "warning")}
                  className="h-9 rounded-xl bg-[#1D1D1F] text-xs font-semibold text-white"
                >
                  Open crop studio
                </button>
              </div>
            </>
          ) : (
            <p className="text-sm text-[#86868B]">No assets yet.</p>
          )}
        </aside>
      </div>
    </Phase2PageShell>
  );
}
