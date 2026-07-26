"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export interface CartItem {
  productKey: string;
  title: string;
  /** Rupees. Display only — the server re-prices authoritatively at checkout. */
  price: number;
  image?: string;
  fulfillmentType?: string;
  qty: number;
  /**
   * Units the server last said were on hand, when that is known (the drawer
   * refreshes it). Absent means "unknown" — the line then only gets the
   * per-line ceiling.
   */
  stock?: number;
}

/**
 * Per-line ceiling for a browser cart.
 *
 * The server is the authority on quantity and stock, and it rejects absurd
 * values at order time. This exists so a hand-edited localStorage cart cannot
 * render a nine-figure subtotal or a header badge wide enough to break the
 * layout before the buyer ever reaches checkout.
 */
export const MAX_LINE_QTY = 20;

/** Whole units, at least one, never past the ceiling or known stock. */
export function clampQty(qty: number, stock?: number): number {
  if (!Number.isFinite(qty)) return 1;
  // stock <= 0 is treated as unknown: the line is unbuyable either way, and
  // silently rewriting it to 0 would just delete the buyer's cart line.
  const ceiling =
    typeof stock === "number" && Number.isFinite(stock) && stock > 0
      ? Math.min(MAX_LINE_QTY, Math.floor(stock))
      : MAX_LINE_QTY;
  return Math.min(Math.max(1, Math.floor(qty)), ceiling);
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productKey: string, qty: number) => void;
  /** Record live availability for a line and re-clamp its quantity to it. */
  setStock: (productKey: string, stock: number) => void;
  removeItem: (productKey: string) => void;
  clear: () => void;
  has: (productKey: string) => boolean;
  // Slide-out drawer / bottom-sheet UI state.
  drawerOpen: boolean;
  openDrawer: () => void;
  closeDrawer: () => void;
  // Coupon code carried from the cart into checkout (validated server-side).
  couponCode: string | null;
  setCouponCode: (code: string | null) => void;
}

const STORAGE_KEY = "ezurr-cart-v1";
const COUPON_KEY = "ezurr-cart-coupon-v1";
const CartContext = createContext<CartContextValue | null>(null);

function isValidItem(x: unknown): x is CartItem {
  if (!x || typeof x !== "object") return false;
  const i = x as Record<string, unknown>;
  return (
    typeof i.productKey === "string" &&
    typeof i.title === "string" &&
    // A negative or non-finite price is tampering, not a discount: drop the
    // line rather than let it drag the subtotal below zero.
    typeof i.price === "number" &&
    Number.isFinite(i.price) &&
    i.price >= 0 &&
    typeof i.qty === "number" &&
    i.qty > 0
  );
}

/** Storage is user-writable, so re-clamp everything it hands back. */
function sanitizeItem(item: CartItem): CartItem {
  return { ...item, qty: clampQty(item.qty, item.stock) };
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [couponCode, setCouponCodeState] = useState<string | null>(null);

  // Hydrate once from localStorage (client-only; avoids SSR mismatch).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (Array.isArray(parsed)) setItems(parsed.filter(isValidItem).map(sanitizeItem));
      }
      const c = window.localStorage.getItem(COUPON_KEY);
      if (c) setCouponCodeState(c);
    } catch {
      /* ignore corrupt storage */
    }
    setHydrated(true);
  }, []);

  // Persist after hydration so we never clobber storage with the empty initial.
  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [items, hydrated]);

  const addItem = useCallback((item: Omit<CartItem, "qty">, qty = 1) => {
    setItems((prev) => {
      const idx = prev.findIndex((x) => x.productKey === item.productKey);
      if (idx >= 0) {
        const next = [...prev];
        // Prefer the freshest stock reading the caller has.
        const stock = item.stock ?? next[idx].stock;
        next[idx] = { ...next[idx], stock, qty: clampQty(next[idx].qty + qty, stock) };
        return next;
      }
      return [...prev, { ...item, qty: clampQty(qty, item.stock) }];
    });
  }, []);

  const setQty = useCallback((productKey: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((x) => x.productKey !== productKey)
        : prev.map((x) =>
            x.productKey === productKey ? { ...x, qty: clampQty(qty, x.stock) } : x,
          ),
    );
  }, []);

  const setStock = useCallback((productKey: string, stock: number) => {
    setItems((prev) =>
      prev.map((x) =>
        x.productKey === productKey ? { ...x, stock, qty: clampQty(x.qty, stock) } : x,
      ),
    );
  }, []);

  const removeItem = useCallback((productKey: string) => {
    setItems((prev) => prev.filter((x) => x.productKey !== productKey));
  }, []);

  const setCouponCode = useCallback((code: string | null) => {
    setCouponCodeState(code);
    try {
      if (code) window.localStorage.setItem(COUPON_KEY, code);
      else window.localStorage.removeItem(COUPON_KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setCouponCode(null);
  }, [setCouponCode]);
  const openDrawer = useCallback(() => setDrawerOpen(true), []);
  const closeDrawer = useCallback(() => setDrawerOpen(false), []);

  const value = useMemo<CartContextValue>(() => {
    const count = items.reduce((n, x) => n + clampQty(x.qty, x.stock), 0);
    // Belt and braces: a line that somehow arrives with a negative price must
    // not render a negative subtotal.
    const subtotal = Math.max(
      0,
      items.reduce((n, x) => n + Math.max(0, x.price) * clampQty(x.qty, x.stock), 0),
    );
    return {
      items,
      count,
      subtotal,
      hydrated,
      addItem,
      setQty,
      setStock,
      removeItem,
      clear,
      has: (k: string) => items.some((x) => x.productKey === k),
      drawerOpen,
      openDrawer,
      closeDrawer,
      couponCode,
      setCouponCode,
    };
  }, [
    items,
    hydrated,
    addItem,
    setQty,
    setStock,
    removeItem,
    clear,
    drawerOpen,
    openDrawer,
    closeDrawer,
    couponCode,
    setCouponCode,
  ]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within a CartProvider");
  return ctx;
}
