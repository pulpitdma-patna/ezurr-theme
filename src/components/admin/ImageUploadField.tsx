"use client";

import Image from "next/image";
import { useState } from "react";
import { isApiEnabled, uploadImage } from "@/lib/apiClient";
import { compressImageFile } from "@/lib/imageCompress";

type Folder = "products" | "categories" | "brands" | "media";

/**
 * Reusable image upload control. Uploads to the API's public storage when the
 * API is enabled, otherwise inlines the image as a data URL (mock mode).
 */
function formatKb(bytes: number): string {
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

export function ImageUploadField({
  value,
  onChange,
  folder,
  label = "Image",
}: {
  value: string;
  onChange: (url: string) => void;
  folder?: Folder;
  label?: string;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savings, setSavings] = useState<string | null>(null);

  async function handleFile(file: File) {
    setUploading(true);
    setError(null);
    setSavings(null);
    try {
      if (isApiEnabled()) {
        // Downscale oversized images in the browser first (keeps large photos
        // under PHP's upload limit); the server then does the authoritative
        // optimization. Savings are reported against the true original.
        const original = file.size;
        const toSend = await compressImageFile(file);
        const res = await uploadImage(toSend, folder);
        onChange(res.url);

        const finalBytes = typeof res.bytes === "number" ? res.bytes : toSend.size;
        const savedPct = Math.round((1 - finalBytes / original) * 100);
        if (savedPct > 0) {
          setSavings(
            `Optimized · saved ${savedPct}% (${formatKb(original)} → ${formatKb(finalBytes)})`,
          );
        }
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
  }

  return (
    <div className="flex flex-col gap-1.5">
      <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">{label}</span>
      <div className="flex flex-wrap items-center gap-3">
        <label
          className={`inline-flex h-9 items-center rounded-lg border border-black/10 bg-white px-3 text-xs font-semibold ${
            uploading ? "cursor-wait opacity-60" : "cursor-pointer hover:bg-[#F7F7F8]"
          }`}
        >
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={uploading}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) void handleFile(file);
              e.target.value = "";
            }}
          />
        </label>
        {value ? (
          <button
            type="button"
            onClick={() => {
              onChange("");
              setSavings(null);
            }}
            className="text-[11px] font-semibold text-[#B42318]"
          >
            Remove
          </button>
        ) : null}
      </div>
      {error ? <p className="text-[11px] text-[#B42318]">{error}</p> : null}
      {savings ? (
        <p className="ez-mono text-[10px] uppercase tracking-[0.1em] text-[#1B7A43]">{savings}</p>
      ) : null}
      {value ? (
        <div className="relative mt-1 h-24 w-24 overflow-hidden rounded-lg border border-black/[0.08] bg-[#F7F7F8]">
          <Image src={value} alt="Preview" fill className="object-contain p-2" sizes="96px" unoptimized />
        </div>
      ) : null}
    </div>
  );
}
