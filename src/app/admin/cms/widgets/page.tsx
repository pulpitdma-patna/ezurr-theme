"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { useAdminToast } from "@/components/admin/AdminToast";
import { isApiEnabled } from "@/lib/apiClient";
import { useCmsWidgets } from "@/hooks/useCmsStore";
import {
  createCustomCmsWidget,
  installCmsWidget,
  setCmsWidgetEnabled,
  uninstallCmsWidget,
} from "@/lib/adminStore";

export default function AdminCmsWidgetsPage() {
  const widgets = useCmsWidgets();
  const toast = useAdminToast();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({
    name: "",
    description: "",
    category: "Custom",
    templateHtml: "<section class='ez-page py-10'><p>Hello from a custom widget</p></section>",
    templateCss: "",
    templateJs: "",
  });

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(widgets.map((w) => w.category)))],
    [widgets],
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return widgets.filter((w) => {
      if (category !== "all" && w.category !== category) return false;
      if (!q) return true;
      return (
        w.name.toLowerCase().includes(q) ||
        w.description.toLowerCase().includes(q) ||
        w.author.toLowerCase().includes(q)
      );
    });
  }, [widgets, query, category]);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Widget marketplace"
        description="Install Elementor-style add-on modules. Installed widgets appear in the page builder palette."
      />

      {isApiEnabled() ? (
        <AdminNotice tone="demo">
          Widgets install to your browser (localStorage) only — they aren&apos;t
          persisted to the server yet.
        </AdminNotice>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search widgets…"
          className="min-h-11 w-full max-w-sm rounded-xl border border-black/[0.1] bg-white px-3 text-sm outline-none focus:border-[#1D1D1F]"
        />
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="min-h-11 rounded-xl border border-black/[0.1] bg-white px-3 text-sm"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c === "all" ? "All categories" : c}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => setShowCreate((v) => !v)}
          className="min-h-11 rounded-xl bg-[#1D1D1F] px-4 text-sm font-semibold text-white"
        >
          Create custom widget
        </button>
        <Link
          href="/admin/cms"
          className="min-h-11 rounded-xl border border-black/[0.1] bg-white px-4 text-sm font-semibold leading-[2.75rem] hover:bg-[#F5F5F7]"
        >
          ← Pages
        </Link>
      </div>

      {showCreate ? (
        <div className="space-y-3 rounded-2xl border border-black/[0.07] bg-white p-5">
          <p className="text-sm font-semibold">New custom widget</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <input
              className="min-h-11 rounded-xl border border-black/[0.1] px-3 text-sm"
              placeholder="Name"
              value={form.name}
              onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            />
            <input
              className="min-h-11 rounded-xl border border-black/[0.1] px-3 text-sm"
              placeholder="Category"
              value={form.category}
              onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
            />
          </div>
          <input
            className="min-h-11 w-full rounded-xl border border-black/[0.1] px-3 text-sm"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
          <textarea
            className="min-h-[120px] w-full rounded-xl border border-black/[0.1] px-3 py-2 font-mono text-xs"
            value={form.templateHtml}
            onChange={(e) => setForm((f) => ({ ...f, templateHtml: e.target.value }))}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <textarea
              className="min-h-[80px] rounded-xl border border-black/[0.1] px-3 py-2 font-mono text-xs"
              placeholder="Optional CSS"
              value={form.templateCss}
              onChange={(e) => setForm((f) => ({ ...f, templateCss: e.target.value }))}
            />
            <textarea
              className="min-h-[80px] rounded-xl border border-black/[0.1] px-3 py-2 font-mono text-xs"
              placeholder="Optional JS"
              value={form.templateJs}
              onChange={(e) => setForm((f) => ({ ...f, templateJs: e.target.value }))}
            />
          </div>
          <button
            type="button"
            onClick={() => {
              if (!form.name.trim() || !form.templateHtml.trim()) return;
              createCustomCmsWidget(form);
              toast.push("Custom widget created", "success");
              setShowCreate(false);
              setForm({
                name: "",
                description: "",
                category: "Custom",
                templateHtml:
                  "<section class='ez-page py-10'><p>Hello from a custom widget</p></section>",
                templateCss: "",
                templateJs: "",
              });
            }}
            className="rounded-xl bg-[#1D1D1F] px-4 py-2.5 text-sm font-semibold text-white"
          >
            Save widget
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((widget) => (
          <article
            key={widget.id}
            className="flex flex-col rounded-2xl border border-black/[0.07] bg-white p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F5F5F7] text-lg">
                {widget.icon}
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="text-sm font-semibold text-[#1D1D1F]">{widget.name}</h3>
                <p className="mt-0.5 text-[11px] text-[#86868B]">
                  {widget.category} · {widget.author} · v{widget.version}
                </p>
              </div>
              {widget.installed ? (
                <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800">
                  Installed
                </span>
              ) : null}
            </div>
            <p className="mt-3 flex-1 text-xs leading-relaxed text-[#6E6E73]">
              {widget.description}
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              {!widget.installed ? (
                <button
                  type="button"
                  onClick={() => {
                    installCmsWidget(widget.id);
                    toast.push(`Installed ${widget.name}`, "success");
                  }}
                  className="rounded-lg bg-[#1D1D1F] px-3 py-1.5 text-[11px] font-semibold text-white"
                >
                  Install
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => {
                      setCmsWidgetEnabled(widget.id, !widget.enabled);
                      toast.push(
                        widget.enabled ? "Disabled" : "Enabled",
                        "success",
                      );
                    }}
                    className="rounded-lg border border-black/[0.1] px-3 py-1.5 text-[11px] font-semibold"
                  >
                    {widget.enabled ? "Disable" : "Enable"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      uninstallCmsWidget(widget.id);
                      toast.push(
                        widget.custom ? "Removed" : "Uninstalled",
                        "success",
                      );
                    }}
                    className="rounded-lg border border-red-200 px-3 py-1.5 text-[11px] font-semibold text-red-700"
                  >
                    {widget.custom ? "Remove" : "Uninstall"}
                  </button>
                </>
              )}
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
