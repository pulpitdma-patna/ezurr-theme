"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { AdminNotice } from "@/components/admin/AdminNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { DataTable, type DataTableColumn } from "@/components/admin/DataTable";
import { PlusIcon } from "@/components/admin/IconButton";
import { AdminSelect } from "@/components/admin/AdminSelect";
import { adminErrorMessage } from "@/lib/adminError";
import { useStaffRole } from "@/hooks/useStaffRole";
import { api, isApiEnabled, type ApiTeamMember } from "@/lib/apiClient";
import {
  STAFF_ROLE_OPTIONS,
  STAFF_ROLE_PURPOSE,
  can,
  roleCan,
  roleCannot,
  type StaffRole,
} from "@/lib/adminPermissions";

/**
 * Who can sign in to this admin, and what each of them can do.
 *
 * Two things were removed. The permissions matrix — forty cells of ticks and
 * dots serialising the permission map — answered "which rows have a tick in
 * column three" when the actual question is "can the boy on the counter give
 * someone their money back". That answer was in row two, column three, and
 * nobody ever found it. It is now the second line of a card.
 *
 * And the "Session preview" role switcher, which wrote a role into this browser
 * and downgraded the owner's own screen while the server went on enforcing
 * something else entirely — a control that made the admin lie about itself.
 *
 * The cards are generated from ROLE_PERMISSIONS, which mirrors the server's
 * map, so a card cannot promise something the API refuses.
 */

type Seat = {
  id: string;
  name: string;
  mobile: string;
  role: StaffRole;
};

const fieldClass =
  "h-9 w-full rounded-lg border border-black/[0.07] bg-[#FAFAFB] px-3 text-sm outline-none transition hover:border-black/[0.10] focus:border-black/[0.14] focus:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const labelClass = "text-[11px] font-semibold text-[#424245]";

const panelClass =
  "overflow-hidden rounded-xl border border-black/[0.06] bg-white shadow-[0_1px_2px_rgba(17,17,19,0.03)]";

const primaryBtnClass =
  "inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1D1D1F] px-3.5 text-xs font-semibold text-white transition hover:bg-[#2C2C2E] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1D1D1F]";

const removeBtnClass =
  "inline-flex h-8 items-center rounded-lg border border-[#F5C2C0] bg-white px-2.5 text-[11px] font-semibold text-[#B42318] transition hover:bg-[#FFF8F8] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#B42318]";

function memberInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(role: StaffRole) {
  return STAFF_ROLE_OPTIONS.find((option) => option.value === role)?.label ?? role;
}

export default function AdminTeamPage() {
  const apiOn = isApiEnabled();
  const { role: myRole } = useStaffRole();
  // At render. `PUT /admin/team/{id}` and the invite route are owner-only, and
  // an admin with no staff role written down is granted nothing — so every
  // signed-in member used to be shown a role dropdown that would be refused.
  const canManage = apiOn && can("team.write", myRole);

  const [seats, setSeats] = useState<Seat[]>([]);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [mobile, setMobile] = useState("");
  const [addRole, setAddRole] = useState<StaffRole>("support");
  const [addError, setAddError] = useState("");
  const [removeId, setRemoveId] = useState<string | null>(null);

  useEffect(() => {
    if (!apiOn) return;
    void api
      .adminTeam()
      .then((res) => {
        setSeats(
          (res.data ?? []).map((m: ApiTeamMember) => ({
            id: String(m.id),
            name: m.name,
            mobile: m.mobile,
            role: (m.staffRole as StaffRole) ?? "viewer",
          })),
        );
        setLoadError("");
      })
      .catch((err) => setLoadError(adminErrorMessage(err, "Couldn't load your people.")));
  }, [apiOn]);

  const removing = useMemo(
    () => seats.find((seat) => seat.id === removeId) ?? null,
    [removeId, seats],
  );

  function updateRole(row: Seat, next: StaffRole) {
    setNotice("");
    void api
      .updateTeamMember(Number(row.id), { staffRole: next })
      .then((m) => {
        setSeats((prev) =>
          prev.map((seat) =>
            seat.id === row.id ? { ...seat, role: (m.staffRole as StaffRole) ?? next } : seat,
          ),
        );
        setNotice(`${row.name} is now ${roleLabel(next).toLowerCase()}.`);
      })
      .catch((err) => setLoadError(adminErrorMessage(err, "That change didn't save.")));
  }

  const columns: DataTableColumn<Seat>[] = [
    {
      key: "name",
      header: "Person",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#1D1D1F] text-[10px] font-semibold text-white">
            {memberInitials(row.name)}
          </div>
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold tracking-[-0.02em]">{row.name}</div>
            <div className="truncate ez-mono text-[10px] text-[#86868B]">{row.mobile}</div>
          </div>
        </div>
      ),
    },
    {
      key: "role",
      header: "What they can do",
      render: (row) =>
        canManage && row.role !== "owner" ? (
          <AdminSelect
            label="What they can do"
            value={row.role}
            onChange={(value) => updateRole(row, value as StaffRole)}
            options={STAFF_ROLE_OPTIONS.filter((o) => o.value !== "owner").map((option) => ({
              value: option.value,
              label: option.label,
            }))}
          />
        ) : (
          <span className="text-xs font-medium text-[#424245]">{roleLabel(row.role)}</span>
        ),
    },
    {
      key: "actions",
      header: "",
      className: "text-right",
      render: (row) =>
        canManage && row.role !== "owner" ? (
          <button type="button" onClick={() => setRemoveId(row.id)} className={removeBtnClass}>
            Remove from admin
          </button>
        ) : (
          <span className="text-[11px] text-[#AEAEB2]">
            {row.role === "owner" ? "The owner stays" : "Nothing you can change"}
          </span>
        ),
    },
  ];

  return (
    <div>
      <AdminPageHeader
        title="People"
        description="Who can sign in to this admin, and what each of them can do."
        actions={
          canManage ? (
            <button type="button" onClick={() => setAddOpen(true)} className={primaryBtnClass}>
              <PlusIcon />
              Add someone
            </button>
          ) : null
        }
      />

      {!apiOn ? (
        <AdminNotice tone="demo">
          Practice shop. There is nobody real to show here — the four cards below are still the
          truth about what each job can do.
        </AdminNotice>
      ) : null}

      {!canManage && apiOn ? (
        <AdminNotice tone="info">
          Only the owner can add or remove people, or change what someone can do.
        </AdminNotice>
      ) : null}

      {loadError ? <AdminNotice tone="error">{loadError}</AdminNotice> : null}
      {notice ? <AdminNotice tone="info">{notice}</AdminNotice> : null}

      {apiOn ? (
        <section className={`${panelClass} mb-4`}>
          <DataTable
            columns={columns}
            rows={seats}
            rowKey={(row) => row.id}
            pageSize={25}
            density="compact"
            emptyMessage="Only you can sign in to this admin at the moment."
            emptyAction={
              canManage ? (
                <button type="button" onClick={() => setAddOpen(true)} className={primaryBtnClass}>
                  <PlusIcon />
                  Add someone
                </button>
              ) : undefined
            }
          />
        </section>
      ) : null}

      <section className="grid gap-3 sm:grid-cols-2">
        {STAFF_ROLE_OPTIONS.map((option) => (
          <RoleCard
            key={option.value}
            role={option.value}
            title={
              option.value === "owner" && myRole === "owner"
                ? "Owner (you)"
                : roleLabel(option.value)
            }
          />
        ))}
      </section>

      <AdminDrawer
        open={addOpen}
        title="Add someone to the admin"
        onClose={() => setAddOpen(false)}
      >
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const digits = mobile.replace(/\D/g, "").slice(-10);
            if (!/^[6-9]\d{9}$/.test(digits)) {
              setAddError("That doesn't look like a 10-digit mobile number.");
              return;
            }
            setAddError("");
            void api
              .inviteTeamMember({ mobile: digits, staffRole: addRole, name: digits })
              .then((m) => {
                setSeats((prev) => [
                  {
                    id: String(m.id),
                    name: m.name,
                    mobile: m.mobile,
                    role: (m.staffRole as StaffRole) ?? addRole,
                  },
                  ...prev.filter((s) => s.id !== String(m.id)),
                ]);
                setMobile("");
                setAddOpen(false);
                setNotice("Added. They can sign in with this number now.");
              })
              // Stays in the drawer, with what was typed still typed.
              .catch((err) => setAddError(adminErrorMessage(err, "That didn't save.")));
          }}
        >
          <p className="text-xs leading-relaxed text-[#6E6E73]">
            They sign in with their mobile number and a code — there is no password to send them.
          </p>
          <label className="block">
            <span className={labelClass}>Their mobile number</span>
            <input
              required
              type="tel"
              value={mobile}
              onChange={(e) => setMobile(e.target.value)}
              className={`mt-1.5 ${fieldClass}`}
              placeholder="9876543210"
            />
          </label>
          <label className="block">
            <span className={labelClass}>What they can do</span>
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
            <span className="mt-1.5 block text-[11px] leading-relaxed text-[#6E6E73]">
              {STAFF_ROLE_PURPOSE[addRole]}
            </span>
          </label>
          {addError ? (
            <p role="alert" className="text-[11px] font-medium text-[#B42318]">
              {addError}
            </p>
          ) : null}
          <button type="submit" className={`w-full ${primaryBtnClass} justify-center`}>
            Add them
          </button>
        </form>
      </AdminDrawer>

      <ConfirmDialog
        open={Boolean(removing)}
        title={`Remove ${removing?.name ?? ""} from admin?`}
        // Kept word for word: it already says what happens to the thing, what
        // happens outside the shop, and what is not affected.
        description="They lose admin access immediately and are signed out everywhere. Their customer account and past orders are kept."
        confirmLabel={`Remove ${removing?.name ?? ""}`}
        cancelLabel="Leave them as they are"
        danger
        onConfirm={() => {
          if (!removing) return;
          const id = removing.id;
          void api
            .updateTeamMember(Number(id), { role: "customer", staffRole: null })
            .then(() => {
              setSeats((prev) => prev.filter((seat) => seat.id !== id));
              setRemoveId(null);
              setNotice(`${removing.name} can no longer sign in to this admin.`);
            })
            .catch((err) => {
              setRemoveId(null);
              setLoadError(adminErrorMessage(err, "That didn't change."));
            });
        }}
        onCancel={() => setRemoveId(null)}
      />
    </div>
  );
}

function RoleCard({ role, title }: { role: StaffRole; title: string }) {
  const cans = roleCan(role);
  const cannots = roleCannot(role);

  return (
    <article className="rounded-2xl border border-black/[0.06] bg-white p-4 shadow-[0_1px_2px_rgba(17,17,19,0.03)]">
      <h2 className="text-sm font-semibold tracking-[-0.02em] text-[#1D1D1F]">{title}</h2>
      <p className="mt-1 text-xs leading-relaxed text-[#6E6E73]">{STAFF_ROLE_PURPOSE[role]}</p>
      <p className="mt-2.5 text-[11px] leading-relaxed text-[#2D6B3C]">
        <span className="font-semibold">Can</span> {cans.join(", ")}.
      </p>
      <p className="mt-1 text-[11px] leading-relaxed text-[#86868B]">
        {cannots.length ? (
          <>
            <span className="font-semibold">Can&rsquo;t</span> {cannots.join(", ")}.
          </>
        ) : (
          "Nothing is kept from you."
        )}
      </p>
    </article>
  );
}
