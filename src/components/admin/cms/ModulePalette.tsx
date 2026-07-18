"use client";

import { useMemo, useState } from "react";
import { SECTION_REGISTRY } from "@/lib/cms/sectionRegistry";
import type { CmsWidgetDefinition, SectionType } from "@/lib/cms/types";

type ModulePaletteProps = {
  widgets: CmsWidgetDefinition[];
  onAdd: (type: SectionType, widgetId?: string) => void;
  nestParentId?: string | null;
};

export function ModulePalette({ widgets, onAdd, nestParentId }: ModulePaletteProps) {
  const [query, setQuery] = useState("");
  const installed = widgets.filter((w) => w.installed && w.enabled);

  const modules = useMemo(() => {
    const q = query.trim().toLowerCase();
  const builtIns = SECTION_REGISTRY.filter(
      (e) => e.type !== "widget" && e.type !== "column",
    ).filter((e) =>
      !q
        ? true
        : e.label.toLowerCase().includes(q) || e.description.toLowerCase().includes(q),
    );
    const wgt = installed.filter((w) =>
      !q
        ? true
        : w.name.toLowerCase().includes(q) || w.description.toLowerCase().includes(q),
    );
    return { builtIns, wgt };
  }, [installed, query]);

  return (
    <div className="flex h-full flex-col">
      <div className="border-b border-black/[0.06] px-3 py-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#86868B]">
          Modules
        </p>
        {nestParentId ? (
          <p className="mt-1 text-[11px] text-[#AF52DE]">
            Nesting into selected container
          </p>
        ) : null}
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search modules…"
          className="mt-2 w-full rounded-lg border border-black/[0.1] bg-white px-2.5 py-2 text-xs outline-none focus:border-[#1D1D1F]"
        />
      </div>
      <div className="flex-1 space-y-4 overflow-y-auto px-2 py-3">
        <div>
          <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A1A1A6]">
            Built-in
          </p>
          <ul className="mt-1.5 space-y-1">
            {modules.builtIns.map((entry) => (
              <li key={entry.type}>
                <button
                  type="button"
                  onClick={() => onAdd(entry.type)}
                  className="flex w-full flex-col rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-black/[0.08] hover:bg-[#F5F5F7]"
                >
                  <span className="text-[13px] font-semibold text-[#1D1D1F]">
                    {entry.label}
                  </span>
                  <span className="text-[11px] leading-snug text-[#86868B]">
                    {entry.description}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
        {modules.wgt.length > 0 ? (
          <div>
            <p className="px-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-[#A1A1A6]">
              Widgets
            </p>
            <ul className="mt-1.5 space-y-1">
              {modules.wgt.map((w) => (
                <li key={w.id}>
                  <button
                    type="button"
                    onClick={() => onAdd("widget", w.id)}
                    className="flex w-full items-start gap-2 rounded-xl border border-transparent px-2.5 py-2 text-left transition hover:border-black/[0.08] hover:bg-[#F5F5F7]"
                  >
                    <span className="mt-0.5 text-sm">{w.icon}</span>
                    <span>
                      <span className="block text-[13px] font-semibold text-[#1D1D1F]">
                        {w.name}
                      </span>
                      <span className="text-[11px] leading-snug text-[#86868B]">
                        {w.description}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="px-1 text-[11px] text-[#A1A1A6]">
            Install widgets from the marketplace to use them here.
          </p>
        )}
      </div>
    </div>
  );
}
