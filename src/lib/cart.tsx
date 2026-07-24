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
}

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotal: number;
  hydrated: boolean;
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  setQty: (productKey: string, qty: number) => void;
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
    typeof i.price === "number" &&
    typeof i.qty === "number" &&
    i.qty > 0
  );
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
        if (Array.isArray(parsed)) setItems(parsed.filter(isValidItem));
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
        next[idx] = { ...next[idx], qty: next[idx].qty + qty };
        return next;
      }
      return [...prev, { ...item, qty: Math.max(1, qty) }];
    });
  }, []);

  const setQty = useCallback((productKey: string, qty: number) => {
    setItems((prev) =>
      qty <= 0
        ? prev.filter((x) => x.productKey !== productKey)
        : prev.map((x) => (x.productKey === productKey ? { ...x, qty } : x)),
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
    const count = items.reduce((n, x) => n + x.qty, 0);
    const subtotal = items.reduce((n, x) => n + x.price * x.qty, 0);
    return {
      items,
      count,
      subtotal,
      hydrated,
      addItem,
      setQty,
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
