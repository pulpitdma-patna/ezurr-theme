/** UI-level staff roles for Phase 1 (mock). Server authZ is Phase 2. */

export type StaffRole = "owner" | "manager" | "support" | "viewer";

export type Permission =
  | "orders.write"
  | "orders.refund"
  | "products.write"
  | "customers.write"
  | "coupons.write"
  | "inventory.write"
  | "settings.write"
  | "automations.write"
  | "import.write"
  | "reports.export"
  | "cms.code.write";

const ROLE_PERMISSIONS: Record<StaffRole, Permission[]> = {
  owner: [
    "orders.write",
    "orders.refund",
    "products.write",
    "customers.write",
    "coupons.write",
    "inventory.write",
    "settings.write",
    "automations.write",
    "import.write",
    "reports.export",
    "cms.code.write",
  ],
  manager: [
    "orders.write",
    "orders.refund",
    "products.write",
    "customers.write",
    "coupons.write",
    "inventory.write",
    "automations.write",
    "import.write",
    "reports.export",
  ],
  support: ["orders.write", "customers.write", "reports.export"],
  viewer: ["reports.export"],
};

const STORAGE_KEY = "ezurr_admin_staff_role";

export function getStaffRole(): StaffRole {
  if (typeof window === "undefined") return "owner";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "manager" || raw === "support" || raw === "viewer" || raw === "owner") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "owner";
}

export function setStaffRole(role: StaffRole) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, role);
    window.dispatchEvent(new Event("ezurr-staff-role"));
  } catch {
    /* ignore */
  }
}

export function can(permission: Permission, role: StaffRole = getStaffRole()) {
  return ROLE_PERMISSIONS[role].includes(permission);
}

export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "support", label: "Support" },
  { value: "viewer", label: "Viewer" },
];
