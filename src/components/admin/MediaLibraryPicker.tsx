"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { api, isApiEnabled, uploadImage, type ApiMediaAsset } from "@/lib/apiClient";
import { compressImageFile } from "@/lib/imageCompress";

/**
 * Choosing an image, for someone who has one on their phone.
 *
 * What this replaces offered a URL box and a "Browse" grid of the store's
 * *product* thumbnails — so the only way to use a photo you had just taken was
 * to upload it somewhere else first and paste a link. And a hero image judged at
 * 90px in a 300px side rail is not judged at all.
 *
 * Upload is the primary action and reuses ImageUploadField's flow exactly
 * (browser downscale → server optimise). The library opens as a real modal at a
 * size where you can see what you are picking. The URL box stays, below both,
 * for the person who does want to paste a CDN link.
 */

type Props = {
  value: string;
  onChange: (url: string) => void;
  folder?: "products" | "media" | "brands" | "categories";
  /** Rendered under the image; omit where the image is decorative. */
  alt?: string;
  onAltChange?: (alt: string) => void;
  altHint?: string;
};

function formatKb(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function LibraryModal({
  onPick,
  onClose,
}: {
  onPick: (url: string) => void;
  onClose: () => void;
}) {
  const [assets, setAssets] = useState<ApiMediaAsset[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void api
      .adminMedia({ page: 1 })
      .then((res) => {
        if (!cancelled) setAssets(res.data);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load your media library.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Only ever mounted from a click, so `document` exists — no mounted-guard
  // state needed, and none of the cascading renders one would cause.
  if (typeof document === "undefined") return null;

  // Portalled: the builder's right rail is 300px wide and `overflow-hidden`,
  // which is exactly the constraint this modal exists to escape.
  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/40 p-4">
      <div className="flex max-h-[80vh] w-full max-w-[860px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-black/[0.07] px-4 py-3">
          <p className="m-0 text-sm font-semibold text-[#1D1D1F]">Your photos</p>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-xs font-semibold text-[#6E6E73] hover:bg-[#F5F5F7]"
          >
            Close
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {error ? (
            <p className="py-10 text-center text-sm text-red-700">{error}</p>
          ) : assets === null ? (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="aspect-square animate-pulse rounded-xl bg-[#F0F0F2]" />
              ))}
            </div>
          ) : assets.length === 0 ? (
            <div className="py-12 text-center">
              <p className="text-sm font-semibold text-[#1D1D1F]">
                Nothing here yet
              </p>
              <p className="mt-1 text-xs text-[#6E6E73]">
                Upload an image and it will appear here for every other page too.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {assets.map((asset) => (
                <button
                  key={asset.id}
                  type="button"
                  onClick={() => {
                    onPick(asset.url);
                    onClose();
                  }}
                  className="group overflow-hidden rounded-xl border border-black/[0.08] text-left hover:border-[#1D1D1F]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={asset.url}
                    alt=""
                    className="aspect-square w-full bg-[#F5F5F7] object-cover"
                  />
                  <span className="ez-mono block truncate px-2 py-1.5 text-[10px] text-[#86868B]">
                    {asset.width && asset.height
                      ? `${asset.width}×${asset.height} · ${formatKb(asset.bytes)}`
                      : formatKb(asset.bytes)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function MediaLibraryPicker({
  value,
  onChange,
  folder = "media",
  alt,
  onAltChange,
  altHint = "Describe the image for screen readers and for when it fails to load.",
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showLibrary, setShowLibrary] = useState(false);
  const [showUrl, setShowUrl] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setUploading(true);
      setError(null);
      try {
        if (isApiEnabled()) {
          const toSend = await compressImageFile(file);
          const res = await uploadImage(toSend, folder);
          onChange(res.url);
        } else {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(String(reader.result));
            reader.onerror = () => reject(new Error("Could not read file"));
            reader.readAsDataURL(file);
          });
          onChange(dataUrl);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Upload failed");
      } finally {
        setUploading(false);
      }
    },
    [folder, onChange],
  );

  return (
    <div className="space-y-2">
      {value ? (
        <div className="relative overflow-hidden rounded-xl border border-black/[0.08] bg-[#F5F5F7]">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={value} alt="" className="max-h-[140px] w-full object-contain" />
          <button
            type="button"
            onClick={() => onChange("")}
            className="absolute right-1.5 top-1.5 rounded-full bg-white/90 px-2 py-0.5 text-[10px] font-semibold text-[#6E6E73] shadow hover:text-red-700"
          >
            Remove
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        <label
          className={`cursor-pointer rounded-lg bg-[#1D1D1F] px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-black ${
            uploading ? "pointer-events-none opacity-60" : ""
          }`}
        >
          {uploading ? "Uploading…" : value ? "Replace" : "Upload image"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {isApiEnabled() ? (
          <button
            type="button"
            onClick={() => setShowLibrary(true)}
            className="rounded-lg border border-black/[0.1] px-2.5 py-1.5 text-[11px] font-semibold hover:bg-[#F5F5F7]"
          >
            Choose from library
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => setShowUrl((v) => !v)}
          className="rounded-lg px-2 py-1.5 text-[11px] font-semibold text-[#86868B] underline"
        >
          {showUrl ? "Hide link" : "Paste a link"}
        </button>
      </div>

      {showUrl ? (
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="https://…"
          className="w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]"
        />
      ) : null}

      {error ? <p className="m-0 text-[11px] text-red-700">{error}</p> : null}

      {onAltChange ? (
        <label className="block">
          <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
            Alt text
          </span>
          <input
            type="text"
            value={alt ?? ""}
            onChange={(e) => onAltChange(e.target.value)}
            placeholder="e.g. PS5 console with two controllers"
            className="mt-1 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]"
          />
          <span className="mt-1 block text-[10px] leading-snug text-[#A1A1A6]">
            {altHint}
          </span>
        </label>
      ) : null}

      {showLibrary ? (
        <LibraryModal onPick={onChange} onClose={() => setShowLibrary(false)} />
      ) : null}
    </div>
  );
}
