"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { api, isApiEnabled } from "@/lib/apiClient";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { customerStatusLabels, parsePrice, type AdminCustomer } from "@/data/admin";
import { useAdminStore } from "@/hooks/useAdminStore";
import { usePagedList, useSearchQueryParam } from "@/hooks/useListQuery";
import { formatMobileDisplay } from "@/lib/auth";
import { mapApiCustomer } from "./customerModel";

/**
 * The same four words as the badge on the row, so a filter and the thing it
 * filters cannot disagree. "Banned" was the database's word; he blocks people.
 */
const filters = [
  { value: "all", label: "Everyone" },
  { value: "vip", label: customerStatusLabels.vip },
  { value: "active", label: customerStatusLabels.active },
  { value: "new", label: customerStatusLabels.new },
  { value: "banned", label: customerStatusLabels.banned },
];

export default function AdminCustomersPage() {
  const router = useRouter();
  const apiOn = isApiEnabled();
  const store = useAdminStore();
  const [remote, setRemote] = useState<AdminCustomer[]>([]);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useSearchQueryParam();
  const [sortKey, setSortKey] = useState("spent");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = usePagedList(`${status}|${query}|${sortKey}|${sortDir}`);

  useEffect(() => {
    if (!apiOn) return;
    let cancelled = false;
    void api
      .adminCustomers({ search: query.trim() || undefined })
      .then((res) => {
        if (!cancelled) setRemote(res.data.map(mapApiCustomer));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [apiOn, query]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const source = apiOn ? remote : store.customers;
    let list = source.filter((customer) => {
      if (status !== "all" && customer.status !== status) return false;
      if (!q) return true;
      return (
        customer.name.toLowerCase().includes(q) ||
        customer.mobile.includes(q) ||
        customer.city.toLowerCase().includes(q) ||
        customer.id.toLowerCase().includes(q)
      );
    });
    list = [...list].sort((a, b) => {
      let cmp = 0;
      if (sortKey === "spent") cmp = parsePrice(a.spent) - parsePrice(b.spent);
      else if (sortKey === "orders") cmp = a.orders - b.orders;
      else cmp = a.name.localeCompare(b.name);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [apiOn, remote, store.customers, status, query, sortKey, sortDir]);

  const columns: DataTableColumn<AdminCustomer>[] = [
    {
      key: "name",
      header: "Customer",
      sortable: true,
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#1D1D1F] text-[10px] font-semibold text-white">
            {row.name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>
          <div>
            <div className="text-sm font-semibold tracking-[-0.02em]">{row.name}</div>
            <div className="ez-mono mt-0.5 text-[10px] text-[#86868B]">{row.id}</div>
          </div>
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Phone",
      render: (row) => (
        <span className="ez-mono text-[11px]">{formatMobileDisplay(row.mobile)}</span>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      sortable: true,
      hideOnMobile: true,
      render: (row) => <span className="ez-mono text-xs">{row.orders}</span>,
    },
    {
      key: "spent",
      header: "Spent",
      sortable: true,
      render: (row) => <span className="ez-mono text-xs font-medium">{row.spent}</span>,
    },
    {
      key: "status",
      header: "Type",
      render: (row) => <StatusBadge kind="customer" status={row.status} />,
    },
    {
      key: "city",
      header: "City",
      hideOnMobile: true,
      render: (row) => <span className="text-xs text-[#6E6E73]">{row.city}</span>,
    },
  ];

  return (
    <div>
      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. These customers are made up — your real ones appear once your shop is
          connected.
        </AdminNotice>
      ) : null}
      <AdminPageHeader
        title="Customers"
        description="Everyone who has bought from you. Open a name to see their orders and what they have spent."
      />

      <ListToolbar
        resultLabel={`${rows.length} ${rows.length === 1 ? "customer" : "customers"}`}
        search={{
          value: query,
          onChange: setQuery,
          placeholder: "Search by name, phone, or city",
        }}
        filters={
          <AdminSelect
            label="Show"
            value={status}
            onChange={setStatus}
            options={filters}
          />
        }
      />

      <DataTable
        columns={columns}
        rows={rows}
        rowKey={(row) => row.id}
        emptyMessage={
          query.trim()
            ? `Nobody matched "${query.trim()}". Try their phone number.`
            : status === "all"
              ? "Nobody yet. A customer appears here the first time someone orders."
              : `Nobody is a ${filters.find((f) => f.value === status)?.label.toLowerCase() ?? "match"} customer yet.`
        }
        onRowClick={(row) => router.push(`/admin/customers/${row.id}`)}
        sortKey={sortKey}
        sortDir={sortDir}
        onSort={(key) => {
          if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
          else {
            setSortKey(key);
            setSortDir(key === "name" ? "asc" : "desc");
          }
        }}
        page={page}
        pageSize={25}
        onPageChange={setPage}
      />
    </div>
  );
}
