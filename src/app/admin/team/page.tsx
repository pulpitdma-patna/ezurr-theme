"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { PlusIcon } from "@/components/admin/IconButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { useAdminToast } from "@/components/admin/AdminToast";
import { useStaffRole } from "@/hooks/useStaffRole";
import { api, isApiEnabled, type ApiTeamMember } from "@/lib/apiClient";
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
    lastActive: "Pending",
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

const fieldClass =
  "h-9 w-full rounded-lg border border-black/[0.07] bg-[#FAFAFB] px-3 text-sm outline-none transition hover:border-black/[0.10] focus:border-black/[0.14] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const labelClass =
  "ez-mono text-[9px] font-medium uppercase tracking-[0.14em] text-[#86868B]";

const panelClass =
  "overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]";

const panelHeaderClass =
  "flex flex-wrap items-start justify-between gap-3 border-b border-black/[0.06] bg-[#FAFAFB] px-4 py-3.5 sm:px-5";

const primaryBtnClass =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const secondaryBtnClass =
  "inline-flex h-8 items-center rounded-lg border border-[#F5C2C0] bg-white px-2.5 text-[11px] font-semibold text-[#B42318] transition hover:bg-[#FFF8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]";

function PanelHeader({
  title,
  description,
  badge,
}: {
  title: string;
  description?: string;
  badge?: ReactNode;
}) {
  return (
    <header className={panelHeaderClass}>
      <div className="min-w-0">
        <h2 className="text-[15px] font-semibold tracking-[-0.03em] text-[#1D1D1F]">{title}</h2>
        {description ? <p className="mt-0.5 max-w-xl text-xs text-[#6E6E73]">{description}</p> : null}
      </div>
      {badge}
    </header>
  );
}

function PreviewPill() {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-2.5 py-1 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
      <span className="h-1.5 w-1.5 rounded-full bg-[#AEAEB2]" aria-hidden />
      Preview
    </span>
  );
}

function SearchGlyph() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <circle cx="6" cy="6" r="4.25" stroke="currentColor" strokeWidth="1.4" />
      <path d="M9.2 9.2L12 12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

function memberInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function statusTone(status: InviteStatus) {
  if (status === "active") return "bg-[#EAF6ED] text-[#2D6B3C]";
  if (status === "pending") return "bg-[#FEF3C7] text-[#92400E]";
  return "bg-[#F0F0F2] text-[#6E6E73]";
}

export default function AdminTeamPage() {
  const toast = useAdminToast();
  const { role: demoRole, setRole } = useStaffRole();
  const [seats, setSeats] = useState(SEED);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [addRole, setAddRole] = useState<StaffRole>("support");
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const apiOn = isApiEnabled();
  const [apiSeats, setApiSeats] = useState<StaffSeat[]>([]);
  const [teamError, setTeamError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) return;
    void api
      .adminTeam()
      .then((res) => {
        setApiSeats(
          (res.data ?? []).map((m: ApiTeamMember) => ({
            id: String(m.id),
            name: m.name,
            email: m.mobile,
            role: (m.staffRole as StaffRole) ?? "viewer",
            status: "active" as InviteStatus,
            lastActive: "—",
          })),
        );
        setTeamError(null);
      })
      .catch((err) => setTeamError(err instanceof Error ? err.message : "Could not load team"));
  }, [apiOn]);

  const displaySeats = apiOn ? apiSeats : seats;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return displaySeats.filter(
      (seat) =>
        !q ||
        seat.name.toLowerCase().includes(q) ||
        seat.email.toLowerCase().includes(q) ||
        seat.role.includes(q),
    );
  }, [displaySeats, query]);

  const activeCount = displaySeats.filter((seat) => seat.status === "active").length;

  const updateRole = (row: StaffSeat, next: StaffRole) => {
    if (apiOn) {
      void api
        .updateTeamMember(Number(row.id), { staffRole: next })
        .then((m) => {
          setApiSeats((prev) =>
            prev.map((seat) =>
              seat.id === row.id ? { ...seat, role: (m.staffRole as StaffRole) ?? next } : seat,
            ),
          );
          toast.push(`Role updated · ${row.email} → ${next}`, "success");
        })
        .catch(() => toast.push("Could not update role", "warning"));
      return;
    }
    setSeats((prev) =>
      prev.map((seat) => (seat.id === row.id ? { ...seat, role: next } : seat)),
    );
    toast.push(`Role updated · ${row.email} → ${next}`, "success");
  };

  const columns: DataTableColumn<StaffSeat>[] = [
    {
      key: "name",
      header: "Member",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1D1D1F] text-[10px] font-semibold text-white">
            {memberInitials(row.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-[-0.02em]">{row.name}</div>
            <div className="truncate ez-mono text-[10px] text-[#86868B]">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (row) => (
        <AdminSelect
          label="Role"
          value={row.role}
          onChange={(value) => updateRole(row, value as StaffRole)}
          options={STAFF_ROLE_OPTIONS.map((option) => ({
            value: option.value,
            label: option.label,
          }))}
        />
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (row) => (
        <StatusBadge
          kind="custom"
          label={row.status}
          className={`${statusTone(row.status)} capitalize`}
        />
      ),
    },
    {
      key: "last",
      header: "Last active",
      hideOnMobile: true,
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
          <button type="button" onClick={() => setRevokeId(row.id)} className={secondaryBtnClass}>
            Revoke
          </button>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="Team & access"
        description="Manage staff seats, roles, and permissions for your workspace."
        breadcrumbs={[
          { label: "System", href: "/admin/settings" },
          { label: "Team" },
        ]}
        actions={
          <>
            <PreviewPill />
            <button type="button" onClick={() => setAddOpen(true)} className={primaryBtnClass}>
              <PlusIcon />
              Add
            </button>
          </>
        }
      />

      <section className={`${panelClass} mb-4`}>
        <PanelHeader
          title="Session preview"
          description="Switch your demo role to preview what each seat can access."
          badge={
            <StatusBadge
              kind="custom"
              label={`Viewing as ${STAFF_ROLE_OPTIONS.find((o) => o.value === demoRole)?.label ?? demoRole}`}
              className="bg-[#F0F0F2] text-[#424245]"
            />
          }
        />
        <div className="space-y-3 p-4 sm:p-5">
          {teamError ? (
            <div className="rounded-lg border border-[#F5C2C0] bg-[#FDECEC] px-3 py-2 text-[11px] font-medium text-[#B42318]">
              {teamError}
            </div>
          ) : null}
          {apiOn ? (
            <div className="rounded-lg border border-black/[0.06] bg-[#FAFAFB] px-3 py-2.5 text-[11px] leading-relaxed text-[#6E6E73]">
              Roles are saved to the server. Adding members and revoking seats are local-only for
              now — they don&apos;t email or persist.
            </div>
          ) : null}
          <div
            className="inline-flex w-full max-w-full gap-1 overflow-x-auto rounded-lg border border-black/[0.06] bg-[#F0F0F2] p-1"
            role="group"
            aria-label="Demo session role"
          >
            {STAFF_ROLE_OPTIONS.map((option) => {
              const active = demoRole === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => {
                    setRole(option.value);
                    toast.push(`Demo role → ${option.label}`, "success");
                  }}
                  className={`inline-flex min-w-[5.5rem] shrink-0 items-center justify-center rounded-md px-3 py-1.5 text-xs font-semibold transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F] ${
                    active
                      ? "bg-white text-[#1D1D1F] shadow-[0_1px_2px_rgba(17,17,19,0.06)]"
                      : "text-[#6E6E73] hover:text-[#1D1D1F]"
                  }`}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      </section>

      <section className={`${panelClass} mb-4`}>
        <div className="flex flex-col gap-2.5 border-b border-black/[0.05] bg-[#FAFAFB] px-3 py-2.5 sm:px-4 lg:flex-row lg:items-center lg:justify-between">
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
                placeholder="Search name or email…"
                className="h-9 w-full rounded-lg border border-black/[0.07] bg-white pl-8 pr-3 text-sm shadow-[0_1px_2px_rgba(17,17,19,0.03)] outline-none placeholder:text-[#AEAEB2] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]"
              />
            </div>
            <span className="hidden shrink-0 ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B] sm:inline">
              {rows.length} members · {activeCount} active
            </span>
          </div>
          <button type="button" onClick={() => setAddOpen(true)} className={primaryBtnClass}>
            <PlusIcon />
            Add
          </button>
        </div>
        <DataTable
          columns={columns}
          rows={rows}
          rowKey={(row) => row.id}
          pageSize={25}
          density="compact"
          emptyMessage="No team members match your search."
          emptyAction={
            <button type="button" onClick={() => setAddOpen(true)} className={primaryBtnClass}>
              <PlusIcon />
              Add
            </button>
          }
        />
      </section>

      <section className={panelClass}>
        <PanelHeader
          title="Permissions matrix"
          description="Capability map by role — enforcement is UI-only until authZ is live."
        />
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead className="border-b border-black/[0.06] bg-[#FAFAFB] ez-mono text-[9px] font-medium uppercase tracking-[0.12em] text-[#86868B]">
              <tr>
                <th className="sticky left-0 z-10 bg-[#FAFAFB] px-4 py-2.5 sm:px-5">Capability</th>
                {STAFF_ROLE_OPTIONS.map((option) => (
                  <th key={option.value} className="px-3 py-2.5 text-center">
                    {option.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.permission} className="transition hover:bg-[#FAFAFB]/80">
                  <td className="sticky left-0 z-10 bg-white px-4 py-2 text-sm font-medium tracking-[-0.01em] text-[#1D1D1F] sm:px-5">
                    {row.label}
                  </td>
                  {STAFF_ROLE_OPTIONS.map((option) => (
                    <td key={option.value} className="px-3 py-2 text-center">
                      {can(row.permission, option.value) ? (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#EAF6ED] text-[#067647]"
                          aria-label="Allowed"
                        >
                          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden>
                            <path
                              d="M2.5 5.25L4.25 7L7.5 3.5"
                              stroke="currentColor"
                              strokeWidth="1.4"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        </span>
                      ) : (
                        <span
                          className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-[#F0F0F2] text-[#C7C7CC]"
                          aria-label="Denied"
                        >
                          <span className="h-1 w-1 rounded-full bg-current" />
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <AdminDrawer open={addOpen} title="Add member" onClose={() => setAddOpen(false)}>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            if (!email.trim()) return;
            if (apiOn) {
              const mobile = email.replace(/\D/g, "").slice(-10);
              if (!/^[6-9]\d{9}$/.test(mobile)) {
                toast.push("Enter a valid 10-digit Indian mobile", "warning");
                return;
              }
              void api
                .inviteTeamMember({ mobile, staffRole: addRole, name: mobile })
                .then((m) => {
                  setApiSeats((prev) => [
                    {
                      id: String(m.id),
                      name: m.name,
                      email: m.mobile,
                      role: (m.staffRole as StaffRole) ?? addRole,
                      status: "active",
                      lastActive: "—",
                    },
                    ...prev.filter((s) => s.id !== String(m.id)),
                  ]);
                  setEmail("");
                  setAddOpen(false);
                  toast.push("Member invited", "success");
                })
                .catch((err) =>
                  toast.push(err instanceof Error ? err.message : "Invite failed", "warning"),
                );
              return;
            }
            setSeats((prev) => [
              {
                id: `seat-${Date.now()}`,
                name: email.split("@")[0],
                email: email.trim().toLowerCase(),
                role: addRole,
                status: "pending",
                lastActive: "Pending",
              },
              ...prev,
            ]);
            setEmail("");
            setAddOpen(false);
            toast.push("Member added — email not sent (mock)", "warning");
          }}
        >
          <label className="block">
            <span className={labelClass}>{apiOn ? "Mobile" : "Email"}</span>
            <input
              required
              type={apiOn ? "tel" : "email"}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={`mt-1.5 ${fieldClass}`}
              placeholder={apiOn ? "9876543210" : "teammate@ezurr.com"}
            />
          </label>
          <label className="block">
            <span className={labelClass}>Role</span>
            <select
              value={addRole}
              onChange={(e) => setAddRole(e.target.value as StaffRole)}
              className={`mt-1.5 ${fieldClass}`}
            >
              {STAFF_ROLE_OPTIONS.filter((o) => o.value !== "owner").map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" className={`w-full ${primaryBtnClass} justify-center`}>
            Add member
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
          if (apiOn && revokeId) {
            void api
              .updateTeamMember(Number(revokeId), { role: "customer", staffRole: null })
              .then(() => {
                setApiSeats((prev) => prev.filter((seat) => seat.id !== revokeId));
                setRevokeId(null);
                toast.push("Seat revoked", "success");
              })
              .catch(() => toast.push("Could not revoke seat", "warning"));
            return;
          }
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
