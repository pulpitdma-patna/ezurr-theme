"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { api, isApiEnabled, type ApiActivityEntry } from "@/lib/apiClient";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { FilterBar } from "@/components/admin/FilterBar";
import { ListToolbar } from "@/components/admin/ListToolbar";
import type { AdminActivityEntry } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";

function formatAt(iso: string) {
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

export default function AdminActivityPage() {
  const router = useRouter();
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const [remote, setRemote] = useState<AdminActivityEntry[]>([]);
  const [query, setQuery] = useSearchQueryParam();
  const [entityType, setEntityType] = useState("all");
  const [page, setPage] = usePagedList(`${query}|${entityType}`);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .adminActivity()
      .then((res) => {
        if (!cancelled) setRemote(res.data.map(mapApiActivity));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiOn]);

  const source = apiOn ? remote : store.activityLog;

  const entityCounts = useMemo(() => {
    const counts: Record<string, number> = { all: source.length };
    for (const entry of source) {
      counts[entry.entityType] = (counts[entry.entityType] ?? 0) + 1;
    }
    return counts;
  }, [source]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((entry) => {
      if (entityType !== "all" && entry.entityType !== entityType) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.entityId.toLowerCase().includes(q) ||
        entry.detail?.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q)
      );
    });
  }, [source, query, entityType]);

  const columns: DataTableColumn<AdminActivityEntry>[] = [
    {
      key: "at",
      header: "When",
      render: (row) => (
        <span className="ez-mono text-[11px] text-[#6E6E73]">{formatAt(row.at)}</span>
      ),
    },
    {
      key: "actor",
      header: "Actor",
      render: (row) => <span className="text-sm font-medium">{row.actor}</span>,
    },
    {
      key: "action",
      header: "Action",
      render: (row) => (
        <div>
          <div className="text-sm font-semibold tracking-[-0.02em]">{row.action}</div>
          {row.detail ? <div className="text-[11px] text-[#86868B]">{row.detail}</div> : null}
        </div>
      ),
    },
    {
      key: "entity",
      header: "Entity",
      render: (row) => (
        <Link
          href={entityHref(row)}
          className="ez-mono text-[11px] font-medium hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {row.entityType}/{row.entityId}
        </Link>
      ),
    },
  ];

  return (
    <div>
      {!apiOn ? (
        <AdminNotice tone="demo">
          This activity log shows local demo events — enable the store API for the live audit trail.
        </AdminNotice>
      ) : null}
      <AdminPageHeader
        title="Activity"
        description="Audit trail of admin mutations in this workspace."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Activity" },
        ]}
      />
      <ListToolbar
        resultLabel={`${rows.length} events`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search actions, entities…",
        }}
        filters={
          <FilterBar
            value={entityType}
            onChange={setEntityType}
            options={[
              { value: "all", label: "All", count: entityCounts.all },
              { value: "order", label: "Orders", count: entityCounts.order ?? 0 },
              { value: "product", label: "Products", count: entityCounts.product ?? 0 },
              { value: "customer", label: "Customers", count: entityCounts.customer ?? 0 },
              { value: "inventory", label: "Inventory", count: entityCounts.inventory ?? 0 },
              { value: "settings", label: "Settings", count: entityCounts.settings ?? 0 },
              {
                value: "automation",
                label: "Automations",
                count: entityCounts.automation ?? 0,
              },
              { value: "system", label: "System", count: entityCounts.system ?? 0 },
            ]}
          />
        }
      />
      {rows.length === 0 ? (
        <AdminEmptyState
          title="No activity yet"
          description="Order updates, customer edits, and settings changes will appear here."
        />
      ) : (
        <DataTable
          rows={rows}
          columns={columns}
          rowKey={(row) => row.id}
          page={page}
          pageSize={25}
          onPageChange={setPage}
          onRowClick={(row) => router.push(entityHref(row))}
        />
      )}
    </div>
  );
}
