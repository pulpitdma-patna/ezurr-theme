"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { CatalogTabs } from "@/components/admin/CatalogTabs";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { Phase2PageShell } from "@/components/admin/Phase2PageShell";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useAdminStore } from "@/hooks/useAdminStore";
import { api, isApiEnabled, uploadImage, type ApiMediaAsset } from "@/lib/apiClient";

type MediaAsset = {
  id: string;
  assetId?: number; // set for API-backed assets (enables delete)
  name: string;
  url: string;
  kind: "product" | "banner" | "upload";
  bytesLabel: string;
};

function fromApiAsset(a: ApiMediaAsset): MediaAsset {
  return {
    id: `api-${a.id}`,
    assetId: a.id,
    name: a.path.split("/").pop() ?? a.path,
    url: a.url,
    kind: "upload",
    bytesLabel: `${Math.round((a.bytes || 0) / 1024)} KB · in ${a.folder}`,
  };
}

export default function AdminMediaPage() {
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const toast = useAdminToast();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [uploads, setUploads] = useState<MediaAsset[]>([]);
  const [remote, setRemote] = useState<MediaAsset[]>([]);

  const reload = useCallback(async () => {
    if (!apiOn) return;
    try {
      const res = await api.adminMedia({ page: 1 });
      setRemote((res.data ?? []).map(fromApiAsset));
    } catch {
      /* keep prior */
    }
  }, [apiOn]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const catalogAssets = useMemo<MediaAsset[]>(
    () =>
      store.products.slice(0, 24).map((product) => ({
        id: `prod-${product.key}`,
        name: product.name,
        url: product.image,
        kind: "product" as const,
        bytesLabel: "Came with a product",
      })),
    [store.products],
  );

  const assets = useMemo(() => {
    const all = apiOn ? remote : [...uploads, ...catalogAssets];
    const q = query.trim().toLowerCase();
    if (!q) return all;
    return all.filter((asset) => asset.name.toLowerCase().includes(q));
  }, [apiOn, remote, uploads, catalogAssets, query]);

  const active = assets.find((asset) => asset.id === selected) ?? assets[0] ?? null;

  return (
    <Phase2PageShell
      title="Photos"
      description={
        apiOn
          ? "Every picture in your shop. Anything you send up here is shrunk first so pages load fast."
          : "Practice shop. Pictures you add stay in this browser and no customer sees them."
      }

      actions={
        <label className="inline-flex h-9 cursor-pointer items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white">
          Add a photo
          <input
            type="file"
            accept="image/*"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (!file) return;
              e.target.value = "";
              if (apiOn) {
                void uploadImage(file, "media")
                  .then(() => {
                    toast.push("Photo added and shrunk to load fast", "success");
                    return reload();
                  })
                  .catch((err) =>
                    toast.push(
                      err instanceof Error ? err.message : "That photo did not go up",
                      "warning",
                    ),
                  );
                return;
              }
              const url = URL.createObjectURL(file);
              const asset: MediaAsset = {
                id: `up-${Date.now()}`,
                name: file.name,
                url,
                kind: "upload",
                bytesLabel: `${Math.round(file.size / 1024)} KB · this browser only`,
              };
              setUploads((prev) => [asset, ...prev]);
              setSelected(asset.id);
              toast.push("Practice shop — this photo stays in this browser", "warning");
            }}
          />
        </label>
      }
    >
      <CatalogTabs active="media" />

      <ListToolbar
        search={{ value: query, onChange: setQuery, placeholder: "Search photos by name" }}
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
              {/* The "Variants · 1× planned 3×" row that sat here was a promise
                  about a feature, printed as if it were a fact about his photo.
                  Nothing generated three sizes; there was nothing to report. */}
              <dl className="mt-3 space-y-1.5 text-xs text-[#6E6E73]">
                <div className="flex justify-between gap-2">
                  <dt>Where it came from</dt>
                  <dd className="font-semibold text-[#1D1D1F]">
                    {active.kind === "product"
                      ? "A product"
                      : active.kind === "banner"
                        ? "A banner"
                        : "You added it"}
                  </dd>
                </div>
              </dl>
              <div className="mt-4 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard.writeText(active.url);
                    toast.push(
                      apiOn
                        ? "Link copied — paste it wherever you need the photo"
                        : "Link copied, but it only works in this browser",
                      "success",
                    );
                  }}
                  className="h-9 rounded-xl border border-black/10 text-xs font-semibold"
                >
                  Copy the link
                </button>
                {apiOn && active.assetId ? (
                  <button
                    type="button"
                    onClick={() => {
                      const id = active.assetId!;
                      void api
                        .deleteMedia(id)
                        .then(() => {
                          toast.push("Photo deleted", "success");
                          setSelected(null);
                          return reload();
                        })
                        .catch(() => toast.push("Could not delete it", "warning"));
                    }}
                    className="h-9 rounded-xl border border-red-200 text-xs font-semibold text-red-700"
                  >
                    Delete this photo
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => toast.push("Trimming photos is not built yet", "warning")}
                    className="h-9 rounded-xl bg-[#1D1D1F] text-xs font-semibold text-white"
                  >
                    Trim this photo
                  </button>
                )}
              </div>
            </>
          ) : (
            <p className="text-sm text-[#86868B]">
              No photos yet. Press Add a photo and pick one from your phone.
            </p>
          )}
        </aside>
      </div>
    </Phase2PageShell>
  );
}
