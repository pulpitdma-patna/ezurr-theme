"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AdminEmptyState } from "@/components/admin/AdminEmptyState";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
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

export default function AdminActivityPage() {
  const store = useAdminStore();
  const [query, setQuery] = useSearchQueryParam();
  const [entityType, setEntityType] = useState("all");
  const [page, setPage] = usePagedList(`${query}|${entityType}`);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return store.activityLog.filter((entry) => {
      if (entityType !== "all" && entry.entityType !== entityType) return false;
      if (!q) return true;
      return (
        entry.action.toLowerCase().includes(q) ||
        entry.entityId.toLowerCase().includes(q) ||
        entry.detail?.toLowerCase().includes(q) ||
        entry.actor.toLowerCase().includes(q)
      );
    });
  }, [store.activityLog, query, entityType]);

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
          <AdminSelect
            label="Entity"
            value={entityType}
            onChange={setEntityType}
            options={[
              { value: "all", label: "All entities" },
              { value: "order", label: "Orders" },
              { value: "product", label: "Products" },
              { value: "customer", label: "Customers" },
              { value: "inventory", label: "Inventory" },
              { value: "settings", label: "Settings" },
              { value: "automation", label: "Automations" },
              { value: "system", label: "System" },
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
        />
      )}
    </div>
  );
}
