"use client";

import { useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { ListToolbar } from "@/components/admin/ListToolbar";
import { Phase2Banner, Phase2Badge } from "@/components/admin/Phase2Badge";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useStaffRole } from "@/hooks/useStaffRole";
import {
  STAFF_ROLE_OPTIONS,
  type Permission,
  type StaffRole,
  can,
} from "@/lib/adminPermissions";

type InviteStatus = "pending" | "active" | "revoked";

type StaffSeat = {
  id: string;
  name: string;
  email: string;
  role: StaffRole;
  status: InviteStatus;
  lastActive: string;
};

const PERMISSION_ROWS: { permission: Permission; label: string }[] = [
  { permission: "orders.write", label: "Orders · write" },
  { permission: "orders.refund", label: "Orders · refund" },
  { permission: "products.write", label: "Products · write" },
  { permission: "customers.write", label: "Customers · write" },
  { permission: "coupons.write", label: "Coupons · write" },
  { permission: "inventory.write", label: "Inventory · write" },
  { permission: "settings.write", label: "Settings · write" },
  { permission: "automations.write", label: "Automations · write" },
  { permission: "import.write", label: "Import · write" },
  { permission: "reports.export", label: "Reports · export" },
];

const SEED: StaffSeat[] = [
  {
    id: "seat-1",
    name: "Admin",
    email: "admin@ezurr.com",
    role: "owner",
    status: "active",
    lastActive: "Just now",
  },
  {
    id: "seat-2",
    name: "Ops desk",
    email: "ops@ezurr.com",
    role: "manager",
    status: "active",
    lastActive: "2h ago",
  },
  {
    id: "seat-3",
    name: "Support",
    email: "help@ezurr.com",
    role: "support",
    status: "pending",
    lastActive: "Invite sent",
  },
  {
    id: "seat-4",
    name: "Finance",
    email: "finance@ezurr.com",
    role: "viewer",
    status: "active",
    lastActive: "Yesterday",
  },
];

export default function AdminTeamPage() {
  const toast = useAdminToast();
  const { role: demoRole, setRole } = useStaffRole();
  const [seats, setSeats] = useState(SEED);
  const [query, setQuery] = useState("");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<StaffRole>("support");
  const [revokeId, setRevokeId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return seats.filter(
      (seat) =>
        !q ||
        seat.name.toLowerCase().includes(q) ||
        seat.email.toLowerCase().includes(q) ||
        seat.role.includes(q),
    );
  }, [seats, query]);

  const columns: DataTableColumn<StaffSeat>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div>
          <div className="text-sm font-semibold">{row.name}</div>
          <div className="ez-mono text-[10px] text-[#86868B]">{row.email}</div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <select
          value={row.role}
          onChange={(e) => {
            const next = e.target.value as StaffRole;
            setSeats((prev) =>
              prev.map((seat) => (seat.id === row.id ? { ...seat, role: next } : seat)),
            );
            toast.push(`Role updated · ${row.email} → ${next}`, "success");
          }}
          className="h-8 rounded-lg border border-black/[0.08] bg-[#F7F7F8] px-2 text-xs font-semibold capitalize"
        >
          {STAFF_ROLE_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          kind="custom"
          label={row.status}
          className={
            row.status === "active"
              ? "bg-[#EAF6ED] text-[#2D6B3C] capitalize"
              : row.status === "pending"
                ? "bg-[#FEF3C7] text-[#92400E] capitalize"
                : "bg-[#F0F0F2] text-[#6E6E73] capitalize"
          }
        />
      ),
    },
    {
      key: "last",
      header: "Last active",
      render: (row) => <span className="text-xs text-[#86868B]">{row.lastActive}</span>,
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) =>
        row.role === "owner" ? (
          <span className="text-[11px] text-[#AEAEB2]">—</span>
        ) : (
          <button
            type="button"
            onClick={() => setRevokeId(row.id)}
            className="rounded-md border border-[#F5C2C0] px-2.5 py-1 text-[11px] font-semibold text-[#B42318]"
          >
            Revoke
          </button>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Team & access"
        description="Invites, roles, and a live permissions matrix. Enforcement stays UI-only until Phase 2 authZ."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Team" },
        ]}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Phase2Badge />
            <button
              type="button"
              onClick={() => setInviteOpen(true)}
              className="inline-flex h-9 items-center rounded-xl bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white"
            >
              Invite staff
            </button>
          </div>
        }
      />
      <Phase2Banner
        title="Staff directory preview"
        description="Invites never send email. Demo role below still gates mutations across HQ."
      />

      <section className="mb-5 rounded-2xl border border-black/[0.06] bg-white p-4">
        <div className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">
          Your demo session role
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          {STAFF_ROLE_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setRole(option.value);
                toast.push(`Demo role → ${option.label}`, "success");
              }}
              className={`h-8 rounded-lg px-3 text-xs font-semibold ${
                demoRole === option.value
                  ? "bg-[#1D1D1F] text-white"
                  : "border border-black/10 bg-[#F7F7F8] text-[#424245]"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </section>

      <ListToolbar
        resultLabel={`${rows.length} seats`}
        search={{ value: query, onChange: setQuery, placeholder: "Search name or email…" }}
      />
      <DataTable columns={columns} rows={rows} rowKey={(row) => row.id} pageSize={25} />

      <section className="mt-6 overflow-hidden rounded-2xl border border-black/[0.06] bg-white">
        <div className="border-b border-black/[0.06] px-4 py-3">
          <h2 className="text-sm font-semibold">Permissions matrix</h2>
          <p className="mt-0.5 text-xs text-[#86868B]">What each role can do when authZ is live.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="bg-[#FAFAFB] ez-mono text-[9px] uppercase tracking-[0.12em] text-[#86868B]">
              <tr>
                <th className="px-4 py-2.5">Capability</th>
                {STAFF_ROLE_OPTIONS.map((option) => (
                  <th key={option.value} className="px-3 py-2.5 text-center">
                    {option.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.permission}>
                  <td className="px-4 py-2.5 font-medium">{row.label}</td>
                  {STAFF_ROLE_OPTIONS.map((option) => (
                    <td key={option.value} className="px-3 py-2.5 text-center">
                      {can(row.permission, option.value) ? (
                        <span className="text-[#067647]">●</span>
                      ) : (
                        <span className="text-[#D0D0D5]">○</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminDrawer open={inviteOpen} title="Invite staff" onClose={() => setInviteOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            setSeats((prev) => [
              {
                id: `seat-${Date.now()}`,
                name: email.split("@")[0],
                email: email.trim().toLowerCase(),
                role: inviteRole,
                status: "pending",
                lastActive: "Invite queued (mock)",
              },
              ...prev,
            ]);
            setEmail("");
            setInviteOpen(false);
            toast.push("Invite queued — email not sent", "warning");
          }}
        >
          <label className="block">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">Email</span>
            <input
              required
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm"
              placeholder="teammate@ezurr.com"
            />
          </label>
          <label className="block">
            <span className="ez-mono text-[9px] uppercase tracking-[0.14em] text-[#86868B]">Role</span>
            <select
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as StaffRole)}
              className="mt-1.5 h-10 w-full rounded-xl border border-black/[0.08] bg-[#F7F7F8] px-3 text-sm"
            >
              {STAFF_ROLE_OPTIONS.filter((o) => o.value !== "owner").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className="h-10 w-full rounded-xl bg-[#1D1D1F] text-xs font-semibold text-white">
            Send invite (mock)
          </button>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(revokeId)}
        title="Revoke seat?"
        description="UI-only revoke. They would lose HQ access when authZ is live."
        confirmLabel="Revoke"
        danger
        onConfirm={() => {
          setSeats((prev) =>
            prev.map((seat) =>
              seat.id === revokeId ? { ...seat, status: "revoked" as const } : seat,
            ),
          );
          setRevokeId(null);
          toast.push("Seat revoked (mock)", "success");
        }}
        onCancel={() => setRevokeId(null)}
      />
    </div>
  );
}
