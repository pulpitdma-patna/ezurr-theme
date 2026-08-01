import { describe, it, expect } from "vitest";
import { formatReleaseLabel } from "@/hooks/useLiveThemeSettings";
import { fromApi } from "@/lib/productResolve";
import type { ApiProduct } from "@/lib/apiClient";

/**
 * A pre-order shows ITS OWN release date.
 *
 * The storefront printed the shop-wide setting on every pre-order page and at
 * checkout, so seven games with seven different release days all told the
 * customer the same one — and a deposit was taken against a date this shop had
 * never promised for that title. The per-product column existed the whole time
 * and simply never reached the storefront.
 */
describe("a pre-order carries its own release date", () => {
  const product = (over: Partial<ApiProduct> & Record<string, unknown> = {}) =>
    fromApi({
      key: "gta-6",
      title: "GTA VI",
      price: 4999,
      stock: 0,
      fulfillment_type: "preorder",
      ...over,
    } as unknown as ApiProduct);

  it("carries the date through from the API", () => {
    expect(product({ release_at: "2026-11-19T00:00:00.000000Z" }).releaseAt).toBe("2026-11-19");
  });

  it("leaves it undefined when the shop has not committed to one", () => {
    expect(product().releaseAt).toBeUndefined();
    expect(product({ release_at: null }).releaseAt).toBeUndefined();
  });

  /**
   * The heart of it: no date must NOT fall back to the shop's. He can chase the
   * shop for a date; he cannot un-believe a wrong one.
   */
  it("says nothing rather than borrowing another product's date", () => {
    expect(formatReleaseLabel(product().releaseAt)).toBeNull();
    expect(formatReleaseLabel(undefined)).toBeNull();
    expect(formatReleaseLabel(null)).toBeNull();
    expect(formatReleaseLabel("")).toBeNull();
  });

  it("formats a real date the way an Indian shopper reads it", () => {
    expect(formatReleaseLabel("2026-11-19")).toBe("19 Nov 2026");
  });

  /** Two pre-orders, two dates — the case that was impossible before. */
  it("gives two products two different dates", () => {
    const a = product({ key: "gta-6", release_at: "2026-11-19T00:00:00.000000Z" });
    const b = product({ key: "elden-ring-2", release_at: "2027-03-04T00:00:00.000000Z" });

    expect(formatReleaseLabel(a.releaseAt)).toBe("19 Nov 2026");
    expect(formatReleaseLabel(b.releaseAt)).toBe("4 Mar 2027");
  });
});
