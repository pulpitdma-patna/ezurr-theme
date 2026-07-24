import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { CartProvider, useCart } from "@/lib/cart";
import type { ReactNode } from "react";

const wrapper = ({ children }: { children: ReactNode }) => <CartProvider>{children}</CartProvider>;

describe("useCart", () => {
  beforeEach(() => window.localStorage.clear());

  it("adds items and merges quantities by productKey", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem({ productKey: "p1", title: "P1", price: 100 }));
    act(() => result.current.addItem({ productKey: "p1", title: "P1", price: 100 }, 2));

    expect(result.current.items).toHaveLength(1);
    expect(result.current.count).toBe(3);
    expect(result.current.subtotal).toBe(300);
    expect(result.current.has("p1")).toBe(true);
  });

  it("setQty to 0 removes the line", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => result.current.addItem({ productKey: "p1", title: "P1", price: 100 }));
    act(() => result.current.setQty("p1", 0));

    expect(result.current.items).toHaveLength(0);
    expect(result.current.has("p1")).toBe(false);
  });

  it("removeItem and clear empty the cart", () => {
    const { result } = renderHook(() => useCart(), { wrapper });

    act(() => {
      result.current.addItem({ productKey: "a", title: "A", price: 10 });
      result.current.addItem({ productKey: "b", title: "B", price: 20 });
    });
    expect(result.current.count).toBe(2);

    act(() => result.current.removeItem("a"));
    expect(result.current.items).toHaveLength(1);

    act(() => result.current.clear());
    expect(result.current.count).toBe(0);
    expect(result.current.subtotal).toBe(0);
  });
});
