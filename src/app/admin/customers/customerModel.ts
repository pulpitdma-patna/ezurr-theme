import { formatInr, type AdminCustomer, type AdminCustomerStatus } from "@/data/admin";
import type { ApiCustomer } from "@/lib/apiClient";

/**
 * The `vip` tag, not a status column.
 *
 * The API stores three CRM fields — tags, banned, notes. "Status" is a view
 * over them, so "Mark VIP" writes a tag that survives a reload instead of a
 * label the server has never heard of.
 */
export const VIP_TAG = "vip";

export function statusOfCustomer(c: ApiCustomer): AdminCustomerStatus {
  // A ban is an explicit operator decision, so it outranks every heuristic.
  if (c.banned) return "banned";
  if ((c.tags ?? []).includes(VIP_TAG) || c.lifetime_value >= 50000) return "vip";
  return c.orders_count > 0 ? "active" : "new";
}

export function mapApiCustomer(c: ApiCustomer): AdminCustomer {
  return {
    id: String(c.id),
    name: c.name,
    mobile: c.mobile ?? "",
    orders: c.orders_count,
    spent: formatInr(c.lifetime_value),
    lastOrderAt: c.last_order_at ?? "",
    // Derived server-side from the default address or the latest order. An em
    // dash in the City column told him nothing; the sentence says which it is.
    city: c.city ?? "No address yet",
    status: statusOfCustomer(c),
    notes: c.notes ?? undefined,
    banned: c.banned,
    tags: c.tags,
  };
}
