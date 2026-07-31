/**
 * Mirror of the server's permission map (ezurr-api User::STAFF_PERMISSIONS).
 * The server is authoritative — this only decides which controls are shown, so
 * a manager is never offered a button that will 403.
 */

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
  /** Edit page content. */
  | "content.write"
  /** Inject custom HTML/JS into a page — a different risk, owner-only. */
  | "cms.code.write"
  /**
   * Add somebody to the admin or take them out. Owner-only on the server
   * (`PUT /admin/team/{id}` is gated on it) and missing from this mirror, so
   * the People screen was offering every signed-in member a role dropdown that
   * would 403 on press.
   */
  | "team.write";

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
    "content.write",
    "cms.code.write",
    "team.write",
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
    "content.write",
  ],
  support: ["orders.write", "customers.write", "reports.export"],
  viewer: ["reports.export"],
};

const STORAGE_KEY = "ezurr_admin_staff_role";

export function getStaffRole(): StaffRole {
  // Default deny: unset / unknown must not unlock owner controls in the UI.
  if (typeof window === "undefined") return "viewer";
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "manager" || raw === "support" || raw === "viewer" || raw === "owner") {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return "viewer";
}

export function asStaffRole(value: unknown): StaffRole | null {
  if (value === "owner" || value === "manager" || value === "support" || value === "viewer") {
    return value;
  }
  return null;
}

/** Clear the browser staff-role override (e.g. on sign-out). */
export function clearStaffRole() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new Event("ezurr-staff-role"));
  } catch {
    /* ignore */
  }
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

/**
 * Named for the job in the shop, not for the row in the permission table.
 * "Support" and "Viewer" are our words for people the owner calls the person on
 * the counter and his accountant.
 */
export const STAFF_ROLE_OPTIONS: { value: StaffRole; label: string }[] = [
  { value: "owner", label: "Owner" },
  { value: "manager", label: "Manager" },
  { value: "support", label: "Counter staff" },
  { value: "viewer", label: "Accountant" },
];

/**
 * What each role is for, in one line. The only hand-written part of the People
 * screen's role cards — everything a role can and cannot do is generated from
 * the map above, so the cards cannot drift away from what is enforced.
 */
export const STAFF_ROLE_PURPOSE: Record<StaffRole, string> = {
  owner: "You. Nothing in here is hidden from you.",
  manager: "Someone you trust to run the shop when you are not there.",
  support: "Whoever is on the counter or answering the phone.",
  viewer: "Your accountant, or anyone who only needs the numbers.",
};

/**
 * The capabilities worth naming to a shop owner, in the order he would ask
 * about them. Deliberately not every permission: `automations.write` and
 * `content.write` matter, `cms.code.write` is a sentence nobody would use.
 */
export const PERMISSION_PHRASES: { permission: Permission; phrase: string }[] = [
  { permission: "orders.write", phrase: "accept, pack and send orders" },
  { permission: "orders.refund", phrase: "send money back to a customer" },
  { permission: "products.write", phrase: "add and edit products" },
  { permission: "inventory.write", phrase: "change how much stock you have" },
  { permission: "coupons.write", phrase: "make discount codes" },
  { permission: "customers.write", phrase: "edit customer details" },
  { permission: "reports.export", phrase: "see the money screen" },
  { permission: "content.write", phrase: "edit your website" },
  { permission: "settings.write", phrase: "change shop settings and other companies" },
  { permission: "team.write", phrase: "add and remove people" },
];

/** Generated from ROLE_PERMISSIONS, so a card can never claim more than is enforced. */
export function roleCan(role: StaffRole): string[] {
  return PERMISSION_PHRASES.filter((p) => can(p.permission, role)).map((p) => p.phrase);
}

export function roleCannot(role: StaffRole): string[] {
  return PERMISSION_PHRASES.filter((p) => !can(p.permission, role)).map((p) => p.phrase);
}
