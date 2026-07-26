"use client";

import { useMemo, useState } from "react";
import type {
  AssuranceItem,
  CmsBlock,
  CmsWidgetDefinition,
  HeroSlide,
  InspectorField,
} from "@/lib/cms/types";
import { getSectionEntry } from "@/lib/cms/sectionRegistry";
import { RichTextField } from "./RichTextField";
import { PlaceholderAssistant } from "./PlaceholderAssistant";
import {
  duplicateCmsBlock,
  removeCmsBlock,
  updateCmsBlock,
} from "@/lib/adminStore";
import { useAdminStore } from "@/hooks/useAdminStore";
import { DEFAULT_HERO_SLIDES } from "@/lib/cms/defaultHomePage";

type SectionInspectorProps = {
  pageId: string;
  block: CmsBlock | null;
  widgets: CmsWidgetDefinition[];
};

function MediaPicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (url: string) => void;
}) {
  const store = useAdminStore();
  const [open, setOpen] = useState(false);
  const assets = useMemo(
    () =>
      store.products.slice(0, 40).map((p) => ({
        name: p.name,
        url: p.image,
      })),
    [store.products],
  );

  return (
    <div>
      <div className="flex gap-2">
        <input
          type="text"
          className="w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="shrink-0 rounded-lg border border-black/[0.1] px-2 text-[11px] font-semibold"
        >
          Browse
        </button>
      </div>
      {open ? (
        <div className="mt-2 max-h-48 overflow-y-auto rounded-xl border border-black/[0.08] bg-[#F8F8FA] p-2">
          <div className="grid grid-cols-3 gap-2">
            {assets.map((asset) => (
              <button
                key={asset.url}
                type="button"
                onClick={() => {
                  onChange(asset.url);
                  setOpen(false);
                }}
                className="overflow-hidden rounded-lg border border-black/[0.06] bg-white"
                title={asset.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt="" className="aspect-square object-cover" />
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductKeysPicker({
  value,
  onChange,
}: {
  value: string[];
  onChange: (keys: string[]) => void;
}) {
  const store = useAdminStore();
  const [q, setQ] = useState("");
  const products = useMemo(() => {
    const query = q.trim().toLowerCase();
    return store.products
      .filter((p) => !query || p.name.toLowerCase().includes(query))
      .slice(0, 30);
  }, [store.products, q]);

  return (
    <div className="space-y-2">
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search catalog…"
        className="w-full rounded-lg border border-black/[0.1] px-2.5 py-2 text-xs"
      />
      <div className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-black/[0.08] p-2">
        {/* Stores p.key, not p.name. The picker used to save display names and
            ApiProductRail feeds these straight to api.product(key) — so every
            lookup 404'd, was swallowed, and the rail quietly rendered the demo
            catalogue instead of the products actually chosen. */}
        {products.map((p) => {
          const checked = value.includes(p.key);
          return (
            <label
              key={p.key}
              className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[11px] hover:bg-[#F5F5F7]"
            >
              <input
                type="checkbox"
                checked={checked}
                onChange={() => {
                  onChange(
                    checked
                      ? value.filter((k) => k !== p.key)
                      : [...value, p.key],
                  );
                }}
              />
              <span className="truncate">{p.name}</span>
            </label>
          );
        })}
      </div>
    </div>
  );
}

function SlidesRepeater({
  value,
  onChange,
}: {
  value: HeroSlide[];
  onChange: (slides: HeroSlide[]) => void;
}) {
  const slides = value.length ? value : DEFAULT_HERO_SLIDES;
  return (
    <div className="space-y-3">
      {slides.map((slide, index) => (
        <div
          key={slide.id}
          className="space-y-2 rounded-xl border border-black/[0.08] bg-[#F8F8FA] p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold">Slide {index + 1}</span>
            <button
              type="button"
              className="text-[10px] font-semibold text-red-600"
              onClick={() => onChange(slides.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
          {(
            [
              ["title", "Title"],
              ["subtitle", "Subtitle"],
              ["price", "Price"],
              ["image", "Image URL"],
            ] as const
          ).map(([key, label]) => (
            <label key={key} className="block">
              <span className="text-[10px] text-[#6E6E73]">{label}</span>
              {key === "image" ? (
                <MediaPicker
                  value={String(slide[key] ?? "")}
                  onChange={(url) => {
                    const next = [...slides];
                    next[index] = { ...slide, image: url };
                    onChange(next);
                  }}
                />
              ) : (
                <input
                  className="mt-0.5 w-full rounded-md border border-black/[0.1] px-2 py-1.5 text-xs"
                  value={String(slide[key] ?? "")}
                  onChange={(e) => {
                    const next = [...slides];
                    next[index] = { ...slide, [key]: e.target.value };
                    onChange(next);
                  }}
                />
              )}
            </label>
          ))}
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-lg border border-dashed border-black/20 py-2 text-[11px] font-semibold"
        onClick={() =>
          onChange([
            ...slides,
            {
              ...DEFAULT_HERO_SLIDES[0],
              id: `slide-${Date.now()}`,
              title: "New slide",
            },
          ])
        }
      >
        + Add slide
      </button>
    </div>
  );
}

function AssurancesRepeater({
  value,
  onChange,
}: {
  value: AssuranceItem[];
  onChange: (items: AssuranceItem[]) => void;
}) {
  return (
    <div className="space-y-2">
      {value.map((item, index) => (
        <div
          key={`${item.title}-${index}`}
          className="space-y-1.5 rounded-xl border border-black/[0.08] p-2.5"
        >
          <input
            className="w-full rounded-md border border-black/[0.1] px-2 py-1 text-xs"
            value={item.title}
            onChange={(e) => {
              const next = [...value];
              next[index] = { ...item, title: e.target.value };
              onChange(next);
            }}
            placeholder="Title"
          />
          <input
            className="w-full rounded-md border border-black/[0.1] px-2 py-1 text-xs"
            value={item.text}
            onChange={(e) => {
              const next = [...value];
              next[index] = { ...item, text: e.target.value };
              onChange(next);
            }}
            placeholder="Text"
          />
          <div className="flex gap-2">
            <input
              className="w-16 rounded-md border border-black/[0.1] px-2 py-1 text-xs"
              value={item.mark}
              onChange={(e) => {
                const next = [...value];
                next[index] = { ...item, mark: e.target.value };
                onChange(next);
              }}
            />
            <button
              type="button"
              className="text-[10px] font-semibold text-red-600"
              onClick={() => onChange(value.filter((_, i) => i !== index))}
            >
              Remove
            </button>
          </div>
        </div>
      ))}
      <button
        type="button"
        className="w-full rounded-lg border border-dashed border-black/20 py-2 text-[11px] font-semibold"
        onClick={() =>
          onChange([...value, { title: "New", text: "Description", mark: "•" }])
        }
      >
        + Add item
      </button>
    </div>
  );
}

function FieldControl({
  field,
  value,
  onChange,
}: {
  field: InspectorField;
  value: unknown;
  onChange: (v: unknown) => void;
}) {
  const inputClass =
    "w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]";

  switch (field.type) {
    case "toggle":
      return (
        <label className="flex items-center gap-2 text-xs">
          <input
            type="checkbox"
            checked={Boolean(value)}
            onChange={(e) => onChange(e.target.checked)}
          />
          Enabled
        </label>
      );
    case "number":
      return (
        <input
          type="number"
          className={inputClass}
          value={Number(value) || 0}
          onChange={(e) => onChange(Number(e.target.value))}
        />
      );
    case "select":
      return (
        <select
          className={inputClass}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        >
          {(field.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      );
    case "textarea":
      return (
        <textarea
          className={`${inputClass} min-h-[100px] font-mono`}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case "html":
      // The blanks come first, and the raw markup is tucked behind a
      // disclosure. Someone finishing a refund policy should be filling in a
      // labelled GSTIN box, not hunting for a token between an <h2> and a
      // <table>.
      return (
        <PlaceholderAssistant
          html={String(value ?? "")}
          onChange={onChange}
        />
      );
    case "richtext":
      return (
        <RichTextField
          value={String(value ?? "")}
          onChange={(html) => onChange(html)}
        />
      );
    case "product-source":
      return (
        <select
          className={inputClass}
          value={String(value ?? "games")}
          onChange={(e) => onChange(e.target.value)}
        >
          {[
            ["preorders", "Pre-orders"],
            ["games", "Games"],
            ["consoles", "Consoles"],
            ["accessories", "Accessories"],
            ["manual", "Manual keys"],
          ].map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
      );
    case "product-keys":
      return (
        <ProductKeysPicker
          value={Array.isArray(value) ? (value as string[]) : []}
          onChange={onChange}
        />
      );
    case "media-url":
      return (
        <MediaPicker
          value={String(value ?? "")}
          onChange={(url) => onChange(url)}
        />
      );
    case "slides":
      return (
        <SlidesRepeater
          value={Array.isArray(value) ? (value as HeroSlide[]) : []}
          onChange={onChange}
        />
      );
    case "assurances":
      return (
        <AssurancesRepeater
          value={Array.isArray(value) ? (value as AssuranceItem[]) : []}
          onChange={onChange}
        />
      );
    default:
      return (
        <input
          type="text"
          className={inputClass}
          value={String(value ?? "")}
          onChange={(e) => onChange(e.target.value)}
        />
      );
  }
}

export function SectionInspector({ pageId, block, widgets }: SectionInspectorProps) {
  if (!block) {
    return (
      <div className="flex h-full items-center justify-center px-4 text-center text-xs text-[#A1A1A6]">
        Select a section on the canvas or in the structure tree.
      </div>
    );
  }

  const entry = getSectionEntry(block.type);
  const widget = block.widgetId
    ? widgets.find((w) => w.id === block.widgetId)
    : undefined;
  const fields: InspectorField[] = widget?.fields ?? entry?.fields ?? [];
  const title = widget?.name ?? entry?.label ?? block.type;

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/[0.06] px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868B]">
          Inspector
        </p>
        <h3 className="mt-1 text-sm font-semibold text-[#1D1D1F]">{title}</h3>
        <label className="mt-3 flex items-center gap-2 text-xs text-[#3A3A3C]">
          <input
            type="checkbox"
            checked={block.enabled}
            onChange={(e) =>
              updateCmsBlock(pageId, block.id, { enabled: e.target.checked })
            }
          />
          Visible when published
        </label>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {fields.map((field) => (
          <label key={field.key} className="block">
            <span className="text-[11px] font-semibold text-[#6E6E73]">
              {field.label}
            </span>
            <div className="mt-1">
              <FieldControl
                field={field}
                value={block.props[field.key]}
                onChange={(v) =>
                  updateCmsBlock(pageId, block.id, {
                    props: { [field.key]: v },
                  })
                }
              />
            </div>
          </label>
        ))}

        <div className="space-y-2 rounded-xl border border-black/[0.06] bg-[#F8F8FA] p-3">
          <p className="text-[11px] font-semibold text-[#6E6E73]">Layout (%)</p>
          {(["xPct", "yPct", "wPct", "zIndex"] as const).map((key) => (
            <label
              key={key}
              className="flex items-center justify-between gap-2 text-[11px]"
            >
              <span>{key}</span>
              <input
                type="number"
                className="w-20 rounded-md border border-black/[0.1] px-2 py-1"
                value={
                  block.layout?.[key] ??
                  (key === "wPct" ? 40 : key === "zIndex" ? 1 : 10)
                }
                onChange={(e) =>
                  updateCmsBlock(pageId, block.id, {
                    layout: { [key]: Number(e.target.value) },
                  })
                }
              />
            </label>
          ))}
        </div>

        <label className="block">
          <span className="text-[11px] font-semibold text-[#6E6E73]">
            Advanced · Block CSS
          </span>
          <textarea
            className="mt-1 w-full min-h-[90px] rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 font-mono text-xs outline-none focus:border-[#1D1D1F]"
            value={block.customCss ?? ""}
            onChange={(e) =>
              updateCmsBlock(pageId, block.id, { customCss: e.target.value })
            }
          />
        </label>
      </div>

      <div className="flex gap-2 border-t border-black/[0.06] p-3">
        <button
          type="button"
          onClick={() => duplicateCmsBlock(pageId, block.id)}
          className="flex-1 rounded-lg border border-black/[0.1] py-2 text-xs font-semibold hover:bg-[#F5F5F7]"
          disabled={block.type === "column"}
        >
          Duplicate
        </button>
        <button
          type="button"
          onClick={() => removeCmsBlock(pageId, block.id)}
          className="flex-1 rounded-lg border border-red-200 bg-red-50 py-2 text-xs font-semibold text-red-700 hover:bg-red-100"
          disabled={block.type === "column"}
        >
          Delete
        </button>
      </div>
    </div>
  );
}
