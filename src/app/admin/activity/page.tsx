"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { formatAdminDateTime } from "@/lib/adminFormat";
import { api, isApiEnabled, type ApiActivityEntry } from "@/lib/apiClient";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { activityAreaLabels, orderStatusLabels, type AdminActivityEntry } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";

const panelClass =
  "overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]";

const entityTones: Record<AdminActivityEntry["entityType"], string> = {
  order: "bg-[#DBEAFE] text-[#1D4ED8]",
  product: "bg-[#EDE9FE] text-[#5B21B6]",
  customer: "bg-[#EAF6ED] text-[#2D6B3C]",
  inventory: "bg-[#FFEDD5] text-[#9A3412]",
  settings: "bg-[#F0F0F2] text-[#424245]",
  automation: "bg-[#FEF3C7] text-[#92400E]",
  system: "bg-[#E8E8ED] text-[#6E6E73]",
};

function startOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(0, 0, 0, 0);
  return next;
}

function endOfDay(d: Date) {
  const next = new Date(d);
  next.setHours(23, 59, 59, 999);
  return next;
}

const dateRangeOptions = [
  { value: "all", label: "All time" },
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "custom", label: "Between two dates" },
];

function inDateRange(timestamp: string, range: string, from: string, to: string): boolean {
  const at = new Date(timestamp).getTime();
  if (Number.isNaN(at)) return true;
  const now = new Date();

  if (range === "today") {
    return at >= startOfDay(now).getTime() && at <= endOfDay(now).getTime();
  }
  if (range === "7d") {
    const fromDate = startOfDay(now);
    fromDate.setDate(fromDate.getDate() - 6);
    return at >= fromDate.getTime() && at <= endOfDay(now).getTime();
  }
  if (range === "30d") {
    const fromDate = startOfDay(now);
    fromDate.setDate(fromDate.getDate() - 29);
    return at >= fromDate.getTime() && at <= endOfDay(now).getTime();
  }
  if (range === "custom") {
    if (from) {
      const fromTs = startOfDay(new Date(from)).getTime();
      if (at < fromTs) return false;
    }
    if (to) {
      const toTs = endOfDay(new Date(to)).getTime();
      if (at > toTs) return false;
    }
  }
  return true;
}

function formatRelative(iso: string) {
  const mins = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 1440) return `${Math.round(mins / 60)}h ago`;
  if (mins < 10080) return `${Math.round(mins / 1440)}d ago`;
  return null;
}

function formatActionLabel(action: string) {
  return action
    .split(/[._-]+/)
    .map((part, index) => {
      const word = part.toLowerCase();
      if (index === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      return word;
    })
    .join(" ");
}

function formatValue(value: unknown): string {
  if (value == null) return "nothing";
  if (typeof value === "string") {
    // A stored order status is the one raw value that turns up here often
    // enough to matter: the line read "confirmed → packed" in the server's
    // words, not the words on the button he had just pressed.
    return orderStatusLabels[value as keyof typeof orderStatusLabels] ?? value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }
  if (Array.isArray(value)) return value.map(formatValue).join(", ");
  return JSON.stringify(value);
}

function summarizeDetail(detail?: string): { summary?: string; mono?: string } {
  if (!detail?.trim()) return {};

  try {
    const parsed = JSON.parse(detail) as Record<string, unknown>;
    if (Array.isArray(parsed.changed) && parsed.changed.length) {
      const fields = parsed.changed.map(formatValue).join(", ");
      return {
        summary: `Updated ${fields}`,
        mono: detail,
      };
    }
    if (parsed.from != null && parsed.to != null) {
      return {
        summary: `${formatValue(parsed.from)} → ${formatValue(parsed.to)}`,
        mono: detail,
      };
    }
    if (parsed.status != null) {
      return { summary: `Now ${formatValue(parsed.status).toLowerCase()}`, mono: detail };
    }
    const keys = Object.keys(parsed);
    if (keys.length === 1) {
      const key = keys[0];
      return {
        summary: `${key}: ${formatValue(parsed[key])}`,
        mono: keys.length > 0 && typeof parsed[key] === "object" ? detail : undefined,
      };
    }
    if (keys.length > 1) {
      return {
        summary: keys
          .slice(0, 3)
          .map((key) => `${key}: ${formatValue(parsed[key])}`)
          .join(" · "),
        mono: detail,
      };
    }
    return { summary: detail, mono: detail };
  } catch {
    if (detail.includes("→")) return { summary: detail };
    if (detail.startsWith("{") || detail.startsWith("[")) {
      return { summary: "Something was changed", mono: detail };
    }
    return { summary: detail };
  }
}

function actorInitials(name: string) {
  if (name.toLowerCase() === "system") return "SY";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function entityHref(entry: AdminActivityEntry) {
  if (entry.entityType === "order") return `/admin/orders/${entry.entityId}`;
  if (entry.entityType === "customer") return `/admin/customers/${entry.entityId}`;
  if (entry.entityType === "product") {
    return `/admin/products/${encodeURIComponent(entry.entityId)}/edit`;
  }
  if (entry.entityType === "settings") return "/admin/settings";
  if (entry.entityType === "automation") return "/admin/automations";
  if (entry.entityType === "inventory") return "/admin/inventory";
  return "/admin/activity";
}

function mapApiActivity(a: ApiActivityEntry): AdminActivityEntry {
  return {
    id: String(a.id),
    at: a.created_at ?? new Date().toISOString(),
    actor: a.actor,
    action: a.action,
    entityType: a.entityType.toLowerCase() as AdminActivityEntry["entityType"],
    entityId: a.entityId != null ? String(a.entityId) : "",
    detail: a.meta ? JSON.stringify(a.meta) : undefined,
  };
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function ActorChip({ name }: { name: string }) {
  const isSystem = name.toLowerCase() === "system";
  return (
    <div className="flex items-center gap-2">
      <div
        className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[9px] font-semibold ${
          isSystem ? "bg-[#F0F0F2] text-[#6E6E73]" : "bg-[#1D1D1F] text-white"
        }`}
      >
        {actorInitials(name)}
      </div>
      <span className="truncate text-sm font-medium tracking-[-0.01em]">{name}</span>
    </div>
  );
}

function EntityTag({ entry }: { entry: AdminActivityEntry }) {
  const tone = entityTones[entry.entityType] ?? entityTones.system;
  return (
    <Link
      href={entityHref(entry)}
      onClick={(e) => e.stopPropagation()}
      className={`inline-flex max-w-full items-center gap-1.5 rounded-md border border-black/[0.06] px-2 py-1 ez-mono text-[10px] font-medium transition hover:border-black/[0.12] hover:shadow-[0_1px_2px_rgba(17,17,19,0.04)] ${tone}`}
    >
      <span className="truncate">{activityAreaLabels[entry.entityType] ?? entry.entityType}</span>
      {entry.entityId ? (
        <>
          <span className="opacity-40" aria-hidden>
            /
          </span>
          <span className="truncate opacity-90">{entry.entityId}</span>
        </>
      ) : null}
    </Link>
  );
}

export default function AdminActivityPage() {
  const router = useRouter();
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const [remote, setRemote] = useState<AdminActivityEntry[]>([]);
  const [loading, setLoading] = useState(apiOn);
  const [query, setQuery] = useSearchQueryParam();
  const [entityType, setEntityType] = useState("all");
  const [dateRange, setDateRange] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = usePagedList(
    `${query}|${entityType}|${dateRange}|${dateFrom}|${dateTo}`,
  );

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    setLoading(true);
    void api
      .adminActivity()
      .then((res) => {
        if (!cancelled) setRemote(res.data.map(mapApiActivity));
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const source = apiOn ? remote : store.activityLog;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((entry) => {
      if (entityType !== "all" && entry.entityType !== entityType) return false;
      if (!inDateRange(entry.at, dateRange, dateFrom, dateTo)) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.entityId.toLowerCase().includes(q) ||
        entry.detail?.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q) ||
        formatActionLabel(entry.action).toLowerCase().includes(q)
      );
    });
  }, [source, query, entityType, dateRange, dateFrom, dateTo]);

  const hasActiveFilters =
    query.trim().length > 0 ||
    entityType !== "all" ||
    dateRange !== "all" ||
    Boolean(dateFrom || dateTo);

  const columns: DataTableColumn<AdminActivityEntry>[] = [
    {
      key: "at",
      header: "When",
      hideOnMobile: true,
      render: (row) => {
        const relative = formatRelative(row.at);
        return (
          <div className="min-w-[5.5rem]">
            <div className="ez-mono text-[11px] text-[#1D1D1F]">{formatAdminDateTime(row.at)}</div>
            {relative ? (
              <div className="mt-0.5 text-[10px] text-[#AEAEB2]">{relative}</div>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "actor",
      header: "Who",
      render: (row) => <ActorChip name={row.actor} />,
    },
    {
      key: "action",
      header: "What they did",
      render: (row) => {
        const { summary, mono } = summarizeDetail(row.detail);
        const tone = entityTones[row.entityType] ?? entityTones.system;
        return (
          <div className="min-w-0 max-w-xl">
            <div className="flex flex-wrap items-center gap-1.5">
              <span
                className={`inline-flex shrink-0 items-center rounded-md px-1.5 py-0.5 text-[9px] font-semibold tracking-[-0.01em] ${tone}`}
              >
                {activityAreaLabels[row.entityType] ?? row.entityType}
              </span>
              <span className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">
                {formatActionLabel(row.action)}
              </span>
            </div>
            {summary ? (
              <p className="mt-1 text-xs leading-relaxed text-[#6E6E73]">{summary}</p>
            ) : null}
            {mono && mono !== summary ? (
              <p className="mt-1 truncate ez-mono text-[10px] text-[#AEAEB2]">{mono}</p>
            ) : null}
          </div>
        );
      },
    },
    {
      key: "entity",
      header: "Where",
      className: "text-right md:text-left",
      render: (row) => <EntityTag entry={row} />,
    },
  ];

  const emptyMessage = hasActiveFilters
    ? "Nothing changed that matches what you asked for."
    : "Nothing has changed yet.";

  const emptyDescription = hasActiveFilters
    ? "Try another name, another part of the shop, or a wider set of dates."
    : "Every order you accept, product you edit and setting you change gets written down here, with who did it.";

  return (
    <div>
      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. These changes are made up — your real ones appear once your shop is
          connected.
        </AdminNotice>
      ) : null}
      <AdminPageHeader
        title="What changed"
        description="Who changed what in here, newest first."
        breadcrumbs={[
          { label: "Setup", href: "/admin/settings" },
          { label: "What changed" },
        ]}
      />

      <section className={panelClass}>
        <div className="flex flex-col gap-2.5 border-b border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 flex-1 items-center gap-2.5">
            <div className="relative min-w-0 flex-1 lg:max-w-sm">
              <span
                className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#AEAEB2]"
                aria-hidden
              >
                <SearchGlyph />
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by who, or what they touched"
                className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </div>
            <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
              {loading
                ? "Loading…"
                : `${rows.length} ${rows.length === 1 ? "change" : "changes"}`}
            </span>
          </div>
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <AdminSelect
              label="Part of the shop"
              value={entityType}
              onChange={setEntityType}
              options={[
                { value: "all", label: "Everything" },
                { value: "order", label: "Orders" },
                { value: "product", label: "Products" },
                { value: "customer", label: "Customers" },
                { value: "inventory", label: activityAreaLabels.inventory },
                { value: "settings", label: activityAreaLabels.settings },
                { value: "automation", label: "Automatic messages" },
                { value: "system", label: activityAreaLabels.system },
              ]}
            />
            <AdminSelect
              label="When"
              value={dateRange}
              onChange={setDateRange}
              options={dateRangeOptions}
            />
            {dateRange === "custom" ? (
              <>
                <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.07] bg-white pl-3 pr-2 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
                  <span className="ez-mono shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                    From
                  </span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="h-full border-0 bg-transparent text-xs font-semibold text-[#1D1D1F] outline-none"
                  />
                </label>
                <label className="inline-flex h-9 items-center gap-2 rounded-lg border border-black/[0.07] bg-white pl-3 pr-2 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
                  <span className="ez-mono shrink-0 text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
                    To
                  </span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="h-full border-0 bg-transparent text-xs font-semibold text-[#1D1D1F] outline-none"
                  />
                </label>
              </>
            ) : null}
          </div>
        </div>

        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          onRowClick={(row) => router.push(entityHref(row))}
          loading={loading}
          density="compact"
          emptyMessage={emptyMessage}
          emptyAction={
            !loading ? (
              <p className="max-w-sm text-xs text-[#6E6E73]">{emptyDescription}</p>
            ) : undefined
          }
        />
      </section>
    </div>
  );
}
